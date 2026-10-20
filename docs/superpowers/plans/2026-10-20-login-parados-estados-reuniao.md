# Login, "Parados" clicável e estados das reuniões — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login mostra "Email ou senha incorretos"; os números de parados da dashboard abrem a lista dos cards e batem com o filtro do board; a página de Reuniões diz a verdade sobre cada reunião.

**Architecture:** Três partes independentes. Login: só frontend (`Login.tsx`, `api.ts`). Parados: a regra sai de dentro de `get_dashboard_kpis` para um método único do `ReportService`, usado pelo número e por uma rota nova de lista; a dashboard abre uma janela com essa lista. Reuniões: `_selo` ganha estados e um `motivo`.

**Tech Stack:** FastAPI + SQLAlchemy (backend), pytest com SQLite em memória, React + TypeScript (frontend).

**Spec:** `docs/superpowers/specs/2026-10-20-login-parados-estados-reuniao-design.md`

---

## Como rodar

```bash
cd backend
MSYS_NO_PATHCONV=1 docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local python -m pytest tests/unit/<arquivo>.py -q -p no:cacheprovider --color=no
cd frontend && npx tsc --noEmit -p tsconfig.json
```

Editar com o editor (Edit/Write), não com scripts no terminal — o terminal do Windows corrompe acentos.

---

### Task 1: Mensagem do login

**Files:** Modify `frontend/src/pages/Login.tsx` (~l.30), `frontend/src/services/api.ts` (~l.53)

- [ ] **Step 1:** Em `Login.tsx`, trocar o `catch` do `handleSubmit`:

```tsx
        } catch (error: any) {
            // A mensagem do servidor ("Email ou senha incorretos"), não a do
            // axios ("Request failed with status code 401").
            const detalhe = error?.response?.data?.detail;
            setError(
                typeof detalhe === "string"
                    ? detalhe
                    : error?.response
                        ? "Email ou senha incorretos."
                        : "Não foi possível conectar ao servidor."
            );
        } finally {
```

- [ ] **Step 2:** Em `api.ts`, no interceptor de resposta, trocar a condição `if (error.response?.status === 401 && !originalRequest._retry) {` por:

```ts
    // 401 no próprio login (ou no refresh) é credencial errada, não sessão
    // vencida: tentar renovar ali jogava a pessoa de volta para /login.
    const urlDaRequisicao = originalRequest?.url || "";
    const eRotaDeAutenticacao =
      urlDaRequisicao.includes("/auth/login") || urlDaRequisicao.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !eRotaDeAutenticacao) {
```

- [ ] **Step 3:** `npx tsc --noEmit -p tsconfig.json` — sem saída.

- [ ] **Step 4: Commit** (perguntar antes)

```bash
git add frontend/src/pages/Login.tsx frontend/src/services/api.ts
git commit -m "fix(login): mensagem do servidor e sem tentativa de renovar sessao no 401 do login"
```

---

### Task 2: Regra única de "parado" e a rota da lista

**Files:**
- Modify: `backend/app/services/report_service.py` (blocos `cards_parados` e `negocios_parados_7d` em `get_dashboard_kpis`; método novo)
- Modify: `backend/app/api/v1/endpoints/reports.py` (rota nova)
- Test: `backend/tests/unit/test_dashboard_parados.py`

- [ ] **Step 1: Teste que falha** — `backend/tests/unit/test_dashboard_parados.py`:

