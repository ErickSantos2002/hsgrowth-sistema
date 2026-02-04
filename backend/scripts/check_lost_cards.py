"""
Script de diagnóstico para verificar cards perdidos.

Execução:
    docker exec hsgrowth-api python scripts/check_lost_cards.py
"""
import sys
import os
from pathlib import Path

# Adiciona o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.card import Card
from app.models.list import List
from app.models.board import Board


def check_lost_cards():
    """Verifica todos os cards perdidos no sistema."""
    db: Session = SessionLocal()

    try:
        print("=" * 80)
        print("DIAGNÓSTICO: Cards Perdidos no Sistema")
        print("=" * 80)

        # Busca todos os boards
        boards = db.query(Board).all()

        print(f"\n📊 Total de Boards: {len(boards)}")
        print("-" * 80)

        for board in boards:
            print(f"\n🎯 Board {board.id}: {board.name}")
            print("-" * 80)

            # Busca listas do board
            lists = db.query(List).filter(List.board_id == board.id).all()
            print(f"   Listas: {len(lists)}")

            for lst in lists:
                # Conta cards perdidos na lista (is_won == -1)
                lost_count = db.query(Card).filter(
                    Card.list_id == lst.id,
                    Card.is_won == -1
                ).count()

                # Conta cards ganhos na lista (is_won == 1)
                won_count = db.query(Card).filter(
                    Card.list_id == lst.id,
                    Card.is_won == 1
                ).count()

                # Conta total de cards na lista
                total_count = db.query(Card).filter(
                    Card.list_id == lst.id
                ).count()

                if lost_count > 0 or won_count > 0 or total_count > 0:
                    print(f"      └─ Lista {lst.id}: {lst.name}")
                    print(f"         Total: {total_count} cards")
                    if won_count > 0:
                        print(f"         ✅ Ganhos: {won_count}")
                    if lost_count > 0:
                        print(f"         ❌ Perdidos: {lost_count}")

            # Total de cards perdidos no board
            list_ids = [lst.id for lst in lists]
            total_lost = db.query(Card).filter(
                Card.list_id.in_(list_ids),
                Card.is_won == -1
            ).count()

            total_won = db.query(Card).filter(
                Card.list_id.in_(list_ids),
                Card.is_won == 1
            ).count()

            print(f"\n   📈 Resumo do Board:")
            print(f"      Total de cards ganhos: {total_won}")
            print(f"      Total de cards perdidos: {total_lost}")

        # Resumo Geral
        print("\n" + "=" * 80)
        print("📊 RESUMO GERAL DO SISTEMA")
        print("=" * 80)

        total_cards = db.query(Card).count()
        total_lost_all = db.query(Card).filter(Card.is_won == -1).count()
        total_won_all = db.query(Card).filter(Card.is_won == 1).count()

        print(f"Total de cards no sistema: {total_cards}")
        print(f"Total de cards ganhos: {total_won_all}")
        print(f"Total de cards perdidos: {total_lost_all}")
        print(f"Cards em andamento: {total_cards - total_lost_all - total_won_all}")

        # Mostra detalhes dos cards perdidos
        if total_lost_all > 0:
            print("\n" + "=" * 80)
            print("📋 DETALHES DOS CARDS PERDIDOS")
            print("=" * 80)

            lost_cards = db.query(Card).filter(Card.is_won == -1).all()

            for card in lost_cards:
                lst = db.query(List).filter(List.id == card.list_id).first()
                board = db.query(Board).filter(Board.id == lst.board_id).first() if lst else None

                print(f"\nCard ID: {card.id}")
                print(f"   Título: {card.title[:60]}...")
                print(f"   Board: {board.name if board else 'N/A'} (ID: {board.id if board else 'N/A'})")
                print(f"   Lista: {lst.name if lst else 'N/A'} (ID: {card.list_id})")
                print(f"   is_lost: {card.is_lost}")
                print(f"   lost_at: {card.lost_at}")
                print(f"   is_won: {card.is_won}")

        print("\n" + "=" * 80)

    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    check_lost_cards()
