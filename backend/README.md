# HSGrowth CRM - Backend API

Backend completo do sistema HSGrowth CRM desenvolvido com FastAPI, oferecendo uma API REST robusta para gerenciamento de vendas, gamificação, automações e transferências.

## 📋 Sobre o Projeto

HSGrowth CRM é um sistema completo de Customer Relationship Management (CRM) focado em vendas, com recursos avançados de gamificação, automações e gestão de transferências entre vendedores.

### Status de Implementação

**Progresso Geral:** 17 de 18 fases concluídas (94%)

#### ✅ Módulos Implementados

- **Autenticação e Autorização** - Sistema completo de login, registro, refresh token e recuperação de senha
- **Gestão de Usuários** - CRUD completo com paginação e multi-tenant
- **Boards e Listas** - Quadros Kanban com listas customizáveis e reordenação
- **Cards** - Cartões com campos customizados, valores monetários e datas
- **Gamificação** - Sistema de pontos, badges e rankings periódicos
- **Automações** - Automações trigger e scheduled com histórico de execuções
- **Transferências** - Transferência de cards entre vendedores com fluxo de aprovação
- **Relatórios e Dashboard** - KPIs, relatórios de vendas, conversão e transferências
- **Notificações In-App** - Sistema completo de notificações para usuários
- **Serviço de Email** - Envio de emails via SMTP Microsoft 365 com templates HTML
- **Módulo Admin** - Endpoints administrativos para gestão do sistema
- **Workers Assíncronos** - Celery para tasks assíncronas e APScheduler para cron jobs
- **Testes Automatizados** - Suite completa de testes unitários e de integração
- **Scripts Utilitários** - Scripts para seed, backup, importação e manutenção
- **Deploy e Produção** - Docker, docker-compose, multi-stage builds e scripts de inicialização

#### 🚧 Em Desenvolvimento

- Documentação Final (Swagger/OpenAPI)

## 🚀 Tecnologias

- **FastAPI** 0.109.0 - Framework web moderno e de alta performance
- **SQLAlchemy** 2.0.25 - ORM para Python
- **Alembic** 1.13.1 - Migrations de banco de dados
- **PostgreSQL** - Banco de dados relacional
- **Pydantic** 2.5.3 - Validação de dados
- **Python-Jose** - JWT tokens
- **Passlib** - Hash de senhas com bcrypt
- **Celery** - Processamento assíncrono de tarefas
- **Redis** - Broker para Celery e cache
- **APScheduler** - Agendador de tarefas periódicas (cron jobs)
- **Loguru** - Sistema de logging

