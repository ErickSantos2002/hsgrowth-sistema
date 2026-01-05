"""
Modelo de GamificationBadge (Badge/Conquista).
Define badges que podem ser conquistadas pelos usuários.
"""
from sqlalchemy import Column, Integer, ForeignKey, String, Text, Boolean, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class GamificationBadge(Base, TimestampMixin):
    """
    Representa uma badge (conquista) do sistema.
    Pode ser padrão do sistema ou customizada pelo admin.
    """
    __tablename__ = "gamification_badges"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Account (badges customizadas são por conta)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True, index=True)

    # Informações básicas
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String(500), nullable=True)  # URL do ícone da badge

    # Tipo de badge
    is_system_badge = Column(Boolean, default=False, nullable=False)  # Badge padrão do sistema
    criteria_type = Column(String(50), nullable=False)  # manual, automatic

    # Critérios para badge automática (JSON)
    # Exemplo: {"field": "total_points", "operator": ">=", "value": 10000}
    # Exemplo: {"field": "rank", "operator": "==", "value": 1, "period": "monthly"}
    criteria = Column(JSON, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Relacionamentos
    account = relationship("Account")
    user_badges = relationship("UserBadge", back_populates="badge", lazy="dynamic", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<GamificationBadge(id={self.id}, name='{self.name}', type='{self.criteria_type}')>"
