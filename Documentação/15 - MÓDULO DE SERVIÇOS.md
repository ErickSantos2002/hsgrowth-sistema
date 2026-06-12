# 15 - MÓDULO DE SERVIÇOS

> **Documento vivo.** Atualizar a cada nova implementação no módulo de serviços.
> Última atualização: **12/06/2026**

---

## 1. INTRODUÇÃO

O **Módulo de Serviços** é um board do tipo Kanban espelhado no board de Vendas, porém adaptado ao processo de **serviços/calibração** da empresa. Ele reaproveita a maior parte da experiência de Vendas (layout, atividades, anotações, ligações, ganho/perdido) com algumas diferenças importantes:

- Usa **Valor da Calibração** como precificação (em vez do preço de venda do produto).
- Adota um **modelo colaborativo**: o card não tem um único "responsável". Qualquer colaborador pode agir sobre qualquer card, e o sistema registra automaticamente **quem fez o quê** (via `user_id` de cada atividade).
- Possui **Dashboard próprio** de serviços, acessível por um 3º botão no toggle do Dashboard (SDR / Vendedor / **Serviço**).

---

## 2. MODELO DE DADOS

Tabelas próprias do módulo (não compartilham com Vendas):

| Tabela | Arquivo do model | Descrição |
|---|---|---|
| `service_boards` | `backend/app/models/service_board.py` | Boards de serviço (suporta soft delete via `is_deleted`). |
| `service_lists` | `backend/app/models/service_list.py` | Listas/etapas do board. Flags `is_done_stage` (Ganho) e `is_lost_stage` (Perdido). |
| `service_cards` | `backend/app/models/service_card.py` | Cards de serviço. Sem campo `is_won/is_lost` — o estado é **derivado da lista atual**. |
| `service_card_products` | `backend/app/models/service_card_product.py` | Produtos do card, incluindo **`calibration_price`** (valor da calibração). |
| `service_card_activities` | `backend/app/models/service_card_activity.py` | **Tabela unificada** de log do card (atividades, anotações, arquivos e alterações). |

### 2.1. `service_card_activities` (log unificado)

Centraliza todo o histórico do card num só lugar, diferenciado pelo campo `category`:

- `category`: `atividade` | `anotacao` | `arquivo` | `alteracao`
- `user_id`: quem executou (FK `SET NULL`; `null` = ação do sistema) → **base do modelo colaborativo**
- `activity_type`: tipo da atividade/evento (`call`, `task`, `follow_up`, `email`, `whatsapp`, `meeting`, `linkedin`, `other`, e eventos `card_won`, `card_lost`, `stage_change`)
- `title`, `description`, `activity_metadata` (JSON), `priority`, `due_date`, `is_completed`, `completed_at`
- Campos de arquivo: `file_name`, `file_path`, `file_size`, `mime_type`

### 2.2. Calibração

`calibration_price` é um campo **separado** do preço de venda do produto. Cadastrado na página de Produtos e usado como valor de referência no card de serviço (serviços precificam por calibração, não por preço de venda).

### 2.3. Migrations relacionadas

- `2026_06_09_0200`, `2026_06_09_0300`, `2026_06_09_0400`, `2026_06_10_0100`
- Aplicação manual via `alembic upgrade heads` no console do Easypanel.
- **Dashboard e modelo colaborativo NÃO exigem migration** (usam tabelas já existentes) — só deploy de backend.

---

## 3. ARQUITETURA

### 3.1. Backend

| Camada | Arquivo |
|---|---|
| Service (board/cards/atividades) | `backend/app/services/service_board_service.py` |
| Service (dashboard) | `backend/app/services/service_dashboard_service.py` |
| Endpoints (board) | `backend/app/api/v1/endpoints/service_boards.py` (prefix `/service-boards`) |
| Endpoints (dashboard) | `backend/app/api/v1/endpoints/service_dashboard.py` (prefix `/service-dashboard`) |
| Schemas | `backend/app/schemas/service_board.py`, `service_dashboard.py` |
| Repository | `backend/app/repositories/service_board_repository.py` |

### 3.2. Frontend

| Tela / Componente | Arquivo |
|---|---|
| Lista de boards | `frontend/src/pages/ServiceBoards.tsx` |
| Kanban do board | `frontend/src/pages/ServiceKanban.tsx` |
| Detalhe do card (página) | `frontend/src/pages/ServiceCardDetails.tsx` |
| Tab de Atividades | `frontend/src/components/service/ServiceActivityTab.tsx` |
| Seção de Anotações | `frontend/src/components/service/ServiceNotesSection.tsx` |
| Seção de Produtos | `frontend/src/components/service/ServiceProductSection.tsx` |
| Dashboard de serviços | `frontend/src/components/dashboard/ServiceDashboard.tsx` |
| Services (API client) | `serviceBoardService.ts`, `serviceActivityService.ts`, `serviceDashboardService.ts` |

