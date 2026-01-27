"""
Modelo de GamificationActionPoints.
Define quantos pontos vale cada tipo de ação no sistema.
"""
from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import Base
from app.models.mixins import TimestampMixin


class GamificationActionPoints(Base, TimestampMixin):
    """
    Representa a configuração de pontos por tipo de ação.
    Admin pode customizar quantos pontos cada ação vale.
    """
    __tablename__ = "gamification_action_points"

    id = Column(Integer, primary_key=True, index=True)

    # Tipo de ação
    action_type = Column(String(100), nullable=False, unique=True, index=True)
    # Exemplos: card_created, card_won, card_moved, etc.

    # Quantidade de pontos
    points = Column(Integer, nullable=False, default=0)

    # Se a ação está ativa (se desativada, não gera pontos)
    is_active = Column(Boolean, default=True, nullable=False)

    # Descrição amigável da ação
    description = Column(String(255), nullable=True)

    def __repr__(self):
        return f"<GamificationActionPoints(action_type='{self.action_type}', points={self.points})>"
