"""
Modelo de RecordingShare — registro de compartilhamento de gravação.

Quando alguém gera um link da gravação para enviar ao cliente, fica registrado
quem gerou e até quando o link vale. Serve para responder, se um dia for
preciso, como uma gravação circulou (decisão da seção 15.5 do design).
"""
from datetime import datetime

from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.db.base import Base


class RecordingShare(Base):
    """Um link de gravação gerado para alguém de fora do CRM."""

    __tablename__ = "recording_shares"

    id = Column(Integer, primary_key=True, index=True)

    card_task_id = Column(
        Integer,
        ForeignKey("card_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(
        DateTime,
        nullable=True,
        comment="Preenchido quando o link é revogado antes de expirar",
    )

    card_task = relationship("CardTask")
    created_by = relationship("User")

    def __repr__(self):
        return (
            f"<RecordingShare(id={self.id}, card_task_id={self.card_task_id}, "
            f"expires_at={self.expires_at})>"
        )

    @property
    def is_valid(self) -> bool:
        """True enquanto o link ainda abre: não revogado e dentro do prazo."""
        if self.revoked_at is not None:
            return False
        return datetime.utcnow() < self.expires_at
