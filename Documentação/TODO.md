# TODO - HSGrowth CRM

**Última atualização**: 12/03/2026 (v1.5.0)
**Responsável**: Erick (Cientista de Dados / Full Stack)

---

## ✅ Módulos Concluídos e em Produção

- ✅ **Autenticação e Autorização**
- ✅ **Boards (Kanban)** — incluindo filtros por lista, status, vendedor, SDR, valor e data de fechamento (com período personalizado)
- ✅ **Cards (Negócios)** — CRUD completo, CardDetails com todas as abas
- ✅ **Clientes (Organizações)** — CRUD completo
- ✅ **Pessoas (Contatos)** — CRUD completo
- ✅ **Produtos** — Catálogo e vinculação a cards
- ✅ **Usuários e Roles** — Admin, Manager, Salesperson, SDR, Viewer (somente leitura)
- ✅ **Página de Atividades** — Listagem centralizada com filtros, paginação e FocusMode (v1.5.0)
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
- [x] `CardService`: controle de acesso a cards por board/time — corrigido em `assign_card`, `add_or_update_field_value`, `link_person_to_card` e `unlink_person_from_card` (passavam `get_card_by_id` sem `current_user`, permitindo que salesperson acessasse cards de outros vendedores) (v1.3.10)

#### Backend — Notificações automáticas
- [x] Notificar quando tarefa é atribuída a um usuário (TODO no `card_task_service.py` linha 91)
- [x] Notificar quando tarefa está próxima do vencimento
- [x] Notificar quando produto é adicionado/removido de um card
- [x] Notificar quando card é movido entre boards — já implementado no `card_service.py`

#### Backend — Redis Session Management
- [x] `SessionManager` em `core/redis_sessions.py` (create, update, get_active, remove) — v1.3.11
- [x] Endpoint `GET /api/v1/users/online` (admin/manager) — lista usuários online — v1.3.11
- [x] Endpoints `GET/PUT /api/v1/users/me/notification-settings` — v1.3.11
- [x] Middleware para atualizar `last_activity` em cada request — v1.3.11

#### Frontend — Melhorias
- [x] Auto-save com debounce (800ms) nos campos editáveis do CardDetails — implementado em `EditableField.tsx` (v1.3.10)
- [x] Validação de formulários mais completa em modais de criação — erros inline por campo em ClientModal, PersonModal e UserModal (v1.5.0)

### 🟢 Baixa Prioridade / Opcional

- [ ] Integração com Google Calendar (opcional)
- [ ] Integração com Microsoft Teams/Outlook (opcional)
- [x] Responsividade mobile — revisão concluída
- [x] Gráficos com Recharts nos relatórios — implementado no ChartWidget.tsx (bar, line, pie, table) com multi-série e drill-down
- [x] Exportação Excel/PDF nos relatórios — endpoint GET /reports/custom/{id}/export retorna .xlsx ou .csv; botão de download nos cards da listagem (v1.5.1)
- [ ] Paginação no histórico de atividades do card (scroll infinito)
- [ ] Cache de dados frequentemente acessados
- [ ] Compressão de respostas API
- [x] Testes unitários (frontend e backend) — concluídos
- [ ] Webhooks externos como triggers de automação
- [ ] Sistema de condições avançadas nas automações (if/else)
- [ ] Notificações de conquistas de gamificação em tempo real

---

## 🐛 Bugs Conhecidos

- [ ] **Bug na configuração de pontos** — comportamento incorreto ao salvar configurações de pontos por ação (aguardando priorização — não será trabalhado no momento)

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
- Filtros implementados: lista, status (aberto/ganho/perdido), vendedor, SDR, valor (faixas) e data de fechamento (com período personalizado)
- O filtro de "data" filtra por `closed_at` (data de fechamento do card) — só exibe cards que foram fechados (ganhos ou perdidos)
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
- ✅ **v1.3.8** (04/03/2026) - Drill-down em relatórios
- ✅ **v1.3.9** (04/03/2026) - Role "Visualizador" (somente leitura)
- ✅ **v1.3.10** (05/03/2026) - Auto-save com debounce nos cards + filtro por data de fechamento no Kanban
- ✅ **v1.3.11** (05/03/2026) - Redis Session Management: sessões em tempo real, blacklist de tokens, usuários online, notification settings
- ✅ **v1.5.0** (12/03/2026) - Página de Atividades com filtros, paginação, FocusMode e validação inline nos modais
- ✅ **v1.5.1** (12/03/2026) - Exportação de relatórios customizados em Excel e CSV

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
