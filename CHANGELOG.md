# Changelog — HSGrowth CRM

Todas as mudanças notáveis neste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.8.16] — 11/08/2026

### Corrigido
- **Serviço e Cobrança — "Parado 3d+/7d+" some dos ganhos/perdidos:** os cards nas listas **Negócio Ganho** e **Negócio Perdido** não mostram mais as etiquetas **"Parado 3d+"** e **"Parado 7d+"** (negócio fechado não deve contar tempo parado). Vale para os dois boards de Serviço.

---

## [1.8.15] — 11/08/2026

### Adicionado
- **Serviço e Cobrança — filtro "Motivo de perda":** ao filtrar por **"Apenas Perdidos"** nos boards de Serviço e de Cobrança, aparece um filtro para escolher o **motivo da perda** (igual ao dos boards de Vendas). Facilita achar os perdidos por motivo. Funciona também para os cards **já perdidos** (o motivo é lido do histórico de cada card, sem precisar reprocessar nada).
- **Serviço — novo motivo de perda "Cliente em standby":** disponível no modal de perda dos boards de Serviço e de Cobrança e no novo filtro.

---

## [1.8.14] — 11/08/2026

### Adicionado
- **Dashboard de Serviço e Cobrança — KPI "Receita ganha":** novo card com o **valor total ganho** no período (antes o valor só aparecia como legenda no card de "Ganhos"). O card de "Ganhos no período" continua mostrando a **quantidade**.
- **Dashboard de Serviço e Cobrança — alternador Perda/Ganho no gráfico:** o gráfico de "Motivos de perda" ganhou um botão **Perda / Ganho**. Em **Perda** mostra os motivos das perdas (como antes); em **Ganho** mostra os **ganhos por tipo de serviço** (Recalibração / Manutenção / Ambos) com % e quantidade.

### Alterado
- **Serviço (funil oficial) — número passa a valer mais que o anexo:** para **sair da etapa Proposta** agora basta o **Número da proposta preenchido** (novo comportamento) e, para dar **Ganho vindo de "Aguardando Pedido"**, o **Número do pedido preenchido** (campo novo, texto livre, no Resumo). Os **anexos** (Proposta e OC) passaram a ser **opcionais** — deixam de travar o avanço. *(O board de Cobrança não muda.)*

---

## [1.8.13] — 03/08/2026

### Melhorado
- **Modais não fecham mais ao clicar fora:** todas as janelas de formulário (criar/editar card de Vendas e Serviço, Cliente, Pessoa, Proposta, Enviar E-mail, etc.) agora **só fecham no botão X ou no Cancelar**. Antes, um clique acidental fora da janela fechava a modal e podia perder o que estava sendo preenchido. Aplicado de forma central, valendo para todas as modais do sistema.

---

## [1.8.12] — 03/08/2026

### Adicionado
- **Vendas — filtros "Sem vendedor" e "Sem SDR":** os filtros de **vendedor** e **SDR** dos boards de Vendas ganharam a opção **"Sem vendedor"** / **"Sem SDR"**, para localizar negócios sem responsável vinculado (ex.: os perdidos sem SDR, para resgate). Além disso, a lista de **vendedores** passa a mostrar **só quem é vendedor** e a de **SDRs só quem é SDR** (antes apareciam admin, gerente, etc.).
- **Atividades — filtro de Responsável no Serviço:** a aba **Serviço** da tela de Atividades ganhou o filtro de **Responsável** (antes só Vendedor e SDR tinham). Mostra só usuários com papel de **serviço** e fica visível para **admin, gerente e o próprio time de serviço**. Nas abas **Vendedor** e **SDR**, o filtro passou a listar **apenas** usuários do papel correspondente.
- **Vendas — filtro "Motivo de perda":** ao filtrar por **"Apenas Perdidos"** nos boards de Vendas (**Prospecção, Aquisição e Expansão**), aparece um novo filtro para escolher o **motivo da perda** (ex.: "Sem retorno", "Preço", "Descarte administrativo — erro de cadastro"). Facilita achar os perdidos que interessam num board com muitos cards.
- **Aquisição — SDR "Resgatar Negócio":** o **SDR** agora enxerga no board de **Aquisição** os negócios **perdidos que estão sem SDR vinculado** e ganha o botão **"Resgatar Negócio"**. Ao resgatar, o negócio é **clonado para a Prospecção (Lead Novo)** já vindo com o **vendedor original** e o **SDR que resgatou** vinculados; o card perdido original continua como está. Perdidos que **já têm** um SDR vinculado seguem visíveis **apenas para o próprio SDR**.

### Corrigido
- **Serviço — card novo não aparecia ao criar:** ao criar um card manualmente no board (ex.: Cobrança), ele nascia no **fim** da lista de entrada — que tem centenas de cards — e ficava invisível lá embaixo, além do aviso "Card criado!" demorar (o board inteiro era recarregado antes). Agora o card nasce no **topo** da lista, o aviso aparece **na hora** e o card surge imediatamente.

### Melhorado
- **Cards entram no topo da lista (Serviço e Vendas):** ao **criar** um card ou **avançar** de etapa, ele passa a entrar no **topo** da lista de destino (antes ia para o fim). Vale para os boards de **Serviços, Cobrança, Prospecção, Aquisição e Expansão**. Facilita achar o card recém-mexido em listas grandes. _(O resgate de negócio do SDR continua clonando para o fim da Lead Novo.)_
- **Cards parados — contagem em dias úteis:** as etiquetas **"Parado 3d+"** e **"Parado 7d+"** passam a **desconsiderar sábado e domingo**. Antes, um card parado desde **sexta** já aparecia como "Parado 3d+" na **segunda** (contava o fim de semana); agora só vira "Parado 3d+" na **quarta** (segunda/terça/quarta = 3 dias úteis). Vale para os **boards de Vendas e de Serviços** e para os **KPIs "parados" do dashboard de Vendas**. Como é calculado na hora, vale para **todos os cards** (inclusive os antigos) assim que a tela recarrega. _(O "Atrasados 3d+" do dashboard de Serviços continua em dias corridos, pois é sobre prazo de atividade vencido, não tempo sem movimentação.)_

