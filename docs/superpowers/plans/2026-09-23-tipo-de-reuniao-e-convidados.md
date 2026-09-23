# Tipo de reunião e convidados do convite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar o tipo e o título das reuniões — avaliando pela matriz só as de Apresentação Phoebus — e deixar o vendedor escolher quem recebe o convite.

**Architecture:** O tipo vira um campo da tarefa e o título é montado no servidor a partir dele, com a razão social do cliente. Um módulo só guarda os tipos, seus rótulos e qual deles é avaliado — do lado da régua da consultoria. A avaliação automática passa a ser disparada por "chegou transcrição + tipo avaliado", servindo tanto ao CRM quanto ao Teams. Os convidados saem de uma lista montada pelo servidor e escolhida pelo vendedor, gravada na reunião.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic, React + TypeScript, PostgreSQL, pytest.

**Spec:** `docs/superpowers/specs/2026-09-22-tipo-de-reuniao-e-convidados-design.md`

---

## Como rodar os testes

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_arquivo.py -v
```

**Atenção:** 20 testes já falham antes deste trabalho (`test_cards.py`, `test_gamification.py`, `test_ganho_trava_proposta.py`, `test_api_flows.py`). São pré-existentes. A suíte fecha hoje em **552 passando, 20 falhando**.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/services/reunioes/tipos.py` | Os cinco tipos, seus rótulos, qual é avaliado e como o título é montado |
| `backend/app/services/reunioes/convidados.py` | Quem o sistema sugere como destinatário do convite |
| `backend/app/services/avaliacao_reuniao/automatica.py` | "Chegou transcrição + tipo avaliado → avalia", usado pelo CRM e pelo Teams |
| `backend/alembic/versions/2026_09_24_1000-b6c7d8e9f0a1_tipo_e_convidados.py` | Colunas `meeting_kind` e `invited_emails` |
| `backend/app/api/v1/endpoints/card_tasks.py` | Rota de sugestões; título montado na criação e na edição; convites |
| `backend/app/api/v1/endpoints/reunioes.py` | Tipo em cada item e filtro por tipo |
| `frontend/src/components/cardDetails/MeetingSection.tsx` | Seletor de tipo, prévia do título e lista de convidados |
| `frontend/src/pages/ReunioesPage.tsx` | Coluna "Onde", coluna "Tipo" e filtro |

Dois módulos novos em `app/services/reunioes/` em vez de mais código em
`card_tasks.py`: esse arquivo já passa de 2.000 linhas, e regra de negócio
enterrada em endpoint não dá para testar sem subir a API inteira.

---

# FASE A — o tipo da reunião

## Task 1: Os cinco tipos

**Files:**
- Create: `backend/app/services/reunioes/__init__.py`
- Create: `backend/app/services/reunioes/tipos.py`
- Test: `backend/tests/unit/test_tipos_de_reuniao.py`

- [ ] **Step 1: Escrever o teste**

```python
# backend/tests/unit/test_tipos_de_reuniao.py
"""
Os tipos de reunião e o título que cada um monta.

O título é o que a consultora vai usar para saber o que avaliar, e o tipo é o
que o sistema usa. Os dois precisam sair daqui, do mesmo lugar.
"""
import pytest

from app.services.reunioes.tipos import (
    TIPOS,
    TIPO_LIVRE,
    e_avaliado,
    montar_titulo,
    nome_da_empresa,
    tipo_por_id,
)


class _Cliente:
    def __init__(self, company_name=None):
        self.company_name = company_name


class _Card:
    def __init__(self, title="", client=None):
        self.title = title
        self.client = client


class TestOsTipos:

    def test_sao_cinco(self):
        assert len(TIPOS) == 5

    def test_ids_esperados(self):
        assert [t.id for t in TIPOS] == [
            "apresentacao_phoebus",
            "duvidas_phoebus",
            "apresentacao",
            "duvidas",
            "outra",
        ]

    def test_so_apresentacao_phoebus_e_avaliada(self):
        """Decisão de 22/09: a régua é de apresentação, não de tira-dúvidas."""
        avaliados = [t.id for t in TIPOS if t.avaliado]

        assert avaliados == ["apresentacao_phoebus"]

    def test_tipo_desconhecido_nao_e_avaliado(self):
        assert e_avaliado("qualquer_coisa") is False

    def test_reuniao_sem_tipo_nao_e_avaliada(self):
        """Todas as reuniões que já existem estão assim."""
        assert e_avaliado(None) is False

    def test_tipo_por_id(self):
        assert tipo_por_id("duvidas").rotulo == "Dúvidas"
        assert tipo_por_id("inexistente") is None


class TestNomeDaEmpresa:

    def test_usa_a_razao_social_do_cliente(self):
        card = _Card(title="Negócio 123", client=_Cliente("RS TRANSPORTES E LOGISTICA LTDA"))

        assert nome_da_empresa(card) == "RS TRANSPORTES E LOGISTICA LTDA"

    def test_sem_razao_social_usa_o_nome_do_negocio(self):
        """O card costuma se chamar como a empresa — é o que o vendedor digitou."""
        card = _Card(title="CONCRENORTE", client=_Cliente(""))

        assert nome_da_empresa(card) == "CONCRENORTE"

    def test_sem_cliente_vinculado_usa_o_nome_do_negocio(self):
        card = _Card(title="PIRECAL", client=None)

        assert nome_da_empresa(card) == "PIRECAL"

    def test_sem_card_devolve_vazio(self):
        assert nome_da_empresa(None) == ""


class TestMontarTitulo:

    def test_junta_rotulo_e_empresa(self):
        card = _Card(client=_Cliente("RS TRANSPORTES"))

        assert montar_titulo("apresentacao_phoebus", card) == (
            "Apresentação Phoebus - RS TRANSPORTES"
        )

    def test_tipo_livre_nao_monta_titulo(self):
        """Em "Outra" vale o que o vendedor escreveu."""
        card = _Card(client=_Cliente("RS TRANSPORTES"))

        assert montar_titulo(TIPO_LIVRE, card) is None

    def test_tipo_desconhecido_nao_monta_titulo(self):
        assert montar_titulo("inventado", _Card(title="X")) is None

    def test_sem_empresa_fica_so_o_rotulo(self):
        assert montar_titulo("duvidas", _Card(title="")) == "Dúvidas"

    def test_titulo_cabe_na_coluna(self):
        """`card_tasks.title` é VARCHAR(255) — razão social gigante não pode quebrar."""
        card = _Card(client=_Cliente("EMPRESA " + "MUITO LONGA " * 40))

        assert len(montar_titulo("apresentacao", card)) <= 255
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_tipos_de_reuniao.py -v
```

Esperado: FAIL com `ModuleNotFoundError: No module named 'app.services.reunioes'`.

- [ ] **Step 3: Escrever o módulo**

```bash
mkdir -p backend/app/services/reunioes
printf '"""Regras das reunioes: tipos e convidados."""\n' \
  > backend/app/services/reunioes/__init__.py
```

```python
# backend/app/services/reunioes/tipos.py
"""
Os tipos de reunião e o título que cada um monta.

A consultora avalia a reunião de apresentação; uma conversa de dúvidas
receberia nota baixa por não ter feito o que ninguém esperava que ela fizesse.
O tipo é o que separa as duas — e fica aqui, no código, ao lado da régua:
mudar quais reuniões são avaliadas é mudança de versão, não configuração de
tela.

O título é montado a partir do tipo para o padrão não depender de cada
vendedor lembrar de escrever igual.
"""
from dataclasses import dataclass
from typing import Optional

TAMANHO_MAXIMO_TITULO = 255  # `card_tasks.title` é VARCHAR(255)


@dataclass(frozen=True)
class TipoDeReuniao:
    id: str
    rotulo: str
    avaliado: bool


TIPOS = (
    TipoDeReuniao("apresentacao_phoebus", "Apresentação Phoebus", True),
    TipoDeReuniao("duvidas_phoebus", "Dúvidas Phoebus", False),
    TipoDeReuniao("apresentacao", "Apresentação", False),
    TipoDeReuniao("duvidas", "Dúvidas", False),
    TipoDeReuniao("outra", "Outra", False),
)

# Em "Outra" vale o título que o vendedor escreveu
TIPO_LIVRE = "outra"


def tipo_por_id(tipo_id: Optional[str]) -> Optional[TipoDeReuniao]:
    return next((t for t in TIPOS if t.id == tipo_id), None)


def e_avaliado(tipo_id: Optional[str]) -> bool:
    """
    Diz se este tipo entra na avaliação automática.

    Reunião sem tipo — todas as que já existem — fica de fora: ninguém
    escolheu tipo quando elas foram criadas, e assumir um seria inventar dado.
    """
    tipo = tipo_por_id(tipo_id)
    return bool(tipo and tipo.avaliado)


def nome_da_empresa(card) -> str:
    """
    A razão social do cliente; faltando, o nome do negócio.

    O card costuma se chamar como a empresa ("RS TRANSPORTES E LOGISTICA
    LTDA"), então a reunião sempre nasce com nome — sem travar quem só quer
    agendar.
    """
    if card is None:
        return ""

    cliente = getattr(card, "client", None)
    razao_social = (getattr(cliente, "company_name", "") or "").strip()
    if razao_social:
        return razao_social

    return (getattr(card, "title", "") or "").strip()


def montar_titulo(tipo_id: Optional[str], card) -> Optional[str]:
    """
    Returns:
        O título padronizado, ou None quando o tipo é livre ou desconhecido —
        aí vale o que o vendedor digitou.
    """
    tipo = tipo_por_id(tipo_id)
    if not tipo or tipo.id == TIPO_LIVRE:
        return None

    empresa = nome_da_empresa(card)
    titulo = f"{tipo.rotulo} - {empresa}" if empresa else tipo.rotulo
    return titulo[:TAMANHO_MAXIMO_TITULO].strip()
```