## 📁 Estrutura do Projeto

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/     # Endpoints da API
│   │       │   ├── auth.py
│   │       │   ├── users.py
│   │       │   ├── boards.py
│   │       │   ├── cards.py
│   │       │   ├── gamification.py
│   │       │   ├── automations.py
│   │       │   └── transfers.py
│   │       └── __init__.py
│   ├── core/                  # Configurações principais
│   │   ├── config.py
│   │   ├── security.py
│   │   └── logging.py
│   ├── db/                    # Database setup
│   │   ├── base.py
│   │   └── session.py
│   ├── models/                # Modelos SQLAlchemy
│   ├── schemas/               # Schemas Pydantic
│   ├── repositories/          # Camada de acesso a dados
│   ├── services/              # Lógica de negócio
│   ├── middleware/            # Middlewares
│   ├── workers/               # Celery e APScheduler
│   │   ├── celery_app.py
│   │   ├── tasks.py
│   │   └── scheduler.py
│   └── main.py               # Entry point
├── alembic/                   # Migrations
├── tests/                     # Testes (a implementar)
├── scripts/                   # Scripts utilitários
│   └── seed_database.py
├── logs/                      # Arquivos de log
├── .env                       # Variáveis de ambiente
├── requirements.txt
└── README.md
```

## 📝 Correções Recentes (06/01/2026)

Foram realizadas várias correções na infraestrutura Docker e na suite de testes:

### Correções de Infraestrutura

1. **LOG_LEVEL Case Sensitivity** - Resolvido conflito entre Loguru (uppercase) e Uvicorn (lowercase)
   - Adicionada variável `UVICORN_LOG_LEVEL=info` no docker-compose.yml
   - Modificado `scripts/start.sh` para usar a variável correta

2. **Incompatibilidade bcrypt/passlib** - Fixada versão do bcrypt para evitar erros
   - Adicionado `bcrypt==4.0.1` no requirements.txt (compatível com passlib 1.7.4)
   - Resolvido erro: `ValueError: password cannot be longer than 72 bytes`

3. **Health Check do PostgreSQL** - Corrigido erro "database does not exist"
   - Adicionado parâmetro `-d ${DB_NAME}` ao pg_isready no docker-compose.yml
   - PostgreSQL agora verifica conexão ao banco correto (hsgrowth_crm)

4. **Imports Incorretos** - Corrigidos múltiplos imports de módulo inexistente
   - `app.core.database` → `app.db.session` e `app.db.base`
   - Arquivos corrigidos: tasks.py, scheduler.py, conftest.py

5. **Ferramentas CLI no Docker** - Adicionadas ao Dockerfile
   - postgresql-client (para pg_isready)
   - redis-tools (para redis-cli)

### Correções nos Testes

1. **Fixtures de Usuários** - Corrigida sintaxe no conftest.py
   - Criada fixture `test_roles` para criar roles no banco
   - Corrigido: `password` → `password_hash`
   - Corrigido: `role` (string) → `role_id` (FK)

2. **Testes de Usuários** - Corrigidos em test_users.py
   - 3 instâncias de User criadas incorretamente
   - Adicionado parâmetro `test_roles` nas funções de teste

### Status Atual dos Containers

- ✅ **PostgreSQL**: Healthy (sem erros)
- ✅ **Redis**: Healthy
- ✅ **API**: Healthy (rodando com Uvicorn)
- ⚠️  **Celery Workers**: Unhealthy (não afeta testes, correção futura)

## 🔧 Instalação e Deploy

### Opção 1: Deploy com Docker (Recomendado)

A maneira mais rápida e fácil de rodar o sistema completo em produção.

#### Pré-requisitos

- Docker 20.10 ou superior
- Docker Compose 2.0 ou superior

#### Passo a Passo

1. **Clone o repositório**

```bash
git clone https://github.com/seu-usuario/hsgrowth-sistema.git
cd hsgrowth-sistema/backend
```

2. **Configure as variáveis de ambiente**

Copie o arquivo de exemplo e edite com suas configurações:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure as variáveis OBRIGATÓRIAS:

```env
# OBRIGATÓRIO: Gere uma chave secreta forte
# Exemplo: python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_SECRET=sua-chave-secreta-super-segura-aqui

# OBRIGATÓRIO: Defina senhas fortes
DB_PASSWORD=senha-forte-do-postgres
REDIS_PASSWORD=senha-forte-do-redis

# OBRIGATÓRIO: Configuração de email (Microsoft 365)
SMTP_USER=seu_email@empresa.com
SMTP_PASSWORD=sua_senha_do_email
SMTP_FROM=seu_email@empresa.com

# OPCIONAL: URL do frontend para CORS
FRONTEND_URL=http://seu-dominio.com
CORS_ORIGINS=["http://seu-dominio.com","http://localhost:5173"]
```

3. **Inicie os containers**

```bash
# Modo produção (padrão)
docker-compose up -d

# Para desenvolvimento com logs visíveis
docker-compose up
```

Isso iniciará automaticamente:
- **PostgreSQL** (porta 5432) - Banco de dados
- **Redis** (porta 6379) - Cache e message broker
- **API** (porta 8000) - Servidor FastAPI
- **Celery Worker** - Processamento assíncrono
- **Celery Beat** - Agendador de tarefas

4. **Verifique se os serviços estão rodando**

```bash
docker-compose ps
```

Todos devem estar com status "healthy".

5. **Acesse a API**

A API estará disponível em `http://localhost:8000`

- **Swagger UI:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

6. **Popule o banco com dados iniciais (opcional)**

```bash
docker-compose exec api python scripts/seed_database.py
```

Credenciais criadas:
- Admin: `admin@demo.com` / `admin123`
- Manager: `carlos@demo.com` / `manager123`