---

## [1.8.11] — 29/07/2026

### Adicionado
- **Dashboard de Serviço — Funil "Atual / Fluxo":** novo botão no card do **Funil de serviços** para alternar entre **Atual** (o que está em cada etapa hoje) e **Fluxo** (quantos cards **entraram** em cada etapa no período filtrado). O modo Fluxo mostra a conversão do funil no período.
- **Dashboard de Serviço-Cobrança — filtro de Tipo de cobrança:** novo filtro no topo (**Todos os tipos de cobrança / Aparelhos a vencer / Aparelhos atrasados**), só na dashboard de Cobrança, que filtra toda a dashboard.
- **Serviço — motivo de perda administrativo:** novo motivo **"Descarte administrativo — erro de cadastro"**, visível **apenas para o Admin**, para dar **Perdido** em cards criados incorretamente sem apagar. Como a perda fica atribuída ao Admin (quem marcou), **não interfere** nas métricas de ganhos/perdidos do time.

### Melhorado
- **Dashboard de Serviço — filtros no topo:** o filtro de **usuário** foi movido para a **mesma linha** dos demais filtros (board, período, atualizar, exportar), nas dashes de Serviço e de Cobrança.

### Corrigido
- **Aquisição — voltar etapa:** no board de **Aquisição**, o vendedor não conseguia mover um negócio de volta para a etapa anterior (dava "Não é permitido voltar etapas pelo pipeline"). Corrigido — agora é possível **voltar 1 etapa por vez** (sem exigir nenhum campo), igual já funcionava na **Prospecção**. Pular mais de uma etapa continua bloqueado; as travas de **avanço** (proposta, follow-up, data) e os botões **Ganho/Perdido** seguem iguais.

---

## [1.8.10] — 28/07/2026

### Corrigido
- **Serviços no card — valores em reais:** ao editar um serviço, valores no formato brasileiro (ex.: **2.226,00** ou **2.500**) eram interpretados errado e viravam centavos (2,23 / 2,50). Corrigido — o **ponto** passa a ser separador de **milhar** e a **vírgula** o **decimal**, valendo para **preço, desconto, desconto global e frete**.

---

## [1.8.9] — 28/07/2026

### Adicionado
- **Dashboard de Serviço — filtro por usuário:** filtra a dashboard de **Serviço** e de **Cobrança** por um usuário. Mostra o pipeline dos negócios que ele está trabalhando (colaborador), os ganhos/perdidos que **ele marcou**, atividades no período/por tipo, evolução e motivos de perda — tudo daquele usuário. **Admin/Gerente** escolhem qualquer usuário; o **colaborador** vê só a própria dashboard (nome fixo, travado também no backend). O **Ranking de colaboradores** sempre mostra todos.

### Corrigido
- **Tempo real — dashboard com timeout ao ter várias abas abertas:** com muitas abas de board abertas, as conexões de tempo real esgotavam o limite de conexões do navegador (HTTP/1.1) e outras telas (ex.: dashboard) davam timeout. Agora a aba em segundo plano **libera a conexão** e a **reabre + re-sincroniza** ao voltar ao primeiro plano.

---

## [1.8.8] — 27/07/2026

### Adicionado
- **Cobrança — Canal de aquisição:** novo campo no **Resumo → Informações de Negócio** do board de **Cobrança**, com as opções **Importação (GestorHs)** e **Solicitação do Cliente (Inbound)**. Passa a ser **obrigatório** para avançar um card de **Oportunidade Existente → Tentativa de Contato**.

### Melhorado
- **Cobrança — Forma de fechamento removida:** o campo **Forma de fechamento** saiu do board de **Cobrança** (continua no board de **Serviço**, onde é usado nas regras da etapa Proposta).

---

## [1.8.7] — 27/07/2026

### Adicionado
- **Movimentação em tempo real:** quando alguém move um card de uma lista para outra, **todos os usuários com o mesmo board aberto veem a mudança na hora**, sem precisar atualizar a página (F5). Disponível nos boards de **Vendas** e de **Serviço**. *(Tecnicamente: SSE + Redis pub/sub; reconecta e re-sincroniza sozinho.)*

### Melhorado
- **Serviço/Cobrança — Admin e Gerente movem livre:** usuários **Administrador** e **Gerente** agora podem arrastar cards entre etapas **sem passar pelas travas de avanço** (campos obrigatórios, proposta anexada, etc.), igual já funcionava no board de **Vendas**. Os demais usuários continuam seguindo as regras do funil.

---

## [1.8.6] — 24/07/2026

### Adicionado
- **Abrir card em nova guia:** agora é possível abrir qualquer card em uma **nova aba** do navegador usando o **clique do meio do mouse** (a rolagem/bolinha) ou **Ctrl+clique** (Cmd+clique no Mac). Disponível nos boards de **Vendas** e de **Serviço**. O clique normal e o arrastar continuam funcionando como antes.

---

## [1.8.5] — 24/07/2026

### Adicionado
- **Propostas agora no GestorHS:** as propostas comerciais passam a ser **criadas e gerenciadas pelo GestorHS**. No CRM, a página **"Propostas"** foi removida da barra lateral e, no card de Serviço, a proposta agora é **anexada como documento** na seção **Documentos** do Resumo — com opções de **anexar, trocar e excluir** (mesmo padrão da OC). *(Os dados das propostas antigas continuam guardados no sistema, apenas sem tela de acesso.)*

