"""
Endpoints de Clientes.
Rotas para gerenciamento de clientes (CRUD).
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.client_service import ClientService
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse, ClientListResponse
from app.models.user import User

router = APIRouter()


@router.get(
    "",
    response_model=ClientListResponse,
    summary="Listar clientes",
    description="""
    Lista todos os clientes do sistema com paginação.

    **Filtros disponíveis:**
    - `page`: Número da página (padrão: 1, mínimo: 1)
    - `page_size`: Quantidade de clientes por página (padrão: 50, máximo: 100)
    - `is_active`: Filtrar por status ativo (true/false, opcional)
    - `search`: Buscar por nome, email, empresa, telefone ou documento
    - `state`: Filtrar por estado (UF)

    **Resposta:**
    - Lista de clientes com todos os dados
    - Metadados de paginação (total, páginas, página atual)
    - Clientes deletados (soft delete) não são retornados

    **Ordenação:**
    - Por padrão ordenado por `created_at` (mais recentes primeiro)
    """,
    responses={
        200: {
            "description": "Lista de clientes retornada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "clients": [
                            {
                                "id": 1,
                                "name": "João Silva",
                                "email": "joao@empresa.com",
                                "phone": "11987654321",
                                "company_name": "Empresa LTDA",
                                "city": "São Paulo",
                                "state": "SP",
                                "is_active": True,
                                "created_at": "2026-01-15T10:00:00"
                            }
                        ],
                        "total": 15,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 1
                    }
                }
            }
        },
        401: {
            "description": "Não autenticado",
            "content": {"application/json": {"example": {"detail": "Not authenticated"}}}
        }
    }
)
async def list_clients(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    search: Optional[str] = Query(None, description="Buscar por nome, email, empresa, telefone ou documento"),
    state: Optional[str] = Query(None, max_length=2, description="Filtrar por estado (UF)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de listagem de clientes.
    """
    service = ClientService(db)
    return service.list_clients(
        page=page,
        page_size=page_size,
        is_active=is_active,
        search=search,
        state=state
    )


@router.get(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Buscar cliente por ID",
    description="""
    Busca um cliente específico por ID.

    **Parâmetros:**
    - `client_id`: ID do cliente

    **Resposta:**
    - Dados completos do cliente
    - Inclui todos os campos (nome, email, telefone, empresa, endereço, etc)

    **Erros:**
    - 404: Cliente não encontrado
    - 401: Não autenticado
    """
)
async def get_client(
    client_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca um cliente por ID.
    """
    service = ClientService(db)
    client = service.get_client_by_id(client_id)

    # Converte para response schema
    return ClientResponse(
        id=client.id,
        name=client.name,
        email=client.email,
        phone=client.phone,
        company_name=client.company_name,
        document=client.document,
        address=client.address,
        city=client.city,
        state=client.state,
        country=client.country,
        website=client.website,
        notes=client.notes,
        source=client.source,
        is_active=client.is_active,
        created_at=client.created_at,
        updated_at=client.updated_at,
        is_deleted=client.is_deleted
    )


@router.post(
    "",
    response_model=ClientResponse,
    summary="Criar cliente",
    description="""
    Cria um novo cliente no sistema.

    **Campos obrigatórios:**
    - `name`: Nome do contato (obrigatório)

    **Campos opcionais:**
    - `email`: Email do cliente
    - `phone`: Telefone (apenas números)
    - `company_name`: Nome fantasia da empresa
    - `document`: CPF ou CNPJ (apenas números)
    - `address`: Endereço completo
    - `city`: Cidade
    - `state`: UF (2 caracteres)
    - `country`: País (padrão: Brasil)
    - `website`: Website (deve incluir http:// ou https://)
    - `notes`: Observações
    - `source`: Origem (pipedrive, manual, etc)
    - `is_active`: Status ativo/inativo (padrão: true)

    **Validações:**
    - Email deve ser único no sistema (se fornecido)
    - Documento deve ser único no sistema (se fornecido)
    - Email deve ter formato válido

    **Segurança:**
    - Requer autenticação
    """,
    status_code=201,
    responses={
        201: {
            "description": "Cliente criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 10,
                        "name": "Maria Santos",
                        "email": "maria@empresa.com",
                        "phone": "11987654321",
                        "company_name": "Empresa LTDA",
                        "is_active": True,
                        "created_at": "2026-01-15T15:30:00"
                    }
                }
            }
        },
        400: {
            "description": "Email ou documento já cadastrado",
            "content": {
                "application/json": {
                    "examples": {
                        "email_exists": {"value": {"detail": "Email já cadastrado"}},
                        "document_exists": {"value": {"detail": "Documento já cadastrado"}}
                    }
                }
            }
        },
        401: {
            "description": "Não autenticado",
            "content": {"application/json": {"example": {"detail": "Not authenticated"}}}
        }
    }
)
async def create_client(
    client_data: ClientCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de criação de cliente.
    """
    service = ClientService(db)
    client = service.create_client(client_data)

    # Converte para response schema
    return ClientResponse(
        id=client.id,
        name=client.name,
        email=client.email,
        phone=client.phone,
        company_name=client.company_name,
        document=client.document,
        address=client.address,
        city=client.city,
        state=client.state,
        country=client.country,
        website=client.website,
        notes=client.notes,
        source=client.source,
        is_active=client.is_active,
        created_at=client.created_at,
        updated_at=client.updated_at,
        is_deleted=client.is_deleted
    )


@router.put(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Atualizar cliente",
    description="""
    Atualiza um cliente existente.

    **Parâmetros:**
    - `client_id`: ID do cliente

    **Campos atualizáveis:**
    - Todos os campos são opcionais
    - Apenas os campos fornecidos serão atualizados

    **Validações:**
    - Email deve ser único (se alterado)
    - Documento deve ser único (se alterado)

    **Erros:**
    - 404: Cliente não encontrado
    - 400: Email ou documento já cadastrado
    - 401: Não autenticado
    """
)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza um cliente existente.
    """
    service = ClientService(db)
    client = service.update_client(client_id, client_data)

    # Converte para response schema
    return ClientResponse(
        id=client.id,
        name=client.name,
        email=client.email,
        phone=client.phone,
        company_name=client.company_name,
        document=client.document,
        address=client.address,
        city=client.city,
        state=client.state,
        country=client.country,
        website=client.website,
        notes=client.notes,
        source=client.source,
        is_active=client.is_active,
        created_at=client.created_at,
        updated_at=client.updated_at,
        is_deleted=client.is_deleted
    )


@router.delete(
    "/{client_id}",
    summary="Deletar cliente",
    description="""
    Deleta um cliente (soft delete).

    **Parâmetros:**
    - `client_id`: ID do cliente

    **Comportamento:**
    - Soft delete: o registro não é removido do banco, apenas marcado como deletado
    - O cliente não aparecerá mais nas listagens
    - Os cards associados ao cliente não são afetados

    **Erros:**
    - 404: Cliente não encontrado
    - 401: Não autenticado
    """
)
async def delete_client(
    client_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta um cliente (soft delete).
    """
    service = ClientService(db)
    service.delete_client(client_id)

    return {"message": "Cliente deletado com sucesso"}
