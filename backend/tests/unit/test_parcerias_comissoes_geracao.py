"""Comissões de Parcerias: geração na confirmação do ganho e cancelamento ao desfazer."""
from datetime import date, datetime
from decimal import Decimal

from dateutil.relativedelta import relativedelta

from app.models.partner_commission import PartnerCommission
from app.services.parcerias import comissoes

from tests.unit.apoio_parcerias import config_comissoes, hunter, oportunidade_ganha, parceiro

URL = "/api/v1/parcerias"


def _confirmar(client, op, h):
    r = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "confirmar"}, headers=h)
    assert r.status_code == 200, r.text
    return r


def _negar(client, op, h, motivo="Pedido cancelado"):
    r = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "negar", "motivo": motivo}, headers=h)
    assert r.status_code == 200, r.text
    return r


def _lancamentos(db, op=None, **filtros):
    db.expire_all()
    q = db.query(PartnerCommission)
    if op is not None:
        q = q.filter(PartnerCommission.opportunity_id == op.id)
    for campo, valor in filtros.items():
        q = q.filter(getattr(PartnerCommission, campo) == valor)
    return q.order_by(PartnerCommission.id).all()


def _resumo(lancamentos):
    return sorted((c.beneficiary_partner_id, c.kind, c.amount, c.status) for c in lancamentos)


def _de_novo_em_ganho(db, op):
    op.stage, op.won_at = "ganho", datetime.utcnow()
    db.commit()


def test_empresa_sem_indicador_so_venda_propria(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000, modality="venda")
    _confirmar(client, op, admin_headers)
    lancs = _lancamentos(db, op)
    assert _resumo(lancs) == [(a.id, "venda_propria", Decimal("100.00"), "pendente")]
    c = lancs[0]
    assert (c.source_partner_id, c.base_value, c.rate) == (a.id, Decimal("1000.00"), Decimal("10.00"))


def test_base_ignora_frete_e_aplica_desconto_geral(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000, global_discount=10, global_discount_type="percent", shipping=50)
    assert comissoes.base_sem_frete(db, op) == Decimal("900.00")
    _confirmar(client, op, admin_headers)
    c = _lancamentos(db, op)[0]
    assert (c.base_value, c.amount) == (Decimal("900.00"), Decimal("90.00"))


def test_base_nunca_negativa(db):
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 100, global_discount=500, shipping=50)
    assert comissoes.base_sem_frete(db, op) == Decimal("0.00")


def test_arredondamento_meio_para_cima(client, db, admin_headers):
    config_comissoes(db, y=Decimal("7.50"), x=0, bonus=0)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, Decimal("100.30"))  # 7,5% = 7,5225 -> 7,52
    _confirmar(client, op, admin_headers)
    assert _lancamentos(db, op)[0].amount == Decimal("7.52")
    op2 = oportunidade_ganha(db, a, Decimal("100.20"))  # 7,5% = 7,515 -> 7,52
    _confirmar(client, op2, admin_headers)
    assert _lancamentos(db, op2)[0].amount == Decimal("7.52")


def test_primeira_venda_da_indicada_gera_bonus_e_indicacao(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op, admin_headers)
    assert _resumo(_lancamentos(db, op)) == sorted([
        (a.id, "venda_propria", Decimal("100.00"), "pendente"),
        (h.id, "bonus_primeira_venda", Decimal("100.00"), "pendente"),
        (h.id, "indicacao", Decimal("50.00"), "pendente"),
    ])
    bonus = _lancamentos(db, op, kind="bonus_primeira_venda")[0]
    assert (bonus.fixed_value, bonus.source_partner_id) == (Decimal("100.00"), a.id)
    db.refresh(a)
    assert a.first_sale_at is not None and a.first_sale_opportunity_id == op.id


def test_segunda_venda_so_indicacao(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    assert _resumo(_lancamentos(db, op2)) == sorted([
        (a.id, "venda_propria", Decimal("200.00"), "pendente"),
        (h.id, "indicacao", Decimal("100.00"), "pendente"),
    ])
    db.refresh(a)
    assert a.first_sale_opportunity_id == op1.id


def test_prazo_vencido_nao_gera_indicacao(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100, meses=24)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    antiga = oportunidade_ganha(db, a, 500)
    a.first_sale_at = datetime.utcnow() - relativedelta(months=25)
    a.first_sale_opportunity_id = antiga.id
    db.commit()
    op = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op, admin_headers)
    assert _resumo(_lancamentos(db, op)) == [(a.id, "venda_propria", Decimal("100.00"), "pendente")]


