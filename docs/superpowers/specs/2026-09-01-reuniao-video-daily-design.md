# Reunião por vídeo dentro do CRM (Daily.co) — Design

**Data:** 2026-09-01
**Status:** Especificação aprovada para planejamento
**Origem:** Replicar o módulo de reunião do projeto `dn.nexus` (Daily.co + widget público + log/análise) adaptado à nossa stack (FastAPI + PostgreSQL + React).

---

## 1. Contexto e objetivo

Hoje o CRM cria reuniões via **Microsoft Teams** (endpoint `POST /card-tasks/{id}/teams-meeting`, transcrição via Graph + análise GPT). Queremos, além disso, ter **reunião por vídeo rodando dentro do próprio sistema**, usando **Daily.co** — igual ao `dn.nexus` — com **link público** para o cliente entrar sem instalar nada.

O trabalho é **faseado**. A Fase 1 entrega a call funcionando ponta a ponta; as fases seguintes agregam agendamento público, gravação/transcrição e IA.

### Decisões já tomadas
- **Provedor de vídeo:** Daily.co (mesma arquitetura do dn.nexus → copiamos o desenho, não o código, pois lá é Supabase). Volume esperado ≤ ~100 reuniões/mês → **dentro do tier grátis** (10.000 min-participante/mês).
- **Modelo de dados:** **estender o `CardTask`** (não criar modelo novo). Daily vira uma opção ao lado do Teams, reaproveitando `MeetingSection`, `cardTaskService` e o fluxo de calendário.
- **Armazenamento de gravação:** **Cloudflare R2** (compatível com S3, sem custo de egress; Daily grava direto no bucket). Transcrição (texto/VTT + análise) fica no **PostgreSQL** (já temos `transcript_raw` e `transcript_analysis`).
- **Automação (mover card ao entrar):** baixa prioridade — anotada como Fase 4.
- **IA ao vivo:** Fase 5 (futuro). A captura de transcrição da Fase 3 já será feita de forma compatível.

### Custos de referência (Daily.co, 2026)
- Vídeo: US$ 0,004 / min-participante (10.000 min/mês grátis)
- Gravação em nuvem: US$ 0,01349 / min gravado
- Transcrição em tempo real: US$ 0,0059 / min
- Reunião típica (40 min, 2 pessoas, gravada+transcrita) ≈ **US$ 1,10**. No volume atual, custo inicial ≈ **zero**.

---

## 2. Arquitetura geral

Tradução da arquitetura do dn.nexus (Supabase) para a nossa (FastAPI):

| dn.nexus (Supabase) | Nosso CRM (FastAPI) |
|---|---|
| Tabela `crm_appointments` | Campos novos no `CardTask` |
| Tabela `daily_meeting_participants` | Nova tabela `card_task_participants` |
| Edge Function `daily-room` | `app/services/daily_service.py` + endpoints em `card_tasks.py` |
| Edge Function `daily-webhook` | `POST /api/v1/daily/webhook` (novo endpoint público) |
| Edge Function `meeting-gate-info` | `GET /api/v1/public/meeting/{token}` (público, sem JWT) |
| `MeetingGate.tsx` / `MeetingRoom.tsx` | Páginas React novas usando `@daily-co/daily-js` |
| Widget público de agendamento | Fase 2 |

**Princípios herdados do dn.nexus:**
- Fluxo dirigido por **webhooks** do Daily (`participant.joined`, `meeting.ended`, `recording.ready-to-download`).
- **Host guard:** convidado só dispara efeitos (automação) se o host já entrou.
- **Idempotência:** cada efeito (entrou/gravação) roda uma vez só por reunião.
- **Fallback:** como webhook não é garantido, a entrada do convidado também marca presença via chamada direta ao validar o acesso.
- **Segurança:** endpoints públicos **nunca** retornam a API key do Daily nem tokens de host; token de convidado é gerado só após validação do link.

---

## 3. Fase 1 — Reunião por vídeo + link público (MVP)

### 3.1 Objetivo
Vendedor cria uma "Reunião por vídeo (Daily)" a partir do card, entra pela sala embutida no CRM, e gera um **link público** para o cliente entrar (nome + e-mail, sem login). **Sem gravação nesta fase.**

### 3.2 Banco de dados — novos campos no `CardTask`
Migration Alembic adicionando (todos nullable, para não quebrar tasks existentes):

