"""
Service para CardNote - Lógica de negócio para anotações dos cards.
"""
from sqlalchemy.orm import Session
from typing import List
from fastapi import HTTPException, status

from app.repositories.card_note_repository import CardNoteRepository
from app.repositories.activity_repository import ActivityRepository
from app.models.user import User
from app.schemas.card_note import CardNoteCreate, CardNoteUpdate, CardNoteResponse


class CardNoteService:
    """Service para operações de CardNote"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = CardNoteRepository(db)
        self.activity_repository = ActivityRepository(db)

    def _log_activity(
        self,
        card_id: int,
        user_id: int,
        activity_type: str,
        description: str,
        metadata: dict = None
    ):
        """
        Registra uma atividade no histórico do card

        Args:
            card_id: ID do card
            user_id: ID do usuário que executou a ação
            activity_type: Tipo da atividade
            description: Descrição legível
            metadata: Dados adicionais em JSON
        """
        self.activity_repository.create(
            card_id=card_id,
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            activity_metadata=metadata or {}
        )

    def create_note(self, note_data: CardNoteCreate, current_user: User) -> CardNoteResponse:
        """
        Cria uma nova anotação

        Args:
            note_data: Dados da anotação
            current_user: Usuário atual

        Returns:
            CardNoteResponse
        """
        # Cria a anotação
        note = self.repository.create(
            card_id=note_data.card_id,
            user_id=current_user.id,
            content=note_data.content
        )

        # Registra no histórico
        preview = note_data.content[:50] + "..." if len(note_data.content) > 50 else note_data.content
        self._log_activity(
            card_id=note_data.card_id,
            user_id=current_user.id,
            activity_type="note_added",
            description=f"Anotação adicionada: {preview}",
            metadata={
                "note_id": note.id,
                "note_preview": preview
            }
        )

        # Retorna response
        return CardNoteResponse(
            id=note.id,
            card_id=note.card_id,
            user_id=note.user_id,
            content=note.content,
            created_at=note.created_at,
            updated_at=note.updated_at,
            user_name=current_user.name
        )

    def get_note(self, note_id: int) -> CardNoteResponse:
        """
        Busca uma anotação por ID

        Args:
            note_id: ID da anotação

        Returns:
            CardNoteResponse

        Raises:
            HTTPException: Se não encontrado
        """
        note = self.repository.find_by_id(note_id)

        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Anotação {note_id} não encontrada"
            )

        return CardNoteResponse(
            id=note.id,
            card_id=note.card_id,
            user_id=note.user_id,
            content=note.content,
            created_at=note.created_at,
            updated_at=note.updated_at,
            user_name=note.user.name if note.user else None
        )

    def get_notes_by_card(self, card_id: int) -> List[CardNoteResponse]:
        """
        Busca todas as anotações de um card

        Args:
            card_id: ID do card

        Returns:
            Lista de CardNoteResponse
        """
        notes = self.repository.get_by_card(card_id)

        return [
            CardNoteResponse(
                id=note.id,
                card_id=note.card_id,
                user_id=note.user_id,
                content=note.content,
                created_at=note.created_at,
                updated_at=note.updated_at,
                user_name=note.user.name if note.user else None
            )
            for note in notes
        ]

    def update_note(self, note_id: int, note_data: CardNoteUpdate, current_user: User) -> CardNoteResponse:
        """
        Atualiza uma anotação

        Args:
            note_id: ID da anotação
            note_data: Novos dados
            current_user: Usuário atual

        Returns:
            CardNoteResponse

        Raises:
            HTTPException: Se não encontrado ou sem permissão
        """
        # Busca a nota
        note = self.repository.find_by_id(note_id)

        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Anotação {note_id} não encontrada"
            )

        # Verifica permissão (apenas autor ou admin/manager)
        if note.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para editar esta anotação"
            )

        # Atualiza
        updated_note = self.repository.update(note_id, note_data.content)

        # Registra no histórico
        preview = note_data.content[:50] + "..." if len(note_data.content) > 50 else note_data.content
        self._log_activity(
            card_id=note.card_id,
            user_id=current_user.id,
            activity_type="note_edited",
            description=f"Anotação editada: {preview}",
            metadata={
                "note_id": note.id,
                "note_preview": preview
            }
        )

        return CardNoteResponse(
            id=updated_note.id,
            card_id=updated_note.card_id,
            user_id=updated_note.user_id,
            content=updated_note.content,
            created_at=updated_note.created_at,
            updated_at=updated_note.updated_at,
            user_name=updated_note.user.name if updated_note.user else None
        )

    def delete_note(self, note_id: int, current_user: User) -> None:
        """
        Deleta uma anotação

        Args:
            note_id: ID da anotação
            current_user: Usuário atual

        Raises:
            HTTPException: Se não encontrado ou sem permissão
        """
        # Busca a nota
        note = self.repository.find_by_id(note_id)

        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Anotação {note_id} não encontrada"
            )

        # Verifica permissão (apenas autor ou admin/manager)
        if note.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para deletar esta anotação"
            )

        card_id = note.card_id

        # Deleta
        self.repository.delete(note_id)

        # Registra no histórico
        preview = note.content[:50] + "..." if len(note.content) > 50 else note.content
        self._log_activity(
            card_id=card_id,
            user_id=current_user.id,
            activity_type="note_deleted",
            description=f"Anotação deletada: {preview}",
            metadata={
                "note_id": note_id,
                "note_preview": preview
            }
        )