- [ ] **Step 4: Rodar os testes**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_tipos_de_reuniao.py -v
```

Esperado: 14 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/reunioes/ backend/tests/unit/test_tipos_de_reuniao.py
git commit -m "feat(reunioes): os cinco tipos de reuniao e o titulo padronizado"
```

---

## Task 2: As colunas novas

**Files:**
- Modify: `backend/app/models/card_task.py` (duas colunas)
- Create: `backend/alembic/versions/2026_09_24_1000-b6c7d8e9f0a1_tipo_e_convidados.py`
- Test: `backend/tests/unit/test_modelo_tipo_convidados.py`

**Atenção:** antes de fixar o id da revisão, confira que ele está livre —
`a1b2c3d4e5f6` parecia livre e já era usado desde janeiro, o que fez o alembic
acusar ciclo em todas as revisões:

```bash
grep -rh "^revision = " backend/alembic/versions/*.py | sort
```

- [ ] **Step 1: Escrever o teste**

```python
# backend/tests/unit/test_modelo_tipo_convidados.py
"""
As duas colunas novas da reunião: o tipo e quem foi convidado.

Guardar os convidados é o que permite, meses depois, abrir o card e saber para
quem o convite foi. Sem isso, a única resposta seria "para quem estava no
cadastro naquele dia", que ninguém consegue reconstruir.
"""
from sqlalchemy.orm import Session

from app.models.card_task import CardTask


def test_guarda_o_tipo_e_os_convidados(db: Session, test_card, test_salesperson_user):
    task = CardTask(
        card_id=test_card.id,
        title="Apresentação Phoebus - ACME",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_kind="apresentacao_phoebus",
        invited_emails=["vendedor@empresa.com", "cliente@acme.com"],
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    assert task.meeting_kind == "apresentacao_phoebus"
    assert task.invited_emails == ["vendedor@empresa.com", "cliente@acme.com"]


def test_reuniao_antiga_fica_sem_tipo_e_sem_convidados(
    db: Session, test_card, test_salesperson_user
):
    """As duas colunas são nulas: nenhuma reunião existente precisa ser tocada."""
    task = CardTask(
        card_id=test_card.id,
        title="Reunião de antes",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    assert task.meeting_kind is None
    assert task.invited_emails is None
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_modelo_tipo_convidados.py -v
```

Esperado: FAIL com `TypeError: 'meeting_kind' is an invalid keyword argument for CardTask`.

- [ ] **Step 3: Acrescentar as colunas ao modelo**

Em `backend/app/models/card_task.py`, junto das outras colunas de reunião
(perto de `meeting_provider`):

```python
    # Tipo escolhido pelo vendedor ao criar a reunião. Nulo nas reuniões
    # criadas antes de 09/2026 — e reunião sem tipo não é avaliada sozinha.
    meeting_kind = Column(String(30), nullable=True, index=True)

    # Endereços que receberam o convite, como escolhidos na criação
    invited_emails = Column(JSON, nullable=True)
```

Se `JSON` ainda não estiver importado no arquivo, acrescente ao import do
SQLAlchemy:

```python
from sqlalchemy import JSON
```

- [ ] **Step 4: Escrever a migration**

```python
# backend/alembic/versions/2026_09_24_1000-b6c7d8e9f0a1_tipo_e_convidados.py
"""tipo da reuniao e convidados do convite

Revision ID: b6c7d8e9f0a1
Revises: a5b6c7d8e9f0
Create Date: 2026-09-24 10:00:00

Duas colunas em card_tasks, as duas nulas: nenhuma reuniao existente precisa
ser alterada, e reuniao sem tipo nao entra na avaliacao automatica.

Somente acrescimos.
"""
from alembic import op
import sqlalchemy as sa


revision = 'b6c7d8e9f0a1'
down_revision = 'a5b6c7d8e9f0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'card_tasks',
        sa.Column(
            'meeting_kind', sa.String(30), nullable=True,
            comment='Tipo da reuniao: apresentacao_phoebus, duvidas_phoebus, apresentacao, duvidas, outra',
        ),
    )
    op.create_index('ix_card_tasks_meeting_kind', 'card_tasks', ['meeting_kind'])
    op.add_column(
        'card_tasks',
        sa.Column(
            'invited_emails', sa.JSON(), nullable=True,
            comment='Enderecos que receberam o convite',
        ),
    )


def downgrade():
    op.drop_index('ix_card_tasks_meeting_kind', table_name='card_tasks')
    op.drop_column('card_tasks', 'invited_emails')
    op.drop_column('card_tasks', 'meeting_kind')
```

- [ ] **Step 5: Rodar os testes e conferir a migration**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_modelo_tipo_convidados.py -v
MSYS_NO_PATHCONV=1 docker exec -w /app hsgrowth-api-local alembic heads
```

Esperado: 2 passed, e `b6c7d8e9f0a1 (head)` — uma cabeça só. **Não rodar
`alembic upgrade` aqui:** o container local aponta para o banco de produção, e
aplicar é passo de deploy, com autorização.

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/card_task.py backend/alembic/versions/2026_09_24_1000-b6c7d8e9f0a1_tipo_e_convidados.py backend/tests/unit/test_modelo_tipo_convidados.py
git commit -m "feat(reunioes): colunas do tipo da reuniao e dos convidados"
```

---

## Task 3: O título montado na criação e na edição

**Files:**
- Modify: `backend/app/schemas/card_task.py` (`CardTaskCreate`, `CardTaskUpdate`, `CardTaskResponse`)
- Modify: `backend/app/services/card_task_service.py` (`create_task`, `update_task`)
- Test: `backend/tests/unit/test_titulo_da_reuniao.py`

- [ ] **Step 1: Escrever o teste**

