# 🚀 HSGrowth CRM - Backend API

Backend do sistema HSGrowth CRM desenvolvido com FastAPI + PostgreSQL (remoto em nuvem) + Redis (local).

## 📋 Sobre o Projeto

HSGrowth CRM é um sistema completo de Customer Relationship Management (CRM) focado em vendas, desenvolvido para uso interno da empresa. Possui recursos avançados de gamificação, automações e gestão de clientes e oportunidades.

---

## ⚡ Setup Rápido em Outro Computador

### Método 1: Script Automático (Recomendado)

```bash
cd backend
./setup.sh
```

O script faz tudo automaticamente em 1 comando!

### Método 2: Manual

```bash
cd backend
cp .env.example .env.local
# Editar .env.local com suas credenciais
docker-compose -f docker-compose.local.yml up -d
```

**Pronto!** API rodando em: http://localhost:8000

---

## 📦 O Que é Criado

**Apenas 2 containers:**
1. Redis (cache local) - Porta 6379
2. API FastAPI - Porta 8000

**PostgreSQL NÃO é criado** - conecta no banco remoto em nuvem.

---

### 🎯 Status do Projeto

**✅ Backend 100% Finalizado e Testado** (08/01/2026)

## 📊 Status dos Testes Automatizados

**Última atualização:** 08/01/2026

**Cobertura:** 78/78 testes passando (100%) ✅

| Módulo | Testes | Status |
|--------|--------|--------|
| Auth | 19 | ✅ 100% |
| Users | 19 | ✅ 100% |
| Cards | 18 | ✅ 100% |
| Gamification | 16 | ✅ 100% |
| Integration | 6 | ✅ 100% |
| **TOTAL** | **78** | **✅ 100%** |

**Progresso:**
- 07/01/2026: 62/78 (79.5%)
- 08/01/2026: 78/78 (100%) - **+20.5%** 🚀

**Documentação Completa:**
- Ver `../Documentação/HISTORICO-DESENVOLVIMENTO.md` para histórico completo do desenvolvimento

## ✨ Funcionalidades Principais

### 🔐 Autenticação e Autorização
- Sistema completo de JWT com access e refresh tokens
- Recuperação de senha via email
- Sistema de permissões baseado em roles (Admin, Manager, Salesperson)
- Multi-tenancy (isolamento por conta/empresa)

### 👥 Gestão de Usuários
- CRUD completo de usuários
- Perfis com avatar, telefone e informações adicionais
- Paginação e filtros avançados
- Soft delete para histórico

### 👤 Gestão de Clientes
- Cadastro completo de clientes (pessoas físicas e jurídicas)
- Dados: nome, email, telefone, empresa, CPF/CNPJ, endereço
- Vinculação de clientes aos cards/oportunidades
- Preparado para importação do Pipedrive

### 👥 Gestão de Pessoas (Contatos)
- Cadastro completo de pessoas de contato
- Múltiplos emails (comercial, pessoal, alternativo)
- Múltiplos telefones (comercial, WhatsApp, alternativo)
- Informações profissionais (cargo, organização)
- Redes sociais (LinkedIn, Instagram, Facebook)
- Vinculação de pessoas aos cards/oportunidades
- Validação robusta de emails (trata casos especiais)
- Busca avançada por nome, email, telefone, cargo
- **Migração completa de contact_info (JSON) para tabela relacional** (29/01/2026)

### 📊 Boards e Listas (Kanban)
- Quadros personalizados por equipe
- Listas customizáveis com reordenação
- Marcação de listas de ganho/perda
- Suporte a múltiplos boards por conta

### 📇 Cards (Oportunidades)
- Cards com título, descrição, valor monetário
- Vinculação a clientes (tabela separada)
- Campos customizados por board
- Status de ganho/perda automático baseado na lista
- Datas de vencimento e fechamento
- Atribuição a vendedores

### 🎮 Gamificação
- Sistema de pontos por ações (card ganho, criado, movido)
- Badges automáticas e manuais
- Rankings periódicos (semanal, mensal, trimestral, anual)
- Estatísticas de desempenho

### ⚡ Automações
- Automações trigger (ao mover card, criar, etc)
- Automações agendadas (cron)
- Ações: mover card, atribuir usuário, enviar email, webhook
- Histórico de execuções

