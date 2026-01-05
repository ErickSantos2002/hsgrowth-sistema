"""
Endpoints de Autenticação.
Rotas para login, refresh token, logout, reset de senha, etc.
"""
from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token_type,
    hash_password,
    create_password_reset_token,
    verify_password_reset_token,
)
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.schemas.user import UserResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse, summary="Login de usuário")
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Autentica um usuário com email e senha.
    Retorna access_token e refresh_token.

    - **email**: Email do usuário
    - **password**: Senha do usuário
    """
    # Busca o usuário por email
    user = db.query(User).filter(
        User.email == login_data.email,
        User.is_deleted == False
    ).first()

    # Verifica se o usuário existe e a senha está correta
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verifica se o usuário está ativo
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo. Entre em contato com o administrador."
        )

    # Atualiza o last_login_at
    user.last_login_at = datetime.utcnow()
    db.commit()

    # Cria os tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Converte para segundos
    )


@router.post("/refresh", response_model=TokenResponse, summary="Renovar access token")
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Renova o access_token usando um refresh_token válido.

    - **refresh_token**: Refresh token válido
    """
    # Decodifica o refresh token
    payload = decode_token(refresh_data.refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verifica se é um refresh token
    if not verify_token_type(payload, "refresh"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token inválido. Use um refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extrai o user_id
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Busca o usuário
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou inativo",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Cria novos tokens
    new_access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout", summary="Logout de usuário")
async def logout(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Realiza logout do usuário autenticado.

    Nota: Como estamos usando JWT stateless, o logout é realizado no cliente
    (descartando o token). Este endpoint pode ser usado para logging ou
    para implementar uma blacklist de tokens no futuro.
    """
    # Aqui poderia adicionar o token a uma blacklist (Redis, por exemplo)
    # Por enquanto, apenas retorna sucesso
    return {
        "message": "Logout realizado com sucesso",
        "user_id": current_user.id
    }


@router.post("/register", response_model=UserResponse, summary="Registrar novo usuário", status_code=status.HTTP_201_CREATED)
async def register(
    user_data: RegisterRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Registra um novo usuário no sistema.

    Nota: Este endpoint pode ser protegido para que apenas admins possam criar usuários.
    Para auto-registro, considere adicionar lógica de criação automática de account.

    - **email**: Email único do usuário
    - **username**: Nome de usuário único
    - **password**: Senha (mínimo 6 caracteres)
    - **full_name**: Nome completo
    - **account_id**: ID da conta (opcional, apenas para admins)
    - **role_id**: ID do role (opcional, padrão: role básico)
    """
    # Verifica se email já existe
    existing_email = db.query(User).filter(
        User.email == user_data.email,
        User.is_deleted == False
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )

    # Verifica se username já existe
    existing_username = db.query(User).filter(
        User.username == user_data.username,
        User.is_deleted == False
    ).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário já cadastrado"
        )

    # Hash da senha
    password_hash = hash_password(user_data.password)

    # Cria o novo usuário
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=password_hash,
        full_name=user_data.full_name,
        account_id=user_data.account_id or 1,  # TODO: Definir lógica de account padrão
        role_id=user_data.role_id or 2,  # TODO: Definir role padrão (ex: "salesperson")
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/forgot-password", summary="Solicitar reset de senha")
async def forgot_password(
    request_data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Solicita reset de senha para um email.
    Envia um email com token de reset (implementação futura).

    - **email**: Email do usuário
    """
    # Busca o usuário por email
    user = db.query(User).filter(
        User.email == request_data.email,
        User.is_deleted == False
    ).first()

    # Sempre retorna sucesso (segurança - não vaza se o email existe)
    if not user:
        return {
            "message": "Se o email existir, você receberá instruções para reset de senha."
        }

    # Gera token de reset
    reset_token = create_password_reset_token(user.email)

    # TODO: Enviar email com o token
    # Exemplo de URL: http://frontend.com/reset-password?token={reset_token}
    # Por enquanto, apenas retorna o token (REMOVER EM PRODUÇÃO)
    return {
        "message": "Se o email existir, você receberá instruções para reset de senha.",
        "reset_token": reset_token  # REMOVER EM PRODUÇÃO - apenas para desenvolvimento
    }


@router.post("/reset-password", summary="Resetar senha com token")
async def reset_password(
    reset_data: ResetPasswordRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Reseta a senha do usuário usando token enviado por email.

    - **token**: Token de reset recebido por email
    - **new_password**: Nova senha (mínimo 6 caracteres)
    """
    # Verifica o token
    email = verify_password_reset_token(reset_data.token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou expirado"
        )

    # Busca o usuário
    user = db.query(User).filter(
        User.email == email,
        User.is_deleted == False
    ).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    # Atualiza a senha
    user.password_hash = hash_password(reset_data.new_password)
    db.commit()

    return {
        "message": "Senha alterada com sucesso"
    }


# TODO: Implementar endpoint de client credentials para autenticação de sistemas externos
# @router.post("/client-credentials", response_model=TokenResponse)
# async def client_credentials_auth(...):
#     """
#     Autenticação para sistemas externos usando client_id e client_secret.
#     """
#     pass
