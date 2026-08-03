# SDR — Resgatar negócio perdido na Aquisição — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development ou superpowers:executing-plans. Passos com checkbox (`- [ ]`).

**Goal:** As 2 features de Vendas que estavam pendentes:
- **Parte A (Tasks 1-5):** SDR resgata negócios perdidos no board de Aquisição (7), reabrindo em Prospecção → Lead Novo com o vendedor original mantido e o SDR resgatador vinculado.
- **Parte B (Tasks 6-8):** filtro **"Motivo de perda"** no kanban de Vendas (boards 6/7/8), que aparece só em "Apenas Perdidos".

**Architecture:** Reaproveita o reopen existente (`POST /cards/{id}/reopen` → `reopen_card` → clone em Lead Novo). Ajustes: (1) restaurar o vendedor no clone; (2) liberar visibilidade dos perdidos sem SDR do board 7 para o SDR; (3) mostrar o botão "Resgatar Negócio" (SDR).

**Spec:** `docs/superpowers/specs/2026-08-03-sdr-resgatar-negocio-aquisicao-design.md`

**Convenções:** testes backend via `docker exec -w /app hsgrowth-api-local python -m pytest ...` (Git Bash: `export MSYS_NO_PATHCONV=1` + PATH do Docker; `tests/` não é montado → `docker cp` antes). Typecheck front: `cd frontend && npx tsc --noEmit`. **Reiniciar o container após editar backend** (uvicorn --reload + SSE trava). Perguntar antes de commitar.

---

## Task 1: Backend — restaurar o vendedor no clone (reopen_card)

**Files:** `backend/app/services/card_service.py` (~L2666, dentro de `reopen_card`)

- [ ] **Step 1: Adicionar a restauração do vendedor**

Logo após o bloco `try` que vincula `client_id`/`person_id`/`contact_info` (o que termina em `self.db.refresh(new_card)` antes do bloco de campos customizados), inserir:

```python
        # Vendedor do clone = SEMPRE o do original. O create_card apaga o
        # assigned_to_id quando quem reabre é SDR (regra de criação por role);
        # aqui restauramos. O sdr_id já fica correto: SDR reabrindo -> o próprio
        # (resgatador); admin/gerente -> o do original (via clone_data).
        try:
            if original_card.assigned_to_id:
                new_card.assigned_to_id = original_card.assigned_to_id
                self.db.commit()
                self.db.refresh(new_card)
        except Exception as e:
            self.db.rollback()
            print(f"[REOPEN] Aviso: erro ao restaurar assigned_to_id: {e}")
```

- [ ] **Step 2: Teste**

Criar/atualizar `backend/tests/unit/test_reopen_sdr.py`:

```python
from types import SimpleNamespace
import pytest


def _role(name):
    return SimpleNamespace(name=name)


def test_reopen_sdr_mantem_vendedor_e_vincula_sdr(db):
    """SDR reabrindo um perdido: clone mantém o vendedor original e recebe o SDR resgatador."""
    from app.services.card_service import CardService
    from app.models.user import User
    from app.models.role import Role
    from app.models.board import Board
    from app.models.list import List as ListModel
    from app.models.card import Card

    # roles
    r_sdr = db.query(Role).filter(Role.name == "sdr").first()
    r_sales = db.query(Role).filter(Role.name == "salesperson").first()
    assert r_sdr and r_sales, "roles sdr/salesperson devem existir no banco de teste"
    vendedor = db.query(User).filter(User.role_id == r_sales.id).first()
    sdr = db.query(User).filter(User.role_id == r_sdr.id).first()
    assert vendedor and sdr

    # board 6 Prospecção precisa ter a lista Lead Novo id=22 (ambiente real de teste)
    lead_novo = db.query(ListModel).get(22)
    assert lead_novo, "Lead Novo (id=22) precisa existir"

    # cria um card perdido no board de Aquisição (7) com vendedor + sdr
    aqui = db.query(ListModel).filter(ListModel.board_id == 7).first()
    card = Card(title="X", list_id=aqui.id, assigned_to_id=vendedor.id, sdr_id=sdr.id, is_won=-1)
    db.add(card); db.commit()

    svc = CardService(db)
    reopen_data = SimpleNamespace(title="X (resgatado)", acquisition_channel_detail="Base")
    clone = svc.reopen_card(card.id, reopen_data, sdr)

    assert clone.list_id == 22                      # foi para Lead Novo
    assert clone.assigned_to_id == vendedor.id      # vendedor mantido
    assert clone.sdr_id == sdr.id                   # SDR resgatador
    assert card.is_lost                             # original segue perdido
```

- [ ] **Step 3: Rodar**