| Campo | Tipo | Descrição |
|---|---|---|
| `daily_room_name` | String(255) | Nome único da sala (`hsg-{card_task_id}`) |
| `daily_room_url` | String(1000) | URL da sala no Daily |
| `meeting_provider` | String(20) | `"teams"` \| `"daily"` \| null (distingue do fluxo Teams) |
| `public_access_token` | String(64), unique, index | Token opaco do link público do convidado |
| `meeting_started_at` | DateTime | Quando o host entrou (null até entrar) |
| `contact_joined_at` | DateTime | Quando o convidado entrou (null até entrar) |
| `meeting_ended_at` | DateTime | Quando a sala encerrou |

> Reaproveitamos `video_link`, `contact_name`, `duration_minutes`, `due_date` que já existem.

### 3.3 Backend — serviço `daily_service.py`
Encapsula toda a conversa com a API do Daily (`https://api.daily.co/v1`). API key em `settings.DAILY_API_KEY` (novo campo no `.env`).

- `create_room(card_task) -> {name, url}` — `POST /rooms` com `privacy=private`, `enable_knocking`, `enable_chat`, `enable_screenshare`, `lang=pt`, `exp = now + 24h`. Persiste `daily_room_name`/`daily_room_url` no CardTask.
- `create_host_token(card_task, user) -> str` — renova `exp` da sala (`PATCH /rooms/{name}`) e gera `POST /meeting-tokens` com `is_owner=true`, `user_name`.
- `create_guest_token(card_task, guest_name) -> str` — igual, com `is_owner=false`.
- `delete_room(card_task)` — `DELETE /rooms/{name}` (usado ao cancelar).

### 3.4 Backend — endpoints (em `card_tasks.py`, espelhando o padrão Teams)
- `POST /api/v1/card-tasks/{id}/daily-room` — cria a sala Daily para a task, gera `public_access_token`, retorna `{room_url, public_link}`. Requer auth.
- `POST /api/v1/card-tasks/{id}/daily-host-token` — retorna token de host para o vendedor logado entrar. Requer auth.
- `DELETE /api/v1/card-tasks/{id}/daily-room` — cancela/apaga a sala. Requer auth.

**Endpoints públicos (sem JWT), em novo `public_meeting.py`:**
- `GET /api/v1/public/meeting/{public_access_token}` — retorna info segura da reunião (título, horário, nome da empresa, status: já começou? já terminou?). **Nunca** retorna token nem API key.
- `POST /api/v1/public/meeting/{public_access_token}/join` — recebe `{name, email}`, valida o token, marca `contact_joined_at` (se host já entrou), registra participante, e retorna `guest_token` + `room_url`.

### 3.5 Frontend
- **`MeetingSection.tsx`** (existente): adicionar botão **"Reunião por vídeo (Daily)"** ao lado do "Teams". Ao criar, mostra o **link público** para copiar/enviar e um botão **"Entrar na reunião"**.
- **`MeetingRoom.tsx`** (nova página, rota autenticada `/reuniao/:cardTaskId`): pega o host token e embute a sala via `@daily-co/daily-js` (Daily Prebuilt / iframe).
- **`MeetingGate.tsx`** (nova página, rota **pública** `/entrar/:publicToken`): busca info via endpoint público, mostra form (nome + e-mail), ao entrar chama `/join` e embute a sala com o guest token.

### 3.6 Fluxo Fase 1 (ponta a ponta)
1. Vendedor abre o card → aba Reuniões → "Reunião por vídeo (Daily)" → backend cria sala + token público.
2. Vendedor copia o **link público** e envia ao cliente (e-mail/WhatsApp — manual nesta fase).
3. Vendedor clica "Entrar" → `MeetingRoom` → host token → dentro da sala. `meeting_started_at` marcado.
4. Cliente abre o link → `MeetingGate` → nome+e-mail → `join` → guest token → dentro da sala. `contact_joined_at` marcado.
5. Reunião acontece. (Encerramento/gravação: Fase 3.)

### 3.7 Fora de escopo da Fase 1
Gravação, transcrição, log detalhado de participantes, webhooks, agendamento público, automação.

---

## 4. Fase 2 — Widget público de auto-agendamento

Link público onde o lead escolhe dia/hora sozinho.

- **Motor de disponibilidade:** cruza horário de trabalho do vendedor + reuniões já marcadas (`card_tasks` com `due_date`) + opcionalmente free/busy do Outlook (Graph, já integrado) + feriados.
- **Config de disponibilidade:** nova tabela `user_availability` (horário de trabalho, dias, timezone, duração padrão) — inspirada em `crm_agent_calendars`.
- **Página pública** de agendamento (React) + endpoints públicos: `GET /public/schedule/{widget_token}?month=...` (slots) e `POST /public/schedule/{widget_token}` (agendar).
- **Ao agendar:** cria/atualiza contato (`Person`) + card + `CardTask` de reunião + sala Daily (reusa Fase 1) + envia e-mail de confirmação com o link.

