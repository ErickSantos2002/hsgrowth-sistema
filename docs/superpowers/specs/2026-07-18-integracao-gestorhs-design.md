# Integração GestorHS → hsgrowth (criação de cards de serviço)

**Data:** 2026-07-18
**Status:** design aprovado, aguardando plano de implementação
**Fase:** 1 de 2

---

## 1. Em uma frase

O GestorHS passa a criar cards nos boards de Serviços e Cobrança do hsgrowth
automaticamente, autenticado por uma chave de API fixa e de escopo limitado, com
cada card carregando o identificador da entidade de origem para permitir o retorno
na fase 2.

---

## 2. Contexto

Os dois sistemas são do mesmo dono. O GestorHS gerencia ordens de serviço de
calibração e manutenção de bafômetros; o hsgrowth é o CRM onde o time comercial
trabalha oportunidades em boards kanban.

Hoje a passagem de informação entre os dois é manual: alguém olha o GestorHS e
digita o card no hsgrowth. Isso custa tempo, erra e atrasa.

O GestorHS **já tem uma integração de espelhamento de cards em produção**, com o
TaskHS, documentada em `docs/integration.md` daquele repositório. Este design
reaproveita deliberadamente aquele contrato — mesmo header de autenticação, mesma
ideia de identidade `(source, external_id)`, mesmo padrão de cliente HTTP — para
que o time (e o Claude que for implementar do lado do GestorHS) não precise
aprender um segundo jeito de fazer a mesma coisa.

**O que este design NÃO copia do TaskHS:** a autenticação por env global e a
semântica de upsert. Ambas estão justificadas nas seções 4 e 5.

---

## 3. Os dois gatilhos

São dois fluxos com origens diferentes. Confundi-los é a principal fonte de bug
neste design.

### 3.1 Board de Serviços — origem: Ordem de Serviço

Quando uma OS é **aberta** no GestorHS (fase 4, Recebido), um card nasce no board
de Serviços. O vendedor faz o pós-vendas em paralelo, enquanto o aparelho segue a
jornada física (Recebido → Laboratório → Pós-Vendas).

A fase 6 (Pós-Vendas) da OS só avança quando o vendedor finalizar o card no
hsgrowth — esse é o objeto da fase 2 deste projeto.

### 3.2 Board de Cobrança — origem: Equipamento do Cliente

Quando a calibração de um aparelho está a **50 dias de vencer**, um card nasce no
board de Cobrança para o vendedor cobrar o cliente a enviar o aparelho.

Aqui **não existe OS** — o aparelho sequer foi enviado. A entidade de origem é o
`EquipamentoCliente` do GestorHS, que é quem carrega o campo `prox_calibragem`.

> **Infra nova do lado do GestorHS:** hoje o GestorHS não tem agendador algum (sem
> Celery, sem APScheduler, sem cron — apenas `BackgroundTasks` e o script manual
> `app/scripts/sincronizar_taskhs.py`). A varredura dos 50 dias precisa de um job
> diário novo. Ele pode ser deliberadamente burro — "todo aparelho com
> `prox_calibragem` em ≤ 50 dias, dispare" — porque a criação é idempotente
> (seção 5) e reprocessar não duplica.

---

## 4. Semântica: handoff, não espelho

No TaskHS o GestorHS é dono da verdade e reenvia o estado completo a cada mudança;
o upsert sobrescreve, e isso está correto lá.

**Aqui é o oposto.** Depois que o card nasce, quem manda é o vendedor no hsgrowth.
Um upsert vindo do GestorHS atropelaria o trabalho dele: devolveria o card para a
etapa de entrada, sobrescreveria o título, apagaria edições.

### Decisão: create-or-return

- `(source, external_id)` **não existe** → cria o card, responde `201`.
- `(source, external_id)` **já existe** → **não altera nada**, responde `200` com o
  card existente.

Isso dá idempotência (retry de rede é no-op seguro, cobrança não duplica) sem
sacrificar a autonomia do vendedor. É a mesma proteção do upsert com a semântica
invertida.

Consequência aceita: se um dado da OS mudar no GestorHS depois da criação, o card
**não** é atualizado. Isso é intencional. Se no futuro isso incomodar, a solução é
um endpoint separado e explícito de enriquecimento — não transformar este em upsert.

---

## 5. Identidade dos cards

Colunas novas em `service_cards`:

| coluna | tipo | nota |
|---|---|---|
| `external_source` | String(50), nullable, index | ex.: `"gestorhs.os"` |
| `external_id` | String(100), nullable, index | id da entidade na origem |

