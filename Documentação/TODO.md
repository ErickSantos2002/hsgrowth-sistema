# TODO - HSGrowth CRM

**Última atualização**: 03/03/2026 (v1.3.7)
**Responsável**: Erick (Cientista de Dados / Full Stack)

---

## ✅ Módulos Concluídos e em Produção

- ✅ **Autenticação e Autorização**
- ✅ **Boards (Kanban)** — incluindo filtros por lista, status, vendedor, SDR, valor e data de criação
- ✅ **Cards (Negócios)** — CRUD completo, CardDetails com todas as abas
- ✅ **Clientes (Organizações)** — CRUD completo
- ✅ **Pessoas (Contatos)** — CRUD completo
- ✅ **Produtos** — Catálogo e vinculação a cards
- ✅ **Usuários e Roles** — Admin, Manager, Salesperson, SDR
- ✅ **Sistema de Atividades/Tarefas**
- ✅ **Sistema de Gamificação** — Pontos, badges, ranking
- ✅ **Sistema de Logs de Auditoria**
- ✅ **Sistema de SDR** — Campo sdr_id + rodízio automático
- ✅ **Sistema de Automações** — Editor visual, triggers, actions, histórico
- ✅ **Integração API4COM (VOIP)** — Configuração de ramais e botão "Ligar"
- ✅ **Importação de Dados (Pipedrive)**
- ✅ **Busca Global (Ctrl+K)**
- ✅ **Página de Documentação da API (/api-docs)**
- ✅ **Sistema de Anotações (Notes)** — Com suporte a imagens coladas
- ✅ **Sistema de Arquivos (Attachments/Upload)** — Drag & drop, preview, download
- ✅ **Calendário Global (/calendar)** — v1.3.4
- ✅ **Tratamento de Erros** — ConfirmContext + showError() em ~37 locais (v1.3.5)
- ✅ **Relatórios** — Custom reports builder + relatórios de vendas/conversão/transferências com dados reais do banco
- ✅ **Gamificação — Histórico de pontos** — Endpoints GET /points/me (próprio), GET /points (equipe, admin/manager), GET /points/users/{id} (usuário específico); aba "Histórico" contextual com coluna "Usuário" para visão de equipe; `require_manager_or_admin` em deps.py (v1.3.7)

---

## 📋 Pendências

### 🟡 Média Prioridade

#### Backend — Permissões
- [x] `CardTaskService`: apenas responsável ou admin pode editar/deletar tarefa
- [ ] `CardService`: controle de acesso a cards por board/time (se necessário)

#### Backend — Notificações automáticas
- [x] Notificar quando tarefa é atribuída a um usuário (TODO no `card_task_service.py` linha 91)
- [x] Notificar quando tarefa está próxima do vencimento
- [x] Notificar quando produto é adicionado/removido de um card
- [x] Notificar quando card é movido entre boards — já implementado no `card_service.py`

#### Backend — Redis Session Management
- [ ] `SessionManager` em `core/redis_sessions.py` (create, update, get_active, remove)
- [ ] Endpoint `GET /api/v1/users/active` (admin only) — lista usuários online
- [ ] Endpoints `GET/PUT /api/v1/users/me/notification-settings`
- [ ] Middleware para atualizar `last_activity` em cada request

#### Frontend — Melhorias
- [ ] Auto-save com debounce (500ms) nos campos editáveis do CardDetails
- [ ] Validação de formulários mais completa em modais de criação

### 🟢 Baixa Prioridade / Opcional

- [ ] Integração com Google Calendar (opcional)
- [ ] Integração com Microsoft Teams/Outlook (opcional)
- [ ] Responsividade mobile — revisar todas as páginas
- [ ] Gráficos com Recharts nos relatórios (aguarda backend)
- [ ] Exportação Excel/PDF nos relatórios (aguarda backend)
- [ ] Paginação no histórico de atividades do card (scroll infinito)
- [ ] Cache de dados frequentemente acessados
- [ ] Compressão de respostas API
- [ ] Testes unitários (frontend e backend)
- [ ] Webhooks externos como triggers de automação
- [ ] Sistema de condições avançadas nas automações (if/else)
- [ ] Notificações de conquistas de gamificação em tempo real

