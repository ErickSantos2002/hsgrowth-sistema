"""
Modelo de Board (Quadro).
Representa um quadro Kanban no sistema.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class Board(Base, TimestampMixin, SoftDeleteMixin):
    """
    Representa um quadro (board) no sistema.
    Cada quadro contém múltiplas listas (colunas) com cartões.
    """
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)

    # Informações básicas
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Personalização visual
    color = Column(String(50), nullable=True, default="#3B82F6")  # Cor hexadecimal
    icon = Column(String(50), nullable=True, default="grid")  # Nome do ícone Lucide

    # Configurações do quadro (JSON)
    # Exemplo: {"view_mode": "kanban", "columns_visible": [...], etc}
    settings = Column(JSON, default={}, nullable=False)

    # Relacionamentos
    lists = relationship("List", back_populates="board", lazy="dynamic", order_by="List.position", cascade="all, delete-orphan")
    field_definitions = relationship("FieldDefinition", back_populates="board", lazy="dynamic", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Board(id={self.id}, name='{self.name}')>"
