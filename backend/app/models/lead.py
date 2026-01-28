"""
Modelo de Lead
Representa leads que ainda não foram convertidos em deals/cards
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Lead(Base):
    """Modelo de Lead"""

    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)

    # Informações básicas
    title = Column(String(255), nullable=False, index=True)
    value = Column(Float, nullable=True)
    currency = Column(String(10), default="BRL", nullable=False)

    # Origem
    source = Column(String(100), nullable=True)  # Import, API, Web, etc.

    # Relacionamentos
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=True)
    organization_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=True)  # Funil de leads
    list_id = Column(Integer, ForeignKey("lists.id"), nullable=True)  # Etapa atual

    # Status
    status = Column(String(50), default="not_viewed", nullable=False)  # not_viewed, qualified, converted, lost
    is_archived = Column(Boolean, default=False, nullable=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    # Campos adicionais
    expected_close_date = Column(DateTime(timezone=True), nullable=True)
    custom_fields = Column(JSON, nullable=True)  # Campos customizados do Pipedrive

    # Controle
    pipedrive_id = Column(String(100), nullable=True, index=True)  # ID do Pipedrive (UUID)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relacionamentos ORM
    owner = relationship("User", foreign_keys=[owner_id])
    person = relationship("Person", foreign_keys=[person_id])
    organization = relationship("Client", foreign_keys=[organization_id])
    board = relationship("Board", foreign_keys=[board_id])
    list = relationship("List", foreign_keys=[list_id])

    def __repr__(self):
        return f"<Lead {self.title} - {self.status}>"
