"""
Reatribui as tarefas (CardTask) do Aury (id=14) e Lucas (id=17) ao SDR atual
de cada card. Tarefas de cards sem SDR ficam com assigned_to_id=None.

Uso:
  python scripts/imports/reatribuir_tarefas_lucas_aury.py          # executa
  python scripts/imports/reatribuir_tarefas_lucas_aury.py --dry    # dry run
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.db.session import SessionLocal
from sqlalchemy import text

SDR_IDS_ORIGEM = [14, 17]  # Aury, Lucas


def main(dry_run: bool = False):
    db = SessionLocal()

    total = db.execute(text(
        "SELECT COUNT(*) FROM card_tasks WHERE assigned_to_id IN (14, 17)"
    )).scalar()
    print(f"Tarefas com assigned_to_id em {SDR_IDS_ORIGEM}: {total}")
    print()

    # Reatribui ao sdr_id atual do card (quando existe e não é Aury/Lucas)
    reatribuidas = db.execute(text("""
        SELECT COUNT(*)
        FROM card_tasks ct
        JOIN cards c ON c.id = ct.card_id
        WHERE ct.assigned_to_id IN (14, 17)
          AND c.sdr_id IS NOT NULL
          AND c.sdr_id NOT IN (14, 17)
    """)).scalar()

    sem_sdr = db.execute(text("""
        SELECT COUNT(*)
        FROM card_tasks ct
        LEFT JOIN cards c ON c.id = ct.card_id
        WHERE ct.assigned_to_id IN (14, 17)
          AND (c.sdr_id IS NULL OR c.sdr_id IN (14, 17))
    """)).scalar()

    print(f"  Serao reatribuidas ao SDR do card: {reatribuidas}")
    print(f"  Serao definidas como None:         {sem_sdr}")
    print()

    if not dry_run:
        # Atualiza tarefas cujo card tem novo SDR válido
        db.execute(text("""
            UPDATE card_tasks ct
            SET assigned_to_id = c.sdr_id
            FROM cards c
            WHERE ct.card_id = c.id
              AND ct.assigned_to_id IN (14, 17)
              AND c.sdr_id IS NOT NULL
              AND c.sdr_id NOT IN (14, 17)
        """))

        # Define None para tarefas cujo card não tem SDR válido
        db.execute(text("""
            UPDATE card_tasks ct
            SET assigned_to_id = NULL
            FROM cards c
            WHERE ct.card_id = c.id
              AND ct.assigned_to_id IN (14, 17)
              AND (c.sdr_id IS NULL OR c.sdr_id IN (14, 17))
        """))

        # Tarefas órfãs (card deletado ou não encontrado)
        db.execute(text("""
            UPDATE card_tasks
            SET assigned_to_id = NULL
            WHERE assigned_to_id IN (14, 17)
        """))

        db.commit()
        print("Commit realizado.")

    print()
    print("=== Resumo ===")
    print(f"  Reatribuidas ao SDR do card: {reatribuidas}")
    print(f"  Sem SDR (assigned_to=None):  {sem_sdr}")
    print(f"  Total processadas:           {total}")

    db.close()


if __name__ == "__main__":
    dry = "--dry" in sys.argv
    if dry:
        print("=== MODO DRY RUN (sem alteracoes no banco) ===\n")
    main(dry_run=dry)