#### Comandos Úteis do Docker

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f api
docker-compose logs -f celery-worker

# Parar todos os containers
docker-compose down

# Parar e remover volumes (CUIDADO: apaga o banco!)
docker-compose down -v

# Recriar containers após mudanças
docker-compose up -d --build

# Executar comandos dentro do container
docker-compose exec api bash
docker-compose exec api python scripts/create_admin.py

# Ver status dos containers
docker-compose ps

# Reiniciar um serviço específico
docker-compose restart api
```

#### Estrutura de Serviços Docker

O `docker-compose.yml` define 5 serviços:

1. **postgres** - PostgreSQL 15 Alpine
   - Volume persistente para dados
   - Health check configurado
   - Porta: 5432

2. **redis** - Redis 7 Alpine
   - Volume persistente para dados
   - Autenticação com senha
   - Porta: 6379

3. **api** - FastAPI Application
   - Build multi-stage otimizado
   - Múltiplos workers em produção
   - Auto-reload em desenvolvimento
   - Health check em `/health`
   - Porta: 8000

4. **celery-worker** - Worker Assíncrono
   - Processa tasks em background
   - 4 workers concorrentes (configurável)
   - Conectado ao Redis e PostgreSQL

5. **celery-beat** - Agendador de Tarefas
   - Executa cron jobs periódicos
   - 9 jobs configurados (rankings, backups, etc)

#### Volumes Persistentes

Os dados são persistidos mesmo após parar os containers:

- `postgres_data` - Dados do PostgreSQL
- `redis_data` - Dados do Redis
- `./logs` - Logs da aplicação (montado como volume)
- `./backups` - Backups do banco (montado como volume)

#### Multi-Stage Build

O Dockerfile utiliza multi-stage build para otimização:

**Stage 1 (builder):**
- Instala todas as dependências em um virtual environment
- Compila pacotes Python

**Stage 2 (runtime):**
- Imagem mínima com apenas runtime
- Copia virtual environment do builder
- Usuário non-root (appuser) para segurança
- Health check configurado
- Tamanho final: ~350MB

### Opção 2: Instalação Manual (Desenvolvimento)

Para desenvolvimento local sem Docker.

#### Pré-requisitos

- Python 3.11 ou superior
- PostgreSQL 14 ou superior
- Redis 7 ou superior
- pip (gerenciador de pacotes Python)

#### Passo a Passo

1. **Clone o repositório**

```bash
git clone https://github.com/seu-usuario/hsgrowth-sistema.git
cd hsgrowth-sistema/backend
```

2. **Instale as dependências**

```bash
pip install -r requirements.txt
```

3. **Instale e inicie PostgreSQL e Redis**

**PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# macOS
brew install postgresql
brew services start postgresql

# Criar banco de dados
psql -U postgres
CREATE DATABASE hsgrowth_crm;
CREATE USER hsgrowth WITH PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE hsgrowth_crm TO hsgrowth;
\q
```

**Redis:**
```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis
```

4. **Configure as variáveis de ambiente**

Copie e edite o arquivo `.env`:

```bash
cp .env.example .env
```

Configure no mínimo:

```env
# Database
DATABASE_URL=postgresql://hsgrowth:sua_senha@localhost:5432/hsgrowth_crm

# JWT (OBRIGATÓRIO: gere uma chave forte)
JWT_SECRET=sua-chave-secreta-super-segura
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # deixe vazio se não configurou senha

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email (Microsoft 365)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=seu_email@empresa.com
SMTP_PASSWORD=sua_senha
SMTP_FROM=seu_email@empresa.com

# Application
PROJECT_NAME="HSGrowth CRM API"
VERSION=1.0.0
DEBUG=True
ENVIRONMENT=development

# CORS
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

5. **Execute as migrations**

```bash
alembic upgrade head
```

6. **Popule o banco com dados iniciais (opcional)**

```bash
python scripts/seed_database.py
```

Isso criará:
- Conta padrão: Demo HSGrowth
- Admin: `admin@demo.com` / `admin123`
- Manager: `carlos@demo.com` / `manager123`
- Vendedores: `ana@demo.com`, `bruno@demo.com`, `carla@demo.com` / `sales123`

7. **Inicie os serviços**

Você precisará de 3 terminais:

**Terminal 1 - API:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Celery Worker:**
```bash
celery -A app.workers.celery_app worker --loglevel=info --concurrency=4
```

**Terminal 3 - Celery Beat (Agendador):**
```bash
celery -A app.workers.celery_app beat --loglevel=info
```

A API estará disponível em `http://localhost:8000`

