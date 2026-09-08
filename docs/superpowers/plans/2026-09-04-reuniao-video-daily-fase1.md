# Reunião por vídeo (Daily) — Fase 1 — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development ou superpowers:executing-plans. Passos com checkbox (`- [ ]`).

**Goal:** O vendedor cria uma **"Reunião por vídeo (no CRM)"** a partir do card, entra na sala embutida no sistema, e o cliente entra por um **link público** — sem instalar nada e sem login. O convite continua saindo pelo Outlook, como hoje.

**Architecture:** Daily.co como provedor de vídeo (sala + tokens), `meeting_provider` distinguindo o novo fluxo do Teams no mesmo `CardTask`. O evento no Outlook é criado reusando `create_calendar_event()`, que já monta convidados e dispara o convite — é ele que bloqueia o horário na agenda do vendedor, mantendo o fluxo do SDR intacto. Duas páginas React novas: a sala (autenticada) e o lobby público do convidado.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic (backend), React + TypeScript (frontend), `@daily-co/daily-js` (Daily Prebuilt), pytest.

**Spec:** `docs/superpowers/specs/2026-09-01-reuniao-video-daily-design.md` — as decisões valendo estão na **seção 15**.

**Fora do escopo desta fase:** gravação, transcrição, IA ao vivo, webhooks, log de participantes (Fase 3 e 5).

---

## ⚠️ Contexto crítico — leia antes de começar

**Não existe ambiente de homologação. O container local aponta para o banco de PRODUÇÃO** (`62.72.11.28:3388`). Consequências obrigatórias:

1. A funcionalidade nasce atrás de **trava por usuário** (Task 1) — ninguém além do admin homologador vê o botão.
2. Testes só em **card de teste** criado para isso, nunca em card de cliente.
3. O contato de teste usa **e-mail interno**.
4. Enquanto `DAILY_DEV_MODE=true`, o backend **bloqueia convites para e-mails externos** (Task 7). Isso impede que um cliente real receba convite de teste.
5. Testes automatizados **nunca** chamam a API real do Daily — sempre mock.

**Convenções do projeto:**
- Testes: `docker exec -w /app hsgrowth-api-local python -m pytest ...`; a pasta `tests/` não é montada → `docker cp backend/tests/. hsgrowth-api-local:/app/tests/` antes.
- Git Bash: `export MSYS_NO_PATHCONV=1` antes dos `docker exec`.
- **Reiniciar o container após editar backend** (`docker restart hsgrowth-api-local`).
- Typecheck: `cd frontend && npx tsc --noEmit`.
- **Perguntar antes de commitar.** Nunca commitar sozinho.

---

## Task 1: Configuração e trava por usuário

Antes de qualquer coisa visível, garantir que ninguém além do homologador enxergue a funcionalidade.

**Files:**
- Modify: `backend/app/core/config.py`
- Create: `backend/app/api/v1/endpoints/features.py`
- Modify: `backend/app/api/v1/__init__.py`
- Test: `backend/tests/unit/test_features_flag.py`

- [ ] **Step 1: Adicionar as configurações**

Em `backend/app/core/config.py`, junto de `OPENAI_API_KEY` (~L102):

```python
    # ── Daily.co (reunião por vídeo dentro do CRM) ──────────────────────────
    DAILY_API_KEY: str = ""  # Chave da API do Daily (definir no .env / EasyPanel)
    DAILY_API_URL: str = "https://api.daily.co/v1"
    # IDs de usuário liberados para o fluxo Daily enquanto não homologado.
    # Vazio = liberado para todos. Ex.: "18" ou "18,10"
    DAILY_ENABLED_USER_IDS: str = ""
    # Em modo dev, convites só saem para e-mails do domínio interno.
    DAILY_DEV_MODE: bool = True
    DAILY_INTERNAL_EMAIL_DOMAIN: str = "healthsafetytech.com"
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `backend/tests/unit/test_features_flag.py`:

```python
"""
Trava por usuário do fluxo de reunião por vídeo (Daily).
Enquanto não homologado, só os IDs em DAILY_ENABLED_USER_IDS enxergam.
"""
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings


class TestFeatureFlagDaily:

    def test_usuario_fora_da_lista_nao_ve(self, client: TestClient, salesperson_headers, monkeypatch):
        """Usuário fora da lista recebe daily_meeting=False."""
        monkeypatch.setattr(settings, "DAILY_ENABLED_USER_IDS", "99999")

        response = client.get("/api/v1/features", headers=salesperson_headers)

        assert response.status_code == 200
        assert response.json()["daily_meeting"] is False

    def test_usuario_da_lista_ve(self, client: TestClient, salesperson_headers, test_salesperson_user, monkeypatch):
        """Usuário listado recebe daily_meeting=True."""
        monkeypatch.setattr(settings, "DAILY_ENABLED_USER_IDS", str(test_salesperson_user.id))

        response = client.get("/api/v1/features", headers=salesperson_headers)

        assert response.status_code == 200
        assert response.json()["daily_meeting"] is True

    def test_lista_vazia_libera_todos(self, client: TestClient, salesperson_headers, monkeypatch):
        """Lista vazia = funcionalidade liberada para todos (pós-homologação)."""
        monkeypatch.setattr(settings, "DAILY_ENABLED_USER_IDS", "")

        response = client.get("/api/v1/features", headers=salesperson_headers)

        assert response.status_code == 200
        assert response.json()["daily_meeting"] is True
```

- [ ] **Step 3: Rodar e confirmar que falha**

```bash
export MSYS_NO_PATHCONV=1
docker cp backend/tests/. hsgrowth-api-local:/app/tests/
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_features_flag.py -q
```

Esperado: **FAIL** com 404 (rota não existe).

- [ ] **Step 4: Criar o endpoint**

Criar `backend/app/api/v1/endpoints/features.py`:

```python
"""
Flags de funcionalidade por usuário.

Permite subir funcionalidade nova para produção visível apenas para quem
homologa, já que não existe ambiente de homologação separado.
"""
from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.models.user import User

router = APIRouter()


def _daily_enabled_for(user: User) -> bool:
    """
    True se o usuário pode usar a reunião por vídeo (Daily).

    DAILY_ENABLED_USER_IDS vazio = liberado para todos (estado pós-homologação).
    Com IDs, só eles enxergam.
    """
    raw = (settings.DAILY_ENABLED_USER_IDS or "").strip()
    if not raw:
        return True

    allowed = {p.strip() for p in raw.split(",") if p.strip()}
    return str(user.id) in allowed