---

## 5. Fase 3 — Log + Gravação + Transcrição

- **Nova tabela `card_task_participants`:** `card_task_id`, `participant_name`, `is_owner`, `joined_at`, `source` (`webhook`/`gate`/`host`). Log de acesso à sala.
- **Webhook `POST /api/v1/daily/webhook`:** trata `participant.joined` (registra participante; se host, marca `meeting_started_at`), `meeting.ended` (marca `meeting_ended_at`), `recording.ready-to-download` (dispara download).
- **Gravação:** ligar `enable_recording=cloud` na criação da sala; configurar o Daily para gravar no bucket **Cloudflare R2**. Guardar a URL/ID no CardTask.
- **Transcrição:** ligar transcrição do Daily; salvar VTT em `transcript_raw` e rodar o **pipeline de análise GPT que já existe** hoje (Teams) → `transcript_analysis`.
- **Confiabilidade:** fallback ao validar entrada do convidado (marca presença mesmo se webhook falhar), como no dn.nexus.

---

## 6. Fase 4 — Automação no pipeline (anotada / baixa prioridade)

Mover o card de etapa automaticamente quando o convidado entra na reunião (com host já presente). Reusaria o motor de automações existente. **Registrado como melhoria futura** — por ora os vendedores movem o card manualmente.

---

## 7. Fase 5 — IA ao vivo (futuro)

Assistente que sugere ao vendedor a resposta ideal durante a call, com base na transcrição em tempo real + contexto acumulado (janela rolante de trechos por interlocutor). Depende da captura de transcrição da Fase 3. Design detalhado em [2026-09-10-reuniao-video-ia-ao-vivo-design.md](2026-09-10-reuniao-video-ia-ao-vivo-design.md) (seção 15.7).

---

## 8. Riscos e observações

- **Expiração de sala:** salas Daily criadas com `exp` de 24h. Se a reunião for agendada com mais de 24h de antecedência, renovar o `exp` na geração de cada token (como no dn.nexus).
- **Webhooks não garantidos:** sempre ter fallback via chamada direta (validar entrada marca presença).
- **Segurança do link público:** `public_access_token` deve ser opaco e aleatório (não sequencial); endpoints públicos não expõem segredos.
- **Config:** adicionar `DAILY_API_KEY` (e, na Fase 3, credenciais do R2) ao `.env` e ao `config.py`, seguindo o padrão de `MS_CLIENT_ID`/`OPENAI_API_KEY`.
- **Convivência com Teams:** `meeting_provider` distingue os dois fluxos no mesmo `CardTask`; a UI mostra os dois botões.

---

## 9. Entregável por fase (resumo)

| Fase | Entrega | Depende de |
|---|---|---|
| 1 | Call por vídeo dentro do CRM + link público | — |
| 2 | Widget público de auto-agendamento | Fase 1 |
| 3 | Log + gravação (R2) + transcrição + análise IA | Fase 1 |
| 4 | Automação: mover card ao entrar | Fase 3 |
| 5 | IA ao vivo sugerindo respostas | Fase 3 |

---

# ANEXO — Aproveitamento do dn.nexus, esforço e custos

**Adicionado em:** 2026-09-02
**Base:** leitura do código em `remix-of-dn.nexus` + preços verificados nas páginas oficiais (Daily.co e Cloudflare R2) em 02/09/2026.

## 10. O que dá para aproveitar do dn.nexus

O código de lá **não é copiável direto** — é outra stack. O valor está em ser uma implementação de referência funcionando: a ordem das chamadas ao Daily, os casos de borda e os prompts já resolvidos.

| Barreira | dn.nexus | Nosso CRM |
|---|---|---|
| Backend | Deno/TypeScript (Supabase Edge Functions) | Python / FastAPI |
| Dados | Supabase | PostgreSQL + SQLAlchemy |
| Chamadas do front | `supabase.functions.invoke()` | axios (`api.post`) |
| UI | shadcn/ui + Radix | componentes próprios do CRM |
| IA | Lovable AI Gateway + **Gemini** | OpenAI **GPT-4o** (já em uso) |

### Inventário medido

