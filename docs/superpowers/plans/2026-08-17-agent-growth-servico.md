# Agent Growth — Role Serviço (Plano 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao **role Serviço** perguntas próprias no Agent Growth, lendo os dados certos (atividades de serviço, recalibrações vencendo, cards parados, resumo de card de serviço, cobranças), com **links clicáveis** para os cards.

**Architecture:** O agente já mapeia `role × contexto → chips` (frontend `useAgentContext`) e `action_id → prompt` (backend `ai_service.agent_chat`). Adicionamos **novos `action_id` de serviço**, seus **prompts** (que consultam `service_cards`/`service_card_activities` e reusam `ServiceDashboardService`), um **mapa de opções para o role `service`** no frontend, e um **renderizador de link** no chat.

**Tech Stack:** FastAPI + SQLAlchemy (sync) · OpenAI (`_call_openai`) · React + TS · react-markdown.

**Escopo (Plano 1):** só o role **Serviço**. Gerente/Admin = Plano 2 (arquivo separado).

**Referência de design:** `Documentação/Agent Growth - Estado Atual e Plano de Melhorias.md` (§7.1 e §7.3).

---

## Estrutura de arquivos (o que muda)

**Backend**
- `backend/app/schemas/ai.py` — novos valores no enum `AgentActionId`.
- `backend/app/services/ai_service.py` — novos prompts `_prompt_service_*` + roteamento em `agent_chat` + `suggestions_map`.

**Frontend**
- `frontend/src/types/index.ts` — novos `AgentActionId` no union type.
- `frontend/src/hooks/useAgentContext.ts` — `SERVICE_OPTIONS` + `getOptionsByRole` reconhece `"service"` + labels.
- `frontend/src/components/agentGrowth/AgentMessageBubble.tsx` — renderizador de link (`a`) com react-router.

**Convenções de dados**
- Link de card de serviço: `/servicos/{board_id}/cards/{card_id}`.
- "Hoje" e janelas de dias: usar `datetime.utcnow()` como o resto do `ai_service`.
- Atividades do usuário: `ServiceCardActivity` com `user_id == user_id`, `category == "atividade"`.

---

## Novos `action_id` de serviço (referência)

| `action_id` | Label (chip) | Contexto |
|---|---|---|
| `service_my_day` | Minhas atividades de serviço hoje | board / general |
| `service_recal_due` | Recalibrações vencendo | board / general |
| `service_stuck_cards` | Meus cards parados | board / general |
| `service_how_was_my_day` | Como foi meu dia (serviço) | board / general |
| `service_summarize_card` | Resumir este card de serviço | card_detail |
| `service_collections` | Cobranças a vencer / atrasadas | board (Cobrança) |

---

## Task 1: Novos `action_id` no enum (backend + frontend types)

**Files:**
- Modify: `backend/app/schemas/ai.py` (enum `AgentActionId`, ~L122-138)
- Modify: `frontend/src/types/index.ts` (union `AgentActionId`, ~L1081)

- [ ] **Step 1: Adicionar os valores no enum backend**

Em `backend/app/schemas/ai.py`, dentro de `class AgentActionId`, após `HOW_WAS_MY_DAY`:

```python
    # Contexto de Serviço (role service) — leem dados de service_cards
    SERVICE_MY_DAY = "service_my_day"
    SERVICE_RECAL_DUE = "service_recal_due"
    SERVICE_STUCK_CARDS = "service_stuck_cards"
    SERVICE_HOW_WAS_MY_DAY = "service_how_was_my_day"
    SERVICE_SUMMARIZE_CARD = "service_summarize_card"
    SERVICE_COLLECTIONS = "service_collections"
```

- [ ] **Step 2: Adicionar no union type do frontend**

Em `frontend/src/types/index.ts`, no `export type AgentActionId =`, acrescentar as strings:

```typescript
  | "service_my_day"
  | "service_recal_due"
  | "service_stuck_cards"
  | "service_how_was_my_day"
  | "service_summarize_card"
  | "service_collections"
```

- [ ] **Step 3: Verificar import do backend**

