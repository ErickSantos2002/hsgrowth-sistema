"""
Schemas Pydantic para Fields (Campos Customizados).
Define os modelos de entrada/saída para campos customizados e seus valores.
"""
from typing import Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field


class FieldDefinitionBase(BaseModel):
    """
    Schema base de definição de campo customizado.
    """
    name: str = Field(..., min_length=1, max_length=255, description="Nome do campo")
    field_type: str = Field(..., description="Tipo do campo (text, number, date, select, etc.)")
    options: Optional[Dict[str, Any]] = Field(None, description="Opções do campo (JSON)")


class FieldDefinitionCreate(FieldDefinitionBase):
    """
    Schema para criação de definição de campo.
    """
    board_id: int = Field(..., description="ID do board")
    is_required: bool = Field(False, description="Campo obrigatório")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Fonte do Lead",
                    "field_type": "select",
                    "board_id": 1,
                    "is_required": True,
                    "options": {
                        "choices": ["Website", "Indicação", "LinkedIn", "Telefone", "Email"]
                    }
                }
            ]
        }
    }


class FieldDefinitionUpdate(BaseModel):
    """
    Schema para atualização de definição de campo.
    """
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Nome do campo")
    field_type: Optional[str] = Field(None, description="Tipo do campo")
    options: Optional[Dict[str, Any]] = Field(None, description="Opções do campo")
    is_required: Optional[bool] = Field(None, description="Campo obrigatório")


class FieldDefinitionResponse(FieldDefinitionBase):
    """
    Schema de resposta de definição de campo.
    """
    id: int = Field(..., description="ID da definição")
    board_id: int = Field(..., description="ID do board")
    is_required: bool = Field(..., description="Campo obrigatório")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")

    model_config = {
        "from_attributes": True
    }


class CardFieldValueCreate(BaseModel):
    """
    Schema para criar/atualizar valor de campo customizado.
    Aceita duas formas:
    1. Com field_definition_id (para campos já definidos)
    2. Com field_name, field_value e field_type (cria definição se não existir)
    """
    # Formato 1: Usando definição existente
    field_definition_id: Optional[int] = Field(None, description="ID da definição do campo")
    value: Optional[Any] = Field(None, description="Valor do campo (pode ser string, número, data, etc.)")

    # Formato 2: Criando definição dinamicamente
    field_name: Optional[str] = Field(None, description="Nome do campo (cria definição se não existir)")
    field_value: Optional[Any] = Field(None, description="Valor do campo")
    field_type: Optional[str] = Field(None, description="Tipo do campo (text, number, date, etc.)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "field_definition_id": 1,
                    "value": "LinkedIn"
                },
                {
                    "field_name": "Origem",
                    "field_value": "Indicação",
                    "field_type": "text"
                }
            ]
        }
    }


class CardFieldValueResponse(BaseModel):
    """
    Schema de resposta de valor de campo customizado.
    """
    id: int = Field(..., description="ID do valor")
    card_id: int = Field(..., description="ID do card")
    field_definition_id: int = Field(..., description="ID da definição do campo")
    value: Any = Field(..., description="Valor do campo")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")

    # Campos relacionados
    field_name: Optional[str] = Field(None, description="Nome do campo")
    field_type: Optional[str] = Field(None, description="Tipo do campo")

    model_config = {
        "from_attributes": True
    }
