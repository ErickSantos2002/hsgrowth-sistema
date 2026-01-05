"""
Script para popular o banco de dados com dados iniciais (seed).
Cria account padrão, roles e usuário admin.
"""
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.account import Account
from app.models.role import Role
from app.models.user import User
from app.core.security import hash_password
from loguru import logger


def create_default_account(db: Session) -> Account:
    """
    Cria a conta padrão se não existir.

    Returns:
        Account criado ou existente
    """
    # Verifica se já existe
    existing = db.query(Account).filter(Account.id == 1).first()
    if existing:
        logger.info(f"Account padrão já existe: {existing.name}")
        return existing

    # Cria novo account
    account = Account(
        name="HSGrowth",
        subdomain="hsgrowth",
        is_active=True,
        plan="premium",
        settings={
            "features": ["gamification", "automations", "transfers"],
            "limits": {"max_users": 100, "max_boards": 50}
        }
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    logger.success(f"Account criado: {account.name} (ID: {account.id})")
    return account


def create_default_roles(db: Session) -> dict[str, Role]:
    """
    Cria os roles padrão do sistema.

    Returns:
        Dicionário com os roles criados {name: Role}
    """
    roles_data = [
        {
            "name": "admin",
            "display_name": "Administrador",
            "description": "Administrador do sistema - acesso total",
            "permissions": [
                "users.create", "users.read", "users.update", "users.delete",
                "boards.create", "boards.read", "boards.update", "boards.delete",
                "cards.create", "cards.read", "cards.update", "cards.delete",
                "automations.create", "automations.read", "automations.update", "automations.delete",
                "transfers.approve", "transfers.reject",
                "reports.read", "reports.export",
                "admin.access", "admin.database",
            ]
        },
        {
            "name": "manager",
            "display_name": "Gerente",
            "description": "Gerente - pode gerenciar equipe e aprovar transferências",
            "permissions": [
                "users.read",
                "boards.create", "boards.read", "boards.update",
                "cards.create", "cards.read", "cards.update", "cards.delete",
                "automations.create", "automations.read", "automations.update",
                "transfers.approve", "transfers.reject",
                "reports.read", "reports.export",
            ]
        },
        {
            "name": "salesperson",
            "display_name": "Vendedor",
            "description": "Vendedor - pode gerenciar seus próprios cards",
            "permissions": [
                "boards.read",
                "cards.create", "cards.read", "cards.update",
                "reports.read",
            ]
        },
    ]

    roles = {}

    for role_data in roles_data:
        # Verifica se já existe
        existing = db.query(Role).filter(Role.name == role_data["name"]).first()
        if existing:
            logger.info(f"Role '{existing.name}' já existe")
            roles[role_data["name"]] = existing
            continue

        # Cria novo role
        role = Role(
            name=role_data["name"],
            display_name=role_data["display_name"],
            description=role_data["description"],
            permissions=role_data["permissions"]
        )

        db.add(role)
        roles[role_data["name"]] = role
        logger.success(f"Role criado: {role_data['name']}")

    db.commit()

    # Refresh todos os roles
    for role in roles.values():
        db.refresh(role)

    return roles


def create_admin_user(db: Session, account: Account, admin_role: Role) -> User:
    """
    Cria o usuário admin padrão.

    Args:
        account: Account ao qual o usuário pertence
        admin_role: Role de admin

    Returns:
        User admin criado
    """
    # Verifica se já existe um admin
    existing = db.query(User).filter(User.email == "admin@hsgrowth.com").first()
    if existing:
        logger.info(f"Usuário admin já existe: {existing.email}")
        return existing

    # Cria usuário admin
    admin_user = User(
        email="admin@hsgrowth.com",
        username="admin",
        name="Administrador",
        password_hash=hash_password("admin123"),  # Senha padrão: admin123
        account_id=account.id,
        role_id=admin_role.id,
        is_active=True
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    logger.success(f"Usuário admin criado: {admin_user.email}")
    logger.warning("IMPORTANTE: Altere a senha padrão 'admin123' após o primeiro login!")

    return admin_user


def seed_database():
    """
    Função principal para popular o banco de dados.
    """
    logger.info("Iniciando seed do banco de dados...")

    db = SessionLocal()

    try:
        # Criar account padrão
        account = create_default_account(db)

        # Criar roles padrão
        roles = create_default_roles(db)

        # Criar usuário admin
        admin_user = create_admin_user(db, account, roles["admin"])

        logger.success("Seed do banco de dados concluído com sucesso!")
        logger.info("Dados criados:")
        logger.info(f"  - Account: {account.name} (ID: {account.id})")
        logger.info(f"  - Roles: {', '.join(roles.keys())}")
        logger.info(f"  - Admin: {admin_user.email} / senha: admin123")

    except Exception as e:
        logger.error(f"Erro ao fazer seed do banco: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
