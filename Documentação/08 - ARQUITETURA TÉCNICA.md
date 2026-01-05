# 08 - ARQUITETURA TÉCNICA

## 1. INTRODUÇÃO

Este documento descreve a arquitetura técnica do sistema HSGrowth CRM, incluindo stack tecnológico, padrões de design, estrutura de diretórios e decisões arquiteturais.

---

## 2. VISÃO GERAL DA ARQUITETURA

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript + TailwindCSS + Vite        │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ Pages (Dashboard, Boards, Reports, Admin)     │ │  │
│  │  │ Components (Kanban, List, Calendar, Forms)    │ │  │
│  │  │ State Management (Redux/Zustand)              │ │  │
│  │  │ API Client (Axios/Fetch)                      │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/TLS
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  API Gateway / Load Balancer                │
│                    (Nginx / HAProxy)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Backend API (Python/FastAPI)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FastAPI + Uvicorn Server                            │  │
│  │ ┌──────────────────────────────────────────────────┐ │  │
│  │ │ Routes & Controllers                             │ │  │
│  │ │ - Auth (JWT, Client Credentials)                │ │  │
│  │ │ - Boards, Lists, Cards                          │ │  │
│  │ │ - Custom Fields                                 │ │  │
│  │ │ - Import/Export                                 │ │  │
│  │ │ - Reports & KPIs                                │ │  │
│  │ │ - Gamification (Points, Rankings, Badges)      │ │  │
│  │ │ - Automations (Create, Execute, Manage)        │ │  │
│  │ │ - Transfers (Transfer, History, Reports)       │ │  │
│  │ │ - Commissions (Calculate, Approve, Reports)    │ │  │
│  │ │ - Admin (Users, Logs, Database)                │ │  │
│  │ └──────────────────────────────────────────────────┘ │  │
│  │ ┌──────────────────────────────────────────────────┐ │  │
│  │ │ Middleware                                       │ │  │
│  │ │ - Authentication (JWT verification)             │ │  │
│  │ │ - Authorization (RBAC)                          │ │  │
│  │ │ - Validation (Pydantic - automático)            │ │  │
│  │ │ - Error Handling                                │ │  │
│  │ │ - Logging                                       │ │  │
│  │ │ - Rate Limiting                                 │ │  │
│  │ └──────────────────────────────────────────────────┘ │  │
│  │ ┌──────────────────────────────────────────────────┐ │  │
│  │ │ Services (Business Logic)                       │ │  │
│  │ │ - CardService                                   │ │  │
│  │ │ - BoardService                                  │ │  │
│  │ │ - UserService                                   │ │  │
│  │ │ - ImportService                                 │ │  │
│  │ │ - ReportService                                 │ │  │
│  │ │ - NotificationService                           │ │  │
│  │ │ - GamificationService                           │ │  │
│  │ │ - AutomationService                             │ │  │
│  │ │ - TransferService                               │ │  │
│  │ │ - CommissionService                             │ │  │
│  │ └──────────────────────────────────────────────────┘ │  │
│  │ ┌──────────────────────────────────────────────────┐ │  │
│  │ │ Data Access Layer (Repositories)                │ │  │
│  │ │ - ORM (SQLAlchemy)                              │ │  │
│  │ │ - Query Builder                                 │ │  │
│  │ │ - Database Transactions                         │ │  │
│  │ └──────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬───────────────┐
        │              │              │               │
┌───────▼────────┐ ┌──▼─────────┐ ┌─▼────────────┐ ┌▼─────────────┐
│  PostgreSQL    │ │   Redis    │ │   S3/Storage │ │  Job Queue   │
│  Database      │ │   Cache    │ │   (Files)    │ │  (Bull/MQ)   │
└────────────────┘ └────────────┘ └──────────────┘ └──────┬───────┘
                                                           │
                                                    ┌──────▼───────┐
                                                    │   Workers    │
                                                    │  ┌────────┐  │
                                                    │  │ Auto-  │  │
                                                    │  │ mation │  │
                                                    │  │ Worker │  │
                                                    │  └────────┘  │
                                                    │  ┌────────┐  │
                                                    │  │ Cron   │  │
                                                    │  │ Jobs   │  │
                                                    │  └────────┘  │
                                                    └──────────────┘
```

---

## 3. STACK TECNOLÓGICO

### 3.1 Frontend (hsgrowth-sistema)

| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|----------|
| **Runtime** | Node.js | 18+ | Runtime JavaScript |
| **Framework** | React | 18+ | UI Framework |
| **Linguagem** | TypeScript | 5+ | Type Safety |
| **Build Tool** | Vite | 5+ | Build & Dev Server |
| **Styling** | TailwindCSS | 3+ | Utility-first CSS |
| **State** | Zustand/Redux | Latest | State Management |
| **HTTP Client** | Axios | 1+ | API Requests |
| **Form** | React Hook Form | Latest | Form Management |
| **Validation** | Zod | Latest | Schema Validation |
| **UI Components** | Shadcn/ui | Latest | Component Library |
| **Charts** | Recharts | Latest | Data Visualization |
| **Date** | Day.js | Latest | Date Manipulation |
| **Testing** | Vitest + React Testing Library | Latest | Testing Framework |

### 3.2 Backend (hsgrowth-api)

| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|----------|
| **Runtime** | Python | 3.11+ | Runtime Python |
| **Framework** | FastAPI | 0.100+ | Web Framework |
| **Type Safety** | Pydantic | 2.0+ | Data Validation & Type Hints |
| **ORM** | SQLAlchemy | 2.0+ | Database ORM |
| **Migrations** | Alembic | Latest | Database Migrations |
| **Auth** | python-jose | Latest | JWT Tokens |
| **Password** | passlib | Latest | Password Hashing |
| **Cache** | cachetools | Latest | In-Memory Caching |
| **Logging** | Loguru | Latest | Structured Logging |
| **Testing** | Pytest | Latest | Testing Framework |
| **API Docs** | OpenAPI (built-in) | 3.0+ | API Documentation (automático) |
| **Environment** | python-dotenv | Latest | Environment Variables |
| **Rate Limit** | slowapi | Latest | Rate Limiting |
| **Job Queue** | Celery | Latest | Background Jobs |
| **Scheduler** | APScheduler | Latest | Scheduled Tasks |
| **Email** | FastAPI-Mail | Latest | Email Service |
| **ASGI Server** | Uvicorn | Latest | Production Server |

### 3.3 Banco de Dados

| Componente | Tecnologia | Versão | Propósito |
|-----------|-----------|--------|----------|
| **SGBD** | PostgreSQL | 12+ | Relational Database |
| **Migrations** | Alembic | Latest | Schema Management |
| **Backup** | pg_dump | Built-in | Database Backup |
| **Replication** | PostgreSQL Replication | Built-in | High Availability |

### 3.4 Infraestrutura

| Componente | Tecnologia | Versão | Propósito |
|-----------|-----------|--------|----------|
| **Containerização** | Docker | 24+ | Container Runtime |
| **Orquestração** | Docker Compose | Latest | Local Development |
| **Hospedagem** | Hostinger VPS | - | Cloud Provider |
| **Painel** | Easypanel | Latest | Container Management |
| **Web Server** | Nginx | Latest | Reverse Proxy |
| **Storage** | S3 / MinIO | Latest | File Storage |
| **Email** | SendGrid / SMTP | Latest | Email Service |

---

## 4. PADRÕES DE DESIGN

### 4.1 Padrão MVC (Model-View-Controller)

**Backend**:
- **Model**: Modelos SQLAlchemy (User, Board, Card, etc.)
- **View**: JSON responses (Pydantic schemas)
- **Controller**: Route handlers do FastAPI que processam requisições

**Frontend**:
- **Model**: Redux/Zustand stores
- **View**: React components
- **Controller**: Custom hooks e event handlers

---

### 4.2 Padrão Repository

```python
# repositories/card_repository.py
from sqlalchemy.orm import Session
from models.card import Card
from schemas.card import CardCreate, CardUpdate

class CardRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, card_id: int) -> Card | None:
        return self.db.query(Card).filter(Card.id == card_id).first()

    def find_by_list_id(self, list_id: int) -> list[Card]:
        return self.db.query(Card).filter(Card.list_id == list_id).all()

    def create(self, data: CardCreate) -> Card:
        card = Card(**data.model_dump())
        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)
        return card

    def update(self, card_id: int, data: CardUpdate) -> Card | None:
        card = self.find_by_id(card_id)
        if card:
            for key, value in data.model_dump(exclude_unset=True).items():
                setattr(card, key, value)
            self.db.commit()
            self.db.refresh(card)
        return card

    def delete(self, card_id: int) -> bool:
        card = self.find_by_id(card_id)
        if card:
            self.db.delete(card)
            self.db.commit()
            return True
        return False
```

---

### 4.3 Padrão Service

```python
# services/card_service.py
from repositories.card_repository import CardRepository
from schemas.card import CardCreate, CardResponse
from fastapi import HTTPException, status

