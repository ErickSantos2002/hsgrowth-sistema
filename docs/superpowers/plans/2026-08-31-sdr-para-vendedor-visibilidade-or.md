# SDR → Vendedor (Miguel e Karol) — visibilidade por vínculo (OR) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development ou superpowers:executing-plans. Passos com checkbox (`- [ ]`).

**Goal:** Permitir que **Miguel Luiz (user_id=16)** e **Karolaine Martins (user_id=9)** deixem de ser `sdr` e passem a `salesperson` **sem perder acesso** aos 3.314 negócios em que estão vinculados como SDR — incluindo os perdidos da Prospecção, que eles vão poder garimpar como vendedores.

**Architecture:** O sistema hoje decide o que a pessoa vê pelo **cargo** (`if role == "sdr" ... elif role == "salesperson"`), o que faz a carteira sumir quando o cargo muda. A mudança troca isso pelo **vínculo**: quem é vendedor **OU** SDR do card enxerga e edita o card (RN-037). Três pontos no backend (listar, editar, dashboard), um endpoint novo que alimenta os selects de SDR do frontend, e um script de migração pontual nos 338 cards em aberto — necessário porque a gamificação só pontua quem está no campo "vendedor". Nenhum dado histórico é reescrito.

**Tech Stack:** FastAPI + SQLAlchemy (backend), React + TypeScript (frontend), pytest, PostgreSQL.

**Convenções do projeto:**
- Testes backend: `docker exec -w /app hsgrowth-api-local python -m pytest ...`. A pasta `tests/` **não** é montada no container → `docker cp` antes de rodar.
- Git Bash: `export MSYS_NO_PATHCONV=1` antes dos comandos `docker exec` com caminho.
- **Reiniciar o container após editar backend** (`docker restart hsgrowth-api-local`) — uvicorn `--reload` + SSE trava em dev.
- Typecheck frontend: `cd frontend && npx tsc --noEmit`.
- **Perguntar antes de commitar.** Nunca commitar sozinho.

**Números levantados no banco (31/08/2026):**

| | Miguel (16) | Karol (9) |
|---|---|---|
| SDR + já tem vendedor | 65 | 43 |
| SDR sem vendedor — **em aberto** | **195** | **143** |
| SDR sem vendedor — perdidos | 1.373 | 1.495 |
| Como vendedor hoje | 0 | 0 |
| Tarefas pendentes | 232 | 136 |

---

## Task 1: Fixtures de teste para o cargo SDR

O `conftest.py` não tem a role `sdr` — sem ela nenhum teste das tasks seguintes roda.

**Files:**
- Modify: `backend/tests/conftest.py` (fixture `test_roles` ~L130-152; fixtures de user/token/headers ~L228-256, ~L375-386, ~L417-430)

- [ ] **Step 1: Adicionar a role `sdr` na fixture `test_roles`**

Em `backend/tests/conftest.py`, dentro da lista `roles_data`, após o dicionário do `salesperson`, adicionar:

```python
        {
            "name": "sdr",
            "display_name": "SDR",
            "description": "Prospecção e qualificação de leads",
            "permissions": ["cards.read", "cards.create", "cards.update", "boards.read"],
            "is_system_role": True
        }
```

- [ ] **Step 2: Adicionar as fixtures de usuário SDR**

Logo após a fixture `test_salesperson_user` (antes de `test_board`), adicionar:

```python
@pytest.fixture
def test_sdr_user(db: Session, test_roles: dict) -> User:
    """
    Cria um usuário SDR de teste.

    Args:
        db: Sessão de banco de dados
        test_roles: Roles de teste

    Returns:
        User: Usuário SDR criado
    """
    from sqlalchemy.orm import joinedload

    user = User(
        name="SDR User",
        email="sdr@test.com",
        password_hash=hash_password("sdr123"),
        role_id=test_roles["sdr"].id,
        is_active=True,
        is_deleted=False
    )
    db.add(user)
    db.commit()

    user = db.query(User).options(joinedload(User.role)).filter(User.id == user.id).first()
    return user
```

- [ ] **Step 3: Adicionar token e headers do SDR**

Após a fixture `salesperson_token`, adicionar:

```python
@pytest.fixture
def sdr_token(test_sdr_user: User) -> str:
    """
    Cria um token de autenticação para o usuário SDR.

    Args:
        test_sdr_user: Usuário SDR de teste

    Returns:
        str: Token JWT válido
    """
    return create_access_token(data={"sub": str(test_sdr_user.id)})
```

E após a fixture `salesperson_headers`:

```python
@pytest.fixture
def sdr_headers(sdr_token: str) -> dict:
    """
    Cria headers de autenticação para SDR.

    Args:
        sdr_token: Token JWT do SDR

    Returns:
        dict: Headers com Authorization
    """
    return {"Authorization": f"Bearer {sdr_token}"}
```

- [ ] **Step 4: Verificar que as fixtures carregam**

```bash
export MSYS_NO_PATHCONV=1
docker cp backend/tests hsgrowth-api-local:/app/tests
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_cards.py -q
```

Esperado: a suíte existente continua passando (nenhum teste novo ainda).

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add backend/tests/conftest.py
git commit -m "test: fixtures de usuario SDR no conftest"
```

---

## Task 2: Backend — listagem de cards por vínculo (OR)

Hoje `list_cards` usa `if/elif` no cargo: vendedor vê só `assigned_to_id`, SDR vê só `sdr_id`. Passa a ser: quem é **vendedor OU SDR** do card vê o card.

**Files:**
- Modify: `backend/app/repositories/card_repository.py` (`list_by_board` L50-104, `count_by_board` L142-183)
- Modify: `backend/app/services/card_service.py` (`list_cards` L269-281, chamadas L303-326)
- Test: `backend/tests/unit/test_visibilidade_vinculo.py` (criar)

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_visibilidade_vinculo.py`:

