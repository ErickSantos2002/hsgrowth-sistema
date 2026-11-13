"""Comissões com os valores reais (spec 2026-11-13): % do hunter, desconto travado, previsão."""
from datetime import datetime
from decimal import Decimal

from app.models.partner_commission import PartnerCommission
from app.models.product import Product

from tests.unit.apoio_parcerias import (
    config_comissoes, headers, hunter, oportunidade, oportunidade_ganha, parceiro, usuario,
)

URL = "/api/v1/parcerias"
OPS = f"{URL}/oportunidades"


def _confirmar(client, op, h):
    r = client.put(f"{OPS}/{op.id}/ganho", json={"acao": "confirmar"}, headers=h)
    assert r.status_code == 200, r.text


def _lancamentos(db, op, **filtros):
    db.expire_all()
    q = db.query(PartnerCommission).filter(PartnerCommission.opportunity_id == op.id)
    for campo, valor in filtros.items():
        q = q.filter(getattr(PartnerCommission, campo) == valor)
    return q.order_by(PartnerCommission.id).all()


def _resumo(lancamentos):
    return sorted((c.beneficiary_partner_id, c.kind, c.amount, c.status) for c in lancamentos)


def _programa(db):
    """Os valores reais do programa: empresa 10%, hunter 5%, rede 1,5%, ativação R$ 1.000,
    renovação 25% de uma anuidade de R$ 2.500."""
    return config_comissoes(db, y=10, yh=5, x=Decimal("1.5"), bonus=1000, z=25, anuidade=2500)


# ─── 1. Configuração ─────────────────────────────────────────────────────────

def test_config_tem_percentual_do_hunter_e_anuidade(client, db, admin_headers):
    corpo = {"own_sale_pct": 10, "hunter_own_sale_pct": 5, "indication_pct": 1.5,
             "first_sale_bonus": 1000, "indication_months": 24, "calibration_pct": 25,
             "annual_fee_reference": 2500}
    r = client.put(f"{URL}/comissoes/config", json=corpo, headers=admin_headers)
    assert r.status_code == 200, r.text
    lido = client.get(f"{URL}/comissoes/config", headers=admin_headers).json()
    assert Decimal(lido["hunter_own_sale_pct"]) == Decimal("5")
    assert Decimal(lido["annual_fee_reference"]) == Decimal("2500")
    # Sem os campos novos (cliente antigo), os valores salvos ficam como estão.
    sem = {k: v for k, v in corpo.items() if k not in ("hunter_own_sale_pct", "annual_fee_reference")}
    assert client.put(f"{URL}/comissoes/config", json=sem, headers=admin_headers).status_code == 200
    lido = client.get(f"{URL}/comissoes/config", headers=admin_headers).json()
    assert Decimal(lido["hunter_own_sale_pct"]) == Decimal("5")
    assert Decimal(lido["annual_fee_reference"]) == Decimal("2500")


# ─── 2. Desconto travado ─────────────────────────────────────────────────────

MSG_DESCONTO = "Desconto permitido: 0%, 2%, 4% ou 6%."
MSG_TRAVADO = "Preço e desconto por item são travados no Programa de Parceiros."


def _phoebus(db, preco=24500):
    p = Product(name="Phoebus", unit_price=preco, partner_enabled=True)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _op_do_parceiro(db):
    p = parceiro(db)
    op = oportunidade(db, p)
    return op, headers(usuario(db, "partner", "a@dmap.com", p))


def test_desconto_geral_so_0_2_4_6_em_percentual(client, db, admin_headers):
    op, h = _op_do_parceiro(db)
    for d in (2, 4, 6, 0):
        r = client.put(f"{OPS}/{op.id}", json={"global_discount": d, "global_discount_type": "percent"}, headers=h)
        assert r.status_code == 200, r.text
    for corpo in ({"global_discount": 3, "global_discount_type": "percent"},
                  {"global_discount": 100, "global_discount_type": "value"},
                  {"global_discount": 8, "global_discount_type": "percent"}):
        for quem in (h, admin_headers):  # a trava vale também para a H&S
            r = client.put(f"{OPS}/{op.id}", json=corpo, headers=quem)
            assert r.status_code == 422 and r.json()["detail"] == MSG_DESCONTO, r.text
    # Mexer em outro campo não esbarra na trava.
    assert client.put(f"{OPS}/{op.id}", json={"shipping": 30}, headers=h).status_code == 200


