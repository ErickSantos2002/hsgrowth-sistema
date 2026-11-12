# Integração MarketingHS → GrowthHS (cards comerciais)

**Para quem:** a sessão do MarketingHS (o chamador).
**Data:** 22/10/2026
**Resposta a:** `MarketingHS/docs/contratos/2026-09-02-endpoint-card-comercial-growthhs.md`

## Decisão

O GrowthHS **não vai ganhar** o `POST /api/v1/integration/cards` por enquanto. Já existe
uma automação externa criando cards inbound no funil comercial, e ela usa a API normal
do CRM. O MarketingHS deve criar o card **pelo mesmo caminho**:

```
POST /api/v1/auth/client-credentials → token (client_id/secret da tela de Configurações)
GET  /api/v1/persons?search → acha a pessoa pelo e-mail (opcional, mas recomendado)
POST /api/v1/persons        → cria a pessoa se não achou
POST /api/v1/cards          → cria o card na lista de entrada
```

Valores concretos (client, lista, origem) na §7.

---

## 1. Autenticação — client credentials (integration client)

Sem login de usuário nem senha. O MarketingHS recebe um **integration client** do CRM:
`client_id` + `client_secret`, **fixos e sem expiração**. Os dois entram pela tela
**Configurações → GrowthHS** do MarketingHS (o secret em `integration_secrets`, como o
contrato já previa para a chave) — nunca no `.env` nem no código.

⚠️ **A tela e o `crm/growthhs.py` atuais foram feitos para o contrato antigo** (campo
`api_key` → `X-API-Key` em `/integration/cards`, e `board_id`). Precisam mudar para:
`client_id` + `client_secret` no lugar de `api_key`; `list_id` (22) no lugar de
`board_id`; fluxo `client-credentials` → pessoa (§2) → `POST /cards` (§3); e o "Testar"
chamando `client-credentials` em vez de `/health`.

Para chamar a API, troca as credenciais por um token:

```
POST {base}/api/v1/auth/client-credentials
Content-Type: application/json

{ "client_id": "hsg_...", "client_secret": "...", "grant_type": "client_credentials" }
```

Resposta: `access_token` (8h) e `expires_in` (segundos). Toda chamada seguinte leva
`Authorization: Bearer <access_token>`.

- **Renovação:** não usar refresh. Guardar o token em memória; quando expirar ou a API
  responder **401**, chamar `client-credentials` de novo e repetir a chamada **uma vez**.
  Se o próprio `client-credentials` der 401, as credenciais estão erradas ou o client foi
  desativado — pausar a fila e alertar (é configuração, não se re-tenta).
- O token age como o **usuário de impersonação** do client (`impersonate_user_id`), que é
  o usuário de integração (`is_integracao = true`). É isso que faz o card ser tratado como
  "lead que chegou sozinho": o vendedor recebe **"Novo lead do site"** e o card fica com
  `created_by_id` = esse usuário.
- **Revogar:** um admin desativa o client no CRM e o token para de valer **na hora** (o CRM
  confere se o client está ativo a cada request).
- **"Testar conexão"** (pedido (c) do contrato): basta chamar `client-credentials`. 200 com
  token = credencial válida.

## 2. Pessoa de contato

`POST /cards` **não aceita contato inline** — recebe `person_id`. E o CRM exige que a
pessoa tenha e-mail **ou** telefone, senão o card dá 422.

`POST /api/v1/persons` recusa (400) e-mail que já existe no sistema. Então:

1. `GET /api/v1/persons?search=<email>` → se vier alguém com o mesmo e-mail, usar o `id`.
2. Senão, `POST /api/v1/persons`:

```json
{
  "name": "Carla Menezes",
  "email": "carla@transportadora.com.br",
  "phone": "+5581999999999",
  "phone_whatsapp": "+5581999999999",
  "position": "Gerente de SESMT"
}
```

Não mandar `organization_id` (ver §5, empresa).

## 3. O card

```
POST {base}/api/v1/cards
Authorization: Bearer <access_token>
```