Com **índice único parcial** em `(external_source, external_id)` onde
`external_source IS NOT NULL` — cards criados por humanos ficam de fora da restrição.

### 5.1 Dois `source`, não um

A entidade de origem é diferente em cada board. Usar `external_id` cru nos dois
faria a OS 500 colidir com o aparelho 500 e virar o mesmo card.

O `source` namespaceia o `external_id` — a mesma função que ele já tem no contrato
do TaskHS (§1 daquele doc):

| Board | `source` | `external_id` |
|---|---|---|
| Serviços | `gestorhs.os` | `str(ordem.id)` — ex.: `"1234"` |
| Cobrança | `gestorhs.calibracao` | `f"{equipamento_cliente.id}:{prox_calibragem:%Y-%m-%d}"` — ex.: `"500:2027-03-14"` |

### 5.2 Por que a cobrança leva a data na chave

Calibração é **cíclica**: o aparelho 500 vence em 2026, é calibrado, e vence de novo
em 2027.

Se o `external_id` fosse apenas `"500"`, o card de 2027 bateria no par já existente
de 2026, o sistema entenderia "já existe" e **não criaria nada** — silenciosamente.
O sintoma não seria um erro; seria um cliente que ninguém cobrou, descoberto meses
depois.

Incluir `prox_calibragem` na chave faz de cada ciclo um card próprio, e mantém o
job diário idempotente dentro do ciclo corrente.

---

## 6. Autenticação

### 6.1 Decisão: chave estática, com escopo

O hsgrowth já tem `IntegrationClient` (OAuth2 client_credentials) com model,
service, CRUD de admin e emissão de token. A credencial já não expira; o token de
8h que ela emite, sim.

Mesmo assim adotamos **chave estática** — um header, sem troca de token, sem cache
nem renovação do lado do GestorHS. É o padrão que o GestorHS já fala com o TaskHS,
e é legítimo para servidor-a-servidor.

**Mas:** com token de 8h, a expiração era o que limitava o dano de um vazamento.
Removendo-a, o escopo passa a ser o único controle de raio de dano. Por isso o
escopo **não é opcional neste design** — é o que compensa a chave eterna.

### 6.2 Implementação

Estende `IntegrationClient` em vez de criar tabela nova (ele já tem `name`,
`is_active`, `last_used_at`, `impersonate_user_id` e tela de admin):

- Nova coluna `scopes` (JSON, default `[]`).
- Nova coluna `api_key_hash` (String(255), nullable) — SHA-256 da chave. SHA-256 e
  não bcrypt porque a chave é aleatória de alta entropia (não é senha de humano) e
  precisa de lookup direto por hash a cada request; bcrypt custaria ~100ms por
  chamada, inviável num backfill.
- Formato da chave: `hsg_live_<48 bytes urlsafe>`. O prefixo existe para o
  secret-scanning do GitHub reconhecer o padrão caso vaze num commit.
- Exibida **uma única vez** na criação, como o secret atual já é.
- Header: `X-API-Key` — idêntico ao que o GestorHS já usa com o TaskHS.

Nova dependency `require_api_scope("service_cards:create")` que:
1. lê `X-API-Key`;
2. resolve o `IntegrationClient` ativo pelo hash;
3. verifica o escopo;
4. atualiza `last_used_at`;
5. devolve o `User` de `impersonate_user_id`.

Chave ausente, inválida ou de client inativo → `401`. Chave válida sem o escopo →
`403`.

### 6.3 Identidade e trilha de auditoria

A chave impersona um usuário dedicado **`GestorHS (Integração)`** com role
`service`.

Motivo duplo. Segurança: o role `service` já é barrado fora do módulo de Serviços
por `require_service_access`, então um vazamento fica contido — e o escopo fecha o
resto. Auditoria: o autor de todo evento de card é o `current_user` do request
(`service_board_service.log_event`), então o histórico mostra honestamente que a
origem foi a integração, em vez de atribuir milhares de cards a uma pessoa real.

Impersonar um usuário humano existente foi considerado e descartado: mistura ação
de máquina com ação de pessoa no histórico e amarra a integração a uma conta que
pode ser desativada quando alguém sair da empresa.

---

## 7. Resolução do cliente

### 7.1 Decisão: deduplicar por id do GestorHS, não por documento

A intenção inicial era find-or-create por CNPJ. **Foi descartada após ler o modelo
de dados do GestorHS.**

