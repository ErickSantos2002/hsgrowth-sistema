"""
Modelo de Activity (Atividade/Timeline).
Registra todas as atividades/eventos relacionados a um cartão.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Activity(Base, TimestampMixin):
    """
    Representa uma atividade/evento no timeline de um cartão.
    Exemplos: "Cartão movido", "Campo atualizado", "Comentário adicionado", etc.
    """
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Card
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relacionamento com User (quem executou a ação)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Tipo de atividade
    activity_type = Column(String(50), nullable=False, index=True)
    # Tipos: card_created, card_updated, card_moved, card_closed, field_updated,
    #        comment_added, attachment_added, assigned, transfer_requested, etc.

    # Descrição da atividade
    description = Column(Text, nullable=False)

    # Metadados da atividade (JSON)
    # Exemplo: {"from_list_id": 1, "to_list_id": 2, "field_name": "email", "old_value": "...", "new_value": "..."}
    activity_metadata = Column(JSON, default={}, nullable=False)

    # Relacionamentos
    card = relationship("Card", back_populates="activities")
    user = relationship("User", back_populates="activities")

    def __repr__(self):
        return f"<Activity(id={self.id}, card_id={self.card_id}, type='{self.activity_type}')>"