@router.get(
    "",
    summary="Flags de funcionalidade do usuário logado",
    description="Retorna quais funcionalidades em homologação estão visíveis para este usuário.",
)
async def get_features(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return {
        "daily_meeting": _daily_enabled_for(current_user),
    }
```

- [ ] **Step 5: Registrar a rota**

Em `backend/app/api/v1/__init__.py`, adicionar `features` na linha de import dos endpoints e, junto dos demais `include_router`:

```python
api_router.include_router(features.router, prefix="/features", tags=["Features"])
```

- [ ] **Step 6: Rodar e confirmar que passa**

```bash
export MSYS_NO_PATHCONV=1
docker restart hsgrowth-api-local && sleep 6
docker cp backend/tests/. hsgrowth-api-local:/app/tests/
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_features_flag.py -q
```

Esperado: **PASS** nos 3 testes.

- [ ] **Step 7: Commit** (perguntar antes)

```bash
git add backend/app/core/config.py backend/app/api/v1/endpoints/features.py backend/app/api/v1/__init__.py backend/tests/unit/test_features_flag.py
git commit -m "feat(features): flag por usuario para a reuniao por video"
```

---

## Task 2: Migration — campos da reunião no CardTask

**Files:**
- Create: `backend/alembic/versions/2026_09_04_1000-c1d2e3f4a5b6_card_task_daily_meeting.py`
- Modify: `backend/app/models/card_task.py`
- Modify: `backend/app/schemas/card_task.py`

- [ ] **Step 1: Criar a migration**

Criar `backend/alembic/versions/2026_09_04_1000-c1d2e3f4a5b6_card_task_daily_meeting.py`:

```python
"""card_tasks: campos da reuniao por video (Daily)

Aditiva — todas as colunas nullable, nenhuma linha existente é alterada.
As reuniões Teams atuais continuam funcionando sem mudança (meeting_provider
fica nulo nelas e o código trata nulo como "teams").

Revision ID: c1d2e3f4a5b6
Revises: b2c3d4e5f6a7
Create Date: 2026-09-04 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'c1d2e3f4a5b6'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('card_tasks', sa.Column('meeting_provider', sa.String(20), nullable=True,
                  comment='teams | daily | null (null = teams, por compatibilidade)'))
    op.add_column('card_tasks', sa.Column('daily_room_name', sa.String(255), nullable=True,
                  comment='Nome unico da sala no Daily'))
    op.add_column('card_tasks', sa.Column('daily_room_url', sa.String(1000), nullable=True,
                  comment='URL da sala no Daily'))
    op.add_column('card_tasks', sa.Column('public_access_token', sa.String(64), nullable=True,
                  comment='Token opaco do link publico do convidado'))
    op.add_column('card_tasks', sa.Column('meeting_started_at', sa.DateTime(), nullable=True,
                  comment='Quando o host entrou na sala'))
    op.add_column('card_tasks', sa.Column('contact_joined_at', sa.DateTime(), nullable=True,
                  comment='Quando o convidado entrou na sala'))
    op.add_column('card_tasks', sa.Column('meeting_ended_at', sa.DateTime(), nullable=True,
                  comment='Quando a sala encerrou'))

    op.create_index('ix_card_tasks_public_access_token', 'card_tasks',
                    ['public_access_token'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_card_tasks_public_access_token', table_name='card_tasks')
    for col in ('meeting_ended_at', 'contact_joined_at', 'meeting_started_at',
                'public_access_token', 'daily_room_url', 'daily_room_name',
                'meeting_provider'):
        op.drop_column('card_tasks', col)
```

- [ ] **Step 2: Adicionar os campos no modelo**

Em `backend/app/models/card_task.py`, junto de `teams_meeting_id` (~L92):

```python
    # ── Reunião por vídeo dentro do CRM (Daily) ─────────────────────────────
    meeting_provider = Column(String(20), nullable=True, comment="teams | daily | null (null = teams)")
    daily_room_name = Column(String(255), nullable=True, comment="Nome único da sala no Daily")
    daily_room_url = Column(String(1000), nullable=True, comment="URL da sala no Daily")
    public_access_token = Column(String(64), nullable=True, index=True, unique=True,
                                 comment="Token opaco do link público do convidado")
    meeting_started_at = Column(DateTime, nullable=True, comment="Quando o host entrou")
    contact_joined_at = Column(DateTime, nullable=True, comment="Quando o convidado entrou")
    meeting_ended_at = Column(DateTime, nullable=True, comment="Quando a sala encerrou")
```

Conferir que `String` e `DateTime` já estão importados no topo do arquivo; se não, acrescentar ao import de `sqlalchemy`.

- [ ] **Step 3: Expor no schema de resposta**

Em `backend/app/schemas/card_task.py`, na classe de resposta da task (a que já traz `teams_meeting_id`), acrescentar:

```python
    meeting_provider: Optional[str] = Field(None, description="teams | daily")
    daily_room_url: Optional[str] = Field(None, description="URL da sala no Daily")
    public_access_token: Optional[str] = Field(None, description="Token do link público do convidado")
    meeting_started_at: Optional[datetime] = Field(None, description="Quando o host entrou")
    contact_joined_at: Optional[datetime] = Field(None, description="Quando o convidado entrou")
    meeting_ended_at: Optional[datetime] = Field(None, description="Quando a sala encerrou")
```

- [ ] **Step 4: Aplicar a migration**

```bash
export MSYS_NO_PATHCONV=1
docker exec -w /app hsgrowth-api-local alembic upgrade head
```

Esperado: `Running upgrade b2c3d4e5f6a7 -> c1d2e3f4a5b6`.

> ⚠️ Isso roda no banco de **produção**. É aditivo (só adiciona colunas nullable) e não altera nenhuma linha, mas **confirmar com o responsável antes de executar**.

- [ ] **Step 5: Conferir que as colunas existem e nada quebrou**

```bash
docker exec hsgrowth-api-local python -c "
from app.db.session import SessionLocal
from sqlalchemy import text
db=SessionLocal()
cols=[r[0] for r in db.execute(text(\"select column_name from information_schema.columns where table_name='card_tasks' and column_name like '%daily%' or table_name='card_tasks' and column_name in ('meeting_provider','public_access_token','meeting_started_at','contact_joined_at','meeting_ended_at')\")).fetchall()]
print('colunas novas:', sorted(cols))
print('tasks existentes intactas:', db.execute(text('select count(*) from card_tasks')).scalar())
"
```

Esperado: as 7 colunas listadas e a contagem de tasks igual à de antes.

- [ ] **Step 6: Rodar a suíte de tarefas para garantir que nada regrediu**

```bash
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_cards.py -q
```

Esperado: mesmo resultado do baseline (as 6 falhas pré-existentes de `test_cards.py` continuam; nenhuma nova).

- [ ] **Step 7: Commit** (perguntar antes)

```bash
git add backend/alembic/versions/2026_09_04_1000-c1d2e3f4a5b6_card_task_daily_meeting.py backend/app/models/card_task.py backend/app/schemas/card_task.py
git commit -m "feat(db): campos da reuniao por video no card_task"
```

---

## Task 3: Serviço do Daily

**Files:**
- Create: `backend/app/services/daily_service.py`
- Test: `backend/tests/unit/test_daily_service.py`

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_daily_service.py`:

```python
"""
Serviço do Daily.co — criação de sala e tokens.
A API do Daily é sempre mockada; nenhum teste faz chamada real.
"""
import pytest
from unittest.mock import patch, MagicMock

from app.services.daily_service import DailyService


class _Resp:
    """Resposta HTTP falsa no formato que o httpx devolve."""
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = str(payload)

    def json(self):
        return self._payload


class TestCriacaoDeSala:

    def test_cria_sala_com_nome_previsivel(self, db, test_lists, test_salesperson_user):
        """A sala recebe nome derivado do id da task, e a URL volta do Daily."""
        from app.models.card_task import CardTask
        task = CardTask(card_id=1, title="Reunião teste", task_type="meeting",
                        assigned_to_id=test_salesperson_user.id)
        db.add(task)
        db.commit()
        db.refresh(task)

        svc = DailyService(db)
        fake = _Resp(200, {"name": f"hsg-{task.id}", "url": f"https://x.daily.co/hsg-{task.id}"})

        with patch("httpx.Client.post", return_value=fake) as mock_post:
            result = svc.create_room(task)

        assert result["name"] == f"hsg-{task.id}"
        assert result["url"].startswith("https://")
        assert task.daily_room_name == f"hsg-{task.id}"
        assert task.meeting_provider == "daily"
        # token público gerado, opaco e longo o bastante
        assert task.public_access_token and len(task.public_access_token) >= 32
        mock_post.assert_called_once()

    def test_erro_do_daily_vira_excecao_clara(self, db, test_lists, test_salesperson_user):
        """Falha na API do Daily não passa silenciosa."""
        from app.models.card_task import CardTask
        task = CardTask(card_id=1, title="Reunião teste 2", task_type="meeting",
                        assigned_to_id=test_salesperson_user.id)
        db.add(task)
        db.commit()
        db.refresh(task)

        svc = DailyService(db)
        with patch("httpx.Client.post", return_value=_Resp(500, {"error": "boom"})):
            with pytest.raises(ValueError, match="Daily"):
                svc.create_room(task)


class TestTokens:

    def test_token_de_host_marca_owner(self, db, test_salesperson_user):
        """O token do vendedor é de dono da sala (pode liberar quem está esperando)."""
        from app.models.card_task import CardTask
        task = CardTask(card_id=1, title="R", task_type="meeting",
                        daily_room_name="hsg-1", meeting_provider="daily")
        db.add(task)
        db.commit()

        svc = DailyService(db)
        with patch("httpx.Client.post", return_value=_Resp(200, {"token": "tok-host"})) as m:
            token = svc.create_host_token(task, test_salesperson_user)

        assert token == "tok-host"
        enviado = m.call_args.kwargs["json"]["properties"]
        assert enviado["is_owner"] is True

    def test_token_de_convidado_nao_e_owner(self, db):
        """O convidado nunca recebe token de dono."""
        from app.models.card_task import CardTask
        task = CardTask(card_id=1, title="R", task_type="meeting",
                        daily_room_name="hsg-1", meeting_provider="daily")
        db.add(task)
        db.commit()

        svc = DailyService(db)
        with patch("httpx.Client.post", return_value=_Resp(200, {"token": "tok-guest"})) as m:
            token = svc.create_guest_token(task, "Cliente Teste")

        assert token == "tok-guest"
        enviado = m.call_args.kwargs["json"]["properties"]
        assert enviado["is_owner"] is False
        assert enviado["user_name"] == "Cliente Teste"
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
export MSYS_NO_PATHCONV=1
docker cp backend/tests/. hsgrowth-api-local:/app/tests/
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_service.py -q
```

Esperado: **FAIL** — `ModuleNotFoundError: app.services.daily_service`.

- [ ] **Step 3: Escrever o serviço**

Criar `backend/app/services/daily_service.py`:

```python
"""
Integração com o Daily.co — reunião por vídeo dentro do CRM.

Cuida da sala e dos tokens. Regras de negócio e permissão ficam nos endpoints.
A chave da API nunca sai daqui: nenhum token do Daily é devolvido ao frontend
sem passar por validação de acesso.
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.card_task import CardTask
from app.models.user import User

# Margem de validade da sala além do horário previsto. Cobre reunião que
# atrasa ou estende, e garante que a sala não fica aberta indefinidamente.
ROOM_EXPIRY_MARGIN_HOURS = 4


class DailyService:
    def __init__(self, db: Session):
        self.db = db

    # ── infraestrutura ──────────────────────────────────────────────────────

    def _headers(self) -> dict:
        if not settings.DAILY_API_KEY:
            raise ValueError(
                "DAILY_API_KEY não configurada — reunião por vídeo indisponível."
            )
        return {"Authorization": f"Bearer {settings.DAILY_API_KEY}"}

    def _post(self, path: str, payload: dict) -> dict:
        url = f"{settings.DAILY_API_URL}{path}"
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(url, headers=self._headers(), json=payload)
        except httpx.HTTPError as e:
            raise ValueError(f"Não foi possível falar com o Daily: {e}") from e

        if resp.status_code >= 400:
            raise ValueError(f"Daily retornou erro {resp.status_code}: {resp.text}")

        return resp.json()

    def _room_expiry(self, task: CardTask) -> int:
        """Timestamp unix de expiração da sala (fim previsto + margem)."""
        base = task.due_date or datetime.utcnow()
        if base.tzinfo is None:
            base = base.replace(tzinfo=timezone.utc)
        duracao = timedelta(minutes=task.duration_minutes or 60)
        fim = base + duracao + timedelta(hours=ROOM_EXPIRY_MARGIN_HOURS)
        return int(fim.timestamp())

    # ── sala ────────────────────────────────────────────────────────────────

    def create_room(self, task: CardTask) -> dict:
        """
        Cria a sala no Daily e guarda os dados na task.
        Também gera o token opaco do link público do convidado.
        """
        room_name = f"hsg-{task.id}"

        payload = {
            "name": room_name,
            "privacy": "private",
            "properties": {
                "enable_knocking": True,      # sala de espera: o host libera
                "enable_chat": True,
                "enable_screenshare": True,
                "lang": "pt",
                "exp": self._room_expiry(task),
                "eject_at_room_exp": True,    # não deixa sala aberta para sempre
            },
        }

        data = self._post("/rooms", payload)

        task.daily_room_name = data.get("name", room_name)
        task.daily_room_url = data.get("url", "")
        task.meeting_provider = "daily"
        if not task.public_access_token:
            task.public_access_token = secrets.token_urlsafe(32)

        self.db.commit()
        self.db.refresh(task)

        return {"name": task.daily_room_name, "url": task.daily_room_url}

    def delete_room(self, task: CardTask) -> None:
        """Apaga a sala no Daily. Falha aqui não impede o cancelamento local."""
        if not task.daily_room_name:
            return
        url = f"{settings.DAILY_API_URL}/rooms/{task.daily_room_name}"
        try:
            with httpx.Client(timeout=15.0) as client:
                client.delete(url, headers=self._headers())
        except Exception as e:
            print(f"[DAILY] Aviso: falha ao apagar sala {task.daily_room_name}: {e}")

    # ── tokens ──────────────────────────────────────────────────────────────

    def _create_token(self, task: CardTask, user_name: str, is_owner: bool) -> str:
        payload = {
            "properties": {
                "room_name": task.daily_room_name,
                "user_name": user_name,
                "is_owner": is_owner,
                "exp": self._room_expiry(task),
            }
        }
        data = self._post("/meeting-tokens", payload)
        token = data.get("token")
        if not token:
            raise ValueError("Daily não devolveu token de acesso.")
        return token

    def create_host_token(self, task: CardTask, user: User) -> str:
        """Token do vendedor/SDR — dono da sala, libera quem está esperando."""
        return self._create_token(task, user.name or "Anfitrião", is_owner=True)

    def create_guest_token(self, task: CardTask, guest_name: str) -> str:
        """Token do convidado — nunca dono."""
        return self._create_token(task, guest_name or "Convidado", is_owner=False)
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
export MSYS_NO_PATHCONV=1
docker restart hsgrowth-api-local && sleep 6
docker cp backend/tests/. hsgrowth-api-local:/app/tests/
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_service.py -q
```

Esperado: **PASS** nos 4 testes.

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add backend/app/services/daily_service.py backend/tests/unit/test_daily_service.py
git commit -m "feat(daily): servico de sala e tokens do Daily.co"
```

---

## Task 4: Endpoints autenticados

**Files:**
- Modify: `backend/app/api/v1/endpoints/card_tasks.py` (junto do bloco Teams, ~L899)
- Test: `backend/tests/unit/test_daily_endpoints.py`

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_daily_endpoints.py`:

```python
"""
Endpoints autenticados da reunião por vídeo (Daily).
A API do Daily é mockada em todos os testes.
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card_task import CardTask


@pytest.fixture
def task_reuniao(db: Session, test_card, test_salesperson_user) -> CardTask:
    task = CardTask(
        card_id=test_card.id,
        title="Reunião com cliente",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        duration_minutes=60,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


class TestCriarSala:

    def test_cria_sala_e_devolve_link_publico(
        self, client: TestClient, salesperson_headers, task_reuniao
    ):
        """Criar a sala devolve a URL da sala e o link público do convidado."""
        fake = {"name": f"hsg-{task_reuniao.id}", "url": "https://x.daily.co/hsg-1"}
        with patch("app.services.daily_service.DailyService.create_room", return_value=fake):
            response = client.post(
                f"/api/v1/card-tasks/{task_reuniao.id}/daily-room",
                headers=salesperson_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["room_url"]
        assert "/entrar/" in data["public_link"]

    def test_exige_autenticacao(self, client: TestClient, task_reuniao):
        """Sem token, não cria sala."""
        response = client.post(f"/api/v1/card-tasks/{task_reuniao.id}/daily-room")
        assert response.status_code in (401, 403)


class TestTokenDeHost:

    def test_devolve_token_para_quem_tem_acesso(
        self, client: TestClient, salesperson_headers, task_reuniao, db
    ):
        """Vendedor da task recebe token de host."""
        task_reuniao.daily_room_name = "hsg-1"
        task_reuniao.daily_room_url = "https://x.daily.co/hsg-1"
        task_reuniao.meeting_provider = "daily"
        db.commit()

        with patch("app.services.daily_service.DailyService.create_host_token", return_value="tok-host"):
            response = client.post(
                f"/api/v1/card-tasks/{task_reuniao.id}/daily-host-token",
                headers=salesperson_headers,
            )

        assert response.status_code == 200
        assert response.json()["token"] == "tok-host"
        assert response.json()["room_url"]

    def test_sala_inexistente_da_erro_claro(
        self, client: TestClient, salesperson_headers, task_reuniao
    ):
        """Pedir token de uma task sem sala criada devolve 400, não 500."""
        response = client.post(
            f"/api/v1/card-tasks/{task_reuniao.id}/daily-host-token",
            headers=salesperson_headers,
        )
        assert response.status_code == 400
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
export MSYS_NO_PATHCONV=1
docker cp backend/tests/. hsgrowth-api-local:/app/tests/
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_endpoints.py -q
```

Esperado: **FAIL** com 404 nas rotas.

- [ ] **Step 3: Criar os endpoints**

Em `backend/app/api/v1/endpoints/card_tasks.py`, após o bloco de endpoints do Teams:

```python
# ==================== REUNIÃO POR VÍDEO (DAILY) ====================

@router.post(
    "/{task_id}/daily-room",
    summary="Criar sala de reunião por vídeo (Daily)",
    description="""
    Cria a sala no Daily para esta tarefa e gera o link público do convidado.

    O link público permite que o cliente entre sem login e sem instalar nada.
    Não cria evento no calendário — isso é feito pelo endpoint de agendamento.
    """,
)
async def create_daily_room(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.services.daily_service import DailyService

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    service = DailyService(db)
    try:
        room = service.create_room(task)
    except ValueError as e:
        # Daily fora do ar ou sem chave: mensagem que sugere a alternativa
        raise HTTPException(
            status_code=503,
            detail=f"Não foi possível criar a reunião por vídeo. {e} "
                   f"Você pode criar a reunião pelo Teams enquanto isso.",
        )

    return {
        "room_url": room["url"],
        "public_link": f"{settings.FRONTEND_URL}/entrar/{task.public_access_token}",
        "public_access_token": task.public_access_token,
    }


@router.post(
    "/{task_id}/daily-host-token",
    summary="Token de anfitrião para entrar na sala",
    description="Devolve o token que permite ao vendedor/SDR entrar como dono da sala.",
)
async def create_daily_host_token(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.services.daily_service import DailyService

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    if not task.daily_room_name:
        raise HTTPException(
            status_code=400,
            detail="Esta reunião ainda não tem sala criada.",
        )

    service = DailyService(db)
    try:
        token = service.create_host_token(task, current_user)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Marca o início da reunião na primeira entrada do anfitrião
    if not task.meeting_started_at:
        task.meeting_started_at = datetime.utcnow()
        db.commit()

    return {"token": token, "room_url": task.daily_room_url}


@router.delete(
    "/{task_id}/daily-room",
    summary="Cancelar a sala de reunião por vídeo",
)
async def delete_daily_room(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.services.daily_service import DailyService

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    DailyService(db).delete_room(task)

    task.daily_room_name = None
    task.daily_room_url = None
    task.public_access_token = None
    task.meeting_provider = None
    db.commit()

    return {"message": "Sala cancelada"}
```

Conferir os imports no topo do arquivo: `settings` (`from app.core.config import settings`) e `datetime`. Adicionar se faltar.

> ⚠️ **`FRONTEND_URL` já existe em `config.py`, mas o padrão é `http://localhost:5300`.** Se não for definida no EasyPanel, **o link público sai quebrado para o cliente** (apontando para localhost). Configurar em produção é obrigatório — está na Task 10.

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
export MSYS_NO_PATHCONV=1
docker restart hsgrowth-api-local && sleep 6
docker cp backend/tests/. hsgrowth-api-local:/app/tests/
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_endpoints.py -q
```

Esperado: **PASS** nos 4 testes.

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add backend/app/api/v1/endpoints/card_tasks.py backend/app/core/config.py backend/tests/unit/test_daily_endpoints.py
git commit -m "feat(daily): endpoints de sala e token de anfitriao"
```

---

## Task 5: Endpoints públicos do convidado

Rotas **sem autenticação** — a superfície mais exposta do sistema. Nada de segredo no retorno.

**Files:**
- Create: `backend/app/api/v1/endpoints/public_meeting.py`
- Modify: `backend/app/api/v1/__init__.py`
- Test: `backend/tests/unit/test_public_meeting.py`

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_public_meeting.py`:

```python
"""
Endpoints públicos do convidado (sem JWT).
Regra de ouro: nunca devolver API key, token de host ou dado interno.
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card_task import CardTask


@pytest.fixture
def task_com_sala(db: Session, test_card, test_salesperson_user) -> CardTask:
    task = CardTask(
        card_id=test_card.id,
        title="Reunião pública",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        duration_minutes=60,
        meeting_provider="daily",
        daily_room_name="hsg-teste",
        daily_room_url="https://x.daily.co/hsg-teste",
        public_access_token="token-publico-de-teste-1234567890",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


class TestInfoPublica:

    def test_devolve_dados_seguros(self, client: TestClient, task_com_sala):
        """Sem login, o convidado vê o básico da reunião."""
        response = client.get(f"/api/v1/public/meeting/{task_com_sala.public_access_token}")

        assert response.status_code == 200
        data = response.json()
        assert data["title"]
        assert "already_started" in data

    def test_nao_vaza_segredo(self, client: TestClient, task_com_sala):
        """A resposta pública não pode conter token, chave ou URL da sala."""
        response = client.get(f"/api/v1/public/meeting/{task_com_sala.public_access_token}")
        corpo = response.text.lower()

        assert "daily_room_url" not in corpo
        assert "api_key" not in corpo
        assert "token" not in corpo.replace("public_access_token", "")

    def test_token_invalido_da_404(self, client: TestClient):
        """Token inexistente não revela se existe ou não outra reunião."""
        response = client.get("/api/v1/public/meeting/token-que-nao-existe")
        assert response.status_code == 404


class TestEntrada:

    def test_entrar_devolve_token_de_convidado(self, client: TestClient, task_com_sala):
        """Com nome, empresa e e-mail, o convidado recebe acesso à sala."""
        with patch("app.services.daily_service.DailyService.create_guest_token", return_value="tok-guest"):
            response = client.post(
                f"/api/v1/public/meeting/{task_com_sala.public_access_token}/join",
                json={"name": "Fulano", "company": "ACME", "email": "fulano@acme.com"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["token"] == "tok-guest"
        assert data["room_url"] == task_com_sala.daily_room_url

    def test_marca_horario_de_entrada(self, client: TestClient, task_com_sala, db):
        """A entrada do convidado fica registrada."""
        with patch("app.services.daily_service.DailyService.create_guest_token", return_value="tok"):
            client.post(
                f"/api/v1/public/meeting/{task_com_sala.public_access_token}/join",
                json={"name": "Fulano", "company": "ACME", "email": "fulano@acme.com"},
            )

        db.refresh(task_com_sala)
        assert task_com_sala.contact_joined_at is not None

    def test_nome_obrigatorio(self, client: TestClient, task_com_sala):
        """Sem nome, não entra."""
        response = client.post(
            f"/api/v1/public/meeting/{task_com_sala.public_access_token}/join",
            json={"name": "", "company": "ACME", "email": "fulano@acme.com"},
        )
        assert response.status_code == 422

    def test_token_invalido_nao_entra(self, client: TestClient):
        """Token inválido não gera acesso."""
        response = client.post(
            "/api/v1/public/meeting/nao-existe/join",
            json={"name": "Fulano", "company": "ACME", "email": "f@acme.com"},
        )
        assert response.status_code == 404
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
export MSYS_NO_PATHCONV=1
docker cp backend/tests/. hsgrowth-api-local:/app/tests/
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_public_meeting.py -q
```

Esperado: **FAIL** com 404.

- [ ] **Step 3: Criar os endpoints públicos**

Criar `backend/app/api/v1/endpoints/public_meeting.py`:

```python
"""
Endpoints públicos da reunião por vídeo — usados pelo convidado (cliente),
sem autenticação.

Regras de segurança:
- o token do link é opaco e aleatório (secrets.token_urlsafe);
- a resposta pública nunca inclui API key, token de host ou a URL da sala;
- a URL da sala só é devolvida após o convidado se identificar.
"""
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.card_task import CardTask

router = APIRouter()


class GuestJoinRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Nome de quem está entrando")
    company: str | None = Field(None, max_length=200, description="Empresa")
    email: str | None = Field(None, max_length=255, description="E-mail de contato")


def _get_task_or_404(db: Session, token: str) -> CardTask:
    task = (
        db.query(CardTask)
        .filter(CardTask.public_access_token == token, CardTask.meeting_provider == "daily")
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Reunião não encontrada ou link expirado.")
    return task


@router.get(
    "/meeting/{public_token}",
    summary="[Público] Informações da reunião",
    description="Dados mínimos para a tela de entrada do convidado. Não requer login.",
)
async def get_public_meeting(public_token: str, db: Session = Depends(get_db)) -> Any:
    task = _get_task_or_404(db, public_token)

    return {
        "title": task.title,
        "scheduled_at": task.due_date.isoformat() if task.due_date else None,
        "duration_minutes": task.duration_minutes,
        "already_started": task.meeting_started_at is not None,
        "already_ended": task.meeting_ended_at is not None,
    }


@router.post(
    "/meeting/{public_token}/join",
    summary="[Público] Entrar na reunião",
    description="Valida o link, registra a entrada do convidado e devolve o acesso à sala.",
)
async def join_public_meeting(
    public_token: str,
    payload: GuestJoinRequest,
    db: Session = Depends(get_db),
) -> Any:
    from app.services.daily_service import DailyService

    task = _get_task_or_404(db, public_token)

    if task.meeting_ended_at:
        raise HTTPException(status_code=410, detail="Esta reunião já foi encerrada.")

    service = DailyService(db)
    try:
        token = service.create_guest_token(task, payload.name.strip())
    except ValueError as e:
        raise HTTPException(status_code=503, detail=f"Não foi possível entrar na reunião. {e}")

    if not task.contact_joined_at:
        task.contact_joined_at = datetime.utcnow()
        db.commit()

    return {"token": token, "room_url": task.daily_room_url}
```

- [ ] **Step 4: Registrar a rota**

Em `backend/app/api/v1/__init__.py`, adicionar `public_meeting` ao import e:

```python
api_router.include_router(public_meeting.router, prefix="/public", tags=["Reunião pública"])
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
export MSYS_NO_PATHCONV=1
docker restart hsgrowth-api-local && sleep 6
docker cp backend/tests/. hsgrowth-api-local:/app/tests/
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_public_meeting.py -q
```

Esperado: **PASS** nos 6 testes — em especial o `test_nao_vaza_segredo`.

- [ ] **Step 6: Commit** (perguntar antes)

```bash
git add backend/app/api/v1/endpoints/public_meeting.py backend/app/api/v1/__init__.py backend/tests/unit/test_public_meeting.py
git commit -m "feat(daily): endpoints publicos de entrada do convidado"
```

---

## Task 6: Evento no Outlook com o link do Daily

É esta task que faz o horário **bloquear a agenda do vendedor** e o cliente receber o convite — sem ela, o SDR agenda em cima de reunião interna.

**Files:**
- Modify: `backend/app/services/microsoft_graph_service.py` (`create_calendar_event`)
- Modify: `backend/app/api/v1/endpoints/card_tasks.py`
- Test: `backend/tests/unit/test_daily_outlook.py`

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_daily_outlook.py`:

```python
"""
Reunião Daily cria evento no Outlook com o link da sala no corpo, para que o
convite chegue ao cliente e o horário bloqueie a agenda do vendedor.

Em modo dev (DAILY_DEV_MODE), convite não sai para e-mail externo.
"""
import pytest
from unittest.mock import patch, MagicMock

from app.core.config import settings
from app.services.microsoft_graph_service import microsoft_graph_service


class TestConviteComLinkDaily:

    def test_link_do_daily_vai_no_corpo(self, db, test_salesperson_user, monkeypatch):
        """O corpo do evento carrega o link da sala."""
        from datetime import datetime
        monkeypatch.setattr(microsoft_graph_service, "_require_token", lambda *a, **k: "tok")

        captured = {}

        class _R:
            status_code = 201
            text = "{}"
            def json(self):
                return {"id": "evt-1", "onlineMeeting": {"joinUrl": ""}}

        def fake_post(self, url, **kwargs):
            captured.update(kwargs.get("json", {}))
            return _R()

        with patch("httpx.Client.post", fake_post):
            microsoft_graph_service.create_calendar_event(
                user=test_salesperson_user,
                db=db,
                title="Reunião de teste",
                start_dt=datetime.utcnow(),
                attendee_emails=["interno@healthsafetytech.com"],
                body_html="<p>Link: https://x.daily.co/hsg-1</p>",
                is_online_meeting=False,
            )

        assert "daily.co" in str(captured.get("body", {}))
        # não pede reunião do Teams quando o link é do Daily
        assert captured.get("isOnlineMeeting") is False


class TestProtecaoDeEmailExterno:

    def test_dev_mode_bloqueia_email_externo(self, db, test_salesperson_user, monkeypatch):
        """Em dev, e-mail de fora do domínio interno é removido dos convidados."""
        from datetime import datetime
        monkeypatch.setattr(settings, "DAILY_DEV_MODE", True)
        monkeypatch.setattr(microsoft_graph_service, "_require_token", lambda *a, **k: "tok")

        captured = {}

        class _R:
            status_code = 201
            text = "{}"
            def json(self):
                return {"id": "evt-1"}

        def fake_post(self, url, **kwargs):
            captured.update(kwargs.get("json", {}))
            return _R()

        with patch("httpx.Client.post", fake_post):
            microsoft_graph_service.create_calendar_event(
                user=test_salesperson_user,
                db=db,
                title="Reunião",
                start_dt=datetime.utcnow(),
                attendee_emails=["interno@healthsafetytech.com", "cliente@empresa-externa.com"],
            )

        enviados = [
            a["emailAddress"]["address"]
            for a in captured.get("attendees", [])
        ]
        assert "interno@healthsafetytech.com" in enviados
        assert "cliente@empresa-externa.com" not in enviados
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
export MSYS_NO_PATHCONV=1
docker cp backend/tests/. hsgrowth-api-local:/app/tests/
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_outlook.py -q
```

Esperado: **FAIL** — `create_calendar_event()` ainda não aceita `body_html` nem `is_online_meeting`, e não filtra e-mails.

- [ ] **Step 3: Estender `create_calendar_event`**

Em `backend/app/services/microsoft_graph_service.py`, alterar a assinatura:

```python
    def create_calendar_event(
        self,
        user: User,
        db: Session,
        title: str,
        start_dt: datetime,
        end_dt: Optional[datetime] = None,
        attendee_emails: Optional[list[str]] = None,
        body_html: Optional[str] = None,
        is_online_meeting: bool = True,
    ) -> dict:
```

No corpo, trocar a montagem do payload por:

```python
        payload: dict = {
            "subject": title,
            "start": {"dateTime": to_iso(start_dt), "timeZone": "UTC"},
            "end": {"dateTime": to_iso(end_dt), "timeZone": "UTC"},
            # Reunião Daily: o link vai no corpo, não se pede sala do Teams.
            "isOnlineMeeting": is_online_meeting,
        }

        if is_online_meeting:
            payload["onlineMeetingProvider"] = "teamsForBusiness"

        if body_html:
            payload["body"] = {"contentType": "HTML", "content": body_html}
```

E, logo antes de montar `attendees`, adicionar a proteção de desenvolvimento:

```python
        # Proteção de desenvolvimento: sem homologação, convite não sai para
        # e-mail de cliente real. Ver seção 15.8 do design.
        if attendee_emails and settings.DAILY_DEV_MODE:
            dominio = settings.DAILY_INTERNAL_EMAIL_DOMAIN.lower()
            filtrados = [e for e in attendee_emails if e.lower().endswith(f"@{dominio}")]
            if len(filtrados) != len(attendee_emails):
                print(
                    f"[DAILY_DEV_MODE] {len(attendee_emails) - len(filtrados)} convidado(s) "
                    f"externo(s) removido(s) do convite."
                )
            attendee_emails = filtrados
```

Conferir que `settings` está importado no arquivo.

- [ ] **Step 4: Chamar isso ao criar a reunião Daily**

Em `backend/app/api/v1/endpoints/card_tasks.py`, dentro de `create_daily_room`, após criar a sala e antes do `return`:

```python
    # Evento no Outlook com o link do Daily: é o que dispara o convite ao
    # cliente e bloqueia o horário na agenda do vendedor (o SDR consulta esse
    # free/busy antes de agendar). Ver RN da seção 14.3 do design.
    try:
        from app.services.microsoft_graph_service import microsoft_graph_service

        attendee_emails = []
        card = db.query(Card).filter(Card.id == task.card_id).first()
        if card and card.assigned_to and card.assigned_to.email:
            seller_email = card.assigned_to.email.strip()
            if seller_email and seller_email != current_user.email:
                attendee_emails.append(seller_email)

        if card and card.person:
            for email in [card.person.email, card.person.email_commercial, card.person.email_personal]:
                if email and email.strip() and email not in attendee_emails:
                    attendee_emails.append(email.strip())

        public_link = f"{settings.FRONTEND_URL}/entrar/{task.public_access_token}"
        body_html = (
            f"<p>Reunião por vídeo — clique no link abaixo para entrar. "
            f"Não é necessário instalar nada.</p>"
            f"<p><a href=\"{public_link}\">{public_link}</a></p>"
        )

        microsoft_graph_service.create_calendar_event(
            user=current_user,
            db=db,
            title=task.title,
            start_dt=task.due_date,
            end_dt=None,
            attendee_emails=attendee_emails or None,
            body_html=body_html,
            is_online_meeting=False,
        )
    except ValueError as e:
        # Sem token da Microsoft: a decisão é BLOQUEAR (seção 15.2 do design).
        service.delete_room(task)
        task.daily_room_name = None
        task.daily_room_url = None
        task.public_access_token = None
        task.meeting_provider = None
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Conecte sua conta Microsoft antes de criar a reunião — "
                   "o convite é enviado pelo seu calendário.",
        )
```

Conferir que `Card` está importado no arquivo.

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
export MSYS_NO_PATHCONV=1
docker restart hsgrowth-api-local && sleep 6
docker cp backend/tests/. hsgrowth-api-local:/app/tests/
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_daily_outlook.py tests/unit/test_daily_endpoints.py -q
```

Esperado: **PASS** em todos.

- [ ] **Step 6: Conferir que o fluxo Teams não regrediu**

```bash
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/ -q -k "not visibilidade and not dashboard_vinculo"
```

Esperado: só as 6 falhas pré-existentes de `test_cards.py`.

- [ ] **Step 7: Commit** (perguntar antes)

```bash
git add backend/app/services/microsoft_graph_service.py backend/app/api/v1/endpoints/card_tasks.py backend/tests/unit/test_daily_outlook.py
git commit -m "feat(daily): evento no Outlook com o link da sala + trava de email externo em dev"
```

---

## Task 7: Frontend — escolha do tipo no modal

**Files:**
- Modify: `frontend/src/services/userService.ts` (ou criar `featureService.ts`)
- Modify: `frontend/src/services/cardTaskService.ts`
- Modify: `frontend/src/components/cardDetails/MeetingSection.tsx`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Adicionar os métodos de serviço**

Em `frontend/src/services/cardTaskService.ts`, junto de `createTeamsMeeting`:

```typescript
  /** Cria a sala de reunião por vídeo (Daily) e devolve o link público. */
  async createDailyRoom(taskId: number): Promise<{
    room_url: string;
    public_link: string;
    public_access_token: string;
  }> {
    const response = await api.post(`/api/v1/card-tasks/${taskId}/daily-room`);
    return response.data;
  },

  /** Token de anfitrião para entrar na sala. */
  async getDailyHostToken(taskId: number): Promise<{ token: string; room_url: string }> {
    const response = await api.post(`/api/v1/card-tasks/${taskId}/daily-host-token`);
    return response.data;
  },
```

Em `frontend/src/services/userService.ts`:

```typescript
  /** Flags de funcionalidade em homologação para o usuário logado. */
  async getFeatures(): Promise<{ daily_meeting: boolean }> {
    const response = await api.get<{ daily_meeting: boolean }>("/api/v1/features");
    return response.data;
  },
```

- [ ] **Step 2: Adicionar o seletor no modal**

Em `frontend/src/components/cardDetails/MeetingSection.tsx`:

Estado, junto dos demais `useState`:

```typescript
  // Tipo de reunião escolhido no formulário (RN da seção 14.2 do design)
  const [meetingProvider, setMeetingProvider] = useState<"daily" | "teams">("teams");
  // Trava por usuário enquanto a reunião por vídeo não é homologada
  const [dailyEnabled, setDailyEnabled] = useState(false);

  useEffect(() => {
    userService.getFeatures()
      .then((f) => setDailyEnabled(f.daily_meeting))
      .catch(() => setDailyEnabled(false));
  }, []);
```

No formulário do modal, **antes** do campo de título:

```tsx
{dailyEnabled && (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
      Onde vai acontecer?
    </label>
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => setMeetingProvider("daily")}
        className={`rounded-lg border px-3 py-2 text-sm transition-all ${
          meetingProvider === "daily"
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-gray-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
        }`}
      >
        No CRM (vídeo)
      </button>
      <button
        type="button"
        onClick={() => setMeetingProvider("teams")}
        className={`rounded-lg border px-3 py-2 text-sm transition-all ${
          meetingProvider === "teams"
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-gray-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
        }`}
      >
        Teams (Outlook)
      </button>
    </div>
    <p className="text-xs text-slate-400">
      {meetingProvider === "daily"
        ? "O cliente entra por um link, sem instalar nada. O convite é enviado normalmente."
        : "Reunião pelo Teams, como sempre."}
    </p>
  </div>
)}
```

- [ ] **Step 3: Escolher o serviço ao criar**

No mesmo arquivo, substituir o bloco que hoje chama `createTeamsMeeting` direto (~L152-159):

```typescript
      // Cria a reunião no provedor escolhido
      try {
        if (dailyEnabled && meetingProvider === "daily") {
          const { public_link } = await cardTaskService.createDailyRoom(created.id);
          await navigator.clipboard.writeText(public_link).catch(() => {});
          showSuccess("Reunião criada! O convite foi enviado e o link do cliente está copiado.");
        } else {
          await cardTaskService.createTeamsMeeting(created.id);
          showSuccess("Reunião criada e agendada no calendário!");
        }
      } catch (error: any) {
        const detail = error.response?.data?.detail;
        // 400 = sem conta Microsoft conectada (decisão: bloquear)
        // 503 = Daily indisponível (sugerir Teams)
        showError(detail || "Reunião criada, mas houve um problema ao agendar.");
      }
```

- [ ] **Step 4: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: **nenhum erro**.

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add frontend/src
git commit -m "feat(front): seletor de tipo de reuniao no modal"
```

---

## Task 8: Frontend — página da sala (anfitrião)

**Files:**
- Create: `frontend/src/pages/MeetingRoom.tsx`
- Modify: `frontend/src/App.tsx` (rota autenticada `/reuniao/:taskId`)
- Modify: `frontend/package.json` (dependência `@daily-co/daily-js`)

- [ ] **Step 1: Instalar a dependência**

```bash
cd frontend && npm install @daily-co/daily-js
```

- [ ] **Step 2: Criar a página**

Criar `frontend/src/pages/MeetingRoom.tsx`:

```tsx
/**
 * Sala de reunião por vídeo (anfitrião).
 *
 * Usa o Daily Prebuilt: a interface de vídeo, áudio e compartilhamento de tela
 * vem pronta do Daily; aqui cuidamos de obter o token e embutir a sala.
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { ArrowLeft, Loader2 } from "lucide-react";

import cardTaskService from "../services/cardTaskService";
import { showError } from "../utils/toast";

const MeetingRoom: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    let cancelado = false;

    const entrar = async () => {
      try {
        const { token, room_url } = await cardTaskService.getDailyHostToken(Number(taskId));
        if (cancelado || !containerRef.current) return;

        const call = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: { width: "100%", height: "100%", border: "0" },
          showLeaveButton: true,
          showFullscreenButton: true,
        });
        callRef.current = call;

        call.on("left-meeting", () => navigate(-1));
        await call.join({ url: room_url, token });
        setLoading(false);
      } catch (e: any) {
        if (cancelado) return;
        const detail = e.response?.data?.detail || "Não foi possível entrar na reunião.";
        setErro(detail);
        setLoading(false);
        showError(detail);
      }
    };

    entrar();

    return () => {
      cancelado = true;
      // Sempre destruir o frame ao sair, senão a câmera continua ativa
      callRef.current?.destroy().catch(() => {});
      callRef.current = null;
    };
  }, [taskId, navigate]);

  return (
    <div className="flex h-screen flex-col bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-700 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm font-medium text-white">Reunião</span>
      </div>

      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-400" size={32} />
          </div>
        )}
        {erro && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="text-center text-sm text-slate-300">{erro}</p>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default MeetingRoom;
```

- [ ] **Step 3: Registrar a rota**

Em `frontend/src/App.tsx`, junto das rotas autenticadas:

```tsx
<Route path="/reuniao/:taskId" element={<MeetingRoom />} />
```

Seguir o mesmo padrão de proteção das demais rotas autenticadas do arquivo.

- [ ] **Step 4: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add frontend/src frontend/package.json frontend/package-lock.json
git commit -m "feat(front): pagina da sala de reuniao (anfitriao)"
```

---

## Task 9: Frontend — página pública do convidado

A única tela que pessoas de fora vão ver.

**Files:**
- Create: `frontend/src/pages/MeetingGate.tsx`
- Modify: `frontend/src/App.tsx` (rota **pública** `/entrar/:publicToken`)
- Create: `frontend/src/services/publicMeetingService.ts`

- [ ] **Step 1: Criar o serviço público**

Criar `frontend/src/services/publicMeetingService.ts`:

```typescript
import { publicApi } from "./api";

export interface PublicMeetingInfo {
  title: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  already_started: boolean;
  already_ended: boolean;
}

/** Chamadas da tela pública do convidado — não exigem login. */
const publicMeetingService = {
  async getInfo(token: string): Promise<PublicMeetingInfo> {
    const response = await publicApi.get<PublicMeetingInfo>(`/api/v1/public/meeting/${token}`);
    return response.data;
  },

  async join(
    token: string,
    data: { name: string; company?: string; email?: string }
  ): Promise<{ token: string; room_url: string }> {
    const response = await publicApi.post(`/api/v1/public/meeting/${token}/join`, data);
    return response.data;
  },
};

export default publicMeetingService;
```

> ⚠️ **Obrigatório:** o interceptor de `api.ts` (L38-79) redireciona para `/login` quando recebe 401. Usar essa instância na tela pública faria o **cliente ser jogado para a tela de login** do CRM. Criar uma instância separada, sem interceptor, e usar ela aqui:

```typescript
// frontend/src/services/api.ts — instância para rotas públicas (sem sessão)
export const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});
```

E em `publicMeetingService.ts`, importar `{ publicApi }` em vez do `api` padrão.

- [ ] **Step 2: Criar a página**

Criar `frontend/src/pages/MeetingGate.tsx`:

```tsx
/**
 * Tela pública de entrada na reunião (convidado).
 *
 * O cliente abre pelo link do convite: informa nome, empresa e e-mail, e entra
 * na sala. Sem login, sem instalação. Nenhum dado interno do CRM é exibido.
 */
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { Loader2, Video } from "lucide-react";

import publicMeetingService, { PublicMeetingInfo } from "../services/publicMeetingService";

const MeetingGate: React.FC = () => {
  const { publicToken } = useParams<{ publicToken: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);

  const [info, setInfo] = useState<PublicMeetingInfo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [entrando, setEntrando] = useState(false);
  const [naSala, setNaSala] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", company: "", email: "" });

  useEffect(() => {
    if (!publicToken) return;
    publicMeetingService
      .getInfo(publicToken)
      .then(setInfo)
      .catch(() => setErro("Reunião não encontrada ou link expirado."))
      .finally(() => setCarregando(false));
  }, [publicToken]);

  useEffect(() => {
    return () => {
      callRef.current?.destroy().catch(() => {});
      callRef.current = null;
    };
  }, []);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicToken || !form.name.trim()) return;

    setEntrando(true);
    setErro(null);
    try {
      const { token, room_url } = await publicMeetingService.join(publicToken, {
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        email: form.email.trim() || undefined,
      });

      setNaSala(true);
      // aguarda o container aparecer no DOM antes de montar o frame
      setTimeout(async () => {
        if (!containerRef.current) return;
        const call = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: { width: "100%", height: "100%", border: "0" },
          showLeaveButton: true,
        });
        callRef.current = call;
        await call.join({ url: room_url, token });
      }, 0);
    } catch (err: any) {
      setErro(err.response?.data?.detail || "Não foi possível entrar na reunião.");
      setNaSala(false);
    } finally {
      setEntrando(false);
    }
  };

  if (naSala) {
    return (
      <div className="h-screen w-screen bg-slate-900">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="rounded-xl bg-emerald-500/10 p-3">
            <Video className="text-emerald-400" size={28} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">
              {carregando ? "Carregando..." : info?.title || "Reunião"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Preencha seus dados para entrar
            </p>
          </div>
        </div>

        {erro && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {erro}
          </div>
        )}

        {!erro && (
          <form onSubmit={entrar} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Seu nome *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Como podemos te chamar?"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Empresa
              </label>
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Nome da empresa"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                E-mail
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="seu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={entrando || !form.name.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {entrando ? <Loader2 className="animate-spin" size={18} /> : null}
              Entrar na reunião
            </button>

            <p className="text-center text-xs text-slate-500">
              Ao entrar, você poderá aguardar na sala de espera até ser admitido.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default MeetingGate;
```

- [ ] **Step 3: Registrar a rota pública**

Em `frontend/src/App.tsx`, junto das rotas **públicas** (como a de login/reset de senha) — **fora** do wrapper que exige autenticação:

```tsx
<Route path="/entrar/:publicToken" element={<MeetingGate />} />
```

- [ ] **Step 4: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 5: Verificar que a rota é realmente pública**

Abrir `/entrar/token-qualquer` numa janela anônima (sem sessão). Esperado: a tela carrega e mostra "Reunião não encontrada ou link expirado" — **não** deve redirecionar para o login.

- [ ] **Step 6: Commit** (perguntar antes)

```bash
git add frontend/src
git commit -m "feat(front): tela publica de entrada do convidado"
```

---

## Task 10: Configurar contas e subir

Passo operacional — feito junto com o responsável.

- [ ] **Step 1: Criar a conta no Daily.co**

Roteiro a entregar ao responsável:
1. Criar conta em https://dashboard.daily.co/ (plano gratuito serve para começar)
2. Menu **Developers** → copiar a **API key**
3. Enviar a chave por canal seguro — **nunca** colar em commit, issue ou chat público

- [ ] **Step 2: Adicionar as variáveis no EasyPanel**

No serviço do **backend**:

```
DAILY_API_KEY=<chave copiada do painel do Daily>
DAILY_ENABLED_USER_IDS=18
DAILY_DEV_MODE=true
FRONTEND_URL=https://hsgrowth.healthsafetytech.com
```

> `DAILY_ENABLED_USER_IDS=18` deixa a funcionalidade visível só para o admin homologador. `DAILY_DEV_MODE=true` impede convite para e-mail externo. **Os dois só mudam depois da homologação.**

- [ ] **Step 3: Deploy dos dois serviços**

Backend e frontend. **Se o bundle do frontend não mudar de nome, incrementar `CACHEBUST` em `frontend/dockerfile`** — o Docker reaproveita a camada de build.

Conferir depois do deploy:

```bash
curl -s https://hsgrowth.healthsafetytech.com/ | grep -o 'assets/index-[^"]*\.js'
```

- [ ] **Step 4: Verificar que a trava está ativa**

Entrar com um usuário **que não seja** o homologador e confirmar que o seletor "No CRM (vídeo)" **não aparece** na aba Reuniões.

---

## Task 11: Homologação

- [ ] **Step 1: Preparar o cenário**

O homologador cria:
1. Um **card de teste** (nunca card de cliente)
2. Um **contato** nesse card com **e-mail interno**

- [ ] **Step 2: Roteiro de teste**

| # | Passo | Esperado |
|---|---|---|
| 1 | Aba Reuniões → Nova reunião → "No CRM (vídeo)" | Seletor aparece só para o homologador |
| 2 | Preencher e criar | Reunião criada; link público copiado |
| 3 | Conferir o Outlook | Evento na agenda, com o link do Daily no corpo |
| 4 | Conferir a caixa de entrada | Convite recebido (só e-mail interno) |
| 5 | Conferir a agenda no card (aba Calendário → Outlook) | Horário aparece ocupado |
| 6 | Clicar em "Entrar na reunião" | Sala abre dentro do CRM |
| 7 | Abrir o link público em janela anônima | Tela de entrada, sem pedir login |
| 8 | Preencher nome/empresa/e-mail e entrar | Fica na sala de espera |
| 9 | Admitir pelo anfitrião | Convidado entra; áudio e vídeo funcionam |
| 10 | Testar compartilhamento de tela e chat | Funcionam |
| 11 | Encerrar dos dois lados | Ambos saem sem travar |
| 12 | Criar reunião pelo **Teams** | Continua funcionando como sempre |

- [ ] **Step 3: Testar os caminhos de erro**

| Situação | Como simular | Esperado |
|---|---|---|
| Sem Microsoft conectado | usuário sem token MS | Bloqueia: "Conecte sua conta Microsoft" |
| Daily indisponível | `DAILY_API_KEY` inválida temporariamente | Mensagem sugerindo criar pelo Teams |
| Link público inválido | alterar um caractere do token | "Reunião não encontrada ou link expirado" |
| Convite para e-mail externo | contato com e-mail de fora | Convite **não** enviado; log do `DAILY_DEV_MODE` |

- [ ] **Step 4: Liberar para o time** (só após aprovação)

No EasyPanel:

```
DAILY_ENABLED_USER_IDS=      (vazio = todos)
DAILY_DEV_MODE=false
```

Redeploy do backend. **A partir daqui os convites saem para clientes reais.**

- [ ] **Step 5: Changelog e aviso**

Atualizar `CHANGELOG.md`, `ChangelogModal.tsx` e a versão no rodapé do `MainLayout.tsx`, seguindo a convenção do projeto (3 lugares). Avisar o time.

---

## Riscos e decisões registradas

| Risco | Mitigação |
|---|---|
| Convite de teste chegar a cliente real | `DAILY_DEV_MODE` bloqueia e-mail externo + card de teste + trava por usuário |
| Migration em produção | Aditiva (só colunas nullable), com `downgrade` pronto; confirmar antes de rodar |
| Rota pública exposta | Token opaco aleatório de 32 bytes; teste automatizado garante que nenhum segredo vaza |
| Sala aberta indefinidamente | `exp` + `eject_at_room_exp` na criação da sala |
| Câmera continuar ativa após sair | `destroy()` do frame no cleanup das duas páginas |
| Quebrar o fluxo Teams | Nenhuma alteração no caminho existente; suíte roda a cada task |
| Deploy não atualizar o frontend | Incrementar `CACHEBUST`; conferir o nome do bundle |
