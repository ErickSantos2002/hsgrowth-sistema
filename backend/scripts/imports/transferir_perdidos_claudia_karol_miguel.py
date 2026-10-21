"""
Complemento do desligamento Claudia (8) / Karol (9): transfere também os cards
PERDIDOS delas para o Miguel (16). (Os ABERTOS já foram transferidos antes por
transferir_claudia_karol_miguel.py. Solicitado pelo Miguel em 21/10/2026.)

O que faz — cards PERDIDOS (is_won = -1, não deletados):
  - onde sdr_id IN (8,9)         -> sdr_id = 16
  - onde assigned_to_id IN (8,9) -> assigned_to_id = 16
  (preserva o campo). NÃO toca em cards GANHOS (is_won=1) nem nas tarefas
  (tarefas pendentes já foram reatribuídas no passo anterior).

Uso:
  python scripts/imports/transferir_perdidos_claudia_karol_miguel.py --dry
  python scripts/imports/transferir_perdidos_claudia_karol_miguel.py
"""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.db.session import SessionLocal
from app.models.card import Card

ORIGEM = [8, 9]
DEST = 16


def main(dry_run: bool = False):
    db = SessionLocal()

    cards_sdr = (
        db.query(Card)
        .filter(Card.sdr_id.in_(ORIGEM), Card.is_won == -1, Card.is_deleted == False)
        .all()
    )
    cards_assigned = (
        db.query(Card)
        .filter(Card.assigned_to_id.in_(ORIGEM), Card.is_won == -1, Card.is_deleted == False)
        .all()
    )
    ids = {c.id for c in cards_sdr} | {c.id for c in cards_assigned}

    print(f"Cards PERDIDOS a transferir -> Miguel:")
    print(f"  via sdr_id (8/9 -> 16)        : {len(cards_sdr)}")
    print(f"  via assigned_to_id (8/9 -> 16): {len(cards_assigned)}")
    print(f"  cards distintos afetados       : {len(ids)}")

    # Aviso sobre ganhos deixados de fora
    ganhos = db.query(Card).filter(
        ((Card.sdr_id.in_(ORIGEM)) | (Card.assigned_to_id.in_(ORIGEM))),
        Card.is_won == 1, Card.is_deleted == False,
    ).count()
    print(f"  (cards GANHOS deixados com elas: {ganhos})")

    if dry_run:
        print("\n=== DRY RUN — nada foi alterado ===")
        db.close()
        return

    now = datetime.now()
    for c in cards_sdr:
        c.sdr_id = DEST
        c.updated_at = now
    for c in cards_assigned:
        c.assigned_to_id = DEST
        c.updated_at = now

    db.commit()
    print(f"\n=== COMMIT realizado — {len(ids)} cards perdidos transferidos ===")
    db.close()


if __name__ == "__main__":
    dry = "--dry" in sys.argv
    if dry:
        print("=== MODO DRY RUN ===\n")
    main(dry_run=dry)
