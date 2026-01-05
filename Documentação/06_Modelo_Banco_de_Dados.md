# 06 - MODELO DE BANCO DE DADOS

## 1. INTRODUÇÃO

Este documento descreve o modelo de dados do sistema HSGrowth CRM, incluindo entidades, atributos, relacionamentos e constraints. O banco de dados utiliza PostgreSQL como SGBD.

---

## 2. DIAGRAMA ENTIDADE-RELACIONAMENTO (ER) - VISÃO GERAL

### 2.1 Diagrama Principal (Estrutura Core)

```
┌─────────────────────┐
│      ACCOUNTS       │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ email_domain        │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │ 1
           │
           │ N
           ├─────────────────┐
           │                 │
    ┌──────▼──────┐   ┌──────▼──────┐
    │    USERS    │   │   BOARDS    │
    ├─────────────┤   ├─────────────┤
    │ id (PK)     │   │ id (PK)     │
    │ account_id  │   │ account_id  │
    │ email       │   │ name        │
    │ password    │   │ description │
    │ role        │   │ color       │
    │ status      │   │ type        │
    │ created_at  │   │ created_at  │
    └──────┬──────┘   └──────┬──────┘
           │                 │
           │                 │ 1
           │                 │
           │                 │ N
           │          ┌──────▼──────┐
           │          │    LISTS    │
           │          ├─────────────┤
           │          │ id (PK)     │
           │          │ board_id    │
           │          │ name        │
           │          │ color       │
           │          │ position    │
           │          │ created_at  │
           │          └──────┬──────┘
           │                 │
           │                 │ 1
           │                 │
           │                 │ N
           │          ┌──────▼──────────────┐
           │          │       CARDS         │
           │          ├─────────────────────┤
           │          │ id (PK)             │
           │          │ list_id             │
           │          │ title               │
           │          │ description         │
           │          │ assigned_to         │
           │          │ original_owner_id   │ ← TRANSFERÊNCIAS
           │          │ current_owner_id    │ ← TRANSFERÊNCIAS
           │          │ position            │
           │          │ created_at          │
           │          │ updated_at          │
           │          └──────┬──────────────┘
           │                 │
           │                 │ 1
           │                 │
           │                 │ N
           │          ┌──────▼────────────┐
           │          │ CARD_FIELD_VALUES │
           │          ├───────────────────┤
           │          │ id (PK)           │
           │          │ card_id           │
           │          │ field_id          │
           │          │ value             │
           │          └───────────────────┘
           │
           └─────────────────┐
                             │
                             │ 1
                             │
                             │ N
                    ┌────────▼──────────┐
                    │ CUSTOM_FIELDS     │
                    ├───────────────────┤
                    │ id (PK)           │
                    │ board_id          │
                    │ name              │
                    │ type              │
                    │ required          │
                    │ default_value     │
                    │ position          │
                    │ created_at        │
                    └───────────────────┘
```

### 2.2 Diagrama de Módulos Adicionais

```
┌──────────────────────────────────────────────────────────────┐
│                    MÓDULOS ADICIONAIS                        │
└──────────────────────────────────────────────────────────────┘

CARDS ────┐
          │ 1:N
          ├──→ CARD_TRANSFERS (Transferências)
          │    ├─ from_user_id → USERS
          │    ├─ to_user_id → USERS
          │    └─ chain_order
          │
          └──→ CARD_MOVEMENTS (Histórico de Movimentos)

USERS ────┐
          │ 1:N
          ├──→ GAMIFICATION_POINTS (Pontos)
          │    ├─ action_type
          │    ├─ points
          │    └─ card_id
          │
          │ 1:N
          ├──→ GAMIFICATION_RANKINGS (Rankings)
          │    ├─ period (weekly/monthly/quarterly/annual)
          │    ├─ rank
          │    └─ total_points
          │
          └──→ USER_BADGES (Badges Conquistadas)
               └─ badge_id → GAMIFICATION_BADGES

BOARDS ───┐
          │ 1:N
          └──→ AUTOMATIONS (Automações)
               ├─ trigger_type (card_moved/created/updated)
               ├─ action_type (move/copy/create/notify)
               ├─ field_mapping (JSON)
               └─ is_active

AUTOMATIONS ─→ AUTOMATION_EXECUTIONS
               ├─ status (success/failed/pending)
               ├─ retry_count ← NOVO
               └─ error_message
```

---

