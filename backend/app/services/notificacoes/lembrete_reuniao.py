"""
Lembrete de reunião por e-mail aos convidados.

Dois lembretes, saindo da conta Outlook de quem enviou o convite:
- às 8h do dia (Brasília), para reuniões que começam às 9h ou depois;
- 1 hora antes, se a reunião não foi criada em cima da hora.

O agendador roda a cada minuto. Cada lembrete guarda o horário da reunião para
o qual já saiu (`reminder_*_sent_for`): roda várias vezes na janela e envia uma
só; se a reunião for remarcada, o horário muda e o lembrete vale de novo.

Só reuniões de Vendas (`CardTask`) criadas pelo CRM — Daily ou Teams — com o
convite já enviado (`teams_event_id`).
"""
from datetime import datetime, timedelta
from html import escape
from typing import List, Optional

from loguru import logger
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.card import Card
from app.models.card_task import CardTask, TaskType
from app.models.user import User
from app.services.notificacoes.horario import BRASILIA, dia_em_brasilia, hora_em_brasilia

# Lembrete do dia: das 8h às 8h30 (folga se o agendador atrasar), para
# reuniões a partir das 9h. Antes disso o lembrete de 1 hora já basta.
DIA_JANELA_INICIO = timedelta(hours=8)
DIA_JANELA_FIM = timedelta(hours=8, minutes=30)
DIA_A_PARTIR_DE = timedelta(hours=9)

# Lembrete de 1 hora: quando faltam entre 55 e 65 minutos.
UMA_HORA = timedelta(hours=1)
UMA_HORA_DE = timedelta(minutes=55)
UMA_HORA_ATE = timedelta(minutes=65)

DIA = "dia"
HORA = "1h"


def _elegiveis(db: Session):
    return db.query(CardTask).filter(
        CardTask.task_type == TaskType.MEETING,
        CardTask.is_completed == False,  # noqa: E712
        CardTask.is_cancelled == False,  # noqa: E712
        CardTask.due_date.isnot(None),
        CardTask.teams_event_id.isnot(None),
        CardTask.teams_event_id != "",
    )


def _reunioes_do_dia(db: Session, agora_utc: datetime) -> List[CardTask]:
    dia = dia_em_brasilia(agora_utc)
    local = agora_utc + BRASILIA
    if not (dia.inicio_local + DIA_JANELA_INICIO <= local < dia.inicio_local + DIA_JANELA_FIM):
        return []
    return (
        _elegiveis(db)
        .filter(
            CardTask.due_date >= dia.inicio_utc + DIA_A_PARTIR_DE,
            CardTask.due_date < dia.fim_utc,
            or_(CardTask.reminder_day_sent_for.is_(None),
                CardTask.reminder_day_sent_for != CardTask.due_date),
        )
        .all()
    )


def _reunioes_em_1_hora(db: Session, agora_utc: datetime) -> List[CardTask]:
    candidatas = (
        _elegiveis(db)
        .filter(
            CardTask.due_date >= agora_utc + UMA_HORA_DE,
            CardTask.due_date <= agora_utc + UMA_HORA_ATE,
            or_(CardTask.reminder_1h_sent_for.is_(None),
                CardTask.reminder_1h_sent_for != CardTask.due_date),
        )
        .all()
    )
    # Criada a menos de 1 hora do início: o convite acabou de chegar.
    return [t for t in candidatas if not t.created_at or t.created_at <= t.due_date - UMA_HORA]


def organizador_do_convite(db: Session, task: CardTask) -> Optional[User]:
    """Quem enviou o convite: o evento está no Outlook dessa pessoa, então o
    lembrete sai da conta dela e é por ela que se altera ou cancela o evento.
    Reuniões de antes do lembrete não guardavam isso.
    O usuário de integração nunca é o organizador: a reunião que o site marca
    nasce na agenda do vendedor."""
    for uid in (task.invite_organizer_id, task.created_by_id, task.assigned_to_id):
        if uid:
            user = db.query(User).filter(User.id == uid).first()
            if user and not getattr(user, "is_integracao", False):
                return user
    return None


def convidados_do_convite(db: Session, task: CardTask, organizador: User) -> List[str]:
    """Os convidados do convite, sem o próprio organizador e sem repetição.
    Sem lista gravada (reunião antiga), o mesmo critério do convite: vendedor do
    card e e-mails do contato."""
    from app.services.microsoft_graph_service import microsoft_graph_service

    if task.invited_emails:
        emails = list(task.invited_emails)
    else:
        emails = []
        card = db.query(Card).filter(Card.id == task.card_id).first()
        if card and card.assigned_to and card.assigned_to.email:
            emails.append(card.assigned_to.email)
        if card and card.person:
            emails += [card.person.email, card.person.email_commercial, card.person.email_personal]

    proprio = (organizador.email or "").strip().lower()
    vistos, lista = set(), []
    for e in emails:
        e = (e or "").strip()
        chave = e.lower()
        if e and chave != proprio and chave not in vistos:
            vistos.add(chave)
            lista.append(e)

    # Mesma trava do convite: em homologação não vai e-mail para cliente real.
    lista, _ = microsoft_graph_service._filtrar_convidados(lista)
    return lista


