"""Schemas de Proposta Comercial."""
from datetime import date as date_type, datetime  # alias: o campo `date` sombrearia o tipo `date`
from typing import Literal, Optional, List
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
    seller_name: Optional[str] = None
    date: Optional[date_type] = None
    next_contact_date: Optional[date_type] = None
    intro: Optional[str] = None
    other_items: Optional[str] = None
    discount: float = 0
    shipping: float = 0
    shipping_method: Optional[str] = None
    freight_type: Optional[str] = None
    carrier_name: Optional[str] = None
    payment_terms: Optional[str] = None
    validity_days: Optional[int] = None
    delivery_date: Optional[date_type] = None
    delivery_desc: Optional[str] = None
    different_delivery_address: bool = False
    delivery_address: Optional[dict] = None
    # Override editável dos dados do cliente/pessoa só nesta proposta (não altera o cadastro).
    client_override: Optional[dict] = None
    notes: Optional[str] = None
    signature: Optional[str] = None
    internal_status: Literal["rascunho", "enviada"] = "rascunho"


class ProposalCreate(ProposalBase):
    # Campo transiente: se informado, cria o vínculo N:N com o card na criação.
    service_card_id: Optional[int] = None
    items: List[ProposalItemCreate] = Field(default_factory=list)


class ProposalUpdate(BaseModel):
    # todos opcionais; se `items` vier, substitui a lista inteira.
    # Vínculo com cards é feito via endpoints dedicados (POST/DELETE /{id}/cards).
    client_id: Optional[int] = None
    person_id: Optional[int] = None
    seller_name: Optional[str] = None
    date: Optional[date_type] = None
    next_contact_date: Optional[date_type] = None
    intro: Optional[str] = None
    other_items: Optional[str] = None
    discount: Optional[float] = None
    shipping: Optional[float] = None
    shipping_method: Optional[str] = None
    freight_type: Optional[str] = None
    carrier_name: Optional[str] = None
    payment_terms: Optional[str] = None
    validity_days: Optional[int] = None
    delivery_date: Optional[date_type] = None
    delivery_desc: Optional[str] = None
    different_delivery_address: Optional[bool] = None
    delivery_address: Optional[dict] = None
    client_override: Optional[dict] = None
    notes: Optional[str] = None
    signature: Optional[str] = None
    internal_status: Optional[Literal["rascunho", "enviada"]] = None
    items: Optional[List[ProposalItemCreate]] = None


class LinkedCard(BaseModel):
    """Card de Serviço vinculado a uma proposta (N:N)."""
    card_id: int
    board_id: Optional[int] = None
    status: Literal["ganho", "perdido", "ativo"] = "ativo"
    title: Optional[str] = None


class ProposalVersionResponse(BaseModel):
    """Entrada do histórico: estado anterior arquivado de uma proposta."""
    id: int
    version_number: int
    changed_by: Optional[str] = None
    created_at: Optional[datetime] = None
    has_pdf: bool = False
    snapshot: Optional[dict] = None

    class Config:
        from_attributes = True


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
    linked_cards: List[LinkedCard] = Field(default_factory=list)  # cards vinculados (N:N)
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
