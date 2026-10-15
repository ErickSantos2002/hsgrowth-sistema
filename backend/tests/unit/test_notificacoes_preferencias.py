"""
Preferências de notificação valendo de verdade.

Os boards de Serviço acompanhados começam pelo que a pessoa já trabalha: com
os dados de 14/10/2026 isso dá André → Cobrança, Ellen → Serviços, Letícia →
os dois, sem nenhum nome no código.
"""
from datetime import datetime, timedelta

from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.services.user_notification_service import UserNotificationService
from tests.unit.apoio_notificacoes import boards_de_servico, cabecalho, usuario

URL = "/api/v1/users/me/notification-settings"


def _atividade(db, quem, lista, dias_atras=1):
    card = ServiceCard(list_id=lista.id, title=f"Card {quem.name}")
    db.add(card)
    db.commit()
    db.add(ServiceCardActivity(
        service_card_id=card.id, user_id=quem.id, category="atividade",
        activity_type="follow_up", created_at=datetime.utcnow() - timedelta(days=dias_atras),
    ))
    db.commit()


class TestQuadrosPadrao:

    def test_segue_o_board_onde_trabalhou(self, db):
        b = boards_de_servico(db)
        andre = usuario(db, "Andre", "service")
        _atividade(db, andre, b.lista_cobranca)

        assert UserNotificationService(db).get_or_create(andre.id).quadros_servico == [b.cobranca.id]

    def test_trabalhou_nos_dois(self, db):
        b = boards_de_servico(db)
        leticia = usuario(db, "Leticia", "service")
        _atividade(db, leticia, b.lista_cobranca)
        _atividade(db, leticia, b.lista_servicos)

        assert sorted(UserNotificationService(db).get_or_create(leticia.id).quadros_servico) == sorted(
            [b.servicos.id, b.cobranca.id])

    def test_atividade_antiga_nao_conta(self, db):
        b = boards_de_servico(db)
        andre = usuario(db, "Andre", "service")
        _atividade(db, andre, b.lista_cobranca, dias_atras=90)

        # sem histórico recente, Serviço acompanha os dois
        assert len(UserNotificationService(db).get_or_create(andre.id).quadros_servico) == 2

    def test_vendedor_sem_historico_nao_acompanha_nada(self, db, test_salesperson_user):
        boards_de_servico(db)

        assert UserNotificationService(db).get_or_create(test_salesperson_user.id).quadros_servico == []


class TestApi:

    def test_le_os_campos_novos(self, client, salesperson_headers):
        corpo = client.get(URL, headers=salesperson_headers).json()

        for campo in ("task_assigned", "card_product_changed", "reuniao_pronta",
                      "resumo_manha", "reuniao_15min", "popup_navegador", "quadros_servico"):
            assert campo in corpo
        assert "card_moved" not in corpo

    def test_desliga_um_aviso(self, client, salesperson_headers):
        r = client.put(URL, json={"resumo_manha": False}, headers=salesperson_headers)

        assert r.status_code == 200
        assert r.json()["resumo_manha"] is False
        assert client.get(URL, headers=salesperson_headers).json()["resumo_manha"] is False

    def test_obrigatorio_nao_desliga_nem_pela_api(self, client, salesperson_headers):
        for campo in ("lead_site", "card_atribuido"):
            r = client.put(URL, json={campo: False}, headers=salesperson_headers)
            assert r.status_code == 422, campo

    def test_escolhe_os_boards(self, client, db):
        b = boards_de_servico(db)
        ellen = usuario(db, "Ellen", "service")

        r = client.put(URL, json={"quadros_servico": [b.servicos.id]}, headers=cabecalho(ellen))

        assert r.status_code == 200
        assert r.json()["quadros_servico"] == [b.servicos.id]
