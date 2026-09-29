"""Mover aparelhos entre cards do mesmo CNPJ (mesmo board, só em aberto)."""
import pytest
from fastapi import HTTPException

from app.models.client import Client
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_card_product import ServiceCardProduct
from app.models.service_list import ServiceList
from app.models.service_product import ServiceProduct
from app.schemas.service_board import PullDevicesRequest, PullDevicesItem
from app.services.service_board_service import ServiceBoardService


@pytest.fixture
def cenario(db):
    b = ServiceBoard(name="Cobrança"); outro = ServiceBoard(name="Serviços")
    db.add_all([b, outro]); db.commit()
    aberta = ServiceList(board_id=b.id, name="Oportunidade Existente", position=0)
    ganho = ServiceList(board_id=b.id, name="Negócio Ganho", position=1, is_done_stage=True)
    aberta_outro = ServiceList(board_id=outro.id, name="Entrada", position=0)
    cli = Client(name="Terraço"); cli2 = Client(name="Outro CNPJ")
    mod = ServiceProduct(name="IBlow 10"); mod2 = ServiceProduct(name="Mercury")
    db.add_all([aberta, ganho, aberta_outro, cli, cli2, mod, mod2]); db.commit()

    def card(lista, cliente, titulo):
        c = ServiceCard(list_id=lista.id, client_id=cliente.id if cliente else None, title=titulo)
        db.add(c); db.commit(); db.refresh(c); return c

    origem = card(aberta, cli, "Atrasados")
    destino = card(aberta, cli, "A vencer")
    aps = [{"serial_number": f"S{i}", "model": "IBlow 10"} for i in range(5)]
    db.add(ServiceCardProduct(service_card_id=origem.id, product_id=mod.id,
                              quantity=5, unit_price=0, discount=0, aparelhos=aps))
    db.commit()
    return {"db": db, "b": b, "aberta": aberta, "ganho": ganho, "aberta_outro": aberta_outro,
            "cli": cli, "cli2": cli2, "mod": mod, "mod2": mod2,
            "origem": origem, "destino": destino, "card": card}


def _linha(db, card_id, product_id):
    return (db.query(ServiceCardProduct)
            .filter_by(service_card_id=card_id, product_id=product_id).first())


def _pull(c, items):
    return ServiceBoardService(c["db"]).pull_devices(
        c["b"].id, c["destino"].id,
        PullDevicesRequest(from_card_id=c["origem"].id, items=items), None)


def test_related_lista_so_mesmo_cnpj_board_e_aberto(cenario):
    c = cenario
    c["card"](c["aberta"], c["cli2"], "Outro cliente")     # CNPJ diferente
    c["card"](c["ganho"], c["cli"], "Fechado")             # fechado
    c["card"](c["aberta_outro"], c["cli"], "Outro board")  # outro board
    rel = ServiceBoardService(c["db"]).list_related_devices(c["b"].id, c["destino"].id)
    assert [r.id for r in rel] == [c["origem"].id]
    assert rel[0].products[0].quantity == 5


def test_related_card_sem_cliente_retorna_vazio(cenario):
    c = cenario
    sem = c["card"](c["aberta"], None, "Sem cliente")
    assert ServiceBoardService(c["db"]).list_related_devices(c["b"].id, sem.id) == []


def test_mover_individual_cria_linha_no_destino(cenario):
    c = cenario
    r = _pull(c, [PullDevicesItem(product_id=c["mod"].id, indices=[0, 2, 4])])
    db = c["db"]; db.expire_all()
    src = _linha(db, c["origem"].id, c["mod"].id)
    dst = _linha(db, c["destino"].id, c["mod"].id)
    assert src.quantity == 2 and [a["serial_number"] for a in src.aparelhos] == ["S1", "S3"]
    assert dst.quantity == 3 and [a["serial_number"] for a in dst.aparelhos] == ["S0", "S2", "S4"]
    assert float(dst.discount) == 0
    assert r["origin_closed"] is False


