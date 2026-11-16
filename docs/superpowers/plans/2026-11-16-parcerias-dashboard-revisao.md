# Dashboard de Parcerias no padrão dos outros — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** deixar o Dashboard de Parcerias com a mesma estrutura dos dashboards de SDR, Vendas e
Serviços:
- visão geral;
- evolução e pipeline lado a lado;
- conversão;
- atenção e riscos.

Cada perfil continua vendo só os próprios números.

**Architecture:**
- Um módulo novo, `dashboard_secoes.py`, faz as contas das seções novas sobre um
  `Escopo(partner_ids, seller_member_id)`.
- `dashboard.py` monta o escopo de cada perfil e junta as seções na resposta que já existe de
  `GET /parcerias/dashboard`.
- O front reorganiza `DashboardParcerias.tsx` em seções, copiando o visual de
  `DashboardVendedor.tsx`.
- Não há migration.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic v2, pytest (SQLite), React 19, TS, Recharts e Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-16-parcerias-dashboard-revisao-design.md`

**Regras do projeto (valem para todas as tarefas):**
- Código, comentários e textos em português.
- **Nunca commitar sem perguntar "posso commitar?" ao usuário.** Os passos de commit abaixo só
  rodam com o OK dele.
- Commits: conventional, sem acentos, terminando com
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Os testes rodam no container local, que aponta para o banco de produção. Os testes usam
  SQLite em memória, então não tocam nele. Nunca rodar `alembic upgrade` no container.
- Comando de teste (`<alvo>` = arquivo ou `arquivo::Classe::teste`):
  `cd backend && MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest <alvo> -q -p no:cacheprovider --color=no`
- Os testes com a fixture `client` levam cerca de 55 s cada. Os testes novos usam só `db`.

---

## Mapa de arquivos

| Arquivo | O que muda |
|---|---|
| `backend/app/services/notificacoes/parcerias.py` | `dia_local`, `convidado_desde` e `prazos_em_aberto` públicos, para o dashboard usar a mesma conta dos alertas |
| `backend/app/services/parcerias/dashboard_secoes.py` (novo) | `Escopo`, `resumo_e_pipeline`, `conversao` e `riscos` |
| `backend/app/services/parcerias/dashboard.py` | `_evolucao` (6 meses) no lugar de `_serie`/`serie_mensal`; cada `painel_*` junta as seções |
| `backend/app/schemas/parcerias.py` | Schemas novos; as 4 visões trocam `serie` por `evolucao` e ganham as seções |
| `backend/tests/unit/test_parcerias_dashboard_secoes.py` (novo) | Testes de serviço das seções e dos perfis |
| `backend/tests/unit/test_parcerias_dashboard_externos.py` e `test_parcerias_dashboard_hs.py` | `serie` → `evolucao` |
| `frontend/src/services/parceriasService.ts` | Tipos novos |
| `frontend/src/components/dashboard/DashboardParcerias.tsx` | Seções no padrão dos outros dashboards |
| `CHANGELOG.md`, `frontend/src/components/common/ChangelogModal.tsx`, `frontend/src/layouts/MainLayout.tsx`, `docs/programa-de-parceiros.md` | Versão 1.11.27 e documentação |

---

### Task 1: Tornar públicas as contas dos alertas

**Files:**
- Modify: `backend/app/services/notificacoes/parcerias.py`
- Test: `backend/tests/unit/test_parcerias_alertas.py` (já existe; só rodar)

- [ ] **Step 1: Renomear `_dia_local` e `_convidado_desde`**

```bash
cd backend && sed -i 's/\b_dia_local\b/dia_local/g; s/\b_convidado_desde\b/convidado_desde/g' app/services/notificacoes/parcerias.py
grep -rn "_dia_local\|_convidado_desde" app tests
```
Esperado: o `grep` não acha nada.

- [ ] **Step 2: Docstring do `dia_local`**

Trocar:
```python
def dia_local(quando: datetime):
    return (quando + BRASILIA).date()
```
por:
```python
def dia_local(quando: datetime):
    """Dia do calendário de São Paulo (o dashboard usa a mesma conta)."""
    return (quando + BRASILIA).date()
```

- [ ] **Step 3: Extrair `prazos_em_aberto`**

No import do `typing`, trocar `from typing import List, Optional` por `from typing import Dict, List, Optional`.

Logo antes de `def avisar_protecao`, acrescentar:
```python
def prazos_em_aberto(db: Session, ids: List[int]) -> Dict[int, List[Optional[datetime]]]:
    """Prazos das atividades em aberto de cada oportunidade (o que segura a proteção)."""
    prazos: Dict[int, List[Optional[datetime]]] = {}
    if not ids:
        return prazos
    for op_id, prazo in db.query(PartnerActivity.opportunity_id, PartnerActivity.due_date).filter(
        PartnerActivity.opportunity_id.in_(ids),
        PartnerActivity.category == "atividade",
        PartnerActivity.is_completed.is_(False),
    ).all():
        prazos.setdefault(op_id, []).append(prazo)
    return prazos
```

Dentro de `avisar_protecao`, trocar:
```python
    prazos = {}
    for a in db.query(PartnerActivity).filter(
        PartnerActivity.opportunity_id.in_([o.id for o in ops]),
        PartnerActivity.category == "atividade",
        PartnerActivity.is_completed.is_(False),
    ).all():
        prazos.setdefault(a.opportunity_id, []).append(a.due_date)
```
por:
```python
    prazos = prazos_em_aberto(db, [o.id for o in ops])
```

- [ ] **Step 4: Rodar os testes dos alertas**

Alvo: `tests/unit/test_parcerias_alertas.py tests/unit/test_notificacoes_limpeza_e_agenda.py`
Esperado: todos passam (os 28 dos alertas e os do agendador).

---

### Task 2: `Escopo`, resumo e pipeline

**Files:**
- Create: `backend/app/services/parcerias/dashboard_secoes.py`
- Create: `backend/tests/unit/test_parcerias_dashboard_secoes.py`

- [ ] **Step 1: Escrever os testes**

Criar `backend/tests/unit/test_parcerias_dashboard_secoes.py`:
```python
"""Dashboard de Parcerias: seções no padrão dos outros dashboards (spec 2026-11-16)."""
from datetime import date, datetime, timedelta
from types import SimpleNamespace

from pydantic import TypeAdapter

from app.models.cnpj_rules_config import CnpjRulesConfig
from app.models.partner import PartnerTeamMember
from app.models.partner_activity import PartnerActivity
from app.schemas.parcerias import DashboardResponse
from app.services.parcerias import dashboard
from app.services.parcerias import dashboard_secoes as secoes
from tests.unit.apoio_parcerias import (
    config_comissoes, hunter, oportunidade, oportunidade_ganha, parceiro, usuario,
)

AGORA = datetime(2026, 11, 16, 15, 0)  # 12h em São Paulo
DE, ATE = date(2026, 11, 1), date(2026, 11, 16)


def _dia(n: float) -> datetime:
    return AGORA - timedelta(days=n)


def _op(db, p, etapa="novo_lead", valor=None, criada_ha=1, **campos):
    """Oportunidade criada há N dias; com `valor`, leva um produto desse preço."""
    campos.setdefault("created_at", _dia(criada_ha))
    if valor is None:
        return oportunidade(db, p, stage=etapa, **campos)
    campos.setdefault("won_at", None)
    return oportunidade_ganha(db, p, valor, stage=etapa, **campos)


def _escopo(*parceiros, membro=None):
    return secoes.Escopo(tuple(p.id for p in parceiros), membro.id if membro else None)


