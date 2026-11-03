# Parcerias — Entrega 2: Consulta de CNPJ (semáforo)

Data: 03/11/2026
Base: `Documentação/Programa Indicação Parcerias v2 [Health and Safety].docx` (Aba 2, regras 1 a 10)
Antes: [Entrega 1](2026-10-29-parcerias-entrega-1-design.md)
Versão: entra na **1.11.5**, junto com o acesso do vendedor Responsável H&S (ainda sem commit).

## Objetivo

Evitar que um parceiro e a H&S trabalhem a mesma empresa ao mesmo tempo. Antes de registrar
uma oportunidade, o parceiro consulta o CNPJ e recebe uma cor:

- **verde:** pode cadastrar;
- **amarelo:** pode cadastrar, mas entra para análise;
- **vermelho:** não pode cadastrar.

Do lado da H&S, o card de Vendas com um CNPJ que um parceiro está trabalhando mostra uma
faixa de aviso. O vendedor também não consegue criar ou vincular um card com esse CNPJ pela
tela.

## O que entra na conta

- **Cards de Vendas** (tabela `cards`, boards 6 e 7). O CNPJ vem do cliente vinculado
  (`clients.document`). Compara só os dígitos, porque há registros antigos com pontuação.
  - Ficam de fora: card sem cliente, cliente sem documento ou com CPF (11 dígitos), e cards
    ou clientes excluídos (`is_deleted`).
- **Oportunidades de todos os parceiros** (`partner_opportunities.cnpj`).
  - Ficam de fora: as excluídas e as com elegibilidade **Rejeitada**, que não protegem a
    empresa.
- **Serviço não entra** (decisão de 30/10).

## Proteção por atividade (regras 4 e 5)

Um card ou oportunidade **aberto** só protege a empresa enquanto não está "parado". Ele está
**protegido** quando vale pelo menos uma das condições:

1. **Tem atividade em aberto com data, e ela não está atrasada há mais de 10 dias.**
   - Uma atividade agendada para daqui a 2 meses mantém a proteção.
   - Uma atividade vencida há 11 dias não protege mais.
2. **Teve movimento nos últimos 10 dias.**

Os dias são **corridos**. Atividade em aberto sem data não conta como próximo passo.

| | Atividade em aberto | Movimento |
|---|---|---|
| **Card de Vendas** | `card_tasks` com `is_completed = false` e `is_cancelled = false` | Tarefa criada ou concluída (`created_at`, `completed_at`), anotação criada (`card_notes.created_at`, com fuso), entrada em etapa (`card_list_history.entered_at`) e a criação do card |
| **Oportunidade de parceiro** | `partner_activities` com `category = 'atividade'` e `is_completed = false` | `last_activity_at`, que as atividades já atualizam, e a criação da oportunidade |

Exemplos:

- Tarefa para 15/01, nada feito desde então: **protegido** até 25/01.
- Tarefa vencida há 12 dias e nenhuma outra coisa: **parado**, empresa livre.
- Tarefa vencida há 12 dias, mas anotação ontem: **protegido**, porque houve movimento.
- Card criado há 3 dias, sem tarefa: **protegido**, porque a criação conta como movimento.

## O semáforo

Para o CNPJ consultado (14 dígitos, com dígitos verificadores válidos), o sistema procura os
cards e as oportunidades com **o mesmo CNPJ**:

| Situação | Regra | Cor | Libera em |
|---|---|---|---|
| Aberto e protegido | 1, 4 | 🔴 Em negociação | — |
| Aberto e parado | 5 | (não bloqueia) | — |
| Ganho há menos de 30 dias (`cards.closed_at` com `is_won = 1`; `partner_opportunities.won_at`) | 2 | 🔴 Compra recente | data do ganho + 30 dias |
| Perdido há menos de 90 dias (`cards.closed_at` com `is_won = -1`; `lost_at`) | 6 | 🔴 Perdida há pouco | data da perda + 90 dias |
| Ganho ou perdido há mais tempo | 7 | (não bloqueia) | — |

