"""
Aviso de cancelamento da reunião aos convidados.

Quem recebeu o convite e os lembretes (8h do dia e 1 hora antes) precisa saber
quando a reunião é cancelada ou excluída. O aviso é o cancelamento do próprio
Outlook, com o nosso texto: um e-mail só, que também tira a reunião da agenda
do convidado. Sai da conta de quem enviou o convite — só o organizador pode
cancelar uma reunião no Outlook.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.card_task import CardTask
from app.models.user import User
from app.services.notificacoes.lembrete_reuniao import convidados_do_convite, organizador_do_convite


def texto_do_cancelamento(task: CardTask, organizador: User) -> str:
    """Texto puro: o Outlook põe este comentário no corpo do aviso."""
    from zoneinfo import ZoneInfo
    from datetime import timezone

    quando = ""
    if task.due_date:
        inicio = task.due_date
        if inicio.tzinfo is None:
            inicio = inicio.replace(tzinfo=timezone.utc)
        quando = (
            f" marcada para {inicio.astimezone(ZoneInfo('America/Sao_Paulo')).strftime('%d/%m/%Y às %H:%M')}"
            " (horário de Brasília)"
        )
    return (
        "Olá!\n\n"
        f'A reunião "{task.title or ""}"{quando} foi cancelada.\n\n'
        "Se quiser marcar um novo horário, é só responder este e-mail.\n\n"
        f"{organizador.name or ''}\nHealth & Safety"
    )


def cancelar_convite_da_reuniao(
    db: Session, task: CardTask, quem_cancelou: User, motivo: str = "cancelada"
) -> None:
    """
    Cancela o evento no Outlook de quem convidou, avisando os convidados, e
    registra no histórico do card. Não mexe na tarefa — quem chama decide.

    Args:
        motivo: "cancelada" ou "excluída", só para o histórico.

    Raises:
        ValueError: o Outlook recusou. Quem chama não deve seguir: o cliente
            continuaria com um convite de uma reunião que não vai acontecer.
    """
    from app.services.microsoft_graph_service import microsoft_graph_service

    organizador = organizador_do_convite(db, task) or quem_cancelou
    avisou = microsoft_graph_service.cancel_calendar_event(
        user=organizador,
        db=db,
        event_id=task.teams_event_id,
        comentario=texto_do_cancelamento(task, organizador),
    )

    if avisou:
        para = convidados_do_convite(db, task, organizador)
        texto = f'Reunião "{task.title}" {motivo} — aviso de cancelamento enviado'
        texto += f" para {', '.join(para)}." if para else "."
    else:
        para = []
        texto = (
            f'Reunião "{task.title}" {motivo} — o evento já não estava na agenda do '
            "Outlook, nenhum aviso foi enviado."
        )
    _registrar(db, task, quem_cancelou, texto, {"avisou": avisou, "para": para})


def _registrar(db: Session, task: CardTask, quem: Optional[User], texto: str, extra: dict) -> None:
    from loguru import logger

    try:
        from app.repositories.activity_repository import ActivityRepository
        ActivityRepository(db).create(
            card_id=task.card_id,
            user_id=quem.id if quem else None,
            activity_type="meeting_cancelled",
            description=texto,
            activity_metadata={"task_id": task.id, **extra},
        )
    except Exception as e:  # o histórico nunca impede o cancelamento
        db.rollback()
        logger.error(f"[CANCELAMENTO] histórico da reunião {task.id} falhou: {e}")
