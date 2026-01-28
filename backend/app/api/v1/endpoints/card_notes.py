"""
Endpoints da API para CardNotes (Anotações dos Cards).
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.services.card_note_service import CardNoteService
from app.schemas.card_note import CardNoteCreate, CardNoteUpdate, CardNoteResponse
from app.models.user import User
from app.api.deps import get_current_active_user

router = APIRouter()


@router.post("", response_model=CardNoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    note_data: CardNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Cria uma nova anotação para um card.

    Também registra automaticamente no histórico do card.
    """
    service = CardNoteService(db)
    return service.create_note(note_data, current_user)


@router.get("/card/{card_id}", response_model=List[CardNoteResponse])
def get_notes_by_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Busca todas as anotações de um card específico.

    Ordenadas por data de criação (mais recente primeiro).
    """
    service = CardNoteService(db)
    return service.get_notes_by_card(card_id)


@router.get("/{note_id}", response_model=CardNoteResponse)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Busca uma anotação por ID"""
    service = CardNoteService(db)
    return service.get_note(note_id)


@router.put("/{note_id}", response_model=CardNoteResponse)
def update_note(
    note_id: int,
    note_data: CardNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Atualiza uma anotação existente.

    Apenas o autor da anotação ou admin/manager podem editar.
    Também registra a alteração no histórico.
    """
    service = CardNoteService(db)
    return service.update_note(note_id, note_data, current_user)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Deleta uma anotação.

    Apenas o autor da anotação ou admin/manager podem deletar.
    Também registra a deleção no histórico.
    """
    service = CardNoteService(db)
    service.delete_note(note_id, current_user)
    return None
