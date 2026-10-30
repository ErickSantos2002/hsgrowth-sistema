"""Montagem das respostas da API de Parcerias (nomes e totais que a tela mostra)."""
from typing import Dict, Iterable, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunity, PartnerOpportunityProduct
from app.schemas.parcerias import (
    AtividadeResponse,
    OportunidadeResponse,
    ParceiroResponse,
    ProdutoItemResponse,
)


def contagem_por_etapa(db: Session, partner_id: int) -> Dict[str, int]:
    linhas = (
        db.query(PartnerOpportunity.stage, func.count(PartnerOpportunity.id))
        .filter(PartnerOpportunity.partner_id == partner_id, PartnerOpportunity.is_deleted.is_(False))
        .group_by(PartnerOpportunity.stage)
        .all()
    )
    return {etapa: total for etapa, total in linhas}


def parceiro_out(db: Session, p: Partner) -> ParceiroResponse:
    return ParceiroResponse.model_validate(p).model_copy(update={
        "hs_owner_name": p.hs_owner.name if p.hs_owner else None,
        "oportunidades_por_etapa": contagem_por_etapa(db, p.id),
    })


def valores_por_oportunidade(db: Session, ids: Iterable[int]) -> Dict[int, float]:
    ids = list(ids)
    if not ids:
        return {}
    linhas = (
        db.query(
            PartnerOpportunityProduct.opportunity_id,
            func.sum(PartnerOpportunityProduct.quantity * PartnerOpportunityProduct.unit_price),
        )
        .filter(PartnerOpportunityProduct.opportunity_id.in_(ids))
        .group_by(PartnerOpportunityProduct.opportunity_id)
        .all()
    )
    return {op_id: float(total or 0) for op_id, total in linhas}


def oportunidade_out(op: PartnerOpportunity, total: float = 0) -> OportunidadeResponse:
    return OportunidadeResponse.model_validate(op).model_copy(update={
        "partner_name": op.partner.name if op.partner else None,
        "seller_name": op.seller.name if op.seller else None,
        "eligibility_by_name": op.eligibility_by.name if op.eligibility_by else None,
        "total_value": total,
    })


def oportunidades_out(db: Session, ops: List[PartnerOpportunity]) -> List[OportunidadeResponse]:
    totais = valores_por_oportunidade(db, [op.id for op in ops])
    return [oportunidade_out(op, totais.get(op.id, 0)) for op in ops]


def item_out(item: PartnerOpportunityProduct) -> ProdutoItemResponse:
    preco = float(item.unit_price or 0)
    return ProdutoItemResponse(
        id=item.id,
        product_id=item.product_id,
        product_name=item.product.name if item.product else "",
        quantity=item.quantity,
        unit_price=preco,
        total=preco * item.quantity,
    )


def atividade_out(a: PartnerActivity) -> AtividadeResponse:
    return AtividadeResponse.model_validate(a).model_copy(update={
        "user_name": a.user.name if a.user else None,
    })
