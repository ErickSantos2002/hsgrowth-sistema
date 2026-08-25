"""O move para Ganho avisa o GestorHS só para cards gestorhs.os.

O aviso sai em background dentro do próprio processo da API (BackgroundTasks),
não por Celery: em produção não há worker consumindo a fila, então a task
enfileirada nunca era executada. Ver docs/integracao-gestorhs.md.
"""
import pytest
from starlette.background import BackgroundTasks

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


@pytest.fixture
def enviados(monkeypatch):
    """Captura as chamadas ao cliente do GestorHS (o efeito que importa)."""
    chamadas = []
    monkeypatch.setattr(
        "app.integrations.gestorhs_client.mover_caixa_ganho",
        lambda caixa_id, numero_proposta, observacao: chamadas.append(
            {"caixa_id": caixa_id, "numero_proposta": numero_proposta, "observacao": observacao}),
    )
    return chamadas


@pytest.fixture(autouse=True)
def _sem_espera(monkeypatch):
    """As retentativas do envio dormem entre si — não faz sentido esperar no teste."""
    monkeypatch.setattr("app.services.service_board_service.time.sleep", lambda s: None)


def _executar(bg: BackgroundTasks) -> None:
    """Roda as tasks agendadas como o FastAPI faria depois de responder."""
    for t in bg.tasks:
        t.func(*t.args, **t.kwargs)


def test_card_gestorhs_os_agenda_o_aviso(cenario, enviados):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"], external_source="gestorhs.os", external_id="42",
                 business_info={"proposal_number": 7})
    bg = BackgroundTasks()

    ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user, background_tasks=bg)

    # Agendado, e não enviado durante o request.
    assert len(bg.tasks) == 1
    assert enviados == []

    _executar(bg)
    assert len(enviados) == 1
    assert enviados[0]["caixa_id"] == "42"
    assert enviados[0]["numero_proposta"] == 7
    assert "card #" in enviados[0]["observacao"]


def test_sem_background_tasks_envia_na_hora(cenario, enviados):
    """Chamadores fora do request (scripts) continuam funcionando: envia inline."""
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"], external_source="gestorhs.os", external_id="42",
                 business_info={"proposal_number": 7})

    ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user)

    assert len(enviados) == 1
    assert enviados[0]["caixa_id"] == "42"


def test_card_humano_nao_agenda(cenario, enviados):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"])  # sem external_source
    bg = BackgroundTasks()

    ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user, background_tasks=bg)

    assert bg.tasks == []
    assert enviados == []


def test_card_cobranca_nao_agenda(cenario, enviados):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"], external_source="gestorhs.calibracao", external_id="500:2026-07")
    bg = BackgroundTasks()

    ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user, background_tasks=bg)

    assert bg.tasks == []
    assert enviados == []


def test_falha_no_envio_nao_quebra_o_ganho(cenario, monkeypatch):
    """O GestorHS fora do ar não pode impedir o card de virar Ganho."""
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"], external_source="gestorhs.os", external_id="42",
                 business_info={"proposal_number": 7})

    def explode(*a, **k):
        raise RuntimeError("GestorHS fora")
    monkeypatch.setattr("app.integrations.gestorhs_client.mover_caixa_ganho", explode)

    bg = BackgroundTasks()
    moved = ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user, background_tasks=bg)
    assert moved.list_id == cenario["ganho"].id

    # E a task em background também engole a falha (roda fora do request).
    _executar(bg)


def test_falha_inline_nao_quebra_o_ganho(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"], external_source="gestorhs.os", external_id="42",
                 business_info={"proposal_number": 7})

    def explode(*a, **k):
        raise RuntimeError("GestorHS fora")
    monkeypatch.setattr("app.integrations.gestorhs_client.mover_caixa_ganho", explode)

    moved = ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user)
    assert moved.list_id == cenario["ganho"].id
