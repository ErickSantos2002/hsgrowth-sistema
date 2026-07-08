"""Schemas de Serviço (catálogo) e de serviço vinculado ao card. Espelha product.py."""
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator


# ========== SERVICE (CATÁLOGO) ==========

class ServiceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Nome do serviço")
    description: Optional[str] = Field(None, description="Descrição detalhada")
    sku: Optional[str] = Field(None, max_length=100, description="Código/SKU")
    unit_price: float = Field(..., ge=0, description="Preço")
    category: Optional[str] = Field(None, max_length=100, description="Categoria")


class ServiceCreate(ServiceBase):
    is_active: bool = Field(True, description="Serviço ativo")


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    unit_price: Optional[float] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class ServiceResponse(ServiceBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator('unit_price', mode='before')
    @classmethod
    def _dec2float(cls, v):
        return float(v) if isinstance(v, Decimal) else v

    model_config = {"from_attributes": True}


class ServiceListResponse(BaseModel):
    services: list[ServiceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ========== SERVICE NO CARD ==========

class ServiceCardServiceBase(BaseModel):
    service_id: int = Field(..., description="ID do serviço no catálogo")
    quantity: int = Field(..., ge=1, description="Quantidade")
    unit_price: float = Field(..., ge=0, description="Preço unitário")
    discount: float = Field(0, ge=0, description="Desconto em valor absoluto")
    notes: Optional[str] = Field(None, description="Observações")


class ServiceCardServiceCreate(ServiceCardServiceBase):
    pass


class ServiceCardServiceUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=1)
    unit_price: Optional[float] = Field(None, ge=0)
    discount: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class ServiceCardServiceResponse(ServiceCardServiceBase):
    id: int
    service_card_id: int
    subtotal: float
    total: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    service_name: Optional[str] = None
    service_sku: Optional[str] = None
    service_category: Optional[str] = None

    @field_validator('unit_price', 'discount', 'subtotal', 'total', mode='before')
    @classmethod
    def _dec2float(cls, v):
        return float(v) if isinstance(v, Decimal) else v

    model_config = {"from_attributes": True}


class ServiceCardServiceSummary(BaseModel):
    items: list[ServiceCardServiceResponse]
    total_items: int
    subtotal: float
    total_discount: float
    total: float