**Dica:** Para facilitar o desenvolvimento, você pode usar o Docker apenas para PostgreSQL e Redis, e rodar a API localmente:

```bash
# Apenas banco de dados
docker-compose up -d postgres redis

# API local
uvicorn app.main:app --reload
```

## 📚 Documentação da API

Após iniciar o servidor, acesse:

- **Swagger UI (interativo):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

## 🧪 Testes

O projeto possui uma suite completa de testes automatizados com pytest.

### Estrutura de Testes

```
tests/
├── conftest.py              # Fixtures compartilhadas
├── unit/                    # Testes unitários
│   ├── test_auth.py        # 50+ testes de autenticação
│   ├── test_users.py       # 30+ testes de usuários
│   ├── test_cards.py       # 35+ testes de cards
│   └── test_gamification.py # 25+ testes de gamificação
└── integration/             # Testes de integração
    └── test_api_flows.py   # Fluxos completos end-to-end
```

### Rodando os Testes

**Rodar todos os testes:**
```bash
pytest
```

**Rodar apenas testes unitários:**
```bash
pytest tests/unit/
```

**Rodar apenas testes de integração:**
```bash
pytest tests/integration/
```

**Rodar testes de um módulo específico:**
```bash
pytest tests/unit/test_auth.py
```

**Rodar com cobertura de código:**
```bash
pytest --cov=app --cov-report=html
```

**Rodar testes com markers:**
```bash
pytest -m auth          # Apenas testes de autenticação
pytest -m "not slow"    # Excluir testes lentos
```

### Cobertura de Testes

A suite de testes cobre:
- ✅ Autenticação (login, registro, tokens, recuperação de senha)
- ✅ Gestão de usuários (CRUD, permissões, paginação)
- ✅ Cards (CRUD, movimentação, atribuição, campos customizados)
- ✅ Gamificação (pontos, badges, rankings)
- ✅ Fluxos completos (registro → vendas → relatórios)

**Total:** 140+ testes implementados

### Mocks e Fixtures

Os testes utilizam:
- **SQLite em memória** para banco de dados de teste
- **Mocks de Celery** para tasks assíncronas (execução síncrona)
- **Mocks de APScheduler** (desabilitado durante testes)
- **Mocks de SMTP** (emails não são enviados)
- **Fixtures reutilizáveis** para usuários, boards, cards, etc

## 🛠️ Scripts Utilitários

O projeto inclui scripts úteis para desenvolvimento e manutenção.

### Seed do Banco de Dados

Popula o banco com dados de exemplo completos (5 usuários, 1 board, 6 listas, 11 cards, 5 badges, etc):

```bash
python scripts/seed_database.py
```

**Credenciais criadas:**
- Admin: `admin@demo.com` / `admin123`
- Manager: `carlos@demo.com` / `manager123`
- Vendedores: `ana@demo.com`, `bruno@demo.com`, `carla@demo.com` / `sales123`

### Criar Administrador

Cria um novo usuário administrador interativamente:

```bash
python scripts/create_admin.py
```

Ou com argumentos:

```bash
python scripts/create_admin.py --email=admin@empresa.com --name="Admin" --account-id=1
```

### Importar do Pipedrive

Importa usuários e deals do Pipedrive via API:

```bash
python scripts/import_pipedrive.py --api-key=<sua_api_key> --account-id=1
```

### Backup do Banco de Dados

Faz backup completo do PostgreSQL usando pg_dump:

```bash
python scripts/backup_database.py
python scripts/backup_database.py --output-dir=backups/custom --compress
```

### Limpeza de Logs

Remove logs antigos baseado em dias de retenção:

```bash
python scripts/clean_logs.py --days=90
python scripts/clean_logs.py --days=30 --dry-run  # Testa sem deletar
```

## 🔐 Autenticação