| Peça (dn.nexus) | Linhas | Aproveitamento |
|---|---|---|
| `src/pages/MeetingRoom.tsx` | 1.559 | 🟢 Alto — lógica de sala, eventos, transcrição e IA |
| `supabase/functions/analyze-transcript-playbook` | 1.621 | 🟢 **Prompts reaproveitáveis quase integralmente** |
| `supabase/functions/daily-room` | 1.226 | 🟡 Desenho — reescrever em Python |
| `supabase/functions/process-daily-recording` | 668 | 🟡 Desenho |
| `supabase/functions/daily-recording-worker` | 406 | 🟡 Desenho |
| `src/pages/MeetingGate.tsx` | 371 | 🟢 Alto — lobby público |
| `supabase/functions/daily-webhook` | 337 | 🟡 Desenho |
| `supabase/functions/meeting-insights` | 296 | 🟢 Lógica + prompts da IA ao vivo |
| `src/pages/MeetingSettings.tsx` | 284 | 🟡 Parcial |
| `supabase/functions/meeting-gate-info` | 95 | 🟡 Desenho |

### Front — o melhor aproveitamento (~60-70%)

O `MeetingRoom` usa **Daily Prebuilt** (`DailyIframe.wrap`): a tela da videochamada vem pronta do Daily — ninguém constrói vídeo, áudio ou compartilhamento de tela. As 1.559 linhas são **orquestração**: lobby, tokens, ciclo de vida da sala, painel de transcrição ao vivo, retry com 3 tentativas, tratamento de sessão quebrada.

Essa lógica vem quase toda. O que muda: componentes de UI (shadcn → nossos) e a camada de chamada (`supabase.functions.invoke` → `api.post`).

### Backend — reescrita, mas com o caminho mapeado

Nenhuma linha aproveitável diretamente (Deno → Python). O ganho é não ter que **descobrir** o desenho: sequência de chamadas ao Daily, tratamento de webhook, idempotência por reunião, host guard, fallback quando o webhook não chega.

### Transcrição — a melhor notícia

**O pipeline já existe e funciona** no CRM, usado hoje pelo Teams:

- `backend/app/services/transcript_analysis_service.py` (143 linhas) — parse de VTT + análise GPT-4o
- `CardTask.transcript_raw` e `CardTask.transcript_analysis` já existem
- Endpoint `POST /card-tasks/{id}/fetch-transcript` já implementado

O Daily também entrega **VTT**. Logo, a Fase 3 é **plugar uma fonte nova num pipeline existente**, não construir uma feature nova.

### Descoberta não registrada no documento original

O dn.nexus **já tem a IA ao vivo funcionando** (`meeting-insights`): durante a call, envia os últimos 40 turnos da transcrição e recebe sugestão de resposta para o vendedor, com seleção de "agente" e disparo automático ou manual. Ou seja, a **Fase 5 — hoje marcada como "futuro, design a definir" — tem implementação de referência pronta.**

## 11. Estimativa de esforço

Uma pessoa focada, com o dn.nexus aberto como referência.

| Fase | Esforço | Comentário |
|---|---|---|
| **1 — Call + link público** | **6-7 dias** | `daily_service.py` + 5 endpoints + 2 páginas React |
| **3 — Gravação + transcrição + IA** | **4-5 dias** | Barato: o pipeline de análise já existe |
| **2 — Widget de agendamento** | **6-8 dias** | O mais caro; motor de disponibilidade é do zero e o dn.nexus ajuda pouco |
| **5 — IA ao vivo** | **3-4 dias** | Referência pronta; trocar gateway Gemini para OpenAI |
| **4 — Automação mover card** | **1 dia** | Reusa o motor de automações existente |

> **Fase 1 + 3 ≈ 11 dias** entrega reunião dentro do CRM, gravada, transcrita e analisada — a fatia com quase todo o valor.

**Não incluído nas estimativas:** criação/configuração das contas Daily e R2 (chaves, bucket, webhook), e homologação com usuários reais.

## 12. Custos — números verificados em 02/09/2026

### Daily.co (preços oficiais)

| Item | Preço |
|---|---|
| Minutos de participante | **US$ 0,004** /participante-minuto — **10.000 min/mês grátis** |
| Gravação em nuvem (vídeo) | **US$ 0,01349** /minuto gravado |
| Gravação somente áudio | **US$ 0,005** /minuto gravado |
| Armazenamento no Daily | **US$ 0,003** /minuto |
| Transcrição **em tempo real** | **US$ 0,0059** /minuto de participante não-mutado |
| Transcrição **pós-call** | **US$ 0,0043** /minuto gravado |

Gravação é cobrada por *wall-clock*, não multiplicada por participante. Transcrição em tempo real **é** por participante.

### Cenário real: 100 reuniões/mês, 40 min, 2 participantes

