"""
Schemas Pydantic para CardTask (Tarefas/Atividades do Card).
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum


class TaskType(str, Enum):
    """Tipos de atividade/tarefa"""
    CALL = "call"
    MEETING = "meeting"
    TASK = "task"
    DEADLINE = "deadline"
    EMAIL = "email"
    LUNCH = "lunch"
    OTHER = "other"


class TaskPriority(str, Enum):
    """Prioridade da tarefa"""
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    """Status da disponibilidade"""
    FREE = "free"
    BUSY = "busy"


# ==================== REQUEST SCHEMAS ====================

class CardTaskCreate(BaseModel):
    """Schema para criar uma nova tarefa"""
    card_id: int = Field(..., description="ID do card")
    assigned_to_id: Optional[int] = Field(None, description="ID do usuário responsável")
    title: str = Field(..., min_length=1, max_length=255, description="Título da tarefa")
    description: Optional[str] = Field(None, description="Descrição detalhada")
    task_type: TaskType = Field(TaskType.TASK, description="Tipo da tarefa")
    priority: TaskPriority = Field(TaskPriority.NORMAL, description="Prioridade")
    due_date: Optional[datetime] = Field(None, description="Data/hora de vencimento")
    duration_minutes: Optional[int] = Field(30, ge=5, le=480, description="Duração em minutos (5-480)")
    location: Optional[str] = Field(None, max_length=255, description="Local")
    video_link: Optional[str] = Field(None, max_length=500, description="Link de videochamada")
    notes: Optional[str] = Field(None, description="Notas adicionais")
    contact_name: Optional[str] = Field(None, max_length=255, description="Nome do contato")
    status: TaskStatus = Field(TaskStatus.FREE, description="Status de disponibilidade")

    class Config:
        use_enum_values = True


class CardTaskUpdate(BaseModel):
    """Schema para atualizar uma tarefa"""
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

    class Config:
        use_enum_values = True


class CardTaskMarkComplete(BaseModel):
    """Schema para marcar tarefa como concluída/pendente"""
    is_completed: bool = Field(..., description="True para concluído, False para pendente")


# ==================== RESPONSE SCHEMAS ====================

class CardTaskResponse(BaseModel):
    """Schema de resposta com dados da tarefa"""
    id: int
    card_id: int
    assigned_to_id: Optional[int]
    title: str
    description: Optional[str]
    task_type: str
    priority: str
    due_date: Optional[datetime]
    duration_minutes: Optional[int]
    location: Optional[str]
    video_link: Optional[str]
    notes: Optional[str]
    contact_name: Optional[str]
    status: str
    is_completed: bool
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    # Campos relacionados (opcionais, populados quando expandido)
    assigned_to_name: Optional[str] = None
    is_overdue: Optional[bool] = None

    class Config:
        from_attributes = True


class CardTaskListResponse(BaseModel):
    """Schema de resposta para lista de tarefas"""
    tasks: list[CardTaskResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================== FILTROS ====================

class CardTaskFilters(BaseModel):
    """Filtros para listagem de tarefas"""
    card_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    task_type: Optional[TaskType] = None
    priority: Optional[TaskPriority] = None
    is_completed: Optional[bool] = None
    due_date_start: Optional[datetime] = None
    due_date_end: Optional[datetime] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=100)

    class Config:
        use_enum_values = True
