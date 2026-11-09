"""Login, troca obrigatória, definir senha (convite/redefinição) e esqueci minha senha."""
import pytest

from app.services import envio_email
from app.services import tokens_de_acesso as tokens
from tests.unit.apoio_parcerias import headers, usuario

AUTH = "/api/v1/auth"


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email",
                        lambda para, assunto, html, texto=None: enviados.append((para, assunto, html)) or True)
    return enviados


def _entrar(client, email, senha="Senha@12345"):
    return client.post(f"{AUTH}/login", json={"email": email, "password": senha})


def test_login_sem_diferenca_de_maiusculas(client, db):
    usuario(db, "salesperson", "ana@hs.com")
    assert _entrar(client, "ANA@hs.com").status_code == 200


def test_senha_definida_por_outro_obriga_trocar(client, db):
    u = usuario(db, "partner", "p@dmap.com")
    u.name = "Parceiro Teste"  # UserResponse exige nome com 3+ caracteres
    u.must_change_password = True
    db.commit()
    h = headers(u)

    r = _entrar(client, "p@dmap.com")
    assert r.json()["user"]["must_change_password"] is True
    assert client.get("/api/v1/users/me", headers=h).json()["must_change_password"] is True
    assert client.get("/api/v1/parcerias/parceiros", headers=h).status_code == 403

    troca = client.post("/api/v1/users/me/change-password", headers=h,
                        json={"current_password": "Senha@12345", "new_password": "Nova@12345"})
    assert troca.status_code == 200
    db.refresh(u)
    assert u.must_change_password is False


def test_definir_senha_pelo_convite(client, db):
    u = usuario(db, "partner", "p@dmap.com")
    t = tokens.criar(db, u, "convite"); db.commit()

    info = client.get(f"{AUTH}/token/{t}").json()
    assert info == {"valido": True, "kind": "convite", "nome": "p", "email": "p@dmap.com"}

    assert client.post(f"{AUTH}/definir-senha", json={"token": t, "nova_senha": "Minha@123"}).status_code == 200
    assert _entrar(client, "p@dmap.com", "Minha@123").status_code == 200
    assert client.post(f"{AUTH}/definir-senha", json={"token": t, "nova_senha": "Outra@123"}).status_code == 400
    assert client.get(f"{AUTH}/token/{t}").json()["valido"] is False


def test_esqueci_minha_senha(client, db, emails):
    usuario(db, "salesperson", "ana@hs.com")

    ok = client.post(f"{AUTH}/forgot-password", json={"email": "ana@hs.com"})
    nada = client.post(f"{AUTH}/forgot-password", json={"email": "ninguem@hs.com"})

    assert ok.json() == nada.json()  # não revela quem tem cadastro
    assert [e[0] for e in emails] == ["ana@hs.com"]
    token = emails[0][2].split("definir-senha?token=")[1].split('"')[0]
    assert client.post(f"{AUTH}/definir-senha", json={"token": token, "nova_senha": "Nova@1234"}).status_code == 200


def test_reset_do_admin_obriga_trocar(client, db, admin_headers):
    u = usuario(db, "salesperson", "ana@hs.com")
    r = client.put(f"/api/v1/admin/users/{u.id}/reset-password?generate_temp=true", headers=admin_headers)
    assert r.status_code == 200
    db.refresh(u)
    assert u.must_change_password is True