```bash
docker cp "c:/Users/HS/Documents/GitHub/hsgrowth-sistema/backend/tests/unit/test_reopen_sdr.py" hsgrowth-api-local:/app/tests/unit/test_reopen_sdr.py
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_reopen_sdr.py -v
```
Esperado: PASS. (Se o ambiente de teste não tiver Lead Novo id=22 / roles, ajustar o setup para criá-los.)

- [ ] **Step 4: Commit** (perguntar antes)

---

## Task 2: Backend — visibilidade do SDR no board 7 (perdidos sem SDR)

**Files:** `backend/app/repositories/card_repository.py` (`list_by_board` ~L50 e a variante de contagem ~L139), `backend/app/services/card_service.py` (~L272-276)

- [ ] **Step 1: Repositório — novo parâmetro `sdr_include_orphan_lost`**

Em `card_repository.py`, na assinatura de `list_by_board` (e na variante de contagem, se separada), adicionar `sdr_include_orphan_lost: bool = False`. No bloco do filtro de `sdr_id`:

```python
        if sdr_id is not None:
            if sdr_include_orphan_lost:
                # SDR na Aquisição: vê os próprios cards + os PERDIDOS sem SDR
                query = query.filter(
                    (Card.sdr_id == sdr_id) | ((Card.sdr_id.is_(None)) & (Card.is_won == -1))
                )
            else:
                query = query.filter(Card.sdr_id == sdr_id)
```

(Aplicar a mesma alteração em qualquer método de contagem que replique o filtro de `sdr_id`.)

- [ ] **Step 2: Serviço — ligar o flag só p/ SDR no board 7**

Em `card_service.py`, onde hoje é:
```python
        if current_user and current_user.role:
            if current_user.role.name == "sdr":
                sdr_id = current_user.id
            elif current_user.role.name == "salesperson":
                assigned_to_id = current_user.id
```
passar a calcular o flag e repassá-lo às chamadas do repositório:
```python
        sdr_include_orphan_lost = False
        if current_user and current_user.role:
            if current_user.role.name == "sdr":
                sdr_id = current_user.id
                # Aquisição (board 7): SDR também enxerga os perdidos SEM SDR (p/ resgatar)
                sdr_include_orphan_lost = (board_id == 7)
            elif current_user.role.name == "salesperson":
                assigned_to_id = current_user.id
```
E incluir `sdr_include_orphan_lost=sdr_include_orphan_lost` em todas as chamadas de `list_by_board`/contagem dentro deste método.

- [ ] **Step 3: Teste de visibilidade**

Adicionar a `test_reopen_sdr.py`:
```python
def test_sdr_ve_perdidos_sem_sdr_na_aquisicao(db):
    from app.services.card_service import CardService
    from app.models.user import User
    from app.models.role import Role
    from app.models.list import List as ListModel
    from app.models.card import Card

    r_sdr = db.query(Role).filter(Role.name == "sdr").first()
    sdr = db.query(User).filter(User.role_id == r_sdr.id).first()
    outro_sdr = db.query(User).filter(User.role_id == r_sdr.id, User.id != sdr.id).first()
    aqui = db.query(ListModel).filter(ListModel.board_id == 7).first()

    # 3 cards perdidos: sem sdr, do sdr atual, de outro sdr
    c_orfao = Card(title="orfao", list_id=aqui.id, sdr_id=None, is_won=-1)
    c_meu   = Card(title="meu",   list_id=aqui.id, sdr_id=sdr.id, is_won=-1)
    db.add_all([c_orfao, c_meu])
    if outro_sdr:
        c_outro = Card(title="outro", list_id=aqui.id, sdr_id=outro_sdr.id, is_won=-1)
        db.add(c_outro)
    db.commit()

    svc = CardService(db)
    resp = svc.list_cards(board_id=7, current_user=sdr, is_lost=True, page_size=1000)
    ids = {c.id for c in resp.cards}
    assert c_orfao.id in ids   # vê o perdido sem SDR
    assert c_meu.id in ids     # vê o próprio
    if outro_sdr:
        assert c_outro.id not in ids  # NÃO vê o de outro SDR
```
(Ajustar a assinatura real de `list_cards` conforme o método — confirmar nome do param de retorno `.cards`.)

- [ ] **Step 4: Rodar + restart do container**

```bash
docker cp "c:/Users/HS/Documents/GitHub/hsgrowth-sistema/backend/tests/unit/test_reopen_sdr.py" hsgrowth-api-local:/app/tests/unit/test_reopen_sdr.py
docker exec -w /app hsgrowth-api-local python -m pytest tests/unit/test_reopen_sdr.py -v
docker restart hsgrowth-api-local
```

