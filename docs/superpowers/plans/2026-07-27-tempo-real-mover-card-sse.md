# Tempo real de mover card (SSE + Redis) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover um card entre listas (ou reordenar) reflete em tempo real para todos os usuários com a mesma board aberta, nos boards de Vendas e Serviço, sem F5 e sem polling.

**Architecture:** REST normal → após o commit, o endpoint publica um evento leve no Redis (PUBLISH sync, thread-safe). Um consumer async por processo faz SUBSCRIBE e fan-out para as conexões SSE locais daquela board. O cliente abre um `EventSource` (autenticado por ticket JWT efêmero), aplica o movimento no estado local e re-sincroniza a board a cada (re)conexão.

**Tech Stack:** FastAPI (sync SQLAlchemy), Redis (`redis` sync p/ publish + `redis.asyncio` p/ subscribe), SSE via `StreamingResponse`, React + TS (`EventSource`).

**Spec:** `docs/superpowers/specs/2026-07-27-tempo-real-mover-card-sse-design.md`

**Convenções do repo:**
- Testes backend: `docker exec -w /app hsgrowth-api-local python -m pytest <caminho> -v` (via Git Bash: prefixe `export MSYS_NO_PATHCONV=1` e `export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"`). O diretório `app/` é montado no container (código live); `tests/` **não** é — copie com `docker cp <arquivo> hsgrowth-api-local:/app/tests/...` antes de rodar um teste novo.
- Typecheck frontend: `cd frontend && npx tsc --noEmit` (deve sair 0).
- Commits terminam com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Nunca commitar `.claude/settings.local.json`. **Perguntar ao usuário antes de cada commit** (regra do projeto).
- Redis config em `settings`: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_SESSION_DB` (`app/core/config.py`).

---

## Estrutura de arquivos

**Backend (novo):**
- `backend/app/core/realtime.py` — hub em memória por processo (subscribe/unsubscribe/fanout), builder do evento, publish sync no Redis, consumer async, e ticket JWT do stream.

**Backend (editar):**
- `backend/app/main.py` — subir/parar o consumer no `lifespan`.
- `backend/app/api/v1/endpoints/cards.py` — endpoints `stream-ticket`/`stream` de Vendas + publish no `move_card`.
- `backend/app/api/v1/endpoints/service_boards.py` — endpoints `stream-ticket`/`stream` de Serviço + publish no `move_service_card`.

**Backend (testes):**
- `backend/tests/unit/test_realtime.py`

**Frontend (novo):**
- `frontend/src/hooks/useBoardStream.ts` — abre o EventSource com ticket + reconexão.
- `frontend/src/services/streamService.ts` — pede o ticket.

**Frontend (editar):**
- `frontend/src/pages/KanbanBoard.tsx` — aplicar move + resync (Vendas).
- `frontend/src/pages/ServiceKanban.tsx` — aplicar move + resync (Serviço).

---

## Task 1: Hub em memória + builder do evento

**Files:**
- Create: `backend/app/core/realtime.py`
- Test: `backend/tests/unit/test_realtime.py`

- [ ] **Step 1: Escrever os testes que falham**

```python
# backend/tests/unit/test_realtime.py
import asyncio
import pytest
from app.core import realtime


def test_channel_key_namespaces_scope():
    assert realtime.channel_key("sales", 5) == "sales:5"
    assert realtime.channel_key("service", 5) == "service:5"
    assert realtime.channel_key("sales", 5) != realtime.channel_key("service", 5)


def test_build_move_event_shape():
    ev = realtime.build_move_event("sales", 3, 42, 7, 1024.0)
    assert ev == {
        "type": "card_moved",
        "scope": "sales",
        "board_id": 3,
        "card_id": 42,
        "list_id": 7,
        "position": 1024.0,
    }


