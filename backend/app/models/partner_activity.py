"""
Programa de Parceiros — atividades e histórico dos dois boards.

Um registro pertence ao parceiro (board 1) ou à oportunidade (board 2).
Mesmo formato de ServiceCardActivity, para a tela usar os componentes de Serviço.
Categorias (campo `category`):
  - "atividade"  → tarefas/atividades (Foco: due_date + is_completed)
  - "anotacao"   → anotações manuais
  - "arquivo"    → anexos (metadados; o arquivo fica em /app/uploads/parcerias)
  - "alteracao"  → eventos gravados pelo sistema (criação, etapa, elegibilidade, ativação)
"""
from sqlalchemy import JSON, BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Text
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
    # Autor. NULL = sistema.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    category = Column(String(20), nullable=False, default="atividade")  # atividade|anotacao|arquivo|alteracao
    activity_type = Column(String(50), nullable=True)                    # call|task|whatsapp|stage_change|...
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    activity_metadata = Column(JSON, nullable=True)

    # Atividade (Foco)
    priority = Column(String(20), nullable=True)  # normal|high|urgent
    due_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Arquivo
    file_name = Column(String(500), nullable=True)
    file_path = Column(String(1000), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    mime_type = Column(String(100), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
