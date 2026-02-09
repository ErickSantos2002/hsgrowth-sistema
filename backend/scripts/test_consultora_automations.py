"""
Script de teste para validar as automações da consultora.

Testa:
1. Criação de empresa (deve ter relationship_type = "Lead")
2. Movimentação de card para "Reunião Agendada" (deve mudar para "Prospect")
3. Card marcado como ganho (deve mudar para "Cliente")
4. Bloqueio de mudança de "Cliente" para "Lead" (deve ser bloqueado)

Uso:
    python scripts/test_consultora_automations.py
"""
import sys
import os

# Adiciona o diretório raiz ao path para importar os módulos
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.client import Client
from app.models.card import Card
from app.models.board import Board
from app.models.list import List
from app.models.user import User
from app.services.client_service import ClientService
from app.services.card_service import CardService
from app.schemas.client import ClientCreate, ClientUpdate
from app.schemas.card import CardCreate, CardUpdate


def test_consultora_automations():
    """
    Testa as automações da consultora end-to-end.
    """
    db: Session = SessionLocal()

    try:
        print("=" * 80)
        print("TESTANDO AUTOMAÇÕES DA CONSULTORA")
        print("=" * 80)

        # Busca um usuário admin para executar ações
        admin_user = db.query(User).join(User.role).filter(
            User.role.has(name="admin")
        ).first()

        if not admin_user:
            print("❌ Nenhum usuário admin encontrado. Crie um admin antes de executar este script.")
            return

        print(f"\n👤 Usuário de teste: {admin_user.name} (admin)")

        # Busca o board Aquisição
        aquisicao_board = db.query(Board).filter(Board.name.ilike("%aquisição%")).first()

        if not aquisicao_board:
            print("❌ Board 'Aquisição' não encontrado.")
            return

        # Busca as listas necessárias
        primeira_lista = db.query(List).filter(
            List.board_id == aquisicao_board.id
        ).order_by(List.position).first()

        reuniao_agendada_list = db.query(List).filter(
            List.board_id == aquisicao_board.id,
            List.name.ilike("%reunião agendada%")
        ).first()

        if not primeira_lista or not reuniao_agendada_list:
            print("❌ Listas necessárias não encontradas no board Aquisição.")
            return

        print(f"📋 Board: {aquisicao_board.name}")
        print(f"   Lista inicial: {primeira_lista.name}")
        print(f"   Lista destino: {reuniao_agendada_list.name}")

        # ========== TESTE 1: Criar empresa (deve ter relationship_type = "Lead") ==========
        print("\n" + "─" * 80)
        print("TESTE 1: Criar empresa (relationship_type deve ser 'Lead')")
        print("─" * 80)

        client_service = ClientService(db)

        # Gera um documento aleatório (CNPJ fictício)
        import random
        random_cnpj = f"{random.randint(10000000, 99999999):08d}{random.randint(100000, 999999):06d}"

        client_data = ClientCreate(
            name="João Teste Automação",
            email=f"joao.teste.{os.urandom(4).hex()}@example.com",
            company_name="Empresa Teste Automação Ltda",
            document=random_cnpj,  # CNPJ fictício
            # relationship_type NÃO fornecido (deve ser preenchido automaticamente)
        )

        client = client_service.create_client(client_data)
        print(f"✅ Empresa criada (ID: {client.id})")
        print(f"   Nome: {client.company_name}")
        print(f"   relationship_type: '{client.relationship_type}'")

        if client.relationship_type == "Lead":
            print("   ✅ PASSOU: relationship_type = 'Lead'")
        else:
            print(f"   ❌ FALHOU: Esperado 'Lead', obteve '{client.relationship_type}'")

        # ========== TESTE 2: Criar card e mover para Reunião Agendada (deve mudar para "Prospect") ==========
        print("\n" + "─" * 80)
        print("TESTE 2: Mover card para 'Reunião Agendada' (deve mudar para 'Prospect')")
        print("─" * 80)

        card_service = CardService(db)
        card_data = CardCreate(
            title="Negócio Teste Automação",
            description="Teste de automação",
            list_id=primeira_lista.id,
            client_id=client.id,
            value=10000.0
        )

        card = card_service.create_card(card_data, admin_user)
        print(f"✅ Card criado (ID: {card.id})")
        print(f"   Título: {card.title}")
        print(f"   Lista: {primeira_lista.name}")

        # Move para Reunião Agendada
        print(f"\n   Movendo para '{reuniao_agendada_list.name}'...")
        moved_card = card_service.move_card(card.id, reuniao_agendada_list.id, None, admin_user)

        # Recarrega o cliente para ver se mudou
        db.refresh(client)
        print(f"   relationship_type do cliente: '{client.relationship_type}'")

        if client.relationship_type == "Prospect":
            print("   ✅ PASSOU: relationship_type mudou para 'Prospect'")
        else:
            print(f"   ❌ FALHOU: Esperado 'Prospect', obteve '{client.relationship_type}'")

        # ========== TESTE 3: Marcar card como ganho (deve mudar para "Cliente") ==========
        print("\n" + "─" * 80)
        print("TESTE 3: Marcar card como ganho (deve mudar para 'Cliente')")
        print("─" * 80)

        update_won = CardUpdate(is_won=1)  # Marca como ganho
        updated_card = card_service.update_card(card.id, update_won, admin_user)
        print(f"✅ Card marcado como ganho")

        # Recarrega o cliente para ver se mudou
        db.refresh(client)
        print(f"   relationship_type do cliente: '{client.relationship_type}'")

        if client.relationship_type == "Cliente":
            print("   ✅ PASSOU: relationship_type mudou para 'Cliente'")
        else:
            print(f"   ❌ FALHOU: Esperado 'Cliente', obteve '{client.relationship_type}'")

        # ========== TESTE 4: Tentar alterar Cliente para Lead (deve ser bloqueado) ==========
        print("\n" + "─" * 80)
        print("TESTE 4: Tentar alterar 'Cliente' para 'Lead' (deve ser bloqueado)")
        print("─" * 80)

        try:
            update_to_lead = ClientUpdate(relationship_type="Lead")
            client_service.update_client(client.id, update_to_lead)
            print("   ❌ FALHOU: Mudança foi permitida (deveria ter sido bloqueada)")
        except Exception as e:
            if "irreversível" in str(e).lower():
                print(f"   ✅ PASSOU: Mudança bloqueada com mensagem apropriada")
                print(f"   Mensagem: {e}")
            else:
                print(f"   ⚠️  ATENÇÃO: Erro diferente do esperado: {e}")

        print("\n" + "=" * 80)
        print("✅ TESTES CONCLUÍDOS!")
        print("=" * 80)

        # Limpeza (opcional: deletar dados de teste)
        print("\n🧹 Limpando dados de teste...")
        card_service.delete_card(card.id, admin_user)
        client_service.delete_client(client.id)
        print("   ✅ Dados de teste removidos")

    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()

    finally:
        db.close()


if __name__ == "__main__":
    test_consultora_automations()
