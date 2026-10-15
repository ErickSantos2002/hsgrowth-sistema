"""
Resumo da manhã: seg a sex, 8h, um aviso por pessoa com o dia dela.

Vendas conta as tarefas pelo responsável; Serviço conta as atividades por
quem criou. Quem trabalha nos dois recebe um resumo só. Quem não tem nada
para hoje nem atrasado não recebe.
"""
from collections import Counter, defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.card_task import CardTask
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.services.notificacoes.enviar import notificar
from app.services.notificacoes.horario import dia_em_brasilia

NOMES = {
    "call": ("ligação", "ligações"),
    "meeting": ("reunião", "reuniões"),
    "email": ("e-mail", "e-mails"),
    "whatsapp": ("WhatsApp", "WhatsApps"),
    "linkedin": ("LinkedIn", "LinkedIns"),
    "follow_up": ("follow-up", "follow-ups"),
    "task": ("tarefa", "tarefas"),
}
OUTRA = ("outra", "outras")


def _tipo(valor) -> str:
    return getattr(valor, "value", valor) or "other"


def _contagem(n: int, tipo: str) -> str:
    singular, plural = NOMES.get(tipo, OUTRA)
    return f"{n} {singular if n == 1 else plural}"


def montar_mensagem(hoje: Counter, atrasadas: int) -> str:
    partes = [_contagem(n, t) for t, n in sorted(hoje.items(), key=lambda x: (-x[1], x[0]))]
    texto = f"Hoje: {', '.join(partes)}" if partes else "Nada agendado para hoje"
    if atrasadas:
        texto += f" · {atrasadas} atrasada{'' if atrasadas == 1 else 's'}"
    return texto


def enviar_resumos_da_manha(db: Session, agora_utc: datetime) -> int:
    """Returns: quantos resumos foram enviados."""
    dia = dia_em_brasilia(agora_utc)
    hoje = defaultdict(Counter)
    atrasadas = Counter()

    tarefas = (
        db.query(CardTask.assigned_to_id, CardTask.task_type, CardTask.due_date)
        .filter(
            CardTask.assigned_to_id.isnot(None),
            CardTask.is_completed == False,  # noqa: E712
            CardTask.is_cancelled == False,  # noqa: E712
            CardTask.due_date.isnot(None),
            CardTask.due_date < dia.fim_utc,
        )
    )
    for pessoa, tipo, quando in tarefas:
        if quando >= dia.inicio_utc:
            hoje[pessoa][_tipo(tipo)] += 1
        else:
            atrasadas[pessoa] += 1

    atividades = (
        db.query(ServiceCardActivity.user_id, ServiceCardActivity.activity_type,
                 ServiceCardActivity.due_date)
        .join(ServiceCard, ServiceCard.id == ServiceCardActivity.service_card_id)
        .filter(
            ServiceCardActivity.user_id.isnot(None),
            ServiceCardActivity.category == "atividade",
            ServiceCardActivity.is_completed == False,  # noqa: E712
            ServiceCardActivity.due_date.isnot(None),
            ServiceCardActivity.due_date < dia.fim_local,
            ServiceCard.is_deleted == False,  # noqa: E712
        )
    )
    for pessoa, tipo, quando in atividades:
        if quando >= dia.inicio_local:
            hoje[pessoa][_tipo(tipo)] += 1
        else:
            atrasadas[pessoa] += 1

    enviados = 0
    for pessoa in set(hoje) | set(atrasadas):
        if notificar(
            db, pessoa, "resumo_manha", "Resumo do dia",
            montar_mensagem(hoje[pessoa], atrasadas[pessoa]),
            link="/activities",
            metadata={"data": dia.data.isoformat()},
            referencia=f"resumo:{dia.data.isoformat()}",
        ):
            enviados += 1
    return enviados
