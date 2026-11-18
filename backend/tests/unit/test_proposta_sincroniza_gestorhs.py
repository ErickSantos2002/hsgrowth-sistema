"""Trocar o número da proposta de um card gestorhs.os confere com o GestorHS antes de gravar."""
import pytest
from fastapi import HTTPException

from app.core.security import hash_password
from app.integrations.gestorhs_client import GestorHSIndisponivel, GestorHSRecusou
from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_list import ServiceList
from app.models.user import User
from app.schemas.service_board import ServiceCardUpdate
from app.services.service_board_service import ServiceBoardService

MSG_503 = "Não consegui confirmar o número da proposta com o GestorHS. Tente de novo."


@pytest.fixture
def cenario(db):
    role = Role(name="admin", display_name="Admin", permissions=[])
    db.add(role); db.commit()
    user = User(role_id=role.id, email="a@a.com", name="Admin", password_hash=hash_password("x"), is_active=True)
    db.add(user); db.commit(); db.refresh(user)
    board = ServiceBoard(name="Serviços")
    db.add(board); db.commit()
    lista = ServiceList(board_id=board.id, name="Aguardando Pedido", position=0)
    db.add(lista); db.commit(); db.refresh(lista)
    return {"db": db, "user": user, "lista": lista}


def _card(db, lista, **kw):
    kw.setdefault("external_source", "gestorhs.os")
    kw.setdefault("external_id", "1212")
    kw.setdefault("business_info", {"proposal_number": 474, "closing_type": "pedido"})
    c = ServiceCard(list_id=lista.id, title="X", **kw)
    db.add(c); db.commit(); db.refresh(c)
    return c


@pytest.fixture
def chamadas(monkeypatch):
    lista = []

    def _fake(caixa_id, numero, observacao):
        lista.append({"caixa_id": caixa_id, "numero": numero, "observacao": observacao})
        return True

    monkeypatch.setattr("app.integrations.gestorhs_client.trocar_proposta", _fake)
    return lista


def _upd(**biz):
    return ServiceCardUpdate(business_info={"closing_type": "pedido", **biz})


def _atual(db, card):
    db.expire_all()
    return db.get(ServiceCard, card.id)


def _eventos(db, card, tipo):
    return db.query(ServiceCardActivity).filter_by(service_card_id=card.id, activity_type=tipo).all()


def test_troca_chama_gestorhs_e_grava(cenario, chamadas):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["lista"])
    ServiceBoardService(db).update_card(card.id, _upd(proposal_number=476), user)
    assert len(chamadas) == 1
    assert chamadas[0]["caixa_id"] == "1212"
    assert chamadas[0]["numero"] == 476
    assert f"card #{card.id}" in chamadas[0]["observacao"]
    assert "Admin" in chamadas[0]["observacao"]
    assert _atual(db, card).business_info["proposal_number"] == 476
    assert len(_eventos(db, card, "proposal_number_changed")) == 1


def test_recusa_bloqueia_com_422_e_nao_grava(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["lista"])

    def _boom(*a, **k):
        raise GestorHSRecusou("proposta 474 e' do cliente 9")

    monkeypatch.setattr("app.integrations.gestorhs_client.trocar_proposta", _boom)
    data = ServiceCardUpdate(description="novo", business_info={"proposal_number": 476, "closing_type": "pedido"})
    with pytest.raises(HTTPException) as exc:
        ServiceBoardService(db).update_card(card.id, data, user)
    assert exc.value.status_code == 422
    assert exc.value.detail == "proposta 474 e' do cliente 9"
    atual = _atual(db, card)
    assert atual.business_info["proposal_number"] == 474
    assert atual.description != "novo"


def test_indisponivel_bloqueia_com_503(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["lista"])

    def _boom(*a, **k):
        raise GestorHSIndisponivel("fora")

    monkeypatch.setattr("app.integrations.gestorhs_client.trocar_proposta", _boom)
    with pytest.raises(HTTPException) as exc:
        ServiceBoardService(db).update_card(card.id, _upd(proposal_number=476), user)
    assert exc.value.status_code == 503
    assert exc.value.detail == MSG_503
    assert _atual(db, card).business_info["proposal_number"] == 474


def test_integracao_desligada_grava_sem_bloquear(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["lista"])
    monkeypatch.setattr("app.integrations.gestorhs_client.trocar_proposta", lambda *a, **k: False)
    ServiceBoardService(db).update_card(card.id, _upd(proposal_number=476), user)
    assert _atual(db, card).business_info["proposal_number"] == 476
    ev = _eventos(db, card, "proposal_number_changed")
    assert len(ev) == 1 and ev[0].description.endswith("GestorHS não avisado (integração desligada)")


def test_mesmo_numero_string_nao_chama(cenario, chamadas):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["lista"])
    ServiceBoardService(db).update_card(card.id, _upd(proposal_number="474"), user)
    assert chamadas == []
    # o valor é gravado como veio ("474"); o que importa é que continua 474
    assert int(_atual(db, card).business_info["proposal_number"]) == 474
    assert _eventos(db, card, "proposal_number_changed") == []


def test_business_info_none_nao_chama(cenario, chamadas):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["lista"])
    ServiceBoardService(db).update_card(card.id, ServiceCardUpdate(description="novo", business_info=None), user)
    assert chamadas == []


def test_outros_campos_do_resumo_nao_chamam(cenario, chamadas):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["lista"])
    data = ServiceCardUpdate(business_info={"proposal_number": 474, "closing_type": "contrato"})
    ServiceBoardService(db).update_card(card.id, data, user)
    assert chamadas == []
    assert _atual(db, card).business_info["closing_type"] == "contrato"


def test_numero_apagado_nao_chama(cenario, chamadas):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["lista"])
    ServiceBoardService(db).update_card(card.id, _upd(proposal_number=None), user)
    assert chamadas == []
    assert _atual(db, card).business_info["proposal_number"] is None


def test_card_manual_nao_chama(cenario, chamadas):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["lista"], external_source=None, external_id=None)
    ServiceBoardService(db).update_card(card.id, _upd(proposal_number=476), user)
    assert chamadas == []
    assert _atual(db, card).business_info["proposal_number"] == 476


def test_card_os_sem_external_id_nao_chama(cenario, chamadas):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["lista"], external_id=None)
    ServiceBoardService(db).update_card(card.id, _upd(proposal_number=476), user)
    assert chamadas == []
