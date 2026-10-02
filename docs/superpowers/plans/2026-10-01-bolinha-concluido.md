# Bolinha "concluído" pessoal — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada usuário pode marcar um card (Vendas ou Serviço) como "concluído" só para si, com desmarcação automática ao trocar de board ou mudar entre aberto/ganho/perdido, e filtro "Concluídos por mim".

**Architecture:** Tabela `card_checks` guarda (usuário, card, foto do contexto: board + situação). Na listagem do board, o serviço `CardCheckService` compara a foto com o contexto atual em lote; válidas viram `checked_by_me=true`, inválidas são apagadas. Endpoints PUT/DELETE `/check` marcam/desmarcam. No front, um componente `CardCheckButton` reaproveitado nos dois cards, com atualização otimista, e um filtro novo nos dois boards.

**Tech Stack:** FastAPI + SQLAlchemy síncrono + Alembic + pytest (SQLite); React + TS + Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-01-bolinha-concluido-design.md`

**Comandos:**
- Testes: `export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"; export MSYS_NO_PATHCONV=1; docker exec -w /app hsgrowth-api-local python -m pytest -q -p no:warnings <alvo>`
- Typecheck: `cd frontend && npx tsc --noEmit`
- **Commits:** só com autorização do usuário ("posso commitar?") — ao fim do trabalho, um commit único.

---

### Task 1: Modelo `CardCheck` + migration

**Files:**
- Create: `backend/app/models/card_check.py`
- Modify: `backend/app/models/__init__.py` (import + `__all__`)
- Create: `backend/alembic/versions/2026_10_01_1200-d8e9f0a1b2c3_bolinha_concluido.py`

- [ ] **Step 1: Modelo**

```python
"""
Modelo de CardCheck — a "bolinha" de concluído de um card, por usuário.

É organização pessoal (como no Trello): cada usuário marca o que já fez da sua
parte, e só ele vê a marcação.

A marcação guarda uma foto do contexto do card no momento do clique — o board
e a situação (aberto/ganho/perdido). Se o card for para outro board ou mudar de
situação, a foto deixa de bater e a marcação deixa de valer. Assim nenhum dos
muitos caminhos que mexem no card (arrastar, ganho/perdido, automações,
"Unificado"...) precisa lembrar de desmarcar.
"""
from datetime import datetime

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

from app.db.base import Base


class CardCheck(Base):
    """Marcação de concluído de um card (Vendas ou Serviço) por um usuário."""

    __tablename__ = "card_checks"
    __table_args__ = (
        UniqueConstraint("user_id", "card_id", name="uq_card_checks_user_card"),
        UniqueConstraint("user_id", "service_card_id", name="uq_card_checks_user_service_card"),
        CheckConstraint(
            "(card_id IS NULL) <> (service_card_id IS NULL)",
            name="ck_card_checks_um_card",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,
        comment="Quem marcou",
    )
    card_id = Column(
        Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=True,
        comment="Card de Vendas",
    )
    service_card_id = Column(
        Integer, ForeignKey("service_cards.id", ondelete="CASCADE"), nullable=True,
        comment="Card de Serviço",
    )
    board_id = Column(Integer, nullable=False, comment="Board do card no momento do clique")
    situacao = Column(String(10), nullable=False, comment="aberto | ganho | perdido no clique")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return (
            f"<CardCheck(user={self.user_id}, card={self.card_id}, "
            f"service_card={self.service_card_id})>"
        )
```

- [ ] **Step 2: Registrar** em `backend/app/models/__init__.py`, depois do bloco de integração:

```python
# Bolinha "concluído" pessoal nos cards (Vendas e Serviço)
from app.models.card_check import CardCheck  # noqa
```
e `"CardCheck",` no fim de `__all__`.

- [ ] **Step 3: Migration** (`revision = 'd8e9f0a1b2c3'`, `down_revision = 'c7d8e9f0a1b2'`): `op.create_table('card_checks', ...)` com as mesmas colunas/constraints (created_at com `server_default=sa.text('CURRENT_TIMESTAMP')`), índices `ix_card_checks_user_id`, `ix_card_checks_card_id`, `ix_card_checks_service_card_id`; `downgrade` derruba índices e tabela.

