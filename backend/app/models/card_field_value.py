"""
Modelo de CardFieldValue (Valor de Campo Customizado).
Armazena os valores dos campos customizados para cada cartão.
"""
from sqlalchemy import Column, Integer, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class CardFieldValue(Base, TimestampMixin):
    """
    Representa o valor de um campo customizado em um cartão específico.
    Relação: Card <-> FieldDefinition (many-to-many com valor)
    """
    __tablename__ = "card_field_values"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Card
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relacionamento com FieldDefinition
    field_definition_id = Column(Integer, ForeignKey("field_definitions.id", ondelete="CASCADE"), nullable=False, index=True)

    # Valor do campo (armazenado como texto, convertido conforme o tipo)
    value = Column(Text, nullable=True)

    # Constraint: um cartão não pode ter valores duplicados para o mesmo campo
    __table_args__ = (
        UniqueConstraint('card_id', 'field_definition_id', name='unique_card_field'),
    )

    # Relacionamentos
    card = relationship("Card", back_populates="field_values")
    field_definition = relationship("FieldDefinition", back_populates="field_values")

    def __repr__(self):
        return f"<CardFieldValue(card_id={self.card_id}, field_id={self.field_definition_id}, value='{self.value}')>"