```python
"""
RN-037 — Visibilidade e edição de cards por VÍNCULO (vendedor OU SDR),
não por cargo. Garante que trocar o cargo de uma pessoa (SDR → Vendedor)
não faz a carteira dela sumir.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card import Card


@pytest.fixture
def card_sdr_sem_vendedor(db: Session, test_lists, test_salesperson_user) -> Card:
    """Card em que o vendedor está vinculado apenas como SDR (assigned_to_id vazio)."""
    card = Card(
        title="Card com SDR sem vendedor",
        list_id=test_lists[0].id,
        assigned_to_id=None,
        sdr_id=test_salesperson_user.id,
        value=500.00,
        position=0,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


class TestVisibilidadePorVinculo:
    """Listagem de cards para quem tem cargo de vendedor."""

    def test_vendedor_ve_card_em_que_e_sdr(
        self, client: TestClient, salesperson_headers, card_sdr_sem_vendedor, test_board
    ):
        """Vendedor enxerga card em que está vinculado como SDR (RN-037)."""
        response = client.get(
            f"/api/v1/cards?board_id={test_board.id}&all=true",
            headers=salesperson_headers,
        )

        assert response.status_code == 200
        ids = [c["id"] for c in response.json()["cards"]]
        assert card_sdr_sem_vendedor.id in ids

    def test_vendedor_nao_ve_card_de_terceiro(
        self, client: TestClient, salesperson_headers, db: Session, test_lists, test_manager_user, test_board
    ):
        """Vendedor não enxerga card sem vínculo nenhum com ele."""
        alheio = Card(
            title="Card de terceiro",
            list_id=test_lists[0].id,
            assigned_to_id=test_manager_user.id,
            sdr_id=None,
            position=1,
        )
        db.add(alheio)
        db.commit()
        db.refresh(alheio)

        response = client.get(
            f"/api/v1/cards?board_id={test_board.id}&all=true",
            headers=salesperson_headers,
        )

        assert response.status_code == 200
        ids = [c["id"] for c in response.json()["cards"]]
        assert alheio.id not in ids

    def test_sdr_ve_card_em_que_e_vendedor(
        self, client: TestClient, sdr_headers, db: Session, test_lists, test_sdr_user, test_board
    ):
        """A regra vale nos dois sentidos: SDR enxerga card em que é o vendedor."""
        card = Card(
            title="Card com SDR como vendedor",
            list_id=test_lists[0].id,
            assigned_to_id=test_sdr_user.id,
            sdr_id=None,
            position=2,
        )
        db.add(card)
        db.commit()
        db.refresh(card)

        response = client.get(
            f"/api/v1/cards?board_id={test_board.id}&all=true",
            headers=sdr_headers,
        )

        assert response.status_code == 200
        ids = [c["id"] for c in response.json()["cards"]]
        assert card.id in ids
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
export MSYS_NO_PATHCONV=1
docker cp backend/tests hsgrowth-api-local:/app/tests
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_visibilidade_vinculo.py -q
```

Esperado: **FAIL** em `test_vendedor_ve_card_em_que_e_sdr` (o card não aparece na lista) e em `test_sdr_ve_card_em_que_e_vendedor`.

- [ ] **Step 3: Adicionar o parâmetro `owner_or_sdr_id` no repositório**

Em `backend/app/repositories/card_repository.py`, em `list_by_board`, adicionar o parâmetro na assinatura logo após `sdr_include_orphan_lost`:

```python
        sdr_include_orphan_lost: bool = False,
        owner_or_sdr_id: Optional[int] = None,
```

E substituir o bloco de filtro do `sdr_id` (que hoje tem o `if sdr_include_orphan_lost` dentro) por:

```python
        if sdr_id is not None:
            query = query.filter(Card.sdr_id == sdr_id)

        if owner_or_sdr_id is not None:
            # RN-037: enxerga quem é vendedor OU SDR do card. O vínculo manda,
            # não o cargo — permite trocar de cargo sem perder a carteira.
            cond = (Card.assigned_to_id == owner_or_sdr_id) | (Card.sdr_id == owner_or_sdr_id)
            if sdr_include_orphan_lost:
                # RN-036: SDR na Aquisição vê também os PERDIDOS sem SDR (p/ resgatar)
                cond = cond | (Card.sdr_id.is_(None) & (Card.is_won == -1))
            query = query.filter(cond)
```

- [ ] **Step 4: Repetir em `count_by_board`**

No mesmo arquivo, em `count_by_board`, adicionar o mesmo parâmetro na assinatura após `sdr_include_orphan_lost`:

```python
        sdr_include_orphan_lost: bool = False,
        owner_or_sdr_id: Optional[int] = None,
```

E substituir o bloco de filtro do `sdr_id` pelo mesmo trecho do Step 3:

```python
        if sdr_id is not None:
            query = query.filter(Card.sdr_id == sdr_id)

        if owner_or_sdr_id is not None:
            # RN-037: enxerga quem é vendedor OU SDR do card. O vínculo manda,
            # não o cargo — permite trocar de cargo sem perder a carteira.
            cond = (Card.assigned_to_id == owner_or_sdr_id) | (Card.sdr_id == owner_or_sdr_id)
            if sdr_include_orphan_lost:
                # RN-036: SDR na Aquisição vê também os PERDIDOS sem SDR (p/ resgatar)
                cond = cond | (Card.sdr_id.is_(None) & (Card.is_won == -1))
            query = query.filter(cond)
```

- [ ] **Step 5: Usar o novo filtro no `card_service.list_cards`**

Em `backend/app/services/card_service.py`, substituir o bloco:

```python
        # SDRs e Vendedores só enxergam os próprios cards
        sdr_include_orphan_lost = False
        if current_user and current_user.role:
            if current_user.role.name == "sdr":
                sdr_id = current_user.id
                # Aquisição (board 7): SDR também enxerga os perdidos SEM SDR
                # (sdr_id nulo), para poder resgatá-los. Ver RN-036.
                # str(...) porque o board_id pode chegar como string "7" na request.
                sdr_include_orphan_lost = (str(board_id) == "7")
            elif current_user.role.name == "salesperson":
                assigned_to_id = current_user.id
```

