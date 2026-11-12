"""Dashboard de Parcerias: visão da H&S (filtros e rankings)."""
from datetime import datetime, timedelta

from tests.unit.apoio_parcerias import (
    config_comissoes, headers, hunter, oportunidade, oportunidade_ganha, parceiro, usuario,
)

URL = "/api/v1/parcerias"


def _confirmar(client, op, h):
    r = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "confirmar"}, headers=h)
    assert r.status_code == 200, r.text


def _painel(client, h, **params):
    r = client.get(f"{URL}/dashboard", params=params, headers=h)
    assert r.status_code == 200, r.text
    return r.json()


def _venda(client, db, p, valor, h, **campos):
    op = oportunidade_ganha(db, p, valor, modality="venda", **campos)
    _confirmar(client, op, h)
    return op


def test_hs_totais_e_rankings(client, db, admin_headers):
    config_comissoes(db)
    ph, _ = hunter(db)
    a = parceiro(db, "A", indicated_by_partner_id=ph.id)
    b = parceiro(db, "B", indicated_by_partner_id=ph.id)
    c = parceiro(db, "C")
    _venda(client, db, a, 1000, admin_headers)
    _venda(client, db, a, 500, admin_headers)
    _venda(client, db, b, 1500, admin_headers)
    _venda(client, db, c, 200, admin_headers)
    r = _painel(client, admin_headers)
    assert r["visao"] == "hs"
    assert r["vendas"] == {"quantidade": 4, "valor": "3200.00"}
    assert [(x["nome"], x["quantidade"], x["valor"]) for x in r["ranking_empresas"]] == [
        ("A", 2, "1500.00"), ("B", 1, "1500.00"), ("C", 1, "200.00")]  # empate: mais vendas primeiro
    assert r["ranking_hunters"] == [{"partner_id": ph.id, "nome": "Hunter", "empresas": 2,
                                     "quantidade": 3, "valor": "3000.00"}]
    assert set(r["comissoes"]) == {"pendente", "pago", "por_tipo"}
    assert r["paradas"] == []


def test_hunter_so_no_ranking_de_hunters(client, db, admin_headers):
    config_comissoes(db)
    ph, _ = hunter(db)
    a = parceiro(db, "A", indicated_by_partner_id=ph.id)
    _venda(client, db, ph, 100, admin_headers)
    _venda(client, db, a, 400, admin_headers)
    r = _painel(client, admin_headers)
    assert [x["partner_id"] for x in r["ranking_empresas"]] == [a.id]
    assert r["ranking_hunters"][0]["valor"] == "500.00" and r["ranking_hunters"][0]["quantidade"] == 2


def test_filtro_hunter_e_empresa(client, db, admin_headers):
    config_comissoes(db)
    h1, _ = hunter(db, "H1", "h1@x.com")
    h2, _ = hunter(db, "H2", "h2@x.com")
    a = parceiro(db, "A", indicated_by_partner_id=h1.id)
    b = parceiro(db, "B", indicated_by_partner_id=h1.id)
    c = parceiro(db, "C", indicated_by_partner_id=h2.id)
    _venda(client, db, a, 1000, admin_headers)
    _venda(client, db, b, 300, admin_headers)
    _venda(client, db, c, 700, admin_headers)
    _venda(client, db, h1, 50, admin_headers)
    r = _painel(client, admin_headers, hunter_id=h1.id)
    assert r["vendas"] == {"quantidade": 3, "valor": "1350.00"}
    assert {x["partner_id"] for x in r["ranking_empresas"]} == {a.id, b.id}
    assert [x["partner_id"] for x in r["ranking_hunters"]] == [h1.id]
    # comissões só dos beneficiários filtrados (H1 recebe; H2 não entra)
    todas = _painel(client, admin_headers)["comissoes"]
    assert float(r["comissoes"]["pendente"]) < float(todas["pendente"])
    r = _painel(client, admin_headers, hunter_id=h1.id, partner_id=b.id)
    assert r["vendas"] == {"quantidade": 1, "valor": "300.00"}
    assert [x["partner_id"] for x in r["ranking_empresas"]] == [b.id]
    r = _painel(client, admin_headers, hunter_id=h1.id, partner_id=c.id)  # interseção vazia
    assert r["vendas"]["quantidade"] == 0
    assert client.get(f"{URL}/dashboard", params={"hunter_id": a.id}, headers=admin_headers).status_code == 422
    assert client.get(f"{URL}/dashboard", params={"partner_id": 99999}, headers=admin_headers).status_code == 404


def test_periodo_no_fuso_de_sao_paulo(client, db, admin_headers):
    config_comissoes(db)
    a = parceiro(db, "A")
    op = _venda(client, db, a, 1000, admin_headers)
    op.won_confirmed_at = datetime(2026, 11, 11, 2, 30)  # 23:30 de 10/11 em São Paulo
    db.commit()
    r = _painel(client, admin_headers, de="2026-11-10", ate="2026-11-10")
    assert r["vendas"]["quantidade"] == 1
    assert [m["mes"] for m in r["serie"]] == ["2026-11"]
    assert _painel(client, admin_headers, de="2026-11-11", ate="2026-11-11")["vendas"]["quantidade"] == 0
    assert _painel(client, admin_headers, ate="2026-10-31")["vendas"]["quantidade"] == 0


def test_paradas_ordenadas_e_so_ativadas(client, db, admin_headers):
    config_comissoes(db)
    a = parceiro(db, "A")
    b = parceiro(db, "B")
    d = parceiro(db, "D", stage="bloqueado")
    e = parceiro(db, "F", stage="potencial")
    for p, dias in ((a, 40), (b, 90), (d, 100), (e, 120)):
        op = oportunidade(db, p)
        op.created_at = datetime.utcnow() - timedelta(days=dias)
    oportunidade(db, parceiro(db, "E"))  # ativa
    db.commit()
    r = _painel(client, admin_headers)
    assert [x["nome"] for x in r["paradas"]] == ["B", "A"]


def test_finance_ve_painel_hs(client, db):
    fin = usuario(db, "finance", "f@hs.com")
    assert _painel(client, headers(fin))["visao"] == "hs"
    sp = usuario(db, "salesperson", "v@hs.com")
    assert client.get(f"{URL}/dashboard", headers=headers(sp)).status_code == 403