```python
"""
Os parados da dashboard: o número e a lista usam a mesma regra do filtro
"Parado 3d+" do board.

Em 16/10/2026 a dashboard da Claudia mostrava 1 parado e foi preciso
consultar o banco para achar o card (10945, em Aquisição, não em
Prospecção). E o número não tirava os cards com atividade agendada, que o
board tira desde a v1.10.5.
"""
from datetime import datetime, timedelta

from app.models.card import Card
from app.models.card_task import CardTask

URL = "/api/v1/reports/dashboard/parados"


def _card(db, lista, titulo, sdr=None, vendedor=None):
    c = Card(title=titulo, list_id=lista.id, position=0,
             sdr_id=sdr.id if sdr else None, assigned_to_id=vendedor.id if vendedor else None)
    db.add(c)
    db.commit()
    return c


def _tarefa(db, card, dias_atras, concluida=True, vence_em_dias=None):
    quando = datetime.utcnow() - timedelta(days=dias_atras)
    t = CardTask(card_id=card.id, title="Ligar", task_type="call",
                 created_at=quando, is_completed=concluida,
                 completed_at=quando if concluida else None,
                 due_date=(datetime.utcnow() + timedelta(days=vence_em_dias))
                 if vence_em_dias is not None else quando)
    db.add(t)
    db.commit()


def test_lista_o_card_parado(client, db, salesperson_headers, test_lists, test_salesperson_user):
    card = _card(db, test_lists[0], "IMEDIATO NEXWAY", vendedor=test_salesperson_user)
    _tarefa(db, card, dias_atras=20)

    r = client.get(URL, params={"janela": 3}, headers=salesperson_headers)

    assert r.status_code == 200
    [item] = r.json()["cards"]
    assert item["card_id"] == card.id
    assert item["titulo"] == "IMEDIATO NEXWAY"
    assert item["lista"] == test_lists[0].name
    assert item["dias_parado"] >= 19


def test_card_com_atividade_agendada_nao_e_parado(client, db, salesperson_headers, test_lists, test_salesperson_user):
    """Mesma regra do board: tem próximo passo marcado, não está parado."""
    card = _card(db, test_lists[0], "Com retorno marcado", vendedor=test_salesperson_user)
    _tarefa(db, card, dias_atras=20)
    _tarefa(db, card, dias_atras=20, concluida=False, vence_em_dias=2)

    assert client.get(URL, params={"janela": 3}, headers=salesperson_headers).json()["cards"] == []


def test_card_movimentado_recentemente_nao_e_parado(client, db, salesperson_headers, test_lists, test_salesperson_user):
    card = _card(db, test_lists[0], "Ativo", vendedor=test_salesperson_user)
    _tarefa(db, card, dias_atras=0)

    assert client.get(URL, params={"janela": 3}, headers=salesperson_headers).json()["cards"] == []


def test_card_sem_nenhuma_atividade_nao_entra(client, db, salesperson_headers, test_lists, test_salesperson_user):
    """Lead novo sem contato fica em 'Leads sem Contato', não em parados."""
    _card(db, test_lists[0], "Nunca tocado", vendedor=test_salesperson_user)

    assert client.get(URL, params={"janela": 3}, headers=salesperson_headers).json()["cards"] == []


def test_numero_da_dashboard_bate_com_a_lista(client, db, salesperson_headers, test_lists, test_salesperson_user):
    parado = _card(db, test_lists[0], "Parado", vendedor=test_salesperson_user)
    _tarefa(db, parado, dias_atras=20)
    agendado = _card(db, test_lists[0], "Agendado", vendedor=test_salesperson_user)
    _tarefa(db, agendado, dias_atras=20)
    _tarefa(db, agendado, dias_atras=20, concluida=False, vence_em_dias=1)

    kpis = client.get("/api/v1/reports/dashboard?period=year", headers=salesperson_headers).json()
    lista = client.get(URL, params={"janela": 3}, headers=salesperson_headers).json()["cards"]

    assert kpis["cards_parados"] == len(lista) == 1


def test_janela_de_7_dias(client, db, salesperson_headers, test_lists, test_salesperson_user):
    card = _card(db, test_lists[0], "Parado há 5 dias", vendedor=test_salesperson_user)
    _tarefa(db, card, dias_atras=5)

    tres = client.get(URL, params={"janela": 3}, headers=salesperson_headers).json()["cards"]
    sete = client.get(URL, params={"janela": 7}, headers=salesperson_headers).json()["cards"]

    assert [c["card_id"] for c in tres] == [card.id]
    assert sete == []


def test_vendedor_so_ve_os_proprios(client, db, salesperson_headers, test_lists, test_salesperson_user, test_manager_user):
    de_outro = _card(db, test_lists[0], "De outra pessoa", vendedor=test_manager_user)
    _tarefa(db, de_outro, dias_atras=20)

    assert client.get(URL, params={"janela": 3}, headers=salesperson_headers).json()["cards"] == []


def test_gerente_filtra_pela_sdr(client, db, manager_headers, test_lists, test_sdr_user):
    card = _card(db, test_lists[0], "Da SDR", sdr=test_sdr_user)
    _tarefa(db, card, dias_atras=20)

    r = client.get(URL, params={"janela": 3, "user_id": test_sdr_user.id, "view": "sdr"},
                   headers=manager_headers)

    assert [c["card_id"] for c in r.json()["cards"]] == [card.id]


def test_janela_invalida(client, salesperson_headers):
    assert client.get(URL, params={"janela": 5}, headers=salesperson_headers).status_code == 422
```