class TestResumoEPipeline:

    def test_abertas_por_etapa_e_novas_no_periodo(self, db):
        a = parceiro(db, "A")
        _op(db, a, "novo_lead", criada_ha=2)
        _op(db, a, "proposta", valor=1000, criada_ha=40)  # criada em outubro
        _op(db, a, "proposta", valor=500, criada_ha=3, eligibility_status="rejeitada")
        _op(db, a, "perdido", criada_ha=5, lost_at=_dia(1))
        _op(db, a, "ganho", valor=2000, criada_ha=10, modality="venda", won_confirmed_at=_dia(1))

        resumo, pipeline = secoes.resumo_e_pipeline(db, _escopo(a), DE, ATE)

        assert resumo == {"novas": 4, "em_negociacao": {"quantidade": 2, "valor": "1000.00"}}
        assert [(e["etapa"], e["quantidade"], e["valor"]) for e in pipeline] == [
            ("novo_lead", 1, "0.00"), ("oportunidade", 0, "0.00"), ("proposta", 1, "1000.00"),
            ("negociacao", 0, "0.00"), ("aguardando_pedido", 0, "0.00"),
        ]
        assert pipeline[0]["nome"] == "Novo Lead"

    def test_excluida_e_outro_parceiro_ficam_de_fora(self, db):
        a, b = parceiro(db, "A"), parceiro(db, "B")
        _op(db, a, "proposta", valor=100, is_deleted=True)
        _op(db, b, "proposta", valor=300)

        resumo, _ = secoes.resumo_e_pipeline(db, _escopo(a), DE, ATE)

        assert resumo == {"novas": 0, "em_negociacao": {"quantidade": 0, "valor": "0.00"}}

    def test_vendedor_da_equipe_so_as_dele(self, db):
        a = parceiro(db, "A")
        m1 = PartnerTeamMember(partner_id=a.id, name="Ana")
        m2 = PartnerTeamMember(partner_id=a.id, name="Beto")
        db.add_all([m1, m2])
        db.commit()
        _op(db, a, "proposta", valor=1000, seller_member_id=m1.id)
        _op(db, a, "proposta", valor=300, seller_member_id=m2.id)

        resumo, _ = secoes.resumo_e_pipeline(db, _escopo(a, membro=m1), DE, ATE)

        assert resumo["em_negociacao"] == {"quantidade": 1, "valor": "1000.00"}
```

- [ ] **Step 2: Rodar e ver falhar**

Alvo: `tests/unit/test_parcerias_dashboard_secoes.py`
Esperado: erro de import (`dashboard_secoes` não existe).

- [ ] **Step 3: Criar o módulo**

Criar `backend/app/services/parcerias/dashboard_secoes.py`:
```python
"""
Seções do Dashboard de Parcerias no padrão dos outros dashboards (spec 2026-11-16):
visão geral, pipeline por etapa, conversão e atenção/riscos.

Cada função recebe o escopo de oportunidades do perfil e só conta o que está nele.
Valor = produtos − desconto geral, sem frete (a mesma base do "valor vendido").
"""
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional, Sequence, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.partner_opportunity import PartnerOpportunity
from app.services.parcerias import comissoes, respostas
from app.services.parcerias.etapas import ETAPAS_OPORTUNIDADE

ZERO = Decimal("0.00")
FECHADAS = ("ganho", "perdido")
ETAPAS_ABERTAS = tuple(e for e in ETAPAS_OPORTUNIDADE if e.codigo not in FECHADAS)


@dataclass(frozen=True)
class Escopo:
    """Quais oportunidades o perfil vê: as dos parceiros e, se houver, só as do membro."""
    partner_ids: Tuple[int, ...]
    seller_member_id: Optional[int] = None

    def filtrar(self, q):
        q = q.filter(PartnerOpportunity.is_deleted.is_(False),
                     PartnerOpportunity.partner_id.in_(self.partner_ids or (-1,)))
        if self.seller_member_id is not None:
            q = q.filter(PartnerOpportunity.seller_member_id == self.seller_member_id)
        return q


def _txt(valor) -> str:
    return f"{Decimal(valor or 0).quantize(comissoes.CENTAVO):.2f}"


def _no_periodo(q, coluna, de: Optional[date], ate: Optional[date]):
    """Dias de calendário de São Paulo, inclusivos (a mesma regra das vendas)."""
    inicio, fim = comissoes._limites_utc(de, ate)
    if inicio is not None:
        q = q.filter(coluna >= inicio)
    if fim is not None:
        q = q.filter(coluna < fim)
    return q


def abertas(db: Session, escopo: Escopo) -> List[PartnerOpportunity]:
    """Em negociação agora: etapa aberta e elegibilidade não rejeitada."""
    return escopo.filtrar(db.query(PartnerOpportunity)).filter(
        PartnerOpportunity.stage.notin_(FECHADAS),
        PartnerOpportunity.eligibility_status != "rejeitada",
    ).all()


def _valores(db: Session, ops: Sequence[PartnerOpportunity]) -> Dict[int, Decimal]:
    totais = respostas.totais_de_produtos(db, [o.id for o in ops])
    return {o.id: max(ZERO, respostas.produtos_menos_desconto(totais.get(o.id, ZERO), o)) for o in ops}


def resumo_e_pipeline(db: Session, escopo: Escopo, de: Optional[date],
                      ate: Optional[date]) -> Tuple[dict, List[dict]]:
    """(resumo, pipeline): novas no período, em negociação agora e as 5 etapas abertas."""
    ops = abertas(db, escopo)
    valores = _valores(db, ops)
    por_etapa = {e.codigo: [0, ZERO] for e in ETAPAS_ABERTAS}
    for o in ops:
        conta = por_etapa.get(o.stage)
        if conta is not None:
            conta[0] += 1
            conta[1] += valores[o.id]
    novas = _no_periodo(escopo.filtrar(db.query(func.count(PartnerOpportunity.id))),
                        PartnerOpportunity.created_at, de, ate).scalar() or 0
    resumo = {"novas": novas,
              "em_negociacao": {"quantidade": len(ops), "valor": _txt(sum(valores.values(), ZERO))}}
    pipeline = [{"etapa": e.codigo, "nome": e.nome, "quantidade": por_etapa[e.codigo][0],
                 "valor": _txt(por_etapa[e.codigo][1])} for e in ETAPAS_ABERTAS]
    return resumo, pipeline
```

- [ ] **Step 4: Rodar e ver passar**

Alvo: `tests/unit/test_parcerias_dashboard_secoes.py::TestResumoEPipeline`
Esperado: 3 passam.

---

### Task 3: Conversão

**Files:**
- Modify: `backend/app/services/parcerias/dashboard_secoes.py`
- Modify: `backend/tests/unit/test_parcerias_dashboard_secoes.py`

- [ ] **Step 1: Escrever os testes**

Acrescentar ao fim do arquivo de testes:
```python
class TestConversao:

    def test_taxas_e_tempo_medio(self, db):
        a = parceiro(db, "A")
        _op(db, a, "ganho", valor=2000, criada_ha=10, modality="venda", won_confirmed_at=_dia(1),
            eligibility_status="validada", eligibility_at=_dia(8))
        # Locação também é negócio fechado: entra no fechamento (mas não no card de vendas).
        _op(db, a, "ganho", valor=900, criada_ha=5, modality="locacao", won_confirmed_at=_dia(2),
            eligibility_status="validada", eligibility_at=_dia(4))
        _op(db, a, "perdido", criada_ha=5, lost_at=_dia(1),
            eligibility_status="rejeitada", eligibility_at=_dia(4))
        _op(db, a, "perdido", criada_ha=60, lost_at=_dia(45))  # perdida em outubro
        _op(db, a, "proposta", criada_ha=50, eligibility_status="validada", eligibility_at=_dia(40))
        _op(db, a, "ganho", valor=100, criada_ha=3, modality="venda")  # ganho sem confirmação

        assert secoes.conversao(db, _escopo(a), DE, ATE) == {
            "ganhos": 2, "perdidos": 1, "taxa_fechamento": 66.7,
            "validadas": 2, "rejeitadas": 1, "taxa_elegibilidade": 66.7,
            "tempo_medio_ganho_dias": 6.0,  # (9 + 3) / 2
        }

    def test_sem_base_fica_none(self, db):
        a = parceiro(db, "A")
        _op(db, a, "proposta")

        c = secoes.conversao(db, _escopo(a), DE, ATE)

        assert c["ganhos"] == 0
        assert c["taxa_fechamento"] is None
        assert c["taxa_elegibilidade"] is None
        assert c["tempo_medio_ganho_dias"] is None
```

- [ ] **Step 2: Rodar e ver falhar**

Alvo: `tests/unit/test_parcerias_dashboard_secoes.py::TestConversao`
Esperado: `AttributeError: module ... has no attribute 'conversao'`.

- [ ] **Step 3: Implementar**

Acrescentar ao fim de `dashboard_secoes.py`:
```python
def _taxa(parte: int, todo: int) -> Optional[float]:
    return round(100 * parte / todo, 1) if todo else None