## 3. DESCRIÇÃO DAS TABELAS

### 3.1 ACCOUNTS (Contas)

**Descrição**: Representa uma conta/empresa no sistema.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| name | VARCHAR(255) | NOT NULL, UNIQUE | Nome da conta |
| email_domain | VARCHAR(255) | UNIQUE | Domínio de email da empresa |
| subscription_plan | VARCHAR(50) | DEFAULT 'free' | Plano de assinatura |
| status | VARCHAR(50) | DEFAULT 'active' | Status (active, suspended, deleted) |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE (name)
- UNIQUE (email_domain)

---

### 3.2 USERS (Usuários)

**Descrição**: Representa um usuário do sistema.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| account_id | BIGINT | NOT NULL, FK | Referência para ACCOUNTS |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Email do usuário |
| username | VARCHAR(100) | UNIQUE | Username para login |
| password_hash | VARCHAR(255) | NOT NULL | Hash bcrypt da senha |
| first_name | VARCHAR(100) | | Primeiro nome |
| last_name | VARCHAR(100) | | Último nome |
| role | VARCHAR(50) | NOT NULL, DEFAULT 'vendedor' | Role (admin, gerente, vendedor, visualizador) |
| status | VARCHAR(50) | DEFAULT 'active' | Status (active, inactive, deleted) |
| last_login_at | TIMESTAMP | | Último acesso |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (account_id) REFERENCES ACCOUNTS(id)
- UNIQUE (account_id, email)
- INDEX (account_id, status)

---

### 3.3 ROLES_PERMISSIONS (Papéis e Permissões)

**Descrição**: Define permissões para cada role.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| role | VARCHAR(50) | NOT NULL | Role (admin, gerente, vendedor, visualizador) |
| permission | VARCHAR(100) | NOT NULL | Permissão (create_card, read_card, update_card, delete_card, etc.) |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE (role, permission)
- INDEX (role)

---

### 3.4 BOARDS (Quadros)

**Descrição**: Representa um quadro/pipeline de vendas.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| account_id | BIGINT | NOT NULL, FK | Referência para ACCOUNTS |
| name | VARCHAR(255) | NOT NULL | Nome do quadro |
| description | TEXT | | Descrição do quadro |
| color | VARCHAR(7) | DEFAULT '#3498db' | Cor do quadro (hex) |
| type | VARCHAR(50) | DEFAULT 'kanban' | Tipo (kanban, list, calendar) |
| roundrobin_enabled | BOOLEAN | DEFAULT false | Distribuição em rodízio ativada |
| created_by | BIGINT | FK | Referência para USERS (criador) |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (account_id) REFERENCES ACCOUNTS(id)
- FOREIGN KEY (created_by) REFERENCES USERS(id)
- INDEX (account_id, created_at)

---

### 3.5 LISTS (Listas/Colunas)

**Descrição**: Representa uma lista (coluna) dentro de um quadro.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| board_id | BIGINT | NOT NULL, FK | Referência para BOARDS |
| name | VARCHAR(255) | NOT NULL | Nome da lista |
| description | TEXT | | Descrição da lista |
| color | VARCHAR(7) | | Cor da lista (hex) |
| position | INT | NOT NULL | Posição na ordem |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (board_id) REFERENCES BOARDS(id)
- INDEX (board_id, position)
- UNIQUE (board_id, position)

---

### 3.6 CUSTOM_FIELDS (Campos Customizados)

**Descrição**: Define campos customizados para um quadro.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| board_id | BIGINT | NOT NULL, FK | Referência para BOARDS |
| name | VARCHAR(255) | NOT NULL | Nome do campo |
| type | VARCHAR(50) | NOT NULL | Tipo (text, email, date, number, select, checkbox, etc.) |
| description | TEXT | | Descrição do campo |
| required | BOOLEAN | DEFAULT false | Campo obrigatório |
| default_value | TEXT | | Valor padrão |
| options | JSON | | Opções para select (JSON array) |
| position | INT | NOT NULL | Posição na ordem |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (board_id) REFERENCES BOARDS(id)
- INDEX (board_id, position)
- UNIQUE (board_id, position)

---

### 3.7 CARDS (Cartões)

