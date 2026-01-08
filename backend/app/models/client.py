"""
Modelo de Client (Cliente).
Representa um cliente/empresa que pode ter múltiplos cards ao longo do tempo.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class Client(Base, TimestampMixin, SoftDeleteMixin):
    """
    Representa um cliente no sistema.
    Clientes podem ser pessoas físicas ou jurídicas.
    """
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Account (multi-tenant)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    # Informações básicas
    name = Column(String(255), nullable=False, index=True)  # Nome do contato
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(20), nullable=True)

    # Informações da empresa
    company_name = Column(String(255), nullable=True)  # Razão social
    document = Column(String(20), nullable=True, index=True)  # CPF ou CNPJ

    # Endereço
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(2), nullable=True)  # UF (SP, RJ, etc)
    country = Column(String(100), nullable=True, default="Brasil")

    # Outros
    website = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)  # Observações

    # Origem do cliente
    source = Column(String(50), nullable=True)  # pipedrive, manual, importacao, etc

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Relacionamentos
    account = relationship("Account")
    cards = relationship("Card", back_populates="client", lazy="dynamic")

    def __repr__(self):
        return f"<Client(id={self.id}, name='{self.name}', company='{self.company_name}')>"

    @property
    def display_name(self) -> str:
        """Retorna o nome de exibição (empresa ou nome pessoal)"""
        return self.company_name if self.company_name else self.name

    @property
    def is_company(self) -> bool:
        """Verifica se é pessoa jurídica"""
        return self.document and len(self.document) == 14  # CNPJ tem 14 dígitos

    @property
    def is_person(self) -> bool:
        """Verifica se é pessoa física"""
        return self.document and len(self.document) == 11  # CPF tem 11 dígitos
