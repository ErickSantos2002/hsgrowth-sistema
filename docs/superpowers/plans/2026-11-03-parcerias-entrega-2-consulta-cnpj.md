# Parcerias Entrega 2 — Consulta de CNPJ (semáforo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Semáforo de CNPJ que cruza Vendas e as oportunidades dos parceiros. Ele bloqueia o cadastro no vermelho (a gestão libera com justificativa), tem página própria com limite diário e histórico, e no lado de Vendas mostra faixa e bloqueia o card.

**Architecture:**
- O motor fica em `app/services/parcerias/semaforo.py`:
  - funções puras para a proteção por atividade e para juntar os registros em uma resposta;
  - consultas por CNPJ e pela raiz de 8 dígitos, sem tabela espelho.
- O limite e o histórico ficam em `consultas.py`, com router próprio em `/parcerias/consulta-cnpj`, que passa pela tranca.
- O lado de Vendas fica em `parcerias/vendas.py`, chamado por `CardService` nos 4 pontos (criar, vincular cliente, clonar, reabrir) e por uma rota de aviso para a faixa.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic e pytest (SQLite em memória nos testes); React, TypeScript, Vite e Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-03-parcerias-entrega-2-consulta-cnpj-design.md`

**Comandos:**
- Testes: `cd backend && MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest <alvo> -q -p no:cacheprovider --color=no`
- Front: `cd frontend && npx tsc --noEmit -p . && npm run build`

**Regras do projeto:**
- Commit só com o ok do usuário. Os passos de commit dizem "pedir ok".
- **Não rodar `alembic upgrade` no container local**, porque ele aponta para o banco de produção. A migration roda no homo, pelo usuário.
- A versão é a **1.11.5**, que já existe nos 3 lugares; só se acrescentam entradas.

---

## Mapa de arquivos

| Arquivo | O quê |
|---|---|
| `backend/alembic/versions/2026_11_03_1000-3d4e5f6a7b8c_parcerias_consulta_cnpj.py` (novo) | Tabela `cnpj_consultas` e 4 colunas em `partner_opportunities` |
| `backend/app/models/cnpj_consulta.py` (novo) | Modelo `CnpjConsulta` |
| `backend/app/models/__init__.py` | Registra o modelo |
| `backend/app/models/partner_opportunity.py` | 4 colunas novas |
| `backend/app/services/parcerias/semaforo.py` (novo) | Proteção, registros, `situacao`, `protecao_de_parceiro` |
| `backend/app/services/parcerias/consultas.py` (novo) | Limite, gravação, histórico, resposta por perfil |
| `backend/app/services/parcerias/vendas.py` (novo) | Bloqueio e aviso do lado de Vendas |
| `backend/app/schemas/parcerias.py` | Schemas da consulta, justificativa e campos novos da oportunidade |
| `backend/app/api/deps.py` | `require_consulta_cnpj` |
| `backend/app/api/v1/endpoints/consulta_cnpj.py` (novo) | Rotas da consulta |
| `backend/app/api/v1/__init__.py` | Registra o router |
| `backend/app/services/parcerias/oportunidades.py` | Semáforo no criar e na troca de CNPJ |
| `backend/app/services/parcerias/respostas.py` e `backend/app/api/v1/endpoints/parcerias.py` | Campos novos e ocultação para o parceiro |
| `backend/app/services/card_service.py` | Hooks nos 4 pontos |
| `backend/app/api/v1/endpoints/cards.py` | `GET /cards/{id}/aviso-parcerias` |
| `backend/tests/unit/apoio_parcerias.py` | Ajudantes de Vendas (board, cliente, card) |
| `backend/tests/unit/test_parcerias_semaforo.py` (novo) | Proteção e semáforo |
| `backend/tests/unit/test_parcerias_consulta.py` (novo) | Rotas, limite e histórico |
| `backend/tests/unit/test_parcerias_vendas_cnpj.py` (novo) | Bloqueio e faixa em Vendas |
| `backend/tests/unit/test_parcerias_oportunidades.py` | Cadastro com semáforo |
| `frontend/src/services/parceriasService.ts` | Tipos e chamadas |
| `frontend/src/constants/parcerias.ts` | `PERFIS_CONSULTA_CNPJ` e cores do semáforo |
| `frontend/src/components/parcerias/ResultadoSemaforo.tsx` (novo) | Cartão do resultado |
| `frontend/src/pages/parcerias/ConsultaCnpj.tsx` (novo) | Página |
| `frontend/src/router.tsx` e `frontend/src/layouts/MainLayout.tsx` | Rota, guarda e menu |
| `frontend/src/components/parcerias/NovaOportunidadeModal.tsx` | Passo 1 (CNPJ) e passo 2 (formulário) |
| `frontend/src/pages/parcerias/OportunidadeDetalhe.tsx` | Selo do semáforo |
| `frontend/src/components/cardDetails/AvisoParcerias.tsx` (novo) e `frontend/src/pages/CardDetails.tsx` | Faixa |
| `frontend/src/pages/KanbanBoard.tsx`, `frontend/src/components/cardDetails/ClientSection.tsx` | Mostrar a mensagem do backend no erro |
| `CHANGELOG.md`, `frontend/src/components/common/ChangelogModal.tsx` | Entradas na 1.11.5 |

---

### Task 1: Migration e modelos

**Files:**
- Create: `backend/alembic/versions/2026_11_03_1000-3d4e5f6a7b8c_parcerias_consulta_cnpj.py`
- Create: `backend/app/models/cnpj_consulta.py`
- Modify: `backend/app/models/__init__.py` (depois da linha 104)
- Modify: `backend/app/models/partner_opportunity.py` (depois de `created_by_id`)
- Test: `backend/tests/unit/test_parcerias_modelos.py`

- [ ] **Step 0: Confirmar com o usuário a criação da migration** (regra do projeto). Só seguir com o ok.

- [ ] **Step 1: Teste do modelo**

Acrescentar em `backend/tests/unit/test_parcerias_modelos.py`:

```python
def test_consulta_de_cnpj_e_campos_do_semaforo(db):
    from app.models.cnpj_consulta import CnpjConsulta

    p = parceiro(db)
    u = usuario(db, "partner", "a@dmap.com", p)
    db.add(CnpjConsulta(user_id=u.id, partner_id=p.id, cnpj=CNPJ_A, resultado="verde", motivo="livre"))
    op = oportunidade(db, p, cnpj_resultado="amarelo", cnpj_motivo="outra_unidade")
    db.commit()

    assert db.query(CnpjConsulta).one().created_at is not None
    assert op.cnpj_resultado == "amarelo"
    assert op.cnpj_justificativa is None
```

Conferir que o arquivo importa `CNPJ_A`, `oportunidade`, `parceiro` e `usuario` de `tests.unit.apoio_parcerias`; acrescentar o que faltar.

- [ ] **Step 2: Rodar e ver falhar**

Run: `... pytest tests/unit/test_parcerias_modelos.py -q ...`
Expected: FAIL com `ModuleNotFoundError: app.models.cnpj_consulta`.

- [ ] **Step 3: Modelo `CnpjConsulta`**

`backend/app/models/cnpj_consulta.py`:

```python
"""
Histórico da Consulta de CNPJ (Parcerias, Entrega 2).

Cada consulta feita pela página ou pelo passo 1 do cadastro vira uma linha:
quem consultou, de qual parceiro (nulo para a H&S), o CNPJ e a cor. Serve
para o limite diário do parceiro e para admin/gerente verem quem consulta.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class CnpjConsulta(Base):
    __tablename__ = "cnpj_consultas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="SET NULL"), nullable=True, index=True)
    cnpj = Column(String(14), nullable=False, index=True)
    # verde | amarelo | vermelho
    resultado = Column(String(10), nullable=False)
    # livre | em_negociacao | compra_recente | perdida_recente | outra_unidade
    motivo = Column(String(30), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User")
    partner = relationship("Partner")
```

Em `backend/app/models/__init__.py`, depois da linha do `PartnerActivity`:

```python
from app.models.cnpj_consulta import CnpjConsulta  # noqa
```

Em `backend/app/models/partner_opportunity.py`, logo depois de `created_by_id = ...`:

```python
    # Semáforo de CNPJ no cadastro (Entrega 2): cor e motivo, e quem liberou
    # o vermelho (só admin/gerente) com a justificativa.
    cnpj_resultado = Column(String(10), nullable=True)
    cnpj_motivo = Column(String(30), nullable=True)
    cnpj_liberado_por_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    cnpj_justificativa = Column(Text, nullable=True)
```

Depois de `eligibility_by = relationship(...)`, acrescentar:

```python
    cnpj_liberado_por = relationship("User", foreign_keys=[cnpj_liberado_por_id])
```

- [ ] **Step 4: Migration**

`backend/alembic/versions/2026_11_03_1000-3d4e5f6a7b8c_parcerias_consulta_cnpj.py`:

```python
"""Parcerias: Consulta de CNPJ (histórico) e semáforo gravado na oportunidade

Revision ID: 3d4e5f6a7b8c
Revises: 2c3d4e5f6a7b
Create Date: 2026-11-03 10:00:00

