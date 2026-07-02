# Propostas Comerciais — Fase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o módulo de Propostas Comerciais (exclusivo de Serviço): entidade + API, página na sidebar, seção no card de Serviço com criação pré-preenchida, vínculo card↔proposta com Marcador derivado, e troca da regra de avanço (proposta vinculada em vez de anexo no Resumo). PDF é Fase 2.

**Architecture:** Backend FastAPI/SQLAlchemy com novas tabelas `proposals` e `proposal_items` (migration Alembic), seguindo o padrão model→schema→repository→service→endpoint do `Product`, protegido por `require_service_access` (admin/gerente/serviço). Frontend React/TS com página nova nos padrões `useCRUD/useFilter/usePagination` + `SearchInput/Pagination/SelectMenu`, formulário com `react-quill`, e seção no card de Serviço. Marcador é derivado do estado do card vinculado (não persistido).

**Tech Stack:** Python 3 / FastAPI / SQLAlchemy / Alembic / pytest (SQLite em memória). React 19 / TypeScript / Vite / TailwindCSS / react-quill. Docker local (`hsgrowth-api-local`) conectado ao DB de produção (rodar migration com cuidado — ver Task A2).

**Spec:** `docs/superpowers/specs/2026-07-02-propostas-comerciais-design.md`

**Convenções deste plano:**
- **Backend = TDD com pytest** (infra existente: `backend/tests/`, SQLite em memória isolado; fixtures em `conftest.py`: `db`, `client`, `test_admin_user`, `admin_headers`, etc.).
- **Frontend = sem suíte de testes** (não existe vitest/jest). Verificação: `npx tsc --noEmit` (typecheck) + smoke manual no app. **Não** adicionar framework de teste (fora de escopo).
- **Sem bump de versão / sem changelog** (mudança de Serviço, acumula p/ go-live v1.8.0).
- Commits pequenos e frequentes. Excluir `.claude/settings.local.json` dos commits.
- Comandos docker usam prefixo de PATH: `$env:PATH = "C:\Program Files\Docker\Docker\resources\bin;$env:PATH"` (PowerShell) e container `hsgrowth-api-local`.

---

## File Structure

**Backend (criar):**
- `backend/app/models/proposal.py` — models `Proposal`, `ProposalItem`.
- `backend/app/schemas/proposal.py` — schemas Pydantic.
- `backend/app/repositories/proposal_repository.py` — acesso a dados.
- `backend/app/services/proposal_service.py` — regras (numeração, totais, marcador, prefill).
- `backend/app/api/v1/endpoints/proposals.py` — endpoints REST.
- `backend/alembic/versions/2026_07_02_XXXX-create_proposals.py` — migration.
- `backend/tests/unit/test_proposals.py` — testes.

**Backend (modificar):**
- `backend/app/models/__init__.py` — registrar models (se houver import agregador).
- `backend/app/api/v1/__init__.py` — registrar router `proposals` (prefix `/proposals`).
- `backend/app/services/service_board_service.py` — trocar regra `has_slot("proposta")` por proposta vinculada.
- `Documentação/16 - FLUXO E REGRAS DO BOARD DE SERVIÇOS.md` — atualizar regras.

**Frontend (criar):**
- `frontend/src/services/proposalService.ts` — client de API + tipos.
- `frontend/src/pages/Proposals.tsx` — página de listagem.
- `frontend/src/components/proposals/ProposalModal.tsx` — formulário criar/editar.
- `frontend/src/components/common/RichTextEditor.tsx` — wrapper do react-quill.
- `frontend/src/components/service/ServiceProposalsSection.tsx` — seção no card.

**Frontend (modificar):**
- `frontend/package.json` — dependência `react-quill`.
- `frontend/src/layouts/MainLayout.tsx` — item de menu.
- `frontend/src/router.tsx` — rotas `/propostas`.
- `frontend/src/pages/ServiceCardDetails.tsx` — inserir `ServiceProposalsSection` abaixo de Produtos; remover slot 'proposta' do `ServiceSummarySection`.

---

## WORKSTREAM A — Backend (entidade + API)

### Task A1: Models `Proposal` e `ProposalItem`

**Files:**
- Create: `backend/app/models/proposal.py`
- Modify: `backend/app/models/__init__.py` (se existir agregador de imports)

- [ ] **Step 1: Criar o arquivo de models**

Create `backend/app/models/proposal.py`:

```python
"""
Modelos de Proposta Comercial (Propostas) — exclusivo do módulo de Serviço.
"""
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class Proposal(Base, TimestampMixin, SoftDeleteMixin):
    """Proposta comercial de serviço, opcionalmente vinculada a um card de Serviço."""
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, nullable=False, unique=True, index=True)  # sequência própria

    # Vínculos
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="SET NULL"), nullable=True)
    service_card_id = Column(Integer, ForeignKey("service_cards.id", ondelete="SET NULL"), nullable=True, index=True)

    # Cabeçalho
    seller_name = Column(String(255), nullable=True)
    date = Column(Date, nullable=True)
    next_contact_date = Column(Date, nullable=True)
    intro = Column(Text, nullable=True)
    other_items = Column(Text, nullable=True)  # HTML do react-quill

    # Financeiro
    discount = Column(Numeric(12, 2), nullable=False, default=0)
    shipping = Column(Numeric(12, 2), nullable=False, default=0)  # frete

    # Transporte
    shipping_method = Column(String(100), nullable=True)  # forma de envio
    freight_type = Column(String(100), nullable=True)      # forma de frete
    carrier_name = Column(String(255), nullable=True)      # transportador

    # Condições
    payment_terms = Column(String(255), nullable=True)     # condição de pagamento/parcelas
    validity_days = Column(Integer, nullable=True)         # validade (dias)
    delivery_date = Column(Date, nullable=True)            # data prevista de entrega
    delivery_desc = Column(String(500), nullable=True)     # descrição do prazo
    notes = Column(Text, nullable=True)                    # observações
    signature = Column(String(255), nullable=True)         # assinatura

    internal_status = Column(String(30), nullable=False, default="rascunho")  # rascunho/enviada

    client = relationship("Client")
    person = relationship("Person")
    service_card = relationship("ServiceCard")
    items = relationship("ProposalItem", back_populates="proposal", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self):
        return f"<Proposal(id={self.id}, number={self.number}, card={self.service_card_id})>"


class ProposalItem(Base, TimestampMixin):
    """Item (produto/serviço) de uma proposta."""
    __tablename__ = "proposal_items"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    description = Column(String(500), nullable=False)  # Item
    sku = Column(String(100), nullable=True)           # Código (SKU)
    quantity = Column(Numeric(12, 4), nullable=False, default=1)
    unit = Column(String(20), nullable=True)           # UN (ex: Unid)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)  # quantity * unit_price

    proposal = relationship("Proposal", back_populates="items")

    def __repr__(self):
        return f"<ProposalItem(id={self.id}, proposal={self.proposal_id}, desc='{self.description}')>"
```

