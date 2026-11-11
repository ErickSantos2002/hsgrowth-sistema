"""Hunter cadastrado pela H&S (CPF ou CNPJ) e bloqueio/desbloqueio de parceiro."""
import re

import pytest

from app.models.partner import Partner, PartnerTeamMember
from app.models.user import User
from app.schemas.parcerias import cpf_valido
from app.services import envio_email
from tests.unit.apoio_parcerias import CNPJ_A, CNPJ_B, headers, hunter, parceiro, role, usuario

URL = "/api/v1/parcerias"
CPF = "52998224725"  # DV válidos


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email", lambda para, *a, **k: enviados.append(para) or True)
    return enviados


def _hunter(**campos):
    base = {"name": "João Hunter", "cpf": CPF, "email": "joao@hunter.com"}
    base.update(campos)
    return base


def test_cpf_valido():
    assert cpf_valido(CPF) and cpf_valido("529.982.247-25")
    assert not cpf_valido("52998224724") and not cpf_valido("11111111111") and not cpf_valido("123")


def test_gestao_cadastra_hunter_por_convite(client, db, manager_headers, emails):
    role(db, "hunter")
    r = client.post(f"{URL}/hunters", headers=manager_headers, json=_hunter(cpf="529.982.247-25", pix_key="k"))
    assert r.status_code == 201, r.text
    assert r.json()["email_enviado"] is True and emails == ["joao@hunter.com"]
    assert r.json()["status_acesso"] == "convite_pendente"
    p = db.query(Partner).filter(Partner.kind == "hunter").one()
    assert p.cpf == CPF and p.stage == "convidado" and p.pix_key == "k"
    login = db.query(User).filter(User.email == "joao@hunter.com").one()
    assert login.partner_id == p.id and login.role.name == "hunter"
    # empresa (CNPJ)
    r = client.post(f"{URL}/hunters", headers=manager_headers,
                    json={"name": "Hunter Ltda", "cnpj": CNPJ_A, "email": "pj@hunter.com"})
    assert r.status_code == 201, r.text
    assert db.query(Partner).filter(Partner.cnpj == CNPJ_A, Partner.kind == "hunter").count() == 1
    lista = client.get(f"{URL}/hunters", headers=manager_headers).json()
    assert len(lista) == 2 and {"stage", "empresas_indicadas", "status_acesso"} <= set(lista[0])


@pytest.mark.parametrize("extra", [
    {"cpf": None}, {"cnpj": CNPJ_A}, {"cpf": "52998224724"}, {"cpf": "11111111111"}, {"cpf": None, "cnpj": "123"},
])
def test_hunter_com_cpf_e_cnpj_ou_nenhum_422(client, db, manager_headers, emails, extra):
    role(db, "hunter")
    r = client.post(f"{URL}/hunters", headers=manager_headers, json=_hunter(**extra))
    assert r.status_code == 422
    assert db.query(Partner).count() == 0


def test_hunter_repetido_422(client, db, manager_headers, emails):
    role(db, "hunter")
    assert client.post(f"{URL}/hunters", headers=manager_headers, json=_hunter()).status_code == 201
    r = client.post(f"{URL}/hunters", headers=manager_headers, json=_hunter(email="outro@hunter.com"))
    assert r.status_code == 422 and r.json()["detail"] == "Este CPF/CNPJ já está cadastrado como hunter."
    # bloqueado libera o documento
    db.query(Partner).update({"stage": "bloqueado"})
    db.commit()
    assert client.post(f"{URL}/hunters", headers=manager_headers,
                       json=_hunter(email="outro@hunter.com")).status_code == 201


def test_email_recusado_nao_deixa_hunter_orfao(client, db, manager_headers, emails):
    role(db, "hunter")
    usuario(db, "partner", "dup@hunter.com", parceiro(db, "Outra", cnpj=CNPJ_B))
    r = client.post(f"{URL}/hunters", headers=manager_headers, json=_hunter(email="dup@hunter.com"))
    assert r.status_code == 400
    assert db.query(Partner).filter(Partner.kind == "hunter").count() == 0 and emails == []


def test_so_gestao_cadastra_hunter(client, db, emails):
    role(db, "hunter")
    p = parceiro(db, "Dmap")
    _, hl = hunter(db)
    for quem in (usuario(db, "partner", "dono@dmap.com", p), hl):
        assert client.post(f"{URL}/hunters", headers=headers(quem), json=_hunter()).status_code == 403
        assert client.get(f"{URL}/hunters", headers=headers(quem)).status_code == 403
    assert db.query(Partner).filter(Partner.cpf == CPF).count() == 0


def test_copiar_link_do_hunter(client, db, manager_headers, emails):
    role(db, "hunter")
    client.post(f"{URL}/hunters", headers=manager_headers, json=_hunter())
    p = db.query(Partner).filter(Partner.kind == "hunter").one()
    emails.clear()
    r = client.post(f"{URL}/hunters/{p.id}/convite", headers=manager_headers, json={"enviar": False})
    assert r.status_code == 200 and r.json()["link"] and emails == []
    token = re.search(r"token=(.+)$", r.json()["link"]).group(1)
    assert client.get(f"/api/v1/auth/token/{token}").json()["valido"] is True
    r = client.post(f"{URL}/hunters/{p.id}/convite", headers=manager_headers, json={"enviar": True})
    assert r.json()["email_enviado"] is True and emails == ["joao@hunter.com"]
    # empresa não passa por aqui
    emp = parceiro(db, "Dmap")
    assert client.post(f"{URL}/hunters/{emp.id}/convite", headers=manager_headers,
                       json={"enviar": False}).status_code == 404


