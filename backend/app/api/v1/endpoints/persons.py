"""
Endpoints de Pessoas/Contatos.
Rotas para gerenciamento de pessoas (CRUD).
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.person_service import PersonService
from app.schemas.person import PersonCreate, PersonUpdate, PersonResponse, PersonListResponse
from app.models.user import User

router = APIRouter()


@router.get(
    "",
    response_model=PersonListResponse,
    summary="Listar pessoas",
    description="""
    Lista todas as pessoas do sistema com paginação.

    **Filtros disponíveis:**
    - `page`: Número da página (padrão: 1, mínimo: 1)
    - `page_size`: Quantidade de pessoas por página (padrão: 50, máximo: 100)
    - `is_active`: Filtrar por status ativo (true/false, opcional)
    - `search`: Buscar por nome, email, telefone ou cargo
    - `organization_id`: Filtrar por organização (cliente)
    - `owner_id`: Filtrar por responsável (usuário)

    **Resposta:**
    - Lista de pessoas com todos os dados
    - Metadados de paginação (total, páginas, página atual)

    **Ordenação:**
    - Por padrão ordenado por `name` (alfabética)
    """,
    responses={
        200: {
            "description": "Lista de pessoas retornada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "persons": [
                            {
                                "id": 1,
                                "name": "Maria Silva",
                                "email_commercial": "maria@empresa.com",
                                "phone_whatsapp": "11987654321",
                                "position": "Gerente de Compras",
                                "organization_id": 1,
                                "is_active": True,
                                "created_at": "2026-01-29T10:00:00"
                            }
                        ],
                        "total": 4043,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 81
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
async def list_persons(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=10000, description="Tamanho da página"),
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    search: Optional[str] = Query(None, description="Buscar por nome, email, telefone ou cargo"),
    organization_id: Optional[int] = Query(None, description="Filtrar por organização"),
    owner_id: Optional[int] = Query(None, description="Filtrar por responsável"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de listagem de pessoas.
    """
    service = PersonService(db)
    return service.list_persons(
        page=page,
        page_size=page_size,
        is_active=is_active,
        search=search,
        organization_id=organization_id,
        owner_id=owner_id
    )


