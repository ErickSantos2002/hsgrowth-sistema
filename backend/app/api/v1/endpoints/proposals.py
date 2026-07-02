"""Endpoints de Propostas Comerciais (módulo de Serviço)."""
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.proposal_service import ProposalService
from app.schemas.proposal import (
    ProposalCreate, ProposalUpdate, ProposalResponse, ProposalListResponse,
)

router = APIRouter()


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