def test_bloquear_empresa_desativa_dono_e_equipe(client, db, manager_headers):
    p = parceiro(db, "Dmap")
    dono = usuario(db, "partner", "dono@dmap.com", p)
    vend = usuario(db, "partner_member", "v@dmap.com", p)
    r = client.post(f"{URL}/parceiros/{p.id}/bloquear", headers=manager_headers)
    assert r.status_code == 200 and r.json()["stage"] == "bloqueado"
    db.refresh(p); db.refresh(dono); db.refresh(vend)
    assert p.blocked_at and p.blocked_by_id and not dono.is_active and not vend.is_active
    assert client.post(f"{URL}/parceiros/{p.id}/bloquear", headers=manager_headers).status_code == 422
    assert client.post(f"{URL}/parceiros/{p.id}/bloquear", headers=headers(dono)).status_code in (401, 403)


def test_bloqueado_recebe_usuario_inativo(client, db, manager_headers):
    p = parceiro(db, "Dmap")
    dono = usuario(db, "partner", "dono@dmap.com", p)
    h = headers(dono)
    assert client.get(f"{URL}/parceiros", headers=h).status_code == 200
    client.post(f"{URL}/parceiros/{p.id}/bloquear", headers=manager_headers)
    r = client.get(f"{URL}/parceiros", headers=h)
    assert r.status_code == 403 and "inativo" in r.json()["detail"].lower()


def test_desbloquear_reativa_so_membros_ativos(client, db, manager_headers):
    p = parceiro(db, "Dmap")
    dono = usuario(db, "partner", "dono@dmap.com", p)
    ativo = usuario(db, "partner_member", "a@dmap.com", p)
    desligado = usuario(db, "partner_member", "d@dmap.com", p)
    excluido = usuario(db, "partner_member", "x@dmap.com", p)
    db.add_all([PartnerTeamMember(partner_id=p.id, name="A", user_id=ativo.id, is_active=True),
                PartnerTeamMember(partner_id=p.id, name="D", user_id=desligado.id, is_active=False),
                PartnerTeamMember(partner_id=p.id, name="X", user_id=excluido.id, is_active=True)])
    excluido.is_deleted = True
    excluido.is_active = False
    db.commit()
    client.post(f"{URL}/parceiros/{p.id}/bloquear", headers=manager_headers)
    r = client.post(f"{URL}/parceiros/{p.id}/desbloquear", headers=manager_headers)
    assert r.status_code == 200 and r.json()["stage"] == "ativado"
    for u in (dono, ativo, desligado, excluido):
        db.refresh(u)
    assert dono.is_active and ativo.is_active and not desligado.is_active and not excluido.is_active
    db.refresh(p)
    assert p.blocked_at is None and p.blocked_by_id is None
    assert client.post(f"{URL}/parceiros/{p.id}/desbloquear", headers=manager_headers).status_code == 422


def test_desbloquear_sem_termos_volta_convidado_ou_potencial(client, db, manager_headers):
    com_login = parceiro(db, "A", stage="bloqueado", terms_accepted_at=None)
    usuario(db, "partner", "a@a.com", com_login)
    sem_login = parceiro(db, "B", stage="bloqueado", terms_accepted_at=None)
    assert client.post(f"{URL}/parceiros/{com_login.id}/desbloquear", headers=manager_headers).json()["stage"] == "convidado"
    assert client.post(f"{URL}/parceiros/{sem_login.id}/desbloquear", headers=manager_headers).json()["stage"] == "potencial"


def test_bloquear_hunter_nao_afeta_indicadas(client, db, manager_headers):
    h, hl = hunter(db)
    emp = parceiro(db, "Indicada", indicated_by_partner_id=h.id)
    dono = usuario(db, "partner", "dono@ind.com", emp)
    r = client.post(f"{URL}/parceiros/{h.id}/bloquear", headers=manager_headers)
    assert r.status_code == 200 and r.json()["stage"] == "bloqueado"
    db.refresh(hl); db.refresh(emp); db.refresh(dono)
    assert not hl.is_active and dono.is_active and emp.stage == "ativado"


def test_convidado_bloqueado_nao_define_senha(client, db, manager_headers, emails):
    role(db, "hunter")
    client.post(f"{URL}/hunters", headers=manager_headers, json=_hunter())
    p = db.query(Partner).filter(Partner.kind == "hunter").one()
    link = client.post(f"{URL}/hunters/{p.id}/convite", headers=manager_headers, json={"enviar": False}).json()["link"]
    token = re.search(r"token=(.+)$", link).group(1)
    client.post(f"{URL}/parceiros/{p.id}/bloquear", headers=manager_headers)
    assert client.get(f"/api/v1/auth/token/{token}").json()["valido"] is False