por:

```python
        # SDRs e Vendedores só enxergam os cards em que têm vínculo — como
        # vendedor OU como SDR (RN-037). O vínculo manda, não o cargo: quem
        # muda de cargo continua enxergando a própria carteira.
        sdr_include_orphan_lost = False
        owner_or_sdr_id = None
        if current_user and current_user.role:
            if current_user.role.name in ("sdr", "salesperson"):
                owner_or_sdr_id = current_user.id
                if current_user.role.name == "sdr":
                    # Aquisição (board 7): SDR também enxerga os perdidos SEM SDR
                    # (sdr_id nulo), para poder resgatá-los. Ver RN-036.
                    # str(...) porque o board_id pode chegar como string "7" na request.
                    sdr_include_orphan_lost = (str(board_id) == "7")
```

- [ ] **Step 6: Repassar o parâmetro nas duas chamadas ao repositório**

No mesmo método, na chamada `self.card_repository.list_by_board(...)`, adicionar o argumento logo após `sdr_include_orphan_lost=sdr_include_orphan_lost,`:

```python
            owner_or_sdr_id=owner_or_sdr_id,
```

E o mesmo na chamada `self.card_repository.count_by_board(...)`, após `sdr_include_orphan_lost=sdr_include_orphan_lost,`:

```python
            owner_or_sdr_id=owner_or_sdr_id,
```

- [ ] **Step 7: Rodar os testes e confirmar que passam**

```bash
export MSYS_NO_PATHCONV=1
docker restart hsgrowth-api-local
docker cp backend/tests hsgrowth-api-local:/app/tests
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_visibilidade_vinculo.py tests/unit/test_cards.py -q
```

Esperado: **PASS** nos 3 testes novos e nenhuma regressão em `test_cards.py`.

- [ ] **Step 8: Commit** (perguntar antes)

```bash
git add backend/app/repositories/card_repository.py backend/app/services/card_service.py backend/tests/unit/test_visibilidade_vinculo.py
git commit -m "feat(cards): RN-037 visibilidade por vinculo (vendedor OU SDR)"
```

---

## Task 3: Backend — permissão de edição por vínculo (OR)

Sem isto, Miguel vira vendedor e toma **403** ao editar qualquer um dos cards em que é SDR.

**Files:**
- Modify: `backend/app/services/card_service.py` (`_check_card_write_permission` L206-230)
- Test: `backend/tests/unit/test_visibilidade_vinculo.py` (acrescentar classe)

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao final de `backend/tests/unit/test_visibilidade_vinculo.py`:

```python
class TestEdicaoPorVinculo:
    """Permissão de escrita para quem tem cargo de vendedor."""

    def test_vendedor_edita_card_em_que_e_sdr(
        self, client: TestClient, salesperson_headers, card_sdr_sem_vendedor
    ):
        """Vendedor consegue editar card em que está vinculado como SDR (RN-037)."""
        response = client.put(
            f"/api/v1/cards/{card_sdr_sem_vendedor.id}",
            headers=salesperson_headers,
            json={"title": "Titulo editado pelo vendedor"},
        )

        assert response.status_code == 200
        assert response.json()["title"] == "Titulo editado pelo vendedor"

    def test_vendedor_nao_edita_card_de_terceiro(
        self, client: TestClient, salesperson_headers, db: Session, test_lists, test_manager_user
    ):
        """Vendedor continua bloqueado em card sem vínculo nenhum com ele."""
        alheio = Card(
            title="Card de terceiro",
            list_id=test_lists[0].id,
            assigned_to_id=test_manager_user.id,
            sdr_id=None,
            position=3,
        )
        db.add(alheio)
        db.commit()
        db.refresh(alheio)

        response = client.put(
            f"/api/v1/cards/{alheio.id}",
            headers=salesperson_headers,
            json={"title": "Nao deveria passar"},
        )

        assert response.status_code == 403
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
export MSYS_NO_PATHCONV=1
docker cp backend/tests hsgrowth-api-local:/app/tests
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_visibilidade_vinculo.py::TestEdicaoPorVinculo -q
```

Esperado: **FAIL** em `test_vendedor_edita_card_em_que_e_sdr` com status 403.

- [ ] **Step 3: Aplicar a regra de vínculo na permissão de escrita**

Em `backend/app/services/card_service.py`, em `_check_card_write_permission`, substituir:

```python
        if role_name == "salesperson" and card.assigned_to_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para editar este card",
            )
```

por:

```python
        # RN-037: edita quem é vendedor OU SDR do card — o vínculo manda, não o cargo.
        if role_name == "salesperson" and current_user.id not in (card.assigned_to_id, card.sdr_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para editar este card",
            )
```

E, no bloco do SDR logo abaixo, substituir:

```python
            if card.sdr_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não tem permissão para editar este card",
                )
```

por:

```python
            # RN-037: vale nos dois sentidos — vendedor OU SDR do card.
            if current_user.id not in (card.assigned_to_id, card.sdr_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não tem permissão para editar este card",
                )
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
export MSYS_NO_PATHCONV=1
docker restart hsgrowth-api-local
docker cp backend/tests hsgrowth-api-local:/app/tests
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_visibilidade_vinculo.py -q
```

Esperado: **PASS** nos 5 testes do arquivo.

- [ ] **Step 5: Commit** (perguntar antes)

```bash
git add backend/app/services/card_service.py backend/tests/unit/test_visibilidade_vinculo.py
git commit -m "feat(cards): RN-037 permissao de edicao por vinculo"
```

---

## Task 4: Backend — dashboard por vínculo e por visão

Dois problemas hoje: (a) o dashboard da pessoa zera quando ela muda de cargo; (b) quando o **gerente** filtra por um usuário, o backend escolhe a coluna pelo **cargo atual** do alvo — então o histórico de SDR de quem virou vendedor fica inacessível. A correção usa a **visão ativa** (SDR/Vendedor) para escolher a coluna, o que também preserva a separação das métricas.

