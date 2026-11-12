"""Dashboard de Parcerias para hunter, empresa e vendedor da equipe."""
from datetime import datetime, timedelta

from app.models.partner import PartnerTeamMember
from app.models.partner_commission import PartnerCommission
from tests.unit.apoio_parcerias import (
    config_comissoes, headers, hunter, oportunidade, oportunidade_ganha, parceiro, usuario,
)

URL = "/api/v1/parcerias"


def _confirmar(client, op, h):
    r = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "confirmar"}, headers=h)
    assert r.status_code == 200, r.text


def _painel(client, user, **params):
    r = client.get(f"{URL}/dashboard", params=params, headers=headers(user))
    assert r.status_code == 200, r.text
    return r.json()


def _membro(db, p, nome, email):
    login = usuario(db, "partner_member", email, p)
    m = PartnerTeamMember(partner_id=p.id, name=nome, email=email, user_id=login.id)
    db.add(m); db.commit(); db.refresh(m)
    return m, login


def test_vendedor_ve_so_as_proprias_sem_comissao(client, db, admin_headers):
    config_comissoes(db)
    a = parceiro(db, "A")
    dono = usuario(db, "partner", "dono@a.com", a)
    m1, login1 = _membro(db, a, "Ana", "ana@a.com")
    m2, _ = _membro(db, a, "Beto", "beto@a.com")
    _confirmar(client, oportunidade_ganha(db, a, 1000, seller_member_id=m1.id, modality="venda"), admin_headers)
    _confirmar(client, oportunidade_ganha(db, a, 500, seller_member_id=m2.id, modality="venda"), admin_headers)
    r = _painel(client, login1)
    assert set(r) == {"visao", "vendas", "serie"}
    assert r["visao"] == "vendedor"
    assert r["vendas"] == {"quantidade": 1, "valor": "1000.00"}
    assert len(r["serie"]) == 1 and r["serie"][0]["valor"] == "1000.00"


def test_empresa_ve_vendas_por_vendedor_e_unidades(client, db, admin_headers):
    config_comissoes(db)
    a = parceiro(db, "A")
    b = parceiro(db, "B", indicated_by_partner_id=a.id)
    dono = usuario(db, "partner", "dono@a.com", a)
    m1, _ = _membro(db, a, "Ana", "ana@a.com")
    _confirmar(client, oportunidade_ganha(db, a, 1000, seller_member_id=m1.id, modality="venda"), admin_headers)
    _confirmar(client, oportunidade_ganha(db, a, 300, modality="venda"), admin_headers)
    _confirmar(client, oportunidade_ganha(db, b, 200, modality="venda"), admin_headers)
    r = _painel(client, dono)
    assert r["visao"] == "empresa"
    assert r["vendas"] == {"quantidade": 2, "valor": "1300.00"}  # sem a unidade
    pv = {x["nome"]: x for x in r["por_vendedor"]}
    assert pv["Ana"]["valor"] == "1000.00" and pv["Sem vendedor"]["valor"] == "300.00"
    assert [u["partner_id"] for u in r["unidades"]] == [b.id]
    assert r["unidades"][0]["valor"] == "200.00" and "prazo_indicacao_ate" not in r["unidades"][0]
    assert set(r["comissoes"]) == {"pendente", "pago", "por_tipo"}


def test_hunter_carteira_um_nivel(client, db, admin_headers):
    config_comissoes(db)
    ph, uh = hunter(db)
    a = parceiro(db, "A", indicated_by_partner_id=ph.id)
    b = parceiro(db, "B", indicated_by_partner_id=a.id)
    _confirmar(client, oportunidade_ganha(db, a, 1000, modality="venda"), admin_headers)
    _confirmar(client, oportunidade_ganha(db, b, 700, modality="venda"), admin_headers)
    _confirmar(client, oportunidade_ganha(db, ph, 100, modality="venda"), admin_headers)
    r = _painel(client, uh)
    assert r["visao"] == "hunter"
    assert [c["partner_id"] for c in r["carteira"]] == [a.id]
    assert r["carteira"][0]["valor"] == "1000.00"
    assert r["vendas"] == {"quantidade": 1, "valor": "100.00"}
    assert sum(float(m["valor"]) for m in r["serie"]) == 1100.0
    assert "prazo_indicacao_ate" in r["carteira"][0]


def test_locacao_nao_confirmada_e_excluida_fora(client, db, admin_headers):
    config_comissoes(db)
    a = parceiro(db, "A")
    dono = usuario(db, "partner", "dono@a.com", a)
    _confirmar(client, oportunidade_ganha(db, a, 1000, modality="venda"), admin_headers)
    oportunidade_ganha(db, a, 400, modality="locacao", won_confirmed_at=datetime.utcnow())
    oportunidade_ganha(db, a, 300, modality="venda")  # ganho sem confirmação
    oportunidade_ganha(db, a, 200, modality="venda", won_confirmed_at=datetime.utcnow(), is_deleted=True)
    r = _painel(client, dono)
    assert r["vendas"] == {"quantidade": 1, "valor": "1000.00"}
    assert [m["quantidade"] for m in r["serie"]] == [1]


def test_parada_e_prazo(client, db):
    config_comissoes(db, meses=24)
    ph, uh = hunter(db)
    ancora = datetime(2025, 3, 10, 12, 0)
    a = parceiro(db, "A", indicated_by_partner_id=ph.id, first_sale_at=ancora)
    b = parceiro(db, "B", indicated_by_partner_id=ph.id)
    op = oportunidade(db, a)
    op.created_at = datetime.utcnow() - timedelta(days=45)
    db.commit()
    oportunidade(db, b)  # criada agora: ativa
    r = _painel(client, uh)
    item = {c["partner_id"]: c for c in r["carteira"]}
    assert item[a.id]["dias_parada"] == 45 and item[a.id]["parada"] is True
    assert item[a.id]["prazo_indicacao_ate"].startswith("2027-03-10")
    assert item[b.id]["dias_parada"] == 0 and item[b.id]["parada"] is False
    assert item[b.id]["prazo_indicacao_ate"] is None


def test_comissoes_pendente_e_pago(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    ph, uh = hunter(db)
    a = parceiro(db, "A", indicated_by_partner_id=ph.id)
    op1 = oportunidade_ganha(db, a, 1000, modality="venda")
    op2 = oportunidade_ganha(db, ph, 2000, modality="venda")
    _confirmar(client, op1, admin_headers)
    _confirmar(client, op2, admin_headers)
    # indicacao (50) + bonus (100) do hunter sobre A; venda_propria do hunter 200
    pagar = db.query(PartnerCommission).filter(PartnerCommission.kind == "bonus_primeira_venda").one()
    pagar.status = "paga"
    cancelar = db.query(PartnerCommission).filter(PartnerCommission.kind == "indicacao").one()
    cancelar.status = "cancelada"
    db.commit()
    r = _painel(client, uh)["comissoes"]
    assert r["pendente"] == "200.00" and r["pago"] == "100.00"
    assert r["por_tipo"] == {
        "bonus_primeira_venda": {"pendente": "0.00", "pago": "100.00"},
        "venda_propria": {"pendente": "200.00", "pago": "0.00"},
    }


def test_salesperson_403(client, db):
    u = usuario(db, "salesperson", "v@hs.com")
    assert client.get(f"{URL}/dashboard", headers=headers(u)).status_code == 403
