# Agent Growth — Role Gerente/Admin (Plano 2) Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development ou executing-plans.

**Goal:** Dar ao **admin/gerente** perguntas de gestão no Agent Growth, **separadas por módulo** (Vendas × Serviço), período = **mês atual**, reusando os dashboards. Hoje admin/gerente cai no menu genérico fraco.

**Architecture:** mesma do Plano 1 — novos `action_id` + prompts (reusam `ReportService`/`ServiceDashboardService`) + opções por role no frontend. Novidade: os chips de gestor **variam pelo tipo de board** (Vendas `/boards/...` × Serviço `/servicos/...`), detectado no `useAgentContext`.

**Escopo:** 5 perguntas por módulo (10 `action_id`):
`mgr_summary_*`, `mgr_overdue_*`, `mgr_stuck_*`, `mgr_wins_*` (por pessoa + por tipo), `mgr_losses_*` (qtd + motivos) — sufixo `_vendas` / `_servico`.

**Fontes de dado:**
- Serviço: `ServiceDashboardService.get_dashboard(start, end, boards={1}/{2})` — traz `active_count, won_count, won_value, lost_count, win_rate, avg_ticket, stuck_count, collaborators (por pessoa), won_by_service_type (por tipo), loss_reasons (motivos)`.
- Vendas: `ReportService.get_dashboard_kpis(current_user=admin, period_key="month")` (resumo + parados) + queries compactas (ganhos por pessoa/tipo, perdidos por motivo, tarefas atrasadas).

---

## Tasks

- [ ] **T1** — Enum `AgentActionId` (backend `schemas/ai.py`) + union `AgentActionId` (frontend `types/index.ts`): adicionar os 10 `mgr_*`.
- [ ] **T2** — `ai_service.py`: prompts de **Serviço-gestor** (`_prompt_mgr_*_servico`) reusando `ServiceDashboardService`.
- [ ] **T3** — `ai_service.py`: prompts de **Vendas-gestor** (`_prompt_mgr_*_vendas`) reusando `ReportService` + queries compactas.
- [ ] **T4** — `ai_service.py`: roteamento em `agent_chat` (só para `is_manager`; se não-gestor pedir, resposta curta de bloqueio) + `suggestions_map`.
- [ ] **T5** — Frontend `useAgentContext.ts`: `isServiceBoard` (pathname `/servicos`), `MANAGER_VENDAS/SERVICO/GENERAL`, e resolução por role admin/manager × contexto × tipo de board. Labels.
- [ ] **T6** — Smoke-tests dos prompts (dados reais) + typecheck.
- [ ] **T7** — Changelog v1.8.18 + commit.

**Display (T5):**
- admin/manager + board de **Serviço** → `MANAGER_SERVICO`
- admin/manager + board de **Vendas** → `MANAGER_VENDAS`
- admin/manager + `general` → `MANAGER_GENERAL` (resumos + parados dos 2 módulos)
- admin/manager + `card_detail`: se board de Serviço → `[service_summarize_card]`; senão default de card.

**Labels:**
`mgr_summary_* = "Resumo do mês (Vendas/Serviço)"`, `mgr_overdue_* = "Atividades atrasadas do time (Vendas/Serviço)"`, `mgr_stuck_* = "Cards parados do time (Vendas/Serviço)"`, `mgr_wins_* = "Ganhos do mês — por pessoa e tipo (Vendas/Serviço)"`, `mgr_losses_* = "Perdidos do mês — com motivos (Vendas/Serviço)"`.

---

*Plano 2. Segue o Plano 1 (role Serviço). Referência de design: `Documentação/Agent Growth - Estado Atual e Plano de Melhorias.md` §7.2.*
