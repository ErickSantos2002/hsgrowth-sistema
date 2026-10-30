"""
Atividades e histórico dos dois boards de Parcerias.

Criar ou concluir atividade de uma oportunidade atualiza last_activity_at
(a Consulta de CNPJ usa para saber se a negociação está viva).
"""
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunity
from app.models.user import User
from app.schemas.parcerias import AtividadeCreate
from app.services.parcerias import acesso


def registrar_evento(db: Session, user: Optional[User], descricao: str,
                     partner_id: Optional[int] = None, opportunity_id: Optional[int] = None) -> None:
    """Linha do histórico gravada pelo sistema. Quem chama faz o commit."""
    db.add(PartnerActivity(
        partner_id=partner_id,
        opportunity_id=opportunity_id,
        user_id=user.id if user else None,
        type="evento",
        description=descricao,
    ))


def tocar(oportunidade: PartnerOpportunity) -> None:
    oportunidade.last_activity_at = datetime.utcnow()


def listar(db: Session, partner_id: Optional[int] = None,
           opportunity_id: Optional[int] = None) -> List[PartnerActivity]:
    q = db.query(PartnerActivity)
    if opportunity_id is not None:
        q = q.filter(PartnerActivity.opportunity_id == opportunity_id)
    else:
        q = q.filter(PartnerActivity.partner_id == partner_id)
    return q.order_by(PartnerActivity.created_at.desc(), PartnerActivity.id.desc()).all()


def criar(db: Session, user: User, dados: AtividadeCreate, partner_id: Optional[int] = None,
          oportunidade: Optional[PartnerOpportunity] = None) -> PartnerActivity:
    acesso.exigir_escrita(user)
    atividade = PartnerActivity(
        partner_id=partner_id,
        opportunity_id=oportunidade.id if oportunidade else None,
        user_id=user.id,
        type=dados.type,
        description=dados.description.strip(),
        due_at=dados.due_at,
    )
    db.add(atividade)
    if oportunidade:
        tocar(oportunidade)
    db.commit()
    db.refresh(atividade)
    return atividade


def _buscar_visivel(db: Session, user: User, atividade_id: int) -> PartnerActivity:
    atividade = db.query(PartnerActivity).filter(PartnerActivity.id == atividade_id).first()
    if not atividade:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Atividade não encontrada.")
    if atividade.opportunity_id:
        acesso.buscar_oportunidade(db, user, atividade.opportunity_id)
    else:
        acesso.buscar_parceiro(db, user, atividade.partner_id)
    return atividade


def concluir(db: Session, user: User, atividade_id: int, concluida: bool) -> PartnerActivity:
    acesso.exigir_escrita(user)
    atividade = _buscar_visivel(db, user, atividade_id)
    if atividade.type == "evento":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Evento do histórico não se conclui.")
    atividade.completed_at = datetime.utcnow() if concluida else None
    if concluida and atividade.opportunity_id:
        tocar(db.get(PartnerOpportunity, atividade.opportunity_id))
    db.commit()
    db.refresh(atividade)
    return atividade


def excluir(db: Session, user: User, atividade_id: int) -> None:
    acesso.exigir_escrita(user)
    atividade = _buscar_visivel(db, user, atividade_id)
    if atividade.type == "evento":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Evento do histórico não se exclui.")
    if atividade.user_id != user.id and not acesso.eh_gestao(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só quem criou a atividade, admin ou gerente excluem.")
    db.delete(atividade)
    db.commit()
