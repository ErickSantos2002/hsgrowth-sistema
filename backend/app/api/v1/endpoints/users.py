"""
Endpoints de Usuários.
Rotas para gerenciamento de usuários (CRUD).
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.user_service import UserService
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse, ChangePasswordRequest
from app.models.user import User

router = APIRouter()


@router.get(
    "",
    response_model=UserListResponse,
    summary="Listar usuários",
    description="""
    Lista todos os usuários da conta do usuário autenticado com paginação.

    **Filtros disponíveis:**
    - `page`: Número da página (padrão: 1, mínimo: 1)
    - `page_size`: Quantidade de usuários por página (padrão: 50, máximo: 100)
    - `is_active`: Filtrar por status ativo (true/false, opcional)

    **Multi-tenancy:**
    - Retorna apenas usuários da mesma conta do usuário autenticado
    - Isolamento automático por `account_id`

    **Resposta:**
    - Lista de usuários com dados básicos e relacionamentos (role, account)
    - Metadados de paginação (total, páginas, página atual)
    - Usuários deletados (soft delete) não são retornados

    **Ordenação:**
    - Por padrão ordenado por `created_at` (mais recentes primeiro)
    """,
    responses={
        200: {
            "description": "Lista de usuários retornada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "users": [
                            {
                                "id": 1,
                                "email": "joao@exemplo.com",
                                "username": "joao",
                                "name": "João Silva",
                                "role_name": "Vendedor",
                                "account_name": "HSGrowth",
                                "is_active": True,
                                "created_at": "2026-01-06T10:00:00"
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
async def list_users(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    current_user: User = Depends(require_role("manager")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de listagem de usuários.
    """
    service = UserService(db)
    return service.list_users(
        account_id=current_user.account_id,
        page=page,
        page_size=page_size,
        is_active=is_active
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Dados do usuário logado",
    description="""
    Retorna todos os dados do usuário atualmente autenticado.

    **Use este endpoint para:**
    - Obter informações do perfil do usuário logado
    - Verificar permissões e role
    - Exibir dados no frontend (header, perfil, etc)

    **Dados retornados:**
    - Informações básicas (id, email, username, nome completo)
    - Dados da conta e role (account_name, role_name)
    - Metadados (last_login_at, created_at, updated_at)
    - Avatar e telefone (se preenchidos)

    **Autenticação:**
    - Requer token JWT válido no header Authorization
    - Bearer token deve estar ativo e não expirado
    """,
    responses={
        200: {
            "description": "Dados do usuário retornados com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "email": "joao@exemplo.com",
                        "username": "joao",
                        "name": "João Silva",
                        "avatar_url": "https://exemplo.com/avatar.jpg",
                        "phone": "+55 11 98765-4321",
                        "account_id": 1,
                        "account_name": "HSGrowth",
                        "role_id": 2,
                        "role_name": "Vendedor",
                        "is_active": True,
                        "last_login_at": "2026-01-06T14:30:00",
                        "created_at": "2025-12-01T10:00:00",
                        "updated_at": "2026-01-06T14:30:00"
                    }
                }
            }
        },
        401: {
            "description": "Não autenticado ou token inválido",
            "content": {"application/json": {"example": {"detail": "Not authenticated"}}}
        }
    }
)
async def get_current_user_data(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de dados do usuário autenticado.
    """
    # Converte para response schema
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        phone=getattr(current_user, 'phone', None),
        account_id=current_user.account_id,
        role_id=current_user.role_id,
        is_active=current_user.is_active,
        last_login_at=current_user.last_login_at,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        role_name=current_user.role.display_name if current_user.role else None,
        account_name=current_user.account.name if current_user.account else None
    )


@router.get("/{user_id}", response_model=UserResponse, summary="Buscar usuário")
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca um usuário por ID.

    - **user_id**: ID do usuário
    """
    service = UserService(db)
    user = service.get_user_by_id(user_id)

    # Converte para response schema
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        name=user.name,
        avatar_url=user.avatar_url,
        phone=getattr(user, 'phone', None),
        account_id=user.account_id,
        role_id=user.role_id,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
        role_name=user.role.display_name if user.role else None,
        account_name=user.account.name if user.account else None
    )


@router.post(
    "",
    response_model=UserResponse,
    summary="Criar usuário",
    description="""
    Cria um novo usuário no sistema.

    **Campos obrigatórios:**
    - `email`: Email único (formato válido)
    - `username`: Nome de usuário único (3-30 caracteres)
    - `password`: Senha forte (mínimo 6 caracteres)
    - `name`: Nome completo do usuário

    **Campos opcionais:**
    - `account_id`: ID da conta (usa conta do usuário logado se não fornecido)
    - `role_id`: ID do role (padrão: 2 - salesperson)
    - `avatar_url`: URL do avatar
    - `phone`: Telefone de contato

    **Validações:**
    - Email deve ser único no sistema
    - Username deve ser único no sistema
    - Senha é automaticamente criptografada com bcrypt
    - Email deve ter formato válido

    **Permissões:**
    - TODO: Apenas admins e managers devem poder criar usuários
    - Usuários criados pertencem à mesma conta do criador

    **Segurança:**
    - Senha nunca é retornada na resposta
    - Hash bcrypt com salt automático
    """,
    status_code=201,
    responses={
        201: {
            "description": "Usuário criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 10,
                        "email": "maria@exemplo.com",
                        "username": "maria",
                        "name": "Maria Santos",
                        "account_id": 1,
                        "account_name": "HSGrowth",
                        "role_id": 2,
                        "role_name": "Vendedor",
                        "is_active": True,
                        "created_at": "2026-01-06T15:30:00"
                    }
                }
            }
        },
        400: {
            "description": "Email ou username já existe",
            "content": {
                "application/json": {
                    "examples": {
                        "email_exists": {"value": {"detail": "Email já cadastrado"}},
                        "username_exists": {"value": {"detail": "Nome de usuário já cadastrado"}}
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
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de criação de usuário.
    """
    # TODO: Adicionar verificação de permissão (apenas admins)
    service = UserService(db)
    user = service.create_user(user_data)

    # Converte para response schema
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        name=user.name,
        avatar_url=user.avatar_url,
        phone=getattr(user, 'phone', None),
        account_id=user.account_id,
        role_id=user.role_id,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.put("/{user_id}", response_model=UserResponse, summary="Atualizar usuário")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza um usuário existente.

    - **user_id**: ID do usuário
    - Todos os campos são opcionais
    """
    service = UserService(db)
    user = service.update_user(user_id, user_data, current_user)

    # Converte para response schema
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        name=user.name,
        avatar_url=user.avatar_url,
        phone=getattr(user, 'phone', None),
        account_id=user.account_id,
        role_id=user.role_id,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.delete("/{user_id}", summary="Deletar usuário")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta um usuário (soft delete).

    - **user_id**: ID do usuário
    """
    # TODO: Adicionar verificação de permissão (apenas admins)
    service = UserService(db)
    service.delete_user(user_id, current_user)

    return {"message": "Usuário deletado com sucesso"}


@router.post("/me/change-password", summary="Alterar senha")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Altera a senha do usuário autenticado.

    - **current_password**: Senha atual
    - **new_password**: Nova senha (mínimo 6 caracteres)
    """
    service = UserService(db)
    service.change_password(
        user_id=current_user.id,
        current_password=password_data.current_password,
        new_password=password_data.new_password
    )

    return {"message": "Senha alterada com sucesso"}
