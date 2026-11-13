# Trava de CNPJ entre vendedores e regras configuráveis — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** bloquear card de Vendas com CNPJ que outro vendedor está trabalhando (com liberação da gestão por justificativa) e tornar configuráveis os prazos da Consulta de CNPJ.

**Architecture:** um ponto único de leitura das regras (`services/parcerias/regras_cnpj.py`, tabela `cnpj_rules_config`) alimenta o semáforo, o limite de consultas e a trava de Vendas (`services/parcerias/vendas.py`). A trava responde 409 com `detail` em objeto (`code`, `message`, `pode_liberar`); os 4 pedidos de Vendas aceitam `cnpj_justificativa`; no front, um hook único abre a janela da justificativa e repete o pedido.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest (SQLite), React 19 + TS + Tailwind.

Spec: `docs/superpowers/specs/2026-11-13-trava-cnpj-vendedores-regras-configuraveis-design.md`. Versão 1.11.25.

**Comandos:**
- Testes (container local; o banco de teste é SQLite em memória):
  `cd backend && MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest <alvo> -q -p no:cacheprovider --color=no`
- Front: `cd frontend && npx tsc --noEmit -p . && npm run build`
- **Nunca** rodar `alembic upgrade` no container (aponta para a produção).
- Commit só depois de perguntar ao usuário.

---

## Arquivos

| Arquivo | Papel |
|---|---|
| `backend/app/models/cnpj_rules_config.py` (novo) | linha única com os prazos |
| `backend/alembic/versions/2026_11_13_1800-1f2a3b4c5d6e_regras_consulta_cnpj.py` (novo) | cria a tabela e a linha padrão |
| `backend/app/services/parcerias/regras_cnpj.py` (novo) | `Regras`, `PADRAO`, `regras(db)`, `salvar(...)` |
| `backend/app/services/parcerias/semaforo.py` | prazos vêm de `Regras`; `Registro.donos`; `protecao_de_vendas` |
| `backend/app/services/parcerias/consultas.py` | limite diário vem de `Regras` |
| `backend/app/services/parcerias/vendas.py` | trava parceiro + vendedores, 409 em objeto, justificativa |
| `backend/app/schemas/parcerias.py` | `RegrasCnpjResponse`, `RegrasCnpjUpdate` |
| `backend/app/schemas/card.py` | `cnpj_justificativa` em `CardCreate`, `CardUpdate`, `CardReopenRequest`; `CardCloneRequest` |
| `backend/app/repositories/card_repository.py` | não manda `cnpj_justificativa` para o model |
| `backend/app/services/card_service.py` | 4 pontos passam justificativa e card de origem |
| `backend/app/api/v1/endpoints/cards.py` | clone aceita corpo opcional |
| `backend/app/api/v1/endpoints/consulta_cnpj.py` | `GET/PUT /regras`, `/hoje` com db |
| `frontend/src/hooks/useLiberacaoCnpj.tsx` (novo) | janela da justificativa + repetição do pedido |
| `frontend/src/services/cardService.ts` | `clone(id, justificativa?)`, `reopen` com justificativa |
| `frontend/src/pages/KanbanBoard.tsx`, `components/cardDetails/ClientSection.tsx`, `pages/CardDetails.tsx` | usam o hook |
| `frontend/src/components/settings/RegrasCnpjConfig.tsx` (novo) + `pages/Settings.tsx` | aba "Consulta de CNPJ" (admin) |
| `frontend/src/services/parceriasService.ts` | `lerRegrasCnpj`, `salvarRegrasCnpj`, `mensagemDeErro` lê `detail.message` |
| `frontend/src/components/parcerias/RegrasSemaforo.tsx`, `ResultadoSemaforo.tsx` | números da configuração |

---

### Task 1: Tabela, migration e leitura das regras

**Files:**
- Create: `backend/app/models/cnpj_rules_config.py`
- Modify: `backend/app/models/__init__.py` (registrar o model)
- Create: `backend/alembic/versions/2026_11_13_1800-1f2a3b4c5d6e_regras_consulta_cnpj.py`
- Create: `backend/app/services/parcerias/regras_cnpj.py`
- Test: `backend/tests/unit/test_regras_cnpj.py`

- [ ] **Step 1: teste que falha**

```python
"""Regras da Consulta de CNPJ guardadas no banco (uma linha)."""
from app.services.parcerias import regras_cnpj


def test_sem_linha_usa_o_padrao(db):
    r = regras_cnpj.regras(db)
    assert (r.protecao, r.compra, r.perda, r.limite_consultas, r.travar_vendedores) == (10, 30, 90, 20, True)


def test_salvar_cria_a_linha_e_le_de_volta(db, test_admin_user):
    regras_cnpj.salvar(db, test_admin_user, {"protection_days": 5, "block_between_sellers": False})
    r = regras_cnpj.regras(db)
    assert r.protecao == 5 and r.compra == 30 and r.travar_vendedores is False
```

- [ ] **Step 2:** rodar `tests/unit/test_regras_cnpj.py` → falha (módulo não existe).

- [ ] **Step 3: model**

