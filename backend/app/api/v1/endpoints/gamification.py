"""
Endpoints de Gamificação.
Rotas para pontos, badges e rankings.
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, require_role, require_manager_or_admin
from app.services.gamification_service import GamificationService
from app.repositories.gamification_repository import GamificationRepository
from app.schemas.gamification import (
    GamificationPointResponse,
    GamificationPointListResponse,
    BadgeCreate,
    BadgeUpdate,
    BadgeResponse,
    UserBadgeResponse,
    RankingListResponse,
    UserGamificationSummary,
    ActionPointsCreate,
    ActionPointsUpdate,
    ActionPointsResponse
)
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.gamification_badge import GamificationBadge

router = APIRouter()


# ========== RESUMO DO USUÁRIO ==========

@router.get(
    "/me",
    response_model=UserGamificationSummary,
    summary="Resumo de gamificação do usuário",
    responses={
        200: {
            "description": "Resumo de gamificação retornado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "user_id": 5,
                        "user_name": "João Silva",
                        "total_points": 1250,
                        "badges": [],
                        "current_week_points": 45,
                        "current_month_points": 245,
                        "weekly_rank": 2,
                        "monthly_rank": 1,
                        "quarterly_rank": 3,
                        "annual_rank": 5
                    }
                }
            }
        }
    }
)
async def get_my_gamification(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Obtém resumo completo de gamificação do usuário autenticado.

    - **total_points**: Total de pontos acumulados
    - **badges**: Lista de badges conquistados
    - **current_week_points**: Pontos da semana atual
    - **current_month_points**: Pontos do mês atual
    - **weekly_rank**: Posição no ranking semanal
    - **monthly_rank**: Posição no ranking mensal
    - **quarterly_rank**: Posição no ranking trimestral
    - **annual_rank**: Posição no ranking anual
    """
    service = GamificationService(db)
    return service.get_user_summary(current_user.id)


