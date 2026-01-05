"""
Modelo de Role (Função/Papel) e Permissões.
Implementa RBAC (Role-Based Access Control).
"""
from sqlalchemy import Column, Integer, String, JSON, Boolean
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Role(Base, TimestampMixin):
    """
    Representa uma role (função) no sistema.
    Exemplos: admin, gerente, vendedor, visualizador
    """
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)  # admin, gerente, vendedor
    display_name = Column(String(100), nullable=False)  # Nome amigável
    description = Column(String(500), nullable=True)

    # Permissões (lista de strings JSON)
    # Exemplo: ["boards.create", "boards.update", "cards.create", "users.read"]
    permissions = Column(JSON, default=[], nullable=False)

    is_system_role = Column(Boolean, default=False, nullable=False)  # Roles do sistema não podem ser deletadas

    # Relacionamentos
    users = relationship("User", back_populates="role", lazy="dynamic")

    def __repr__(self):
        return f"<Role(id={self.id}, name='{self.name}')>"

    def has_permission(self, permission: str) -> bool:
        """Verifica se a role tem uma permissão específica"""
        return permission in self.permissions
