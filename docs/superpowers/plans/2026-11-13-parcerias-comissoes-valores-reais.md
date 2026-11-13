# Parcerias — comissões com os valores reais · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comissões do Programa de Parceiros com os valores reais: % de venda própria separado
para empresa e hunter, desconto travado em 0/2/4/6% com a comissão caindo meio ponto por ponto
sobre o preço cheio, tabela "desconto × remuneração" e previsão das 2 renovações por aparelho.

**Spec:** `docs/superpowers/specs/2026-11-13-parcerias-comissoes-valores-reais-design.md`

**Architecture:** A regra de desconto mora em `services/parcerias/comissoes.py`
(`DESCONTOS_PERMITIDOS`, `REDUCAO_POR_PONTO`, `preco_cheio`, `taxa_com_desconto`). A
oportunidade (`services/parcerias/oportunidades.py`) só valida as travas. A previsão das
renovações é montada no `listar_calibracoes`, que passa a devolver `{aparelhos, sem_comissao}`.
O front lê tudo do backend (tabela de desconto num endpoint próprio).

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest (SQLite em memória), React 19 + TS + Tailwind.

**Versão:** 1.11.22 · só homologação · migration aditiva `0e1f2a3b4c5d` (down `9d0e1f2a3b4c`).

**Regras da casa:**
- Commit só depois de perguntar ao usuário ("posso commitar?"). Mensagens sem acento.
- **Nunca** rodar `alembic upgrade` no container local (aponta para a produção).
- Testes (Docker Desktop aberto):
  `cd backend && MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest <alvo> -q -p no:cacheprovider --color=no`
- Front: `cd frontend && npx tsc --noEmit -p . && npm run build` (o ESLint está quebrado).

---

## Mapa de arquivos

| Arquivo | O que muda |
|---|---|
| `backend/alembic/versions/2026_11_13_1000-0e1f2a3b4c5d_parcerias_comissoes_hunter_anuidade.py` | **novo**: 2 colunas na config |
| `backend/app/models/partner_commission.py` | colunas `hunter_own_sale_pct`, `annual_fee_reference` |
| `backend/app/schemas/parcerias.py` | config com os 2 campos; schemas da previsão e da tabela |
| `backend/app/services/parcerias/comissoes.py` | constantes, `preco_cheio`, `taxa_com_desconto`, `gerar`, `_reancorar`, `salvar_config`, `listar_calibracoes`, trava de séries, `tabela_de_desconto` |
| `backend/app/services/parcerias/oportunidades.py` | trava do desconto geral e do preço/desconto por item |
| `backend/app/api/v1/endpoints/parcerias.py` | `GET /comissoes/tabela-desconto`; resposta nova do `GET .../calibracoes` |
| `backend/tests/unit/apoio_parcerias.py` | `config_comissoes(yh=, anuidade=)`, `oportunidade_ganha(quantidade=)` |
| `backend/tests/unit/test_parcerias_comissoes_valores_reais.py` | **novo**: testes desta entrega |
| `backend/tests/unit/test_parcerias_produtos.py`, `test_parcerias_comissoes_geracao.py`, `test_parcerias_comissoes_api.py`, `test_parcerias_comissoes_revisao_final.py` | ajustes para as regras novas |
| `frontend/src/constants/parcerias.ts` | `DESCONTOS_PERMITIDOS` |
| `frontend/src/services/parceriasService.ts` | tipos e chamadas novas |
| `frontend/src/components/settings/ComissoesConfig.tsx` | 2 campos novos |
| `frontend/src/components/parcerias/ProdutosDaOportunidade.tsx` | preço travado, sem desconto por item, seletor 0/2/4/6 + efeito na comissão |
| `frontend/src/components/parcerias/CalibracoesDaOportunidade.tsx` | blocos por aparelho com previsão |
| `frontend/src/components/parcerias/TabelaDesconto.tsx` | **novo**: quadro "Desconto × sua remuneração" |
| `frontend/src/pages/parcerias/Comissoes.tsx` | quadro em Minhas comissões |
| `CHANGELOG.md`, `ChangelogModal.tsx`, `MainLayout.tsx`, `docs/programa-de-parceiros.md` | versão 1.11.22 e guia |

---

### Task 1: Configuração — % do hunter e anuidade de referência

**Files:**
- Create: `backend/alembic/versions/2026_11_13_1000-0e1f2a3b4c5d_parcerias_comissoes_hunter_anuidade.py`
- Modify: `backend/app/models/partner_commission.py`, `backend/app/schemas/parcerias.py`,
  `backend/app/services/parcerias/comissoes.py` (`_padrao`, `salvar_config`),
  `backend/tests/unit/apoio_parcerias.py` (`config_comissoes`)
- Test: `backend/tests/unit/test_parcerias_comissoes_valores_reais.py`

- [ ] **Step 1: Teste que falha**

Criar `backend/tests/unit/test_parcerias_comissoes_valores_reais.py`:

```python
"""Comissões com os valores reais (spec 2026-11-13): % do hunter, desconto travado, previsão."""
from datetime import datetime
from decimal import Decimal

from app.models.partner_commission import PartnerCommission
from app.models.product import Product

from tests.unit.apoio_parcerias import (
    config_comissoes, headers, hunter, oportunidade, oportunidade_ganha, parceiro, usuario,
)

URL = "/api/v1/parcerias"
OPS = f"{URL}/oportunidades"


def _confirmar(client, op, h):
    r = client.put(f"{OPS}/{op.id}/ganho", json={"acao": "confirmar"}, headers=h)
    assert r.status_code == 200, r.text


def _lancamentos(db, op, **filtros):
    db.expire_all()
    q = db.query(PartnerCommission).filter(PartnerCommission.opportunity_id == op.id)
    for campo, valor in filtros.items():
        q = q.filter(getattr(PartnerCommission, campo) == valor)
    return q.order_by(PartnerCommission.id).all()


def _resumo(lancamentos):
    return sorted((c.beneficiary_partner_id, c.kind, c.amount, c.status) for c in lancamentos)


# ─── 1. Configuração ─────────────────────────────────────────────────────────

def test_config_tem_percentual_do_hunter_e_anuidade(client, db, admin_headers):
    corpo = {"own_sale_pct": 10, "hunter_own_sale_pct": 5, "indication_pct": 1.5,
             "first_sale_bonus": 1000, "indication_months": 24, "calibration_pct": 25,
             "annual_fee_reference": 2500}
    r = client.put(f"{URL}/comissoes/config", json=corpo, headers=admin_headers)
    assert r.status_code == 200, r.text
    lido = client.get(f"{URL}/comissoes/config", headers=admin_headers).json()
    assert Decimal(lido["hunter_own_sale_pct"]) == Decimal("5")
    assert Decimal(lido["annual_fee_reference"]) == Decimal("2500")
    # Sem os campos novos (cliente antigo), os valores salvos ficam como estão.
    sem = {k: v for k, v in corpo.items() if k not in ("hunter_own_sale_pct", "annual_fee_reference")}
    assert client.put(f"{URL}/comissoes/config", json=sem, headers=admin_headers).status_code == 200
    lido = client.get(f"{URL}/comissoes/config", headers=admin_headers).json()
    assert Decimal(lido["hunter_own_sale_pct"]) == Decimal("5")
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `... python -m pytest tests/unit/test_parcerias_comissoes_valores_reais.py -q -p no:cacheprovider --color=no`
Expected: FAIL (`KeyError: 'hunter_own_sale_pct'`).

- [ ] **Step 3: Migration**

```python
"""Parcerias: % de venda própria do hunter e anuidade de referência

Revision ID: 0e1f2a3b4c5d
Revises: 9d0e1f2a3b4c
Create Date: 2026-11-13 10:00:00

- partner_commission_config.hunter_own_sale_pct: venda própria do hunter (a do own_sale_pct
  passa a ser só da empresa).
- partner_commission_config.annual_fee_reference: anuidade usada só na previsão das renovações.
Aditiva: pode rodar antes do código.
"""
from alembic import op
import sqlalchemy as sa


