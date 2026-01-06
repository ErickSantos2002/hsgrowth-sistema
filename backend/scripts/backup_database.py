"""
Script para fazer backup do banco de dados PostgreSQL.
Usa pg_dump para criar backup completo do banco.

Pré-requisitos:
    - PostgreSQL client (pg_dump) instalado e no PATH
    - Variáveis de ambiente configuradas ou arquivo .env

Uso:
    python scripts/backup_database.py
    python scripts/backup_database.py --output-dir=backups/custom
    python scripts/backup_database.py --compress
"""
import sys
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
from loguru import logger

# Adiciona o diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings


def parse_database_url(database_url: str) -> dict:
    """
    Faz parse da DATABASE_URL do PostgreSQL.

    Args:
        database_url: URL do banco (postgresql://user:pass@host:port/dbname)

    Returns:
        Dict com componentes da URL
    """
    # Remove prefixo postgresql://
    url = database_url.replace("postgresql://", "").replace("postgres://", "")

    # Separa credenciais e host
    if "@" in url:
        credentials, location = url.split("@")
        username, password = credentials.split(":")
    else:
        raise ValueError("DATABASE_URL inválida: faltam credenciais")

    # Separa host/porta e database
    if "/" in location:
        host_port, database = location.split("/")
    else:
        raise ValueError("DATABASE_URL inválida: falta nome do database")

    # Separa host e porta
    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    return {
        "username": username,
        "password": password,
        "host": host,
        "port": port,
        "database": database
    }


def backup_database(output_dir: Path, compress: bool = False):
    """
    Faz backup do banco de dados PostgreSQL.

    Args:
        output_dir: Diretório onde salvar o backup
        compress: Se True, compacta o backup com gzip
    """
    logger.info("=" * 60)
    logger.info("BACKUP DO BANCO DE DADOS")
    logger.info("=" * 60)

    # Cria diretório de output se não existir
    output_dir.mkdir(parents=True, exist_ok=True)

    # Parse DATABASE_URL
    try:
        db_config = parse_database_url(settings.DATABASE_URL)
    except Exception as e:
        logger.error(f"Erro ao fazer parse da DATABASE_URL: {e}")
        logger.error("Certifique-se de que DATABASE_URL está no formato: postgresql://user:pass@host:port/dbname")
        return

    logger.info(f"Database: {db_config['database']}")
    logger.info(f"Host: {db_config['host']}:{db_config['port']}")
    logger.info(f"User: {db_config['username']}")

    # Nome do arquivo de backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"backup_{db_config['database']}_{timestamp}.sql"
    if compress:
        backup_filename += ".gz"

    backup_path = output_dir / backup_filename

    logger.info(f"Arquivo de backup: {backup_path}")
    logger.info("\nIniciando backup...")

    try:
        # Comando pg_dump
        cmd = [
            "pg_dump",
            "-h", db_config["host"],
            "-p", db_config["port"],
            "-U", db_config["username"],
            "-d", db_config["database"],
            "--no-owner",  # Não inclui comandos de ownership
            "--no-acl",    # Não inclui ACLs
            "-F", "c",     # Formato custom (comprimido e portável)
            "-f", str(backup_path)
        ]

        # Se não usar formato custom, pode usar gzip
        if compress and "-F" not in cmd:
            cmd.append("|")
            cmd.append("gzip")
            cmd.append(">")
            cmd.append(str(backup_path))

        # Configura ambiente com senha
        env = {
            "PGPASSWORD": db_config["password"]
        }

        # Executa backup
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            logger.error(f"\n❌ Erro ao fazer backup:")
            logger.error(result.stderr)
            return

        # Verifica tamanho do backup
        backup_size = backup_path.stat().st_size
        backup_size_mb = backup_size / 1024 / 1024

        logger.success(f"\n✓ Backup concluído com sucesso!")
        logger.info(f"  Arquivo: {backup_path}")
        logger.info(f"  Tamanho: {backup_size_mb:.2f} MB")

        # Verifica backups antigos
        list_old_backups(output_dir)

        logger.info("\n💡 Para restaurar este backup, use:")
        logger.info(f"   pg_restore -h <host> -p <port> -U <user> -d <database> -c {backup_path}")

        logger.info("=" * 60)

    except FileNotFoundError:
        logger.error("\n❌ pg_dump não encontrado!")
        logger.error("Certifique-se de que o PostgreSQL client está instalado e no PATH")
        logger.error("No Windows: Adicione 'C:\\Program Files\\PostgreSQL\\<version>\\bin' ao PATH")
        logger.error("No Linux: sudo apt-get install postgresql-client")
    except Exception as e:
        logger.error(f"\n❌ Erro ao fazer backup: {e}")
        import traceback
        logger.error(traceback.format_exc())


def list_old_backups(output_dir: Path, show_count: int = 5):
    """
    Lista backups anteriores.

    Args:
        output_dir: Diretório de backups
        show_count: Quantidade de backups a mostrar
    """
    backups = list(output_dir.glob("backup_*.sql*"))

    if not backups:
        return

    # Ordena por data de modificação (mais recente primeiro)
    backups.sort(key=lambda x: x.stat().st_mtime, reverse=True)

    logger.info(f"\n📦 Backups anteriores ({len(backups)} total):")

    for backup in backups[:show_count]:
        mtime = datetime.fromtimestamp(backup.stat().st_mtime)
        size_mb = backup.stat().st_size / 1024 / 1024
        logger.info(f"  - {backup.name} ({size_mb:.2f} MB) - {mtime.strftime('%Y-%m-%d %H:%M:%S')}")

    if len(backups) > show_count:
        logger.info(f"  ... e mais {len(backups) - show_count} backup(s)")


def main():
    """Função principal"""
    parser = argparse.ArgumentParser(
        description="Faz backup do banco de dados PostgreSQL"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="backups",
        help="Diretório de output (padrão: backups/)"
    )
    parser.add_argument(
        "--compress",
        action="store_true",
        help="Compacta backup com gzip"
    )

    args = parser.parse_args()

    # Resolve caminho do diretório de output
    backend_dir = Path(__file__).parent.parent
    output_dir = backend_dir / args.output_dir

    # Executa backup
    backup_database(
        output_dir=output_dir,
        compress=args.compress
    )


if __name__ == "__main__":
    main()