```python
"""Regras da Consulta de CNPJ (Parcerias e Vendas): uma linha só, editada pelo admin."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer

from app.db.base import Base


class CnpjRulesConfig(Base):
    __tablename__ = "cnpj_rules_config"

    id = Column(Integer, primary_key=True, index=True)
    protection_days = Column(Integer, nullable=False, default=10)
    recent_purchase_days = Column(Integer, nullable=False, default=30)
    recent_loss_days = Column(Integer, nullable=False, default=90)
    daily_query_limit = Column(Integer, nullable=False, default=20)
    block_between_sellers = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
```

(Conferir o import de `Base` usado por `partner_commission.py` e usar o mesmo.) Em `models/__init__.py`, ao lado de `PartnerCommissionConfig`:
`from app.models.cnpj_rules_config import CnpjRulesConfig  # noqa`

- [ ] **Step 4: migration** (down = `0e1f2a3b4c5d`)

```python
"""Regras configuráveis da Consulta de CNPJ

Revision ID: 1f2a3b4c5d6e
Revises: 0e1f2a3b4c5d
Create Date: 2026-11-13 18:00:00

Tabela de uma linha com os prazos do semáforo, o limite diário de consultas e a trava
de Vendas entre vendedores. Já nasce com os valores de hoje (10/30/90/20, trava ligada).
Aditiva: pode rodar antes do código.
"""
from alembic import op
import sqlalchemy as sa


revision = '1f2a3b4c5d6e'
down_revision = '0e1f2a3b4c5d'
branch_labels = None
depends_on = None


def upgrade():
    tabela = op.create_table(
        'cnpj_rules_config',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('protection_days', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('recent_purchase_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('recent_loss_days', sa.Integer(), nullable=False, server_default='90'),
        sa.Column('daily_query_limit', sa.Integer(), nullable=False, server_default='20'),
        sa.Column('block_between_sellers', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )
    op.bulk_insert(tabela, [{'id': 1}])


def downgrade():
    op.drop_table('cnpj_rules_config')
```

Nota: `bulk_insert` só com `id` usa os `server_default`. Se o Postgres reclamar da sequence depois, o `salvar` sempre atualiza a linha existente (nunca insere uma 2ª).

- [ ] **Step 5: serviço**

```python
"""
Regras da Consulta de CNPJ num ponto só: semáforo, limite diário e trava de Vendas.
0 dias desliga a regra. Sem linha no banco (testes), valem os padrões.
"""
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.cnpj_rules_config import CnpjRulesConfig
from app.models.user import User


@dataclass(frozen=True)
class Regras:
    protecao: int = 10
    compra: int = 30
    perda: int = 90
    limite_consultas: int = 20
    travar_vendedores: bool = True


PADRAO = Regras()


def _linha(db: Session):
    return db.query(CnpjRulesConfig).order_by(CnpjRulesConfig.id).first()


def regras(db: Session) -> Regras:
    c = _linha(db)
    if c is None:
        return PADRAO
    return Regras(c.protection_days, c.recent_purchase_days, c.recent_loss_days,
                  c.daily_query_limit, bool(c.block_between_sellers))


def linha_ou_padrao(db: Session) -> CnpjRulesConfig:
    """A linha para a tela (sem gravar nada quando falta)."""
    return _linha(db) or CnpjRulesConfig(
        protection_days=PADRAO.protecao, recent_purchase_days=PADRAO.compra,
        recent_loss_days=PADRAO.perda, daily_query_limit=PADRAO.limite_consultas,
        block_between_sellers=PADRAO.travar_vendedores, updated_at=None,
    )


def salvar(db: Session, user: User, campos: dict) -> CnpjRulesConfig:
    c = _linha(db)
    if c is None:
        c = CnpjRulesConfig()
        db.add(c)
    for k, v in campos.items():
        if v is not None:
            setattr(c, k, v)
    c.updated_by_id = user.id
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return c
```

- [ ] **Step 6:** rodar `tests/unit/test_regras_cnpj.py` → PASS.
- [ ] **Step 7:** commit (perguntar) — `feat(parcerias): tabela das regras da consulta de cnpj`.

---

### Task 2: Semáforo e limite lendo as regras

**Files:**
- Modify: `backend/app/services/parcerias/semaforo.py`
- Modify: `backend/app/services/parcerias/consultas.py`
- Modify: `backend/app/api/v1/endpoints/consulta_cnpj.py:36`
- Modify: `backend/tests/unit/test_parcerias_hunter_visibilidade.py:246`
- Test: `backend/tests/unit/test_regras_cnpj.py`

- [ ] **Step 1: testes que falham** (acrescentar)

```python
from datetime import datetime, timedelta

from app.services.parcerias.regras_cnpj import Regras
from app.services.parcerias.semaforo import motivo_do_registro, protegido

AGORA = datetime(2026, 11, 3, 12, 0)


def test_zero_dias_desliga_cada_regra():
    zero = Regras(protecao=0, compra=0, perda=0)
    assert not protegido(AGORA, prazos=[AGORA + timedelta(days=5)], movimentos=[AGORA], dias=0)
    assert motivo_do_registro(AGORA, aberto=False, ganho_em=AGORA - timedelta(days=1), regras=zero) is None
    assert motivo_do_registro(AGORA, aberto=False, perdido_em=AGORA - timedelta(days=1), regras=zero) is None


def test_prazos_configurados_valem():
    r = Regras(protecao=3, compra=5, perda=7)
    assert not protegido(AGORA, prazos=[], movimentos=[AGORA - timedelta(days=4)], dias=r.protecao)
    assert motivo_do_registro(AGORA, aberto=False, ganho_em=AGORA - timedelta(days=4), regras=r)[0] == "compra_recente"
    assert motivo_do_registro(AGORA, aberto=False, ganho_em=AGORA - timedelta(days=6), regras=r) is None


def test_limite_de_consultas_configurado(db, test_admin_user):
    from app.services.parcerias import consultas, regras_cnpj
    from tests.unit.apoio_parcerias import hunter
    _, uh = hunter(db)
    regras_cnpj.salvar(db, test_admin_user, {"daily_query_limit": 3})
    assert consultas.limite_de(db, uh) == 3
```

