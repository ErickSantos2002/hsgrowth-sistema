# Mover aparelhos entre cards do mesmo CNPJ — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No card de Serviço/Cobrança, listar os outros cards em aberto do mesmo CNPJ (mesmo board) e permitir puxar aparelhos (individuais ou a linha inteira) para o card atual, com histórico nos dois cards. Se o card de origem ficar sem aparelhos, ele é fechado como Perdido — "Unificado em outro card" — sem contar como perda nas métricas.

**Architecture:** Dois endpoints novos no router `service_boards` (`GET related-devices`, `POST pull-devices`) apoiados em métodos do `ServiceBoardService` que manipulam `ServiceCardProduct.aparelhos` (JSON) numa transação e fecham a origem vazia. A dashboard de Serviço passa a ignorar os cards "unificados" nas métricas de perda. No front, uma seção nova `ServiceRelatedCardsSection` na coluna esquerda do card, que recarrega a seção de Produtos via `refreshKey`.

**Tech Stack:** FastAPI + SQLAlchemy (sync) + Pydantic v2; pytest com SQLite em memória (`tests/conftest.py`); React + TypeScript + Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-25-mover-aparelhos-mesmo-cnpj-design.md`

**Como rodar os testes backend:**
```bash
export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"; export MSYS_NO_PATHCONV=1
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_mover_aparelhos.py tests/unit/test_dashboard_unificado.py -v
```
**Typecheck front:** `cd frontend && npx tsc --noEmit`

**Regra do projeto:** nunca commitar sem perguntar "posso commitar?"; nunca incluir `backend/scripts/imports/`.

---

## Mapa de arquivos
| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `backend/app/schemas/service_board.py` | Modificar | `PullDevicesItem`, `PullDevicesRequest`, `RelatedDevicesCard` |
| `backend/app/services/service_board_service.py` | Modificar | `UNIFIED_LOSS_REASON`, `_is_closed_list`, `list_related_devices`, `pull_devices`, `_lost_list_for_board`, `_fechar_como_unificado` |
| `backend/app/services/service_dashboard_service.py` | Modificar | Excluir "unificados" das métricas de perda |
| `backend/app/api/v1/endpoints/service_boards.py` | Modificar | Rotas `GET related-devices` e `POST pull-devices` |
| `backend/tests/unit/test_mover_aparelhos.py` | Criar | Testes do movimento e do fechamento |
| `backend/tests/unit/test_dashboard_unificado.py` | Criar | Teste da exclusão nas métricas |
| `frontend/src/constants/blueprintOptions.ts` | Modificar | `SERVICE_UNIFIED_LOSS_REASON` |
| `frontend/src/pages/ServiceKanban.tsx` | Modificar | Motivo novo no filtro "Motivo de perda" |
| `frontend/src/services/serviceBoardService.ts` | Modificar | Tipos + `getRelatedDevices` / `pullDevices` |
| `frontend/src/components/service/ServiceRelatedCardsSection.tsx` | Criar | UI "Outros cards do mesmo CNPJ" |
| `frontend/src/components/service/ServiceProductSection.tsx` | Modificar | Prop `refreshKey` |
| `frontend/src/pages/ServiceCardDetails.tsx` | Modificar | Renderizar a seção nova + `refreshKey` |
| `frontend/src/components/service/ServiceActivityTab.tsx` | Modificar | Ícones de `devices_moved_in/out` e `card_unified` |
| `CHANGELOG.md`, `ChangelogModal.tsx`, `MainLayout.tsx` | Modificar | Versão nova |

---

### Task 1: Schemas

**Files:**
- Modify: `backend/app/schemas/service_board.py` (logo após `class ServiceCardProductResponse`)
- Modify: `backend/app/services/service_board_service.py` (import)

- [ ] **Step 1: Adicionar os schemas**

```python
class PullDevicesItem(BaseModel):
    """Uma linha de produto (modelo) a puxar do card de origem."""
    product_id: int
    all: bool = False               # True = linha inteira (todos os aparelhos + quantity)
    indices: List[int] = []         # índices em `aparelhos` da linha de origem (quando all=False)


class PullDevicesRequest(BaseModel):
    from_card_id: int
    items: List[PullDevicesItem]


class RelatedDevicesCard(BaseModel):
    """Outro card em aberto do mesmo CNPJ e board, com seus produtos/aparelhos."""
    id: int
    title: str
    list_name: Optional[str] = None
    products: List[ServiceCardProductResponse] = []
