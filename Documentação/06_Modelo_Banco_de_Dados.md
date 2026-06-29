# 06 - MODELO DE BANCO DE DADOS

## 1. INTRODUÇÃO

Este documento descreve o modelo de dados do sistema HSGrowth CRM, incluindo entidades, atributos, relacionamentos e constraints. O banco de dados utiliza PostgreSQL como SGBD.

> **Nota de arquitetura (v1.7.35)**: o sistema é **single-tenant** — não existe tabela `accounts` nem coluna `account_id` em nenhum model real. Todas as entidades pertencem a uma única instalação. As chaves primárias usam `INTEGER` (auto-increment). A maioria das tabelas centrais usa os mixins `TimestampMixin` (`created_at`, `updated_at`) e `SoftDeleteMixin` (`deleted_at`, `is_deleted`).

---

## 2. DIAGRAMA ENTIDADE-RELACIONAMENTO (ER) - VISÃO GERAL

### 2.1 Diagrama Principal (Estrutura Core)

```
    ┌──────────────────┐        ┌─────────────────────┐
    │      ROLES       │ 1    N │       USERS         │
    ├──────────────────┤◄───────┤─────────────────────┤
    │ id (PK)          │        │ id (PK)             │
    │ name             │        │ role_id (FK)        │
    │ display_name     │        │ email               │
    │ description      │        │ name                │
    │ permissions(JSON)│        │ password_hash       │
    │ is_system_role   │        │ is_active           │
    └──────────────────┘        │ avatar_url          │
                                │ ms_access_token     │
    ┌─────────────────┐         │ created_at          │
    │     BOARDS      │         └──────────┬──────────┘
    ├─────────────────┤                    │ assigned_to_id /
    │ id (PK)         │                    │ sdr_id (N:1)
    │ name            │                    │
    │ board_type      │                    │
    │ category        │                    │
    │ color / icon    │                    │
    │ settings(JSON)  │                    │
    └────────┬────────┘                    │
             │ 1                           │
             │ N                           │
      ┌──────▼──────┐                      │
      │    LISTS    │                      │
      ├─────────────┤                      │
      │ id (PK)     │                      │
      │ board_id    │                      │
      │ name        │                      │
      │ position    │                      │
      │ is_done_stage  │                   │
      │ is_lost_stage  │                   │
      └──────┬──────┘                      │
             │ 1                           │
             │ N                           │
      ┌──────▼──────────────┐              │
      │       CARDS         │◄─────────────┘
      ├─────────────────────┤
      │ id (PK)             │
      │ list_id (FK)        │
      │ client_id (FK)      │
      │ person_id (FK)      │
      │ assigned_to_id (FK) │
      │ sdr_id (FK)         │
      │ title               │
      │ value / position    │
      │ is_won (0/1/-1)     │
      │ contact_info(JSON)  │
      │ payment_info(JSON)  │
      │ deal_type/modality  │
      │ reopened_from_card_id│
      └──────┬──────────────┘
             │ 1
             │ N
      ┌──────▼────────────┐
      │ CARD_FIELD_VALUES │
      ├───────────────────┤
      │ id (PK)           │
      │ card_id (FK)      │
      │ field_definition_id (FK) │
      │ value             │
      └───────────────────┘

      ┌───────────────────────┐   1   N  ┌─────────────────┐
      │       CLIENTS         │──────────►│     PERSONS     │
      ├───────────────────────┤           ├─────────────────┤
      │ id (PK)               │           │ id (PK)         │
      │ name / company_name   │           │ name            │
      │ document (CPF/CNPJ)    │          │ organization_id │
      │ cnae / sector         │           │ email_*         │
      │ is_active             │           │ phone_*         │
      └───────────────────────┘           └─────────────────┘

      ┌───────────────────────┐
      │     FIELD_DEFINITIONS │  (campos customizados por BOARD)
      ├───────────────────────┤
      │ id (PK)               │
      │ board_id (FK)         │
      │ name / field_type     │
      │ is_required / is_unique│
      │ options(JSON)         │
      └───────────────────────┘
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
          │    ├─ reason / status
          │    └─ batch_id ──→ TRANSFER_APPROVALS (1:1, quando aprovação ativa)
          │
          ├──→ CARD_TASKS (Atividades/Tarefas: ligação, reunião, etc.)
          ├──→ CARD_NOTES (Anotações)
          ├──→ ACTIVITIES (Timeline/Auditoria do card)
          ├──→ ATTACHMENTS (Anexos)
          ├──→ CARD_PRODUCTS ──→ PRODUCTS
          ├──→ CARD_CADENCES ──→ CADENCE_TEMPLATES (cadência por lead)
          ├──→ CALL_EVALUATIONS / CALL_LOGS (VOIP API4COM)
          └──→ CARD_LIST_HISTORY (entrada/saída em cada lista)

USERS ────┐
          │ 1:N
          ├──→ GAMIFICATION_POINTS (Pontos)
          │    ├─ board_type (prospecting/acquisition)
          │    ├─ points / reason
          │    ├─ is_commission / commission_ratio
          │    └─ related_entity_type/_id
          │
          │ 1:N
          ├──→ GAMIFICATION_RANKINGS (Rankings)
          │    ├─ board_type (prospecting/acquisition)
          │    ├─ period_type (weekly/monthly/quarterly/annual)
          │    ├─ rank / points / cards_won
          │    └─ period_start / period_end
          │
          └──→ USER_BADGES (Badges Conquistadas)
               └─ badge_id → GAMIFICATION_BADGES (criteria JSON)

  (GAMIFICATION_ACTION_POINTS define o valor de cada ação por board_type)

BOARDS ───┐
          │ 1:N
          └──→ AUTOMATIONS (Automações, por quadro)
               ├─ automation_type (trigger/scheduled)
               ├─ trigger_event (card_moved/created/updated/field_changed)
               ├─ actions (JSON array)
               ├─ state (JSON, ex: round_robin_last_user_id)
               └─ is_active / priority / next_run_at

AUTOMATIONS ─→ AUTOMATION_EXECUTIONS
               ├─ status (success/failed/pending)
               ├─ duration_ms
               └─ error_message / error_stack
```

