# Tempo real — mover card em tempo real (SSE + Redis) — Design

> **Data:** 2026-07-27
> **Escopo:** quando um usuário move um card entre listas (ou reordena dentro da
> lista), todos os outros usuários com **a mesma board aberta** veem a mudança em
> ~instantes, **sem F5 e sem polling**. Vale para os boards de **Vendas** e de
> **Serviço**.
> **Origem:** adaptação do mecanismo SSE do TaskHS ao stack do HSGrowth.

---

## 1. Objetivo e escopo

**Faz:** propaga em tempo real o **movimento de card** — mudança de `list_id`
e/ou `position` — para todos os clientes com aquela board aberta.

**Não faz (fora de escopo, continua exigindo F5):** criar/editar/excluir card,
qualquer mudança em listas, etiquetas, etc. O desenho é **extensível** — dá para
adicionar esses eventos depois **sem reescrever** a infraestrutura (só novos tipos
de evento + pontos de publish).

**Boards cobertos:** Vendas (`/boards/:id`) e Serviço (`/servicos/:id`).

---

## 2. Decisões de arquitetura (e o porquê)

### 2.1. SSE, não WebSocket
O fluxo é **só servidor → cliente** (o cliente muda por REST normal). SSE é HTTP
puro, reconecta fácil e tem `EventSource` nativo no navegador. WebSocket só
compensaria se o cliente precisasse empurrar dados pelo mesmo canal — não é o caso.

### 2.2. Redis pub/sub como ponte (não fila em memória)
O guia original assume DB **async** e usa uma `asyncio.Queue` em memória (1
processo). **O HSGrowth é SYNC** (`SessionLocal`, `create_engine`). Num backend
sync, o commit pode rodar numa thread do threadpool do FastAPI; enfileirar dali
numa `asyncio.Queue` de outro loop **não é thread-safe**.

Já temos **Redis async** rodando (`app/core/redis_client.py`, `redis.asyncio`).
Usar **Redis pub/sub** como ponte:
- **Publish** é feito com um cliente **redis-py SYNC** (`import redis`) —
  thread-safe, chamável de qualquer contexto (sync ou async).
- **Subscribe** é feito por um **consumer async** (um por processo), que faz
  fan-out para os assinantes SSE locais.
- **Bônus:** funciona com 1 **ou** N réplicas (hoje o prod roda `uvicorn` sem
  `--workers` = 1 processo; se um dia escalar, não muda nada).

### 2.3. Publish direcionado, não hook global de commit
Como o escopo é **só mover**, não usamos os listeners globais do SQLAlchemy
(`before_flush`/`after_flush`/`after_commit` + dedup + "filho re-serializa pai").
Em vez disso, **cada endpoint de mover** chama `publish_card_moved(...)` **após o
commit**. Mais simples, menos superfície de bug, e suficiente para o escopo.

### 2.4. Evento leve, sem tocar no banco no consumer
O evento carrega `{scope, board_id, card_id, list_id, position}`. Quem observa
**já tem o card** na tela (board carregada) — só reposiciona. O consumer **não faz
query** — só faz parse e fan-out. (Se o escopo crescer para criar/editar, aí sim
entra serialização numa sessão curta; hoje não precisa.)

---

## 3. Componentes

### 3.1. Backend

#### `app/core/realtime.py` — hub por processo + publish
- `_subscribers: dict[str, set[asyncio.Queue]]` — chave = `channel_key` (namespace
  + board), valor = filas dos clientes SSE conectados **naquele processo**.
- `subscribe(channel_key) -> asyncio.Queue` / `unsubscribe(channel_key, q)`.
- `_fanout(channel_key, event: dict)` — `put_nowait` em cada fila (itera sobre
  `list(...)` porque `unsubscribe` pode mexer no set).
- `publish_card_moved(scope, board_id, card_id, list_id, position)` — monta o
  payload e faz **PUBLISH sync** no canal Redis único `REALTIME_CHANNEL`
  (ex.: `"hsgrowth:realtime"`). Cliente redis-py sync dedicado (lazy singleton),
  usando a mesma `REDIS_URL` das outras conexões.
