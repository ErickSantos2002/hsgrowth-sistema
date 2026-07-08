# Catálogo de Serviços — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Criar um catálogo de Serviços (espelho de Produtos) vinculável ao card de Serviço, que entra nas regras de avanço, define o valor do card e alimenta os itens da proposta.

**Architecture:** Nova entidade `Service` (tabela `services`) + vínculo `ServiceCardService` (tabela `service_card_services`, sem aparelhos), espelhando `Product`/`ServiceCardProduct`. Catálogo com API própria (`/api/v1/services`, só time de Serviço). O card de Serviço ganha uma seção "Serviços". Valor do card e itens da proposta passam a vir dos serviços.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic + Pydantic v2 (backend); React 19 + TS + Vite (frontend). Docker local `hsgrowth-api-local` (DB de produção). Testes: `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_services.py -q`. Frontend typecheck: `cd frontend && npx tsc --noEmit`.

**Restrições:** Sem bump de versão. Excluir `.claude/settings.local.json` dos commits. `backend/tests/` NÃO é bind-mounted → `docker cp <arquivo> hsgrowth-api-local:/app/tests/...` antes do pytest. `backend/app/` e `backend/alembic/` SÃO bind-mounted. Migration de produção é bloqueada em auto-mode → rodar `alembic upgrade head` fora do auto-mode (o usuário aprova). Commits terminam com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Fontes a espelhar (ler antes de cada task)
- Catálogo: `backend/app/models/product.py`, `schemas/product.py` (classes `ProductBase/Create/Update/Response/ListResponse`), `repositories/product_repository.py` (métodos `*_product`/catálogo), `services/product_service.py` (métodos de catálogo + `_build_product_response`), `api/v1/endpoints/products.py` (rotas de catálogo).
- Vínculo no card: `models/service_card_product.py`; `services/service_board_service.py` (`get_card_products`, `add_card_product`, `update_card_product`, `remove_card_product`, `_build_card_product_response`, lines ~575-656); `repositories/service_board_repository.py` (métodos `*_card_product`); `api/v1/endpoints/service_boards.py:404-451` (rotas de card products); schemas `ServiceCardProduct*` em `schemas/service_board.py`.
- Frontend: `frontend/src/pages/Products.tsx`, `components/products/ProductModal.tsx` (confirmar caminho), `services/productService.ts`, `components/service/ServiceProductSection.tsx`, `services/serviceBoardService.ts`, `layouts/MainLayout.tsx`, `router.tsx`, `pages/ServiceCardDetails.tsx`.

---

## Task 1: Models `Service` e `ServiceCardService`

**Files:**
- Create: `backend/app/models/service.py`
- Create: `backend/app/models/service_card_service.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1:** Criar `Service` (espelha `Product` sem `calibration_price`/`currency` expostos — mantém `currency` default p/ simetria mínima? NÃO. Campos: name, description, sku, unit_price, category, is_active):

```python
# backend/app/models/service.py
"""Catálogo de Serviços (tipos de serviço, ex.: Calibração 1). Espelha Product."""
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean
from app.db.base import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