- [ ] **Step 2:** Rodar — Expected: 404 na rota nova; `test_numero_da_dashboard_bate_com_a_lista` com 2 em vez de 1.

- [ ] **Step 3: Regra única** — em `report_service.py`, acrescentar dentro de `ReportService` (depois de `_build_dashboard_user_filter`):

```python
    def _parados(self, uf: list, dias_uteis: int):
        """
        Cards parados há mais de `dias_uteis` dias úteis — a mesma regra do
        filtro "Parado 3d+/7d+" do board (card_service):

        - card aberto que já teve tarefa ou anotação;
        - sem tarefa criada/concluída, anotação ou mudança de etapa na janela;
        - sem tarefa não concluída vencendo de hoje em diante (dia em UTC):
          com próximo passo marcado não está parado (board desde a v1.10.5).

        Returns:
            Query de Card (ainda sem .count()/.all()).
        """
        from datetime import timezone

        limite = business_days_ago(dias_uteis)
        hoje_utc = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0, tzinfo=None
        )
        com_tarefa = self.db.query(CardTask.card_id).distinct()
        com_nota = self.db.query(CardNote.card_id).distinct()
        tarefa_recente = self.db.query(CardTask.card_id).filter(
            or_(CardTask.created_at > limite, CardTask.completed_at > limite)
        )
        nota_recente = self.db.query(CardNote.card_id).filter(CardNote.created_at > limite)
        etapa_recente = self.db.query(CardListHistory.card_id).filter(
            CardListHistory.entered_at > limite
        )
        agendado = self.db.query(CardTask.card_id).filter(
            CardTask.is_completed == False,  # noqa: E712
            CardTask.due_date >= hoje_utc,
        )
        return (
            self.db.query(Card)
            .join(BoardList, Card.list_id == BoardList.id)
            .filter(
                Card.is_won == 0,
                or_(Card.id.in_(com_tarefa), Card.id.in_(com_nota)),
                ~Card.id.in_(tarefa_recente),
                ~Card.id.in_(nota_recente),
                ~Card.id.in_(etapa_recente),
                ~Card.id.in_(agendado),
                *uf,
            )
        )

    def listar_parados(
        self,
        current_user: User,
        dias_uteis: int,
        user_id: Optional[int] = None,
        view: Optional[str] = None,
        limite: int = 200,
    ) -> list:
        """A lista por trás dos números de parados da dashboard."""
        uf = self._filtro_da_dashboard(current_user, user_id, view)
        cards = self._parados(uf, dias_uteis).all()
        if not cards:
            return []

        ids = [c.id for c in cards]
        ultimas = {}
        for consulta in (
            self.db.query(CardTask.card_id, func.max(CardTask.created_at)).filter(CardTask.card_id.in_(ids)).group_by(CardTask.card_id),
            self.db.query(CardTask.card_id, func.max(CardTask.completed_at)).filter(CardTask.card_id.in_(ids)).group_by(CardTask.card_id),
            self.db.query(CardNote.card_id, func.max(CardNote.created_at)).filter(CardNote.card_id.in_(ids)).group_by(CardNote.card_id),
            self.db.query(CardListHistory.card_id, func.max(CardListHistory.entered_at)).filter(CardListHistory.card_id.in_(ids)).group_by(CardListHistory.card_id),
        ):
            for card_id, quando in consulta:
                if quando and (card_id not in ultimas or quando > ultimas[card_id]):
                    ultimas[card_id] = quando

        listas = {l.id: l for l in self.db.query(BoardList).filter(BoardList.id.in_({c.list_id for c in cards}))}
        boards = {b.id: b.name for b in self.db.query(Board).filter(Board.id.in_({l.board_id for l in listas.values()}))}
        pessoas = {
            u.id: u.name for u in self.db.query(User).filter(
                User.id.in_({c.assigned_to_id for c in cards if c.assigned_to_id}
                            | {c.sdr_id for c in cards if c.sdr_id})
            )
        }

        agora = datetime.utcnow()
        itens = []
        for c in cards:
            lista = listas.get(c.list_id)
            ultima = ultimas.get(c.id)
            itens.append({
                "card_id": c.id,
                "titulo": c.title,
                "board": boards.get(lista.board_id) if lista else None,
                "lista": lista.name if lista else None,
                "vendedor": pessoas.get(c.assigned_to_id),
                "sdr": pessoas.get(c.sdr_id),
                "ultima_movimentacao": ultima.isoformat() if ultima else None,
                "dias_parado": (agora - ultima).days if ultima else None,
            })
        itens.sort(key=lambda i: i["dias_parado"] if i["dias_parado"] is not None else -1, reverse=True)
        return itens[:limite]
```