A API utiliza JWT (JSON Web Tokens) para autenticação. Todas as rotas (exceto `/auth/login` e `/auth/register`) requerem autenticação.

### Obtendo um Token

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hsgrowth.com",
    "password": "admin123"
  }'
```

Resposta:
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 28800
}
```

### Usando o Token

```bash
curl -X GET "http://localhost:8000/api/v1/users/me" \
  -H "Authorization: Bearer eyJhbGc..."
```

## 📡 Principais Endpoints

### Autenticação
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Registro
- `POST /api/v1/auth/refresh` - Renovar token
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/forgot-password` - Recuperar senha
- `POST /api/v1/auth/reset-password` - Resetar senha

### Usuários
- `GET /api/v1/users` - Listar usuários (paginado)
- `GET /api/v1/users/me` - Dados do usuário autenticado
- `GET /api/v1/users/{id}` - Buscar usuário
- `POST /api/v1/users` - Criar usuário
- `PUT /api/v1/users/{id}` - Atualizar usuário
- `DELETE /api/v1/users/{id}` - Deletar usuário
- `POST /api/v1/users/me/change-password` - Alterar senha

### Boards
- `GET /api/v1/boards` - Listar boards
- `GET /api/v1/boards/{id}` - Buscar board
- `POST /api/v1/boards` - Criar board
- `PUT /api/v1/boards/{id}` - Atualizar board
- `DELETE /api/v1/boards/{id}` - Deletar board
- `POST /api/v1/boards/{id}/duplicate` - Duplicar board
- `GET /api/v1/boards/{id}/lists` - Listar listas do board
- `POST /api/v1/boards/{id}/lists` - Criar lista
- `PUT /api/v1/boards/{id}/lists/{list_id}` - Atualizar lista
- `PUT /api/v1/boards/{id}/lists/{list_id}/move` - Reordenar lista

### Cards
- `GET /api/v1/cards` - Listar cards (com filtros)
- `GET /api/v1/cards/{id}` - Buscar card
- `POST /api/v1/cards` - Criar card
- `PUT /api/v1/cards/{id}` - Atualizar card
- `DELETE /api/v1/cards/{id}` - Deletar card
- `PUT /api/v1/cards/{id}/move` - Mover card entre listas
- `PUT /api/v1/cards/{id}/assign` - Atribuir responsável
- `GET /api/v1/cards/{id}/fields` - Listar campos customizados
- `POST /api/v1/cards/{id}/fields` - Adicionar/atualizar campo

### Gamificação
- `GET /api/v1/gamification/me` - Resumo de gamificação
- `GET /api/v1/gamification/users/{id}` - Resumo de um usuário
- `POST /api/v1/gamification/points` - Atribuir pontos
- `GET /api/v1/gamification/badges` - Listar badges
- `POST /api/v1/gamification/badges` - Criar badge
- `POST /api/v1/gamification/badges/{id}/award` - Atribuir badge
- `GET /api/v1/gamification/badges/me` - Meus badges
- `GET /api/v1/gamification/rankings` - Rankings (semanal/mensal/trimestral/anual)
- `POST /api/v1/gamification/rankings/calculate` - Recalcular rankings

### Automações
- `GET /api/v1/automations` - Listar automações
- `GET /api/v1/automations/{id}` - Buscar automação
- `POST /api/v1/automations` - Criar automação
- `PUT /api/v1/automations/{id}` - Atualizar automação
- `DELETE /api/v1/automations/{id}` - Deletar automação
- `POST /api/v1/automations/{id}/trigger` - Executar manualmente
- `GET /api/v1/automations/{id}/executions` - Histórico de execuções

### Transferências
- `POST /api/v1/transfers` - Criar transferência
- `POST /api/v1/transfers/batch` - Transferência em lote (até 50)
- `GET /api/v1/transfers/sent` - Transferências enviadas
- `GET /api/v1/transfers/received` - Transferências recebidas
- `GET /api/v1/transfers/approvals/pending` - Aprovações pendentes
- `POST /api/v1/transfers/approvals/{id}/decide` - Decidir aprovação
- `GET /api/v1/transfers/statistics` - Estatísticas

### Relatórios
- `GET /api/v1/reports/dashboard` - Dashboard com KPIs principais
- `POST /api/v1/reports/sales` - Relatório de vendas por período
- `POST /api/v1/reports/conversion` - Relatório de conversão (funil)
- `POST /api/v1/reports/transfers` - Relatório de transferências
- `POST /api/v1/reports/export` - Exportar relatório (CSV/Excel/JSON)

### Notificações
- `GET /api/v1/notifications` - Listar notificações (paginado, com filtro unread_only)
- `GET /api/v1/notifications/stats` - Estatísticas de notificações
- `GET /api/v1/notifications/{id}` - Buscar notificação
- `POST /api/v1/notifications` - Criar notificação
- `POST /api/v1/notifications/bulk` - Criar em lote
- `PUT /api/v1/notifications/{id}/read` - Marcar como lida
- `PUT /api/v1/notifications/read-all` - Marcar todas como lidas
- `DELETE /api/v1/notifications/{id}` - Deletar notificação

### Admin (Requer Role: admin)
- `GET /api/v1/admin/users` - Listar todos os usuários (paginado, com filtros)
- `POST /api/v1/admin/users` - Criar usuário
- `PUT /api/v1/admin/users/{id}/reset-password` - Resetar senha de usuário
- `GET /api/v1/admin/logs` - Visualizar logs de auditoria (paginado, com filtros)
- `POST /api/v1/admin/database/query` - Executar query SQL (apenas SELECT)
- `GET /api/v1/admin/automations/monitor` - Monitorar automações (métricas e estatísticas)
- `GET /api/v1/admin/stats` - Estatísticas gerais do sistema

## 🎯 Recursos Principais

### Multi-Tenancy
O sistema suporta múltiplas contas (tenants) isoladas. Cada conta possui seus próprios usuários, boards, cards, etc.

### Gamificação
Sistema completo de pontos e badges:
- Pontos automáticos por ações (card criado, ganho, etc.)
- Badges customizáveis com atribuição automática ou manual
- Rankings periódicos (semanal, mensal, trimestral, anual)

### Automações
Dois tipos de automações:

**Trigger:** Executadas quando eventos ocorrem
- card_created, card_moved, card_won, etc.
- Condições customizáveis
- Ações: mover card, atribuir, notificar, etc.

**Scheduled:** Executadas em horários específicos
- Execução única ou recorrente (daily, weekly, monthly, annual)
- Limite de 50 automações por conta

### Transferências
Transferência de cards entre vendedores:
- Transferências únicas ou em lote (até 50 cards)
- Fluxo de aprovação opcional
- Aprovações com prazo de expiração (72h)
- Estatísticas e relatórios

### Workers Assíncronos
Sistema de processamento assíncrono e tarefas agendadas:

**Celery Tasks (Processamento Assíncrono):**
- `execute_automation_task` - Executa automações assincronamente
- `send_notification_task` - Envia notificações para múltiplos usuários
- `send_email_task` - Envia emails com retry automático
- `generate_report_task` - Gera relatórios pesados em background
- `cleanup_old_data_task` - Limpa dados antigos do sistema

**APScheduler Cron Jobs (Tarefas Agendadas):**
- **A cada 1 minuto:** Verificar e executar automações agendadas
- **Diariamente 00:00:** Atualizar ranking de vendedores
- **Diariamente 01:00:** Verificar e conceder badges automáticas
- **Diariamente 08:00:** Notificar sobre cards vencidos
- **Diariamente 09:00:** Enviar relatório de automações falhadas
- **Diariamente 10:00:** Verificar transferências pendentes expiradas
- **Diariamente 23:00:** Atualizar estatísticas de gamificação
- **Semanalmente (Domingo 03:00):** Limpar notificações antigas
- **Semanalmente (Domingo 04:00):** Backup de logs de auditoria

## 🏗️ Arquitetura

O projeto segue uma arquitetura em camadas:

1. **API Layer** (`app/api/`) - Endpoints FastAPI
2. **Service Layer** (`app/services/`) - Lógica de negócio
3. **Repository Layer** (`app/repositories/`) - Acesso a dados
4. **Model Layer** (`app/models/`) - Modelos SQLAlchemy
5. **Schema Layer** (`app/schemas/`) - Validação Pydantic

### Padrões Utilizados

- **Repository Pattern** - Isolamento de acesso a dados
- **Service Pattern** - Lógica de negócio centralizada
- **Dependency Injection** - Gerenciamento de dependências
- **Schema Validation** - Validação forte de tipos com Pydantic
- **Multi-Tenant** - Isolamento de dados por conta

## 🔒 Segurança

- **Hash de Senhas:** bcrypt
- **JWT Tokens:** Access token (8h) + Refresh token (7 dias)
- **CORS:** Configurável via ambiente
- **Validação de Dados:** Pydantic em todos os endpoints
- **Multi-Tenant Isolation:** Validação automática de account_id

## 📊 Banco de Dados

### Tabelas Principais

- `accounts` - Contas (multi-tenant)
- `users` - Usuários
- `roles` - Roles e permissões
- `boards` - Quadros Kanban
- `lists` - Listas dos boards
- `cards` - Cartões
- `field_definitions` - Definições de campos customizados
- `card_field_values` - Valores dos campos customizados
- `gamification_points` - Pontos de gamificação
- `gamification_badges` - Badges
- `user_badges` - Badges dos usuários
- `gamification_rankings` - Rankings periódicos
- `automations` - Automações
- `automation_executions` - Histórico de execuções
- `card_transfers` - Transferências
- `transfer_approvals` - Aprovações de transferências
- `activities` - Timeline de atividades
- `audit_logs` - Logs de auditoria
- `notifications` - Notificações

### Migrations

Todas as alterações no banco são gerenciadas via Alembic:

```bash
# Criar nova migration
alembic revision --autogenerate -m "descrição"

