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
- Idempotente por (oportunidade, tipo, beneficiário): pendente/paga não se
  repete; cancelada é reaproveitada.
"""
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import List, Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.partner_commission import PartnerCommission, PartnerCommissionConfig
from app.models.partner_opportunity import PartnerOpportunity
from app.services.parcerias import respostas

CENTAVO = Decimal("0.01")
ZERO = Decimal("0.00")


def _dinheiro(valor) -> Decimal:
    return Decimal(str(valor or 0)).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def base_sem_frete(db: Session, op: PartnerOpportunity) -> Decimal:
    """Produtos − desconto geral, sem o frete, nunca negativa."""
    total = respostas.totais_de_produtos(db, [op.id]).get(op.id, 0.0)
    return max(ZERO, _dinheiro(respostas.produtos_menos_desconto(total, op)))


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


def _lancar(db: Session, op: PartnerOpportunity, kind: str, beneficiario: Partner, base: Decimal,
            agora: datetime, rate=None, fixed_value=None) -> Optional[PartnerCommission]:
    if rate is not None:
        rate = Decimal(str(rate))
        valor = (base * rate / 100).quantize(CENTAVO, rounding=ROUND_HALF_UP)
    else:
        fixed_value = _dinheiro(fixed_value)
        valor = fixed_value
    if valor <= 0:
        return None

    existentes = db.query(PartnerCommission).filter(
        PartnerCommission.opportunity_id == op.id,
        PartnerCommission.kind == kind,
        PartnerCommission.beneficiary_partner_id == beneficiario.id,
    ).order_by(PartnerCommission.id).all()
    if any(c.status in ("pendente", "paga") for c in existentes):
        return None
    c = existentes[0] if existentes else PartnerCommission(
        opportunity_id=op.id, kind=kind, beneficiary_partner_id=beneficiario.id, created_at=agora,
    )
    c.source_partner_id = op.partner_id
    c.base_value, c.rate, c.fixed_value, c.amount = base, rate, fixed_value, valor
    c.status = "pendente"
    c.cancelled_at = c.cancel_reason = None
    db.add(c)
    return c


def gerar(db: Session, op: PartnerOpportunity, agora: datetime) -> List[PartnerCommission]:
    """Lançamentos da confirmação do ganho. Não faz commit (vai na transação da confirmação)."""
    if op.modality == "locacao":
        return []
    vendedor = op.partner
    cfg = _config(db)
    base = base_sem_frete(db, op)
    gerados = [_lancar(db, op, "venda_propria", vendedor, base, agora, rate=cfg.own_sale_pct)]

    # A âncora é a primeira venda confirmada de quem vendeu, com ou sem indicador.
    primeira = vendedor.first_sale_at is None or vendedor.first_sale_opportunity_id == op.id
    if vendedor.first_sale_at is None:
        vendedor.first_sale_at = agora
        vendedor.first_sale_opportunity_id = op.id

    indicador = _indicador(db, vendedor)
    if indicador is not None:
        if primeira:
            gerados.append(_lancar(db, op, "bonus_primeira_venda", indicador, base, agora,
                                   fixed_value=cfg.first_sale_bonus))
        prazo = vendedor.first_sale_at + relativedelta(months=int(cfg.indication_months or 0))
        if agora <= prazo:
            gerados.append(_lancar(db, op, "indicacao", indicador, base, agora, rate=cfg.indication_pct))
    db.flush()
    return [c for c in gerados if c is not None]


def cancelar_da_oportunidade(db: Session, op: PartnerOpportunity, motivo: str) -> None:
    """Ganho negado ou desfeito: cancela os pendentes (o pago fica) e libera a âncora se cabe."""
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

    vendedor = op.partner
    if vendedor is not None and vendedor.first_sale_opportunity_id == op.id:
        bonus_pago = db.query(PartnerCommission).filter(
            PartnerCommission.opportunity_id == op.id,
            PartnerCommission.kind == "bonus_primeira_venda",
            PartnerCommission.status == "paga",
        ).first()
        if bonus_pago is None:
            vendedor.first_sale_at = vendedor.first_sale_opportunity_id = None
    db.flush()