```python
# backend/tests/unit/test_titulo_da_reuniao.py
"""
O título da reunião é montado pelo servidor, não pela tela.

Se fosse montado no navegador, bastaria uma chamada pela API para o padrão
furar — e o padrão é justamente o que a consultora pediu.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.fixture
def cliente_com_razao_social(db: Session, test_card):
    from app.models.client import Client

    cliente = Client(name="Contato ACME", company_name="ACME TRANSPORTES LTDA")
    db.add(cliente)
    db.commit()
    test_card.client_id = cliente.id
    db.commit()
    return cliente


def _criar(client, headers, card_id, **campos):
    corpo = {
        "card_id": card_id,
        "title": "qualquer coisa",
        "task_type": "meeting",
        "due_date": "2026-10-01T14:00:00",
        "duration_minutes": 30,
    }
    corpo.update(campos)
    return client.post("/api/v1/card-tasks", json=corpo, headers=headers)


class TestCriacao:

    def test_titulo_sai_do_tipo_e_da_razao_social(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        r = _criar(
            client, salesperson_headers, test_card.id,
            meeting_kind="apresentacao_phoebus",
        )

        assert r.status_code == 201
        assert r.json()["title"] == "Apresentação Phoebus - ACME TRANSPORTES LTDA"

    def test_titulo_enviado_pela_tela_e_ignorado(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        """Quem manda no texto é o servidor."""
        r = _criar(
            client, salesperson_headers, test_card.id,
            meeting_kind="duvidas", title="reunião do jeito que eu quiser",
        )

        assert r.json()["title"] == "Dúvidas - ACME TRANSPORTES LTDA"

    def test_tipo_outra_mantem_o_titulo_digitado(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        r = _criar(
            client, salesperson_headers, test_card.id,
            meeting_kind="outra", title="Alinhamento com a equipe técnica",
        )

        assert r.json()["title"] == "Alinhamento com a equipe técnica"

    def test_sem_cliente_vinculado_usa_o_nome_do_negocio(
        self, client: TestClient, salesperson_headers, test_card
    ):
        r = _criar(client, salesperson_headers, test_card.id, meeting_kind="apresentacao")

        assert r.json()["title"] == f"Apresentação - {test_card.title}"

    def test_sem_tipo_continua_como_antes(
        self, client: TestClient, salesperson_headers, test_card
    ):
        """Integração e reunião criada por outro caminho não podem quebrar."""
        r = _criar(client, salesperson_headers, test_card.id, title="Reunião sem tipo")

        assert r.status_code == 201
        assert r.json()["title"] == "Reunião sem tipo"

    def test_tipo_inventado_e_recusado(
        self, client: TestClient, salesperson_headers, test_card
    ):
        r = _criar(client, salesperson_headers, test_card.id, meeting_kind="churrasco")

        assert r.status_code == 422

    def test_tipo_volta_na_resposta(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        r = _criar(client, salesperson_headers, test_card.id, meeting_kind="duvidas_phoebus")

        assert r.json()["meeting_kind"] == "duvidas_phoebus"


class TestEdicao:

    def test_trocar_o_tipo_remonta_o_titulo(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        criada = _criar(
            client, salesperson_headers, test_card.id, meeting_kind="duvidas"
        ).json()

        r = client.put(
            f"/api/v1/card-tasks/{criada['id']}",
            json={"meeting_kind": "apresentacao_phoebus"},
            headers=salesperson_headers,
        )

        assert r.status_code == 200
        assert r.json()["title"] == "Apresentação Phoebus - ACME TRANSPORTES LTDA"

    def test_mudar_para_outra_aceita_o_titulo_digitado(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        criada = _criar(
            client, salesperson_headers, test_card.id, meeting_kind="apresentacao"
        ).json()

        r = client.put(
            f"/api/v1/card-tasks/{criada['id']}",
            json={"meeting_kind": "outra", "title": "Conversa com o jurídico"},
            headers=salesperson_headers,
        )

        assert r.json()["title"] == "Conversa com o jurídico"

    def test_editar_so_o_horario_nao_mexe_no_titulo(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        criada = _criar(
            client, salesperson_headers, test_card.id, meeting_kind="apresentacao"
        ).json()

        r = client.put(
            f"/api/v1/card-tasks/{criada['id']}",
            json={"due_date": "2026-10-02T15:00:00"},
            headers=salesperson_headers,
        )

        assert r.json()["title"] == "Apresentação - ACME TRANSPORTES LTDA"
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_titulo_da_reuniao.py -v
```

Esperado: FAIL — o campo `meeting_kind` ainda não existe no schema, então o
título vem como foi enviado.

- [ ] **Step 3: Acrescentar os campos aos schemas**

Em `backend/app/schemas/card_task.py`, dentro de `CardTaskCreate`, junto dos
outros campos:

```python
    meeting_kind: Optional[str] = Field(
        None, description="Tipo da reunião: apresentacao_phoebus, duvidas_phoebus, apresentacao, duvidas, outra"
    )
    invited_emails: Optional[List[EmailStr]] = Field(
        None, description="Endereços que recebem o convite"
    )

    @field_validator("meeting_kind")
    @classmethod
    def tipo_precisa_existir(cls, valor):
        """Tipo inventado viraria título estranho e nota fora do lugar."""
        from app.services.reunioes.tipos import tipo_por_id

        if valor is not None and tipo_por_id(valor) is None:
            raise ValueError("Tipo de reunião desconhecido")
        return valor
```

O mesmo par de campos e o mesmo validador em `CardTaskUpdate`.

Em `CardTaskResponse`, para a tela receber de volta:

```python
    meeting_kind: Optional[str] = None
    invited_emails: Optional[List[str]] = None
```

No topo do arquivo, garanta os imports:

```python
from typing import List, Optional

from pydantic import EmailStr, field_validator
```

- [ ] **Step 4: Montar o título no serviço**

Em `backend/app/services/card_task_service.py`, dentro de `create_task`, logo
depois do bloco que busca o card da reunião (onde hoje está a validação de
vendedor vinculado):

```python
        if task_type_value == "meeting":
            # O título padronizado é responsabilidade do servidor: a tela só
            # mostra a prévia. Assim o padrão não depende de cada vendedor
            # lembrar de escrever igual — nem de quem chama a API.
            from app.services.reunioes.tipos import montar_titulo

            titulo_padrao = montar_titulo(task_data.meeting_kind, card)
            if titulo_padrao:
                task_data.title = titulo_padrao
```

E em `update_task`, antes de aplicar as mudanças na tarefa:

```python
        # Trocar o tipo remonta o título; em "Outra" vale o que foi digitado.
        if task_update.meeting_kind is not None:
            from app.models.card import Card
            from app.services.reunioes.tipos import montar_titulo

            card = self.db.query(Card).filter(Card.id == task.card_id).first()
            titulo_padrao = montar_titulo(task_update.meeting_kind, card)
            if titulo_padrao:
                task_update.title = titulo_padrao
```

- [ ] **Step 5: Rodar os testes**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_titulo_da_reuniao.py -v
```

Esperado: 10 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/card_task.py backend/app/services/card_task_service.py backend/tests/unit/test_titulo_da_reuniao.py
git commit -m "feat(reunioes): titulo padronizado montado no servidor"
```

---

## Task 4: A avaliação automática passa a olhar o tipo

**Files:**
- Create: `backend/app/services/avaliacao_reuniao/automatica.py`
- Modify: `backend/app/services/recording_service.py` (usa o módulo novo)
- Modify: `backend/app/api/v1/endpoints/card_tasks.py` (Teams, em `fetch_transcript`)
- Test: `backend/tests/unit/test_avaliacao_automatica.py`

Hoje a decisão está em `_avaliar_pelo_roteiro`, dentro do
`recording_service`. Ela sai de lá porque o Teams precisa da mesma regra, e
duplicá-la significaria que um dia as duas divergiriam.

- [ ] **Step 1: Escrever o teste**

