"""Apaga notificações lidas há mais de 30 dias (decisão de 14/10/2026). As não lidas ficam."""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.notification import Notification

DIAS = 30


def limpar_notificacoes_lidas(db: Session, agora_utc: datetime) -> int:
    """Returns: quantas foram apagadas."""
    apagadas = (
        db.query(Notification)
        .filter(
            Notification.is_read == True,  # noqa: E712
            Notification.read_at.isnot(None),
            Notification.read_at < agora_utc - timedelta(days=DIAS),
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return apagadas
