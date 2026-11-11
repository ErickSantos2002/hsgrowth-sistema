# Parcerias — Hunter, Parte 2: Comissões · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** gerar, mostrar e pagar comissões do Programa de Parceiros: venda própria (Y%), indicação (X% no prazo), bônus de primeira venda (R$) e calibração (Z%, lançamento manual), com configuração editável pela H&S e a lista "A pagar" do Financeiro.

**Architecture:** um serviço `services/parcerias/comissoes.py` gera os lançamentos no momento em que o Financeiro confirma o ganho e os cancela quando o ganho é desfeito antes do pagamento. Cada lançamento guarda beneficiário, base, percentual/valor usado e situação — mudar a configuração ou o indicador não reescreve o passado. A âncora do prazo de indicação (primeira venda confirmada) fica no parceiro.

**Tech Stack:** FastAPI · SQLAlchemy · Alembic · pytest (SQLite em memória) · React + TS + Vite + Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-11-parcerias-hunter-indicacao-comissoes-design.md` — seções 4 e 8 (esta é a Parte 2 da seção 6). Base: Parte 1 (v1.11.18) na `main`.

## Global Constraints

- `backend/.env` aponta para PRODUÇÃO: nunca rodar `alembic upgrade/downgrade`, scripts ou a API local; não ler `.env`; não consultar bancos (nem pelo módulo `bancos`). `venv/bin/alembic heads` pode.
- Testes: `cd backend && REDIS_HOST=127.0.0.1 REDIS_PORT=6390 venv/bin/python -m pytest <arquivo> -q -p no:cacheprovider` (Redis descartável `redis-testes-hsgrowth` na 6390 — não pare o container). Falhas pré-existentes conhecidas: `test_daily_service.py`, `test_daily_endpoints.py`, 2 de `test_proposals.py` (PDF).
- Front: `cd frontend && npx tsc --noEmit -p . && npm run build` (`npm run lint` quebrado no repo, pré-existente).
- Português em código, UI e mensagens. Commits conventional sem acentos, com o trailer `Co-Authored-By`. Um commit por tarefa. Sem push.
- Migration nova: `revision = "9d0e1f2a3b4c"`, `down_revision = "8c9d0e1f2a3b"`; **aditiva** (só tabelas/colunas novas).
- Dinheiro em `Numeric(12, 2)`; percentuais em `Numeric(5, 2)` (ex.: 7.50 = 7,5%). Arredondar cada lançamento a 2 casas (`ROUND_HALF_UP`).
- **Base da comissão:** soma dos produtos (quantidade × preço − desconto do item) menos o desconto geral (R$ ou %), **sem o frete**, nunca negativa.
- **Só venda gera comissão:** `modality == "locacao"` não gera nada. `modality` nula (oportunidades antigas da H&S) é tratada como venda.
- **Troca de indicador:** só vale dali pra frente — o indicador usado é o de `partner.indicated_by_partner_id` **no momento da confirmação**.
- Quem recebe é sempre um `Partner` (empresa ou hunter) — nunca o vendedor da equipe.
- Visibilidade: `partner` e `hunter` veem só os próprios lançamentos (como beneficiário); `partner_member` não vê comissão (403); admin, manager e finance veem tudo; só admin/manager editam a configuração; admin, manager e finance marcam pagamento e lançam calibração.
- Mensagens exatas: sem permissão de pagar → `"Só o Financeiro, admin ou gerente marcam pagamento."`; calibração além do limite → `"Este aparelho já tem 2 calibrações com comissão."`; calibração em oportunidade sem ganho confirmado → `"Só oportunidade com ganho confirmado recebe calibração."`.
- Versão desta parte: **1.11.19** (CHANGELOG.md, `ChangelogModal.tsx`, rodapé do `MainLayout.tsx`).

## Review Focus

1. **Confirmar duas vezes não duplica:** confirmar → negar → confirmar de novo gera um único conjunto de lançamentos pendentes (os cancelados são reaproveitados, não duplicados) — teste na Task 2.
2. **Primeira venda desfeita:** se a venda que ancorou o prazo é desfeita antes do bônus ser pago, a âncora e o bônus somem e a próxima venda confirmada vira a "primeira"; se o bônus já foi pago, a âncora fica — teste na Task 2.
3. **Prazo vencido:** venda confirmada depois de `âncora + meses` não gera X% (venda própria continua) — teste na Task 2.
4. **Indicador bloqueado não acumula:** com o indicador bloqueado na hora da confirmação, não há X% nem bônus para ele; o Y% da empresa continua — teste na Task 2.
5. **Lançamento pago não muda:** negar/desfazer ganho depois de pago não cancela o lançamento pago (só os pendentes) — teste na Task 2.

---

## Mapa de arquivos

**Criar (backend):** `alembic/versions/2026_11_11_1600-9d0e1f2a3b4c_parcerias_comissoes.py`, `app/models/partner_commission.py`, `app/services/parcerias/comissoes.py`, testes `tests/unit/test_parcerias_comissoes_*.py`.
**Modificar (backend):** `app/models/partner.py`, `app/models/__init__.py`, `app/services/parcerias/oportunidades.py` (`confirmar_ganho`, `mover`), `app/services/parcerias/respostas.py` (extrair base sem frete), `app/schemas/parcerias.py`, `app/api/v1/endpoints/parcerias.py`.
**Criar (front):** `pages/parcerias/Comissoes.tsx`, `pages/parcerias/ConfigComissoes.tsx`, `components/parcerias/CalibracoesDaOportunidade.tsx`.
**Modificar (front):** `services/parceriasService.ts`, `router.tsx`, `layouts/MainLayout.tsx` (menu), `pages/parcerias/OportunidadeDetalhe.tsx`, `constants/parcerias.ts`.

---

### Task 1: Banco — configuração, lançamentos, calibrações e âncora

**Files:**
- Create: migration `9d0e1f2a3b4c`, `backend/app/models/partner_commission.py`
- Modify: `backend/app/models/partner.py`, `backend/app/models/__init__.py`, `backend/tests/unit/apoio_parcerias.py`
- Test: `backend/tests/unit/test_parcerias_comissoes_modelo.py`

**Interfaces — Produces:**
- `PartnerCommissionConfig` (`partner_commission_config`, uma linha): `id`, `own_sale_pct` (Y), `indication_pct` (X), `first_sale_bonus` (R$), `indication_months` (Integer, default 24), `calibration_pct` (Z), `updated_at`, `updated_by_id` (FK users SET NULL). A migration insere a linha única com zeros e 24 meses.
- `PartnerCommission` (`partner_commissions`): `id`, `beneficiary_partner_id` (FK partners, index), `source_partner_id` (FK partners — a empresa/hunter que vendeu), `opportunity_id` (FK partner_opportunities, index), `calibration_id` (FK partner_calibrations, null), `kind` (String(20): `venda_propria|indicacao|bonus_primeira_venda|calibracao`), `base_value` Numeric(12,2), `rate` Numeric(5,2) null (percentual usado) e `fixed_value` Numeric(12,2) null (bônus usado), `amount` Numeric(12,2), `status` (String(12): `pendente|paga|cancelada`, index), `created_at`, `paid_at`, `paid_by_id`, `cancelled_at`, `cancel_reason` (String(255)).
- `PartnerCalibration` (`partner_calibrations`): `id`, `opportunity_id` (FK, index), `serial_number` (String(60)), `calibration_date` (Date), `value` Numeric(12,2), `created_by_id`, `created_at`.
- `Partner` ganha `first_sale_at` (DateTime, null) e `first_sale_opportunity_id` (Integer, null) — a âncora do prazo de indicação.
- `apoio_parcerias.py`: `config_comissoes(db, y=10, x=5, bonus=100, meses=24, z=8) -> PartnerCommissionConfig` (cria/atualiza a linha única) e `oportunidade_ganha(db, p, valor_produtos, **campos) -> PartnerOpportunity` (oportunidade em `ganho` com um item de produto que soma `valor_produtos`).

- [ ] **Step 1:** teste `test_config_unica_e_lancamento_basico` (cria config, um lançamento com os campos acima, lê de volta). **Step 2:** FAIL. **Step 3:** migration + models + import + helpers. **Step 4:** passa; `venv/bin/alembic heads` → `9d0e1f2a3b4c (head)`. **Step 5:** commit `feat(parcerias): tabelas de comissao, calibracao e ancora da primeira venda`.

---

### Task 2: Geração e cancelamento das comissões

**Files:**
- Create: `backend/app/services/parcerias/comissoes.py`
- Modify: `backend/app/services/parcerias/oportunidades.py` (`confirmar_ganho` ~263, `mover` ~220 onde zera `won_confirmed_at`), `backend/app/services/parcerias/respostas.py` (expor a base sem frete)
- Test: `backend/tests/unit/test_parcerias_comissoes_geracao.py`

**Interfaces — Produces (comissoes.py):**
- `base_sem_frete(db, op) -> Decimal`: produtos − desconto geral, sem frete, ≥ 0 (reusar a soma de `respostas.valores_por_oportunidade`; extrair um helper comum, não duplicar a fórmula).
- `gerar(db, op, agora) -> List[PartnerCommission]`: chamado em `confirmar_ganho` (ação confirmar), antes do commit. Regras:
  - `locacao` → nada. Vendedor = `op.partner`.
  - **Venda própria:** beneficiário = vendedor (empresa ou hunter), `kind="venda_propria"`, `rate = own_sale_pct`.
  - **Indicação:** indicador = `vendedor.indicated_by` (se existir, não excluído e `stage != "bloqueado"`). Se `vendedor.first_sale_at` é nulo → esta é a primeira venda: grava `first_sale_at = agora`, `first_sale_opportunity_id = op.id`, gera `bonus_primeira_venda` (`fixed_value = first_sale_bonus`, se > 0) **e** `indicacao`. Senão gera `indicacao` só se `agora <= first_sale_at + indication_months` (meses de calendário).
  - A âncora é gravada mesmo sem indicador (o prazo conta da primeira venda da empresa).
  - Valor zero (percentual 0) não gera lançamento.
  - **Idempotente:** existe lançamento (op, kind, beneficiário) `pendente`/`paga` → não gera de novo; existe `cancelada` → reativa (`status="pendente"`, recalcula valores, limpa `cancelled_*`).
- `cancelar_da_oportunidade(db, op, motivo) -> None`: chamado quando o ganho é negado ou a oportunidade sai de `ganho` (onde hoje se zera `won_confirmed_at`). Todo lançamento `pendente` da oportunidade (exceto calibração) → `cancelada`. Se `op.id == vendedor.first_sale_opportunity_id` e o bônus dessa oportunidade **não** está pago → limpa `first_sale_at`/`first_sale_opportunity_id`.

- [ ] **Step 1: testes** (helpers `config_comissoes`, `oportunidade_ganha`, `hunter`, `parceiro(indicated_by_partner_id=...)`; confirmar via `POST .../ganho {"acao":"confirmar"}` com `admin_headers`):
  - `test_empresa_sem_indicador_so_venda_propria` — base 1000, Y=10 → um lançamento 100,00.
  - `test_base_ignora_frete_e_aplica_desconto_geral` — produtos 1000, desconto geral 10%, frete 50 → base 900.
  - `test_primeira_venda_da_indicada_gera_bonus_e_indicacao` — H indica A; A vende 1000 → A: 100 (Y); H: 100 (bônus) + 50 (X=5); `A.first_sale_at` preenchido.
  - `test_segunda_venda_so_indicacao` — sem novo bônus.
  - `test_prazo_vencido_nao_gera_indicacao` (Review Focus 3) — `first_sale_at` = 25 meses atrás.
  - `test_indicador_bloqueado_nao_acumula` (Review Focus 4).
  - `test_venda_propria_do_hunter` — oportunidade do próprio hunter → só Y% para ele.
  - `test_locacao_nao_gera`.
  - `test_unidade_indicada_por_empresa` — A indica B; B vende → A ganha bônus + X%; H (que indicou A) nada.
  - `test_troca_de_indicador_vale_dali_pra_frente` — venda 1 com H1; gestão troca para H2; venda 2 → X% para H2; lançamentos da venda 1 continuam de H1.
  - `test_confirmar_negar_confirmar_nao_duplica` (Review Focus 1).
  - `test_primeira_venda_desfeita_libera_ancora` + `test_bonus_pago_mantem_ancora` (Review Focus 2).
  - `test_pago_nao_e_cancelado` (Review Focus 5).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** arquivo + `test_parcerias*.py` → passam. **Step 5:** commit `feat(parcerias): comissoes geradas na confirmacao do ganho`.

---

### Task 3: Configuração, consulta, "A pagar", pagamento e calibração (API)

**Files:**
- Modify: `backend/app/services/parcerias/comissoes.py`, `backend/app/schemas/parcerias.py`, `backend/app/api/v1/endpoints/parcerias.py`
- Test: `backend/tests/unit/test_parcerias_comissoes_api.py`

**Interfaces — Produces (rotas sob `/api/v1/parcerias`):**
- `GET /comissoes/config` (admin, manager, finance) → `{own_sale_pct, indication_pct, first_sale_bonus, indication_months, calibration_pct, updated_at}`; `PUT /comissoes/config` (admin, manager; percentuais 0..100, bônus ≥ 0, meses 1..120) → mesma forma.
- `GET /comissoes?status=&beneficiario=&de=&ate=` → lista de lançamentos com `beneficiary_name`, `source_name`, `opportunity_title`, `kind`, `base_value`, `rate`, `fixed_value`, `amount`, `status`, datas. `partner`/`hunter`: força `beneficiario = parceiro_do_login` (ignora o parâmetro); `partner_member`: 403; gestão/finance: tudo. Mais `GET /comissoes/resumo` → `{pendente, pago, cancelado}` (somas) com o mesmo escopo.
- `GET /comissoes/a-pagar?de=&ate=` (admin, manager, finance) → por beneficiário: `{beneficiary_partner_id, nome, kind (empresa|hunter), documento (cnpj ou cpf), pix_key, total, quantidade, lancamentos: [...]}`, só `pendente`, ordenado por total desc. `GET /comissoes/a-pagar.csv` (mesmo filtro) → CSV `;`-separado com cabeçalho em português (beneficiário, documento, PIX, total).
- `POST /comissoes/pagar` `{ids: [int]}` **ou** `{beneficiary_partner_id: int, ate?: date}` (admin, manager, finance; outros → 403 mensagem global) → marca `paga` com `paid_at`/`paid_by_id` só os `pendente`; devolve quantidade e total pagos.
- Calibração: `GET /oportunidades/{id}/calibracoes` (admin, manager, finance e o dono da oportunidade para leitura) e `POST /oportunidades/{id}/calibracoes` `{serial_number, calibration_date, value}` (admin, manager, finance) → cria `PartnerCalibration` e, se a oportunidade é de **empresa** (não hunter), com ganho confirmado e o aparelho tem < 2 calibrações registradas, gera `kind="calibracao"` para a empresa com `rate = calibration_pct`, `base = value`. Sem ganho confirmado → 422 mensagem global; 3ª calibração do mesmo `serial_number` na mesma oportunidade → 422 mensagem global.

- [ ] **Step 1: testes:** escopo por perfil (partner vê só os seus; hunter idem; partner_member 403; finance tudo); `PUT config` só admin/manager e validações; mudar config não altera lançamento existente; `a-pagar` agrupa e traz PIX/documento; CSV tem cabeçalho e uma linha por beneficiário; `pagar` por ids e por beneficiário (só pendentes), `partner` → 403; calibração gera Z% para empresa, não gera para venda do hunter, limite de 2 por série, 422 sem ganho confirmado.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** arquivo + `test_parcerias*.py` + suíte inteira (comparar com as falhas pré-existentes). **Step 5:** commit `feat(parcerias): consulta, a pagar, pagamento e calibracao das comissoes`.

---

### Task 4: Front — comissões, configuração e calibrações

**Files:**
- Create: `frontend/src/pages/parcerias/Comissoes.tsx`, `frontend/src/pages/parcerias/ConfigComissoes.tsx`, `frontend/src/components/parcerias/CalibracoesDaOportunidade.tsx`
- Modify: `frontend/src/services/parceriasService.ts`, `frontend/src/router.tsx`, `frontend/src/layouts/MainLayout.tsx`, `frontend/src/pages/parcerias/OportunidadeDetalhe.tsx`, `frontend/src/constants/parcerias.ts`

**Comportamento:**
- `parceriasService`: funções e tipos para todas as rotas da Task 3 (CSV baixado como arquivo).
- `/parcerias/comissoes` (`Comissoes.tsx`):
  - `partner` e `hunter`: "Minhas comissões" — cartões Pendente / Pago (resumo), tabela (data, oportunidade, empresa que vendeu, tipo, base, % ou bônus, valor, situação), filtro por situação e período.
  - admin, manager, finance: abas **A pagar** (um bloco por beneficiário com nome, CPF/CNPJ, PIX com botão copiar, total, lançamentos expansíveis; botões "Marcar pago" por beneficiário com `useConfirm` "Marcar R$ X como pago para {nome}?" e por lançamento; "Exportar CSV"; filtro de período) e **Todos os lançamentos** (tabela com filtros situação/beneficiário/período).
  - `partner_member`: sem acesso (rota guardada; menu oculto).
- `/parcerias/comissoes/config` (`ConfigComissoes.tsx`, admin/manager; finance só lê): Y% venda própria, X% indicação, bônus de primeira venda (R$), prazo de indicação (meses), Z% calibração, com o aviso "Mudanças valem para as próximas vendas confirmadas; lançamentos já gerados não mudam."
- `CalibracoesDaOportunidade` em `OportunidadeDetalhe` (quando ganho confirmado): lista de calibrações; admin/manager/finance lançam (nº de série, data, valor) e veem a mensagem do backend no limite.
- Menu: "Comissões" para partner, hunter, admin, manager, finance; "Config. comissões" para admin/manager (dentro de Comissões, como link/aba).
- Tipos com rótulos: `venda_propria` → "Venda própria", `indicacao` → "Indicação", `bonus_primeira_venda` → "Bônus 1ª venda", `calibracao` → "Calibração"; situações pendente/paga/cancelada com cores (amarelo/verde/cinza).

- [ ] **Step 1:** implementar. **Step 2:** `npx tsc --noEmit -p . && npm run build` → ok. **Step 3:** commit `feat(front): comissoes, configuracao e calibracoes`.

---

### Task 5: Versão 1.11.19 e verificação final

- [ ] **Step 1:** versão **1.11.19** nos 3 lugares; CHANGELOG com Adicionado (comissões: venda própria, indicação com prazo, bônus de 1ª venda, calibração manual; tela Comissões; A pagar com exportação; configuração dos percentuais), "### Banco" (migration `9d0e1f2a3b4c`, aditiva, pode ir antes do código) e "### Configuração" (preencher os percentuais em Parcerias → Comissões → Configuração; enquanto zerados, nada é gerado; prazo padrão 24 meses).
- [ ] **Step 2:** suíte inteira do backend (comparar com as falhas pré-existentes), `tsc` + build, `venv/bin/alembic heads` → `9d0e1f2a3b4c (head)`.
- [ ] **Step 3:** commit `chore(release): v1.11.19`.