@pytest.mark.asyncio
async def test_subscribe_fanout_unsubscribe():
    key = realtime.channel_key("sales", 99)
    q = realtime.subscribe(key)
    realtime._fanout(key, {"hello": "world"})
    assert await asyncio.wait_for(q.get(), timeout=1) == {"hello": "world"}
    realtime.unsubscribe(key, q)
    # sem assinantes, o board não vaza no dict interno
    assert key not in realtime._subscribers


@pytest.mark.asyncio
async def test_dispatch_parses_and_fans_out():
    key = realtime.channel_key("service", 2)
    q = realtime.subscribe(key)
    import json
    raw = json.dumps(realtime.build_move_event("service", 2, 10, 4, 500.0))
    realtime.dispatch(raw)
    ev = await asyncio.wait_for(q.get(), timeout=1)
    assert ev["card_id"] == 10 and ev["list_id"] == 4
    realtime.unsubscribe(key, q)
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker cp backend/tests/unit/test_realtime.py hsgrowth-api-local:/app/tests/unit/test_realtime.py
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_realtime.py -v
```
Esperado: FAIL (`ModuleNotFoundError: app.core.realtime`).

- [ ] **Step 3: Implementar o hub + builder + dispatch**

```python
# backend/app/core/realtime.py
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
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker cp backend/tests/unit/test_realtime.py hsgrowth-api-local:/app/tests/unit/test_realtime.py
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_realtime.py -v
```
Esperado: 4 passed.

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add backend/app/core/realtime.py backend/tests/unit/test_realtime.py
git commit -m "feat(realtime): hub em memoria + builder/dispatch de evento de mover card"
```

---

## Task 2: Publish sync no Redis + ticket JWT do stream

**Files:**
- Modify: `backend/app/core/realtime.py`
- Test: `backend/tests/unit/test_realtime.py`

- [ ] **Step 1: Acrescentar testes do ticket**

```python
# append em backend/tests/unit/test_realtime.py
def test_stream_ticket_roundtrip():
    tk = realtime.create_stream_ticket("user@x.com", "sales", 7)
    payload = realtime.decode_stream_ticket(tk)
    assert payload is not None
    assert payload["sub"] == "user@x.com"
    assert payload["board_scope"] == "sales"
    assert payload["board_id"] == 7


def test_stream_ticket_rejects_session_token():
    from app.core.security import create_access_token
    normal = create_access_token({"sub": "user@x.com"})
    assert realtime.decode_stream_ticket(normal) is None


def test_stream_ticket_rejects_garbage():
    assert realtime.decode_stream_ticket("not-a-jwt") is None
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker cp backend/tests/unit/test_realtime.py hsgrowth-api-local:/app/tests/unit/test_realtime.py
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_realtime.py -k ticket -v
```
Esperado: FAIL (`AttributeError: create_stream_ticket`).

- [ ] **Step 3: Implementar ticket + publish sync (append em `realtime.py`)**

```python
# --- append em backend/app/core/realtime.py ---
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
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker cp backend/tests/unit/test_realtime.py hsgrowth-api-local:/app/tests/unit/test_realtime.py
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_realtime.py -v
```
Esperado: 7 passed.

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add backend/app/core/realtime.py backend/tests/unit/test_realtime.py
git commit -m "feat(realtime): publish sync no Redis + ticket JWT efemero do stream"
```

---

## Task 3: Consumer async + wire no lifespan

**Files:**
- Modify: `backend/app/core/realtime.py` (consumer)
- Modify: `backend/app/main.py` (subir/parar no lifespan)

- [ ] **Step 1: Implementar o consumer (append em `realtime.py`)**

```python
# --- append em backend/app/core/realtime.py ---
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
```

- [ ] **Step 2: Wire no lifespan de `main.py`**

Em `backend/app/main.py`, importar e chamar junto do scheduler. Adicionar o import no topo (perto de `from app.workers.scheduler import ...`):

```python
from app.core import realtime
```

No startup, logo após o bloco do `start_scheduler()`:

```python
    if settings.ENVIRONMENT != "testing":
        realtime.start_realtime_consumer()
        logger.success("Realtime consumer iniciado")
