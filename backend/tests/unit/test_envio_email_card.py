"""
Envio de e-mail pelo card (Microsoft Graph): destinatários em paralelo, falha parcial
avisada e registrada só com quem recebeu. Sem rede: o httpx.Client é trocado por um falso.
"""
import threading
import time

import pytest

from app.api.v1.endpoints.cards import SendEmailRequest, send_email_from_card
from app.models.card_task import CardTask, TaskType
from app.services import microsoft_graph_service as modulo
from app.services.microsoft_graph_service import microsoft_graph_service


class _Resp:
    def __init__(self, status, corpo=None):
        self.status_code = status
        self._corpo = corpo or {}
        self.content = b"x" if corpo else b""

    def json(self):
        return self._corpo


@pytest.fixture
def graph(monkeypatch):
    """httpx.Client falso: registra cada envio e responde conforme `recusar` (endereço → erro)."""
    estado = {"enviados": [], "recusar": {}, "demora": 0.0, "simultaneos": 0, "pico": 0}
    trava = threading.Lock()

    class ClienteFalso:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def post(self, url, json=None, headers=None):
            addr = json["message"]["toRecipients"][0]["emailAddress"]["address"]
            with trava:
                estado["simultaneos"] += 1
                estado["pico"] = max(estado["pico"], estado["simultaneos"])
            time.sleep(estado["demora"])
            with trava:
                estado["simultaneos"] -= 1
                estado["enviados"].append(addr)
            if addr in estado["recusar"]:
                return _Resp(400, {"error": {"message": estado["recusar"][addr]}})
            return _Resp(202)

    monkeypatch.setattr(modulo.httpx, "Client", ClienteFalso)
    monkeypatch.setattr(microsoft_graph_service, "_get_valid_token", lambda user, db: "token")
    return estado


class TestServico:

    def test_todos_saem(self, db, graph, test_salesperson_user):
        r = microsoft_graph_service.send_email(test_salesperson_user, db, ["a@x.com", " b@x.com "], "Oi", "<p>oi</p>")
        assert r == {"success": True}
        assert sorted(graph["enviados"]) == ["a@x.com", "b@x.com"]

    def test_em_paralelo_ate_4(self, db, graph, test_salesperson_user):
        graph["demora"] = 0.2
        destinos = [f"p{i}@x.com" for i in range(6)]

        inicio = time.monotonic()
        r = microsoft_graph_service.send_email(test_salesperson_user, db, destinos, "Oi", "oi")
        duracao = time.monotonic() - inicio

        assert r == {"success": True}
        assert len(graph["enviados"]) == 6
        assert graph["pico"] == modulo.ENVIOS_SIMULTANEOS  # nunca mais de 4 ao mesmo tempo
        assert duracao < 6 * 0.2  # um por um levaria 1,2 s

    def test_falha_parcial_diz_quem_falhou(self, db, graph, test_salesperson_user):
        graph["recusar"] = {"b@x.com": "Caixa inexistente"}

        r = microsoft_graph_service.send_email(test_salesperson_user, db, ["a@x.com", "b@x.com", "c@x.com"], "Oi", "oi")

        assert r["success"] is True
        assert r["sent"] == 2 and r["failed"] == 1
        assert r["failed_addresses"] == ["b@x.com"]
        assert r["partial_errors"] == "b@x.com: Caixa inexistente"

    def test_todos_falham(self, db, graph, test_salesperson_user):
        graph["recusar"] = {"a@x.com": "Recusado", "b@x.com": "Recusado"}

        r = microsoft_graph_service.send_email(test_salesperson_user, db, ["a@x.com", "b@x.com"], "Oi", "oi")

        assert r == {"success": False, "error": "a@x.com: Recusado; b@x.com: Recusado"}

    def test_excecao_de_rede_vira_erro_do_destinatario(self, db, graph, test_salesperson_user, monkeypatch):
        class Quebra(modulo.httpx.Client):
            def post(self, *a, **k):
                raise TimeoutError("demorou")

        monkeypatch.setattr(modulo.httpx, "Client", Quebra)

        r = microsoft_graph_service.send_email(test_salesperson_user, db, ["a@x.com"], "Oi", "oi")

        assert r == {"success": False, "error": "a@x.com: demorou"}


class TestEndpoint:

    def _enviar(self, db, card, user, para, **extra):
        return send_email_from_card(card.id, SendEmailRequest(to=para, subject="Proposta", body="Olá", **extra), user, db)

    def test_registra_atividade_com_todos(self, db, graph, test_card, test_salesperson_user):
        r = self._enviar(db, test_card, test_salesperson_user, ["a@x.com", "b@x.com"])

        assert r == {"success": True, "message": "E-mail enviado e atividade registrada no card."}
        [t] = db.query(CardTask).filter(CardTask.card_id == test_card.id, CardTask.task_type == TaskType.EMAIL).all()
        assert t.contact_name == "a@x.com, b@x.com" and t.is_completed

    def test_falha_parcial_avisa_e_registra_so_quem_recebeu(self, db, graph, test_card, test_salesperson_user):
        graph["recusar"] = {"b@x.com": "Caixa inexistente"}

        r = self._enviar(db, test_card, test_salesperson_user, ["a@x.com", "b@x.com"])

        assert r["success"] is True
        assert r["partial_errors"] == "b@x.com: Caixa inexistente"
        assert "parte dos destinatários" in r["message"]
        [t] = db.query(CardTask).filter(CardTask.card_id == test_card.id, CardTask.task_type == TaskType.EMAIL).all()
        assert t.contact_name == "a@x.com"

    def test_tudo_falhou_da_502_e_nao_registra(self, db, graph, test_card, test_salesperson_user):
        from fastapi import HTTPException

        graph["recusar"] = {"a@x.com": "Recusado"}

        with pytest.raises(HTTPException) as erro:
            self._enviar(db, test_card, test_salesperson_user, ["a@x.com"])

        assert erro.value.status_code == 502
        assert db.query(CardTask).filter(CardTask.card_id == test_card.id).count() == 0
