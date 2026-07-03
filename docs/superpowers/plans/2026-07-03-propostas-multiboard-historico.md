# Propostas: Multi-Board (N:N) + Histórico de Versões — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Permitir que uma proposta seja compartilhada entre vários cards/boards (N:N) e manter histórico de versões (dados + PDF) a cada edição salva.

**Architecture:** Nova tabela de vínculo `proposal_service_cards` substitui a FK única `proposals.service_card_id`. Nova tabela `proposal_versions` guarda snapshots. Marcador derivado do conjunto de cards (Perdido > Ativo > Ganho). Frontend mostra chips de cards, modal de histórico, desvincular vs excluir.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic + Pydantic v2 (backend); React 19 + TS + Vite (frontend). Docker local `hsgrowth-api-local` (DB de produção). Testes: `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -q`. Frontend typecheck: `cd frontend && npx tsc --noEmit`.

**Restrições:** Sem bump de versão. Excluir `.claude/settings.local.json` dos commits. `backend/tests/` NÃO é bind-mounted → `docker cp` antes do pytest. `backend/app/` É bind-mounted (auto-reload). Commits terminam com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## Referências de padrões existentes

- Model FK/relationship: `backend/app/models/proposal.py`.
- Marker/board atual: `backend/app/services/proposal_service.py::_derive_card_fields`.
- Attach PDF ao card: `backend/app/services/proposal_pdf_service.py::attach_proposal_pdf_to_card` (linhas ~703-779).
- ServiceList flags: `is_done_stage`, `is_lost_stage`, `board_id` em `backend/app/models/service_list.py`.
- Regra de avanço: `backend/app/services/service_board_service.py::_has_linked_proposal`.
- Frontend tabela: `frontend/src/pages/Proposals.tsx`; card: `frontend/src/components/service/ServiceProposalsSection.tsx`.

---

## Task A1: Models de vínculo e versão

**Files:**
- Create: `backend/app/models/proposal_service_card.py`
- Create: `backend/app/models/proposal_version.py`
- Modify: `backend/app/models/proposal.py`

- [ ] **Step 1:** Criar `ProposalServiceCard`:

```python
# backend/app/models/proposal_service_card.py
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.mixins import TimestampMixin


class ProposalServiceCard(Base, TimestampMixin):
    """Vínculo N:N entre uma proposta e um card de Serviço."""
    __tablename__ = "proposal_service_cards"
    __table_args__ = (
        UniqueConstraint("proposal_id", "service_card_id", name="uq_proposal_card"),
    )

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    service_card_id = Column(Integer, ForeignKey("service_cards.id", ondelete="CASCADE"), nullable=False, index=True)

    proposal = relationship("Proposal", back_populates="card_links")
    service_card = relationship("ServiceCard")
```

- [ ] **Step 2:** Criar `ProposalVersion`:

```python
# backend/app/models/proposal_version.py
from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.mixins import TimestampMixin


class ProposalVersion(Base, TimestampMixin):
    """Snapshot arquivado de uma proposta (histórico de versões)."""
    __tablename__ = "proposal_versions"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    snapshot = Column(JSON, nullable=True)
    pdf_path = Column(String(500), nullable=True)   # relativo a UPLOAD_DIR
    changed_by = Column(String(255), nullable=True)

    proposal = relationship("Proposal", back_populates="versions")
```

- [ ] **Step 3:** Em `proposal.py`, remover a coluna `service_card_id` e o relationship `service_card`; adicionar:

```python
    card_links = relationship("ProposalServiceCard", back_populates="proposal",
                              cascade="all, delete-orphan", lazy="selectin")
    versions = relationship("ProposalVersion", back_populates="proposal",
                            cascade="all, delete-orphan", lazy="selectin",
                            order_by="ProposalVersion.version_number")
```

Atualizar `__repr__` (remover `card={self.service_card_id}`). Garantir import dos novos models em `backend/app/models/__init__.py` (seguir o padrão do arquivo — se ele importa cada model, adicionar as duas novas classes).

- [ ] **Step 4:** Verificar import: `docker exec -w /app hsgrowth-api-local python -c "import app.models.proposal_service_card, app.models.proposal_version, app.models.proposal; print('ok')"` → Espera `ok`.

