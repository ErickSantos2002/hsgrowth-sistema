"""
Model CardNote - Anotações dos cards.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class CardNote(Base):
    """
    Model para anotações/notas dos cards.
    Permite que usuários façam anotações rápidas sobre o negócio.
    """
    __tablename__ = "card_notes"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False, comment="Conteúdo da anotação")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relacionamentos
    card = relationship("Card", back_populates="notes")
    user = relationship("User")

    def __repr__(self):
        return f"<CardNote(id={self.id}, card_id={self.card_id}, user={self.user_id})>"
