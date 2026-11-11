"""Board 1 — Aquisição de Parceiros: o card do parceiro, a Equipe e os Acessos."""
from typing import List

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.partner import Partner, PartnerTeamMember
from app.models.role import Role
from app.models.user import User
from app.schemas.parcerias import (
    AcessoCreate,
    AcessoMembroCreate,
    MembroCreate,
    MembroUpdate,
    MoverRequest,
    ParceiroCreate,
    ParceiroUpdate,
)
from app.services import criacao_de_login
from app.services.parcerias import acesso, atividades

MENSAGEM_SITUACAO_FIXA = "As situações mudam sozinhas (convite e aceite) ou pelo botão Bloquear."


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
    p = acesso.buscar_parceiro_proprio(db, user, partner_id)
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
    """As situações da Aquisição não se movem na mão (convite, aceite e Bloquear mudam sozinhas)."""
    acesso.exigir_escrita(user)
    acesso.buscar_parceiro_proprio(db, user, partner_id)
    raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, MENSAGEM_SITUACAO_FIXA)


async def anexar_contrato(db: Session, user: User, partner_id: int, arquivo: UploadFile) -> Partner:
    """O contrato entra no histórico como anexo; trocar aponta para o novo e o antigo fica lá."""
    p = acesso.buscar_parceiro_proprio(db, user, partner_id)
    anexo = await atividades.anexar(db, user, arquivo, partner_id=p.id)
    anexo.activity_type = "contract"
    p.contract_activity_id = anexo.id
    db.commit()
    db.refresh(p)
    return p


# ─── Equipe ──────────────────────────────────────────────────────────────────

def listar_equipe(db: Session, user: User, partner_id: int) -> List[PartnerTeamMember]:
    p = acesso.buscar_parceiro_proprio(db, user, partner_id)
    return db.query(PartnerTeamMember).filter(PartnerTeamMember.partner_id == p.id) \
        .order_by(PartnerTeamMember.name).all()


def criar_membro(db: Session, user: User, partner_id: int, dados: MembroCreate) -> PartnerTeamMember:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro_proprio(db, user, partner_id)
    membro = PartnerTeamMember(partner_id=p.id, **dados.model_dump())
    db.add(membro)
    db.commit()
    db.refresh(membro)
    return membro


def atualizar_membro(db: Session, user: User, partner_id: int, membro_id: int,
                     dados: MembroUpdate) -> PartnerTeamMember:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro_proprio(db, user, partner_id)
    membro = _membro(db, p, membro_id)
    mudancas = dados.model_dump(exclude_unset=True)
    if membro.user_id and "is_active" in mudancas:
        # Ligar e desligar o login do vendedor é como dar acesso: só o dono ou a gestão.
        _exigir_dono_ou_gestao(user)
    if membro.user_id and "email" in mudancas \
            and (mudancas["email"] or "").strip().lower() != (membro.email or "").strip().lower():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "Este vendedor já tem acesso ao CRM; o e-mail do login não muda por aqui.")
    for campo, valor in mudancas.items():
        setattr(membro, campo, valor)
    # Desativar o vendedor na Equipe desativa o login dele; reativar reativa.
    if "is_active" in mudancas and membro.user_id:
        login = db.query(User).filter(User.id == membro.user_id).first()
        if login:
            login.is_active = membro.is_active
    db.commit()
    db.refresh(membro)
    return membro


def _membro(db: Session, p: Partner, membro_id: int) -> PartnerTeamMember:
    membro = db.query(PartnerTeamMember).filter(
        PartnerTeamMember.id == membro_id, PartnerTeamMember.partner_id == p.id).first()
    if not membro:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vendedor não encontrado.")
    return membro