**Files:**
- Modify: `backend/app/services/report_service.py` (`_build_dashboard_user_filter` L142-174, chamada L222)
- Test: `backend/tests/unit/test_dashboard_vinculo.py` (criar)

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_dashboard_vinculo.py`:

```python
"""
RN-037 — Dashboard conta os cards por VÍNCULO (vendedor OU SDR) e, para
admin/gerente, pela VISÃO ativa (sdr/vendedor) em vez do cargo do alvo.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card import Card


@pytest.fixture
def card_sdr_dashboard(db: Session, test_lists, test_salesperson_user) -> Card:
    """Card em que o vendedor está vinculado apenas como SDR."""
    card = Card(
        title="Card SDR dashboard",
        list_id=test_lists[0].id,
        assigned_to_id=None,
        sdr_id=test_salesperson_user.id,
        value=1500.00,
        position=0,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


class TestDashboardPorVinculo:

    def test_dashboard_do_vendedor_conta_card_em_que_e_sdr(
        self, client: TestClient, salesperson_headers, card_sdr_dashboard
    ):
        """O dashboard da pessoa conta os cards em que ela é vendedor OU SDR."""
        response = client.get(
            "/api/v1/reports/dashboard?period=year",
            headers=salesperson_headers,
        )

        assert response.status_code == 200
        assert response.json()["total_cards"] >= 1

    def test_gerente_filtrando_visao_sdr_ve_historico(
        self, client: TestClient, manager_headers, card_sdr_dashboard, test_salesperson_user
    ):
        """
        Gerente com visão SDR + usuário selecionado enxerga o histórico de SDR
        mesmo que o cargo atual da pessoa seja vendedor.
        """
        response = client.get(
            f"/api/v1/reports/dashboard?period=year&user_id={test_salesperson_user.id}&view=sdr",
            headers=manager_headers,
        )

        assert response.status_code == 200
        assert response.json()["total_cards"] >= 1
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
export MSYS_NO_PATHCONV=1
docker cp backend/tests hsgrowth-api-local:/app/tests
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_dashboard_vinculo.py -q
```

Esperado: **FAIL** nos 2 testes (`total_cards == 0`).

- [ ] **Step 3: Reescrever `_build_dashboard_user_filter`**

Em `backend/app/services/report_service.py`, substituir o método inteiro (da assinatura até o `return []` final) por:

```python
    def _build_dashboard_user_filter(
        self,
        current_user: Optional[User] = None,
        user_id: Optional[int] = None,
        view: Optional[str] = None
    ) -> list:
        """
        Retorna lista de filtros SQLAlchemy a aplicar em todas as queries do dashboard.

        - salesperson/sdr: filtra pelo VÍNCULO — cards em que a pessoa é vendedor
          OU SDR (RN-037). O cargo não manda: quem muda de cargo continua vendo
          o próprio histórico.
        - admin/manager + user_id: a coluna vem da VISÃO ativa (sdr/vendedor);
          sem visão, cai no cargo do alvo e, em último caso, no vínculo.
        - admin/manager sem user_id: sem filtro (todos os dados)
        """
        if not current_user or not current_user.role:
            return []

        role_name = current_user.role.name

        if role_name in ("salesperson", "sdr"):
            return [or_(Card.assigned_to_id == current_user.id, Card.sdr_id == current_user.id)]

        if role_name in ("admin", "manager") and user_id:
            if view == "sdr":
                return [Card.sdr_id == user_id]
            if view == "vendedor":
                return [Card.assigned_to_id == user_id]

            target = self.db.query(User).filter(User.id == user_id).first()
            if target and target.role:
                if target.role.name == "salesperson":
                    return [Card.assigned_to_id == user_id]
                if target.role.name == "sdr":
                    return [Card.sdr_id == user_id]

            return [or_(Card.assigned_to_id == user_id, Card.sdr_id == user_id)]

        return []
```

`or_` já está importado no topo do arquivo (`from sqlalchemy import func, and_, or_, case`), não precisa mexer nos imports.

- [ ] **Step 4: Passar a visão na chamada**

No mesmo arquivo, dentro de `get_dashboard_kpis`, substituir:

```python
        uf = self._build_dashboard_user_filter(current_user, user_id)
```

por:

```python
        uf = self._build_dashboard_user_filter(current_user, user_id, view)
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
export MSYS_NO_PATHCONV=1
docker restart hsgrowth-api-local
docker cp backend/tests hsgrowth-api-local:/app/tests
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_dashboard_vinculo.py -q
```

Esperado: **PASS** nos 2 testes.

- [ ] **Step 6: Commit** (perguntar antes)

```bash
git add backend/app/services/report_service.py backend/tests/unit/test_dashboard_vinculo.py
git commit -m "feat(dashboard): RN-037 filtro por vinculo e por visao ativa"
```

---

## Task 5: Backend — endpoint `/users/sdrs`

Seis telas do frontend filtram `u.role === "sdr"` para montar os selects de SDR. Sem isto, Miguel e Karol somem de todos os filtros e dropdowns de SDR. Um endpoint único vira a fonte de verdade: **quem tem o cargo SDR ∪ quem já é SDR de algum card**.

**Files:**
- Modify: `backend/app/api/v1/endpoints/users.py` (inserir a rota logo após o handler `list_active_users`, **antes** da rota `/{user_id}` da L375 — senão o FastAPI casa `/sdrs` com `/{user_id}`)
- Test: `backend/tests/unit/test_users_sdrs.py` (criar)

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/unit/test_users_sdrs.py`:

```python
"""
RN-037 — GET /users/sdrs devolve quem tem cargo SDR e também quem já é
SDR de algum card (ex-SDR que virou vendedor), para não sumir dos filtros.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card import Card