---

## 🐛 Bugs Conhecidos

- [ ] **Bug na configuração de pontos** — comportamento incorreto ao salvar configurações de pontos por ação (reportado, não investigado ainda)

---

## 📝 Notas Técnicas

### Sistema de Timezone
- **Padrão adotado**: Banco de dados armazena tudo em UTC
- **Frontend**: Converte para UTC-3 (Brasil) ao exibir e ao enviar
- **Funções utilitárias**: `utils/timezone.ts` centraliza toda lógica de conversão

### Sistema de Histórico (Activity)
- **Modelo**: `Activity` registra todos os eventos importantes
- **Tipos de eventos implementados**: `task_created`, `task_completed`, `task_edited`, `task_deleted`, `task_reopened`, `stage_moved`, `value_changed`, `product_added`, `product_removed`, `assigned_changed`, `organization_changed`, etc.
- **Integração**: Services registram eventos automaticamente nas operações

### Kanban — Filtros
- Filtros implementados: lista, status (aberto/ganho/perdido), vendedor, SDR, valor (faixas) e data de criação
- O filtro de "data" filtra por `created_at` (data de criação do card), não por `due_date` — comportamento intencional
- Permissões automáticas: salesperson vê apenas seus próprios cards; SDR vê apenas cards onde é SDR

### Automações — Arquitetura
- Triggers integrados: `card_created`, `card_moved`, `card_won`, `card_lost`, `card_assigned`, `field_changed`
- Triggers agendados: APScheduler + Celery (verificação a cada 1 minuto)
- Actions implementadas: `move_card`, `assign_card`, `assign_round_robin`, `assign_sdr_round_robin`, `mark_won`, `mark_lost`, `update_client_field`, `send_notification`, `award_points`, `update_field`
- Estado persistente no banco para rodízio (round-robin)

### Arquitetura de Componentes
- **Componentes reutilizáveis**: `components/cardDetails/`, `components/common/`, `components/layout/`
- **Contextos globais**: `AuthContext`, `DashboardContext`, `ConfirmContext`
- **Tratamento de erros**: `useConfirm()` para modais de confirmação; `showError()` / `showSuccess()` para toasts

---

## 🎉 Marcos Alcançados

- ✅ **v1.0.0** (29/01/2026) - Primeira versão em produção
- ✅ **v1.1.0** (04/02/2026) - Sistema de Logs de Auditoria
- ✅ **v1.1.1** (05/02/2026) - Filtros e importação de deals
- ✅ **v1.1.2** (06/02/2026) - Documentação customizada da API
- ✅ **v1.1.3** (09/02/2026) - Sistema de SDR e Rodízio
- ✅ **v1.1.4** (10/02/2026) - Melhorias de UX e permissões
- ✅ **v1.1.5** (10/02/2026) - Edição inline e simplificações
- ✅ **v1.3.4** (02/03/2026) - Calendário Global de Atividades
- ✅ **v1.3.5** (03/03/2026) - Automações completas + Tratamento de erros unificado
- ✅ **v1.3.6** (03/03/2026) - Histórico de pontos de gamificação
- ✅ **v1.3.7** (03/03/2026) - Histórico contextual por perfil + fix require_manager_or_admin

---

### Estatísticas do Projeto
- **Endpoints da API**: ~149
- **Schemas Pydantic**: ~146
- **Páginas React**: 21+
- **Componentes React**: 100+
- **Modelos do banco**: 25+
- **Migrations**: 40+
- **Linhas de código (Backend)**: ~15.000+
- **Linhas de código (Frontend)**: ~21.000+

---

**Projeto em produção desde 29/01/2026**
**Status geral**: Sistema maduro e funcional — todos os módulos core implementados
