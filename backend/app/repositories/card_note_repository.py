"""
Repository para CardNote - Operações de banco de dados para anotações dos cards.
"""
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.card_note import CardNote


class CardNoteRepository:
    """Repository para operações de CardNote"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, card_id: int, user_id: int, content: str) -> CardNote:
        """
        Cria uma nova anotação

        Args:
            card_id: ID do card
            user_id: ID do usuário autor
            content: Conteúdo da anotação

        Returns:
            CardNote criada
        """
        note = CardNote(
            card_id=card_id,
            user_id=user_id,
            content=content
        )

        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)

        return note

    def find_by_id(self, note_id: int) -> Optional[CardNote]:
        """
        Busca uma anotação por ID

        Args:
            note_id: ID da anotação

        Returns:
            CardNote ou None se não encontrado
        """
        return self.db.query(CardNote).filter(CardNote.id == note_id).first()

    def get_by_card(self, card_id: int) -> List[CardNote]:
        """
        Busca todas as anotações de um card

        Args:
            card_id: ID do card

        Returns:
            Lista de CardNotes ordenadas por data (mais recente primeiro)
        """
        return (
            self.db.query(CardNote)
            .filter(CardNote.card_id == card_id)
            .order_by(CardNote.created_at.desc())
            .all()
        )

    def update(self, note_id: int, content: str) -> Optional[CardNote]:
        """
        Atualiza o conteúdo de uma anotação

        Args:
            note_id: ID da anotação
            content: Novo conteúdo

        Returns:
            CardNote atualizada ou None se não encontrado
        """
        note = self.find_by_id(note_id)

        if not note:
            return None

        note.content = content
        self.db.commit()
        self.db.refresh(note)

        return note

    def delete(self, note_id: int) -> bool:
        """
        Deleta uma anotação

        Args:
            note_id: ID da anotação

        Returns:
            True se deletado, False se não encontrado
        """
        note = self.find_by_id(note_id)

        if not note:
            return False

        self.db.delete(note)
        self.db.commit()

        return True

    def delete_by_card(self, card_id: int) -> int:
        """
        Deleta todas as anotações de um card

        Args:
            card_id: ID do card

        Returns:
            Número de anotações deletadas
        """
        count = self.db.query(CardNote).filter(CardNote.card_id == card_id).delete()
        self.db.commit()

        return count