**Descrição**: Representa um cartão (oportunidade/lead).

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| list_id | BIGINT | NOT NULL, FK | Referência para LISTS |
| title | VARCHAR(255) | NOT NULL | Título do cartão |
| description | TEXT | | Descrição do cartão |
| assigned_to | BIGINT | FK | Referência para USERS (responsável atual) |
| position | INT | NOT NULL | Posição na lista |
| created_by | BIGINT | FK | Referência para USERS (criador) |
| original_owner_id | BIGINT | FK | Referência para USERS (vendedor original - primeira atribuição) |
| current_owner_id | BIGINT | FK | Referência para USERS (responsável atual - mesmo que assigned_to) |
| last_transfer_date | TIMESTAMP | | Data da última transferência |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |
| archived_at | TIMESTAMP | | Data de arquivamento |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (list_id) REFERENCES LISTS(id)
- FOREIGN KEY (assigned_to) REFERENCES USERS(id)
- FOREIGN KEY (created_by) REFERENCES USERS(id)
- INDEX (list_id, position)
- INDEX (assigned_to)
- INDEX (created_at)
- UNIQUE (list_id, position)

---

### 3.8 CARD_FIELD_VALUES (Valores de Campos)

**Descrição**: Armazena valores dos campos customizados para cada cartão.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| card_id | BIGINT | NOT NULL, FK | Referência para CARDS |
| field_id | BIGINT | NOT NULL, FK | Referência para CUSTOM_FIELDS |
| value | TEXT | | Valor do campo |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (card_id) REFERENCES CARDS(id)
- FOREIGN KEY (field_id) REFERENCES CUSTOM_FIELDS(id)
- UNIQUE (card_id, field_id)
- INDEX (card_id)

---

### 3.9 ORGANIZATIONS (Organizações)

**Descrição**: Representa uma organização/empresa cliente.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| account_id | BIGINT | NOT NULL, FK | Referência para ACCOUNTS |
| name | VARCHAR(255) | NOT NULL | Nome da organização |
| email | VARCHAR(255) | | Email da organização |
| phone | VARCHAR(20) | | Telefone |
| website | VARCHAR(255) | | Website |
| address | TEXT | | Endereço |
| city | VARCHAR(100) | | Cidade |
| state | VARCHAR(50) | | Estado |
| country | VARCHAR(100) | | País |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (account_id) REFERENCES ACCOUNTS(id)
- INDEX (account_id, name)

---

### 3.10 PEOPLE (Pessoas/Contatos)

**Descrição**: Representa uma pessoa/contato.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| account_id | BIGINT | NOT NULL, FK | Referência para ACCOUNTS |
| organization_id | BIGINT | FK | Referência para ORGANIZATIONS |
| first_name | VARCHAR(100) | NOT NULL | Primeiro nome |
| last_name | VARCHAR(100) | | Último nome |
| email | VARCHAR(255) | | Email |
| phone | VARCHAR(20) | | Telefone |
| mobile | VARCHAR(20) | | Celular |
| job_title | VARCHAR(100) | | Cargo |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (account_id) REFERENCES ACCOUNTS(id)
- FOREIGN KEY (organization_id) REFERENCES ORGANIZATIONS(id)
- INDEX (account_id, email)

---

### 3.11 CARD_PEOPLE (Relacionamento Cartão-Pessoa)

**Descrição**: Relaciona cartões com pessoas.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| card_id | BIGINT | NOT NULL, FK | Referência para CARDS |
| person_id | BIGINT | NOT NULL, FK | Referência para PEOPLE |
| role | VARCHAR(50) | | Papel da pessoa (decision_maker, influencer, etc.) |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (card_id) REFERENCES CARDS(id)
- FOREIGN KEY (person_id) REFERENCES PEOPLE(id)
- UNIQUE (card_id, person_id)

---

### 3.12 PRODUCTS (Produtos)

**Descrição**: Representa um produto/serviço.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| account_id | BIGINT | NOT NULL, FK | Referência para ACCOUNTS |
| name | VARCHAR(255) | NOT NULL | Nome do produto |
| description | TEXT | | Descrição |
| price | DECIMAL(10, 2) | | Preço |
| currency | VARCHAR(3) | DEFAULT 'BRL' | Moeda |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (account_id) REFERENCES ACCOUNTS(id)
- INDEX (account_id, name)

---

### 3.13 CARD_PRODUCTS (Relacionamento Cartão-Produto)

