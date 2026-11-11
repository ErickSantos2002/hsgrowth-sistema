"""Comissões de Parcerias: configuração, consulta, A pagar, pagamento e calibração."""
from decimal import Decimal

from app.models.partner_commission import PartnerCommission

from tests.unit.apoio_parcerias import (
    config_comissoes, headers, hunter, oportunidade_ganha, parceiro, usuario,
)

URL = "/api/v1/parcerias"
MSG_PAGAR = "Só o Financeiro, admin ou gerente marcam pagamento."


def _confirmar(client, op, h):
    r = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "confirmar"}, headers=h)
    assert r.status_code == 200, r.text


def _cenario(client, db, admin_headers):
    """Hunter H indicou a empresa A (vendeu 1000) e H vendeu 500 sozinho."""
    config_comissoes(db, y=10, x=5, bonus=100, z=8)
    h, h_user = hunter(db, "Hunter", "h@hunter.com")
    h.cpf, h.pix_key = "12345678909", "pix-h"
    a = parceiro(db, "Dmap", indicated_by_partner_id=h.id, cnpj="11222333000181", pix_key="pix-a")
    a_user = usuario(db, "partner", "a@dmap.com", partner=a)
    op_a = oportunidade_ganha(db, a, 1000, modality="venda")
    op_h = oportunidade_ganha(db, h, 500, modality="venda")
    _confirmar(client, op_a, admin_headers)
    _confirmar(client, op_h, admin_headers)
    db.commit()
    return h, h_user, a, a_user, op_a, op_h


def test_escopo_por_perfil(client, db, admin_headers):
    h, h_user, a, a_user, _, _ = _cenario(client, db, admin_headers)
    fin = usuario(db, "finance", "fin@hs.com")
    todos = client.get(f"{URL}/comissoes", headers=headers(fin)).json()
    assert {c["beneficiary_partner_id"] for c in todos} == {h.id, a.id}
    assert len(todos) == 4  # A: própria; H: indicação+bônus (de A) + própria

    da_empresa = client.get(f"{URL}/comissoes", headers=headers(a_user)).json()
    assert {c["beneficiary_partner_id"] for c in da_empresa} == {a.id}
    # Ignora o parâmetro para ver o de outro
    forcado = client.get(f"{URL}/comissoes?beneficiario={h.id}", headers=headers(a_user)).json()
    assert {c["beneficiary_partner_id"] for c in forcado} == {a.id}

    do_hunter = client.get(f"{URL}/comissoes", headers=headers(h_user)).json()
    assert {c["beneficiary_partner_id"] for c in do_hunter} == {h.id} and len(do_hunter) == 3
    item = do_hunter[0]
    assert item["beneficiary_name"] == "Hunter" and item["opportunity_title"]

    membro = usuario(db, "partner_member", "m@dmap.com", partner=a)
    for rota in ("/comissoes", "/comissoes/resumo"):
        assert client.get(f"{URL}{rota}", headers=headers(membro)).status_code == 403


def test_resumo_respeita_escopo(client, db, admin_headers):
    h, h_user, a, a_user, _, _ = _cenario(client, db, admin_headers)
    r = client.get(f"{URL}/comissoes/resumo", headers=headers(a_user)).json()
    assert Decimal(r["pendente"]) == Decimal("100.00") and Decimal(r["pago"]) == 0
    r = client.get(f"{URL}/comissoes/resumo", headers=admin_headers).json()
    assert Decimal(r["pendente"]) == Decimal("300.00")


def test_filtro_de_ate_inclusivo(client, db, admin_headers):
    _cenario(client, db, admin_headers)
    from datetime import date, timedelta
    d = date.today()
    assert len(client.get(f"{URL}/comissoes?de={d}&ate={d}", headers=admin_headers).json()) == 4
    assert client.get(f"{URL}/comissoes?de={d + timedelta(days=1)}", headers=admin_headers).json() == []
    assert client.get(f"{URL}/comissoes?ate={d - timedelta(days=1)}", headers=admin_headers).json() == []


def test_config_so_admin_e_gerente_editam(client, db, admin_headers, manager_headers):
    config_comissoes(db)
    corpo = {"own_sale_pct": "12.50", "indication_pct": "4", "first_sale_bonus": "80",
             "indication_months": 12, "calibration_pct": "6"}
    fin = usuario(db, "finance", "fin@hs.com")
    assert client.put(f"{URL}/comissoes/config", json=corpo, headers=headers(fin)).status_code == 403
    assert client.get(f"{URL}/comissoes/config", headers=headers(fin)).status_code == 200
    p, pu = hunter(db)
    assert client.get(f"{URL}/comissoes/config", headers=headers(pu)).status_code == 403
    assert client.put(f"{URL}/comissoes/config", json=corpo, headers=headers(pu)).status_code == 403
    r = client.put(f"{URL}/comissoes/config", json=corpo, headers=manager_headers)
    assert r.status_code == 200 and Decimal(r.json()["own_sale_pct"]) == Decimal("12.5")
    assert client.put(f"{URL}/comissoes/config", json={**corpo, "own_sale_pct": "100.01"},
                      headers=admin_headers).status_code == 422
    assert client.put(f"{URL}/comissoes/config", json={**corpo, "first_sale_bonus": "-1"},
                      headers=admin_headers).status_code == 422
    assert client.put(f"{URL}/comissoes/config", json={**corpo, "indication_months": 0},
                      headers=admin_headers).status_code == 422
    assert client.put(f"{URL}/comissoes/config", json={**corpo, "indication_months": 121},
                      headers=admin_headers).status_code == 422


