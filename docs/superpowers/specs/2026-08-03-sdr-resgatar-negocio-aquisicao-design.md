# SDR — Resgatar negócio perdido na Aquisição — Design

> **Data:** 2026-08-03
> **Escopo:** permitir que o **SDR** resgate negócios **perdidos** no board de **Aquisição** (board 7), reabrindo-os na **Prospecção → Lead Novo** com o **vendedor original** mantido e o **SDR que resgatou** vinculado. Continuação da "Feature 2" analisada em 23/07/2026 (memória `projeto-plano-filtro-perda-reopen-sdr`).

---

## 1. Contexto e cenário

Fluxo normal: o SDR trabalha na **Prospecção** (board 6), agenda a reunião, vincula o vendedor, e o card passa para a **Aquisição** (board 7). Na Aquisição o SDR fica **somente-leitura** (vê, mas não edita). Surgiu a necessidade de o SDR **resgatar** negócios que os vendedores marcaram como **Perdido** na Aquisição, trazendo-os de volta para o funil de Prospecção.

Hoje já existe o **"Reabrir Negócio"** (admin/gerente): clona o card perdido para **Lead Novo** (Prospecção). O original continua perdido. O SDR **não** vê esse botão (é read-only na Aquisição), e se um SDR reabrisse, o **vendedor seria apagado** (regra de criação por role).

---

## 2. Comportamento desejado

**Botão "Resgatar Negócio"** — aparece **só para o SDR**, em cards **perdidos** do board **Aquisição** (7). Ao clicar, abre o mesmo modal do reabrir (título + detalhamento do canal) e cria o clone em **Lead Novo** com:
- **Vendedor** (`assigned_to_id`) = o **vendedor original** do card.
- **SDR** (`sdr_id`) = o **SDR que resgatou** (usuário atual).
- Destino: **Prospecção → Lead Novo** (`list_id=22`, board 6). Original continua perdido.

**Quem pode resgatar (visibilidade):**
- **Caso A — card COM SDR vinculado:** só o **próprio SDR** (já é natural: o SDR só enxerga cards onde `sdr_id` = ele). Botão aparece só para ele.
- **Caso B — card SEM SDR vinculado (`sdr_id IS NULL`):** **qualquer SDR** pode ver e resgatar. Como hoje esses cards são **invisíveis** ao SDR, é preciso **liberar a visibilidade** dos **perdidos sem SDR do board Aquisição** para os SDRs. O SDR que resgatar vira o `sdr_id`.

**Admin/gerente:** continuam com o "Reabrir Negócio" atual, sem mudança.

---

## 3. Regras que interferem (mapeadas)

1. **Botão escondido pro SDR** — `frontend/src/pages/CardDetails.tsx`: `isSdrReadOnly = role==="sdr" && board_id !== Prospecção` (~L597-601); o botão reabrir está sob `!isReadOnly` (~L1020-1027). → Abrir **exceção**: mostrar o botão (rótulo "Resgatar Negócio") para SDR em card **perdido** do board **7**. O resto do card segue read-only.

2. **Vendedor é apagado quando SDR cria/reabre** — `backend/app/services/card_service.py`: `create_card` sobrescreve por role (~L786-790): SDR → `assigned_to_id=None`, `sdr_id=current_user.id`. O `reopen_card` (~L2573) chama `create_card` (L2648) e depois restaura client/person via ORM (L2659-2672). → **Restaurar `assigned_to_id = original.assigned_to_id`** no mesmo bloco ORM. O `sdr_id` já fica correto: SDR reabrindo → `current_user.id` (o resgatador); admin/gerente → `original.sdr_id` (via `clone_data`).

3. **Visibilidade do SDR** — `card_service.py` (~L272-276): para SDR, `sdr_id = current_user.id` (só vê os próprios). → Para o **Caso B**, no board **7**, a visibilidade do SDR passa a ser: `sdr_id == current_user.id` **OU** (`sdr_id IS NULL` **E** `is_lost`). Nos demais boards, continua só os próprios.

4. **Endpoint de reopen** — `POST /api/v1/cards/{id}/reopen` já é `require_not_viewer` (SDR **é permitido**). Sem mudança no gate; a diferença por role acontece dentro do `reopen_card`.

