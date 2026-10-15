"""
Resumo das 8h: o dia de cada um, num aviso só.

Lembrete tarefa a tarefa viraria spam — em 14/10 a Gislayne tinha 274
tarefas atrasadas e o Eduardo 190. Datas: tarefas de Vendas são gravadas em
UTC; atividades de Serviço, no horário de Brasília.
"""
from datetime import datetime

from app.models.card_task import CardTask, TaskType
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.user_notification_setting import UserNotificationSetting
from app.services.notificacoes.resumo import enviar_resumos_da_manha
from tests.unit.apoio_notificacoes import avisos, boards_de_servico, usuario

# 15/10/2026 08:00 em Brasília = 11:00 UTC
AGORA = datetime(2026, 10, 15, 11, 0)


def _tarefa(db, card, quem, tipo, quando_utc, **kw):
    t = CardTask(card_id=card.id, title="t", task_type=tipo, assigned_to_id=quem.id,
                 due_date=quando_utc, **kw)
    db.add(t)
    db.commit()


def test_conta_o_dia_e_os_atrasados(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 13))
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 17))
    _tarefa(db, test_card, test_salesperson_user, TaskType.MEETING, datetime(2026, 10, 15, 19))
    _tarefa(db, test_card, test_salesperson_user, TaskType.EMAIL, datetime(2026, 10, 10, 12))

    assert enviar_resumos_da_manha(db, AGORA) == 1

    [aviso] = avisos(db, test_salesperson_user.id, "resumo_manha")
    assert aviso.message == "Hoje: 2 ligações, 1 reunião · 1 atrasada"
    assert aviso.notification_metadata["url"] == "/activities"


def test_virada_do_dia_e_em_brasilia(db, test_card, test_salesperson_user):
    """02:30 UTC de 16/10 ainda é 15/10 em Brasília (23:30)."""
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 16, 2, 30))

    enviar_resumos_da_manha(db, AGORA)

    assert avisos(db, test_salesperson_user.id)[0].message == "Hoje: 1 ligação"


def test_concluida_e_cancelada_nao_contam(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 13), is_completed=True)
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 13), is_cancelled=True)

    assert enviar_resumos_da_manha(db, AGORA) == 0


def test_so_atrasadas(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 1, 13))
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 2, 13))

    enviar_resumos_da_manha(db, AGORA)

    assert avisos(db, test_salesperson_user.id)[0].message == "Nada agendado para hoje · 2 atrasadas"


def test_nao_repete_no_mesmo_dia(db, test_card, test_salesperson_user):
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 13))

    enviar_resumos_da_manha(db, AGORA)
    enviar_resumos_da_manha(db, AGORA)

    assert len(avisos(db, test_salesperson_user.id)) == 1


def test_respeita_a_preferencia(db, test_card, test_salesperson_user):
    db.add(UserNotificationSetting(user_id=test_salesperson_user.id, resumo_manha=False))
    db.commit()
    _tarefa(db, test_card, test_salesperson_user, TaskType.CALL, datetime(2026, 10, 15, 13))

    assert enviar_resumos_da_manha(db, AGORA) == 0


def test_atividades_de_servico_em_horario_de_brasilia(db):
    b = boards_de_servico(db)
    andre = usuario(db, "Andre", "service")
    card = ServiceCard(list_id=b.lista_cobranca.id, title="Cobrança 1")
    db.add(card)
    db.commit()
    for quando in (datetime(2026, 10, 15, 16), datetime(2026, 10, 15, 23, 30), datetime(2026, 10, 14, 16)):
        db.add(ServiceCardActivity(service_card_id=card.id, user_id=andre.id, category="atividade",
                                   activity_type="follow_up", due_date=quando, is_completed=False))
    db.commit()

    enviar_resumos_da_manha(db, AGORA)

    assert avisos(db, andre.id)[0].message == "Hoje: 2 follow-ups · 1 atrasada"