**Descrição**: Relaciona cartões com produtos.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| card_id | BIGINT | NOT NULL, FK | Referência para CARDS |
| product_id | BIGINT | NOT NULL, FK | Referência para PRODUCTS |
| quantity | INT | DEFAULT 1 | Quantidade |
| unit_price | DECIMAL(10, 2) | | Preço unitário |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (card_id) REFERENCES CARDS(id)
- FOREIGN KEY (product_id) REFERENCES PRODUCTS(id)
- UNIQUE (card_id, product_id)

---

### 3.14 NOTES (Anotações)

**Descrição**: Anotações/comentários em cartões.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| card_id | BIGINT | NOT NULL, FK | Referência para CARDS |
| user_id | BIGINT | NOT NULL, FK | Referência para USERS |
| content | TEXT | NOT NULL | Conteúdo da anotação |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (card_id) REFERENCES CARDS(id)
- FOREIGN KEY (user_id) REFERENCES USERS(id)
- INDEX (card_id, created_at)

---

### 3.15 ATTACHMENTS (Anexos)

**Descrição**: Arquivos anexados aos cartões.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| card_id | BIGINT | NOT NULL, FK | Referência para CARDS |
| filename | VARCHAR(255) | NOT NULL | Nome do arquivo |
| file_path | VARCHAR(500) | NOT NULL | Caminho do arquivo (S3, etc.) |
| file_size | BIGINT | | Tamanho em bytes |
| mime_type | VARCHAR(100) | | Tipo MIME |
| uploaded_by | BIGINT | FK | Referência para USERS |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (card_id) REFERENCES CARDS(id)
- FOREIGN KEY (uploaded_by) REFERENCES USERS(id)
- INDEX (card_id)

---

### 3.16 ACTIVITIES (Atividades)

**Descrição**: Histórico de atividades em cartões.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| card_id | BIGINT | NOT NULL, FK | Referência para CARDS |
| user_id | BIGINT | NOT NULL, FK | Referência para USERS |
| activity_type | VARCHAR(50) | NOT NULL | Tipo (created, moved, updated, commented, etc.) |
| description | TEXT | | Descrição da atividade |
| created_at | TIMESTAMP | DEFAULT NOW() | Data da atividade |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (card_id) REFERENCES CARDS(id)
- FOREIGN KEY (user_id) REFERENCES USERS(id)
- INDEX (card_id, created_at)

---

### 3.17 TAGS (Etiquetas)

**Descrição**: Etiquetas para categorizar cartões.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| account_id | BIGINT | NOT NULL, FK | Referência para ACCOUNTS |
| name | VARCHAR(100) | NOT NULL | Nome da etiqueta |
| color | VARCHAR(7) | | Cor (hex) |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (account_id) REFERENCES ACCOUNTS(id)
- UNIQUE (account_id, name)

---

### 3.18 CARD_TAGS (Relacionamento Cartão-Etiqueta)

**Descrição**: Relaciona cartões com etiquetas.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| card_id | BIGINT | NOT NULL, FK | Referência para CARDS |
| tag_id | BIGINT | NOT NULL, FK | Referência para TAGS |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (card_id) REFERENCES CARDS(id)
- FOREIGN KEY (tag_id) REFERENCES TAGS(id)
- UNIQUE (card_id, tag_id)

---

### 3.19 CARD_MOVEMENTS (Movimentos de Cartão)

**Descrição**: Histórico de movimentos de cartão entre listas.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| card_id | BIGINT | NOT NULL, FK | Referência para CARDS |
| from_list_id | BIGINT | FK | Referência para LISTS (lista anterior) |
| to_list_id | BIGINT | NOT NULL, FK | Referência para LISTS (lista nova) |
| moved_by | BIGINT | FK | Referência para USERS |
| created_at | TIMESTAMP | DEFAULT NOW() | Data do movimento |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (card_id) REFERENCES CARDS(id)
- FOREIGN KEY (from_list_id) REFERENCES LISTS(id)
- FOREIGN KEY (to_list_id) REFERENCES LISTS(id)
- FOREIGN KEY (moved_by) REFERENCES USERS(id)
- INDEX (card_id, created_at)

---

### 3.20 AUDIT_LOGS (Logs de Auditoria)

**Descrição**: Registro de todas as alterações no sistema.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| user_id | BIGINT | FK | Referência para USERS |
| action | VARCHAR(50) | NOT NULL | Ação (create, update, delete, etc.) |
| table_name | VARCHAR(100) | NOT NULL | Tabela afetada |
| record_id | BIGINT | | ID do registro afetado |
| old_values | JSON | | Valores anteriores |
| new_values | JSON | | Valores novos |
| ip_address | VARCHAR(45) | | Endereço IP |
| created_at | TIMESTAMP | DEFAULT NOW() | Data da ação |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (user_id) REFERENCES USERS(id)
- INDEX (user_id, created_at)
- INDEX (table_name, record_id)
- INDEX (created_at)