---

## 4. Backend

### 4.1. `reopen_card` (restaurar vendedor)
Após o bloco que restaura `client_id`/`person_id`/`contact_info` (card_service.py ~L2666), acrescentar: se `original_card.assigned_to_id`, setar `new_card.assigned_to_id = original_card.assigned_to_id` e commitar. Assim o vendedor do clone é **sempre** o do original (o `create_card` só o apaga quando quem reabre é SDR). O `sdr_id` do clone permanece como o `create_card` definiu (SDR → resgatador; demais → original).

### 4.2. Visibilidade do SDR na Aquisição (Caso B)
Na montagem da query de `list_cards` (e no que alimenta o kanban), quando `current_user` é SDR **e** o board é o 7 (Aquisição), a condição de visibilidade passa a ser `Card.sdr_id == current_user.id OR (Card.sdr_id IS NULL AND is_lost)`. Nos demais boards, mantém `Card.sdr_id == current_user.id`. Implementar via um parâmetro/condição direcionada no repositório (`card_repository.list_cards`), sem afetar salesperson/admin.

> **Segurança:** a exceção é estrita — só board 7, só `is_lost`, só `sdr_id IS NULL`. Não expõe cards de outros SDRs nem cards ativos.

---

## 5. Frontend

### 5.1. `CardDetails.tsx`
- Constante do board de Aquisição (usar a existente ou `7`).
- `canRescue = role==="sdr" && card.is_lost && card.board_id === BOARD_AQUISICAO_ID`.
- Mostrar o botão de reabrir/reabertura quando `!isReadOnly || canRescue`.
- Rótulo: **"Resgatar Negócio"** quando `canRescue` (SDR); **"Reabrir Negócio"** caso contrário.
- Abre o **mesmo** `ReopenModal` (título + `acquisition_channel_detail`) e chama o mesmo endpoint de reopen. Nenhuma outra edição do card é liberada para o SDR.

---

## 6. Documentação
- **Doc 07 — REGRAS DE NEGÓCIO E VALIDAÇÕES:** novo **RN** (ex.: **RN-036 — SDR: Resgatar negócio perdido na Aquisição**) descrevendo: quem pode (SDR), onde (perdidos do board 7), o que faz (clona p/ Lead Novo, vendedor original + SDR resgatador), e a exceção de visibilidade dos perdidos sem SDR. Referenciar RN-033 (Movimentação) e RN-034 (Atribuição).

---

## 7. Bordas / erros
- **Card não-perdido:** o endpoint já recusa (400). O botão só aparece em `is_lost`.
- **Card já resgatado:** cada resgate cria um novo clone; o original segue perdido (comportamento atual do reopen — sem trava de duplicidade, igual ao "Reabrir").
- **Card com SDR de outro:** invisível ao SDR (Caso A) → não aparece. Sem risco.
- **Sem vendedor no original:** `assigned_to_id` fica nulo no clone (nada a restaurar) — ok.

---

## 8. Testes
**Unit (pytest):**
- `reopen_card` chamado por um usuário **SDR** sobre um card perdido com vendedor X → clone tem `assigned_to_id == X` (vendedor mantido) e `sdr_id == SDR` (resgatador).
- `reopen_card` por **admin** → clone mantém `assigned_to_id`/`sdr_id` do original (sem regressão).
- Visibilidade: SDR listando board 7 vê os próprios + os perdidos sem SDR; **não** vê perdidos de outro SDR nem ativos sem SDR.

**Manual:** logar como SDR, abrir um perdido da Aquisição (próprio e um sem SDR), clicar "Resgatar Negócio", conferir o clone em Lead Novo com vendedor original + SDR resgatador; confirmar que o SDR **não** consegue editar o resto do card.

---

## 9. Escopo de arquivos
**Backend:** `app/services/card_service.py` (reopen_card + visibilidade SDR), possivelmente `app/repositories/card_repository.py` (condição de visibilidade board 7).
**Frontend:** `frontend/src/pages/CardDetails.tsx` (botão + rótulo + exceção).
**Docs:** `Documentação/07 - REGRAS DE NEGÓCIO E VALIDAÇÕES.md` (RN novo).

Sem migration. Sem mudança de modelo.
