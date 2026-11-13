"""Token de agente do HS.OS: o Guardi age no HSGrowth como o dono (allowlist e
"via <bot>" em app/core/agente.py; caminho do agente em deps.get_current_user)."""
import re
import time

import pytest

from app.core.agente import (
    ROTAS_AGENTE,
    TokenDeAgenteInvalido,
    agente_atual,
    agente_pode,
    eh_token_de_agente,
    validar_token_de_agente,
)
from app.core.security import create_access_token
from app.models.activity import Activity
from app.models.audit_log import AuditLog
from app.models.service_card_activity import ServiceCardActivity
from tests.conftest import _par_ed25519, emitir_token_agente

MSG_403 = "Ação não permitida para o agente"


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# --- núcleo puro --------------------------------------------------------------

def test_valido_devolve_email_e_bot():
    priv, pem = _par_ed25519()
    assert validar_token_de_agente(emitir_token_agente(priv, "a@hs.com"), pem) == ("a@hs.com", "erick-bot")


def test_pem_com_barra_n_literal():
    # EasyPanel guarda a env numa linha só, com \n literal.
    priv, pem = _par_ed25519()
    assert validar_token_de_agente(emitir_token_agente(priv, "a@hs.com"), pem.replace("\n", "\\n"))[0] == "a@hs.com"


@pytest.mark.parametrize("sobrescreve", [
    {"aud": "gestorhs"},
    {"iss": "outro"},
    {"exp": int(time.time()) - 10},
    {"exp": int(time.time()) + 3600},  # vida longa demais
    {"exp": None},
    {"sub": None},
    {"act": None},
    {"act": {"sub": ""}},
])
def test_invalidos(sobrescreve):
    priv, pem = _par_ed25519()
    with pytest.raises(TokenDeAgenteInvalido):
        validar_token_de_agente(emitir_token_agente(priv, "a@hs.com", **sobrescreve), pem)


def test_chave_errada_e_chave_vazia():
    priv, _ = _par_ed25519()
    _, outra = _par_ed25519()
    tok = emitir_token_agente(priv, "a@hs.com")
    for chave in (outra, ""):
        with pytest.raises(TokenDeAgenteInvalido):
            validar_token_de_agente(tok, chave)


def test_hs256_com_iss_hsos_nao_passa():
    # Confusão de algoritmo: token HMAC com iss hsos.
    import jwt
    _, pem = _par_ed25519()
    tok = jwt.encode({"iss": "hsos", "aud": "hsgrowth", "sub": "a@hs.com", "act": {"sub": "b"},
                      "exp": int(time.time()) + 60}, "segredo", algorithm="HS256")
    assert eh_token_de_agente(tok)
    with pytest.raises(TokenDeAgenteInvalido):
        validar_token_de_agente(tok, pem)


def test_token_de_login_nao_e_de_agente():
    assert not eh_token_de_agente(create_access_token(data={"sub": "1"}))
    assert not eh_token_de_agente("lixo")


def test_agente_pode_casa_o_caminho_real():
    assert agente_pode("GET", "/api/v1/cards")
    assert agente_pode("GET", "/api/v1/cards/")
    assert agente_pode("GET", "/cards/12/expanded")
    assert agente_pode("PUT", "/api/v1/cards/12")
    assert agente_pode("get", "/api/v1/clients/cnpj/12345678000190")
    assert agente_pode("DELETE", "/api/v1/service-boards/1/cards/2/products/3")
    # método, parâmetro não numérico, rota vizinha
    assert not agente_pode("DELETE", "/api/v1/cards/12")
    assert not agente_pode("GET", "/api/v1/cards/12")
    assert not agente_pode("POST", "/api/v1/cards/import")
    assert not agente_pode("GET", "/api/v1/cards/search/global")
    assert not agente_pode("GET", "/api/v1/clients/cnpj/12.345.678-0001-90")
    assert not agente_pode("GET", "/api/v1/cards/12/expanded/x")
    assert not agente_pode("DELETE", "/api/v1/service-boards/1/cards/2")
    assert not agente_pode("POST", "/api/v1/service-boards/1/cards/2/clone")


# --- pela API -----------------------------------------------------------------

def test_entra_como_a_pessoa_com_a_funcao_dela(client, test_salesperson_user, agente):
    resp = client.get("/api/v1/users/me", headers=_h(agente("sales@test.com")))
    assert resp.status_code == 200, resp.text
    assert resp.json()["email"] == "sales@test.com"
    assert resp.json()["role"] == "salesperson"
    # sem trava de integração: é a pessoa
    assert not getattr(test_salesperson_user, "is_integracao", False)


def test_allowlist_inteira_passa_da_autenticacao(client, db, test_admin_user, agente):
    """Cada template da allowlist passa do get_current_user (o resto é 404/422/400)."""
    h = _h(agente("admin@test.com"))
    for metodo, template in sorted(ROTAS_AGENTE):
        caminho = "/api/v1" + re.sub(r"\{[^}]+\}", "1", template)
        try:
            resp = client.request(metodo, caminho, headers=h, json={} if metodo != "GET" else None)
        except Exception:
            # Exceção dentro do endpoint: a autenticação já passou.
            db.rollback()
            continue
        assert resp.status_code != 401, f"{metodo} {caminho} -> 401 {resp.text[:120]}"
        if resp.status_code == 403:
            assert resp.json().get("detail") != MSG_403, f"{metodo} {caminho} fora da allowlist"