- [ ] **Step 2: Registrar no agregador de models (se existir)**

Verifique `backend/app/models/__init__.py`. Se ele importa os models explicitamente (para o Alembic/metadata enxergar), adicione:

```python
from app.models.proposal import Proposal, ProposalItem  # noqa
```

Se `__init__.py` não fizer imports explícitos, confirme que `backend/app/db/base.py` (ou onde `Base.metadata` é montado para o Alembic `env.py`) importa os models. Siga o mesmo mecanismo usado por `service_card_product.py`.

- [ ] **Step 3: Verificar import (smoke)**

Run: `docker exec -w /app hsgrowth-api-local python -c "from app.models.proposal import Proposal, ProposalItem; print('ok')"`
Expected: imprime `ok` sem erro.

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/proposal.py backend/app/models/__init__.py
git commit -m "feat(propostas): models Proposal e ProposalItem"
```

---

### Task A2: Migration Alembic (criar tabelas)

**Files:**
- Create: `backend/alembic/versions/2026_07_02_XXXX-create_proposals.py`

> ⚠️ O Docker local aponta para o **DB de produção**. Gere a migration com autogenerate, **revise o arquivo gerado** e só aplique quando validado. As tabelas são novas (não altera dados existentes), então é seguro, mas confira que o autogenerate não incluiu mudanças não relacionadas.

- [ ] **Step 1: Gerar a migration**

Run: `docker exec -w /app hsgrowth-api-local alembic revision --autogenerate -m "create proposals"`
Expected: cria arquivo em `backend/alembic/versions/` com `create_table('proposals')` e `create_table('proposal_items')`.

- [ ] **Step 2: Revisar o arquivo gerado**

Abra o arquivo. Confirme que:
- `upgrade()` cria `proposals` e `proposal_items` com as colunas/FKs do Task A1.
- **Não** há `op.drop_*` ou alterações em tabelas existentes (se houver, remova — são ruído do autogenerate).
- `down_revision` aponta para a última migration atual.

- [ ] **Step 3: Aplicar a migration**

Run: `docker exec -w /app hsgrowth-api-local alembic upgrade head`
Expected: `Running upgrade ... -> <rev>, create proposals` sem erro.

- [ ] **Step 4: Verificar tabelas**

Run: `docker exec -w /app hsgrowth-api-local python -c "from app.db.session import SessionLocal; from sqlalchemy import inspect; i=inspect(SessionLocal().bind); print('proposals' in i.get_table_names(), 'proposal_items' in i.get_table_names())"`
Expected: `True True`

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat(propostas): migration cria tabelas proposals e proposal_items"
```

---

### Task A3: Schemas Pydantic

**Files:**
- Create: `backend/app/schemas/proposal.py`

- [ ] **Step 1: Criar schemas**

Create `backend/app/schemas/proposal.py`:

```python
"""Schemas de Proposta Comercial."""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ---- Itens ----
class ProposalItemBase(BaseModel):
    product_id: Optional[int] = None
    description: str
    sku: Optional[str] = None
    quantity: float = 1
    unit: Optional[str] = None
    unit_price: float = 0


class ProposalItemCreate(ProposalItemBase):
    pass


class ProposalItemResponse(ProposalItemBase):
    id: int
    total: float

    class Config:
        from_attributes = True


# ---- Proposta ----
class ProposalBase(BaseModel):
    client_id: Optional[int] = None
    person_id: Optional[int] = None
    service_card_id: Optional[int] = None
    seller_name: Optional[str] = None
    date: Optional[date] = None
    next_contact_date: Optional[date] = None
    intro: Optional[str] = None
    other_items: Optional[str] = None
    discount: float = 0
    shipping: float = 0
    shipping_method: Optional[str] = None
    freight_type: Optional[str] = None
    carrier_name: Optional[str] = None
    payment_terms: Optional[str] = None
    validity_days: Optional[int] = None
    delivery_date: Optional[date] = None
    delivery_desc: Optional[str] = None
    notes: Optional[str] = None
    signature: Optional[str] = None
    internal_status: str = "rascunho"


class ProposalCreate(ProposalBase):
    items: List[ProposalItemCreate] = Field(default_factory=list)


class ProposalUpdate(BaseModel):
    # todos opcionais; se `items` vier, substitui a lista inteira
    client_id: Optional[int] = None
    person_id: Optional[int] = None
    service_card_id: Optional[int] = None
    seller_name: Optional[str] = None
    date: Optional[date] = None
    next_contact_date: Optional[date] = None
    intro: Optional[str] = None
    other_items: Optional[str] = None
    discount: Optional[float] = None
    shipping: Optional[float] = None
    shipping_method: Optional[str] = None
    freight_type: Optional[str] = None
    carrier_name: Optional[str] = None
    payment_terms: Optional[str] = None
    validity_days: Optional[int] = None
    delivery_date: Optional[date] = None
    delivery_desc: Optional[str] = None
    notes: Optional[str] = None
    signature: Optional[str] = None
    internal_status: Optional[str] = None
    items: Optional[List[ProposalItemCreate]] = None


class ProposalResponse(ProposalBase):
    id: int
    number: int
    items: List[ProposalItemResponse] = Field(default_factory=list)
    # Derivados / de conveniência
    total_items: float = 0        # soma dos totais dos itens
    total: float = 0              # total_items + shipping - discount
    marker: str = "em_aberto"     # aprovada | nao_aprovada | em_aberto
    client_name: Optional[str] = None
    client_document: Optional[str] = None  # CNPJ/CPF
    board_id: Optional[int] = None         # board do card vinculado (para link no front)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProposalListResponse(BaseModel):
    items: List[ProposalResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
```

