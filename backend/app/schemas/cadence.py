"""
Schemas Pydantic para o sistema de Cadência por Lead Individual.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class CardCadenceStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ─── CadenceStep ─────────────────────────────────────────────────────────────

class CadenceStepBase(BaseModel):
    order: int = Field(..., ge=1, description="Ordem da etapa na cadência")
    day_offset: int = Field(..., ge=1, description="Dias úteis desde o início da cadência")
    activity_type: str = Field(..., min_length=1, max_length=50, description="Tipo: call, email, whatsapp, task...")
    title: str = Field(..., min_length=1, max_length=255, description="Título da atividade gerada")
    description: Optional[str] = Field(None, description="Instrução para o SDR")
    priority: str = Field("normal", description="Prioridade: normal, high, urgent")
    scheduled_time: Optional[str] = Field(None, description="Horário no formato HH:MM (ex: '09:00'). Se nulo, usa hora atual.")


class CadenceStepCreate(CadenceStepBase):
    pass


class CadenceStepResponse(CadenceStepBase):
    id: int
    template_id: int

    model_config = {"from_attributes": True}


# ─── CadenceTemplate ─────────────────────────────────────────────────────────

class CadenceTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: bool = Field(True)
    steps: List[CadenceStepCreate] = Field(..., min_length=1, description="Pelo menos 1 etapa")


class CadenceTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    steps: Optional[List[CadenceStepCreate]] = Field(None, description="Se informado, substitui todas as etapas")


class CadenceTemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    created_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    steps: List[CadenceStepResponse]

    model_config = {"from_attributes": True}


class CadenceTemplateSummary(BaseModel):
    """Versão resumida para listas (sem detalhes das etapas)."""
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    step_count: int = 0

    model_config = {"from_attributes": True}


# ─── CardCadence ─────────────────────────────────────────────────────────────

class CardCadenceStart(BaseModel):
    template_id: int = Field(..., description="ID do template a iniciar")


class CardCadenceResponse(BaseModel):
    id: int
    card_id: int
    template_id: int
    template_name: str
    started_by_id: Optional[int]
    status: CardCadenceStatus
    current_step_order: int
    total_steps: int
    started_at: datetime
    paused_at: Optional[datetime]
    completed_at: Optional[datetime]
    # Etapa atual
    current_step: Optional[CadenceStepResponse]
    # Etapa anterior (para contexto)
    previous_step: Optional[CadenceStepResponse]

    model_config = {"from_attributes": True}
