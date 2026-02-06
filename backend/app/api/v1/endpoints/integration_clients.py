"""
Endpoints para gerenciar Integration Clients (apenas Admin).
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_active_user
from app.services.integration_client_service import IntegrationClientService


router = APIRouter()


# Schemas
class CreateIntegrationClientRequest(BaseModel):
    """Request para criar um novo integration client."""
    name: str = Field(..., min_length=3, max_length=200, description="Nome descritivo do client")
    description: str = Field(None, description="Descrição do que essa integração faz")
    impersonate_user_id: int = Field(None, description="ID do usuário que será usado como criador nas ações")


class IntegrationClientResponse(BaseModel):
    """Response com dados do integration client."""
    id: int
    name: str
    description: str | None
    client_id: str
    impersonate_user_id: int | None
    is_active: bool
    last_used_at: str | None
    created_at: str

    model_config = {"from_attributes": True}


class CreateIntegrationClientResponse(IntegrationClientResponse):
    """Response ao criar um client (inclui o secret - única vez!)."""
    client_secret: str = Field(..., description="Client secret - GUARDE EM LOCAL SEGURO! Não será mostrado novamente.")


# Dependency para verificar se é admin
def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Verifica se o usuário atual é admin."""
    if current_user.role.name.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem gerenciar integration clients"
        )
    return current_user