- [ ] **Step 2: Smoke import**

Run: `docker exec -w /app hsgrowth-api-local python -c "from app.schemas.proposal import ProposalCreate, ProposalResponse; print('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/proposal.py
git commit -m "feat(propostas): schemas Pydantic"
```

---

### Task A4: Repository

**Files:**
- Create: `backend/app/repositories/proposal_repository.py`
- Test: `backend/tests/unit/test_proposals.py`

- [ ] **Step 1: Escrever teste do repositório (falha)**

Create `backend/tests/unit/test_proposals.py`:

```python
"""Testes do módulo de Propostas."""
import pytest
from app.repositories.proposal_repository import ProposalRepository
from app.schemas.proposal import ProposalCreate, ProposalItemCreate


def test_next_number_starts_at_1_and_increments(db):
    repo = ProposalRepository(db)
    assert repo.next_number() == 1
    p = repo.create(ProposalCreate(items=[]))
    assert p.number == 1
    assert repo.next_number() == 2


def test_create_with_items_computes_item_total(db):
    repo = ProposalRepository(db)
    p = repo.create(ProposalCreate(items=[
        ProposalItemCreate(description="Calibração", quantity=2, unit_price=100),
    ]))
    assert len(p.items) == 1
    assert float(p.items[0].total) == 200.0
```

- [ ] **Step 2: Rodar e verificar falha**

Run: `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -v`
Expected: FAIL (ModuleNotFoundError: proposal_repository).

- [ ] **Step 3: Implementar o repositório**

Create `backend/app/repositories/proposal_repository.py`:

```python
"""Repositório de Propostas."""
from typing import Optional, List, Tuple
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.proposal import Proposal, ProposalItem
from app.models.client import Client
from app.schemas.proposal import ProposalCreate, ProposalUpdate


class ProposalRepository:
    def __init__(self, db: Session):
        self.db = db

    def next_number(self) -> int:
        current_max = self.db.query(func.max(Proposal.number)).scalar()
        return (current_max or 0) + 1

    def _apply_items(self, proposal: Proposal, items: List) -> None:
        proposal.items.clear()
        for it in items:
            total = float(it.quantity) * float(it.unit_price)
            proposal.items.append(ProposalItem(
                product_id=it.product_id, description=it.description, sku=it.sku,
                quantity=it.quantity, unit=it.unit, unit_price=it.unit_price, total=total,
            ))

    def create(self, data: ProposalCreate) -> Proposal:
        payload = data.model_dump(exclude={"items"})
        proposal = Proposal(number=self.next_number(), **payload)
        self._apply_items(proposal, data.items or [])
        self.db.add(proposal)
        self.db.commit()
        self.db.refresh(proposal)
        return proposal

    def get_by_id(self, proposal_id: int) -> Optional[Proposal]:
        return (
            self.db.query(Proposal)
            .options(joinedload(Proposal.client), joinedload(Proposal.service_card))
            .filter(Proposal.id == proposal_id, Proposal.is_deleted == False)  # noqa: E712
            .first()
        )

    def update(self, proposal: Proposal, data: ProposalUpdate) -> Proposal:
        payload = data.model_dump(exclude_unset=True, exclude={"items"})
        for k, v in payload.items():
            setattr(proposal, k, v)
        if data.items is not None:
            self._apply_items(proposal, data.items)
        self.db.commit()
        self.db.refresh(proposal)
        return proposal

    def soft_delete(self, proposal: Proposal) -> None:
        proposal.is_deleted = True
        self.db.commit()

    def list(self, page: int, page_size: int, search: Optional[str] = None
             ) -> Tuple[List[Proposal], int]:
        q = (
            self.db.query(Proposal)
            .options(joinedload(Proposal.client), joinedload(Proposal.service_card))
            .filter(Proposal.is_deleted == False)  # noqa: E712
        )
        if search:
            like = f"%{search}%"
            conditions = [Client.name.ilike(like), Client.company_name.ilike(like)]
            if search.isdigit():
                conditions.append(Proposal.number == int(search))
            q = q.outerjoin(Client, Proposal.client_id == Client.id).filter(or_(*conditions))
        total = q.count()
        rows = q.order_by(Proposal.number.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return rows, total

    def list_by_card(self, service_card_id: int) -> List[Proposal]:
        return (
            self.db.query(Proposal)
            .filter(Proposal.service_card_id == service_card_id, Proposal.is_deleted == False)  # noqa: E712
            .order_by(Proposal.number.desc())
            .all()
        )

    def count_by_card(self, service_card_id: int) -> int:
        return (
            self.db.query(func.count(Proposal.id))
            .filter(Proposal.service_card_id == service_card_id, Proposal.is_deleted == False)  # noqa: E712
            .scalar()
        )
```

> Nota: a busca por número usa igualdade quando `search` é dígito; busca textual filtra por nome/razão social do cliente. Mantenha simples.

- [ ] **Step 4: Rodar e verificar sucesso**

Run: `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/repositories/proposal_repository.py backend/tests/unit/test_proposals.py
git commit -m "feat(propostas): repository + testes"
```

---

### Task A5: Service (numeração, totais, Marcador, prefill do card)

**Files:**
- Create: `backend/app/services/proposal_service.py`
- Test: `backend/tests/unit/test_proposals.py` (append)

- [ ] **Step 1: Escrever testes do service (falha)**

