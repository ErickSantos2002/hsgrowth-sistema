"""
Endpoints de Gamificação.
Rotas para pontos, badges e rankings.
"""
from typing import Any, List
from fastapi import APIRouter, Depends, Query, Path, Body
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.gamification_service import GamificationService
from app.schemas.gamification import (
    GamificationPointResponse,
    BadgeCreate,
    BadgeUpdate,
    BadgeResponse,
    UserBadgeResponse,
    RankingListResponse,
    UserGamificationSummary
)
from app.models.user import User

router = APIRouter()


# ========== RESUMO DO USUÁRIO ==========

@router.get("/me", response_model=UserGamificationSummary, summary="Resumo de gamificação do usuário")
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
    return service.get_user_summary(current_user.id, current_user.account_id)


@router.get("/users/{user_id}", response_model=UserGamificationSummary, summary="Resumo de gamificação de um usuário")
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
    return service.get_user_summary(user_id, current_user.account_id)


# ========== PONTOS ==========

@router.post("/points", response_model=GamificationPointResponse, summary="Atribuir pontos", status_code=201)
async def award_points(
    user_id: int = Body(..., description="ID do usuário"),
    action_type: str = Body(..., description="Tipo de ação"),
    description: str = Body(None, description="Descrição da ação"),
    custom_points: int = Body(None, description="Pontos customizados"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atribui pontos a um usuário por uma ação.

    - **user_id**: ID do usuário que receberá os pontos
    - **action_type**: Tipo de ação (card_created, card_won, etc.)
    - **description**: Descrição da ação (opcional)
    - **custom_points**: Pontos customizados (opcional, sobrescreve padrão)
    """
    service = GamificationService(db)
    return service.award_points(user_id, action_type, description, custom_points)


# ========== BADGES ==========

@router.get("/badges", response_model=List[BadgeResponse], summary="Listar badges")
async def list_badges(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todos os badges disponíveis na conta.

    - **page**: Número da página
    - **page_size**: Tamanho da página
    """
    service = GamificationService(db)
    return service.list_badges(current_user.account_id, page, page_size)


@router.post("/badges", response_model=BadgeResponse, summary="Criar badge", status_code=201)
async def create_badge(
    badge_data: BadgeCreate,
    current_user: User = Depends(get_current_active_user),
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
    return service.create_badge(badge_data, current_user)


@router.post("/badges/{badge_id}/award", response_model=UserBadgeResponse, summary="Atribuir badge a usuário", status_code=201)
async def award_badge(
    badge_id: int = Path(..., description="ID do badge"),
    user_id: int = Body(..., description="ID do usuário"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atribui um badge manualmente a um usuário.

    - **badge_id**: ID do badge
    - **user_id**: ID do usuário que receberá o badge
    """
    service = GamificationService(db)
    return service.award_badge_to_user(user_id, badge_id, current_user)


@router.get("/badges/me", response_model=List[UserBadgeResponse], summary="Meus badges")
async def get_my_badges(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista badges conquistados pelo usuário autenticado.
    """
    service = GamificationService(db)
    return service.get_user_badges(current_user.id, current_user.account_id)


@router.get("/badges/users/{user_id}", response_model=List[UserBadgeResponse], summary="Badges de um usuário")
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
    return service.get_user_badges(user_id, current_user.account_id)


# ========== RANKINGS ==========

@router.get("/rankings", response_model=RankingListResponse, summary="Listar rankings")
async def get_rankings(
    period_type: str = Query("weekly", description="Tipo de período: weekly, monthly, quarterly, annual"),
    limit: int = Query(100, ge=1, le=500, description="Limite de resultados"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista rankings da conta para um período específico.

    - **period_type**: Tipo de período (weekly, monthly, quarterly, annual)
    - **limit**: Limite de resultados (padrão: 100, máx: 500)

    Retorna:
    - Lista de rankings ordenados por posição
    - Informações do período (início e fim)
    """
    service = GamificationService(db)
    return service.get_rankings(current_user.account_id, period_type, limit)


@router.post("/rankings/calculate", response_model=RankingListResponse, summary="Recalcular rankings")
async def calculate_rankings(
    period_type: str = Body(..., description="Tipo de período: weekly, monthly, quarterly, annual"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Força recalcular rankings para um período.

    - **period_type**: Tipo de período (weekly, monthly, quarterly, annual)

    Útil para atualizar rankings em tempo real.
    """
    service = GamificationService(db)
    return service.calculate_rankings(current_user.account_id, period_type)
