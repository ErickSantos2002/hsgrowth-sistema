"""
Modelo de ServiceCardActivity — registro unificado de eventos de um card de serviços.

Cobre 4 categorias (campo `category`):
  - "atividade"  → tarefas/atividades (com Foco: due_date + is_completed)
  - "anotacao"   → anotações manuais
  - "arquivo"    → arquivos anexados (metadados; binário no filesystem)
  - "alteracao"  → eventos automáticos (mudou de etapa, produto add/remove, vínculos)
"""
from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, Boolean, JSON, BigInteger,
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ServiceCardActivity(Base, TimestampMixin):
    __tablename__ = "service_card_activities"

    id = Column(Integer, primary_key=True, index=True)

    service_card_id = Column(
        Integer,
        ForeignKey("service_cards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Autor do evento. NULL = sistema (eventos automáticos)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Categoria e tipo
    category = Column(String(20), nullable=False, index=True)  # atividade|anotacao|arquivo|alteracao
    activity_type = Column(String(50), nullable=True)          # call|task|note|stage_change|...

    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    activity_metadata = Column(JSON, nullable=True)

    # ── Campos de "atividade" (Foco) ─────────────────────────────────────────
    priority = Column(String(20), nullable=True)   # normal|high|urgent
    due_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # ── Campos de "arquivo" ──────────────────────────────────────────────────
    file_name = Column(String(500), nullable=True)    # nome original
    file_path = Column(String(1000), nullable=True)   # caminho no storage
    file_size = Column(BigInteger, nullable=True)
    mime_type = Column(String(100), nullable=True)

    # Relacionamentos
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<ServiceCardActivity(id={self.id}, card={self.service_card_id}, category='{self.category}', type='{self.activity_type}')>"