Run: `docker exec -w /app hsgrowth-api-local python -c "from app.schemas.ai import AgentActionId; print(AgentActionId.SERVICE_MY_DAY.value)"`
Expected: imprime `service_my_day` (após `docker cp` do arquivo).

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/ai.py frontend/src/types/index.ts
git commit -m "feat(agent): novos action_id de servico (enum + tipos)"
```

---

## Task 2: Helper de link + carga de atividades de serviço

**Files:**
- Modify: `backend/app/services/ai_service.py` (adicionar helpers privados perto dos outros `_*`)

- [ ] **Step 1: Adicionar helpers**

No `AIService`, adicionar:

```python
    @staticmethod
    def _service_card_link(board_id: int, card_id: int, label: str) -> str:
        """Markdown link para um card de serviço."""
        safe = (label or f"Card #{card_id}").replace("[", "(").replace("]", ")")
        return f"[{safe}](/servicos/{board_id}/cards/{card_id})"

    def _service_cards_of_user(self, user_id: int):
        """IDs de cards de serviço em que o usuário agiu (modelo colaborativo)."""
        from app.models.service_card_activity import ServiceCardActivity
        rows = (
            self.db.query(ServiceCardActivity.service_card_id)
            .filter(ServiceCardActivity.user_id == user_id)
            .distinct()
            .all()
        )
        return {r[0] for r in rows}
```

- [ ] **Step 2: Smoke test**

Run: `docker exec -w /app hsgrowth-api-local python -c "from app.services.ai_service import AIService; print('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/ai_service.py
git commit -m "feat(agent): helpers de link e cards de servico do usuario"
```

---

## Task 3: Prompt `service_my_day` (atividades de serviço hoje)

**Files:**
- Modify: `backend/app/services/ai_service.py`

- [ ] **Step 1: Adicionar o prompt**

```python
    async def _prompt_service_my_day(self, user_id: int, user_name: str) -> tuple[str, str]:
        """Atividades de serviço (category=atividade) do usuário: hoje + atrasadas, com link do card."""
        from datetime import datetime
        from app.models.service_card_activity import ServiceCardActivity
        from app.models.service_card import ServiceCard
        from app.models.service_list import ServiceList

        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
        today_end = datetime(now.year, now.month, now.day, 23, 59, 59)

        base = (
            self.db.query(ServiceCardActivity, ServiceCard, ServiceList.board_id)
            .join(ServiceCard, ServiceCardActivity.service_card_id == ServiceCard.id)
            .join(ServiceList, ServiceCard.list_id == ServiceList.id)
            .filter(
                ServiceCardActivity.user_id == user_id,
                ServiceCardActivity.category == "atividade",
                ServiceCardActivity.is_completed == False,  # noqa: E712
            )
        )
        hoje = base.filter(ServiceCardActivity.due_date >= today_start,
                           ServiceCardActivity.due_date <= today_end).all()
        atrasadas = base.filter(ServiceCardActivity.due_date < today_start).limit(15).all()

        def _linha(act, card, board_id):
            titulo = card.title or f"Card #{card.id}"
            return f"- {act.title or 'Atividade'} · {self._service_card_link(board_id, card.id, titulo)}"

        linhas_hoje = "\n".join(_linha(a, c, b) for a, c, b in hoje) or "(nenhuma)"
        linhas_atr = "\n".join(_linha(a, c, b) for a, c, b in atrasadas) or "(nenhuma)"

        system = (
            "Você é um assistente de produtividade do time de Serviço (calibração/manutenção). "
            "Responda em português brasileiro, curto e prático. Priorize as atrasadas. "
            "MANTENHA os links markdown dos cards exatamente como recebidos."
        )
        user = (
            f"Usuário: {user_name}. Organize o dia dele no módulo de Serviço.\n\n"
            f"ATIVIDADES DE HOJE:\n{linhas_hoje}\n\n"
            f"ATIVIDADES ATRASADAS:\n{linhas_atr}\n\n"
            "Sugira por onde começar (2-4 linhas) e liste os cards com seus links."
        )
        return system, user
```

- [ ] **Step 2: Rotear em `agent_chat`**

Em `agent_chat`, no bloco de `if/elif`, adicionar antes do `else`:

```python
        elif action_id == AgentActionId.SERVICE_MY_DAY:
            system_p, user_p = await self._prompt_service_my_day(user_id=user_id, user_name=user_name)
            max_tokens = 700
