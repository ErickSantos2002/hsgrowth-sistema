"""Testes da integração GestorHS → hsgrowth (fase 1)."""
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.service_card import ServiceCard


@pytest.fixture
def board_servicos(db):
    board = ServiceBoard(name="Serviços")
    db.add(board)
    db.commit()
    db.refresh(board)
    return board


@pytest.fixture
def lista_entrada(db, board_servicos):
    lista = ServiceList(board_id=board_servicos.id, name="Dados Preenchidos", position=0)
    db.add(lista)
    db.commit()
    db.refresh(lista)
    return lista


def test_sources_diferentes_com_mesmo_external_id_coexistem(db, lista_entrada):
    """OS 500 e calibração 500 são cards distintos — o source namespaceia o id."""
    db.add(ServiceCard(
        list_id=lista_entrada.id, title="OS 500",
        external_source="gestorhs.os", external_id="500",
    ))
    db.add(ServiceCard(
        list_id=lista_entrada.id, title="Calibração 500",
        external_source="gestorhs.calibracao", external_id="500",
    ))
    db.commit()

    assert db.query(ServiceCard).count() == 2


def test_mesmo_par_source_external_id_e_rejeitado(db, lista_entrada):
    db.add(ServiceCard(
        list_id=lista_entrada.id, title="OS 500",
        external_source="gestorhs.os", external_id="500",
    ))
    db.commit()

    db.add(ServiceCard(
        list_id=lista_entrada.id, title="OS 500 duplicada",
        external_source="gestorhs.os", external_id="500",
    ))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_cards_humanos_sem_identidade_externa_nao_colidem(db, lista_entrada):
    """Vários cards com as duas colunas NULL têm que conviver."""
    for i in range(3):
        db.add(ServiceCard(list_id=lista_entrada.id, title=f"Card manual {i}"))
    db.commit()

    assert db.query(ServiceCard).filter(ServiceCard.external_id.is_(None)).count() == 3
