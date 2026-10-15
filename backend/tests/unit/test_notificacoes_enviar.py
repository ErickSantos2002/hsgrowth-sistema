"""
As regras de quem recebe, em ordem: própria ação, inativo, obrigatório,
preferência, já enviado.

A primeira é a que mais pesa: em 30 dias, dos "Card atribuído" rastreáveis,
81 eram a pessoa sendo avisada do que ela mesma tinha feito e 4 vinham de
outra pessoa.
"""
import pytest

from app.models.user_notification_setting import UserNotificationSetting
from app.services.notificacoes.enviar import notificar
from tests.unit.apoio_notificacoes import avisos


def _enviar(db, destinatario, tipo="tarefa_para_mim", **kw):
    return notificar(db, destinatario.id, tipo, "Título", "Mensagem", **kw)


def test_avisa_e_grava_o_link_e_o_estilo_do_catalogo(db, test_salesperson_user):
    n = _enviar(db, test_salesperson_user, link="/cards/7", metadata={"card_id": 7})

    assert n is not None
    assert n.notification_type == "tarefa_para_mim"
    assert n.notification_metadata == {"card_id": 7, "url": "/cards/7"}
    assert n.icon == "check-square"


def test_nao_avisa_a_propria_acao(db, test_salesperson_user):
    assert _enviar(db, test_salesperson_user, autor_id=test_salesperson_user.id) is None
    assert avisos(db, test_salesperson_user.id) == []


def test_nao_avisa_nem_obrigatorio_da_propria_acao(db, test_salesperson_user):
    """Obrigatório quer dizer 'não dá para desligar', não 'avisa até de si mesmo'."""
    assert _enviar(db, test_salesperson_user, "card_atribuido",
                   autor_id=test_salesperson_user.id) is None


def test_nao_avisa_inativo(db, test_salesperson_user):
    test_salesperson_user.is_active = False
    db.commit()

    assert _enviar(db, test_salesperson_user) is None


def test_preferencia_desligada_nao_avisa(db, test_salesperson_user):
    db.add(UserNotificationSetting(user_id=test_salesperson_user.id, task_assigned=False))
    db.commit()

    assert _enviar(db, test_salesperson_user) is None


def test_obrigatorio_passa_mesmo_sem_preferencia(db, test_salesperson_user):
    db.add(UserNotificationSetting(user_id=test_salesperson_user.id, task_assigned=False))
    db.commit()

    assert _enviar(db, test_salesperson_user, "lead_site") is not None


def test_sem_linha_de_preferencia_vale_ligado(db, test_salesperson_user):
    assert _enviar(db, test_salesperson_user) is not None


def test_mesma_referencia_nao_repete(db, test_salesperson_user):
    assert _enviar(db, test_salesperson_user, "resumo_manha", referencia="resumo:2026-10-15")
    assert _enviar(db, test_salesperson_user, "resumo_manha", referencia="resumo:2026-10-15") is None
    assert _enviar(db, test_salesperson_user, "resumo_manha", referencia="resumo:2026-10-16")
    assert len(avisos(db, test_salesperson_user.id)) == 2


def test_tipo_fora_do_catalogo_e_erro_de_programacao(db, test_salesperson_user):
    with pytest.raises(ValueError):
        _enviar(db, test_salesperson_user, "card_overdue")


def test_sem_destinatario_nao_faz_nada(db):
    assert notificar(db, None, "tarefa_para_mim", "t", "m") is None