(Conferir em `apoio_parcerias.hunter` o que ele devolve; o teste de visibilidade usa `r.uh` como o User do hunter.)

- [ ] **Step 2:** rodar → falha (`dias`/`regras` não existem).

- [ ] **Step 3: semaforo.py**

1. Trocar as 3 constantes por import:
```python
from app.services.parcerias.regras_cnpj import PADRAO, Regras, regras as regras_do_banco
```
2. `protegido`:
```python
def protegido(agora: datetime, prazos: Iterable[Optional[datetime]],
              movimentos: Iterable[Optional[datetime]], dias: int = PADRAO.protecao) -> bool:
    """(docstring atual, trocando "10 dias" por "N dias (configuração)"; 0 desliga)"""
    if dias <= 0:
        return False
    limite = agora - timedelta(days=dias)
    ...resto igual
```
3. `motivo_do_registro(..., perdido_em=None, regras: Regras = PADRAO)`: usar `regras.compra` e `regras.perda` no lugar de `DIAS_COMPRA_RECENTE`/`DIAS_PERDA_RECENTE`.
4. `Registro`: acrescentar no fim `donos: Tuple[int, ...] = ()` (responsável e SDR do card).
5. `_cards(db, raiz, agora, regras: Regras)` e `_oportunidades(db, raiz, agora, ignorar=None, regras: Regras = PADRAO)`: passar `dias=regras.protecao` ao `protegido` e `regras=regras` ao `motivo_do_registro`. Em `_cards`, no `Registro(...)`:
   `donos=tuple(i for i in (card.assigned_to_id, card.sdr_id) if i)`.
6. `situacao(db, cnpj, ignorar_oportunidade_id=None, agora=None, regras: Optional[Regras] = None)`: `regras = regras or regras_do_banco(db)` e repassar.
7. `protecao_de_parceiro(db, cnpj, agora=None, regras=None)`: idem.
8. Nova função:
```python
def protecao_de_vendas(db: Session, cnpj: str, user_id: int, ignorar_card_id: Optional[int] = None,
                       agora: Optional[datetime] = None, regras: Optional[Regras] = None) -> List[Registro]:
    """
    Cards de Vendas de OUTRO vendedor que seguram exatamente este CNPJ (negociação,
    compra recente ou perda recente). O card de origem (vincular, reabrir, clonar) não conta.
    """
    agora = agora or datetime.utcnow()
    regras = regras or regras_do_banco(db)
    return sorted(
        (r for r in _cards(db, cnpj[:8], agora, regras)
         if r.cnpj == cnpj and r.id != ignorar_card_id and user_id not in r.donos),
        key=lambda r: r.desde,
    )
```

- [ ] **Step 4: consultas.py**

```python
from app.services.parcerias import acesso, regras_cnpj, semaforo
# remover LIMITE_CONSULTAS_PARCEIRO

def limite_de(db: Session, user: User) -> Optional[int]:
    return regras_cnpj.regras(db).limite_consultas if acesso.eh_parceiro(user) else None
```
Trocar as duas chamadas internas para `limite_de(db, user)`. No endpoint `/hoje`: `limite=consultas.limite_de(db, current_user)`. No teste de visibilidade: `assert consultas.limite_de(db, r.uh) == 20`. Procurar outros usos: `grep -rn "limite_de(\|LIMITE_CONSULTAS" backend/app backend/tests`.

- [ ] **Step 5:** rodar `tests/unit/test_regras_cnpj.py tests/unit/test_parcerias_semaforo.py tests/unit/test_parcerias_consulta*.py tests/unit/test_parcerias_hunter_visibilidade.py` → PASS.
- [ ] **Step 6:** commit (perguntar) — `refactor(parcerias): semaforo e limite leem as regras configuradas`.

---

### Task 3: Rotas das regras (GET para quem consulta, PUT só admin)

**Files:**
- Modify: `backend/app/schemas/parcerias.py`
- Modify: `backend/app/api/v1/endpoints/consulta_cnpj.py`
- Test: `backend/tests/unit/test_regras_cnpj.py`

- [ ] **Step 1: testes que falham**

```python
URL = "/api/v1/parcerias/consulta-cnpj/regras"


def test_get_devolve_padrao(client, admin_headers):
    r = client.get(URL, headers=admin_headers).json()
    assert r["protection_days"] == 10 and r["block_between_sellers"] is True


def test_so_admin_altera(client, db, admin_headers, manager_headers):
    assert client.put(URL, headers=manager_headers, json={"protection_days": 5}).status_code == 403
    r = client.put(URL, headers=admin_headers, json={"protection_days": 5, "daily_query_limit": 30})
    assert r.status_code == 200 and r.json()["protection_days"] == 5 and r.json()["updated_by_name"]


def test_limites_dos_valores(client, admin_headers):
    assert client.put(URL, headers=admin_headers, json={"recent_loss_days": 366}).status_code == 422
    assert client.put(URL, headers=admin_headers, json={"daily_query_limit": 0}).status_code == 422
```