### Melhorado
- **Valor do negócio pelos Serviços:** o **Valor do negócio** do card de Serviço voltou a ser calculado pelos **Serviços do card** (quantidade × preço − desconto). Agora com **Desconto global** (em R$ ou %) e **Frete** aplicados sobre o total dos serviços.
- **Regra de avanço:** nas etapas de **Proposta** (boards de Serviço e Cobrança), a exigência passou a ser a **Proposta anexada** (documento) no lugar da proposta vinculada — assim o funil acompanha as propostas feitas no **GestorHS**.

---

## [1.8.4] — 23/07/2026

### Corrigido
- **Exportar Cards — Motivo de perda:** a coluna "Motivo de perda" da planilha exportada vinha vazia. Agora o motivo é preenchido corretamente ao exportar os cards (inclusive os perdidos).
- **Kanban — etiqueta "Parado":** as etiquetas **"Parado 3d+"** e **"Parado 7d+"** deixaram de aparecer em cards de **Negócio Ganho** e **Negócio Perdido** — como são etapas finais, o card sempre ficaria "parado" e a etiqueta não fazia sentido ali.

---

## [1.8.3] — 23/07/2026

### Adicionado
- **Proposta — modelo de texto em "Outros itens":** novo seletor para escolher o modelo do texto padrão entre **Demais aparelhos** (padrão) e **Aparelho Phoebus** — cada um com seu conteúdo próprio (títulos, valores e códigos).
- **Proposta — Aparelho Phoebus automático:** ao criar a proposta por um card que tem um aparelho **Phoebus**, o modelo de texto já abre como **Aparelho Phoebus**, com o **Serial do Aparelho** (nº de série) e o **Número do Módulo** (campo "Módulo de álcool" do aparelho) já preenchidos a partir do card.

### Melhorado
- **Proposta — itens buscam Serviços:** na tabela "Itens de produto ou serviço", ao digitar na descrição o sistema passa a sugerir os **Serviços do catálogo** (antes sugeria produtos). Ao escolher, preenche descrição, código e preço do serviço.

### Corrigido
- **Proposta — PDF em produção:** concluída a correção que impedia a geração/visualização e o download do PDF da proposta no ambiente de produção.

---

## [1.8.2] — 22/07/2026

### Adicionado
- **Cobrança — Confirmação de envio:** novo campo no Resumo (Informações de Negócio) do board de Cobrança. Para marcar o negócio como **Ganho** na etapa **Operações**, é obrigatório que a Confirmação de envio esteja como **"Sim"**.
- **Proposta — editar dados do cliente:** botões de edição ao lado de **"Empresa / Cliente"** e **"Aos cuidados de"** permitem ajustar, **apenas naquela proposta**, os dados exibidos (nome, CNPJ, endereço, cidade/UF, e-mail, telefone e nome/e-mail da pessoa). Os dados valem no display e no PDF; **o cadastro do Cliente não é alterado**. Há um botão para restaurar os dados do cadastro.

### Melhorado
- **Serviço — filtro de produto:** o filtro de produto no board de Serviço/Cobrança agora permite selecionar **vários produtos** (múltipla seleção com caixas de seleção), mostrando os cards de qualquer um dos produtos marcados.
- **Serviço — OS não é mais exigida:** avançar de **Liberados do Laboratório → Dados Preenchidos** deixou de exigir a OS anexada, e o campo de anexar OS foi removido do Resumo (a OC continua disponível).

### Corrigido
- **Histórico do card — contagem de Atividades:** o número na aba "Atividades" agora reflete as **tarefas** exibidas na lista (antes contava cada evento — criada, concluída, editada — dando a impressão de que faltavam itens). O total de eventos aparece no detalhe.
- **Proposta — PDF em produção:** corrigida a geração/visualização e download do PDF da proposta que retornava erro no ambiente de produção.

---

## [1.8.1] — 14/07/2026

### Corrigido
- **Mensagem ao marcar Ganho/Perdido:** ao tentar marcar um negócio como Ganho (ou Perdido, ou ao reabrir), o sistema mostrava apenas um erro genérico. Agora exibe o **motivo real** — por exemplo, *"Preencha o campo 'É venda ou locação' no Resumo antes de marcar o negócio como Ganho"* — deixando claro o que falta preencher.
- **Histórico do card:** o histórico trazia apenas os eventos mais recentes e não havia como acessar os antigos. Agora o card carrega um histórico bem maior e a lista ganhou um botão **"Mostrar mais"** (e "Mostrar todos"), exibindo 10 eventos por vez com o total à vista.

---

## [1.8.0] — 09/07/2026

> **Módulo de Serviços em produção.** Esta versão libera o módulo de Serviço completo — boards, propostas comerciais e catálogo de serviços — para o time de Serviço (acesso para administrador, gerente e perfil "serviço").

