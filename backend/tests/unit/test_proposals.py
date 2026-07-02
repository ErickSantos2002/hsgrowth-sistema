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
