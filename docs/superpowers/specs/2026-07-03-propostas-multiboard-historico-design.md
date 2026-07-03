# Propostas: Compartilhamento Multi-Board + Histórico de Versões — Design

**Data:** 2026-07-03
**Módulo:** Propostas Comerciais (exclusivo de Serviço) — evolução da Fase 1
**Contexto:** Hoje cada proposta pertence a **um único** card (`proposals.service_card_id`). O usuário precisa (a) reaproveitar a mesma proposta em vários cards/boards (ex.: criar na Cobrança e usar no Serviço) e (b) manter um **histórico de versões** da proposta, com possibilidade de ver/baixar o PDF de versões anteriores.

---

## 1. Objetivos

1. **Proposta compartilhada (N:N):** a mesma proposta pode estar vinculada a vários cards ao mesmo tempo. Editar/regerar reflete em todos.
2. **Sidebar "Card Vinculado":** listar **todos** os cards vinculados (chips clicáveis, cada um leva ao card no seu board).
3. **Marcador multi-card:** derivado do conjunto de cards vinculados pela regra **Perdido > Ativo > Ganho**.
4. **Histórico de versões:** a cada **edição salva**, o estado anterior é arquivado (dados + PDF). Ícone de histórico abre um modal listando versões (data + infos), com **Ver** e **Baixar** o PDF daquela versão.
5. **Lixeira no card = desvincular** só daquele card. **Excluir permanente** = botão novo na página `/propostas` (apaga a proposta e desvincula de todos).

---

## 2. Modelo de dados

### 2.1 Nova tabela `proposal_service_cards` (vínculo N:N)

| coluna | tipo | notas |
|---|---|---|
| `id` | Integer PK | |
| `proposal_id` | FK `proposals.id` ON DELETE CASCADE | index |
| `service_card_id` | FK `service_cards.id` ON DELETE CASCADE | index |
| `created_at` | timestamp | ordem de vínculo |

- **UNIQUE(`proposal_id`, `service_card_id`)** — não duplica o mesmo card.
- Migração de dados: copiar todo `proposals.service_card_id` não-nulo (e não-deletado) para a nova tabela.
- **Remover** a coluna `proposals.service_card_id` (fonte única de verdade passa a ser a tabela de vínculo). `service_card_id` permanece apenas como campo **transiente** de conveniência no schema `ProposalCreate` (ao criar a partir de um card, gera o vínculo).

### 2.2 Nova tabela `proposal_versions` (histórico)

| coluna | tipo | notas |
|---|---|---|
| `id` | Integer PK | |
| `proposal_id` | FK `proposals.id` ON DELETE CASCADE | index |
| `version_number` | Integer | sequencial por proposta (1,2,3…) |
| `snapshot` | JSON | estado da proposta + itens no momento do arquivamento |
| `pdf_path` | String | caminho relativo do PDF arquivado (pode ser nulo se a geração falhar) |
| `changed_by` | String | nome do usuário que salvou a edição |
| `created_at` | timestamp | "data da alteração" exibida no histórico |

- PDF arquivado em `UPLOAD_DIR/proposals/{proposal_id}/v{n}.pdf`.
- `snapshot` guarda os campos exibíveis (number, date, client_name, client_document, total, itens, marker no momento etc.) para o modal mostrar "as mesmas informações de hoje".

### 2.3 Relacionamentos no model `Proposal`

- `card_links = relationship("ProposalServiceCard", cascade="all, delete-orphan", lazy="selectin")`
- `versions = relationship("ProposalVersion", cascade="all, delete-orphan", lazy="selectin", order_by="ProposalVersion.version_number")`

---

## 3. Regras de negócio

### 3.1 Marcador (Perdido > Ativo > Ganho)

Para o conjunto de cards vinculados, cada card classifica-se pela sua `list`:
- `is_lost_stage` → **perdido**
- `is_done_stage` → **ganho**
- caso contrário → **ativo**

Resolução:
1. Se **algum** card vinculado é **perdido** → `nao_aprovada`.
2. Senão, se **algum** é **ativo** → `em_aberto`.
3. Senão (todos **ganho**, e há ≥1) → `aprovada`.
4. Sem cards vinculados → `em_aberto`.

Casos validados: 1 ativo→em aberto; 1 ganho→aprovada; 1 perdido→não aprovada; ganho+ativo→em aberto; 2 ganho→aprovada; ganho+perdido→não aprovada.

### 3.2 Histórico (a cada edição salva)

No `ProposalService.update`, **antes** de aplicar as mudanças:
1. Gera o PDF do estado **atual** (pré-edição) → salva em `UPLOAD_DIR/proposals/{id}/v{n}.pdf` (best-effort; erro só loga, não bloqueia).
2. Monta o `snapshot` (dados + itens atuais) e insere `ProposalVersion` com `version_number = nº de versões + 1`, `changed_by = user.name`.
3. Aplica o update normalmente e re-anexa o PDF novo aos cards vinculados.

> Criação (`create`) **não** gera versão (é a v1 corrente). Só edições subsequentes arquivam o estado anterior.

### 3.3 Vincular / desvincular

- **Vincular:** idempotente; se o par já existe, no-op. Ao vincular/desvincular, **re-anexa/atualiza** o PDF nos cards afetados.
- **Desvincular (lixeira no card):** remove só o vínculo daquele card + remove o PDF auto-anexado daquele card. A proposta continua existindo.
- **Excluir permanente (botão em `/propostas`):** soft-delete da proposta; remove todos os vínculos e os PDFs auto-anexados dos cards.

