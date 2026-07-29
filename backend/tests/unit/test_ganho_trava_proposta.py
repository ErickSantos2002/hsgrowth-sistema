"""Board 1: Ganho exige business_info.proposal_number preenchido."""
import pytest
from fastapi import HTTPException

from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList
from app.services.service_board_service import ServiceBoardService


@pytest.fixture
def board1(db):
    b = ServiceBoard(name="Serviços")
    db.add(b); db.commit()
    origem = ServiceList(board_id=b.id, name="Aguardando Pedido", position=0)
    ganho = ServiceList(board_id=b.id, name="Negócio Ganho", position=1, is_done_stage=True)
    db.add_all([origem, ganho]); db.commit(); db.refresh(origem); db.refresh(ganho)
    return {"db": db, "origem": origem, "ganho": ganho}


def _mk(db, lista, biz):
    # Com OC anexada, para isolar a pendência do número da proposta.
    from app.models.service_card_activity import ServiceCardActivity
    c = ServiceCard(list_id=lista.id, title="X", business_info=biz)
    db.add(c); db.commit(); db.refresh(c)
    db.add(ServiceCardActivity(service_card_id=c.id, category="arquivo",
                               activity_type="file", description="oc.pdf",
                               activity_metadata={"doc_slot": "oc"}))
    db.commit()
    return c


def test_sem_numero_proposta_bloqueia(board1):
    db = board1["db"]
    card = _mk(db, board1["origem"], {})
    with pytest.raises(HTTPException) as exc:
        ServiceBoardService(db)._validate_advance(card, board1["origem"], board1["ganho"])
    assert exc.value.status_code == 400
    assert "proposta" in exc.value.detail.lower()


def test_com_numero_proposta_passa(board1):
    db = board1["db"]
    card = _mk(db, board1["origem"], {"proposal_number": 7})
    # Não deve levantar.
    ServiceBoardService(db)._validate_advance(card, board1["origem"], board1["ganho"])


def test_numero_zero_ou_vazio_bloqueia(board1):
    db = board1["db"]
    for valor in (0, "", None):
        card = _mk(db, board1["origem"], {"proposal_number": valor})
        with pytest.raises(HTTPException):
            ServiceBoardService(db)._validate_advance(card, board1["origem"], board1["ganho"])