- [ ] **Step 5:** Commit `feat(propostas): models de vinculo N:N e versao`.

---

## Task A2: Migration Alembic

**Files:**
- Create: `backend/alembic/versions/2026_07_03_XXXX-<hash>_proposals_multiboard_versions.py`

- [ ] **Step 1:** Escrever migration MANUAL (não autogenerate — evita drift). `upgrade()`:
  1. `op.create_table("proposal_service_cards", ...)` com colunas id, proposal_id, service_card_id, created_at, updated_at, `UniqueConstraint("proposal_id","service_card_id", name="uq_proposal_card")` e FKs ondelete CASCADE.
  2. `op.create_table("proposal_versions", ...)` com id, proposal_id, version_number, snapshot (sa.JSON), pdf_path (String 500), changed_by (String 255), created_at, updated_at.
  3. Migrar dados: `op.execute("INSERT INTO proposal_service_cards (proposal_id, service_card_id, created_at, updated_at) SELECT id, service_card_id, NOW(), NOW() FROM proposals WHERE service_card_id IS NOT NULL AND is_deleted = false")`.
  4. `op.drop_index`/`op.drop_constraint` da FK de `proposals.service_card_id` se necessário, depois `op.drop_column("proposals", "service_card_id")`.

  `downgrade()`: recriar a coluna `service_card_id` (nullable), repopular a partir do primeiro vínculo, dropar as duas tabelas. (Basta ser coerente; não precisa ser perfeito.)

  Usar `down_revision` = a última revisão atual (verificar `docker exec -w /app hsgrowth-api-local alembic heads`).

- [ ] **Step 2:** Rodar `docker exec -w /app hsgrowth-api-local alembic upgrade head` → Espera sucesso, sem erro.