---

## 3. DESCRIÇÃO DAS TABELAS

### 3.1 ACCOUNTS (Contas) — NÃO IMPLEMENTADA

**Descrição**: Conceito de multi-tenant **não existe** no código atual. O sistema é single-tenant: não há tabela `accounts` nem coluna `account_id`. Esta seção é mantida apenas como referência histórica; ignore-a ao validar o schema real.

---

### 3.2 USERS (Usuários)

**Descrição**: Representa um usuário do sistema. Usa os mixins `TimestampMixin` e `SoftDeleteMixin`.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| role_id | INTEGER | NOT NULL, FK (roles, ON DELETE RESTRICT) | Papel/role do usuário |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Email do usuário |
| username | VARCHAR(100) | UNIQUE, NULL | Username para login |
| name | VARCHAR(255) | NOT NULL | Nome completo (campo único, não há first/last) |
| password_hash | VARCHAR(255) | NOT NULL | Hash bcrypt da senha |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Usuário ativo |
| is_verified | BOOLEAN | NOT NULL, DEFAULT false | Email verificado |
| last_login_at | TIMESTAMP | NULL | Último acesso |
| password_changed_at | TIMESTAMP | NULL | Data da última troca de senha |
| reset_token | VARCHAR(255) | NULL | Token de reset de senha |
| reset_token_expires_at | TIMESTAMP | NULL | Expiração do token de reset |
| avatar_url | VARCHAR(500) | NULL | URL da foto/avatar |
| phone | VARCHAR(20) | NULL | Telefone de contato |
| ms_access_token | TEXT | NULL | Access token Microsoft Graph (SSO/Graph API) |
| ms_refresh_token | TEXT | NULL | Refresh token Microsoft |
| ms_token_expires_at | TIMESTAMP | NULL | Expiração do ms_access_token |
| email_signature | TEXT | NULL | Assinatura HTML anexada ao enviar e-mail pelo CRM |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de última atualização |
| deleted_at | TIMESTAMP | NULL | Soft delete |
| is_deleted | BOOLEAN | NOT NULL, DEFAULT false | Soft delete |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (role_id) REFERENCES ROLES(id)
- UNIQUE (email), UNIQUE (username)
- INDEX (role_id)

---

### 3.3 ROLES (Papéis e Permissões)

**Descrição**: Define os papéis (RBAC) e suas permissões. As permissões são uma lista JSON de strings (ex: `["boards.read", "cards.create"]`). Há **6 roles** de sistema (`is_system_role=true`).

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| name | VARCHAR(50) | NOT NULL, UNIQUE | Nome interno (admin, manager, salesperson, sdr, viewer, service) |
| display_name | VARCHAR(100) | NOT NULL | Nome amigável |
| description | VARCHAR(500) | NULL | Descrição do papel |
| permissions | JSON | NOT NULL, DEFAULT [] | Lista de permissões (strings) |
| is_system_role | BOOLEAN | NOT NULL, DEFAULT false | Roles de sistema não podem ser deletadas |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de última atualização |

**Roles padrão**:

| name | display_name | Descrição |
|------|--------------|-----------|
| admin | Administrador | Acesso total |
| manager | Gerente | Gerencia equipe e relatórios |
| salesperson | Vendedor | Acessa os próprios negócios |
| sdr | SDR | Prospecção e qualificação de leads |
| viewer | Visualizador | Somente leitura |
| service | Serviço | Acesso ao módulo de serviços |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE (name)

---

### 3.4 BOARDS (Quadros)

**Descrição**: Representa um quadro/pipeline (Kanban). Usa `TimestampMixin` e `SoftDeleteMixin`.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| name | VARCHAR(255) | NOT NULL | Nome do quadro |
| description | TEXT | NULL | Descrição do quadro |
| board_type | VARCHAR(20) | NULL | Tipo p/ gamificação: prospecting, acquisition ou NULL (não pontua) |
| category | VARCHAR(20) | NOT NULL, DEFAULT 'vendas' | Categoria: 'vendas' ou 'servicos' |
| color | VARCHAR(50) | NULL, DEFAULT '#3B82F6' | Cor hexadecimal |
| icon | VARCHAR(50) | NULL, DEFAULT 'grid' | Nome do ícone (Lucide) |
| settings | JSON | NOT NULL, DEFAULT {} | Configurações do quadro |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |
| deleted_at / is_deleted | | | Soft delete |

> O board **não** possui `account_id`, `type`, `roundrobin_enabled` nem `created_by`. O rodízio (round-robin) é implementado via automações (campo `state`), não como flag no board.

**Índices**:
- PRIMARY KEY (id)

---

### 3.5 LISTS (Listas/Colunas)

**Descrição**: Representa uma lista (coluna) dentro de um quadro. Usa `TimestampMixin`.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| board_id | INTEGER | NOT NULL, FK (boards, ON DELETE CASCADE) | Referência para BOARDS |
| name | VARCHAR(255) | NOT NULL | Nome da lista |
| color | VARCHAR(7) | NULL | Cor da lista (hex) |
| position | INTEGER | NOT NULL, DEFAULT 0 | Posição na ordem |
| is_done_stage | BOOLEAN | NOT NULL, DEFAULT false | Etapa de "concluídos/ganhos" |
| is_lost_stage | BOOLEAN | NOT NULL, DEFAULT false | Etapa de "perdidos" |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (board_id) REFERENCES BOARDS(id)
- INDEX (board_id)

