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
        sdr_id: Optional[int] = None,
        person_id: Optional[int] = None,
        is_won: Optional[bool] = None,
        is_lost: Optional[bool] = None,
        entered_at_from=None,
        entered_at_to=None,
        created_at_from=None,
        created_at_to=None,
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
        from sqlalchemy.orm import joinedload

        # Otimização: Eager loading dos usuários responsáveis (evita problema N+1)
        query = self.db.query(Card).join(List).options(
            joinedload(Card.assigned_to),
            joinedload(Card.sdr),
            joinedload(Card.client),
            joinedload(Card.person),
        ).filter(
            List.board_id == board_id,
            Card.deleted_at.is_(None)  # Filtrar apenas cards não deletados
        )

        if assigned_to_id is not None:
            query = query.filter(Card.assigned_to_id == assigned_to_id)

        if sdr_id is not None:
            query = query.filter(Card.sdr_id == sdr_id)

        if person_id is not None:
            query = query.filter(Card.person_id == person_id)

        if is_won is not None:
            # is_won no banco é INTEGER: 1=ganho, -1=perdido, 0=aberto
            # Converte o bool recebido para o valor inteiro correto
            query = query.filter(Card.is_won == (1 if is_won else 0))

        if is_lost is not None:
            # is_lost=True → is_won == -1; is_lost=False → is_won != -1
            if is_lost:
                query = query.filter(Card.is_won == -1)
            else:
                query = query.filter(Card.is_won != -1)

        if entered_at_from is not None or entered_at_to is not None:
            from app.models.card_list_history import CardListHistory
            dt_from = entered_at_from.replace(tzinfo=None) if entered_at_from and entered_at_from.tzinfo else entered_at_from
            dt_to = entered_at_to.replace(tzinfo=None) if entered_at_to and entered_at_to.tzinfo else entered_at_to
            query = query.join(
                CardListHistory,
                (CardListHistory.card_id == Card.id) & (CardListHistory.list_id == Card.list_id)
            )
            if dt_from is not None:
                query = query.filter(CardListHistory.entered_at >= dt_from)
            if dt_to is not None:
                query = query.filter(CardListHistory.entered_at <= dt_to)

        if created_at_from is not None:
            dt = created_at_from.replace(tzinfo=None) if created_at_from.tzinfo else created_at_from
            query = query.filter(Card.created_at >= dt)
        if created_at_to is not None:
            dt = created_at_to.replace(tzinfo=None) if created_at_to.tzinfo else created_at_to
            query = query.filter(Card.created_at <= dt)

        return query.order_by(Card.list_id, Card.position).offset(skip).limit(limit).all()

    def count_by_board(
        self,
        board_id: int,
        assigned_to_id: Optional[int] = None,
        sdr_id: Optional[int] = None,
        person_id: Optional[int] = None,
        is_won: Optional[bool] = None,
        is_lost: Optional[bool] = None,
        entered_at_from=None,
        entered_at_to=None,
        created_at_from=None,
        created_at_to=None,
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

        if sdr_id is not None:
            query = query.filter(Card.sdr_id == sdr_id)

        if person_id is not None:
            query = query.filter(Card.person_id == person_id)

        if is_won is not None:
            # is_won no banco é INTEGER: 1=ganho, -1=perdido, 0=aberto
            query = query.filter(Card.is_won == (1 if is_won else 0))

        if is_lost is not None:
            # is_lost=True → is_won == -1; is_lost=False → is_won != -1
            if is_lost:
                query = query.filter(Card.is_won == -1)
            else:
                query = query.filter(Card.is_won != -1)

        if entered_at_from is not None or entered_at_to is not None:
            from app.models.card_list_history import CardListHistory
            dt_from = entered_at_from.replace(tzinfo=None) if entered_at_from and entered_at_from.tzinfo else entered_at_from
            dt_to = entered_at_to.replace(tzinfo=None) if entered_at_to and entered_at_to.tzinfo else entered_at_to
            query = query.join(
                CardListHistory,
                (CardListHistory.card_id == Card.id) & (CardListHistory.list_id == Card.list_id)
            )
            if dt_from is not None:
                query = query.filter(CardListHistory.entered_at >= dt_from)
            if dt_to is not None:
                query = query.filter(CardListHistory.entered_at <= dt_to)

        if created_at_from is not None:
            dt = created_at_from.replace(tzinfo=None) if created_at_from.tzinfo else created_at_from
            query = query.filter(Card.created_at >= dt)
        if created_at_to is not None:
            dt = created_at_to.replace(tzinfo=None) if created_at_to.tzinfo else created_at_to
            query = query.filter(Card.created_at <= dt)

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

        # Converte o schema para dict, excluindo campos não setados
        data_dict = card_data.model_dump(exclude_unset=True)
        data_dict["position"] = position
        data_dict["is_won"] = 0  # 0 = aberto, 1 = ganho, -1 = perdido

        # Cria o card com todos os campos do schema
        card = Card(**data_dict)

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
            position: Índice da posição na lista de destino (opcional, 0-based)

        Returns:
            Card movido
        """
        old_list_id = card.list_id

        # Pegar todos os cards da lista de destino (exceto o card sendo movido) ordenados por position
        target_cards = self.db.query(Card).filter(
            Card.list_id == target_list_id,
            Card.id != card.id,
            Card.deleted_at.is_(None)
        ).order_by(Card.position).all()

        # Calcular a nova position baseado no índice desejado
        # IMPORTANTE: Converter position para int antes de usar como índice
        position_idx = int(position) if position is not None else None

        if position_idx is None or position_idx >= len(target_cards):
            # Posição não especificada ou além do final: coloca no final
            if target_cards:
                new_position = float(target_cards[-1].position) + 1000
            else:
                new_position = 1000
        elif position_idx == 0:
            # Primeira posição: coloca antes do primeiro card
            if target_cards:
                new_position = float(target_cards[0].position) - 1000
            else:
                new_position = 1000
        else:
            # Posição intermediária: calcula a média entre dois cards
            prev_card = target_cards[position_idx - 1]
            next_card = target_cards[position_idx] if position_idx < len(target_cards) else None

            if next_card:
                # Inserir entre prev_card e next_card
                new_position = (float(prev_card.position) + float(next_card.position)) / 2
            else:
                # Inserir após prev_card (no final)
                new_position = float(prev_card.position) + 1000

        # Move o card
        card.list_id = target_list_id
        card.position = new_position

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
