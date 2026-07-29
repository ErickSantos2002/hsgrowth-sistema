# Fase 2 — Ganho no hsgrowth move a caixa no GestorHS

**Data:** 2026-07-29
**Status:** design aprovado, aguardando plano de implementação
**Fase:** 2 de 2 (a fase 1 é o GestorHS criar cards no hsgrowth — já em produção)

---

## 1. Em uma frase

Quando um card do board de Serviços que veio de uma OS do GestorHS é marcado como
"Ganho" no hsgrowth, o hsgrowth chama o GestorHS para mover a caixa correspondente de
Pós-Vendas (fase 6) para Financeiro (fase 10), levando junto o número da proposta.

---

## 2. Contexto

Na fase 1, o GestorHS cria cards no board de Serviços (board 1) do hsgrowth a partir de
uma caixa que saiu do laboratório e entrou em Pós-Vendas. Esses cards têm
`external_source = "gestorhs.os"` e `external_id = str(caixa.id)`.

O pós-vendas trabalha o card no funil do hsgrowth. Quando fecha o negócio (marca
"Ganho"), a caixa no GestorHS precisa avançar de Pós-Vendas para Financeiro — hoje isso é
feito à mão. Esta fase automatiza esse aviso de volta.

**O lado do GestorHS já está pronto e em produção.** Ele expõe o endpoint inbound,
documentado em `docs/integracao-growthhs-inbound.md` (a versão canônica vive no repo do
GestorHS):

```
POST {GESTORHS_INBOUND_URL}/integracao/growthhs/caixas/{caixa_id}/ganho
X-API-Key: <chave>
{ "observacao": "<texto livre, opcional>", "numero_proposta": <int, opcional> }
```

- `caixa_id` = o `external_id` cru do card (é o `caixa.id`; confirmado: 18 cards
  `gestorhs.os` hoje, todos com `external_id` numérico).
- Move a caixa 6 → 10. **Idempotente**: repetir é seguro (`200 {"movida": false}` se já
  avançou). Só erra se chamado antes da hora (`409`, caixa ainda não chegou em
  Pós-Vendas) ou com `caixa_id` inexistente (`404`).
- `numero_proposta` é o `#N` da proposta na tela de Propostas **do GestorHS** (a proposta
  agora é feita lá, não mais no CRM). Quando enviado, o GestorHS grava na caixa e o expõe
  como link de download do PDF no card do TaskHS — inclusive em no-op.

Este design implementa **o lado do hsgrowth**: o gatilho, o campo do número da proposta,
a trava, o cliente HTTP e o retroativo.

---

## 3. Escopo

**Só dispara para `external_source == "gestorhs.os"` (board 1, Serviços).**

Os cards de Cobrança (board 2, `gestorhs.calibracao` / `gestorhs.atrasados`) também geram
"Ganho", mas não correspondem a uma caixa em Pós-Vendas — chamar o endpoint para eles
daria `409` ou moveria a caixa errada. Ficam de fora.

Cards criados por humanos (sem `external_source`) também ficam de fora — não têm caixa no
GestorHS.

---

## 4. Componentes

### 4.1 Campo "Número da proposta" (frontend)

Novo campo no **Resumo do card** (`frontend/src/pages/ServiceCardDetails.tsx`), guardado
em `business_info.proposal_number` como **inteiro**.

- Aparece só no board 1 (Serviços) — é onde há proposta de OS. (Segue o padrão de
  `collection_type`, que só aparece no board 2.)
- Input numérico; o valor digitado é o `#N` da proposta do GestorHS.
- Tipado em `ServiceBusinessInfo` (`serviceBoardService.ts`): `proposal_number?: number | null`.

### 4.2 Trava de avanço (backend)

Em `_validate_advance` (`service_board_service.py`), no caminho de Ganho do board 1: sem
`business_info.proposal_number` preenchido (inteiro > 0), acrescenta à lista de
pendências "Número da proposta preenchido no Resumo". Junto das travas que já existem
(anexar proposta/OC, etc.).

Admin e Manager continuam passando livres das travas, como hoje
(`is_privileged` em `move_card`).

### 4.3 Cliente HTTP outbound para o GestorHS (novo)

Novo módulo `app/integrations/gestorhs_client.py` (não existe cliente outbound para o
GestorHS ainda — o único ponto GestorHS hoje é o endpoint inbound da fase 1).

- Função `mover_caixa_ganho(caixa_id: str, numero_proposta: int | None, observacao: str) -> None`.
- `httpx.Client(timeout=10)`, `POST` no endpoint inbound, header `X-API-Key`.
- Gating por env, no padrão do webhook de Vendas (`_send_automacao01_webhook`): se
  `GESTORHS_INBOUND_URL` ou `GESTORHS_INBOUND_API_KEY` vazias → no-op (loga e retorna),
  integração desligada.
- `numero_proposta` só entra no corpo quando não-nulo (o contrato o trata como opcional).
- Levanta em erro HTTP/rede (`raise_for_status`) — quem trata o retry é a task Celery.

### 4.4 Gatilho: task Celery (backend)

Nova task em `app/workers/tasks.py`, no padrão das existentes:

```python
@celery_app.task(name="notificar_ganho_gestorhs", bind=True, max_retries=3)
def notificar_ganho_gestorhs(self, caixa_id, numero_proposta, observacao):
    try:
        gestorhs_client.mover_caixa_ganho(caixa_id, numero_proposta, observacao)
    except Exception as e:
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
```

Enfileirada em `move_card` (`service_board_service.py`), dentro do bloco que já dispara
`log_event("card_won")`, **apenas** quando `card.external_source == "gestorhs.os"` e
`card.external_id` está preenchido. O enfileiramento é best-effort (try/except em volta do
`.delay(...)`): se o broker estiver fora, o card ainda vira Ganho.