Cria cnpj_consultas e acrescenta cnpj_resultado, cnpj_motivo,
cnpj_liberado_por_id e cnpj_justificativa em partner_opportunities
(tabela da Entrega 1, só no homo). As oportunidades que já existem ficam nulas.
"""
from alembic import op
import sqlalchemy as sa


revision = '3d4e5f6a7b8c'
down_revision = '2c3d4e5f6a7b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'cnpj_consultas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('partner_id', sa.Integer(), sa.ForeignKey('partners.id', ondelete='SET NULL'), nullable=True),
        sa.Column('cnpj', sa.String(14), nullable=False),
        sa.Column('resultado', sa.String(10), nullable=False),
        sa.Column('motivo', sa.String(30), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_cnpj_consultas_id', 'cnpj_consultas', ['id'])
    op.create_index('ix_cnpj_consultas_user_id', 'cnpj_consultas', ['user_id'])
    op.create_index('ix_cnpj_consultas_partner_id', 'cnpj_consultas', ['partner_id'])
    op.create_index('ix_cnpj_consultas_cnpj', 'cnpj_consultas', ['cnpj'])
    op.create_index('ix_cnpj_consultas_created_at', 'cnpj_consultas', ['created_at'])

    op.add_column('partner_opportunities', sa.Column('cnpj_resultado', sa.String(10), nullable=True))
    op.add_column('partner_opportunities', sa.Column('cnpj_motivo', sa.String(30), nullable=True))
    op.add_column('partner_opportunities', sa.Column(
        'cnpj_liberado_por_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('partner_opportunities', sa.Column('cnpj_justificativa', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('partner_opportunities', 'cnpj_justificativa')
    op.drop_column('partner_opportunities', 'cnpj_liberado_por_id')
    op.drop_column('partner_opportunities', 'cnpj_motivo')
    op.drop_column('partner_opportunities', 'cnpj_resultado')
    op.drop_index('ix_cnpj_consultas_created_at', table_name='cnpj_consultas')
    op.drop_index('ix_cnpj_consultas_cnpj', table_name='cnpj_consultas')
    op.drop_index('ix_cnpj_consultas_partner_id', table_name='cnpj_consultas')
    op.drop_index('ix_cnpj_consultas_user_id', table_name='cnpj_consultas')
    op.drop_index('ix_cnpj_consultas_id', table_name='cnpj_consultas')
    op.drop_table('cnpj_consultas')
```

- [ ] **Step 5: Rodar e ver passar.** Conferir também que só existe uma cabeça: `MSYS_NO_PATHCONV=1 docker exec -w /app hsgrowth-api-local alembic heads`. Esse comando só lê os arquivos e não toca no banco. Expected: `3d4e5f6a7b8c (head)`.

---

### Task 2: Proteção por atividade e montagem da resposta (funções puras)

**Files:**
- Create: `backend/app/services/parcerias/semaforo.py`
- Test: `backend/tests/unit/test_parcerias_semaforo.py`

- [ ] **Step 1: Testes**

`backend/tests/unit/test_parcerias_semaforo.py`:

```python
"""Semáforo da Consulta de CNPJ: proteção por atividade e as cores."""
from datetime import date, datetime, timedelta

from app.services.parcerias.semaforo import Registro, juntar, motivo_do_registro, protegido

AGORA = datetime(2026, 11, 3, 12, 0)
CNPJ = "11222333000181"
FILIAL = "11222333000262"


def dias(n):
    return AGORA - timedelta(days=n)


# ── Proteção (regras 4 e 5) ─────────────────────────────────────────────────

def test_atividade_agendada_longe_protege():
    assert protegido(AGORA, prazos=[AGORA + timedelta(days=60)], movimentos=[dias(40)])


def test_atividade_atrasada_ate_10_dias_protege():
    assert protegido(AGORA, prazos=[dias(9)], movimentos=[dias(40)])


def test_atividade_atrasada_mais_de_10_dias_nao_protege():
    assert not protegido(AGORA, prazos=[dias(11)], movimentos=[dias(40)])


def test_movimento_recente_protege_mesmo_com_atividade_atrasada():
    assert protegido(AGORA, prazos=[dias(12)], movimentos=[dias(1)])


def test_sem_atividade_e_sem_movimento_recente_nao_protege():
    assert not protegido(AGORA, prazos=[], movimentos=[dias(11), None])


def test_aceita_datas_com_fuso():
    from datetime import timezone
    assert protegido(AGORA, prazos=[], movimentos=[dias(2).replace(tzinfo=timezone.utc)])


# ── Motivo de cada registro ──────────────────────────────────────────────────

def test_motivo_do_registro():
    assert motivo_do_registro(AGORA, aberto=True, protegido_=True) == ("em_negociacao", None)
    assert motivo_do_registro(AGORA, aberto=True, protegido_=False) is None
    assert motivo_do_registro(AGORA, aberto=False, ganho_em=dias(10)) == ("compra_recente", date(2026, 11, 23))
    assert motivo_do_registro(AGORA, aberto=False, ganho_em=dias(31)) is None
    assert motivo_do_registro(AGORA, aberto=False, perdido_em=dias(30)) == ("perdida_recente", date(2026, 12, 4))
    assert motivo_do_registro(AGORA, aberto=False, perdido_em=dias(91)) is None


# ── Juntar ───────────────────────────────────────────────────────────────────

def reg(cnpj=CNPJ, motivo="em_negociacao", libera_em=None):
    return Registro(tipo="card", id=1, titulo="T", onde="Prospecção · Lead Novo", responsavel="Miguel",
                    cnpj=cnpj, motivo=motivo, libera_em=libera_em, parceiro_id=None, parceiro=None,
                    desde=AGORA)


def test_livre():
    s = juntar(CNPJ, [])
    assert (s.resultado, s.motivo, s.frase) == ("verde", "livre", "Pode cadastrar.")


def test_outra_unidade_e_amarelo():
    s = juntar(CNPJ, [reg(cnpj=FILIAL)])
    assert (s.resultado, s.motivo) == ("amarelo", "outra_unidade")


def test_mesmo_cnpj_vence_outra_unidade():
    s = juntar(CNPJ, [reg(cnpj=FILIAL), reg(motivo="perdida_recente", libera_em=date(2026, 12, 1))])
    assert (s.resultado, s.motivo) == ("vermelho", "perdida_recente")
    assert s.frase == "Negociação encerrada há pouco. Disponível a partir de 01/12/2026."


def test_em_negociacao_vence_e_data_mais_distante():
    s = juntar(CNPJ, [
        reg(motivo="compra_recente", libera_em=date(2026, 11, 20)),
        reg(motivo="em_negociacao"),
    ])
    assert s.motivo == "em_negociacao"
    assert s.frase == "Esta empresa já está em negociação."

    s = juntar(CNPJ, [
        reg(motivo="perdida_recente", libera_em=date(2027, 1, 10)),
        reg(motivo="compra_recente", libera_em=date(2026, 11, 20)),
    ])
    assert s.motivo == "compra_recente"
    assert s.libera_em == date(2027, 1, 10)
```

- [ ] **Step 2: Rodar e ver falhar** (`ModuleNotFoundError`).

- [ ] **Step 3: Implementar a parte pura de `semaforo.py`**

```python
"""
Semáforo da Consulta de CNPJ (Parcerias, Entrega 2).

