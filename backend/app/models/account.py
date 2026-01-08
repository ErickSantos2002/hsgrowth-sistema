"""
Modelo de Account (Conta/Tenant).
Sistema multi-tenant onde cada empresa/organização tem sua própria conta.
"""
from sqlalchemy import Column, Integer, String, Boolean, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Account(Base, TimestampMixin):
    """
    Representa uma conta (empresa/organização) no sistema.
    Cada conta é um tenant isolado.
    """
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # Nome da empresa
    subdomain = Column(String(100), unique=True, nullable=True)  # Subdomínio customizado
    is_active = Column(Boolean, default=True, nullable=False)

    # Configurações da conta (JSON)
    settings = Column(JSON, default={}, nullable=False)

    # Relacionamentos
    users = relationship("User", back_populates="account", lazy="dynamic")
    boards = relationship("Board", back_populates="account", lazy="dynamic")

    def __repr__(self):
        return f"<Account(id={self.id}, name='{self.name}')>"
