"""Service de Propostas: totais, Marcador derivado e prefill a partir do card."""
from __future__ import annotations
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.proposal_repository import ProposalRepository
from app.models.proposal import Proposal
from app.models.service_card import ServiceCard
from app.models.service_card_product import ServiceCardProduct
from app.models.product import Product
from app.schemas.proposal import (
    ProposalCreate, ProposalUpdate, ProposalResponse, ProposalListResponse,
    ProposalItemResponse, ProposalItemCreate,
)

DEFAULT_ITEM_UNIT = "Unid"


class ProposalService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProposalRepository(db)

    # ---- Marcador e board_id derivados do card vinculado (single derivation) ----
    def _derive_card_fields(self, proposal: Proposal):
        """Retorna (marker, board_id) usando o relacionamento já carregado do card."""
        card = proposal.service_card if proposal.service_card_id else None
        if not card:
            return "em_aberto", None
        # ServiceCard.list é um relacionamento eager-loaded pelo repositório
        lst = card.list
        if lst and lst.is_done_stage:
            marker = "aprovada"
        elif lst and lst.is_lost_stage:
            marker = "nao_aprovada"
        else:
            marker = "em_aberto"
        return marker, (lst.board_id if lst else None)

    def _to_response(self, proposal: Proposal) -> ProposalResponse:
        total_items = sum(float(i.total) for i in proposal.items)
        total = total_items + float(proposal.shipping or 0) - float(proposal.discount or 0)
        resp = ProposalResponse.model_validate(proposal)
        resp.total_items = round(total_items, 2)
        resp.total = round(total, 2)
        marker, board_id = self._derive_card_fields(proposal)
        resp.marker = marker
        resp.board_id = board_id
        resp.client_name = proposal.client.display_name if proposal.client else None
        resp.client_document = proposal.client.document if proposal.client else None
        resp.items = [ProposalItemResponse.model_validate(i) for i in proposal.items]
        return resp

    def create(self, data: ProposalCreate, user=None) -> ProposalResponse:
        proposal = self.repo.create(data)
        return self._to_response(proposal)

    def get(self, proposal_id: int) -> ProposalResponse:
        proposal = self.repo.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposta não encontrada")
        return self._to_response(proposal)

    def update(self, proposal_id: int, data: ProposalUpdate, user=None) -> ProposalResponse:
        proposal = self.repo.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposta não encontrada")
        proposal = self.repo.update(proposal, data)
        return self._to_response(proposal)

    def delete(self, proposal_id: int, user=None) -> dict:
        proposal = self.repo.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposta não encontrada")
        self.repo.soft_delete(proposal)
        return {"message": "Proposta removida com sucesso"}

    def list(self, page: int = 1, page_size: int = 50, search: Optional[str] = None) -> ProposalListResponse:
        rows, total = self.repo.list(page, page_size, search)
        total_pages = max(1, (total + page_size - 1) // page_size)
        return ProposalListResponse(
            items=[self._to_response(p) for p in rows],
            total=total, page=page, page_size=page_size, total_pages=total_pages,
        )

    def list_by_card(self, service_card_id: int) -> list[ProposalResponse]:
        return [self._to_response(p) for p in self.repo.list_by_card(service_card_id)]

    # ---- Prefill a partir do card de Serviço ----
    def prefill_from_card(self, service_card_id: int) -> ProposalCreate:
        card = self.db.query(ServiceCard).filter(ServiceCard.id == service_card_id).first()
        if not card:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card não encontrado")
        rows = (
            self.db.query(ServiceCardProduct, Product)
            .join(Product, ServiceCardProduct.product_id == Product.id)
            .filter(ServiceCardProduct.service_card_id == service_card_id)
            .all()
        )
        items = [
            ProposalItemCreate(
                product_id=p.id, description=p.name or "", sku=p.sku,
                quantity=float(scp.quantity or 1), unit=DEFAULT_ITEM_UNIT,
                unit_price=float(scp.unit_price or 0),
            )
            for scp, p in rows
        ]
        return ProposalCreate(
            service_card_id=card.id,
            client_id=card.client_id,
            person_id=card.person_id,
            items=items,
        )
