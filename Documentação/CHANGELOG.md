# Changelog - HSGrowth CRM

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.7.27] - 2026-05-05

### Adicionado
- **Reunião Teams — reagendamento automático:** ao alterar a data/hora de uma tarefa do tipo Reunião que já possui evento criado no Outlook, o evento no calendário é atualizado automaticamente via Microsoft Graph API. O campo `teams_event_id` foi adicionado para rastrear o evento do calendário separadamente do ID da reunião Teams.

### Melhorado
- **Permissão de tarefas:** o SDR responsável pelo card agora pode editar, reagendar e concluir qualquer tarefa desse card, mesmo que não tenha sido ele que a criou.

---

## [1.7.22] - 2026-04-27

### Melhorado
- **Cliente — CNAE:** campo agora aceita texto livre (ex: `11.22-4-01`). A máscara que bloqueava letras e limitava a 10 caracteres foi removida.
- **Vincular cliente — busca por CNPJ:** digitar o CNPJ com pontos e barras (ex: `08.857`) agora encontra o cliente normalmente. Antes só funcionava sem formatação.

---

## [1.7.20] - 2026-04-24

### Adicionado
- **Pessoa — telefones extras:** 3 novos campos de telefone (Alternativo, Extra 1, Extra 2), totalizando 6 números por contato. Disponíveis no cadastro/edição da pessoa.

### Melhorado
- **Ligação — seletor de número:** todos os 6 telefones da pessoa aparecem como opção ao ligar, tanto no botão rápido do card quanto nas atividades da seção Foco.

---

## [1.7.19] - 2026-04-23

### Adicionado
- **Aquisição — etapa "Aguardando Pedido" (list_id=42):** nova etapa entre Negociação e Negócio Ganho para leads que já decidiram comprar e aguardam a formalização. Saída apenas via botões Ganho/Perdido.

### Melhorado
- **Aquisição — regra Diagnóstico e Proposta → Negociação:** adicionada validação de `due_date` (Data esperada de fechamento) como requisito obrigatório, junto com proposta em PDF e follow-up pendente.

---

## [1.7.18] - 2026-04-23

### Melhorado
- **E-mail — envio individual (mala direta):** ao enviar para múltiplos destinatários, cada pessoa recebe seu próprio e-mail separado, sem ver os demais. Antes era enviado um único e-mail com todos os endereços no campo "Para:".

### Adicionado
- **Foco — botão "Sem e-mail":** em atividades de e-mail, novo botão permite concluir a task registrando que o e-mail do contato não foi encontrado (`is_valid: false`, `notes: "E-mail não encontrado"`).

---

## [1.7.17] - 2026-04-22

### Adicionado
- **Kanban — filtro de data de entrada na lista:** novo seletor de período no painel de filtros (hoje, ontem, esta semana, este mês, este trimestre, este ano, personalizado) que filtra cards pelo momento em que entraram na lista atual, com base no histórico `CardListHistory.entered_at`.

---

## [1.7.16] - 2026-04-22

### Melhorado

- **Kanban — carregamento progressivo:** cards buscados de 100 em 100 com indicador de progresso no header ("Carregando cards… X/Y"). O board renderiza imediatamente após carregar listas; os demais cards chegam em background com 1 segundo de intervalo entre páginas. Boards grandes (~960 cards) ficam navegáveis em segundos. AbortController cancela carregamentos anteriores ao trocar filtro de status.
- **Backend — filtro automático por role:** SDRs recebem apenas os cards onde são o SDR vinculado (`sdr_id = current_user.id`); Vendedores recebem apenas os cards onde são o responsável (`assigned_to_id = current_user.id`). Admin e Manager continuam vendo todos. Elimina tráfego desnecessário de dados que não seriam exibidos para esses perfis.

### Adicionado

- **Anotações — botão "Ver mais":** ao abrir a aba de anotações de um card com mais de 30 anotações, um botão "Ver mais X anotações" aparece ao fim da lista e busca o histórico completo sob demanda (`GET /card-notes/card/{id}`). O botão não aparece quando o filtro de ligações está ativo.

### Arquivos alterados

- `backend/app/services/card_service.py` — `list_cards`: filtro automático `sdr_id`/`assigned_to_id` por role
- `frontend/src/pages/KanbanBoard.tsx` — `buildCardParams` sem `all=true`; `fetchAllCardsProgressive`; estado `loadingProgress`; indicador no header
- `frontend/src/components/cardDetails/NotesSection.tsx` — prop `notesTotal`; estado `allLoaded`; `handleLoadMore`; botão "Ver mais"
- `frontend/src/pages/CardDetails.tsx` — passa `notesTotal` ao `NotesSection`
- `frontend/src/types/index.ts` — `notes_total` na interface `Card`; `is_lost` e `is_won` como `boolean` em `CardFilters`

---

## [1.7.15] - 2026-04-22

### Melhorado

- **Calendário — filtro por mês visível:** atividades buscadas apenas para o intervalo do grid exibido. Antes carregava todo o histórico sem filtro de data. Navegar entre meses refaz a busca automaticamente com AbortController para cancelar requisições antigas.
- **Kanban — recarregamento seletivo:** criar ou editar um card agora recarrega apenas os cards, sem recarregar board e listas. O evento de NoShow também usa a rota mais leve.
- **CardDetails — limites em atividades e notas:** histórico limitado a 30 atividades recentes; notas limitadas a 30 com contagem total disponível.
- **Backend — N+1 eliminado no Kanban:** listas dos cards pré-carregadas em uma única query antes do loop de resposta.

### Arquivos alterados

- `frontend/src/pages/Calendar.tsx` — `loadTasks` com AbortController e carregamento progressivo; `getForDay` para modal "+N mais"
- `frontend/src/services/cardTaskService.ts` — `getForCalendar` com filtro de datas; `getForDay` novo método; `page_size` máximo 500
- `frontend/src/pages/KanbanBoard.tsx` — `loadCardsOnly` em vez de `loadBoardData` após criar/editar card
- `backend/app/services/card_service.py` — `get_card_expanded`: limite 30 em atividades e notas; `notes_total`; pre-fetch de listas
- `backend/app/repositories/card_note_repository.py` — parâmetro `limit` em `get_by_card`; método `count_by_card`
- `backend/app/repositories/card_task_repository.py` — fix timezone-aware em `due_date_start`/`due_date_end`

---

## [1.7.14] - 2026-04-17

### Melhorado

- **Regras de avanço — Lead Novo → Prospecção:** removida a obrigatoriedade de nome, e-mail, cargo e área do contato nesta etapa. Agora exige apenas o contato vinculado. Os dados detalhados passam a ser validados em Conectado → Agendado.
- **Regras de avanço — Prospecção → Conectado:** evidência de contato agora aceita qualquer atividade concluída (ligação, WhatsApp ou e-mail), não apenas ligação VOIP ou tarefa de ligação.
- **Regras de avanço — Conectado → Agendado:** adicionada validação de nome, e-mail, cargo e área do contato (movido de Lead Novo). Validação de reunião obrigatória agora considera produto "bafômetro" (antes era "Phoebus").

### Arquivos alterados

- `backend/app/services/card_service.py` — bloco `_validate_pipeline_rules`: etapa 0 sem validação de dados do contato, etapa 1 aceita ligação/WhatsApp/e-mail, etapa 2 valida dados do contato e bafômetro

---

## [1.7.3] - 2026-04-14

### Adicionado

- **Atividades — Tipo "WhatsApp"**: novo tipo de atividade disponível no formulário de criação, junto com Ligação, Tarefa, Follow Up e Outro. Exibido com ícone de balão de mensagem e cor verde esmeralda em todo o sistema (badge, card de atividade, calendário).
- **Calendário — Botão "+ Agendar Reunião" na aba Outlook**: ao clicar em "+ Agendar" enquanto a aba Outlook está ativa, o sistema redireciona diretamente para a aba Reuniões (que cria o evento no Teams automaticamente). O botão muda de cor para roxo, consistente com a identidade visual da seção Reuniões.

### Arquivos alterados

- `backend/alembic/versions/2026_04_14_1000-add_whatsapp_to_task_type_enum.py` — migration: valor `whatsapp` adicionado ao enum `tasktype` no PostgreSQL
- `backend/app/models/card_task.py` — `WHATSAPP = "whatsapp"` no enum `TaskType`
- `backend/app/schemas/card_task.py` — `WHATSAPP = "whatsapp"` no schema Pydantic
- `frontend/src/constants/cardTaskConfig.ts` — tipo `whatsapp` com ícone `MessageCircle` e cor esmeralda
- `frontend/src/components/cardDetails/QuickActivityForm.tsx` — botão WhatsApp adicionado no formulário de criação (grid 5 colunas)
- `frontend/src/components/cardDetails/FocusSection.tsx` — ícone, label e badge do tipo WhatsApp
- `frontend/src/components/cardDetails/SchedulerSection.tsx` — prop `onGoToMeetings`; botão "+ Agendar Reunião" roxo na aba Outlook
- `frontend/src/pages/CardDetails.tsx` — passa `onGoToMeetings` ao `SchedulerSection`

---

## [1.7.2] - 2026-04-14

### Corrigido

- **Kanban — Etiqueta "Parado 3d+" em cards sem histórico**: cards recém-criados ou importados que nunca tiveram nenhuma atividade ou anotação registrada eram incorretamente marcados com a etiqueta vermelha "Parado 3d+". A lógica foi ajustada para considerar apenas cards que já possuem histórico (pelo menos uma tarefa ou anotação criada em algum momento) mas ficaram sem movimentação nos últimos 3 dias.

### Arquivos alterados

- `backend/app/services/card_service.py` — cálculo de `stuck_card_ids`: adicionada verificação de existência de histórico (`has_history`) antes de marcar o card como parado

---

## [1.7.0] - 2026-04-13

### Adicionado

#### Microsoft 365 — Integração Completa (Fases 3, 4 e 5)

Finalização da integração com Microsoft 365: reuniões Teams criadas e sincronizadas pelo CRM, calendário Outlook visível dentro das oportunidades, e disponibilidade do Vendedor acessível ao SDR para agendar sem conflitos.

**Reuniões com Microsoft Teams:**

- **Seção "Reuniões"** dedicada nas oportunidades (CardDetails), separada das demais atividades — com lista de pendentes, histórico colapsável de concluídas/no-shows e modal de criação
- **Criação automática de evento no calendário**: ao criar uma reunião, o evento é agendado automaticamente no Outlook do usuário e o link Teams é gerado — sem etapa manual separada
- **Convites automáticos**: o Vendedor responsável pelo card e o contato do cliente (até 3 emails cadastrados) recebem convite direto no Teams/Outlook ao criar a reunião
- **Botão "Copiar link"** da reunião Teams diretamente pelo CRM
- **Análise de transcrição com IA** (OpenAI GPT-4o): após a reunião, busca a transcrição do Teams e gera resumo executivo, sentimento, nível de interesse do cliente, objeções, próximos passos e pontos de atenção
- **Transcrição completa** disponível colapsável no card, com parsing de formato VTT para leitura "Participante: fala"
- **No-Show**: marcar reunião como não comparecimento, com confirmação
- **Ações de concluir e excluir** com diálogo de confirmação

**Calendário Outlook integrado:**

- **Nova aba "Outlook"** no calendário do card com sub-visões **Semana** (padrão) e **Mês**
- **Visão Semanal (8h–17h)**: grid visual com 7 colunas (Seg–Dom), eventos posicionados pelo horário real de início/fim com altura proporcional à duração
- **Visão Mensal**: eventos do Outlook sobrepostos ao grid do CRM, com distinção visual entre reuniões Teams (roxo) e eventos comuns (índigo)
- **Disponibilidade do Vendedor**: blocos cinza rajados mostram os horários ocupados do Vendedor responsável pelo card, permitindo ao SDR agendar sem conflitos de agenda
- **Navegação por semana/mês** com setas ←/→ e botão "Hoje"

**Infraestrutura Microsoft Graph:**

- `GET /me/calendar-events` — busca eventos do Outlook do usuário logado por período
- `GET /me/seller-schedule` — retorna disponibilidade (livre/ocupado) do Vendedor via Microsoft `getSchedule`
- `POST /me/events` com `isOnlineMeeting: true` — cria evento no Outlook com link Teams automático
- Renovação automática de access token via refresh token
- `assigned_to_email` exposto no CardResponse para uso no frontend

### Arquivos criados

- `frontend/src/components/cardDetails/MeetingSection.tsx` — seção completa de reuniões com Teams, transcrição e análise IA
- `backend/app/services/transcript_analysis_service.py` — análise de transcrições VTT com OpenAI

### Arquivos alterados

- `backend/app/services/microsoft_graph_service.py` — `create_calendar_event()`, `get_calendar_events()`, `get_schedule()`, `_resolve_meeting_id_by_join_url()`
- `backend/app/services/microsoft_auth_service.py` — escopo `Calendars.ReadWrite` adicionado
- `backend/app/services/card_task_service.py` — `_build_response()` inclui campos Teams e `is_noshow`
- `backend/app/api/v1/endpoints/auth.py` — endpoints `/me/calendar-events` e `/me/seller-schedule`
- `backend/app/api/v1/endpoints/card_tasks.py` — `create_teams_meeting` usa `create_calendar_event`, adiciona Vendedor como convidado
- `backend/app/schemas/card.py` — `assigned_to_email` no `CardResponse`
- `backend/app/services/card_service.py` — `assigned_to_email` populado no `get_card_expanded()`
- `frontend/src/components/cardDetails/SchedulerSection.tsx` — aba Outlook com visão semanal e disponibilidade do Vendedor
- `frontend/src/components/cardDetails/FocusSection.tsx` — reuniões filtradas (movidas para MeetingSection)
- `frontend/src/components/cardDetails/QuickActivityForm.tsx` — tipo "Reunião" removido
- `frontend/src/pages/CardDetails.tsx` — aba "Reuniões" com contador
- `frontend/src/types/index.ts` — `assigned_to_email` na interface `Card`
- `frontend/src/services/cardTaskService.ts` — `createTeamsMeeting()`, `fetchTranscript()`, campos Teams na interface
- `frontend/src/constants/cardTaskConfig.ts` — tipos `email`, `deadline`, `lunch` adicionados

---

## [1.6.25] - 2026-04-13

### Adicionado

#### Microsoft 365 — Fase 2: Envio de E-mail pelo CRM

Integração completa de envio de e-mail via Microsoft Graph API diretamente das oportunidades (cards), com histórico, templates, assinatura pessoal e suporte a anexos.

**Funcionalidades:**

- **Envio de e-mail**: compor e enviar e-mails a partir do card com destinatários múltiplos, assunto, corpo HTML e anexos (PDFs, documentos — até 24 MB por arquivo)
- **Templates de e-mail**: administradores e gerentes criam modelos reutilizáveis com variáveis dinâmicas (`{{nome_contato}}`, `{{empresa}}`, `{{nome_vendedor}}`, `{{titulo_card}}`, `{{valor_card}}`); disponíveis para todos os usuários ao compor um e-mail
- **Assinatura de e-mail**: cada usuário configura sua assinatura no perfil (texto + imagem em base64 inline), anexada automaticamente a todos os e-mails enviados pelo CRM — compatível com Outlook
- **Histórico de e-mails**: exibe destinatários (Para:), corpo completo com "Ver mais / Ver menos" e chips com os nomes dos arquivos anexados
- **Contador de e-mails** na aba E-mail do card (igual às demais seções)

### Corrigido

- E-mails enviados não apareciam na aba E-mail do card — enum `TaskType` no schema do backend estava sem os valores `EMAIL`, `DEADLINE` e `LUNCH`
- Double-submit ao salvar templates — corrigido com `useRef` como guard síncrono
- Modal de envio de e-mail ultrapassava os limites da tela — refatorada para usar o componente padrão `BaseModal`

### Arquivos criados

- `backend/alembic/versions/2026_04_10_1000-add_ms_tokens_to_users.py` — migration: tokens Microsoft em `users`
- `backend/alembic/versions/2026_04_13_1000-create_email_templates_table.py` — migration: tabela `email_templates`
- `backend/alembic/versions/2026_04_13_1100-add_email_signature_to_users.py` — migration: coluna `email_signature` em `users`
- `backend/app/models/email_template.py` — model `EmailTemplate` com soft delete
- `backend/app/schemas/email_template.py` — schemas Pydantic (create, update, response)
- `backend/app/api/v1/endpoints/email_templates.py` — endpoints REST (GET, POST, PUT, DELETE)
- `backend/app/services/microsoft_graph_service.py` — cliente Microsoft Graph API (envio com anexos, timeout 30s)
- `frontend/src/components/cardDetails/EmailSection.tsx` — seção de e-mail com histórico, modal de envio, templates e anexos
- `frontend/src/services/emailTemplateService.ts` — cliente API para templates

### Arquivos alterados

- `backend/app/models/user.py` — campo `email_signature` (Text)
- `backend/app/schemas/user.py` — `email_signature` em `UserUpdate` e `UserResponse`
- `backend/app/schemas/card_task.py` — `TaskType` enum: adicionados `EMAIL`, `DEADLINE`, `LUNCH`
- `backend/app/api/v1/__init__.py` — router `/email-templates` registrado
- `backend/app/api/v1/endpoints/auth.py` — fluxo OAuth Microsoft 365
- `backend/app/api/v1/endpoints/cards.py` — endpoint `POST /cards/{id}/send-email` com assinatura e anexos
- `backend/app/api/v1/endpoints/users.py` — `email_signature` nos 5 pontos de `UserResponse`
- `backend/app/api/v1/endpoints/user_avatar.py` — endpoints de upload/leitura de imagem de assinatura
- `frontend/src/types/index.ts` — `email_signature` na interface `User`
- `frontend/src/services/cardService.ts` — `sendEmail()` com suporte a anexos
- `frontend/src/services/cardTaskService.ts` — tipo `"email"` adicionado ao union
- `frontend/src/pages/CardDetails.tsx` — estado `emailCount` + badge na aba E-mail
- `frontend/src/pages/Settings.tsx` — construtor visual de assinatura + gerenciamento de templates
- `frontend/src/components/cardDetails/ContactSection.tsx` — ajustes de integração

---

## [1.6.23] - 2026-04-06

### Adicionado

#### Sistema de Cadências de Atividades

Novo sistema que permite ao SDR/Vendedor criar **cadências** — conjuntos de metas de atividades por tipo — e disparar a criação automática dessas atividades nos cards mais antigos do usuário que ainda não têm atividade pendente daquele tipo.

**Funcionalidades:**
- Criar cadências com múltiplos tipos de atividade e quantidades (ex: 20 Ligações + 10 E-mails)
- Editar e remover cadências próprias
- **Disparar** a cadência: cria automaticamente atividades pendentes nos N cards mais antigos sem atividade daquele tipo
- Resultado detalhado por tipo: quantas foram criadas vs. solicitadas e quantos cards foram afetados
- Botão "Cadências" na página de Atividades, visível para Vendedores e SDRs

**Regras de disparo:**
- Considera apenas cards ativos (não ganhos, não perdidos, não excluídos) onde o usuário é SDR ou Vendedor vinculado
- Ordena por card mais antigo (criado primeiro)
- Pula cards que já têm atividade pendente do mesmo tipo
- Respeita a quantidade solicitada por tipo

**Arquivos criados:**
- `backend/alembic/versions/2026_04_06_1000-add_cadencias_tables.py` — migration: tabelas `cadencias` e `cadencia_itens`
- `backend/app/models/cadencia.py` — models `Cadencia` e `CadenciaItem`
- `backend/app/schemas/cadencia.py` — schemas Pydantic (create, update, response, trigger result)
- `backend/app/services/cadencia_service.py` — CRUD + lógica de disparo
- `backend/app/api/v1/endpoints/cadencias.py` — endpoints REST
- `frontend/src/services/cadenciaService.ts` — cliente API + tipos TypeScript
- `frontend/src/components/activities/CadenciaModal.tsx` — modal com listagem, formulário e resultado

**Arquivos alterados:**
- `backend/app/models/__init__.py` — registra `Cadencia`, `CadenciaItem`
- `backend/app/models/user.py` — relacionamento `user.cadencias`
- `backend/app/api/v1/__init__.py` — registra router `/cadencias`
- `frontend/src/pages/Activities.tsx` — botão "Cadências" + modal

---

## [1.6.22] - 2026-04-06

### Adicionado

#### Dashboard — filtro de período "Ontem"

- Nova opção **"Ontem"** no seletor de período do Dashboard, posicionada entre "Hoje" e "Esta Semana"
- Todos os KPIs e métricas respondem ao filtro normalmente
- Backend já possuía `PeriodEnum.YESTERDAY` implementado — apenas exposto no mapeamento do dashboard

**Arquivos alterados:**
- `backend/app/services/report_service.py` — `"yesterday"` adicionado ao `_DASHBOARD_PERIOD_MAP`
- `frontend/src/context/DashboardContext.tsx` — `PeriodType` inclui `"yesterday"`
- `frontend/src/pages/Dashboard.tsx` — opção e label "Ontem" no seletor de período

---

## [1.6.21] - 2026-04-02

### Adicionado / Corrigido

#### Dashboard Vendedor — dados reais em todos os KPIs e métricas

Revisão completa do dashboard de Vendedor, implementando métricas reais e corrigindo inconsistências.

**KPIs principais:**
- "Pipeline Total" renomeado para **"Pipeline Gerado"** — deixa claro que o valor é filtrado pelo período selecionado (cards criados no período ainda em aberto)
- **Tempo Médio p/ Fechar** agora filtrado pelo período selecionado (`closed_at` no período), antes calculava média histórica geral
- **Reuniões Recebidas (SDR)** implementado: conta cards que entraram na lista "Agendado" (id=26) no período com `sdr_id IS NOT NULL` — mesma base do ranking SDR para consistência
- **Propostas Geradas** implementado: cards que entraram em "Diagnóstico e Proposta" (id=30) no período

**Funil de Conversão (4 cards):**
- Todos calculados no frontend a partir de `cards_by_stage`:
  - Reunião → Qualificação
  - Qualificação → Proposta
  - Proposta → Ganho
  - Taxa Geral do Funil (Reunião → Ganho)

**Riscos Operacionais:**
- **Negócios Parados (7d)**: cards sem movimentação de etapa há mais de 7 dias (threshold maior que SDR pois negócios demoram mais)
- **Propostas em Aberto**: snapshot atual de cards ativos na etapa "Diagnóstico e Proposta"
- Saúde do Pipeline: mantida com indicadores "??" até definição dos KPIs com a equipe

**Outros ajustes:**
- `cards_by_stage` com `view=vendedor` filtra exclusivamente para o board Aquisição (id=7), garantindo ordem correta do pipeline
- Settings API4COM: lista de ramais agora inclui SDRs além de vendedores; select do formulário oculta usuários que já têm ramal vinculado

**Arquivos alterados:**
- `backend/app/services/report_service.py` — reuniões_recebidas, propostas_geradas, negocios_parados_7d, propostas_em_aberto, avg_time filtrado por período, board filter por view
- `backend/app/schemas/report.py` — novos campos
- `frontend/src/types/index.ts` — novos campos em `DashboardKPIs`
- `frontend/src/components/dashboard/DashboardVendedor.tsx` — todos os KPIs e funil atualizados
- `frontend/src/pages/Settings.tsx` — ramais incluem SDRs, oculta já vinculados

---

## [1.6.20] - 2026-04-02

### Adicionado / Corrigido

#### Dashboard SDR — dados reais em todos os KPIs e métricas

Revisão completa do dashboard de SDR, substituindo placeholders e dados incorretos por métricas reais calculadas no backend.

**Filtro de visão (view param):**
- Novo parâmetro `view` (`sdr` / `vendedor`) nos endpoints e serviço de dashboard
- Quando `view=sdr`, todos os KPIs e contagens filtram apenas cards com `sdr_id IS NOT NULL`
- `DashboardContext` inicializa a view automaticamente conforme o papel do usuário logado; `setView` reseta o usuário selecionado

**Cards por Etapa:**
- Substituída contagem estática (cards na lista atual) por contagem de cards que **entraram** na etapa no período selecionado, via `card_list_history.entered_at`
- Identificação de etapas por `list_id` (em vez de string), eliminando falsos positivos por nomes similares (ex: "Agendado" vs "Reunião Agendada")
- Filtro de board por view: `view=sdr` exibe apenas o board Prospecção (id=6); `view=vendedor` exibe apenas Aquisição (id=7)
- Removido filtro `is_won == 0` — cards que entraram na etapa no período são contados independente do status atual

**Evolução de Leads (gráfico):**
- Substituídas as linhas de Ganhos/Perdidos (métricas de vendedor) por:
  - **Novos Leads** (cards criados por mês) — linha azul
  - **Reuniões Agendadas** (cards que entraram na lista Agendado por mês) — linha verde
- Novos campos `new_leads_count` e `meetings_count` adicionados a cada item de `sales_evolution`

**Ranking SDR:**
- Removido o ranking de vendedores do dashboard SDR
- Novo ranking de SDRs por reuniões agendadas no período: conta cards distintos que entraram na lista "Agendado" (id=26) por SDR

**Taxas de Conversão (4 cards):**
- Todos os 4 cards agora com dados reais calculados no frontend a partir de KPIs existentes:
  - Lead → Conectado: `conectados / newLeads`
  - Conectado → Agendado: `agendados / conectados`
  - Lead → Agendado: `agendados / newLeads`
  - Agendado → Ganho: `won_cards_this_month / agendados`

**Riscos Operacionais (2 novos KPIs no backend):**
- `leads_sem_contato`: cards ativos sem nenhuma atividade registrada (LEFT JOIN com tabela `activities`, Activity.id IS NULL)
- `cards_parados`: cards ativos cuja entrada mais recente em `card_list_history` tem `exited_at IS NULL` e `entered_at` há mais de 3 dias

**Arquivos alterados:**
- `backend/app/services/report_service.py` — view filter, cards_by_stage por board, evolução com new_leads/meetings, ranking SDR, leads_sem_contato, cards_parados
- `backend/app/schemas/report.py` — campos `leads_sem_contato`, `cards_parados`, `top_sdrs_by_meetings`; `sales_evolution` com `new_leads_count` e `meetings_count`
- `backend/app/api/v1/endpoints/reports.py` — parâmetro `view` repassado ao serviço
- `frontend/src/types/index.ts` — novos campos em `DashboardKPIs`
- `frontend/src/services/reportService.ts` — parâmetro `view` na chamada de API
- `frontend/src/context/DashboardContext.tsx` — estado `view`, inicialização por role, `fetchDashboardData` com override params
- `frontend/src/pages/Dashboard.tsx` — `view`/`setView` lidos do contexto
- `frontend/src/components/dashboard/DashboardSDR.tsx` — todos os KPIs e gráficos atualizados

---

## [1.6.19] - 2026-03-30

### Adicionado

