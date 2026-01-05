"""
Modelo de AutomationExecution (Execução de Automação).
Registra histórico de execuções de automações.
"""
from sqlalchemy import Column, Integer, ForeignKey, String, Text, Boolean, JSON, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.base import Base


class AutomationExecution(Base):
    """
    Representa uma execução de automação (histórico).
    """
    __tablename__ = "automation_executions"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Automation
    automation_id = Column(Integer, ForeignKey("automations.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relacionamento com Card (cartão que disparou a automação, se aplicável)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="SET NULL"), nullable=True, index=True)

    # Relacionamento com User (usuário que disparou, se aplicável)
    triggered_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Status da execução
    status = Column(String(20), nullable=False, index=True)  # success, failed, pending

    # Dados da execução
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Float, nullable=True)  # Duração em milissegundos

    # Detalhes da execução (JSON)
    # Dados do trigger, condições verificadas, ações executadas
    execution_data = Column(JSON, default={}, nullable=False)

    # Erro (se houver)
    error_message = Column(Text, nullable=True)
    error_stack = Column(Text, nullable=True)

    # Relacionamentos
    automation = relationship("Automation", back_populates="executions")
    card = relationship("Card")
    triggered_by = relationship("User")

    def __repr__(self):
        return f"<AutomationExecution(id={self.id}, automation_id={self.automation_id}, status='{self.status}')>"