- [ ] **Step 5: Commit** (perguntar antes)

---

## Task 3: Frontend — botão "Resgatar Negócio" (SDR)

**Files:** `frontend/src/pages/CardDetails.tsx`

- [ ] **Step 1: Constante do board de Aquisição**

Verificar se já existe uma constante do board 7 (ex.: `BOARD_AQUISICAO_ID`). Se não, adicionar perto de `BOARD_PROSPECCAO_ID`:
```typescript
const BOARD_AQUISICAO_ID = 7;
```

- [ ] **Step 2: Flag `canRescue` + liberar o botão**

Perto de `isReadOnly` (~L601), adicionar:
```typescript
  // Exceção: SDR pode RESGATAR (reabrir) um perdido do board de Aquisição,
  // mesmo sendo read-only nesse board. Só essa ação é liberada.
  const canRescue =
    currentUser?.role === "sdr" &&
    !!card?.is_lost &&
    card?.board_id === BOARD_AQUISICAO_ID;
```

- [ ] **Step 3: Ajustar a condição e o rótulo do botão**

No botão de reabertura (~L1020-1027), trocar a guarda `{!isReadOnly && (` por `{(!isReadOnly || canRescue) && (` e o texto por condicional:
```tsx
                  {(!isReadOnly || canRescue) && (
                    <button
                      onClick={() => setShowReopenModal(true)}
                      className="flex items-center gap-2 rounded-lg py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-500 px-3 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-700 hover:to-blue-600"
                      title={canRescue ? "Resgatar este negócio perdido para a Prospecção" : "Cria um novo card a partir deste negócio perdido"}
                    >
                      <RefreshCw size={18} />
                      {canRescue ? "Resgatar Negócio" : "Reabrir Negócio"}
                    </button>
                  )}
```

- [ ] **Step 4: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```
Esperado: exit 0.

- [ ] **Step 5: Commit** (perguntar antes)

---

## Task 4: Documentação — RN novo na doc 07

**Files:** `Documentação/07 - REGRAS DE NEGÓCIO E VALIDAÇÕES.md`

- [ ] **Step 1: Adicionar o RN-036** (após RN-034 ou no bloco de movimentação/atribuição), com o texto:

```markdown
### RN-036: SDR — Resgatar negócio perdido na Aquisição

**Contexto:** o SDR trabalha na Prospecção (board 6); ao agendar reunião e vincular o vendedor, o card vai para a Aquisição (board 7), onde o SDR fica somente-leitura. Esta regra permite o SDR **resgatar** negócios **perdidos** da Aquisição de volta ao funil.

- **Quem:** usuários com role **SDR**.
- **Onde:** cards em **Negócio Perdido** do board **Aquisição (7)**.
- **Ação ("Resgatar Negócio"):** clona o card para **Prospecção → Lead Novo** (o original continua perdido), com:
  - **Vendedor** (`assigned_to_id`) = o vendedor **original**;
  - **SDR** (`sdr_id`) = o **SDR que resgatou**.
- **Visibilidade:** o SDR enxerga, na Aquisição, os perdidos **onde já é o SDR** e também os **perdidos SEM SDR** (`sdr_id IS NULL`) — estes últimos ficam disponíveis para qualquer SDR resgatar. Não vê perdidos de **outro** SDR nem cards ativos sem SDR.
- **Admin/Gerente:** mantêm o botão **"Reabrir Negócio"** (mesma clonagem), sem restrição de board.
- Relacionado: RN-033 (Movimentação de Cartão), RN-034 (Atribuição de Cartão).
```

- [ ] **Step 2: Commit** (perguntar antes)

---

## Task 5: Smoke manual + verificação final

- [ ] **Step 1:** Logar como **SDR**. No board Aquisição, filtrar "Apenas Perdidos". Abrir (a) um perdido próprio e (b) um perdido sem SDR → botão **"Resgatar Negócio"** aparece; abrir um perdido de **outro** SDR não deve nem ser visível.
- [ ] **Step 2:** Clicar "Resgatar Negócio" → preencher o modal → confirmar o clone em **Lead Novo** com **vendedor original** + **SDR = você**; original segue perdido.
- [ ] **Step 3:** Confirmar que o SDR **não** consegue editar o resto do card na Aquisição (só o resgate foi liberado).
- [ ] **Step 4:** Logar como **admin** → "Reabrir Negócio" continua igual (sem regressão).

---

---

# Parte B — Filtro "Motivo de perda" no kanban de Vendas (Feature 1)

**Goal:** novo filtro **"Motivo de perda"** que aparece **só quando** o filtro de status está em **"Apenas Perdidos"**, ao lado do status, com os motivos do board atual. Vale nos boards de **Prospecção (6)**, **Aquisição (7)** e **Expansão (8)**.

**Dependência-chave:** o kanban usa `CardMinimalResponse`, que **não tem** `loss_reason`. Task 6 adiciona; Task 7 filtra client-side.

## Task 6: Backend — `loss_reason` no `CardMinimalResponse`

**Files:** `backend/app/schemas/card.py` (classe `CardMinimalResponse` ~L501-549), `backend/app/services/card_service.py` (construção do minimal ~L494)

- [ ] **Step 1: Schema** — adicionar o campo à `CardMinimalResponse`:
```python
    loss_reason: Optional[str] = Field(None, max_length=200, description="Motivo da perda (quando card é perdido)")