def test_dentro_do_prazo_gera_indicacao(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100, meses=24)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    antiga = oportunidade_ganha(db, a, 500)
    a.first_sale_at = datetime.utcnow() - relativedelta(months=23)
    a.first_sale_opportunity_id = antiga.id
    db.commit()
    op = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op, admin_headers)
    assert len(_lancamentos(db, op, kind="indicacao")) == 1


def test_indicador_bloqueado_nao_acumula(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    h.stage = "bloqueado"
    db.commit()
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op, admin_headers)
    assert _resumo(_lancamentos(db, op)) == [(a.id, "venda_propria", Decimal("100.00"), "pendente")]
    db.refresh(a)
    assert a.first_sale_opportunity_id == op.id  # o prazo conta mesmo assim


def test_venda_propria_do_hunter(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    op = oportunidade_ganha(db, h, 1000)
    _confirmar(client, op, admin_headers)
    assert _resumo(_lancamentos(db, op)) == [(h.id, "venda_propria", Decimal("100.00"), "pendente")]


def test_locacao_nao_gera(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op = oportunidade_ganha(db, a, 1000, modality="locacao")
    _confirmar(client, op, admin_headers)
    assert _lancamentos(db, op) == []
    db.refresh(a)
    assert a.first_sale_at is None


def test_percentual_zero_nao_gera_lancamento(client, db, admin_headers):
    config_comissoes(db, y=0, x=0, bonus=0)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op, admin_headers)
    assert _lancamentos(db, op) == []
    db.refresh(a)
    assert a.first_sale_opportunity_id == op.id


def test_unidade_indicada_por_empresa(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    b = parceiro(db, "Unidade B", indicated_by_partner_id=a.id)
    op = oportunidade_ganha(db, b, 1000)
    _confirmar(client, op, admin_headers)
    assert _resumo(_lancamentos(db, op)) == sorted([
        (b.id, "venda_propria", Decimal("100.00"), "pendente"),
        (a.id, "bonus_primeira_venda", Decimal("100.00"), "pendente"),
        (a.id, "indicacao", Decimal("50.00"), "pendente"),
    ])
    assert _lancamentos(db, beneficiary_partner_id=h.id) == []


def test_troca_de_indicador_vale_dali_pra_frente(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h1, _ = hunter(db, "Hunter 1", "h1@hunter.com")
    h2, _ = hunter(db, "Hunter 2", "h2@hunter.com")
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h1.id)
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    a.indicated_by_partner_id = h2.id
    db.commit()
    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    assert _resumo(_lancamentos(db, op1, beneficiary_partner_id=h1.id)) == sorted([
        (h1.id, "bonus_primeira_venda", Decimal("100.00"), "pendente"),
        (h1.id, "indicacao", Decimal("50.00"), "pendente"),
    ])
    assert _resumo(_lancamentos(db, op2, beneficiary_partner_id=h2.id)) == [
        (h2.id, "indicacao", Decimal("100.00"), "pendente"),
    ]
    assert _lancamentos(db, op2, beneficiary_partner_id=h1.id) == []


def test_confirmar_negar_confirmar_nao_duplica(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op, admin_headers)
    assert len(_lancamentos(db, op)) == 3
    _negar(client, op, admin_headers)
    assert {c.status for c in _lancamentos(db, op)} == {"cancelada"}
    canc = _lancamentos(db, op)[0]
    assert canc.cancelled_at is not None and "Pedido cancelado" in canc.cancel_reason
    _de_novo_em_ganho(db, op)
    _confirmar(client, op, admin_headers)
    lancs = _lancamentos(db, op)
    assert len(lancs) == 3
    assert {c.status for c in lancs} == {"pendente"}
    assert all(c.cancelled_at is None and c.cancel_reason is None for c in lancs)
    db.refresh(a)
    assert a.first_sale_opportunity_id == op.id


def test_primeira_venda_desfeita_libera_ancora(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    _negar(client, op1, admin_headers)
    db.refresh(a)
    assert (a.first_sale_at, a.first_sale_opportunity_id) == (None, None)
    assert _lancamentos(db, op1, kind="bonus_primeira_venda")[0].status == "cancelada"

    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    db.refresh(a)
    assert a.first_sale_opportunity_id == op2.id
    assert _resumo(_lancamentos(db, op2, beneficiary_partner_id=h.id)) == sorted([
        (h.id, "bonus_primeira_venda", Decimal("100.00"), "pendente"),
        (h.id, "indicacao", Decimal("100.00"), "pendente"),
    ])


def test_bonus_pago_mantem_ancora(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    db.refresh(a)
    ancora = a.first_sale_at
    bonus = _lancamentos(db, op1, kind="bonus_primeira_venda")[0]
    bonus.status, bonus.paid_at = "paga", datetime.utcnow()
    db.commit()
    _negar(client, op1, admin_headers)
    db.refresh(a)
    assert (a.first_sale_at, a.first_sale_opportunity_id) == (ancora, op1.id)
    assert _lancamentos(db, op1, kind="bonus_primeira_venda")[0].status == "paga"

    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    assert _lancamentos(db, op2, kind="bonus_primeira_venda") == []


def test_pago_nao_e_cancelado(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op, admin_headers)
    propria = _lancamentos(db, op, kind="venda_propria")[0]
    propria.status, propria.paid_at = "paga", datetime.utcnow()
    db.commit()
    _negar(client, op, admin_headers)
    assert _resumo(_lancamentos(db, op)) == sorted([
        (a.id, "venda_propria", Decimal("100.00"), "paga"),
        (h.id, "bonus_primeira_venda", Decimal("100.00"), "cancelada"),
        (h.id, "indicacao", Decimal("50.00"), "cancelada"),
    ])
    # Confirmar de novo não mexe no pago e reativa só os cancelados.
    _de_novo_em_ganho(db, op)
    _confirmar(client, op, admin_headers)
    assert {c.status for c in _lancamentos(db, op)} == {"paga", "pendente"}
    assert len(_lancamentos(db, op)) == 3


def test_sair_de_ganho_pelo_board_cancela(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000, modality="venda", expected_close_date=date(2026, 11, 30))
    _confirmar(client, op, admin_headers)
    r = client.put(f"{URL}/oportunidades/{op.id}/mover", json={"stage": "aguardando_pedido"},
                   headers=admin_headers)
    assert r.status_code == 200, r.text
    assert {c.status for c in _lancamentos(db, op)} == {"cancelada"}
    db.refresh(a)
    assert a.first_sale_opportunity_id is None


# ─── Rodada de correções 1 ───────────────────────────────────────────────────

def _ativos_por_tipo(db, op):
    tipos = {}
    for c in _lancamentos(db, op):
        if c.status in ("pendente", "paga"):
            tipos[c.kind] = tipos.get(c.kind, 0) + 1
    return tipos


def test_confirmar_duas_vezes_da_422(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op, admin_headers)
    r = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "confirmar"}, headers=admin_headers)
    assert r.status_code == 422 and r.json()["detail"] == "Ganho já confirmado."
    assert len(_lancamentos(db, op)) == 3


def test_reconfirmar_depois_de_trocar_indicador_nao_paga_dois(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h1, _ = hunter(db, "Hunter 1", "h1@hunter.com")
    h2, _ = hunter(db, "Hunter 2", "h2@hunter.com")
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h1.id)
    op = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op, admin_headers)
    _negar(client, op, admin_headers)
    a.indicated_by_partner_id = h2.id
    db.commit()
    _de_novo_em_ganho(db, op)
    _confirmar(client, op, admin_headers)
    assert _ativos_por_tipo(db, op) == {"venda_propria": 1, "indicacao": 1, "bonus_primeira_venda": 1}
    assert {c.status for c in _lancamentos(db, op, beneficiary_partner_id=h1.id)} == {"cancelada"}
    assert {c.status for c in _lancamentos(db, op, beneficiary_partner_id=h2.id)} == {"pendente"}


def test_pago_desfeito_troca_indicador_reconfirma_sem_duplicar(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h1, _ = hunter(db, "Hunter 1", "h1@hunter.com")
    h2, _ = hunter(db, "Hunter 2", "h2@hunter.com")
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h1.id)
    op = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op, admin_headers)
    ind = _lancamentos(db, op, kind="indicacao")[0]
    ind.status, ind.paid_at = "paga", datetime.utcnow()
    db.commit()
    _negar(client, op, admin_headers)
    a.indicated_by_partner_id = h2.id
    db.commit()
    _de_novo_em_ganho(db, op)
    _confirmar(client, op, admin_headers)
    ativos = _ativos_por_tipo(db, op)
    assert ativos["indicacao"] == 1 and ativos["venda_propria"] == 1
    assert ativos.get("bonus_primeira_venda", 0) <= 1
    assert _lancamentos(db, op, kind="indicacao", beneficiary_partner_id=h2.id) == []


