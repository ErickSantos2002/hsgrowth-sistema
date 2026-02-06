"""
Entry point da aplicação FastAPI - HSGrowth CRM
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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

    # Inicializar scheduler (APScheduler) - exceto durante testes
    if settings.ENVIRONMENT != "testing":
        await start_scheduler()
        logger.success("Scheduler iniciado")
    else:
        logger.info("Scheduler desabilitado durante testes")

    # TODO: Verificar conexão com banco de dados

    yield

    # Shutdown
    logger.info("Encerrando HSGrowth CRM API...")

    # Finalizar scheduler - exceto durante testes
    if settings.ENVIRONMENT != "testing":
        await stop_scheduler()
        logger.success("Scheduler finalizado")

    # TODO: Fechar conexões


# Metadados da API para documentação Swagger/OpenAPI
tags_metadata = [
    {
        "name": "Health",
        "description": "Endpoints de saúde e status da API.",
    },
    {
        "name": "Root",
        "description": "Endpoint raiz da API.",
    },
    {
        "name": "Auth",
        "description": "Autenticação e gerenciamento de sessão. Login, registro, refresh token, recuperação de senha e autenticação client_credentials para integrações.",
    },
    {
        "name": "Users",
        "description": "Gerenciamento de usuários. CRUD, paginação, filtros, alteração de senha e avatar.",
    },
    {
        "name": "Boards",
        "description": "Quadros Kanban e listas. Criação, edição, duplicação de boards e gerenciamento de listas (colunas do pipeline).",
    },
    {
        "name": "Cards",
        "description": "Cards/Leads do pipeline de vendas. CRUD, movimentação entre listas, atribuição a vendedores, histórico e campos customizados.",
    },
    {
        "name": "Card Tasks",
        "description": "Tarefas e atividades dos cards. Ligações, reuniões, prazos e outras atividades vinculadas a oportunidades de venda.",
    },
    {
        "name": "Card Notes",
        "description": "Anotações dos cards. Registro de observações, interações e informações relevantes sobre as oportunidades.",
    },
    {
        "name": "Custom Fields",
        "description": "Campos personalizados dos boards. Definição e gerenciamento de campos customizados (texto, número, select, etc.) e seus valores nos cards.",
    },
    {
        "name": "Products",
        "description": "Catálogo de produtos e serviços. Gerenciamento do catálogo e vinculação de produtos aos cards com cálculo de valores.",
    },
    {
        "name": "Clients",
        "description": "Gerenciamento de empresas/clientes. CRUD de organizações vinculadas aos cards do pipeline.",
    },
    {
        "name": "Persons",
        "description": "Gerenciamento de contatos/pessoas. CRUD de pessoas vinculadas a clientes e cards do pipeline.",
    },
    {
        "name": "Gamification",
        "description": "Sistema de gamificação. Pontos, badges e rankings para motivação e engajamento da equipe de vendas.",
    },
    {
        "name": "Automations",
        "description": "Automações do sistema. Triggers baseados em eventos e agendamentos para ações automáticas em cards (mover, atribuir, notificar, etc.).",
    },
    {
        "name": "Transfers",
        "description": "Transferência de cards entre vendedores. Transferências individuais e em lote, fluxo de aprovação e estatísticas.",
    },
    {
        "name": "Reports",
        "description": "Relatórios e dashboard. KPIs do pipeline, relatórios de vendas, funil de conversão, transferências e exportação de dados.",
    },
    {
        "name": "Notifications",
        "description": "Notificações in-app. Sistema de avisos e alertas em tempo real para usuários sobre ações no CRM.",
    },
    {
        "name": "Admin",
        "description": "Endpoints administrativos (requer role admin). Gestão de usuários, logs de auditoria, queries SQL, monitoramento de automações e estatísticas do sistema.",
    },
    {
        "name": "Integration Clients",
        "description": "Gerenciamento de clients de integração (requer role admin). Criação e gestão de credenciais OAuth2 client_credentials para sistemas externos (N8N, Zapier, etc.).",
    },
    {
        "name": "API4COM",
        "description": "Integração com API4COM (VOIP). Configuração da central telefônica, gerenciamento de ramais, realização de chamadas e recebimento de webhooks.",
    },
    {
        "name": "Audit Logs",
        "description": "Logs de auditoria do sistema (requer role admin). Registro detalhado de todas as ações realizadas no CRM com filtros avançados.",
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

### 🏢 Sistema Único

Sistema interno da HSGrowth com controle de acesso baseado em roles:
- Todos os dados são compartilhados entre todos os usuários do sistema
- Controle de acesso via permissões de role (admin, manager, salesperson)
- Isolamento de dados por permissões, não por conta

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


# Montar diretório de arquivos estáticos (CSS, JS, imagens, etc.)
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")


@app.get("/api-docs", include_in_schema=False)
async def custom_api_docs():
    """Página de documentação customizada da API."""
    html_path = os.path.join(os.path.dirname(__file__), "static", "api-docs.html")
    return FileResponse(html_path, media_type="text/html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
