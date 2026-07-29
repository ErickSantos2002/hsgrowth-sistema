# Fase 2 — Ganho move a caixa no GestorHS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quando um card `gestorhs.os` do board de Serviços vira "Ganho", o hsgrowth chama o endpoint inbound do GestorHS para mover a caixa de Pós-Vendas (6) para Financeiro (10), levando o número da proposta.

**Architecture:** Um cliente HTTP outbound novo e isolado (`gestorhs_client.py`) faz o POST; uma task Celery best-effort com retry o executa fora da request; o `move_card` enfileira a task no ponto onde já marca `card_won`, filtrando por `external_source == "gestorhs.os"`. Uma trava de avanço obriga o número da proposta no Ganho. Um script retroativo cobre os cards já em Ganho.

**Tech Stack:** Python 3, FastAPI, SQLAlchemy, Celery (broker Redis), httpx, pytest + SQLite in-memory; frontend React + TypeScript + Vite.

**Spec:** `docs/superpowers/specs/2026-07-29-fase2-ganho-move-caixa-gestorhs-design.md`

## Global Constraints

- **Escopo do gatilho:** só cards com `external_source == "gestorhs.os"` e `external_id` preenchido. Cards de Cobrança (board 2) e humanos (sem `external_source`) **não** disparam.
- **`caixa_id` = `external_id` cru do card** — não interpretar. Já é o `caixa.id` que o inbound espera.
- **Endpoint do GestorHS:** `POST {GESTORHS_INBOUND_URL}/integracao/growthhs/caixas/{caixa_id}/ganho`, header `X-API-Key`, body `{"observacao": <str>, "numero_proposta": <int, opcional>}`.
- **`numero_proposta` é inteiro** e só entra no body quando não-nulo.
- **Nasce desligada:** `GESTORHS_INBOUND_URL` ou `GESTORHS_INBOUND_API_KEY` vazias → cliente é no-op.
- **Best-effort:** enfileirar/chamar nunca pode quebrar o `move_card` (o card vira Ganho de qualquer jeito).
- **Idempotente:** repetir a chamada é seguro (contrato do GestorHS).
- **Padrão de env:** seguir o webhook de Vendas `_send_automacao01_webhook` (`card_service.py:104`): URL de `settings`, no-op se vazia, `httpx`, tudo em try/except.
- **Padrão de task Celery:** `@celery_app.task(name=..., bind=True, max_retries=3)` com `raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))` (`workers/tasks.py`).
- **Rodar testes de backend:** a partir de `/home/ericks/github/hsgrowth-sistema/backend`, use `venv/bin/python -m pytest <caminho> -v` (o `python` do sistema não tem pytest).
- **Fixture de sessão de teste:** chama-se `db` (`tests/conftest.py`). A fixture `client` (sobe o app, ~55s/teste) NÃO é necessária em nenhuma task aqui.
- **Frontend:** validar com `cd frontend && npx tsc --noEmit` (o `npm run build` é `vite build` e NÃO faz type-check).
- **Mensagens e comentários em português.**

---

### Task 1: Config + cliente HTTP outbound para o GestorHS

Cria as duas envs e o cliente que faz o POST. Isolado e testável sem tocar em card.

**Files:**
- Modify: `backend/app/core/config.py:88` (após `AUTOMACAO01_WEBHOOK_URL`)
- Create: `backend/app/integrations/gestorhs_client.py`
- Test: `backend/tests/unit/test_gestorhs_client.py`

**Interfaces:**
- Consumes: `settings.GESTORHS_INBOUND_URL`, `settings.GESTORHS_INBOUND_API_KEY`.
- Produces:
  - `gestorhs_client.integracao_ativa() -> bool`
  - `gestorhs_client.mover_caixa_ganho(caixa_id: str, numero_proposta: Optional[int], observacao: str) -> None`

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/unit/test_gestorhs_client.py`:

```python
"""Cliente outbound que avisa o GestorHS quando um card vira Ganho."""
import httpx
import pytest

from app.core.config import settings
from app.integrations import gestorhs_client


@pytest.fixture
def ligada(monkeypatch):
    monkeypatch.setattr(settings, "GESTORHS_INBOUND_URL", "https://gestorhs.teste")
    monkeypatch.setattr(settings, "GESTORHS_INBOUND_API_KEY", "chave-secreta")