#### Página Ligações — Médias por bloco e filtro de período

**Médias por bloco de avaliação:**
- Nova fila de cards acima dos badges de classificação exibindo a média de cada bloco da matriz de avaliação (Abertura, Diagnóstico, Alcoolemia, Fechamento, etc.) calculada sobre todos os registros do conjunto filtrado
- Cor por faixa: verde ≥7, amarelo ≥5, vermelho <5 — mesma lógica do `GradeBar` usado nos cards de avaliação
- Mini barra de progresso em cada card para leitura visual rápida
- Blocos marcados como `not_applicable` são excluídos do cálculo
- Calculado no backend sobre todo o conjunto filtrado (não apenas a página atual)

**Filtro de período:**
- Substituídos os dois inputs de data avulsos pelo mesmo seletor de período do Dashboard: Hoje / Esta Semana / Este Mês / Este Trimestre / Este Ano / Personalizado
- Padrão inicial: Este Mês
- Ao escolher "Personalizado", os dois inputs de data aparecem com validação de intervalo (min/max entre si)
- "Limpar filtros" retorna o período para Este Mês

**Arquivos alterados:**
- `backend/app/schemas/call_evaluation.py` — campo `average_by_block` em `CallEvaluationListResponse`
- `backend/app/api/v1/endpoints/call_evaluations.py` — cálculo de `average_by_block` iterando JSONs
- `frontend/src/services/callEvaluationService.ts` — campo `average_by_block` na interface
- `frontend/src/pages/CallEvaluationsPage.tsx` — exibição dos blocos + seletor de período

---

## [1.6.18] - 2026-03-30

### Adicionado

#### Automação de Nutrição por E-mail (automacao01)

Integração com sistema externo de nutrição via e-mail, controlada por um switch no card.

**Funcionamento:**
- SDR ou Vendedor ativa/desativa a nutrição pelo switch na seção "Automações" do card
- Ao ligar, o sistema envia um webhook (`card.automacao01_ativado`) para a URL configurada em `AUTOMACAO01_WEBHOOK_URL`
- Ao desligar, o webhook `card.automacao01_desativado` é disparado para o mesmo destino
- O sistema externo pode desligar a automação via API (`POST /api/v1/cards/{id}/automacao01/desativar`) — quando o cliente responde ao e-mail demonstrando interesse, o SDR/Vendedor vinculado recebe notificação: "Cliente demonstrou interesse!"

**Bloqueio de pipeline:**
- SDR e Vendedor não podem avançar o card para a próxima etapa enquanto a nutrição estiver ativa
- Um aviso laranja aparece abaixo do pipeline indicando que é necessário desativar a automação antes de mover
- Admins e gerentes podem mover o card normalmente mesmo com a automação ativa

**Visual no Kanban:**
- Cards em nutrição aparecem ao final de cada lista
- Badge laranja "Em Nutrição" exibido no card
- Borda e fundo do card em tom laranja para identificação rápida

**Endpoints criados:**
- `POST /api/v1/cards/{id}/automacao01/desativar` — desativa a nutrição via API externa e notifica o responsável

**Arquivos criados/alterados:**
- `backend/alembic/versions/2026_03_30_1000-add_automacao01_to_cards.py` — migration: coluna `automacao01` na tabela `cards`
- `backend/app/models/card.py` — campo `automacao01`
- `backend/app/schemas/card.py` — campo em `CardUpdate`, `CardResponse`, `CardMinimalResponse`
- `backend/app/core/config.py` — variável `AUTOMACAO01_WEBHOOK_URL`
- `backend/app/services/card_service.py` — webhook nas duas direções + `get_card_expanded` e `list_cards` incluindo o campo
- `backend/app/api/v1/endpoints/cards.py` — endpoint de desativação + `card_to_response` incluindo o campo
- `frontend/src/types/index.ts` — campo `automacao01` na interface `Card`
- `frontend/src/components/cardDetails/AutomacoesSection.tsx` — nova seção expansível com o switch
- `frontend/src/components/cardDetails/PipelineStages.tsx` — prop `blockedByAutomacao` bloqueia avanço de etapa
- `frontend/src/pages/CardDetails.tsx` — renderiza `AutomacoesSection` e passa `blockedByAutomacao`
- `frontend/src/components/kanban/KanbanCard.tsx` — badge laranja + borda laranja + ordenação ao final

---

## [1.6.17] - 2026-03-30

### Adicionado

#### Página de Ligações — Visualização centralizada de avaliações

Nova página dedicada (`/ligacoes`) para gestores, admins e vendedores acompanharem as avaliações de ligações geradas pelo agente de IA.

**Controle de acesso por role:**
- Administradores e gerentes veem todas as avaliações de todos os vendedores
- Vendedores, SDRs e demais roles veem apenas as próprias ligações (filtrado automaticamente pelo backend)

**Funcionalidades da página:**
- Cards de estatísticas: total de avaliações, nota média (com cor por faixa), contagem de Excelente+Boa e Fraca+Crítica
- Badges de classificação com contagem por tipo (calculados no conjunto filtrado)
- Filtro por vendedor — exibido apenas para manager/admin, populado com os vendedores que já possuem avaliações registradas
- Filtro por classificação e por período (data início / data fim)
- Botão "Limpar filtros" exibido quando algum filtro está ativo
- Lista paginada de avaliações (10 por página) reutilizando o componente `EvaluationCard`
- Botão "Ver card #X" em cada avaliação para navegar diretamente ao card correspondente
- Item "Ligações" adicionado ao sidebar acima de Gamificação, visível para todos exceto viewers

**Endpoints criados:**
- `GET /api/v1/call-evaluations/` — lista com filtros (classification, vendedor_name, date_from, date_to), paginação e stats embutidas
- `GET /api/v1/call-evaluations/vendedores` — lista de nomes distintos de vendedores com avaliações (restrito a manager/admin)

**Arquivos criados/alterados:**
- `frontend/src/pages/CallEvaluationsPage.tsx` — nova página
- `frontend/src/components/cardDetails/CallEvaluationsSection.tsx` — componentes exportados (`EvaluationCard`, `classificationColor`, etc.) e prop `onCardClick` adicionada
- `frontend/src/services/callEvaluationService.ts` — métodos `list()` e `listVendedores()` adicionados
- `frontend/src/router.tsx` — rota `/ligacoes`
- `frontend/src/layouts/MainLayout.tsx` — item "Ligações" no sidebar
- `backend/app/api/v1/endpoints/call_evaluations.py` — endpoints adicionados
- `backend/app/schemas/call_evaluation.py` — schema `CallEvaluationListResponse` adicionado

---

## [1.6.16] - 2026-03-27

### Adicionado

#### Avaliações de Ligações — Integração com agente de IA via N8N

Criada infraestrutura completa para armazenar avaliações de ligações geradas automaticamente pelo agente de IA no N8N após cada chamada transcrita.

- Nova tabela `call_evaluations` no banco com: transcrição, resumo, próximos passos, avaliação geral, situação, avaliação por matriz de blocos (JSONB), nota final e classificação
- Vinculação com `card_id` e opcionalmente com `call_log_id` (chamada VOIP)
- Prompt do agente (`prompt-resumo.md`) atualizado para retornar JSON estruturado diretamente — sem necessidade de parsing de texto
- Avaliação por matriz de blocos com `not_applicable` para blocos de caminho SIM/NÃO

**Endpoints criados:**
- `POST /api/v1/call-evaluations` — N8N envia a avaliação após processar a ligação
- `GET /api/v1/call-evaluations/card/{card_id}` — lista avaliações de um card (mais recente primeiro)
- `GET /api/v1/call-evaluations/{id}` — busca avaliação específica

- Nova aba **Ligações** no CardDetails (após Arquivos) exibindo todas as avaliações do card
- Cada avaliação mostra: badge de nota com cor por classificação, situação, resumo, próximos passos, avaliação por blocos da matriz (expansível), sub-blocos não cobertos com sugestões e transcrição completa
- Contador na aba exibe o número de avaliações registradas (mesmo padrão das demais abas)
- Campos `ramal` e `vendedor_name` armazenados para identificação histórica do vendedor

**Arquivos criados/alterados:**
- `backend/app/models/call_evaluation.py` — model SQLAlchemy
- `backend/app/schemas/call_evaluation.py` — schemas Pydantic (Create e Response)
- `backend/app/api/v1/endpoints/call_evaluations.py` — endpoints REST
- `backend/app/api/v1/__init__.py` — router registrado em `/call-evaluations`
- `backend/app/models/__init__.py` — model registrado para Alembic
- `backend/alembic/versions/2026_03_27_1000-add_call_evaluations_table.py` — migration aplicada
- `backend/alembic/versions/2026_03_27_1100-add_ramal_vendedor_to_call_evaluations.py` — migration aplicada
- `frontend/src/services/callEvaluationService.ts` — service de avaliações
- `frontend/src/components/cardDetails/CallEvaluationsSection.tsx` — componente da aba
- `frontend/src/pages/CardDetails.tsx` — aba Ligações adicionada com contador
- `prompt-resumo.md` — prompt do agente de IA na raiz do projeto

---

## [1.6.15] - 2026-03-27

### Alterado

#### Pipeline — Todos os cards criados em "Lead Novo"

Padronização do ponto de entrada do funil de vendas: todos os cards agora são criados diretamente na lista **Lead Novo**, independente do papel do usuário.

- SDRs e vendedores só podem criar cards em **Lead Novo** (antes era "Prospecção")
- Botão de adicionar card no Kanban agora aparece apenas na lista **Lead Novo** para SDRs e vendedores
- Cards reabertos (negócio perdido reaberto) também vão para **Lead Novo** em vez de Prospecção

**Arquivos alterados:**
- `backend/app/services/card_service.py` — restrição de lista na criação e destino do `reopen_card` atualizados para `Lead Novo` (list_id=22)
- `frontend/src/pages/KanbanBoard.tsx` — `canAddCardToList` agora libera o botão em `"Lead Novo"` em vez de `"Prospecção"`

---

#### Automações — Condição "Criado pelo usuário" no gatilho Card Criado

A automação de atribuição de vendedor (rodízio) agora suporta filtrar pelo usuário que criou o card, permitindo que a automação dispare **somente para cards criados por um usuário específico** (ex: usuário "Integração" que recebe leads do site).

Isso resolve o problema onde a automação atribuía vendedor também para cards criados manualmente por SDRs e vendedores, que não devem receber atribuição automática.

- Nova condição `triggered_by_user_id` suportada pelo engine de automações
- Editor visual de automações agora exibe o seletor **"Criado pelo usuário"** no gatilho `Card Criado`
- Automação id=14 ("Atribuir Vendedor - Automático") atualizada: dispara apenas para cards criados pelo usuário Integração (id=7) na lista Lead Novo

**Arquivos alterados:**
- `backend/app/services/card_service.py` — `trigger_data` no evento `card_created` agora inclui `triggered_by_user_id`
- `backend/app/services/automation_service.py` — `_check_trigger_conditions` suporta a nova condição `triggered_by_user_id`
- `frontend/src/components/automations/NodeConfigPanel.tsx` — seletor "Criado pelo usuário" adicionado ao gatilho `card_created`
- `frontend/src/utils/automationConverter.ts` — campos vazios filtrados antes de enviar `trigger_conditions` à API

---

## [1.6.14] - 2026-03-23

### Adicionado

#### Dashboard — Dashboard personalizado por usuário

O Dashboard agora exibe dados filtrados de acordo com o papel do usuário logado:

- **Vendedores** veem automaticamente apenas seus próprios negócios (`assigned_to_id`)
- **SDRs** veem automaticamente apenas os negócios onde são o SDR (`sdr_id`)
- **Administradores e Gerentes** continuam vendo todos os dados, com novo dropdown no header para filtrar por um usuário específico — ao selecionar, o sub-título "Visualizando: [nome]" aparece

Para vendedores e SDRs, o sub-título "Meu Dashboard — [nome]" é exibido no lugar do seletor.

**Arquivos alterados:**
- `backend/app/api/v1/endpoints/reports.py` — parâmetro `user_id` no endpoint GET `/dashboard`
- `backend/app/services/report_service.py` — método `_build_dashboard_user_filter`; filtro `uf` aplicado em todas as queries
- `frontend/src/services/reportService.ts` — `getDashboardKPIs` aceita `user_id`
- `frontend/src/context/DashboardContext.tsx` — estado `selectedUserId`; auto-set por role
- `frontend/src/pages/Dashboard.tsx` — seletor de usuário (admin/gerente) e título personalizado (vendedor/SDR)

---

#### Dashboard — Filtro de período funcional

O seletor de período (Hoje / Esta Semana / Este Mês / Este Trimestre / Este Ano) agora realmente filtra os dados retornados pelo backend. Anteriormente o valor era enviado mas ignorado pelo servidor.

Os KPIs principais (`Abertos no Período`, `Ganho no Período`, `Novos no Período`, taxa de conversão, Top Performers) refletem o intervalo selecionado. Os labels dos cards também se atualizam conforme o período escolhido.

**Arquivos alterados:**
- `backend/app/api/v1/endpoints/reports.py` — parâmetro `period` no endpoint
- `backend/app/services/report_service.py` — mapeamento de período; `start_of_period`/`end_of_period` nas queries
- `frontend/src/pages/Dashboard.tsx` — `periodLabel` dinâmico nos cards

---

### Corrigido

#### Dashboard — "Abertos no Período" e "Valor em Pipeline" refletindo o período correto

Antes, o primeiro KPI card mostrava o total histórico de cards (ex: 1.281 com filtro "Hoje") e o Pipeline mostrava a soma de todos os cards abertos de todos os tempos. Ambos foram corrigidos:

- **Abertos no Período**: conta apenas cards com `is_won = 0` criados dentro do período selecionado
- **Valor em Pipeline**: soma apenas o valor dos cards abertos criados no período selecionado

#### Dashboard — Top Performers ordenado por valor total faturado

O ranking de Top Performers era ordenado por quantidade de deals fechados, permitindo que vendedores com muitas vendas de baixo valor ficassem à frente de quem faturou mais. Agora a ordenação é pelo **valor total** (`SUM(value) DESC`), com `COALESCE` para tratar vendedores sem valor registrado (evitando que NULLs apareçam no topo).

#### Dashboard — Top Performers sempre exibe o ranking global da equipe

Mesmo quando um vendedor ou SDR acessa o Dashboard (onde os demais KPIs são filtrados para seus próprios dados), o Top Performers continua mostrando o ranking completo da equipe — permitindo que cada vendedor veja sua posição em relação aos colegas.

**Arquivo alterado:**
- `backend/app/services/report_service.py` — query `top_sellers_query` sem `user_filter`; ordenação por `coalesce(sum(value), 0).desc()`

---

## [1.6.13] - 2026-03-20

### Corrigido

#### Relatórios — "Filtrar valores do Eixo X" resetava ao abrir o painel de edição

Ao clicar para editar um gráfico que já tinha o filtro de Eixo X configurado (ex: apenas Claudia e Karolaine), o filtro era apagado automaticamente, forçando o usuário a reconfigurar toda vez.

**Causa:** dois `useEffect` corriam em paralelo no mount inicial do componente. O primeiro (restauração do `editingConfig`) chamava `setXFilterValues([valores restaurados])`. O segundo (responsável por buscar os valores disponíveis do eixo X) sempre chamava `setXFilterValues([])` quando `xAxisField` ainda era `null` no estado inicial — sobrescrevendo a restauração, pois com o Automatic Batching do React 18 a última chamada de `setState` do lote vence.

**Correção:** removido o `setXFilterValues([])` do segundo `useEffect`. O reset agora ocorre apenas em ações explícitas do usuário: ao arrastar um novo campo para o eixo X (`handleXDrop`) ou ao remover o campo pelo botão "×".

**Arquivos alterados:**
- `frontend/src/components/reports/ChartConfigPanel.tsx` — segundo `useEffect` do eixo X; `handleXDrop`; botão de remoção do campo X

---

#### Relatórios — "Sem dados para exibir" ao filtrar Eixo X por usuários sem dados no período

Ao usar "Filtrar valores do Eixo X" e selecionar usuários que aparecem no dropdown mas não possuem registros **no período atual** (apenas no histórico), o gráfico exibia "Sem dados para exibir" em vez de mostrar barras com valor 0.

**Causa:** o dropdown de opções do filtro X é populado pelo endpoint `/split-values` (sem filtro de período — dados de todo o tempo), enquanto `_get_x_labels_and_order` filtra pelo período vigente. Usuários com dados históricos mas sem registros no período selecionado não apareciam nos labels, tornando `label_raw_pairs` vazio após o filtro.

**Correção:** após aplicar o filtro X em `execute_query`, os valores selecionados que não aparecem no período são inseridos manualmente em `label_raw_pairs` com label buscado no banco (para campos `user`) ou usando o raw value como label (para campos `category`). Os valores Y ficam naturalmente em 0, mas o gráfico exibe as barras corretamente.

**Arquivo alterado:**
- `backend/app/services/custom_report_service.py` — bloco de aplicação do `x_filter_values` em `execute_query`

---

## [1.6.12] - 2026-03-19

### Corrigido

#### Relatórios — gráfico em branco ao filtrar "Dividir por" com apenas 1 série

Quando o usuário filtrava as séries exibidas no "Dividir por" deixando apenas **uma série selecionada**, o gráfico ficava completamente em branco (sem dados).

**Causa:** a flag `hasSeries` em `ChartWidget.tsx` usava `data.series.length > 1` como condição para ativar o modo multi-série. Com apenas 1 série, a condição era `false` e o Recharts tentava montar os dados no formato single-série (`entry.valor`), incompatível com a resposta do backend que usava o formato `entry[s.name]`.

**Correção:** `hasSeries` agora é `true` sempre que `split_by` está configurado **e** existe pelo menos 1 série no resultado (`>= 1`).

**Arquivo alterado:**
- `frontend/src/components/reports/ChartWidget.tsx` — linha da flag `hasSeries`

---

### Adicionado

#### Relatórios — Filtros Globais por campo

Nova seção **"Filtros Globais"** no painel de configuração de gráficos. Permite filtrar os dados por qualquer campo categórico ou de usuário, independentemente do que está configurado nos eixos X, Y ou "Dividir por".

**Caso de uso principal:** um gráfico com Eixo X = Data de Entrada na Etapa, Eixo Y = Negócios que Entraram e Dividir Por = Etapa do Pipeline pode agora ser filtrado para exibir apenas os negócios de um SDR ou Vendedor específico.

**Comportamento:**
- Botão "+ Adicionar" abre dropdown com os campos groupable da fonte do eixo X
- Múltiplos filtros podem ser empilhados
- Checkboxes por valor; "Exibir todos" limpa o filtro
- Quando todos os valores estão marcados, o filtro ainda é aplicado como `IN clause` — excluindo assim registros sem o campo preenchido (ex: negócios sem SDR atribuído)
- Persiste ao salvar/reabrir o relatório

**Arquivos alterados — Frontend:**
- `frontend/src/components/reports/reportTypes.ts` — interface `GlobalFilter`; campo `global_filters` em `ChartConfig`
- `frontend/src/services/reportService.ts` — inclui `global_filters` no payload de `queryChart`
- `frontend/src/components/reports/ChartConfigPanel.tsx` — estados, lógica e UI da seção Filtros Globais

**Arquivos alterados — Backend:**
- `backend/app/schemas/custom_report.py` — `GlobalFilterItemSchema`; campo `global_filters` em `QueryRequest`
- `backend/app/services/custom_report_service.py` — método `_build_global_filter_expr` (cláusula IN multi-valor); aplicação dos filtros globais em `execute_query` nos modos split e normal

---

## [1.6.11] - 2026-03-18

### Adicionado

#### Kanban — filtros de Canal de Aquisição e Canal de Aquisição Detalhe

Dois novos filtros no board Kanban permitem segmentar os cards por canal de origem:

- **Canal de Aquisição**: dropdown com todos os canais cadastrados (Outbound, Inbound, etc.)
- **Canal de Aquisição Detalhe**: aparece automaticamente ao selecionar um canal, listando apenas os detalhes relevantes (ex: Cold Call, LinkedIn para Outbound)

Os filtros funcionam em conjunto com os demais filtros já existentes (Vendedor, SDR, Responsável).

**Arquivos alterados:**
- `frontend/src/pages/KanbanBoard.tsx` — novos estados e seções de filtro no painel lateral

---

#### Kanban — persistência de filtros no localStorage

Os filtros selecionados em cada board agora são salvos automaticamente no navegador. Ao entrar em um card e voltar para o kanban, todos os filtros são restaurados exatamente como estavam — sem precisar reconfigurar.

A implementação usa um guard `restoredBoardId` para evitar race condition: o efeito de salvamento só começa a gravar após a restauração completa dos filtros.

**Arquivo alterado:** `frontend/src/pages/KanbanBoard.tsx`

---

#### Cards — rastreamento de reabertura (`reopened_from_card_id`)

Cards reabertos a partir de negócios perdidos agora armazenam a referência ao card original. Isso permite identificar visualmente cards que vieram de uma reabertura:

- **Badge "Reabertura"** (âmbar) no kanban, ao lado do título do card
- **Botão "Reabertura — ver card original #X"** na página de detalhes do card, abrindo o card de origem
- Campo `reopened_from_card_id` armazenado no banco e disponível nas respostas de API

**Migration:** `alembic/versions/2026_03_18_1000-add_reopened_from_card_id.py`

**Arquivos alterados — Backend:**
- `app/models/card.py` — coluna `reopened_from_card_id` e relationship
- `app/schemas/card.py` — `reopened_from_card_id` em `CardResponse` e `CardMinimalResponse`
- `app/services/card_service.py` — `reopen_card` agora preenche o campo no novo card

**Arquivos alterados — Frontend:**
- `types/index.ts` — `reopened_from_card_id?: number | null` na interface `Card`
- `components/kanban/KanbanCard.tsx` — badge "Reabertura" com ícone `RefreshCw`
- `pages/CardDetails.tsx` — botão âmbar "ver card original"

---

### Correção de Dados

#### Scripts de correção de cards fora das listas terminais

Três scripts foram executados para corrigir cards que tinham status de ganho/perdido mas estavam em listas de pipeline em vez das listas terminais corretas:

| Board | Situação | Cards corrigidos |
|---|---|---|
| Prospecção (id=6) | Perdidos fora de "Negócio Perdido" (list_id=27) | 153 |
| Aquisição (id=7) | Perdidos fora de "Negócio Perdido" (list_id=33) | 64 |
| Aquisição (id=7) | Ganhos fora de "Negócio Ganho" (list_id=32) | 32 |

Cada script atualiza também o `CardListHistory` (fecha o registro aberto da lista anterior e cria novo para a lista destino).

**Scripts:**
- `backend/scripts/fix_lost_cards_prospeccao.py`
- `backend/scripts/fix_lost_cards_aquisicao.py`
- `backend/scripts/fix_won_cards_aquisicao.py`

---

## [1.6.10] - 2026-03-18

### Adicionado

#### Cards — endpoint dedicado para Marcar como Ganho / Perdido

Dois novos endpoints substituem o uso genérico de `PATCH /cards/{id}` para fechar negócios:

- `POST /api/v1/cards/{id}/win` — marca como ganho
- `POST /api/v1/cards/{id}/lose` — marca como perdido (body: `{ "loss_reason": "..." }`)

Ambos localizam automaticamente a lista `is_done_stage` / `is_lost_stage` do board atual e chamam `move_card` internamente, garantindo que **todo o fluxo seja executado**: movimentação real na lista, `CardListHistory`, gamificação, automações e activity log.

**Regra de negócio implementada:** o botão "Ganho" é ocultado no frontend quando o board não possui lista de ganho (ex: Prospecção só permite perda). O campo `board_has_done_stage` foi adicionado à resposta do `CardResponse` e calculado tanto em `GET /cards/{id}` quanto em `GET /cards/{id}/expanded`.

**Arquivos alterados — Backend:**
- `app/schemas/card.py` — `CardMarkLostRequest`; `board_has_done_stage` em `CardResponse`
- `app/services/card_service.py` — `mark_card_won()` e `mark_card_lost()`
- `app/api/v1/endpoints/cards.py` — endpoints `/win` e `/lose`; `board_has_done_stage` em `get_card` e `card_to_response`; `board_has_done_stage` em `get_card_expanded` via service

**Arquivos alterados — Frontend:**
- `types/index.ts` — `board_has_done_stage: boolean | null` na interface `Card`
- `services/cardService.ts` — `markAsWon()` e `markAsLost(id, lossReason)` apontando para os novos endpoints
- `pages/CardDetails.tsx` — `handleMarkAsWon` e `handleConfirmLoss` usam os novos métodos; botão "Ganho" condicional em `board_has_done_stage`

---

### Corrigido

#### Automações — movimentos de card não apareciam no histórico

Quando uma automação movia um card (ex: "ao entrar em Agendado → mover para Reunião Agendada"), o `AutomationService` chamava `card_repository.move_to_list()` diretamente — sem gravar `CardListHistory` nem activity log. Resultado: o movimento aparecia no board mas ficava invisível no histórico do card e nos relatórios de Histórico de Etapas.

**Correção:** após `move_to_list`, o `AutomationService` agora:
1. Fecha o registro `CardListHistory` da etapa anterior e cria o novo para a etapa de destino
2. Cria entrada no activity log com `activity_type="card_moved"` e descrição `"Etapa alterada (automação): X → Y"`

Ambos os registros são feitos em `try/except` independentes para não interromper a execução da automação em caso de erro.

**Arquivo alterado:** `app/services/automation_service.py`

---

## [1.6.9] - 2026-03-18

### Adicionado

#### Relatórios — campos Vendedor e SDR no Histórico de Etapas

Os campos `assigned_to` (Vendedor) e `sdr` (SDR) foram adicionados à fonte **Histórico de Etapas** (`card_history`) no catálogo de campos do gerador de relatórios.

Agora é possível:
- **Eixo X = Vendedor / SDR**: agrupa as entradas de etapa por responsável, filtrando pelo período via `CardListHistory.entered_at` (não por `Card.created_at`, que seria incorreto neste contexto)
- **Dividir por = Vendedor / SDR**: gera uma série por vendedor — ex: X=Etapa, Split=Vendedor → barras agrupadas mostrando quantos cards cada vendedor enviou para cada etapa

**Implementação técnica:** as 3 funções críticas do query engine foram atualizadas para `card_history + assigned_to/sdr`:
- `_get_x_labels_and_order`: JOIN `User → Card → CardListHistory` filtrando por `entered_at`
- `_fetch_split_values`: mesma lógica para popular os checkboxes de séries
- `_build_split_filter`: subquery `CardListHistory.card_id IN (SELECT id FROM cards WHERE assigned_to_id = X)` sem exigir JOIN extra nas queries especializadas

---

#### Relatórios — filtro de valores do Eixo X

