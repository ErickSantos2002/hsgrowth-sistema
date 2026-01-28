"""
Modelo de CardProduct (Produto associado a um Card).
Representa a relação many-to-many entre Card e Product com campos adicionais.
"""
from sqlalchemy import Column, Integer, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class CardProduct(Base, TimestampMixin):
    """
    Representa um produto adicionado a um card específico.
    Relação: Card <-> Product (many-to-many com campos extras)
    """
    __tablename__ = "card_products"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Card
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relacionamento com Product
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)

    # Detalhes do produto no card
    quantity = Column(Integer, nullable=False, default=1)  # Quantidade
    unit_price = Column(Numeric(12, 2), nullable=False)  # Preço unitário (pode diferir do catálogo)
    discount = Column(Numeric(12, 2), nullable=False, default=0)  # Desconto em valor absoluto

    # Observações
    notes = Column(Text, nullable=True)  # Observações sobre o produto neste card

    # Constraint: um card não pode ter o mesmo produto duplicado
    __table_args__ = (
        UniqueConstraint('card_id', 'product_id', name='unique_card_product'),
    )

    # Relacionamentos
    card = relationship("Card", back_populates="products")
    product = relationship("Product", back_populates="card_products")

    def __repr__(self):
        return f"<CardProduct(card_id={self.card_id}, product_id={self.product_id}, qty={self.quantity})>"

    @property
    def subtotal(self) -> float:
        """Calcula o subtotal (quantidade * preço unitário)"""
        return float(self.quantity * self.unit_price)

    @property
    def total(self) -> float:
        """Calcula o total (subtotal - desconto)"""
        return self.subtotal - float(self.discount)