```
(`List`/`Optional`/`BaseModel` já são importados no arquivo — conferir o topo.)

- [ ] **Step 2:** No `service_board_service.py`, no bloco `from app.schemas.service_board import (`, acrescentar `PullDevicesRequest, RelatedDevicesCard,`.

---

### Task 2: Regra de movimento + fechamento da origem (TDD)

**Files:**
- Create: `backend/tests/unit/test_mover_aparelhos.py`
- Modify: `backend/app/services/service_board_service.py`

- [ ] **Step 1: Escrever os testes (falhando)**

```python
"""Mover aparelhos entre cards do mesmo CNPJ (mesmo board, só em aberto)."""
import pytest
from fastapi import HTTPException

from app.models.client import Client
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_card_product import ServiceCardProduct
from app.models.service_list import ServiceList
from app.models.service_product import ServiceProduct
from app.schemas.service_board import PullDevicesRequest, PullDevicesItem
from app.services.service_board_service import ServiceBoardService


@pytest.fixture
def cenario(db):
    b = ServiceBoard(name="Cobrança"); outro = ServiceBoard(name="Serviços")
    db.add_all([b, outro]); db.commit()
    aberta = ServiceList(board_id=b.id, name="Oportunidade Existente", position=0)
    ganho = ServiceList(board_id=b.id, name="Negócio Ganho", position=1, is_done_stage=True)
    aberta_outro = ServiceList(board_id=outro.id, name="Entrada", position=0)
    cli = Client(name="Terraço"); cli2 = Client(name="Outro CNPJ")
    mod = ServiceProduct(name="IBlow 10"); mod2 = ServiceProduct(name="Mercury")
    db.add_all([aberta, ganho, aberta_outro, cli, cli2, mod, mod2]); db.commit()

    def card(lista, cliente, titulo):
        c = ServiceCard(list_id=lista.id, client_id=cliente.id if cliente else None, title=titulo)
        db.add(c); db.commit(); db.refresh(c); return c

    origem = card(aberta, cli, "Atrasados")
    destino = card(aberta, cli, "A vencer")
    aps = [{"serial_number": f"S{i}", "model": "IBlow 10"} for i in range(5)]
    db.add(ServiceCardProduct(service_card_id=origem.id, product_id=mod.id,
                              quantity=5, unit_price=0, discount=0, aparelhos=aps))
    db.commit()
    return {"db": db, "b": b, "aberta": aberta, "ganho": ganho, "aberta_outro": aberta_outro,
            "cli": cli, "cli2": cli2, "mod": mod, "mod2": mod2,
            "origem": origem, "destino": destino, "card": card}


def _linha(db, card_id, product_id):
    return (db.query(ServiceCardProduct)
            .filter_by(service_card_id=card_id, product_id=product_id).first())


def _pull(c, items):
    return ServiceBoardService(c["db"]).pull_devices(
        c["b"].id, c["destino"].id,
        PullDevicesRequest(from_card_id=c["origem"].id, items=items), None)


def test_related_lista_so_mesmo_cnpj_board_e_aberto(cenario):
    c = cenario
    c["card"](c["aberta"], c["cli2"], "Outro cliente")     # CNPJ diferente
    c["card"](c["ganho"], c["cli"], "Fechado")             # fechado
    c["card"](c["aberta_outro"], c["cli"], "Outro board")  # outro board
    rel = ServiceBoardService(c["db"]).list_related_devices(c["b"].id, c["destino"].id)
    assert [r.id for r in rel] == [c["origem"].id]
    assert rel[0].products[0].quantity == 5


def test_related_card_sem_cliente_retorna_vazio(cenario):
    c = cenario
    sem = c["card"](c["aberta"], None, "Sem cliente")
    assert ServiceBoardService(c["db"]).list_related_devices(c["b"].id, sem.id) == []


def test_mover_individual_cria_linha_no_destino(cenario):
    c = cenario
    r = _pull(c, [PullDevicesItem(product_id=c["mod"].id, indices=[0, 2, 4])])
    db = c["db"]; db.expire_all()
    src = _linha(db, c["origem"].id, c["mod"].id)
    dst = _linha(db, c["destino"].id, c["mod"].id)
    assert src.quantity == 2 and [a["serial_number"] for a in src.aparelhos] == ["S1", "S3"]
    assert dst.quantity == 3 and [a["serial_number"] for a in dst.aparelhos] == ["S0", "S2", "S4"]
    assert float(dst.discount) == 0
    assert r["origin_closed"] is False


def test_mover_mescla_quando_destino_ja_tem_modelo(cenario):
    c = cenario; db = c["db"]
    db.add(ServiceCardProduct(service_card_id=c["destino"].id, product_id=c["mod"].id,
                              quantity=1, unit_price=0, discount=0,
                              aparelhos=[{"serial_number": "D1"}]))
    db.commit()
    _pull(c, [PullDevicesItem(product_id=c["mod"].id, indices=[1])])
    db.expire_all()
    dst = _linha(db, c["destino"].id, c["mod"].id)
    assert dst.quantity == 2 and [a["serial_number"] for a in dst.aparelhos] == ["D1", "S1"]


def test_mover_todos_remove_linha_da_origem(cenario):
    c = cenario
    _pull(c, [PullDevicesItem(product_id=c["mod"].id, all=True)])
    db = c["db"]; db.expire_all()
    assert _linha(db, c["origem"].id, c["mod"].id) is None
    assert _linha(db, c["destino"].id, c["mod"].id).quantity == 5


def test_registra_historico_nos_dois_cards(cenario):
    c = cenario
    _pull(c, [PullDevicesItem(product_id=c["mod"].id, indices=[0])])
    tipos = {(a.service_card_id, a.activity_type) for a in c["db"].query(ServiceCardActivity).all()}
    assert (c["origem"].id, "devices_moved_out") in tipos
    assert (c["destino"].id, "devices_moved_in") in tipos


def test_esvaziar_origem_fecha_como_unificado(cenario):
    c = cenario
    r = _pull(c, [PullDevicesItem(product_id=c["mod"].id, all=True)])
    db = c["db"]; db.expire_all()
    assert r["origin_closed"] is True
    origem = db.get(ServiceCard, c["origem"].id)
    lista = db.get(ServiceList, origem.list_id)
    assert lista.is_lost_stage and lista.board_id == c["b"].id   # lista criada na hora
    acts = db.query(ServiceCardActivity).filter_by(service_card_id=origem.id).all()
    assert any(a.description == "Motivo da perda: Unificado em outro card" for a in acts)
    tipos = {a.activity_type for a in acts}
    assert "card_unified" in tipos and "card_lost" not in tipos


def test_nao_fecha_se_origem_ainda_tem_produto(cenario):
    c = cenario; db = c["db"]
    db.add(ServiceCardProduct(service_card_id=c["origem"].id, product_id=c["mod2"].id,
                              quantity=1, unit_price=0, discount=0,
                              aparelhos=[{"serial_number": "M1"}]))
    db.commit()
    r = _pull(c, [PullDevicesItem(product_id=c["mod"].id, all=True)])
    db.expire_all()
    assert r["origin_closed"] is False
    assert db.get(ServiceCard, c["origem"].id).list_id == c["aberta"].id


def test_fechamento_usa_lista_perdido_existente(cenario):
    c = cenario; db = c["db"]
    perdido = ServiceList(board_id=c["b"].id, name="Negócio Perdido", position=2, is_lost_stage=True)
    db.add(perdido); db.commit()
    _pull(c, [PullDevicesItem(product_id=c["mod"].id, all=True)])
    db.expire_all()
    assert db.get(ServiceCard, c["origem"].id).list_id == perdido.id
    assert db.query(ServiceList).filter_by(board_id=c["b"].id, is_lost_stage=True).count() == 1


@pytest.mark.parametrize("caso", ["cnpj", "fechado", "indice", "vazio", "duplicado", "mesmo"])
def test_validacoes(cenario, caso):
    c = cenario; svc = ServiceBoardService(c["db"])
    item = PullDevicesItem(product_id=c["mod"].id, indices=[0])
    origem_id = c["origem"].id
    items = [item]
    if caso == "cnpj":
        origem_id = c["card"](c["aberta"], c["cli2"], "Outro").id
    elif caso == "fechado":
        c["origem"].list_id = c["ganho"].id; c["db"].commit()
    elif caso == "indice":
        items = [PullDevicesItem(product_id=c["mod"].id, indices=[9])]
    elif caso == "vazio":
        items = [PullDevicesItem(product_id=c["mod"].id, indices=[])]
    elif caso == "duplicado":
        items = [item, item]
    elif caso == "mesmo":
        origem_id = c["destino"].id
    with pytest.raises(HTTPException) as exc:
        svc.pull_devices(c["b"].id, c["destino"].id,
                         PullDevicesRequest(from_card_id=origem_id, items=items), None)
    assert exc.value.status_code == 400
```

- [ ] **Step 2: Rodar e ver falhar** — comando de testes do topo (só o primeiro arquivo). Expected: FAIL com `AttributeError: 'ServiceBoardService' object has no attribute 'list_related_devices'`.

- [ ] **Step 3: Constante no topo do módulo** `service_board_service.py` (junto das outras constantes de módulo):

```python
# Motivo de sistema para cards esvaziados ao mover aparelhos para outro card do
# mesmo CNPJ. Não é perda real: a dashboard exclui esses cards das métricas de perda.
UNIFIED_LOSS_REASON = "Unificado em outro card"
```

- [ ] **Step 4: Implementar** (nova seção, antes de `# ─── Card Services`)

```python
    # ─── Mover aparelhos entre cards do mesmo CNPJ ───────────────────────────────

    @staticmethod
    def _is_closed_list(lst) -> bool:
        """Ganho/Perdido por flag OU por nome (as listas nem sempre têm a flag)."""
        if not lst:
            return False
        nome = (lst.name or "").lower()
        return bool(lst.is_done_stage or lst.is_lost_stage or "ganho" in nome or "perdido" in nome)

    def list_related_devices(self, board_id: int, card_id: int) -> List[RelatedDevicesCard]:
        """Outros cards EM ABERTO do mesmo CNPJ (client_id) e do mesmo board, com aparelhos."""
        card = self.get_card_in_board(board_id, card_id)
        if not card.client_id:
            return []
        outros = (
            self.db.query(ServiceCard)
            .join(ServiceList, ServiceCard.list_id == ServiceList.id)
            .filter(
                ServiceList.board_id == board_id,
                ServiceCard.client_id == card.client_id,
                ServiceCard.id != card.id,
                ServiceCard.is_deleted == False,  # noqa: E712
            )
            .order_by(ServiceCard.created_at.desc())
            .all()
        )
        result: List[RelatedDevicesCard] = []
        for o in outros:
            if self._is_closed_list(o.list):
                continue
            items = self.repo.list_card_products(o.id)
            result.append(RelatedDevicesCard(
                id=o.id,
                title=o.title,
                list_name=o.list.name if o.list else None,
                products=[self._build_card_product_response(i) for i in items],
            ))
        return result

    def _lost_list_for_board(self, board_id: int) -> ServiceList:
        """Lista de Perdido do board (flag ou nome); cria 'Negócio Perdido' se não existir."""
        listas = self.repo.list_lists_by_board(board_id)
        for lst in listas:
            if lst.is_lost_stage or "perdido" in (lst.name or "").lower():
                return lst
        nova = ServiceList(
            board_id=board_id, name="Negócio Perdido", color="#EF4444", is_lost_stage=True,
            position=max((lst.position or 0 for lst in listas), default=0) + 1,
        )
        self.db.add(nova)
        self.db.commit()
        self.db.refresh(nova)
        return nova

    def _fechar_como_unificado(self, origem: ServiceCard, destino: ServiceCard, user: Optional[User]) -> None:
        """Fecha a origem esvaziada como Perdido — 'Unificado em outro card'.

        Grava evento `card_unified` (e NÃO `card_lost`) para não contar como perda.
        """
        lost = self._lost_list_for_board(origem.list.board_id)
        self.repo.move_card(origem.id, lost.id, self.repo.top_position(lost.id))
        self._complete_pending_activities(origem.id)
        self.repo.create_activity(
            service_card_id=origem.id,
            user_id=user.id if user else None,
            category="anotacao",
            activity_type="note",
            description=f"Motivo da perda: {UNIFIED_LOSS_REASON}",
        )
        self.log_event(origem.id, user, "card_unified",
                       f"Card unificado no card #{destino.id} — {destino.title} (ficou sem aparelhos)",
                       {"to_card_id": destino.id, "to_list_id": lost.id})

    def pull_devices(self, board_id: int, card_id: int, data: PullDevicesRequest, user: Optional[User]) -> dict:
        """Puxa aparelhos de outro card (mesmo CNPJ/board, ambos em aberto) para `card_id`.

        Move só aparelhos: serviços e valor não são alterados. Se a origem ficar sem
        nenhum produto, é fechada como 'Unificado em outro card'.
        """
        import copy

        def erro(msg: str):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

        destino = self.get_card_in_board(board_id, card_id)
        origem = self.get_card_in_board(board_id, data.from_card_id)
        if origem.id == destino.id:
            erro("Origem e destino são o mesmo card")
        if not destino.client_id or origem.client_id != destino.client_id:
            erro("Os cards precisam ser do mesmo CNPJ")
        if self._is_closed_list(origem.list) or self._is_closed_list(destino.list):
            erro("Só é possível mover aparelhos entre cards em aberto")
        if not data.items:
            erro("Nenhum aparelho selecionado")
        pids = [it.product_id for it in data.items]
        if len(pids) != len(set(pids)):
            erro("Produto repetido no pedido")

        resumos: List[str] = []
        for it in data.items:
            src = self.repo.get_card_product_by_card_and_product(origem.id, it.product_id)
            if not src:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                    detail=f"Produto {it.product_id} não está no card de origem")
            src_aps = list(src.aparelhos or [])
            if it.all:
                mover = src_aps
                qtd = int(src.quantity or 0)
                resto_aps: list = []
                resto_qtd = 0
            else:
                idxs = sorted(set(it.indices or []))
                if not idxs:
                    erro("Selecione ao menos um aparelho")
                if any(i < 0 or i >= len(src_aps) for i in idxs):
                    erro("Aparelho selecionado não existe mais no card de origem — recarregue a página")
                sel = set(idxs)
                mover = [src_aps[i] for i in idxs]
                qtd = len(mover)
                resto_aps = [a for i, a in enumerate(src_aps) if i not in sel]
                resto_qtd = max(int(src.quantity or 0) - qtd, 0)

            nome = src.product.name if src.product else f"Produto {it.product_id}"
            dst = self.repo.get_card_product_by_card_and_product(destino.id, it.product_id)
            if dst:
                dst.aparelhos = list(dst.aparelhos or []) + copy.deepcopy(mover)
                dst.quantity = int(dst.quantity or 0) + qtd
            else:
                self.db.add(ServiceCardProduct(
                    service_card_id=destino.id,
                    product_id=it.product_id,
                    quantity=qtd,
                    unit_price=src.unit_price,
                    discount=0,
                    aparelhos=copy.deepcopy(mover) or None,
                ))

            if resto_qtd <= 0 and not resto_aps:
                self.db.delete(src)
            else:
                src.aparelhos = resto_aps or None
                src.quantity = resto_qtd

            series = [a.get("serial_number") for a in mover if isinstance(a, dict) and a.get("serial_number")]
            resumos.append(f"{nome} ({qtd} aparelho(s)" + (f": {', '.join(series)}" if series else "") + ")")

        self.db.commit()

        resumo = "; ".join(resumos)
        por = user.name if user else "sistema"
        self.log_event(origem.id, user, "devices_moved_out",
                       f"Aparelho(s) movido(s) para o card #{destino.id} — {destino.title}: {resumo} · por {por}",
                       {"to_card_id": destino.id})
        self.log_event(destino.id, user, "devices_moved_in",
                       f"Aparelho(s) recebido(s) do card #{origem.id} — {origem.title}: {resumo} · por {por}",
                       {"from_card_id": origem.id})

        origin_closed = False
        if not self.repo.list_card_products(origem.id):
            self._fechar_como_unificado(origem, destino, user)
            origin_closed = True

        return {"message": "Aparelhos movidos com sucesso", "moved": resumos, "origin_closed": origin_closed}
```

- [ ] **Step 5: Rodar e ver passar** — Expected: 15 PASS (9 + 6 parametrizados).

- [ ] **Step 6: Commit** — *perguntar "posso commitar?" antes.*
```bash
git add backend/app/schemas/service_board.py backend/app/services/service_board_service.py backend/tests/unit/test_mover_aparelhos.py
git commit -m "feat(servico): puxar aparelhos de cards do mesmo CNPJ e fechar origem vazia como unificada"
```

---

### Task 3: Dashboard ignora "Unificado em outro card" (TDD)

**Files:**
- Create: `backend/tests/unit/test_dashboard_unificado.py`
- Modify: `backend/app/services/service_dashboard_service.py`

- [ ] **Step 1: Teste (falhando)**

```python
"""Cards fechados como 'Unificado em outro card' não contam como perda na dashboard."""
from datetime import datetime, timedelta

from app.models.client import Client
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_card_product import ServiceCardProduct
from app.models.service_list import ServiceList
from app.models.service_product import ServiceProduct
from app.schemas.service_board import PullDevicesRequest, PullDevicesItem
from app.services.service_board_service import ServiceBoardService
from app.services.service_dashboard_service import ServiceDashboardService


def test_unificado_fora_das_metricas_de_perda(db):
    b = ServiceBoard(name="Cobrança"); db.add(b); db.commit()
    aberta = ServiceList(board_id=b.id, name="Entrada", position=0)
    perdido = ServiceList(board_id=b.id, name="Negócio Perdido", position=1, is_lost_stage=True)
    cli = Client(name="Terraço"); mod = ServiceProduct(name="IBlow 10")
    db.add_all([aberta, perdido, cli, mod]); db.commit()
    origem = ServiceCard(list_id=aberta.id, client_id=cli.id, title="Origem")
    destino = ServiceCard(list_id=aberta.id, client_id=cli.id, title="Destino")
    real = ServiceCard(list_id=perdido.id, client_id=cli.id, title="Perda real")
    db.add_all([origem, destino, real]); db.commit()
    db.add(ServiceCardProduct(service_card_id=origem.id, product_id=mod.id, quantity=1,
                              unit_price=0, discount=0, aparelhos=[{"serial_number": "S1"}]))
    db.add(ServiceCardActivity(service_card_id=real.id, category="anotacao", activity_type="note",
                               description="Motivo da perda: Sem budget aprovado"))
    db.commit()

    ServiceBoardService(db).pull_devices(
        b.id, destino.id,
        PullDevicesRequest(from_card_id=origem.id, items=[PullDevicesItem(product_id=mod.id, all=True)]),
        None)

    agora = datetime.utcnow()
    r = ServiceDashboardService(db).get_dashboard(agora - timedelta(days=1), agora + timedelta(days=1), boards={b.id})
    assert r.lost_count == 1                                    # só a perda real
    assert all(x.name != "Unificado em outro card" for x in r.loss_reasons)
```
(Conferir o nome do campo de motivos no `ServiceDashboardResponse` — no service a variável é `loss_reasons`.)

- [ ] **Step 2: Rodar e ver falhar** — Expected: `assert 2 == 1`.

- [ ] **Step 3: Calcular os unificados** — logo após `card_ids = [c.id for c in cards]` em `get_dashboard`:

```python
        # Cards cujo ÚLTIMO motivo de perda é "Unificado em outro card" (esvaziados ao
        # mover aparelhos para outro card do mesmo CNPJ): não são perda real.
        from app.services.service_board_service import UNIFIED_LOSS_REASON
        unified_ids: set = set()
        if card_ids:
            vistos: set = set()
            for cid, desc in (
                db.query(ServiceCardActivity.service_card_id, ServiceCardActivity.description)
                .filter(
                    ServiceCardActivity.service_card_id.in_(card_ids),
                    ServiceCardActivity.category == "anotacao",
                    ServiceCardActivity.description.like("Motivo da perda:%"),
                )
                .order_by(ServiceCardActivity.created_at.desc(), ServiceCardActivity.id.desc())
                .all()
            ):
                if cid in vistos:
                    continue
                vistos.add(cid)
                if (desc or "").replace("Motivo da perda:", "").strip().startswith(UNIFIED_LOSS_REASON):
                    unified_ids.add(cid)
```

- [ ] **Step 4: Aplicar a exclusão**
  - Perdidos sem filtro de usuário:
    ```python
            lost_cards = [c for c in cards if c.list_id in lost_ids and c.id not in unified_ids
                          and c.updated_at and start <= c.updated_at <= end]
    ```
    (Com filtro de usuário não precisa: usa o evento `card_lost`, e o unificado grava `card_unified`.)
  - Gráfico de motivos — no laço `for (desc,) in notes:`, após calcular `r`:
    ```python
                if r.startswith(UNIFIED_LOSS_REASON):
                    continue
    ```
  - Evolução sem filtro:
    ```python
                    elif c.list_id in lost_ids and c.id not in unified_ids:
                        lost_by_month[key] += 1
    ```

- [ ] **Step 5: Rodar os dois arquivos de teste** — Expected: 16 PASS.

- [ ] **Step 6: Commit** — *perguntar antes.*

---

### Task 4: Endpoints

**Files:**
- Modify: `backend/app/api/v1/endpoints/service_boards.py` (logo após `remove_service_card_product`)

- [ ] **Step 1:** Incluir `PullDevicesRequest, RelatedDevicesCard` no import de `app.schemas.service_board` e adicionar:

```python
@router.get("/{board_id}/cards/{card_id}/related-devices", response_model=List[RelatedDevicesCard])
async def list_related_devices(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Outros cards em aberto do mesmo CNPJ e board, com seus aparelhos."""
    return ServiceBoardService(db).list_related_devices(board_id, card_id)


@router.post("/{board_id}/cards/{card_id}/pull-devices")
async def pull_devices(
    board_id: int = Path(...),
    card_id: int = Path(...),
    data: PullDevicesRequest = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    """Puxa aparelhos de outro card do mesmo CNPJ para este card (card_id = destino)."""
    return ServiceBoardService(db).pull_devices(board_id, card_id, data, current_user)
```
(Confirmar que `List` já vem de `typing` no arquivo.)

- [ ] **Step 2: Verificar as rotas**
```bash
docker exec -w /app hsgrowth-api-local python -c "from app.api.v1.endpoints import service_boards as s; print([r.path for r in s.router.routes if 'devices' in r.path])"
```
Expected: `['/{board_id}/cards/{card_id}/related-devices', '/{board_id}/cards/{card_id}/pull-devices']`

- [ ] **Step 3: Commit** — *perguntar antes.*

---

### Task 5: Front — constante, filtro e service

**Files:**
- Modify: `frontend/src/constants/blueprintOptions.ts`
- Modify: `frontend/src/pages/ServiceKanban.tsx`
- Modify: `frontend/src/services/serviceBoardService.ts`

- [ ] **Step 1:** Em `blueprintOptions.ts`, abaixo de `SERVICE_ADMIN_LOSS_REASON`:
```ts
// Motivo de sistema: card esvaziado ao mover aparelhos para outro card do mesmo CNPJ.
// Não entra no modal de perda manual; aparece só no filtro. Não conta como perda na dashboard.
export const SERVICE_UNIFIED_LOSS_REASON = "Unificado em outro card";
```

- [ ] **Step 2:** Em `ServiceKanban.tsx`, importar `SERVICE_UNIFIED_LOSS_REASON` junto de `SERVICE_ADMIN_LOSS_REASON` e, nas opções do filtro "Motivo de perda":
```tsx
                  ...[...SERVICE_LOSS_REASONS, SERVICE_ADMIN_LOSS_REASON, SERVICE_UNIFIED_LOSS_REASON].map((r) => ({ value: r, label: r })),
```

- [ ] **Step 3:** Em `serviceBoardService.ts`, tipos (após `UpdateServiceCardProductRequest`):
```ts
export interface RelatedDevicesCard {
  id: number;
  title: string;
  list_name?: string | null;
  products: ServiceCardProduct[];
}

export interface PullDevicesItem {
  product_id: number;
  all?: boolean;
  indices?: number[];
}

export interface PullDevicesResult {
  message: string;
  moved: string[];
  origin_closed: boolean;
}
```
e métodos (após `removeCardProduct`):
```ts
  // Outros cards em aberto do mesmo CNPJ (mesmo board) com seus aparelhos
  async getRelatedDevices(boardId: number, cardId: number): Promise<RelatedDevicesCard[]> {
    const r = await api.get<RelatedDevicesCard[]>(`${BASE}/${boardId}/cards/${cardId}/related-devices`);
    return r.data;
  }

  // Puxa aparelhos de outro card para este (cardId = destino)
  async pullDevices(boardId: number, cardId: number, fromCardId: number, items: PullDevicesItem[]): Promise<PullDevicesResult> {
    const r = await api.post<PullDevicesResult>(`${BASE}/${boardId}/cards/${cardId}/pull-devices`, { from_card_id: fromCardId, items });
    return r.data;
  }
```

- [ ] **Step 4:** `cd frontend && npx tsc --noEmit` → EXIT 0.

---

### Task 6: `refreshKey` na seção de Produtos

**Files:**
- Modify: `frontend/src/components/service/ServiceProductSection.tsx`

- [ ] **Step 1:** Em `ServiceProductSectionProps`:
```ts
  /** Muda para forçar o recarregamento dos produtos (ex.: após puxar aparelhos). */
  refreshKey?: number;
```
- [ ] **Step 2:** Desestruturar `refreshKey` e trocar o efeito de carga:
```ts
  useEffect(() => {
    loadProducts();
  }, [boardId, cardId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
```

---

### Task 7: Componente `ServiceRelatedCardsSection`

**Files:**
- Create: `frontend/src/components/service/ServiceRelatedCardsSection.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ChevronDown, ChevronRight, ExternalLink, ArrowDownToLine } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import serviceBoardService, { RelatedDevicesCard, PullDevicesItem } from "../../services/serviceBoardService";
import { showError, showSuccess } from "../../utils/toast";
import { useAuth } from "../../hooks/useAuth";
import { useConfirm } from "../../contexts/ConfirmContext";

interface Props {
  boardId: number;
  cardId: number;
  /** Card atual tem cliente (CNPJ)? Sem cliente a seção não aparece. */
  hasClient: boolean;
  /** Chamado após mover (recarregar Produtos + histórico do card atual). */
  onMoved?: () => void;
}

/**
 * "Outros cards do mesmo CNPJ": lista os cards EM ABERTO do mesmo cliente e board e
 * permite puxar aparelhos (individuais ou a linha inteira) para o card atual.
 * Só move aparelhos — serviços/valor não mudam. Se a origem ficar sem aparelhos,
 * o backend a fecha como Perdido — "Unificado em outro card" (avisamos antes).
 */
const ServiceRelatedCardsSection: React.FC<Props> = ({ boardId, cardId, hasClient, onMoved }) => {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const canEdit = user?.role !== "viewer";
  const [cards, setCards] = useState<RelatedDevicesCard[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  // Seleção: chave `${productId}:${index}`
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState(false);

  const load = async () => {
    if (!hasClient) { setCards([]); return; }
    try {
      setCards(await serviceBoardService.getRelatedDevices(boardId, cardId));
    } catch {
      showError("Erro ao carregar outros cards do CNPJ");
    }
  };

  useEffect(() => { load(); setOpen(null); setSel(new Set()); }, [boardId, cardId, hasClient]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasClient) return null;

  const toggle = (key: string) =>
    setSel((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // A seleção esvazia o card de origem? (toda linha dele sai zerada)
  const esvazia = (c: RelatedDevicesCard, items: PullDevicesItem[]) =>
    c.products.length > 0 && c.products.every((p) => {
      const it = items.find((i) => i.product_id === p.product_id);
      if (!it) return false;
      if (it.all) return true;
      const n = it.indices?.length || 0;
      return n >= (p.aparelhos?.length || 0) && n >= (p.quantity || 0);
    });

  const pull = async (c: RelatedDevicesCard, items: PullDevicesItem[]) => {
    if (items.length === 0) return;
    if (esvazia(c, items)) {
      const ok = await confirm({
        title: "Card vai ficar sem aparelhos",
        message: `O card "${c.title}" vai ficar sem aparelhos e será fechado como Perdido (motivo: Unificado em outro card). Continuar?`,
        confirmText: "Mover e fechar",
        isDanger: true,
      });
      if (!ok) return;
    }
    try {
      setMoving(true);
      const r = await serviceBoardService.pullDevices(boardId, cardId, c.id, items);
      showSuccess(r.origin_closed
        ? "Aparelhos movidos — o card de origem foi fechado (Unificado em outro card)."
        : "Aparelhos movidos para este card!");
      setSel(new Set());
      await load();
      onMoved?.();
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      showError(typeof d === "string" ? d : "Erro ao mover aparelhos");
    } finally {
      setMoving(false);
    }
  };

  const pullSelected = (c: RelatedDevicesCard) => {
    const byProduct = new Map<number, number[]>();
    sel.forEach((k) => {
      const [pid, idx] = k.split(":").map(Number);
      if (!c.products.some((p) => p.product_id === pid)) return;
      byProduct.set(pid, [...(byProduct.get(pid) || []), idx]);
    });
    pull(c, Array.from(byProduct.entries()).map(([product_id, indices]) => ({ product_id, indices })));
  };

  const totalAparelhos = (c: RelatedDevicesCard) => c.products.reduce((s, p) => s + (p.quantity || 0), 0);

  return (
    <ExpandableSection title="Outros cards do mesmo CNPJ" defaultExpanded={false}
      icon={<Building2 size={18} />} badge={cards.length > 0 ? cards.length : undefined}>
      {cards.length === 0 ? (
        <p className="py-2 text-sm text-slate-500 dark:text-slate-400">Nenhum outro card em aberto deste CNPJ neste board.</p>
      ) : (
        <div className="space-y-2">
          {cards.map((c) => {
            const isOpen = open === c.id;
            const selCount = Array.from(sel).filter((k) => c.products.some((p) => p.product_id === Number(k.split(":")[0]))).length;
            return (
              <div key={c.id} className="rounded-lg border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 p-2">
                  <button onClick={() => { setOpen(isOpen ? null : c.id); setSel(new Set()); }}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.title}</span>
                  </button>
                  <span className="text-[11px] text-slate-400">{c.list_name} · {totalAparelhos(c)} ap.</span>
                  <Link to={`/servicos/${boardId}/cards/${c.id}`} title="Abrir card" className="text-slate-400 hover:text-blue-400">
                    <ExternalLink size={14} />
                  </Link>
                </div>

                {isOpen && (
                  <div className="space-y-3 border-t border-gray-200 p-2 dark:border-slate-700">
                    {c.products.length === 0 && <p className="text-xs text-slate-400">Sem produtos neste card.</p>}
                    {c.products.map((p) => (
                      <div key={p.id}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {p.product_name || `Produto ${p.product_id}`} · {p.quantity} ap.
                          </span>
                          {canEdit && (
                            <button disabled={moving} onClick={() => pull(c, [{ product_id: p.product_id, all: true }])}
                              className="text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-50">
                              Mover todos
                            </button>
                          )}
                        </div>
                        {(p.aparelhos || []).map((a, i) => {
                          const key = `${p.product_id}:${i}`;
                          return (
                            <label key={key} className="flex items-center gap-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                              {canEdit && <input type="checkbox" checked={sel.has(key)} onChange={() => toggle(key)} />}
                              <span>{a.serial_number || "Sem série"}</span>
                              {a.model && <span className="text-slate-400">· {a.model}</span>}
                              {a.next_recalibration_date && (
                                <span className="text-slate-400">· próx. {new Date(a.next_recalibration_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ))}
                    {canEdit && (
                      <button disabled={moving || selCount === 0} onClick={() => pullSelected(c)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 py-1.5 text-xs font-medium text-emerald-500 hover:bg-emerald-500/30 disabled:opacity-50">
                        <ArrowDownToLine size={14} /> Mover selecionados para este card{selCount > 0 ? ` (${selCount})` : ""}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ExpandableSection>
  );
};

export default ServiceRelatedCardsSection;
```

- [ ] **Step 2:** `cd frontend && npx tsc --noEmit` → EXIT 0.

---

### Task 8: Integrar no card + ícones do histórico

**Files:**
- Modify: `frontend/src/pages/ServiceCardDetails.tsx`
- Modify: `frontend/src/components/service/ServiceActivityTab.tsx`

- [ ] **Step 1:** Em `ServiceCardDetails.tsx`, importar:
```ts
import ServiceRelatedCardsSection from "../components/service/ServiceRelatedCardsSection";
```
e, junto dos `useState` do componente principal:
```ts
  // Força recarregar a seção de Produtos após puxar aparelhos de outro card
  const [productsRefresh, setProductsRefresh] = useState(0);
```

- [ ] **Step 2:** Na coluna esquerda, passar `refreshKey={productsRefresh}` para `<ServiceProductSection …/>` e, logo após `<ServiceServicesSection …/>`:
```tsx
          <ServiceRelatedCardsSection
            boardId={numBoardId}
            cardId={numCardId}
            hasClient={!!card.client_id}
            onMoved={() => { setProductsRefresh((k) => k + 1); reloadActivities(); }}
          />
```

- [ ] **Step 3:** Em `ServiceActivityTab.tsx` (`changeIcon`):
```ts
    case "product_added":
    case "product_removed":
    case "devices_moved_in":
    case "devices_moved_out": return <Package size={16} className="text-violet-400" />;
    case "card_unified": return <XCircle size={16} className="text-slate-400" />;
```

- [ ] **Step 4:** `cd frontend && npx tsc --noEmit` → EXIT 0.

- [ ] **Step 5: Teste manual no homo**
  1. Card de Cobrança com cliente que tenha outro card em aberto (mesmo CNPJ) com aparelhos → a seção "Outros cards do mesmo CNPJ" lista esse card (e não lista Ganho/Perdido nem cards de outro board).
  2. Marcar 2 de 5 aparelhos → "Mover selecionados" → toast; Produtos do card atual mostram os 2; o outro fica com 3.
  3. No outro card, "Mover todos" na última linha → aparece o aviso "vai ficar sem aparelhos…" → confirmar → toast de fechamento; o card de origem está em Negócio Perdido com motivo "Unificado em outro card".
  4. Histórico: origem mostra "movido para…" e "Card unificado no card #N"; destino mostra "recebido de…".
  5. Filtro "Motivo de perda" do kanban lista "Unificado em outro card" e encontra o card.
  6. Dashboard de Serviço: "Perdidos no período" e "Taxa de ganho" não mudam por causa do card unificado.
  7. Logado como viewer: sem checkboxes/botões.

---

### Task 9: Changelog

- [ ] **Step 1:** Conferir a versão atual (`grep -n "HSGrowth CRM v" frontend/src/layouts/MainLayout.tsx`) e subir o patch nos 3 lugares (`CHANGELOG.md`, `ChangelogModal.tsx` — type `feature`, rodapé do `MainLayout.tsx`):
  > **Serviço/Cobrança — mover aparelhos entre cards do mesmo CNPJ:** no card, a seção "Outros cards do mesmo CNPJ" lista os cards em aberto do mesmo cliente e board; dá para puxar aparelhos (selecionados ou a linha inteira) para o card atual, com registro no histórico dos dois cards. Se o card de origem ficar sem aparelhos, ele é fechado como Perdido — **"Unificado em outro card"** — e **não conta** nas métricas de perda. Serviços e valor não são alterados.
- [ ] **Step 2:** `npx tsc --noEmit` → EXIT 0; `git status` só com os arquivos da feature (nunca `backend/scripts/imports/`).
- [ ] **Step 3: Commit final** — *perguntar "posso commitar?" antes.*