- `channel_key(scope, board_id) -> str` — `f"{scope}:{board_id}"` com
  `scope ∈ {"sales","service"}` (IDs de Vendas e Serviço não colidem).

#### `consumer` (async, sobe no `lifespan`)
- Uma task por processo. `SUBSCRIBE` no `REALTIME_CHANNEL` via `redis.asyncio`.
- Para cada mensagem: parse do JSON → `_fanout(channel_key, event)`.
- **Nunca morre por erro de um evento** (try/except loga e continua) — se o
  consumer morre, o tempo real para em silêncio para todo mundo.
- Sobe junto do scheduler no `lifespan` de `app/main.py`; é cancelada no shutdown.
  Desabilitada em ambiente de teste (como o scheduler já é).

#### Ticket JWT (em `app/core/security.py` ou `realtime.py`)
- `create_stream_ticket(subject, scope, board_id) -> str` — JWT curto (60s), claim
  `scope_type="stream"`, `board_scope`, `board_id`, assinado com `JWT_SECRET`
  (espelha `create_access_token`).
- `decode_stream_ticket(token) -> dict | None` — valida assinatura + `scope_type`;
  recusa token de sessão normal.

#### Endpoints SSE (2, respeitando as rotas atuais)
- **Vendas** (router de boards):
  - `POST /boards/{board_id}/stream-ticket` — autenticado normal (acesso à board);
    devolve `{ticket}`.
  - `GET /boards/{board_id}/stream?ticket=...` — valida ticket + acesso; abre o
    stream com `channel_key("sales", board_id)`.
- **Serviço** (router de service-boards): idem com `channel_key("service", board_id)`.
- Ambos usam as **mesmas checagens de acesso** dos endpoints de get-board já
  existentes. Handshake (auth) numa **sessão curta que fecha**; o gerador SSE fica
  aberto por horas e **não toca no banco** (senão esgota o pool).
- Gerador: `yield ": connected\n\n"`, loop com `asyncio.wait_for(q.get(), 20)`;
  no timeout, `yield ": ping\n\n"` (keep-alive); `finally: unsubscribe`.
- Resposta: `StreamingResponse(media_type="text/event-stream")` com headers
  `Cache-Control: no-cache` e `X-Accel-Buffering: no`.

#### Publish nos endpoints de mover (2 linhas de call)
- **Vendas** `PUT /cards/{card_id}/move` (`async`): após o serviço mover+commitar,
  derivar `board_id` da lista do card movido e chamar
  `realtime.publish_card_moved("sales", board_id, card.id, card.list_id, card.position)`.
- **Serviço** `PUT /service-boards/{board_id}/cards/{card_id}/move` (`async`):
  `board_id` já vem no path; chamar
  `realtime.publish_card_moved("service", board_id, card.id, card.list_id, card.position)`.
- Em ambos, `list_id` e `position` vêm do **card já atualizado** (estado final pós
  commit), não do request (`move_data.position` pode ser `None`).
- **Sempre após o commit** (na volta da chamada do serviço, que já commitou). Se o
  serviço levantar exceção, o publish não é alcançado.

### 3.2. Frontend

#### `hooks/useBoardStream.ts`
`useBoardStream(scope, boardId, onEvent, onOpen)`:
- Reconexão **manual** (não a nativa do `EventSource`): a cada tentativa pega um
  **ticket novo** via `POST .../stream-ticket` e abre
  `EventSource(.../stream?ticket=...)`. O auto-reconnect nativo reusaria a mesma
  URL com o **ticket vencido** (60s) → 401 eterno.
- `onopen` → reseta backoff e chama `onOpen()` (dispara o resync).
- `onmessage` → `onEvent(JSON.parse(data))`.
- `onerror` → fecha, agenda reconexão com **backoff exponencial** (1s→10s).
- Cleanup no unmount: fecha o ES e cancela timers.

#### Aplicar o evento (nas duas páginas de board)
- **Vendas** (`pages/KanbanBoard.tsx`): estado `cards: Card[]` (lista plana). Ao
  receber `{type:"card_moved", card_id, list_id, position}`: atualiza aquele card
  (`list_id`+`position`) no array. **Idempotente** — o próprio autor recebe o eco
  e nada muda visualmente.