def conversao(db: Session, escopo: Escopo, de: Optional[date], ate: Optional[date]) -> dict:
    """
    Taxas sem histórico de etapas (a mudança de etapa só fica gravada como texto):
    fechamento = ganhos ÷ (ganhos + perdidos); elegibilidade = validadas ÷ (validadas +
    rejeitadas); tempo médio do cadastro até o ganho confirmado. Tudo no período.
    """
    base = escopo.filtrar(db.query(PartnerOpportunity))
    ganhas = _no_periodo(base.filter(PartnerOpportunity.won_confirmed_at.isnot(None)),
                         PartnerOpportunity.won_confirmed_at, de, ate).all()
    perdidos = _no_periodo(base.filter(PartnerOpportunity.stage == "perdido"),
                           PartnerOpportunity.lost_at, de, ate).count()

    def elegibilidade(situacao: str) -> int:
        return _no_periodo(base.filter(PartnerOpportunity.eligibility_status == situacao),
                           PartnerOpportunity.eligibility_at, de, ate).count()

    validadas, rejeitadas = elegibilidade("validada"), elegibilidade("rejeitada")
    dias = [(o.won_confirmed_at - o.created_at).total_seconds() / 86400
            for o in ganhas if o.created_at is not None]
    return {
        "ganhos": len(ganhas), "perdidos": perdidos,
        "taxa_fechamento": _taxa(len(ganhas), len(ganhas) + perdidos),
        "validadas": validadas, "rejeitadas": rejeitadas,
        "taxa_elegibilidade": _taxa(validadas, validadas + rejeitadas),
        "tempo_medio_ganho_dias": round(sum(dias) / len(dias), 1) if dias else None,
    }
```

- [ ] **Step 4: Rodar e ver passar**

Alvo: `tests/unit/test_parcerias_dashboard_secoes.py`
Esperado: 5 passam.

---

### Task 4: Atenção e riscos

**Files:**
- Modify: `backend/app/services/parcerias/dashboard_secoes.py`
- Modify: `backend/tests/unit/test_parcerias_dashboard_secoes.py`

- [ ] **Step 1: Escrever os testes**

Acrescentar ao fim do arquivo de testes:
```python
def _atividade(db, op, prazo, **campos):
    db.add(PartnerActivity(partner_id=op.partner_id, opportunity_id=op.id, category="atividade",
                           title=campos.pop("title", "Ligar"), due_date=prazo, **campos))
    db.commit()


class TestRiscos:

    def test_protecao_3_dias_entra_4_nao_e_perdida_nao(self, db):
        a = parceiro(db, "A")
        entra = _op(db, a, "proposta", criada_ha=7, title="Entra")
        _op(db, a, "proposta", criada_ha=6, title="Quatro dias")
        _op(db, a, "proposta", criada_ha=11, title="Já perdeu")
        _op(db, a, "ganho", criada_ha=8, title="Fechada")

        r = secoes.riscos(db, _escopo(a), AGORA)

        assert set(r) == {"protecao", "atividades_vencidas"}
        assert r["protecao"]["total"] == 1
        [item] = r["protecao"]["itens"]
        assert item["id"] == entra.id
        assert item["detalhe"] == "Perde a proteção em 3 dias"
        assert item["empresa"] == "Empresa A"
        assert item["quando"] == AGORA + timedelta(days=3)
        assert item["link"] == f"/parcerias/oportunidades/{entra.id}"

    def test_parceiro_bloqueado_e_regra_desligada_nao_entram(self, db):
        b = parceiro(db, "B", stage="bloqueado")
        _op(db, b, "proposta", criada_ha=7)
        assert secoes.riscos(db, _escopo(b), AGORA)["protecao"]["total"] == 0

        a = parceiro(db, "A")
        _op(db, a, "proposta", criada_ha=7)
        db.add(CnpjRulesConfig(protection_days=0))
        db.commit()
        assert secoes.riscos(db, _escopo(a), AGORA)["protecao"]["total"] == 0

    def test_atividades_vencidas(self, db):
        a = parceiro(db, "A")
        op = _op(db, a, "proposta", criada_ha=2)
        _atividade(db, op, AGORA - timedelta(hours=30))
        _atividade(db, op, AGORA - timedelta(hours=5))
        _atividade(db, op, AGORA + timedelta(days=1), title="Futura")
        _atividade(db, op, _dia(3), title="Feita", is_completed=True)

        r = secoes.riscos(db, _escopo(a), AGORA)

        [item] = r["atividades_vencidas"]["itens"]
        assert item["id"] == op.id
        assert item["detalhe"] == "2 atividades vencidas"
        assert item["quando"] == AGORA - timedelta(hours=30)
        assert r["protecao"]["total"] == 0  # a atividade futura segura a proteção

    def test_riscos_so_da_hs(self, db):
        a = parceiro(db, "A")
        g = _op(db, a, "ganho", criada_ha=4, won_at=_dia(1), eligibility_status="validada")
        n = _op(db, a, "novo_lead", criada_ha=2)
        _op(db, a, "perdido", criada_ha=2)  # em análise, mas perdida
        velho = parceiro(db, "Convidado velho", stage="convidado", terms_accepted_at=None)
        novo = parceiro(db, "Convidado novo", stage="convidado", terms_accepted_at=None)
        for p, dias in ((velho, 25), (novo, 10)):
            login = usuario(db, "partner", f"p{p.id}@x.com", partner=p)
            login.created_at = _dia(dias)
        db.commit()

        r = secoes.riscos(db, _escopo(a, velho, novo), AGORA, da_hs=True)

        assert [i["id"] for i in r["ganho_a_confirmar"]["itens"]] == [g.id]
        assert [i["id"] for i in r["elegibilidade_em_analise"]["itens"]] == [n.id]
        [c] = r["convites"]["itens"]
        assert c["id"] == velho.id
        assert c["detalhe"] == "Convidado há 25 dias"
        assert c["link"] == f"/parcerias/aquisicao/{velho.id}"

    def test_lista_corta_em_50_mas_conta_todas(self, db):
        a = parceiro(db, "A")
        for _ in range(secoes.MAX_ITENS_RISCO + 2):
            _op(db, a, "novo_lead", criada_ha=1)

        r = secoes.riscos(db, _escopo(a), AGORA, da_hs=True)

        assert r["elegibilidade_em_analise"]["total"] == secoes.MAX_ITENS_RISCO + 2
        assert len(r["elegibilidade_em_analise"]["itens"]) == secoes.MAX_ITENS_RISCO
```

- [ ] **Step 2: Rodar e ver falhar**

Alvo: `tests/unit/test_parcerias_dashboard_secoes.py::TestRiscos`
Esperado: `AttributeError: ... 'riscos'`.

- [ ] **Step 3: Implementar**

Trocar o bloco de imports do topo de `dashboard_secoes.py` (de `from dataclasses ...` até
`from app.services.parcerias.etapas ...`) por:
```python
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional, Sequence, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.partner_opportunity import PartnerOpportunity
from app.services.notificacoes import parcerias as alertas
from app.services.parcerias import comissoes, regras_cnpj, respostas
from app.services.parcerias.etapas import ETAPAS_OPORTUNIDADE
from app.services.parcerias.semaforo import _naive, data_de_queda
```

Acrescentar ao fim do arquivo:
```python
# ─── Atenção · riscos ────────────────────────────────────────────────────────

MAX_ITENS_RISCO = 50


def _item(o: PartnerOpportunity, detalhe: str, quando: Optional[datetime]) -> dict:
    return {"id": o.id, "titulo": o.title, "empresa": o.company_name, "detalhe": detalhe,
            "quando": quando, "link": f"/parcerias/oportunidades/{o.id}"}


def _lista(pares: List[Tuple[datetime, dict]]) -> dict:
    """pares = [(ordem, item)] → {total, itens}, na ordem, até MAX_ITENS_RISCO itens."""
    itens = [i for _, i in sorted(pares, key=lambda par: (par[0], par[1]["id"]))]
    return {"total": len(itens), "itens": itens[:MAX_ITENS_RISCO]}


def _texto_queda(faltam: int) -> str:
    if faltam == 0:
        return "Perde a proteção hoje"
    return "Perde a proteção em 1 dia" if faltam == 1 else f"Perde a proteção em {faltam} dias"


def _texto_vencidas(n: int) -> str:
    return "1 atividade vencida" if n == 1 else f"{n} atividades vencidas"


def riscos(db: Session, escopo: Escopo, agora: datetime, da_hs: bool = False) -> dict:
    """
    Proteção do CNPJ caindo em até 3 dias (a mesma conta dos alertas) e atividades
    vencidas, para todos; ganho a confirmar, elegibilidade em análise e convites
    sem ativação, só para a H&S.
    """
    ops = abertas(db, escopo)
    prazos = alertas.prazos_em_aberto(db, [o.id for o in ops])
    dias = regras_cnpj.regras(db).protecao
    hoje = alertas.dia_local(agora)
    protecao, vencidas = [], []
    for o in ops:
        meus = prazos.get(o.id, [])
        bloqueado = o.partner is not None and o.partner.stage == "bloqueado"
        if dias > 0 and not bloqueado:
            cai = data_de_queda(meus, [o.last_activity_at, o.created_at], dias=dias)
            if cai is not None and cai >= agora:
                faltam = (alertas.dia_local(cai) - hoje).days
                if faltam <= alertas.AVISO_ANTES_DIAS:
                    protecao.append((cai, _item(o, _texto_queda(faltam), cai)))
        atrasadas = sorted(_naive(p) for p in meus if p is not None and _naive(p) < agora)
        if atrasadas:
            vencidas.append((atrasadas[0], _item(o, _texto_vencidas(len(atrasadas)), atrasadas[0])))
    saida = {"protecao": _lista(protecao), "atividades_vencidas": _lista(vencidas)}
    if da_hs:
        saida.update(_riscos_da_hs(db, escopo, agora))
    return saida


