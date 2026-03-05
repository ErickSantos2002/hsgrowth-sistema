"""
Modelo de configurações de notificação por usuário.
Permite que cada usuário escolha quais notificações deseja receber.
Armazenado no PostgreSQL (não no Redis) para persistir mesmo com restart do Redis.
"""
from sqlalchemy import Column, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class UserNotificationSetting(Base, TimestampMixin):
    """
    Configurações de notificação in-app de cada usuário.
    Criada automaticamente com valores padrão (tudo ativo) no primeiro acesso.
    """
    __tablename__ = "user_notification_settings"

    # Garante uma linha por usuário
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_notification_settings_user_id"),
    )

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com o usuário dono das configurações
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Configurações de notificação ---

    # Tarefa atribuída ao usuário
    task_assigned = Column(Boolean, default=True, nullable=False)

    # Tarefa com prazo próximo (ex: vence em menos de 24h)
    task_due_soon = Column(Boolean, default=True, nullable=False)

    # Card movido para outra lista
    card_moved = Column(Boolean, default=True, nullable=False)

    # Produto do card alterado
    card_product_changed = Column(Boolean, default=True, nullable=False)

    # Badge/conquista desbloqueada (gamificação)
    achievement_unlocked = Column(Boolean, default=True, nullable=False)

    # Relacionamento com o usuário (back-reference)
    user = relationship("User", back_populates="notification_setting")

    def __repr__(self):
        return (
            f"<UserNotificationSetting(user_id={self.user_id}, "
            f"task_assigned={self.task_assigned})>"
        )
