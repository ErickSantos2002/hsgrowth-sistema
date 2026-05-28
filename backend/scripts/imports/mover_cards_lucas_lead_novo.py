"""
Move todos os cards do Lucas (id=17) da lista Prospecção (id=23)
para a lista Lead Novo (id=22) no board Prospecção (board_id=6).

Uso:
  python scripts/imports/mover_cards_lucas_lead_novo.py          # executa
  python scripts/imports/mover_cards_lucas_lead_novo.py --dry    # dry run
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.db.session import SessionLocal
from app.models.card import Card
from sqlalchemy import func
from datetime import datetime

LUCAS_ID       = 17
LIST_ORIGEM    = 23  # Prospecção
LIST_DESTINO   = 22  # Lead Novo


def main(dry_run: bool = False):
    db = SessionLocal()

    cards = (
        db.query(Card)
        .filter(
            Card.sdr_id == LUCAS_ID,
            Card.list_id == LIST_ORIGEM,
            Card.is_deleted == False,
            Card.closed_at == None,
        )
        .order_by(Card.id)
        .all()
    )

    total = len(cards)
    print(f"Cards do Lucas em Prospecção (id={LIST_ORIGEM}): {total}")
    print(f"Destino: Lead Novo (id={LIST_DESTINO})")
    print()

    if total == 0:
        print("Nenhum card para mover.")
        db.close()
        return

    # Calcula posição máxima atual em Lead Novo para não colidir
    max_pos = db.query(func.max(Card.position)).filter(Card.list_id == LIST_DESTINO).scalar() or 0

    for i, card in enumerate(cards):
        nova_pos = max_pos + i + 1
        if dry_run:
            print(f"  [DRY] card {card.id} | {card.title[:60]} -> Lead Novo (pos={nova_pos})")
        else:
            card.list_id = LIST_DESTINO
            card.position = nova_pos
            card.updated_at = datetime.now()

    if not dry_run:
        db.commit()
        print(f"{total} cards movidos para Lead Novo com sucesso.")
    else:
        print(f"\nTotal que seria movido: {total}")

    db.close()


if __name__ == "__main__":
    dry = "--dry" in sys.argv
    if dry:
        print("=== MODO DRY RUN (sem alterações no banco) ===\n")
    main(dry_run=dry)