class CardService:
    def __init__(self, card_repository: CardRepository):
        self.card_repository = card_repository

    def create_card(self, data: CardCreate, user_id: int) -> CardResponse:
        # Lógica de negócio
        # Validação (já feita pelo Pydantic automaticamente)
        # Autorização
        if not self._user_has_permission(user_id, data.list_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não tem permissão para criar cartão nesta lista"
            )

        # Criar cartão
        card = self.card_repository.create(data)
        return CardResponse.model_validate(card)

    def _user_has_permission(self, user_id: int, list_id: int) -> bool:
        # Verificar permissões
        # ... lógica de autorização
        return True
```

---

### 4.4 Padrão Middleware e Dependency Injection

```python
# middleware/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from config import settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency para autenticação JWT.
    FastAPI usa dependency injection ao invés de middleware tradicional.
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não foi possível validar as credenciais"
        )

# Uso em rotas
from fastapi import APIRouter

router = APIRouter()

@router.get("/cards")
async def get_cards(current_user: dict = Depends(get_current_user)):
    """
    Rota protegida - requer autenticação.
    O FastAPI injeta automaticamente o current_user validado.
    """
    user_id = current_user["sub"]
    # ... lógica da rota
    return {"cards": []}
```

---

### 4.5 Padrão Schema (Pydantic)

```python
# schemas/card.py
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class FieldValue(BaseModel):
    """Schema para valores de campos customizados"""
    field_id: int
    value: str

class CardCreate(BaseModel):
    """Schema para criação de cartão (request)"""
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=5000)
    list_id: int = Field(..., gt=0)
    assigned_to: int | None = Field(None, gt=0)
    field_values: list[FieldValue] = Field(default_factory=list)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Novo Lead",
                "description": "Cliente interessado em EPI",
                "list_id": 1,
                "assigned_to": 10,
                "field_values": [
                    {"field_id": 1, "value": "joao@empresa.com"},
                    {"field_id": 2, "value": "(11) 98765-4321"}
                ]
            }
        }
    )

class CardResponse(BaseModel):
    """Schema para resposta de cartão (response)"""
    id: int
    title: str
    description: str | None
    list_id: int
    assigned_to: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)  # Permite criar de ORM models
```

---

## 5. ESTRUTURA DE DIRETÓRIOS

### 5.1 Backend (hsgrowth-api)

```
hsgrowth-api/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py
│   │   │   │   ├── boards.py
│   │   │   │   ├── cards.py
│   │   │   │   ├── users.py
│   │   │   │   ├── reports.py
│   │   │   │   ├── gamification.py
│   │   │   │   ├── automations.py
│   │   │   │   ├── transfers.py
│   │   │   │   ├── commissions.py
│   │   │   │   └── admin.py
│   │   │   └── api.py  # Agrupa todas as rotas
│   │   └── deps.py  # Dependencies compartilhadas
│   ├── core/
│   │   ├── config.py  # Configurações (Settings com Pydantic)
│   │   ├── security.py  # JWT, password hashing
│   │   └── logging.py  # Configuração de logs
│   ├── db/
│   │   ├── base.py  # Base class do SQLAlchemy
│   │   ├── session.py  # Database session
│   │   └── init_db.py  # Inicialização do banco
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── board.py
│   │   ├── card.py
│   │   ├── list.py
│   │   ├── field_definition.py
│   │   ├── automation.py
│   │   ├── gamification.py
│   │   └── ...  # Outros modelos SQLAlchemy
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── board.py
│   │   ├── card.py
│   │   ├── auth.py
│   │   ├── gamification.py
│   │   └── ...  # Pydantic schemas (request/response)
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── card_repository.py
│   │   ├── board_repository.py
│   │   ├── user_repository.py
│   │   └── audit_log_repository.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── board_service.py
│   │   ├── card_service.py
│   │   ├── user_service.py
│   │   ├── import_service.py
│   │   ├── report_service.py
│   │   ├── gamification_service.py
│   │   ├── automation_service.py
│   │   ├── transfer_service.py
│   │   └── commission_service.py
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── error_handler.py
│   │   ├── logging.py
│   │   └── rate_limit.py
│   ├── workers/
│   │   ├── __init__.py
│   │   ├── celery_app.py  # Configuração do Celery
│   │   ├── automation_worker.py
│   │   └── scheduled_tasks.py  # APScheduler jobs
│   ├── tasks/
│   │   ├── __init__.py
│   │   ├── automation_tasks.py  # Celery tasks
│   │   ├── ranking_tasks.py
│   │   └── commission_tasks.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── jwt.py
│   │   ├── validators.py
│   │   ├── logger.py
│   │   └── errors.py
│   └── main.py  # Entry point da aplicação FastAPI
├── alembic/
│   ├── versions/  # Arquivos de migração
│   ├── env.py
│   └── script.py.mako
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
├── pyproject.toml  # ou requirements.txt
└── README.md
```

### 5.2 Frontend (hsgrowth-sistema)

```
hsgrowth-sistema/
├── src/
│   ├── components/
│   │   ├── Kanban/
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanList.tsx
│   │   │   └── KanbanCard.tsx
│   │   ├── List/
│   │   │   ├── ListView.tsx
│   │   │   └── ListTable.tsx
│   │   ├── Calendar/
│   │   │   └── CalendarView.tsx
│   │   ├── Gamification/
│   │   │   ├── GamificationDashboard.tsx
│   │   │   ├── RankingList.tsx
│   │   │   ├── BadgesList.tsx
│   │   │   └── PointsHistory.tsx
│   │   ├── Automations/
│   │   │   ├── AutomationBuilder.tsx
│   │   │   ├── AutomationList.tsx
│   │   │   ├── TriggerSelector.tsx
│   │   │   ├── ActionSelector.tsx
│   │   │   └── FieldMapping.tsx
│   │   ├── Transfers/
│   │   │   ├── TransferModal.tsx
│   │   │   ├── TransferHistory.tsx
│   │   │   └── TransferTimeline.tsx
│   │   ├── Commissions/
│   │   │   ├── CommissionDashboard.tsx
│   │   │   ├── CommissionApproval.tsx
│   │   │   └── CommissionReport.tsx
│   │   ├── Forms/
│   │   │   ├── CardForm.tsx
│   │   │   ├── BoardForm.tsx
│   │   │   └── LoginForm.tsx
│   │   ├── Common/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Loading.tsx
│   │   └── ...
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── BoardDetail.tsx
│   │   ├── Reports.tsx
│   │   ├── Admin.tsx
│   │   ├── Login.tsx
│   │   └── 404.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useBoard.ts
│   │   ├── useCard.ts
│   │   └── useFetch.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── boardStore.ts
│   │   ├── cardStore.ts
│   │   └── uiStore.ts
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── boards.ts
│   │   ├── cards.ts
│   │   ├── reports.ts
│   │   ├── gamification.ts
│   │   ├── automations.ts
│   │   ├── transfers.ts
│   │   └── commissions.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── api.ts
│   │   └── models.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   ├── storage.ts
│   │   └── errors.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── variables.css
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .dockerignore
├── Dockerfile
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── package.json
└── README.md
```

---

## 6. FLUXO DE DADOS

### 6.1 Requisição HTTP

```
1. Cliente envia requisição HTTP
   GET /api/v1/boards/1/cards
   Header: Authorization: Bearer <JWT_TOKEN>

2. Nginx (Load Balancer) recebe
   - Valida HTTPS/TLS
   - Roteia para instância disponível

3. FastAPI recebe (via Uvicorn ASGI)
   - Middleware de logging
   - Middleware de rate limiting
   - Dependency injection de autenticação
   - Validação automática (Pydantic)

4. Controller processa
   - Extrai parâmetros
   - Chama Service

5. Service executa lógica de negócio
   - Validação
   - Autorização
   - Chama Repository

6. Repository acessa dados
   - SQLAlchemy ORM
   - Query ao PostgreSQL
   - Retorna dados (models)

7. Service processa resultado
   - Formata resposta
   - Retorna para Controller

8. Controller envia resposta
   - JSON com dados
   - Status 200 OK

9. Cliente recebe
   - Processa JSON
   - Atualiza UI
```

---

## 7. AUTENTICAÇÃO E AUTORIZAÇÃO

### 7.1 Fluxo JWT - Vendedor

```
1. Vendedor faz login
   POST /api/v1/auth/login
   { email, password }

2. API valida credenciais
   - Busca usuário por email
   - Compara password com hash

3. API gera JWT tokens
   - Access Token (24h)
   - Refresh Token (7 dias)

4. Cliente armazena tokens
   - Access Token: localStorage ou sessionStorage
   - Refresh Token: httpOnly cookie

5. Cliente envia Access Token em requisições
   Authorization: Bearer <ACCESS_TOKEN>

6. API valida token
   - Verifica assinatura
   - Verifica expiração
   - Extrai user_id, role, permissions

7. Middleware de autorização
   - Verifica role do usuário
   - Verifica permissões específicas
   - Permite ou nega acesso
```

### 7.2 Fluxo OAuth2 - Sistema Externo

```
1. Sistema externo solicita token
   POST /api/v1/auth/client-credentials
   { client_id, client_secret }

2. API valida credenciais
   - Busca client por client_id
   - Compara client_secret com hash

3. API gera JWT token
   - Access Token (1h)
   - Escopo limitado

4. Sistema externo armazena token

5. Sistema externo envia token em requisições
   Authorization: Bearer <ACCESS_TOKEN>

