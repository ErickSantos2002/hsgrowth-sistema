"""
A avaliação de uma reunião pela régua da consultoria.

Duas tabelas: a avaliação (uma por reunião) e os 26 itens.

Cada item guarda o peso e o bloco que valiam no momento da avaliação, em vez
de só apontar para a régua. É o que permite reabrir uma avaliação antiga e ver
exatamente como o score foi calculado, mesmo que a régua tenha mudado depois.
"""
from datetime import datetime

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class MeetingEvaluation(Base):
    """Uma avaliação — reavaliar substitui a anterior."""

    __tablename__ = "meeting_evaluations"
    __table_args__ = (UniqueConstraint("card_task_id", name="uq_meeting_evaluation_task"),)

    id = Column(Integer, primary_key=True, index=True)

    card_task_id = Column(
        Integer,
        ForeignKey("card_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    avaliado_por_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Quem pediu a avaliação",
    )
    avaliado_em = Column(DateTime, nullable=False, default=datetime.utcnow)

    versao_criterios = Column(
        String(20),
        nullable=False,
        comment="Qual régua foi usada — avaliação antiga continua explicável",
    )

    # Nulo quando a cobertura ficou abaixo do mínimo: a reunião não recebe
    # score comparável, mas os itens continuam lá para leitura.
    score = Column(Float, nullable=True)
    veredito = Column(String(80), nullable=True)
    cobertura = Column(Float, nullable=True, comment="0 a 1")
    medias_por_bloco = Column(JSON, nullable=True)

    desfecho = Column(Text, nullable=True)
    ponto_forte = Column(Text, nullable=True)
    foco_desenvolvimento = Column(Text, nullable=True)
    proxima_acao = Column(Text, nullable=True)

    modelo = Column(String(50), nullable=True)
    tokens_entrada = Column(Integer, nullable=True)
    tokens_saida = Column(Integer, nullable=True)
    latencia_ms = Column(Integer, nullable=True)

    task = relationship("CardTask", back_populates="evaluation")
    avaliado_por = relationship("User", foreign_keys=[avaliado_por_id])
    itens = relationship(
        "MeetingEvaluationItem",
        back_populates="avaliacao",
        cascade="all, delete-orphan",
        order_by="MeetingEvaluationItem.id",
    )

    def __repr__(self) -> str:
        return f"<MeetingEvaluation(task={self.card_task_id}, score={self.score})>"


class MeetingEvaluationItem(Base):
    """Um critério avaliado, com a evidência que sustenta a nota."""

    __tablename__ = "meeting_evaluation_items"

    id = Column(Integer, primary_key=True, index=True)

    evaluation_id = Column(
        Integer,
        ForeignKey("meeting_evaluations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    criterio_id = Column(String(5), nullable=False)
    bloco = Column(String(20), nullable=False)
    peso = Column(
        Float, nullable=False, comment="Copiado da régua no momento da avaliação"
    )

    # 0, 1, 2 ou nulo quando o critério não se aplica àquela reunião
    nota = Column(Integer, nullable=True)

    evidencia = Column(Text, nullable=True)
    porque = Column(Text, nullable=True)

    avaliacao = relationship("MeetingEvaluation", back_populates="itens")

    def __repr__(self) -> str:
        return f"<MeetingEvaluationItem({self.criterio_id}, nota={self.nota})>"
