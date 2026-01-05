"""
Modelo de Card (Cartão).
Representa um cartão (lead, oportunidade, tarefa) no sistema.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Numeric
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class Card(Base, TimestampMixin, SoftDeleteMixin):
    """
    Representa um cartão no sistema.
    Um cartão é um lead, oportunidade, negócio, etc.
    """
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com List (cada cartão pertence a uma lista)
    list_id = Column(Integer, ForeignKey("lists.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relacionamento com User (responsável)
    assigned_to_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Informações básicas
    title = Column(String(500), nullable=False, index=True)  # Título do cartão
    description = Column(Text, nullable=True)  # Descrição detalhada

    # Posição no kanban
    position = Column(Integer, default=0, nullable=False)

    # Valor monetário (opcional)
    value = Column(Numeric(12, 2), nullable=True)  # Valor do negócio
    currency = Column(String(3), default="BRL", nullable=False)  # BRL, USD, EUR

    # Datas importantes
    due_date = Column(DateTime, nullable=True)  # Data de vencimento
    closed_at = Column(DateTime, nullable=True)  # Data de fechamento (ganho ou perdido)

    # Status
    is_won = Column(Integer, default=0, nullable=False)  # 0=aberto, 1=ganho, -1=perdido

    # Relacionamentos
    list = relationship("List", back_populates="cards")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_cards")

    # Valores dos campos customizados
    field_values = relationship("CardFieldValue", back_populates="card", lazy="dynamic", cascade="all, delete-orphan")

    # Atividades/Timeline
    activities = relationship("Activity", back_populates="card", lazy="dynamic", cascade="all, delete-orphan")

    # Transferências
    transfers = relationship("CardTransfer", back_populates="card", lazy="dynamic", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Card(id={self.id}, title='{self.title}')>"

    @property
    def is_overdue(self) -> bool:
        """Verifica se o cartão está atrasado"""
        if not self.due_date or self.is_won != 0:
            return False

        from datetime import datetime
        return datetime.utcnow() > self.due_date