### Adicionado
- **Boards de Serviço:** dois boards com funil e regras próprias — **Serviço** (funil oficial, 7 etapas) e **Cobrança** (Serviços - Atrasados, 6 etapas). Cada etapa tem obrigatoriedades para avançar, e Ganho/Perdido só pelos botões (com motivo da perda).
- **Dashboard de Serviço:** indicadores próprios (pipeline, ganhos, perdidos, ticket médio, taxa de ganho, atividades), recalibrações vencidas e a vencer (30/50/90 dias), funil, ranking de colaboradores e motivos de perda. Seleção entre as visões **Serviço** e **Cobrança**.
- **Propostas Comerciais:** novo módulo com página **"Propostas"** na barra lateral e uma seção **Propostas** dentro do card. Permite criar, editar, visualizar e excluir propostas, com **numeração automática** própria.
- **PDF da proposta:** geração do PDF com a identidade da H&S, **anexado automaticamente** ao card sempre que a proposta é criada, editada ou vinculada. Pode ser visualizado e baixado pela seção do card e pela página de Propostas.
- **Proposta a partir do card:** ao criar pelo card, a proposta já vem com **Cliente**, **Pessoa** e os **itens** preenchidos, além do texto padrão de calibração com Modelo e Aparelhos.
- **Endereço de entrega:** opção de informar um endereço de entrega diferente do de cobrança, com **busca automática pelo CEP**. No PDF, os dois endereços aparecem lado a lado.
- **Proposta compartilhada entre cards:** a mesma proposta pode ser vinculada a **vários cards e boards** (ex.: criada na Cobrança e reaproveitada no Serviço). A listagem mostra todos os cards vinculados.
- **Marcador da proposta:** classificação automática em **aprovada**, **não aprovada** ou **em aberto**, derivada da situação dos cards vinculados.
- **Histórico de versões da proposta:** a cada edição salva, a versão anterior é arquivada. Um novo ícone de histórico mostra a data, **quem alterou** e permite **visualizar e baixar o PDF** de cada versão anterior.
- **Botão "Atualizar dados" na proposta:** ao editar, repuxa do card as informações atuais de Cliente, Pessoa e itens (serviços), perguntando se deve reconstruir também o texto de Modelo/Aparelhos. As mudanças só valem após salvar — e ficam registradas no histórico.
- **Catálogo de Serviços:** nova aba **"Serviço"** na barra lateral, para cadastrar os tipos de serviço (ex.: calibração) com nome, código, preço e categoria. No card, os serviços são vinculados com quantidade, preço e desconto.

### Melhorado
- **Valor do negócio:** passa a ser a **soma dos totais das propostas vinculadas** ao card, refletido no Resumo, no card do board e na dashboard.
- **Produtos no card de Serviço:** deixam de trabalhar com valores. Agora registram apenas **quantidade de produtos e de aparelhos** (com os dados do laboratório por aparelho). Preço, desconto e condições de pagamento saíram da seção — o valor fica nas propostas.
- **Catálogo de Produtos:** removido o campo **"Valor da Calibração"**, que agora é atribuição do catálogo de Serviços.
- **Regras de avanço:** as etapas que exigiam produto passam a exigir **produto e serviço** vinculados. As etapas de Proposta passam a exigir uma **proposta vinculada ao card**, em vez de um documento anexado no Resumo.
- **Vendedor da proposta:** preenchido automaticamente com quem **criou** a proposta e não muda quando outra pessoa edita.
- **Campos da proposta:** máscaras de **CEP**, **CPF/CNPJ** e **telefone**; **Desconto** e **Frete** aceitam vírgula (padrão brasileiro); limites de tamanho nos demais campos.

---

## [1.7.36] — 26/06/2026

### Adicionado
- **Etiqueta "Parado 7d+":** cards parados há 7 dias ou mais ganham uma etiqueta e destaque em vermelho mais escuro, separando-os dos "Parado 3d+". Novo filtro de etiqueta "Parado 7d+" nos boards de Vendas e Serviço.

### Corrigido
- **Prospecção — Reunião:** a exigência de agendar reunião para avançar de "Conectado" para "Agendado" passou a valer apenas quando o aparelho Phoebus está vinculado; acessórios (bocais, impressoras, suportes) não disparam mais a regra.

### Melhorado
- **Prospecção — Empresa:** a obrigatoriedade de vincular a empresa (nome, tipo de relacionamento e segmento) passou de "Lead Novo → Prospecção" para "Prospecção → Conectado".

---

## [1.7.35] — 18/06/2026

### Adicionado
- **Negócio Ganho — Reverter (admin):** novo botão permite ao administrador desfazer um negócio marcado como Ganho, devolvendo o card para a última etapa ativa. A ação fica registrada no histórico e o negócio deixa de ser contabilizado como ganho.
- **Atividades — Visão por equipe:** administradores e gerentes podem alternar a página de Atividades entre Vendedor, SDR e Serviço, vendo as atividades de cada grupo.
- **É venda ou locação:** novo campo no Resumo do card. O negócio só pode ser marcado como Ganho depois de informar se é venda ou locação.

### Corrigido
- **Automações agendadas:** corrigido um problema no agendador que impedia as automações do tipo "agendada" de dispararem. Agora voltam a rodar normalmente.
- **Datas — Fuso horário:** corrigida a exibição de alguns horários que apareciam adiantados (em UTC em vez do horário de Brasília).

### Melhorado
- **Cards — Visual:** padronização do cabeçalho, abas, botões e da área de clique do título, deixando o card mais consistente e organizado.

---

## [1.7.34] — 29/05/2026

### Corrigido
- **Kanban — Data de fechamento:** data esperada de fechamento exibida nos cards do kanban não avançava mais um dia por conta de conversão de fuso horário incorreta.
- **Reuniões — Editar:** horário exibido no modal de edição estava 3 horas adiantado (UTC em vez de horário de Brasília). Agora mostra corretamente o horário local.

### Melhorado
- **Dashboard SDR — Reuniões Qualificadas:** passa a contar cards que entraram na etapa "Qualificação" do board Aquisição no período, em vez de depender do vendedor marcar a reunião manualmente como válida. Como Qualificação só é acessível vindo de Reunião Agendada, a métrica reflete fielmente as reuniões que avançaram no funil.

---

## [1.7.33] — 22/05/2026

### Corrigido
- **Reuniões — Responsável:** ao criar uma reunião, o sistema agora atribui corretamente ao vendedor do card em vez de quem está criando. Resolvia caso em que reuniões criadas pelo SDR ficavam no nome dele, sumindo do dashboard do vendedor.

### Melhorado
- **Reuniões — Validação:** não é mais possível agendar uma reunião em cards sem vendedor vinculado. O botão "Nova Reunião" fica desabilitado com aviso explicativo até que um vendedor seja atribuído ao card.

