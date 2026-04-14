"""
Schemas Pydantic para CardTask (Tarefas/Atividades do Card).
"""
from pydantic import BaseModel, ConfigDict, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum


class TaskType(str, Enum):
    """Tipos de atividade/tarefa."""
    CALL = "call"
    MEETING = "meeting"
    TASK = "task"
    FOLLOW_UP = "follow_up"
    DEADLINE = "deadline"
    EMAIL = "email"
    LUNCH = "lunch"
    WHATSAPP = "whatsapp"
    OTHER = "other"


class TaskPriority(str, Enum):
    """Prioridade da tarefa."""
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    """Status da disponibilidade."""
    FREE = "free"
    BUSY = "busy"


# ==================== REQUEST SCHEMAS ====================

class CardTaskCreate(BaseModel):
    """Cria uma nova tarefa/atividade vinculada a um card."""
    card_id: int = Field(..., description="ID do card")
    assigned_to_id: Optional[int] = Field(None, description="ID do usuário responsável")
    title: str = Field(..., min_length=1, max_length=255, description="Título da tarefa")
    description: Optional[str] = Field(None, description="Descrição detalhada")
    task_type: TaskType = Field(TaskType.TASK, description="Tipo da tarefa (call, meeting, task, follow_up, other)")
    priority: TaskPriority = Field(TaskPriority.NORMAL, description="Prioridade (normal, high, urgent)")
    due_date: Optional[datetime] = Field(None, description="Data/hora de vencimento")
    duration_minutes: Optional[int] = Field(30, ge=5, le=480, description="Duração em minutos (5-480)")
    location: Optional[str] = Field(None, max_length=255, description="Local da atividade")
    video_link: Optional[str] = Field(None, max_length=500, description="Link de videochamada (Zoom, Meet, etc.)")
    notes: Optional[str] = Field(None, description="Notas adicionais")
    contact_name: Optional[str] = Field(None, max_length=255, description="Nome do contato relacionado")
    status: TaskStatus = Field(TaskStatus.FREE, description="Status de disponibilidade (free, busy)")

    model_config = ConfigDict(
        use_enum_values=True,
        json_schema_extra={
            "example": {
                "card_id": 42,
                "assigned_to_id": 5,
                "title": "Ligar para cliente sobre proposta",
                "description": "Confirmar valores e condições da proposta enviada ontem",
                "task_type": "call",
                "priority": "high",
                "due_date": "2026-01-20T14:00:00",
                "duration_minutes": 30,
                "contact_name": "Carlos Oliveira",
                "notes": "Cliente prefere ligação no período da tarde"
            }
        }
    )


class CardTaskUpdate(BaseModel):
    """Atualiza uma tarefa existente. Apenas campos fornecidos serão alterados."""
    assigned_to_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    task_type: Optional[TaskType] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=5, le=480)
    location: Optional[str] = Field(None, max_length=255)
    video_link: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    contact_name: Optional[str] = Field(None, max_length=255)
    status: Optional[TaskStatus] = None
    is_completed: Optional[bool] = None

    model_config = ConfigDict(
        use_enum_values=True,
        json_schema_extra={
            "example": {
                "title": "Ligar para cliente - urgente",
                "priority": "urgent",
                "due_date": "2026-01-18T10:00:00"
            }
        }
    )


class CardTaskMarkComplete(BaseModel):
    """Marca ou desmarca uma tarefa como concluída."""
    is_completed: bool = Field(..., description="True para concluída, False para reabrir como pendente")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "is_completed": True
            }
        }
    )


# ==================== RESPONSE SCHEMAS ====================

