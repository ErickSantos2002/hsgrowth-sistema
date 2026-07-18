"""
Modelo de ServiceList (Lista/Coluna de Serviços).
Tabela separada e independente das listas de vendas.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ServiceList(Base, TimestampMixin):
    __tablename__ = "service_lists"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("service_boards.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    color = Column(String(7), nullable=True)
    position = Column(Integer, default=0, nullable=False)
    is_done_stage = Column(Boolean, default=False, nullable=False)
    is_lost_stage = Column(Boolean, default=False, nullable=False)
    # Etapa por onde entram os cards criados por integração externa.
    # Board sem nenhuma lista marcada rejeita a criação via integração (404).
    is_entry_stage = Column(Boolean, default=False, nullable=False)

    board = relationship("ServiceBoard", back_populates="lists")
    cards = relationship(
        "ServiceCard",
        back_populates="list",
        lazy="dynamic",
        order_by="ServiceCard.position",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<ServiceList(id={self.id}, name='{self.name}', board_id={self.board_id})>"