6. API valida token
   - Verifica assinatura
   - Verifica expiração
   - Extrai client_id, scopes

7. Middleware de autorização
   - Verifica scopes
   - Permite ou nega acesso
```

---

## 8. CACHING

### 8.1 Estratégia de Cache

```
Cache em Memória (cachetools):
- Dados frequentemente acessados
- TTL: 1 hora (padrão)
- Invalidação: ao atualizar dados

Exemplos:
- boards:account_id:1 (lista de quadros)
- cards:board_id:1 (cartões do quadro)
- kpis:account_id:1 (KPIs calculados)
- users:account_id:1 (usuários da conta)
```

---

## 9. LOGGING E MONITORAMENTO

### 9.1 Níveis de Log

```
DEBUG: Informações detalhadas para debug
INFO: Informações gerais (login, criação de cartão)
WARN: Avisos (taxa de limite atingida)
ERROR: Erros (validação falhou, DB error)
FATAL: Erros críticos (sistema indisponível)
```

### 9.2 Formato de Log

```json
{
  \"timestamp\": \"2025-12-08T10:30:45Z\",
  \"level\": \"INFO\",
  \"service\": \"hsgrowth-api\",
  \"message\": \"Card created\",
  \"userId\": 123,
  \"cardId\": 456,
  \"duration\": 125,
  \"ip\": \"192.168.1.1\"
}
```

---

## 10. TRATAMENTO DE ERROS

### 10.1 Códigos de Status HTTP

```
200 OK: Sucesso
201 Created: Recurso criado
204 No Content: Sucesso sem conteúdo
400 Bad Request: Validação falhou
401 Unauthorized: Não autenticado
403 Forbidden: Sem permissão
404 Not Found: Recurso não encontrado
409 Conflict: Conflito (ex: duplicata)
422 Unprocessable Entity: Dados inválidos
429 Too Many Requests: Rate limit atingido
500 Internal Server Error: Erro do servidor
503 Service Unavailable: Serviço indisponível
```

### 10.2 Formato de Erro

```json
{
  \"error\": {
    \"code\": \"VALIDATION_ERROR\",
    \"message\": \"Validation failed\",
    \"details\": [
      {
        \"field\": \"email\",
        \"message\": \"Invalid email format\"
      }
    ]
  }
}
```

---

## 11. DEPLOYMENT

### 11.1 Dockerfile - Backend

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Expor porta da API
EXPOSE 8000

# Comando para rodar a aplicação
CMD [\"uvicorn\", \"app.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]
```

