"""Indicar empresa (hunter e empresa) com convite automático, CNPJ repetido e dados de pagamento."""
from datetime import datetime

import pytest

from app.models.partner import Partner
from app.models.partner_activity import PartnerActivity
from app.models.user import User
from app.services import envio_email
from tests.unit.apoio_parcerias import (CNPJ_A, CNPJ_B, headers, hunter, parceiro, role,
                                        usuario)

URL = "/api/v1/parcerias"


@pytest.fixture
def emails(monkeypatch):
    enviados = []
    monkeypatch.setattr(envio_email, "enviar_email", lambda para, *a, **k: enviados.append(para) or True)
    return enviados


def _dados(**campos):
    base = {"name": "Empresa Indicada", "cnpj": CNPJ_A, "main_contact_name": "Maria",
            "main_contact_email": "maria@indicada.com"}
    base.update(campos)
    return base


def test_hunter_indica_empresa_e_convite_sai(client, db, emails):
    role(db, "partner")
    h, login = hunter(db)
    r = client.post(f"{URL}/indicacoes", headers=headers(login), json=_dados())
    assert r.status_code == 201, r.text
    corpo = r.json()
    assert corpo["email_enviado"] is True and emails == ["maria@indicada.com"]
    assert corpo["parceiro"]["stage"] == "convidado"
    assert corpo["parceiro"]["indicated_by_partner_id"] == h.id
    assert corpo["parceiro"]["indicated_by_name"] == "Hunter"
    p = db.query(Partner).filter(Partner.cnpj == CNPJ_A).one()
    assert p.kind == "empresa" and p.created_by_id == login.id
    dono = db.query(User).filter(User.email == "maria@indicada.com").one()
    assert dono.partner_id == p.id and dono.role.name == "partner"
    evento = db.query(PartnerActivity).filter(PartnerActivity.partner_id == p.id).one()
    assert evento.description == "Indicado por Hunter"
    lista = client.get(f"{URL}/indicacoes", headers=headers(login)).json()
    assert [i["id"] for i in lista] == [p.id]
    assert {"stage", "activated_at", "terms_accepted_at"} <= set(lista[0])


def test_empresa_indica_unidade(client, db, emails):
    role(db, "partner")
    dona = parceiro(db, "Dmap")
    login = usuario(db, "partner", "dono@dmap.com", dona)
    r = client.post(f"{URL}/indicacoes", headers=headers(login), json=_dados())
    assert r.status_code == 201, r.text
    assert r.json()["parceiro"]["indicated_by_partner_id"] == dona.id
    assert r.json()["parceiro"]["stage"] == "convidado"


def test_cnpj_repetido_e_recusado(client, db, emails):
    role(db, "partner")
    _, login = hunter(db)
    parceiro(db, "Ativa", cnpj=CNPJ_A)
    r = client.post(f"{URL}/indicacoes", headers=headers(login), json=_dados())
    assert r.status_code == 422 and r.json()["detail"] == "Este CNPJ já está no Programa de Parceiros."
    # CNPJ de parceiro bloqueado pode voltar
    parceiro(db, "Bloqueada", cnpj=CNPJ_B, stage="bloqueado")
    r = client.post(f"{URL}/indicacoes", headers=headers(login),
                    json=_dados(cnpj=CNPJ_B, main_contact_email="outra@indicada.com"))
    assert r.status_code == 201, r.text


def test_cnpj_de_hunter_nao_conta_como_empresa(client, db, emails):
    role(db, "partner")
    _, login = hunter(db)
    parceiro(db, "Outro Hunter", kind="hunter", cnpj=CNPJ_A)
    assert client.post(f"{URL}/indicacoes", headers=headers(login), json=_dados()).status_code == 201


def test_vendedor_do_parceiro_nao_indica(client, db, emails):
    role(db, "partner")
    p = parceiro(db)
    vend = usuario(db, "partner_member", "vend@dmap.com", p)
    r = client.post(f"{URL}/indicacoes", headers=headers(vend), json=_dados())
    assert r.status_code == 403