```json
{
  "list_id": 22,
  "title": "Carla Menezes — Transportadora XYZ",
  "description": "Empresa: Transportadora XYZ\nFaturamento: Entre 100k e 500k/mes\nFuncionários: 11-50 funcionarios\nLead score: 60\nCampanha: black-friday\nDesafios: controle de jornada\n...",
  "person_id": 1180,

  "origin": "Landing Page phoebus-prova",
  "acquisition_channel": "Inbound",
  "utm_source": "google",
  "utm_campaign": "black-friday",
  "utm_term": "controle de jornada",
  "utm_params": "utm_source=google&utm_medium=cpc&utm_campaign=black-friday",
  "gclid": null
}
```

Resposta **201** com o card (`id`, `list_id`, ...). Gravar `id` como `growthhs_card_id`
e o `person_id` usado como `growthhs_person_id`.

Diferenças em relação ao contrato do MarketingHS:

| Contrato MarketingHS | Aqui |
|---|---|
| `board_id` + `list_id: null` → etapa de entrada | **`list_id` obrigatório: `22`** ("Lead Novo", board 6 Prospecção — a mesma da automação atual). Deixar configurável. |
| `origin` = "Tráfego pago" / "Orgânico" | **`Landing Page <slug>`** (ver abaixo). Pago × orgânico já está nos UTMs. |
| `contact {...}` inline | `person_id` (§2) |
| `business_info {...}` | Não existe no card comercial. Escrever faturamento, funcionários, score, etiqueta e empresa na `description`. |
| `custom_fields`, `conversion`, `consent` | Não existem. **Não dá 422** — o schema ignora chaves extras. Se quiser que o vendedor veja, ir para a `description`. |
| `source` / `external_id` | Não existem no card comercial (ver §6, idempotência). |
| `gclid` | Existe (desde 21/10). Mandar se tiver. |

Campos de texto: `origin` até 200 caracteres no banco, UTMs até 200, `gclid` até 500,
`acquisition_channel` até 100, `title` até 500.

**`origin` = `Landing Page <slug>`** — decisão do Erick (22/10), para seguir o padrão
que a automação atual já grava (hoje há `Landing Page Phoebus Lovable 01`,
`Contato pelo Site`, `Captura pelo site [PHOEBUS]`...). O `<slug>` é o
`conversion.page_slug`. O GrowthHS não valida nem normaliza `origin` (texto livre, até
200 caracteres). **Não** mandar "Tráfego pago" / "Orgânico": essa distinção já chega
pelos UTMs. Conversão por formulário de outro site (sem `page_slug`) não tem padrão
definido ainda — combinar com o Erick antes de ligar.

`acquisition_channel` = **`Inbound`**, sempre (é o único valor que a automação atual usa).

**Permissão de lista:** o usuário de integração do MarketingHS (`integracao2`) é
`manager`, então pode criar em qualquer lista. (Usuário sem `admin`/`manager` só
conseguiria na lista 22; em outra, 403.)

O que o `POST /cards` dispara sozinho (não precisa fazer nada): automações `card_created`
do board, histórico de lista, data de entrada no board, notificação ao vendedor/SDR e
gamificação. É o `CardService` — o card nasce "conhecido" pelo sistema.

### Erros

| Código | Quando |
|---|---|
| 401 | token ausente ou expirado → pedir token novo em `client-credentials` e repetir **uma vez** |
| 403 | usuário sem permissão naquela lista (ver acima), ou role `viewer` |
| 404 | `list_id` ou `person_id` não existe |
| 422 | corpo inválido; ou pessoa sem e-mail/telefone |
| 5xx / timeout | GrowthHS fora → re-tentar, **com o cuidado do §6** |

## 4. A volta (reunião agendada / venda fechada)

**Não existe chamada pronta do GrowthHS para `/publico/evento-de-contato`.** O que existe
é a automação de board com ação **"send_webhook"**, configurada pela tela de Automações
(gatilhos `card_moved`, `card_won`, etc.). Ela manda um `POST` **com formato fixo**:

```
Content-Type: application/json
X-HSGrowth-Event: card.list_changed
X-HSGrowth-Signature: sha256=<HMAC-SHA256 do corpo>   (só se houver secret)
```

```json
{
  "event": "card.list_changed",
  "timestamp": "2026-10-22T13:00:00Z",
  "card": {
    "id": 4821, "title": "...", "description": "...", "value": null,
    "list_id": 12, "list_name": "Reunião Agendada", "board_id": 6,
    "origin": "...", "utm_campaign": "...", "utm_source": "...", "utm_term": "...", "gclid": null,
    "client": { "id": ..., "name": ..., "document": ..., "email": ..., "phone": ... },
    "person": { "id": 1180, "name": "...", "email": "carla@...", "phone": "...",
                "phone_whatsapp": "...", "phone_commercial": "..." },
    "assigned_to": { "id": ..., "name": "..." }
  }
}
```