```

No shutdown, logo após o `stop_scheduler()`:

```python
    if settings.ENVIRONMENT != "testing":
        await realtime.stop_realtime_consumer()
        logger.success("Realtime consumer finalizado")
```

- [ ] **Step 3: Verificar import limpo**

```bash
docker exec -w /app hsgrowth-api-local python -c "import app.core.realtime, app.main; print('IMPORT OK')"
```
Esperado: `IMPORT OK`.

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git add backend/app/core/realtime.py backend/app/main.py
git commit -m "feat(realtime): consumer async (SUBSCRIBE) + wire no lifespan"
```

---

## Task 4: Endpoints SSE de Vendas (ticket + stream)

**Files:**
- Modify: `backend/app/api/v1/endpoints/cards.py`

- [ ] **Step 1: Adicionar imports no topo de `cards.py`**

```python
import asyncio
import json
from fastapi.responses import StreamingResponse
from app.core import realtime
```

- [ ] **Step 2: Adicionar os endpoints (no fim do arquivo, no mesmo `router`)**

```python
@router.post("/boards/{board_id}/stream-ticket", summary="Ticket efemero p/ o stream do board (Vendas)")
async def sales_stream_ticket(
    board_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board nao encontrado")
    return {"ticket": realtime.create_stream_ticket(current_user.email, "sales", board_id)}


@router.get("/boards/{board_id}/stream", summary="Stream SSE de movimentos de card (Vendas)")
async def sales_board_stream(
    board_id: int = Path(...),
    ticket: str = Query(...),
    db: Session = Depends(get_db),
):
    payload = realtime.decode_stream_ticket(ticket)
    if not payload or payload.get("board_scope") != "sales" or payload.get("board_id") != board_id:
        raise HTTPException(status_code=401, detail="Ticket invalido")
    # Handshake curto: confere que o board existe e fecha a sessao (o gerador vive horas)
    if not db.query(Board.id).filter(Board.id == board_id).first():
        raise HTTPException(status_code=404, detail="Board nao encontrado")

    key = realtime.channel_key("sales", board_id)

    async def gen():
        q = realtime.subscribe(key)
        try:
            yield ": connected\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=20)
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            realtime.unsubscribe(key, q)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

> `Board`, `get_current_active_user`, `HTTPException`, `Path`, `Query`, `Depends`, `Session`, `get_db`, `User` já são importados em `cards.py` (confirmar; `Query` pode faltar — adicionar `Query` ao import de `fastapi`).

- [ ] **Step 3: Verificar import + boot**

```bash
docker exec -w /app hsgrowth-api-local python -c "import app.api.v1.endpoints.cards; print('IMPORT OK')"
```
Esperado: `IMPORT OK`.

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git add backend/app/api/v1/endpoints/cards.py
git commit -m "feat(realtime): endpoints SSE (ticket + stream) do board de Vendas"
```

---

## Task 5: Endpoints SSE de Serviço (ticket + stream)

**Files:**
- Modify: `backend/app/api/v1/endpoints/service_boards.py`

- [ ] **Step 1: Adicionar imports no topo de `service_boards.py`**

```python
import asyncio
import json
from fastapi import Query
from fastapi.responses import StreamingResponse
from app.core import realtime
from app.models.service_board import ServiceBoard
```

- [ ] **Step 2: Adicionar os endpoints (no fim do arquivo, mesmo `router`)**

