#!/usr/bin/env python3
"""
Script para limpar apenas os CARDS e tabelas relacionadas do HSGrowth CRM.
ATENÇÃO: Este script apaga todos os cards e seus dados relacionados!

O que será DELETADO:
- Todos os cards (negócios)
- Todas as notas dos cards
- Todos os produtos vinculados aos cards
- Todas as tarefas/atividades dos cards
- Todo o histórico de atividades dos cards
- Todos os valores de campos customizados dos cards
- Todas as transferências de cards
- Todas as execuções de automações relacionadas a cards

O que será MANTIDO:
- Usuários e roles
- Boards e listas
- Clientes (organizações e pessoas)
- Produtos do catálogo
- Definições de campos customizados
- Configurações de automações
- Configurações de gamificação
- Notificações
"""

import sys
import os
from pathlib import Path

# Adiciona o diretório raiz ao path para importar os módulos
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.db.session import engine


def clean_cards():
    """
    Limpa todas as tabelas relacionadas a cards do banco de dados.
    Respeita a ordem de foreign keys para evitar erros.
    """

    print("=" * 80)
    print("ATENÇÃO: Este script irá DELETAR TODOS OS CARDS e dados relacionados!")
    print("=" * 80)
    print("\n📋 O que será deletado:")
    print("   - Todos os cards (negócios)")
    print("   - Notas dos cards")
    print("   - Produtos vinculados aos cards")
    print("   - Tarefas/Atividades dos cards")
    print("   - Histórico de atividades")
    print("   - Valores de campos customizados")
    print("   - Transferências de cards")
    print("   - Execuções de automações")
    print("\n✅ O que será mantido:")
    print("   - Usuários e roles")
    print("   - Boards e listas")
    print("   - Clientes (organizações e pessoas)")
    print("   - Produtos do catálogo")
    print("   - Definições de campos customizados")
    print("   - Configurações de automações")
    print("   - Configurações de gamificação")
    print("=" * 80)

    confirm = input("\nDigite 'CONFIRMAR' para continuar ou qualquer outra coisa para cancelar: ")

    if confirm != "CONFIRMAR":
        print("\n❌ Operação cancelada pelo usuário.")
        return

    print("\n🔄 Iniciando limpeza dos cards...\n")

    with engine.connect() as conn:
        # Desabilita temporariamente as foreign key constraints
        print("1️⃣  Desabilitando foreign key constraints...")
        conn.execute(text("SET session_replication_role = 'replica';"))
        conn.commit()

        # Lista de tabelas relacionadas a cards (das mais dependentes para as menos)
        tables = [
            # Execuções de automações (podem referenciar cards)
            "automation_executions",

            # Transferências de cards
            "card_transfers",

            # Notas dos cards
            "card_notes",

            # Produtos vinculados aos cards
            "card_products",

            # Tarefas/Atividades dos cards
            "card_tasks",

            # Histórico de atividades
            "activities",

            # Valores de campos customizados dos cards
            "card_field_values",

            # Cards (tabela principal)
            "cards",
        ]

        print("2️⃣  Limpando tabelas relacionadas a cards...")
        deleted_counts = {}

        for table in tables:
            try:
                # Primeiro conta quantos registros serão deletados
                count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table};"))
                count = count_result.scalar()
                deleted_counts[table] = count

                print(f"   - Limpando tabela: {table} ({count} registros)")
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

        # Reseta as sequences (auto-increment) apenas das tabelas relacionadas a cards
        print("4️⃣  Resetando sequences (IDs) das tabelas de cards...")

        # Sequences específicas relacionadas a cards
        card_sequences = [
            "cards_id_seq",
            "card_notes_id_seq",
            "card_products_id_seq",
            "card_tasks_id_seq",
            "activities_id_seq",
            "card_field_values_id_seq",
            "card_transfers_id_seq",
            "automation_executions_id_seq",
        ]

        for seq in card_sequences:
            try:
                # Verifica se a sequence existe
                check_seq = text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.sequences
                        WHERE sequence_name = :seq_name AND sequence_schema = 'public'
                    );
                """)
                result = conn.execute(check_seq, {"seq_name": seq})
                exists = result.scalar()

                if exists:
                    print(f"   - Resetando sequence: {seq}")
                    conn.execute(text(f"ALTER SEQUENCE {seq} RESTART WITH 1;"))
                    conn.commit()
            except Exception as e:
                print(f"   ⚠️  Aviso ao resetar {seq}: {str(e)}")

        print("\n" + "=" * 80)
        print("✅ Cards e dados relacionados foram limpos com sucesso!")
        print("=" * 80)

        # Exibe resumo do que foi deletado
        print("\n📊 Resumo de registros deletados:")
        total_deleted = 0
        for table, count in deleted_counts.items():
            if count > 0:
                print(f"   - {table}: {count} registros")
                total_deleted += count
        print(f"\n   TOTAL: {total_deleted} registros deletados")

        print("\n✅ Dados mantidos intactos:")
        print("   - Usuários, roles e configurações de acesso")
        print("   - Boards e listas (estrutura do funil)")
        print("   - Clientes (organizações e pessoas)")
        print("   - Catálogo de produtos")
        print("   - Definições de campos customizados")
        print("   - Configurações de automações")
        print("   - Sistema de gamificação (pontos, badges, rankings)")
        print()


if __name__ == "__main__":
    try:
        clean_cards()
    except KeyboardInterrupt:
        print("\n\n❌ Operação cancelada pelo usuário (Ctrl+C)")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Erro ao limpar cards: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
