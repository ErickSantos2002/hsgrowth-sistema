"""
Middleware de atualização de atividade de sessão.
A cada request autenticado, renova o TTL da sessão no Redis.
Usa fire-and-forget (asyncio.ensure_future) para não adicionar latência.
"""
import asyncio

from fastapi import Request
import jwt
from loguru import logger

from app.core.config import settings
from app.core.redis_sessions import session_manager


async def session_activity_middleware(request: Request, call_next):
    """
    Middleware que atualiza o last_activity da sessão a cada request.
    Extrai session_id do payload JWT sem verificar assinatura (já verificada no dep).
    Não impacta a latência pois usa ensure_future (fire-and-forget).
    """
    # Processa o request normalmente primeiro
    response = await call_next(request)

    # Tenta atualizar a atividade em background (fire-and-forget)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            # Decodifica sem verificar assinatura — apenas para extrair session_id
            # A verificação real já foi feita pela dependency get_current_user
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_exp": False},  # Não verifica expiração aqui
            )
            session_id = payload.get("session_id")
            user_id = payload.get("sub")

            # Só atualiza se tiver session_id (tokens de integração não têm)
            if session_id and user_id and not str(user_id).startswith("client:"):
                # Fire-and-forget: não bloqueia a resposta
                # create_task() é preferível ao ensure_future() em contexto async (Python 3.10+)
                asyncio.create_task(
                    session_manager.update_activity(int(user_id), session_id)
                )
        except jwt.PyJWTError:
            # Token inválido ou malformado — ignora silenciosamente
            pass
        except Exception as exc:
            # Qualquer outro erro — loga mas não afeta o request
            logger.warning(f"Middleware de sessao: erro inesperado: {exc}")

    return response
