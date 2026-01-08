# HSGrowth CRM - Frontend

> Sistema de Gestão de Vendas e CRM - Interface Web

## 📋 Status do Projeto

**Status:** ✅ Frontend Base Implementado (08/01/2026)

- ✅ Estrutura base do projeto configurada
- ✅ Autenticação com JWT implementada
- ✅ Layout principal (MainLayout) com sidebar responsiva
- ✅ Integração com API backend
- ✅ Sistema de tipos TypeScript completo
- ✅ Serviços de API (auth, users, boards, cards, clients)
- ✅ Visual moderno com Tailwind CSS
- ⏳ Páginas funcionais em desenvolvimento

---

## 🎯 Visão Geral

O HSGrowth CRM Frontend é uma aplicação web moderna construída com React 19 e TypeScript, oferecendo uma interface intuitiva e responsiva para gestão de vendas, clientes e oportunidades.

### Funcionalidades Principais

- **Autenticação Segura**: Login com JWT e refresh token automático
- **Dashboard**: Visão geral de KPIs e métricas de vendas
- **Boards Kanban**: Gerenciamento visual de oportunidades
- **Gestão de Cards**: Criação e acompanhamento de leads/deals
- **Clientes**: CRUD completo de clientes
- **Gamificação**: Pontos, badges e rankings
- **Transferências**: Fluxo de aprovação de transferências de cards
- **Relatórios**: Dashboards e relatórios de vendas
- **Automações**: Criação de automações trigger e agendadas
- **Notificações**: Sistema de notificações in-app

---

## 🛠️ Stack Tecnológico

### Core

- **React** 19.1.0 - Biblioteca UI
- **TypeScript** 5.8.3 - Linguagem tipada
- **Vite** 7.0.0 - Build tool ultra-rápido
- **React Router DOM** 6.30.1 - Roteamento

### UI & Estilo

- **Tailwind CSS** 3.4.17 - Framework CSS utility-first
- **Lucide React** 0.544.0 - Ícones modernos
- **React Hot Toast** 2.6.0 - Notificações toast

### HTTP & Estado

- **Axios** 1.10.0 - Cliente HTTP
- **Context API** - Gerenciamento de estado global

### Gráficos & Exportação

- **Recharts** 3.0.2 - Gráficos e visualizações
- **jsPDF** 3.0.2 + jspdf-autotable 5.0.2 - Exportação PDF
- **XLSX** 0.18.5 - Exportação Excel
- **File Saver** 2.0.5 - Download de arquivos

### Dev Tools

- **Prettier** 3.6.2 - Formatação de código
- **PostCSS** 8.5.6 - Processamento CSS
- **Autoprefixer** 10.4.21 - Compatibilidade CSS

---

## 📁 Estrutura do Projeto

```
frontend/
├── public/                      # Assets estáticos
│   └── vite.svg
├── src/
│   ├── assets/                  # Imagens, ícones, logos
│   │   ├── logo.png
│   │   └── HS2.ico
│   │
│   ├── components/              # Componentes React reutilizáveis
│   │   ├── ProtectedRoute.tsx   # HOC para rotas protegidas
│   │   ├── Header.tsx           # (Antigo - não usado)
│   │   ├── Sidebar.tsx          # (Antigo - não usado)
│   │   └── ModalTrocarSenha.tsx # Modal de troca de senha
│   │
│   ├── context/                 # Context API
│   │   ├── AuthContext.tsx      # Contexto de autenticação
│   │   └── ThemeContext.tsx     # (Antigo - não usado)
│   │
│   ├── hooks/                   # Custom hooks
│   │   └── useAuth.ts           # Hook para autenticação
│   │
│   ├── layouts/                 # Layouts da aplicação
│   │   └── MainLayout.tsx       # Layout principal com sidebar
│   │
│   ├── pages/                   # Páginas/Views da aplicação
│   │   ├── Login.tsx            # Página de login
│   │   ├── Dashboard.tsx        # Dashboard (em construção)
│   │   ├── NotFound.tsx         # Página 404
│   │   ├── Bloqueio.tsx         # Página de acesso negado
│   │   └── EmConstrucao.tsx     # Placeholder páginas
│   │
│   ├── services/                # Serviços de API
│   │   ├── api.ts               # Instância Axios configurada
│   │   ├── authService.ts       # Serviço de autenticação
│   │   ├── userService.ts       # CRUD de usuários
│   │   ├── boardService.ts      # CRUD de boards
│   │   ├── cardService.ts       # CRUD de cards
│   │   ├── clientService.ts     # CRUD de clientes
│   │   └── index.ts             # Exportações centralizadas
│   │
│   ├── types/                   # Definições TypeScript
│   │   └── index.ts             # Todos os tipos e interfaces
│   │
│   ├── styles/                  # Estilos globais
│   │   └── index.css            # Tailwind + estilos customizados
│   │
│   ├── App.tsx                  # Componente raiz
│   ├── main.tsx                 # Ponto de entrada
│   └── router.tsx               # Configuração de rotas
│
├── .env                         # Variáveis de ambiente (local)
├── .env.example                 # Exemplo de variáveis de ambiente
├── index.html                   # HTML base
├── package.json                 # Dependências e scripts
├── tsconfig.json                # Configuração TypeScript
├── vite.config.ts               # Configuração Vite
├── tailwind.config.js           # Configuração Tailwind CSS
├── postcss.config.js            # Configuração PostCSS
├── eslint.config.js             # Configuração ESLint
└── README.md                    # Este arquivo
```

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn
- Backend HSGrowth CRM rodando

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/hsgrowth-sistema.git
cd hsgrowth-sistema/frontend
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie o arquivo `.env` na raiz do frontend:

