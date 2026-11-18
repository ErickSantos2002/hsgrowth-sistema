# Número da proposta sincronizado com o GestorHS — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o `proposal_number` de um card de Serviços vindo de OS do GestorHS consulta o GestorHS antes de gravar; recusa ou indisponibilidade bloqueiam o salvamento com o motivo.

**Architecture:** Nova função síncrona `trocar_proposta` em `app/integrations/gestorhs_client.py` (PUT por API key, exceções tipadas). `ServiceBoardService.update_card` chama essa função antes de `repo.update_card` e converte as exceções em `HTTPException` 422/503. O frontend mostra o `detail` no toast e mantém o Resumo em edição.

**Tech Stack:** FastAPI, SQLAlchemy, httpx, pytest (SQLite em memória), React 19 + TS.

**Spec:** `docs/superpowers/specs/2026-11-18-proposta-sincroniza-gestorhs-design.md`

## Global Constraints

- Contrato GestorHS: `PUT {GESTORHS_INBOUND_URL}/integracao/growthhs/caixas/{caixa_id}/proposta`, header `X-API-Key: {GESTORHS_INBOUND_API_KEY}`, body `{"numero": int, "observacao": str}`; 200 → `{"caixa_id", "numero_proposta", "alterada"}`; 404/409/422 com `detail`.
- Só cards com `external_source == "gestorhs.os"` **e** `external_id` preenchido.
- Timeout 10s, sem retry.
- Integração desligada (envs vazias) → não bloqueia, grava, `logger.warning`.
- Número novo nulo/vazio → não chama o GestorHS.
- Admin/gerente/agente **não** pulam a conferência.
- Mensagem de indisponibilidade (texto exato): `Não consegui confirmar o número da proposta com o GestorHS. Tente de novo.`
- Código, mensagens e commits em português; commits sem acento, conventional com escopo (`feat(servico): ...`).
- Testes: `backend/venv/bin/python -m pytest <arquivo>` — não rodar a suíte inteira até o fim.

## Review Focus

- `proposal_number` chegando como string (`"476"`) ou int (`476`) com o mesmo valor do atual → não pode chamar o GestorHS (comparar normalizado para int).
- PUT que manda `business_info` sem mudar o número (ex.: só trocou "Forma de fechamento") → não chama o GestorHS.
- GestorHS devolve 4xx sem JSON ou sem `detail` → 422 com mensagem genérica legível, nunca 500.
- Recusa não pode deixar o card meio gravado: nada de `repo.update_card` antes da chamada (os outros campos do mesmo PUT também não gravam).
- Card de OS sem `external_id`, ou card manual com número → zero chamadas.

---

### Task 1: Cliente `trocar_proposta` no gestorhs_client

**Files:**
- Modify: `backend/app/integrations/gestorhs_client.py`
- Test: `backend/tests/unit/test_gestorhs_client.py` (acrescentar)

**Interfaces:**
- Produces:
  - `class GestorHSRecusou(Exception)` com atributo `detail: str`
  - `class GestorHSIndisponivel(Exception)`
  - `def trocar_proposta(caixa_id: str, numero: int, observacao: str) -> bool` — `True` se enviou e o GestorHS aceitou; `False` se a integração está desligada (no-op com `logger.warning`). Levanta `GestorHSRecusou` em 4xx e `GestorHSIndisponivel` em 5xx/timeout/erro de rede.

- [ ] **Step 1: Testes que falham** (reusar o fixture `ligada`; mockar `httpx.put(url, json, headers, timeout)`):
  - `test_trocar_proposta_desligada_e_noop` → envs vazias, retorna `False`, `httpx.put` não é chamado.
  - `test_trocar_proposta_monta_url_header_e_body` → URL `https://gestorhs.teste/integracao/growthhs/caixas/42/proposta`, `X-API-Key == "chave-secreta"`, `json == {"numero": 476, "observacao": "card #7 · por Ana"}`, `timeout == 10`, retorna `True`.
  - `test_trocar_proposta_422_vira_recusou_com_detail` → resposta 422 `{"detail": "proposta 474 e' do cliente 9..."}` ⇒ `GestorHSRecusou` com `.detail` igual ao texto.
  - `test_trocar_proposta_404_e_409_viram_recusou` (parametrizar 404, 409).
  - `test_trocar_proposta_4xx_sem_json_tem_detail_generico` → 422 com corpo texto ⇒ `.detail == "O GestorHS recusou o número da proposta (HTTP 422)."`.
  - `test_trocar_proposta_5xx_vira_indisponivel` → 500.
  - `test_trocar_proposta_timeout_vira_indisponivel` → `httpx.put` levanta `httpx.TimeoutException("x")`.
  - `test_trocar_proposta_erro_de_rede_vira_indisponivel` → levanta `httpx.ConnectError("x")`.
- [ ] **Step 2:** `backend/venv/bin/python -m pytest tests/unit/test_gestorhs_client.py -v` (de `backend/`) → os novos FALHAM.
- [ ] **Step 3:** Implementar. `detail` vem de `resp.json().get("detail")` quando for `str`; senão o texto genérico. Capturar `httpx.HTTPError` (cobre timeout e rede) → `GestorHSIndisponivel`. Atualizar a docstring do módulo (hoje fala só de Ganho).
- [ ] **Step 4:** Rodar de novo → todos PASSAM (incluindo os antigos de `mover_caixa_ganho`).
- [ ] **Step 5:** Commit `feat(servico): cliente do GestorHS para trocar o numero da proposta da caixa`.

### Task 2: `update_card` confere com o GestorHS antes de gravar

