"""Acessos ao CRM do dono do parceiro: convite ou senha (Entrega 3)."""
import pytest

from app.services import envio_email
from tests.unit.apoio_parcerias import headers, parceiro, role, usuario

URL = "/api/v1/parcerias/parceiros"


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email", lambda para, *a, **k: enviados.append(para) or True)
    return enviados


def test_gestao_convida_o_dono(client, db, manager_headers, emails):
    role(db, "partner")
    p = parceiro(db)
    r = client.post(f"{URL}/{p.id}/acessos", headers=manager_headers,
                    json={"name": "Carlos", "email": "carlos@dmap.com", "modo": "convite"})
    assert r.status_code == 201
    assert r.json()["status_acesso"] == "convite_pendente" and r.json()["email_enviado"] is True
    assert emails == ["carlos@dmap.com"]


def test_gestao_cria_o_dono_com_senha(client, db, manager_headers):
    role(db, "partner")
    p = parceiro(db)
    r = client.post(f"{URL}/{p.id}/acessos", headers=manager_headers, json={
        "name": "Carlos", "email": "carlos@dmap.com", "modo": "senha", "password": "Senha@123"})
    assert r.status_code == 201 and r.json()["status_acesso"] == "ativo"


def test_reenviar_e_copiar_link(client, db, manager_headers, emails):
    role(db, "partner")
    p = parceiro(db)
    novo = client.post(f"{URL}/{p.id}/acessos", headers=manager_headers,
                       json={"name": "Carlos", "email": "carlos@dmap.com"}).json()
    link = client.post(f"{URL}/{p.id}/acessos/{novo['id']}/convite", headers=manager_headers,
                       json={"enviar": False}).json()["link"]
    assert "/definir-senha?token=" in link


def test_convite_so_para_dono_do_parceiro(client, db, manager_headers, emails):
    role(db, "partner")
    p = parceiro(db)
    membro = usuario(db, "partner_member", "vend@dmap.com", p)
    r = client.post(f"{URL}/{p.id}/acessos/{membro.id}/convite", headers=manager_headers,
                    json={"enviar": False})
    assert r.status_code == 404


def test_email_repetido_nao_registra_evento(client, db, manager_headers, emails):
    from app.models.partner_activity import PartnerActivity
    role(db, "partner")
    p = parceiro(db)
    usuario(db, "partner", "carlos@dmap.com", p)
    r = client.post(f"{URL}/{p.id}/acessos", headers=manager_headers,
                    json={"name": "Carlos", "email": "carlos@dmap.com"})
    assert r.status_code == 400
    assert db.query(PartnerActivity).filter(PartnerActivity.partner_id == p.id).count() == 0


def test_parceiro_nao_cria_acesso_de_dono(client, db):
    role(db, "partner")
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))
    assert client.post(f"{URL}/{p.id}/acessos", headers=h,
                       json={"name": "X", "email": "x@dmap.com"}).status_code == 403


def test_lista_de_acessos_mostra_so_os_donos(client, db, manager_headers):
    role(db, "partner")
    p = parceiro(db)
    usuario(db, "partner", "dono@dmap.com", p)
    usuario(db, "partner_member", "vend@dmap.com", p)
    emails_lista = [a["email"] for a in client.get(f"{URL}/{p.id}/acessos", headers=manager_headers).json()]
    assert emails_lista == ["dono@dmap.com"]