```

- [ ] **Step 3: Smoke test (dados reais, sem chamar OpenAI)**

Run:
```bash
docker exec -w /app hsgrowth-api-local python -c "
import asyncio
from app.db.session import SessionLocal
from app.services.ai_service import AIService
db=SessionLocal(); svc=AIService(db)
s,u=asyncio.get_event_loop().run_until_complete(svc._prompt_service_my_day(user_id=1, user_name='Teste'))
print('OK' if '/servicos/' in u or '(nenhuma)' in u else 'FAIL'); print(u[:300])
"
```
Expected: `OK` + o texto do prompt (com links `/servicos/...` ou "(nenhuma)").

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/ai_service.py
git commit -m "feat(agent): prompt service_my_day (atividades de servico hoje)"
```

---

## Task 4: Prompt `service_stuck_cards` (meus cards parados, com link)

**Files:**
- Modify: `backend/app/services/ai_service.py`

- [ ] **Step 1: Adicionar o prompt** — reusa a lógica de parado do board (dias úteis) via `ServiceBoardService.list_cards`, filtrando os do usuário.

```python
    async def _prompt_service_stuck_cards(self, user_id: int, user_name: str) -> tuple[str, str]:
        """Cards de serviço parados 3d+/7d+ em que o usuário atuou, com link."""
        from app.services.service_board_service import ServiceBoardService, SERVICE_FUNNEL_BOARD_IDS
        meus = self._service_cards_of_user(user_id)
        sb = ServiceBoardService(self.db)
        parados = []
        # boards oficiais + Cobrança (2)
        for board_id in sorted(set(list(SERVICE_FUNNEL_BOARD_IDS) + [2])):
            try:
                resp = sb.list_cards(board_id, page=1, page_size=500)
            except Exception:
                continue
            for c in resp.cards:
                if c.id in meus and (c.is_stuck_3d or c.is_stuck_7d):
                    tag = "7d+" if c.is_stuck_7d else "3d+"
                    parados.append(f"- {self._service_card_link(board_id, c.id, c.title or f'Card #{c.id}')} · parado {tag}")

        linhas = "\n".join(parados) or "(nenhum card parado — bom trabalho!)"
        system = (
            "Você é um assistente do time de Serviço. Responda em português, curto. "
            "MANTENHA os links markdown dos cards exatamente como recebidos."
        )
        user = (
            f"Usuário: {user_name}. Estes são os cards de serviço dele que estão parados:\n\n"
            f"{linhas}\n\n"
            "Faça um resumo de 1-2 linhas e liste os cards com os links para ele destravar."
        )
        return system, user
```

- [ ] **Step 2: Rotear em `agent_chat`**

```python
        elif action_id == AgentActionId.SERVICE_STUCK_CARDS:
            system_p, user_p = await self._prompt_service_stuck_cards(user_id=user_id, user_name=user_name)
            max_tokens = 600
```

- [ ] **Step 3: Smoke test**

Run:
```bash
docker exec -w /app hsgrowth-api-local python -c "
import asyncio
from app.db.session import SessionLocal
from app.services.ai_service import AIService
db=SessionLocal(); svc=AIService(db)
s,u=asyncio.get_event_loop().run_until_complete(svc._prompt_service_stuck_cards(user_id=1, user_name='Teste'))
print('OK'); print(u[:400])
"
```
Expected: `OK` + prompt com links ou "(nenhum card parado…)".

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/ai_service.py
git commit -m "feat(agent): prompt service_stuck_cards (parados com link)"
```

---

## Task 5: Prompt `service_recal_due` (recalibrações vencendo)

**Files:**
- Modify: `backend/app/services/ai_service.py`

- [ ] **Step 1: Adicionar o prompt** — reusa `ServiceDashboardService.get_dashboard` para os números de recalibração (overdue/30/50/90).

```python
    async def _prompt_service_recal_due(self, user_name: str) -> tuple[str, str]:
        """Recalibrações vencendo — reusa os números que o dashboard de Serviço já calcula."""
        from datetime import datetime, timedelta
        from app.services.service_dashboard_service import ServiceDashboardService
        end = datetime.utcnow(); start = end - timedelta(days=365)
        dash = ServiceDashboardService(self.db).get_dashboard(start, end, boards={1})
        r = dash.recalibrations
        system = (
            "Você é um assistente do time de Serviço (calibração). Responda em português, curto e objetivo. "
            "Chame atenção para as vencidas e as dos próximos 30 dias."
        )
        user = (
            f"Usuário: {user_name}. Panorama de recalibrações dos aparelhos:\n"
            f"- Vencidas: {r.overdue}\n- Vencem em até 30 dias: {r.due_30}\n"
            f"- 31–50 dias: {r.due_50}\n- 51–90 dias: {r.due_90}\n"
            f"- Total de aparelhos monitorados: {r.total_devices}\n\n"
            "Resuma o que priorizar (2-4 linhas)."
        )
        return system, user
