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
        return httpx.Response(200, json={"movida": True}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)
    gestorhs_client.mover_caixa_ganho("42", 123, "Ganho - card #7")

    assert capturado["url"] == "https://gestorhs.teste/integracao/growthhs/caixas/42/ganho"
    assert capturado["headers"]["X-API-Key"] == "chave-secreta"
    assert capturado["json"] == {"observacao": "Ganho - card #7", "numero_proposta": 123}


def test_numero_proposta_ausente_nao_vai_no_body(ligada, monkeypatch):
    capturado = {}
    monkeypatch.setattr(httpx, "post",
                        lambda url, json, headers, timeout: capturado.update(json=json) or httpx.Response(200, request=httpx.Request("POST", url)))
    gestorhs_client.mover_caixa_ganho("42", None, "obs")
    assert "numero_proposta" not in capturado["json"]
    assert capturado["json"] == {"observacao": "obs"}


def test_erro_http_propaga(ligada, monkeypatch):
    monkeypatch.setattr(httpx, "post",
                        lambda url, json, headers, timeout: httpx.Response(500, request=httpx.Request("POST", url)))
    with pytest.raises(httpx.HTTPStatusError):
        gestorhs_client.mover_caixa_ganho("42", 2, "obs")


# ---------------------------------------------------------------- trocar_proposta

URL_PROPOSTA = "https://gestorhs.teste/integracao/growthhs/caixas/42/proposta"


def _put_resp(status, **kw):
    return lambda url, json, headers, timeout: httpx.Response(
        status, request=httpx.Request("PUT", url), **kw
    )


def test_trocar_proposta_desligada_e_noop(monkeypatch):
    monkeypatch.setattr(settings, "GESTORHS_INBOUND_URL", "")
    monkeypatch.setattr(settings, "GESTORHS_INBOUND_API_KEY", "")

    def nao_deve_chamar(*a, **k):
        raise AssertionError("httpx.put não deveria ser chamado")

    monkeypatch.setattr(httpx, "put", nao_deve_chamar)
    assert gestorhs_client.trocar_proposta("42", 476, "obs") is False


def test_trocar_proposta_monta_url_header_e_body(ligada, monkeypatch):
    capturado = {}

    def fake_put(url, json, headers, timeout):
        capturado.update(url=url, json=json, headers=headers, timeout=timeout)
        return httpx.Response(200, json={"ok": True}, request=httpx.Request("PUT", url))

    monkeypatch.setattr(httpx, "put", fake_put)
    assert gestorhs_client.trocar_proposta("42", 476, "card #7 · por Ana") is True

    assert capturado["url"] == URL_PROPOSTA
    assert capturado["headers"]["X-API-Key"] == "chave-secreta"
    assert capturado["json"] == {"numero": 476, "observacao": "card #7 · por Ana"}
    assert capturado["timeout"] == 10


def test_trocar_proposta_422_vira_recusou_com_detail(ligada, monkeypatch):
    texto = "proposta 474 e' do cliente 9..."
    monkeypatch.setattr(httpx, "put", _put_resp(422, json={"detail": texto}))
    with pytest.raises(gestorhs_client.GestorHSRecusou) as exc:
        gestorhs_client.trocar_proposta("42", 474, "obs")
    assert exc.value.detail == texto


@pytest.mark.parametrize("status", [404, 409])
def test_trocar_proposta_404_e_409_viram_recusou(ligada, monkeypatch, status):
    monkeypatch.setattr(httpx, "put", _put_resp(status, json={"detail": "recusado"}))
    with pytest.raises(gestorhs_client.GestorHSRecusou):
        gestorhs_client.trocar_proposta("42", 476, "obs")


def test_trocar_proposta_4xx_sem_json_tem_detail_generico(ligada, monkeypatch):
    monkeypatch.setattr(httpx, "put", _put_resp(422, text="erro qualquer"))
    with pytest.raises(gestorhs_client.GestorHSRecusou) as exc:
        gestorhs_client.trocar_proposta("42", 476, "obs")
    assert exc.value.detail == "O GestorHS recusou o número da proposta (HTTP 422)."


def test_trocar_proposta_5xx_vira_indisponivel(ligada, monkeypatch):
    monkeypatch.setattr(httpx, "put", _put_resp(500))
    with pytest.raises(gestorhs_client.GestorHSIndisponivel):
        gestorhs_client.trocar_proposta("42", 476, "obs")


def test_trocar_proposta_timeout_vira_indisponivel(ligada, monkeypatch):
    def fake_put(url, json, headers, timeout):
        raise httpx.TimeoutException("x")

    monkeypatch.setattr(httpx, "put", fake_put)
    with pytest.raises(gestorhs_client.GestorHSIndisponivel):
        gestorhs_client.trocar_proposta("42", 476, "obs")


def test_trocar_proposta_erro_de_rede_vira_indisponivel(ligada, monkeypatch):
    def fake_put(url, json, headers, timeout):
        raise httpx.ConnectError("x")

    monkeypatch.setattr(httpx, "put", fake_put)
    with pytest.raises(gestorhs_client.GestorHSIndisponivel):
        gestorhs_client.trocar_proposta("42", 476, "obs")
