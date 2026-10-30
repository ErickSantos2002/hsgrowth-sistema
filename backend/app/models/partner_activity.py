"""
Programa de Parceiros — atividades e histórico dos dois boards.

Um registro pertence ao parceiro (board 1) ou à oportunidade (board 2).
O tipo "evento" é gravado pelo sistema (criação, etapa, elegibilidade, ativação).
"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class PartnerActivity(Base, TimestampMixin):
    __tablename__ = "partner_activities"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=True, index=True)
    opportunity_id = Column(
        Integer, ForeignKey("partner_opportunities.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # nota | ligacao | whatsapp | email | reuniao | tarefa | evento
    type = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)
    due_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id])
