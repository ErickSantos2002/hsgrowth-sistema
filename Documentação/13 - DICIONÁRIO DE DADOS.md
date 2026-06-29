# 13 - DICIONÁRIO DE DADOS

**HSGrowth CRM - Internal Sales Management System**
**Versão**: v1.7.35 — Junho/2026
**Autor**: Equipe de Desenvolvimento HSGrowth

> **Nota de arquitetura (v1.7.35)**: o sistema é **single-tenant** — **não existe** a tabela `accounts` nem a coluna `account_id` em nenhum model. As PKs são `INTEGER` (auto-increment). As entidades-chave usam os mixins `TimestampMixin` (`created_at`, `updated_at`) e `SoftDeleteMixin` (`deleted_at`, `is_deleted`). As tabelas reais relevantes são: `roles`, `users`, `boards`, `lists`, `cards`, `field_definitions`, `card_field_values`, `clients`, `persons`, `products`, `card_products`, `card_notes`, `card_tasks`, `card_list_history`, `activities`, `attachments`, `card_transfers`, `transfer_approvals`, `gamification_*`, `user_badges`, `automations`, `automation_executions`, `audit_logs`, `notifications`, `user_notification_settings`, `email_templates`, `custom_reports`, `integration_clients`, `leads`, `cadence_templates`/`cadence_steps`/`card_cadences`, `cadencias`/`cadencia_itens`, `call_evaluations`, `api4com_config`/`user_extensions`/`call_logs` e o **módulo de Serviços** (`service_boards`, `service_lists`, `service_cards`, `service_card_products`, `service_card_activities`). Tabelas citadas neste documento que **não existem** no código: `accounts`, `organizations`, `people`, `card_people`, `custom_fields` (real: `field_definitions`), `tags`/`card_tags`, `notes` (real: `card_notes`), `card_movements` (real: `card_list_history`), `api_tokens` (real: `integration_clients`), `import_history`, `transfer_limit_exceptions`, `transfer_requests`.

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

### 2.1 ACCOUNTS — NÃO IMPLEMENTADA

**Propósito**: O conceito multi-tenant **não existe** no código. O sistema é single-tenant: não há tabela `accounts` nem coluna `account_id`. Esta seção é mantida apenas como referência histórica; ignore-a ao validar o schema. Onde o restante deste documento citar `account_id`, considere-o inexistente.

---

### 2.2 USERS

**Propósito**: Representa um usuário do sistema. O papel vem de `role_id` (FK para `roles`), não de uma coluna VARCHAR. Usa `TimestampMixin` e `SoftDeleteMixin`.

**Padrão de Uso**: Criado pelo admin. Não há multi-tenant.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único do usuário | - |
| `role_id` | INTEGER | NOT NULL, FK (roles, ON DELETE RESTRICT) | Papel/role do usuário | - Obrigatório<br>- Deve existir em ROLES |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email do usuário | - Formato válido<br>- Único |
| `username` | VARCHAR(100) | UNIQUE, NULL | Username para login | - Opcional<br>- Único se fornecido |
| `name` | VARCHAR(255) | NOT NULL | Nome completo | - **Campo único** (não há first_name/last_name) |
| `password_hash` | VARCHAR(255) | NOT NULL | Hash bcrypt da senha | - Armazenado como bcrypt hash |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Usuário ativo | - Substitui o antigo `status` |
| `is_verified` | BOOLEAN | NOT NULL, DEFAULT false | Email verificado | - |
| `last_login_at` | TIMESTAMP | NULL | Último acesso | - Atualizado no login |
| `password_changed_at` | TIMESTAMP | NULL | Última troca de senha | - |
| `reset_token` | VARCHAR(255) | NULL | Token de reset de senha | - |
| `reset_token_expires_at` | TIMESTAMP | NULL | Expiração do token de reset | - |
| `avatar_url` | VARCHAR(500) | NULL | URL da foto/avatar | - |
| `phone` | VARCHAR(20) | NULL | Telefone de contato | - |
| `ms_access_token` | TEXT | NULL | Access token Microsoft Graph | - SSO/Graph API |
| `ms_refresh_token` | TEXT | NULL | Refresh token Microsoft | - |
| `ms_token_expires_at` | TIMESTAMP | NULL | Expiração do ms_access_token | - |
| `email_signature` | TEXT | NULL | Assinatura HTML do e-mail | - Anexada ao enviar pelo CRM |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - Automático |
| `deleted_at` / `is_deleted` | | | Soft delete | - |

> **Não existem** os campos `account_id`, `first_name`, `last_name`, `role` (VARCHAR) nem `status`.

#### Relacionamentos

- **N:1** com `ROLES` - Cada usuário tem uma role
- **1:N** com `CARDS` (assigned_to_id / sdr_id) - Responsável/SDR de cartões
- **1:N** com `CARD_TASKS`, `GAMIFICATION_POINTS`, `USER_BADGES`, `NOTIFICATIONS`, `CADENCIAS`
- **1:N** com `CARD_TRANSFERS` (from_user_id, to_user_id)
- **1:1** com `USER_NOTIFICATION_SETTINGS`

#### Índices

```sql
CREATE UNIQUE INDEX ix_users_email ON users(email);
CREATE UNIQUE INDEX ix_users_username ON users(username);
CREATE INDEX ix_users_role_id ON users(role_id);
```

#### Queries de Exemplo

```sql
-- Login
SELECT id, email, password_hash, role_id, is_active
FROM users
WHERE email = 'joao@hsgrowth.com.br' AND is_active = true;

-- Listar vendedores
SELECT u.id, u.name, u.email, u.last_login_at
FROM users u JOIN roles r ON u.role_id = r.id
WHERE r.name = 'salesperson' AND u.is_active = true
ORDER BY u.name;

-- Vendedores com mais cartões atribuídos
SELECT u.id, u.name, COUNT(c.id) as total_cards
FROM users u
LEFT JOIN cards c ON u.id = c.assigned_to_id
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'salesperson'
GROUP BY u.id, u.name
ORDER BY total_cards DESC;
```

---

### 2.2.1 ROLES

**Propósito**: Define os papéis (RBAC) e suas permissões (lista JSON). Há **6 roles** de sistema.

#### Campos

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `name` | VARCHAR(50) | NOT NULL, UNIQUE | Nome interno |
| `display_name` | VARCHAR(100) | NOT NULL | Nome amigável |
| `description` | VARCHAR(500) | NULL | Descrição |
| `permissions` | JSON | NOT NULL, DEFAULT [] | Lista de permissões (ex: `["boards.read","cards.create"]`) |
| `is_system_role` | BOOLEAN | NOT NULL, DEFAULT false | Roles de sistema não podem ser deletadas |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps |

