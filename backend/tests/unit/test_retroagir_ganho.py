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


def test_numero_para_envio_usa_padrao_quando_ausente():
    assert numero_para_envio({}) == PROPOSTA_RETROATIVO_PADRAO
    assert numero_para_envio({"proposal_number": 7}) == 7
    assert numero_para_envio(None) == PROPOSTA_RETROATIVO_PADRAO
    assert PROPOSTA_RETROATIVO_PADRAO == 2
