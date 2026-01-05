# 📋 TODO - Backend HSGrowth CRM (FastAPI)

**Objetivo**: Backend completo e funcional do sistema CRM
**Stack**: Python 3.11+, FastAPI, SQLAlchemy, PostgreSQL, Celery, APScheduler

---

## ✅ FASE 1: Setup Inicial e Estrutura (CONCLUÍDA)

### 1.1 Configuração do Projeto
- [x] Criar ambiente virtual Python (`python -m venv venv`)
- [x] Criar `requirements.txt` com dependências principais
  - [x] fastapi
  - [x] uvicorn[standard]
  - [x] sqlalchemy
  - [x] alembic
  - [x] psycopg2-binary
  - [x] pydantic
  - [x] pydantic-settings
  - [x] python-jose[cryptography]
  - [x] passlib[bcrypt]
  - [x] python-multipart
  - [x] celery
  - [x] redis
  - [x] apscheduler
  - [x] loguru
  - [x] python-dotenv
  - [x] httpx (para testes)
  - [x] pytest
  - [x] pytest-asyncio
  - [x] pytest-cov
- [x] Criar estrutura de diretórios (seguir Doc 08)
  - [x] app/
  - [x] app/api/v1/endpoints/
  - [x] app/core/
  - [x] app/db/
  - [x] app/models/
  - [x] app/schemas/
  - [x] app/repositories/
  - [x] app/services/
  - [x] app/middleware/
  - [x] app/workers/
  - [x] app/tasks/
  - [x] app/utils/
  - [x] alembic/
  - [x] tests/
  - [x] scripts/

### 1.2 Configuração Base
- [x] Criar `app/main.py` (entry point da aplicação)
- [x] Criar `app/core/config.py` (Settings com Pydantic)
- [x] Criar `.env.example` com todas as variáveis
- [x] Criar `.gitignore` (venv, __pycache__, .env, etc.)
- [x] Configurar CORS no FastAPI
- [x] Criar `app/core/logging.py` (configuração Loguru)
- [x] Criar `app/middleware/error_handler.py` (tratamento de erros global)

### 1.3 Banco de Dados
- [x] Criar `app/db/base.py` (Base do SQLAlchemy)
- [x] Criar `app/db/session.py` (SessionLocal, get_db dependency)
- [x] Criar `alembic.ini` (configuração do Alembic)
- [x] Criar `alembic/env.py` para importar models
- [x] Criar `alembic/script.py.mako` (template de migration)
- [x] Criar pasta `alembic/versions/`

---

## ✅ FASE 2: Modelos SQLAlchemy (CONCLUÍDA)

### 2.1 Modelos Base
- [x] `app/models/user.py` - Usuários
- [x] `app/models/account.py` - Contas (multi-tenant)
- [x] `app/models/role.py` - Roles e Permissões
- [x] `app/models/board.py` - Quadros (Boards)
- [x] `app/models/list.py` - Listas dentro dos quadros
- [x] `app/models/card.py` - Cartões (Cards)
- [x] `app/models/field_definition.py` - Definições de campos customizados
- [x] `app/models/card_field_value.py` - Valores dos campos customizados

### 2.2 Modelos de Auditoria e Logs
- [x] `app/models/activity.py` - Timeline de atividades
- [x] `app/models/audit_log.py` - Logs de auditoria

### 2.3 Modelos de Gamificação
- [x] `app/models/gamification_point.py` - Pontos de gamificação
- [x] `app/models/gamification_badge.py` - Badges
- [x] `app/models/user_badge.py` - Relação user-badge
- [x] `app/models/gamification_ranking.py` - Rankings periódicos

### 2.4 Modelos de Automações
- [x] `app/models/automation.py` - Automações
- [x] `app/models/automation_execution.py` - Histórico de execuções

### 2.5 Modelos de Transferências
- [x] `app/models/card_transfer.py` - Transferências de cartões
- [x] `app/models/transfer_approval.py` - Aprovações de transferências

### 2.6 Modelos de Notificações
- [x] `app/models/notification.py` - Notificações in-app

### 2.7 Criar Migration Inicial
- [x] `alembic revision --autogenerate -m "initial_migration"`
- [x] Revisar migration gerada
- [x] `alembic upgrade head`

---

## ✅ FASE 3: Autenticação e Autorização (CONCLUÍDA)