#### Roles padrão

| name | display_name | Descrição |
|------|--------------|-----------|
| `admin` | Administrador | Acesso total |
| `manager` | Gerente | Gerencia equipe e relatórios |
| `salesperson` | Vendedor | Acessa os próprios negócios |
| `sdr` | SDR | Prospecção e qualificação de leads |
| `viewer` | Visualizador | Somente leitura |
| `service` | Serviço | Acesso ao módulo de serviços |

---

### 2.3 BOARDS

**Propósito**: Representa um quadro/pipeline de vendas (Kanban).

**Padrão de Uso**: Criado pelo admin. Geralmente há 1 board principal por conta, mas pode haver múltiplos para diferentes processos.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único do quadro | - |
| `name` | VARCHAR(255) | NOT NULL | Nome do quadro | - Obrigatório |
| `description` | TEXT | NULL | Descrição do quadro | - Opcional |
| `board_type` | VARCHAR(20) | NULL | Tipo p/ gamificação | - Valores: 'prospecting', 'acquisition' ou NULL (não pontua) |
| `category` | VARCHAR(20) | NOT NULL, DEFAULT 'vendas' | Categoria | - Valores: 'vendas', 'servicos' |
| `color` | VARCHAR(50) | NULL, DEFAULT '#3B82F6' | Cor hexadecimal | - |
| `icon` | VARCHAR(50) | NULL, DEFAULT 'grid' | Nome do ícone (Lucide) | - |
| `settings` | JSON | NOT NULL, DEFAULT {} | Configurações do quadro | - |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - |
| `deleted_at` / `is_deleted` | | | Soft delete | - |

> **Não existem** `account_id`, `type`, `roundrobin_enabled` nem `created_by`. O rodízio é implementado por automações (campo `state`).

#### Relacionamentos

- **1:N** com `LISTS` - Contém múltiplas listas (colunas)
- **1:N** com `FIELD_DEFINITIONS` - Define campos customizados
- **1:N** com `AUTOMATIONS` - Automações são por quadro (board_id)

#### Queries de Exemplo

```sql
-- Listar todos os boards de vendas
SELECT id, name, description, board_type, created_at
FROM boards
WHERE category = 'vendas' AND is_deleted = false
ORDER BY created_at DESC;

-- Board com total de cartões
SELECT b.id, b.name, COUNT(c.id) as total_cards
FROM boards b
LEFT JOIN lists l ON b.id = l.board_id
LEFT JOIN cards c ON l.id = c.list_id
GROUP BY b.id, b.name;
```

---

### 2.4 LISTS

**Propósito**: Representa uma lista (coluna) dentro de um quadro Kanban.

**Padrão de Uso**: Criadas pelo admin ao configurar o pipeline. Ordem determinada pelo campo `position`.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único da lista | - |
| `board_id` | INTEGER | NOT NULL, FK (boards, CASCADE) | Referência para BOARDS | - Obrigatório |
| `name` | VARCHAR(255) | NOT NULL | Nome da lista | - Exemplos: "Leads Novos", "Em Negociação", "Fechados" |
| `color` | VARCHAR(7) | NULL | Cor da lista (hex) | - Opcional |
| `position` | INTEGER | NOT NULL, DEFAULT 0 | Posição na ordem | - >= 0 |
| `is_done_stage` | BOOLEAN | NOT NULL, DEFAULT false | Etapa de concluídos/ganhos | - |
| `is_lost_stage` | BOOLEAN | NOT NULL, DEFAULT false | Etapa de perdidos | - |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - Automático |

> **Não existe** `description`. A coluna `position` **não** possui UNIQUE constraint.

#### Relacionamentos

- **N:1** com `BOARDS` - Pertence a um único quadro
- **1:N** com `CARDS` - Contém múltiplos cartões

#### Índices

```sql
CREATE INDEX ix_lists_board_id ON lists(board_id);
```

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
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único do cartão | - |
| `list_id` | INTEGER | NOT NULL, FK (lists, CASCADE) | Lista atual | - Obrigatório |
| `client_id` | INTEGER | FK (clients, SET NULL) | Cliente/empresa | - Opcional |
| `person_id` | INTEGER | FK (persons, SET NULL) | Pessoa de contato | - Opcional |
| `assigned_to_id` | INTEGER | FK (users, SET NULL) | Responsável | - NULL = não atribuído |
| `sdr_id` | INTEGER | FK (users, SET NULL) | SDR vinculado | - Opcional |
| `title` | VARCHAR(500) | NOT NULL, INDEX | Título do cartão | - Obrigatório |
| `description` | TEXT | NULL | Descrição | - Opcional |
| `position` | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | Posição fracionária no Kanban | - Permite reordenação sem colisão |
| `value` | NUMERIC(12,2) | NULL | Valor do negócio | - Opcional |
| `shipping_cost` | NUMERIC(12,2) | NULL | Custo de frete/envio | - Somado ao total |
| `currency` | VARCHAR(3) | NOT NULL, DEFAULT 'BRL' | Moeda | - |
| `due_date` | TIMESTAMP | NULL | Data de vencimento | - |
| `closed_at` | TIMESTAMP | NULL | Data de fechamento (ganho/perdido) | - |
| `is_won` | INTEGER | NOT NULL, DEFAULT 0 | Status | - 0=aberto, 1=ganho, -1=perdido |
| `contact_info` | JSON | NULL | Dados de contato | - |
| `payment_info` | JSON | NULL | Condições de pagamento | - |
| `prospection_entry_date` | TIMESTAMP | NULL | Entrada no board Prospecção | - |
| `acquisition_entry_date` | TIMESTAMP | NULL | Entrada no board Aquisição | - |
| `expansion_entry_date` | TIMESTAMP | NULL | Entrada no board Expansão | - |
| `deal_type` | VARCHAR(50) | NULL | Tipo de negócio | - Nova Venda, Cross Sell, Up Sell |
| `modality` | VARCHAR(20) | NULL | Venda ou locação | - 'venda' \| 'locacao' (obrigatório p/ Ganho) |
| `acquisition_channel` | VARCHAR(100) | NULL | Canal de aquisição | - Inbound, Outbound... |
| `acquisition_channel_detail` | VARCHAR(200) | NULL | Detalhamento do canal | - |
| `utm_params` | TEXT | NULL | UTM (legado) | - |
| `origin` | VARCHAR(200) | NULL | Origem do lead | - Editável pelo frontend |
| `utm_campaign` / `utm_source` / `utm_term` | VARCHAR(200) | NULL | Parâmetros UTM | - |
| `loss_reason` | VARCHAR(200) | NULL | Motivo da perda | - |
| `reopened_from_card_id` | INTEGER | FK (cards, SET NULL) | Card original (reabertura) | - |
| `has_implementation` | INTEGER | NULL | Tem implementação? | - 0=false, 1=true, NULL=não informado |
| `has_personnel` | INTEGER | NULL | Tem pessoas para manusear? | - 0=false, 1=true, NULL |
| `automacao01` | BOOLEAN | NULL, DEFAULT false | Automação de nutrição | - Dispara webhook externo |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - |
| `deleted_at` / `is_deleted` | | | Soft delete | - |