```

- [ ] **Step 2: Rotear em `agent_chat`**

```python
        elif action_id == AgentActionId.SERVICE_RECAL_DUE:
            system_p, user_p = await self._prompt_service_recal_due(user_name=user_name)
            max_tokens = 400
```

- [ ] **Step 3: Smoke test**

Run:
```bash
docker exec -w /app hsgrowth-api-local python -c "
import asyncio
from app.db.session import SessionLocal
from app.services.ai_service import AIService
db=SessionLocal(); svc=AIService(db)
s,u=asyncio.get_event_loop().run_until_complete(svc._prompt_service_recal_due(user_name='Teste'))
print('OK'); print(u)
"
```
Expected: `OK` + prompt com os números de recalibração.

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/ai_service.py
git commit -m "feat(agent): prompt service_recal_due (recalibracoes vencendo)"
```

---

## Task 6: Prompt `service_how_was_my_day` (como foi meu dia — serviço)

**Files:**
- Modify: `backend/app/services/ai_service.py`

- [ ] **Step 1: Adicionar o prompt** — conta as atividades de serviço concluídas hoje pelo usuário.

```python
    async def _prompt_service_how_was_my_day(self, user_id: int, user_name: str) -> tuple[str, str]:
        from datetime import datetime
        from app.models.service_card_activity import ServiceCardActivity
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0)

        concluidas = (
            self.db.query(ServiceCardActivity)
            .filter(
                ServiceCardActivity.user_id == user_id,
                ServiceCardActivity.category == "atividade",
                ServiceCardActivity.is_completed == True,       # noqa: E712
                ServiceCardActivity.completed_at >= today_start,
            ).all()
        )
        por_tipo: dict = {}
        for a in concluidas:
            por_tipo[a.activity_type or "outros"] = por_tipo.get(a.activity_type or "outros", 0) + 1
        resumo = ", ".join(f"{v} {k}" for k, v in por_tipo.items()) or "nenhuma atividade concluída"

        system = ("Você é um assistente do time de Serviço. Responda em português, tom motivador e curto.")
        user = (
            f"Usuário: {user_name}. Hoje ele concluiu: {len(concluidas)} atividades ({resumo}).\n"
            "Faça um resumo do dia dele (2-3 linhas) e uma sugestão de fechamento do dia."
        )
        return system, user
```

- [ ] **Step 2: Rotear em `agent_chat`**

```python
        elif action_id == AgentActionId.SERVICE_HOW_WAS_MY_DAY:
            system_p, user_p = await self._prompt_service_how_was_my_day(user_id=user_id, user_name=user_name)
            max_tokens = 500
```

- [ ] **Step 3: Smoke test** (análogo aos anteriores; espera `OK`).
- [ ] **Step 4: Commit** — `feat(agent): prompt service_how_was_my_day`

---

## Task 7: Prompt `service_summarize_card` (resumir card de serviço)

**Files:**
- Modify: `backend/app/services/ai_service.py`

- [ ] **Step 1: Adicionar o prompt** — usa `ServiceBoardService.get_card` + monta contexto (título, cliente, etapa, serviços, aparelhos).

