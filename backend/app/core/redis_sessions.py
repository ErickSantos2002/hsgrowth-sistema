"""
Gerenciamento de sessões de usuário no Redis.
Cada login cria uma sessão com TTL de 15 minutos (renovado a cada request).
Tokens revogados (logout) ficam na blacklist até expirarem naturalmente.
"""
import hashlib
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from loguru import logger

from app.core.config import settings
from app.core.redis_client import get_redis_session

# Prefixos das chaves no Redis
_PREFIX_SESSION = "session"
_PREFIX_BLACKLIST = "blacklist"


def _make_session_key(user_id: int, session_id: str) -> str:
    """Monta a chave Redis para uma sessão: session:{user_id}:{session_id}"""
    return f"{_PREFIX_SESSION}:{user_id}:{session_id}"


def _make_blacklist_key(token_hash: str) -> str:
    """Monta a chave Redis para a blacklist: blacklist:{token_hash}"""
    return f"{_PREFIX_BLACKLIST}:{token_hash}"


def _hash_token(token: str) -> str:
    """
    Gera SHA-256 do token para armazenar na blacklist.
    Evita guardar o token completo (segurança) e economiza memória.
    """
    return hashlib.sha256(token.encode()).hexdigest()


class SessionManager:
    """
    Gerencia sessões de usuário no Redis.
    Todos os métodos têm try/except para graceful degradation:
    se o Redis estiver offline, as operações simplesmente não persistem.
    """

    async def create_session(
        self,
        user_id: int,
        token: str,
        ip: str,
        user_agent: str,
    ) -> Optional[str]:
        """
        Cria uma nova sessão para o usuário após login.

        Args:
            user_id: ID do usuário
            token: Access token JWT (será armazenado como hash)
            ip: Endereço IP do cliente
            user_agent: User-agent do navegador/cliente

        Returns:
            session_id gerado, ou None se o Redis estiver offline
        """
        redis = await get_redis_session()
        if redis is None:
            return None

        session_id = str(uuid.uuid4())
        key = _make_session_key(user_id, session_id)
        now = datetime.utcnow().isoformat()

        session_data = {
            "user_id": str(user_id),
            "session_id": session_id,
            "token_hash": _hash_token(token),
            "created_at": now,
            "last_activity": now,
            "ip": ip,
            "user_agent": user_agent[:512],  # Limita tamanho para economizar memória
        }

        try:
            # HSET + EXPIRE em pipeline para atomicidade
            async with redis.pipeline() as pipe:
                pipe.hset(key, mapping=session_data)
                pipe.expire(key, settings.REDIS_SESSION_TTL_SECONDS)
                await pipe.execute()

            logger.debug(f"Sessao criada: user_id={user_id}, session_id={session_id}")
            return session_id
        except Exception as exc:
            logger.warning(f"Falha ao criar sessao no Redis: {exc}")
            return None

    async def update_activity(self, user_id: int, session_id: str) -> None:
        """
        Renova o TTL da sessão (chamado a cada request autenticado).
        Fire-and-forget: não bloqueia o request em caso de falha.

        Args:
            user_id: ID do usuário
            session_id: ID da sessão
        """
        redis = await get_redis_session()
        if redis is None:
            return

        try:
            key = _make_session_key(user_id, session_id)

            # Verifica se a chave existe antes de atualizar.
            # Sem esse check, `hset` recriaria a chave após o logout ter deletado.
            if not await redis.exists(key):
                return

            now = datetime.utcnow().isoformat()
            # Atualiza last_activity e renova o TTL
            async with redis.pipeline() as pipe:
                pipe.hset(key, "last_activity", now)
                pipe.expire(key, settings.REDIS_SESSION_TTL_SECONDS)
                await pipe.execute()
        except Exception as exc:
            logger.warning(f"Falha ao atualizar atividade da sessao: {exc}")

    async def remove_session(self, user_id: int, session_id: str) -> None:
        """
        Remove uma sessão (chamado no logout).

        Args:
            user_id: ID do usuário
            session_id: ID da sessão
        """
        redis = await get_redis_session()
        if redis is None:
            return

        try:
            key = _make_session_key(user_id, session_id)
            await redis.delete(key)
            logger.debug(f"Sessao removida: user_id={user_id}, session_id={session_id}")
        except Exception as exc:
            logger.warning(f"Falha ao remover sessao do Redis: {exc}")

    async def blacklist_token(self, token: str, remaining_ttl_seconds: int) -> None:
        """
        Adiciona um token à blacklist (logout ou revogação).
        O token fica na blacklist pelo tempo restante de validade do JWT.

        Args:
            token: Access token JWT a ser blacklistado
            remaining_ttl_seconds: Segundos restantes de validade do token
        """
        redis = await get_redis_session()
        if redis is None:
            return

        try:
            token_hash = _hash_token(token)
            key = _make_blacklist_key(token_hash)
            # Valor "1" — a presença da chave já é suficiente para indicar revogação
            await redis.setex(key, max(remaining_ttl_seconds, 1), "1")
            logger.debug(f"Token blacklistado: hash={token_hash[:16]}... TTL={remaining_ttl_seconds}s")
        except Exception as exc:
            logger.warning(f"Falha ao blacklistar token: {exc}")

    async def is_blacklisted(self, token: str) -> bool:
        """
        Verifica se um token está na blacklist.

        Args:
            token: Access token JWT a verificar

        Returns:
            True se o token foi revogado, False se válido ou Redis offline
        """
        redis = await get_redis_session()
        if redis is None:
            # Redis offline = não bloqueia (graceful degradation)
            return False

        try:
            token_hash = _hash_token(token)
            key = _make_blacklist_key(token_hash)
            result = await redis.exists(key)
            return bool(result)
        except Exception as exc:
            logger.warning(f"Falha ao verificar blacklist: {exc}")
            # Em caso de falha, deixa passar (disponibilidade > segurança absoluta)
            return False

    async def get_active_sessions(self) -> List[Dict[str, Any]]:
        """
        Lista todas as sessões ativas no Redis.
        Usa SCAN em vez de KEYS para não bloquear o Redis em produção.

        Returns:
            Lista de dicts com dados de cada sessão ativa
        """
        redis = await get_redis_session()
        if redis is None:
            return []

        sessions = []
        try:
            # SCAN itera por chaves sem bloquear (ao contrário de KEYS)
            pattern = f"{_PREFIX_SESSION}:*"
            async for key in redis.scan_iter(pattern, count=100):
                try:
                    data = await redis.hgetall(key)
                    if data:
                        sessions.append(data)
                except Exception:
                    # Chave pode ter expirado entre o scan e o hgetall
                    continue
        except Exception as exc:
            logger.warning(f"Falha ao listar sessoes ativas: {exc}")

        return sessions


# Instância singleton do gerenciador de sessões
session_manager = SessionManager()