### 3.1 Schemas Pydantic
- [x] `app/schemas/auth.py` - Login, Token, Register
- [x] `app/schemas/user.py` - UserCreate, UserUpdate, UserResponse

### 3.2 Core de Segurança
- [x] `app/core/security.py`
  - [x] Função `hash_password(password: str)`
  - [x] Função `verify_password(plain, hashed)`
  - [x] Função `create_access_token(data: dict)`
  - [x] Função `create_refresh_token(data: dict)`
  - [x] Função `decode_token(token: str)`

### 3.3 Dependencies de Autenticação
- [x] `app/api/deps.py`
  - [x] `get_current_user()` - Extrai user do JWT
  - [x] `get_current_active_user()` - User ativo
  - [x] `require_role(role: str)` - Verifica role
  - [x] `require_permission(permission: str)` - Verifica permissão

### 3.4 Endpoints de Autenticação
- [x] `app/api/v1/endpoints/auth.py`
  - [x] `POST /auth/login` - Login com email/senha
  - [x] `POST /auth/refresh` - Refresh token
  - [x] `POST /auth/logout` - Logout
  - [x] `POST /auth/forgot-password` - Solicitar reset de senha
  - [x] `POST /auth/reset-password` - Reset de senha com token
  - [ ] `POST /auth/client-credentials` - Auth para sistemas externos (TODO)

---

## ✅ FASE 4: Módulo de Usuários (CONCLUÍDA)

### 4.1 Repository
- [x] `app/repositories/user_repository.py`
  - [x] `find_by_id(user_id)`
  - [x] `find_by_email(email)`
  - [x] `find_by_username(username)`
  - [x] `create(data)`
  - [x] `update(user_id, data)`
  - [x] `delete(user_id)` - Soft delete
  - [x] `hard_delete(user_id)` - Hard delete
  - [x] `list_by_account(account_id)`
  - [x] `count_by_account(account_id)`
  - [x] `exists_email(email)`
  - [x] `exists_username(username)`

### 4.2 Service
- [x] `app/services/user_service.py`
  - [x] Lógica de negócio para usuários
  - [x] Validações (email/username únicos)
  - [x] Autorizações (próprio usuário ou admin)
  - [x] Paginação

### 4.3 Endpoints
- [x] `app/api/v1/endpoints/users.py`
  - [x] `GET /users` - Listar usuários (com paginação)
  - [x] `GET /users/{id}` - Buscar usuário
  - [x] `POST /users` - Criar usuário
  - [x] `PUT /users/{id}` - Atualizar usuário
  - [x] `DELETE /users/{id}` - Deletar usuário
  - [x] `GET /users/me` - Dados do usuário logado
  - [x] `POST /users/me/change-password` - Alterar senha

---

## ✅ FASE 5: Módulo de Boards (CONCLUÍDA)

### 5.1 Schemas
- [x] `app/schemas/board.py` - BoardCreate, BoardUpdate, BoardResponse, BoardListResponse, BoardDuplicateRequest
- [x] `app/schemas/list.py` - ListCreate, ListUpdate, ListResponse, ListMoveRequest

### 5.2 Repositories
- [x] `app/repositories/board_repository.py`
  - [x] `find_by_id()`, `list_by_account()`, `count_by_account()`
  - [x] `create()`, `update()`, `delete()`, `duplicate()`
- [x] `app/repositories/list_repository.py`
  - [x] `find_by_id()`, `list_by_board()`, `count_by_board()`
  - [x] `get_max_position()`, `create()`, `update()`, `delete()`
  - [x] `reorder()`, `duplicate_for_board()`

### 5.3 Services
- [x] `app/services/board_service.py`
  - [x] Validação de multi-tenant (account_id)
  - [x] Paginação
  - [x] Duplicação de boards
- [x] `app/services/list_service.py`
  - [x] Validação de multi-tenant
  - [x] Reordenação de listas

### 5.4 Endpoints
- [x] `app/api/v1/endpoints/boards.py`
  - [x] `GET /boards` - Listar quadros (com paginação)
  - [x] `GET /boards/{id}` - Buscar quadro
  - [x] `POST /boards` - Criar quadro
  - [x] `PUT /boards/{id}` - Atualizar quadro
  - [x] `DELETE /boards/{id}` - Deletar quadro
  - [x] `POST /boards/{id}/duplicate` - Duplicar quadro
  - [x] `GET /boards/{id}/lists` - Listar listas do quadro
  - [x] `POST /boards/{id}/lists` - Criar lista
  - [x] `PUT /boards/{id}/lists/{list_id}` - Atualizar lista
  - [x] `DELETE /boards/{id}/lists/{list_id}` - Deletar lista
  - [x] `PUT /boards/{id}/lists/{list_id}/move` - Reordenar lista