- [ ] **Step 4:** `docker exec -w /app hsgrowth-api-local python -c "import app.models; from app.models import CardCheck; print(CardCheck.__table__.c.keys())"` → lista as colunas.

---

### Task 2: `CardCheckService` (regra da foto) + testes

**Files:**
- Create: `backend/app/services/card_check_service.py`
- Create: `backend/tests/unit/test_card_check.py`

- [ ] **Step 1: Testes do serviço (falham)** — situação de Vendas e Serviço; marcar/desmarcar idempotente; `ids_validos` devolve só as fotos que batem e apaga as que não batem.

```python
"""Bolinha "concluído" pessoal: regra da foto (board + situação)."""
from types import SimpleNamespace

from app.models.card_check import CardCheck
from app.services.card_check_service import (
    CardCheckService, situacao_card, situacao_lista_servico,
)


def test_situacao_card_de_vendas():
    assert situacao_card(SimpleNamespace(is_won=0)) == "aberto"
    assert situacao_card(SimpleNamespace(is_won=1)) == "ganho"
    assert situacao_card(SimpleNamespace(is_won=-1)) == "perdido"
    assert situacao_card(SimpleNamespace(is_won=None)) == "aberto"


def test_situacao_de_lista_de_servico_por_flag_ou_nome():
    L = lambda nome, done=False, lost=False: SimpleNamespace(name=nome, is_done_stage=done, is_lost_stage=lost)
    assert situacao_lista_servico(L("Entrada")) == "aberto"
    assert situacao_lista_servico(L("Fechado", done=True)) == "ganho"
    assert situacao_lista_servico(L("Negócio Ganho")) == "ganho"
    assert situacao_lista_servico(L("Negócio Perdido")) == "perdido"
    assert situacao_lista_servico(L("X", lost=True)) == "perdido"
    assert situacao_lista_servico(None) == "aberto"


def test_ids_validos_mantem_quem_bate_e_apaga_quem_nao_bate(db, test_admin_user, test_card):
    svc = CardCheckService(db)
    svc.marcar(test_admin_user.id, "card_id", test_card.id, board_id=6, situacao="aberto")
    assert svc.ids_validos(test_admin_user.id, "card_id", {test_card.id: (6, "aberto")}) == {test_card.id}
    # mudou a situação → não vale mais e some do banco
    assert svc.ids_validos(test_admin_user.id, "card_id", {test_card.id: (6, "ganho")}) == set()
    assert db.query(CardCheck).count() == 0


def test_marcar_duas_vezes_atualiza_a_foto_e_desmarcar_e_idempotente(db, test_admin_user, test_card):
    svc = CardCheckService(db)
    svc.marcar(test_admin_user.id, "card_id", test_card.id, board_id=6, situacao="aberto")
    svc.marcar(test_admin_user.id, "card_id", test_card.id, board_id=7, situacao="ganho")
    linhas = db.query(CardCheck).all()
    assert len(linhas) == 1 and (linhas[0].board_id, linhas[0].situacao) == (7, "ganho")
    svc.desmarcar(test_admin_user.id, "card_id", test_card.id)
    svc.desmarcar(test_admin_user.id, "card_id", test_card.id)
    assert db.query(CardCheck).count() == 0
```

