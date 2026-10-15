"""
Card novo nos boards de Serviço.

Os cards de Serviço não têm dono (em 14/10/2026, os 1.368 abertos estavam sem
responsável): o aviso vai para quem acompanha o board, escolhido em
Configurações. Chega em lote — 101 cards de Cobrança de uma vez em 01/10 —
então vários cards viram um aviso só por board.
"""
from collections import defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_list import ServiceList
from app.models.user import User
from app.services.notificacoes.enviar import notificar
from app.services.user_notification_service import UserNotificationService

# Quem pode acompanhar boards de Serviço
PAPEIS = ("service", "admin", "manager")
AMOSTRA = 3


def _aviso(board_id: int, nome: str, cards: list) -> tuple:
    if len(cards) == 1:
        c = cards[0]
        return (f"Novo card em {nome}", c.title,
                f"/servicos/{board_id}/cards/{c.id}", f"servico_card:{c.id}")
    resto = len(cards) - AMOSTRA
    mensagem = ", ".join(c.title for c in cards[:AMOSTRA])
    if resto > 0:
        mensagem += f" e mais {resto}"
    return (f"{len(cards)} cards novos em {nome}", mensagem,
            f"/servicos/{board_id}", f"servico_lote:{board_id}:{cards[0].id}-{cards[-1].id}")


def avisar_cards_novos_de_servico(db: Session, agora_utc: datetime) -> int:
    """Returns: quantos avisos foram enviados."""
    novos = (
        db.query(ServiceCard, ServiceList.board_id)
        .join(ServiceList, ServiceList.id == ServiceCard.list_id)
        .filter(ServiceCard.avisado_em.is_(None), ServiceCard.is_deleted == False)  # noqa: E712
        .order_by(ServiceCard.id)
        .all()
    )
    if not novos:
        return 0

    ids = [c.id for c, _ in novos]
    criador = dict(
        db.query(ServiceCardActivity.service_card_id, ServiceCardActivity.user_id)
        .filter(ServiceCardActivity.service_card_id.in_(ids),
                ServiceCardActivity.activity_type == "card_created")
        .all()
    )
    nomes = {b.id: b.name for b in db.query(ServiceBoard).filter(
        ServiceBoard.id.in_({board_id for _, board_id in novos}))}

    pessoas = (
        db.query(User)
        .join(Role, Role.id == User.role_id)
        .filter(Role.name.in_(PAPEIS), User.is_active == True,  # noqa: E712
                User.is_deleted == False, User.is_integracao == False)  # noqa: E712
        .all()
    )
    preferencias = UserNotificationService(db)

    enviados = 0
    for pessoa in pessoas:
        acompanha = set(preferencias.get_or_create(pessoa.id).quadros_servico or [])
        por_board = defaultdict(list)
        for card, board_id in novos:
            if board_id in acompanha and criador.get(card.id) != pessoa.id:
                por_board[board_id].append(card)

        for board_id, cards in por_board.items():
            titulo, mensagem, link, referencia = _aviso(board_id, nomes.get(board_id, "Serviço"), cards)
            if notificar(
                db, pessoa.id, "card_novo_servico", titulo, mensagem,
                link=link,
                metadata={"board_id": board_id, "service_card_ids": [c.id for c in cards]},
                referencia=referencia,
            ):
                enviados += 1

    for card, _ in novos:
        card.avisado_em = agora_utc
    db.commit()
    return enviados
