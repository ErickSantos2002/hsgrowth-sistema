"""
Modelo de CardTransfer (Transferência de Cartão).
Registra transferências de cartões entre vendedores.
"""
from sqlalchemy import Column, Integer, ForeignKey, String, Text, Boolean
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class CardTransfer(Base, TimestampMixin):
    """
    Representa uma transferência de cartão entre vendedores.
    """
    __tablename__ = "card_transfers"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Card
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)

    # De quem para quem
    from_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    to_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True)

    # Motivo da transferência
    reason = Column(String(100), nullable=False)  # reassignment, workload_balance, expertise, etc.
    notes = Column(Text, nullable=True)  # Notas adicionais

    # Status
    status = Column(String(20), default="completed", nullable=False, index=True)
    # completed: transferência concluída
    # pending_approval: aguardando aprovação do gerente
    # rejected: rejeitada pelo gerente

    # Transferência em lote?
    is_batch_transfer = Column(Boolean, default=False, nullable=False)
    batch_id = Column(String(50), nullable=True, index=True)  # ID do lote (UUID)

    # Relacionamentos
    card = relationship("Card", back_populates="transfers")
    from_user = relationship("User", foreign_keys=[from_user_id], back_populates="transfers_sent")
    to_user = relationship("User", foreign_keys=[to_user_id], back_populates="transfers_received")

    # Aprovação (se necessário)
    approval = relationship("TransferApproval", back_populates="transfer", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<CardTransfer(id={self.id}, card_id={self.card_id}, from={self.from_user_id}, to={self.to_user_id})>"