def test_mudar_config_nao_altera_lancamento_existente(client, db, admin_headers):
    _, _, _, _, op_a, _ = _cenario(client, db, admin_headers)
    corpo = {"own_sale_pct": "50", "indication_pct": "50", "first_sale_bonus": "999",
             "indication_months": 12, "calibration_pct": "50"}
    assert client.put(f"{URL}/comissoes/config", json=corpo, headers=admin_headers).status_code == 200
    db.expire_all()
    c = db.query(PartnerCommission).filter_by(opportunity_id=op_a.id, kind="venda_propria").one()
    assert c.amount == Decimal("100.00") and c.rate == Decimal("10.00")


def test_a_pagar_agrupa_com_pix_e_documento(client, db, admin_headers):
    h, _, a, _, _, _ = _cenario(client, db, admin_headers)
    grupos = client.get(f"{URL}/comissoes/a-pagar", headers=admin_headers).json()
    assert [g["beneficiary_partner_id"] for g in grupos] == [h.id, a.id]  # total desc
    gh, ga = grupos
    assert (gh["kind"], gh["documento"], gh["pix_key"]) == ("hunter", "12345678909", "pix-h")
    assert Decimal(gh["total"]) == Decimal("200.00") and gh["quantidade"] == 3 and len(gh["lancamentos"]) == 3
    assert (ga["kind"], ga["documento"], ga["pix_key"]) == ("empresa", "11222333000181", "pix-a")
    p, pu = hunter(db, "Outro", "o@h.com")
    assert client.get(f"{URL}/comissoes/a-pagar", headers=headers(pu)).status_code == 403


def test_a_pagar_ignora_pagas_e_canceladas(client, db, admin_headers):
    h, _, a, _, op_a, _ = _cenario(client, db, admin_headers)
    c = db.query(PartnerCommission).filter_by(opportunity_id=op_a.id, kind="venda_propria").one()
    c.status = "paga"
    db.commit()
    grupos = client.get(f"{URL}/comissoes/a-pagar", headers=admin_headers).json()
    assert [g["beneficiary_partner_id"] for g in grupos] == [h.id]


def test_csv_a_pagar(client, db, admin_headers):
    _cenario(client, db, admin_headers)
    r = client.get(f"{URL}/comissoes/a-pagar.csv", headers=admin_headers)
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    assert r.content.startswith(b"\xef\xbb\xbf")
    linhas = r.content.decode("utf-8-sig").strip().splitlines()
    assert linhas[0] == "Beneficiário;Tipo;Documento;Chave PIX;Quantidade;Total"
    assert linhas[1] == "Hunter;hunter;12345678909;pix-h;3;200,00"
    assert linhas[2] == "Dmap;empresa;11222333000181;pix-a;1;100,00"
    assert len(linhas) == 3


