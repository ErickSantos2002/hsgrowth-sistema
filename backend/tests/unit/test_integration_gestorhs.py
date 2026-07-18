"""Testes da integração GestorHS → hsgrowth (fase 1)."""
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.service_card import ServiceCard
from app.repositories.service_board_repository import ServiceBoardRepository
from app.services.service_board_service import ServiceBoardService


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


def test_find_entry_list_retorna_a_lista_marcada(db, board_servicos):
    db.add(ServiceList(board_id=board_servicos.id, name="Triagem", position=0))
    entrada = ServiceList(
        board_id=board_servicos.id, name="Dados Preenchidos", position=1, is_entry_stage=True
    )
    db.add(entrada)
    db.commit()

    achada = ServiceBoardRepository(db).find_entry_list(board_servicos.id)

    assert achada is not None
    assert achada.name == "Dados Preenchidos"


def test_find_entry_list_retorna_none_sem_etapa_marcada(db, board_servicos):
    db.add(ServiceList(board_id=board_servicos.id, name="Triagem", position=0))
    db.commit()

    assert ServiceBoardRepository(db).find_entry_list(board_servicos.id) is None


def test_list_lists_expoe_is_entry_stage(db, board_servicos):
    """Sem isso não há como configurar a etapa de entrada a não ser por SQL na mão."""
    db.add(ServiceList(
        board_id=board_servicos.id, name="Entrada", position=0, is_entry_stage=True
    ))
    db.commit()

    listas = ServiceBoardService(db).list_lists(board_servicos.id)

    assert listas[0].is_entry_stage is True


def test_duplicar_board_preserva_a_etapa_de_entrada(db, board_servicos):
    """Duplicar board não pode perder a flag em silêncio."""
    db.add(ServiceList(
        board_id=board_servicos.id, name="Entrada", position=0, is_entry_stage=True
    ))
    db.commit()

    novo = ServiceBoardService(db).duplicate_board(
        board_servicos.id, "Serviços (cópia)", copy_lists=True, user=None
    )

    entrada = ServiceBoardRepository(db).find_entry_list(novo.id)
    assert entrada is not None
    assert entrada.name == "Entrada"


def test_post_lista_com_is_entry_stage_persiste_o_valor(client, admin_headers, db, board_servicos):
    """POST /service-boards/{id}/lists com is_entry_stage=true não pode virar False em silêncio.

    O endpoint remonta o ServiceListCreate campo a campo antes de chamar o service;
    se esquecer de copiar is_entry_stage, o Pydantic aplica o default (False) e o
    valor enviado pelo cliente é descartado sem erro nenhum.
    """
    resp = client.post(
        f"/api/v1/service-boards/{board_servicos.id}/lists",
        json={"board_id": board_servicos.id, "name": "Entrada API", "is_entry_stage": True},
        headers=admin_headers,
    )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["is_entry_stage"] is True

    lst = db.query(ServiceList).filter(ServiceList.id == body["id"]).one()
    assert lst.is_entry_stage is True


def test_put_lista_resposta_expoe_is_entry_stage(client, admin_headers, db, board_servicos):
    """PUT /service-boards/{id}/lists/{id} persiste is_entry_stage corretamente, mas a
    resposta remontada à mão precisa devolver o valor também — senão o cliente da API
    acha que a alteração não colou mesmo o banco estando certo."""
    lista = ServiceList(board_id=board_servicos.id, name="Triagem", position=0)
    db.add(lista)
    db.commit()
    db.refresh(lista)

    resp = client.put(
        f"/api/v1/service-boards/{board_servicos.id}/lists/{lista.id}",
        json={"is_entry_stage": True},
        headers=admin_headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["is_entry_stage"] is True
