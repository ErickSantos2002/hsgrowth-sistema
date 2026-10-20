"""
Os parados da dashboard: o número e a lista usam a mesma regra do filtro
"Parado 3d+" do board.

Em 16/10/2026 a dashboard da Claudia mostrava 1 parado e foi preciso
consultar o banco para achar o card (10945, em Aquisição, não em
Prospecção). E o número não tirava os cards com atividade agendada, que o
board tira desde a v1.10.5.
"""
from datetime import datetime, timedelta

from app.models.board import Board
from app.models.card import Card
from app.models.card_task import CardTask
from app.models.list import List

URL = "/api/v1/reports/dashboard/parados"


def _card(db, lista, titulo, sdr=None, vendedor=None) -> Card:
    card = Card(
        title=titulo,
        list_id=lista.id,
        position=0,
        sdr_id=sdr.id if sdr else None,
        assigned_to_id=vendedor.id if vendedor else None,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def _tarefa(db, card, dias_atras, concluida=True, vence_em_dias=None):
    quando = datetime.utcnow() - timedelta(days=dias_atras)
    vencimento = (
        datetime.utcnow() + timedelta(days=vence_em_dias)
        if vence_em_dias is not None
        else quando
    )
    db.add(CardTask(
        card_id=card.id,
        title="Ligar",
        task_type="call",
        created_at=quando,
        is_completed=concluida,
        completed_at=quando if concluida else None,
        due_date=vencimento,
    ))
    db.commit()


def _parados(client, headers, **params):
    params.setdefault("janela", 3)
    resposta = client.get(URL, params=params, headers=headers)
    assert resposta.status_code == 200, resposta.text
    return resposta.json()["cards"]


def test_lista_o_card_parado(client, db, salesperson_headers, test_lists, test_salesperson_user):
    card = _card(db, test_lists[0], "IMEDIATO NEXWAY", vendedor=test_salesperson_user)
    _tarefa(db, card, dias_atras=20)

    [item] = _parados(client, salesperson_headers)

    assert item["card_id"] == card.id
    assert item["titulo"] == "IMEDIATO NEXWAY"
    assert item["lista"] == test_lists[0].name
    assert item["board"]
    assert item["link"] == f"/cards/{card.id}"
    assert item["dias_parado"] >= 19


def test_card_de_servico_abre_na_pagina_de_servico(client, db, salesperson_headers, test_salesperson_user):
    board = Board(name="Implantação", category="servicos")
    db.add(board)
    db.commit()
    lista = List(name="Kickoff", board_id=board.id, position=0)
    db.add(lista)
    db.commit()
    card = _card(db, lista, "Cliente em implantação", vendedor=test_salesperson_user)
    _tarefa(db, card, dias_atras=20)

    [item] = _parados(client, salesperson_headers)

    assert item["link"] == f"/servicos/{board.id}/cards/{card.id}"


def test_card_com_atividade_agendada_nao_e_parado(client, db, salesperson_headers, test_lists, test_salesperson_user):
    """Mesma regra do board: tem próximo passo marcado, não está parado."""
    card = _card(db, test_lists[0], "Com retorno marcado", vendedor=test_salesperson_user)
    _tarefa(db, card, dias_atras=20)
    _tarefa(db, card, dias_atras=20, concluida=False, vence_em_dias=2)

    assert _parados(client, salesperson_headers) == []


def test_tarefa_atrasada_nao_tira_do_parado(client, db, salesperson_headers, test_lists, test_salesperson_user):
    """Só tarefa de hoje em diante conta como próximo passo; atrasada não."""
    card = _card(db, test_lists[0], "Com tarefa atrasada", vendedor=test_salesperson_user)
    _tarefa(db, card, dias_atras=20, concluida=False, vence_em_dias=-10)

    assert [c["card_id"] for c in _parados(client, salesperson_headers)] == [card.id]


def test_card_movimentado_recentemente_nao_e_parado(client, db, salesperson_headers, test_lists, test_salesperson_user):
    card = _card(db, test_lists[0], "Ativo", vendedor=test_salesperson_user)
    _tarefa(db, card, dias_atras=0)

    assert _parados(client, salesperson_headers) == []


def test_card_sem_nenhuma_atividade_nao_entra(client, db, salesperson_headers, test_lists, test_salesperson_user):
    """Lead novo sem contato fica em 'Leads sem Contato', não em parados."""
    _card(db, test_lists[0], "Nunca tocado", vendedor=test_salesperson_user)

    assert _parados(client, salesperson_headers) == []


def test_numero_da_dashboard_bate_com_a_lista(client, db, salesperson_headers, test_lists, test_salesperson_user):
    parado = _card(db, test_lists[0], "Parado", vendedor=test_salesperson_user)
    _tarefa(db, parado, dias_atras=20)
    agendado = _card(db, test_lists[0], "Agendado", vendedor=test_salesperson_user)
    _tarefa(db, agendado, dias_atras=20)
    _tarefa(db, agendado, dias_atras=20, concluida=False, vence_em_dias=1)

    kpis = client.get("/api/v1/reports/dashboard?period=year", headers=salesperson_headers).json()

    assert kpis["cards_parados"] == len(_parados(client, salesperson_headers)) == 1
    assert kpis["negocios_parados_7d"] == len(_parados(client, salesperson_headers, janela=7)) == 1


def test_janela_de_7_dias(client, db, salesperson_headers, test_lists, test_salesperson_user):
    card = _card(db, test_lists[0], "Parado há 6 dias", vendedor=test_salesperson_user)
    _tarefa(db, card, dias_atras=6)

    assert [c["card_id"] for c in _parados(client, salesperson_headers, janela=3)] == [card.id]
    assert _parados(client, salesperson_headers, janela=7) == []


def test_do_mais_parado_para_o_mais_recente(client, db, salesperson_headers, test_lists, test_salesperson_user):
    recente = _card(db, test_lists[0], "Parado há 10 dias", vendedor=test_salesperson_user)
    _tarefa(db, recente, dias_atras=10)
    antigo = _card(db, test_lists[0], "Parado há 40 dias", vendedor=test_salesperson_user)
    _tarefa(db, antigo, dias_atras=40)

    assert [c["card_id"] for c in _parados(client, salesperson_headers)] == [antigo.id, recente.id]


def test_vendedor_so_ve_os_proprios(client, db, salesperson_headers, test_lists, test_manager_user):
    de_outro = _card(db, test_lists[0], "De outra pessoa", vendedor=test_manager_user)
    _tarefa(db, de_outro, dias_atras=20)

    assert _parados(client, salesperson_headers) == []


def test_gerente_filtra_pela_sdr(client, db, manager_headers, test_lists, test_sdr_user, test_salesperson_user):
    da_sdr = _card(db, test_lists[0], "Da SDR", sdr=test_sdr_user)
    _tarefa(db, da_sdr, dias_atras=20)
    do_vendedor = _card(db, test_lists[0], "Do vendedor", vendedor=test_salesperson_user)
    _tarefa(db, do_vendedor, dias_atras=20)

    cards = _parados(client, manager_headers, user_id=test_sdr_user.id, view="sdr")

    assert [c["card_id"] for c in cards] == [da_sdr.id]
    assert cards[0]["sdr"] == test_sdr_user.name


def test_janela_invalida(client, salesperson_headers):
    resposta = client.get(URL, params={"janela": 5}, headers=salesperson_headers)

    assert resposta.status_code == 422
