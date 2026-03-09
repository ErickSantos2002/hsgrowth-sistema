"""
Schemas de Automação.
Define estruturas de dados para automações trigger e scheduled.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from enum import Enum


# ========== ENUMS ==========

class AutomationType(str, Enum):
    """Tipo de automação."""
    TRIGGER = "trigger"
    SCHEDULED = "scheduled"


class TriggerEvent(str, Enum):
    """Eventos que podem disparar automações."""
    CARD_CREATED = "card_created"
    CARD_UPDATED = "card_updated"
    CARD_MOVED = "card_moved"
    CARD_WON = "card_won"
    CARD_LOST = "card_lost"
    CARD_ASSIGNED = "card_assigned"
    FIELD_CHANGED = "field_changed"
    MANUAL = "manual"  # Automação disparada manualmente pelo usuário


class ScheduleType(str, Enum):
    """Tipo de agendamento."""
    ONCE = "once"
    RECURRENT = "recurrent"


class RecurrencePattern(str, Enum):
    """Padrão de recorrência."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ANNUAL = "annual"


class ActionType(str, Enum):
    """Tipos de ação que uma automação pode executar."""
    MOVE_CARD = "move_card"
    ASSIGN_CARD = "assign_card"
    ASSIGN_ROUND_ROBIN = "assign_round_robin"
    ASSIGN_SDR_ROUND_ROBIN = "assign_sdr_round_robin"  # Rodízio de SDRs
    UPDATE_FIELD = "update_field"
    UPDATE_CLIENT_FIELD = "update_client_field"  # Atualiza campos do cliente vinculado ao card
    SEND_NOTIFICATION = "send_notification"
    AWARD_POINTS = "award_points"
    MARK_WON = "mark_won"
    MARK_LOST = "mark_lost"
    SEND_WEBHOOK = "send_webhook"  # Dispara requisição HTTP POST para URL externa


class ExecutionStatus(str, Enum):
    """Status de execução."""
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


# ========== ACTION SCHEMAS ==========

class AutomationAction(BaseModel):
    """Ação que será executada pela automação."""
    type: ActionType = Field(..., description="Tipo de ação a executar")
    params: Dict[str, Any] = Field(default_factory=dict, description="Parâmetros da ação (variam por tipo)")

    model_config = ConfigDict(
        use_enum_values=True,
        json_schema_extra={
            "example": {
                "type": "move_card",
                "params": {"target_list_id": 3}
            }
        }
    )


# ========== AUTOMATION SCHEMAS ==========

class AutomationBase(BaseModel):
    """Schema base para automação."""
    name: str = Field(..., max_length=255, description="Nome da automação")
    description: Optional[str] = Field(None, description="Descrição do que a automação faz")
    automation_type: AutomationType = Field(..., description="Tipo: trigger (evento) ou scheduled (agendada)")
    is_active: bool = Field(True, description="Se a automação está ativa")
    priority: int = Field(50, ge=1, le=100, description="Prioridade de execução (1=baixa, 100=alta)")


class AutomationTriggerConfig(BaseModel):
    """Configuração de automação do tipo trigger (baseada em eventos)."""
    trigger_event: TriggerEvent = Field(..., description="Evento que dispara a automação")
    trigger_conditions: Optional[Dict[str, Any]] = Field(None, description="Condições adicionais para disparo")


class AutomationScheduledConfig(BaseModel):
    """Configuração de automação do tipo scheduled (agendada)."""
    schedule_type: ScheduleType = Field(..., description="Tipo: once (única) ou recurrent (recorrente)")
    scheduled_at: Optional[datetime] = Field(None, description="Data/hora de execução (para once)")
    recurrence_pattern: Optional[RecurrencePattern] = Field(None, description="Padrão de recorrência (para recurrent)")


