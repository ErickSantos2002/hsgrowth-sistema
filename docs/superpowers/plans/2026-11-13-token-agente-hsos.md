# Token de agente do HS.OS (Guardi) — Vendas e Serviços — plano de 13/11/2026

Specs (no repo HS.OS, só leitura; a parte deste repo é a seção "Para o HSGrowth"):
- `~/github/HS.OS/docs/superpowers/specs/2026-11-12-guardi-hsgrowth-vendas-design.md`
- `~/github/HS.OS/docs/superpowers/specs/2026-11-12-guardi-hsgrowth-servicos-design.md`

Molde: GestorHS (`~/github/GestorHS/backend/app/core/agente.py`, `app/api/deps.py`,
`tests/test_token_agente.py`, fixtures `_par_ed25519`/`emitir_token_agente` em `tests/conftest.py`).

## Decisões técnicas

- **Allowlist por regex sobre o caminho real, não por `scope["route"].path`.** O venv tem
  FastAPI 0.139 (`_IncludedRouter`: `scope["route"].path` vem SEM o prefixo do router) e
  produção roda 0.109 (`requirements.txt`, path COM prefixo). Casar `request.url.path` (sem
  `/api/v1`) contra templates compilados, com todo parâmetro `{x}` = `\d+` (todos são ids;
  `/clients/cnpj/{cnpj}` também — o HS.OS manda dígitos). `\d+` impede que
  `/cards/{card_id}` case com rota literal (`/cards/import`). Barra final opcional.
- **"via <bot>" por ContextVar + `before_insert` do SQLAlchemy** em `Activity`, `AuditLog` e
  `ServiceCardActivity` (não há choke point para AuditLog: ~45 construções diretas). A
  ContextVar guarda `(user_id, bot)`; só marca linha cujo `user_id` é o do dono do token.
  Texto: acrescenta ` (via <bot>)` em `description` (vazia → `via <bot>`). O caminho
  normal de `get_current_user` zera a ContextVar.
- `get_current_user` é `async` → a ContextVar setada nele vale no endpoint (mesma task; o
  threadpool copia o contexto).
- Usuário do token: `User.email == sub` exato, `is_deleted == False`, `is_active` (senão
  401). Sem blacklist/sessão Redis, sem `password_changed_at`. **Não** vira `is_integracao`.
  `request.state.agente = bot` e `user.via_agente = bot` (atributo transitório).
- PyJWT já está nas dependências (2.8 em prod, suporta EdDSA com `cryptography`).

## Tarefas

### T1 — núcleo do token + allowlist + "via"
- `app/core/config.py`: `HSOS_AGENTE_CHAVE_PUBLICA: str = ""`; `.env.example` com comentário.
- `app/core/agente.py` (puro): `VIDA_MAXIMA_SEGUNDOS=600`, `TokenDeAgenteInvalido`,
  `eh_token_de_agente`, `validar_token_de_agente(token, pem) -> (email, bot)` (EdDSA,
  aud `hsgrowth`, iss `hsos`, require exp/sub/iss/aud, `\n` literal na PEM), `ROTAS_AGENTE`
  (set de `(método, template)` das duas specs), `agente_pode(método, caminho)`,
  ContextVar `agente_atual` + listeners `before_insert`.