---

## [1.7.32] — 20/05/2026

### Adicionado
- **Reuniões — Editar:** novo botão "Editar" em reuniões pendentes abre modal pré-preenchido para corrigir título, data, hora, duração, contato e descrição.
- **Reuniões — Cancelar Reunião:** novo botão cancela o evento no Teams/Outlook e move a reunião para a seção "Reuniões canceladas" no card.
- **Reuniões — Seção de canceladas:** reuniões canceladas ficam em seção colapsável separada ao final da aba, igual ao histórico de concluídas.

### Melhorado
- **Reuniões — Confirmações:** botões "Concluir" e "Excluir" agora pedem confirmação antes de agir, evitando cliques acidentais.
- **Reuniões — Excluir:** botão só aparece em reuniões pendentes. Reuniões concluídas ou canceladas não podem ser excluídas.

---

## [1.7.31] — 19/05/2026

### Corrigido
- **Boards — Movimentação retroativa:** ao voltar um card para uma etapa anterior no board de Prospecção, a validação de campos obrigatórios não é mais exibida. As regras continuam sendo aplicadas normalmente ao avançar.

---

## [1.7.30] — 15/05/2026

### Adicionado
- **Dashboard SDR — Reuniões Reagendadas:** novo KPI no funil exibindo quantas reuniões tiveram no-show no período. Posicionado entre Reuniões Agendadas e Reuniões Qualificadas para refletir o fluxo real do funil.
- **Dashboard SDR — Funil completo:** sequência de KPI cards reorganizada para: Novos Leads → Em Prospecção → Conectados → Reuniões Agendadas → Reagendadas → Reuniões Qualificadas.

### Melhorado
- **Dashboard SDR — Taxa de Conexão:** passa a usar "Em Prospecção" como base do cálculo (Prospecção → Conectado), substituindo a base de Novos Leads.
- **Dashboard SDR — Taxa de Agendamento:** passa a usar "Em Prospecção" como base (Prospecção → Agendado), substituindo a base de Novos Leads.
- **Dashboard SDR — Seção Conversão:** ampliada de 4 para 6 cards: Lead → Prospecção, Prospecção → Conectado, Conectado → Agendado, Lead → Agendado, Prospecção → Agendado e Agendado → Ganho.

---

## [1.7.29] — 14/05/2026

### Adicionado
- **Produtos — Desconto global:** novo campo de desconto aplicado sobre o total geral, com toggle R$ ou %, painel de edição colapsável e preview em tempo real antes de salvar.
- **Produtos — Desconto por produto:** campo de desconto no modo de edição de cada produto agora suporta R$ ou %, com toggle visual.
- **Produtos — Linha de desconto total:** nova linha consolidando a soma dos descontos por produto e o desconto global.
- **Motivo de perda:** opção "Terceirizam o serviço" adicionada nos três boards (Prospecção, Aquisição e Expansão).
- **Histórico — Agrupamento por tarefa:** eventos da mesma tarefa (criação, edição, conclusão, reabertura, exclusão) agrupados em um único card colapsável. Registros anteriores ficam ocultos por padrão e podem ser expandidos clicando em "X registros anteriores".

### Melhorado
- **Produtos:** campos de valor e desconto agora aceitam vírgula como separador decimal (centavos).

---

## [1.7.28] — 06/05/2026

### Adicionado
- **Boards — Importação em lote:** novo botão "Importar" abre um assistente de 3 etapas para criar múltiplos cards via planilha .xlsx. Baixe o modelo, preencha os dados e faça upload — clientes, contatos e cards são criados automaticamente no Lead Novo do board Prospecção. Inclui prévia dos dados antes de confirmar a importação.

---

## [1.7.27] — 05/05/2026

### Adicionado
- **Reunião Teams:** ao reagendar uma tarefa do tipo Reunião, o evento no calendário do Outlook é atualizado automaticamente.
- **Clientes — Busca por CNPJ:** ao preencher o CNPJ no cadastro de cliente, os dados da empresa são buscados automaticamente na Receita Federal (BrasilAPI) e preenchidos nos campos: Razão Social, Nome Fantasia, Email, Telefone, CNAE, Logradouro, Cidade, Estado e País.

### Melhorado
- **Tarefas:** o SDR responsável pelo card agora pode editar, reagendar e concluir qualquer tarefa dele, mesmo que outro usuário tenha criado.
- **Clientes — formulário:** campo CPF/CNPJ reposicionado no topo dos Dados Principais, ocupando largura total. Cidade, Estado e País agora ficam lado a lado na seção de Endereço.

---

## [1.7.26] — 04/05/2026

### Adicionado
- **Dashboard — filtro "Mês Passado":** novo período disponível no seletor de data das dashboards SDR e Vendedor, posicionado entre "Este Mês" e "Este Trimestre".
- **Dashboard SDR — Reuniões Qualificadas:** novo KPI exibindo reuniões agendadas pelo SDR que o vendedor compareceu e marcou como concluídas no período (sem no-show).

### Melhorado
- **Dashboard SDR — Reuniões Agendadas:** passa a contar todas as reuniões enviadas ao estágio Agendado no período, incluindo as que resultaram em no-show. A diferença entre Agendadas e Qualificadas reflete os no-shows.
- **Dashboard SDR — layout dos KPI cards:** reorganizado em 5 cards na primeira linha e 4 na segunda, com preenchimento correto em telas de tablet (igual ao layout do Vendedor).

---

## [1.7.25] — 30/04/2026

### Adicionado
- **Histórico do card — Descrição e Notas:** histórico de atividades agora exibe a descrição e as anotações da tarefa com rótulos "Descrição:" e "Notas:", quando preenchidos.

### Corrigido
- **Histórico do card — task_created/task_edited:** ao criar ou editar uma tarefa, a descrição agora é salva corretamente no metadata do histórico e passa a ser exibida.