Depois, procura **outras unidades da mesma empresa**: CNPJ com os 8 primeiros dígitos iguais
e os 14 diferentes (regra 8).

- Se alguma outra unidade cair num vermelho, a resposta é 🟡 **Outra unidade**.
- Outra unidade nunca gera vermelho.

**Resultado final:**

- O pior caso vence: vermelho, depois amarelo, depois verde.
- Entre vermelhos, a mensagem segue a ordem Em negociação, Compra recente, Perdida há pouco.
- Quando há data de liberação, vale a **mais distante**.

**Exclusões:**

- Quando a oportunidade que está sendo editada é conferida, ela mesma fica fora da conta.
- Duas oportunidades do mesmo parceiro para o mesmo CNPJ contam como conflito. É a regra 8,
  de duplicidade.

### O que cada perfil vê

| Perfil | Resposta |
|---|---|
| **Parceiro** | Só a cor e a frase: "Esta empresa já está em negociação.", "Disponível a partir de DD/MM." ou "Outra unidade desta empresa está em negociação. O cadastro entra para análise da H&S." No verde: "Pode cadastrar." Nenhum nome, valor ou vendedor. |
| **Vendedor, SDR, admin e gerente** | A cor, a frase e **onde** a empresa está, uma linha por registro. Card de Vendas: título, board, etapa, responsável e situação, com link para o card. Oportunidade: parceiro, título, etapa e situação. |

## Onde o semáforo aparece

### 1. Cadastro da oportunidade (board 2)

- No `NovaOportunidadeModal`, o **primeiro passo é o CNPJ**, com o botão "Consultar".
  - Esse clique usa a consulta da página e **conta no limite** do parceiro.
  - O resto do formulário só abre no verde ou no amarelo.
- **Vermelho:**
  - o parceiro e o vendedor Responsável H&S param ali e veem a frase;
  - **admin e gerente** veem a resposta completa e um campo **"Justificativa para cadastrar
    mesmo assim"**, obrigatório, com no máximo 500 caracteres.
- **Amarelo:** o formulário abre, com o aviso de que vai para análise.
- **Backend (`oportunidades.criar`):** recalcula o semáforo ao salvar. Essa conferência não
  conta no limite e não entra no histórico.
  - Vermelho sem justificativa, ou com justificativa vinda de quem não é admin ou gerente:
    responde **422** com a frase.
  - Grava na oportunidade a cor, o motivo e, quando houver, a justificativa e quem liberou.
  - Registra no histórico do card um evento de alteração, por exemplo: "Cadastro liberado
    pela gestão com o CNPJ em vermelho (Em negociação). Justificativa: …".
- **Troca de CNPJ (`oportunidades.atualizar`):** confere de novo, excluindo a própria
  oportunidade, com a mesma regra de bloqueio e liberação. Hoje o CNPJ já não muda depois de
  validado, a não ser pela gestão.
- **Detalhe da oportunidade:** o Financeiro, a gestão e o vendedor responsável veem um selo
  com a cor e o motivo gravados no cadastro.
  - Amarelo: "Outra unidade em negociação — analisar".
  - Vermelho liberado: o selo mostra também a justificativa e quem liberou.

### 2. Página "Consulta de CNPJ"

- **Rota:** `/parcerias/consulta-cnpj`, com o mesmo cabeçalho dos boards de Parcerias.
- **Quem acessa:** parceiro, vendedor, SDR, admin e gerente.
  - O Financeiro não entra.
  - O SDR não vê "Boards (Parcerias)", então ganha um item de menu próprio, **"Consulta de
    CNPJ"**, visível para esses cinco perfis. Para o parceiro, o item também aparece, e a
    tranca já libera `/parcerias/...`.
- **Topo:** campo de CNPJ com máscara, botão "Consultar" e o resultado: um cartão com a cor,
  a frase e, para a H&S, a lista de onde a empresa está.
- O parceiro vê **"Consultas hoje: 7 de 20"**.
- **Histórico, só admin e gerente:**
  - tabela com data e hora, pessoa, perfil, parceiro (quando for), CNPJ e cor;
  - filtros por pessoa, por parceiro e por período;
  - paginação de 50 em 50, com as mais recentes primeiro.

