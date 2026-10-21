"""
gclid no card e no "Webhook - Reunião agendada".

Pedido do time de leads em 21/10/2026: o ID do clique do Google Ads chega
junto com os UTMs, aparece no Rastreamento de Origem e vai no webhook.

Na mesma investigação: a automação estava desligada desde 17/08. O contador
de falhas nunca zerava — 5 falhas espalhadas de março a agosto bastaram.
"""
import json
from unittest.mock import MagicMock, patch

from app.models.automation import Automation
from app.models.card import Card
from app.repositories.automation_repository import AutomationRepository
from app.schemas.automation import AutomationUpdate
from app.services.automation_service import AutomationService


def test_card_criado_pela_integracao_guarda_o_gclid(client, db, admin_headers, test_lists):
    r = client.post("/api/v1/cards", headers=admin_headers, json={
        "title": "Lead do Google",
        "list_id": test_lists[0].id,
        "utm_source": "google",
        "gclid": "Cj0KCQjw-abc123",
    })

    assert r.status_code == 201
    assert r.json()["gclid"] == "Cj0KCQjw-abc123"
    assert db.query(Card).get(r.json()["id"]).gclid == "Cj0KCQjw-abc123"


def test_webhook_envia_o_gclid(db, test_lists):
    card = Card(title="Lead do Google", list_id=test_lists[0].id, position=0,
                utm_source="google", gclid="Cj0KCQjw-abc123")
    db.add(card)
    db.commit()

    resposta = MagicMock(status_code=200)
    with patch("httpx.post", return_value=resposta) as post:
        AutomationService(db)._execute_webhook_action(card, {"url": "https://exemplo.test/webhook"})

    enviado = json.loads(post.call_args.kwargs["content"])
    assert enviado["card"]["gclid"] == "Cj0KCQjw-abc123"
    assert enviado["card"]["utm_source"] == "google"


def _automacao(db, test_board, **campos) -> Automation:
    base = dict(board_id=test_board.id, name="Webhook - Reunião agendada",
                automation_type="trigger", trigger_event="card_moved",
                actions=[], is_active=True, failure_count=0, auto_disable_on_failures=5)
    base.update(campos)
    automacao = Automation(**base)
    db.add(automacao)
    db.commit()
    return automacao


def test_execucao_com_sucesso_zera_as_falhas(db, test_board):
    automacao = _automacao(db, test_board, failure_count=4)

    AutomationRepository(db).increment_execution_count(automacao)

    assert automacao.failure_count == 0


def test_falhas_espalhadas_nao_desligam_a_automacao(db, test_board):
    repo = AutomationRepository(db)
    automacao = _automacao(db, test_board)

    for _ in range(5):
        repo.increment_failure_count(automacao)
        repo.increment_execution_count(automacao)

    assert automacao.is_active is True


def test_cinco_falhas_seguidas_ainda_desligam(db, test_board):
    repo = AutomationRepository(db)
    automacao = _automacao(db, test_board)

    for _ in range(5):
        repo.increment_failure_count(automacao)

    assert automacao.is_active is False


def test_reativar_recomeca_a_contagem(db, test_board):
    """Antes, religada com 5 falhas, a primeira falha já desligava de novo."""
    repo = AutomationRepository(db)
    automacao = _automacao(db, test_board, is_active=False, failure_count=5)

    repo.update(automacao, AutomationUpdate(is_active=True))
    repo.increment_failure_count(automacao)

    assert automacao.is_active is True
    assert automacao.failure_count == 1
