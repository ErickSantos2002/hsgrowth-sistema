"""
Script para mover cards perdidos do Board 2 para Lista 1 do Board 1.

Execução:
    docker exec -it hsgrowth-api python scripts/move_lost_cards.py
"""
import sys
import os
from pathlib import Path

# Adiciona o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.card import Card
from app.models.list import List
from app.models.board import Board


def move_lost_cards_from_board2_to_board1():
    """Move todos os cards perdidos do Board 2 para a Lista 1 do Board 1."""
    db: Session = SessionLocal()

    try:
        # Configurações
        SOURCE_BOARD_ID = 2
        TARGET_LIST_ID = 1
        TARGET_BOARD_ID = 1

        print("=" * 60)
        print("SCRIPT: Mover Cards Perdidos")
        print("=" * 60)

        # Verifica se a lista de destino existe
        target_list = db.query(List).filter(List.id == TARGET_LIST_ID).first()
        if not target_list:
            print(f"❌ ERRO: Lista {TARGET_LIST_ID} não encontrada!")
            return

        print(f"✓ Lista de destino: {target_list.name} (ID: {TARGET_LIST_ID})")

        # Verifica se a lista pertence ao board correto
        if target_list.board_id != TARGET_BOARD_ID:
            print(f"❌ ERRO: Lista {TARGET_LIST_ID} não pertence ao Board {TARGET_BOARD_ID}!")
            print(f"   Lista pertence ao Board {target_list.board_id}")
            return

        # Busca o Board 2 para pegar suas listas
        source_board = db.query(Board).filter(Board.id == SOURCE_BOARD_ID).first()
        if not source_board:
            print(f"❌ ERRO: Board {SOURCE_BOARD_ID} não encontrado!")
            return

        print(f"✓ Board de origem: {source_board.name} (ID: {SOURCE_BOARD_ID})")

        # Busca as listas do Board 2
        source_lists = db.query(List).filter(List.board_id == SOURCE_BOARD_ID).all()
        source_list_ids = [lst.id for lst in source_lists]

        if not source_list_ids:
            print(f"❌ ERRO: Board {SOURCE_BOARD_ID} não tem listas!")
            return

        print(f"✓ Board {SOURCE_BOARD_ID} tem {len(source_list_ids)} listas")

        # Busca todos os cards perdidos do Board 2
        # is_won: 0=aberto, 1=ganho, -1=perdido
        lost_cards = db.query(Card).filter(
            Card.list_id.in_(source_list_ids),
            Card.is_won == -1
        ).all()

        total_cards = len(lost_cards)

        if total_cards == 0:
            print(f"\n✓ Nenhum card perdido encontrado no Board {SOURCE_BOARD_ID}")
            print("   Nada a fazer!")
            return

        print(f"\n📊 Encontrados {total_cards} cards perdidos no Board {SOURCE_BOARD_ID}")
        print("-" * 60)

        # Confirma antes de executar
        print("\n⚠️  ATENÇÃO: Esta operação irá mover TODOS os cards perdidos!")
        print(f"   De: Board {SOURCE_BOARD_ID} (qualquer lista)")
        print(f"   Para: Lista {TARGET_LIST_ID} '{target_list.name}' do Board {TARGET_BOARD_ID}")
        print()
        confirm = input("Deseja continuar? (sim/não): ").strip().lower()

        if confirm not in ['sim', 's', 'yes', 'y']:
            print("\n❌ Operação cancelada pelo usuário.")
            return

        print("\n🔄 Movendo cards...")
        print("-" * 60)

        moved_count = 0

        for card in lost_cards:
            try:
                old_list_id = card.list_id

                # Move o card para a lista de destino
                card.list_id = TARGET_LIST_ID

                db.commit()

                moved_count += 1
                print(f"✓ Card {card.id} '{card.title[:50]}...' movido (lista {old_list_id} → {TARGET_LIST_ID})")

            except Exception as e:
                print(f"❌ Erro ao mover card {card.id}: {e}")
                db.rollback()

        print("-" * 60)
        print(f"\n✅ Operação concluída!")
        print(f"   Total de cards movidos: {moved_count}/{total_cards}")

        if moved_count < total_cards:
            print(f"   ⚠️  {total_cards - moved_count} cards não foram movidos (verifique os erros acima)")

    except Exception as e:
        print(f"\n❌ ERRO GERAL: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()

    finally:
        db.close()
        print("\n" + "=" * 60)


if __name__ == "__main__":
    move_lost_cards_from_board2_to_board1()
