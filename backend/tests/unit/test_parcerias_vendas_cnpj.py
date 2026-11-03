"""Lado de Vendas: faixa e bloqueio quando um parceiro está com o CNPJ."""
from datetime import datetime, timedelta

from app.models.activity import Activity
from app.models.card import Card

from tests.unit.apoio_parcerias import (
    CNPJ_B, card_de_vendas, cliente, headers, oportunidade, parceiro, usuario, vendas,
)

CARDS = "/api/v1/cards"


def _parceiro_trabalhando(db):
    p = parceiro(db)
    oportunidade(db, p, last_activity_at=datetime.utcnow() - timedelta(days=1))
    return p


def test_vendedor_nao_cria_card_com_cnpj_do_parceiro(client, db):
    v = vendas(db)
    _parceiro_trabalhando(db)
    vendedor = usuario(db, "salesperson", "v@hs.com")

    r = client.post(CARDS, headers=headers(vendedor),
                    json={"title": "Empresa A", "list_id": v.lead_novo.id, "client_id": cliente(db).id})

    assert r.status_code == 409
    assert "parceiro Dmap" in r.json()["detail"] and "Fale com o gerente" in r.json()["detail"]


def test_cnpj_livre_cria_normal(client, db):
    v = vendas(db)
    _parceiro_trabalhando(db)
    vendedor = usuario(db, "salesperson", "v@hs.com")

    r = client.post(CARDS, headers=headers(vendedor),
                    json={"title": "Empresa B", "list_id": v.lead_novo.id, "client_id": cliente(db, CNPJ_B).id})

    assert r.status_code == 201


def test_admin_passa_e_fica_registrado(client, db, admin_headers):
    v = vendas(db)
    _parceiro_trabalhando(db)

    r = client.post(CARDS, headers=admin_headers,
                    json={"title": "Empresa A", "list_id": v.lead_novo.id, "client_id": cliente(db).id})

    assert r.status_code == 201
    [registro] = db.query(Activity).filter(Activity.card_id == r.json()["id"],
                                           Activity.activity_type == "parcerias_cnpj").all()
    assert "parceiro Dmap" in registro.description


def test_lead_de_integracao_passa(client, db):
    v = vendas(db)
    _parceiro_trabalhando(db)
    integ = usuario(db, "manager", "integ@hs.com")
    integ.is_integracao = True
    db.commit()

    r = client.post(CARDS, headers=headers(integ),
                    json={"title": "Lead do site", "list_id": v.lead_novo.id, "client_id": cliente(db).id})

    assert r.status_code == 201
    assert db.query(Activity).filter(Activity.activity_type == "parcerias_cnpj").count() == 0


def test_vincular_cliente_bloqueia(client, db):
    v = vendas(db)
    vendedor = usuario(db, "salesperson", "v@hs.com")
    card = Card(title="Sem cliente", list_id=v.lead_novo.id, assigned_to_id=vendedor.id)
    db.add(card)
    db.commit()
    _parceiro_trabalhando(db)

    r = client.put(f"{CARDS}/{card.id}", headers=headers(vendedor), json={"client_id": cliente(db).id})

    assert r.status_code == 409


def test_editar_outro_campo_nao_confere(client, db):
    v = vendas(db)
    vendedor = usuario(db, "salesperson", "v@hs.com")
    card = card_de_vendas(db, v.lead_novo, assigned_to_id=vendedor.id)
    _parceiro_trabalhando(db)

    r = client.put(f"{CARDS}/{card.id}", headers=headers(vendedor), json={"title": "Novo título"})

    assert r.status_code == 200


def test_clonar_e_reabrir_bloqueiam(client, db):
    v = vendas(db)
    vendedor = usuario(db, "salesperson", "v@hs.com")
    card = card_de_vendas(db, v.lead_novo, assigned_to_id=vendedor.id)
    perdido = card_de_vendas(db, v.proposta, assigned_to_id=vendedor.id, is_won=-1,
                             closed_at=datetime.utcnow() - timedelta(days=200), criado_ha=300)
    _parceiro_trabalhando(db)
    h = headers(vendedor)

    assert client.post(f"{CARDS}/{card.id}/clone", headers=h).status_code == 409
    assert client.post(f"{CARDS}/{perdido.id}/reopen", headers=h,
                       json={"title": "Volta", "acquisition_channel_detail": "Base - Resgate"}).status_code == 409


def test_faixa_lista_o_parceiro(client, db, admin_headers):
    v = vendas(db)
    card = card_de_vendas(db, v.lead_novo)
    sem_parceiro = card_de_vendas(db, v.lead_novo, documento=CNPJ_B)
    _parceiro_trabalhando(db)

    [aviso] = client.get(f"{CARDS}/{card.id}/aviso-parcerias", headers=admin_headers).json()
    assert aviso["parceiro"] == "Dmap"
    assert client.get(f"{CARDS}/{sem_parceiro.id}/aviso-parcerias", headers=admin_headers).json() == []