| Cenário | Conta | Custo/mês |
|---|---|---|
| **Fase 1** (só vídeo) | 8.000 min < 10.000 grátis | **US$ 0** |
| **Fase 3** (+ gravação + transcrição pós-call) | 4.000 min x (0,01349 + 0,0043) | **≈ US$ 71** |
| **Fase 5** (+ transcrição em tempo real) | troca pós-call por 8.000 min x 0,0059 | **≈ US$ 101** |

> ⚠️ **Correção ao item "Custos de referência" da seção 1:** a afirmação *"no volume atual, custo inicial ≈ zero"* vale **apenas para a Fase 1**. Com gravação e transcrição ligadas (Fase 3), o custo fica em torno de **US$ 70-100/mês** — o cálculo de ~US$ 1,10 por reunião do documento original está correto e, multiplicado por 100 reuniões, é exatamente isso.

**Economia possível:** usar **transcrição pós-call** (US$ 0,0043/min gravado) em vez de tempo real (US$ 0,0059/min por participante) reduz ~US$ 30/mês. Só vale tempo real quando a Fase 5 (IA ao vivo) entrar, pois ela depende da transcrição durante a call.

**Atenção ao limite grátis:** os 10.000 min/mês são consumidos por *participante*. Com 3 pessoas por reunião, 100 reuniões de 40 min = 12.000 min, passando do limite (excedente barato: ~US$ 8/mês). O teto é atingido por volume **ou** por número de participantes.

### Cloudflare R2 (preços oficiais)

| Item | Preço |
|---|---|
| Armazenamento | **US$ 0,015** /GB-mês (grátis até **10 GB**) |
| Operações de escrita (Classe A) | US$ 4,50 /milhão (1 milhão grátis) |
| Operações de leitura (Classe B) | US$ 0,36 /milhão (10 milhões grátis) |
| **Egress (download)** | **grátis** — é a razão de escolher R2 |

Estimando ~500 MB por reunião gravada: 100 reuniões ≈ **50 GB/mês**, ou ~US$ 0,75/mês. Como **acumula**, em 12 meses seriam ~600 GB ≈ US$ 9/mês. **Definir política de retenção** (ex.: apagar gravação após 6 ou 12 meses) evita crescimento indefinido.

### Custo total estimado

| Fase | Daily | R2 | OpenAI (análise) | **Total/mês** |
|---|---|---|---|---|
| Fase 1 | US$ 0 | — | — | **US$ 0** |
| Fase 3 | ~US$ 71 | ~US$ 1 (cresce) | ~US$ 5 | **≈ US$ 77** |
| Fase 5 | ~US$ 101 | ~US$ 1 (cresce) | ~US$ 10 | **≈ US$ 112** |

## 13. Além do Daily — o que mais precisa de atenção

**1. LGPD e consentimento de gravação (o mais importante).** Gravar e transcrever conversas com clientes exige base legal e aviso claro. Necessário: informar antes de começar a gravar, registrar o consentimento, definir prazo de retenção e ter como atender pedido de exclusão. É decisão de negócio/jurídico, não técnica — mas precisa estar resolvido **antes** da Fase 3 ir para produção.

**2. Cloudflare R2** — conta, bucket e chaves. Necessário só na Fase 3.

**3. OpenAI** — já em uso no CRM; a Fase 3 apenas aumenta o volume de chamadas.

**4. Endpoint de webhook público** — o Daily precisa alcançar `POST /api/v1/daily/webhook` pela internet. Já temos domínio público, então é configuração. Validar a assinatura do webhook.

**5. Links públicos de convidado** — rota sem autenticação. Token opaco e aleatório, com expiração, e nada de segredo no retorno (já previsto na seção 8).

**6. Retenção e volume de armazenamento** — definir por quanto tempo guardar gravação e transcrição.

**7. Não é preocupação:** banda, servidor de mídia, escala de vídeo — tudo isso fica com o Daily.

---

## 14. Decisões de UX e integração com a agenda *(03/09/2026)*

Levantamento do fluxo real do SDR ao agendar reunião, e as decisões que saíram dele.

### 14.1 O fluxo do SDR hoje (já existente, não muda)

1. SDR está com o card em **Conectado** e vincula o **vendedor**.
2. Vai na aba **Calendário** → sub-aba **Outlook** e confere a disponibilidade do vendedor.
3. Vai na aba **Reuniões** → cria a reunião → o sistema gera o link e dispara o convite.

O passo 2 **já está implementado** e é o que sustenta o fluxo:

