"""
User Service - Lógica de negócio para usuários.
Implementa validações e regras de negócio.
"""
from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse
from app.core.security import hash_password
from app.models.user import User


class UserService:
    """
    Service para lógica de negócio relacionada a usuários.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = UserRepository(db)

    def get_user_by_id(self, user_id: int) -> User:
        """
        Busca um usuário por ID.

        Args:
            user_id: ID do usuário

        Returns:
            User

        Raises:
            HTTPException: Se o usuário não for encontrado
        """
        user = self.repository.find_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        return user

    def list_users(
        self,
        account_id: int,
        page: int = 1,
        page_size: int = 50,
        is_active: Optional[bool] = None
    ) -> UserListResponse:
        """
        Lista usuários de uma conta com paginação.

        Args:
            account_id: ID da conta
            page: Número da página (começa em 1)
            page_size: Tamanho da página
            is_active: Filtro por status ativo

        Returns:
            UserListResponse com lista paginada de usuários
        """
        # Calcula offset
        skip = (page - 1) * page_size

        # Busca usuários
        users = self.repository.list_by_account(
            account_id=account_id,
            skip=skip,
            limit=page_size,
            is_active=is_active
        )

        # Conta total
        total = self.repository.count_by_account(account_id=account_id, is_active=is_active)

        # Calcula total de páginas
        total_pages = (total + page_size - 1) // page_size

        # Converte para response schema
        users_response = [
            UserResponse(
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
            for user in users
        ]

        return UserListResponse(
            users=users_response,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def create_user(self, user_data: UserCreate) -> User:
        """
        Cria um novo usuário.

        Args:
            user_data: Dados do usuário

        Returns:
            User criado

        Raises:
            HTTPException: Se email ou username já existirem
        """
        # Valida se email já existe
        if self.repository.exists_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já cadastrado"
            )

        # Valida se username já existe
        if user_data.username and self.repository.exists_username(user_data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome de usuário já cadastrado"
            )

        # Hash da senha
        password_hash = hash_password(user_data.password)

        # Cria o usuário
        user = self.repository.create(user_data, password_hash)

        return user

    def update_user(self, user_id: int, user_data: UserUpdate, current_user: User) -> User:
        """
        Atualiza um usuário existente.

        Args:
            user_id: ID do usuário a atualizar
            user_data: Dados de atualização
            current_user: Usuário autenticado fazendo a atualização

        Returns:
            User atualizado

        Raises:
            HTTPException: Se o usuário não for encontrado ou validação falhar
        """
        # Busca o usuário
        user = self.get_user_by_id(user_id)

        # Valida permissão (apenas admins ou o próprio usuário podem atualizar)
        is_admin = current_user.role and current_user.role.name == "admin"
        if current_user.id != user.id and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para atualizar este usuário"
            )

        # Valida email se fornecido
        if user_data.email and user_data.email != user.email:
            if self.repository.exists_email(user_data.email, exclude_user_id=user.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email já cadastrado"
                )

        # Valida username se fornecido
        if user_data.username and user_data.username != user.username:
            if self.repository.exists_username(user_data.username, exclude_user_id=user.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Nome de usuário já cadastrado"
                )

        # Hash da nova senha se fornecida
        password_hash = None
        if user_data.password:
            password_hash = hash_password(user_data.password)

        # Atualiza o usuário
        updated_user = self.repository.update(user, user_data, password_hash)

        return updated_user

    def delete_user(self, user_id: int, current_user: User) -> User:
        """
        Faz soft delete de um usuário.

        Args:
            user_id: ID do usuário a deletar
            current_user: Usuário autenticado fazendo a exclusão

        Returns:
            User deletado

        Raises:
            HTTPException: Se o usuário não for encontrado ou sem permissão
        """
        # Busca o usuário
        user = self.get_user_by_id(user_id)

        # Valida permissão (apenas admins podem deletar)
        # TODO: Verificar se current_user é admin
        # Por enquanto, bloqueia auto-exclusão
        if current_user.id == user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode deletar sua própria conta"
            )

        # Deleta o usuário (soft delete)
        deleted_user = self.repository.delete(user)

        return deleted_user

    def change_password(self, user_id: int, current_password: str, new_password: str) -> User:
        """
        Altera a senha de um usuário.

        Args:
            user_id: ID do usuário
            current_password: Senha atual
            new_password: Nova senha

        Returns:
            User atualizado

        Raises:
            HTTPException: Se a senha atual estiver incorreta
        """
        from app.core.security import verify_password
        from datetime import datetime

        # Busca o usuário
        user = self.get_user_by_id(user_id)

        # Verifica senha atual
        if not verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senha atual incorreta"
            )

        # Hash da nova senha
        password_hash = hash_password(new_password)

        # Atualiza senha
        user.password_hash = password_hash
        user.password_changed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(user)

        return user
