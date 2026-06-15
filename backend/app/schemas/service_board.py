"""
Schemas Pydantic para ServiceBoards, ServiceLists e ServiceCards.
"""
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator


# ─── Service Board ────────────────────────────────────────────────────────────

class ServiceBoardBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    color: Optional[str] = Field("#8B5CF6", max_length=50)
    icon: Optional[str] = Field("wrench", max_length=50)


class ServiceBoardCreate(ServiceBoardBase):
    pass


class ServiceBoardUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    color: Optional[str] = Field(None, max_length=50)
    icon: Optional[str] = Field(None, max_length=50)
    is_deleted: Optional[bool] = None


class ServiceBoardResponse(ServiceBoardBase):
    id: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    lists_count: Optional[int] = None
    cards_count: Optional[int] = None

    model_config = {"from_attributes": True}


class ServiceBoardListResponse(BaseModel):
    boards: List[ServiceBoardResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ServiceBoardDuplicateRequest(BaseModel):
    new_name: str = Field(..., min_length=1, max_length=255)
    copy_lists: bool = Field(True)


# ─── Service List ─────────────────────────────────────────────────────────────

class ServiceListBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    color: Optional[str] = Field(None, max_length=7)
    position: Optional[int] = Field(None)
    is_done_stage: Optional[bool] = Field(False)
    is_lost_stage: Optional[bool] = Field(False)


class ServiceListCreate(ServiceListBase):
    board_id: int


class ServiceListUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    color: Optional[str] = Field(None, max_length=7)
    position: Optional[int] = None
    is_done_stage: Optional[bool] = None
    is_lost_stage: Optional[bool] = None


class ServiceListMoveRequest(BaseModel):
    new_position: int


class ServiceListResponse(ServiceListBase):
    id: int
    board_id: int
    created_at: datetime
    updated_at: datetime
    cards_count: Optional[int] = None

    model_config = {"from_attributes": True}


# ─── Service Card ─────────────────────────────────────────────────────────────

class ServiceCardBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    due_date: Optional[datetime] = None
    contact_info: Optional[dict] = None
    payment_info: Optional[dict] = None
    business_info: Optional[dict] = None
    client_id: Optional[int] = None
    person_id: Optional[int] = None


class ServiceCardCreate(ServiceCardBase):
    list_id: int


class ServiceCardUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    list_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    due_date: Optional[datetime] = None
    contact_info: Optional[dict] = None
    payment_info: Optional[dict] = None
    business_info: Optional[dict] = None
    client_id: Optional[int] = None
    person_id: Optional[int] = None
    position: Optional[float] = None
    is_deleted: Optional[bool] = None


class ServiceCardMoveRequest(BaseModel):
    list_id: int
    position: Optional[float] = None


class ServiceCardResponse(ServiceCardBase):
    id: int
    list_id: int
    position: float
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    client_name: Optional[str] = None
    person_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    # Agregados para o card do kanban (estilo vendas)
    value: Optional[float] = None
    pending_status: Optional[str] = None   # overdue | today | future | none
    pending_count: Optional[int] = None
    is_stuck_3d: Optional[bool] = None
    collaborators: Optional[List[dict]] = None  # [{id, name}] — quem agiu no card

    model_config = {"from_attributes": True}


class ServiceCardListResponse(BaseModel):
    cards: List[ServiceCardResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ─── Service Card Product (Produtos no card de serviços) ──────────────────────

class ServiceCardProductBase(BaseModel):
    product_id: int = Field(..., description="ID do produto no catálogo")
    quantity: int = Field(..., ge=1, description="Quantidade")
    unit_price: float = Field(..., ge=0, description="Preço unitário")
    discount: float = Field(0, ge=0, description="Desconto em valor absoluto")
    notes: Optional[str] = Field(None, description="Observações sobre o produto")
    aparelhos: Optional[List[dict]] = Field(None, description="Sub-lista de aparelhos (dados do laboratório por unidade)")


class ServiceCardProductCreate(ServiceCardProductBase):
    pass


class ServiceCardProductUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=1)
    unit_price: Optional[float] = Field(None, ge=0)
    discount: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None
    aparelhos: Optional[List[dict]] = None


class ServiceCardProductResponse(ServiceCardProductBase):
    id: int
    service_card_id: int
    subtotal: float
    total: float
    # aparelhos herdado de ServiceCardProductBase
    created_at: datetime
    updated_at: datetime
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_category: Optional[str] = None

    @field_validator("unit_price", "discount", "subtotal", "total", mode="before")
    @classmethod
    def convert_decimal_to_float(cls, v):
        if isinstance(v, Decimal):
            return float(v)
        return v

    model_config = {"from_attributes": True}


class ServiceCardProductSummary(BaseModel):
    items: List[ServiceCardProductResponse]
    total_items: int
    subtotal: float
    total_discount: float
    total: float


# ─── Service Card Activity (Atividade / Anotação / Arquivo / Alteração) ────────

class ServiceCardActivityCreate(BaseModel):
    category: str = Field(..., description="atividade | anotacao")
    activity_type: Optional[str] = Field(None, description="call|task|follow_up|email|note|...")
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    priority: Optional[str] = Field(None, description="normal|high|urgent")
    due_date: Optional[datetime] = None
    activity_metadata: Optional[dict] = None


class ServiceCardActivityUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    activity_type: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    activity_metadata: Optional[dict] = None


class ServiceCardActivityComplete(BaseModel):
    is_completed: bool = True
    is_valid: Optional[bool] = None  # resultado da atividade (Válido / Não Válido)


class ServiceCardActivityResponse(BaseModel):
    id: int
    service_card_id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    category: str
    activity_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    activity_metadata: Optional[dict] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
