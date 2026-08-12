# Agent Growth — Estado Atual e Plano de Melhorias

> Documento de **planejamento** (nenhuma alteração de código). Retrata como o assistente
> "Agent Growth" está montado hoje, quais perguntas pré-prontas existem, e o que podemos
> melhorar — com foco em **role-based** (SDR, Vendedor, Serviço, Admin/Gerente).
>
> **Decisão de produto (definida):** o Agent Growth **NÃO** terá campo de texto livre.
> Continua **100% baseado em perguntas pré-prontas (chips)**. A melhoria é ter **mais e
> melhores perguntas prontas por role**, lendo os dados certos.

---

## 1. Como está montado (arquitetura em 3 camadas)

1. **Chips por contexto × role** — `frontend/src/hooks/useAgentContext.ts`
   Detecta **onde o usuário está** (card / board / clientes / geral) e o **role**, e devolve uma lista **fixa** de "perguntas" (chips) para aquele contexto.
2. **Ações pré-definidas** (`action_id`) — 11 no total (ver §2). O usuário só **clica** num chip; **não há campo de texto livre**.
3. **Backend** — `backend/app/services/ai_service.py` (`handle_agent_action`)
   Cada `action_id` chama um método `_prompt_*` que **puxa dados do CRM**, monta o prompt (system + user) e chama a **OpenAI** (`_call_openai`). Endpoint: `POST /api/v1/ai/agent/chat`.

**Contextos de página** detectados pela URL: `card_detail` (tem cardId), `board` (tem boardId), `clients` (`/clients`), `general` (resto).

**Limite:** `AI_RATE_LIMIT_PER_HOUR = 20` chamadas/hora por usuário (Redis).

**Visibilidade:** o widget não aparece para `viewer` (controle no `MainLayout`).

---

## 2. As 11 perguntas pré-prontas (o que cada uma faz)

| `action_id` | Label (o que o usuário vê) | O que faz / dados que usa |
|---|---|---|
| `summarize_card` | Resumir este negócio | Resume o card atual (dados + notas). **Usa a tabela de Vendas (`cards`)** |
| `suggest_next_steps` | Sugerir próximos passos | Sugere ações para o negócio (card de Vendas) |
| `email_followup` | Gerar e-mail de follow-up | Escreve e-mail de follow-up p/ o card |
| `email_proposal` | Gerar e-mail de proposta | Escreve e-mail de proposta p/ o card |
| `objection_handling` | Como lidar com objeções | Dicas de contorno de objeção p/ o card |
| `analyze_pipeline` | Analisar meu pipeline | Analisa os negócios do vendedor no board (Vendas) |
| `quick_win_today` | Quick win para hoje | Aponta o negócio com maior chance de avançar hoje |
| `cold_call_tips` | Dicas de cold call | Dicas genéricas de ligação fria (sem dado do CRM) |
| `productivity_tips` | Dicas de produtividade | Dicas genéricas de produtividade (sem dado do CRM) |
| `my_day_tasks` | O que tenho para fazer hoje | Lista tarefas de hoje + atrasadas. **Usa `CardTask` (tarefas de Vendas)** |
| `how_was_my_day` | Como foi meu dia hoje | Resumo do que o usuário fez no dia. **Usa dados de Vendas** |

> ⚠️ Note que **todas** as ações "de card" e "do dia" leem dados de **Vendas** (`cards`, `card_tasks`). Não há nenhuma ação que leia **Serviço** (`service_cards`, atividades de serviço).

---

## 3. Quais chips aparecem hoje (matriz role × contexto)

### Vendedor (`salesperson`)
| Contexto | Chips |
|---|---|
| Card | Resumir negócio · Próximos passos · E-mail follow-up · E-mail proposta · Objeções |
| Board | O que fazer hoje · Quick win hoje · Como foi meu dia · Analisar pipeline |
| Clientes | O que fazer hoje · Dicas cold call · Como foi meu dia |
| Geral | O que fazer hoje · Como foi meu dia · Dicas produtividade |

