"""
Modelos do sistema de Cadência por Lead Individual.

CadenceTemplate  — template configurável por admin/gerente (ex: "Cadência Inbound")
CadenceStep      — etapa do template (ex: Dia 1 - Warm Call Manhã)
CardCadence      — instância de uma cadência em um card específico
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class CadenceTemplate(Base):
    """
    Template de cadência configurado por admin/gerente.
    Define a sequência de atividades (etapas) que serão criadas no lead.
    """
    __tablename__ = "cadence_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    created_by = relationship("User", foreign_keys=[created_by_id])
    steps = relationship("CadenceStep", back_populates="template", cascade="all, delete-orphan", order_by="CadenceStep.order")
    card_cadences = relationship("CardCadence", back_populates="template")

    def __repr__(self):
        return f"<CadenceTemplate(id={self.id}, name='{self.name}')>"


class CadenceStep(Base):
    """
    Etapa de um template de cadência.
    Define qual atividade criar, em qual dia útil e com qual prioridade.
    """
    __tablename__ = "cadence_steps"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("cadence_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    order = Column(Integer, nullable=False)           # Ordem da etapa (1, 2, 3...)
    day_offset = Column(Integer, nullable=False)      # Dias úteis desde o início (1, 3, 5...)
    activity_type = Column(String(50), nullable=False)  # call, email, whatsapp, task...
    title = Column(String(255), nullable=False)       # Ex: "Warm Call Manhã"
    description = Column(Text, nullable=True)         # Instrução para o SDR
    priority = Column(String(20), nullable=False, default="normal")  # normal, high, urgent

    # Relacionamentos
    template = relationship("CadenceTemplate", back_populates="steps")

    def __repr__(self):
        return f"<CadenceStep(id={self.id}, order={self.order}, type='{self.activity_type}', day={self.day_offset})>"


class CardCadence(Base):
    """
    Instância de uma cadência em um card específico.
    Criada quando o SDR inicia uma cadência em um lead.
    """
    __tablename__ = "card_cadences"

    STATUS_ACTIVE = "active"
    STATUS_PAUSED = "paused"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("cadence_templates.id", ondelete="RESTRICT"), nullable=False)
    started_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), nullable=False, default="active", index=True)
    current_step_order = Column(Integer, nullable=False, default=1)
    started_at = Column(DateTime, nullable=False, server_default=func.now())
    paused_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relacionamentos
    card = relationship("Card", back_populates="cadences")
    template = relationship("CadenceTemplate", back_populates="card_cadences")
    started_by = relationship("User", foreign_keys=[started_by_id])
    tasks = relationship("CardTask", back_populates="card_cadence", foreign_keys="CardTask.card_cadence_id")

    @property
    def is_active(self):
        return self.status == self.STATUS_ACTIVE

    @property
    def is_paused(self):
        return self.status == self.STATUS_PAUSED

    @property
    def is_finished(self):
        return self.status in (self.STATUS_COMPLETED, self.STATUS_CANCELLED)

    def __repr__(self):
        return f"<CardCadence(id={self.id}, card_id={self.card_id}, status='{self.status}', step={self.current_step_order})>"
