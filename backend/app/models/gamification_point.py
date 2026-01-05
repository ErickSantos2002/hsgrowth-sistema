"""
Modelo de GamificationPoint (Pontos de Gamificação).
Registra pontos ganhos pelos usuários por ações no sistema.
"""
from sqlalchemy import Column, Integer, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class GamificationPoint(Base, TimestampMixin):
    """
    Representa pontos ganhos por um usuário.
    Pontos são perpétuos (nunca resetam).
    """
    __tablename__ = "gamification_points"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com User
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Pontos ganhos (pode ser negativo para penalidades)
    points = Column(Integer, nullable=False)

    # Motivo dos pontos
    reason = Column(String(100), nullable=False, index=True)
    # Exemplos: card_created, card_won, card_lost, transfer_accepted, badge_earned, etc.

    # Descrição detalhada
    description = Column(Text, nullable=True)

    # Entidade relacionada (opcional)
    related_entity_type = Column(String(50), nullable=True)  # Card, Transfer, Badge
    related_entity_id = Column(Integer, nullable=True)

    # Relacionamentos
    user = relationship("User", back_populates="gamification_points")

    def __repr__(self):
        return f"<GamificationPoint(id={self.id}, user_id={self.user_id}, points={self.points}, reason='{self.reason}')>"
