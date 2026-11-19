# Trocar o número da proposta no CRM sincroniza a caixa do GestorHS

## Por que

O número da proposta é digitado à mão no card de Serviços (`business_info.proposal_number`)
e vai para a caixa do GestorHS no Ganho. Erro de digitação faz a caixa apontar para a
proposta errada (caixa 1212: #474 no lugar de #476). O GestorHS ganhou em 13/11/2026 o
`PUT /caixas/{id}/proposta` (v1.65.0) para corrigir pela tela, mas para o setor de Serviços
é muito mais fácil corrigir no CRM. A correção no CRM tem que chegar ao GestorHS — e o CRM
nunca pode ficar com um número que o GestorHS recusaria.

## O que

Num card de Serviços com `external_source == "gestorhs.os"`, quando o `proposal_number`
muda (em **qualquer etapa**, antes ou depois do Ganho), o CRM chama o GestorHS **antes de
gravar**:

- GestorHS aceita → o CRM grava normalmente.
- GestorHS recusa (proposta inexistente, de outro cliente, desabilitada, caixa fora da
  janela de fase) → **o salvamento é bloqueado**, o card fica como estava e o usuário vê o
  motivo que o GestorHS devolveu.
- GestorHS fora do ar / timeout → **também bloqueia**: "Não consegui confirmar o número da
  proposta com o GestorHS. Tente de novo."

O formulário do Resumo salva tudo junto, então a recusa segura também os outros campos
editados naquele salvamento — o usuário corrige o número e salva de novo.

## Fora do escopo / não muda

- Cards que não vieram de OS (`external_source` diferente ou sem `external_id`): nada muda.
- Cobrança (board 2): não tem número da proposta.
- Aviso de Ganho (`enviar_ganho_gestorhs`) continua igual, em background.
- Não desfaz faturamento da proposta anterior no GestorHS.

## Abordagens

1. **Validar dentro do salvamento do card (escolhida).** `update_card` chama o GestorHS
   síncrono antes de gravar; GestorHS ganha uma rota por API key irmã do Ganho. Sem tela
   nova no CRM.
2. Botão "Trocar proposta" separado no CRM: não seguraria os outros campos, mas cria uma
   segunda forma de editar o mesmo número e exige travar o campo do Resumo. Mais tela para
   pouco ganho.
3. Consulta prévia + gravação: duas idas ao GestorHS e a caixa pode mudar de fase entre
   elas. Sem vantagem sobre a 1.

## Lado GestorHS (entregar para uma sessão no repo GestorHS)

Rota nova em `backend/app/api/integracao_growthhs.py`, autenticada por
`require_growthhs_inbound` (a mesma API key do Ganho):

```
PUT /integracao/growthhs/caixas/{caixa_id}/proposta
body: {"numero": int, "observacao": str | null}
200 → {"caixa_id": int, "numero_proposta": int, "alterada": bool}
404 caixa ou proposta inexistente · 409 fase fora da janela · 422 trava de cliente
```

- Mesma regra de `PUT /caixas/{id}/proposta` (`trocar_proposta`): janela `wf.ATIVAS`,
  número igual ao atual → 200 com `alterada=false` sem gravar, `conferir_proposta` de
  `core/proposta_caixa.py`, log em cada OS ativa e `agendar_espelhamento_caixa`. Extrair o
  miolo para uma função compartilhada pelas duas rotas em vez de duplicar.
- Log com usuário nulo e texto `Caixa #N: proposta #A -> #B (via GrowthHS)`, mais a
  `observacao` quando vier (o CRM manda "card #id · por <nome>").
- `detail` das recusas em português legível para o usuário final — o CRM mostra o texto
  como veio. (As mensagens atuais de `conferir` citam ids de cliente; aceitável, mas pode
  ganhar nomes se for barato.)
- **Deploy do GestorHS antes do CRM**: sem a rota, todo salvamento de número num card de
  OS dá erro no CRM.

## Lado CRM

- `app/integrations/gestorhs_client.py`: `trocar_proposta(caixa_id, numero, observacao)` —
  `httpx.put` com `X-API-Key`, timeout 10s, sem retry (é síncrono, o usuário está
  esperando).
- `ServiceBoardService.update_card`: antes de `repo.update_card`, se o card é
  `gestorhs.os` com `external_id`, `business_info` está no update e o `proposal_number`
  novo difere do atual e não é nulo → chama o cliente. Resposta 4xx → `HTTPException(422,
  detail=<detail do GestorHS>)`. Erro de rede/timeout/5xx → `HTTPException(503, detail=
  "Não consegui confirmar...")`. Sucesso → grava e registra `log_event`
  `proposal_number_changed` ("Número da proposta alterado de #A para #B — GestorHS
  atualizado").
- Frontend: o erro já chega pelo fluxo de `updateCard`; garantir que o `detail` aparece no
  toast e que o formulário do Resumo não sai do modo de edição (o usuário não perde o que
  digitou).

## Decisões minhas (o Erick pode vetar)

- **Integração desligada** (envs `GESTORHS_INBOUND_*` vazias): não bloqueia, grava com
  WARNING no log — mesmo padrão do Ganho. Senão o ambiente local/teste não salva nada.
- **Apagar o número** (vira nulo): não chama o GestorHS; a caixa mantém o último número.
  O Ganho continua exigindo número preenchido.
- Admin/gerente **não** pulam a conferência — a trava é de consistência entre sistemas, não
  de permissão.
- O mesmo caminho vale para o token de agente (Guardi) via PUT do card.
