# Produtos da oportunidade de parceiro (desconto e frete) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Montar o valor da oportunidade do Pipeline de Parceiros como na seção Serviços do card de Serviço (desconto por linha, desconto geral R$/%, frete), só com produtos liberados para parceiros.

**Architecture:** Migration nova acrescenta `products.partner_enabled`, `partner_opportunity_products.discount` e `global_discount`/`global_discount_type`/`shipping` em `partner_opportunities`. O serviço de oportunidades valida produto liberado e descontos; `respostas.valores_por_oportunidade` passa a aplicar a conta. No front, um componente novo `ProdutosDaOportunidade` copia o visual de `ServiceServicesSection` e substitui a aba Produtos.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest (SQLite em memória); React + TS + Tailwind.

Spec: `docs/superpowers/specs/2026-11-03-parcerias-produtos-oportunidade-design.md`.

Testes: `cd backend && MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest <alvo> -q -p no:cacheprovider --color=no`.
Front: `cd frontend && npx tsc --noEmit -p . && npm run build`.

**Não rodar `alembic upgrade` no container local (aponta para o banco de produção).**

---

### Task 1: Migration e modelos

**Files:**
- Create: `backend/alembic/versions/2026_11_03_1400-4e5f6a7b8c9d_parcerias_produtos_desconto.py`
- Modify: `backend/app/models/product.py`, `backend/app/models/partner_opportunity.py`

- [ ] **Step 1: migration**

```python
revision = '4e5f6a7b8c9d'
down_revision = '3d4e5f6a7b8c'

def upgrade():
    op.add_column('products', sa.Column('partner_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("UPDATE products SET partner_enabled = TRUE WHERE lower(trim(name)) = 'phoebus'")
    op.add_column('partner_opportunity_products', sa.Column('discount', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('partner_opportunities', sa.Column('global_discount', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('partner_opportunities', sa.Column('global_discount_type', sa.String(10), nullable=False, server_default='value'))
    op.add_column('partner_opportunities', sa.Column('shipping', sa.Numeric(12, 2), nullable=False, server_default='0'))

def downgrade():
    op.drop_column('partner_opportunities', 'shipping')
    op.drop_column('partner_opportunities', 'global_discount_type')
    op.drop_column('partner_opportunities', 'global_discount')
    op.drop_column('partner_opportunity_products', 'discount')
    op.drop_column('products', 'partner_enabled')
```

- [ ] **Step 2: modelos**

`Product`: `partner_enabled = Column(Boolean, default=False, nullable=False)`.
`PartnerOpportunity`: `global_discount = Column(Numeric(12, 2), nullable=False, default=0)`,
`global_discount_type = Column(String(10), nullable=False, default="value")`,
`shipping = Column(Numeric(12, 2), nullable=False, default=0)`.
`PartnerOpportunityProduct`: `discount = Column(Numeric(12, 2), nullable=False, default=0)`.

### Task 2: Cadastro de produto com `partner_enabled`

**Files:** `backend/app/schemas/product.py`, `backend/app/services/product_service.py` (`_build_product_response`), test `backend/tests/unit/test_parcerias_produtos.py`.

- [ ] **Step 1: teste**

```python
def test_produto_liberado_para_parceiros(client, admin_headers):
    criado = client.post("/api/v1/products", json={"name": "Phoebus", "unit_price": 24625, "partner_enabled": True},
                         headers=admin_headers)
    assert criado.status_code in (200, 201) and criado.json()["partner_enabled"] is True
    pid = criado.json()["id"]
    editado = client.put(f"/api/v1/products/{pid}", json={"partner_enabled": False}, headers=admin_headers)
    assert editado.json()["partner_enabled"] is False
```

- [ ] **Step 2:** `ProductCreate.partner_enabled: bool = False`, `ProductUpdate.partner_enabled: Optional[bool] = None`, `ProductResponse.partner_enabled: bool = False`; `_build_product_response` passa `partner_enabled=bool(product.partner_enabled)`.

### Task 3: Regras dos produtos da oportunidade

