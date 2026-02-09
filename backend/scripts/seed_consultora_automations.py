"""
Script para criar as automações da consultora de vendas.

Automações criadas:
1. Alterar relationship_type para "Prospect" quando negócio entra em "Reunião Agendada"
2. Alterar relationship_type para "Cliente" quando negócio é marcado como ganho

Uso:
    python scripts/seed_consultora_automations.py
"""
import sys
import os

# Adiciona o diretório raiz ao path para importar os módulos
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.automation import Automation
from app.models.board import Board
from app.models.list import List


def seed_consultora_automations():
    """
    Cria as automações da consultora no banco de dados.
    """
    db: Session = SessionLocal()

    try:
        print("=" * 80)
        print("CRIANDO AUTOMAÇÕES DA CONSULTORA")
        print("=" * 80)

        # Busca todos os boards não deletados
        boards = db.query(Board).filter(Board.is_deleted == False).all()

        if not boards:
            print("❌ Nenhum board encontrado. Crie um board antes de executar este script.")
            return

        total_automations_created = 0

        # ========== AUTOMAÇÃO 2: Prospect quando entra em Reunião Agendada ==========
        print("\n" + "─" * 80)
        print("AUTOMAÇÃO 2: Alterar para Prospect - Reunião Agendada")
        print("─" * 80)

        for board in boards:
            # Busca a lista "Reunião Agendada" neste board
            reuniao_agendada_list = db.query(List).filter(
                List.board_id == board.id,
                List.name.ilike("%reunião agendada%")
            ).first()

            if not reuniao_agendada_list:
                continue

            print(f"\n📋 Board: '{board.name}' (ID: {board.id})")
            print(f"   📌 Lista 'Reunião Agendada' encontrada (ID: {reuniao_agendada_list.id})")

            # Verifica se já existe automação similar
            existing = db.query(Automation).filter(
                Automation.board_id == board.id,
                Automation.trigger_event == "card_moved",
                Automation.name.ilike("%prospect%reunião%")
            ).first()

            if existing:
                print(f"   ⚠️  Automação já existe (ID: {existing.id}), pulando...")
                continue

            automation_2 = Automation(
                board_id=board.id,
                name="Alterar para Prospect - Reunião Agendada",
                description="Quando um negócio entra na etapa 'Reunião Agendada', altera o tipo de relacionamento da empresa para 'Prospect' (se ainda for Lead ou vazio)",
                automation_type="trigger",
                is_active=True,
                priority=50,
                trigger_event="card_moved",
                trigger_conditions={
                    "to_list_id": reuniao_agendada_list.id
                },
                actions=[
                    {
                        "type": "update_client_field",
                        "params": {
                            "field_name": "relationship_type",
                            "value": "Prospect"
                        }
                    }
                ],
                state={}
            )

            db.add(automation_2)
            db.commit()
            db.refresh(automation_2)
            total_automations_created += 1

            print(f"   ✅ Automação criada! (ID: {automation_2.id})")

        # ========== AUTOMAÇÃO 3: Cliente quando negócio é ganho ==========
        print("\n" + "─" * 80)
        print("AUTOMAÇÃO 3: Alterar para Cliente - Negócio Ganho")
        print("─" * 80)

        for board in boards:
            print(f"\n📋 Board: '{board.name}' (ID: {board.id})")

            # Verifica se já existe automação similar
            existing = db.query(Automation).filter(
                Automation.board_id == board.id,
                Automation.trigger_event == "card_won",
                Automation.name.ilike("%cliente%ganho%")
            ).first()

            if existing:
                print(f"   ⚠️  Automação já existe (ID: {existing.id}), pulando...")
                continue

            automation_3 = Automation(
                board_id=board.id,
                name="Alterar para Cliente - Negócio Ganho",
                description="Quando um negócio é marcado como ganho, altera o tipo de relacionamento da empresa para 'Cliente'",
                automation_type="trigger",
                is_active=True,
                priority=50,
                trigger_event="card_won",
                trigger_conditions=None,  # Sem condições, sempre executa
                actions=[
                    {
                        "type": "update_client_field",
                        "params": {
                            "field_name": "relationship_type",
                            "value": "Cliente"
                        }
                    }
                ],
                state={}
            )

            db.add(automation_3)
            db.commit()
            db.refresh(automation_3)
            total_automations_created += 1

            print(f"   ✅ Automação criada! (ID: {automation_3.id})")

        print("\n" + "=" * 80)
        print(f"✅ PROCESSO CONCLUÍDO! {total_automations_created} automações criadas.")
        print("=" * 80)

        # Mostra resumo geral
        print("\n📊 RESUMO GERAL DE AUTOMAÇÕES:")
        for board in boards:
            automations = db.query(Automation).filter(
                Automation.board_id == board.id,
                Automation.is_active == True
            ).all()

            if automations:
                print(f"\n  📋 Board '{board.name}' ({len(automations)} automações):")
                for auto in automations:
                    print(f"     - [{auto.id}] {auto.name} ({auto.trigger_event})")

    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()

    finally:
        db.close()


if __name__ == "__main__":
    seed_consultora_automations()