### 11.2 Dockerfile - Frontend

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD [\"nginx\", \"-g\", \"daemon off;\"]
```

### 11.3 Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: hsgrowth
      POSTGRES_USER: hsgrowth
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - \"5432:5432\"

  api:
    build: ./hsgrowth-api
    environment:
      DATABASE_URL: postgresql://hsgrowth:password@postgres:5432/hsgrowth
      JWT_SECRET: your-secret-key
      JWT_ALGORITHM: HS256
      ENVIRONMENT: development
    ports:
      - \"8000:8000\"
    depends_on:
      - postgres
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./hsgrowth-sistema
    ports:
      - \"5173:80\"
    depends_on:
      - api

volumes:
  postgres_data:
```

---

## 12. DECISÕES ARQUITETURAIS

### 12.1 Por que PostgreSQL?

- Relacional (melhor para dados estruturados)
- ACID transactions (integridade de dados)
- Suporta JSON (flexibilidade)
- Escalável (replicação, particionamento)
- Open source (sem custos de licença)

### 12.2 Por que FastAPI?

- Performance excepcional (comparável a Node.js/Go)
- Type hints nativos do Python (validação automática com Pydantic)
- Documentação automática OpenAPI/Swagger
- Async/await nativo (alto desempenho)
- Desenvolvimento rápido e intuitivo
- Comunidade ativa e crescente

### 12.3 Por que SQLAlchemy ORM?

- ORM maduro e confiável (mais de 15 anos)
- Type hints completos (suporte a mypy/pyright)
- Query builder poderoso e flexível
- Suporta múltiplos bancos de dados
- Migrations robustas com Alembic
- Performance otimizada
- Documentação excelente

### 12.4 Por que React + TypeScript?

- Componentes reutilizáveis
- Type safety (menos bugs)
- Grande comunidade
- Ecossistema maduro
- Performance otimizada

---

## 13. WORKERS E PROCESSAMENTO ASSÍNCRONO

### 13.1 Job Queue (Celery)

**Descrição**: Sistema usa Celery para processamento assíncrono e não bloqueante.

**Configuração do Celery**:
```python
# workers/celery_app.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "hsgrowth",
    broker=settings.CELERY_BROKER_URL,  # Redis ou RabbitMQ
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Sao_Paulo',
    enable_utc=True,
)
```

**Definição de Task**:
```python
# tasks/automation_tasks.py
from workers.celery_app import celery_app
from services.automation_service import AutomationService

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=30  # 30 segundos
)
def execute_automation(self, automation_id: int, card_id: int, triggered_by: int):
    """
    Task para executar automação de forma assíncrona.
    """
    try:
        automation_service = AutomationService()
        result = automation_service.execute(automation_id, card_id)
        return {"success": True, "result": result}
    except Exception as exc:
        # Celery vai fazer retry automaticamente
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))
```

**Disparar Task**:
```python
# Em qualquer lugar do código
from tasks.automation_tasks import execute_automation

# Execução assíncrona
execute_automation.delay(
    automation_id=123,
    card_id=456,
    triggered_by=789
)

# Ou com opções específicas
execute_automation.apply_async(
    args=[123, 456, 789],
    countdown=60  # Executar depois de 60 segundos
)
```

### 13.2 Tipos de Jobs

| Job | Descrição | Trigger | Frequência |
|-----|-----------|---------|-----------|
| **automation.execute** | Executar automação | Movimento de cartão | Em demanda |
| **automation.retry** | Retentar automação falhada | Falha de automação | Backoff exponencial |
| **notification.send** | Enviar notificações | Várias ações | Em demanda |
| **report.generate** | Gerar relatório pesado | Solicitação do usuário | Em demanda |

### 13.3 Retry Strategy

**Backoff Exponencial no Celery**:
```python
@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=30  # Base: 30 segundos
)
def execute_automation(self, automation_id: int, card_id: int, triggered_by: int):
    try:
        # ... lógica da automação
        pass
    except Exception as exc:
        # Backoff exponencial: 30s, 2min (30s * 4), 5min (30s * 10)
        retry_countdown = 30 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=retry_countdown)

# Resultado:
# Tentativa 1: imediato
# Tentativa 2: após 30s
# Tentativa 3: após 2min (30s * 4)
# Tentativa 4: após 5min (30s * 10)
```

**Tratamento de Falha Permanente**:
```python
# tasks/automation_tasks.py
from workers.celery_app import celery_app
from celery.signals import task_failure

@task_failure.connect
def handle_task_failure(sender=None, task_id=None, exception=None, args=None, **kwargs):
    """
    Signal handler chamado quando uma task falha permanentemente (após todas as retries).
    """
    if sender.name == 'execute_automation':
        automation_id = args[0] if args else None

        # Notificar admin
        NotificationService.notify_admin({
            'type': 'AUTOMATION_FAILED',
            'automation_id': automation_id,
            'error': str(exception),
            'task_id': task_id
        })
```

---

## 14. CRON JOBS E TAREFAS AGENDADAS

### 14.1 Scheduler (APScheduler)

**Descrição**: Sistema usa APScheduler para executar tarefas periódicas.

```python
# workers/scheduled_tasks.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from services.gamification_service import GamificationService
from loguru import logger

scheduler = AsyncIOScheduler()

# Atualizar rankings a cada 5 minutos
@scheduler.scheduled_job(CronTrigger(minute='*/5'))
async def update_rankings():
    """Atualiza cache de rankings a cada 5 minutos"""
    logger.info("[CRON] Atualizando rankings...")
    await GamificationService.update_rankings()
    logger.info("[CRON] Rankings atualizados com sucesso")

@scheduler.scheduled_job(CronTrigger(day_of_week='sun', hour=0, minute=0))
async def reset_weekly_ranking():
    """Reset ranking semanal (domingo à meia-noite)"""
    logger.info("[CRON] Resetando ranking semanal...")
    await GamificationService.reset_weekly_ranking()

@scheduler.scheduled_job(CronTrigger(day=1, hour=0, minute=0))
async def reset_monthly_ranking():
    """Reset ranking mensal (dia 1 à meia-noite)"""
    logger.info("[CRON] Resetando ranking mensal...")
    await GamificationService.reset_monthly_ranking()

@scheduler.scheduled_job(CronTrigger(minute='*/5'))
async def check_automatic_badges():
    """Verificar badges automáticas (a cada 5 minutos)"""
    logger.info("[CRON] Verificando badges automáticas...")
    await GamificationService.check_automatic_badges()

@scheduler.scheduled_job(CronTrigger(hour=8, minute=0))
async def send_due_card_notifications():
    """Verificar cartões vencidos (todo dia às 8h)"""
    logger.info("[CRON] Enviando notificações de cartões vencidos...")
    await NotificationService.send_due_card_notifications()

@scheduler.scheduled_job(CronTrigger(hour=3, minute=0))
async def clean_old_logs():
    """Limpar logs antigos (todo dia às 3h)"""
    logger.info("[CRON] Limpando logs antigos...")
    await AuditService.clean_old_logs()

# Iniciar o scheduler (no main.py)
# scheduler.start()
```

### 14.2 Lista Completa de Cron Jobs

| Cron Job | Frequência | Horário | Descrição |
|----------|-----------|---------|-----------|
| **ranking.update** | A cada 5 min | */5 * * * * | Atualiza cache de rankings |
| **badges.check_automatic** | A cada 5 min | */5 * * * * | Verifica e concede badges automáticas |
| **ranking.reset.weekly** | Semanal | Dom 00:00 | Reset ranking semanal |
| **ranking.reset.monthly** | Mensal | Dia 1 00:00 | Reset ranking mensal |
| **ranking.reset.quarterly** | Trimestral | 01/01, 04/01, 07/01, 10/01 | Reset ranking trimestral |
| **ranking.reset.annual** | Anual | 01/01 00:00 | Reset ranking anual |
| **notifications.due_cards** | Diário | 08:00 | Notificações de cartões vencidos |
| **notifications.overdue** | Diário | 09:00 | Notificações de cartões atrasados |
| **audit.cleanup** | Diário | 03:00 | Limpar logs > 1 ano |
| **cache.cleanup** | A cada hora | 0 * * * * | Limpar cache expirado |
| **backup.database** | Diário | 02:00 | Backup do banco de dados |

### 14.3 Monitoramento de Cron Jobs

```python
# workers/scheduled_tasks.py
from functools import wraps
import time
from loguru import logger

def monitored_job(job_name: str):
    """
    Decorator para monitorar execução de cron jobs.
    Adiciona logging e tratamento de erros.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.time()
            logger.info(f"[CRON] Iniciando: {job_name}")

            try:
                result = await func(*args, **kwargs)
                duration = (time.time() - start) * 1000  # em ms
                logger.info(f"[CRON] Concluído: {job_name} ({duration:.0f}ms)")
                return result
            except Exception as error:
                logger.error(f"[CRON] Falhou: {job_name}", exc_info=True)
                await NotificationService.notify_admin({
                    'type': 'CRON_FAILED',
                    'job': job_name,
                    'error': str(error)
                })
                raise
        return wrapper
    return decorator

# Uso
@scheduler.scheduled_job(CronTrigger(minute='*/5'))
@monitored_job('ranking.update')
async def update_rankings():
    await GamificationService.update_rankings()
```

---

## 14.4 Verificação de Badges Automáticas

**Descrição**: Cron job que verifica e concede badges automáticas baseadas em critérios definidos pelo Admin.

**Frequência**: A cada 5 minutos (*/5 * * * *)

**Lógica do Worker**:

```python
# workers/scheduled_tasks.py
from apscheduler.triggers.cron import CronTrigger

@scheduler.scheduled_job(CronTrigger(minute='*/5'))
@monitored_job('badges.check_automatic')
async def check_automatic_badges():
    await GamificationService.check_automatic_badges()
```

**Implementação do Service**:

```python
# services/gamification_service.py
from sqlalchemy.orm import Session
from models.gamification import GamificationBadge, UserBadge
from models.user import User

class GamificationService:

    def __init__(self, db: Session):
        self.db = db

    async def check_automatic_badges(self) -> None:
        """Verifica e concede badges automáticas baseadas em critérios"""
        # 1. Buscar todas as badges automáticas ativas
        automatic_badges = self.db.query(GamificationBadge).filter(
            GamificationBadge.criteria_type == 'automatic',
            GamificationBadge.is_active == True
        ).all()

        # 2. Para cada badge automática, verificar critérios
        for badge in automatic_badges:
            await self.check_badge_criteria(badge)


  async checkBadgeCriteria(badge: Badge): Promise<void> {
    // Parsear critério (ex: "total_points >= 10000")
    const criteria = this.parseCriteria(badge.criteria);

    // Buscar usuários que atendem o critério e NÃO possuem a badge
    const eligibleUsers = await this.getEligibleUsers(criteria, badge.id);

    // Conceder badge para usuários elegíveis
    for (const user of eligibleUsers) {
      await this.awardBadge(user.id, badge.id, null); // null = automático

      // Enviar notificação
      await NotificationService.send({
        userId: user.id,
        type: 'badge_earned',
        title: `Você conquistou a badge: ${badge.name}!`,
        message: badge.description,
        badgeId: badge.id
      });
    }
  }

  parseCriteria(criteriaString: string): Criteria {
    // Exemplos de critérios suportados (MVP):
    // - "total_points >= 10000"
    // - "rank == 1 AND period == 'monthly'"
    // - "sales_count >= 50"

    // Parser simples para MVP
    const parts = criteriaString.split(' ');
    return {
      field: parts[0],      // ex: "total_points"
      operator: parts[1],   // ex: ">="
      value: parts[2]       // ex: "10000"
    };
  }

  async getEligibleUsers(criteria: Criteria, badgeId: number): Promise<User[]> {
    // Query baseada no critério
    if (criteria.field === 'total_points') {
      // Buscar usuários com pontos suficientes que NÃO possuem a badge
      return await prisma.$queryRaw`
        SELECT u.id, u.name, u.email, SUM(gp.points) as total_points
        FROM users u
        JOIN gamification_points gp ON gp.user_id = u.id
        LEFT JOIN user_badges ub ON ub.user_id = u.id AND ub.badge_id = ${badgeId}
        WHERE ub.id IS NULL
        GROUP BY u.id
        HAVING SUM(gp.points) ${criteria.operator} ${criteria.value}
      `;
    }

    if (criteria.field === 'rank') {
      // Buscar usuários no ranking que NÃO possuem a badge
      return await prisma.$queryRaw`
        SELECT u.id, u.name, u.email, gr.rank
        FROM users u
        JOIN gamification_rankings gr ON gr.user_id = u.id
        LEFT JOIN user_badges ub ON ub.user_id = u.id AND ub.badge_id = ${badgeId}
        WHERE ub.id IS NULL
          AND gr.rank ${criteria.operator} ${criteria.value}
          AND gr.period = ${criteria.period}
          AND gr.year = YEAR(NOW())
          AND gr.period_number = /* período atual */
      `;
    }

    // Adicionar mais tipos de critérios conforme necessário
  }
}
```

**Critérios Suportados (MVP)**:

| Tipo | Exemplo | Query |
|------|---------|-------|
| **Pontos Totais** | `total_points >= 10000` | `SUM(gamification_points.points) >= 10000` |
| **Ranking** | `rank == 1 AND period == 'monthly'` | `gamification_rankings.rank = 1 AND period = 'monthly'` |
| **Vendas** | `sales_count >= 50` | `COUNT(cards WHERE status = 'Venda Fechada') >= 50` |

**Critérios Futuros** (Pós-MVP):
- Sequências: `consecutive_days_leads >= 7`
- Transferências: `successful_transfers >= 10`
- Taxa de conversão: `conversion_rate >= 0.8`

**Performance**:
- Query otimizada com índices
- Apenas verifica usuários que NÃO possuem a badge (LEFT JOIN)
- Execução rápida (< 1 segundo para 1000 usuários)

**Logs**:
```typescript
logger.info('[CRON] badges.check_automatic: Verificando badges automáticas');
logger.info(`[CRON] Badges ativas encontradas: ${automaticBadges.length}`);
logger.info(`[CRON] Badge "${badge.name}": ${eligibleUsers.length} usuários elegíveis`);
logger.info(`[CRON] Badge "${badge.name}" concedida a ${user.name}`);
logger.info('[CRON] badges.check_automatic: Concluído em 850ms');
```

---

## 15. PROCESSAMENTO EM BACKGROUND

### 15.1 Fluxo de Automação Assíncrona

```
1. Vendedor move cartão para "Venda Fechada"
   ↓
2. API detecta movimento
   ↓
3. API busca automações ativas com trigger correspondente
   Query: SELECT * FROM automations
          WHERE trigger_type = 'card_moved'
            AND trigger_list_id = 5
            AND is_active = true
          ORDER BY priority DESC, created_at ASC
   ↓
4. API ordena automações por prioridade (maior primeiro)
   Exemplo:
   - Automação A (priority 100) → Executa 1º
   - Automação B (priority 80)  → Executa 2º
   - Automação C (priority 50)  → Executa 3º
   ↓
5. API adiciona jobs à fila na ordem de prioridade (não espera execução)
   ↓
6. API retorna sucesso 200 OK para vendedor
   (Vendedor não espera automação executar)
   ↓
7. Worker pega job da fila (ordem de prioridade mantida)
   ↓
8. Worker executa automação sequencialmente:
   - Valida permissões
   - Copia/move cartão para quadro destino
   - Mapeia campos
   - Cria novo cartão
   - Timeout: 30 segundos por automação
   ↓
9. Worker registra resultado em automation_executions
   ↓
10. Se falha → retry automático (3 tentativas com backoff exponencial)
    ↓
11. Se sucesso → notifica responsável do cartão destino
    ↓
12. Worker pega próxima automação da fila (próxima prioridade)
```

**Código de Ordenação de Automações**:

```typescript
// services/AutomationService.ts
async function getTriggeredAutomations(
  trigger_type: string,
  trigger_list_id: number
): Promise<Automation[]> {

  const automations = await prisma.automations.findMany({
    where: {
      trigger_type,
      trigger_list_id,
      is_active: true
    },
    orderBy: [
      { priority: 'desc' },  // Maior prioridade primeiro
      { created_at: 'asc' }  // Mais antiga primeiro (desempate)
    ]
  });

  return automations;
}

// Adicionar jobs à fila na ordem de prioridade
async function enqueueAutomations(automations: Automation[], cardId: number) {
  for (const automation of automations) {
    await queue.add('execute-automation', {
      automationId: automation.id,
      cardId: cardId,
      priority: automation.priority, // Mantém prioridade no job
      timestamp: Date.now()
    }, {
      priority: automation.priority, // Bull queue usa isso para ordenar
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }
}
```

**Vantagens da Priorização**:
- ✅ Não bloqueia operação do usuário
- ✅ Controle de ordem de execução
- ✅ Notificações críticas executam primeiro
- ✅ Retry automático em caso de falha
- ✅ Escalável (múltiplos workers)
- ✅ Rastreável (histórico de execuções)
- ✅ Previsível (ordem determinística)

---

### 15.2 Automações Agendadas (Scheduled)

**Descrição**: Sistema de automações que executam por tempo/data (não por eventos).

**Tipos Suportados**:
1. **Execução Única**: Roda uma vez em data/hora específica
2. **Execução Recorrente**: Diária, semanal, mensal ou anual

#### 15.2.1 Estrutura de Dados

```typescript
// Tipos de configuração de agendamento
interface ScheduleConfigOnce {
  datetime: string; // ISO 8601: "2026-01-15T09:00:00Z"
}

interface ScheduleConfigRecurring {
  frequency: 'daily' | 'weekly' | 'monthly' | 'annual';
  time: string; // "HH:mm" (ex: "08:00")
  day_of_week?: number; // 1-7 (1=segunda, 7=domingo) - apenas weekly
  day_of_month?: number; // 1-31 - apenas monthly
  month?: number; // 1-12 - apenas annual
  day?: number; // 1-31 - apenas annual
}

type ScheduleConfig = ScheduleConfigOnce | ScheduleConfigRecurring;

// Model Prisma
model Automation {
  id: number;
  automation_type: 'trigger' | 'scheduled';
  schedule_type?: 'once' | 'recurring';
  schedule_config?: ScheduleConfig;
  next_execution_at?: Date;
  last_executed_at?: Date;
  // ... outros campos
}
```

#### 15.2.2 Cron Job - Processador de Automações Agendadas

**Frequência**: Roda a cada **1 minuto**

```typescript
// jobs/processScheduledAutomations.ts
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { AutomationService } from '../services/AutomationService';

const prisma = new PrismaClient();

// Roda a cada 1 minuto
cron.schedule('* * * * *', async () => {
  console.log('[CRON] Processando automações agendadas...');

  try {
    // Buscar automações que devem executar agora
    const automations = await prisma.automations.findMany({
      where: {
        automation_type: 'scheduled',
        is_active: true,
        next_execution_at: {
          lte: new Date() // <= agora
        }
      },
      orderBy: {
        next_execution_at: 'asc' // Mais antigas primeiro
      }
    });

    console.log(`[CRON] ${automations.length} automações para executar`);

    for (const automation of automations) {
      try {
        // Executar automação
        await AutomationService.executeScheduledAutomation(automation);

        // Registrar execução
        await prisma.automation_executions.create({
          data: {
            automation_id: automation.id,
            status: 'success',
            triggered_by: 'schedule',
            executed_at: new Date()
          }
        });

        // Atualizar próxima execução
        if (automation.schedule_type === 'once') {
          // Execução única: Desativar automação
          await prisma.automations.update({
            where: { id: automation.id },
            data: {
              is_active: false,
              next_execution_at: null,
              last_executed_at: new Date()
            }
          });
          console.log(`[CRON] Automação ${automation.id} (única) desativada`);

        } else if (automation.schedule_type === 'recurring') {
          // Execução recorrente: Calcular próxima execução
          const nextExecution = calculateNextExecution(
            automation.schedule_config as ScheduleConfigRecurring
          );

          await prisma.automations.update({
            where: { id: automation.id },
            data: {
              next_execution_at: nextExecution,
              last_executed_at: new Date()
            }
          });
          console.log(
            `[CRON] Automação ${automation.id} agendada para ${nextExecution}`
          );
        }

      } catch (error) {
        console.error(`[CRON] Erro ao executar automação ${automation.id}:`, error);

        // Registrar falha
        await prisma.automation_executions.create({
          data: {
            automation_id: automation.id,
            status: 'failed',
            triggered_by: 'schedule',
            error_message: error.message,
            executed_at: new Date()
          }
        });

        // Automações agendadas NÃO são desativadas por falha
        // Apenas recalcula próxima execução se recorrente
        if (automation.schedule_type === 'recurring') {
          const nextExecution = calculateNextExecution(
            automation.schedule_config as ScheduleConfigRecurring
          );

          await prisma.automations.update({
            where: { id: automation.id },
            data: {
              next_execution_at: nextExecution,
              last_executed_at: new Date()
            }
          });
        }

        // Enviar notificação de falha (segue RN-124.1)
        await AutomationService.handleFailureNotification(automation.id, error);
      }
    }

  } catch (error) {
    console.error('[CRON] Erro no processamento de automações agendadas:', error);
  }
});
```

#### 15.2.3 Cálculo de Próxima Execução

```typescript
// utils/scheduleCalculator.ts
import { ScheduleConfigRecurring } from '../types/automation';

export function calculateNextExecution(config: ScheduleConfigRecurring): Date {
  const now = new Date();
  const [hour, minute] = config.time.split(':').map(Number);

  switch (config.frequency) {
    case 'daily': {
      // Próximo dia às HH:mm
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);

      // Se já passou hoje, agendar para amanhã
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      return next;
    }

    case 'weekly': {
      // Próxima ocorrência do dia da semana às HH:mm
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);

      const currentDayOfWeek = next.getDay() || 7; // 0=domingo → 7
      const targetDayOfWeek = config.day_of_week!;
      const daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7;

      if (daysUntilTarget === 0 && next <= now) {
        // Mesmo dia mas já passou, agendar para próxima semana
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + daysUntilTarget);
      }

      return next;
    }

    case 'monthly': {
      // Próximo dia X do mês às HH:mm
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);

      let targetDay = config.day_of_month!;
      const daysInMonth = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0
      ).getDate();

      // Se dia não existe no mês (ex: 31 em fevereiro), usar último dia
      if (targetDay > daysInMonth) {
        targetDay = daysInMonth;
      }

      next.setDate(targetDay);

      // Se já passou este mês, próximo mês
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);

        // Recalcular dias no novo mês
        const newDaysInMonth = new Date(
          next.getFullYear(),
          next.getMonth() + 1,
          0
        ).getDate();
        if (targetDay > newDaysInMonth) {
          next.setDate(newDaysInMonth);
        }
      }

      return next;
    }

    case 'annual': {
      // Próxima ocorrência de DD/MM às HH:mm
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);
      next.setMonth(config.month! - 1); // month é 1-12, Date usa 0-11
      next.setDate(config.day!);

      // Se já passou este ano, próximo ano
      if (next <= now) {
        next.setFullYear(next.getFullYear() + 1);
      }

      return next;
    }

    default:
      throw new Error(`Frequência inválida: ${config.frequency}`);
  }
}
```

#### 15.2.4 Validação ao Criar Automação Agendada

```typescript
// services/AutomationService.ts
async function createScheduledAutomation(data: CreateScheduledAutomationDTO) {
  // Validar limite de 50 automações ativas
  const activeCount = await prisma.automations.count({
    where: {
      account_id: data.account_id,
      is_active: true
    }
  });

  if (activeCount >= 50) {
    throw new Error('Limite de 50 automações ativas atingido');
  }

  // Validar configuração de agendamento
  if (data.schedule_type === 'once') {
    const datetime = new Date(data.schedule_config.datetime);
    if (datetime <= new Date()) {
      throw new Error('Data/hora de execução deve ser no futuro');
    }
  } else if (data.schedule_type === 'recurring') {
    validateRecurringConfig(data.schedule_config);
  }

  // Calcular next_execution_at
  const next_execution_at = data.schedule_type === 'once'
    ? new Date(data.schedule_config.datetime)
    : calculateNextExecution(data.schedule_config);

  // Criar automação
  const automation = await prisma.automations.create({
    data: {
      ...data,
      automation_type: 'scheduled',
      next_execution_at,
      // Campos de trigger devem ser NULL
      trigger_type: null,
      trigger_board_id: null,
      trigger_list_id: null,
      trigger_conditions: null
    }
  });

  return automation;
}
```

**Observações**:
- Cron job roda a cada 1 minuto (granularidade mínima)
- Todos os horários salvos em UTC no banco
- Interface exibe horários no timezone do usuário
- Falhas não desativam automações agendadas
- Limite de 50 automações por conta (soma trigger + scheduled)

---

## 16. SERVIÇO DE EMAIL (SMTP)

### 16.1 Configuração Microsoft 365

**Provider**: Microsoft 365 SMTP
**Email**: ti@healthsafetytech.com

**Variáveis de Ambiente (.env)**:

```bash
# Email Configuration (Microsoft 365)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ti@healthsafetytech.com
SMTP_PASSWORD=SuaSenhaSeguraAqui
SMTP_FROM=ti@healthsafetytech.com
SMTP_FROM_NAME=Sistema CRM HSGrowth

# Email Settings
EMAIL_ENABLED=true
EMAIL_FAILURE_THRESHOLD=3
EMAIL_GROUP_THRESHOLD=5
```

**Dependências**:

```bash
npm install nodemailer
npm install @types/nodemailer --save-dev
```

---

### 16.2 Implementação do EmailService

```typescript
// services/EmailService.ts
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

class EmailService {
  private transporter: Transporter;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.EMAIL_ENABLED === 'true';

    if (!this.enabled) {
      logger.warn('[Email] Serviço de email desabilitado');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // false for TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Verificar conexão
    this.transporter.verify((error) => {
      if (error) {
        logger.error('[Email] Erro ao conectar ao SMTP:', error);
      } else {
        logger.info('[Email] Conectado ao SMTP Microsoft 365');
      }
    });
  }

  async sendAutomationFailureEmail(params: {
    to: string;
    automationName: string;
    automationId: number;
    errorMessage: string;
    failureCount: number;
    cardId?: number;
    cardTitle?: string;
    timestamp: Date;
  }): Promise<void> {

    if (!this.enabled) {
      logger.debug('[Email] Email desabilitado, pulando envio');
      return;
    }

    const { to, automationName, automationId, errorMessage, failureCount, cardId, cardTitle, timestamp } = params;

    const subject = failureCount >= 10
      ? `🔴 Automação "${automationName}" foi desativada`
      : `🔴 Automação "${automationName}" falhou ${failureCount} vezes`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; border-radius: 0 0 5px 5px; text-align: center; font-size: 12px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .error-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 10px; margin: 10px 0; }
          .info-box { background: #e0f2fe; border-left: 4px solid #0284c7; padding: 10px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔴 Falha de Automação</h2>
          </div>
          <div class="content">
            <h3>Automação: ${automationName}</h3>

            <div class="error-box">
              <strong>Erro:</strong> ${errorMessage}
            </div>

            <div class="info-box">
              <strong>Número de falhas:</strong> ${failureCount}<br>
              <strong>Última falha:</strong> ${timestamp.toLocaleString('pt-BR')}<br>
              ${cardId ? `<strong>Cartão afetado:</strong> #${cardId} - ${cardTitle || 'Sem título'}<br>` : ''}
              ${failureCount >= 10 ? '<strong>Status:</strong> ⚠️ Automação foi desativada automaticamente' : ''}
            </div>

            <h4>Ação Recomendada:</h4>
            <ul>
              <li>Verifique se a lista ou quadro de destino foi deletado</li>
              <li>Confirme se você tem permissão nos quadros envolvidos</li>
              <li>Edite a automação para corrigir a configuração</li>
              <li>Ou desative a automação temporariamente</li>
            </ul>

            <a href="https://crm.healthsafetytech.com/automations/${automationId}/executions" class="button">Ver Detalhes no Sistema</a>
          </div>
          <div class="footer">
            <p>Este é um email automático do Sistema CRM HSGrowth</p>
            <p>Para alterar configurações de notificação, acesse Configurações → Notificações</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html,
    };

    // Tentar enviar email (com retry)
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        await this.transporter.sendMail(mailOptions);
        logger.info(`[Email] Email de falha enviado para ${to}`);
        return;
      } catch (error) {
        attempts++;
        logger.error(`[Email] Tentativa ${attempts} falhou:`, error);

        if (attempts < maxAttempts) {
          // Aguardar 1 minuto antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    logger.error(`[Email] Falha ao enviar email após ${maxAttempts} tentativas`);
    // Não bloquear o sistema, apenas registrar
  }

  async sendGroupedFailuresEmail(params: {
    to: string;
    failures: Array<{
      automationName: string;
      automationId: number;
      errorMessage: string;
      failureCount: number;
    }>;
    period: string; // "última hora"
  }): Promise<void> {

    if (!this.enabled) return;

    const { to, failures, period } = params;
    const totalFailures = failures.length;

    const subject = `🔴 ${totalFailures} automações falharam na ${period}`;

    const failuresList = failures.map((f, idx) => `
      <li>
        <strong>${idx + 1}. ${f.automationName}</strong><br>
        Erro: ${f.errorMessage}<br>
        Falhas: ${f.failureCount}x
      </li>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">🔴 Múltiplas Automações Falharam</h2>
          <p><strong>${totalFailures} automações</strong> falharam na ${period}:</p>
          <ol style="line-height: 1.8;">
            ${failuresList}
          </ol>
          <p>Recomendamos revisar as automações e corrigir os problemas.</p>
          <a href="https://crm.healthsafetytech.com/automations" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Todas as Automações</a>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
        to,
        subject,
        html,
      });
      logger.info(`[Email] Email agrupado enviado para ${to} (${totalFailures} falhas)`);
    } catch (error) {
      logger.error('[Email] Erro ao enviar email agrupado:', error);
    }
  }
}

export default new EmailService();
```

---

### 16.3 Integração com Automações

```typescript
// workers/automationWorker.ts
import EmailService from '../services/EmailService';
import NotificationService from '../services/NotificationService';

async function handleAutomationFailure(
  automation: Automation,
  error: Error,
  cardId?: number
) {

  const failureCount = await getFailureCountInLastHour(automation.id);

  // 1. SEMPRE enviar notificação in-app
  await NotificationService.send({
    userId: automation.created_by,
    type: 'automation_failed',
    title: `Automação "${automation.name}" falhou`,
    message: `Erro: ${error.message}`,
    link: `/automations/${automation.id}/executions`,
    actions: [
      { label: 'Ver Detalhes', url: `/automations/${automation.id}/executions` },
      { label: 'Desativar', action: 'disable_automation', automationId: automation.id }
    ]
  });

  // Notificar Admin também
  const admins = await getAdminUsers();
  for (const admin of admins) {
    await NotificationService.send({
      userId: admin.id,
      type: 'automation_failed',
      title: `Automação "${automation.name}" falhou`,
      message: `Erro: ${error.message}`,
      link: `/automations/${automation.id}/executions`
    });
  }

  // 2. Verificar se deve enviar EMAIL
  const shouldSendEmail = (
    failureCount >= parseInt(process.env.EMAIL_FAILURE_THRESHOLD || '3') ||
    error.statusCode === 403 || // Permissão negada
    error.statusCode === 404 || // Lista/quadro não existe
    failureCount >= 10 // Desativação automática
  );

  if (shouldSendEmail) {
    const creatorEmail = await getUserEmail(automation.created_by);
    const adminEmails = await getAdminEmails();

    await EmailService.sendAutomationFailureEmail({
      to: [creatorEmail, ...adminEmails].join(','),
      automationName: automation.name,
      automationId: automation.id,
      errorMessage: error.message,
      failureCount,
      cardId,
      cardTitle: cardId ? await getCardTitle(cardId) : undefined,
      timestamp: new Date()
    });
  }

  // 3. Desativar automaticamente se 10+ falhas
  if (failureCount >= 10) {
    await prisma.automations.update({
      where: { id: automation.id },
      data: { is_active: false }
    });

    logger.warn(`[Automação] Automação ${automation.id} desativada automaticamente (10+ falhas)`);
  }
}
```

---

### 16.4 Cron Job para Emails Agrupados

```typescript
// workers/cronJobs.ts
cron.schedule('0 * * * *', monitored('email.grouped_failures', async () => {
  // A cada hora, verificar se há múltiplas falhas e agrupar emails

  const lastHour = new Date(Date.now() - 60 * 60 * 1000);

  const failedAutomations = await prisma.automation_executions.groupBy({
    by: ['automation_id'],
    where: {
      status: 'failed',
      executed_at: { gte: lastHour }
    },
    _count: true,
    having: {
      automation_id: { _count: { gte: 1 } }
    }
  });

  const threshold = parseInt(process.env.EMAIL_GROUP_THRESHOLD || '5');

  if (failedAutomations.length >= threshold) {
    const failures = await Promise.all(failedAutomations.map(async (f) => {
      const automation = await prisma.automations.findUnique({ where: { id: f.automation_id } });
      const lastExecution = await prisma.automation_executions.findFirst({
        where: { automation_id: f.automation_id, status: 'failed' },
        orderBy: { executed_at: 'desc' }
      });

      return {
        automationName: automation.name,
        automationId: automation.id,
        errorMessage: lastExecution.error_message,
        failureCount: f._count
      };
    }));

    const adminEmails = await getAdminEmails();

    await EmailService.sendGroupedFailuresEmail({
      to: adminEmails.join(','),
      failures,
      period: 'última hora'
    });
  }
}));
```

---

## 17. PERFORMANCE E ESCALABILIDADE

### 17.1 Estratégia de Particionamento

**Decisão**: **NÃO implementar particionamento inicialmente**.

**Justificativa**:
- HSGrowth é sistema interno (não SaaS multi-tenant)
- Volume de dados inicial é gerenciável sem particionamento
- Particionamento adiciona complexidade desnecessária no início
- Índices bem planejados são suficientes para performance

**Preparação para Futuro**:
- Todas queries incluem `account_id` em WHERE clauses
- Índices compostos começam com `account_id` quando apropriado
- Arquitetura permite adicionar particionamento sem reescrever código
- Monitoramento de performance para identificar quando particionar

**Quando Considerar Particionamento** (futuro):
- Tabela `cards` > 10 milhões de registros
- Tabela `activities` > 50 milhões de registros
- Queries lentas mesmo com índices otimizados
- Backup/restore demorando mais de 1 hora

**Estratégia Futura** (se necessário):
- **cards**: Particionamento por `account_id` (hash ou range)
- **activities**: Particionamento por `created_at` (range mensal/anual)
- **card_transfers**: Particionamento por `transferred_at` (range anual)
- **automation_executions**: Particionamento por `executed_at` (range mensal)
- **gamification_points**: Particionamento por `created_at` (range anual)

**Tabelas que NÃO precisam particionamento**:
- `users`, `boards`, `lists` (volume sempre pequeno)
- `automations`, `gamification_badges` (configurações)
- `accounts`, `field_definitions` (metadados)

**Estimativa de Crescimento sem Particionamento**:
- **Cenário conservador**: 2-3 anos de operação tranquila
- **Cenário otimista**: 5+ anos sem necessidade de particionar
- **Gatilho**: Monitorar tamanho das tabelas e query performance

---

### 17.2 Índices para Performance

**Decisão**: Implementar índices estratégicos para queries críticas.

**Índices Base** (já definidos no Doc 06):
- Todos relacionamentos (Foreign Keys)
- Queries de listagem básica
- Filtros comuns por data, status, usuário

**Índices Adicionais Estratégicos** (5 extras):

1. **Dashboard - Cartões Vencidos**:
   ```sql
   CREATE INDEX idx_cards_assigned_due ON cards(assigned_to, due_date)
   WHERE due_date IS NOT NULL;
   ```
   - Query: "Meus cartões vencidos hoje/esta semana"
   - Evita full table scan em tabela grande
   - Índice parcial (apenas cartões com due_date)

2. **Busca e Autocomplete**:
   ```sql
   CREATE INDEX idx_cards_search ON cards(account_id, name, company_name);
   ```
   - Query: Busca por nome do cartão ou empresa
   - Suporta buscas do tipo `LIKE 'texto%'`
   - Crucial para usabilidade

3. **Timeline do Cartão**:
   ```sql
   CREATE INDEX idx_activities_card_date ON activities(card_id, created_at DESC);
   ```
   - Query mais comum: Histórico de atividades do cartão
   - Ordenação DESC otimizada (atividades recentes primeiro)
   - Evita sort em memória

4. **Login e Autenticação**:
   ```sql
   CREATE INDEX idx_users_email_active ON users(email, is_active);
   ```
   - Query: Login + verificação se usuário está ativo
   - Reduz latência de autenticação
   - Crítico para UX

5. **Rankings de Gamificação**:
   ```sql
   CREATE INDEX idx_points_user_period ON gamification_points(user_id, created_at);
   ```
   - Query pesada: Calcular pontos por período
   - Executada em cron jobs frequentes
   - Melhora performance de rankings

**Monitoramento de Índices**:
- Usar `EXPLAIN ANALYZE` em queries críticas
- Monitorar uso de índices: `pg_stat_user_indexes` (PostgreSQL) ou `sys.dm_db_index_usage_stats` (MySQL)
- Remover índices não utilizados (overhead em INSERT/UPDATE)
- Adicionar novos índices conforme necessidade identificada

**Índices que NÃO são necessários** (evitar over-indexing):
- Tabelas muito pequenas (< 1000 registros)
- Colunas com baixa cardinalidade (ex: boolean)
- Colunas raramente filtradas
- Índices duplicados/redundantes

---

### 17.3 Estratégia de Cache

**Decisão**: **Cache em memória local (Node.js)** - SEM Redis.

**Justificativa**:
- Sistema interno da HSGrowth (não SaaS com alta escala)
- Foco em **zero custo adicional** de infraestrutura
- Cache em memória do Node.js é suficiente para volume interno
- Redis pode ser adicionado no futuro se realmente necessário

**Arquitetura de Cache**:
```
┌─────────────────────────────────────────┐
│      Backend Server (Node.js)           │
│  ┌────────────────────────────────────┐ │
│  │  Cache Service (node-cache)        │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │  In-Memory Cache (RAM)       │  │ │
│  │  │  - Sessions                  │  │ │
│  │  │  - Permissions               │  │ │
│  │  │  - Board Structure           │  │ │
│  │  │  - Dashboard KPIs            │  │ │
│  │  │  - Rankings                  │  │ │
│  │  └──────────────────────────────┘  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Biblioteca**: `node-cache` (NPM package)
- Simples, leve, sem dependências externas
- Cache em memória do processo Node.js
- TTL automático
- Zero custo adicional

**Implementação**:

```javascript
// services/CacheService.ts
import NodeCache from 'node-cache';

class CacheService {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // TTL padrão: 10 minutos
      checkperiod: 120, // Verifica expiração a cada 2 minutos
      useClones: false // Performance (não clonar objetos)
    });
  }

  // Sessions (TTL: 24h = 86400s)
  setSession(userId: number, data: any) {
    this.cache.set(`session:${userId}`, data, 86400);
  }

  getSession(userId: number) {
    return this.cache.get(`session:${userId}`);
  }

  // Permissões (TTL: 15min = 900s)
  setPermissions(userId: number, permissions: any) {
    this.cache.set(`permissions:${userId}`, permissions, 900);
  }

  getPermissions(userId: number) {
    return this.cache.get(`permissions:${userId}`);
  }

  // Board Structure (TTL: 5min = 300s)
  setBoardStructure(boardId: number, structure: any) {
    this.cache.set(`board:${boardId}:structure`, structure, 300);
  }

  getBoardStructure(boardId: number) {
    return this.cache.get(`board:${boardId}:structure`);
  }

  // Dashboard KPIs (TTL: 1min = 60s)
  setDashboardKPIs(userId: number, kpis: any) {
    this.cache.set(`dashboard:${userId}:kpis`, kpis, 60);
  }

  getDashboardKPIs(userId: number) {
    return this.cache.get(`dashboard:${userId}:kpis`);
  }

  // Rankings (TTL: 10min = 600s)
  setRanking(period: string, ranking: any) {
    this.cache.set(`ranking:${period}:top10`, ranking, 600);
  }

  getRanking(period: string) {
    return this.cache.get(`ranking:${period}:top10`);
  }

  // Invalidação manual
  invalidateSession(userId: number) {
    this.cache.del(`session:${userId}`);
  }

  invalidatePermissions(userId: number) {
    this.cache.del(`permissions:${userId}`);
  }

  invalidateBoardStructure(boardId: number) {
    this.cache.del(`board:${boardId}:structure`);
  }

  // Limpar tudo (útil para testes)
  flushAll() {
    this.cache.flushAll();
  }

  // Estatísticas
  getStats() {
    return this.cache.getStats();
  }
}