---

## [1.7.24] — 29/04/2026

### Adicionado
- **Dashboard Vendedor — Pipeline por Etapa (Prospecção):** gráfico de pipeline por etapa agora permite alternar entre o board de Aquisição e o board de Prospecção via toggle. Ambos os boards são consultados de forma independente.
- **Dashboard Vendedor — card Ganhos:** novo KPI exibindo quantidade de deals ganhos no período pelo vendedor (com contagem do dia).

### Melhorado
- **Dashboard Vendedor — layout dos KPI cards:** na tela intermediária (tablet), os 5 cards da primeira linha se reorganizam em 3 + 2, com os 2 inferiores ocupando a largura total sem deixar espaço vazio.

---

## [1.7.23] — 27/04/2026

### Adicionado
- **Exportar Cards — Período de fechamento:** novo filtro de data de fechamento no modal de exportação, baseado em `won_at`/`lost_at`. Cards sem data de fechamento são excluídos automaticamente quando o filtro está ativo.
- **Exportar Cards — novas colunas:** planilha exportada agora inclui CNPJ da empresa, nome do contato, telefone, e-mail e produto(s) vinculado(s) ao card.
- **Kanban — filtro "Criado em":** novo filtro de período baseado na data de criação do lead (hoje, ontem, esta semana, este mês, este trimestre, este ano, personalizado). Usa o mesmo critério do filtro "Período de criação" da exportação, permitindo comparar os números diretamente.

### Melhorado
- **Kanban — filtros de data:** filtro "Entrou na etapa" (`entered_at`) e filtro "Criado em" (`created_at`) coexistem na barra de filtros e podem ser combinados.

### Corrigido
- **Exportar Cards — campo removido:** campo "Cliente (busca por nome)" removido do modal de exportação.
- **Exportar Cards — dados de empresa e contato:** backend agora carrega empresa, contato e produtos no modo lista, preenchendo corretamente as novas colunas da planilha.

---

## [1.7.22] — 27/04/2026

### Melhorado
- **Cliente — CNAE:** campo agora aceita texto livre (ex: 11.22-4-01), sem máscara ou restrição de caracteres.

### Corrigido
- **Vincular cliente:** busca por CNPJ formatado (ex: 08.857) agora funciona corretamente — antes só encontrava sem pontos e barras.

---

## [1.7.21] — 27/04/2026

### Melhorado
- **Foco — atividades pendentes:** clicar em qualquer área da linha da atividade expande ou recolhe os detalhes. Antes era necessário clicar exatamente na setinha à direita.

---

## [1.7.20] — 24/04/2026

### Melhorado
- **Dashboard Vendedor — Reuniões Realizadas:** KPI renomeado de "Reuniões Agendadas" para "Reuniões Realizadas".

### Corrigido
- **Card — botão Clonar:** clone agora sempre vai para a lista "Lead Novo" no board de Prospecção, independente da etapa de origem. Impede que o clone seja criado em Negócio Ganho, Negócio Perdido ou qualquer outra etapa intermediária.
- **Card — botão Clonar:** título do clone prefixado com `[CLONE]` para identificação imediata.
- **Card — botão Clonar:** botão ocultado quando o card está em Negócio Perdido.
- **Card — botão Clonar:** SDR e Vendedor não recebem mais erro 403 ao clonar cards fora da lista "Lead Novo" — a operação de clone ignora a restrição de criação por role.
- **Dashboard Vendedor — Atividades no Período:** admin/gerente visualizando "Todos os Vendedores" exibia atividades de SDRs misturadas. Corrigido para filtrar apenas atividades de usuários com role `salesperson`.

---

## [1.7.19] — 23/04/2026

### Adicionado
- **Aquisição — etapa "Aguardando Pedido":** nova etapa entre Negociação e Negócio Ganho para leads que já decidiram comprar e aguardam a formalização do pedido. Saída apenas pelos botões Ganho ou Perdido.
- **Dashboard Vendedor — gráficos de Atividades e Canais:** dois novos gráficos na dashboard do vendedor — "Atividades no Período" (por tipo: ligação, WhatsApp, e-mail, tarefa, etc.) e "Cards por Canal" (Inbound, Outbound, Indicação, Parcerias, Eventos, Base) — ambos filtrados pelo período selecionado.
- **Dashboard Vendedor — Reuniões Realizadas:** novo card KPI "Reuniões Agendadas" exibindo reuniões concluídas pelo vendedor no período (mesmo critério das atividades: apenas concluídas).
- **Card — botão Clonar:** novo botão no header do card que cria uma cópia na mesma lista, copiando resumo, cliente, contato, produto e datas de tracking de boards. Não copia atividades, anotações nem arquivos. Registra nota automática em ambos os cards.

### Melhorado
- **Aquisição — regra Diagnóstico e Proposta → Negociação:** além de proposta em PDF e follow-up pendente, agora é obrigatório preencher a **Data esperada de fechamento** antes de avançar.

### Corrigido
- **Dashboard SDR — Reuniões Recebidas:** No-Show marcado pelo vendedor (após o card sair do board de Prospecção) agora é corretamente excluído da contagem de reuniões do SDR. Antes, apenas No-Shows marcados enquanto o card ainda estava na lista "Agendado" eram descartados.

---

## [1.7.18] — 23/04/2026

### Melhorado
- **E-mail — envio individual (mala direta):** ao enviar um e-mail para múltiplos destinatários, cada pessoa recebe seu próprio e-mail separado, sem ver os demais. Antes era enviado um único e-mail com todos os endereços visíveis no campo "Para:".

### Adicionado
- **Foco — botão "Sem e-mail":** em atividades de e-mail pendentes, novo botão cinza permite concluir a task registrando que o e-mail do contato não foi encontrado. A task fica marcada como `is_valid: false` com nota `"E-mail não encontrado"` para análise futura.