Append em `backend/tests/unit/test_proposals.py`:

```python
from app.services.proposal_service import ProposalService
from app.schemas.proposal import ProposalCreate, ProposalItemCreate


def test_service_computes_totals_and_marker_em_aberto(db):
    svc = ProposalService(db)
    resp = svc.create(ProposalCreate(
        shipping=200, discount=0,
        items=[ProposalItemCreate(description="Calibração", quantity=1, unit_price=395)],
    ))
    assert resp.total_items == 395.0
    assert resp.total == 595.0            # 395 + 200 - 0
    assert resp.marker == "em_aberto"     # sem card vinculado


def test_service_marker_reflects_won_card(db, test_lists, test_salesperson_user):
    # cria um card de serviço numa lista "done" para simular Ganho
    from app.models.service_board import ServiceBoard
    from app.models.service_list import ServiceList
    from app.models.service_card import ServiceCard
    board = ServiceBoard(name="Serv", description="x"); db.add(board); db.commit()
    lst = ServiceList(name="Ganho", position=5, board_id=board.id, is_done_stage=True)
    db.add(lst); db.commit()
    card = ServiceCard(title="C", list_id=lst.id); db.add(card); db.commit()

    svc = ProposalService(db)
    resp = svc.create(ProposalCreate(service_card_id=card.id, items=[]))
    assert resp.marker == "aprovada"
```

- [ ] **Step 2: Rodar e verificar falha**

Run: `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -v`
Expected: FAIL (ModuleNotFoundError: proposal_service).

- [ ] **Step 3: Implementar o service**

Create `backend/app/services/proposal_service.py`:

```python
"""Service de Propostas: totais, Marcador derivado e prefill a partir do card."""
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.proposal_repository import ProposalRepository
from app.models.proposal import Proposal
from app.models.service_card import ServiceCard
from app.models.service_list import ServiceList
from app.models.service_card_product import ServiceCardProduct
from app.models.product import Product
from app.schemas.proposal import (
    ProposalCreate, ProposalUpdate, ProposalResponse, ProposalListResponse,
    ProposalItemResponse, ProposalItemCreate,
)


class ProposalService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProposalRepository(db)

    # ---- Marcador derivado do card vinculado ----
    def _marker(self, proposal: Proposal) -> str:
        if not proposal.service_card_id:
            return "em_aberto"
        card = self.db.query(ServiceCard).filter(ServiceCard.id == proposal.service_card_id).first()
        if not card:
            return "em_aberto"
        lst = self.db.query(ServiceList).filter(ServiceList.id == card.list_id).first()
        if lst and lst.is_done_stage:
            return "aprovada"
        if lst and lst.is_lost_stage:
            return "nao_aprovada"
        return "em_aberto"

    def _board_id(self, proposal: Proposal) -> Optional[int]:
        if not proposal.service_card_id:
            return None
        card = self.db.query(ServiceCard).filter(ServiceCard.id == proposal.service_card_id).first()
        if not card:
            return None
        lst = self.db.query(ServiceList).filter(ServiceList.id == card.list_id).first()
        return lst.board_id if lst else None

    def _to_response(self, proposal: Proposal) -> ProposalResponse:
        total_items = sum(float(i.total) for i in proposal.items)
        total = total_items + float(proposal.shipping or 0) - float(proposal.discount or 0)
        resp = ProposalResponse.model_validate(proposal)
        resp.total_items = round(total_items, 2)
        resp.total = round(total, 2)
        resp.marker = self._marker(proposal)
        resp.board_id = self._board_id(proposal)
        resp.client_name = proposal.client.display_name if proposal.client else None
        resp.client_document = proposal.client.document if proposal.client else None
        resp.items = [ProposalItemResponse.model_validate(i) for i in proposal.items]
        return resp

    def create(self, data: ProposalCreate, user=None) -> ProposalResponse:
        proposal = self.repo.create(data)
        return self._to_response(proposal)

    def get(self, proposal_id: int) -> ProposalResponse:
        proposal = self.repo.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposta não encontrada")
        return self._to_response(proposal)

    def update(self, proposal_id: int, data: ProposalUpdate, user=None) -> ProposalResponse:
        proposal = self.repo.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposta não encontrada")
        proposal = self.repo.update(proposal, data)
        return self._to_response(proposal)

    def delete(self, proposal_id: int, user=None) -> dict:
        proposal = self.repo.get_by_id(proposal_id)
        if not proposal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposta não encontrada")
        self.repo.soft_delete(proposal)
        return {"message": "Proposta removida com sucesso"}

    def list(self, page: int = 1, page_size: int = 50, search: Optional[str] = None) -> ProposalListResponse:
        rows, total = self.repo.list(page, page_size, search)
        total_pages = max(1, (total + page_size - 1) // page_size)
        return ProposalListResponse(
            items=[self._to_response(p) for p in rows],
            total=total, page=page, page_size=page_size, total_pages=total_pages,
        )

    def list_by_card(self, service_card_id: int) -> list[ProposalResponse]:
        return [self._to_response(p) for p in self.repo.list_by_card(service_card_id)]

    # ---- Prefill a partir do card de Serviço ----
    def prefill_from_card(self, service_card_id: int) -> ProposalCreate:
        card = self.db.query(ServiceCard).filter(ServiceCard.id == service_card_id).first()
        if not card:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card não encontrado")
        rows = (
            self.db.query(ServiceCardProduct, Product)
            .join(Product, ServiceCardProduct.product_id == Product.id)
            .filter(ServiceCardProduct.service_card_id == service_card_id)
            .all()
        )
        items = [
            ProposalItemCreate(
                product_id=p.id, description=p.name or "", sku=p.sku,
                quantity=float(scp.quantity or 1), unit="Unid",
                unit_price=float(scp.unit_price or 0),
            )
            for scp, p in rows
        ]
        return ProposalCreate(
            service_card_id=card.id,
            client_id=card.client_id,
            person_id=card.person_id,
            items=items,
        )
```