Cruza o CNPJ com os cards de Vendas (pelo cliente vinculado) e com as
oportunidades de todos os parceiros, seguindo a Aba 2 do documento:
negociação aberta e protegida (regras 1, 4 e 5), compra nos últimos 30 dias
(regra 2), perda nos últimos 90 dias (regra 6) e outra unidade da mesma
empresa (regra 8). Serviço não entra.
"""
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Iterable, List, Optional, Tuple

DIAS_PROTECAO = 10
DIAS_COMPRA_RECENTE = 30
DIAS_PERDA_RECENTE = 90

# Entre vermelhos, a mensagem segue esta ordem.
ORDEM_VERMELHOS = ("em_negociacao", "compra_recente", "perdida_recente")
MOTIVOS = {
    "livre": "Livre",
    "em_negociacao": "Em negociação",
    "compra_recente": "Compra recente",
    "perdida_recente": "Perdida há pouco",
    "outra_unidade": "Outra unidade",
}


def _naive(dt: datetime) -> datetime:
    """Anotações gravam com fuso; o resto do banco é UTC sem fuso."""
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def protegido(agora: datetime, prazos: Iterable[Optional[datetime]],
              movimentos: Iterable[Optional[datetime]]) -> bool:
    """
    Aberto e protegido: tem atividade em aberto que não está atrasada há mais
    de 10 dias (agendada para daqui a 2 meses protege) ou teve movimento nos
    últimos 10 dias. Atividade em aberto sem data não conta.
    """
    limite = agora - timedelta(days=DIAS_PROTECAO)
    if any(p is not None and _naive(p) >= limite for p in prazos):
        return True
    return any(m is not None and _naive(m) >= limite for m in movimentos)


def motivo_do_registro(agora: datetime, aberto: bool, protegido_: bool = False,
                       ganho_em: Optional[datetime] = None,
                       perdido_em: Optional[datetime] = None) -> Optional[Tuple[str, Optional[date]]]:
    """O que o registro bloqueia (motivo e data em que libera), ou None se não bloqueia."""
    if aberto:
        return ("em_negociacao", None) if protegido_ else None
    if ganho_em is not None:
        libera = _naive(ganho_em) + timedelta(days=DIAS_COMPRA_RECENTE)
        return ("compra_recente", libera.date()) if libera > agora else None
    if perdido_em is not None:
        libera = _naive(perdido_em) + timedelta(days=DIAS_PERDA_RECENTE)
        return ("perdida_recente", libera.date()) if libera > agora else None
    return None


@dataclass
class Registro:
    """Um card de Vendas ou uma oportunidade que bloqueia o CNPJ (ou a raiz)."""
    tipo: str  # card | oportunidade
    id: int
    titulo: str
    onde: str
    responsavel: Optional[str]
    cnpj: str
    motivo: str
    libera_em: Optional[date]
    parceiro_id: Optional[int]
    parceiro: Optional[str]
    desde: datetime


@dataclass
class Situacao:
    resultado: str  # verde | amarelo | vermelho
    motivo: str
    libera_em: Optional[date]
    frase: str
    registros: List[Registro] = field(default_factory=list)


def _frase(motivo: str, libera_em: Optional[date]) -> str:
    data = libera_em.strftime("%d/%m/%Y") if libera_em else ""
    return {
        "livre": "Pode cadastrar.",
        "em_negociacao": "Esta empresa já está em negociação.",
        "compra_recente": f"Cliente com compra recente. Disponível a partir de {data}.",
        "perdida_recente": f"Negociação encerrada há pouco. Disponível a partir de {data}.",
        "outra_unidade": "Outra unidade desta empresa está em negociação. O cadastro entra para análise da H&S.",
    }[motivo]


def juntar(cnpj: str, registros: List[Registro]) -> Situacao:
    """O pior caso vence: mesmo CNPJ = vermelho; só outra unidade = amarelo."""
    mesmos = [r for r in registros if r.cnpj == cnpj]
    if mesmos:
        motivo = min((r.motivo for r in mesmos), key=ORDEM_VERMELHOS.index)
        datas = [r.libera_em for r in mesmos if r.libera_em]
        libera = None if motivo == "em_negociacao" or not datas else max(datas)
        return Situacao("vermelho", motivo, libera, _frase(motivo, libera), registros)
    if registros:
        return Situacao("amarelo", "outra_unidade", None, _frase("outra_unidade", None), registros)
    return Situacao("verde", "livre", None, _frase("livre", None), [])
```

- [ ] **Step 4: Rodar e ver passar.**

---

### Task 3: Consultas no banco (`situacao` e `protecao_de_parceiro`)

**Files:**
- Modify: `backend/app/services/parcerias/semaforo.py` (acrescentar no fim)
- Modify: `backend/tests/unit/apoio_parcerias.py` (ajudantes de Vendas)
- Test: `backend/tests/unit/test_parcerias_semaforo.py`

- [ ] **Step 1: Ajudantes de Vendas nos testes**

Acrescentar no fim de `backend/tests/unit/apoio_parcerias.py`:

```python
CNPJ_FILIAL_A = "11222333000262"  # mesma raiz do CNPJ_A, outra unidade


def vendas(db):
    """Boards 6 (Prospecção, com a lista Lead Novo) e 7 (Aquisição), como em produção."""
    from types import SimpleNamespace
    from app.models.board import Board
    from app.models.list import List

    prospeccao = db.query(Board).get(6) or Board(id=6, name="Prospecção")
    aquisicao = db.query(Board).get(7) or Board(id=7, name="Aquisição")
    db.add_all([prospeccao, aquisicao])
    db.commit()
    lead_novo = List(board_id=6, name="Lead Novo", position=0)
    proposta = List(board_id=7, name="Proposta", position=0)
    db.add_all([lead_novo, proposta])
    db.commit()
    return SimpleNamespace(lead_novo=lead_novo, proposta=proposta)


def cliente(db, documento: str = CNPJ_A):
    from app.models.client import Client

    c = Client(name="Empresa A", company_name="Empresa A", document=documento,
               sector="Indústrias de Transformação", relationship_type="Prospect")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def card_de_vendas(db, lista, documento: str = CNPJ_A, **campos):
    """Card de Vendas com cliente; `criado_ha` (dias) recua o created_at."""
    from datetime import datetime, timedelta
    from app.models.card import Card

    criado_ha = campos.pop("criado_ha", 0)
    c = Card(title="Card Empresa A", list_id=lista.id, client_id=cliente(db, documento).id, **campos)
    c.created_at = datetime.utcnow() - timedelta(days=criado_ha)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c
```

- [ ] **Step 2: Testes de integração do semáforo**

Acrescentar em `test_parcerias_semaforo.py`:

```python
# ── Com o banco ──────────────────────────────────────────────────────────────

from app.models.card_note import CardNote
from app.models.card_task import CardTask
from app.models.partner_activity import PartnerActivity
from app.services.parcerias.semaforo import protecao_de_parceiro, situacao

from tests.unit.apoio_parcerias import (
    CNPJ_A, CNPJ_B, CNPJ_FILIAL_A, card_de_vendas, oportunidade, parceiro, usuario, vendas,
)


def test_card_de_vendas_novo_bloqueia(db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)

    s = situacao(db, CNPJ_A)

    assert (s.resultado, s.motivo) == ("vermelho", "em_negociacao")
    [r] = s.registros
    assert r.tipo == "card" and r.onde == "Prospecção · Lead Novo"


def test_card_parado_libera_e_tarefa_futura_protege(db):
    v = vendas(db)
    card = card_de_vendas(db, v.lead_novo, criado_ha=30)
    db.add(CardTask(card_id=card.id, title="Ligar", due_date=dias_reais(-12)))
    db.commit()
    assert situacao(db, CNPJ_A).resultado == "verde"

    db.add(CardTask(card_id=card.id, title="Visita", due_date=dias_reais(+60)))
    db.commit()
    assert situacao(db, CNPJ_A).resultado == "vermelho"


def test_anotacao_recente_protege(db):
    v = vendas(db)
    card = card_de_vendas(db, v.lead_novo, criado_ha=30)
    autor = usuario(db, "salesperson", "v@hs.com")
    db.add(CardNote(card_id=card.id, user_id=autor.id, content="Falei com o cliente"))
    db.commit()

    assert situacao(db, CNPJ_A).resultado == "vermelho"


def test_tarefa_cancelada_nao_protege(db):
    v = vendas(db)
    card = card_de_vendas(db, v.lead_novo, criado_ha=30)
    tarefa = CardTask(card_id=card.id, title="Ligar", due_date=dias_reais(+5), is_cancelled=True)
    db.add(tarefa)
    db.commit()
    # A criação da tarefa é movimento; recua para não contar.
    tarefa.created_at = dias_reais(-30)
    db.commit()

    assert situacao(db, CNPJ_A).resultado == "verde"


def test_ganho_e_perdido_de_vendas(db):
    v = vendas(db)
    card_de_vendas(db, v.proposta, is_won=1, closed_at=dias_reais(-10), criado_ha=40)
    s = situacao(db, CNPJ_A)
    assert s.motivo == "compra_recente"

    card_de_vendas(db, v.proposta, documento=CNPJ_B, is_won=-1, closed_at=dias_reais(-100), criado_ha=200)
    assert situacao(db, CNPJ_B).resultado == "verde"


def test_documento_com_pontuacao_e_cpf(db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, documento="11.222.333/0001-81")
    card_de_vendas(db, v.lead_novo, documento="12345678901")

    assert situacao(db, CNPJ_A).resultado == "vermelho"


def test_outra_unidade_da_amarelo(db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, documento=CNPJ_FILIAL_A)

    assert situacao(db, CNPJ_A).resultado == "amarelo"


def test_oportunidade_de_parceiro_bloqueia_e_rejeitada_nao(db):
    p = parceiro(db)
    op = oportunidade(db, p, last_activity_at=dias_reais(-1))
    assert situacao(db, CNPJ_A).motivo == "em_negociacao"
    assert situacao(db, CNPJ_A, ignorar_oportunidade_id=op.id).resultado == "verde"

    op.eligibility_status = "rejeitada"
    db.commit()
    assert situacao(db, CNPJ_A).resultado == "verde"


def test_oportunidade_parada_com_atividade_futura(db):
    p = parceiro(db)
    op = oportunidade(db, p, last_activity_at=dias_reais(-20))
    op.created_at = dias_reais(-20)
    db.commit()
    assert situacao(db, CNPJ_A).resultado == "verde"

    db.add(PartnerActivity(opportunity_id=op.id, category="atividade", title="Visita",
                           due_date=dias_reais(+30)))
    db.commit()
    assert situacao(db, CNPJ_A).resultado == "vermelho"


def test_oportunidade_ganha_recente(db):
    p = parceiro(db)
    oportunidade(db, p, stage="ganho", won_at=dias_reais(-5))

    assert situacao(db, CNPJ_A).motivo == "compra_recente"


def test_protecao_de_parceiro_so_olha_oportunidades_do_mesmo_cnpj(db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)
    p = parceiro(db)
    oportunidade(db, p, cnpj=CNPJ_FILIAL_A, last_activity_at=dias_reais(-1))
    assert protecao_de_parceiro(db, CNPJ_A) == []

    oportunidade(db, p, last_activity_at=dias_reais(-1))
    [r] = protecao_de_parceiro(db, CNPJ_A)
    assert r.parceiro == "Dmap"


def dias_reais(n):
    return datetime.utcnow() + timedelta(days=n)
```

- [ ] **Step 3: Rodar e ver falhar** (`ImportError: situacao`).

- [ ] **Step 4: Implementar as consultas**

Acrescentar em `semaforo.py`, depois de `juntar`:

```python
# ─── Consultas no banco ──────────────────────────────────────────────────────

from sqlalchemy import func  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.models.board import Board  # noqa: E402
from app.models.card import Card  # noqa: E402
from app.models.card_list_history import CardListHistory  # noqa: E402
from app.models.card_note import CardNote  # noqa: E402
from app.models.card_task import CardTask  # noqa: E402
from app.models.client import Client  # noqa: E402
from app.models.list import List as Lista  # noqa: E402
from app.models.partner_activity import PartnerActivity  # noqa: E402
from app.models.partner_opportunity import PartnerOpportunity  # noqa: E402
from app.services.parcerias.etapas import ETAPAS_OPORTUNIDADE, nome_da_etapa  # noqa: E402


def _digitos_sql(col):
    """Documento só com dígitos, em SQL portável (Postgres e SQLite)."""
    expr = col
    for ch in (".", "/", "-", " "):
        expr = func.replace(expr, ch, "")
    return expr


def _cards(db: Session, raiz: str, agora: datetime) -> List[Registro]:
    doc = _digitos_sql(Client.document)
    linhas = (
        db.query(Card, doc, Lista.name, Board.name)
        .join(Client, Card.client_id == Client.id)
        .join(Lista, Card.list_id == Lista.id)
        .join(Board, Lista.board_id == Board.id)
        .filter(
            Card.is_deleted.is_(False),
            Client.is_deleted.is_(False),
            func.length(doc) == 14,
            doc.like(f"{raiz}%"),
        )
        .all()
    )
    if not linhas:
        return []
    ids = [card.id for card, *_ in linhas]

    prazos, movimentos = {}, {}
    for t in db.query(CardTask).filter(CardTask.card_id.in_(ids)).all():
        if not t.is_completed and not t.is_cancelled:
            prazos.setdefault(t.card_id, []).append(t.due_date)
        movimentos.setdefault(t.card_id, []).extend([t.created_at, t.completed_at])
    for card_id, quando in (
        db.query(CardNote.card_id, func.max(CardNote.created_at))
        .filter(CardNote.card_id.in_(ids)).group_by(CardNote.card_id).all()
    ):
        movimentos.setdefault(card_id, []).append(quando)
    for card_id, quando in (
        db.query(CardListHistory.card_id, func.max(CardListHistory.entered_at))
        .filter(CardListHistory.card_id.in_(ids)).group_by(CardListHistory.card_id).all()
    ):
        movimentos.setdefault(card_id, []).append(quando)

    registros = []
    for card, documento, lista, board in linhas:
        aberto = card.is_won == 0
        resultado = motivo_do_registro(
            agora,
            aberto=aberto,
            protegido_=aberto and protegido(
                agora, prazos.get(card.id, []), movimentos.get(card.id, []) + [card.created_at]
            ),
            ganho_em=card.closed_at if card.is_won == 1 else None,
            perdido_em=card.closed_at if card.is_won == -1 else None,
        )
        if resultado:
            registros.append(Registro(
                tipo="card", id=card.id, titulo=card.title, onde=f"{board} · {lista}",
                responsavel=card.assigned_to.name if card.assigned_to else None,
                cnpj=documento, motivo=resultado[0], libera_em=resultado[1],
                parceiro_id=None, parceiro=None, desde=card.created_at,
            ))
    return registros


def _oportunidades(db: Session, raiz: str, agora: datetime,
                   ignorar: Optional[int] = None) -> List[Registro]:
    q = db.query(PartnerOpportunity).filter(
        PartnerOpportunity.is_deleted.is_(False),
        PartnerOpportunity.eligibility_status != "rejeitada",
        PartnerOpportunity.cnpj.like(f"{raiz}%"),
    )
    if ignorar is not None:
        q = q.filter(PartnerOpportunity.id != ignorar)
    ops = q.all()
    if not ops:
        return []

    prazos = {}
    for a in db.query(PartnerActivity).filter(
        PartnerActivity.opportunity_id.in_([o.id for o in ops]),
        PartnerActivity.category == "atividade",
        PartnerActivity.is_completed.is_(False),
    ).all():
        prazos.setdefault(a.opportunity_id, []).append(a.due_date)

    registros = []
    for o in ops:
        aberto = o.stage not in ("ganho", "perdido")
        resultado = motivo_do_registro(
            agora,
            aberto=aberto,
            protegido_=aberto and protegido(agora, prazos.get(o.id, []), [o.last_activity_at, o.created_at]),
            ganho_em=o.won_at if o.stage == "ganho" else None,
            perdido_em=o.lost_at if o.stage == "perdido" else None,
        )
        if resultado:
            nome = o.partner.name if o.partner else ""
            registros.append(Registro(
                tipo="oportunidade", id=o.id, titulo=o.title,
                onde=f"Parceiro {nome} · {nome_da_etapa(ETAPAS_OPORTUNIDADE, o.stage)}",
                responsavel=o.seller.name if o.seller else None,
                cnpj=o.cnpj, motivo=resultado[0], libera_em=resultado[1],
                parceiro_id=o.partner_id, parceiro=nome, desde=o.created_at,
            ))
    return registros


def situacao(db: Session, cnpj: str, ignorar_oportunidade_id: Optional[int] = None,
             agora: Optional[datetime] = None) -> Situacao:
    """A cor do CNPJ (14 dígitos) contra Vendas e todos os parceiros."""
    agora = agora or datetime.utcnow()
    raiz = cnpj[:8]
    registros = _cards(db, raiz, agora) + _oportunidades(db, raiz, agora, ignorar_oportunidade_id)
    return juntar(cnpj, registros)


def protecao_de_parceiro(db: Session, cnpj: str, agora: Optional[datetime] = None) -> List[Registro]:
    """Oportunidades de parceiro que protegem exatamente este CNPJ (faixa e bloqueio em Vendas)."""
    agora = agora or datetime.utcnow()
    return [r for r in _oportunidades(db, cnpj[:8], agora) if r.cnpj == cnpj]
```

Observação: a oportunidade ganha usa `stage == "ganho"` e `won_at`. Se `won_at` estiver nulo num registro antigo, `motivo_do_registro` devolve None (não bloqueia).

- [ ] **Step 5: Rodar e ver passar.** Se `func.length` ou `like` falharem no SQLite com o `replace` aninhado, conferir a saída de `_digitos_sql`; o mesmo padrão já funciona em `global_search_service`.

---

### Task 4: Consulta, limite e histórico (rotas)

**Files:**
- Create: `backend/app/services/parcerias/consultas.py`
- Create: `backend/app/api/v1/endpoints/consulta_cnpj.py`
- Modify: `backend/app/schemas/parcerias.py` (fim do arquivo)
- Modify: `backend/app/api/deps.py` (depois de `require_parcerias_access`)
- Modify: `backend/app/api/v1/__init__.py` (import e `include_router`)
- Test: `backend/tests/unit/test_parcerias_consulta.py`

- [ ] **Step 1: Testes**

`backend/tests/unit/test_parcerias_consulta.py`:

```python
"""Consulta de CNPJ: quem consulta, o que cada perfil vê, limite e histórico."""
from datetime import datetime

from app.models.cnpj_consulta import CnpjConsulta

from tests.unit.apoio_parcerias import (
    CNPJ_A, CNPJ_B, card_de_vendas, headers, parceiro, usuario, vendas,
)

URL = "/api/v1/parcerias/consulta-cnpj"


def test_parceiro_ve_so_a_cor_e_a_frase(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)
    h = headers(usuario(db, "partner", "a@dmap.com", parceiro(db)))

    r = client.post(URL, json={"cnpj": "11.222.333/0001-81"}, headers=h)

    assert r.status_code == 200
    assert r.json()["resultado"] == "vermelho"
    assert r.json()["frase"] == "Esta empresa já está em negociação."
    assert r.json()["registros"] == []


def test_vendedor_e_sdr_veem_onde_esta(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)
    for perfil in ("salesperson", "sdr"):
        h = headers(usuario(db, perfil, f"{perfil}@hs.com"))
        [registro] = client.post(URL, json={"cnpj": CNPJ_A}, headers=h).json()["registros"]
        assert registro["onde"] == "Prospecção · Lead Novo"


def test_cnpj_invalido_responde_422(client, db):
    h = headers(usuario(db, "sdr", "sdr@hs.com"))
    assert client.post(URL, json={"cnpj": "123"}, headers=h).status_code == 422


def test_financeiro_servico_e_visualizador_nao_consultam(client, db):
    for perfil in ("finance", "service", "viewer"):
        h = headers(usuario(db, perfil, f"{perfil}@hs.com"))
        assert client.post(URL, json={"cnpj": CNPJ_A}, headers=h).status_code == 403


def test_limite_de_20_por_dia_para_o_parceiro(client, db):
    p = parceiro(db)
    u = usuario(db, "partner", "a@dmap.com", p)
    h = headers(u)
    for _ in range(20):
        assert client.post(URL, json={"cnpj": CNPJ_A}, headers=h).status_code == 200

    r = client.post(URL, json={"cnpj": CNPJ_B}, headers=h)
    assert r.status_code == 429
    assert client.get(f"{URL}/hoje", headers=h).json() == {"feitas": 20, "limite": 20}
    assert db.query(CnpjConsulta).filter(CnpjConsulta.partner_id == p.id).count() == 20


def test_consulta_de_ontem_nao_conta(client, db):
    p = parceiro(db)
    u = usuario(db, "partner", "a@dmap.com", p)
    db.add_all([CnpjConsulta(user_id=u.id, partner_id=p.id, cnpj=CNPJ_A, resultado="verde", motivo="livre",
                             created_at=datetime(2020, 1, 1)) for _ in range(25)])
    db.commit()

    assert client.post(URL, json={"cnpj": CNPJ_A}, headers=headers(u)).status_code == 200


def test_vendedor_sem_limite(client, db):
    h = headers(usuario(db, "salesperson", "v@hs.com"))
    for _ in range(21):
        assert client.post(URL, json={"cnpj": CNPJ_A}, headers=h).status_code == 200
    assert client.get(f"{URL}/hoje", headers=h).json()["limite"] is None


def test_historico_so_para_gestao_e_com_filtro(client, db, admin_headers):
    p = parceiro(db)
    parceiro_user = usuario(db, "partner", "a@dmap.com", p)
    vendedor = usuario(db, "salesperson", "v@hs.com")
    client.post(URL, json={"cnpj": CNPJ_A}, headers=headers(parceiro_user))
    client.post(URL, json={"cnpj": CNPJ_B}, headers=headers(vendedor))

    assert client.get(f"{URL}/historico", headers=headers(vendedor)).status_code == 403
    tudo = client.get(f"{URL}/historico", headers=admin_headers).json()
    assert tudo["total"] == 2
    so_dmap = client.get(f"{URL}/historico", params={"partner_id": p.id}, headers=admin_headers).json()
    [linha] = so_dmap["itens"]
    assert linha["partner_name"] == "Dmap" and linha["cnpj"] == CNPJ_A and linha["resultado"] == "verde"
```

- [ ] **Step 2: Rodar e ver falhar** (404 nas rotas).

- [ ] **Step 3: Schemas**

No fim de `backend/app/schemas/parcerias.py`:

```python
# ─── Consulta de CNPJ (Entrega 2) ────────────────────────────────────────────

class ConsultaCnpjRequest(BaseModel):
    cnpj: str

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        if not cnpj_valido(valor):
            raise ValueError("CNPJ inválido")
        return so_digitos(valor)


class RegistroSemaforo(BaseModel):
    tipo: str
    id: int
    titulo: str
    onde: str
    responsavel: Optional[str] = None
    cnpj: str
    motivo: str
    libera_em: Optional[date] = None
    parceiro: Optional[str] = None
    desde: datetime


class ConsultaCnpjResponse(BaseModel):
    cnpj: str
    resultado: Literal["verde", "amarelo", "vermelho"]
    motivo: str
    frase: str
    libera_em: Optional[date] = None
    # Vazio para o parceiro: ele vê só a cor e a frase.
    registros: List[RegistroSemaforo] = []


class ConsultasHojeResponse(BaseModel):
    feitas: int
    limite: Optional[int] = None


class ConsultaHistoricoItem(BaseModel):
    id: int
    created_at: datetime
    user_name: Optional[str] = None
    perfil: Optional[str] = None
    partner_name: Optional[str] = None
    cnpj: str
    resultado: str
    motivo: str


class ConsultaHistoricoResponse(BaseModel):
    total: int
    itens: List[ConsultaHistoricoItem]


class AvisoParceriasItem(BaseModel):
    parceiro: str
    desde: datetime
```

- [ ] **Step 4: Serviço `consultas.py`**

```python
"""
Consulta de CNPJ (Entrega 2): limite diário do parceiro, histórico e a
resposta filtrada por perfil. O semáforo em si fica em semaforo.py.
"""
from datetime import date, datetime, time, timezone
from typing import Optional, Tuple
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.cnpj_consulta import CnpjConsulta
from app.models.user import User
from app.schemas.parcerias import (
    ConsultaCnpjResponse,
    ConsultaHistoricoItem,
    ConsultaHistoricoResponse,
    RegistroSemaforo,
)
from app.services.parcerias import acesso, semaforo

LIMITE_CONSULTAS_PARCEIRO = 20
FUSO = ZoneInfo("America/Sao_Paulo")


def _inicio_do_dia_utc(agora: Optional[datetime] = None) -> datetime:
    """Meia-noite de hoje em São Paulo, em UTC sem fuso (como o banco grava)."""
    agora = (agora or datetime.utcnow()).replace(tzinfo=timezone.utc).astimezone(FUSO)
    meia_noite = datetime.combine(agora.date(), time.min, tzinfo=FUSO)
    return meia_noite.astimezone(timezone.utc).replace(tzinfo=None)


def limite_de(user: User) -> Optional[int]:
    return LIMITE_CONSULTAS_PARCEIRO if acesso.eh_parceiro(user) else None


def feitas_hoje(db: Session, user: User) -> int:
    return db.query(CnpjConsulta).filter(
        CnpjConsulta.user_id == user.id,
        CnpjConsulta.created_at >= _inicio_do_dia_utc(),
    ).count()


def consultar(db: Session, user: User, cnpj: str) -> ConsultaCnpjResponse:
    limite = limite_de(user)
    if limite is not None and feitas_hoje(db, user) >= limite:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Limite diário de {limite} consultas atingido. Volta a liberar amanhã.",
        )
    s = semaforo.situacao(db, cnpj)
    db.add(CnpjConsulta(
        user_id=user.id, partner_id=user.partner_id if acesso.eh_parceiro(user) else None,
        cnpj=cnpj, resultado=s.resultado, motivo=s.motivo,
    ))
    db.commit()
    return resposta(cnpj, s, user)


def resposta(cnpj: str, s: semaforo.Situacao, user: User) -> ConsultaCnpjResponse:
    registros = [] if acesso.eh_parceiro(user) else [
        RegistroSemaforo(
            tipo=r.tipo, id=r.id, titulo=r.titulo, onde=r.onde, responsavel=r.responsavel,
            cnpj=r.cnpj, motivo=r.motivo, libera_em=r.libera_em, parceiro=r.parceiro, desde=r.desde,
        )
        for r in s.registros
    ]
    return ConsultaCnpjResponse(
        cnpj=cnpj, resultado=s.resultado, motivo=s.motivo, frase=s.frase,
        libera_em=s.libera_em, registros=registros,
    )


def historico(db: Session, user: User, user_id: Optional[int] = None, partner_id: Optional[int] = None,
              desde: Optional[date] = None, ate: Optional[date] = None,
              pagina: int = 1, por_pagina: int = 50) -> ConsultaHistoricoResponse:
    acesso.exigir_gestao(user)
    q = db.query(CnpjConsulta)
    if user_id:
        q = q.filter(CnpjConsulta.user_id == user_id)
    if partner_id:
        q = q.filter(CnpjConsulta.partner_id == partner_id)
    if desde:
        q = q.filter(CnpjConsulta.created_at >= datetime.combine(desde, time.min))
    if ate:
        q = q.filter(CnpjConsulta.created_at <= datetime.combine(ate, time.max))
    total = q.count()
    linhas = (
        q.order_by(CnpjConsulta.created_at.desc(), CnpjConsulta.id.desc())
        .offset((pagina - 1) * por_pagina).limit(por_pagina).all()
    )
    return ConsultaHistoricoResponse(total=total, itens=[
        ConsultaHistoricoItem(
            id=c.id, created_at=c.created_at, cnpj=c.cnpj, resultado=c.resultado, motivo=c.motivo,
            user_name=c.user.name if c.user else None,
            perfil=acesso.perfil(c.user) if c.user else None,
            partner_name=c.partner.name if c.partner else None,
        )
        for c in linhas
    ])
```

- [ ] **Step 5: Dependência em `deps.py`** (logo depois de `require_parcerias_access`)

```python
def require_consulta_cnpj():
    """
    Consulta de CNPJ (Parcerias, Entrega 2): parceiro, vendedor, SDR, admin e
    gerente. O Financeiro, o serviço e o visualizador não consultam (403).
    """
    async def checker(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        allowed_roles = ("admin", "manager", "salesperson", "sdr", "partner")
        if not current_user.role or current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito à Consulta de CNPJ."
            )
        return current_user

    return checker
```

- [ ] **Step 6: Router**

`backend/app/api/v1/endpoints/consulta_cnpj.py`:

```python
"""
Consulta de CNPJ (Parcerias, Entrega 2).