### 🔄 Transferências de Cards
- Transferência de cards entre vendedores
- Fluxo de aprovação opcional
- Limite de transferências por mês
- Histórico completo

### 📈 Relatórios e Dashboard
- KPIs: taxa de conversão, valor total, cards por status
- Relatórios de vendas por período
- Relatórios de transferências
- Performance por vendedor

### 🔔 Notificações
- Notificações in-app em tempo real
- Notificações por email
- Tipos: menções, transferências, cards vencidos, badges ganhas

### 📧 Sistema de Email
- Integração com Microsoft 365 (SMTP)
- Templates HTML responsivos
- Envio assíncrono via Celery
- Retry automático em caso de falha

## 🚀 Tecnologias

### Core
- **FastAPI** 0.109.0 - Framework web moderno e de alta performance
- **Python** 3.11+ - Linguagem de programação
- **SQLAlchemy** 2.0.25 - ORM para Python
- **Alembic** 1.13.1 - Migrations de banco de dados
- **Pydantic** 2.5.3 - Validação de dados

### Banco de Dados
- **PostgreSQL** 17.7 - Banco de dados relacional

### Segurança
- **Python-Jose** - JWT tokens
- **Passlib** + **Bcrypt** - Hash de senhas

### Workers e Jobs
- **Celery** - Processamento assíncrono de tarefas
- **Redis** - Broker para Celery e cache
- **APScheduler** - Agendador de tarefas periódicas (cron jobs)

### Qualidade e Testes
- **Pytest** - Framework de testes
- **Faker** - Geração de dados fictícios
- **Coverage** - Cobertura de testes

### Infraestrutura
- **Docker** + **Docker Compose** - Containerização
- **Uvicorn** - Servidor ASGI
- **Loguru** - Sistema de logging

