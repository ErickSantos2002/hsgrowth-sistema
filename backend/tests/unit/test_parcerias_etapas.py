"""Etapas fixas e travas dos dois boards de Parcerias."""
from datetime import date
from types import SimpleNamespace

import pytest

from app.services.parcerias.cnpj import cnpj_valido, so_digitos
from app.services.parcerias.etapas import (
    TravaError,
    validar_mudanca_oportunidade,
)


def _oportunidade(**campos):
    base = dict(
        stage="novo_lead", eligibility_status="em_analise",
        expected_close_date=None, modality=None, loss_reason=None,
    )
    base.update(campos)
    return SimpleNamespace(**base)


# ── CNPJ ─────────────────────────────────────────────────────────────────────

def test_cnpj():
    assert so_digitos("11.222.333/0001-81") == "11222333000181"
    assert cnpj_valido("11.222.333/0001-81")
    assert not cnpj_valido("11222333000182")
    assert not cnpj_valido("11111111111111")
    assert not cnpj_valido("123")


# ── Board 2 ──────────────────────────────────────────────────────────────────

def test_novo_lead_anda_sem_elegibilidade():
    # A H&S valida a elegibilidade quando quiser, até depois do Ganho.
    validar_mudanca_oportunidade(_oportunidade(), "oportunidade", "partner")
    validar_mudanca_oportunidade(_oportunidade(eligibility_status="rejeitada"), "proposta", "partner")


def test_negociacao_pede_data_mesmo_pulando_proposta():
    op = _oportunidade(stage="oportunidade", eligibility_status="validada")
    with pytest.raises(TravaError, match="data esperada"):
        validar_mudanca_oportunidade(op, "negociacao", "partner")


def test_ganho_pede_venda_ou_locacao():
    op = _oportunidade(stage="aguardando_pedido", eligibility_status="validada",
                       expected_close_date=date(2026, 11, 30))
    with pytest.raises(TravaError, match="venda ou locação"):
        validar_mudanca_oportunidade(op, "ganho", "partner")

    op.modality = "locacao"
    validar_mudanca_oportunidade(op, "ganho", "partner")


def test_perdido_pede_motivo_e_vale_ate_em_novo_lead():
    with pytest.raises(TravaError, match="motivo"):
        validar_mudanca_oportunidade(_oportunidade(), "perdido", "partner")

    validar_mudanca_oportunidade(_oportunidade(loss_reason="Preço / orçamento"), "perdido", "partner")


def test_so_gestao_reabre_ganho_ou_perdido():
    op = _oportunidade(stage="ganho", eligibility_status="validada",
                       expected_close_date=date(2026, 11, 30), modality="venda")
    with pytest.raises(TravaError, match="reabrem"):
        validar_mudanca_oportunidade(op, "negociacao", "partner")

    validar_mudanca_oportunidade(op, "negociacao", "admin")