def test_indice_unico_barra_dois_ativos_do_mesmo_tipo(db):
    import pytest
    from sqlalchemy.exc import IntegrityError

    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000)
    comum = dict(source_partner_id=a.id, opportunity_id=op.id, amount=Decimal("1.00"))
    db.add(PartnerCommission(beneficiary_partner_id=a.id, kind="venda_propria", status="pendente", **comum))
    db.add(PartnerCommission(beneficiary_partner_id=a.id, kind="venda_propria", status="cancelada", **comum))
    db.add(PartnerCommission(beneficiary_partner_id=a.id, kind="calibracao", status="pendente", **comum))
    db.add(PartnerCommission(beneficiary_partner_id=a.id, kind="calibracao", status="pendente", **comum))
    db.commit()
    db.add(PartnerCommission(beneficiary_partner_id=a.id, kind="venda_propria", status="paga", **comum))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_corrida_vira_ja_gerado(db, monkeypatch):
    config_comissoes(db, y=10, x=5, bonus=100)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000)
    agora = datetime.utcnow()
    assert len(comissoes.gerar(db, op, agora)) == 1
    db.commit()
    # Simula a outra transação: a checagem não vê o lançamento, o índice barra.
    monkeypatch.setattr(comissoes, "_ja_lancado", lambda *a, **k: False)
    assert comissoes.gerar(db, op, agora) == []
    db.commit()
    assert len(_lancamentos(db, op)) == 1