Não manda `Authorization: Bearer`, não manda `source_app`/`event_type`, e **não manda o
`external_id`/`lead_id`** (o card comercial não guarda). Portanto não casa direto com o
`/publico/evento-de-contato`. Opções, sem mexer no GrowthHS:

- **(recomendada)** O MarketingHS expõe um receptor para esse formato (ex.:
  `/api/publico/growthhs/webhook`), valida o `X-HSGrowth-Signature` com um secret
  combinado, e traduz: acha o lead por `card.id` (o `growthhs_card_id` gravado) ou
  `card.person.email`; o `event_type` sai de qual automação chamou (uma URL por evento,
  ex. `?evento=meeting_scheduled` e `?evento=deal_won`, já que o corpo é igual).
- Ou um passo intermediário na mesma ferramenta da automação atual (n8n) traduzindo.

Automações a cadastrar no GrowthHS (pelo Erick, na tela):
- **Reunião agendada:** gatilho `card_moved` para a lista "Reunião Agendada" (id 28,
  board 7 Aquisição) → `send_webhook` → `...?evento=meeting_scheduled`. Já existe uma
  automação "Webhook - Reunião agendada" nesse molde; dá para duplicar.
- **Venda fechada:** gatilho `card_won` → `send_webhook` → `...?evento=deal_won`.

Atenção: a automação é disparada para **todo** card que fizer o movimento, não só os do
MarketingHS. O receptor tem de responder **2xx** (ex.: `200 {"ignorado": true}`) para
card que não conhece — **404 também conta como falha** (o GrowthHS faz
`raise_for_status`, qualquer 4xx/5xx). E a automação se desliga sozinha depois de 5
falhas seguidas (§8.5).

## 5. Empresa (cliente)

O card comercial aceita `client_id`, mas o CRM **exige** que a empresa tenha **Setor** e
**Tipo de Relacionamento** preenchidos, senão 422. O formulário de marketing não tem
esses dados. **Não mandar `client_id`**; o nome da empresa vai no título e na descrição,
e o vendedor vincula a empresa depois.

## 6. Idempotência — o buraco continua aberto

`cards` não tem `(external_source, external_id)` e o `POST /cards` **não é idempotente**.
Um retry depois de timeout em que o card foi criado gera **card duplicado**. Sem mudança
no GrowthHS, a defesa é toda do MarketingHS:

- Gravar o `growthhs_card_id` na mesma transação em que marca o handoff entregue.
- **Antes de re-tentar após timeout/5xx**, não reenviar às cegas: tratar como
  "estado desconhecido" e conferir se o card já nasceu: achar a pessoa (§2) e listar os
  cards dela com `GET /api/v1/cards?board_id=6&person_id=<id>&created_at_from=<envio>`
  (detalhes em §8.2). Se não der para decidir, pausar o item e deixar para revisão
  manual em vez de duplicar.
- Um worker por vez na fila (sem duas execuções concorrentes).

Se a duplicidade aparecer na prática, o caminho do contrato original (coluna + restrição
única em `cards` + rota `/integration/cards` create-or-return) continua válido e é
trabalho do lado do GrowthHS.

## 7. Configuração

| Item | Valor |
|---|---|
| URL base da API do GrowthHS | ver §8.6 |
| Integration client | **"MarketingHS"**, id 6, `client_id` `hsg_l0ABU9uXVqFq3OhwM-OlS7bbvsRxukYA` (criado em 22/10; o id 5, duplicado, foi desativado) |
| `client_secret` | só com o Erick — ele cola na tela Configurações → GrowthHS |
| Usuário de impersonação | `integracao2` (id 28), role `manager`, `is_integracao = true` — separado do usuário da automação atual (`integracao`, id 7), para cada card dizer de onde veio |
| `list_id` de entrada | `22` ("Lead Novo", Prospecção) |
| `origin` | `Landing Page <slug>` |
| `acquisition_channel` | `Inbound` |
| Secret do webhook de volta | a combinar, se for usar assinatura (§4) |