```python
@router.post("/{board_id}/stream-ticket")
async def service_stream_ticket(
    board_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not db.query(ServiceBoard.id).filter(ServiceBoard.id == board_id).first():
        raise HTTPException(status_code=404, detail="Board de servico nao encontrado")
    return {"ticket": realtime.create_stream_ticket(current_user.email, "service", board_id)}


@router.get("/{board_id}/stream")
async def service_board_stream(
    board_id: int = Path(...),
    ticket: str = Query(...),
    db: Session = Depends(get_db),
):
    payload = realtime.decode_stream_ticket(ticket)
    if not payload or payload.get("board_scope") != "service" or payload.get("board_id") != board_id:
        raise HTTPException(status_code=401, detail="Ticket invalido")
    if not db.query(ServiceBoard.id).filter(ServiceBoard.id == board_id).first():
        raise HTTPException(status_code=404, detail="Board de servico nao encontrado")

    key = realtime.channel_key("service", board_id)

    async def gen():
        q = realtime.subscribe(key)
        try:
            yield ": connected\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=20)
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            realtime.unsubscribe(key, q)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

> **Atenção à ordem das rotas:** este router usa prefixo `/{board_id}/...`. A rota
> `GET /{board_id}/stream` não conflita com as existentes (nenhuma casa com o path
> literal `stream`). Se o FastAPI reclamar de conflito, registrar estes dois
> endpoints logo após o `get_service_board`.

- [ ] **Step 3: Verificar import**

```bash
docker exec -w /app hsgrowth-api-local python -c "import app.api.v1.endpoints.service_boards; print('IMPORT OK')"
```
Esperado: `IMPORT OK`.

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git add backend/app/api/v1/endpoints/service_boards.py
git commit -m "feat(realtime): endpoints SSE (ticket + stream) do board de Servico"
```

---

## Task 6: Publish no move (Vendas + Serviço)

**Files:**
- Modify: `backend/app/api/v1/endpoints/cards.py` (`move_card`)
- Modify: `backend/app/api/v1/endpoints/service_boards.py` (`move_service_card`)

- [ ] **Step 1: Publish no `move_card` de Vendas**

Em `cards.py`, dentro de `move_card`, **após** o serviço mover e o `db` commitar
(logo antes do `return`), com `moved_card` = card já atualizado e `target_list`
(lista de destino, já carregada no endpoint para o log):

```python
    # Tempo real: avisa quem esta com o board aberto (apos o commit)
    if target_list is not None:
        realtime.publish_card_moved(
            "sales", target_list.board_id, moved_card.id, moved_card.list_id, float(moved_card.position or 0)
        )
```

> Ajustar os nomes reais das variáveis: o card movido retornado pelo serviço e a
> lista de destino já existem no corpo do endpoint (a lista é buscada para montar
> o log `list_name`). Usar o `board_id` dessa lista.

- [ ] **Step 2: Publish no `move_service_card` de Serviço**

Em `service_boards.py`, dentro de `move_service_card`, após `card = svc.move_card(...)`
(que commita), antes do `return`:

```python
    realtime.publish_card_moved(
        "service", board_id, card.id, card.list_id, float(card.position or 0)
    )
```

(`board_id` já vem no path deste endpoint.)

- [ ] **Step 3: Verificar import + smoke manual do publish**

```bash
docker exec -w /app hsgrowth-api-local python -c "import app.api.v1.endpoints.cards, app.api.v1.endpoints.service_boards; print('IMPORT OK')"
```
Esperado: `IMPORT OK`. (Teste funcional real é o smoke de 2 navegadores na Task 10.)

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git add backend/app/api/v1/endpoints/cards.py backend/app/api/v1/endpoints/service_boards.py
git commit -m "feat(realtime): publica evento de mover card apos commit (Vendas + Servico)"
```

---

## Task 7: Frontend — serviço de ticket + hook `useBoardStream`

**Files:**
- Create: `frontend/src/services/streamService.ts`
- Create: `frontend/src/hooks/useBoardStream.ts`

- [ ] **Step 1: `streamService.ts`**

```typescript
// frontend/src/services/streamService.ts
import api from "./api";

export type StreamScope = "sales" | "service";