def _link(task: CardTask) -> Optional[str]:
    if task.meeting_provider == "daily" and task.public_access_token:
        return f"{settings.FRONTEND_URL}/entrar/{task.public_access_token}"
    return task.teams_join_url or task.video_link or None


def montar_corpo_lembrete(task: CardTask, organizador: User, tipo: str) -> str:
    """Corpo do lembrete. Título e pauta vêm do usuário: tudo escapado."""
    hora = hora_em_brasilia(task.due_date)
    abertura = (
        f"Passando para lembrar que nossa reunião é <strong>hoje às {hora}</strong>."
        if tipo == DIA else
        f"Nossa reunião começa em <strong>1 hora</strong>, às {hora}."
    )
    linhas = ["<p>Olá!</p>", f"<p>{abertura}</p>"]

    quando = (task.due_date + BRASILIA).strftime("%d/%m/%Y às %H:%M")
    detalhes = [
        f"<strong>Assunto:</strong> {escape(task.title or '')}",
        f"<strong>Quando:</strong> {quando} (horário de Brasília)",
    ]
    if task.duration_minutes:
        detalhes.append(f"<strong>Duração prevista:</strong> {task.duration_minutes} minutos")
    linhas.append("<p>" + "<br>".join(detalhes) + "</p>")

    link = _link(task)
    if link:
        seguro = escape(link, quote=True)
        linhas.append(f'<p><strong>Como entrar:</strong><br><a href="{seguro}">{seguro}</a></p>')

    linhas.append("<p>Se precisar remarcar, é só responder este e-mail.</p>")

    assinatura = (getattr(organizador, "email_signature", "") or "").strip()
    if assinatura:
        linhas.append(f"<p>Até lá!</p>{assinatura}")
    else:
        linhas.append(f"<p>Até lá!<br>{escape(organizador.name or '')}<br>Health &amp; Safety</p>")
    return "".join(linhas)


def _assunto(task: CardTask, tipo: str) -> str:
    hora = hora_em_brasilia(task.due_date)
    if tipo == DIA:
        return f"Lembrete: {task.title} — hoje às {hora}"
    return f"Começa em 1 hora: {task.title} — às {hora}"


def _registrar(db: Session, task: CardTask, texto: str, tipo: str, extra: dict) -> None:
    try:
        from app.repositories.activity_repository import ActivityRepository
        ActivityRepository(db).create(
            card_id=task.card_id,
            user_id=None,
            activity_type="meeting_reminder",
            description=texto,
            activity_metadata={"task_id": task.id, "tipo": tipo, **extra},
        )
    except Exception as e:  # o histórico nunca impede o lembrete
        db.rollback()
        logger.error(f"[LEMBRETE] histórico da reunião {task.id} falhou: {e}")


def _enviar(db: Session, task: CardTask, tipo: str) -> bool:
    """Envia um lembrete e marca como tratado — mesmo se falhar, para não insistir a cada minuto."""
    from app.services.microsoft_graph_service import microsoft_graph_service

    horario = task.due_date
    if tipo == DIA:
        task.reminder_day_sent_for = horario
        rotulo = f"Lembrete de reunião (hoje às {hora_em_brasilia(horario)})"
    else:
        task.reminder_1h_sent_for = horario
        rotulo = f"Lembrete de 1 hora da reunião (às {hora_em_brasilia(horario)})"
    db.commit()

    organizador = organizador_do_convite(db, task)
    if not organizador:
        _registrar(db, task, f"{rotulo} não enviado: reunião sem organizador.", tipo, {"ok": False})
        return False

    para = convidados_do_convite(db, task, organizador)
    if not para:
        return False

    try:
        resultado = microsoft_graph_service.send_email(
            organizador, db, para, _assunto(task, tipo), montar_corpo_lembrete(task, organizador, tipo)
        )
    except Exception as e:
        _registrar(db, task, f"{rotulo} não enviado: {e}", tipo, {"ok": False})
        logger.warning(f"[LEMBRETE] reunião {task.id}: {e}")
        return False

    if not resultado.get("success"):
        erro = resultado.get("error", "falha no envio")
        _registrar(db, task, f"{rotulo} não enviado: {erro}", tipo, {"ok": False})
        return False

    texto = f"{rotulo} enviado para {', '.join(para)}."
    if resultado.get("partial_errors"):
        texto += f" Falhou para: {resultado['partial_errors']}"
    _registrar(db, task, texto, tipo, {"ok": True, "para": para})
    return True


def enviar_lembretes_de_reuniao(db: Session, agora_utc: datetime) -> int:
    """Returns: quantos lembretes saíram."""
    enviados = 0
    for task in _reunioes_do_dia(db, agora_utc):
        enviados += _enviar(db, task, DIA)
    for task in _reunioes_em_1_hora(db, agora_utc):
        enviados += _enviar(db, task, HORA)
    return enviados