---

### 3.21 API_TOKENS (Tokens de API)

**Descrição**: Tokens para autenticação de sistemas externos.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| account_id | BIGINT | NOT NULL, FK | Referência para ACCOUNTS |
| client_id | VARCHAR(255) | NOT NULL, UNIQUE | Client ID |
| client_secret_hash | VARCHAR(255) | NOT NULL | Hash do Client Secret |
| name | VARCHAR(255) | NOT NULL | Nome do token |
| scopes | TEXT | | Escopos permitidos (JSON array) |
| last_used_at | TIMESTAMP | | Último uso |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Data de última atualização |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (account_id) REFERENCES ACCOUNTS(id)
- UNIQUE (client_id)
- INDEX (account_id)

---

### 3.22 IMPORT_HISTORY (Histórico de Importações)

**Descrição**: Registro de todas as importações de dados.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | BIGINT | PK, AUTO_INCREMENT | Identificador único |
| account_id | BIGINT | NOT NULL, FK | Referência para ACCOUNTS |
| board_id | BIGINT | FK | Referência para BOARDS |
| source | VARCHAR(50) | NOT NULL | Fonte (pipedrive, csv, api, etc.) |
| total_records | INT | | Total de registros importados |
| successful_records | INT | | Registros importados com sucesso |
| failed_records | INT | | Registros com falha |
| error_details | JSON | | Detalhes dos erros |
| imported_by | BIGINT | FK | Referência para USERS |
| created_at | TIMESTAMP | DEFAULT NOW() | Data da importação |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (account_id) REFERENCES ACCOUNTS(id)
- FOREIGN KEY (board_id) REFERENCES BOARDS(id)
- FOREIGN KEY (imported_by) REFERENCES USERS(id)
- INDEX (account_id, created_at)

---

## 4. CONSTRAINTS E REGRAS DE INTEGRIDADE

### 4.1 Constraints de Chave Estrangeira

```sql
ALTER TABLE users ADD CONSTRAINT fk_users_accounts 
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE boards ADD CONSTRAINT fk_boards_accounts 
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE lists ADD CONSTRAINT fk_lists_boards 
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE;

ALTER TABLE cards ADD CONSTRAINT fk_cards_lists 
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE;

ALTER TABLE card_field_values ADD CONSTRAINT fk_cfv_cards 
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE;

ALTER TABLE card_field_values ADD CONSTRAINT fk_cfv_fields 
  FOREIGN KEY (field_id) REFERENCES custom_fields(id) ON DELETE CASCADE;
```

### 4.2 Constraints de Unicidade

```sql
ALTER TABLE accounts ADD CONSTRAINT uk_accounts_name UNIQUE (name);
ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE (email);
ALTER TABLE lists ADD CONSTRAINT uk_lists_position UNIQUE (board_id, position);
ALTER TABLE cards ADD CONSTRAINT uk_cards_position UNIQUE (list_id, position);
ALTER TABLE custom_fields ADD CONSTRAINT uk_fields_position UNIQUE (board_id, position);
ALTER TABLE card_field_values ADD CONSTRAINT uk_cfv_card_field UNIQUE (card_id, field_id);
```

---

## 5. ÍNDICES PARA PERFORMANCE