revision = '0e1f2a3b4c5d'
down_revision = '9d0e1f2a3b4c'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('partner_commission_config',
                  sa.Column('hunter_own_sale_pct', sa.Numeric(5, 2), nullable=False, server_default='0'))
    op.add_column('partner_commission_config',
                  sa.Column('annual_fee_reference', sa.Numeric(12, 2), nullable=False, server_default='0'))


def downgrade():
    op.drop_column('partner_commission_config', 'annual_fee_reference')
    op.drop_column('partner_commission_config', 'hunter_own_sale_pct')
```

- [ ] **Step 4: Model**

Em `PartnerCommissionConfig`, depois de `calibration_pct`:

```python
    hunter_own_sale_pct = Column(Numeric(5, 2), nullable=False, default=0)
    annual_fee_reference = Column(Numeric(12, 2), nullable=False, default=0)  # só para a previsão
```

E trocar o comentário/uso de `own_sale_pct` por "venda própria da empresa" onde houver docstring.

- [ ] **Step 5: Schemas**

Em `ComissaoConfigUpdate`, depois de `calibration_pct`:

```python
    # Opcionais: sem eles (tela antiga), os valores gravados ficam como estão.
    hunter_own_sale_pct: Optional[Decimal] = Field(None, ge=0, le=100, decimal_places=2)
    annual_fee_reference: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
```

e incluir `"annual_fee_reference"` no validator de limite:

```python
    @field_validator("first_sale_bonus", "annual_fee_reference")
    @classmethod
    def _bonus_no_limite(cls, v):
        return v if v is None else _valor_no_limite(v)
```

Em `ComissaoConfigResponse`:

```python
    hunter_own_sale_pct: Decimal = Decimal("0")
    annual_fee_reference: Decimal = Decimal("0")
```

- [ ] **Step 6: Service**

`_padrao()`:

```python
    return PartnerCommissionConfig(own_sale_pct=0, hunter_own_sale_pct=0, indication_pct=0,
                                   first_sale_bonus=0, indication_months=MESES_PADRAO,
                                   calibration_pct=0, annual_fee_reference=0)
```

`salvar_config`, depois de `cfg.calibration_pct = dados.calibration_pct`:

```python
    if dados.hunter_own_sale_pct is not None:
        cfg.hunter_own_sale_pct = dados.hunter_own_sale_pct
    if dados.annual_fee_reference is not None:
        cfg.annual_fee_reference = dados.annual_fee_reference
```

(Se a linha nasce no primeiro PUT, garantir que as colunas novas recebem 0 quando vierem `None`:
o `default=0` do model cobre.)

- [ ] **Step 7: Helper dos testes**

`config_comissoes` em `apoio_parcerias.py`:

```python
def config_comissoes(db, y=10, x=5, bonus=100, meses=24, z=8, yh=None, anuidade=0):
    """Cria (ou atualiza) a linha única de configuração das comissões.
    `yh` = venda própria do hunter (padrão: igual a `y`, como antes da 1.11.22)."""
    from app.models.partner_commission import PartnerCommissionConfig

    cfg = db.query(PartnerCommissionConfig).first() or PartnerCommissionConfig()
    cfg.own_sale_pct, cfg.indication_pct, cfg.first_sale_bonus = y, x, bonus
    cfg.indication_months, cfg.calibration_pct = meses, z
    cfg.hunter_own_sale_pct = y if yh is None else yh
    cfg.annual_fee_reference = anuidade
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg
```

- [ ] **Step 8: Rodar e ver passar**

Run: o mesmo do Step 2 + `tests/unit/test_parcerias_comissoes_api.py -k config`. Expected: PASS.

- [ ] **Step 9: Commit (perguntar antes)**

```bash
git add backend/alembic/versions/2026_11_13_1000-0e1f2a3b4c5d_parcerias_comissoes_hunter_anuidade.py backend/app/models/partner_commission.py backend/app/schemas/parcerias.py backend/app/services/parcerias/comissoes.py backend/tests/unit/apoio_parcerias.py backend/tests/unit/test_parcerias_comissoes_valores_reais.py
git commit -m "feat(parcerias): percentual de venda propria do hunter e anuidade de referencia na config"
```

---

### Task 2: Desconto travado na oportunidade

**Files:**
- Modify: `backend/app/services/parcerias/comissoes.py` (constantes), `backend/app/services/parcerias/oportunidades.py`
- Modify: `backend/tests/unit/test_parcerias_produtos.py`
- Test: `backend/tests/unit/test_parcerias_comissoes_valores_reais.py`

- [ ] **Step 1: Testes que falham** (acrescentar ao arquivo novo)

```python
# ─── 2. Desconto travado ─────────────────────────────────────────────────────

MSG_DESCONTO = "Desconto permitido: 0%, 2%, 4% ou 6%."
MSG_TRAVADO = "Preço e desconto por item são travados no Programa de Parceiros."


def _phoebus(db, preco=24500):
    p = Product(name="Phoebus", unit_price=preco, partner_enabled=True)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _op_do_parceiro(db):
    p = parceiro(db)
    op = oportunidade(db, p)
    return op, headers(usuario(db, "partner", "a@dmap.com", p))


def test_desconto_geral_so_0_2_4_6_em_percentual(client, db, admin_headers):
    op, h = _op_do_parceiro(db)
    for d in (2, 4, 6, 0):
        r = client.put(f"{OPS}/{op.id}", json={"global_discount": d, "global_discount_type": "percent"}, headers=h)
        assert r.status_code == 200, r.text
    for corpo in ({"global_discount": 3, "global_discount_type": "percent"},
                  {"global_discount": 100, "global_discount_type": "value"},
                  {"global_discount": 8, "global_discount_type": "percent"}):
        for quem in (h, admin_headers):  # a trava vale também para a H&S
            r = client.put(f"{OPS}/{op.id}", json=corpo, headers=quem)
            assert r.status_code == 422 and r.json()["detail"] == MSG_DESCONTO, r.text
    # Mexer em outro campo não esbarra na trava.
    assert client.put(f"{OPS}/{op.id}", json={"shipping": 30}, headers=h).status_code == 200


def test_produto_entra_com_preco_do_catalogo_e_item_travado(client, db):
    op, h = _op_do_parceiro(db)
    prod = _phoebus(db)
    item = client.post(f"{OPS}/{op.id}/produtos", json={"product_id": prod.id, "unit_price": 100},
                       headers=h).json()
    assert item["unit_price"] == 24500
    for corpo in ({"unit_price": 100}, {"discount": 50}):
        r = client.put(f"{OPS}/{op.id}/produtos/{item['id']}", json=corpo, headers=h)
        assert r.status_code == 422 and r.json()["detail"] == MSG_TRAVADO, r.text
    ok = client.put(f"{OPS}/{op.id}/produtos/{item['id']}",
                    json={"quantity": 2, "unit_price": 24500, "discount": 0}, headers=h)
    assert ok.status_code == 200, ok.text
    assert ok.json()["total"] == 49000
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: FAIL (3% aceito; preço 100 aceito).