class AutomationCreate(AutomationBase):
    """Cria uma nova automação no board."""
    board_id: int = Field(..., description="ID do board onde a automação será aplicada")
    actions: List[AutomationAction] = Field(..., min_items=1, description="Lista de ações a executar (mínimo 1)")

    # Campos opcionais para trigger
    trigger_event: Optional[TriggerEvent] = Field(None, description="Evento que dispara (obrigatório para tipo trigger)")
    trigger_conditions: Optional[Dict[str, Any]] = Field(None, description="Condições para disparo do trigger")

    # Campos opcionais para scheduled
    schedule_type: Optional[ScheduleType] = Field(None, description="Tipo de agendamento (obrigatório para tipo scheduled)")
    scheduled_at: Optional[datetime] = Field(None, description="Data/hora de execução única")
    recurrence_pattern: Optional[RecurrencePattern] = Field(None, description="Padrão de recorrência")

    auto_disable_on_failures: int = Field(5, ge=1, description="Desabilitar automaticamente após X falhas consecutivas")

    model_config = ConfigDict(
        use_enum_values=True,
        json_schema_extra={
            "example": {
                "name": "Mover card ao ganhar",
                "description": "Quando um card é marcado como ganho, move para a lista de Clientes",
                "automation_type": "trigger",
                "board_id": 1,
                "trigger_event": "card_won",
                "trigger_conditions": None,
                "actions": [
                    {"type": "move_card", "params": {"target_list_id": 5}},
                    {"type": "award_points", "params": {"points": 20}}
                ],
                "is_active": True,
                "priority": 80,
                "auto_disable_on_failures": 5
            }
        }
    )


class AutomationUpdate(BaseModel):
    """Atualiza uma automação existente. Apenas campos fornecidos serão alterados."""
    name: Optional[str] = Field(None, max_length=255, description="Nome da automação")
    description: Optional[str] = Field(None, description="Descrição")
    board_id: Optional[int] = Field(None, description="ID do board")
    automation_type: Optional[AutomationType] = Field(None, description="Tipo de automação")
    is_active: Optional[bool] = Field(None, description="Se está ativa")
    priority: Optional[int] = Field(None, ge=1, le=100, description="Prioridade")

    # Campos de trigger
    trigger_event: Optional[str] = Field(None, description="Evento trigger")
    trigger_conditions: Optional[Dict[str, Any]] = Field(None, description="Condições do trigger")

    # Campos de scheduled
    scheduled_at: Optional[datetime] = Field(None, description="Data/hora de execução")
    recurrence_pattern: Optional[RecurrencePattern] = Field(None, description="Padrão de recorrência")

    # Outros
    actions: Optional[List[AutomationAction]] = Field(None, description="Lista de ações")
    auto_disable_on_failures: Optional[int] = Field(None, ge=1, description="Auto-desabilitar após X falhas")

    model_config = ConfigDict(
        use_enum_values=True,
        json_schema_extra={
            "example": {
                "name": "Mover card ao ganhar (atualizado)",
                "is_active": False,
                "priority": 90
            }
        }
    )


class AutomationResponse(AutomationBase):
    """Dados completos de uma automação."""
    id: int = Field(..., description="ID único da automação")
    board_id: int = Field(..., description="ID do board")

    # Trigger fields
    trigger_event: Optional[str] = Field(None, description="Evento que dispara a automação")
    trigger_conditions: Optional[Dict[str, Any]] = Field(None, description="Condições do trigger")

    # Scheduled fields
    schedule_type: Optional[str] = Field(None, description="Tipo de agendamento")
    scheduled_at: Optional[datetime] = Field(None, description="Data/hora de execução")
    recurrence_pattern: Optional[str] = Field(None, description="Padrão de recorrência")
    next_run_at: Optional[datetime] = Field(None, description="Próxima execução agendada")

    # Actions
    actions: List[Dict[str, Any]] = Field(..., description="Lista de ações configuradas")

    # State (estado persistente da automação)
    state: Dict[str, Any] = Field(default_factory=dict, description="Estado persistente da automação (ex: round-robin index)")

    # Execution stats
    execution_count: int = Field(..., description="Total de execuções")
    last_run_at: Optional[datetime] = Field(None, description="Data/hora da última execução")
    failure_count: int = Field(..., description="Total de falhas")
    auto_disable_on_failures: int = Field(..., description="Limite de falhas para auto-desabilitar")

    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data da última atualização")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "name": "Mover card ao ganhar",
                "description": "Quando um card é marcado como ganho, move para lista de Clientes",
                "automation_type": "trigger",
                "is_active": True,
                "priority": 80,
                "board_id": 1,
                "trigger_event": "card_won",
                "trigger_conditions": None,
                "schedule_type": None,
                "scheduled_at": None,
                "recurrence_pattern": None,
                "next_run_at": None,
                "actions": [
                    {"type": "move_card", "params": {"target_list_id": 5}},
                    {"type": "award_points", "params": {"points": 20}}
                ],
                "state": {},
                "execution_count": 15,
                "last_run_at": "2026-01-15T14:30:00",
                "failure_count": 0,
                "auto_disable_on_failures": 5,
                "created_at": "2026-01-01T10:00:00",
                "updated_at": "2026-01-15T14:30:00"
            }
        }
    )


