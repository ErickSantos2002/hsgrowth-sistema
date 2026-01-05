"""
Dependencies do FastAPI.
Funções reutilizáveis como dependencies em rotas.
"""
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import decode_token, verify_token_type
from app.models.user import User
from app.models.role import Role

# Security scheme para JWT (Bearer token)
security = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency para obter sessão do banco de dados.
    Cria uma sessão por request e fecha automaticamente no final.

    Yields:
        Session do SQLAlchemy
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency para obter o usuário autenticado a partir do JWT.
    Extrai o token do header Authorization, decodifica e busca o usuário no banco.

    Args:
        credentials: Credenciais HTTP Bearer (token JWT)
        db: Sessão do banco de dados

    Returns:
        Usuário autenticado

    Raises:
        HTTPException: Se o token for inválido ou o usuário não for encontrado
    """
    # Extrai o token
    token = credentials.credentials

    # Decodifica o token
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verifica se é um access token
    if not verify_token_type(payload, "access"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token inválido. Use um access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extrai o user_id do payload
    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Busca o usuário no banco
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency para obter usuário autenticado e ativo.
    Verifica se o usuário está com status is_active=True.

    Args:
        current_user: Usuário autenticado (obtido de get_current_user)

    Returns:
        Usuário autenticado e ativo

    Raises:
        HTTPException: Se o usuário estiver inativo
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )
    return current_user


def require_role(required_role: str):
    """
    Factory de dependency para verificar se o usuário tem um role específico.

    Args:
        required_role: Nome do role necessário (ex: "admin", "manager", "salesperson")

    Returns:
        Dependency function que verifica o role

    Example:
        @app.get("/admin/users", dependencies=[Depends(require_role("admin"))])
        async def list_all_users():
            ...
    """
    async def role_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        """
        Verifica se o usuário tem o role necessário.
        """
        # Busca o role do usuário (eager loading)
        role = db.query(Role).filter(Role.id == current_user.role_id).first()

        if role is None or role.name != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Role necessário: {required_role}"
            )

        return current_user

    return role_checker


def require_permission(required_permission: str):
    """
    Factory de dependency para verificar se o usuário tem uma permissão específica.
    As permissões são armazenadas no campo JSON 'permissions' do modelo Role.

    Args:
        required_permission: Nome da permissão necessária (ex: "users.create", "cards.delete")

    Returns:
        Dependency function que verifica a permissão

    Example:
        @app.delete("/cards/{card_id}", dependencies=[Depends(require_permission("cards.delete"))])
        async def delete_card(card_id: int):
            ...
    """
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        """
        Verifica se o usuário tem a permissão necessária.
        """
        # Busca o role do usuário
        role = db.query(Role).filter(Role.id == current_user.role_id).first()

        if role is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Role não encontrado"
            )

        # Verifica se a permissão está no array de permissões
        permissions = role.permissions or []
        if required_permission not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Permissão necessária: {required_permission}"
            )

        return current_user

    return permission_checker


def require_account_access(account_id: int):
    """
    Factory de dependency para verificar se o usuário pertence a uma conta específica.
    Garante isolamento multi-tenant.

    Args:
        account_id: ID da conta que deve ser verificada

    Returns:
        Dependency function que verifica o acesso à conta

    Example:
        @app.get("/accounts/{account_id}/users")
        async def list_account_users(
            account_id: int,
            _: User = Depends(require_account_access(account_id))
        ):
            ...
    """
    async def account_checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        """
        Verifica se o usuário pertence à conta especificada.
        """
        if current_user.account_id != account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado. Você não pertence a esta conta."
            )

        return current_user

    return account_checker
