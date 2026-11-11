"""Tela de Usuários: criar por convite ou senha e reenviar convite."""
import pytest

from app.services import envio_email
from tests.unit.apoio_parcerias import role

URL = "/api/v1/users"


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email", lambda para, *a, **k: enviados.append(para) or True)
    return enviados


def test_admin_convida_o_financeiro(client, db, admin_headers, emails):
    fin = role(db, "finance")
    r = client.post(URL, headers=admin_headers,
                    json={"email": "fin@hs.com", "name": "Fin", "role_id": fin.id, "modo": "convite"})
    assert r.status_code == 201
    assert r.json()["status_acesso"] == "convite_pendente" and r.json()["email_enviado"] is True
    assert emails == ["fin@hs.com"]


def test_admin_cria_com_senha_e_obriga_trocar(client, db, admin_headers):
    fin = role(db, "finance")
    r = client.post(URL, headers=admin_headers, json={
        "email": "fin@hs.com", "name": "Fin", "role_id": fin.id, "modo": "senha", "password": "Senha@123"})
    assert r.status_code == 201 and r.json()["must_change_password"] is True


def test_copiar_link_do_convite(client, db, admin_headers, emails):
    fin = role(db, "finance")
    novo = client.post(URL, headers=admin_headers,
                       json={"email": "fin@hs.com", "name": "Fin", "role_id": fin.id, "modo": "convite"}).json()
    r = client.post(f"{URL}/{novo['id']}/convite", headers=admin_headers, json={"enviar": False})
    assert "/definir-senha?token=" in r.json()["link"]


def test_lista_traz_status_do_acesso(client, db, admin_headers, emails):
    fin = role(db, "finance")
    client.post(URL, headers=admin_headers,
                json={"email": "fin@hs.com", "name": "Fin", "role_id": fin.id, "modo": "convite"})
    itens = client.get(URL, headers=admin_headers).json()["users"]
    assert any(u["email"] == "fin@hs.com" and u["status_acesso"] == "convite_pendente" for u in itens)


@pytest.mark.parametrize("papel", ["partner", "partner_member", "hunter"])
def test_login_de_parceiro_nao_nasce_na_tela_de_usuarios(client, db, admin_headers, papel):
    r = client.post(URL, headers=admin_headers, json={
        "email": "x@dmap.com", "name": "X", "role_id": role(db, papel).id, "modo": "senha", "password": "Senha@123"})
    assert r.status_code == 422
    r2 = client.post("/api/v1/admin/users", headers=admin_headers, json={
        "email": "y@dmap.com", "name": "Yuri", "role_id": role(db, papel).id, "password": "Senha@123"})
    assert r2.status_code == 422
    r3 = client.post("/api/v1/auth/register", headers=admin_headers, json={
        "email": "z@dmap.com", "name": "Zeca", "role_id": role(db, papel).id, "password": "Senha@123"})
    assert r3.status_code == 422
    # Nem virar parceiro/hunter pela edição de um login existente.
    fin = client.post(URL, headers=admin_headers, json={
        "email": "fin@hs.com", "name": "Fin", "role_id": role(db, "finance").id, "modo": "senha",
        "password": "Senha@123"}).json()
    r4 = client.put(f"{URL}/{fin['id']}", headers=admin_headers, json={"role_id": role(db, papel).id})
    assert r4.status_code == 422
    for resposta in (r, r2, r3, r4):
        assert "card do parceiro" in resposta.json()["detail"]


def test_username_repetido_da_400(client, db, admin_headers, emails):
    fin = role(db, "finance")
    base = {"name": "Fin", "role_id": fin.id, "modo": "convite", "username": "fin_user"}
    assert client.post(URL, headers=admin_headers, json={**base, "email": "a@hs.com"}).status_code == 201
    r = client.post(URL, headers=admin_headers, json={**base, "email": "b@hs.com"})
    assert r.status_code == 400 and "Nome de usuário" in r.json()["detail"]
