"""Resolução de aparelhos do GestorHS em produtos do catálogo de Serviços."""
import pytest

from app.models.service_product import ServiceProduct
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_product import ServiceCardProduct
from app.models.service_list import ServiceList
from app.services.gestorhs_product_resolver import (
    EXTERNAL_SOURCE,
    aplicar_aparelhos_ao_card,
    normalizar_modelo,
    resolver_produto,
)


@pytest.fixture
def card(db):
    board = ServiceBoard(name="Cobrança")
    db.add(board)
    db.commit()
    lista = ServiceList(board_id=board.id, name="Oportunidade Existente", position=0)
    db.add(lista)
    db.commit()
    c = ServiceCard(list_id=lista.id, title="Calibração vencida · Cliente X")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


# ─── normalização ─────────────────────────────────────────────────────────────

def test_normalizar_ignora_caixa_acento_e_espaco():
    assert normalizar_modelo("  Bafômetro MERCURY  ") == normalizar_modelo("bafometro mercury")


def test_normalizar_distingue_modelos_realmente_diferentes():
    """Mark X e Mark X com impressora são aparelhos distintos — não podem colapsar."""
    a = normalizar_modelo("Bafômetro Mark X - Plus")
    b = normalizar_modelo("Bafômetro Mark X - Plus - COM IMPRESSORA")
    assert a != b


def test_normalizar_modelo_vazio_devolve_vazio():
    assert normalizar_modelo(None) == ""
    assert normalizar_modelo("   ") == ""


# ─── find-or-create do produto ────────────────────────────────────────────────

def test_cria_produto_novo_marcado_com_a_origem(db):
    p = resolver_produto(db, "HS PASS - IBLOW")
    db.commit()

    assert p.id is not None
    assert p.name == "HS PASS - IBLOW"          # preserva o nome original do GestorHS
    assert p.external_source == EXTERNAL_SOURCE
    assert p.external_ref == normalizar_modelo("HS PASS - IBLOW")
    assert not hasattr(p, "unit_price")   # catalogo de Servicos nao guarda preco
    assert p.category == "Equipamento GestorHS"


def test_reaproveita_o_mesmo_produto_para_o_mesmo_modelo(db):
    a = resolver_produto(db, "Bafômetro Mercury")
    db.commit()
    b = resolver_produto(db, "  bafometro   MERCURY ")
    db.commit()

    assert a.id == b.id
    assert db.query(ServiceProduct).filter(ServiceProduct.external_source == EXTERNAL_SOURCE).count() == 1


def test_nao_sequestra_produto_do_catalogo_de_vendas(db):
    """Produto de Vendas com nome parecido não pode ser reusado nem alterado."""
    vendas = ServiceProduct(name="Bocal Mercury 100 unid.")
    db.add(vendas)
    db.commit()

    p = resolver_produto(db, "Bafômetro Mercury")
    db.commit()

    assert p.id != vendas.id
    assert vendas.external_source is None


# ─── aplicação no card ────────────────────────────────────────────────────────

def test_agrupa_aparelhos_por_modelo_em_um_produto_cada(db, card):
    devices = [
        {"serial_number": "A1", "model": "Bafômetro Mercury"},
        {"serial_number": "A2", "model": "Bafômetro Mercury"},
        {"serial_number": "B1", "model": "Bafômetro Mark X - Plus"},
    ]

    itens = aplicar_aparelhos_ao_card(db, card, devices)
    db.commit()

    assert len(itens) == 2
    por_nome = {i.product.name: i for i in itens}
    assert por_nome["Bafômetro Mercury"].quantity == 2
    assert len(por_nome["Bafômetro Mercury"].aparelhos) == 2
    assert por_nome["Bafômetro Mark X - Plus"].quantity == 1


def test_preserva_os_campos_do_aparelho(db, card):
    devices = [{
        "serial_number": "AB123", "model": "Phoebus",
        "alcohol_module": "M-99", "next_recalibration_date": "2026-01-10",
    }]

    itens = aplicar_aparelhos_ao_card(db, card, devices)
    db.commit()

    ap = itens[0].aparelhos[0]
    assert ap["serial_number"] == "AB123"
    assert ap["alcohol_module"] == "M-99"
    assert ap["next_recalibration_date"] == "2026-01-10"


def test_e_idempotente_nao_duplica_ao_rodar_de_novo(db, card):
    """Rodar o retroativo duas vezes no mesmo card não pode duplicar vínculo."""
    devices = [{"serial_number": "A1", "model": "Titan"}]

    aplicar_aparelhos_ao_card(db, card, devices)
    db.commit()
    aplicar_aparelhos_ao_card(db, card, devices)
    db.commit()

    assert db.query(ServiceCardProduct).filter_by(service_card_id=card.id).count() == 1


def test_nao_sobrescreve_produto_que_o_vendedor_ja_montou(db, card):
    """Se o vendedor já preencheu aparelhos à mão, o retroativo não mexe."""
    p = resolver_produto(db, "Deimos")
    db.commit()
    db.add(ServiceCardProduct(
        service_card_id=card.id, product_id=p.id, quantity=1, unit_price=0,
        aparelhos=[{"serial_number": "DIGITADO-A-MAO"}],
    ))
    db.commit()

    aplicar_aparelhos_ao_card(db, card, [{"serial_number": "A1", "model": "Deimos"}])
    db.commit()

    item = db.query(ServiceCardProduct).filter_by(service_card_id=card.id).one()
    assert item.aparelhos[0]["serial_number"] == "DIGITADO-A-MAO"


def test_ignora_aparelho_sem_modelo(db, card):
    itens = aplicar_aparelhos_ao_card(db, card, [
        {"serial_number": "A1", "model": "Titan"},
        {"serial_number": "A2", "model": None},
        {"serial_number": "A3"},
    ])
    db.commit()

    assert len(itens) == 1
    assert itens[0].quantity == 1


def test_lista_vazia_nao_cria_nada(db, card):
    assert aplicar_aparelhos_ao_card(db, card, []) == []
    assert aplicar_aparelhos_ao_card(db, card, None) == []
    db.commit()
    assert db.query(ServiceCardProduct).filter_by(service_card_id=card.id).count() == 0
