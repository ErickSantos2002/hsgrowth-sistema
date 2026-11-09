"""Revisão final da Entrega 3: nomes curtos, validade do convite, rotas da troca obrigatória e e-mail da H&S."""
import inspect
from datetime import datetime, timedelta

import pytest

from app.models.partner import PartnerTeamMember
from app.models.user import User
from app.models.user_access_token import UserAccessToken
from app.services import envio_email
from tests.unit.apoio_parcerias import headers, parceiro, role, usuario

AUTH = "/api/v1/auth"
PARC = "/api/v1/parcerias/parceiros"


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email", lambda para, *a, **k: enviados.append(para) or True)
    return enviados


# ---------- I1: nome curto não pode derrubar a resposta ----------

def test_vendedor_de_nome_curto_entra_e_ve_o_proprio_perfil(client, db):
    role(db, "partner_member")
    p = parceiro(db)
    membro = PartnerTeamMember(partner_id=p.id, name="Zé", email="ze@dmap.com")
    db.add(membro); db.commit(); db.refresh(membro)
    dono = headers(usuario(db, "partner", "dono@dmap.com", p))
    r = client.post(f"{PARC}/{p.id}/equipe/{membro.id}/acesso", headers=dono,
                    json={"modo": "senha", "password": "Senha@123"})
    assert r.status_code == 201

    login = client.post(f"{AUTH}/login", json={"email": "ze@dmap.com", "password": "Senha@123"})
    assert login.status_code == 200
    h = {"Authorization": f"Bearer {login.json()['access_token']}"}
    me = client.get("/api/v1/users/me", headers=h)
    assert me.status_code == 200 and me.json()["name"] == "Zé"


def test_perfil_proprio_aceita_nome_de_duas_letras(client, db):
    u = usuario(db, "salesperson", "v@hs.com")
    r = client.put("/api/v1/users/me", headers=headers(u), json={"name": "Jo"})
    assert r.status_code == 200 and r.json()["name"] == "Jo"


def test_admin_cria_usuario_de_nome_curto(client, db, admin_headers, emails):
    fin = role(db, "finance")
    r = client.post("/api/v1/users", headers=admin_headers,
                    json={"email": "lu@hs.com", "name": "Lu", "role_id": fin.id, "modo": "convite"})
    assert r.status_code == 201 and r.json()["name"] == "Lu"


# ---------- M1: validade do convite ----------

def test_lista_de_usuarios_traz_a_validade_do_convite(client, db, admin_headers, emails):
    fin = role(db, "finance")
    novo = client.post("/api/v1/users", headers=admin_headers,
                       json={"email": "fin@hs.com", "name": "Fin", "role_id": fin.id, "modo": "convite"}).json()
    assert novo["convite_expira_em"]
    t = db.query(UserAccessToken).filter(UserAccessToken.user_id == novo["id"]).one()
    item = next(u for u in client.get("/api/v1/users", headers=admin_headers).json()["users"] if u["id"] == novo["id"])
    assert item["status_acesso"] == "convite_pendente"
    assert item["convite_expira_em"].startswith(t.expires_at.isoformat()[:16])

    t.expires_at = datetime.utcnow() - timedelta(minutes=1)
    db.commit()
    item = next(u for u in client.get("/api/v1/users", headers=admin_headers).json()["users"] if u["id"] == novo["id"])
    assert item["status_acesso"] == "convite_expirado" and item["convite_expira_em"]


def test_sem_convite_nao_tem_validade(client, db, admin_headers):
    fin = role(db, "finance")
    r = client.post("/api/v1/users", headers=admin_headers, json={
        "email": "fin@hs.com", "name": "Fin", "role_id": fin.id, "modo": "senha", "password": "Senha@123"})
    assert r.json()["convite_expira_em"] is None


