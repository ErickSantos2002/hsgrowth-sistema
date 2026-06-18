"""
Endpoint de Atividades de Serviços (visão geral).

Lista as atividades (category="atividade") de TODOS os cards de serviço,
de todos os usuários — não há divisão por responsável no módulo de serviço.
Usado pela página "Atividades" do role de Serviço.
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList

router = APIRouter()


@router.get("")
async def list_service_activities(
    status: str = Query("pending", description="pending | completed | all"),
    limit: int = Query(2000, ge=1, le=5000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Retorna as atividades (tarefas) de todos os cards de serviço.

    Sem filtro por usuário: todo mundo do módulo vê todas as atividades.
    - status=pending   → apenas não concluídas (lista de Atividades)
    - status=completed → apenas concluídas
    - status=all       → todas (usado pelo Calendário)
    """
    q = (
        db.query(
            ServiceCardActivity,
            ServiceCard.title.label("card_title"),
            ServiceList.board_id.label("board_id"),
            User.name.label("user_name"),
        )
        .join(ServiceCard, ServiceCardActivity.service_card_id == ServiceCard.id)
        .join(ServiceList, ServiceCard.list_id == ServiceList.id)
        .outerjoin(User, ServiceCardActivity.user_id == User.id)
        .filter(
            ServiceCardActivity.category == "atividade",
            ServiceCard.is_deleted.is_(False),
        )
    )

    if status == "pending":
        q = q.filter(ServiceCardActivity.is_completed.is_(False))
        q = q.order_by(ServiceCardActivity.due_date.asc().nullslast())
    elif status == "completed":
        q = q.filter(ServiceCardActivity.is_completed.is_(True))
        q = q.order_by(ServiceCardActivity.created_at.desc())
    else:  # all
        q = q.order_by(ServiceCardActivity.due_date.asc().nullslast())

    rows = q.limit(limit).all()

    items: List[dict] = []
    for act, card_title, board_id, user_name in rows:
        items.append({
            "id": act.id,
            "service_card_id": act.service_card_id,
            "card_title": card_title,
            "board_id": board_id,
            "activity_type": act.activity_type,
            "title": act.title,
            "description": act.description,
            "priority": act.priority,
            "due_date": act.due_date.isoformat() if act.due_date else None,
            "is_completed": act.is_completed,
            "completed_at": act.completed_at.isoformat() if act.completed_at else None,
            "user_id": act.user_id,
            "user_name": user_name,
            "created_at": act.created_at.isoformat() if act.created_at else None,
        })

    return {"activities": items, "total": len(items)}
