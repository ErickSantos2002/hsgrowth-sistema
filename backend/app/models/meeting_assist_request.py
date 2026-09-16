"""
Modelo de MeetingAssistRequest — um pedido de ajuda à IA durante a reunião.

Cada clique em "Me ajuda aqui" fica registrado: o trecho da conversa naquele
momento, a resposta da IA e o custo da chamada.

O trecho é o que dá sentido ao registro. Sem ele, quem abrir o card depois lê
a sugestão sem saber o que o cliente tinha acabado de dizer — e o gerente não
consegue avaliar se a ajuda foi boa.

Os campos de token e latência existem para responder, depois de um mês de uso,
quanto a IA ao vivo custa de verdade, em vez de estimativa.
"""
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class MeetingAssistRequest(Base):
    """Um pedido de ajuda e a resposta que a IA deu."""

    __tablename__ = "meeting_assist_requests"

    id = Column(Integer, primary_key=True, index=True)

    card_task_id = Column(
        Integer,
        ForeignKey("card_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Quem pediu a ajuda",
    )
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    trecho = Column(Text, nullable=True, comment="Últimas falas antes do clique")
    leitura = Column(Text, nullable=False, comment="A leitura do momento, em uma frase")
    fala = Column(Text, nullable=False, comment="A fala pronta para usar na hora")
    pergunta = Column(Text, nullable=True)
    alertas = Column(JSON, nullable=True, comment="Lacunas apontadas (0 a 2)")
    fato_crm = Column(Text, nullable=True, comment="Fato do histórico que ajudou no momento")
    marcadores = Column(
        JSON, nullable=True,
        comment="Vocabulário fechado, para contar ocorrências depois",
    )

    modelo = Column(String(50), nullable=True)
    tokens_entrada = Column(Integer, nullable=True)
    tokens_saida = Column(Integer, nullable=True)
    latencia_ms = Column(Integer, nullable=True)

    task = relationship("CardTask", back_populates="assist_requests")
    user = relationship("User")

    def __repr__(self):
        return (
            f"<MeetingAssistRequest(id={self.id}, task={self.card_task_id}, "
            f"user={self.user_id})>"
        )
