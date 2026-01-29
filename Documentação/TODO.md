# TODO - HSGrowth CRM

## Fase: CardDetails - Página de Detalhes do Card ✅ CONCLUÍDA

### ✅ Concluído

#### Frontend - Layout e Estrutura
- [x] Implementar layout base da página CardDetails (30% esquerda / 70% direita)
- [x] Criar componentes reutilizáveis:
  - [x] ExpandableSection
  - [x] StatusBadge
  - [x] EditableField
  - [x] ActionButton
  - [x] PipelineStages (barra de progresso visual das listas)

#### Frontend - Coluna Esquerda (30%) - COMPLETA
- [x] **Seção Resumo**:
  - [x] Nome do card (editável)
  - [x] Valor (editável com formatação de moeda)
  - [x] **Valor sincronizado automaticamente com total de produtos**
  - [x] **Campo bloqueado quando há produtos (read-only)**
  - [x] Probabilidade de fechamento (%)
  - [x] Data esperada de fechamento
  - [x] Tags (em desenvolvimento)
  - [x] Tempo no funil e data de criação
  - [x] Botões de ação: Ganho/Perdido
  - [x] Dropdown de responsável (role-based)
- [x] **Seção Cliente (Organização)**:
  - [x] **Modal de busca otimizado (carrega uma vez, filtra localmente)**
  - [x] **Busca por nome da empresa, CPF ou CNPJ**
  - [x] **Suporte a pessoa física (CPF - 11 dígitos) e jurídica (CNPJ - 14 dígitos)**
  - [x] **Formatação automática de CPF/CNPJ**
  - [x] Exibição completa de informações do cliente
  - [x] Botões: Ver página completa / Desvincular
- [x] **Seção Informação de Contato (Pessoa)**:
  - [x] **Entrada manual de dados (nome, cargo)**
  - [x] **3 tipos de email** (comercial, pessoal, alternativo)
  - [x] **3 tipos de telefone** (comercial, WhatsApp, alternativo)
  - [x] **Redes sociais** (LinkedIn, Instagram, Facebook)
  - [x] **Formatação automática de telefone brasileiro**
  - [x] Integração com backend (contact_info JSON)
- [x] **Seção Campos Personalizados**:
  - [x] Renderização dinâmica baseada nos campos do board
  - [x] Suporte a tipos: text, number, date, select, checkbox
  - [x] Salvamento automático com debounce
- [x] **Seção Produto** - COMPLETA:
  - [x] **Modal de busca de produtos do catálogo**
  - [x] **Adição de produtos com nome e SKU visíveis**
  - [x] **Edição com confirmação (botões Salvar/Cancelar)**
  - [x] **Desconto em percentual (%) ao invés de valor absoluto**
  - [x] **Cálculo em tempo real durante edição**
  - [x] **Condições de pagamento**:
    - [x] Modal com forma de pagamento (Boleto, Cartão, PIX, etc)
    - [x] Número de parcelas
    - [x] Observações (ex: "primeira parcela em 30 dias")
    - [x] Exibição das condições salvas
  - [x] **Totalizadores**: Subtotal, Desconto Total, Valor Total
  - [x] **Sincronização automática**: valor do card = total de produtos
  - [x] Exclusão de produtos

