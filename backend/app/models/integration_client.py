"""
Modelo de Client de Integração
Representa clients externos que podem autenticar via client_credentials
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.db.base import Base


class IntegrationClient(Base):
    """Modelo de Client de Integração para autenticação via client_credentials"""

    __tablename__ = "integration_clients"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    name = Column(String(200), nullable=False, index=True)  # Nome descritivo (ex: "N8N Automation")
    description = Column(Text, nullable=True)  # Descrição do que essa integração faz

    # Credenciais
    client_id = Column(String(100), unique=True, nullable=False, index=True)  # ID público
    client_secret_hash = Column(String(255), nullable=False)  # Hash do secret (nunca armazenar plain text)

    # Permissões e comportamento
    # Quando um client cria algo (ex: card), qual user_id será usado como criador
    impersonate_user_id = Column(Integer, nullable=True)  # Se None, usa um user padrão de integração

    # Controle
    is_active = Column(Boolean, default=True, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)  # Última vez que foi usado

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<IntegrationClient {self.name} - {self.client_id}>"
