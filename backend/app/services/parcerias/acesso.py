"""
Quem enxerga o quê em Parcerias.

Toda consulta de parceiro passa por aqui e filtra pelo partner_id do login no
backend — nunca só na tela. Card de outro parceiro responde 404, como se não
existisse.
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Query, Session

from app.models.partner import Partner
from app.models.partner_opportunity import PartnerOpportunity
from app.models.user import User

GESTAO = ("admin", "manager")
VALIDAM_ELEGIBILIDADE = ("admin", "manager", "finance")


def perfil(user: User) -> str:
    return user.role.name if user and user.role else ""


def eh_gestao(user: User) -> bool:
    return perfil(user) in GESTAO


def eh_parceiro(user: User) -> bool:
    return perfil(user) == "partner"


def exigir_gestao(user: User) -> None:
    if not eh_gestao(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só admin ou gerente.")


def exigir_escrita(user: User) -> None:
    if perfil(user) == "finance":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "O Financeiro acompanha e valida a elegibilidade, mas não altera os cards.",
        )


def parceiro_do_login(user: User) -> int:
    if not user.partner_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Login de parceiro sem parceiro vinculado.")
    return user.partner_id


def parceiros_visiveis(db: Session, user: User) -> Query:
    q = db.query(Partner).filter(Partner.is_deleted.is_(False))
    if eh_parceiro(user):
        q = q.filter(Partner.id == parceiro_do_login(user))
    return q


def buscar_parceiro(db: Session, user: User, partner_id: int) -> Partner:
    p = parceiros_visiveis(db, user).filter(Partner.id == partner_id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Parceiro não encontrado.")
    return p


def oportunidades_visiveis(db: Session, user: User) -> Query:
    q = db.query(PartnerOpportunity).filter(PartnerOpportunity.is_deleted.is_(False))
    if eh_parceiro(user):
        q = q.filter(PartnerOpportunity.partner_id == parceiro_do_login(user))
    return q


def buscar_oportunidade(db: Session, user: User, opportunity_id: int) -> PartnerOpportunity:
    op = oportunidades_visiveis(db, user).filter(PartnerOpportunity.id == opportunity_id).first()
    if not op:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oportunidade não encontrada.")
    return op