export default new CacheService();
```

**O que Cachear**:

1. **Sessions**: Evita consultas ao banco a cada request
2. **Permissões**: Verificação de ACL sem consultar banco
3. **Board Structure**: Acelera carregamento do kanban
4. **Dashboard KPIs**: Queries pesadas de agregação
5. **Rankings**: Evita recalcular rankings a cada pageview

**O que NÃO Cachear**:
- ❌ Dados transacionais (cards, activities)
- ❌ Formulários de criação/edição
- ❌ Uploads de arquivos
- ❌ Notificações em tempo real

**Vantagens do Cache em Memória**:
- ✅ **Zero custo adicional** (sem servidor Redis)
- ✅ Simples de implementar e manter
- ✅ Latência ultra-baixa (< 1ms)
- ✅ Suficiente para sistema interno
- ✅ Fácil migrar para Redis depois se necessário

**Limitações do Cache em Memória** (vs Redis):
- ⚠️ Cache é perdido ao reiniciar servidor (não persistente)
- ⚠️ Cada instância do servidor tem cache independente
- ⚠️ Não compartilha cache entre múltiplos servidores
- ⚠️ Usa RAM do servidor backend (não dedicada)

**Solução para as Limitações**:
- Cache é usado apenas para **dados de leitura frequente**
- Dados críticos (sessions) podem usar **JWT stateless** (sem cache)
- Se crescer e precisar múltiplos servidores → Adicionar Redis

**Monitoramento**:
```javascript
// Verificar estatísticas do cache
const stats = CacheService.getStats();
console.log('Cache hits:', stats.hits);
console.log('Cache misses:', stats.misses);
console.log('Hit rate:', (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2) + '%');
console.log('Keys:', stats.keys);
```

**Quando Migrar para Redis** (futuro):
- Múltiplos servidores backend (load balanced)
- Necessidade de persistência de cache
- Volume de cache > 2GB
- Necessidade de compartilhar cache entre instâncias
- **Estimativa**: Improvável nos próximos 2-3 anos

**Custo**:
- **Cache em Memória (node-cache)**: **$0/mês** (grátis)
- **Redis (futuro)**: ~$20-40/mês se realmente necessário

---

## 18. SEGURANÇA E COMPLIANCE

### 18.1 Criptografia de Dados

**Decisão**: Criptografar **apenas senhas** (hash bcrypt).

**Justificativa**:
- Sistema interno da HSGrowth (não exposto publicamente)
- Criptografia de campos adiciona complexidade e overhead
- LGPD exige proteção adequada, não necessariamente criptografia em todos campos
- Outras medidas de segurança são suficientes (SSL/TLS, firewall, backups criptografados)

**Campos Criptografados**:

1. **Senhas de Usuários** (`users.password`):
   ```javascript
   // Hash com bcrypt (rounds: 12)
   import bcrypt from 'bcrypt';

   // Ao criar usuário
   const hashedPassword = await bcrypt.hash(plainPassword, 12);
   await prisma.users.create({
     data: {
       email,
       password: hashedPassword, // Nunca salvar senha em texto plano
       // ...
     }
   });

   // Ao fazer login
   const user = await prisma.users.findUnique({ where: { email } });
   const isValid = await bcrypt.compare(plainPassword, user.password);
   ```
   - **Algoritmo**: bcrypt (lento por design, resistente a brute-force)
   - **Salt rounds**: 12 (equilíbrio entre segurança e performance)
   - **Irreversível**: NUNCA é possível recuperar senha original
   - **Reset de senha**: Gerar token temporário, enviar por email

**Campos que NÃO são criptografados**:
- ❌ **Emails**: Precisa buscar/filtrar/validar unicidade
- ❌ **Telefones**: Precisa buscar e formatar
- ❌ **Nomes, empresas**: Precisa buscar e ordenar
- ❌ **Endereços**: Precisa buscar por localização
- ❌ **Dados de negócio**: Valores, notas, descrições (não são dados pessoais sensíveis)
- ❌ **CPF/CNPJ**: Se armazenar, pode mascarar na interface mas não criptografar no banco

**Outras Medidas de Segurança** (mais importantes que criptografia de campos):

1. **Conexão Segura ao Banco**:
   - SSL/TLS entre aplicação e banco de dados
   - Credenciais em variáveis de ambiente (nunca no código)
   - Usuário do banco com permissões mínimas necessárias

2. **Proteção de Infraestrutura**:
   - Firewall: Banco de dados inacessível da internet
   - VPN/rede privada entre servidores
   - Backups criptografados (AES-256)
   - Acesso ao servidor via SSH com chave (não senha)

3. **Proteção da API**:
   - HTTPS/TLS obrigatório
   - Rate limiting (evitar brute-force)
   - CORS configurado corretamente
   - Headers de segurança (Helmet.js)
   - Validação de entrada (prevenir injection)

4. **Autenticação e Autorização**:
   - JWT com expiração curta (15min - 1h)
   - Refresh tokens com rotação
   - Logout invalida tokens
   - Permissões por role (RBAC)

5. **Auditoria e Logs**:
   - Log de todas ações críticas (criar, editar, deletar)
   - Log de tentativas de login falhas
   - Log de mudanças de permissões
   - Logs imutáveis (não podem ser editados)

**Quando Adicionar Criptografia de Campos** (futuro):
- Regulamentação específica exigir (ex: dados de saúde)
- Armazenar dados bancários (contas, cartões)
- Sistema virar SaaS público (maior exposição)
- Cliente específico exigir (compliance contratual)

**Biblioteca Recomendada** (se precisar criptografar campos no futuro):
```javascript
// Criptografia AES-256 (reversível)
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