- [ ] **Step 2:** rodar `tests/unit/test_card_check.py` → FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```python
"""
Bolinha "concluído" pessoal nos cards (Vendas e Serviço).

A marcação vale enquanto o card estiver no MESMO board e na MESMA situação
(aberto/ganho/perdido) de quando foi marcada. Ver app/models/card_check.py.
"""
from typing import Dict, Optional, Set, Tuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.card_check import CardCheck

Contexto = Tuple[int, str]  # (board_id, situacao)


def situacao_card(card) -> str:
    """Card de Vendas: is_won 1 = ganho, -1 = perdido, resto = aberto."""
    if card.is_won == 1:
        return "ganho"
    if card.is_won == -1:
        return "perdido"
    return "aberto"


def situacao_lista_servico(lista) -> str:
    """Card de Serviço: a situação vem da lista, por flag OU nome (as listas nem sempre têm a flag)."""
    if not lista:
        return "aberto"
    nome = (lista.name or "").lower()
    if lista.is_done_stage or "ganho" in nome:
        return "ganho"
    if lista.is_lost_stage or "perdido" in nome:
        return "perdido"
    return "aberto"


class CardCheckService:
    def __init__(self, db: Session):
        self.db = db

    def _buscar(self, user_id: int, coluna: str, card_id: int) -> Optional[CardCheck]:
        return (
            self.db.query(CardCheck)
            .filter(CardCheck.user_id == user_id, getattr(CardCheck, coluna) == card_id)
            .first()
        )

    def marcar(self, user_id: int, coluna: str, card_id: int, board_id: int, situacao: str) -> None:
        """Marca (ou atualiza a foto, se já marcado). `coluna` = 'card_id' ou 'service_card_id'."""
        check = self._buscar(user_id, coluna, card_id)
        if check is None:
            check = CardCheck(user_id=user_id, **{coluna: card_id})
            self.db.add(check)
        check.board_id = board_id
        check.situacao = situacao
        try:
            self.db.commit()
        except IntegrityError:
            # Clique duplo: a outra requisição já gravou — o resultado é o mesmo.
            self.db.rollback()

    def desmarcar(self, user_id: int, coluna: str, card_id: int) -> None:
        self.db.query(CardCheck).filter(
            CardCheck.user_id == user_id, getattr(CardCheck, coluna) == card_id
        ).delete(synchronize_session=False)
        self.db.commit()

    def ids_validos(self, user_id: int, coluna: str, contextos: Dict[int, Contexto]) -> Set[int]:
        """Ids marcados pelo usuário cuja foto bate com o contexto atual.
        Marcações que não batem mais são apagadas aqui mesmo (limpeza preguiçosa)."""
        if not contextos:
            return set()
        campo = getattr(CardCheck, coluna)
        checks = (
            self.db.query(CardCheck)
            .filter(CardCheck.user_id == user_id, campo.in_(list(contextos)))
            .all()
        )
        validos: Set[int] = set()
        vencidos = []
        for ch in checks:
            cid = getattr(ch, coluna)
            if (ch.board_id, ch.situacao) == contextos[cid]:
                validos.add(cid)
            else:
                vencidos.append(ch.id)
        if vencidos:
            self.db.query(CardCheck).filter(CardCheck.id.in_(vencidos)).delete(synchronize_session=False)
            self.db.commit()
        return validos
```

- [ ] **Step 4:** rodar → PASS.

---

### Task 3: Vendas — endpoints + `checked_by_me` na listagem do board

**Files:**
- Modify: `backend/app/schemas/card.py` (`CardMinimalResponse`, após `is_stuck_7d`)
- Modify: `backend/app/services/card_service.py` (ramo `minimal` de `list_cards`)
- Modify: `backend/app/api/v1/endpoints/cards.py` (2 rotas novas)
- Test: `backend/tests/unit/test_card_check.py`

- [ ] **Step 1: Testes (falham)** — anexar ao arquivo:

