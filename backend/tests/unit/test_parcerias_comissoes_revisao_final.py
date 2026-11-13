"""Comissões de Parcerias: correções da revisão final da Parte 2."""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.dialects import postgresql

from app.models.partner_commission import PartnerCalibration, PartnerCommission, PartnerCommissionConfig
from app.services.parcerias import comissoes

from tests.unit.apoio_parcerias import config_comissoes, hunter, oportunidade_ganha, parceiro

URL = "/api/v1/parcerias"
MSG_BLOQUEADO = "Parceiro bloqueado: desbloqueie antes de confirmar o ganho."
MSG_CALIBRACAO_BLOQUEADO = "Parceiro bloqueado: desbloqueie antes de lançar calibração."


def _confirmar(client, op, h):
    r = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "confirmar"}, headers=h)
    assert r.status_code == 200, r.text


def _negar(client, op, h, motivo="Pedido cancelado"):
    r = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "negar", "motivo": motivo}, headers=h)
    assert r.status_code == 200, r.text


def _lancamentos(db, op=None, **filtros):
    db.expire_all()
    q = db.query(PartnerCommission)
    if op is not None:
        q = q.filter(PartnerCommission.opportunity_id == op.id)
    for campo, valor in filtros.items():
        q = q.filter(getattr(PartnerCommission, campo) == valor)
    return q.order_by(PartnerCommission.id).all()


def _bonus_ativos(db, op):
    return [c for c in _lancamentos(db, op, kind="bonus_primeira_venda") if c.status in ("pendente", "paga")]


# ─── 1. Reâncora: beneficiário do bônus ──────────────────────────────────────