class TestListaDeSdrs:

    def test_inclui_quem_tem_cargo_sdr(self, client: TestClient, manager_headers, test_sdr_user):
        """Quem tem o cargo SDR aparece na lista."""
        response = client.get("/api/v1/users/sdrs", headers=manager_headers)

        assert response.status_code == 200
        ids = [u["id"] for u in response.json()]
        assert test_sdr_user.id in ids

    def test_inclui_vendedor_que_e_sdr_de_card(
        self, client: TestClient, manager_headers, db: Session, test_lists, test_salesperson_user
    ):
        """Vendedor que é SDR de algum card também aparece (ex-SDR)."""
        card = Card(
            title="Card com ex-SDR",
            list_id=test_lists[0].id,
            assigned_to_id=None,
            sdr_id=test_salesperson_user.id,
            position=0,
        )
        db.add(card)
        db.commit()

        response = client.get("/api/v1/users/sdrs", headers=manager_headers)

        assert response.status_code == 200
        ids = [u["id"] for u in response.json()]
        assert test_salesperson_user.id in ids

    def test_nao_inclui_vendedor_sem_vinculo_sdr(
        self, client: TestClient, manager_headers, test_salesperson_user
    ):
        """Vendedor que nunca foi SDR de card nenhum não aparece."""
        response = client.get("/api/v1/users/sdrs", headers=manager_headers)

        assert response.status_code == 200
        ids = [u["id"] for u in response.json()]
        assert test_salesperson_user.id not in ids
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
export MSYS_NO_PATHCONV=1
docker cp backend/tests hsgrowth-api-local:/app/tests
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_users_sdrs.py -q
```

Esperado: **FAIL** com 404 (rota não existe).

- [ ] **Step 3: Criar a rota**

Em `backend/app/api/v1/endpoints/users.py`, inserir logo após o fim do handler `list_active_users` (o `return [...]` que fecha a lista de `UserResponse`) e antes do bloco `@router.get("/online", ...)`:

```python
@router.get(
    "/sdrs",
    response_model=List[UserResponse],
    summary="Usuários que atuam ou já atuaram como SDR",
    description="""
    Lista os usuários que devem aparecer nos filtros e seletores de SDR.

    Inclui:
    - quem tem o cargo SDR hoje;
    - quem já está vinculado como SDR em pelo menos um card (ex-SDR que mudou
      de cargo) — sem isso o histórico dessa pessoa sumiria dos filtros. Ver RN-037.

    Apenas usuários ativos, ordenados por nome.
    """,
)
async def list_sdr_users(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    from sqlalchemy import or_
    from sqlalchemy.orm import joinedload
    from app.models.role import Role
    from app.models.card import Card

    sdr_role_ids = [r.id for r in db.query(Role).filter(Role.name.ilike("sdr")).all()]
    sdr_card_user_ids = [
        row[0] for row in db.query(Card.sdr_id).filter(Card.sdr_id.isnot(None)).distinct().all()
    ]

    if not sdr_role_ids and not sdr_card_user_ids:
        return []

    users = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(
            User.is_active == True,
            User.is_deleted == False,
            or_(User.role_id.in_(sdr_role_ids), User.id.in_(sdr_card_user_ids)),
        )
        .order_by(User.name)
        .all()
    )

    return [
        UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            name=user.name,
            avatar_url=user.avatar_url,
            phone=getattr(user, 'phone', None),
            email_signature=getattr(user, 'email_signature', None),
            role_id=user.role_id,
            is_active=user.is_active,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
            role=user.role.name if user.role else None,
            role_name=user.role.display_name if user.role else None,
        )
        for user in users
    ]
```

> A construção do `UserResponse` acima é idêntica à do handler `list_active_users` (mesmos campos, mesma ordem) — se aquele mudar, este acompanha.

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
export MSYS_NO_PATHCONV=1
docker restart hsgrowth-api-local
docker cp backend/tests hsgrowth-api-local:/app/tests
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_users_sdrs.py -q
```

Esperado: **PASS** nos 3 testes.

- [ ] **Step 5: Conferir manualmente no banco real**

```bash
docker exec hsgrowth-api-local python -c "
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.card import Card
from sqlalchemy import or_
db=SessionLocal()
ids=[r[0] for r in db.query(Card.sdr_id).filter(Card.sdr_id.isnot(None)).distinct().all()]
rids=[r.id for r in db.query(Role).filter(Role.name.ilike('sdr')).all()]
us=db.query(User).filter(User.is_active==True, User.is_deleted==False, or_(User.role_id.in_(rids), User.id.in_(ids))).order_by(User.name).all()
print([(u.id,u.name,u.role.name) for u in us])
"
```

Esperado: a lista traz Claudia (8), Karolaine (9) e Miguel (16) — e continuará trazendo os dois mesmo depois da troca de cargo.

- [ ] **Step 6: Commit** (perguntar antes)

```bash
git add backend/app/api/v1/endpoints/users.py backend/tests/unit/test_users_sdrs.py
git commit -m "feat(users): endpoint /users/sdrs (cargo SDR + ex-SDR com card)"
```

---

## Task 6: Frontend — consumir `/users/sdrs` nos seletores

**Files:**
- Modify: `frontend/src/services/userService.ts` (após o método `listActive`, ~L84-90)
- Modify: `frontend/src/pages/KanbanBoard.tsx:1338`
- Modify: `frontend/src/components/kanban/CardModal.tsx:237`
- Modify: `frontend/src/pages/CardDetails.tsx:618`
- Modify: `frontend/src/components/cardDetails/SummarySection.tsx:78`
- Modify: `frontend/src/pages/Dashboard.tsx:80`
- Modify: `frontend/src/pages/Activities.tsx:303`
- Modify: `frontend/src/components/boards/ExportCardsModal.tsx:590`

- [ ] **Step 1: Adicionar o método no service**

Em `frontend/src/services/userService.ts`, logo após o método `listActive`:

