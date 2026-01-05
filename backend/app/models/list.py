"""
Modelo de List (Lista/Coluna).
Representa uma lista (coluna) dentro de um quadro.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class List(Base, TimestampMixin):
    """
    Representa uma lista (coluna) dentro de um quadro.
    Exemplos: "Leads Novos", "Em Negociação", "Fechados", etc.
    """
    __tablename__ = "lists"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Board
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)

    # Informações básicas
    name = Column(String(255), nullable=False)
    position = Column(Integer, default=0, nullable=False)  # Ordem de exibição

    # Configurações
    is_done_stage = Column(Boolean, default=False, nullable=False)  # Lista de "concluídos/ganhos"
    is_lost_stage = Column(Boolean, default=False, nullable=False)  # Lista de "perdidos"

    # Relacionamentos
    board = relationship("Board", back_populates="lists")
    cards = relationship("Card", back_populates="list", lazy="dynamic", order_by="Card.position", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<List(id={self.id}, name='{self.name}', board_id={self.board_id})>"