def _riscos_da_hs(db: Session, escopo: Escopo, agora: datetime) -> dict:
    base = escopo.filtrar(db.query(PartnerOpportunity))
    ganho = base.filter(PartnerOpportunity.stage == "ganho",
                        PartnerOpportunity.won_confirmed_at.is_(None)).all()
    analise = base.filter(PartnerOpportunity.eligibility_status == "em_analise",
                          PartnerOpportunity.stage != "perdido").all()
    return {
        "ganho_a_confirmar": _lista([(o.won_at or o.created_at,
                                      _item(o, "Ganho marcado, falta confirmar", o.won_at)) for o in ganho]),
        "elegibilidade_em_analise": _lista([(o.created_at, _item(o, "Aguardando a validação", o.created_at))
                                            for o in analise]),
        "convites": _lista(_convites(db, escopo.partner_ids, agora)),
    }


def _convites(db: Session, partner_ids: Sequence[int], agora: datetime) -> List[Tuple[datetime, dict]]:
    """Convidados há 23 dias ou mais sem aceitar os termos (a mesma conta dos alertas)."""
    hoje = alertas.dia_local(agora)
    pares = []
    for p in db.query(Partner).filter(Partner.is_deleted.is_(False), Partner.stage == "convidado",
                                      Partner.id.in_(tuple(partner_ids) or (-1,))).all():
        desde = alertas.convidado_desde(db, p)
        if desde is None:
            continue
        dias = (hoje - alertas.dia_local(desde)).days
        if dias >= alertas.DIA_AVISO_CONVITE:
            pares.append((desde, {"id": p.id, "titulo": p.name, "empresa": None,
                                  "detalhe": f"Convidado há {dias} dias", "quando": desde,
                                  "link": f"/parcerias/aquisicao/{p.id}"}))
    return pares
```

- [ ] **Step 4: Rodar e ver passar**

Alvo: `tests/unit/test_parcerias_dashboard_secoes.py`
Esperado: 10 passam. Se der erro de import circular:
- trocar o import do topo por um import tardio dentro de `riscos` e de `_convites`
  (`from app.services.notificacoes import parcerias as alertas`);
- rodar de novo.

---

### Task 5: Juntar as seções nos painéis, evolução de 6 meses e schemas

**Files:**
- Modify: `backend/app/services/parcerias/dashboard.py`
- Modify: `backend/app/schemas/parcerias.py`
- Modify: `backend/tests/unit/test_parcerias_dashboard_secoes.py`
- Modify: `backend/tests/unit/test_parcerias_dashboard_externos.py` (linhas 40, 43, 78, 92, 172)
- Modify: `backend/tests/unit/test_parcerias_dashboard_hs.py` (linha 95)

- [ ] **Step 1: Escrever os testes por perfil e da evolução**

Acrescentar ao fim do arquivo de testes:
```python
VALIDA = TypeAdapter(DashboardResponse)
SECOES = {"resumo", "evolucao", "pipeline", "conversao", "riscos"}
SO_HS = {"ganho_a_confirmar", "elegibilidade_em_analise", "convites"}


def _membro(db, p, nome, email):
    login = usuario(db, "partner_member", email, p)
    m = PartnerTeamMember(partner_id=p.id, name=nome, email=email, user_id=login.id)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m, login


def _proposta(r):
    [e] = [e for e in r["pipeline"] if e["etapa"] == "proposta"]
    return e["quantidade"], e["valor"]


def _cenario_perfis(db):
    """Empresa A (Ana e Beto), unidade B indicada pelo hunter, e uma oportunidade de cada."""
    config_comissoes(db)
    ph, uh = hunter(db)
    a = parceiro(db, "A")
    b = parceiro(db, "B", indicated_by_partner_id=ph.id)
    dono = usuario(db, "partner", "dono@a.com", a)
    m1, login1 = _membro(db, a, "Ana", "ana@a.com")
    m2, _ = _membro(db, a, "Beto", "beto@a.com")
    _op(db, a, "proposta", valor=1000, seller_member_id=m1.id)
    _op(db, a, "proposta", valor=300, seller_member_id=m2.id)
    _op(db, b, "proposta", valor=700)
    _op(db, ph, "proposta", valor=50)
    return SimpleNamespace(ph=ph, uh=uh, a=a, b=b, dono=dono, login1=login1,
                           admin=usuario(db, "admin", "adm@hs.com"))


class TestPorPerfil:

    def test_vendedor_so_as_dele_e_sem_comissao(self, db):
        c = _cenario_perfis(db)
        r = dashboard.painel_vendedor(db, c.login1, DE, ATE, agora=AGORA)
        assert set(r) == {"visao", "vendas"} | SECOES
        assert _proposta(r) == (1, "1000.00")
        assert set(r["riscos"]) == {"protecao", "atividades_vencidas"}
        assert "comissoes" not in VALIDA.validate_python(r).model_dump()

    def test_empresa_ve_a_equipe_toda(self, db):
        c = _cenario_perfis(db)
        r = dashboard.painel_empresa(db, c.dono, DE, ATE, agora=AGORA)
        assert SECOES <= set(r) and "comissoes" in r
        assert _proposta(r) == (2, "1300.00")
        assert not SO_HS & set(r["riscos"])
        VALIDA.validate_python(r)

    def test_hunter_pipeline_so_das_proprias(self, db):
        c = _cenario_perfis(db)
        r = dashboard.painel_hunter(db, c.uh, DE, ATE, agora=AGORA)
        assert _proposta(r) == (1, "50.00")
        assert not SO_HS & set(r["riscos"])
        VALIDA.validate_python(r)

    def test_hs_ve_tudo_e_os_filtros_valem(self, db):
        c = _cenario_perfis(db)
        r = dashboard.painel_hs(db, c.admin, DE, ATE, agora=AGORA)
        assert _proposta(r) == (4, "2050.00")
        assert SO_HS <= set(r["riscos"])
        VALIDA.validate_python(r)
        com_hunter = dashboard.painel_hs(db, c.admin, DE, ATE, hunter_id=c.ph.id, agora=AGORA)
        assert _proposta(com_hunter) == (2, "750.00")
        com_empresa = dashboard.painel_hs(db, c.admin, DE, ATE, partner_id=c.a.id, agora=AGORA)
        assert _proposta(com_empresa) == (2, "1300.00")


