"""
List Repository - Operações de acesso a dados de listas.
Implementa o padrão Repository para isolamento da camada de dados.
"""
from typing import Optional, List as ListType
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.list import List
from app.schemas.list import ListCreate, ListUpdate


class ListRepository:
    """
    Repository para operações de banco de dados relacionadas a listas.
    """

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, list_id: int) -> Optional[List]:
        """
        Busca uma lista por ID.

        Args:
            list_id: ID da lista

        Returns:
            List ou None se não encontrado
        """
        return self.db.query(List).filter(
            List.id == list_id
        ).first()

    def list_by_board(self, board_id: int) -> ListType[List]:
        """
        Lista todas as listas de um board, ordenadas por posição.

        Args:
            board_id: ID do board

        Returns:
            Lista de listas ordenadas por posição
        """
        return self.db.query(List).filter(
            List.board_id == board_id
        ).order_by(List.position).all()

    def count_by_board(self, board_id: int) -> int:
        """
        Conta listas de um board específico.

        Args:
            board_id: ID do board

        Returns:
            Número de listas
        """
        return self.db.query(List).filter(
            List.board_id == board_id
        ).count()

    def get_max_position(self, board_id: int) -> int:
        """
        Obtém a maior posição de lista em um board.

        Args:
            board_id: ID do board

        Returns:
            Maior posição (ou 0 se não houver listas)
        """
        max_pos = self.db.query(func.max(List.position)).filter(
            List.board_id == board_id
        ).scalar()

        return max_pos if max_pos is not None else -1

    def create(self, list_data: ListCreate) -> List:
        """
        Cria uma nova lista.

        Args:
            list_data: Dados da lista a ser criada

        Returns:
            List criada
        """
        # Se posição não foi fornecida, coloca no final
        if list_data.position is None:
            position = self.get_max_position(list_data.board_id) + 1
        else:
            position = list_data.position

        new_list = List(
            name=list_data.name,
            color=list_data.color,
            board_id=list_data.board_id,
            position=position
        )

        self.db.add(new_list)
        self.db.commit()
        self.db.refresh(new_list)

        return new_list

    def update(self, list_obj: List, list_data: ListUpdate) -> List:
        """
        Atualiza uma lista existente.

        Args:
            list_obj: Lista a ser atualizada
            list_data: Dados de atualização

        Returns:
            List atualizada
        """
        # Atualiza apenas os campos fornecidos
        update_data = list_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(list_obj, field, value)

        self.db.commit()
        self.db.refresh(list_obj)

        return list_obj

    def delete(self, list_obj: List) -> None:
        """
        Deleta uma lista permanentemente.

        Args:
            list_obj: Lista a ser deletada
        """
        self.db.delete(list_obj)
        self.db.commit()

    def reorder(self, list_obj: List, new_position: int) -> List:
        """
        Reordena uma lista para uma nova posição.

        Args:
            list_obj: Lista a ser reordenada
            new_position: Nova posição

        Returns:
            List reordenada
        """
        old_position = list_obj.position
        board_id = list_obj.board_id

        # Se a nova posição é a mesma, não faz nada
        if old_position == new_position:
            return list_obj

        # Move outras listas para abrir espaço
        if new_position < old_position:
            # Movendo para cima: incrementa posição das listas entre new e old
            self.db.query(List).filter(
                List.board_id == board_id,
                List.position >= new_position,
                List.position < old_position
            ).update({List.position: List.position + 1})
        else:
            # Movendo para baixo: decrementa posição das listas entre old e new
            self.db.query(List).filter(
                List.board_id == board_id,
                List.position > old_position,
                List.position <= new_position
            ).update({List.position: List.position - 1})

        # Atualiza a posição da lista
        list_obj.position = new_position
        self.db.commit()
        self.db.refresh(list_obj)

        return list_obj

    def duplicate_for_board(self, source_board_id: int, target_board_id: int) -> None:
        """
        Duplica todas as listas de um board para outro board.

        Args:
            source_board_id: ID do board de origem
            target_board_id: ID do board de destino
        """
        source_lists = self.list_by_board(source_board_id)

        for source_list in source_lists:
            new_list = List(
                name=source_list.name,
                color=source_list.color,
                board_id=target_board_id,
                position=source_list.position
            )
            self.db.add(new_list)

        self.db.commit()