---

### 3.6 FIELD_DEFINITIONS (Campos Customizados)

**Descrição**: Define campos customizados por quadro (tabela real: `field_definitions`). Usa `TimestampMixin`.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| board_id | INTEGER | NOT NULL, FK (boards, CASCADE) | Referência para BOARDS |
| name | VARCHAR(255) | NOT NULL | Nome do campo |
| field_type | VARCHAR(50) | NOT NULL | Tipo (text, email, phone, number, currency, date, select, etc.) |
| is_required | BOOLEAN | NOT NULL, DEFAULT false | Campo obrigatório |
| is_unique | BOOLEAN | NOT NULL, DEFAULT false | Valor único |
| position | INTEGER | NOT NULL, DEFAULT 0 | Ordem de exibição |
| placeholder | VARCHAR(255) | NULL | Placeholder |
| help_text | TEXT | NULL | Texto de ajuda |
| options | JSON | NULL, DEFAULT [] | Opções para select/multiselect |
| validations | JSON | NULL, DEFAULT {} | Validações (ex: {"min":0,"max":1000000}) |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (board_id) REFERENCES BOARDS(id)
- INDEX (board_id)

---

### 3.7 CARDS (Cartões)

**Descrição**: Representa um cartão (lead/oportunidade/negócio). Usa `TimestampMixin` e `SoftDeleteMixin`. Há muitos campos do "blueprint da consultora".

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| list_id | INTEGER | NOT NULL, FK (lists, CASCADE) | Lista atual |
| client_id | INTEGER | FK (clients, SET NULL) | Cliente/empresa |
| person_id | INTEGER | FK (persons, SET NULL) | Pessoa de contato |
| assigned_to_id | INTEGER | FK (users, SET NULL) | Responsável |
| sdr_id | INTEGER | FK (users, SET NULL) | SDR vinculado |
| title | VARCHAR(500) | NOT NULL, INDEX | Título do cartão |
| description | TEXT | NULL | Descrição |
| position | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | Posição fracionária no Kanban |
| value | NUMERIC(12,2) | NULL | Valor do negócio |
| shipping_cost | NUMERIC(12,2) | NULL | Custo de frete/envio |
| currency | VARCHAR(3) | NOT NULL, DEFAULT 'BRL' | Moeda |
| due_date | TIMESTAMP | NULL | Data de vencimento |
| closed_at | TIMESTAMP | NULL | Data de fechamento (ganho/perdido) |
| is_won | INTEGER | NOT NULL, DEFAULT 0 | 0=aberto, 1=ganho, -1=perdido |
| contact_info | JSON | NULL | Dados de contato |
| payment_info | JSON | NULL | Condições de pagamento |
| prospection_entry_date | TIMESTAMP | NULL | Entrada no board Prospecção |
| acquisition_entry_date | TIMESTAMP | NULL | Entrada no board Aquisição |
| expansion_entry_date | TIMESTAMP | NULL | Entrada no board Expansão |
| deal_type | VARCHAR(50) | NULL | Nova Venda, Cross Sell, Up Sell |
| modality | VARCHAR(20) | NULL | 'venda' \| 'locacao' (obrigatório p/ Ganho) |
| acquisition_channel | VARCHAR(100) | NULL | Canal de aquisição (Inbound, Outbound...) |
| acquisition_channel_detail | VARCHAR(200) | NULL | Detalhamento do canal |
| utm_params | TEXT | NULL | UTM (legado) |
| origin | VARCHAR(200) | NULL | Origem do lead |
| utm_campaign / utm_source / utm_term | VARCHAR(200) | NULL | Parâmetros UTM |
| loss_reason | VARCHAR(200) | NULL | Motivo da perda |
| reopened_from_card_id | INTEGER | FK (cards, SET NULL) | Card original que originou este clone (reabertura) |
| has_implementation | INTEGER | NULL | 0=false, 1=true, NULL=não informado |
| has_personnel | INTEGER | NULL | 0=false, 1=true, NULL=não informado |
| automacao01 | BOOLEAN | NULL, DEFAULT false | Automação de nutrição (webhook externo) |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |
| deleted_at / is_deleted | | | Soft delete |

> O card **não** possui `account_id`, `original_owner_id`, `current_owner_id`, `last_transfer_date` nem `archived_at`. O responsável é `assigned_to_id`; o histórico de donos vem de `card_transfers`.

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (list_id), (client_id), (person_id), (assigned_to_id), (sdr_id), (reopened_from_card_id)
- INDEX (list_id), (client_id), (person_id), (assigned_to_id), (sdr_id), (title)

---

### 3.8 CARD_FIELD_VALUES (Valores de Campos)

**Descrição**: Armazena valores dos campos customizados para cada cartão. Usa `TimestampMixin`.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| card_id | INTEGER | NOT NULL, FK (cards, CASCADE) | Referência para CARDS |
| field_definition_id | INTEGER | NOT NULL, FK (field_definitions, CASCADE) | Referência para FIELD_DEFINITIONS |
| value | TEXT | NULL | Valor do campo (texto, convertido conforme o tipo) |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |

**Índices/Constraints**:
- PRIMARY KEY (id)
- UNIQUE (card_id, field_definition_id) — `unique_card_field`
- INDEX (card_id), (field_definition_id)

---

### 3.9 CLIENTS (Clientes/Empresas)

