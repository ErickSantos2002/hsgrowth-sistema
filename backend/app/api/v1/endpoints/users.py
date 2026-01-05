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


@router.get("", response_model=UserListResponse, summary="Listar usuários")
async def list_users(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todos os usuários da conta do usuário autenticado.

    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 100)
    - **is_active**: Filtrar por usuários ativos/inativos (opcional)
    """
    service = UserService(db)
    return service.list_users(
        account_id=current_user.account_id,
        page=page,
        page_size=page_size,
        is_active=is_active
    )


@router.get("/me", response_model=UserResponse, summary="Dados do usuário logado")
async def get_current_user_data(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Retorna os dados do usuário autenticado.
    """
    # Converte para response schema
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.name,
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
        full_name=user.name,
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


@router.post("", response_model=UserResponse, summary="Criar usuário", status_code=201)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria um novo usuário.

    Nota: Em produção, este endpoint deve ser restrito a admins.

    - **email**: Email único do usuário
    - **username**: Nome de usuário único
    - **password**: Senha (mínimo 6 caracteres)
    - **full_name**: Nome completo
    - **account_id**: ID da conta
    - **role_id**: ID do role
    """
    # TODO: Adicionar verificação de permissão (apenas admins)
    service = UserService(db)
    user = service.create_user(user_data)

    # Converte para response schema
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.name,
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
        full_name=user.name,
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
    current_user: User = Depends(get_current_active_user),
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
