"""Hunters cadastrados pela H&S (pessoa por CPF ou empresa por CNPJ): por convite ou com senha inicial."""
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.role import Role
from app.models.user import User
from app.schemas.parcerias import HunterCreate
from app.services import criacao_de_login, tokens_de_acesso
from app.services.parcerias import acesso, atividades

MENSAGEM_REPETIDO = "Este CPF/CNPJ já está cadastrado como hunter."


def _conferir_documento_livre(db: Session, dados: HunterCreate) -> None:
    q = db.query(Partner.id).filter(Partner.kind == "hunter", Partner.is_deleted.is_(False),
                                    Partner.stage != "bloqueado")
    q = q.filter(Partner.cpf == dados.cpf) if dados.cpf else q.filter(Partner.cnpj == dados.cnpj)
    if q.first():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, MENSAGEM_REPETIDO)


def criar(db: Session, user: User, dados: HunterCreate) -> criacao_de_login.Resultado:
    acesso.exigir_gestao(user)
    _conferir_documento_livre(db, dados)
    p = Partner(
        name=dados.name, kind="hunter", stage="convidado", position=0, cpf=dados.cpf, cnpj=dados.cnpj,
        main_contact_name=dados.name, main_contact_email=dados.email, main_contact_phone=dados.phone,
        pix_key=dados.pix_key, created_by_id=user.id,
    )
    db.add(p)
    db.flush()  # sem commit: se o login for recusado, nada fica gravado
    try:
        resultado = criacao_de_login.criar_login(
            db, user, nome=dados.name, email=dados.email, papel="hunter",
            modo=dados.modo, senha=dados.password, partner_id=p.id,
        )
    except Exception:
        db.rollback()
        raise
    atividades.registrar_evento(db, user, "Hunter cadastrado", partner_id=p.id, tipo="card_created")
    db.commit()
    return resultado


def login_do_hunter(db: Session, p: Partner) -> User:
    login = (
        db.query(User).join(Role, User.role_id == Role.id)
        .filter(User.partner_id == p.id, User.is_deleted.is_(False), Role.name == "hunter")
        .order_by(User.id).first()
    )
    if not login:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Acesso do hunter não encontrado.")
    return login


def _hunter(db: Session, partner_id: int) -> Partner:
    p = db.query(Partner).filter(Partner.id == partner_id, Partner.kind == "hunter",
                                 Partner.is_deleted.is_(False)).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hunter não encontrado.")
    return p


def listar(db: Session, user: User) -> List[dict]:
    acesso.exigir_gestao(user)
    hunters = db.query(Partner).filter(Partner.kind == "hunter", Partner.is_deleted.is_(False)) \
        .order_by(Partner.name, Partner.id).all()
    contagem = dict(
        db.query(Partner.indicated_by_partner_id, func.count(Partner.id))
        .filter(Partner.is_deleted.is_(False), Partner.indicated_by_partner_id.in_([h.id for h in hunters]))
        .group_by(Partner.indicated_by_partner_id).all()
    ) if hunters else {}
    itens = []
    for h in hunters:
        try:
            acesso_do_login = tokens_de_acesso.campos_do_acesso(db, login_do_hunter(db, h))
        except HTTPException:
            acesso_do_login = {"status_acesso": None, "convite_expira_em": None}
        itens.append({
            "id": h.id, "name": h.name, "cpf": h.cpf, "cnpj": h.cnpj, "email": h.main_contact_email,
            "phone": h.main_contact_phone, "pix_key": h.pix_key, "stage": h.stage,
            "terms_accepted_at": h.terms_accepted_at, "created_at": h.created_at,
            "empresas_indicadas": contagem.get(h.id, 0), **acesso_do_login,
        })
    return itens


def convidar(db: Session, user: User, partner_id: int, enviar: bool) -> criacao_de_login.Resultado:
    """Reenviar o convite ou só gerar o link para copiar."""
    acesso.exigir_gestao(user)
    p = _hunter(db, partner_id)
    if p.stage == "bloqueado":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Hunter bloqueado. Desbloqueie antes de convidar.")
    return criacao_de_login.enviar_convite(db, user, login_do_hunter(db, p), enviar)
