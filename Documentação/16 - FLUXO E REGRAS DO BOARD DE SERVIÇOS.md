# 16 - FLUXO E REGRAS DO BOARD DE SERVIÇOS

> **Documento vivo.** Última atualização: **02/07/2026**
> Relacionado: [15 - MÓDULO DE SERVIÇOS.md](15%20-%20MÓDULO%20DE%20SERVIÇOS.md)
> 📌 **Fontes da verdade (atuais):** estrutura → **seção 2**; regras de avanço → **seção 6**.
>
> ⚠️ **Funil reestruturado em 19/06/2026.** O time simplificou o funil de **9 → 7 etapas**
> (removidas: Negócio Fechado, Oportunidade Existente, Operações; renomeadas as de laboratório).
> As seções **2** (estrutura) e **6** (matriz de regras) estão atualizadas. A **seção 4**
> (fichas etapa por etapa) descreve a **jornada original do Miro** e foi mantida como
> **referência histórica** — não reflete mais 1:1 o funil em produção.

---

## 1. DECISÕES GLOBAIS (confirmadas)

1. **Entrada pela 1ª etapa**: `Liberados do Laboratório` (novos cards entram só por ela; o botão "Adicionar card" e o modal travam na lista inicial). *(Estrutura atual completa na seção 2.)*
2. **Regra de avanço = TRAVA (hard gate)**: o card **não pode avançar** de etapa se as obrigatoriedades não estiverem preenchidas. O sistema bloqueia o movimento.
3. **Campos divididos entre Resumo e Produto**:
   - **Resumo** (nível do card): dados comerciais/negócio.
   - **Produto** (por aparelho): Nº de Série, Modelo, Módulo de álcool, Índice de reajuste, OS, Data de próxima recalibragem.
4. **Campos do aparelho são por produto**: um mesmo negócio pode ter **vários aparelhos** (ex.: 5). Cada aparelho tem seus próprios dados.
5. **Automações ficam para uma fase posterior** (criar próximo serviço em 90 dias, cadência de resgate, tags dinâmicas, integração Trello/expedição/financeiro). Aqui só **documentamos** onde elas entram.

---

## 2. ESTRUTURA DAS ETAPAS (listas do board)

**Funil atual (board oficial "Serviços", id 1) — 7 etapas:**

| # | Lista | Tipo |
|---|---|---|
| 1 | Liberados do Laboratório | Entrada (1ª etapa) |
| 2 | Dados Preenchidos | Ativa |
| 3 | Tentativa de Contato | Ativa |
| 4 | Proposta | Ativa |
| 5 | Aguardando Pedido | Ativa |
| 6 | Negócio Ganho | `is_done_stage` |
| 7 | Negócio Perdido | terminal (detectado pelo nome "perdido") |

> ⚠️ As listas podem ser editadas pelo time. As **regras estão presas ao board oficial** (`SERVICE_FUNNEL_BOARD_IDS = {1}`) — boards duplicados são kanban livre, sem regras nem dashboard.

### 2.1. Tag "Parado 3d+" / Atrasados (global)

Cards com **atividade pendente vencida há 3+ dias** entram na contagem **"Atrasados 3d+"** da dashboard. Usada para acompanhamento de negócios estagnados nas etapas ativas.

---

## 3. MAPEAMENTO DE CAMPOS

### 3.1. Campos de RESUMO (nível do card)

Layout confirmado do Resumo do card de Serviço (coluna esquerda):

> **Atualizado em 19/06/2026:** o Resumo foi enxugado — os campos herdados de Vendas
> (Vendedor Responsável, Tipo de Negócio, Canal de Aquisição, Detalhamento, É venda ou
> locação, Deve ser faturado) foram **removidos**. Layout atual:

| Seção | Campo | Origem | Obrigatório |
|---|---|---|---|
| **Valores** | Valor do negócio (auto pelos produtos) | auto | — |
| **Triagem** | Recalibração e/ou Manutenção (`service_type`) | Serviço | ✅ p/ sair de Dados Preenchidos |
| **Proposta** | Formulário de Coleta de Dados enviado (`form_answered`, checkbox) | Serviço | ❌ (informativo) |
| **Proposta** | **Forma de fechamento** (`closing_type`: Faturamento direto / Pedido) | Serviço | ✅ na etapa Proposta |
| **Documentos** | OS – Ordem de Serviço (anexo) | Serviço | ✅ p/ sair de Liberados do Laboratório |
| **Documentos** | OC – Ordem de Compra (anexo) | Serviço | ✅ p/ Ganho via Aguardando Pedido |
| **Informações Gerais** | Criado em / Tempo no funil / ID | auto | — |

**Cliente (Organização)** e **Pessoa (Contato)** ficam nas suas seções próprias e são exigidos para sair de **Dados Preenchidos**.

> 🔓 **Índice de reajuste**: ainda **não implementado** — ponto em aberto (fica no Resumo ou no Produto/aparelho?).

### 3.1.1. Módulo de Propostas Comerciais *(atualizado 03/07/2026)*

**Propostas Comerciais** é um módulo exclusivo do módulo de Serviço, composto por:
- **Página na sidebar** ("Propostas"): lista todas as propostas do sistema.
- **Seção "Propostas" no card de Serviço** (abaixo de Produtos): permite criar, listar, vincular e desvincular propostas ao card.