> **Não existem** `account_id`, `created_by`, `original_owner_id`, `current_owner_id`, `last_transfer_date` nem `archived_at`. O responsável é `assigned_to_id`; o "arquivamento" é o soft delete (`is_deleted`/`deleted_at`); o histórico de donos vem de `card_transfers`.

#### Relacionamentos

- **N:1** com `LISTS`, `CLIENTS`, `PERSONS`
- **N:1** com `USERS` (assigned_to_id, sdr_id)
- **N:1** com `CARDS` (reopened_from_card_id) - autorreferência (reabertura)
- **1:N** com `CARD_FIELD_VALUES`, `CARD_PRODUCTS`, `CARD_NOTES`, `CARD_TASKS`, `ACTIVITIES`, `ATTACHMENTS`, `CARD_TRANSFERS`, `CARD_CADENCES`, `CARD_LIST_HISTORY`

#### Índices

```sql
CREATE INDEX ix_cards_list_id ON cards(list_id);
CREATE INDEX ix_cards_assigned_to_id ON cards(assigned_to_id);
CREATE INDEX ix_cards_client_id ON cards(client_id);
CREATE INDEX ix_cards_person_id ON cards(person_id);
CREATE INDEX ix_cards_sdr_id ON cards(sdr_id);
CREATE INDEX ix_cards_title ON cards(title);
CREATE INDEX ix_cards_reopened_from_card_id ON cards(reopened_from_card_id);
```

#### Queries de Exemplo

```sql
-- Meus cartões abertos
SELECT id, title, description, list_id
FROM cards
WHERE assigned_to_id = 123 AND is_deleted = false
ORDER BY created_at DESC;

-- Cartões vencidos (em aberto)
SELECT c.id, c.title, c.due_date, u.name
FROM cards c
JOIN users u ON c.assigned_to_id = u.id
WHERE c.due_date < NOW() AND c.is_won = 0 AND c.is_deleted = false
ORDER BY c.due_date;

-- Cartões de uma lista
SELECT id, title, assigned_to_id, position
FROM cards
WHERE list_id = 5 AND is_deleted = false
ORDER BY position;
```

---

### 2.6 FIELD_DEFINITIONS (Campos Customizados)

**Propósito**: Define campos customizados por board (tabela real: `field_definitions`, não `custom_fields`).

**Padrão de Uso**: Criado ao configurar o board. Cada board pode ter campos específicos.

#### Campos

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `board_id` | INTEGER | NOT NULL, FK (boards, CASCADE) | Referência para BOARDS |
| `name` | VARCHAR(255) | NOT NULL | Nome do campo |
| `field_type` | VARCHAR(50) | NOT NULL | Tipo (text, email, phone, number, currency, date, select...) |
| `is_required` | BOOLEAN | NOT NULL, DEFAULT false | Campo obrigatório |
| `is_unique` | BOOLEAN | NOT NULL, DEFAULT false | Valor único |
| `position` | INTEGER | NOT NULL, DEFAULT 0 | Ordem de exibição |
| `placeholder` | VARCHAR(255) | NULL | Placeholder |
| `help_text` | TEXT | NULL | Texto de ajuda |
| `options` | JSON | NULL, DEFAULT [] | Opções para select/multiselect |
| `validations` | JSON | NULL, DEFAULT {} | Validações (ex: {"min":0,"max":1000000}) |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps |

> Diferenças vs antigo "custom_fields": coluna é `field_type` (não `type`), `is_required`/`is_unique` (não `required`), há `placeholder`/`help_text`/`validations` e **não há** `description`/`default_value`. Sem UNIQUE em (board_id, position).

#### Relacionamentos

- **N:1** com `BOARDS`
- **1:N** com `CARD_FIELD_VALUES`

#### Índices

```sql
CREATE INDEX ix_field_definitions_board_id ON field_definitions(board_id);
```

#### Queries de Exemplo

```sql
-- Listar campos de um board
SELECT id, name, field_type, is_required, position
FROM field_definitions
WHERE board_id = 1
ORDER BY position;
```

---

### 2.7 CARD_FIELD_VALUES

**Propósito**: Armazena os valores dos campos customizados para cada cartão.

**Padrão de Uso**: Criado/atualizado quando o usuário preenche campos customizados no cartão.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | INTEGER | NOT NULL, FK (cards, CASCADE) | Referência para CARDS | - Obrigatório |
| `field_definition_id` | INTEGER | NOT NULL, FK (field_definitions, CASCADE) | Referência para FIELD_DEFINITIONS | - Obrigatório |
| `value` | TEXT | NULL | Valor do campo | - Convertido conforme o field_type |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - Automático |

> A FK é `field_definition_id` (não `field_id`).

#### Relacionamentos

- **N:1** com `CARDS`
- **N:1** com `FIELD_DEFINITIONS`

#### Índices/Constraints

```sql
CREATE UNIQUE INDEX unique_card_field ON card_field_values(card_id, field_definition_id);
CREATE INDEX ix_card_field_values_card_id ON card_field_values(card_id);
CREATE INDEX ix_card_field_values_field_definition_id ON card_field_values(field_definition_id);
```

#### Queries de Exemplo

```sql
-- Carregar todos os campos de um cartão
SELECT fd.name, fd.field_type, cfv.value
FROM card_field_values cfv
JOIN field_definitions fd ON cfv.field_definition_id = fd.id
WHERE cfv.card_id = 123
ORDER BY fd.position;
```

---

## 3. Tabelas de Relacionamento

### 3.1 CLIENTS

**Propósito**: Representa um cliente (PF ou PJ). Substitui a antiga "ORGANIZATIONS" (tabela real: `clients`). Usa `TimestampMixin` e `SoftDeleteMixin`.

