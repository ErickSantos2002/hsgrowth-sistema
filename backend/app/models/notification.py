"""
Modelo de Notification (Notificação In-App).
Gerencia notificações exibidas no sistema para os usuários.
"""
from sqlalchemy import Column, Integer, ForeignKey, String, Text, Boolean, JSON, DateTime
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Notification(Base, TimestampMixin):
    """
    Representa uma notificação in-app para um usuário.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com User (destinatário)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Tipo de notificação
    notification_type = Column(String(50), nullable=False, index=True)
    # Tipos: card_assigned, card_overdue, transfer_received, automation_failed,
    #        badge_earned, ranking_updated, etc.

    # Título e mensagem
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # Ícone e cor (opcional, para UI)
    icon = Column(String(50), nullable=True)  # bell, trophy, warning, info, etc.
    color = Column(String(20), nullable=True)  # success, warning, danger, info

    # Metadados (JSON)
    # Exemplo: {"card_id": 123, "board_id": 5, "url": "/cards/123"}
    notification_metadata = Column(JSON, default={}, nullable=False)

    # Status
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)

    # Relacionamentos
    user = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type='{self.notification_type}')>"