```python
    def _prompt_service_summarize_card(self, card_id: int) -> tuple[str, str]:
        from app.services.service_board_service import ServiceBoardService
        sb = ServiceBoardService(self.db)
        card = sb.get_card(card_id)  # 404 se não existir
        biz = card.business_info or {}
        aparelhos = (biz.get("equipamentos") or [])
        ctx = (
            f"Título: {card.title}\n"
            f"Cliente: {card.client.name if card.client else '—'}\n"
            f"Contato: {card.person.name if card.person else '—'}\n"
            f"Tipo de serviço: {biz.get('service_type') or '—'}\n"
            f"Forma de fechamento: {biz.get('closing_type') or '—'}\n"
            f"Nº proposta: {biz.get('proposal_number') or '—'} · Nº pedido: {biz.get('order_number') or '—'}\n"
            f"Aparelhos: {len(aparelhos)}\n"
            f"Descrição: {(card.description or '')[:500]}"
        )
        system = (
            "Você é um assistente de CRM do time de Serviço (calibração/manutenção). "
            "Gere um resumo executivo em português, curto, para retomar o contexto do card."
        )
        user = f"Resuma este card de serviço:\n\n{ctx}"
        return system, user
```

- [ ] **Step 2: Rotear em `agent_chat`** (usa `card_id`):

```python
        elif action_id == AgentActionId.SERVICE_SUMMARIZE_CARD:
            system_p, user_p = self._prompt_service_summarize_card(card_id)
            max_tokens = 400
```

- [ ] **Step 3: Smoke test** com um `card_id` real de serviço (espera `OK` + contexto).
- [ ] **Step 4: Commit** — `feat(agent): prompt service_summarize_card`

---

## Task 8: Prompt `service_collections` (cobranças a vencer/atrasadas — Cobrança)

**Files:**
- Modify: `backend/app/services/ai_service.py`

- [ ] **Step 1: Adicionar o prompt** — reusa `ServiceDashboardService.get_dashboard(boards={2})` (Cobrança) para os números (atrasados 3d+, tipos de cobrança).

```python
    async def _prompt_service_collections(self, user_name: str) -> tuple[str, str]:
        from datetime import datetime, timedelta
        from app.services.service_dashboard_service import ServiceDashboardService
        end = datetime.utcnow(); start = end - timedelta(days=90)
        dash = ServiceDashboardService(self.db).get_dashboard(start, end, boards={2})
        system = ("Você é um assistente do time de Cobrança de Serviço. Responda em português, curto.")
        user = (
            f"Usuário: {user_name}. Panorama da Cobrança no período:\n"
            f"- Negócios ativos: {dash.active_count}\n"
            f"- Valor em aberto: R$ {dash.pipeline_value:.2f}\n"
            f"- Atrasados 3d+: {dash.stuck_count}\n"
            f"- Ganhos: {dash.won_count} · Perdidos: {dash.lost_count}\n\n"
            "Resuma prioridades de cobrança (2-4 linhas)."
        )
        return system, user
```

- [ ] **Step 2: Rotear em `agent_chat`**:

```python
        elif action_id == AgentActionId.SERVICE_COLLECTIONS:
            system_p, user_p = await self._prompt_service_collections(user_name=user_name)
            max_tokens = 500
```

- [ ] **Step 3: Smoke test** (espera `OK`).
- [ ] **Step 4: Commit** — `feat(agent): prompt service_collections`

---

## Task 9: `suggestions_map` para as ações de serviço

**Files:**
- Modify: `backend/app/services/ai_service.py` (dict `suggestions_map` em `agent_chat`)

- [ ] **Step 1: Adicionar entradas** (chips sugeridos após a resposta):

```python
            AgentActionId.SERVICE_MY_DAY: ["service_stuck_cards", "service_recal_due", "service_how_was_my_day"],
            AgentActionId.SERVICE_STUCK_CARDS: ["service_my_day", "service_recal_due"],
            AgentActionId.SERVICE_RECAL_DUE: ["service_my_day", "service_stuck_cards"],
            AgentActionId.SERVICE_HOW_WAS_MY_DAY: ["service_my_day", "service_recal_due"],
            AgentActionId.SERVICE_SUMMARIZE_CARD: ["service_my_day"],
            AgentActionId.SERVICE_COLLECTIONS: ["service_my_day", "service_stuck_cards"],
```

- [ ] **Step 2: Commit** — `feat(agent): suggestions dos chips de servico`