#### Frontend - Coluna Direita (70%)
- [x] **Sistema de Abas**: Atividade, Anotações, Agendador, Arquivos
- [x] **Aba Atividade**:
  - [x] **QuickActivityForm**: Formulário de criação rápida de atividades
    - [x] Tipos: Ligação, Reunião, Tarefa, Prazo, E-mail, Almoço, Outro
    - [x] Campos: Título, Data, Hora, Duração, Prioridade, Descrição, Local
    - [x] Integração com backend
    - [x] Conversão de timezone (Brasil UTC-3 para UTC)
  - [x] **FocusSection**: Atividades pendentes do card
    - [x] Listagem de tarefas não concluídas
    - [x] Badge de status: Vencido/Hoje/Amanhã/Futuro (com timezone correto)
    - [x] Badge do tipo de atividade (Ligação, Reunião, etc.)
    - [x] Expansão para ver detalhes completos
    - [x] Botões de ação:
      - [x] Marcar como concluído (com loading state)
      - [x] Editar tarefa (formulário inline)
      - [x] Reagendar (modal com date/time picker)
      - [x] Deletar tarefa (com confirmação)
    - [x] Indicadores de prioridade (borda colorida)
    - [x] Exibição de data/hora no horário do Brasil
  - [x] **HistorySection**: Histórico completo de eventos
    - [x] Sub-abas: Todos, Atividades, Anotações, Arquivos, Alterações
    - [x] Timeline de eventos com ícones coloridos
    - [x] Busca e filtros
    - [x] Timestamps relativos (X min atrás, X horas atrás, etc.)
    - [x] Integração com sistema de Activity do backend
- [x] **Aba Anotações**:
  - [x] Interface CRUD para notas (frontend pronto, backend pendente)
  - [x] Editor de texto rico
  - [x] Avatar e timestamps
- [x] **Aba Agendador**:
  - [x] Placeholder profissional "Em Desenvolvimento"
  - [x] Lista de recursos planejados
- [x] **Aba Arquivos**:
  - [x] Placeholder profissional "Em Desenvolvimento"
  - [x] Mockup de drag & drop
  - [x] Lista de tipos de arquivo suportados

#### Frontend - Header do Card
- [x] Título editável inline
- [x] Breadcrumb substituído por **Pipeline Stages**:
  - [x] Visualização de todas as listas do board
  - [x] Indicador visual da lista atual (verde com pulsação)
  - [x] Listas já passadas (azul com checkmark)
  - [x] Listas futuras (cinza)
  - [x] Clique para mover card entre listas
  - [x] Loading state durante movimentação (overlay com spinner)
  - [x] Integração com endpoint `/move`

#### Frontend - Sistema de Timezone
- [x] Criado `utils/timezone.ts` com funções:
  - [x] `convertBrazilToUTC()` - Converte data/hora local para UTC
  - [x] `convertUTCToBrazil()` - Converte UTC para horário do Brasil
  - [x] `formatBrazilDate()` - Formata data no padrão brasileiro
  - [x] `extractBrazilDateForInput()` - Extrai data para input[type="date"]
  - [x] `extractBrazilTimeForInput()` - Extrai hora para input[type="time"]
  - [x] `getActivityStatusBrazil()` - Calcula status com timezone correto
- [x] Aplicado em QuickActivityForm (criação de atividades)
- [x] Aplicado em FocusSection (exibição e edição de atividades)
- [x] Aplicado em HistorySection (timestamps do histórico)

#### Backend - Modelos e Repositórios
- [x] Modelo `CardTask` (Tarefas/Atividades)
  - [x] Campos: title, description, task_type, priority, due_date, duration_minutes
  - [x] Status: is_completed, completed_at
  - [x] Localização: location, video_link, notes, contact_name
- [x] Modelo `Activity` (Histórico/Timeline)
  - [x] Campos: activity_type, description, activity_metadata
  - [x] Relacionamentos com Card e User
- [x] Modelo `Product` e `CardProduct`
  - [x] Catálogo de produtos
  - [x] Associação de produtos a cards com quantidade e desconto
  - [x] **Propriedades calculadas: subtotal e total**
  - [x] **Correção de tipo float/Decimal para evitar erros**
- [x] Modelo `Card` - Expansões
  - [x] **Campo payment_info (JSON) para condições de pagamento**
  - [x] Schema PaymentInfo com validações
- [x] Repository `CardTaskRepository`
  - [x] CRUD completo de tarefas
  - [x] Filtros: por card, por tipo, por status, por data
  - [x] Métodos: get_pending_by_card, get_overdue_tasks, mark_as_completed