- [ ] **Step 2:** rodar → 404.

- [ ] **Step 3: schemas** (em `schemas/parcerias.py`, perto dos schemas da consulta)

```python
class RegrasCnpjResponse(BaseModel):
    protection_days: int
    recent_purchase_days: int
    recent_loss_days: int
    daily_query_limit: int
    block_between_sellers: bool
    updated_at: Optional[datetime] = None
    updated_by_name: Optional[str] = None


class RegrasCnpjUpdate(BaseModel):
    protection_days: Optional[int] = Field(None, ge=0, le=365)
    recent_purchase_days: Optional[int] = Field(None, ge=0, le=365)
    recent_loss_days: Optional[int] = Field(None, ge=0, le=365)
    daily_query_limit: Optional[int] = Field(None, ge=1, le=1000)
    block_between_sellers: Optional[bool] = None
```

- [ ] **Step 4: rotas** (em `consulta_cnpj.py`)

```python
from fastapi import HTTPException, status
from app.models.user import User as Usuario
from app.schemas.parcerias import RegrasCnpjResponse, RegrasCnpjUpdate
from app.services.parcerias import acesso, regras_cnpj


def _regras_resposta(db: Session) -> RegrasCnpjResponse:
    c = regras_cnpj.linha_ou_padrao(db)
    quem = db.query(Usuario).get(c.updated_by_id) if c.updated_by_id else None
    return RegrasCnpjResponse(
        protection_days=c.protection_days, recent_purchase_days=c.recent_purchase_days,
        recent_loss_days=c.recent_loss_days, daily_query_limit=c.daily_query_limit,
        block_between_sellers=bool(c.block_between_sellers), updated_at=c.updated_at,
        updated_by_name=quem.name if quem else None,
    )


@router.get("/regras", response_model=RegrasCnpjResponse, summary="Regras da consulta (prazos e limite)")
def ler_regras(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return _regras_resposta(db)


@router.put("/regras", response_model=RegrasCnpjResponse, summary="Alterar as regras (só admin)")
def salvar_regras(dados: RegrasCnpjUpdate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_active_user)):
    if acesso.perfil(current_user) != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o admin altera as regras da Consulta de CNPJ.")
    regras_cnpj.salvar(db, current_user, dados.model_dump(exclude_unset=True))
    return _regras_resposta(db)
```

Atenção: a rota `GET /regras` tem que ficar registrada **antes** de qualquer rota com parâmetro de caminho no mesmo router (hoje não há). Conferir se o caminho `/parcerias/consulta-cnpj/regras` passa na tranca dos perfis externos (`caminho_liberado_para_trancado` em `app/api/deps.py`): o parceiro precisa ler as regras para o "Como funciona". Se a liberação for por prefixo `/parcerias/consulta-cnpj`, já passa; senão, incluir.

- [ ] **Step 5:** rodar `tests/unit/test_regras_cnpj.py` → PASS (e um GET com login de hunter → 200, acrescentar ao teste se a tranca exigir mudança).
- [ ] **Step 6:** commit (perguntar) — `feat(parcerias): rotas das regras da consulta de cnpj`.

---

### Task 4: Trava entre vendedores e liberação com justificativa

**Files:**
- Modify: `backend/app/services/parcerias/vendas.py`
- Modify: `backend/app/schemas/card.py`
- Modify: `backend/app/repositories/card_repository.py` (create e update)
- Modify: `backend/app/services/card_service.py` (create ~806, update ~960, reopen ~2617, clone ~2879)
- Modify: `backend/app/api/v1/endpoints/cards.py` (clone)
- Modify: `backend/tests/unit/test_parcerias_vendas_cnpj.py`
- Test: `backend/tests/unit/test_trava_cnpj_vendedores.py`

- [ ] **Step 1: testes novos que falham**

