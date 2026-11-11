"""Revisão final da Parte 1 (Hunter): quem indicou, CNPJ repetido, bloqueio, atividades da indicada e login."""
from datetime import datetime

import pytest

from app.models.partner import Partner, PartnerTeamMember
from app.models.partner_activity import PartnerActivity
from app.models.partner_terms import PartnerTerms
from app.models.user import User
from app.services import envio_email
from app.services.parcerias import atividades
from tests.unit.apoio_parcerias import (CNPJ_A, CNPJ_B, headers, hunter, oportunidade, parceiro, role,
                                        usuario)

URL = "/api/v1/parcerias"
CNPJ_REPETIDO = "Este CNPJ já está no Programa de Parceiros."
DESBLOQUEIE = "Desbloqueie o parceiro antes."


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email", lambda para, *a, **k: enviados.append(para) or True)
    return enviados


# ─── 1. A indicada não sabe quem a indicou ───────────────────────────────────

def test_indicada_nao_ve_quem_a_indicou(client, db, manager_headers):
    h, uh = hunter(db)
    indicada = parceiro(db, "Indicada", indicated_by_partner_id=h.id)
    dono = usuario(db, "partner", "dono@indicada.com", indicada)

    proprio = client.get(f"{URL}/parceiros/{indicada.id}", headers=headers(dono)).json()
    assert proprio["indicated_by_partner_id"] is None and proprio["indicated_by_name"] is None
    lista = client.get(f"{URL}/parceiros", headers=headers(dono)).json()
    assert [(i["indicated_by_partner_id"], i["indicated_by_name"]) for i in lista] == [(None, None)]

    gestao = client.get(f"{URL}/parceiros/{indicada.id}", headers=manager_headers).json()
    assert gestao["indicated_by_partner_id"] == h.id and gestao["indicated_by_name"] == "Hunter"
    # Quem indicou continua vendo que foi ele.
    do_hunter = client.get(f"{URL}/parceiros/{indicada.id}", headers=headers(uh)).json()
    assert do_hunter["indicated_by_partner_id"] == h.id and do_hunter["indicated_by_name"] == "Hunter"


def test_evento_da_indicacao_nao_tem_o_nome_do_indicador(client, db, emails):
    role(db, "partner")
    _, uh = hunter(db, "João Hunter")
    r = client.post(f"{URL}/indicacoes", headers=headers(uh), json={
        "name": "Empresa Indicada", "cnpj": CNPJ_A, "main_contact_name": "Maria",
        "main_contact_email": "maria@indicada.com"})
    assert r.status_code == 201, r.text
    p = db.query(Partner).filter(Partner.cnpj == CNPJ_A).one()
    textos = [a.description for a in db.query(PartnerActivity).filter(PartnerActivity.partner_id == p.id)]
    assert textos == ["Cadastrado por indicação"]
    assert not any("João" in t for t in textos)


# ─── 2. CNPJ repetido no cadastro da H&S e na edição ────────────────────────

def test_hs_cadastra_com_cnpj_repetido_422(client, db, manager_headers):
    parceiro(db, "Ativa", cnpj=CNPJ_A)
    r = client.post(f"{URL}/parceiros", headers=manager_headers, json={"name": "Nova", "cnpj": CNPJ_A})
    assert r.status_code == 422 and r.json()["detail"] == CNPJ_REPETIDO
    assert client.post(f"{URL}/parceiros", headers=manager_headers,
                       json={"name": "Nova", "cnpj": CNPJ_B}).status_code == 201


def test_gestao_edita_para_cnpj_repetido_422_e_o_proprio_200(client, db, manager_headers):
    parceiro(db, "Ativa", cnpj=CNPJ_A)
    p = parceiro(db, "Dmap", cnpj=CNPJ_B)
    r = client.put(f"{URL}/parceiros/{p.id}", headers=manager_headers, json={"cnpj": CNPJ_A})
    assert r.status_code == 422 and r.json()["detail"] == CNPJ_REPETIDO
    r = client.put(f"{URL}/parceiros/{p.id}", headers=manager_headers, json={"cnpj": CNPJ_B, "name": "Dmap 2"})
    assert r.status_code == 200, r.text
    assert r.json()["cnpj"] == CNPJ_B and r.json()["name"] == "Dmap 2"


def test_dono_nao_troca_o_cnpj(client, db):
    p = parceiro(db, "Dmap", cnpj=CNPJ_B)
    dono = usuario(db, "partner", "dono@dmap.com", p)
    r = client.put(f"{URL}/parceiros/{p.id}", headers=headers(dono), json={"cnpj": CNPJ_A, "region": "Sul"})
    assert r.status_code == 200, r.text
    db.refresh(p)
    assert p.cnpj == CNPJ_B and p.region == "Sul"


# ─── 6. Parceiro bloqueado não ganha acesso novo ────────────────────────────

