"""Testes do módulo de Propostas."""
import pytest
from app.repositories.proposal_repository import ProposalRepository
from app.schemas.proposal import ProposalCreate, ProposalItemCreate


def test_next_number_starts_at_1_and_increments(db):
    repo = ProposalRepository(db)
    assert repo.next_number() == 1
    p = repo.create(ProposalCreate(items=[]))
    assert p.number == 1
    assert repo.next_number() == 2


def test_create_with_items_computes_item_total(db):
    repo = ProposalRepository(db)
    p = repo.create(ProposalCreate(items=[
        ProposalItemCreate(description="Calibração", quantity=2, unit_price=100),
    ]))
    assert len(p.items) == 1
    assert float(p.items[0].total) == 200.0


from app.services.proposal_service import ProposalService


def test_service_computes_totals_and_marker_em_aberto(db):
    svc = ProposalService(db)
    resp = svc.create(ProposalCreate(
        shipping=200, discount=0,
        items=[ProposalItemCreate(description="Calibração", quantity=1, unit_price=395)],
    ))
    assert resp.total_items == 395.0
    assert resp.total == 595.0            # 395 + 200 - 0
    assert resp.marker == "em_aberto"     # sem card vinculado


def test_service_marker_reflects_won_card(db):
    # cria um card de serviço numa lista "done" para simular Ganho
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    board = ServiceBoard(name="Serv", description="x"); db.add(board); db.commit()
    lst = ServiceList(name="Ganho", position=5, board_id=board.id, is_done_stage=True)
    db.add(lst); db.commit()
    card = ServiceCard(title="C", list_id=lst.id); db.add(card); db.commit()

    svc = ProposalService(db)
    resp = svc.create(ProposalCreate(service_card_id=card.id, items=[]))
    assert resp.marker == "aprovada"


def test_service_marker_reflects_lost_card(db):
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    board = ServiceBoard(name="Serv", description="x"); db.add(board); db.commit()
    lst = ServiceList(name="Perdido", position=6, board_id=board.id, is_lost_stage=True)
    db.add(lst); db.commit()
    card = ServiceCard(title="C", list_id=lst.id); db.add(card); db.commit()
    svc = ProposalService(db)
    resp = svc.create(ProposalCreate(service_card_id=card.id, items=[]))
    assert resp.marker == "nao_aprovada"


def test_soft_deleted_proposal_hidden_from_list(db):
    svc = ProposalService(db)
    p = svc.create(ProposalCreate(items=[]))
    svc.delete(p.id)
    assert svc.list().total == 0


def test_endpoint_create_and_list_requires_service_access(client, admin_headers):
    # admin tem acesso ao módulo de Serviço
    payload = {"items": [{"description": "Calibração", "quantity": 1, "unit_price": 395}], "shipping": 200}
    r = client.post("/api/v1/proposals", json=payload, headers=admin_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    created_number = body["number"]
    assert created_number >= 1
    assert body["total"] == 595.0

    r2 = client.get("/api/v1/proposals", headers=admin_headers)
    assert r2.status_code == 200
    data = r2.json()
    assert data["total"] >= 1
    numbers = [p["number"] for p in data["items"]]
    assert created_number in numbers


def test_endpoint_blocks_salesperson(client, salesperson_headers):
    r = client.get("/api/v1/proposals", headers=salesperson_headers)
    assert r.status_code == 403


# ── Regra de avanço: proposta vinculada ao card ────────────────────────────────

def test_has_linked_proposal_helper(db):
    """_has_linked_proposal retorna False sem proposta e True com proposta vinculada."""
    from app.services.service_board_service import ServiceBoardService
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    from app.models.proposal import Proposal

    board = ServiceBoard(name="Serv", description="x")
    db.add(board)
    db.commit()

    lst = ServiceList(name="Proposta", position=3, board_id=board.id)
    db.add(lst)
    db.commit()

    card = ServiceCard(title="C", list_id=lst.id)
    db.add(card)
    db.commit()

    svc = ServiceBoardService(db)

    # Sem proposta vinculada → False
    assert svc._has_linked_proposal(card.id) is False

    # Adiciona proposta vinculada (number obrigatório)
    db.add(Proposal(number=9901, service_card_id=card.id))
    db.commit()

    # Com proposta vinculada → True
    assert svc._has_linked_proposal(card.id) is True


def test_endpoint_proposal_pdf(client, admin_headers):
    payload = {"items": [{"description": "Calibração", "quantity": 1, "unit_price": 395}], "shipping": 200}
    r = client.post("/api/v1/proposals", json=payload, headers=admin_headers)
    pid = r.json()["id"]
    r2 = client.get(f"/api/v1/proposals/{pid}/pdf", headers=admin_headers)
    assert r2.status_code == 200, r2.text
    assert r2.headers["content-type"] == "application/pdf"
    assert r2.content[:5] == b"%PDF-"
