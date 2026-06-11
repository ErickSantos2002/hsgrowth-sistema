"""
Endpoint da Dashboard de Serviços.
"""
from datetime import datetime
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.service_dashboard_service import ServiceDashboardService
from app.schemas.service_dashboard import ServiceDashboardResponse
from app.models.user import User

router = APIRouter()


@router.get("", response_model=ServiceDashboardResponse)
async def get_service_dashboard(
    start: Optional[str] = Query(None, description="Início do período (ISO, ex: 2026-06-01)"),
    end: Optional[str] = Query(None, description="Fim do período (ISO, ex: 2026-06-30)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    now = datetime.utcnow()
    # Padrão: mês atual
    start_dt = datetime.fromisoformat(start) if start else datetime(now.year, now.month, 1)
    end_dt = datetime.fromisoformat(end) if end else now
    svc = ServiceDashboardService(db)
    return svc.get_dashboard(start_dt, end_dt)
