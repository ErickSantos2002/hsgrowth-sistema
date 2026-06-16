# 16 - FLUXO E REGRAS DO BOARD DE SERVIÇOS

> **Documento vivo / em construção.** Estamos detalhando etapa por etapa a partir do Miro (Jornada do Cliente: HS).
> Última atualização: **15/06/2026**
> Relacionado: [15 - MÓDULO DE SERVIÇOS.md](15%20-%20MÓDULO%20DE%20SERVIÇOS.md)
> 📌 Para teste/revisão das regras de avanço, veja a **seção 6 (Matriz de Regras de Avanço)**.

---

## 1. DECISÕES GLOBAIS (confirmadas)

1. **Início tem 3 listas**: `Negócio Fechado` → `Dados de Laboratório` → `Dados de Laboratório Preenchidos`.
2. **Regra de avanço = TRAVA (hard gate)**: o card **não pode avançar** de etapa se as obrigatoriedades não estiverem preenchidas. O sistema bloqueia o movimento.
3. **Campos divididos entre Resumo e Produto**:
   - **Resumo** (nível do card): dados comerciais/negócio.
   - **Produto** (por aparelho): Nº de Série, Modelo, Módulo de álcool, Índice de reajuste, OS, Data de próxima recalibragem.
4. **Campos do aparelho são por produto**: um mesmo negócio pode ter **vários aparelhos** (ex.: 5). Cada aparelho tem seus próprios dados.
5. **Automações ficam para uma fase posterior** (criar próximo serviço em 90 dias, cadência de resgate, tags dinâmicas, integração Trello/expedição/financeiro). Aqui só **documentamos** onde elas entram.

---

## 2. ESTRUTURA DAS ETAPAS (listas do board)

| # | Lista | Tipo |
|---|---|---|
| 0 | Negócio Fechado | Entrada (vem do board de Vendas) |
| 1 | Dados de Laboratório | Ativa |
| 2 | Dados de Laboratório Preenchidos | Ativa |
| 3 | Oportunidade Existente | Ativa |
| 4 | Tentativa de Contato | Ativa |
| 5 | Proposta | Ativa |
| 6 | Operações | Ativa |
| 7 | Aguardando Pedido | Ativa |
| 8 | Negócio Ganho | `is_done_stage` |
| ❌ | Negócio Perdido | `is_lost_stage` |

> Fonte da estrutura: `backend/scripts/create_servicos_board.py`.

### 2.1. Tag "Parado 3d+" (global)

A tag de **card parado há 3 dias ou mais** **já existe** e vale para **todas as etapas de "Oportunidade Existente" até "Aguardando Pedido"**. Quando o card fica 3+ dias sem movimentação, recebe a tag (usada nos filtros do Kanban). Onde houver integração, o time é alertado automaticamente; onde não houver, o acompanhamento é manual.

---

## 3. MAPEAMENTO DE CAMPOS

### 3.1. Campos de RESUMO (nível do card)

Layout confirmado do Resumo do card de Serviço (coluna esquerda):

| Seção | Campo | Origem | Status |
|---|---|---|---|
| **Valores** | Valor do negócio (auto pelos produtos) | vem de Vendas | já existe |
| **Responsável** | Vendedor Responsável (**só leitura / informativo** — quem vendeu) | vem de Vendas | **criar** |
| **Informações de Negócio** | Tipo de Negócio (ex: Nova Venda) | vem de Vendas | **criar** |
| **Informações de Negócio** | Canal de Aquisição (ex: Inbound) | vem de Vendas | **criar** |
| **Informações de Negócio** | Canal de Aquisição – Detalhamento | vem de Vendas | **criar** |
| **Informações de Serviço** | É venda ou locação | vem de Vendas ⚠️ | **criar** |
| **Informações de Serviço** | Deve ser faturado? (aluguel) | vem de Vendas | **criar** |
| **Proposta Comercial (Serviço)** | Anexar Proposta (PDF, máx 10MB) | Serviço anexa | **criar** |
| **Documentos** | OS – Ordem de Serviço (anexo) | Serviço anexa | **criar** |
| **Documentos** | OC – Ordem de Compra (anexo) | Serviço anexa | **criar** |
| **Informações Gerais** | Criado em / Tempo no funil / ID | auto | já existe |

> ⚠️ **Dependência em Vendas**: o campo **"É venda ou locação" não existe em Vendas** hoje. Para chegar preenchido no Serviço, será preciso **criar esse campo no board de Vendas primeiro** (venda → preenche um conjunto de dados; locação → outro). A ser tratado na fase de implementação/automação.

**Cliente (Organização)** e **Pessoa (Contato)** ficam nas suas seções próprias (já existem) e virão preenchidos de Vendas — cliente/empresa não mudam.

