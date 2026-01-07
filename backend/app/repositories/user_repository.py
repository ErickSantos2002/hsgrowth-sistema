"""
User Repository - Operações de acesso a dados de usuários.
Implementa o padrão Repository para isolamento da camada de dados.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserRepository:
    """
    Repository para operações de banco de dados relacionadas a usuários.
    """

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, user_id: int) -> Optional[User]:
        """
        Busca um usuário por ID.

        Args:
            user_id: ID do usuário

        Returns:
            User ou None se não encontrado
        """
        return self.db.query(User).filter(
            User.id == user_id,
            User.is_deleted == False
        ).first()

    def find_by_email(self, email: str) -> Optional[User]:
        """
        Busca um usuário por email.

        Args:
            email: Email do usuário

        Returns:
            User ou None se não encontrado
        """
        return self.db.query(User).filter(
            User.email == email,
            User.is_deleted == False
        ).first()

    def find_by_username(self, username: str) -> Optional[User]:
        """
        Busca um usuário por username.

        Args:
            username: Username do usuário

        Returns:
            User ou None se não encontrado
        """
        return self.db.query(User).filter(
            User.username == username,
            User.is_deleted == False
        ).first()

    def list_by_account(
        self,
        account_id: int,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> List[User]:
        """
        Lista usuários de uma conta específica.

        Args:
            account_id: ID da conta
            skip: Número de registros para pular (paginação)
            limit: Limite de registros a retornar
            is_active: Filtro por status ativo (opcional)

        Returns:
            Lista de usuários
        """
        query = self.db.query(User).filter(
            User.account_id == account_id,
            User.is_deleted == False
        )

        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        return query.offset(skip).limit(limit).all()

    def count_by_account(self, account_id: int, is_active: Optional[bool] = None) -> int:
        """
        Conta usuários de uma conta específica.

        Args:
            account_id: ID da conta
            is_active: Filtro por status ativo (opcional)

        Returns:
            Número de usuários
        """
        query = self.db.query(User).filter(
            User.account_id == account_id,
            User.is_deleted == False
        )

        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        return query.count()

    def create(self, user_data: UserCreate, password_hash: str) -> User:
        """
        Cria um novo usuário.

        Args:
            user_data: Dados do usuário a ser criado
            password_hash: Hash da senha

        Returns:
            User criado
        """
        user = User(
            email=user_data.email,
            username=user_data.username,
            name=user_data.name,
            password_hash=password_hash,
            account_id=user_data.account_id,
            role_id=user_data.role_id,
            phone=user_data.phone,
            avatar_url=user_data.avatar_url,
            is_active=True
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user

    def update(self, user: User, user_data: UserUpdate, password_hash: Optional[str] = None) -> User:
        """
        Atualiza um usuário existente.

        Args:
            user: Usuário a ser atualizado
            user_data: Dados de atualização
            password_hash: Novo hash de senha (opcional)

        Returns:
            User atualizado
        """
        # Atualiza apenas os campos fornecidos
        update_data = user_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if field == "password":
                continue  # Senha é tratada separadamente
            setattr(user, field, value)

        # Atualiza senha se fornecida
        if password_hash:
            user.password_hash = password_hash

        self.db.commit()
        self.db.refresh(user)

        return user

    def delete(self, user: User) -> User:
        """
        Faz soft delete de um usuário.

        Args:
            user: Usuário a ser deletado

        Returns:
            User deletado
        """
        from datetime import datetime

        user.is_deleted = True
        user.deleted_at = datetime.utcnow()
        user.is_active = False  # Desativa também

        self.db.commit()
        self.db.refresh(user)

        return user

    def hard_delete(self, user: User) -> None:
        """
        Faz hard delete (remoção permanente) de um usuário.
        ATENÇÃO: Esta operação é irreversível!

        Args:
            user: Usuário a ser deletado permanentemente
        """
        self.db.delete(user)
        self.db.commit()

    def exists_email(self, email: str, exclude_user_id: Optional[int] = None) -> bool:
        """
        Verifica se um email já está em uso.

        Args:
            email: Email a verificar
            exclude_user_id: ID de usuário para excluir da verificação (útil em updates)

        Returns:
            True se o email existe, False caso contrário
        """
        query = self.db.query(User).filter(
            User.email == email,
            User.is_deleted == False
        )

        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)

        return query.first() is not None

    def exists_username(self, username: str, exclude_user_id: Optional[int] = None) -> bool:
        """
        Verifica se um username já está em uso.

        Args:
            username: Username a verificar
            exclude_user_id: ID de usuário para excluir da verificação (útil em updates)

        Returns:
            True se o username existe, False caso contrário
        """
        query = self.db.query(User).filter(
            User.username == username,
            User.is_deleted == False
        )

        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)

        return query.first() is not None