```sql
-- Índices para busca rápida
CREATE INDEX idx_cards_assigned_to ON cards(assigned_to);
CREATE INDEX idx_cards_created_at ON cards(created_at DESC);
CREATE INDEX idx_cards_list_position ON cards(list_id, position);
CREATE INDEX idx_people_email ON people(email);
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Índices para filtros
CREATE INDEX idx_card_movements_card_id ON card_movements(card_id);
CREATE INDEX idx_card_movements_created_at ON card_movements(created_at DESC);
CREATE INDEX idx_notes_card_id ON notes(card_id);
CREATE INDEX idx_attachments_card_id ON attachments(card_id);
CREATE INDEX idx_activities_card_id ON activities(card_id);

-- ============================================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE (Queries críticas e complexas)
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

---

## 6. NOVAS TABELAS (MÓDULOS ADICIONAIS)

### 6.1 Transferência de Cartões

```sql
-- Tabela de transferências de cartões
CREATE TABLE card_transfers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  card_id BIGINT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  from_user_id BIGINT NOT NULL REFERENCES users(id),
  to_user_id BIGINT NOT NULL REFERENCES users(id),
  transferred_by_user_id BIGINT NOT NULL REFERENCES users(id),
  transfer_reason VARCHAR(50) NOT NULL, -- 'especialista', 'rebalanceamento', 'ferias', 'escalacao', 'outro'
  notes TEXT,
  chain_order INT NOT NULL, -- ordem na cadeia de transferências (1, 2, 3...)
  counts_in_limit BOOLEAN DEFAULT true, -- Se conta no limite de transferências do vendedor (false para automações/admin)
  batch_id VARCHAR(36), -- UUID para agrupar transferências em lote (NULL para transferências individuais)
  transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CONFIGURAÇÕES DE LIMITE DE TRANSFERÊNCIAS (salvas na tabela account_settings ou como campos em accounts):
-- transfer_limit_enabled: BOOLEAN (padrão: true)
-- transfer_limit_period: VARCHAR(20) ('daily', 'weekly', 'monthly') (padrão: 'monthly')
-- transfer_limit_quantity: INT (5, 10, 20, 50, ou NULL para ilimitado) (padrão: 10)
-- Essas configurações podem ser armazenadas em JSON ou como colunas separadas

-- Índices para transferências
CREATE INDEX idx_card_transfers_card_id ON card_transfers(card_id);
CREATE INDEX idx_card_transfers_from_user ON card_transfers(from_user_id);
CREATE INDEX idx_card_transfers_to_user ON card_transfers(to_user_id);
CREATE INDEX idx_card_transfers_date ON card_transfers(transferred_at DESC);
CREATE INDEX idx_card_transfers_chain ON card_transfers(card_id, chain_order);
CREATE INDEX idx_card_transfers_limit ON card_transfers(from_user_id, counts_in_limit, transferred_at); -- Para verificar limite
CREATE INDEX idx_card_transfers_batch ON card_transfers(batch_id); -- Para agrupar transferências em lote

-- Tabela de exceções de limite de transferências
CREATE TABLE transfer_limit_exceptions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  additional_transfers INT DEFAULT 5, -- Transferências extras permitidas
  period_start DATE NOT NULL, -- Início do período da exceção
  period_end DATE NOT NULL, -- Fim do período da exceção
  granted_by BIGINT NOT NULL REFERENCES users(id), -- Gerente/Admin que concedeu
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT -- Motivo da exceção
);

-- Índices para exceções
CREATE INDEX idx_transfer_exceptions_user ON transfer_limit_exceptions(user_id, period_end);

-- Tabela de solicitações de transferência (quando aprovação está habilitada)
CREATE TABLE transfer_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  card_id BIGINT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  from_user_id BIGINT NOT NULL REFERENCES users(id), -- Vendedor que está transferindo
  to_user_id BIGINT NOT NULL REFERENCES users(id), -- Vendedor que vai receber
  transfer_reason VARCHAR(50) NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
  rejection_reason TEXT, -- Motivo da rejeição (obrigatório se rejected)
  reviewed_by BIGINT REFERENCES users(id), -- Gerente/Admin que aprovou/rejeitou
  reviewed_at TIMESTAMP, -- Data/hora da aprovação/rejeição
  expires_at TIMESTAMP, -- Data/hora de expiração (72h após criação)
  batch_id VARCHAR(36), -- UUID para agrupar solicitações em lote (NULL para individuais)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para solicitações de transferência
CREATE INDEX idx_transfer_requests_card ON transfer_requests(card_id);
CREATE INDEX idx_transfer_requests_from_user ON transfer_requests(from_user_id);
CREATE INDEX idx_transfer_requests_status ON transfer_requests(status, expires_at); -- Para cron job de expiração
CREATE INDEX idx_transfer_requests_pending ON transfer_requests(status, created_at); -- Para painel de aprovações
CREATE INDEX idx_transfer_requests_batch ON transfer_requests(batch_id); -- Para agrupar solicitações em lote