- [ ] **Step 4: Filtro da dashboard num lugar só** — em `get_dashboard_kpis`, o trecho que monta `uf` (de `uf = self._build_dashboard_user_filter(current_user, user_id, view)` até o fim do `if not user_id and role_name in ("admin", "manager"): ...`) vira um método, e `get_dashboard_kpis` passa a chamá-lo:

```python
    def _filtro_da_dashboard(self, current_user, user_id, view) -> list:
        """Filtro de pessoa e de visão da dashboard (RN-037)."""
        uf = self._build_dashboard_user_filter(current_user, user_id, view)
        role_name = current_user.role.name if current_user and current_user.role else ""
        if not user_id and role_name in ("admin", "manager"):
            if view == "sdr":
                uf = uf + [Card.sdr_id.isnot(None)]
            elif view == "vendedor":
                uf = uf + [Card.assigned_to_id.isnot(None)]
        return uf
```

Em `get_dashboard_kpis`: `uf = self._filtro_da_dashboard(current_user, user_id, view)` no lugar do trecho, e manter a variável `role_name` se ela for usada mais abaixo (conferir com `grep -n "role_name" app/services/report_service.py`).

- [ ] **Step 5: Os números usam a regra** — em `get_dashboard_kpis`, trocar o bloco inteiro que calcula `cards_parados` (de `# Cards parados há mais de 3 dias ÚTEIS` até o `.scalar() or 0` dele) por:

```python
        # Mesma regra do filtro "Parado 3d+" do board — ver _parados.
        cards_parados = self._parados(uf, 3).with_entities(func.count(func.distinct(Card.id))).scalar() or 0
```

e o bloco de `negocios_parados_7d` (de `# Negócios parados há mais de 7 dias ÚTEIS` até o `.scalar() or 0`) por:

```python
        negocios_parados_7d = self._parados(uf, 7).with_entities(func.count(func.distinct(Card.id))).scalar() or 0
```

Conferir depois que `board_ids` ainda é usado em outros blocos (`grep -n "board_ids" ...`); a regra nova não filtra por board — o filtro antigo usava todos os boards, então o resultado é o mesmo.

- [ ] **Step 6: Rota** — em `backend/app/api/v1/endpoints/reports.py`, logo depois de `get_dashboard_kpis`:

```python
@router.get(
    "/dashboard/parados",
    summary="Cards parados por trás dos números da dashboard",
    description="""
    A lista dos cards contados em "Parados +3 dias" (janela=3) e "Negócios
    Parados (7d)" (janela=7), com a mesma regra do filtro do board e os mesmos
    filtros de pessoa e visão da dashboard. Do parado há mais tempo para o mais
    recente, até 200 cards.
    """,
)
async def get_dashboard_parados(
    janela: int = Query(3, description="Dias úteis sem movimentação: 3 ou 7"),
    user_id: Optional[int] = Query(None, description="[Admin/Gerente] Filtrar por usuário"),
    view: Optional[str] = Query(None, description="Visão ativa: sdr ou vendedor"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    if janela not in (3, 7):
        raise HTTPException(status_code=422, detail="A janela é de 3 ou 7 dias úteis.")
    cards = ReportService(db).listar_parados(current_user, janela, user_id=user_id, view=view)
    return {"janela": janela, "cards": cards}
```

(conferir que `HTTPException` está importado no topo de `reports.py`; se não, `from fastapi import HTTPException`.)

