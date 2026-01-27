"""
Modelo de Product (Produto).
Representa o catálogo de produtos/serviços disponíveis.
"""
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class Product(Base, TimestampMixin, SoftDeleteMixin):
    """
    Representa um produto ou serviço no catálogo.
    Exemplo: "Software de Gestão", "Consultoria", "Treinamento", etc.
    """
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    # Informações básicas
    name = Column(String(255), nullable=False, index=True)  # Nome do produto
    description = Column(Text, nullable=True)  # Descrição detalhada
    sku = Column(String(100), nullable=True, unique=True, index=True)  # Código SKU

    # Preço padrão
    unit_price = Column(Numeric(12, 2), nullable=False)  # Preço unitário padrão
    currency = Column(String(3), default="BRL", nullable=False)  # BRL, USD, EUR

    # Categorização
    category = Column(String(100), nullable=True, index=True)  # Categoria do produto

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)  # Produto ativo

    # Relacionamentos
    card_products = relationship("CardProduct", back_populates="product", lazy="dynamic", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', sku='{self.sku}')>"