Nova seção "Filtrar valores do Eixo X" no painel de configuração de gráfico. Aparece automaticamente quando o campo X é categórico (não-date): etapas, vendedores, SDRs, canais, status, etc.

Comportamento: checkboxes com todos os valores disponíveis — desmarcar remove o valor do gráfico. Útil para funis onde o usuário quer exibir apenas algumas etapas.

**Implementação:**
- `QueryRequest` ganhou `x_filter_values: Optional[List[Union[str, int, float]]]`
- Em `execute_query`, após `_get_x_labels_and_order`, filtra `label_raw_pairs` pelos valores selecionados
- Frontend (`ChartConfigPanel`): estado `xFilterValues`, `availableXValues`, useEffect que busca via `fetchSplitValues` (endpoint reaproveitado), handler `toggleXFilterValue` e UI de checkboxes em verde (distinto do violeta do "Dividir por")

---

#### Relatórios — agregação Soma Cumulativa

Nova opção de agregação **Soma Cumulativa** (`cumulative_sum`) disponível para campos numéricos e monetários. Soma o valor do campo por período e acumula progressivamente — útil para ver receita acumulada de negócios ganhos ao longo do tempo.

Diferença em relação à Contagem Cumulativa:
- **Contagem Cumulativa**: conta registros por bucket e acumula (ex: 3 ganhos, 2 ganhos, 5 ganhos → 3, 5, 10)
- **Soma Cumulativa**: soma valores por bucket e acumula (ex: R$3.500, R$1.200, R$8.100 → R$3.500, R$4.700, R$12.800)

O ciclo de agregações para campos numéricos/moeda passa a ser: `Contagem → Cont. Distinta → Soma → Média → Cont. Cumulativa → Soma Cumulativa`.

---

### Corrigido

#### Relatórios — Contagem Cumulativa iniciava com valor errado

`_get_cumulative_count` ignorava o `y_key` original e sempre usava `y_key='count'` internamente, fazendo `COUNT(Card.id)` para qualquer campo. Para `won_count` (Negócios Ganhos), isso contava **todos** os cards fechados no dia em vez de apenas os ganhos.

**Exemplo do bug:** dia 1 com 3 negócios ganhos e 53 outros cards fechados → cumulativa começava em 56 em vez de 3.

**Correção:** `_get_cumulative_count` agora recebe e preserva o `y_key` original. O parâmetro `inner_agg` controla se a agregação por período é contagem (`'count'`) ou soma (`'sum'`). O `_build_y_agg_expr` já tinha todos os casos especiais (`won_count`, `meeting_count`, etc.) e os aplica corretamente.

**Arquivos alterados — Backend:**
- `app/schemas/custom_report.py` — `cumulative_sum` adicionado ao Literal de agregações
- `app/services/custom_report_service.py` — `_get_cumulative_count` com parâmetros `y_key` e `inner_agg`; `_get_y_values_for_labels` com case `cumulative_sum`; campos `assigned_to`/`sdr` no catálogo e handlers de `card_history`; `x_filter_values` em `execute_query`

**Arquivos alterados — Frontend:**
- `components/reports/reportTypes.ts` — `AggregationType` e `ChartConfig.x_filter_values`
- `services/reportService.ts` — `x_filter_values` no payload de `queryChart`
- `components/reports/ChartConfigPanel.tsx` — estado e UI do filtro X; label e ciclo de `cumulative_sum`

---

## [1.6.8] - 2026-03-18

### Corrigido

#### Bug crítico — SDR conseguia vincular responsável ao criar/editar card

SDRs não deveriam poder criar cards com um `assigned_to_id` (vendedor responsável) definido — a regra de negócio exige que o card seja atribuído ao próprio SDR automaticamente. O bug ocorria em dois pontos independentes:

**Backend — `app/services/card_service.py`:**
O service sobrescrevia `assigned_to_id` via atribuição direta (`card_data.assigned_to_id = None`), mas o repositório usava `model_dump(exclude_unset=True)`, que lê `__pydantic_fields_set__` (definido na construção do objeto). Atribuição direta **não atualiza** esse conjunto interno, então o valor original do request payload continuava sendo gravado.

Correção: substituído por `model_copy(update={...})`, que é a forma idiomática do Pydantic v2 para sobrescrever campos mantendo o tracking de `__pydantic_fields_set__` correto.

```python
# Antes (quebrado)
card_data.assigned_to_id = None   # não atualiza __pydantic_fields_set__

# Depois (correto)
card_data = card_data.model_copy(update={"assigned_to_id": None, "sdr_id": current_user.id})
```

**Frontend — `frontend/src/components/kanban/CardModal.tsx`:**
No modo de **edição**, o `formData` era inicializado com os dados do card existente (incluindo `assigned_to_id`). O campo era desabilitado na UI, mas o `...formData` no payload de submit ainda enviava o valor no PUT. Na criação, o campo começa como `undefined` e não vaza — o bug era exclusivo do modo edição.

Correção: `delete payload.assigned_to_id` explícito para SDR e `delete payload.sdr_id` para salesperson antes de chamar `onSave`.

**Arquivos alterados:**
- `app/services/card_service.py` — `create_card`: `model_copy(update={...})` para SDR e salesperson
- `frontend/src/components/kanban/CardModal.tsx` — `handleSubmit`: remoção explícita dos campos restritos por role

---

### Melhorado

#### Painel de detalhes dos logs de auditoria — exibição antes/depois reformulada

O painel expandido na aba de Logs de Auditoria em **Configurações** foi completamente reformulado:

- **UPDATE / STATUS_CHANGE / TRANSFER**: exibe tabela comparativa com colunas "Antes" (laranja) e "Depois" (verde) — somente os campos que realmente mudaram ficam em destaque; os demais aparecem em lista compacta abaixo
- **CREATE**: exibe snapshot completo com todos os campos, incluindo os que estavam vazios (exibidos como "—" em itálico cinza), com cabeçalho "Dados no momento da criação"
- **DELETE**: mesmo formato do CREATE, com cabeçalho "Dados antes da exclusão"
- Mapeamento de labels para 40+ campos de todas as entidades (card, board, usuário, cliente, contato)
- Formatação automática de valores monetários (`R$ X,XX`), booleanos (`Sim`/`Não`), status de conta (`Ativo`/`Inativo`) e datas

**Arquivo alterado:**
- `frontend/src/pages/Settings.tsx` — componente de linha expandida do log de auditoria

---

## [1.6.7] - 2026-03-18

### Melhorado

#### Logs de Auditoria — snapshots completos de antes e depois em todas as entidades principais

A maioria das operações de escrita do sistema não registrava os dados `data_before` e `data_after` nos logs de auditoria — apenas a descrição textual era salva. Agora **todas as entidades principais** registram o estado completo antes e depois de cada alteração.

**Cobertura por entidade:**

| Entidade | CREATE | UPDATE | DELETE |
|---|---|---|---|
| Card | `data_after` já existia | `data_before` + `data_after` adicionados | `data_before` adicionado |
| Board | `data_after` adicionado | `data_before` + `data_after` adicionados | `data_before` adicionado |
| User | `data_after` adicionado | `data_before` + `data_after` adicionados | `data_before` adicionado |
| Client | log inexistente — criado do zero com `data_after` | log inexistente — criado do zero com `data_before` + `data_after` | log inexistente — criado do zero com `data_before` |
| Person | log inexistente — criado do zero com `data_after` | log inexistente — criado do zero com `data_before` + `data_after` | log inexistente — criado do zero com `data_before` |

**Ações especiais de Card:**
- `STATUS_CHANGE` (mover card): agora registra `list_id` e `list_name` da lista de origem em `data_before` e da lista de destino em `data_after`
- `TRANSFER` (transferir responsável): agora registra `assigned_to_id` e `assigned_to_name` do responsável anterior em `data_before` e do novo em `data_after`

**Estratégia técnica nos UPDATEs:**
O estado anterior é capturado como `dict` simples antes de chamar o service — evitando que a referência ao objeto SQLAlchemy seja modificada na mesma sessão antes do log ser salvo.

**Arquivos alterados — Backend:**
- `app/api/v1/endpoints/cards.py` — `update_card`, `delete_card`, `move_card`, `assign_card` com snapshots
- `app/api/v1/endpoints/boards.py` — `create_board`, `update_board`, `delete_board` com snapshots
- `app/api/v1/endpoints/users.py` — `create_user`, `update_user`, `delete_user` com snapshots
- `app/api/v1/endpoints/clients.py` — audit log criado do zero (import `Request`, `AuditLog`, `Client`); `create_client`, `update_client`, `delete_client`
- `app/api/v1/endpoints/persons.py` — audit log criado do zero (import `Request`, `AuditLog`, `Person`); `create_person`, `update_person`, `delete_person`

---

## [1.6.6] - 2026-03-17

### Adicionado

#### Logs de Auditoria — pesquisa manual com filtro por usuário

A aba de Logs de Auditoria foi reformulada para trabalhar sob demanda em vez de carregar automaticamente.

**Melhorias na interface:**
- Logs **não carregam mais automaticamente** ao abrir a aba — era inviável pois o dia inteiro já ultrapassava 100 registros
- Novo botão **Pesquisar** dispara a busca com os filtros selecionados
- Atalhos de período: **Hoje**, **Ontem**, **Últimos 7 dias**, **Este mês** preenchem as datas com um clique
- Novo filtro por **Usuário** — afunila a busca para as ações de uma pessoa específica
- Contador de resultados exibido após a pesquisa ("X registros encontrados")
- Placeholder orientativo enquanto nenhuma pesquisa foi realizada
- Paginação aumentada de 20 para 25 itens por página

**Melhorias técnicas:**
- Limite do backend aumentado de 100 para 500 registros por requisição
- Log de criação de card agora registra snapshot completo em `data_after`: responsável, SDR, lista, valor, vencimento
- Descrição do log de criação enriquecida: `"Card criado: Título | Responsável: João | Lista: Lead Novo | Valor: R$ 5.000,00"`
- Endpoint `GET /api/v1/audit-logs` agora retorna `data_before` e `data_after` na resposta
- Linhas com detalhes expandíveis na tabela: clique em qualquer registro com snapshot para ver os dados do evento

**Arquivos alterados — Backend:**
- `app/api/v1/endpoints/audit_logs.py` — limite `le=500`; `data_before`/`data_after` incluídos na resposta
- `app/api/v1/endpoints/cards.py` — log de criação com `data_after` e descrição rica

**Arquivos alterados — Frontend:**
- `src/pages/Settings.tsx` — botão Pesquisar; atalhos de período; filtro por usuário; linha expandível; estados `logsSearched`, `expandedLogIds`, `availableLogUsers`
- `src/services/auditLogService.ts` — interface `AuditLog` com `data_before`/`data_after`

### Corrigido

#### Segurança: SDR não pode atribuir vendedor via API direta

O frontend já bloqueava visualmente o campo "Responsável" para usuários SDR na criação de cards, mas a restrição **não era aplicada no backend** — qualquer chamada direta à API podia ignorá-la.

- **SDR**: `assigned_to_id` é forçado para `null` e `sdr_id` é forçado para o próprio usuário, independente do payload recebido
- **Vendedor (salesperson)**: `assigned_to_id` é forçado para o próprio usuário e `sdr_id` é forçado para `null`
- **Admin/Manager**: sem restrição, podem definir qualquer combinação livremente

**Arquivo alterado:**
- `app/services/card_service.py` — validação de role em `create_card` antes de persistir

---

## [1.6.5] - 2026-03-17

### Adicionado

#### Filtro de séries no "Dividir por" (Relatórios Customizados)

Ao configurar o campo **Dividir por** em um gráfico, agora é possível selecionar exatamente quais séries devem ser exibidas — em vez de mostrar todas as etapas/vendedores/categorias disponíveis.

**Como usar:**
1. Arraste um campo para a zona **Dividir por** (ex: Etapa do Pipeline)
2. Uma lista de checkboxes aparece abaixo com todas as séries disponíveis
3. Desmarque as séries que não deseja ver no gráfico
4. O gráfico atualiza em tempo real
5. Clique em "Exibir todas" para remover o filtro

**Detalhes técnicos:**
- Novo endpoint `POST /api/v1/reports/split-values` retorna os valores disponíveis (label + raw_value) para qualquer campo split_by
- `QueryRequest` recebe novo campo opcional `split_filter_values: List[Union[str, int, float]]` — quando preenchido, apenas as séries com matching raw_value são geradas
- O filtro é persistido junto com a configuração do gráfico (salvo no relatório)
- Exportação Excel/CSV respeita o filtro de séries

**Arquivos alterados — Backend:**
- `app/schemas/custom_report.py` — `QueryRequest.split_filter_values`; novos schemas `SplitValuesRequest`, `SplitValueItem`, `SplitValuesResponse`
- `app/api/v1/endpoints/custom_reports.py` — endpoint `POST /split-values`; exportação passa `split_filter_values`
- `app/services/custom_report_service.py` — `execute_query` filtra `split_values` por `split_filter_values` antes de gerar séries

**Arquivos alterados — Frontend:**
- `src/components/reports/reportTypes.ts` — `ChartConfig.split_filter_values?: (string | number)[]`
- `src/services/reportService.ts` — método `fetchSplitValues(source, key)`; `queryChart` passa `split_filter_values`
- `src/components/reports/ChartConfigPanel.tsx` — checkboxes de filtro abaixo do campo Dividir por; estados `splitFilterValues`, `availableSplitValues`; handler `toggleSplitFilterValue`

---

## [1.6.4] - 2026-03-17

### Adicionado

#### Novos campos na fonte "Histórico de Etapas" e suporte a barras horizontais

**Barras Horizontais (`bar_horizontal`)**

Novo tipo de gráfico disponível no construtor de relatórios. Ideal para visualizar rankings e funis com etapas de nomes longos, pois os rótulos ficam no eixo Y com espaço suficiente para leitura.

- Categorias no eixo Y, valores no eixo X
- Suporta múltiplas séries e split_by (igual ao `bar` vertical)
- Altura dinâmica proporcional ao número de categorias
- Largura do eixo Y calculada pelo label mais longo para evitar corte de texto

**Arquivos alterados:**
- `src/components/reports/reportTypes.ts` — `'bar_horizontal'` adicionado ao tipo `ChartType`
- `src/components/reports/ChartConfigPanel.tsx` — nova opção no seletor de tipo; `isMultiSeriesType` e `willBeSingleSeries` atualizados; grid 5 colunas sem rótulos (só ícones com tooltip)
- `src/components/reports/ChartWidget.tsx` — `case 'bar_horizontal'` com `layout="vertical"`; `TYPE_LABELS` atualizado

---

**Novos campos na fonte "Histórico de Etapas" (`card_history`)**

Quatro novos campos adicionados à fonte, expandindo as possibilidades analíticas:

| Campo | Tipo | Uso |
|---|---|---|
| Data de Entrada na Etapa (`entered_at`) | Data | Eixo X por dia/semana/mês — ideal para contagem cumulativa |
| Data Entrada Prospecção | Data | Quantos cards entraram no board Prospecção por período |
| Data Entrada Aquisição | Data | Quantos cards entraram no board Aquisição por período |
| Data Entrada Expansão | Data | Quantos cards entraram no board Expansão por período |

**Como montar contagem cumulativa por dia da etapa:**
1. Fonte: Histórico de Etapas
2. Eixo X → **Data de Entrada na Etapa**, agrupar por **Dia**
3. Eixo Y → Negócios que Entraram + **Contagem Cumulativa**
4. Dividir por → **Etapa do Pipeline** (uma série por etapa)
5. Tipo: Linha ou Área

**Correções internas:**
- `_get_split_values`: adicionado handler para `card_history` + `stage_name` — busca etapas distintas via `CardListHistory JOIN BoardList`, ordenadas por board e posição
- `_build_split_filter`: adicionado handler para `card_history` + `stage_name` — gera filtro `CardListHistory.list_id == raw_value`
- Handler de `entered_at` em `_get_x_labels_and_order` movido para antes do bloco genérico de datas (evitava retorno `[]` por `date_col None`)
- `_run_y_agg_query`: `cumulative_count` agora funciona com `card_history` (detecta `y_key='count'` além de `'entry_count'`)

**Arquivos alterados — Backend:**
- `app/services/custom_report_service.py` — catálogo atualizado; `_get_x_date_col`, `_get_x_labels_and_order`, `_get_split_values`, `_build_split_filter`, `_run_y_agg_query` atualizados; novos métodos `_run_entered_at_query` e `_run_board_entry_query`

---

## [1.6.3] - 2026-03-17

### Adicionado

#### Nova fonte de dados no relatórios: Histórico de Etapas (`card_history`)

Adicionada a fonte de dados **"Histórico de Etapas"** no construtor de relatórios, permitindo criar gráficos de funil de conversão por etapa do pipeline.

A fonte consulta diretamente a tabela `card_list_history`, que registra toda movimentação de cards entre listas com carimbo de data/hora de entrada (`entered_at`). Com isso, é possível saber quantos negócios *entraram* em cada etapa dentro de um período — diferente da fonte `cards`, que mostra onde os negócios *estão* no momento.

**Campos disponíveis na fonte:**
- `stage_name` (Etapa do Pipeline) — dimensão categórica agrupável pelo eixo X; etapas ordenadas por board e posição do pipeline
- `entry_count` (Negócios que Entraram) — métrica agregável pelo eixo Y; usa `COUNT(DISTINCT card_id)` para evitar duplicatas

**Como montar o gráfico de funil:**
1. Criar relatório com fonte **"Histórico de Etapas"**
2. Eixo X → **"Etapa do Pipeline"**
3. Eixo Y → **"Negócios que Entraram"** (agregação: Contagem)
4. Selecionar o período desejado
5. Tipo de gráfico: **bar** ou **funnel**

**Observação:** a fonte retorna etapas de todos os boards (Prospecção, Aquisição, Expansão) ordenadas por board e posição. O filtro de período aplica-se sobre `entered_at` — a data em que o card entrou naquela etapa, não a data de criação do card.

**Arquivos alterados — Backend:**
- `app/schemas/custom_report.py` — `card_history` adicionado ao `Literal` de source em `AxisFieldSchema`, `CalculatedFieldSchema` e `ValidateFormulaRequest`; campo `card_history` adicionado ao `FieldCatalogResponse`
- `app/services/custom_report_service.py` — nova source `card_history` no catálogo; `_get_source_primary_date_col` mapeado para `CardListHistory.entered_at`; handler `stage_name` em `_get_x_labels_and_order`; hook em `_run_y_agg_query`; novo método `_run_stage_entry_query`

**Arquivos alterados — Frontend:**
- `src/components/reports/reportTypes.ts` — `'card_history'` adicionado ao tipo `DataSource` e ao `DATA_SOURCE_LABELS`
- `src/components/reports/NewReportModal.tsx` — `'card_history'` adicionado ao `ALL_SOURCES`

---

## [1.6.2] - 2026-03-17

### Alterado

#### Movimentação retroativa de cards no pipeline

Vendedores agora podem mover um card para a etapa anterior do pipeline. A regra de "não pular etapas" continua valendo em ambas as direções — só é possível avançar ou voltar uma etapa por vez.

**Regras após a mudança:**
- Avançar: somente para a próxima etapa (sem pular)
- Voltar: somente para a etapa imediatamente anterior (sem pular)
- Admin e manager continuam com movimentação livre

**Casos especiais — Board Prospecção (id=6):**
O mapa de transições foi atualizado para incluir os retornos possíveis, respeitando o fluxo especial da etapa "Reagendamento" (que só é alimentada pelo botão No Show):
- `Lead Novo` → `Prospecção` (somente avança)
- `Prospecção` ↔ `Lead Novo` / `Conectado`
- `Conectado` ↔ `Prospecção` / `Agendado`
- `Agendado` → `Conectado` (volta direto para Conectado, pulando Reagendamento)
- `Reagendamento` → `Agendado` (sem retorno, fluxo exclusivo do No Show)

**Arquivo alterado:** `backend/app/services/card_service.py` — `_validate_stage_advancement`

---

#### Visibilidade de cards liberada para todos os roles

Vendedores (`salesperson`) e SDRs passaram a visualizar todos os cards do pipeline, independente de estarem atribuídos. A restrição de escrita foi mantida — cada role só pode editar cards aos quais está vinculado.

**Regras após a mudança:**

| Ação | Admin / Manager | Salesperson | SDR |
|------|----------------|-------------|-----|
| Visualizar card | Todos | Todos | Todos |
| Editar card | Todos | Somente `assigned_to == seu id` | Somente `sdr_id == seu id` |
| Mover card | Todos | Somente `assigned_to == seu id` | Somente `sdr_id == seu id` |
| Deletar card | Todos | Não permitido | Não permitido |
| Busca global | Todos | Todos | Todos |

**Arquivos alterados:**
- `backend/app/services/card_service.py` — removida restrição em `get_card_by_id`; adicionado método `_check_write_permission`; aplicado em `update_card` e `move_card`
- `backend/app/api/v1/endpoints/cards.py` — removido filtro por role na busca global

---

## [1.6.1] - 2026-03-16

### Corrigido

#### Botão "Reabrir Negócio" retornando erro 403

O reopen criava o card clone na lista **Lead Novo** (id=22), mas a regra de negócio exige criação apenas na lista **Prospecção** (id=23) — onde a validação do `create_card` permite a entrada de vendedores e SDRs. Com isso, qualquer tentativa de reabrir um negócio resultava em 403 Forbidden.

**Correção** (`backend/app/services/card_service.py` — `reopen_card`):
- `TARGET_LIST_ID` corrigido de `22` para `23`

---

## [1.6.0] - 2026-03-16

### Adicionado / Alterado

#### Remodelação completa do sistema de gamificação (v2)

Reescrita total do módulo de gamificação para corrigir problemas estruturais e adicionar suporte a boards separados, sistema de comissão SDR e rankings calculados por scheduler.

---

**Problemas resolvidos:**

1. **Pontos hardcoded no código** — `ACTION_POINTS` era um dicionário estático no código. Agora `award_points()` consulta a tabela `gamification_action_points` no banco. Se uma ação não estiver configurada, é ignorada silenciosamente sem exceção.

2. **Sem separação por board** — todos os pontos e rankings eram misturados. Agora cada ponto, ranking e configuração de ação pertence a um `board_type` (`prospecting` ou `acquisition`). Boards sem `board_type` (Expansão) não pontuam.

3. **Rankings misturavam SDR e Vendedor** — agora há dois rankings independentes, um por board. Apenas roles `salesperson` e `sdr` participam.

4. **Maioria das ações nunca disparava pontos** — adicionados disparos em `card_service`, `card_task_service` e `attachment_service` para cobrir: `card_created`, `card_moved`, `card_won`, `card_lost`, `meeting_created`, `meeting_completed`, `call_completed`, `followup_completed`, `task_completed`, `proposal_attached`.

5. **Critérios de badges incompletos** — `_evaluate_badge_criteria()` agora suporta três tipos: `total_points`, `action_count` (com `action_type`) e `rank` (com `board_type` e `period`).

6. **Hard delete de badges apagava histórico** — badges agora têm soft delete via campo `deleted_at`. O histórico de conquistas dos usuários é preservado.

7. **Rankings recalculados por requisição** — agora calculados pelo scheduler a cada hora (8 combinações: 2 boards × 4 períodos). Endpoints apenas leem da tabela `gamification_rankings`.

---

**Sistema de comissão SDR:**

- `card_won` no board Aquisição: se o card tiver `sdr_id`, o SDR recebe 1/4 dos pontos como comissão
- `meeting_completed` no board Aquisição: se a task foi criada por um SDR (`task.created_by_id`), o SDR recebe 1/3 dos pontos como comissão
- Comissões são registradas como pontos no board `prospecting` do SDR com flag `is_commission = true`

---

**Arquivos alterados — Backend:**

- `app/models/board.py` — campo `board_type`
- `app/models/card_task.py` — campo `created_by_id` (FK para users)
- `app/models/gamification_point.py` — campos `board_type`, `is_commission`, `commission_source_user_id`, `commission_ratio`, `original_points`
- `app/models/gamification_badge.py` — campo `deleted_at` (soft delete)
- `app/models/gamification_ranking.py` — campo `board_type`, nova unique constraint `(user_id, board_type, period_type, period_start)`
- `app/models/gamification_action_points.py` — campo `board_type`, nova unique constraint `(board_type, action_type)`
- `app/schemas/gamification.py` — reescrita completa com `BoardPointsSummary`, `UserGamificationSummary` atualizado
- `app/repositories/gamification_repository.py` — todos os métodos atualizados com filtro `board_type`
- `app/services/gamification_service.py` — reescrita completa
- `app/services/card_service.py` — disparos de pontos em `move_card` e `create_card`
- `app/services/card_task_service.py` — disparos de pontos em `toggle_complete` e `create_task`; campo `created_by_id` preenchido
- `app/services/attachment_service.py` — disparo `proposal_attached` na primeira proposta do card
- `app/api/v1/endpoints/gamification.py` — endpoints atualizados com `board_type`
- `app/workers/scheduler.py` — job de recálculo horário dos rankings
- `app/workers/badge_checker.py` — delega avaliação ao service
- `alembic/versions/2026_03_17_1000-gamification_remodulacao_v2.py` — migration completa

**Arquivos alterados — Frontend:**

- `src/services/gamificationService.ts` — tipos e assinaturas atualizados
- `src/pages/Gamification.tsx` — seletor de board nos rankings, cards de perfil por board, posições separadas por board, role exibida na tabela
- `src/pages/BadgesAdmin.tsx` — critérios automáticos com `action_count`, `rank`, `board_type`
- `src/components/settings/BadgeModal.tsx` — formulário de critérios expandido
- `src/pages/Settings.tsx` — action-points com coluna board, chave composta `board_type|action_type`

---

## [1.5.3] - 2026-03-17

### Corrigido

#### Botão "Reabrir Negócio" não vinculava empresa e contato corretamente

Ao reabrir um card perdido, o clone era criado na lista de destino mas sem o cliente (`client_id`) e o contato (`person_id`) vinculados corretamente.

**Causa raiz — dois problemas combinados:**

1. **`person_id` nunca chegava ao banco** — o campo não era incluído no `CardCreate` do reopen. O repositório usa `model_dump(exclude_unset=True)`, então campos não declarados explicitamente no construtor eram silenciosamente ignorados. O bloco `try/except` que tentava corrigi-los após a criação falhava silenciosamente (apenas printava no console).

2. **`client_id` podia derrubar o reopen inteiro com HTTP 422** — o `create_card` aplica validações do blueprint da consultora (exige `sector` e `relationship_type` no cliente). Clientes importados do Pipedrive frequentemente não têm esses campos, fazendo o reopen falhar completamente para esses registros.

**Correção** (`backend/app/services/card_service.py` — `reopen_card`):
- `client_id` e `person_id` removidos do `CardCreate` do reopen
- Ambos agora são vinculados diretamente no ORM após a criação, num único `commit`, junto com `contact_info` — bypassando as validações do blueprint que não fazem sentido no contexto de reabertura