Em `app/models/cliente.py` do GestorHS: `cgc` e `cpf` são nullable, sem validação,
sem dígito verificador e **sem UNIQUE constraint**; até `nome` é nullable (apenas
`ativo` é NOT NULL). Não há validação nos schemas (`app/schemas/clientes.py` — são
`Optional[str]` puros, `email` não é sequer `EmailStr`). Os dados vieram de migração
de um sistema legado MySQL (`backend/migration/migrate.py`).

Deduplicar por esse campo casaria clientes errados ou criaria duplicatas — e, nos
dois casos, silenciosamente.

O GestorHS tem um identificador confiável: `clientes.id`, PK inteira de verdade.

### 7.2 Como fica

Nova tabela de vínculo `external_client_refs`:

| coluna | tipo |
|---|---|
| `id` | PK |
| `source` | String(50) — ex.: `"gestorhs"` |
| `external_id` | String(100) — o `clientes.id` do GestorHS |
| `client_id` | FK → `clients.id` |

Único em `(source, external_id)`.

Fluxo na criação do card:

1. Existe vínculo para `("gestorhs", cliente_external_id)`? → usa aquele `Client`.
2. Não existe → cria um `Client` novo com os dados do payload e grava o vínculo.

Documento, email e telefone entram como **dados** do cliente, nunca como chave.

Tabela separada em vez de colunas em `clients` porque o mesmo cliente pode vir a ter
origem em mais de um sistema, e porque não queremos poluir o modelo de cliente do CRM
com campos de integração.

> Nota: `client_service.create` hoje **rejeita** (400) email ou documento duplicado.
> O caminho de integração não deve passar por essa validação — ele já garante
> unicidade pelo vínculo externo, e um documento repetido vindo do legado não pode
> derrubar a criação do card. Criar pelo repositório, não pelo service, ou adicionar
> um parâmetro explícito de bypass.

### 7.3 Pessoa de contato

O GestorHS tem `contato` (nome, String(30)) e vários campos de telefone espalhados
(`telefones`, `celular`, `whatsapp`, `whatsapp1`, `whatsapp2`).

O `Person` é criado apenas se o payload trouxer `contact.name`. A mesma lógica de
prioridade de telefone que o GestorHS já usa em `app/core/taskhs.py:120` deve ser
aplicada do lado dele, antes de montar o payload — o hsgrowth recebe um telefone só,
já escolhido.

Sem vínculo externo para `Person` nesta fase: o volume é baixo e a chave natural
(email) é ainda menos confiável que a do cliente. Pessoa duplicada é um incômodo;
cliente duplicado é um erro de cobrança.

---

## 8. Destino: board e etapa

### 8.1 O GestorHS manda `board_id`

Ele sabe a intenção (Serviços vs. Cobrança); o hsgrowth não tem como adivinhar.

### 8.2 A etapa de entrada é resolvida no hsgrowth

Nova coluna booleana `is_entry_stage` em `service_lists`, default `false`.

O card entra sempre na lista marcada como entrada daquele board.

**Se o board não tiver nenhuma lista marcada como entrada, a resposta é `404`.**
Nunca cair na primeira lista por padrão, nunca adivinhar.

Isso é uma lição direta do próprio histórico do GestorHS: na v1 do contrato com o
TaskHS o destino era resolvido por **nome**, e um nome que não batia fazia o sistema
**criar um quadro novo em silêncio** — os cards passaram a cair nele, bastando alguém
renomear uma lista na tela. Está documentado no §"Mudou na v2" e no §4.4 do
`docs/integration.md` deles, e aconteceu de verdade.

A lição não é "use id em vez de nome". É **falhe alto**. Erro de configuração tem
que estourar na primeira chamada, não virar funil torto descoberto semanas depois.

Pelo mesmo motivo, a lista de entrada resolvida deve pertencer ao `board_id`
informado — hoje `create_card` aceita qualquer `list_id` sem validar o board
(`service_board_service.py:370-374`), o que permitiria um card nascer no meio do
funil, já depois das travas de avanço.

---

## 9. Contrato da API

### `POST /api/v1/integration/service-cards`

**Headers:** `X-API-Key`, `Content-Type: application/json`

**Corpo:**