def test_desligada_e_noop(monkeypatch):
    monkeypatch.setattr(settings, "GESTORHS_INBOUND_URL", "")
    monkeypatch.setattr(settings, "GESTORHS_INBOUND_API_KEY", "")
    assert gestorhs_client.integracao_ativa() is False
    # Não deve levantar nem chamar nada.
    gestorhs_client.mover_caixa_ganho("42", 2, "obs")


def test_monta_url_header_e_body(ligada, monkeypatch):
    capturado = {}

    def fake_post(url, json, headers, timeout):
        capturado["url"] = url
        capturado["json"] = json
        capturado["headers"] = headers
        return httpx.Response(200, json={"movida": True})

    monkeypatch.setattr(httpx, "post", fake_post)
    gestorhs_client.mover_caixa_ganho("42", 123, "Ganho - card #7")

    assert capturado["url"] == "https://gestorhs.teste/integracao/growthhs/caixas/42/ganho"
    assert capturado["headers"]["X-API-Key"] == "chave-secreta"
    assert capturado["json"] == {"observacao": "Ganho - card #7", "numero_proposta": 123}


def test_numero_proposta_ausente_nao_vai_no_body(ligada, monkeypatch):
    capturado = {}
    monkeypatch.setattr(httpx, "post",
                        lambda url, json, headers, timeout: capturado.update(json=json) or httpx.Response(200))
    gestorhs_client.mover_caixa_ganho("42", None, "obs")
    assert "numero_proposta" not in capturado["json"]
    assert capturado["json"] == {"observacao": "obs"}


def test_erro_http_propaga(ligada, monkeypatch):
    monkeypatch.setattr(httpx, "post",
                        lambda url, json, headers, timeout: httpx.Response(500, request=httpx.Request("POST", url)))
    with pytest.raises(httpx.HTTPStatusError):
        gestorhs_client.mover_caixa_ganho("42", 2, "obs")
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && venv/bin/python -m pytest tests/unit/test_gestorhs_client.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.integrations.gestorhs_client'`

- [ ] **Step 3: Adicionar as envs no config**

Em `backend/app/core/config.py`, logo após a linha `AUTOMACAO01_WEBHOOK_URL` (linha 88):

```python
    AUTOMACAO01_WEBHOOK_URL: str = ""  # URL do webhook para sistema de nutrição por e-mail

    # Integração outbound com o GestorHS (fase 2): avisar o Ganho para mover a caixa.
    # Vazias = integração desligada (cliente vira no-op). Ver gestorhs_client.
    GESTORHS_INBOUND_URL: str = ""
    GESTORHS_INBOUND_API_KEY: str = ""
```

- [ ] **Step 4: Criar o cliente**

Criar `backend/app/integrations/gestorhs_client.py`:

```python
"""
Cliente outbound que avisa o GestorHS quando um card de Serviços vira "Ganho".

Chama o endpoint inbound do GestorHS para mover a caixa de Pós-Vendas (fase 6)
para Financeiro (fase 10). Ver docs/integracao-growthhs-inbound.md (contrato) e
docs/superpowers/specs/2026-07-29-fase2-ganho-move-caixa-gestorhs-design.md.

Best-effort e gating por env, no mesmo padrão do webhook de Vendas
(_send_automacao01_webhook): se as envs estiverem vazias, é no-op. Erros HTTP/rede
são propagados — quem trata o retry é a task Celery que chama este cliente.
"""
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def integracao_ativa() -> bool:
    return bool(settings.GESTORHS_INBOUND_URL and settings.GESTORHS_INBOUND_API_KEY)


def mover_caixa_ganho(caixa_id: str, numero_proposta: Optional[int], observacao: str) -> None:
    """Move a caixa do GestorHS de Pós-Vendas para Financeiro.

    `caixa_id` é o `external_id` cru do card (o `caixa.id` do GestorHS).
    `numero_proposta` só entra no corpo quando não-nulo (é opcional no contrato).
    Não faz retry — o chamador (task Celery) trata falha.
    """
    if not integracao_ativa():
        logger.info("integração GestorHS desligada (envs vazias) — no-op para caixa %s", caixa_id)
        return

    url = f"{settings.GESTORHS_INBOUND_URL.rstrip('/')}/integracao/growthhs/caixas/{caixa_id}/ganho"
    body: dict = {"observacao": observacao}
    if numero_proposta is not None:
        body["numero_proposta"] = numero_proposta

    resp = httpx.post(
        url,
        json=body,
        headers={"X-API-Key": settings.GESTORHS_INBOUND_API_KEY},
        timeout=10,
    )
    resp.raise_for_status()
```

