"""Termos do Programa de Parceiros (um texto por público) e o aceite de cada login."""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint

from app.db.base import Base


class PartnerTerms(Base):
    __tablename__ = "partner_terms"
    __table_args__ = (UniqueConstraint("audience", "version", name="uq_partner_terms_audience_version"),)

    id = Column(Integer, primary_key=True, index=True)
    audience = Column(String(10), nullable=False)  # empresa | hunter
    version = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    published_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    published_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class PartnerTermsAcceptance(Base):
    __tablename__ = "partner_terms_acceptances"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    terms_id = Column(Integer, ForeignKey("partner_terms.id", ondelete="CASCADE"), nullable=False)
    accepted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ip_address = Column(String(64), nullable=True)