| Campo | Tipo | Obrig. | Descrição |
|---|---|:---:|---|
| `source` | string | ✅ | `"gestorhs.os"` ou `"gestorhs.calibracao"` |
| `external_id` | string | ✅ | Ver seção 5 |
| `board_id` | int | ✅ | Board de destino; a etapa é resolvida pelo hsgrowth |
| `title` | string | ✅ | Título do card |
| `description` | string \| null | — | Texto livre |
| `due_date` | string (`YYYY-MM-DD`) \| null | — | |
| `client` | objeto | ✅ | Ver abaixo |
| `contact` | objeto \| null | — | `name`, `email`, `phone` |
| `devices` | lista \| null | — | Aparelhos; ver seção 10 |
| `business_info` | objeto \| null | — | Campos livres do card |

**`client`:**

| Campo | Tipo | Obrig. |
|---|---|:---:|
| `external_id` | string | ✅ |
| `name` | string | ✅ |
| `document` | string \| null | — |
| `email` | string \| null | — |
| `phone` | string \| null | — |
| `address` | objeto \| null | — |

**Respostas:**

| Código | Quando | O que o GestorHS faz |
|---|---|---|
| `201` | Card criado. | Seguir. |
| `200` | `(source, external_id)` já existia; nada alterado. | Seguir — é o caso normal de retry. |
| `401` | Chave ausente, inválida ou client inativo. | Conferir a env. |
| `403` | Chave válida sem o escopo `service_cards:create`. | Erro de configuração da chave. |
| `404` | `board_id` inexistente, ou board sem etapa de entrada configurada. | Erro de configuração no hsgrowth. |
| `422` | Payload inválido. | Corrigir o payload. |
| `5xx` | Erro transitório. | Repetir depois; a criação é idempotente. |

---

## 10. O que nasce preenchido — e o que não nasce

### Preenchido

Cliente vinculado (ou criado), pessoa de contato, título, descrição, data,
`business_info`, e os dados dos aparelhos.

### **Não** preenchido: produto e serviço do catálogo

Investigado e **descartado deliberadamente**:

- O catálogo de serviços do hsgrowth tem "Calibração 1", "2", "3" e "4"
  (`backend/scripts/seed_services.py`), sem descrição e sem SKU. Nada no código diz
  o que os distingue — são níveis ou faixas, e a regra vive fora dos dois
  repositórios.
- O GestorHS tem `tipo_servico` C/M/A (Calibração, Manutenção, Ambas). "C" mapearia
  para "uma das quatro Calibrações, indeterminada"; **não existe nenhum serviço de
  Manutenção no hsgrowth**, então "M" e "A" não têm destino.
- Produtos: `Equipamento` do GestorHS não tem SKU; `Product` do hsgrowth não tem
  marca; nenhum dos dois catálogos tem dados versionados para sequer medir
  sobreposição.

Um mapeamento por semelhança de nome é possível e **não deve ser feito**. Serviço
errado é preço errado, que vira proposta errada na frente do cliente — e o vendedor
não teria como saber que o card nasceu errado. Falhar em silêncio é pior que nascer
vazio.

Isso tem uma consequência conhecida e aceita: as travas de avanço
(`service_board_service.py:493-533`) exigem ao menos um produto **e** um serviço para
o card sair da etapa de entrada. Cards da integração ficarão travados até o vendedor
escolher os dois. **Isso é o comportamento desejado** — é o vendedor tomando a
decisão de preço, que é dele.

Quando a regra que distingue Calibração 1–4 for definida, o preenchimento automático
vira uma mudança pequena e isolada.

### Onde os aparelhos ficam

`ServiceCardProduct.aparelhos` seria o lugar natural, mas `product_id` é
`nullable=False` (`service_card_product.py:30-35`) — não há como gravar aparelhos
sem antes escolher um produto, que é justamente o que fica com o vendedor.

Portanto os aparelhos são gravados **estruturados** em
`business_info["equipamentos"]`, no formato já usado pelo campo `aparelhos`:

```json
[{"serial_number": "AB123", "model": "Alcotest 6820",
  "alcohol_module": "Sim", "next_recalibration_date": "2026-08-10"}]
```

Esse formato bate campo a campo com o `EquipamentoCliente` do GestorHS (`serie`,
`modulo`, `prox_calibragem`) — é o único mapeamento realmente confiável entre os dois
sistemas.

O card exibe esses dados em modo leitura, para o vendedor consultar ao montar o
produto. Preencher o `aparelhos` real automaticamente quando o vendedor escolhe o
produto fica como melhoria futura, fora do escopo.

---

## 11. Correções necessárias no código existente

Não são extras — sem elas a funcionalidade não existe.

