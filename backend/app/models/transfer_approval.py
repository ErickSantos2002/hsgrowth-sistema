"""
Modelo de TransferApproval (Aprovação de Transferência).
Gerencia o fluxo de aprovação de transferências (quando habilitado).
"""
from sqlalchemy import Column, Integer, ForeignKey, String, Text, DateTime
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class TransferApproval(Base, TimestampMixin):
    """
    Representa uma solicitação de aprovação de transferência.
    Usado apenas quando a configuração TRANSFER_APPROVAL_REQUIRED está ativa.
    """
    __tablename__ = "transfer_approvals"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com CardTransfer (one-to-one)
    transfer_id = Column(Integer, ForeignKey("card_transfers.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Gerente responsável pela aprovação
    approver_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Status da aprovação
    status = Column(String(20), default="pending", nullable=False, index=True)
    # pending: aguardando decisão
    # approved: aprovada
    # rejected: rejeitada
    # expired: expirada (após X horas sem decisão)

    # Data de expiração (72 horas padrão)
    expires_at = Column(DateTime, nullable=False, index=True)

    # Data de decisão
    decided_at = Column(DateTime, nullable=True)

    # Comentários do gerente
    comments = Column(Text, nullable=True)

    # Relacionamentos
    transfer = relationship("CardTransfer", back_populates="approval")
    approver = relationship("User")

    def __repr__(self):
        return f"<TransferApproval(id={self.id}, transfer_id={self.transfer_id}, status='{self.status}')>"
