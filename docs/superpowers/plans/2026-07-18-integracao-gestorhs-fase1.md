# Integração GestorHS → hsgrowth (fase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o GestorHS crie cards nos boards de Serviços e Cobrança do hsgrowth via uma chave de API fixa e de escopo limitado, com cada card carregando o identificador da entidade de origem.

**Architecture:** Um endpoint novo `POST /api/v1/integration/service-cards`, autenticado por header `X-API-Key` (não por JWT), com semântica *create-or-return* idempotente por `(external_source, external_id)`. O cliente é resolvido por vínculo externo ao `clientes.id` do GestorHS, nunca por documento. A etapa de entrada é resolvida no hsgrowth por uma flag no `ServiceList`, e a ausência dela é erro `404`, nunca um palpite.

**Tech Stack:** Python 3, FastAPI, SQLAlchemy (estilo clássico `Column`), Alembic, Pydantic v2, pytest + SQLite in-memory.

**Spec:** `docs/superpowers/specs/2026-07-18-integracao-gestorhs-design.md`

## Global Constraints

- **Models:** estilo clássico do repo — `Column(...)`, sem `Mapped[]`. Herdar `TimestampMixin` (e `SoftDeleteMixin` onde o modelo vizinho herda).
- **Migrations:** arquivo em `backend/alembic/versions/` no formato `AAAA_MM_DD_HHMM-<rev>_<slug>.py`, com `revision`/`down_revision` explícitos como strings. A última revisão existente é `e5f6a7b8c9d0`. A cadeia deste plano é, nesta ordem: `f6a7b8c9d0e1` → `a7b8c9d0e1f2` → `b8c9d0e1f2a3` → `c9d0e1f2a3b4`.
- **Testes:** rodam com SQLite in-memory via `Base.metadata.create_all` (`backend/tests/conftest.py`), **não** via Alembic. Toda coluna nova precisa existir no model, senão o teste não a enxerga. Não usar DDL específico de Postgres (`postgresql_where`, tipos `JSONB`, etc.).
- **Unicidade:** usar `UniqueConstraint` simples, não índice parcial. `NULL` é distinto de `NULL` em unique tanto no Postgres quanto no SQLite, então cards criados por humanos (ambas as colunas `NULL`) nunca colidem entre si. Isto substitui o "índice único parcial" mencionado na seção 5 do spec — mesmo efeito, portátil e compatível com os testes.
- **Idioma:** mensagens de erro e docstrings em português, como o resto do backend.
- **Escopo da chave:** a string exata é `service_cards:create`.
- **`source` válidos:** exatamente `gestorhs.os` e `gestorhs.calibracao`. O vínculo de cliente usa `gestorhs` (sem sufixo) — o mesmo cliente é compartilhado pelos dois boards.
- **Rodar os testes:** `cd backend && pytest <caminho> -v`
- **Imports em arquivos de teste:** várias tasks acrescentam testes ao mesmo arquivo. Os blocos de código deste plano mostram os imports junto do teste que os usa, só para ficarem legíveis fora de contexto — ao aplicar, **consolide todos os imports no topo do arquivo**, sem duplicar. Import no meio do arquivo é defeito de estilo, não instrução do plano.

---

### Task 1: Identidade externa no ServiceCard

Adiciona `external_source` e `external_id` ao card, com unicidade no par. É o que torna a criação idempotente e o que a fase 2 vai usar para saber qual OS o card representa.

**Files:**
- Modify: `backend/app/models/service_card.py`
- Create: `backend/alembic/versions/2026_07_18_1000-f6a7b8c9d0e1_service_card_external_identity.py`
- Test: `backend/tests/unit/test_integration_gestorhs.py`

**Interfaces:**
- Consumes: nada.
- Produces: `ServiceCard.external_source: str | None`, `ServiceCard.external_id: str | None`, constraint `unique_service_card_external_ref`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_integration_gestorhs.py`:

```python
"""Testes da integração GestorHS → hsgrowth (fase 1)."""
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.service_card import ServiceCard


@pytest.fixture
def board_servicos(db):
    board = ServiceBoard(name="Serviços")
    db.add(board)
    db.commit()
    db.refresh(board)
    return board


@pytest.fixture
def lista_entrada(db, board_servicos):
    lista = ServiceList(board_id=board_servicos.id, name="Dados Preenchidos", position=0)
    db.add(lista)
    db.commit()
    db.refresh(lista)
    return lista


def test_sources_diferentes_com_mesmo_external_id_coexistem(db, lista_entrada):
    """OS 500 e calibração 500 são cards distintos — o source namespaceia o id."""
    db.add(ServiceCard(
        list_id=lista_entrada.id, title="OS 500",
        external_source="gestorhs.os", external_id="500",
    ))
    db.add(ServiceCard(
        list_id=lista_entrada.id, title="Calibração 500",
        external_source="gestorhs.calibracao", external_id="500",
    ))
    db.commit()

    assert db.query(ServiceCard).count() == 2


