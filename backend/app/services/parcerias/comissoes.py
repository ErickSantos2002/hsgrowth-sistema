"""
Comissões de Parcerias: lançamentos gerados quando a H&S confirma o ganho e
cancelados quando o ganho é desfeito antes do pagamento.

Regras (spec 2026-11-11, §4.1-4.2 e §8):
- Só venda gera comissão (`locacao` não; `modality` nula conta como venda).
- Base = produtos − desconto geral, sem o frete, nunca negativa.
- Y% venda própria para quem vendeu (empresa ou hunter), sem prazo.
- X% indicação + bônus fixo da primeira venda para o indicador da hora da
  confirmação (não excluído e não bloqueado). O X% vale até `âncora + meses`
  (meses de calendário), contando da primeira venda confirmada de quem vendeu.
- Um lançamento ativo (pendente/paga) por (oportunidade, tipo), seja qual for o
  beneficiário — o índice único parcial garante isso também numa corrida. O
  cancelado só é reaproveitado quando o beneficiário é o mesmo.
"""
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import List, Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.partner_commission import PartnerCommission, PartnerCommissionConfig
from app.models.partner_opportunity import PartnerOpportunity
from app.services.parcerias import respostas

CENTAVO = Decimal("0.01")
ZERO = Decimal("0.00")
ATIVOS = ("pendente", "paga")


def _dinheiro(valor) -> Decimal:
    return Decimal(str(valor or 0)).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def base_sem_frete(db: Session, op: PartnerOpportunity) -> Decimal:
    """Produtos − desconto geral, sem o frete, nunca negativa."""
    total = respostas.totais_de_produtos(db, [op.id]).get(op.id, ZERO)
    return max(ZERO, respostas.produtos_menos_desconto(total, op))


def _config(db: Session) -> PartnerCommissionConfig:
    """A linha única; sem ela, tudo zero (nada é gerado, mas a âncora é gravada)."""
    return db.query(PartnerCommissionConfig).first() or PartnerCommissionConfig(
        own_sale_pct=0, indication_pct=0, first_sale_bonus=0, indication_months=0, calibration_pct=0,
    )


def _indicador(db: Session, vendedor: Partner) -> Optional[Partner]:
    """Quem indicou o vendedor agora — se ainda existe e não está bloqueado."""
    # Pela coluna, não pela relationship: a troca de indicador vale na hora.
    if vendedor.indicated_by_partner_id is None:
        return None
    ind = db.get(Partner, vendedor.indicated_by_partner_id)
    if ind is None or ind.id == vendedor.id or ind.is_deleted or ind.stage == "bloqueado":
        return None
    return ind


def _ja_lancado(db: Session, op_id: int, kind: str) -> bool:
    """Já há lançamento ativo deste tipo na oportunidade (de qualquer beneficiário)?"""
    return db.query(PartnerCommission.id).filter(
        PartnerCommission.opportunity_id == op_id,
        PartnerCommission.kind == kind,
        PartnerCommission.status.in_(ATIVOS),
    ).first() is not None


def _lancar(db: Session, op: PartnerOpportunity, kind: str, beneficiario_id: int, base: Decimal,
            agora: datetime, rate=None, fixed_value=None) -> Optional[PartnerCommission]:
    if rate is not None:
        rate = Decimal(str(rate))
        valor = (base * rate / 100).quantize(CENTAVO, rounding=ROUND_HALF_UP)
    else:
        fixed_value = _dinheiro(fixed_value)
        valor = fixed_value
    if valor <= 0 or _ja_lancado(db, op.id, kind):
        return None

    cancelado = db.query(PartnerCommission).filter(
        PartnerCommission.opportunity_id == op.id,
        PartnerCommission.kind == kind,
        PartnerCommission.beneficiary_partner_id == beneficiario_id,
        PartnerCommission.status == "cancelada",
    ).order_by(PartnerCommission.id).first()
    try:
        # Savepoint: se outra transação gerou antes (índice único), só este lançamento volta.
        with db.begin_nested():
            c = cancelado or PartnerCommission(
                opportunity_id=op.id, kind=kind, beneficiary_partner_id=beneficiario_id, created_at=agora,
            )
            c.source_partner_id = op.partner_id
            c.base_value, c.rate, c.fixed_value, c.amount = base, rate, fixed_value, valor
            c.status = "pendente"
            c.cancelled_at = c.cancel_reason = None
            db.add(c)
            db.flush()
    except IntegrityError:
        return None  # já gerado por outra confirmação
    return c


