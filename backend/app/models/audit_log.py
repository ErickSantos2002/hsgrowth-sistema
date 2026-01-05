"""
Modelo de AuditLog (Log de Auditoria).
Registra TODAS as ações executadas no sistema para compliance e auditoria.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.base import Base


class AuditLog(Base):
    """
    Representa um log de auditoria completo do sistema.
    Registra TODAS as operações (CRUD) para fins de compliance.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com User (quem executou)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Relacionamento com Account
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    # Informações da ação
    action = Column(String(50), nullable=False, index=True)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    entity_type = Column(String(100), nullable=False, index=True)  # User, Card, Board, etc.
    entity_id = Column(Integer, nullable=True, index=True)  # ID da entidade afetada

    # Descrição legível da ação
    description = Column(Text, nullable=False)

    # Dados da ação (JSON)
    # Antes e depois para UPDATEs, payload completo para CREATEs
    data_before = Column(JSON, nullable=True)  # Estado anterior (para UPDATE/DELETE)
    data_after = Column(JSON, nullable=True)  # Estado posterior (para CREATE/UPDATE)

    # Informações de contexto
    ip_address = Column(String(45), nullable=True)  # IPv4 ou IPv6
    user_agent = Column(String(500), nullable=True)  # Browser/client info

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relacionamentos
    user = relationship("User")
    account = relationship("Account")

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', entity='{self.entity_type}:{self.entity_id}')>"
