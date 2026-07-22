"""Service de Propostas: totais, Marcador multi-card, versionamento e prefill."""
from __future__ import annotations
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.proposal_repository import ProposalRepository
from app.models.proposal import Proposal
from app.models.service_card import ServiceCard
from app.models.service_card_service import ServiceCardService
from app.models.service import Service
from app.schemas.proposal import (
    ProposalCreate, ProposalUpdate, ProposalResponse, ProposalListResponse,
    ProposalItemResponse, ProposalItemCreate, LinkedCard, ProposalVersionResponse,
)

DEFAULT_ITEM_UNIT = "Unid"


class ProposalService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProposalRepository(db)

    # ---- Marcador e cards vinculados (derivados do conjunto de cards) ----
    def _card_status(self, lst) -> str:
        if lst and lst.is_lost_stage:
            return "perdido"
        if lst and lst.is_done_stage:
            return "ganho"
        return "ativo"

    def _derive_linked_cards(self, proposal: Proposal):
        """Retorna (marker, [LinkedCard]) a partir dos cards vinculados.

        Marcador: Perdido > Ativo > Ganho.
        - algum perdido        -> nao_aprovada
        - senão algum ativo    -> em_aberto
        - senão (todos ganho)  -> aprovada
        - sem cards            -> em_aberto
        """
        linked: List[LinkedCard] = []
        statuses: List[str] = []
        for link in proposal.card_links:
            card = link.service_card
            if not card:
                continue
            lst = card.list
            st = self._card_status(lst)
            statuses.append(st)
            linked.append(LinkedCard(
                card_id=card.id,
                board_id=(lst.board_id if lst else None),
                status=st,
                title=getattr(card, "title", None),
            ))

        if "perdido" in statuses:
            marker = "nao_aprovada"
        elif "ativo" in statuses:
            marker = "em_aberto"
        elif "ganho" in statuses:
            marker = "aprovada"
        else:
            marker = "em_aberto"
        return marker, linked

    def _to_response(self, proposal: Proposal) -> ProposalResponse:
        total_items = sum(float(i.total) for i in proposal.items)
        total = total_items + float(proposal.shipping or 0) - float(proposal.discount or 0)
        resp = ProposalResponse.model_validate(proposal)
        resp.total_items = round(total_items, 2)
        resp.total = round(total, 2)
        marker, linked = self._derive_linked_cards(proposal)
        resp.marker = marker
        resp.linked_cards = linked
        # Override editável na proposta tem prioridade sobre o cadastro do Cliente.
        ov = proposal.client_override or {}
        resp.client_name = (ov.get("name") or None) or (proposal.client.display_name if proposal.client else None)
        resp.client_document = (ov.get("document") or None) or (proposal.client.document if proposal.client else None)
        resp.items = [ProposalItemResponse.model_validate(i) for i in proposal.items]
        return resp

    def _attach_to_all_cards(self, proposal: Proposal) -> None:
        """(Re)anexa o PDF da proposta a cada card vinculado (best-effort)."""
        try:
            from app.services.proposal_pdf_service import attach_proposal_pdf_to_card
            for link in proposal.card_links:
                attach_proposal_pdf_to_card(self.db, proposal, link.service_card_id)
        except Exception as e:
            print(f"[PROPOSAL-PDF] erro ao anexar PDF aos cards: {e}")

    def _snapshot(self, proposal: Proposal) -> dict:
        """Snapshot exibível do estado atual da proposta (para o histórico)."""
        marker, linked = self._derive_linked_cards(proposal)
        total_items = sum(float(i.total) for i in proposal.items)
        total = total_items + float(proposal.shipping or 0) - float(proposal.discount or 0)
        return {
            "number": proposal.number,
            "date": proposal.date.isoformat() if proposal.date else None,
            "client_name": proposal.client.display_name if proposal.client else None,
            "client_document": proposal.client.document if proposal.client else None,
            "total": round(total, 2),
            "total_items": round(total_items, 2),
            "discount": float(proposal.discount or 0),
            "shipping": float(proposal.shipping or 0),
            "marker": marker,
            "items": [
                {
                    "description": i.description, "sku": i.sku,
                    "quantity": float(i.quantity), "unit": i.unit,
                    "unit_price": float(i.unit_price), "total": float(i.total),
                }
                for i in proposal.items
            ],
        }

    def create(self, data: ProposalCreate, user=None) -> ProposalResponse:
        # Vendedor = quem criou a proposta (imutável depois — ver repo.update).
        if user is not None and getattr(user, "name", None):
            data.seller_name = user.name
        proposal = self.repo.create(data)
        if proposal.card_links:
            self._attach_to_all_cards(proposal)
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

        # Arquiva o estado ANTERIOR como versão (dados + PDF) antes de aplicar mudanças
        try:
            from app.services.proposal_pdf_service import archive_version_pdf
            version_number = len(proposal.versions) + 1
            snapshot = self._snapshot(proposal)
            pdf_path = archive_version_pdf(self.db, proposal, version_number)
            self.repo.add_version(
                proposal.id, version_number, snapshot, pdf_path,
                changed_by=getattr(user, "name", None),
            )
        except Exception as e:
            print(f"[PROPOSAL-VERSION] erro ao arquivar versao da proposta {proposal_id}: {e}")

        proposal = self.repo.update(proposal, data)
        if proposal.card_links:
            self._attach_to_all_cards(proposal)
        return self._to_response(proposal)

    def delete(self, proposal_id: int, user=None) -> dict:
        proposal = self.repo.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposta não encontrada")
        # Remove os PDFs auto-anexados de todos os cards vinculados
        try:
            from app.services.proposal_pdf_service import remove_proposal_pdf_from_card
            for link in proposal.card_links:
                remove_proposal_pdf_from_card(self.db, proposal, link.service_card_id)
        except Exception as e:
            print(f"[PROPOSAL-PDF] erro ao remover PDFs no delete da proposta {proposal_id}: {e}")
        self.repo.soft_delete(proposal)
        return {"message": "Proposta removida com sucesso"}

    # ---- Vínculo N:N ----
    def link(self, proposal_id: int, service_card_id: int, user=None) -> ProposalResponse:
        proposal = self.repo.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposta não encontrada")
        card = self.db.query(ServiceCard).filter(ServiceCard.id == service_card_id).first()
        if not card:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card não encontrado")
        proposal = self.repo.link_card(proposal, service_card_id)
        try:
            from app.services.proposal_pdf_service import attach_proposal_pdf_to_card
            attach_proposal_pdf_to_card(self.db, proposal, service_card_id)
        except Exception as e:
            print(f"[PROPOSAL-PDF] erro ao anexar PDF ao card {service_card_id}: {e}")
        return self._to_response(proposal)

    def unlink(self, proposal_id: int, service_card_id: int, user=None) -> ProposalResponse:
        proposal = self.repo.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposta não encontrada")
        try:
            from app.services.proposal_pdf_service import remove_proposal_pdf_from_card
            remove_proposal_pdf_from_card(self.db, proposal, service_card_id)
        except Exception as e:
            print(f"[PROPOSAL-PDF] erro ao remover PDF do card {service_card_id}: {e}")
        proposal = self.repo.unlink_card(proposal, service_card_id)
        return self._to_response(proposal)

    # ---- Histórico ----
    def list_versions(self, proposal_id: int) -> list[ProposalVersionResponse]:
        proposal = self.repo.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposta não encontrada")
        return [
            ProposalVersionResponse(
                id=v.id, version_number=v.version_number, changed_by=v.changed_by,
                created_at=v.created_at, has_pdf=bool(v.pdf_path), snapshot=v.snapshot,
            )
            for v in self.repo.list_versions(proposal_id)
        ]

    def get_version_pdf(self, proposal_id: int, version_id: int) -> bytes:
        version = self.repo.get_version(proposal_id, version_id)
        if not version:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Versão não encontrada")
        from app.services.proposal_pdf_service import read_version_pdf
        return read_version_pdf(version.pdf_path)

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
            self.db.query(ServiceCardService, Service)
            .join(Service, ServiceCardService.service_id == Service.id)
            .filter(ServiceCardService.service_card_id == service_card_id)
            .all()
        )
        items = [
            ProposalItemCreate(
                product_id=None, description=s.name or "", sku=s.sku,
                quantity=float(scs.quantity or 1), unit=DEFAULT_ITEM_UNIT,
                unit_price=float(scs.unit_price or 0),
            )
            for scs, s in rows
        ]
        return ProposalCreate(
            service_card_id=card.id,
            client_id=card.client_id,
            person_id=card.person_id,
            items=items,
        )