def test_produto_entra_com_preco_do_catalogo_e_item_travado(client, db):
    op, h = _op_do_parceiro(db)
    prod = _phoebus(db)
    item = client.post(f"{OPS}/{op.id}/produtos", json={"product_id": prod.id, "unit_price": 100},
                       headers=h).json()
    assert item["unit_price"] == 24500
    for corpo in ({"unit_price": 100}, {"discount": 50}):
        r = client.put(f"{OPS}/{op.id}/produtos/{item['id']}", json=corpo, headers=h)
        assert r.status_code == 422 and r.json()["detail"] == MSG_TRAVADO, r.text
    ok = client.put(f"{OPS}/{op.id}/produtos/{item['id']}",
                    json={"quantity": 2, "unit_price": 24500, "discount": 0}, headers=h)
    assert ok.status_code == 200, ok.text
    assert ok.json()["total"] == 49000


# ─── 3. Cálculo ──────────────────────────────────────────────────────────────

def test_empresa_comissao_cai_meio_ponto_por_ponto_sobre_preco_cheio(client, db, admin_headers):
    _programa(db)
    a = parceiro(db, "Dmap")
    esperado = {0: ("10.00", "2450.00"), 2: ("9.00", "2205.00"),
                4: ("8.00", "1960.00"), 6: ("7.00", "1715.00")}
    for d, (taxa, valor) in esperado.items():
        op = oportunidade_ganha(db, a, 24500, modality="venda", shipping=300,
                                global_discount=d, global_discount_type="percent")
        _confirmar(client, op, admin_headers)
        [c] = _lancamentos(db, op, kind="venda_propria")
        assert (c.base_value, c.rate, c.amount) == (Decimal("24500.00"), Decimal(taxa), Decimal(valor)), d


def test_hunter_vendendo_usa_o_percentual_dele_com_desconto(client, db, admin_headers):
    _programa(db)
    h, _ = hunter(db)
    op = oportunidade_ganha(db, h, 24500, global_discount=4, global_discount_type="percent")
    _confirmar(client, op, admin_headers)
    assert _resumo(_lancamentos(db, op)) == [(h.id, "venda_propria", Decimal("735.00"), "pendente")]


def test_rede_e_ativacao_do_hunter_ignoram_o_desconto(client, db, admin_headers):
    _programa(db)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op = oportunidade_ganha(db, a, 24500, global_discount=6, global_discount_type="percent")
    _confirmar(client, op, admin_headers)
    assert _resumo(_lancamentos(db, op)) == sorted([
        (a.id, "venda_propria", Decimal("1715.00"), "pendente"),
        (h.id, "bonus_primeira_venda", Decimal("1000.00"), "pendente"),
        (h.id, "indicacao", Decimal("367.50"), "pendente"),
    ])


def test_dois_aparelhos_dobram_a_base(client, db, admin_headers):
    _programa(db)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 24500, quantidade=2)
    _confirmar(client, op, admin_headers)
    [c] = _lancamentos(db, op, kind="venda_propria")
    assert (c.base_value, c.amount) == (Decimal("49000.00"), Decimal("4900.00"))


# ─── 4. Tabela de desconto ───────────────────────────────────────────────────

def test_tabela_de_desconto_para_parceiro_e_hunter(client, db):
    _programa(db)
    _phoebus(db)
    _, h_user = hunter(db)
    a = parceiro(db, "Dmap")
    for quem in (headers(usuario(db, "partner", "a@dmap.com", a)), headers(h_user)):
        r = client.get(f"{URL}/comissoes/tabela-desconto", headers=quem)
        assert r.status_code == 200, r.text
        t = r.json()
        assert Decimal(t["preco_referencia"]) == Decimal("24500")
        assert Decimal(t["renovacao_prevista"]) == Decimal("625")
        linhas = [(l["desconto"], Decimal(l["cliente_paga"]), Decimal(l["taxa_empresa"]),
                   Decimal(l["valor_empresa"]), Decimal(l["taxa_hunter"]), Decimal(l["valor_hunter"]))
                  for l in t["linhas"]]
        assert linhas == [
            (0, Decimal("24500"), Decimal("10"), Decimal("2450"), Decimal("5"), Decimal("1225")),
            (2, Decimal("24010"), Decimal("9"), Decimal("2205"), Decimal("4"), Decimal("980")),
            (4, Decimal("23520"), Decimal("8"), Decimal("1960"), Decimal("3"), Decimal("735")),
            (6, Decimal("23030"), Decimal("7"), Decimal("1715"), Decimal("2"), Decimal("490")),
        ]