#### Campos

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `name` | VARCHAR(255) | NOT NULL, INDEX | Nome do contato |
| `email` | VARCHAR(255) | NULL, INDEX | Email |
| `phone` | VARCHAR(20) | NULL | Telefone |
| `company_name` | VARCHAR(255) | NULL | Razão social |
| `document` | VARCHAR(20) | NULL, INDEX | CPF (11) ou CNPJ (14) |
| `address` | TEXT | NULL | Endereço |
| `city` | VARCHAR(100) | NULL | Cidade |
| `state` | VARCHAR(2) | NULL | UF |
| `country` | VARCHAR(100) | NULL, DEFAULT 'Brasil' | País |
| `website` | VARCHAR(255) | NULL | Website |
| `notes` | TEXT | NULL | Observações |
| `cnae` | VARCHAR(20) | NULL | Código CNAE |
| `linkedin_url` | VARCHAR(500) | NULL | LinkedIn da empresa |
| `relationship_type` | VARCHAR(50) | NULL | Cliente, Prospect, Lead... |
| `commercial_activity` | VARCHAR(50) | NULL | Ativo, Dormente, Inativo |
| `sector` | VARCHAR(100) | NULL | Setor/Indústria |
| `employee_count` | VARCHAR(50) | NULL | Faixa de colaboradores |
| `annual_revenue` | VARCHAR(50) | NULL | Faixa de faturamento anual |
| `source` | VARCHAR(50) | NULL | pipedrive, manual, importacao... |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Cliente ativo |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps |
| `deleted_at` / `is_deleted` | | | Soft delete |

#### Relacionamentos

- **1:N** com `PERSONS` (clients.id ← persons.organization_id)
- **1:N** com `CARDS` e `SERVICE_CARDS` (client_id)

#### Índices

```sql
CREATE INDEX ix_clients_name ON clients(name);
CREATE INDEX ix_clients_email ON clients(email);
CREATE INDEX ix_clients_document ON clients(document);
```

---

### 3.2 PERSONS

**Propósito**: Representa uma pessoa/contato vinculada a um cliente (tabela real: `persons`). O vínculo com o card é direto via `cards.person_id` — **não há** tabela de junção.

#### Campos

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `first_name` / `last_name` | VARCHAR(100) | NULL | Nome/sobrenome |
| `name` | VARCHAR(200) | NOT NULL, INDEX | Nome completo |
| `email` | VARCHAR(255) | NULL, INDEX | Email principal (legado) |
| `email_commercial` / `email_personal` | VARCHAR(255) | NULL, INDEX | Emails adicionais |
| `email_alternative` | VARCHAR(255) | NULL | Email alternativo |
| `phone` | VARCHAR(50) | NULL | Telefone principal (legado) |
| `phone_commercial` / `phone_whatsapp` | VARCHAR(50) | NULL | Telefones |
| `phone_alternative` / `phone_extra1` / `phone_extra2` | VARCHAR(50) | NULL | Telefones extras |
| `position` | VARCHAR(200) | NULL | Cargo |
| `area` | VARCHAR(200) | NULL | Área/Departamento |
| `linkedin` / `instagram` / `facebook` | VARCHAR(500) | NULL | Redes sociais |
| `organization_id` | INTEGER | FK (clients) | Cliente vinculado |
| `owner_id` | INTEGER | FK (users) | Dono/responsável |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Ativo |
| `pipedrive_id` | INTEGER | NULL, INDEX | Referência ao Pipedrive |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps |

#### Relacionamentos

- **N:1** com `CLIENTS` (organization_id) e `USERS` (owner_id)
- Vínculo com cards via `cards.person_id` (1:N)

---

### 3.3 PRODUCTS

**Propósito**: Catálogo de produtos/serviços (compartilhado entre Vendas e Serviços). Usa `TimestampMixin` e `SoftDeleteMixin`.

#### Campos

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `name` | VARCHAR(255) | NOT NULL, INDEX | Nome do produto |
| `description` | TEXT | NULL | Descrição |
| `sku` | VARCHAR(100) | UNIQUE, NULL, INDEX | Código SKU |
| `unit_price` | NUMERIC(12,2) | NOT NULL | Preço unitário padrão (vendas) |
| `calibration_price` | NUMERIC(12,2) | NULL, DEFAULT 0 | Valor da calibração (boards de serviços) |
| `currency` | VARCHAR(3) | NOT NULL, DEFAULT 'BRL' | Moeda |
| `category` | VARCHAR(100) | NULL, INDEX | Categoria |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true, INDEX | Produto ativo |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps |
| `deleted_at` / `is_deleted` | | | Soft delete |

---

### 3.4 CARD_PRODUCTS

**Propósito**: Produtos adicionados a um card de **vendas** (itens da proposta).

#### Campos

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `card_id` | INTEGER | NOT NULL, FK (cards, CASCADE) | Referência para CARDS |
| `product_id` | INTEGER | NOT NULL, FK (products, CASCADE) | Referência para PRODUCTS |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 | Quantidade |
| `unit_price` | NUMERIC(12,2) | NOT NULL | Preço unitário (pode diferir do catálogo) |
| `discount` | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | Desconto absoluto |
| `notes` | TEXT | NULL | Observações |

**Constraints**: UNIQUE (card_id, product_id) — `unique_card_product`.

---

## 4. Tabelas de Gamificação

### 4.1 GAMIFICATION_POINTS

**Propósito**: Armazena histórico completo de pontos atribuídos a usuários. Pontos são **perpétuos** (nunca resetam).

**Padrão de Uso**: Registro criado automaticamente quando usuário realiza ação pontuável (criar lead, fechar venda, etc).

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único | - |
| `user_id` | INTEGER | NOT NULL, FK (users, CASCADE) | Referência para USERS | - Obrigatório |
| `board_type` | VARCHAR(20) | NULL, INDEX | Contexto do board | - 'prospecting', 'acquisition' ou NULL |
| `points` | INTEGER | NOT NULL | Pontos atribuídos | - Pode ser negativo (penalidade) |
| `reason` | VARCHAR(100) | NOT NULL, INDEX | Motivo dos pontos | - card_created, card_won, card_lost, meeting_completed... |
| `description` | TEXT | NULL | Descrição adicional | - Opcional |
| `is_commission` | BOOLEAN | NOT NULL, DEFAULT false | É split de comissão | - |
| `commission_source_user_id` | INTEGER | FK (users, SET NULL) | Usuário da ação original | - Apenas em comissão |
| `commission_ratio` | VARCHAR(10) | NULL | Fração recebida | - ex: '1/4', '1/3' |
| `original_points` | INTEGER | NULL | Pontos antes do split | - Auditoria |
| `related_entity_type` | VARCHAR(50) | NULL | Tipo da entidade | - Card, Task, Attachment |
| `related_entity_id` | INTEGER | NULL | ID da entidade | - |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - Automático |

