"""
Aviso 15 minutos antes, só de reunião: no último mês foram 65 ligações
agendadas à mão por dia útil contra 2,4 reuniões no time todo.
"""
from datetime import datetime, timedelta

from app.models.card_task import CardTask, TaskType
from app.services.notificacoes.reunioes import avisar_reunioes_proximas
from tests.unit.apoio_notificacoes import avisos

AGORA = datetime(2026, 10, 15, 16, 45)  # 13:45 em Brasília


def _tarefa(db, card, quem, tipo, minutos, **kw):
    t = CardTask(card_id=card.id, title="Apresentação Phoebus - ACME", task_type=tipo,
                 assigned_to_id=quem.id, due_date=AGORA + timedelta(minutes=minutos), **kw)
    db.add(t)
    db.commit()
    return t


def test_avisa_reuniao_daqui_a_15_minutos(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 15)

    assert avisar_reunioes_proximas(db, AGORA) == 1

    [aviso] = avisos(db, test_salesperson_user.id, "reuniao_15min")
    assert aviso.message == '"Apresentação Phoebus - ACME" às 14:00.'
    assert aviso.notification_metadata["url"] == f"/cards/{test_card.id}"


def test_fora_da_janela_nao_avisa(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 30)
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 5)

    assert avisar_reunioes_proximas(db, AGORA) == 0


def test_ligacao_nao_avisa(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, 15)

    assert avisar_reunioes_proximas(db, AGORA) == 0


def test_concluida_ou_cancelada_nao_avisa(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 15, is_completed=True)
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 15, is_cancelled=True)

    assert avisar_reunioes_proximas(db, AGORA) == 0


def test_rodando_a_cada_minuto_avisa_uma_vez(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, 15)

    for minuto in range(6):
        avisar_reunioes_proximas(db, AGORA + timedelta(minutes=minuto))

    assert len(avisos(db, test_salesperson_user.id)) == 1
