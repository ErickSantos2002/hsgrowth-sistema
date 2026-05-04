"""
Redistribui os cards do Sérgio Viana (id=15) em Lead Novo
igualmente entre os 5 SDRs restantes via round-robin.

SDRs destino:
  8  - Claudia
  9  - Karolaine Martins
  14 - Ãhwaryoné
  16 - Miguel Luiz
  17 - Lucas
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.db.session import SessionLocal
from app.models.card import Card
from datetime import datetime

SERGIO_ID = 15
LEAD_NOVO_ID = 22

SDR_IDS = [8, 9, 14, 16, 17]
SDR_NAMES = {8: "Claudia", 9: "Karolaine", 14: "Ãhwaryoné", 16: "Miguel Luiz", 17: "Lucas"}

def main(dry_run: bool = False):
    db = SessionLocal()

    cards = (
        db.query(Card)
        .filter(
            Card.sdr_id == SERGIO_ID,
            Card.list_id == LEAD_NOVO_ID,
            Card.is_deleted == False,
        )
        .order_by(Card.id)
        .all()
    )

    total = len(cards)
    print(f"Cards do Sérgio em Lead Novo: {total}")
    print(f"SDRs destino: {[SDR_NAMES[i] for i in SDR_IDS]}")
    print(f"Distribuição: {total // len(SDR_IDS)} cada + {total % len(SDR_IDS)} extra(s)")
    print()

    contagem = {sdr_id: 0 for sdr_id in SDR_IDS}

    for i, card in enumerate(cards):
        novo_sdr = SDR_IDS[i % len(SDR_IDS)]
        contagem[novo_sdr] += 1
        if dry_run:
            print(f"  [DRY] card {card.id} | {card.title[:50]} -> {SDR_NAMES[novo_sdr]}")
        else:
            card.sdr_id = novo_sdr
            card.updated_at = datetime.now()

    if not dry_run:
        db.commit()
        print("Commit realizado.")

    print()
    print("=== Resumo por SDR ===")
    for sdr_id, qtd in contagem.items():
        print(f"  {SDR_NAMES[sdr_id]}: {qtd} cards")
    print(f"  Total: {sum(contagem.values())}")

    db.close()

if __name__ == "__main__":
    dry = "--dry" in sys.argv
    if dry:
        print("=== MODO DRY RUN (sem alterações no banco) ===\n")
    main(dry_run=dry)
