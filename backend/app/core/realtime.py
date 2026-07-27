"""Tempo real (SSE + Redis pub/sub) — mover card entre listas.

Publish é SYNC (thread-safe, chamável de qualquer contexto); subscribe é async
(um consumer por processo). Ver spec em docs/superpowers/specs/.
"""
import asyncio
import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

REALTIME_CHANNEL = "hsgrowth:realtime"

# channel_key ("sales:5" | "service:5") -> filas dos clientes SSE deste processo
_subscribers: dict[str, set[asyncio.Queue]] = {}


def channel_key(scope: str, board_id: int) -> str:
    return f"{scope}:{board_id}"


def build_move_event(scope: str, board_id: int, card_id: int, list_id: int, position: float) -> dict:
    return {
        "type": "card_moved",
        "scope": scope,
        "board_id": board_id,
        "card_id": card_id,
        "list_id": list_id,
        "position": position,
    }


def subscribe(key: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _subscribers.setdefault(key, set()).add(q)
    return q


def unsubscribe(key: str, q: asyncio.Queue) -> None:
    subs = _subscribers.get(key)
    if subs:
        subs.discard(q)
        if not subs:
            _subscribers.pop(key, None)


def _fanout(key: str, event: dict) -> None:
    # list(...) porque unsubscribe pode mexer no set durante a iteração
    for q in list(_subscribers.get(key, ())):
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:  # pragma: no cover
            pass


def dispatch(raw: str) -> None:
    """Recebe o payload JSON (do Redis) e faz fan-out para os assinantes locais."""
    try:
        event = json.loads(raw)
    except (ValueError, TypeError):
        logger.warning("realtime: payload invalido ignorado")
        return
    scope = event.get("scope")
    board_id = event.get("board_id")
    if scope is None or board_id is None:
        return
    _fanout(channel_key(scope, board_id), event)


from datetime import datetime, timedelta, timezone
import jwt

# Cliente redis-py SYNC dedicado ao publish (lazy singleton). Thread-safe.
_sync_redis = None


def _get_sync_redis():
    global _sync_redis
    if _sync_redis is None:
        import redis as sync_redis
        _sync_redis = sync_redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_SESSION_DB,
            password=settings.REDIS_PASSWORD or None,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _sync_redis


def publish_card_moved(scope: str, board_id: int, card_id: int, list_id: int, position: float) -> None:
    """Publica o evento de mover no Redis. Nunca levanta — se o Redis cair, o REST
    segue normal e o tempo real fica indisponivel ate voltar."""
    event = build_move_event(scope, board_id, card_id, list_id, float(position or 0))
    try:
        _get_sync_redis().publish(REALTIME_CHANNEL, json.dumps(event))
    except Exception:
        logger.warning("realtime: publish falhou (%s/%s) — seguindo sem tempo real", scope, board_id)


# --- Ticket JWT efemero do stream (EventSource nao manda header) ---
def create_stream_ticket(subject: str, scope: str, board_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(seconds=60)
    payload = {
        "sub": subject,
        "board_scope": scope,
        "board_id": board_id,
        "scope_type": "stream",
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_stream_ticket(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except Exception:
        return None
    if payload.get("scope_type") != "stream":
        return None  # nao aceita token de sessao normal
    return payload


_consumer_task: "asyncio.Task | None" = None


async def _consume_loop() -> None:
    """SUBSCRIBE no Redis e fan-out. Nunca morre por um evento ruim."""
    import redis.asyncio as aioredis
    client = aioredis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_SESSION_DB,
        password=settings.REDIS_PASSWORD or None,
        decode_responses=True,
    )
    pubsub = client.pubsub()
    await pubsub.subscribe(REALTIME_CHANNEL)
    logger.info("realtime: consumer assinou %s", REALTIME_CHANNEL)
    try:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            try:
                dispatch(message["data"])
            except Exception:
                logger.exception("realtime: falha ao entregar evento")
    except asyncio.CancelledError:
        raise
    finally:
        await pubsub.close()
        await client.close()


def start_realtime_consumer() -> None:
    global _consumer_task
    if _consumer_task is None or _consumer_task.done():
        _consumer_task = asyncio.create_task(_consume_loop())


async def stop_realtime_consumer() -> None:
    global _consumer_task
    if _consumer_task is not None:
        _consumer_task.cancel()
        try:
            await _consumer_task
        except asyncio.CancelledError:
            pass
        _consumer_task = None