- [ ] **Step 3: Constantes em `comissoes.py`** (logo abaixo de `MESES_PADRAO`)

```python
# Desconto da oportunidade de parceria (spec 2026-11-13): só estes percentuais, e cada ponto
# de desconto tira meio ponto da comissão de venda própria de quem vendeu.
DESCONTOS_PERMITIDOS = (0, 2, 4, 6)
REDUCAO_POR_PONTO = Decimal("0.5")
MSG_DESCONTO = "Desconto permitido: 0%, 2%, 4% ou 6%."
```

- [ ] **Step 4: Trava do desconto geral em `oportunidades.py`**

No `atualizar` (bloco que hoje faz `if tipo == "percent" and desconto > 100`), substituir por:

```python
    tipo = campos.get("global_discount_type", op.global_discount_type)
    desconto = Decimal(str(campos.get("global_discount", op.global_discount) or 0))
    if ("global_discount" in campos or "global_discount_type" in campos) and desconto != 0 and (
            tipo != "percent" or desconto not in [Decimal(d) for d in comissoes.DESCONTOS_PERMITIDOS]):
        raise _422(comissoes.MSG_DESCONTO)
```

(`from decimal import Decimal` no topo.) A checagem fica **depois** de `_conferir_sem_ganho_confirmado`,
para o ganho confirmado continuar respondendo "Ganho confirmado: desfaça o ganho…".

- [ ] **Step 5: Preço e desconto por item travados**

Constante no topo de `oportunidades.py`:

```python
MSG_ITEM_TRAVADO = "Preço e desconto por item são travados no Programa de Parceiros."
```

`adicionar_produto`: trocar a linha do `unit_price` por

```python
        unit_price=produto.unit_price,  # preço do catálogo, sempre (spec 2026-11-13 §4)
```

`atualizar_produto`: trocar o laço `for campo, valor in dados.model_dump(...)` por

```python
    campos = dados.model_dump(exclude_unset=True)
    preco, desconto = campos.get("unit_price"), campos.get("discount")
    if (preco is not None and Decimal(str(preco)) != Decimal(str(item.unit_price or 0))) \
            or (desconto is not None and Decimal(str(desconto)) > 0):
        raise _422(MSG_ITEM_TRAVADO)
    if campos.get("quantity") is not None:
        item.quantity = campos["quantity"]
```

(Manter a checagem "desconto maior que o valor da linha" para linhas antigas do homo.)

- [ ] **Step 6: Ajustar `test_parcerias_produtos.py`**

- Apagar `test_desconto_da_linha_nao_passa_do_valor_da_linha` (regra substituída pelo teste novo).
- Reescrever `test_valor_com_desconto_geral_e_frete`:

```python
def test_valor_com_desconto_geral_e_frete(client, db):
    op, h = _cenario(db)
    client.post(f"{URL}/{op.id}/produtos", json={"product_id": _produto(db).id, "quantity": 2}, headers=h)

    pct = client.put(f"{URL}/{op.id}", json={"global_discount": 6, "global_discount_type": "percent",
                                             "shipping": 50}, headers=h).json()
    assert (pct["global_discount"], pct["global_discount_type"], pct["shipping"]) == (6, "percent", 50)
    assert pct["total_value"] == 2000 - 120 + 50
    [no_board] = client.get(URL, headers=h).json()
    assert no_board["total_value"] == 1930
```

- Atualizar a docstring do arquivo ("desconto por linha" → "preço travado, desconto 0/2/4/6").

- [ ] **Step 7: Rodar** `test_parcerias_comissoes_valores_reais.py test_parcerias_produtos.py test_parcerias_revisao.py test_parcerias_comissoes_geracao.py -k "trava or desconto or produto or valor"` → PASS.

- [ ] **Step 8: Commit (perguntar antes)**

```bash
git commit -m "feat(parcerias): preco do catalogo travado e desconto da oportunidade so 0/2/4/6%"
```

---

### Task 3: Cálculo da comissão sobre o preço cheio, com redução pelo desconto

**Files:**
- Modify: `backend/app/services/parcerias/comissoes.py` (`preco_cheio`, `desconto_da_oportunidade`, `taxa_com_desconto`, `gerar`, `_reancorar`)
- Modify: `backend/tests/unit/apoio_parcerias.py` (`oportunidade_ganha(quantidade=)`), `backend/tests/unit/test_parcerias_comissoes_geracao.py`
- Test: `backend/tests/unit/test_parcerias_comissoes_valores_reais.py`

- [ ] **Step 1: Helper `oportunidade_ganha` com quantidade**

```python
def oportunidade_ganha(db, p: Partner, valor_produtos, quantidade: int = 1, **campos) -> PartnerOpportunity:
    """Oportunidade em `ganho` com um item de produto: `quantidade` × `valor_produtos` (preço unitário)."""
    ...
    db.add(PartnerOpportunityProduct(opportunity_id=op.id, product_id=produto.id,
                                     quantity=quantidade, unit_price=valor_produtos))
```

- [ ] **Step 2: Testes que falham**

```python
# ─── 3. Cálculo ──────────────────────────────────────────────────────────────

def _programa(db):
    return config_comissoes(db, y=10, yh=5, x=Decimal("1.5"), bonus=1000, z=25, anuidade=2500)


def test_empresa_comissao_cai_meio_ponto_por_ponto_sobre_preco_cheio(client, db, admin_headers):
    _programa(db)
    a = parceiro(db, "Dmap")
    esperado = {0: ("10.00", "2450.00"), 2: ("9.00", "2205.00"),
                4: ("8.00", "1960.00"), 6: ("7.00", "1715.00")}
    for d, (taxa, valor) in esperado.items():
        op = oportunidade_ganha(db, a, 24500, modality="venda", shipping=300,
                                global_discount=d, global_discount_type="percent")
        _confirmar(client, op, admin_headers)
        [c] = _lancamentos(db, op, kind="venda_propria")
        assert (c.base_value, c.rate, c.amount) == (Decimal("24500.00"), Decimal(taxa), Decimal(valor)), d


def test_hunter_vendendo_usa_o_percentual_dele_com_desconto(client, db, admin_headers):
    _programa(db)
    h, _ = hunter(db)
    op = oportunidade_ganha(db, h, 24500, global_discount=4, global_discount_type="percent")
    _confirmar(client, op, admin_headers)
    assert _resumo(_lancamentos(db, op)) == [(h.id, "venda_propria", Decimal("735.00"), "pendente")]


def test_rede_e_ativacao_do_hunter_ignoram_o_desconto(client, db, admin_headers):
    _programa(db)
    h, _ = hunter(db)
    a = parceiro(db, "Empresa A", indicated_by_partner_id=h.id)
    op = oportunidade_ganha(db, a, 24500, global_discount=6, global_discount_type="percent")
    _confirmar(client, op, admin_headers)
    assert _resumo(_lancamentos(db, op)) == sorted([
        (a.id, "venda_propria", Decimal("1715.00"), "pendente"),
        (h.id, "bonus_primeira_venda", Decimal("1000.00"), "pendente"),
        (h.id, "indicacao", Decimal("367.50"), "pendente"),
    ])


def test_dois_aparelhos_dobram_a_base(client, db, admin_headers):
    _programa(db)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 24500, quantidade=2)
    _confirmar(client, op, admin_headers)
    [c] = _lancamentos(db, op, kind="venda_propria")
    assert (c.base_value, c.amount) == (Decimal("49000.00"), Decimal("4900.00"))
```

