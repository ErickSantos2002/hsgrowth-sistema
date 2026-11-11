"""Bloquear e desbloquear parceiro (empresa ou hunter): a situação e os logins andam juntos."""
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.partner import Partner, PartnerTeamMember
from app.models.role import Role
from app.models.user import User
from app.services.parcerias import acesso, atividades

PAPEIS_DONOS = ("partner", "hunter")


def _logins(db: Session, p: Partner):
    return (
        db.query(User, Role.name).join(Role, User.role_id == Role.id)
        .filter(User.partner_id == p.id, User.is_deleted.is_(False)).all()
    )


def bloquear(db: Session, user: User, partner_id: int) -> Partner:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    if p.stage == "bloqueado":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Este parceiro já está bloqueado.")
    p.stage = "bloqueado"
    p.blocked_at = datetime.utcnow()
    p.blocked_by_id = user.id
    logins = _logins(db, p)
    p.blocked_login_ids = [login.id for login, _ in logins if login.is_active]
    for login, _ in logins:
        login.is_active = False
    atividades.registrar_evento(db, user, "Parceiro bloqueado", partner_id=p.id)
    db.commit()
    db.refresh(p)
    return p


def desbloquear(db: Session, user: User, partner_id: int) -> Partner:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    if p.stage != "bloqueado":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Este parceiro não está bloqueado.")
    membros_ativos = {
        uid for (uid,) in db.query(PartnerTeamMember.user_id).filter(
            PartnerTeamMember.partner_id == p.id, PartnerTeamMember.is_active.is_(True),
            PartnerTeamMember.user_id.isnot(None)).all()
    }
    tem_dono = False
    estavam_ativos = set(p.blocked_login_ids or [])
    for login, papel in _logins(db, p):  # login excluído (soft delete) nunca volta
        if papel in PAPEIS_DONOS:
            tem_dono = True
        # Só volta quem estava ativo no bloqueio (desligado antes continua desligado).
        if login.id not in estavam_ativos:
            continue
        if papel in PAPEIS_DONOS or (papel == "partner_member" and login.id in membros_ativos):
            login.is_active = True
    p.blocked_login_ids = None
    p.stage = "ativado" if p.terms_accepted_at else ("convidado" if tem_dono else "potencial")
    p.blocked_at = None
    p.blocked_by_id = None
    atividades.registrar_evento(db, user, "Parceiro desbloqueado", partner_id=p.id)
    db.commit()
    db.refresh(p)
    return p
