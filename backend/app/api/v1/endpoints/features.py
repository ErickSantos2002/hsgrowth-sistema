"""
Flags de funcionalidade por usuário.

Permite subir funcionalidade nova para produção visível apenas para quem
homologa — necessário porque não existe ambiente de homologação separado.
Ver seção 15.8 do design da reunião por vídeo.
"""
from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.models.user import User

router = APIRouter()


def _daily_enabled_for(user: User) -> bool:
    """
    Diz se o usuário pode usar a reunião por vídeo (Daily).

    DAILY_ENABLED_USER_IDS vazio = liberado para todos (estado pós-homologação).
    Com IDs, apenas eles enxergam.
    """
    raw = (settings.DAILY_ENABLED_USER_IDS or "").strip()
    if not raw:
        return True

    allowed = {parte.strip() for parte in raw.split(",") if parte.strip()}
    return str(user.id) in allowed


@router.get(
    "",
    summary="Flags de funcionalidade do usuário logado",
    description="""
    Retorna quais funcionalidades em homologação estão visíveis para este usuário.

    O frontend usa isso para mostrar ou esconder recursos que ainda não foram
    liberados para o time todo.
    """,
    responses={
        200: {
            "description": "Flags do usuário",
            "content": {"application/json": {"example": {"daily_meeting": False}}},
        }
    },
)
async def get_features(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return {
        "daily_meeting": _daily_enabled_for(current_user),
    }
