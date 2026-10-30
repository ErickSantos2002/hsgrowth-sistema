"""Ativação → Ativado sozinho, na primeira evidência de uso do canal."""
from app.models.partner_activity import PartnerActivity
from app.services.parcerias import ativacao

from tests.unit.apoio_parcerias import oportunidade, parceiro_pronto


def test_evidencia_com_parceiro_em_ativacao_ativa_na_hora(db):
    p = parceiro_pronto(db, stage="ativacao")
    op = oportunidade(db, p)

    ativacao.registrar_evidencia(db, op, "oportunidade_validada", None)
    db.commit()
    db.refresh(p)

    assert p.stage == "ativado"
    assert p.activation_evidence == "oportunidade_validada"
    assert p.activation_opportunity_id == op.id
    assert p.activated_at is not None
    eventos = [a.description for a in db.query(PartnerActivity).filter(PartnerActivity.partner_id == p.id)]
    assert any("ativado automaticamente" in e for e in eventos)


def test_evidencia_antes_da_ativacao_fica_guardada(db):
    p = parceiro_pronto(db, stage="onboarding")
    op = oportunidade(db, p)

    ativacao.registrar_evidencia(db, op, "proposta_enviada", None)
    db.commit()
    assert p.stage == "onboarding"
    assert p.activation_evidence == "proposta_enviada"

    p.stage = "ativacao"
    assert ativacao.promover_se_ativo(db, p, None) is True
    assert p.stage == "ativado"


def test_a_primeira_evidencia_vale(db):
    p = parceiro_pronto(db, stage="onboarding")
    primeira, segunda = oportunidade(db, p), oportunidade(db, p, title="Outra")

    ativacao.registrar_evidencia(db, primeira, "oportunidade_validada", None)
    ativacao.registrar_evidencia(db, segunda, "primeira_venda", None)
    db.commit()

    assert p.activation_evidence == "oportunidade_validada"
    assert p.activation_opportunity_id == primeira.id


def test_sem_evidencia_fica_em_ativacao(db):
    p = parceiro_pronto(db, stage="ativacao")

    assert ativacao.promover_se_ativo(db, p, None) is False
    assert p.stage == "ativacao"
