"""
Modelo de ServiceCard (Card de Serviços).
Tabela separada e independente dos cards de vendas.
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Numeric, DateTime, JSON, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class ServiceCard(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "service_cards"

    id = Column(Integer, primary_key=True, index=True)
    list_id = Column(Integer, ForeignKey("service_lists.id", ondelete="CASCADE"), nullable=False, index=True)

    # Responsável
    assigned_to_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Informações básicas
    title = Column(String(500), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Posição no kanban
    position = Column(Numeric(12, 2), default=0, nullable=False)

    # Empresa e contato vinculados
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True)

    # Dados de contato/cliente (JSON livre para customização futura)
    contact_info = Column(JSON, nullable=True)

    # Condições de pagamento (JSON) — legado dos produtos, hoje dormente.
    # Ex: { "payment_method": "PIX", "installments": 1, "notes": "..." }
    payment_info = Column(JSON, nullable=True)

    # Desconto global e frete sobre o total dos SERVIÇOS do card.
    # O Valor do negócio = soma dos serviços − desconto global + frete
    # (ver deal_value_by_card). global_discount_type: "value" (R$) | "percent" (%).
    global_discount = Column(Numeric(12, 2), nullable=False, default=0, server_default="0")
    global_discount_type = Column(String(10), nullable=False, default="value", server_default="value")
    shipping = Column(Numeric(12, 2), nullable=False, default=0, server_default="0")

    # Informações de negócio do Resumo (JSON livre) — herdadas de Vendas e
    # específicas de Serviço. Ex:
    # { "seller_name": "Sandra Silva", "deal_type": "Nova Venda",
    #   "acquisition_channel": "Inbound", "acquisition_channel_detail": "Levantada de mão",
    #   "modality": "venda" | "locacao", "should_invoice": true }
    business_info = Column(JSON, nullable=True)

    # Data prevista de conclusão
    due_date = Column(DateTime, nullable=True)

    # Identidade da entidade de origem, quando o card veio de um sistema externo.
    # Ex: ("gestorhs.os", "1234") ou ("gestorhs.calibracao", "500:2027-03-14").
    # Ambas NULL em cards criados por humanos.
    external_source = Column(String(50), nullable=True, index=True)
    external_id = Column(String(100), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("external_source", "external_id", name="unique_service_card_external_ref"),
    )

    # Relacionamentos
    list = relationship("ServiceList", back_populates="cards")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    client = relationship("Client", foreign_keys=[client_id])
    person = relationship("Person", foreign_keys=[person_id])
    products = relationship(
        "ServiceCardProduct",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    activities = relationship(
        "ServiceCardActivity",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self):
        return f"<ServiceCard(id={self.id}, title='{self.title}')>"
