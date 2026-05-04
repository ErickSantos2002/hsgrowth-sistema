"""
Reatribui as tarefas (CardTask) do Sérgio Viana (id=15) ao SDR atual
de cada card. Tarefas de cards sem SDR ficam com assigned_to_id=None.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.db.session import SessionLocal
from app.models.card_task import CardTask
from app.models.card import Card
from app.models.user import User
from datetime import datetime

SERGIO_ID = 15

def main(dry_run: bool = False):
    db = SessionLocal()

    tasks = (
        db.query(CardTask)
        .filter(CardTask.assigned_to_id == SERGIO_ID)
        .all()
    )

    print(f"Tarefas com assigned_to_id={SERGIO_ID}: {len(tasks)}")

    contagem = {"reatribuídas": 0, "sem_sdr": 0}

    for task in tasks:
        card = db.query(Card).filter(Card.id == task.card_id).first()
        novo_sdr_id = card.sdr_id if card else None

        if novo_sdr_id and novo_sdr_id != SERGIO_ID:
            sdr = db.query(User).filter(User.id == novo_sdr_id).first()
            sdr_nome = sdr.name if sdr else f"id={novo_sdr_id}"
            if dry_run:
                print(f"  [DRY] task {task.id} (card {task.card_id}) -> {sdr_nome}")
            else:
                task.assigned_to_id = novo_sdr_id
            contagem["reatribuídas"] += 1
        else:
            if dry_run:
                print(f"  [DRY] task {task.id} (card {task.card_id}) -> sem SDR, mantém None")
            else:
                task.assigned_to_id = None
            contagem["sem_sdr"] += 1

    if not dry_run:
        db.commit()
        print("Commit realizado.")

    print()
    print("=== Resumo ===")
    print(f"  Reatribuídas ao SDR do card: {contagem['reatribuídas']}")
    print(f"  Sem SDR (assigned_to=None):  {contagem['sem_sdr']}")
    print(f"  Total processadas:           {len(tasks)}")

    db.close()

if __name__ == "__main__":
    dry = "--dry" in sys.argv
    if dry:
        print("=== MODO DRY RUN (sem alterações no banco) ===\n")
    main(dry_run=dry)
