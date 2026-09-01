"""
Script para popular o banco de dados remoto com dados fictícios.
Executa diretamente sem passar pelo settings do app.
"""
import os
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Banco remoto lido do ambiente — nunca versionar credencial aqui
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("Defina DATABASE_URL antes de rodar (ex.: export DATABASE_URL=postgresql://usuario:senha@host:porta/hsgrowth)")

# Cria engine e session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Importa as funções de seed (sem create_accounts)
from scripts.seed_database import (
    create_roles,
    create_users,
    create_clients,
    create_boards_and_lists,
    create_cards,
    create_gamification_data
)

def main():
    print("\n" + "="*60)
    print("  SEED DATABASE - Banco Remoto (Single-Tenant)")
    print("="*60 + "\n")

    db = SessionLocal()

    try:
        print(f"Conectando em: 62.72.11.28:3388/hsgrowth\n")

        roles = create_roles(db)
        users = create_users(db, roles)
        clients = create_clients(db)
        boards, lists = create_boards_and_lists(db)
        cards = create_cards(db, users, boards, clients)
        create_gamification_data(db, users)

        print("\n" + "="*60)
        print("  Banco de dados populado com sucesso!")
        print("="*60)

        print("\n📊 Resumo:")
        print(f"  • Usuários: {len(users)}")
        print(f"  • Clientes: {len(clients)}")
        print(f"  • Boards: {len(boards)}")
        print(f"  • Listas: {len(lists)}")
        print(f"  • Cards: {len(cards)}")

        print("\n🔐 Credenciais de teste:")
        print(f"  Admin: admin@hsgrowth.com / admin123")
        print(f"  Manager: gerente1@hsgrowth.com / gerente123")
        print(f"  Vendedor: vendedor1@hsgrowth.com / vendedor123")

        print("\n")

        # Commit final
        db.commit()
        print("✅ Dados commitados com sucesso!")

    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