Os pedidos (a) mover card e (b) aviso de exclusão do contrato ficam sem rota nova; o (c)
`whoami` é resolvido pelo próprio `client-credentials` (§1).

---

## 8. Respostas às perguntas do MarketingHS (22/10)

### 8.1 Teste sem incomodar o comercial

Não existe board/lista de teste no CRM de produção (só há os boards 6 Prospecção e 7
Aquisição). Duas saídas, em ordem de preferência:

**(a) Homologação — o ambiente certo para a prova interna.** Existe um GrowthHS de
homologação no Easypanel (projeto `erick-homo`), com **banco próprio**
(`erick-homo_hsgrowth-banco`), JWT secret próprio e integrações externas vazias:

| | |
|---|---|
| Externo | `https://homo-growthhsapi.healthsafetytech.com` |
| Interno | `http://erick-homo_hsgrowth-api:8000` |

O banco de homologação é outro (cópia da produção): o client de produção **não vale**
lá. Provisionado em 22/10:

| Homologação | Valor |
|---|---|
| Integration client | **"MarketingHS"**, id 5, `client_id` `hsg_mZ3jNvyyzALxdah6SKuPNsl-4fS7wdYk` (secret com o Erick) |
| Usuário de impersonação | `integracao2` (id 28), `manager`, `is_integracao = true` |
| `list_id` de entrada | `22` ("Lead Novo") — mesmos ids de produção: 26 Agendado, 28 Reunião Agendada, 32 Negócio Ganho |
| Automações | iguais às de produção; a 16 (webhook para o n8n) está **desligada** em homologação, a 14 (distribuição) só pega o usuário 7 — card do `integracao2` nasce sem vendedor |

As automações da volta (§8.4) precisam ser criadas **também** em homologação, apontando
para o receptor do MarketingHS de homologação.