def test_mover_mescla_quando_destino_ja_tem_modelo(cenario):
    c = cenario; db = c["db"]
    db.add(ServiceCardProduct(service_card_id=c["destino"].id, product_id=c["mod"].id,
                              quantity=1, unit_price=0, discount=0,
                              aparelhos=[{"serial_number": "D1"}]))
    db.commit()
    _pull(c, [PullDevicesItem(product_id=c["mod"].id, indices=[1])])
    db.expire_all()
    dst = _linha(db, c["destino"].id, c["mod"].id)
    assert dst.quantity == 2 and [a["serial_number"] for a in dst.aparelhos] == ["D1", "S1"]


def test_mover_todos_remove_linha_da_origem(cenario):
    c = cenario
    _pull(c, [PullDevicesItem(product_id=c["mod"].id, all=True)])
    db = c["db"]; db.expire_all()
    assert _linha(db, c["origem"].id, c["mod"].id) is None
    assert _linha(db, c["destino"].id, c["mod"].id).quantity == 5


def test_registra_historico_nos_dois_cards(cenario):
    c = cenario
    _pull(c, [PullDevicesItem(product_id=c["mod"].id, indices=[0])])
    tipos = {(a.service_card_id, a.activity_type) for a in c["db"].query(ServiceCardActivity).all()}
    assert (c["origem"].id, "devices_moved_out") in tipos
    assert (c["destino"].id, "devices_moved_in") in tipos


def test_esvaziar_origem_fecha_como_unificado(cenario):
    c = cenario
    r = _pull(c, [PullDevicesItem(product_id=c["mod"].id, all=True)])
    db = c["db"]; db.expire_all()
    assert r["origin_closed"] is True
    origem = db.get(ServiceCard, c["origem"].id)
    lista = db.get(ServiceList, origem.list_id)
    assert lista.is_lost_stage and lista.board_id == c["b"].id   # lista criada na hora
    acts = db.query(ServiceCardActivity).filter_by(service_card_id=origem.id).all()
    assert any(a.description == "Motivo da perda: Unificado em outro card" for a in acts)
    tipos = {a.activity_type for a in acts}
    assert "card_unified" in tipos and "card_lost" not in tipos


def test_nao_fecha_se_origem_ainda_tem_produto(cenario):
    c = cenario; db = c["db"]
    db.add(ServiceCardProduct(service_card_id=c["origem"].id, product_id=c["mod2"].id,
                              quantity=1, unit_price=0, discount=0,
                              aparelhos=[{"serial_number": "M1"}]))
    db.commit()
    r = _pull(c, [PullDevicesItem(product_id=c["mod"].id, all=True)])
    db.expire_all()
    assert r["origin_closed"] is False
    assert db.get(ServiceCard, c["origem"].id).list_id == c["aberta"].id


def test_fechamento_usa_lista_perdido_existente(cenario):
    c = cenario; db = c["db"]
    perdido = ServiceList(board_id=c["b"].id, name="Negócio Perdido", position=2, is_lost_stage=True)
    db.add(perdido); db.commit()
    _pull(c, [PullDevicesItem(product_id=c["mod"].id, all=True)])
    db.expire_all()
    assert db.get(ServiceCard, c["origem"].id).list_id == perdido.id
    assert db.query(ServiceList).filter_by(board_id=c["b"].id, is_lost_stage=True).count() == 1


@pytest.mark.parametrize("caso", ["cnpj", "fechado", "indice", "vazio", "duplicado", "mesmo"])
def test_validacoes(cenario, caso):
    c = cenario; svc = ServiceBoardService(c["db"])
    item = PullDevicesItem(product_id=c["mod"].id, indices=[0])
    origem_id = c["origem"].id
    items = [item]
    if caso == "cnpj":
        origem_id = c["card"](c["aberta"], c["cli2"], "Outro").id
    elif caso == "fechado":
        c["origem"].list_id = c["ganho"].id; c["db"].commit()
    elif caso == "indice":
        items = [PullDevicesItem(product_id=c["mod"].id, indices=[9])]
    elif caso == "vazio":
        items = [PullDevicesItem(product_id=c["mod"].id, indices=[])]
    elif caso == "duplicado":
        items = [item, item]
    elif caso == "mesmo":
        origem_id = c["destino"].id
    with pytest.raises(HTTPException) as exc:
        svc.pull_devices(c["b"].id, c["destino"].id,
                         PullDevicesRequest(from_card_id=origem_id, items=items), None)
    assert exc.value.status_code == 400
