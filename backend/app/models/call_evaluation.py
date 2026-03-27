from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base


class CallEvaluation(Base):
    """
    Avaliação de ligação gerada pelo agente de IA no N8N.

    Armazena transcrição, resumo estruturado, avaliação por matriz de blocos
    e nota final de cada ligação processada automaticamente.
    """
    __tablename__ = "call_evaluations"

    id = Column(Integer, primary_key=True, index=True)

    # Referências
    card_id = Column(
        Integer,
        ForeignKey("cards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Card ao qual a ligação pertence"
    )
    call_log_id = Column(
        Integer,
        ForeignKey("call_logs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Registro da chamada VOIP (opcional)"
    )

    # Identificação do vendedor
    ramal = Column(String(20), nullable=True, comment="Ramal do vendedor que realizou a ligação")
    vendedor_name = Column(String(255), nullable=True, comment="Nome do vendedor que realizou a ligação")

    # Transcrição completa
    transcript = Column(Text, nullable=True, comment="Transcrição completa da ligação")

    # Seção 1: Resumo estruturado
    summary = Column(Text, nullable=False, comment="Resumo objetivo da conversa")
    next_steps = Column(Text, nullable=True, comment="Próximos passos combinados")
    general_evaluation = Column(Text, nullable=True, comment="Clareza, receptividade e qualificação")
    situation = Column(
        String(50),
        nullable=True,
        comment="Situação: Acompanhamento em aberto | Oportunidade fechada | Sem potencial"
    )

    # Seção 2: Avaliação por matriz (JSONB)
    matrix_evaluation = Column(
        JSON,
        nullable=True,
        comment="Avaliação por blocos: grade, justification, uncovered_blocks"
    )

    # Seção 3: Nota final
    final_score = Column(Float, nullable=True, comment="Nota final (0.0 a 10.0)")
    classification = Column(
        String(20),
        nullable=True,
        comment="Excelente | Boa | Regular | Fraca | Crítica"
    )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    card = relationship("Card", backref="call_evaluations")
    call_log = relationship("CallLog", backref="evaluation", uselist=False)
