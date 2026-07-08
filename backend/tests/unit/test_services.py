"""Testes do catálogo de Serviços e do serviço no card."""
import pytest

from app.services.service_catalog_service import ServiceCatalogService
from app.services.service_board_service import ServiceBoardService
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceCardServiceCreate


# ── Catálogo ───────────────────────────────────────────────────────────────────

def _fake_user():
    from types import SimpleNamespace
    return SimpleNamespace(id=1, name="Tester")


def test_create_service_and_sku_unique(db):
    svc = ServiceCatalogService(db)
    s = svc.create_service(ServiceCreate(name="Calibração X", unit_price=150, sku="CAL-X"), _fake_user())
    assert s.id and s.name == "Calibração X" and s.unit_price == 150.0
    with pytest.raises(Exception):
        svc.create_service(ServiceCreate(name="Outro", unit_price=10, sku="CAL-X"), _fake_user())


def test_list_services_filters_active(db):
    svc = ServiceCatalogService(db)
    a = svc.create_service(ServiceCreate(name="Ativo", unit_price=1), _fake_user())
    b = svc.create_service(ServiceCreate(name="Inativo", unit_price=1, is_active=False), _fake_user())
    ativos = svc.list_services(is_active=True)
    names = [s.name for s in ativos.services]
    assert "Ativo" in names and "Inativo" not in names


def test_soft_deleted_service_hidden(db):
    svc = ServiceCatalogService(db)
    s = svc.create_service(ServiceCreate(name="Some", unit_price=5), _fake_user())
    svc.delete_service(s.id, _fake_user())
    with pytest.raises(Exception):
        svc.get_service(s.id)


def test_endpoint_services_requires_service_access(client, admin_headers, salesperson_headers):
    r = client.get("/api/v1/services", headers=salesperson_headers)
    assert r.status_code == 403
    r2 = client.get("/api/v1/services", headers=admin_headers)
    assert r2.status_code == 200


# ── Serviço no card ─────────────────────────────────────────────────────────────

def _make_board_card(db, list_name="Dados Preenchidos", position=2):
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    board = ServiceBoard(name="Serv", description="x"); db.add(board); db.commit()
    lst = ServiceList(name=list_name, position=position, board_id=board.id); db.add(lst); db.commit()
    card = ServiceCard(title="C", list_id=lst.id); db.add(card); db.commit()
    return board, lst, card


def test_add_service_to_card_and_summary(db):
    _, _, card = _make_board_card(db)
    cat = ServiceCatalogService(db)
    s = cat.create_service(ServiceCreate(name="Calibração 1", unit_price=100), _fake_user())
    board_svc = ServiceBoardService(db)
    board_svc.add_card_service(card.id, ServiceCardServiceCreate(service_id=s.id, quantity=2, unit_price=100, discount=50), _fake_user())
    summary = board_svc.get_card_services(card.id)
    assert summary.total_items == 1
    assert summary.subtotal == 200.0      # 2 * 100
    assert summary.total == 150.0         # 200 - 50


def test_card_value_from_services(db):
    _, _, card = _make_board_card(db)
    cat = ServiceCatalogService(db)
    s = cat.create_service(ServiceCreate(name="Calibração 2", unit_price=300), _fake_user())
    board_svc = ServiceBoardService(db)
    board_svc.add_card_service(card.id, ServiceCardServiceCreate(service_id=s.id, quantity=1, unit_price=300, discount=0), _fake_user())
    meta = board_svc._cards_aggregates([card.id])
    assert meta[card.id]["value"] == 300.0


def test_proposal_prefill_uses_services(db):
    _, _, card = _make_board_card(db)
    cat = ServiceCatalogService(db)
    s = cat.create_service(ServiceCreate(name="Calibração 3", unit_price=395, sku="C3"), _fake_user())
    board_svc = ServiceBoardService(db)
    board_svc.add_card_service(card.id, ServiceCardServiceCreate(service_id=s.id, quantity=1, unit_price=395), _fake_user())

    from app.services.proposal_service import ProposalService
    prefill = ProposalService(db).prefill_from_card(card.id)
    assert len(prefill.items) == 1
    assert prefill.items[0].description == "Calibração 3"
    assert prefill.items[0].sku == "C3"
    assert prefill.items[0].unit_price == 395.0