```python
"""Trava de CNPJ entre vendedores em Vendas e liberação pela gestão."""
from datetime import datetime, timedelta

from app.models.activity import Activity
from app.services.parcerias import regras_cnpj

from tests.unit.apoio_parcerias import CNPJ_B, card_de_vendas, cliente, headers, usuario, vendas

CARDS = "/api/v1/cards"


def _novo(v, client_id):
    return {"title": "Empresa A", "list_id": v.lead_novo.id, "client_id": client_id}


def test_outro_vendedor_em_negociacao_bloqueia(client, db):
    v = vendas(db)
    dono = usuario(db, "salesperson", "dono@hs.com")
    card_de_vendas(db, v.lead_novo, assigned_to_id=dono.id)          # criado agora: protegido
    outro = usuario(db, "salesperson", "outro@hs.com")

    r = client.post(CARDS, headers=headers(outro), json=_novo(v, cliente(db).id))

    assert r.status_code == 409
    d = r.json()["detail"]
    assert d["code"] == "cnpj_bloqueado" and d["pode_liberar"] is False
    assert "em negociação" in d["message"] and "Fale com o gerente" in d["message"]


def test_compra_recente_e_perda_recente_bloqueiam(client, db):
    v = vendas(db)
    dono = usuario(db, "salesperson", "dono@hs.com")
    card_de_vendas(db, v.proposta, assigned_to_id=dono.id, is_won=1,
                   closed_at=datetime.utcnow() - timedelta(days=10), criado_ha=60)
    card_de_vendas(db, v.proposta, documento=CNPJ_B, assigned_to_id=dono.id, is_won=-1,
                   closed_at=datetime.utcnow() - timedelta(days=20), criado_ha=60)
    h = headers(usuario(db, "salesperson", "outro@hs.com"))

    assert "compra recente" in client.post(CARDS, headers=h, json=_novo(v, cliente(db).id)).json()["detail"]["message"]
    assert client.post(CARDS, headers=h, json=_novo(v, cliente(db, CNPJ_B).id)).status_code == 409


def test_card_do_proprio_vendedor_nao_bloqueia(client, db):
    v = vendas(db)
    dono = usuario(db, "salesperson", "dono@hs.com")
    sdr = usuario(db, "sdr", "sdr@hs.com")
    card_de_vendas(db, v.lead_novo, assigned_to_id=dono.id, sdr_id=sdr.id)

    assert client.post(CARDS, headers=headers(dono), json=_novo(v, cliente(db).id)).status_code == 201
    assert client.post(CARDS, headers=headers(sdr), json=_novo(v, cliente(db).id)).status_code == 201


def test_integracao_passa(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=usuario(db, "salesperson", "dono@hs.com").id)
    integ = usuario(db, "manager", "integ@hs.com")
    integ.is_integracao = True
    db.commit()

    assert client.post(CARDS, headers=headers(integ), json=_novo(v, cliente(db).id)).status_code == 201


def test_trava_desligada_nao_bloqueia(client, db, test_admin_user):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=usuario(db, "salesperson", "dono@hs.com").id)
    regras_cnpj.salvar(db, test_admin_user, {"block_between_sellers": False})
    outro = usuario(db, "salesperson", "outro@hs.com")

    assert client.post(CARDS, headers=headers(outro), json=_novo(v, cliente(db).id)).status_code == 201


def test_gestao_libera_com_justificativa(client, db, admin_headers):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=usuario(db, "salesperson", "dono@hs.com").id)

    sem = client.post(CARDS, headers=admin_headers, json=_novo(v, cliente(db).id))
    assert sem.status_code == 409 and sem.json()["detail"]["pode_liberar"] is True

    com = client.post(CARDS, headers=admin_headers,
                      json={**_novo(v, cliente(db).id), "cnpj_justificativa": "Cliente pediu outro vendedor"})
    assert com.status_code == 201
    [a] = db.query(Activity).filter(Activity.card_id == com.json()["id"],
                                    Activity.activity_type == "parcerias_cnpj").all()
    assert "Cliente pediu outro vendedor" in a.description


def test_vendedor_com_justificativa_continua_bloqueado(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=usuario(db, "salesperson", "dono@hs.com").id)
    outro = usuario(db, "salesperson", "outro@hs.com")

    r = client.post(CARDS, headers=headers(outro), json={**_novo(v, cliente(db).id), "cnpj_justificativa": "x"})
    assert r.status_code == 409


def test_reabrir_e_clonar_ignoram_o_card_de_origem(client, db):
    v = vendas(db)
    sdr = usuario(db, "sdr", "sdr@hs.com")
    dono = usuario(db, "salesperson", "dono@hs.com")
    perdido = card_de_vendas(db, v.proposta, assigned_to_id=dono.id, is_won=-1,
                             closed_at=datetime.utcnow() - timedelta(days=20), criado_ha=60)
    h = headers(sdr)

    r = client.post(f"{CARDS}/{perdido.id}/reopen", headers=h,
                    json={"title": "Volta", "acquisition_channel_detail": "Base - Resgate"})
    assert r.status_code in (200, 201), r.text


def test_vincular_empresa_de_outro_vendedor_bloqueia(client, db):
    from app.models.card import Card
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, assigned_to_id=usuario(db, "salesperson", "dono@hs.com").id)
    outro = usuario(db, "salesperson", "outro@hs.com")
    meu = Card(title="Sem cliente", list_id=v.lead_novo.id, assigned_to_id=outro.id)
    db.add(meu)
    db.commit()

    assert client.put(f"{CARDS}/{meu.id}", headers=headers(outro), json={"client_id": cliente(db).id}).status_code == 409
```

Observação para o teste de reabrir: o card reaberto vai para a lista fixa 22 (`TARGET_LIST_ID`). Se o `vendas(db)` não cria a lista 22, olhar como `test_parcerias_vendas_cnpj.py::test_clonar_e_reabrir_bloqueiam` e os testes de RN-036 montam o cenário e copiar; o que importa é que **não** volte 409 por causa do próprio card perdido. Se o fluxo falhar por outra razão (404 da lista), ajustar o cenário, não a regra.

- [ ] **Step 2:** rodar `tests/unit/test_trava_cnpj_vendedores.py` → falha.

- [ ] **Step 3: schemas de card** (`schemas/card.py`)