---

## [1.7.17] — 22/04/2026

### Adicionado
- **Kanban — filtro de data de entrada na lista:** novo seletor de período no painel de filtros (hoje, ontem, esta semana, este mês, este trimestre, este ano, personalizado) que filtra cards pelo momento em que entraram na lista atual, com base no histórico `CardListHistory.entered_at`.

### Melhorado
- **Kanban — barra de filtros:** filtro "Todas as listas" removido; "Qualquer entrada" movido para antes de "Qualquer fechamento"; botão "Fechar" removido — a barra fica aberta enquanto há filtros ativos.

---

## [1.7.16] — 22/04/2026

### Melhorado
- **Kanban — carregamento progressivo:** cards buscados de 100 em 100 com indicador de progresso no header ("Carregando cards… X/Y"). O board renderiza imediatamente após carregar listas; os demais cards chegam em background sem travar a UI. Boards grandes (~960 cards) ficam navegáveis em segundos.
- **Backend — filtro automático por role:** SDRs recebem apenas os cards onde são o SDR vinculado (`sdr_id`); Vendedores recebem apenas os cards onde são o responsável (`assigned_to_id`). Elimina tráfego desnecessário de dados que não seriam exibidos.

### Adicionado
- **Anotações — "Ver mais":** ao abrir um card com mais de 30 anotações, um botão "Ver mais X anotações" aparece ao fim da lista e carrega o histórico completo sob demanda, sem impactar a velocidade de carregamento inicial.

---

## [1.7.15] — 22/04/2026

### Melhorado
- **Calendário — filtro por mês visível:** atividades buscadas apenas para o intervalo do grid exibido (início da 1ª semana → fim da última semana do mês). Antes carregava todo o histórico sem filtro de data. Navegar entre meses refaz a busca com o novo intervalo automaticamente.
- **Kanban — recarregamento seletivo:** criar ou editar um card agora recarrega apenas os cards, sem recarregar board e listas. O evento de NoShow (`crm:card-moved`) também usa a rota mais leve. Reduz até 3× o volume de requisições por ação.
- **CardDetails — limites em atividades e notas:** histórico limitado a 30 atividades recentes (antes 50); notas limitadas a 30 mais recentes com contagem total. Cards com centenas de anotações carregam significativamente mais rápido.
- **Backend — N+1 eliminado no Kanban:** listas dos cards pré-carregadas em uma única query antes do loop de resposta, eliminando 1 query por card no modo completo.

---

## [1.7.14] — 17/04/2026

### Adicionado
- **Atividade E-mail — botão "Já enviado":** atividades do tipo E-mail no Foco agora exibem dois botões: "Enviar E-mail" (abre o compositor) e "Já enviado" (conclui a atividade diretamente, para quando o e-mail foi enviado por fora do sistema).

### Melhorado
- **Regras de avanço — Lead Novo → Prospecção:** removida a obrigatoriedade de nome, e-mail, cargo e área do contato nesta etapa. Agora exige apenas o contato vinculado. Os dados detalhados do contato passam a ser validados em Conectado → Agendado.
- **Regras de avanço — Prospecção → Conectado:** evidência de contato agora aceita qualquer atividade concluída (ligação, WhatsApp ou e-mail), não apenas ligação VOIP ou tarefa de ligação.
- **Regras de avanço — Conectado → Agendado:** adicionada validação de nome, e-mail, cargo e área do contato. Validação de reunião obrigatória agora considera produto "bafômetro" (antes era "Phoebus").

### Corrigido
- **Criação de atividade — tipo obrigatório:** nenhum tipo vem pré-selecionado ao abrir o formulário. O usuário deve escolher explicitamente (Ligação, Tarefa, WhatsApp, etc.) antes de salvar, evitando registros incorretos por esquecimento.
- **Filtro de SDR no Kanban — limpar filtros:** ao clicar em "Limpar filtros", o SDR volta automaticamente para o próprio filtro em vez de ficar em "Todos os SDRs" sem conseguir se reselecionar. Filtro permanece travado no próprio ID para SDRs, impedindo visualizar leads de outros SDRs.

---

## [1.7.13] — 16/04/2026

### Corrigido
- **Kanban — filtro de status:** ao selecionar "Ganhos", "Perdidos" ou "Todos" no Kanban, os cards correspondentes agora são carregados corretamente. Antes os cards ganhos/perdidos nunca apareciam pois eram sempre excluídos na busca inicial, independente do filtro selecionado.

---

## [1.7.12] — 16/04/2026

### Corrigido
- **NoShow — pipeline atualiza sem F5 (Kanban):** após marcar uma reunião como No-Show, o card é movido visualmente para a lista "Reagendamento" no Kanban em tempo real, sem necessidade de recarregar a página.
- **NoShow — pipeline atualiza sem F5 (CardDetails):** a barra de etapas dentro do próprio card também reflete a nova posição imediatamente após o No-Show, sem necessidade de F5.
- **NoShow — trigger de automação removido:** eliminada chamada `automationService.trigger(ID 12)` que era redundante (o endpoint `/noshow` já move o card) e estava hardcoded sem vínculo com automações cadastradas no sistema.
- **Dashboard — Reuniões Agendadas não conta No-Show:** cards cujas reuniões foram marcadas como No-Show são excluídos da métrica de reuniões agendadas (ranking de SDRs, total de reuniões recebidas e evolução mensal). A reunião reschdulada, se criar um card diferente, continua contando normalmente.

---

## [1.7.11] — 16/04/2026

### Adicionado
- **Edição de tipo de atividade:** no modo de edição de uma atividade no Foco, agora é possível alterar o tipo (Ligação, WhatsApp, E-mail, Tarefa, Follow Up, Prazo, Almoço, LinkedIn, Outro) sem precisar deletar e recriar a atividade.