```python
from app.models.board import Board
from app.models.list import List as BoardList


def _marcado(client, headers, board_id, card_id):
    r = client.get(f"/api/v1/cards?minimal=true&board_id={board_id}&all=true", headers=headers)
    assert r.status_code == 200, r.text
    return next(c for c in r.json()["cards"] if c["id"] == card_id)["checked_by_me"]


class TestBolinhaVendas:
    def test_marcar_e_desmarcar(self, client, manager_headers, test_card, test_board):
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is False
        r = client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        assert r.status_code == 200 and r.json() == {"checked": True}
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is True
        r = client.delete(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        assert r.status_code == 200 and r.json() == {"checked": False}
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is False

    def test_e_pessoal(self, client, manager_headers, salesperson_headers, test_card, test_board):
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        assert _marcado(client, salesperson_headers, test_board.id, test_card.id) is False

    def test_mudar_de_lista_no_mesmo_board_continua(self, client, manager_headers, db, test_card, test_lists, test_board):
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        test_card.list_id = test_lists[1].id; db.commit()
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is True

    def test_ir_para_outro_board_desmarca(self, client, manager_headers, db, test_card):
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        outro = Board(name="Aquisição"); db.add(outro); db.commit()
        lst = BoardList(name="Entrada", position=0, board_id=outro.id); db.add(lst); db.commit()
        test_card.list_id = lst.id; db.commit()
        assert _marcado(client, manager_headers, outro.id, test_card.id) is False

    def test_ganho_desmarca_e_marcar_no_ganho_fica(self, client, manager_headers, db, test_card, test_board):
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        test_card.is_won = 1; db.commit()
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is False
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is True

    def test_perdido_e_reabrir_desmarcam(self, client, manager_headers, db, test_card, test_board):
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        test_card.is_won = -1; db.commit()
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is False
        client.put(f"/api/v1/cards/{test_card.id}/check", headers=manager_headers)
        test_card.is_won = 0; db.commit()
        assert _marcado(client, manager_headers, test_board.id, test_card.id) is False

    def test_card_inexistente_404(self, client, manager_headers):
        assert client.put("/api/v1/cards/999999/check", headers=manager_headers).status_code == 404
```

- [ ] **Step 2:** rodar → FAIL (`checked_by_me` ausente / rota 405).

- [ ] **Step 3: Schema** — em `CardMinimalResponse`, após `is_stuck_7d`:

```python
    checked_by_me: bool = Field(False, description="Bolinha 'concluído' marcada pelo usuário logado (pessoal)")
```

- [ ] **Step 4: Listagem** — no ramo `minimal` de `CardService.list_cards`, logo antes de `for card in cards:` (depois de `clients_by_id`):

```python
            # Bolinha "concluído" do usuário logado — vale só se o card segue no
            # mesmo board e na mesma situação de quando foi marcado.
            from app.services.card_check_service import CardCheckService, situacao_card
            checked_ids = (
                CardCheckService(self.db).ids_validos(
                    current_user.id, "card_id",
                    {c.id: (board_id, situacao_card(c)) for c in cards},
                )
                if current_user else set()
            )
```
e no `CardMinimalResponse(...)`: `checked_by_me=card.id in checked_ids,`.

- [ ] **Step 5: Endpoints** — em `cards.py`, depois da rota `PUT /{card_id}/move`:

```python
@router.put("/{card_id}/check", summary="Marcar card como concluído (bolinha pessoal)")
async def marcar_card_concluido(
    card_id: int = Path(..., description="ID do card"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Marca o card como concluído só para o usuário logado (organização pessoal)."""
    from app.repositories.list_repository import ListRepository
    from app.services.card_check_service import CardCheckService, situacao_card

    card = CardService(db).get_card_by_id(card_id, current_user)
    lista = ListRepository(db).find_by_id(card.list_id)
    CardCheckService(db).marcar(
        current_user.id, "card_id", card.id,
        board_id=lista.board_id if lista else 0, situacao=situacao_card(card),
    )
    return {"checked": True}


@router.delete("/{card_id}/check", summary="Desmarcar card como concluído (bolinha pessoal)")
async def desmarcar_card_concluido(
    card_id: int = Path(..., description="ID do card"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    from app.services.card_check_service import CardCheckService

    card = CardService(db).get_card_by_id(card_id, current_user)
    CardCheckService(db).desmarcar(current_user.id, "card_id", card.id)
    return {"checked": False}
```

- [ ] **Step 6:** rodar `test_card_check.py` → PASS.

---

### Task 4: Serviço — endpoints + `checked_by_me` na listagem do board

