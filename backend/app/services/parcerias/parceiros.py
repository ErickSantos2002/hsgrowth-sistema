"""Board 1 — Aquisição de Parceiros: o card do parceiro, a Equipe e os Acessos."""
from datetime import datetime
from typing import List

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.partner import Partner, PartnerTeamMember
from app.models.role import Role
from app.models.user import User
from app.schemas.parcerias import (
    AcessoCreate,
    MembroCreate,
    MembroUpdate,
    MoverRequest,
    ParceiroCreate,
    ParceiroUpdate,
)
from app.services import criacao_de_login
from app.services.parcerias import acesso, ativacao, atividades
from app.services.parcerias.etapas import ETAPAS_AQUISICAO, TravaError, nome_da_etapa, validar_mudanca_parceiro


def listar(db: Session, user: User) -> List[Partner]:
    return acesso.parceiros_visiveis(db, user).order_by(Partner.position, Partner.id).all()


def criar(db: Session, user: User, dados: ParceiroCreate) -> Partner:
    acesso.exigir_gestao(user)
    acesso.conferir_responsavel(db, dados.hs_owner_id)
    p = Partner(**dados.model_dump(), stage="potencial", position=0, created_by_id=user.id)
    db.add(p)
    db.flush()
    atividades.registrar_evento(db, user, "Parceiro cadastrado", partner_id=p.id, tipo="card_created")
    db.commit()
    db.refresh(p)
    return p


def atualizar(db: Session, user: User, partner_id: int, dados: ParceiroUpdate) -> Partner:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    campos = dados.model_dump(exclude_unset=True)
    if "name" in campos and campos["name"] is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "O nome do parceiro é obrigatório.")
    if not acesso.eh_gestao(user):
        # O responsável H&S é escolha da H&S.
        campos.pop("hs_owner_id", None)
    if "hs_owner_id" in campos:
        acesso.conferir_responsavel(db, campos["hs_owner_id"])
    for campo, valor in campos.items():
        setattr(p, campo, valor)
    db.commit()
    db.refresh(p)
    return p


def mover(db: Session, user: User, partner_id: int, req: MoverRequest) -> Partner:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    origem = p.stage
    # Reordenar dentro de Perdido não apaga o motivo já gravado.
    if req.stage == "perdido" and origem != "perdido":
        p.loss_reason = (req.loss_reason or "").strip() or None
        p.loss_detail = req.loss_detail
    try:
        validar_mudanca_parceiro(p, req.stage, acesso.perfil(user))
    except TravaError as erro:
        db.rollback()
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(erro))

    if origem != req.stage:
        p.stage = req.stage
        if req.stage == "perdido":
            p.lost_at = datetime.utcnow()
        elif origem == "perdido":
            p.lost_at = p.loss_reason = p.loss_detail = None
        atividades.registrar_evento(
            db, user,
            f"Etapa: {nome_da_etapa(ETAPAS_AQUISICAO, origem)} → {nome_da_etapa(ETAPAS_AQUISICAO, req.stage)}",
            partner_id=p.id,
            tipo="card_lost" if req.stage == "perdido" else "stage_change",
        )
    if req.position is not None:
        p.position = req.position
    # Quem chega a Ativação vindo de Ativado ou Perdido foi posto ali pela gestão de propósito.
    if p.stage == "ativacao" and origem not in ("ativado", "perdido"):
        ativacao.promover_se_ativo(db, p, user)
    db.commit()
    db.refresh(p)
    return p


async def anexar_contrato(db: Session, user: User, partner_id: int, arquivo: UploadFile) -> Partner:
    """O contrato entra no histórico como anexo; trocar aponta para o novo e o antigo fica lá."""
    p = acesso.buscar_parceiro(db, user, partner_id)
    anexo = await atividades.anexar(db, user, arquivo, partner_id=p.id)
    anexo.activity_type = "contract"
    p.contract_activity_id = anexo.id
    db.commit()
    db.refresh(p)
    return p


# ─── Equipe ──────────────────────────────────────────────────────────────────

def listar_equipe(db: Session, user: User, partner_id: int) -> List[PartnerTeamMember]:
    p = acesso.buscar_parceiro(db, user, partner_id)
    return db.query(PartnerTeamMember).filter(PartnerTeamMember.partner_id == p.id) \
        .order_by(PartnerTeamMember.name).all()


def criar_membro(db: Session, user: User, partner_id: int, dados: MembroCreate) -> PartnerTeamMember:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    membro = PartnerTeamMember(partner_id=p.id, **dados.model_dump())
    db.add(membro)
    db.commit()
    db.refresh(membro)
    return membro


def atualizar_membro(db: Session, user: User, partner_id: int, membro_id: int,
                     dados: MembroUpdate) -> PartnerTeamMember:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    membro = db.query(PartnerTeamMember).filter(
        PartnerTeamMember.id == membro_id, PartnerTeamMember.partner_id == p.id
    ).first()
    if not membro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vendedor não encontrado.")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(membro, campo, valor)
    db.commit()
    db.refresh(membro)
    return membro


# ─── Acessos (logins do parceiro) ────────────────────────────────────────────

def listar_acessos(db: Session, user: User, partner_id: int) -> List[User]:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    return (
        db.query(User).join(Role, User.role_id == Role.id)
        .filter(User.partner_id == p.id, User.is_deleted.is_(False), Role.name == "partner")
        .order_by(User.name).all()
    )


def criar_acesso(db: Session, user: User, partner_id: int, dados: AcessoCreate) -> criacao_de_login.Resultado:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    resultado = criacao_de_login.criar_login(
        db, user, nome=dados.name, email=dados.email, papel="partner",
        modo=dados.modo, senha=dados.password, partner_id=p.id,
    )
    # Só registra no histórico depois que o acesso foi de fato criado.
    atividades.registrar_evento(db, user, f"Acesso criado para {dados.email}", partner_id=p.id)
    db.commit()
    return resultado


def convidar_acesso(db: Session, user: User, partner_id: int, user_id: int,
                    enviar: bool) -> criacao_de_login.Resultado:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    login = (
        db.query(User).join(Role, User.role_id == Role.id)
        .filter(User.id == user_id, User.partner_id == p.id, User.is_deleted.is_(False), Role.name == "partner")
        .first()
    )
    if not login:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Acesso não encontrado.")
    return criacao_de_login.enviar_convite(db, user, login, enviar)


def alterar_acesso(db: Session, user: User, partner_id: int, user_id: int, ativo: bool) -> User:
    acesso.exigir_gestao(user)
    p = acesso.buscar_parceiro(db, user, partner_id)
    login = db.query(User).filter(User.id == user_id, User.partner_id == p.id).first()
    if not login:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Acesso não encontrado.")
    login.is_active = ativo
    atividades.registrar_evento(
        db, user, f"Acesso de {login.email} {'reativado' if ativo else 'desativado'}", partner_id=p.id
    )
    db.commit()
    db.refresh(login)
    return login
