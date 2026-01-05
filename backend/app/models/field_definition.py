"""
Modelo de FieldDefinition (Definição de Campo Customizado).
Define os campos customizados que podem ser adicionados aos cartões.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, JSON, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class FieldDefinition(Base, TimestampMixin):
    """
    Representa a definição de um campo customizado.
    Cada quadro pode ter seus próprios campos customizados.
    """
    __tablename__ = "field_definitions"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Board
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)

    # Informações básicas
    name = Column(String(255), nullable=False)  # Nome do campo (ex: "Telefone", "Email", "Valor")
    field_type = Column(String(50), nullable=False)  # text, email, phone, number, currency, date, select, etc.

    # Configurações
    is_required = Column(Boolean, default=False, nullable=False)
    is_unique = Column(Boolean, default=False, nullable=False)
    position = Column(Integer, default=0, nullable=False)  # Ordem de exibição

    # Placeholder e help text
    placeholder = Column(String(255), nullable=True)
    help_text = Column(Text, nullable=True)

    # Opções para campos tipo select/multiselect (JSON array)
    # Exemplo: ["Opção 1", "Opção 2", "Opção 3"]
    options = Column(JSON, default=[], nullable=True)

    # Validações (JSON)
    # Exemplo: {"min": 0, "max": 1000000, "pattern": "..."}
    validations = Column(JSON, default={}, nullable=True)

    # Relacionamentos
    board = relationship("Board", back_populates="field_definitions")
    field_values = relationship("CardFieldValue", back_populates="field_definition", lazy="dynamic", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FieldDefinition(id={self.id}, name='{self.name}', type='{self.field_type}')>"
