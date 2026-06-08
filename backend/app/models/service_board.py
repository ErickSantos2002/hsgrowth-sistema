"""
Modelo de ServiceBoard (Quadro de Serviços).
Tabela separada e independente dos boards de vendas.
"""
from sqlalchemy import Column, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class ServiceBoard(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "service_boards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(50), nullable=True, default="#8B5CF6")
    icon = Column(String(50), nullable=True, default="wrench")
    settings = Column(JSON, default={}, nullable=False)

    lists = relationship(
        "ServiceList",
        back_populates="board",
        lazy="dynamic",
        order_by="ServiceList.position",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<ServiceBoard(id={self.id}, name='{self.name}')>"