Confirmar que `backend/app/integrations/__init__.py` existe (o `hsgrowth_client` do lado inbound já mora em `integrations/` no GestorHS, mas neste repo confira: se não existir, criar vazio).

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd backend && venv/bin/python -m pytest tests/unit/test_gestorhs_client.py -v`
Expected: PASS (4 testes)

- [ ] **Step 6: Commit**

```bash
git add backend/app/core/config.py backend/app/integrations/gestorhs_client.py backend/tests/unit/test_gestorhs_client.py
git commit -m "feat(fase2): cliente outbound + envs para avisar Ganho ao GestorHS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Task Celery `notificar_ganho_gestorhs`

Executa o cliente fora da request, com retry. Best-effort com backoff.

**Files:**
- Modify: `backend/app/workers/tasks.py` (nova task ao final)
- Test: `backend/tests/unit/test_notificar_ganho_task.py`

**Interfaces:**
- Consumes: `gestorhs_client.mover_caixa_ganho` (Task 1).
- Produces: task Celery `notificar_ganho_gestorhs(caixa_id: str, numero_proposta: Optional[int], observacao: str)`, importável de `app.workers.tasks`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_notificar_ganho_task.py`:

```python
"""A task Celery que avisa o Ganho ao GestorHS."""
from app.workers.tasks import notificar_ganho_gestorhs


def test_chama_o_cliente_com_os_argumentos(monkeypatch):
    capturado = {}
    monkeypatch.setattr(
        "app.integrations.gestorhs_client.mover_caixa_ganho",
        lambda caixa_id, numero_proposta, observacao: capturado.update(
            caixa_id=caixa_id, numero_proposta=numero_proposta, observacao=observacao
        ),
    )
    # .run() executa o corpo da task de forma síncrona (sem broker).
    notificar_ganho_gestorhs.run("42", 123, "Ganho - card #7")
    assert capturado == {"caixa_id": "42", "numero_proposta": 123, "observacao": "Ganho - card #7"}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && venv/bin/python -m pytest tests/unit/test_notificar_ganho_task.py -v`
Expected: FAIL — `ImportError: cannot import name 'notificar_ganho_gestorhs'`

- [ ] **Step 3: Adicionar a task**

Ao final de `backend/app/workers/tasks.py`:

```python
@celery_app.task(name="notificar_ganho_gestorhs", bind=True, max_retries=3)
def notificar_ganho_gestorhs(self, caixa_id: str, numero_proposta, observacao: str):
    """Avisa o GestorHS que o card virou Ganho — move a caixa 6→10.

    Best-effort com retry exponencial: se o GestorHS estiver fora, tenta de novo.
    Idempotente do lado do GestorHS, então reenviar é seguro.
    """
    from app.integrations import gestorhs_client
    try:
        gestorhs_client.mover_caixa_ganho(caixa_id, numero_proposta, observacao)
        logger.success(f"Ganho avisado ao GestorHS (caixa={caixa_id})")
        return {"ok": True, "caixa_id": caixa_id}
    except Exception as e:
        logger.error(f"Falha ao avisar Ganho ao GestorHS (caixa={caixa_id}): {e}")
        try:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        except self.MaxRetriesExceededError:
            logger.error(f"Máximo de tentativas excedido ao avisar Ganho (caixa={caixa_id})")
            return {"ok": False, "caixa_id": caixa_id}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && venv/bin/python -m pytest tests/unit/test_notificar_ganho_task.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/workers/tasks.py backend/tests/unit/test_notificar_ganho_task.py
git commit -m "feat(fase2): task Celery notificar_ganho_gestorhs (best-effort + retry)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Gatilho no `move_card` (enfileira ao virar Ganho)

Enfileira a task quando o card `gestorhs.os` vira Ganho. Enfileirar nunca quebra o Ganho.

**Files:**
- Modify: `backend/app/services/service_board_service.py:590-592` (bloco `card_won`) + novo método privado
- Test: `backend/tests/unit/test_ganho_gatilho.py`

