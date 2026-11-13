"""Trava de CNPJ entre vendedores em Vendas e liberação pela gestão com justificativa."""
from datetime import datetime, timedelta

from app.models.activity import Activity
from app.models.card import Card
from app.models.list import List
from app.services.parcerias import regras_cnpj

from tests.unit.apoio_parcerias import CNPJ_B, card_de_vendas, cliente, headers, usuario, vendas

CARDS = "/api/v1/cards"


def _novo(v, client_id, **extra):
    return {"title": "Empresa A", "list_id": v.lead_novo.id, "client_id": client_id, **extra}


def _dono(db):
    return usuario(db, "salesperson", "dono@hs.com")


def test_outro_vendedor_em_negociacao_bloqueia(client, db):
    v = vendas(db)
    dono = _dono(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=dono.id)  # criado agora: protegido
    outro = usuario(db, "salesperson", "outro@hs.com")

    r = client.post(CARDS, headers=headers(outro), json=_novo(v, cliente(db).id))

    assert r.status_code == 409
    d = r.json()["detail"]
    assert d["code"] == "cnpj_bloqueado" and d["pode_liberar"] is False
    assert dono.name in d["message"] and "em negociação" in d["message"] and "Fale com o gerente" in d["message"]


def test_compra_recente_e_perda_recente_bloqueiam(client, db):
    v = vendas(db)
    dono = _dono(db)
    card_de_vendas(db, v.proposta, assigned_to_id=dono.id, is_won=1,
                   closed_at=datetime.utcnow() - timedelta(days=10), criado_ha=60)
    card_de_vendas(db, v.proposta, documento=CNPJ_B, assigned_to_id=dono.id, is_won=-1,
                   closed_at=datetime.utcnow() - timedelta(days=20), criado_ha=60)
    h = headers(usuario(db, "salesperson", "outro@hs.com"))

    compra = client.post(CARDS, headers=h, json=_novo(v, cliente(db).id)).json()["detail"]["message"]
    assert "compra recente" in compra and "libera em" in compra
    assert client.post(CARDS, headers=h, json=_novo(v, cliente(db, CNPJ_B).id)).status_code == 409


def test_prazo_vencido_nao_bloqueia(client, db):
    v = vendas(db)
    card_de_vendas(db, v.proposta, assigned_to_id=_dono(db).id, is_won=1,
                   closed_at=datetime.utcnow() - timedelta(days=31), criado_ha=60)
    outro = usuario(db, "salesperson", "outro@hs.com")

    assert client.post(CARDS, headers=headers(outro), json=_novo(v, cliente(db).id)).status_code == 201


def test_card_do_proprio_vendedor_nao_bloqueia(client, db):
    v = vendas(db)
    dono = _dono(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=dono.id)

    assert client.post(CARDS, headers=headers(dono), json=_novo(v, cliente(db).id)).status_code == 201


def test_sdr_do_card_nao_e_bloqueado(client, db):
    v = vendas(db)
    sdr = usuario(db, "sdr", "sdr@hs.com")
    card_de_vendas(db, v.lead_novo, assigned_to_id=_dono(db).id, sdr_id=sdr.id)

    assert client.post(CARDS, headers=headers(sdr), json=_novo(v, cliente(db).id)).status_code == 201


def test_integracao_passa(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=_dono(db).id)
    integ = usuario(db, "manager", "integ@hs.com")
    integ.is_integracao = True
    db.commit()

    assert client.post(CARDS, headers=headers(integ), json=_novo(v, cliente(db).id)).status_code == 201


def test_trava_desligada_nao_bloqueia(client, db, test_admin_user):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=_dono(db).id)
    regras_cnpj.salvar(db, test_admin_user, {"block_between_sellers": False})
    outro = usuario(db, "salesperson", "outro@hs.com")

    assert client.post(CARDS, headers=headers(outro), json=_novo(v, cliente(db).id)).status_code == 201


def test_gestao_libera_com_justificativa(client, db, admin_headers):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=_dono(db).id)

    sem = client.post(CARDS, headers=admin_headers, json=_novo(v, cliente(db).id))
    assert sem.status_code == 409 and sem.json()["detail"]["pode_liberar"] is True

    com = client.post(CARDS, headers=admin_headers,
                      json=_novo(v, cliente(db).id, cnpj_justificativa="Cliente pediu outro vendedor"))
    assert com.status_code == 201, com.text
    [a] = db.query(Activity).filter(Activity.card_id == com.json()["id"],
                                    Activity.activity_type == "parcerias_cnpj").all()
    assert "Cliente pediu outro vendedor" in a.description


def test_vendedor_com_justificativa_continua_bloqueado(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=_dono(db).id)
    outro = usuario(db, "salesperson", "outro@hs.com")

    r = client.post(CARDS, headers=headers(outro), json=_novo(v, cliente(db).id, cnpj_justificativa="x"))
    assert r.status_code == 409


def test_reabrir_ignora_o_card_perdido(client, db):
    v = vendas(db)
    db.add(List(id=22, board_id=6, name="Lead Novo (resgate)", position=1))
    db.commit()
    sdr = usuario(db, "sdr", "sdr@hs.com")
    perdido = card_de_vendas(db, v.proposta, assigned_to_id=_dono(db).id, is_won=-1,
                             closed_at=datetime.utcnow() - timedelta(days=20), criado_ha=60)

    r = client.post(f"{CARDS}/{perdido.id}/reopen", headers=headers(sdr),
                    json={"title": "Volta", "acquisition_channel_detail": "Base - Resgate"})
    assert r.status_code != 409, r.text


def test_clonar_ignora_o_card_de_origem(client, db, admin_headers):
    v = vendas(db)
    original = card_de_vendas(db, v.lead_novo, assigned_to_id=_dono(db).id)

    assert client.post(f"{CARDS}/{original.id}/clone", headers=admin_headers).status_code != 409


def test_vincular_empresa_de_outro_vendedor_bloqueia(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=_dono(db).id)
    outro = usuario(db, "salesperson", "outro@hs.com")
    meu = Card(title="Sem cliente", list_id=v.lead_novo.id, assigned_to_id=outro.id)
    db.add(meu)
    db.commit()

    r = client.put(f"{CARDS}/{meu.id}", headers=headers(outro), json={"client_id": cliente(db).id})
    assert r.status_code == 409
