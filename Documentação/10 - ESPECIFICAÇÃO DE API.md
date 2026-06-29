# 10 - ESPECIFICAÇÃO DE API

> **Versão**: v1.7.35 — Junho/2026
> **Status**: Sincronizado com o código (`backend/app/api/v1/endpoints/*.py`)

## 1. INTRODUÇÃO

Este documento especifica os endpoints da API REST do HSGrowth CRM, com métodos HTTP, paths reais, parâmetros e exemplos.

**Base URL**: `https://api.hsgrowth.com/api/v1`

> ⚠️ **Importante**: Todas as rotas têm o prefixo **`/api/v1`**. Versões anteriores deste documento usavam `/api/...` (sem `/v1`) e `camelCase` nos corpos JSON — ambos estavam **incorretos**. Os corpos de request/response usam **`snake_case`** (ex.: `access_token`, `card_id`, `is_active`).

**Autenticação**: JWT Bearer Token ou Client Credentials

**Content-Type**: `application/json` (exceto uploads, que usam `multipart/form-data`)

### Convenção de permissões

| Dependência (código) | Significado |
|----------------------|-------------|
| `get_current_active_user` | Qualquer usuário autenticado e ativo |
| `require_not_viewer()` | Usuário autenticado que **não** seja `viewer` |
| `require_manager_or_admin()` | Apenas `manager` ou `admin` |
| `require_role("admin")` | Apenas `admin` |
| `require_service_access()` | Acesso ao módulo de Serviço (aplicado a todo o módulo) |

---

## 2. AUTENTICAÇÃO

Prefixo: `/api/v1/auth`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| POST | `/auth/login` | Login com email e senha | Público |
| POST | `/auth/refresh` | Renova o access token | Público |
| POST | `/auth/logout` | Logout (revoga/blacklist do token) | Autenticado |
| POST | `/auth/register` | Registro de novo usuário | Público |
| POST | `/auth/forgot-password` | Solicita token de redefinição de senha | Público |
| POST | `/auth/reset-password` | Redefine senha com token | Público |
| POST | `/auth/client-credentials` | Autenticação de sistema externo (Client ID/Secret) | Público |
| GET | `/auth/login-history` | Histórico de logins do sistema | Autenticado |
| GET | `/auth/microsoft` | Inicia login SSO Microsoft 365 | Público |
| GET | `/auth/microsoft/callback` | Callback do SSO Microsoft 365 | Público |
| GET | `/auth/me/calendar-events` | Eventos do calendário Outlook do usuário | Autenticado |
| GET | `/auth/me/seller-schedule` | Disponibilidade do vendedor (Graph API) | Autenticado |

### 2.1 Login

**Endpoint**: `POST /auth/login`

**Request**:
```json
{
  "email": "vendedor@empresa.com",
  "password": "SenhaForte123!"
}
```

