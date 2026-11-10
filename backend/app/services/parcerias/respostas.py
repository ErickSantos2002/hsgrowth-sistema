"""Montagem das respostas da API de Parcerias (nomes e totais que a tela mostra)."""
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.partner import Partner, PartnerTeamMember
from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunity, PartnerOpportunityProduct
from app.models.user import User
from app.services import tokens_de_acesso
from app.services.parcerias import acesso
from app.schemas.parcerias import (
    AcessoCriadoResponse,
    AtividadeResponse,
    MembroResponse,
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


def pendencias(db: Session, campo, ids: Iterable[int]) -> Dict[int, Tuple[str, int]]:
    """Situação das atividades em aberto de cada card, como nos boards de Serviço:
    a pior vence (atrasada > hoje > futura). Sem atividade em aberto, "none"."""
    ids = list(ids)
    if not ids:
        return {}
    q = db.query(campo, PartnerActivity.due_date).filter(
        campo.in_(ids),
        PartnerActivity.category == "atividade",
        PartnerActivity.is_completed.is_(False),
    )
    if campo is PartnerActivity.partner_id:
        q = q.filter(PartnerActivity.opportunity_id.is_(None))
    agora = datetime.utcnow()
    inicio = datetime(agora.year, agora.month, agora.day)
    fim = inicio + timedelta(days=1)
    ordem = {"none": 0, "future": 1, "today": 2, "overdue": 3}
    saida: Dict[int, Tuple[str, int]] = {}
    for card_id, prazo in q.all():
        situacao, total = saida.get(card_id, ("none", 0))
        if prazo:
            desta = "overdue" if prazo < inicio else "today" if prazo < fim else "future"
            if ordem[desta] > ordem[situacao]:
                situacao = desta
        saida[card_id] = (situacao, total + 1)
    return saida


def _com_pendencia(resposta, pendencia: Tuple[str, int]):
    return resposta.model_copy(update={"pending_status": pendencia[0], "pending_count": pendencia[1]})


def parceiro_out(db: Session, p: Partner) -> ParceiroResponse:
    contrato = None
    if p.contract_activity_id is not None:
        contrato = db.query(PartnerActivity.file_name).filter(PartnerActivity.id == p.contract_activity_id).scalar()
    return ParceiroResponse.model_validate(p).model_copy(update={
        "hs_owner_name": p.hs_owner.name if p.hs_owner else None,
        "oportunidades_por_etapa": contagem_por_etapa(db, p.id),
        "contract_file_name": contrato,
    })


def parceiros_out(db: Session, lista: List[Partner]) -> List[ParceiroResponse]:
    situacoes = pendencias(db, PartnerActivity.partner_id, [p.id for p in lista])
    return [_com_pendencia(parceiro_out(db, p), situacoes.get(p.id, ("none", 0))) for p in lista]


def valor_do_negocio(total_produtos: float, op: PartnerOpportunity) -> float:
    """Como no card de Serviço: produtos − desconto geral (R$ ou %) + frete, nunca negativo."""
    desconto = float(op.global_discount or 0)
    if op.global_discount_type == "percent":
        desconto = round(total_produtos * desconto / 100, 2)
    return max(0.0, round(total_produtos - desconto + float(op.shipping or 0), 2))


def valores_por_oportunidade(db: Session, ops: Iterable[PartnerOpportunity]) -> Dict[int, float]:
    ops = list(ops)
    if not ops:
        return {}
    linhas = (
        db.query(
            PartnerOpportunityProduct.opportunity_id,
            func.sum(PartnerOpportunityProduct.quantity * PartnerOpportunityProduct.unit_price
                     - PartnerOpportunityProduct.discount),
        )
        .filter(PartnerOpportunityProduct.opportunity_id.in_([op.id for op in ops]))
        .group_by(PartnerOpportunityProduct.opportunity_id)
        .all()
    )
    produtos = {op_id: float(total or 0) for op_id, total in linhas}
    return {op.id: valor_do_negocio(produtos.get(op.id, 0.0), op) for op in ops}


def oportunidade_out(op: PartnerOpportunity, total: float = 0, user: Optional[User] = None) -> OportunidadeResponse:
    # O parceiro vê a cor e o motivo, não a justificativa da gestão nem quem liberou.
    para_parceiro = user is not None and acesso.eh_parceiro(user)
    return OportunidadeResponse.model_validate(op).model_copy(update={
        "partner_name": op.partner.name if op.partner else None,
        "seller_name": op.seller.name if op.seller else None,
        "eligibility_by_name": op.eligibility_by.name if op.eligibility_by else None,
        "won_confirmed_by_name": op.won_confirmed_by.name if op.won_confirmed_by else None,
        "total_value": total,
        "cnpj_justificativa": None if para_parceiro else op.cnpj_justificativa,
        "cnpj_liberado_por_name": None if para_parceiro or not op.cnpj_liberado_por else op.cnpj_liberado_por.name,
        # O parceiro não enxerga a base da H&S: o vínculo com Cliente/Pessoa é só para a H&S.
        "client_id": None if para_parceiro else op.client_id,
        "client_name": None if para_parceiro or not op.client else op.client.display_name,
        "person_id": None if para_parceiro else op.person_id,
        "person_name": None if para_parceiro or not op.person else op.person.name,
    })


def oportunidades_out(db: Session, ops: List[PartnerOpportunity], user: Optional[User] = None) -> List[OportunidadeResponse]:
    ids = [op.id for op in ops]
    totais = valores_por_oportunidade(db, ops)
    situacoes = pendencias(db, PartnerActivity.opportunity_id, ids)
    return [
        _com_pendencia(oportunidade_out(op, totais.get(op.id, 0), user), situacoes.get(op.id, ("none", 0)))
        for op in ops
    ]


def item_out(item: PartnerOpportunityProduct) -> ProdutoItemResponse:
    preco = float(item.unit_price or 0)
    desconto = float(item.discount or 0)
    subtotal = round(preco * item.quantity, 2)
    return ProdutoItemResponse(
        id=item.id,
        product_id=item.product_id,
        product_name=item.product.name if item.product else "",
        product_sku=item.product.sku if item.product else None,
        quantity=item.quantity,
        unit_price=preco,
        discount=desconto,
        subtotal=subtotal,
        total=round(subtotal - desconto, 2),
    )


def atividade_out(a: PartnerActivity, user: Optional[User] = None) -> AtividadeResponse:
    extras = {"user_name": a.user.name if a.user else None}
    texto = a.description or ""
    if user is not None and acesso.eh_parceiro(user) and texto.startswith("Cadastro liberado pela gestão"):
        # A justificativa é da gestão; o parceiro vê só que houve a liberação.
        extras["description"] = texto.split(" Justificativa:")[0]
    return AtividadeResponse.model_validate(a).model_copy(update=extras)


def acesso_out(db: Session, login: User, email_enviado: bool = False) -> AcessoCriadoResponse:
    return AcessoCriadoResponse.model_validate(login).model_copy(update={
        **tokens_de_acesso.campos_do_acesso(db, login), "email_enviado": email_enviado,
    })


def membro_out(db: Session, m: PartnerTeamMember) -> MembroResponse:
    campos = {"status_acesso": None, "convite_expira_em": None}
    if m.user_id:
        login = db.query(User).filter(User.id == m.user_id).first()
        if login:
            campos = tokens_de_acesso.campos_do_acesso(db, login)
    return MembroResponse.model_validate(m).model_copy(update=campos)