```python
# backend/tests/unit/test_avaliacao_automatica.py
"""
Quando a avaliação pela régua roda sozinha.

Uma regra só para os dois fluxos: chegou transcrição + tipo avaliado. No CRM a
transcrição chega sozinha; no Teams, com o clique em "Analisar Reunião".
"""
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.models.card_task import CardTask
from app.services.avaliacao_reuniao.automatica import avaliar_se_for_o_caso

RESULTADO = {
    "itens": [
        {"criterio_id": "A1", "bloco": "Abertura", "peso": 100, "nota": 2,
         "evidencia": "Sou o Miguel", "porque": "apresentou-se"},
    ],
    "score": 100.0,
    "veredito": "Call padrão ouro",
    "cobertura": 1.0,
    "medias_por_bloco": {"Abertura": 100},
    "desfecho": "Proposta pedida",
    "ponto_forte": "Mapeou o processo",
    "foco_desenvolvimento": "Conectar dor e risco",
    "proxima_acao": "Perguntar quem aprova",
    "modelo": "gpt-4o",
    "latencia_ms": 1000,
    "tokens_entrada": 100,
    "tokens_saida": 10,
}


@pytest.fixture(autouse=True)
def chave_presente(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.OPENAI_API_KEY", "chave-de-teste")


def _reuniao(db, card, responsavel, tipo=None) -> CardTask:
    task = CardTask(
        card_id=card.id,
        title="Reunião",
        task_type="meeting",
        assigned_to_id=responsavel.id,
        meeting_kind=tipo,
        transcript_raw="WEBVTT\n\nconversa",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


class TestQuandoAvalia:

    def test_apresentacao_phoebus_e_avaliada(
        self, db: Session, test_card, test_salesperson_user
    ):
        task = _reuniao(db, test_card, test_salesperson_user, "apresentacao_phoebus")

        with patch("app.services.avaliacao_reuniao.servico.avaliar",
                   MagicMock(return_value=RESULTADO)):
            avaliou = avaliar_se_for_o_caso(db, task, task.transcript_raw)

        assert avaliou is True
        db.refresh(task)
        assert task.evaluation.score == 100.0
        assert task.evaluation.avaliado_por_id is None

    def test_duvidas_nao_e_avaliada(self, db: Session, test_card, test_salesperson_user):
        """A régua é de apresentação; tira-dúvidas receberia nota do que não fez."""
        task = _reuniao(db, test_card, test_salesperson_user, "duvidas_phoebus")
        avaliar = MagicMock(return_value=RESULTADO)

        with patch("app.services.avaliacao_reuniao.servico.avaliar", avaliar):
            avaliou = avaliar_se_for_o_caso(db, task, task.transcript_raw)

        assert avaliou is False
        avaliar.assert_not_called()

    def test_reuniao_sem_tipo_nao_e_avaliada(
        self, db: Session, test_card, test_salesperson_user
    ):
        """Todas as reuniões criadas antes desta mudança estão assim."""
        task = _reuniao(db, test_card, test_salesperson_user, None)
        avaliar = MagicMock(return_value=RESULTADO)

        with patch("app.services.avaliacao_reuniao.servico.avaliar", avaliar):
            assert avaliar_se_for_o_caso(db, task, task.transcript_raw) is False

        avaliar.assert_not_called()

    def test_sem_transcricao_nao_avalia(self, db: Session, test_card, test_salesperson_user):
        task = _reuniao(db, test_card, test_salesperson_user, "apresentacao_phoebus")
        avaliar = MagicMock(return_value=RESULTADO)

        with patch("app.services.avaliacao_reuniao.servico.avaliar", avaliar):
            assert avaliar_se_for_o_caso(db, task, "   ") is False

        avaliar.assert_not_called()

    def test_nao_passa_por_cima_de_avaliacao_existente(
        self, db: Session, test_card, test_salesperson_user
    ):
        from app.models.meeting_evaluation import MeetingEvaluation

        task = _reuniao(db, test_card, test_salesperson_user, "apresentacao_phoebus")
        db.add(MeetingEvaluation(
            card_task_id=task.id, versao_criterios="2026-09", score=40.0,
        ))
        db.commit()
        avaliar = MagicMock(return_value=RESULTADO)

        with patch("app.services.avaliacao_reuniao.servico.avaliar", avaliar):
            assert avaliar_se_for_o_caso(db, task, task.transcript_raw) is False

        avaliar.assert_not_called()

    def test_sem_chave_da_ia_nem_tenta(
        self, db: Session, test_card, test_salesperson_user, monkeypatch
    ):
        monkeypatch.setattr("app.core.config.settings.OPENAI_API_KEY", "")
        task = _reuniao(db, test_card, test_salesperson_user, "apresentacao_phoebus")
        avaliar = MagicMock(return_value=RESULTADO)

        with patch("app.services.avaliacao_reuniao.servico.avaliar", avaliar):
            assert avaliar_se_for_o_caso(db, task, task.transcript_raw) is False

        avaliar.assert_not_called()

    def test_falha_da_ia_nao_levanta(self, db: Session, test_card, test_salesperson_user):
        """Quem chama está no meio de um processamento que já deu certo."""
        task = _reuniao(db, test_card, test_salesperson_user, "apresentacao_phoebus")

        with patch("app.services.avaliacao_reuniao.servico.avaliar",
                   MagicMock(side_effect=ValueError("modelo fora do ar"))):
            assert avaliar_se_for_o_caso(db, task, task.transcript_raw) is False
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_avaliacao_automatica.py -v
```

Esperado: FAIL com `ModuleNotFoundError: No module named 'app.services.avaliacao_reuniao.automatica'`.

- [ ] **Step 3: Escrever o módulo**

```python
# backend/app/services/avaliacao_reuniao/automatica.py
"""
Quando a avaliação pela régua roda sozinha.

Uma regra só para os dois fluxos:

    chegou transcrição  +  tipo avaliado  →  avalia

No CRM a transcrição chega sozinha depois da reunião gravada. No Teams ela
chega com o clique em "Analisar Reunião", porque a transcrição pertence a quem
organizou a reunião — e a avaliação sai no mesmo clique.

Duas regras, uma por tecnologia, ninguém decora; e duplicar a decisão em dois
lugares significaria que um dia elas divergiriam.
"""
from sqlalchemy.orm import Session

from app.models.card_task import CardTask


def avaliar_se_for_o_caso(db: Session, task: CardTask, transcricao: str) -> bool:
    """
    Avalia a reunião pela régua, se ela for do tipo que se avalia.

    Nunca levanta: quem chama está no meio de um processamento que já deu
    certo, e a transcrição e a análise não podem ser perdidas por causa disto.

    Returns:
        True se a avaliação foi gravada.
    """
    from app.core.config import settings
    from app.models.meeting_evaluation import MeetingEvaluation
    from app.services.reunioes.tipos import e_avaliado

    if not e_avaliado(task.meeting_kind):
        return False

    if not (transcricao or "").strip():
        return False

    if not settings.OPENAI_API_KEY:
        return False

    # Alguém já avaliou (reprocessamento, ou um clique que chegou antes):
    # não passa por cima de uma avaliação que outra pessoa pediu.
    if db.query(MeetingEvaluation).filter(MeetingEvaluation.card_task_id == task.id).first():
        return False

    try:
        from app.services.avaliacao_reuniao import servico
        from app.services.avaliacao_reuniao.gravar import gravar_avaliacao

        contexto = f"Negócio: {task.card.title}" if task.card else ""
        resultado = servico.avaliar(transcricao, contexto)
        gravar_avaliacao(db, task, resultado, avaliado_por_id=None)
        print(f"[AVALIACAO] Reuniao {task.id} avaliada automaticamente")
        return True
    except Exception as e:
        db.rollback()
        print(f"[AVALIACAO] Falhou na reuniao {task.id}: {e}")
        return False
```

- [ ] **Step 4: Apontar o `recording_service` para o módulo novo**

Em `backend/app/services/recording_service.py`, **apague** a função
`_avaliar_pelo_roteiro` inteira e troque a chamada:

```python
        from app.services.avaliacao_reuniao.automatica import avaliar_se_for_o_caso

        avaliada = avaliar_se_for_o_caso(db, task, vtt)
```

- [ ] **Step 5: Avaliar junto no fluxo do Teams**

Em `backend/app/api/v1/endpoints/card_tasks.py`, no endpoint
`fetch_transcript`, depois do bloco que grava `task.transcript_analysis` e
antes do `db.commit()` final:

```python
    # Apresentação Phoebus sai avaliada no mesmo clique: a transcrição do
    # Teams só chega aqui, com o acesso de quem organizou a reunião.
    from app.services.avaliacao_reuniao.automatica import avaliar_se_for_o_caso

    avaliar_se_for_o_caso(db, task, vtt_content)
```

- [ ] **Step 6: Rodar os testes**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_avaliacao_automatica.py tests/unit/test_recording_service.py -v
```

Esperado: 7 novos + os 39 de gravação passando. Os testes de
`TestAvaliacaoAutomatica` em `test_recording_service.py` precisam de ajuste:
as reuniões deles passam a precisar de `meeting_kind="apresentacao_phoebus"`
na fixture, senão deixam de ser avaliadas — que é o comportamento novo e
correto.

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/avaliacao_reuniao/automatica.py backend/app/services/recording_service.py backend/app/api/v1/endpoints/card_tasks.py backend/tests/unit/test_avaliacao_automatica.py backend/tests/unit/test_recording_service.py
git commit -m "feat(avaliacao-reuniao): avaliar so o tipo Apresentacao Phoebus, no CRM e no Teams"
```

---

## Task 5: A rota de sugestões (tipos com título e convidados)

A tela precisa mostrar a prévia do título e a lista de endereços. Nenhuma das
duas coisas pode ser montada no navegador: a prévia tem de ser exatamente o
que o servidor vai gravar, e a lista de e-mails vem de três cadastros
diferentes.

**Files:**
- Create: `backend/app/services/reunioes/convidados.py`
- Modify: `backend/app/api/v1/endpoints/card_tasks.py` (rota nova)
- Test: `backend/tests/unit/test_sugestoes_de_reuniao.py`

**Atenção:** a rota nova precisa ser declarada **antes** de `/{task_id}` no
arquivo. Declarada depois, o FastAPI tenta casar "sugestoes-de-reuniao" com o
parâmetro `task_id` e devolve 422.

- [ ] **Step 1: Escrever o teste**

