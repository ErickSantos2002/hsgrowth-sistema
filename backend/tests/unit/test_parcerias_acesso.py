"""Quem enxerga o quê em Parcerias. Parceiro nunca vê dado de outro parceiro."""
import pytest
from fastapi import HTTPException

from app.models.partner_activity import PartnerActivity
from app.services.parcerias import acesso, atividades

from tests.unit.apoio_parcerias import oportunidade, parceiro, usuario


def test_parceiro_nao_enxerga_oportunidade_de_outro(db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    user_a = usuario(db, "partner", "a@dmap.com", a)
    op_b = oportunidade(db, b)

    with pytest.raises(HTTPException) as erro:
        acesso.buscar_oportunidade(db, user_a, op_b.id)
    assert erro.value.status_code == 404
    assert acesso.oportunidades_visiveis(db, user_a).count() == 0


def test_parceiro_nao_abre_card_de_outro_parceiro(db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    user_a = usuario(db, "partner", "a@dmap.com", a)

    with pytest.raises(HTTPException) as erro:
        acesso.buscar_parceiro(db, user_a, b.id)
    assert erro.value.status_code == 404
    assert acesso.buscar_parceiro(db, user_a, a.id).id == a.id


def test_financeiro_enxerga_todas(db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    oportunidade(db, a)
    oportunidade(db, b)
    financeiro = usuario(db, "finance", "fin@hs.com")

    assert acesso.oportunidades_visiveis(db, financeiro).count() == 2


def test_login_de_parceiro_sem_vinculo_e_barrado(db):
    solto = usuario(db, "partner", "solto@x.com")

    with pytest.raises(HTTPException) as erro:
        acesso.oportunidades_visiveis(db, solto)
    assert erro.value.status_code == 403


def test_financeiro_nao_altera_cards(db):
    with pytest.raises(HTTPException) as erro:
        acesso.exigir_escrita(usuario(db, "finance", "fin@hs.com"))
    assert erro.value.status_code == 403


def test_evento_vai_para_o_historico(db):
    p = parceiro(db)
    atividades.registrar_evento(db, None, "Parceiro cadastrado", partner_id=p.id)
    db.commit()

    [evento] = db.query(PartnerActivity).filter(PartnerActivity.partner_id == p.id).all()
    assert evento.category == "alteracao"
    assert evento.description == "Parceiro cadastrado"
