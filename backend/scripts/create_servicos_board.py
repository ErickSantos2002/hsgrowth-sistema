"""
Script para criar o board de Serviços na tabela service_boards.
Tabela completamente separada dos boards de vendas.

Execute uma vez após o deploy da migration 2026_06_08_1100.

Uso:
    python -m scripts.create_servicos_board
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList


LISTS = [
    {"name": "Negócio Fechado",                 "color": "#F59E0B", "position": 0, "is_done_stage": False, "is_lost_stage": False},
    {"name": "Dados de Laboratório",             "color": "#3B82F6", "position": 1, "is_done_stage": False, "is_lost_stage": False},
    {"name": "Dados de Laboratório Preenchidos", "color": "#06B6D4", "position": 2, "is_done_stage": False, "is_lost_stage": False},
    {"name": "Oportunidade Existente",           "color": "#8B5CF6", "position": 3, "is_done_stage": False, "is_lost_stage": False},
    {"name": "Tentativa de Contato",             "color": "#F59E0B", "position": 4, "is_done_stage": False, "is_lost_stage": False},
    {"name": "Proposta",                         "color": "#10B981", "position": 5, "is_done_stage": False, "is_lost_stage": False},
    {"name": "Operações",                        "color": "#3B82F6", "position": 6, "is_done_stage": False, "is_lost_stage": False},
    {"name": "Aguardando Pedido",                "color": "#F59E0B", "position": 7, "is_done_stage": False, "is_lost_stage": False},
    {"name": "Negócio Ganho",                    "color": "#059669", "position": 8, "is_done_stage": True,  "is_lost_stage": False},
]


def main():
    db = SessionLocal()
    try:
        existing = db.query(ServiceBoard).filter(ServiceBoard.name == "Serviços").first()

        if existing:
            print(f"Board 'Serviços' já existe na tabela service_boards (ID={existing.id}). Abortando.")
            return

        board = ServiceBoard(
            name="Serviços",
            description="Funil de serviços - calibração, manutenção e recalibração de equipamentos",
            color="#10B981",
            icon="wrench",
        )
        db.add(board)
        db.flush()

        for lst in LISTS:
            db.add(ServiceList(
                board_id=board.id,
                name=lst["name"],
                color=lst["color"],
                position=lst["position"],
                is_done_stage=lst["is_done_stage"],
                is_lost_stage=lst["is_lost_stage"],
            ))

        db.commit()
        print(f"Board 'Serviços' criado na tabela service_boards! ID={board.id}")
        print(f"Listas criadas: {len(LISTS)}")
        for lst in LISTS:
            print(f"  [{lst['position']}] {lst['name']}")

    except Exception as e:
        db.rollback()
        print(f"Erro: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