```

- [ ] **Step 2: Construção** — em `card_service.py`, na montagem do `CardMinimalResponse(...)` (~L494), incluir:
```python
                        loss_reason=card.loss_reason,
```
(`loss_reason` já existe no model `Card` e é populado ao marcar Perdido.)

- [ ] **Step 3: Verificar + restart**
```bash
docker exec -w /app hsgrowth-api-local python -c "import app.schemas.card, app.services.card_service; print('IMPORT OK')"
docker restart hsgrowth-api-local
```

- [ ] **Step 4: Commit** (perguntar antes)

## Task 7: Frontend — filtro "Motivo de perda" no `KanbanBoard`

**Files:** `frontend/src/pages/KanbanBoard.tsx`; tipo em `frontend/src/types` (garantir `loss_reason?` em `Card`)

- [ ] **Step 1: Import das opções**
```typescript
import { LOSS_REASONS_BY_BOARD_ID } from "../constants/blueprintOptions";
```

- [ ] **Step 2: State** (perto de `statusFilter`, ~L92):
```typescript
  const [lossReasonFilter, setLossReasonFilter] = useState("");
```

- [ ] **Step 3: Persistência** — incluir `lossReasonFilter` no restore (~L131, ler `saved.lossReasonFilter ?? ""`) e no save (~L168/L190, adicionar ao objeto salvo).

- [ ] **Step 4: Reset ao sair de "Apenas Perdidos"** — quando `statusFilter !== "lost"`, zerar o motivo. Adicionar um efeito:
```typescript
  useEffect(() => {
    if (statusFilter !== "lost" && lossReasonFilter) setLossReasonFilter("");
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 5: UI do filtro** — na barra de filtros, **entre o SelectMenu de status e o de responsável**, renderizar só quando `statusFilter === "lost"` e o board tiver motivos:
```tsx
{statusFilter === "lost" && LOSS_REASONS_BY_BOARD_ID[Number(boardId)] && (
  <SelectMenu
    value={lossReasonFilter}
    onChange={setLossReasonFilter}
    options={[
      { value: "", label: "Todos os motivos" },
      ...LOSS_REASONS_BY_BOARD_ID[Number(boardId)].map((r) => ({ value: r, label: r })),
    ]}
    placeholder="Motivo de perda"
  />
)}
```
(ajustar props ao `SelectMenu` real usado no arquivo.)

- [ ] **Step 6: filterCards** — no bloco de filtragem client-side (análogo ao filtro de status), adicionar:
```typescript
    if (lossReasonFilter && card.loss_reason !== lossReasonFilter) return false;
```

- [ ] **Step 7: clearFilters + hasActiveFilters** — incluir `lossReasonFilter` no reset (`setLossReasonFilter("")`) e na checagem de filtros ativos.

- [ ] **Step 8: Typecheck**
```bash
cd frontend && npx tsc --noEmit
```
Esperado: exit 0.

- [ ] **Step 9: Commit** (perguntar antes)

## Task 8: Smoke — filtro de motivo
- [ ] No board de Aquisição (e Prospecção/Expansão), selecionar **"Apenas Perdidos"** → o filtro **"Motivo de perda"** aparece ao lado, com os motivos daquele board. Selecionar um motivo → só os cards com aquele motivo. Trocar o status para outra coisa → o filtro some e zera.

---

## Notas de risco / verificação
- **Assinatura real de `list_cards`/`list_by_board`:** confirmar nomes dos parâmetros e de todas as chamadas internas ao repositório antes de colar (há variante de contagem que também precisa do flag).
- **Lista Lead Novo id=22 / board 7:** os testes assumem o ambiente real (DB de prod). Se algum id divergir, ajustar.
- **`filterCards`/persistência do KanbanBoard:** confirmar os pontos exatos (restore/save/clear/hasActiveFilters) — o arquivo é grande; seguir o padrão do `statusFilter`.
- **Restart do container** após cada edição de backend (SSE + --reload).
- **Nada de migration.**
