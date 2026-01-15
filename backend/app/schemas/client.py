"""
Schemas Pydantic para Clientes.
Define os modelos de entrada/saída para operações com clientes.
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class ClientBase(BaseModel):
    """
    Schema base de cliente (campos comuns).
    """
    name: str = Field(..., min_length=1, max_length=255, description="Nome do contato")
    email: Optional[EmailStr] = Field(None, description="Email do cliente")
    phone: Optional[str] = Field(None, max_length=20, description="Telefone")
    company_name: Optional[str] = Field(None, max_length=255, description="Razão social")
    document: Optional[str] = Field(None, max_length=20, description="CPF ou CNPJ (apenas números)")
    address: Optional[str] = Field(None, description="Endereço completo")
    city: Optional[str] = Field(None, max_length=100, description="Cidade")
    state: Optional[str] = Field(None, max_length=2, description="UF (ex: SP, RJ)")
    country: Optional[str] = Field(None, max_length=100, description="País")
    website: Optional[str] = Field(None, max_length=255, description="Website")
    notes: Optional[str] = Field(None, description="Observações")
    source: Optional[str] = Field(None, max_length=50, description="Origem (pipedrive, manual, etc)")
    is_active: bool = Field(True, description="Cliente ativo/inativo")


class ClientCreate(ClientBase):
    """
    Schema para criação de cliente.
    """
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "João Silva",
                    "email": "joao@empresa.com",
                    "phone": "11987654321",
                    "company_name": "Empresa LTDA",
                    "document": "12345678901234",
                    "address": "Rua das Flores, 123",
                    "city": "São Paulo",
                    "state": "SP",
                    "country": "Brasil",
                    "website": "https://www.empresa.com.br",
                    "notes": "Cliente em potencial para projeto X",
                    "is_active": True
                }
            ]
        }
    }


class ClientUpdate(BaseModel):
    """
    Schema para atualização de cliente (todos os campos opcionais).
    """
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Nome do contato")
    email: Optional[EmailStr] = Field(None, description="Email do cliente")
    phone: Optional[str] = Field(None, max_length=20, description="Telefone")
    company_name: Optional[str] = Field(None, max_length=255, description="Razão social")
    document: Optional[str] = Field(None, max_length=20, description="CPF ou CNPJ (apenas números)")
    address: Optional[str] = Field(None, description="Endereço completo")
    city: Optional[str] = Field(None, max_length=100, description="Cidade")
    state: Optional[str] = Field(None, max_length=2, description="UF (ex: SP, RJ)")
    country: Optional[str] = Field(None, max_length=100, description="País")
    website: Optional[str] = Field(None, max_length=255, description="Website")
    notes: Optional[str] = Field(None, description="Observações")
    source: Optional[str] = Field(None, max_length=50, description="Origem (pipedrive, manual, etc)")
    is_active: Optional[bool] = Field(None, description="Cliente ativo/inativo")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "João Silva Atualizado",
                    "phone": "11988888888",
                    "notes": "Cliente fechou contrato"
                }
            ]
        }
    }


class ClientResponse(ClientBase):
    """
    Schema de resposta de cliente.
    """
    id: int = Field(..., description="ID do cliente")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")
    is_deleted: bool = Field(..., description="Flag de soft delete")

    model_config = {
        "from_attributes": True,  # Permite criar a partir de modelos SQLAlchemy
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "João Silva",
                    "email": "joao@empresa.com",
                    "phone": "11987654321",
                    "company_name": "Empresa LTDA",
                    "document": "12345678901234",
                    "address": "Rua das Flores, 123",
                    "city": "São Paulo",
                    "state": "SP",
                    "country": "Brasil",
                    "website": "https://www.empresa.com.br",
                    "notes": "Cliente em potencial",
                    "source": "manual",
                    "is_active": True,
                    "created_at": "2026-01-15T10:00:00",
                    "updated_at": "2026-01-15T10:00:00",
                    "is_deleted": False
                }
            ]
        }
    }


class ClientListResponse(BaseModel):
    """
    Schema de resposta para lista de clientes com paginação.
    """
    clients: list[ClientResponse] = Field(..., description="Lista de clientes")
    total: int = Field(..., description="Total de clientes")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Tamanho da página")
    total_pages: int = Field(..., description="Total de páginas")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "clients": [
                        {
                            "id": 1,
                            "name": "João Silva",
                            "email": "joao@empresa.com",
                            "phone": "11987654321",
                            "company_name": "Empresa LTDA",
                            "document": "12345678901234",
                            "city": "São Paulo",
                            "state": "SP",
                            "is_active": True,
                            "created_at": "2026-01-15T10:00:00",
                            "updated_at": "2026-01-15T10:00:00",
                            "is_deleted": False
                        }
                    ],
                    "total": 15,
                    "page": 1,
                    "page_size": 50,
                    "total_pages": 1
                }
            ]
        }
    }
