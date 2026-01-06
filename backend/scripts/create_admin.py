"""
Script para criar usuário administrador.
Útil para criar admin inicial ou adicionar novos administradores.

Uso:
    python scripts/create_admin.py
    python scripts/create_admin.py --email=admin@empresa.com --name="Admin Empresa" --account-id=1
"""
import sys
import argparse
from pathlib import Path
from getpass import getpass

# Adiciona o diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.account import Account
from app.models.user import User
from app.core.security import hash_password
from loguru import logger


def get_user_input(prompt: str, default: str = None) -> str:
    """
    Solicita entrada do usuário.

    Args:
        prompt: Mensagem do prompt
        default: Valor padrão

    Returns:
        Valor digitado pelo usuário
    """
    if default:
        prompt += f" [{default}]"

    value = input(f"{prompt}: ").strip()

    if not value and default:
        return default

    return value


def create_admin(
    db: Session,
    email: str = None,
    name: str = None,
    password: str = None,
    account_id: int = None,
    phone: str = None
) -> User:
    """
    Cria usuário administrador.

    Args:
        db: Sessão do banco de dados
        email: Email do admin
        name: Nome do admin
        password: Senha do admin
        account_id: ID da account
        phone: Telefone (opcional)

    Returns:
        User criado
    """
    logger.info("=" * 60)
    logger.info("CRIAR USUÁRIO ADMINISTRADOR")
    logger.info("=" * 60)

    # Solicita dados se não fornecidos
    if not email:
        email = get_user_input("Email")

    if not name:
        name = get_user_input("Nome completo")

    if not password:
        while True:
            password = getpass("Senha: ")
            password_confirm = getpass("Confirme a senha: ")

            if password == password_confirm:
                break

            logger.warning("⚠️  Senhas não coincidem, tente novamente")

    # Busca account
    if account_id:
        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            logger.error(f"Account {account_id} não encontrada!")
            return None
    else:
        # Lista accounts disponíveis
        accounts = db.query(Account).all()

        if not accounts:
            logger.error("Nenhuma account encontrada! Crie uma account primeiro")
            return None

        if len(accounts) == 1:
            account = accounts[0]
            logger.info(f"Usando account: {account.name} (ID: {account.id})")
        else:
            logger.info("\nAccounts disponíveis:")
            for acc in accounts:
                logger.info(f"  {acc.id}. {acc.name} ({acc.subdomain})")

            account_id = int(get_user_input("\nID da account"))
            account = db.query(Account).filter(Account.id == account_id).first()

            if not account:
                logger.error(f"Account {account_id} não encontrada!")
                return None

    # Phone (opcional)
    if not phone:
        phone = get_user_input("Telefone (opcional)", default="")
        if not phone:
            phone = None

    # Verifica se email já existe
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        logger.error(f"\n❌ Usuário com email '{email}' já existe!")
        logger.info(f"   Nome: {existing.name}")
        logger.info(f"   Role: {existing.role}")
        logger.info(f"   Ativo: {'Sim' if existing.is_active else 'Não'}")
        return None

    # Cria usuário
    logger.info("\nCriando usuário administrador...")

    admin_user = User(
        name=name,
        email=email,
        password=hash_password(password),
        role="admin",
        phone=phone,
        account_id=account.id,
        is_active=True,
        is_deleted=False
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    logger.success("\n✓ Usuário administrador criado com sucesso!")
    logger.info("=" * 60)
    logger.info("DADOS DO ADMINISTRADOR:")
    logger.info("=" * 60)
    logger.info(f"  ID: {admin_user.id}")
    logger.info(f"  Nome: {admin_user.name}")
    logger.info(f"  Email: {admin_user.email}")
    logger.info(f"  Role: {admin_user.role}")
    logger.info(f"  Account: {account.name} (ID: {account.id})")
    if phone:
        logger.info(f"  Telefone: {phone}")
    logger.info("=" * 60)
    logger.warning("\n⚠️  IMPORTANTE: Guarde estas credenciais em local seguro!")
    logger.info(f"   Login: {admin_user.email}")
    logger.info("   Senha: (a que você definiu)")
    logger.info("=" * 60)

    return admin_user


def main():
    """Função principal"""
    parser = argparse.ArgumentParser(
        description="Cria usuário administrador"
    )
    parser.add_argument(
        "--email",
        type=str,
        help="Email do administrador"
    )
    parser.add_argument(
        "--name",
        type=str,
        help="Nome completo do administrador"
    )
    parser.add_argument(
        "--password",
        type=str,
        help="Senha (não recomendado passar por argumento, melhor deixar o script solicitar)"
    )
    parser.add_argument(
        "--account-id",
        type=int,
        help="ID da account"
    )
    parser.add_argument(
        "--phone",
        type=str,
        help="Telefone (opcional)"
    )

    args = parser.parse_args()

    db = SessionLocal()

    try:
        create_admin(
            db=db,
            email=args.email,
            name=args.name,
            password=args.password,
            account_id=args.account_id,
            phone=args.phone
        )
    except KeyboardInterrupt:
        logger.warning("\n\n⚠️  Operação cancelada pelo usuário")
    except Exception as e:
        logger.error(f"\n❌ Erro ao criar administrador: {e}")
        import traceback
        logger.error(traceback.format_exc())
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