- `app/api/deps.py`: `get_current_user` ganha `request: Request`; se `eh_token_de_agente`
  → caminho do agente (401 em token/usuário inválido, 403 "Ação não permitida para o
  agente" fora da allowlist, ANTES de qualquer outra coisa). Helpers `via_agente(user)`.
- Testes `tests/unit/test_token_agente.py`: núcleo puro (válido, PEM com `\n`, aud/iss/exp
  vencido/exp longo/sem act, chave errada/vazia, HS256 com iss hsos); pela API: entra como
  a pessoa com a função dela; aud errado, vencido, chave errada, sem chave configurada,
  e-mail inexistente/caixa diferente, usuário inativo/deletado → 401; rota fora → 403
  (inclusive GET, ex. `/users`, `/cards/1/attachments`, `PUT /cards/1/assign`,
  `DELETE /cards/1`); cada template da allowlist não dá 401/403 de allowlist; AuditLog e
  Activity criados por agente trazem "via erick-bot", e por login normal não.

### T2 — Vendas: escrita do agente só no card do dono (+4a)
Helper em `deps.py`: `exigir_card_do_dono_se_agente(db, user, card_id)` — no-op sem
agente; card inexistente → deixa o fluxo normal dar 404; dono = `assigned_to_id` ou
`sdr_id` == user.id (vale também para admin via agente) senão 403.
- Chamar em: `PUT /cards/{id}`, `PUT /cards/{id}/move`, `POST /cards/{id}/win`,
  `POST /cards/{id}/lose`, `POST /cards/{id}/fields`, `POST /cards/{id}/person`,
  `POST /card-notes` (card do corpo), `POST /card-tasks` (card do corpo),
  `PUT /card-tasks/{id}`, `PATCH /card-tasks/{id}/complete`, `PATCH /card-tasks/{id}/noshow`
  (card da tarefa).
- `PUT /cards/{id}` de agente: 403 se o corpo trouxer (`model_fields_set`) `assigned_to_id`,
  `sdr_id`, `is_won`, `is_lost` ou `loss_reason`.
- `POST /cards/{id}/fields` de agente: só com `field_definition_id` (sem `field_name`) → 403.
- `POST /cards` de agente: `assigned_to_id` só se == user.id; `sdr_id` presente → 403.
- `PUT /clients/{id}` e `PUT /persons/{id}` de agente: só se houver card aberto
  (`is_won` e `is_lost` falsos) do dono com `client_id`/`person_id` = id; senão 403.
- 4a (para todos): `ClientRepository` busca/contagem comparam o documento SEM pontuação
  (reusar `_doc_digits_sql` de `search_repository.py`).
- Testes: cada rota acima com card de outro vendedor → 403 e com card próprio → passa;
  PUT com `assigned_to_id` → 403; fields por nome → 403; POST /cards com outro dono → 403
  e com o próprio → 201; PUT client/person sem card aberto do dono → 403; busca de
  cliente "12.345.678/0001-90" achada por "12345678000190".

### T3 — Serviços
- S6 (todos): toda rota de card de `service_boards.py` que hoje usa `get_card` passa a
  conferir o quadro (`get_card_in_board`) → 404 de card de outro quadro.
- S4 (todos): PUT/DELETE de `…/products/{i}` e `…/services/{i}` conferem
  `item.service_card_id == card_id` → 404.
- S2 (agente): `PUT …/cards/{c}` → 403 com `list_id`, `position`, `is_deleted` ou
  `assigned_to_id` no corpo.
- S3: `external_source`/`external_id` em `ServiceCardResponse` e no GET do card.
- Sem regra de dono em Serviços (vale `require_service_access`, como na tela).
- Testes: agente `service` move com regra (rota responde); PUT com `list_id` → 403;
  DELETE do card → 403; clone → 403; item de outro card → 404; card de outro quadro → 404;
  GET traz `external_source`; atividade de agente traz "via".

### T4 — docs
- `CLAUDE.md`: Ganho avisa o GestorHS só no kanban de Serviços (card `gestorhs.os`).
- `CHANGELOG.md` em `[Não lançado]` (Adicionado / Corrigido / Segurança), sem migration.
- `docs/integracao-hsos-agente.md` curto: env, contrato, allowlist, onde mexer.

## Fora (só reportar ao Erick — item 8 da spec de Vendas)
Buracos para usuário humano: `PUT /cards/{id}/assign` sem conferir dono; nota/tarefa/
fields/person em card alheio; `PATCH /card-tasks/{id}/noshow` com
`Depends(require_not_viewer)` sem parênteses; exceção admin da nota comparando `Role` com
string (`card_note_service.py:141, 182`). Também: `PUT` de card de serviço com `list_id`
move sem regra para humano.

## Deploy
Não sobe sem o Erick: `main` tem Parcerias em `[Não lançado]` (só homo). Produção precisa
da env `HSOS_AGENTE_CHAVE_PUBLICA` no Easypanel. Sem migration.

Testes: `docker run -d --rm --name redis-testes-hsgrowth -p 127.0.0.1:6390:6379 redis:7-alpine`
e `cd backend && REDIS_HOST=127.0.0.1 REDIS_PORT=6390 venv/bin/python -m pytest <arquivo> -q`.
