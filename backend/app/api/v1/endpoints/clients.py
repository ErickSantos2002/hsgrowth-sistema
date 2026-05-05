"""
Endpoints de Clientes.
Rotas para gerenciamento de clientes (CRUD).
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, require_not_viewer
from app.services.client_service import ClientService
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse, ClientListResponse
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.client import Client

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
    page_size: int = Query(50, ge=1, le=10000, description="Tamanho da página"),
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

    # Converte para response schema (automaticamente pega todos os campos incluindo blueprint)
    return ClientResponse.model_validate(client)


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
    request: Request,
    client_data: ClientCreate,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de criação de cliente.
    """
    service = ClientService(db)
    client = service.create_client(client_data)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    data_after = {
        "id": client.id,
        "name": client.name,
        "email": client.email,
        "phone": client.phone,
        "company_name": client.company_name,
        "document": client.document,
        "city": client.city,
        "state": client.state,
    }

    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE",
        entity_type="Client",
        entity_id=client.id,
        description=f"Cliente criado: {client.name}",
        data_after=data_after,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    # Converte para response schema (automaticamente pega todos os campos incluindo blueprint)
    return ClientResponse.model_validate(client)


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
    request: Request,
    client_id: int,
    client_data: ClientUpdate,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza um cliente existente.
    """
    # Captura estado anterior ANTES de atualizar
    client_before_obj = db.query(Client).filter(Client.id == client_id).first()
    data_before = None
    if client_before_obj:
        data_before = {
            "name": client_before_obj.name,
            "email": client_before_obj.email,
            "phone": client_before_obj.phone,
            "company_name": client_before_obj.company_name,
            "document": client_before_obj.document,
            "city": client_before_obj.city,
            "state": client_before_obj.state,
            "is_active": client_before_obj.is_active,
        }

    service = ClientService(db)
    client = service.update_client(client_id, client_data)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    data_after = {
        "name": client.name,
        "email": client.email,
        "phone": client.phone,
        "company_name": client.company_name,
        "document": client.document,
        "city": client.city,
        "state": client.state,
        "is_active": client.is_active,
    }

    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE",
        entity_type="Client",
        entity_id=client.id,
        description=f"Cliente atualizado: {client.name}",
        data_before=data_before,
        data_after=data_after,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    # Converte para response schema (automaticamente pega todos os campos incluindo blueprint)
    return ClientResponse.model_validate(client)


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
    request: Request,
    client_id: int,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta um cliente (soft delete).
    """
    # Captura estado do cliente ANTES de deletar
    client_before_obj = db.query(Client).filter(Client.id == client_id).first()
    client_name = client_before_obj.name if client_before_obj else f"ID {client_id}"

    data_before = None
    if client_before_obj:
        data_before = {
            "id": client_before_obj.id,
            "name": client_before_obj.name,
            "email": client_before_obj.email,
            "phone": client_before_obj.phone,
            "company_name": client_before_obj.company_name,
            "document": client_before_obj.document,
            "city": client_before_obj.city,
            "state": client_before_obj.state,
        }

    service = ClientService(db)
    service.delete_client(client_id)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="DELETE",
        entity_type="Client",
        entity_id=client_id,
        description=f"Cliente deletado: {client_name}",
        data_before=data_before,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Cliente deletado com sucesso"}


@router.get(
    "/cnpj/{cnpj}",
    summary="Buscar dados de CNPJ na Receita Federal",
    description="Consulta os dados públicos de um CNPJ via BrasilAPI. Retorna razão social, endereço, CNAE, etc."
)
async def lookup_cnpj(
    cnpj: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    import httpx
    import re

    digits = re.sub(r"\D", "", cnpj)
    if len(digits) != 14:
        raise HTTPException(status_code=400, detail="CNPJ deve ter 14 dígitos.")

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(f"https://brasilapi.com.br/api/cnpj/v1/{digits}")
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Não foi possível conectar à BrasilAPI.")

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="CNPJ não encontrado na Receita Federal.")
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Erro ao consultar a Receita Federal.")

    return response.json()