def test_mesmo_par_source_external_id_e_rejeitado(db, lista_entrada):
    db.add(ServiceCard(
        list_id=lista_entrada.id, title="OS 500",
        external_source="gestorhs.os", external_id="500",
    ))
    db.commit()

    db.add(ServiceCard(
        list_id=lista_entrada.id, title="OS 500 duplicada",
        external_source="gestorhs.os", external_id="500",
    ))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_cards_humanos_sem_identidade_externa_nao_colidem(db, lista_entrada):
    """Vários cards com as duas colunas NULL têm que conviver."""
    for i in range(3):
        db.add(ServiceCard(list_id=lista_entrada.id, title=f"Card manual {i}"))
    db.commit()

    assert db.query(ServiceCard).filter(ServiceCard.external_id.is_(None)).count() == 3
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && pytest tests/unit/test_integration_gestorhs.py -v`
Expected: FAIL — `TypeError: 'external_source' is an invalid keyword argument for ServiceCard`

- [ ] **Step 3: Adicionar as colunas ao model**

Em `backend/app/models/service_card.py`, trocar o import da linha 5 e adicionar as colunas logo após `due_date` (linha 48), mais o `__table_args__`:

```python
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Numeric, DateTime, JSON, UniqueConstraint
```

```python
    # Data prevista de conclusão
    due_date = Column(DateTime, nullable=True)

    # Identidade da entidade de origem, quando o card veio de um sistema externo.
    # Ex: ("gestorhs.os", "1234") ou ("gestorhs.calibracao", "500:2027-03-14").
    # Ambas NULL em cards criados por humanos.
    external_source = Column(String(50), nullable=True, index=True)
    external_id = Column(String(100), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("external_source", "external_id", name="unique_service_card_external_ref"),
    )
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd backend && pytest tests/unit/test_integration_gestorhs.py -v`
Expected: PASS (3 testes)

- [ ] **Step 5: Escrever a migration**

Criar `backend/alembic/versions/2026_07_18_1000-f6a7b8c9d0e1_service_card_external_identity.py`:

```python
"""identidade externa no service_card (external_source, external_id)

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-18 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('service_cards', sa.Column('external_source', sa.String(length=50), nullable=True))
    op.add_column('service_cards', sa.Column('external_id', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_service_cards_external_source'), 'service_cards', ['external_source'])
    op.create_index(op.f('ix_service_cards_external_id'), 'service_cards', ['external_id'])
    op.create_unique_constraint(
        'unique_service_card_external_ref', 'service_cards', ['external_source', 'external_id']
    )


def downgrade():
    op.drop_constraint('unique_service_card_external_ref', 'service_cards', type_='unique')
    op.drop_index(op.f('ix_service_cards_external_id'), table_name='service_cards')
    op.drop_index(op.f('ix_service_cards_external_source'), table_name='service_cards')
    op.drop_column('service_cards', 'external_id')
    op.drop_column('service_cards', 'external_source')
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/service_card.py backend/alembic/versions/2026_07_18_1000-f6a7b8c9d0e1_service_card_external_identity.py backend/tests/unit/test_integration_gestorhs.py
git commit -m "feat(integracao): identidade externa (source, external_id) no card de servico"
```

---

### Task 2: Etapa de entrada configurável por board

O GestorHS manda `board_id`; o hsgrowth decide a etapa. Board sem etapa marcada é erro alto, nunca palpite.

**Files:**
- Modify: `backend/app/models/service_list.py`
- Modify: `backend/app/repositories/service_board_repository.py`
- Modify: `backend/app/schemas/service_board.py:57-75`
- Modify: `backend/app/services/service_board_service.py:158-168,178-194`
- Create: `backend/alembic/versions/2026_07_18_1010-a7b8c9d0e1f2_service_list_entry_stage.py`
- Test: `backend/tests/unit/test_integration_gestorhs.py`

**Interfaces:**
- Consumes: nada.
- Produces: `ServiceList.is_entry_stage: bool`; `ServiceBoardRepository.find_entry_list(board_id: int) -> ServiceList | None`; o campo exposto em `ServiceListBase`/`ServiceListUpdate`/`ServiceListResponse`.

> **Por que os schemas entram nesta task:** sem expor o campo, não existe **nenhuma** forma de marcar a etapa de entrada a não ser SQL na mão — e a configuração é justamente o que faz a integração funcionar. E `duplicate_board` copia lista a lista campo a campo (`service_board_service.py:158-168`); sem incluir a flag ali, duplicar um board perde a etapa de entrada em silêncio, que é exatamente a classe de bug que este design existe para evitar.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `backend/tests/unit/test_integration_gestorhs.py`:

```python
from app.repositories.service_board_repository import ServiceBoardRepository


def test_find_entry_list_retorna_a_lista_marcada(db, board_servicos):
    db.add(ServiceList(board_id=board_servicos.id, name="Triagem", position=0))
    entrada = ServiceList(
        board_id=board_servicos.id, name="Dados Preenchidos", position=1, is_entry_stage=True
    )
    db.add(entrada)
    db.commit()

    achada = ServiceBoardRepository(db).find_entry_list(board_servicos.id)

    assert achada is not None
    assert achada.name == "Dados Preenchidos"


def test_find_entry_list_retorna_none_sem_etapa_marcada(db, board_servicos):
    db.add(ServiceList(board_id=board_servicos.id, name="Triagem", position=0))
    db.commit()

    assert ServiceBoardRepository(db).find_entry_list(board_servicos.id) is None


def test_list_lists_expoe_is_entry_stage(db, board_servicos):
    """Sem isso não há como configurar a etapa de entrada a não ser por SQL na mão."""
    from app.services.service_board_service import ServiceBoardService

    db.add(ServiceList(
        board_id=board_servicos.id, name="Entrada", position=0, is_entry_stage=True
    ))
    db.commit()

    listas = ServiceBoardService(db).list_lists(board_servicos.id)

    assert listas[0].is_entry_stage is True


def test_duplicar_board_preserva_a_etapa_de_entrada(db, board_servicos):
    """Duplicar board não pode perder a flag em silêncio."""
    from app.services.service_board_service import ServiceBoardService

    db.add(ServiceList(
        board_id=board_servicos.id, name="Entrada", position=0, is_entry_stage=True
    ))
    db.commit()

    novo = ServiceBoardService(db).duplicate_board(
        board_servicos.id, "Serviços (cópia)", copy_lists=True, user=None
    )

    entrada = ServiceBoardRepository(db).find_entry_list(novo.id)
    assert entrada is not None
    assert entrada.name == "Entrada"
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && pytest tests/unit/test_integration_gestorhs.py -k "entry_list or entry_stage" -v`
Expected: FAIL — `TypeError: 'is_entry_stage' is an invalid keyword argument for ServiceList`

- [ ] **Step 3: Adicionar a coluna e o método de busca**

Em `backend/app/models/service_list.py`, após `is_lost_stage` (linha 21):

```python
    is_lost_stage = Column(Boolean, default=False, nullable=False)
    # Etapa por onde entram os cards criados por integração externa.
    # Board sem nenhuma lista marcada rejeita a criação via integração (404).
    is_entry_stage = Column(Boolean, default=False, nullable=False)
```

Em `backend/app/repositories/service_board_repository.py`, adicionar o método logo antes de `create_card` (linha 200):

```python
    def find_entry_list(self, board_id: int) -> Optional[ServiceList]:
        """Lista de entrada do board (para cards vindos de integração). None se não configurada."""
        return (
            self.db.query(ServiceList)
            .filter(
                ServiceList.board_id == board_id,
                ServiceList.is_entry_stage.is_(True),
            )
            .order_by(ServiceList.position)
            .first()
        )

    def next_position(self, list_id: int) -> float:
        """Posição do fim da coluna. Extraído de create_card para ser reusado
        pelo caminho de integração (ver IntegrationCardService)."""
        ultimo = (
            self.db.query(ServiceCard)
            .filter(ServiceCard.list_id == list_id)
            .order_by(ServiceCard.position.desc())
            .first()
        )
        return float((ultimo.position or 0) + 1) if ultimo else 0.0
```

- [ ] **Step 4: Expor o campo nos schemas**

Em `backend/app/schemas/service_board.py`, adicionar o campo em `ServiceListBase` (após `is_lost_stage`, linha 62) e em `ServiceListUpdate` (após `is_lost_stage`, linha 74). `ServiceListResponse` herda de `ServiceListBase` e ganha o campo automaticamente.

```python
class ServiceListBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    color: Optional[str] = Field(None, max_length=7)
    position: Optional[int] = Field(None)
    is_done_stage: Optional[bool] = Field(False)
    is_lost_stage: Optional[bool] = Field(False)
    # Etapa por onde entram os cards de integração externa (ver integração GestorHS).
    is_entry_stage: Optional[bool] = Field(False)
```

```python
class ServiceListUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    color: Optional[str] = Field(None, max_length=7)
    position: Optional[int] = None
    is_done_stage: Optional[bool] = None
    is_lost_stage: Optional[bool] = None
    is_entry_stage: Optional[bool] = None
```

- [ ] **Step 5: Propagar o campo no service**

Em `backend/app/services/service_board_service.py`, incluir a flag na cópia de listas dentro de `duplicate_board` (linhas 160-167):

```python
                self.repo.create_list(ServiceListCreate(
                    board_id=new_board.id,
                    name=lst.name,
                    color=lst.color,
                    position=lst.position,
                    is_done_stage=lst.is_done_stage,
                    is_lost_stage=lst.is_lost_stage,
                    is_entry_stage=lst.is_entry_stage,
                ))
```

E na montagem manual do response em `list_lists` (linhas 182-192), após `is_lost_stage=l.is_lost_stage,`:

```python
                is_entry_stage=l.is_entry_stage,
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `cd backend && pytest tests/unit/test_integration_gestorhs.py -v`
Expected: PASS (7 testes)

- [ ] **Step 7: Escrever a migration**

Criar `backend/alembic/versions/2026_07_18_1010-a7b8c9d0e1f2_service_list_entry_stage.py`:

```python
"""etapa de entrada por board (is_entry_stage)

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-07-18 10:10:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'a7b8c9d0e1f2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'service_lists',
        sa.Column('is_entry_stage', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade():
    op.drop_column('service_lists', 'is_entry_stage')
```

- [ ] **Step 8: Commit**

```bash
git add backend/app/models/service_list.py backend/app/repositories/service_board_repository.py backend/app/schemas/service_board.py backend/app/services/service_board_service.py backend/alembic/versions/2026_07_18_1010-a7b8c9d0e1f2_service_list_entry_stage.py backend/tests/unit/test_integration_gestorhs.py
git commit -m "feat(integracao): etapa de entrada configuravel por board de servico"
```

---

### Task 3: Corrigir os campos descartados na criação de card

`business_info` e `payment_info` estão no schema, o endpoint aceita, o response ecoa — e o repositório não grava. Falha silenciosa. Sem isto não existe "card preenchido", e o bug atinge igualmente o fluxo humano.

Também fecha a segunda correção da seção 11 do spec: `create_card` valida apenas que a lista existe, não que ela pertence ao board da URL — o que permite um card nascer no meio do funil, já depois das travas de avanço.

**Files:**
- Modify: `backend/app/repositories/service_board_repository.py:200-222`
- Modify: `backend/app/services/service_board_service.py:370-374`
- Modify: `backend/app/api/v1/endpoints/service_boards.py:267-295`
- Test: `backend/tests/unit/test_service_board_create_card.py`

**Interfaces:**
- Consumes: nada.
- Produces: `create_card` persiste `payment_info` e `business_info`; `ServiceBoardService.create_card(data, user, board_id=None)` rejeita lista de outro board com `400`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_service_board_create_card.py`:

```python
"""Regressão: create_card precisa persistir todos os campos do schema."""
import pytest

from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.repositories.service_board_repository import ServiceBoardRepository
from app.schemas.service_board import ServiceCardCreate


@pytest.fixture
def lista(db):
    board = ServiceBoard(name="Serviços")
    db.add(board)
    db.commit()
    lista = ServiceList(board_id=board.id, name="Entrada", position=0)
    db.add(lista)
    db.commit()
    db.refresh(lista)
    return lista


def test_create_card_persiste_business_info_e_payment_info(db, lista):
    data = ServiceCardCreate(
        list_id=lista.id,
        title="Card com dados",
        business_info={"seller_name": "Sandra", "service_type": "Calibração"},
        payment_info={"payment_method": "PIX", "installments": 1},
    )

    card = ServiceBoardRepository(db).create_card(data)

    assert card.business_info == {"seller_name": "Sandra", "service_type": "Calibração"}
    assert card.payment_info == {"payment_method": "PIX", "installments": 1}


def test_create_card_rejeita_lista_de_outro_board(db, lista):
    """Sem isso, um card pode nascer no meio do funil de outro board."""
    from fastapi import HTTPException
    from app.models.service_board import ServiceBoard
    from app.services.service_board_service import ServiceBoardService

    outro_board = ServiceBoard(name="Cobrança")
    db.add(outro_board)
    db.commit()

    data = ServiceCardCreate(list_id=lista.id, title="Card no board errado")

    with pytest.raises(HTTPException) as exc:
        ServiceBoardService(db).create_card(data, user=None, board_id=outro_board.id)

    assert exc.value.status_code == 400


def test_create_card_aceita_lista_do_proprio_board(db, lista):
    from app.services.service_board_service import ServiceBoardService

    data = ServiceCardCreate(list_id=lista.id, title="Card certo")

    card = ServiceBoardService(db).create_card(data, user=None, board_id=lista.board_id)

    assert card.list_id == lista.id
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && pytest tests/unit/test_service_board_create_card.py -v`
Expected: FAIL — o primeiro com `assert None == {'seller_name': 'Sandra', ...}`, os outros com `TypeError: create_card() got an unexpected keyword argument 'board_id'`

- [ ] **Step 3: Corrigir o repositório**

Em `backend/app/repositories/service_board_repository.py`, em `create_card`, substituir o cálculo inline de posição (linhas 201-207) por uma chamada ao método extraído na Task 2 — assim a lógica de posição existe num lugar só:

```python
    def create_card(self, data: ServiceCardCreate) -> ServiceCard:
        next_position = self.next_position(data.list_id)
```

E substituir a construção do `ServiceCard` (linhas 208-218) por:

```python
        card = ServiceCard(
            list_id=data.list_id,
            title=data.title,
            description=data.description,
            assigned_to_id=data.assigned_to_id,
            due_date=data.due_date,
            contact_info=data.contact_info,
            payment_info=data.payment_info,
            business_info=data.business_info,
            client_id=data.client_id,
            person_id=data.person_id,
            position=next_position,
        )
```

- [ ] **Step 4: Validar o board no service**

Em `backend/app/services/service_board_service.py`, substituir `create_card` (linhas 370-374) por:

```python
    def create_card(self, data: ServiceCardCreate, user: User, board_id: Optional[int] = None) -> ServiceCard:
        lst = self.get_list(data.list_id)
        if board_id is not None and lst.board_id != board_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A lista informada não pertence a este board de serviços.",
            )
        card = self.repo.create_card(data)
        self.log_event(card.id, user, "card_created", "Card criado")
        return card
```

Em `backend/app/api/v1/endpoints/service_boards.py`, passar o `board_id` da rota (que hoje é ignorado) na chamada dentro de `create_service_card`:

```python
    card = svc.create_card(data, current_user, board_id=board_id)
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd backend && pytest tests/unit/test_service_board_create_card.py -v`
Expected: PASS (3 testes)

- [ ] **Step 6: Rodar a suíte de serviços para garantir que nada quebrou**

Run: `cd backend && pytest tests/unit/test_services.py tests/unit/test_proposals.py -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/repositories/service_board_repository.py backend/app/services/service_board_service.py backend/app/api/v1/endpoints/service_boards.py backend/tests/unit/test_service_board_create_card.py
git commit -m "fix(servicos): create_card descartava business_info/payment_info e aceitava lista de outro board"
```

---

### Task 4: Chave de API estática no IntegrationClient

Adiciona `api_key_hash` e `scopes` ao modelo que já existe, mais os helpers de geração e hash. SHA-256 e não bcrypt: a chave é aleatória de alta entropia (não é senha de humano) e precisa de lookup direto por hash a cada request — bcrypt custaria ~100ms por chamada.

**Files:**
- Modify: `backend/app/core/security.py`
- Modify: `backend/app/models/integration_client.py`
- Create: `backend/alembic/versions/2026_07_18_1020-b8c9d0e1f2a3_integration_client_api_key.py`
- Test: `backend/tests/unit/test_integration_api_key.py`

**Interfaces:**
- Consumes: nada.
- Produces: `generate_api_key() -> str`, `hash_api_key(api_key: str) -> str`, `IntegrationClient.api_key_hash: str | None`, `IntegrationClient.scopes: list | None`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_integration_api_key.py`:

```python
"""Testes da chave de API estática dos integration clients."""
from app.core.security import generate_api_key, hash_api_key


def test_chave_tem_prefixo_reconhecivel():
    assert generate_api_key().startswith("hsg_live_")


def test_chaves_geradas_sao_distintas():
    assert generate_api_key() != generate_api_key()


def test_hash_e_deterministico_e_nao_contem_a_chave():
    chave = generate_api_key()
    h = hash_api_key(chave)

    assert h == hash_api_key(chave)
    assert len(h) == 64            # sha256 hex
    assert chave not in h
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && pytest tests/unit/test_integration_api_key.py -v`
Expected: FAIL — `ImportError: cannot import name 'generate_api_key'`

- [ ] **Step 3: Implementar os helpers**

Em `backend/app/core/security.py`, adicionar os imports necessários no topo (junto dos que já existem) e as funções ao fim do arquivo:

```python
import hashlib
import secrets
```

```python
API_KEY_PREFIX = "hsg_live_"


def generate_api_key() -> str:
    """Gera uma chave de API estática. O prefixo permite secret-scanning reconhecer vazamentos."""
    return f"{API_KEY_PREFIX}{secrets.token_urlsafe(48)}"


def hash_api_key(api_key: str) -> str:
    """SHA-256 hex da chave. Não é bcrypt de propósito: a chave é aleatória de alta
    entropia e precisa de lookup direto por hash a cada request."""
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd backend && pytest tests/unit/test_integration_api_key.py -v`
Expected: PASS (3 testes)

- [ ] **Step 5: Adicionar as colunas ao model**

Em `backend/app/models/integration_client.py`, trocar o import da linha 6 e adicionar as colunas após `client_secret_hash` (linha 24):

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
```

```python
    client_secret_hash = Column(String(255), nullable=False)  # Hash do secret (nunca armazenar plain text)

    # Chave de API estática (não expira). SHA-256 hex — ver app/core/security.hash_api_key.
    api_key_hash = Column(String(255), nullable=True, index=True)
    # Escopos permitidos, ex: ["service_cards:create"]. Vazio = a chave não pode nada.
    scopes = Column(JSON, nullable=True, default=list)
```

- [ ] **Step 6: Escrever a migration**

Criar `backend/alembic/versions/2026_07_18_1020-b8c9d0e1f2a3_integration_client_api_key.py`:

```python
"""chave de api estatica e escopos no integration_client

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-07-18 10:20:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'b8c9d0e1f2a3'
down_revision = 'a7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('integration_clients', sa.Column('api_key_hash', sa.String(length=255), nullable=True))
    op.add_column('integration_clients', sa.Column('scopes', sa.JSON(), nullable=True))
    op.create_index(
        op.f('ix_integration_clients_api_key_hash'), 'integration_clients', ['api_key_hash']
    )


def downgrade():
    op.drop_index(op.f('ix_integration_clients_api_key_hash'), table_name='integration_clients')
    op.drop_column('integration_clients', 'scopes')
    op.drop_column('integration_clients', 'api_key_hash')
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/core/security.py backend/app/models/integration_client.py backend/alembic/versions/2026_07_18_1020-b8c9d0e1f2a3_integration_client_api_key.py backend/tests/unit/test_integration_api_key.py
git commit -m "feat(integracao): chave de api estatica com escopos no integration client"
```

---

### Task 5: Dependency `require_api_scope`

Autentica pelo header `X-API-Key`, verifica o escopo, atualiza `last_used_at` e devolve o `User` impersonado. É o único gate do endpoint de integração — JWT não entra aqui.

**Files:**
- Modify: `backend/app/api/deps.py`
- Test: `backend/tests/unit/test_integration_api_key.py`

**Interfaces:**
- Consumes: `hash_api_key` (Task 4), `IntegrationClient.api_key_hash`, `IntegrationClient.scopes`.
- Produces: `require_api_scope(required_scope: str)` — factory que devolve uma dependency assíncrona `-> User`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `backend/tests/unit/test_integration_api_key.py`:

```python
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_db, require_api_scope
from app.core.security import generate_api_key, hash_api_key, hash_password
from app.models.integration_client import IntegrationClient
from app.models.role import Role
from app.models.user import User


@pytest.fixture
def usuario_integracao(db):
    role = Role(name="service", display_name="Serviço", permissions=[])
    db.add(role)
    db.commit()
    user = User(
        role_id=role.id, email="gestorhs@integracao.local", name="GestorHS (Integração)",
        password_hash=hash_password("nao-usado"), is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def chave_valida(db, usuario_integracao):
    chave = generate_api_key()
    db.add(IntegrationClient(
        name="GestorHS", client_id="hsg_teste", client_secret_hash="x",
        api_key_hash=hash_api_key(chave), scopes=["service_cards:create"],
        impersonate_user_id=usuario_integracao.id, is_active=True,
    ))
    db.commit()
    return chave


@pytest.fixture
def app_protegido(db):
    """App mínimo com uma rota protegida pelo escopo, para exercitar a dependency."""
    app = FastAPI()

    @app.get("/protegido")
    def protegido(user: User = Depends(require_api_scope("service_cards:create"))):
        return {"user_id": user.id}

    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app, raise_server_exceptions=False)


def test_sem_chave_retorna_401(app_protegido):
    assert app_protegido.get("/protegido").status_code == 401


def test_chave_invalida_retorna_401(app_protegido):
    r = app_protegido.get("/protegido", headers={"X-API-Key": "hsg_live_naoexiste"})
    assert r.status_code == 401


def test_chave_valida_retorna_o_usuario_impersonado(app_protegido, chave_valida, usuario_integracao):
    r = app_protegido.get("/protegido", headers={"X-API-Key": chave_valida})
    assert r.status_code == 200
    assert r.json()["user_id"] == usuario_integracao.id


def test_chave_sem_o_escopo_retorna_403(app_protegido, db, usuario_integracao):
    chave = generate_api_key()
    db.add(IntegrationClient(
        name="Outra", client_id="hsg_outra", client_secret_hash="x",
        api_key_hash=hash_api_key(chave), scopes=["outro:escopo"],
        impersonate_user_id=usuario_integracao.id, is_active=True,
    ))
    db.commit()

    r = app_protegido.get("/protegido", headers={"X-API-Key": chave})
    assert r.status_code == 403


def test_client_inativo_retorna_401(app_protegido, db, usuario_integracao):
    chave = generate_api_key()
    db.add(IntegrationClient(
        name="Desativada", client_id="hsg_off", client_secret_hash="x",
        api_key_hash=hash_api_key(chave), scopes=["service_cards:create"],
        impersonate_user_id=usuario_integracao.id, is_active=False,
    ))
    db.commit()

    r = app_protegido.get("/protegido", headers={"X-API-Key": chave})
    assert r.status_code == 401


def test_uso_da_chave_registra_last_used_at(app_protegido, db, chave_valida):
    app_protegido.get("/protegido", headers={"X-API-Key": chave_valida})

    client = db.query(IntegrationClient).filter_by(client_id="hsg_teste").first()
    assert client.last_used_at is not None
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && pytest tests/unit/test_integration_api_key.py -v`
Expected: FAIL — `ImportError: cannot import name 'require_api_scope'`

- [ ] **Step 3: Implementar a dependency**

Em `backend/app/api/deps.py`, adicionar os imports que faltam no topo e a factory ao fim do arquivo:

```python
from datetime import datetime, timezone
from fastapi import Header
from app.core.security import decode_token, verify_token_type, hash_api_key
```

```python
def require_api_scope(required_scope: str):
    """
    Dependency de autenticação por chave de API estática (header X-API-Key).

    Caminho separado do JWT de usuário: não passa por blacklist, sessão nem role.
    O controle de raio de dano é o escopo — a chave não expira, então ele não é opcional.

    Retorna o User de impersonate_user_id, que vira o autor dos eventos gerados.
    """
    async def checker(
        x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
        db: Session = Depends(get_db),
    ) -> User:
        if not x_api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Chave de API ausente (header X-API-Key).",
            )

        client = (
            db.query(IntegrationClient)
            .filter(
                IntegrationClient.api_key_hash == hash_api_key(x_api_key),
                IntegrationClient.is_active.is_(True),
            )
            .first()
        )
        if not client:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Chave de API inválida ou inativa.",
            )

        if required_scope not in (client.scopes or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Chave de API sem o escopo necessário: {required_scope}",
            )

        if not client.impersonate_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Client de integração sem usuário associado.",
            )

        user = (
            db.query(User)
            .options(joinedload(User.role))
            .filter(User.id == client.impersonate_user_id, User.is_active.is_(True))
            .first()
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário de integração inválido ou inativo.",
            )

        client.last_used_at = datetime.now(timezone.utc)
        db.commit()

        return user

    return checker
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd backend && pytest tests/unit/test_integration_api_key.py -v`
Expected: PASS (9 testes)

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/deps.py backend/tests/unit/test_integration_api_key.py
git commit -m "feat(integracao): dependency require_api_scope para chave de api"
```

---

### Task 6: Vínculo de cliente externo

Deduplica cliente pelo `clientes.id` do GestorHS, não por documento — os campos `cgc`/`cpf` de lá são nullable, sem validação e sem UNIQUE, vindos de migração legada. O mesmo cliente é compartilhado pelos dois boards, por isso o `source` do vínculo é `gestorhs` (sem sufixo).

**Files:**
- Create: `backend/app/models/external_client_ref.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/versions/2026_07_18_1030-c9d0e1f2a3b4_external_client_refs.py`
- Test: `backend/tests/unit/test_integration_gestorhs.py`

**Interfaces:**
- Consumes: `Client`.
- Produces: `ExternalClientRef` com colunas `source`, `external_id`, `client_id` e constraint `unique_external_client_ref`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `backend/tests/unit/test_integration_gestorhs.py`:

```python
from app.models.client import Client
from app.models.external_client_ref import ExternalClientRef


def test_vinculo_externo_e_unico_por_source_e_external_id(db):
    cliente = Client(name="Transportadora X")
    db.add(cliente)
    db.commit()

    db.add(ExternalClientRef(source="gestorhs", external_id="789", client_id=cliente.id))
    db.commit()

    db.add(ExternalClientRef(source="gestorhs", external_id="789", client_id=cliente.id))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && pytest tests/unit/test_integration_gestorhs.py -k vinculo -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.models.external_client_ref'`

- [ ] **Step 3: Criar o model**

Criar `backend/app/models/external_client_ref.py`:

```python
"""
Vínculo entre um Client do hsgrowth e o registro correspondente num sistema externo.

Existe porque o identificador confiável do cliente no GestorHS é `clientes.id` (PK
inteira), e não o documento — lá `cgc`/`cpf` são nullable, sem validação e sem UNIQUE,
herdados de uma migração de sistema legado. Deduplicar por documento casaria clientes
errados em silêncio.

Tabela separada (em vez de colunas em `clients`) porque o mesmo cliente pode vir a ter
origem em mais de um sistema.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ExternalClientRef(Base, TimestampMixin):
    __tablename__ = "external_client_refs"

    id = Column(Integer, primary_key=True, index=True)

    # Sistema de origem, ex: "gestorhs". Sem sufixo de entidade — o mesmo cliente
    # é compartilhado pelos boards de Serviços e de Cobrança.
    source = Column(String(50), nullable=False, index=True)
    # Id do cliente no sistema de origem (o `clientes.id` do GestorHS).
    external_id = Column(String(100), nullable=False, index=True)

    client_id = Column(
        Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )

    client = relationship("Client")

    __table_args__ = (
        UniqueConstraint("source", "external_id", name="unique_external_client_ref"),
    )

    def __repr__(self):
        return f"<ExternalClientRef({self.source}:{self.external_id} -> client {self.client_id})>"
```

Em `backend/app/models/__init__.py`, adicionar o import junto dos outros models (para que `Base.metadata.create_all` enxergue a tabela nos testes):

```python
from app.models.external_client_ref import ExternalClientRef
```

E acrescentar `"ExternalClientRef"` à lista `__all__`, se o arquivo tiver uma.

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd backend && pytest tests/unit/test_integration_gestorhs.py -v`
Expected: PASS (6 testes)

- [ ] **Step 5: Escrever a migration**

Criar `backend/alembic/versions/2026_07_18_1030-c9d0e1f2a3b4_external_client_refs.py`:

```python
"""vinculo de cliente com sistema externo (external_client_refs)

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-07-18 10:30:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'c9d0e1f2a3b4'
down_revision = 'b8c9d0e1f2a3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'external_client_refs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('external_id', sa.String(length=100), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source', 'external_id', name='unique_external_client_ref'),
    )
    op.create_index(op.f('ix_external_client_refs_id'), 'external_client_refs', ['id'])
    op.create_index(op.f('ix_external_client_refs_source'), 'external_client_refs', ['source'])
    op.create_index(op.f('ix_external_client_refs_external_id'), 'external_client_refs', ['external_id'])
    op.create_index(op.f('ix_external_client_refs_client_id'), 'external_client_refs', ['client_id'])


def downgrade():
    op.drop_table('external_client_refs')
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/external_client_ref.py backend/app/models/__init__.py backend/alembic/versions/2026_07_18_1030-c9d0e1f2a3b4_external_client_refs.py backend/tests/unit/test_integration_gestorhs.py
git commit -m "feat(integracao): vinculo de cliente externo por id do sistema de origem"
```

---

### Task 7: Schemas do payload de integração

Contrato de entrada e saída do endpoint. `source` é `Literal` — um valor fora da lista é `422`, não um card órfão.

**Files:**
- Create: `backend/app/schemas/integration.py`
- Test: `backend/tests/unit/test_integration_schemas.py`

**Interfaces:**
- Consumes: nada.
- Produces: `IntegrationCardClient`, `IntegrationCardContact`, `IntegrationCardDevice`, `IntegrationServiceCardCreate`, `IntegrationServiceCardResponse`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_integration_schemas.py`:

```python
"""Validação do contrato de entrada da integração."""
import pytest
from pydantic import ValidationError

from app.schemas.integration import IntegrationServiceCardCreate


def payload_valido(**overrides):
    base = {
        "source": "gestorhs.os",
        "external_id": "1234",
        "board_id": 1,
        "title": "OS #1234 · Transportadora X",
        "client": {"external_id": "789", "name": "Transportadora X LTDA"},
    }
    base.update(overrides)
    return base


def test_payload_minimo_e_valido():
    data = IntegrationServiceCardCreate(**payload_valido())
    assert data.source == "gestorhs.os"
    assert data.client.name == "Transportadora X LTDA"
    assert data.contact is None
    assert data.devices is None


def test_source_desconhecido_e_rejeitado():
    with pytest.raises(ValidationError):
        IntegrationServiceCardCreate(**payload_valido(source="outro.sistema"))


def test_external_id_vazio_e_rejeitado():
    with pytest.raises(ValidationError):
        IntegrationServiceCardCreate(**payload_valido(external_id=""))


def test_cliente_e_obrigatorio():
    p = payload_valido()
    del p["client"]
    with pytest.raises(ValidationError):
        IntegrationServiceCardCreate(**p)


def test_aparelhos_sao_aceitos():
    data = IntegrationServiceCardCreate(**payload_valido(devices=[
        {"serial_number": "AB123", "model": "Alcotest 6820",
         "alcohol_module": "Sim", "next_recalibration_date": "2026-08-10"},
    ]))
    assert data.devices[0].serial_number == "AB123"
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && pytest tests/unit/test_integration_schemas.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.schemas.integration'`

- [ ] **Step 3: Criar os schemas**

Criar `backend/app/schemas/integration.py`:

```python
"""
Schemas do contrato de integração externa (fase 1: criação de cards de serviço).

Ver docs/superpowers/specs/2026-07-18-integracao-gestorhs-design.md
"""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class IntegrationCardClient(BaseModel):
    """Cliente da entidade de origem. `external_id` é o `clientes.id` do GestorHS."""
    external_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    document: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=2)


class IntegrationCardContact(BaseModel):
    """Pessoa de contato. O telefone vem já escolhido pelo sistema de origem."""
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)


class IntegrationCardDevice(BaseModel):
    """Aparelho. Mesmo formato do campo `aparelhos` de ServiceCardProduct."""
    serial_number: Optional[str] = None
    model: Optional[str] = None
    alcohol_module: Optional[str] = None
    next_recalibration_date: Optional[str] = None


class IntegrationServiceCardCreate(BaseModel):
    # gestorhs.os        → board de Serviços, origem = Ordem de Serviço
    # gestorhs.calibracao → board de Cobrança, origem = EquipamentoCliente
    source: Literal["gestorhs.os", "gestorhs.calibracao"]
    external_id: str = Field(..., min_length=1, max_length=100)
    board_id: int
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    client: IntegrationCardClient
    contact: Optional[IntegrationCardContact] = None
    devices: Optional[List[IntegrationCardDevice]] = None
    business_info: Optional[dict] = None


class IntegrationServiceCardResponse(BaseModel):
    id: int
    list_id: int
    title: str
    external_source: Optional[str] = None
    external_id: Optional[str] = None
    client_id: Optional[int] = None
    person_id: Optional[int] = None
    created: bool = Field(..., description="True se o card foi criado agora; False se já existia.")

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd backend && pytest tests/unit/test_integration_schemas.py -v`
Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/integration.py backend/tests/unit/test_integration_schemas.py
git commit -m "feat(integracao): schemas do contrato de criacao de card"
```

---

### Task 8: Service de criação (create-or-return)

O coração da fase 1. Se o par `(source, external_id)` já existe, devolve o card **sem alterar nada** — o vendedor é dono do card depois que ele nasce. Trata a corrida de dois requests simultâneos capturando `IntegrityError` e reconsultando.

**Files:**
- Create: `backend/app/services/integration_card_service.py`
- Test: `backend/tests/unit/test_integration_card_service.py`

**Interfaces:**
- Consumes: `IntegrationServiceCardCreate` (Task 7), `ServiceBoardRepository.find_entry_list` (Task 2), `ExternalClientRef` (Task 6), `ServiceCard.external_source`/`external_id` (Task 1).
- Produces: `IntegrationCardService(db).create_or_return(data, user) -> tuple[ServiceCard, bool]` — o `bool` é `True` quando o card foi criado agora.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_integration_card_service.py`:

```python
"""Testes do create-or-return da integração."""
import pytest
from fastapi import HTTPException

from app.models.client import Client
from app.models.external_client_ref import ExternalClientRef
from app.models.person import Person
from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList
from app.models.user import User
from app.core.security import hash_password
from app.schemas.integration import IntegrationServiceCardCreate
from app.services.integration_card_service import IntegrationCardService


@pytest.fixture
def usuario(db):
    role = Role(name="service", display_name="Serviço", permissions=[])
    db.add(role)
    db.commit()
    user = User(
        role_id=role.id, email="gestorhs@integracao.local", name="GestorHS (Integração)",
        password_hash=hash_password("x"), is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def board_com_entrada(db):
    board = ServiceBoard(name="Serviços")
    db.add(board)
    db.commit()
    db.add(ServiceList(board_id=board.id, name="Triagem", position=0))
    db.add(ServiceList(
        board_id=board.id, name="Dados Preenchidos", position=1, is_entry_stage=True
    ))
    db.commit()
    db.refresh(board)
    return board


@pytest.fixture
def board_sem_entrada(db):
    board = ServiceBoard(name="Cobrança")
    db.add(board)
    db.commit()
    db.add(ServiceList(board_id=board.id, name="Oportunidade", position=0))
    db.commit()
    db.refresh(board)
    return board


def payload(board_id, **overrides):
    base = {
        "source": "gestorhs.os",
        "external_id": "1234",
        "board_id": board_id,
        "title": "OS #1234 · Transportadora X",
        "client": {
            "external_id": "789", "name": "Transportadora X LTDA",
            "document": "12345678000199", "email": "contato@x.com",
        },
    }
    base.update(overrides)
    return IntegrationServiceCardCreate(**base)


def test_cria_o_card_na_etapa_de_entrada(db, usuario, board_com_entrada):
    card, created = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id), usuario
    )

    assert created is True
    assert card.external_source == "gestorhs.os"
    assert card.external_id == "1234"
    assert card.list.name == "Dados Preenchidos"


def test_reenvio_devolve_o_mesmo_card_sem_alterar(db, usuario, board_com_entrada):
    svc = IntegrationCardService(db)
    primeiro, _ = svc.create_or_return(payload(board_com_entrada.id), usuario)

    # o vendedor move e renomeia o card
    outra_lista = ServiceList(board_id=board_com_entrada.id, name="Em negociação", position=9)
    db.add(outra_lista)
    db.commit()
    primeiro.list_id = outra_lista.id
    primeiro.title = "Título que o vendedor editou"
    db.commit()

    segundo, created = svc.create_or_return(
        payload(board_com_entrada.id, title="Título original de novo"), usuario
    )

    assert created is False
    assert segundo.id == primeiro.id
    assert segundo.title == "Título que o vendedor editou"
    assert segundo.list_id == outra_lista.id
    assert db.query(ServiceCard).count() == 1


def test_board_sem_etapa_de_entrada_falha_alto(db, usuario, board_sem_entrada):
    with pytest.raises(HTTPException) as exc:
        IntegrationCardService(db).create_or_return(payload(board_sem_entrada.id), usuario)

    assert exc.value.status_code == 404
    assert db.query(ServiceCard).count() == 0


def test_board_inexistente_falha_alto(db, usuario):
    with pytest.raises(HTTPException) as exc:
        IntegrationCardService(db).create_or_return(payload(99999), usuario)

    assert exc.value.status_code == 404


def test_cria_o_cliente_e_o_vinculo_na_primeira_vez(db, usuario, board_com_entrada):
    card, _ = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id), usuario
    )

    ref = db.query(ExternalClientRef).filter_by(source="gestorhs", external_id="789").first()
    assert ref is not None
    assert card.client_id == ref.client_id
    cliente = db.query(Client).filter_by(id=ref.client_id).first()
    assert cliente.company_name == "Transportadora X LTDA"
    assert cliente.document == "12345678000199"


def test_reaproveita_o_cliente_ja_vinculado(db, usuario, board_com_entrada):
    svc = IntegrationCardService(db)
    primeiro, _ = svc.create_or_return(payload(board_com_entrada.id), usuario)
    segundo, _ = svc.create_or_return(
        payload(board_com_entrada.id, external_id="5678"), usuario
    )

    assert primeiro.client_id == segundo.client_id
    assert db.query(Client).count() == 1


def test_documento_repetido_de_outro_cliente_nao_derruba_a_criacao(
    db, usuario, board_com_entrada
):
    """O legado do GestorHS tem documentos repetidos; isso não pode travar o card."""
    db.add(Client(name="Já existia", document="12345678000199"))
    db.commit()

    card, created = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id), usuario
    )

    assert created is True
    assert card.client_id is not None
    assert db.query(Client).count() == 2


def test_cria_a_pessoa_de_contato_vinculada_ao_cliente(db, usuario, board_com_entrada):
    card, _ = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id, contact={
            "name": "João Silva", "email": "joao@x.com", "phone": "11999998888",
        }),
        usuario,
    )

    pessoa = db.query(Person).filter_by(id=card.person_id).first()
    assert pessoa.name == "João Silva"
    assert pessoa.organization_id == card.client_id


def test_aparelhos_vao_para_business_info(db, usuario, board_com_entrada):
    card, _ = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id, devices=[
            {"serial_number": "AB123", "model": "Alcotest 6820",
             "alcohol_module": "Sim", "next_recalibration_date": "2026-08-10"},
        ]),
        usuario,
    )

    equipamentos = card.business_info["equipamentos"]
    assert len(equipamentos) == 1
    assert equipamentos[0]["serial_number"] == "AB123"


def test_business_info_do_payload_e_preservado_junto_dos_aparelhos(
    db, usuario, board_com_entrada
):
    card, _ = IntegrationCardService(db).create_or_return(
        payload(
            board_com_entrada.id,
            business_info={"seller_name": "Sandra"},
            devices=[{"serial_number": "AB123"}],
        ),
        usuario,
    )

    assert card.business_info["seller_name"] == "Sandra"
    assert len(card.business_info["equipamentos"]) == 1


def test_o_card_registra_o_evento_de_criacao_com_o_usuario_da_integracao(
    db, usuario, board_com_entrada
):
    from app.models.service_card_activity import ServiceCardActivity

    card, _ = IntegrationCardService(db).create_or_return(
        payload(board_com_entrada.id), usuario
    )

    evento = (
        db.query(ServiceCardActivity)
        .filter_by(service_card_id=card.id, activity_type="card_created")
        .first()
    )
    assert evento is not None
    assert evento.user_id == usuario.id
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && pytest tests/unit/test_integration_card_service.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.integration_card_service'`

- [ ] **Step 3: Implementar o service**

Criar `backend/app/services/integration_card_service.py`:

```python
"""
Criação de cards de serviço vindos de sistemas externos.

Semântica: create-or-return, NÃO upsert. Depois que o card nasce, quem manda é o
vendedor no hsgrowth — reenviar o mesmo (source, external_id) devolve o card
existente sem alterar nada. Ver seção 4 do spec.
"""
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.external_client_ref import ExternalClientRef
from app.models.person import Person
from app.models.service_card import ServiceCard
from app.models.user import User
from app.repositories.service_board_repository import ServiceBoardRepository
from app.schemas.integration import (
    IntegrationCardClient,
    IntegrationCardContact,
    IntegrationServiceCardCreate,
)
from app.services.service_board_service import ServiceBoardService

# O vínculo de cliente não leva sufixo de entidade: o mesmo cliente do GestorHS é
# compartilhado pelos boards de Serviços e de Cobrança.
CLIENT_REF_SOURCE = "gestorhs"


class IntegrationCardService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ServiceBoardRepository(db)

    def create_or_return(
        self, data: IntegrationServiceCardCreate, user: User
    ) -> Tuple[ServiceCard, bool]:
        """Retorna (card, created). created=False significa que já existia e nada mudou."""
        existente = self._find_by_external_ref(data.source, data.external_id)
        if existente:
            return existente, False

        entry_list = self.repo.find_entry_list(data.board_id)
        if not entry_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Board {data.board_id} não existe ou não tem etapa de entrada "
                    f"configurada (nenhuma lista com is_entry_stage)."
                ),
            )

        client = self._resolve_client(data.client)
        person = self._resolve_person(data.contact, client) if data.contact else None

        business_info = dict(data.business_info or {})
        if data.devices:
            business_info["equipamentos"] = [d.model_dump() for d in data.devices]

        card = ServiceCard(
            list_id=entry_list.id,
            title=data.title,
            description=data.description,
            due_date=data.due_date,
            client_id=client.id,
            person_id=person.id if person else None,
            business_info=business_info or None,
            external_source=data.source,
            external_id=data.external_id,
            position=self.repo.next_position(entry_list.id),
        )
        self.db.add(card)

        try:
            self.db.commit()
        except IntegrityError:
            # Corrida: outro request criou o mesmo par entre a consulta e o commit.
            # A restrição de unicidade fez o seu trabalho — devolve o vencedor.
            self.db.rollback()
            vencedor = self._find_by_external_ref(data.source, data.external_id)
            if vencedor:
                return vencedor, False
            raise

        self.db.refresh(card)
        ServiceBoardService(self.db).log_event(
            card.id, user, "card_created", f"Card criado pela integração ({data.source})"
        )
        return card, True

    # ── internos ──────────────────────────────────────────────────────────────

    def _find_by_external_ref(self, source: str, external_id: str) -> Optional[ServiceCard]:
        return (
            self.db.query(ServiceCard)
            .filter(
                ServiceCard.external_source == source,
                ServiceCard.external_id == external_id,
            )
            .first()
        )

    def _resolve_client(self, payload: IntegrationCardClient) -> Client:
        """Dedup pelo id do sistema de origem, nunca por documento (ver docstring do model)."""
        ref = (
            self.db.query(ExternalClientRef)
            .filter(
                ExternalClientRef.source == CLIENT_REF_SOURCE,
                ExternalClientRef.external_id == payload.external_id,
            )
            .first()
        )
        if ref:
            client = self.db.query(Client).filter(Client.id == ref.client_id).first()
            if client:
                return client

        # Criado direto pelo model, sem passar por ClientService: aquele caminho rejeita
        # documento/email duplicado com 400, e o legado do GestorHS tem duplicatas que
        # não podem travar a criação do card. A unicidade aqui é a do vínculo externo.
        client = Client(
            name=payload.name,
            company_name=payload.name,
            document=payload.document,
            email=payload.email,
            phone=payload.phone,
            address=payload.address,
            city=payload.city,
            state=payload.state,
            source=CLIENT_REF_SOURCE,
        )
        self.db.add(client)
        self.db.flush()

        self.db.add(
            ExternalClientRef(
                source=CLIENT_REF_SOURCE,
                external_id=payload.external_id,
                client_id=client.id,
            )
        )
        self.db.flush()
        return client

    def _resolve_person(self, payload: IntegrationCardContact, client: Client) -> Person:
        """Reaproveita a pessoa pelo nome dentro do mesmo cliente; cria se não houver."""
        existente = (
            self.db.query(Person)
            .filter(Person.organization_id == client.id, Person.name == payload.name)
            .first()
        )
        if existente:
            return existente

        person = Person(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            organization_id=client.id,
        )
        self.db.add(person)
        self.db.flush()
        return person
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd backend && pytest tests/unit/test_integration_card_service.py -v`
Expected: PASS (11 testes)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/integration_card_service.py backend/tests/unit/test_integration_card_service.py
git commit -m "feat(integracao): service create-or-return de card de servico"
```

---

### Task 9: Endpoint e montagem do router

Expõe o service. O router **não** leva `require_service_access()` — aquela dependency exige JWT de usuário, e este caminho é autenticado só pela chave.

**Files:**
- Create: `backend/app/api/v1/endpoints/integration.py`
- Modify: `backend/app/api/v1/__init__.py:7,44`
- Test: `backend/tests/unit/test_integration_endpoint.py`

**Interfaces:**
- Consumes: `IntegrationCardService` (Task 8), `require_api_scope` (Task 5), schemas (Task 7).
- Produces: `POST /api/v1/integration/service-cards` → `201` (criado) ou `200` (já existia).

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_integration_endpoint.py`:

```python
"""Testes ponta a ponta do endpoint de integração."""
import pytest

from app.core.security import generate_api_key, hash_api_key, hash_password
from app.models.integration_client import IntegrationClient
from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.user import User

URL = "/api/v1/integration/service-cards"


@pytest.fixture
def chave(db):
    role = Role(name="service", display_name="Serviço", permissions=[])
    db.add(role)
    db.commit()
    user = User(
        role_id=role.id, email="gestorhs@integracao.local", name="GestorHS (Integração)",
        password_hash=hash_password("x"), is_active=True,
    )
    db.add(user)
    db.commit()

    k = generate_api_key()
    db.add(IntegrationClient(
        name="GestorHS", client_id="hsg_gestorhs", client_secret_hash="x",
        api_key_hash=hash_api_key(k), scopes=["service_cards:create"],
        impersonate_user_id=user.id, is_active=True,
    ))
    db.commit()
    return k


@pytest.fixture
def board(db):
    b = ServiceBoard(name="Serviços")
    db.add(b)
    db.commit()
    db.add(ServiceList(
        board_id=b.id, name="Dados Preenchidos", position=0, is_entry_stage=True
    ))
    db.commit()
    db.refresh(b)
    return b


def corpo(board_id, **overrides):
    base = {
        "source": "gestorhs.os",
        "external_id": "1234",
        "board_id": board_id,
        "title": "OS #1234 · Transportadora X",
        "client": {"external_id": "789", "name": "Transportadora X LTDA"},
    }
    base.update(overrides)
    return base


def test_cria_o_card_e_responde_201(client, chave, board):
    r = client.post(URL, json=corpo(board.id), headers={"X-API-Key": chave})

    assert r.status_code == 201
    body = r.json()
    assert body["created"] is True
    assert body["external_id"] == "1234"


def test_reenvio_responde_200_e_created_false(client, chave, board):
    client.post(URL, json=corpo(board.id), headers={"X-API-Key": chave})
    r = client.post(URL, json=corpo(board.id), headers={"X-API-Key": chave})

    assert r.status_code == 200
    assert r.json()["created"] is False


def test_sem_chave_responde_401(client, board):
    assert client.post(URL, json=corpo(board.id)).status_code == 401


def test_board_sem_etapa_de_entrada_responde_404(client, chave, db):
    b = ServiceBoard(name="Cobrança")
    db.add(b)
    db.commit()
    db.add(ServiceList(board_id=b.id, name="Oportunidade", position=0))
    db.commit()

    r = client.post(URL, json=corpo(b.id), headers={"X-API-Key": chave})
    assert r.status_code == 404


def test_source_invalido_responde_422(client, chave, board):
    r = client.post(
        URL, json=corpo(board.id, source="outro.sistema"), headers={"X-API-Key": chave}
    )
    assert r.status_code == 422


def test_os_e_calibracao_com_mesmo_id_geram_cards_distintos(client, chave, board):
    r1 = client.post(URL, json=corpo(board.id, source="gestorhs.os", external_id="500"),
                     headers={"X-API-Key": chave})
    r2 = client.post(URL, json=corpo(board.id, source="gestorhs.calibracao", external_id="500"),
                     headers={"X-API-Key": chave})

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] != r2.json()["id"]


def test_ciclos_de_calibracao_diferentes_geram_cards_distintos(client, chave, board):
    """O ano seguinte precisa virar card novo — por isso a data entra na chave."""
    r1 = client.post(
        URL, json=corpo(board.id, source="gestorhs.calibracao", external_id="500:2026-03-14"),
        headers={"X-API-Key": chave},
    )
    r2 = client.post(
        URL, json=corpo(board.id, source="gestorhs.calibracao", external_id="500:2027-03-14"),
        headers={"X-API-Key": chave},
    )

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] != r2.json()["id"]
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && pytest tests/unit/test_integration_endpoint.py -v`
Expected: FAIL — todos com `404` (a rota não existe)

- [ ] **Step 3: Criar o endpoint**

Criar `backend/app/api/v1/endpoints/integration.py`:

```python
"""
Endpoints de integração externa (autenticados por chave de API, não por JWT).

Ver docs/superpowers/specs/2026-07-18-integracao-gestorhs-design.md
"""
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_api_scope
from app.models.user import User
from app.schemas.integration import (
    IntegrationServiceCardCreate,
    IntegrationServiceCardResponse,
)
from app.services.integration_card_service import IntegrationCardService

router = APIRouter()


@router.post(
    "/service-cards",
    response_model=IntegrationServiceCardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cria um card de serviço a partir de um sistema externo",
)
async def create_service_card(
    data: IntegrationServiceCardCreate,
    response: Response,
    user: User = Depends(require_api_scope("service_cards:create")),
    db: Session = Depends(get_db),
):
    """
    Create-or-return idempotente por (source, external_id).

    - `201` — card criado agora.
    - `200` — já existia; **nada foi alterado** (o card pertence ao vendedor).
    """
    card, created = IntegrationCardService(db).create_or_return(data, user)

    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK

    return IntegrationServiceCardResponse(
        id=card.id,
        list_id=card.list_id,
        title=card.title,
        external_source=card.external_source,
        external_id=card.external_id,
        client_id=card.client_id,
        person_id=card.person_id,
        created=created,
    )
```

- [ ] **Step 4: Montar o router**

Em `backend/app/api/v1/__init__.py`, acrescentar `integration` ao import da linha 7 (ao fim da lista de nomes) e a linha de montagem logo após a do `service_activities` (linha 44):

```python
# Integração externa: autenticada por X-API-Key, NÃO por require_service_access
# (aquela dependency exige JWT de usuário e barraria a chave).
api_router.include_router(integration.router, prefix="/integration", tags=["Integração Externa"])
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd backend && pytest tests/unit/test_integration_endpoint.py -v`
Expected: PASS (7 testes)

- [ ] **Step 6: Rodar a suíte inteira**

Run: `cd backend && pytest -q`
Expected: PASS, sem regressões

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/v1/endpoints/integration.py backend/app/api/v1/__init__.py backend/tests/unit/test_integration_endpoint.py
git commit -m "feat(integracao): endpoint POST /integration/service-cards"
```

---

### Task 10: Provisionamento — usuário GestorHS e emissão da chave

Um script idempotente que cria o usuário de integração e emite a chave. A chave é impressa **uma única vez** e só o hash fica no banco.

**Files:**
- Create: `backend/scripts/provisionar_integracao_gestorhs.py`
- Test: `backend/tests/unit/test_provisionar_integracao.py`

**Interfaces:**
- Consumes: `generate_api_key`, `hash_api_key` (Task 4), `IntegrationClient`.
- Produces: `provisionar(db) -> tuple[IntegrationClient, str | None]` — a string é a chave em claro na primeira execução, `None` nas seguintes.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_provisionar_integracao.py`:

```python
"""O provisionamento tem que ser idempotente e nunca reemitir a chave em silêncio."""
from app.models.integration_client import IntegrationClient
from app.models.user import User
from scripts.provisionar_integracao_gestorhs import provisionar


def test_primeira_execucao_cria_usuario_client_e_devolve_a_chave(db):
    client, chave = provisionar(db)

    assert chave is not None and chave.startswith("hsg_live_")
    assert client.scopes == ["service_cards:create"]
    user = db.query(User).filter_by(id=client.impersonate_user_id).first()
    assert user.name == "GestorHS (Integração)"
    assert user.role.name == "service"


def test_segunda_execucao_nao_duplica_nem_reemite(db):
    provisionar(db)
    client, chave = provisionar(db)

    assert chave is None
    assert db.query(IntegrationClient).count() == 1
    assert db.query(User).filter_by(email="gestorhs@integracao.local").count() == 1


def test_a_chave_em_claro_nao_fica_no_banco(db):
    _, chave = provisionar(db)

    client = db.query(IntegrationClient).first()
    assert client.api_key_hash != chave
    assert len(client.api_key_hash) == 64
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && pytest tests/unit/test_provisionar_integracao.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.provisionar_integracao_gestorhs'`

- [ ] **Step 3: Escrever o script**

Criar `backend/scripts/provisionar_integracao_gestorhs.py`:

```python
"""
Provisiona a integração do GestorHS: usuário dedicado + integration client com chave.

Uso:
    cd backend && python -m scripts.provisionar_integracao_gestorhs

Idempotente: rodar de novo não duplica nem reemite a chave. Para rotacionar a chave,
use a tela de admin (ou desative este client e rode de novo com outro CLIENT_ID).
"""
import secrets
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.core.security import generate_api_key, hash_api_key, hash_password
from app.models.integration_client import IntegrationClient
from app.models.role import Role
from app.models.user import User

EMAIL = "gestorhs@integracao.local"
NOME_USUARIO = "GestorHS (Integração)"
CLIENT_ID = "hsg_gestorhs"
ESCOPOS = ["service_cards:create"]


def _get_or_create_user(db: Session) -> User:
    user = db.query(User).filter(User.email == EMAIL).first()
    if user:
        return user

    role = db.query(Role).filter(Role.name == "service").first()
    if not role:
        raise RuntimeError(
            "Role 'service' não existe. Rode as migrations antes de provisionar."
        )

    user = User(
        role_id=role.id,
        email=EMAIL,
        name=NOME_USUARIO,
        # Senha aleatória descartada: esta conta nunca faz login por formulário.
        password_hash=hash_password(secrets.token_urlsafe(32)),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def provisionar(db: Session) -> Tuple[IntegrationClient, Optional[str]]:
    """Retorna (client, chave_em_claro). A chave só vem na primeira execução."""
    user = _get_or_create_user(db)

    existente = db.query(IntegrationClient).filter(
        IntegrationClient.client_id == CLIENT_ID
    ).first()
    if existente:
        return existente, None

    chave = generate_api_key()
    client = IntegrationClient(
        name="GestorHS",
        description="Criação de cards de serviço a partir do GestorHS (OS e cobrança de calibração).",
        client_id=CLIENT_ID,
        client_secret_hash=hash_password(secrets.token_urlsafe(32)),  # não usado neste fluxo
        api_key_hash=hash_api_key(chave),
        scopes=ESCOPOS,
        impersonate_user_id=user.id,
        is_active=True,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client, chave


if __name__ == "__main__":
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        client, chave = provisionar(db)
        if chave:
            print("Integração do GestorHS provisionada.")
            print(f"  client_id: {client.client_id}")
            print(f"  escopos:   {client.scopes}")
            print()
            print("  CHAVE (copie agora — não será exibida de novo):")
            print(f"  {chave}")
        else:
            print(f"Já provisionado (client_id={client.client_id}). Chave não reemitida.")
    finally:
        db.close()
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd backend && pytest tests/unit/test_provisionar_integracao.py -v`
Expected: PASS (3 testes)

> Se o import `from scripts...` falhar, conferir se `backend/scripts/__init__.py` existe; criar vazio se não.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/provisionar_integracao_gestorhs.py backend/tests/unit/test_provisionar_integracao.py
git commit -m "feat(integracao): script de provisionamento do usuario e da chave do GestorHS"
```

---

### Task 11: Exibir os aparelhos no card

Os aparelhos vivem em `business_info["equipamentos"]` porque `ServiceCardProduct.aparelhos` exige um `product_id`, e produto é escolha do vendedor. Ele precisa ver esses dados na tela para montar o produto.

**Files:**
- Create: `frontend/src/components/service/ServiceDevicesSection.tsx`
- Modify: `frontend/src/pages/ServiceCardDetails.tsx`

**Interfaces:**
- Consumes: `card.business_info.equipamentos` — lista de `{serial_number?, model?, alcohol_module?, next_recalibration_date?}`.
- Produces: componente `<ServiceDevicesSection businessInfo={...} />`, que não renderiza nada quando não há aparelhos.

- [ ] **Step 1: Criar o componente**

Criar `frontend/src/components/service/ServiceDevicesSection.tsx`:

```tsx
/**
 * Aparelhos informados pelo sistema de origem (GestorHS), somente leitura.
 *
 * Vivem em business_info.equipamentos e não no campo `aparelhos` do produto porque
 * ServiceCardProduct exige product_id, e a escolha do produto é do vendedor.
 */
interface Device {
  serial_number?: string | null;
  model?: string | null;
  alcohol_module?: string | null;
  next_recalibration_date?: string | null;
}

interface Props {
  businessInfo?: Record<string, unknown> | null;
}

export default function ServiceDevicesSection({ businessInfo }: Props) {
  const devices = (businessInfo?.equipamentos as Device[] | undefined) ?? [];
  if (devices.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Aparelhos <span className="font-normal text-gray-500">(do GestorHS)</span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4 font-medium">Série</th>
              <th className="py-2 pr-4 font-medium">Modelo</th>
              <th className="py-2 pr-4 font-medium">Módulo álcool</th>
              <th className="py-2 font-medium">Próx. calibração</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {devices.map((d, i) => (
              <tr key={`${d.serial_number ?? "sem-serie"}-${i}`}>
                <td className="py-2 pr-4 font-mono text-xs">{d.serial_number || "—"}</td>
                <td className="py-2 pr-4">{d.model || "—"}</td>
                <td className="py-2 pr-4">{d.alcohol_module || "—"}</td>
                <td className="py-2">{d.next_recalibration_date || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Montar no card**

Em `frontend/src/pages/ServiceCardDetails.tsx`, adicionar o import junto dos outros imports de `components/service/`:

```tsx
import ServiceDevicesSection from "../components/service/ServiceDevicesSection";
```

E renderizar logo **antes** da seção de produtos (`ServiceProductSection`), já que o vendedor consulta os aparelhos para montar o produto:

```tsx
<ServiceDevicesSection businessInfo={card?.business_info} />
```

- [ ] **Step 3: Verificar visualmente**

Run: `cd frontend && npm run dev`

Abrir um card criado pela integração (ou inserir `business_info.equipamentos` à mão num card de teste) e confirmar: a tabela aparece com os aparelhos; num card sem aparelhos, nada é renderizado e o layout não muda.

- [ ] **Step 4: Verificar que o build passa**

Run: `cd frontend && npm run build`
Expected: build sem erros de TypeScript

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/service/ServiceDevicesSection.tsx frontend/src/pages/ServiceCardDetails.tsx
git commit -m "feat(servicos): exibe aparelhos vindos da integracao no card"
```

---

### Task 12: Documento de integração para o GestorHS

Guia autossuficiente para quem for implementar o lado cliente, sem precisar ler o código do hsgrowth. Espelha a estrutura do `docs/integration.md` que já existe no GestorHS.

**Files:**
- Create: `docs/integracao-gestorhs.md`

**Interfaces:**
- Consumes: o contrato final das Tasks 7 e 9.
- Produces: documento a ser copiado para `docs/` do repositório GestorHS.

- [ ] **Step 1: Escrever o documento**

Criar `docs/integracao-gestorhs.md` cobrindo, nesta ordem:

1. **Visão geral e direção do fluxo.** GestorHS → hsgrowth. Deixar explícito, com destaque, que **este contrato é handoff, não espelho** — ao contrário do TaskHS. Depois que o card nasce, o vendedor é dono dele; reenviar **não** atualiza. Não chamar a cada atualização da OS: chamar uma vez, no gatilho.
2. **Base URL e autenticação.** Header `X-API-Key`. A chave sai do script `provisionar_integracao_gestorhs.py` e é exibida uma única vez. Guardar em env (`HSGROWTH_BASE_URL`, `HSGROWTH_API_KEY`), gating igual ao do `taskhs_client.py` — env vazia = integração desligada, sem fallback. HTTPS obrigatório em produção.
3. **Referência do endpoint.** `POST {BASE}/api/v1/integration/service-cards`, tabela completa de campos (copiar de `app/schemas/integration.py`), e **um `curl` completo por board** — um `gestorhs.os`, um `gestorhs.calibracao`.
4. **Os dois `source` e a formação do `external_id`.** Tabela:

   | Gatilho | `source` | `external_id` |
   |---|---|---|
   | OS aberta | `gestorhs.os` | `str(ordem.id)` |
   | Calibração vencendo em 50 dias | `gestorhs.calibracao` | `f"{equipamento_cliente.id}:{prox_calibragem:%Y-%m-%d}"` |

   Explicar **por que a cobrança leva a data**: calibração é cíclica; sem a data, o card do ano seguinte bateria no par do ano anterior e não seria criado — em silêncio, resultando em cliente não cobrado.
5. **Códigos de status** — `201`, `200`, `401`, `403`, `404`, `422`, `5xx` — com o que fazer em cada um. Destacar que `200` é o caso **normal** de retry, não um erro.
6. **Semântica.** Idempotência por `(source, external_id)`; create-or-return; reenviar não atualiza.
7. **Onde plugar no GestorHS.** Na abertura da OS, seguindo o padrão de `api/espelhamento.py` (pós-commit, `BackgroundTasks`, best-effort). E o job diário dos 50 dias — registrar que **não existe agendador no GestorHS hoje** (sem Celery, sem APScheduler, sem cron) e que isso é infra nova; o job pode ser burro porque a criação é idempotente.
8. **O que a integração não faz.** Não preenche produto nem serviço do catálogo, e por quê (catálogos incompatíveis: "Calibração 1–4" sem regra documentada, nenhum serviço de Manutenção no hsgrowth, `Equipamento` sem SKU). Consequência: o card fica travado na etapa de entrada até o vendedor escolher os dois — isso é intencional. Não atualiza cards já criados. Não move card de volta.
9. **Checklist de configuração** ponta a ponta: provisionar a chave no hsgrowth → marcar `is_entry_stage` na lista de entrada de cada board → anotar os dois `board_id` → configurar as envs no GestorHS → testar com `curl` → ligar no fluxo real.

- [ ] **Step 2: Conferir o documento contra o código**

Reler `app/schemas/integration.py` e `app/api/v1/endpoints/integration.py` e confirmar campo a campo que a tabela do §3 e os `curl` do documento batem exatamente com o que o código aceita. Um `curl` do documento que retorne `422` é um bug do documento.

- [ ] **Step 3: Commit**

```bash
git add docs/integracao-gestorhs.md
git commit -m "docs(integracao): guia de integracao do GestorHS com o hsgrowth"
```

---

## Verificação final

- [ ] `cd backend && pytest -q` — suíte inteira passa
- [ ] `cd frontend && npm run build` — build sem erros
- [ ] Em um banco de desenvolvimento: `alembic upgrade head` aplica as 4 migrations sem erro
- [ ] `python -m scripts.provisionar_integracao_gestorhs` imprime a chave; rodar de novo diz "já provisionado"
- [ ] Marcar a etapa de entrada de cada board pelo endpoint de update de lista (`PUT /api/v1/service-boards/{board_id}/lists/{list_id}` com `{"is_entry_stage": true}`) — confirma que o campo está mesmo exposto e não depende de SQL na mão
- [ ] Exercitar o `curl` do documento ponta a ponta contra o backend rodando, nos dois boards

## Fora de escopo (fase 2)

Retorno hsgrowth → GestorHS quando o card é finalizado. Registrado na seção 14 do spec. O que este plano deixa pronto para ela: `external_source`/`external_id` no card, que é o vínculo com a OS.