**Descrição**: Representa um cliente (PF ou PJ). Substitui a antiga "ORGANIZATIONS". Usa `TimestampMixin` e `SoftDeleteMixin`.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| name | VARCHAR(255) | NOT NULL, INDEX | Nome do contato |
| email | VARCHAR(255) | NULL, INDEX | Email |
| phone | VARCHAR(20) | NULL | Telefone |
| company_name | VARCHAR(255) | NULL | Razão social |
| document | VARCHAR(20) | NULL, INDEX | CPF (11) ou CNPJ (14) |
| address | TEXT | NULL | Endereço |
| city | VARCHAR(100) | NULL | Cidade |
| state | VARCHAR(2) | NULL | UF |
| country | VARCHAR(100) | NULL, DEFAULT 'Brasil' | País |
| website | VARCHAR(255) | NULL | Website |
| notes | TEXT | NULL | Observações |
| cnae | VARCHAR(20) | NULL | Código CNAE |
| linkedin_url | VARCHAR(500) | NULL | LinkedIn da empresa |
| relationship_type | VARCHAR(50) | NULL | Cliente, Prospect, Lead, etc. |
| commercial_activity | VARCHAR(50) | NULL | Ativo, Dormente, Inativo |
| sector | VARCHAR(100) | NULL | Setor/Indústria |
| employee_count | VARCHAR(50) | NULL | Faixa de colaboradores |
| annual_revenue | VARCHAR(50) | NULL | Faixa de faturamento anual |
| source | VARCHAR(50) | NULL | pipedrive, manual, importacao, etc. |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Cliente ativo |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |
| deleted_at / is_deleted | | | Soft delete |

**Índices**:
- PRIMARY KEY (id)
- INDEX (name), (email), (document)

---

### 3.10 PERSONS (Pessoas/Contatos)

**Descrição**: Representa uma pessoa/contato vinculada a um cliente (tabela real: `persons`).

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| first_name | VARCHAR(100) | NULL | Primeiro nome |
| last_name | VARCHAR(100) | NULL | Último nome |
| name | VARCHAR(200) | NOT NULL, INDEX | Nome completo |
| email | VARCHAR(255) | NULL, INDEX | Email principal (legado) |
| email_commercial / email_personal | VARCHAR(255) | NULL | Emails adicionais |
| email_alternative | VARCHAR(255) | NULL | Email alternativo |
| phone | VARCHAR(50) | NULL | Telefone principal (legado) |
| phone_commercial / phone_whatsapp | VARCHAR(50) | NULL | Telefones |
| phone_alternative / phone_extra1 / phone_extra2 | VARCHAR(50) | NULL | Telefones extras |
| position | VARCHAR(200) | NULL | Cargo |
| area | VARCHAR(200) | NULL | Área/Departamento |
| linkedin / instagram / facebook | VARCHAR(500) | NULL | Redes sociais |
| organization_id | INTEGER | FK (clients) | Cliente vinculado |
| owner_id | INTEGER | FK (users) | Dono/responsável |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Ativo |
| pipedrive_id | INTEGER | NULL, INDEX | Referência ao Pipedrive |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |

> O vínculo card↔pessoa é direto via `cards.person_id` — **não** existe tabela de junção `card_people`.

**Índices**:
- PRIMARY KEY (id)
- FOREIGN KEY (organization_id) REFERENCES CLIENTS(id), (owner_id) REFERENCES USERS(id)
- INDEX (name), (email), (pipedrive_id)

---

### 3.11 PRODUCTS (Produtos)

**Descrição**: Catálogo de produtos/serviços (compartilhado entre vendas e serviços). Usa `TimestampMixin` e `SoftDeleteMixin`.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| name | VARCHAR(255) | NOT NULL, INDEX | Nome do produto |
| description | TEXT | NULL | Descrição |
| sku | VARCHAR(100) | UNIQUE, NULL, INDEX | Código SKU |
| unit_price | NUMERIC(12,2) | NOT NULL | Preço unitário padrão (vendas) |
| calibration_price | NUMERIC(12,2) | NULL, DEFAULT 0 | Valor da calibração (boards de serviços) |
| currency | VARCHAR(3) | NOT NULL, DEFAULT 'BRL' | Moeda |
| category | VARCHAR(100) | NULL, INDEX | Categoria |
| is_active | BOOLEAN | NOT NULL, DEFAULT true, INDEX | Produto ativo |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |
| deleted_at / is_deleted | | | Soft delete |

---

### 3.12 CARD_PRODUCTS (Relacionamento Cartão-Produto)

**Descrição**: Produtos adicionados a um card de vendas. Usa `TimestampMixin`.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| card_id | INTEGER | NOT NULL, FK (cards, CASCADE) | Referência para CARDS |
| product_id | INTEGER | NOT NULL, FK (products, CASCADE) | Referência para PRODUCTS |
| quantity | INTEGER | NOT NULL, DEFAULT 1 | Quantidade |
| unit_price | NUMERIC(12,2) | NOT NULL | Preço unitário (pode diferir do catálogo) |
| discount | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | Desconto absoluto |
| notes | TEXT | NULL | Observações |

**Constraints**: UNIQUE (card_id, product_id) — `unique_card_product`.

---

### 3.13 CARD_NOTES (Anotações)

**Descrição**: Anotações rápidas em cartões (tabela real: `card_notes`).

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| card_id | INTEGER | NOT NULL, FK (cards, CASCADE) | Referência para CARDS |
| user_id | INTEGER | NOT NULL, FK (users, CASCADE) | Autor |
| content | TEXT | NOT NULL | Conteúdo da anotação |
| note_type | VARCHAR(50) | NULL | Tipo (ex: ligacao, geral) |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |

---

### 3.14 CARD_TASKS (Atividades/Tarefas)