def test_reancora_na_proxima_venda_confirmada(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    _negar(client, op1, admin_headers)
    db.refresh(a)
    db.refresh(op2)
    assert (a.first_sale_opportunity_id, a.first_sale_at) == (op2.id, op2.won_confirmed_at)
    assert _resumo(_lancamentos(db, op2, beneficiary_partner_id=h.id)) == sorted([
        (h.id, "bonus_primeira_venda", Decimal("100.00"), "pendente"),
        (h.id, "indicacao", Decimal("100.00"), "pendente"),
    ])


def test_reancora_sem_indicacao_nao_gera_bonus(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    a = parceiro(db, "Dmap")
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    _negar(client, op1, admin_headers)
    db.refresh(a)
    assert a.first_sale_opportunity_id == op2.id
    assert _lancamentos(db, op2, kind="bonus_primeira_venda") == []


def test_reancora_ignora_locacao_e_limpa_sem_outra_venda(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    loc = oportunidade_ganha(db, a, 3000, modality="locacao")
    _confirmar(client, loc, admin_headers)
    _negar(client, op1, admin_headers)
    db.refresh(a)
    assert (a.first_sale_at, a.first_sale_opportunity_id) == (None, None)


def test_qualquer_lancamento_pago_mantem_ancora(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op1 = oportunidade_ganha(db, a, 1000)
    _confirmar(client, op1, admin_headers)
    op2 = oportunidade_ganha(db, a, 2000)
    _confirmar(client, op2, admin_headers)
    propria = _lancamentos(db, op1, kind="venda_propria")[0]
    propria.status, propria.paid_at = "paga", datetime.utcnow()
    db.commit()
    _negar(client, op1, admin_headers)
    db.refresh(a)
    assert a.first_sale_opportunity_id == op1.id
    assert _lancamentos(db, op2, kind="bonus_primeira_venda") == []


def test_desconto_percentual_em_decimal(db):
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, Decimal("1000.05"), global_discount=10, global_discount_type="percent")
    assert comissoes.base_sem_frete(db, op) == Decimal("900.04")


def test_ganho_confirmado_trava_valores(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000, modality="venda")
    item = op.products[0]
    _confirmar(client, op, admin_headers)
    msg = "Ganho confirmado: desfaça o ganho para alterar os valores."
    base = f"{URL}/oportunidades/{op.id}"
    respostas = [
        client.post(f"{base}/produtos", json={"product_id": item.product_id}, headers=admin_headers),
        client.put(f"{base}/produtos/{item.id}", json={"quantity": 2}, headers=admin_headers),
        client.delete(f"{base}/produtos/{item.id}", headers=admin_headers),
        client.put(base, json={"global_discount": 50}, headers=admin_headers),
        client.put(base, json={"global_discount_type": "percent"}, headers=admin_headers),
        client.put(base, json={"modality": "locacao"}, headers=admin_headers),
    ]
    for r in respostas:
        assert r.status_code == 422, r.text
        assert r.json()["detail"] == msg
    assert client.put(base, json={"shipping": 30}, headers=admin_headers).status_code == 200
    # Mandar o mesmo valor (formulário inteiro) não é alteração.
    assert client.put(base, json={"modality": "venda", "global_discount": 0}, headers=admin_headers).status_code == 200
    # Desfeito o ganho, volta a poder.
    _negar(client, op, admin_headers)
    assert client.put(base, json={"global_discount": 50}, headers=admin_headers).status_code == 200


def test_parceiro_bloqueado_nao_confirma_ganho(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000)
    a.stage = "bloqueado"
    db.commit()
    r = client.put(f"{URL}/oportunidades/{op.id}/ganho", json={"acao": "confirmar"}, headers=admin_headers)
    assert r.status_code == 422
    assert r.json()["detail"] == "Parceiro bloqueado: desbloqueie antes de confirmar o ganho."
    assert _lancamentos(db, op) == []
