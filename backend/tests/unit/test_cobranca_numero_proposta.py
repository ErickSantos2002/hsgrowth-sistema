"""Cobrança (board 2) com Número da proposta no Resumo (1.11.34).

- Proposta → Operações exige o número; o anexo da Proposta ficou opcional (igual ao Serviço).
- O número fica só no CRM: card de Cobrança não chama o GestorHS.
- A troca do número entra no histórico do card.
"""
import pytest
from fastapi import HTTPException

from app.core.security import hash_password
from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_list import ServiceList
from app.models.user import User
from app.schemas.service_board import ServiceCardUpdate
from app.services.service_board_service import ServiceBoardService


@pytest.fixture
def cobranca(db):
    role = Role(name="admin", display_name="Admin", permissions=[])
    db.add(role); db.commit()
    user = User(role_id=role.id, email="c@c.com", name="Cobrador", password_hash=hash_password("x"), is_active=True)
    db.add(user); db.commit(); db.refresh(user)
    db.add(ServiceBoard(id=1, name="Serviços")); db.commit()
    db.add(ServiceBoard(id=2, name="Serviço Cobrança")); db.commit()
    proposta = ServiceList(board_id=2, name="Proposta", position=5)
    operacoes = ServiceList(board_id=2, name="Operações", position=6)
    db.add_all([proposta, operacoes]); db.commit()
    return {"db": db, "user": user, "proposta": proposta, "operacoes": operacoes}


def _card(cena, **biz):
    db = cena["db"]
    proximo = db.query(ServiceCard).count() + 1
    c = ServiceCard(list_id=cena["proposta"].id, title="Cobrança X", external_source="gestorhs.atrasados",
                    external_id=str(500 + proximo), business_info={"form_answered": True, **biz})
    db.add(c); db.commit(); db.refresh(c)
    return c


def _avancar(cena, card):
    ServiceBoardService(cena["db"])._validate_advance(card, cena["proposta"], cena["operacoes"])


def _eventos(db, card):
    return (db.query(ServiceCardActivity)
            .filter_by(service_card_id=card.id, activity_type="proposal_number_changed").all())


@pytest.fixture
def gestorhs(monkeypatch):
    chamadas = []
    monkeypatch.setattr("app.integrations.gestorhs_client.trocar_proposta",
                        lambda *a, **k: chamadas.append(a) or True)
    return chamadas


def test_proposta_para_operacoes_sem_numero_bloqueia(cobranca):
    card = _card(cobranca)
    with pytest.raises(HTTPException) as exc:
        _avancar(cobranca, card)
    assert exc.value.status_code == 400
    assert "Número da proposta preenchido no Resumo" in exc.value.detail
    # O anexo não é mais exigido.
    assert "anexada" not in exc.value.detail


def test_proposta_para_operacoes_com_numero_passa_sem_anexo(cobranca):
    _avancar(cobranca, _card(cobranca, proposal_number=1234))


def test_numero_zero_ou_texto_invalido_nao_vale(cobranca):
    for valor in (0, "", "abc"):
        with pytest.raises(HTTPException):
            _avancar(cobranca, _card(cobranca, proposal_number=valor))


def test_formulario_continua_obrigatorio(cobranca):
    card = _card(cobranca, proposal_number=1234, form_answered=False)
    with pytest.raises(HTTPException) as exc:
        _avancar(cobranca, card)
    assert "Formulário de Coleta de Dados" in exc.value.detail


def test_salvar_numero_nao_chama_gestorhs_e_registra_no_historico(cobranca, gestorhs):
    db, user = cobranca["db"], cobranca["user"]
    card = _card(cobranca)
    svc = ServiceBoardService(db)

    svc.update_card(card.id, ServiceCardUpdate(business_info={"form_answered": True, "proposal_number": 1234}), user)
    svc.update_card(card.id, ServiceCardUpdate(business_info={"form_answered": True, "proposal_number": 1240}), user)
    # Salvar de novo com o mesmo número não registra nada.
    svc.update_card(card.id, ServiceCardUpdate(business_info={"form_answered": True, "proposal_number": "1240"}), user)
    svc.update_card(card.id, ServiceCardUpdate(business_info={"form_answered": True, "proposal_number": None}), user)

    assert gestorhs == []
    textos = [e.description for e in _eventos(db, card)]
    assert textos == [
        "Número da proposta alterado de (nenhum) para #1234",
        "Número da proposta alterado de #1234 para #1240",
        "Número da proposta #1240 removido",
    ]


def test_salvar_outro_campo_do_resumo_nao_registra(cobranca):
    db, user = cobranca["db"], cobranca["user"]
    card = _card(cobranca, proposal_number=1234)
    ServiceBoardService(db).update_card(
        card.id, ServiceCardUpdate(business_info={"form_answered": True, "proposal_number": 1234, "shipping_confirmed": "sim"}), user)
    assert _eventos(db, card) == []
