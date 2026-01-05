# 12 - GUIA DE DESENVOLVIMENTO

**HSGrowth CRM - Internal Sales Management System**
**Versão**: 1.0
**Data**: 15/12/2025
**Autor**: Equipe de Desenvolvimento HSGrowth

---

## 📋 Índice

1. [Setup de Ambiente Local](#1-setup-de-ambiente-local)
2. [Como Rodar o Projeto](#2-como-rodar-o-projeto)
3. [Padrões de Código](#3-padrões-de-código)
4. [Estrutura de Commits](#4-estrutura-de-commits)
5. [Como Rodar Testes](#5-como-rodar-testes)
6. [Troubleshooting Comum](#6-troubleshooting-comum)
7. [Code Review Checklist](#7-code-review-checklist)

---

## 1. Setup de Ambiente Local

### 1.1 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

| Software | Versão Mínima | Versão Recomendada | Download |
|----------|---------------|-------------------|----------|
| **Python** | 3.11 | 3.12+ | https://www.python.org |
| **pip** | 23.x+ | Última versão | (incluído com Python) |
| **Node.js** | 18.x | 20.x LTS | https://nodejs.org (apenas para frontend) |
| **npm** | 9.x | 10.x | (incluído com Node.js - apenas para frontend) |
| **PostgreSQL** | 14.x | 15.x | https://www.postgresql.org |
| **Git** | 2.30+ | 2.42+ | https://git-scm.com |
| **VS Code** | - | Última versão | https://code.visualstudio.com |

**Nota**: Não é necessário instalar Redis. O sistema usa cache em memória local (cachetools no backend, similar ao node-cache).

---

### 1.2 Instalação do PostgreSQL

#### Windows

1. Baixe o instalador em https://www.postgresql.org/download/windows/
2. Execute o instalador e siga o wizard
3. **Importante**: Anote a senha do usuário `postgres`
4. Porta padrão: `5432`
5. Durante instalação, marque "pgAdmin 4" e "Stack Builder"

#### macOS

```bash
# Usando Homebrew
brew install postgresql@15

# Iniciar serviço
brew services start postgresql@15

# Verificar instalação
psql --version
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Iniciar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verificar status
sudo systemctl status postgresql
```

---

### 1.3 Configuração do Banco de Dados

```bash
# Conectar ao PostgreSQL como superusuário
psql -U postgres

# Criar banco de dados
CREATE DATABASE hsgrowth_crm;

# Criar usuário de desenvolvimento
CREATE USER dev_user WITH PASSWORD 'dev_password_2025';

# Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE hsgrowth_crm TO dev_user;

# Sair do psql
\q
```

**Teste a conexão**:

```bash
psql -U dev_user -d hsgrowth_crm -h localhost -p 5432
```

---

### 1.4 Clone do Repositório

```bash
# Clonar repositório
git clone https://github.com/hsgrowth/crm.git
cd crm

# Criar branch de desenvolvimento
git checkout -b dev/seu-nome
```

---

### 1.5 Configuração de Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o arquivo `.env` (backend):

```env
# Database
DATABASE_URL=postgresql://dev_user:dev_password_2025@localhost:5432/hsgrowth_crm

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=8h

# Server
ENVIRONMENT=development
PORT=8000
CORS_ORIGINS=["http://localhost:5173"]

# Email (Microsoft 365 SMTP)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=crm@hsgrowth.com.br
SMTP_PASSWORD=your-email-password
SMTP_FROM=crm@hsgrowth.com.br
SMTP_FROM_NAME=HSGrowth CRM

# Cache (cachetools settings)
CACHE_TTL=3600
CACHE_MAXSIZE=1000

# Celery (Job Queue)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Logs
LOG_LEVEL=DEBUG
LOG_RETENTION_DAYS=90

# Automations
AUTOMATION_MAX_PER_ACCOUNT=50
EMAIL_FAILURE_THRESHOLD=3
EMAIL_GROUP_THRESHOLD=5

# Transfers
TRANSFER_LIMIT_PER_MONTH=10
TRANSFER_APPROVAL_REQUIRED=false
TRANSFER_APPROVAL_EXPIRATION_HOURS=72

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

---

### 1.6 Instalação de Dependências

#### Backend (Python/FastAPI)

```bash
# Navegar para pasta do backend
cd backend

# Criar ambiente virtual (recomendado)
python -m venv venv

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Voltar para raiz
cd ..
```

#### Frontend (React/TypeScript)

```bash
# Navegar para pasta do frontend
cd frontend

# Instalar dependências
npm install

# Voltar para raiz
cd ..
```

---

### 1.7 Extensões Recomendadas para VS Code

Crie o arquivo `.vscode/extensions.json`:

```json
{
  "recommendations": [
    // Backend (Python)
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-python.black-formatter",
    "ms-python.isort",
    "charliermarsh.ruff",

    // Frontend (React/TypeScript)
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",

    // Banco de Dados
    "mtxr.sqltools",
    "mtxr.sqltools-driver-pg",

    // Geral
    "usernamehw.errorlens",
    "eamodio.gitlens",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "editorconfig.editorconfig"
  ]
}
```

---

### 1.8 Configuração do Editor

Crie o arquivo `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },

  // Python (Backend)
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  },
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "python.analysis.typeCheckingMode": "basic",

  // JavaScript/TypeScript (Frontend)
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },

  // Files to exclude
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    "**/venv": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/.cache": true
  },
  "search.exclude": {
    "**/__pycache__": true,
    "**/venv": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/*.log": true
  }
}
```

---

## 2. Como Rodar o Projeto

### 2.1 Primeira Execução

#### Backend

```bash
# Navegar para pasta do backend
cd backend

# Ativar ambiente virtual (se ainda não estiver ativo)
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 1. Criar estrutura do banco de dados (migrations)
alembic upgrade head

# 2. Popular banco com dados de exemplo (opcional)
python scripts/seed_database.py

# 3. Iniciar backend em modo desenvolvimento
uvicorn app.main:app --reload --port 8000
```

#### Frontend (em outro terminal)

```bash
# Navegar para pasta do frontend
cd frontend

# Iniciar frontend em modo desenvolvimento
npm run dev
```

**Acessar aplicação**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Documentação API (Swagger): http://localhost:8000/docs
- Documentação API (ReDoc): http://localhost:8000/redoc

---

### 2.2 Scripts Disponíveis

#### Backend (Python/FastAPI)

```bash
# Desenvolvimento
uvicorn app.main:app --reload --port 8000      # Inicia servidor com hot-reload
uvicorn app.main:app --reload --log-level debug # Inicia com log detalhado

# Produção
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4  # Servidor de produção

# Database (Alembic)
alembic upgrade head           # Executa migrations pendentes
alembic downgrade -1           # Reverte última migration
alembic revision --autogenerate -m "description"  # Cria nova migration
python scripts/seed_database.py  # Popula banco com dados de exemplo

# Celery (Workers e Jobs Assíncronos)
celery -A app.workers.celery_app worker --loglevel=info  # Inicia worker Celery
celery -A app.workers.celery_app beat --loglevel=info    # Inicia beat scheduler

# Testes (Pytest)
pytest                         # Executa todos os testes
pytest tests/unit              # Executa apenas testes unitários
pytest tests/integration       # Executa apenas testes de integração
pytest tests/e2e               # Executa testes E2E
pytest --cov=app               # Gera relatório de cobertura
pytest --cov=app --cov-report=html  # Cobertura em HTML

# Linting e Formatação
black .                        # Formata código com Black
isort .                        # Organiza imports
flake8 .                       # Verifica código com Flake8
mypy app                       # Verifica tipos estáticos
ruff check .                   # Linter rápido (alternativa ao Flake8)

# Utilities
python scripts/clean_logs.py   # Remove logs antigos
python scripts/clear_cache.py  # Limpa cache em memória
```

#### Frontend

```bash
# Desenvolvimento
npm run dev              # Inicia servidor Vite (http://localhost:5173)

# Build
npm run build            # Build de produção
npm run preview          # Preview do build de produção

# Testes
npm run test             # Executa testes com Vitest
npm run test:ui          # Abre interface de testes
npm run test:coverage    # Gera relatório de cobertura

# Linting
npm run lint             # Verifica código com ESLint
npm run lint:fix         # Corrige problemas automaticamente
```

---

### 2.3 Login Padrão (após seed)

Após executar `npm run db:seed`, você pode usar as seguintes credenciais:

| Tipo | Email | Senha | Permissões |
|------|-------|-------|------------|
| **Admin** | admin@hsgrowth.com.br | admin123 | Todas |
| **Gerente** | gerente@hsgrowth.com.br | gerente123 | Gerenciar equipe, ver dashboards |
| **Vendedor** | vendedor1@hsgrowth.com.br | vendedor123 | Criar leads, transferir cartões |

**IMPORTANTE**: Altere essas senhas em produção!

---

## 3. Padrões de Código

### 3.1 Naming Conventions

#### Arquivos

```
# Controllers
UserController.ts       ✅ PascalCase + "Controller"
user-controller.ts      ❌ Evitar kebab-case em TypeScript

# Services
AuthService.ts          ✅
GameService.ts          ✅

# Models/Types
User.ts                 ✅ PascalCase (singular)
CardTransfer.ts         ✅

# Utilities
stringUtils.ts          ✅ camelCase + "Utils"
dateHelper.ts           ✅

# Routes
userRoutes.ts           ✅ camelCase + "Routes"
authRoutes.ts           ✅

# Tests
UserService.test.ts     ✅ Nome do arquivo + ".test.ts"
authUtils.test.ts       ✅
```

#### Variáveis e Funções

```typescript
// ✅ Boas práticas
const userName = 'João';          // camelCase
const MAX_RETRIES = 3;            // UPPER_SNAKE_CASE para constantes
const isActive = true;            // Boolean com prefixo is/has/should
const hasPermission = false;

function getUserById(id: number) {} // camelCase, verbos descritivos
async function fetchCardData() {}   // async functions com fetch/get/create

// ❌ Evitar
const user_name = 'João';         // snake_case
const maxretries = 3;             // sem separação
const active = true;              // ambíguo (não é claro que é boolean)
function user(id: number) {}      // nome vago
```

#### Classes e Interfaces

```typescript
// ✅ Classes
class UserService {}              // PascalCase
class CardTransferValidator {}

// ✅ Interfaces
interface User {}                 // PascalCase (sem prefixo "I")
interface CardData {}
interface CreateUserDTO {}        // DTO suffix para Data Transfer Objects

// ✅ Types
type UserRole = 'admin' | 'manager' | 'seller';
type CardStatus = 'open' | 'won' | 'lost';

// ❌ Evitar
class userService {}              // camelCase em classe
interface IUser {}                // prefixo "I" desnecessário em TypeScript
type user_role = 'admin';         // snake_case
```

#### Banco de Dados (PostgreSQL)

```sql
-- ✅ Tabelas: snake_case, plural
users
cards
card_custom_fields
automation_executions

-- ✅ Colunas: snake_case
user_id
created_at
is_active
card_value

-- ✅ Índices: idx_ + tabela + colunas
idx_cards_assigned_user_created
idx_users_email
idx_transfers_created_at

-- ❌ Evitar
Users                             -- PascalCase
cardCustomFields                  -- camelCase
user-id                           -- kebab-case
```

---

### 3.2 Estrutura de Pastas

```
hsgrowth-crm/
├── backend/
│   ├── src/
│   │   ├── controllers/         # HTTP request handlers
│   │   │   ├── AuthController.ts
│   │   │   ├── UserController.ts
│   │   │   ├── CardController.ts
│   │   │   └── GameController.ts
│   │   ├── services/            # Business logic
│   │   │   ├── AuthService.ts
│   │   │   ├── UserService.ts
│   │   │   ├── CardService.ts
│   │   │   └── GameService.ts
│   │   ├── models/              # Database models (Sequelize/Prisma)
│   │   │   ├── User.ts
│   │   │   ├── Card.ts
│   │   │   └── index.ts
│   │   ├── routes/              # API routes
│   │   │   ├── authRoutes.ts
│   │   │   ├── userRoutes.ts
│   │   │   └── index.ts
│   │   ├── middlewares/         # Express middlewares
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimiter.ts
│   │   ├── utils/               # Helper functions
│   │   │   ├── logger.ts
│   │   │   ├── cache.ts
│   │   │   └── validators.ts
│   │   ├── config/              # Configuration files
│   │   │   ├── database.ts
│   │   │   └── env.ts
│   │   ├── jobs/                # Background jobs (Bull/BullMQ)
│   │   │   ├── automationJob.ts
│   │   │   └── emailJob.ts
│   │   ├── types/               # TypeScript type definitions
│   │   │   ├── express.d.ts
│   │   │   └── custom.ts
│   │   └── app.ts               # Express app setup
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── migrations/              # Database migrations
│   ├── seeds/                   # Database seeds
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── common/          # Reusable components
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Modal.tsx
│   │   │   ├── kanban/
│   │   │   │   ├── Board.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── List.tsx
│   │   │   └── dashboard/
│   │   ├── pages/               # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Kanban.tsx
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   └── useCards.ts
│   │   ├── services/            # API calls
│   │   │   ├── api.ts
│   │   │   └── authService.ts
│   │   ├── store/               # State management (Zustand/Redux)
│   │   │   └── authStore.ts
│   │   ├── types/               # TypeScript types
│   │   ├── utils/               # Helper functions
│   │   └── App.tsx
│   └── package.json
└── README.md
```

---

### 3.3 TypeScript Best Practices

```typescript
// ✅ Sempre tipar parâmetros e retornos
function calculatePoints(action: string, value: number): number {
  // ...
}

// ✅ Usar interfaces para objetos complexos
interface CreateCardDTO {
  name: string;
  value?: number;
  assigned_to: number;
  board_id: number;
}

// ✅ Evitar 'any' - usar 'unknown' se necessário
function processData(data: unknown) {
  if (typeof data === 'string') {
    // ...
  }
}

// ✅ Usar enums para valores fixos
enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SELLER = 'seller'
}

// ✅ Usar optional chaining e nullish coalescing
const userName = user?.name ?? 'Anônimo';

// ❌ Evitar
function calculate(a, b) { return a + b; } // Sem tipos
const data: any = fetchData();            // Uso de 'any'
```

---

### 3.4 Comentários

```typescript
// ✅ Comentários úteis
/**
 * Calcula pontos de gamificação baseado na ação do usuário.
 *
 * @param userId - ID do usuário
 * @param action - Tipo de ação (criar_lead, fechar_venda, etc)
 * @param cardValue - Valor do cartão (opcional)
 * @returns Total de pontos atribuídos
 */
async function calculateGamificationPoints(
  userId: number,
  action: string,
  cardValue?: number
): Promise<number> {
  // Regras de negócio complexas merecem comentários
  if (action === 'fechar_venda' && cardValue > 100000) {
    // Vendas acima de R$ 100k ganham bônus de 50 pontos
    return 100 + 50;
  }
  // ...
}

// ❌ Evitar comentários óbvios
const total = a + b; // soma a e b
user.isActive = true; // define usuário como ativo
```

---

### 3.5 Error Handling

```typescript
// ✅ Usar classes de erro customizadas
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

// ✅ Try-catch com logs adequados
async function transferCard(cardId: number, toUserId: number) {
  try {
    const card = await CardService.findById(cardId);

    if (!card) {
      throw new NotFoundError('Card');
    }

    // Lógica de transferência...

  } catch (error) {
    logger.error('Error transferring card', {
      cardId,
      toUserId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error; // Re-throw para camada superior tratar
  }
}

// ✅ Middleware de erro global (Express)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }

  logger.error('Unhandled error', { error: err });
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## 4. Estrutura de Commits

### 4.1 Conventional Commits

Seguimos a especificação [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

#### Types

| Type | Descrição | Exemplo |
|------|-----------|---------|
| `feat` | Nova funcionalidade | `feat(gamification): add badge system` |
| `fix` | Correção de bug | `fix(transfers): validate limit before transfer` |
| `docs` | Documentação | `docs(readme): update setup instructions` |
| `style` | Formatação (sem mudança de lógica) | `style(cards): fix indentation` |
| `refactor` | Refatoração de código | `refactor(auth): simplify token validation` |
| `test` | Adicionar/modificar testes | `test(game): add ranking calculation tests` |
| `chore` | Tarefas de manutenção | `chore(deps): update dependencies` |
| `perf` | Melhorias de performance | `perf(kanban): optimize card loading query` |

#### Scopes (opcional)

```
auth          # Autenticação
users         # Usuários
cards         # Cartões
boards        # Quadros (boards/listas)
gamification  # Sistema de gamificação
automations   # Automações
transfers     # Transferências
dashboard     # Dashboard
api           # API em geral
db            # Database
```

---

### 4.2 Exemplos de Commits

```bash
# ✅ Bons commits
feat(gamification): add points calculation for card creation
fix(transfers): prevent transfer when limit exceeded
docs(api): add swagger documentation for user endpoints
test(automations): add tests for priority execution
refactor(cache): replace Redis with node-cache for cost reduction
perf(kanban): add index on cards.assigned_to for faster queries

# ❌ Commits ruins
update stuff                    # Vago
fix bug                         # Não descreve qual bug
WIP                             # Work in progress (não commitar)
asjdhasjkdh                     # Sem sentido
fixed everything                # Muito genérico
```

---

### 4.3 Commit Body (opcional mas recomendado)

Para commits complexos, adicione detalhes no corpo:

```bash
git commit -m "feat(automations): add scheduled automation execution

- Implement cron job runner with node-cron
- Support daily, weekly, monthly, and annual schedules
- Add execution tracking in automation_executions table
- Add failure notifications via email (3+ failures/hour)

Closes #45"
```

---

### 4.4 Regras de Commits

1. **Commits pequenos e focados**: 1 commit = 1 mudança lógica
2. **Commits funcionais**: Código deve compilar e passar nos testes
3. **Mensagens descritivas**: Explique o "porquê", não apenas o "o quê"
4. **Usar presente do indicativo**: "add feature" não "added feature"
5. **Primeira letra minúscula** no subject
6. **Sem ponto final** no subject
7. **Limite de 72 caracteres** no subject

---

### 4.5 Hooks Git (Husky)

Configuramos hooks automáticos para garantir qualidade:

```bash
# Pre-commit: Executa antes de cada commit
# - ESLint
# - Prettier
# - Type check

# Pre-push: Executa antes de cada push
# - Testes unitários
# - Testes de integração
```

Instalação:

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
npx husky add .husky/pre-push "npm run test:unit"
```

---

## 5. Como Rodar Testes

### 5.1 Estrutura de Testes

```
tests/
├── unit/                        # Testes unitários (funções isoladas)
│   ├── services/
│   │   ├── AuthService.test.ts
│   │   └── GameService.test.ts
│   └── utils/
│       └── validators.test.ts
├── integration/                 # Testes de integração (módulos + DB)
│   ├── api/
│   │   ├── auth.test.ts
│   │   └── cards.test.ts
│   └── services/
│       └── AutomationService.test.ts
├── e2e/                         # Testes end-to-end (fluxos completos)
│   ├── sales-flow.spec.ts
│   └── transfer-flow.spec.ts
├── fixtures/                    # Dados de teste
│   ├── users.json
│   └── cards.json
└── helpers/                     # Helpers de teste
    ├── testDb.ts
    └── factories.ts
```

---

### 5.2 Executar Testes

```bash
# Executar TODOS os testes
npm run test

# Testes unitários apenas
npm run test:unit

# Testes de integração apenas
npm run test:integration

# Testes E2E apenas
npm run test:e2e

# Modo watch (re-executa ao salvar arquivo)
npm run test:watch

# Cobertura de código
npm run test:coverage

# Executar teste específico
npm run test -- AuthService.test.ts

# Executar testes em modo debug
npm run test:debug
```

---

### 5.3 Cobertura de Código

Após executar `npm run test:coverage`:

```
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   82.45 |    75.32 |   80.12 |   83.67 |
 services/          |   85.23 |    78.45 |   82.34 |   86.12 |
  AuthService.ts    |   90.12 |    85.67 |   88.45 |   91.23 |
  GameService.ts    |   88.34 |    80.23 |   85.12 |   89.45 |
 controllers/       |   78.45 |    70.12 |   75.34 |   79.23 |
```

**Metas de cobertura**:
- Mínimo aceitável: **70%**
- Recomendado: **80-85%**
- Módulos críticos (auth, automações, transferências): **90%+**

Abrir relatório HTML:

```bash
# Gera relatório em coverage/lcov-report/index.html
npm run test:coverage
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

---

### 5.4 Exemplo de Teste Unitário

```typescript
// tests/unit/services/GameService.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { GameService } from '../../../src/services/GameService';

describe('GameService', () => {
  let gameService: GameService;

  beforeEach(() => {
    gameService = new GameService();
  });

  describe('calculatePoints', () => {
    test('deve retornar 10 pontos para criar_lead', () => {
      const points = gameService.calculatePoints('criar_lead');
      expect(points).toBe(10);
    });

    test('deve retornar 100 pontos para fechar_venda', () => {
      const points = gameService.calculatePoints('fechar_venda');
      expect(points).toBe(100);
    });

    test('deve retornar 0 pontos para ação desconhecida', () => {
      const points = gameService.calculatePoints('acao_invalida');
      expect(points).toBe(0);
    });
  });

  describe('getTotalPoints', () => {
    test('deve somar todos os pontos do usuário', async () => {
      // Arrange
      const userId = 1;
      await gameService.addPoints(userId, 'criar_lead', 1);
      await gameService.addPoints(userId, 'fechar_venda', 2);

      // Act
      const total = await gameService.getTotalPoints(userId);

      // Assert
      expect(total).toBe(110); // 10 + 100
    });
  });
});
```

---

### 5.5 Exemplo de Teste de Integração

```typescript
// tests/integration/api/auth.test.ts
import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import app from '../../../src/app';
import { setupTestDb, cleanupTestDb } from '../../helpers/testDb';

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  test('deve retornar token JWT para credenciais válidas', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@hsgrowth.com.br',
        password: 'admin123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('admin@hsgrowth.com.br');
  });

  test('deve retornar 401 para senha incorreta', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@hsgrowth.com.br',
        password: 'senha_errada'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  test('deve retornar 400 para email inválido', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'email-invalido',
        password: 'senha123'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid email');
  });
});
```

---

### 5.6 Exemplo de Teste E2E

```typescript
// tests/e2e/sales-flow.spec.ts
import { test, expect } from '@playwright/test';

test('vendedor deve criar lead e fechar venda', async ({ page }) => {
  // Login
  await page.goto('http://localhost:5173/login');
  await page.fill('[name="email"]', 'vendedor1@hsgrowth.com.br');
  await page.fill('[name="password"]', 'vendedor123');
  await page.click('button[type="submit"]');

  // Aguardar redirect para dashboard
  await expect(page).toHaveURL(/\/dashboard/);

  // Navegar para Kanban
  await page.click('a:has-text("Funil de Vendas")');
  await expect(page).toHaveURL(/\/kanban/);

  // Criar novo lead
  await page.click('button:has-text("Novo Lead")');
  await page.fill('[name="name"]', 'Empresa Teste Ltda');
  await page.fill('[name="value"]', '75000');
  await page.fill('[name="contact_email"]', 'contato@teste.com');
  await page.click('button:has-text("Salvar")');

  // Verificar que cartão foi criado
  await expect(page.locator('.card:has-text("Empresa Teste Ltda")')).toBeVisible();

  // Mover cartão para "Venda Fechada"
  await page.dragAndDrop(
    '.card:has-text("Empresa Teste Ltda")',
    '.list:has-text("Venda Fechada")'
  );

  // Verificar pontos de gamificação
  await page.click('[data-testid="user-menu"]');
  await expect(page.locator('text=/110 pontos/')).toBeVisible(); // 10 (criar) + 100 (fechar)

  // Verificar badge
  await expect(page.locator('img[alt="Primeira Venda"]')).toBeVisible();
});
```

---

## 6. Troubleshooting Comum

### 6.1 Banco de Dados

#### Erro: "FATAL: password authentication failed"

```bash
# Solução 1: Verificar credenciais no .env
DB_USER=dev_user
DB_PASSWORD=dev_password_2025

# Solução 2: Resetar senha do usuário PostgreSQL
psql -U postgres
ALTER USER dev_user WITH PASSWORD 'nova_senha';
\q
```

#### Erro: "relation does not exist"

```bash
# Executar migrations
npm run db:migrate

# Se não resolver, resetar banco
npm run db:reset
```

#### Erro: "too many connections"

```sql
-- Verificar conexões ativas
SELECT count(*) FROM pg_stat_activity;

-- Matar conexões idle
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';
```

---

### 6.2 Node.js / npm

#### Erro: "Cannot find module"

```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# Limpar cache do npm
npm cache clean --force
npm install
```

#### Erro: "Port 3000 already in use"

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:3000 | xargs kill -9
```

#### Erro: "ERR_OSSL_EVP_UNSUPPORTED" (Node.js 17+)

```bash
# Adicionar flag no package.json
{
  "scripts": {
    "dev": "NODE_OPTIONS=--openssl-legacy-provider nodemon src/app.ts"
  }
}
```

---

### 6.3 TypeScript

#### Erro: "Cannot find name 'X'"

```bash
# Instalar tipos
npm install --save-dev @types/node @types/express @types/jest

# Verificar tsconfig.json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"]
  }
}
```

#### Erro: "Module not found" após importação

```bash
# Verificar paths no tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@controllers/*": ["controllers/*"],
      "@services/*": ["services/*"]
    }
  }
}
```

---

### 6.4 Frontend (React + Vite)

#### Erro: "Failed to fetch dynamically imported module"

```bash
# Limpar cache do Vite
rm -rf node_modules/.vite
npm run dev
```

#### Erro: CORS ao chamar API

```typescript
// backend/src/app.ts
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// frontend/src/services/api.ts
axios.defaults.withCredentials = true;
```

---

### 6.5 Testes

#### Erro: "Timeout of 5000ms exceeded"

```typescript
// Aumentar timeout em testes assíncronos
test('deve executar automação', async () => {
  // ...
}, 10000); // 10 segundos
```

#### Erro: "Database connection refused" em testes

```bash
# Usar banco de dados separado para testes
# .env.test
DB_NAME=hsgrowth_crm_test

# Executar testes com .env.test
npm run test
```

---

### 6.6 Logs e Debugging

#### Ativar logs detalhados

```env
# .env
LOG_LEVEL=debug
```

```typescript
// Usar logger ao invés de console.log
import logger from './utils/logger';

logger.debug('User data', { userId, email });
logger.error('Failed to create card', { error });
```

#### Debugger no VS Code

Crie `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:debug"],
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

Adicione breakpoints no código e pressione **F5**.

---

## 7. Code Review Checklist

### 7.1 Funcionalidade

- [ ] Código atende aos requisitos especificados
- [ ] Lógica de negócio está correta
- [ ] Edge cases foram tratados
- [ ] Validações de entrada foram implementadas
- [ ] Mensagens de erro são claras e úteis

### 7.2 Testes

- [ ] Testes unitários foram adicionados/atualizados
- [ ] Testes de integração foram adicionados (se aplicável)
- [ ] Cobertura de código >= 70%
- [ ] Testes passam localmente
- [ ] Casos de erro foram testados

### 7.3 Segurança

- [ ] Sem SQL Injection (usar prepared statements)
- [ ] Sem XSS (sanitizar inputs)
- [ ] Sem exposição de dados sensíveis
- [ ] Autenticação/autorização implementada corretamente
- [ ] Senhas nunca armazenadas em plaintext
- [ ] Rate limiting em endpoints críticos

### 7.4 Performance

- [ ] Queries otimizadas (índices adequados)
- [ ] Sem N+1 queries
- [ ] Uso eficiente de cache
- [ ] Carregamento de grandes listas otimizado (paginação)
- [ ] Arquivos estáticos minificados

### 7.5 Código Limpo

- [ ] Nomes descritivos (variáveis, funções, classes)
- [ ] Funções pequenas e focadas (< 50 linhas)
- [ ] Sem código comentado
- [ ] Sem console.log (usar logger)
- [ ] Sem código duplicado
- [ ] Comentários apenas quando necessário

### 7.6 TypeScript

- [ ] Tipagem completa (sem 'any')
- [ ] Interfaces bem definidas
- [ ] Tipos reutilizáveis em arquivos separados
- [ ] Enums para valores fixos

### 7.7 Git

- [ ] Commits seguem Conventional Commits
- [ ] Branch nomeada corretamente (feat/*, fix/*, etc)
- [ ] PR com descrição clara
- [ ] Sem arquivos desnecessários (node_modules, .env, etc)

### 7.8 Documentação

- [ ] README atualizado (se necessário)
- [ ] Comentários JSDoc em funções públicas
- [ ] Swagger/OpenAPI atualizado (para APIs)
- [ ] CHANGELOG atualizado (se versionamento)

---

## 8. Recursos Adicionais

### 8.1 Links Úteis

- **Node.js**: https://nodejs.org/docs
- **PostgreSQL**: https://www.postgresql.org/docs
- **Express**: https://expressjs.com
- **TypeScript**: https://www.typescriptlang.org/docs
- **React**: https://react.dev
- **Vite**: https://vitejs.dev
- **Jest**: https://jestjs.io
- **Playwright**: https://playwright.dev
- **Conventional Commits**: https://www.conventionalcommits.org

### 8.2 Contatos da Equipe

- **Tech Lead**: [email]
- **Backend**: [email]
- **Frontend**: [email]
- **QA**: [email]

### 8.3 Slack Channels

- `#crm-dev` - Discussões de desenvolvimento
- `#crm-bugs` - Reportar bugs
- `#crm-deploys` - Notificações de deploy

---

**Última atualização**: 15/12/2025
**Próxima revisão**: 15/01/2026