> Diferenças vs versão antiga: o motivo é `reason` (não `action_type`), há `board_type`, e o vínculo a card/task usa `related_entity_type`/`related_entity_id` (não `card_id`). A tabela `gamification_action_points` (board_type, action_type, points) define o valor de cada ação.

#### Relacionamentos

- **N:1** com `USERS` (user_id, commission_source_user_id)

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
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único | - |
| `user_id` | INTEGER | NOT NULL, FK (users, CASCADE) | Referência para USERS | - Obrigatório |
| `board_type` | VARCHAR(20) | NOT NULL, INDEX | Board do ranking | - 'prospecting', 'acquisition' |
| `period_type` | VARCHAR(20) | NOT NULL, INDEX | Período | - weekly, monthly, quarterly, annual |
| `period_start` | TIMESTAMP | NOT NULL, INDEX | Início do período | - |
| `period_end` | TIMESTAMP | NOT NULL, INDEX | Fim do período | - |
| `rank` | INTEGER | NOT NULL | Posição no ranking | - >= 1 |
| `points` | INTEGER | NOT NULL, DEFAULT 0 | Pontos do período | - |
| `cards_won` | INTEGER | NOT NULL, DEFAULT 0 | Cartões ganhos no período | - |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - Automático |

> Diferenças: o ranking é separado por `board_type`; o período usa `period_type` + `period_start`/`period_end` (não `period`/`year`/`period_number`); pontos em `points` (não `total_points`).

#### Constraints

```sql
CONSTRAINT unique_user_board_ranking_period UNIQUE(user_id, board_type, period_type, period_start)
```

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
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único | - |
| `name` | VARCHAR(255) | NOT NULL | Nome da badge | - Exemplos: "Primeira Venda", "Top 10" |
| `description` | TEXT | NULL | Descrição da conquista | - Opcional |
| `icon_url` | VARCHAR(500) | NULL | URL do ícone | - |
| `is_system_badge` | BOOLEAN | NOT NULL, DEFAULT false | Badge padrão do sistema | - |
| `criteria_type` | VARCHAR(50) | NOT NULL | Tipo de critério | - 'manual' ou 'automatic' |
| `criteria` | JSON | NULL | Critério (automática) | - ex: {"field":"total_points","operator":">=","value":500,"board_type":"prospecting"} |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Badge ativa | - |
| `deleted_at` | TIMESTAMP | NULL | Soft delete | - Preserva user_badges |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - Automático |

> Diferenças: o critério é JSON em `criteria` (não TEXT), o ícone é `icon_url`, e há `is_system_badge` (não `is_custom`/`account_id`/`created_by`/`points_required`).

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
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único | - |
| `user_id` | INTEGER | NOT NULL, FK (users, CASCADE) | Referência para USERS | - Obrigatório |
| `badge_id` | INTEGER | NOT NULL, FK (gamification_badges, CASCADE) | Referência para badge | - Obrigatório |
| `awarded_by_id` | INTEGER | FK (users, SET NULL) | Quem atribuiu (badges manuais) | - NULL se automático |
| `awarded_at` | TIMESTAMP | NOT NULL | Data da conquista | - Automático |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - |

> Diferenças: `awarded_by_id`/`awarded_at` (não `assigned_by`/`earned_at`).

#### Constraints