---

## ✅ FASE 6: Módulo de Cards (CONCLUÍDA)

### 6.1 Schemas
- [x] `app/schemas/card.py` - CardCreate, CardUpdate, CardResponse, CardListResponse, CardMoveRequest, CardAssignRequest
- [x] `app/schemas/field.py` - FieldDefinitionCreate, FieldDefinitionUpdate, FieldDefinitionResponse, CardFieldValueCreate, CardFieldValueResponse

### 6.2 Repositories
- [x] `app/repositories/card_repository.py`
  - [x] `find_by_id()`, `list_by_list()`, `list_by_board()`, `count_by_board()`
  - [x] `get_max_position()`, `create()`, `update()`, `delete()`
  - [x] `move_to_list()`, `assign_to_user()`
- [x] `app/repositories/field_repository.py`
  - [x] Definições de campos: `find_definition_by_id()`, `list_definitions_by_board()`, `create_definition()`, `update_definition()`, `delete_definition()`
  - [x] Valores de campos: `find_value_by_id()`, `find_value_by_card_and_field()`, `list_values_by_card()`, `create_or_update_value()`, `delete_value()`

### 6.3 Services
- [x] `app/services/card_service.py`
  - [x] CRUD de cartões com validação multi-tenant
  - [x] Gerenciar campos customizados
  - [x] Mover cartão entre listas
  - [x] Atribuir responsável
  - [x] Filtros avançados (assigned_to, is_won, is_lost)
  - [x] Paginação

### 6.4 Endpoints
- [x] `app/api/v1/endpoints/cards.py`
  - [x] `GET /cards` - Listar cartões (com filtros: board_id, assigned_to_id, is_won, is_lost, paginação)
  - [x] `GET /cards/{id}` - Buscar cartão
  - [x] `POST /cards` - Criar cartão
  - [x] `PUT /cards/{id}` - Atualizar cartão
  - [x] `DELETE /cards/{id}` - Deletar cartão
  - [x] `PUT /cards/{id}/move` - Mover cartão entre listas
  - [x] `PUT /cards/{id}/assign` - Atribuir responsável
  - [x] `GET /cards/{id}/fields` - Listar campos customizados do card
  - [x] `POST /cards/{id}/fields` - Adicionar/atualizar campo customizado
  - [ ] `GET /cards/{id}/activity` - Timeline do cartão (TODO - FASE 9)

---

## ✅ FASE 7: Módulo de Gamificação (CONCLUÍDA)

### 7.1 Schemas
- [x] `app/schemas/gamification.py` - Point, Badge, Ranking

### 7.2 Repositories
- [x] `app/repositories/gamification_repository.py`

### 7.3 Services
- [x] `app/services/gamification_service.py`
  - [x] Atribuir pontos por ações
  - [x] Calcular rankings
  - [x] Verificar badges automáticas
  - [x] Conceder badges
  - [x] Reset de rankings periódicos

### 7.4 Endpoints
- [x] `app/api/v1/endpoints/gamification.py`
  - [x] `GET /gamification/me` - Meus pontos e badges
  - [x] `GET /gamification/users/{user_id}` - Resumo de gamificação de um usuário
  - [x] `POST /gamification/points` - Atribuir pontos
  - [x] `GET /gamification/badges` - Listar badges
  - [x] `POST /gamification/badges` - Criar badge (Admin)
  - [x] `POST /gamification/badges/{id}/award` - Atribuir badge manual
  - [x] `GET /gamification/badges/me` - Meus badges
  - [x] `GET /gamification/badges/users/{user_id}` - Badges de um usuário
  - [x] `GET /gamification/rankings` - Rankings (semanal/mensal/trimestral/anual)
  - [x] `POST /gamification/rankings/calculate` - Recalcular rankings

---

## ✅ FASE 8: Módulo de Automações (CONCLUÍDA)

### 8.1 Schemas
- [x] `app/schemas/automation.py` - Automação (trigger e scheduled)

