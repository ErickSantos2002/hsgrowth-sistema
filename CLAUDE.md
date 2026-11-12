# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

HSGrowth CRM — sistema interno de vendas/serviços da Health & Safety. Backend FastAPI +
SQLAlchemy + PostgreSQL, frontend React 19 + Vite + Tailwind. **Single-tenant**: o
multi-tenancy foi removido em jan/2026 (`backend/REMOCAO_MULTI_TENANT.md`) — não existe
mais tabela `accounts` nem `account_id`. Controle de acesso é só por **role**.

Roles: `admin`, `manager`, `salesperson`, `sdr`, `service`, `viewer`.

## Comandos

### Backend (`backend/`)

Existe venv em `backend/venv`. Use o interpretador dele explicitamente — não confie no
`python` do PATH:

```bash
backend/venv/bin/python -m pytest                      # suíte inteira
backend/venv/bin/python -m pytest tests/unit/test_cards.py -k nome_do_teste
backend/venv/bin/python -m pytest -m unit              # markers: unit, integration, e2e, slow, auth, users, cards, gamification, automations, transfers
backend/venv/bin/alembic upgrade head
backend/venv/bin/alembic revision --autogenerate -m "descricao"
```

⚠️ **Testes são lentos.** Todo teste que usa a fixture `client` leva ~55s (o `TestClient`
sobe o app inteiro). Rodar a suíte completa custa muitos minutos — prefira arquivo/`-k`
específico e só rode tudo quando for fechar o trabalho.

Subir a API local (Redis em container + API com hot reload):

```bash
cd backend && docker-compose -f docker-compose.local.yml up -d   # precisa de .env.local
```

⚠️ **`docker-compose.local.yml` NÃO sobe Postgres — ele aponta para o banco REMOTO de
produção.** Qualquer script rodado com esse `.env` mexe em dados reais. Para scripts
destrutivos ou de correção em massa, usar `--dry` primeiro (vários em
`backend/scripts/imports/` já têm essa flag) e fazer backup (`scripts/backup_database.py`).

Lint/format do backend estão nas dependências (`black`, `ruff`, `flake8`, `mypy`) mas não
há config nem uso consistente no repo — não reformatar arquivos por conta própria.

### Frontend (`frontend/`)

```bash
npm run dev          # Vite em 127.0.0.1:5300 (não 5173)
npm run build
npm run lint         # eslint . --ext .ts,.tsx
npm run type-check   # tsc --noEmit
```

Não há testes no frontend. `VITE_API_URL` aponta para o backend (default
`http://localhost:8000`).

## Arquitetura

### Camadas do backend

`app/api/v1/endpoints/*.py` → `app/services/*_service.py` → `app/repositories/*_repository.py`
→ `app/models/*.py`, com Pydantic em `app/schemas/`.

Regra prática: **endpoint não fala com model direto**. Endpoint valida/autoriza e monta a
resposta; a regra de negócio mora no service; toda query fica no repository. Serviços
compõem outros repositories livremente (`CardService` usa 7 deles) e, quando precisam de
outro service, usam import tardio para evitar ciclo (ver `card_service.py` ↔
`automation_service.py`).

### Dois kanbans paralelos — não confundir

O sistema tem **duas pilhas de board independentes**, com models, services, repositories,
endpoints e páginas separados:

| | Vendas / Aquisição | Serviços / Cobrança |
|---|---|---|
| Models | `board.py`, `list.py`, `card.py` | `service_board.py`, `service_list.py`, `service_card.py` |
| Endpoints | `boards.py`, `cards.py` | `service_boards.py`, `services.py`, `service_dashboard.py` |
| Frontend | `KanbanBoard.tsx`, `CardDetails.tsx` | `ServiceKanban.tsx`, `ServiceCardDetails.tsx` |
| Scope no realtime | `"sales"` | `"service"` |

Ao mexer numa feature de board, verificar sempre se ela precisa existir dos dois lados.

### Autenticação e autorização