```python
# backend/tests/unit/test_sugestoes_de_reuniao.py
"""
O que a tela de Nova Reunião precisa saber antes de o vendedor preencher.

A prévia do título tem de ser idêntica ao que o servidor vai gravar, e a lista
de endereços vem de três cadastros diferentes — por isso vem pronta daqui, em
vez de o navegador remontar a regra.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.fixture
def card_completo(db: Session, test_card, test_salesperson_user):
    """Negócio com cliente, contato e vendedor — o caso comum."""
    from app.models.client import Client
    from app.models.person import Person

    cliente = Client(
        name="Contato ACME",
        company_name="ACME TRANSPORTES LTDA",
        email="contato@acme.com",
    )
    pessoa = Person(
        name="Maria",
        email="maria@acme.com",
        email_commercial="comercial@acme.com",
    )
    db.add_all([cliente, pessoa])
    db.commit()

    test_card.client_id = cliente.id
    test_card.person_id = pessoa.id
    test_card.assigned_to_id = test_salesperson_user.id
    db.commit()
    return test_card


class TestTipos:

    def test_devolve_os_cinco_com_a_previa_do_titulo(
        self, client: TestClient, salesperson_headers, card_completo
    ):
        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        assert r.status_code == 200
        tipos = r.json()["tipos"]
        assert len(tipos) == 5

        apresentacao = next(t for t in tipos if t["id"] == "apresentacao_phoebus")
        assert apresentacao["titulo"] == "Apresentação Phoebus - ACME TRANSPORTES LTDA"
        assert apresentacao["avaliado"] is True

    def test_tipo_livre_nao_tem_previa(
        self, client: TestClient, salesperson_headers, card_completo
    ):
        """Em "Outra" o título é o que o vendedor escrever."""
        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        outra = next(t for t in r.json()["tipos"] if t["id"] == "outra")
        assert outra["titulo"] is None


class TestConvidados:

    def test_lista_os_enderecos_conhecidos(
        self, client: TestClient, salesperson_headers, card_completo, test_salesperson_user
    ):
        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        enderecos = {c["email"]: c for c in r.json()["convidados"]}
        assert set(enderecos) == {
            test_salesperson_user.email,
            "maria@acme.com",
            "comercial@acme.com",
            "contato@acme.com",
        }

    def test_vendedor_e_contato_principal_vem_marcados(
        self, client: TestClient, salesperson_headers, card_completo, test_salesperson_user
    ):
        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        marcados = {c["email"] for c in r.json()["convidados"] if c["marcado"]}
        assert marcados == {test_salesperson_user.email, "maria@acme.com"}

    def test_cada_endereco_tem_rotulo(
        self, client: TestClient, salesperson_headers, card_completo
    ):
        """O vendedor precisa saber de quem é cada e-mail antes de marcar."""
        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        rotulos = {c["email"]: c["rotulo"] for c in r.json()["convidados"]}
        assert rotulos["maria@acme.com"] == "Contato (principal)"
        assert rotulos["comercial@acme.com"] == "Contato (comercial)"
        assert rotulos["contato@acme.com"] == "Empresa"

    def test_endereco_repetido_aparece_uma_vez(
        self, client: TestClient, salesperson_headers, card_completo, db
    ):
        from app.models.person import Person

        pessoa = db.query(Person).filter(Person.id == card_completo.person_id).first()
        pessoa.email_personal = pessoa.email
        db.commit()

        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        emails = [c["email"] for c in r.json()["convidados"]]
        assert len(emails) == len(set(emails))

    def test_negocio_sem_contato_lista_so_o_vendedor(
        self, client: TestClient, salesperson_headers, test_card, test_salesperson_user, db
    ):
        test_card.person_id = None
        test_card.client_id = None
        test_card.assigned_to_id = test_salesperson_user.id
        db.commit()

        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={test_card.id}",
            headers=salesperson_headers,
        )

        assert [c["email"] for c in r.json()["convidados"]] == [test_salesperson_user.email]


class TestAcesso:

    def test_negocio_inexistente(self, client: TestClient, salesperson_headers):
        r = client.get(
            "/api/v1/card-tasks/sugestoes-de-reuniao?card_id=99999999",
            headers=salesperson_headers,
        )

        assert r.status_code == 404

    def test_exige_autenticacao(self, client: TestClient, test_card):
        r = client.get(f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={test_card.id}")

        assert r.status_code in (401, 403)
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_sugestoes_de_reuniao.py -v
```

Esperado: FAIL com 422 — sem a rota, o FastAPI casa a URL com `/{task_id}`.

- [ ] **Step 3: Escrever o módulo dos convidados**

```python
# backend/app/services/reunioes/convidados.py
"""
Quem o sistema sugere para receber o convite da reunião.

Os endereços vêm de três cadastros — o vendedor, a pessoa de contato e a
empresa —, e o vendedor decide quais usar. Antes a lista era montada em
silêncio e ninguém via quem ia receber.

Vêm marcados o vendedor e o e-mail principal do contato: é o convite que
sempre precisou sair. Os outros ficam à mão, desmarcados, porque mandar
convite para três caixas da mesma pessoa não é o padrão de ninguém.
"""
from typing import List

from sqlalchemy.orm import Session

from app.models.card import Card


def sugerir_convidados(db: Session, card: Card) -> List[dict]:
    """
    Returns:
        Lista de `{email, rotulo, marcado}`, sem endereços repetidos, na ordem
        em que a tela deve mostrar.
    """
    from app.models.person import Person

    candidatos = []

    if card.assigned_to and card.assigned_to.email:
        candidatos.append((card.assigned_to.email, "Vendedor", True))

    if card.person_id:
        pessoa = db.query(Person).filter(Person.id == card.person_id).first()
        if pessoa:
            candidatos.extend([
                (pessoa.email, "Contato (principal)", True),
                (pessoa.email_commercial, "Contato (comercial)", False),
                (pessoa.email_personal, "Contato (pessoal)", False),
            ])

    if card.client and card.client.email:
        candidatos.append((card.client.email, "Empresa", False))

    convidados: List[dict] = []
    vistos = set()
    for email, rotulo, marcado in candidatos:
        endereco = (email or "").strip()
        if not endereco or endereco.lower() in vistos:
            continue
        vistos.add(endereco.lower())
        convidados.append({"email": endereco, "rotulo": rotulo, "marcado": marcado})

    return convidados
```

- [ ] **Step 4: Escrever a rota**

Em `backend/app/api/v1/endpoints/card_tasks.py`, **antes** da primeira rota
que usa `/{task_id}`:

```python
@router.get(
    "/sugestoes-de-reuniao",
    summary="Tipos e convidados sugeridos para uma nova reunião",
    description="""
    Devolve os tipos de reunião com a prévia do título de cada um e os
    endereços que o sistema conhece para o convite.

    A prévia sai daqui, e não do navegador, para ser exatamente o título que
    será gravado.
    """,
)
def sugestoes_de_reuniao(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.models.card import Card
    from app.services.reunioes.convidados import sugerir_convidados
    from app.services.reunioes.tipos import TIPOS, montar_titulo

    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Negócio não encontrado")

    return {
        "tipos": [
            {
                "id": tipo.id,
                "rotulo": tipo.rotulo,
                "avaliado": tipo.avaliado,
                "titulo": montar_titulo(tipo.id, card),
            }
            for tipo in TIPOS
        ],
        "convidados": sugerir_convidados(db, card),
    }
```

- [ ] **Step 5: Rodar os testes**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_sugestoes_de_reuniao.py -v
```

Esperado: 10 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/reunioes/convidados.py backend/app/api/v1/endpoints/card_tasks.py backend/tests/unit/test_sugestoes_de_reuniao.py
git commit -m "feat(reunioes): rota de sugestoes com previa do titulo e convidados"
```

---

## Task 6: O convite vai para quem foi escolhido

**Files:**
- Modify: `backend/app/services/microsoft_graph_service.py` (devolver quantos foram removidos)
- Modify: `backend/app/api/v1/endpoints/card_tasks.py` (Teams e Daily usam `invited_emails`)
- Test: `backend/tests/unit/test_convidados_do_convite.py`

- [ ] **Step 1: Escrever o teste**

