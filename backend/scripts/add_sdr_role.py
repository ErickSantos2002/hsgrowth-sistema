"""
Script para adicionar a role SDR (Sales Development Representative) no banco de dados.

Uso:
    docker-compose exec api python scripts/add_sdr_role.py

    ou localmente:
    python scripts/add_sdr_role.py
"""
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.role import Role


def add_sdr_role():
    """Adiciona a role SDR no banco de dados"""
    db: Session = SessionLocal()

    try:
        print("[*] Adicionando role SDR...")

        # Verifica se a role SDR já existe
        existing_sdr = db.query(Role).filter(Role.name == "sdr").first()

        if existing_sdr:
            print(f"  [OK] Role 'sdr' ja existe (ID: {existing_sdr.id})")
            print(f"    Display Name: {existing_sdr.display_name}")
            print(f"    Description: {existing_sdr.description}")
            return

        # Cria a role SDR
        sdr_role = Role(
            name="sdr",
            display_name="SDR",
            description="Sales Development Representative - Responsavel por prospeccao e qualificacao de leads",
            permissions=[
                "cards.read",
                "cards.create",
                "cards.update",
                "boards.read",
                "clients.read",
                "clients.create"
            ],
            is_system_role=True
        )

        db.add(sdr_role)
        db.commit()
        db.refresh(sdr_role)

        print(f"  [SUCCESS] Role 'sdr' criada com sucesso!")
        print(f"    ID: {sdr_role.id}")
        print(f"    Display Name: {sdr_role.display_name}")
        print(f"    Description: {sdr_role.description}")
        print(f"    Permissions: {', '.join(sdr_role.permissions)}")

        # Lista todas as roles para confirmação
        print("\n[INFO] Roles disponiveis no sistema:")
        all_roles = db.query(Role).order_by(Role.id).all()
        for role in all_roles:
            print(f"  {role.id}. {role.name} ({role.display_name})")

    except Exception as e:
        print(f"[ERROR] Erro ao adicionar role SDR: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_sdr_role()
