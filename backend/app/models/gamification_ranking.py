"""
Modelo de GamificationRanking (Ranking Periódico).
Registra posições de usuários em rankings que resetam periodicamente.
"""
from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class GamificationRanking(Base, TimestampMixin):
    """
    Representa a posição de um usuário em um ranking periódico.
    Rankings resetam periodicamente (semanal, mensal, trimestral, anual).
    """
    __tablename__ = "gamification_rankings"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Account (multi-tenancy)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relacionamento com User
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Período do ranking
    period_type = Column(String(20), nullable=False, index=True)  # weekly, monthly, quarterly, annual
    period_start = Column(DateTime, nullable=False, index=True)  # Início do período
    period_end = Column(DateTime, nullable=False, index=True)  # Fim do período

    # Ranking
    rank = Column(Integer, nullable=False)  # Posição no ranking (1º, 2º, 3º, etc.)
    points = Column(Integer, default=0, nullable=False)  # Pontos acumulados neste período
    cards_won = Column(Integer, default=0, nullable=False)  # Cartões ganhos neste período

    # Constraint: um usuário não pode ter múltiplos registros para o mesmo período
    __table_args__ = (
        UniqueConstraint('account_id', 'user_id', 'period_type', 'period_start', name='unique_user_ranking_period'),
    )

    # Relacionamentos
    user = relationship("User", back_populates="rankings")

    def __repr__(self):
        return f"<GamificationRanking(user_id={self.user_id}, period='{self.period_type}', rank={self.rank})>"