```typescript
  /**
   * Lista quem deve aparecer nos seletores de SDR: quem tem o cargo SDR hoje
   * + quem já é SDR de algum card (ex-SDR que virou vendedor). Ver RN-037.
   */
  async listSdrs(): Promise<User[]> {
    const response = await api.get<User[]>("/api/v1/users/sdrs");
    return response.data;
  }
```

- [ ] **Step 2: KanbanBoard — filtro de SDR**

Em `frontend/src/pages/KanbanBoard.tsx`, adicionar o estado junto dos outros `useState` do topo do componente (perto de `const [sdrFilter, setSdrFilter] = useState("")`, L89):

```typescript
  const [sdrOptionsUsers, setSdrOptionsUsers] = useState<UserType[]>([]);
```

No `useEffect` que carrega usuários (`loadUsers`, ~L288-292), após `setAvailableUsers(users);`, acrescentar:

```typescript
        setSdrOptionsUsers(await userService.listSdrs());
```

E no `SelectMenu` do "Filtro por SDR" (~L1330-1345), trocar:

```typescript
                  ...availableUsers
                    .filter((u) => u.role === "sdr") // Apenas SDRs
                    .map((u) => ({
                      value: String(u.id),
                      label: u.name,
                    })),
```

por (a lista já vem filtrada do backend, o `.filter` sai):

```typescript
                  ...sdrOptionsUsers.map((u) => ({
                    value: String(u.id),
                    label: u.name,
                  })),
```

> Se o tipo `UserType` não estiver importado no arquivo, usar o mesmo import que `availableUsers` já usa.

- [ ] **Step 3: CardModal — select de SDR**

Em `frontend/src/components/kanban/CardModal.tsx`, trocar a L237:

```typescript
      setSDRs(activeUsers.filter((u) => u.role === "sdr"));
```

por:

```typescript
      setSDRs(await userService.listSdrs());
```

Conferir que a função que envolve essa linha é `async` e que `userService` está importado no arquivo; se não estiver, adicionar o import no mesmo padrão dos demais imports de service do arquivo.

- [ ] **Step 4: CardDetails — lista de SDRs**

Em `frontend/src/pages/CardDetails.tsx`, adicionar o estado junto dos demais `useState`:

```typescript
  const [sdrUsersList, setSdrUsersList] = useState<User[]>([]);
```

No `useEffect` que carrega `users`, após o `setUsers(...)`, acrescentar:

```typescript
      setSdrUsersList(await userService.listSdrs());
```

E trocar a L618:

```typescript
  const sdrUsers = users.filter((u) => u.role === "sdr");
```

por:

```typescript
  const sdrUsers = sdrUsersList;
```

- [ ] **Step 5: SummarySection — lista de SDRs**

Em `frontend/src/components/cardDetails/SummarySection.tsx`, trocar as L77-79:

```typescript
        // Filtra SDRs (role = "sdr")
        const sdrs = allUsers.filter((u) => u.role === "sdr");
        setSDRUsers(sdrs);
```

por:

```typescript
        // Quem pode figurar como SDR: cargo SDR + ex-SDR com card (RN-037)
        setSDRUsers(await userService.listSdrs());
```

- [ ] **Step 6: Dashboard — seletor de usuário na visão SDR**

Em `frontend/src/pages/Dashboard.tsx`, adicionar o estado:

```typescript
  const [sdrIds, setSdrIds] = useState<number[]>([]);
```

No `useEffect` que carrega a lista de usuários, acrescentar:

```typescript
      setSdrIds((await userService.listSdrs()).map((u) => u.id));
```

E trocar a L80:

```typescript
    view === "sdr" ? u.role === "sdr" : u.role === "salesperson"
```

por:

```typescript
    view === "sdr" ? sdrIds.includes(u.id) : u.role === "salesperson"
```

- [ ] **Step 7: Activities — dropdown de responsável na aba SDR**

Em `frontend/src/pages/Activities.tsx`, adicionar o estado:

```typescript
  const [sdrIds, setSdrIds] = useState<number[]>([]);
```

No `useEffect` que carrega `users`, acrescentar:

```typescript
      setSdrIds((await userService.listSdrs()).map((u) => u.id));
```

E trocar a L303:

```typescript
            users={users.filter((u) => u.role === view)}
```

por:

```typescript
            users={users.filter((u) => (view === "sdr" ? sdrIds.includes(u.id) : u.role === view))}
```

- [ ] **Step 8: ExportCardsModal — filtro de SDR**

Em `frontend/src/components/boards/ExportCardsModal.tsx`, adicionar o estado:

```typescript
  const [sdrIds, setSdrIds] = useState<number[]>([]);
```

No `useEffect` que carrega usuários, acrescentar:

```typescript
      setSdrIds((await userService.listSdrs()).map((u) => u.id));
```

E trocar a L590:

```typescript
                .filter((u) => u.role === "sdr")
```

por:

```typescript
                .filter((u) => sdrIds.includes(u.id))
```

- [ ] **Step 9: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: **nenhum erro**.

- [ ] **Step 10: Conferência visual**

Com o front rodando, logado como gerente:
1. Kanban do board Prospecção → o filtro "SDR" lista Miguel e Karol.
2. Dashboard → visão SDR → o seletor de usuário lista Miguel e Karol.
3. Atividades → aba SDR → o dropdown de responsável lista Miguel e Karol.
4. Detalhe de um card → o seletor de SDR lista Miguel e Karol.

- [ ] **Step 11: Commit** (perguntar antes)

```bash
git add frontend/src
git commit -m "feat(front): seletores de SDR consomem /users/sdrs (RN-037)"
```

---

## Task 7: Script de migração dos 338 cards em aberto

Só os cards **em aberto** e **sem vendedor** viram carteira de vendedor. Os perdidos e os que já têm outro vendedor **não são tocados** — a visibilidade deles já foi resolvida pelas tasks 2-4. O `sdr_id` é preservado em todos os casos.

**Files:**
- Create: `backend/scripts/migrate_sdr_para_vendedor.py`

