"""
Schemas Pydantic para Products (Produtos).
Define os modelos de entrada/saída para operações com produtos.
"""
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator


# ========== PRODUCT (CATÁLOGO) ==========

class ProductBase(BaseModel):
    """Schema base de produto."""
    name: str = Field(..., min_length=1, max_length=255, description="Nome do produto")
    description: Optional[str] = Field(None, description="Descrição detalhada")
    sku: Optional[str] = Field(None, max_length=100, description="Código SKU")
    unit_price: float = Field(..., ge=0, description="Preço unitário")
    currency: str = Field("BRL", max_length=3, description="Moeda (BRL, USD, EUR)")
    category: Optional[str] = Field(None, max_length=100, description="Categoria do produto")


class ProductCreate(ProductBase):
    """Schema para criação de produto."""
    is_active: bool = Field(True, description="Produto ativo")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Software de Gestão - Plano Mensal",
                    "description": "Licença mensal do software completo",
                    "sku": "SW-GEST-MENSAL",
                    "unit_price": 499.00,
                    "currency": "BRL",
                    "category": "Software",
                    "is_active": True
                }
            ]
        }
    }


class ProductUpdate(BaseModel):
    """Schema para atualização de produto (todos os campos opcionais)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    unit_price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    category: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    """Schema de resposta de produto."""
    id: int = Field(..., description="ID do produto")
    is_active: bool = Field(..., description="Produto ativo")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")

    @field_validator('unit_price', mode='before')
    @classmethod
    def convert_decimal_to_float(cls, v):
        """Converte Decimal para float"""
        if isinstance(v, Decimal):
            return float(v)
        return v

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    """Schema para listagem paginada de produtos."""
    products: list[ProductResponse] = Field(..., description="Lista de produtos")
    total: int = Field(..., description="Total de produtos")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Tamanho da página")
    total_pages: int = Field(..., description="Total de páginas")


# ========== CARD PRODUCT (PRODUTOS NO CARD) ==========

class CardProductBase(BaseModel):
    """Schema base de produto no card."""
    product_id: int = Field(..., description="ID do produto no catálogo")
    quantity: int = Field(..., ge=1, description="Quantidade")
    unit_price: float = Field(..., ge=0, description="Preço unitário")
    discount: float = Field(0, ge=0, description="Desconto em valor absoluto")
    notes: Optional[str] = Field(None, description="Observações sobre o produto")


class CardProductCreate(CardProductBase):
    """Schema para adicionar produto ao card."""
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "product_id": 1,
                    "quantity": 2,
                    "unit_price": 499.00,
                    "discount": 50.00,
                    "notes": "Desconto especial para parceiro"
                }
            ]
        }
    }


class CardProductUpdate(BaseModel):
    """Schema para atualizar produto no card (todos os campos opcionais)."""
    quantity: Optional[int] = Field(None, ge=1)
    unit_price: Optional[float] = Field(None, ge=0)
    discount: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class CardProductResponse(CardProductBase):
    """Schema de resposta de produto no card."""
    id: int = Field(..., description="ID do registro")
    card_id: int = Field(..., description="ID do card")
    subtotal: float = Field(..., description="Subtotal (quantidade * preço unitário)")
    total: float = Field(..., description="Total (subtotal - desconto)")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")

    # Campos relacionados (informações do produto)
    product_name: Optional[str] = Field(None, description="Nome do produto")
    product_sku: Optional[str] = Field(None, description="SKU do produto")
    product_category: Optional[str] = Field(None, description="Categoria do produto")

    @field_validator('unit_price', 'discount', 'subtotal', 'total', mode='before')
    @classmethod
    def convert_decimal_to_float(cls, v):
        """Converte Decimal para float"""
        if isinstance(v, Decimal):
            return float(v)
        return v

    model_config = {"from_attributes": True}


class CardProductSummary(BaseModel):
    """Schema de resumo dos produtos de um card (totais)."""
    items: list[CardProductResponse] = Field(..., description="Lista de produtos")
    total_items: int = Field(..., description="Quantidade total de produtos")
    subtotal: float = Field(..., description="Subtotal de todos os produtos")
    total_discount: float = Field(..., description="Desconto total")
    total: float = Field(..., description="Valor total")
