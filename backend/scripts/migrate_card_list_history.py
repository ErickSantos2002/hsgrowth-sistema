"""
Script de migração de dados históricos para a tabela card_list_history.

Reconstrói o histórico de movimentação de cards entre listas a partir dos
registros existentes na tabela activities (activity_type IN card_moved,
card_won, card_lost).

ATENÇÃO: Execute este script UMA ÚNICA VEZ após rodar a migration Alembic.
Se executar duas vezes, irá criar registros duplicados.

Uso:
    docker-compose exec api python scripts/migrate_card_list_history.py

    ou localmente:
    python scripts/migrate_card_list_history.py
"""
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Adiciona o diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.card import Card
from app.models.list import List
from app.models.board import Board
from app.models.activity import Activity
from app.models.card_list_history import CardListHistory


def build_list_name_index(db: Session) -> dict:
    """
    Constrói um índice de nome de lista para seus IDs e board_id.

    Retorna um dict onde:
    - chave: nome da lista (lowercase, sem espaços extras)
    - valor: lista de (list_id, board_id) — pode haver nomes duplicados

    Exemplo:
        {"diagnóstico e proposta": [(12, 7)], "qualificação": [(5, 6), (14, 8)]}
    """
    all_lists = db.query(List).filter(List.id > 0).all()
    index = defaultdict(list)
    for lst in all_lists:
        key = lst.name.strip().lower()
        index[key].append((lst.id, lst.board_id))
    return dict(index)


def resolve_list_id(name: str, name_index: dict, board_id_hint: int = None) -> tuple:
    """
    Resolve o ID de uma lista pelo nome.

    Usa board_id_hint para desempatar quando há listas com o mesmo nome
    em boards diferentes.

    Retorna (list_id, board_id) ou (None, None) se não encontrar.
    """
    if not name:
        return None, None

    key = name.strip().lower()
    matches = name_index.get(key, [])

    if not matches:
        return None, None

    if len(matches) == 1:
        return matches[0]

    # Múltiplos matches: tenta usar o board_id_hint para desempatar
    if board_id_hint:
        for list_id, board_id in matches:
            if board_id == board_id_hint:
                return list_id, board_id

    # Não conseguiu desempatar, retorna o primeiro
    return matches[0]


