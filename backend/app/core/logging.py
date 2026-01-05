"""
Configuração de logging usando Loguru
"""
import sys
from loguru import logger
from app.core.config import settings


def configure_logging():
    """
    Configura o sistema de logging da aplicação.
    Remove handlers padrão e adiciona configuração customizada.
    """
    # Remover handler padrão
    logger.remove()

    # Adicionar handler para console (stdout)
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=settings.LOG_LEVEL,
        colorize=True,
    )

    # Adicionar handler para arquivo (aplicação)
    logger.add(
        "logs/app_{time:YYYY-MM-DD}.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level=settings.LOG_LEVEL,
        rotation="00:00",  # Novo arquivo a cada dia
        retention=f"{settings.LOG_RETENTION_DAYS} days",  # Manter logs por X dias
        compression="zip",  # Comprimir logs antigos
        encoding="utf-8",  # Forçar UTF-8 para evitar problemas de encoding
    )

    # Adicionar handler para arquivo de erros
    logger.add(
        "logs/error_{time:YYYY-MM-DD}.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level="ERROR",
        rotation="00:00",
        retention=f"{settings.LOG_RETENTION_DAYS} days",
        compression="zip",
        encoding="utf-8",  # Forçar UTF-8 para evitar problemas de encoding
    )

    logger.info("Sistema de logging configurado")


# Configurar logging ao importar este módulo
configure_logging()