## 📁 Estrutura do Projeto

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/          # Endpoints da API
│   │       │   ├── auth.py         # Autenticação e autorização
│   │       │   ├── users.py        # Gestão de usuários
│   │       │   ├── boards.py       # Boards e listas
│   │       │   ├── cards.py        # Cards/Oportunidades
│   │       │   ├── gamification.py # Sistema de gamificação
│   │       │   ├── automations.py  # Automações
│   │       │   ├── transfers.py    # Transferências
│   │       │   ├── notifications.py # Notificações
│   │       │   └── reports.py      # Relatórios
│   │       └── __init__.py
│   ├── core/                       # Configurações principais
│   │   ├── config.py               # Settings do projeto
│   │   ├── security.py             # JWT, hash de senhas
│   │   └── logging.py              # Configuração de logs
│   ├── db/                         # Database setup
│   │   ├── base.py                 # Base declarativa
│   │   └── session.py              # Sessão do banco
│   ├── models/                     # Modelos SQLAlchemy
│   │   ├── account.py              # Contas (multi-tenancy)
│   │   ├── role.py                 # Perfis de usuário
│   │   ├── user.py                 # Usuários
│   │   ├── client.py               # Clientes
│   │   ├── board.py                # Boards
│   │   ├── list.py                 # Listas do Kanban
│   │   ├── card.py                 # Cards/Oportunidades
│   │   ├── field_definition.py     # Campos customizados
│   │   ├── gamification_*.py       # Modelos de gamificação
│   │   ├── automation.py           # Automações
│   │   ├── card_transfer.py        # Transferências
│   │   └── notification.py         # Notificações
│   ├── schemas/                    # Schemas Pydantic
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── client.py
│   │   ├── card.py
│   │   ├── gamification.py
│   │   └── ...
│   ├── services/                   # Lógica de negócio
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── card_service.py
│   │   ├── gamification_service.py
│   │   ├── automation_service.py
│   │   └── email_service.py
│   ├── repositories/               # Acesso a dados
│   │   ├── user_repository.py
│   │   ├── card_repository.py
│   │   ├── gamification_repository.py
│   │   └── ...
│   ├── workers/                    # Workers assíncronos
│   │   ├── celery_app.py           # Configuração Celery
│   │   ├── tasks.py                # Tasks assíncronas
│   │   └── scheduler.py            # Cron jobs (APScheduler)
│   └── main.py                     # Aplicação principal
├── alembic/                        # Migrations
│   ├── versions/                   # Arquivos de migração
│   └── env.py
├── tests/                          # Testes automatizados
│   ├── unit/                       # Testes unitários
│   │   ├── test_auth.py
│   │   ├── test_users.py
│   │   ├── test_cards.py
│   │   └── test_gamification.py
│   ├── integration/                # Testes de integração
│   └── conftest.py                 # Fixtures compartilhadas
├── scripts/                        # Scripts utilitários
│   └── seed_database.py            # Popular banco com dados fictícios
├── logs/                           # Arquivos de log
├── backups/                        # Backups do banco
├── Dockerfile                      # Imagem Docker
├── docker-compose.yml              # Orquestração de containers
├── requirements.txt                # Dependências Python
├── .env                            # Variáveis de ambiente
├── pytest.ini                      # Configuração do Pytest
└── README.md                       # Este arquivo
```

## 🗄️ Modelo de Dados

### Principais Entidades

**Account (Conta)**
- Sistema multi-tenant
- Cada empresa tem sua própria conta
- Dados isolados por `account_id`

**User (Usuário)**
- Perfis: Admin, Manager, Salesperson
- Vinculado a uma conta
- Autenticação via JWT

**Client (Cliente)**
- Pessoas físicas ou jurídicas
- Dados completos: nome, email, telefone, documento (CPF/CNPJ)
- Endereço completo
- Vinculação a cards
- Preparado para importação do Pipedrive

**Person (Pessoa/Contato)**
- Pessoas de contato dentro de organizações
- Múltiplos emails (comercial, pessoal, alternativo) - validação robusta
- Múltiplos telefones (comercial, WhatsApp, alternativo)
- Informações profissionais (cargo, organização)
- Redes sociais (LinkedIn, Instagram, Facebook)
- **Vinculado a cards** (person_id)
- Relacionamento com organização (Client)
- Status ativo/inativo
- Migrado de contact_info (JSON) para tabela relacional

**Board (Quadro)**
- Quadros Kanban por equipe
- Múltiplos boards por conta
- Ex: "Pipeline de Vendas", "Atendimento ao Cliente"

**List (Lista)**
- Listas dentro de um board
- Ordenação customizável
- Marcação de listas de ganho/perda

**Card (Cartão/Oportunidade)**
- Título, descrição, valor monetário
- **Vinculado a um cliente** (client_id)
- **Vinculado a uma pessoa de contato** (person_id) - NOVO 29/01/2026
- Atribuído a um vendedor
- Status: aberto, ganho, perdido
- Datas de vencimento e fechamento

**GamificationPoint (Pontos)**
- Registro de pontos ganhos por ações
- Histórico completo

**GamificationBadge (Badge)**
- Badges automáticas ou manuais
- Critérios configuráveis

**GamificationRanking (Ranking)**
- Rankings periódicos (semanal, mensal, etc)
- Posição e pontos por período

**Automation (Automação)**
- Trigger ou scheduled
- Ações: mover, atribuir, email, webhook

**CardTransfer (Transferência)**
- Transferência de cards entre vendedores
- Fluxo de aprovação opcional

## ⚙️ Configuração e Instalação

### Pré-requisitos

- Docker e Docker Compose instalados
- Python 3.11+ (para desenvolvimento local)

### Variáveis de Ambiente

Configure o arquivo `.env` na raiz do projeto backend:

```bash
# Application
ENVIRONMENT=development
DEBUG=True
HOST=0.0.0.0
PORT=8000

# Database (Banco Remoto)
DATABASE_URL=postgresql://administrador:administrador@62.72.11.28:3388/hsgrowth
DB_HOST=62.72.11.28
DB_PORT=3388
DB_USER=administrador
DB_PASSWORD=administrador
DB_NAME=hsgrowth

# JWT
JWT_SECRET=sua-chave-secreta-aqui
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_dev_2026

# Celery
CELERY_BROKER_URL=redis://:redis_dev_2026@redis:6379/0
CELERY_RESULT_BACKEND=redis://:redis_dev_2026@redis:6379/0

# Email (Microsoft 365)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=seu_email@empresa.com
SMTP_PASSWORD=sua_senha
SMTP_FROM=seu_email@empresa.com
SMTP_FROM_NAME=HSGrowth CRM

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

