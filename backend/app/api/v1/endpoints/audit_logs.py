"""
Endpoints de Audit Logs.
Rotas para visualização de logs de auditoria do sistema.
"""
from typing import Any, Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from datetime import datetime

from app.api.deps import get_db, get_current_active_user, require_role
from app.models.user import User
from app.models.audit_log import AuditLog

router = APIRouter()


@router.get("", summary="Listar logs de auditoria")
async def list_audit_logs(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Registros por página"),
    user_id: Optional[int] = Query(None, description="Filtrar por ID do usuário"),
    action: Optional[str] = Query(None, description="Filtrar por tipo de ação"),
    entity_type: Optional[str] = Query(None, description="Filtrar por tipo de entidade"),
    start_date: Optional[str] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Data final (YYYY-MM-DD)"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todos os logs de auditoria do sistema com paginação e filtros.

    **Permissões:** Apenas Admin

    **Filtros disponíveis:**
    - user_id: Filtrar por usuário que realizou a ação
    - action: Filtrar por tipo de ação (LOGIN, CREATE, UPDATE, DELETE, etc.)
    - entity_type: Filtrar por tipo de entidade (User, Card, Board, etc.)
    - start_date: Data inicial (formato: YYYY-MM-DD)
    - end_date: Data final (formato: YYYY-MM-DD)

    **Paginação:**
    - page: Número da página (padrão: 1)
    - page_size: Registros por página (padrão: 50, máx: 100)

    **Retorna:**
    - Lista de logs ordenados por data (mais recentes primeiro)
    - Metadados de paginação
    - Informações do usuário que realizou cada ação
    """
    # Constrói query base
    query = db.query(AuditLog, User).outerjoin(
        User, AuditLog.user_id == User.id
    )

    # Aplica filtros
    filters = []

    if user_id:
        filters.append(AuditLog.user_id == user_id)

    if action:
        filters.append(AuditLog.action == action)

    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            filters.append(AuditLog.created_at >= start_dt)
        except ValueError:
            pass  # Ignora data inválida

    if end_date:
        try:
            end_dt = datetime.strptime(end_date + " 23:59:59", "%Y-%m-%d %H:%M:%S")
            filters.append(AuditLog.created_at <= end_dt)
        except ValueError:
            pass  # Ignora data inválida

    if filters:
        query = query.filter(and_(*filters))

    # Ordena por data (mais recentes primeiro)
    query = query.order_by(desc(AuditLog.created_at))

    # Calcula total
    total = query.count()

    # Aplica paginação
    offset = (page - 1) * page_size
    logs_with_users = query.offset(offset).limit(page_size).all()

    # Formata resposta
    logs_list = []
    for log, user in logs_with_users:
        logs_list.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_name": user.name if user else "Sistema",
            "user_email": user.email if user else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "description": log.description,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at.isoformat() + 'Z' if log.created_at else None
        })

    # Calcula metadados de paginação
    total_pages = (total + page_size - 1) // page_size

    return {
        "logs": logs_list,
        "pagination": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }


@router.get("/actions", summary="Listar tipos de ações disponíveis")
async def list_actions(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todos os tipos de ações registradas no sistema.

    Útil para popular filtros na interface.
    """
    actions = db.query(AuditLog.action).distinct().order_by(AuditLog.action).all()
    return {
        "actions": [action[0] for action in actions if action[0]]
    }


@router.get("/entity-types", summary="Listar tipos de entidades disponíveis")
async def list_entity_types(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todos os tipos de entidades registradas no sistema.

    Útil para popular filtros na interface.
    """
    entity_types = db.query(AuditLog.entity_type).distinct().order_by(AuditLog.entity_type).all()
    return {
        "entity_types": [entity_type[0] for entity_type in entity_types if entity_type[0]]
    }