**Cortados do Resumo de Vendas** (NÃO vão para o Serviço): Frete, Probabilidade de fechamento, Data esperada de fechamento, SDR Responsável, Tracking de Boards (Prospecção/Aquisição/Expansão), Tem Implementação, Tem Pessoas para Manusear, Rastreamento de Origem/UTMs.

#### 3.1.1. Campos adicionais no Resumo (preenchidos pelo Serviço na etapa *Oportunidade Existente*)

| Campo | Obrigatório | Observação |
|---|---|---|
| Recalibração e/ou Manutenção | ✅ sim | tipo do serviço a executar |
| Aparelho recebido pela expedição (sim/não) | ✅ sim | |
| OS (Ordem de Serviço) | ⚠️ condicional | obrigatório **se** aparelho recebido · ✅ é um **documento anexado no Resumo** |
| Índice de reajuste | ❌ não | 🔓 reajuste para o próximo ano · **local em aberto** — debater na implementação |

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

---

## 4. REGRAS POR ETAPA

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
- **Automação (futuro)**: **Atribuir Proprietário**.
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
- **Obrigatoriedade** (1 documento anexado no **Resumo**):
  1. **Proposta anexada**
- **Avanço → Proposta**: Proposta anexada.
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
  2. **Proposta anexada**
- **Avanço → Operações**: feita a atividade de follow-up **E** proposta anexada.
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
- [x] **Etapa Proposta / OS**: ✅ decidido (16/06/2026) — a **OS anexada passou a ser obrigatória** para sair de **Oportunidade Existente** (não mais condicional). Na **Proposta**, criado um **checkbox "Formulário de Coleta de Dados enviado"** (`form_answered` no `business_info`) — só avança para Operações se marcado.
- [x] **Esconder por padrão**: ✅ decidido — esconde **Ganhos E Perdidos** por padrão (15/06/2026). Já implementado (ver 5.4).
- [x] **Dependência em Vendas**: campo "É venda ou locação" criado no board de Vendas, com trava de Ganho. ✅ **Feito** (15/06/2026).

### 5.3. Implementação — Campos
- [x] **Resumo**: campos de negócio (Vendedor Responsável [leitura], Tipo de Negócio, Canal de Aquisição, Detalhamento, É venda ou locação, Deve ser faturado/aluguel) + Valor do Negócio + anexos (Proposta, OS, OC). ✅ **Feito** (15/06/2026) — coluna `business_info` (JSON) em `service_cards`; anexos com `doc_slot` nas atividades de arquivo.
- [x] **Produto (por aparelho)**: campos `[Laboratório]` (Nº Série, Modelo, Módulo de álcool, Data de próxima recalibragem). ✅ **Feito** (15/06/2026) — modelados como **sub-lista de aparelhos** dentro de cada produto (coluna JSON `aparelhos` em `service_card_products`). Decisão de modelagem: *"1 linha por produto + sub-lista de aparelhos"*.
  - [ ] **Índice de reajuste** `[Serviço]` — ainda **não implementado** (ponto em aberto 5.2: fica no Resumo ou no Produto/aparelho?).
- [x] **Dependência em Vendas**: campo "É venda ou locação" criado no board de Vendas. ✅ **Feito** (15/06/2026) — coluna `modality` em `cards`; campo no Resumo de Vendas; **trava: só permite Ganho se `modality` estiver preenchido** (`move_card`).

### 5.4. Implementação — Regras (travas)
- [x] **Trava de avanço** por etapa. ✅ **Feito** (15/06/2026) — `_validate_advance` no `move_card` (backend) bloqueia avanço sem as obrigatoriedades; frontend `handleMove` mostra a mensagem. Regras:
  - **Dados de Laboratório →**: pelo menos 1 aparelho com Nº de Série + Data de próxima recalibragem.
  - **Oportunidade Existente →**: Recalibração/Manutenção + Aparelho recebido (sim/não) + **OS anexada (obrigatória)** + **≥1 atividade concluída nesta etapa**. *(Campos novos `service_type` e `device_received` no `business_info`.)*
  - **Tentativa de Contato →**: Proposta anexada (sem atividade obrigatória).
  - **Proposta →**: Proposta anexada + **Formulário enviado (checkbox `form_answered`)** + **≥1 atividade de follow-up concluída nesta etapa**.
  - **Operações →**: **≥1 atividade de follow-up concluída nesta etapa**.
  - **→ Ganho**: OC anexada + 1 atividade de tarefa concluída.
  - **Negócio Ganho / Negócio Perdido**: só acessíveis pelos **botões Ganho/Perdido** (o stepper não move para etapas terminais). Ao marcar Ganho/Perdido, as **atividades pendentes são concluídas automaticamente** (`_complete_pending_activities`).
  - Voltar etapa é livre. **Negócio Fechado** e **Dados de Lab. Preenchidos → Oportunidade Existente** não têm trava (a 2ª é condição de 50 dias / equipamento → vira automação).
  - ⚙️ "Atividade concluída nesta etapa" = atividade `category=atividade`, `is_completed`, concluída **após** o card entrar na etapa atual (não reaproveita atividade de etapa anterior).