A `observacao` é montada no gatilho: `"Ganho no GrowthHS — card #{id} · R$ {valor} · por {usuário}"`.
O valor vem de `deal_value_by_card`.

**Por que Celery e não síncrono:** não bloqueia o vendedor, e o retry cobre o cenário
mais provável de falha (GestorHS temporariamente fora). A idempotência do endpoint torna
o retry seguro. O worker Celery já roda em produção (processa automações, e-mails,
notificações).

### 4.5 Configuração (env)

Duas envs novas em `app/core/config.py`, ambas default `""`:

- `GESTORHS_INBOUND_URL` — base URL da API do GestorHS.
- `GESTORHS_INBOUND_API_KEY` — a chave combinada fora de banda.

Vazias = integração desligada (o cliente vira no-op). **Nasce desligada**; liga-se
configurando as duas no ambiente.

### 4.6 Retroativo (script)

`scripts/retroagir_ganho_gestorhs.py`, simulação por padrão (`--aplicar` para valer),
mesmo padrão dos retroativos anteriores.

- Percorre os cards `gestorhs.os` que estão em lista de Ganho (`is_done_stage` ou nome
  "ganho") e não deletados.
- Para cada um, chama `mover_caixa_ganho` com o `external_id`, o `proposal_number` (se o
  card tiver) e uma observação de retroação.
- Idempotente: os que já foram movidos voltam `200 {"movida": false}`.
- `numero_proposta`: se o card tiver `business_info.proposal_number`, usa esse; senão
  usa **`2`** — uma proposta interna do GestorHS usada como referência de teste para os
  cards antigos, que deram Ganho antes do campo existir. Hoje são ~3 cards
  (1387, 1410, 1411). O `2` é uma constante do script (`PROPOSTA_RETROATIVO_PADRAO = 2`),
  fácil de trocar.
- Roda síncrono (não via Celery) — é operação única e manual, com dry-run e conferência.

---

## 5. Fluxo de dados (caminho feliz)

1. Vendedor preenche "Número da proposta" no Resumo do card (board 1).
2. Vendedor move o card para "Negócio Ganho".
3. `move_card` valida a trava (número presente), grava `card_won`, e enfileira
   `notificar_ganho_gestorhs(external_id, proposal_number, observacao)`.
4. A task chama `POST /integracao/growthhs/caixas/{external_id}/ganho` com o número.
5. GestorHS move a caixa 6 → 10 e grava o número da proposta (link do PDF no TaskHS).
6. Falha de rede/GestorHS → a task tenta de novo (3x, backoff). Se esgotar, o card
   permanece Ganho e a falha fica registrada; o retroativo ou uma nova tentativa manual
   reconciliam (é idempotente).

---

## 6. Tratamento de erro

- **Enfileirar nunca quebra o Ganho.** O `.delay(...)` é envolto em try/except.
- **A chamada HTTP é best-effort com retry** (Celery, 3x, backoff exponencial).
- **Idempotência ponta a ponta:** reenviar o mesmo `caixa_id` é seguro; o GestorHS não
  duplica histórico.
- **Integração desligada** (envs vazias) → cliente é no-op silencioso; útil em
  homologação e antes de ligar em produção.

---

## 7. Testes

- **Trava:** mover para Ganho sem `proposal_number` no board 1 → 400 com a pendência;
  com o número → passa. Admin/manager passam sem o número.
- **Gatilho:** Ganho de card `gestorhs.os` enfileira a task com o `external_id` e o
  número certos; Ganho de card de Cobrança ou de card humano **não** enfileira.
- **Cliente:** monta o corpo certo (com e sem `numero_proposta`); envs vazias → no-op;
  header `X-API-Key` presente.
- **Best-effort:** falha no enfileiramento não impede o `card_won`.
- **Retroativo:** simulação lista os cards em Ganho; envia número quando presente, sem
  quando ausente.

O gating por env e o padrão best-effort seguem o webhook de Vendas
(`_send_automacao01_webhook`), que já tem esse comportamento testado.

---

## 8. Fora de escopo

- **Sincronização reversa contínua.** Isto é um aviso pontual no Ganho, não um espelho.
  Mudanças posteriores no card não reenviam nada.
- **Cards de Cobrança** (board 2) — outro fluxo, sem caixa em Pós-Vendas.
- **Reconciliação automática de falhas** além do retry do Celery. Se uma chamada esgotar
  as tentativas, a correção é rodar o retroativo (ou o vendedor reabrir/re-mover) — não há
  fila de outbox persistente. Aceitável pelo baixo volume e pela idempotência.
- **Descobrir o número da proposta automaticamente.** O vendedor digita; o CRM não tem
  mais o dado da proposta (feita no GestorHS).

---

## 9. Decisões e trade-offs

- **Número obrigatório para Ganho** (trava) em vez de opcional: garante que todo Ganho
  novo leve o número. O custo é um passo a mais para o vendedor. O contrato do GestorHS,
  porém, trata `numero_proposta` como **opcional** — de propósito, para o retroativo dos
  cards antigos (que não têm o campo) poder chamar sem número.
- **Celery** em vez de síncrono ou BackgroundTasks: não bloqueia o vendedor e tem retry.
  Custo: depende do worker rodar (já roda).
- **`external_id` cru como `caixa_id`**, sem interpretar: o GestorHS garante que o valor
  que ele gravou no card é o `caixa.id` que o inbound espera. O hsgrowth não precisa saber
  o que o número significa.
- **Cliente outbound novo e isolado** (`gestorhs_client.py`) em vez de reusar o webhook de
  Vendas: contrato e auth diferentes; manter separado deixa cada um com uma
  responsabilidade.