### Executando com Docker

```bash
# Subir todos os serviços (Redis e API)
docker-compose up -d

# Verificar logs
docker-compose logs -f api

# Aplicar migrations
docker-compose exec api alembic upgrade head

# Popular banco com dados fictícios
docker-compose exec api python scripts/seed_database.py

# Rodar testes
docker-compose exec api pytest tests/unit/ -v

# Parar serviços
docker-compose down
```

### Executando Localmente (Desenvolvimento)

```bash
# Instalar dependências
pip install -r requirements.txt

# Aplicar migrations
alembic upgrade head

# Rodar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Rodar testes
pytest tests/unit/ -v
```

## 📊 Dados de Teste

### Popular Banco de Dados

O script de seed cria dados realistas para desenvolvimento:

```bash
docker-compose exec api python scripts/seed_database.py
```

**O que é criado:**
- 3 contas (empresas)
- 24 usuários (8 por conta: 1 admin + 2 gerentes + 5 vendedores)
- 60-75 clientes por conta (70% empresas, 30% pessoas físicas)
- 6 boards (2 por conta)
- 30 listas (5 por board)
- ~250 cards (vinculados a clientes)
- Badges e sistema de gamificação
- Pontos e rankings

### Credenciais de Acesso

**Tech Solutions:**
- Admin: `admin@techsolutions.com` / `admin123`
- Manager: `manager1@techsolutions.com` / `manager123`
- Vendedor: `vendedor1@techsolutions.com` / `vendedor123`

**Marketing Pro:**
- Admin: `admin@marketingpro.com` / `admin123`
- Manager: `manager1@marketingpro.com` / `manager123`
- Vendedor: `vendedor1@marketingpro.com` / `vendedor123`

**Sales Masters:**
- Admin: `admin@salesmasters.com` / `admin123`
- Manager: `manager1@salesmasters.com` / `manager123`
- Vendedor: `vendedor1@salesmasters.com` / `vendedor123`

## 🔍 API Endpoints

### Autenticação
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/forgot-password` - Recuperar senha
- `POST /api/v1/auth/reset-password` - Resetar senha

### Usuários
- `GET /api/v1/users/me` - Usuário logado
- `GET /api/v1/users` - Listar usuários
- `POST /api/v1/users` - Criar usuário
- `GET /api/v1/users/{id}` - Buscar usuário
- `PUT /api/v1/users/{id}` - Atualizar usuário
- `DELETE /api/v1/users/{id}` - Deletar usuário

### Clientes
- `GET /api/v1/clients` - Listar clientes
- `POST /api/v1/clients` - Criar cliente
- `GET /api/v1/clients/{id}` - Buscar cliente
- `PUT /api/v1/clients/{id}` - Atualizar cliente
- `DELETE /api/v1/clients/{id}` - Deletar cliente

### Pessoas (NOVO - 29/01/2026)
- `GET /api/v1/persons` - Listar pessoas (com filtros e paginação até 10.000)
- `POST /api/v1/persons` - Criar pessoa
- `GET /api/v1/persons/{id}` - Buscar pessoa
- `PUT /api/v1/persons/{id}` - Atualizar pessoa
- `DELETE /api/v1/persons/{id}` - Deletar pessoa
- `PATCH /api/v1/persons/{id}/status` - Alterar status (ativo/inativo)
- `GET /api/v1/persons/organization/{id}` - Listar pessoas de uma organização
- `POST /api/v1/cards/{card_id}/person/link` - Vincular pessoa ao card
- `DELETE /api/v1/cards/{card_id}/person/unlink` - Desvincular pessoa do card

### Boards
- `GET /api/v1/boards` - Listar boards
- `POST /api/v1/boards` - Criar board
- `GET /api/v1/boards/{id}` - Buscar board
- `PUT /api/v1/boards/{id}` - Atualizar board
- `DELETE /api/v1/boards/{id}` - Deletar board

### Listas
- `GET /api/v1/boards/{board_id}/lists` - Listar listas
- `POST /api/v1/boards/{board_id}/lists` - Criar lista
- `PUT /api/v1/lists/{id}` - Atualizar lista
- `DELETE /api/v1/lists/{id}` - Deletar lista
- `POST /api/v1/lists/{id}/reorder` - Reordenar lista

### Cards
- `GET /api/v1/lists/{list_id}/cards` - Listar cards
- `POST /api/v1/lists/{list_id}/cards` - Criar card
- `GET /api/v1/cards/{id}` - Buscar card
- `PUT /api/v1/cards/{id}` - Atualizar card
- `DELETE /api/v1/cards/{id}` - Deletar card
- `POST /api/v1/cards/{id}/move` - Mover card

### Gamificação
- `GET /api/v1/gamification/points` - Pontos do usuário
- `GET /api/v1/gamification/badges` - Badges do usuário
- `GET /api/v1/gamification/ranking` - Ranking
- `POST /api/v1/gamification/badges` - Criar badge (admin)

### Automações
- `GET /api/v1/automations` - Listar automações
- `POST /api/v1/automations` - Criar automação
- `PUT /api/v1/automations/{id}` - Atualizar automação
- `DELETE /api/v1/automations/{id}` - Deletar automação

### Transferências
- `GET /api/v1/transfers` - Listar transferências
- `POST /api/v1/transfers` - Criar transferência
- `POST /api/v1/transfers/{id}/approve` - Aprovar transferência
- `POST /api/v1/transfers/{id}/reject` - Rejeitar transferência

### Relatórios
- `GET /api/v1/reports/dashboard` - Dashboard com KPIs
- `GET /api/v1/reports/sales` - Relatório de vendas
- `GET /api/v1/reports/conversion` - Taxa de conversão

## 🧪 Testes

### Executar Todos os Testes

```bash
# Via Docker
docker-compose exec api pytest tests/unit/ -v