```sql
CONSTRAINT unique_user_badge UNIQUE(user_id, badge_id)
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
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único | - |
| `board_id` | INTEGER | NOT NULL, FK (boards, CASCADE) | Quadro da automação | - Automações são por quadro |
| `name` | VARCHAR(255) | NOT NULL | Nome da automação | - Obrigatório |
| `description` | TEXT | NULL | Descrição | - Opcional |
| `automation_type` | VARCHAR(20) | NOT NULL, INDEX | Tipo | - 'trigger', 'scheduled' |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Automação ativa | - |
| `priority` | INTEGER | NOT NULL, DEFAULT 50, INDEX | Prioridade (1-100) | - Maior = executa primeiro |
| **TRIGGER** | | | | |
| `trigger_event` | VARCHAR(50) | NULL, INDEX | Evento | - card_moved, card_created, card_updated, field_changed |
| `trigger_conditions` | JSON | NULL | Condições | - ex: {"from_list_id":1,"to_list_id":2} |
| **SCHEDULED** | | | | |
| `schedule_type` | VARCHAR(20) | NULL | Tipo de agendamento | - 'once', 'recurrent' |
| `scheduled_at` | TIMESTAMP | NULL | Data/hora (once) | - |
| `recurrence_pattern` | VARCHAR(20) | NULL | Recorrência | - daily, weekly, monthly, annual |
| `next_run_at` | TIMESTAMP | NULL, INDEX | Próxima execução (cron) | - |
| **AÇÕES / ESTADO** | | | | |
| `actions` | JSON | NOT NULL, DEFAULT [] | Ações a executar | - ex: [{"type":"move_card","target_list_id":3}] |
| `state` | JSON | NOT NULL, DEFAULT {} | Estado persistente | - ex: {"round_robin_last_user_id":5} |
| **CONTROLE** | | | | |
| `execution_count` | INTEGER | NOT NULL, DEFAULT 0 | Total de execuções | - |
| `last_run_at` | TIMESTAMP | NULL | Última execução | - |
| `failure_count` | INTEGER | NOT NULL, DEFAULT 0 | Total de falhas | - |
| `auto_disable_on_failures` | INTEGER | NOT NULL, DEFAULT 5 | Auto-desabilitar após X falhas | - |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - |

> Diferenças: automações são por **board_id** (sem account_id); o gatilho é `trigger_event` (não trigger_type/trigger_board_id/trigger_list_id); as ações ficam em `actions` (JSON array, não colunas action_*); o agendamento usa `scheduled_at`/`recurrence_pattern`/`next_run_at` (não schedule_config/next_execution_at). O rodízio usa `state`.

#### Relacionamentos

- **N:1** com `BOARDS` (board_id)
- **1:N** com `AUTOMATION_EXECUTIONS`

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
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único | - |
| `automation_id` | INTEGER | NOT NULL, FK (automations, CASCADE) | Referência para AUTOMATIONS | - Obrigatório |
| `card_id` | INTEGER | FK (cards, SET NULL) | Cartão que disparou | - NULL se scheduled |
| `triggered_by_id` | INTEGER | FK (users, SET NULL) | Usuário que disparou | - Opcional |
| `status` | VARCHAR(20) | NOT NULL, INDEX | Status da execução | - 'success', 'failed', 'pending' |
| `started_at` | TIMESTAMP | NOT NULL, INDEX | Início da execução | - |
| `completed_at` | TIMESTAMP | NULL | Fim da execução | - |
| `duration_ms` | FLOAT | NULL | Duração em ms | - |
| `execution_data` | JSON | NOT NULL, DEFAULT {} | Dados da execução | - Trigger, condições, ações |
| `error_message` | TEXT | NULL | Mensagem de erro | - NULL se success |
| `error_stack` | TEXT | NULL | Stack trace | - |

> Diferenças: usa `card_id`/`triggered_by_id` (não source/destination_card_id), `started_at`/`completed_at`/`duration_ms` e `execution_data`/`error_stack` (não retry_count/triggered_by/executed_at).

#### Relacionamentos

- **N:1** com `AUTOMATIONS`, `CARDS` (card_id), `USERS` (triggered_by_id)

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
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | INTEGER | NOT NULL, FK (cards, CASCADE) | Referência para CARDS | - Obrigatório |
| `from_user_id` | INTEGER | FK (users, SET NULL) | Usuário de origem | - Nullable |
| `to_user_id` | INTEGER | NOT NULL, FK (users, SET NULL) | Usuário de destino | - Obrigatório |
| `reason` | VARCHAR(100) | NOT NULL | Motivo | - reassignment, workload_balance, expertise... |
| `notes` | TEXT | NULL | Notas adicionais | - Opcional |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'completed', INDEX | Status | - completed, pending_approval, rejected |
| `is_batch_transfer` | BOOLEAN | NOT NULL, DEFAULT false | Transferência em lote | - |
| `batch_id` | VARCHAR(50) | NULL, INDEX | UUID do lote | - NULL para individuais |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - Automático |

> Diferenças: o motivo é `reason` (não transfer_reason), `from_user_id` é nullable, há `status`/`is_batch_transfer` e **não existem** `transferred_by_user_id`, `chain_order`, `counts_in_limit` nem `transferred_at`. **Não há** limite de transferências no schema (sem `transfer_limit_exceptions`/`transfer_requests`).

#### Relacionamentos

- **N:1** com `CARDS`, `USERS` (from_user_id, to_user_id)
- **1:1** com `TRANSFER_APPROVALS` (quando aprovação está ativa)

#### Índices

```sql
CREATE INDEX ix_card_transfers_card_id ON card_transfers(card_id);
CREATE INDEX ix_card_transfers_from_user_id ON card_transfers(from_user_id);
CREATE INDEX ix_card_transfers_to_user_id ON card_transfers(to_user_id);
CREATE INDEX ix_card_transfers_status ON card_transfers(status);
CREATE INDEX ix_card_transfers_batch_id ON card_transfers(batch_id);
```

#### Queries de Exemplo

```sql
-- Histórico de transferências de um cartão
SELECT ct.id, u1.name as from_user, u2.name as to_user, ct.reason, ct.created_at
FROM card_transfers ct
LEFT JOIN users u1 ON ct.from_user_id = u1.id
JOIN users u2 ON ct.to_user_id = u2.id
WHERE ct.card_id = 123
ORDER BY ct.created_at;

-- Transferências em lote
SELECT batch_id, COUNT(*) as total_cards
FROM card_transfers
WHERE batch_id IS NOT NULL
GROUP BY batch_id
ORDER BY MAX(created_at) DESC;
```

---

### 6.2 TRANSFER_APPROVALS

**Propósito**: Fluxo de aprovação de transferência (1:1 com `card_transfers`), usado quando `TRANSFER_APPROVAL_REQUIRED` está ativo. Substitui as fictícias `transfer_limit_exceptions` e `transfer_requests`.

#### Campos

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `transfer_id` | INTEGER | NOT NULL, UNIQUE, FK (card_transfers, CASCADE) | Transferência (1:1) |
| `approver_id` | INTEGER | FK (users, SET NULL) | Gerente responsável |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending', INDEX | pending, approved, rejected, expired |
| `expires_at` | TIMESTAMP | NOT NULL, INDEX | Expiração (72h padrão) |
| `decided_at` | TIMESTAMP | NULL | Data da decisão |
| `comments` | TEXT | NULL | Comentários do gerente |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps |

#### Queries de Exemplo

```sql
-- Aprovações pendentes
SELECT ta.id, c.title, ta.expires_at
FROM transfer_approvals ta
JOIN card_transfers ct ON ta.transfer_id = ct.id
JOIN cards c ON ct.card_id = c.id
WHERE ta.status = 'pending'
ORDER BY ta.created_at;

