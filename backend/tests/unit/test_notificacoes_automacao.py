"""
O rodízio é quem distribui os leads do site. Até 14/10 ele avisava com o
título genérico; agora o lead sai como lead.
"""
from app.models.automation import Automation
from app.models.card import Card
from app.services.automation_service import AutomationService
from tests.unit.apoio_notificacoes import avisos, usuario


def _rodizio(db, board, vendedor):
    a = Automation(board_id=board.id, name="Rodízio", automation_type="trigger",
                   actions=[{"type": "assign_round_robin", "params": {"user_ids": [vendedor.id]}}],
                   state={})
    db.add(a)
    db.commit()
    return a


def test_rodizio_de_lead_do_site_avisa_como_lead(db, test_board, test_lists, test_salesperson_user):
    integ = usuario(db, "integracao", "manager", is_integracao=True)
    card = Card(title="Lead site", list_id=test_lists[0].id, position=0, created_by_id=integ.id)
    db.add(card)
    db.commit()

    AutomationService(db)._assign_round_robin(_rodizio(db, test_board, test_salesperson_user), card)

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "lead_site"


def test_rodizio_de_card_comum_avisa_como_card_atribuido(db, test_board, test_lists, test_salesperson_user, test_manager_user):
    card = Card(title="Card", list_id=test_lists[0].id, position=0, created_by_id=test_manager_user.id)
    db.add(card)
    db.commit()

    AutomationService(db)._assign_round_robin(_rodizio(db, test_board, test_salesperson_user), card)

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "card_atribuido"


def test_acao_enviar_notificacao_usa_o_tipo_automacao(db, test_card, test_salesperson_user):
    AutomationService(db)._send_notification_action(
        test_card, {"user_ids": [test_salesperson_user.id], "title": "Olhe isto", "message": "m"})

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "automacao"
    assert aviso.title == "Olhe isto"