### SDR (`sdr`)
| Contexto | Chips |
|---|---|
| Card | Resumir negócio · Próximos passos · E-mail follow-up · Dicas cold call · Objeções |
| Board | O que fazer hoje · Como foi meu dia · Dicas cold call · Quick win hoje |
| Clientes | O que fazer hoje · Dicas cold call · Como foi meu dia · Dicas produtividade |
| Geral | O que fazer hoje · Como foi meu dia · Dicas cold call · Dicas produtividade |

### Admin, Gerente, **Serviço** (fallback `DEFAULT`)
| Contexto | Chips |
|---|---|
| Card | Resumir negócio · Próximos passos · E-mail follow-up |
| Board | O que fazer hoje · Como foi meu dia |
| Clientes | O que fazer hoje · Como foi meu dia |
| Geral | O que fazer hoje · Como foi meu dia |

> Foi **exatamente esse fallback** (Geral → 2 chips) que apareceu no print da dashboard.

---

## 4. Gaps / limitações (por que "tem poucas perguntas")

1. **Serviço não é tratado.** Cai no `DEFAULT`. E as 2 ações do default (`my_day_tasks`/`how_was_my_day`) leem **tarefas de Vendas** — para um usuário de serviço isso vem **vazio** (os dados dele estão em `service_cards` / atividades de serviço).
2. **Ações de card são só de Vendas.** Num card de **serviço**, "Resumir negócio" consultaria a tabela errada (`cards` em vez de `service_cards`).
3. **Admin/Gerente** estão no default fraco — sem visão de time.
4. **Poucas ações no total** (11), e várias são "dicas genéricas" sem dado do CRM. A ideia é **ampliar o catálogo de perguntas prontas** por role (não é limitação de design — o formato "só chips" é intencional; ver decisão de produto no topo).

---

## 5. Plano de melhorias (roadmap sugerido)

### Fase 1 — Cobrir o Serviço (maior impacto, resolve o buraco)
- Criar o **role Serviço** no `useAgentContext` (hoje ele cai no default).
- Novas ações de serviço no backend, lendo os **dados certos** (`service_cards`, `service_card_activities`, recalibrações):
  - **Minhas atividades de serviço hoje** (atividades pendentes/atrasadas do usuário)
  - **Recalibrações vencendo** (aparelhos com `next_recalibration_date` próxima)
  - **Resumir este card de serviço** (versão de `summarize_card` para `service_cards`)
  - **Como foi meu dia (serviço)**
  - No board **Cobrança**: **Aparelhos a vencer / atrasados**, **Cobranças em aberto**

### Fase 2 — Card ciente do board
- Fazer as ações de card (`summarize_card`, `suggest_next_steps`, e-mails) **detectarem o tipo de card** (Vendas vs Serviço) e ler a tabela certa. Assim o mesmo chip funciona nos dois módulos.

### Fase 3 — Reforçar cada role (mais chips úteis, com dado real)
- **SDR:** "Leads sem contato há X dias" · "Reagendados / no-shows" · "Progresso da meta de reuniões"
- **Vendedor:** "Negócios parados" · "Follow-ups atrasados" · "Propostas em aberto"
- **Serviço:** as da Fase 1
- **Admin/Gerente:** "Visão do time" · "Ranking" · "Gargalos do funil" · "Negócios parados do time"

> **Não haverá campo de texto livre** (decisão de produto). O crescimento do agente vem de
> **ampliar e refinar o catálogo de perguntas prontas** por role — sempre com o dado certo por trás.

---

## 6. Resumo executivo

- Hoje: **11 ações**, **2 roles** de fato (Vendedor e SDR), tudo lendo **Vendas**.
- Formato: **só perguntas prontas (chips)** — e assim **continua** (sem texto livre, por decisão de produto).
- Buraco principal: **Serviço** não tem nada próprio e as ações genéricas vêm vazias pra ele.
- Ordem sugerida: **Serviço primeiro** (Fase 1) → **card ciente do board** (Fase 2) → **mais chips por role** (Fase 3).

---

## 7. Catálogo de perguntas a criar (alinhado)

