# 🚀 Como Subir o HSGrowth CRM em Outro Computador

Guia rápido e simples para configurar o projeto em qualquer máquina.

---

## ✅ Pré-requisitos

1. **Docker Desktop** instalado e rodando
2. **Git** instalado
3. **Node.js 18+** instalado (para o frontend)

---

## 🎯 Setup Completo (Backend + Frontend)

### 1️⃣ Clonar o Repositório

```bash
git clone [URL-DO-REPOSITORIO]
cd hsgrowth-sistema
```

---

### 2️⃣ Backend (API)

#### Opção A: Automático (Recomendado)

```bash
cd backend
./setup.sh
```

Pronto! O script faz tudo sozinho.

#### Opção B: Manual

```bash
cd backend

# Criar arquivo de configuração
cp .env.example .env.local

# Editar .env.local com suas credenciais
# (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, etc.)

# Subir Docker
docker-compose -f docker-compose.local.yml up -d
```

**Verificar se funcionou:**
```bash
curl http://localhost:8000/health
```

Deve retornar:
```json
{"status":"healthy","environment":"development","version":"1.0.0"}
```

---

### 3️⃣ Frontend (React)

```bash
cd frontend

# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev
```

**Acessar:** http://localhost:5173

---

## 🔑 Credenciais de Teste

**Admin:**
- Email: `admin@hsgrowth.com`
- Senha: `admin123`

**Manager:**
- Email: `manager@hsgrowth.com`
- Senha: `manager123`

**Vendedor:**
- Email: `vendedor@hsgrowth.com`
- Senha: `vendedor123`

---

## 📊 Acessos Rápidos

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Frontend** | http://localhost:5173 | Interface React |
| **Backend API** | http://localhost:8000 | API FastAPI |
| **API Docs** | http://localhost:8000/docs | Swagger UI |
| **Health Check** | http://localhost:8000/health | Status da API |

---

## 🐛 Problemas Comuns

### Porta 8000 ou 6379 ocupada

**Windows:**
```bash
netstat -ano | findstr :8000
taskkill /PID [PID] /F
```

**Linux/Mac:**
```bash
lsof -i :8000
kill -9 [PID]
```

### Erro ao conectar no banco

Verificar se o servidor remoto está acessível:
```bash
ping 62.72.11.28
telnet 62.72.11.28 3388
```

Conferir credenciais no `backend/.env.local`

### Container não sobe

Ver logs:
```bash
cd backend
docker-compose -f docker-compose.local.yml logs -f api
```

Rebuild:
```bash
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up -d --build
```

---

## 🔧 Comandos Úteis

### Backend

```bash
cd backend

# Ver logs
docker-compose -f docker-compose.local.yml logs -f

# Parar tudo
docker-compose -f docker-compose.local.yml down

# Reiniciar
docker-compose -f docker-compose.local.yml restart

# Rebuild
docker-compose -f docker-compose.local.yml up -d --build

# Ver containers
docker ps
```

### Frontend

```bash
cd frontend

# Rodar em dev
npm run dev

# Build de produção
npm run build

# Preview da build
npm run preview
```

---

## 📦 Arquitetura Simplificada

```
Seu Computador:
├── Frontend (React)     → http://localhost:5173
└── Docker:
    ├── Redis (cache)    → localhost:6379
    └── API (FastAPI)    → http://localhost:8000
          │
          │ Internet
          ▼
    PostgreSQL Remoto    → 62.72.11.28:3388
    (Nuvem - Banco de Produção)
```

**Importante:**
- PostgreSQL NÃO roda localmente
- Conecta no banco remoto em nuvem
- Apenas Redis e API rodam no Docker local

---

## ✅ Checklist de Verificação

Antes de considerar que está tudo funcionando:

**Backend:**
- [ ] Docker Desktop rodando
- [ ] Arquivo `backend/.env.local` criado
- [ ] `docker ps` mostra 2 containers (api e redis) como `healthy`
- [ ] `curl http://localhost:8000/health` retorna status healthy
- [ ] http://localhost:8000/docs carrega a documentação

**Frontend:**
- [ ] Node.js instalado
- [ ] `npm install` executado com sucesso
- [ ] `npm run dev` rodando sem erros
- [ ] http://localhost:5173 carrega a página de login
- [ ] Login funciona com as credenciais de teste

---

## 📚 Documentação Completa

Para mais detalhes, consulte:

- **Backend**: `backend/SETUP-SIMPLES.md`
- **Backend (README)**: `backend/README.md`
- **Status do Projeto**: `Documentação/STATUS-DESENVOLVIMENTO.md`
- **Guia de Desenvolvimento**: `Documentação/GUIA-DESENVOLVIMENTO-LOCAL.md`

---

## 🎉 Pronto!

Agora você tem:
- ✅ Backend rodando com banco em nuvem
- ✅ Frontend rodando localmente
- ✅ Sistema completo funcionando

**Desenvolva com confiança!**

---

**Criado em:** 16/01/2026
**Versão:** 1.0
**Testado em:** Windows 11, Ubuntu 22.04, macOS