**Files:**
- Modify: `backend/app/services/service_board_service.py` (`update_card`, ~linha 575)
- Test: `backend/tests/unit/test_proposta_sincroniza_gestorhs.py` (novo; copiar o padrão de fixtures de `tests/unit/test_ganho_gatilho.py` — fixture `cenario` com board/lista/usuário, `_card(db, lista, **kw)`)

**Interfaces:**
- Consumes: `gestorhs_client.trocar_proposta`, `GestorHSRecusou`, `GestorHSIndisponivel` (Task 1).
- Produces: comportamento de `ServiceBoardService.update_card(card_id, data, user)`; log_event `proposal_number_changed`.

- [ ] **Step 1: Testes que falham.** Mockar `app.integrations.gestorhs_client.trocar_proposta` com uma lista de chamadas (padrão do fixture `enviados`). Card base: `external_source="gestorhs.os"`, `external_id="1212"`, `business_info={"proposal_number": 474, "closing_type": "pedido"}`.
  - `test_troca_chama_gestorhs_e_grava` → update `business_info={"proposal_number": 476, "closing_type": "pedido"}` ⇒ 1 chamada com `caixa_id="1212"`, `numero=476`, `observacao` contendo `f"card #{card.id}"` e o nome do usuário; card relido tem `476`; existe evento `proposal_number_changed`.
  - `test_recusa_bloqueia_com_422_e_nao_grava` → mock levanta `GestorHSRecusou("proposta 474 e' do cliente 9")` ⇒ `HTTPException` 422 com esse `detail`; card relido segue `474` **e** um `description` mandado no mesmo update também não gravou.
  - `test_indisponivel_bloqueia_com_503` → mock levanta `GestorHSIndisponivel` ⇒ 503 com o texto exato das Global Constraints; card não muda.
  - `test_integracao_desligada_grava_sem_bloquear` → mock retorna `False` ⇒ grava `476`, sem exceção.
  - `test_mesmo_numero_string_nao_chama` → atual `474`, novo `"474"` ⇒ 0 chamadas.
  - `test_outros_campos_do_resumo_nao_chamam` → muda só `closing_type` ⇒ 0 chamadas.
  - `test_numero_apagado_nao_chama` → novo `None` ⇒ 0 chamadas, grava `None`.
  - `test_card_manual_nao_chama` → `external_source=None` ⇒ 0 chamadas, grava.
  - `test_card_os_sem_external_id_nao_chama` → `external_id=None` ⇒ 0 chamadas.
- [ ] **Step 2:** `backend/venv/bin/python -m pytest tests/unit/test_proposta_sincroniza_gestorhs.py -v` → FALHAM.
- [ ] **Step 3:** Implementar um método privado `_sincronizar_proposta_gestorhs(card, data, user) -> Optional[tuple[Optional[int], int]]` chamado no início de `update_card`, **antes** de `repo.update_card`. Ele normaliza o número antigo e o novo com `int()` (valor inválido conta como nulo), retorna `(antigo, novo)` quando sincronizou e `None` quando não se aplica. A observação segue o padrão do Ganho: `f"card #{card.id} · por {user.name or user.email}"`. Depois de gravar, se o retorno não for `None`, chamar `log_event(card_id, user, "proposal_number_changed", f"Número da proposta alterado de #{antigo} para #{novo} — GestorHS atualizado")`. Quando o número antigo é nulo, o texto usa `(nenhum)`. Quando a integração está desligada, o texto termina em `— GestorHS não avisado (integração desligada)`.
- [ ] **Step 4:** Rodar de novo → PASSAM; rodar também `tests/unit/test_ganho_gatilho.py tests/unit/test_ganho_trava_proposta.py` → PASSAM.
- [ ] **Step 5:** Commit `feat(servico): troca do numero da proposta confere com o GestorHS antes de gravar`.

### Task 3: Frontend mostra o motivo e mantém o Resumo em edição + CHANGELOG

**Files:**
- Modify: `frontend/src/pages/ServiceCardDetails.tsx` — `handleSaveBiz` (~linha 119) e o `onUpdate` do `ServiceSummarySection` (~linha 1361)
- Modify: `CHANGELOG.md` (seção "Não lançado")

**Interfaces:**
- Consumes: resposta 422/503 do `PUT /service-boards/{b}/cards/{c}` com `detail: string`.

- [ ] **Step 1:** Hoje o `onUpdate` faz `await updateCard(d); showSuccess(...)` sem `catch`. Com erro, a Promise rejeita, o `handleSaveBiz` não chega ao `setEditingBiz(false)` e nenhum toast aparece. Tratar no `handleSaveBiz`: em `try/catch`, no erro chamar `showError(e?.response?.data?.detail || "Erro ao salvar o resumo")` e **não** sair da edição (o `biz` digitado permanece). Se `showError` não estiver acessível dentro de `ServiceSummarySection`, tratar no wrapper do `onUpdate` e relançar o erro, para o `handleSaveBiz` manter a edição.
- [ ] **Step 2:** `cd frontend && npm run type-check && npm run lint` → sem erros novos.
- [ ] **Step 3:** Entrada no `CHANGELOG.md` em "Não lançado" / Adicionado: troca do número da proposta no card de Serviços (de OS) confere com o GestorHS e corrige a caixa; recusa bloqueia com o motivo. Anotar a dependência: precisa da rota `PUT /integracao/growthhs/caixas/{id}/proposta` no GestorHS em produção antes do deploy.
- [ ] **Step 4:** Commit `feat(servico): motivo da recusa do GestorHS no resumo do card de servicos`.