Em `CardCreate`, `CardUpdate` e `CardReopenRequest`:
```python
    cnpj_justificativa: Optional[str] = Field(
        None, max_length=500,
        description="Admin/gerente: justificativa para criar com CNPJ que está com outro vendedor ou parceiro",
    )
```
Novo:
```python
class CardCloneRequest(BaseModel):
    cnpj_justificativa: Optional[str] = Field(None, max_length=500)
```

- [ ] **Step 4: repository** — em `card_repository.create` e `update`, logo depois do `model_dump(exclude_unset=True)`:
```python
        data_dict.pop("cnpj_justificativa", None)   # só serve à trava de CNPJ
```
(no update, a variável chama `update_data`).

- [ ] **Step 5: vendas.py** — reescrever `conferir` (e manter `avisos`/`registrar`):

```python
from app.services.parcerias import acesso, regras_cnpj, semaforo
from app.services.parcerias.semaforo import MOTIVOS


def _com_quem(db: Session, user: User, cnpj: str, ignorar_card_id: Optional[int]) -> Optional[str]:
    """Com quem o CNPJ está (texto), ou None se está livre para este usuário."""
    r = regras_cnpj.regras(db)
    parceiros = sorted(semaforo.protecao_de_parceiro(db, cnpj, regras=r), key=lambda x: x.desde)
    if parceiros:
        p = parceiros[0]
        return f"com o parceiro {p.parceiro} (Programa de Parceiros) desde {p.desde:%d/%m/%Y}"
    if not r.travar_vendedores:
        return None
    cards = semaforo.protecao_de_vendas(db, cnpj, user.id, ignorar_card_id, regras=r)
    if not cards:
        return None
    c = cards[0]
    texto = f'com {c.responsavel or "outro vendedor"} no card "{c.titulo}" ({c.onde}): {MOTIVOS[c.motivo].lower()}'
    if c.libera_em:
        texto += f", libera em {c.libera_em:%d/%m/%Y}"
    return texto


def conferir(db: Session, user: User, client_id: Optional[int], justificativa: Optional[str] = None,
             ignorar_card_id: Optional[int] = None) -> Optional[str]:
    """
    None quando o CNPJ está livre (ou quem cria é integração). Admin e gerente com
    justificativa passam e recebem o texto a registrar no card; os demais (e a gestão
    sem justificativa) recebem 409 com {code, message, pode_liberar}.
    """
    if getattr(user, "is_integracao", False):
        return None
    cnpj = _cnpj_do_cliente(db, client_id)
    if not cnpj:
        return None
    com_quem = _com_quem(db, user, cnpj, ignorar_card_id)
    if not com_quem:
        return None
    gestao = acesso.eh_gestao(user)
    motivo = (justificativa or "").strip()
    if gestao and motivo:
        return f"CNPJ liberado por {user.name}: {motivo} (estava {com_quem})"
    raise HTTPException(status.HTTP_409_CONFLICT, {
        "code": "cnpj_bloqueado",
        "message": f"Este CNPJ está {com_quem}. Fale com o gerente." if not gestao
                   else f"Este CNPJ está {com_quem}. Para criar mesmo assim, escreva a justificativa.",
        "pode_liberar": gestao,
    })
```

- [ ] **Step 6: card_service.py** (4 pontos)

- create (~806): `parcerias_vendas.conferir(self.db, current_user, card_data.client_id, card_data.cnpj_justificativa)`
- update (~960): `parcerias_vendas.conferir(self.db, current_user, card_data.client_id, card_data.cnpj_justificativa, ignorar_card_id=card.id)`
- reopen (~2617): `parcerias_vendas.conferir(self.db, current_user, original_card.client_id, getattr(reopen_data, "cnpj_justificativa", None), ignorar_card_id=original_card.id)`
- clone (~2879): assinatura `clone_card(self, card_id, current_user, cnpj_justificativa: Optional[str] = None)` e `parcerias_vendas.conferir(self.db, current_user, original_card.client_id, cnpj_justificativa, ignorar_card_id=original_card.id)`

Atualizar os comentários "CNPJ com um parceiro..." para "CNPJ com parceiro ou com outro vendedor: bloqueia; a gestão libera com justificativa."

- [ ] **Step 7: endpoint de clone** (`cards.py` ~808): acrescentar `dados: Optional[CardCloneRequest] = Body(None)` e chamar `service.clone_card(card_id, current_user, dados.cnpj_justificativa if dados else None)`. Importar `Body` e `CardCloneRequest`.

- [ ] **Step 8: ajustar `test_parcerias_vendas_cnpj.py`**
  - `test_vendedor_nao_cria_card_com_cnpj_do_parceiro`: `d = r.json()["detail"]["message"]`; asserts em `d`.
  - `test_admin_passa_e_fica_registrado` → `test_admin_libera_com_justificativa_e_fica_registrado`: primeiro POST sem justificativa → 409 com `pode_liberar`; segundo com `"cnpj_justificativa": "Parceiro desistiu"` → 201 e a atividade contém "parceiro Dmap" e "Parceiro desistiu".
  - `test_clonar_e_reabrir_bloqueiam`: continua 409 (o parceiro bloqueia; o card de origem não conta, mas o parceiro sim).