**Proposta compartilhada entre vários cards (N:N)** — uma mesma proposta pode estar vinculada a **vários cards ao mesmo tempo** (ex.: criada no board de Cobrança e reaproveitada no board de Serviço). Editar/regerar a proposta reflete em todos os cards. Na página da sidebar, a coluna **Card Vinculado** mostra **todos** os cards vinculados (chips clicáveis). Implementação: tabela de vínculo `proposal_service_cards`.

**Marcador automático da proposta** — deriva do **conjunto** de cards vinculados, pela prioridade **Perdido > Ativo > Ganho**:
- Algum card vinculado em **Perdido** → **Não aprovada**.
- Senão, algum card ainda **ativo** → **Em aberto**.
- Senão (todos os cards em **Ganho**) → **Aprovada**.
- Sem card vinculado → **Em aberto**.

**Histórico de versões** — a cada **edição salva**, o estado anterior da proposta é arquivado (dados + PDF daquele momento) na tabela `proposal_versions`. Um ícone de **histórico** (na página da sidebar e na seção do card) abre um modal listando as versões (data da alteração + infos), com botões **Ver** e **Baixar** o PDF de cada versão anterior.

**Excluir × Desvincular:**
- **Lixeira na seção Propostas do card** → apenas **desvincula** a proposta daquele card (a proposta continua existindo e vinculada aos demais cards).
- **Excluir permanente** → botão na página `/propostas`; remove a proposta de vez e a desvincula de todos os cards.

**Impacto nas regras de avanço:**
- O antigo anexo "Proposta Comercial" foi **removido da seção Documentos do Resumo** (permanecem lá apenas OS e OC).
- A regra de avanço nas etapas **Proposta** (board de Serviço, transições 4 e 5) e **Proposta → Operações** (board de Cobrança) passa a exigir **≥1 proposta vinculada ao card** (aba Propostas do card), em vez de um documento anexado.

> ✅ **Geração de PDF** (WeasyPrint, marca H&S) implementada — o PDF é anexado automaticamente a cada card vinculado e pode ser visto/baixado pela seção Propostas e pela página da sidebar.

### 3.1.2. Catálogo de Serviços *(adicionado 08/07/2026)*

Além de **Produtos**, o card de Serviço agora vincula **Serviços** (tipos de serviço, ex.: Calibração 1–4), a partir de um **catálogo próprio**:
- **Página na sidebar** ("Serviço", rota `/service-catalog`), exclusiva do time de Serviço — cadastro igual ao de Produtos (Nome, Descrição, Código/SKU, Preço, Categoria, Ativo).
- **Seção "Serviços" no card** (abaixo de Produtos): escolher serviço + quantidade + preço (do catálogo, editável) + desconto. Sem aparelhos.
- **Regra de avanço:** as etapas que exigiam "≥1 produto" agora exigem **≥1 produto E ≥1 serviço** (board 1 "Dados Preenchidos→"; board 2 "Oportunidade Existente→").
- **Valor do card (Valor do negócio):** exibido no Resumo, no Kanban e na dashboard, é a **soma dos totais das propostas vinculadas** ao card (cada proposta = itens + frete − desconto; propostas soft-deletadas ignoradas). Uma proposta pode estar vinculada a vários cards (N:N) e um card pode ter várias propostas → soma. *(atualizado 09/07/2026; antes vinha dos serviços/produtos)*
- **Proposta:** o prefill dos itens da proposta passa a vir dos **serviços** do card (produtos seguem em "Outros itens" como Modelo/Aparelhos).
- Tabelas: `services` (catálogo) e `service_card_services` (vínculo). Detalhes no doc 17.

### 3.2. Campos de PRODUTO (por aparelho)

> **Modelagem (implementada):** o **produto escolhido = o modelo**. Dentro de cada produto há uma **sub-lista de aparelhos** (1 negócio pode ter vários aparelhos do mesmo modelo, cada um com seu próprio Nº de Série). Cada aparelho guarda os campos abaixo.

| Campo | Preenchido por | Obrigatório |
|---|---|---|
| Número de Série | `[Laboratório]` | ✅ **sim** |
| Data de próxima recalibragem | `[Laboratório]` | ✅ **sim** |
| Modelo | (auto) | — **já vem pré-preenchido** com o produto escolhido (editável) |
| Módulo de álcool | `[Laboratório]` | ❌ **não** obrigatório |
| Índice de reajuste | `[Serviço]` | 🔓 **não implementado** — local em aberto (Resumo vs Produto/aparelho) |

> Legenda: `[Laboratório]` = preenchido pelo time de laboratório · `[Serviço]` = preenchido pelo time de serviço.
> ✅ **Validação no "Salvar aparelhos"** (15/06/2026): não permite salvar sem pelo menos **1 aparelho**, e cada aparelho exige **Nº de Série** + **Data de próxima recalibragem**. Modelo já vem preenchido; Módulo de álcool é opcional.
> ✅ **Trava de avanço** de "Dados de Laboratório" → "Preenchidos" (15/06/2026): só avança se houver **pelo menos 1 aparelho** (em qualquer produto) com **Nº de Série** + **Data de próxima recalibragem** preenchidos.
> ✅ **Quantidade automática** (25/06/2026): o campo **Quantidade** do produto é **somente leitura** e passa a ser **igual ao nº de aparelhos** adicionados — sincroniza ao "Salvar aparelhos" (`quantity = aparelhos.length`). O usuário não edita mais a quantidade manualmente.

