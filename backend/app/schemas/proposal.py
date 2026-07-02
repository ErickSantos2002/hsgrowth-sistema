"""Schemas de Proposta Comercial."""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ---- Itens ----
class ProposalItemBase(BaseModel):
    product_id: Optional[int] = None
    description: str
    sku: Optional[str] = None
    quantity: float = 1
    unit: Optional[str] = None
    unit_price: float = 0


class ProposalItemCreate(ProposalItemBase):
    pass


class ProposalItemResponse(ProposalItemBase):
    id: int
    total: float

    class Config:
        from_attributes = True


# ---- Proposta ----
class ProposalBase(BaseModel):
    client_id: Optional[int] = None
    person_id: Optional[int] = None
    service_card_id: Optional[int] = None
    seller_name: Optional[str] = None
    date: Optional[date] = None
    next_contact_date: Optional[date] = None
    intro: Optional[str] = None
    other_items: Optional[str] = None
    discount: float = 0
    shipping: float = 0
    shipping_method: Optional[str] = None
    freight_type: Optional[str] = None
    carrier_name: Optional[str] = None
    payment_terms: Optional[str] = None
    validity_days: Optional[int] = None
    delivery_date: Optional[date] = None
    delivery_desc: Optional[str] = None
    notes: Optional[str] = None
    signature: Optional[str] = None
    internal_status: str = "rascunho"


class ProposalCreate(ProposalBase):
    items: List[ProposalItemCreate] = Field(default_factory=list)


class ProposalUpdate(BaseModel):
    # todos opcionais; se `items` vier, substitui a lista inteira
    client_id: Optional[int] = None
    person_id: Optional[int] = None
    service_card_id: Optional[int] = None
    seller_name: Optional[str] = None
    date: Optional[date] = None
    next_contact_date: Optional[date] = None
    intro: Optional[str] = None
    other_items: Optional[str] = None
    discount: Optional[float] = None
    shipping: Optional[float] = None
    shipping_method: Optional[str] = None
    freight_type: Optional[str] = None
    carrier_name: Optional[str] = None
    payment_terms: Optional[str] = None
    validity_days: Optional[int] = None
    delivery_date: Optional[date] = None
    delivery_desc: Optional[str] = None
    notes: Optional[str] = None
    signature: Optional[str] = None
    internal_status: Optional[str] = None
    items: Optional[List[ProposalItemCreate]] = None


class ProposalResponse(ProposalBase):
    id: int
    number: int
    items: List[ProposalItemResponse] = Field(default_factory=list)
    # Derivados / de conveniência
    total_items: float = 0        # soma dos totais dos itens
    total: float = 0              # total_items + shipping - discount
    marker: str = "em_aberto"     # aprovada | nao_aprovada | em_aberto
    client_name: Optional[str] = None
    client_document: Optional[str] = None  # CNPJ/CPF
    board_id: Optional[int] = None         # board do card vinculado (para link no front)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProposalListResponse(BaseModel):
    items: List[ProposalResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
