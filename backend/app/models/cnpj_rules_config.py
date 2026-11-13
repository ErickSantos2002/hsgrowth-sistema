"""Regras da Consulta de CNPJ (Parcerias e Vendas): uma linha só, editada pelo admin."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer

from app.db.base import Base


class CnpjRulesConfig(Base):
    __tablename__ = "cnpj_rules_config"

    id = Column(Integer, primary_key=True, index=True)
    protection_days = Column(Integer, nullable=False, default=10)
    recent_purchase_days = Column(Integer, nullable=False, default=30)
    recent_loss_days = Column(Integer, nullable=False, default=90)
    daily_query_limit = Column(Integer, nullable=False, default=20)
    block_between_sellers = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
