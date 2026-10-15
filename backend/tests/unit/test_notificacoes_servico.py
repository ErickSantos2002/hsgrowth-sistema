"""
Card novo em Serviço, agrupado: em 01/10/2026 chegaram 101 cards de Cobrança
de uma vez. Os cards de Serviço não têm dono — o aviso vai para quem
acompanha o board.
"""
from datetime import datetime

from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.user_notification_setting import UserNotificationSetting
from app.services.notificacoes.servico import avisar_cards_novos_de_servico
from tests.unit.apoio_notificacoes import avisos, boards_de_servico, usuario

AGORA = datetime(2026, 10, 15, 14, 0)


def _acompanha(db, quem, *boards):
    db.add(UserNotificationSetting(user_id=quem.id, quadros_servico=[b.id for b in boards]))
    db.commit()


def _card(db, lista, titulo, criador=None):
    c = ServiceCard(list_id=lista.id, title=titulo)
    db.add(c)
    db.commit()
    if criador:
        db.add(ServiceCardActivity(service_card_id=c.id, user_id=criador.id,
                                   category="alteracao", activity_type="card_created"))
        db.commit()
    return c


def test_um_card_avisa_com_o_titulo(db):
    b = boards_de_servico(db)
    ellen = usuario(db, "Ellen", "service")
    _acompanha(db, ellen, b.servicos)
    c = _card(db, b.lista_servicos, "TRANSPORTES SILVA — OS 1234")

    assert avisar_cards_novos_de_servico(db, AGORA) == 1

    [aviso] = avisos(db, ellen.id, "card_novo_servico")
    assert aviso.title == "Novo card em Serviços"
    assert aviso.message == "TRANSPORTES SILVA — OS 1234"
    assert aviso.notification_metadata["url"] == f"/servicos/{b.servicos.id}/cards/{c.id}"


def test_varios_cards_viram_um_aviso(db):
    b = boards_de_servico(db)
    andre = usuario(db, "Andre", "service")
    _acompanha(db, andre, b.cobranca)
    for i in range(5):
        _card(db, b.lista_cobranca, f"Cobrança {i}")

    avisar_cards_novos_de_servico(db, AGORA)

    [aviso] = avisos(db, andre.id)
    assert aviso.title == "5 cards novos em Cobrança"
    assert aviso.message == "Cobrança 0, Cobrança 1, Cobrança 2 e mais 2"
    assert aviso.notification_metadata["url"] == f"/servicos/{b.cobranca.id}"


def test_so_quem_acompanha_o_board(db):
    b = boards_de_servico(db)
    andre = usuario(db, "Andre", "service")
    ellen = usuario(db, "Ellen", "service")
    _acompanha(db, andre, b.cobranca)
    _acompanha(db, ellen, b.servicos)
    _card(db, b.lista_cobranca, "Cobrança 1")

    avisar_cards_novos_de_servico(db, AGORA)

    assert len(avisos(db, andre.id)) == 1
    assert avisos(db, ellen.id) == []


def test_quem_criou_nao_e_avisado(db):
    b = boards_de_servico(db)
    leticia = usuario(db, "Leticia", "service")
    andre = usuario(db, "Andre", "service")
    _acompanha(db, leticia, b.cobranca)
    _acompanha(db, andre, b.cobranca)
    _card(db, b.lista_cobranca, "Manual", criador=leticia)

    avisar_cards_novos_de_servico(db, AGORA)

    assert avisos(db, leticia.id) == []
    assert len(avisos(db, andre.id)) == 1


def test_card_avisado_nao_avisa_de_novo(db):
    b = boards_de_servico(db)
    andre = usuario(db, "Andre", "service")
    _acompanha(db, andre, b.cobranca)
    c = _card(db, b.lista_cobranca, "Cobrança 1")

    avisar_cards_novos_de_servico(db, AGORA)
    avisar_cards_novos_de_servico(db, AGORA)

    assert len(avisos(db, andre.id)) == 1
    db.refresh(c)
    assert c.avisado_em == AGORA


def test_vendedor_e_integracao_nunca_recebem(db, test_salesperson_user):
    b = boards_de_servico(db)
    integ = usuario(db, "GestorHS", "service", is_integracao=True)
    _acompanha(db, test_salesperson_user, b.cobranca)
    _card(db, b.lista_cobranca, "Cobrança 1", criador=integ)

    avisar_cards_novos_de_servico(db, AGORA)

    assert avisos(db, test_salesperson_user.id) == []
    assert avisos(db, integ.id) == []