---

## 4. REGRAS POR ETAPA — *(histórico: jornada original do Miro)*

> ⚠️ **As fichas abaixo (4.0 a 4.6) descrevem a jornada ORIGINAL do Miro (9 etapas).**
> O funil foi **simplificado para 7 etapas** em 19/06/2026 e algumas etapas saíram
> (Negócio Fechado, Oportunidade Existente, Operações). **Para a estrutura e as regras
> vigentes, use a seção 2 e a seção 6.** Esta seção fica como referência da concepção.

> Cada etapa terá: **gatilho de entrada**, **atividades**, **obrigatoriedades para avançar (trava)**, **condição/critério de perda** e **automações (futuro)**.

### 4.0. Negócio Fechado ✅ *(imagem 1 — documentado)*

- **Gatilho de entrada**: **automático**. Quando um negócio é **ganho no board de Vendas**, uma automação cria automaticamente um card aqui no funil de Serviço, já com algumas informações preenchidas.
- **Informações copiadas de Vendas** (e onde aparecem no card de Serviço):

  | Informação | Onde fica no card de Serviço |
  |---|---|
  | Produtos e valores | Seção **Produto** (já pronto) |
  | Valores cobrados originalmente (produto e software) | Seção **Produto** |
  | Quantidade do produto original | Seção **Produto** |
  | Canal de Aquisição | **Resumo** → Inf. de Negócio (criar campo) |
  | Canal de Aquisição – Detalhamento | **Resumo** → Inf. de Negócio (criar campo) |
  | Tipo de Negócio | **Resumo** → Inf. de Negócio (criar campo) |
  | É venda ou locação | **Resumo** → Inf. de Serviço (criar campo) ⚠️ depende de Vendas |
  | Deve ser faturado / aluguel | **Resumo** → Inf. de Serviço (criar campo) |
  | Vendedor Responsável | **Resumo** → Responsável (só leitura) |
  | Contatos associados e suas tags | Seções **Cliente** e **Pessoa** (já existem) |

- **Obrigatoriedades para avançar**: **nenhuma** — esta etapa só **recebe** o card que veio de Vendas.
- **Avanço → Dados de Laboratório**: livre (manual ou via automação de criação).
- **Automação (futuro)**: criação automática do card copiando os dados acima de Vendas.

### 4.1. Dados de Laboratório ✅ *(imagem 2 — documentado)*

- **O que é**: card aguardando o **time de laboratório preencher** os dados de cada aparelho. É a etapa mais "complicada" — depende de preenchimento manual **ou** de integração que traga esses dados.
- **Atividade**: "Laboratório preenche dados básicos sobre os aparelhos".
- **Como entra**: assim que a informação do laboratório estiver disponível (manual ou automação), o card chega aqui.
- **Obrigatoriedades** (campos **por aparelho**, na sub-lista de aparelhos do Produto) — validadas no **"Salvar aparelhos"** (cada aparelho) **e** na **trava de avanço** (exige ≥1 aparelho válido para sair da etapa):
  - **Número de Série** `[Laboratório]` ✅ obrigatório
  - **Data de próxima recalibragem** `[Laboratório]` ✅ obrigatório
  - Modelo — já vem **pré-preenchido** com o produto (não precisa preencher)
  - Módulo de álcool `[Laboratório]` — **opcional**
- ⚠️ **Implementação**: a seção **Produto** precisará ganhar esses campos **em cada produto/aparelho**. As demais informações (comerciais) já chegam preenchidas da etapa "Negócio Fechado". O laboratório só preenche os campos `[Laboratório]`.
- **Avanço → Dados de Laboratório Preenchidos**: **automático** assim que os 4 campos estiverem preenchidos em **todos** os aparelhos.

### 4.2. Dados de Laboratório Preenchidos ✅ *(imagem 3 — documentado)*

- **O que é**: **estado de espera**. O card só chega aqui porque o laboratório já preencheu as obrigatoriedades `[Laboratório]` de ao menos 1 aparelho. O time de serviço **não faz nada** aqui — apenas aguarda a janela de avanço.
- **Por que fica parado**: os dados comerciais já vieram preenchidos de Vendas e os dados de laboratório já foram preenchidos; o card aguarda chegar a janela de recalibração (ou o equipamento ser recebido).
- **Avanço → Oportunidade Existente** (dois cenários):
  1. **Automático** — quando a **Data de próxima recalibração** de um produto estiver faltando **≤ 50 dias**, a automação move o card.
  2. **Manual** — quando o **cliente envia o equipamento por conta própria** (recebido pela expedição); o time preenche os dados de laboratório obrigatórios e move o card manualmente.
- **Obrigatoriedade**: nenhuma nova nesta etapa — já garantida na anterior (campos `[Laboratório]`).