**Files:**
- Modify: `backend/app/schemas/service_board.py` (`ServiceCardResponse`, após `is_stuck_7d`)
- Modify: `backend/app/services/service_board_service.py` (`list_cards`)
- Modify: `backend/app/api/v1/endpoints/service_boards.py` (passar usuário + 2 rotas)
- Test: `backend/tests/unit/test_card_check.py`

- [ ] **Step 1: Testes (falham)** — anexar:

```python
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList
from app.services.service_board_service import ServiceBoardService


def _sv_marcado(db, board_id, user_id, card_id):
    r = ServiceBoardService(db).list_cards(board_id, user_id=user_id)
    return next(c for c in r.cards if c.id == card_id).checked_by_me


class TestBolinhaServico:
    def _cenario(self, db):
        b = ServiceBoard(name="Serviços"); cob = ServiceBoard(name="Cobrança")
        db.add_all([b, cob]); db.commit()
        entrada = ServiceList(board_id=b.id, name="Entrada", position=0)
        execucao = ServiceList(board_id=b.id, name="Execução", position=1)
        ganho = ServiceList(board_id=b.id, name="Negócio Ganho", position=2)
        perdido = ServiceList(board_id=b.id, name="Negócio Perdido", position=3)
        cob_entrada = ServiceList(board_id=cob.id, name="Entrada", position=0)
        db.add_all([entrada, execucao, ganho, perdido, cob_entrada]); db.commit()
        card = ServiceCard(list_id=entrada.id, title="CX 1083")
        db.add(card); db.commit(); db.refresh(card)
        return SimpleNamespace(b=b, cob=cob, entrada=entrada, execucao=execucao,
                               ganho=ganho, perdido=perdido, cob_entrada=cob_entrada, card=card)

    def test_api_marcar_desmarcar_e_regras(self, client, admin_headers, db, test_admin_user, test_manager_user):
        c = self._cenario(db)
        url = f"/api/v1/service-boards/{c.b.id}/cards/{c.card.id}/check"
        r = client.put(url, headers=admin_headers)
        assert r.status_code == 200 and r.json() == {"checked": True}
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is True
        assert _sv_marcado(db, c.b.id, test_manager_user.id, c.card.id) is False   # pessoal
        c.card.list_id = c.execucao.id; db.commit()                                  # mesma board
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is True
        c.card.list_id = c.ganho.id; db.commit()                                     # ganho
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is False
        assert client.put(url, headers=admin_headers).status_code == 200             # marca no ganho
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is True
        assert client.delete(url, headers=admin_headers).json() == {"checked": False}
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is False

    def test_perdido_e_outro_board_desmarcam(self, client, admin_headers, db, test_admin_user):
        c = self._cenario(db)
        client.put(f"/api/v1/service-boards/{c.b.id}/cards/{c.card.id}/check", headers=admin_headers)
        c.card.list_id = c.perdido.id; db.commit()
        assert _sv_marcado(db, c.b.id, test_admin_user.id, c.card.id) is False
        c.card.list_id = c.entrada.id; db.commit()
        client.put(f"/api/v1/service-boards/{c.b.id}/cards/{c.card.id}/check", headers=admin_headers)
        c.card.list_id = c.cob_entrada.id; db.commit()
        assert _sv_marcado(db, c.cob.id, test_admin_user.id, c.card.id) is False

    def test_card_de_outro_board_404(self, client, admin_headers, db):
        c = self._cenario(db)
        r = client.put(f"/api/v1/service-boards/{c.cob.id}/cards/{c.card.id}/check", headers=admin_headers)
        assert r.status_code == 404
```

- [ ] **Step 2:** rodar → FAIL (`list_cards() got an unexpected keyword argument 'user_id'`).

- [ ] **Step 3: Schema** — em `ServiceCardResponse`, após `is_stuck_7d`:

```python
    checked_by_me: bool = False  # bolinha "concluído" do usuário logado (pessoal)
```

