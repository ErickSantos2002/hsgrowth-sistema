"""
Card Service - Lógica de negócio para cards.
Implementa validações e regras de negócio.
"""
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.card_repository import CardRepository
from app.repositories.list_repository import ListRepository
from app.repositories.board_repository import BoardRepository
from app.repositories.field_repository import FieldRepository
from app.schemas.card import CardCreate, CardUpdate, CardResponse, CardListResponse
from app.schemas.field import CardFieldValueCreate, CardFieldValueResponse
from app.models.card import Card
from app.models.user import User


class CardService:
    """
    Service para lógica de negócio relacionada a cards.
    """

    def __init__(self, db: Session):
        self.db = db
        self.card_repository = CardRepository(db)
        self.list_repository = ListRepository(db)
        self.board_repository = BoardRepository(db)
        self.field_repository = FieldRepository(db)

    def _verify_card_access(self, card: Card, account_id: int) -> None:
        """
        Verifica se um card pertence à conta do usuário (multi-tenant).

        Args:
            card: Card a verificar
            account_id: ID da conta do usuário

        Raises:
            HTTPException: Se não tiver acesso
        """
        # Busca a lista do card
        list_obj = self.list_repository.find_by_id(card.list_id)
        if not list_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lista não encontrada"
            )

        # Busca o board da lista
        board = self.board_repository.find_by_id(list_obj.board_id)
        if not board or board.account_id != account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a este card"
            )

    def get_card_by_id(self, card_id: int, account_id: int) -> Card:
        """
        Busca um card por ID com verificação de acesso.

        Args:
            card_id: ID do card
            account_id: ID da conta

        Returns:
            Card

        Raises:
            HTTPException: Se não encontrado ou sem acesso
        """
        card = self.card_repository.find_by_id(card_id)

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Card não encontrado"
            )

        # Verifica acesso multi-tenant
        self._verify_card_access(card, account_id)

        return card

    def list_cards(
        self,
        board_id: int,
        account_id: int,
        page: int = 1,
        page_size: int = 50,
        assigned_to_id: Optional[int] = None,
        is_won: Optional[bool] = None,
        is_lost: Optional[bool] = None
    ) -> CardListResponse:
        """
        Lista cards de um board com paginação e filtros.

        Args:
            board_id: ID do board
            account_id: ID da conta
            page: Número da página
            page_size: Tamanho da página
            assigned_to_id: Filtro por responsável
            is_won: Filtro por cards ganhos
            is_lost: Filtro por cards perdidos

        Returns:
            CardListResponse
        """
        # Verifica se o board existe e pertence à conta
        board = self.board_repository.find_by_id(board_id)
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        if board.account_id != account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a este board"
            )

        # Calcula offset
        skip = (page - 1) * page_size

        # Busca cards
        cards = self.card_repository.list_by_board(
            board_id=board_id,
            skip=skip,
            limit=page_size,
            assigned_to_id=assigned_to_id,
            is_won=is_won,
            is_lost=is_lost
        )

        # Conta total
        total = self.card_repository.count_by_board(
            board_id=board_id,
            assigned_to_id=assigned_to_id,
            is_won=is_won,
            is_lost=is_lost
        )

        # Calcula total de páginas
        total_pages = (total + page_size - 1) // page_size

        # Converte para response schema
        cards_response = []
        for card in cards:
            # Busca informações relacionadas
            assigned_to_name = None
            if card.assigned_to_id:
                from app.models.user import User
                assigned_user = self.db.query(User).filter(User.id == card.assigned_to_id).first()
                if assigned_user:
                    assigned_to_name = assigned_user.name

            list_obj = self.list_repository.find_by_id(card.list_id)
            list_name = list_obj.name if list_obj else None

            cards_response.append(
                CardResponse(
                    id=card.id,
                    title=card.title,
                    description=card.description,
                    list_id=card.list_id,
                    assigned_to_id=card.assigned_to_id,
                    value=card.value,
                    due_date=card.due_date,
                    contact_info=card.contact_info,
                    is_won=card.is_won,
                    is_lost=card.is_lost,
                    won_at=card.won_at,
                    lost_at=card.lost_at,
                    position=card.position,
                    created_at=card.created_at,
                    updated_at=card.updated_at,
                    assigned_to_name=assigned_to_name,
                    list_name=list_name,
                    board_id=board_id
                )
            )

        return CardListResponse(
            cards=cards_response,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def create_card(self, card_data: CardCreate, current_user: User) -> Card:
        """
        Cria um novo card.

        Args:
            card_data: Dados do card
            current_user: Usuário autenticado

        Returns:
            Card criado
        """
        # Verifica se a lista existe e pertence à conta do usuário
        list_obj = self.list_repository.find_by_id(card_data.list_id)
        if not list_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lista não encontrada"
            )

        board = self.board_repository.find_by_id(list_obj.board_id)
        if not board or board.account_id != current_user.account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode criar cards nesta lista"
            )

        # Cria o card
        card = self.card_repository.create(card_data)

        return card

    def update_card(self, card_id: int, card_data: CardUpdate, current_user: User) -> Card:
        """
        Atualiza um card.

        Args:
            card_id: ID do card
            card_data: Dados de atualização
            current_user: Usuário autenticado

        Returns:
            Card atualizado
        """
        # Busca e verifica acesso
        card = self.get_card_by_id(card_id, current_user.account_id)

        # Atualiza o card
        updated_card = self.card_repository.update(card, card_data)

        return updated_card

    def delete_card(self, card_id: int, current_user: User) -> None:
        """
        Deleta um card.

        Args:
            card_id: ID do card
            current_user: Usuário autenticado

        Raises:
            HTTPException: Se não tiver permissão para deletar
        """
        # Verifica permissão: apenas admins e managers podem deletar cards
        if current_user.role and current_user.role.name not in ["admin", "manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para deletar cards"
            )

        # Busca e verifica acesso
        card = self.get_card_by_id(card_id, current_user.account_id)

        # Deleta o card
        self.card_repository.delete(card)

    def move_card(self, card_id: int, target_list_id: int, position: Optional[int], current_user: User) -> Card:
        """
        Move um card para outra lista.

        Args:
            card_id: ID do card
            target_list_id: ID da lista de destino
            position: Posição na lista de destino
            current_user: Usuário autenticado

        Returns:
            Card movido
        """
        from datetime import datetime

        # Busca e verifica acesso ao card
        card = self.get_card_by_id(card_id, current_user.account_id)

        # Verifica se a lista de destino existe e pertence à mesma conta
        target_list = self.list_repository.find_by_id(target_list_id)
        if not target_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lista de destino não encontrada"
            )

        target_board = self.board_repository.find_by_id(target_list.board_id)
        if not target_board or target_board.account_id != current_user.account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode mover cards para esta lista"
            )

        # Verifica se a lista de destino é uma lista "won" ou "lost"
        # e marca o card adequadamente
        if target_list.is_done_stage:
            card.is_won = True
            card.won_at = datetime.now()
        elif target_list.is_lost_stage:
            card.is_lost = True
            card.lost_at = datetime.now()

        # Move o card
        moved_card = self.card_repository.move_to_list(card, target_list_id, position)

        return moved_card

    def assign_card(self, card_id: int, user_id: int, current_user: User) -> Card:
        """
        Atribui um card a um usuário.

        Args:
            card_id: ID do card
            user_id: ID do usuário
            current_user: Usuário autenticado

        Returns:
            Card atualizado
        """
        # Busca e verifica acesso ao card
        card = self.get_card_by_id(card_id, current_user.account_id)

        # Verifica se o usuário existe e pertence à mesma conta
        from app.models.user import User
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )

        if user.account_id != current_user.account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode atribuir cards a usuários de outra conta"
            )

        # Atribui o card
        assigned_card = self.card_repository.assign_to_user(card, user_id)

        return assigned_card

    # ========== CAMPOS CUSTOMIZADOS ==========

    def add_or_update_field_value(
        self,
        card_id: int,
        field_data: CardFieldValueCreate,
        current_user: User
    ) -> CardFieldValueResponse:
        """
        Adiciona ou atualiza o valor de um campo customizado em um card.

        Args:
            card_id: ID do card
            field_data: Dados do campo (aceita dois formatos)
            current_user: Usuário autenticado

        Returns:
            CardFieldValueResponse
        """
        from app.schemas.field import FieldDefinitionCreate

        # Verifica acesso ao card
        card = self.get_card_by_id(card_id, current_user.account_id)

        # Busca o board do card
        list_obj = self.list_repository.find_by_id(card.list_id)
        board_id = list_obj.board_id if list_obj else None

        if not board_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        # Determina qual formato foi usado e obtém/cria a field_definition
        field_def = None

        if field_data.field_name and field_data.field_type is not None:
            # Formato 2: Usando field_name (busca ou cria definição)
            field_def = self.field_repository.find_definition_by_name_and_board(
                field_data.field_name,
                board_id
            )

            if not field_def:
                # Cria nova definição
                new_def = FieldDefinitionCreate(
                    name=field_data.field_name,
                    field_type=field_data.field_type,
                    board_id=board_id,
                    is_required=False
                )
                field_def = self.field_repository.create_definition(new_def)

            # Converte para o formato esperado pelo repositório
            field_data.field_definition_id = field_def.id
            field_data.value = field_data.field_value

        elif field_data.field_definition_id:
            # Formato 1: Usando field_definition_id
            field_def = self.field_repository.find_definition_by_id(field_data.field_definition_id)
            if not field_def:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Definição de campo não encontrada"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Você deve fornecer field_definition_id ou (field_name + field_type)"
            )

        # Cria ou atualiza o valor
        field_value = self.field_repository.create_or_update_value(card_id, field_data)

        return CardFieldValueResponse(
            id=field_value.id,
            card_id=field_value.card_id,
            field_definition_id=field_value.field_definition_id,
            value=field_value.value,
            created_at=field_value.created_at,
            updated_at=field_value.updated_at,
            field_name=field_def.name,
            field_type=field_def.field_type
        )

    def get_card_field_values(self, card_id: int, current_user: User) -> List[CardFieldValueResponse]:
        """
        Lista todos os valores de campos customizados de um card.

        Args:
            card_id: ID do card
            current_user: Usuário autenticado

        Returns:
            Lista de CardFieldValueResponse
        """
        # Verifica acesso ao card
        card = self.get_card_by_id(card_id, current_user.account_id)

        # Busca valores
        field_values = self.field_repository.list_values_by_card(card_id)

        # Converte para response
        result = []
        for fv in field_values:
            field_def = self.field_repository.find_definition_by_id(fv.field_definition_id)
            result.append(
                CardFieldValueResponse(
                    id=fv.id,
                    card_id=fv.card_id,
                    field_definition_id=fv.field_definition_id,
                    value=fv.value,
                    created_at=fv.created_at,
                    updated_at=fv.updated_at,
                    field_name=field_def.name if field_def else None,
                    field_type=field_def.field_type if field_def else None
                )
            )

        return result