```python
# backend/tests/unit/test_convidados_do_convite.py
"""
Quem recebe o convite é quem o vendedor marcou.

Antes a lista era montada em silêncio (vendedor + os três e-mails do contato),
e a trava de ambiente removia os externos sem avisar ninguém — o vendedor
achava que tinha convidado o cliente.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.card_task import CardTask


@pytest.fixture
def reuniao(db: Session, test_card, test_salesperson_user) -> CardTask:
    from datetime import datetime

    task = CardTask(
        card_id=test_card.id,
        title="Apresentação Phoebus - ACME",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_kind="apresentacao_phoebus",
        due_date=datetime(2026, 10, 1, 14, 0),
        duration_minutes=30,
        invited_emails=["cliente@acme.com", "socio@acme.com"],
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


class TestTeams:

    def test_convida_quem_foi_escolhido(self, client: TestClient, salesperson_headers, reuniao):
        criar = MagicMock(return_value={
            "meeting_id": "m1", "join_url": "https://teams/x", "event_id": "e1",
            "convidados_removidos": 0,
        })

        with patch("app.services.microsoft_graph_service.microsoft_graph_service.create_calendar_event", criar):
            r = client.post(
                f"/api/v1/card-tasks/{reuniao.id}/teams-meeting", headers=salesperson_headers
            )

        assert r.status_code in (200, 201)
        assert criar.call_args.kwargs["attendee_emails"] == [
            "cliente@acme.com", "socio@acme.com"
        ]

    def test_sem_lista_mantem_o_comportamento_antigo(
        self, client: TestClient, salesperson_headers, reuniao, db
    ):
        """Chamada pela API, ou reunião criada antes desta mudança."""
        reuniao.invited_emails = None
        db.commit()

        criar = MagicMock(return_value={
            "meeting_id": "m1", "join_url": "https://teams/x", "event_id": "e1",
            "convidados_removidos": 0,
        })

        with patch("app.services.microsoft_graph_service.microsoft_graph_service.create_calendar_event", criar):
            client.post(
                f"/api/v1/card-tasks/{reuniao.id}/teams-meeting", headers=salesperson_headers
            )

        # o vendedor do negócio continua entrando sozinho
        assert criar.call_args.kwargs["attendee_emails"] is not None


class TestAvisoDaTrava:

    def test_avisa_quando_a_trava_remove_convidados(
        self, client: TestClient, salesperson_headers, reuniao
    ):
        """
        Sem este aviso o vendedor acha que convidou o cliente e não convidou —
        foi o que os vendedores relataram em 22/09.
        """
        criar = MagicMock(return_value={
            "meeting_id": "m1", "join_url": "https://teams/x", "event_id": "e1",
            "convidados_removidos": 2,
        })

        with patch("app.services.microsoft_graph_service.microsoft_graph_service.create_calendar_event", criar):
            r = client.post(
                f"/api/v1/card-tasks/{reuniao.id}/teams-meeting", headers=salesperson_headers
            )

        assert r.json()["convidados_removidos"] == 2

    def test_sem_remocao_nao_avisa(self, client: TestClient, salesperson_headers, reuniao):
        criar = MagicMock(return_value={
            "meeting_id": "m1", "join_url": "https://teams/x", "event_id": "e1",
            "convidados_removidos": 0,
        })

        with patch("app.services.microsoft_graph_service.microsoft_graph_service.create_calendar_event", criar):
            r = client.post(
                f"/api/v1/card-tasks/{reuniao.id}/teams-meeting", headers=salesperson_headers
            )

        assert r.json()["convidados_removidos"] == 0


class TestQuantosForamRemovidos:

    def test_conta_os_externos_cortados(self, monkeypatch):
        """A trava existe para não disparar convite a cliente real em teste."""
        from app.services.microsoft_graph_service import microsoft_graph_service

        monkeypatch.setattr(settings, "DAILY_DEV_MODE", True)
        monkeypatch.setattr(settings, "DAILY_INTERNAL_EMAIL_DOMAIN", "healthsafetytech.com")

        restantes, removidos = microsoft_graph_service._filtrar_convidados(
            ["welton@healthsafetytech.com", "cliente@acme.com", "socio@acme.com"]
        )

        assert restantes == ["welton@healthsafetytech.com"]
        assert removidos == 2

    def test_sem_a_trava_ninguem_e_cortado(self, monkeypatch):
        from app.services.microsoft_graph_service import microsoft_graph_service

        monkeypatch.setattr(settings, "DAILY_DEV_MODE", False)

        restantes, removidos = microsoft_graph_service._filtrar_convidados(
            ["welton@healthsafetytech.com", "cliente@acme.com"]
        )

        assert len(restantes) == 2
        assert removidos == 0
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_convidados_do_convite.py -v
```

Esperado: FAIL — `_filtrar_convidados` não existe e a resposta não traz
`convidados_removidos`.

- [ ] **Step 3: Separar a trava numa função que conta**

Em `backend/app/services/microsoft_graph_service.py`, acrescente o método e
troque o bloco que hoje filtra dentro de `create_calendar_event`:

```python
    def _filtrar_convidados(self, attendee_emails: list) -> tuple:
        """
        Aplica a trava de ambiente e diz quantos endereços foram cortados.

        `DAILY_DEV_MODE` existe para não disparar convite a cliente real em
        homologação. O problema nunca foi a trava, e sim o silêncio: ela
        removia os externos e registrava isso só no log do servidor, então o
        vendedor achava que tinha convidado o cliente.

        Returns:
            (endereços que ficam, quantos foram removidos)
        """
        if not attendee_emails or not settings.DAILY_DEV_MODE:
            return list(attendee_emails or []), 0

        dominio = (settings.DAILY_INTERNAL_EMAIL_DOMAIN or "").lower()
        restantes = [
            e for e in attendee_emails
            if e and e.lower().strip().endswith(f"@{dominio}")
        ]
        removidos = len(attendee_emails) - len(restantes)
        if removidos:
            print(f"[DAILY_DEV_MODE] {removidos} convidado(s) externo(s) removido(s) do convite.")

        return restantes, removidos
```

Dentro de `create_calendar_event`, no lugar do bloco antigo:

```python
        attendee_emails, convidados_removidos = self._filtrar_convidados(attendee_emails)
```

E, no `return` do método, acrescente a chave:

```python
                return {
                    "meeting_id": "",
                    "join_url": "",
                    "event_id": data.get("id", ""),
                    "convidados_removidos": convidados_removidos,
                }
```

Faça o mesmo em todos os `return` do método, para a chave existir sempre.

- [ ] **Step 4: Usar a lista escolhida nos dois fluxos**

Em `backend/app/api/v1/endpoints/card_tasks.py`, tanto no endpoint do Teams
(`/{task_id}/teams-meeting`, por volta da linha 948) quanto no da sala do CRM
(`/{task_id}/daily-room`, por volta da linha 1333), troque o bloco que monta
`attendee_emails` por:

```python
        # Quem o vendedor marcou na criação. Sem lista — chamada pela API, ou
        # reunião criada antes desta mudança — vale o comportamento antigo.
        if task.invited_emails:
            attendee_emails = list(task.invited_emails)
        else:
            attendee_emails = []
            if card and card.assigned_to and card.assigned_to.email:
                seller_email = card.assigned_to.email.strip()
                if seller_email and seller_email != current_user.email:
                    attendee_emails.append(seller_email)

            if card and card.person_id:
                person = db.query(Person).filter(Person.id == card.person_id).first()
                if person:
                    for email in [person.email, person.email_commercial, person.email_personal]:
                        if email and email.strip() and email.strip() not in attendee_emails:
                            attendee_emails.append(email.strip())
```

E, na resposta dos dois endpoints, devolva quantos foram removidos. Hoje o do
Teams termina assim:

```python
    service = CardTaskService(db)
    return service.get_task(task_id)
```

Troque por:

```python
    service = CardTaskService(db)
    resposta = service.get_task(task_id).model_dump()
    # A tela precisa saber que a trava cortou alguém: sem isto, o vendedor
    # acha que convidou o cliente e não convidou.
    resposta["convidados_removidos"] = result.get("convidados_removidos", 0)
    return resposta
```

O endpoint da sala do CRM (`/{task_id}/daily-room`) termina devolvendo o
`public_link`; acrescente a mesma chave ao dicionário que ele já monta.

Como o `response_model` desses endpoints é `CardTaskResponse`, a chave nova
seria descartada na serialização — **remova o `response_model=CardTaskResponse`
do decorador dos dois**, ou acrescente `convidados_removidos: int = 0` ao
`CardTaskResponse`. A segunda opção é melhor: mantém o contrato documentado.

- [ ] **Step 5: Rodar os testes**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_convidados_do_convite.py tests/unit/test_daily_outlook.py -v
```

Esperado: 6 novos passando e os de `test_daily_outlook.py` seguindo verdes.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/microsoft_graph_service.py backend/app/api/v1/endpoints/card_tasks.py backend/tests/unit/test_convidados_do_convite.py
git commit -m "feat(reunioes): convite vai para quem o vendedor escolheu, e a trava deixa de ser silenciosa"
```

---

## Task 7: Tipo na página de Reuniões

**Files:**
- Modify: `backend/app/api/v1/endpoints/reunioes.py`
- Test: `backend/tests/unit/test_endpoints_reunioes.py` (acrescentar)

- [ ] **Step 1: Escrever o teste**

Acrescente ao fim de `backend/tests/unit/test_endpoints_reunioes.py`:

