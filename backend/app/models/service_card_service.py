"""Serviço vinculado a um Card de Serviço (ServiceCard <-> Service). Espelha ServiceCardProduct (sem aparelhos)."""
from sqlalchemy import Column, Integer, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ServiceCardService(Base, TimestampMixin):
    """Um serviço adicionado a um card de serviços (com quantidade, preço e desconto)."""
    __tablename__ = "service_card_services"
    __table_args__ = (
        UniqueConstraint("service_card_id", "service_id", name="unique_service_card_service"),
    )

    id = Column(Integer, primary_key=True, index=True)
    service_card_id = Column(Integer, ForeignKey("service_cards.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)

    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount = Column(Numeric(12, 2), nullable=False, default=0)
    notes = Column(Text, nullable=True)

    service = relationship("Service")

    def __repr__(self):
        return f"<ServiceCardService(card={self.service_card_id}, service={self.service_id}, qty={self.quantity})>"

    @property
    def subtotal(self) -> float:
        return float(self.quantity * self.unit_price)

    @property
    def total(self) -> float:
        return self.subtotal - float(self.discount)
