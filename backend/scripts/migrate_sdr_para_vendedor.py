"""
Migração pontual: Miguel (16) e Karolaine (9) passam de SDR para Vendedor.

Preenche assigned_to_id = sdr_id nos cards EM ABERTO em que eles são SDR e
o card ainda não tem vendedor. Necessário porque a gamificação só pontua
quem está no campo "vendedor" (assigned_to_id) quando o card é ganho.

NÃO toca em:
  - cards perdidos/ganhos (histórico de prospecção fica intacto);
  - cards que já têm outro vendedor;
  - o campo sdr_id (o crédito de prospecção é preservado em todos os casos).

Execução (dentro do container):
    # Dry-run (só mostra o que seria feito, sem alterar nada):
    docker exec hsgrowth-api-local python scripts/migrate_sdr_para_vendedor.py

    # Execução real:
    docker exec hsgrowth-api-local python scripts/migrate_sdr_para_vendedor.py --apply

O modo --apply grava backup_migrate_sdr_para_vendedor.json com os IDs alterados,
para permitir reversão.
"""
import sys
import json

sys.path.insert(0, "/app")

from app.db.session import SessionLocal
from app.models.card import Card
from app.models.user import User

# ─── Configuração ────────────────────────────────────────────────────────────
USER_IDS = [16, 9]     # Miguel Luiz, Karolaine Martins
BACKUP_FILE = "/app/backup_migrate_sdr_para_vendedor.json"
DRY_RUN = "--apply" not in sys.argv
# ─────────────────────────────────────────────────────────────────────────────


def run():
    db = SessionLocal()

    try:
        cards = (
            db.query(Card)
            .filter(
                Card.sdr_id.in_(USER_IDS),
                Card.assigned_to_id.is_(None),
                Card.is_won == 0,
                Card.deleted_at.is_(None),
            )
            .order_by(Card.sdr_id, Card.id)
            .all()
        )

        mode = "DRY-RUN" if DRY_RUN else "APLICANDO"
        print(f"\n{'=' * 70}")
        print(f"  Migração SDR -> Vendedor (assigned_to_id = sdr_id)")
        print(f"  Usuários: {USER_IDS}")
        print(f"  Escopo: cards EM ABERTO, sem vendedor, não deletados")
        print(f"  Modo: {mode}")
        print(f"  Cards encontrados: {len(cards)}")
        print(f"{'=' * 70}\n")

        if not cards:
            print("Nada a fazer.")
            return

        por_usuario = {}
        for card in cards:
            por_usuario[card.sdr_id] = por_usuario.get(card.sdr_id, 0) + 1

        for uid, qtd in sorted(por_usuario.items()):
            user = db.query(User).filter(User.id == uid).first()
            print(f"  {user.name if user else uid} (id={uid}): {qtd} cards")

        print("\n  Amostra (10 primeiros):")
        for card in cards[:10]:
            print(f"    card_id={card.id} | sdr_id={card.sdr_id} | '{card.title[:45]}'")

        if DRY_RUN:
            print(f"\n[DRY-RUN] Nada foi alterado. Rode com --apply para aplicar.\n")
            return

        backup = [{"card_id": c.id, "sdr_id": c.sdr_id} for c in cards]
        with open(BACKUP_FILE, "w", encoding="utf-8") as f:
            json.dump(backup, f, ensure_ascii=False, indent=2)
        print(f"\n  Backup gravado em {BACKUP_FILE} ({len(backup)} registros)")

        for card in cards:
            card.assigned_to_id = card.sdr_id

        db.commit()
        print(f"\n[OK] {len(cards)} cards atualizados (sdr_id preservado).\n")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
