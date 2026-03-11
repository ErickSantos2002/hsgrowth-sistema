"""
Rate limiter para chamadas ao Agent Growth (IA).
Usa Redis DB 2 com janelas deslizantes horárias e diárias por usuário.
Graceful degradation: se Redis estiver offline, permite todas as chamadas.
"""
from dataclasses import dataclass
from datetime import datetime

from loguru import logger

from app.core.config import settings
from app.core.redis_client import get_redis_ai_rate


@dataclass
class RateLimitResult:
    """Resultado da verificação de rate limit para um usuário."""
    allowed: bool          # Se a chamada é permitida
    remaining_hour: int    # Chamadas restantes na janela horária atual
    remaining_day: int     # Chamadas restantes na janela diária atual


class AIRateLimiter:
    """
    Controla o número de chamadas ao Agent Growth por usuário.

    Usa duas janelas independentes no Redis:
    - Horária: chave `ai_rate:{user_id}:h:{YYYYMMDDHH}` — expira em 2 horas
    - Diária:  chave `ai_rate:{user_id}:d:{YYYYMMDD}`   — expira em 2 dias

    A expiração dupla (2x a janela) garante que a chave seja removida
    automaticamente mesmo que o contador seja incrementado no final da janela.
    """

    def _build_keys(self, user_id: int) -> tuple[str, str]:
        """Retorna as chaves Redis de janela horária e diária para o usuário."""
        now = datetime.now()
        hour_key = f"ai_rate:{user_id}:h:{now.strftime('%Y%m%d%H')}"
        day_key = f"ai_rate:{user_id}:d:{now.strftime('%Y%m%d')}"
        return hour_key, day_key

    async def check_and_increment(self, user_id: int) -> RateLimitResult:
        """
        Verifica se o usuário ainda está dentro do limite e incrementa os contadores.

        Usa pipeline Redis atômico para garantir que INCR e EXPIRE sejam
        executados juntos, evitando race conditions.

        Se o Redis estiver indisponível, retorna allowed=True (graceful degradation).
        """
        redis = await get_redis_ai_rate()

        # Redis indisponível: permite a chamada sem contar
        if redis is None:
            return RateLimitResult(
                allowed=True,
                remaining_hour=settings.AI_RATE_LIMIT_PER_HOUR,
                remaining_day=settings.AI_RATE_LIMIT_PER_DAY,
            )

        try:
            hour_key, day_key = self._build_keys(user_id)

            # Primeiro lê os valores atuais para decidir se permite antes de incrementar
            current_hour = await redis.get(hour_key)
            current_day = await redis.get(day_key)

            count_hour = int(current_hour) if current_hour else 0
            count_day = int(current_day) if current_day else 0

            # Verifica se excedeu algum limite antes de incrementar
            if count_hour >= settings.AI_RATE_LIMIT_PER_HOUR or count_day >= settings.AI_RATE_LIMIT_PER_DAY:
                return RateLimitResult(
                    allowed=False,
                    remaining_hour=max(0, settings.AI_RATE_LIMIT_PER_HOUR - count_hour),
                    remaining_day=max(0, settings.AI_RATE_LIMIT_PER_DAY - count_day),
                )

            # Pipeline atômico: incrementa ambas as chaves e define TTL
            async with redis.pipeline(transaction=True) as pipe:
                pipe.incr(hour_key)
                pipe.expire(hour_key, 7200)   # 2 horas (garante limpeza após janela)
                pipe.incr(day_key)
                pipe.expire(day_key, 172800)  # 2 dias (garante limpeza após janela)
                results = await pipe.execute()

            new_count_hour = results[0]
            new_count_day = results[2]

            return RateLimitResult(
                allowed=True,
                remaining_hour=max(0, settings.AI_RATE_LIMIT_PER_HOUR - new_count_hour),
                remaining_day=max(0, settings.AI_RATE_LIMIT_PER_DAY - new_count_day),
            )

        except Exception as exc:
            # Erro inesperado no Redis: permite a chamada para não bloquear o usuário
            logger.warning(f"Erro ao verificar rate limit de IA para user {user_id}: {exc}")
            return RateLimitResult(
                allowed=True,
                remaining_hour=settings.AI_RATE_LIMIT_PER_HOUR,
                remaining_day=settings.AI_RATE_LIMIT_PER_DAY,
            )

    async def get_status(self, user_id: int) -> RateLimitResult:
        """
        Retorna o status atual do rate limit sem incrementar os contadores.
        Usado pelo endpoint GET /agent/rate-limit-status.
        """
        redis = await get_redis_ai_rate()

        if redis is None:
            return RateLimitResult(
                allowed=True,
                remaining_hour=settings.AI_RATE_LIMIT_PER_HOUR,
                remaining_day=settings.AI_RATE_LIMIT_PER_DAY,
            )

        try:
            hour_key, day_key = self._build_keys(user_id)

            current_hour = await redis.get(hour_key)
            current_day = await redis.get(day_key)

            count_hour = int(current_hour) if current_hour else 0
            count_day = int(current_day) if current_day else 0

            remaining_hour = max(0, settings.AI_RATE_LIMIT_PER_HOUR - count_hour)
            remaining_day = max(0, settings.AI_RATE_LIMIT_PER_DAY - count_day)

            return RateLimitResult(
                allowed=remaining_hour > 0 and remaining_day > 0,
                remaining_hour=remaining_hour,
                remaining_day=remaining_day,
            )

        except Exception as exc:
            logger.warning(f"Erro ao consultar status de rate limit de IA para user {user_id}: {exc}")
            return RateLimitResult(
                allowed=True,
                remaining_hour=settings.AI_RATE_LIMIT_PER_HOUR,
                remaining_day=settings.AI_RATE_LIMIT_PER_DAY,
            )
