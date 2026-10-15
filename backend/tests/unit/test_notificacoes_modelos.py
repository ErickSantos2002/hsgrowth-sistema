"""
As colunas novas das notificações.

`referencia` e `avisado_em` existem para o agendador nunca avisar duas vezes;
`created_by_id` e `is_integracao` para reconhecer o lead do site.
"""
from datetime import datetime

from app.models.card import Card
from app.models.notification import Notification
from app.models.service_card import ServiceCard
from app.models.user_notification_setting import UserNotificationSetting
from tests.unit.apoio_notificacoes import boards_de_servico, usuario


def test_notificacao_guarda_a_referencia(db, test_salesperson_user):
    n = Notification(user_id=test_salesperson_user.id, notification_type="resumo_manha",
                     title="t", message="m", notification_metadata={},
                     referencia="resumo:2026-10-15")
    db.add(n)
    db.commit()

    assert db.query(Notification).one().referencia == "resumo:2026-10-15"


def test_card_guarda_quem_criou(db, test_lists, test_salesperson_user):
    card = Card(title="Lead", list_id=test_lists[0].id, position=0,
                created_by_id=test_salesperson_user.id)
    db.add(card)
    db.commit()

    assert db.query(Card).one().created_by_id == test_salesperson_user.id


def test_usuario_de_integracao(db):
    integ = usuario(db, "integracao", "manager", is_integracao=True)
    pessoa = usuario(db, "Sandra", "salesperson")

    assert integ.is_integracao is True
    assert pessoa.is_integracao is False


def test_card_de_servico_nasce_sem_aviso(db):
    b = boards_de_servico(db)
    c = ServiceCard(list_id=b.lista_servicos.id, title="OS 1")
    db.add(c)
    db.commit()

    assert c.avisado_em is None
    c.avisado_em = datetime(2026, 10, 14, 12, 0)
    db.commit()
    assert db.query(ServiceCard).one().avisado_em == datetime(2026, 10, 14, 12, 0)


def test_preferencias_novas_nascem_ligadas(db, test_salesperson_user):
    p = UserNotificationSetting(user_id=test_salesperson_user.id)
    db.add(p)
    db.commit()
    db.refresh(p)

    assert p.task_assigned and p.card_product_changed
    assert p.reuniao_pronta and p.resumo_manha and p.reuniao_15min and p.popup_navegador
    assert p.quadros_servico is None
    assert not hasattr(p, "card_moved")
    assert not hasattr(p, "achievement_unlocked")
    assert not hasattr(p, "task_due_soon")