**Descrição**: Atividades criadas pelos usuários (ligação, reunião, tarefa, e-mail, WhatsApp...). Diferente de ACTIVITIES (auditoria). Usa `TimestampMixin`.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| card_id | INTEGER | NOT NULL, FK (cards, CASCADE) | Referência para CARDS |
| assigned_to_id | INTEGER | FK (users, SET NULL) | Responsável pela atividade |
| created_by_id | INTEGER | FK (users, SET NULL) | Quem criou (gamificação/comissão) |
| title | VARCHAR(255) | NOT NULL | Título |
| description | TEXT | NULL | Descrição |
| task_type | ENUM | NOT NULL, DEFAULT 'task' | call, meeting, task, follow_up, deadline, email, lunch, whatsapp, linkedin, other |
| priority | ENUM | NOT NULL, DEFAULT 'normal' | normal, high, urgent |
| due_date | TIMESTAMP | NULL, INDEX | Vencimento |
| duration_minutes | INTEGER | NULL, DEFAULT 30 | Duração |
| is_completed | BOOLEAN | NOT NULL, DEFAULT false, INDEX | Concluída |
| completed_at | TIMESTAMP | NULL | Data de conclusão |
| is_valid | BOOLEAN | NULL | NULL=pendente, TRUE=válida, FALSE=sem resultado |
| is_noshow | BOOLEAN | NOT NULL, DEFAULT false | Contato não compareceu |
| is_cancelled | BOOLEAN | NOT NULL, DEFAULT false | Reunião cancelada |
| location | VARCHAR(255) | NULL | Local |
| video_link | VARCHAR(500) | NULL | Link de videochamada |
| notes | TEXT | NULL | Notas |
| contact_name | VARCHAR(255) | NULL | Nome do contato |
| status | ENUM | NOT NULL, DEFAULT 'free' | free, busy (disponibilidade no calendário) |
| teams_meeting_id / teams_join_url / teams_event_id | VARCHAR | NULL | Integração Microsoft Teams |
| transcript_raw | TEXT | NULL | Transcrição VTT |
| transcript_analysis | TEXT | NULL | Análise IA (JSON) |
| card_cadence_id | INTEGER | FK (card_cadences, SET NULL) | Instância de cadência que gerou a task |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |

---

### 3.15 ATTACHMENTS (Anexos)

**Descrição**: Arquivos anexados aos cartões. Usa `TimestampMixin` e `SoftDeleteMixin`.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| card_id | INTEGER | NOT NULL, FK (cards, CASCADE) | Referência para CARDS |
| uploaded_by_id | INTEGER | FK (users, SET NULL) | Quem fez upload |
| filename | VARCHAR(255) | NOT NULL | Nome único gerado pelo sistema |
| original_filename | VARCHAR(500) | NOT NULL | Nome original |
| file_size | BIGINT | NOT NULL | Tamanho em bytes |
| mime_type | VARCHAR(100) | NOT NULL | Tipo MIME |
| storage_path | VARCHAR(1000) | NOT NULL | Caminho relativo (ex: cards/123/abc.pdf) |
| attachment_type | VARCHAR(50) | NOT NULL, DEFAULT 'general', INDEX | general, proposal, etc. |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |
| deleted_at / is_deleted | | | Soft delete |

---

### 3.16 ACTIVITIES (Timeline/Auditoria do Card)

**Descrição**: Histórico de eventos no timeline de um cartão. Usa `TimestampMixin`.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| card_id | INTEGER | NOT NULL, FK (cards, CASCADE) | Referência para CARDS |
| user_id | INTEGER | FK (users, SET NULL) | Quem executou |
| activity_type | VARCHAR(50) | NOT NULL, INDEX | card_created, card_moved, field_updated, comment_added, etc. |
| description | TEXT | NOT NULL | Descrição |
| activity_metadata | JSON | NOT NULL, DEFAULT {} | Metadados (from_list_id, to_list_id, old/new value...) |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |

---

### 3.17 CARD_LIST_HISTORY (Histórico de Listas)

**Descrição**: Rastreia entrada/saída de cada card em cada lista (para análise de funil). Substitui a antiga "CARD_MOVEMENTS".

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| card_id | INTEGER | NOT NULL, FK (cards, CASCADE) | Card movido |
| list_id | INTEGER | NOT NULL, FK (lists, CASCADE) | Lista de destino |
| board_id | INTEGER | NOT NULL, FK (boards, CASCADE) | Board (desnormalizado) |
| entered_at | TIMESTAMP | NOT NULL | Quando entrou na lista |
| exited_at | TIMESTAMP | NULL | Quando saiu (NULL = ainda está aqui) |

---

### 3.18 AUDIT_LOGS (Logs de Auditoria)

**Descrição**: Registro de todas as operações (CRUD/login) para compliance.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| user_id | INTEGER | FK (users, SET NULL) | Quem executou (NULL = sistema) |
| action | VARCHAR(50) | NOT NULL, INDEX | CREATE, UPDATE, DELETE, LOGIN, LOGOUT |
| entity_type | VARCHAR(100) | NOT NULL, INDEX | User, Card, Board, etc. |
| entity_id | INTEGER | NULL, INDEX | ID da entidade afetada |
| description | TEXT | NOT NULL | Descrição legível |
| data_before | JSON | NULL | Estado anterior (UPDATE/DELETE) |
| data_after | JSON | NULL | Estado posterior (CREATE/UPDATE) |
| ip_address | VARCHAR(45) | NULL | IPv4/IPv6 |
| user_agent | VARCHAR(500) | NULL | Browser/client |
| created_at | TIMESTAMP | NOT NULL, INDEX | Data da ação |

> Os campos reais são `entity_type`/`entity_id`/`description`/`data_before`/`data_after` (não `table_name`/`record_id`/`old_values`/`new_values`).

---

### 3.19 INTEGRATION_CLIENTS (Clients de Integração / API)