- [ ] **Step 1: Criar o script**

Criar `backend/scripts/migrate_sdr_para_vendedor.py`:

```python
"""
Migração pontual: Miguel (16) e Karolaine (9) passam de SDR para Vendedor.

Preenche assigned_to_id = sdr_id nos cards EM ABERTO em que eles são SDR e
o card ainda não tem vendedor. Necessário porque a gamificação só pontua
quem está no campo "vendedor" (assigned_to_id) quando o card é ganho.

NÃO toca em:
  - cards perdidos/ganhos (histórico de prospecção fica intacto);
  - cards que já têm outro vendedor;
  - o campo sdr_id (o crédito de prospecção é preservado em todos os casos).

Execução (dentro do container):
    # Dry-run (só mostra o que seria feito, sem alterar nada):
    docker exec hsgrowth-api-local python scripts/migrate_sdr_para_vendedor.py

    # Execução real:
    docker exec hsgrowth-api-local python scripts/migrate_sdr_para_vendedor.py --apply

O modo --apply grava backup_migrate_sdr_para_vendedor.json com os IDs alterados,
para permitir reversão.
"""
import sys
import json

sys.path.insert(0, "/app")

from app.db.session import SessionLocal
from app.models.card import Card
from app.models.user import User

# ─── Configuração ────────────────────────────────────────────────────────────
USER_IDS = [16, 9]     # Miguel Luiz, Karolaine Martins
BACKUP_FILE = "/app/backup_migrate_sdr_para_vendedor.json"
DRY_RUN = "--apply" not in sys.argv
# ─────────────────────────────────────────────────────────────────────────────


def run():
    db = SessionLocal()

    try:
        cards = (
            db.query(Card)
            .filter(
                Card.sdr_id.in_(USER_IDS),
                Card.assigned_to_id.is_(None),
                Card.is_won == 0,
                Card.deleted_at.is_(None),
            )
            .order_by(Card.sdr_id, Card.id)
            .all()
        )

        mode = "DRY-RUN" if DRY_RUN else "APLICANDO"
        print(f"\n{'=' * 70}")
        print(f"  Migração SDR -> Vendedor (assigned_to_id = sdr_id)")
        print(f"  Usuários: {USER_IDS}")
        print(f"  Escopo: cards EM ABERTO, sem vendedor, não deletados")
        print(f"  Modo: {mode}")
        print(f"  Cards encontrados: {len(cards)}")
        print(f"{'=' * 70}\n")

        if not cards:
            print("Nada a fazer.")
            return

        por_usuario = {}
        for card in cards:
            por_usuario[card.sdr_id] = por_usuario.get(card.sdr_id, 0) + 1

        for uid, qtd in sorted(por_usuario.items()):
            user = db.query(User).filter(User.id == uid).first()
            print(f"  {user.name if user else uid} (id={uid}): {qtd} cards")

        print("\n  Amostra (10 primeiros):")
        for card in cards[:10]:
            print(f"    card_id={card.id} | sdr_id={card.sdr_id} | '{card.title[:45]}'")

        if DRY_RUN:
            print(f"\n[DRY-RUN] Nada foi alterado. Rode com --apply para aplicar.\n")
            return

        backup = [{"card_id": c.id, "sdr_id": c.sdr_id} for c in cards]
        with open(BACKUP_FILE, "w", encoding="utf-8") as f:
            json.dump(backup, f, ensure_ascii=False, indent=2)
        print(f"\n  Backup gravado em {BACKUP_FILE} ({len(backup)} registros)")

        for card in cards:
            card.assigned_to_id = card.sdr_id

        db.commit()
        print(f"\n[OK] {len(cards)} cards atualizados (sdr_id preservado).\n")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
```

- [ ] **Step 2: Rodar o dry-run**

```bash
docker exec hsgrowth-api-local python scripts/migrate_sdr_para_vendedor.py
```

Esperado (confere com o levantamento):
```
Cards encontrados: 338
  Karolaine Martins (id=9): 143 cards
  Miguel Luiz (id=16): 195 cards
[DRY-RUN] Nada foi alterado.
```

**Se o número divergir de 338, parar e reavaliar** — o banco mudou desde o levantamento.

- [ ] **Step 3: Commit do script** (perguntar antes; ainda sem aplicar)

```bash
git add backend/scripts/migrate_sdr_para_vendedor.py
git commit -m "chore(scripts): migracao SDR->Vendedor dos cards em aberto (dry-run)"
```

---

## Task 8: Execução em produção (com aprovação a cada passo)

Nenhum passo desta task roda sem o "ok" explícito do usuário.

**Files:** nenhum (operação)

- [ ] **Step 1: Confirmar a lista do dry-run com o usuário**

Apresentar a contagem por usuário e a amostra. Aguardar aprovação.

- [ ] **Step 2: Aplicar a migração**

```bash
docker exec hsgrowth-api-local python scripts/migrate_sdr_para_vendedor.py --apply
```

Esperado: `[OK] 338 cards atualizados (sdr_id preservado).`

- [ ] **Step 3: Conferir o resultado**

```bash
docker exec hsgrowth-api-local python -c "
from app.db.session import SessionLocal
from app.models.card import Card
from sqlalchemy import func
db=SessionLocal()
for uid,n in [(16,'Miguel'),(9,'Karol')]:
    v=db.query(func.count(Card.id)).filter(Card.assigned_to_id==uid, Card.deleted_at.is_(None)).scalar()
    s=db.query(func.count(Card.id)).filter(Card.sdr_id==uid, Card.deleted_at.is_(None)).scalar()
    print(n,'| como vendedor:',v,'| como SDR (deve ficar igual ao original):',s)
"
```

Esperado: Miguel — vendedor **195**, SDR **1633** (inalterado). Karol — vendedor **143**, SDR **1681** (inalterado).

- [ ] **Step 4: Trocar o cargo dos dois**

