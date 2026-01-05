"""
Middleware para tratamento global de erros
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from loguru import logger
from sqlalchemy.exc import SQLAlchemyError


async def catch_exceptions_middleware(request: Request, call_next):
    """
    Middleware para capturar todas as exceções não tratadas
    e retornar resposta JSON padronizada.
    """
    try:
        return await call_next(request)
    except RequestValidationError as exc:
        # Erros de validação do Pydantic
        logger.warning(f"Erro de validação: {exc}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "Erro de validação",
                "detail": exc.errors(),
            },
        )
    except SQLAlchemyError as exc:
        # Erros de banco de dados
        logger.error(f"Erro de banco de dados: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Erro de banco de dados",
                "detail": "Ocorreu um erro ao acessar o banco de dados",
            },
        )
    except Exception as exc:
        # Qualquer outra exceção
        logger.exception(f"Erro não tratado: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Erro interno do servidor",
                "detail": "Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.",
            },
        )
