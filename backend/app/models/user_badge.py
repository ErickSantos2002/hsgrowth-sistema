"""
Modelo de UserBadge (Badges conquistadas por usuários).
Relação many-to-many entre User e GamificationBadge.
"""
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class UserBadge(Base, TimestampMixin):
    """
    Representa uma badge conquistada por um usuário.
    """
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com User
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relacionamento com Badge
    badge_id = Column(Integer, ForeignKey("gamification_badges.id", ondelete="CASCADE"), nullable=False, index=True)

    # Quem concedeu a badge (para badges manuais)
    awarded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Constraint: um usuário não pode ter a mesma badge múltiplas vezes
    __table_args__ = (
        UniqueConstraint('user_id', 'badge_id', name='unique_user_badge'),
    )

    # Relacionamentos
    user = relationship("User", foreign_keys=[user_id], back_populates="user_badges")
    badge = relationship("GamificationBadge", back_populates="user_badges")
    awarded_by = relationship("User", foreign_keys=[awarded_by_id])

    def __repr__(self):
        return f"<UserBadge(user_id={self.user_id}, badge_id={self.badge_id})>"
