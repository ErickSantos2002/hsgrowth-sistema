"""Indicar uma empresa nova: o hunter ou a empresa indicadora cadastra e o convite sai na hora."""
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.user import User
from app.schemas.parcerias import IndicacaoCreate
from app.services import criacao_de_login
from app.services.parcerias import acesso, atividades

MENSAGEM_CNPJ_REPETIDO = "Este CNPJ já está no Programa de Parceiros."


def _exigir_indicador(user: User) -> None:
    if not acesso.eh_indicador(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            "Só o dono do parceiro ou o hunter indicam empresas.")


def conferir_cnpj_livre(db: Session, cnpj: str) -> None:
    """CNPJ já no Programa (empresa não excluída e não bloqueada) não entra de novo."""
    existe = db.query(Partner.id).filter(
        Partner.cnpj == cnpj, Partner.kind == "empresa",
        Partner.is_deleted.is_(False), Partner.stage != "bloqueado",
    ).first()
    if existe:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, MENSAGEM_CNPJ_REPETIDO)


def indicar(db: Session, user: User, dados: IndicacaoCreate) -> criacao_de_login.Resultado:
    _exigir_indicador(user)
    indicador_id = acesso.parceiro_do_login(user)
    conferir_cnpj_livre(db, dados.cnpj)
    indicador = db.query(Partner).filter(Partner.id == indicador_id).first()
    p = Partner(
        name=dados.name, cnpj=dados.cnpj, kind="empresa", stage="convidado", position=0,
        main_contact_name=dados.main_contact_name, main_contact_email=dados.main_contact_email,
        main_contact_phone=dados.main_contact_phone, pix_key=dados.pix_key,
        indicated_by_partner_id=indicador_id, created_by_id=user.id,
    )
    db.add(p)
    db.flush()  # sem commit: se o login for recusado, nada fica gravado
    try:
        resultado = criacao_de_login.criar_login(
            db, user, nome=dados.main_contact_name, email=dados.main_contact_email,
            papel="partner", modo="convite", partner_id=p.id,
        )
    except Exception:
        db.rollback()
        raise
    atividades.registrar_evento(db, user, f"Indicado por {indicador.name if indicador else user.name}",
                                partner_id=p.id, tipo="card_created")
    db.commit()
    return resultado


def listar(db: Session, user: User) -> List[Partner]:
    _exigir_indicador(user)
    return acesso.parceiros_visiveis(db, user).order_by(Partner.created_at.desc(), Partner.id.desc()).all()