**Interfaces:**
- Consumes: `notificar_ganho_gestorhs` (Task 2), `deal_value_by_card` (já existe no módulo).
- Produces: `ServiceBoardService._notificar_ganho_gestorhs(card, user)` (privado, chamado no `card_won`).

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/unit/test_ganho_gatilho.py`:

```python
"""O move para Ganho enfileira o aviso ao GestorHS só para cards gestorhs.os."""
import pytest

from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList
from app.models.user import User
from app.core.security import hash_password
from app.services.service_board_service import ServiceBoardService


@pytest.fixture
def cenario(db):
    """Board 1 com uma lista comum e uma lista de Ganho; um usuário admin (passa travas)."""
    role = Role(name="admin", display_name="Admin", permissions=[])
    db.add(role); db.commit()
    user = User(role_id=role.id, email="a@a.com", name="Admin", password_hash=hash_password("x"), is_active=True)
    db.add(user); db.commit(); db.refresh(user)

    board = ServiceBoard(name="Serviços")
    db.add(board); db.commit()
    origem = ServiceList(board_id=board.id, name="Aguardando Pedido", position=0)
    ganho = ServiceList(board_id=board.id, name="Negócio Ganho", position=1, is_done_stage=True)
    db.add_all([origem, ganho]); db.commit(); db.refresh(origem); db.refresh(ganho)
    return {"db": db, "user": user, "origem": origem, "ganho": ganho, "board": board}


def _card(db, lista, **kw):
    c = ServiceCard(list_id=lista.id, title="X", **kw)
    db.add(c); db.commit(); db.refresh(c)
    return c


def test_card_gestorhs_os_enfileira(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"], external_source="gestorhs.os", external_id="42",
                 business_info={"proposal_number": 7})

    chamado = {}
    monkeypatch.setattr(
        "app.workers.tasks.notificar_ganho_gestorhs.delay",
        lambda caixa_id, numero_proposta, observacao: chamado.update(
            caixa_id=caixa_id, numero_proposta=numero_proposta, observacao=observacao),
    )

    ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user)

    assert chamado["caixa_id"] == "42"
    assert chamado["numero_proposta"] == 7
    assert "card #" in chamado["observacao"]


def test_card_humano_nao_enfileira(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"])  # sem external_source

    chamado = {"n": 0}
    monkeypatch.setattr("app.workers.tasks.notificar_ganho_gestorhs.delay",
                        lambda *a, **k: chamado.update(n=chamado["n"] + 1))
    ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user)
    assert chamado["n"] == 0


def test_card_cobranca_nao_enfileira(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"], external_source="gestorhs.calibracao", external_id="500:2026-07")

    chamado = {"n": 0}
    monkeypatch.setattr("app.workers.tasks.notificar_ganho_gestorhs.delay",
                        lambda *a, **k: chamado.update(n=chamado["n"] + 1))
    ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user)
    assert chamado["n"] == 0


def test_falha_ao_enfileirar_nao_quebra_o_ganho(cenario, monkeypatch):
    db, user = cenario["db"], cenario["user"]
    card = _card(db, cenario["origem"], external_source="gestorhs.os", external_id="42",
                 business_info={"proposal_number": 7})

    def explode(*a, **k):
        raise RuntimeError("broker fora")
    monkeypatch.setattr("app.workers.tasks.notificar_ganho_gestorhs.delay", explode)

    # Não deve levantar — o card ainda vira Ganho.
    moved = ServiceBoardService(db).move_card(card.id, cenario["ganho"].id, None, user)
    assert moved.list_id == cenario["ganho"].id
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && venv/bin/python -m pytest tests/unit/test_ganho_gatilho.py -v`
Expected: FAIL — os testes que esperam enfileiramento falham (o gatilho não existe ainda; `chamado` fica vazio → KeyError).

- [ ] **Step 3: Adicionar a chamada no bloco `card_won`**

Em `backend/app/services/service_board_service.py`, no `move_card`, dentro do bloco de Ganho (linhas 590-592), acrescentar a chamada ao novo método logo após `_complete_pending_activities`:

```python
            if is_funnel and (new_list.is_done_stage or "ganho" in new_name):
                self.log_event(card_id, user, "card_won", f"Negócio marcado como Ganho ({new_list.name})", meta)
                self._complete_pending_activities(card_id)
                self._notificar_ganho_gestorhs(card, user)