def test_gestao_nao_indica_nem_lista(client, db, manager_headers, emails):
    role(db, "partner")
    assert client.post(f"{URL}/indicacoes", headers=manager_headers, json=_dados()).status_code == 403
    assert client.get(f"{URL}/indicacoes", headers=manager_headers).status_code == 403


@pytest.mark.parametrize("email", ["dup@indicada.com", "alguem@healthsafetytech.com"])
def test_email_recusado_nao_deixa_parceiro_orfao(client, db, emails, monkeypatch, email):
    from app.core.config import settings
    monkeypatch.setattr(settings, "DAILY_INTERNAL_EMAIL_DOMAIN", "healthsafetytech.com")
    role(db, "partner")
    _, login = hunter(db)
    usuario(db, "partner", "dup@indicada.com", parceiro(db, "Outra", cnpj=CNPJ_B))
    r = client.post(f"{URL}/indicacoes", headers=headers(login), json=_dados(main_contact_email=email))
    assert r.status_code in (400, 422)
    assert db.query(Partner).filter(Partner.cnpj == CNPJ_A).count() == 0
    assert emails == []


def test_gestao_cadastra_com_hunter_indicador(client, db, manager_headers):
    h, _ = hunter(db)
    r = client.post(f"{URL}/parceiros", headers=manager_headers,
                    json={"name": "Nova", "indicated_by_partner_id": h.id, "pix_key": "a@b.com"})
    assert r.status_code == 201, r.text
    assert r.json()["indicated_by_partner_id"] == h.id and r.json()["pix_key"] == "a@b.com"
    assert r.json()["indicated_by_name"] == "Hunter" and r.json()["kind"] == "empresa"


def test_gestao_cadastra_com_indicador_que_nao_e_hunter_422(client, db, manager_headers):
    outra = parceiro(db, "Empresa")
    r = client.post(f"{URL}/parceiros", headers=manager_headers,
                    json={"name": "Nova", "indicated_by_partner_id": outra.id})
    assert r.status_code == 422


def test_criar_acesso_muda_potencial_para_convidado(client, db, manager_headers, emails):
    role(db, "partner")
    p = parceiro(db, stage="potencial")
    r = client.post(f"{URL}/parceiros/{p.id}/acessos", headers=manager_headers,
                    json={"name": "Carlos", "email": "carlos@dmap.com", "modo": "convite"})
    assert r.status_code == 201
    db.refresh(p)
    assert p.stage == "convidado"


def test_empresa_so_ve_dados_de_pagamento_do_proprio_card(client, db):
    h, hl = hunter(db)
    dona = parceiro(db, "Dmap", pix_key="dono-pix", cpf="12345678909")
    login = usuario(db, "partner", "dono@dmap.com", dona)
    indicada = parceiro(db, "Indicada", indicated_by_partner_id=dona.id, pix_key="x-pix",
                        loss_reason="Preço", loss_detail="caro", stage="bloqueado")
    do_proprio = client.get(f"{URL}/parceiros/{dona.id}", headers=headers(login)).json()
    assert do_proprio["pix_key"] == "dono-pix" and do_proprio["cpf"] == "12345678909"
    vista = client.get(f"{URL}/parceiros/{indicada.id}", headers=headers(login)).json()
    assert vista["pix_key"] is None and vista["cpf"] is None
    assert vista["loss_reason"] is None and vista["loss_detail"] is None
    assert vista["contract_file_name"] is None and vista["pending_count"] == 0
    na_lista = {i["id"]: i for i in client.get(f"{URL}/parceiros", headers=headers(login)).json()}
    assert na_lista[indicada.id]["pix_key"] is None and na_lista[indicada.id]["loss_reason"] is None
    assert na_lista[dona.id]["pix_key"] == "dono-pix"


def test_gestao_ve_pix_e_cpf(client, db, manager_headers):
    p = parceiro(db, "Dmap", pix_key="k", cpf="12345678909")
    r = client.get(f"{URL}/parceiros/{p.id}", headers=manager_headers).json()
    assert r["pix_key"] == "k" and r["cpf"] == "12345678909"
