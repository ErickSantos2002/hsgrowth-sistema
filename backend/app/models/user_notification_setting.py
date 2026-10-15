"""
Modelo de configurações de notificação por usuário.
Permite que cada usuário escolha quais notificações deseja receber.
Armazenado no PostgreSQL (não no Redis) para persistir mesmo com restart do Redis.
"""
from sqlalchemy import Column, Integer, Boolean, ForeignKey, UniqueConstraint, JSON
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
    # Os avisos obrigatórios (lead do site, card atribuído) não têm coluna:
    # não existe como desligar. Ver app/services/notificacoes/tipos.py.

    # Tarefa criada por outra pessoa para o usuário
    task_assigned = Column(Boolean, default=True, nullable=False)

    # Produto adicionado/removido por outra pessoa num card do usuário
    card_product_changed = Column(Boolean, default=True, nullable=False)

    # Gravação ou análise de reunião pronta
    reuniao_pronta = Column(Boolean, default=True, nullable=False)

    # Resumo das 8h (seg a sex)
    resumo_manha = Column(Boolean, default=True, nullable=False)

    # Aviso 15 minutos antes de reunião
    reuniao_15min = Column(Boolean, default=True, nullable=False)

    # Pop-up do navegador além do sino
    popup_navegador = Column(Boolean, default=True, nullable=False)

    # Boards de Serviço acompanhados (ids). None = ainda não calculado: o
    # padrão sai do histórico de atividades (UserNotificationService).
    quadros_servico = Column(JSON, nullable=True)

    # Relacionamento com o usuário (back-reference)
    user = relationship("User", back_populates="notification_setting")

    def __repr__(self):
        return (
            f"<UserNotificationSetting(user_id={self.user_id}, "
            f"task_assigned={self.task_assigned})>"
        )
