"""
Modelos de Proposta Comercial (Propostas) — exclusivo do módulo de Serviço.
"""
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class Proposal(Base, TimestampMixin, SoftDeleteMixin):
    """Proposta comercial de serviço, opcionalmente vinculada a um card de Serviço."""
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, nullable=False, unique=True, index=True)  # sequência própria

    # Vínculos
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="SET NULL"), nullable=True)
    service_card_id = Column(Integer, ForeignKey("service_cards.id", ondelete="SET NULL"), nullable=True, index=True)

    # Cabeçalho
    seller_name = Column(String(255), nullable=True)
    date = Column(Date, nullable=True)
    next_contact_date = Column(Date, nullable=True)
    intro = Column(Text, nullable=True)
    other_items = Column(Text, nullable=True)  # HTML do react-quill

    # Financeiro
    discount = Column(Numeric(12, 2), nullable=False, default=0)
    shipping = Column(Numeric(12, 2), nullable=False, default=0)  # frete

    # Transporte
    shipping_method = Column(String(100), nullable=True)  # forma de envio
    freight_type = Column(String(100), nullable=True)      # forma de frete
    carrier_name = Column(String(255), nullable=True)      # transportador

    # Condições
    payment_terms = Column(String(255), nullable=True)     # condição de pagamento/parcelas
    validity_days = Column(Integer, nullable=True)         # validade (dias)
    delivery_date = Column(Date, nullable=True)            # data prevista de entrega
    delivery_desc = Column(String(500), nullable=True)     # descrição do prazo
    # Endereço de entrega diferente do de cobrança (usado na impressão/visualização — fase 2)
    # delivery_address (JSON): { cep, city, state, street, district, number,
    #   complement, state_registration, recipient, person_type, document, phone }
    different_delivery_address = Column(Boolean, nullable=False, default=False)
    delivery_address = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)                    # observações
    signature = Column(String(255), nullable=True)         # assinatura

    internal_status = Column(String(30), nullable=False, default="rascunho")  # rascunho/enviada

    client = relationship("Client")
    person = relationship("Person")
    service_card = relationship("ServiceCard")
    items = relationship("ProposalItem", back_populates="proposal", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self):
        return f"<Proposal(id={self.id}, number={self.number}, card={self.service_card_id})>"


class ProposalItem(Base, TimestampMixin):
    """Item (produto/serviço) de uma proposta."""
    __tablename__ = "proposal_items"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    description = Column(String(500), nullable=False)  # Item
    sku = Column(String(100), nullable=True)           # Código (SKU)
    quantity = Column(Numeric(12, 4), nullable=False, default=1)
    unit = Column(String(20), nullable=True)           # UN (ex: Unid)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)  # quantity * unit_price

    proposal = relationship("Proposal", back_populates="items")

    def __repr__(self):
        return f"<ProposalItem(id={self.id}, proposal={self.proposal_id}, desc='{self.description}')>"