class Service(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    sku = Column(String(100), nullable=True, unique=True, index=True)
    unit_price = Column(Numeric(12, 2), nullable=False)
    category = Column(String(100), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    def __repr__(self):
        return f"<Service(id={self.id}, name='{self.name}', sku='{self.sku}')>"
```

- [ ] **Step 2:** Criar `ServiceCardService` (espelha `ServiceCardProduct` sem `aparelhos`):

```python
# backend/app/models/service_card_service.py
"""Serviço vinculado a um Card de Serviço (ServiceCard <-> Service)."""
from sqlalchemy import Column, Integer, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.mixins import TimestampMixin


class ServiceCardService(Base, TimestampMixin):
    __tablename__ = "service_card_services"
    __table_args__ = (
        UniqueConstraint("service_card_id", "service_id", name="unique_service_card_service"),
    )

    id = Column(Integer, primary_key=True, index=True)
    service_card_id = Column(Integer, ForeignKey("service_cards.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount = Column(Numeric(12, 2), nullable=False, default=0)
    notes = Column(Text, nullable=True)

    service = relationship("Service")

    def __repr__(self):
        return f"<ServiceCardService(card={self.service_card_id}, service={self.service_id}, qty={self.quantity})>"

    @property
    def subtotal(self) -> float:
        return float(self.quantity * self.unit_price)

    @property
    def total(self) -> float:
        return self.subtotal - float(self.discount)
```

- [ ] **Step 3:** Em `models/__init__.py`, importar as duas classes (junto aos modelos de Serviço) e adicioná-las a `__all__`:

```python
from app.models.service import Service  # noqa
from app.models.service_card_service import ServiceCardService  # noqa
```
E adicionar `"Service"`, `"ServiceCardService"` em `__all__`.

- [ ] **Step 4:** Verificar import:
`docker exec -w /app hsgrowth-api-local python -c "import app.models; from app.models.service import Service; from app.models.service_card_service import ServiceCardService; print('ok')"` → Espera `ok`.

- [ ] **Step 5:** Commit `feat(servicos): models Service e ServiceCardService`.

---

## Task 2: Migration Alembic (2 tabelas)

**Files:**
- Create: `backend/alembic/versions/2026_07_08_1000-e5f6a7b8c9d0_create_services.py`

- [ ] **Step 1:** Descobrir head: `docker exec -w /app hsgrowth-api-local alembic heads` (esperado `d4e5f6a7b8c9`; usar como `down_revision`).

- [ ] **Step 2:** Escrever a migration MANUAL (não autogenerate):

```python
"""cria catalogo de servicos: services + service_card_services

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-08 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'services',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_services_id'), 'services', ['id'])
    op.create_index(op.f('ix_services_name'), 'services', ['name'])
    op.create_index(op.f('ix_services_sku'), 'services', ['sku'], unique=True)
    op.create_index(op.f('ix_services_category'), 'services', ['category'])
    op.create_index(op.f('ix_services_is_active'), 'services', ['is_active'])

    op.create_table(
        'service_card_services',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('service_card_id', sa.Integer(), nullable=False),
        sa.Column('service_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False),
        sa.Column('discount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['service_card_id'], ['service_cards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('service_card_id', 'service_id', name='unique_service_card_service'),
    )
    op.create_index(op.f('ix_service_card_services_id'), 'service_card_services', ['id'])
    op.create_index(op.f('ix_service_card_services_service_card_id'), 'service_card_services', ['service_card_id'])
    op.create_index(op.f('ix_service_card_services_service_id'), 'service_card_services', ['service_id'])


def downgrade():
    op.drop_table('service_card_services')
    op.drop_table('services')
```

- [ ] **Step 3:** (Fora do auto-mode — o usuário aprova) `docker exec -w /app hsgrowth-api-local alembic upgrade head` → Espera "Running upgrade d4e5f6a7b8c9 -> e5f6a7b8c9d0".

- [ ] **Step 4:** Verificar: `docker exec -w /app -e PYTHONPATH=/app hsgrowth-api-local python -c "from app.db.session import SessionLocal; from sqlalchemy import text; db=SessionLocal(); print(db.execute(text('select count(*) from services')).scalar(), db.execute(text('select count(*) from service_card_services')).scalar())"` → Espera `0 0`.

- [ ] **Step 5:** Commit `feat(servicos): migration services + service_card_services`.

---

## Task 3: Schemas do catálogo

**Files:**
- Create: `backend/app/schemas/service.py`

- [ ] **Step 1:** Espelhar `schemas/product.py` (catálogo), com os campos do `Service` (sem `calibration_price`/`currency`). Incluir também os schemas de vínculo no card (`ServiceCardServiceBase/Create/Update/Response/Summary`), espelhando os `CardProduct*`/`ServiceCardProduct*`, trocando `product_*`→`service_*`:

```python
"""Schemas de Serviço (catálogo) e de serviço no card."""
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator


# ===== SERVICE (CATÁLOGO) =====
class ServiceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    unit_price: float = Field(..., ge=0)
    category: Optional[str] = Field(None, max_length=100)


class ServiceCreate(ServiceBase):
    is_active: bool = True


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    unit_price: Optional[float] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class ServiceResponse(ServiceBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator('unit_price', mode='before')
    @classmethod
    def _dec2float(cls, v):
        return float(v) if isinstance(v, Decimal) else v

    model_config = {"from_attributes": True}


class ServiceListResponse(BaseModel):
    services: list[ServiceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ===== SERVICE NO CARD =====
class ServiceCardServiceBase(BaseModel):
    service_id: int
    quantity: int = Field(..., ge=1)
    unit_price: float = Field(..., ge=0)
    discount: float = Field(0, ge=0)
    notes: Optional[str] = None


class ServiceCardServiceCreate(ServiceCardServiceBase):
    pass


class ServiceCardServiceUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=1)
    unit_price: Optional[float] = Field(None, ge=0)
    discount: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class ServiceCardServiceResponse(ServiceCardServiceBase):
    id: int
    service_card_id: int
    subtotal: float
    total: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    service_name: Optional[str] = None
    service_sku: Optional[str] = None
    service_category: Optional[str] = None

    @field_validator('unit_price', 'discount', 'subtotal', 'total', mode='before')
    @classmethod
    def _dec2float(cls, v):
        return float(v) if isinstance(v, Decimal) else v

    model_config = {"from_attributes": True}


class ServiceCardServiceSummary(BaseModel):
    items: list[ServiceCardServiceResponse]
    total_items: int
    subtotal: float
    total_discount: float
    total: float
```

- [ ] **Step 2:** `docker exec -w /app hsgrowth-api-local python -c "import app.schemas.service; print('ok')"` → `ok`.
- [ ] **Step 3:** Commit `feat(servicos): schemas de catalogo e de servico no card`.

---

## Task 4: Repository e service do catálogo

**Files:**
- Create: `backend/app/repositories/service_repository.py`
- Create: `backend/app/services/service_catalog_service.py`

- [ ] **Step 1:** `service_repository.py` — espelhar a parte de catálogo de `product_repository.py`, trocando `Product`→`Service`, `product`→`service`, e filtrando soft-delete (`Service.is_deleted == False`) na busca/listagem (o `Service` tem `SoftDeleteMixin`). Métodos: `create_service`, `get_service_by_id`, `get_service_by_sku`, `list_services(page,page_size,search,category,is_active)`, `update_service`, `delete_service` (soft delete → set `is_deleted=True` E `is_active=False`). Busca por `name/description/sku`.

- [ ] **Step 2:** `service_catalog_service.py` — classe `ServiceCatalogService` espelhando a parte de catálogo de `product_service.py` (create/get/list/update/delete + `_build_service_response`), com validação de SKU duplicado. Sem a parte de card (fica no board).

- [ ] **Step 3:** Verificar imports: `docker exec -w /app hsgrowth-api-local python -c "import app.repositories.service_repository, app.services.service_catalog_service; print('ok')"` → `ok`.

- [ ] **Step 4:** Commit `feat(servicos): repository e service do catalogo`.

---

## Task 5: Endpoints do catálogo `/api/v1/services`

**Files:**
- Create: `backend/app/api/v1/endpoints/services.py`
- Modify: `backend/app/api/v1/__init__.py` (ou onde os routers são registrados — verificar como `proposals` foi registrado com `require_service_access`)

- [ ] **Step 1:** `endpoints/services.py` — CRUD do catálogo (mirror enxuto de `products.py`, SEM os endpoints de card-product, SEM docstrings gigantes de OpenAPI). Usar `ServiceCatalogService`. Rotas: `POST ""`, `GET ""` (params page/page_size/search/category/is_active), `GET /{service_id}`, `PUT /{service_id}`, `DELETE /{service_id}`.

```python
"""Endpoints do catálogo de Serviços (módulo de Serviço)."""
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.service_catalog_service import ServiceCatalogService
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse, ServiceListResponse
from app.models.user import User
from app.api.deps import get_current_active_user

router = APIRouter()


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED, summary="Criar serviço")
def create_service(data: ServiceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    return ServiceCatalogService(db).create_service(data, user)


@router.get("", response_model=ServiceListResponse, summary="Listar serviços")
def list_services(page: int = 1, page_size: int = 50, search: Optional[str] = None,
                  category: Optional[str] = None, is_active: Optional[bool] = True,
                  db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    return ServiceCatalogService(db).list_services(page=page, page_size=page_size, search=search,
                                                    category=category, is_active=is_active)


@router.get("/{service_id}", response_model=ServiceResponse, summary="Buscar serviço")
def get_service(service_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    return ServiceCatalogService(db).get_service(service_id)


@router.put("/{service_id}", response_model=ServiceResponse, summary="Atualizar serviço")
def update_service(service_id: int, data: ServiceUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    return ServiceCatalogService(db).update_service(service_id, data, user)


@router.delete("/{service_id}", status_code=status.HTTP_200_OK, summary="Remover serviço")
def delete_service(service_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    return ServiceCatalogService(db).delete_service(service_id, user)
```

- [ ] **Step 2:** Registrar o router. Verificar em `app/api/v1/__init__.py` como o `proposals` foi incluído com `dependencies=[Depends(require_service_access())]` e replicar para `services` com prefixo `/services` e tag "Serviços". Ex.:
```python
from app.api.v1.endpoints import services as services_endpoints
api_router.include_router(services_endpoints.router, prefix="/services", tags=["Serviços"],
                          dependencies=[Depends(require_service_access())])
```

- [ ] **Step 3:** `docker exec -w /app hsgrowth-api-local python -c "from app.main import app; print([r.path for r in app.routes if '/services' in getattr(r,'path','')][:6])"` → mostra as rotas `/api/v1/services...`.

- [ ] **Step 4:** Commit `feat(servicos): endpoints CRUD do catalogo /api/v1/services`.

---

## Task 6: Serviço no card (repo + service + endpoints no board)

**Files:**
- Modify: `backend/app/repositories/service_board_repository.py`
- Modify: `backend/app/services/service_board_service.py`
- Modify: `backend/app/api/v1/endpoints/service_boards.py`

- [ ] **Step 1:** No `service_board_repository.py`, espelhar os métodos de card-product para card-service (usando `ServiceCardService`): `list_card_services(card_id)`, `add_card_service(card_id, data)`, `get_card_service_by_id(item_id)` (com `joinedload(ServiceCardService.service)`), `get_card_service_by_card_and_service(card_id, service_id)`, `update_card_service(item_id, data)`, `remove_card_service(item_id)`. Importar `ServiceCardService`.

- [ ] **Step 2:** No `service_board_service.py`, espelhar os métodos (após os de produto, ~linha 656): `get_card_services(card_id) -> ServiceCardServiceSummary`, `add_card_service(card_id, data, user)` (valida serviço existe via `ServiceRepository`, valida duplicado, `log_event` "service_added"), `update_card_service(item_id, data, user)`, `remove_card_service(item_id, user)` (log "service_removed"), e `_build_card_service_response(item)` (com `service_name/service_sku/service_category`). Importar `ServiceCardService`, `ServiceRepository` e os schemas `ServiceCardService*`.

- [ ] **Step 3:** No `service_boards.py`, espelhar as 4 rotas de card-product (linhas 404-451) para card-service, em `/{board_id}/cards/{card_id}/services[/{item_id}]`, chamando os métodos novos. Importar os schemas `ServiceCardServiceCreate/Update/Response/Summary`.

- [ ] **Step 4:** `docker exec -w /app hsgrowth-api-local python -c "import app.repositories.service_board_repository, app.services.service_board_service, app.api.v1.endpoints.service_boards; print('ok')"` → `ok`.

- [ ] **Step 5:** Commit `feat(servicos): servico no card (repo, service, endpoints do board)`.

---

## Task 7: Regra de avanço (exige serviço) + valor do card por serviços

**Files:**
- Modify: `backend/app/services/service_board_service.py`

- [ ] **Step 1:** Em `_validate_advance`, nos dois pontos que hoje exigem produto (board 1 "dados preenchidos", board 2 "oportunidade existente"), adicionar a exigência de serviço logo após a de produto:
```python
                services = self.repo.list_card_services(card.id)
                if not services:
                    miss.append("ao menos 1 serviço no card")
```
(colocar após o bloco `if not products: miss.append("ao menos 1 produto no card")` em cada board).

- [ ] **Step 2:** Em `_compute_card_meta` (agregação de valor por card — hoje soma `ServiceCardProduct`), trocar a origem do **valor** para `ServiceCardService`:
```python
        # Valor por card = soma dos SERVIÇOS (quantity*unit_price - discount)
        value_rows = (
            db.query(
                ServiceCardService.service_card_id,
                func.coalesce(func.sum(ServiceCardService.quantity * ServiceCardService.unit_price - ServiceCardService.discount), 0),
            )
            .filter(ServiceCardService.service_card_id.in_(card_ids))
            .group_by(ServiceCardService.service_card_id)
            .all()
        )
```
(substituir a query equivalente que usava `ServiceCardProduct` para o VALOR; manter a query de `products_by_card` que lista produtos para o filtro do Kanban — essa continua com produtos). Importar `ServiceCardService`.

- [ ] **Step 3:** Testar o app importa e sobe: `docker exec -w /app hsgrowth-api-local python -c "from app.main import app; print('ok')"` → `ok`.

- [ ] **Step 4:** Commit `feat(servicos): avanco exige servico + valor do card por servicos`.

---

## Task 8: Dashboard — valor por serviços

**Files:**
- Modify: `backend/app/services/service_dashboard_service.py`

- [ ] **Step 1:** Localizar as agregações de **valor** que usam `ServiceCardProduct` (valor de pipeline, valor ganho, ticket médio) e trocar para `ServiceCardService` (soma `quantity*unit_price - discount`). Não alterar contagens de aparelhos/recalibração (essas são de produto e ficam para fase posterior). Importar `ServiceCardService`.

- [ ] **Step 2:** `docker exec -w /app hsgrowth-api-local python -c "import app.services.service_dashboard_service; print('ok')"` → `ok`.

- [ ] **Step 3:** Commit `feat(servicos): dashboard calcula valor pelos servicos`.

---

## Task 9: Proposta — prefill dos itens por serviços

**Files:**
- Modify: `backend/app/services/proposal_service.py` (`prefill_from_card`, ~linha 103)

- [ ] **Step 1:** Trocar a origem dos `items` do prefill de `ServiceCardProduct` para `ServiceCardService`:
```python
        rows = (
            self.db.query(ServiceCardService, Service)
            .join(Service, ServiceCardService.service_id == Service.id)
            .filter(ServiceCardService.service_card_id == service_card_id)
            .all()
        )
        items = [
            ProposalItemCreate(
                product_id=None, description=s.name or "", sku=s.sku,
                quantity=float(scs.quantity or 1), unit=DEFAULT_ITEM_UNIT,
                unit_price=float(scs.unit_price or 0),
            )
            for scs, s in rows
        ]
```
Importar `from app.models.service_card_service import ServiceCardService` e `from app.models.service import Service`. Remover imports de produto se ficarem sem uso.

- [ ] **Step 2:** `docker exec -w /app hsgrowth-api-local python -c "import app.services.proposal_service; print('ok')"` → `ok`.

- [ ] **Step 3:** Commit `feat(propostas): itens da proposta vem dos servicos do card`.

---

## Task 10: Seed de 4 serviços de teste

**Files:**
- Create: `backend/scripts/seed_services.py`

- [ ] **Step 1:** Script idempotente que cria "Calibração 1/2/3/4" (preços 100/200/300/400) se ainda não existirem (por `name`):
```python
"""Seed de serviços de teste (idempotente)."""
from app.db.session import SessionLocal
from app.models.service import Service

SEED = [("Calibração 1", 100), ("Calibração 2", 200), ("Calibração 3", 300), ("Calibração 4", 400)]

def run():
    db = SessionLocal()
    created = 0
    for name, price in SEED:
        exists = db.query(Service).filter(Service.name == name, Service.is_deleted == False).first()
        if not exists:
            db.add(Service(name=name, unit_price=price, category="Calibração", is_active=True))
            created += 1
    db.commit()
    print(f"seed_services: {created} criado(s)")

if __name__ == "__main__":
    run()
```

- [ ] **Step 2:** Copiar e rodar no container: `docker cp backend/scripts/seed_services.py hsgrowth-api-local:/app/scripts/seed_services.py` depois `docker exec -w /app -e PYTHONPATH=/app hsgrowth-api-local python scripts/seed_services.py` → Espera "seed_services: 4 criado(s)".

- [ ] **Step 3:** Commit `chore(servicos): seed de 4 servicos de teste (Calibracao 1-4)`.

---

## Task 11: Testes backend

**Files:**
- Create: `backend/tests/unit/test_services.py`

- [ ] **Step 1:** Escrever testes (usar fixtures `db`, `client`, `admin_headers`, `salesperson_headers` como em `test_proposals.py`):
  - `test_create_service_and_sku_unique`: cria serviço; criar outro com mesmo SKU → 400.
  - `test_list_services_filters_active`: cria ativo+inativo; lista só ativos por padrão.
  - `test_endpoint_services_requires_service_access`: `client.get("/api/v1/services", headers=salesperson_headers)` → 403; com `admin_headers` → 200.
  - `test_add_service_to_card_and_summary`: cria board/list/card + serviço; `ServiceBoardService.add_card_service` → summary com total correto.
  - `test_advance_requires_product_and_service`: card com produto mas sem serviço não avança da etapa que exige ambos (mensagem contém "serviço"); com ambos, avança.
  - `test_card_value_from_services`: `_compute_card_meta`/valor reflete serviços.
  - `test_proposal_prefill_uses_services`: card com serviço → `prefill_from_card` traz item com o nome do serviço.

- [ ] **Step 2:** `docker cp backend/tests/unit/test_services.py hsgrowth-api-local:/app/tests/unit/test_services.py && docker exec -w /app hsgrowth-api-local pytest tests/unit/test_services.py -q` → Espera todos verdes. Rodar também `pytest tests/unit/test_proposals.py -q` (não quebrar prefill).

- [ ] **Step 3:** Commit `test(servicos): catalogo, card-service, avanco, valor e prefill`.

---

## Task 12: Frontend — client de API do catálogo

**Files:**
- Create: `frontend/src/services/serviceCatalogService.ts`

- [ ] **Step 1:** Espelhar `services/productService.ts` para o catálogo de Serviços. Interfaces `Service`, `ServiceCreate`, `ServiceUpdate`, `ServiceListResponse` (campos: id, name, description, sku, unit_price, category, is_active, created_at, updated_at). Base `/api/v1/services`. Métodos: `list(page,pageSize,search,category,isActive)` (resposta usa a chave `services`), `get(id)`, `create(data)`, `update(id,data)`, `remove(id)`. Também interfaces/métodos de serviço no card: `CardServiceCreate/Update/Response/Summary` e chamadas ao board (`/api/v1/service-boards/{boardId}/cards/{cardId}/services...`) — confirmar o prefixo real do board em `serviceBoardService.ts`.

- [ ] **Step 2:** `cd frontend && npx tsc --noEmit` (arquivo isolado ok).
- [ ] **Step 3:** Commit `feat(servicos): client de API do catalogo (front)`.

---

## Task 13: Frontend — página do catálogo

**Files:**
- Create: `frontend/src/pages/Servicos.tsx`

- [ ] **Step 1:** Copiar `pages/Products.tsx` para `pages/Servicos.tsx` e adaptar: título "Serviços", usa `serviceCatalogService`, campos do serviço (Nome, Descrição, SKU, Preço, Categoria, Ativo), abre `ServiceModal` (Task 14). Manter busca, paginação, filtros no mesmo padrão. Textos pt-BR.

- [ ] **Step 2:** `cd frontend && npx tsc --noEmit`.
- [ ] **Step 3:** Commit `feat(servicos): pagina do catalogo de servicos`.

---

## Task 14: Frontend — modal "Novo Serviço"

**Files:**
- Create: `frontend/src/components/services-catalog/ServiceModal.tsx`

- [ ] **Step 1:** Copiar o modal de Produto (confirmar caminho, provavelmente `components/products/ProductModal.tsx`) para `components/services-catalog/ServiceModal.tsx`. Campos: Nome, Descrição, Código/SKU, Preço, Categoria, Ativo. Título "Novo Serviço"/"Editar Serviço". Usa `serviceCatalogService.create/update`. Textos pt-BR.

- [ ] **Step 2:** `cd frontend && npx tsc --noEmit`.
- [ ] **Step 3:** Commit `feat(servicos): modal Novo Servico`.

---

## Task 15: Frontend — sidebar + rota

**Files:**
- Modify: `frontend/src/layouts/MainLayout.tsx`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1:** Em `MainLayout.tsx`, adicionar item de menu **"Serviço"** entre "Produtos" (`/products`) e "Propostas" (`/propostas`), ícone `Cog` (importar de lucide-react), `path: "/service-catalog"`, `viewerAllowed:false`. Aplicar o mesmo gate de time de Serviço usado por "Propostas" (mesma lógica de exibição no `menuItems.map`).

- [ ] **Step 2:** Em `router.tsx`, adicionar rota `/service-catalog` → `<Servicos />` protegida pelo `ServiceTeamGuard` (mesmo usado por `/propostas`).

- [ ] **Step 3:** `cd frontend && npx tsc --noEmit`.
- [ ] **Step 4:** Commit `feat(servicos): item na sidebar + rota /service-catalog`.

---

## Task 16: Frontend — seção "Serviços" no card

**Files:**
- Create: `frontend/src/components/service/ServiceServicesSection.tsx`
- Modify: `frontend/src/pages/ServiceCardDetails.tsx`

- [ ] **Step 1:** Copiar `components/service/ServiceProductSection.tsx` para `ServiceServicesSection.tsx` e adaptar: título "Serviços", usa os endpoints de card-service, **remove** a sub-lista de aparelhos, mantém escolher serviço + quantidade + preço (pré-preenchido do catálogo, editável) + desconto. Busca no catálogo via `serviceCatalogService.list`.

- [ ] **Step 2:** Em `ServiceCardDetails.tsx`, inserir `<ServiceServicesSection .../>` logo **abaixo** da seção de Produtos (`ServiceProductSection`), passando `boardId`/`cardId` como aquela.

- [ ] **Step 3:** `cd frontend && npx tsc --noEmit` → sem erros.
- [ ] **Step 4:** Commit `feat(servicos): secao Servicos no detalhe do card`.

---

## Task 17: Docs

**Files:**
- Modify: `Documentação/16 - FLUXO E REGRAS DO BOARD DE SERVIÇOS.md`
- Modify: `Documentação/17 - MÓDULO DE PROPOSTAS COMERCIAIS.md`

- [ ] **Step 1:** Doc 16: nas regras de avanço (board 1 "Dados Preenchidos→", board 2 "Oportunidade Existente→") registrar que agora exige **≥1 produto E ≥1 serviço**; e que o **valor do card** passou a ser calculado pelos **serviços**.
- [ ] **Step 2:** Doc 17 (§2.1): registrar que o **prefill dos itens** da proposta vem dos **serviços** do card (produtos seguem em "Outros itens").
- [ ] **Step 3:** Commit `docs: catalogo de servicos (avanco, valor, proposta)`.

---

## Verificação final
- [ ] `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_services.py tests/unit/test_proposals.py -q` verde.
- [ ] `cd frontend && npx tsc --noEmit` sem erros.
- [ ] Smoke (usuário): criar serviço na nova página; no card, vincular produto + serviço; tentar avançar sem serviço (bloqueia) e com serviço (avança); valor do card reflete serviços; criar proposta → itens = serviços.
