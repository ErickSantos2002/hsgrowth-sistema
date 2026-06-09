"""
Modelo de ServiceCard (Card de Serviços).
Tabela separada e independente dos cards de vendas.
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Numeric, DateTime, JSON
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

    # Condições de pagamento e desconto global dos produtos (JSON)
    # Ex: { "global_discount": 100, "global_discount_type": "value",
    #       "payment_method": "PIX", "installments": 1, "notes": "..." }
    payment_info = Column(JSON, nullable=True)

    # Data prevista de conclusão
    due_date = Column(DateTime, nullable=True)

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