> **Decisões:** perguntas de gestor **separadas por módulo** (Vendas × Serviço); período padrão
> das perguntas de números = **mês atual**. Rotina/alertas olham o **dia**. Sem texto livre.

### 7.1. Role SERVIÇO (novo)

**No card de serviço** (contexto `card_detail`):
- Resumir este card de serviço — *dados + atividades + aparelhos*
- Sugerir próximos passos — *etapa atual + o que falta pra avançar*
- Gerar e-mail de follow-up — *contato + contexto do card*
- Gerar e-mail de proposta — *serviços/valores do card*

**No board / rotina** (contexto `board`/`general`):
- Minhas atividades de serviço hoje — *pendentes + atrasadas do usuário*
- Recalibrações vencendo — *aparelhos com data próxima (30/60/90 dias)*
- Meus cards parados — *sem movimento 3d+/7d+*
- Como foi meu dia (serviço) — *o que concluiu no dia*
- Cobranças a vencer / atrasadas — *só board Cobrança (a vencer × atrasados)*

### 7.2. Role GERENTE / ADMIN (novo) — visão de time, **separado por módulo**, mês atual

**Rotina / alertas (foco no dia):**
- Atividades atrasadas (Vendas) · Atividades atrasadas (Serviço) — *quantas e de quem*
- Cards parados 3d+/7d+ (Vendas) · Cards parados 3d+/7d+ (Serviço) — *quantos e em qual etapa*
- Follow-ups atrasados (Vendas) — *negócios com follow-up vencido*

**Ganhos / perdas (mês atual):**
- Ganhos do mês por pessoa (Vendas) · (Serviço) — *ranking de quem mais ganhou*
- Ganhos do mês por tipo — Vendas (venda/locação) · Serviço (Recalibração/Manutenção/Ambos)
- Receita ganha no mês (Vendas) · (Serviço) — *valor + comparativo com mês anterior*
- Perdidos do mês com motivos (Vendas) · (Serviço) — *quantidade + principais motivos*
- Taxa de ganho e ticket médio (Vendas) · (Serviço)

**Funil / pessoas:**
- Gargalos do funil (Vendas) · (Serviço) — *etapas com mais cards parados*
- Ranking de colaboradores (Vendas) · (Serviço) — *atividades + ganhos (+ recalibrações no Serviço)*
- Resumo do mês (Vendas) · (Serviço) — *panorama: ativos, ganhos, perdidos, receita, atividades*

> **Nota de UX:** são muitas perguntas de gestor. Na implementação, organizar **quais aparecem por
> contexto** (ex.: num board de Vendas, mostrar as (Vendas); no dashboard, um grupo curado), para
> não exibir 20 chips de uma vez. Todas usam dados que os **dashboards já calculam**.

### 7.3. Links clicáveis para os cards (decidido)

Toda pergunta que **lista cards específicos** (parados, minhas atividades de hoje, recalibrações
vencendo, follow-ups atrasados, gargalos, etc.) deve trazer **cada card como link clicável** na resposta.

- O chat já renderiza **markdown** (`ReactMarkdown` no `AgentMessageBubble`), então basta o backend
  devolver os itens como `[Título do card](url)`.
- Rotas: **Vendas** = `/cards/{cardId}` · **Serviço** = `/servicos/{boardId}/cards/{cardId}`.
- **Ajuste na implementação:** adicionar um renderizador de link (`a`) customizado no `AgentMessageBubble`
  para navegar via react-router (sem reload) e com estilo de link. Hoje o link puro funcionaria, mas
  recarrega a página.
- Exemplo de resposta:
  > Você tem **3 cards parados 7d+**:
  > • [TABOCA S.A — Nº 13999](/cards/123) — parado há 9 dias
  > • [Transportes Keller](/servicos/1/cards/456) — parado há 12 dias

---

*Documento de planejamento — nenhuma alteração de código feita. Referências: `frontend/src/hooks/useAgentContext.ts`, `frontend/src/services/agentService.ts`, `backend/app/services/ai_service.py`, `backend/app/api/v1/endpoints/ai.py`.*
