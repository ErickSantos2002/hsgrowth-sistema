"""
Links de uso único para criar (convite) ou redefinir a senha.

O token em claro só existe no link enviado/copiado; o banco guarda o sha256. Gerar um
token novo invalida os pendentes do mesmo tipo. Quem chama faz o commit.
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.user_access_token import UserAccessToken

VALIDADE = {"convite": timedelta(days=7), "redefinir": timedelta(hours=1)}


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _pendentes(db: Session, user: User, kind: Optional[str] = None):
    q = db.query(UserAccessToken).filter(UserAccessToken.user_id == user.id, UserAccessToken.used_at.is_(None))
    return q.filter(UserAccessToken.kind == kind) if kind else q


def invalidar_pendentes(db: Session, user: User, kind: Optional[str] = None) -> None:
    agora = datetime.utcnow()
    for t in _pendentes(db, user, kind):
        t.used_at = agora


def criar(db: Session, user: User, kind: str, autor: Optional[User] = None) -> str:
    invalidar_pendentes(db, user, kind)
    token = secrets.token_urlsafe(32)
    db.add(UserAccessToken(
        user_id=user.id, kind=kind, token_hash=_hash(token),
        expires_at=datetime.utcnow() + VALIDADE[kind],
        created_by_id=autor.id if autor else None,
    ))
    db.flush()
    return token


def link(token: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/definir-senha?token={token}"


def buscar_valido(db: Session, token: str) -> Optional[UserAccessToken]:
    t = db.query(UserAccessToken).filter(UserAccessToken.token_hash == _hash(token or "")).first()
    if not t or t.used_at or t.expires_at < datetime.utcnow():
        return None
    if not t.user or t.user.is_deleted or not t.user.is_active:
        return None
    return t


def usar(db: Session, t: UserAccessToken) -> None:
    t.used_at = datetime.utcnow()


def ultimo_convite(db: Session, user: User) -> Optional[UserAccessToken]:
    return (_pendentes(db, user, "convite").order_by(UserAccessToken.id.desc()).first())


def situacao_do_acesso(db: Session, user: User) -> Tuple[str, Optional[datetime]]:
    """(status, validade do convite). Status: ativo | convite_pendente | convite_expirado | desativado.
    A validade só vem com convite pendente ou expirado."""
    if not user.is_active:
        return "desativado", None
    if user.last_login_at:
        return "ativo", None
    convite = ultimo_convite(db, user)
    if convite is None:
        return "ativo", None
    status = "convite_pendente" if convite.expires_at >= datetime.utcnow() else "convite_expirado"
    return status, convite.expires_at


def status_do_acesso(db: Session, user: User) -> str:
    """ativo | convite_pendente | convite_expirado | desativado"""
    return situacao_do_acesso(db, user)[0]


def campos_do_acesso(db: Session, user: User) -> Dict[str, Any]:
    """status_acesso + convite_expira_em, prontos para ir na resposta."""
    status, expira_em = situacao_do_acesso(db, user)
    return {"status_acesso": status, "convite_expira_em": expira_em}