@router.post(
    "/",
    response_model=CreateIntegrationClientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar integration client",
    description="""
    Cria um novo integration client para autenticação via client_credentials (OAuth2).

    **Importante:**
    - O `client_secret` é mostrado apenas **UMA VEZ** na resposta
    - Guarde o secret em local seguro (variáveis de ambiente, vault, etc.)
    - Se perder o secret, será necessário criar um novo client

    **Fluxo de uso:**
    1. Criar o client via este endpoint
    2. Guardar o `client_id` e `client_secret` retornados
    3. Usar essas credenciais no endpoint `/auth/client-credentials` para obter token JWT
    4. Usar o token JWT como Bearer token em todas as requisições

    **Parâmetros:**
    - `name`: Nome descritivo do client (ex: "N8N Automação")
    - `description`: Descrição do que a integração faz
    - `impersonate_user_id`: ID do usuário que será usado como "criador" nas ações realizadas pela integração

    **Permissões:** Apenas Admin
    """,
    responses={
        201: {
            "description": "Integration client criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "N8N Automação",
                        "description": "Client para automações do N8N",
                        "client_id": "hsg_abc123def456",
                        "client_secret": "secret_xyz789abc012def345",
                        "impersonate_user_id": 1,
                        "is_active": True,
                        "last_used_at": None,
                        "created_at": "2026-01-15T10:00:00"
                    }
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas admin",
            "content": {
                "application/json": {
                    "example": {"detail": "Apenas administradores podem gerenciar integration clients"}
                }
            }
        },
        422: {
            "description": "Dados inválidos",
            "content": {
                "application/json": {
                    "example": {"detail": "Erro de validação nos dados enviados"}
                }
            }
        }
    }
)
def create_integration_client(
    data: CreateIntegrationClientRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Cria um novo integration client para autenticação via client_credentials.

    **Importante:**
    - O client_secret é mostrado apenas UMA VEZ
    - Guarde o client_secret em local seguro (ex: variáveis de ambiente, vault)
    - Se perder o secret, será necessário criar um novo client
    """
    service = IntegrationClientService(db)

    # Cria o client
    client, client_secret = service.create_client(
        name=data.name,
        description=data.description,
        impersonate_user_id=data.impersonate_user_id
    )

    # Retorna com o secret (única vez!)
    return CreateIntegrationClientResponse(
        id=client.id,
        name=client.name,
        description=client.description,
        client_id=client.client_id,
        client_secret=client_secret,  # Única vez que será mostrado!
        impersonate_user_id=client.impersonate_user_id,
        is_active=client.is_active,
        last_used_at=client.last_used_at.isoformat() if client.last_used_at else None,
        created_at=client.created_at.isoformat()
    )


@router.get(
    "/",
    response_model=List[IntegrationClientResponse],
    summary="Listar integration clients",
    description="""
    Lista todos os integration clients cadastrados no sistema.

    **Retorna:**
    - Lista com todos os clients (ativos e inativos)
    - **Não inclui** o `client_secret` (exibido apenas na criação)

    **Permissões:** Apenas Admin
    """,
    responses={
        200: {
            "description": "Lista de integration clients",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "name": "N8N Automação",
                            "description": "Client para automações do N8N",
                            "client_id": "hsg_abc123def456",
                            "impersonate_user_id": 1,
                            "is_active": True,
                            "last_used_at": "2026-01-15T14:30:00",
                            "created_at": "2026-01-10T10:00:00"
                        },
                        {
                            "id": 2,
                            "name": "Zapier Webhook",
                            "description": "Client para integrações Zapier",
                            "client_id": "hsg_def789ghi012",
                            "impersonate_user_id": 1,
                            "is_active": False,
                            "last_used_at": None,
                            "created_at": "2026-01-12T09:00:00"
                        }
                    ]
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas admin",
            "content": {
                "application/json": {
                    "example": {"detail": "Apenas administradores podem gerenciar integration clients"}
                }
            }
        }
    }
)
def list_integration_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Lista todos os integration clients cadastrados."""
    service = IntegrationClientService(db)
    clients = service.list_all()

    return [
        IntegrationClientResponse(
            id=client.id,
            name=client.name,
            description=client.description,
            client_id=client.client_id,
            impersonate_user_id=client.impersonate_user_id,
            is_active=client.is_active,
            last_used_at=client.last_used_at.isoformat() if client.last_used_at else None,
            created_at=client.created_at.isoformat()
        )
        for client in clients
    ]


@router.post(
    "/{client_id}/deactivate",
    response_model=IntegrationClientResponse,
    summary="Desativar integration client",
    description="""
    Desativa um integration client. Após desativado, o client **não poderá mais se autenticar**.

    **Parâmetros:**
    - `client_id`: ID numérico do integration client

    **Comportamento:**
    - O client continua existindo no banco de dados
    - Pode ser reativado posteriormente via endpoint de ativação
    - Tokens já emitidos continuam válidos até expirar

    **Permissões:** Apenas Admin
    """,
    responses={
        200: {
            "description": "Client desativado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "N8N Automação",
                        "client_id": "hsg_abc123def456",
                        "is_active": False,
                        "last_used_at": "2026-01-15T14:30:00",
                        "created_at": "2026-01-10T10:00:00"
                    }
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas admin",
            "content": {
                "application/json": {
                    "example": {"detail": "Apenas administradores podem gerenciar integration clients"}
                }
            }
        },
        404: {
            "description": "Client não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Integration client não encontrado"}
                }
            }
        }
    }
)
def deactivate_integration_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Desativa um integration client (ele não poderá mais se autenticar)."""
    service = IntegrationClientService(db)
    client = service.deactivate(client_id)

    return IntegrationClientResponse(
        id=client.id,
        name=client.name,
        description=client.description,
        client_id=client.client_id,
        impersonate_user_id=client.impersonate_user_id,
        is_active=client.is_active,
        last_used_at=client.last_used_at.isoformat() if client.last_used_at else None,
        created_at=client.created_at.isoformat()
    )


@router.post(
    "/{client_id}/activate",
    response_model=IntegrationClientResponse,
    summary="Ativar integration client",
    description="""
    Reativa um integration client que foi desativado anteriormente.

    **Parâmetros:**
    - `client_id`: ID numérico do integration client

    **Comportamento:**
    - O client volta a poder se autenticar normalmente
    - As credenciais (client_id/client_secret) permanecem as mesmas

    **Permissões:** Apenas Admin
    """,
    responses={
        200: {
            "description": "Client ativado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "N8N Automação",
                        "client_id": "hsg_abc123def456",
                        "is_active": True,
                        "last_used_at": "2026-01-15T14:30:00",
                        "created_at": "2026-01-10T10:00:00"
                    }
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas admin",
            "content": {
                "application/json": {
                    "example": {"detail": "Apenas administradores podem gerenciar integration clients"}
                }
            }
        },
        404: {
            "description": "Client não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Integration client não encontrado"}
                }
            }
        }
    }
)
def activate_integration_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Ativa um integration client desativado."""
    service = IntegrationClientService(db)
    client = service.activate(client_id)

    return IntegrationClientResponse(
        id=client.id,
        name=client.name,
        description=client.description,
        client_id=client.client_id,
        impersonate_user_id=client.impersonate_user_id,
        is_active=client.is_active,
        last_used_at=client.last_used_at.isoformat() if client.last_used_at else None,
        created_at=client.created_at.isoformat()
    )


@router.delete(
    "/{client_id}",
    summary="Deletar integration client permanentemente",
    description="""
    Deleta permanentemente um integration client do sistema.

    **Parâmetros:**
    - `client_id`: ID numérico do integration client

    **Atenção:** Esta ação é **irreversível**! O client e suas credenciais serão removidos permanentemente. Prefira **desativar** ao invés de deletar.

    **Permissões:** Apenas Admin
    """,
    responses={
        200: {
            "description": "Client deletado com sucesso",
            "content": {
                "application/json": {
                    "example": {"message": "Integration client deletado com sucesso"}
                }
            }
        },
        403: {
            "description": "Acesso negado - apenas admin",
            "content": {
                "application/json": {
                    "example": {"detail": "Apenas administradores podem gerenciar integration clients"}
                }
            }
        },
        404: {
            "description": "Client não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Integration client não encontrado"}
                }
            }
        }
    }
)
def delete_integration_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Deleta permanentemente um integration client.

    **Atenção:** Esta ação é irreversível! Prefira desativar ao invés de deletar.
    """
    service = IntegrationClientService(db)
    service.delete(client_id)

    return {"message": "Integration client deletado com sucesso"}
