"""
Script para limpar logs antigos do sistema.
Remove arquivos de log mais antigos que X dias.

Uso:
    python scripts/clean_logs.py --days=30
    python scripts/clean_logs.py --days=90 --dry-run
"""
import sys
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from loguru import logger


def clean_logs(log_dir: Path, retention_days: int, dry_run: bool = False):
    """
    Limpa logs antigos.

    Args:
        log_dir: Diretório de logs
        retention_days: Dias de retenção
        dry_run: Se True, apenas lista os arquivos sem deletar
    """
    logger.info("=" * 60)
    logger.info("LIMPEZA DE LOGS")
    logger.info("=" * 60)
    logger.info(f"Diretório: {log_dir}")
    logger.info(f"Retenção: {retention_days} dias")
    logger.info(f"Modo: {'DRY RUN (sem deletar)' if dry_run else 'EXECUÇÃO REAL'}")
    logger.info("=" * 60)

    if not log_dir.exists():
        logger.warning(f"Diretório de logs não existe: {log_dir}")
        return

    # Data limite
    cutoff_date = datetime.now() - timedelta(days=retention_days)
    logger.info(f"\nArquivos modificados antes de {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')} serão removidos")

    # Busca arquivos de log
    log_files = list(log_dir.glob("**/*.log"))
    logger.info(f"\n{len(log_files)} arquivos de log encontrados")

    # Filtra arquivos antigos
    old_files = []
    total_size = 0

    for log_file in log_files:
        # Pega data de modificação
        mtime = datetime.fromtimestamp(log_file.stat().st_mtime)

        if mtime < cutoff_date:
            file_size = log_file.stat().st_size
            old_files.append((log_file, mtime, file_size))
            total_size += file_size

    if not old_files:
        logger.success("\n✓ Nenhum arquivo antigo encontrado!")
        return

    # Ordena por data (mais antigo primeiro)
    old_files.sort(key=lambda x: x[1])

    logger.info(f"\n{len(old_files)} arquivos antigos encontrados ({total_size / 1024 / 1024:.2f} MB)")

    # Lista arquivos
    logger.info("\nArquivos que serão removidos:")
    for log_file, mtime, file_size in old_files:
        logger.info(f"  - {log_file.name} ({file_size / 1024:.1f} KB) - {mtime.strftime('%Y-%m-%d %H:%M:%S')}")

    # Remove arquivos
    if dry_run:
        logger.warning("\n⚠️  DRY RUN: Nenhum arquivo foi deletado")
    else:
        logger.info("\nRemovendo arquivos...")
        deleted_count = 0
        deleted_size = 0

        for log_file, _, file_size in old_files:
            try:
                log_file.unlink()
                deleted_count += 1
                deleted_size += file_size
                logger.debug(f"  ✓ Removido: {log_file.name}")
            except Exception as e:
                logger.error(f"  ✗ Erro ao remover {log_file.name}: {e}")

        logger.success(f"\n✓ {deleted_count} arquivos removidos ({deleted_size / 1024 / 1024:.2f} MB liberados)")

    logger.info("=" * 60)


def main():
    """Função principal"""
    parser = argparse.ArgumentParser(
        description="Limpa logs antigos do sistema"
    )
    parser.add_argument(
        "--days",
        type=int,
        default=90,
        help="Dias de retenção (padrão: 90)"
    )
    parser.add_argument(
        "--log-dir",
        type=str,
        default="logs",
        help="Diretório de logs (padrão: logs/)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Modo dry run: lista arquivos sem deletar"
    )

    args = parser.parse_args()

    # Resolve caminho do diretório de logs
    backend_dir = Path(__file__).parent.parent
    log_dir = backend_dir / args.log_dir

    # Executa limpeza
    clean_logs(
        log_dir=log_dir,
        retention_days=args.days,
        dry_run=args.dry_run
    )


if __name__ == "__main__":
    main()