```

- [ ] **Step 4: Adicionar o método privado**

No mesmo arquivo, logo após `_complete_pending_activities` (por volta da linha 604+), adicionar:

```python
    def _notificar_ganho_gestorhs(self, card: ServiceCard, user: User) -> None:
        """Enfileira o aviso de Ganho ao GestorHS — só para cards vindos de OS.

        Best-effort: enfileirar nunca pode quebrar o Ganho. Se o broker estiver
        fora, o card ainda vira Ganho e a falha fica logada.
        """
        if card.external_source != "gestorhs.os" or not card.external_id:
            return
        try:
            from app.workers.tasks import notificar_ganho_gestorhs

            valor = deal_value_by_card(self.db, [card.id]).get(card.id, 0.0)
            numero = (card.business_info or {}).get("proposal_number")
            numero = int(numero) if numero not in (None, "") else None
            quem = user.name if user else "sistema"
            obs = f"Ganho no GrowthHS — card #{card.id} · R$ {valor:,.2f} · por {quem}"
            notificar_ganho_gestorhs.delay(card.external_id, numero, obs)
        except Exception as e:  # noqa: BLE001 — best-effort, nunca quebra o Ganho
            print(f"[GANHO-GESTORHS] falha ao enfileirar aviso (card {card.id}): {e}")
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd backend && venv/bin/python -m pytest tests/unit/test_ganho_gatilho.py -v`
Expected: PASS (4 testes)

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/service_board_service.py backend/tests/unit/test_ganho_gatilho.py
git commit -m "feat(fase2): move_card enfileira aviso de Ganho ao GestorHS (so gestorhs.os)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Trava — número da proposta obrigatório para Ganho (board 1)

Sem `proposal_number` no Resumo, o card `gestorhs.os` não avança para Ganho.

**Files:**
- Modify: `backend/app/services/service_board_service.py:461-480` (caminho de Ganho em `_validate_advance`)
- Test: `backend/tests/unit/test_ganho_trava_proposta.py`

**Interfaces:**
- Consumes: nada novo.
- Produces: `_validate_advance` acrescenta a pendência "Número da proposta" no board 1.

**Nota:** a trava vale para board 1. Não muda o board 2 (Cobrança). Só é exercida quando o usuário **não** é admin/manager (que passam livres), então o teste usa um usuário com role comum e chama `_validate_advance` direto (evita a checagem de privilégio do `move_card`).

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/unit/test_ganho_trava_proposta.py`:

```python
"""Board 1: Ganho exige business_info.proposal_number preenchido."""
import pytest
from fastapi import HTTPException

from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList
from app.services.service_board_service import ServiceBoardService


@pytest.fixture
def board1(db):
    b = ServiceBoard(name="Serviços")
    db.add(b); db.commit()
    origem = ServiceList(board_id=b.id, name="Aguardando Pedido", position=0)
    ganho = ServiceList(board_id=b.id, name="Negócio Ganho", position=1, is_done_stage=True)
    db.add_all([origem, ganho]); db.commit(); db.refresh(origem); db.refresh(ganho)
    return {"db": db, "origem": origem, "ganho": ganho}


def _mk(db, lista, biz):
    # Com OC anexada, para isolar a pendência do número da proposta.
    from app.models.service_card_activity import ServiceCardActivity
    c = ServiceCard(list_id=lista.id, title="X", business_info=biz)
    db.add(c); db.commit(); db.refresh(c)
    db.add(ServiceCardActivity(service_card_id=c.id, category="arquivo",
                               activity_type="file", description="oc.pdf",
                               activity_metadata={"doc_slot": "oc"}))
    db.commit()
    return c


def test_sem_numero_proposta_bloqueia(board1):
    db = board1["db"]
    card = _mk(db, board1["origem"], {})
    with pytest.raises(HTTPException) as exc:
        ServiceBoardService(db)._validate_advance(card, board1["origem"], board1["ganho"])
    assert exc.value.status_code == 400
    assert "proposta" in exc.value.detail.lower()


def test_com_numero_proposta_passa(board1):
    db = board1["db"]
    card = _mk(db, board1["origem"], {"proposal_number": 7})
    # Não deve levantar.
    ServiceBoardService(db)._validate_advance(card, board1["origem"], board1["ganho"])


def test_numero_zero_ou_vazio_bloqueia(board1):
    db = board1["db"]
    for valor in (0, "", None):
        card = _mk(db, board1["origem"], {"proposal_number": valor})
        with pytest.raises(HTTPException):
            ServiceBoardService(db)._validate_advance(card, board1["origem"], board1["ganho"])
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && venv/bin/python -m pytest tests/unit/test_ganho_trava_proposta.py -v`
Expected: FAIL — `test_sem_numero_proposta_bloqueia` não levanta (a trava não existe).

