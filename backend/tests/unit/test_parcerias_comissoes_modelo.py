"""Tabelas de comissão de Parcerias: configuração única, lançamentos, calibrações e âncora."""
from datetime import date, datetime
from decimal import Decimal

from app.models.partner_commission import PartnerCalibration, PartnerCommission, PartnerCommissionConfig

from tests.unit.apoio_parcerias import config_comissoes, oportunidade_ganha, parceiro


def test_config_unica_e_lancamento_basico(db):
    cfg = config_comissoes(db, y=10, x=5, bonus=100, meses=24, z=8)
    assert config_comissoes(db, y=12).id == cfg.id
    assert db.query(PartnerCommissionConfig).count() == 1
    assert db.query(PartnerCommissionConfig).one().own_sale_pct == Decimal("12")

    p = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, p, 1000)
    assert op.stage == "ganho" and len(op.products) == 1
    cal = PartnerCalibration(opportunity_id=op.id, serial_number="ABC123",
                             calibration_date=date(2026, 11, 1), value=Decimal("200.00"))
    db.add(cal)
    db.commit()
    db.add(PartnerCommission(beneficiary_partner_id=p.id, source_partner_id=p.id, opportunity_id=op.id,
                             calibration_id=cal.id, kind="calibracao", base_value=Decimal("200.00"),
                             rate=Decimal("8.00"), amount=Decimal("16.00"), status="pendente"))
    p.first_sale_at = datetime(2026, 11, 2)
    p.first_sale_opportunity_id = op.id
    db.commit()

    c = db.query(PartnerCommission).one()
    assert (c.kind, c.amount, c.fixed_value, c.paid_at) == ("calibracao", Decimal("16.00"), None, None)
    assert c.created_at is not None
    db.refresh(p)
    assert p.first_sale_opportunity_id == op.id