**Descrição**: Clients externos que autenticam via client_credentials (ex: N8N).

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| name | VARCHAR(200) | NOT NULL, INDEX | Nome descritivo |
| description | TEXT | NULL | Descrição da integração |
| client_id | VARCHAR(100) | NOT NULL, UNIQUE, INDEX | ID público |
| client_secret_hash | VARCHAR(255) | NOT NULL | Hash do secret |
| impersonate_user_id | INTEGER | NULL | User usado como criador nas ações |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Ativo |
| last_used_at | TIMESTAMP | NULL | Último uso |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |

---

### 3.20 LEADS (Leads)

**Descrição**: Leads ainda não convertidos em cards/deals (importação Pipedrive).

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|----------|
| id | INTEGER | PK, AUTO_INCREMENT | Identificador único |
| title | VARCHAR(255) | NOT NULL, INDEX | Título |
| value | FLOAT | NULL | Valor |
| currency | VARCHAR(10) | NOT NULL, DEFAULT 'BRL' | Moeda |
| source | VARCHAR(100) | NULL | Import, API, Web... |
| owner_id | INTEGER | FK (users) | Dono |
| person_id | INTEGER | FK (persons) | Pessoa |
| organization_id | INTEGER | FK (clients) | Cliente |
| board_id / list_id | INTEGER | FK (boards/lists) | Funil/etapa |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'not_viewed' | not_viewed, qualified, converted, lost |
| is_archived | BOOLEAN | NOT NULL, DEFAULT false | Arquivado |
| archived_at | TIMESTAMP | NULL | Data de arquivamento |
| expected_close_date | TIMESTAMP | NULL | Previsão de fechamento |
| custom_fields | JSON | NULL | Campos do Pipedrive |
| pipedrive_id | VARCHAR(100) | NULL, INDEX | ID do Pipedrive |
| created_at / updated_at | TIMESTAMP | NOT NULL | Timestamps |

---

## 4. CONSTRAINTS E REGRAS DE INTEGRIDADE

### 4.1 Constraints de Chave Estrangeira

> Sistema single-tenant: não há `accounts`/`account_id`. As FKs reais conectam diretamente as entidades.

```sql
ALTER TABLE users ADD CONSTRAINT fk_users_roles
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;

ALTER TABLE lists ADD CONSTRAINT fk_lists_boards
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE;

ALTER TABLE cards ADD CONSTRAINT fk_cards_lists
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE;

ALTER TABLE cards ADD CONSTRAINT fk_cards_clients
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE cards ADD CONSTRAINT fk_cards_assigned_to
  FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE card_field_values ADD CONSTRAINT fk_cfv_cards
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE;

ALTER TABLE card_field_values ADD CONSTRAINT fk_cfv_fields
  FOREIGN KEY (field_definition_id) REFERENCES field_definitions(id) ON DELETE CASCADE;
```

### 4.2 Constraints de Unicidade

```sql
ALTER TABLE roles ADD CONSTRAINT uk_roles_name UNIQUE (name);
ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT uk_users_username UNIQUE (username);
ALTER TABLE products ADD CONSTRAINT uk_products_sku UNIQUE (sku);
ALTER TABLE card_products ADD CONSTRAINT unique_card_product UNIQUE (card_id, product_id);
ALTER TABLE card_field_values ADD CONSTRAINT unique_card_field UNIQUE (card_id, field_definition_id);
ALTER TABLE service_card_products ADD CONSTRAINT unique_service_card_product UNIQUE (service_card_id, product_id);
```

> Observação: o schema real **não** impõe UNIQUE em `(list_id, position)` — a ordenação usa `position` fracionário (NUMERIC) que permite reordenação sem colisão.

---

## 5. ÍNDICES PARA PERFORMANCE

```sql
-- Índices reais (nomes ix_* gerados pelo SQLAlchemy via index=True)
CREATE INDEX ix_cards_assigned_to_id ON cards(assigned_to_id);
CREATE INDEX ix_cards_list_id ON cards(list_id);
CREATE INDEX ix_cards_client_id ON cards(client_id);
CREATE INDEX ix_cards_person_id ON cards(person_id);
CREATE INDEX ix_cards_sdr_id ON cards(sdr_id);
CREATE INDEX ix_cards_title ON cards(title);
CREATE INDEX ix_persons_email ON persons(email);
CREATE INDEX ix_persons_name ON persons(name);
CREATE INDEX ix_clients_name ON clients(name);
CREATE INDEX ix_clients_document ON clients(document);
CREATE INDEX ix_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX ix_audit_logs_user_id ON audit_logs(user_id);

-- Histórico de listas (substitui card_movements)
CREATE INDEX ix_card_list_history_card_id ON card_list_history(card_id);
CREATE INDEX ix_card_list_history_list_id ON card_list_history(list_id);
CREATE INDEX ix_card_list_history_board_id ON card_list_history(board_id);
CREATE INDEX ix_card_notes_card_id ON card_notes(card_id);
CREATE INDEX ix_attachments_card_id ON attachments(card_id);
CREATE INDEX ix_activities_card_id ON activities(card_id);
CREATE INDEX ix_card_tasks_card_id ON card_tasks(card_id);
CREATE INDEX ix_card_tasks_due_date ON card_tasks(due_date);
CREATE INDEX ix_card_tasks_is_completed ON card_tasks(is_completed);

-- Login rápido
CREATE INDEX ix_users_email ON users(email);
```

---

## 6. NOVAS TABELAS (MÓDULOS ADICIONAIS)

### 6.1 Transferência de Cartões

> Schema real: `card_transfers` + `transfer_approvals` (1:1). **Não existem** as tabelas `transfer_limit_exceptions`, `transfer_requests` nem `account_settings`. O fluxo de aprovação é modelado por `transfer_approvals` ligado a `card_transfers` (status `pending_approval`).

