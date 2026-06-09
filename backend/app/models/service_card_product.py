"""
Modelo de ServiceCardProduct (Produto associado a um Card de Serviços).
Tabela independente do card_products de vendas — relaciona ServiceCard <-> Product.
"""
from sqlalchemy import Column, Integer, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ServiceCardProduct(Base, TimestampMixin):
    """
    Representa um produto adicionado a um card de serviços.
    Relação: ServiceCard <-> Product (many-to-many com campos extras).
    """
    __tablename__ = "service_card_products"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com ServiceCard
    service_card_id = Column(
        Integer,
        ForeignKey("service_cards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Relacionamento com Product (catálogo compartilhado com vendas)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Detalhes do produto no card
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount = Column(Numeric(12, 2), nullable=False, default=0)  # Desconto absoluto

    notes = Column(Text, nullable=True)

    # Um card não pode ter o mesmo produto duplicado
    __table_args__ = (
        UniqueConstraint("service_card_id", "product_id", name="unique_service_card_product"),
    )

    # Relacionamento unidirecional com o catálogo de produtos
    product = relationship("Product")

    def __repr__(self):
        return f"<ServiceCardProduct(service_card_id={self.service_card_id}, product_id={self.product_id}, qty={self.quantity})>"

    @property
    def subtotal(self) -> float:
        """Subtotal (quantidade * preço unitário)."""
        return float(self.quantity * self.unit_price)

    @property
    def total(self) -> float:
        """Total (subtotal - desconto)."""
        return self.subtotal - float(self.discount)
