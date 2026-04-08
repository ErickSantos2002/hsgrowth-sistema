"""
Schemas Pydantic para Cadência e CadenciaItem.
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


# ==================== ITEM SCHEMAS ====================

class CadenciaItemCreate(BaseModel):
    """Um item de cadência: tipo de atividade + quantidade."""
    activity_type: str = Field(..., min_length=1, max_length=50, description="Tipo de atividade (ligacao, email, visita, etc.)")
    quantity: int = Field(..., ge=1, le=500, description="Quantidade de atividades a criar")


class CadenciaItemResponse(BaseModel):
    id: int
    cadencia_id: int
    activity_type: str
    quantity: int

    model_config = ConfigDict(from_attributes=True)


# ==================== CADÊNCIA SCHEMAS ====================

class CadenciaCreate(BaseModel):
    """Cria uma nova cadência com seus itens."""
    name: str = Field(..., min_length=1, max_length=100, description="Nome da cadência")
    itens: list[CadenciaItemCreate] = Field(..., min_length=1, description="Lista de tipos de atividade e quantidades")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Cadência Semanal",
                "itens": [
                    {"activity_type": "ligacao", "quantity": 20},
                    {"activity_type": "email", "quantity": 10}
                ]
            }
        }
    )


class CadenciaUpdate(BaseModel):
    """Atualiza uma cadência existente."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None
    itens: Optional[list[CadenciaItemCreate]] = Field(None, description="Se fornecido, substitui todos os itens")


class CadenciaResponse(BaseModel):
    id: int
    user_id: int
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    itens: list[CadenciaItemResponse]

    model_config = ConfigDict(from_attributes=True)


# ==================== TRIGGER ====================

class TriggerItemResult(BaseModel):
    """Resultado do disparo para um tipo de atividade."""
    activity_type: str
    requested: int
    created: int
    cards_affected: int


class TriggerResult(BaseModel):
    """Resultado completo do disparo de uma cadência."""
    cadencia_id: int
    cadencia_name: str
    total_activities_created: int
    itens: list[TriggerItemResult]