```sql
-- Tabela de transferências de cartões (card_transfers)
CREATE TABLE card_transfers (
  id INTEGER PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,       -- nullable
  to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  reason VARCHAR(100) NOT NULL,        -- reassignment, workload_balance, expertise, etc.
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed', -- completed, pending_approval, rejected
  is_batch_transfer BOOLEAN NOT NULL DEFAULT false,
  batch_id VARCHAR(50),                -- UUID do lote (NULL para individuais)
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
CREATE INDEX ix_card_transfers_card_id ON card_transfers(card_id);
CREATE INDEX ix_card_transfers_from_user_id ON card_transfers(from_user_id);
CREATE INDEX ix_card_transfers_to_user_id ON card_transfers(to_user_id);
CREATE INDEX ix_card_transfers_status ON card_transfers(status);
CREATE INDEX ix_card_transfers_batch_id ON card_transfers(batch_id);

-- Tabela de aprovação de transferência (transfer_approvals) — usada quando
-- TRANSFER_APPROVAL_REQUIRED está ativo. Relação 1:1 com card_transfers.
CREATE TABLE transfer_approvals (
  id INTEGER PRIMARY KEY,
  transfer_id INTEGER NOT NULL UNIQUE REFERENCES card_transfers(id) ON DELETE CASCADE,
  approver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- gerente responsável
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, expired
  expires_at TIMESTAMP NOT NULL,       -- 72h padrão
  decided_at TIMESTAMP,
  comments TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
CREATE INDEX ix_transfer_approvals_transfer_id ON transfer_approvals(transfer_id);
CREATE INDEX ix_transfer_approvals_approver_id ON transfer_approvals(approver_id);
CREATE INDEX ix_transfer_approvals_status ON transfer_approvals(status);
CREATE INDEX ix_transfer_approvals_expires_at ON transfer_approvals(expires_at);
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

-- Tabela de pontos (histórico completo, perpétuo) — gamification_points
CREATE TABLE gamification_points (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_type VARCHAR(20),              -- 'prospecting', 'acquisition' ou NULL
  points INTEGER NOT NULL,             -- pode ser negativo (penalidade)
  reason VARCHAR(100) NOT NULL,        -- card_created, card_won, card_lost, meeting_completed...
  description TEXT,
  -- Comissão (split de pontos)
  is_commission BOOLEAN NOT NULL DEFAULT false,
  commission_source_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  commission_ratio VARCHAR(10),        -- ex: '1/4', '1/3'
  original_points INTEGER,             -- pontos antes do split
  related_entity_type VARCHAR(50),     -- Card, Task, Attachment
  related_entity_id INTEGER,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Tabela de rankings periódicos — gamification_rankings (separados por board_type)
CREATE TABLE gamification_rankings (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_type VARCHAR(20) NOT NULL,     -- 'prospecting', 'acquisition'
  period_type VARCHAR(20) NOT NULL,    -- weekly, monthly, quarterly, annual
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  rank INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,   -- pontos acumulados no período
  cards_won INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT unique_user_board_ranking_period UNIQUE(user_id, board_type, period_type, period_start)
);

-- Configuração de pontos por ação e board — gamification_action_points
CREATE TABLE gamification_action_points (
  id INTEGER PRIMARY KEY,
  board_type VARCHAR(20) NOT NULL,     -- 'prospecting', 'acquisition'
  action_type VARCHAR(100) NOT NULL,   -- card_created, card_won, meeting_completed...
  points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description VARCHAR(255),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT unique_board_action_type UNIQUE(board_type, action_type)
);

-- Tabela de badges (conquistas) — gamification_badges
CREATE TABLE gamification_badges (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  is_system_badge BOOLEAN NOT NULL DEFAULT false,
  criteria_type VARCHAR(50) NOT NULL,  -- manual, automatic
  criteria JSON,                       -- ex: {"field":"total_points","operator":">=","value":500,"board_type":"prospecting"}
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMP,                -- soft delete (preserva user_badges)
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Tabela de badges conquistadas por usuário — user_badges
CREATE TABLE user_badges (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER NOT NULL REFERENCES gamification_badges(id) ON DELETE CASCADE,
  awarded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL se automático
  awarded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT unique_user_badge UNIQUE(user_id, badge_id)
);

-- Índices para gamificação
CREATE INDEX ix_gamification_points_user_id ON gamification_points(user_id);
CREATE INDEX ix_gamification_points_board_type ON gamification_points(board_type);
CREATE INDEX ix_gamification_points_reason ON gamification_points(reason);
CREATE INDEX ix_gamification_rankings_period_type ON gamification_rankings(period_type);
CREATE INDEX ix_user_badges_user_id ON user_badges(user_id);
```

### 6.3 Automações

> Schema real: automações são **por quadro** (`board_id`, sem `account_id`). As ações ficam em um array JSON (`actions`), não em colunas `action_*`. O estado do rodízio é guardado em `state`.

