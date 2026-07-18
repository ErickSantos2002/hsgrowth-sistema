"""
Vínculo entre um Client do hsgrowth e o registro correspondente num sistema externo.

Existe porque o identificador confiável do cliente no GestorHS é `clientes.id` (PK
inteira), e não o documento — lá `cgc`/`cpf` são nullable, sem validação e sem UNIQUE,
herdados de uma migração de sistema legado. Deduplicar por documento casaria clientes
errados em silêncio.

Tabela separada (em vez de colunas em `clients`) porque o mesmo cliente pode vir a ter
origem em mais de um sistema.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ExternalClientRef(Base, TimestampMixin):
    __tablename__ = "external_client_refs"

    id = Column(Integer, primary_key=True, index=True)

    # Sistema de origem, ex: "gestorhs". Sem sufixo de entidade — o mesmo cliente
    # é compartilhado pelos boards de Serviços e de Cobrança.
    source = Column(String(50), nullable=False, index=True)
    # Id do cliente no sistema de origem (o `clientes.id` do GestorHS).
    external_id = Column(String(100), nullable=False, index=True)

    client_id = Column(
        Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )

    client = relationship("Client")

    __table_args__ = (
        UniqueConstraint("source", "external_id", name="unique_external_client_ref"),
    )

    def __repr__(self):
        return f"<ExternalClientRef({self.source}:{self.external_id} -> client {self.client_id})>"
