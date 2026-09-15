"""
Modelo de MeetingRecording — um trecho gravado de uma reunião.

Uma reunião pode render vários arquivos: o vendedor para a gravação e recomeça
depois. Na homologação de 14/09 uma única reunião gerou três. Guardar apenas um
deles perderia parte da conversa, então cada trecho vira uma linha e a aba
Reuniões os mostra como "Parte 1 de 3".

A tarefa (`card_tasks`) continua guardando o resumo — status, duração e tamanho
somados —, que é o que a lista de reuniões precisa sem abrir cada gravação.
"""
from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class MeetingRecording(Base):
    """Um arquivo de gravação guardado no bucket."""

    __tablename__ = "meeting_recordings"

    id = Column(Integer, primary_key=True, index=True)

    card_task_id = Column(
        Integer,
        ForeignKey("card_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    daily_recording_id = Column(
        String(100), nullable=False, unique=True,
        comment="Identificador do arquivo no Daily — evita processar o mesmo trecho duas vezes",
    )
    ordem = Column(Integer, nullable=False, default=1, comment="1 = primeiro trecho da reunião")
    status = Column(
        String(30), nullable=False, default="processing",
        comment="processing | ready | failed | expired",
    )

    r2_key = Column(String(500), nullable=True, comment="Caminho do arquivo no bucket")
    duration_seconds = Column(Integer, nullable=True)
    size_bytes = Column(BigInteger, nullable=True)
    error = Column(Text, nullable=True, comment="Motivo da falha no processamento")

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ready_at = Column(DateTime, nullable=True, comment="Quando o arquivo ficou disponível")

    task = relationship("CardTask", back_populates="recordings")

    def __repr__(self):
        return (
            f"<MeetingRecording(id={self.id}, task={self.card_task_id}, "
            f"ordem={self.ordem}, status='{self.status}')>"
        )
