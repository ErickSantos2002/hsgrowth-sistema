"""Retroativo: seleciona os cards gestorhs.os já em Ganho e usa proposta 2 como padrão."""
import pytest

from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList
from scripts.retroagir_ganho_gestorhs import PROPOSTA_RETROATIVO_PADRAO, cards_em_ganho, numero_para_envio


@pytest.fixture
def board(db):
    b = ServiceBoard(name="Serviços")
    db.add(b); db.commit()
    ganho = ServiceList(board_id=b.id, name="Negócio Ganho", position=1, is_done_stage=True)
    aberto = ServiceList(board_id=b.id, name="Aguardando Pedido", position=0)
    db.add_all([ganho, aberto]); db.commit(); db.refresh(ganho); db.refresh(aberto)
    return {"db": db, "ganho": ganho, "aberto": aberto}


def test_seleciona_so_gestorhs_os_em_ganho(board):
    db = board["db"]
    em_ganho = ServiceCard(list_id=board["ganho"].id, title="A", external_source="gestorhs.os", external_id="42")
    fora = ServiceCard(list_id=board["aberto"].id, title="B", external_source="gestorhs.os", external_id="43")
    humano = ServiceCard(list_id=board["ganho"].id, title="C")  # sem external_source
    cobranca = ServiceCard(list_id=board["ganho"].id, title="D", external_source="gestorhs.calibracao", external_id="9:1")
    db.add_all([em_ganho, fora, humano, cobranca]); db.commit()

    ids = {c.id for c in cards_em_ganho(db)}
    assert ids == {em_ganho.id}


def test_seleciona_ganho_por_nome_sem_is_done_stage(board):
    db = board["db"]
    lista_nome = ServiceList(board_id=board["ganho"].board_id, name="Negócio Ganho (nome)", position=2, is_done_stage=False)
    db.add(lista_nome); db.commit(); db.refresh(lista_nome)
    card = ServiceCard(list_id=lista_nome.id, title="E", external_source="gestorhs.os", external_id="99")
    db.add(card); db.commit()
    ids = {c.id for c in cards_em_ganho(db)}
    assert card.id in ids


def test_numero_para_envio_usa_padrao_quando_ausente():
    assert numero_para_envio({}) == PROPOSTA_RETROATIVO_PADRAO
    assert numero_para_envio({"proposal_number": 7}) == 7
    assert numero_para_envio(None) == PROPOSTA_RETROATIVO_PADRAO
    assert PROPOSTA_RETROATIVO_PADRAO == 2