- [x] Repository `ActivityRepository`
  - [x] Criação de eventos no histórico
  - [x] Busca por card, por tipo, por usuário
- [x] Repository `ProductRepository`
  - [x] CRUD de produtos do catálogo
  - [x] Busca por SKU
  - [x] Listagem com filtros e paginação
  - [x] **Associação de produtos a cards (CardProduct)**
  - [x] **Cálculo de totais (subtotal, desconto, total)**
  - [x] **Retorno de product_name e product_sku em CardProduct**

#### Backend - Services
- [x] `CardTaskService`:
  - [x] Lógica de negócio para tarefas
  - [x] Validações e permissões
  - [x] **Integração com sistema de histórico**:
    - [x] Registra "task_created" ao criar tarefa
    - [x] Registra "task_completed" ao completar tarefa
    - [x] Registra "task_edited" ao editar tarefa
    - [x] Registra "task_deleted" ao deletar tarefa
    - [x] Registra "task_reopened" ao reabrir tarefa
- [x] `CardService`:
  - [x] Endpoint `/cards/{id}/expanded` (renomeado de with-relations)
  - [x] Retorna: card, custom_fields, pending_tasks, products, **payment_info**, recent_activities (últimas 50)
  - [x] Integração com ActivityRepository
  - [x] **Retorna product_sku nos produtos do card**
- [x] `ProductService`:
  - [x] CRUD completo de produtos do catálogo
  - [x] Adicionar/Remover/Atualizar produtos em cards
  - [x] **Sincronização automática do valor do card com total de produtos**
  - [x] **Método _sync_card_value_with_products() chamado automaticamente**

#### Backend - Endpoints (API)
- [x] **CardTask Endpoints** (`/api/v1/card-tasks`):
  - [x] POST `/` - Criar tarefa
  - [x] GET `/` - Listar tarefas com filtros
  - [x] GET `/{task_id}` - Buscar tarefa por ID
  - [x] PUT `/{task_id}` - Atualizar tarefa
  - [x] PATCH `/{task_id}/complete` - Marcar como concluída/pendente
  - [x] DELETE `/{task_id}` - Deletar tarefa
  - [x] GET `/overdue` - Buscar tarefas atrasadas
  - [x] GET `/card/{card_id}/pending` - Tarefas pendentes de um card
  - [x] GET `/card/{card_id}/counts` - Contadores de tarefas
- [x] **Product Endpoints** (`/api/v1/products`):
  - [x] GET `/` - Listar produtos com filtros e paginação
  - [x] GET `/{id}` - Buscar produto por ID
  - [x] POST `/` - Criar novo produto
  - [x] PUT `/{id}` - Atualizar produto
  - [x] DELETE `/{id}` - Deletar produto (soft delete)
  - [x] POST `/cards/{card_id}/products` - Adicionar produto ao card
  - [x] PUT `/card-products/{id}` - Atualizar produto do card
  - [x] DELETE `/card-products/{id}` - Remover produto do card
  - [x] GET `/cards/{card_id}/products` - Listar produtos de um card com totais
- [x] **Card Endpoints** (expansão):
  - [x] GET `/cards/{id}/expanded` - Retorna card com todos os relacionamentos
  - [x] PUT `/cards/{id}` - Atualiza card (suporta payment_info)

#### Backend - Migrations
- [x] Migration para tabela `card_tasks`
- [x] Migration para tabela `products`
- [x] Migration para tabela `card_products`
- [x] **Migration para campo `payment_info` em cards**
- [x] **Migration para tabela `gamification_action_points`**
- [x] Correção de migrations duplicadas

---

## Fase: Produtos - Gerenciamento de Catálogo ✅ CONCLUÍDA

### ✅ Concluído

