"""
Models para integração com API4COM (VOIP).
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.base import Base


class API4ComConfig(Base):
    """
    Model para armazenar configuração da integração com API4COM.

    Armazena credenciais, token de autenticação e status da integração.
    """
    __tablename__ = "api4com_config"

    id = Column(Integer, primary_key=True, index=True)

    # Credenciais
    email = Column(String(255), nullable=False, comment="Email de login na API4COM")
    password_encrypted = Column(Text, nullable=False, comment="Senha criptografada")

    # Token de autenticação
    api_token = Column(Text, nullable=True, comment="Token de autenticação da API")
    token_expires_at = Column(DateTime(timezone=True), nullable=True, comment="Data de expiração do token")

    # Status da integração
    is_active = Column(Boolean, default=False, nullable=False, comment="Se a integração está ativa")
    last_sync_at = Column(DateTime(timezone=True), nullable=True, comment="Última sincronização com a API")
    last_test_at = Column(DateTime(timezone=True), nullable=True, comment="Último teste de conexão")
    last_test_success = Column(Boolean, nullable=True, comment="Resultado do último teste")
    last_test_error = Column(Text, nullable=True, comment="Erro do último teste")

    # Auditoria
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])


class UserExtension(Base):
    """
    Model para vincular usuários (vendedores) aos seus ramais da API4COM.

    Cada vendedor pode ter apenas um ramal, e cada ramal pertence a apenas um vendedor.
    """
    __tablename__ = "user_extensions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="ID do usuário (vendedor)"
    )
    extension = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Ramal do vendedor na API4COM (ex: '1000')"
    )

    # Configurações
    is_active = Column(Boolean, default=True, nullable=False, comment="Se o ramal está ativo")

    # Auditoria
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="extension")
