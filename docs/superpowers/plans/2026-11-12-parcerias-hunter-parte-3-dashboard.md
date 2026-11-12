# Parcerias — Hunter, Parte 3: Dashboard de Parcerias · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a aba "Parcerias" do Dashboard: carteira do hunter (empresas, vendas, paradas, prazo de indicação, quanto vai ganhar), visão da empresa parceira (vendas próprias, por vendedor, unidades indicadas, comissões), visão do vendedor do parceiro (só as próprias vendas) e visão da H&S com filtros e rankings.

**Architecture:** um serviço só de leitura `services/parcerias/dashboard.py` monta os números a partir das oportunidades com ganho confirmado e dos lançamentos de comissão, reaproveitando a visibilidade de `acesso.py` e o escopo de `comissoes._escopo`. Rota `GET /api/v1/parcerias/dashboard` (já liberada para os perfis trancados). No front, um componente `DashboardParcerias` usado na página `/dashboard` (opção "Parcerias" para admin/manager) e numa rota `/parcerias/dashboard` para os perfis externos e o Financeiro (que são trancados em Parcerias).

**Tech Stack:** FastAPI · SQLAlchemy · pytest (SQLite em memória) · React + TS + Vite + Tailwind + recharts (já usado nos dashboards).

**Spec:** `docs/superpowers/specs/2026-11-11-parcerias-hunter-indicacao-comissoes-design.md` — seção 5 (Parte 3 da seção 6). Base: Partes 1 e 2 (v1.11.19) na `main`.

## Global Constraints

- `backend/.env` aponta para PRODUÇÃO: nunca rodar alembic, scripts ou a API; não ler `.env`; não consultar bancos (nem pelo `bancos`). **Sem migration nesta parte.**
- Testes: `cd backend && REDIS_HOST=127.0.0.1 REDIS_PORT=6390 venv/bin/python -m pytest <arquivo> -q -p no:cacheprovider` (Redis `redis-testes-hsgrowth` na 6390 — não pare o container). Falhas pré-existentes: `test_daily_service.py`, `test_daily_endpoints.py`, 2 de `test_proposals.py`.
- Front: `cd frontend && npx tsc --noEmit -p . && npm run build` (lint quebrado no repo, pré-existente).
- Português em código, UI e mensagens. Commits conventional sem acentos, com o trailer `Co-Authored-By`. Um commit por tarefa. Sem push.
- **Venda** = oportunidade não excluída com `won_confirmed_at` preenchido e `modality != "locacao"`. **Valor vendido** = a mesma base da comissão (produtos − desconto geral, sem frete; `comissoes.base_sem_frete` / helper comum), somado em `Decimal` no servidor e devolvido como string com 2 casas.
- **Período** (`de`/`ate`, opcionais, inclusivos) sobre `won_confirmed_at`, no fuso America/Sao_Paulo — reusar `comissoes._limites_utc`. Série mensal agrupada por mês de São Paulo.
- **Parada há X dias** = dias desde o mais recente entre a última oportunidade criada e a última venda confirmada da empresa (sem nenhuma das duas: `null`). Uma empresa conta como "parada" a partir de **30 dias**.
- **Prazo de indicação vence em** = `first_sale_at + indication_months` (meses de calendário; `null` sem âncora).
- **Comissões:** "vai ganhar" = soma `pendente`; "recebido" = soma `paga`; `cancelada` não entra. `partner_member` nunca recebe campos de comissão (nem nulos com chave): o esquema da resposta dele não tem esses campos.
- Visibilidade: hunter vê só as empresas que indicou + as próprias vendas; empresa vê as próprias vendas (com as da equipe, por vendedor) + as unidades que indicou; vendedor vê só as próprias vendas; admin/manager/finance veem tudo com filtros; `salesperson`, `sdr`, `service`, `viewer` → 403.
- Rankings da H&S: **empresas** (`kind="empresa"`) e **hunters** (`kind="hunter"`, somando as vendas das empresas que indicaram + as vendas próprias) por valor vendido e por nº de vendas, no período e filtros.
- Versão desta parte: **1.11.20** (CHANGELOG.md, `ChangelogModal.tsx`, rodapé do `MainLayout.tsx`).

