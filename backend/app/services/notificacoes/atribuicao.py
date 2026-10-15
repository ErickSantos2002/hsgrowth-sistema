"""
Aviso de quem foi colocado num card de Vendas.

Lead que chegou sozinho (card criado por usuário de integração) sai como
"Novo lead do site", uma vez só; o resto sai como "Card atribuído a você".
"""
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.user import User
from app.services.notificacoes.enviar import notificar


def e_lead_do_site(db: Session, card: Card) -> bool:
    """Card criado por usuário de integração. Cards de antes de 14/10/2026 não têm criador."""
    if not card or not card.created_by_id:
        return False
    return bool(
        db.query(User.is_integracao).filter(User.id == card.created_by_id).scalar()
    )


def avisar_atribuicao(db: Session, card: Card, destinatario_id: int, papel: str, autor_id) -> None:
    """
    Args:
        papel: "vendedor" ou "sdr".
        autor_id: quem fez a atribuição; None quando foi o sistema (rodízio).
    """
    if papel == "vendedor" and e_lead_do_site(db, card):
        notificar(
            db, destinatario_id, "lead_site",
            f"Novo lead do site: {card.title}",
            f"Chegou pelo site ({card.origin or 'origem não informada'}) e foi distribuído para você.",
            link=f"/cards/{card.id}",
            metadata={"card_id": card.id, "card_title": card.title},
            autor_id=autor_id,
            referencia=f"lead:{card.id}",
        )
        return

    sufixo = " como SDR" if papel == "sdr" else ""
    notificar(
        db, destinatario_id, "card_atribuido",
        "Card atribuído a você",
        f"O card '{card.title}' foi atribuído a você{sufixo}",
        link=f"/cards/{card.id}",
        metadata={"card_id": card.id, "card_title": card.title},
        autor_id=autor_id,
    )