- [x] **Botão Ganho**: habilitado **somente** na última etapa ativa ("Aguardando Pedido"); opaco/desabilitado nas demais. Ao dar Ganho, valida: **OC anexada** + **1 atividade de tarefa concluída**. ✅ **Feito** (15/06/2026) — `getWinStage()` + travas no `handleWin` (`ServiceCardDetails.tsx`).
- [x] **Esconder cards Ganhos e Perdidos** por padrão no board. ✅ **Já implementado** — filtro padrão "Apenas Abertos" (`fStatus="abertos"`) exclui done/lost; aparecem só via filtro (Todos/Ganhos/Perdidos).
- [x] **Motivos de Perda**: lista do board de Serviços substituída pelos 10 motivos oficiais. ✅ **Feito** (15/06/2026) — `LOSS_REASONS` em `ServiceCardDetails.tsx`.

### 5.5. Fase posterior — Automações
- [ ] Criação automática do card a partir do Ganho em Vendas (etapa 4.0).
- [ ] Avanço automático "Dados de Lab Preenchidos" → "Oportunidade Existente" (recalibração ≤ 50 dias).
- [ ] Atribuir Proprietário (etapa 4.3).
- [ ] Tags dinâmicas para filtros.
- [ ] **Resgate em 90 dias**: ao perder, criar novo card após 90 dias + cadência de resgate.
- [ ] Integrações: Trello (Operações), Financeiro e Expedição (pós-Ganho).

---

## 6. MATRIZ DE REGRAS DE AVANÇO (referência rápida / roteiro de teste)

> Onde a regra é aplicada: **Backend** (`_validate_advance` no `move_card` — vale para stepper e qualquer movimento). Mensagem aparece pro usuário ao tentar mover.
> Status implementado em **15/06/2026**. Coluna "Testado" para o time preencher.

| # | Transição | O que exige para avançar | Implementado | Testado |
|---|---|---|---|---|
| 1 | Negócio Fechado → Dados de Laboratório | nada (livre) | ✅ (sem regra) | ☐ |
| 2 | Dados de Laboratório → Dados de Lab. Preenchidos | **≥1 aparelho** (qualquer produto) com **Nº de Série + Data de próxima recalibragem** | ✅ | ☐ |
| 3 | Dados de Lab. Preenchidos → Oportunidade Existente | nada por enquanto (condição: 50 dias OU equipamento recebido → vira **automação**) | ✅ (sem regra manual) | ☐ |
| 4 | Oportunidade Existente → Tentativa de Contato | **Recalibração/Manutenção** + **Aparelho recebido (sim/não)** + **OS anexada (obrigatória)** + **≥1 atividade concluída nesta etapa** | ✅ | ☐ |
| 5 | Tentativa de Contato → Proposta | **Proposta anexada** | ✅ | ☐ |
| 6 | Proposta → Operações | **Proposta anexada** + **Formulário enviado (checkbox)** + **≥1 atividade de follow-up concluída nesta etapa** | ✅ | ☐ |
| 7 | Operações → Aguardando Pedido | **≥1 atividade de follow-up concluída nesta etapa** | ✅ | ☐ |
| 8 | Aguardando Pedido → **Negócio Ganho** | **só pelo botão Ganho** · **OC anexada** + **1 atividade de tarefa concluída** · botão só acende em "Aguardando Pedido" | ✅ | ☐ |
| 9 | Qualquer etapa → **Negócio Perdido** | **só pelo botão Perdido** · exige **Motivo da perda** (modal) | ✅ | ☐ |

### Regras gerais (valem para todo o board)
- **Não pode pular etapas**: o avanço é **uma etapa por vez** (o destino tem que ser a próxima etapa imediata). Tentar pular → bloqueia com a próxima etapa indicada.
- **Voltar etapa** (mover para trás) é **livre** — sem trava (pode voltar mais de uma).
- **Stepper não move para etapas terminais** (Ganho/Perdido ficam opacos) — só pelos botões.
- Ao marcar **Ganho/Perdido**, as **atividades pendentes são concluídas automaticamente**.
- **"Atividade concluída nesta etapa"** = atividade `category=atividade`, marcada como concluída **depois** de o card entrar na etapa atual (não reaproveita atividade de etapa anterior).
- Esconder **Ganhos e Perdidos** do board por padrão (filtro "Apenas Abertos").

### Pendências conhecidas (a discutir / próximas fases)
- **Índice de reajuste** `[Serviço]`: ainda não implementado — definir se fica no Resumo ou no aparelho (Produto).
- **Etapa Proposta**: avaliar se "Formulário respondido" e "OS anexada" entram como trava extra.
- **Automações** (seção 5.5): nenhuma implementada ainda.
