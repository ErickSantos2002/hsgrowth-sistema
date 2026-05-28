"""
Redistribui os cards do Lucas (id=17) e Aury (id=14) em Lead Novo (id=22)
igualmente entre os 3 SDRs ativos via round-robin.

SDRs destino:
  8  - Claudia
  9  - Karolaine Martins
  16 - Miguel Luiz

Uso:
  python scripts/imports/redistribuir_cards_lucas_aury.py          # executa
  python scripts/imports/redistribuir_cards_lucas_aury.py --dry    # dry run
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.db.session import SessionLocal
from app.models.card import Card
from datetime import datetime

SDR_IDS_ORIGEM = [14, 17]  # Aury, Lucas
LEAD_NOVO_ID   = 22

SDR_IDS_DESTINO = [8, 9, 16]
SDR_NAMES       = {8: "Claudia", 9: "Karolaine", 16: "Miguel Luiz"}


def main(dry_run: bool = False):
    db = SessionLocal()

    cards = (
        db.query(Card)
        .filter(
            Card.sdr_id.in_(SDR_IDS_ORIGEM),
            Card.list_id == LEAD_NOVO_ID,
            Card.is_deleted == False,
            Card.closed_at == None,
        )
        .order_by(Card.id)
        .all()
    )

    total = len(cards)
    print(f"Cards de Aury + Lucas em Lead Novo: {total}")
    print(f"SDRs destino: {[SDR_NAMES[i] for i in SDR_IDS_DESTINO]}")
    print(f"Distribuicao: {total // len(SDR_IDS_DESTINO)} cada + {total % len(SDR_IDS_DESTINO)} extra(s)")
    print()

    contagem = {sdr_id: 0 for sdr_id in SDR_IDS_DESTINO}

    for i, card in enumerate(cards):
        novo_sdr = SDR_IDS_DESTINO[i % len(SDR_IDS_DESTINO)]
        contagem[novo_sdr] += 1
        if dry_run:
            print(f"  [DRY] card {card.id} | {card.title[:55]} -> {SDR_NAMES[novo_sdr]}")
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
        print("=== MODO DRY RUN (sem alteracoes no banco) ===\n")
    main(dry_run=dry)
