"""
Modelo de CardTask (Tarefa/Atividade do Card).
Representa atividades criadas pelos usuários: ligações, reuniões, tarefas, etc.
Diferente de Activity que registra eventos de auditoria.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.db.base import Base
from app.models.mixins import TimestampMixin


class TaskType(str, enum.Enum):
    """Tipos de atividade/tarefa"""
    CALL = "call"  # Ligação
    MEETING = "meeting"  # Reunião
    TASK = "task"  # Tarefa
    FOLLOW_UP = "follow_up"  # Acompanhamento/Retorno
    DEADLINE = "deadline"  # Prazo
    EMAIL = "email"  # E-mail
    LUNCH = "lunch"  # Almoço
    OTHER = "other"  # Outro


class TaskPriority(str, enum.Enum):
    """Prioridade da tarefa"""
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, enum.Enum):
    """Status da disponibilidade"""
    FREE = "free"  # Livre
    BUSY = "busy"  # Ocupado


class CardTask(Base, TimestampMixin):
    """
    Representa uma atividade/tarefa associada a um card.
    Exemplos: "Ligar para cliente", "Reunião de apresentação", "Enviar proposta", etc.
    """
    __tablename__ = "card_tasks"

    id = Column(Integer, primary_key=True, index=True)

    # Relacionamento com Card
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relacionamento com User responsável pela atividade
    assigned_to_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Quem criou a tarefa (para sistema de comissão de gamificação)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Informações básicas
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Tipo e prioridade
    task_type = Column(SQLEnum(TaskType), nullable=False, default=TaskType.TASK, index=True)
    priority = Column(SQLEnum(TaskPriority), nullable=False, default=TaskPriority.NORMAL)

    # Data e hora
    due_date = Column(DateTime, nullable=True, index=True)  # Data/hora de vencimento
    duration_minutes = Column(Integer, nullable=True, default=30)  # Duração em minutos

    # Status
    is_completed = Column(Boolean, default=False, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)
    # Indica que a reunião ocorreu mas o contato não compareceu (NoShow)
    is_noshow = Column(Boolean, default=False, nullable=False)

    # Informações adicionais
    location = Column(String(255), nullable=True)  # Local (físico ou virtual)
    video_link = Column(String(500), nullable=True)  # Link de videochamada
    notes = Column(Text, nullable=True)  # Notas adicionais
    contact_name = Column(String(255), nullable=True)  # Nome da pessoa de contato

    # Status de disponibilidade (para integração com calendário)
    status = Column(SQLEnum(TaskStatus), nullable=False, default=TaskStatus.FREE)

    # Relacionamentos
    card = relationship("Card", back_populates="tasks")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="tasks")
    created_by = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self):
        return f"<CardTask(id={self.id}, card_id={self.card_id}, type='{self.task_type}', title='{self.title}')>"

    def mark_as_completed(self):
        """Marca a tarefa como concluída"""
        self.is_completed = True
        self.completed_at = datetime.utcnow()

    def mark_as_noshow(self):
        """Marca a reunião como concluída com NoShow — contato não compareceu"""
        self.is_completed = True
        self.is_noshow = True
        self.completed_at = datetime.utcnow()

    def mark_as_pending(self):
        """Marca a tarefa como pendente"""
        self.is_completed = False
        self.completed_at = None

    @property
    def is_overdue(self) -> bool:
        """Verifica se a tarefa está atrasada"""
        if self.is_completed or not self.due_date:
            return False
        return datetime.utcnow() > self.due_date
