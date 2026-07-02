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


def test_service_marker_reflects_won_card(db, test_lists, test_salesperson_user):
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