- [ ] **Step 7:** Rodar `test_dashboard_parados.py` e `test_dashboard_vinculo.py` — Expected: tudo passa.

- [ ] **Step 8: Commit** (perguntar antes)

```bash
git add backend/app/services/report_service.py backend/app/api/v1/endpoints/reports.py backend/tests/unit/test_dashboard_parados.py
git commit -m "feat(dashboard): regra unica de parados (igual ao board) e rota com a lista"
```

---

### Task 3: Janela de parados na dashboard

**Files:**
- Create: `frontend/src/components/dashboard/ParadosModal.tsx`
- Modify: `frontend/src/services/reportService.ts`, `frontend/src/components/dashboard/DashboardSDR.tsx` (~l.399), `frontend/src/components/dashboard/DashboardVendedor.tsx` (~l.489)

- [ ] **Step 1: Serviço** — em `reportService.ts`, junto dos outros métodos da classe:

```ts
  /** Lista por trás de "Parados +3 dias" (janela 3) e "Negócios Parados (7d)" (janela 7). */
  async getParados(
    janela: 3 | 7,
    user_id?: number | null,
    view?: "sdr" | "vendedor",
  ): Promise<{ janela: number; cards: CardParado[] }> {
    const params: Record<string, any> = { janela };
    if (user_id) params.user_id = user_id;
    if (view) params.view = view;
    const response = await api.get("/api/v1/reports/dashboard/parados", { params });
    return response.data;
  }
```

e, no topo do arquivo (fora da classe):

```ts
export interface CardParado {
  card_id: number;
  titulo: string;
  board: string | null;
  lista: string | null;
  vendedor: string | null;
  sdr: string | null;
  ultima_movimentacao: string | null;
  dias_parado: number | null;
}
```

- [ ] **Step 2: Janela** — `frontend/src/components/dashboard/ParadosModal.tsx`:

```tsx
/**
 * A lista por trás dos números de parados da dashboard.
 *
 * Em 16/10/2026 foi preciso consultar o banco para achar o card parado da
 * Claudia — ele estava em Aquisição, e ela procurava em Prospecção. Aqui
 * cada card aparece com o board e a lista.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import BaseModal from "../common/BaseModal";
import reportService, { CardParado } from "../../services/reportService";
import { useDashboard } from "../../context/DashboardContext";

interface Props {
  janela: 3 | 7;
  aberto: boolean;
  onFechar: () => void;
}

const ParadosModal: React.FC<Props> = ({ janela, aberto, onFechar }) => {
  const { selectedUserId, view } = useDashboard();
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardParado[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setCards(null);
    setErro(false);
    reportService
      .getParados(janela, selectedUserId, view === "sdr" || view === "vendedor" ? view : undefined)
      .then((r) => setCards(r.cards))
      .catch(() => setErro(true));
  }, [aberto, janela, selectedUserId, view]);

  return (
    <BaseModal
      isOpen={aberto}
      onClose={onFechar}
      title={janela === 3 ? "Parados há mais de 3 dias úteis" : "Parados há mais de 7 dias úteis"}
      size="xl"
    >
      {erro ? (
        <p className="text-sm text-red-500">Não foi possível carregar a lista.</p>
      ) : cards === null ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : cards.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Nenhum card parado.</p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-3">Card</th>
                <th className="py-2 pr-3">Board / lista</th>
                <th className="py-2 pr-3">Vendedor</th>
                <th className="py-2 pr-3">SDR</th>
                <th className="py-2 text-right">Parado há</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {cards.map((c) => (
                <tr
                  key={c.card_id}
                  onClick={() => { onFechar(); navigate(`/cards/${c.card_id}`); }}
                  className="cursor-pointer text-slate-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <td className="py-2 pr-3 font-medium">{c.titulo}</td>
                  <td className="py-2 pr-3 text-xs text-slate-500 dark:text-slate-400">{c.board} · {c.lista}</td>
                  <td className="py-2 pr-3">{c.vendedor || "—"}</td>
                  <td className="py-2 pr-3">{c.sdr || "—"}</td>
                  <td className="py-2 text-right tabular-nums">{c.dias_parado !== null ? `${c.dias_parado} dias` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BaseModal>
  );
};

export default ParadosModal;
```