### Melhorado
- **Kanban:** board agora carrega apenas cards ativos, excluindo ganhos e perdidos. Redução de ~96% no volume de dados (ex: board de Aquisição passou de 4.344 para ~191 cards), tornando o carregamento muito mais rápido.

---

## [1.7.10] — 15/04/2026

### Corrigido
- **NoShow:** o card agora é movido corretamente para a lista "Reagendamento" do board atual. Antes a movimentação falhava silenciosamente por depender de uma automação hardcoded (ID 12) que não existia, e a busca da lista não filtrava pelo board correto.

### Melhorado
- **NoShow:** após confirmar, a página recarrega automaticamente para refletir a nova posição do card no pipeline.

---

## [1.7.9] — 15/04/2026

### Adicionado
- **Horário por etapa na cadência:** ao configurar um template, cada etapa agora tem campo de horário (HH:MM). A task gerada automaticamente é agendada para o horário definido — permitindo separar atividades de manhã das de tarde.

---

## [1.7.8] — 15/04/2026

### Adicionado
- **Integração e-mail + cadência:** atividades do tipo E-mail criadas pela cadência aparecem no Foco com botão "Enviar E-mail". Ao clicar, o compositor abre diretamente (sem trocar de aba) e o envio conclui a tarefa automaticamente avançando a cadência.
- **Tipo E-mail no formulário de criação rápida:** agora é possível criar atividades de e-mail manualmente pelo formulário rápido no card.

### Melhorado
- **Compositor de e-mail:** modal abre instantaneamente — e-mails do contato são buscados em background com indicador de carregamento, sem travar a interface.

---

## [1.7.7] — 15/04/2026

### Corrigido
- **Indicador "Parado 3d+":** agora qualquer movimentação no histórico conta — mudança de etapa, tarefa criada/concluída ou anotação. Antes, apenas tarefas e notas eram consideradas, ignorando mudanças de etapa recentes.
- **Cards recém-adicionados ao board** nunca entram na contagem de parados, pois a entrada na etapa já conta como movimentação.

---

## [1.7.6] — 14/04/2026

### Adicionado
- **Novo tipo de atividade LinkedIn**: disponível ao criar atividades no card, com ícone e cor azul-céu em todo o sistema.
- **Conclusão Válida / Não Válida**: o botão "Concluir" foi substituído por dois botões — **Válido** (atividade realizada com sucesso) e **Não Válido** (tentativa sem resultado, ex: ligação não atendida). Ambos concluem a atividade e avançam a cadência normalmente. Gamificação pontua apenas para conclusões válidas. Badge diferenciado exibe "Concluída — Válida" ou "Concluída — Não Válida".

---

## [1.7.5] — 14/04/2026

### Corrigido
- **Seção Foco (card):** horário da atividade agora é exibido junto à data — ex: `14/04/2026 09:00` em vez de apenas `14 abr.`
- **Dashboard — Atividades no Período:** contagem corrigida para considerar apenas atividades **concluídas**, usando a data de conclusão (`completed_at`) em vez da data de criação. Anteriormente atividades pendentes e não concluídas entravam na contagem.

---

## [1.7.4] — 14/04/2026

### Adicionado
- **Sistema de Cadência Individual por Lead**: admin/gerente configura templates de cadência em Configurações → Cadências (etapas com tipo de atividade, título, descrição, prioridade e dias úteis de prazo). SDR/Vendedor inicia a cadência no card e as atividades são criadas automaticamente conforme cada etapa é concluída.
- Suporte a **pausar, retomar e cancelar** cadência: pausar suspende a criação automática; retomar cria a próxima atividade imediatamente (sem duplicatas); cancelar mantém as tarefas já criadas.
- Indicador visual de progresso da cadência no card: barra de progresso, etapa atual, badge de status (Ativa / Pausada / Concluída).
- Migração: tabelas `cadence_templates`, `cadence_steps`, `card_cadences` e coluna `card_cadence_id` em `card_tasks`.

### Melhorado
- Módulo "Cadências" (disparo de atividades em lote) renomeado para **"Disparo em Lote"** para diferenciar do novo sistema de cadência individual.

---

## [1.7.3] — 14/04/2026

### Adicionado
- Novo tipo de atividade **WhatsApp** disponível ao criar atividades — ícone e cor verde esmeralda em todo o sistema.

### Melhorado
- Calendário (aba Outlook): botão `+ Agendar` agora exibe `+ Agendar Reunião` em roxo e redireciona direto para a aba Reuniões, criando o evento no Teams automaticamente.

---

## [1.7.2] — 14/04/2026

### Corrigido
- Etiqueta "Parado 3d+" não aparece mais em cards sem histórico (recém criados ou importados). Agora só marca como parado cards que já tiveram pelo menos uma atividade ou anotação registrada.

---

## [1.7.1] — 13/04/2026

### Melhorado
- "Parado 3d+" e "Parado 7d+" recalculados: considera atividades registradas e anotações criadas no período, não mais o tempo na mesma etapa.
- Histórico do card: horário exibido ao lado da data em todos os eventos.
- Abas do card: scroll horizontal habilitado no desktop quando a janela é estreita.

### Corrigido
- Seletor de tipo de atividade exibia coluna vazia após remoção — grid ajustado para 4 colunas.

---

## [1.7.0] — 13/04/2026

### Adicionado
- Integração completa com Microsoft Teams: reunião criada no CRM gera evento no Outlook e link Teams automaticamente.
- Login com Microsoft 365 (SSO) via OAuth2.
- Seção de Calendário Outlook no card para visualizar eventos do usuário.

---

## [1.6.11] — versões anteriores

Versões anteriores não foram documentadas neste arquivo.