---

## Task 10: Frontend — opções do role `service`

**Files:**
- Modify: `frontend/src/hooks/useAgentContext.ts`

- [ ] **Step 1: Labels** — em `ACTION_LABELS`, adicionar:

```typescript
  service_my_day:         "Minhas atividades de serviço hoje",
  service_recal_due:      "Recalibrações vencendo",
  service_stuck_cards:    "Meus cards parados",
  service_how_was_my_day: "Como foi meu dia (serviço)",
  service_summarize_card: "Resumir este card de serviço",
  service_collections:    "Cobranças a vencer / atrasadas",
```

- [ ] **Step 2: Mapa de opções** — adicionar `SERVICE_OPTIONS`:

```typescript
const SERVICE_OPTIONS: Record<AgentPageContext, AgentOption[]> = {
  card_detail: toOptions(["service_summarize_card", "email_followup"]),
  board:       toOptions(["service_my_day", "service_stuck_cards", "service_recal_due", "service_how_was_my_day", "service_collections"]),
  clients:     toOptions(["service_my_day", "service_how_was_my_day"]),
  general:     toOptions(["service_my_day", "service_recal_due", "service_how_was_my_day"]),
};
```

- [ ] **Step 3: `getOptionsByRole` reconhece `service`**:

```typescript
    case "service":     return SERVICE_OPTIONS;
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit** — `feat(agent): chips do role servico no useAgentContext`

---

## Task 11: Frontend — links clicáveis no chat

**Files:**
- Modify: `frontend/src/components/agentGrowth/AgentMessageBubble.tsx`

- [ ] **Step 1: Renderizador de link** — no objeto `components` do `ReactMarkdown`, adicionar um `a` que navega via react-router para links internos:

```tsx
            a: ({ href, children }) => {
              const url = href || "";
              const isInternal = url.startsWith("/");
              if (isInternal) {
                return (
                  <Link to={url} className="text-blue-500 hover:underline dark:text-blue-400">
                    {children}
                  </Link>
                );
              }
              return (
                <a href={url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline dark:text-blue-400">
                  {children}
                </a>
              );
            },
```

Importar no topo: `import { Link } from "react-router-dom";`

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit** — `feat(agent): links de card clicaveis no chat`

---

## Task 12: Teste no app + changelog

- [ ] **Step 1: Testar no app** logado como usuário de **serviço**:
  - Abrir o widget na dashboard/board → devem aparecer os chips de serviço.
  - "Minhas atividades de serviço hoje" e "Meus cards parados" → resposta com **links** que abrem o card (sem reload).
  - "Recalibrações vencendo" e "Cobranças" → números coerentes com o dashboard.
  - Num card de serviço → "Resumir este card de serviço" funciona.

- [ ] **Step 2: Changelog** (v1.8.17): entrada "feature" — "Agent Growth agora tem perguntas próprias para o time de Serviço (atividades, recalibrações, cards parados com link, resumo de card, cobranças)." Atualizar `CHANGELOG.md`, `ChangelogModal.tsx`, rodapé `MainLayout.tsx`.

- [ ] **Step 3: Commit** — `feat(agent): role servico no Agent Growth (v1.8.17)`

---

## Self-review (após implementar)

1. **Cobertura do spec:** todas as 6 perguntas de serviço do §7.1 do doc estão cobertas (Tasks 3-8). ✅
2. **Links:** parados e atividades listam cards com link `/servicos/{board}/cards/{id}` (Task 4/3) e o chat renderiza como `<Link>` (Task 11). ✅
3. **Dados certos:** prompts usam `service_card_activities`/`ServiceDashboardService`, não `cards`/`CardTask` de Vendas. ✅
4. **Sem texto livre:** só chips (decisão de produto). ✅

---

## Plano 2 (a fazer depois) — Role Gerente/Admin

Perguntas de gestor **separadas por módulo** (Vendas × Serviço), período = mês (ver §7.2 do doc de design). Reusar `ServiceDashboardService` + `ReportService`. Novos `action_id` `mgr_*_vendas` / `mgr_*_servico`. Arquivo próprio: `docs/superpowers/plans/2026-08-17-agent-growth-gerente.md` (a escrever).
