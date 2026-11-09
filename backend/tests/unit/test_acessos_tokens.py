"""Tokens de acesso (convite/redefinir) e envio de e-mail."""
from app.core.config import settings
from app.services import envio_email


def test_sem_provedor_nao_envia_e_nao_quebra(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "")
    assert envio_email.enviar_email("a@b.com", "x", "<p>x</p>") is False


def test_provedor_que_falha_devolve_false(monkeypatch):
    def quebra(*_):
        raise RuntimeError("fora do ar")
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "smtp")
    monkeypatch.setitem(envio_email._PROVEDORES, "smtp", quebra)
    assert envio_email.enviar_email("a@b.com", "x", "<p>x</p>") is False


def test_resend_monta_o_payload(monkeypatch):
    chamadas = []

    class Resp:
        status_code = 200
        text = "ok"

    def falso_post(url, **kw):
        chamadas.append((url, kw))
        return Resp()

    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_chave")
    monkeypatch.setattr(settings, "EMAIL_FROM", "HS <nao-responda@crm.healthsafetytech.com>")
    monkeypatch.setattr(envio_email.httpx, "post", falso_post)

    assert envio_email.enviar_email("a@b.com", "Assunto", "<p>oi</p>", "oi") is True
    url, kw = chamadas[0]
    assert url == "https://api.resend.com/emails"
    assert kw["headers"] == {"Authorization": "Bearer re_chave"}
    assert kw["json"] == {"from": "HS <nao-responda@crm.healthsafetytech.com>", "to": ["a@b.com"],
                          "subject": "Assunto", "html": "<p>oi</p>", "text": "oi"}


def test_resend_sem_chave_devolve_false(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")
    assert envio_email.enviar_email("a@b.com", "x", "<p>x</p>") is False


def test_resend_status_de_erro_devolve_false(monkeypatch):
    class Resp:
        status_code = 422
        text = "domínio não verificado"

    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_chave")
    monkeypatch.setattr(envio_email.httpx, "post", lambda *a, **k: Resp())
    assert envio_email.enviar_email("a@b.com", "x", "<p>x</p>") is False