@router.get(
    "/users/{user_id}",
    response_model=UserGamificationSummary,
    summary="Resumo de gamificação de um usuário",
    responses={
        200: {
            "description": "Resumo de gamificação do usuário retornado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "user_id": 12,
                        "user_name": "Maria Santos",
                        "total_points": 890,
                        "badges": [
                            {
                                "id": 1,
                                "user_id": 12,
                                "badge_id": 3,
                                "awarded_at": "2026-01-20T14:30:00",
                                "awarded_by_id": 1,
                                "badge_name": "Fechador de Negócios",
                                "badge_description": "Fechou 10 vendas em um mês",
                                "badge_icon": "/badges/deal-closer.png"
                            }
                        ],
                        "current_week_points": 60,
                        "current_month_points": 310,
                        "weekly_rank": 1,
                        "monthly_rank": 2,
                        "quarterly_rank": 4,
                        "annual_rank": 3
                    }
                }
            }
        },
        404: {
            "description": "Usuário não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Usuário com ID 999 não encontrado"}
                }
            }
        }
    }
)
async def get_user_gamification(
    user_id: int = Path(..., description="ID do usuário"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Obtém resumo completo de gamificação de um usuário específico.

    - **user_id**: ID do usuário
    """
    service = GamificationService(db)
    return service.get_user_summary(user_id)


# ========== PONTOS ==========

@router.post(
    "/points",
    response_model=GamificationPointResponse,
    summary="Atribuir pontos",
    status_code=201,
    responses={
        201: {
            "description": "Pontos atribuídos com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 42,
                        "user_id": 5,
                        "points": 20,
                        "reason": "card_won",
                        "description": "Card 'Consultoria RH - Empresa Viva Ltda' ganho - valor R$ 35.000",
                        "created_at": "2026-02-03T09:15:00"
                    }
                }
            }
        },
        404: {
            "description": "Usuário não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Usuário com ID 999 não encontrado"}
                }
            }
        }
    }
)
async def award_points(
    request: Request,
    user_id: int = Body(..., description="ID do usuário"),
    action_type: str = Body(..., description="Tipo de ação (ex: card_won, meeting_completed)"),
    board_type: str = Body(..., description="Board da ação: prospecting ou acquisition"),
    description: str = Body(None, description="Descrição da ação"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atribui pontos a um usuário por uma ação (manual, para testes e correções).

    - **user_id**: ID do usuário que receberá os pontos
    - **action_type**: Tipo de ação (card_created, card_won, etc.)
    - **board_type**: Board da ação (prospecting ou acquisition)
    - **description**: Descrição da ação (opcional)
    """
    service = GamificationService(db)
    points_record = service.award_points(user_id, action_type, board_type, description)
    if not points_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ação '{action_type}' não configurada ou inativa no board '{board_type}'"
        )

    # Busca o nome do usuário para o log
    user = db.query(User).filter(User.id == user_id).first()
    user_name = user.name if user else f"Usuário ID {user_id}"

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="POINTS_AWARDED",
        entity_type="GamificationPoint",
        entity_id=points_record.id,
        description=f"Pontos atribuídos: {points_record.points} pts → {user_name} ({reason})",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return points_record


# ========== BADGES ==========

@router.get(
    "/badges",
    response_model=List[BadgeResponse],
    summary="Listar badges",
    responses={
        200: {
            "description": "Lista de badges retornada com sucesso",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "name": "Vendedor do Mês",
                            "description": "Concedido ao vendedor com mais pontos no mês",
                            "icon_url": "/badges/top-seller.png",
                            "criteria_type": "manual",
                            "criteria": None,
                            "is_active": True,
                            "created_at": "2026-01-01T10:00:00"
                        },
                        {
                            "id": 2,
                            "name": "Primeiro Negócio",
                            "description": "Fechou o primeiro card como ganho",
                            "icon_url": "/badges/first-deal.png",
                            "criteria_type": "automatic",
                            "criteria": {"min_won_cards": 1},
                            "is_active": True,
                            "created_at": "2026-01-01T10:00:00"
                        }
                    ]
                }
            }
        }
    }
)
async def list_badges(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todos os badges disponíveis no sistema.

    - **page**: Número da página
    - **page_size**: Tamanho da página
    """
    service = GamificationService(db)
    return service.list_badges(page, page_size)


@router.post(
    "/badges",
    response_model=BadgeResponse,
    summary="Criar badge",
    status_code=201,
    responses={
        201: {
            "description": "Badge criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 5,
                        "name": "Meta Trimestral",
                        "description": "Atingiu a meta de vendas do trimestre",
                        "icon_url": "/badges/quarterly-goal.png",
                        "criteria_type": "manual",
                        "criteria": None,
                        "is_active": True,
                        "created_at": "2026-02-01T11:30:00"
                    }
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {"detail": "Permissão insuficiente. Requer role: admin"}
                }
            }
        },
        422: {
            "description": "Dados inválidos na requisição",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "name"],
                                "msg": "Field required",
                                "type": "missing"
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def create_badge(
    request: Request,
    badge_data: BadgeCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria um novo badge (apenas admin).

    - **name**: Nome do badge
    - **description**: Descrição do badge
    - **icon**: Ícone ou imagem do badge
    - **criteria**: Critérios para conquistar
    - **points_required**: Pontos necessários (opcional)
    """
    service = GamificationService(db)
    badge = service.create_badge(badge_data, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE",
        entity_type="GamificationBadge",
        entity_id=badge.id,
        description=f"GamificationBadge criado: {badge.name}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return badge


@router.post(
    "/badges/{badge_id}/award",
    response_model=UserBadgeResponse,
    summary="Atribuir badge a usuário",
    status_code=200,
    responses={
        200: {
            "description": "Badge atribuído ao usuário com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 8,
                        "user_id": 5,
                        "badge_id": 1,
                        "awarded_at": "2026-02-01T16:45:00",
                        "awarded_by_id": 1,
                        "badge_name": "Vendedor do Mês",
                        "badge_description": "Concedido ao vendedor com mais pontos no mês",
                        "badge_icon": "/badges/top-seller.png"
                    }
                }
            }
        },
        404: {
            "description": "Badge ou usuário não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Badge com ID 999 não encontrado"}
                }
            }
        }
    }
)
async def award_badge(
    request: Request,
    badge_id: int = Path(..., description="ID do badge"),
    user_id: int = Body(..., embed=True, description="ID do usuário"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atribui um badge manualmente a um usuário.

    - **badge_id**: ID do badge
    - **user_id**: ID do usuário que receberá o badge
    """
    service = GamificationService(db)
    user_badge = service.award_badge_to_user(user_id, badge_id, current_user)

    # Busca informações para o log
    badge = db.query(GamificationBadge).filter(GamificationBadge.id == badge_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    badge_name = badge.name if badge else f"GamificationBadge ID {badge_id}"
    user_name = user.name if user else f"Usuário ID {user_id}"

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="AWARD",
        entity_type="GamificationBadge",
        entity_id=badge_id,
        description=f"GamificationBadge atribuído: {badge_name} → {user_name}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return user_badge


@router.get(
    "/badges/me",
    response_model=List[UserBadgeResponse],
    summary="Meus badges",
    responses={
        200: {
            "description": "Lista de badges do usuário autenticado",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "user_id": 5,
                            "badge_id": 1,
                            "awarded_at": "2026-01-31T18:00:00",
                            "awarded_by_id": 1,
                            "badge_name": "Vendedor do Mês",
                            "badge_description": "Concedido ao vendedor com mais pontos no mês",
                            "badge_icon": "/badges/top-seller.png"
                        },
                        {
                            "id": 3,
                            "user_id": 5,
                            "badge_id": 2,
                            "awarded_at": "2026-01-15T10:20:00",
                            "awarded_by_id": None,
                            "badge_name": "Primeiro Negócio",
                            "badge_description": "Fechou o primeiro card como ganho",
                            "badge_icon": "/badges/first-deal.png"
                        }
                    ]
                }
            }
        }
    }
)
async def get_my_badges(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista badges conquistados pelo usuário autenticado.
    """
    service = GamificationService(db)
    return service.get_user_badges(current_user.id)


@router.get(
    "/badges/users/{user_id}",
    response_model=List[UserBadgeResponse],
    summary="GamificationBadges de um usuário",
    responses={
        200: {
            "description": "Lista de badges do usuário retornada com sucesso",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 4,
                            "user_id": 12,
                            "badge_id": 3,
                            "awarded_at": "2026-01-20T14:30:00",
                            "awarded_by_id": 1,
                            "badge_name": "Fechador de Negócios",
                            "badge_description": "Fechou 10 vendas em um mês",
                            "badge_icon": "/badges/deal-closer.png"
                        }
                    ]
                }
            }
        },
        404: {
            "description": "Usuário não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Usuário com ID 999 não encontrado"}
                }
            }
        }
    }
)
async def get_user_badges(
    user_id: int = Path(..., description="ID do usuário"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista badges conquistados por um usuário específico.

    - **user_id**: ID do usuário
    """
    service = GamificationService(db)
    return service.get_user_badges(user_id)


@router.get(
    "/badges/{badge_id}",
    response_model=BadgeResponse,
    summary="Buscar badge por ID",
    responses={
        200: {
            "description": "Badge encontrado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Vendedor do Mês",
                        "description": "Concedido ao vendedor com mais pontos no mês",
                        "icon_url": "/badges/top-seller.png",
                        "criteria_type": "manual",
                        "criteria": None,
                        "is_active": True,
                        "created_at": "2026-01-01T10:00:00"
                    }
                }
            }
        },
        404: {
            "description": "Badge não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Badge com ID 999 não encontrado"}
                }
            }
        }
    }
)
async def get_badge(
    badge_id: int = Path(..., description="ID do badge"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca um badge específico por ID.

    - **badge_id**: ID do badge
    """
    service = GamificationService(db)
    return service.get_badge_by_id(badge_id)


@router.put(
    "/badges/{badge_id}",
    response_model=BadgeResponse,
    summary="Atualizar badge",
    responses={
        200: {
            "description": "Badge atualizado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Top Vendedor Q1",
                        "description": "Melhor vendedor do primeiro trimestre de 2026",
                        "icon_url": "/badges/top-seller-q1.png",
                        "criteria_type": "manual",
                        "criteria": None,
                        "is_active": True,
                        "created_at": "2026-01-01T10:00:00"
                    }
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {"detail": "Permissão insuficiente. Requer role: admin"}
                }
            }
        },
        404: {
            "description": "Badge não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Badge com ID 999 não encontrado"}
                }
            }
        }
    }
)
async def update_badge(
    request: Request,
    badge_id: int = Path(..., description="ID do badge"),
    badge_data: BadgeUpdate = Body(..., description="Dados para atualizar"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza um badge existente (apenas admin).

    - **badge_id**: ID do badge
    - **badge_data**: Campos a serem atualizados
    """
    service = GamificationService(db)
    badge = service.update_badge(badge_id, badge_data, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Constrói descrição com campos alterados
    changed_fields = []
    if badge_data.name is not None:
        changed_fields.append("nome")
    if badge_data.description is not None:
        changed_fields.append("descrição")
    if badge_data.icon is not None:
        changed_fields.append("ícone")
    if badge_data.criteria is not None:
        changed_fields.append("critérios")

    fields_str = ", ".join(changed_fields) if changed_fields else "dados"

    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE",
        entity_type="GamificationBadge",
        entity_id=badge.id,
        description=f"GamificationBadge atualizado: {badge.name} - Campos: {fields_str}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return badge


@router.delete(
    "/badges/{badge_id}",
    summary="Deletar badge",
    status_code=200,
    responses={
        200: {
            "description": "Badge deletado com sucesso (soft delete)",
            "content": {
                "application/json": {
                    "example": {"message": "Badge 'Vendedor do Mês' deletado com sucesso"}
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {"detail": "Permissão insuficiente. Requer role: admin"}
                }
            }
        },
        404: {
            "description": "Badge não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Badge com ID 999 não encontrado"}
                }
            }
        }
    }
)
async def delete_badge(
    request: Request,
    badge_id: int = Path(..., description="ID do badge"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta um badge (soft delete - apenas admin).

    - **badge_id**: ID do badge
    """
    # Busca o badge antes de deletar para registrar no log
    badge = db.query(GamificationBadge).filter(GamificationBadge.id == badge_id).first()
    badge_name = badge.name if badge else f"ID {badge_id}"

    service = GamificationService(db)
    result = service.delete_badge(badge_id, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="DELETE",
        entity_type="GamificationBadge",
        entity_id=badge_id,
        description=f"GamificationBadge deletado: {badge_name}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return result


# ========== RANKINGS ==========

@router.get(
    "/rankings",
    response_model=RankingListResponse,
    summary="Listar rankings",
    responses={
        200: {
            "description": "Rankings retornados com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "rankings": [
                            {
                                "id": 1,
                                "user_id": 5,
                                "total_points": 310,
                                "rank_position": 1,
                                "period_type": "monthly",
                                "period_start": "2026-02-01T00:00:00",
                                "period_end": "2026-02-28T23:59:59",
                                "user_name": "João Silva"
                            },
                            {
                                "id": 2,
                                "user_id": 12,
                                "total_points": 275,
                                "rank_position": 2,
                                "period_type": "monthly",
                                "period_start": "2026-02-01T00:00:00",
                                "period_end": "2026-02-28T23:59:59",
                                "user_name": "Maria Santos"
                            },
                            {
                                "id": 3,
                                "user_id": 8,
                                "total_points": 198,
                                "rank_position": 3,
                                "period_type": "monthly",
                                "period_start": "2026-02-01T00:00:00",
                                "period_end": "2026-02-28T23:59:59",
                                "user_name": "Carlos Oliveira"
                            }
                        ],
                        "period_type": "monthly",
                        "period_start": "2026-02-01T00:00:00",
                        "period_end": "2026-02-28T23:59:59"
                    }
                }
            }
        }
    }
)
async def get_rankings(
    board_type: str = Query(..., description="Board do ranking: prospecting ou acquisition"),
    period_type: str = Query("weekly", description="Tipo de período: weekly, monthly, quarterly, annual"),
    limit: int = Query(100, ge=1, le=500, description="Limite de resultados"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista rankings do sistema para um board e período específicos.

    - **board_type**: Board do ranking (prospecting ou acquisition)
    - **period_type**: Tipo de período (weekly, monthly, quarterly, annual)
    - **limit**: Limite de resultados (padrão: 100, máx: 500)

    Retorna o último ranking calculado pelo scheduler (atualizado a cada hora).
    """
    service = GamificationService(db)
    return service.get_rankings(board_type, period_type, limit)


@router.post(
    "/rankings/calculate",
    response_model=RankingListResponse,
    summary="Recalcular rankings",
    responses={
        200: {
            "description": "Rankings recalculados com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "rankings": [
                            {
                                "id": 10,
                                "user_id": 5,
                                "total_points": 310,
                                "rank_position": 1,
                                "period_type": "weekly",
                                "period_start": "2026-02-03T00:00:00",
                                "period_end": "2026-02-09T23:59:59",
                                "user_name": "João Silva"
                            },
                            {
                                "id": 11,
                                "user_id": 12,
                                "total_points": 275,
                                "rank_position": 2,
                                "period_type": "weekly",
                                "period_start": "2026-02-03T00:00:00",
                                "period_end": "2026-02-09T23:59:59",
                                "user_name": "Maria Santos"
                            }
                        ],
                        "period_type": "weekly",
                        "period_start": "2026-02-03T00:00:00",
                        "period_end": "2026-02-09T23:59:59"
                    }
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {"detail": "Permissão insuficiente. Requer role: admin"}
                }
            }
        }
    }
)
async def calculate_rankings(
    board_type: str = Body(..., embed=True, description="Board do ranking: prospecting ou acquisition"),
    period_type: str = Body(..., embed=True, description="Tipo de período: weekly, monthly, quarterly, annual"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Força recalcular rankings para um board e período.

    - **board_type**: Board do ranking (prospecting ou acquisition)
    - **period_type**: Tipo de período (weekly, monthly, quarterly, annual)

    Útil para forçar atualização antes do próximo ciclo do scheduler.
    """
    service = GamificationService(db)
    return service.calculate_rankings_for_board(board_type, period_type)


# ========== ACTION POINTS CONFIGURATION ==========

@router.get(
    "/action-points",
    response_model=List[ActionPointsResponse],
    summary="Listar configurações de pontos",
    responses={
        200: {
            "description": "Lista de configurações de pontos retornada com sucesso",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "action_type": "card_won",
                            "points": 20,
                            "is_active": True,
                            "description": "Pontos concedidos quando um card é marcado como ganho",
                            "created_at": "2026-01-01T10:00:00",
                            "updated_at": "2026-01-01T10:00:00"
                        },
                        {
                            "id": 2,
                            "action_type": "card_created",
                            "points": 5,
                            "is_active": True,
                            "description": "Pontos concedidos ao criar um novo card",
                            "created_at": "2026-01-01T10:00:00",
                            "updated_at": "2026-01-01T10:00:00"
                        },
                        {
                            "id": 3,
                            "action_type": "task_completed",
                            "points": 10,
                            "is_active": True,
                            "description": "Pontos concedidos ao completar uma tarefa",
                            "created_at": "2026-01-01T10:00:00",
                            "updated_at": "2026-01-01T10:00:00"
                        }
                    ]
                }
            }
        }
    }
)
async def list_action_points(
    board_type: Optional[str] = Query(None, description="Filtrar por board: prospecting ou acquisition"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista configurações de pontos por ação.

    - **board_type**: Filtrar por board (opcional). Sem filtro retorna todos.
    Retorna lista com board_type, action_type, points, is_active e description.
    """
    service = GamificationService(db)
    return service.list_action_points(board_type=board_type)


@router.get(
    "/action-points/{board_type}/{action_type}",
    response_model=ActionPointsResponse,
    summary="Buscar configuração de pontos",
    responses={
        200: {
            "description": "Configuração de pontos encontrada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "action_type": "card_won",
                        "points": 20,
                        "is_active": True,
                        "description": "Pontos concedidos quando um card é marcado como ganho",
                        "created_at": "2026-01-01T10:00:00",
                        "updated_at": "2026-01-01T10:00:00"
                    }
                }
            }
        },
        404: {
            "description": "Configuração não encontrada para o tipo de ação",
            "content": {
                "application/json": {
                    "example": {"detail": "Configuração para ação 'card_archived' não encontrada"}
                }
            }
        }
    }
)
async def get_action_points(
    board_type: str = Path(..., description="Board da ação: prospecting ou acquisition"),
    action_type: str = Path(..., description="Tipo de ação"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca configuração de pontos por board e tipo de ação.

    - **board_type**: Board da ação (prospecting ou acquisition)
    - **action_type**: Tipo de ação (ex: card_created, card_won)
    """
    repository = GamificationRepository(db)
    action_points = repository.find_action_points(board_type, action_type)
    if not action_points:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuração para '{action_type}' no board '{board_type}' não encontrada"
        )
    return ActionPointsResponse(
        id=action_points.id,
        board_type=action_points.board_type,
        action_type=action_points.action_type,
        points=action_points.points,
        is_active=action_points.is_active,
        description=action_points.description,
        created_at=action_points.created_at,
        updated_at=action_points.updated_at,
    )


@router.post(
    "/action-points",
    response_model=ActionPointsResponse,
    summary="Criar configuração de pontos",
    status_code=201,
    responses={
        201: {
            "description": "Configuração de pontos criada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 9,
                        "action_type": "deal_upsell",
                        "points": 30,
                        "is_active": True,
                        "description": "Pontos concedidos por upsell em negócio existente",
                        "created_at": "2026-02-03T14:00:00",
                        "updated_at": "2026-02-03T14:00:00"
                    }
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {"detail": "Permissão insuficiente. Requer role: admin"}
                }
            }
        }
    }
)
async def create_action_points(
    request: Request,
    action_data: ActionPointsCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria nova configuração de pontos (apenas admin).

    - **action_type**: Tipo de ação (único)
    - **points**: Quantidade de pontos
    - **is_active**: Se a ação está ativa
    - **description**: Descrição da ação
    """
    service = GamificationService(db)
    config = service.create_action_points(action_data, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="POINTS_CONFIG_CREATE",
        entity_type="ActionPoints",
        entity_id=config.id,
        description=f"Configuração de pontos criada: {config.action_type} = {config.points} pts",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return config


@router.put(
    "/action-points/{board_type}/{action_type}",
    response_model=ActionPointsResponse,
    summary="Atualizar configuração de pontos",
    responses={
        200: {
            "description": "Configuração de pontos atualizada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "action_type": "card_won",
                        "points": 25,
                        "is_active": True,
                        "description": "Pontos atualizados para card ganho - novo valor promocional",
                        "created_at": "2026-01-01T10:00:00",
                        "updated_at": "2026-02-03T15:30:00"
                    }
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {"detail": "Permissão insuficiente. Requer role: admin"}
                }
            }
        },
        404: {
            "description": "Configuração não encontrada para o tipo de ação",
            "content": {
                "application/json": {
                    "example": {"detail": "Configuração para ação 'card_archived' não encontrada"}
                }
            }
        }
    }
)
async def update_action_points(
    request: Request,
    board_type: str = Path(..., description="Board da ação: prospecting ou acquisition"),
    action_type: str = Path(..., description="Tipo de ação"),
    action_data: ActionPointsUpdate = Body(..., description="Dados para atualizar"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza configuração de pontos para um par (board_type, action_type) (apenas admin).

    - **board_type**: Board da ação (prospecting ou acquisition)
    - **action_type**: Tipo de ação
    - **points**: Nova quantidade de pontos (opcional)
    - **is_active**: Novo status (opcional)
    - **description**: Nova descrição (opcional)
    """
    service = GamificationService(db)
    config = service.update_action_points(board_type, action_type, action_data, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Constrói descrição com campos alterados
    changed_fields = []
    if action_data.points is not None:
        changed_fields.append(f"pontos={config.points}")
    if action_data.is_active is not None:
        changed_fields.append(f"ativo={config.is_active}")
    if action_data.description is not None:
        changed_fields.append("descrição")

    fields_str = ", ".join(changed_fields) if changed_fields else "dados"

    audit_log = AuditLog(
        user_id=current_user.id,
        action="POINTS_CONFIG_UPDATE",
        entity_type="ActionPoints",
        entity_id=config.id,
        description=f"Configuração de pontos atualizada: {config.action_type} - {fields_str}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return config


@router.post(
    "/action-points/initialize",
    summary="Inicializar configurações padrão",
    status_code=200,
    responses={
        200: {
            "description": "Configurações padrão inicializadas com sucesso",
            "content": {
                "application/json": {
                    "example": {"message": "Configurações inicializadas com sucesso"}
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas administradores",
            "content": {
                "application/json": {
                    "example": {"detail": "Permissão insuficiente. Requer role: admin"}
                }
            }
        }
    }
)
async def initialize_action_points(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de compatibilidade — as configurações padrão são inseridas pela migration.
    Retorna mensagem informativa.
    """
    return {"message": "As configurações padrão são gerenciadas pela migration do banco de dados."}


# ========== HISTÓRICO DE PONTOS ==========

def _build_point_responses(points: list, user_name_map: dict) -> list:
    """
    Constrói lista de GamificationPointResponse com user_name preenchido.
    Recebe um mapa {user_id: user_name} para evitar múltiplas queries ao banco.
    """
    return [
        GamificationPointResponse(
            id=p.id,
            user_id=p.user_id,
            user_name=user_name_map.get(p.user_id),
            board_type=p.board_type,
            points=p.points,
            reason=p.reason,
            description=p.description,
            is_commission=p.is_commission,
            commission_source_user_id=p.commission_source_user_id,
            commission_ratio=p.commission_ratio,
            original_points=p.original_points,
            created_at=p.created_at,
        )
        for p in points
    ]


@router.get(
    "/points/me",
    response_model=GamificationPointListResponse,
    summary="Histórico de pontos do usuário logado",
    responses={
        200: {
            "description": "Histórico de pontos retornado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "points": [
                            {
                                "id": 10,
                                "user_id": 5,
                                "user_name": "João Silva",
                                "points": 20,
                                "reason": "card_won",
                                "description": "Card 'Projeto Alpha' ganho",
                                "created_at": "2026-03-01T14:30:00"
                            }
                        ],
                        "total": 42,
                        "page": 1,
                        "page_size": 20,
                        "total_pages": 3
                    }
                }
            }
        }
    }
)
async def get_my_points_history(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Itens por página"),
    reason: Optional[str] = Query(None, description="Filtrar por tipo de ação (ex: card_moved)"),
    board_type: Optional[str] = Query(None, description="Filtrar por board: prospecting ou acquisition"),
    date_from: Optional[str] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Data final (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Retorna o histórico paginado de pontos do usuário logado,
    ordenado por data decrescente (mais recentes primeiro).
    """
    from datetime import datetime as dt
    df = dt.fromisoformat(date_from) if date_from else None
    dt2 = dt.fromisoformat(date_to).replace(hour=23, minute=59, second=59) if date_to else None

    repo = GamificationRepository(db)
    skip = (page - 1) * page_size
    points = repo.list_user_points(current_user.id, skip, page_size, reason=reason, board_type=board_type, date_from=df, date_to=dt2)
    total = repo.count_user_points(current_user.id, reason=reason, board_type=board_type, date_from=df, date_to=dt2)
    total_pages = max(1, (total + page_size - 1) // page_size)

    user_name_map = {current_user.id: current_user.name}

    return GamificationPointListResponse(
        points=_build_point_responses(points, user_name_map),
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get(
    "/points",
    response_model=GamificationPointListResponse,
    summary="Histórico de pontos de toda a equipe (admin/manager)",
    responses={
        200: {
            "description": "Histórico global de pontos retornado com sucesso"
        },
        403: {
            "description": "Acesso negado - apenas administradores e gerentes"
        }
    }
)
async def get_all_points_history(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Itens por página"),
    reason: Optional[str] = Query(None, description="Filtrar por tipo de ação"),
    filter_user_id: Optional[int] = Query(None, alias="user_id", description="Filtrar por usuário"),
    board_type: Optional[str] = Query(None, description="Filtrar por board: prospecting ou acquisition"),
    date_from: Optional[str] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Data final (YYYY-MM-DD)"),
    current_user: User = Depends(require_manager_or_admin()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Retorna o histórico paginado de pontos de todos os usuários (visão da equipe).
    Apenas administradores e gerentes podem acessar este endpoint.
    """
    from datetime import datetime as dt
    df = dt.fromisoformat(date_from) if date_from else None
    dt2 = dt.fromisoformat(date_to).replace(hour=23, minute=59, second=59) if date_to else None

    repo = GamificationRepository(db)
    skip = (page - 1) * page_size
    points = repo.list_all_points(skip, page_size, reason=reason, user_id=filter_user_id, board_type=board_type, date_from=df, date_to=dt2)
    total = repo.count_all_points(reason=reason, user_id=filter_user_id, board_type=board_type, date_from=df, date_to=dt2)
    total_pages = max(1, (total + page_size - 1) // page_size)

    user_ids = list({p.user_id for p in points})
    users = db.query(User.id, User.name).filter(User.id.in_(user_ids)).all()
    user_name_map = {u.id: u.name for u in users}

    return GamificationPointListResponse(
        points=_build_point_responses(points, user_name_map),
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get(
    "/points/users/{user_id}",
    response_model=GamificationPointListResponse,
    summary="Histórico de pontos de um usuário específico (admin/manager)",
    responses={
        200: {
            "description": "Histórico de pontos retornado com sucesso"
        },
        403: {
            "description": "Acesso negado - apenas administradores e gerentes",
            "content": {
                "application/json": {
                    "example": {"detail": "Permissão insuficiente. Requer role: admin"}
                }
            }
        }
    }
)
async def get_user_points_history(
    user_id: int = Path(..., description="ID do usuário"),
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Itens por página"),
    reason: Optional[str] = Query(None, description="Filtrar por tipo de ação"),
    date_from: Optional[str] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Data final (YYYY-MM-DD)"),
    current_user: User = Depends(require_manager_or_admin()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Retorna o histórico paginado de pontos de um usuário específico.
    Apenas administradores e gerentes podem acessar este endpoint.
    """
    from datetime import datetime as dt
    df = dt.fromisoformat(date_from) if date_from else None
    dt2 = dt.fromisoformat(date_to).replace(hour=23, minute=59, second=59) if date_to else None

    repo = GamificationRepository(db)
    skip = (page - 1) * page_size
    points = repo.list_user_points(user_id, skip, page_size, reason=reason, date_from=df, date_to=dt2)
    total = repo.count_user_points(user_id, reason=reason, date_from=df, date_to=dt2)
    total_pages = max(1, (total + page_size - 1) // page_size)

    target_user = db.query(User.id, User.name).filter(User.id == user_id).first()
    user_name_map = {user_id: target_user.name} if target_user else {}

    return GamificationPointListResponse(
        points=_build_point_responses(points, user_name_map),
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
