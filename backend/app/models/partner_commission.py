"""
Programa de Parceiros — comissões: configuração única, lançamentos e calibrações.

Quem recebe é sempre um Partner (empresa ou hunter). Percentuais em Numeric(5, 2)
(7.50 = 7,5%) e dinheiro em Numeric(12, 2).
"""
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, text

from app.db.base import Base


class PartnerCommissionConfig(Base):
    """Uma linha só: Y% venda própria (empresa e hunter), X% indicação, bônus da 1ª venda, prazo,
    Z% calibração (renovação) e a anuidade de referência da previsão das renovações."""
    __tablename__ = "partner_commission_config"

    id = Column(Integer, primary_key=True, index=True)
    own_sale_pct = Column(Numeric(5, 2), nullable=False, default=0)
    indication_pct = Column(Numeric(5, 2), nullable=False, default=0)
    first_sale_bonus = Column(Numeric(12, 2), nullable=False, default=0)
    indication_months = Column(Integer, nullable=False, default=24)
    calibration_pct = Column(Numeric(5, 2), nullable=False, default=0)
    hunter_own_sale_pct = Column(Numeric(5, 2), nullable=False, default=0)
    annual_fee_reference = Column(Numeric(12, 2), nullable=False, default=0)  # só para a previsão
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class PartnerCalibration(Base):
    __tablename__ = "partner_calibrations"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(Integer, ForeignKey("partner_opportunities.id", ondelete="CASCADE"),
                            nullable=False, index=True)
    serial_number = Column(String(60), nullable=False)
    calibration_date = Column(Date, nullable=False)
    value = Column(Numeric(12, 2), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class PartnerCommission(Base):
    __tablename__ = "partner_commissions"
    # Um lançamento ativo (pendente/paga) por oportunidade e tipo — barra a corrida de duas confirmações.
    # Calibração fica de fora: cada calibração tem o seu.
    __table_args__ = (
        Index(
            "uq_partner_commissions_ativo_por_tipo", "opportunity_id", "kind", unique=True,
            postgresql_where=text("status IN ('pendente', 'paga') AND kind <> 'calibracao'"),
            sqlite_where=text("status IN ('pendente', 'paga') AND kind <> 'calibracao'"),
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    beneficiary_partner_id = Column(Integer, ForeignKey("partners.id", ondelete="RESTRICT"),
                                    nullable=False, index=True)
    # A empresa/hunter que vendeu.
    source_partner_id = Column(Integer, ForeignKey("partners.id", ondelete="RESTRICT"), nullable=False)
    opportunity_id = Column(Integer, ForeignKey("partner_opportunities.id", ondelete="RESTRICT"),
                            nullable=False, index=True)
    calibration_id = Column(Integer, ForeignKey("partner_calibrations.id", ondelete="RESTRICT"), nullable=True)
    # venda_propria | indicacao | bonus_primeira_venda | calibracao
    kind = Column(String(20), nullable=False)
    base_value = Column(Numeric(12, 2), nullable=False, default=0)
    rate = Column(Numeric(5, 2), nullable=True)
    fixed_value = Column(Numeric(12, 2), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False, default=0)
    # pendente | paga | cancelada
    status = Column(String(12), nullable=False, default="pendente", index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    paid_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancel_reason = Column(String(255), nullable=True)
