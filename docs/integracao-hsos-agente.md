# Token de agente do HS.OS (Guardi)

O Guardi é o assistente de cada colaborador e roda no HS.OS. Ele chama o HSGrowth **como a
própria pessoa**, com a função dela, usando um token próprio. Ele não usa o login de
sempre nem o token de integração. Specs no repo HS.OS:
`docs/superpowers/specs/2026-11-12-guardi-hsgrowth-vendas-design.md` e
`…-servicos-design.md`. Plano daqui: `docs/superpowers/plans/2026-11-13-token-agente-hsos.md`.

## Contrato

- **Header:** `Authorization: Bearer <jwt>`. O token é EdDSA (Ed25519) e vale **5 minutos**.
- **Claims:**
  - `iss = "hsos"` e `aud = "hsgrowth"`.
  - `sub` é o **e-mail exato** do usuário, que precisa estar ativo e não apagado.
  - `act.sub` é o bot (ex.: `erick-bot`).
  - `exp` fica no máximo 600 s à frente.
- **Chave:** a env `HSOS_AGENTE_CHAVE_PUBLICA` guarda a PEM pública de
  `GET /agente/chave-publica` do HS.OS, numa linha só com `\n` literal. Sem a env, todo
  token de agente dá 401 e o resto funciona como antes.
- **Sessão:** não há sessão. O token não passa pela blacklist do Redis nem pelo
  `password_changed_at`, e o usuário **não** vira `is_integracao`, para que a trava de CNPJ
  de parceiro continue valendo.
- **Respostas de erro:** qualquer falha de token ou de usuário dá 401 "Token inválido ou
  expirado". Rota fora da allowlist dá 403 "Ação não permitida para o agente". Rota da
  allowlist fora do papel da pessoa dá 403 "Ação não permitida para o seu papel pelo agente".

## Capacidades (tela "Capacidade" do Guardi)

`GET /api/v1/agente/capacidades`, só com token de agente (login normal → 404):

```json
{"papel": "Vendedor", "rotas": [["GET", "/boards"], ["POST", "/card-notes"], ...]}
```

`papel` é o `display_name` da função. `rotas` são os pares (método, template) da allowlist
que o papel alcança, sem `/api/v1`, iguais aos de `ROTAS_AGENTE`. Uma resposta só serve às
duas frentes, e o HS.OS separa Vendas de Serviços pelo catálogo dele. Onde a regra depende
do dado (escrita só em card do dono), a rota entra e o detalhe é conferido na hora. Spec:
`docs/superpowers/specs/2026-11-13-capacidade-do-guardi-design.md` no HS.OS.

### Papéis por rota (`PAPEIS_AGENTE`)

| Grupo | Papéis |
|---|---|
| `/users/me`, `/agente/capacidades` | todos |
| Vendas, leitura | admin, manager, salesperson, sdr, viewer |
| Vendas, escrita (inclui criar/alterar cliente e contato) | admin, manager, salesperson, sdr |
| Cliente, contato e busca geral, leitura | os de Vendas + service |
| Serviços, leitura e escrita | admin, manager, service |

A tabela é a regra: `_usuario_do_agente` a aplica, e `tests/unit/test_capacidades_agente.py`
confere, papel a papel, que ela bate com os `require_*` das rotas. Ela é mais estreita que
as rotas em dois pontos, de propósito: serviço não entra em Vendas pelo agente (a tela
também não deixa), e o visualizador não cria nota nem tarefa (essas rotas não têm
`require_not_viewer`).

## Onde mora

| O quê | Onde |
|---|---|
| Validação, allowlist com papéis e marcação "via" | `backend/app/core/agente.py` (`PAPEIS_AGENTE`, `ROTAS_AGENTE`) |
| Capacidades | `backend/app/api/v1/endpoints/agente.py` |
| Entrada do token | `get_current_user` → `_usuario_do_agente` em `backend/app/api/deps.py` |
| Travas de dono (Vendas) | `exigir_card_do_dono_se_agente` e `exigir_card_aberto_do_dono_se_agente` em `deps.py`, chamadas nos endpoints |
| Testes | `backend/tests/unit/test_token_agente*.py` |

**Rota nova chega ao Guardi só entrando nos DOIS catálogos:** em `PAPEIS_AGENTE` (com os papéis), aqui, e
no do HS.OS. A allowlist casa o caminho que o roteador usou, com todo parâmetro como
`\d+`.

## Regras do agente

**Vendas:**
- Toda escrita só vale em card em que a pessoa é vendedora ou SDR, inclusive para admin
  via agente. Isso cobre campos, nota, tarefa (criar, alterar, concluir, no-show), contato,
  mover, ganho e perda.
- No `PUT /cards/{id}`, o agente leva 403 se mandar `assigned_to_id`, `sdr_id`, `is_won`,
  `is_lost` ou `loss_reason`.
- No `POST /cards/{id}/fields`, só vale com `field_definition_id`. Criar definição de campo
  por nome é recusado.
- No `POST /cards`, o `assigned_to_id` só pode ser o da própria pessoa e `sdr_id` é
  recusado. Admin ou gerente que não mande responsável vira o responsável.
- `PUT /clients/{id}` e `PUT /persons/{id}` só valem para cliente ou contato ligado a um
  card aberto da pessoa.
  - ⚠️ **Limite aceito:** o agente pode ligar um cliente ou contato existente ao card
    dele (`PUT /cards` com `client_id`, `POST /cards/{id}/person`, lead novo) e depois
    editá-lo. É o mesmo alcance que o vendedor já tem na tela, onde edita qualquer cliente.
    A trava limita o Guardi, mas não dá a ele menos poder que a pessoa.

**Serviços:**
- Não há dono no card, então vale a função (`admin`, `manager`, `service`).
- O `PUT` do card recusa `list_id`, `position`, `is_deleted` e `assigned_to_id`.
- O `/move` só aceita lista do mesmo quadro.

**Histórico:**
- `Activity`, `AuditLog` e `ServiceCardActivity` gravadas pelo dono do token ganham
  `" (via <bot>)"` na `description`.
- Exceção: "Motivo da perda: …" fica intacto, porque é lido pelo filtro do kanban e pelo
  dashboard. Nesse caso a marca vai em `activity_metadata.via_agente`.

## Deploy

1. Pôr a env no Easypanel e subir o backend. Não há migration.
2. Avisar o HS.OS. O lado de lá liga as ferramentas depois.