> Confirme na Task A5 que `Client` tem a property `display_name` (existe em `client.py`) e o campo `document`. Se `display_name` não existir no seu ambiente, use `proposal.client.name`.

- [ ] **Step 4: Rodar e verificar sucesso**

Run: `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -v`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/proposal_service.py backend/tests/unit/test_proposals.py
git commit -m "feat(propostas): service (totais, Marcador, prefill do card) + testes"
```

---

### Task A6: Endpoints + registrar router

**Files:**
- Create: `backend/app/api/v1/endpoints/proposals.py`
- Modify: `backend/app/api/v1/__init__.py`
- Test: `backend/tests/unit/test_proposals.py` (append endpoint tests)

- [ ] **Step 1: Escrever teste de endpoint (falha)**

Append em `backend/tests/unit/test_proposals.py`:

```python
def test_endpoint_create_and_list_requires_service_access(client, admin_headers):
    # admin tem acesso ao módulo de Serviço
    payload = {"items": [{"description": "Calibração", "quantity": 1, "unit_price": 395}], "shipping": 200}
    r = client.post("/api/v1/proposals", json=payload, headers=admin_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["number"] == 1
    assert body["total"] == 595.0

    r2 = client.get("/api/v1/proposals", headers=admin_headers)
    assert r2.status_code == 200
    assert r2.json()["total"] == 1


def test_endpoint_blocks_salesperson(client, salesperson_headers):
    r = client.get("/api/v1/proposals", headers=salesperson_headers)
    assert r.status_code == 403
```

> Nota: o fixture `salesperson_headers` existe no conftest. `require_service_access` deve bloquear salesperson (403). Se a implementação de `require_service_access` permitir salesperson, ajuste o teste conforme a regra real — mas o esperado por spec é bloquear.

- [ ] **Step 2: Rodar e verificar falha**

Run: `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -k endpoint -v`
Expected: FAIL (404 nas rotas — router não registrado).

- [ ] **Step 3: Criar endpoints**

Create `backend/app/api/v1/endpoints/proposals.py`:

```python
"""Endpoints de Propostas Comerciais (módulo de Serviço)."""
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import require_service_access
from app.models.user import User
from app.services.proposal_service import ProposalService
from app.schemas.proposal import (
    ProposalCreate, ProposalUpdate, ProposalResponse, ProposalListResponse,
)

router = APIRouter()


@router.get("", response_model=ProposalListResponse, summary="Listar propostas")
def list_proposals(
    page: int = 1, page_size: int = 50, search: Optional[str] = None,
    db: Session = Depends(get_db), user: User = Depends(require_service_access()),
):
    return ProposalService(db).list(page=page, page_size=page_size, search=search)


@router.post("", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED, summary="Criar proposta")
def create_proposal(
    data: ProposalCreate,
    db: Session = Depends(get_db), user: User = Depends(require_service_access()),
):
    return ProposalService(db).create(data, user)


@router.get("/prefill/{service_card_id}", response_model=ProposalCreate, summary="Pré-preencher a partir do card")
def prefill_proposal(
    service_card_id: int,
    db: Session = Depends(get_db), user: User = Depends(require_service_access()),
):
    return ProposalService(db).prefill_from_card(service_card_id)


@router.get("/by-card/{service_card_id}", response_model=list[ProposalResponse], summary="Propostas de um card")
def proposals_by_card(
    service_card_id: int,
    db: Session = Depends(get_db), user: User = Depends(require_service_access()),
):
    return ProposalService(db).list_by_card(service_card_id)


@router.get("/{proposal_id}", response_model=ProposalResponse, summary="Buscar proposta")
def get_proposal(
    proposal_id: int,
    db: Session = Depends(get_db), user: User = Depends(require_service_access()),
):
    return ProposalService(db).get(proposal_id)


@router.put("/{proposal_id}", response_model=ProposalResponse, summary="Atualizar proposta")
def update_proposal(
    proposal_id: int, data: ProposalUpdate,
    db: Session = Depends(get_db), user: User = Depends(require_service_access()),
):
    return ProposalService(db).update(proposal_id, data, user)


@router.delete("/{proposal_id}", status_code=status.HTTP_200_OK, summary="Remover proposta")
def delete_proposal(
    proposal_id: int,
    db: Session = Depends(get_db), user: User = Depends(require_service_access()),
):
    return ProposalService(db).delete(proposal_id, user)
```

> ⚠️ Ordem das rotas: `/prefill/...` e `/by-card/...` vêm **antes** de `/{proposal_id}` para não colidir com o path param.

- [ ] **Step 4: Registrar o router**

Modify `backend/app/api/v1/__init__.py`:
- No import agregador (linha 7), adicionar `proposals` à lista de imports de `app.api.v1.endpoints`.
- Após a linha do `products` (`api_router.include_router(products.router, ...)`), adicionar:

```python
api_router.include_router(proposals.router, prefix="/proposals", tags=["Proposals"])
```

- [ ] **Step 5: Rodar testes de endpoint**

Run: `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -v`
Expected: PASS (todos).

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/proposals.py backend/app/api/v1/__init__.py backend/tests/unit/test_proposals.py
git commit -m "feat(propostas): endpoints REST + registro do router + testes"
```

---

## WORKSTREAM B — Frontend (página na sidebar)

### Task B1: Serviço de API + tipos

**Files:**
- Create: `frontend/src/services/proposalService.ts`

- [ ] **Step 1: Criar o serviço**

Create `frontend/src/services/proposalService.ts` (espelhar o padrão de `serviceBoardService.ts` / `productService.ts` — usar `api` de `./api`):

```typescript
import api from "./api";

export interface ProposalItem {
  id?: number;
  product_id?: number | null;
  description: string;
  sku?: string | null;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  total?: number;
}

export type ProposalMarker = "aprovada" | "nao_aprovada" | "em_aberto";

export interface Proposal {
  id: number;
  number: number;
  client_id?: number | null;
  person_id?: number | null;
  service_card_id?: number | null;
  seller_name?: string | null;
  date?: string | null;
  next_contact_date?: string | null;
  intro?: string | null;
  other_items?: string | null;
  discount: number;
  shipping: number;
  shipping_method?: string | null;
  freight_type?: string | null;
  carrier_name?: string | null;
  payment_terms?: string | null;
  validity_days?: number | null;
  delivery_date?: string | null;
  delivery_desc?: string | null;
  notes?: string | null;
  signature?: string | null;
  internal_status: string;
  items: ProposalItem[];
  total_items: number;
  total: number;
  marker: ProposalMarker;
  client_name?: string | null;
  client_document?: string | null;
  board_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProposalListResponse {
  items: Proposal[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type ProposalCreate = Partial<Omit<Proposal, "id" | "number" | "items" | "total" | "total_items" | "marker">> & {
  items: ProposalItem[];
};

const BASE = "/api/v1/proposals";

class ProposalService {
  async list(page = 1, pageSize = 50, search?: string): Promise<ProposalListResponse> {
    const r = await api.get<ProposalListResponse>(BASE, { params: { page, page_size: pageSize, search } });
    return r.data;
  }
  async get(id: number): Promise<Proposal> {
    return (await api.get<Proposal>(`${BASE}/${id}`)).data;
  }
  async create(data: ProposalCreate): Promise<Proposal> {
    return (await api.post<Proposal>(BASE, data)).data;
  }
  async update(id: number, data: Partial<ProposalCreate>): Promise<Proposal> {
    return (await api.put<Proposal>(`${BASE}/${id}`, data)).data;
  }
  async remove(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }
  async prefillFromCard(serviceCardId: number): Promise<ProposalCreate> {
    return (await api.get<ProposalCreate>(`${BASE}/prefill/${serviceCardId}`)).data;
  }
  async listByCard(serviceCardId: number): Promise<Proposal[]> {
    return (await api.get<Proposal[]>(`${BASE}/by-card/${serviceCardId}`)).data;
  }
}

export default new ProposalService();
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/proposalService.ts
git commit -m "feat(propostas): service de API no frontend"
```

---

### Task B2: Dependência react-quill + wrapper

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/components/common/RichTextEditor.tsx`

- [ ] **Step 1: Instalar react-quill**

Run: `cd frontend && npm install react-quill@2.0.0`
Expected: adiciona `react-quill` às dependências.

- [ ] **Step 2: Criar wrapper**

Create `frontend/src/components/common/RichTextEditor.tsx`:

```tsx
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  return (
    <div className="rich-text-editor">
      <ReactQuill theme="snow" value={value} onChange={onChange} modules={MODULES} placeholder={placeholder} />
    </div>
  );
}
```

> Se o `react-quill@2` acusar incompatibilidade com React 19, usar a alternativa `react-quill-new` (mesma API) e ajustar o import. Verificar no Step 3.

- [ ] **Step 3: Typecheck + smoke build**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros. Se houver erro de tipos do react-quill com React 19, trocar para `react-quill-new` e reinstalar.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/common/RichTextEditor.tsx
git commit -m "feat(propostas): editor de texto rico (react-quill)"
```