-- CONFIGURAÇÃO DE APROVAÇÃO (salva na tabela account_settings ou como campo em accounts):
-- transfer_approval_required: BOOLEAN (padrão: false)
```

### 6.2 Gamificação

```sql
-- ================================================================================
-- GAMIFICAÇÃO: PONTOS PERPÉTUOS + RANKINGS PERIÓDICOS
-- ================================================================================
-- CONCEITO:
--   1. PONTOS TOTAIS: Mantidos perpetuamente (histórico completo, NUNCA resetam)
--   2. RANKINGS: Resetam periodicamente (semanal, mensal, trimestral, anual)
--      mas histórico de rankings é arquivado para consultas futuras
-- ================================================================================

-- Tabela de pontos (histórico completo, perpétuo)
CREATE TABLE gamification_points (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL, -- 'criar_lead', 'fechar_venda', etc.
  points INT NOT NULL, -- pode ser positivo ou negativo
  card_id BIGINT REFERENCES cards(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- EXEMPLO: João Silva tem 25.430 pontos totais desde Jan/2024 (histórico completo)

-- Tabela de rankings periódicos (histórico de rankings arquivado)
CREATE TABLE gamification_rankings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'quarterly', 'annual'
  rank INT NOT NULL, -- posição no ranking (1º, 2º, 3º, etc.)
  total_points INT NOT NULL, -- pontos acumulados NAQUELE PERÍODO específico
  year INT NOT NULL, -- ano do ranking (ex: 2025)
  period_number INT NOT NULL, -- semana (1-52), mês (1-12), trimestre (1-4), anual (1)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, period, year, period_number)
);
-- EXEMPLO:
--   Ranking Mensal Dez/2025: João 1º (2.500 pts), Maria 2º (2.300 pts) <- ATUAL
--   Ranking Mensal Nov/2025: Maria 1º (2.400 pts), João 2º (2.200 pts) <- HISTÓRICO ARQUIVADO

-- Tabela de badges (conquistas)
CREATE TABLE gamification_badges (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE, -- NULL para badges padrão do sistema
  name VARCHAR(100) NOT NULL,
  description VARCHAR(200),
  criteria TEXT, -- critério de conquista (ex: "pontos >= 1000")
  criteria_type VARCHAR(20) DEFAULT 'automatic', -- 'manual' ou 'automatic'
  points_required INT DEFAULT 0,
  icon VARCHAR(255), -- emoji ou URL
  is_custom BOOLEAN DEFAULT false, -- false = badge padrão, true = customizada
  is_active BOOLEAN DEFAULT true,
  created_by BIGINT REFERENCES users(id), -- quem criou (apenas para badges customizadas)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(account_id, name) -- nome único por conta (badges padrão têm account_id NULL)
);