> ✅ **Regra da trava (confirmada)**: para avançar, os campos `[Laboratório]` precisam estar preenchidos em **TODOS os aparelhos** do card. Todo card tem no mínimo 1 produto; se tiver vários (5, 10, 20…), **todos** precisam estar preenchidos.

### 4.3. Oportunidade Existente ✅ *(imagem 4 — documentado)*

- **Gatilho de entrada (SLA)**: Data de próxima recalibração ≤ 50 dias **OU** equipamento recebido pela expedição.
- **Sem proprietário fixo**: no board de Serviço **não há responsável atribuído** — qualquer pessoa do time pode tratar o card. (Diferente de Vendas; por isso **não** existe automação de "Atribuir Proprietário" aqui.)
- **CRM / Tags dinâmicas (futuro)**: tag "Aparelho coletado pela expedição" (input manual, futuramente automatizado) — para uso nos filtros.
- **Triagem (ponto de decisão)**: Validar dados e data de recalibração (próximos 50 dias).
- **Atividades**:
  - Validar se a calibração deve ser feita ou não (calibração **ou** manutenção)
  - Validar recebimento pela expedição
  - Verificar se há inadimplência (input manual, futuramente automatizado)
- **Obrigatoriedades** (preencher — vão ficar no **RESUMO**):
  - Recalibração e/ou Manutenção
  - Aparelho recebido pela expedição (sim/não)
  - OS (Ordem de Serviço) — **obrigatório SE** o aparelho foi recebido · é um **documento anexado no Resumo**
  - Índice de reajuste (reajuste p/ o próximo ano) — **não obrigatório** · 🔓 local em aberto (debater na implementação)
- **Avanço → Tentativa de Contato**: obrigatoriedades preenchidas **E** pelo menos **1 atividade criada**.
- **Perdido (1º ponto de perda)**:
  - **Gatilho**: Cliente inadimplente **ou** Data de próxima recalibração errada.
  - **Ao perder, preencher**: Motivo de Perda + Detalhamento da perda + Data de próxima recalibração (para ajustes, se necessário).
  - **Automação (futuro)**: após **90 dias**, criar um novo card automaticamente para retrabalhar o negócio + cadência de resgate.

> ✅ **Conflito resolvido**: **OS** é um documento → fica **anexada no Resumo**. **Índice de reajuste** (reajuste p/ próximo ano) fica com o **local em aberto** (Resumo vs Produto) para debate na implementação.

### 4.4. Tentativa de Contato ✅ *(imagem 5 — documentado)*

- **O que é**: etapa onde o time vai **atrás do cliente** e **envia a proposta**.
- **Gatilho de entrada**: Início das Tentativas de Contato (Contato Assíncrono).
- **Automação (futuro)**: Criar tarefas da **cadência de prospecção**.
- **Atividades**:
  - Montar Proposta
  - Enviar ao Decisor: Proposta + Formulário de Coleta de Dados
    - ℹ️ O **Formulário de Coleta de Dados** é apenas **enviado ao cliente** — **não** exige anexo no card.
- **Obrigatoriedade**:
  1. **≥1 proposta vinculada** ao card (aba Propostas do card)
- **Avanço → Proposta**: ≥1 proposta vinculada ao card.
- **Perdido**: igual ao padrão (ver 4.X).
  - **Gatilho**: Não conseguiu contato com o decisor até o fim da cadência.
  - **Automação (futuro)**: criação do próximo serviço em 90 dias + cadência de resgate.

### 4.5. Proposta ✅ *(imagem 6 — documentado)*

- **O que é**: acompanhamento (follow-up) da proposta enviada ao cliente.
- **Gatilho de entrada**: Contato Síncrono.
- **Atividades**:
  - FUP (follow-up) da Proposta e do Formulário
  - Coletar OS (Ordem de Serviço)
- **Obrigatoriedades** (confirmadas):
  1. Fazer **1 atividade de follow-up** (verificar a proposta enviada + o Formulário de Coleta de Dados)
  2. **≥1 proposta vinculada** ao card (aba Propostas do card)
- **Avanço → Operações**: feita a atividade de follow-up **E** ≥1 proposta vinculada ao card.
- 🔓 **Em aberto (decidir na implementação)**: a imagem indica também *"Formulário de Coleta de Dados respondido"* e *"OS anexada"* como obrigatórios. Como a OS já pode ter sido anexada na etapa 4.3 (se o aparelho foi recebido) e o Formulário respondido depende do retorno do cliente, **deixar para validar na implementação** se entram ou não como trava aqui.
- **Perdido**:
  - **Gatilho**: Cliente não aceitou a proposta.
  - **Padrão** (ver 4.X) + **automação** de criação do próximo serviço em 90 dias + cadência de resgate.

### 4.6. Operações ✅ *(imagem 7 — documentado)*

- **O que é**: **"Hands Off"** — o time de serviço passa o bastão para o **time de laboratório**. Etapa de acompanhamento do processo do laboratório.
- **Gatilho de entrada**: Hands Off (serviço passa o bastão para o laboratório).
- **Integrações (futuro)**:
  - Criar **cópia do card** com os dados do Laboratório.
  - **Alerta automático no Trello** para o time de serviço quando o processo do laboratório estiver concluído.
  - Se **não houver** integração, o acompanhamento é **manual**.
