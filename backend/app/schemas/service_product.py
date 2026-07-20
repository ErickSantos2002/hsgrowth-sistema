"""Schemas do catálogo de equipamentos do módulo de Serviços."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ServiceProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = True


class ServiceProductCreate(ServiceProductBase):
    pass


class ServiceProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class ServiceProductResponse(ServiceProductBase):
    id: int
    # Origem, quando veio de um sistema externo. Permite a tela distinguir o que
    # a integração criou do que alguém cadastrou à mão.
    external_source: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
