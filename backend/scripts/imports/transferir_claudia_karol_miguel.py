"""
Desligamento de Claudia (id=8) e Karolaine (id=9) — transfere a carteira ATIVA
delas para o Miguel (id=16) e desativa as duas contas.

O que faz (só o que está ATIVO — preserva histórico):
  1. Cards ABERTOS (is_won=0, não deletados):
       - onde sdr_id IN (8,9)          -> sdr_id = 16
       - onde assigned_to_id IN (8,9)  -> assigned_to_id = 16
     (preserva o campo: quem era SDR vira SDR do Miguel; Vendedor vira Vendedor)
  2. Tarefas PENDENTES (card_tasks, não concluídas e não canceladas):
       - assigned_to_id IN (8,9)       -> assigned_to_id = 16
  3. Desativa as usuárias: is_active = False em 8 e 9.

NÃO toca em cards perdidos/ganhos nem em tarefas concluídas (histórico intacto).
Não gera registros de transferência/notificação (update direto, como no
precedente do desligamento Aury/Lucas).

Uso:
  python scripts/imports/transferir_claudia_karol_miguel.py --dry   # pré-visualização
  python scripts/imports/transferir_claudia_karol_miguel.py         # executa
"""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.db.session import SessionLocal
from app.models.card import Card
from app.models.user import User
from sqlalchemy import text

ORIGEM = [8, 9]      # Claudia, Karolaine
DEST = 16            # Miguel
NOMES = {8: "Claudia", 9: "Karolaine", 16: "Miguel"}


def main(dry_run: bool = False):
    db = SessionLocal()

    # 1) Cards abertos por campo
    cards_sdr = (
        db.query(Card)
        .filter(Card.sdr_id.in_(ORIGEM), Card.is_won == 0, Card.is_deleted == False)
        .all()
    )
    cards_assigned = (
        db.query(Card)
        .filter(Card.assigned_to_id.in_(ORIGEM), Card.is_won == 0, Card.is_deleted == False)
        .all()
    )
    ids_afetados = {c.id for c in cards_sdr} | {c.id for c in cards_assigned}

    print(f"Cards ABERTOS a transferir -> Miguel:")
    print(f"  via sdr_id (8/9 -> 16)        : {len(cards_sdr)}")
    print(f"  via assigned_to_id (8/9 -> 16): {len(cards_assigned)}")
    print(f"  cards distintos afetados       : {len(ids_afetados)}")

    # 2) Tarefas pendentes
    n_tarefas = db.execute(text(
        "SELECT COUNT(*) FROM card_tasks "
        "WHERE assigned_to_id IN (8,9) AND is_completed = false AND is_cancelled = false"
    )).scalar()
    print(f"Tarefas PENDENTES a reatribuir -> Miguel: {n_tarefas}")

    # 3) Usuárias a desativar
    print(f"Usuárias a desativar: {[NOMES[i] for i in ORIGEM]}")

    if dry_run:
        print("\n=== DRY RUN — nada foi alterado ===")
        db.close()
        return

    # --- Executa ---
    now = datetime.now()
    for c in cards_sdr:
        c.sdr_id = DEST
        c.updated_at = now
    for c in cards_assigned:
        c.assigned_to_id = DEST
        c.updated_at = now

    db.execute(text(
        "UPDATE card_tasks SET assigned_to_id = :dest, updated_at = NOW() "
        "WHERE assigned_to_id IN (8,9) AND is_completed = false AND is_cancelled = false"
    ), {"dest": DEST})

    for uid in ORIGEM:
        u = db.query(User).filter(User.id == uid).first()
        if u:
            u.is_active = False

    db.commit()
    print("\n=== COMMIT realizado ===")
    print(f"  cards distintos transferidos: {len(ids_afetados)}")
    print(f"  tarefas reatribuídas        : {n_tarefas}")
    print(f"  usuárias desativadas        : {[NOMES[i] for i in ORIGEM]}")
    db.close()


if __name__ == "__main__":
    dry = "--dry" in sys.argv
    if dry:
        print("=== MODO DRY RUN ===\n")
    main(dry_run=dry)