**(b) Produção, lista 22, antes de ligar a distribuição.** Hoje o card criado pelo
`integracao2` na lista 22 **não notifica ninguém**: a notificação sai quando o card
ganha vendedor, e a distribuição automática (automação 14, "Atribuir Vendedor -
Automatico") só roda para cards criados pelo usuário **7** (`triggered_by_user_id: 7`).
Card do MarketingHS (usuário 28) nasce sem dono e sem aviso. Mas **aparece no kanban
"Lead Novo"**, visível para o time — usar título `[TESTE] ...` e apagar depois
(`DELETE /api/v1/cards/{id}`; o `integracao2` é manager, pode).

⚠️ Consequência para ligar de verdade: **enquanto a automação 14 não incluir o usuário
28, os leads do MarketingHS ficam sem vendedor.** A condição aceita um usuário só; o
Erick duplica a automação 14 com `triggered_by_user_id: 28` quando for virar a chave
(é esse o "interruptor" entre teste e produção).

### 8.2 Listar cards de uma pessoa (duplicidade)

```
GET /api/v1/cards?board_id=6&person_id=<id>&created_at_from=<ISO 8601>&page_size=100
```

- `board_id` é **obrigatório**. O card criado na 22 pode já ter ido para o board 7
  (§8.4) — conferir `board_id=6` **e** `board_id=7`.
- Outros filtros: `created_at_to`, `assigned_to_id`, `is_won`, `is_lost`,
  `page` / `page_size` (máx. 100). Não há filtro por `created_by`.
- Resposta:
  ```json
  { "cards": [ { "id": 12825, "title": "...", "list_id": 22, "person_id": 1180,
                 "created_at": "...", "origin": "...", ... } ],
    "total": 1, "page": 1, "page_size": 100, "total_pages": 1 }
  ```
- O `integracao2` é manager, então vê todos os cards (vendedor/SDR veriam só os seus).

### 8.3 Pessoas — busca, unicidade e telefone

- **`GET /api/v1/persons?search=<termo>`**: busca **parcial** e sem diferenciar
  maiúsculas (`ILIKE '%termo%'`) em nome, primeiro/último nome, `email`,
  `email_commercial`, `email_personal`, `phone`, `phone_commercial`, `phone_whatsapp` e
  cargo. Como é parcial, **conferir o e-mail exato no resultado** antes de reaproveitar
  (buscar `ana@x.com` também traz `joana@x.com`).
- Telefone: a busca compara o texto **como foi gravado** — sem normalização. Buscar
  `+5581999999999` não acha `(81) 99999-9999`. Os cadastros antigos estão em formatos
  variados; busca por telefone é pouco confiável, priorizar e-mail.
- Resposta: `{ "persons": [ {PersonResponse...} ], "total", "page", "page_size",
  "total_pages" }`, ordenada por nome; `page_size` padrão 50. `PersonResponse` traz `id`,
  `name`, `email*`, `phone*`, `position`, `organization_id`, `created_at`, `updated_at`.
- **`POST /persons`**: recusa (**400**) e-mail que já exista em qualquer um dos campos
  `email`, `email_commercial`, `email_personal`, `email_alternative` (comparação em
  minúsculas). **Telefone não tem unicidade** — repetido passa.
- Formato de telefone: **texto livre**, até 50 caracteres, sem validação. E.164
  (`+5581999999999`) é aceito. Recomendado mandar em `phone` e `phone_whatsapp`.
- E-mail é validado (`EmailStr`): e-mail malformado → 422.

### 8.4 Como o card vai do board 6 para o 7

É o **mesmo card** (mesmo `id`), movido — não é clone. O caminho real (confirmado no
histórico dos cards de hoje):

```
board 6: Lead Novo (22) → Prospecção → Conectado → Agendado (26)
         └─ automação 13 "Movimentação Agendado > Reunião Agendada" (board 6, card_moved
            para a lista 26) move o card para o board 7, lista 28
board 7: Reunião Agendada (28) → Qualificação → Diagnóstico e Proposta → Negócio Ganho (32)
```

O movimento feito pela automação **dispara `card_moved` no board de destino**, então as
automações da volta vão **no board 7**, as duas:

- **Reunião agendada:** board 7, `card_moved`, condição `to_list_id: 28` →
  `send_webhook` → `...?evento=meeting_scheduled`. (É exatamente o molde da automação 16
  "Webhook - Reunião agendada", que já funciona assim para o n8n.)
- **Venda fechada:** board 7, `card_won` (sem condição) → `send_webhook` →
  `...?evento=deal_won`. Só o board 7 tem lista de ganho.

Detalhe: um card pode voltar ao board 6 (No Show → lista 25) e reagendar, passando de
novo pela 28 — o `meeting_scheduled` chega mais de uma vez. O MarketingHS já trata
repetição (estágio só avança).

### 8.5 Webhook de volta — secret, falhas, retry, timeout

- **Secret: por automação.** Campo "Secret (opcional)" no nó de webhook do editor de
  automações. Com secret, vai `X-HSGrowth-Signature: sha256=<hex>` = HMAC-SHA256 do corpo
  **exato** recebido (JSON compacto, `separators=(",", ":")`, `ensure_ascii=False`) —
  validar sobre os bytes crus, não sobre o JSON re-serializado.
- **Desliga após 5 falhas seguidas** (`auto_disable_on_failures`, padrão 5, configurável
  por automação). Um sucesso zera o contador. Desligada, só volta reativando na tela.
- **Falha = qualquer resposta não-2xx** (inclusive 404), timeout ou erro de rede.
- **Não re-tenta.** Um envio que falha está perdido (fica só no log de execuções).
- **Timeout: 10 s.** E o envio é **síncrono, dentro do movimento do card**: o vendedor que
  arrasta o card espera a resposta. O receptor deve responder rápido (gravar e processar
  depois).

### 8.6 URL base

| | Produção | Homologação |
|---|---|---|
| Externo | `https://growthhsapi.healthsafetytech.com` | `https://homo-growthhsapi.healthsafetytech.com` |
| Interno (rede do Easypanel) | `http://erick_hsgrowth-api:8000` | `http://erick-homo_hsgrowth-api:8000` |

O nome interno segue o padrão `<projeto>_<serviço>` do Easypanel (o mesmo que o próprio
GrowthHS de homologação já usa para chegar no banco, `erick-homo_hsgrowth-banco`). O
MarketingHS de produção está no mesmo projeto `erick`, então o interno é o caminho
natural; conferir com um `curl http://erick_hsgrowth-api:8000/health` de dentro do
container antes de fixar.

Prefixo da API: `/api/v1` (ex.: `http://erick_hsgrowth-api:8000/api/v1/cards`).
