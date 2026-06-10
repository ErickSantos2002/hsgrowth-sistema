"""
Models para integração com API4COM (VOIP).
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", backref="extension")


class CallLog(Base):
    """
    Model para registrar histórico de chamadas telefônicas feitas via API4COM.

    Armazena informações sobre chamadas realizadas, incluindo metadata,
    status, duração e link para gravação.
    """
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Quem fez a chamada
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID do vendedor que fez a chamada"
    )

    # Contexto da chamada (card de vendas — opcional)
    card_id = Column(
        Integer,
        ForeignKey("cards.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="ID do card de vendas de onde a chamada foi originada"
    )

    # Contexto da chamada (card de serviços — opcional)
    service_card_id = Column(
        Integer,
        ForeignKey("service_cards.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="ID do card de serviços de onde a chamada foi originada"
    )

    # Dados da chamada
    phone = Column(String(50), nullable=False, comment="Telefone chamado")
    extension = Column(String(50), nullable=False, comment="Ramal usado para fazer a chamada")

    # Status e resultados
    status = Column(
        String(50),
        nullable=False,
        default="pending",
        comment="Status da chamada: pending, ringing, completed, failed, no_answer"
    )
    duration = Column(Integer, nullable=True, comment="Duração da chamada em segundos")
    recording_url = Column(Text, nullable=True, comment="URL da gravação da chamada")

    # Integração com API4COM
    api4com_call_id = Column(String(255), nullable=True, unique=True, index=True, comment="ID da chamada na API4COM")

    # Erros
    error_message = Column(Text, nullable=True, comment="Mensagem de erro, se houver")

    # Metadata personalizada (armazenada como JSON no webhook)
    # Renomeado para call_metadata pois 'metadata' é atributo reservado do SQLAlchemy
    call_metadata = Column(Text, nullable=True, comment="Metadata adicional da chamada (JSON)")

    # Auditoria
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, comment="Quando a chamada foi iniciada")
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False, comment="Última atualização")

    # Relationships
    user = relationship("User", backref="call_logs")
    card = relationship("Card", backref="call_logs")
    service_card = relationship("ServiceCard", foreign_keys=[service_card_id])
