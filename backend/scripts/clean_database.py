#!/usr/bin/env python3
"""
Script para limpar completamente o banco de dados do HSGrowth CRM.
ATENÇÃO: Este script apaga TODOS os dados do banco de dados!
Use com extremo cuidado, preferencialmente apenas em desenvolvimento ou antes de importação inicial.
"""

import sys
import os
from pathlib import Path

# Adiciona o diretório raiz ao path para importar os módulos
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.db.session import engine


def clean_database():
    """
    Limpa todas as tabelas do banco de dados.
    Respeita a ordem de foreign keys para evitar erros.
    """

    print("=" * 80)
    print("ATENÇÃO: Este script irá DELETAR TODOS OS DADOS do banco de dados!")
    print("=" * 80)

    confirm = input("\nDigite 'CONFIRMAR' para continuar ou qualquer outra coisa para cancelar: ")

    if confirm != "CONFIRMAR":
        print("\n❌ Operação cancelada pelo usuário.")
        return

    print("\n🔄 Iniciando limpeza do banco de dados...\n")

    with engine.connect() as conn:
        # Desabilita temporariamente as foreign key constraints
        print("1️⃣  Desabilitando foreign key constraints...")
        conn.execute(text("SET session_replication_role = 'replica';"))
        conn.commit()

        # Lista de tabelas na ordem correta (das mais dependentes para as menos)
        tables = [
            # Gamificação
            "gamification_user_badges",
            "gamification_points",
            "gamification_rankings",
            "gamification_action_points",
            "gamification_badges",

            # Notificações
            "notifications",

            # Automações
            "automation_executions",
            "automation_conditions",
            "automation_actions",
            "automations",

            # Transferências
            "card_transfers",

            # Cards e relacionados
            "card_notes",
            "card_products",
            "card_tasks",
            "activities",
            "card_field_values",
            "cards",

            # Produtos
            "products",

            # Leads (antes de clients por causa de FK)
            "leads",

            # Pessoas (antes de clients por causa de FK)
            "persons",

            # Clientes
            "clients",

            # Boards e Listas
            "custom_field_definitions",
            "lists",
            "boards",

            # Usuários e Auth
            "refresh_tokens",
            "users",
            "roles",
        ]

        print("2️⃣  Limpando tabelas...")
        for table in tables:
            try:
                print(f"   - Limpando tabela: {table}")
                conn.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
                conn.commit()
            except Exception as e:
                print(f"   ⚠️  Aviso ao limpar {table}: {str(e)}")
                # Faz rollback para permitir continuar
                conn.rollback()
                # Continua mesmo com erro (tabela pode não existir)

        # Reabilita foreign key constraints
        print("3️⃣  Reabilitando foreign key constraints...")
        conn.execute(text("SET session_replication_role = 'origin';"))
        conn.commit()

        # Reseta as sequences (auto-increment)
        print("4️⃣  Resetando sequences (IDs)...")
        sequences_query = text("""
            SELECT sequence_name
            FROM information_schema.sequences
            WHERE sequence_schema = 'public'
        """)

        result = conn.execute(sequences_query)
        sequences = [row[0] for row in result]

        for seq in sequences:
            try:
                print(f"   - Resetando sequence: {seq}")
                conn.execute(text(f"ALTER SEQUENCE {seq} RESTART WITH 1;"))
                conn.commit()
            except Exception as e:
                print(f"   ⚠️  Aviso ao resetar {seq}: {str(e)}")

        print("\n" + "=" * 80)
        print("✅ Banco de dados limpo com sucesso!")
        print("=" * 80)
        print("\n📊 Próximos passos:")
        print("1. Execute as migrations: alembic upgrade head")
        print("2. Crie os dados iniciais (roles, admin, etc.)")
        print("3. Execute o script de importação do Pipedrive (se aplicável)")
        print()


if __name__ == "__main__":
    try:
        clean_database()
    except KeyboardInterrupt:
        print("\n\n❌ Operação cancelada pelo usuário (Ctrl+C)")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Erro ao limpar banco de dados: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