#### Erro 403 ao criar card como vendedor/SDR

Vendedores e SDRs recebiam `403 Forbidden` ao tentar criar um card no board Prospecção.

**Causa:** o backend validava se o card estava sendo criado na **primeira lista por posição** do board 6, mas a regra de negócio foi atualizada para permitir criação apenas na lista chamada **"Prospecção"** (segunda lista, onde cards criados manualmente já chegam com contexto prévio). O frontend já refletia essa regra, mas o backend ainda usava a lógica antiga.

**Correção** (`backend/app/services/card_service.py` — `create_card`):
- Validação alterada de "primeira lista por posição" para "lista com `name == 'Prospecção'` no board 6"
- Mensagem de erro atualizada para refletir a nova regra

### Alterado

#### Seletor de lista travado para vendedores e SDRs no modal "Novo Card"

No modal de criação de card, o campo **"Lista"** agora fica desabilitado para roles que não são admin nem manager. A regra de negócio exige que vendedores e SDRs só criem cards na lista "Prospecção" do board Prospecção, então não faz sentido exibir o seletor como editável para esses usuários.

**Arquivo alterado:** `frontend/src/components/kanban/CardModal.tsx`
- Adicionada flag `isPrivileged` (true apenas para `admin` e `manager`)
- `Select` de lista recebe `disabled={!isPrivileged}` para os demais roles
- `hint` do campo atualizado dinamicamente: exibe a restrição quando travado

#### Componente `SelectMenu` local removido do `KanbanBoard.tsx`

O arquivo `KanbanBoard.tsx` continha uma cópia local do componente `SelectMenu` que não tinha a prop `size`, causando erro de TypeScript nos filtros do Kanban (`Property 'size' does not exist on type 'IntrinsicAttributes & SelectMenuProps'`).

**Correção** (`frontend/src/pages/KanbanBoard.tsx`):
- Componente local `SelectMenu` (interface + implementação) removido
- Adicionado import do `SelectMenu` já existente em `components/common`, que já suporta `size?: "md" | "sm"`
- Import `ChevronDown` do lucide-react removido (ficou órfão após remoção do componente local)

---

## [1.5.2] - 2026-03-13

### Adicionado

#### Novos tipos de gráfico nos Relatórios Customizados

Cinco novos tipos disponíveis no seletor de tipo de gráfico (`ChartConfigPanel`):

- **Área** (`area`) — igual ao de linha, mas com preenchimento abaixo da curva. Suporta multi-série e split_by, assim como bar/line.
- **Dispersão** (`scatter`) — dot plot por categoria. Cada label do eixo X vira um ponto posicionado pelo valor do eixo Y. Útil para visualizar distribuição e outliers.
- **Radar** (`radar`) — gráfico aranha. Cada label do eixo X vira um eixo radial, ideal para comparar vendedores em múltiplas métricas simultaneamente.
- **Funil** (`funnel`) — etapas ordenadas automaticamente do maior para o menor valor. Ideal para visualizar a conversão entre etapas do pipeline.
- **KPI** (`kpi`) — exibe o total da métrica em destaque (número grande), com indicador de tendência percentual calculado a partir da variação entre o primeiro e o último valor da série.

**Arquivos alterados:**
- `frontend/src/components/reports/reportTypes.ts` — `ChartType` expandido com os 5 novos tipos
- `frontend/src/components/reports/ChartWidget.tsx` — novos `case`s no `renderChart()`, imports do Recharts (`AreaChart`, `ScatterChart`, `RadarChart`, `FunnelChart` e componentes auxiliares) e tratamento especial do KPI antes do empty-state check
- `frontend/src/components/reports/ChartConfigPanel.tsx` — `CHART_TYPE_OPTIONS` atualizado (grid `3×3`), `isMultiSeriesType` inclui `area`, lógica de single-series estendida para os novos tipos

#### Novas métricas de tarefas nos Relatórios

Três novos campos agregáveis na fonte **Tarefas**:

| Campo | Expressão SQL |
|-------|---------------|
| `call_count` | `COUNT(CASE WHEN task_type='call' THEN 1 END)` |
| `completed_call_count` | `COUNT(CASE WHEN task_type='call' AND is_completed=true THEN 1 END)` |
| `noshow_count` | `COUNT(CASE WHEN task_type='meeting' AND is_noshow=true THEN 1 END)` |

**Arquivo alterado:** `backend/app/services/custom_report_service.py`
- Catálogo de campos (`get_field_catalog`)
- Expressões de agregação (`_build_y_expr`)
- Filtros da query base de tasks

#### Rastreamento de NoShow em reuniões

Reuniões marcadas como NoShow agora persistem um campo próprio no banco, separando-as de reuniões concluídas normalmente.

**Migration:** `alembic/versions/2026_03_13_1100-add_is_noshow_to_card_tasks.py`
- Coluna `is_noshow BOOLEAN NOT NULL DEFAULT FALSE` na tabela `card_tasks`

**Backend — model** (`app/models/card_task.py`)
- Campo `is_noshow` adicionado ao `CardTask`
- Helper `mark_as_noshow()` seta `is_completed`, `completed_at` e `is_noshow` de uma vez

**Backend — schema** (`app/schemas/card_task.py`)
- Campo `is_noshow: bool = False` exposto no `CardTaskResponse`

**Backend — endpoint** `PATCH /api/v1/card-tasks/{task_id}/noshow`
- Valida que a tarefa é do tipo `meeting` (HTTP 400 caso contrário)
- Chama `mark_as_noshow()` e registra no audit log com action `"NOSHOW"`
- Bloqueado para role Viewer via `require_not_viewer`

**Frontend — `cardTaskService.ts`**
- Novo método `markNoShow(id)` — chama `PATCH /api/v1/card-tasks/{id}/noshow`

**Frontend — `useActivityActions.ts` e `FocusSection.tsx`**
- `handleNoShow` substituiu `cardTaskService.toggleComplete(taskId, true)` pelo novo `cardTaskService.markNoShow(taskId)`

---

## [1.5.1] - 2026-03-12

### Adicionado

#### Campos Calculados nos Relatórios (DAX-like)

Permite criar métricas derivadas combinando campos existentes com expressões aritméticas, inspirado no DAX do Power BI.

**Exemplos de uso:**
- `[won_count] / [count] * 100` → Taxa de Conversão (%)
- `[value] / [won_count]` → Ticket Médio

**Backend — `app/core/formula_evaluator.py`** (novo arquivo)

Avaliador seguro de fórmulas usando `ast.parse()` + `NodeVisitor` com whitelist explícita de nós permitidos (`BinOp`, `UnaryOp`, `Constant`, `Name`, operadores aritméticos). Nunca usa `eval()` puro.

Métodos:
- `validate(formula)` → lista de erros de sintaxe e nós proibidos
- `extract_dependencies(formula)` → set de `field_key` referenciados
- `evaluate(formula, values)` → `float | None` (None em divisão por zero)
- `build_value_context(field_values)` → converte `{key: value}` para o formato de contexto interno

**Backend — schemas** (`app/schemas/custom_report.py`)
- `CalculatedFieldSchema` — id, name, formula, source, field_type
- `CalculatedYFieldSchema` — calculated_field_id, label, is_calculated=True
- `ValidateFormulaRequest` / `ValidateFormulaResponse` — is_valid, errors, dependencies
- `QueryRequest` recebe `calculated_y_fields` e `calculated_fields` opcionais

**Backend — service** (`app/services/custom_report_service.py`)
- `_resolve_calculated_field()` — extrai dependências da fórmula, busca métricas no cache (ou executa queries silenciosamente), avalia a fórmula label por label. Divisão por zero retorna `0.0`.
- `execute_query()` adaptado para processar campos Y normais primeiro (populando `metric_cache`) e depois os calculados
- Exportação Excel/CSV inclui campos calculados no `QueryRequest` de cada gráfico

**Backend — endpoint** (`POST /api/v1/reports/calculated-fields/validate`)

Valida fórmula via `FormulaEvaluator` + verifica se os `[field_key]` referenciados existem nos campos disponíveis da fonte informada.

**Frontend — `CalculatedFieldModal.tsx`** (novo componente)

Modal para criar e editar campos calculados:
- Autocomplete ao digitar `[` — dropdown sem biblioteca externa, posicionado absolutamente. Seleção insere `[field_key]` no cursor via `setSelectionRange`
- Validação local imediata (parênteses balanceados, chars permitidos, keys válidas)
- Validação via API com debounce de 500ms
- Feedback visual: borda verde/vermelha no textarea + ícone de status
- Botão Salvar desabilitado enquanto fórmula inválida ou nome vazio

**Frontend — `FieldPanel.tsx`**
- Nova seção "Calculados" ao final do painel com botão `+` para abrir modal
- Cada campo calculado é draggable, exibe badge `fx` azul e botão de editar (visível no hover)
- Drag serializa `{ is_calculated: true, calculated_field_id, label, source }`

**Frontend — `ChartConfigPanel.tsx`**
- Drop Y detecta `is_calculated: true` no payload e cria `CalculatedYFieldConfig`
- Chips de campos calculados exibem badge "Calculado" azul em vez do badge de agregação
- Type guards em todos os acessos ao union type `YFieldConfig`

**Frontend — `reportTypes.ts`**
- `CalculatedField` — id, name, formula, source, field_type
- `CalculatedYFieldConfig` — calculated_field_id, label, is_calculated: true
- `YFieldConfig` virou union type: campo normal com agregação **ou** campo calculado
- `CustomReportConfig` recebe `calculated_fields?: CalculatedField[]`

**Frontend — `reportService.ts`**
- `queryChart()` separa `y_fields` em normais e calculados, filtra campos calculados referenciados pelo gráfico
- `validateFormula(formula, source, availableKeys)` — chama `POST /calculated-fields/validate`
- `drillDown()` usa type narrowing para acessar `.field.source` e `.field.key` apenas em campos não-calculados

### Limitações conhecidas (fase 1)

- Escopo da fórmula: apenas operadores `+ - * /`, parênteses e literais numéricos
- Todos os `[field_key]` devem pertencer à mesma fonte do campo calculado
- Campos calculados não funcionam em modo `split_by`
- Dependências de campos calculados são sempre buscadas com agregação `count` — fórmulas que dependem de `sum` ou `avg` de um campo (ex: `[value] / [won_count]`) retornarão resultado incorreto até a correção planejada
- Um campo calculado não pode referenciar outro campo calculado

---

## [1.5.0] - 2026-03-12

### Adicionado

#### Página de Atividades (`/activities`)

Nova página centralizada para gerenciar todas as atividades pendentes do usuário sem precisar navegar pelos cards individualmente.

**Filtros disponíveis:**
- Período: Hoje, Atrasadas, Amanhã, Esta semana, Todas
- Tipo de atividade (call, meeting, task, follow_up, other)
- Prioridade (normal, high, urgent)
- Responsável — visível apenas para Admin e Gerente

**Comportamento por role:**
- `admin` / `manager`: veem filtro de responsável, sem botão "Iniciar Atividades" (uso para monitoramento)
- `salesperson` / `sdr`: botão "Iniciar Atividades" disponível para iniciar o Modo Foco
- `viewer`: acesso somente leitura, sem ações

**Paginação:** 10 atividades por página, server-side para todos os filtros exceto "Atrasadas" (client-side, pois usa endpoint `/overdue` sem suporte a paginação)

**Ordenação frontend:** atrasadas → hoje → amanhã → futuras, depois por data dentro de cada grupo

#### Modo Foco — `FocusMode` + `FocusModeCard`

Modal fullscreen (`z-[2500]`) para trabalhar nas atividades em sequência. Abre com snapshot das atividades no momento do clique.

**Layout duas colunas:**
- Esquerda (30%): resumo completo do negócio — título, cliente, pessoa de contato (nome, email, telefone, WhatsApp, tel. comercial), valor, etapa/board, responsável, SDR, data de fechamento esperada, atividades pendentes, descrição, anotações do negócio
- Direita (70%): detalhes da atividade — tipo, prioridade, StatusBadge, data, título, descrição, localização, link de vídeo, notas, anotações do card

**Fila de trabalho:** array mutável — tarefas concluídas/reagendadas/noshow são removidas da fila; tarefas puladas permanecem para revisita posterior

**Ações disponíveis:**
- `Ligar`: apenas para `task_type === "call"` com `cardInfo` carregado; abre modal de seleção de número se houver múltiplos
- `NoShow`: apenas para `task_type === "meeting"`; dispara automação ID 12 + marca como concluída
- `Concluir`: marca como concluída e remove da fila
- `Reagendar`: painel inline com data/hora; remove da fila após salvar
- `Editar`: painel inline com título, prioridade, descrição, notas e (para meetings) localização e link de vídeo; atualiza via `PUT /api/v1/card-tasks/:id`
- `Pular`: avança sem remover da fila

**Cache:** `cardCache` e `notesCache` via `useRef<Map>` — evita rebuscar card e anotações já carregados

**Contadores da sessão:** concluídas, reagendadas, puladas — exibidos na tela de conclusão (Trophy)

#### Hook `useActivityActions`

Hook central com toda a lógica de ações extraída, eliminando duplicação. Gerencia `loadingStates` granular por task ID e `phoneSelectState` para seleção de número.

### Modificado

#### Backend — `GET /api/v1/cards/:card_id`

- Adicionado busca de `client_name` via model `Client`
- Adicionado busca de dados completos da pessoa de contato: `person_name`, `person_email`, `person_phone`, `person_phone_whatsapp`, `person_phone_commercial`
- Corrigido bug: `card_to_response` recebia `list_name` e `board_id` nas posições de `sdr_name` e `sdr_avatar_url` (args posicionais incorretos → `sdr_avatar_url` recebia `int` causando `ValidationError`)

#### Backend — `GET /api/v1/card-tasks`

- Adicionados query params `due_date_start` e `due_date_end` para filtro de período

#### Schema `CardResponse`

- Adicionados campos: `client_name`, `person_name`, `person_email`, `person_phone`, `person_phone_whatsapp`, `person_phone_commercial`

#### Sidebar (`MainLayout`)

- "Atividades" movido para antes de "Boards" no menu lateral
- Versão atualizada para `v1.5.0`

#### `common/index.ts`

- Adicionado export de `EmptyState`

### Arquivos Adicionados

- `frontend/src/pages/Activities.tsx` — página principal de atividades
- `frontend/src/components/activities/ActivityCard.tsx` — card individual na listagem (somente leitura)
- `frontend/src/components/activities/ActivityFilters.tsx` — barra de filtros stateless
- `frontend/src/components/activities/FocusMode.tsx` — modal fullscreen de foco
- `frontend/src/components/activities/FocusModeCard.tsx` — conteúdo interno do FocusMode
- `frontend/src/hooks/useActivityActions.ts` — hook central de ações

---

## [1.4.0] - 2026-03-11

### Adicionado

#### Agent Growth — Widget de IA contextual

Novo widget flutuante de inteligência artificial disponível em todas as páginas autenticadas (exceto para usuários com role `viewer`). O Agent Growth oferece ações pré-definidas baseadas no contexto da página e no role do usuário, sem campo de texto livre — o usuário escolhe chips e recebe respostas geradas pelo LLM.

**Interface:**
- Botão circular fixo no canto inferior direito da tela (ícone Sparkles)
- Janela de chat de 380×520px com header, área de mensagens e chips de ação
- Responses renderizadas em Markdown (negrito, listas numeradas, listas com bullets)
- Badge no header indica o contexto ativo: Card atual / Board atual / Clientes / Geral
- Chips já usados ficam visíveis com ícone ✓ e desabilitados (sem sumir da tela)
- Quando todos os chips foram usados, o sistema oferece "Limpar conversa e recomeçar"
- Histórico de conversa armazenado apenas no frontend — reinicia ao fechar o widget

**Contexto e chips por página:**

| Página | Contexto detectado | Dados enviados ao backend |
|---|---|---|
| `/boards/:boardId/cards/:cardId` | `card_detail` | card_id + board_id |
| `/boards/:boardId` | `board` | board_id |
| `/clients` | `clients` | — |
| qualquer outra | `general` | — |

**Chips disponíveis por role e contexto (Vendedor):**
- `card_detail`: Resumir este negócio, Sugerir próximos passos, Gerar e-mail de follow-up, Gerar e-mail de proposta, Como lidar com objeções
- `board`: O que tenho para fazer hoje, Quick win para hoje, Como foi meu dia hoje, Analisar meu pipeline
- `clients`: O que tenho para fazer hoje, Dicas de cold call, Como foi meu dia hoje
- `general`: O que tenho para fazer hoje, Como foi meu dia hoje, Dicas de produtividade

**Chips disponíveis por role e contexto (SDR):**
- `card_detail`: Resumir este negócio, Sugerir próximos passos, Gerar e-mail de follow-up, Dicas de cold call, Como lidar com objeções
- `board`: O que tenho para fazer hoje, Como foi meu dia hoje, Dicas de cold call, Quick win para hoje
- `clients`: O que tenho para fazer hoje, Dicas de cold call, Como foi meu dia hoje, Dicas de produtividade
- `general`: O que tenho para fazer hoje, Como foi meu dia hoje, Dicas de cold call, Dicas de produtividade

**Ações implementadas no backend:**

| action_id | Descrição |
|---|---|
| `summarize_card` | Resume o card atual: título, valor, etapa, responsáveis e notas recentes |
| `suggest_next_steps` | Sugere 3 a 5 ações concretas priorizadas para avançar o negócio |
| `email_followup` | Gera rascunho de e-mail de follow-up personalizado com dados do card |
| `email_proposal` | Gera rascunho de e-mail de proposta comercial com dados do card |
| `objection_handling` | Lista objeções prováveis para o negócio e scripts de resposta |
| `analyze_pipeline` | Analisa cards do board e identifica gargalos (gerentes veem equipe toda; vendedores veem só os próprios cards) |
| `quick_win_today` | Identifica o card com maior chance de fechar hoje e sugere 2–3 ações imediatas |
| `cold_call_tips` | Roteiro de cold call para vendas B2B com dicas de abordagem |
| `productivity_tips` | Dicas de produtividade direcionadas a vendedores |
| `my_day_tasks` | Lista atividades agendadas para hoje e atrasadas do usuário |
| `how_was_my_day` | Analisa as movimentações de cards e atividades criadas/concluídas no dia |

**Rate limiting via Redis (DB 2):**
- 20 chamadas por hora por usuário
- 80 chamadas por dia por usuário
- Retorna HTTP 429 com mensagem clara ao atingir o limite
- Graceful degradation: se Redis estiver offline, o sistema continua funcionando sem rate limit

**Endpoints adicionados:**
- `POST /api/v1/ai/agent/chat` — executa uma ação do agente
- `GET /api/v1/ai/agent/rate-limit-status` — consulta contadores sem incrementar

### Arquivos Adicionados
- `backend/app/core/ai_rate_limiter.py` — classe `AIRateLimiter` com pipeline Redis atômico
- `frontend/src/services/agentService.ts` — service para consumir os endpoints do agente
- `frontend/src/hooks/useAgentContext.ts` — hook que detecta contexto da página e role do usuário
- `frontend/src/components/agentGrowth/AgentLoadingIndicator.tsx` — três pontos animados
- `frontend/src/components/agentGrowth/AgentMessageBubble.tsx` — bubble de mensagem com suporte a Markdown
- `frontend/src/components/agentGrowth/AgentMessageList.tsx` — lista com auto-scroll
- `frontend/src/components/agentGrowth/AgentOptionChips.tsx` — grade de chips com três estados visuais
- `frontend/src/components/agentGrowth/AgentHeader.tsx` — header com badge de contexto ativo
- `frontend/src/components/agentGrowth/AgentChatWindow.tsx` — container principal do chat
- `frontend/src/components/agentGrowth/AgentGrowthWidget.tsx` — botão flutuante e toggle
- `frontend/src/components/agentGrowth/index.ts` — re-export do widget

### Arquivos Modificados
- `backend/app/core/config.py` — 3 novas variáveis: `REDIS_AI_RATE_DB`, `AI_RATE_LIMIT_PER_HOUR`, `AI_RATE_LIMIT_PER_DAY`
- `backend/app/core/redis_client.py` — segundo singleton Redis para rate limiting (DB 2)
- `backend/app/main.py` — startup/shutdown do novo cliente Redis
- `backend/app/schemas/ai.py` — enums `AgentActionId`, `AgentPageContext` e schemas `AgentChatRequest`, `AgentChatResponse`, `AgentRateLimitStatus`
- `backend/app/services/ai_service.py` — método `agent_chat()` e 11 prompts privados
- `backend/app/api/v1/endpoints/ai.py` — 2 novos endpoints do agente
- `frontend/src/types/index.ts` — tipos `AgentPageContext`, `AgentActionId`, `AgentOption`, `AgentMessage`, `AgentChatRequest`, `AgentChatResponse`, `AgentRateLimitStatus`
- `frontend/src/layouts/MainLayout.tsx` — montagem do `AgentGrowthWidget` (oculto para role `viewer`)

---

## [1.3.19] - 2026-03-11

### Adicionado

#### Notificações nativas do browser (estilo Chrome)

Quando um card é atribuído ao vendedor ou SDR, o sistema agora exibe uma notificação nativa do browser no canto da tela — igual às notificações do Gmail, Slack e outros serviços — mesmo que o sistema esteja em outra aba ou minimizado.

**Comportamento:**
- Aparece automaticamente quando uma nova notificação chega (polling de 30s)
- Exibe título, mensagem e ícone do HSGrowth
- Fecha sozinha após 6 segundos
- Ao clicar, foca a aba e navega diretamente para o card
- Não repete a mesma notificação na mesma sessão

**Permissão:**
- Ao carregar o sistema, um banner amarelo discreto aparece abaixo da navbar para usuários que ainda não concederam permissão
- O banner exibe a mensagem "Você ainda não autorizou as notificações do sistema" com link "clique aqui para ativar"
- O banner reaparece a cada F5/reload enquanto o usuário não decidir
- Não aparece para quem já aceitou ou bloqueou

#### Notificação de card atribuído ativada no sistema

O sistema de notificações agora dispara automaticamente em todos os cenários de atribuição de card:

- Card criado com vendedor ou SDR já definido
- Vendedor alterado manualmente no card
- SDR alterado manualmente no card
- Atribuição direta via endpoint dedicado
- Automação com ação `assign_card`
- Automação com rodízio de vendedor (`assign_round_robin`)
- Automação com rodízio de SDR (`assign_sdr_round_robin`)

Em todos os casos o sistema verifica se o responsável realmente mudou antes de notificar, evitando duplicatas.

### Corrigido

#### Notificações de "card avançou" e "pontos ganhos" desativadas

Removidas as notificações in-app de parabenização ao mover um card e de pontos ganhos por gamificação, a pedido da equipe. A concessão de pontos e o sistema de gamificação continuam funcionando normalmente — apenas as notificações foram desativadas.

#### Campo `link` das notificações agora populado corretamente

O campo `link` do schema `NotificationResponse` estava sempre retornando `null` pois não havia lógica para extraí-lo do `metadata.url`. Adicionado `model_validator` no Pydantic que popula automaticamente o `link` a partir de `metadata.url`. O frontend também recebeu fallback para `metadata.url` em notificações antigas criadas antes da correção.

#### Clique em notificação agora navega até o card

Tanto o clique na notificação do browser quanto o clique na notificação dentro do dropdown agora navegam corretamente até o card correspondente.

#### Browser notification não disparava quando contador ia de 0 para 1

Quando o vendedor tinha todas as notificações lidas e chegava uma nova (contador: 0 → 1), a notificação do browser não aparecia. Corrigido substituindo a condição `previousUnreadCount > 0` por um ref `isInitialCountLoad` que ignora apenas a carga inicial da página.

### Arquivos Modificados
- `frontend/src/components/NotificationDropdown.tsx` — browser notifications, fallback metadata.url, fix 0→1, remoção de navigate das deps
- `frontend/src/layouts/MainLayout.tsx` — banner de permissão de notificações
- `backend/app/schemas/notification.py` — model_validator para popular link do metadata.url
- `backend/app/services/card_service.py` — notificação card_assigned em create_card, update_card e assign_card; remoção de notify_card_moved e notify_points_awarded
- `backend/app/services/gamification_service.py` — remoção de notify_points_awarded
- `backend/app/services/automation_service.py` — notificação card_assigned em assign_card, assign_round_robin e assign_sdr_round_robin

---

## [1.3.18] - 2026-03-11

### Corrigido

#### Botão "Ligar Rápido" agora suporta seleção de número quando há múltiplos telefones

O botão de ligação rápida no CardDetails passava a ligar sempre para o primeiro número disponível da pessoa (ordem: Principal > WhatsApp > Comercial), ignorando os demais números cadastrados.

**Novo comportamento:**
- **1 número disponível:** liga diretamente, sem interrupção (comportamento anterior mantido)
- **2 ou 3 números disponíveis:** abre modal de seleção de número antes de discar, permitindo que o usuário escolha entre Principal, WhatsApp e/ou Comercial

**Detalhes da implementação:**
- Lógica de criação de atividade + chamada API4COM extraída para a função `executeQuickCall(person, phoneNumber)`, reutilizada tanto no fluxo direto quanto após a seleção no modal
- Novo estado `quickCallData` armazena pessoa e lista de números enquanto o modal está aberto
- Modal de seleção com o mesmo layout e comportamento já existente no `FocusSection.tsx`

### Arquivos Modificados
- `frontend/src/pages/CardDetails.tsx` — import do tipo `Person`, estado `quickCallData`, função `executeQuickCall`, refatoração de `handleQuickCall`, modal de seleção de número no JSX

---

## [1.3.17] - 2026-03-10

### Adicionado

#### Botão de ligação rápida no CardDetails

Novo botão "Ligar" posicionado na barra de abas do CardDetails (ao lado de Atividade, Anotações, Calendário e Arquivos), permitindo iniciar uma chamada via API4COM sem a necessidade de criar uma atividade manualmente antes de ligar.

**Comportamento:**
- Ao clicar, o sistema verifica se já existe uma atividade de ligação em aberto no card:
  - **Se sim:** o botão fica bloqueado e exibe um tooltip informando que já há uma atividade de ligação aberta — o usuário deve ir até ela para ligar.
  - **Se não:** cria automaticamente uma atividade de ligação com os seguintes dados pré-definidos:
    - **Título:** primeiro nome da pessoa vinculada ao card
    - **Descrição:** "Atividade criada automaticamente ao clicar no botão ligar"
    - **Tipo:** Ligação (`call`)
    - **Prioridade:** Normal
    - **Data:** data e hora atuais
  - Em seguida, disca imediatamente para o primeiro número disponível da pessoa (ordem: Principal > WhatsApp > Comercial).