# Local
pytest tests/unit/ -v
```

### Executar Testes Específicos

```bash
# Apenas Auth
pytest tests/unit/test_auth.py -v

# Apenas Users
pytest tests/unit/test_users.py -v

# Apenas Cards
pytest tests/unit/test_cards.py -v

# Com cobertura
pytest tests/unit/ --cov=app --cov-report=html
```

## 📝 Migrations

### Criar Nova Migration

```bash
# Via Docker
docker-compose exec api alembic revision -m "descricao_da_migration"

# Local
alembic revision -m "descricao_da_migration"
```

### Aplicar Migrations

```bash
# Via Docker
docker-compose exec api alembic upgrade head

# Local
alembic upgrade head
```

### Verificar Status

```bash
# Via Docker
docker-compose exec api alembic current

# Local
alembic current
```

## 🔧 Troubleshooting

### Erro de Conexão com Banco

```bash
# Verificar se o banco está acessível
docker-compose exec api python -c "from app.db.session import SessionLocal; db = SessionLocal(); print('OK')"
```

### Logs da Aplicação

```bash
# Ver logs em tempo real
docker-compose logs -f api

# Ver últimas 100 linhas
docker-compose logs --tail=100 api
```

### Reiniciar Serviços

```bash
# Reiniciar apenas a API
docker-compose restart api

# Reiniciar tudo
docker-compose restart
```

## 📚 Documentação Adicional

- **Correções de Testes**: `Documentação/CORREÇÕES_TESTES_08_01_2026.md`
- **Migração contact_info → Persons**: `MIGRATION_CONTACT_INFO_TO_PERSONS.md` (29/01/2026)
- **Estrutura do Banco de Dados**: `docs/DATABASE_STRUCTURE.md`
- **Guia de Scripts**: `scripts/README.md`
- **Migrations**: Ver pasta `alembic/versions/`
- **Swagger/OpenAPI**: Acesse `http://localhost:8000/docs` após iniciar a API

## 🎯 Próximos Passos

- ✅ Backend 100% finalizado e testado
- 🚀 **Próximo**: Desenvolvimento do Frontend React

## 👨‍💻 Desenvolvimento

**Data de Conclusão do Backend:** 08/01/2026

**Tecnologias Utilizadas:**
- Python 3.11+
- FastAPI
- PostgreSQL 17.7
- Docker & Docker Compose
- SQLAlchemy 2.0
- Alembic
- Pytest
- Celery + Redis
- APScheduler

---

**HSGrowth CRM** - Sistema de CRM desenvolvido para uso interno
© 2026 - Todos os direitos reservados
