"""
Schemas Pydantic para API4COM (VOIP).
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ========== Config Schemas ==========

class API4ComConfigCreate(BaseModel):
    """Schema para criar configuração da API4COM."""
    email: EmailStr = Field(..., description="Email de login na API4COM")
    password: str = Field(..., min_length=6, description="Senha da conta API4COM")


class API4ComConfigUpdate(BaseModel):
    """Schema para atualizar configuração da API4COM."""
    email: Optional[EmailStr] = Field(None, description="Email de login na API4COM")
    password: Optional[str] = Field(None, min_length=6, description="Nova senha")
    is_active: Optional[bool] = Field(None, description="Se a integração está ativa")


class API4ComConfigResponse(BaseModel):
    """Schema de resposta da configuração."""
    id: int
    email: str
    is_active: bool
    has_valid_token: bool = Field(..., description="Se possui token válido e não expirado")
    token_expires_at: Optional[datetime] = None
    last_test_at: Optional[datetime] = None
    last_test_success: Optional[bool] = None
    last_test_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ========== Extension Schemas ==========

class UserExtensionCreate(BaseModel):
    """Schema para criar ramal de usuário."""
    user_id: int = Field(..., description="ID do usuário (vendedor)")
    extension: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Ramal do vendedor (ex: '1000')"
    )


class UserExtensionUpdate(BaseModel):
    """Schema para atualizar ramal de usuário."""
    extension: Optional[str] = Field(
        None,
        min_length=1,
        max_length=50,
        description="Novo ramal"
    )
    is_active: Optional[bool] = Field(None, description="Se o ramal está ativo")


class UserExtensionResponse(BaseModel):
    """Schema de resposta de ramal."""
    id: int
    user_id: int
    extension: str
    is_active: bool
    created_at: datetime

    # Dados do usuário (para exibição na listagem)
    user_name: Optional[str] = Field(None, description="Nome do usuário")
    user_email: Optional[str] = Field(None, description="Email do usuário")

    class Config:
        from_attributes = True


# ========== Test Connection ==========

class API4ComTestResponse(BaseModel):
    """Schema de resposta de teste de conexão com API4COM."""
    success: bool = Field(..., description="Se o teste foi bem-sucedido")
    message: str = Field(..., description="Mensagem descritiva do resultado")
    token_valid: bool = Field(..., description="Se o token está válido")
    error: Optional[str] = Field(None, description="Detalhes do erro, se houver")
