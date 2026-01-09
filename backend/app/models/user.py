"""
Modelo de User (Usuário).
Representa um usuário do sistema (vendedor, gerente, admin, etc).
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class User(Base, TimestampMixin, SoftDeleteMixin):
    """
    Representa um usuário no sistema.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Role
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)

    # Informações básicas
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=True, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)  # Hash bcrypt

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Datas importantes
    last_login_at = Column(DateTime, nullable=True)
    password_changed_at = Column(DateTime, nullable=True)

    # Reset de senha
    reset_token = Column(String(255), nullable=True)
    reset_token_expires_at = Column(DateTime, nullable=True)

    # Avatar/Foto
    avatar_url = Column(String(500), nullable=True)

    # Telefone de contato
    phone = Column(String(20), nullable=True)

    # Relacionamentos
    role = relationship("Role", back_populates="users")

    # Cartões atribuídos a este usuário
    assigned_cards = relationship("Card", foreign_keys="Card.assigned_to_id", back_populates="assigned_to", lazy="dynamic")

    # Atividades criadas por este usuário
    activities = relationship("Activity", back_populates="user", lazy="dynamic")

    # Pontos de gamificação
    gamification_points = relationship("GamificationPoint", back_populates="user", lazy="dynamic")

    # Badges conquistadas
    user_badges = relationship("UserBadge", foreign_keys="UserBadge.user_id", back_populates="user", lazy="dynamic")

    # Rankings
    rankings = relationship("GamificationRanking", back_populates="user", lazy="dynamic")

    # Transferências enviadas e recebidas
    transfers_sent = relationship("CardTransfer", foreign_keys="CardTransfer.from_user_id", back_populates="from_user", lazy="dynamic")
    transfers_received = relationship("CardTransfer", foreign_keys="CardTransfer.to_user_id", back_populates="to_user", lazy="dynamic")

    # Notificações
    notifications = relationship("Notification", back_populates="user", lazy="dynamic")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}')>"

    @property
    def is_admin(self) -> bool:
        """Verifica se o usuário é admin"""
        return self.role.name == "admin" if self.role else False

    @property
    def is_manager(self) -> bool:
        """Verifica se o usuário é gerente"""
        return self.role.name == "gerente" if self.role else False