def migrate(db: Session) -> None:
    """
    Executa a migração dos dados históricos.

    Estratégia para cada card:
    1. Busca todas as activities de movimentação ordenadas por created_at
    2. Reconstrói a linha do tempo de entradas/saídas por lista
    3. A primeira entrada usa card.created_at como entered_at
    4. O registro final (lista atual) fica com exited_at = NULL
    """
    print("Iniciando migração de dados históricos para card_list_history...")
    print()

    # Verifica se já existem dados (evita duplicação acidental)
    existing_count = db.query(CardListHistory).count()
    if existing_count > 0:
        print(f"ATENÇÃO: A tabela card_list_history já possui {existing_count} registros.")
        confirm = input("Deseja continuar e possivelmente criar duplicatas? (s/N): ")
        if confirm.strip().lower() != "s":
            print("Migração cancelada.")
            return

    # Constrói índice de nomes de listas para IDs
    name_index = build_list_name_index(db)
    print(f"Índice de listas construído: {len(name_index)} nomes únicos encontrados.")

    # Busca todos os cards (incluindo soft-deleted para manter histórico completo)
    all_cards = db.query(Card).all()
    total_cards = len(all_cards)
    print(f"Total de cards a processar: {total_cards}")
    print()

    stats = {
        "cards_processados": 0,
        "registros_criados": 0,
        "cards_sem_lista": 0,
        "listas_nao_encontradas": 0,
    }

    for idx, card in enumerate(all_cards, 1):
        if idx % 500 == 0:
            print(f"  Processando card {idx}/{total_cards}...")

        # Busca a lista atual do card para obter o board_id
        current_list = db.query(List).filter(List.id == card.list_id).first()
        if not current_list:
            stats["cards_sem_lista"] += 1
            continue

        current_board_id = current_list.board_id

        # Busca todas as activities de movimentação do card, ordenadas por data
        movements = (
            db.query(Activity)
            .filter(
                Activity.card_id == card.id,
                Activity.activity_type.in_(["card_moved", "card_won", "card_lost"]),
            )
            .order_by(Activity.created_at.asc())
            .all()
        )

        # Constrói a linha do tempo de entradas na lista
        # Formato: [(list_id, board_id, entered_at, exited_at)]
        timeline = []

        if movements:
            # O ponto de partida é a lista original (from_list do primeiro movimento)
            first_movement = movements[0]
            first_meta = first_movement.activity_metadata or {}
            from_list_name = first_meta.get("from_list", "")
            from_list_id_meta = first_meta.get("from_list_id")
            from_board_id_meta = first_meta.get("from_board_id")

            if from_list_id_meta:
                # Activity já tem o ID (registros novos após o deploy desta feature)
                initial_list_id = from_list_id_meta
                initial_board_id = from_board_id_meta or current_board_id
            else:
                # Activity antiga: tenta resolver pelo nome
                initial_list_id, initial_board_id = resolve_list_id(
                    from_list_name, name_index, current_board_id
                )

            if initial_list_id:
                # Primeira entrada: card criado na lista original
                timeline.append({
                    "list_id": initial_list_id,
                    "board_id": initial_board_id or current_board_id,
                    "entered_at": card.created_at,
                    "exited_at": first_movement.created_at,
                })
            else:
                if from_list_name:
                    stats["listas_nao_encontradas"] += 1

            # Processa cada movimento para reconstruir a linha do tempo
            for i, movement in enumerate(movements):
                meta = movement.activity_metadata or {}
                to_list_name = meta.get("to_list", "")
                to_list_id_meta = meta.get("to_list_id")
                to_board_id_meta = meta.get("to_board_id")

                if to_list_id_meta:
                    # Activity já tem o ID
                    to_list_id = to_list_id_meta
                    to_board_id = to_board_id_meta or current_board_id
                else:
                    # Activity antiga: tenta resolver pelo nome
                    to_list_id, to_board_id = resolve_list_id(
                        to_list_name, name_index, current_board_id
                    )

                if not to_list_id:
                    if to_list_name:
                        stats["listas_nao_encontradas"] += 1
                    continue

                # Data de saída: início do próximo movimento (ou NULL se for o último)
                next_movement = movements[i + 1] if i + 1 < len(movements) else None
                exited_at = next_movement.created_at if next_movement else None

                timeline.append({
                    "list_id": to_list_id,
                    "board_id": to_board_id or current_board_id,
                    "entered_at": movement.created_at,
                    "exited_at": exited_at,
                })
        else:
            # Card nunca foi movido: ficou sempre na lista atual desde a criação
            timeline.append({
                "list_id": current_list.id,
                "board_id": current_board_id,
                "entered_at": card.created_at,
                "exited_at": None,
            })

        # Cria os registros na tabela card_list_history
        for entry in timeline:
            record = CardListHistory(
                card_id=card.id,
                list_id=entry["list_id"],
                board_id=entry["board_id"],
                entered_at=entry["entered_at"],
                exited_at=entry["exited_at"],
            )
            db.add(record)
            stats["registros_criados"] += 1

        stats["cards_processados"] += 1

    print()
    print("Salvando registros no banco de dados...")
    db.commit()

    print()
    print("=" * 50)
    print("MIGRAÇÃO CONCLUÍDA")
    print("=" * 50)
    print(f"Cards processados:          {stats['cards_processados']}")
    print(f"Registros criados:          {stats['registros_criados']}")
    print(f"Cards sem lista válida:     {stats['cards_sem_lista']}")
    print(f"Listas não encontradas:     {stats['listas_nao_encontradas']}")
    print()
    if stats["listas_nao_encontradas"] > 0:
        print(
            "AVISO: Algumas listas não foram encontradas pelo nome (podem ter sido "
            "renomeadas ou deletadas). Esses movimentos históricos não foram migrados."
        )


if __name__ == "__main__":
    db: Session = SessionLocal()
    try:
        migrate(db)
    except KeyboardInterrupt:
        print("\nMigração interrompida pelo usuário.")
        db.rollback()
    except Exception as e:
        print(f"\nERRO durante a migração: {e}")
        db.rollback()
        raise
    finally:
        db.close()
