"""Etapas fixas e travas dos dois boards de Parcerias."""
from datetime import date
from types import SimpleNamespace

import pytest

from app.services.parcerias.cnpj import cnpj_valido, so_digitos
from app.services.parcerias.etapas import (
    TravaError,
    validar_mudanca_oportunidade,
    validar_mudanca_parceiro,
)


def _parceiro(**campos):
    base = dict(
        stage="potencial", main_contact_name=None, main_contact_phone=None,
        main_contact_email=None, hs_owner_id=None, qualification_status=None,
        onboarding_date=None, loss_reason=None,
    )
    base.update(campos)
    return SimpleNamespace(**base)


PRONTO = dict(
    main_contact_name="Carlos", main_contact_phone="11999990000", hs_owner_id=1,
    qualification_status="aderente", onboarding_date=date(2026, 10, 1),
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


# ── Board 1 ──────────────────────────────────────────────────────────────────

def test_sair_de_potencial_pede_contato_e_responsavel():
    with pytest.raises(TravaError, match="contato principal"):
        validar_mudanca_parceiro(_parceiro(), "qualificacao", "partner")

    validar_mudanca_parceiro(_parceiro(**PRONTO), "qualificacao", "partner")


def test_pular_etapa_nao_fura_a_trava_da_qualificacao():
    p = _parceiro(**{**PRONTO, "qualification_status": "nao_aderente"})
    with pytest.raises(TravaError, match="Aderente"):
        validar_mudanca_parceiro(p, "proposta", "admin")


def test_ativacao_pede_data_de_onboarding():
    p = _parceiro(**{**PRONTO, "stage": "onboarding", "onboarding_date": None})
    with pytest.raises(TravaError, match="onboarding"):
        validar_mudanca_parceiro(p, "ativacao", "partner")


def test_ativado_so_automatico():
    p = _parceiro(**{**PRONTO, "stage": "ativacao"})
    with pytest.raises(TravaError, match="sozinho"):
        validar_mudanca_parceiro(p, "ativado", "admin")

    validar_mudanca_parceiro(p, "ativado", "sistema", automatico=True)


def test_perdido_do_parceiro_so_gestao_e_com_motivo():
    with pytest.raises(TravaError, match="Só admin ou gerente"):
        validar_mudanca_parceiro(_parceiro(loss_reason="Sem interesse"), "perdido", "partner")
    with pytest.raises(TravaError, match="motivo"):
        validar_mudanca_parceiro(_parceiro(), "perdido", "admin")

    validar_mudanca_parceiro(_parceiro(loss_reason="Sem interesse"), "perdido", "manager")


def test_parceiro_nao_sai_de_perdido_nem_de_ativado():
    for origem in ("perdido", "ativado"):
        with pytest.raises(TravaError, match="tiram o parceiro"):
            validar_mudanca_parceiro(_parceiro(**{**PRONTO, "stage": origem}), "onboarding", "partner")


def test_etapa_desconhecida():
    with pytest.raises(TravaError, match="desconhecida"):
        validar_mudanca_parceiro(_parceiro(), "xyz", "admin")


# ── Board 2 ──────────────────────────────────────────────────────────────────

def test_sair_de_novo_lead_pede_elegibilidade_validada():
    with pytest.raises(TravaError, match="Validada"):
        validar_mudanca_oportunidade(_oportunidade(), "oportunidade", "partner")

    validar_mudanca_oportunidade(_oportunidade(eligibility_status="validada"), "oportunidade", "partner")


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