Router próprio porque o SDR consulta e não entra em Parcerias. Fica em
/parcerias/consulta-cnpj para o parceiro passar pela tranca. Quem entra:
require_consulta_cnpj (parceiro, vendedor, SDR, admin e gerente).
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.parcerias import (
    ConsultaCnpjRequest,
    ConsultaCnpjResponse,
    ConsultaHistoricoResponse,
    ConsultasHojeResponse,
)
from app.services.parcerias import consultas

router = APIRouter()


@router.post("", response_model=ConsultaCnpjResponse, summary="Consultar um CNPJ no semáforo")
def consultar(req: ConsultaCnpjRequest, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_active_user)):
    return consultas.consultar(db, current_user, req.cnpj)


@router.get("/hoje", response_model=ConsultasHojeResponse, summary="Consultas feitas hoje e o limite")
def hoje(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return ConsultasHojeResponse(feitas=consultas.feitas_hoje(db, current_user), limite=consultas.limite_de(current_user))


@router.get("/historico", response_model=ConsultaHistoricoResponse, summary="Histórico (admin e gerente)")
def historico(
    user_id: Optional[int] = None,
    partner_id: Optional[int] = None,
    desde: Optional[date] = None,
    ate: Optional[date] = None,
    pagina: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return consultas.historico(db, current_user, user_id, partner_id, desde, ate, pagina)
```

Em `backend/app/api/v1/__init__.py`:
- na linha 6, importar também `require_consulta_cnpj`;
- na linha 7, acrescentar `consulta_cnpj` ao import dos endpoints;
- antes da linha do `parcerias.router`, acrescentar:

```python
api_router.include_router(consulta_cnpj.router, prefix="/parcerias/consulta-cnpj", tags=["Parcerias"], dependencies=[Depends(require_consulta_cnpj())])
```

- [ ] **Step 7: Rodar e ver passar.** Rodar também `tests/unit/test_parcerias_tranca.py`, para confirmar que a rota nova passa pela tranca do parceiro.

---

### Task 5: Semáforo no cadastro e na troca de CNPJ da oportunidade

**Files:**
- Modify: `backend/app/schemas/parcerias.py` (`OportunidadeCreate`, `OportunidadeUpdate`, `OportunidadeResponse`)
- Modify: `backend/app/services/parcerias/oportunidades.py` (`criar`, `atualizar`)
- Modify: `backend/app/services/parcerias/respostas.py` (`oportunidade_out`, `oportunidades_out`)
- Modify: `backend/app/api/v1/endpoints/parcerias.py` (`_uma` e chamadas)
- Test: `backend/tests/unit/test_parcerias_oportunidades.py`

- [ ] **Step 1: Testes** (acrescentar em `test_parcerias_oportunidades.py`; reaproveitar os ajudantes do arquivo para o payload mínimo e o login do parceiro: `DADOS` ou equivalente e `_login_parceiro`)

```python
from tests.unit.apoio_parcerias import CNPJ_FILIAL_A, card_de_vendas, vendas


def test_vermelho_barra_o_parceiro(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)
    p = parceiro(db)
    h = _login_parceiro(db, p)

    r = client.post(f"{URL}/oportunidades", json=_payload(), headers=h)

    assert r.status_code == 422
    assert r.json()["detail"] == "Esta empresa já está em negociação."


def test_gestao_libera_o_vermelho_com_justificativa(client, db, admin_headers):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)
    p = parceiro(db)

    sem = client.post(f"{URL}/oportunidades", json={**_payload(), "partner_id": p.id}, headers=admin_headers)
    assert sem.status_code == 422 and "justificativa" in sem.json()["detail"]

    com = client.post(f"{URL}/oportunidades", headers=admin_headers,
                      json={**_payload(), "partner_id": p.id, "cnpj_justificativa": "Cliente pediu o parceiro"})
    assert com.status_code == 201
    corpo = com.json()
    assert (corpo["cnpj_resultado"], corpo["cnpj_motivo"]) == ("vermelho", "em_negociacao")
    assert corpo["cnpj_justificativa"] == "Cliente pediu o parceiro"
    assert corpo["cnpj_liberado_por_name"]


def test_parceiro_nao_libera_com_justificativa(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)
    h = _login_parceiro(db, parceiro(db))

    r = client.post(f"{URL}/oportunidades", json={**_payload(), "cnpj_justificativa": "por favor"}, headers=h)

    assert r.status_code == 422


def test_amarelo_grava_o_motivo(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, documento=CNPJ_FILIAL_A)
    h = _login_parceiro(db, parceiro(db))

    r = client.post(f"{URL}/oportunidades", json=_payload(), headers=h)

    assert r.status_code == 201
    assert (r.json()["cnpj_resultado"], r.json()["cnpj_motivo"]) == ("amarelo", "outra_unidade")


def test_cadastro_nao_gasta_consulta(client, db):
    from app.models.cnpj_consulta import CnpjConsulta
    h = _login_parceiro(db, parceiro(db))
    client.post(f"{URL}/oportunidades", json=_payload(), headers=h)
    assert db.query(CnpjConsulta).count() == 0


def test_trocar_cnpj_confere_de_novo(client, db):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo, documento=CNPJ_B)
    p = parceiro(db)
    h = _login_parceiro(db, p)
    op_id = client.post(f"{URL}/oportunidades", json=_payload(), headers=h).json()["id"]

    r = client.put(f"{URL}/oportunidades/{op_id}", json={"cnpj": CNPJ_B}, headers=h)

    assert r.status_code == 422