### 3.4 Regra de avanço do board

`service_board_service._has_linked_proposal(card_id)` passa a consultar `proposal_service_cards` (card tem ≥1 proposta vinculada não-deletada). Comportamento externo idêntico.

---

## 4. API (endpoints)

Base: `/api/v1/proposals` (mantém `dependencies=[require_service_access()]`).

Mantidos: `GET ""`, `POST ""`, `GET /prefill/{card}`, `GET /by-card/{card}`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` (agora = excluir permanente), `GET /{id}/pdf`.

**Novos:**
- `POST /{id}/cards` — body `{ "service_card_id": int }` → vincula (idempotente). Retorna `ProposalResponse`.
- `DELETE /{id}/cards/{service_card_id}` → desvincula. Retorna `ProposalResponse`.
- `GET /{id}/versions` → `List[ProposalVersionResponse]` (mais recente primeiro).
- `GET /{id}/versions/{version_id}/pdf?download=0|1` → `Response(application/pdf)` do PDF arquivado.

**Schema alterado — `ProposalResponse`:**
- Remove `board_id` e `service_card_id` como derivados únicos.
- Adiciona `linked_cards: List[LinkedCard]`, onde `LinkedCard = { card_id: int, board_id: int|None, status: "ganho"|"perdido"|"ativo", title: str|None }`.
- `marker` continua, agora derivado do conjunto.

**Novo schema — `ProposalVersionResponse`:** `{ id, version_number, changed_by, created_at, has_pdf, snapshot }`.

`ProposalUpdate`: remove `service_card_id` (vínculo agora só via endpoints dedicados).

---

## 5. Frontend

### 5.1 `services/proposalService.ts`
- `Proposal`: troca `service_card_id`/`board_id` por `linked_cards: LinkedCard[]`.
- Novos métodos: `linkCard(id, cardId)`, `unlinkCard(id, cardId)`, `listVersions(id)`, `getVersionPdf(id, versionId, download)`.
- Novos tipos: `LinkedCard`, `ProposalVersion`.

### 5.2 `pages/Proposals.tsx`
- Coluna **Card Vinculado**: mapeia `linked_cards` → chips `#id` clicáveis (navega `/servicos/{board_id}/cards/{card_id}`); "—" se vazio.
- Coluna **Ação**: adiciona **Histórico** (ícone `History`, abre `ProposalHistoryModal`) e **Excluir** (ícone `Trash2`, `useConfirm` → `proposalService.remove` permanente).

### 5.3 `components/service/ServiceProposalsSection.tsx`
- **Lixeira** → `unlinkCard(p.id, cardId)` (desvincular deste card), com confirm "Desvincular proposta deste card?".
- Adiciona ícone **Histórico** (abre `ProposalHistoryModal`).
- **Vincular existente:** lista propostas **não já vinculadas a ESTE card** (remove o filtro `!service_card_id`); `handleLink` → `linkCard(p.id, cardId)`.

### 5.4 `components/proposals/ProposalHistoryModal.tsx` (novo)
- Recebe `proposalId`; busca `listVersions`.
- Lista versões (mais recente no topo): **data da alteração**, `version_number`, `changed_by`, e infos-chave do `snapshot` (nº, data da proposta, cliente, total).
- Botões **Ver** e **Baixar** por versão (usa `getVersionPdf`). Se `has_pdf=false`, desabilita com aviso.

### 5.5 `utils/proposalPdf.ts`
- Generaliza para aceitar também o PDF de versão (`viewVersionPdf`/`downloadVersionPdf`).

---

## 6. Arquivos afetados (mapa)

**Backend — criar:**
- `models/proposal_service_card.py`, `models/proposal_version.py`
- migration Alembic (join table + versions + migração de dados + drop coluna)
- `schemas` novos (LinkedCard, ProposalVersionResponse)

**Backend — modificar:**
- `models/proposal.py` (relationships; remove coluna FK)
- `schemas/proposal.py` (ProposalResponse.linked_cards; ProposalUpdate sem service_card_id)
- `repositories/proposal_repository.py` (joins de card_links; link/unlink; list_by_card via join; versions)
- `services/proposal_service.py` (marker multi-card; link/unlink; versionamento no update; re-anexo PDF por card)
- `services/proposal_pdf_service.py` (attach por card individual; helper de PDF de versão; unlink remove PDF do card)
- `services/service_board_service.py` (`_has_linked_proposal` via join)
- `api/v1/endpoints/proposals.py` (novos endpoints)

**Frontend — criar:** `components/proposals/ProposalHistoryModal.tsx`
**Frontend — modificar:** `services/proposalService.ts`, `pages/Proposals.tsx`, `components/service/ServiceProposalsSection.tsx`, `utils/proposalPdf.ts`

**Docs:** `Documentação/16 - ...` (mencionar multi-board + histórico).

---

## 7. Fora de escopo / decisões

- **Sem bump de versão** (acumula p/ go-live v1.8.0).
- Sem "diff" visual entre versões — o histórico só lista e permite ver/baixar o PDF de cada versão.
- Sem limite de retenção de versões nesta fase (todas mantidas).
- Migração dos dados existentes: os vínculos atuais (`service_card_id`) viram linhas na join table; nenhuma proposta perde vínculo.
