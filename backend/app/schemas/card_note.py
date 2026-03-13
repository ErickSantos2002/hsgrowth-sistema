"""
Schemas para CardNote (Anotações dos Cards).
"""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional


# ==================== REQUEST SCHEMAS ====================

class CardNoteCreate(BaseModel):
    """Cria uma nova anotação em um card."""
    card_id: int = Field(..., description="ID do card onde a anotação será criada")
    content: str = Field(..., min_length=1, description="Conteúdo da anotação (texto livre)")
    note_type: Optional[str] = Field(None, max_length=50, description="Tipo da anotação (ex: 'ligacao', 'geral'). Opcional.")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "card_id": 42,
                "content": "Cliente demonstrou interesse no plano premium. Agendar reunião para próxima semana.",
                "note_type": None
            }
        }
    )


class CardNoteUpdate(BaseModel):
    """Atualiza o conteúdo de uma anotação existente."""
    content: str = Field(..., min_length=1, description="Novo conteúdo da anotação")
    note_type: Optional[str] = Field(None, max_length=50, description="Tipo da anotação. Opcional.")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content": "Cliente confirmou interesse no plano premium. Reunião agendada para 20/01 às 14h.",
                "note_type": "ligacao"
            }
        }
    )


# ==================== RESPONSE SCHEMAS ====================

class CardNoteResponse(BaseModel):
    """Dados completos de uma anotação de card."""
    id: int = Field(..., description="ID único da anotação")
    card_id: int = Field(..., description="ID do card vinculado")
    user_id: int = Field(..., description="ID do usuário que criou a anotação")
    content: str = Field(..., description="Conteúdo da anotação")
    note_type: Optional[str] = Field(None, description="Tipo da anotação (ex: 'ligacao', 'geral')")
    created_at: datetime = Field(..., description="Data e hora de criação")
    updated_at: datetime = Field(..., description="Data e hora da última atualização")

    # Campos relacionados (opcionais, populados quando expandido)
    user_name: Optional[str] = Field(None, description="Nome do usuário que criou a anotação")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "card_id": 42,
                "user_id": 5,
                "content": "Cliente demonstrou interesse no plano premium. Agendar reunião para próxima semana.",
                "note_type": "ligacao",
                "created_at": "2026-01-15T14:30:00",
                "updated_at": "2026-01-15T14:30:00",
                "user_name": "João Silva"
            }
        }
    )