#### Frontend - Página Produtos
- [x] **Página completa de gerenciamento** (`/products`):
  - [x] Tabela com colunas: Produto (nome + SKU), Categoria, Preço, Status, Data de Criação, Ações
  - [x] **Busca por nome ou SKU**
  - [x] **Filtros**: Status (ativo/inativo), Categoria
  - [x] **Paginação** completa
  - [x] **Modal de criar/editar produto**:
    - [x] Campos: Nome*, Descrição, SKU, Preço Unitário*, Moeda (BRL/USD/EUR), Categoria, Ativo
    - [x] Validações de campos obrigatórios
    - [x] Formatação de preço
  - [x] **Ações**: Editar, Ativar/Desativar, Deletar
  - [x] **Estatísticas**: Total de produtos, Ativos, Inativos
  - [x] **Tema escuro** consistente com o resto do sistema

#### Backend - Produtos
- [x] Modelo `Product` completo
- [x] Repository e Service implementados
- [x] Endpoints CRUD funcionais
- [x] Soft delete implementado
- [x] Validações de SKU único

---

## Configurações - Gamificação ✅ CORRIGIDO

### ✅ Concluído

#### Aba Pontos (Admin)
- [x] **CORREÇÃO**: Criada tabela `gamification_action_points` que estava faltando
- [x] Migration com dados padrão (10 tipos de ação)
- [x] Interface funcionando:
  - [x] Edição de pontos por ação
  - [x] Ativar/Desativar ações
  - [x] Estatísticas (Total, Ativas, Média)
  - [x] Descrição de cada ação
- [x] Valores padrão inseridos:
  - [x] card_created: 5 pts
  - [x] card_won: 50 pts
  - [x] card_lost: -5 pts
  - [x] task_completed: 10 pts
  - [x] E mais 6 tipos de ação

---

### 📋 Pendente

#### Frontend - Melhorias e Ajustes
- [ ] Auto-save em campos editáveis (com debounce e feedback visual)
- [ ] Loading states em mais operações
- [ ] Tratamento de erros mais robusto (toasts/notifications em vez de alerts)
- [ ] Validação de formulários mais completa
- [ ] Responsividade mobile
- [ ] Testes unitários dos componentes

#### Backend - Anotações (Notes)
- [ ] Criar modelo `Note`
- [ ] Criar repository `NoteRepository`
- [ ] Criar service `NoteService`
- [ ] Criar endpoints CRUD para notas
- [ ] Integrar com sistema de histórico (registrar note_added)
- [ ] Conectar frontend `NotesSection` com backend

#### Backend - Arquivos (Files)
- [ ] Criar modelo `Attachment`
- [ ] Criar repository `AttachmentRepository`
- [ ] Criar service `AttachmentService` com upload
- [ ] Criar endpoints para upload/download/listagem
- [ ] Integração com S3 ou storage local
- [ ] Integrar com sistema de histórico (registrar file_attached)
- [ ] Conectar frontend `FilesSection` com backend

#### Backend - Agendador (Scheduler)
- [ ] Planejamento da arquitetura
- [ ] Integração com Google Calendar
- [ ] Integração com Microsoft Teams/Outlook
- [ ] Sistema de lembretes e notificações
- [ ] Conectar frontend `SchedulerSection` com backend

#### Backend - Permissões e Segurança
- [ ] Implementar verificações de permissão em `CardTaskService`
  - [ ] Apenas responsável ou admin pode editar tarefa
  - [ ] Apenas responsável ou admin pode deletar tarefa
- [ ] Implementar verificações de permissão em `CardService`
  - [ ] Controle de acesso a cards por board/time
- [ ] Auditoria completa de ações sensíveis

#### Backend - Gamificação
- [ ] Dar pontos ao completar tarefas
- [ ] Dar pontos ao fechar deals
- [ ] Sistema de conquistas relacionado a atividades

#### Backend - Notificações
- [ ] Notificar quando tarefa é atribuída
- [ ] Notificar quando tarefa está próxima do vencimento
- [ ] Notificar quando card é movido
- [ ] Notificar quando produto é adicionado/removido