- [ ] **Step 3: Adicionar a trava**

Em `backend/app/services/service_board_service.py`, no `_validate_advance`, dentro do bloco `if board_id == 1:` do caminho de Ganho (linhas 463-474), acrescentar a checagem do número da proposta **antes** do `if src_name == "proposta":`:

```python
            if board_id == 1:
                # Número da proposta (do GestorHS) é obrigatório para dar Ganho —
                # vai no aviso de volta ao GestorHS (fase 2).
                pn = biz.get("proposal_number")
                try:
                    pn_ok = pn not in (None, "") and int(pn) > 0
                except (TypeError, ValueError):
                    pn_ok = False
                if not pn_ok:
                    miss.append("Número da proposta preenchido no Resumo")
                # Funil oficial — dois caminhos conforme a origem:
                if src_name == "proposta":
                    ...
```

(mantendo o resto do bloco `if src_name == "proposta": ... else: ...` como está)

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && venv/bin/python -m pytest tests/unit/test_ganho_trava_proposta.py -v`
Expected: PASS (3 testes)

- [ ] **Step 5: Regressão do módulo de serviços**

Run: `cd backend && venv/bin/python -m pytest tests/unit/test_ganho_gatilho.py tests/unit/test_services.py -q`
Expected: PASS (o gatilho usa admin, que passa a trava; confirma que a trava não quebrou o fluxo).

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/service_board_service.py backend/tests/unit/test_ganho_trava_proposta.py
git commit -m "feat(fase2): numero da proposta obrigatorio para Ganho no board 1

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Campo "Número da proposta" no Resumo do card (frontend)

Onde o vendedor digita o número. Só no board 1.

**Files:**
- Modify: `frontend/src/services/serviceBoardService.ts` (tipo `ServiceBusinessInfo`)
- Modify: `frontend/src/pages/ServiceCardDetails.tsx` (Resumo: edição + leitura)

**Interfaces:**
- Consumes: `ServiceBusinessInfo`, `setBizField`, `biz`, `isCobranca` (já existem no componente do Resumo).
- Produces: `ServiceBusinessInfo.proposal_number?: number | null`.

- [ ] **Step 1: Adicionar o campo ao tipo**

Em `frontend/src/services/serviceBoardService.ts`, na interface `ServiceBusinessInfo`, junto de `closing_type` / `shipping_confirmed`:

```typescript
  // Número da proposta do GestorHS (#N da tela de Propostas de lá). Obrigatório
  // para dar Ganho no board 1; vai no aviso de volta ao GestorHS (fase 2).
  proposal_number?: number | null;