def test_acessos_e_equipe_trazem_a_validade_do_convite(client, db, manager_headers, emails):
    role(db, "partner")
    role(db, "partner_member")
    p = parceiro(db)
    r = client.post(f"{PARC}/{p.id}/acessos", headers=manager_headers,
                    json={"name": "Carlos", "email": "carlos@dmap.com", "modo": "convite"})
    assert r.json()["convite_expira_em"]
    assert client.get(f"{PARC}/{p.id}/acessos", headers=manager_headers).json()[0]["convite_expira_em"]

    m = client.post(f"{PARC}/{p.id}/equipe", headers=manager_headers,
                    json={"name": "Vini", "email": "vini@dmap.com"}).json()
    assert m["convite_expira_em"] is None
    conv = client.post(f"{PARC}/{p.id}/equipe/{m['id']}/acesso", headers=manager_headers, json={"modo": "convite"})
    assert conv.json()["convite_expira_em"]
    assert client.get(f"{PARC}/{p.id}/equipe", headers=manager_headers).json()[0]["convite_expira_em"]


# ---------- M2: envio de e-mail fora do event loop ----------

def test_endpoints_que_enviam_email_rodam_no_threadpool():
    from app.api.v1.endpoints import users
    assert not inspect.iscoroutinefunction(users.create_user)
    assert not inspect.iscoroutinefunction(users.convite_usuario)


# ---------- M3: /auth/register também recusa perfil de parceiro ----------

@pytest.mark.parametrize("papel", ["partner", "partner_member"])
def test_register_recusa_perfil_de_parceiro(client, db, admin_headers, papel):
    r = client.post(f"{AUTH}/register", headers=admin_headers, json={
        "email": "x@dmap.com", "name": "Xavier", "password": "Senha@123", "role_id": role(db, papel).id})
    assert r.status_code == 422
    assert "card do parceiro" in r.json()["detail"]
    assert db.query(User).filter(User.email == "x@dmap.com").first() is None


# ---------- M4: troca obrigatória libera só as rotas de auth necessárias ----------

def test_troca_pendente_bloqueia_outras_rotas_de_auth_mas_renova_e_sai(client, db):
    u = usuario(db, "salesperson", "ana@hs.com")
    u.must_change_password = True
    db.commit()
    login = client.post(f"{AUTH}/login", json={"email": "ana@hs.com", "password": "Senha@12345"}).json()
    h = {"Authorization": f"Bearer {login['access_token']}"}

    r = client.get(f"{AUTH}/me/calendar-events?start=2026-11-01&end=2026-11-02", headers=h)
    assert r.status_code == 403 and "Troque a sua senha" in r.text
    assert client.post(f"{AUTH}/refresh", json={"refresh_token": login["refresh_token"]}).status_code == 200
    assert client.get("/api/v1/users/me", headers=h).status_code == 200
    assert client.post(f"{AUTH}/logout", headers=h).status_code == 200


# ---------- M5: login de parceiro não usa e-mail da H&S ----------

def test_acesso_de_dono_recusa_email_da_hs(client, db, manager_headers, emails):
    role(db, "partner")
    p = parceiro(db)
    r = client.post(f"{PARC}/{p.id}/acessos", headers=manager_headers,
                    json={"name": "Carlos", "email": "Carlos@HealthSafetyTech.com", "modo": "convite"})
    assert r.status_code == 422
    assert r.json()["detail"] == "E-mail da Health & Safety não pode ser usado em login de parceiro."
    assert db.query(User).filter(User.email == "carlos@healthsafetytech.com").first() is None
    assert emails == []


def test_vendedor_do_parceiro_recusa_email_da_hs(client, db):
    role(db, "partner_member")
    p = parceiro(db)
    dono = headers(usuario(db, "partner", "dono@dmap.com", p))
    membro = PartnerTeamMember(partner_id=p.id, name="Ana", email="ana@healthsafetytech.com")
    db.add(membro); db.commit(); db.refresh(membro)
    r = client.post(f"{PARC}/{p.id}/equipe/{membro.id}/acesso", headers=dono,
                    json={"modo": "senha", "password": "Senha@123"})
    assert r.status_code == 422
    db.refresh(membro)
    assert membro.user_id is None


def test_perfil_interno_continua_aceitando_email_da_hs(client, db, admin_headers):
    fin = role(db, "finance")
    r = client.post("/api/v1/users", headers=admin_headers, json={
        "email": "fin@healthsafetytech.com", "name": "Fin", "role_id": fin.id,
        "modo": "senha", "password": "Senha@123"})
    assert r.status_code == 201


# ---------- M11: o model não declara índice que a migration não cria ----------

def test_id_do_token_sem_indice_extra():
    assert not UserAccessToken.__table__.c.id.index