- [ ] **Step 4: `list_cards`** — assinatura `def list_cards(self, board_id: int, page: int = 1, page_size: int = 200, user_id: Optional[int] = None)`. Trocar o cálculo de `closed_list_ids` para reaproveitar as listas:

```python
        listas = self.repo.list_lists_by_board(board_id)
        closed_list_ids = {
            l.id for l in listas
            if l.is_done_stage or l.is_lost_stage
            or "ganho" in (l.name or "").lower() or "perdido" in (l.name or "").lower()
        }

        # Bolinha "concluído" do usuário logado — vale só no mesmo board e situação.
        from app.services.card_check_service import CardCheckService, situacao_lista_servico
        listas_por_id = {l.id: l for l in listas}
        checked_ids = (
            CardCheckService(self.db).ids_validos(
                user_id, "service_card_id",
                {c.id: (board_id, situacao_lista_servico(listas_por_id.get(c.list_id))) for c in cards},
            )
            if user_id else set()
        )
```
e no `ServiceCardResponse(...)`: `checked_by_me=c.id in checked_ids,`.

- [ ] **Step 5: Endpoints** — em `list_service_cards`: `return svc.list_cards(board_id, page=page, page_size=page_size, user_id=current_user.id)`. Depois da rota `move` do card:

```python
@router.put("/{board_id}/cards/{card_id}/check")
async def marcar_service_card_concluido(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Marca o card como concluído só para o usuário logado (organização pessoal)."""
    from app.services.card_check_service import CardCheckService, situacao_lista_servico

    card = ServiceBoardService(db).get_card_in_board(board_id, card_id)
    CardCheckService(db).marcar(
        current_user.id, "service_card_id", card.id,
        board_id=board_id, situacao=situacao_lista_servico(card.list),
    )
    return {"checked": True}


@router.delete("/{board_id}/cards/{card_id}/check")
async def desmarcar_service_card_concluido(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    from app.services.card_check_service import CardCheckService

    card = ServiceBoardService(db).get_card_in_board(board_id, card_id)
    CardCheckService(db).desmarcar(current_user.id, "service_card_id", card.id)
    return {"checked": False}
```

- [ ] **Step 6:** rodar `test_card_check.py` → PASS; rodar a suíte inteira → tudo verde.

---

### Task 5: Front — tipos, chamadas e `CardCheckButton`

**Files:**
- Modify: `frontend/src/types/index.ts` (`Card`), `frontend/src/services/serviceBoardService.ts` (`ServiceCard` + método), `frontend/src/services/cardService.ts` (método)
- Create: `frontend/src/components/kanban/CardCheckButton.tsx`

- [ ] **Step 1: Tipos** — em `Card` (após `is_stuck_7d?`) e em `ServiceCard` (após `is_stuck_7d?`):

```ts
  checked_by_me?: boolean; // bolinha "concluído" do usuário logado (pessoal)
```

- [ ] **Step 2: Chamadas**

`cardService.ts` (dentro da classe, após `move`):
```ts
  /** Marca/desmarca a bolinha "concluído" pessoal do card. */
  async setChecked(cardId: number, checked: boolean): Promise<void> {
    if (checked) await api.put(`/api/v1/cards/${cardId}/check`);
    else await api.delete(`/api/v1/cards/${cardId}/check`);
  }
```
`serviceBoardService.ts` (após `moveCard`):
```ts
  /** Marca/desmarca a bolinha "concluído" pessoal do card. */
  async setCardChecked(boardId: number, cardId: number, checked: boolean): Promise<void> {
    if (checked) await api.put(`${BASE}/${boardId}/cards/${cardId}/check`);
    else await api.delete(`${BASE}/${boardId}/cards/${cardId}/check`);
  }
```

- [ ] **Step 3: Componente**

