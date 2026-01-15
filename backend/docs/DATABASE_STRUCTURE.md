# Estrutura do Banco de Dados - HSGrowth

**Banco**: PostgreSQL
**Nome**: hsgrowth
**Data da última verificação**: 2026-01-15

## Tabelas

### clients
Tabela de clientes/empresas do sistema.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | integer | NO | nextval('clients_id_seq') | ID primário |
| name | varchar | NO | - | Nome do contato |
| email | varchar | YES | - | Email do cliente |
| phone | varchar | YES | - | Telefone |
| company_name | varchar | YES | - | Razão social |
| document | varchar | YES | - | CPF ou CNPJ |
| address | text | YES | - | Endereço completo |
| city | varchar | YES | - | Cidade |
| state | varchar | YES | - | UF (2 caracteres) |
| country | varchar | YES | - | País |
| website | varchar | YES | - | Website |
| notes | text | YES | - | Observações |
| source | varchar | YES | - | Origem (pipedrive, manual, etc) |
| is_active | boolean | NO | - | Status ativo/inativo |
| created_at | timestamp | NO | - | Data de criação |
| updated_at | timestamp | NO | - | Data de atualização |
| deleted_at | timestamp | YES | - | Data de soft delete |
| is_deleted | boolean | NO | - | Flag de soft delete |

**Índices:**
- PRIMARY KEY (id)
- INDEX ix_clients_name
- INDEX ix_clients_email
- INDEX ix_clients_document

**Relacionamentos:**
- clients -> cards (1:N) - Um cliente pode ter vários cards

---

### users
Tabela de usuários do sistema.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| email | varchar | NO | Email (único) |
| username | varchar | YES | Nome de usuário (único) |
| name | varchar | NO | Nome completo |
| password_hash | varchar | NO | Senha criptografada |
| avatar_url | varchar | YES | URL do avatar |
| phone | varchar | YES | Telefone |
| role_id | integer | NO | FK para roles |
| is_active | boolean | NO | Status ativo/inativo |
| last_login_at | timestamp | YES | Último login |
| reset_token | varchar | YES | Token para reset de senha |
| reset_token_expires_at | timestamp | YES | Expiração do token |
| created_at | timestamp | NO | Data de criação |
| updated_at | timestamp | NO | Data de atualização |
| deleted_at | timestamp | YES | Data de soft delete |
| is_deleted | boolean | NO | Flag de soft delete |

---

### boards
Tabela de quadros Kanban.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| name | varchar | NO | Nome do quadro |
| description | text | YES | Descrição |
| color | varchar | YES | Cor hexadecimal |
| icon | varchar | YES | Nome do ícone (Lucide) |
| settings | json | NO | Configurações do quadro |
| created_at | timestamp | NO | Data de criação |
| updated_at | timestamp | NO | Data de atualização |
| deleted_at | timestamp | YES | Data de soft delete |
| is_deleted | boolean | NO | Flag de soft delete |

---

### lists
Tabela de listas (colunas do Kanban).

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| board_id | integer | NO | FK para boards |
| name | varchar | NO | Nome da lista |
| position | numeric | NO | Posição no quadro |
| color | varchar | YES | Cor da lista |
| is_archived | boolean | NO | Lista arquivada? |
| created_at | timestamp | NO | Data de criação |
| updated_at | timestamp | NO | Data de atualização |
| deleted_at | timestamp | YES | Data de soft delete |
| is_deleted | boolean | NO | Flag de soft delete |

---

### cards
Tabela de cartões (leads/negócios).

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| list_id | integer | NO | FK para lists |
| client_id | integer | YES | FK para clients |
| assigned_to_id | integer | YES | FK para users (responsável) |
| title | varchar | NO | Título do card |
| description | text | YES | Descrição |
| position | numeric | NO | Posição na lista |
| value | numeric | YES | Valor monetário |
| currency | varchar | NO | Moeda (BRL, USD, EUR) |
| due_date | timestamp | YES | Data de vencimento |
| closed_at | timestamp | YES | Data de fechamento |
| is_won | integer | NO | Status: 0=aberto, 1=ganho, -1=perdido |
| contact_info | json | YES | Informações de contato |
| created_at | timestamp | NO | Data de criação |
| updated_at | timestamp | NO | Data de atualização |
| deleted_at | timestamp | YES | Data de soft delete |
| is_deleted | boolean | NO | Flag de soft delete |

