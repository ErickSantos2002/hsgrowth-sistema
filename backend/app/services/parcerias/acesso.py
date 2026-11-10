"""
Quem enxerga o quê em Parcerias.

Toda consulta de parceiro passa por aqui e filtra pelo partner_id do login no
backend — nunca só na tela. Card de outro parceiro responde 404, como se não
existisse. O vendedor da H&S só enxerga os parceiros dos quais é o Responsável
H&S (quem treina e faz o onboarding) e as oportunidades desses parceiros.

Do lado do parceiro há dois perfis: o dono (`partner`), que vê o card de
Aquisição, a Equipe e todas as oportunidades do parceiro, e o vendedor da equipe
(`partner_member`), que vê só as oportunidades em que é o vendedor.
"""
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Query, Session

from app.models.partner import Partner, PartnerTeamMember
from app.models.partner_opportunity import PartnerOpportunity
from app.models.user import User

GESTAO = ("admin", "manager")
VALIDAM_ELEGIBILIDADE = ("admin", "manager", "finance")
# Quem pode ser escolhido como Responsável H&S do parceiro.
RESPONSAVEIS_HS = ("admin", "manager", "salesperson")
PARCEIRO_DONO = "partner"
PARCEIRO_VENDEDOR = "partner_member"


def perfil(user: User) -> str:
    return user.role.name if user and user.role else ""


def eh_gestao(user: User) -> bool:
    return perfil(user) in GESTAO


def eh_parceiro(user: User) -> bool:
    """Login do lado do parceiro (dono ou vendedor da equipe)."""
    return perfil(user) in (PARCEIRO_DONO, PARCEIRO_VENDEDOR)


def eh_dono_do_parceiro(user: User) -> bool:
    return perfil(user) == PARCEIRO_DONO


def eh_vendedor_do_parceiro(user: User) -> bool:
    return perfil(user) == PARCEIRO_VENDEDOR


def eh_vendedor(user: User) -> bool:
    return perfil(user) == "salesperson"


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


def membro_do_login(db: Session, user: User) -> PartnerTeamMember:
    """Cadastro ativo na Equipe do login do vendedor do parceiro; sem ele, 403."""
    m = db.query(PartnerTeamMember).filter(
        PartnerTeamMember.user_id == user.id,
        PartnerTeamMember.partner_id == parceiro_do_login(user),
        PartnerTeamMember.is_active.is_(True),
    ).first()
    if not m:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Login de vendedor sem cadastro na equipe do parceiro.")
    return m


def conferir_responsavel(db: Session, user_id: Optional[int]) -> None:
    """Responsável H&S é opcional; quando vier, tem que ser admin, gerente ou vendedor ativo."""
    if user_id is None:
        return
    escolhido = db.query(User).filter(User.id == user_id, User.is_deleted.is_(False)).first()
    if not escolhido or not escolhido.is_active or perfil(escolhido) not in RESPONSAVEIS_HS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "O Responsável H&S tem que ser um admin, gerente ou vendedor ativo.",
        )


def parceiros_visiveis(db: Session, user: User) -> Query:
    q = db.query(Partner).filter(Partner.is_deleted.is_(False))
    if eh_vendedor_do_parceiro(user):
        return q.filter(Partner.id == -1)  # o vendedor do parceiro não vê o card de Aquisição
    if eh_parceiro(user):
        q = q.filter(Partner.id == parceiro_do_login(user))
    elif eh_vendedor(user):
        q = q.filter(Partner.hs_owner_id == user.id)
    return q


def buscar_parceiro(db: Session, user: User, partner_id: int) -> Partner:
    p = parceiros_visiveis(db, user).filter(Partner.id == partner_id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Parceiro não encontrado.")
    return p


def oportunidades_visiveis(db: Session, user: User) -> Query:
    q = db.query(PartnerOpportunity).filter(PartnerOpportunity.is_deleted.is_(False))
    if eh_vendedor_do_parceiro(user):
        return q.filter(PartnerOpportunity.partner_id == parceiro_do_login(user),
                        PartnerOpportunity.seller_member_id == membro_do_login(db, user).id)
    if eh_parceiro(user):
        q = q.filter(PartnerOpportunity.partner_id == parceiro_do_login(user))
    elif eh_vendedor(user):
        dele = db.query(Partner.id).filter(Partner.hs_owner_id == user.id)
        q = q.filter(PartnerOpportunity.partner_id.in_(dele))
    return q


def buscar_oportunidade(db: Session, user: User, opportunity_id: int) -> PartnerOpportunity:
    op = oportunidades_visiveis(db, user).filter(PartnerOpportunity.id == opportunity_id).first()
    if not op:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oportunidade não encontrada.")
    return op