- **Tag**: "Card parado 3 dias ou mais na fase de Operações" (ver [2.1. Tag "Parado 3d+"](#21-tag-parado-3d-global)).
- **Atividade (MVP)**: o serviço acompanha o progresso do laboratório no Trello e move o card no CRM.
- **Obrigatoriedade**: criar **1 atividade de follow-up** para verificar se o laboratório já terminou o serviço.
- **Avanço → Aguardando Pedido**: Manutenção/Calibração concluída **E** feita a atividade de follow-up.
- **Perdido**: **não previsto** nesta etapa (já está tudo acordado), mas o **botão permanece disponível** — se acontecer algo, segue o padrão (ver 4.X).

### 4.7. Aguardando Pedido ✅ *(imagens 8 e 9 — documentado)*

- **O que é**: **"Hands On"** — o time de laboratório **devolve o bastão** para o time de serviço. Etapa de faturamento.
- **Gatilho de entrada**: Hands On (laboratório devolve para o serviço).
- **Dados para Faturamento**: Verificar **SE Ordem de Compra = Proposta**.
- **Atividades**:
  - SE houve manutenção → enviar Proposta da Manutenção
  - Coletar OC (Ordem de Compra)
  - Validar Dados para Faturamento (Ordem de Compra × Proposta)
- **Novo campo**: anexar **OC (Ordem de Compra)** no Resumo (seção Documentos).
- **Obrigatoriedades para dar GANHO**:
  1. **OC (Ordem de Compra) anexada**
  2. Realizar **1 atividade de tarefa** validando os dados para envio ao Financeiro
- **Perdido**:
  - **Gatilho**: Cliente não aceitou a Proposta da Manutenção.
  - Padrão (ver 4.X) + automação de 90 dias.

> ⚠️ **REGRA DO BOTÃO "GANHO" (mudança de comportamento)**: o botão **Ganho só pode ser clicado quando o card está em "Aguardando Pedido"**. Nas demais etapas ele fica **desabilitado/opaco** (não clicável); ao chegar em Aguardando Pedido ele **acende**. Mesmo aceso, só conclui o Ganho se: **OC anexada** + **atividade de tarefa de validação feita**.

### 4.8. Negócio Ganho ✅ *(imagem 9 — documentado)*

- **O que é**: etapa **final de sucesso**. Ao dar Ganho, o card vai para "Negócio Ganho" e **fica nessa etapa** (assim como o card perdido fica em "Negócio Perdido").
- **Integrações (futuro)** — a definir o que fazer depois do Ganho:
  - Levar dados para o **Financeiro faturar**.
  - Levar dados para a **expedição**.
- **UI / Otimização**: os cards **ganhos ficam escondidos por padrão** no board; só aparecem quando o usuário **filtra** por ganhos. Objetivo: não poluir o board mostrando tudo.

> ❓ **A confirmar**: o mesmo "esconder por padrão" vale também para os cards em **Negócio Perdido**?

### 4.X. Negócio Perdido ✅ *(confirmado)*
- **Acessível a partir de**: Oportunidade Existente, Tentativa de Contato, Proposta, Aguardando Pedido.
- **Obrigatoriedades ao perder**: Motivo de Perda + Detalhamento da perda + Data de próxima recalibração (para ajustes, se necessário).
- **Motivos de Perda** (lista oficial do Serviço — substituir a atual no `LossReasonModal`):
  - Não chegamos no responsável pelo tema
  - Proposta fora do orçamento
  - Manutenção não aprovada
  - Sem budget aprovado
  - Solução não percebida como crítica
  - Aprovação interna travada
  - Perda para concorrência
  - Lead não deu mais retorno
  - Data de Recalibração Errada
  - Cliente Inadimplente
- **Automação (futuro) — "resgate em 90 dias"**: ao marcar como Perdido, agendar a **criação de um novo card após 90 dias** para retrabalhar o negócio + **cadência de resgate**. Vale para todas as etapas que têm ponto de perda.

---

## 5. PRÓXIMOS PASSOS

### 5.1. Documentação
- [x] Detalhar todas as etapas (imagens 1–9) na seção 4. ✅ **Concluído**

### 5.2. Pontos em aberto (decidir antes/durante a implementação)
- [ ] **Índice de reajuste**: fica no Resumo ou no Produto?
- [x] **OS / Forma de fechamento**: ✅ (atualizado 19/06/2026) — ~~**OS anexada** passou a ser obrigatória para sair de **Liberados do Laboratório**~~ **(revertido em 22/07/2026: a OS deixou de ser exigida e o campo de anexar OS foi removido do Resumo)**. Na **Proposta**, o avanço depende da **Forma de fechamento** (`closing_type`): *Faturamento direto* libera o Ganho ali; *Pedido* avança para Aguardando Pedido. *(O antigo checkbox `form_answered` deixou de ser trava — virou informativo.)*
- [x] **Esconder por padrão**: ✅ decidido — esconde **Ganhos E Perdidos** por padrão (15/06/2026). Já implementado (ver 5.4).
- [x] **Dependência em Vendas**: campo "É venda ou locação" criado no board de Vendas, com trava de Ganho. ✅ **Feito** (15/06/2026).

### 5.3. Implementação — Campos
- [x] **Resumo**: `business_info` (JSON) em `service_cards` + anexos (Proposta, OS, OC) com `doc_slot`. ✅ **Feito** (15/06). ⚠️ **Enxugado em 19/06/2026**: removidos os campos herdados de Vendas (Vendedor Responsável, Tipo de Negócio, Canal de Aquisição, Detalhamento, É venda ou locação, Deve ser faturado, Aparelho recebido). Atual: Recalibração/Manutenção, Formulário enviado, **Forma de fechamento**.
- [x] **Produto (por aparelho)**: campos `[Laboratório]` (Nº Série, Modelo, Módulo de álcool, Data de próxima recalibragem). ✅ **Feito** (15/06/2026) — modelados como **sub-lista de aparelhos** dentro de cada produto (coluna JSON `aparelhos` em `service_card_products`). Decisão de modelagem: *"1 linha por produto + sub-lista de aparelhos"*.
  - [ ] **Índice de reajuste** `[Serviço]` — ainda **não implementado** (ponto em aberto 5.2: fica no Resumo ou no Produto/aparelho?).
- [x] **Dependência em Vendas**: campo "É venda ou locação" criado no board de Vendas. ✅ **Feito** (15/06/2026) — coluna `modality` em `cards`; campo no Resumo de Vendas; **trava: só permite Ganho se `modality` estiver preenchido** (`move_card`).

### 5.4. Implementação — Regras (travas)
- [x] **Trava de avanço** por etapa. ✅ **Feito** (15/06/2026) — `_validate_advance` no `move_card` (backend) bloqueia avanço sem as obrigatoriedades; frontend `handleMove` mostra a mensagem. Regras:
  > ⚠️ **Atualizado em 19/06/2026** para o funil de 7 etapas (ver matriz na seção 6). Regras vigentes:
  - **Liberados do Laboratório →**: **sem regra** — avança livre. *(A OS deixou de ser exigida e o campo de anexar OS foi removido do Resumo — 22/07/2026.)*
  - **Dados Preenchidos →**: **≥1 produto** + **≥1 serviço** + **Cliente** vinculado + **Pessoa** vinculada + **Recalibração/Manutenção** (`service_type`) preenchido.
  - **Tentativa de Contato →**: **≥1 atividade concluída nesta etapa** (qualquer tipo).
  - **Proposta → Aguardando Pedido**: **Forma de fechamento = Pedido** (`closing_type`) + **Proposta vinculada** (na aba Propostas do card).
  - **Proposta → Ganho (direto)**: **Forma de fechamento = Faturamento direto** + **Proposta vinculada** (na aba Propostas do card).
  - **Aguardando Pedido → Ganho**: **OC anexada**.
  - **Negócio Ganho / Perdido**: só pelos **botões** (stepper não move para terminais). Ao marcar, as **atividades pendentes são concluídas automaticamente — exceto follow-up**.
  - Voltar etapa é livre. **Regras só valem no funil oficial** (`SERVICE_FUNNEL_BOARD_IDS = {1}`); boards duplicados são kanban livre.
  - ⚙️ "Atividade concluída nesta etapa" = `category=atividade`, `is_completed`, concluída **após** o card entrar na etapa atual.
- [x] **Botão Ganho**: habilitado em **"Aguardando Pedido"** (caminho Pedido → exige OC) **ou** em **"Proposta"** com **Forma de fechamento = Faturamento direto** (→ exige **Proposta vinculada** na aba Propostas do card); opaco/desabilitado nas demais. ✅ **Atualizado** (19/06/2026) — `handleWin` (`ServiceCardDetails.tsx`).
- [x] **Esconder cards Ganhos e Perdidos** por padrão no board. ✅ **Já implementado** — filtro padrão "Apenas Abertos" (`fStatus="abertos"`) exclui done/lost; aparecem só via filtro (Todos/Ganhos/Perdidos).
- [x] **Motivos de Perda**: lista do board de Serviços substituída pelos 10 motivos oficiais. ✅ **Feito** (15/06/2026) — `LOSS_REASONS` em `ServiceCardDetails.tsx`.

### 5.5. Fase posterior — Automações
- [ ] Criação automática do card a partir do Ganho em Vendas (etapa 4.0).
- [ ] Avanço automático "Dados de Lab Preenchidos" → "Oportunidade Existente" (recalibração ≤ 50 dias).
- [ ] Tags dinâmicas para filtros.
- [ ] **Resgate em 90 dias**: ao perder, criar novo card após 90 dias + cadência de resgate.
- [ ] Integrações: Trello (Operações), Financeiro e Expedição (pós-Ganho).

---

## 6. MATRIZ DE REGRAS DE AVANÇO (referência rápida / roteiro de teste)

> Onde a regra é aplicada: **Backend** (`_validate_advance` no `move_card` — vale para stepper e qualquer movimento). Mensagem aparece pro usuário ao tentar mover.
> **Atualizado em 19/06/2026** com a nova estrutura do funil (7 etapas) e o caminho de fechamento (Faturamento direto × Pedido).
> ⚠️ As regras valem **apenas para o funil oficial** (`SERVICE_FUNNEL_BOARD_IDS = {1}`). Boards de serviço duplicados são kanban livre, sem regras.

| # | Transição | O que exige para avançar | Implementado | Testado |
|---|---|---|---|---|
| 1 | Liberados do Laboratório → Dados Preenchidos | **sem regra** — avança livre *(OS não é mais exigida; campo de anexar OS removido do Resumo — 22/07/2026)* | ✅ | ☐ |
| 2 | Dados Preenchidos → Tentativa de Contato | **≥1 produto** + **≥1 serviço** no card + **Empresa (Cliente)** vinculada + **Pessoa (Contato)** vinculada + **Recalibração/Manutenção** preenchido | ✅ | ☐ |
| 3 | Tentativa de Contato → Proposta | **≥1 atividade concluída nesta etapa** (qualquer tipo) | ✅ | ☐ |
| 4 | Proposta → Aguardando Pedido | **Forma de fechamento = "Pedido"** + **Proposta vinculada** (na aba Propostas do card) | ✅ | ☐ |
| 5 | Proposta → **Negócio Ganho** *(direto)* | **Forma de fechamento = "Faturamento direto"** + **Proposta vinculada** (na aba Propostas do card) · botão Ganho acende na Proposta só nesse caso | ✅ | ☐ |
| 6 | Aguardando Pedido → **Negócio Ganho** | **só pelo botão Ganho** · **OC (Ordem de Compra) anexada** | ✅ | ☐ |
| 7 | Qualquer etapa → **Negócio Perdido** | **só pelo botão Perdido** · exige **Motivo da perda** (modal) | ✅ | ☐ |

> **Forma de fechamento** (campo no Resumo): define o caminho na etapa Proposta —
> **Faturamento direto** libera o botão Ganho ali mesmo (exige **Proposta vinculada** na aba Propostas do card);
> **Pedido** obriga avançar para "Aguardando Pedido" (exige **Proposta vinculada** na aba Propostas do card) e depois o Ganho exige a OC.

### Regras gerais (valem para o funil oficial)
- **Não pode pular etapas**: o avanço é **uma etapa por vez** (o destino tem que ser a próxima etapa imediata). Tentar pular → bloqueia com a próxima etapa indicada.
- **Criar card só na lista inicial** (Liberados do Laboratório): novos cards entram sempre pela primeira etapa. O botão "Adicionar card" só aparece na lista inicial e, no modal, a lista fica travada na criação — não dá pra criar pulando etapas.
- **Voltar etapa** (mover para trás) é **livre** — sem trava (pode voltar mais de uma).
- **Stepper não move para etapas terminais** (Ganho/Perdido ficam opacos) — só pelos botões.
- Ao marcar **Ganho/Perdido**, as **atividades pendentes são concluídas automaticamente** — **exceto as de follow-up**, que permanecem pendentes (costumam ser agendadas para o futuro: marcam Perdido para não acumular e reabrem o card no dia). Vale para Vendas, SDR e Serviço.
- **"Atividade concluída nesta etapa"** = atividade `category=atividade`, marcada como concluída **depois** de o card entrar na etapa atual (não reaproveita atividade de etapa anterior).
- Esconder **Ganhos e Perdidos** do board por padrão (filtro "Apenas Abertos").

### Pendências conhecidas (a discutir / próximas fases)
- **Índice de reajuste** `[Serviço]`: ainda não implementado — definir se fica no Resumo ou no aparelho (Produto).
- **Automações** (seção 5.5): nenhuma implementada ainda.
- **Melhorias na Dashboard de Serviços** (ver seção 7).

---

## 7. DASHBOARD DE SERVIÇOS

> **Atualizado em 25/06/2026.** A dashboard de Serviço foi refeita no **mesmo padrão visual das dashboards de SDR/Vendedor** (recharts + `KpiCard` com CountUp). O **mesmo componente** (`ServiceDashboard.tsx`) atende as **duas** dashboards de serviço, parametrizado por `board`: **Serviço** = board 1 (funil oficial) · **Cobrança** = board 2.
>
> **Seleção:** na página de Dashboard há um **select** — admin/gerente veem 4 opções (**SDR · Vendedor · Serviço · Cobrança**, padrão SDR); quem tem role **serviço** vê só **Serviço · Cobrança**; SDR/Vendedor não têm select (cada um vê a sua).
>
> Backend: `service_dashboard_service.get_dashboard(start, end, boards=...)` + endpoint `GET /api/v1/service-dashboard?board=` (aceita só boards com regra; demais caem no funil padrão).

### 7.1. O que a dashboard mostra hoje *(implementado)*
- **KPIs (9):** 5 na linha de cima + 4 embaixo, mesma largura — ativos, valor de pipeline, ganhos, perdidos, valor ganho, ticket médio, taxa de ganho, atividades, **tipo de serviço** (Recalibração/Manutenção/Ambos) numa KPI.
- **Recalibrações:** vencidas + a vencer em **30 / 50 / 90 dias** + total de aparelhos (agregado do JSON `aparelhos`).
- **Evolução temporal** (gráfico recharts): ganhos / perdidos / atividades ao longo do período.
- **Funil** em gráfico (cards por etapa).
- **Ranking de colaboradores:** atividades + **recalibrações concluídas** + ganhos/perdidos.
- **Composição:** Recalibração × Manutenção × Ambos (`service_type`) e Venda × Locação (`modality`).
- **Motivos de perda.**
- *(A seção "Atenção · Riscos" foi **removida** das duas dashboards em 25/06/2026.)*

### 7.2. Ideias futuras *(ainda não feito)*
- **Taxa de conversão por etapa** (onde os negócios "vazam" no funil).
- **Tempo médio por etapa / gargalos** (onde os cards ficam mais parados).
- **Ligações válidas × não válidas** (efetividade — usa o `is_valid` das atividades de ligação).

---

## 8. BOARD DE COBRANÇA (Serviços - Atrasados)

> Board **independente** do funil oficial (id 2, "Serviços - Atrasados", chamado de **Cobrança**).
> Mesmo padrão do board principal: regras de avanço próprias, comportamento de Ganho/Perdido
> (auto-conclui atividades pendentes **exceto follow-up**) e **dashboard própria** ("Cobrança").
> **Acesso:** os mesmos do módulo de Serviço (admin, gerente e role "serviço").
> Implementação: o `_validate_advance` passa a ser **por board** — board 1 com as regras do funil
> oficial, board 2 (Cobrança) com as regras abaixo.

### 8.1. Estrutura (6 etapas)

| # | Lista | Tipo |
|---|---|---|
| 1 | Oportunidade Existente | Entrada (1ª etapa) |
| 2 | Tentativa de Contato | Ativa |
| 3 | Proposta | Ativa |
| 4 | Operações | Ativa |
| 5 | Negócio Ganho | `is_done_stage` |
| 6 | Negócio Perdido | terminal (nome "perdido") |

### 8.2. Matriz de regras de avanço

| # | Transição | O que exige para avançar |
|---|---|---|
| 1 | Oportunidade Existente → Tentativa de Contato | **≥1 produto** + **≥1 serviço** no card + **Empresa (Cliente)** vinculada + **Pessoa (Contato)** vinculada + **Tipo de cobrança** (`collection_type`) selecionado |
| 2 | Tentativa de Contato → Proposta | **≥1 atividade concluída nesta etapa** (qualquer tipo) + **Recalibração/Manutenção** (`service_type`) preenchido |
| 3 | Proposta → Operações | **Proposta vinculada** (na aba Propostas do card) + **Formulário enviado** (checkbox `form_answered`) |
| 4 | Operações → **Negócio Ganho** | botão Ganho acende em **Operações** · **Confirmação de envio = "Sim"** (`business_info.shipping_confirmed`, no Resumo → Informações de Negócio) |
| 5 | → **Negócio Perdido** | só pelo botão Perdido · **Motivo da perda** (modal) |

### 8.3. Regras gerais
- **Não pode pular etapas** (uma por vez); voltar é livre.
- **Criar card só na lista inicial** (Oportunidade Existente).
- **Ganho/Perdido** só pelos botões; ao marcar, conclui atividades pendentes **exceto follow-up**.

### 8.3.1. Tipo de cobrança *(exclusivo do board de Cobrança — adicionado 01/07/2026)*
Campo no **Resumo → Informações de Negócio** (`business_info.collection_type`), só aparece no board de Cobrança:
- **Aparelhos a vencer** (`a_vencer`) → tag **azul** "A vencer" no card.
- **Aparelhos atrasados** (`atrasados`) → tag **laranja** "Atrasados" no card.

É **obrigatório** para avançar de **Oportunidade Existente → Tentativa de Contato** (ver matriz 8.2, regra 1). Há também um **filtro** no board de Cobrança (Todos / A vencer / Atrasados / Sem tipo de cobrança).

### 8.3.2. Confirmação de envio *(exclusivo do board de Cobrança — adicionado 21/07/2026)*
Campo no **Resumo → Informações de Negócio** (`business_info.shipping_confirmed`), só aparece no board de Cobrança, na seção **Operações**: **Sim** (`sim`) / **Não** (`nao`) / Não definido.

É **obrigatório** estar como **"Sim"** para marcar o negócio como **Ganho** na etapa **Operações** (ver matriz 8.2, regra 4). A trava é aplicada no backend (`_validate_advance`) e há uma pré-checagem no frontend (`handleWin`) que avisa antes de tentar.

### 8.4. Dashboard "Cobrança" *(implementada — 25/06/2026)*
- ✅ Usa o **mesmo componente** da dashboard de Serviço (`ServiceDashboard.tsx`), filtrando o **board 2** (`board=2`). Conteúdo e layout idênticos aos descritos na [seção 7.1](#71-o-que-a-dashboard-mostra-hoje-implementado).
- ✅ Acessível pelo **select** de dashboard (opção "Cobrança") para admin/gerente e role "serviço".

### 8.5. Pendências
- [x] Regra de avanço **Operações → Ganho** — exige **Confirmação de envio = "Sim"** (`business_info.shipping_confirmed`), editável no Resumo → Informações de Negócio (só no board de Cobrança). *(implementado 21/07/2026; validação em `_validate_advance` + pré-checagem no `handleWin`.)*