def _exigir_dono_ou_gestao(user: User) -> None:
    if not (acesso.eh_gestao(user) or acesso.eh_dono_do_parceiro(user)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o dono do parceiro, admin ou gerente dão acesso à equipe.")


def dar_acesso_ao_membro(db: Session, user: User, partner_id: int, membro_id: int,
                         dados: AcessoMembroCreate) -> criacao_de_login.Resultado:
    """Login partner_member para o vendedor da Equipe (dono do parceiro ou gestão)."""
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro_proprio(db, user, partner_id)  # vendedor do parceiro recebe 404
    _exigir_dono_ou_gestao(user)
    membro = _membro(db, p, membro_id)
    if membro.user_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Este vendedor já tem acesso.")
    if not membro.email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Cadastre o e-mail do vendedor antes.")
    if not membro.is_active:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Reative o vendedor antes de dar acesso.")
    nome, email = membro.name, membro.email
    r = criacao_de_login.criar_login(db, user, nome=nome, email=email, papel="partner_member",
                                     modo=dados.modo, senha=dados.password, partner_id=p.id)
    # criar_login já gravou o login: liga ao membro antes de qualquer outro passo.
    membro.user_id = r.user.id
    atividades.registrar_evento(db, user, f"Acesso criado para o vendedor {nome}", partner_id=p.id)
    db.commit()
    return r


def convidar_membro(db: Session, user: User, partner_id: int, membro_id: int,
                    enviar: bool) -> criacao_de_login.Resultado:
    acesso.exigir_escrita(user)
    p = acesso.buscar_parceiro_proprio(db, user, partner_id)
    _exigir_dono_ou_gestao(user)
    membro = _membro(db, p, membro_id)
    if not membro.user_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Este vendedor ainda não tem acesso.")
    if not membro.is_active:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Reative o vendedor antes de convidar.")
    login = (
        db.query(User).join(Role, User.role_id == Role.id)
        .filter(User.id == membro.user_id, User.partner_id == p.id, User.is_deleted.is_(False),
                Role.name == "partner_member")
        .first()
    )
    if not login:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Acesso não encontrado.")
    return criacao_de_login.enviar_convite(db, user, login, enviar)


# ─── Acessos (logins do parceiro) ────────────────────────────────────────────

def listar_acessos(db: Session, user: User, partner_id: int) -> List[User]:
    # Card primeiro: a indicada responde 404, como se não existisse.
    p = acesso.buscar_parceiro_proprio(db, user, partner_id)
    acesso.exigir_gestao(user)
    return (
        db.query(User).join(Role, User.role_id == Role.id)
        .filter(User.partner_id == p.id, User.is_deleted.is_(False), Role.name == "partner")
        .order_by(User.name).all()
    )


def criar_acesso(db: Session, user: User, partner_id: int, dados: AcessoCreate) -> criacao_de_login.Resultado:
    # Card primeiro: a indicada responde 404, como se não existisse.
    p = acesso.buscar_parceiro_proprio(db, user, partner_id)
    acesso.exigir_gestao(user)
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
    # Card primeiro: a indicada responde 404, como se não existisse.
    p = acesso.buscar_parceiro_proprio(db, user, partner_id)
    acesso.exigir_gestao(user)
    login = (
        db.query(User).join(Role, User.role_id == Role.id)
        .filter(User.id == user_id, User.partner_id == p.id, User.is_deleted.is_(False), Role.name == "partner")
        .first()
    )
    if not login:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Acesso não encontrado.")
    return criacao_de_login.enviar_convite(db, user, login, enviar)


def alterar_acesso(db: Session, user: User, partner_id: int, user_id: int, ativo: bool) -> User:
    # Card primeiro: a indicada responde 404, como se não existisse.
    p = acesso.buscar_parceiro_proprio(db, user, partner_id)
    acesso.exigir_gestao(user)
    # Só os logins do dono; o do vendedor liga e desliga pela Equipe.
    login = (
        db.query(User).join(Role, User.role_id == Role.id)
        .filter(User.id == user_id, User.partner_id == p.id, Role.name == "partner")
        .first()
    )
    if not login:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Acesso não encontrado.")
    login.is_active = ativo
    atividades.registrar_evento(
        db, user, f"Acesso de {login.email} {'reativado' if ativo else 'desativado'}", partner_id=p.id
    )
    db.commit()
    db.refresh(login)
    return login
