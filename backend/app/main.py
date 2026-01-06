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
from app.workers.scheduler import start_scheduler, stop_scheduler

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

    # Inicializar scheduler (APScheduler)
    await start_scheduler()
    logger.success("Scheduler iniciado")

    # TODO: Verificar conexão com banco de dados

    yield

    # Shutdown
    logger.info("Encerrando HSGrowth CRM API...")

    # Finalizar scheduler
    await stop_scheduler()
    logger.success("Scheduler finalizado")

    # TODO: Fechar conexões


# Metadados da API para documentação Swagger/OpenAPI
tags_metadata = [
    {
        "name": "Health",
        "description": "Endpoints de saúde e status da API",
    },
    {
        "name": "Root",
        "description": "Endpoint raiz da API",
    },
    {
        "name": "Auth",
        "description": "Autenticação e gerenciamento de sessão. Login, registro, refresh token, recuperação de senha.",
    },
    {
        "name": "Users",
        "description": "Gerenciamento de usuários. CRUD, paginação, filtros e alteração de senha.",
    },
    {
        "name": "Boards",
        "description": "Quadros Kanban. Criação, edição, duplicação e gerenciamento de listas.",
    },
    {
        "name": "Cards",
        "description": "Cards/Leads do pipeline. CRUD, movimentação entre listas, atribuição, campos customizados.",
    },
    {
        "name": "Gamification",
        "description": "Sistema de pontos, badges e rankings. Motivação e engajamento da equipe de vendas.",
    },
    {
        "name": "Automations",
        "description": "Automações trigger e agendadas. Fluxos automatizados para ações em cards.",
    },
    {
        "name": "Transfers",
        "description": "Transferência de cards entre vendedores. Fluxo de aprovação e gestão de transferências.",
    },
    {
        "name": "Reports",
        "description": "Relatórios e dashboard. KPIs, vendas, conversão e exportação de dados.",
    },
    {
        "name": "Notifications",
        "description": "Notificações in-app. Sistema de avisos e alertas para usuários.",
    },
    {
        "name": "Admin",
        "description": "Endpoints administrativos. Gestão avançada do sistema (requer role admin).",
    },
]

# Criar instância do FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
## HSGrowth CRM - API REST Completa para Gestão de Vendas

Sistema completo de **Customer Relationship Management (CRM)** desenvolvido com **FastAPI**,
focado em vendas B2B com recursos avançados de **gamificação**, **automações** e **transferências**.

### 🎯 Principais Funcionalidades

- **Pipeline de Vendas**: Quadros Kanban customizáveis com listas e cards
- **Gamificação**: Sistema de pontos, badges e rankings para motivar a equipe
- **Automações**: Triggers e agendamentos para ações automáticas
- **Transferências**: Gestão de passagem de leads entre vendedores
- **Relatórios**: Dashboard com KPIs e relatórios exportáveis
- **Multi-tenant**: Isolamento completo por conta (account_id)
- **RBAC**: Controle de acesso baseado em roles (admin, manager, salesperson)

### 🔐 Autenticação

A API utiliza **JWT (JSON Web Tokens)** para autenticação. Para acessar endpoints protegidos:

1. Faça login em `/api/v1/auth/login` com email e senha
2. Receba `access_token` e `refresh_token`
3. Inclua o header: `Authorization: Bearer <access_token>`
4. Renove o token em `/api/v1/auth/refresh` quando expirar (8 horas)

### 📊 Paginação

Endpoints de listagem suportam paginação padrão:
- `page`: Número da página (padrão: 1)
- `page_size`: Itens por página (padrão: 50, máximo: 100)

### 🏢 Multi-Tenancy

Todos os dados são isolados por `account_id`:
- Cada conta tem usuários, boards, cards e configurações próprias
- Isolamento automático nas queries
- Usuários só acessam dados da própria conta

### 🚀 Workers Assíncronos

A API utiliza **Celery** para processamento assíncrono e **APScheduler** para cron jobs:
- Tasks assíncronas (emails, relatórios, automações)
- 9 cron jobs periódicos (rankings, backups, limpezas)

### 📦 Tecnologias

- **FastAPI** 0.109.0 - Framework web moderno
- **SQLAlchemy** 2.0.25 - ORM
- **PostgreSQL** - Banco de dados
- **Redis** - Cache e message broker
- **Celery** - Tasks assíncronas
- **Pydantic** 2.5.3 - Validação de dados
- **JWT** - Autenticação stateless
""",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=tags_metadata,
    contact={
        "name": "HSGrowth - Suporte Técnico",
        "email": "suporte@hsgrowth.com",
    },
    license_info={
        "name": "Propriedade da HSGrowth",
    },
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
