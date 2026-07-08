# Catálogo de Serviços — Design

**Data:** 2026-07-08
**Módulo:** Serviço (catálogo próprio de Serviços, espelhando Produtos)
**Escopo:** exclusivo do time de Serviço (admin, gerente, role `service`).

---

## 1. Objetivo

Criar um **catálogo de Serviços** (tipos de serviço, ex.: Calibração 1–4) espelhando o módulo de **Produtos**:
- Página na sidebar entre Produtos e Propostas, com modal "Novo Serviço".
- Vínculo de serviços ao card de Serviço (seção abaixo de Produtos), com quantidade, preço e desconto.
- Entra nas **regras de avanço** do board.
- Alimenta a **proposta** (a tabela de itens passa a mostrar Serviços no lugar de Produtos).
- O **valor do card** (Kanban/dashboard) passa a ser calculado pelos **Serviços** (não mais pelos Produtos).

---

## 2. Modelo de dados

### 2.1. `services` (catálogo) — model `Service`
Espelha `Product`, com os campos aprovados (Nome, Descrição, Código/SKU, Preço, Categoria, Ativo):

| coluna | tipo | notas |
|---|---|---|
| `id` | Integer PK | |
| `name` | String(255), NOT NULL, index | Nome |
| `description` | Text, nullable | Descrição |
| `sku` | String(100), unique, nullable, index | Código/SKU |
| `unit_price` | Numeric(12,2), NOT NULL | Preço |
| `category` | String(100), nullable, index | Categoria |
| `is_active` | Boolean, NOT NULL default true, index | Ativo |
| + `TimestampMixin`, `SoftDeleteMixin` | | `created_at`, `updated_at`, `is_deleted` |

### 2.2. `service_card_services` (vínculo card↔serviço) — model `ServiceCardService`
Espelha `ServiceCardProduct` **sem** aparelhos:

| coluna | tipo | notas |
|---|---|---|
| `id` | Integer PK | |
| `service_card_id` | FK `service_cards.id` ON DELETE CASCADE, NOT NULL, index | |
| `service_id` | FK `services.id` ON DELETE CASCADE, NOT NULL, index | |
| `quantity` | Integer, NOT NULL default 1 | |
| `unit_price` | Numeric(12,2), NOT NULL | vem do catálogo, editável |
| `discount` | Numeric(12,2), NOT NULL default 0 | desconto absoluto |
| `notes` | Text, nullable | |
| + `TimestampMixin` | | |

`UNIQUE(service_card_id, service_id)` — não duplica o mesmo serviço no card.
Properties `subtotal` (qtd × preço) e `total` (subtotal − desconto), como em `ServiceCardProduct`.

---

## 3. Backend — API