class AutomationListResponse(BaseModel):
    """Lista paginada de automações."""
    automations: List[AutomationResponse] = Field(..., description="Lista de automações")
    total: int = Field(..., description="Total de automações encontradas")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Itens por página")
    total_pages: int = Field(..., description="Total de páginas")


# ========== EXECUTION SCHEMAS ==========

class AutomationExecutionBase(BaseModel):
    """Schema base para execução de automação."""
    pass


class AutomationExecutionCreate(BaseModel):
    """Schema para criar execução (uso interno do sistema)."""
    automation_id: int = Field(..., description="ID da automação executada")
    card_id: Optional[int] = Field(None, description="ID do card afetado")
    triggered_by_id: Optional[int] = Field(None, description="ID do usuário que disparou")
    status: ExecutionStatus = Field(ExecutionStatus.PENDING, description="Status inicial")
    execution_data: Dict[str, Any] = Field(default_factory=dict, description="Dados da execução")


class AutomationExecutionResponse(AutomationExecutionBase):
    """Dados de uma execução de automação."""
    id: int = Field(..., description="ID único da execução")
    automation_id: int = Field(..., description="ID da automação")
    card_id: Optional[int] = Field(None, description="ID do card afetado")
    triggered_by_id: Optional[int] = Field(None, description="ID do usuário que disparou")
    status: str = Field(..., description="Status: pending, success ou failed")
    started_at: datetime = Field(..., description="Data/hora de início")
    completed_at: Optional[datetime] = Field(None, description="Data/hora de conclusão")
    duration_ms: Optional[float] = Field(None, description="Duração da execução em milissegundos")
    execution_data: Dict[str, Any] = Field(..., description="Dados e resultado da execução")
    error_message: Optional[str] = Field(None, description="Mensagem de erro (se falhou)")
    error_stack: Optional[str] = Field(None, description="Stack trace do erro (se falhou)")

    # Campos relacionados
    automation_name: Optional[str] = Field(None, description="Nome da automação")
    card_title: Optional[str] = Field(None, description="Título do card afetado")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "automation_id": 1,
                "card_id": 42,
                "triggered_by_id": 5,
                "status": "success",
                "started_at": "2026-01-15T14:30:00",
                "completed_at": "2026-01-15T14:30:01",
                "duration_ms": 150.5,
                "execution_data": {"action": "move_card", "from_list": 2, "to_list": 5},
                "error_message": None,
                "error_stack": None,
                "automation_name": "Mover card ao ganhar",
                "card_title": "Projeto Alpha"
            }
        }
    )


class AutomationExecutionListResponse(BaseModel):
    """Lista paginada de execuções de automação."""
    executions: List[AutomationExecutionResponse] = Field(..., description="Lista de execuções")
    total: int = Field(..., description="Total de execuções encontradas")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Itens por página")
    total_pages: int = Field(..., description="Total de páginas")


# ========== TRIGGER REQUEST ==========

class AutomationTriggerRequest(BaseModel):
    """Request para disparar uma automação manualmente."""
    card_id: Optional[int] = Field(None, description="ID do card (se aplicável à automação)")
    execution_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Dados adicionais para a execução")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "card_id": 42,
                "execution_data": {"manual_trigger": True, "reason": "Teste manual"}
            }
        }
    )


# ========== CONSTANTS ==========

# Exemplos de trigger_conditions
TRIGGER_CONDITIONS_EXAMPLES = {
    "card_moved": {
        "from_list_id": 1,
        "to_list_id": 2
    },
    "field_changed": {
        "field_id": 5,
        "operator": "equals",  # equals, not_equals, contains, greater_than, less_than
        "value": "Sim"
    },
    "card_assigned": {
        "assigned_to_id": 10
    }
}

# Exemplos de actions
ACTION_EXAMPLES = [
    {
        "type": "move_card",
        "params": {"target_list_id": 3}
    },
    {
        "type": "assign_card",
        "params": {"user_id": 10}
    },
    {
        "type": "update_field",
        "params": {"field_id": 5, "value": "Processado"}
    },
    {
        "type": "send_notification",
        "params": {"user_id": 10, "message": "Card movido automaticamente"}
    },
    {
        "type": "award_points",
        "params": {"user_id": 10, "points": 10, "action_type": "automation_completed"}
    },
    {
        "type": "mark_won",
        "params": {}
    },
    {
        "type": "mark_lost",
        "params": {}
    },
    {
        "type": "update_client_field",
        "params": {"field_name": "relationship_type", "value": "Cliente"}
    },
    {
        "type": "assign_sdr_round_robin",
        "params": {"user_ids": [1, 2, 3]}
    }
]
