"""
Board Repository - Operações de acesso a dados de boards.
Implementa o padrão Repository para isolamento da camada de dados.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.board import Board
from app.schemas.board import BoardCreate, BoardUpdate


class BoardRepository:
    """
    Repository para operações de banco de dados relacionadas a boards.
    """

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, board_id: int) -> Optional[Board]:
        """
        Busca um board por ID.

        Args:
            board_id: ID do board

        Returns:
            Board ou None se não encontrado
        """
        return self.db.query(Board).filter(
            Board.id == board_id
        ).first()

    def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        is_archived: Optional[bool] = None
    ) -> List[Board]:
        """
        Lista todos os boards do sistema.

        Args:
            skip: Número de registros para pular (paginação)
            limit: Limite de registros a retornar
            is_archived: Filtro por status arquivado (opcional)

        Returns:
            Lista de boards
        """
        query = self.db.query(Board)

        if is_archived is not None:
            query = query.filter(Board.is_archived == is_archived)

        return query.offset(skip).limit(limit).all()

    def count_all(self, is_archived: Optional[bool] = None) -> int:
        """
        Conta todos os boards do sistema.

        Args:
            is_archived: Filtro por status arquivado (opcional)

        Returns:
            Número de boards
        """
        query = self.db.query(Board)

        if is_archived is not None:
            query = query.filter(Board.is_archived == is_archived)

        return query.count()

    def create(self, board_data: BoardCreate) -> Board:
        """
        Cria um novo board.

        Args:
            board_data: Dados do board a ser criado

        Returns:
            Board criado
        """
        board = Board(
            name=board_data.name,
            description=board_data.description,
            color=board_data.color,
            icon=board_data.icon,
            is_archived=False
        )

        self.db.add(board)
        self.db.commit()
        self.db.refresh(board)

        return board

    def update(self, board: Board, board_data: BoardUpdate) -> Board:
        """
        Atualiza um board existente.

        Args:
            board: Board a ser atualizado
            board_data: Dados de atualização

        Returns:
            Board atualizado
        """
        # Atualiza apenas os campos fornecidos
        update_data = board_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(board, field, value)

        self.db.commit()
        self.db.refresh(board)

        return board

    def delete(self, board: Board) -> None:
        """
        Deleta um board permanentemente.

        Args:
            board: Board a ser deletado
        """
        self.db.delete(board)
        self.db.commit()

    def duplicate(self, board: Board, new_name: str) -> Board:
        """
        Duplica um board (sem copiar listas/cards).

        Args:
            board: Board a ser duplicado
            new_name: Nome do novo board

        Returns:
            Board duplicado
        """
        new_board = Board(
            name=new_name,
            description=board.description,
            color=board.color,
            icon=board.icon,
            is_archived=False
        )

        self.db.add(new_board)
        self.db.commit()
        self.db.refresh(new_board)

        return new_board