@pytest.mark.parametrize("sobrescreve", [
    {"aud": "gestorhs"},
    {"exp": int(time.time()) - 10},
    {"exp": int(time.time()) + 3600},
])
def test_token_ruim_401(client, test_salesperson_user, agente, sobrescreve):
    assert client.get("/api/v1/users/me", headers=_h(agente("sales@test.com", **sobrescreve))).status_code == 401


def test_chave_errada_401(client, test_salesperson_user, agente):
    priv, _ = _par_ed25519()
    assert client.get("/api/v1/users/me", headers=_h(emitir_token_agente(priv, "sales@test.com"))).status_code == 401


def test_sem_chave_configurada_401(client, test_salesperson_user, salesperson_headers, agente, monkeypatch):
    from app.core.config import settings
    tok = agente("sales@test.com")
    monkeypatch.setattr(settings, "HSOS_AGENTE_CHAVE_PUBLICA", "")
    assert client.get("/api/v1/users/me", headers=_h(tok)).status_code == 401
    # e o login de sempre segue funcionando
    assert client.get("/api/v1/users/me", headers=salesperson_headers).status_code == 200


@pytest.mark.parametrize("email", ["ninguem@test.com", "SALES@test.com", " sales@test.com"])
def test_email_inexistente_ou_nao_exato_401(client, test_salesperson_user, agente, email):
    assert client.get("/api/v1/users/me", headers=_h(agente(email))).status_code == 401


@pytest.mark.parametrize("campo,valor", [("is_active", False), ("is_deleted", True)])
def test_usuario_inativo_ou_deletado_401(client, db, test_salesperson_user, agente, campo, valor):
    setattr(test_salesperson_user, campo, valor)
    db.commit()
    resp = client.get("/api/v1/users/me", headers=_h(agente("sales@test.com")))
    assert resp.status_code == 401


@pytest.mark.parametrize("metodo,caminho", [
    ("GET", "/users"),
    ("GET", "/cards/1"),
    ("GET", "/cards/1/attachments"),
    ("GET", "/cards/search/global"),
    ("GET", "/boards/1"),
    ("PUT", "/cards/1/assign"),
    ("DELETE", "/cards/1"),
    ("POST", "/cards/1/reopen-won"),
    ("POST", "/cards/1/send-email"),
    ("POST", "/auth/logout"),
    ("PUT", "/users/me"),
    ("DELETE", "/service-boards/1/cards/1"),
    ("POST", "/service-boards/1/cards/1/clone"),
    ("POST", "/service-boards/1/cards/1/pull-devices"),
    ("POST", "/service-boards"),
    ("GET", "/proposals"),
])
def test_fora_da_allowlist_403(client, test_admin_user, agente, metodo, caminho):
    resp = client.request(metodo, "/api/v1" + caminho, headers=_h(agente("admin@test.com")),
                          json={} if metodo != "GET" else None)
    assert resp.status_code == 403, f"{metodo} {caminho}: {resp.status_code} {resp.text[:120]}"
    assert resp.json()["detail"] == MSG_403


# --- "via <bot>" no histórico -------------------------------------------------

def _ultimo(db, modelo, **filtros):
    return db.query(modelo).filter_by(**filtros).order_by(modelo.id.desc()).first()


def test_historico_do_agente_traz_via_e_o_do_login_normal_nao(
    client, db, test_admin_user, test_card, admin_headers, agente,
):
    corpo = {"title": "Pelo Guardi", "due_date": "2026-12-01T12:00:00"}
    resp = client.put(f"/api/v1/cards/{test_card.id}", json=corpo, headers=_h(agente("admin@test.com")))
    assert resp.status_code == 200, resp.text
    audit = _ultimo(db, AuditLog, entity_type="Card", entity_id=test_card.id, action="UPDATE")
    assert audit.description.endswith("(via erick-bot)")
    atividade = _ultimo(db, Activity, card_id=test_card.id, activity_type="card_due_date_changed")
    assert atividade is not None and atividade.description.endswith("(via erick-bot)")

    corpo = {"title": "Pela tela", "due_date": "2026-12-05T12:00:00"}
    resp = client.put(f"/api/v1/cards/{test_card.id}", json=corpo, headers=admin_headers)
    assert resp.status_code == 200, resp.text
    audit2 = _ultimo(db, AuditLog, entity_type="Card", entity_id=test_card.id, action="UPDATE")
    assert audit2.id != audit.id and "via " not in audit2.description
    atividade2 = _ultimo(db, Activity, card_id=test_card.id, activity_type="card_due_date_changed")
    assert atividade2.id != atividade.id and "via " not in atividade2.description


def test_listener_so_marca_linha_do_dono_do_token(db, test_admin_user, test_salesperson_user):
    marca = agente_atual.set((test_admin_user.id, "erick-bot"))
    try:
        do_dono = ServiceCardActivity(service_card_id=999, user_id=test_admin_user.id,
                                      category="anotacao", description="Ligou")
        vazio = ServiceCardActivity(service_card_id=999, user_id=test_admin_user.id, category="anotacao")
        de_outro = ServiceCardActivity(service_card_id=999, user_id=test_salesperson_user.id,
                                       category="anotacao", description="Outro")
        do_sistema = AuditLog(user_id=None, action="UPDATE", entity_type="Card", entity_id=1,
                              description="Automação")
        db.add_all([do_dono, vazio, de_outro, do_sistema])
        db.commit()
    finally:
        agente_atual.reset(marca)
    assert do_dono.description == "Ligou (via erick-bot)"
    assert vazio.description == "via erick-bot"
    assert de_outro.description == "Outro"
    assert do_sistema.description == "Automação"