```

- [ ] **Step 2: Campo no modo edição do Resumo (board 1)**

Em `frontend/src/pages/ServiceCardDetails.tsx`, no bloco de edição do Resumo, junto do campo "Forma de fechamento" que só aparece em `!isCobranca` (por volta da linha 344-350), adicionar um campo numérico:

```tsx
              {!isCobranca && (
                <div>
                  <label className="text-xs text-slate-400">Número da proposta</label>
                  <input
                    type="number"
                    min={1}
                    value={biz.proposal_number ?? ""}
                    onChange={(e) => setBizField("proposal_number",
                      e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="Ex: 123"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              )}
```

Nota: confirme a assinatura de `setBizField` no arquivo — se ela for tipada estritamente por chave conhecida, o novo campo `proposal_number` já está no tipo (Step 1), então aceita `number | null`.

- [ ] **Step 3: Linha no modo leitura do Resumo (board 1)**

No mesmo arquivo, na montagem das linhas de leitura do Resumo (por volta das linhas 374-378, onde há `...(isCobranca ? [] : [{ label: "Forma de fechamento", ... }])`), adicionar a linha do número (só board 1):

```tsx
                ...(isCobranca ? [] : [{ label: "Número da proposta", value: biz.proposal_number ? String(biz.proposal_number) : "" }]),
```

- [ ] **Step 4: Type-check e build**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros (exit 0)

Run: `cd frontend && npm run build`
Expected: build sem erros de TypeScript

- [ ] **Step 5: Verificação visual (registrar como pendente)**

Não há como abrir o navegador aqui. Registrar no relatório que a verificação visual do campo (aparece só no board 1, edição e leitura, salva o número) fica pendente para o dono do projeto conferir após o deploy.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/serviceBoardService.ts frontend/src/pages/ServiceCardDetails.tsx
git commit -m "feat(fase2): campo 'Numero da proposta' no Resumo do card (board 1)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Script retroativo — avisar Ganho dos cards já em Ganho

Cobre os cards `gestorhs.os` que já estão em lista de Ganho. Dry-run por padrão.

**Files:**
- Create: `backend/scripts/retroagir_ganho_gestorhs.py`
- Test: `backend/tests/unit/test_retroagir_ganho.py`

**Interfaces:**
- Consumes: `gestorhs_client.mover_caixa_ganho` (Task 1), `deal_value_by_card`.
- Produces: `retroagir_ganho_gestorhs.cards_em_ganho(db) -> list[ServiceCard]`, `retroagir_ganho_gestorhs.PROPOSTA_RETROATIVO_PADRAO = 2`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_retroagir_ganho.py`:

```python
"""Retroativo: seleciona os cards gestorhs.os já em Ganho e usa proposta 2 como padrão."""
import pytest

from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList
from scripts.retroagir_ganho_gestorhs import PROPOSTA_RETROATIVO_PADRAO, cards_em_ganho, numero_para_envio


@pytest.fixture
def board(db):
    b = ServiceBoard(name="Serviços")
    db.add(b); db.commit()
    ganho = ServiceList(board_id=b.id, name="Negócio Ganho", position=1, is_done_stage=True)
    aberto = ServiceList(board_id=b.id, name="Aguardando Pedido", position=0)
    db.add_all([ganho, aberto]); db.commit(); db.refresh(ganho); db.refresh(aberto)
    return {"db": db, "ganho": ganho, "aberto": aberto}


def test_seleciona_so_gestorhs_os_em_ganho(board):
    db = board["db"]
    em_ganho = ServiceCard(list_id=board["ganho"].id, title="A", external_source="gestorhs.os", external_id="42")
    fora = ServiceCard(list_id=board["aberto"].id, title="B", external_source="gestorhs.os", external_id="43")
    humano = ServiceCard(list_id=board["ganho"].id, title="C")  # sem external_source
    cobranca = ServiceCard(list_id=board["ganho"].id, title="D", external_source="gestorhs.calibracao", external_id="9:1")
    db.add_all([em_ganho, fora, humano, cobranca]); db.commit()

    ids = {c.id for c in cards_em_ganho(db)}
    assert ids == {em_ganho.id}


def test_numero_para_envio_usa_padrao_quando_ausente():
    assert numero_para_envio({}) == PROPOSTA_RETROATIVO_PADRAO
    assert numero_para_envio({"proposal_number": 7}) == 7
    assert numero_para_envio(None) == PROPOSTA_RETROATIVO_PADRAO
    assert PROPOSTA_RETROATIVO_PADRAO == 2
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && venv/bin/python -m pytest tests/unit/test_retroagir_ganho.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.retroagir_ganho_gestorhs'`

- [ ] **Step 3: Criar o script**

Criar `backend/scripts/retroagir_ganho_gestorhs.py`:

```python
"""
Avisa o GestorHS sobre os cards gestorhs.os que JÁ estão em Ganho.

O gatilho automático (move_card) só cobre Ganhos futuros. Este script cobre os
que fecharam antes dele existir, chamando o mesmo endpoint inbound (idempotente).

Simulação por padrão. Para aplicar: --aplicar

    cd backend && python -m scripts.retroagir_ganho_gestorhs
    cd backend && python -m scripts.retroagir_ganho_gestorhs --aplicar

Número da proposta: usa business_info.proposal_number do card; se ausente, usa
PROPOSTA_RETROATIVO_PADRAO (2 — proposta interna de teste do GestorHS para os
cards antigos, que fecharam sem o campo). A caixa avança de qualquer forma.
"""
import argparse
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList
from app.services.service_board_service import deal_value_by_card

# Proposta interna do GestorHS usada como referência nos cards antigos sem número.
PROPOSTA_RETROATIVO_PADRAO = 2


def cards_em_ganho(db: Session) -> List[ServiceCard]:
    """Cards gestorhs.os, não deletados, cuja lista é de Ganho (is_done_stage)."""
    ganho_list_ids = [
        l.id for l in db.query(ServiceList.id).filter(ServiceList.is_done_stage.is_(True)).all()
    ]
    if not ganho_list_ids:
        return []
    return (
        db.query(ServiceCard)
        .filter(
            ServiceCard.external_source == "gestorhs.os",
            ServiceCard.external_id.isnot(None),
            ServiceCard.is_deleted.is_(False),
            ServiceCard.list_id.in_(ganho_list_ids),
        )
        .order_by(ServiceCard.id)
        .all()
    )


def numero_para_envio(business_info: Optional[dict]) -> int:
    pn = (business_info or {}).get("proposal_number")
    try:
        if pn not in (None, "") and int(pn) > 0:
            return int(pn)
    except (TypeError, ValueError):
        pass
    return PROPOSTA_RETROATIVO_PADRAO


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--aplicar", action="store_true", help="chama o GestorHS de verdade (sem a flag, só simula)")
    args = ap.parse_args()

    from app.db.session import SessionLocal
    from app.integrations import gestorhs_client

    db = SessionLocal()
    try:
        cards = cards_em_ganho(db)
        print()
        print("=" * 66)
        print("  APLICANDO" if args.aplicar else "  SIMULAÇÃO (nada enviado)")
        print("=" * 66)
        print(f"  cards gestorhs.os em Ganho: {len(cards)}")
        print(f"  integração ativa (envs):    {gestorhs_client.integracao_ativa()}")
        print()
        ok = erro = 0
        for c in cards:
            numero = numero_para_envio(c.business_info)
            valor = deal_value_by_card(db, [c.id]).get(c.id, 0.0)
            obs = f"Ganho no GrowthHS (retroativo) — card #{c.id} · R$ {valor:,.2f}"
            print(f"  card {c.id}  caixa={c.external_id}  proposta={numero}  R$ {valor:,.2f}")
            if args.aplicar:
                try:
                    gestorhs_client.mover_caixa_ganho(c.external_id, numero, obs)
                    ok += 1
                except Exception as e:  # noqa: BLE001 — um card ruim não para a carga
                    erro += 1
                    print(f"    ERRO: {e}")
        print()
        if args.aplicar:
            print(f"  enviados OK: {ok}  |  erros: {erro}")
        else:
            print("  Nada enviado. Para aplicar: python -m scripts.retroagir_ganho_gestorhs --aplicar")
        print()
    finally:
        db.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && venv/bin/python -m pytest tests/unit/test_retroagir_ganho.py -v`
Expected: PASS (2 testes)

> Se o import `from scripts...` falhar, confirmar que `backend/scripts/__init__.py` existe.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/retroagir_ganho_gestorhs.py backend/tests/unit/test_retroagir_ganho.py
git commit -m "feat(fase2): script retroativo de aviso de Ganho ao GestorHS (proposta padrao 2)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Verificação final

- [ ] `cd backend && venv/bin/python -m pytest tests/unit/test_gestorhs_client.py tests/unit/test_notificar_ganho_task.py tests/unit/test_ganho_gatilho.py tests/unit/test_ganho_trava_proposta.py tests/unit/test_retroagir_ganho.py -v` — todos passam
- [ ] `cd frontend && npx tsc --noEmit` — limpo
- [ ] Confirmar com o Erick que o worker Celery roda em produção (processa automações/e-mails) — pré-requisito para o gatilho ser entregue
- [ ] Deploy do backend e do frontend; configurar `GESTORHS_INBOUND_URL` e `GESTORHS_INBOUND_API_KEY` no ambiente
- [ ] Rodar o retroativo em simulação, conferir a lista, depois `--aplicar`

## Ordem de deploy (importante)

O gatilho e a trava são backend; o campo é frontend. Para o vendedor conseguir dar Ganho depois da trava entrar, o **campo precisa estar no ar** — então deployar **frontend e backend juntos** (ou o frontend primeiro). Se o backend (trava) subir antes do frontend (campo), os cards `gestorhs.os` não conseguem virar Ganho até o campo aparecer.

## Fora de escopo (do spec)

Sincronização reversa contínua; cards de Cobrança; fila de outbox persistente além do retry do Celery; descobrir o número da proposta automaticamente.