### 3.1. Catálogo `/api/v1/services` (mirror de `/api/v1/products`)
CRUD: `GET ""` (lista + busca + paginação), `POST ""`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` (soft-delete).
Gated por `require_service_access()` (só time de Serviço) — diferente de Produtos, que é aberto.
Camadas: `models/service.py`, `schemas/service.py`, `repositories/service_repository.py`, `services/service_catalog_service.py`, `api/v1/endpoints/services.py`.

> **Nota de nomenclatura:** para evitar colisão com os *service layers* (`ProposalService`, `ServiceBoardService`), a camada de negócio do catálogo chama-se `ServiceCatalogService` (arquivo `service_catalog_service.py`).

### 3.2. Serviços do card (mirror dos endpoints de produtos do card)
No `ServiceBoardService`/endpoints do board, replicar para serviços o que existe para produtos:
- `GET /service-cards/{card_id}/services` (listar) · `POST` (adicionar) · `PUT /{item_id}` (editar qtd/preço/desconto) · `DELETE /{item_id}` (remover).
- Schemas `ServiceCardServiceCreate/Update/Response/Summary` espelhando os de produto.

### 3.3. Regra de avanço (`_validate_advance`)
Nas etapas que hoje exigem "≥1 produto no card", **adicionar** "≥1 serviço no card":
- **Board 1**: "Dados Preenchidos → Tentativa de Contato".
- **Board 2**: "Oportunidade Existente → Tentativa de Contato".
Passa a exigir **produto E serviço** (ambos).

### 3.4. Valor do card = Serviços
Trocar a origem do **valor** do card (soma `quantity*unit_price - discount`) de `service_card_products` para `service_card_services`:
- **Kanban/board:** `ServiceBoardService._compute_card_meta` (agregação de valor por card).
- **Dashboard de Serviço:** `service_dashboard_service` (valor de pipeline, valor ganho, ticket médio) passa a somar serviços.
> Ajustes do lado de Produtos ficam para uma fase posterior (decisão do usuário).

### 3.5. Proposta — prefill por Serviços
`ProposalService.prefill_from_card`: os **itens** da proposta passam a ser montados a partir de `service_card_services` (nome do serviço → `description`, `sku`, `quantity`, `unit_price`) **no lugar** de `service_card_products`.
- Produtos continuam alimentando "Outros itens ou serviços" (Modelo/Aparelhos) — fluxo atual do `ServiceProposalsSection` inalterado.

---

## 4. Frontend

### 4.1. Sidebar + rota
- Novo item **"Serviço"** em `MainLayout.menuItems`, entre "Produtos" e "Propostas", ícone `Cog` (ou similar), `viewerAllowed:false` + gate de time de Serviço (igual "Propostas").
- Rota nova **`/service-catalog`** (o path `/servicos` já é dos boards) com `ServiceTeamGuard`.

### 4.2. Página + modal (cópia de Produtos)
- `pages/Servicos.tsx` = cópia de `pages/Products.tsx` (header, busca, lista/tabela, paginação, filtros) adaptada ao catálogo de Serviços.
- `components/services-catalog/ServiceModal.tsx` = cópia de `ProductModal` com os campos Nome, Descrição, Código/SKU, Preço, Categoria, Ativo. Título "Novo Serviço" / "Editar Serviço".
- `services/serviceCatalogService.ts` = client de API (mirror de `productService`).

### 4.3. Card — seção "Serviços"
- `components/service/ServiceServicesSection.tsx` = cópia de `ServiceProductSection` **sem** aparelhos: escolher serviço do catálogo, quantidade, preço (pré-preenchido do catálogo, editável) e desconto. Inserida no `ServiceCardDetails.tsx` logo abaixo da seção de Produtos.

### 4.4. Proposta
- Sem mudança de UI: a tabela de itens é genérica ("Item / Descrição"). Como o prefill (backend) passa a trazer serviços, os itens exibidos serão os serviços.

---

## 5. Dados de teste
Seed de 4 serviços no catálogo: **Calibração 1, Calibração 2, Calibração 3, Calibração 4** (preços de exemplo, ex.: 100/200/300/400). Via script idempotente em `backend/scripts/` ou inserção direta.

---

## 6. Arquivos afetados (mapa)

**Backend — criar:** `models/service.py`, `models/service_card_service.py`, `schemas/service.py`, `schemas/service_card_service.py` (ou dentro dos schemas do board), `repositories/service_repository.py`, `services/service_catalog_service.py`, `api/v1/endpoints/services.py`, migration Alembic (2 tabelas), seed dos 4 serviços.
**Backend — modificar:** `models/__init__.py`, `api/v1/__init__.py` (registrar router), `services/service_board_service.py` (endpoints card-service + regra de avanço + valor por serviços), `services/service_dashboard_service.py` (valor por serviços), `services/proposal_service.py` (`prefill_from_card` por serviços), schemas do board.

**Frontend — criar:** `pages/Servicos.tsx`, `components/services-catalog/ServiceModal.tsx`, `services/serviceCatalogService.ts`, `components/service/ServiceServicesSection.tsx`.
**Frontend — modificar:** `layouts/MainLayout.tsx` (menu), `router.tsx` (rota + guard), `pages/ServiceCardDetails.tsx` (nova seção).

**Docs:** doc 16 (regra de avanço agora exige produto E serviço; valor por serviços) e doc 17 (proposta puxa serviços).

---

## 7. Fora de escopo
- Ajuste do papel dos **Produtos** no valor/kanban (fica para fase posterior — decisão do usuário).
- Aparelhos em serviços (serviços não têm aparelhos).
- Migração de dados (catálogo novo, começa vazio + seed de teste).
- Sem bump de versão (acumula p/ go-live v1.8.0).
