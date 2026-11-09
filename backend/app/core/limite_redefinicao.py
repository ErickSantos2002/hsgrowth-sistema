"""Limite de e-mails de redefinição de senha por endereço (Redis, graceful)."""
from loguru import logger

from app.core.redis_client import get_redis_ai_rate

MAXIMO_POR_HORA = 3
JANELA_SEGUNDOS = 3600


async def permitir_redefinicao(email: str) -> bool:
    """Conta um pedido para o e-mail; False quando passou de 3 na hora.

    Se o Redis estiver fora do ar, não bloqueia (mesmo padrão do rate limit de IA)."""
    redis = await get_redis_ai_rate()
    if redis is None:
        return True
    try:
        chave = f"redefinir_senha:{email.strip().lower()}"
        total = await redis.incr(chave)
        if total == 1:
            await redis.expire(chave, JANELA_SEGUNDOS)
        return total <= MAXIMO_POR_HORA
    except Exception as exc:
        logger.warning(f"Limite de redefinição indisponível: {exc}")
        return True