| O que faz | Onde |
|---|---|
| Compromissos do próprio usuário | `GET /auth/me/calendar-events` |
| **Ocupação do vendedor do card** (free/busy via Microsoft `getSchedule`) | `GET /auth/me/seller-schedule?email=...` |
| Consumido em | `frontend/src/components/cardDetails/SchedulerSection.tsx` (~L231-248) |

O passo 3 hoje chama `cardTaskService.createTeamsMeeting()` automaticamente, sem opção de escolha ([MeetingSection.tsx](../../frontend/src/components/cardDetails/MeetingSection.tsx) ~L154), que por sua vez usa `microsoft_graph_service.create_calendar_event()` — essa função **já monta os convidados** (vendedor do card + e-mails do contato) e o **próprio Outlook envia o convite**. O CRM não dispara e-mail.

### 14.2 Decisão — escolha do tipo de reunião: **seletor dentro do modal**

Um único botão **"Nova reunião"**. Dentro do formulário, o usuário escolhe **onde a reunião acontece**:

```
┌──────────────────────────────────┐
│  Nova reunião                  X │
├──────────────────────────────────┤
│  Onde vai acontecer?             │
│  ┌────────────┐ ┌──────────────┐ │
│  │ ◉ No CRM   │ │ ○ Teams      │ │
│  │   (vídeo)  │ │   (Outlook)  │ │
│  └────────────┘ └──────────────┘ │
│                                  │
│  Título   [___________________]  │
│  Data     [__/__/____]  [__:__]  │
│  Duração  [ 30 min  v]           │
│  Contato  [___________________]  │
│           [Cancelar]  [Criar]    │
└──────────────────────────────────┘
```

**Motivo:** o restante do formulário é idêntico nos dois casos — só o provedor muda. Um lugar só evita duplicar tela e mantém a manutenção barata.

**Implementação:** a escolha grava `meeting_provider` (`"daily"` | `"teams"`) no `CardTask` e decide qual serviço é chamado após criar a task. O caminho `"teams"` continua exatamente como está hoje.

### 14.3 Decisão — o convite continua saindo pelo Outlook nos dois casos

Mesmo na reunião **dentro do CRM**, o backend cria o evento no calendário do vendedor via Graph, com o **link do Daily** no corpo.

**Consequências (todas desejadas):**

- O cliente recebe o convite por e-mail **exatamente como hoje** — é o convite nativo do Outlook, com os mesmos convidados.
- O horário **bloqueia o free/busy** do vendedor, então o `seller-schedule` que o SDR já consulta passa a refletir as reuniões do CRM. **Sem isso, o SDR agendaria em cima de reunião interna.**
- O vendedor vê a reunião no Outlook e no celular, com lembrete.
- **O fluxo do SDR e do vendedor não muda em nada** — mesma tela, mesmos cliques. Zero treinamento.

**Custo de implementação: ~zero.** Reusa `create_calendar_event()`, que já resolve convidados e envio. Deixa de ser item separado e passa a ser parte natural da Fase 1.

> **Impacto no plano:** este item **substitui** a necessidade de construir uma visão de agenda nova para o SDR na Fase 1. A visão nativa no CRM (somar `card_tasks` de reunião do vendedor, e liberar o SDR a consultar a agenda de outro usuário — hoje a página Calendário trava vendedor/SDR no próprio id) fica como **melhoria opcional**, não bloqueante.

### 14.4 Alinhamento com a Fase 2

O "motor de disponibilidade" da Fase 2 precisa cruzar **reuniões do CRM + agenda do Outlook**. Com a decisão 15.3, as reuniões do CRM já estarão no Outlook — então o motor pode se apoiar no `getSchedule` que já existe, em vez de reconciliar duas fontes. **Barateia a Fase 2.**

### 14.5 Um link por convite

O convite leva **apenas o link do tipo escolhido** — Daily ou Teams, nunca os dois. Mandar dois links faria o cliente parar para decidir em qual clicar, criando justamente o atrito que a proposta quer eliminar.

**Plano B se uma chamada falhar:** o vendedor cria uma reunião Teams na hora e envia o link pelo chat/WhatsApp. O Teams segue disponível como alternativa, sem precisar de nada especial no convite.

---

---

## 15. Escopo e decisões aprovadas *(04/09/2026)*

Levantamento fechado com o gestor. **Estas decisões valem sobre qualquer coisa dita antes neste documento.**

### 15.1 Escopo aprovado