**Validações:**
- Sem pessoa vinculada ao card → botão desabilitado
- Pessoa sem nenhum número cadastrado → exibe erro e encerra
- Já existe atividade de ligação aberta → botão desabilitado com tooltip explicativo

**Visibilidade:**
- Oculto para usuários com role `viewer`
- Oculto em cards marcados como Ganho ou Perdido

### Arquivos Modificados
- `frontend/src/pages/CardDetails.tsx` — novos imports (`Phone`, `Loader2`, `cardTaskService`, `api4comService`, `personService`), estado `isQuickCalling`, variável computada `hasOpenCallActivity`, função `handleQuickCall`, botão na barra de abas

---

#### Campos obrigatórios na criação de card (frontend)

A modal de criação de card foi expandida com novos campos obrigatórios, exigidos pela consultora para garantir qualidade dos dados desde o cadastro.

**Campos adicionados e obrigatórios na criação:**
- **Tipo de Negócio** (`deal_type`) — Nova Venda, Cross Sell ou Up Sell
- **Canal de Aquisição** (`acquisition_channel`) — Inbound, Outbound, Indicação, Parcerias, Eventos ou Base
- **Empresa (Organização)** — busca e vínculo obrigatório de uma empresa existente ou cadastro de nova empresa inline
- **Contato (Pessoa)** — busca e vínculo obrigatório de um contato existente ou cadastro de novo contato inline

**Comportamento das seções de Empresa e Contato:**
- Campo de busca com debounce de 500ms buscando no banco em tempo real
- Dropdown inline com resultados — clique para selecionar
- Ao selecionar, exibe chip com os dados principais e botão para remover
- Botão "Cadastrar nova empresa / novo contato" abre o modal de cadastro correspondente e já vincula automaticamente ao ser criado
- Se a empresa selecionada não tiver **Setor** e **Tipo de Relacionamento** preenchidos: exibe aviso e bloqueia o submit com botão para editar a empresa
- Se o contato selecionado não tiver **e-mail ou telefone**: exibe aviso e bloqueia o submit com botão para editar o contato
- Sub-modais de criação/edição abertos em `z-index` elevado (`z-[60]`) para não ficarem atrás da modal principal

**Modo edição:** a modal de edição de card não exige esses campos — empresa e contato continuam sendo gerenciados pelo CardDetails.

**Card nasce vinculado:** ao criar, `client_id` e `person_id` são enviados diretamente no `POST /cards`, sem chamadas adicionais após a criação.

#### Validação de completude no backend ao criar card

O backend agora valida os dados da empresa e do contato quando vinculados na criação do card, garantindo integridade independente do canal de entrada (frontend, n8n, API direta).

**Regras implementadas no `card_service.create_card()`:**
- Se `client_id` for enviado → valida se a empresa existe e se possui `sector` e `relationship_type` preenchidos → rejeita com **HTTP 422** caso contrário
- Se `person_id` for enviado → valida se o contato existe e se possui pelo menos um de: `email`, `email_commercial`, `phone`, `phone_whatsapp`, `phone_commercial` → rejeita com **HTTP 422** caso contrário
- `client_id` e `person_id` continuam opcionais no backend (obrigatoriedade é regra do frontend)

#### `person_id` adicionado ao schema de criação de card

O campo `person_id` existia na tabela do banco mas nunca havia sido exposto no schema de criação. Agora é possível vincular uma pessoa diretamente no `POST /cards`.

#### `ClientModal` devolve o cliente criado/editado no callback

O `onSave` do `ClientModal` foi atualizado de `() => void` para `(client?: Client) => void`, permitindo que chamadores capturem o objeto retornado e façam vínculo automático sem precisar buscar o cliente mais recente como heurística.

### Arquivos Modificados
- `backend/app/schemas/card.py` — adicionado `person_id: Optional[int]` ao `CardCreate`
- `backend/app/services/card_service.py` — validação de completude de empresa e contato; import de `ClientRepository`
- `frontend/src/types/index.ts` — adicionado `person_id` ao `CreateCardRequest`
- `frontend/src/components/kanban/CardModal.tsx` — reescrita com seções de Tipo de Negócio, Canal de Aquisição, Empresa e Contato
- `frontend/src/components/clients/ClientModal.tsx` — `onSave` atualizado para devolver o cliente salvo
- `frontend/src/pages/KanbanBoard.tsx` — `handleSaveCard` mapeia `deal_type`, `acquisition_channel`, `client_id` e `person_id`

---

## [1.3.16] - 2026-03-09

### Corrigido

#### Webhook não disparava quando card era movido por outra automação

**Problema:** A action `send_webhook` só era executada quando um card era movido **manualmente** para a lista configurada. Se outra automação movia o card (ex: automação no board "Agendado" move card para "Reunião Agendada"), o webhook nunca disparava.

**Causa raiz:** Em `_execute_actions()`, a action `move_card` chama `card_repository.move_to_list()` diretamente — esse método bypassa completamente o `card_service.move_card()`, que é onde `process_trigger("card_moved")` é invocado. Logo, a lista de destino nunca era avaliada como trigger para outras automações.

**Solução:** Após `move_to_list()`, o código agora chama `process_trigger("card_moved")` na lista e board de destino, propagando o evento para que automações configuradas naquele destino (como o `send_webhook`) sejam executadas corretamente.

**Proteção contra loops infinitos:** Um guardião de profundidade (`chain_depth`) foi adicionado ao `execution_data`. O campo é incrementado a cada nível de automação encadeada e o encadeamento é bloqueado automaticamente ao atingir 10 níveis — evitando que automações A→B→A→B... rodem indefinidamente.

### Arquivos Modificados
- `backend/app/services/automation_service.py` — método `_execute_actions()`, bloco `move_card`

---

## [1.3.15] - 2026-03-09

### Adicionado

#### Nova action de automação: Enviar Webhook (`send_webhook`)

Estende o sistema de automações existente com um novo tipo de action que dispara uma requisição HTTP POST para qualquer URL externa quando a automação for executada.

**Como usar:** No editor de automações, configure:
- **Trigger:** `Card Movido` → lista "Reunião Agendada"
- **Action:** `Enviar Webhook` → preencha a URL de destino

**Backend — `app/schemas/automation.py`:**
- Novo valor no enum `ActionType`: `SEND_WEBHOOK = "send_webhook"`

**Backend — `app/services/automation_service.py`:**
- Novo `elif action_type == "send_webhook"` em `_execute_actions()`
- Novo método `_execute_webhook_action(card, params)`:
  - Monta payload JSON rico com dados do card (id, título, valor, lista, cliente, pessoa, responsável e campos de rastreamento: `origin`, `utm_campaign`, `utm_source`, `utm_term`)
  - Assina o payload com HMAC-SHA256 e envia no header `X-HSGrowth-Signature: sha256=...` quando um secret for configurado
  - Usa `httpx` (síncrono, já presente no projeto) com timeout de 10 segundos
  - Loga sucesso/erro com prefixo `[AUTOMATION] send_webhook:`
  - Relança exceções para o sistema de retry/log de execuções da automação

**Frontend — `components/automations/NodesSidebar.tsx`:**
- Nova action "Enviar Webhook" disponível na sidebar de blocos (ícone `Webhook`, cor emerald)

**Frontend — `components/automations/NodeConfigPanel.tsx`:**
- Novo `case "send_webhook"` em `renderActionConfig()`:
  - Campo **URL** (obrigatório): endpoint que receberá o POST
  - Campo **Secret** (opcional): chave para assinatura HMAC-SHA256
  - Preview do payload que será enviado

**Payload enviado:**
```json
{
  "event": "card.list_changed",
  "timestamp": "2026-03-09T10:00:00Z",
  "card": {
    "id": 123, "title": "...", "value": 15000.00,
    "list_name": "Reunião Agendada", "board_id": 2,
    "origin": "Site", "utm_campaign": "...", "utm_source": "...", "utm_term": "...",
    "client": { "id": 42, "name": "...", "document": "...", "email": "...", "phone": "..." },
    "person": { "id": 10, "name": "...", "email": "...", "phone": "...", "phone_whatsapp": "..." },
    "assigned_to": { "id": 3, "name": "..." }
  }
}
```

### Arquivos Modificados
- `backend/app/schemas/automation.py`
- `backend/app/services/automation_service.py`
- `frontend/src/components/automations/NodesSidebar.tsx`
- `frontend/src/components/automations/NodeConfigPanel.tsx`

---

## [1.3.14] - 2026-03-09

### Adicionado

#### Campos de rastreamento de origem no Resumo do CardDetails

Quatro novos campos adicionados na seção "Resumo" do card, agrupados numa nova subseção "Rastreamento de Origem":

| Campo | Editável por | Descrição |
|---|---|---|
| **Origem** | Frontend (usuário) | Origem do lead: Site, Indicação, LinkedIn, etc. |
| **UTM Campaign** | API externa (somente leitura no frontend) | Campanha de marketing rastreada |
| **UTM Source** | API externa (somente leitura no frontend) | Fonte de tráfego rastreada |
| **UTM Term** | API externa (somente leitura no frontend) | Termo de busca rastreado |

**Backend:**
- `app/models/card.py` — 4 novas colunas: `origin`, `utm_campaign`, `utm_source`, `utm_term` (todas `String(200), nullable`)
- `app/schemas/card.py` — campos adicionados em `CardCreate`, `CardUpdate` e `CardResponse`
- Migration `2026_03_09_1000-add_origin_utm_fields_to_cards.py` (revision: `add_origin_utm_fields_2026`, down_revision: `notif_settings_2026`)

**Frontend:**
- `types/index.ts` — campos adicionados na interface `Card` e `UpdateCardRequest`
- `components/cardDetails/SummarySection.tsx` — nova seção "Rastreamento de Origem":
  - `origin`: `EditableField` (editável pelo usuário)
  - `utm_campaign`, `utm_source`, `utm_term`: campos somente leitura (exibem "Não informado" quando vazios)

### Arquivos Modificados/Criados
- `backend/app/models/card.py`
- `backend/app/schemas/card.py`
- `backend/alembic/versions/2026_03_09_1000-add_origin_utm_fields_to_cards.py` (novo)
- `frontend/src/types/index.ts`
- `frontend/src/components/cardDetails/SummarySection.tsx`

---

## [1.3.13] - 2026-03-09

### Adicionado

#### Seleção de número ao ligar — CardDetails > Foco

Ao clicar em "Ligar" em uma atividade do tipo ligação, o sistema agora verifica quantos números de telefone estão cadastrados para a pessoa vinculada ao card.

- **1 número disponível:** comportamento anterior mantido — modal de confirmação direta antes de iniciar a chamada.
- **2 ou 3 números disponíveis:** exibe um modal de seleção listando os números com seus rótulos (Principal, WhatsApp, Comercial). O clique no número já inicia a chamada diretamente, sem etapa de confirmação extra, pois a seleção em si é a confirmação.

**Arquivos Modificados:**
- `frontend/src/components/cardDetails/FocusSection.tsx`
  - Novo estado `phoneSelectTaskId` para controlar o modal de seleção
  - Função `executeCall` extraída do `handleMakeCall` para ser reutilizada nos dois fluxos
  - `handleMakeCall` refatorado: monta lista de números disponíveis e redireciona para o fluxo correto (confirmação direta ou modal de seleção)
  - Modal de seleção adicionado inline, seguindo o mesmo padrão visual do modal de reagendamento existente

---

## [1.3.12] - 2026-03-09

### Corrigido

#### Bug: campos opcionais não eram limpos ao editar cliente

Ao editar um cliente e apagar um campo opcional (ex: Nome Fantasia), o valor antigo era mantido após salvar.

**Causa raiz:** o backend usa `model_dump(exclude_unset=True)` no Pydantic, o que faz com que apenas os campos presentes no body da requisição sejam atualizados. O frontend enviava `undefined` para campos vazios, que o `JSON.stringify` omite do body — fazendo o backend ignorar completamente o campo e manter o valor anterior.

**Correção:**
- `frontend/src/services/clientService.ts` — interface `UpdateClientRequest` atualizada: campos opcionais passam a aceitar `string | null` (além de `string | undefined`), deixando o TypeScript ciente de que valores nulos são válidos em operações de edição
- `frontend/src/components/clients/ClientModal.tsx` — função `handleSave` separada em dois blocos:
  - **Criação:** continua enviando `undefined` para campos vazios (correto — backend usa o valor padrão)
  - **Edição:** envia `null` para campos vazios, forçando o backend a limpar o valor no banco

O fix cobre todos os campos opcionais do formulário: Nome Fantasia, Email, Telefone, CPF/CNPJ, Endereço, Cidade, Estado, País, Website, Observações, CNAE, LinkedIn, Tipo de Relacionamento, Atividade Comercial, Setor, Número de Colaboradores e Faturamento Anual.

### Arquivos Modificados
- `frontend/src/services/clientService.ts`
- `frontend/src/components/clients/ClientModal.tsx`

---

## [1.3.11] - 2026-03-05

### Adicionado

#### Redis Session Management — Controle de sessões em tempo real

Sistema completo de gerenciamento de sessões via Redis, com blacklist de tokens e visibilidade de usuários online.

**Backend — Infraestrutura Redis**
- `app/core/redis_client.py` — singleton async Redis (DB 1, separado do Celery que usa DB 0); graceful degradation: sistema continua funcionando se Redis cair; reconecta automaticamente via `connect_redis()` no lifespan
- `app/core/redis_sessions.py` — classe `SessionManager` com métodos: `create_session`, `update_activity`, `remove_session`, `blacklist_token`, `is_blacklisted`, `get_active_sessions`; chaves `session:{user_id}:{session_id}` (hash, TTL 15min) e `blacklist:{token_hash}` (string, TTL = tempo restante do JWT); usa SHA-256 para hash do token na blacklist; SCAN em vez de KEYS para não bloquear Redis em produção
- `app/middleware/session_middleware.py` — atualiza `last_activity` a cada request autenticado via `asyncio.create_task()` (fire-and-forget, zero latência); verifica `exists()` antes de `hset` para não recriar sessão após logout
- `app/core/config.py` — novos campos: `REDIS_PASSWORD`, `REDIS_SESSION_DB` (default 1), `REDIS_SESSION_TTL_SECONDS` (default 900)
- `app/main.py` — Redis conectado/desconectado no lifespan; `session_activity_middleware` registrado

**Backend — Auth**
- `app/api/deps.py` — `get_current_user` verifica blacklist antes de validar; retorna HTTP 401 "Token revogado" se blacklistado; graceful se Redis offline
- `app/api/v1/endpoints/auth.py` — login cria sessão no Redis e regera token com `session_id` no payload; logout blacklista token com TTL restante e remove sessão

**Backend — Usuários Online e Notification Settings**
- `GET /api/v1/users/online` (admin/manager) — lista usuários com sessão ativa, agrupados por `user_id`, com nome, email, IP, last_activity e contagem de sessões abertas; rota registrada antes de `/{user_id}` para evitar conflito de captura
- `GET /api/v1/users/me/notification-settings` — retorna configurações de notificação do usuário (cria com defaults True se não existir)
- `PUT /api/v1/users/me/notification-settings` — atualiza campos individualmente
- `app/models/user_notification_setting.py` — model `UserNotificationSetting` (one-to-one com User, CASCADE delete)
- `app/schemas/user_notification_setting.py` — `UserNotificationSettingResponse` e `UserNotificationSettingUpdate`
- `app/services/user_notification_service.py` — `get_or_create` e `update` com `exclude_unset=True`
- Migration `2026_03_05_1000-add_user_notification_settings.py` (revision: `notif_settings_2026`)

**Frontend**
- `types/index.ts` — interfaces `OnlineUser`, `OnlineUsersResponse`, `NotificationSettings`, `NotificationSettingsUpdate`
- `services/userService.ts` — funções `getOnlineUsers()`, `getNotificationSettings()`, `updateNotificationSettings()`
- `pages/Settings.tsx` — aba Segurança exibe seção "Sessões Ativas" com grid de usuários online (avatar, indicador verde, last_activity relativo, IP, badge "Você", contagem de abas); botão Atualizar manual; visível apenas para admin/manager

### Corrigido

- `requirements.txt` / `requirements-prod.txt` — migração de `python-jose[cryptography]==3.3.0` (descontinuado/removido do PyPI) para `PyJWT==2.8.0`; `cryptography==42.0.2` adicionado explicitamente (era dependência transitiva do python-jose, usada diretamente em `api4com_repository.py` via `Fernet`)
- `app/health` — endpoint `/health` agora inclui diagnóstico do Redis (`redis_sessions: ok/error/disconnected`) para facilitar troubleshooting em produção

### Infraestrutura

- Easypanel produção — serviço Redis criado (`erick_redis:6379`); variáveis `REDIS_HOST`, `REDIS_PASSWORD`, `CELERY_BROKER_URL` e `CELERY_RESULT_BACKEND` atualizadas

### Arquivos Modificados/Criados
- `backend/app/core/redis_client.py` (novo)
- `backend/app/core/redis_sessions.py` (novo)
- `backend/app/middleware/session_middleware.py` (novo)
- `backend/app/models/user_notification_setting.py` (novo)
- `backend/app/schemas/user_notification_setting.py` (novo)
- `backend/app/services/user_notification_service.py` (novo)
- `backend/alembic/versions/2026_03_05_1000-add_user_notification_settings.py` (novo)
- `backend/app/core/config.py`
- `backend/app/main.py`
- `backend/app/api/deps.py`
- `backend/app/api/v1/endpoints/auth.py`
- `backend/app/api/v1/endpoints/users.py`
- `backend/app/models/__init__.py`
- `backend/app/models/user.py`
- `backend/requirements.txt`
- `backend/requirements-prod.txt`
- `frontend/src/types/index.ts`
- `frontend/src/services/userService.ts`
- `frontend/src/pages/Settings.tsx`

---

## [1.3.10] - 2026-03-05

### Adicionado

#### Auto-save com debounce nos campos editáveis do CardDetails

- `EditableField.tsx` — auto-save de 800ms após pausa na digitação (debounce); `onBlur` salva imediatamente ao sair do campo; `isCancellingRef` + `onMouseDown` no botão Cancelar evita que o blur dispare um save indesejado; `editValueRef` resolve closures desatualizadas dentro do `setTimeout`; spinner `Loader2` substituí o botão Salvar enquanto o request está em andamento

#### Filtro por data de fechamento no Kanban

- `KanbanBoard.tsx` — filtro de data trocado de `created_at` para `closed_at`; novas opções: "Fechado hoje", "Fechado esta semana", "Fechado este mês", "Fechado mês passado", "Período personalizado" (com inputs de data início/fim)
- `schemas/card.py` + `services/card_service.py` — campo `closed_at` adicionado ao `CardMinimalResponse` e à construção do schema minimal
- `types/index.ts` — campo `closed_at: string | null` adicionado à interface `Card`

#### Melhorias de UX na barra de filtros do Kanban

- `SelectMenu.tsx` — novo prop `size?: "md" | "sm"`; modo `sm` usa `px-3 py-2 text-sm` para filtros compactos
- `KanbanBoard.tsx` — todos os selects da barra de filtros usam `size="sm"` para caber em uma linha na maioria das telas

### Corrigido

- `card_service.py` — mensagem de validação de avanço de etapa alterada de `"área do contato"` para `"área/departamento do contato"` para maior clareza no toast de aviso

### Arquivos Modificados
- `backend/app/schemas/card.py`
- `backend/app/services/card_service.py`
- `frontend/src/types/index.ts`
- `frontend/src/pages/KanbanBoard.tsx`
- `frontend/src/components/common/SelectMenu.tsx`
- `frontend/src/components/cardDetails/EditableField.tsx`

---

## [1.3.9] - 2026-03-04

### Adicionado

#### Role "Visualizador" — acesso somente leitura ao sistema

Nova função de usuário para quem precisa consultar o sistema sem realizar nenhuma ação de escrita.

**Backend**
- Nova dependency `require_not_viewer()` em `backend/app/api/deps.py` — retorna HTTP 403 para qualquer usuário com role `viewer` que tente executar um endpoint de escrita
- Aplicada em todos os endpoints de escrita (POST/PUT/PATCH/DELETE) dos módulos: `boards`, `cards`, `clients`, `persons`, `products` (30 endpoints ao total)
- Role `viewer` adicionada ao script de seed (`backend/scripts/seed_database.py`)
- Migration Alembic `2026_03_04_1000-add_viewer_role.py` — insere a role `viewer` na tabela `roles` via `ON CONFLICT DO NOTHING`

**Frontend — Roteamento e Menu**
- `'viewer'` adicionado ao union type de role em `frontend/src/types/index.ts`
- `MainLayout.tsx` — campo `viewerAllowed` em cada item do menu; itens não permitidos (Gamificação, Transferências, Relatórios, Automações, Notificações, Configurações, Usuários) são ocultados para viewer; label "Visualizador" adicionado ao mapeamento de roles no rodapé
- `router.tsx` — componente `ViewerGuard` redireciona viewer para `/boards` ao tentar acessar rotas não autorizadas

**Frontend — Páginas e Componentes**
- `Boards.tsx` + `BoardCard.tsx` — viewer não vê botão "Novo Board" nem menu de ações (editar/duplicar/arquivar) nos cards de board
- `KanbanBoard.tsx` — viewer não vê menu do board (editar/duplicar/arquivar), não pode adicionar cards; handlers de edição/arquivamento/deleção/movimentação de listas passados como `undefined`
- `KanbanList.tsx` — menu MoreVertical da lista ocultado automaticamente quando nenhum handler de ação é fornecido
- `Clients.tsx`, `Persons.tsx`, `Products.tsx` — botões de criar, editar e deletar ocultos para viewer
- `CardDetails.tsx` — título não editável; botões Ganho/Perdido/Reabrir/Atribuir Vendedor ocultos; PipelineStages e QuickActivityForm ocultados
- `NotesSection.tsx` — prop `readOnly` oculta botão "Adicionar anotação" e botões editar/excluir de notas existentes
- `SchedulerSection.tsx` — prop `readOnly` oculta botão "Agendar", desativa clique no calendário, oculta botões Concluir/Editar/Excluir no modal de atividade
- `FilesSection.tsx` — prop `readOnly` oculta área de upload e botão deletar; viewer pode visualizar e baixar arquivos
- `UserModal.tsx` — opção "Visualizador" (ID 5) adicionada ao select de função no modal de criação/edição de usuário

### Arquivos Modificados
- `backend/app/api/deps.py`
- `backend/app/api/v1/endpoints/boards.py`
- `backend/app/api/v1/endpoints/cards.py`
- `backend/app/api/v1/endpoints/clients.py`
- `backend/app/api/v1/endpoints/persons.py`
- `backend/app/api/v1/endpoints/products.py`
- `backend/scripts/seed_database.py`
- `frontend/src/types/index.ts`
- `frontend/src/layouts/MainLayout.tsx`
- `frontend/src/router.tsx`
- `frontend/src/pages/Boards.tsx`
- `frontend/src/pages/KanbanBoard.tsx`
- `frontend/src/pages/Clients.tsx`
- `frontend/src/pages/Persons.tsx`
- `frontend/src/pages/Products.tsx`
- `frontend/src/pages/CardDetails.tsx`
- `frontend/src/components/boards/BoardCard.tsx`
- `frontend/src/components/kanban/KanbanList.tsx`
- `frontend/src/components/cardDetails/NotesSection.tsx`
- `frontend/src/components/cardDetails/SchedulerSection.tsx`
- `frontend/src/components/cardDetails/FilesSection.tsx`
- `frontend/src/components/users/UserModal.tsx`

### Arquivos Criados
- `backend/alembic/versions/2026_03_04_1000-add_viewer_role.py`

---

## [1.3.8] - 2026-03-04

### Adicionado

#### Relatórios Customizados — Drill-down de gráficos
- Barras, fatias e linhas dos gráficos agora são clicáveis e abrem uma modal com os negócios que compõem aquele valor
- Modal usa o `BaseModal` padrão do sistema com título da barra clicada e contagem de negócios como subtítulo
- Tabela exibe: título, quadro/etapa, vendedor, valor, status (Aberto/Ganho/Perdido com badge colorido), data de criação e botão de acesso direto ao card
- Limitado a 200 registros com aviso quando atingido
- Novos componente: `frontend/src/components/reports/DrillDownModal.tsx`
- Novo endpoint: `POST /api/v1/reports/drill-down`
- Novos schemas: `DrillDownRequest`, `DrillDownCard`, `DrillDownResponse` em `custom_report.py`
- Novo método `drillDown()` em `reportService.ts`

#### Relatórios Customizados — Novos campos no catálogo
- **Etapa** (`list_name`): agrupa negócios por etapa do Kanban, ordenado pela posição das listas
- **Custo de Frete** (`shipping_cost`): campo monetário agregável
- **Detalhe do Canal** (`acquisition_channel_detail`): dimensão categórica
- **Tem Implementação** (`has_implementation`) e **Tem Pessoal** (`has_personnel`): dimensões categóricas booleanas
- **Datas de entrada por board**: `prospection_entry_date`, `acquisition_entry_date`, `expansion_entry_date`

### Corrigido

#### Relatórios Customizados
- **Bug**: clicar em "+ Novo Gráfico" após criar um gráfico exibia os dados do gráfico anterior em vez de formulário vazio — corrigido com `newChartSessionKey` que força remount do `ChartConfigPanel` via prop `key`
- **Bug**: filtro de período (`Esta Semana`, `Este Mês`, etc.) era ignorado quando o eixo X era um campo categórico (ex: Etapa, Vendedor) — agora aplica `created_at` via `_get_source_primary_date_col()` nesses casos

#### Drill-down — correções progressivas após implementação inicial
- **Bug**: cards apareciam duplicados (até 8× cada) na modal de drill-down — corrigido com `.distinct()` na query
- **Bug**: ao clicar em barra de gráfico cuja fonte do eixo X é `tasks` ou `activities`, o drill-down aplicava filtros dessas tabelas diretamente na query de Cards sem JOIN, gerando cross join implícito e retornando resultados incorretos — corrigido com subqueries `card_id IN (SELECT card_id FROM card_tasks WHERE ...)` e `card_id IN (SELECT card_id FROM activities WHERE ...)`
- **Bug**: drill-down exibia todos os cards do grupo (ex: 6 cards) em vez de apenas os que contribuíram para o valor da barra (ex: 1 card ganho) — corrigido enviando `y_source` + `y_key` no request; o backend replica o filtro implícito da agregação:
  - `won_count` → `is_won = 1`
  - `proposal_count` → `card_id IN (attachments do tipo 'proposal')`
  - `valid_count` → `card_id IN (card_list_history da lista de Prospecção)`
  - `meeting_count` → `task_type = 'meeting'` na subquery de tasks

