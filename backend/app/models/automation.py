"""
Modelo de Automation (Automação).
Define automações trigger-based ou agendadas (scheduled).
"""
from sqlalchemy import Column, Integer, ForeignKey, String, Text, Boolean, JSON, DateTime
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Automation(Base, TimestampMixin):
    """
    Representa uma automação no sistema.
    Pode ser trigger-based (quando cartão move, cria, atualiza) ou scheduled (execução agendada).
    """
    __tablename__ = "automations"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Board (automações são por quadro)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)

    # Informações básicas
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Tipo de automação
    automation_type = Column(String(20), nullable=False, index=True)  # trigger, scheduled

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Prioridade (1-100, maior = mais prioritário)
    priority = Column(Integer, default=50, nullable=False, index=True)

    # === CONFIGURAÇÕES PARA TRIGGER ===
    # Trigger event (card_moved, card_created, card_updated, field_changed)
    trigger_event = Column(String(50), nullable=True, index=True)

    # Condições do trigger (JSON)
    # Exemplo: {"from_list_id": 1, "to_list_id": 2}
    # Exemplo: {"field_id": 5, "operator": "equals", "value": "Sim"}
    trigger_conditions = Column(JSON, nullable=True)

    # === CONFIGURAÇÕES PARA SCHEDULED ===
    # Tipo de schedule: once (execução única) ou recurrent (recorrente)
    schedule_type = Column(String(20), nullable=True)  # once, recurrent

    # Data/hora de execução (para once)
    scheduled_at = Column(DateTime, nullable=True)

    # Recorrência (para recurrent): daily, weekly, monthly, annual
    recurrence_pattern = Column(String(20), nullable=True)

    # Próxima execução (calculado automaticamente)
    next_run_at = Column(DateTime, nullable=True, index=True)

    # === AÇÕES DA AUTOMAÇÃO ===
    # Ações a executar (JSON array)
    # Exemplo: [{"type": "move_card", "target_list_id": 3}, {"type": "notify", "user_id": 10}]
    actions = Column(JSON, default=[], nullable=False)

    # Estado persistente da automação (JSON)
    # Usado para guardar estados como: último vendedor do rodízio, contadores, etc.
    # Exemplo: {"round_robin_last_user_id": 5}
    state = Column(JSON, default={}, nullable=False)

    # === CONTROLE DE EXECUÇÃO ===
    # Total de execuções
    execution_count = Column(Integer, default=0, nullable=False)

    # Última execução
    last_run_at = Column(DateTime, nullable=True)

    # Total de falhas
    failure_count = Column(Integer, default=0, nullable=False)

    # Auto-desabilitar após X falhas
    auto_disable_on_failures = Column(Integer, default=5, nullable=False)

    # Relacionamentos
    board = relationship("Board")
    executions = relationship("AutomationExecution", back_populates="automation", lazy="dynamic", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Automation(id={self.id}, name='{self.name}', type='{self.automation_type}')>"