## Review Focus

1. **Um nível só no hunter:** a carteira do hunter não inclui unidades indicadas pelas empresas dele, nem nas somas — teste na Task 1.
2. **Vendedor sem comissão:** a resposta do `partner_member` não tem nenhum campo de comissão — teste na Task 1.
3. **Locação, ganho não confirmado e excluídas fora das somas** — teste na Task 1.
4. **Fuso no período:** venda confirmada às 23:30 de São Paulo cai no dia/mês local — teste na Task 2.
5. **Hunter no ranking de hunters, nunca no de empresas** — teste na Task 2.

---

### Task 1: Painel dos perfis externos (hunter, empresa, vendedor)

**Files:**
- Create: `backend/app/services/parcerias/dashboard.py`, `backend/tests/unit/test_parcerias_dashboard_externos.py`
- Modify: `backend/app/schemas/parcerias.py`, `backend/app/api/v1/endpoints/parcerias.py`

**Interfaces — Produces:**
- `GET /api/v1/parcerias/dashboard?de=&ate=` → a forma depende do perfil (campo `visao`):
  - `visao="vendedor"` (`partner_member`): `{visao, vendas: {quantidade, valor}, serie: [{mes: "AAAA-MM", quantidade, valor}]}`.
  - `visao="empresa"` (`partner`): `{visao, vendas, serie, por_vendedor: [{membro_id, nome, quantidade, valor}], unidades: [CarteiraItem], comissoes: {pendente, pago, por_tipo: {tipo: {pendente, pago}}}}`.
  - `visao="hunter"`: `{visao, vendas (próprias), serie (próprias + carteira), carteira: [CarteiraItem], comissoes}`.
  - `CarteiraItem = {partner_id, nome, situacao (stage), quantidade, valor, ultima_venda_em, ultima_atividade_em, dias_parada, parada (bool), prazo_indicacao_ate}` — `prazo_indicacao_ate` só aparece para o hunter (é dele o prazo).
- `dashboard.painel(db, user, de, ate) -> dict` com uma função por visão; helper `vendas_de(db, partner_ids, de, ate) -> (quantidade, valor)` e `serie_mensal(...)` reutilizáveis na Task 2.

- [ ] **Step 1: testes** (helpers `config_comissoes`, `oportunidade_ganha`, `hunter`, `parceiro(indicated_by_partner_id=...)`, `usuario`, `headers`; confirmar ganho via `POST .../ganho {"acao":"confirmar"}` com `admin_headers`):
  - `test_vendedor_ve_so_as_proprias_sem_comissao` — chaves da resposta = `{"visao","vendas","serie"}`.
  - `test_empresa_ve_vendas_por_vendedor_e_unidades`.
  - `test_hunter_carteira_um_nivel` (Review Focus 1) — H indica A; A indica B; carteira de H = [A] e somas sem B.
  - `test_locacao_nao_confirmada_e_excluida_fora` (Review Focus 3).
  - `test_parada_e_prazo` — última atividade há 45 dias → `parada=true`, `dias_parada=45`; prazo = âncora + 24 meses.
  - `test_comissoes_pendente_e_pago` — soma por situação e por tipo; cancelada fora.
  - `test_salesperson_403`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** arquivo + `test_parcerias*.py` passam. **Step 5:** commit `feat(parcerias): painel do dashboard para hunter, empresa e vendedor`.

---

### Task 2: Painel da H&S (filtros e rankings)

