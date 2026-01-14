# Tarefas Pendentes - Frontend

**Data**: 09/01/2026
**Prioridade**: ALTA
**Tempo estimado**: 2-4 horas

---

## 🎯 Objetivo

Atualizar o frontend para remover todas as referências a `account_id` e ajustar para o novo sistema single-tenant.

---

## 📋 Checklist de Tarefas

### 1. Identificar Arquivos com account_id ⏳

**Comandos para buscar:**
```bash
cd frontend
grep -r "account_id" src/ --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "accountId" src/ --include="*.ts" --include="*.tsx" --include="*.js"
```

**Arquivos prováveis:**
- `src/services/api.ts` ou `src/services/auth.ts`
- `src/types/*.ts` (interfaces/types)
- `src/pages/Login.tsx`
- `src/pages/Dashboard.tsx`
- Componentes de Board/Card
- State management (Context/Zustand/Redux)

---

### 2. Atualizar Services/API ⏳

**O que fazer:**
- Remover `account_id` dos tipos de resposta (User, Board, etc.)
- Remover `account_id` dos parâmetros de requisição
- Atualizar rotas de API:
  - ❌ `/accounts/${accountId}/boards`
  - ✅ `/boards`

**Exemplo de mudança:**
```typescript
// ANTES
interface User {
  id: number;
  email: string;
  account_id: number;  // ❌ REMOVER
  role_id: number;
}

// DEPOIS
interface User {
  id: number;
  email: string;
  role_id: number;  // ✅ Mantém apenas role
}
```

---

### 3. Atualizar State Management ⏳

**Remover:**
- Estado de `accountId` / `account_id`
- Validações baseadas em account
- Filtros por account

**Manter:**
- Estado de `user`
- Estado de `role`
- Controle de permissões por role

---

### 4. Atualizar Rotas ⏳

**Simplificar rotas:**
```typescript
// ANTES
/accounts/:accountId/boards
/accounts/:accountId/cards
/accounts/:accountId/users

// DEPOIS
/boards
/cards
/users
```

---

### 5. Atualizar Componentes ⏳

**Verificar:**
- Forms que pedem account_id
- Dropdowns de seleção de account
- Headers/Sidebars que mostram account atual
- Breadcrumbs com account

**Remover:**
- Seletor de account
- Account switcher (se existir)
- Referências visuais a "conta atual"

---

### 6. Testar Fluxos Principais ⏳

**Fluxos para testar:**

#### a) Login
- [ ] Fazer login com admin@hsgrowth.com / admin123
- [ ] Verificar se não retorna account_id
- [ ] Verificar se token funciona

#### b) Dashboard
- [ ] Carregar dashboard
- [ ] Verificar se boards aparecem
- [ ] Verificar se KPIs carregam

#### c) Boards
- [ ] Listar boards
- [ ] Criar novo board
- [ ] Editar board
- [ ] Arquivar board

#### d) Cards
- [ ] Listar cards
- [ ] Criar card
- [ ] Mover card entre listas
- [ ] Editar card

#### e) Usuários (Admin)
- [ ] Listar usuários
- [ ] Criar usuário
- [ ] Editar usuário
- [ ] Deletar usuário

---

## 🔧 Comandos Úteis

### Iniciar Frontend:
```bash
cd frontend
npm run dev
```

### Acessar:
```
http://localhost:5173
```

### Ver Console do Navegador:
- Abrir DevTools (F12)
- Verificar erros de rede
- Verificar console logs

---

## 🚨 Possíveis Erros

### Erro 1: "account_id is required"
**Causa**: Form ou requisição ainda enviando account_id
**Solução**: Remover campo do payload

### Erro 2: "Cannot read property 'account_id'"
**Causa**: Código tentando acessar account_id que não existe mais
**Solução**: Remover referência

### Erro 3: 401 Unauthorized
**Causa**: Token pode estar inválido ou formato mudou
**Solução**: Fazer novo login

### Erro 4: 404 Not Found
**Causa**: Rota ainda usa /accounts/:accountId/
**Solução**: Atualizar para rota sem account_id

---

## 📝 Anotações

### Credenciais de Teste:
- **Admin**: admin@hsgrowth.com / admin123
- **Manager**: gerente1@hsgrowth.com / gerente123
- **Vendedor**: vendedor1@hsgrowth.com / vendedor123

### API Endpoints:
- Base URL: http://localhost:8000/api/v1
- Health: http://localhost:8000/health
- Docs: http://localhost:8000/docs

---

## ✅ Critérios de Sucesso

Frontend estará OK quando:
- [ ] Login funciona sem erros
- [ ] Dashboard carrega corretamente
- [ ] Boards listam e exibem cards
- [ ] Criar/editar card funciona
- [ ] Gamificação carrega
- [ ] Não há erros no console
- [ ] Não há referências a account_id no código

---

**Criado em**: 09/01/2026
**Para execução em**: 10/01/2026
**Estimativa**: 2-4 horas