```tsx
import React from "react";
import { Check } from "lucide-react";

interface CardCheckButtonProps {
  checked: boolean;
  onToggle: () => void;
}

/**
 * Bolinha "concluído" pessoal (estilo Trello), à esquerda do título do card.
 * Marcada: verde, sempre visível. Vazia: no desktop só aparece ao passar o mouse
 * no card (o card precisa da classe `group`); no celular fica sempre visível.
 */
const CardCheckButton: React.FC<CardCheckButtonProps> = ({ checked, onToggle }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    onAuxClick={(e) => e.stopPropagation()}
    title={checked ? "Concluído por você — clique para desmarcar" : "Marcar como concluído (só para você)"}
    aria-label={checked ? "Desmarcar concluído" : "Marcar como concluído"}
    aria-pressed={checked}
    className={`mt-0.5 flex h-4 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border transition-all ${
      checked
        ? "mr-1.5 w-4 border-green-500 bg-green-500 text-white"
        : "mr-1.5 w-4 border-slate-400 text-transparent hover:border-green-500 hover:text-green-500 dark:border-slate-500 sm:mr-0 sm:w-0 sm:border-0 sm:group-hover:mr-1.5 sm:group-hover:w-4 sm:group-hover:border"
    }`}
  >
    <Check size={11} strokeWidth={3} />
  </button>
);

export default CardCheckButton;
```

- [ ] **Step 4:** `npx tsc --noEmit` → 0.

---

### Task 6: Front — board de Vendas

**Files:**
- Modify: `frontend/src/components/kanban/KanbanCard.tsx`
- Modify: `frontend/src/components/kanban/KanbanList.tsx`
- Modify: `frontend/src/pages/KanbanBoard.tsx`

- [ ] **Step 1: KanbanCard** — prop nova `onToggleCheck?: () => void;` (interface + desestruturação). Trocar o `<h4>` do título por:

```tsx
      {/* Título com a bolinha "concluído" pessoal */}
      <div className="mb-2 flex items-start pr-14">
        {onToggleCheck && (
          <CardCheckButton checked={!!card.checked_by_me} onToggle={onToggleCheck} />
        )}
        <h4 className="line-clamp-2 text-[15px] leading-snug text-slate-900 dark:text-white">
          {card.title}
        </h4>
      </div>
```
com `import CardCheckButton from "./CardCheckButton";`.

- [ ] **Step 2: KanbanList** — prop `onToggleCheck?: (card: Card) => void;` (interface + desestruturação) e no `<KanbanCard>`: `onToggleCheck={onToggleCheck ? () => onToggleCheck(card) : undefined}`.

- [ ] **Step 3: KanbanBoard — alternar com atualização otimista** (perto dos outros handlers de card):

```ts
  /** Bolinha "concluído" pessoal: atualiza na hora e desfaz se a API falhar. */
  const checkInFlight = useRef<Set<number>>(new Set());
  const handleToggleCheck = async (card: Card) => {
    if (checkInFlight.current.has(card.id)) return;
    checkInFlight.current.add(card.id);
    const novo = !card.checked_by_me;
    const aplicar = (v: boolean) =>
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, checked_by_me: v } : c)));
    aplicar(novo);
    try {
      await cardService.setChecked(card.id, novo);
    } catch {
      aplicar(!novo);
      showError("Não foi possível atualizar a marcação do card.");
    } finally {
      checkInFlight.current.delete(card.id);
    }
  };
```
e no `<KanbanList ...>`: `onToggleCheck={handleToggleCheck}`.

- [ ] **Step 4: Filtro "Concluídos por mim"**
  - estado: `const [checkFilter, setCheckFilter] = useState(""); // "" | "esconder" | "so" — bolinha "concluído" pessoal`
  - restore: `setCheckFilter(saved.checkFilter ?? "");`
  - save: `checkFilter,` no objeto e no array de deps
  - `clearFilters`: `setCheckFilter("");`
  - `hasActiveFilters`: `|| checkFilter !== ""`
  - `filterCards` (antes do `return true;` final):
    ```ts
      // Bolinha "concluído" pessoal
      if (checkFilter === "esconder" && card.checked_by_me) return false;
      if (checkFilter === "so" && !card.checked_by_me) return false;
    ```
  - UI, logo após o bloco "Filtro por etiqueta":
    ```tsx
            {/* Filtro pela bolinha "concluído" pessoal */}
            <div className="min-w-[165px]">
              <SelectMenu
                size="sm"
                value={checkFilter}
                options={[
                  { value: "", label: "Concluídos: mostrar" },
                  { value: "esconder", label: "Esconder concluídos por mim" },
                  { value: "so", label: "Só concluídos por mim" },
                ]}
                onChange={setCheckFilter}
              />
            </div>
    ```

