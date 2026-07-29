"""
Endpoint da Dashboard de Serviços.
"""
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.service_dashboard_service import ServiceDashboardService
from app.schemas.service_dashboard import ServiceDashboardResponse
from app.models.user import User

router = APIRouter()


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    """Aceita ISO com 'Z' ou offset e devolve datetime naive em UTC
    (compatível com datetime.utcnow() e com os valores do banco)."""
    if not value:
        return None
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


@router.get("", response_model=ServiceDashboardResponse)
async def get_service_dashboard(
    start: Optional[str] = Query(None, description="Início do período (ISO, ex: 2026-06-01)"),
    end: Optional[str] = Query(None, description="Fim do período (ISO, ex: 2026-06-30)"),
    board: Optional[int] = Query(None, description="Board de serviço (1=Funil oficial, 2=Cobrança). Padrão: funil."),
    user_id: Optional[int] = Query(None, description="Filtra a dash pelo trabalho de um usuário (colaborador). Padrão: todos."),
    collection_type: Optional[str] = Query(None, description="[Cobrança] Filtra por tipo de cobrança: a_vencer | atrasados. Padrão: todos."),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    from app.services.service_board_service import SERVICE_RULE_BOARD_IDS
    now = datetime.utcnow()
    # Padrão: mês atual
    start_dt = _parse_dt(start) or datetime(now.year, now.month, 1)
    end_dt = _parse_dt(end) or now
    # Só permite boards com regra (funil/cobrança); demais caem no padrão.
    boards = {board} if (board in SERVICE_RULE_BOARD_IDS) else None
    # Permissão do filtro: só admin/gerente escolhem o usuário. Colaborador comum
    # (role 'service') fica travado na PRÓPRIA dash — ignora o user_id recebido.
    role = current_user.role.name if current_user.role else ""
    if role not in ("admin", "manager"):
        user_id = current_user.id
    ct = collection_type if collection_type in ("a_vencer", "atrasados") else None
    svc = ServiceDashboardService(db)
    return svc.get_dashboard(start_dt, end_dt, boards=boards, user_id=user_id, collection_type=ct)


@router.get("/collaborators")
async def list_service_collaborators(
    board: Optional[int] = Query(None, description="Board de serviço (1 ou 2). Padrão: funil."),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Usuários que já agiram em algum card do board — para o filtro de usuário."""
    from app.services.service_board_service import SERVICE_RULE_BOARD_IDS
    boards = {board} if (board in SERVICE_RULE_BOARD_IDS) else None
    return ServiceDashboardService(db).list_collaborators(boards=boards)