### 18.2 Política de Retenção de Logs

**Decisão**: **1 ano de retenção** para logs de auditoria.

**Justificativa**:
- Equilíbrio entre compliance (LGPD) e custo de armazenamento
- Suficiente para investigações e auditorias
- Logs mais antigos raramente são consultados

**Tipos de Logs e Períodos de Retenção**:

| Tipo de Log | Retenção | Motivo |
|-------------|----------|--------|
| **Logs de Auditoria** | **1 ano** | LGPD compliance, investigações |
| **Logs de Aplicação** | **90 dias** | Debug, monitoramento |
| **Logs de Acesso HTTP** | **30 dias** | Troubleshooting recente |

**1. Logs de Auditoria** (1 ano):
```javascript
// Tabela: audit_logs
// Retenção: 365 dias
{
  id: 1,
  user_id: 10,
  action: 'card_deleted',
  entity_type: 'card',
  entity_id: 500,
  ip_address: '192.168.1.100',
  user_agent: 'Mozilla/5.0...',
  changes: { before: {...}, after: {...} },
  created_at: '2025-12-15T10:00:00Z'
}
```

**O que logar**:
- ✅ Criar/editar/deletar cards
- ✅ Transferências de cartões
- ✅ Mudanças de permissões/roles
- ✅ Login/logout (incluindo falhas)
- ✅ Mudanças em automações
- ✅ Ações administrativas (criar usuário, deletar board, etc)
- ✅ Exportação de dados (relatórios, CSV)
- ✅ Mudanças em configurações críticas

