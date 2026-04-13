"""
Schemas Pydantic para EmailTemplate.
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class EmailTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Nome do template")
    subject: str = Field(..., min_length=1, max_length=500, description="Assunto do e-mail")
    body: str = Field(..., min_length=1, description="Corpo do e-mail")
    is_active: bool = Field(True, description="Se ativo, aparece na lista de seleção")


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    subject: Optional[str] = Field(None, min_length=1, max_length=500)
    body: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None


class EmailTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    subject: str
    body: str
    is_active: bool
    created_by_id: Optional[int]
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
