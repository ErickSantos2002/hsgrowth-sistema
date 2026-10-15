"""Os outros avisos que já existiam passam a usar os tipos novos e as preferências."""
from datetime import datetime

from app.models.card_task import CardTask
from app.models.user_notification_setting import UserNotificationSetting
from app.services.recording_service import _notificar
from tests.unit.apoio_notificacoes import avisos


def test_tarefa_criada_por_outra_pessoa(client, db, manager_headers, test_card, test_salesperson_user):
    client.post("/api/v1/card-tasks", headers=manager_headers, json={
        "card_id": test_card.id, "title": "Ligar", "task_type": "call",
        "assigned_to_id": test_salesperson_user.id, "due_date": "2026-10-20T13:00:00",
    })

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "tarefa_para_mim"


def test_tarefa_respeita_a_preferencia(client, db, manager_headers, test_card, test_salesperson_user):
    db.add(UserNotificationSetting(user_id=test_salesperson_user.id, task_assigned=False))
    db.commit()

    client.post("/api/v1/card-tasks", headers=manager_headers, json={
        "card_id": test_card.id, "title": "Ligar", "task_type": "call",
        "assigned_to_id": test_salesperson_user.id, "due_date": "2026-10-20T13:00:00",
    })

    assert avisos(db, test_salesperson_user.id) == []


def test_reuniao_pronta_e_falha(db, test_card, test_salesperson_user):
    task = CardTask(card_id=test_card.id, title="Apresentação", task_type="meeting",
                    assigned_to_id=test_salesperson_user.id, due_date=datetime(2026, 10, 20, 13))
    db.add(task)
    db.commit()

    _notificar(db, [test_salesperson_user.id], "Gravacao disponivel", "m", task)
    _notificar(db, [test_salesperson_user.id], "Falha", "m", task, tipo="reuniao_falha")

    tipos = [a.notification_type for a in avisos(db, test_salesperson_user.id)]
    assert tipos == ["reuniao_pronta", "reuniao_falha"]
