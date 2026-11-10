"""
Criação de login no CRM, igual nas 3 telas (Usuários, Acessos ao CRM, Equipe do parceiro).

- modo "convite": senha aleatória que ninguém conhece + link de 7 dias por e-mail;
- modo "senha": quem cria define a senha e a pessoa troca no 1º login.
Faz o commit (o e-mail só sai depois que o convite está gravado).
"""
import secrets
from dataclasses import dataclass
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User
from app.services import emails_de_acesso, envio_email
from app.services import tokens_de_acesso as tokens


@dataclass
class Resultado:
    user: User
    link: Optional[str]
    email_enviado: bool


def criar_login(db: Session, autor: Optional[User], *, nome: str, email: str, papel: str, modo: str,
                senha: Optional[str] = None, partner_id: Optional[int] = None,
                extras: Optional[Dict[str, Any]] = None) -> Resultado:
    email = email.strip().lower()
    dominio_interno = (settings.DAILY_INTERNAL_EMAIL_DOMAIN or "").strip().lower()
    if papel in ("partner", "partner_member") and dominio_interno and email.endswith("@" + dominio_interno):
        # O SSO da Microsoft casa por e-mail: a pessoa da H&S cairia na conta do parceiro.
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "E-mail da Health & Safety não pode ser usado em login de parceiro.")
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email já cadastrado")
    role = db.query(Role).filter(Role.name == papel).first()
    if not role:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Role '{papel}' não existe. Rode as migrations.")
    if modo == "senha" and not senha:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe a senha inicial.")

    user = User(
        name=nome.strip(), email=email, role_id=role.id, partner_id=partner_id, is_active=True,
        password_hash=hash_password(senha if modo == "senha" else secrets.token_urlsafe(24)),
        is_verified=modo == "senha", must_change_password=modo == "senha",
        **(extras or {}),
    )
    db.add(user)
    db.flush()
    if modo == "senha":
        db.commit()
        db.refresh(user)
        return Resultado(user, None, False)
    return enviar_convite(db, autor, user, enviar=True)


def enviar_convite(db: Session, autor: Optional[User], user: User, enviar: bool) -> Resultado:
    """Gera um convite novo (o anterior deixa de valer). enviar=False só devolve o link."""
    if user.last_login_at:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "Esta pessoa já entrou no CRM. Use \"Esqueci minha senha\".")
    if not user.is_active:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Acesso desativado. Reative antes de convidar.")
    token = tokens.criar(db, user, "convite", autor)
    expira_em = tokens.ultimo_convite(db, user).expires_at
    db.commit()
    db.refresh(user)
    url = tokens.link(token)
    if not enviar:
        return Resultado(user, url, False)
    assunto, html, texto = emails_de_acesso.convite(
        user.name, autor.name if autor else "A Health & Safety", url, expira_em)
    return Resultado(user, None, envio_email.enviar_email(user.email, assunto, html, texto))