```bash
cp .env.example .env
```

Edite o `.env` com a URL da sua API:

```env
# URL da API Backend
# Produção: https://growthhsapi.healthsafetytech.com
# Local: http://localhost:8000
VITE_API_URL=https://growthhsapi.healthsafetytech.com
```

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em: **http://localhost:5173**

---

## 📜 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor Vite em modo dev (porta 5173)

# Build
npm run build            # Compila para produção (pasta dist/)
npm run preview          # Preview do build de produção

# Linting
npm run lint             # Executa ESLint (se configurado)
```

---

## 🏗️ Arquitetura e Padrões

### Estrutura de Componentes

```
App.tsx (Root)
├── AuthProvider (Context)
│   └── BrowserRouter
│       └── Routes
│           ├── /login → Login.tsx (sem layout)
│           └── /* → MainLayout (com sidebar)
│               ├── /dashboard → Dashboard.tsx
│               ├── /boards → Boards.tsx
│               ├── /cards → Cards.tsx
│               └── ...
```

### Padrões de Código

#### Nomenclatura

- **Componentes**: PascalCase (ex: `MainLayout.tsx`)
- **Hooks**: camelCase com prefixo `use` (ex: `useAuth.ts`)
- **Serviços**: camelCase com sufixo `Service` (ex: `authService.ts`)
- **Tipos**: PascalCase (ex: `User`, `Card`)

#### Código

- **Variáveis/Funções**: Inglês sem acentos
- **Comentários**: Português com acentos
- **Textos da UI**: Português com acentos
- **Documentação**: Português com acentos

Exemplo:

```typescript
// Busca os dados do usuário logado
async function fetchCurrentUser(): Promise<User> {
  const response = await api.get<User>("/api/v1/users/me");
  return response.data;
}
```

### Visual Design

- **Paleta de cores**: Gradientes slate (950 → 900 → 950)
- **Cards**: Glassmorphism com `backdrop-blur-xl`
- **Gradientes primários**: `from-blue-500 to-cyan-500`
- **Bordas**: `border-slate-700/50` com opacidade
- **Transições**: Suaves com `transition-all`

---

## 🔌 Integração com a API

### Configuração do Axios

O arquivo `src/services/api.ts` configura a instância global do Axios:

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});
```

### Interceptadores

#### Request Interceptor

Adiciona automaticamente o JWT token em todas as requisições:

```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

#### Response Interceptor

Gerencia refresh token automático em caso de 401:

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Tenta refresh token
      // Se falhar, redireciona para login
    }
    return Promise.reject(error);
  }
);
```

### Serviços Disponíveis

| Serviço         | Arquivo                 | Funcionalidades                                                    |
| --------------- | ----------------------- | ------------------------------------------------------------------ |
| authService     | `authService.ts`        | login, logout, refresh, getMe, forgotPassword, resetPassword       |
| userService     | `userService.ts`        | list, getById, create, update, delete, changePassword              |
| boardService    | `boardService.ts`       | list, getById, create, update, delete, duplicate                   |
| cardService     | `cardService.ts`        | list, getById, create, update, delete, move, assign, win, lose     |
| clientService   | `clientService.ts`      | list, getById, create, update, delete                              |

### Exemplo de Uso

```typescript
import { authService, userService } from "../services";

// Login
const response = await authService.login("admin@hsgrowth.com", "admin123");
console.log(response.user);

// Listar usuários
const users = await userService.list({ page: 1, size: 20 });
console.log(users.items);
```

---

## 🎨 Componentes Principais

### MainLayout.tsx

Layout principal da aplicação após login.

**Características:**

- Sidebar colapsável (desktop) e drawer (mobile)
- Topbar com informações do usuário
- Logo com efeito blur e gradiente
- Menu items com gradiente quando ativo
- Tooltips no modo mini
- Botão de logout

### Login.tsx

Página de login com visual glassmorphism.

**Características:**

- Card com backdrop blur
- Logo com efeito blur
- Validação de campos
- Loading state com spinner
- Integração com AuthContext
- Credenciais de teste visíveis

### ProtectedRoute.tsx

HOC para proteger rotas que requerem autenticação.

**Funcionamento:**

1. Verifica se usuário está autenticado
2. Se não: redireciona para `/login`
3. Se sim: renderiza o componente filho

---

## 🗺️ Rotas

### Rotas Públicas

| Rota     | Componente  | Descrição       |
| -------- | ----------- | --------------- |
| `/login` | `Login.tsx` | Página de login |

### Rotas Protegidas (MainLayout)

| Rota             | Componente         | Descrição                           |
| ---------------- | ------------------ | ----------------------------------- |
| `/`              | `Dashboard.tsx`    | Redireciona para dashboard          |
| `/dashboard`     | `Dashboard.tsx`    | Dashboard principal com KPIs        |
| `/boards`        | `Dashboard.tsx`    | Listagem de boards (em construção)  |
| `/cards`         | `Dashboard.tsx`    | Listagem de cards (em construção)   |
| `/clients`       | `Dashboard.tsx`    | Gestão de clientes (em construção)  |
| `/gamification`  | `Dashboard.tsx`    | Pontos e badges (em construção)     |
| `/transfers`     | `Dashboard.tsx`    | Transferências (em construção)      |
| `/reports`       | `Dashboard.tsx`    | Relatórios (em construção)          |
| `/automations`   | `Dashboard.tsx`    | Automações (em construção)          |
| `/notifications` | `Dashboard.tsx`    | Notificações (em construção)        |
| `/settings`      | `Dashboard.tsx`    | Configurações (em construção)       |
| `/users`         | `Dashboard.tsx`    | Usuários - Admin only (em const.)   |

**Nota:** Atualmente todas as rotas protegidas renderizam `Dashboard.tsx` como placeholder.

---

## 🔐 Autenticação

### Fluxo de Autenticação

1. **Login**:

   - Usuário submete email/senha
   - `AuthContext` chama `authService.login()`
   - Backend retorna `access_token`, `refresh_token` e `user`
   - Tokens e dados salvos no `localStorage`
   - Usuário redirecionado para `/dashboard`

2. **Requisições Autenticadas**:

   - Interceptor adiciona `Authorization: Bearer {token}` automaticamente
   - Backend valida o token
   - Se token expirado (401), interceptor tenta refresh automático

3. **Refresh Token**:

   - Interceptor detecta 401
   - Chama `/api/v1/auth/refresh` com refresh_token
   - Atualiza access_token no localStorage
   - Refaz a requisição original

4. **Logout**:
   - Chama `authService.logout()`
   - Limpa tokens e dados do `localStorage`
   - Redireciona para `/login`

### Dados no LocalStorage

```javascript
localStorage.getItem("access_token");  // JWT access token
localStorage.getItem("refresh_token"); // JWT refresh token
localStorage.getItem("user");          // JSON do objeto User
```

### Hook useAuth

```typescript
import { useAuth } from "../hooks/useAuth";

function MyComponent() {
  const { user, login, logout, loading, error } = useAuth();

  if (loading) return <div>Carregando...</div>;
  if (!user) return <div>Não autenticado</div>;

  return <div>Olá, {user.username}!</div>;
}
```

---

## 🔧 Variáveis de Ambiente

### Desenvolvimento (.env)

```env
VITE_API_URL=http://localhost:8000
```

### Produção (.env.production)

```env
VITE_API_URL=https://growthhsapi.healthsafetytech.com
```

**Importante:** Variáveis devem começar com `VITE_` para serem acessíveis no código.

### Acessando no código

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## 🎯 Types TypeScript

Todos os tipos estão centralizados em `src/types/index.ts`:

### Principais Tipos

#### Autenticação

- `User` - Usuário completo
- `LoginRequest` - Payload de login
- `LoginResponse` - Resposta do login

#### Boards & Cards

- `Board` - Quadro kanban
- `List` - Lista dentro do board
- `Card` - Card/oportunidade
- `Client` - Cliente

#### Gamificação

- `GamificationPoint` - Pontos de gamificação
- `GamificationBadge` - Badge/conquista
- `UserBadge` - Badge do usuário
- `GamificationRanking` - Ranking

#### API

- `PaginatedResponse<T>` - Resposta paginada genérica
- `ApiError` - Erro da API
- `SuccessResponse` - Resposta de sucesso

### Exemplo de Uso

```typescript
import { User, Card, PaginatedResponse } from "../types";

async function fetchCards(): Promise<PaginatedResponse<Card>> {
  const response = await cardService.list({ page: 1, size: 20 });
  return response;
}
```

---

## 📦 Build e Deploy

### Build para Produção

```bash
npm run build
```

Gera arquivos otimizados na pasta `dist/`:

```
dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── index.html
```

### Preview do Build

```bash
npm run preview
```

### Deploy

#### Opção 1: Servidor Estático (Nginx, Apache)

1. Faça o build: `npm run build`
2. Copie a pasta `dist/` para o servidor
3. Configure o servidor para SPAs (rewrite para index.html)

**Exemplo Nginx:**

```nginx
server {
    listen 80;
    server_name hsgrowth.healthsafetytech.com;

    root /var/www/hsgrowth-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Opção 2: Vercel / Netlify

1. Conecte o repositório Git
2. Configure:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variable: `VITE_API_URL`

#### Opção 3: Docker

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🐛 Troubleshooting

### Erro: "login is not a function"

**Causa:** AuthProvider não está envolvendo a aplicação.

**Solução:** Verifique se `main.tsx` tem:

```typescript
<AuthProvider>
  <App />
</AuthProvider>
```

### Erro: "Failed to resolve import '../contexts/AuthContext'"

**Causa:** Import incorreto.

**Solução:** Use o hook:

```typescript
import { useAuth } from "../hooks/useAuth";
```

### Erro de CORS

**Causa:** Backend não está aceitando requisições da origem do frontend.

**Solução:** Adicione a URL do frontend no `CORS_ORIGINS` do backend:

```env
CORS_ORIGINS=["http://localhost:5173","https://seu-frontend.com"]
```

### Variáveis de ambiente não funcionam

**Causa:** Variáveis não começam com `VITE_`.

**Solução:** Renomeie para `VITE_ALGUMA_COISA` e reinicie o servidor.

### Build falha com "out of memory"

**Causa:** Node.js precisa de mais memória.

**Solução:**

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

## 👨‍💻 Desenvolvimento

### Próximos Passos

1. **Implementar Dashboard com KPIs**

   - Cards de estatísticas
   - Gráficos com Recharts
   - Filtros por período

2. **Criar página de Boards**

   - Listagem de boards
   - CRUD de boards
   - Duplicar board

3. **Implementar Kanban Board**

   - Visualização de listas e cards
   - Drag and drop com react-beautiful-dnd ou dnd-kit
   - Filtros e ordenação

4. **Página de Cards**

   - Listagem com filtros avançados
   - Modal de criação/edição
   - Detalhes do card
   - Timeline de atividades

5. **Gestão de Clientes**

   - CRUD completo
   - Importação de dados
   - Histórico de interações

6. **Gamificação**

   - Dashboard de pontos
   - Galeria de badges
   - Rankings (semanal, mensal, anual)

7. **Transferências**

   - Fluxo de solicitação
   - Aprovação/rejeição
   - Histórico

8. **Relatórios**

   - Relatório de vendas
   - Funil de conversão
   - Exportação PDF/Excel

9. **Automações**

   - Criação de automações trigger
   - Agendamento de automações
   - Histórico de execuções

10. **Notificações**
    - Bell icon com contador
    - Dropdown de notificações
    - Marcar como lida

### Convenções de Git

```bash
# Feature
git checkout -b feature/nome-da-feature

# Bugfix
git checkout -b bugfix/nome-do-bug

# Commit
git commit -m "feat: adiciona dashboard de vendas"
git commit -m "fix: corrige bug no login"
```

---

## 📞 Suporte

Para dúvidas ou problemas:

- **Backend README**: `../backend/README.md`
- **Issues**: GitHub Issues
- **Email**: seu-email@empresa.com

---

## 📄 Licença

Este projeto é privado e de uso interno da empresa.

---

**Última atualização:** 08/01/2026
**Versão:** 1.0.0
**Status:** ✅ Base implementada, páginas em desenvolvimento