```sql
-- Tabela de automações (automations)
CREATE TABLE automations (
  id INTEGER PRIMARY KEY,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  automation_type VARCHAR(20) NOT NULL,  -- trigger, scheduled
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 50,   -- 1-100, maior = mais prioritário

  -- TRIGGER
  trigger_event VARCHAR(50),              -- card_moved, card_created, card_updated, field_changed
  trigger_conditions JSON,                -- ex: {"from_list_id":1,"to_list_id":2}

  -- SCHEDULED
  schedule_type VARCHAR(20),              -- once, recurrent
  scheduled_at TIMESTAMP,                 -- para once
  recurrence_pattern VARCHAR(20),         -- daily, weekly, monthly, annual
  next_run_at TIMESTAMP,                  -- próxima execução (cron)

  -- AÇÕES e ESTADO
  actions JSON NOT NULL DEFAULT '[]',     -- ex: [{"type":"move_card","target_list_id":3}]
  state JSON NOT NULL DEFAULT '{}',       -- ex: {"round_robin_last_user_id":5}

  -- CONTROLE
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMP,
  failure_count INTEGER NOT NULL DEFAULT 0,
  auto_disable_on_failures INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Tabela de execuções de automação (automation_executions)
CREATE TABLE automation_executions (
  id INTEGER PRIMARY KEY,
  automation_id INTEGER NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  card_id INTEGER REFERENCES cards(id) ON DELETE SET NULL,
  triggered_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL,           -- success, failed, pending
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms FLOAT,
  execution_data JSON NOT NULL DEFAULT '{}',
  error_message TEXT,
  error_stack TEXT
);

-- Índices para automações
CREATE INDEX ix_automations_board_id ON automations(board_id);
CREATE INDEX ix_automations_type ON automations(automation_type);
CREATE INDEX ix_automations_trigger_event ON automations(trigger_event);
CREATE INDEX ix_automations_priority ON automations(priority);
CREATE INDEX ix_automations_next_run_at ON automations(next_run_at);
CREATE INDEX ix_automation_executions_automation_id ON automation_executions(automation_id);
CREATE INDEX ix_automation_executions_status ON automation_executions(status);
CREATE INDEX ix_automation_executions_started_at ON automation_executions(started_at);
```

### 6.4 Módulo de Serviços

> Módulo **independente** de Vendas: tabelas próprias `service_boards`, `service_lists`, `service_cards`, `service_card_products` e `service_card_activities`. Compartilha o catálogo `products`, e os `clients`/`persons`.

```sql
-- Quadros de serviço (service_boards) — usa TimestampMixin + SoftDeleteMixin
CREATE TABLE service_boards (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(50) DEFAULT '#8B5CF6',
  icon VARCHAR(50) DEFAULT 'wrench',
  settings JSON NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP, is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Listas/colunas de serviço (service_lists)
CREATE TABLE service_lists (
  id INTEGER PRIMARY KEY,
  board_id INTEGER NOT NULL REFERENCES service_boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7),
  position INTEGER NOT NULL DEFAULT 0,
  is_done_stage BOOLEAN NOT NULL DEFAULT false,
  is_lost_stage BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL
);

-- Cards de serviço (service_cards) — usa TimestampMixin + SoftDeleteMixin
CREATE TABLE service_cards (
  id INTEGER PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES service_lists(id) ON DELETE CASCADE,
  assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  position NUMERIC(12,2) NOT NULL DEFAULT 0,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  person_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
  contact_info JSON,                  -- dados de contato/cliente
  payment_info JSON,                  -- desconto global, forma de pagamento, parcelas, notas
  business_info JSON,                 -- seller_name, deal_type, acquisition_channel, modality, should_invoice...
  due_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP, is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Produtos do card de serviço (service_card_products)
CREATE TABLE service_card_products (
  id INTEGER PRIMARY KEY,
  service_card_id INTEGER NOT NULL REFERENCES service_cards(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  -- Sub-lista de aparelhos (1 item por aparelho com dados do laboratório)
  -- Ex: [{"serial_number":"AB123","model":"X100","alcohol_module":"Sim","next_recalibration_date":"2026-08-10"}]
  aparelhos JSON,
  created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL,
  CONSTRAINT unique_service_card_product UNIQUE(service_card_id, product_id)
);

-- Atividades/eventos unificados do card de serviço (service_card_activities)
-- category: atividade | anotacao | arquivo | alteracao
CREATE TABLE service_card_activities (
  id INTEGER PRIMARY KEY,
  service_card_id INTEGER NOT NULL REFERENCES service_cards(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- NULL = sistema
  category VARCHAR(20) NOT NULL,        -- atividade, anotacao, arquivo, alteracao
  activity_type VARCHAR(50),            -- call, task, note, stage_change...
  title VARCHAR(500),
  description TEXT,
  activity_metadata JSON,
  -- Campos de "atividade" (Foco)
  priority VARCHAR(20),                 -- normal, high, urgent
  due_date TIMESTAMP,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP,
  -- Campos de "arquivo"
  file_name VARCHAR(500),
  file_path VARCHAR(1000),
  file_size BIGINT,
  mime_type VARCHAR(100),
  created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL
);
```

### 6.5 Outras tabelas relevantes

| Tabela | Descrição |
|--------|-----------|
| `notifications` | Notificações in-app (user_id, notification_type, title, message, is_read, notification_metadata JSON) |
| `user_notification_settings` | Preferências de notificação por usuário (task_assigned, task_due_soon, card_moved, card_product_changed, achievement_unlocked); UNIQUE(user_id) |
| `email_templates` | Templates de e-mail reutilizáveis (name, subject, body, variáveis dinâmicas {{...}}, soft delete) |
| `custom_reports` | Dashboards salvos pelo usuário (name, created_by_id, config JSON, charts_count) |
| `cadence_templates` / `cadence_steps` / `card_cadences` | Cadência por lead (template → etapas → instância por card; tasks geradas referenciam `card_cadence_id`) |
| `cadencias` / `cadencia_itens` | Cadência por metas de atividade (ex: 20 ligações + 10 e-mails por disparo) |
| `call_evaluations` | Avaliação de ligação por IA (transcript, summary, matrix_evaluation JSON, final_score, classification) |
| `api4com_config` / `user_extensions` / `call_logs` | Integração VOIP API4COM (config, ramais por vendedor, histórico de chamadas; call_logs liga a `cards` ou `service_cards`) |

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

**Versão**: v1.7.35 — Junho/2026
**Status**: Atualizado para refletir os models reais (single-tenant, módulo de Serviços incluído)

