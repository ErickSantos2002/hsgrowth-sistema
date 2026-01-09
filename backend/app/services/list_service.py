"""
List Service - Lógica de negócio para listas.
Implementa validações e regras de negócio.
"""
from typing import List as ListType
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.list_repository import ListRepository
from app.repositories.board_repository import BoardRepository
from app.schemas.list import ListCreate, ListUpdate, ListResponse
from app.models.list import List
from app.models.user import User


class ListService:
    """
    Service para lógica de negócio relacionada a listas.
    """

    def __init__(self, db: Session):
        self.db = db
        self.list_repository = ListRepository(db)
        self.board_repository = BoardRepository(db)

    def get_list_by_id(self, list_id: int) -> List:
        """
        Busca uma lista por ID.

        Args:
            list_id: ID da lista

        Returns:
            List

        Raises:
            HTTPException: Se a lista não for encontrada
        """
        list_obj = self.list_repository.find_by_id(list_id)

        if not list_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lista não encontrada"
            )

        return list_obj

    def list_by_board(self, board_id: int) -> ListType[ListResponse]:
        """
        Lista todas as listas de um board.

        Args:
            board_id: ID do board

        Returns:
            Lista de listas ordenadas por posição

        Raises:
            HTTPException: Se o board não for encontrado
        """
        # Verifica se o board existe
        board = self.board_repository.find_by_id(board_id)
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        # Busca listas
        lists = self.list_repository.list_by_board(board_id)

        # Converte para response schema
        lists_response = []
        for list_obj in lists:
            # TODO: Contar cards quando o módulo de cards estiver pronto
            cards_count = 0

            lists_response.append(
                ListResponse(
                    id=list_obj.id,
                    name=list_obj.name,
                    color=list_obj.color,
                    board_id=list_obj.board_id,
                    position=list_obj.position,
                    created_at=list_obj.created_at,
                    updated_at=list_obj.updated_at,
                    cards_count=cards_count
                )
            )

        return lists_response

    def create_list(self, list_data: ListCreate, current_user: User) -> List:
        """
        Cria uma nova lista.

        Args:
            list_data: Dados da lista
            current_user: Usuário autenticado

        Returns:
            List criada

        Raises:
            HTTPException: Se validação falhar
        """
        # Verifica se o board existe
        board = self.board_repository.find_by_id(list_data.board_id)
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        # Cria a lista
        new_list = self.list_repository.create(list_data)

        return new_list

    def update_list(self, list_id: int, list_data: ListUpdate, current_user: User) -> List:
        """
        Atualiza uma lista existente.

        Args:
            list_id: ID da lista
            list_data: Dados de atualização
            current_user: Usuário autenticado

        Returns:
            List atualizada

        Raises:
            HTTPException: Se validação falhar
        """
        # Busca a lista
        list_obj = self.get_list_by_id(list_id)

        # Atualiza a lista
        updated_list = self.list_repository.update(list_obj, list_data)

        return updated_list

    def delete_list(self, list_id: int, current_user: User) -> None:
        """
        Deleta uma lista permanentemente.

        Args:
            list_id: ID da lista
            current_user: Usuário autenticado

        Raises:
            HTTPException: Se validação falhar
        """
        # Busca a lista
        list_obj = self.get_list_by_id(list_id)

        # Deleta a lista (isso também deletará cards em cascade)
        self.list_repository.delete(list_obj)

    def move_list(self, list_id: int, new_position: int, current_user: User) -> List:
        """
        Move/reordena uma lista para uma nova posição.

        Args:
            list_id: ID da lista
            new_position: Nova posição
            current_user: Usuário autenticado

        Returns:
            List reordenada

        Raises:
            HTTPException: Se validação falhar
        """
        # Busca a lista
        list_obj = self.get_list_by_id(list_id)

        # Reordena a lista
        reordered_list = self.list_repository.reorder(list_obj, new_position)

        return reordered_list