**2. Logs de Aplicação** (90 dias):
```javascript
// Arquivos de log: logs/app-YYYY-MM-DD.log
// Retenção: 90 dias
{
  level: 'error',
  message: 'Failed to execute automation #123',
  timestamp: '2025-12-15T10:00:00Z',
  error: { stack: '...' },
  context: { automation_id: 123, card_id: 500 }
}
```

**O que logar**:
- ✅ Erros de API (500, 404 críticos)
- ✅ Falhas de automação
- ✅ Falhas de cron jobs
- ✅ Warnings do sistema
- ✅ Erros de conexão (banco, email, etc)

**3. Logs de Acesso HTTP** (30 dias):
```javascript
// Arquivos de log: logs/access-YYYY-MM-DD.log
// Retenção: 30 dias
{
  method: 'POST',
  path: '/api/cards',
  status: 200,
  duration: 45, // ms
  ip: '192.168.1.100',
  user_id: 10,
  timestamp: '2025-12-15T10:00:00Z'
}
```

**Estratégia de Rotação e Arquivamento**:

1. **Rotação Diária**:
   ```bash
   # Cron job: Todo dia às 00:00
   # Arquivar logs do dia anterior
   0 0 * * * /scripts/rotate-logs.sh
   ```

2. **Compressão Mensal**:
   ```bash
   # Logs > 30 dias são comprimidos (.gz)
   gzip logs/app-2025-11-*.log
   gzip logs/access-2025-11-*.log
   ```