**Files:** `backend/app/schemas/parcerias.py`, `backend/app/services/parcerias/oportunidades.py`, `backend/app/services/parcerias/respostas.py`, test `backend/tests/unit/test_parcerias_produtos.py`, ajuste em `test_parcerias_oportunidades.py::test_produtos_e_valor` (produto `partner_enabled=True`).

- [ ] **Step 1: testes**

```python
def test_catalogo_so_traz_liberado(client, db): ...           # Phoebus liberado aparece; outro não
def test_adicionar_nao_liberado_ou_repetido_da_422(client, db): ...
def test_desconto_da_linha_nao_passa_do_subtotal(client, db): ...  # 2 × 1000, desconto 2500 → 422; 300 → total 1700
def test_valor_com_desconto_geral_e_frete(client, db): ...
    # linhas: 2×1000 − 300 = 1700; geral 10% → 170; frete 50 → 1580
    # geral em R$ 2000 → max(0, ...) + frete = 50
def test_desconto_geral_invalido(client, db): ...              # percent 150 → 422; negativo → 422
def test_financeiro_nao_mexe_nos_valores(client, db): ...      # 403
```

- [ ] **Step 2: schemas**

`ProdutoItemUpdate.discount: Optional[Decimal] = Field(None, ge=0)`;
`ProdutoItemResponse` ganha `product_sku: Optional[str]`, `discount: float`, `subtotal: float`;
`OportunidadeUpdate` ganha `global_discount: Optional[Decimal] = Field(None, ge=0)`,
`global_discount_type: Optional[Literal["value", "percent"]] = None`, `shipping: Optional[Decimal] = Field(None, ge=0)`;
`OportunidadeResponse` ganha `global_discount: float = 0`, `global_discount_type: str = "value"`, `shipping: float = 0`.

- [ ] **Step 3: serviço**

- `_produto_do_catalogo` exige `Product.partner_enabled.is_(True)` ("Produto não liberado para parceiros.").
- `adicionar_produto`: 422 se já existe linha com o mesmo `product_id`.
- `atualizar_produto`: aplica os campos e confere `0 <= discount <= quantity × unit_price` (422 "O desconto não pode ser maior que o valor da linha.").
- `atualizar` (oportunidade): `None` em `global_discount`/`shipping` vira 0; `global_discount_type == "percent"` com valor > 100 → 422.
- `catalogo` filtra `partner_enabled`.

- [ ] **Step 4: valor**

`respostas.valores_por_oportunidade(db, ids)` soma `quantity × unit_price − discount` por oportunidade e aplica, para cada uma, o desconto geral (valor ou %) e o frete: `max(0, total − desconto + frete)`. `item_out` devolve `discount`, `subtotal`, `total = subtotal − discount`, `product_sku`.

- [ ] **Step 5:** rodar `tests/unit -k parcerias`.

### Task 4: Front

**Files:**
- Create: `frontend/src/components/parcerias/ProdutosDaOportunidade.tsx` (cópia do visual de `ServiceServicesSection`, com `parceriasService`).
- Modify: `frontend/src/services/parceriasService.ts` (tipos `ItemProduto` com `product_sku`, `discount`, `subtotal`; `Oportunidade` com `global_discount`, `global_discount_type`, `shipping`; `atualizarProduto` aceita `unit_price` e `discount`; `ProdutoCatalogo` já existe).
- Modify: `frontend/src/pages/parcerias/OportunidadeDetalhe.tsx` (tira a aba Produtos e o estado de busca; coloca `<ProdutosDaOportunidade op={op} podeEditar={podeEditar} onSalvo={setOp} />` depois de "Empresa e contato"; texto do quadro "Produtos com descontos e frete").
- Modify: `frontend/src/components/products/ProductModal.tsx` e o tipo de produto (caixa "Liberado para parceiros").

Props do componente: `op: Oportunidade`, `podeEditar: boolean`, `onSalvo: (op: Oportunidade) => void` (recarrega a oportunidade depois de mexer nas linhas e ao salvar desconto geral/frete). Sem `podeEditar`, esconde lápis, lixeira, botão de adicionar e deixa desconto geral/frete só leitura.

### Task 5: Versão 1.11.9

CHANGELOG.md, `ChangelogModal.tsx`, rodapé do `MainLayout.tsx`. Rodar a suíte inteira e o build. Perguntar "posso commitar?".