1. **`business_info` e `payment_info` são descartados na criação.**
   `service_board_repository.py:208-218` monta o `ServiceCard` sem esses dois campos,
   embora ambos estejam no `ServiceCardCreate` e o response ecoe o valor (que vem
   `None`). Falha silenciosa. Só o `PUT` grava. **Sem isso não existe "card
   preenchido"**, e a correção vale igualmente para o fluxo humano.

2. **`create_card` não valida que a lista pertence ao board.**
   `service_board_service.py:370-374` valida apenas que a lista existe.

---

## 12. Entregáveis

1. Migrations: `external_source`/`external_id` em `service_cards` (+ índice único
   parcial), `is_entry_stage` em `service_lists`, `scopes`/`api_key_hash` em
   `integration_clients`, tabela `external_client_refs`.
2. Dependency `require_api_scope` + geração/exibição da chave na tela de admin.
3. Endpoint `POST /api/v1/integration/service-cards` e seu service.
4. Correções da seção 11.
5. Exibição dos aparelhos no card (leitura).
6. Testes: create-or-return, colisão entre os dois `source`, ciclo de calibração
   distinto, chave inválida/sem escopo, board sem etapa de entrada, cliente
   reaproveitado vs. criado.
7. **Documento de integração para o GestorHS** — ver seção 13.

---

## 13. Documento de integração (entregável separado)

Um guia autossuficiente, a ser salvo em `docs/` do **GestorHS**, escrito para que o
Claude daquele repositório implemente o lado cliente sem precisar ler o código do
hsgrowth.

Deve espelhar a estrutura do `docs/integration.md` que já existe lá (é um bom
documento e o time já o conhece):

1. Visão geral e direção do fluxo — incluindo o aviso explícito de que **este
   contrato é handoff, não espelho**, ao contrário do TaskHS, e o que isso implica
   (não reenviar em toda atualização).
2. Base URL e autenticação (`X-API-Key`, como obter a chave, como rotacionar).
3. Referência do endpoint, com todos os campos e um `curl` de exemplo por board.
4. Os dois `source` e a regra de formação do `external_id` — com a explicação de por
   que a cobrança leva a data na chave.
5. Tabela de códigos de status e o que fazer em cada um.
6. Semântica: idempotência, create-or-return, e por que reenviar não atualiza.
7. Onde plugar no GestorHS: na abertura da OS (espelhando o padrão de
   `api/espelhamento.py`, pós-commit, best-effort) e no job diário de 50 dias.
8. O que a integração **não** faz — produto e serviço não são preenchidos, e por quê.
9. Checklist de configuração ponta a ponta.

---

## 14. Fase 2 (fora deste escopo, registrado)

Quando o vendedor finalizar um card de origem `gestorhs.os`, o hsgrowth avisa o
GestorHS, que move a OS de Pós-Vendas (fase 6) para Financeiro (fase 10).

Dois pontos já levantados que devem guiar aquele design:

- **O hsgrowth relata fato, não dá ordem.** A mensagem correta é "o pós-vendas da OS
  1234 terminou", não "avance a OS 1234". O vendedor pode finalizar o card enquanto o
  aparelho ainda está no laboratório; quem decide se avança agora ou depois é o
  GestorHS, onde a regra de negócio já mora. Isso também torna a chamada idempotente
  de graça.
- **É greenfield do lado do GestorHS.** Não existe endpoint inbound autenticado por
  chave lá — todas as rotas são JWT de usuário, e `POST /ordens/{id}/avancar` avança
  uma casa só, valida pré-condições (certificado, nota fiscal, código de retorno) e
  exige usuário com a função da fase.
- Aplica-se **apenas** a cards com `source = "gestorhs.os"`. Cards de cobrança não
  têm OS para avançar.

Cuidado registrado: em `app/core/os_workflow.py`, a fase 10 (Financeiro) é
numericamente maior que 7 e 8 mas vem **antes** delas na ordem lógica. Usar sempre
`wf.posicao()`, nunca comparar ids.

---

## 15. Segurança — achado não relacionado, urgente

Levantado ao mapear a autenticação. **Não faz parte deste projeto**, mas não deve
esperar:

- `POST /auth/register` (`app/api/v1/endpoints/auth.py:435`) é **público e aceita
  `role_id` no corpo** (`user_data.role_id or 2`). Qualquer pessoa com acesso à rede
  cria uma conta de administrador.
- `POST /auth/forgot-password` **retorna o `reset_token` no corpo da resposta**
  (`auth.py:571-574`), com um comentário `# REMOVER EM PRODUÇÃO` no próprio código.

Combinados, são tomada de conta trivial. Se a API está exposta na internet, tratar
como incidente.