### Arquivos Modificados
- `backend/app/schemas/custom_report.py` — `DrillDownRequest` (+ `y_source`, `y_key`), `DrillDownCard`, `DrillDownResponse`
- `backend/app/services/custom_report_service.py` — novos campos no catálogo, `_get_source_primary_date_col()`, `_build_card_id_subquery_from_tasks()`, `_build_card_id_subquery_from_activities()`, `_get_split_raw_value()`, `_get_y_card_filter()`, `execute_drill_down()` refatorado
- `backend/app/api/v1/endpoints/custom_reports.py` — endpoint `POST /drill-down`
- `frontend/src/pages/Reports.tsx` — `newChartSessionKey`, handlers de drill-down
- `frontend/src/components/reports/ChartWidget.tsx` — prop `onBarClick`, cursor pointer, handlers por tipo de gráfico
- `frontend/src/components/reports/DrillDownModal.tsx` — novo componente (criado)
- `frontend/src/services/reportService.ts` — método `drillDown()` com `y_source`/`y_key`
- `frontend/src/layouts/MainLayout.tsx` — versão atualizada para `v1.3.8`

---

## [1.3.7] - 2026-03-03

### Adicionado

#### Gamificação — Histórico de pontos contextual por perfil
- **Vendedor**: vê apenas o próprio histórico (`GET /points/me`)
- **Gerente/Admin com usuário específico selecionado**: vê o histórico daquele vendedor (`GET /points/users/{id}`)
- **Gerente/Admin com visão "Equipe"**: novo endpoint `GET /points` retorna histórico de toda a equipe com `user_name` em cada registro
- Coluna "Usuário" aparece dinamicamente na tabela apenas na visão de equipe (quando `user_name` está preenchido)
- Campo `user_name: Optional[str]` adicionado ao `GamificationPointResponse`
- Helper `_build_point_responses()` no endpoint — monta a lista com `user_name` a partir de um dicionário `{user_id: name}`, evitando N+1 queries
- Novos métodos no `GamificationRepository`: `list_all_points()` e `count_all_points()`
- Novo método no `gamificationService.ts`: `getAllPointsHistory()`

#### `require_manager_or_admin()` em `deps.py`
- Nova dependency reutilizável que aceita roles `"manager"` **ou** `"admin"`
- `require_role()` existente faz verificação de igualdade exata — admins recebiam 403 ao tentar acessar endpoints marcados como `require_role("manager")`
- Utilizada nos endpoints `GET /points` e `GET /points/users/{id}`

### Corrigido

- **Bug**: admin recebia 403 ao carregar histórico de pontos da equipe porque `require_role("manager")` não permite role `"admin"` (verificação exata de string)
- **Comportamento**: ao trocar usuário no dropdown (gerente/admin), `historyPage` é resetado para 1 para evitar página inválida no novo contexto

### Arquivos Modificados
- `backend/app/api/deps.py` — nova função `require_manager_or_admin()`
- `backend/app/schemas/gamification.py` — campo `user_name` em `GamificationPointResponse`
- `backend/app/repositories/gamification_repository.py` — `list_all_points()`, `count_all_points()`
- `backend/app/api/v1/endpoints/gamification.py` — `GET /points` (global), helper `_build_point_responses()`, `require_manager_or_admin()` nos endpoints de manager
- `frontend/src/services/gamificationService.ts` — `user_name` em `GamificationPointRecord`, `getAllPointsHistory()`
- `frontend/src/pages/Gamification.tsx` — lógica contextual em `loadPointsHistory()`, coluna "Usuário" dinâmica, reset de página ao trocar usuário

---

## [1.3.6] - 2026-03-03

### Adicionado

#### Gamificação — Histórico de pontos (implementação base)
- **Novo endpoint** `GET /api/v1/gamification/points/me` — histórico paginado do usuário logado (qualquer role)
- **Novo endpoint** `GET /api/v1/gamification/points/users/{user_id}` — histórico de usuário específico (manager/admin)
- **Novo schema** `GamificationPointListResponse` com paginação (`points`, `total`, `page`, `page_size`, `total_pages`)
- **Novo método** `count_user_points(user_id)` no `GamificationRepository` para total de registros
- **Nova aba "Histórico"** na página de Gamificação (`/gamification`):
  - Tabela com colunas: Data/Hora, Ação (chip com `reason`), Pontos (verde `+N` / vermelho `-N`), Descrição
  - Estado vazio com ícone e mensagem orientativa
  - Paginação com botões Anterior/Próxima (exibida só quando `total_pages > 1`)
  - Loading spinner durante requisição
- Novos métodos em `gamificationService.ts`: `getMyPointsHistory()`, `getUserPointsHistory()`
- Nova interface `GamificationPointRecord` e `GamificationPointListResponse` no frontend

### Arquivos Criados / Modificados
- `backend/app/schemas/gamification.py` — `GamificationPointListResponse`
- `backend/app/repositories/gamification_repository.py` — `count_user_points()`
- `backend/app/api/v1/endpoints/gamification.py` — `GET /points/me`, `GET /points/users/{id}`
- `frontend/src/services/gamificationService.ts` — interfaces e métodos de histórico
- `frontend/src/pages/Gamification.tsx` — aba "Histórico" com tabela paginada

---

## [1.3.5] - 2026-03-03

### Adicionado

#### Tratamento de Erros — `ConfirmContext` global
- **Novo contexto** `src/contexts/ConfirmContext.tsx` com `ConfirmProvider` e hook `useConfirm()`
- Padrão Promise-based: `await confirm({ title, message, confirmText, isDanger })` retorna `true`/`false`
- Substitui ~20 chamadas `window.confirm()` nativas em todo o sistema por modal estilizado (`ConfirmModal`)
- `ConfirmProvider` adicionado ao `App.tsx` junto com os demais providers globais

#### Tratamento de Erros — `showError()` nos catch blocks
- `showError()` / `handleError()` adicionados em ~17 arquivos que tinham `catch` blocks com apenas `console.error`
- Usuário agora recebe feedback visual (toast) em erros de API em vez de silêncio
- Arquivos cobertos: `NotificationDropdown`, `GlobalSearch`, `NodeConfigPanel`, `FilesSection`, `ClientModal`, `PersonModal`, `ProductModal`, `CardModal`, `CardActivitiesModal`, `Gamification`, `Notifications`, e outros

#### Automações — Triggers faltantes integrados
- **`card_assigned`**: `card_service.py` captura `old_assigned_to_id` antes do update e dispara o trigger quando `assigned_to_id` muda
- **`field_changed`**: disparado ao final de `add_or_update_field_value()` com `field_definition_id`, `field_name` e `new_value` no `trigger_data`

#### Automações — Actions implementadas
- **`send_notification`**: cria notificações via `NotificationRepository` para lista de `user_ids` ou responsável do card
- **`award_points`**: chama `GamificationRepository.create_point()` com pontos configuráveis (padrão: 10)
- **`update_field`**: atualiza campos permitidos do card via `setattr` (`title`, `value`, `due_date`, `description`)

#### Automações — Modal de histórico de execuções
- **Botão "Histórico"** em cada card de automação na listagem
- `ExecutionHistoryModal` com filtro por status (Todas/Sucesso/Falha/Pendente), tabela paginada e tecla ESC para fechar
- Colunas: Data/Hora (`started_at`), Status (badge colorido), Duração (`duration_ms` formatado em ms/s), Detalhe (`error_message` ou "—")

### Corrigido

- **"Invalid Date" e duração vazia** no histórico de execuções: frontend usava `executed_at` e `execution_duration_ms` mas o backend retorna `started_at` e `duration_ms` — corrigido em `automationService.ts` e `Automations.tsx`
- **`AutomationExecution` interface** atualizada para refletir os campos reais do `AutomationExecutionResponse` do backend

### Arquivos Criados
- `frontend/src/contexts/ConfirmContext.tsx`

### Arquivos Modificados
- `frontend/src/App.tsx` — `ConfirmProvider` adicionado
- `frontend/src/services/automationService.ts` — interface `AutomationExecution` corrigida
- `frontend/src/pages/Automations.tsx` — `ExecutionHistoryModal`, botão "Histórico", estados de paginação
- `backend/app/services/card_service.py` — triggers `card_assigned` e `field_changed`
- `backend/app/services/automation_service.py` — actions `send_notification`, `award_points`, `update_field`
- ~20 arquivos frontend — `window.confirm()` → `useConfirm()`, `console.error` → `showError()`

---

## [1.3.4] - 2026-03-02

### Adicionado

#### Calendário Global de Atividades (`/calendar`)
- **Nova página `/calendar`** com visão global de todas as atividades/tarefas de todos os cards
- Controle de visibilidade por role:
  - `admin` / `manager`: veem todos por padrão, com dropdown para filtrar por usuário específico ("Todos os usuários" como opção padrão)
  - `salesperson` / `sdr`: filtro fixo no próprio `user.id`, badge fixo "Minhas atividades"
- Dois modos de visualização:
  - **Grade mensal** — idêntica ao `SchedulerSection`, pills coloridos por tipo, indicador de overflow (+N mais)
  - **Lista cronológica** — agrupada por mês, com `card_title` e `card_client_name` como info secundária
- Seletor rápido de mês via popover (navegação de ano + grade de 12 meses), botão "Hoje"
- Modal de detalhes **somente leitura**: tipo, prioridade, status, card/cliente, data/hora/duração, local, link de vídeo, responsável, descrição, notas
- Botão "Abrir card" no modal navega para `/cards/{id}` — sem ações de criar, editar ou excluir

#### Novos campos em `CardTaskResponse` (backend)
- `card_title` — título do card ao qual a tarefa pertence
- `card_client_name` — nome do cliente vinculado ao card
- Populados em todas as respostas da API via join automático

#### Constantes compartilhadas `cardTaskConfig.ts` (frontend)
- Novo arquivo `frontend/src/constants/cardTaskConfig.ts` centralizando:
  - `TYPE_CONFIG` — configurações visuais por tipo (cor, ícone, label)
  - `PRIORITY_CONFIG` — badges de prioridade
  - `WEEK_DAYS` — cabeçalho dos dias da semana
  - Tipos exportados: `TaskType`, `Priority`, `TypeConfig`

#### Método `getForCalendar()` no `cardTaskService.ts` (frontend)
- Busca todas as tarefas sem filtro de `card_id`, com `assignedToId` opcional
- Paginação automática: `page_size=100` com requisições paralelas para páginas extras

### Melhorado

#### Otimização de queries N+1 em `list_by_filters`
- `CardTaskRepository.list_by_filters` agora carrega em uma única query via `joinedload`:
  - `CardTask.assigned_to` — resolvia N+1 que já existia anteriormente
  - `CardTask.card` + `Card.client` — para popular os novos campos de contexto

#### `SchedulerSection.tsx` refatorado (sem impacto visual)
- Removidas definições locais de `TYPE_CONFIG`, `PRIORITY_CONFIG`, `WEEK_DAYS`, `TaskType`, `Priority`
- Substituídas por imports de `../../constants/cardTaskConfig`

### Arquivos Criados
- `frontend/src/constants/cardTaskConfig.ts`
- `frontend/src/pages/Calendar.tsx`

### Arquivos Modificados
- `backend/app/schemas/card_task.py` — campos `card_title` e `card_client_name` no `CardTaskResponse`
- `backend/app/repositories/card_task_repository.py` — `joinedload` encadeado em `list_by_filters`
- `backend/app/services/card_task_service.py` — `_build_response` popula os novos campos
- `frontend/src/services/cardTaskService.ts` — novos campos no tipo `CardTask` + `getForCalendar()`
- `frontend/src/components/cardDetails/SchedulerSection.tsx` — imports de `cardTaskConfig.ts`
- `frontend/src/router.tsx` — rota `/calendar` registrada
- `frontend/src/layouts/MainLayout.tsx` — versão atualizada para v1.3.4

---

## [1.3.3] - 2026-02-27

### Adicionado

#### Kanban — Regras de Avanço Cumulativas (Board 6 — Prospecção)
- Validações de avanço de etapa tornadas **cumulativas**: ao tentar avançar para uma etapa N, todas as regras das etapas anteriores também são verificadas novamente
- Evita que campos obrigatórios sejam preenchidos para avançar e depois removidos
- **Lead Novo → Prospecção** — novos campos obrigatórios:
  - Tipo de Relacionamento da empresa (`relationship_type`)
  - Segmento/setor da empresa (`sector`)
  - Nome, e-mail (ao menos 1), cargo e área do contato vinculado
  - Canal de Aquisição (`acquisition_channel`), Detalhamento do Canal (`acquisition_channel_detail`) e Tipo de Negócio (`deal_type`)
- **Conectado → Agendado** — novos campos obrigatórios:
  - Vendedor responsável vinculado ao card (`assigned_to_id`)
  - Ao menos 1 produto cadastrado no card
  - Task de reunião criada — **apenas se** algum dos produtos vinculados for "Phoebus"; caso contrário, task de reunião não é exigida
  - Implementação do negócio (`has_implementation`)
  - Pessoas para manusear (`has_personnel`)
  - Número de colaboradores da empresa (`employee_count`)
  - Atividade comercial da empresa (`commercial_activity`)
  - Tipo de Relacionamento e Status do cliente da empresa

#### Script de Importação de Planilha (`import_from_planilha.py`)
- Campo `Data Criação*` adicionado como **fonte primária de data** ao criar o card; fallback para `Data_Prospecao` e depois para a data atual
- Lógica de busca de SDR corrigida: todas as palavras significativas do nome do usuário precisam constar no nome da planilha (evita falsos positivos como "Sandra Silva" casar com "Cláudia Silva")

### Corrigido

#### Deploy — Dockerfile Frontend (Easypanel / Alpine Linux)
- Corrigido erro `npm install` no build Docker causado pelo `package-lock.json` gerado no Windows com binários específicos da plataforma (`lightningcss-win32-x64-msvc`, `@rollup/rollup-win32-x64-msvc`)
- Solução: `RUN rm -f package-lock.json && npm install --legacy-peer-deps`

#### CardDetails — Desconto de Produto
- Desconto alterado de percentual (%) para **valor fixo em R$** (inteiro)
- Input do tipo `number` com `step="1"` (somente inteiros)
- Validação que impede desconto maior que o subtotal dos itens
- Exibição formatada como moeda (`R$ X.XXX,XX`) no modo leitura

#### Clientes — Busca por CPF/CNPJ
- Campo `document` adicionado ao `searchInFields` do filtro de busca
- Placeholder da busca atualizado para indicar que CPF/CNPJ é pesquisável

#### CardDetails — Campo SDR (Seção Resumo)
- Campo SDR alterado de dropdown editável para **somente leitura**, igual ao comportamento do campo Vendedor
- Exibe nome do SDR atribuído ou "Não atribuído"
- Texto informativo: "O SDR será atribuído automaticamente pelo sistema ou por um Gerente"

#### CardDetails — Histórico de Atividades (Descrição/Anotações)
- Corrigido: após concluir uma atividade, a descrição e anotações da tarefa não apareciam no Histórico
- **Backend** (`card_task_service.py`): ao marcar tarefa como concluída, agora salva `task_description` e `task_notes` no `activity_metadata`
- **Frontend** (`HistorySection.tsx`): mapeamento da `description` atualizado com prioridade: anotações (`task_notes`) > descrição (`task_description`) > título (apenas se diferente do título principal, evitando duplicidade)

---

## [1.3.2] - 2026-02-26

### Adicionado

#### Relatórios — Novos Campos: Propostas Enviadas e Negócios Válidos
- Novo campo `proposal_count` ("Propostas Enviadas") no catálogo de relatórios customizados
  - Conta cards distintos que possuem ao menos 1 anexo com `attachment_type = 'proposal'`
  - Usa `COUNT(DISTINCT card.id)` com JOIN em `attachments` para evitar duplicatas
- Novo campo `valid_count` ("Negócios Válidos") no catálogo de relatórios customizados
  - Conta cards distintos que chegaram à lista "Prospecção" (`list_id = 23`) do board Prospecção (`board_id = 6`)
  - Usa `COUNT(DISTINCT card.id)` com JOIN em `card_list_history`
- Constante `_PROSPECCAO_LIST_ID = 23` no service para facilitar manutenção futura
- Métodos privados `_run_proposal_count_query` e `_run_valid_count_query` em `CustomReportService`
- Campo `created_at` adicionado ao schema `CardMinimalResponse` e ao service (necessário para o filtro de data do Kanban)

### Corrigido

#### KanbanBoard — Filtro de Data
- Filtro de data corrigido para usar `created_at` (data de criação) em vez de `due_date` (data de vencimento)
- Corrigido bug onde cards sem `due_date` passavam pelo filtro sem serem filtrados (agora cards sem `created_at` são excluídos quando filtro está ativo)
- Lógica do período "Esta semana" ajustada para olhar para o passado (criado desde segunda-feira até hoje) em vez do futuro
- Label "Atrasados" renomeado para "Antes desta semana" (semanticamente correto para filtro por criação)

#### CardDetails — Avatares no Header
- Substituídas as iniciais estáticas por fotos reais usando o componente `UserAvatar` em 6 locais do header:
  - Botão de seleção do Vendedor (admin/manager)
  - Botão de seleção do SDR (admin/manager)
  - Exibição read-only do Vendedor (role vendedor)
  - Exibição read-only do SDR (role vendedor)
  - Itens do dropdown de seleção de Vendedor
  - Itens do dropdown de seleção de SDR
- Mantido fallback automático para iniciais com gradiente quando o usuário não tem foto cadastrada

---

## [1.3.1] - 2026-02-25

### Adicionado

#### Rastreamento de Histórico de Etapas (`card_list_history`)
- Nova tabela `card_list_history` para registrar quando cada card entrou e saiu de cada lista
- Campos: `card_id`, `list_id`, `board_id` (desnormalizado), `entered_at`, `exited_at` (NULL = ainda na etapa)
- Atualizada automaticamente em toda movimentação de card (`move_card`) e na criação do card
- Script de migração histórica `scripts/migrate_card_list_history.py` para popular dados anteriores a partir das atividades
- 4 índices para performance: `card_id`, `list_id + entered_at`, `board_id + entered_at`, `card_id + exited_at`

#### Regras de Movimentação — Board 6 (Prospecção)
- Vendedores e SDRs só podem criar cards na primeira lista ("Lead Novo") do board 6
- Frontend oculta o botão "Adicionar card" nas demais listas para usuários sem permissão
- **Lead Novo → Prospecção**: exige empresa vinculada, contato vinculado, segmento da empresa e cargo do contato
- **Prospecção → Conectado**: exige evidência de contato efetivo — ligação VOIP concluída, task de ligação concluída ou nota com ≥ 20 caracteres
- **Conectado → Agendado**: exige task de reunião criada e nota com ≥ 20 caracteres descrevendo o problema identificado; pula a etapa "Reagendamento" propositalmente
- **Reagendamento → Agendado**: exige task de reunião pendente (não concluída) — garante que o SDR reagendou o encontro após No Show
- Fluxo No Show: botão marca a task de reunião como concluída e move o card para "Reagendamento" automaticamente

#### Regras de Movimentação — Board 7 (Aquisição)
- **Reunião Agendada → Qualificação**: exige que não haja tasks de reunião pendentes (prova que a reunião aconteceu); se o lead não compareceu, usar botão "No Show"
- **Qualificação → Diagnóstico e Proposta**: transição livre, sem requisitos
- **Diagnóstico e Proposta → Negociação**: exige (1) Proposta Comercial em PDF anexada ao card e (2) task de follow-up pendente criada
- **Negociação**: não possui próxima etapa pelo pipeline — encerramento apenas pelos botões "Ganho" ou "Perdido"; mensagem de erro clara ao tentar avançar pelo pipeline
- Board 8 (Expansão): sem regras de movimentação por enquanto

#### Proposta Comercial (Anexo PDF dedicado)
- Novo campo `attachment_type` (`VARCHAR(50) DEFAULT 'general'`) na tabela `attachments`
- Suporte a `attachment_type='proposal'` para classificar propostas comerciais separadamente dos anexos gerais
- Seção "Proposta Comercial" na aba Resumo do card — visível apenas para cards no board de Aquisição (board 7)
- Upload restrito a PDF, tamanho máximo 10MB
- Permite substituir ou remover a proposta existente
- Botão de download da proposta diretamente na seção
- Aviso visual informando que a proposta é obrigatória para avançar para Negociação

#### Melhorias na Interface do Pipeline
- `PipelineStages` recebe prop `hideTerminalStages` — oculta etapas "Negócio Ganho" e "Negócio Perdido" do pipeline visual para usuários não privilegiados
- Aviso âmbar exibido abaixo do pipeline quando o card está na última etapa visível, orientando o usuário a usar os botões Ganho/Perdido
- Erro de movimentação no `handleMoveCard` (CardDetails) agora exibe a mensagem exata retornada pela API ao invés de mensagem genérica

### Alterado
- `move_card` no backend: bloqueia saída de estágios terminais (Ganho/Perdido); entrada em terminais continua liberada pelos botões dedicados
- `move_card` registra `from_list_id`, `to_list_id`, `from_board_id`, `to_board_id` nos metadados da atividade
- Endpoint `POST /cards/{card_id}/attachments` aceita parâmetro `attachment_type` via form field (padrão: `'general'`)
- `attachmentService.uploadFile` no frontend aceita `attachmentType` como terceiro parâmetro

### Banco de Dados — Migrações
- `2026_02_25_1000-create_card_list_history.py` — cria tabela `card_list_history`
- `2026_02_25_1100-add_attachment_type.py` — adiciona coluna `attachment_type` em `attachments`

---

## [1.3.0] - 2026-02-24

### Adicionado

#### Módulo de Relatórios Customizados — Power BI-style (Frontend + Backend integrado)

**Builder de dashboards:**
- Layout 3 colunas: painel de campos | grid de gráficos | painel de configuração
- **Drag & drop** de campos para os eixos X e Y diretamente do painel de campos disponíveis
- **4 tipos de gráfico**: Barras, Linha, Pizza e Tabela — alternáveis em tempo real
- **Múltiplas séries no eixo Y** para bar/line: até 4 campos Y simultâneos, cada um com sua própria agregação e cor
- **Badge de agregação clicável** nos chips do eixo Y — cicla entre as opções disponíveis por tipo de campo (`count → distinct_count → sum → avg` para numéricos/moeda; `count → distinct_count` para demais)
- **Atualização em tempo real** — gráfico atualiza automaticamente a cada mudança; debounce de 400ms aplicado apenas na chamada à API, sem bloquear o estado local
- **Agrupamento temporal** no eixo X para campos de data: Dia / Semana / Mês / Ano
- **Correspondência visual** entre chips de configuração e séries do gráfico via `SERIES_COLORS` compartilhado
- **Relatórios salvos**: grid de cards com busca por nome, contador de gráficos e data de atualização

**Funcionalidade "Dividir por" (split_by):**
- Quebra as séries de um gráfico bar/line por uma dimensão categórica (ex: X=Data, Y=Quantidade, Dividir por=Vendedor → uma série por vendedor)
- Zona de drop dedicada com validação: aceita apenas campos groupable não-date
- Quando ativo, eixo Y fica limitado a 1 campo (split gera as séries automaticamente)

**Fontes de dados disponíveis:** Negócios, Clientes, Pessoas, Atividades, Tarefas

**Campos especiais:**
- **`meeting_count`** (fonte Tarefas): conta apenas tarefas do tipo reunião via `COUNT(CASE WHEN task_type='meeting' THEN 1 END)`
- **`won_count`** (fonte Negócios): conta apenas negócios ganhos via `COUNT(CASE WHEN is_won=1 THEN 1 END)`

**Backend — novos arquivos:**
- **`app/models/custom_report.py`**: Model `CustomReport` com tabela `custom_reports` no PostgreSQL
- **`app/schemas/custom_report.py`**: Schemas Pydantic completos — `QueryRequest`, `QueryResponse`, `CustomReportCreate`, `CustomReportResponse`, `FieldCatalogResponse`
- **`app/services/custom_report_service.py`**: Query engine com suporte a agrupamento temporal, agregações, campos categóricos, user e moeda; CRUD de relatórios
- **`app/api/v1/endpoints/custom_reports.py`**: 7 endpoints RESTful protegidos por role (`admin`/`manager`)
- Migration Alembic de criação da tabela `custom_reports`

**Endpoints:**
- `GET  /api/v1/reports/fields` — catálogo de campos por fonte de dados
- `POST /api/v1/reports/query` — executa query e retorna dados agregados
- `GET  /api/v1/reports/custom` — lista relatórios salvos
- `POST /api/v1/reports/custom` — cria novo relatório
- `GET  /api/v1/reports/custom/{id}` — busca por ID
- `PUT  /api/v1/reports/custom/{id}` — atualiza relatório
- `DELETE /api/v1/reports/custom/{id}` — exclui relatório

### Corrigido

- **Salvar relatório criava duplicata**: `handleOpenReport` não injetava o `id` no `currentReport`, fazendo o Save sempre chamar `createCustomReport` — corrigido passando `{ ...report.config, id: report.id }`
- **Título do gráfico não persistia ao salvar**: `debouncedTitle` de 400ms atrasava a atualização do estado, fazendo o Save ler o título antigo — corrigido movendo o debounce para a chamada à API

### Arquivos Criados

**Backend:**
- `app/models/custom_report.py`
- `app/schemas/custom_report.py`
- `app/services/custom_report_service.py`
- `app/api/v1/endpoints/custom_reports.py`
- `alembic/versions/XXXX_create_custom_reports_table.py`

### Arquivos Modificados

**Backend:**
- `app/api/v1/__init__.py` — registro do router de relatórios
- `app/models/__init__.py` — import do CustomReport

**Frontend:**
- `src/services/reportService.ts` — funções de integração com a API
- `src/pages/Reports.tsx` — integração completa com API (catálogo, query, CRUD)
- `src/components/reports/ChartConfigPanel.tsx` — split_by, debounce movido para o pai
- `src/components/reports/ChartWidget.tsx` — suporte a multi-série via `data.series`
- `src/components/reports/FieldPanel.tsx` — catálogo recebido como prop
- `src/components/reports/NewReportModal.tsx` — fonte Tarefas adicionada
- `src/components/reports/reportTypes.ts` — tipos `YFieldConfig`, `SeriesData`, `SERIES_COLORS`, `split_by`

---

## [1.2.0] - 2026-02-23

### 🎨 Novas Funcionalidades

#### Modo Claro (Light Mode) - Sistema de Temas Completo
- **Toggle de tema** no header do MainLayout: alterna entre modo claro e escuro com persistência no `localStorage`
- **Estratégia Tailwind `darkMode: 'class'`**: classe `dark` no `<html>`, prefixo `dark:` em todos os componentes
- **ThemeContext**: contexto React global com hook `useTheme()` expondo `darkMode` e `toggleTheme`
- **~1.600 classes `dark:` adicionadas** em todos os componentes e páginas do frontend
- **Cores programáticas tema-aware**: função `getChartColors(darkMode: boolean)` em `constants/colors.ts` para Recharts, React Flow e outros componentes que não suportam prefixo `dark:` do Tailwind
- **Sem regressões**: modo escuro mantém aparência idêntica à versão anterior

