"""
Schemas de Gamificação.
Define estruturas de dados para pontos, badges e rankings.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal


# ========== GAMIFICATION POINT SCHEMAS ==========

class GamificationPointBase(BaseModel):
    """Schema base para pontos de gamificação."""
    points: int = Field(..., description="Quantidade de pontos")
    reason: str = Field(..., description="Tipo de ação que gerou os pontos (ex: card_won, task_completed)")
    description: Optional[str] = Field(None, description="Descrição detalhada da ação")


class GamificationPointCreate(GamificationPointBase):
    """Cria uma entrada de pontos de gamificação para um usuário."""
    user_id: int = Field(..., description="ID do usuário que receberá os pontos")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": 5,
                "points": 20,
                "reason": "card_won",
                "description": "Card 'Projeto Alpha' ganho - valor R$ 50.000"
            }
        }
    )


class GamificationPointResponse(GamificationPointBase):
    """Dados de uma entrada de pontos de gamificação."""
    id: int = Field(..., description="ID único do registro de pontos")
    user_id: int = Field(..., description="ID do usuário")
    user_name: Optional[str] = Field(None, description="Nome do usuário que ganhou os pontos")
    created_at: datetime = Field(..., description="Data e hora do registro")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "user_id": 5,
                "user_name": "João Silva",
                "points": 20,
                "reason": "card_won",
                "description": "Card 'Projeto Alpha' ganho - valor R$ 50.000",
                "created_at": "2026-01-15T10:00:00"
            }
        }
    )


class GamificationPointListResponse(BaseModel):
    """Resposta paginada do histórico de pontos de gamificação."""
    points: List[GamificationPointResponse] = Field(..., description="Lista de registros de pontos")
    total: int = Field(..., description="Total de registros")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Itens por página")
    total_pages: int = Field(..., description="Total de páginas")


# ========== BADGE SCHEMAS ==========

class BadgeBase(BaseModel):
    """Schema base para badges."""
    name: str = Field(..., max_length=100, description="Nome do badge (ex: 'Vendedor do Mês')")
    description: Optional[str] = Field(None, description="Descrição do badge e como conquistá-lo")
    icon_url: Optional[str] = Field(None, description="URL do ícone ou imagem do badge")
    criteria_type: str = Field(..., description="Tipo de critério: manual (atribuído manualmente) ou automatic (baseado em regras)")
    criteria: Optional[dict] = Field(None, description="Critérios JSON para badges automáticos (ex: {\"min_points\": 100})")


class BadgeCreate(BadgeBase):
    """Cria um novo badge no sistema."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Vendedor do Mês",
                "description": "Concedido ao vendedor com mais pontos no mês",
                "icon_url": "/badges/top-seller.png",
                "criteria_type": "manual",
                "criteria": None
            }
        }
    )


class BadgeUpdate(BaseModel):
    """Atualiza um badge existente. Apenas campos fornecidos serão alterados."""
    name: Optional[str] = Field(None, max_length=100, description="Nome do badge")
    description: Optional[str] = Field(None, description="Descrição do badge")
    icon_url: Optional[str] = Field(None, description="URL do ícone")
    criteria_type: Optional[str] = Field(None, description="Tipo de critério")
    criteria: Optional[dict] = Field(None, description="Critérios JSON")
    is_active: Optional[bool] = Field(None, description="Se o badge está ativo")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Top Vendedor Q1",
                "description": "Melhor vendedor do primeiro trimestre",
                "is_active": True
            }
        }
    )


class BadgeResponse(BadgeBase):
    """Dados completos de um badge."""
    id: int = Field(..., description="ID único do badge")
    is_active: bool = Field(True, description="Se o badge está ativo")
    created_at: datetime = Field(..., description="Data de criação")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
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
    )


# ========== USER BADGE SCHEMAS ==========

class UserBadgeBase(BaseModel):
    """Schema base para badge de usuário."""
    pass


class UserBadgeCreate(BaseModel):
    """Atribui um badge a um usuário."""
    badge_id: int = Field(..., description="ID do badge a ser atribuído")
    user_id: int = Field(..., description="ID do usuário que receberá o badge")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "badge_id": 1,
                "user_id": 5
            }
        }
    )


class UserBadgeResponse(UserBadgeBase):
    """Dados de um badge atribuído a um usuário."""
    id: int = Field(..., description="ID único da atribuição")
    user_id: int = Field(..., description="ID do usuário")
    badge_id: int = Field(..., description="ID do badge")
    awarded_at: datetime = Field(..., description="Data e hora da atribuição")
    awarded_by_id: Optional[int] = Field(None, description="ID do admin que atribuiu")
    badge_name: Optional[str] = Field(None, description="Nome do badge")
    badge_description: Optional[str] = Field(None, description="Descrição do badge")
    badge_icon: Optional[str] = Field(None, description="URL do ícone do badge")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "user_id": 5,
                "badge_id": 1,
                "awarded_at": "2026-01-31T18:00:00",
                "awarded_by_id": 1,
                "badge_name": "Vendedor do Mês",
                "badge_description": "Concedido ao vendedor com mais pontos no mês",
                "badge_icon": "/badges/top-seller.png"
            }
        }
    )


# ========== RANKING SCHEMAS ==========