### 3. Lado de Vendas

**A faixa:**

- Aparece no `CardDetails` do card de Vendas, acima do cabeçalho.
- Mostra uma faixa amarela quando alguma oportunidade de parceiro com o mesmo CNPJ **está
  protegendo a empresa**. Isso inclui aberta e protegida, ganha há menos de 30 dias ou perdida
  há menos de 90.
- Texto: *"CNPJ registrado pelo parceiro Dmap em 05/11 (Programa de Parceiros)."* Se houver
  mais de uma oportunidade, uma linha por parceiro.
- Quem tem acesso ao card vê a faixa.

**O bloqueio:**

- Vale quando o card ficaria com um CNPJ que um parceiro está protegendo, pela mesma regra
  da faixa, em quatro situações:
  - **criar** card com cliente: `CardService.create_card`;
  - **vincular ou trocar o cliente** do card: `update_card`, quando `client_id` muda;
  - **clonar**: `clone_card`;
  - **reabrir um perdido**: `reopen_card`.
- Para quem não é admin nem gerente, a resposta é **409**: *"Este CNPJ está com o parceiro
  Dmap (Programa de Parceiros) desde 05/11. Fale com o gerente."*
- Admin e gerente passam. O card registra uma atividade: "Card com CNPJ do Programa de
  Parceiros (parceiro Dmap), liberado por <nome>".
- **Sem bloqueio, só a faixa:**
  - **leads automáticos** (usuário com `is_integracao`): os leads do site e do RD Station
    entram pela mesma rota `POST /cards`, e bloquear perderia o lead;
  - **importação de planilha** (`card_import_service`), que é em lote.
- Só as oportunidades de parceiro contam aqui. Conflito entre dois cards de Vendas é da H&S
  e fica como está hoje.

## Limite diário

- **20 consultas por dia** para cada login com perfil `partner`. O dia é contado no fuso de
  São Paulo.
- Na 21ª consulta: **429**, com a mensagem "Limite diário de 20 consultas atingido. Volta a
  liberar amanhã."
- Vendedor, SDR, admin e gerente não têm limite, mas as consultas deles também ficam no
  histórico.
- O número 20 fica numa constante (`LIMITE_CONSULTAS_PARCEIRO`), fácil de mudar.

## Dados (migration nova, depois de `2c3d4e5f6a7b`)

**Tabela `cnpj_consultas`:**

| Coluna | Tipo |
|---|---|
| `id` | PK |
| `user_id` | FK users, `SET NULL`, indexado |
| `partner_id` | FK partners, nulo para a H&S, indexado |
| `cnpj` | String(14), indexado |
| `resultado` | String(10): `verde`, `amarelo` ou `vermelho` |
| `motivo` | String(30): `livre`, `em_negociacao`, `compra_recente`, `perdida_recente` ou `outra_unidade` |
| `created_at` | indexado |

**Em `partner_opportunities`, colunas novas, todas anuláveis:**

| Coluna | Tipo |
|---|---|
| `cnpj_resultado` | String(10) |
| `cnpj_motivo` | String(30) |
| `cnpj_liberado_por_id` | FK users, `SET NULL` |
| `cnpj_justificativa` | Text |

As oportunidades que já existem ficam com nulo, e a tela não mostra o selo.

## Arquitetura

**Backend:**

- `app/services/parcerias/semaforo.py`
  - funções puras para a regra de proteção e para juntar os casos em uma resposta;
  - consultas que buscam os cards de Vendas e as oportunidades por CNPJ e pela raiz de 8
    dígitos. Os cards são encontrados pelo `client.document`, normalizado com
    `regexp_replace`, como em `client_repository`;
  - uma função `situacao(db, cnpj, ignorar_oportunidade_id=None)` que devolve a cor, o
    motivo, a data de liberação e a lista de registros encontrados;
  - uma função `protecao_de_parceiro(db, cnpj)` que devolve as oportunidades de parceiro que
    protegem o CNPJ, usada pela faixa e pelo bloqueio de Vendas.
