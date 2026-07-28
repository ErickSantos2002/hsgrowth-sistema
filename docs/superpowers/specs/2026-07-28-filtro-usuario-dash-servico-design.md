# Filtro de usuário na Dashboard de Serviço — Design

> **Data:** 2026-07-28
> **Escopo:** adicionar um filtro por **usuário** nas dashboards de **Serviço** (board 1) e **Cobrança** (board 2). Ao escolher um usuário, os widgets passam a refletir o trabalho daquele usuário; o **Ranking de colaboradores** continua mostrando **todos**.

---

## 1. Modelo colaborativo (confirmado no código)

No board de Serviço **não há dono do negócio**. Um usuário é **colaborador** de um card quando registra **qualquer atividade** nele (`ServiceCardActivity.user_id`). Como toda ação gera atividade (criar card, vincular cliente/pessoa, add/remover produto/serviço, ganho/perdido, tarefa), **qualquer usuário que mexe no negócio vira colaborador dele**. É a mesma base dos chips de colaborador (`service_board_service.py`, `collab_map`) e do "Ranking de colaboradores" da dash.

---

## 2. Dois escopos do filtro

Ao filtrar por um usuário **U**:

- **Escopo COLABORADOR** — cards onde U tem ≥1 atividade (`collab_ids`). Usado no que é "o que ele está trabalhando".
- **Escopo ATRIBUIÇÃO** — cards onde **U registrou** o `card_won` / `card_lost` no período (`won_by_u` / `lost_by_u`). Usado nos resultados fechados.
- **Escopo ATIVIDADES DE U** — atividades cujo `user_id == U`. Usado nas métricas de atividade.
- **Ranking de colaboradores** — **NUNCA filtra** (sempre todos).

*(Decisões do usuário: lista do filtro = só quem já agiu no board; ganhos/perdidos = só os que o próprio U marcou.)*

---

## 3. Comportamento por widget (com `user_id = U`)

| Campo da resposta | Sem filtro (hoje) | Com filtro por U |
|---|---|---|
| `active_count`, `pipeline_value`, `stuck_count` | todos os ativos | ativos **∩ collab_ids** |
| `cards_by_stage` (Funil) | todos os cards por etapa | cards **∩ collab_ids** por etapa |
| `modality`, `service_type` (composição) | ativos | ativos **∩ collab_ids** |
| `won_count`, `won_value`, `avg_ticket`, `win_rate` | por período (heurística updated_at) | cards de **won_by_u** (U registrou o ganho no período) |
| `lost_count` | por período | cards de **lost_by_u** |
| `recalibrations` (buckets vencido/30/50/90) | aparelhos dos ativos | aparelhos dos ativos **∩ collab_ids** |
| `loss_reasons` (Motivos de perda) | anotações no período | anotações dos cards **lost_by_u** |
| `activities_count`, `activities_by_type` | atividades no período | atividades no período **com user_id == U** |
| `evolution` (6 meses) | ganho/perdido/atividade por mês | ganho/perdido = **U registrou**; atividades = **U fez** |
| `collaborators` (Ranking) | todos | **todos (inalterado)** |

**Definições (query):**
- `collab_ids` = `SELECT DISTINCT service_card_id FROM service_card_activities WHERE service_card_id IN (card_ids) AND user_id = U`.
- `won_by_u` = card_ids distintos de `won_events` (activity_type `card_won`, no período) com `user_id == U`. Idem `lost_by_u` para `card_lost`.
- Atividades de U = filtrar `act_rows` (as atividades já buscadas no período) por `user_id == U`.

**Win-rate filtrado** = `won_by_u / (won_by_u + lost_by_u) * 100` (0 se nenhum).

---

## 4. Backend

### 4.1. `service_dashboard_service.get_dashboard(start, end, boards=None, user_id=None)`
Novo parâmetro opcional `user_id`. Quando `None`, comportamento idêntico ao atual (nada muda). Quando setado, aplica os escopos da seção 3. A implementação computa `collab_ids`, `won_by_u`, `lost_by_u` uma vez e restringe cada agregação conforme a tabela. O bloco do **Ranking** (`collaborators`) permanece calculado sobre **todos** (não usa `user_id`).

### 4.2. Endpoint da dash — `GET /api/v1/service-dashboard`
Adiciona `user_id: Optional[int] = Query(None)`; repassa para `get_dashboard(...)`.

### 4.3. Novo endpoint — lista de colaboradores do board
`GET /api/v1/service-dashboard/collaborators?board={1|2}` → `[{ "id": int, "name": str }]` dos usuários que têm ≥1 atividade em algum card daquele board (distinct, ordenado por nome). O router `service-dashboard` **já tem** `dependencies=[Depends(require_service_access())]` global (ver `app/api/v1/__init__.py`), então o novo endpoint herda o gate automaticamente (é GET autenticado por sessão — sem a limitação de EventSource). Pode devolver uma lista de dicts direto (sem schema novo).

---

## 5. Frontend

### 5.1. `serviceDashboardService.get(start, end, board, userId?)`
Adiciona `userId?: number` aos params. Novo método `listCollaborators(board): Promise<{id:number;name:string}[]>` chamando o endpoint 4.3.

### 5.2. `components/dashboard/ServiceDashboard.tsx`
- Estado interno `userId: number | undefined` (padrão indefinido = "Todos").
- Ao montar/trocar de board: busca `listCollaborators(board)` para popular o dropdown.
- Um **SelectMenu "Usuário"** no topo (perto do título "Visão geral"), com "Todos" + a lista.
- Inclui `userId` nas deps do efeito de carregar a dash e passa para `serviceDashboardService.get(...)`.
- Vale para os dois boards (o componente já é reusado por Serviço e Cobrança via prop `board`).
- O card "Ranking de colaboradores" continua como está (o backend já devolve todos).

---

## 6. Bordas / erros
- **Usuário sem cards / sem resultados**: a dash mostra zeros normalmente (sem erro).
- **Trocar de board**: reseta o `userId` para "Todos" (a lista de colaboradores muda por board).
- **user_id inexistente ou de outro board**: não quebra — os escopos ficam vazios (zeros).
- **Ranking**: nunca é afetado pelo filtro (garantir que o cálculo ignora `user_id`).

---

## 7. Testes
**Unit (pytest, `test_service_dashboard`):**
- Cenário com 2 usuários e alguns cards: sem filtro → totais somam ambos; com `user_id=U` → pipeline/funil só dos cards que U colaborou; won/lost só dos que U marcou; activities_count só das atividades de U; **collaborators (ranking) idêntico** ao caso sem filtro.
- Endpoint `/collaborators` retorna só quem tem atividade no board.

**Manual:** abrir a dash de Serviço e de Cobrança, escolher um usuário, conferir que os números batem com o trabalho dele e o Ranking segue com todos.

---

## 8. Escopo de arquivos
**Backend (editar):** `app/services/service_dashboard_service.py` (get_dashboard + user_id), `app/api/v1/endpoints/service_dashboard.py` (param + endpoint collaborators). Possível `app/schemas/service_dashboard.py` (schema da opção de colaborador).
**Frontend (editar):** `services/serviceDashboardService.ts` (param + listCollaborators), `components/dashboard/ServiceDashboard.tsx` (SelectMenu + estado + fetch).

**Sem migration.** Sem mudança de modelo.
