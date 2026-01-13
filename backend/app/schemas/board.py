"""
Schemas Pydantic para Boards (Quadros).
Define os modelos de entrada/saída para operações com boards.
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class BoardBase(BaseModel):
    """
    Schema base de board (campos comuns).
    """
    name: str = Field(..., min_length=1, max_length=255, description="Nome do board")
    description: Optional[str] = Field(None, max_length=1000, description="Descrição do board")
    color: Optional[str] = Field("#3B82F6", max_length=50, description="Cor do board (hexadecimal)")
    icon: Optional[str] = Field("grid", max_length=50, description="Ícone do board (Lucide)")


class BoardCreate(BoardBase):
    """
    Schema para criação de board.
    """
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Leads de Vendas",
                    "description": "Quadro para gerenciar leads do funil de vendas"
                }
            ]
        }
    }


class BoardUpdate(BaseModel):
    """
    Schema para atualização de board (todos os campos opcionais).
    """
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Nome do board")
    description: Optional[str] = Field(None, max_length=1000, description="Descrição do board")
    color: Optional[str] = Field(None, max_length=50, description="Cor do board (hexadecimal)")
    icon: Optional[str] = Field(None, max_length=50, description="Ícone do board (Lucide)")
    is_deleted: Optional[bool] = Field(None, description="Board arquivado (soft delete)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Leads de Vendas Q1 2026",
                    "description": "Quadro atualizado para Q1"
                }
            ]
        }
    }


class BoardResponse(BoardBase):
    """
    Schema de resposta de board.
    """
    id: int = Field(..., description="ID do board")
    is_deleted: bool = Field(..., description="Board arquivado (soft delete)")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")

    # Campos calculados/relacionados (opcional)
    lists_count: Optional[int] = Field(None, description="Número de listas no board")
    cards_count: Optional[int] = Field(None, description="Número total de cards")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "Leads de Vendas",
                    "description": "Quadro para gerenciar leads do funil de vendas",
                    "is_archived": False,
                    "created_at": "2026-01-05T10:00:00",
                    "updated_at": "2026-01-05T10:00:00",
                    "lists_count": 5,
                    "cards_count": 42
                }
            ]
        }
    }


class BoardListResponse(BaseModel):
    """
    Schema para listagem paginada de boards.
    """
    boards: list[BoardResponse] = Field(..., description="Lista de boards")
    total: int = Field(..., description="Total de boards")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Tamanho da página")
    total_pages: int = Field(..., description="Total de páginas")


class BoardDuplicateRequest(BaseModel):
    """
    Schema para duplicação de board.
    """
    new_name: str = Field(..., min_length=1, max_length=255, description="Nome do novo board")
    copy_lists: bool = Field(True, description="Copiar listas")
    copy_cards: bool = Field(False, description="Copiar cards")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "new_name": "Leads de Vendas - Cópia",
                    "copy_lists": True,
                    "copy_cards": False
                }
            ]
        }
    }
