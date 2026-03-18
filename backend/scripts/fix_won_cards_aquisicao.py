"""
Script de correção: move cards ganhos do board Aquisição para a lista correta.

Situação: cards com is_won=1 (ganho) no board Aquisição (board_id=7)
estão em listas de pipeline em vez da lista 'Negócio Ganho' (list_id=32).

Execução:
    # Dry-run (só mostra o que seria feito, sem alterar nada):
    python scripts/fix_won_cards_aquisicao.py

    # Execução real:
    python scripts/fix_won_cards_aquisicao.py --apply
"""
import sys
import os

# Garante que o app está no path quando rodado de dentro do container
sys.path.insert(0, "/app")

from datetime import datetime
from app.db.session import SessionLocal
from app.models.card import Card
from app.models.list import List
from app.models.card_list_history import CardListHistory

# ─── Configuração ────────────────────────────────────────────────────────────
BOARD_ID = 7           # Aquisição
TARGET_LIST_ID = 32    # Negócio Ganho (is_done_stage=True)
DRY_RUN = "--apply" not in sys.argv
# ─────────────────────────────────────────────────────────────────────────────


def run():
    db = SessionLocal()

    try:
        # Busca cards ganhos no board 7 fora da lista 32
        cards = (
            db.query(Card)
            .join(List, Card.list_id == List.id)
            .filter(
                List.board_id == BOARD_ID,
                Card.is_won == 1,
                Card.list_id != TARGET_LIST_ID,
                Card.is_deleted == False,
            )
            .order_by(Card.id)
            .all()
        )

        mode = "DRY-RUN" if DRY_RUN else "APLICANDO"
        print(f"\n{'=' * 60}")
        print(f"  Correção: cards ganhos fora da lista Negócio Ganho")
        print(f"  Board: Aquisição (id={BOARD_ID})")
        print(f"  Lista destino: Negócio Ganho (id={TARGET_LIST_ID})")
        print(f"  Modo: {mode}")
        print(f"  Cards encontrados: {len(cards)}")
        print(f"{'=' * 60}\n")

        if not cards:
            print("Nenhum card para corrigir. Tudo certo!")
            return

        # Agrupa por lista de origem para facilitar leitura do relatório
        from collections import defaultdict
        by_list: dict = defaultdict(list)
        for card in cards:
            by_list[card.list_id].append(card)

        # Mostra resumo por lista
        list_names = {
            l.id: l.name
            for l in db.query(List).filter(List.board_id == BOARD_ID).all()
        }
        print("Distribuição atual dos cards afetados:")
        for list_id, list_cards in sorted(by_list.items()):
            print(f"  Lista {list_id} ({list_names.get(list_id, '?')}): {len(list_cards)} cards")
        print()

        if DRY_RUN:
            print("Primeiros 20 cards que seriam movidos:")
            for card in cards[:20]:
                from_name = list_names.get(card.list_id, f"id={card.list_id}")
                print(f"  #{card.id} | {card.title[:55]!r} | {from_name} → Negócio Ganho")
            if len(cards) > 20:
                print(f"  ... e mais {len(cards) - 20} cards")
            print(f"\nPara aplicar, rode: python scripts/fix_won_cards_aquisicao.py --apply\n")
            return

        # ─── Aplicação ───────────────────────────────────────────────────────
        now = datetime.utcnow()
        moved = 0
        errors = 0

        for card in cards:
            try:
                from_list_id = card.list_id
                from_name = list_names.get(from_list_id, f"id={from_list_id}")

                # Fecha o registro aberto no CardListHistory
                open_entry = (
                    db.query(CardListHistory)
                    .filter(
                        CardListHistory.card_id == card.id,
                        CardListHistory.exited_at == None,  # noqa: E711
                    )
                    .first()
                )
                if open_entry:
                    open_entry.exited_at = now

                # Cria novo registro de entrada na lista destino
                db.add(CardListHistory(
                    card_id=card.id,
                    list_id=TARGET_LIST_ID,
                    board_id=BOARD_ID,
                    entered_at=now,
                ))

                # Move o card
                card.list_id = TARGET_LIST_ID

                db.commit()
                moved += 1
                print(f"  [OK] #{card.id} | {card.title[:50]!r} | {from_name} → Negócio Ganho")

            except Exception as e:
                db.rollback()
                errors += 1
                print(f"  [ERRO] #{card.id} | {card.title[:50]!r} | {e}")

        print(f"\n{'=' * 60}")
        print(f"  Concluído: {moved} cards movidos, {errors} erros")
        print(f"{'=' * 60}\n")

    finally:
        db.close()


if __name__ == "__main__":
    run()
