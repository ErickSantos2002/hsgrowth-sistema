"""Consulta de CNPJ: quem consulta, o que cada perfil vê, limite e histórico."""
from datetime import datetime

from app.models.cnpj_consulta import CnpjConsulta

from tests.unit.apoio_parcerias import (
    CNPJ_A, CNPJ_B, card_de_vendas, headers, parceiro, usuario, vendas,
)

URL = "/api/v1/parcerias/consulta-cnpj"


def test_parceiro_ve_so_a_cor_e_a_frase(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)
    h = headers(usuario(db, "partner", "a@dmap.com", parceiro(db)))

    r = client.post(URL, json={"cnpj": "11.222.333/0001-81"}, headers=h)

    assert r.status_code == 200
    assert r.json()["resultado"] == "vermelho"
    assert r.json()["frase"] == "Esta empresa já está em negociação."
    assert r.json()["registros"] == []


def test_vendedor_e_sdr_veem_onde_esta(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)
    for perfil in ("salesperson", "sdr"):
        h = headers(usuario(db, perfil, f"{perfil}@hs.com"))
        [registro] = client.post(URL, json={"cnpj": CNPJ_A}, headers=h).json()["registros"]
        assert registro["onde"] == "Prospecção · Lead Novo"


def test_cnpj_invalido_responde_422(client, db):
    h = headers(usuario(db, "sdr", "sdr@hs.com"))
    assert client.post(URL, json={"cnpj": "123"}, headers=h).status_code == 422


def test_financeiro_servico_e_visualizador_nao_consultam(client, db):
    for perfil in ("finance", "service", "viewer"):
        h = headers(usuario(db, perfil, f"{perfil}@hs.com"))
        assert client.post(URL, json={"cnpj": CNPJ_A}, headers=h).status_code == 403


def test_limite_de_20_por_dia_para_o_parceiro(client, db):
    p = parceiro(db)
    u = usuario(db, "partner", "a@dmap.com", p)
    h = headers(u)
    for _ in range(20):
        assert client.post(URL, json={"cnpj": CNPJ_A}, headers=h).status_code == 200

    r = client.post(URL, json={"cnpj": CNPJ_B}, headers=h)
    assert r.status_code == 429
    assert client.get(f"{URL}/hoje", headers=h).json() == {"feitas": 20, "limite": 20}
    assert db.query(CnpjConsulta).filter(CnpjConsulta.partner_id == p.id).count() == 20


def test_consulta_de_ontem_nao_conta(client, db):
    p = parceiro(db)
    u = usuario(db, "partner", "a@dmap.com", p)
    db.add_all([CnpjConsulta(user_id=u.id, partner_id=p.id, cnpj=CNPJ_A, resultado="verde", motivo="livre",
                             created_at=datetime(2020, 1, 1)) for _ in range(25)])
    db.commit()

    assert client.post(URL, json={"cnpj": CNPJ_A}, headers=headers(u)).status_code == 200


def test_vendedor_sem_limite(client, db):
    h = headers(usuario(db, "salesperson", "v@hs.com"))
    for _ in range(21):
        assert client.post(URL, json={"cnpj": CNPJ_A}, headers=h).status_code == 200
    assert client.get(f"{URL}/hoje", headers=h).json()["limite"] is None


def test_historico_so_para_gestao_e_com_filtro(client, db, admin_headers):
    p = parceiro(db)
    parceiro_user = usuario(db, "partner", "a@dmap.com", p)
    vendedor = usuario(db, "salesperson", "v@hs.com")
    client.post(URL, json={"cnpj": CNPJ_A}, headers=headers(parceiro_user))
    client.post(URL, json={"cnpj": CNPJ_B}, headers=headers(vendedor))

    assert client.get(f"{URL}/historico", headers=headers(vendedor)).status_code == 403
    tudo = client.get(f"{URL}/historico", headers=admin_headers).json()
    assert tudo["total"] == 2
    so_dmap = client.get(f"{URL}/historico", params={"partner_id": p.id}, headers=admin_headers).json()
    [linha] = so_dmap["itens"]
    assert linha["partner_name"] == "Dmap" and linha["cnpj"] == CNPJ_A and linha["resultado"] == "verde"
    assert linha["perfil"] == "partner"
