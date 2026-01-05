"""
Schemas Pydantic para Autenticação.
Define os modelos de entrada/saída para endpoints de auth.
"""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """
    Request para login com email e senha.
    """
    email: EmailStr = Field(..., description="Email do usuário")
    password: str = Field(..., min_length=6, description="Senha do usuário")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "usuario@example.com",
                    "password": "senha123"
                }
            ]
        }
    }


class TokenResponse(BaseModel):
    """
    Response contendo os tokens de acesso e refresh.
    """
    access_token: str = Field(..., description="Token JWT de acesso")
    refresh_token: str = Field(..., description="Token JWT de refresh")
    token_type: str = Field(default="bearer", description="Tipo do token")
    expires_in: int = Field(..., description="Tempo de expiração do access_token em segundos")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "bearer",
                    "expires_in": 28800
                }
            ]
        }
    }


class RefreshTokenRequest(BaseModel):
    """
    Request para renovar o access_token usando refresh_token.
    """
    refresh_token: str = Field(..., description="Refresh token válido")


class RegisterRequest(BaseModel):
    """
    Request para registro de novo usuário.
    """
    email: EmailStr = Field(..., description="Email do usuário")
    username: str = Field(..., min_length=3, max_length=50, description="Nome de usuário")
    password: str = Field(..., min_length=6, description="Senha do usuário")
    full_name: str = Field(..., min_length=3, max_length=255, description="Nome completo")
    account_id: Optional[int] = Field(None, description="ID da conta (account) - Admin only")
    role_id: Optional[int] = Field(None, description="ID do role - Admin only")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "novousuario@example.com",
                    "username": "novousuario",
                    "password": "senha123",
                    "full_name": "Novo Usuário da Silva"
                }
            ]
        }
    }


class ForgotPasswordRequest(BaseModel):
    """
    Request para solicitar reset de senha.
    """
    email: EmailStr = Field(..., description="Email do usuário")


class ResetPasswordRequest(BaseModel):
    """
    Request para resetar senha com token.
    """
    token: str = Field(..., description="Token de reset enviado por email")
    new_password: str = Field(..., min_length=6, description="Nova senha")


class ClientCredentialsRequest(BaseModel):
    """
    Request para autenticação de sistemas externos (client credentials).
    """
    client_id: str = Field(..., description="ID do cliente")
    client_secret: str = Field(..., description="Secret do cliente")
    grant_type: str = Field(default="client_credentials", description="Tipo de grant")