# Aplicar migrations
alembic upgrade head

# Reverter última migration
alembic downgrade -1

# Ver histórico
alembic history
```

## 🧪 Testes

```bash
# Executar todos os testes (a implementar)
pytest

# Com coverage
pytest --cov=app tests/

# Testes específicos
pytest tests/test_auth.py
```

## 📝 Exemplos de Uso

### Criar um Board

```python
import requests

# Login
response = requests.post("http://localhost:8000/api/v1/auth/login", json={
    "email": "admin@hsgrowth.com",
    "password": "admin123"
})
token = response.json()["access_token"]

# Criar board
headers = {"Authorization": f"Bearer {token}"}
response = requests.post(
    "http://localhost:8000/api/v1/boards",
    headers=headers,
    json={
        "name": "Pipeline de Vendas",
        "description": "Funil de vendas principal",
        "account_id": 1
    }
)
board = response.json()
print(f"Board criado: {board['id']}")
```

### Criar uma Automação

```python
# Automação: mover card automaticamente quando ganho
automation = {
    "name": "Mover para Ganhos",
    "description": "Move automaticamente cards ganhos",
    "board_id": 1,
    "automation_type": "trigger",
    "trigger_event": "card_won",
    "actions": [
        {
            "type": "move_card",
            "params": {"target_list_id": 5}
        },
        {
            "type": "award_points",
            "params": {"points": 20, "user_id": 2}
        }
    ]
}

response = requests.post(
    "http://localhost:8000/api/v1/automations",
    headers=headers,
    json=automation
)
```

## 🐛 Logging

Os logs são salvos em `logs/` com rotação diária:

- `logs/app_YYYY-MM-DD.log` - Logs gerais
- `logs/errors_YYYY-MM-DD.log` - Apenas erros

Configuração em `app/core/logging.py`

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- **Nomes de variáveis/funções/classes:** Inglês (sem acentos)
- **Comentários/docstrings:** Português (com acentos)
- **Formatter:** Black para Python
- **Imports:** Organizados e sem imports não utilizados

## 📄 Licença

Este projeto é propriedade da HSGrowth.

## 👥 Autores

- **Erick** - Desenvolvedor Principal - Cientista de Dados e Full Stack

## 📞 Suporte

Para questões e suporte, entre em contato através de:
- Email: suporte@hsgrowth.com
- Issues: https://github.com/seu-usuario/hsgrowth-sistema/issues

---

Desenvolvido com FastAPI e Python 🐍