#### Componente Pagination Responsivo Light/Dark
- **Mobile-first**: navegação simplificada (Anterior / Página X de Y / Próxima) em telas pequenas
- **Desktop**: navegação completa com contador de registros, botões numéricos e Anterior/Próxima
- **Suporte total a modo claro**: `border-gray-200 bg-white text-slate-900` com variantes `dark:*`

### 🔧 Melhorias Técnicas

#### Frontend
- `tailwind.config.js`: habilitado `darkMode: 'class'`
- `ThemeContext.tsx`: contexto com persistência no `localStorage`
- `constants/colors.ts`: adicionado `getChartColors(darkMode)` para cores HEX tema-aware
- `main.tsx`: aplicação da classe `dark` no `<html>` via ThemeContext na inicialização
- **Dashboard, Reports, AutomationEditor, KanbanList**: substituídos `COLORS.surface.*`, `COLORS.content.*`, `COLORS.border.*` por `chartColors.*` via `getChartColors(darkMode)`
- **~100 arquivos atualizados**: todas as páginas, layouts, componentes comuns, modais, kanban, settings, gamification, automations

### 📝 Arquivos Modificados

#### Frontend
- `tailwind.config.js` - darkMode class habilitado
- `src/context/ThemeContext.tsx` - ThemeContext com localStorage
- `src/main.tsx` - inicialização do tema no html
- `src/layouts/MainLayout.tsx` - toggle de tema no header + versão 1.2.0
- `src/constants/colors.ts` - getChartColors adicionado
- `src/pages/Dashboard.tsx` - chartColors tema-aware
- `src/pages/Reports.tsx` - chartColors tema-aware
- `src/pages/AutomationEditor.tsx` - chartColors tema-aware
- `src/components/kanban/KanbanList.tsx` - chartColors tema-aware
- `src/components/common/Pagination.tsx` - light/dark mode + mobile-first responsivo
- `src/pages/Notifications.tsx` - usa componente Pagination ao invés de inline
- _~90 arquivos adicionais com classes `dark:` adicionadas_

---

## [1.1.10] - 2026-02-20

### ✨ Novas Funcionalidades

#### Reabertura de Negócio Perdido
- **Botão "Reabrir Negócio"** aparece no CardDetails quando o negócio está perdido, ao lado do badge vermelho
- **Modal de reabertura** com dois campos: título editável (pré-preenchido com o título original) e seleção do detalhamento do canal (Base - Resgate ou Base - Levantada de mão)
- **Clone completo do card original**: copia cliente, pessoa vinculada, informações de contato, responsável, SDR, valor, descrição, tipo de negócio, campos customizados, tarefas/atividades, anotações, arquivos e produtos
- Canal de aquisição do novo card é sempre definido como **Base** com o detalhamento escolhido pelo vendedor
- Novo card criado na lista de Prospecção (list_id=22, board_id=6)
- Card original permanece inalterado (continua como perdido)
- Histórico do card original registra entrada `card_reopened` com link para o novo card
- Após criação, redireciona automaticamente para o novo card
- Endpoint: `POST /api/v1/cards/{card_id}/reopen`

### 🔧 Melhorias

#### Valor do Negócio calculado por Produtos
- Campo **"Valor do negócio"** no Resumo do CardDetails agora é sempre somente leitura
- Valor calculado automaticamente com base nos produtos vinculados (`products_total`)
- Quando não há produtos: valor exibido em cinza com hint "Adicione produtos na seção Produtos para calcular o valor automaticamente"
- Quando há produtos: valor exibido em verde com texto "Calculado automaticamente com base nos produtos vinculados"

#### Atualização das opções de Canal de Aquisição - Detalhamento
- **Indicação**: substituídas opções antigas por `Ex-cliente` e `Networking pessoal`
- **Parcerias**: substituídas por `Consultorias`, `Integradores`, `Representantes` e `Outras empresas`
- **Eventos**: removido `Webinar`, `Workshop` virou `Workshop próprio`, adicionado `Palestra`
- **Base**: substituídas todas as opções por `Resgate`, `Levantada de mão`, `e-mail marketing` e `Disparo whats`

### 🐛 Correções

#### Erro ao salvar configuração API4COM
- **Problema**: endpoint `POST /api/v1/api4com/config` lançava `AttributeError: type object 'API4ComConfig' has no attribute 'is_deleted'` pois o modelo não possui esse campo
- **Solução**: removidos os filtros `is_deleted == False` incorretos dos endpoints de config e ramais (API4ComConfig e UserExtension não implementam soft delete)

#### Arquivos duplicados na reabertura de negócio
- **Problema**: ao reabrir um negócio, arquivos deletados (soft delete) eram copiados junto com os ativos, pois o filtro usava `is_deleted == False` — mas o soft delete de attachments é feito via `deleted_at`, não `is_deleted`
- **Solução**: filtro corrigido para `deleted_at.is_(None)`, alinhado com o `AttachmentRepository`

---

## [1.1.9] - 2026-02-19

### ✨ Novas Funcionalidades

#### Histórico de Arquivos no CardDetails
- **Aba "Arquivos"** no Histórico registra eventos de upload e exclusão de anexos
- **Upload de arquivo** (`file_attached`): nome e tamanho em MB registrados no histórico
- **Exclusão de arquivo** (`file_deleted`): nome e tamanho registrados com ícone vermelho
- Badge com contagem de eventos de arquivo na aba

#### Aba "Alterações" no Histórico do Card
- **Nova aba dedicada** para mudanças diretas no card, separando de atividades de tarefa
- Eventos rastreados:
  - **Etapa alterada** (`card_moved`): de qual lista para qual lista
  - **Card ganho** (`card_won`): qual lista marcada como fechado/ganho
  - **Card perdido** (`card_lost`): qual lista marcada como perdido
  - **Valor alterado** (`card_value_changed`): valor anterior e novo formatados em R$
  - **Título alterado** (`card_title_changed`): título anterior e novo
  - **Responsável alterado** (`card_assigned_changed`): nome anterior e novo
  - **Data limite alterada** (`card_due_date_changed`): data anterior e nova
  - **Pessoa vinculada** (`person_linked`): nome da pessoa
  - **Pessoa desvinculada** (`person_unlinked`): nome da pessoa
  - **Produto adicionado** (`product_added`): nome do produto
  - **Produto removido** (`product_removed`): nome do produto
- Badge com contagem de alterações na aba
- Aba "Atividades" filtrada para exibir apenas eventos de tarefas (`task_*`)

#### Planilha Padronizada de Importação para SDRs
- **Script Python** `backend/scripts/create_import_sheet.py` para gerar a planilha
- **47 colunas** em 8 seções coloridas: Empresa, Telefones/Emails, Contato Principal, Contato 2, Contato 3, Card/Negócio, Atividades (3 slots), Anotações
- **Dropdowns com bloqueio** (`errorStyle="stop"`) para todos os campos fixos:
  - Canal de Aquisição: Inbound, Outbound, Indicação, Parcerias, Eventos, Base
  - Canal de Aquisição - Detalhe: 22 opções (ex: "Outbound - Cold call")
  - Tipo de Negócio: Nova Venda, Cross Sell, Up Sell
  - Tipo de Atividade: 8 opções (Ligação, WhatsApp, Email, etc.)
  - Faixa de Funcionários: 6 faixas exatas do CRM
  - Faixa de Faturamento: 6 faixas exatas do CRM
  - Estado (UF): 27 estados brasileiros
- **Contato 2 e 3**: mantidos para coleta, salvos nas Anotações do card (CRM vincula apenas 1 pessoa por card)
- **Aba de Referência oculta** com todas as listas para os dropdowns
- Painéis congelados (linhas 1-4 e colunas A-B) para navegação facilitada

### 🐛 Correções

#### Decimal não serializável em JSON (card_value_changed)
- **Problema**: PostgreSQL retorna `Decimal` para campos NUMERIC, causando `TypeError: Object of type Decimal is not JSON serializable` ao tentar salvar no `activity_metadata`
- **Solução**: conversão explícita para `float()` antes de armazenar o valor no metadata da atividade

#### Sessão SQLAlchemy corrompida após exceção no histórico
- **Problema**: Quando o registro de atividade falhava com exceção, a sessão entrava em estado "needs rollback", fazendo o endpoint retornar 500 mesmo com o card já salvo com sucesso
- **Solução**: adicionado `self.db.rollback()` no bloco `except` para resetar o estado da sessão sem desfazer o commit anterior do card

### 🔧 Melhorias Técnicas
- `ActivityRepository.create()` adicionado nos endpoints de anexos (`attachments.py`) para registrar upload e exclusão no histórico visível ao usuário
- `ProductService` passou a registrar eventos de produto no `ActivityRepository` (antes só ia para `AuditLog`)
- `CardService.update_card()` captura snapshot dos campos antes do update para comparação e geração dos eventos de alteração
- `CardService.move_card()` registra evento de movimentação, ganho ou perda de card automaticamente

---

## [1.1.8] - 2026-02-12

### ✨ Novas Funcionalidades

#### Sistema de Avatares de Usuário
- **Upload de avatar pessoal** na página de Configurações
- **Exclusão de avatar** com confirmação
- **Componente reutilizável UserAvatar**:
  - Exibe foto do usuário ou fallback com iniciais do nome
  - Tamanhos configuráveis (xs, sm, md, lg, xl)
  - Indicador de status online opcional
  - Tratamento automático de erro de carregamento
  - Gradiente azul/cyan nas iniciais
- **Backend completo**:
  - Upload: POST `/api/v1/users/me/avatar`
  - Download: GET `/api/v1/users/{user_id}/avatar`
  - Exclusão: DELETE `/api/v1/users/me/avatar`
  - Validação de tipo (JPG, PNG, GIF, WEBP)
  - Limite de 5MB por arquivo
  - Armazenamento em `/app/uploads/avatars/`
  - Soft delete para recuperação
- **Integração visual**:
  - Avatar no header do MainLayout
  - Avatar na página de Usuários
  - Avatar no CardDetails (Responsável e SDR)
  - Avatar no KanbanCard (lado a lado: SDR à esquerda, Vendedor à direita)

#### Badge Inteligente de Atividades Pendentes
- **Novo badge visual** no canto superior direito de cada card do Kanban
- **Sistema de cores inteligente** baseado em prioridade:
  - 🔴 **Vermelho**: Atividades atrasadas (overdue)
  - 🟢 **Verde**: Atividades para hoje
  - 🟣 **Roxo**: Atividades futuras
  - ⚫ **Cinza**: Sem atividades (não clicável)
- **Ícone CheckSquare** sem número (design mais limpo)
- **Backend otimizado**:
  - Query única para todas as atividades pendentes de todos os cards
  - Cálculo inteligente de status em UTC timezone
  - Campos adicionados ao CardMinimalResponse: `pending_tasks_count`, `pending_tasks_status`

#### Modal de Atividades Pendentes
- **Modal com lazy loading**: Carrega atividades apenas ao clicar no badge
- **Tamanho fixo igual às listas do Kanban** (320px x tela cheia)
- **Visual consistente** com FocusSection do CardDetails:
  - Ícones por tipo de atividade (Phone, Users, CheckSquare, Clock, Mail, Coffee)
  - Badges coloridos por tipo
  - StatusBadge mostrando se é HOJE, VENCIDO ou data futura
  - Badges de prioridade (Normal, Alta, Urgente)
  - Nome do responsável
- **Navegação integrada**: Clicar em uma atividade abre o CardDetails
- **Scroll automático**: Quando tem muitas atividades

#### Tooltips nos Avatares
- **Hover mostra o nome do usuário** em todos os avatares
- **Implementado em**:
  - CardDetails: Responsável e SDR (admin/manager e vendedor views)
  - KanbanCard: Todos os avatares via componente UserAvatar
  - Dropdowns de seleção de usuários
- **Nativo HTML**: Usa atributo `title` para tooltip do navegador

### 🎨 Padronização de Cores

#### StatusBadge Atualizado
- **Verde**: Status "HOJE" (era amarelo)
- **Roxo**: Status "FUTURO" (era amarelo)
- **Vermelho**: Status "VENCIDO" (mantido)
- **Verde escuro**: Status "CONCLUÍDO" (mantido)

#### Badges de Prioridade Padronizados
- **Azul**: Prioridade "Normal" (era cinza)
- **Amarelo**: Prioridade "Alta" (mantido)
- **Vermelho**: Prioridade "Urgente" (mantido)

### 🔧 Melhorias Técnicas

#### Backend
- **Model**: `User.avatar_url` (String nullable)
- **Service**: `AvatarService` com upload, download, delete e validação
- **Repository**: `UserRepository.update()` para atualizar avatar_url
- **Endpoints**: 3 rotas RESTful documentadas
  - POST `/users/me/avatar` - Upload
  - GET `/users/{user_id}/avatar` - Download
  - DELETE `/users/me/avatar` - Exclusão
- **CardService**: Otimização de query para buscar atividades pendentes de múltiplos cards em uma única consulta SQL
- **Schemas**: Campos `sdr_name`, `sdr_avatar_url`, `pending_tasks_count`, `pending_tasks_status` adicionados

#### Frontend
- **Service**: `avatarService.ts` com helpers de validação e URL
- **Component**: `UserAvatar.tsx` reutilizável e totalmente configurável
- **Modal**: `CardActivitiesModal.tsx` com navegação e visual padronizado
- **Integration**: Avatar integrado em 5+ componentes diferentes
- **UX**: Estados de loading, validação client-side, confirmação de exclusão

### 🐛 Correções

#### Avatar Upload
- **Problema**: Avatar aparece salvo mas não mostra em lugar nenhum
- **Solução**:
  - Backend retornando URL relativa correta
  - Frontend usando avatarService.getAvatarUrl() para gerar URL completa
  - UserAvatar component com fallback para iniciais
- **Resultado**: Avatar visível em todos os lugares do sistema

#### Modal de Atividades
- **Problema**: Tamanho da modal diferente das listas do Kanban
- **Solução**: Largura fixa `w-80` (320px) igual às listas, altura `h-full` com scroll interno
- **Resultado**: Modal visualmente consistente com as colunas do board

### 📝 Arquivos Criados

#### Backend
- `app/services/avatar_service.py` - Serviço de gestão de avatares
- `app/api/v1/endpoints/avatars.py` - Endpoints de avatar (integrado em users.py)

#### Frontend
- `src/components/common/UserAvatar.tsx` - Componente reutilizável de avatar
- `src/components/kanban/CardActivitiesModal.tsx` - Modal de atividades pendentes
- `src/services/avatarService.ts` - API service para avatares

### 📝 Arquivos Modificados

#### Backend
- `app/models/user.py` - Adicionada coluna avatar_url
- `app/schemas/card.py` - Campos sdr_name, sdr_avatar_url, pending_tasks_count, pending_tasks_status
- `app/repositories/user_repository.py` - Método update() para avatar
- `app/services/card_service.py` - Query otimizada para atividades pendentes
- `app/api/v1/endpoints/users.py` - Rotas de avatar adicionadas

#### Frontend
- `src/pages/Settings.tsx` - Upload e exclusão de avatar
- `src/pages/CardDetails.tsx` - Tooltips nos avatares
- `src/layouts/MainLayout.tsx` - Avatar no header + versão 1.1.8
- `src/components/kanban/KanbanCard.tsx` - Badge de atividades + avatares com tooltip
- `src/components/cardDetails/StatusBadge.tsx` - Cores atualizadas
- `src/components/cardDetails/FocusSection.tsx` - Prioridade Normal azul
- `src/components/cardDetails/QuickActivityForm.tsx` - Prioridade Normal azul
- `src/components/common/UserAvatar.tsx` - Tooltips adicionados
- `src/components/common/index.ts` - Export de UserAvatar
- `src/pages/Users.tsx` - Integração com UserAvatar

---

## [1.1.7] - 2026-02-12

### ✨ Novas Funcionalidades

#### Sistema de Anexos de Arquivos
- **Upload de arquivos** vinculados a cards
- **Tipos suportados**: PDF, DOCX, XLSX, TXT, CSV, imagens (JPG, PNG, GIF, WEBP), ZIP, RAR, 7Z
- **Limite de tamanho**: 10MB por arquivo
- **Armazenamento**: Persistente em volume Docker (`/app/uploads`)
- **Funcionalidades completas**:
  - Upload via drag & drop ou clique
  - Upload múltiplo de arquivos
  - Download de arquivos
  - Preview inline de imagens e PDFs
  - Exclusão de arquivos
  - Contador de arquivos na aba
  - Ícones diferenciados por tipo de arquivo
  - Soft delete (recuperação possível)

#### Modal de Preview de Arquivos
- **Preview nativo no sistema** para imagens e PDFs
- **Botão "olho"** ao lado de cada arquivo compatível
- **Modal em tela cheia** usando BaseModal padrão do sistema
- **Funcionalidades**:
  - Visualização de imagens (PNG, JPG, GIF, WEBP)
  - Visualização de PDFs com scroll
  - Botão de download dentro da modal
  - Fechar com ESC ou botão X
  - Estados de loading e erro
  - Z-index elevado (3000) para evitar sobreposição

#### Logs de Auditoria para Anexos
- **Registro completo** de todas as operações com arquivos:
  - **CREATE** - Upload de arquivo (registra nome, tamanho, tipo, card)
  - **READ** - Download de arquivo (registra quem baixou qual arquivo)
  - **DELETE** - Exclusão de arquivo (registra informações antes de deletar)
- **Informações capturadas**: usuário, IP, user-agent, timestamp, detalhes da ação
- **Compliance**: Rastreabilidade completa de acesso a arquivos sensíveis

### 🔧 Melhorias Técnicas

#### Backend
- **Model**: `Attachment` com soft delete e propriedades calculadas
  - Campos: filename, original_filename, file_size, mime_type, storage_path
  - Propriedades: file_size_mb, file_extension, is_image, is_pdf, is_document
  - Relationships: card, uploaded_by
- **Migration**: Tabela attachments com coluna is_deleted (SoftDeleteMixin)
- **Repository**: CRUD completo + métodos de estatísticas
- **Service**: Validação, upload, download, delete com gerenciamento de arquivos físicos
- **Endpoints**: 4 rotas RESTful documentadas
  - POST `/cards/{card_id}/attachments` - Upload
  - GET `/cards/{card_id}/attachments` - Listar
  - GET `/attachments/{attachment_id}/download` - Download
  - DELETE `/attachments/{attachment_id}` - Deletar
- **Auditoria**: Integração com AuditLog em todos os endpoints

#### Frontend
- **Service**: `attachmentService.ts` com helpers de validação e formatação
- **Component**: `FilesSection.tsx` com drag & drop e gestão de estado
- **Modal**: `FilePreviewModal.tsx` usando BaseModal padrão
- **Integration**: Contador de arquivos no CardDetails
- **UX**: Loading states, validação client-side, mensagens de erro

### 🐛 Correções

#### Migration do Alembic
- **Problema**: Migration faltando coluna `is_deleted` do SoftDeleteMixin
- **Solução**: Adicionada coluna is_deleted (Boolean, default false) na migration
- **Resultado**: Model Attachment sincronizado com schema do banco

#### Logs de Auditoria
- **Problema**: Tentativa de acessar `service.attachment_repo` (atributo inexistente)
- **Solução**: Corrigido para usar `service.repository` (atributo correto)
- **Resultado**: Logs de auditoria funcionando para download e delete

#### Modal de Preview
- **Problema**: Modal sendo escondida por elementos do layout (z-index)
- **Solução**: Migrado para BaseModal padrão com ReactDOM.createPortal
- **Resultado**: Modal renderiza no body com z-index 3000, sempre visível

### 📝 Arquivos Criados

#### Backend
- `app/models/attachment.py` - Model SQLAlchemy
- `app/schemas/attachment.py` - Schemas Pydantic
- `app/repositories/attachment_repository.py` - Data access layer
- `app/services/attachment_service.py` - Business logic
- `app/api/v1/endpoints/attachments.py` - API endpoints
- `alembic/versions/2026_02_12_1430-add_attachments_table.py` - Migration

#### Frontend
- `src/services/attachmentService.ts` - API service
- `src/components/cardDetails/FilesSection.tsx` - Upload/lista component
- `src/components/cardDetails/FilePreviewModal.tsx` - Preview modal

### 📝 Arquivos Modificados

#### Backend
- `app/models/__init__.py` - Import do Attachment
- `app/models/card.py` - Relationship com attachments
- `app/api/v1/__init__.py` - Router de attachments
- `app/api/v1/endpoints/attachments.py` - Logs de auditoria

#### Frontend
- `src/pages/CardDetails.tsx` - Contador de arquivos e integração
- `src/components/cardDetails/FilesSection.tsx` - Preview button e modal
- `src/layouts/MainLayout.tsx` - Versão atualizada para 1.1.7

---

## [1.1.6] - 2026-02-11

### 🎨 Adicionado

#### Sistema de Cores Centralizado
- Criado `constants/colors.ts` com palette de cores HEX centralizada
- Expandido `tailwind.config.js` com palette semântica completa
- Cores organizadas por: primary, surface, content, border, status, board
- Sistema de tematização preparado para modo claro/escuro

#### Componentes Comuns Reutilizáveis
- `LoadingSpinner` - Spinner padronizado com 3 tamanhos (sm, md, lg)
- `SearchInput` - Input de busca com ícone integrado
- `Pagination` - Componente de paginação responsivo (mobile e desktop)
- `PageHeader` - Cabeçalho padronizado para páginas com título, descrição, ícone e ações

#### Hooks Reutilizáveis
- `usePagination` - Gerencia paginação client-side com lógica completa
- `useCRUD` - Encapsula operações create, read, update, delete
- `useFilter` - Sistema de filtros flexível com helpers
- `filterHelpers` - Funções auxiliares para filtros comuns

#### Utilitários Centralizados
- `utils/formatters.ts` - Biblioteca de formatação e máscaras:
  - `maskPhone` - Máscara de telefone brasileiro
  - `maskCPF` - Máscara de CPF
  - `maskCNPJ` - Máscara de CNPJ
  - `maskDocument` - Auto-detecta CPF/CNPJ
  - `maskCEP` - Máscara de CEP
  - `maskCNAE` - Máscara de CNAE
  - `formatDate` - Formata data para pt-BR
  - `formatDateTime` - Formata data e hora para pt-BR
  - `formatCurrency` - Formata moeda brasileira
  - `unmask` - Remove formatação

- `utils/toast.ts` - Sistema de notificações padronizado
  - `showSuccess` - Toast de sucesso
  - `showError` - Toast de erro

### ♻️ Refatorado

#### Páginas Padronizadas (6 páginas)
- `pages/Users.tsx` - Migrada para hooks + layout components
- `pages/Persons.tsx` - Migrada para hooks + layout components + CRUD
- `pages/Clients.tsx` - Migrada para hooks + layout components + CRUD
- `pages/Products.tsx` - Migrada para hooks + layout components + CRUD
- `pages/Automations.tsx` - Migrada para hooks + layout components + filtros
- `pages/Notifications.tsx` - Verificada (mantida com server-side pagination)

#### Modais Padronizados
- `PersonModal.tsx` - Usando formatters centralizados
- `ClientModal.tsx` - Usando formatters centralizados
- `BoardModal.tsx` - Usando cores centralizadas + toast
- `UserModal.tsx` - Usando toast padronizado
- `TransferModal.tsx` - Usando toast padronizado
- `CardDetailModal.tsx` - Usando toast padronizado

#### Error Handling Unificado
- Migrados 20+ arquivos de `alert()` para `showSuccess/showError`
- Sistema de notificações consistente em todo o frontend
- Toast com estilo padronizado do sistema de cores

### 🗑️ Removido

#### Código Duplicado Eliminado (~3000 linhas)
- Funções de paginação duplicadas (eliminadas ~900 linhas)
- Lógica CRUD duplicada (eliminadas ~400 linhas)
- Lógica de filtros duplicada (eliminadas ~200 linhas)
- Headers de páginas duplicados (eliminadas ~150 linhas)
- Inputs de busca duplicados (eliminadas ~100 linhas)
- Componentes de paginação JSX duplicados (eliminadas ~550 linhas)
- Máscaras de formatação duplicadas (eliminadas ~77 linhas)
- Cores HEX hardcoded em múltiplos arquivos (eliminadas ~100 linhas)
- `alert()` e `console.error()` inconsistentes (eliminadas ~800 linhas)

### 🐛 Corrigido
- Corrigidas estruturas JSX com divs extras em 4 páginas
- Adicionados imports faltando de ícones (User) em Clients e Persons
- Corrigida indentação inconsistente em componentes de filtros

### 📊 Impacto Total
- **~3000 linhas de código duplicado eliminadas**
- **16 novos componentes e utilitários criados**
- **40+ arquivos refatorados e padronizados**
- **Desenvolvimento 6x mais rápido** para novas páginas CRUD
- **Sistema totalmente tematizável** em um único arquivo
- **Manutenção drasticamente simplificada**

### 📝 Arquivos Criados

#### Frontend
- `src/constants/colors.ts` - Sistema de cores centralizado
- `src/components/common/LoadingSpinner.tsx` - Spinner padronizado
- `src/components/common/SearchInput.tsx` - Input de busca
- `src/components/common/Pagination.tsx` - Paginação responsiva
- `src/components/common/PageHeader.tsx` - Header de página
- `src/hooks/usePagination.ts` - Hook de paginação
- `src/hooks/useCRUD.ts` - Hook CRUD
- `src/hooks/useFilter.ts` - Hook de filtros
- `src/utils/filterHelpers.ts` - Helpers de filtros
- `src/utils/formatters.ts` - Formatadores e máscaras
- `src/utils/toast.ts` - Sistema de toast

### 📝 Arquivos Modificados

#### Frontend
- `tailwind.config.js` - Palette semântica expandida
- `src/pages/Users.tsx` - Refatorado com hooks
- `src/pages/Persons.tsx` - Refatorado com hooks
- `src/pages/Clients.tsx` - Refatorado com hooks
- `src/pages/Products.tsx` - Refatorado com hooks
- `src/pages/Automations.tsx` - Refatorado com filtros
- `src/components/persons/PersonModal.tsx` - Formatters
- `src/components/clients/ClientModal.tsx` - Formatters
- `src/components/boards/BoardModal.tsx` - Cores + toast
- `src/components/users/UserModal.tsx` - Toast
- `src/components/transfers/TransferModal.tsx` - Toast
- `src/components/kanban/CardDetailModal.tsx` - Toast
- `src/layouts/MainLayout.tsx` - Versão atualizada para 1.1.6

---

## [1.1.5] - 2026-02-10

### ✨ Novas Funcionalidades

