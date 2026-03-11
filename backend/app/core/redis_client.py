"""
Clientes Redis assíncronos para sessões e rate limiting de IA.
- DB 1: sessões de usuário
- DB 2: contadores de rate limiting da IA
Implementa graceful degradation: se o Redis cair, o sistema continua funcionando.
"""
from typing import Optional

import redis.asyncio as aioredis
from loguru import logger

from app.core.config import settings

# Singleton do cliente Redis de sessões (DB 1)
redis_session: Optional[aioredis.Redis] = None

# Singleton do cliente Redis de rate limiting de IA (DB 2)
redis_ai_rate: Optional[aioredis.Redis] = None


async def connect_redis() -> None:
    """
    Inicializa a conexão com o Redis (DB 1 - sessões).
    Chamado no evento de startup da aplicação.
    Não levanta exceção se o Redis estiver offline (graceful degradation).
    """
    global redis_session
    try:
        redis_session = aioredis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_SESSION_DB,
            password=settings.REDIS_PASSWORD or None,  # None = sem autenticação
            decode_responses=True,  # Retorna strings em vez de bytes
            socket_connect_timeout=3,
            socket_timeout=3,
        )
        # Testa a conexão com um PING
        await redis_session.ping()
        logger.success(
            f"Redis de sessões conectado: {settings.REDIS_HOST}:{settings.REDIS_PORT}/db{settings.REDIS_SESSION_DB}"
        )
    except Exception as exc:
        # Sistema continua funcionando sem Redis (sem blacklist e sem status online)
        logger.warning(f"Redis de sessões indisponivel — sistema continua sem gestao de sessoes: {exc}")
        redis_session = None


async def disconnect_redis() -> None:
    """
    Fecha a conexão com o Redis.
    Chamado no evento de shutdown da aplicação.
    """
    global redis_session
    if redis_session is not None:
        try:
            await redis_session.aclose()
            logger.info("Redis de sessões desconectado")
        except Exception as exc:
            logger.warning(f"Erro ao desconectar Redis de sessoes: {exc}")
        finally:
            redis_session = None


async def get_redis_session() -> Optional[aioredis.Redis]:
    """
    Retorna a instância do cliente Redis de sessões.
    Retorna None se o Redis estiver offline (sem exceção).

    Returns:
        Instância do Redis ou None se indisponível
    """
    global redis_session
    if redis_session is None:
        return None
    try:
        # Verifica se a conexão ainda está viva
        await redis_session.ping()
        return redis_session
    except Exception:
        # Redis caiu durante a execução — retorna None para graceful degradation
        logger.warning("Redis de sessoes perdeu conexao — operando sem gestao de sessoes")
        redis_session = None
        return None


# =============================================================================
# Cliente Redis de rate limiting de IA (DB 2)
# =============================================================================


async def connect_redis_ai_rate() -> None:
    """
    Inicializa a conexão com o Redis (DB 2 - rate limiting de IA).
    Chamado no evento de startup da aplicação.
    Não levanta exceção se o Redis estiver offline (graceful degradation).
    """
    global redis_ai_rate
    try:
        redis_ai_rate = aioredis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_AI_RATE_DB,
            password=settings.REDIS_PASSWORD or None,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
        await redis_ai_rate.ping()
        logger.success(
            f"Redis de rate limiting de IA conectado: {settings.REDIS_HOST}:{settings.REDIS_PORT}/db{settings.REDIS_AI_RATE_DB}"
        )
    except Exception as exc:
        # Sistema continua funcionando sem Redis (rate limiting desabilitado — permite todas as chamadas)
        logger.warning(f"Redis de rate limiting de IA indisponivel — sistema continua sem limite de chamadas: {exc}")
        redis_ai_rate = None


async def disconnect_redis_ai_rate() -> None:
    """
    Fecha a conexão com o Redis de rate limiting de IA.
    Chamado no evento de shutdown da aplicação.
    """
    global redis_ai_rate
    if redis_ai_rate is not None:
        try:
            await redis_ai_rate.aclose()
            logger.info("Redis de rate limiting de IA desconectado")
        except Exception as exc:
            logger.warning(f"Erro ao desconectar Redis de rate limiting de IA: {exc}")
        finally:
            redis_ai_rate = None


async def get_redis_ai_rate() -> Optional[aioredis.Redis]:
    """
    Retorna a instância do cliente Redis de rate limiting de IA.
    Retorna None se o Redis estiver offline (sem exceção).

    Returns:
        Instância do Redis ou None se indisponível
    """
    global redis_ai_rate
    if redis_ai_rate is None:
        return None
    try:
        await redis_ai_rate.ping()
        return redis_ai_rate
    except Exception:
        # Redis caiu durante a execução — graceful degradation (permite chamadas)
        logger.warning("Redis de rate limiting de IA perdeu conexao — operando sem limite de chamadas")
        redis_ai_rate = None
        return None