3. **Deleção Automática**:
   ```sql
   -- Cron job: Todo domingo às 02:00
   -- Deletar logs de auditoria > 1 ano
   DELETE FROM audit_logs
   WHERE created_at < NOW() - INTERVAL 365 DAY;

   -- Deletar logs de aplicação > 90 dias
   DELETE FROM application_logs
   WHERE created_at < NOW() - INTERVAL 90 DAY;
   ```

4. **Arquivamento em Storage**:
   ```javascript
   // Logs > 30 dias → Mover para storage barato (S3, etc)
   // Logs recentes (< 30 dias) → Manter em disco/banco (acesso rápido)
   ```

**Armazenamento Estimado**:
- Logs de auditoria (1 ano): ~500MB - 1GB
- Logs de aplicação (90 dias): ~200MB - 500MB
- Logs de acesso (30 dias): ~100MB - 300MB
- **Total**: ~800MB - 2GB
- **Custo**: ~$5-10/mês (storage barato)

**Exceções à Política de Retenção**:
- Logs sob investigação legal/interna: Manter até resolução
- Logs de incidentes de segurança: Arquivar permanentemente
- Logs de auditorias regulatórias: Seguir prazo da regulamentação

**Acesso e Consulta de Logs**:
- Admin pode consultar logs via interface
- Filtros: Por usuário, ação, data, entidade
- Export: CSV, JSON
- Busca textual em logs recentes (< 90 dias)

**Ferramentas Sugeridas**:
- **Winston** (Node.js): Library de logging
- **Morgan**: HTTP access logs
- **Logrotate**: Rotação automática de arquivos
- **Cron jobs**: Limpeza automática

**Exemplo de Implementação**:
```javascript
// services/LogService.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    // Logs de aplicação (90 dias)
    new winston.transports.File({
      filename: 'logs/app-error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 90 // 90 dias
    }),
    // Logs de acesso (30 dias)
    new winston.transports.File({
      filename: 'logs/app-combined.log',
      maxsize: 10485760,
      maxFiles: 30 // 30 dias
    })
  ]
});

// Logs de auditoria (1 ano) - salvos no banco
async function logAudit(data: AuditLogData) {
  await prisma.audit_logs.create({ data });
}
```

**Monitoramento**:
- Alertar se volume de logs crescer anormalmente
- Alertar se rotação/deleção falhar
- Dashboard com estatísticas de logs (erros/dia, ações/dia)

---

**Versão**: 4.0
**Data**: 15 de Dezembro 2025
**Status**: Completo

