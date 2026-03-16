"""
Modelo de GamificationPoint (Pontos de Gamificação).
Registra pontos ganhos pelos usuários por ações no sistema.
"""
from sqlalchemy import Column, Integer, ForeignKey, String, Text, Boolean
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

    # Contexto do board onde os pontos foram ganhos
    board_type = Column(String(20), nullable=True, index=True)
    # Valores: 'prospecting', 'acquisition', None (ações fora de board)

    # Pontos ganhos (pode ser negativo para penalidades)
    points = Column(Integer, nullable=False)

    # Motivo dos pontos
    reason = Column(String(100), nullable=False, index=True)
    # Exemplos: card_created, card_won, card_lost, meeting_completed, etc.

    # Descrição detalhada
    description = Column(Text, nullable=True)

    # Campos de comissão — preenchidos apenas quando é split de comissão
    is_commission = Column(Boolean, default=False, nullable=False)
    # ID do usuário que gerou a ação original (ex: vendedor que fechou o negócio)
    commission_source_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    # Fração recebida como comissão (ex: '1/4', '1/3')
    commission_ratio = Column(String(10), nullable=True)
    # Pontos totais antes do split (para auditoria)
    original_points = Column(Integer, nullable=True)

    # Entidade relacionada (opcional)
    related_entity_type = Column(String(50), nullable=True)  # Card, Task, Attachment
    related_entity_id = Column(Integer, nullable=True)

    # Relacionamentos
    user = relationship("User", foreign_keys=[user_id], back_populates="gamification_points")
    commission_source_user = relationship("User", foreign_keys=[commission_source_user_id])

    def __repr__(self):
        return f"<GamificationPoint(id={self.id}, user_id={self.user_id}, points={self.points}, reason='{self.reason}', board_type='{self.board_type}')>"
