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


from datetime import datetime, timedelta

from app.models.user_access_token import UserAccessToken
from app.services import tokens_de_acesso as tokens
from tests.unit.apoio_parcerias import role, usuario


def test_token_guarda_so_o_hash_e_vale_uma_vez(db):
    u = usuario(db, "salesperson", "v@hs.com")
    t = tokens.criar(db, u, "convite")
    db.commit()

    salvo = db.query(UserAccessToken).one()
    assert salvo.token_hash != t and len(salvo.token_hash) == 64
    assert tokens.buscar_valido(db, t).user_id == u.id
    tokens.usar(db, tokens.buscar_valido(db, t))
    db.commit()
    assert tokens.buscar_valido(db, t) is None


def test_novo_token_invalida_o_anterior_do_mesmo_tipo(db):
    u = usuario(db, "salesperson", "v@hs.com")
    velho = tokens.criar(db, u, "convite"); db.commit()
    novo = tokens.criar(db, u, "convite"); db.commit()
    assert tokens.buscar_valido(db, velho) is None
    assert tokens.buscar_valido(db, novo) is not None


def test_expirado_ou_usuario_inativo_nao_vale(db):
    u = usuario(db, "salesperson", "v@hs.com")
    t = tokens.criar(db, u, "redefinir"); db.commit()
    db.query(UserAccessToken).update({"expires_at": datetime.utcnow() - timedelta(minutes=1)})
    db.commit()
    assert tokens.buscar_valido(db, t) is None

    t2 = tokens.criar(db, u, "redefinir"); u.is_active = False; db.commit()
    assert tokens.buscar_valido(db, t2) is None


def test_status_do_acesso(db):
    u = usuario(db, "partner", "p@dmap.com")
    assert tokens.status_do_acesso(db, u) == "ativo"
    tokens.criar(db, u, "convite"); db.commit()
    assert tokens.status_do_acesso(db, u) == "convite_pendente"
    db.query(UserAccessToken).update({"expires_at": datetime.utcnow() - timedelta(days=1)}); db.commit()
    assert tokens.status_do_acesso(db, u) == "convite_expirado"
    u.last_login_at = datetime.utcnow(); db.commit()
    assert tokens.status_do_acesso(db, u) == "ativo"
    u.is_active = False; db.commit()
    assert tokens.status_do_acesso(db, u) == "desativado"


import pytest
from fastapi import HTTPException

from app.services import criacao_de_login


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email",
                        lambda para, assunto, html, texto=None: enviados.append((para, assunto)) or True)
    return enviados


def test_criar_por_convite_envia_email_e_nao_tem_senha_conhecida(db, emails):
    autor = usuario(db, "admin", "adm@hs.com")
    role(db, "partner")
    r = criacao_de_login.criar_login(db, autor, nome="Ana", email="Ana@Dmap.com", papel="partner", modo="convite")

    assert r.user.email == "ana@dmap.com" and r.email_enviado and r.link is None
    assert emails == [("ana@dmap.com", "Seu acesso ao HSGrowth CRM")]
    assert r.user.must_change_password is False
    assert tokens.status_do_acesso(db, r.user) == "convite_pendente"


def test_criar_com_senha_obriga_trocar(db, emails):
    autor = usuario(db, "admin", "adm@hs.com")
    role(db, "finance")
    r = criacao_de_login.criar_login(db, autor, nome="Bia", email="bia@hs.com", papel="finance",
                                     modo="senha", senha="Senha@123")
    assert r.user.must_change_password is True and emails == []


def test_email_repetido_recusa(db, emails):
    autor = usuario(db, "admin", "adm@hs.com")
    with pytest.raises(HTTPException) as e:
        criacao_de_login.criar_login(db, autor, nome="X", email="ADM@hs.com", papel="finance", modo="convite")
    assert e.value.status_code == 400


def test_copiar_link_nao_envia_email(db, emails):
    autor = usuario(db, "admin", "adm@hs.com")
    role(db, "partner")
    r = criacao_de_login.criar_login(db, autor, nome="Ana", email="ana@dmap.com", papel="partner", modo="convite")
    emails.clear()
    r2 = criacao_de_login.enviar_convite(db, autor, r.user, enviar=False)
    assert r2.link.startswith(settings.FRONTEND_URL.rstrip("/") + "/definir-senha?token=") and emails == []