- [ ] **Step 9:** rodar `tests/unit/test_trava_cnpj_vendedores.py tests/unit/test_parcerias_vendas_cnpj.py` → PASS. Depois rodar os testes de cards (`-k "card"`) para pegar card de teste que agora cai na trava; se algum quebrar porque dois vendedores usam o mesmo cliente sem querer, ajustar o cenário do teste (outro CNPJ ou mesmo dono), não a regra.
- [ ] **Step 10:** commit (perguntar) — `feat(vendas): trava de cnpj entre vendedores e liberacao com justificativa`.

---

### Task 5: Front — janela da justificativa nos 4 pontos

**Files:**
- Create: `frontend/src/hooks/useLiberacaoCnpj.tsx`
- Modify: `frontend/src/services/cardService.ts` (`clone`, `reopen`)
- Modify: `frontend/src/services/parceriasService.ts` (`mensagemDeErro`)
- Modify: `frontend/src/pages/KanbanBoard.tsx` (~1062)
- Modify: `frontend/src/components/cardDetails/ClientSection.tsx` (handleLinkClient, handleClientCreated)
- Modify: `frontend/src/pages/CardDetails.tsx` (clone ~333, reopen ~368)

- [ ] **Step 1: hook**

```tsx
import { useRef, useState } from "react";
import { BaseModal, Button, FormField, Textarea } from "../components/common";
import { showError } from "../utils/toast";

/**
 * Trava de CNPJ em Vendas (parceiro ou outro vendedor). O backend responde 409 com
 * detail {code: "cnpj_bloqueado", message, pode_liberar}. Para admin/gerente, abre a
 * janela da justificativa e repete o pedido com ela; para os demais, mostra a mensagem.
 *
 * Uso: const { comLiberacao, janela } = useLiberacaoCnpj();
 *      await comLiberacao((justificativa) => cardService.create({ ...dados, cnpj_justificativa: justificativa }));
 *      ... e renderizar {janela} no JSX.
 * Devolve o resultado do pedido, ou null quando o usuário cancelou ou não pode liberar.
 */
type Bloqueio = { code: string; message: string; pode_liberar: boolean };

export const bloqueioDeCnpj = (err: any): Bloqueio | null => {
  const d = err?.response?.status === 409 ? err?.response?.data?.detail : null;
  return d && typeof d === "object" && d.code === "cnpj_bloqueado" ? (d as Bloqueio) : null;
};

export function useLiberacaoCnpj() {
  const [aberta, setAberta] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const resolver = useRef<(v: string | null) => void>();

  const pedirJustificativa = (mensagem: string) =>
    new Promise<string | null>((resolve) => {
      resolver.current = resolve;
      setTexto("");
      setAberta(mensagem);
    });

  const fechar = (v: string | null) => {
    setAberta(null);
    resolver.current?.(v);
  };

  async function comLiberacao<T>(pedido: (justificativa?: string) => Promise<T>): Promise<T | null> {
    try {
      return await pedido();
    } catch (err) {
      const b = bloqueioDeCnpj(err);
      if (!b) throw err;
      if (!b.pode_liberar) {
        showError(b.message);
        return null;
      }
      const justificativa = await pedirJustificativa(b.message);
      if (!justificativa) return null;
      return await pedido(justificativa);
    }
  }

  const janela = (
    <BaseModal
      isOpen={aberta !== null}
      onClose={() => fechar(null)}
      title="CNPJ com outro responsável"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => fechar(null)}>Cancelar</Button>
          <Button onClick={() => fechar(texto.trim())} disabled={!texto.trim()}>Liberar e continuar</Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">{aberta}</p>
      <FormField label="Justificativa" required hint={`${texto.length}/500`}>
        <Textarea value={texto} maxLength={500} rows={3} onChange={(e) => setTexto(e.target.value)}
          placeholder="Por que este card pode ser criado mesmo assim" />
      </FormField>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Fica registrada no histórico do card.</p>
    </BaseModal>
  );

  return { comLiberacao, janela };
}
```

(Conferir os props de `BaseModal`/`Textarea`/`FormField` em `components/common` — os mesmos usados em `NovaOportunidadeModal.tsx`.)

- [ ] **Step 2: cardService**

```ts
  async clone(id: number, cnpj_justificativa?: string) {
    const response = await api.post(`/api/v1/cards/${id}/clone`, cnpj_justificativa ? { cnpj_justificativa } : undefined);
    return response.data;
  },
  async reopen(id: number, data: { title: string; acquisition_channel_detail: string; cnpj_justificativa?: string }) { ... }
```
Manter os tipos de retorno atuais. No tipo do payload de `create`/`update`, acrescentar `cnpj_justificativa?: string` se os tipos forem fechados.

- [ ] **Step 3: mensagemDeErro** (parceriasService.ts) — antes do `return padrao`:
```ts
  if (detail && typeof detail === "object" && typeof detail.message === "string") return detail.message;
```

- [ ] **Step 4: KanbanBoard** — `const { comLiberacao, janela: janelaCnpj } = useLiberacaoCnpj();` no componente; no salvar:
```ts
      const feito = editingCard
        ? await comLiberacao((j) => cardService.update(editingCard.id, { ...cardData, cnpj_justificativa: j }))
        : await comLiberacao((j) => cardService.create({ ...cardData, cnpj_justificativa: j }));
      if (feito === null) return;
```
e renderizar `{janelaCnpj}` no JSX (perto dos outros modais). No `catch`, além do `typeof detail === "string"`, usar `detail?.message` quando objeto.