const path = (scope: StreamScope, boardId: number) =>
  scope === "sales"
    ? `/api/v1/boards/${boardId}/stream-ticket`
    : `/api/v1/service-boards/${boardId}/stream-ticket`;

export async function getStreamTicket(scope: StreamScope, boardId: number): Promise<string> {
  const res = await api.post(path(scope, boardId), {});
  return res.data.ticket as string;
}

export function streamUrl(scope: StreamScope, boardId: number, ticket: string): string {
  const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const seg = scope === "sales" ? "boards" : "service-boards";
  return `${base}/api/v1/${seg}/${boardId}/stream?ticket=${encodeURIComponent(ticket)}`;
}
```

- [ ] **Step 2: `useBoardStream.ts`**

```typescript
// frontend/src/hooks/useBoardStream.ts
import { useEffect } from "react";
import { getStreamTicket, streamUrl, StreamScope } from "../services/streamService";

/** Abre um EventSource para o board e chama onEvent a cada mensagem.
 *  Reconexao manual com ticket NOVO a cada tentativa (o auto-reconnect nativo
 *  reusaria o ticket vencido de 60s -> 401). onOpen dispara o resync. */
export function useBoardStream(
  scope: StreamScope,
  boardId: number | undefined,
  onEvent: (evt: any) => void,
  onOpen: () => void,
) {
  useEffect(() => {
    if (!boardId) return;
    let es: EventSource | null = null;
    let stopped = false;
    let backoff = 1000;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function connect() {
      if (stopped) return;
      try {
        const ticket = await getStreamTicket(scope, boardId!);
        if (stopped) return;
        es = new EventSource(streamUrl(scope, boardId!, ticket));
        es.onopen = () => { backoff = 1000; onOpen(); };
        es.onmessage = (m) => { try { onEvent(JSON.parse(m.data)); } catch { /* ignora */ } };
        es.onerror = () => {
          es?.close();
          es = null;
          if (!stopped) {
            timer = setTimeout(connect, backoff);
            backoff = Math.min(backoff * 2, 10000);
          }
        };
      } catch {
        if (!stopped) {
          timer = setTimeout(connect, backoff);
          backoff = Math.min(backoff * 2, 10000);
        }
      }
    }
    connect();
    return () => {
      stopped = true;
      es?.close();
      if (timer) clearTimeout(timer);
    };
  }, [scope, boardId]); // eslint-disable-line react-hooks/exhaustive-deps
}
```

- [ ] **Step 3: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```
Esperado: sai 0.

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git add frontend/src/services/streamService.ts frontend/src/hooks/useBoardStream.ts
git commit -m "feat(realtime): frontend streamService + hook useBoardStream"
```

---

## Task 8: Frontend — ligar no board de Vendas

**Files:**
- Modify: `frontend/src/pages/KanbanBoard.tsx`

- [ ] **Step 1: Importar o hook**

No topo de `KanbanBoard.tsx`:

```typescript
import { useBoardStream } from "../hooks/useBoardStream";
```

- [ ] **Step 2: Ligar o stream + aplicar o move**

Dentro do componente, após os estados e a função `loadCardsOnly` já existentes,
adicionar (usar o `board?.id` real e o setter `setCards`):

```typescript
  // Tempo real: aplica o movimento de card vindo de outros usuarios
  useBoardStream(
    "sales",
    board?.id,
    (evt) => {
      if (evt?.type !== "card_moved") return;
      setCards((prev) =>
        prev.map((c) =>
          c.id === evt.card_id ? { ...c, list_id: evt.list_id, position: evt.position } : c
        )
      );
    },
    () => { loadCardsOnly(); }, // resync no (re)connect
  );