### 8.2 Repositories
- [x] `app/repositories/automation_repository.py`

### 8.3 Services
- [x] `app/services/automation_service.py`
  - [x] Criar automação (trigger ou scheduled)
  - [x] Executar automação
  - [x] Validar limite de 50 automações
  - [x] Processar triggers (card_moved, card_created, etc)
  - [x] Calcular próxima execução (scheduled)

### 8.4 Endpoints
- [x] `app/api/v1/endpoints/automations.py`
  - [x] `GET /automations` - Listar automações
  - [x] `GET /automations/{id}` - Buscar automação
  - [x] `POST /automations` - Criar automação
  - [x] `PUT /automations/{id}` - Atualizar automação
  - [x] `DELETE /automations/{id}` - Deletar automação
  - [x] `POST /automations/{id}/trigger` - Executar automação manualmente
  - [x] `GET /automations/{id}/executions` - Histórico de execuções

---

## ✅ FASE 9: Módulo de Transferências (CONCLUÍDA)

### 9.1 Schemas
- [x] `app/schemas/transfer.py` - Transfer, TransferApproval

### 9.2 Repositories
- [x] `app/repositories/transfer_repository.py`

### 9.3 Services
- [x] `app/services/transfer_service.py`
  - [x] Transferir cartão
  - [x] Transferir em lote (até 50)
  - [x] Validar limite de transferências
  - [x] Fluxo de aprovação (se habilitado)

### 9.4 Endpoints
- [x] `app/api/v1/endpoints/transfers.py`
  - [x] `POST /transfers` - Criar transferência
  - [x] `POST /transfers/batch` - Transferência em lote
  - [x] `GET /transfers/sent` - Listar transferências enviadas
  - [x] `GET /transfers/received` - Listar transferências recebidas
  - [x] `GET /transfers/approvals/pending` - Aprovações pendentes
  - [x] `POST /transfers/approvals/{id}/decide` - Decidir aprovação
  - [x] `GET /transfers/statistics` - Estatísticas de transferências

---

## 📊 FASE 10: Módulo de Relatórios

### 10.1 Service
- [ ] `app/services/report_service.py`
  - [ ] Dashboard KPIs
  - [ ] Relatório de vendas
  - [ ] Relatório de conversão
  - [ ] Relatório de transferências
  - [ ] Exportar para CSV/Excel

### 10.2 Endpoints
- [ ] `app/api/v1/endpoints/reports.py`
  - [ ] `GET /reports/dashboard` - KPIs do dashboard
  - [ ] `GET /reports/sales` - Relatório de vendas
  - [ ] `GET /reports/conversion` - Taxa de conversão
  - [ ] `GET /reports/transfers` - Relatório de transferências
  - [ ] `POST /reports/export` - Exportar relatório

---

## 🔔 FASE 11: Módulo de Notificações

### 11.1 Schemas
- [ ] `app/schemas/notification.py`

### 11.2 Services
- [ ] `app/services/notification_service.py`
  - [ ] Criar notificação in-app
  - [ ] Enviar email (opcional)
  - [ ] Marcar como lida
  - [ ] Notificações de automações falhas

### 11.3 Endpoints
- [ ] `app/api/v1/endpoints/notifications.py`
  - [ ] `GET /notifications` - Listar notificações
  - [ ] `PUT /notifications/{id}/read` - Marcar como lida
  - [ ] `PUT /notifications/read-all` - Marcar todas como lidas

---

## 📧 FASE 12: Serviço de Email

### 12.1 Email Service
- [ ] `app/services/email_service.py`
  - [ ] Configurar SMTP Microsoft 365
  - [ ] Template de email de automação falha
  - [ ] Template de email agrupado (5+ falhas)
  - [ ] Template de reset de senha

---

## 👔 FASE 13: Módulo Admin

### 13.1 Endpoints
- [ ] `app/api/v1/endpoints/admin.py`
  - [ ] `GET /admin/users` - Gerenciar usuários
  - [ ] `POST /admin/users` - Criar usuário
  - [ ] `PUT /admin/users/{id}/reset-password` - Reset senha
  - [ ] `GET /admin/logs` - Visualizar logs de auditoria
  - [ ] `GET /admin/database` - Executar SELECT queries
  - [ ] `GET /admin/automations/monitor` - Monitorar automações