---

## 4. BOARD / KANBAN (`ServiceKanban.tsx`)

- **Listas** com criação de nova lista, reordenação e contagem de **listas/cards** no cabeçalho do board (paridade aplicada também ao board de Vendas).
- **Barra de filtros** (padrão Vendas, via `SelectMenu`):
  - Apenas Abertos / Pós-Vendas (filtra por colaborador) / Qualquer valor / etiqueta / criação / fechamento
  - **Período personalizado** suportado
  - **Persistência em localStorage** por board (`service_kanban_filters_${boardId}`), só aplicada após `filtersReady`
- **Card do Kanban** redesenhado igual ao de Vendas, com:
  - **Tags**: `Parado 3d+`, `Atrasada`, `Hoje`, `Futura`
  - **Valor** do card (somatório dos produtos)
  - **Avatares dos colaboradores** (`CollaboratorStack`) — quem já agiu no card

---

## 5. DETALHE DO CARD (`ServiceCardDetails.tsx`)

Página de tela cheia (não modal), layout **30/70**:

### 5.1. Coluna esquerda (30%) — seções recolhidas por padrão

- **Resumo**
- **Cliente (Organização)** — reaproveitado do cadastro existente
- **Informação de Contato (Pessoa)**
- **Produto** — paridade completa com Vendas: desconto por item, desconto global, condições de pagamento, total. Usa **Valor da Calibração**.
- **Automações**
- **Cadência**

### 5.2. Coluna direita (70%) — abas

- **Atividade** (ver seção 6)
- **Anotações** (ver seção 7)
- **Calendário**, **Arquivos**, **Ligações** (ver seção 9), **Reuniões**, **E-mail** *(em evolução)*

### 5.3. Cabeçalho

- **Título editável** por clique (sem ícone de lápis, mesmo padrão de Vendas).
- **Pipeline stepper** mostrando a posição do card entre as listas (substitui o dropdown "na lista"; sem efeito de crescimento no hover).
- **Botões de ação** (ver seção 8).

---

## 6. ATIVIDADES (`ServiceActivityTab.tsx`)

- **Adicionar Atividade** com tipos (ligação, tarefa, follow-up, e-mail, WhatsApp, reunião, LinkedIn, outro).
- **Foco**: atividades pendentes (recolhidas por padrão, expansão controlada, botões de confirmação específicos por tipo, formulário de edição completo).
- **Histórico** com sub-abas: **Todos / Atividades / Anotações / Arquivos / Alterações**.
  - O histórico só aparece dentro da aba de Atividades (igual Vendas).
  - **Agrupamento de ciclo de vida** da atividade (criada → editada → concluída): mostra o registro mais recente com "X registros anteriores" recolhidos.
  - Ícones de evento: `card_won` → CheckCircle verde, `card_lost` → XCircle vermelho.

---

## 7. ANOTAÇÕES (`ServiceNotesSection.tsx`)

- Editor rich-text reaproveitando `NoteRenderer`, com **colar imagens**.
- **Sanitização anti-XSS** via `frontend/src/utils/sanitizeNote.ts` usando **DOMParser + allowlist** (`ALLOWED_TAGS` + verificação de `src` `data:image`), substituindo o sanitizador por regex (que era contornável).

---

## 8. GANHO / PERDIDO / REABRIR / CLONAR

Estado derivado da **lista atual** do card (serviços não tem `is_won/is_lost` no card):

- **Card ativo** → botões **Clonar / Ganho / Perdido**.
- **Card Ganho** (lista `is_done_stage` ou nome "ganho") → badge **"Negócio Ganho"** + **Clonar**.
- **Card Perdido** (lista `is_lost_stage` ou nome "perdido") → badge **"Negócio Perdido"** + **Reabrir Negócio**.

### 8.1. Perdido

- Abre `LossReasonModal` (padrão Vendas) com **motivo da perda obrigatório**.
- Se a lista "Negócio Perdido" não existir, é **criada automaticamente** (`is_lost_stage = true`).
- O motivo é registrado como anotação (`Motivo da perda: X`) e fica no histórico.
- **Não existe botão Deletar** — os usuários só podem marcar como Perdido.

### 8.2. Reabrir Negócio

- Move o **próprio card** de volta para a **primeira etapa ativa** do board (menor `position` que não seja Ganho/Perdido), com confirmação.
- Preserva todo o histórico/atividades no mesmo card.
- ⚠️ **Diferença vs Vendas**: em Vendas o "Reabrir" cria um **clone novo** e mantém o original perdido. No serviços reabrimos o mesmo card (modelo colaborativo). *(Comportamento ainda em validação com o usuário.)*

### 8.3. Clonar

- Cria uma cópia na **mesma lista** com o título prefixado por **`[CLONE]`** (mesma "tag" de identificação do board de Vendas).