def test_reancora_com_x_zero_da_bonus_ao_indicador_atual(client, db, admin_headers):
    config_comissoes(db, y=10, x=0, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    assert _bonus_ativos(db, op2) == []
    _negar(client, op1, admin_headers)
    db.refresh(a)
    assert a.first_sale_opportunity_id == op2.id
    bonus = _bonus_ativos(db, op2)
    assert [(c.beneficiary_partner_id, c.amount, c.status) for c in bonus] == [(h.id, Decimal("100.00"), "pendente")]
    assert bonus[0].base_value == Decimal("2000.00")


def test_reancora_para_indicador_bloqueado_nao_da_bonus(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    h.stage = "bloqueado"
    db.commit()
    _negar(client, op1, admin_headers)
    db.refresh(a)
    assert a.first_sale_opportunity_id == op2.id
    assert _bonus_ativos(db, op2) == []


def test_reancora_com_x_zero_e_indicador_excluido_nao_da_bonus(client, db, admin_headers):
    config_comissoes(db, y=10, x=0, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    h.is_deleted = True
    db.commit()
    _negar(client, op1, admin_headers)
    assert _bonus_ativos(db, op2) == []


# ─── 2. Trava da linha de quem vendeu ────────────────────────────────────────

def test_trava_do_vendedor_e_for_update(db):
    from app.models.partner import Partner

    q = comissoes._consulta_do_vendedor(db, 7)
    sql = str(q.statement.compile(dialect=postgresql.dialect()))
    assert "FOR UPDATE" in sql and "FROM partners" in sql
    assert q.column_descriptions[0]["entity"] is Partner


def test_gerar_e_cancelar_travam_o_vendedor(db, monkeypatch):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op = oportunidade_ganha(db, a, 1000)
    chamadas = []
    original = comissoes._travar_vendedor

    def espiao(sessao, partner_id):
        chamadas.append(partner_id)
        return original(sessao, partner_id)

    monkeypatch.setattr(comissoes, "_travar_vendedor", espiao)
    comissoes.gerar(db, op, datetime.utcnow())
    db.commit()
    assert chamadas == [a.id]
    comissoes.cancelar_da_oportunidade(db, op, "teste")
    db.commit()
    assert chamadas == [a.id, a.id]


def test_segunda_confirmacao_ve_a_ancora_gravada_por_outra_transacao(db):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op1 = oportunidade_ganha(db, a, 1000)
    op2 = oportunidade_ganha(db, a, 2000)
    assert op2.partner.first_sale_at is None  # objeto já carregado, sem âncora
    # A outra transação confirmou op1 e gravou a âncora (por fora do ORM desta sessão).
    db.execute(text("UPDATE partners SET first_sale_at = :q, first_sale_opportunity_id = :op WHERE id = :id"),
               {"q": datetime.utcnow(), "op": op1.id, "id": a.id})
    comissoes.gerar(db, op2, datetime.utcnow())
    db.commit()
    assert _bonus_ativos(db, op2) == []
    db.refresh(a)
    assert a.first_sale_opportunity_id == op1.id


# ─── 3. Início do programa de indicação ──────────────────────────────────────

def test_sem_programa_de_indicacao_nao_grava_ancora(client, db, admin_headers):
    config_comissoes(db, y=10, x=0, bonus=0)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    db.refresh(a)
    assert (a.first_sale_at, a.first_sale_opportunity_id) == (None, None)
    assert [c.kind for c in _lancamentos(db, op1)] == ["venda_propria"]

    # A H&S preencheu os valores: a próxima venda é a primeira.
    config_comissoes(db, y=10, x=5, bonus=100)
    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    db.refresh(a)
    assert a.first_sale_opportunity_id == op2.id
    assert len(_bonus_ativos(db, op2)) == 1
    assert len(_lancamentos(db, op2, kind="indicacao")) == 1


def test_reancora_ignora_venda_sem_lancamento(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    # Venda confirmada antes da versão 1.11.19: ganho confirmado, sem lançamento.
    antiga = oportunidade_ganha(db, a, 500)
    antiga.won_confirmed_at = datetime(2026, 1, 10)
    db.commit()
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    _negar(client, op1, admin_headers)
    db.refresh(a)
    assert a.first_sale_opportunity_id == op2.id
    assert len(_bonus_ativos(db, op2)) == 1
    assert _lancamentos(db, antiga) == []


def test_reancora_sem_outra_venda_com_lancamento_limpa(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    antiga = oportunidade_ganha(db, a, 500)
    antiga.won_confirmed_at = datetime(2026, 1, 10)
    db.commit()
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    _negar(client, op1, admin_headers)
    db.refresh(a)
    assert (a.first_sale_at, a.first_sale_opportunity_id) == (None, None)


# ─── 4. Calibração pendente cai junto ────────────────────────────────────────

def test_desfazer_ganho_cancela_calibracao_pendente_e_mantem_paga(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100, z=8)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000, quantidade=2, modality="venda")  # SN1 e SN2
    _confirmar(client, op, admin_headers)
    corpo = {"calibration_date": "2026-11-01", "value": "200"}
    for s in ("SN1", "SN2"):
        r = client.post(f"{URL}/oportunidades/{op.id}/calibracoes", json={**corpo, "serial_number": s},
                        headers=admin_headers)
        assert r.status_code == 201, r.text
    paga, pendente = _lancamentos(db, op, kind="calibracao")
    paga.status, paga.paid_at = "paga", datetime.utcnow()
    db.commit()
    _negar(client, op, admin_headers)
    db.refresh(paga)
    db.refresh(pendente)
    assert (paga.status, pendente.status) == ("paga", "cancelada")
    assert "Pedido cancelado" in pendente.cancel_reason
    assert db.query(PartnerCalibration).count() == 2  # a calibração em si fica


# ─── 5. Período no fuso de São Paulo ─────────────────────────────────────────

def _lancamento_em(db, quando, beneficiario, op):
    c = PartnerCommission(opportunity_id=op.id, kind="calibracao", beneficiary_partner_id=beneficiario.id,
                          source_partner_id=beneficiario.id, base_value=Decimal("100"), amount=Decimal("8.00"),
                          status="pendente", created_at=quando)
    db.add(c)
    db.commit()
    return c


def test_periodo_usa_o_dia_de_sao_paulo(client, db, admin_headers):
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000)
    noite_do_dia_10 = _lancamento_em(db, datetime(2026, 11, 11, 2, 30), a, op)   # 10/11 23:30 BRT
    _lancamento_em(db, datetime(2026, 11, 10, 2, 30), a, op)                     # 09/11 23:30 BRT
    _lancamento_em(db, datetime(2026, 11, 11, 3, 0), a, op)                      # 11/11 00:00 BRT

    def ids(**p):
        r = client.get(f"{URL}/comissoes", params=p, headers=admin_headers)
        assert r.status_code == 200, r.text
        return [c["id"] for c in r.json()]

    assert ids(de="2026-11-10", ate="2026-11-10") == [noite_do_dia_10.id]
    resumo = client.get(f"{URL}/comissoes/resumo", params={"de": "2026-11-10", "ate": "2026-11-10"},
                        headers=admin_headers).json()
    assert Decimal(resumo["pendente"]) == Decimal("8.00")
    grupos = client.get(f"{URL}/comissoes/a-pagar", params={"de": "2026-11-10", "ate": "2026-11-10"},
                        headers=admin_headers).json()
    assert [i["id"] for g in grupos for i in g["lancamentos"]] == [noite_do_dia_10.id]

    r = client.post(f"{URL}/comissoes/pagar", headers=admin_headers,
                    json={"beneficiary_partner_id": a.id, "de": "2026-11-10", "ate": "2026-11-10"})
    assert r.status_code == 200 and r.json()["quantidade"] == 1
    db.refresh(noite_do_dia_10)
    assert noite_do_dia_10.status == "paga"


def test_limites_do_periodo_em_utc():
    de, ate = comissoes._limites_utc(date(2026, 11, 10), date(2026, 11, 10))
    assert (de, ate) == (datetime(2026, 11, 10, 3, 0), datetime(2026, 11, 11, 3, 0))
    assert comissoes._limites_utc(None, None) == (None, None)


# ─── 7. Configuração: padrão e GET sem gravar ────────────────────────────────

def test_config_padrao_sem_linha(client, db, admin_headers):
    assert comissoes._config(db).indication_months == 24
    r = client.get(f"{URL}/comissoes/config", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["indication_months"] == 24 and Decimal(r.json()["own_sale_pct"]) == 0
    db.expire_all()
    assert db.query(PartnerCommissionConfig).count() == 0  # o GET não grava

    corpo = {"own_sale_pct": "10", "indication_pct": "5", "first_sale_bonus": "100",
             "indication_months": 12, "calibration_pct": "8"}
    assert client.put(f"{URL}/comissoes/config", json=corpo, headers=admin_headers).status_code == 200
    db.expire_all()
    assert db.query(PartnerCommissionConfig).count() == 1
    assert client.get(f"{URL}/comissoes/config", headers=admin_headers).json()["indication_months"] == 12


# ─── 9. No máximo 2 casas decimais ───────────────────────────────────────────

def test_config_aceita_no_maximo_duas_casas(client, db, admin_headers):
    corpo = {"own_sale_pct": "12.50", "indication_pct": "4", "first_sale_bonus": "80.10",
             "indication_months": 12, "calibration_pct": "6.25"}
    assert client.put(f"{URL}/comissoes/config", json=corpo, headers=admin_headers).status_code == 200
    for campo, valor in (("own_sale_pct", "12.505"), ("indication_pct", "4.001"),
                         ("first_sale_bonus", "80.001"), ("calibration_pct", "6.125")):
        r = client.put(f"{URL}/comissoes/config", json={**corpo, campo: valor}, headers=admin_headers)
        assert r.status_code == 422, (campo, r.text)


# ─── 11. Parceiro excluído ou bloqueado ──────────────────────────────────────

def test_parceiro_excluido_nao_confirma_ganho(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000)
    a.is_deleted = True
    db.commit()
    r = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "confirmar"}, headers=admin_headers)
    assert r.status_code == 422 and r.json()["detail"] == MSG_BLOQUEADO
    assert _lancamentos(db, op) == []


def test_calibracao_de_parceiro_bloqueado_ou_excluido_recusada(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100, z=8)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000, modality="venda")
    _confirmar(client, op, admin_headers)
    corpo = {"serial_number": "SN1", "calibration_date": "2026-11-01", "value": "200"}
    for campo, valor in (("stage", "bloqueado"), ("is_deleted", True)):
        db.refresh(a)
        a.stage, a.is_deleted = "ativado", False
        setattr(a, campo, valor)
        db.commit()
        r = client.post(f"{URL}/oportunidades/{op.id}/calibracoes", json=corpo, headers=admin_headers)
        assert r.status_code == 422, (campo, r.text)
        assert r.json()["detail"] == MSG_CALIBRACAO_BLOQUEADO
    db.expire_all()
    assert db.query(PartnerCalibration).count() == 0
    assert _lancamentos(db, op, kind="calibracao") == []
