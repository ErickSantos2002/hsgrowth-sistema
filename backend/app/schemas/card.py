"""
Schemas Pydantic para Cards (Cartões).
Define os modelos de entrada/saída para operações com cards.
"""
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class CardBase(BaseModel):
    """
    Schema base de card (campos comuns).
    """
    title: str = Field(..., min_length=1, max_length=500, description="Título do card")
    description: Optional[str] = Field(None, description="Descrição detalhada")


class CardCreate(CardBase):
    """
    Schema para criação de card.
    """
    list_id: int = Field(..., description="ID da lista onde o card será criado")
    assigned_to_id: Optional[int] = Field(None, description="ID do usuário responsável")
    value: Optional[Decimal] = Field(None, ge=0, description="Valor monetário do card")
    due_date: Optional[datetime] = Field(None, description="Data de vencimento")
    contact_info: Optional[Dict[str, Any]] = Field(None, description="Informações de contato (JSON)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "Lead - Empresa XYZ",
                    "description": "Contato inicial via telefone. Interessado em nossos serviços.",
                    "list_id": 1,
                    "assigned_to_id": 2,
                    "value": 5000.00,
                    "due_date": "2026-01-15T10:00:00",
                    "contact_info": {
                        "name": "João Silva",
                        "email": "joao@empresaxyz.com",
                        "phone": "(11) 99999-9999",
                        "company": "Empresa XYZ"
                    }
                }
            ]
        }
    }


class CardUpdate(BaseModel):
    """
    Schema para atualização de card (todos os campos opcionais).
    """
    title: Optional[str] = Field(None, min_length=1, max_length=500, description="Título do card")
    description: Optional[str] = Field(None, description="Descrição detalhada")
    assigned_to_id: Optional[int] = Field(None, description="ID do usuário responsável")
    value: Optional[Decimal] = Field(None, ge=0, description="Valor monetário do card")
    due_date: Optional[datetime] = Field(None, description="Data de vencimento")
    contact_info: Optional[Dict[str, Any]] = Field(None, description="Informações de contato (JSON)")
    is_won: Optional[bool] = Field(None, description="Card ganho (venda fechada)")
    is_lost: Optional[bool] = Field(None, description="Card perdido")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "Lead - Empresa XYZ - Proposta Enviada",
                    "value": 7500.00,
                    "is_won": False
                }
            ]
        }
    }


class CardMoveRequest(BaseModel):
    """
    Schema para mover card entre listas.
    """
    target_list_id: int = Field(..., description="ID da lista de destino")
    position: Optional[int] = Field(None, description="Posição na lista de destino")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "target_list_id": 3,
                    "position": 0
                }
            ]
        }
    }


class CardAssignRequest(BaseModel):
    """
    Schema para atribuir card a um usuário.
    """
    assigned_to_id: Optional[int] = Field(..., description="ID do usuário responsável (None para desatribuir)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "assigned_to_id": 5
                }
            ]
        }
    }


class CardResponse(CardBase):
    """
    Schema de resposta de card.
    """
    id: int = Field(..., description="ID do card")
    list_id: int = Field(..., description="ID da lista")
    assigned_to_id: Optional[int] = Field(None, description="ID do usuário responsável")
    value: Optional[Decimal] = Field(None, description="Valor monetário")
    due_date: Optional[datetime] = Field(None, description="Data de vencimento")
    contact_info: Optional[Dict[str, Any]] = Field(None, description="Informações de contato")
    is_won: bool = Field(..., description="Card ganho")
    is_lost: bool = Field(..., description="Card perdido")
    won_at: Optional[datetime] = Field(None, description="Data de vitória")
    lost_at: Optional[datetime] = Field(None, description="Data de perda")
    position: int = Field(..., description="Posição na lista")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")

    # Campos relacionados (opcional)
    assigned_to_name: Optional[str] = Field(None, description="Nome do responsável")
    list_name: Optional[str] = Field(None, description="Nome da lista")
    board_id: Optional[int] = Field(None, description="ID do board")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "title": "Lead - Empresa XYZ",
                    "description": "Contato inicial via telefone",
                    "list_id": 1,
                    "assigned_to_id": 2,
                    "value": 5000.00,
                    "due_date": "2026-01-15T10:00:00",
                    "contact_info": {
                        "name": "João Silva",
                        "email": "joao@empresaxyz.com"
                    },
                    "is_won": False,
                    "is_lost": False,
                    "won_at": None,
                    "lost_at": None,
                    "position": 0,
                    "created_at": "2026-01-05T10:00:00",
                    "updated_at": "2026-01-05T10:00:00",
                    "assigned_to_name": "Maria Santos",
                    "list_name": "Novos Leads"
                }
            ]
        }
    }


class CardListResponse(BaseModel):
    """
    Schema para listagem paginada de cards.
    """
    cards: list[CardResponse] = Field(..., description="Lista de cards")
    total: int = Field(..., description="Total de cards")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Tamanho da página")
    total_pages: int = Field(..., description="Total de páginas")