---

### Task B3: Página de listagem `Proposals.tsx`

**Files:**
- Create: `frontend/src/pages/Proposals.tsx`

- [ ] **Step 1: Criar a página**

Create `frontend/src/pages/Proposals.tsx`, espelhando `Products.tsx` (usar `useCRUD`/`useFilter`/`usePagination`, `SearchInput`, `Pagination`, `SelectMenu`, cabeçalho e tabela no mesmo estilo). Colunas: **Número · Data · Cliente · CNPJ · Valor · Marcador · Card Vinculado**. Requisitos específicos:

- Carregar via `proposalService.list()` (mapear `items`/`total`). Como a lista já vem paginada do backend, você pode paginar no client sobre `items` (padrão atual das páginas) OU usar a paginação do backend; para manter o padrão simples das outras páginas, carregue uma página grande (`pageSize` alto) e use `useFilter`/`usePagination` no client. Escolha o padrão idêntico ao de `Products.tsx`.
- **Marcador** (badge colorido):
  ```tsx
  const markerBadge = (m: string) =>
    m === "aprovada" ? { cls: "bg-green-500/15 text-green-600 dark:text-green-400", label: "Aprovada" }
    : m === "nao_aprovada" ? { cls: "bg-red-500/15 text-red-600 dark:text-red-400", label: "Não aprovada" }
    : { cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400", label: "Em aberto" };
  ```
- **Card Vinculado**: se `p.service_card_id && p.board_id`, renderizar link clicável:
  ```tsx
  {p.service_card_id && p.board_id ? (
    <button onClick={(e) => { e.stopPropagation(); navigate(`/servicos/${p.board_id}/cards/${p.service_card_id}`); }}
      className="text-blue-500 hover:underline">#{p.service_card_id}</button>
  ) : <span className="text-slate-400">—</span>}
  ```
- **Filtro por Marcador** (SelectMenu): Todas / Aprovada / Não aprovada / Em aberto → filtra `items` por `p.marker`.
- **Busca**: por cliente ou número (usar `useFilter` com `filterHelpers.searchInFields(["client_name", "number"])` — número precisa virar string na busca).
- Botão **"Nova proposta"** abre `ProposalModal` (Task B4) em modo create.
- Clique na linha / ação editar abre `ProposalModal` em modo edit (carrega `proposalService.get(id)`).
- Valor: `formatCurrency(p.total)` (usar o helper de moeda já usado nas outras páginas).
- Data: formatar `p.date` (dd/mm/aaaa), tratando `null`.

