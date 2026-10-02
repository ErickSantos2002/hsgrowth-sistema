"""
Bolinha "concluído" pessoal nos cards (Vendas e Serviço).

A marcação vale enquanto o card estiver no MESMO board e na MESMA situação
(aberto/ganho/perdido) de quando foi marcada. Ver app/models/card_check.py.
"""
from typing import Dict, Optional, Set, Tuple

from loguru import logger
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.models.card_check import CardCheck

Contexto = Tuple[int, str]  # (board_id, situacao)


def situacao_card(card) -> str:
    """Card de Vendas: is_won 1 = ganho, -1 = perdido, resto = aberto."""
    if card.is_won == 1:
        return "ganho"
    if card.is_won == -1:
        return "perdido"
    return "aberto"


def situacao_lista_servico(lista) -> str:
    """Card de Serviço: a situação vem da lista, por flag OU nome (as listas nem sempre têm a flag)."""
    if not lista:
        return "aberto"
    nome = (lista.name or "").lower()
    if lista.is_done_stage or "ganho" in nome:
        return "ganho"
    if lista.is_lost_stage or "perdido" in nome:
        return "perdido"
    return "aberto"


class CardCheckService:
    def __init__(self, db: Session):
        self.db = db

    def _buscar(self, user_id: int, coluna: str, card_id: int) -> Optional[CardCheck]:
        return (
            self.db.query(CardCheck)
            .filter(CardCheck.user_id == user_id, getattr(CardCheck, coluna) == card_id)
            .first()
        )

    def marcar(self, user_id: int, coluna: str, card_id: int, board_id: int, situacao: str) -> None:
        """Marca (ou atualiza a foto, se já marcado). `coluna` = 'card_id' ou 'service_card_id'."""
        check = self._buscar(user_id, coluna, card_id)
        if check is None:
            check = CardCheck(user_id=user_id, **{coluna: card_id})
            self.db.add(check)
        check.board_id = board_id
        check.situacao = situacao
        try:
            self.db.commit()
        except IntegrityError:
            # Clique duplo: a outra requisição já gravou — o resultado é o mesmo.
            self.db.rollback()

    def desmarcar(self, user_id: int, coluna: str, card_id: int) -> None:
        self.db.query(CardCheck).filter(
            CardCheck.user_id == user_id, getattr(CardCheck, coluna) == card_id
        ).delete(synchronize_session=False)
        self.db.commit()

    def desmarcar_lista(self, user_id: int, coluna: str, list_id: int) -> int:
        """Desmarca todas as marcações do usuário nos cards de uma lista. Devolve quantas apagou.
        Vale para a lista inteira, inclusive cards escondidos por filtro na tela."""
        from app.models.card import Card
        from app.models.service_card import ServiceCard

        modelo = Card if coluna == "card_id" else ServiceCard
        ids_da_lista = select(modelo.id).where(modelo.list_id == list_id)
        removidas = (
            self.db.query(CardCheck)
            .filter(CardCheck.user_id == user_id, getattr(CardCheck, coluna).in_(ids_da_lista))
            .delete(synchronize_session=False)
        )
        self.db.commit()
        return removidas

    def ids_validos(self, user_id: int, coluna: str, contextos: Dict[int, Contexto]) -> Set[int]:
        """Ids marcados pelo usuário cuja foto bate com o contexto atual.
        Marcações que não batem mais são apagadas aqui mesmo (limpeza preguiçosa)."""
        if not contextos:
            return set()
        campo = getattr(CardCheck, coluna)
        try:
            # Savepoint: se a consulta falhar, só ela é desfeita — a listagem segue.
            with self.db.begin_nested():
                checks = (
                    self.db.query(CardCheck)
                    .filter(CardCheck.user_id == user_id, campo.in_(list(contextos)))
                    .all()
                )
        except (OperationalError, ProgrammingError):
            # Tabela ainda não criada (backend subiu antes da migration):
            # o board abre normalmente, só sem as bolinhas.
            logger.warning("card_checks indisponível — board listado sem a bolinha 'concluído'")
            return set()
        validos: Set[int] = set()
        vencidos = []
        for ch in checks:
            cid = getattr(ch, coluna)
            if (ch.board_id, ch.situacao) == contextos[cid]:
                validos.add(cid)
            else:
                vencidos.append(ch.id)
        if vencidos:
            self.db.query(CardCheck).filter(CardCheck.id.in_(vencidos)).delete(synchronize_session=False)
            self.db.commit()
        return validos