- `app/services/parcerias/consultas.py`: limite, gravação do histórico e listagem do
  histórico.
- **Rotas**, num router próprio
  (`app/api/v1/endpoints/consulta_cnpj.py`, prefixo `/parcerias/consulta-cnpj`), com a
  dependência `require_consulta_cnpj` (admin, manager, salesperson, sdr, partner). A tranca
  libera, porque fica dentro de `/api/v1/parcerias`.
  - `POST /parcerias/consulta-cnpj` com `{cnpj}`: consulta, grava e conta. A resposta vem
    filtrada por perfil.
  - `GET /parcerias/consulta-cnpj/hoje`: quantas consultas o parceiro fez hoje e o limite.
  - `GET /parcerias/consulta-cnpj/historico`: admin e gerente, com filtros e paginação.
- **Faixa:** `GET /cards/{card_id}/aviso-parcerias`, no router de cards, com as permissões de
  leitura do card que já existem. Devolve a lista de `{parceiro, data}`, vazia quando não há
  nada.
- **Bloqueio:** uma função `conferir_cnpj_de_parceiro(db, user, client_id)`, chamada nos
  quatro pontos de Vendas. Ela pula usuário de integração, admin e gerente; para a gestão,
  devolve o aviso para registrar a atividade.

**Frontend:**

- `services/parceriasService.ts`: `consultarCnpj`, `consultasHoje` e `historicoConsultas`.
- `components/parcerias/ResultadoSemaforo.tsx`: o cartão do resultado, usado pela página e
  pelo modal.
- `pages/parcerias/ConsultaCnpj.tsx`: a página, com a consulta em cima e o histórico embaixo.
- `NovaOportunidadeModal.tsx`: passo 1 (CNPJ e semáforo) e passo 2 (o formulário atual), com
  a justificativa da gestão no vermelho.
- `OportunidadeDetalhe.tsx`: o selo do semáforo gravado.
- `pages/CardDetails.tsx`: a faixa amarela.
- Menu (`MainLayout`) e `router.tsx`: o item e a rota "Consulta de CNPJ", com guarda para os
  cinco perfis.
- **Visual:** copiar os componentes que já existem (cartões, `SelectMenu`, tabelas de
  relatório), sem design próprio. Destaques em azul, sem roxo. Cores do semáforo: verde
  `emerald`, amarelo `amber` e vermelho `red`.

## Testes

- **Regra de proteção, com funções puras:** atividade futura distante, atrasada 9 e 11 dias,
  sem data, movimento recente com atividade atrasada, criação recente.
- **Semáforo:**
  - cada linha da tabela, com card de Vendas e com oportunidade;
  - outra unidade gera amarelo;
  - prioridade entre vermelhos e data mais distante;
  - Rejeitada e Serviço não contam;
  - a própria oportunidade é ignorada na edição.
- **Resposta por perfil:** o parceiro não recebe nomes; a H&S recebe a lista.
- **Limite:** a 21ª consulta do parceiro dá 429; o vendedor não tem limite; a conferência ao
  salvar não conta.
- **Histórico:** só admin e gerente; os filtros funcionam.
- **Cadastro:**
  - vermelho barra o parceiro e o vendedor;
  - a gestão passa com justificativa e não passa sem ela;
  - o amarelo grava o motivo;
  - a troca de CNPJ confere de novo.
- **Vendas:**
  - criar, vincular, clonar e reabrir dão 409 para vendedor e SDR;
  - admin passa e a atividade fica registrada;
  - lead de integração passa;
  - a faixa lista o parceiro.
- **Acesso:** Financeiro, serviço e visualizador recebem 403 na consulta.

## Fora desta entrega

- Aviso antes dos 10 dias sem atividade (Entrega 4).
- Login dos vendedores do parceiro e todo o fluxo de criação de acessos (Entrega 3, ainda
  por planejar).
- Notificação no sininho para o dono do card de Vendas. O usuário escolheu faixa e bloqueio,
  sem notificação.
- Conflito entre dois cards de Vendas da própria H&S.
