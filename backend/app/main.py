"""
Entry point da aplicação FastAPI - HSGrowth CRM
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.logging import configure_logging
from app.middleware.error_handler import catch_exceptions_middleware

# Configurar logging
configure_logging()


# Lifespan event handler para inicializar/finalizar recursos
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerencia o ciclo de vida da aplicação.
    Executa código no startup e shutdown.
    """
    # Startup
    logger.info("Iniciando HSGrowth CRM API...")
    logger.info(f"Ambiente: {settings.ENVIRONMENT}")
    logger.info(f"Debug: {settings.DEBUG}")

    # TODO: Inicializar scheduler (APScheduler) aqui
    # TODO: Verificar conexão com banco de dados

    yield

    # Shutdown
    logger.info("Encerrando HSGrowth CRM API...")
    # TODO: Finalizar scheduler
    # TODO: Fechar conexões


# Criar instância do FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API REST para gerenciamento de CRM customizado da HSGrowth",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Adicionar middleware de tratamento de erros
app.middleware("http")(catch_exceptions_middleware)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Endpoint de health check para verificar se a API está funcionando.
    Usado por load balancers e monitoramento.
    """
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION,
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Endpoint raiz da API"""
    return {
        "message": "HSGrowth CRM API",
        "version": settings.VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
    }


# Incluir routers da API v1
from app.api.v1 import api_router
app.include_router(api_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