| Fase | Situação |
|---|---|
| **1 — Reunião por vídeo + link público** | ✅ Aprovada |
| **3 — Gravação + transcrição + análise IA** | ✅ Aprovada |
| **5 — IA ao vivo** | ✅ Aprovada |
| **2 — Auto-agendamento público** | ❌ **Fora.** O SDR confere a agenda do vendedor e o vendedor cria a reunião, como já é hoje |
| **4 — Mover card automaticamente** | ⏸️ Parada. O time continua movendo à mão |

**Custo:** aprovado pelo gestor sem teto rígido.

**Consequência técnica:** como a Fase 5 está aprovada, a transcrição é **em tempo real** desde a Fase 3 (não pós-call). Evita refazer depois; encarece a operação.

### 15.2 Criação da reunião

- Um botão **"Nova reunião"**; dentro do formulário, seletor **"No CRM"** | **"Teams/Outlook"** (grava `meeting_provider`).
- **Qualquer cargo** pode criar.
- Convite sai **pelo Outlook nos dois casos**, com **um único link** (o do tipo escolhido).
- **Sem Microsoft conectado: bloqueia** e pede para conectar a conta. Não cria a reunião.
- **Daily indisponível:** avisa e sugere criar pelo Teams.
- **Reuniões Teams existentes: intactas.** Nenhuma mudança no fluxo atual.

### 15.3 Sala e experiência do cliente

- Tela de entrada pedindo **nome, empresa e e-mail**.
- **Sala de espera** — o vendedor libera um a um ou todos de uma vez (`enable_knocking`).
- **Aviso visível de gravação** quando estiver gravando.
- Visual com **cores do CRM e logo** da Health & Safety.

### 15.4 Gravação

- **Vídeo (com áudio)**, iniciada **manualmente** pelo botão. Não começa sozinha.
- Quem decide gravar: **vendedor ou SDR** na sala. Intenção é gravar todas.
- **Proteção contra gravação esquecida** (3 camadas):
  1. webhook `meeting.ended` → backend chama `POST /rooms/{name}/recordings/stop`;
  2. sala criada com expiração (`eject_at_room_exp`);
  3. teto do próprio Daily (~3h por gravação).
  > Validar em teste real: a doc do Daily indica que, se quem iniciou a gravação sair sem parar, **a gravação pode ser perdida**. A camada 1 existe para cobrir isso.
- **Retenção: 12 meses**, com rotina de descarte automático.
- **Falha na gravação:** notifica o **dono da reunião e os admins**.

### 15.5 Acesso à gravação

Três caminhos distintos:

| Caminho | Para quem | Regras |
|---|---|---|
| **Assistir no CRM** | quem tem permissão | player na aba Reuniões do card, sem prazo |
| **Baixar arquivo** | quem tem permissão | download direto |
| **Link compartilhável** | terceiros (cliente) | **expira em 30 dias**; qualquer um que enxerga a gravação pode gerar; **registra quem gerou e quando** |

**Permissão de leitura = RN-037:** vendedor **ou** SDR do card enxergam; gerente e admin veem tudo; vendedor vê só as suas. O SDR vê reunião que agendou mesmo sem ter participado.

### 15.6 Análise pós-reunião (nível 2)

Mantém os 6 campos atuais (`resumo`, `sentimento`, `interesse_cliente`, `objecoes`, `proximos_passos`, `pontos_de_atencao`) e acrescenta **8**:

| Campo | O que traz |
|---|---|
| `compromissos` | quem ficou de fazer o quê, até quando |
| `produtos_citados` | itens do catálogo que apareceram |
| `concorrentes` | empresas citadas e em que contexto |
| `orcamento` | se preço foi discutido, faixa e reação |
| `nota` | 0-10 com justificativa |
| `decisor` | se ficou claro quem decide e se estava presente |
| `temperatura` | proximidade do fechamento, pelo que o cliente disse |
| `oportunidades_perdidas` | o que o vendedor deixou passar |

- **`oportunidades_perdidas` é visível também para o vendedor** (decisão consciente: serve para ele se corrigir sozinho).
- Onde aparece: **aba Reuniões do card**, junto do player e da transcrição — mesmo padrão do Teams hoje.
- **Notificação no sino** quando a gravação e a análise ficarem prontas.
- **Nível 3 (playbook configurável, como o dn.nexus) fica anotado para o futuro.**

**Quando a análise roda** *(decisão de 09/09/2026)*

| Origem da reunião | Transcrição | Análise |
|---|---|---|
| Teams | por clique | por clique — botão "Analisar Reunião" |
| CRM (Daily) | automática | **automática, se houve gravação** |

Gravar é uma decisão consciente do vendedor — é o sinal de que aquela conversa
importa. Reunião interna, teste ou conversa de três minutos não vira análise e
não gera custo.

