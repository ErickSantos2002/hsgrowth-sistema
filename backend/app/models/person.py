"""
Modelo de Pessoa/Contato
Representa pessoas vinculadas a organizações (clientes)
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Person(Base):
    """Modelo de Pessoa/Contato"""

    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)

    # Informações pessoais
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    name = Column(String(200), nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)

    # Profissional
    position = Column(String(200), nullable=True)  # Cargo
    linkedin = Column(String(500), nullable=True)

    # Relacionamentos
    organization_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Controle
    is_active = Column(Boolean, default=True, nullable=False)
    pipedrive_id = Column(Integer, nullable=True, index=True)  # Referência ao Pipedrive

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relacionamentos ORM
    organization = relationship("Client", back_populates="persons")
    owner = relationship("User", foreign_keys=[owner_id])

    def __repr__(self):
        return f"<Person {self.name} - {self.email}>"
