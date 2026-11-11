# Parcerias — Hunter, Parte 1: Estrutura · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** perfil `hunter`, indicação de empresas (hunter → empresa, empresa → unidade, um nível), cadastro e ativação automática por convite + aceite dos termos, bloqueio pela H&S, visibilidade de cada perfil e oportunidade só "venda" para os externos.

**Architecture:** o hunter é uma linha em `partners` com `kind="hunter"` (dono das próprias oportunidades), ligada ao login `hunter` por `users.partner_id`, como já acontece com o dono `partner`. Cada empresa guarda `indicated_by_partner_id` (um nível). A ativação deixa de depender das etapas do board: convite → aceite dos termos (gate no backend, igual à troca obrigatória de senha) → ativado. Visibilidade continua centralizada em `services/parcerias/acesso.py`.

**Tech Stack:** FastAPI · SQLAlchemy · Alembic · pytest (SQLite em memória) · React + TS + Vite + Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-11-parcerias-hunter-indicacao-comissoes-design.md` — seções 2, 3 e 8 (esta é a Parte 1 da seção 6). Comissões (Parte 2) e Dashboard (Parte 3) **não** entram aqui.

## Global Constraints

- `backend/.env` aponta para PRODUÇÃO: nunca rodar `alembic upgrade/downgrade`, scripts ou a API local; não ler `.env`. Migration roda só no homo. `venv/bin/alembic heads` pode.
- Testes: `cd backend && REDIS_HOST=127.0.0.1 REDIS_PORT=6390 venv/bin/python -m pytest <arquivo> -q -p no:cacheprovider` (Redis descartável: `docker run -d --rm --name redis-testes-hsgrowth -p 127.0.0.1:6390:6379 redis:7-alpine`). Falhas pré-existentes conhecidas: `test_daily_service.py`, `test_daily_endpoints.py`, 2 de `test_proposals.py` (PDF) — o resto tem de passar.
- Front: `cd frontend && npx tsc --noEmit -p . && npm run build` (o `npm run lint` está quebrado no repo, pré-existente).
- Português em código, UI e mensagens. Commits conventional, sem acentos, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Um commit por tarefa. Sem push.
- Revisão da migration: `down_revision = "7b8c9d0e1f2a"`; nova revisão `8c9d0e1f2a3b`.
- Perfis externos (trancados): `partner`, `partner_member`, `hunter`, `finance` (finance continua só leitura + validação).
- Mensagens exatas: CNPJ repetido → `"Este CNPJ já está no Programa de Parceiros."`; termos pendentes → `"Aceite os termos do Programa de Parceiros para continuar."`; locação por externo → `"Parceiros trabalham só com venda."`; oportunidade de empresa indicada → `"Você só acompanha as oportunidades desta empresa."`; mover card de Aquisição → `"As situações mudam sozinhas (convite e aceite) ou pelo botão Bloquear."`.
- Versão final desta parte: **1.11.18** (CHANGELOG.md, `frontend/src/components/common/ChangelogModal.tsx`, rodapé de `frontend/src/layouts/MainLayout.tsx`).

## Review Focus

1. **Um nível só:** o hunter que indicou a Empresa A não pode ver a Unidade B que a Empresa A indicou, nem as oportunidades dela — teste na Task 3.
2. **Indicador só lê:** hunter/empresa que abre oportunidade de uma empresa indicada recebe 403 ao editar, mover, mexer em produtos ou criar atividade — teste na Task 3.
3. **Equipe e Acessos da unidade:** a empresa indicadora vê o card da unidade, mas não a Equipe nem os Acessos dela (404) — teste na Task 3.
4. **Login sem aceite:** dono/hunter com termos pendentes recebe 403 em tudo menos auth, `/users/me*` e `/parcerias/termos*`; vendedor da equipe nunca é barrado pelos termos — teste na Task 6.
5. **Bloqueio derruba a equipe:** bloquear a empresa desativa dono e vendedores; desbloquear reativa o dono e só os vendedores cujo membro está ativo — teste na Task 5.

---

## Mapa de arquivos

**Criar (backend):** `alembic/versions/2026_11_11_1000-8c9d0e1f2a3b_parcerias_hunter_indicacao_termos.py`, `app/models/partner_terms.py`, `app/services/parcerias/indicacoes.py`, `app/services/parcerias/hunters.py`, `app/services/parcerias/termos.py`, `app/services/parcerias/bloqueio.py`, testes `tests/unit/test_parcerias_hunter_*.py`.

**Modificar (backend):** `app/models/partner.py`, `app/models/__init__.py`, `app/api/deps.py`, `app/services/parcerias/{acesso,etapas,parceiros,oportunidades,atividades,respostas}.py`, `app/schemas/parcerias.py`, `app/api/v1/endpoints/parcerias.py`, `tests/unit/apoio_parcerias.py`.

**Criar (front):** `pages/parcerias/Hunters.tsx`, `pages/parcerias/Indicacoes.tsx`, `pages/parcerias/TermosAdmin.tsx`, `pages/AceiteTermos.tsx`.

**Modificar (front):** `constants/parcerias.ts`, `services/parceriasService.ts`, `types/index.ts`, `router.tsx`, `layouts/MainLayout.tsx`, `pages/parcerias/{ParceriasHome,AquisicaoKanban,ParceiroDetalhe,OportunidadesKanban,OportunidadeDetalhe}.tsx`, `components/parcerias/{NovaOportunidadeModal,NovoParceiroModal,ModalTrava,EtapasParceria}.tsx`, `contexts/AuthContext.tsx`.

---

### Task 1: Banco — campos do parceiro, termos e role `hunter`

**Files:**
- Create: `backend/alembic/versions/2026_11_11_1000-8c9d0e1f2a3b_parcerias_hunter_indicacao_termos.py`, `backend/app/models/partner_terms.py`
- Modify: `backend/app/models/partner.py`, `backend/app/models/__init__.py`, `backend/tests/unit/apoio_parcerias.py`
- Test: `backend/tests/unit/test_parcerias_hunter_modelo.py`

**Interfaces — Produces:**
- `Partner` ganha: `kind` (String(10), not null, default `"empresa"`; valores `"empresa"|"hunter"`), `cpf` (String(11), null, index), `pix_key` (String(140), null), `indicated_by_partner_id` (FK `partners.id` ON DELETE SET NULL, null, index), `blocked_at` (DateTime, null), `blocked_by_id` (FK users SET NULL, null), `terms_accepted_at` (DateTime, null). Relationship `indicated_by = relationship("Partner", remote_side=[id])`.
- `PartnerTerms` (`partner_terms`): `id`, `audience` (String(10): `"empresa"|"hunter"`), `version` (Integer), `text` (Text), `published_at` (DateTime, default utcnow), `published_by_id` (FK users SET NULL). Único (`audience`, `version`).
- `PartnerTermsAcceptance` (`partner_terms_acceptances`): `id`, `partner_id` (FK partners CASCADE, index), `user_id` (FK users SET NULL), `terms_id` (FK partner_terms CASCADE), `accepted_at` (DateTime), `ip_address` (String(64)).
- Role `hunter` ("Hunter de parceiros", `is_system_role=true`), inserida com `ON CONFLICT (name) DO NOTHING` (mesmo padrão da `7b8c9d0e1f2a`).
- Migração de dados de `partners.stage` (Aquisição): `ativacao|ativado` → `ativado`; `perdido` → `bloqueado` (com `blocked_at = now()`); `potencial|qualificacao|proposta|formalizacao|onboarding` → `convidado` se existir login `partner` não excluído com aquele `partner_id`, senão `potencial`. Downgrade: remove tabelas/colunas/role (role só se nenhum usuário a usa) e devolve `convidado`→`potencial`, `bloqueado`→`perdido`.
- `apoio_parcerias.py`: `hunter(db, nome="Hunter", email="h@hunter.com") -> tuple[Partner, User]` (cria `Partner(kind="hunter", stage="ativado", terms_accepted_at=agora)` + login role `hunter` ligado) e `parceiro(...)` passa a criar com `stage="ativado"` e `terms_accepted_at` preenchido por padrão (os testes atuais não podem ser barrados pelos termos).

- [ ] **Step 1:** teste `test_parceiro_novo_nasce_empresa_sem_indicador` (`Partner(name="X")` salvo → `kind == "empresa"`, `indicated_by_partner_id is None`) e `test_indicador_um_nivel` (A indicada por H, B indicada por A → `B.indicated_by.id == A.id`, `A.indicated_by.id == H.id`).
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** migration + models + import em `models/__init__.py` + helpers de teste.
- [ ] **Step 4:** rodar o teste novo e `tests/unit/test_parcerias*.py` → passam; `venv/bin/alembic heads` → `8c9d0e1f2a3b (head)`.
- [ ] **Step 5:** commit `feat(parcerias): campos de hunter, indicacao e termos (migration)`.

---

### Task 2: Aquisição — 4 situações e fim das travas de ativação

**Files:**
- Modify: `backend/app/services/parcerias/etapas.py` (`ETAPAS_AQUISICAO`, `validar_mudanca_parceiro`), `backend/app/services/parcerias/parceiros.py` (`criar`, `mover`), `backend/app/services/parcerias/oportunidades.py` (chamadas a `ativacao.registrar_evidencia` ~213/215/242), `backend/app/services/parcerias/ativacao.py`
- Test: `backend/tests/unit/test_parcerias_hunter_situacoes.py`; ajustar testes antigos de Aquisição/ativação que dependem das etapas removidas (apagar os que testam travas/evidência de ativação que deixaram de existir — listar no relatório).

**Interfaces — Produces:** `ETAPAS_AQUISICAO = (Etapa("potencial","Potencial"), Etapa("convidado","Convidado"), Etapa("ativado","Ativado"), Etapa("bloqueado","Bloqueado"))`. `parceiros.mover(...)` sempre 422 com a mensagem global. `ativacao.py` reduzido a `ativar(db, parceiro: Partner, user: Optional[User]) -> None` (stage `ativado`, `activated_at = agora`, evento "Parceiro ativado (aceite dos termos)"; quem chama faz commit).

- [ ] **Step 1:** testes: `test_mover_card_de_aquisicao_e_recusado` (gestão PUT/POST de mover → 422 com a mensagem global); `test_ganho_nao_muda_situacao_do_parceiro` (confirmar ganho de oportunidade não altera `partner.stage`); `test_cadastro_pela_hs_nasce_potencial`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar; remover as evidências de ativação de `oportunidades.py`.
- [ ] **Step 4:** rodar arquivo novo + `tests/unit/test_parcerias*.py` → passam.
- [ ] **Step 5:** commit `feat(parcerias): aquisicao com 4 situacoes e ativacao fora das etapas`.

---

### Task 3: Perfil `hunter` e visibilidade por indicação

**Files:**
- Modify: `backend/app/api/deps.py` (`PERFIS_TRANCADOS`, `require_parcerias_access`, `require_consulta_cnpj`), `backend/app/services/parcerias/acesso.py`, `oportunidades.py` (escritas), `atividades.py` (criar/editar/apagar), `parceiros.py` (equipe/acessos), `respostas.py` (se usar `eh_parceiro`)
- Test: `backend/tests/unit/test_parcerias_hunter_visibilidade.py`

**Interfaces — Produces (acesso.py):**
- `HUNTER = "hunter"`; `eh_hunter(user) -> bool`; `eh_externo(user) -> bool` (partner, partner_member ou hunter); `eh_parceiro(user)` passa a incluir `hunter` (lado de fora com parceiro próprio) — revisar cada uso e listar no relatório.
- `parceiro_do_login(user) -> int` vale para hunter (o `partner_id` do login).
- `ids_visiveis(db, user) -> List[int]`: para `partner`/`hunter` = `[próprio] + [indicados diretos não excluídos]`.
- `parceiros_visiveis`: hunter → só indicados diretos (não o próprio registro); partner → próprio + indicados diretos; partner_member inalterado.
- `oportunidades_visiveis`: partner/hunter → `partner_id in ids_visiveis`; partner_member inalterado.
- `exigir_oportunidade_propria(user, op) -> None`: externo e `op.partner_id != parceiro_do_login(user)` → 403 com a mensagem global. Chamar em: atualizar, mover, produtos (adicionar/atualizar/remover), criar/editar/apagar atividade de oportunidade, anexos.
- `buscar_parceiro_proprio(db, user, partner_id) -> Partner`: externo só o próprio (senão 404). Usar em equipe (listar/criar/atualizar/dar acesso/convidar), acessos e contrato.
- Hunter cria oportunidade: nasce com `partner_id = próprio`, `seller_member_id = None` (não tem equipe; `_conferir_vendedor` não se aplica).

- [ ] **Step 1:** testes (apoio: `hunter()`, `parceiro(..., indicated_by_partner_id=...)`, `oportunidade()`):
  - `test_hunter_ve_so_os_indicados_diretos` — H indica A; A indica B: `GET /parcerias/parceiros` do hunter = `[A]`; oportunidades = só as de A + as próprias; `GET /parcerias/oportunidades/{op de B}` → 404.
  - `test_empresa_ve_unidade_e_vendas_dela` — A vê o card de B e as oportunidades de B.
  - `test_indicador_so_le` — hunter/A em oportunidade de A/B: PUT, mover, POST produto, POST atividade → 403 `"Você só acompanha as oportunidades desta empresa."`; GET → 200.
  - `test_equipe_e_acessos_da_unidade_sao_404` — A em `/parceiros/{B}/equipe` e `/acessos` → 404.
  - `test_hunter_cria_venda_propria` — POST oportunidade → 201, `partner_id == hunter.partner.id`.
  - `test_hunter_trancado_e_consulta_cnpj` — `/api/v1/clients` → 403; `/parcerias/consulta-cnpj/resumo` → 200.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** arquivo novo + `tests/unit/test_parcerias*.py` → passam.
- [ ] **Step 5:** commit `feat(parcerias): perfil hunter e visibilidade por indicacao`.

---

### Task 4: Indicar empresa (hunter, empresa e H&S) com convite

**Files:**
- Create: `backend/app/services/parcerias/indicacoes.py`
- Modify: `backend/app/schemas/parcerias.py`, `backend/app/api/v1/endpoints/parcerias.py`, `backend/app/services/parcerias/parceiros.py` (`criar` aceita `indicated_by_partner_id` e `pix_key`; `criar_acesso` muda `potencial`→`convidado`)
- Test: `backend/tests/unit/test_parcerias_hunter_indicacao.py`

**Interfaces — Produces:**
- Schema `IndicacaoCreate`: `name` (1..255), `cnpj` (obrigatório, validado com o validador de CNPJ existente), `main_contact_name` (1..255), `main_contact_email` (validador de e-mail existente), `main_contact_phone` (opcional, validador existente), `pix_key` (opcional, ≤140).
- `indicacoes.indicar(db, user, dados: IndicacaoCreate) -> criacao_de_login.Resultado`: só `partner` (dono) ou `hunter` (403 para os demais; gestão usa o cadastro da H&S). CNPJ repetido = existe `Partner` não excluído com mesmo `cnpj` e `stage != "bloqueado"` → 422 mensagem global. Cria `Partner(kind="empresa", stage="convidado", indicated_by_partner_id=parceiro_do_login(user), created_by_id=user.id, ...)`, registra evento "Indicado por {nome do indicador}" e chama `criacao_de_login.criar_login(db, user, nome=main_contact_name, email=main_contact_email, papel="partner", modo="convite", partner_id=p.id)`.
- `indicacoes.listar(db, user) -> List[Partner]`: indicados diretos do login (para gestão: 403 — ela usa o board).
- Rotas: `POST /parcerias/indicacoes` (201, `{parceiro: ParceiroResponse, email_enviado}`), `GET /parcerias/indicacoes` (lista com `stage`, `activated_at`, `terms_accepted_at`).
- `ParceiroCreate`/`ParceiroResponse` ganham `indicated_by_partner_id`, `indicated_by_name` (resposta), `pix_key`, `kind`, `cpf` (resposta). Gestão pode escolher um hunter como indicador no cadastro (`indicated_by_partner_id` tem de ser `kind="hunter"`, senão 422).

- [ ] **Step 1:** testes: `test_hunter_indica_empresa_e_convite_sai` (201, `stage=="convidado"`, indicador = hunter, e-mail capturado pelo fixture `emails`); `test_empresa_indica_unidade`; `test_cnpj_repetido_e_recusado` (mesmo CNPJ ativo → 422 mensagem global; CNPJ de parceiro bloqueado → 201); `test_vendedor_do_parceiro_nao_indica` (403); `test_gestao_cadastra_com_hunter_indicador` e `..._indicador_que_nao_e_hunter_422`; `test_criar_acesso_muda_potencial_para_convidado`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** arquivo novo + `test_parcerias*.py` → passam.
- [ ] **Step 5:** commit `feat(parcerias): indicacao de empresa por hunter e por empresa com convite`.

---

### Task 5: Hunters (cadastro pela H&S) e bloqueio

**Files:**
- Create: `backend/app/services/parcerias/hunters.py`, `backend/app/services/parcerias/bloqueio.py`
- Modify: `backend/app/schemas/parcerias.py`, `backend/app/api/v1/endpoints/parcerias.py`
- Test: `backend/tests/unit/test_parcerias_hunter_cadastro_bloqueio.py`

**Interfaces — Produces:**
- Schema `HunterCreate`: `name`, exatamente um de `cpf` (11 dígitos, validar DV) ou `cnpj` (validador existente) — senão 422; `email`, `phone` (opcional), `pix_key` (opcional).
- `hunters.criar(db, user, dados) -> criacao_de_login.Resultado`: só gestão. CPF/CNPJ repetido entre hunters não bloqueados → 422 `"Este CPF/CNPJ já está cadastrado como hunter."`. Cria `Partner(kind="hunter", stage="convidado", ...)` + `criar_login(papel="hunter", modo="convite", partner_id=p.id)`.
- `hunters.listar(db, user) -> List[dict]`: gestão; cada item com dados do hunter, `stage`, nº de empresas indicadas, status do acesso (`tokens_de_acesso.status_do_acesso`).
- Rotas: `POST /parcerias/hunters` (201), `GET /parcerias/hunters`, `POST /parcerias/hunters/{partner_id}/convite` `{enviar}` → `ConviteResponse` (gestão; reenviar/copiar link do login `hunter` daquele parceiro — a rota de Acessos ao CRM só trata role `partner`).
- `bloqueio.bloquear(db, user, partner_id) -> Partner` / `bloqueio.desbloquear(...)`: só gestão; vale para empresa e hunter. Bloquear: `stage="bloqueado"`, `blocked_at`, `blocked_by_id`, `is_active=False` em todos os `users` com aquele `partner_id`; evento no histórico. Desbloquear: `stage = "ativado" if terms_accepted_at else ("convidado" if existe login dono/hunter else "potencial")`; reativa o login dono/hunter e os `partner_member` cujo `PartnerTeamMember.is_active` é true. Rotas `POST /parcerias/parceiros/{id}/bloquear` e `/desbloquear`.
- Bloquear hunter **não** mexe nas empresas indicadas por ele.

- [ ] **Step 1:** testes: `test_gestao_cadastra_hunter_por_convite` (CPF e CNPJ); `test_hunter_com_cpf_e_cnpj_ou_nenhum_422`; `test_hunter_repetido_422`; `test_so_gestao_cadastra_hunter` (partner/hunter → 403); `test_copiar_link_do_hunter` (`enviar=false` → link); `test_bloquear_empresa_desativa_dono_e_equipe` + `test_desbloquear_reativa_so_membros_ativos`; `test_bloquear_hunter_nao_afeta_indicadas`; `test_bloqueado_recebe_usuario_inativo` (próximo request do dono → 403 "Usuário inativo").
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** arquivo novo + `test_parcerias*.py` → passam.
- [ ] **Step 5:** commit `feat(parcerias): cadastro de hunter pela HS e bloqueio de parceiro`.

---

### Task 6: Termos do programa, aceite e ativação automática

**Files:**
- Create: `backend/app/services/parcerias/termos.py`
- Modify: `backend/app/api/deps.py` (`get_current_active_user`), `backend/app/schemas/parcerias.py`, `backend/app/api/v1/endpoints/parcerias.py`, `backend/app/api/v1/endpoints/users.py` (`/users/me` informa `termos_pendentes: bool`), `backend/app/schemas/user.py`
- Test: `backend/tests/unit/test_parcerias_hunter_termos.py`

**Interfaces — Produces:**
- `termos.vigente(db, audience) -> Optional[PartnerTerms]` (maior `version` do público).
- `termos.publicar(db, user, audience, texto) -> PartnerTerms` (só gestão; `version = vigente+1`).
- `termos.pendente(db, user) -> Optional[PartnerTerms]`: só para `partner` e `hunter` (`audience` = `"hunter"` se o parceiro do login é `kind="hunter"`, senão `"empresa"`); devolve a vigente se não existe `PartnerTermsAcceptance` dela para aquele `partner_id`; sem termos publicados → `None` (não barra).
- `termos.aceitar(db, user, ip) -> Partner`: grava aceite (partner, user, termo, agora, ip), `partner.terms_accepted_at = agora`; se `stage in ("potencial","convidado")` → `ativacao.ativar(...)` e notifica todos os usuários ativos admin/manager via `NotificationService(db).create_notification(NotificationCreate(user_id=..., notification_type="parceria_ativada", title="Parceiro novo", message=f"{p.name} aceitou os termos e está ativo." + (f" Indicado por {indicador}." if indicador else ""), color="success", icon="info"))`.
- Rotas: `GET /parcerias/termos/pendente` → `{pendente: bool, version?, text?}`; `POST /parcerias/termos/aceitar`; `GET /parcerias/termos?audience=` e `POST /parcerias/termos` `{audience, text}` (gestão).
- Gate em `get_current_active_user` (depois do de troca de senha): `partner`/`hunter` com `termos.pendente(...)` não nulo → 403 com a mensagem global, exceto caminhos que começam com `/api/v1/auth/`, `/api/v1/users/me` ou `/api/v1/parcerias/termos`.

- [ ] **Step 1:** testes: `test_sem_termos_publicados_nao_barra`; `test_dono_com_termos_pendentes_e_barrado` (403 em `/parcerias/oportunidades`; 200 em `/users/me` com `termos_pendentes: true` e em `/parcerias/termos/pendente`); `test_aceite_ativa_e_notifica` (stage `ativado`, `activated_at`, aceite com IP, notificação para admin/manager); `test_versao_nova_exige_novo_aceite` (ativado continua `ativado`, mas volta a ser barrado até aceitar); `test_hunter_usa_termos_de_hunter`; `test_vendedor_do_parceiro_nunca_e_barrado`; `test_so_gestao_publica`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** arquivo novo + `test_parcerias*.py` + `test_acessos_senha.py` → passam.
- [ ] **Step 5:** commit `feat(parcerias): termos do programa com aceite e ativacao automatica`.

---

### Task 7: Só venda para os externos

**Files:**
- Modify: `backend/app/services/parcerias/oportunidades.py` (`criar`, `atualizar`, `mover` quando o `ModalTrava` manda `modality`)
- Test: `backend/tests/unit/test_parcerias_hunter_so_venda.py`

**Interfaces:** externo (`acesso.eh_externo`) criando sem `modality` → grava `"venda"`; mandando `"locacao"` em criar/atualizar/mover → 422 `"Parceiros trabalham só com venda."`. Gestão continua podendo usar locação.

- [ ] **Step 1:** testes `test_externo_cria_venda_por_padrao`, `test_externo_locacao_422` (criar e atualizar), `test_gestao_ainda_usa_locacao`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** passam + suíte inteira do backend (comparar falhas com a lista pré-existente).
- [ ] **Step 5:** commit `feat(parcerias): oportunidade de parceiro so como venda`.

---

### Task 8: Front — base (tipos, serviço, termos)

**Files:**
- Modify: `frontend/src/types/index.ts` (role `"hunter"`; `User.termos_pendentes?: boolean`), `frontend/src/constants/parcerias.ts`, `frontend/src/services/parceriasService.ts`, `frontend/src/router.tsx`, `frontend/src/layouts/MainLayout.tsx`, `frontend/src/contexts/AuthContext.tsx`
- Create: `frontend/src/pages/AceiteTermos.tsx`, `frontend/src/pages/parcerias/TermosAdmin.tsx`

**Interfaces — Produces:**
- Constantes: `PERFIS_TRANCADOS` += `"hunter"`; `PERFIS_PARCERIAS`, `PERFIS_QUE_EDITAM`, `PERFIS_CONSULTA_CNPJ` += `"hunter"`; `PERFIS_DO_PARCEIRO` += `"hunter"`; nova `PERFIS_QUE_INDICAM = ["partner", "hunter"]`; `ETAPAS_AQUISICAO` com as 4 situações (cores: potencial cinza, convidado amarelo, ativado verde, bloqueado vermelho).
- `parceriasService`: `termosPendentes()`, `aceitarTermos()`, `listarTermos(audience)`, `publicarTermos(audience, text)`, `indicar(dados)`, `listarIndicacoes()`, `criarHunter(dados)`, `listarHunters()`, `bloquear(id)`, `desbloquear(id)`; tipos `Parceiro` com `kind`, `cpf`, `pix_key`, `indicated_by_partner_id`, `indicated_by_name`, `terms_accepted_at`.
- `AceiteTermos.tsx` (rota `/aceite-termos`, dentro de `ProtectedRoute`, fora do `MainLayout`, mesma moldura de `TrocarSenha`): mostra o texto com rolagem, checkbox "Li e aceito os termos do Programa de Parceiros", botão "Aceitar e continuar" → `aceitarTermos()` → `getMe()` → `updateUser` → `navigate("/parcerias")`; botão Sair.
- `MainLayout`: depois do redirect de troca de senha, `if (user?.termos_pendentes) return <Navigate to="/aceite-termos" replace />`.
- `TermosAdmin.tsx` (rota `/parcerias/termos`, só admin/manager): duas abas (Empresa parceira / Hunter), mostra a versão vigente e um textarea para publicar nova versão (confirmação "Todos os parceiros desse tipo terão de aceitar de novo.").

- [ ] **Step 1:** implementar. **Step 2:** `npx tsc --noEmit -p . && npm run build` → ok. **Step 3:** commit `feat(front): perfil hunter, aceite dos termos e tela de termos`.

---

### Task 9: Front — Hunters e Indicações

**Files:**
- Create: `frontend/src/pages/parcerias/Hunters.tsx`, `frontend/src/pages/parcerias/Indicacoes.tsx`
- Modify: `frontend/src/router.tsx`, `frontend/src/pages/parcerias/ParceriasHome.tsx`, `frontend/src/layouts/MainLayout.tsx` (menu)

**Interfaces:**
- `Hunters.tsx` (rota `/parcerias/hunters`, admin/manager): lista (nome, CPF/CNPJ, e-mail, situação com `StatusDoAcesso`, nº de empresas indicadas, ações Reenviar/Copiar link via `AcoesDoConvite` com a URL `/api/v1/parcerias/hunters/{id}/convite`, Bloquear/Desbloquear) + modal "Novo hunter" (tipo Pessoa/Empresa → CPF ou CNPJ, nome, e-mail, telefone, chave PIX; sempre por convite).
- `Indicacoes.tsx` (rota `/parcerias/indicacoes`, `partner` e `hunter`): lista dos indicados (nome, CNPJ, situação, ativado em) com link para o card; botão "Indicar empresa" abre formulário (`IndicacaoCreate`); toasts: sucesso "Convite enviado para {email}." ou, sem e-mail, "Empresa cadastrada. Não conseguimos enviar o e-mail; peça à H&S o link do convite."; erro mostra o `detail`.
- `ParceriasHome`: hunter → `/parcerias/indicacoes`; menu de Parcerias ganha "Indicações" (partner, hunter), "Hunters" e "Termos" (admin/manager).

- [ ] **Step 1:** implementar. **Step 2:** tsc + build ok. **Step 3:** commit `feat(front): telas de hunters e de indicacoes`.

---

### Task 10: Front — board de Aquisição, card do parceiro e oportunidades

**Files:**
- Modify: `frontend/src/pages/parcerias/AquisicaoKanban.tsx`, `ParceiroDetalhe.tsx`, `OportunidadesKanban.tsx`, `OportunidadeDetalhe.tsx`, `frontend/src/components/parcerias/{NovaOportunidadeModal,NovoParceiroModal,ModalTrava,EtapasParceria,KanbanParcerias}.tsx`

**Interfaces / comportamento:**
- Aquisição: 4 colunas; sem arrastar (cards não arrastáveis; nada chama o endpoint de mover).
- `NovoParceiroModal` (gestão): campos novos `pix_key` e "Indicado por" (select com hunters de `listarHunters()`, opcional).
- `ParceiroDetalhe`: mostra tipo (Empresa/Hunter), CPF/CNPJ, chave PIX (só gestão), "Indicado por", data do aceite dos termos; botões Bloquear/Desbloquear (gestão, com `useConfirm`: "Os acessos desta empresa e da equipe dela serão desativados."); Equipe e Acessos só quando o card é do próprio login ou gestão (empresa vendo a unidade não vê).
- Oportunidade de empresa indicada (`op.partner_id !== user.partner_id` para externos): tela somente leitura (sem salvar, mover, produtos, atividades) com faixa "Você acompanha as oportunidades desta empresa."; no kanban, arrastar desabilitado nesses cards e filtro "Minhas / Das indicadas / Todas" para partner e hunter.
- Modalidade: para externos o campo some e mostra "Venda"; `ModalTrava` não pede modalidade para eles (manda `"venda"`).

- [ ] **Step 1:** implementar. **Step 2:** tsc + build ok. **Step 3:** commit `feat(front): aquisicao por situacao, card com indicacao e oportunidades so leitura`.

---

### Task 11: Versão 1.11.18 e verificação final

- [ ] **Step 1:** versão **1.11.18** nos 3 lugares; CHANGELOG (data dd/mm/aaaa, PT-BR) com Adicionado (hunter, indicação, termos e ativação automática, bloqueio, só venda para parceiros), Alterado (Aquisição com 4 situações, sem arrastar), "### Banco" (migration `8c9d0e1f2a3b`, só homo, aditiva + migração de `stage`) e "### Configuração" (publicar os termos em Parcerias → Termos antes de liberar parceiros; sem termos publicados ninguém é barrado).
- [ ] **Step 2:** suíte inteira do backend (comparar com as falhas pré-existentes), `npx tsc --noEmit -p . && npm run build`, `venv/bin/alembic heads` → `8c9d0e1f2a3b (head)`.
- [ ] **Step 3:** commit `chore(release): v1.11.18`.
- [ ] **Step 4 (Erick, homo):** deploy → `alembic upgrade head` no container → publicar termos (Empresa e Hunter) → cadastrar um hunter de teste → hunter indica uma empresa → empresa aceita e indica uma unidade → conferir os 5 itens do Review Focus.