def test_parceiro_nao_ve_justificativa(client, db, admin_headers):
    v = vendas(db)
    card_de_vendas(db, v.lead_novo)
    p = parceiro(db)
    op_id = client.post(f"{URL}/oportunidades", headers=admin_headers,
                        json={**_payload(), "partner_id": p.id, "cnpj_justificativa": "Card do Miguel parado"}).json()["id"]

    corpo = client.get(f"{URL}/oportunidades/{op_id}", headers=_login_parceiro(db, p)).json()

    assert corpo["cnpj_justificativa"] is None and corpo["cnpj_liberado_por_name"] is None
```

Se o arquivo não tiver uma função `_payload()` que devolve o JSON mínimo de criação com `cnpj = CNPJ_A`, criá-la no topo a partir do dicionário que os testes atuais já usam.

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Schemas**

Em `OportunidadeCreate` e `OportunidadeUpdate`, acrescentar:

```python
    # Só admin/gerente: cadastrar (ou trocar o CNPJ) mesmo com o semáforo vermelho.
    cnpj_justificativa: Optional[str] = Field(None, max_length=500)
```

Em `OportunidadeResponse`, acrescentar:

```python
    cnpj_resultado: Optional[str] = None
    cnpj_motivo: Optional[str] = None
    cnpj_justificativa: Optional[str] = None
    cnpj_liberado_por_name: Optional[str] = None
```

- [ ] **Step 4: Serviço**

Em `oportunidades.py`:
- importar `semaforo` junto dos outros serviços: `from app.services.parcerias import acesso, ativacao, atividades, semaforo`;
- depois de `_conferir_vendedor`, acrescentar:

```python
def _liberacao(user: User, s: "semaforo.Situacao", justificativa: Optional[str]) -> Optional[str]:
    """No vermelho só a gestão passa, e com justificativa. Devolve o texto da justificativa."""
    if s.resultado != "vermelho":
        return None
    if not acesso.eh_gestao(user):
        raise _422(s.frase)
    texto = (justificativa or "").strip()
    if not texto:
        raise _422(f"{s.frase} Para cadastrar mesmo assim, escreva a justificativa.")
    return texto


def _gravar_semaforo(db: Session, user: User, op: PartnerOpportunity,
                     s: "semaforo.Situacao", liberacao: Optional[str]) -> None:
    op.cnpj_resultado, op.cnpj_motivo = s.resultado, s.motivo
    op.cnpj_liberado_por_id = user.id if liberacao else None
    op.cnpj_justificativa = liberacao
    if liberacao:
        atividades.registrar_evento(
            db, user,
            f"Cadastro liberado pela gestão com o CNPJ em vermelho ({semaforo.MOTIVOS[s.motivo]}). "
            f"Justificativa: {liberacao}",
            opportunity_id=op.id,
        )
```

Em `criar`:
- depois de `_conferir_vendedor(...)`:

```python
    s = semaforo.situacao(db, dados.cnpj)
    liberacao = _liberacao(user, s, dados.cnpj_justificativa)
```

- no `PartnerOpportunity(...)`, trocar `**dados.model_dump(exclude={"partner_id"})` por `**dados.model_dump(exclude={"partner_id", "cnpj_justificativa"})`;
- depois do `registrar_evento(... "Oportunidade cadastrada" ...)`:

```python
    _gravar_semaforo(db, user, op, s, liberacao)
```

Em `atualizar`, logo depois de `campos = dados.model_dump(exclude_unset=True)`:

```python
    justificativa = campos.pop("cnpj_justificativa", None)
```

Depois do bloco que recusa CNPJ após a validação (`raise _422("O CNPJ não muda...")`):

```python
    if novo_cnpj and novo_cnpj != op.cnpj:
        s = semaforo.situacao(db, novo_cnpj, ignorar_oportunidade_id=op.id)
        _gravar_semaforo(db, user, op, s, _liberacao(user, s, justificativa))
```

- [ ] **Step 5: Respostas**

Em `respostas.py`:
- importar `from typing import Dict, Iterable, List, Optional`;
- importar `from app.models.user import User` e `from app.services.parcerias import acesso`.

Trocar `oportunidade_out` e `oportunidades_out` por:

```python
def oportunidade_out(op: PartnerOpportunity, total: float = 0, user: Optional[User] = None) -> OportunidadeResponse:
    # O parceiro vê a cor e o motivo, não a justificativa da gestão nem quem liberou.
    para_parceiro = user is not None and acesso.eh_parceiro(user)
    return OportunidadeResponse.model_validate(op).model_copy(update={
        "partner_name": op.partner.name if op.partner else None,
        "seller_name": op.seller.name if op.seller else None,
        "eligibility_by_name": op.eligibility_by.name if op.eligibility_by else None,
        "total_value": total,
        "cnpj_justificativa": None if para_parceiro else op.cnpj_justificativa,
        "cnpj_liberado_por_name": None if para_parceiro or not op.cnpj_liberado_por else op.cnpj_liberado_por.name,
    })


def oportunidades_out(db: Session, ops: List[PartnerOpportunity], user: Optional[User] = None) -> List[OportunidadeResponse]:
    totais = valores_por_oportunidade(db, [op.id for op in ops])
    return [oportunidade_out(op, totais.get(op.id, 0), user) for op in ops]
```

Em `endpoints/parcerias.py`:
- trocar `_uma` por:

```python
def _uma(db: Session, op, user: User) -> OportunidadeResponse:
    return respostas.oportunidade_out(op, respostas.valores_por_oportunidade(db, [op.id]).get(op.id, 0), user)
```

- em cada chamada `_uma(db, ...)`, passar `current_user` como terceiro argumento;
- em `listar_oportunidades`, passar `current_user` para `oportunidades_out`;
- conferir com `grep -n "_uma(db\|oportunidades_out(" backend/app/api/v1/endpoints/parcerias.py`.

- [ ] **Step 6: Rodar os testes de Parcerias inteiros**

Run: `... pytest tests/unit -q -k parcerias ...`

Os testes antigos que criam duas oportunidades com o mesmo `CNPJ_A` e esperam 201 agora vão dar 422, por duplicidade (regra 8). Nesses testes:
- trocar o CNPJ da segunda oportunidade para `CNPJ_B`;
- ou criar a primeira pelo ajudante `oportunidade(db, ...)` com `eligibility_status="rejeitada"`, quando o teste não depender dela.

Não mudar a regra para fazer teste passar.

---

### Task 6: Lado de Vendas (bloqueio nos 4 pontos e faixa)

**Files:**
- Create: `backend/app/services/parcerias/vendas.py`
- Modify: `backend/app/services/card_service.py` (`create_card`, `update_card`, `reopen_card`, `clone_card`)
- Modify: `backend/app/api/v1/endpoints/cards.py` (rota nova depois de `get_card`)
- Test: `backend/tests/unit/test_parcerias_vendas_cnpj.py`

- [ ] **Step 1: Testes**

```python
"""Lado de Vendas: faixa e bloqueio quando um parceiro está com o CNPJ."""
from datetime import datetime, timedelta

from app.models.activity import Activity
from app.models.card import Card

from tests.unit.apoio_parcerias import (
    CNPJ_A, CNPJ_B, card_de_vendas, cliente, headers, oportunidade, parceiro, usuario, vendas,
)

CARDS = "/api/v1/cards"


def _parceiro_trabalhando(db):
    p = parceiro(db)
    oportunidade(db, p, last_activity_at=datetime.utcnow() - timedelta(days=1))
    return p


