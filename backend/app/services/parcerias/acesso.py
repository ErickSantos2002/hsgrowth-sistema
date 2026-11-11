"""
Quem enxerga o quê em Parcerias.

Toda consulta de parceiro passa por aqui e filtra pelo partner_id do login no
backend — nunca só na tela. Card de outro parceiro responde 404, como se não
existisse. O vendedor da H&S só enxerga os parceiros dos quais é o Responsável
H&S (quem treina e faz o onboarding) e as oportunidades desses parceiros.

Do lado de fora há três perfis: o dono (`partner`), que vê o card de
Aquisição, a Equipe e todas as oportunidades do parceiro; o vendedor da equipe
(`partner_member`), que vê só as oportunidades em que é o vendedor; e o hunter
(`hunter`), que indica empresas e vende sozinho (não tem equipe).

Indicação vale um nível só: o dono e o hunter veem as empresas que eles
indicaram direto e as oportunidades delas, só para acompanhar (escrever nelas é
403); a Equipe, os Acessos, o contrato e as atividades do card da indicada são
só dela (404). O hunter não vê o próprio registro como card.
"""
from typing import List, Optional

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
HUNTER = "hunter"
# Logins de fora da H&S, cada um preso a um partner_id.
EXTERNOS = (PARCEIRO_DONO, PARCEIRO_VENDEDOR, HUNTER)
MENSAGEM_SO_ACOMPANHA = "Você só acompanha as oportunidades desta empresa."


def perfil(user: User) -> str:
    return user.role.name if user and user.role else ""


def eh_gestao(user: User) -> bool:
    return perfil(user) in GESTAO


def eh_parceiro(user: User) -> bool:
    """Login do lado de fora com parceiro próprio (dono, vendedor da equipe ou hunter)."""
    return perfil(user) in EXTERNOS


def eh_externo(user: User) -> bool:
    """Login de fora da H&S: partner, partner_member ou hunter."""
    return perfil(user) in EXTERNOS


def eh_hunter(user: User) -> bool:
    return perfil(user) == HUNTER


def eh_indicador(user: User) -> bool:
    """Quem pode ter empresas indicadas por ele: o dono do parceiro e o hunter."""
    return perfil(user) in (PARCEIRO_DONO, HUNTER)


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


def _indicados_diretos(db: Session, partner_id: int) -> List[int]:
    linhas = db.query(Partner.id).filter(
        Partner.indicated_by_partner_id == partner_id, Partner.is_deleted.is_(False),
    ).order_by(Partner.id).all()
    return [i for (i,) in linhas]


def ids_visiveis(db: Session, user: User) -> List[int]:
    """
    Parceiros cujas oportunidades o login de fora enxerga: o próprio e, para o
    dono e o hunter, os indicados diretos não excluídos (um nível só).
    """
    proprio = parceiro_do_login(user)
    if not eh_indicador(user):
        return [proprio]
    return [proprio] + [i for i in _indicados_diretos(db, proprio) if i != proprio]


def parceiros_visiveis(db: Session, user: User) -> Query:
    q = db.query(Partner).filter(Partner.is_deleted.is_(False))
    if eh_vendedor_do_parceiro(user):
        return q.filter(Partner.id == -1)  # o vendedor do parceiro não vê o card de Aquisição
    if eh_hunter(user):
        # O hunter vê as empresas que indicou, não o próprio registro.
        proprio = parceiro_do_login(user)
        q = q.filter(Partner.id.in_(_indicados_diretos(db, proprio)), Partner.id != proprio)
    elif eh_externo(user):
        q = q.filter(Partner.id.in_(ids_visiveis(db, user)))
    elif eh_vendedor(user):
        q = q.filter(Partner.hs_owner_id == user.id)
    return q


def buscar_parceiro(db: Session, user: User, partner_id: int) -> Partner:
    p = parceiros_visiveis(db, user).filter(Partner.id == partner_id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Parceiro não encontrado.")
    return p


def buscar_parceiro_proprio(db: Session, user: User, partner_id: int) -> Partner:
    """
    Card que o login pode administrar (Equipe, Acessos, contrato, atividades,
    edição). Login de fora só o do próprio parceiro: a indicada é 404, como se
    não existisse. A H&S segue a regra de buscar_parceiro.
    """
    p = buscar_parceiro(db, user, partner_id)
    if eh_externo(user) and p.id != parceiro_do_login(user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Parceiro não encontrado.")
    return p


def oportunidades_visiveis(db: Session, user: User) -> Query:
    q = db.query(PartnerOpportunity).filter(PartnerOpportunity.is_deleted.is_(False))
    if eh_vendedor_do_parceiro(user):
        return q.filter(PartnerOpportunity.partner_id == parceiro_do_login(user),
                        PartnerOpportunity.seller_member_id == membro_do_login(db, user).id)
    if eh_externo(user):
        q = q.filter(PartnerOpportunity.partner_id.in_(ids_visiveis(db, user)))
    elif eh_vendedor(user):
        dele = db.query(Partner.id).filter(Partner.hs_owner_id == user.id)
        q = q.filter(PartnerOpportunity.partner_id.in_(dele))
    return q


def buscar_oportunidade(db: Session, user: User, opportunity_id: int) -> PartnerOpportunity:
    op = oportunidades_visiveis(db, user).filter(PartnerOpportunity.id == opportunity_id).first()
    if not op:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oportunidade não encontrada.")
    return op


def exigir_oportunidade_propria(user: User, op: PartnerOpportunity) -> None:
    """Oportunidade de empresa indicada: o login de fora só acompanha (403 em toda escrita)."""
    if eh_externo(user) and op.partner_id != parceiro_do_login(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, MENSAGEM_SO_ACOMPANHA)


def buscar_oportunidade_para_escrever(db: Session, user: User, opportunity_id: int) -> PartnerOpportunity:
    """buscar_oportunidade + exigir_oportunidade_propria: porta de toda escrita na oportunidade."""
    op = buscar_oportunidade(db, user, opportunity_id)
    exigir_oportunidade_propria(user, op)
    return op
