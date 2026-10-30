"""
Programa de Parceiros — a oportunidade que o parceiro registra (card do board
"Pipeline de Parceiros") e os produtos dela.

Empresa e contato ficam dentro do card: o parceiro não enxerga Clientes nem
Pessoas do CRM. O canal de aquisição é sempre "Parceiros".
"""
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin


class PartnerOpportunity(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "partner_opportunities"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    seller_member_id = Column(Integer, ForeignKey("partner_team_members.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(500), nullable=False)
    deal_type = Column(String(100), nullable=False)
    sector = Column(String(100), nullable=False)
    relationship_type = Column(String(100), nullable=False)
    # Contexto da indicação e necessidade identificada (regra 9 do documento).
    context = Column(Text, nullable=False)

    # Empresa — CNPJ só com dígitos; a Consulta de CNPJ (Entrega 2) busca por ele.
    cnpj = Column(String(14), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    company_segment = Column(String(255), nullable=True)
    company_city = Column(String(255), nullable=True)
    company_state = Column(String(2), nullable=True)

    contact_name = Column(String(255), nullable=True)
    contact_role = Column(String(255), nullable=True)
    contact_phone = Column(String(30), nullable=True)
    contact_email = Column(String(255), nullable=True)

    # em_analise | validada | rejeitada — quem valida é o Financeiro (ou admin/gerente).
    eligibility_status = Column(String(20), nullable=False, default="em_analise")
    eligibility_note = Column(Text, nullable=True)
    eligibility_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    eligibility_at = Column(DateTime, nullable=True)

    expected_close_date = Column(Date, nullable=True)
    # venda | locacao
    modality = Column(String(10), nullable=True)
    loss_reason = Column(String(255), nullable=True)
    loss_detail = Column(Text, nullable=True)

    stage = Column(String(30), nullable=False, default="novo_lead", index=True)
    position = Column(Numeric(12, 2), nullable=False, default=0)
    # Criar/concluir atividade e mudar de etapa atualizam. A Entrega 2 usa no semáforo.
    last_activity_at = Column(DateTime, nullable=True, index=True)
    won_at = Column(DateTime, nullable=True)
    lost_at = Column(DateTime, nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    partner = relationship("Partner")
    seller = relationship("PartnerTeamMember")
    eligibility_by = relationship("User", foreign_keys=[eligibility_by_id])
    products = relationship(
        "PartnerOpportunityProduct",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self):
        return f"<PartnerOpportunity(id={self.id}, title='{self.title}')>"


class PartnerOpportunityProduct(Base, TimestampMixin):
    __tablename__ = "partner_opportunity_products"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(
        Integer, ForeignKey("partner_opportunities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)

    product = relationship("Product")
