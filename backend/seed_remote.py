"""
Script para popular o banco de dados remoto com dados fictícios.
Executa diretamente sem passar pelo settings do app.
"""
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configuração direta do banco remoto
DATABASE_URL = "postgresql://administrador:administrador@62.72.11.28:3388/hsgrowth"

# Cria engine e session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Importa as funções de seed
from scripts.seed_database import create_roles, create_accounts, create_users, create_boards_and_lists, create_cards, create_gamification_data

def main():
    print("\n" + "="*60)
    print("  SEED DATABASE - Banco Remoto")
    print("="*60 + "\n")

    db = SessionLocal()

    try:
        print(f"Conectando em: 62.72.11.28:3388/hsgrowth\n")

        roles = create_roles(db)
        accounts = create_accounts(db, count=3)
        users = create_users(db, accounts, roles)
        boards, lists = create_boards_and_lists(db, accounts)
        cards = create_cards(db, accounts, users, boards)
        create_gamification_data(db, accounts, users)

        print("\n" + "="*60)
        print("  Banco de dados populado com sucesso!")
        print("="*60)

        print("\nResumo:")
        print(f"  - Contas: {len(accounts)}")
        print(f"  - Usuarios: {len(users)}")
        print(f"  - Boards: {len(boards)}")
        print(f"  - Listas: {len(lists)}")
        print(f"  - Cards: {len(cards)}")

        print("\nCredenciais de teste:")
        for account in accounts:
            print(f"\n  {account.name}:")
            print(f"    Admin: admin@{account.subdomain}.com / admin123")
            print(f"    Manager: manager1@{account.subdomain}.com / manager123")
            print(f"    Vendedor: vendedor1@{account.subdomain}.com / vendedor123")

        print("\n")

        # Commit final
        db.commit()
        print("Dados commitados com sucesso!")

    except Exception as e:
        print(f"\nErro: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
