"""
Aviso 15 minutos antes de reunião.

O agendador roda a cada minuto e olha a janela de 10 a 16 minutos à frente:
cada reunião cai nela várias vezes, e a `referencia` faz o aviso sair uma só.
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.card_task import CardTask, TaskType
from app.services.notificacoes.enviar import notificar
from app.services.notificacoes.horario import hora_em_brasilia

JANELA_DE = timedelta(minutes=10)
JANELA_ATE = timedelta(minutes=16)


def avisar_reunioes_proximas(db: Session, agora_utc: datetime) -> int:
    """Returns: quantos avisos foram enviados."""
    reunioes = (
        db.query(CardTask)
        .filter(
            CardTask.task_type == TaskType.MEETING,
            CardTask.is_completed == False,  # noqa: E712
            CardTask.is_cancelled == False,  # noqa: E712
            CardTask.assigned_to_id.isnot(None),
            CardTask.due_date >= agora_utc + JANELA_DE,
            CardTask.due_date <= agora_utc + JANELA_ATE,
        )
        .all()
    )
    enviados = 0
    for t in reunioes:
        if notificar(
            db, t.assigned_to_id, "reuniao_15min", "Reunião em 15 minutos",
            f'"{t.title}" às {hora_em_brasilia(t.due_date)}.',
            link=f"/cards/{t.card_id}",
            metadata={"card_id": t.card_id, "task_id": t.id},
            referencia=f"reuniao:{t.id}",
        ):
            enviados += 1
    return enviados
