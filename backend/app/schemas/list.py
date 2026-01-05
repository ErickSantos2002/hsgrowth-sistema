"""
Schemas Pydantic para Lists (Listas/Colunas dos Boards).
Define os modelos de entrada/saída para operações com listas.
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ListBase(BaseModel):
    """
    Schema base de list (campos comuns).
    """
    name: str = Field(..., min_length=1, max_length=255, description="Nome da lista")
    color: Optional[str] = Field(None, max_length=7, description="Cor da lista (hex)")


class ListCreate(ListBase):
    """
    Schema para criação de lista.
    """
    board_id: int = Field(..., description="ID do board")
    position: Optional[int] = Field(None, description="Posição da lista no board")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Novos Leads",
                    "color": "#3b82f6",
                    "board_id": 1,
                    "position": 0
                }
            ]
        }
    }


class ListUpdate(BaseModel):
    """
    Schema para atualização de lista (todos os campos opcionais).
    """
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Nome da lista")
    color: Optional[str] = Field(None, max_length=7, description="Cor da lista (hex)")
    position: Optional[int] = Field(None, description="Posição da lista no board")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Em Contato",
                    "color": "#10b981"
                }
            ]
        }
    }


class ListMoveRequest(BaseModel):
    """
    Schema para mover/reordenar lista.
    """
    new_position: int = Field(..., ge=0, description="Nova posição da lista")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "new_position": 2
                }
            ]
        }
    }


class ListResponse(ListBase):
    """
    Schema de resposta de lista.
    """
    id: int = Field(..., description="ID da lista")
    board_id: int = Field(..., description="ID do board")
    position: int = Field(..., description="Posição da lista")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")

    # Campos calculados (opcional)
    cards_count: Optional[int] = Field(None, description="Número de cards na lista")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "Novos Leads",
                    "color": "#3b82f6",
                    "board_id": 1,
                    "position": 0,
                    "created_at": "2026-01-05T10:00:00",
                    "updated_at": "2026-01-05T10:00:00",
                    "cards_count": 15
                }
            ]
        }
    }
