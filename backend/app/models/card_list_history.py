"""
Modelo de CardListHistory (Histórico de Listas do Kanban).

Rastreia quando cada card entrou e saiu de cada lista, permitindo
análises de funil por etapa (ex: quantas propostas foram feitas na semana).
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime

from app.db.base import Base


class CardListHistory(Base):
    """
    Representa um período em que um card ficou em uma lista específica.

    Cada vez que um card é movido, o registro anterior recebe `exited_at`
    e um novo registro é criado para a lista de destino. O campo
    `exited_at` é NULL enquanto o card ainda está nessa lista.

    O campo `board_id` é desnormalizado (poderia ser obtido via join com
    lists) para tornar as queries de relatório mais simples e performáticas.
    """
    __tablename__ = "card_list_history"

    id = Column(Integer, primary_key=True, index=True)

    # Card que foi movido
    card_id = Column(
        Integer,
        ForeignKey("cards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Lista de destino
    list_id = Column(
        Integer,
        ForeignKey("lists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Board desnormalizado para facilitar filtros de relatório por quadro
    board_id = Column(
        Integer,
        ForeignKey("boards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Quando o card entrou nessa lista
    entered_at = Column(DateTime, nullable=False)

    # Quando o card saiu dessa lista (NULL = card ainda está aqui)
    exited_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return (
            f"<CardListHistory(id={self.id}, card_id={self.card_id}, "
            f"list_id={self.list_id}, entered_at={self.entered_at})>"
        )
