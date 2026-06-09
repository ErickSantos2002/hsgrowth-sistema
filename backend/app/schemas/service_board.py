"""
Schemas Pydantic para ServiceBoards, ServiceLists e ServiceCards.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


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

    model_config = {"from_attributes": True}


class ServiceCardListResponse(BaseModel):
    cards: List[ServiceCardResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