---

## 9. MODELO COLABORATIVO

- O card **não tem dono único**. Qualquer colaborador pode agir sobre qualquer card e fechar negócio.
- A atribuição é **automática** via `user_id` de cada registro em `service_card_activities`.
- **Avatares dos colaboradores** aparecem no card do Kanban (quem já agiu nele).
- Eventos explícitos logados no `move_card`:
  - `card_won` quando entra em etapa de Ganho
  - `card_lost` quando entra em etapa de Perdido
  - `stage_change` nas demais mudanças de etapa
- **Segurança (IDOR)**: operações de atividade validam escopo board/card (`get_card_in_board`, `_get_activity_scoped`).

---

## 10. INTEGRAÇÃO DE LIGAÇÕES (API4COM)

- Ligações funcionam dentro do card de serviço (integração **API4COM**, mesma de Vendas).
- Botões de confirmação por tipo de atividade; **botão de ligação rápida** no cabeçalho.
- **Pendente**: configuração de **ramal** por usuário.

---

## 11. DASHBOARD DE SERVIÇOS

- Acessível por um **3º botão no toggle** do Dashboard: **SDR / Vendedor / Serviço**.
- Componente: `ServiceDashboard.tsx`; service: `serviceDashboardService.ts`; backend: `service_dashboard_service.py` + endpoint `/api/v1/service-dashboard`.
- Agrega **todos os boards de serviço** não deletados.

### 11.1. KPIs

Negócios ativos · Pipeline (em aberto) · Ganhos no período · Perdidos no período · Atividades no período · Parados 3d+ · Taxa de ganho · Ticket médio.

### 11.2. Gráficos / blocos

- **Funil de serviços** (snapshot por etapa)
- **Atividades por tipo**
- **Ranking de colaboradores** (atividades, ganhos, perdidos)
- **Motivos de perda** (extraídos das anotações `Motivo da perda: X` no período)

### 11.3. Snapshot vs Período (importante)

- O **Funil** é um **snapshot atual** — conta onde os cards estão **agora** em cada etapa.
- Os KPIs **Ganhos/Perdidos no período** contam os cards que estão na etapa final **E foram marcados dentro do período** (pela `updated_at`). Essa abordagem funciona mesmo para cards marcados **antes** de o registro de evento existir (corrige a divergência "Funil mostra 1 perdido / KPI mostra 0").
- O **ranking** de ganhos/perdidos por colaborador usa os **eventos** `card_won`/`card_lost` (precisa do `user_id`); perdas antigas sem evento não têm dono atribuído, o que se normaliza a partir das próximas marcações.

### 11.4. Parsing de datas

- O endpoint aceita datas ISO com `Z` ou offset e converte para **naive UTC** (`_parse_dt`), compatível com `datetime.utcnow()` e com os valores do banco. O frontend envia datas UTC sem `Z` e sem milissegundos.

---

## 12. PRINCIPAIS DIFERENÇAS VS BOARD DE VENDAS

| Aspecto | Vendas | Serviços |
|---|---|---|
| Precificação | Preço de venda do produto | **Valor da Calibração** |
| Responsável | Responsável único (assigned_to) | **Modelo colaborativo** (sem dono único) |
| Deletar card | Disponível | **Não** (só Perdido) |
| Reabrir | Cria clone novo | Reabre o **mesmo** card |
| Dashboard | SDR / Vendedor | **3º toggle: Serviço** |
| Log do card | Tabelas separadas | **Tabela unificada** `service_card_activities` |

---

## 13. PENDÊNCIAS / PRÓXIMOS PASSOS

- [ ] Decidir destino final do **Reabrir** (primeira etapa / etapa anterior à perda / etapa fixa).
- [ ] Configuração de **ramal** por usuário (ligações).
- [ ] Evolução da coluna direita: Calendário, Reuniões, E-mail.
- [ ] Possíveis melhorias na dash: evolução temporal, exportação, filtro por colaborador, campo próprio para motivo de perda.
- [ ] **Deploy de backend** pendente para: correção do KPI Ganhos/Perdidos no período e `_parse_dt`.

---

## 14. HISTÓRICO DE IMPLEMENTAÇÃO

- **09–10/06/2026** — Estrutura do board, listas, filtros, card do Kanban com tags/colaboradores, detalhe 30/70, produtos + calibração, atividades (foco/histórico), anotações, ganho/perdido + motivo, clonar, modelo colaborativo, integração de ligações.
- **11/06/2026** — Dashboard de serviços (KPIs, funil, atividades por tipo, ranking, motivos de perda) com 3º toggle.
- **12/06/2026** — Correção do KPI Ganhos/Perdidos no período (snapshot+período); `_parse_dt` (datas com `Z`); tag `[CLONE]` no clone; estado "Negócio Perdido" + botão "Reabrir Negócio" no card.
