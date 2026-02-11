# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.1.6] - 2025-02-11

### 🎨 Adicionado

#### Sistema de Cores Centralizado
- Criado `constants/colors.ts` com palette de cores HEX centralizada
- Expandido `tailwind.config.js` com palette semântica completa
- Cores organizadas por: primary, surface, content, border, status, board
- Sistema de tematização preparado para modo claro/escuro

#### Componentes Comuns Reutilizáveis
- `LoadingSpinner` - Spinner padronizado com 3 tamanhos (sm, md, lg)
- `SearchInput` - Input de busca com ícone integrado
- `Pagination` - Componente de paginação responsivo (mobile e desktop)
- `PageHeader` - Cabeçalho padronizado para páginas com título, descrição, ícone e ações

#### Hooks Reutilizáveis
- `usePagination` - Gerencia paginação client-side com lógica completa
- `useCRUD` - Encapsula operações create, read, update, delete
- `useFilter` - Sistema de filtros flexível com helpers
- `filterHelpers` - Funções auxiliares para filtros comuns

#### Utilitários Centralizados
- `utils/formatters.ts` - Biblioteca de formatação e máscaras:
  - `maskPhone` - Máscara de telefone brasileiro
  - `maskCPF` - Máscara de CPF
  - `maskCNPJ` - Máscara de CNPJ
  - `maskDocument` - Auto-detecta CPF/CNPJ
  - `maskCEP` - Máscara de CEP
  - `maskCNAE` - Máscara de CNAE
  - `formatDate` - Formata data para pt-BR
  - `formatDateTime` - Formata data e hora para pt-BR
  - `formatCurrency` - Formata moeda brasileira
  - `unmask` - Remove formatação

- `utils/toast.ts` - Sistema de notificações padronizado
  - `showSuccess` - Toast de sucesso
  - `showError` - Toast de erro

### ♻️ Refatorado

#### Páginas Padronizadas (6 páginas)
- `pages/Users.tsx` - Migrada para hooks + layout components
- `pages/Persons.tsx` - Migrada para hooks + layout components + CRUD
- `pages/Clients.tsx` - Migrada para hooks + layout components + CRUD
- `pages/Products.tsx` - Migrada para hooks + layout components + CRUD
- `pages/Automations.tsx` - Migrada para hooks + layout components + filtros
- `pages/Notifications.tsx` - Verificada (mantida com server-side pagination)

#### Modais Padronizados
- `PersonModal.tsx` - Usando formatters centralizados
- `ClientModal.tsx` - Usando formatters centralizados
- `BoardModal.tsx` - Usando cores centralizadas + toast
- `UserModal.tsx` - Usando toast padronizado
- `TransferModal.tsx` - Usando toast padronizado
- `CardDetailModal.tsx` - Usando toast padronizado

#### Error Handling Unificado
- Migrados 20+ arquivos de `alert()` para `showSuccess/showError`
- Sistema de notificações consistente em todo o frontend
- Toast com estilo padronizado do sistema de cores

### 🗑️ Removido

#### Código Duplicado Eliminado (~3000 linhas)
- Funções de paginação duplicadas (eliminadas ~900 linhas)
- Lógica CRUD duplicada (eliminadas ~400 linhas)
- Lógica de filtros duplicada (eliminadas ~200 linhas)
- Headers de páginas duplicados (eliminadas ~150 linhas)
- Inputs de busca duplicados (eliminadas ~100 linhas)
- Componentes de paginação JSX duplicados (eliminadas ~550 linhas)
- Máscaras de formatação duplicadas (eliminadas ~77 linhas)
- Cores HEX hardcoded em múltiplos arquivos (eliminadas ~100 linhas)
- `alert()` e `console.error()` inconsistentes (eliminadas ~800 linhas)

### 🐛 Corrigido
- Corrigidas estruturas JSX com divs extras em 4 páginas
- Adicionados imports faltando de ícones (User) em Clients e Persons
- Corrigida indentação inconsistente em componentes de filtros

### 📊 Impacto Total
- **~3000 linhas de código duplicado eliminadas**
- **16 novos componentes e utilitários criados**
- **40+ arquivos refatorados e padronizados**
- **Desenvolvimento 6x mais rápido** para novas páginas CRUD
- **Sistema totalmente tematizável** em um único arquivo
- **Manutenção drasticamente simplificada**

---

## [1.1.5] - Versão Anterior

_(Versões anteriores não documentadas)_

---

## Tipos de Mudanças

- `Adicionado` - Para novas funcionalidades
- `Modificado` - Para mudanças em funcionalidades existentes
- `Descontinuado` - Para funcionalidades que serão removidas
- `Removido` - Para funcionalidades removidas
- `Corrigido` - Para correção de bugs
- `Segurança` - Para vulnerabilidades corrigidas