class RankingBase(BaseModel):
    """Schema base para ranking."""
    period_type: str = Field(..., description="Tipo de período: weekly, monthly, quarterly, annual")
    period_start: datetime = Field(..., description="Início do período")
    period_end: datetime = Field(..., description="Fim do período")


class RankingResponse(RankingBase):
    """Dados de uma posição no ranking."""
    id: int = Field(..., description="ID único do registro")
    user_id: int = Field(..., description="ID do usuário")
    total_points: int = Field(..., description="Total de pontos no período")
    rank_position: int = Field(..., description="Posição no ranking")
    user_name: Optional[str] = Field(None, description="Nome do usuário")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "user_id": 5,
                "total_points": 245,
                "rank_position": 1,
                "period_type": "monthly",
                "period_start": "2026-01-01T00:00:00",
                "period_end": "2026-01-31T23:59:59",
                "user_name": "João Silva"
            }
        }
    )


class RankingListResponse(BaseModel):
    """Lista de posições do ranking de um período."""
    rankings: List[RankingResponse] = Field(..., description="Lista de posições do ranking")
    period_type: str = Field(..., description="Tipo de período")
    period_start: datetime = Field(..., description="Início do período")
    period_end: datetime = Field(..., description="Fim do período")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "rankings": [
                    {
                        "id": 1,
                        "user_id": 5,
                        "total_points": 245,
                        "rank_position": 1,
                        "user_name": "João Silva"
                    },
                    {
                        "id": 2,
                        "user_id": 3,
                        "total_points": 198,
                        "rank_position": 2,
                        "user_name": "Maria Santos"
                    }
                ],
                "period_type": "monthly",
                "period_start": "2026-01-01T00:00:00",
                "period_end": "2026-01-31T23:59:59"
            }
        }
    )


# ========== USER GAMIFICATION SUMMARY ==========

class UserGamificationSummary(BaseModel):
    """Resumo completo de gamificação de um usuário."""
    user_id: int = Field(..., description="ID do usuário")
    user_name: str = Field(..., description="Nome do usuário")
    total_points: int = Field(..., description="Total de pontos acumulados desde o início")
    badges: List[UserBadgeResponse] = Field(default_factory=list, description="Lista de badges conquistados")
    current_week_points: int = Field(0, description="Pontos acumulados na semana atual")
    current_month_points: int = Field(0, description="Pontos acumulados no mês atual")
    weekly_rank: Optional[int] = Field(None, description="Posição no ranking semanal")
    monthly_rank: Optional[int] = Field(None, description="Posição no ranking mensal")
    quarterly_rank: Optional[int] = Field(None, description="Posição no ranking trimestral")
    annual_rank: Optional[int] = Field(None, description="Posição no ranking anual")

    model_config = ConfigDict(
        json_schema_extra={
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
    )


# ========== ACTION TYPES CONSTANTS ==========

class ActionType:
    """Constantes para tipos de ação."""
    CARD_CREATED = "card_created"
    CARD_WON = "card_won"
    CARD_MOVED = "card_moved"
    BOARD_CREATED = "board_created"
    USER_INVITED = "user_invited"
    TASK_COMPLETED = "task_completed"
    FIRST_LOGIN = "first_login"
    DAILY_LOGIN = "daily_login"


# Mapeamento de pontos por ação (pode ser configurável no futuro)
ACTION_POINTS = {
    ActionType.CARD_CREATED: 5,
    ActionType.CARD_WON: 20,
    ActionType.CARD_MOVED: 2,
    ActionType.BOARD_CREATED: 10,
    ActionType.USER_INVITED: 15,
    ActionType.TASK_COMPLETED: 10,
    ActionType.FIRST_LOGIN: 10,
    ActionType.DAILY_LOGIN: 3,
}


# ========== ACTION POINTS CONFIGURATION SCHEMAS ==========

class ActionPointsBase(BaseModel):
    """Schema base para configuração de pontos por ação."""
    action_type: str = Field(..., description="Tipo de ação (ex: card_won, task_completed)")
    points: int = Field(..., description="Quantidade de pontos (pode ser negativo para penalidades)")
    is_active: bool = Field(True, description="Se a ação está ativa para pontuar")
    description: Optional[str] = Field(None, description="Descrição da ação e quando ela é disparada")


class ActionPointsCreate(ActionPointsBase):
    """Cria uma configuração de pontos para um tipo de ação."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "action_type": "card_won",
                "points": 20,
                "is_active": True,
                "description": "Pontos concedidos quando um card é marcado como ganho"
            }
        }
    )


class ActionPointsUpdate(BaseModel):
    """Atualiza configuração de pontos. Apenas campos fornecidos serão alterados."""
    points: Optional[int] = Field(None, description="Nova quantidade de pontos (pode ser negativo)")
    is_active: Optional[bool] = Field(None, description="Se a ação está ativa")
    description: Optional[str] = Field(None, description="Nova descrição")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "points": 25,
                "description": "Pontos atualizados para card_won"
            }
        }
    )


class ActionPointsResponse(ActionPointsBase):
    """Dados de uma configuração de pontos por ação."""
    id: int = Field(..., description="ID único da configuração")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data da última atualização")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
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
    )
