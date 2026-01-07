"""
Card Repository - Operações de acesso a dados de cards.
Implementa o padrão Repository para isolamento da camada de dados.
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.card import Card
from app.schemas.card import CardCreate, CardUpdate


class CardRepository:
    """
    Repository para operações de banco de dados relacionadas a cards.
    """

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, card_id: int) -> Optional[Card]:
        """
        Busca um card por ID.

        Args:
            card_id: ID do card

        Returns:
            Card ou None se não encontrado
        """
        return self.db.query(Card).filter(
            Card.id == card_id
        ).first()

    def list_by_list(self, list_id: int) -> List[Card]:
        """
        Lista todos os cards de uma lista, ordenados por posição.

        Args:
            list_id: ID da lista

        Returns:
            Lista de cards ordenados por posição
        """
        return self.db.query(Card).filter(
            Card.list_id == list_id
        ).order_by(Card.position).all()

    def list_by_board(
        self,
        board_id: int,
        skip: int = 0,
        limit: int = 100,
        assigned_to_id: Optional[int] = None,
        is_won: Optional[bool] = None,
        is_lost: Optional[bool] = None
    ) -> List[Card]:
        """
        Lista cards de um board com filtros opcionais.

        Args:
            board_id: ID do board
            skip: Número de registros para pular
            limit: Limite de registros
            assigned_to_id: Filtro por responsável
            is_won: Filtro por cards ganhos
            is_lost: Filtro por cards perdidos

        Returns:
            Lista de cards
        """
        from app.models.list import List

        query = self.db.query(Card).join(List).filter(
            List.board_id == board_id
        )

        if assigned_to_id is not None:
            query = query.filter(Card.assigned_to_id == assigned_to_id)

        if is_won is not None:
            query = query.filter(Card.is_won == is_won)

        if is_lost is not None:
            query = query.filter(Card.is_lost == is_lost)

        return query.order_by(Card.created_at.desc()).offset(skip).limit(limit).all()

    def count_by_board(
        self,
        board_id: int,
        assigned_to_id: Optional[int] = None,
        is_won: Optional[bool] = None,
        is_lost: Optional[bool] = None
    ) -> int:
        """
        Conta cards de um board com filtros opcionais.

        Args:
            board_id: ID do board
            assigned_to_id: Filtro por responsável
            is_won: Filtro por cards ganhos
            is_lost: Filtro por cards perdidos

        Returns:
            Número de cards
        """
        from app.models.list import List

        query = self.db.query(Card).join(List).filter(
            List.board_id == board_id
        )

        if assigned_to_id is not None:
            query = query.filter(Card.assigned_to_id == assigned_to_id)

        if is_won is not None:
            query = query.filter(Card.is_won == is_won)

        if is_lost is not None:
            query = query.filter(Card.is_lost == is_lost)

        return query.count()

    def get_max_position(self, list_id: int) -> int:
        """
        Obtém a maior posição de card em uma lista.

        Args:
            list_id: ID da lista

        Returns:
            Maior posição (ou -1 se não houver cards)
        """
        max_pos = self.db.query(func.max(Card.position)).filter(
            Card.list_id == list_id
        ).scalar()

        return max_pos if max_pos is not None else -1

    def create(self, card_data: CardCreate) -> Card:
        """
        Cria um novo card.

        Args:
            card_data: Dados do card

        Returns:
            Card criado
        """
        # Coloca o card no final da lista
        position = self.get_max_position(card_data.list_id) + 1

        card = Card(
            title=card_data.title,
            description=card_data.description,
            list_id=card_data.list_id,
            assigned_to_id=card_data.assigned_to_id,
            value=card_data.value,
            due_date=card_data.due_date,
            contact_info=card_data.contact_info or {},
            position=position,
            is_won=0  # 0 = aberto, 1 = ganho, -1 = perdido
        )

        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)

        return card

    def update(self, card: Card, card_data: CardUpdate) -> Card:
        """
        Atualiza um card existente.

        Args:
            card: Card a ser atualizado
            card_data: Dados de atualização

        Returns:
            Card atualizado
        """
        update_data = card_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            # Lógica especial para is_won e is_lost
            # is_won: 0=aberto, 1=ganho, -1=perdido
            if field == "is_won" and value == True:
                card.is_won = 1  # Marca como ganho
                card.closed_at = datetime.utcnow()
            elif field == "is_lost" and value == True:
                card.is_won = -1  # Marca como perdido
                card.closed_at = datetime.utcnow()
            elif field not in ["is_won", "is_lost", "won_at", "lost_at"]:
                # Não setar properties read-only diretamente
                setattr(card, field, value)

        self.db.commit()
        self.db.refresh(card)

        return card

    def delete(self, card: Card) -> None:
        """
        Deleta um card permanentemente.

        Args:
            card: Card a ser deletado
        """
        self.db.delete(card)
        self.db.commit()

    def move_to_list(self, card: Card, target_list_id: int, position: Optional[int] = None) -> Card:
        """
        Move um card para outra lista.

        Args:
            card: Card a ser movido
            target_list_id: ID da lista de destino
            position: Posição na lista de destino (opcional)

        Returns:
            Card movido
        """
        old_list_id = card.list_id

        # Se não especificou posição, coloca no final
        if position is None:
            position = self.get_max_position(target_list_id) + 1

        # Move o card
        card.list_id = target_list_id
        card.position = position

        self.db.commit()
        self.db.refresh(card)

        return card

    def assign_to_user(self, card: Card, user_id: int) -> Card:
        """
        Atribui um card a um usuário.

        Args:
            card: Card a ser atribuído
            user_id: ID do usuário

        Returns:
            Card atualizado
        """
        card.assigned_to_id = user_id

        self.db.commit()
        self.db.refresh(card)

        return card