**Files:**
- Modify: `backend/app/services/parcerias/dashboard.py`, `backend/app/schemas/parcerias.py`, `backend/app/api/v1/endpoints/parcerias.py`
- Test: `backend/tests/unit/test_parcerias_dashboard_hs.py`

**Interfaces — Produces:**
- Mesma rota; para admin/manager/finance `visao="hs"` e filtros extras `hunter_id`, `partner_id` (opcionais; `hunter_id` restringe às empresas indicadas por ele + vendas próprias dele; `partner_id` restringe à empresa).
- Resposta: `{visao, vendas, serie, ranking_empresas: [{partner_id, nome, quantidade, valor, situacao}], ranking_hunters: [{partner_id, nome, empresas (nº indicadas), quantidade, valor}], paradas: [CarteiraItem] (empresas paradas, ordenadas por dias_parada desc, máx 20), comissoes: {pendente, pago, por_tipo}}`. Rankings ordenados por valor desc (empate: quantidade desc, nome), máx 20 cada.

- [ ] **Step 1: testes:** `test_hs_totais_e_rankings`; `test_hunter_so_no_ranking_de_hunters` (Review Focus 5); `test_filtro_hunter_e_empresa`; `test_periodo_no_fuso_de_sao_paulo` (Review Focus 4 — confirmada 2026-11-10 23:30 BRT conta em novembro e no dia 10); `test_finance_ve_painel_hs`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** arquivo + `test_parcerias*.py` + suíte inteira (comparar com as falhas pré-existentes). **Step 5:** commit `feat(parcerias): painel da HS com filtros e rankings`.

---

### Task 3: Front — DashboardParcerias

**Files:**
- Create: `frontend/src/components/dashboard/DashboardParcerias.tsx`
- Modify: `frontend/src/services/parceriasService.ts`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/router.tsx`, `frontend/src/layouts/MainLayout.tsx`

**Comportamento:**
- Serviço `painelParcerias({de, ate, hunter_id?, partner_id?})` tipado pela resposta (união discriminada por `visao`); dinheiro chega como string → `Number()` só para exibir (BRL).
- `DashboardParcerias`: filtro de período (padrão: mês atual) e, na visão `hs`, selects de hunter (de `listarHunters()`) e empresa. KPIs no padrão do `KpiCard` existente; gráfico de barras mensal (recharts, no estilo dos outros dashboards) de valor vendido; tabelas:
  - hunter: carteira (situação, vendas, valor, última venda, "parada há X dias" em destaque quando `parada`, prazo de indicação), comissões pendente/recebido;
  - empresa: vendas por vendedor, unidades indicadas, comissões;
  - vendedor: só KPIs e gráfico das próprias vendas;
  - hs: rankings de empresas e de hunters (lado a lado), empresas paradas, comissões pendente/pago com link para Comissões.
- `/dashboard` (admin/manager): nova opção "Parcerias" no seletor de visão existente, que renderiza `DashboardParcerias`.
- `/parcerias/dashboard` (partner, partner_member, hunter, finance): rota guardada que renderiza `DashboardParcerias`; item "Dashboard" no menu desses perfis (entra na lista liberada para trancados em `MainLayout`); `ParceriasHome` continua mandando os externos para Oportunidades.
- [ ] **Step 1:** implementar. **Step 2:** `npx tsc --noEmit -p . && npm run build`. **Step 3:** commit `feat(front): dashboard de parcerias`.

---

### Task 4: Versão 1.11.20 e verificação final

- [ ] **Step 1:** versão **1.11.20** nos 3 lugares; CHANGELOG (Adicionado: Dashboard de Parcerias — carteira do hunter com empresas paradas e prazo de indicação, visão da empresa e do vendedor, visão da H&S com filtros e rankings). Sem migration.
- [ ] **Step 2:** suíte inteira, `tsc` + build, `venv/bin/alembic heads` → `9d0e1f2a3b4c (head)` (inalterado).
- [ ] **Step 3:** commit `chore(release): v1.11.20`.