```python
class TestTipoDaReuniao:
    """
    O recorte que a consultora vai querer: abrir a lista e ver só as
    apresentações.
    """

    def test_item_traz_o_tipo_e_o_rotulo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        task = criar_reuniao(db, test_card, test_salesperson_user, "Com tipo")
        task.meeting_kind = "apresentacao_phoebus"
        db.commit()

        item = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"][0]

        assert item["tipo_reuniao"] == "apresentacao_phoebus"
        assert item["tipo_reuniao_rotulo"] == "Apresentação Phoebus"

    def test_reuniao_antiga_sem_tipo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "Sem tipo")

        item = client.get("/api/v1/reunioes", headers=manager_headers).json()["items"][0]

        assert item["tipo_reuniao"] is None
        assert item["tipo_reuniao_rotulo"] is None

    def test_filtra_por_tipo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        apresentacao = criar_reuniao(db, test_card, test_salesperson_user, "Apresentação")
        apresentacao.meeting_kind = "apresentacao_phoebus"
        duvidas = criar_reuniao(db, test_card, test_salesperson_user, "Dúvidas", dias_atras=1)
        duvidas.meeting_kind = "duvidas"
        db.commit()

        r = client.get(
            "/api/v1/reunioes?tipo_reuniao=apresentacao_phoebus", headers=manager_headers
        )

        assert r.json()["total"] == 1
        assert r.json()["items"][0]["titulo"] == "Apresentação"

    def test_filtrar_por_sem_tipo(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        """As reuniões de antes da mudança — o gestor precisa conseguir achá-las."""
        com_tipo = criar_reuniao(db, test_card, test_salesperson_user, "Nova")
        com_tipo.meeting_kind = "duvidas"
        criar_reuniao(db, test_card, test_salesperson_user, "Antiga", dias_atras=1)
        db.commit()

        r = client.get("/api/v1/reunioes?tipo_reuniao=sem", headers=manager_headers)

        assert r.json()["total"] == 1
        assert r.json()["items"][0]["titulo"] == "Antiga"

    def test_lista_de_tipos_para_o_seletor(
        self, client: TestClient, manager_headers, db, test_card, test_salesperson_user
    ):
        criar_reuniao(db, test_card, test_salesperson_user, "A")

        corpo = client.get("/api/v1/reunioes", headers=manager_headers).json()

        ids = [t["id"] for t in corpo["tipos_de_reuniao"]]
        assert ids == [
            "apresentacao_phoebus", "duvidas_phoebus", "apresentacao", "duvidas", "outra"
        ]
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_endpoints_reunioes.py -k TestTipoDaReuniao -v
```

Esperado: FAIL com `KeyError: 'tipo_reuniao'`.

- [ ] **Step 3: Acrescentar o tipo ao endpoint**

Em `backend/app/api/v1/endpoints/reunioes.py`:

O parâmetro, junto dos outros filtros:

```python
    tipo_reuniao: Optional[str] = Query(
        None, description="Id do tipo, ou 'sem' para reuniões sem tipo"
    ),
```

O filtro, junto do filtro de veredito:

```python
    if tipo_reuniao == SEM_VINCULO:
        consulta = consulta.filter(CardTask.meeting_kind.is_(None))
    elif tipo_reuniao:
        consulta = consulta.filter(CardTask.meeting_kind == tipo_reuniao)
```

Em cada item da lista, junto de `"tipo"`:

```python
            "tipo_reuniao": t.meeting_kind,
            "tipo_reuniao_rotulo": (
                tipo_por_id(t.meeting_kind).rotulo if tipo_por_id(t.meeting_kind) else None
            ),
```

E, no retorno, a lista que enche o seletor:

```python
        "tipos_de_reuniao": [
            {"id": tipo.id, "rotulo": tipo.rotulo} for tipo in TIPOS
        ],
```

No topo do arquivo:

```python
from app.services.reunioes.tipos import TIPOS, tipo_por_id
```

- [ ] **Step 4: Rodar os testes**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/unit/test_endpoints_reunioes.py -v
```

Esperado: os 35 de antes + 5 novos = 40 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/reunioes.py backend/tests/unit/test_endpoints_reunioes.py
git commit -m "feat(reunioes): tipo da reuniao na listagem e no filtro"
```

---

# FASE B — a tela

## Task 8: Tipo e convidados no formulário de Nova Reunião

**Files:**
- Modify: `frontend/src/services/cardTaskService.ts` (tipos e a chamada de sugestões)
- Create: `frontend/src/components/cardDetails/ConvidadosDaReuniao.tsx`
- Modify: `frontend/src/components/cardDetails/MeetingSection.tsx`

- [ ] **Step 1: Tipos e chamada no serviço**

Em `frontend/src/services/cardTaskService.ts`, junto dos outros tipos:

```typescript
export interface TipoDeReuniao {
  id: string;
  rotulo: string;
  avaliado: boolean;
  /** Prévia do título; null em "Outra", onde o vendedor escreve. */
  titulo: string | null;
}

export interface ConvidadoSugerido {
  email: string;
  rotulo: string;
  marcado: boolean;
}

export interface SugestoesDeReuniao {
  tipos: TipoDeReuniao[];
  convidados: ConvidadoSugerido[];
}
```

E o método, junto dos outros:

```typescript
  /** Tipos com a prévia do título e os endereços conhecidos para o convite. */
  async sugestoesDeReuniao(cardId: number): Promise<SugestoesDeReuniao> {
    const response = await api.get("/api/v1/card-tasks/sugestoes-de-reuniao", {
      params: { card_id: cardId },
    });
    return response.data;
  },
```

- [ ] **Step 2: Escrever o componente dos convidados**

```tsx
// frontend/src/components/cardDetails/ConvidadosDaReuniao.tsx
import { useState } from "react";
import { Plus, X } from "lucide-react";

import { ConvidadoSugerido } from "../../services/cardTaskService";

const FORMATO_DE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  sugeridos: ConvidadoSugerido[];
  marcados: string[];
  onChange: (marcados: string[]) => void;
}

/**
 * Quem recebe o convite da reunião.
 *
 * Antes a lista era montada em silêncio e ninguém via quem ia receber — os
 * vendedores relataram convite que não chegava ao cliente. Agora os endereços
 * conhecidos aparecem, o vendedor marca quem quiser e acrescenta o que faltar.
 *
 * A validação confere só o formato: endereço válido mas errado vai para o
 * lugar errado, e o sistema não tem como saber.
 */
const ConvidadosDaReuniao: React.FC<Props> = ({ sugeridos, marcados, onChange }) => {
  const [novo, setNovo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const avulsos = marcados.filter(
    (email) => !sugeridos.some((s) => s.email.toLowerCase() === email.toLowerCase())
  );

  const alternar = (email: string) => {
    onChange(
      marcados.includes(email)
        ? marcados.filter((e) => e !== email)
        : [...marcados, email]
    );
  };

  const acrescentar = () => {
    const email = novo.trim();
    if (!email) return;

    if (!FORMATO_DE_EMAIL.test(email)) {
      setErro("E-mail inválido");
      return;
    }
    if (marcados.some((e) => e.toLowerCase() === email.toLowerCase())) {
      setErro("Esse e-mail já está na lista");
      return;
    }

    onChange([...marcados, email]);
    setNovo("");
    setErro(null);
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">
        Quem recebe o convite <span className="text-red-400">*</span>
      </label>

      <div className="space-y-1.5">
        {sugeridos.map((convidado) => (
          <label
            key={convidado.email}
            className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"
          >
            <input
              type="checkbox"
              checked={marcados.includes(convidado.email)}
              onChange={() => alternar(convidado.email)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-purple-500"
            />
            <span>{convidado.email}</span>
            <span className="text-[11px] text-slate-500">{convidado.rotulo}</span>
          </label>
        ))}

        {avulsos.map((email) => (
          <div key={email} className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked
              onChange={() => alternar(email)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-purple-500"
            />
            <span>{email}</span>
            <button
              type="button"
              onClick={() => alternar(email)}
              className="text-slate-500 transition-colors hover:text-slate-300"
              title="Remover"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          type="email"
          value={novo}
          onChange={(e) => {
            setNovo(e.target.value);
            setErro(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              acrescentar();
            }
          }}
          placeholder="Adicionar e-mail"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={acrescentar}
          className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 transition-colors hover:bg-slate-800"
        >
          <Plus size={14} />
        </button>
      </div>

      {erro && <p className="mt-1 text-[11px] text-red-400">{erro}</p>}

      {marcados.length === 0 && (
        <p className="mt-1 text-[11px] text-amber-400">
          Marque pelo menos um destinatário.
        </p>
      )}
    </div>
  );
};

export default ConvidadosDaReuniao;
```

- [ ] **Step 3: Ligar no formulário**

Em `frontend/src/components/cardDetails/MeetingSection.tsx`:

Imports:

```tsx
import cardTaskService, {
  AvaliacaoDaReuniao,
  CardTask,
  ConvidadoSugerido,
  SugestaoDaIA,
  TipoDeReuniao,
} from "../../services/cardTaskService";
import ConvidadosDaReuniao from "./ConvidadosDaReuniao";
```