- [ ] **Step 3: Rodar e ver falhar** — Expected: FAIL (taxa 10 em todas; hunter com 10%).

- [ ] **Step 4: Funções em `comissoes.py`** (depois de `base_sem_frete`)

```python
def preco_cheio(db: Session, op: PartnerOpportunity) -> Decimal:
    """Σ quantidade × preço dos produtos, sem desconto e sem frete. Base das comissões de venda:
    com o preço travado no catálogo, é o preço cheio do aparelho."""
    total = db.query(func.coalesce(func.sum(
        PartnerOpportunityProduct.quantity * PartnerOpportunityProduct.unit_price), 0,
    )).filter(PartnerOpportunityProduct.opportunity_id == op.id).scalar()
    return _dinheiro(total)


def desconto_da_oportunidade(op: PartnerOpportunity) -> Decimal:
    """% do desconto geral. Desconto antigo em R$ (antes da 1.11.22) não reduz a taxa."""
    if op.global_discount_type != "percent":
        return ZERO
    return Decimal(str(op.global_discount or 0))


def taxa_com_desconto(pct, desconto) -> Decimal:
    """Venda própria: cada ponto de desconto tira meio ponto da taxa; nunca abaixo de zero."""
    taxa = Decimal(str(pct or 0)) - Decimal(str(desconto or 0)) * REDUCAO_POR_PONTO
    return max(ZERO, taxa).quantize(CENTAVO, rounding=ROUND_HALF_UP)
```

Import: `from app.models.partner_opportunity import PartnerOpportunity, PartnerOpportunityProduct`.

- [ ] **Step 5: `gerar`**

```python
    vendedor = _travar_vendedor(db, op.partner_id)
    cfg = _config(db)
    cheio = preco_cheio(db, op)
    pct = cfg.hunter_own_sale_pct if vendedor.kind == "hunter" else cfg.own_sale_pct
    taxa = taxa_com_desconto(pct, desconto_da_oportunidade(op))
    gerados = [_lancar(db, op, "venda_propria", vendedor.id, cheio, agora, rate=taxa)]
```

e trocar `base` por `cheio` nos lançamentos de `bonus_primeira_venda` e `indicacao`.
Atualizar a docstring do módulo: "Base = preço cheio (Σ quantidade × preço), sem desconto e sem
frete. Venda própria: % da empresa ou do hunter − 0,5 ponto por ponto de desconto."

- [ ] **Step 6: `_reancorar`** — trocar `base = base_sem_frete(db, outra)` por `base = preco_cheio(db, outra)`.

- [ ] **Step 7: Ajustar `test_parcerias_comissoes_geracao.py`**

Reescrever `test_base_ignora_frete_e_aplica_desconto_geral`:

```python
def test_base_e_o_preco_cheio_e_o_desconto_reduz_a_taxa(client, db, admin_headers):
    config_comissoes(db, y=10, x=5, bonus=100)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 1000, global_discount=4, global_discount_type="percent", shipping=50)
    assert comissoes.preco_cheio(db, op) == Decimal("1000.00")
    _confirmar(client, op, admin_headers)
    c = _lancamentos(db, op, kind="venda_propria")[0]
    assert (c.base_value, c.rate, c.amount) == (Decimal("1000.00"), Decimal("8.00"), Decimal("80.00"))
```

(`test_base_nunca_negativa` e `test_desconto_percentual_em_decimal` continuam: `base_sem_frete`
segue existindo para o Dashboard.)

- [ ] **Step 8: Rodar** `test_parcerias_comissoes_valores_reais.py test_parcerias_comissoes_geracao.py test_parcerias_comissoes_revisao_final.py test_parcerias_comissoes_api.py test_parcerias_dashboard_hs.py test_parcerias_dashboard_externos.py` → PASS.

- [ ] **Step 9: Commit (perguntar antes)**

```bash
git commit -m "feat(parcerias): comissao de venda sobre o preco cheio com meio ponto a menos por ponto de desconto"
```

---

### Task 4: Tabela "desconto × remuneração" (endpoint)

**Files:**
- Modify: `backend/app/services/parcerias/comissoes.py` (`renovacao_prevista`, `tabela_de_desconto`)
- Modify: `backend/app/schemas/parcerias.py` (`LinhaTabelaDesconto`, `TabelaDescontoResponse`)
- Modify: `backend/app/api/v1/endpoints/parcerias.py`
- Test: `backend/tests/unit/test_parcerias_comissoes_valores_reais.py`

- [ ] **Step 1: Teste que falha**

```python
# ─── 4. Tabela de desconto ───────────────────────────────────────────────────

def test_tabela_de_desconto_para_parceiro_e_hunter(client, db):
    _programa(db)
    _phoebus(db)
    _, h_user = hunter(db)
    a = parceiro(db, "Dmap")
    for quem in (headers(usuario(db, "partner", "a@dmap.com", a)), headers(h_user)):
        r = client.get(f"{URL}/comissoes/tabela-desconto", headers=quem)
        assert r.status_code == 200, r.text
        t = r.json()
        assert Decimal(t["preco_referencia"]) == Decimal("24500")
        assert Decimal(t["renovacao_prevista"]) == Decimal("625")
        linhas = [(l["desconto"], Decimal(l["cliente_paga"]), Decimal(l["taxa_empresa"]),
                   Decimal(l["valor_empresa"]), Decimal(l["taxa_hunter"]), Decimal(l["valor_hunter"]))
                  for l in t["linhas"]]
        assert linhas == [
            (0, Decimal("24500"), Decimal("10"), Decimal("2450"), Decimal("5"), Decimal("1225")),
            (2, Decimal("24010"), Decimal("9"), Decimal("2205"), Decimal("4"), Decimal("980")),
            (4, Decimal("23520"), Decimal("8"), Decimal("1960"), Decimal("3"), Decimal("735")),
            (6, Decimal("23030"), Decimal("7"), Decimal("1715"), Decimal("2"), Decimal("490")),
        ]


def test_tabela_sem_produto_liberado_nem_anuidade(client, db, admin_headers):
    config_comissoes(db, y=10, yh=5)
    t = client.get(f"{URL}/comissoes/tabela-desconto", headers=admin_headers).json()
    assert t["preco_referencia"] is None and t["renovacao_prevista"] is None
    assert [l["valor_empresa"] for l in t["linhas"]] == [None, None, None, None]
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: 404/405.

- [ ] **Step 3: Service**

```python
def renovacao_prevista(cfg: PartnerCommissionConfig) -> Optional[Decimal]:
    """Comissão estimada de uma renovação: Z% da anuidade de referência (None se algum zerado)."""
    anuidade = Decimal(str(cfg.annual_fee_reference or 0))
    taxa = Decimal(str(cfg.calibration_pct or 0))
    if anuidade <= 0 or taxa <= 0:
        return None
    return (anuidade * taxa / 100).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def _pct_de(valor: Optional[Decimal], taxa: Decimal) -> Optional[Decimal]:
    return None if valor is None else (valor * taxa / 100).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def tabela_de_desconto(db: Session) -> dict:
    """Quanto cada faixa de desconto paga, por aparelho, no preço do produto liberado mais caro."""
    cfg = _config(db)
    preco = db.query(func.max(Product.unit_price)).filter(
        Product.is_active.is_(True), Product.is_deleted.is_(False), Product.partner_enabled.is_(True),
    ).scalar()
    preco = _dinheiro(preco) if preco else None
    linhas = []
    for d in DESCONTOS_PERMITIDOS:
        dd = Decimal(d)
        te = taxa_com_desconto(cfg.own_sale_pct, dd)
        th = taxa_com_desconto(cfg.hunter_own_sale_pct, dd)
        linhas.append({
            "desconto": d,
            "cliente_paga": None if preco is None else _pct_de(preco, Decimal(100) - dd),
            "taxa_empresa": te, "valor_empresa": _pct_de(preco, te),
            "taxa_hunter": th, "valor_hunter": _pct_de(preco, th),
        })
    return {"preco_referencia": preco, "linhas": linhas, "renovacao_prevista": renovacao_prevista(cfg)}