def test_vendedor_nao_cria_card_com_cnpj_do_parceiro(client, db):
    v = vendas(db)
    _parceiro_trabalhando(db)
    vendedor = usuario(db, "salesperson", "v@hs.com")

    r = client.post(CARDS, headers=headers(vendedor),
                    json={"title": "Empresa A", "list_id": v.lead_novo.id, "client_id": cliente(db).id})

    assert r.status_code == 409
    assert "parceiro Dmap" in r.json()["detail"] and "Fale com o gerente" in r.json()["detail"]


def test_cnpj_livre_cria_normal(client, db):
    v = vendas(db)
    _parceiro_trabalhando(db)
    vendedor = usuario(db, "salesperson", "v@hs.com")

    r = client.post(CARDS, headers=headers(vendedor),
                    json={"title": "Empresa B", "list_id": v.lead_novo.id, "client_id": cliente(db, CNPJ_B).id})

    assert r.status_code == 201


def test_admin_passa_e_fica_registrado(client, db, admin_headers):
    v = vendas(db)
    _parceiro_trabalhando(db)

    r = client.post(CARDS, headers=admin_headers,
                    json={"title": "Empresa A", "list_id": v.lead_novo.id, "client_id": cliente(db).id})

    assert r.status_code == 201
    [registro] = db.query(Activity).filter(Activity.card_id == r.json()["id"],
                                           Activity.activity_type == "parcerias_cnpj").all()
    assert "parceiro Dmap" in registro.description


def test_lead_de_integracao_passa(client, db):
    v = vendas(db)
    _parceiro_trabalhando(db)
    integ = usuario(db, "manager", "integ@hs.com")
    integ.is_integracao = True
    db.commit()

    r = client.post(CARDS, headers=headers(integ),
                    json={"title": "Lead do site", "list_id": v.lead_novo.id, "client_id": cliente(db).id})

    assert r.status_code == 201


def test_vincular_cliente_bloqueia(client, db):
    v = vendas(db)
    vendedor = usuario(db, "salesperson", "v@hs.com")
    card = Card(title="Sem cliente", list_id=v.lead_novo.id, assigned_to_id=vendedor.id)
    db.add(card)
    db.commit()
    _parceiro_trabalhando(db)

    r = client.put(f"{CARDS}/{card.id}", headers=headers(vendedor), json={"client_id": cliente(db).id})

    assert r.status_code == 409


def test_clonar_e_reabrir_bloqueiam(client, db):
    v = vendas(db)
    vendedor = usuario(db, "salesperson", "v@hs.com")
    card = card_de_vendas(db, v.lead_novo, assigned_to_id=vendedor.id)
    perdido = card_de_vendas(db, v.proposta, assigned_to_id=vendedor.id, is_won=-1,
                             closed_at=datetime.utcnow() - timedelta(days=200), criado_ha=300)
    _parceiro_trabalhando(db)
    h = headers(vendedor)

    assert client.post(f"{CARDS}/{card.id}/clone", headers=h).status_code == 409
    assert client.post(f"{CARDS}/{perdido.id}/reopen", headers=h,
                       json={"acquisition_channel_detail": "Base"}).status_code == 409


def test_faixa_lista_o_parceiro(client, db, admin_headers):
    v = vendas(db)
    card = card_de_vendas(db, v.lead_novo)
    sem_parceiro = card_de_vendas(db, v.lead_novo, documento=CNPJ_B)
    _parceiro_trabalhando(db)

    [aviso] = client.get(f"{CARDS}/{card.id}/aviso-parcerias", headers=admin_headers).json()
    assert aviso["parceiro"] == "Dmap"
    assert client.get(f"{CARDS}/{sem_parceiro.id}/aviso-parcerias", headers=admin_headers).json() == []
```

Antes do Step 2, conferir o payload que `POST /cards/{id}/reopen` exige (`ReopenRequest` em `schemas/card.py`) e ajustar o JSON do teste, se precisar.

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: `vendas.py`**

```python
"""
Lado de Vendas da Consulta de CNPJ (Entrega 2): a faixa no card e o bloqueio
de quem cria ou vincula pela tela um card com CNPJ que um parceiro está
trabalhando (regra 3: vale o primeiro registro). Lead automático (usuário de
integração) e importação de planilha não bloqueiam. Admin e gerente passam,
e o card registra a liberação.
"""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.user import User
from app.schemas.parcerias import AvisoParceriasItem
from app.services.parcerias import acesso, semaforo
from app.services.parcerias.cnpj import so_digitos


def _cnpj_do_cliente(db: Session, client_id: Optional[int]) -> Optional[str]:
    if not client_id:
        return None
    c = db.query(Client).filter(Client.id == client_id).first()
    cnpj = so_digitos(c.document) if c else ""
    return cnpj if len(cnpj) == 14 else None


def avisos(db: Session, client_id: Optional[int]) -> List[AvisoParceriasItem]:
    cnpj = _cnpj_do_cliente(db, client_id)
    if not cnpj:
        return []
    return [AvisoParceriasItem(parceiro=r.parceiro or "", desde=r.desde)
            for r in sorted(semaforo.protecao_de_parceiro(db, cnpj), key=lambda r: r.desde)]


def conferir(db: Session, user: User, client_id: Optional[int]) -> Optional[str]:
    """
    None quando o CNPJ está livre (ou quem cria é integração). Para admin e
    gerente devolve o texto a registrar no card; para os demais responde 409.
    """
    if getattr(user, "is_integracao", False):
        return None
    lista = avisos(db, client_id)
    if not lista:
        return None
    primeiro = lista[0]
    onde = f"parceiro {primeiro.parceiro} (Programa de Parceiros) desde {primeiro.desde:%d/%m/%Y}"
    if acesso.eh_gestao(user):
        return f"Card com CNPJ do {onde}, liberado por {user.name}"
    raise HTTPException(status.HTTP_409_CONFLICT, f"Este CNPJ está com o {onde}. Fale com o gerente.")


def registrar(db: Session, card_id: int, user: User, texto: Optional[str]) -> None:
    if not texto:
        return
    from app.repositories.activity_repository import ActivityRepository
    ActivityRepository(db).create(
        card_id=card_id, user_id=user.id, activity_type="parcerias_cnpj",
        description=texto, activity_metadata={},
    )