(conferir o caminho/forma de import do `BaseModal`: `grep -rn "import BaseModal" frontend/src/components | head -2`; e que `ViewType` aceita "sdr"/"vendedor".)

- [ ] **Step 3: SDR** — em `DashboardSDR.tsx`: `import ParadosModal from "./ParadosModal";` e `const [verParados, setVerParados] = useState(false);` no componente (importar `useState` se faltar). Trocar a `<div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">` do "Parados +3 dias" por um botão com o mesmo conteúdo:

```tsx
          <button
            type="button"
            onClick={() => setVerParados(true)}
            title="Ver os cards parados"
            className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-left transition-colors hover:bg-yellow-500/10"
          >
            {/* conteúdo atual: título "Parados +3 dias", número, "Sem movimentação de etapa" */}
          </button>
          <ParadosModal janela={3} aberto={verParados} onFechar={() => setVerParados(false)} />
```

- [ ] **Step 4: Vendedor** — em `DashboardVendedor.tsx`, o mesmo para "Negócios Parados (7d)" com `janela={7}` (classes `border-orange-500/20 bg-orange-500/5 ... hover:bg-orange-500/10`).

- [ ] **Step 5:** `npx tsc --noEmit -p tsconfig.json` — sem saída.

- [ ] **Step 6: Commit** (perguntar antes)

```bash
git add frontend/src/components/dashboard/ParadosModal.tsx frontend/src/services/reportService.ts frontend/src/components/dashboard/DashboardSDR.tsx frontend/src/components/dashboard/DashboardVendedor.tsx
git commit -m "feat(dashboard): numero de parados abre a lista dos cards com board e lista"
```

---

### Task 4: Estados da página de Reuniões

**Files:** Modify `backend/app/api/v1/endpoints/reunioes.py` (`_selo` ~l.65, item ~l.327), `frontend/src/pages/ReunioesPage.tsx` (`estiloDoSelo` ~l.26, célula ~l.405), `frontend/src/services/reunioesService.ts` (tipo do item); Test `backend/tests/unit/test_estado_das_reunioes.py`

- [ ] **Step 1: Teste que falha** — `backend/tests/unit/test_estado_das_reunioes.py`:

```python
"""
O estado de cada reunião na página de Reuniões.

Até 20/10/2026, "gravada" valia para vídeo OU transcrição. Como a transcrição
começa sozinha quando alguém entra na sala, reunião sem vídeo nenhum aparecia
como gravada: a U&m Mineração (cliente nunca entrou, transcrição vazia) e a
Monsanto (3 minutos, 12 palavras).
"""
from datetime import datetime, timedelta

from app.api.v1.endpoints.reunioes import _selo
from app.models.card_task import CardTask
from tests.unit.conversas import APRESENTACAO, MONOLOGO

INICIO = datetime(2026, 10, 9, 17, 55)


def _reuniao(**kw):
    base = dict(task_type="meeting", meeting_provider="daily", is_noshow=False,
                meeting_started_at=INICIO, meeting_ended_at=INICIO + timedelta(minutes=30),
                contact_joined_at=INICIO + timedelta(minutes=1),
                recording_status=None, transcript_raw=None, meeting_kind="apresentacao_phoebus")
    base.update(kw)
    return CardTask(**base)


def test_no_show():
    assert _selo(_reuniao(is_noshow=True), None)[0] == "no-show"


def test_avaliada():
    assert _selo(_reuniao(transcript_raw=APRESENTACAO), object())[0] == "avaliada"


def test_cliente_nao_entrou():
    selo, motivo = _selo(_reuniao(contact_joined_at=None, transcript_raw="WEBVTT\n\n"), None)

    assert selo == "cliente não entrou"
    assert "no-show" in motivo


def test_conversa_curta_com_o_motivo():
    selo, motivo = _selo(_reuniao(transcript_raw=MONOLOGO), None)

    assert selo == "conversa curta"
    assert "uma pessoa" in motivo


def test_gravada_so_com_video():
    assert _selo(_reuniao(recording_status="ready"), None)[0] == "gravada"


def test_transcrita_sem_video_e_fora_da_regua():
    """Conversa de verdade, mas tipo que a régua não avalia."""
    selo, _ = _selo(_reuniao(transcript_raw=APRESENTACAO, meeting_kind="duvidas"), None)

    assert selo == "transcrita"


def test_sem_gravacao():
    assert _selo(_reuniao(contact_joined_at=None, meeting_ended_at=None), None)[0] == "sem gravação"


def test_reuniao_do_teams_nao_vira_cliente_nao_entrou():
    """No Teams o CRM não sabe quem entrou."""
    selo, _ = _selo(_reuniao(meeting_provider=None, contact_joined_at=None), None)

    assert selo == "sem gravação"
```

