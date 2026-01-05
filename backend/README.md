# HSGrowth CRM - Backend API

Backend completo do sistema HSGrowth CRM desenvolvido com FastAPI, oferecendo uma API REST robusta para gerenciamento de vendas, gamificação, automações e transferências.

## 📋 Sobre o Projeto

HSGrowth CRM é um sistema completo de Customer Relationship Management (CRM) focado em vendas, com recursos avançados de gamificação, automações e gestão de transferências entre vendedores.

### Status de Implementação

**Progresso Geral:** 9 de 18 fases concluídas (50%)

#### ✅ Módulos Implementados

- **Autenticação e Autorização** - Sistema completo de login, registro, refresh token e recuperação de senha
- **Gestão de Usuários** - CRUD completo com paginação e multi-tenant
- **Boards e Listas** - Quadros Kanban com listas customizáveis e reordenação
- **Cards** - Cartões com campos customizados, valores monetários e datas
- **Gamificação** - Sistema de pontos, badges e rankings periódicos
- **Automações** - Automações trigger e scheduled com histórico de execuções
- **Transferências** - Transferência de cards entre vendedores com fluxo de aprovação

#### 🚧 Em Desenvolvimento

- Relatórios e Dashboard
- Notificações In-App
- Serviço de Email
- Módulo Admin
- Workers Assíncronos
- Testes Automatizados
- Scripts Utilitários
- Deploy e Documentação

## 🚀 Tecnologias

- **FastAPI** 0.109.0 - Framework web moderno e de alta performance
- **SQLAlchemy** 2.0.25 - ORM para Python
- **Alembic** 1.13.1 - Migrations de banco de dados
- **PostgreSQL** - Banco de dados relacional
- **Pydantic** 2.5.3 - Validação de dados
- **Python-Jose** - JWT tokens
- **Passlib** - Hash de senhas com bcrypt
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

## 🔧 Instalação

### Pré-requisitos

- Python 3.11 ou superior
- PostgreSQL 14 ou superior
- pip (gerenciador de pacotes Python)

### Passo a Passo

1. **Clone o repositório**

```bash
git clone https://github.com/seu-usuario/hsgrowth-sistema.git
cd hsgrowth-sistema/backend
```

2. **Instale as dependências**

```bash
pip install -r requirements.txt
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do backend:

```env
# Database
DATABASE_URL=postgresql://usuario:senha@localhost:5432/hsgrowth

# JWT
JWT_SECRET=sua-chave-secreta-super-segura
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Application
PROJECT_NAME="HSGrowth CRM API"
VERSION=1.0.0
DEBUG=True

# CORS (opcional)
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# Transferências (opcional)
TRANSFER_APPROVAL_REQUIRED=False
```

4. **Execute as migrations**

```bash
alembic upgrade head
```

5. **Popule o banco com dados iniciais (opcional)**

```bash
python scripts/seed_database.py
```

Isso criará:
- Conta padrão: HSGrowth
- Usuário admin: `admin@hsgrowth.com` / `admin123`
- Roles: admin, manager, salesperson

6. **Inicie o servidor**

```bash
uvicorn app.main:app --reload
```

A API estará disponível em `http://localhost:8000`

## 📚 Documentação da API

Após iniciar o servidor, acesse:

- **Swagger UI (interativo):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

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