```

- [ ] **Step 4: Hooks no `card_service.py`** (import local em cada função: `from app.services.parcerias import vendas as parcerias_vendas`)

1. **`create_card`**
   - Logo depois do bloco "Valida empresa vinculada" (que termina com o 422 de Setor e Tipo de Relacionamento, por volta da linha 803):

     ```python
     from app.services.parcerias import vendas as parcerias_vendas
     aviso_parcerias = parcerias_vendas.conferir(self.db, current_user, card_data.client_id)
     ```

   - Depois de `self.db.commit(); self.db.refresh(card)`, que vem logo após `card.created_by_id = current_user.id`:

     ```python
     parcerias_vendas.registrar(self.db, card.id, current_user, aviso_parcerias)
     ```

2. **`update_card`**: logo depois de `self._check_write_permission(card, current_user)`:

   ```python
   if "client_id" in card_data.model_fields_set and card_data.client_id and card_data.client_id != card.client_id:
       from app.services.parcerias import vendas as parcerias_vendas
       parcerias_vendas.registrar(
           self.db, card.id, current_user,
           parcerias_vendas.conferir(self.db, current_user, card_data.client_id),
       )
   ```

   Se `CardUpdate` for pydantic v1 (`__fields_set__`), usar o atributo equivalente. Conferir em `schemas/card.py`.

3. **`reopen_card`**
   - Logo depois de `original_card = self.get_card_by_id(card_id)` (linha ~2601):

     ```python
     from app.services.parcerias import vendas as parcerias_vendas
     aviso_parcerias = parcerias_vendas.conferir(self.db, current_user, original_card.client_id)
     ```

   - No bloco que vincula `client_id` no clone, depois do `self.db.refresh(new_card)` dentro do `try`:

     ```python
     parcerias_vendas.registrar(self.db, new_card.id, current_user, aviso_parcerias)
     ```

4. **`clone_card`**
   - Logo depois de `original_card = self.get_card_by_id(card_id)` (linha ~2858): a mesma conferência do item 3.
   - Depois do primeiro `self.db.commit()` que dá id ao `new_card`: `parcerias_vendas.registrar(self.db, new_card.id, current_user, aviso_parcerias)`.

- [ ] **Step 5: Rota da faixa** em `cards.py`, logo depois da função `get_card`:

```python
@router.get("/{card_id}/aviso-parcerias", summary="Parceiros trabalhando o CNPJ do card")
async def aviso_parcerias(
    card_id: int = Path(..., description="ID do card"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Faixa amarela do card: oportunidades de parceiro que protegem o CNPJ do cliente."""
    from app.services.parcerias import vendas as parcerias_vendas
    card = CardService(db).get_card_by_id(card_id, current_user)
    return parcerias_vendas.avisos(db, card.client_id)
```

Conferir o nome da classe de serviço e o import em `cards.py`. O `get_card` usa o mesmo padrão: copiar a forma de instanciar.

- [ ] **Step 6: Rodar o arquivo novo e a suíte inteira.** Expected: tudo verde.

---

### Task 7: Front — serviço, cartão do resultado, página e menu

**Files:**
- Modify: `frontend/src/services/parceriasService.ts`
- Modify: `frontend/src/constants/parcerias.ts`
- Create: `frontend/src/components/parcerias/ResultadoSemaforo.tsx`
- Create: `frontend/src/pages/parcerias/ConsultaCnpj.tsx`
- Modify: `frontend/src/router.tsx`, `frontend/src/layouts/MainLayout.tsx`

- [ ] **Step 1: Tipos e chamadas** em `parceriasService.ts`

Em `Oportunidade`, acrescentar:

```ts
  cnpj_resultado?: "verde" | "amarelo" | "vermelho" | null;
  cnpj_motivo?: string | null;
  cnpj_justificativa?: string | null;
  cnpj_liberado_por_name?: string | null;
```

Em `OportunidadeForm`, acrescentar `cnpj_justificativa?: string | null;`.

Antes de `mensagemDeErro`:

```ts
export interface RegistroSemaforo {
  tipo: "card" | "oportunidade";
  id: number;
  titulo: string;
  onde: string;
  responsavel?: string | null;
  cnpj: string;
  motivo: string;
  libera_em?: string | null;
  parceiro?: string | null;
  desde: string;
}

export interface ConsultaCnpj {
  cnpj: string;
  resultado: "verde" | "amarelo" | "vermelho";
  motivo: string;
  frase: string;
  libera_em?: string | null;
  registros: RegistroSemaforo[];
}

export interface ConsultaHistoricoItem {
  id: number;
  created_at: string;
  user_name?: string | null;
  perfil?: string | null;
  partner_name?: string | null;
  cnpj: string;
  resultado: string;
  motivo: string;
}

export interface FiltroHistorico {
  user_id?: number;
  partner_id?: number;
  desde?: string;
  ate?: string;
  pagina?: number;
}
```

Dentro do objeto `parceriasService`, no fim:

```ts
  // Consulta de CNPJ (Entrega 2)
  async consultarCnpj(cnpj: string) {
    return (await api.post<ConsultaCnpj>(`${BASE}/consulta-cnpj`, { cnpj })).data;
  },
  async consultasHoje() {
    return (await api.get<{ feitas: number; limite: number | null }>(`${BASE}/consulta-cnpj/hoje`)).data;
  },
  async historicoConsultas(filtro: FiltroHistorico) {
    return (await api.get<{ total: number; itens: ConsultaHistoricoItem[] }>(`${BASE}/consulta-cnpj/historico`, { params: filtro })).data;
  },
  async avisoParceriasDoCard(cardId: number) {
    return (await api.get<{ parceiro: string; desde: string }[]>(`/api/v1/cards/${cardId}/aviso-parcerias`)).data;
  },
```

- [ ] **Step 2: Constantes** em `constants/parcerias.ts`, no fim:

```ts
// Consulta de CNPJ: o SDR consulta mesmo sem ver os boards de Parcerias.
export const PERFIS_CONSULTA_CNPJ = ["admin", "manager", "salesperson", "sdr", "partner"];

export const SEMAFORO_COR: Record<string, string> = {
  verde: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amarelo: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  vermelho: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
};

export const SEMAFORO_LABEL: Record<string, string> = {
  verde: "Livre", amarelo: "Para análise", vermelho: "Bloqueado",
};

export const MOTIVO_SEMAFORO: Record<string, string> = {
  livre: "Livre", em_negociacao: "Em negociação", compra_recente: "Compra recente",
  perdida_recente: "Perdida há pouco", outra_unidade: "Outra unidade",
};
```

- [ ] **Step 3: `ResultadoSemaforo.tsx`**

```tsx
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { MOTIVO_SEMAFORO, SEMAFORO_COR, SEMAFORO_LABEL } from "../../constants/parcerias";
import type { ConsultaCnpj } from "../../services/parceriasService";

/** Cartão com a cor do semáforo, a frase e, para a H&S, onde a empresa está. */
export default function ResultadoSemaforo({ consulta }: { consulta: ConsultaCnpj }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${SEMAFORO_COR[consulta.resultado]}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="inline-block h-3 w-3 rounded-full bg-current" />
        {SEMAFORO_LABEL[consulta.resultado]}
      </div>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{consulta.frase}</p>
      {consulta.registros.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-current/20 pt-3">
          {consulta.registros.map((r) => (
            <li key={`${r.tipo}-${r.id}`} className="flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-white">{r.titulo}</span>
              <span>· {r.onde}</span>
              {r.responsavel && <span>· {r.responsavel}</span>}
              <span>· {MOTIVO_SEMAFORO[r.motivo]}{r.cnpj !== consulta.cnpj && " (outra unidade)"}</span>
              <Link
                to={r.tipo === "card" ? `/cards/${r.id}` : `/parcerias/oportunidades/${r.id}`}
                className="inline-flex items-center gap-0.5 text-blue-500 hover:underline"
              >
                abrir <ExternalLink size={11} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Um vendedor ou SDR sem acesso ao board de Parcerias pode clicar em "abrir" numa oportunidade e cair no redirecionamento da guarda. É aceitável, porque o link é só um atalho.

- [ ] **Step 4: Página `ConsultaCnpj.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Search, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, FormField, Input, SelectMenu } from "../../components/common";
import ResultadoSemaforo from "../../components/parcerias/ResultadoSemaforo";
import { cnpjValido, mascarar } from "../../components/parcerias/campos";
import { MOTIVO_SEMAFORO, PERFIS_GESTAO, SEMAFORO_COR, SEMAFORO_LABEL } from "../../constants/parcerias";
import { useAuth } from "../../hooks/useAuth";
import parceriasService, {
  ConsultaCnpj as Consulta, ConsultaHistoricoItem, FiltroHistorico, Parceiro, mensagemDeErro,
} from "../../services/parceriasService";
import userService from "../../services/userService";
import { showError } from "../../utils/toast";

const POR_PAGINA = 50;

export default function ConsultaCnpj() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");

  const [cnpj, setCnpj] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [resultado, setResultado] = useState<Consulta | null>(null);
  const [hoje, setHoje] = useState<{ feitas: number; limite: number | null } | null>(null);

  const [filtro, setFiltro] = useState<FiltroHistorico>({ pagina: 1 });
  const [historico, setHistorico] = useState<{ total: number; itens: ConsultaHistoricoItem[] }>({ total: 0, itens: [] });
  const [pessoas, setPessoas] = useState<{ value: string; label: string }[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);

  const carregarHoje = useCallback(() => {
    parceriasService.consultasHoje().then(setHoje).catch(() => setHoje(null));
  }, []);

  const carregarHistorico = useCallback(async () => {
    if (!gestao) return;
    try {
      setHistorico(await parceriasService.historicoConsultas(filtro));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar o histórico."));
    }
  }, [gestao, filtro]);

  useEffect(() => {
    carregarHoje();
  }, [carregarHoje]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  useEffect(() => {
    if (!gestao) return;
    userService.listActive()
      .then((us) => setPessoas(us.map((u) => ({ value: String(u.id), label: u.name }))))
      .catch(() => setPessoas([]));
    parceriasService.listarParceiros().then(setParceiros).catch(() => setParceiros([]));
  }, [gestao]);

  const consultar = async () => {
    setConsultando(true);
    try {
      setResultado(await parceriasService.consultarCnpj(cnpj));
      carregarHoje();
      carregarHistorico();
    } catch (err) {
      setResultado(null);
      showError(mensagemDeErro(err, "Erro ao consultar o CNPJ."));
    } finally {
      setConsultando(false);
    }
  };

  const invalido = cnpj.replace(/\D/g, "").length === 14 && !cnpjValido(cnpj);
  const pronto = cnpjValido(cnpj);
  const paginas = Math.max(1, Math.ceil(historico.total / POR_PAGINA));
  const mudarFiltro = (parcial: FiltroHistorico) => setFiltro({ ...filtro, ...parcial, pagina: 1 });

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900/95">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50" title="Voltar">
            <ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
          <ShieldCheck size={28} className="text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Consulta de CNPJ</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Antes de trabalhar uma empresa, veja se ela já está com a H&amp;S ou com outro parceiro.
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="flex items-end gap-2">
            <FormField label="CNPJ" error={invalido ? "CNPJ inválido" : undefined} className="flex-1">
              <Input
                value={cnpj}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                onChange={(e) => setCnpj(mascarar("cnpj", e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && pronto && consultar()}
              />
            </FormField>
            <Button onClick={consultar} loading={consultando} disabled={!pronto}>
              <Search size={16} className="mr-1" /> Consultar
            </Button>
          </div>
          {hoje?.limite != null && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Consultas hoje: {hoje.feitas} de {hoje.limite}</p>
          )}
          {resultado && <ResultadoSemaforo consulta={resultado} />}
        </div>

        {gestao && (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Histórico de consultas</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <SelectMenu
                size="sm"
                value={filtro.user_id ? String(filtro.user_id) : ""}
                options={[{ value: "", label: "Todas as pessoas" }, ...pessoas]}
                onChange={(v) => mudarFiltro({ user_id: v ? Number(v) : undefined })}
              />
              <SelectMenu
                size="sm"
                value={filtro.partner_id ? String(filtro.partner_id) : ""}
                options={[{ value: "", label: "Todos os parceiros" }, ...parceiros.map((p) => ({ value: String(p.id), label: p.name }))]}
                onChange={(v) => mudarFiltro({ partner_id: v ? Number(v) : undefined })}
              />
              <Input type="date" value={filtro.desde ?? ""} onChange={(e) => mudarFiltro({ desde: e.target.value || undefined })} />
              <Input type="date" value={filtro.ate ?? ""} onChange={(e) => mudarFiltro({ ate: e.target.value || undefined })} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-slate-500 dark:border-slate-700/50 dark:text-slate-400">
                  <tr>
                    <th className="py-2 pr-3">Quando</th>
                    <th className="py-2 pr-3">Pessoa</th>
                    <th className="py-2 pr-3">Parceiro</th>
                    <th className="py-2 pr-3">CNPJ</th>
                    <th className="py-2">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {historico.itens.map((c) => (
                    <tr key={c.id} className="text-slate-700 dark:text-slate-200">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(`${c.created_at}Z`).toLocaleString("pt-BR")}</td>
                      <td className="py-2 pr-3">{c.user_name ?? "—"}</td>
                      <td className="py-2 pr-3">{c.partner_name ?? "H&S"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{mascarar("cnpj", c.cnpj)}</td>
                      <td className="py-2">
                        <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEMAFORO_COR[c.resultado]}`}>
                          {SEMAFORO_LABEL[c.resultado]} · {MOTIVO_SEMAFORO[c.motivo]}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {historico.itens.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">Nenhuma consulta no período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>{historico.total} consulta(s)</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={(filtro.pagina ?? 1) <= 1}
                  onClick={() => setFiltro({ ...filtro, pagina: (filtro.pagina ?? 1) - 1 })}>Anterior</Button>
                <span>{filtro.pagina ?? 1} de {paginas}</span>
                <Button size="sm" variant="secondary" disabled={(filtro.pagina ?? 1) >= paginas}
                  onClick={() => setFiltro({ ...filtro, pagina: (filtro.pagina ?? 1) + 1 })}>Próxima</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

Conferir que `mascarar("cnpj", ...)` aceita o valor já mascarado (ele limpa e remonta) e que `Button` aceita `size="sm"` e `variant="secondary"`, como em `NovaOportunidadeModal`. O `created_at` vem sem fuso (UTC); o `Z` converte para a hora local.

- [ ] **Step 5: Rota e menu**

Em `router.tsx`:
- importar `ConsultaCnpj from './pages/parcerias/ConsultaCnpj'` e `PERFIS_CONSULTA_CNPJ`, de onde já vem `PERFIS_PARCERIAS`;
- criar a guarda ao lado de `ParceriasGuard`:

```tsx
const ConsultaCnpjGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    if (user && !PERFIS_CONSULTA_CNPJ.includes(user.role)) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};
```

- acrescentar, **antes** de `/parcerias/aquisicao`:

```tsx
      <Route path="/parcerias/consulta-cnpj" element={<ConsultaCnpjGuard><ConsultaCnpj /></ConsultaCnpjGuard>} />
```

Em `MainLayout.tsx`:
- importar `ShieldCheck` de `lucide-react` e `PERFIS_CONSULTA_CNPJ`;
- em `menuItems`, logo depois da linha de `/parcerias`:

```tsx
    { path: "/parcerias/consulta-cnpj", icon: ShieldCheck, label: "Consulta de CNPJ", adminOnly: false, managerOrAdminOnly: false, viewerAllowed: false },
```

- no filtro do menu, logo depois do bloco de `"/parcerias"`:

```tsx
                                if (item.path === "/parcerias/consulta-cnpj" && !PERFIS_CONSULTA_CNPJ.includes(user?.role ?? "")) {
                                    return null;
                                }
```

- trocar `if (trancado && !["/parcerias", "/settings"].includes(item.path))` por `if (trancado && !["/parcerias", "/parcerias/consulta-cnpj", "/settings"].includes(item.path))`;
- no `isActive`, o "Boards (Parcerias)" não pode acender na página da consulta. Trocar o trecho de `/parcerias` por:

```tsx
                                    (item.path === "/parcerias" &&
                                     location.pathname.startsWith("/parcerias/") &&
                                     !location.pathname.startsWith("/parcerias/consulta-cnpj"));
```

O item do SDR passa pelo filtro de "service", que não se aplica a ele. O perfil `service` não está em `PERFIS_CONSULTA_CNPJ`, então já some antes.

- [ ] **Step 6: `npx tsc --noEmit -p .`** sem erros.

---

### Task 8: Front — cadastro em 2 passos e selo no detalhe

**Files:**
- Modify: `frontend/src/components/parcerias/NovaOportunidadeModal.tsx`
- Modify: `frontend/src/pages/parcerias/OportunidadeDetalhe.tsx`

- [ ] **Step 1: Modal em 2 passos**

Em `NovaOportunidadeModal.tsx`:

1. **Imports**
   - acrescentar `import ResultadoSemaforo from "./ResultadoSemaforo";`;
   - acrescentar `cnpjValido` ao import de `./campos`;
   - acrescentar `ConsultaCnpj` ao import de `parceriasService`;
   - acrescentar `import { useAuth } from "../../hooks/useAuth";` e `import { PERFIS_GESTAO } from "../../constants/parcerias";`.

2. **Estado**, depois de `salvando`:

   ```tsx
   const { user } = useAuth();
   const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
   const [consulta, setConsulta] = useState<ConsultaCnpj | null>(null);
   const [consultando, setConsultando] = useState(false);
   ```

3. **Reset ao abrir:** no `useEffect` de `isOpen`, trocar por:

   ```tsx
   useEffect(() => {
     if (isOpen) {
       setForm(VAZIO);
       setConsulta(null);
     }
   }, [isOpen]);
   ```

4. **Função de consulta**, antes de `salvar`:

   ```tsx
   const consultar = async () => {
     setConsultando(true);
     try {
       setConsulta(await parceriasService.consultarCnpj(form.cnpj ?? ""));
     } catch (e) {
       setConsulta(null);
       showError(mensagemDeErro(e, "Erro ao consultar o CNPJ."));
     } finally {
       setConsultando(false);
     }
   };
   // Passo 2 só com consulta do CNPJ atual: verde/amarelo, ou vermelho para a gestão (com justificativa).
   const consultaValida = consulta && consulta.cnpj === (form.cnpj ?? "").replace(/\D/g, "");
   const liberado = consultaValida && (consulta.resultado !== "vermelho" || gestao);
   const precisaJustificar = consultaValida && consulta.resultado === "vermelho" && gestao;
   ```

5. **`pronto`**: acrescentar `&& !!liberado && (!precisaJustificar || !!form.cnpj_justificativa?.trim())`.

6. **JSX**
   - Tirar o `FormField` do CNPJ do meio do grid.
   - Colocar **antes** do grid um bloco de passo 1:

     ```tsx
     <div className="mb-4 space-y-3">
       <div className="flex items-end gap-2">
         <FormField label="CNPJ da empresa" required error={erros.cnpj} className="flex-1">
           <Input {...texto("cnpj")} placeholder="00.000.000/0000-00" />
         </FormField>
         <Button onClick={consultar} loading={consultando} disabled={!cnpjValido(form.cnpj ?? "")}>Consultar</Button>
       </div>
       {consultaValida && <ResultadoSemaforo consulta={consulta} />}
       {precisaJustificar && (
         <FormField label="Justificativa para cadastrar mesmo assim" required hint={`${(form.cnpj_justificativa ?? "").length}/500`}>
           <Textarea value={form.cnpj_justificativa ?? ""} maxLength={500} rows={2}
             onChange={(e) => setForm({ ...form, cnpj_justificativa: e.target.value })} />
         </FormField>
       )}
     </div>
     ```

   - Envolver o grid em `{liberado && ( ... )}`.

7. **Subtítulo** do modal: `"Consulte o CNPJ primeiro. Entra em Novo Lead com a elegibilidade Em análise."`.

O `salvar` já manda o form inteiro, incluindo `cnpj_justificativa`, que fica nulo quando vazio.

- [ ] **Step 2: Selo no detalhe da oportunidade**

Em `OportunidadeDetalhe.tsx`:
- importar `MOTIVO_SEMAFORO, SEMAFORO_COR, SEMAFORO_LABEL` de `constants/parcerias`;
- dentro da seção "Elegibilidade", logo antes do `<div>` que mostra o selo `ELEGIBILIDADE_COR`, acrescentar:

```tsx
              {op.cnpj_resultado && user?.role !== "partner" && (
                <div className={`rounded-lg border px-3 py-2 text-xs ${SEMAFORO_COR[op.cnpj_resultado]}`}>
                  <div className="font-semibold">
                    CNPJ no cadastro: {SEMAFORO_LABEL[op.cnpj_resultado]} · {MOTIVO_SEMAFORO[op.cnpj_motivo ?? ""] ?? ""}
                  </div>
                  {op.cnpj_resultado === "amarelo" && <p className="mt-0.5">Outra unidade em negociação — analisar.</p>}
                  {op.cnpj_justificativa && (
                    <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                      Liberado por {op.cnpj_liberado_por_name}: {op.cnpj_justificativa}
                    </p>
                  )}
                </div>
              )}
```

- [ ] **Step 3: `npx tsc --noEmit -p .`** sem erros.

---

### Task 9: Front — faixa no card de Vendas e mensagens de erro

**Files:**
- Create: `frontend/src/components/cardDetails/AvisoParcerias.tsx`
- Modify: `frontend/src/pages/CardDetails.tsx`
- Modify: `frontend/src/pages/KanbanBoard.tsx:1069-1071`
- Modify: `frontend/src/components/cardDetails/ClientSection.tsx:155-157`
- Modify: `frontend/src/pages/CardDetails.tsx:335-336`

- [ ] **Step 1: Componente da faixa**

```tsx
import { useEffect, useState } from "react";
import { Handshake } from "lucide-react";
import parceriasService from "../../services/parceriasService";

/** Faixa amarela no card de Vendas quando um parceiro está trabalhando o CNPJ do cliente. */
export default function AvisoParcerias({ cardId, clientId }: { cardId: number; clientId?: number | null }) {
  const [avisos, setAvisos] = useState<{ parceiro: string; desde: string }[]>([]);

  useEffect(() => {
    if (!clientId) {
      setAvisos([]);
      return;
    }
    parceriasService.avisoParceriasDoCard(cardId).then(setAvisos).catch(() => setAvisos([]));
  }, [cardId, clientId]);

  if (!avisos.length) return null;
  return (
    <div className="flex-shrink-0 border-b border-amber-500/40 bg-amber-500/10 px-6 py-2 text-sm text-amber-700 dark:text-amber-300">
      {avisos.map((a) => (
        <div key={`${a.parceiro}-${a.desde}`} className="flex items-center gap-2">
          <Handshake size={16} />
          CNPJ registrado pelo parceiro <strong>{a.parceiro}</strong> em{" "}
          {new Date(`${a.desde}Z`).toLocaleDateString("pt-BR")} (Programa de Parceiros).
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Usar no `CardDetails.tsx`**
  - Importar `AvisoParcerias from "../components/cardDetails/AvisoParcerias";`.
  - Logo depois de `<div className="flex h-full flex-col ...">` e antes de `{/* ========== HEADER FIXO ========== */}`:

```tsx
      <AvisoParcerias cardId={card.id} clientId={card.client_id} />
```

Conferir que o tipo `Card` tem `client_id`; se o campo tiver outro nome no tipo, usar o do tipo.

- [ ] **Step 3: Mostrar a mensagem do backend nos erros**
  - **`KanbanBoard.tsx`:**
    - trocar `} catch (error) {` por `} catch (error: any) {`;
    - trocar `showError("Erro ao salvar card");` por `showError(error?.response?.data?.detail || "Erro ao salvar card");`.
  - **`ClientSection.tsx`**, no catch do vincular (linha ~155):
    - trocar `} catch (error) {` por `} catch (error: any) {`;
    - trocar `showError("Erro ao vincular cliente");` por `showError(error?.response?.data?.detail || "Erro ao vincular cliente");`.
  - **`CardDetails.tsx`**, no clone:
    - trocar `} catch {` por `} catch (error: any) {`;
    - trocar `showError("Erro ao clonar o card. Tente novamente.");` por `showError(error?.response?.data?.detail || "Erro ao clonar o card. Tente novamente.");`.

Garantir que só uma string vai para o `showError`. O `detail` do 409 é string; o de 422 pode ser lista, mas esses fluxos já mandavam texto fixo antes.

- [ ] **Step 4: `npx tsc --noEmit -p . && npm run build`** sem erros.

---

### Task 10: Changelog, versão e verificação final

**Files:**
- Modify: `CHANGELOG.md` (seção 1.11.5)
- Modify: `frontend/src/components/common/ChangelogModal.tsx` (entrada 1.11.5)

- [ ] **Step 1: CHANGELOG.md**

Na seção `## [1.11.5] — 03/11/2026`, antes de `### Alterado`, acrescentar:

```markdown
### Adicionado
- **Consulta de CNPJ (semáforo) do Programa de Parceiros:** antes de registrar uma oportunidade, o parceiro consulta o CNPJ e recebe uma cor.
  - 🔴 **Em negociação:** card de Vendas ou oportunidade de parceiro aberta e protegida. A proteção cai quando a atividade em aberto fica atrasada há mais de 10 dias e nada aconteceu no card nesse tempo; atividade agendada para o futuro mantém a proteção.
  - 🔴 **Compra recente:** ganho há menos de 30 dias.
  - 🔴 **Perdida há pouco:** perdido há menos de 90 dias, com a data em que libera.
  - 🟡 **Outra unidade:** outra filial da mesma empresa, com os 8 primeiros dígitos do CNPJ iguais, em negociação; entra para análise.
  - 🟢 **Livre.**
  - O parceiro vê só a cor e a frase. Vendedor, SDR, admin e gerente veem onde a empresa está.
  - No cadastro da oportunidade, o CNPJ é o primeiro passo. O vermelho bloqueia; admin e gerente cadastram mesmo assim com justificativa, que fica no histórico. Serviço não entra na conta, e oportunidade Rejeitada não protege.
- **Página "Consulta de CNPJ"** no menu, para parceiro, vendedor, SDR, admin e gerente. O parceiro tem limite de 20 consultas por dia. Admin e gerente veem o histórico de quem consultou, com filtros por pessoa, parceiro e período.
- **Vendas:**
  - o card cujo CNPJ está com um parceiro mostra uma faixa amarela ("CNPJ registrado pelo parceiro X em DD/MM");
  - criar, vincular cliente, clonar ou reabrir um card com esse CNPJ é bloqueado para vendedor e SDR ("fale com o gerente");
  - admin e gerente passam, e o card registra a liberação;
  - leads do site e do RD Station e importação de planilha não são bloqueados.

### Banco
- Migration `3d4e5f6a7b8c` (depois de `2c3d4e5f6a7b`): tabela `cnpj_consultas` e as colunas `cnpj_resultado`, `cnpj_motivo`, `cnpj_liberado_por_id` e `cnpj_justificativa` em `partner_opportunities`. Rodar no homo depois de subir o backend.
```

- [ ] **Step 2: ChangelogModal**

Na entrada `version: "1.11.5"`, acrescentar no início de `entries`:

```ts
      {
        type: "feature",
        text: "Parcerias: Consulta de CNPJ em semáforo. Antes de registrar uma oportunidade, o parceiro vê se a empresa está livre, com outra unidade em negociação ou bloqueada (em negociação, compra recente ou perdida há pouco). A página Consulta de CNPJ fica no menu para parceiros, vendedores e SDRs, com histórico para admin e gerente.",
      },
      {
        type: "improvement",
        text: "Vendas: o card cujo CNPJ está com um parceiro mostra uma faixa amarela, e vendedor e SDR não conseguem criar ou vincular um card com esse CNPJ sem o gerente.",
      },
```

- [ ] **Step 3: Verificação completa**

- Backend inteiro: `... pytest tests -q ...`. Expected: todos passando; o total vai acima de 999.
- Front: `npx tsc --noEmit -p . && npm run build`. Expected: sem erros.

- [ ] **Step 4: Pedir ok ao usuário para commitar.**

Proposta de commits:
1. `feat(parcerias): consulta de CNPJ em semaforo (v1.11.5)`: backend, front e changelog.
2. `docs(parcerias): plano da Entrega 2`: este arquivo.

Lembrar o usuário de rodar a migration `3d4e5f6a7b8c` no homo.

- [ ] **Step 5: Memória.** Atualizar `projeto-parcerias.md` com o estado. Em `projeto-cadencia-servico-cobranca.md`, anotar que o `down_revision` da cadência passa a ser `3d4e5f6a7b8c`.
