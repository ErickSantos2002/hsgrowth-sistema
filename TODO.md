# TODO - HSGrowth CRM

## Fase: CardDetails - Página de Detalhes do Card

### ✅ Concluído

#### Frontend - Layout e Estrutura
- [x] Implementar layout base da página CardDetails (30% esquerda / 70% direita)
- [x] Criar componentes reutilizáveis:
  - [x] ExpandableSection
  - [x] StatusBadge
  - [x] EditableField
  - [x] ActionButton
  - [x] PipelineStages (barra de progresso visual das listas)

#### Frontend - Coluna Esquerda (30%)
- [x] **Seção Resumo**:
  - [x] Nome do card (editável)
  - [x] Valor (editável com formatação de moeda)
  - [x] Botões de ação: Ganho/Perdido
  - [x] Dropdown de responsável (role-based: admin/manager podem alterar, vendedor apenas visualiza)
- [x] **Seção Cliente (Organização)**:
  - [x] Busca e seleção de clientes existentes
  - [x] Exibição de informações do cliente
  - [x] Link para editar cliente
- [x] **Seção Informação de Contato (Pessoa)**:
  - [x] Campos editáveis: Nome, Email, Telefone
  - [x] Integração com backend
- [x] **Seção Campos Personalizados**:
  - [x] Renderização dinâmica baseada nos campos do board
  - [x] Suporte a tipos: text, number, date, select, checkbox
  - [x] Salvamento automático com debounce
- [x] **Seção Produto**:
  - [x] Adição de produtos com busca
  - [x] Quantidade e desconto personalizados
  - [x] Cálculo automático de subtotais e total geral
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
- [x] Repository `CardTaskRepository`
  - [x] CRUD completo de tarefas
  - [x] Filtros: por card, por tipo, por status, por data
  - [x] Métodos: get_pending_by_card, get_overdue_tasks, mark_as_completed
- [x] Repository `ActivityRepository`
  - [x] Criação de eventos no histórico
  - [x] Busca por card, por tipo, por usuário
- [x] Repository `ProductRepository` e `CardProductRepository`
  - [x] CRUD de produtos e associações
  - [x] Cálculo de totais

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
  - [x] Endpoint `/cards/{id}/with-relations` expandido
  - [x] Retorna: card, custom_fields, pending_tasks, products, **recent_activities (últimas 50)**
  - [x] Integração com ActivityRepository

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
  - [x] CRUD completo de produtos
  - [x] Associação de produtos a cards
  - [x] Cálculo de totais
- [x] **Card Endpoints** (expansão):
  - [x] GET `/cards/{id}/with-relations` - Retorna card com todos os relacionamentos

#### Backend - Migrations
- [x] Migration para tabela `card_tasks`
- [x] Migration para tabela `products`
- [x] Migration para tabela `card_products`
- [x] Correção de migrations duplicadas

---

### ⏳ Em Andamento

#### Backend - Sistema de Histórico
- [ ] **PROBLEMA ATUAL**: Backend não está inicializando após implementação do histórico
  - **Causa**: Erro de migrations após rebuild do container
  - **Status**: Container em loop de restart
  - **Próximo passo**: Resolver problema de inicialização do container

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

1. **[CRÍTICO]** Backend não está inicializando após implementação do histórico
   - Container em loop de restart
   - Problema com migrations do Alembic
   - Precisa resolver antes de continuar

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

1. **[URGENTE]** Resolver problema de inicialização do backend
2. Implementar backend de Anotações (Notes)
3. Melhorar tratamento de erros no frontend (substituir alerts por toasts)
4. Implementar auto-save com debounce
5. Adicionar testes unitários nos componentes principais
6. Implementar sistema de permissões robusto
7. Planejar e implementar sistema de Arquivos
8. Planejar e implementar sistema de Agendador

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

**Última atualização**: 27/01/2026 15:30
**Responsável**: Erick (Cientista de Dados / Full Stack)
