"""
Endpoints de Gamificação.
Rotas para pontos, badges e rankings.
"""
from typing import Any, List
from fastapi import APIRouter, Depends, Query, Path, Body
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, require_role
from app.services.gamification_service import GamificationService
from app.schemas.gamification import (
    GamificationPointResponse,
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
    return service.get_user_summary(current_user.id)


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
    return service.get_user_summary(user_id)


# ========== PONTOS ==========

@router.post("/points", response_model=GamificationPointResponse, summary="Atribuir pontos", status_code=201)
async def award_points(
    user_id: int = Body(..., description="ID do usuário"),
    reason: str = Body(..., description="Tipo de ação"),
    description: str = Body(None, description="Descrição da ação"),
    custom_points: int = Body(None, description="Pontos customizados"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atribui pontos a um usuário por uma ação.

    - **user_id**: ID do usuário que receberá os pontos
    - **reason**: Tipo de ação (card_created, card_won, etc.)
    - **description**: Descrição da ação (opcional)
    - **custom_points**: Pontos customizados (opcional, sobrescreve padrão)
    """
    service = GamificationService(db)
    return service.award_points(user_id, reason, description, custom_points)


# ========== BADGES ==========

@router.get("/badges", response_model=List[BadgeResponse], summary="Listar badges")
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


@router.post("/badges", response_model=BadgeResponse, summary="Criar badge", status_code=201)
async def create_badge(
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
    return service.create_badge(badge_data, current_user)


@router.post("/badges/{badge_id}/award", response_model=UserBadgeResponse, summary="Atribuir badge a usuário", status_code=200)
async def award_badge(
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
    return service.get_user_badges(current_user.id)


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
    return service.get_user_badges(user_id)


@router.get("/badges/{badge_id}", response_model=BadgeResponse, summary="Buscar badge por ID")
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


@router.put("/badges/{badge_id}", response_model=BadgeResponse, summary="Atualizar badge")
async def update_badge(
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
    return service.update_badge(badge_id, badge_data, current_user)


@router.delete("/badges/{badge_id}", summary="Deletar badge", status_code=200)
async def delete_badge(
    badge_id: int = Path(..., description="ID do badge"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta um badge (soft delete - apenas admin).

    - **badge_id**: ID do badge
    """
    service = GamificationService(db)
    return service.delete_badge(badge_id, current_user)


# ========== RANKINGS ==========

@router.get("/rankings", response_model=RankingListResponse, summary="Listar rankings")
async def get_rankings(
    period_type: str = Query("weekly", description="Tipo de período: weekly, monthly, quarterly, annual"),
    limit: int = Query(100, ge=1, le=500, description="Limite de resultados"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista rankings do sistema para um período específico.

    - **period_type**: Tipo de período (weekly, monthly, quarterly, annual)
    - **limit**: Limite de resultados (padrão: 100, máx: 500)

    Retorna:
    - Lista de rankings ordenados por posição
    - Informações do período (início e fim)
    """
    service = GamificationService(db)
    return service.get_rankings(period_type, limit)


@router.post("/rankings/calculate", response_model=RankingListResponse, summary="Recalcular rankings")
async def calculate_rankings(
    period_type: str = Body(..., embed=True, description="Tipo de período: weekly, monthly, quarterly, annual"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Força recalcular rankings para um período.

    - **period_type**: Tipo de período (weekly, monthly, quarterly, annual)

    Útil para atualizar rankings em tempo real.
    """
    service = GamificationService(db)
    return service.calculate_rankings(period_type)


# ========== ACTION POINTS CONFIGURATION ==========

@router.get("/action-points", response_model=List[ActionPointsResponse], summary="Listar configurações de pontos")
async def list_action_points(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todas as configurações de pontos por ação.

    Retorna lista com action_type, points, is_active e description.
    """
    service = GamificationService(db)
    return service.list_action_points()


@router.get("/action-points/{action_type}", response_model=ActionPointsResponse, summary="Buscar configuração de pontos")
async def get_action_points(
    action_type: str = Path(..., description="Tipo de ação"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca configuração de pontos por tipo de ação.

    - **action_type**: Tipo de ação (ex: card_created, card_won)
    """
    service = GamificationService(db)
    action_points = service.get_action_points_by_type(action_type)
    if not action_points:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuração para ação '{action_type}' não encontrada"
        )
    return action_points


@router.post("/action-points", response_model=ActionPointsResponse, summary="Criar configuração de pontos", status_code=201)
async def create_action_points(
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
    return service.create_action_points(action_data, current_user)


@router.put("/action-points/{action_type}", response_model=ActionPointsResponse, summary="Atualizar configuração de pontos")
async def update_action_points(
    action_type: str = Path(..., description="Tipo de ação"),
    action_data: ActionPointsUpdate = Body(..., description="Dados para atualizar"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza configuração de pontos (apenas admin).

    - **action_type**: Tipo de ação
    - **points**: Nova quantidade de pontos (opcional)
    - **is_active**: Novo status (opcional)
    - **description**: Nova descrição (opcional)
    """
    service = GamificationService(db)
    return service.update_action_points(action_type, action_data, current_user)


@router.post("/action-points/initialize", summary="Inicializar configurações padrão", status_code=200)
async def initialize_action_points(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Inicializa configurações padrão de pontos se não existirem (apenas admin).

    Cria configurações para: card_created, card_won, card_moved, etc.
    """
    service = GamificationService(db)
    service.initialize_default_action_points()
    return {"message": "Configurações inicializadas com sucesso"}
