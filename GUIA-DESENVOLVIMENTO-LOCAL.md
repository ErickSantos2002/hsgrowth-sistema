# 🚀 Guia de Desenvolvimento Local - HSGrowth CRM

Este guia explica como rodar **backend + banco de dados + frontend** localmente para desenvolvimento rápido.

---

## 📋 Pré-requisitos

1. **Docker Desktop** instalado e rodando
2. **Node.js 18+** instalado
3. **Git** configurado

---

## 🎯 Passo a Passo

### 1️⃣ Backend + Banco de Dados (Docker)

```bash
# Navegar até a pasta do backend
cd C:\Users\TI\Documents\GitHub\hsgrowth-sistema\backend

# Subir os containers (PostgreSQL + Redis + API)
docker-compose -f docker-compose.local.yml up -d

# Acompanhar os logs (opcional)
docker-compose -f docker-compose.local.yml logs -f api
```

**O que vai acontecer:**
- PostgreSQL local na porta `5432`
- Redis local na porta `6379`
- API FastAPI na porta `8000` (http://localhost:8000)
- Banco será criado e populado com dados fictícios automaticamente (RUN_SEED=true)

**Verificar se funcionou:**
- Acessar: http://localhost:8000/docs (Swagger UI)
- Acessar: http://localhost:8000/health (deve retornar `{"status":"healthy"}`)

---

### 2️⃣ Frontend (React + Vite)

**Em outro terminal:**

```bash
# Navegar até a pasta do frontend
cd C:\Users\TI\Documents\GitHub\hsgrowth-sistema\frontend

# Instalar dependências (se ainda não instalou)
npm install

# Rodar o frontend em modo desenvolvimento
npm run dev
```

**O que vai acontecer:**
- Frontend vai rodar em http://localhost:5173
- Hot reload ativado (mudanças aparecem instantaneamente)
- API será chamada em http://localhost:8000

**Acessar:**
- Frontend: http://localhost:5173
- Login com credenciais do seed (ver abaixo)

---

## 🔐 Credenciais de Teste (Seed)

Após subir o backend local com `RUN_SEED=true`, o banco será populado com:

**Usuários:**
- Admin: `admin@hsgrowth.com` / senha: `admin123`
- Manager: `manager@hsgrowth.com` / senha: `manager123`
- User: `vendedor@hsgrowth.com` / senha: `vendedor123`

**Dados fictícios:**
- 3 contas
- 7 boards
- 100+ cards
- Clientes, listas, atividades, etc.

---

## 🔄 Comandos Úteis

### Backend (Docker)

```bash
# Ver logs da API
docker-compose -f docker-compose.local.yml logs -f api

# Parar tudo
docker-compose -f docker-compose.local.yml down

# Parar e remover volumes (limpar banco)
docker-compose -f docker-compose.local.yml down -v

# Rebuild da imagem (se mudou Dockerfile)
docker-compose -f docker-compose.local.yml up -d --build

# Acessar o container da API
docker exec -it hsgrowth-api-local bash

# Rodar migrações manualmente
docker exec -it hsgrowth-api-local python -m alembic upgrade head

# Rodar seed manualmente
docker exec -it hsgrowth-api-local python -m app.scripts.seed
```

### Frontend

```bash
# Rodar em dev
npm run dev

# Build de produção (testar)
npm run build
npm run preview

# Linter
npm run lint
```

---

## 🐛 Resolução de Problemas

### Backend não sobe

1. Verificar se Docker está rodando
2. Verificar se portas 5432, 6379 e 8000 estão livres
3. Ver logs: `docker-compose -f docker-compose.local.yml logs api`

### Frontend não conecta com backend

1. Verificar se `.env.local` existe no frontend
2. Verificar se VITE_API_URL=http://localhost:8000
3. Limpar cache do navegador (Ctrl+Shift+Delete)
4. Reiniciar o frontend: `npm run dev`

### CORS Error

- Verificar CORS_ORIGINS no `.env.local` do backend
- Deve incluir: `["http://localhost:5173","http://localhost:3000"]`
- Reiniciar backend se mudou .env

### Banco vazio

- Rodar seed manual: `docker exec -it hsgrowth-api-local python -m app.scripts.seed`
- Ou subir novamente com RUN_SEED=true

---

## 📊 Acessos Rápidos

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Frontend** | http://localhost:5173 | Interface React |
| **API Docs** | http://localhost:8000/docs | Swagger UI |
| **API Redoc** | http://localhost:8000/redoc | Redoc |
| **Health Check** | http://localhost:8000/health | Status da API |
| **PostgreSQL** | localhost:5432 | Banco local |
| **Redis** | localhost:6379 | Cache local |

---

## 🔥 Fluxo de Desenvolvimento

1. **Fazer mudanças no código**
   - Backend: Salvar arquivo → API recarrega automaticamente (--reload)
   - Frontend: Salvar arquivo → Vite recarrega automaticamente (HMR)

2. **Testar localmente**
   - Ver resultado instantâneo no http://localhost:5173
   - Verificar logs no terminal

3. **Commitar quando estiver OK**
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   git push origin main
   ```

4. **Deploy em produção**
   - O deploy vai usar `.env` de produção automaticamente
   - Não precisa mudar nada nos arquivos .env.local

---

## 🎉 Pronto!

Agora você pode desenvolver rapidamente sem precisar fazer deploy a cada mudança!

**Dúvidas?** Veja os logs ou me chame!