**Response (200 OK)** — note o `snake_case`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 28800,
  "user": {
    "id": 1,
    "email": "vendedor@empresa.com",
    "name": "João Silva",
    "role": "vendedor"
  }
}
```

**Erros**: `400` dados inválidos · `401` credenciais incorretas · `429` muitas tentativas.

### 2.2 Refresh Token

**Endpoint**: `POST /auth/refresh`

**Request**:
```json
{ "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

### 2.3 Client Credentials (Sistema Externo)

**Endpoint**: `POST /auth/client-credentials`

**Request**:
```json
{ "client_id": "abc123def456", "client_secret": "xyz789uvw012" }
```

**Response (200 OK)**: mesmo formato de `TokenResponse` (`access_token`, `token_type`, `expires_in`).

### 2.4 Logout

**Endpoint**: `POST /auth/logout` · Header `Authorization: Bearer <ACCESS_TOKEN>`

---

## 3. QUADROS (BOARDS)

Prefixo: `/api/v1/boards`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/boards` | Lista quadros (paginado) | Autenticado |
| GET | `/boards/{board_id}` | Detalhes do quadro | Autenticado |
| POST | `/boards` | Cria quadro | `require_not_viewer` |
| PUT | `/boards/{board_id}` | Atualiza quadro | `require_not_viewer` |
| DELETE | `/boards/{board_id}` | Deleta quadro | `require_not_viewer` |
| POST | `/boards/{board_id}/duplicate` | Duplica quadro | `require_not_viewer` |
| GET | `/boards/{board_id}/lists` | Lista as colunas/listas do quadro | Autenticado |
| POST | `/boards/{board_id}/lists` | Cria lista | `require_not_viewer` |
| PUT | `/boards/{board_id}/lists/{list_id}` | Atualiza lista | `require_not_viewer` |
| DELETE | `/boards/{board_id}/lists/{list_id}` | Deleta lista | `require_not_viewer` |
| PUT | `/boards/{board_id}/lists/{list_id}/move` | Reordena lista | `require_not_viewer` |

### 3.1 Listar Quadros — `GET /boards`

**Query**: `limit`, `offset`, `search`, `sort`, `order`.

### 3.2 Criar Quadro — `POST /boards`

```json
{ "name": "Vendas Q1 2026", "description": "...", "color": "#3498db", "type": "kanban" }
```

### 3.3 Duplicar Quadro — `POST /boards/{board_id}/duplicate`

```json
{ "new_name": "Vendas Q2 2026 (Cópia)", "copy_lists": true }
```

> ⚠️ **Removido**: A versão anterior documentava `POST /boards/{boardId}/lists/{listId}/duplicate` (duplicar lista). **Esse endpoint não existe** — apenas a duplicação de quadro está implementada.

---

## 4. CAMPOS CUSTOMIZADOS (CUSTOM FIELDS)

> ⚠️ **Correção importante**: Os campos customizados **não** ficam sob `/boards/{boardId}/custom-fields` (esse path nunca existiu). Eles vivem no router **`/fields`**. As definições são por quadro; os valores são por cartão.

Prefixo: `/api/v1/fields`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| POST | `/fields/definitions` | Cria definição de campo (informa `board_id` no corpo) | Autenticado |
| GET | `/fields/definitions/board/{board_id}` | Lista definições de um quadro | Autenticado |
| GET | `/fields/definitions/{field_definition_id}` | Obtém definição | Autenticado |
| PUT | `/fields/definitions/{field_definition_id}` | Atualiza definição | Autenticado |
| DELETE | `/fields/definitions/{field_definition_id}` | Remove definição | Autenticado |
| GET | `/fields/cards/{card_id}/values` | Lista valores de campos do cartão | Autenticado |
| PUT | `/fields/cards/{card_id}/values` | Define/atualiza valor de campo no cartão | Autenticado |
| DELETE | `/fields/cards/{card_id}/values/{field_definition_id}` | Remove valor do cartão | Autenticado |

**Tipos de campo** (`type`): `text`, `textarea`, `number`, `date`, `datetime`, `select`, `multiselect`, `currency`, `email`, `document`, `checkbox`, `user`, `attachment`, `tag` (ver schema `app/schemas/field.py` para a lista canônica).

> **Nota**: O cartão também expõe campos via `GET/POST /cards/{card_id}/fields` (atalho do router de cards — ver seção 5).

---

## 5. CARTÕES (CARDS)

Prefixo: `/api/v1/cards`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/cards` | Lista cartões (filtros + paginação) | Autenticado |
| GET | `/cards/{card_id}` | Detalhes do cartão | Autenticado |
| GET | `/cards/{card_id}/expanded` | Cartão com todas as relações | Autenticado |
| POST | `/cards` | Cria cartão | `require_not_viewer` |
| PUT | `/cards/{card_id}` | Atualiza cartão | `require_not_viewer` |
| DELETE | `/cards/{card_id}` | Deleta cartão | `require_not_viewer` |
| PUT | `/cards/{card_id}/move` | Move cartão para outra lista | `require_not_viewer` |
| PUT | `/cards/{card_id}/assign` | Atribui cartão a um usuário | `require_not_viewer` |
| POST | `/cards/{card_id}/clone` | Clona cartão | `require_not_viewer` |
| POST | `/cards/{card_id}/win` | Marca como ganho | `require_not_viewer` |
| POST | `/cards/{card_id}/lose` | Marca como perdido | `require_not_viewer` |
| POST | `/cards/{card_id}/reopen` | Reabre negócio perdido | `require_not_viewer` |
| POST | `/cards/{card_id}/reopen-won` | Reverte negócio ganho | `require_role("admin")` |
| GET | `/cards/{card_id}/fields` | Lista campos customizados do cartão | Autenticado |
| POST | `/cards/{card_id}/fields` | Adiciona/atualiza campo customizado | `require_not_viewer` |
| POST | `/cards/{card_id}/person` | Vincula pessoa ao cartão | `require_not_viewer` |
| DELETE | `/cards/{card_id}/person` | Desvincula pessoa do cartão | `require_not_viewer` |
| POST | `/cards/{card_id}/send-email` | Envia e-mail (Microsoft 365) | Autenticado |
| POST | `/cards/{card_id}/automacao01/desativar` | Desativa automação 01 no cartão | Autenticado |
| GET | `/cards/search/global` | Busca global de cartões | Autenticado |
| GET | `/cards/import/template` | Baixa modelo (template) de importação | Autenticado |
| POST | `/cards/import/preview` | Pré-visualiza importação (dry-run) | Autenticado |
| POST | `/cards/import` | Importa cartões em lote a partir de arquivo | Autenticado |

### 5.5 Mover Cartão — `PUT /cards/{card_id}/move`

```json
{ "list_id": 2, "position": 5 }
```

### 5.7 Importar Cartões — `POST /cards/import`

> ⚠️ **Corrigido**: A importação é feita por **upload de arquivo** (`multipart/form-data`), não por um corpo JSON com array de cartões como descrito na versão anterior. Fluxo recomendado: `GET /cards/import/template` → preencher → `POST /cards/import/preview` (dry-run) → `POST /cards/import`.

---

## 6. RELATÓRIOS E KPIs

Prefixo: `/api/v1/reports`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/reports/dashboard` | KPIs do dashboard | Autenticado |
| POST | `/reports/sales` | Relatório de vendas | Autenticado |
| POST | `/reports/conversion` | Relatório de conversão/funil | Autenticado |
| POST | `/reports/transfers` | Relatório de transferências de cartões | Autenticado |
| POST | `/reports/export` | Exporta relatório (CSV/Excel/JSON) | Autenticado |

> ⚠️ **Corrigido**: Não existe `GET /reports/kpis`. Os KPIs são retornados por **`GET /reports/dashboard`**. A exportação é **`POST /reports/export`** (não `GET`).

### 6.1 KPIs — `GET /reports/dashboard`

**Query**: `boardId`/`board_id`, `period`, `start_date`, `end_date`.

---

## 6B. RELATÓRIOS CUSTOMIZADOS (Custom Reports)

> **Novo no doc.** Router `custom_reports` montado sob o prefixo `/api/v1/reports`. Todas as rotas exigem **manager ou admin**.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/reports/fields` | Catálogo de campos disponíveis para relatórios |
| POST | `/reports/query` | Executa consulta de gráfico e retorna dados |
| POST | `/reports/calculated-fields/validate` | Valida fórmula de campo calculado |
| POST | `/reports/split-values` | Valores disponíveis para filtro de split |
| POST | `/reports/drill-down` | Detalha barras/fatias do gráfico em cartões |
| GET | `/reports/custom` | Lista relatórios customizados |
| POST | `/reports/custom` | Cria relatório customizado |
| GET | `/reports/custom/{report_id}` | Obtém relatório customizado |
| PUT | `/reports/custom/{report_id}` | Atualiza relatório customizado |
| DELETE | `/reports/custom/{report_id}` | Deleta relatório customizado |
| GET | `/reports/custom/{report_id}/export` | Exporta relatório (Excel/CSV) |

---

## 7. AUDITORIA

> ⚠️ **Corrigido**: Os logs de auditoria existem em **dois** lugares. Não há rota `/admin/audit-logs`.

**Router dedicado** — prefixo `/api/v1/audit-logs` (apenas **admin**):

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/audit-logs` | Lista logs (filtros + paginação) |
| GET | `/audit-logs/actions` | Lista tipos de ação disponíveis |
| GET | `/audit-logs/entity-types` | Lista tipos de entidade disponíveis |

**Atalho no router admin**: `GET /admin/logs` (ver seção 8).

**Query (`/audit-logs`)**: `page`, `page_size`, `user_id`, `action`, `entity_type`.

---

## 8. ADMINISTRAÇÃO

Prefixo: `/api/v1/admin` — todas as rotas exigem **admin**.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/admin/users` | Lista todos os usuários (paginado) |
| POST | `/admin/users` | Cria usuário |
| PUT | `/admin/users/{user_id}/reset-password` | Reseta senha de um usuário |
| GET | `/admin/logs` | Logs de auditoria |
| POST | `/admin/database/query` | Executa query SQL (somente SELECT) |
| GET | `/admin/automations/monitor` | Monitora automações |
| GET | `/admin/stats` | Estatísticas gerais do sistema |

### 8.1 Executar Query SQL — `POST /admin/database/query`

> ⚠️ **Corrigido**: O path real é **`/admin/database/query`** — **não** `/admin/sql/execute`. **Não existe** rota de validação (`/admin/sql/validate` foi removida da documentação por nunca ter existido).

**Request**:
```json
{ "query": "SELECT id, name, email FROM users LIMIT 100" }
```

**Validações**: apenas `SELECT`; bloqueia `insert/update/delete/drop/alter/create/truncate/grant/revoke`.

**Response (200 OK)**:
```json
{
  "columns": ["id", "name", "email"],
  "rows": [[1, "Carlos", "carlos@hsgrowth.com.br"]],
  "row_count": 1,
  "execution_time_ms": 12.45
}
```

> **Nota sobre Usuários**: A gestão completa de usuários (incluindo `PUT`/`DELETE`) fica no router **`/users`** (seção 13), não em `/admin/users`. O router admin só cria, lista e reseta senha.

---

## 9. NOTIFICAÇÕES

Prefixo: `/api/v1/notifications`

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/notifications` | Lista notificações (paginado) |
| GET | `/notifications/unread-count` | Contador de não lidas |
| GET | `/notifications/stats` | Estatísticas |
| GET | `/notifications/{notification_id}` | Obtém notificação |
| POST | `/notifications` | Cria notificação |
| POST | `/notifications/bulk` | Cria em lote |
| PUT | `/notifications/{notification_id}/read` | Marca como lida |
| PUT | `/notifications/read-all` | Marca todas como lidas (PUT) |
| POST | `/notifications/mark-as-read` | Marca várias como lidas (array) |
| POST | `/notifications/mark-all-as-read` | Marca todas como lidas (POST) |
| DELETE | `/notifications/delete-read` | Remove todas as lidas |
| DELETE | `/notifications/{notification_id}` | Remove notificação |
| POST | `/notifications/helpers/card-assigned` | [Helper] Notifica card atribuído |
| POST | `/notifications/helpers/card-overdue` | [Helper] Notifica card vencido |
| POST | `/notifications/helpers/badge-earned` | [Helper] Notifica badge conquistado |

**Query (`/notifications`)**: `unreadOnly`/`unread_only`, `limit`.

---

## 10. CÓDIGOS DE ERRO

| Código | Descrição |
|--------|-----------|
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex.: duplicata) |
| 422 | Dados inválidos (validação Pydantic) |
| 429 | Rate limit atingido |
| 500 | Erro interno do servidor |
| 503 | Serviço indisponível |

---

## 11. RATE LIMITING

- **Login**: 5 tentativas por 15 minutos
- **API Geral**: 100 requisições por minuto por token
- **Busca**: 10 requisições por segundo por usuário

**Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## 12. PAGINAÇÃO

Endpoints de lista usam `page`/`page_size` (módulos novos) ou `limit`/`offset` (módulos legados). Verifique a tabela de cada módulo.

```json
{ "items": [], "total": 1000, "page": 1, "page_size": 50, "total_pages": 20 }
```

---

## 13. USUÁRIOS

Prefixo: `/api/v1/users`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/users` | Lista usuários (paginado) | Autenticado |
| GET | `/users/me` | Dados do usuário logado | Autenticado |
| GET | `/users/active` | Lista usuários ativos | Autenticado |
| GET | `/users/online` | Usuários com sessão ativa (Redis) | `manager`/`admin` |
| GET | `/users/{user_id}` | Obtém usuário | Autenticado |
| POST | `/users` | Cria usuário | `admin` |
| PUT | `/users/{user_id}` | Atualiza usuário | Autenticado |
| DELETE | `/users/{user_id}` | Deleta usuário (soft) | `admin` |
| POST | `/users/me/change-password` | Altera senha do usuário logado | Autenticado |
| GET | `/users/me/notification-settings` | Preferências de notificação | Autenticado |
| PUT | `/users/me/notification-settings` | Atualiza preferências | Autenticado |

**Avatar** (router `user_avatar`, sem prefixo extra): `/users/me/avatar` e `/users/{id}/avatar`.

---

## 14. CLIENTES E PESSOAS

### 14.1 Clientes — `/api/v1/clients`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/clients` | Lista clientes (paginado + filtros) | Autenticado |
| GET | `/clients/{client_id}` | Obtém cliente | Autenticado |
| POST | `/clients` | Cria cliente | `require_not_viewer` |
| PUT | `/clients/{client_id}` | Atualiza cliente | `require_not_viewer` |
| DELETE | `/clients/{client_id}` | Deleta cliente (soft) | `require_not_viewer` |
| GET | `/clients/cnpj/{cnpj}` | Consulta CNPJ na Receita Federal | Autenticado |

### 14.2 Pessoas — `/api/v1/persons`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/persons` | Lista pessoas (paginado + filtros) | Autenticado |
| GET | `/persons/{person_id}` | Obtém pessoa | Autenticado |
| POST | `/persons` | Cria pessoa | `require_not_viewer` |
| PUT | `/persons/{person_id}` | Atualiza pessoa | `require_not_viewer` |
| DELETE | `/persons/{person_id}` | Deleta pessoa | `require_not_viewer` |
| PATCH | `/persons/{person_id}/status` | Ativa/inativa pessoa | `require_not_viewer` |
| GET | `/persons/organization/{organization_id}` | Pessoas ativas de uma organização | Autenticado |

---

## 15. PRODUTOS (Catálogo)

Prefixo: `/api/v1/products`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/products` | Lista produtos (filtros + paginação) | Autenticado |
| GET | `/products/{product_id}` | Obtém produto | Autenticado |
| POST | `/products` | Cria produto | `require_not_viewer` |
| PUT | `/products/{product_id}` | Atualiza produto | `require_not_viewer` |
| DELETE | `/products/{product_id}` | Deleta produto (soft) | `require_not_viewer` |
| GET | `/products/cards/{card_id}` | Lista produtos do cartão (com totais) | Autenticado |
| POST | `/products/cards/{card_id}` | Adiciona produto ao cartão | `require_not_viewer` |
| PUT | `/products/cards/items/{card_product_id}` | Atualiza produto do cartão | `require_not_viewer` |
| DELETE | `/products/cards/items/{card_product_id}` | Remove produto do cartão | `require_not_viewer` |

---

## 16. GAMIFICAÇÃO

Prefixo: `/api/v1/gamification` (não `/api/gamification`).

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/gamification/me` | Resumo de gamificação do usuário logado | Autenticado |
| GET | `/gamification/users/{user_id}` | Resumo de um usuário | Autenticado |
| POST | `/gamification/points` | Atribui pontos (manual) | Autenticado |
| GET | `/gamification/points` | Histórico de pontos (todos) | `manager`/`admin` |
| GET | `/gamification/points/me` | Histórico de pontos do usuário logado | Autenticado |
| GET | `/gamification/points/users/{user_id}` | Histórico de um usuário | `manager`/`admin` |
| GET | `/gamification/badges` | Lista todas as badges | Autenticado |
| POST | `/gamification/badges` | Cria badge | `admin` |
| GET | `/gamification/badges/me` | Badges do usuário logado | Autenticado |
| GET | `/gamification/badges/users/{user_id}` | Badges de um usuário | Autenticado |
| GET | `/gamification/badges/{badge_id}` | Obtém badge | Autenticado |
| PUT | `/gamification/badges/{badge_id}` | Atualiza badge | `admin` |
| DELETE | `/gamification/badges/{badge_id}` | Remove badge (soft) | `admin` |
| POST | `/gamification/badges/{badge_id}/award` | Atribui badge a usuário | Autenticado |
| GET | `/gamification/rankings` | Rankings por quadro/período | Autenticado |
| POST | `/gamification/rankings/calculate` | Recalcula rankings | `admin` |
| GET | `/gamification/action-points` | Lista configs de pontos por ação | Autenticado |
| GET | `/gamification/action-points/{board_type}/{action_type}` | Config específica | Autenticado |
| POST | `/gamification/action-points` | Cria config de pontos | `admin` |
| PUT | `/gamification/action-points/{board_type}/{action_type}` | Atualiza config | `admin` |
| POST | `/gamification/action-points/initialize` | Inicializa configs padrão | `admin` |

> ⚠️ **Removido**: A versão anterior documentava `GET /api/gamification/reports/export`, `POST /badges/:id/assign`, `GET /gamification/transfer-badges/:user_id` e paths com `:user_id`/`/api/`. **Nenhum existe**. Exportações de gamificação **não** estão implementadas como endpoint. Para atribuir badge use `POST /gamification/badges/{badge_id}/award`.

---

## 17. AUTOMAÇÕES

Prefixo: `/api/v1/automations` (não `/api/automations`).

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/automations` | Lista automações (por quadro) | Autenticado |
| GET | `/automations/{automation_id}` | Obtém automação | Autenticado |
| POST | `/automations` | Cria automação | Autenticado |
| PUT | `/automations/{automation_id}` | Atualiza automação | Autenticado |
| DELETE | `/automations/{automation_id}` | Deleta automação | Autenticado |
| POST | `/automations/{automation_id}/trigger` | Executa manualmente | Autenticado |
| GET | `/automations/{automation_id}/executions` | Histórico de execuções | Autenticado |

> ⚠️ **Removido**: `PATCH /automations/:id/toggle` e `POST /automations/:id/test` **não existem**. Ative/desative via `PUT` (campo `is_active`).

### 17.1 Schema de Automação (atual)

> ⚠️ **Schema reescrito** para refletir `app/schemas/automation.py`. As versões antigas usavam `trigger_type`, `schedule_config` aninhado, `action_type`/`action_board_id` no topo e `field_mapping` — **tudo desatualizado**.

Campos de `AutomationCreate`:

- `board_id` (int, **obrigatório**) — automações são por quadro.
- `name`, `description`.
- `automation_type` (enum): `"trigger"` | `"scheduled"`.
- **Trigger** (`automation_type = "trigger"`):
  - `trigger_event` (enum): `card_created`, `card_updated`, `card_moved`, `card_won`, `card_lost`, `card_assigned`, `field_changed`, `manual`.
  - `trigger_conditions` (dict, opcional) — ex.: `{ "from_list_id": 1, "to_list_id": 2 }`.
- **Scheduled** (`automation_type = "scheduled"`):
  - `schedule_type` (enum): `"once"` | `"recurrent"`.
  - `scheduled_at` (datetime) — para `once`.
  - `recurrence_pattern` (enum): `"daily"` | `"weekly"` | `"monthly"` | `"annual"` — para `recurrent`.
- `actions` (lista, **mín. 1**) — cada item `{ "type": <ActionType>, "params": { ... } }`.
  - **ActionType**: `move_card`, `assign_card`, `assign_round_robin`, `assign_sdr_round_robin`, `update_field`, `update_client_field`, `send_notification`, `award_points`, `mark_won`, `mark_lost`, `send_webhook`.
- `priority` (int 1-100, padrão 50), `is_active` (bool, padrão `true`), `auto_disable_on_failures` (int, padrão 5).

`AutomationResponse` inclui: `execution_count`, `last_run_at`, `next_run_at`, `failure_count`, `state`.

> 💡 **Rodízio (round-robin)**: não é um conjunto de rotas REST. É uma **ação de automação** (`assign_round_robin` / `assign_sdr_round_robin`) executada pelo `automation_service.py`. As rotas `/boards/{id}/roundrobin/*` e `/cards/{id}/auto-assign` **não existem** e foram removidas deste documento.

**Exemplo — automação por gatilho**:
```json
{
  "board_id": 1,
  "name": "Distribuir novos leads",
  "automation_type": "trigger",
  "trigger_event": "card_created",
  "trigger_conditions": { "list_id": 1 },
  "actions": [ { "type": "assign_round_robin", "params": { "user_ids": [5, 6, 7] } } ],
  "priority": 80,
  "is_active": true
}
```

---

## 18. TRANSFERÊNCIA DE CARTÕES

> ⚠️ **Corrigido**: As transferências ficam no router **`/api/v1/transfers`** — **não** em `/api/cards/:id/transfer`, `/api/cards/:id/transfer-history`, `/api/users/:id/transferred-cards`, `/api/reports/transfers` nem `/api/gamification/transfer-badges/:user_id` (todos removidos). O relatório de transferências é `POST /reports/transfers` (seção 6).

Prefixo: `/api/v1/transfers`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| POST | `/transfers` | Transfere um cartão | Autenticado |
| POST | `/transfers/batch` | Transferência em lote (até 50 cartões) | Autenticado |
| GET | `/transfers/all` | Lista todas as transferências | `manager`/`admin` |
| GET | `/transfers/sent` | Transferências enviadas pelo usuário | Autenticado |
| GET | `/transfers/received` | Transferências recebidas pelo usuário | Autenticado |
| GET | `/transfers/statistics` | Estatísticas de transferências | Autenticado |
| GET | `/transfers/approvals/pending` | Aprovações pendentes | Autenticado |
| POST | `/transfers/approvals/{approval_id}/decide` | Aprova/rejeita transferência | Autenticado |

### 18.1 Transferir Cartão — `POST /transfers`

```json
{
  "card_id": 123,
  "to_user_id": 124,
  "transfer_reason": "Especialista",
  "notes": "Cliente precisa de especialista em integrações"
}
```

---

## 19. CADÊNCIAS (por Lead)

Prefixo: `/api/v1/cadences`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/cadences/templates` | Lista templates de cadência | Autenticado |
| POST | `/cadences/templates` | Cria template | `manager`/`admin` |
| PUT | `/cadences/templates/{template_id}` | Atualiza template | `manager`/`admin` |
| DELETE | `/cadences/templates/{template_id}` | Deleta template | `manager`/`admin` |
| GET | `/cadences/cards/{card_id}` | Status da cadência do cartão | Autenticado |
| POST | `/cadences/cards/{card_id}/start` | Inicia cadência no cartão | `require_not_viewer` |
| POST | `/cadences/cards/{card_id}/pause` | Pausa cadência | `require_not_viewer` |
| POST | `/cadences/cards/{card_id}/resume` | Retoma cadência | `require_not_viewer` |
| POST | `/cadences/cards/{card_id}/cancel` | Cancela cadência | `require_not_viewer` |

> **Nota**: Há também o router `cadencias` (prefixo `/api/v1/cadencias`) para a configuração global de cadências.

---

## 20. TELEFONIA (API4COM)

Prefixo: `/api/v1/api4com`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/api4com/config` | Obtém configuração | `manager`/`admin` |
| POST | `/api4com/config` | Salva/atualiza configuração | `admin` |
| POST | `/api4com/test` | Testa conexão | `manager`/`admin` |
| GET | `/api4com/extensions` | Lista ramais configurados | `manager`/`admin` |
| POST | `/api4com/extensions` | Cria/atualiza ramal de usuário | `manager`/`admin` |
| DELETE | `/api4com/extensions/{user_id}` | Remove ramal | `manager`/`admin` |
| POST | `/api4com/call` | Realiza chamada telefônica | Autenticado |
| POST | `/api4com/webhook` | Recebe webhook de fim de chamada | Público (sem auth) |

---

## 21. AVALIAÇÃO DE LIGAÇÕES (Call Evaluations)

Prefixo: `/api/v1/call-evaluations`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| POST | `/call-evaluations` | Cria avaliação (vinda do N8N) | Autenticado |
| GET | `/call-evaluations` | Lista avaliações (filtros + paginação) | Autenticado |
| GET | `/call-evaluations/vendedores` | Vendedores com avaliações | `manager`/`admin` |
| GET | `/call-evaluations/card/{card_id}` | Avaliações de um cartão | Autenticado |
| GET | `/call-evaluations/{evaluation_id}` | Obtém avaliação | Autenticado |

---

## 22. MÓDULO DE SERVIÇO

> **Novo no doc.** Todo o módulo de Serviço é **independente** dos boards de vendas e protegido por `require_service_access()`. Três routers: `service-boards`, `service-activities`, `service-dashboard`.

### 22.1 Service Boards — `/api/v1/service-boards`

**Boards**

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/service-boards` | Lista boards de serviço (paginado) | Autenticado |
| GET | `/service-boards/{board_id}` | Detalhes do board (com contagens) | Autenticado |
| POST | `/service-boards` | Cria board | `admin`/`manager` |
| PUT | `/service-boards/{board_id}` | Atualiza board | `require_not_viewer` |
| DELETE | `/service-boards/{board_id}` | Deleta board | `require_not_viewer` |
| POST | `/service-boards/{board_id}/duplicate` | Duplica board | `require_not_viewer` |

**Listas**

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/service-boards/{board_id}/lists` | Lista as colunas do board | Autenticado |
| POST | `/service-boards/{board_id}/lists` | Cria lista | `admin`/`manager` |
| PUT | `/service-boards/{board_id}/lists/{list_id}` | Atualiza lista | `require_not_viewer` |
| DELETE | `/service-boards/{board_id}/lists/{list_id}` | Deleta lista | `require_not_viewer` |
| PUT | `/service-boards/{board_id}/lists/{list_id}/move` | Reordena lista | `require_not_viewer` |

**Cartões**

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/service-boards/{board_id}/cards` | Lista cartões (paginado) | Autenticado |
| GET | `/service-boards/{board_id}/cards/{card_id}` | Detalhes do cartão | Autenticado |
| POST | `/service-boards/{board_id}/cards` | Cria cartão | Autenticado |
| PUT | `/service-boards/{board_id}/cards/{card_id}` | Atualiza cartão | Autenticado |
| DELETE | `/service-boards/{board_id}/cards/{card_id}` | Deleta cartão | Autenticado |
| PUT | `/service-boards/{board_id}/cards/{card_id}/move` | Move cartão (lista + posição) | Autenticado |

> O `value` (valor do negócio) é calculado automaticamente: `Σ (quantidade × preço unitário − desconto)` dos produtos do cartão.

**Produtos do Cartão**

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/service-boards/{board_id}/cards/{card_id}/products` | Lista produtos do cartão (resumo/totais) | Autenticado |
| POST | `/service-boards/{board_id}/cards/{card_id}/products` | Adiciona produto | `require_not_viewer` |
| PUT | `/service-boards/{board_id}/cards/{card_id}/products/{item_id}` | Atualiza produto | `require_not_viewer` |
| DELETE | `/service-boards/{board_id}/cards/{card_id}/products/{item_id}` | Remove produto | `require_not_viewer` |

**Atividades / Anotações / Arquivos**

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/service-boards/{board_id}/cards/{card_id}/activities` | Lista atividades do cartão | Autenticado |
| POST | `/service-boards/{board_id}/cards/{card_id}/activities` | Cria atividade/anotação | `require_not_viewer` |
| PUT | `/service-boards/{board_id}/cards/{card_id}/activities/{activity_id}` | Atualiza atividade | `require_not_viewer` |
| PATCH | `/service-boards/{board_id}/cards/{card_id}/activities/{activity_id}/complete` | Marca atividade como concluída/válida | `require_not_viewer` |
| DELETE | `/service-boards/{board_id}/cards/{card_id}/activities/{activity_id}` | Remove atividade | `require_not_viewer` |
| POST | `/service-boards/{board_id}/cards/{card_id}/activities/files` | Upload de arquivo (`multipart/form-data`; query `slot=proposta\|os\|oc`) | `require_not_viewer` |
| GET | `/service-boards/{board_id}/cards/{card_id}/activities/files/{activity_id}/download` | Download de arquivo | Autenticado |

### 22.2 Service Activities — `/api/v1/service-activities`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/service-activities` | Lista atividades de serviço (agregado) | Autenticado |

**Query**: `status` (padrão `"pending"`; `completed`/`all`), `limit` (padrão 2000).

### 22.3 Service Dashboard — `/api/v1/service-dashboard`

| Método | Path | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/service-dashboard` | Métricas do dashboard de serviço no período | Autenticado |

**Query**:
- `start` (ISO date) — início do período.
- `end` (ISO date) — fim do período.
- `board` (opcional) — **`1` = Funil oficial**, **`2` = Cobrança**. Sem o parâmetro, agrega ambos. Valores fora de `SERVICE_RULE_BOARD_IDS` são ignorados.

---

## 23. OUTROS ROUTERS

| Router | Prefixo | Observação |
|--------|---------|------------|
| `card_tasks` | `/api/v1/card-tasks` | Tarefas de cartão |
| `card_notes` | `/api/v1/card-notes` | Anotações de cartão |
| `attachments` | (sem prefixo) | `/cards/{id}/attachments` e `/attachments/{id}` |
| `user_avatar` | (sem prefixo) | `/users/me/avatar` e `/users/{id}/avatar` |
| `integration_clients` | `/api/v1/integration-clients` | Clientes de integração (Client Credentials) |
| `email_templates` | `/api/v1/email-templates` | Templates de e-mail |
| `cadencias` | `/api/v1/cadencias` | Configuração global de cadências |
| `ai` | `/api/v1/ai` | Recursos de IA |

---

**Versão**: v1.7.35 — Junho/2026
**Status**: Sincronizado com o código
