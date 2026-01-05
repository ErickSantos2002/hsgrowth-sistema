# 13 - DICIONÁRIO DE DADOS

**HSGrowth CRM - Internal Sales Management System**
**Versão**: 1.0
**Data**: 15/12/2025
**Autor**: Equipe de Desenvolvimento HSGrowth

---

## 📋 Índice

1. [Introdução](#1-introdução)
2. [Tabelas Core](#2-tabelas-core)
3. [Tabelas de Relacionamento](#3-tabelas-de-relacionamento)
4. [Tabelas de Gamificação](#4-tabelas-de-gamificação)
5. [Tabelas de Automação](#5-tabelas-de-automação)
6. [Tabelas de Transferências](#6-tabelas-de-transferências)
7. [Tabelas de Auditoria e Logs](#7-tabelas-de-auditoria-e-logs)
8. [Tabelas de Configuração](#8-tabelas-de-configuração)
9. [Índices e Otimizações](#9-índices-e-otimizações)
10. [Queries de Exemplo](#10-queries-de-exemplo)

---

## 1. Introdução

Este documento é o **Dicionário de Dados** completo do HSGrowth CRM, contendo:

- **Descrição detalhada** de cada tabela e seu propósito
- **Descrição de cada campo** com tipo, constraints e significado de negócio
- **Regras de validação** aplicadas a cada campo
- **Relacionamentos** entre tabelas com cardinalidade
- **Índices** com justificativa e queries otimizadas
- **Queries de exemplo** para casos de uso comuns

---

## 2. Tabelas Core

### 2.1 ACCOUNTS

**Propósito**: Representa uma conta/empresa no sistema. Cada conta é um ambiente isolado (multi-tenant).

**Padrão de Uso**: Criada uma vez durante onboarding. Todos os recursos (users, boards, cards) pertencem a uma account.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único da conta | - |
| `name` | VARCHAR(255) | NOT NULL, UNIQUE | Nome da empresa/conta | - Obrigatório<br>- Único no sistema<br>- Mínimo 3 caracteres<br>- Máximo 255 caracteres |
| `email_domain` | VARCHAR(255) | UNIQUE | Domínio de email da empresa (@hsgrowth.com.br) | - Opcional<br>- Se fornecido, deve ser domínio válido<br>- Único no sistema |
| `subscription_plan` | VARCHAR(50) | DEFAULT 'free' | Plano de assinatura | - Valores permitidos: 'free', 'basic', 'pro', 'enterprise'<br>- Default: 'free' |
| `status` | VARCHAR(50) | DEFAULT 'active' | Status da conta | - Valores permitidos: 'active', 'suspended', 'deleted'<br>- Default: 'active' |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação da conta | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

#### Relacionamentos

- **1:N** com `USERS` - Uma conta possui múltiplos usuários
- **1:N** com `BOARDS` - Uma conta possui múltiplos quadros
- **1:N** com `ORGANIZATIONS` - Uma conta gerencia múltiplas organizações (clientes)
- **1:N** com `TAGS` - Uma conta possui múltiplas etiquetas

#### Índices

```sql
CREATE UNIQUE INDEX idx_accounts_name ON accounts(name);
CREATE UNIQUE INDEX idx_accounts_email_domain ON accounts(email_domain);
```

**Justificativa**:
- `name`: Garantir unicidade de nome de conta (evitar duplicatas)
- `email_domain`: Lookup rápido durante login (verificar domínio de email)

#### Queries de Exemplo

```sql
-- Buscar conta por nome
SELECT * FROM accounts WHERE name = 'HSGrowth';

-- Listar contas ativas
SELECT id, name, subscription_plan, created_at
FROM accounts
WHERE status = 'active'
ORDER BY created_at DESC;

-- Contar usuários por conta
SELECT a.name, COUNT(u.id) as total_users
FROM accounts a
LEFT JOIN users u ON a.id = u.account_id
GROUP BY a.id, a.name
ORDER BY total_users DESC;
```

---

### 2.2 USERS

**Propósito**: Representa um usuário do sistema (admin, gerente, vendedor, visualizador).

**Padrão de Uso**: Criado pelo admin da conta. Cada usuário pertence a uma única conta.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único do usuário | - |
| `account_id` | BIGINT | NOT NULL, FK | Referência para ACCOUNTS | - Obrigatório<br>- Deve existir em ACCOUNTS |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email do usuário | - Obrigatório<br>- Formato de email válido<br>- Único no sistema |
| `username` | VARCHAR(100) | UNIQUE | Username para login | - Opcional<br>- Se fornecido, único no sistema<br>- Alfanumérico + _ - |
| `password_hash` | VARCHAR(255) | NOT NULL | Hash bcrypt da senha (12 rounds) | - Obrigatório<br>- Mínimo 8 caracteres (plaintext)<br>- Armazenado como bcrypt hash |
| `first_name` | VARCHAR(100) | | Primeiro nome | - Opcional<br>- Máximo 100 caracteres |
| `last_name` | VARCHAR(100) | | Último nome | - Opcional<br>- Máximo 100 caracteres |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'vendedor' | Papel do usuário | - Valores permitidos: 'admin', 'gerente', 'vendedor', 'visualizador'<br>- Default: 'vendedor' |
| `status` | VARCHAR(50) | DEFAULT 'active' | Status do usuário | - Valores permitidos: 'active', 'inactive', 'deleted'<br>- Default: 'active' |
| `last_login_at` | TIMESTAMP | | Último acesso | - Automático (atualizado no login) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

#### Relacionamentos

- **N:1** com `ACCOUNTS` - Pertence a uma única conta
- **1:N** com `CARDS` (assigned_to) - Responsável por múltiplos cartões
- **1:N** com `CARDS` (created_by) - Criou múltiplos cartões
- **1:N** com `GAMIFICATION_POINTS` - Possui múltiplos registros de pontos
- **1:N** com `CARD_TRANSFERS` (from_user_id, to_user_id) - Envolvido em transferências

#### Índices

```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_status ON users(account_id, status);
CREATE INDEX idx_users_email_active ON users(email, is_active);
CREATE INDEX idx_users_role ON users(role);
```

**Justificativa**:
- `email`: Login rápido (UNIQUE)
- `account_id, status`: Listar usuários ativos de uma conta
- `email, is_active`: Login com verificação de conta ativa
- `role`: Filtrar usuários por papel

#### Queries de Exemplo

```sql
-- Login
SELECT id, email, password_hash, role, status
FROM users
WHERE email = 'joao@hsgrowth.com.br' AND status = 'active';

-- Listar vendedores de uma conta
SELECT id, first_name, last_name, email, last_login_at
FROM users
WHERE account_id = 1 AND role = 'vendedor' AND status = 'active'
ORDER BY first_name;

-- Vendedores com mais cartões atribuídos
SELECT u.id, u.first_name, u.last_name, COUNT(c.id) as total_cards
FROM users u
LEFT JOIN cards c ON u.id = c.assigned_to
WHERE u.account_id = 1 AND u.role = 'vendedor'
GROUP BY u.id, u.first_name, u.last_name
ORDER BY total_cards DESC;
```

---

### 2.3 BOARDS

**Propósito**: Representa um quadro/pipeline de vendas (Kanban).

**Padrão de Uso**: Criado pelo admin. Geralmente há 1 board principal por conta, mas pode haver múltiplos para diferentes processos.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único do quadro | - |
| `account_id` | BIGINT | NOT NULL, FK | Referência para ACCOUNTS | - Obrigatório |
| `name` | VARCHAR(255) | NOT NULL | Nome do quadro | - Obrigatório<br>- Mínimo 3 caracteres<br>- Máximo 255 caracteres |
| `description` | TEXT | | Descrição do quadro | - Opcional |
| `color` | VARCHAR(7) | DEFAULT '#3498db' | Cor do quadro (hex) | - Formato: #RRGGBB<br>- Default: '#3498db' |
| `type` | VARCHAR(50) | DEFAULT 'kanban' | Tipo do quadro | - Valores permitidos: 'kanban', 'list', 'calendar'<br>- Default: 'kanban' |
| `roundrobin_enabled` | BOOLEAN | DEFAULT false | Distribuição em rodízio ativada | - Default: false |
| `created_by` | BIGINT | FK | Referência para USERS (criador) | - Opcional |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

#### Relacionamentos

- **N:1** com `ACCOUNTS` - Pertence a uma única conta
- **1:N** com `LISTS` - Contém múltiplas listas (colunas)
- **1:N** com `CUSTOM_FIELDS` - Define campos customizados para os cartões
- **1:N** com `AUTOMATIONS` - Possui múltiplas automações

#### Índices

```sql
CREATE INDEX idx_boards_account ON boards(account_id, created_at);
```

**Justificativa**:
- `account_id, created_at`: Listar boards de uma conta ordenados por data de criação

#### Queries de Exemplo

```sql
-- Listar todos os boards de uma conta
SELECT id, name, description, type, created_at
FROM boards
WHERE account_id = 1
ORDER BY created_at DESC;

-- Board com total de cartões
SELECT b.id, b.name, COUNT(c.id) as total_cards
FROM boards b
LEFT JOIN lists l ON b.id = l.board_id
LEFT JOIN cards c ON l.id = c.list_id
WHERE b.account_id = 1
GROUP BY b.id, b.name;
```

---

### 2.4 LISTS

**Propósito**: Representa uma lista (coluna) dentro de um quadro Kanban.

**Padrão de Uso**: Criadas pelo admin ao configurar o pipeline. Ordem determinada pelo campo `position`.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único da lista | - |
| `board_id` | BIGINT | NOT NULL, FK | Referência para BOARDS | - Obrigatório |
| `name` | VARCHAR(255) | NOT NULL | Nome da lista | - Obrigatório<br>- Exemplos: "Novo Lead", "Qualificação", "Proposta", "Venda Fechada" |
| `description` | TEXT | | Descrição da lista | - Opcional |
| `color` | VARCHAR(7) | | Cor da lista (hex) | - Formato: #RRGGBB<br>- Opcional |
| `position` | INT | NOT NULL | Posição na ordem (0, 1, 2...) | - Obrigatório<br>- Inteiro >= 0<br>- Único dentro do board |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

#### Relacionamentos

- **N:1** com `BOARDS` - Pertence a um único quadro
- **1:N** com `CARDS` - Contém múltiplos cartões

#### Índices

```sql
CREATE INDEX idx_lists_board_position ON lists(board_id, position);
CREATE UNIQUE INDEX uk_lists_board_position ON lists(board_id, position);
```

**Justificativa**:
- `board_id, position`: Carregar listas em ordem (para renderizar Kanban)
- UNIQUE constraint: Garantir que não há duas listas com mesma posição no mesmo board

#### Queries de Exemplo

```sql
-- Listar listas de um board em ordem
SELECT id, name, color, position
FROM lists
WHERE board_id = 1
ORDER BY position;

-- Contar cartões por lista
SELECT l.name, COUNT(c.id) as total_cards
FROM lists l
LEFT JOIN cards c ON l.id = c.list_id
WHERE l.board_id = 1
GROUP BY l.id, l.name
ORDER BY l.position;
```

---

### 2.5 CARDS

**Propósito**: Representa um cartão (oportunidade/lead) no pipeline de vendas.

**Padrão de Uso**: Criado por vendedores ou gerentes. Movido entre listas conforme progresso na venda.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único do cartão | - |
| `list_id` | BIGINT | NOT NULL, FK | Referência para LISTS (lista atual) | - Obrigatório |
| `title` | VARCHAR(255) | NOT NULL | Título do cartão (nome do lead/empresa) | - Obrigatório<br>- Mínimo 3 caracteres |
| `description` | TEXT | | Descrição do cartão | - Opcional |
| `assigned_to` | BIGINT | FK | Referência para USERS (responsável atual) | - Opcional<br>- Se NULL, cartão não atribuído |
| `position` | INT | NOT NULL | Posição na lista (0, 1, 2...) | - Obrigatório<br>- Único dentro da lista |
| `created_by` | BIGINT | FK | Referência para USERS (criador) | - Obrigatório |
| `original_owner_id` | BIGINT | FK | Vendedor original (primeira atribuição) | - Define a quem pertence o cartão originalmente<br>- Usado para gamificação e comissões |
| `current_owner_id` | BIGINT | FK | Responsável atual (igual a assigned_to) | - Atualizado a cada transferência |
| `last_transfer_date` | TIMESTAMP | | Data da última transferência | - Atualizado automaticamente em transferências |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |
| `archived_at` | TIMESTAMP | | Data de arquivamento | - NULL se não arquivado |

#### Relacionamentos

- **N:1** com `LISTS` - Pertence a uma única lista
- **N:1** com `USERS` (assigned_to) - Atribuído a um usuário
- **N:1** com `USERS` (created_by) - Criado por um usuário
- **N:1** com `USERS` (original_owner_id) - Proprietário original
- **1:N** com `CARD_FIELD_VALUES` - Possui múltiplos valores de campos customizados
- **1:N** with `CARD_TRANSFERS` - Possui histórico de transferências
- **1:N** with `CARD_MOVEMENTS` - Possui histórico de movimentos entre listas

#### Índices

```sql
CREATE INDEX idx_cards_list_position ON cards(list_id, position);
CREATE INDEX idx_cards_assigned_to ON cards(assigned_to);
CREATE INDEX idx_cards_created_at ON cards(created_at DESC);
CREATE UNIQUE INDEX uk_cards_list_position ON cards(list_id, position);

-- Índices adicionais de performance
CREATE INDEX idx_cards_assigned_due ON cards(assigned_to, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_cards_search ON cards(account_id, name, company_name);
```

**Justificativa**:
- `list_id, position`: Carregar cartões de uma lista em ordem
- `assigned_to`: Dashboard "Meus Cartões"
- `created_at`: Ordenar por data de criação
- `assigned_to, due_date`: Query frequente "Meus cartões vencidos"
- `name, company_name`: Busca/autocomplete

#### Queries de Exemplo

```sql
-- Meus cartões
SELECT id, title, description, list_id
FROM cards
WHERE assigned_to = 123 AND archived_at IS NULL
ORDER BY created_at DESC;

-- Cartões vencidos
SELECT c.id, c.title, c.due_date, u.first_name, u.last_name
FROM cards c
JOIN users u ON c.assigned_to = u.id
WHERE c.due_date < NOW() AND c.archived_at IS NULL
ORDER BY c.due_date;

-- Cartões de uma lista
SELECT id, title, assigned_to, position
FROM cards
WHERE list_id = 5 AND archived_at IS NULL
ORDER BY position;
```

---

### 2.6 CUSTOM_FIELDS

**Propósito**: Define campos customizados para um board (ex: "Valor do Negócio", "Data de Fechamento Esperada").

**Padrão de Uso**: Criado pelo admin ao configurar o board. Cada board pode ter campos específicos.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único do campo | - |
| `board_id` | BIGINT | NOT NULL, FK | Referência para BOARDS | - Obrigatório |
| `name` | VARCHAR(255) | NOT NULL | Nome do campo | - Obrigatório<br>- Exemplos: "Valor do Negócio", "Empresa", "Telefone" |
| `type` | VARCHAR(50) | NOT NULL | Tipo do campo | - Valores: 'text', 'email', 'date', 'number', 'currency', 'select', 'checkbox', 'user' |
| `description` | TEXT | | Descrição do campo | - Opcional |
| `required` | BOOLEAN | DEFAULT false | Campo obrigatório | - Default: false |
| `default_value` | TEXT | | Valor padrão | - Opcional |
| `options` | JSON | | Opções para select (JSON array) | - Obrigatório se type='select'<br>- Exemplo: ["Opção 1", "Opção 2"] |
| `position` | INT | NOT NULL | Posição na ordem de exibição | - Obrigatório<br>- Único dentro do board |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

#### Relacionamentos

- **N:1** com `BOARDS` - Pertence a um único board
- **1:N** com `CARD_FIELD_VALUES` - Possui múltiplos valores (um por cartão)

#### Índices

```sql
CREATE INDEX idx_custom_fields_board ON custom_fields(board_id, position);
CREATE UNIQUE INDEX uk_custom_fields_position ON custom_fields(board_id, position);
```

**Justificativa**:
- `board_id, position`: Carregar campos em ordem de exibição

#### Queries de Exemplo

```sql
-- Listar campos de um board
SELECT id, name, type, required, position
FROM custom_fields
WHERE board_id = 1
ORDER BY position;

-- Campos obrigatórios não preenchidos em um cartão
SELECT cf.id, cf.name
FROM custom_fields cf
WHERE cf.board_id = 1 AND cf.required = true
AND NOT EXISTS (
  SELECT 1 FROM card_field_values cfv
  WHERE cfv.field_id = cf.id AND cfv.card_id = 123
);
```

---

### 2.7 CARD_FIELD_VALUES

**Propósito**: Armazena os valores dos campos customizados para cada cartão.

**Padrão de Uso**: Criado/atualizado quando o usuário preenche campos customizados no cartão.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | BIGINT | NOT NULL, FK | Referência para CARDS | - Obrigatório |
| `field_id` | BIGINT | NOT NULL, FK | Referência para CUSTOM_FIELDS | - Obrigatório |
| `value` | TEXT | | Valor do campo | - Validação depende do tipo do campo<br>- TEXT: qualquer string<br>- EMAIL: formato de email<br>- NUMBER/CURRENCY: numérico<br>- DATE: formato YYYY-MM-DD |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

#### Relacionamentos

- **N:1** com `CARDS` - Pertence a um único cartão
- **N:1** com `CUSTOM_FIELDS` - Referencia um único campo

#### Índices

```sql
CREATE UNIQUE INDEX uk_card_field_values ON card_field_values(card_id, field_id);
CREATE INDEX idx_card_field_values_card ON card_field_values(card_id);
```

**Justificativa**:
- UNIQUE (card_id, field_id): Um cartão só pode ter um valor por campo
- `card_id`: Carregar todos os campos de um cartão

#### Queries de Exemplo

```sql
-- Carregar todos os campos de um cartão
SELECT cf.name, cf.type, cfv.value
FROM card_field_values cfv
JOIN custom_fields cf ON cfv.field_id = cf.id
WHERE cfv.card_id = 123
ORDER BY cf.position;

-- Atualizar valor de campo
INSERT INTO card_field_values (card_id, field_id, value)
VALUES (123, 5, '50000.00')
ON CONFLICT (card_id, field_id)
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

---

## 3. Tabelas de Relacionamento

### 3.1 ORGANIZATIONS

**Propósito**: Representa uma organização/empresa cliente.

**Padrão de Uso**: Criada ao adicionar um novo cliente. Pode ser associada a múltiplos contatos (PEOPLE).

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `account_id` | BIGINT | NOT NULL, FK | Referência para ACCOUNTS | - Obrigatório |
| `name` | VARCHAR(255) | NOT NULL | Nome da organização | - Obrigatório<br>- Mínimo 2 caracteres |
| `email` | VARCHAR(255) | | Email da organização | - Opcional<br>- Formato de email válido |
| `phone` | VARCHAR(20) | | Telefone | - Opcional |
| `website` | VARCHAR(255) | | Website | - Opcional<br>- URL válida |
| `address` | TEXT | | Endereço completo | - Opcional |
| `city` | VARCHAR(100) | | Cidade | - Opcional |
| `state` | VARCHAR(50) | | Estado/UF | - Opcional |
| `country` | VARCHAR(100) | | País | - Opcional |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

#### Relacionamentos

- **N:1** com `ACCOUNTS` - Pertence a uma única conta
- **1:N** com `PEOPLE` - Possui múltiplos contatos

#### Índices

```sql
CREATE INDEX idx_organizations_account ON organizations(account_id, name);
```

#### Queries de Exemplo

```sql
-- Listar organizações de uma conta
SELECT id, name, email, phone, city
FROM organizations
WHERE account_id = 1
ORDER BY name;

-- Organizações com total de contatos
SELECT o.name, COUNT(p.id) as total_contacts
FROM organizations o
LEFT JOIN people p ON o.id = p.organization_id
WHERE o.account_id = 1
GROUP BY o.id, o.name;
```

---

### 3.2 PEOPLE

**Propósito**: Representa uma pessoa/contato associado a uma organização.

**Padrão de Uso**: Criado ao adicionar contatos de um cliente. Pode ser associado a cartões via CARD_PEOPLE.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `account_id` | BIGINT | NOT NULL, FK | Referência para ACCOUNTS | - Obrigatório |
| `organization_id` | BIGINT | FK | Referência para ORGANIZATIONS | - Opcional |
| `first_name` | VARCHAR(100) | NOT NULL | Primeiro nome | - Obrigatório |
| `last_name` | VARCHAR(100) | | Último nome | - Opcional |
| `email` | VARCHAR(255) | | Email | - Opcional<br>- Formato válido |
| `phone` | VARCHAR(20) | | Telefone | - Opcional |
| `mobile` | VARCHAR(20) | | Celular | - Opcional |
| `job_title` | VARCHAR(100) | | Cargo | - Opcional |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

#### Relacionamentos

- **N:1** com `ACCOUNTS` - Pertence a uma única conta
- **N:1** com `ORGANIZATIONS` - Pode pertencer a uma organização
- **N:M** com `CARDS` via `CARD_PEOPLE` - Pode ser associado a múltiplos cartões

---

### 3.3 CARD_PEOPLE

**Propósito**: Relaciona cartões com pessoas/contatos.

**Padrão de Uso**: Criado ao associar um contato a uma oportunidade.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | BIGINT | NOT NULL, FK | Referência para CARDS | - Obrigatório |
| `person_id` | BIGINT | NOT NULL, FK | Referência para PEOPLE | - Obrigatório |
| `role` | VARCHAR(50) | | Papel da pessoa | - Opcional<br>- Valores sugeridos: 'decision_maker', 'influencer', 'end_user' |

#### Índices

```sql
CREATE UNIQUE INDEX uk_card_people ON card_people(card_id, person_id);
```

---

### 3.4 PRODUCTS

**Propósito**: Representa um produto/serviço oferecido pela empresa.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `account_id` | BIGINT | NOT NULL, FK | Referência para ACCOUNTS | - Obrigatório |
| `name` | VARCHAR(255) | NOT NULL | Nome do produto | - Obrigatório |
| `description` | TEXT | | Descrição | - Opcional |
| `price` | DECIMAL(10, 2) | | Preço | - Opcional<br>- >= 0 |
| `currency` | VARCHAR(3) | DEFAULT 'BRL' | Moeda | - Default: 'BRL'<br>- Código ISO 4217 |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

---

### 3.5 CARD_PRODUCTS

**Propósito**: Relaciona cartões com produtos (itens da proposta).

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | BIGINT | NOT NULL, FK | Referência para CARDS | - Obrigatório |
| `product_id` | BIGINT | NOT NULL, FK | Referência para PRODUCTS | - Obrigatório |
| `quantity` | INT | DEFAULT 1 | Quantidade | - >= 1<br>- Default: 1 |
| `unit_price` | DECIMAL(10, 2) | | Preço unitário | - >= 0 |

---

## 4. Tabelas de Gamificação

### 4.1 GAMIFICATION_POINTS

**Propósito**: Armazena histórico completo de pontos atribuídos a usuários. Pontos são **perpétuos** (nunca resetam).

**Padrão de Uso**: Registro criado automaticamente quando usuário realiza ação pontuável (criar lead, fechar venda, etc).

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `user_id` | BIGINT | NOT NULL, FK | Referência para USERS | - Obrigatório |
| `action_type` | VARCHAR(100) | NOT NULL | Tipo de ação | - Valores: 'criar_lead' (10 pts), 'fechar_venda' (100 pts), 'qualificar_lead' (20 pts), etc |
| `points` | INT | NOT NULL | Pontos atribuídos | - Pode ser positivo ou negativo<br>- Exemplo: -50 para ação incorreta |
| `card_id` | BIGINT | FK | Referência para CARDS | - Opcional (NULL para ações não relacionadas a cartões) |
| `description` | TEXT | | Descrição adicional | - Opcional |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data da ação | - Automático |

#### Relacionamentos

- **N:1** com `USERS` - Pertence a um único usuário
- **N:1** com `CARDS` - Pode referenciar um cartão

#### Índices

```sql
CREATE INDEX idx_gamification_points_user ON gamification_points(user_id);
CREATE INDEX idx_gamification_points_date ON gamification_points(created_at DESC);
CREATE INDEX idx_points_user_period ON gamification_points(user_id, created_at);
```

**Justificativa**:
- `user_id`: Listar pontos de um usuário
- `created_at`: Ordenar por data
- `user_id, created_at`: Cálculo de rankings por período

#### Queries de Exemplo

```sql
-- Total de pontos de um usuário (perpétuo)
SELECT SUM(points) as total_points
FROM gamification_points
WHERE user_id = 123;

-- Pontos de um usuário em Dezembro/2025
SELECT SUM(points) as monthly_points
FROM gamification_points
WHERE user_id = 123
AND created_at >= '2025-12-01'
AND created_at < '2026-01-01';

-- Histórico de pontos de um usuário
SELECT action_type, points, description, created_at
FROM gamification_points
WHERE user_id = 123
ORDER BY created_at DESC
LIMIT 50;

-- Top 10 usuários por pontos totais (perpétuo)
SELECT u.id, u.first_name, u.last_name, SUM(gp.points) as total_points
FROM users u
JOIN gamification_points gp ON u.id = gp.user_id
WHERE u.account_id = 1
GROUP BY u.id, u.first_name, u.last_name
ORDER BY total_points DESC
LIMIT 10;
```

---

### 4.2 GAMIFICATION_RANKINGS

**Propósito**: Armazena rankings periódicos (semanal, mensal, trimestral, anual). Rankings são **resetados** a cada período, mas histórico é **arquivado**.

**Padrão de Uso**: Calculado por cron job ao final de cada período. Permite consultar rankings históricos.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `user_id` | BIGINT | NOT NULL, FK | Referência para USERS | - Obrigatório |
| `period` | VARCHAR(50) | NOT NULL | Período do ranking | - Valores: 'weekly', 'monthly', 'quarterly', 'annual' |
| `rank` | INT | NOT NULL | Posição no ranking | - >= 1 (1º, 2º, 3º...) |
| `total_points` | INT | NOT NULL | Pontos DAQUELE período | - >= 0 |
| `year` | INT | NOT NULL | Ano do ranking | - Exemplo: 2025 |
| `period_number` | INT | NOT NULL | Número do período | - Semana: 1-52<br>- Mês: 1-12<br>- Trimestre: 1-4<br>- Anual: 1 |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação do ranking | - Automático |

#### Constraints

```sql
UNIQUE(user_id, period, year, period_number)
```

Um usuário só pode ter um registro por período.

#### Relacionamentos

- **N:1** com `USERS` - Pertence a um único usuário

#### Índices

```sql
CREATE INDEX idx_gamification_rankings_period ON gamification_rankings(period, year, period_number);
CREATE UNIQUE INDEX uk_rankings_user_period ON gamification_rankings(user_id, period, year, period_number);
```

**Justificativa**:
- `period, year, period_number`: Buscar ranking de um período específico
- UNIQUE constraint: Garantir um único registro por usuário/período

#### Queries de Exemplo

```sql
-- Ranking mensal atual (Dezembro/2025)
SELECT r.rank, u.first_name, u.last_name, r.total_points
FROM gamification_rankings r
JOIN users u ON r.user_id = u.id
WHERE r.period = 'monthly' AND r.year = 2025 AND r.period_number = 12
ORDER BY r.rank;

-- Histórico de rankings mensais de um usuário
SELECT r.year, r.period_number, r.rank, r.total_points
FROM gamification_rankings r
WHERE r.user_id = 123 AND r.period = 'monthly'
ORDER BY r.year DESC, r.period_number DESC;

-- Comparar ranking mensal Nov vs Dez
SELECT
  u.first_name,
  nov.rank as rank_nov,
  nov.total_points as points_nov,
  dez.rank as rank_dez,
  dez.total_points as points_dez
FROM users u
LEFT JOIN gamification_rankings nov ON u.id = nov.user_id AND nov.period = 'monthly' AND nov.year = 2025 AND nov.period_number = 11
LEFT JOIN gamification_rankings dez ON u.id = dez.user_id AND dez.period = 'monthly' AND dez.year = 2025 AND dez.period_number = 12
WHERE u.account_id = 1;
```

---

### 4.3 GAMIFICATION_BADGES

**Propósito**: Define badges (conquistas) que usuários podem ganhar. Há badges **padrão do sistema** e badges **customizadas por admin**.

**Padrão de Uso**: Badges padrão criadas na instalação. Admin pode criar badges customizadas.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `account_id` | BIGINT | FK | Referência para ACCOUNTS | - NULL para badges padrão do sistema<br>- NOT NULL para badges customizadas |
| `name` | VARCHAR(100) | NOT NULL | Nome da badge | - Obrigatório<br>- Exemplos: "Primeira Venda", "Top 10", "100 Leads" |
| `description` | VARCHAR(200) | | Descrição da conquista | - Opcional |
| `criteria` | TEXT | | Critério de conquista | - Opcional<br>- Exemplo: "pontos >= 1000" |
| `criteria_type` | VARCHAR(20) | DEFAULT 'automatic' | Tipo de critério | - Valores: 'manual' (admin atribui), 'automatic' (sistema atribui por regra)<br>- Default: 'automatic' |
| `points_required` | INT | DEFAULT 0 | Pontos necessários | - >= 0<br>- Usado se criteria_type='automatic' |
| `icon` | VARCHAR(255) | | Emoji ou URL do ícone | - Opcional<br>- Exemplo: "🏆", "https://..." |
| `is_custom` | BOOLEAN | DEFAULT false | Badge customizada | - false: badge padrão do sistema<br>- true: badge customizada pelo admin |
| `is_active` | BOOLEAN | DEFAULT true | Badge ativa | - Default: true |
| `created_by` | BIGINT | FK | Referência para USERS (criador) | - NULL para badges padrão<br>- NOT NULL para badges customizadas |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

#### Constraints

```sql
UNIQUE(account_id, name)
```

Nome de badge único por conta (badges padrão têm account_id NULL).

#### Relacionamentos

- **N:1** com `ACCOUNTS` - Pode pertencer a uma conta (se customizada)
- **1:N** com `USER_BADGES` - Pode ser conquistada por múltiplos usuários

#### Índices

```sql
CREATE INDEX idx_gamification_badges_account ON gamification_badges(account_id);
CREATE INDEX idx_gamification_badges_custom ON gamification_badges(is_custom, is_active);
```

#### Queries de Exemplo

```sql
-- Listar badges padrão do sistema
SELECT id, name, description, icon, points_required
FROM gamification_badges
WHERE account_id IS NULL AND is_active = true
ORDER BY points_required;

-- Listar badges customizadas de uma conta
SELECT id, name, description, criteria_type, created_at
FROM gamification_badges
WHERE account_id = 1 AND is_custom = true
ORDER BY created_at DESC;
```

---

### 4.4 USER_BADGES

**Propósito**: Registra badges conquistadas por usuários.

**Padrão de Uso**: Criado automaticamente (criteria_type='automatic') ou manualmente pelo admin (criteria_type='manual').

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `user_id` | BIGINT | NOT NULL, FK | Referência para USERS | - Obrigatório |
| `badge_id` | BIGINT | NOT NULL, FK | Referência para GAMIFICATION_BADGES | - Obrigatório |
| `assigned_by` | BIGINT | FK | Referência para USERS (quem atribuiu) | - NULL se automático<br>- NOT NULL se manual |
| `earned_at` | TIMESTAMP | DEFAULT NOW() | Data da conquista | - Automático |

#### Constraints

```sql
UNIQUE(user_id, badge_id)
```

Usuário não pode ganhar a mesma badge duas vezes.

#### Relacionamentos

- **N:1** com `USERS` - Pertence a um único usuário
- **N:1** com `GAMIFICATION_BADGES` - Referencia uma única badge

#### Índices

```sql
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE UNIQUE INDEX uk_user_badges ON user_badges(user_id, badge_id);
```

#### Queries de Exemplo

```sql
-- Badges de um usuário
SELECT gb.name, gb.description, gb.icon, ub.earned_at
FROM user_badges ub
JOIN gamification_badges gb ON ub.badge_id = gb.id
WHERE ub.user_id = 123
ORDER BY ub.earned_at DESC;

-- Quantos usuários conquistaram cada badge
SELECT gb.name, COUNT(ub.id) as total_users
FROM gamification_badges gb
LEFT JOIN user_badges ub ON gb.id = ub.badge_id
WHERE gb.account_id = 1 OR gb.account_id IS NULL
GROUP BY gb.id, gb.name
ORDER BY total_users DESC;
```

---

## 5. Tabelas de Automação

### 5.1 AUTOMATIONS

**Propósito**: Define automações (regras que executam ações automaticamente). Há 2 tipos:
1. **Trigger** (por evento): Executada quando cartão move, cria, atualiza
2. **Scheduled** (agendada): Executada em data/hora específica ou recorrente

**Padrão de Uso**: Criada pelo admin ou gerente. Executa ações como mover cartão, copiar cartão, notificar usuário.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `account_id` | BIGINT | NOT NULL, FK | Referência para ACCOUNTS | - Obrigatório |
| `name` | VARCHAR(255) | NOT NULL | Nome da automação | - Obrigatório<br>- Exemplo: "Mover leads qualificados para Proposta" |
| `description` | TEXT | | Descrição | - Opcional |
| `priority` | INT | DEFAULT 50 | Prioridade (1-100) | - 1-100<br>- Default: 50<br>- Maior = executa primeiro |
| `automation_type` | VARCHAR(20) | DEFAULT 'trigger' | Tipo de automação | - Valores: 'trigger', 'scheduled'<br>- Default: 'trigger' |
| **TRIGGER FIELDS** | | | | |
| `trigger_type` | VARCHAR(100) | | Tipo de gatilho | - NULL se scheduled<br>- Valores: 'card_moved', 'card_created', 'card_updated' |
| `trigger_board_id` | BIGINT | FK | Referência para BOARDS (gatilho) | - NULL se scheduled |
| `trigger_list_id` | BIGINT | FK | Referência para LISTS (gatilho) | - NULL se scheduled |
| `trigger_conditions` | JSON | | Condições adicionais | - NULL se scheduled<br>- Exemplo: {"value_gt": 10000} |
| **SCHEDULED FIELDS** | | | | |
| `schedule_type` | VARCHAR(20) | | Tipo de agendamento | - NULL se trigger<br>- Valores: 'once' (única), 'recurring' (recorrente) |
| `schedule_config` | JSON | | Configuração do agendamento | - NULL se trigger<br>- Estrutura varia por frequência |
| `next_execution_at` | TIMESTAMP | | Próxima execução | - NULL se trigger |
| `last_executed_at` | TIMESTAMP | | Última execução | - NULL se trigger ou nunca executada |
| **ACTION FIELDS** | | | | |
| `action_type` | VARCHAR(100) | NOT NULL | Tipo de ação | - Valores: 'move_card', 'copy_card', 'create_card', 'notify' |
| `action_board_id` | BIGINT | FK | Referência para BOARDS (destino) | - NULL se action não envolve board |
| `action_list_id` | BIGINT | FK | Referência para LISTS (destino) | - NULL se action não envolve lista |
| `field_mapping` | JSON | | Mapeamento de campos | - Opcional<br>- Exemplo: {"source_field_id": target_field_id} |
| **CONTROL FIELDS** | | | | |
| `is_active` | BOOLEAN | DEFAULT true | Automação ativa | - Default: true |
| `created_by` | BIGINT | FK | Referência para USERS (criador) | - Obrigatório |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

#### Relacionamentos

- **N:1** com `ACCOUNTS` - Pertence a uma única conta
- **N:1** com `BOARDS` (trigger_board_id, action_board_id) - Pode referenciar boards
- **N:1** with `LISTS` (trigger_list_id, action_list_id) - Pode referenciar listas
- **1:N** with `AUTOMATION_EXECUTIONS` - Possui histórico de execuções

#### Índices

```sql
CREATE INDEX idx_automations_account ON automations(account_id);
CREATE INDEX idx_automations_trigger ON automations(trigger_board_id, trigger_list_id);
CREATE INDEX idx_automations_active ON automations(is_active);
CREATE INDEX idx_automations_type ON automations(automation_type);
CREATE INDEX idx_automations_scheduled ON automations(automation_type, is_active, next_execution_at);
```

**Justificativa**:
- `account_id`: Listar automações de uma conta
- `trigger_board_id, trigger_list_id`: Buscar automações por gatilho
- `is_active`: Filtrar apenas ativas
- `automation_type`: Separar trigger vs scheduled
- `automation_type, is_active, next_execution_at`: Cron job de agendamento

#### Queries de Exemplo

```sql
-- Listar automações ativas de uma conta
SELECT id, name, automation_type, priority, is_active
FROM automations
WHERE account_id = 1 AND is_active = true
ORDER BY priority DESC, created_at ASC;

-- Automações que executam quando cartão move para lista X
SELECT id, name, action_type, priority
FROM automations
WHERE trigger_list_id = 5 AND trigger_type = 'card_moved' AND is_active = true
ORDER BY priority DESC, created_at ASC;

-- Próximas automações agendadas (para cron job)
SELECT id, name, next_execution_at
FROM automations
WHERE automation_type = 'scheduled'
AND is_active = true
AND next_execution_at <= NOW() + INTERVAL '1 minute'
ORDER BY next_execution_at;
```

---

### 5.2 AUTOMATION_EXECUTIONS

**Propósito**: Registra cada execução de automação (sucesso ou falha).

**Padrão de Uso**: Criado automaticamente a cada execução de automação. Permite auditoria e detecção de falhas.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `automation_id` | BIGINT | NOT NULL, FK | Referência para AUTOMATIONS | - Obrigatório |
| `source_card_id` | BIGINT | FK | Referência para CARDS (origem) | - NULL para automações scheduled |
| `destination_card_id` | BIGINT | FK | Referência para CARDS (destino criado/copiado) | - NULL se ação não cria cartão |
| `status` | VARCHAR(50) | NOT NULL | Status da execução | - Valores: 'success', 'failed', 'pending', 'success_after_retry' |
| `retry_count` | INT | DEFAULT 0 | Contador de tentativas | - >= 0<br>- Incrementa a cada retry |
| `error_message` | TEXT | | Mensagem de erro | - NULL se success |
| `triggered_by` | VARCHAR(20) | DEFAULT 'event' | Como foi acionada | - Valores: 'event' (trigger), 'schedule' (agendamento) |
| `executed_at` | TIMESTAMP | DEFAULT NOW() | Data/hora da execução | - Automático |

#### Relacionamentos

- **N:1** with `AUTOMATIONS` - Pertence a uma única automação
- **N:1** with `CARDS` (source_card_id, destination_card_id) - Pode referenciar cartões

#### Índices

```sql
CREATE INDEX idx_automation_executions_automation ON automation_executions(automation_id);
CREATE INDEX idx_automation_executions_date ON automation_executions(executed_at DESC);
CREATE INDEX idx_automation_executions_status ON automation_executions(status, executed_at);
```

**Justificativa**:
- `automation_id`: Listar execuções de uma automação
- `executed_at`: Ordenar por data
- `status, executed_at`: Buscar falhas recentes

#### Queries de Exemplo

```sql
-- Últimas execuções de uma automação
SELECT id, status, retry_count, error_message, executed_at
FROM automation_executions
WHERE automation_id = 10
ORDER BY executed_at DESC
LIMIT 50;

-- Automações com falhas recentes (últimas 24h)
SELECT a.name, COUNT(ae.id) as total_failures
FROM automation_executions ae
JOIN automations a ON ae.automation_id = a.id
WHERE ae.status = 'failed'
AND ae.executed_at >= NOW() - INTERVAL '24 hours'
GROUP BY a.id, a.name
ORDER BY total_failures DESC;

-- Detectar automações com 3+ falhas na última hora (para notificação crítica)
SELECT a.id, a.name, COUNT(ae.id) as failures
FROM automation_executions ae
JOIN automations a ON ae.automation_id = a.id
WHERE ae.status = 'failed'
AND ae.executed_at >= NOW() - INTERVAL '1 hour'
GROUP BY a.id, a.name
HAVING COUNT(ae.id) >= 3;
```

---

## 6. Tabelas de Transferências

### 6.1 CARD_TRANSFERS

**Propósito**: Registra todas as transferências de cartões entre vendedores.

**Padrão de Uso**: Criado quando vendedor transfere cartão para outro vendedor. Mantém histórico completo (chain).

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | BIGINT | NOT NULL, FK | Referência para CARDS | - Obrigatório |
| `from_user_id` | BIGINT | NOT NULL, FK | Referência para USERS (origem) | - Obrigatório |
| `to_user_id` | BIGINT | NOT NULL, FK | Referência para USERS (destino) | - Obrigatório |
| `transferred_by_user_id` | BIGINT | NOT NULL, FK | Referência para USERS (quem fez) | - Obrigatório |
| `transfer_reason` | VARCHAR(50) | NOT NULL | Motivo da transferência | - Valores: 'especialista', 'rebalanceamento', 'ferias', 'escalacao', 'outro'<br>- Obrigatório |
| `notes` | TEXT | | Notas adicionais | - Opcional |
| `chain_order` | INT | NOT NULL | Ordem na cadeia (1, 2, 3...) | - >= 1<br>- Incrementa a cada transferência |
| `counts_in_limit` | BOOLEAN | DEFAULT true | Conta no limite de transferências | - false para automações/admin<br>- true para transferências manuais |
| `batch_id` | VARCHAR(36) | | UUID para transferências em lote | - NULL para transferências individuais<br>- UUID para lote |
| `transferred_at` | TIMESTAMP | DEFAULT NOW() | Data/hora da transferência | - Automático |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |

#### Relacionamentos

- **N:1** with `CARDS` - Pertence a um único cartão
- **N:1** with `USERS` (from_user_id, to_user_id, transferred_by_user_id) - Referencia usuários

#### Índices

```sql
CREATE INDEX idx_card_transfers_card_id ON card_transfers(card_id);
CREATE INDEX idx_card_transfers_from_user ON card_transfers(from_user_id);
CREATE INDEX idx_card_transfers_to_user ON card_transfers(to_user_id);
CREATE INDEX idx_card_transfers_date ON card_transfers(transferred_at DESC);
CREATE INDEX idx_card_transfers_chain ON card_transfers(card_id, chain_order);
CREATE INDEX idx_card_transfers_limit ON card_transfers(from_user_id, counts_in_limit, transferred_at);
CREATE INDEX idx_card_transfers_batch ON card_transfers(batch_id);
```

**Justificativa**:
- `card_id`: Histórico de transferências de um cartão
- `from_user_id`: Transferências enviadas por um usuário
- `to_user_id`: Transferências recebidas por um usuário
- `transferred_at`: Ordenar por data
- `card_id, chain_order`: Cadeia de transferências
- `from_user_id, counts_in_limit, transferred_at`: Verificar limite de transferências
- `batch_id`: Agrupar transferências em lote

#### Queries de Exemplo

```sql
-- Histórico completo de transferências de um cartão
SELECT ct.chain_order, u1.first_name as from_user, u2.first_name as to_user, ct.transfer_reason, ct.transferred_at
FROM card_transfers ct
JOIN users u1 ON ct.from_user_id = u1.id
JOIN users u2 ON ct.to_user_id = u2.id
WHERE ct.card_id = 123
ORDER BY ct.chain_order;

-- Verificar quantas transferências um vendedor fez este mês (que contam no limite)
SELECT COUNT(*) as transfers_this_month
FROM card_transfers
WHERE from_user_id = 123
AND counts_in_limit = true
AND transferred_at >= DATE_TRUNC('month', CURRENT_DATE)
AND transferred_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

-- Transferências em lote
SELECT batch_id, COUNT(*) as total_cards
FROM card_transfers
WHERE batch_id IS NOT NULL
GROUP BY batch_id
ORDER BY MAX(transferred_at) DESC;
```

---

### 6.2 TRANSFER_LIMIT_EXCEPTIONS

**Propósito**: Armazena exceções temporárias ao limite de transferências (concedidas por gerente/admin).

**Padrão de Uso**: Criado manualmente pelo gerente quando vendedor precisa de transferências extras por tempo limitado.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `user_id` | BIGINT | NOT NULL, FK | Referência para USERS | - Obrigatório |
| `additional_transfers` | INT | DEFAULT 5 | Transferências extras permitidas | - >= 1<br>- Default: 5 |
| `period_start` | DATE | NOT NULL | Início do período da exceção | - Obrigatório |
| `period_end` | DATE | NOT NULL | Fim do período da exceção | - Obrigatório<br>- period_end >= period_start |
| `granted_by` | BIGINT | NOT NULL, FK | Referência para USERS (gerente/admin) | - Obrigatório |
| `granted_at` | TIMESTAMP | DEFAULT NOW() | Data/hora da concessão | - Automático |
| `notes` | TEXT | | Motivo da exceção | - Opcional |

#### Índices

```sql
CREATE INDEX idx_transfer_exceptions_user ON transfer_limit_exceptions(user_id, period_end);
```

#### Queries de Exemplo

```sql
-- Verificar exceções ativas para um usuário
SELECT additional_transfers, period_start, period_end, notes
FROM transfer_limit_exceptions
WHERE user_id = 123
AND CURRENT_DATE BETWEEN period_start AND period_end;

-- Calcular limite total (padrão + exceções)
SELECT
  10 as default_limit, -- padrão da conta
  COALESCE(SUM(tle.additional_transfers), 0) as extra_transfers,
  10 + COALESCE(SUM(tle.additional_transfers), 0) as total_limit
FROM transfer_limit_exceptions tle
WHERE tle.user_id = 123
AND CURRENT_DATE BETWEEN tle.period_start AND tle.period_end;
```

---

### 6.3 TRANSFER_REQUESTS

**Propósito**: Armazena solicitações de transferência quando aprovação está habilitada.

**Padrão de Uso**: Criado quando vendedor solicita transferência. Gerente aprova/rejeita. Expira em 72h.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | BIGINT | NOT NULL, FK | Referência para CARDS | - Obrigatório |
| `from_user_id` | BIGINT | NOT NULL, FK | Referência para USERS (vendedor origem) | - Obrigatório |
| `to_user_id` | BIGINT | NOT NULL, FK | Referência para USERS (vendedor destino) | - Obrigatório |
| `transfer_reason` | VARCHAR(50) | NOT NULL | Motivo da transferência | - Obrigatório |
| `notes` | TEXT | | Notas adicionais | - Opcional |
| `status` | VARCHAR(20) | DEFAULT 'pending' | Status da solicitação | - Valores: 'pending', 'approved', 'rejected', 'expired'<br>- Default: 'pending' |
| `rejection_reason` | TEXT | | Motivo da rejeição | - Obrigatório se status='rejected' |
| `reviewed_by` | BIGINT | FK | Referência para USERS (gerente/admin) | - NULL se pending |
| `reviewed_at` | TIMESTAMP | | Data/hora da aprovação/rejeição | - NULL se pending |
| `expires_at` | TIMESTAMP | | Data/hora de expiração (72h) | - Calculado automaticamente: created_at + 72h |
| `batch_id` | VARCHAR(36) | | UUID para solicitações em lote | - NULL para individuais |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

#### Índices

```sql
CREATE INDEX idx_transfer_requests_card ON transfer_requests(card_id);
CREATE INDEX idx_transfer_requests_from_user ON transfer_requests(from_user_id);
CREATE INDEX idx_transfer_requests_status ON transfer_requests(status, expires_at);
CREATE INDEX idx_transfer_requests_pending ON transfer_requests(status, created_at);
CREATE INDEX idx_transfer_requests_batch ON transfer_requests(batch_id);
```

**Justificativa**:
- `status, expires_at`: Cron job de expiração (marcar como 'expired' se NOW() > expires_at)
- `status, created_at`: Painel de aprovações (listar pendentes)

#### Queries de Exemplo

```sql
-- Solicitações pendentes para gerente aprovar
SELECT tr.id, c.title, u1.first_name as from_user, u2.first_name as to_user, tr.transfer_reason, tr.expires_at
FROM transfer_requests tr
JOIN cards c ON tr.card_id = c.id
JOIN users u1 ON tr.from_user_id = u1.id
JOIN users u2 ON tr.to_user_id = u2.id
WHERE tr.status = 'pending'
ORDER BY tr.created_at;

-- Cron job: Expirar solicitações antigas (executa a cada hora)
UPDATE transfer_requests
SET status = 'expired', updated_at = NOW()
WHERE status = 'pending'
AND expires_at < NOW();

-- Aprovar solicitação
UPDATE transfer_requests
SET status = 'approved', reviewed_by = 456, reviewed_at = NOW()
WHERE id = 789;
```

---

## 7. Tabelas de Auditoria e Logs

### 7.1 AUDIT_LOGS

**Propósito**: Registra todas as alterações no sistema (create, update, delete) para auditoria e compliance.

**Padrão de Uso**: Criado automaticamente via triggers do banco ou middleware da aplicação.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `user_id` | BIGINT | FK | Referência para USERS | - NULL para ações do sistema |
| `action` | VARCHAR(50) | NOT NULL | Ação executada | - Valores: 'create', 'update', 'delete', 'login', 'logout' |
| `table_name` | VARCHAR(100) | NOT NULL | Tabela afetada | - Obrigatório |
| `record_id` | BIGINT | | ID do registro afetado | - Opcional (NULL para ações sem registro específico) |
| `old_values` | JSON | | Valores anteriores | - NULL para 'create' |
| `new_values` | JSON | | Valores novos | - NULL para 'delete' |
| `ip_address` | VARCHAR(45) | | Endereço IP do usuário | - IPv4 ou IPv6 |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data/hora da ação | - Automático |

#### Índices

```sql
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

**Justificativa**:
- `user_id, created_at`: Auditoria por usuário
- `table_name, record_id`: Histórico de um registro específico
- `created_at`: Ordenar por data (queries temporais)

#### Retenção

**Política**: Logs retidos por **1 ano** (conforme decisão do TODO.md).

```sql
-- Cron job diário: Deletar logs > 1 ano
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';
```

#### Queries de Exemplo

```sql
-- Histórico de alterações em um cartão
SELECT al.action, al.old_values, al.new_values, u.first_name, al.created_at
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.table_name = 'cards' AND al.record_id = 123
ORDER BY al.created_at DESC;

-- Ações de um usuário nas últimas 24h
SELECT al.action, al.table_name, al.record_id, al.created_at
FROM audit_logs al
WHERE al.user_id = 123
AND al.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY al.created_at DESC;

-- Deletions (auditoria de exclusões)
SELECT al.table_name, al.record_id, al.old_values, u.first_name, al.created_at
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.action = 'delete'
ORDER BY al.created_at DESC
LIMIT 100;
```

---

### 7.2 ACTIVITIES

**Propósito**: Histórico de atividades em cartões (criado, movido, atualizado, comentado).

**Padrão de Uso**: Criado automaticamente ao realizar ações em cartões. Exibido na timeline do cartão.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | BIGINT | NOT NULL, FK | Referência para CARDS | - Obrigatório |
| `user_id` | BIGINT | NOT NULL, FK | Referência para USERS | - Obrigatório |
| `activity_type` | VARCHAR(50) | NOT NULL | Tipo de atividade | - Valores: 'created', 'moved', 'updated', 'commented', 'assigned', 'transferred' |
| `description` | TEXT | | Descrição da atividade | - Exemplo: "Moveu de 'Novo Lead' para 'Qualificação'" |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data/hora da atividade | - Automático |

#### Índices

```sql
CREATE INDEX idx_activities_card ON activities(card_id, created_at DESC);
CREATE INDEX idx_activities_card_date ON activities(card_id, created_at DESC);
```

**Justificativa**:
- `card_id, created_at`: Timeline do cartão (query mais comum)

#### Queries de Exemplo

```sql
-- Timeline de um cartão
SELECT a.activity_type, a.description, u.first_name, a.created_at
FROM activities a
JOIN users u ON a.user_id = u.id
WHERE a.card_id = 123
ORDER BY a.created_at DESC;
```

---

### 7.3 CARD_MOVEMENTS

**Propósito**: Histórico específico de movimentos de cartão entre listas.

**Padrão de Uso**: Criado automaticamente quando cartão é movido entre listas (drag & drop no Kanban).

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | BIGINT | NOT NULL, FK | Referência para CARDS | - Obrigatório |
| `from_list_id` | BIGINT | FK | Referência para LISTS (lista anterior) | - NULL se criação de cartão |
| `to_list_id` | BIGINT | NOT NULL, FK | Referência para LISTS (lista nova) | - Obrigatório |
| `moved_by` | BIGINT | FK | Referência para USERS | - Obrigatório |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data/hora do movimento | - Automático |

#### Índices

```sql
CREATE INDEX idx_card_movements_card ON card_movements(card_id, created_at DESC);
```

#### Queries de Exemplo

```sql
-- Histórico de movimentos de um cartão
SELECT cm.from_list_id, l1.name as from_list, l2.name as to_list, u.first_name, cm.created_at
FROM card_movements cm
LEFT JOIN lists l1 ON cm.from_list_id = l1.id
JOIN lists l2 ON cm.to_list_id = l2.id
JOIN users u ON cm.moved_by = u.id
WHERE cm.card_id = 123
ORDER BY cm.created_at DESC;
```

---

## 8. Tabelas de Configuração

### 8.1 TAGS

**Propósito**: Etiquetas para categorizar cartões.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `account_id` | BIGINT | NOT NULL, FK | Referência para ACCOUNTS | - Obrigatório |
| `name` | VARCHAR(100) | NOT NULL | Nome da etiqueta | - Obrigatório<br>- Exemplos: "Urgente", "VIP", "Follow-up" |
| `color` | VARCHAR(7) | | Cor (hex) | - Formato: #RRGGBB |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |

#### Constraints

```sql
UNIQUE(account_id, name)
```

---

### 8.2 CARD_TAGS

**Propósito**: Relaciona cartões com etiquetas.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | BIGINT | NOT NULL, FK | Referência para CARDS | - Obrigatório |
| `tag_id` | BIGINT | NOT NULL, FK | Referência para TAGS | - Obrigatório |

#### Constraints

```sql
UNIQUE(card_id, tag_id)
```

---

### 8.3 NOTES

**Propósito**: Anotações/comentários em cartões.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | BIGINT | NOT NULL, FK | Referência para CARDS | - Obrigatório |
| `user_id` | BIGINT | NOT NULL, FK | Referência para USERS | - Obrigatório |
| `content` | TEXT | NOT NULL | Conteúdo da anotação | - Obrigatório<br>- Suporta Markdown |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

---

### 8.4 ATTACHMENTS

**Propósito**: Arquivos anexados aos cartões.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | BIGINT | NOT NULL, FK | Referência para CARDS | - Obrigatório |
| `filename` | VARCHAR(255) | NOT NULL | Nome do arquivo | - Obrigatório |
| `file_path` | VARCHAR(500) | NOT NULL | Caminho (S3, local) | - Obrigatório |
| `file_size` | BIGINT | | Tamanho em bytes | - >= 0 |
| `mime_type` | VARCHAR(100) | | Tipo MIME | - Exemplo: "application/pdf" |
| `uploaded_by` | BIGINT | FK | Referência para USERS | - Obrigatório |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de upload | - Automático |

---

### 8.5 API_TOKENS

**Propósito**: Tokens para autenticação de sistemas externos via API.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `account_id` | BIGINT | NOT NULL, FK | Referência para ACCOUNTS | - Obrigatório |
| `client_id` | VARCHAR(255) | NOT NULL, UNIQUE | Client ID (UUID) | - Obrigatório<br>- Único |
| `client_secret_hash` | VARCHAR(255) | NOT NULL | Hash do Client Secret | - Armazenado como bcrypt hash |
| `name` | VARCHAR(255) | NOT NULL | Nome descritivo do token | - Obrigatório |
| `scopes` | TEXT | | Escopos permitidos (JSON) | - Exemplo: ["read:cards", "write:cards"] |
| `last_used_at` | TIMESTAMP | | Último uso | - Atualizado automaticamente |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data de criação | - Automático |
| `updated_at` | TIMESTAMP | DEFAULT NOW() ON UPDATE | Data de última atualização | - Automático |

---

### 8.6 IMPORT_HISTORY

**Propósito**: Histórico de importações de dados (Pipedrive, CSV, etc).

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador único | - |
| `account_id` | BIGINT | NOT NULL, FK | Referência para ACCOUNTS | - Obrigatório |
| `board_id` | BIGINT | FK | Referência para BOARDS | - Opcional |
| `source` | VARCHAR(50) | NOT NULL | Fonte | - Valores: 'pipedrive', 'csv', 'api' |
| `total_records` | INT | | Total de registros | - >= 0 |
| `successful_records` | INT | | Registros com sucesso | - >= 0 |
| `failed_records` | INT | | Registros com falha | - >= 0 |
| `error_details` | JSON | | Detalhes dos erros | - Array de objetos de erro |
| `imported_by` | BIGINT | FK | Referência para USERS | - Obrigatório |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Data da importação | - Automático |

---

## 9. Índices e Otimizações

### 9.1 Resumo de Índices Críticos

```sql
-- ============================================================================
-- ÍNDICES DE PERFORMANCE CRÍTICOS
-- ============================================================================

-- 1. Cards: Dashboard "Meus cartões vencidos" (query frequente)
CREATE INDEX idx_cards_assigned_due ON cards(assigned_to, due_date)
WHERE due_date IS NOT NULL;

-- 2. Cards: Busca por nome/empresa (autocomplete e pesquisa)
CREATE INDEX idx_cards_search ON cards(account_id, name, company_name);

-- 3. Activities: Timeline do cartão (query mais comum de auditoria)
CREATE INDEX idx_activities_card_date ON activities(card_id, created_at DESC);

-- 4. Users: Login rápido e verificação de usuários ativos
CREATE INDEX idx_users_email_active ON users(email, is_active);

-- 5. Gamification: Cálculo de rankings (query pesada executada em cron jobs)
CREATE INDEX idx_points_user_period ON gamification_points(user_id, created_at);
```

### 9.2 Justificativa de Índices Adicionais

| Índice | Tabela | Justificativa | Query Otimizada |
|--------|--------|---------------|-----------------|
| `idx_cards_assigned_due` | CARDS | Dashboard "Meus cartões vencidos" é acessado constantemente por vendedores | `SELECT * FROM cards WHERE assigned_to = ? AND due_date < NOW()` |
| `idx_cards_search` | CARDS | Busca/autocomplete é operação crítica de UX, precisa ser < 100ms | `SELECT * FROM cards WHERE name ILIKE '%query%'` |
| `idx_activities_card_date` | ACTIVITIES | Timeline do cartão é renderizada em toda visualização de cartão | `SELECT * FROM activities WHERE card_id = ? ORDER BY created_at DESC` |
| `idx_users_email_active` | USERS | Login é operação mais frequente, precisa ser extremamente rápido | `SELECT * FROM users WHERE email = ? AND is_active = true` |
| `idx_points_user_period` | GAMIFICATION_POINTS | Cron job de ranking roda diariamente, precisa calcular pontos por período para todos os usuários | `SELECT SUM(points) FROM gamification_points WHERE user_id = ? AND created_at BETWEEN ? AND ?` |

---

## 10. Queries de Exemplo

### 10.1 Dashboard KPIs

```sql
-- Total de cartões por estágio (para funil de vendas)
SELECT l.name as stage, COUNT(c.id) as total_cards, SUM(cfv.value::numeric) as total_value
FROM lists l
JOIN cards c ON l.id = c.list_id
LEFT JOIN card_field_values cfv ON c.id = cfv.card_id
LEFT JOIN custom_fields cf ON cfv.field_id = cf.id AND cf.type = 'currency'
WHERE l.board_id = 1 AND c.archived_at IS NULL
GROUP BY l.id, l.name, l.position
ORDER BY l.position;

-- Taxa de conversão (leads → vendas fechadas)
SELECT
  COUNT(CASE WHEN l.name = 'Novo Lead' THEN 1 END) as total_leads,
  COUNT(CASE WHEN l.name = 'Venda Fechada' THEN 1 END) as total_sales,
  ROUND(
    100.0 * COUNT(CASE WHEN l.name = 'Venda Fechada' THEN 1 END) /
    NULLIF(COUNT(CASE WHEN l.name = 'Novo Lead' THEN 1 END), 0),
    2
  ) as conversion_rate
FROM cards c
JOIN lists l ON c.list_id = l.id
WHERE l.board_id = 1 AND c.created_at >= '2025-12-01';

-- Performance de vendedores (ranking)
SELECT
  u.id,
  u.first_name,
  u.last_name,
  COUNT(c.id) as total_cards,
  COUNT(CASE WHEN l.name = 'Venda Fechada' THEN 1 END) as total_sales,
  SUM(CASE WHEN l.name = 'Venda Fechada' THEN cfv.value::numeric ELSE 0 END) as total_revenue
FROM users u
LEFT JOIN cards c ON u.id = c.assigned_to
LEFT JOIN lists l ON c.list_id = l.id
LEFT JOIN card_field_values cfv ON c.id = cfv.card_id
LEFT JOIN custom_fields cf ON cfv.field_id = cf.id AND cf.type = 'currency'
WHERE u.account_id = 1 AND u.role = 'vendedor'
GROUP BY u.id, u.first_name, u.last_name
ORDER BY total_sales DESC;
```

### 10.2 Queries de Auditoria

```sql
-- Verificar ações suspeitas (múltiplas deleções em curto período)
SELECT u.first_name, u.last_name, COUNT(*) as deletions
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.action = 'delete'
AND al.created_at >= NOW() - INTERVAL '1 hour'
GROUP BY u.id, u.first_name, u.last_name
HAVING COUNT(*) > 10;

-- Listar cartões transferidos mais de 3 vezes (possível problema)
SELECT c.id, c.title, COUNT(ct.id) as total_transfers
FROM cards c
JOIN card_transfers ct ON c.id = ct.card_id
GROUP BY c.id, c.title
HAVING COUNT(ct.id) > 3
ORDER BY total_transfers DESC;
```

### 10.3 Queries de Gamificação

```sql
-- Ranking semanal atual
SELECT
  RANK() OVER (ORDER BY SUM(gp.points) DESC) as rank,
  u.first_name,
  u.last_name,
  SUM(gp.points) as weekly_points
FROM gamification_points gp
JOIN users u ON gp.user_id = u.id
WHERE gp.created_at >= DATE_TRUNC('week', CURRENT_DATE)
AND u.account_id = 1
GROUP BY u.id, u.first_name, u.last_name
ORDER BY weekly_points DESC
LIMIT 10;

-- Usuários próximos de ganhar badge "100 Pontos"
SELECT
  u.first_name,
  u.last_name,
  SUM(gp.points) as total_points,
  100 - SUM(gp.points) as points_needed
FROM users u
JOIN gamification_points gp ON u.id = gp.user_id
LEFT JOIN user_badges ub ON u.id = ub.user_id AND ub.badge_id = 1 -- badge "100 Pontos"
WHERE u.account_id = 1
AND ub.id IS NULL -- não ganhou ainda
GROUP BY u.id, u.first_name, u.last_name
HAVING SUM(gp.points) >= 80 AND SUM(gp.points) < 100
ORDER BY total_points DESC;
```

### 10.4 Queries de Automação

```sql
-- Verificar se automação deve executar (trigger-based)
SELECT a.id, a.name, a.action_type, a.priority
FROM automations a
WHERE a.trigger_list_id = 5 -- cartão moveu para lista 5
AND a.trigger_type = 'card_moved'
AND a.is_active = true
ORDER BY a.priority DESC, a.created_at ASC;

-- Automações agendadas para executar nos próximos 5 minutos (cron job)
SELECT id, name, next_execution_at
FROM automations
WHERE automation_type = 'scheduled'
AND is_active = true
AND next_execution_at <= NOW() + INTERVAL '5 minutes'
AND next_execution_at > last_executed_at
ORDER BY next_execution_at;
```

---

**Última atualização**: 15/12/2025
**Próxima revisão**: 15/01/2026