def gerar(db: Session, op: PartnerOpportunity, agora: datetime) -> List[PartnerCommission]:
    """Lançamentos da confirmação do ganho. Não faz commit (vai na transação da confirmação)."""
    if op.modality == "locacao":
        return []
    vendedor = op.partner
    cfg = _config(db)
    base = base_sem_frete(db, op)
    gerados = [_lancar(db, op, "venda_propria", vendedor.id, base, agora, rate=cfg.own_sale_pct)]

    # A âncora é a primeira venda confirmada de quem vendeu, com ou sem indicador.
    primeira = vendedor.first_sale_at is None or vendedor.first_sale_opportunity_id == op.id
    if vendedor.first_sale_at is None:
        vendedor.first_sale_at = agora
        vendedor.first_sale_opportunity_id = op.id

    indicador = _indicador(db, vendedor)
    if indicador is not None:
        if primeira:
            gerados.append(_lancar(db, op, "bonus_primeira_venda", indicador.id, base, agora,
                                   fixed_value=cfg.first_sale_bonus))
        prazo = vendedor.first_sale_at + relativedelta(months=int(cfg.indication_months or 0))
        if agora <= prazo:
            gerados.append(_lancar(db, op, "indicacao", indicador.id, base, agora, rate=cfg.indication_pct))
    db.flush()
    return [c for c in gerados if c is not None]


def _reancorar(db: Session, vendedor: Partner, desfeita: PartnerOpportunity, agora: datetime) -> None:
    """
    A primeira venda foi desfeita sem nada pago: a próxima venda confirmada vira a
    âncora e o indicador dela (o do X% já lançado) recebe o bônus. Sem outra venda
    confirmada, a âncora fica vazia e a próxima confirmação vira a primeira.
    """
    outra = db.query(PartnerOpportunity).filter(
        PartnerOpportunity.partner_id == vendedor.id,
        PartnerOpportunity.id != desfeita.id,
        PartnerOpportunity.won_confirmed_at.isnot(None),
        or_(PartnerOpportunity.modality.is_(None), PartnerOpportunity.modality != "locacao"),
        PartnerOpportunity.is_deleted.is_(False),
    ).order_by(PartnerOpportunity.won_confirmed_at, PartnerOpportunity.id).first()
    if outra is None:
        vendedor.first_sale_at = vendedor.first_sale_opportunity_id = None
        return
    vendedor.first_sale_at = outra.won_confirmed_at
    vendedor.first_sale_opportunity_id = outra.id
    indicacao = db.query(PartnerCommission).filter(
        PartnerCommission.opportunity_id == outra.id,
        PartnerCommission.kind == "indicacao",
        PartnerCommission.status.in_(ATIVOS),
    ).first()
    if indicacao is not None:
        _lancar(db, outra, "bonus_primeira_venda", indicacao.beneficiary_partner_id,
                _dinheiro(indicacao.base_value), agora, fixed_value=_config(db).first_sale_bonus)


def cancelar_da_oportunidade(db: Session, op: PartnerOpportunity, motivo: str) -> None:
    """Ganho negado ou desfeito: cancela os pendentes (o pago fica) e refaz a âncora se cabe."""
    agora = datetime.utcnow()
    pendentes = db.query(PartnerCommission).filter(
        PartnerCommission.opportunity_id == op.id,
        PartnerCommission.status == "pendente",
        PartnerCommission.kind != "calibracao",
    ).all()
    for c in pendentes:
        c.status = "cancelada"
        c.cancelled_at = agora
        c.cancel_reason = (motivo or "")[:255] or None
    db.flush()

    vendedor = op.partner
    if vendedor is not None and vendedor.first_sale_opportunity_id == op.id:
        algo_pago = db.query(PartnerCommission.id).filter(
            PartnerCommission.opportunity_id == op.id,
            PartnerCommission.status == "paga",
        ).first()
        if algo_pago is None:
            _reancorar(db, vendedor, op, agora)
    db.flush()
