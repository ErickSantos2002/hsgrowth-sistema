"""
Programa de Parceiros — o parceiro e a Equipe dele.

O parceiro (ex.: Dmap) é ao mesmo tempo o canal de aquisição e o card do board
"Aquisição de Parceiros". Tabelas separadas de Vendas e de Serviço: o parceiro
é gente de fora e não pode cruzar com os dados do CRM.
"""
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin


class Partner(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    cnpj = Column(String(14), nullable=True, index=True)

    main_contact_name = Column(String(255), nullable=True)
    main_contact_phone = Column(String(30), nullable=True)
    main_contact_email = Column(String(255), nullable=True)

    # Texto livre até a H&S definir as opções.
    partner_type = Column(String(100), nullable=True)
    origin = Column(String(100), nullable=True)
    segment = Column(String(255), nullable=True)
    region = Column(String(255), nullable=True)

    hs_owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    # aderente | parcialmente_aderente | nao_aderente
    qualification_status = Column(String(30), nullable=True)
    onboarding_date = Column(Date, nullable=True)

    # Primeira evidência de uso do canal: oportunidade_validada | proposta_enviada | primeira_venda
    activation_evidence = Column(String(30), nullable=True)
    activated_at = Column(DateTime, nullable=True)
    # Sem FK de propósito: partner_opportunities já aponta para partners.
    activation_opportunity_id = Column(Integer, nullable=True)

    # Código da etapa (app/services/parcerias/etapas.py) e ordem na coluna.
    stage = Column(String(30), nullable=False, default="potencial", index=True)
    position = Column(Numeric(12, 2), nullable=False, default=0)

    loss_reason = Column(String(255), nullable=True)
    loss_detail = Column(Text, nullable=True)
    lost_at = Column(DateTime, nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    hs_owner = relationship("User", foreign_keys=[hs_owner_id])
    team = relationship("PartnerTeamMember", back_populates="partner", order_by="PartnerTeamMember.name")

    def __repr__(self):
        return f"<Partner(id={self.id}, name='{self.name}')>"


class PartnerTeamMember(Base, TimestampMixin):
    """Vendedor da equipe do parceiro. O login dele vem numa entrega futura (user_id)."""
    __tablename__ = "partner_team_members"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(30), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    partner = relationship("Partner", back_populates="team")
