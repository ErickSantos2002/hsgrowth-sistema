"""Schemas de acesso (convite por e-mail, senha inicial, definir senha) usados no CRM todo."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

Modo = Literal["convite", "senha"]
Status = Literal["ativo", "convite_pendente", "convite_expirado", "desativado"]


class ModoDeAcesso(BaseModel):
    """Convite (a pessoa cria a senha pelo link) ou senha inicial (troca no 1º login)."""
    modo: Modo = "convite"
    password: Optional[str] = Field(None, min_length=8, max_length=128)

    @model_validator(mode="after")
    def _senha_quando_precisa(self):
        if self.modo == "senha" and not self.password:
            raise ValueError("Informe a senha inicial (mínimo 8 caracteres).")
        return self


class ConviteRequest(BaseModel):
    enviar: bool = True  # False = só gerar o link para "Copiar link"


class ConviteResponse(BaseModel):
    status_acesso: Status
    convite_expira_em: Optional[datetime] = None
    link: Optional[str] = None
    email_enviado: bool = False


class DefinirSenhaRequest(BaseModel):
    token: str = Field(..., min_length=10)
    nova_senha: str = Field(..., min_length=8, max_length=128)


class TokenInfoResponse(BaseModel):
    valido: bool
    kind: Optional[Literal["convite", "redefinir"]] = None
    nome: Optional[str] = None
    email: Optional[str] = None