- [ ] **Step 3:** Verificar dados migrados: `docker exec -w /app -e PYTHONPATH=/app hsgrowth-api-local python -c "from app.db.session import SessionLocal; from sqlalchemy import text; db=SessionLocal(); print(db.execute(text('select count(*) from proposal_service_cards')).scalar())"` → Espera número ≥ vínculos existentes (era: #25,#28,#29,#30 no card 4 → ≥4).

- [ ] **Step 4:** Commit `feat(propostas): migration N:N + versoes + migra vinculos`.

---

## Task B1: Schemas

**Files:**
- Modify: `backend/app/schemas/proposal.py`

- [ ] **Step 1:** Adicionar:

```python
class LinkedCard(BaseModel):
    card_id: int
    board_id: Optional[int] = None
    status: Literal["ganho", "perdido", "ativo"] = "ativo"
    title: Optional[str] = None


class ProposalVersionResponse(BaseModel):
    id: int
    version_number: int
    changed_by: Optional[str] = None
    created_at: Optional[datetime] = None
    has_pdf: bool = False
    snapshot: Optional[dict] = None

    class Config:
        from_attributes = True
```

- [ ] **Step 2:** Em `ProposalResponse`: remover `service_card_id` (herdado de Base — sobrescrever removendo de Base? Ver abaixo) e `board_id`; adicionar `linked_cards: List[LinkedCard] = Field(default_factory=list)`.
  - `ProposalBase` tem `service_card_id`. Mantê-lo em `ProposalBase`/`ProposalCreate` como campo transiente de criação (opcional). Removê-lo de `ProposalUpdate`. Em `ProposalResponse`, **não** expor `service_card_id` cru — apenas `linked_cards`. Como `ProposalResponse(ProposalBase)` herdaria `service_card_id`, redeclarar não é trivial; solução: manter `service_card_id: Optional[int] = None` na resposta (inofensivo, sempre None pós-migração) OU criar `ProposalResponse` herdando de um base sem esse campo. **Escolha:** manter `service_card_id` na resposta como `None` (compat) e adicionar `linked_cards`. Remover `board_id`.

- [ ] **Step 3:** `docker exec -w /app hsgrowth-api-local python -c "import app.schemas.proposal; print('ok')"` → `ok`.

- [ ] **Step 4:** Commit `feat(propostas): schemas LinkedCard/ProposalVersion + linked_cards`.

---

## Task B2: Repository

**Files:**
- Modify: `backend/app/repositories/proposal_repository.py`

- [ ] **Step 1:** Trocar os `joinedload(Proposal.service_card)...` por carregamento dos vínculos. `Proposal.card_links` é `lazy="selectin"` (carrega sozinho). Nos `get_by_id`/`list`/`list_by_card`, manter `joinedload(Proposal.client)`. Para os cards e suas listas, adicionar selectinload das relações do vínculo: `from sqlalchemy.orm import selectinload` e `.options(selectinload(Proposal.card_links).selectinload(ProposalServiceCard.service_card).selectinload(ServiceCard.list))`.

- [ ] **Step 2:** `create`: `payload = data.model_dump(exclude={"items", "service_card_id"})`. Após criar a proposta, se `data.service_card_id`: adicionar `ProposalServiceCard(proposal_id=proposal.id, service_card_id=data.service_card_id)` e commit (idempotente — checar duplicado). Retornar proposal.

- [ ] **Step 3:** `list_by_card(service_card_id)`: `join(ProposalServiceCard, ...)` filtrando `ProposalServiceCard.service_card_id == service_card_id` e `Proposal.is_deleted == False`.

- [ ] **Step 4:** Métodos novos:
  - `link_card(proposal, service_card_id)`: se não existir vínculo igual, cria e commit.
  - `unlink_card(proposal, service_card_id)`: deleta o vínculo correspondente e commit.
  - `add_version(proposal, version_number, snapshot, pdf_path, changed_by)`: cria `ProposalVersion` e commit.
  - `list_versions(proposal_id)`: retorna versões ordenadas `version_number desc`.
  - `get_version(proposal_id, version_id)`.

- [ ] **Step 5:** `import` de `ProposalServiceCard` e `ProposalVersion`.

- [ ] **Step 6:** `docker exec -w /app hsgrowth-api-local python -c "import app.repositories.proposal_repository; print('ok')"` → `ok`.

- [ ] **Step 7:** Commit `feat(propostas): repository N:N (link/unlink) + versoes`.

---

## Task B3: Service (marcador multi-card, linked_cards, versionamento, link/unlink)

**Files:**
- Modify: `backend/app/services/proposal_service.py`

- [ ] **Step 1:** Substituir `_derive_card_fields` por `_derive_linked_cards(proposal) -> (marker, list[LinkedCard])`:
  - Para cada `link` em `proposal.card_links`: card = link.service_card; lst = card.list; status = "perdido" if lst and lst.is_lost_stage else "ganho" if lst and lst.is_done_stage else "ativo"; board_id = lst.board_id if lst else None; title = getattr(card, "title", None). Montar `LinkedCard`.
  - Marker: se algum "perdido" → "nao_aprovada"; elif algum "ativo" → "em_aberto"; elif algum "ganho" → "aprovada"; else "em_aberto".

- [ ] **Step 2:** `_to_response`: setar `resp.linked_cards`, `resp.marker`; **não** setar `board_id`. `resp.service_card_id = None`.

- [ ] **Step 3:** `create`: após `repo.create`, se houver vínculo, anexar PDF a **cada** card vinculado (loop sobre `proposal.card_links`, chamando `attach_proposal_pdf_to_card(db, proposal, card_id)` — assinatura nova, Task B4). try/except.

- [ ] **Step 4:** `update(proposal_id, data, user)`: ANTES de `repo.update`:
  - `version_number = len(proposal.versions) + 1`.
  - snapshot = `self._snapshot(proposal)` (dict com number, date iso, client_name, client_document, total, marker, itens resumidos).
  - PDF pré-edição: try `_archive_version_pdf(proposal, version_number)` (Task B5) → pdf_path (ou None se falhar).
  - `repo.add_version(proposal, version_number, snapshot, pdf_path, changed_by=getattr(user,"name",None))`.
  Depois aplica `repo.update` e re-anexa PDF a cada card vinculado.

- [ ] **Step 5:** Métodos `link(proposal_id, service_card_id, user)` e `unlink(proposal_id, service_card_id, user)`:
  - link: `repo.link_card`; re-anexa PDF ao card novo; retorna `_to_response`.
  - unlink: remove PDF auto-anexado daquele card (Task B4 `remove_proposal_pdf_from_card(db, proposal, card_id)`); `repo.unlink_card`; retorna `_to_response`.

- [ ] **Step 6:** `list_versions(proposal_id)` → `[ProposalVersionResponse(id, version_number, changed_by, created_at, has_pdf=bool(v.pdf_path), snapshot=v.snapshot) for v in repo.list_versions(...)]`.

- [ ] **Step 7:** `delete`: soft_delete + para cada card vinculado, `remove_proposal_pdf_from_card`; (vínculos somem via cascade quando hard-delete; como é soft-delete, opcionalmente limpar `card_links`). Manter simples: remover PDFs dos cards e soft-delete.

- [ ] **Step 8:** `prefill_from_card`: continua setando `service_card_id=card.id` no `ProposalCreate` (vira vínculo na criação).

- [ ] **Step 9:** Testes: `docker cp backend/tests hsgrowth-api-local:/app/tests` depois `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -q`. Ajustar testes que referenciam `service_card_id`/`board_id` no response para `linked_cards`. Espera verde.

- [ ] **Step 10:** Commit `feat(propostas): marcador multi-card + versionamento + link/unlink no service`.

---

## Task B4: PDF service (attach por card, remover por card)

**Files:**
- Modify: `backend/app/services/proposal_pdf_service.py`

- [ ] **Step 1:** Alterar assinatura `attach_proposal_pdf_to_card(db, proposal, card_id: int)` — anexa a UM card específico (não usa mais `proposal.service_card_id`). Ajustar corpo para usar `card_id` recebido. `activity_metadata={"proposal_pdf_id": proposal.id, ...}` mantém.

- [ ] **Step 2:** Novo `remove_proposal_pdf_from_card(db, proposal, card_id)`: replica o bloco de "remove PDF anterior" (busca ServiceCardActivity category="arquivo" com meta.proposal_pdf_id == proposal.id no card_id, apaga arquivo + registro). Best-effort.

- [ ] **Step 3:** `docker exec -w /app hsgrowth-api-local python -c "import app.services.proposal_pdf_service; print('ok')"` → `ok`.

- [ ] **Step 4:** Commit `feat(propostas): PDF anexa/remove por card individual`.

---

## Task B5: PDF de versão (arquivar/gerar/ler)

**Files:**
- Modify: `backend/app/services/proposal_pdf_service.py`

- [ ] **Step 1:** `_archive_version_pdf(db, proposal, version_number) -> str|None`: gera `generate_proposal_pdf(db, proposal.id)` (estado atual = pré-edição), grava em `UPLOAD_DIR/proposals/{proposal.id}/v{version_number}.pdf`, cria dirs; retorna caminho relativo `proposals/{id}/v{n}.pdf`. Erro → log + None.

- [ ] **Step 2:** `read_version_pdf(pdf_path) -> bytes`: lê `UPLOAD_DIR/pdf_path`; se não existir, `raise HTTPException(404)`.

- [ ] **Step 3:** `docker exec -w /app hsgrowth-api-local python -c "import app.services.proposal_pdf_service; print('ok')"` → `ok`.

- [ ] **Step 4:** Commit `feat(propostas): arquivamento e leitura de PDF de versao`.

---

## Task B6: Endpoints + regra de avanço

**Files:**
- Modify: `backend/app/api/v1/endpoints/proposals.py`
- Modify: `backend/app/services/service_board_service.py`

- [ ] **Step 1:** Novos endpoints (colocar as rotas `/{id}/cards*` e `/{id}/versions*` ANTES da rota genérica `/{proposal_id}` para não haver conflito — seguir ordem do arquivo, que já põe `/pdf` antes de `/{proposal_id}`):
  - `POST /{proposal_id}/cards` body `{service_card_id:int}` → `ProposalService(db).link(...)`.
  - `DELETE /{proposal_id}/cards/{service_card_id}` → `ProposalService(db).unlink(...)`.
  - `GET /{proposal_id}/versions` → `ProposalService(db).list_versions(...)` (response_model `List[ProposalVersionResponse]`).
  - `GET /{proposal_id}/versions/{version_id}/pdf` `download:int=0` → busca versão, `read_version_pdf(v.pdf_path)`, `Response(application/pdf)`.
  - Body do link: criar `class LinkCardBody(BaseModel): service_card_id: int` inline ou em schemas.

- [ ] **Step 2:** `service_board_service._has_linked_proposal(card_id)`: consultar `proposal_service_cards` join `proposals` (não deletadas) — `db.query(ProposalServiceCard).join(Proposal).filter(ProposalServiceCard.service_card_id==card_id, Proposal.is_deleted==False).first() is not None`. Importar `ProposalServiceCard`.

- [ ] **Step 3:** Testes backend completos: `docker cp backend/tests hsgrowth-api-local:/app/tests && docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -q` → verde. Adicionar teste do marcador multi-card (perdido>ativo>ganho) e do versionamento (edição gera 1 versão).

- [ ] **Step 4:** Commit `feat(propostas): endpoints link/unlink/versoes + avanco via join`.

---

## Task C1: proposalService.ts

**Files:**
- Modify: `frontend/src/services/proposalService.ts`

- [ ] **Step 1:** Adicionar tipos:

```ts
export interface LinkedCard {
  card_id: number;
  board_id?: number | null;
  status: "ganho" | "perdido" | "ativo";
  title?: string | null;
}
export interface ProposalVersion {
  id: number;
  version_number: number;
  changed_by?: string | null;
  created_at?: string | null;
  has_pdf: boolean;
  snapshot?: Record<string, unknown> | null;
}
```

- [ ] **Step 2:** Em `Proposal`: remover `service_card_id`/`board_id`; adicionar `linked_cards: LinkedCard[]`.

- [ ] **Step 3:** Métodos novos:

```ts
async linkCard(id: number, cardId: number): Promise<Proposal> {
  return (await api.post<Proposal>(`${BASE}/${id}/cards`, { service_card_id: cardId })).data;
}
async unlinkCard(id: number, cardId: number): Promise<Proposal> {
  return (await api.delete<Proposal>(`${BASE}/${id}/cards/${cardId}`)).data;
}
async listVersions(id: number): Promise<ProposalVersion[]> {
  return (await api.get<ProposalVersion[]>(`${BASE}/${id}/versions`)).data;
}
async getVersionPdf(id: number, versionId: number, download = false): Promise<Blob> {
  const r = await api.get(`${BASE}/${id}/versions/${versionId}/pdf`, {
    params: download ? { download: 1 } : {}, responseType: "blob" });
  return r.data as Blob;
}
```

- [ ] **Step 4:** `cd frontend && npx tsc --noEmit` → sem erros novos nesse arquivo (outros arquivos que usam `service_card_id` quebrarão até C2/C3 — ok, corrigir lá).

- [ ] **Step 5:** Commit `feat(propostas): service front linkCard/unlink/versoes + linked_cards`.

---

## Task C2: utils/proposalPdf.ts (PDF de versão)

**Files:**
- Modify: `frontend/src/utils/proposalPdf.ts`

- [ ] **Step 1:** Adicionar `viewVersionPdf(proposalId, versionId)` e `downloadVersionPdf(proposalId, versionId, label)` análogos aos existentes, usando `proposalService.getVersionPdf`. Reaproveitar a lógica de blob/URL dos helpers atuais.

- [ ] **Step 2:** `cd frontend && npx tsc --noEmit` (esse arquivo isolado ok).

- [ ] **Step 3:** Commit `feat(propostas): helpers de PDF de versao no front`.

---

## Task C3: ProposalHistoryModal.tsx (novo)

**Files:**
- Create: `frontend/src/components/proposals/ProposalHistoryModal.tsx`

- [ ] **Step 1:** Modal (usar `BaseModal` do common) que recebe `{ isOpen, onClose, proposalId }`. Ao abrir, `proposalService.listVersions(proposalId)`. Lista cada versão: **data** (`created_at` formatada dd/mm/aaaa HH:mm), `#v{version_number}`, `changed_by`, e infos do `snapshot` (nº, cliente, total). Botões **Ver** (`viewVersionPdf`) e **Baixar** (`downloadVersionPdf`); desabilitar se `!has_pdf` com tooltip "PDF indisponível". Estado vazio: "Nenhuma versão anterior". Textos em pt-BR. Seguir estilo Tailwind dos outros modais.

- [ ] **Step 2:** `cd frontend && npx tsc --noEmit` (isolado).

- [ ] **Step 3:** Commit `feat(propostas): ProposalHistoryModal`.

---

## Task C4: Proposals.tsx (chips, histórico, excluir)

**Files:**
- Modify: `frontend/src/pages/Proposals.tsx`

- [ ] **Step 1:** Coluna **Card Vinculado**: substituir bloco `p.service_card_id && p.board_id` por: se `p.linked_cards?.length`, renderizar chips (flex wrap) — cada `lc` → botão `#{lc.card_id}` navega `/servicos/${lc.board_id}/cards/${lc.card_id}` (stopPropagation); senão "—".

- [ ] **Step 2:** Coluna **Ação**: adicionar botão **Histórico** (`History` de lucide-react) que abre `ProposalHistoryModal` (novo estado `historyId`); adicionar botão **Excluir** (`Trash2`) com `useConfirm` → `proposalService.remove(p.id)` (permanente) → `loadProposals`. Importar `useConfirm`, `showSuccess`.

- [ ] **Step 3:** Renderizar `<ProposalHistoryModal isOpen={historyId!==null} proposalId={historyId ?? 0} onClose={()=>setHistoryId(null)} />`.

- [ ] **Step 4:** `cd frontend && npx tsc --noEmit` → sem erros.

- [ ] **Step 5:** Commit `feat(propostas): pagina lista com chips multi-card, historico e excluir`.

---

## Task C5: ServiceProposalsSection.tsx (desvincular, histórico, vincular)

**Files:**
- Modify: `frontend/src/components/service/ServiceProposalsSection.tsx`

- [ ] **Step 1:** `handleDelete` → renomear intenção para **desvincular**: confirm "Desvincular a proposta #{n} deste card?" → `proposalService.unlinkCard(p.id, cardId)` → `showSuccess("Proposta #{n} desvinculada")` → `loadProposals`. Ícone continua `Trash2`, `title="Desvincular deste card"`.

- [ ] **Step 2:** Adicionar botão **Histórico** (`History`) nas ações do card → abre `ProposalHistoryModal` (estado `historyId`).

- [ ] **Step 3:** `handleOpenLink`: trocar `data.items.filter((p) => !p.service_card_id)` por: excluir as já vinculadas a ESTE card — `data.items.filter((p) => !p.linked_cards?.some((lc) => lc.card_id === cardId))`.

- [ ] **Step 4:** `handleLink` → `proposalService.linkCard(p.id, cardId)` (em vez de `update({service_card_id})`).

- [ ] **Step 5:** Renderizar `ProposalHistoryModal`.

- [ ] **Step 6:** `cd frontend && npx tsc --noEmit` → sem erros. Build sanity: `cd frontend && npx vite build` opcional.

- [ ] **Step 7:** Commit `feat(propostas): card desvincular + historico + vincular via linkCard`.

---

## Task D1: Docs

**Files:**
- Modify: `Documentação/16 - FLUXO E REGRAS DO BOARD DE SERVIÇOS.md`

- [ ] **Step 1:** Na seção de Propostas (§3.1.1), documentar: proposta compartilhável em vários cards (N:N), regra do marcador (Perdido > Ativo > Ganho), histórico de versões (a cada edição salva; ver/baixar PDF anterior), lixeira no card = desvincular, excluir permanente na página /propostas.

- [ ] **Step 2:** Commit `docs(servicos): doc 16 multi-board + historico de propostas`.

---

## Verificação final

- [ ] `docker exec -w /app hsgrowth-api-local pytest tests/unit/test_proposals.py -q` verde.
- [ ] `cd frontend && npx tsc --noEmit` sem erros.
- [ ] Smoke manual (usuário): criar proposta no card A, vincular ao card B (outro board), ver os 2 chips na /propostas; editar → aparece versão no histórico com Ver/Baixar; desvincular do card A; excluir permanente na /propostas.