- [ ] **Step 5: ClientSection** — mesmo hook; `handleLinkClient`:
```ts
      const feito = await comLiberacao((j) => cardService.update(card.id, { client_id: clientId, cnpj_justificativa: j }));
      if (feito === null) return;
```
idem em `handleClientCreated`; renderizar `{janela}`.

- [ ] **Step 6: CardDetails** — clone: `const result = await comLiberacao((j) => cardService.clone(card.id, j)); if (!result) return;`; reopen: `comLiberacao((j) => cardService.reopen(card.id, { title, acquisition_channel_detail: acquisitionChannelDetail, cnpj_justificativa: j }))`; renderizar `{janela}`. Nos `catch`, mostrar `detail?.message` quando objeto.

- [ ] **Step 7:** `npx tsc --noEmit -p .` e `npm run build` → OK.
- [ ] **Step 8:** commit (perguntar) — `feat(vendas): janela de justificativa para liberar cnpj bloqueado`.

---

### Task 6: Front — aba "Consulta de CNPJ" e textos com os números

**Files:**
- Create: `frontend/src/components/settings/RegrasCnpjConfig.tsx`
- Modify: `frontend/src/pages/Settings.tsx` (Tab, tabs.push, render)
- Modify: `frontend/src/services/parceriasService.ts` (tipo + 2 métodos)
- Modify: `frontend/src/components/parcerias/RegrasSemaforo.tsx`, `ResultadoSemaforo.tsx`

- [ ] **Step 1: serviço**

```ts
export type RegrasCnpj = {
  protection_days: number; recent_purchase_days: number; recent_loss_days: number;
  daily_query_limit: number; block_between_sellers: boolean;
  updated_at?: string | null; updated_by_name?: string | null;
};
// no objeto parceriasService:
  async lerRegrasCnpj() {
    return (await api.get<RegrasCnpj>(`${BASE}/consulta-cnpj/regras`)).data;
  },
  async salvarRegrasCnpj(dados: Partial<RegrasCnpj>) {
    return (await api.put<RegrasCnpj>(`${BASE}/consulta-cnpj/regras`, dados)).data;
  },
```

- [ ] **Step 2: RegrasCnpjConfig.tsx** — mesmo desenho do `ComissoesConfig.tsx` (título, `Alert` info, grade de campos, botão "Salvar Alterações"):
  - 4 inteiros: "Proteção da negociação (dias)" (dica: "Card ou oportunidade aberto, com atividade ou movimento nesse prazo, bloqueia. 0 desliga."), "Compra recente (dias)", "Perda recente (dias)", "Consultas por dia (parceiro e hunter)".
  - 1 checkbox: "Travar card de Vendas entre vendedores" (dica: "Vendedor não cria card com CNPJ que outro vendedor está trabalhando; admin e gerente liberam com justificativa.").
  - Valida: dias 0–365, consultas 1–1000.
  - Rodapé: "Alterado por {updated_by_name} em {dd/mm/aaaa}" quando houver.

- [ ] **Step 3: Settings.tsx** — `Tab` ganha `"regras_cnpj"`; `if (user?.role === "admin") tabs.push({ id: "regras_cnpj" as Tab, label: "Consulta de CNPJ", icon: SearchCheck })` (lucide; se não existir, `Search`); render `{abaVisivel === "regras_cnpj" && <RegrasCnpjConfig />}`.

- [ ] **Step 4: RegrasSemaforo.tsx** — `RegrasSemaforo` recebe `regras: RegrasCnpj | null` (com fallback 10/30/90/20) e troca os números fixos por `regras.*`; regra com 0 dias aparece como "desligada". Acrescentar um parágrafo: "Em Vendas, o vendedor também não cria card com CNPJ que outro vendedor está trabalhando (mesmas regras); admin e gerente liberam com justificativa." (só quando `block_between_sellers`). `BotaoRegrasSemaforo` carrega `lerRegrasCnpj()` ao abrir (uma vez) e passa adiante.

- [ ] **Step 5: ResultadoSemaforo.tsx** — `porque()` recebe os dias: buscar `lerRegrasCnpj()` uma vez no componente (estado) e usar `regras?.protection_days ?? 10` etc. nos textos de `em_negociacao`, `compra_recente`, `perdida_recente`.

- [ ] **Step 6:** `npx tsc --noEmit -p .` e `npm run build` → OK.
- [ ] **Step 7:** commit (perguntar) — `feat(parcerias): aba de regras da consulta de cnpj nas configuracoes`.

---

### Task 7: Fechamento

- [ ] **Step 1:** suíte de Parcerias e cards: `-k "parcerias or acessos or card or regras or trava"` → tudo passando.
- [ ] **Step 2:** CHANGELOG em "Não lançado" → depois `## [1.11.25] — dd/mm/aaaa`, com "### Banco de dados — Migration aditiva `1f2a3b4c5d6e` (pode rodar antes do código)". Versão nos 3 lugares (CHANGELOG, `ChangelogModal.tsx`, rodapé do `MainLayout.tsx`).
- [ ] **Step 3:** `alembic heads` no container deve mostrar só `1f2a3b4c5d6e` (não rodar `upgrade`).
- [ ] **Step 4:** commit (perguntar) — `chore(release): v1.11.25`.