Estados, junto dos outros:

```tsx
  const [tiposDeReuniao, setTiposDeReuniao] = useState<TipoDeReuniao[]>([]);
  const [convidadosSugeridos, setConvidadosSugeridos] = useState<ConvidadoSugerido[]>([]);
  const [tipoEscolhido, setTipoEscolhido] = useState("apresentacao_phoebus");
  const [convidados, setConvidados] = useState<string[]>([]);
```

Carregar as sugestões quando o modal abre (junto do `useEffect` que já existe
para o card):

```tsx
  // As sugestões vêm do servidor para a prévia do título ser exatamente o que
  // vai ser gravado — e para a lista de e-mails não ser remontada aqui.
  useEffect(() => {
    if (!showCreateModal) return;

    cardTaskService
      .sugestoesDeReuniao(cardId)
      .then((sugestoes) => {
        setTiposDeReuniao(sugestoes.tipos);
        setConvidadosSugeridos(sugestoes.convidados);
        setConvidados(sugestoes.convidados.filter((c) => c.marcado).map((c) => c.email));
      })
      .catch(() => {
        // sem sugestões o vendedor ainda consegue criar escolhendo "Outra"
      });
  }, [showCreateModal, cardId]);
```

O campo de tipo, **antes** do campo de título no modal:

```tsx
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Tipo de reunião <span className="text-red-400">*</span>
            </label>
            <select
              value={tipoEscolhido}
              onChange={(e) => setTipoEscolhido(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
            >
              {tiposDeReuniao.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.rotulo}
                  {tipo.avaliado ? " · avaliada pelo roteiro" : ""}
                </option>
              ))}
            </select>
          </div>
```

E o campo de título passa a aparecer só em "Outra"; nos demais, a prévia:

```tsx
          {tipoEscolhido === "outra" ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Alinhamento com a equipe técnica"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Título da reunião
              </label>
              <p className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-sm text-slate-400">
                {tiposDeReuniao.find((t) => t.id === tipoEscolhido)?.titulo || "—"}
              </p>
            </div>
          )}
```

A seção de convidados, depois de data e hora:

```tsx
          <ConvidadosDaReuniao
            sugeridos={convidadosSugeridos}
            marcados={convidados}
            onChange={setConvidados}
          />
```

No `handleCreate`, a validação e o envio:

```tsx
    if (tipoEscolhido === "outra" && !form.title.trim()) {
      showError("Escreva o título da reunião");
      return;
    }
    if (convidados.length === 0) {
      showError("Marque pelo menos um destinatário do convite");
      return;
    }
```

```tsx
        meeting_kind: tipoEscolhido,
        invited_emails: convidados,
```

E o aviso da trava. Ele **não** vem da criação da tarefa, e sim da criação da
sala ou da reunião do Teams — que é onde o convite sai. No `handleCreate`, os
dois pontos ficam assim:

```tsx
          const { public_link, convidados_removidos } =
            await cardTaskService.createDailyRoom(created.id);
          avisarConvidadosRemovidos(convidados_removidos);
```

```tsx
          const { convidados_removidos } =
            await cardTaskService.createTeamsMeeting(created.id);
          avisarConvidadosRemovidos(convidados_removidos);
```

Com a função auxiliar junto dos outros handlers:

```tsx
  /**
   * A trava de ambiente corta convidados externos e, até 22/09, registrava
   * isso só no log do servidor — o vendedor achava que tinha convidado o
   * cliente. Agora ele descobre na hora.
   */
  const avisarConvidadosRemovidos = (quantos?: number) => {
    if (!quantos) return;
    showError(
      `O convite não foi enviado para ${quantos} endereço(s) externo(s) ` +
        "(modo de desenvolvimento ligado)."
    );
  };
```

E os dois métodos do serviço passam a devolver a chave:

```typescript
  async createDailyRoom(taskId: number): Promise<{
    public_link: string;
    convidados_removidos?: number;
  }> {
```

```typescript
  async createTeamsMeeting(taskId: number): Promise<CardTask & {
    convidados_removidos?: number;
  }> {
```

- [ ] **Step 4: Conferir os tipos**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/cardTaskService.ts frontend/src/components/cardDetails/ConvidadosDaReuniao.tsx frontend/src/components/cardDetails/MeetingSection.tsx
git commit -m "feat(reunioes): tipo com previa do titulo e escolha dos convidados no formulario"
```

---

## Task 9: Coluna "Onde", coluna "Tipo" e filtro na página de Reuniões

**Files:**
- Modify: `frontend/src/services/reunioesService.ts`
- Modify: `frontend/src/pages/ReunioesPage.tsx`

- [ ] **Step 1: Tipos no serviço**

Em `frontend/src/services/reunioesService.ts`:

```typescript
export interface ReuniaoDaLista {
  // ...campos que já existem
  tipo_reuniao: string | null;
  tipo_reuniao_rotulo: string | null;
}

export interface RespostaDeReunioes {
  // ...campos que já existem
  tipos_de_reuniao: { id: string; rotulo: string }[];
}

export interface FiltrosDeReunioes {
  // ...campos que já existem
  /** Id do tipo, ou "sem" para reuniões sem tipo. */
  tipo_reuniao?: string;
}
```

- [ ] **Step 2: Coluna e filtro na página**

Em `frontend/src/pages/ReunioesPage.tsx`:

O estado, junto dos outros filtros:

```tsx
  const [tipoReuniao, setTipoReuniao] = useState("");
```

Na chamada:

```tsx
          tipo_reuniao: tipoReuniao || undefined,
```

Na dependência do `useCallback`, acrescente `tipoReuniao`. E no contador de
filtros ativos, acrescente `tipoReuniao`.

O campo no painel de filtros, depois do campo Estado:

```tsx
            <div className="min-w-[170px] flex-1">
              <label className={rotulo}>Tipo de reunião</label>
              <select
                value={tipoReuniao}
                onChange={(e) => aoFiltrar(() => setTipoReuniao(e.target.value))}
                className={campo}
              >
                <option value="">Todos os tipos</option>
                <option value="sem">Sem tipo</option>
                {dados?.tipos_de_reuniao.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.rotulo}
                  </option>
                ))}
              </select>
            </div>
```

Nas colunas da tabela, a atual "Tipo" (CRM/Teams) vira "Onde" e entra a nova:

```tsx
                    <th className={cabecalho}>Onde</th>
                    <th className={cabecalho}>Tipo</th>
```

E nas linhas, logo depois da célula de `r.tipo`:

```tsx
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {r.tipo_reuniao_rotulo || "—"}
                      </td>
```

- [ ] **Step 3: Conferir os tipos**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 4: Rodar a suíte inteira do backend**

```bash
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
  python -m pytest tests/ -q
```

Esperado: as 20 falhas pré-existentes e nada a mais; o número de testes
passando deve subir cerca de 45.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/reunioesService.ts frontend/src/pages/ReunioesPage.tsx
git commit -m "feat(reunioes): coluna Onde, coluna Tipo e filtro por tipo"
```

---

## Fechamento

- [ ] **Changelog** — versão nova em `ChangelogModal.tsx`, `CHANGELOG.md` e no rodapé do `MainLayout.tsx`, os três iguais.

- [ ] **Conferir `DAILY_DEV_MODE=false` no EasyPanel de produção.** Se estiver ligada, o convite nunca chegou a cliente nenhum — e agora a tela passa a avisar quando isso acontecer.

- [ ] **Homologar no homo**, nesta ordem:
  1. Criar reunião de cada tipo e conferir o título montado
  2. Criar uma "Outra" e conferir que o título digitado fica
  3. Desmarcar todos os convidados: não deixa criar
  4. Acrescentar um e-mail de fora e conferir que ele recebe o convite
  5. Gravar uma Apresentação Phoebus: avaliação chega sozinha
  6. Gravar uma Dúvidas: **não** chega avaliação, e o botão funciona
  7. No Teams, clicar em "Analisar Reunião" numa Apresentação Phoebus: análise e avaliação juntas
  8. Página de Reuniões: colunas Onde e Tipo, filtro por tipo e "Sem tipo"

- [ ] **Deploy em produção** com `alembic upgrade head` — vão duas migrations: a da avaliação (`a5b6c7d8e9f0`) e a deste trabalho (`b6c7d8e9f0a1`).

---

## O que este plano NÃO faz

- Tela para o gestor cadastrar tipos de reunião
- Régua diferente por tipo — a matriz da consultoria é uma só
- Renomear reuniões antigas para o novo padrão
- Salvar no cadastro do contato os e-mails digitados à mão