@router.get(
    "/{person_id}",
    response_model=PersonResponse,
    summary="Buscar pessoa por ID",
    description="""
    Busca uma pessoa específica por ID.

    **Parâmetros:**
    - `person_id`: ID da pessoa

    **Resposta:**
    - Dados completos da pessoa
    - Inclui todos os campos (nome, emails, telefones, cargo, redes sociais, etc)

    **Erros:**
    - 404: Pessoa não encontrada
    - 401: Não autenticado
    """
)
async def get_person(
    person_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca uma pessoa por ID.
    """
    service = PersonService(db)
    person = service.get_person_by_id(person_id)

    # Converte para response schema
    return PersonResponse.model_validate(person)


@router.post(
    "",
    response_model=PersonResponse,
    summary="Criar pessoa",
    description="""
    Cria uma nova pessoa no sistema.

    **Campos obrigatórios:**
    - `name`: Nome completo (obrigatório)

    **Campos opcionais - Informações básicas:**
    - `first_name`: Primeiro nome
    - `last_name`: Sobrenome

    **Campos opcionais - Emails:**
    - `email`: Email principal (legado)
    - `email_commercial`: Email comercial
    - `email_personal`: Email pessoal
    - `email_alternative`: Email alternativo

    **Campos opcionais - Telefones:**
    - `phone`: Telefone principal (legado)
    - `phone_commercial`: Telefone comercial
    - `phone_whatsapp`: Celular/WhatsApp
    - `phone_alternative`: Telefone alternativo

    **Campos opcionais - Profissional:**
    - `position`: Cargo
    - `organization_id`: ID da organização (cliente)
    - `owner_id`: ID do responsável (usuário)

    **Campos opcionais - Redes sociais:**
    - `linkedin`: LinkedIn URL
    - `instagram`: Instagram URL
    - `facebook`: Facebook URL

    **Campos opcionais - Controle:**
    - `is_active`: Status ativo/inativo (padrão: true)
    - `pipedrive_id`: ID no Pipedrive (integração)

    **Validações:**
    - Todos os emails devem ser únicos no sistema (se fornecidos)
    - Emails devem ter formato válido

    **Segurança:**
    - Requer autenticação
    """,
    status_code=201,
    responses={
        201: {
            "description": "Pessoa criada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 100,
                        "name": "Carlos Oliveira",
                        "email_commercial": "carlos@empresa.com",
                        "phone_whatsapp": "11987654321",
                        "position": "Diretor Comercial",
                        "is_active": True,
                        "created_at": "2026-01-29T15:30:00"
                    }
                }
            }
        },
        400: {
            "description": "Email já cadastrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Email carlos@empresa.com já cadastrado"}
                }
            }
        },
        401: {
            "description": "Não autenticado",
            "content": {"application/json": {"example": {"detail": "Not authenticated"}}}
        }
    }
)
async def create_person(
    person_data: PersonCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de criação de pessoa.
    """
    service = PersonService(db)
    person = service.create_person(person_data)

    # Converte para response schema
    return PersonResponse.model_validate(person)


@router.put(
    "/{person_id}",
    response_model=PersonResponse,
    summary="Atualizar pessoa",
    description="""
    Atualiza uma pessoa existente.

    **Parâmetros:**
    - `person_id`: ID da pessoa

    **Campos atualizáveis:**
    - Todos os campos são opcionais
    - Apenas os campos fornecidos serão atualizados

    **Validações:**
    - Emails devem ser únicos (se alterados)

    **Erros:**
    - 404: Pessoa não encontrada
    - 400: Email já cadastrado
    - 401: Não autenticado
    """
)
async def update_person(
    person_id: int,
    person_data: PersonUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza uma pessoa existente.
    """
    service = PersonService(db)
    person = service.update_person(person_id, person_data)

    # Converte para response schema
    return PersonResponse.model_validate(person)


@router.delete(
    "/{person_id}",
    summary="Deletar pessoa",
    description="""
    Deleta uma pessoa.

    **Parâmetros:**
    - `person_id`: ID da pessoa

    **Comportamento:**
    - Hard delete: o registro é removido do banco
    - Os cards associados à pessoa não são afetados (person_id fica NULL)

    **Erros:**
    - 404: Pessoa não encontrada
    - 401: Não autenticado
    """
)
async def delete_person(
    person_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta uma pessoa.
    """
    service = PersonService(db)
    service.delete_person(person_id)

    return {"message": "Pessoa deletada com sucesso"}


@router.patch(
    "/{person_id}/status",
    response_model=PersonResponse,
    summary="Alterar status da pessoa",
    description="""
    Ativa ou desativa uma pessoa.

    **Parâmetros:**
    - `person_id`: ID da pessoa
    - `is_active`: Novo status (true/false)

    **Comportamento:**
    - Pessoas inativas não aparecem nas buscas por padrão
    - Útil para manter histórico sem deletar

    **Erros:**
    - 404: Pessoa não encontrada
    - 401: Não autenticado
    """
)
async def set_person_status(
    person_id: int,
    is_active: bool = Query(..., description="Novo status (true/false)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Altera o status ativo/inativo de uma pessoa.
    """
    service = PersonService(db)
    person = service.set_active_status(person_id, is_active)

    # Converte para response schema
    return PersonResponse.model_validate(person)


@router.get(
    "/organization/{organization_id}",
    response_model=list[PersonResponse],
    summary="Listar pessoas de uma organização",
    description="""
    Busca todas as pessoas ativas de uma organização específica.

    **Parâmetros:**
    - `organization_id`: ID da organização (cliente)

    **Resposta:**
    - Lista de pessoas da organização
    - Apenas pessoas ativas
    - Ordenadas alfabeticamente por nome

    **Erros:**
    - 401: Não autenticado
    """
)
async def get_persons_by_organization(
    organization_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca todas as pessoas de uma organização.
    """
    service = PersonService(db)
    persons = service.get_persons_by_organization(organization_id)

    # Converte para response schema
    return [PersonResponse.model_validate(person) for person in persons]
