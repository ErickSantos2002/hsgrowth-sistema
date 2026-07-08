"""Catálogo de Serviços (tipos de serviço, ex.: Calibração 1). Espelha Product."""
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean

from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class Service(Base, TimestampMixin, SoftDeleteMixin):
    """Um tipo de serviço no catálogo (ex.: Calibração 1)."""
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    sku = Column(String(100), nullable=True, unique=True, index=True)
    unit_price = Column(Numeric(12, 2), nullable=False)
    category = Column(String(100), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    def __repr__(self):
        return f"<Service(id={self.id}, name='{self.name}', sku='{self.sku}')>"
