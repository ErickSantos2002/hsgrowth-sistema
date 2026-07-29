"""O move para Ganho enfileira o aviso ao GestorHS só para cards gestorhs.os."""
import pytest

from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList
from app.models.user import User
from app.core.security import hash_password
from app.services.service_board_service import ServiceBoardService


@pytest.fixture
def cenario(db):
    """Board 1 com uma lista comum e uma lista de Ganho; um usuário admin (passa travas)."""
    role = Role(name="admin", display_name="Admin", permissions=[])
    db.add(role); db.commit()
    user = User(role_id=role.id, email="a@a.com", name="Admin", password_hash=hash_password("x"), is_active=True)
    db.add(user); db.commit(); db.refresh(user)

    board = ServiceBoard(name="Serviços")
    db.add(board); db.commit()
    origem = ServiceList(board_id=board.id, name="Aguardando Pedido", position=0)
    ganho = ServiceList(board_id=board.id, name="Negócio Ganho", position=1, is_done_stage=True)
    db.add_all([origem, ganho]); db.commit(); db.refresh(origem); db.refresh(ganho)
    return {"db": db, "user": user, "origem": origem, "ganho": ganho, "board": board}


def _card(db, lista, **kw):
    c = ServiceCard(list_id=lista.id, title="X", **kw)
    db.add(c); db.commit(); db.refresh(c)
    return c


def test_card_gestorhs_os_enfileira(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"], external_source="gestorhs.os", external_id="42",
                 business_info={"proposal_number": 7})

    chamado = {}
    monkeypatch.setattr(
        "app.workers.tasks.notificar_ganho_gestorhs.delay",
        lambda caixa_id, numero_proposta, observacao: chamado.update(
            caixa_id=caixa_id, numero_proposta=numero_proposta, observacao=observacao),
    )

    ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user)

    assert chamado["caixa_id"] == "42"
    assert chamado["numero_proposta"] == 7
    assert "card #" in chamado["observacao"]


def test_card_humano_nao_enfileira(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"])  # sem external_source

    chamado = {"n": 0}
    monkeypatch.setattr("app.workers.tasks.notificar_ganho_gestorhs.delay",
                        lambda *a, **k: chamado.update(n=chamado["n"] + 1))
    ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user)
    assert chamado["n"] == 0


def test_card_cobranca_nao_enfileira(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"], external_source="gestorhs.calibracao", external_id="500:2026-07")

    chamado = {"n": 0}
    monkeypatch.setattr("app.workers.tasks.notificar_ganho_gestorhs.delay",
                        lambda *a, **k: chamado.update(n=chamado["n"] + 1))
    ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user)
    assert chamado["n"] == 0


def test_falha_ao_enfileirar_nao_quebra_o_ganho(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"], external_source="gestorhs.os", external_id="42",
                 business_info={"proposal_number": 7})

    def explode(*a, **k):
        raise RuntimeError("broker fora")
    monkeypatch.setattr("app.workers.tasks.notificar_ganho_gestorhs.delay", explode)

    # Não deve levantar — o card ainda vira Ganho.
    moved = ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user)
    assert moved.list_id == cenario["ganho"].id