#### Edição Inline de Cliente e Pessoa no CardDetails
- **Botões "Modificar cadastro"** substituem "Ver página completa"
- **Edição direta no CardDetails**: Não precisa mais navegar para outra página
- **Modal de edição inline**:
  - Clique em "Modificar cadastro do cliente/pessoa" abre modal com dados preenchidos
  - Edite os campos necessários
  - Ao salvar, dados são atualizados automaticamente no CardDetails
- **UX melhorada**: Experiência fluida sem sair da página do card
- Aplicado em ClientSection e ContactSection

### 🔧 Melhorias de Usabilidade

#### Simplificação de Campos de Contato
- **E-mails reduzidos de 4 para 3 campos**:
  - Email Principal (novo)
  - Email Comercial
  - Email Pessoal
  - ~~Email Alternativo~~ (removido do frontend)
- **Telefones reduzidos de 4 para 3 campos**:
  - Telefone Principal (novo)
  - WhatsApp
  - Telefone Comercial
  - ~~Telefone Alternativo~~ (removido do frontend)
- **Campos mantidos no banco de dados** para uso futuro
- Interface mais limpa e fácil de usar
- Aplicado em PersonModal, ContactSection e páginas de Pessoas

#### Padronização da Seção Cliente no CardDetails
- **Todos os campos sempre visíveis**: Não oculta mais campos vazios
- **"Não informado" em campos vazios**: Mesmo padrão da seção de pessoa
- **Seção de Contato reorganizada**:
  - Subdividida em "Telefone" e "Email"
  - Labels claros para cada subcampo
- **Consistência visual**: Cliente e Pessoa agora seguem o mesmo padrão
- Facilita identificar quais dados estão faltando

### 📝 Arquivos Modificados

#### Frontend
- `src/components/cardDetails/ClientSection.tsx` - Botão de edição inline e padronização de campos
- `src/components/cardDetails/ContactSection.tsx` - Botão de edição inline e remoção de campos alternativos
- `src/components/persons/PersonModal.tsx` - Remoção de campos alternativos do formulário
- `src/layouts/MainLayout.tsx` - Atualização de versão para 1.1.5

---

## [1.1.4] - 2026-02-10

### ✨ Novas Funcionalidades

#### Cadastro Rápido de Cliente/Pessoa no CardDetails
- **Novos botões "Cadastrar"** nas seções de Cliente e Pessoa do CardDetails
- Layout em grid 2 colunas: "Vincular" (azul) + "Cadastrar" (verde)
- **Fluxo otimizado**:
  - Clique em "Cadastrar" abre modal de criação
  - Após salvar, automaticamente vincula ao card
  - Não precisa sair da página de detalhes do card
- **Vínculo automático**: Sistema busca o registro recém-criado e vincula ao card
- Mensagem de erro amigável caso o vínculo automático falhe

#### Atualização Otimista na Seção Resumo
- **Feedback instantâneo**: Campos atualizam imediatamente na tela sem reload
- **UX aprimorada**: Não fecha mais a seção ao editar campos
- **Seção permanece aberta**: Usuário não perde contexto de onde estava
- **Reversão automática**: Se houver erro, reverte a mudança e mostra mensagem
- Aplicado em todos os campos editáveis da seção Resumo:
  - Valor do negócio
  - Probabilidade de fechamento
  - Data esperada de fechamento
  - SDR responsável
  - Tipo de negócio
  - Canal de aquisição e detalhamento
  - Motivo da perda
  - Tem implementação / Tem pessoas para manusear

#### Busca Sob Demanda para Vincular Cliente/Pessoa
- **Não carrega mais automaticamente** milhares de registros ao abrir o modal
- **Busca dinâmica no backend** com debounce de 500ms
- **Mensagens claras**: "Digite o nome, CPF ou CNPJ para buscar"
- **Performance melhorada**: Limita resultados a 100 registros por busca
- Aplicado tanto em ClientSection quanto ContactSection

### 🔒 Melhorias de Segurança e Permissões

#### Restrição de Criação de Boards
- **Backend**: Apenas Admin e Manager podem criar novos boards
- **Frontend**: Botão "Novo Board" visível apenas para Admin/Manager
- **Resposta 403**: Endpoint retorna erro claro se vendedor tentar criar via API
- EmptyState ajustado para mostrar mensagem apropriada

#### Restrição de Criação e Reordenação de Listas
- **Backend**: Apenas Admin e Manager podem criar listas
- **Frontend**: Botão "Nova Lista" visível apenas para Admin/Manager
- **Botões de reordenação**: Setas de mover lista (esquerda/direita) ocultas para vendedores
- Prop `canManageLists` passada para KanbanList component
- Documentação clara na API (resposta 403)

### 🔧 Melhorias de Usabilidade

#### Modal de Cliente
- **Campo renomeado**: "Nome" → "Empresa" para maior clareza
- **Ícone atualizado**: User → Building (ícone de prédio)
- **Hint atualizado**: "Razão social ou nome da empresa"
- **Placeholder atualizado**: "Ex: Empresa LTDA"
- Reduz confusão entre nome da empresa e nome da pessoa

#### CPF/CNPJ Obrigatório
- **Campo CPF/CNPJ agora é obrigatório** no cadastro de clientes
- **Validação de tamanho**: Verifica se tem 11 dígitos (CPF) ou 14 (CNPJ)
- **Mensagens de erro claras**:
  - "CPF/CNPJ é obrigatório"
  - "CPF/CNPJ inválido. CPF deve ter 11 dígitos e CNPJ 14 dígitos"
- Hint atualizado para "Documento de identificação (obrigatório)"

### 🐛 Correções

#### Atualização de Campos no CardDetails
- **Problema**: Ao editar campo na seção Resumo, página recarregava e fechava a seção
- **Solução**: Implementada atualização otimista com estado local
- **Resultado**: Experiência fluida sem perda de contexto

#### Performance na Busca de Clientes/Pessoas
- **Problema**: Modal carregava 10.000 registros ao abrir, causando lentidão
- **Solução**: Busca apenas quando usuário digita, com limite de 100 resultados
- **Resultado**: Abertura instantânea do modal, busca rápida

### 📝 Arquivos Modificados

#### Backend
- `app/api/v1/endpoints/boards.py` - Permissões de criação de board e lista
- `app/repositories/person_repository.py` - Ajuste para permitir null values
- `app/services/automation_service.py` - Proteção contra sobrescrever vendedores/SDRs

#### Frontend
- `src/pages/Boards.tsx` - Restrição de criação de boards
- `src/pages/KanbanBoard.tsx` - Restrição de criação e reordenação de listas
- `src/components/kanban/KanbanList.tsx` - Prop canManageLists
- `src/pages/CardDetails.tsx` - Função handleOptimisticUpdate
- `src/components/cardDetails/SummarySection.tsx` - Uso de atualização otimista
- `src/components/cardDetails/ClientSection.tsx` - Botão cadastrar + busca sob demanda
- `src/components/cardDetails/ContactSection.tsx` - Botão cadastrar + busca sob demanda
- `src/components/clients/ClientModal.tsx` - CPF/CNPJ obrigatório + label "Empresa"
- `src/layouts/MainLayout.tsx` - Versão atualizada para 1.1.4

---

## [1.1.3] - 2026-02-09

### ✨ Novas Funcionalidades

#### Sistema de Rodízio de SDRs
- **Nova ação de automação**: `assign_sdr_round_robin` para distribuir cards automaticamente entre SDRs
- **Componente visual**: Node configurável no editor de automações com seleção de SDRs participantes
- **Backend**: Implementada função `_assign_sdr_round_robin` que gerencia rodízio equilibrado via estado da automação
- **Frontend**:
  - Avatar e dropdown de SDR no CardDetails para atribuição manual
  - Filtro por role "sdr" na configuração do rodízio
  - Cores cyan/blue para diferenciar SDR de vendedor
  - Ícone UserPlus com borda cyan no ActionNode

#### Busca Global de Cards
- **Novo componente**: GlobalSearch.tsx no MainLayout para buscar cards em todos os boards
- **Endpoint**: `/api/v1/cards/search/global` com busca por título
- **Funcionalidades**:
  - Debounce de 300ms para otimizar requisições
  - Atalho de teclado: Ctrl+K (Windows) / Cmd+K (Mac)
  - Dropdown com resultados mostrando: título, board/lista, responsável, valor
  - Limite configurável de resultados (padrão: 10)
  - Respeita permissões (vendedor vê apenas seus cards)

#### Sistema de Tipos de Atividade Simplificado
- **Removidos tipos**: email, lunch, deadline (desnecessários no fluxo atual)
- **Adicionado tipo**: follow_up (acompanhamento/retorno ao cliente)
- **Tipos finais** (5): call, meeting, task, follow_up, other
- Grid responsivo ajustado para nova quantidade de tipos

#### Melhorias na Seção Foco para Reuniões
- **Campos editáveis adicionados**:
  - Anotações (textarea) - para registrar pontos importantes da reunião
  - Link da gravação (input URL) - para vincular gravação do Google Meet/Zoom
- **Removido**: Campo "Local" (não utilizado no fluxo)
- **Botão NoShow**: Novo botão para reuniões não realizadas
  - Cor laranja para destaque visual
  - Dispara automação ID 12 (configurável)
  - Move card automaticamente para lista 25 (Reagendamento)
  - Marca atividade como concluída

### 🔧 Melhorias Técnicas

#### Backend
- **Automação**: Novo ActionType `ASSIGN_SDR_ROUND_ROBIN` no enum de ações
- **Estado persistente**: Rodízio de SDR mantém estado em `automation.state["round_robin_last_sdr_id"]`
- **Filtro de usuários**: Busca apenas usuários com `role = "sdr"` para rodízio de SDRs
- **Endpoint de busca**: Query otimizada com filtro por título usando ILIKE

#### Frontend
- **NodeConfigPanel**: Carrega todos os usuários ativos e aplica filtro específico por role na renderização
  - Rodízio de Vendedores: filtra `role === "salesperson"`
  - Rodízio de SDRs: filtra `role === "sdr"`
- **CardDetails**:
  - Estados gerenciados para dropdown e loading de SDR
  - Funções `handleChangeSdr` e `handleAutoAssignSdr` (comentado por enquanto)
  - Variável `sdrUsers` filtra apenas SDRs para dropdown
- **FocusSection**:
  - Import de `automationService` para disparar automações
  - Função `handleNoShow` dispara automação e marca atividade concluída
  - Campos `notes` e `video_link` adicionados ao formulário de edição

### 🐛 Correções

#### Filtro de Usuários em Automações
- **Problema**: NodeConfigPanel carregava apenas vendedores e gerentes, excluindo SDRs
- **Solução**: Removido filtro prematuro, agora carrega todos os usuários ativos e aplica filtro específico por tipo de rodízio
- **Impacto**: Rodízio de SDRs agora exibe corretamente a lista de SDRs disponíveis

### 📝 Arquivos Modificados

#### Backend
- `app/schemas/automation.py` - Adicionado ASSIGN_SDR_ROUND_ROBIN ao ActionType enum
- `app/services/automation_service.py` - Implementada função _assign_sdr_round_robin
- `app/schemas/card_task.py` - Ajustado enum TaskType (removidos 3 tipos, adicionado follow_up)
- `app/api/v1/endpoints/cards.py` - Novo endpoint /search/global

#### Frontend
- `src/components/automations/NodesSidebar.tsx` - Adicionado node "Rodízio de SDRs"
- `src/components/automations/NodeConfigPanel.tsx` - Configuração de SDR round robin + fix de filtros
- `src/components/automations/ActionNode.tsx` - Ícone e cor cyan para assign_sdr_round_robin
- `src/components/cardDetails/QuickActivityForm.tsx` - Tipos de atividade simplificados
- `src/components/cardDetails/FocusSection.tsx` - Campos editáveis e botão NoShow para reuniões
- `src/components/GlobalSearch.tsx` - Novo componente de busca global (criado)
- `src/layouts/MainLayout.tsx` - Integração do GlobalSearch no header
- `src/pages/CardDetails.tsx` - Avatar/dropdown de SDR + funções de atribuição
- `src/services/cardService.ts` - Método globalSearch adicionado
- `src/types/index.ts` - Tipos já existentes (sdr_id, sdr_name, sdr)

---

## [1.1.2] - 2026-02-06

### Adicionado

#### Página de Documentação Customizada da API (`/api-docs`)
- **Nova página de vitrine profissional** da API, estilo Stripe/Twilio API docs
- Página HTML auto-contida servida pelo FastAPI em `/api-docs`
- Carrega dinamicamente o `/openapi.json` e renderiza tudo via JavaScript
- **Identidade visual** replicando o frontend (dark theme, gradients slate-950, Tailwind CSS)
- **CDNs utilizados**: Tailwind CSS 3.4, Lucide Icons, Marked.js, Google Fonts (Inter, JetBrains Mono)

#### Funcionalidades da Página
- **Header fixo**: Logo com gradient cyan-blue, nome, versão da API, links para Swagger/ReDoc/OpenAPI JSON
- **Sidebar fixa (w-72)**: Busca com debounce (200ms), atalho Ctrl+K, índice das 21 categorias com contagem de endpoints, scroll spy com IntersectionObserver
- **Hero section**: Descrição da API em Markdown renderizado, cards de estatísticas (endpoints/schemas/categorias), base URL com botão copiar
- **21 categorias** com ícones Lucide mapeados individualmente
- **Cards de endpoint colapsáveis** com:
  - Badge colorido por método HTTP (GET=emerald, POST=blue, PUT=amber, DELETE=red, PATCH=orange)
  - Path em monospace, summary e description (Markdown)
  - Tabela de parâmetros (nome, tipo, in, obrigatório, descrição)
  - Request body com JSON example, syntax highlighting e botão copiar
  - Responses por status code (colapsáveis com botão copiar)
  - Campos do schema em `<details>` expansível
- **Responsivo**: Sidebar esconde em mobile com overlay e botão menu hamburger
- **Skeleton loader** enquanto carrega o OpenAPI JSON
- **Tratamento de erro** caso a API não responda

### Melhorias Técnicas

#### Backend
- **Diretório `app/static/`** criado para servir arquivos estáticos (CSS, JS, imagens)
- **`StaticFiles` montado** via `app.mount("/static", ...)` após include_router
- **Rota `/api-docs`** com `include_in_schema=False` (não aparece no Swagger)
- **Logo** copiada do frontend para `app/static/logo.png`
- **Zero mudanças no Docker** necessárias (volume mount já cobre `app/static/`)

#### Documentação da API - 3 Formas de Acesso
- `/docs` -- Swagger UI (interativo com "Try it out")
- `/redoc` -- ReDoc (referência limpa e navegável)
- `/api-docs` -- Página customizada (vitrine profissional) **[NOVO]**

### Arquivos Criados
- `backend/app/static/api-docs.html` -- Página HTML completa (~600 linhas)
- `backend/app/static/logo.png` -- Logo copiada do frontend

### Arquivos Modificados
- `backend/app/main.py` -- Imports (os, FileResponse, StaticFiles), mount de estáticos e rota /api-docs

---

## [1.1.1] - 2026-02-05

### ✨ Novas Funcionalidades

#### Filtro de Status no Board
- **Novo filtro de status** no painel de filtros do Kanban
- Opções disponíveis:
  - **Apenas Abertos** (padrão) - Mostra apenas cards em aberto (não ganhos nem perdidos)
  - **Todos** - Exibe todos os cards incluindo ganhos e perdidos
  - **Apenas Ganhos** - Filtra somente negócios ganhos
  - **Apenas Perdidos** - Filtra somente negócios perdidos
- **Melhoria de performance**: Por padrão, carrega apenas cards abertos, evitando carregar milhares de cards ganhos/perdidos desnecessariamente
- Integrado ao sistema de filtros existente (lista, vendedor, valor, data)

### 📊 Importação de Dados

#### Importação de Deals do Pipedrive
- **4.202 deals importados** do funil "Novas Vendas" do Pipedrive
- **Distribuição inteligente** por status:
  - 1.410 negócios ganhos → Lista 32 (Negócio Ganho)
  - 2.536 negócios perdidos → Lista 33 (Negócio Perdido)
  - 123 leads novos → Lista 22 (Lead Novo - Board Prospecção)
  - 133 em diagnóstico → Lista 30 (Diagnóstico e Proposta - Board Aquisição)
- **3.578 pessoas criadas** automaticamente durante importação
- Preservação de dados: valores, datas, motivos de perda, canais de aquisição
- Mapeamento de proprietários para usuários do sistema
- Sistema de verificação de duplicados por título e data de criação
- Pipedrive Deal ID armazenado em `contact_info` para referência

#### Scripts de Importação
- `clean_deals_csv.py` - Limpeza e filtragem do CSV exportado do Pipedrive
- `import_deals_to_cards.py` - Importação de deals para o sistema como cards
- Commits parciais a cada 100 deals para segurança
- Estatísticas detalhadas ao final do processo

### 🐛 Correções

#### Tipos TypeScript
- Corrigido tipo `Card.is_won` de `boolean` para refletir corretamente o comportamento da API
- Adicionado `Card.is_lost` que estava faltando no tipo
- Sincronização entre schema Pydantic do backend e interfaces TypeScript do frontend

#### Filtros do Board
- Ajustada lógica de filtro para trabalhar corretamente com booleans retornados pela API
- Correção na detecção de cards abertos: `!is_won && !is_lost`

### 🔧 Melhorias Técnicas

#### Backend
- Validador do schema `CardResponse` converte corretamente Integer (0/1/-1) para Boolean
- `is_won: 0` → `is_won: false, is_lost: false` (aberto)
- `is_won: 1` → `is_won: true, is_lost: false` (ganho)
- `is_won: -1` → `is_won: false, is_lost: true` (perdido)

#### Frontend
- Estado `statusFilter` com valor padrão "open" para melhor experiência
- Filtro integrado à função `filterCards()` existente
- UI responsiva com SelectMenu component

### 📝 Documentação

- Atualizado `HISTORICO-DESENVOLVIMENTO.md` com seção completa sobre Blueprint da Consultora
- Removido `BLUEPRINT-AJUSTES.md` (conteúdo incorporado ao histórico)
- Arquivo `deals_novas_vendas_clean.csv` gerado com 4.204 deals limpos e filtrados

---

## [1.1.0] - 2026-02-04

### ✨ Novas Funcionalidades

#### Sistema de Logs de Auditoria
- **Backend**: Sistema completo de auditoria para rastreamento de todas as ações no sistema
- **33 tipos de logs** distribuídos em 9 módulos:
  - **Autenticação** (3): LOGIN, LOGOUT, FAILED_LOGIN
  - **Usuários** (6): CREATE, UPDATE, DELETE, PASSWORD_CHANGE, ACTIVATE, DEACTIVATE
  - **Cards/Leads** (5): CREATE, UPDATE, DELETE, STATUS_CHANGE, TRANSFER
  - **Boards** (3): CREATE, UPDATE, DELETE
  - **Tarefas** (4): CREATE, UPDATE, COMPLETE, DELETE
  - **Comentários** (4): CREATE, UPDATE, DELETE (cards e tarefas)
  - **Badges** (4): CREATE, UPDATE, DELETE, AWARD
  - **Pontos de Gamificação** (3): CREATE, UPDATE, TOGGLE
  - **API4COM/VOIP** (5): CONFIG_CREATE, CONFIG_UPDATE, CONFIG_TEST, EXTENSION_CREATE, EXTENSION_DELETE
- **Endpoint de consulta** (`/api/v1/audit-logs`):
  - Paginação completa
  - Filtros por: usuário, ação, tipo de entidade, período (data inicial/final)
  - Endpoints auxiliares para popular filtros (actions, entity-types)
- **Registro automático** de: usuário, IP, user-agent, timestamp, descrição da ação
- **Permissões**: Apenas Admin pode visualizar logs completos

#### Interface de Logs de Auditoria
- **Nova aba "Logs de Auditoria"** na página de Configurações
- Visível apenas para Admin e Manager
- **Funcionalidades**:
  - Visualização dos últimos 100 logs com paginação local (20 por página)
  - Filtros por ação, tipo de entidade e período
  - Tabela com informações detalhadas: data/hora, usuário, ação, entidade, descrição, IP
  - Design responsivo e consistente com o sistema

#### Histórico de Logins Melhorado
- Endpoint `/api/v1/auth/login-history` agora mostra **todos os logins** do sistema para Admin/Manager
- Corrigido para não filtrar apenas logins do usuário atual
- Aba "Segurança" agora exibe logins de todos os usuários

### 🐛 Correções

#### Sidebar
- Corrigido scroll horizontal ao minimizar sidebar
- Adicionado `overflow-hidden` nos containers
- Ajustado padding dinâmico baseado no estado (expandida/minimizada)
- Logo redimensiona automaticamente quando minimizada

#### Autenticação e Cache
- **Corrigido problema crítico de cache** entre usuários diferentes
- Ao fazer logout e login com outro usuário, o sistema agora:
  - Força reload completo da página
  - Limpa todo o estado do React
  - Reseta todos os componentes
  - Previne que usuário veja permissões/dados de outro usuário
- Implementado `window.location.href` ao invés de navegação SPA no login/logout

#### Timezone de Logins
- Adicionado sufixo 'Z' em timestamps UTC para interpretação correta no frontend
- Corrigido display de "Agora" permanente no histórico de logins

### 🔧 Melhorias Técnicas

#### Backend
- Model `AuditLog` com campos: user_id, action, entity_type, entity_id, description, ip_address, user_agent, created_at
- Captura automática de IP e User-Agent em todos os endpoints auditados
- Join otimizado com tabela User para exibir nome/email nos logs
- Ordenação por data (mais recentes primeiro)

#### Frontend
- Novo service `auditLogService` com métodos para buscar logs e opções de filtro
- Estados gerenciados para paginação local
- Componentes reutilizáveis mantendo padrão visual do sistema

### 📝 Documentação

- Atualizado CHANGELOG com todas as funcionalidades implementadas
- Código bem comentado em português (conforme padrão do projeto)
- Docstrings completas em todos os endpoints

---

## [1.0.0] - 2026-01-29

### 🚀 PRIMEIRA VERSÃO EM PRODUÇÃO

Esta é a primeira versão oficial do HSGrowth CRM em ambiente de produção!

### ✨ Funcionalidades Principais

#### Módulo de Boards (Kanban)
- Criação e gerenciamento de boards personalizados
- Sistema de listas (colunas) com reordenação via drag-and-drop
- Cards com informações completas de contato e negócio
- Movimentação de cards entre listas
- Filtros por responsável, status (ganho/perdido)
- Visualização otimizada com lazy loading

#### Módulo de Cards (Negócios)
- Informações de contato estruturadas (nome, email, telefone, LinkedIn)
- Informações de pagamento e condições comerciais
- Vinculação com clientes/organizações
- Sistema de responsáveis (assigned_to)
- Campos customizados via JSON
- Histórico de atividades
- Sistema de notas
- Gerenciamento de produtos vinculados
- Controle de valor e data de vencimento

#### Módulo de Clientes
- Cadastro completo de organizações
- Informações fiscais (CNPJ, inscrição estadual)
- Múltiplos contatos de comunicação
- Endereço completo
- Vinculação com negócios

#### Módulo de Produtos
- Catálogo de produtos/serviços
- Controle de preço e SKU
- Vinculação com cards/negócios

#### Sistema de Usuários
- Autenticação JWT
- Controle de permissões por perfil (admin, vendedor, visualizador)
- Gestão de equipes
- Dashboard personalizado por usuário

#### Importação de Dados
- Importação completa do Pipedrive via CSV
- Suporte para:
  - 2.366 organizações
  - 4.043 pessoas
  - 4.512 deals (negócios)
  - 1.583 leads
  - 11.915 notas
  - 10.601 atividades
  - 61 produtos

### 🔧 Melhorias Técnicas

#### Performance
- Eager loading para eliminar problema N+1 em queries
- Paginação otimizada em todas as listagens
- Modo "minimal" para listagens de cards (payload 60% menor)
- Índices otimizados no banco de dados
- Cache de sessões

#### Banco de Dados
- PostgreSQL 15 com todas as tabelas principais
- Sistema de migrations com Alembic
- Constraints e validações a nível de banco
- Backup automatizado

#### Infraestrutura
- Deploy via Docker/Easypanel
- PostgreSQL como banco principal
- Redis para cache (opcional)
- Nginx como reverse proxy
- SSL/HTTPS configurado

#### API
- FastAPI com documentação automática (Swagger)
- Validação de dados com Pydantic
- Tratamento de erros padronizado
- CORS configurado
- Rate limiting

#### Frontend
- React 18 com TypeScript
- Tailwind CSS para estilização
- React Router para navegação
- Axios para chamadas HTTP
- Context API para gerenciamento de estado
- React Beautiful DnD para drag-and-drop

### 🐛 Correções

- Corrigido validador de telefone para aceitar múltiplos números separados por vírgula
- Corrigido timeout ao carregar boards com muitos cards (3.789+)
- Corrigido problema de migrations do Alembic
- Corrigido encoding no script de inicialização (start.sh)
- Corrigido problema de duplicação de registros na importação

### 📝 Documentação

- Documentação técnica completa na pasta `Documentação/`
- README com instruções de instalação
- Guia de desenvolvimento local
- Especificação de API
- Dicionário de dados

### ⚠️ Breaking Changes

Nenhum (primeira versão).

### 🔒 Segurança

- Autenticação JWT com tokens seguros
- Senhas com hash bcrypt
- Validação de inputs em todos os endpoints
- Proteção contra SQL Injection
- CORS configurado corretamente

---

## 📌 Notas Importantes

### A partir desta versão (v1.0.0):

1. **Ambiente de Produção Ativo**: Todas as mudanças devem ser testadas localmente antes do deploy
2. **Migrations**: Sempre criar migrations do Alembic para mudanças no banco
3. **Backward Compatibility**: Evitar breaking changes sempre que possível
4. **Versionamento**: Seguir Semantic Versioning (MAJOR.MINOR.PATCH)
5. **Changelog**: Documentar todas as mudanças neste arquivo

### Próximos Passos (v1.1.0)

- [ ] Módulo de relatórios e dashboards
- [ ] Automações de funil
- [ ] Integração com WhatsApp
- [ ] Envio de emails diretamente do CRM
- [ ] Sistema de gamificação completo
- [ ] Módulo de leads com funil próprio
- [ ] Sincronização bidirecional com Pipedrive

---

## Formato de Versionamento

- **MAJOR** (X.0.0): Mudanças incompatíveis com versões anteriores
- **MINOR** (0.X.0): Novas funcionalidades compatíveis com versões anteriores
- **PATCH** (0.0.X): Correções de bugs compatíveis com versões anteriores

## Tags Git

Cada versão deve ter uma tag correspondente no Git:
```bash
git tag -a v1.0.0 -m "Versão 1.0.0 - Primeira versão em produção"
git push origin v1.0.0
```
