"""
Módulo de Segurança - Hash de senhas e JWT.
Centraliza funções de autenticação e criptografia.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Configuração do contexto de hash (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Gera hash bcrypt de uma senha.

    Args:
        password: Senha em texto plano

    Returns:
        Hash bcrypt da senha
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se uma senha corresponde ao hash.

    Args:
        plain_password: Senha em texto plano
        hashed_password: Hash bcrypt da senha

    Returns:
        True se a senha corresponde ao hash, False caso contrário
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Cria um token JWT de acesso.

    Args:
        data: Dados a serem incluídos no payload do token (ex: {"sub": user_id})
        expires_delta: Tempo de expiração customizado (opcional)

    Returns:
        Token JWT assinado
    """
    to_encode = data.copy()

    # Define tempo de expiração
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    # Adiciona claims ao payload
    to_encode.update({
        "exp": expire,  # Expiration time
        "iat": datetime.utcnow(),  # Issued at
    })

    # Define type como "access" apenas se não foi especificado
    if "type" not in to_encode:
        to_encode["type"] = "access"

    # Cria e assina o token
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Cria um token JWT de refresh.

    Args:
        data: Dados a serem incluídos no payload do token (ex: {"sub": user_id})
        expires_delta: Tempo de expiração customizado (opcional)

    Returns:
        Refresh token JWT assinado
    """
    to_encode = data.copy()

    # Define tempo de expiração (refresh tokens duram mais)
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    # Adiciona claims ao payload
    to_encode.update({
        "exp": expire,  # Expiration time
        "iat": datetime.utcnow(),  # Issued at
        "type": "refresh"  # Tipo do token
    })

    # Cria e assina o token
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodifica e valida um token JWT.

    Args:
        token: Token JWT a ser decodificado

    Returns:
        Payload do token se válido, None se inválido ou expirado

    Raises:
        JWTError: Se o token for inválido
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def verify_token_type(payload: Dict[str, Any], expected_type: str) -> bool:
    """
    Verifica se o token é do tipo esperado (access ou refresh).

    Args:
        payload: Payload decodificado do token
        expected_type: Tipo esperado ("access" ou "refresh")

    Returns:
        True se o tipo corresponde, False caso contrário
    """
    token_type = payload.get("type")
    return token_type == expected_type


def create_password_reset_token(email: str) -> str:
    """
    Cria um token JWT para reset de senha.

    Args:
        email: Email do usuário

    Returns:
        Token JWT para reset de senha
    """
    data = {"sub": email, "type": "password_reset"}
    expires_delta = timedelta(hours=24)  # Token expira em 24 horas

    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
    })

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verifica e decodifica um token de reset de senha.

    Args:
        token: Token de reset de senha

    Returns:
        Email do usuário se o token for válido, None caso contrário
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )

        # Verifica se é um token de reset
        if payload.get("type") != "password_reset":
            return None

        email: str = payload.get("sub")
        return email
    except JWTError:
        return None
