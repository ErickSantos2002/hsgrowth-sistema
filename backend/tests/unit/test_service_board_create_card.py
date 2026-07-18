"""Regressão: create_card precisa persistir todos os campos do schema."""
import pytest

from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.repositories.service_board_repository import ServiceBoardRepository
from app.schemas.service_board import ServiceCardCreate


@pytest.fixture
def lista(db):
    board = ServiceBoard(name="Serviços")
    db.add(board)
    db.commit()
    lista = ServiceList(board_id=board.id, name="Entrada", position=0)
    db.add(lista)
    db.commit()
    db.refresh(lista)
    return lista


def test_create_card_persiste_business_info_e_payment_info(db, lista):
    data = ServiceCardCreate(
        list_id=lista.id,
        title="Card com dados",
        business_info={"seller_name": "Sandra", "service_type": "Calibração"},
        payment_info={"payment_method": "PIX", "installments": 1},
    )

    card = ServiceBoardRepository(db).create_card(data)

    assert card.business_info == {"seller_name": "Sandra", "service_type": "Calibração"}
    assert card.payment_info == {"payment_method": "PIX", "installments": 1}


def test_create_card_rejeita_lista_de_outro_board(db, lista):
    """Sem isso, um card pode nascer no meio do funil de outro board."""
    from fastapi import HTTPException
    from app.models.service_board import ServiceBoard
    from app.services.service_board_service import ServiceBoardService

    outro_board = ServiceBoard(name="Cobrança")
    db.add(outro_board)
    db.commit()

    data = ServiceCardCreate(list_id=lista.id, title="Card no board errado")

    with pytest.raises(HTTPException) as exc:
        ServiceBoardService(db).create_card(data, user=None, board_id=outro_board.id)

    assert exc.value.status_code == 400


def test_create_card_aceita_lista_do_proprio_board(db, lista):
    from app.services.service_board_service import ServiceBoardService

    data = ServiceCardCreate(list_id=lista.id, title="Card certo")

    card = ServiceBoardService(db).create_card(data, user=None, board_id=lista.board_id)

    assert card.list_id == lista.id
