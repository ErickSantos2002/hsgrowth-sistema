"""
Schemas de Gamificação.
Define estruturas de dados para pontos, badges e rankings.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from decimal import Decimal


# ========== GAMIFICATION POINT SCHEMAS ==========

class GamificationPointBase(BaseModel):
    """Schema base para pontos de gamificação."""
    points: int = Field(..., description="Quantidade de pontos")
    reason: str = Field(..., description="Tipo de ação que gerou os pontos")
    description: Optional[str] = Field(None, description="Descrição da ação")


class GamificationPointCreate(GamificationPointBase):
    """Schema para criar pontos de gamificação."""
    user_id: int = Field(..., description="ID do usuário que receberá os pontos")


class GamificationPointResponse(GamificationPointBase):
    """Schema de resposta para pontos de gamificação."""
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========== BADGE SCHEMAS ==========

class BadgeBase(BaseModel):
    """Schema base para badges."""
    name: str = Field(..., max_length=100, description="Nome do badge")
    description: Optional[str] = Field(None, description="Descrição do badge")
    icon_url: Optional[str] = Field(None, description="URL do ícone ou imagem do badge")
    criteria_type: str = Field(..., description="Tipo de critério (manual, automatic)")
    criteria: Optional[dict] = Field(None, description="Critérios JSON para badges automáticos")


class BadgeCreate(BadgeBase):
    """Schema para criar badge."""
    pass


class BadgeUpdate(BaseModel):
    """Schema para atualizar badge."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    icon_url: Optional[str] = None
    criteria_type: Optional[str] = None
    criteria: Optional[dict] = None


class BadgeResponse(BadgeBase):
    """Schema de resposta para badge."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========== USER BADGE SCHEMAS ==========

class UserBadgeBase(BaseModel):
    """Schema base para badge de usuário."""
    pass


class UserBadgeCreate(BaseModel):
    """Schema para atribuir badge a usuário."""
    badge_id: int = Field(..., description="ID do badge")
    user_id: int = Field(..., description="ID do usuário")


class UserBadgeResponse(UserBadgeBase):
    """Schema de resposta para badge de usuário."""
    id: int
    user_id: int
    badge_id: int
    awarded_at: datetime
    awarded_by_id: Optional[int]
    badge_name: Optional[str] = None
    badge_description: Optional[str] = None
    badge_icon: Optional[str] = None

    class Config:
        from_attributes = True


# ========== RANKING SCHEMAS ==========

class RankingBase(BaseModel):
    """Schema base para ranking."""
    period_type: str = Field(..., description="Tipo de período: weekly, monthly, quarterly, annual")
    period_start: datetime = Field(..., description="Início do período")
    period_end: datetime = Field(..., description="Fim do período")


class RankingResponse(RankingBase):
    """Schema de resposta para ranking."""
    id: int
    user_id: int
    total_points: int
    rank_position: int
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class RankingListResponse(BaseModel):
    """Schema de resposta para lista de rankings."""
    rankings: List[RankingResponse]
    period_type: str
    period_start: datetime
    period_end: datetime


# ========== USER GAMIFICATION SUMMARY ==========

class UserGamificationSummary(BaseModel):
    """Schema para resumo de gamificação do usuário."""
    user_id: int
    user_name: str
    total_points: int = Field(..., description="Total de pontos acumulados")
    badges: List[UserBadgeResponse] = Field(default_factory=list, description="Badges conquistados")
    current_week_points: int = Field(0, description="Pontos da semana atual")
    current_month_points: int = Field(0, description="Pontos do mês atual")
    weekly_rank: Optional[int] = Field(None, description="Posição no ranking semanal")
    monthly_rank: Optional[int] = Field(None, description="Posição no ranking mensal")
    quarterly_rank: Optional[int] = Field(None, description="Posição no ranking trimestral")
    annual_rank: Optional[int] = Field(None, description="Posição no ranking anual")


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