Pela interface: **Configurações → Usuários → Miguel Luiz → Role = Vendedor** (idem Karolaine Martins). Confirmar com o usuário antes.

- [ ] **Step 5: Validação com os dois logados**

Checklist a validar com Miguel e Karol:
1. Kanban Prospecção → enxergam os cards em aberto **e** os perdidos antigos deles.
2. Abrir um card antigo e editar → salva sem 403.
3. Dashboard próprio → KPIs preenchidos (não zerados).
4. Atividades → as tarefas pendentes deles continuam na lista.
5. Ligação pelo ramal → funciona (ramal não foi tocado).
6. Gerente: Dashboard → visão SDR → seleciona Miguel → histórico de prospecção aparece.

- [ ] **Step 6: Reversão (só se algo der errado)**

```bash
docker exec hsgrowth-api-local python -c "
import json
from app.db.session import SessionLocal
from app.models.card import Card
db=SessionLocal()
data=json.load(open('/app/backup_migrate_sdr_para_vendedor.json'))
for item in data:
    c=db.query(Card).filter(Card.id==item['card_id']).first()
    if c: c.assigned_to_id=None
db.commit()
print('revertidos:', len(data))
"
```

E voltar o cargo dos dois para SDR pela interface.

---

## Task 9: Documentação e changelog

**Files:**
- Modify: `docs/07-*.md` (documento de regras de negócio, onde vive a RN-036)
- Modify: `CHANGELOG.md`
- Modify: `frontend/src/components/common/ChangelogModal.tsx`
- Modify: `frontend/src/layouts/MainLayout.tsx` (rodapé com a versão)

- [ ] **Step 1: Localizar o documento de regras**

```bash
ls docs/ | grep -i "07"
grep -rn "RN-036" docs/ | head -5
```

- [ ] **Step 2: Documentar a RN-037**

No mesmo documento onde está a RN-036, adicionar:

```markdown
### RN-037 — Visibilidade e edição por vínculo (não por cargo)

Um usuário com cargo **Vendedor** ou **SDR** enxerga e edita os cards em que
está vinculado como **vendedor OU como SDR**. O cargo não determina mais qual
coluna é consultada.

**Motivo:** antes, a visibilidade era `assigned_to_id` para vendedor e `sdr_id`
para SDR, de forma exclusiva. Quem mudava de cargo perdia acesso a toda a
carteira anterior (caso Miguel/Karol, 31/08/2026 — 3.314 cards).

**Onde vale:**
- listagem de cards (`card_service.list_cards` → `owner_or_sdr_id`)
- permissão de escrita (`card_service._check_write_permission`)
- dashboard próprio (`report_service._build_dashboard_user_filter`)

**Dashboard de admin/gerente:** ao filtrar por um usuário, a coluna vem da
**visão ativa** (SDR/Vendedor), não do cargo do alvo — assim o histórico de
quem mudou de cargo continua acessível e as métricas de SDR e de Vendedor
seguem separadas.

**Seletores de SDR:** alimentados por `GET /api/v1/users/sdrs` — cargo SDR
∪ quem já é SDR de algum card.

**Não altera:** RN-036 (SDR resgatar perdidos órfãos na Aquisição) continua
restrita a quem tem o cargo SDR.
```

- [ ] **Step 3: Atualizar a versão nos 3 lugares**

Seguindo a convenção do projeto: `CHANGELOG.md`, `ChangelogModal.tsx` e o rodapé do `MainLayout.tsx`. Entrada sugerida:

```markdown
### Adicionado
- **RN-037 — visibilidade por vínculo:** vendedores e SDRs passam a enxergar e
  editar os cards em que são vendedor **ou** SDR. Permite trocar o cargo de uma
  pessoa sem que a carteira dela desapareça.
- Endpoint `GET /users/sdrs` — alimenta os filtros de SDR com quem tem o cargo
  hoje **e** quem já atuou como SDR em algum card.

### Alterado
- Dashboard de admin/gerente: ao filtrar por usuário, a coluna consultada passa
  a vir da visão ativa (SDR/Vendedor) em vez do cargo atual da pessoa.
```

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git add docs CHANGELOG.md frontend/src/components/common/ChangelogModal.tsx frontend/src/layouts/MainLayout.tsx
git commit -m "docs: RN-037 visibilidade por vinculo + changelog"
```

---

## Task 10 (OPCIONAL — decisão do usuário): bug da comissão do SDR

**Não executar sem aprovação explícita** — muda comportamento de negócio.

Em `backend/app/services/card_service.py:1766`:

```python
                        if sdr_user and sdr_user.role == "sdr":
```

Compara o **objeto** `Role` com a string `"sdr"` — sempre `False`. Ou seja, a comissão de 1/4 dos pontos para o SDR quando um card é ganho **nunca foi paga**. A correção é `sdr_user.role.name == "sdr"`, mas isso **liga** uma regra de pontuação que hoje está inerte, mudando os rankings daqui pra frente.

Independe deste plano: mesmo sem corrigir, cards em que `sdr_id == assigned_to_id` não pontuam em dobro — a linha 1763 já exige que sejam pessoas diferentes.

---

## Riscos e decisões registradas

| Risco | Mitigação |
|---|---|
| Vendedor passa a enxergar cards em que é SDR e que já têm **outro** vendedor (108 cards) | Aceito — é histórico deles; some do "meus cards" só se o `sdr_id` for limpo, o que não faremos |
| Dupla contagem nos KPIs do gerente nos 338 cards migrados (contam na visão SDR e na Vendedor) | Aceito — as duas coisas são verdade nesses cards |
| RN-036 (resgatar órfãos na Aquisição) deixa de valer para Miguel/Karol | Aceito — como vendedores, eles resgatam pelo fluxo normal de reopen |
| Cards novos criados por eles não terão SDR (`create_card` zera `sdr_id` para vendedor) | Esperado — eles não fazem mais prospecção |
| Migração aplicada no volume errado | Dry-run obrigatório + conferência do número 338 + backup JSON reversível |