#### Geral - Otimizações
- [ ] Paginação no histórico (scroll infinito)
- [ ] Cache de dados frequentemente acessados
- [ ] Otimização de queries N+1
- [ ] Compressão de respostas API
- [ ] Rate limiting

---

### 🐛 Bugs Conhecidos

**Nenhum bug crítico no momento!** 🎉

---

### 📝 Notas Técnicas

#### Sistema de Timezone
- **Padrão adotado**: Banco de dados armazena tudo em UTC
- **Frontend**: Converte para UTC-3 (Brasil) ao exibir e ao enviar
- **Funções utilitárias**: `utils/timezone.ts` centraliza toda lógica de conversão

#### Sistema de Histórico (Activity)
- **Modelo**: `Activity` registra todos os eventos importantes
- **Tipos de eventos implementados**:
  - `task_created`, `task_completed`, `task_edited`, `task_deleted`, `task_reopened`
  - `stage_moved`, `value_changed`, `product_added`, `product_removed`
  - `assigned_changed`, `organization_changed`, etc.
- **Metadados**: Cada evento pode ter JSON com informações adicionais
- **Integração**: Services registram eventos automaticamente nas operações

#### Arquitetura de Componentes
- **Componentes reutilizáveis**: Localizados em `components/cardDetails/`
- **Exportação centralizada**: `components/cardDetails/index.ts`
- **Props tipadas**: Todos os componentes usam TypeScript com interfaces
- **Estado local**: Uso de `useState` para estado interno dos componentes
- **Comunicação com parent**: Callbacks via props (`onUpdate`, `onSave`, etc.)

---

### 🎯 Próximos Passos (Ordem de Prioridade)

1. Melhorar tratamento de erros no frontend (substituir alerts por toasts/notifications)
2. Implementar auto-save com debounce nos campos editáveis
3. Implementar backend de Anotações (Notes) - frontend já está pronto
4. Implementar sistema de Arquivos (upload/download)
5. Implementar sistema de Agendador (calendário integrado)
6. Adicionar testes unitários nos componentes principais
7. Implementar sistema de permissões mais robusto
8. Otimizações de performance (queries N+1, cache, paginação)

---

## Outras Fases (Não Iniciadas)

### Dashboard
- [ ] Implementar widgets de métricas
- [ ] Implementar gráficos de desempenho
- [ ] Implementar filtros de período

### Relatórios
- [ ] Relatório de vendas por período
- [ ] Relatório de funil de vendas
- [ ] Relatório de desempenho individual
- [ ] Exportação em PDF/Excel

### Automações
- [ ] Interface de criação de automações
- [ ] Triggers e ações configuráveis
- [ ] Logs de execução de automações

### Integrações
- [ ] WhatsApp Business API
- [ ] E-mail (Gmail, Outlook)
- [ ] Calendário (Google Calendar, Outlook)
- [ ] Ferramentas de videoconferência

---

**Última atualização**: 28/01/2026 15:10
**Responsável**: Erick (Cientista de Dados / Full Stack)

## 📊 Resumo de Progresso

### Fases Concluídas
- ✅ **CardDetails** - Página completa de detalhes do negócio
- ✅ **Produtos** - Gerenciamento de catálogo de produtos
- ✅ **Configurações/Pontos** - Sistema de gamificação funcional

### Funcionalidades Principais Implementadas
1. Sistema completo de gerenciamento de negócios (cards)
2. Histórico e timeline de atividades
3. Tarefas/Atividades com timezone correto (Brasil UTC-3)
4. Produtos com cálculo automático de valores
5. Condições de pagamento
6. Busca de clientes por CPF/CNPJ
7. Campos personalizados dinâmicos
8. Sistema de gamificação (badges e pontos)

### Estatísticas
- **Modelos do banco**: 15+
- **Endpoints da API**: 50+
- **Componentes React**: 30+
- **Migrations**: 20+
