"""Endpoints de Propostas Comerciais (módulo de Serviço)."""
from typing import Optional
from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.proposal_service import ProposalService
from app.schemas.proposal import (
    ProposalCreate, ProposalUpdate, ProposalResponse, ProposalListResponse,
    ProposalVersionResponse,
)

router = APIRouter()


class LinkCardBody(BaseModel):
    service_card_id: int


@router.get("", response_model=ProposalListResponse, summary="Listar propostas")
def list_proposals(
    page: int = 1, page_size: int = 50, search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return ProposalService(db).list(page=page, page_size=page_size, search=search)


@router.post("", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED, summary="Criar proposta")
def create_proposal(
    data: ProposalCreate,
    db: Session = Depends(get_db),
):
    return ProposalService(db).create(data)


@router.get("/prefill/{service_card_id}", response_model=ProposalCreate, summary="Pré-preencher a partir do card")
def prefill_proposal(
    service_card_id: int,
    db: Session = Depends(get_db),
):
    return ProposalService(db).prefill_from_card(service_card_id)


@router.get("/by-card/{service_card_id}", response_model=list[ProposalResponse], summary="Propostas de um card")
def proposals_by_card(
    service_card_id: int,
    db: Session = Depends(get_db),
):
    return ProposalService(db).list_by_card(service_card_id)


@router.get("/{proposal_id}/pdf", summary="PDF da proposta")
def proposal_pdf(proposal_id: int, download: int = 0, db: Session = Depends(get_db)):
    from app.services.proposal_pdf_service import generate_proposal_pdf
    pdf = generate_proposal_pdf(db, proposal_id)
    disp = "attachment" if download else "inline"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'{disp}; filename="proposta-{proposal_id}.pdf"'},
    )


@router.post("/{proposal_id}/cards", response_model=ProposalResponse, summary="Vincular proposta a um card")
def link_proposal_card(proposal_id: int, body: LinkCardBody, db: Session = Depends(get_db)):
    return ProposalService(db).link(proposal_id, body.service_card_id)


@router.delete("/{proposal_id}/cards/{service_card_id}", response_model=ProposalResponse, summary="Desvincular proposta de um card")
def unlink_proposal_card(proposal_id: int, service_card_id: int, db: Session = Depends(get_db)):
    return ProposalService(db).unlink(proposal_id, service_card_id)


@router.get("/{proposal_id}/versions", response_model=list[ProposalVersionResponse], summary="Histórico de versões")
def list_proposal_versions(proposal_id: int, db: Session = Depends(get_db)):
    return ProposalService(db).list_versions(proposal_id)


@router.get("/{proposal_id}/versions/{version_id}/pdf", summary="PDF de uma versão arquivada")
def proposal_version_pdf(proposal_id: int, version_id: int, download: int = 0, db: Session = Depends(get_db)):
    pdf = ProposalService(db).get_version_pdf(proposal_id, version_id)
    disp = "attachment" if download else "inline"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'{disp}; filename="proposta-{proposal_id}-v{version_id}.pdf"'},
    )


@router.get("/{proposal_id}", response_model=ProposalResponse, summary="Buscar proposta")
def get_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
):
    return ProposalService(db).get(proposal_id)


@router.put("/{proposal_id}", response_model=ProposalResponse, summary="Atualizar proposta")
def update_proposal(
    proposal_id: int, data: ProposalUpdate,
    db: Session = Depends(get_db),
):
    return ProposalService(db).update(proposal_id, data)


@router.delete("/{proposal_id}", status_code=status.HTTP_200_OK, summary="Remover proposta")
def delete_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
):
    return ProposalService(db).delete(proposal_id)