Estrutura mínima de referência (cabeçalho + tabela) — replicar layout de `Products.tsx` com estas colunas.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros (pode falhar até criar `ProposalModal` — se referenciar, criar antes ou stub).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Proposals.tsx
git commit -m "feat(propostas): pagina de listagem"
```

---

### Task B4: Formulário `ProposalModal.tsx` (criar/editar — réplica fiel)

**Files:**
- Create: `frontend/src/components/proposals/ProposalModal.tsx`

- [ ] **Step 1: Criar o modal/form**

Create `frontend/src/components/proposals/ProposalModal.tsx`. É um formulário grande (réplica fiel). Estruture em seções (usar `BaseModal` e componentes de `components/common`):

Campos e controles (todos controlados por estado `form`):
- **Cliente** — busca/seleção de cliente (reusar o mesmo seletor usado em cards; `client_id`). Exibir CNPJ do cliente selecionado.
- **Aos cuidados de** — pessoa/contato (`person_id`) + e-mail (informativo).
- **Introdução** — textarea (`intro`).
- **Nº Proposta** — read-only (em create mostra "(automático)"; em edit mostra `number`).
- **Vendedor** (`seller_name`), **Data** (`date`, input date), **Data do Próximo Contato** (`next_contact_date`, input date).
- **Itens de produto ou serviço** — tabela editável de `items[]` (colunas: Item/`description`, SKU/`sku`, Qtde/`quantity`, UN/`unit`, Preço un/`unit_price`, Preço total = qty×preço read-only, remover). Botão "adicionar item" (pode abrir busca de produto do catálogo via `productService`, ou linha em branco).
- **Outros itens ou serviços** — `<RichTextEditor value={form.other_items} onChange={v => set("other_items", v)} />`.
- **Totais** — Total dos itens (Σ qty×preço), Desconto (`discount`), Frete (`shipping`), Total proposta (itens + frete − desconto) — todos exibidos; desconto/frete editáveis.
- **Transportador** — Forma de envio (`shipping_method`), Forma de frete (`freight_type`), Nome (`carrier_name`).
- **Condições comerciais** — Condição de pagamento/parcelas (`payment_terms`).
- **Condições gerais** — Validade (`validity_days`), Data prevista de entrega (`delivery_date`), Descrição do prazo (`delivery_desc`).
- **Observações** (`notes`), **Assinatura** (`signature`).

Comportamento:
- Modo **create** com `initial?: ProposalCreate` (usado pelo card p/ prefill). Se `initial` vier, popular `form` com ele.
- **Salvar**: create → `proposalService.create(form)`; edit → `proposalService.update(id, form)`; chamar `onSaved()` e fechar.
- Recalcular total dos itens e total geral em tempo real.

> Este arquivo é grande; mantenha cada seção como um bloco JSX claro. Reutilize inputs/estilos das páginas existentes (ex.: `Input`, `SelectMenu`, `Textarea` de `components/common`).

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Smoke manual**

Rodar o app (frontend dev + docker). Abrir `/propostas` → "Nova proposta" → preencher e salvar → aparece na lista com Marcador "Em aberto".

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/proposals/ProposalModal.tsx
git commit -m "feat(propostas): formulario de criar/editar (replica fiel + react-quill)"
```

---

### Task B5: Item na sidebar

**Files:**
- Modify: `frontend/src/layouts/MainLayout.tsx` (array `menuItems`, ~linha 34-49)

- [ ] **Step 1: Adicionar o item**

No array `menuItems`, **logo após** o item de `Produtos` (`path: "/products"`), inserir:

```typescript
{ path: "/propostas", icon: FileText, label: "Propostas", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: false, serviceTeamOnly: true },
```

- Importar `FileText` de `lucide-react` no topo do arquivo.
- **Visibilidade:** o item deve aparecer só para admin/gerente/serviço. Verifique como a renderização decide visibilidade (loop `menuItems.map`, ~linha 157-260). Se já existe uma flag para "time de serviço" (ex.: itens de Serviço), reutilize-a. Se não existir, adicione a flag `serviceTeamOnly` e trate na condição de render: mostrar quando `isAdminOrManager || user.role === "service"`. Siga exatamente o mecanismo usado pelos itens "Boards (Serviços)" / dashboards de serviço, que já têm essa restrição.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Smoke manual**

Login como admin → item "Propostas" aparece após Produtos. Login como vendedor/SDR → item não aparece.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/layouts/MainLayout.tsx
git commit -m "feat(propostas): item na sidebar (acesso time de servico)"
```

---

### Task B6: Rotas

**Files:**
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Adicionar rotas protegidas**

- Importar a página: `import Proposals from './pages/Proposals';`
- Dentro do bloco de rotas protegidas do `MainLayout`, envolver com `ServiceTeamGuard` (mesmo guard usado nas telas de serviço, que permite admin/manager/service):

```tsx
<Route path="/propostas" element={<ServiceTeamGuard><Proposals /></ServiceTeamGuard>} />
```

(Edição/visualização são via modal na própria página; não é necessária rota `/propostas/:id` separada no v1. Se preferир rota dedicada, adicionar `<Route path="/propostas/:id" ... />` apontando para a mesma página com modal aberto.)

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Smoke manual**

Acessar `/propostas` como admin → carrega. Como vendedor → redirecionado (guard).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router.tsx
git commit -m "feat(propostas): rota /propostas com guard de servico"
```

---

## WORKSTREAM C — Integração no card de Serviço

### Task C1: Seção "Propostas" no card (abaixo de Produtos)

**Files:**
- Create: `frontend/src/components/service/ServiceProposalsSection.tsx`
- Modify: `frontend/src/pages/ServiceCardDetails.tsx` (inserir a seção após `ServiceProductSection`, ~linha 1205-1211)

- [ ] **Step 1: Criar o componente da seção**

Create `frontend/src/components/service/ServiceProposalsSection.tsx`:
- Props: `{ boardId: number; cardId: number }`.
- Ao montar: `proposalService.listByCard(cardId)` → lista as propostas do card (Número, Data, Valor, Marcador). Usar o mesmo `markerBadge` de Task B3 (extrair para um util compartilhado `frontend/src/utils/proposalMarker.ts` para DRY e importar nos dois lugares).
- Botão **"Nova proposta"**: chama `proposalService.prefillFromCard(cardId)` → abre `ProposalModal` em modo create com `initial` = retorno do prefill (já traz client/person/itens + `service_card_id`). Ao salvar, recarrega a lista.
- Clique numa proposta: abre `ProposalModal` em edit.
- Usar `ExpandableSection` (mesmo componente usado pela seção de Produtos) com título "Propostas".