JWT Bearer (access 8h + refresh 7d com **rotation** — o frontend precisa salvar o novo
refresh a cada renovação, ver `frontend/src/services/api.ts`). Blacklist de tokens e
sessões ficam no Redis, de forma **graceful**: se o Redis cair, o login não bloqueia.

Dependencies de autorização em `app/api/deps.py`: `get_current_active_user`,
`require_role(...)`, `require_manager_or_admin()`, `require_service_access()`,
`require_not_viewer()`, `require_permission(...)`, `require_api_scope(...)`. Integrações
externas autenticam por **API key** (`IntegrationClient`, `hash_api_key`), não por JWT.

### Tempo real (SSE)

`app/core/realtime.py` — pub/sub no Redis + SSE. O publish é **síncrono** (chamável de
qualquer contexto, inclusive thread de worker); o subscribe é async, com um consumer por
processo. O frontend pega um ticket (`POST .../stream-ticket`) e abre o EventSource com
ele na querystring, porque `EventSource` não manda header `Authorization`.

### Jobs

Dois mecanismos coexistem:
- **APScheduler** (`app/workers/scheduler.py`), iniciado no lifespan do FastAPI — é o
  caminho padrão hoje.
- **Celery + Redis** (`app/workers/celery_app.py`), com serviços `celery-worker` e
  `celery-beat` no `docker-compose.yml` de produção.

Nada disso sobe quando `ENVIRONMENT=testing`. Para uma ação pontual pós-request, o padrão
recente é `BackgroundTasks` do FastAPI, não Celery (ver commit `fb12d61`).

### Integrações

- **GestorHS inbound** (`docs/integracao-gestorhs.md`): GestorHS cria cards aqui. O
  endpoint é **create-or-return, não upsert** — reenviar o mesmo `(source, external_id)`
  devolve o card existente e **não altera nada**. Depois de criado, o card é do vendedor.
- **GestorHS outbound** (`docs/integracao-growthhs-inbound.md`): ao marcar Ganho, o CRM
  avisa o GestorHS para mover a caixa de Pós-Vendas para Financeiro.
- Microsoft 365 (SSO + Graph + SMTP), API4COM (VOIP), OpenAI (Agent Growth / análise de
  transcrição).

## Armadilhas conhecidas

**Migration antes do deploy quebra a tela.** Migration **aditiva** (coluna nova, tabela
nova) pode ser aplicada antes de subir o código. Migration que **repointa FK ou remove
coluna** não — o código antigo em produção quebra na hora. Nesses casos, deploy do código
primeiro, migration depois.

**Os testes usam SQLite em memória** (`tests/conftest.py`), não Postgres. SQL específico
de Postgres (JSONB, `ILIKE`, funções de data) passa em produção e falha — ou passa
silenciosamente errado — no teste. Quando a lógica depender disso, testar o service com
mock em vez de ir ao banco.

**Os READMEs estão desatualizados.** `backend/README.md` ainda descreve multi-tenancy
(removido) e "78 testes"; `frontend/README.md` descreve uma árvore de `src/` de v2.0 que
não existe mais. Servem como contexto histórico, não como verdade. O `CHANGELOG.md` da
raiz, esse sim, é mantido.

**Alembic** pega a URL do `settings.DATABASE_URL` (não do `alembic.ini`) e nomeia arquivos
com `AAAA_MM_DD_HHMM-<rev>_<slug>.py`.

## Convenções

- Código, comentários, docstrings, UI e mensagens de erro em **português**.
- Commits: conventional commits com escopo, em português **sem acentos** —
  `feat(servico): filtro "Motivo de perda" nos boards`, `fix(fase2): ...`,
  `docs(agent-growth): ...`. Release: `chore(release): vX.Y.Z`.
- Mudança relevante entra no `CHANGELOG.md` da raiz (Keep a Changelog, datas dd/mm/aaaa).
- Features maiores têm plano e spec em `docs/superpowers/plans/` e `docs/superpowers/specs/`,
  nomeados `AAAA-MM-DD-assunto.md` — ler o par antes de mexer numa feature que tenha um.
- Deploy é via **Easypanel** (`backend/DEPLOY_GUIDE.md`), não CI/CD.