- **Serviço** (`pages/ServiceKanban.tsx`): mesmo tratamento no seu estado de cards.
- **Resync no `onOpen`**: re-fetch dos cards da board (Vendas: `loadCardsOnly`;
  Serviço: o load equivalente). Baseline à prova de eventos perdidos enquanto
  offline. Regra de ouro: **o fetch é a verdade no connect; os eventos são deltas.**

---

## 4. Fluxo de dados (mover 1 card)

1. Usuário A arrasta o card → front A faz update otimista local → `PUT .../move`.
2. Endpoint move: serviço move + **commita**.
3. Após o commit, o endpoint chama `publish_card_moved(...)` → **PUBLISH sync** no
   Redis.
4. O consumer de **cada processo** recebe via `SUBSCRIBE`, faz `_fanout` para as
   filas SSE locais daquele `channel_key`.
5. Cada `EventSource` (usuários B..N, e o próprio A) recebe
   `{card_id, list_id, position}` → reposiciona o card no estado → re-render.

---

## 5. Tratamento de erros / bordas

- **Publish após commit** — nunca antes (rollback mandaria mudança inexistente).
- **Consumer nunca morre** por evento ruim (try/except + log).
- **`unsubscribe` no `finally`** — não vaza fila fantasma a cada refresh.
- **Ping 20s + `X-Accel-Buffering: no`** — proxies não seguram/derrubam o stream.
- **Ticket na URL, não header** — `EventSource` não manda `Authorization`. Ticket
  efêmero de escopo próprio; nunca o JWT de sessão na URL.
- **Resync no (re)connect** — cobre qualquer evento perdido offline.
- **Aplicar idempotente** — receber o próprio eco ou um evento repetido não quebra.
- **Card já apagado** — no escopo "só mover" o evento não depende do card existir
  no servidor (é só reposição no cliente); se o card não está no estado local, o
  próximo resync corrige.
- **Redis indisponível** — publish falha em silêncio (log); o app segue funcionando
  normal, só sem tempo real até o Redis voltar. O REST nunca quebra por causa disso.

---

## 6. Segurança

- Stream só abre com **ticket válido** (assinatura + `scope_type=stream` +
  `board_id` conferido) **e** com a mesma checagem de acesso à board dos endpoints
  normais. Viewer/sem acesso não recebe stream.
- Ticket expira em 60s e serve só para abrir o stream.

---

## 7. Testes

**Unitários (pytest):**
- `create_stream_ticket`/`decode_stream_ticket`: round-trip ok; recusa token de
  sessão normal; recusa expirado; recusa board_id divergente.
- Fan-out: `subscribe` cria fila; `publish`/consumer entrega o evento na fila;
  `unsubscribe` remove; board sem ninguém não vaza.

**Manual (2 navegadores):**
- Dois usuários, mesma board. Um move um card → o outro vê mover em ~1s.
- Reordenar dentro da mesma lista → reflete no outro.
- Puxar/religar a rede → reconecta e resync corrige o estado.
- Boards de Vendas e de Serviço, cada um no seu.

---

## 8. Escopo de arquivos (resumo)

**Backend (novos):** `app/core/realtime.py`.
**Backend (editar):** `app/main.py` (subir consumer no lifespan);
`app/core/security.py` (ticket, se não ficar no realtime);
`app/api/v1/endpoints/cards.py` (publish no move + endpoints stream Vendas);
`app/api/v1/endpoints/service_boards.py` (publish no move + endpoints stream Serviço).
**Frontend (novos):** `src/hooks/useBoardStream.ts`.
**Frontend (editar):** `src/pages/KanbanBoard.tsx` e `src/pages/ServiceKanban.tsx`
(ligar o hook, aplicar evento, resync no onOpen); serviço de API para o
stream-ticket.

---

## 9. Deploy

- Sem migration (nada de banco).
- Precisa do Redis (já presente no stack).
- Sobe com o deploy normal do backend + frontend. Se um dia rodar com N réplicas,
  já funciona sem mudança (Redis pub/sub alcança todos os processos).
