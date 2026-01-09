"""
Schemas de Automação.
Define estruturas de dados para automações trigger e scheduled.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
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
    UPDATE_FIELD = "update_field"
    SEND_NOTIFICATION = "send_notification"
    AWARD_POINTS = "award_points"
    MARK_WON = "mark_won"
    MARK_LOST = "mark_lost"


class ExecutionStatus(str, Enum):
    """Status de execução."""
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


# ========== ACTION SCHEMAS ==========

class AutomationAction(BaseModel):
    """Schema base para ações de automação."""
    type: ActionType = Field(..., description="Tipo de ação")
    params: Dict[str, Any] = Field(default_factory=dict, description="Parâmetros da ação")

    class Config:
        use_enum_values = True


# ========== AUTOMATION SCHEMAS ==========

class AutomationBase(BaseModel):
    """Schema base para automação."""
    name: str = Field(..., max_length=255, description="Nome da automação")
    description: Optional[str] = Field(None, description="Descrição da automação")
    automation_type: AutomationType = Field(..., description="Tipo de automação")
    is_active: bool = Field(True, description="Se a automação está ativa")
    priority: int = Field(50, ge=1, le=100, description="Prioridade (1-100)")


class AutomationTriggerConfig(BaseModel):
    """Configuração de automação trigger."""
    trigger_event: TriggerEvent = Field(..., description="Evento que dispara")
    trigger_conditions: Optional[Dict[str, Any]] = Field(None, description="Condições do trigger")


class AutomationScheduledConfig(BaseModel):
    """Configuração de automação scheduled."""
    schedule_type: ScheduleType = Field(..., description="Tipo de agendamento")
    scheduled_at: Optional[datetime] = Field(None, description="Data/hora de execução (para once)")
    recurrence_pattern: Optional[RecurrencePattern] = Field(None, description="Padrão de recorrência")


class AutomationCreate(AutomationBase):
    """Schema para criar automação."""
    board_id: int = Field(..., description="ID do board")
    actions: List[AutomationAction] = Field(..., min_items=1, description="Ações a executar")

    # Campos opcionais para trigger
    trigger_event: Optional[TriggerEvent] = None
    trigger_conditions: Optional[Dict[str, Any]] = None

    # Campos opcionais para scheduled
    schedule_type: Optional[ScheduleType] = None
    scheduled_at: Optional[datetime] = None
    recurrence_pattern: Optional[RecurrencePattern] = None

    auto_disable_on_failures: int = Field(5, ge=1, description="Auto-desabilitar após X falhas")

    class Config:
        use_enum_values = True


class AutomationUpdate(BaseModel):
    """Schema para atualizar automação."""
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=1, le=100)
    actions: Optional[List[AutomationAction]] = None
    trigger_conditions: Optional[Dict[str, Any]] = None
    scheduled_at: Optional[datetime] = None
    recurrence_pattern: Optional[RecurrencePattern] = None
    auto_disable_on_failures: Optional[int] = Field(None, ge=1)

    class Config:
        use_enum_values = True


class AutomationResponse(AutomationBase):
    """Schema de resposta para automação."""
    id: int
    board_id: int

    # Trigger fields
    trigger_event: Optional[str] = None
    trigger_conditions: Optional[Dict[str, Any]] = None

    # Scheduled fields
    schedule_type: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    recurrence_pattern: Optional[str] = None
    next_run_at: Optional[datetime] = None

    # Actions
    actions: List[Dict[str, Any]]

    # Execution stats
    execution_count: int
    last_run_at: Optional[datetime] = None
    failure_count: int
    auto_disable_on_failures: int

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AutomationListResponse(BaseModel):
    """Schema de resposta para lista de automações."""
    automations: List[AutomationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ========== EXECUTION SCHEMAS ==========

class AutomationExecutionBase(BaseModel):
    """Schema base para execução de automação."""
    pass


class AutomationExecutionCreate(BaseModel):
    """Schema para criar execução (interno)."""
    automation_id: int
    card_id: Optional[int] = None
    triggered_by_id: Optional[int] = None
    status: ExecutionStatus = ExecutionStatus.PENDING
    execution_data: Dict[str, Any] = Field(default_factory=dict)


class AutomationExecutionResponse(AutomationExecutionBase):
    """Schema de resposta para execução."""
    id: int
    automation_id: int
    card_id: Optional[int] = None
    triggered_by_id: Optional[int] = None
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[float] = None
    execution_data: Dict[str, Any]
    error_message: Optional[str] = None
    error_stack: Optional[str] = None

    # Campos relacionados
    automation_name: Optional[str] = None
    card_title: Optional[str] = None

    class Config:
        from_attributes = True


class AutomationExecutionListResponse(BaseModel):
    """Schema de resposta para lista de execuções."""
    executions: List[AutomationExecutionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ========== TRIGGER REQUEST ==========

class AutomationTriggerRequest(BaseModel):
    """Request para disparar automação manualmente."""
    card_id: Optional[int] = Field(None, description="ID do card (se aplicável)")
    execution_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Dados adicionais")


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
    }
]