-- Cron job: expirar aprovações antigas
UPDATE transfer_approvals
SET status = 'expired', updated_at = NOW()
WHERE status = 'pending' AND expires_at < NOW();
```

---

## 7. Tabelas de Auditoria e Logs

### 7.1 AUDIT_LOGS

**Propósito**: Registra todas as alterações no sistema (create, update, delete) para auditoria e compliance.

**Padrão de Uso**: Criado automaticamente via triggers do banco ou middleware da aplicação.

#### Campos

| Campo | Tipo | Constraints | Descrição | Regras de Validação |
|-------|------|-------------|-----------|---------------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único | - |
| `user_id` | INTEGER | FK (users, SET NULL) | Quem executou | - NULL para ações do sistema |
| `action` | VARCHAR(50) | NOT NULL, INDEX | Ação executada | - CREATE, UPDATE, DELETE, LOGIN, LOGOUT |
| `entity_type` | VARCHAR(100) | NOT NULL, INDEX | Entidade afetada | - User, Card, Board... |
| `entity_id` | INTEGER | NULL, INDEX | ID da entidade afetada | - Opcional |
| `description` | TEXT | NOT NULL | Descrição legível | - Obrigatório |
| `data_before` | JSON | NULL | Estado anterior | - UPDATE/DELETE |
| `data_after` | JSON | NULL | Estado posterior | - CREATE/UPDATE |
| `ip_address` | VARCHAR(45) | NULL | Endereço IP | - IPv4/IPv6 |
| `user_agent` | VARCHAR(500) | NULL | Browser/client | - |
| `created_at` | TIMESTAMP | NOT NULL, INDEX | Data/hora da ação | - Automático |

> Diferenças: usa `entity_type`/`entity_id`/`description`/`data_before`/`data_after`/`user_agent` (não `table_name`/`record_id`/`old_values`/`new_values`).

#### Índices

```sql
CREATE INDEX ix_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX ix_audit_logs_action ON audit_logs(action);
CREATE INDEX ix_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX ix_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX ix_audit_logs_created_at ON audit_logs(created_at);
```

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
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único | - |
| `card_id` | INTEGER | NOT NULL, FK (cards, CASCADE) | Referência para CARDS | - Obrigatório |
| `user_id` | INTEGER | FK (users, SET NULL) | Quem executou | - NULL = sistema |
| `activity_type` | VARCHAR(50) | NOT NULL, INDEX | Tipo de atividade | - card_created, card_moved, field_updated, comment_added... |
| `description` | TEXT | NOT NULL | Descrição da atividade | - |
| `activity_metadata` | JSON | NOT NULL, DEFAULT {} | Metadados | - from_list_id, to_list_id, old/new value... |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps | - Automático |

> Diferenças: `user_id` é nullable, e há `activity_metadata` (JSON).

#### Índices

```sql
CREATE INDEX ix_activities_card_id ON activities(card_id);
CREATE INDEX ix_activities_user_id ON activities(user_id);
CREATE INDEX ix_activities_activity_type ON activities(activity_type);
```

#### Queries de Exemplo

```sql
-- Timeline de um cartão
SELECT a.activity_type, a.description, u.name, a.created_at
FROM activities a
LEFT JOIN users u ON a.user_id = u.id
WHERE a.card_id = 123
ORDER BY a.created_at DESC;
```

---

### 7.3 CARD_LIST_HISTORY (Histórico de Listas)

**Propósito**: Rastreia entrada/saída de cada card em cada lista (análise de funil). Substitui a fictícia "CARD_MOVEMENTS".

#### Campos

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| `card_id` | INTEGER | NOT NULL, FK (cards, CASCADE) | Card movido |
| `list_id` | INTEGER | NOT NULL, FK (lists, CASCADE) | Lista de destino |
| `board_id` | INTEGER | NOT NULL, FK (boards, CASCADE) | Board (desnormalizado) |
| `entered_at` | TIMESTAMP | NOT NULL | Quando entrou na lista |
| `exited_at` | TIMESTAMP | NULL | Quando saiu (NULL = ainda está aqui) |

#### Queries de Exemplo

```sql
-- Tempo em cada etapa de um card
SELECT clh.list_id, l.name, clh.entered_at, clh.exited_at
FROM card_list_history clh
JOIN lists l ON clh.list_id = l.id
WHERE clh.card_id = 123
ORDER BY clh.entered_at;
```

---

## 8. Tabelas de Suporte e Configuração

> **Não existem** as tabelas `tags`, `card_tags`, `notes`, `api_tokens` nem `import_history`. As reais são listadas abaixo.

### 8.1 CARD_NOTES (Anotações)

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK | Identificador único |
| `card_id` | INTEGER | NOT NULL, FK (cards, CASCADE) | Card |
| `user_id` | INTEGER | NOT NULL, FK (users, CASCADE) | Autor |
| `content` | TEXT | NOT NULL | Conteúdo da anotação |
| `note_type` | VARCHAR(50) | NULL | Tipo (ex: ligacao, geral) |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps |

---

### 8.2 CARD_TASKS (Atividades/Tarefas)

**Propósito**: Atividades criadas pelos usuários (ligação, reunião, tarefa, e-mail, WhatsApp...). Diferente de `activities` (auditoria).

Campos principais: `card_id` (FK), `assigned_to_id` (FK users), `created_by_id` (FK users), `title`, `description`, `task_type` (ENUM: call, meeting, task, follow_up, deadline, email, lunch, whatsapp, linkedin, other), `priority` (ENUM: normal, high, urgent), `due_date`, `duration_minutes`, `is_completed`, `completed_at`, `is_valid` (NULL/TRUE/FALSE), `is_noshow`, `is_cancelled`, `location`, `video_link`, `notes`, `contact_name`, `status` (ENUM: free, busy), integração Teams (`teams_meeting_id`, `teams_join_url`, `teams_event_id`, `transcript_raw`, `transcript_analysis`), `card_cadence_id` (FK card_cadences). Timestamps via TimestampMixin.

---

### 8.3 ATTACHMENTS (Anexos)

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK | Identificador único |
| `card_id` | INTEGER | NOT NULL, FK (cards, CASCADE) | Card |
| `uploaded_by_id` | INTEGER | FK (users, SET NULL) | Quem fez upload |
| `filename` | VARCHAR(255) | NOT NULL | Nome único gerado pelo sistema |
| `original_filename` | VARCHAR(500) | NOT NULL | Nome original |
| `file_size` | BIGINT | NOT NULL | Tamanho em bytes |
| `mime_type` | VARCHAR(100) | NOT NULL | Tipo MIME |
| `storage_path` | VARCHAR(1000) | NOT NULL | Caminho relativo (ex: cards/123/abc.pdf) |
| `attachment_type` | VARCHAR(50) | NOT NULL, DEFAULT 'general', INDEX | general, proposal... |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps (+ soft delete) |

> Diferenças vs antigo: `original_filename` + `storage_path` (não `file_path`), `uploaded_by_id` (não `uploaded_by`), `attachment_type`.

---

### 8.4 INTEGRATION_CLIENTS (autenticação externa / API)

**Propósito**: Substitui a fictícia "api_tokens". Clients externos que autenticam via client_credentials (ex: N8N).

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK | Identificador único |
| `name` | VARCHAR(200) | NOT NULL, INDEX | Nome descritivo |
| `description` | TEXT | NULL | Descrição |
| `client_id` | VARCHAR(100) | NOT NULL, UNIQUE, INDEX | ID público |
| `client_secret_hash` | VARCHAR(255) | NOT NULL | Hash do secret |
| `impersonate_user_id` | INTEGER | NULL | User usado como criador nas ações |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Ativo |
| `last_used_at` | TIMESTAMP | NULL | Último uso |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps |

---

### 8.5 Outras tabelas de suporte

| Tabela | Descrição / Campos principais |
|--------|-------------------------------|
| `leads` | Leads não convertidos (title, value, source, owner_id, person_id, organization_id, board_id, list_id, status, is_archived, custom_fields JSON, pipedrive_id) |
| `notifications` | Notificações in-app (user_id, notification_type, title, message, icon, color, notification_metadata JSON, is_read, read_at) |
| `user_notification_settings` | Preferências por usuário (task_assigned, task_due_soon, card_moved, card_product_changed, achievement_unlocked); UNIQUE(user_id) |
| `email_templates` | Templates de e-mail (name, subject, body com variáveis {{...}}, is_active, created_by_id, soft delete) |
| `custom_reports` | Dashboards salvos (name, created_by_id, config JSON, charts_count) |
| `cadence_templates` / `cadence_steps` / `card_cadences` | Cadência por lead (template → etapas com day_offset/activity_type → instância por card com status/current_step_order) |
| `cadencias` / `cadencia_itens` | Cadência por metas de atividade (user_id, name; itens: activity_type + quantity) |
| `call_evaluations` | Avaliação de ligação por IA (card_id, call_log_id, transcript, summary, matrix_evaluation JSON, final_score, classification) |
| `api4com_config` / `user_extensions` / `call_logs` | VOIP API4COM (config; ramal por vendedor; histórico de chamadas — call_logs liga a `cards` OU `service_cards`, status, duration, recording_url) |

---

## 8.A Módulo de Serviços

Módulo **independente** de Vendas, com tabelas próprias. Compartilha o catálogo `products` e as entidades `clients`/`persons`.

### 8.A.1 SERVICE_BOARDS

Campos: `id`, `name`, `description`, `color` (DEFAULT '#8B5CF6'), `icon` (DEFAULT 'wrench'), `settings` JSON, timestamps + soft delete. (Independente de `boards`.)

### 8.A.2 SERVICE_LISTS

Campos: `id`, `board_id` (FK service_boards, CASCADE), `name`, `color`, `position`, `is_done_stage`, `is_lost_stage`, timestamps.

### 8.A.3 SERVICE_CARDS

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK | Identificador único |
| `list_id` | INTEGER | NOT NULL, FK (service_lists, CASCADE) | Lista atual |
| `assigned_to_id` | INTEGER | FK (users, SET NULL) | Responsável |
| `title` | VARCHAR(500) | NOT NULL, INDEX | Título |
| `description` | TEXT | NULL | Descrição |
| `position` | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | Posição fracionária |
| `client_id` | INTEGER | FK (clients, SET NULL) | Empresa |
| `person_id` | INTEGER | FK (persons, SET NULL) | Contato |
| `contact_info` | JSON | NULL | Dados de contato |
| `payment_info` | JSON | NULL | Desconto global, forma de pagamento, parcelas, notas |
| `business_info` | JSON | NULL | seller_name, deal_type, acquisition_channel, modality, should_invoice... |
| `due_date` | TIMESTAMP | NULL | Data prevista de conclusão |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps (+ soft delete) |

### 8.A.4 SERVICE_CARD_PRODUCTS

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK | Identificador único |
| `service_card_id` | INTEGER | NOT NULL, FK (service_cards, CASCADE) | Card de serviço |
| `product_id` | INTEGER | NOT NULL, FK (products, CASCADE) | Produto |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 | Quantidade |
| `unit_price` | NUMERIC(12,2) | NOT NULL | Preço unitário |
| `discount` | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | Desconto absoluto |
| `notes` | TEXT | NULL | Observações |
| `aparelhos` | JSON | NULL | Sub-lista de aparelhos (1 item por aparelho) |
| | | | Ex: `[{"serial_number":"AB123","model":"X100","alcohol_module":"Sim","next_recalibration_date":"2026-08-10"}]` |

**Constraints**: UNIQUE (service_card_id, product_id) — `unique_service_card_product`.

### 8.A.5 SERVICE_CARD_ACTIVITIES

Registro unificado de eventos do card de serviço. `category` ∈ {atividade, anotacao, arquivo, alteracao}.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| `id` | INTEGER | PK | Identificador único |
| `service_card_id` | INTEGER | NOT NULL, FK (service_cards, CASCADE) | Card de serviço |
| `user_id` | INTEGER | FK (users, SET NULL) | Autor (NULL = sistema) |
| `category` | VARCHAR(20) | NOT NULL, INDEX | atividade, anotacao, arquivo, alteracao |
| `activity_type` | VARCHAR(50) | NULL | call, task, note, stage_change... |
| `title` | VARCHAR(500) | NULL | Título |
| `description` | TEXT | NULL | Descrição |
| `activity_metadata` | JSON | NULL | Metadados |
| `priority` | VARCHAR(20) | NULL | normal, high, urgent (campo de "atividade") |
| `due_date` | TIMESTAMP | NULL | Vencimento (Foco) |
| `is_completed` | BOOLEAN | NOT NULL, DEFAULT false | Concluída |
| `completed_at` | TIMESTAMP | NULL | Data de conclusão |
| `file_name` / `file_path` | VARCHAR | NULL | Metadados de arquivo |
| `file_size` | BIGINT | NULL | Tamanho |
| `mime_type` | VARCHAR(100) | NULL | Tipo MIME |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Timestamps |

---

## 9. Índices e Otimizações

> ⚠️ As queries de exemplo das seções 9 e 10 abaixo são **ilustrativas/históricas** e podem referenciar colunas que não existem no schema atual (`account_id`, `assigned_to`, `first_name`/`last_name`, `field_id`, `cf.type`). Para os nomes reais, use as seções 2–8.A acima. Equivalências rápidas: `assigned_to` → `assigned_to_id`; `u.first_name, u.last_name` → `u.name`; `custom_fields`/`field_id` → `field_definitions`/`field_definition_id`; sem `account_id` (single-tenant); "arquivado" → `is_deleted = false`.

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
-- Verificar automações de um board para um evento (trigger-based)
SELECT a.id, a.name, a.actions, a.priority
FROM automations a
WHERE a.board_id = 1
AND a.trigger_event = 'card_moved'
AND a.is_active = true
ORDER BY a.priority DESC, a.created_at ASC;

-- Automações agendadas para executar (cron job)
SELECT id, name, next_run_at
FROM automations
WHERE automation_type = 'scheduled'
AND is_active = true
AND next_run_at <= NOW() + INTERVAL '5 minutes'
ORDER BY next_run_at;
```

---

**Versão**: v1.7.35 — Junho/2026
**Status**: Atualizado para refletir os models reais (single-tenant; módulo de Serviços incluído). Seções 9–10 mantêm queries ilustrativas com nota de equivalência de colunas.
