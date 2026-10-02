"""
Modelo de CardCheck — a "bolinha" de concluído de um card, por usuário.

É organização pessoal (como no Trello): cada usuário marca o que já fez da sua
parte, e só ele vê a marcação.

A marcação guarda uma foto do contexto do card no momento do clique — o board
e a situação (aberto/ganho/perdido). Se o card for para outro board ou mudar de
situação, a foto deixa de bater e a marcação deixa de valer. Assim nenhum dos
muitos caminhos que mexem no card (arrastar, ganho/perdido, automações,
"Unificado"...) precisa lembrar de desmarcar.
"""
from datetime import datetime

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

from app.db.base import Base


class CardCheck(Base):
    """Marcação de concluído de um card (Vendas ou Serviço) por um usuário."""

    __tablename__ = "card_checks"
    __table_args__ = (
        UniqueConstraint("user_id", "card_id", name="uq_card_checks_user_card"),
        UniqueConstraint("user_id", "service_card_id", name="uq_card_checks_user_service_card"),
        CheckConstraint(
            "(card_id IS NULL) <> (service_card_id IS NULL)",
            name="ck_card_checks_um_card",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,
        comment="Quem marcou",
    )
    card_id = Column(
        Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=True, index=True,
        comment="Card de Vendas",
    )
    service_card_id = Column(
        Integer, ForeignKey("service_cards.id", ondelete="CASCADE"), nullable=True, index=True,
        comment="Card de Serviço",
    )
    board_id = Column(Integer, nullable=False, comment="Board do card no momento do clique")
    situacao = Column(String(10), nullable=False, comment="aberto | ganho | perdido no clique")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return (
            f"<CardCheck(user={self.user_id}, card={self.card_id}, "
            f"service_card={self.service_card_id})>"
        )
