"""Repositório de Propostas."""
from typing import Optional, List, Tuple
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.proposal import Proposal, ProposalItem
from app.models.proposal_service_card import ProposalServiceCard
from app.models.proposal_version import ProposalVersion
from app.models.client import Client
from app.models.service_card import ServiceCard
from app.schemas.proposal import ProposalCreate, ProposalUpdate

# Campos não-nulos no modelo: nunca sobrescrever com None num PUT parcial
NON_NULLABLE = {"discount", "shipping", "internal_status"}


class ProposalRepository:
    def __init__(self, db: Session):
        self.db = db

    # Carrega cliente + os cards vinculados (e suas listas) para derivar marcador
    def _load_options(self):
        return (
            joinedload(Proposal.client),
            selectinload(Proposal.card_links)
            .selectinload(ProposalServiceCard.service_card)
            .selectinload(ServiceCard.list),
        )

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
        payload = data.model_dump(exclude={"items", "service_card_id"})
        card_id = data.service_card_id
        last_exc = None
        for _ in range(5):
            proposal = Proposal(number=self.next_number(), **payload)
            self._apply_items(proposal, data.items or [])
            if card_id:
                proposal.card_links.append(ProposalServiceCard(service_card_id=card_id))
            self.db.add(proposal)
            try:
                self.db.commit()
                self.db.refresh(proposal)
                return proposal
            except IntegrityError as exc:
                last_exc = exc
                self.db.rollback()
        raise last_exc  # esgotou tentativas

    def get_by_id(self, proposal_id: int) -> Optional[Proposal]:
        return (
            self.db.query(Proposal)
            .options(*self._load_options())
            .filter(Proposal.id == proposal_id, Proposal.is_deleted == False)  # noqa: E712
            .first()
        )

    def update(self, proposal: Proposal, data: ProposalUpdate) -> Proposal:
        payload = data.model_dump(exclude_unset=True, exclude={"items"})
        for k, v in payload.items():
            if v is None and k in NON_NULLABLE:
                continue
            setattr(proposal, k, v)
        if data.items is not None:
            self._apply_items(proposal, data.items)
        self.db.commit()
        self.db.refresh(proposal)
        return proposal

    def soft_delete(self, proposal: Proposal) -> None:
        proposal.is_deleted = True
        self.db.commit()

    # ---- Vínculo N:N ----
    def link_card(self, proposal: Proposal, service_card_id: int) -> Proposal:
        exists = any(l.service_card_id == service_card_id for l in proposal.card_links)
        if not exists:
            self.db.add(ProposalServiceCard(proposal_id=proposal.id, service_card_id=service_card_id))
            self.db.commit()
            self.db.refresh(proposal)
        return proposal

    def unlink_card(self, proposal: Proposal, service_card_id: int) -> Proposal:
        link = (
            self.db.query(ProposalServiceCard)
            .filter(
                ProposalServiceCard.proposal_id == proposal.id,
                ProposalServiceCard.service_card_id == service_card_id,
            )
            .first()
        )
        if link:
            self.db.delete(link)
            self.db.commit()
            self.db.refresh(proposal)
        return proposal

    # ---- Versões ----
    def add_version(self, proposal_id: int, version_number: int,
                    snapshot: Optional[dict], pdf_path: Optional[str],
                    changed_by: Optional[str]) -> ProposalVersion:
        version = ProposalVersion(
            proposal_id=proposal_id, version_number=version_number,
            snapshot=snapshot, pdf_path=pdf_path, changed_by=changed_by,
        )
        self.db.add(version)
        self.db.commit()
        self.db.refresh(version)
        return version

    def list_versions(self, proposal_id: int) -> List[ProposalVersion]:
        return (
            self.db.query(ProposalVersion)
            .filter(ProposalVersion.proposal_id == proposal_id)
            .order_by(ProposalVersion.version_number.desc())
            .all()
        )

    def get_version(self, proposal_id: int, version_id: int) -> Optional[ProposalVersion]:
        return (
            self.db.query(ProposalVersion)
            .filter(ProposalVersion.id == version_id, ProposalVersion.proposal_id == proposal_id)
            .first()
        )

    def list(self, page: int, page_size: int, search: Optional[str] = None
             ) -> Tuple[List[Proposal], int]:
        q = (
            self.db.query(Proposal)
            .options(*self._load_options())
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
            .join(ProposalServiceCard, ProposalServiceCard.proposal_id == Proposal.id)
            .options(*self._load_options())
            .filter(
                ProposalServiceCard.service_card_id == service_card_id,
                Proposal.is_deleted == False,  # noqa: E712
            )
            .order_by(Proposal.number.desc())
            .all()
        )