class TestEvolucao:

    @staticmethod
    def _venda(db, p, valor, quando):
        return _op(db, p, "ganho", valor=valor, modality="venda", won_confirmed_at=quando,
                   created_at=quando - timedelta(days=1))

    def test_seis_meses_com_os_zerados(self, db):
        config_comissoes(db)
        admin = usuario(db, "admin", "adm@hs.com")
        a = parceiro(db, "A")
        self._venda(db, a, 300, datetime(2026, 5, 20, 15))  # fora da janela
        self._venda(db, a, 1000, datetime(2026, 9, 5, 15))
        self._venda(db, a, 500, datetime(2026, 11, 10, 15))

        r = dashboard.painel_hs(db, admin, DE, ATE, agora=AGORA)

        assert [(m["mes"], m["valor"]) for m in r["evolucao"]] == [
            ("2026-06", "0.00"), ("2026-07", "0.00"), ("2026-08", "0.00"),
            ("2026-09", "1000.00"), ("2026-10", "0.00"), ("2026-11", "500.00"),
        ]
        assert r["vendas"] == {"quantidade": 1, "valor": "500.00"}  # o card segue o período

    def test_termina_no_mes_do_fim_do_periodo_ou_no_de_hoje(self, db):
        config_comissoes(db)
        admin = usuario(db, "admin", "adm@hs.com")
        a = parceiro(db, "A")
        self._venda(db, a, 300, datetime(2026, 5, 20, 15))

        r = dashboard.painel_hs(db, admin, None, date(2026, 9, 30), agora=AGORA)

        assert [m["mes"] for m in r["evolucao"]] == [
            "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]
        assert r["evolucao"][1] == {"mes": "2026-05", "quantidade": 1, "valor": "300.00"}
        sem_fim = dashboard.painel_hs(db, admin, None, None, agora=AGORA)
        assert sem_fim["evolucao"][-1]["mes"] == "2026-11"

    def test_hunter_soma_a_carteira(self, db):
        config_comissoes(db)
        ph, uh = hunter(db)
        b = parceiro(db, "B", indicated_by_partner_id=ph.id)
        self._venda(db, ph, 100, _dia(1))
        self._venda(db, b, 700, _dia(1))

        r = dashboard.painel_hunter(db, uh, DE, ATE, agora=AGORA)

        assert r["evolucao"][-1]["valor"] == "800.00"
        assert r["vendas"]["valor"] == "100.00"
```

- [ ] **Step 2: Rodar e ver falhar**

Alvo: `tests/unit/test_parcerias_dashboard_secoes.py::TestPorPerfil tests/unit/test_parcerias_dashboard_secoes.py::TestEvolucao`
Esperado: falham.
- `painel_vendedor` ainda não recebe `agora`;
- falta a chave `evolucao`.

- [ ] **Step 3: Schemas**

Em `backend/app/schemas/parcerias.py`, logo depois de `class DashComissoes`, acrescentar:
```python
class DashResumo(BaseModel):
    novas: int
    em_negociacao: DashVendas


class DashEtapa(BaseModel):
    etapa: str
    nome: str
    quantidade: int
    valor: str


class DashConversao(BaseModel):
    ganhos: int
    perdidos: int
    taxa_fechamento: Optional[float] = None
    validadas: int
    rejeitadas: int
    taxa_elegibilidade: Optional[float] = None
    tempo_medio_ganho_dias: Optional[float] = None


class DashRiscoItem(BaseModel):
    id: int
    titulo: str
    empresa: Optional[str] = None
    detalhe: str
    quando: Optional[datetime] = None
    link: str


class DashRisco(BaseModel):
    total: int
    itens: List[DashRiscoItem]


class DashRiscos(BaseModel):
    protecao: DashRisco
    atividades_vencidas: DashRisco


class DashRiscosHS(DashRiscos):
    ganho_a_confirmar: DashRisco
    elegibilidade_em_analise: DashRisco
    convites: DashRisco


class DashSecoes(BaseModel):
    """O que as 4 visões têm em comum (spec 2026-11-16)."""
    resumo: DashResumo
    evolucao: List[DashMes]
    pipeline: List[DashEtapa]
    conversao: DashConversao
```

Trocar as 4 visões por:
```python
class DashVendedor(DashSecoes):
    """Vendedor da equipe: nenhum campo de comissão."""
    visao: Literal["vendedor"]
    vendas: DashVendas
    riscos: DashRiscos


class DashEmpresa(DashSecoes):
    visao: Literal["empresa"]
    vendas: DashVendas
    por_vendedor: List[DashPorVendedor]
    unidades: List[DashCarteiraItem]
    comissoes: DashComissoes
    riscos: DashRiscos


class DashHunter(DashSecoes):
    visao: Literal["hunter"]
    vendas: DashVendas
    carteira_vendas: DashVendas
    carteira: List[DashCarteiraHunterItem]
    comissoes: DashComissoes
    riscos: DashRiscos
```
e, depois de `DashRankingHunter`:
```python
class DashHS(DashSecoes):
    visao: Literal["hs"]
    vendas: DashVendas
    ranking_empresas: List[DashRankingEmpresa]
    ranking_hunters: List[DashRankingHunter]
    paradas: List[DashCarteiraItem]
    comissoes: DashComissoes
    riscos: DashRiscosHS
```

- [ ] **Step 4: `dashboard.py`: evolução e seções**

Imports:
- `from datetime import date, datetime, timezone` vira `from datetime import date, datetime, timedelta, timezone`;
- logo abaixo de `from app.services.parcerias import acesso, comissoes, respostas`, acrescentar
  `from app.services.parcerias import dashboard_secoes as secoes`.

Na docstring do módulo, trocar
`São Paulo; a série mensal também agrupa pelo mês de São Paulo.`
por
`São Paulo; a evolução (6 meses até o fim do período) agrupa pelo mês de São Paulo.`

Apagar `_serie` e `serie_mensal` (nada fora deste arquivo usa as duas) e pôr no lugar:
```python
MESES_EVOLUCAO = 6


def _evolucao(db: Session, partner_ids: Iterable[int], ate: Optional[date], agora: datetime,
              seller_member_id: Optional[int] = None) -> List[dict]:
    """Vendas dos 6 meses que terminam no mês de `ate` (sem `ate`, o mês de hoje em São Paulo).
    Meses sem venda vêm com zero, para a linha não pular."""
    fim = ate or agora.replace(tzinfo=timezone.utc).astimezone(comissoes.FUSO).date()
    ultimo = date(fim.year, fim.month, 1)
    primeiro = ultimo - relativedelta(months=MESES_EVOLUCAO - 1)
    vendas = _vendas(db, partner_ids, primeiro, ultimo + relativedelta(months=1) - timedelta(days=1),
                     seller_member_id)
    meses: Dict[str, List] = {f"{primeiro + relativedelta(months=i):%Y-%m}": [0, ZERO]
                              for i in range(MESES_EVOLUCAO)}
    for op, valor in vendas:
        m = meses.get(_mes_local(op.won_confirmed_at))
        if m is not None:
            m[0] += 1
            m[1] += valor
    return [{"mes": mes, "quantidade": q, "valor": _txt(v)} for mes, (q, v) in meses.items()]


def _secoes(db: Session, escopo: "secoes.Escopo", de, ate, agora: datetime, da_hs: bool = False) -> dict:
    resumo, pipeline = secoes.resumo_e_pipeline(db, escopo, de, ate)
    return {"resumo": resumo, "pipeline": pipeline, "conversao": secoes.conversao(db, escopo, de, ate),
            "riscos": secoes.riscos(db, escopo, agora, da_hs)}
```

Trocar `painel_vendedor` por:
```python
def painel_vendedor(db: Session, user: User, de, ate, agora: Optional[datetime] = None) -> dict:
    agora = agora or datetime.utcnow()
    membro = acesso.membro_do_login(db, user)
    vendas = _vendas(db, [membro.partner_id], de, ate, seller_member_id=membro.id)
    return {"visao": "vendedor", "vendas": _bloco_vendas(vendas),
            "evolucao": _evolucao(db, [membro.partner_id], ate, agora, membro.id),
            **_secoes(db, secoes.Escopo((membro.partner_id,), membro.id), de, ate, agora)}
```

Em `painel_empresa`, trocar o `return` por:
```python
    return {"visao": "empresa", "vendas": _bloco_vendas(vendas),
            "evolucao": _evolucao(db, [proprio], ate, agora),
            "por_vendedor": por_vendedor, "unidades": unidades, "comissoes": _comissoes(db, user, de, ate),
            **_secoes(db, secoes.Escopo((proprio,)), de, ate, agora)}
```

Trocar o corpo de `painel_hunter` por:
```python
    agora = agora or datetime.utcnow()
    proprio = acesso.parceiro_do_login(user)
    proprias = _vendas(db, [proprio], de, ate)
    indicados = _indicados(db, proprio)
    carteira, da_carteira = _carteira(db, indicados, de, ate, True, agora)
    # A evolução soma as vendas da carteira (como o gráfico de antes); o pipeline e os riscos, não:
    # o hunter não enxerga as oportunidades das empresas que indicou.
    return {"visao": "hunter", "vendas": _bloco_vendas(proprias), "carteira_vendas": _bloco_vendas(da_carteira),
            "evolucao": _evolucao(db, [proprio, *[p.id for p in indicados]], ate, agora),
            "carteira": carteira, "comissoes": _comissoes(db, user, de, ate),
            **_secoes(db, secoes.Escopo((proprio,)), de, ate, agora)}
```

Em `painel_hs`, trocar o `return` por:
```python
    filtrado = hunter_id is not None or partner_id is not None
    return {
        "visao": "hs", "vendas": _bloco_vendas(vendas),
        "evolucao": _evolucao(db, escopo.keys(), ate, agora),
        "ranking_empresas": ranking_empresas[:MAX_RANKING], "ranking_hunters": ranking_hunters[:MAX_RANKING],
        "paradas": paradas[:MAX_RANKING],
        "comissoes": _comissoes(db, user, de, ate, list(escopo) if filtrado else None),
        **_secoes(db, secoes.Escopo(tuple(escopo)), de, ate, agora, da_hs=True),
    }
```
A linha `filtrado = ...` já existe logo acima do `return`. Não duplicar.

- [ ] **Step 5: Rodar os testes novos**

Alvo: `tests/unit/test_parcerias_dashboard_secoes.py`
Esperado: 17 passam.

- [ ] **Step 6: Ajustar os testes antigos (`serie` → `evolucao`)**

Em `backend/tests/unit/test_parcerias_dashboard_externos.py`:
- linha 40: `assert set(r) == {"visao", "vendas", "serie"}` vira
  `assert set(r) == {"visao", "vendas", "evolucao", "resumo", "pipeline", "conversao", "riscos"}`;
- linha 43: `assert len(r["serie"]) == 1 and r["serie"][0]["valor"] == "1000.00"` vira
  `assert len(r["evolucao"]) == 6 and r["evolucao"][-1]["valor"] == "1000.00"`;
- linha 78: `r["serie"]` vira `r["evolucao"]`;
- linha 92: `assert [m["quantidade"] for m in r["serie"]] == [1]` vira
  `assert sum(m["quantidade"] for m in r["evolucao"]) == 1`;
- linha 172: igual à linha 43.

Em `backend/tests/unit/test_parcerias_dashboard_hs.py`, linha 95:
`assert [m["mes"] for m in r["serie"]] == ["2026-11"]` vira
`assert r["evolucao"][-1] == {"mes": "2026-11", "quantidade": 1, "valor": "1000.00"}`.

Conferir que não sobrou nada:
```bash
cd backend && grep -rn '"serie"\|\.serie\b\|serie_mensal' app tests
```
Esperado: nada.

- [ ] **Step 7: Rodar os testes de dashboard (lentos, usam `client`)**

Alvo: `tests/unit/test_parcerias_dashboard_secoes.py tests/unit/test_parcerias_dashboard_externos.py tests/unit/test_parcerias_dashboard_hs.py tests/unit/test_parcerias_alertas.py`
Esperado: todos passam (cerca de 15 a 20 min por causa da fixture `client`).

- [ ] **Step 8: Commit (só com o OK do usuário)**

```bash
git add backend/app/services/notificacoes/parcerias.py backend/app/services/parcerias/dashboard_secoes.py \
  backend/app/services/parcerias/dashboard.py backend/app/schemas/parcerias.py \
  backend/tests/unit/test_parcerias_dashboard_secoes.py backend/tests/unit/test_parcerias_dashboard_externos.py \
  backend/tests/unit/test_parcerias_dashboard_hs.py
git commit -m "feat(parcerias): secoes do dashboard (visao geral, pipeline, conversao e riscos)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Frontend — tipos e seções

**Files:**
- Modify: `frontend/src/services/parceriasService.ts` (bloco "Dashboard de Parcerias", ~linha 466)
- Modify: `frontend/src/components/dashboard/DashboardParcerias.tsx`

- [ ] **Step 1: Tipos**

Em `parceriasService.ts`:
- depois de `export interface DashComissoes ...`, acrescentar os tipos novos;
- trocar as 4 interfaces das visões (`DashVendedor`, `DashEmpresa`, `DashHunter` e `DashHS`) por
  estas:
```ts
export interface DashEtapa { etapa: string; nome: string; quantidade: number; valor: string }
export interface DashResumo { novas: number; em_negociacao: DashVendas }
export interface DashConversao {
  ganhos: number; perdidos: number; taxa_fechamento: number | null;
  validadas: number; rejeitadas: number; taxa_elegibilidade: number | null;
  tempo_medio_ganho_dias: number | null;
}
export interface DashRiscoItem {
  id: number; titulo: string; empresa?: string | null; detalhe: string; quando?: string | null; link: string;
}
export interface DashRisco { total: number; itens: DashRiscoItem[] }
export interface DashRiscos { protecao: DashRisco; atividades_vencidas: DashRisco }
export interface DashRiscosHS extends DashRiscos {
  ganho_a_confirmar: DashRisco; elegibilidade_em_analise: DashRisco; convites: DashRisco;
}
/** O que as 4 visões têm em comum. */
interface DashSecoes { resumo: DashResumo; evolucao: DashMes[]; pipeline: DashEtapa[]; conversao: DashConversao }
export interface DashVendedor extends DashSecoes { visao: "vendedor"; vendas: DashVendas; riscos: DashRiscos }
export interface DashEmpresa extends DashSecoes {
  visao: "empresa"; vendas: DashVendas;
  por_vendedor: DashPorVendedor[]; unidades: DashCarteiraItem[]; comissoes: DashComissoes; riscos: DashRiscos;
}
export interface DashHunter extends DashSecoes {
  visao: "hunter"; vendas: DashVendas; carteira_vendas: DashVendas;
  carteira: DashCarteiraHunterItem[]; comissoes: DashComissoes; riscos: DashRiscos;
}
```
Depois, trocar a `DashHS` (que fica depois dos rankings) por:
```ts
export interface DashHS extends DashSecoes {
  visao: "hs"; vendas: DashVendas;
  ranking_empresas: DashRankingEmpresa[]; ranking_hunters: DashRankingHunter[];
  paradas: DashCarteiraItem[]; comissoes: DashComissoes; riscos: DashRiscosHS;
}
```

- [ ] **Step 2: Imports do componente**

Em `DashboardParcerias.tsx`, trocar as linhas 3 a 23 (imports) por:
```tsx
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle, Calendar, CheckCircle2, Clock, Handshake, Hourglass, LayoutDashboard, ShieldAlert,
  ShoppingCart, Sparkles, Target, TrendingUp, UserX, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { BaseModal, Pagination, SelectMenu } from "../common";
import { PageHeader } from "../layout/PageHeader";
import { usePagination } from "../../hooks";
import KpiCard from "./KpiCard";
import { useTheme } from "../../context/ThemeContext";
import { getChartColors } from "../../constants/colors";
import { ETAPAS_AQUISICAO, COMISSAO_TIPO_LABEL, formatarMoeda } from "../../constants/parcerias";
import { dia } from "../../utils/formatters";
import parceriasService, {
  mensagemDeErro,
  type DashboardParcerias as Painel,
  type DashCarteiraItem,
  type DashComissoes,
  type DashConversao,
  type DashEtapa,
  type DashMes,
  type DashFiltroItem,
  type DashRisco,
  type DashRiscos,
  type DashRiscosHS,
} from "../../services/parceriasService";
```
A linha 1 (`import React, ...`) e a linha 2 (`createPortal`) ficam como estão.

- [ ] **Step 3: Trocar o `GraficoMensal` pelas peças das seções**

Apagar a função `GraficoMensal` inteira e pôr no lugar:
```tsx
const TITULO_SECAO = "mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500";
const CARTAO = "rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50";
const umaCasa = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** "2026-11-01" → "01/11/2026" sem passar por Date (evita voltar um dia no fuso de São Paulo). */
const dataBR = (d: string) => d.split("-").reverse().join("/");

function Secao({ titulo, risco, children }: { titulo: string; risco?: boolean; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={risco ? "mb-3 text-xs font-semibold uppercase tracking-wider text-red-400" : TITULO_SECAO}>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function CabecalhoGrafico({ titulo, icone, fundo, extra }: {
  titulo: string; icone: React.ReactNode; fundo: string; extra?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className={`rounded-lg p-2 ${fundo}`}>{icone}</div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{titulo}</h3>
      {extra}
    </div>
  );
}

/** Mesmas cores de eixo e de tooltip dos gráficos dos outros dashboards. */
function useEstiloGrafico() {
  const { darkMode } = useTheme();
  const cores = getChartColors(darkMode);
  const texto = darkMode ? "#ffffff" : "#0f172a";
  return {
    cores,
    eixo: { fill: cores.content.secondary, fontSize: 11 },
    tooltip: {
      contentStyle: { backgroundColor: cores.surface.elevated, border: `1px solid ${cores.border.default}`, borderRadius: 8, fontSize: 12, color: texto },
      labelStyle: { color: texto },
      itemStyle: { color: texto },
    },
  };
}

function GraficoEvolucao({ evolucao, titulo }: { evolucao: DashMes[]; titulo: string }) {
  const { cores, eixo, tooltip } = useEstiloGrafico();
  const dados = evolucao.map((m) => ({ nome: rotuloMes(m.mes), valor: Number(m.valor), quantidade: m.quantidade }));
  const vazio = evolucao.every((m) => m.quantidade === 0);
  return (
    <div className={CARTAO}>
      <CabecalhoGrafico titulo={titulo} fundo="bg-emerald-500/20" icone={<TrendingUp size={16} className="text-emerald-400" />} />
      {vazio ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Nenhuma venda confirmada nos últimos 6 meses</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cores.border.default} vertical={false} />
            <XAxis dataKey="nome" tick={eixo} tickLine={false} />
            <YAxis
              tick={eixo} tickLine={false} axisLine={false} width={70}
              tickFormatter={(v: number) => v.toLocaleString("pt-BR", { notation: "compact" })}
            />
            <Tooltip
              {...tooltip}
              formatter={(v, _n, item) => [`${dinheiro(Number(v))} (${plural(item.payload.quantidade, "venda", "vendas")})`, "Valor vendido"]}
            />
            <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function GraficoPipeline({ pipeline }: { pipeline: DashEtapa[] }) {
  const { cores, eixo, tooltip } = useEstiloGrafico();
  const total = pipeline.reduce((soma, e) => soma + e.quantidade, 0);
  const dados = pipeline.map((e) => ({ nome: e.nome, quantidade: e.quantidade, valor: Number(e.valor) }));
  return (
    <div className={CARTAO}>
      <CabecalhoGrafico
        titulo="Pipeline por Etapa" fundo="bg-blue-500/20" icone={<Target size={16} className="text-blue-400" />}
        extra={total > 0 ? (
          <span className="ml-auto rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
            {plural(total, "oportunidade", "oportunidades")}
          </span>
        ) : undefined}
      />
      {total === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Nenhuma oportunidade em negociação</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cores.border.default} vertical={false} />
            <XAxis dataKey="nome" tick={eixo} tickLine={false} interval={0} />
            <YAxis tick={eixo} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
            <Tooltip
              {...tooltip}
              formatter={(v, _n, item) => [`${v} (${dinheiro(item.payload.valor)})`, "Oportunidades"]}
            />
            <Bar dataKey="quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Conversao({ conversao: c }: { conversao: DashConversao }) {
  const itens = [
    {
      rotulo: "Taxa de fechamento",
      valor: c.taxa_fechamento == null ? null : `${umaCasa(c.taxa_fechamento)}%`,
      detalhe: `${plural(c.ganhos, "ganho", "ganhos")} · ${plural(c.perdidos, "perdido", "perdidos")}`,
    },
    {
      rotulo: "Taxa de elegibilidade",
      valor: c.taxa_elegibilidade == null ? null : `${umaCasa(c.taxa_elegibilidade)}%`,
      detalhe: `${plural(c.validadas, "validada", "validadas")} · ${plural(c.rejeitadas, "rejeitada", "rejeitadas")}`,
    },
    {
      rotulo: "Tempo médio até o ganho",
      valor: c.tempo_medio_ganho_dias == null ? null : `${umaCasa(c.tempo_medio_ganho_dias)} dias`,
      detalhe: "Do cadastro à confirmação do ganho",
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {itens.map((i) => (
        <div key={i.rotulo} className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-slate-700/50 dark:bg-slate-800/50">
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{i.rotulo}</p>
          {i.valor !== null ? (
            <p className="text-2xl font-bold text-emerald-500">{i.valor}</p>
          ) : (
            <p className="text-2xl font-bold text-slate-400 dark:text-slate-500">—</p>
          )}
          <p className="mt-1 text-xs text-slate-400">{i.detalhe}</p>
        </div>
      ))}
    </div>
  );
}

type ChaveRisco = keyof DashRiscosHS;
const COR_RISCO = {
  red: { caixa: "border-red-500/20 bg-red-500/5 hover:bg-red-500/10", texto: "text-red-400" },
  orange: { caixa: "border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10", texto: "text-orange-400" },
  yellow: { caixa: "border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10", texto: "text-yellow-500" },
} as const;
const RISCOS: { chave: ChaveRisco; titulo: string; descricao: string; cor: keyof typeof COR_RISCO; Icone: LucideIcon }[] = [
  { chave: "protecao", titulo: "Perdendo a proteção", descricao: "CNPJ fica livre em até 3 dias", cor: "red", Icone: ShieldAlert },
  { chave: "atividades_vencidas", titulo: "Atividades vencidas", descricao: "Oportunidades com atividade atrasada", cor: "orange", Icone: AlertTriangle },
  { chave: "ganho_a_confirmar", titulo: "Ganho a confirmar", descricao: "Ganho marcado pelo parceiro", cor: "yellow", Icone: CheckCircle2 },
  { chave: "elegibilidade_em_analise", titulo: "Elegibilidade em análise", descricao: "Aguardando a validação", cor: "yellow", Icone: Hourglass },
  { chave: "convites", titulo: "Convites sem ativação", descricao: "23 dias ou mais sem aceitar os termos", cor: "orange", Icone: UserX },
];

function ModalRisco({ titulo, risco, onClose }: { titulo: string; risco: DashRisco | null; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <BaseModal
      isOpen={risco !== null}
      onClose={onClose}
      closeOnOverlayClick
      size="xl"
      title={titulo}
      subtitle={risco && risco.total > risco.itens.length ? `Mostrando ${risco.itens.length} de ${risco.total}` : undefined}
    >
      {!risco || risco.itens.length === 0 ? (
        <Vazio texto="Nada por aqui. Tudo em dia." />
      ) : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-3 font-medium">Nome</th>
                <th className="py-2 pr-3 font-medium">Empresa</th>
                <th className="py-2 pr-3 font-medium">Situação</th>
                <th className="py-2 text-right font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {risco.itens.map((i) => (
                <tr
                  key={i.link}
                  onClick={() => { onClose(); navigate(i.link); }}
                  title="Abrir"
                  className="cursor-pointer text-slate-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <td className="py-2 pr-3 font-medium">{i.titulo}</td>
                  <td className="py-2 pr-3">{i.empresa || "—"}</td>
                  <td className="py-2 pr-3 text-xs text-slate-500 dark:text-slate-400">{i.detalhe}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{i.quando ? dia(i.quando) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BaseModal>
  );
}

function Riscos({ riscos }: { riscos: DashRiscos | DashRiscosHS }) {
  const [aberto, setAberto] = useState<ChaveRisco | null>(null);
  const lista = (chave: ChaveRisco): DashRisco | undefined => (riscos as Partial<DashRiscosHS>)[chave];
  const visiveis = RISCOS.filter((r) => lista(r.chave) !== undefined);
  const atual = RISCOS.find((r) => r.chave === aberto);
  return (
    <>
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${visiveis.length > 2 ? "lg:grid-cols-5" : ""}`}>
        {visiveis.map(({ chave, titulo, descricao, cor, Icone }) => {
          const c = COR_RISCO[cor];
          return (
            <button
              key={chave}
              type="button"
              onClick={() => setAberto(chave)}
              title="Ver a lista"
              className={`rounded-xl border p-5 text-left transition-colors ${c.caixa}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <Icone size={16} className={c.texto} />
                <h3 className={`text-sm font-semibold ${c.texto}`}>{titulo}</h3>
              </div>
              <p className={`text-3xl font-bold ${c.texto}`}>{lista(chave)?.total ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{descricao} · clique para ver</p>
            </button>
          );
        })}
      </div>
      <ModalRisco titulo={atual?.titulo ?? ""} risco={aberto ? lista(aberto) ?? null : null} onClose={() => setAberto(null)} />
    </>
  );
}
```

- [ ] **Step 4: Trocar a linha de cards e o gráfico pelas seções**

No componente principal:
- trocar as 3 linhas
```tsx
  const semVendas = painel != null && painel.serie.length === 0;
  const tituloGrafico = painel?.visao === "hunter" ? "Valor vendido (minhas + carteira)" : "Valor vendido por mês";
  const ticket = painel && painel.vendas.quantidade > 0 ? Number(painel.vendas.valor) / painel.vendas.quantidade : null;
```
  por:
```tsx
  const tituloEvolucao = painel?.visao === "hunter" ? "Evolução das Vendas (minhas + carteira)" : "Evolução das Vendas · 6 meses";
  const ticket = painel && painel.vendas.quantidade > 0 ? Number(painel.vendas.valor) / painel.vendas.quantidade : null;
  const rotuloPeriodo = atalhoPeriodo === "custom"
    ? `${periodo.de ? dataBR(periodo.de) : "início"} a ${periodo.ate ? dataBR(periodo.ate) : "hoje"}`
    : OPCOES_PERIODO.find((o) => o.value === atalhoPeriodo)?.label ?? "";
```
- trocar tudo de `<div className={\`grid grid-cols-1 gap-4 sm:grid-cols-3 ${` (a linha de KPIs) até o fim do
  bloco `{semVendas ? (...) : (...)}` por:
```tsx
          {/* ── 1. VISÃO GERAL ─────────────────────────────────────────── */}
          <Secao titulo={`Visão Geral · ${rotuloPeriodo}`}>
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${painel.visao === "vendedor" ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
              <KpiCard
                icon={<Sparkles size={18} className="text-cyan-500" />} iconBg="bg-cyan-500/20"
                label="Oportunidades novas" value={painel.resumo.novas} format="number"
                info="Oportunidades cadastradas no período."
              />
              <KpiCard
                icon={<Target size={18} className="text-blue-500" />} iconBg="bg-blue-500/20"
                label="Em negociação" value={painel.resumo.em_negociacao.quantidade} format="number"
                sub={dinheiro(painel.resumo.em_negociacao.valor)}
                info="Oportunidades abertas agora (sem as rejeitadas na elegibilidade), com o valor somado."
              />
              <KpiCard
                icon={<ShoppingCart size={18} className="text-emerald-500" />} iconBg="bg-emerald-500/20"
                label={painel.visao === "hunter" ? "Minhas vendas" : "Vendas no período"} value={painel.vendas.quantidade} format="number"
                info="Oportunidades com ganho confirmado no período (locação não conta)."
              />
              {painel.visao === "hunter" && (
                <KpiCard
                  icon={<Handshake size={18} className="text-amber-500" />} iconBg="bg-amber-500/20"
                  label="Vendas da carteira" value={painel.carteira_vendas.quantidade} format="number"
                  info={`Vendas das empresas que você indicou no período: ${dinheiro(painel.carteira_vendas.valor)}.`}
                />
              )}
              <KpiCard
                icon={<TrendingUp size={18} className="text-blue-500" />} iconBg="bg-blue-500/20"
                label={painel.visao === "hunter" ? "Meu valor vendido" : "Valor vendido"} value={Number(painel.vendas.valor)} format="currency"
                info="Produtos menos o desconto geral, sem frete (a mesma base da comissão)."
              />
              <KpiCard
                icon={<Wallet size={18} className="text-purple-500" />} iconBg="bg-purple-500/20"
                label="Ticket médio" value={ticket} format="currency"
              />
              {painel.visao !== "vendedor" && (
                <>
                  <KpiCard
                    icon={<Clock size={18} />} iconBg="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                    label="Comissões pendentes" value={Number(painel.comissoes.pendente)} format="currency" highlight="yellow"
                    info="Lançamentos de comissão ainda não pagos no período."
                  />
                  <KpiCard
                    icon={<CheckCircle2 size={18} />} iconBg="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    label="Comissões pagas" value={Number(painel.comissoes.pago)} format="currency" highlight="green"
                    info="Lançamentos de comissão já pagos no período."
                  />
                </>
              )}
            </div>
          </Secao>

          {/* ── 2. EVOLUÇÃO E PIPELINE ─────────────────────────────────── */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GraficoEvolucao evolucao={painel.evolucao} titulo={tituloEvolucao} />
            <GraficoPipeline pipeline={painel.pipeline} />
          </section>

          {/* ── 3. CONVERSÃO ───────────────────────────────────────────── */}
          <Secao titulo={`Conversão · ${rotuloPeriodo}`}>
            <Conversao conversao={painel.conversao} />
          </Secao>

          {/* ── 4. RISCOS ──────────────────────────────────────────────── */}
          <Secao titulo="Atenção · Riscos" risco>
            <Riscos riscos={painel.riscos} />
          </Secao>
```
Os blocos de cada perfil que vêm depois (`painel.visao === "hunter"` etc.) **não mudam**.

- [ ] **Step 5: Checar tipos e build**

```bash
cd frontend && npx tsc --noEmit -p . && npm run build
```
Esperado: sem erro. Erros comuns:
- `BaseModal` não exportado por `../common`: conferir o import em `ParadosModal.tsx`, que usa o
  mesmo caminho;
- `formatter` do Tooltip reclamando do tipo: usar a mesma assinatura do `GraficoMensal` antigo.
  Um `item` sem tipo já funcionava.

```bash
cd frontend && npx eslint src/components/dashboard/DashboardParcerias.tsx src/services/parceriasService.ts
```
Esperado: nenhum erro novo, inclusive nenhum import sem uso.

- [ ] **Step 6: Commit (só com o OK do usuário)**

```bash
git add frontend/src/services/parceriasService.ts frontend/src/components/dashboard/DashboardParcerias.tsx
git commit -m "feat(parcerias): dashboard no padrao dos outros (secoes, graficos, conversao e riscos)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Versão 1.11.27 e documentação

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `frontend/src/components/common/ChangelogModal.tsx`
- Modify: `frontend/src/layouts/MainLayout.tsx` (rodapé, ~linha 347)
- Modify: `docs/programa-de-parceiros.md` (seção "### Dashboard de Parcerias", ~linha 109)

- [ ] **Step 1: CHANGELOG.md**

Logo depois de `## [Não lançado]\n\n---\n`, acrescentar:
```markdown
## [1.11.27] — 16/11/2026

### Alterado
- **Dashboard de Parcerias no padrão dos dashboards de SDR, Vendas e Serviços:** seções
  **Visão Geral**, **Evolução das Vendas** (linha dos últimos 6 meses, em vez da barra única de
  "Este mês"), **Pipeline por Etapa**, **Conversão** e **Atenção · Riscos**. Cada perfil continua
  vendo só os próprios números, e o vendedor da equipe continua sem comissão.
  - **Visão geral:** oportunidades novas e em negociação (com o valor), além das vendas, do
    valor vendido, do ticket médio e das comissões.
  - **Conversão:**
    - taxa de fechamento (ganhos ÷ ganhos + perdidos);
    - taxa de elegibilidade (validadas ÷ validadas + rejeitadas);
    - tempo médio até o ganho.
  - **Riscos:**
    - oportunidades que perdem a proteção do CNPJ em até 3 dias (a mesma conta dos alertas);
    - atividades vencidas;
    - só para a H&S: ganho a confirmar, elegibilidade em análise e convites sem ativação há
      23 dias ou mais.

    Clicar no card abre a lista, com o link para cada uma.

### Banco de dados
- Nenhuma migration.

---

```

- [ ] **Step 2: ChangelogModal**

Em `ChangelogModal.tsx`, antes do objeto `version: "1.11.26"` (o primeiro da lista), acrescentar:
```tsx
  {
    version: "1.11.27",
    date: "16/11/2026",
    entries: [
      {
        type: "improvement",
        text: "Dashboard de Parcerias no padrão dos outros dashboards: visão geral, evolução das vendas dos últimos 6 meses, pipeline por etapa, conversão (fechamento, elegibilidade e tempo até o ganho) e Atenção · Riscos.",
      },
      {
        type: "feature",
        text: "Riscos do Dashboard de Parcerias: proteção do CNPJ caindo em até 3 dias e atividades vencidas; para a H&S, também ganho a confirmar, elegibilidade em análise e convites sem ativação. Clique no card para ver a lista.",
      },
    ],
  },
```
O arquivo já usa os tipos `"feature"`, `"improvement"` e `"fix"`.

- [ ] **Step 3: Rodapé**

Em `MainLayout.tsx`, trocar `HSGrowth CRM v1.11.26` por `HSGrowth CRM v1.11.27`.

- [ ] **Step 4: docs/programa-de-parceiros.md**

Na seção `### Dashboard de Parcerias`, antes do bullet `- **Hunter:**`, acrescentar:
```markdown
- **Mesma estrutura dos outros dashboards (desde 1.11.27):**
  - **Visão Geral:** novas, em negociação, vendas, valor vendido, ticket médio e comissões.
  - **Evolução das Vendas:** os 6 meses até o fim do período.
  - **Pipeline por Etapa.**
  - **Conversão:** fechamento, elegibilidade e tempo médio até o ganho. As taxas não usam
    histórico de etapas.
  - **Atenção · Riscos:** proteção do CNPJ em até 3 dias e atividades vencidas. Só para a H&S:
    ganho a confirmar, elegibilidade em análise e convites com 23 dias ou mais.

  As contas ficam em `app/services/parcerias/dashboard_secoes.py`. O hunter vê no pipeline e nos
  riscos só as oportunidades próprias; a evolução dele soma a carteira.
```

- [ ] **Step 5: Commit (só com o OK do usuário)**

```bash
git add CHANGELOG.md frontend/src/components/common/ChangelogModal.tsx frontend/src/layouts/MainLayout.tsx docs/programa-de-parceiros.md
git commit -m "chore(release): v1.11.27

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Verificação final

- [ ] **Step 1: Suíte do backend inteira**

Alvo: `tests --ignore=tests/e2e`. Rodar em background, porque leva cerca de 10 min.
Esperado: tudo passa. A última contagem foi de 1533 testes; agora são mais 17 novos.

- [ ] **Step 2: Front**

```bash
cd frontend && npx tsc --noEmit -p . && npm run build
```
Esperado: sem erro.

- [ ] **Step 3: Conferência visual (opcional, com o usuário)**

Depois do deploy no homo, abrir Dashboard → Parcerias como admin e conferir:
- as 4 seções, na ordem;
- a linha de evolução com 6 meses;
- o pipeline com as 5 etapas;
- os cards de risco abrindo a lista.

Repetir com um login de parceiro e com um de hunter.
