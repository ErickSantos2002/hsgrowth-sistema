"""
Board Service - Lógica de negócio para boards.
Implementa validações e regras de negócio.
"""
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.board_repository import BoardRepository
from app.repositories.list_repository import ListRepository
from app.schemas.board import BoardCreate, BoardUpdate, BoardResponse, BoardListResponse
from app.models.board import Board
from app.models.user import User


class BoardService:
    """
    Service para lógica de negócio relacionada a boards.
    """

    def __init__(self, db: Session):
        self.db = db
        self.board_repository = BoardRepository(db)
        self.list_repository = ListRepository(db)

    def get_board_by_id(self, board_id: int) -> Board:
        """
        Busca um board por ID.

        Args:
            board_id: ID do board

        Returns:
            Board

        Raises:
            HTTPException: Se o board não for encontrado
        """
        board = self.board_repository.find_by_id(board_id)

        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        return board

    def list_boards(
        self,
        page: int = 1,
        page_size: int = 50,
        is_archived: Optional[bool] = None
    ) -> BoardListResponse:
        """
        Lista todos os boards do sistema com paginação.

        Args:
            page: Número da página
            page_size: Tamanho da página
            is_archived: Filtro por status arquivado

        Returns:
            BoardListResponse com lista paginada de boards
        """
        # Calcula offset
        skip = (page - 1) * page_size

        # Busca boards
        boards = self.board_repository.list_all(
            skip=skip,
            limit=page_size,
            is_archived=is_archived
        )

        # Conta total
        total = self.board_repository.count_all(
            is_archived=is_archived
        )

        # Calcula total de páginas
        total_pages = (total + page_size - 1) // page_size

        # Converte para response schema
        boards_response = []
        for board in boards:
            # Conta listas e cards
            lists_count = self.list_repository.count_by_board(board.id)
            # TODO: Contar cards quando o módulo de cards estiver pronto
            cards_count = 0

            boards_response.append(
                BoardResponse(
                    id=board.id,
                    name=board.name,
                    description=board.description,
                    color=board.color,
                    icon=board.icon,
                    is_archived=board.is_archived,
                    created_at=board.created_at,
                    updated_at=board.updated_at,
                    lists_count=lists_count,
                    cards_count=cards_count
                )
            )

        return BoardListResponse(
            boards=boards_response,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def create_board(self, board_data: BoardCreate, current_user: User) -> Board:
        """
        Cria um novo board.

        Args:
            board_data: Dados do board
            current_user: Usuário autenticado

        Returns:
            Board criado
        """
        # Cria o board
        board = self.board_repository.create(board_data)

        return board

    def update_board(self, board_id: int, board_data: BoardUpdate, current_user: User) -> Board:
        """
        Atualiza um board existente.

        Args:
            board_id: ID do board
            board_data: Dados de atualização
            current_user: Usuário autenticado

        Returns:
            Board atualizado

        Raises:
            HTTPException: Se validação falhar
        """
        # Busca o board com validação de account
        board = self.get_board_by_id(board_id)

        # Atualiza o board
        updated_board = self.board_repository.update(board, board_data)

        return updated_board

    def delete_board(self, board_id: int, current_user: User) -> None:
        """
        Deleta um board permanentemente.

        Args:
            board_id: ID do board
            current_user: Usuário autenticado

        Raises:
            HTTPException: Se validação falhar
        """
        # Busca o board com validação de account
        board = self.get_board_by_id(board_id)

        # TODO: Verificar se o usuário tem permissão de admin
        # Por enquanto, permite qualquer usuário da conta deletar

        # Deleta o board (isso também deletará listas e cards em cascade)
        self.board_repository.delete(board)

    def duplicate_board(
        self,
        board_id: int,
        new_name: str,
        copy_lists: bool,
        copy_cards: bool,
        current_user: User
    ) -> Board:
        """
        Duplica um board.

        Args:
            board_id: ID do board a duplicar
            new_name: Nome do novo board
            copy_lists: Se deve copiar as listas
            copy_cards: Se deve copiar os cards
            current_user: Usuário autenticado

        Returns:
            Board duplicado

        Raises:
            HTTPException: Se validação falhar
        """
        # Busca o board original com validação de account
        source_board = self.get_board_by_id(board_id)

        # Duplica o board
        new_board = self.board_repository.duplicate(source_board, new_name)

        # Copia listas se solicitado
        if copy_lists:
            self.list_repository.duplicate_for_board(source_board.id, new_board.id)

        # TODO: Copiar cards quando o módulo de cards estiver pronto
        if copy_cards:
            pass

        return new_board
