"""Repositório de Propostas."""
from typing import Optional, List, Tuple
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.proposal import Proposal, ProposalItem
from app.models.client import Client
from app.schemas.proposal import ProposalCreate, ProposalUpdate


class ProposalRepository:
    def __init__(self, db: Session):
        self.db = db

    def next_number(self) -> int:
        current_max = self.db.query(func.max(Proposal.number)).scalar()
        return (current_max or 0) + 1

    def _apply_items(self, proposal: Proposal, items: List) -> None:
        proposal.items.clear()
        for it in items:
            total = float(it.quantity) * float(it.unit_price)
            proposal.items.append(ProposalItem(
                product_id=it.product_id, description=it.description, sku=it.sku,
                quantity=it.quantity, unit=it.unit, unit_price=it.unit_price, total=total,
            ))

    def create(self, data: ProposalCreate) -> Proposal:
        payload = data.model_dump(exclude={"items"})
        proposal = Proposal(number=self.next_number(), **payload)
        self._apply_items(proposal, data.items or [])
        self.db.add(proposal)
        self.db.commit()
        self.db.refresh(proposal)
        return proposal

    def get_by_id(self, proposal_id: int) -> Optional[Proposal]:
        return (
            self.db.query(Proposal)
            .options(joinedload(Proposal.client), joinedload(Proposal.service_card))
            .filter(Proposal.id == proposal_id, Proposal.is_deleted == False)  # noqa: E712
            .first()
        )

    def update(self, proposal: Proposal, data: ProposalUpdate) -> Proposal:
        payload = data.model_dump(exclude_unset=True, exclude={"items"})
        for k, v in payload.items():
            setattr(proposal, k, v)
        if data.items is not None:
            self._apply_items(proposal, data.items)
        self.db.commit()
        self.db.refresh(proposal)
        return proposal

    def soft_delete(self, proposal: Proposal) -> None:
        proposal.is_deleted = True
        self.db.commit()

    def list(self, page: int, page_size: int, search: Optional[str] = None
             ) -> Tuple[List[Proposal], int]:
        q = (
            self.db.query(Proposal)
            .options(joinedload(Proposal.client), joinedload(Proposal.service_card))
            .filter(Proposal.is_deleted == False)  # noqa: E712
        )
        if search:
            like = f"%{search}%"
            conditions = [Client.name.ilike(like), Client.company_name.ilike(like)]
            if search.isdigit():
                conditions.append(Proposal.number == int(search))
            q = q.outerjoin(Client, Proposal.client_id == Client.id).filter(or_(*conditions))
        total = q.count()
        rows = q.order_by(Proposal.number.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return rows, total

    def list_by_card(self, service_card_id: int) -> List[Proposal]:
        return (
            self.db.query(Proposal)
            .filter(Proposal.service_card_id == service_card_id, Proposal.is_deleted == False)  # noqa: E712
            .order_by(Proposal.number.desc())
            .all()
        )

    def count_by_card(self, service_card_id: int) -> int:
        return (
            self.db.query(func.count(Proposal.id))
            .filter(Proposal.service_card_id == service_card_id, Proposal.is_deleted == False)  # noqa: E712
            .scalar()
        )