```

Import: `from app.models.product import Product`.

- [ ] **Step 4: Schemas**

```python
class LinhaTabelaDesconto(BaseModel):
    desconto: int
    cliente_paga: Optional[Decimal] = None
    taxa_empresa: Decimal
    valor_empresa: Optional[Decimal] = None
    taxa_hunter: Decimal
    valor_hunter: Optional[Decimal] = None


class TabelaDescontoResponse(BaseModel):
    preco_referencia: Optional[Decimal] = None
    linhas: List[LinhaTabelaDesconto]
    renovacao_prevista: Optional[Decimal] = None
```

- [ ] **Step 5: Rota** (logo depois de `PUT /comissoes/config`)

```python
@router.get("/comissoes/tabela-desconto", response_model=TabelaDescontoResponse)
def tabela_de_desconto(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Valores da apresentação comercial: qualquer perfil de Parcerias pode ver."""
    return comissoes.tabela_de_desconto(db)
```

- [ ] **Step 6: Rodar e ver passar.**

- [ ] **Step 7: Commit (perguntar antes)**

```bash
git commit -m "feat(parcerias): endpoint da tabela desconto x remuneracao"
```

---

### Task 5: Previsão das renovações por aparelho e trava de séries

**Files:**
- Modify: `backend/app/services/parcerias/comissoes.py` (`listar_calibracoes`, `lancar_calibracao`, novos helpers)
- Modify: `backend/app/schemas/parcerias.py` (`RenovacaoPrevista`, `AparelhoDaOportunidade`, `CalibracoesDaOportunidadeResponse`)
- Modify: `backend/app/api/v1/endpoints/parcerias.py` (response_model do GET)
- Modify: `backend/tests/unit/test_parcerias_comissoes_api.py`, `backend/tests/unit/test_parcerias_comissoes_revisao_final.py`
- Test: `backend/tests/unit/test_parcerias_comissoes_valores_reais.py`

- [ ] **Step 1: Testes que falham**

```python
# ─── 5. Previsão das renovações ──────────────────────────────────────────────

def _ganho_em(db, op, quando: datetime):
    op.won_confirmed_at = quando
    db.commit()


def test_previsao_de_duas_renovacoes_por_aparelho(client, db, admin_headers):
    _programa(db)
    a = parceiro(db, "Dmap")
    a_user = usuario(db, "partner", "a@dmap.com", a)
    op = oportunidade_ganha(db, a, 24500, quantidade=2)
    _confirmar(client, op, admin_headers)
    _ganho_em(db, op, datetime(2026, 11, 13, 15, 0))  # 12h em São Paulo
    r = client.post(f"{OPS}/{op.id}/calibracoes", headers=admin_headers,
                    json={"serial_number": "SN1", "calibration_date": "2026-11-13", "value": "2500"})
    assert r.status_code == 201, r.text

    t = client.get(f"{OPS}/{op.id}/calibracoes", headers=headers(a_user)).json()
    assert [(ap["numero"], ap["serial_number"]) for ap in t["aparelhos"]] == [(1, "SN1"), (2, None)]
    um, dois = t["aparelhos"]
    assert [(rv["ordem"], rv["prevista_para"]) for rv in um["renovacoes"]] == [(1, "2027-11-13"), (2, "2028-11-13")]
    assert all(Decimal(rv["valor_previsto"]) == Decimal("625") for rv in um["renovacoes"] + dois["renovacoes"])
    assert um["renovacoes"][0]["calibracao"]["commission_status"] == "pendente"
    assert Decimal(um["renovacoes"][0]["calibracao"]["commission_amount"]) == Decimal("625")
    assert um["renovacoes"][1]["calibracao"] is None
    assert t["sem_comissao"] == []


def test_previsao_sem_anuidade_mostra_so_a_data(client, db, admin_headers):
    config_comissoes(db, y=10, z=25, anuidade=0)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 24500)
    _confirmar(client, op, admin_headers)
    t = client.get(f"{OPS}/{op.id}/calibracoes", headers=admin_headers).json()
    assert [rv["valor_previsto"] for rv in t["aparelhos"][0]["renovacoes"]] == [None, None]


def test_venda_do_hunter_e_locacao_nao_tem_previsao(client, db, admin_headers):
    _programa(db)
    h, _ = hunter(db)
    a = parceiro(db, "Dmap")
    for op in (oportunidade_ganha(db, h, 24500), oportunidade_ganha(db, a, 24500, modality="locacao")):
        _confirmar(client, op, admin_headers)
        client.post(f"{OPS}/{op.id}/calibracoes", headers=admin_headers,
                    json={"serial_number": "X", "calibration_date": "2026-11-13", "value": "2500"})
        t = client.get(f"{OPS}/{op.id}/calibracoes", headers=admin_headers).json()
        assert t["aparelhos"] == []
        assert [c["serial_number"] for c in t["sem_comissao"]] == ["X"]


def test_nao_lanca_mais_series_que_aparelhos(client, db, admin_headers):
    _programa(db)
    a = parceiro(db, "Dmap")
    op = oportunidade_ganha(db, a, 24500, quantidade=2)
    _confirmar(client, op, admin_headers)
    corpo = {"calibration_date": "2026-11-13", "value": "2500"}
    for s in ("SN1", "SN2", "SN1"):
        r = client.post(f"{OPS}/{op.id}/calibracoes", json={**corpo, "serial_number": s}, headers=admin_headers)
        assert r.status_code == 201, r.text
    r = client.post(f"{OPS}/{op.id}/calibracoes", json={**corpo, "serial_number": "SN3"}, headers=admin_headers)
    assert r.status_code == 422
    assert r.json()["detail"] == "Esta oportunidade tem 2 aparelho(s); todos já têm número de série."
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: FAIL (resposta é lista; SN3 aceito).

- [ ] **Step 3: Helpers e `listar_calibracoes`** em `comissoes.py`

```python
def total_de_aparelhos(db: Session, op: PartnerOpportunity) -> int:
    """Aparelhos vendidos = soma das quantidades dos produtos da oportunidade."""
    return int(db.query(func.coalesce(func.sum(PartnerOpportunityProduct.quantity), 0)).filter(
        PartnerOpportunityProduct.opportunity_id == op.id).scalar() or 0)


def _dia_do_ganho(op: PartnerOpportunity) -> date:
    return op.won_confirmed_at.replace(tzinfo=timezone.utc).astimezone(FUSO).date()


def _gera_renovacao(op: PartnerOpportunity) -> bool:
    """Só venda (não locação) de empresa, com ganho confirmado, rende renovação."""
    return (op.won_confirmed_at is not None and op.modality != "locacao"
            and op.partner is not None and op.partner.kind == "empresa")


def listar_calibracoes(db: Session, user: User, opportunity_id: int) -> dict:
    """
    Aparelhos vendidos com as 2 renovações previstas (ganho + 12 e + 24 meses) e, em cada uma,
    a calibração lançada (se houver). O aparelho N é a N-ésima série lançada com comissão; as
    calibrações sem comissão (hunter, locação, Z% zerado, cancelada) vão para `sem_comissao`.
    """
    op = _op_para_calibracao(db, user, opportunity_id, escrever=False)
    cals = db.query(PartnerCalibration).filter(PartnerCalibration.opportunity_id == op.id) \
        .order_by(PartnerCalibration.id).all()
    comissoes = {c.calibration_id: c for c in db.query(PartnerCommission).filter(
        PartnerCommission.opportunity_id == op.id, PartnerCommission.kind == "calibracao",
        PartnerCommission.status.in_(ATIVOS)).all()}

    por_serie: dict = {}
    sem_comissao = []
    for c in cals:
        comissao = comissoes.get(c.id)
        if comissao is None:
            sem_comissao.append(_calibracao_out(c, None, None))
            continue
        lista = por_serie.setdefault(c.serial_number, [])
        lista.append(_calibracao_out(c, comissao, len(lista) + 1))

    aparelhos = []
    if _gera_renovacao(op):
        ganho = _dia_do_ganho(op)
        valor = renovacao_prevista(_config(db))
        series = list(por_serie)
        for i in range(max(total_de_aparelhos(db, op), len(series))):
            serie = series[i] if i < len(series) else None
            feitas = por_serie.get(serie, []) if serie else []
            aparelhos.append({"numero": i + 1, "serial_number": serie, "renovacoes": [
                {"ordem": k, "prevista_para": ganho + relativedelta(months=12 * k),
                 "valor_previsto": valor, "calibracao": feitas[k - 1] if k <= len(feitas) else None}
                for k in range(1, LIMITE_CALIBRACOES + 1)
            ]})
    else:
        for lista in por_serie.values():
            sem_comissao.extend(lista)
    return {"aparelhos": aparelhos, "sem_comissao": sorted(sem_comissao, key=lambda c: c["id"])}
```

- [ ] **Step 4: Trava de séries em `lancar_calibracao`** (logo depois da checagem de bloqueado)

```python
    series = {s for (s,) in db.query(PartnerCalibration.serial_number).filter(
        PartnerCalibration.opportunity_id == op.id).distinct()}
    aparelhos = total_de_aparelhos(db, op)
    if aparelhos and dados.serial_number not in series and len(series) >= aparelhos:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"Esta oportunidade tem {aparelhos} aparelho(s); todos já têm número de série.")
```

(Oportunidade sem produto — dado antigo — não trava.)

- [ ] **Step 5: Schemas** (depois de `CalibracaoResponse`)

```python
class RenovacaoPrevista(BaseModel):
    ordem: int
    prevista_para: date
    valor_previsto: Optional[Decimal] = None
    calibracao: Optional[CalibracaoResponse] = None


class AparelhoDaOportunidade(BaseModel):
    numero: int
    serial_number: Optional[str] = None
    renovacoes: List[RenovacaoPrevista]


class CalibracoesDaOportunidadeResponse(BaseModel):
    aparelhos: List[AparelhoDaOportunidade]
    sem_comissao: List[CalibracaoResponse]
```

Rota: `response_model=CalibracoesDaOportunidadeResponse` no `GET .../calibracoes`.

- [ ] **Step 6: Ajustar testes antigos**

`test_parcerias_comissoes_api.py`:
- `test_calibracao_gera_z_para_empresa`: trocar
  `assert lista.status_code == 200 and len(lista.json()) == 1` por
  ```python
  assert lista.status_code == 200
  assert lista.json()["aparelhos"][0]["renovacoes"][0]["calibracao"]["id"] == r.json()["id"]
  ```
- `test_calibracao_limite_de_duas_por_serie`: no `_cenario`, `op_a` tem 1 aparelho; criar a
  oportunidade do teste com 2 aparelhos:
  ```python
  def test_calibracao_limite_de_duas_por_serie(client, db, admin_headers):
      config_comissoes(db, y=10, x=5, bonus=100, z=8)
      a = parceiro(db, "Dmap")
      op_a = oportunidade_ganha(db, a, 1000, quantidade=2, modality="venda")
      _confirmar(client, op_a, admin_headers)
      ... (resto igual)
  ```
- `test_calibracao_mostra_recorrencia_e_situacao_da_comissao`: trocar a leitura da lista por
  ```python
  t = client.get(f"{URL}/oportunidades/{op_a.id}/calibracoes", headers=headers(a_user)).json()
  rv = [x["calibracao"] for x in t["aparelhos"][0]["renovacoes"]]
  assert [(c["recorrencia"], c["commission_status"]) for c in rv] == [(1, "paga"), (2, "pendente")]
  assert rv[0]["commission_paid_at"] is not None and rv[1]["commission_paid_at"] is None
  ```

`test_parcerias_comissoes_revisao_final.py`:
- `test_desfazer_ganho_cancela_calibracao_pendente_e_mantem_paga`: `oportunidade_ganha(db, a, 1000, quantidade=2, modality="venda")`.

- [ ] **Step 7: Rodar** os 4 arquivos de comissão → PASS.

- [ ] **Step 8: Commit (perguntar antes)**

```bash
git commit -m "feat(parcerias): previsao das 2 renovacoes por aparelho e trava de series por aparelhos vendidos"
```

---

### Task 6: Front — tipos, constantes e Configurações

**Files:**
- Modify: `frontend/src/constants/parcerias.ts`, `frontend/src/services/parceriasService.ts`,
  `frontend/src/components/settings/ComissoesConfig.tsx`

- [ ] **Step 1: Constantes**

```ts
/** Descontos aceitos na oportunidade de parceria; igual a DESCONTOS_PERMITIDOS no backend. */
export const DESCONTOS_PERMITIDOS = [0, 2, 4, 6] as const;
```

- [ ] **Step 2: Service**

```ts
export interface ComissaoConfig {
  own_sale_pct: string;
  hunter_own_sale_pct: string;
  indication_pct: string;
  first_sale_bonus: string;
  indication_months: number;
  calibration_pct: string;
  annual_fee_reference: string;
  updated_at?: string | null;
}

export interface ComissaoConfigForm {
  own_sale_pct: number;
  hunter_own_sale_pct: number;
  indication_pct: number;
  first_sale_bonus: number;
  indication_months: number;
  calibration_pct: number;
  annual_fee_reference: number;
}

export interface LinhaTabelaDesconto {
  desconto: number;
  cliente_paga: string | null;
  taxa_empresa: string;
  valor_empresa: string | null;
  taxa_hunter: string;
  valor_hunter: string | null;
}

export interface TabelaDesconto {
  preco_referencia: string | null;
  linhas: LinhaTabelaDesconto[];
  renovacao_prevista: string | null;
}

export interface RenovacaoPrevista {
  ordem: number;
  prevista_para: string;
  valor_previsto: string | null;
  calibracao: Calibracao | null;
}

export interface AparelhoDaOportunidade {
  numero: number;
  serial_number: string | null;
  renovacoes: RenovacaoPrevista[];
}

export interface CalibracoesDaOportunidade {
  aparelhos: AparelhoDaOportunidade[];
  sem_comissao: Calibracao[];
}
```

(Conferir os campos atuais de `ComissaoConfig` antes de substituir; manter os que existirem.)
Métodos:

```ts
  async tabelaDesconto() {
    return (await api.get<TabelaDesconto>(`${BASE}/comissoes/tabela-desconto`)).data;
  },
  async listarCalibracoes(oportunidadeId: number) {
    return (await api.get<CalibracoesDaOportunidade>(`${BASE}/oportunidades/${oportunidadeId}/calibracoes`)).data;
  },
```

- [ ] **Step 3: `ComissoesConfig.tsx`**

`Campos` ganha `hunter` e `anuidade`; `dosCampos` lê `hunter_own_sale_pct` e
`annual_fee_reference`; `pct` aceita `"hunter"`; `valido` inclui `pct("hunter")`; `salvar` manda
`hunter_own_sale_pct: pct("hunter")` e `annual_fee_reference: lerNumero(campos.anuidade)`. Campos
na grade, nesta ordem:

```tsx
{campo("Venda própria da empresa (%)", "own", "Sobre o preço cheio; cai meio ponto a cada ponto de desconto.")}
{campo("Venda própria do hunter (%)", "hunter", "Quando o hunter vende direto; mesma regra de desconto.")}
{campo("Indicação (%)", "ind", "Do hunter sobre as vendas das empresas que ele indicou, sempre no preço cheio.")}
{campo("Bônus de ativação (R$)", "bonus", "Valor fixo, pago uma vez quando a empresa indicada faz a 1ª venda.")}
{campo("Prazo de indicação (meses)", "meses", "Quanto tempo as vendas da empresa indicada rendem comissão.", true)}
{campo("Renovação (%)", "cal", "Sobre o valor pago em cada calibração (as 2 primeiras de cada aparelho).")}
{campo("Anuidade de referência (R$)", "anuidade", "Só para a previsão das renovações; a comissão usa o valor que o cliente pagou.")}
```

- [ ] **Step 4:** `cd frontend && npx tsc --noEmit -p .` — erros esperados só nos componentes das Tasks 7–9 (consumo de `listarCalibracoes`); seguir.

---

### Task 7: Front — produtos da oportunidade com preço e desconto travados

**Files:**
- Modify: `frontend/src/components/parcerias/ProdutosDaOportunidade.tsx`

- [ ] **Step 1: Tirar preço e desconto da edição da linha**

- `edicao` vira `{ quantidade: string }`; `comecarEdicao` só copia a quantidade.
- Na grade da linha: "Preço" sempre em `leituraCls` (sem input); remover a célula "Desconto" e o
  `SeletorDesconto` da linha. A grade vira `grid-cols-3` (Quantidade, Preço, Total da linha).
- `totalLinha` em edição = `qtd * item.unit_price`.
- `salvarEdicao` manda só `{ quantity: quantidade }`.
- Remover `descontoLinhas` e a linha "Desc. produtos" dos totais.

- [ ] **Step 2: Desconto geral vira seletor 0/2/4/6**

- Remover o tipo `TipoDesconto`, o componente `SeletorDesconto` e o estado `tipoGeral`.
- `descontoGeral` vira `number` (0, 2, 4 ou 6), inicializado de
  `op.global_discount_type === "percent" ? op.global_discount : 0`.
- No lugar do input + seletor R$/%:

```tsx
<div className="flex items-center justify-between gap-2 text-sm">
  <span className="text-slate-400">Desconto:</span>
  <div className="flex overflow-hidden rounded border border-gray-300 text-xs dark:border-slate-600">
    {DESCONTOS_PERMITIDOS.map((d) => (
      <button key={d} type="button" disabled={!podeEditar || salvandoGeral} onClick={() => setDescontoGeral(d)}
        className={`px-2.5 py-1 transition-colors ${descontoGeral === d
          ? "bg-blue-500 text-white"
          : "bg-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"}`}>
        {d === 0 ? "Sem" : `${d}%`}
      </button>
    ))}
  </div>
</div>
```

- `descontoGeralValor = Math.round(totalProdutos * descontoGeral) / 100`.
- `mudouGeral` compara `descontoGeral` com o salvo e o frete.
- `salvarGeral` manda `{ global_discount: descontoGeral, global_discount_type: "percent", shipping: freteNum }`
  e perde as validações de "% > 100" e "desconto maior que o total".

- [ ] **Step 3: Efeito na comissão de quem vende**

Carregar a tabela uma vez (`parceriasService.tabelaDesconto()`, erro silencioso) e mostrar,
abaixo do seletor, só para `partner` e `hunter`:

```tsx
{linha && quemGanha && (
  <p className="text-xs text-slate-500 dark:text-slate-400">
    {descontoGeral === 0 ? "Sem desconto" : `Com ${descontoGeral}% de desconto`}, sua comissão é{" "}
    {Number(quemGanha === "hunter" ? linha.taxa_hunter : linha.taxa_empresa).toLocaleString("pt-BR")}%
    {valorPorAparelho != null && `: ${moeda(valorPorAparelho)} por aparelho`}.
  </p>
)}
```

onde `quemGanha = user?.role === "hunter" ? "hunter" : user?.role === "partner" ? "empresa" : null`,
`linha = tabela?.linhas.find((l) => l.desconto === descontoGeral)` e
`valorPorAparelho` = `Number(linha.valor_hunter | valor_empresa)` ou `null`. (`useAuth` de
`../../hooks/useAuth`; `DESCONTOS_PERMITIDOS` de `../../constants/parcerias`.)

- [ ] **Step 4:** `npx tsc --noEmit -p .` sem erros neste arquivo.

---

### Task 8: Front — calibrações com a previsão das renovações

**Files:**
- Modify: `frontend/src/components/parcerias/CalibracoesDaOportunidade.tsx`

- [ ] **Step 1: Estado e carga**

`itens: Calibracao[]` vira `dados: CalibracoesDaOportunidade | null`. Badge da seção = número
de calibrações lançadas (`soma das renovações com calibracao` + `sem_comissao.length`);
`defaultExpanded` quando há aparelho ou calibração.

- [ ] **Step 2: Selo de prazo**

```tsx
const DIA = 86_400_000;
/** Dias até a data prevista (negativo = já passou), contando de hoje à meia-noite. */
function diasAte(iso: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - hoje.getTime()) / DIA);
}

function SeloDoPrazo({ iso }: { iso: string }) {
  const d = diasAte(iso);
  if (d < 0) return <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">vencida há {-d} dia{d === -1 ? "" : "s"}</span>;
  if (d <= 60) return <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">{d === 0 ? "vence hoje" : `faltam ${d} dia${d === 1 ? "" : "s"}`}</span>;
  return null;
}
```

- [ ] **Step 3: Render por aparelho** (substitui `porAparelho` e o mapa atual)

```tsx
{dados && dados.aparelhos.map((ap) => {
  const feitas = ap.renovacoes.filter((rv) => rv.calibracao).length;
  return (
    <div key={ap.numero} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700/50 dark:bg-slate-800/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          Aparelho {ap.numero} ·{" "}
          {ap.serial_number
            ? <span className="font-mono">{ap.serial_number}</span>
            : <span className="font-normal text-slate-500 dark:text-slate-400">nº de série ao lançar</span>}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${feitas >= LIMITE_CALIBRACOES
          ? "bg-gray-500/15 text-gray-600 dark:text-gray-400" : "bg-blue-500/15 text-blue-700 dark:text-blue-400"}`}>
          {feitas} de {LIMITE_CALIBRACOES} renovações
        </span>
      </div>
      <ul className="mt-2 divide-y divide-gray-200 dark:divide-slate-700/50">
        {ap.renovacoes.map((rv) => {
          const c = rv.calibracao;
          return (
            <li key={rv.ordem} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{rv.ordem}ª renovação</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {c
                    ? `Calibrada em ${dataDaCalibracao(c.calibration_date)} · ${formatarMoeda(Number(c.value))}`
                    : `Prevista para ${dataDaCalibracao(rv.prevista_para)}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {c ? (
                  <>
                    {c.commission_amount != null && <span className="text-sm font-medium text-slate-900 dark:text-white">{formatarMoeda(Number(c.commission_amount))}</span>}
                    <SituacaoDaComissao c={c} />
                  </>
                ) : (
                  <>
                    {rv.valor_previsto != null && (
                      <span className="text-sm text-slate-600 dark:text-slate-300">{formatarMoeda(Number(rv.valor_previsto))} <span className="text-xs text-slate-400">(previsão)</span></span>
                    )}
                    <SeloDoPrazo iso={rv.prevista_para} />
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
})}
```

Depois dos aparelhos, se `dados.sem_comissao.length > 0`, um bloco "Calibrações sem comissão"
com a mesma linha de hoje (série, data, valor, "Sem comissão"). Sem aparelho e sem calibração:
"Nenhuma calibração lançada." O texto de ajuda passa a ser:

> Cada aparelho rende comissão nas {LIMITE_CALIBRACOES} primeiras renovações (12 e 24 meses
> após o ganho). A comissão entra como pendente em Comissões → A pagar e fica paga quando o
> Financeiro marcar o pagamento.

- [ ] **Step 4:** `npx tsc --noEmit -p .` sem erros.

---

### Task 9: Front — quadro "Desconto × sua remuneração" em Comissões

**Files:**
- Create: `frontend/src/components/parcerias/TabelaDesconto.tsx`
- Modify: `frontend/src/pages/parcerias/Comissoes.tsx` (`MinhasComissoes`)

- [ ] **Step 1: Componente**

```tsx
import { useEffect, useState } from "react";
import { Percent } from "lucide-react";
import { formatarMoeda } from "../../constants/parcerias";
import { useAuth } from "../../hooks/useAuth";
import parceriasService, { type TabelaDesconto as Tabela } from "../../services/parceriasService";

const TH = "px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300";
const TD = "whitespace-nowrap px-6 py-3 text-sm text-slate-900 dark:text-white";
const pct = (v: string) => `${Number(v).toLocaleString("pt-BR")}%`;

/** Quanto a empresa (ou o hunter) ganha por aparelho em cada faixa de desconto. */
export default function TabelaDesconto() {
  const { user } = useAuth();
  const hunter = user?.role === "hunter";
  const [t, setT] = useState<Tabela | null>(null);

  useEffect(() => {
    parceriasService.tabelaDesconto().then(setT).catch(() => setT(null));
  }, []);

  if (!t || t.linhas.every((l) => Number(hunter ? l.taxa_hunter : l.taxa_empresa) === 0)) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/30">
      <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4 dark:border-slate-700/50">
        <Percent size={18} className="text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Desconto × sua remuneração</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th className={TH}>Desconto</th>
              {t.preco_referencia && <th className={`${TH} !text-right`}>Cliente paga</th>}
              <th className={`${TH} !text-right`}>Sua remuneração</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
            {t.linhas.map((l) => {
              const taxa = hunter ? l.taxa_hunter : l.taxa_empresa;
              const valor = hunter ? l.valor_hunter : l.valor_empresa;
              return (
                <tr key={l.desconto} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className={TD}>{l.desconto === 0 ? "Sem desconto" : `${l.desconto}%`}</td>
                  {t.preco_referencia && <td className={`${TD} text-right`}>{l.cliente_paga ? formatarMoeda(Number(l.cliente_paga)) : "—"}</td>}
                  <td className={`${TD} text-right font-medium`}>
                    {valor ? `${formatarMoeda(Number(valor))} (${pct(taxa)})` : pct(taxa)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-gray-200 px-6 py-3 text-xs text-slate-500 dark:border-slate-700/50 dark:text-slate-400">
        Valores por aparelho. Desconto permitido: até 6%; cada ponto de desconto reduz meio ponto da sua remuneração.
        {!hunter && t.renovacao_prevista && ` As renovações (${formatarMoeda(Number(t.renovacao_prevista))}) não mudam com o desconto.`}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Em `MinhasComissoes`**, logo depois da grade de KpiCards, só para `partner` e `hunter`:

```tsx
{["partner", "hunter"].includes(papel) && <TabelaDesconto />}
```

(`papel` via `useAuth()` dentro de `MinhasComissoes`; conferir se a página já tem o usuário à mão.)

- [ ] **Step 3:** `cd frontend && npx tsc --noEmit -p . && npm run build` → OK.

- [ ] **Step 4: Commit do front (perguntar antes)**

```bash
git add frontend/src
git commit -m "feat(parcerias): telas de comissao com desconto travado, tabela de remuneracao e previsao das renovacoes"
```

---

### Task 10: Versão 1.11.22, guia e suíte

**Files:**
- Modify: `CHANGELOG.md`, `frontend/src/components/common/ChangelogModal.tsx`,
  `frontend/src/layouts/MainLayout.tsx`, `docs/programa-de-parceiros.md`

- [ ] **Step 1: CHANGELOG** — nova seção `## [1.11.22] — dd/mm/aaaa` com Adicionado (tabela de
  desconto, previsão das renovações, % do hunter, anuidade de referência), Alterado (desconto só
  0/2/4/6, preço travado, comissão sobre o preço cheio com meio ponto a menos por ponto, trava
  de séries) e "Banco de dados: migration aditiva `0e1f2a3b4c5d` (pode rodar antes do código)".

- [ ] **Step 2: ChangelogModal** — entrada `1.11.22` com 3–4 itens em linguagem simples.

- [ ] **Step 3: Rodapé** `HSGrowth CRM v1.11.22`.

- [ ] **Step 4: Guia** `docs/programa-de-parceiros.md`: regras de comissão (§3) com os valores e a
  regra do desconto; migrations (§7) com `0e1f2a3b4c5d`; §8: tirar "percentuais e bônus" das
  pendências e anotar as decisões de 13/11 (só o admin cria hunter; hunter já cria o login da
  empresa na indicação; "parada" = 30 dias).

- [ ] **Step 5: Suíte de Parcerias**

Run: `... python -m pytest tests/unit -q -p no:cacheprovider --color=no -k "parcerias or acessos"`
Expected: tudo passando (eram 434 + os novos).

- [ ] **Step 6: Front** `npx tsc --noEmit -p . && npm run build` → OK.

- [ ] **Step 7: Commit (perguntar antes)**

```bash
git commit -m "chore(release): v1.11.22"
```

**Depois do deploy no homo (usuário):** rodar a migration `0e1f2a3b4c5d` no banco do homo;
preencher Configurações → Comissões com 10 / 5 / 1,5 / R$ 1.000 / 24 / 25 / R$ 2.500; deixar
liberado para parceiro só o Phoebus de R$ 24.500.