- [ ] **Step 2:** Rodar — Expected: falha (`_selo` devolve string, não tupla).

- [ ] **Step 3: `_selo`** — substituir a função por:

```python
def _selo(task: CardTask, avaliacao: Optional[MeetingEvaluation]) -> tuple:
    """
    O estado da reunião na lista, e um motivo curto quando ajuda a entender.

    Até 20/10/2026 "gravada" valia para vídeo OU transcrição — e toda reunião
    do CRM aberta gera transcrição, mesmo vazia. Agora "gravada" é só vídeo.

    Returns:
        (estado, motivo ou None)
    """
    from app.services.avaliacao_reuniao.conversa import motivo_para_nao_avaliar

    if task.is_noshow:
        return "no-show", None
    if avaliacao:
        return "avaliada", None
    if (
        task.meeting_provider == "daily"
        and task.meeting_ended_at
        and not task.contact_joined_at
    ):
        return "cliente não entrou", "O cliente não entrou na sala. Marque como no-show no card."
    if task.transcript_raw:
        motivo = motivo_para_nao_avaliar(task.transcript_raw)
        if motivo:
            return "conversa curta", motivo
    if task.recording_status == "ready":
        return "gravada", None
    if task.transcript_raw:
        return "transcrita", None
    return "sem gravação", None
```

E no item da lista, trocar `"selo": _selo(t, t.evaluation),` por:

```python
            "selo": selo,
            "motivo": motivo,
```

com, logo no começo do laço `for t in pagina:` (antes de montar o dicionário):

```python
        selo, motivo = _selo(t, t.evaluation)
```

- [ ] **Step 4:** Rodar `test_estado_das_reunioes.py` e `test_endpoints_reunioes.py` — Expected: tudo passa.

- [ ] **Step 5: Tela** — em `ReunioesPage.tsx`, substituir `estiloDoSelo` por:

```tsx
const estiloDoSelo = (selo: string) => {
  if (selo === "avaliada")
    return "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-300";
  if (selo === "gravada")
    return "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300";
  if (selo === "transcrita")
    return "border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-300";
  if (selo === "no-show")
    return "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-300";
  if (selo === "cliente não entrou")
    return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300";
  return "border-gray-300 bg-gray-100 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400";
};
```

(conferir antes as classes atuais da função e manter as de `avaliada`/`gravada`/`no-show` se forem diferentes destas.) Na célula do selo (o `<span>` que usa `estiloDoSelo(r.selo)`), acrescentar `title={r.motivo || undefined}` e, quando houver motivo, `cursor-help` na classe. No tipo do item em `reunioesService.ts`, acrescentar `motivo?: string | null;`.

- [ ] **Step 6:** `npx tsc --noEmit -p tsconfig.json` — sem saída.

- [ ] **Step 7: Commit** (perguntar antes)

```bash
git add backend/app/api/v1/endpoints/reunioes.py backend/tests/unit/test_estado_das_reunioes.py frontend/src/pages/ReunioesPage.tsx frontend/src/services/reunioesService.ts
git commit -m "feat(reunioes): estados que dizem a verdade - gravada so com video, cliente nao entrou, conversa curta"
```

---

### Task 5: Fechamento

- [ ] **Step 1:** Suíte completa do backend — todos passando (813 + os novos).
- [ ] **Step 2:** `npm run build` no frontend — `✓ built`.
- [ ] **Step 3:** Versão **1.10.17** nos três lugares (`CHANGELOG.md`, `ChangelogModal.tsx`, rodapé `MainLayout.tsx`), com três itens: login mostra "Email ou senha incorretos" (fix); números de parados abrem a lista e passam a bater com o filtro do board, podendo diminuir um pouco (improvement); estados novos da página de Reuniões (improvement).
- [ ] **Step 4: Commit** (perguntar antes) — `chore: changelog v1.10.17`.