-- Tabela de badges conquistadas por usuário
CREATE TABLE user_badges (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id BIGINT NOT NULL REFERENCES gamification_badges(id) ON DELETE CASCADE,
  assigned_by BIGINT REFERENCES users(id), -- NULL se automático, user_id do admin se manual
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

-- Índices para gamificação
CREATE INDEX idx_gamification_points_user ON gamification_points(user_id);
CREATE INDEX idx_gamification_points_date ON gamification_points(created_at DESC);
CREATE INDEX idx_gamification_rankings_period ON gamification_rankings(period, year, period_number);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_gamification_badges_account ON gamification_badges(account_id);
CREATE INDEX idx_gamification_badges_custom ON gamification_badges(is_custom, is_active);
```

### 6.3 Automações

```sql
-- Tabela de automações
CREATE TABLE automations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  priority INT DEFAULT 50, -- Prioridade 1-100 (maior = executa primeiro)

  -- TIPO DE AUTOMAÇÃO: 'trigger' ou 'scheduled'
  automation_type VARCHAR(20) DEFAULT 'trigger', -- 'trigger' (por evento) ou 'scheduled' (agendada)

  -- CAMPOS PARA AUTOMAÇÕES POR GATILHO (automation_type = 'trigger')
  trigger_type VARCHAR(100), -- 'card_moved', 'card_created', 'card_updated' (NULL se scheduled)
  trigger_board_id BIGINT REFERENCES boards(id) ON DELETE CASCADE,
  trigger_list_id BIGINT REFERENCES lists(id) ON DELETE CASCADE,
  trigger_conditions JSON, -- condições adicionais

  -- CAMPOS PARA AUTOMAÇÕES AGENDADAS (automation_type = 'scheduled')
  schedule_type VARCHAR(20), -- 'once' (única) ou 'recurring' (recorrente) (NULL se trigger)
  schedule_config JSON, -- Configuração do agendamento
  -- Exemplos de schedule_config:
  --   Única: {"datetime": "2026-01-15T09:00:00Z"}
  --   Diária: {"frequency": "daily", "time": "08:00"}
  --   Semanal: {"frequency": "weekly", "day_of_week": 1, "time": "09:00"} -- 1=segunda
  --   Mensal: {"frequency": "monthly", "day_of_month": 1, "time": "02:00"}
  --   Anual: {"frequency": "annual", "month": 1, "day": 1, "time": "00:00"}
  next_execution_at TIMESTAMP, -- Próxima execução agendada (NULL se trigger)
  last_executed_at TIMESTAMP, -- Última execução (apenas scheduled)

  -- AÇÕES (comuns a ambos os tipos)
  action_type VARCHAR(100) NOT NULL, -- 'move_card', 'copy_card', 'create_card', 'notify'
  action_board_id BIGINT REFERENCES boards(id) ON DELETE SET NULL,
  action_list_id BIGINT REFERENCES lists(id) ON DELETE SET NULL,
  field_mapping JSON, -- mapeamento de campos origem → destino

  is_active BOOLEAN DEFAULT true,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ORDEM DE EXECUÇÃO (Trigger-based): ORDER BY priority DESC, created_at ASC
-- Prioridades: Alta (90-100), Média (50-89), Baixa (1-49)
-- EXECUÇÃO (Scheduled): Cron job roda a cada 1 minuto verificando next_execution_at <= NOW()

-- Tabela de execuções de automação
CREATE TABLE automation_executions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  automation_id BIGINT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  source_card_id BIGINT REFERENCES cards(id) ON DELETE SET NULL,
  destination_card_id BIGINT REFERENCES cards(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'pending', 'success_after_retry'
  retry_count INT DEFAULT 0, -- contador de tentativas de retry
  error_message TEXT,
  triggered_by VARCHAR(20) DEFAULT 'event', -- 'event' (por gatilho) ou 'schedule' (agendamento)
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para automações
CREATE INDEX idx_automations_account ON automations(account_id);
CREATE INDEX idx_automations_trigger ON automations(trigger_board_id, trigger_list_id);
CREATE INDEX idx_automations_active ON automations(is_active);
CREATE INDEX idx_automations_type ON automations(automation_type); -- Para filtrar por tipo
CREATE INDEX idx_automations_scheduled ON automations(automation_type, is_active, next_execution_at); -- Para cron job
CREATE INDEX idx_automation_executions_automation ON automation_executions(automation_id);
CREATE INDEX idx_automation_executions_date ON automation_executions(executed_at DESC);
```

---

## 7. TIPOS DE DADOS CUSTOMIZADOS

### 7.1 Tipos de Campos Customizados

```sql
CREATE TYPE field_type AS ENUM (
  'text',
  'email',
  'document',
  'date',
  'datetime',
  'time',
  'due_date',
  'currency',
  'number',
  'select',
  'checkbox',
  'user',
  'attachment',
  'tag'
);
```

---

## 8. PARTICIONAMENTO (Para Escalabilidade Futura)

```sql
-- Particionar tabela de audit_logs por data
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

---

---

## 9. NOTAS IMPORTANTES

> ⚠️ **DECISÃO IMPORTANTE - GAMIFICAÇÃO SIMBÓLICA**:
>
> O sistema de **gamificação é simbólico** (pontos, rankings, badges) e **não calcula bônus ou comissões**.
>
> **Motivação**:
> - Cada empresa tem política de bonificação diferente
> - Cálculos financeiros têm implicações legais, trabalhistas e fiscais
> - Melhor deixar isso para sistemas especializados (RH/Folha de Pagamento)
>
> **Solução**:
> - Admin pode **exportar relatórios** (Excel/CSV) com dados de gamificação
> - RH/Folha usa esses dados para calcular bônus externamente conforme política da empresa
>
> **Tabelas Removidas do Escopo**:
> - ❌ `commissions` (comissões)
> - ❌ `bonuses` (bônus)
> - ❌ `payroll_integration` (integração com folha)
>
> **Tabelas Mantidas** (Gamificação Simbólica):
> - ✅ `gamification_points` (pontos por ação)
> - ✅ `gamification_rankings` (rankings por período)
> - ✅ `gamification_badges` (badges de conquista)
> - ✅ `user_badges` (badges conquistadas por usuário)

---

**Versão**: 4.0
**Data**: 11 de Dezembro 2025
**Status**: Completo