def test_bloqueado_nao_ganha_acesso_nem_convite(client, db, manager_headers, emails):
    role(db, "partner")
    p = parceiro(db, "Dmap", stage="bloqueado")
    login = usuario(db, "partner", "dono@dmap.com", p)
    login.is_active = False
    membro = PartnerTeamMember(partner_id=p.id, name="Vendedor", email="v@dmap.com")
    db.add(membro); db.commit(); db.refresh(membro)
    antes = db.query(User).count()

    respostas = [
        client.post(f"{URL}/parceiros/{p.id}/acessos", headers=manager_headers,
                    json={"name": "Carlos", "email": "carlos@dmap.com", "modo": "convite"}),
        client.post(f"{URL}/parceiros/{p.id}/acessos/{login.id}/convite", headers=manager_headers,
                    json={"enviar": False}),
        client.put(f"{URL}/parceiros/{p.id}/acessos/{login.id}", headers=manager_headers,
                   json={"is_active": True}),
        client.post(f"{URL}/parceiros/{p.id}/equipe/{membro.id}/acesso", headers=manager_headers,
                    json={"modo": "convite"}),
    ]
    for r in respostas:
        assert r.status_code == 422, (r.request.method, r.request.url, r.text)
        assert r.json()["detail"] == DESBLOQUEIE
    db.expire_all()
    assert db.query(User).count() == antes and emails == []
    assert db.query(User).get(login.id).is_active is False
    # Desativar continua valendo.
    assert client.put(f"{URL}/parceiros/{p.id}/acessos/{login.id}", headers=manager_headers,
                      json={"is_active": False}).status_code == 200


def test_bloqueado_nao_reativa_vendedor_nem_convida(client, db, manager_headers, emails):
    p = parceiro(db, "Dmap", stage="bloqueado")
    login = usuario(db, "partner_member", "v@dmap.com", p)
    login.is_active = False
    membro = PartnerTeamMember(partner_id=p.id, name="Vendedor", email="v@dmap.com",
                               user_id=login.id, is_active=False)
    db.add(membro); db.commit(); db.refresh(membro)
    r = client.put(f"{URL}/parceiros/{p.id}/equipe/{membro.id}", headers=manager_headers, json={"is_active": True})
    assert r.status_code == 422 and r.json()["detail"] == DESBLOQUEIE
    r = client.post(f"{URL}/parceiros/{p.id}/equipe/{membro.id}/acesso/convite", headers=manager_headers,
                    json={"enviar": False})
    assert r.status_code == 422 and r.json()["detail"] == DESBLOQUEIE
    db.expire_all()
    assert db.query(User).get(login.id).is_active is False
    # Outros campos do vendedor continuam editáveis.
    assert client.put(f"{URL}/parceiros/{p.id}/equipe/{membro.id}", headers=manager_headers,
                      json={"name": "Outro"}).status_code == 200


# ─── 8. Atividades e arquivos da oportunidade da indicada ficam com ela ─────

def test_indicador_nao_ve_atividades_nem_arquivos_da_indicada(client, db, tmp_path, monkeypatch, manager_headers):
    monkeypatch.setattr(atividades, "UPLOAD_DIR", tmp_path)
    h, uh = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    ua = usuario(db, "partner", "dono@a.com", a)
    op = oportunidade(db, a)
    (tmp_path / "a.pdf").write_bytes(b"%PDF-1.4")
    arquivo = PartnerActivity(opportunity_id=op.id, user_id=ua.id, category="arquivo",
                              activity_type="file_attached", file_name="a.pdf", file_path="a.pdf")
    db.add(arquivo); db.commit(); db.refresh(arquivo)

    assert client.get(f"{URL}/oportunidades/{op.id}", headers=headers(uh)).status_code == 200
    assert client.get(f"{URL}/oportunidades/{op.id}/atividades", headers=headers(uh)).status_code == 404
    assert client.get(f"{URL}/atividades/{arquivo.id}/arquivo", headers=headers(uh)).status_code == 404
    # A própria empresa e a gestão continuam vendo.
    assert client.get(f"{URL}/oportunidades/{op.id}/atividades", headers=headers(ua)).status_code == 200
    assert client.get(f"{URL}/atividades/{arquivo.id}/arquivo", headers=headers(ua)).status_code == 200
    assert client.get(f"{URL}/oportunidades/{op.id}/atividades", headers=manager_headers).status_code == 200


# ─── 10. Login já diz se há termos pendentes ────────────────────────────────

def test_login_traz_termos_pendentes(client, db):
    db.add(PartnerTerms(audience="empresa", version=1, text="Termos", published_at=datetime.utcnow()))
    db.commit()
    p = parceiro(db, "Dmap", stage="convidado", terms_accepted_at=None)
    usuario(db, "partner", "dono@dmap.com", p)
    r = client.post("/api/v1/auth/login", json={"email": "dono@dmap.com", "password": "Senha@12345"})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["termos_pendentes"] is True


def test_login_sem_termos_pendentes(client, db, test_salesperson_user):
    r = client.post("/api/v1/auth/login", json={"email": "sales@test.com", "password": "sales123"})
    assert r.status_code == 200 and r.json()["user"]["termos_pendentes"] is False


def test_historico_da_troca_de_indicador_nao_revela_o_nome(client, db, manager_headers):
    h, _ = hunter(db, "João Hunter")
    h2, _ = hunter(db, "Maria Hunter", "m@hunter.com")
    p = parceiro(db, "Dmap", indicated_by_partner_id=h.id)
    dono = usuario(db, "partner", "dono@dmap.com", p)
    for novo in (h2.id, None):
        r = client.put(f"{URL}/parceiros/{p.id}", headers=manager_headers, json={"indicated_by_partner_id": novo})
        assert r.status_code == 200, r.text
    historico = client.get(f"{URL}/parceiros/{p.id}/atividades", headers=headers(dono))
    assert historico.status_code == 200
    textos = [a["description"] for a in historico.json()]
    assert textos.count("Indicador alterado") == 2
    assert not any("João" in (t or "") or "Maria" in (t or "") for t in textos)
