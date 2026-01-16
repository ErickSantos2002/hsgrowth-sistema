# 🚀 Setup Simples - HSGrowth CRM Backend

## Setup em 3 Passos para Qualquer Computador

Este projeto usa **banco de dados em nuvem** (não precisa subir PostgreSQL local).

---

## 📋 Pré-requisitos

- Docker Desktop instalado e rodando
- Git instalado

---

## 🎯 Como Subir o Projeto

### 1️⃣ Clonar o repositório

```bash
git clone [URL-DO-REPO]
cd hsgrowth-sistema/backend
```

### 2️⃣ Criar arquivo .env.local

**Opção A: Copiar do exemplo**
```bash
cp .env.example .env.local
```

**Opção B: Criar manualmente**

Crie o arquivo `backend/.env.local` com este conteúdo:

```env
# ==================== AMBIENTE ====================
ENVIRONMENT=development
DEBUG=True
PROJECT_NAME=HSGrowth CRM API
VERSION=1.0.0

# Server
HOST=0.0.0.0
PORT=8000
WORKERS=1

# ==================== Database REMOTO (Nuvem) ====================
DATABASE_URL=postgresql://administrador:administrador@62.72.11.28:3388/hsgrowth
DB_HOST=62.72.11.28
DB_PORT=3388
DB_USER=administrador
DB_PASSWORD=administrador
DB_NAME=hsgrowth

# ==================== JWT ====================
JWT_SECRET=local-dev-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# ==================== Redis LOCAL ====================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# ==================== Celery ====================
CELERY_BROKER_URL=redis://:redis123@redis:6379/0
CELERY_RESULT_BACKEND=redis://:redis123@redis:6379/0
CELERY_WORKERS=2

# ==================== Email ====================
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@hsgrowth.local
SMTP_FROM_NAME=HSGrowth CRM

# ==================== Frontend ====================
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS='["http://localhost:5173","http://localhost:3000","http://127.0.0.1:5173"]'

# ==================== Logs ====================
LOG_LEVEL=DEBUG
LOG_RETENTION_DAYS=7

# ==================== Outros ====================
CACHE_TTL=3600
CACHE_MAXSIZE=1000
RATE_LIMIT_PER_MINUTE=60
MAX_UPLOAD_SIZE=10485760

# ==================== Development ====================
RUN_SEED=false
```

### 3️⃣ Subir o Docker

```bash
docker-compose -f docker-compose.local.yml up -d
```

**Pronto!** A API estará rodando em: http://localhost:8000

---

## ✅ Verificar se Funcionou

### Testar API:
```bash
curl http://localhost:8000/health
```

Deve retornar:
```json
{"status":"healthy","environment":"development","version":"1.0.0"}
```

### Ver logs:
```bash
docker-compose -f docker-compose.local.yml logs -f api
```

### Acessar documentação:
- http://localhost:8000/docs (Swagger)
- http://localhost:8000/redoc (ReDoc)

---

## 🔧 Comandos Úteis

### Ver containers rodando
```bash
docker ps
```

Deve mostrar:
- `hsgrowth-api-local` (healthy)
- `hsgrowth-redis-local` (healthy)

### Parar tudo
```bash
docker-compose -f docker-compose.local.yml down
```

### Reiniciar
```bash
docker-compose -f docker-compose.local.yml restart
```

### Ver logs em tempo real
```bash
docker-compose -f docker-compose.local.yml logs -f
```

### Rebuild (se mudou código)
```bash
docker-compose -f docker-compose.local.yml up -d --build
```

### Entrar no container (debug)
```bash
docker exec -it hsgrowth-api-local bash
```

---

## 🐛 Problemas Comuns

### Porta 8000 ocupada

**Ver o que está usando:**
```bash
# Windows
netstat -ano | findstr :8000

# Linux/Mac
lsof -i :8000
```

**Solução: Matar o processo ou mudar a porta no .env.local**

### Erro de conexão com banco

**Verificar se o IP está acessível:**
```bash
ping 62.72.11.28
telnet 62.72.11.28 3388
```

**Conferir credenciais no .env.local:**
- DB_HOST=62.72.11.28
- DB_PORT=3388
- DB_USER=administrador
- DB_PASSWORD=administrador

### Container não sobe

**Ver erro completo:**
```bash
docker-compose -f docker-compose.local.yml logs api
```

**Rebuild forçado:**
```bash
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up -d --build --force-recreate
```

---

## 🔑 Credenciais de Teste

**Admin:**
- Email: admin@hsgrowth.com
- Senha: admin123

**Manager:**
- Email: manager@hsgrowth.com
- Senha: manager123

**Vendedor:**
- Email: vendedor@hsgrowth.com
- Senha: vendedor123

---

## 📦 O Que Este Setup Faz

1. **Redis local** (cache) na porta 6379
2. **API FastAPI** na porta 8000
3. **Conecta no banco PostgreSQL remoto** (62.72.11.28:3388)
4. **Executa migrations automaticamente** ao subir
5. **Hot reload ativado** (código atualiza automaticamente)

**NÃO sobe PostgreSQL local** - usa apenas o banco em nuvem!

---

## 📊 Arquitetura

```
┌─────────────────┐
│  Computador     │
│  Local          │
├─────────────────┤
│                 │
│  Docker:        │
│  ├─ Redis       │ ← Cache local
│  └─ API         │ ← FastAPI
│       │         │
│       │ Conecta │
│       ▼         │
└────────│────────┘
         │
         │ Internet
         ▼
┌─────────────────┐
│  Nuvem          │
│  (62.72.11.28)  │
├─────────────────┤
│  PostgreSQL     │ ← Banco remoto
│  Porta: 3388    │
└─────────────────┘
```

---

**Última atualização:** 16/01/2026