- [ ] **Step 5:** `npx tsc --noEmit` → 0.

---

### Task 7: Front — board de Serviço/Cobrança

**Files:**
- Modify: `frontend/src/pages/ServiceKanban.tsx`

- [ ] **Step 1: KanbanServiceCard** — `KanbanCardProps` ganha `onToggleCheck?: () => void;`; o `div` raiz ganha a classe `group`; o `<h4>` vira:

```tsx
      <div className="mb-2 flex items-start pr-9">
        {onToggleCheck && (
          <CardCheckButton checked={!!card.checked_by_me} onToggle={onToggleCheck} />
        )}
        <h4 className="line-clamp-2 text-sm font-medium leading-snug text-slate-900 dark:text-white">{card.title}</h4>
      </div>
```
com `import CardCheckButton from "../components/kanban/CardCheckButton";`.

- [ ] **Step 2: KanbanColumn** — `KanbanColumnProps` ganha `onToggleCheck?: (card: ServiceCard) => void;` (+ desestruturação) e o `<KanbanServiceCard>` recebe `onToggleCheck={onToggleCheck ? () => onToggleCheck(card) : undefined}`.

- [ ] **Step 3: ServiceKanban — handler otimista** (mesmo padrão da Task 6, com `serviceBoardService.setCardChecked(numId, card.id, novo)`; `useRef` já importado) e `onToggleCheck={handleToggleCheck}` no `<KanbanColumn>`.

- [ ] **Step 4: Filtro**
  - estado: `const [fCheck, setFCheck] = useState(""); // "" | "esconder" | "so" — bolinha "concluído" pessoal`
  - `clearFilters`: `setFCheck("");` · `filtersActive`: `|| !!fCheck`
  - restore: `setFCheck(s.fCheck ?? "");` · save: `fCheck` no objeto `s` e nas deps
  - em `filteredCards`, logo após o bloco `// Etiqueta`:
    ```ts
    // Bolinha "concluído" pessoal
    if (fCheck === "esconder" && c.checked_by_me) return false;
    if (fCheck === "so" && !c.checked_by_me) return false;
    ```
  - UI, após o `SelectMenu` de etiqueta:
    ```tsx
            <div className="min-w-[165px]">
              <SelectMenu size="sm" value={fCheck} onChange={setFCheck} options={[
                { value: "", label: "Concluídos: mostrar" },
                { value: "esconder", label: "Esconder concluídos por mim" },
                { value: "so", label: "Só concluídos por mim" },
              ]} />
            </div>
    ```

- [ ] **Step 5:** `npx tsc --noEmit` → 0.

---

### Task 8: Changelog v1.10.13 + verificação final

- [ ] **Step 1:** `CHANGELOG.md` nova seção `## [1.10.13] — 01/10/2026` (Adicionado: bolinha pessoal + regra de desmarcar + filtro; nota de deploy: **1 migration** `d8e9f0a1b2c3`). `ChangelogModal.tsx`: entrada `feature`. `MainLayout.tsx`: rodapé `v1.10.13`.
- [ ] **Step 2:** suíte completa do backend verde; `npx tsc --noEmit` = 0; `alembic heads` no container = `d8e9f0a1b2c3`.
- [ ] **Step 3:** teste no navegador local (board de Vendas e de Serviço): marcar, recarregar (F5) e continuar marcado, filtro esconder/só, desmarcar.
- [ ] **Step 4:** perguntar ao usuário "posso commitar?".
