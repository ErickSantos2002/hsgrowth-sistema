"""Busca geral (Ctrl+K): Vendas e Serviço por título, cliente, CNPJ, contato e nº de série."""
from types import SimpleNamespace

import pytest

from app.models.board import Board
from app.models.card import Card
from app.models.client import Client
from app.models.list import List as BoardList
from app.models.person import Person
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_product import ServiceCardProduct
from app.models.service_list import ServiceList
from app.models.service_product import ServiceProduct
from app.services.global_search_service import GlobalSearchService


def _user(role):
    return SimpleNamespace(role=SimpleNamespace(name=role))


@pytest.fixture
def base(db):
    cli = Client(name="Construtora Terraço", document="19.235.340/0001-20")
    pes = Person(name="Joana Compras")
    b = Board(name="Aquisição"); sb = ServiceBoard(name="Cobrança")
    db.add_all([cli, pes, b, sb]); db.commit()
    lst = BoardList(board_id=b.id, name="Proposta", position=0)
    slst = ServiceList(board_id=sb.id, name="Oportunidade Existente", position=0)
    mod = ServiceProduct(name="IBlow 10")
    db.add_all([lst, slst, mod]); db.commit()

    venda = Card(list_id=lst.id, title="Proposta bafômetros", client_id=cli.id, person_id=pes.id)
    apagado = Card(list_id=lst.id, title="Proposta antiga", is_deleted=True)
    com_prod = ServiceCard(list_id=slst.id, title="Calibração vencendo", client_id=cli.id,
                           business_info={"equipamentos": [{"serial_number": "OLD999"}]})
    sem_prod = ServiceCard(list_id=slst.id, title="Calibração vencida",
                           business_info={"equipamentos": [{"serial_number": "INT555", "alcohol_module": "MOD77"}]})
    db.add_all([venda, apagado, com_prod, sem_prod]); db.commit()
    db.add(ServiceCardProduct(service_card_id=com_prod.id, product_id=mod.id, quantity=1, unit_price=0,
                              discount=0, aparelhos=[{"serial_number": "AB123", "alcohol_module": "M-42"}]))
    db.commit()
    return {"db": db, "venda": venda, "com_prod": com_prod, "sem_prod": sem_prod, "sb": sb}


def _ids(results):
    return [r.id for r in results]


def test_vendas_por_titulo_ignora_apagado(base):
    r = GlobalSearchService(base["db"]).search("Proposta", _user("salesperson"))
    assert _ids(r.vendas) == [base["venda"].id]
    assert r.vendas[0].matched_on == "Título"


@pytest.mark.parametrize("termo", ["19.235.340/0001-20", "19235340000120", "2353400"])
def test_vendas_e_servico_por_cnpj_com_ou_sem_pontuacao(base, termo):
    r = GlobalSearchService(base["db"]).search(termo, _user("admin"))
    assert _ids(r.vendas) == [base["venda"].id]
    assert _ids(r.servico) == [base["com_prod"].id]
    assert r.vendas[0].matched_on == "CNPJ/CPF"


def test_vendas_por_cliente_e_contato(base):
    svc = GlobalSearchService(base["db"])
    assert svc.search("terraço", _user("salesperson")).vendas[0].matched_on == "Cliente"
    assert svc.search("joana", _user("salesperson")).vendas[0].matched_on == "Contato"


def test_servico_por_serie_e_modulo_dos_produtos(base):
    svc = GlobalSearchService(base["db"])
    for termo in ("ab123", "M-42"):
        r = svc.search(termo, _user("service"))
        assert _ids(r.servico) == [base["com_prod"].id]
        assert r.servico[0].matched_on == "Nº de série/módulo"


def test_servico_registro_integracao_so_vale_sem_produtos(base):
    svc = GlobalSearchService(base["db"])
    # OLD999 está só no registro da integração de um card QUE TEM produtos → não acha
    assert svc.search("OLD999", _user("admin")).servico == []
    # INT555/MOD77 estão no registro de um card SEM produtos → acha
    assert _ids(svc.search("INT555", _user("admin")).servico) == [base["sem_prod"].id]
    assert _ids(svc.search("MOD77", _user("admin")).servico) == [base["sem_prod"].id]


def test_nome_de_chave_do_json_nao_da_falso_positivo(base):
    assert GlobalSearchService(base["db"]).search("serial_number", _user("admin")).servico == []


def test_servico_so_para_quem_acessa_o_modulo(base):
    svc = GlobalSearchService(base["db"])
    assert svc.search("Calibração", _user("salesperson")).servico == []
    assert len(svc.search("Calibração", _user("manager")).servico) == 2
    r = svc.search("Calibração", _user("service"))
    assert r.servico[0].board_id == base["sb"].id and r.servico[0].board_name == "Cobrança"