Chegou-se a cogitar exigir o clique também no CRM, por economia. Medido, o
argumento não se sustenta: a análise custa centavos por reunião, contra
US$ 113 de gravação e US$ 114 de transcrição ao vivo por mês. Exigir o clique
economizaria poucos dólares e custaria uma etapa manual — mantido automático.

### 15.7 IA ao vivo (Fase 5)

- **Apenas sob demanda** — botão "me ajuda aqui". **Não** sugere sozinha (menos ruído e bem mais barata).
- Painel visível para **vendedor e SDR**; **nunca para o cliente**.
- Conteúdo das sugestões: proposta a ser detalhada no plano da Fase 5, tomando como base o `meeting-insights` do dn.nexus (insight curto + fala pronta + tags do que foi detectado), somando contexto do próprio CRM.
- **Design detalhado (10/09/2026):** [2026-09-10-reuniao-video-ia-ao-vivo-design.md](2026-09-10-reuniao-video-ia-ao-vivo-design.md) — formato da resposta, contexto do CRM, painel lateral, histórico no card e custo revisado.

### 15.8 Ambiente e forma de trabalho

- **Não existe homologação — só produção.** O container local aponta para o banco de produção.
- Decisão: **manter assim**, com proteções durante o desenvolvimento:
  - funcionalidade atrás de **trava por usuário** (visível só para o admin que homologa);
  - testes apenas em **card de teste** criado para isso;
  - contato de teste com **e-mail interno**;
  - **envio de convite bloqueado para e-mails externos** enquanto não homologado.
- **Entrega por partes:** Fase 1 → homologação → Fase 3 → Fase 5.
- Homologação pelo admin; divulgação por aviso interno + changelog.
- Sem prazo rígido.

### 15.9 Contas e segredos

| Item | Quem faz |
|---|---|
| Conta Daily.co + API key | criada pelo cliente, com passo a passo |
| Bucket R2 + credenciais | criados junto, com passo a passo |
| Variáveis no EasyPanel (`DAILY_API_KEY`, R2) | aplicadas pelo cliente |

Segredos **nunca** vão para o código nem para o Git.

### 15.10 Custo revisado com as decisões

Reuniões de 1h; SDR participando de ~30% delas; gravação e transcrição ao vivo em todas; IA ao vivo sob demanda (~5 acionamentos por reunião).

| Item | 140 reuniões/mês | 180 reuniões/mês |
|---|---|---|
| Vídeo (acima do free tier) | US$ 37 | US$ 59 |
| Gravação | US$ 113 | US$ 146 |
| Transcrição em tempo real | US$ 114 | US$ 147 |
| IA (análise + ao vivo) | US$ 11 | US$ 14 |
| Armazenamento (R2) | US$ 1 | US$ 2 |
| **Total** | **≈ US$ 277 (R$ 1.441)** | **≈ US$ 368 (R$ 1.913)** |

O armazenamento cresce até ~US$ 19/mês no 12º mês e então estabiliza, por causa da retenção de 12 meses.

> **Revisado em 10/09/2026:** a linha "IA" subestimava o custo da IA ao vivo. O valor correto é ≈ US$ 20 (140 reuniões) e ≈ US$ 26 (180 reuniões), levando o total a ≈ **US$ 286** e ≈ **US$ 380**. Detalhes na seção 10 do [design da Fase 5](2026-09-10-reuniao-video-ia-ao-vivo-design.md).

> Substitui as estimativas das seções 12 e anteriores, que assumiam transcrição pós-call e não consideravam o SDR como terceiro participante.

---

## 15.11 Anotado para a Fase 3 — nome do arquivo da gravação

A sala no Daily se chama `hsg-{card_task_id}` (ex.: `hsg-36197`), sem o título.
No painel do Daily e no bucket do Cloudflare não dá para localizar uma reunião
pelo assunto.

**Decisão:** não alterar o nome da sala (o Daily não aceita acento nem espaço, e
a previsibilidade do nome é útil). Na Fase 3, **nomear o arquivo da gravação com
o título**, por exemplo:

```
2026-09-08-apresentacao-de-proposta-36197.mp4
```

Assim a gravação é localizável pelo assunto direto no bucket, que é onde a
necessidade realmente aparece.

---

## 16. Fontes dos preços

- Daily.co — Video SDK pricing: https://www.daily.co/pricing/video-sdk/
- Daily.co — documentação de gravação: https://docs.daily.co/docs/guides/features/recording
- Cloudflare R2 — pricing: https://developers.cloudflare.com/r2/pricing/