- [ ] **Step 2: Inserir no card**

Modify `frontend/src/pages/ServiceCardDetails.tsx`: logo após o bloco que renderiza `ServiceProductSection` (a seção de Produtos na coluna esquerda), adicionar:

```tsx
<ServiceProposalsSection boardId={numBoardId} cardId={numCardId} />
```

E importar o componente no topo.

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Smoke manual**

Abrir um card de Serviço → seção "Propostas" aparece abaixo de Produtos → "Nova proposta" abre form já com cliente/pessoa/itens do card → salvar → proposta listada; na página `/propostas` aparece com o card vinculado.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/service/ServiceProposalsSection.tsx frontend/src/pages/ServiceCardDetails.tsx frontend/src/utils/proposalMarker.ts
git commit -m "feat(propostas): secao no card de servico com criacao pre-preenchida"
```

---

### Task C2: Remover o slot 'proposta' do Resumo

**Files:**
- Modify: `frontend/src/pages/ServiceCardDetails.tsx` (`ServiceSummarySection`, área de anexos/slots ~linha 129-145 e o bloco de UI do anexo "Proposta")

- [ ] **Step 1: Remover UI do anexo Proposta**

No `ServiceSummarySection`, localizar o bloco que renderiza o upload/exibição do slot `"proposta"` (usa `fileForSlot("proposta")` / `handleUploadSlot("proposta", ...)`) e removê-lo. Manter os slots `"os"` e `"oc"` intactos.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros (remover imports/variáveis que ficaram sem uso).

- [ ] **Step 3: Smoke manual**

Abrir card de Serviço → Resumo não mostra mais o anexo "Proposta"; OS e OC continuam.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ServiceCardDetails.tsx
git commit -m "feat(propostas): remover anexo de Proposta do Resumo (movido p/ aba Propostas)"
```

---

## WORKSTREAM D — Regra de avanço + documentação

### Task D1: Trocar regra "Proposta anexada" por "Proposta vinculada"

**Files:**
- Modify: `backend/app/services/service_board_service.py` (`_validate_advance`)
- Test: `backend/tests/unit/test_proposals.py` (append) — ou `backend/tests/unit/test_service_board.py` se existir

- [ ] **Step 1: Escrever teste (falha)**

Adicionar um teste que monte um card de serviço no board 2 (Cobrança) na etapa "Proposta" e verifique que o avanço para "Operações" é bloqueado sem proposta vinculada e liberado com ≥1 proposta vinculada. Use os models `ServiceBoard/ServiceList/ServiceCard` + `Proposal(service_card_id=card.id)`. Chamar o método de validação/`move_card` do `ServiceBoardService` e assertar `HTTPException` (400) sem proposta e sucesso com proposta.

(Se a montagem de fixtures de serviço for extensa, criar um helper local no teste.)

- [ ] **Step 2: Rodar e verificar falha**

Run: `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -k advance -v`
Expected: FAIL (ainda exige anexo, não proposta vinculada).

- [ ] **Step 3: Implementar a troca**

Em `service_board_service.py`, adicionar helper para contar propostas vinculadas:

```python
def _has_linked_proposal(self, card_id: int) -> bool:
    from app.models.proposal import Proposal
    return self.db.query(Proposal.id).filter(
        Proposal.service_card_id == card_id,
        Proposal.is_deleted == False,  # noqa: E712
    ).first() is not None
```

Substituir as ocorrências de `has_slot("proposta")` por `self._has_linked_proposal(card.id)` nas transições:
- **Board 1:** Ganho direto (Proposta → Ganho, faturamento_direto) e Proposta → Aguardando Pedido.
- **Board 2:** Proposta → Operações.

Ajustar as mensagens de `miss.append(...)` de "Proposta anexada no Resumo" para **"Proposta vinculada ao card (aba Propostas)"**.

- [ ] **Step 4: Rodar e verificar sucesso**

Run: `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -v`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/service_board_service.py backend/tests/unit/test_proposals.py
git commit -m "feat(propostas): regra de avanco passa a exigir proposta vinculada"
```

---

### Task D2: Atualizar a documentação (doc 16)

**Files:**
- Modify: `Documentação/16 - FLUXO E REGRAS DO BOARD DE SERVIÇOS.md`

- [ ] **Step 1: Atualizar as matrizes e regras**

Trocar todas as menções de **"Proposta anexada (no Resumo)"** por **"Proposta vinculada (aba Propostas do card)"** nas seções de regras de avanço do board 1 (Proposta → Aguardando Pedido; Proposta → Ganho faturamento direto) e board 2 (§8.2, Proposta → Operações). Adicionar uma nota curta explicando o novo módulo de Propostas (aba no card + página na sidebar) e que o anexo saiu do Resumo.

- [ ] **Step 2: Commit**

```bash
git add "Documentação/16 - FLUXO E REGRAS DO BOARD DE SERVIÇOS.md"
git commit -m "docs(servicos): regra de proposta agora e 'vinculada' (modulo Propostas)"
```

---

## Verificação final (após todas as tasks)

- [ ] Backend: `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -v` → tudo passa.
- [ ] Backend: `docker exec -w /app hsgrowth-api-local pytest -q` → suíte existente continua passando (sem regressão).
- [ ] Frontend: `cd frontend && npx tsc --noEmit` → sem erros.
- [ ] Smoke E2E manual: criar proposta pela sidebar (Em aberto) · criar pelo card (prefill + vínculo) · marcar o card como Ganho → proposta vira "Aprovada" · avançar etapa Proposta sem/com proposta vinculada (regra) · Resumo sem anexo Proposta.

## Fora de escopo (Fase 2)
- Geração/anexo do PDF (marca H&S) no backend.
- Endereço de entrega separado; "Total outros" numérico.
