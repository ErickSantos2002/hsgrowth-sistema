# Bolinha "concluído" pessoal nos cards — Design

**Data:** 01/10/2026
**Módulos:** Vendas (boards 6, 7, 8) e Serviços (boards 1 Serviço e 2 Cobrança)

## Problema
No Trello cada card tem uma bolinha para marcar "concluído". A equipe quer o mesmo no CRM, mas como
**organização pessoal**: cada usuário marca o que já fez da sua parte. Ex.: o SDR marca o card e vincula
um vendedor — para o SDR o card segue marcado; para o vendedor ele aparece em branco.

## Regras (decididas com o usuário)
| Tema | Decisão |
|---|---|
| Escopo | Cards de **todos** os boards: Vendas (6/7/8) e Serviços (1/2) |
| Visibilidade | **Por usuário** — cada um só vê a própria marcação |
| Mudou de lista no mesmo board | **Continua marcado** |
| Foi para outro board | **Desmarca** (para todos) |
| Ganho ou perdido | **Desmarca** (para todos) — inclui "Unificado" (perdido automático) |
| Reaberto (ganho reaberto pelo admin / saiu da lista Ganho/Perdido no Serviço) | **Desmarca** |
| Marcado já em Ganho/Perdido | Fica marcado **até a pessoa desmarcar** |
| Filtro | Opção **"Concluídos por mim"** no funil: Todos / Esconder concluídos / Só concluídos |

## Como a regra de "desmarcar" é garantida
A marcação guarda uma **foto do contexto** no momento do clique:
- `board_id` — board da lista em que o card estava;
- `situacao` — `aberto`, `ganho` ou `perdido`.

Ao carregar o board, a marcação **só vale** se o contexto atual do card for igual ao da foto. Se mudou
board ou situação, o card aparece em branco e a marcação velha é **apagada** nessa mesma leitura (limpeza
preguiçosa).

Por que assim e não "apagar em cada evento": há muitos caminhos que mexem no card (arrastar, botões de
ganho/perdido, automações que chamam `move_to_list` direto, no-show da reunião, PUT do card de Serviço
que aceita `list_id`, "Unificado", reabertura). Comparar o contexto cobre todos sem tocar em nenhum.

**Efeito aceito:** se o card sair e voltar exatamente ao mesmo contexto **antes** de alguém da marcação
abrir o board (ex.: ganho por engano reaberto em seguida), a marcação reaparece.

### Situação do card
- **Vendas (`Card`):** `is_won == 1` → `ganho`; `is_won == -1` → `perdido`; senão `aberto`.
- **Serviço (`ServiceCard`):** pela lista — `is_done_stage` ou nome contém "ganho" → `ganho`;
  `is_lost_stage` ou nome contém "perdido" → `perdido`; senão `aberto` (mesma detecção por flag **ou**
  nome já usada em `_is_closed_list`).

## Modelo de dados (1 migration)
Tabela nova `card_checks`:

| Coluna | Tipo | Observação |
|---|---|---|
| id | int PK | |
| user_id | int FK users (CASCADE) | quem marcou |
| card_id | int FK cards (CASCADE), nulo | card de Vendas |
| service_card_id | int FK service_cards (CASCADE), nulo | card de Serviço |
| board_id | int | foto do board no clique |
| situacao | varchar(10) | `aberto` / `ganho` / `perdido` |
| created_at | datetime | |

- Exatamente um de `card_id` / `service_card_id` preenchido (CHECK).
- Únicos: `(user_id, card_id)` e `(user_id, service_card_id)`.
- Migration com `down_revision = 'c7d8e9f0a1b2'`.

## Backend
- **Serviço novo** `card_check_service.py`:
  - `situacao_card(card)` / `situacao_service_card(card, lista)`;
  - `marcar(user, card)` (upsert com a foto atual) e `desmarcar(user, card)`;
  - `ids_marcados(user, cards)` — em lote: busca as marcações do usuário para os ids, compara com o
    contexto atual, devolve o conjunto válido e apaga as inválidas.
- **Endpoints:**
  - `PUT /api/v1/cards/{id}/check` e `DELETE /api/v1/cards/{id}/check`;
  - `PUT /api/v1/service-boards/{board_id}/cards/{card_id}/check` e `DELETE` idem.
  - Permissão: quem **pode ver** o card (mesmas regras de acesso da leitura; marcação é pessoal,
    então viewer também pode). Resposta: `{ "checked": bool }`.
- **Listagens** ganham `checked_by_me: bool` (default `false`):
  - Vendas: `CardMinimalResponse` no ramo `minimal` de `CardService.list_cards` (usado pelo board);
  - Serviço: `ServiceCardResponse` em `ServiceBoardService.list_cards`.
  - Outras respostas (get/move/update) não precisam: o front mantém o estado local.

## Frontend
- **Bolinha** à esquerda do título em `KanbanCard` (Vendas) e `KanbanServiceCard` (Serviço):
  - não marcado → círculo vazio **só ao passar o mouse**;
  - marcado → ✅ verde sempre visível;
  - clique marca/desmarca (otimista, desfaz se a API falhar), com `stopPropagation` para não abrir o card.
- **Filtro "Concluídos por mim"** (Todos / Esconder concluídos / Só concluídos) no funil dos dois boards:
  salvo junto com os demais filtros (localStorage), conta em `hasActiveFilters` / `filtersActive`,
  limpo por "Limpar filtros".
- Sem tempo real: a marcação é pessoal.

## Testes
- Marcar/desmarcar (Vendas e Serviço); idempotência.
- Usuário B não vê a marcação do usuário A.
- Desmarca ao: trocar de board; ganho; perdido; reabrir ganho; card de Serviço ir para lista Ganho/Perdido.
- Continua ao mudar de lista no mesmo board.
- Marcado já em Ganho continua marcado.
- Marcação inválida é apagada na leitura.

## Fora do escopo
- Tempo real entre abas/usuários.
- Bolinha no modal do card, na busca geral ou em relatórios.