class CardTaskResponse(BaseModel):
    """Dados completos de uma tarefa/atividade."""
    id: int = Field(..., description="ID único da tarefa")
    card_id: int = Field(..., description="ID do card vinculado")
    assigned_to_id: Optional[int] = Field(None, description="ID do usuário responsável")
    title: str = Field(..., description="Título da tarefa")
    description: Optional[str] = Field(None, description="Descrição detalhada")
    task_type: str = Field(..., description="Tipo da tarefa")
    priority: str = Field(..., description="Prioridade (normal, high, urgent)")
    due_date: Optional[datetime] = Field(None, description="Data/hora de vencimento")
    duration_minutes: Optional[int] = Field(None, description="Duração em minutos")
    location: Optional[str] = Field(None, description="Local da atividade")
    video_link: Optional[str] = Field(None, description="Link de videochamada")
    notes: Optional[str] = Field(None, description="Notas adicionais")
    contact_name: Optional[str] = Field(None, description="Nome do contato")
    status: str = Field(..., description="Status de disponibilidade")
    is_completed: bool = Field(..., description="Se a tarefa está concluída")
    completed_at: Optional[datetime] = Field(None, description="Data/hora de conclusão")
    is_noshow: bool = Field(False, description="Se a reunião teve NoShow (contato não compareceu)")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data da última atualização")

    # Campos relacionados (opcionais, populados quando expandido)
    assigned_to_name: Optional[str] = Field(None, description="Nome do usuário responsável")
    is_overdue: Optional[bool] = Field(None, description="Se a tarefa está atrasada")

    # Campos do card vinculado (úteis na visão global do calendário)
    card_title: Optional[str] = Field(None, description="Título do card ao qual a tarefa pertence")
    card_client_name: Optional[str] = Field(None, description="Nome do cliente do card")

    # Microsoft Teams
    teams_meeting_id: Optional[str] = Field(None, description="ID da reunião no Microsoft Teams")
    teams_join_url: Optional[str] = Field(None, description="Link de entrada na reunião Teams")
    transcript_raw: Optional[str] = Field(None, description="Transcrição bruta em formato VTT")
    transcript_analysis: Optional[str] = Field(None, description="Análise IA da transcrição (JSON)")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "card_id": 42,
                "assigned_to_id": 5,
                "title": "Ligar para cliente sobre proposta",
                "description": "Confirmar valores e condições",
                "task_type": "call",
                "priority": "high",
                "due_date": "2026-01-20T14:00:00",
                "duration_minutes": 30,
                "location": None,
                "video_link": None,
                "notes": "Cliente prefere ligação à tarde",
                "contact_name": "Carlos Oliveira",
                "status": "free",
                "is_completed": False,
                "completed_at": None,
                "is_noshow": False,
                "created_at": "2026-01-15T10:00:00",
                "updated_at": "2026-01-15T10:00:00",
                "assigned_to_name": "João Silva",
                "is_overdue": False
            }
        }
    )


class CardTaskListResponse(BaseModel):
    """Lista paginada de tarefas."""
    tasks: list[CardTaskResponse] = Field(..., description="Lista de tarefas")
    total: int = Field(..., description="Total de tarefas encontradas")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Itens por página")
    total_pages: int = Field(..., description="Total de páginas")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "tasks": [
                    {
                        "id": 1,
                        "card_id": 42,
                        "title": "Ligar para cliente",
                        "task_type": "call",
                        "priority": "high",
                        "is_completed": False,
                        "assigned_to_name": "João Silva"
                    }
                ],
                "total": 15,
                "page": 1,
                "page_size": 50,
                "total_pages": 1
            }
        }
    )


# ==================== FILTROS ====================

class CardTaskFilters(BaseModel):
    """Filtros para listagem de tarefas."""
    card_id: Optional[int] = Field(None, description="Filtrar por card específico")
    assigned_to_id: Optional[int] = Field(None, description="Filtrar por responsável")
    task_type: Optional[TaskType] = Field(None, description="Filtrar por tipo de tarefa")
    priority: Optional[TaskPriority] = Field(None, description="Filtrar por prioridade")
    is_completed: Optional[bool] = Field(None, description="Filtrar por status de conclusão")
    due_date_start: Optional[datetime] = Field(None, description="Data de vencimento inicial")
    due_date_end: Optional[datetime] = Field(None, description="Data de vencimento final")
    page: int = Field(1, ge=1, description="Número da página")
    page_size: int = Field(50, ge=1, le=100, description="Itens por página (máx: 100)")

    model_config = ConfigDict(use_enum_values=True)