---

## ⚡ FASE 14: Workers e Jobs Assíncronos

### 14.1 Configurar Celery
- [ ] `app/workers/celery_app.py` - Configuração do Celery
- [ ] Configurar Redis como broker

### 14.2 Tasks do Celery
- [ ] `app/tasks/automation_tasks.py`
  - [ ] Task: executar automação
  - [ ] Retry com backoff exponencial
- [ ] `app/tasks/notification_tasks.py`
  - [ ] Task: enviar notificação
  - [ ] Task: enviar email
- [ ] `app/tasks/report_tasks.py`
  - [ ] Task: gerar relatório pesado

### 14.3 Configurar APScheduler
- [ ] `app/workers/scheduled_tasks.py`
  - [ ] Job: atualizar rankings (a cada 5 min)
  - [ ] Job: verificar badges automáticas (a cada 5 min)
  - [ ] Job: reset ranking semanal (domingo 00:00)
  - [ ] Job: reset ranking mensal (dia 1 00:00)
  - [ ] Job: reset ranking trimestral
  - [ ] Job: reset ranking anual (01/01 00:00)
  - [ ] Job: notificações de cartões vencidos (diário 08:00)
  - [ ] Job: limpar logs antigos (diário 03:00)
  - [ ] Job: processar automações agendadas (a cada 1 min)

### 14.4 Inicialização
- [ ] Integrar scheduler no `app/main.py` (lifespan event)
- [ ] Decorator para monitoramento de jobs

---

## 🧪 FASE 15: Testes

### 15.1 Testes Unitários
- [ ] `tests/unit/test_auth.py`
- [ ] `tests/unit/test_users.py`
- [ ] `tests/unit/test_cards.py`
- [ ] `tests/unit/test_gamification.py`
- [ ] `tests/unit/test_automations.py`

### 15.2 Testes de Integração
- [ ] `tests/integration/test_api_auth.py`
- [ ] `tests/integration/test_api_cards.py`
- [ ] `tests/integration/test_automations_flow.py`

### 15.3 Configuração de Testes
- [ ] `tests/conftest.py` - Fixtures
- [ ] Database de teste (SQLite ou PostgreSQL test)
- [ ] Mock de Celery para testes

---

## 🚀 FASE 16: Scripts Utilitários

### 16.1 Scripts
- [ ] `scripts/seed_database.py` - Popular banco com dados de exemplo
- [ ] `scripts/import_pipedrive.py` - Importar dados do Pipedrive
- [ ] `scripts/clean_logs.py` - Limpar logs antigos
- [ ] `scripts/backup_database.py` - Backup do banco

---

## 📦 FASE 17: Deploy e Produção

### 17.1 Docker
- [ ] `Dockerfile` otimizado (multi-stage)
- [ ] `docker-compose.yml` completo (API + PostgreSQL + Redis + Celery)
- [ ] `.dockerignore`

### 17.2 Configuração de Produção
- [ ] `app/core/config.py` - Environment específico
- [ ] Variáveis de ambiente de produção
- [ ] Health check endpoint (`GET /health`)

### 17.3 CI/CD (Opcional)
- [ ] GitHub Actions para testes
- [ ] Deploy automático para Hostinger

---

## 📚 FASE 18: Documentação

### 18.1 API Documentation
- [ ] Swagger/OpenAPI (já gerado automaticamente pelo FastAPI)
- [ ] Adicionar descrições detalhadas nos endpoints
- [ ] Adicionar exemplos de request/response

### 18.2 README
- [ ] README.md do backend
- [ ] Como rodar localmente
- [ ] Como rodar testes
- [ ] Como fazer deploy

---

## 🎯 Checklist Final

- [ ] Todas as rotas retornam JSON correto
- [ ] Todas as rotas têm validação Pydantic
- [ ] Todas as rotas têm autenticação (quando necessário)
- [ ] Todas as rotas têm autorização (RBAC)
- [ ] Logs estruturados em todos os endpoints críticos
- [ ] Tratamento de erros consistente
- [ ] Queries otimizadas (usar EXPLAIN ANALYZE)
- [ ] Migrations revisadas
- [ ] Cobertura de testes > 80%
- [ ] Documentação da API completa
- [ ] Docker funcional

---

**Status**: 🟡 Em Desenvolvimento
**Última atualização**: 05/01/2026
