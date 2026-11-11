"""Termos do Programa de Parceiros: texto versionado por público e o aceite de cada parceiro."""
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.partner_terms import PartnerTerms, PartnerTermsAcceptance
from app.models.role import Role
from app.models.user import User
from app.schemas.notification import NotificationCreate
from app.services.notification_service import NotificationService
from app.services.parcerias import acesso, ativacao

logger = logging.getLogger(__name__)

PUBLICOS = ("empresa", "hunter")
PAPEIS_COM_ACEITE = ("partner", "hunter")


def vigente(db: Session, audience: str) -> Optional[PartnerTerms]:
    return (
        db.query(PartnerTerms).filter(PartnerTerms.audience == audience)
        .order_by(PartnerTerms.version.desc()).first()
    )


def listar(db: Session, user: User, audience: str) -> List[PartnerTerms]:
    acesso.exigir_gestao(user)
    return (
        db.query(PartnerTerms).filter(PartnerTerms.audience == audience)
        .order_by(PartnerTerms.version.desc()).all()
    )


def publicar(db: Session, user: User, audience: str, texto: str) -> PartnerTerms:
    acesso.exigir_gestao(user)
    atual = vigente(db, audience)
    termos = PartnerTerms(
        audience=audience, version=(atual.version if atual else 0) + 1,
        text=texto, published_at=datetime.utcnow(), published_by_id=user.id,
    )
    db.add(termos)
    db.commit()
    db.refresh(termos)
    return termos


def pendente(db: Session, user: User) -> Optional[PartnerTerms]:
    """Termos vigentes que o parceiro do login ainda não aceitou (só dono e hunter)."""
    if acesso.perfil(user) not in PAPEIS_COM_ACEITE or not user.partner_id:
        return None
    parceiro = db.query(Partner.kind).filter(Partner.id == user.partner_id, Partner.is_deleted.is_(False)).first()
    if not parceiro:
        return None
    termos = vigente(db, "hunter" if parceiro.kind == "hunter" else "empresa")
    if not termos:
        return None
    aceitou = db.query(PartnerTermsAcceptance.id).filter(
        PartnerTermsAcceptance.partner_id == user.partner_id,
        PartnerTermsAcceptance.terms_id == termos.id,
    ).first()
    return None if aceitou else termos


def aceitar(db: Session, user: User, ip: Optional[str]) -> Partner:
    if not pendente(db, user):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Não há termos pendentes.")
    # Trava a linha do parceiro e confere de novo: clique duplo não aceita nem ativa duas vezes.
    p = db.query(Partner).filter(Partner.id == user.partner_id, Partner.is_deleted.is_(False)).with_for_update().one()
    termos = pendente(db, user)
    if not termos:
        db.rollback()
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Não há termos pendentes.")
    agora = datetime.utcnow()
    db.add(PartnerTermsAcceptance(
        partner_id=p.id, user_id=user.id, terms_id=termos.id, accepted_at=agora, ip_address=ip,
    ))
    p.terms_accepted_at = agora
    ativou = p.stage in ("potencial", "convidado")
    if ativou:
        ativacao.ativar(db, p, user)
    db.commit()
    db.refresh(p)
    if ativou:
        _notificar_gestao(db, p)
    return p


def _notificar_gestao(db: Session, p: Partner) -> None:
    """Falha aqui não desfaz o aceite: só vai para o log."""
    try:
        indicador = None
        if p.indicated_by_partner_id:
            indicador = db.query(Partner.name).filter(Partner.id == p.indicated_by_partner_id).scalar()
        mensagem = f"{p.name} aceitou os termos e está ativo." + (f" Indicado por {indicador}." if indicador else "")
        destinatarios = (
            db.query(User.id).join(Role, User.role_id == Role.id)
            .filter(Role.name.in_(acesso.GESTAO), User.is_active.is_(True), User.is_deleted.is_(False)).all()
        )
        servico = NotificationService(db)
        for (uid,) in destinatarios:
            servico.create_notification(NotificationCreate(
                user_id=uid, notification_type="parceria_ativada", title="Parceiro novo",
                message=mensagem, color="success", icon="info",
            ))
    except Exception:
        db.rollback()
        logger.exception("Não foi possível notificar a gestão sobre o parceiro %s", p.id)
