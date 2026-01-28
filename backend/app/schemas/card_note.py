"""
Schemas para CardNote (Anotações dos Cards).
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


# ==================== REQUEST SCHEMAS ====================

class CardNoteCreate(BaseModel):
    """Schema para criar uma nova anotação"""
    card_id: int = Field(..., description="ID do card")
    content: str = Field(..., min_length=1, description="Conteúdo da anotação")


class CardNoteUpdate(BaseModel):
    """Schema para atualizar uma anotação"""
    content: str = Field(..., min_length=1, description="Novo conteúdo da anotação")


# ==================== RESPONSE SCHEMAS ====================

class CardNoteResponse(BaseModel):
    """Schema de resposta com dados da anotação"""
    id: int
    card_id: int
    user_id: int
    content: str
    created_at: datetime
    updated_at: datetime

    # Campos relacionados (opcionais, populados quando expandido)
    user_name: Optional[str] = None

    class Config:
        from_attributes = True
