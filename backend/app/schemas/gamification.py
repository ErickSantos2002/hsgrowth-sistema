"""
Schemas de Gamificação.
Define estruturas de dados para pontos, badges e rankings.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# ========== GAMIFICATION POINT SCHEMAS ==========

class GamificationPointCreate(BaseModel):
    """Cria uma entrada de pontos de gamificação para um usuário."""
    user_id: int = Field(..., description="ID do usuário que receberá os pontos")
    board_type: Optional[str] = Field(None, description="Board onde os pontos foram ganhos (prospecting/acquisition)")
    points: int = Field(..., description="Quantidade de pontos (negativo = penalidade)")
    reason: str = Field(..., description="Tipo de ação que gerou os pontos")
    description: Optional[str] = Field(None, description="Descrição detalhada da ação")
    is_commission: bool = Field(False, description="Se é ponto de comissão (split)")
    commission_source_user_id: Optional[int] = Field(None, description="Usuário que gerou a ação original")
    commission_ratio: Optional[str] = Field(None, description="Fração recebida (ex: '1/3', '1/4')")
    original_points: Optional[int] = Field(None, description="Pontos totais antes do split")
    related_entity_type: Optional[str] = Field(None, description="Tipo da entidade relacionada")
    related_entity_id: Optional[int] = Field(None, description="ID da entidade relacionada")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": 5,
                "board_type": "acquisition",
                "points": 100,
                "reason": "card_won",
                "description": "Card 'Projeto Alpha' ganho"
            }
        }
    )


class GamificationPointResponse(BaseModel):
    """Dados de uma entrada de pontos de gamificação."""
    id: int = Field(..., description="ID único do registro")
    user_id: int = Field(..., description="ID do usuário")
    user_name: Optional[str] = Field(None, description="Nome do usuário")
    board_type: Optional[str] = Field(None, description="Board onde os pontos foram ganhos")
    points: int = Field(..., description="Quantidade de pontos")
    reason: str = Field(..., description="Tipo de ação")
    description: Optional[str] = Field(None, description="Descrição detalhada")
    is_commission: bool = Field(False, description="Se é ponto de comissão")
    commission_source_user_id: Optional[int] = Field(None)
    commission_ratio: Optional[str] = Field(None)
    original_points: Optional[int] = Field(None)
    created_at: datetime = Field(..., description="Data e hora do registro")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "user_id": 5,
                "user_name": "João Silva",
                "board_type": "acquisition",
                "points": 100,
                "reason": "card_won",
                "description": "Card 'Projeto Alpha' ganho",
                "is_commission": False,
                "created_at": "2026-01-15T10:00:00"
            }
        }
    )


class GamificationPointListResponse(BaseModel):
    """Resposta paginada do histórico de pontos."""
    points: List[GamificationPointResponse] = Field(..., description="Lista de registros de pontos")
    total: int = Field(..., description="Total de registros")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Itens por página")
    total_pages: int = Field(..., description="Total de páginas")


# ========== BADGE SCHEMAS ==========

class BadgeBase(BaseModel):
    """Schema base para badges."""
    name: str = Field(..., max_length=100, description="Nome do badge")
    description: Optional[str] = Field(None, description="Descrição do badge e como conquistá-lo")
    icon_url: Optional[str] = Field(None, description="URL do ícone ou imagem do badge")
    criteria_type: str = Field(..., description="Tipo de critério: manual ou automatic")
    criteria: Optional[dict] = Field(None, description="Critérios JSON para badges automáticos")


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
    deleted_at: Optional[datetime] = Field(None, description="Data de exclusão (soft delete)")
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
                "deleted_at": None,
                "created_at": "2026-01-01T10:00:00"
            }
        }
    )


# ========== USER BADGE SCHEMAS ==========

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


class UserBadgeResponse(BaseModel):
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

class RankingResponse(BaseModel):
    """Dados de uma posição no ranking."""
    id: int = Field(..., description="ID único do registro")
    user_id: int = Field(..., description="ID do usuário")
    board_type: str = Field(..., description="Board do ranking (prospecting/acquisition)")
    period_type: str = Field(..., description="Tipo de período: weekly, monthly, quarterly, annual")
    period_start: datetime = Field(..., description="Início do período")
    period_end: datetime = Field(..., description="Fim do período")
    total_points: int = Field(..., description="Total de pontos no período")
    rank_position: int = Field(..., description="Posição no ranking")
    user_name: Optional[str] = Field(None, description="Nome do usuário")
    user_role: Optional[str] = Field(None, description="Role do usuário (salesperson/sdr)")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "user_id": 5,
                "board_type": "acquisition",
                "total_points": 245,
                "rank_position": 1,
                "period_type": "monthly",
                "period_start": "2026-01-01T00:00:00",
                "period_end": "2026-01-31T23:59:59",
                "user_name": "João Silva",
                "user_role": "salesperson"
            }
        }
    )


class RankingListResponse(BaseModel):
    """Lista de posições do ranking de um período e board."""
    rankings: List[RankingResponse] = Field(..., description="Lista de posições do ranking")
    board_type: str = Field(..., description="Board do ranking")
    period_type: str = Field(..., description="Tipo de período")
    period_start: datetime = Field(..., description="Início do período")
    period_end: datetime = Field(..., description="Fim do período")
    last_calculated_at: Optional[datetime] = Field(None, description="Quando o ranking foi calculado")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "rankings": [],
                "board_type": "acquisition",
                "period_type": "monthly",
                "period_start": "2026-01-01T00:00:00",
                "period_end": "2026-01-31T23:59:59",
                "last_calculated_at": "2026-01-15T10:00:00"
            }
        }
    )


# ========== USER GAMIFICATION SUMMARY ==========

class BoardPointsSummary(BaseModel):
    """Resumo de pontos de um usuário em um board específico."""
    board_type: str = Field(..., description="Board (prospecting/acquisition)")
    total_points: int = Field(0, description="Total de pontos acumulados no board")
    week_points: int = Field(0, description="Pontos na semana atual")
    month_points: int = Field(0, description="Pontos no mês atual")
    weekly_rank: Optional[int] = Field(None, description="Posição no ranking semanal")
    monthly_rank: Optional[int] = Field(None, description="Posição no ranking mensal")
    quarterly_rank: Optional[int] = Field(None, description="Posição no ranking trimestral")
    annual_rank: Optional[int] = Field(None, description="Posição no ranking anual")


class UserGamificationSummary(BaseModel):
    """Resumo completo de gamificação de um usuário."""
    user_id: int = Field(..., description="ID do usuário")
    user_name: str = Field(..., description="Nome do usuário")
    user_role: Optional[str] = Field(None, description="Role do usuário")
    total_points: int = Field(0, description="Total de pontos acumulados (todos os boards)")
    badges: List[UserBadgeResponse] = Field(default_factory=list, description="Lista de badges conquistados")
    prospecting: BoardPointsSummary = Field(..., description="Dados do board Prospecção")
    acquisition: BoardPointsSummary = Field(..., description="Dados do board Aquisição")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": 5,
                "user_name": "João Silva",
                "user_role": "salesperson",
                "total_points": 1250,
                "badges": [],
                "prospecting": {
                    "board_type": "prospecting",
                    "total_points": 150,
                    "week_points": 20,
                    "month_points": 80,
                    "weekly_rank": 2,
                    "monthly_rank": 1
                },
                "acquisition": {
                    "board_type": "acquisition",
                    "total_points": 1100,
                    "week_points": 200,
                    "month_points": 450,
                    "weekly_rank": 1,
                    "monthly_rank": 1
                }
            }
        }
    )


# ========== ACTION POINTS CONFIGURATION SCHEMAS ==========

class ActionPointsBase(BaseModel):
    """Schema base para configuração de pontos por ação."""
    board_type: str = Field(..., description="Board ao qual esta configuração pertence (prospecting/acquisition)")
    action_type: str = Field(..., description="Tipo de ação (ex: card_won, meeting_completed)")
    points: int = Field(..., description="Quantidade de pontos (negativo = penalidade)")
    is_active: bool = Field(True, description="Se a ação está ativa para pontuar")
    description: Optional[str] = Field(None, description="Descrição da ação e quando ela é disparada")


class ActionPointsCreate(ActionPointsBase):
    """Cria uma configuração de pontos para um tipo de ação em um board."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "board_type": "acquisition",
                "action_type": "card_won",
                "points": 100,
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
                "points": 120,
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
                "board_type": "acquisition",
                "action_type": "card_won",
                "points": 100,
                "is_active": True,
                "description": "Pontos concedidos quando um card é marcado como ganho",
                "created_at": "2026-01-01T10:00:00",
                "updated_at": "2026-01-01T10:00:00"
            }
        }
    )


# ========== ACTION TYPE CONSTANTS ==========

class ActionType:
    """Constantes para tipos de ação de gamificação."""

    # Board Prospecção
    MEETING_CREATED = "meeting_created"      # Reunião agendada
    CARD_CREATED = "card_created"            # Card criado
    CARD_MOVED = "card_moved"                # Card movido entre etapas
    CALL_COMPLETED = "call_completed"        # Ligação realizada
    FOLLOWUP_COMPLETED = "followup_completed"  # Follow-up realizado
    TASK_COMPLETED = "task_completed"        # Tarefa genérica concluída

    # Board Aquisição
    CARD_WON = "card_won"                    # Card ganho (won)
    CARD_LOST = "card_lost"                  # Card perdido (lost) — penalidade
    MEETING_COMPLETED = "meeting_completed"  # Reunião realizada
    PROPOSAL_ATTACHED = "proposal_attached"  # Primeira proposta anexada
