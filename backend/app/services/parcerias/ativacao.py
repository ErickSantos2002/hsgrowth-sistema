"""
Ativação do parceiro: acontece no aceite dos termos, não por trava de etapa.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.user import User
from app.services.parcerias import atividades


def ativar(db: Session, parceiro: Partner, user: Optional[User]) -> None:
    """Quem chama faz o commit."""
    parceiro.stage = "ativado"
    parceiro.activated_at = datetime.utcnow()
    atividades.registrar_evento(db, user, "Parceiro ativado (aceite dos termos)",
                                partner_id=parceiro.id, tipo="card_won")