def test_tabela_sem_produto_liberado_nem_anuidade(client, db, admin_headers):
    config_comissoes(db, y=10, yh=5)
    t = client.get(f"{URL}/comissoes/tabela-desconto", headers=admin_headers).json()
    assert t["preco_referencia"] is None and t["renovacao_prevista"] is None
    assert [l["valor_empresa"] for l in t["linhas"]] == [None, None, None, None]


# ─── 5. Previsão das renovações ──────────────────────────────────────────────

def _ganho_em(db, op, quando: datetime):
    db.refresh(op)
    op.won_confirmed_at = quando
    db.commit()


def test_previsao_de_duas_renovacoes_por_aparelho(client, db, admin_headers):
    _programa(db)
    a = parceiro(db, "Dmap")
    a_user = usuario(db, "partner", "a@dmap.com", a)
    op = oportunidade_ganha(db, a, 24500, quantidade=2)
    _confirmar(client, op, admin_headers)
    _ganho_em(db, op, datetime(2026, 11, 13, 15, 0))  # 12h em São Paulo
    r = client.post(f"{OPS}/{op.id}/calibracoes", headers=admin_headers,
                    json={"serial_number": "SN1", "calibration_date": "2026-11-13", "value": "2500"})
    assert r.status_code == 201, r.text

    t = client.get(f"{OPS}/{op.id}/calibracoes", headers=headers(a_user)).json()
    assert [(ap["numero"], ap["serial_number"]) for ap in t["aparelhos"]] == [(1, "SN1"), (2, None)]
    um, dois = t["aparelhos"]
    assert [(rv["ordem"], rv["prevista_para"]) for rv in um["renovacoes"]] == [(1, "2027-11-13"), (2, "2028-11-13")]
    assert all(Decimal(rv["valor_previsto"]) == Decimal("625") for rv in um["renovacoes"] + dois["renovacoes"])
    assert um["renovacoes"][0]["calibracao"]["commission_status"] == "pendente"
    assert Decimal(um["renovacoes"][0]["calibracao"]["commission_amount"]) == Decimal("625")
    assert um["renovacoes"][1]["calibracao"] is None
    assert t["sem_comissao"] == []


def test_previsao_sem_anuidade_mostra_so_a_data(client, db, admin_headers):
    config_comissoes(db, y=10, z=25, anuidade=0)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 24500)
    _confirmar(client, op, admin_headers)
    t = client.get(f"{OPS}/{op.id}/calibracoes", headers=admin_headers).json()
    assert [rv["valor_previsto"] for rv in t["aparelhos"][0]["renovacoes"]] == [None, None]


def test_venda_do_hunter_e_locacao_nao_tem_previsao(client, db, admin_headers):
    _programa(db)
    h, _ = hunter(db)
    a = parceiro(db, "Dmap")
    for op in (oportunidade_ganha(db, h, 24500), oportunidade_ganha(db, a, 24500, modality="locacao")):
        _confirmar(client, op, admin_headers)
        r = client.post(f"{OPS}/{op.id}/calibracoes", headers=admin_headers,
                        json={"serial_number": "X", "calibration_date": "2026-11-13", "value": "2500"})
        assert r.status_code == 201, r.text
        t = client.get(f"{OPS}/{op.id}/calibracoes", headers=admin_headers).json()
        assert t["aparelhos"] == []
        assert [c["serial_number"] for c in t["sem_comissao"]] == ["X"]


def test_nao_lanca_mais_series_que_aparelhos(client, db, admin_headers):
    _programa(db)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 24500, quantidade=2)
    _confirmar(client, op, admin_headers)
    corpo = {"calibration_date": "2026-11-13", "value": "2500"}
    for s in ("SN1", "SN2", "SN1"):
        r = client.post(f"{OPS}/{op.id}/calibracoes", json={**corpo, "serial_number": s}, headers=admin_headers)
        assert r.status_code == 201, r.text
    r = client.post(f"{OPS}/{op.id}/calibracoes", json={**corpo, "serial_number": "SN3"}, headers=admin_headers)
    assert r.status_code == 422
    assert r.json()["detail"] == "Esta oportunidade tem 2 aparelho(s); todos já têm número de série."
