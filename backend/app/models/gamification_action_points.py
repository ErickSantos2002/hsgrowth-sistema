"""
Modelo de GamificationActionPoints.
Define quantos pontos vale cada tipo de ação no sistema, separado por board.
"""
from sqlalchemy import Column, Integer, String, Boolean, UniqueConstraint
from app.db.base import Base
from app.models.mixins import TimestampMixin


class GamificationActionPoints(Base, TimestampMixin):
    """
    Representa a configuração de pontos por tipo de ação e board.
    Admin pode customizar quantos pontos cada ação vale por contexto de board.

    A constraint unique é (board_type, action_type) — cada ação tem uma
    configuração por board, permitindo valores diferentes em cada contexto.
    """
    __tablename__ = "gamification_action_points"

    id = Column(Integer, primary_key=True, index=True)

    # Board ao qual esta configuração pertence
    board_type = Column(String(20), nullable=False, index=True)
    # Valores: 'prospecting', 'acquisition'

    # Tipo de ação
    action_type = Column(String(100), nullable=False, index=True)
    # Exemplos: card_created, card_won, card_moved, meeting_created, meeting_completed, etc.

    # Quantidade de pontos (negativo = penalidade)
    points = Column(Integer, nullable=False, default=0)

    # Se a ação está ativa (se desativada, não gera pontos)
    is_active = Column(Boolean, default=True, nullable=False)

    # Descrição amigável da ação
    description = Column(String(255), nullable=True)

    # Constraint unique por par (board_type, action_type)
    __table_args__ = (
        UniqueConstraint('board_type', 'action_type', name='unique_board_action_type'),
    )

    def __repr__(self):
        return f"<GamificationActionPoints(board='{self.board_type}', action='{self.action_type}', points={self.points})>"
