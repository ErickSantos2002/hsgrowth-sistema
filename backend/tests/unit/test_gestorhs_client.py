"""Cliente outbound que avisa o GestorHS quando um card vira Ganho."""
import httpx
import pytest

from app.core.config import settings
from app.integrations import gestorhs_client


@pytest.fixture
def ligada(monkeypatch):
    monkeypatch.setattr(settings, "GESTORHS_INBOUND_URL", "https://gestorhs.teste")
    monkeypatch.setattr(settings, "GESTORHS_INBOUND_API_KEY", "chave-secreta")


def test_desligada_e_noop(monkeypatch):
    monkeypatch.setattr(settings, "GESTORHS_INBOUND_URL", "")
    monkeypatch.setattr(settings, "GESTORHS_INBOUND_API_KEY", "")
    assert gestorhs_client.integracao_ativa() is False
    # Não deve levantar nem chamar nada.
    gestorhs_client.mover_caixa_ganho("42", 2, "obs")


def test_monta_url_header_e_body(ligada, monkeypatch):
    capturado = {}

    def fake_post(url, json, headers, timeout):
        capturado["url"] = url
        capturado["json"] = json
        capturado["headers"] = headers
        return httpx.Response(200, json={"movida": True})

    monkeypatch.setattr(httpx, "post", fake_post)
    gestorhs_client.mover_caixa_ganho("42", 123, "Ganho - card #7")

    assert capturado["url"] == "https://gestorhs.teste/integracao/growthhs/caixas/42/ganho"
    assert capturado["headers"]["X-API-Key"] == "chave-secreta"
    assert capturado["json"] == {"observacao": "Ganho - card #7", "numero_proposta": 123}


def test_numero_proposta_ausente_nao_vai_no_body(ligada, monkeypatch):
    capturado = {}
    monkeypatch.setattr(httpx, "post",
                        lambda url, json, headers, timeout: capturado.update(json=json) or httpx.Response(200))
    gestorhs_client.mover_caixa_ganho("42", None, "obs")
    assert "numero_proposta" not in capturado["json"]
    assert capturado["json"] == {"observacao": "obs"}


def test_erro_http_propaga(ligada, monkeypatch):
    monkeypatch.setattr(httpx, "post",
                        lambda url, json, headers, timeout: httpx.Response(500, request=httpx.Request("POST", url)))
    with pytest.raises(httpx.HTTPStatusError):
        gestorhs_client.mover_caixa_ganho("42", 2, "obs")