def test_pagar_por_ids_so_pendentes(client, db, admin_headers):
    h, _, a, _, op_a, _ = _cenario(client, db, admin_headers)
    lancs = db.query(PartnerCommission).filter_by(beneficiary_partner_id=h.id).all()
    lancs[0].status = "cancelada"
    db.commit()
    ids = [c.id for c in lancs]
    r = client.post(f"{URL}/comissoes/pagar", json={"ids": ids}, headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["quantidade"] == 2 and r.json()["ignorados"] == 1
    db.expire_all()
    pagas = db.query(PartnerCommission).filter_by(status="paga").all()
    assert len(pagas) == 2 and all(c.paid_at and c.paid_by_id for c in pagas)
    assert Decimal(r.json()["total"]) == sum(c.amount for c in pagas)
    # Segunda vez: nada a pagar
    assert client.post(f"{URL}/comissoes/pagar", json={"ids": ids}, headers=admin_headers).json()["quantidade"] == 0


def test_pagar_por_beneficiario(client, db, admin_headers):
    h, _, a, _, _, _ = _cenario(client, db, admin_headers)
    fin = usuario(db, "finance", "fin@hs.com")
    r = client.post(f"{URL}/comissoes/pagar", json={"beneficiary_partner_id": h.id}, headers=headers(fin))
    assert r.status_code == 200 and r.json()["quantidade"] == 3 and Decimal(r.json()["total"]) == Decimal("200.00")
    db.expire_all()
    assert db.query(PartnerCommission).filter_by(beneficiary_partner_id=a.id, status="pendente").count() == 1


def test_pagar_exige_um_dos_dois_e_permissao(client, db, admin_headers):
    h, h_user, a, a_user, _, _ = _cenario(client, db, admin_headers)
    assert client.post(f"{URL}/comissoes/pagar", json={}, headers=admin_headers).status_code == 422
    assert client.post(f"{URL}/comissoes/pagar", json={"ids": [1], "beneficiary_partner_id": h.id},
                       headers=admin_headers).status_code == 422
    for u in (a_user, h_user):
        r = client.post(f"{URL}/comissoes/pagar", json={"ids": [1]}, headers=headers(u))
        assert r.status_code == 403 and r.json()["detail"] == MSG_PAGAR
    db.expire_all()
    assert db.query(PartnerCommission).filter_by(status="paga").count() == 0


def test_calibracao_gera_z_para_empresa(client, db, admin_headers):
    _, _, a, a_user, op_a, _ = _cenario(client, db, admin_headers)
    r = client.post(f"{URL}/oportunidades/{op_a.id}/calibracoes", headers=admin_headers,
                    json={"serial_number": "SN1", "calibration_date": "2026-11-01", "value": "200"})
    assert r.status_code == 201, r.text
    assert Decimal(r.json()["commission_amount"]) == Decimal("16.00")
    db.expire_all()
    c = db.query(PartnerCommission).filter_by(kind="calibracao").one()
    assert (c.beneficiary_partner_id, c.rate, c.base_value, c.status) == (a.id, Decimal("8.00"), Decimal("200.00"), "pendente")
    assert c.calibration_id == r.json()["id"]
    lista = client.get(f"{URL}/oportunidades/{op_a.id}/calibracoes", headers=headers(a_user))
    assert lista.status_code == 200 and len(lista.json()) == 1
    # Dono não lança
    assert client.post(f"{URL}/oportunidades/{op_a.id}/calibracoes", headers=headers(a_user),
                       json={"serial_number": "SN1", "calibration_date": "2026-11-01", "value": "1"}).status_code == 403


def test_calibracao_nao_gera_para_venda_do_hunter(client, db, admin_headers):
    _, _, _, _, _, op_h = _cenario(client, db, admin_headers)
    r = client.post(f"{URL}/oportunidades/{op_h.id}/calibracoes", headers=admin_headers,
                    json={"serial_number": "SN1", "calibration_date": "2026-11-01", "value": "200"})
    assert r.status_code == 201 and r.json()["commission_amount"] is None
    db.expire_all()
    assert db.query(PartnerCommission).filter_by(kind="calibracao").count() == 0


def test_calibracao_limite_de_duas_por_serie(client, db, admin_headers):
    _, _, _, _, op_a, _ = _cenario(client, db, admin_headers)
    corpo = {"serial_number": "SN1", "calibration_date": "2026-11-01", "value": "100"}
    for _ in range(2):
        assert client.post(f"{URL}/oportunidades/{op_a.id}/calibracoes", json=corpo,
                           headers=admin_headers).status_code == 201
    r = client.post(f"{URL}/oportunidades/{op_a.id}/calibracoes", json=corpo, headers=admin_headers)
    assert r.status_code == 422 and r.json()["detail"] == "Este aparelho já tem 2 calibrações com comissão."
    # Outro aparelho segue valendo
    assert client.post(f"{URL}/oportunidades/{op_a.id}/calibracoes", json={**corpo, "serial_number": "SN2"},
                       headers=admin_headers).status_code == 201
    db.expire_all()
    assert db.query(PartnerCommission).filter_by(kind="calibracao").count() == 3


def test_calibracao_sem_ganho_confirmado(client, db, admin_headers):
    config_comissoes(db)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000, modality="venda")
    r = client.post(f"{URL}/oportunidades/{op.id}/calibracoes", headers=admin_headers,
                    json={"serial_number": "SN1", "calibration_date": "2026-11-01", "value": "200"})
    assert r.status_code == 422 and r.json()["detail"] == "Só oportunidade com ganho confirmado recebe calibração."


def test_calibracao_em_locacao_guarda_mas_nao_gera(client, db, admin_headers):
    config_comissoes(db)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000, modality="locacao")
    _confirmar(client, op, admin_headers)
    r = client.post(f"{URL}/oportunidades/{op.id}/calibracoes", headers=admin_headers,
                    json={"serial_number": "SN1", "calibration_date": "2026-11-01", "value": "200"})
    assert r.status_code == 201 and r.json()["commission_amount"] is None