---

### roles
Tabela de papéis/funções dos usuários.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| name | varchar | NO | Nome técnico (admin, manager, salesperson) |
| display_name | varchar | NO | Nome de exibição |
| permissions | json | NO | Permissões do role |
| created_at | timestamp | NO | Data de criação |
| updated_at | timestamp | NO | Data de atualização |

---

### activities
Tabela de atividades/histórico.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| card_id | integer | YES | FK para cards |
| user_id | integer | YES | FK para users (quem fez a ação) |
| action_type | varchar | NO | Tipo de ação |
| description | text | NO | Descrição da atividade |
| metadata | json | YES | Dados adicionais |
| created_at | timestamp | NO | Data da atividade |

---

### automations
Tabela de automações.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| name | varchar | NO | Nome da automação |
| description | text | YES | Descrição |
| trigger_type | varchar | NO | Tipo de gatilho |
| trigger_config | json | NO | Configuração do gatilho |
| action_type | varchar | NO | Tipo de ação |
| action_config | json | NO | Configuração da ação |
| is_active | boolean | NO | Automação ativa? |
| created_at | timestamp | NO | Data de criação |
| updated_at | timestamp | NO | Data de atualização |
| deleted_at | timestamp | YES | Data de soft delete |
| is_deleted | boolean | NO | Flag de soft delete |

---

### notifications
Tabela de notificações.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| user_id | integer | NO | FK para users (destinatário) |
| type | varchar | NO | Tipo de notificação |
| title | varchar | NO | Título |
| message | text | NO | Mensagem |
| data | json | YES | Dados adicionais |
| is_read | boolean | NO | Lida? |
| read_at | timestamp | YES | Data de leitura |
| created_at | timestamp | NO | Data de criação |

---

### gamification_points
Tabela de pontos de gamificação.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| user_id | integer | NO | FK para users |
| points | integer | NO | Quantidade de pontos |
| reason | varchar | NO | Motivo dos pontos |
| reference_type | varchar | YES | Tipo de referência (card, board, etc) |
| reference_id | integer | YES | ID da referência |
| created_at | timestamp | NO | Data de ganho |

---

### gamification_badges
Tabela de badges/conquistas.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| name | varchar | NO | Nome do badge |
| description | text | YES | Descrição |
| icon | varchar | YES | Ícone do badge |
| requirement_type | varchar | NO | Tipo de requisito |
| requirement_value | integer | NO | Valor necessário |
| created_at | timestamp | NO | Data de criação |

---

### gamification_rankings
Tabela de ranking de usuários.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| user_id | integer | NO | FK para users |
| period | varchar | NO | Período (monthly, weekly, etc) |
| period_start | date | NO | Início do período |
| period_end | date | NO | Fim do período |
| total_points | integer | NO | Total de pontos |
| rank_position | integer | NO | Posição no ranking |
| created_at | timestamp | NO | Data de criação |
| updated_at | timestamp | NO | Data de atualização |

---

### card_transfers
Tabela de transferências de cards entre usuários.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | integer | NO | ID primário |
| card_id | integer | NO | FK para cards |
| from_user_id | integer | NO | FK para users (origem) |
| to_user_id | integer | NO | FK para users (destino) |
| reason | text | YES | Motivo da transferência |
| status | varchar | NO | Status (pending, approved, rejected) |
| created_at | timestamp | NO | Data de criação |
| processed_at | timestamp | YES | Data de processamento |

---

## Observações Importantes

1. **Soft Delete**: Todas as tabelas principais usam soft delete (deleted_at, is_deleted)
2. **Timestamps**: Todas as tabelas têm created_at e updated_at automáticos
3. **Sem account_id**: A tabela clients NÃO possui campo account_id (foi removido em atualizações anteriores)
4. **Relacionamentos**:
   - users -> cards (responsável)
   - clients -> cards (cliente do card)
   - boards -> lists -> cards (estrutura Kanban)
5. **JSON Fields**: Várias tabelas usam campos JSON para flexibilidade (settings, permissions, metadata, etc)
