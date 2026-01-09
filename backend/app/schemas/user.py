"""
Schemas Pydantic para Usuários.
Define os modelos de entrada/saída para operações com usuários.
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """
    Schema base de usuário (campos comuns).
    """
    email: EmailStr = Field(..., description="Email do usuário")
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Nome de usuário")
    name: str = Field(..., min_length=3, max_length=255, description="Nome completo")
    avatar_url: Optional[str] = Field(None, max_length=500, description="URL do avatar")
    phone: Optional[str] = Field(None, max_length=20, description="Telefone")


class UserCreate(UserBase):
    """
    Schema para criação de usuário.
    """
    password: str = Field(..., min_length=6, description="Senha do usuário")
    role_id: int = Field(..., description="ID do role/função")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "usuario@example.com",
                    "username": "usuario123",
                    "name": "João da Silva",
                    "password": "senha123",
                    "role_id": 2,
                    "phone": "(11) 99999-9999"
                }
            ]
        }
    }


class UserUpdate(BaseModel):
    """
    Schema para atualização de usuário (todos os campos opcionais).
    """
    email: Optional[EmailStr] = Field(None, description="Email do usuário")
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Nome de usuário")
    name: Optional[str] = Field(None, min_length=3, max_length=255, description="Nome completo")
    avatar_url: Optional[str] = Field(None, max_length=500, description="URL do avatar")
    phone: Optional[str] = Field(None, max_length=20, description="Telefone")
    password: Optional[str] = Field(None, min_length=6, description="Nova senha")
    role_id: Optional[int] = Field(None, description="ID do role/função")
    is_active: Optional[bool] = Field(None, description="Status ativo/inativo")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "João da Silva Atualizado",
                    "phone": "(11) 98888-8888",
                    "avatar_url": "https://example.com/avatar.jpg"
                }
            ]
        }
    }


class UserResponse(UserBase):
    """
    Schema de resposta de usuário (sem senha).
    """
    id: int = Field(..., description="ID do usuário")
    role_id: int = Field(..., description="ID do role")
    is_active: bool = Field(..., description="Status ativo/inativo")
    last_login_at: Optional[datetime] = Field(None, description="Último login")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")

    # Campos relacionados (opcional, podem ser expandidos depois)
    role: Optional[str] = Field(None, description="Role do usuário (admin/manager/salesperson)")
    role_name: Optional[str] = Field(None, description="Nome do role")

    model_config = {
        "from_attributes": True,  # Permite criar a partir de modelos SQLAlchemy
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "email": "usuario@example.com",
                    "username": "usuario123",
                    "name": "João da Silva",
                    "avatar_url": "https://example.com/avatar.jpg",
                    "phone": "(11) 99999-9999",
                    "role_id": 2,
                    "is_active": True,
                    "last_login_at": "2026-01-05T10:30:00",
                    "created_at": "2026-01-01T08:00:00",
                    "updated_at": "2026-01-05T10:30:00",
                    "role_name": "Vendedor"
                }
            ]
        }
    }


class UserListResponse(BaseModel):
    """
    Schema para listagem paginada de usuários.
    """
    users: list[UserResponse] = Field(..., description="Lista de usuários")
    total: int = Field(..., description="Total de usuários")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Tamanho da página")
    total_pages: int = Field(..., description="Total de páginas")


class ChangePasswordRequest(BaseModel):
    """
    Schema para mudança de senha (usuário autenticado).
    """
    current_password: str = Field(..., description="Senha atual")
    new_password: str = Field(..., min_length=6, description="Nova senha")
