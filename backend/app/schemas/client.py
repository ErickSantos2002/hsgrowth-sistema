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

    # Campos do blueprint da consultora
    cnae: Optional[str] = Field(None, max_length=20, description="CNAE (Classificação Nacional de Atividades Econômicas)")
    linkedin_url: Optional[str] = Field(None, max_length=500, description="LinkedIn da empresa")
    relationship_type: Optional[str] = Field(None, max_length=50, description="Tipo de relacionamento (Cliente, Fornecedor, Lead, etc)")
    commercial_activity: Optional[str] = Field(None, max_length=50, description="Atividade comercial (Ativo, Dormente, Inativo)")
    sector: Optional[str] = Field(None, max_length=100, description="Setor/Indústria")
    employee_count: Optional[str] = Field(None, max_length=50, description="Número de colaboradores (faixa)")
    annual_revenue: Optional[str] = Field(None, max_length=50, description="Faturamento/Receita anual (faixa)")

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
                    "company_name": "Tech Solutions Ltda",
                    "document": "12345678000195",
                    "address": "Av. Paulista, 1000 - Sala 501",
                    "city": "São Paulo",
                    "state": "SP",
                    "country": "Brasil",
                    "website": "https://www.techsolutions.com.br",
                    "cnae": "6201-5/00",
                    "linkedin_url": "https://www.linkedin.com/company/techsolutions-br",
                    "relationship_type": "Lead",
                    "commercial_activity": "Ativo",
                    "sector": "Tecnologia",
                    "employee_count": "51-200",
                    "annual_revenue": "R$ 1M - R$ 5M",
                    "notes": "Cliente em potencial para projeto de consultoria estratégica",
                    "source": "pipedrive",
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

    # Campos do blueprint da consultora
    cnae: Optional[str] = Field(None, max_length=20, description="CNAE (Classificação Nacional de Atividades Econômicas)")
    linkedin_url: Optional[str] = Field(None, max_length=500, description="LinkedIn da empresa")
    relationship_type: Optional[str] = Field(None, max_length=50, description="Tipo de relacionamento (Cliente, Fornecedor, Lead, etc)")
    commercial_activity: Optional[str] = Field(None, max_length=50, description="Atividade comercial (Ativo, Dormente, Inativo)")
    sector: Optional[str] = Field(None, max_length=100, description="Setor/Indústria")
    employee_count: Optional[str] = Field(None, max_length=50, description="Número de colaboradores (faixa)")
    annual_revenue: Optional[str] = Field(None, max_length=50, description="Faturamento/Receita anual (faixa)")

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

    # Sobrescreve o EmailStr do ClientBase para aceitar e-mails mal formatados
    # que já existam no banco (ex: importações antigas com vírgula no lugar do ponto).
    # A validação estrita continua em ClientBase (create) e ClientUpdate.
    email: Optional[str] = Field(None, description="Email do cliente")

    model_config = {
        "from_attributes": True,  # Permite criar a partir de modelos SQLAlchemy
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "Maria Oliveira",
                    "email": "maria@novaera.com.br",
                    "phone": "21976543210",
                    "company_name": "Nova Era Consultoria Ltda",
                    "document": "98765432000110",
                    "address": "Rua da Assembleia, 50 - Centro",
                    "city": "Rio de Janeiro",
                    "state": "RJ",
                    "country": "Brasil",
                    "website": "https://www.novaera.com.br",
                    "cnae": "7020-4/00",
                    "linkedin_url": "https://www.linkedin.com/company/novaera-consultoria",
                    "relationship_type": "Cliente",
                    "commercial_activity": "Ativo",
                    "sector": "Consultoria Empresarial",
                    "employee_count": "11-50",
                    "annual_revenue": "R$ 500K - R$ 1M",
                    "notes": "Contrato de consultoria ativo desde janeiro/2026",
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
                            "name": "Carlos Mendes",
                            "email": "carlos@growthdigital.com.br",
                            "phone": "11991234567",
                            "company_name": "Growth Digital Marketing Ltda",
                            "document": "45678912000188",
                            "address": "Rua Oscar Freire, 2500 - Pinheiros",
                            "city": "São Paulo",
                            "state": "SP",
                            "country": "Brasil",
                            "website": "https://www.growthdigital.com.br",
                            "cnae": "7311-4/00",
                            "linkedin_url": "https://www.linkedin.com/company/growthdigital-br",
                            "relationship_type": "Cliente",
                            "commercial_activity": "Ativo",
                            "sector": "Marketing Digital",
                            "employee_count": "201-500",
                            "annual_revenue": "R$ 5M - R$ 10M",
                            "notes": "Parceiro estratégico de longa data",
                            "source": "pipedrive",
                            "is_active": True,
                            "created_at": "2025-11-20T14:30:00",
                            "updated_at": "2026-01-10T09:15:00",
                            "is_deleted": False
                        },
                        {
                            "id": 2,
                            "name": "Ana Beatriz Costa",
                            "email": "ana@varejo360.com.br",
                            "phone": "31987650000",
                            "company_name": "Varejo 360 S.A.",
                            "document": "33216549000172",
                            "address": "Av. Afonso Pena, 1500 - Funcionários",
                            "city": "Belo Horizonte",
                            "state": "MG",
                            "country": "Brasil",
                            "website": "https://www.varejo360.com.br",
                            "cnae": "4711-3/02",
                            "linkedin_url": "https://www.linkedin.com/company/varejo360",
                            "relationship_type": "Lead",
                            "commercial_activity": "Dormente",
                            "sector": "Varejo",
                            "employee_count": "501-1000",
                            "annual_revenue": "R$ 10M - R$ 50M",
                            "notes": "Interessada em consultoria de expansão regional",
                            "source": "manual",
                            "is_active": True,
                            "created_at": "2026-01-05T08:00:00",
                            "updated_at": "2026-01-05T08:00:00",
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