```

> Se `setCards` ou `loadCardsOnly` tiverem nomes/assinaturas diferentes, ajustar.
> O importante: no evento, atualizar `list_id`+`position` do card no estado; no
> `onOpen`, refazer o fetch dos cards (baseline).

- [ ] **Step 3: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```
Esperado: sai 0.

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git add frontend/src/pages/KanbanBoard.tsx
git commit -m "feat(realtime): board de Vendas aplica move em tempo real + resync"
```

---

## Task 9: Frontend — ligar no board de Serviço

**Files:**
- Modify: `frontend/src/pages/ServiceKanban.tsx`

- [ ] **Step 1: Importar o hook**

```typescript
import { useBoardStream } from "../hooks/useBoardStream";
```

- [ ] **Step 2: Ligar o stream + aplicar o move**

No componente principal (`numId` = board id; existe `reloadCards()` e o estado de
cards). Adicionar após os estados:

```typescript
  useBoardStream(
    "service",
    numId || undefined,
    (evt) => {
      if (evt?.type !== "card_moved") return;
      setCards((prev) =>
        prev.map((c) =>
          c.id === evt.card_id ? { ...c, list_id: evt.list_id, position: evt.position } : c
        )
      );
    },
    () => { reloadCards(); },
  );
```

> Verificado: `ServiceKanban.tsx` tem `const [cards, setCards] = useState<ServiceCard[]>([])`
> (linha ~720) e `reloadCards()` (linha ~786). O código acima usa os nomes corretos.

- [ ] **Step 3: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```
Esperado: sai 0.

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git add frontend/src/pages/ServiceKanban.tsx
git commit -m "feat(realtime): board de Servico aplica move em tempo real + resync"
```

---

## Task 10: Smoke manual (2 navegadores) + nota de deploy

**Files:** nenhum (validação) + possível nota em `docs/`.

- [ ] **Step 1: Subir tudo local e testar com 2 sessões**

Com o backend local (container) + frontend rodando:
1. Abrir o **mesmo board de Vendas** em duas janelas (ou dois usuários).
2. Mover um card numa janela → confirmar que move na outra em ~1s.
3. Reordenar dentro da mesma lista → reflete na outra.
4. Repetir no board de **Serviço**.
5. Desconectar a rede de uma janela por ~30s e religar → o stream reconecta
   (ver no console) e o resync corrige o estado.

Esperado: movimento aparece na outra janela sem F5; reconecta sozinho.

- [ ] **Step 2: Conferir no DevTools**

Aba Network → o request `/stream` fica **pendente/aberto** (EventSource), sem
erro; a cada movimento chega um `data: {...}`. Sem loop de 401 (ticket novo por
tentativa).

- [ ] **Step 3: Nota de deploy**

Nenhuma migration. Requer Redis (já no stack). Subir backend + frontend normal.
Registrar no CHANGELOG/modal/rodapé quando for release (fora deste plano — o
usuário decide a versão).

- [ ] **Step 4: Commit** (se houver nota — perguntar antes)

```bash
git add docs/
git commit -m "docs(realtime): nota de smoke test e deploy do tempo real"
```

---

## Notas de risco / verificação durante a execução

- **`Query` importado?** Task 4/5 usam `Query`. Confirmar o import de `fastapi` em
  cada endpoint e adicionar `Query` se faltar.
- **`Board` model importado em `cards.py`?** Confirmar (é usado nas rotas de board);
  se `cards.py` não importa `Board`, importar `from app.models.board import Board`.
- **Nomes reais no front (verificados):** Vendas `setCards` (linha ~62) +
  `loadCardsOnly` (~463); Serviço `setCards` (~720) + `reloadCards` (~786). Ambos
  guardam `cards` como lista plana com `list_id`.
- **Conflito de rota `/{board_id}/stream` (Serviço):** se o FastAPI casar errado,
  registrar os endpoints logo após `get_service_board` e/ou usar path mais
  específico. Testar `GET /api/v1/service-boards/<id>/stream?ticket=...` retorna
  401 com ticket inválido (não 404/405).
- **Ordem: publish sempre após commit.** Os endpoints de move chamam o serviço que
  commita; publicar só na volta, antes do `return`.
