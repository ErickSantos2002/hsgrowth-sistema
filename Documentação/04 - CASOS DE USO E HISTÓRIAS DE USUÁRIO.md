# 04 - CASOS DE USO E HISTÓRIAS DE USUÁRIO

## 1. INTRODUÇÃO

Este documento descreve os principais casos de uso e histórias de usuário do sistema HSGrowth CRM. Os casos de uso representam interações entre atores (usuários) e o sistema, enquanto as histórias de usuário descrevem funcionalidades do ponto de vista do usuário.

---

## 2. ATORES DO SISTEMA

| Ator | Descrição | Exemplos de Ações |
|------|-----------|-------------------|
| **Vendedor** | Usuário que gerencia cartões de vendas | Criar cartão, mover entre listas, visualizar KPIs pessoais |
| **Gerente** | Usuário que supervisiona vendedores | Criar quadros, gerenciar campos, visualizar relatórios, atribuir cartões |
| **Administrador** | Usuário com acesso total | Gerenciar usuários, configurar integrações, acessar logs, fazer backups |
| **Sistema Externo** | Aplicação que integra com CRM | Enviar leads via API, receber webhooks |
| **Usuário Não Autenticado** | Pessoa sem acesso | Acessar página de login |

---

## 3. CASOS DE USO PRINCIPAIS

### CU-001: Autenticar Usuário (Vendedor)

**Ator Primário**: Vendedor

**Pré-condições**:
- Usuário possui conta criada no sistema
- Usuário não está autenticado

**Fluxo Principal**:
1. Usuário acessa página de login
2. Insere e-mail/username
3. Insere senha
4. Clica em \"Entrar\"
5. Sistema valida credenciais
6. Sistema gera JWT token
7. Sistema redireciona para dashboard
8. Usuário está autenticado

**Fluxo Alternativo (Credenciais Inválidas)**:
- Em 5: Se credenciais inválidas, exibe mensagem de erro
- Usuário pode tentar novamente

**Fluxo Alternativo (Esqueceu Senha)**:
- Em 3: Usuário clica em \"Esqueci minha senha\"
- Sistema envia link de recuperação por e-mail
- Usuário clica no link
- Usuário define nova senha
- Usuário faz login com nova senha

**Pós-condições**:
- Usuário está autenticado
- JWT token é armazenado no cliente
- Usuário tem acesso ao dashboard

**Prioridade**: CRÍTICA

---

### CU-002: Autenticar Sistema Externo

**Ator Primário**: Sistema Externo (ex: site, RDStation)

**Pré-condições**:
- Sistema externo possui Client ID e Client Secret
- Sistema externo não está autenticado

**Fluxo Principal**:
1. Sistema externo envia POST para `/auth/client-credentials`
2. Envia Client ID e Client Secret
3. API valida credenciais
4. API gera JWT token com escopo limitado
5. API retorna token
6. Sistema externo armazena token
7. Sistema externo pode fazer requisições autenticadas

**Fluxo Alternativo (Credenciais Inválidas)**:
- Em 3: Se credenciais inválidas, retorna erro 401
- Sistema externo pode tentar novamente

**Pós-condições**:
- Sistema externo está autenticado
- JWT token é válido por 1 hora
- Sistema externo pode enviar dados via API

**Prioridade**: CRÍTICA

---

### CU-003: Criar Quadro

**Ator Primário**: Gerente

**Pré-condições**:
- Usuário está autenticado
- Usuário tem permissão para criar quadros

**Fluxo Principal**:
1. Usuário acessa página principal
2. Clica em \"Novo Quadro\"
3. Insere nome do quadro (ex: \"Vendas Q1 2026\")
4. Insere descrição (opcional)
5. Seleciona cor do quadro
6. Seleciona tipo de visualização (Kanban, Lista, Calendário)
7. Clica em \"Criar\"
8. Sistema cria quadro vazio
9. Sistema redireciona para quadro
10. Quadro aparece na lista de quadros

**Fluxo Alternativo (Validação Falha)**:
- Em 7: Se nome está vazio, exibe erro
- Usuário pode corrigir e tentar novamente

**Pós-condições**:
- Novo quadro foi criado
- Quadro está vazio (sem listas ou cartões)
- Criador é o proprietário
- Quadro aparece no dashboard

**Prioridade**: CRÍTICA

---

### CU-004: Criar Campos Customizados

**Ator Primário**: Gerente

**Pré-condições**:
- Usuário está autenticado
- Usuário tem permissão para criar campos
- Quadro foi criado

**Fluxo Principal**:
1. Usuário acessa quadro
2. Clica em \"Configurar Campos\"
3. Clica em \"Novo Campo\"
4. Seleciona tipo de campo (ex: \"Texto\")
5. Insere nome do campo (ex: \"Nome do Cliente\")
6. Insere descrição (opcional)
7. Define se é obrigatório
8. Define valor padrão (opcional)
9. Clica em \"Criar\"
10. Campo é criado
11. Campo aparece em novos cartões

**Fluxo Alternativo (Múltiplos Campos)**:
- Usuário repete passos 3-10 para cada campo
- Exemplo de campos: Nome, Email, Telefone, Valor, Data de Vencimento

**Pós-condições**:
- Novos campos foram criados
- Campos aparecem em formulário de criação de cartão
- Cartões existentes recebem valores padrão

**Prioridade**: CRÍTICA

---

### CU-005: Criar Cartão

**Ator Primário**: Vendedor

**Pré-condições**:
- Usuário está autenticado
- Quadro foi criado
- Campos foram configurados
- Listas foram criadas

**Fluxo Principal**:
1. Usuário acessa quadro
2. Clica em \"Novo Cartão\" ou \"+ Adicionar Cartão\" em uma lista
3. Formulário abre com campos customizados
4. Usuário preenche campos:
   - Nome do Cliente
   - Email
   - Telefone
   - Valor da Oportunidade
   - Data de Vencimento
5. Clica em \"Criar\"
6. Cartão é criado
7. Cartão aparece na lista
8. Cartão recebe ID único

**Fluxo Alternativo (Validação Falha)**:
- Em 5: Se campo obrigatório está vazio, exibe erro
- Usuário pode corrigir e tentar novamente

**Fluxo Alternativo (Criar e Continuar)**:
- Em 5: Usuário clica em \"Criar e Novo\"
- Cartão é criado
- Formulário é limpo para novo cartão

**Pós-condições**:
- Novo cartão foi criado
- Cartão aparece na lista especificada
- Criador é automaticamente o responsável
- Timestamp de criação é registrado

**Prioridade**: CRÍTICA

---

### CU-006: Mover Cartão entre Listas

**Ator Primário**: Vendedor

**Pré-condições**:
- Usuário está autenticado
- Quadro está aberto em visualização Kanban
- Cartão existe em uma lista
- Múltiplas listas existem

**Fluxo Principal**:
1. Usuário visualiza quadro em Kanban
2. Usuário arrasta cartão de uma lista para outra
3. Sistema detecta movimento
4. Cartão é movido para nova lista
5. Status do cartão é atualizado
6. Timestamp de movimento é registrado
7. Histórico de movimento é mantido

**Fluxo Alternativo (Movimento Inválido)**:
- Em 2: Se usuário não tem permissão, movimento é bloqueado
- Mensagem de erro é exibida

**Pós-condições**:
- Cartão está em nova lista
- Status foi atualizado
- Movimento foi registrado em histórico
- Notificação pode ser enviada (se configurado)

**Prioridade**: CRÍTICA

---

### CU-007: Buscar e Filtrar Cartões

**Ator Primário**: Vendedor

**Pré-condições**:
- Usuário está autenticado
- Quadro está aberto
- Múltiplos cartões existem

**Fluxo Principal**:
1. Usuário visualiza quadro
2. Usuário clica em campo de busca
3. Usuário digita termo de busca (ex: \"João Silva\")
4. Sistema busca em tempo real
5. Cartões são filtrados para mostrar apenas resultados
6. Usuário vê cartões relevantes

**Fluxo Alternativo (Filtros Avançados)**:
1. Usuário clica em \"Filtros\"
2. Painel de filtros abre
3. Usuário seleciona filtros:
   - Responsável: \"João\"
   - Data de Vencimento: \"Próximos 7 dias\"
   - Status: \"Em Negociação\"
4. Usuário clica em \"Aplicar\"
5. Cartões são filtrados

**Fluxo Alternativo (Salvar Visualização)**:
1. Usuário aplica filtros
2. Usuário clica em \"Salvar Visualização\"
3. Usuário insere nome (ex: \"Meus Cartões - Próximos 7 dias\")
4. Visualização é salva
5. Usuário pode carregar visualização com um clique

**Pós-condições**:
- Cartões são filtrados conforme critérios
- Busca é rápida (< 500ms)
- Visualizações salvas estão disponíveis

**Prioridade**: ALTA

---

### CU-008: Importar Dados do Pipedrive

**Ator Primário**: Administrador

**Pré-condições**:
- Usuário está autenticado
- Usuário tem permissão para importar
- Arquivo CSV do Pipedrive está disponível

**Fluxo Principal**:
1. Usuário acessa página de importação
2. Clica em \"Selecionar Arquivo\"
3. Seleciona arquivo CSV do Pipedrive
4. Sistema exibe preview dos dados
5. Usuário mapeia colunas CSV para campos do CRM:
   - \"Deal Name\" → \"Nome do Cartão\"
   - \"Person Name\" → \"Nome do Cliente\"
   - \"Value\" → \"Valor da Oportunidade\"
6. Usuário clica em \"Validar\"
7. Sistema valida dados
8. Sistema exibe relatório de validação
9. Usuário clica em \"Importar\"
10. Dados são importados
11. Relatório de importação é gerado

**Fluxo Alternativo (Validação Falha)**:
- Em 7: Se dados inválidos, sistema exibe erros
- Usuário pode corrigir arquivo e tentar novamente

**Fluxo Alternativo (Mapeamento Automático)**:
- Em 5: Sistema tenta mapear automaticamente por nome similar
- Usuário pode aceitar ou ajustar

**Pós-condições**:
- Dados foram importados com sucesso
- Cartões foram criados
- Relatório de importação está disponível
- Histórico de importação foi registrado

**Prioridade**: CRÍTICA

---

### CU-009: Enviar Cartão via API

**Ator Primário**: Sistema Externo

**Pré-condições**:
- Sistema externo está autenticado
- Sistema externo tem Client ID e Client Secret
- Quadro foi criado no CRM

**Fluxo Principal**:
1. Sistema externo prepara dados do cartão (ex: novo lead)
2. Sistema externo envia POST para `/api/v1/cards`
3. Envia JWT token na header
4. Envia dados do cartão em JSON
5. API valida dados
6. API cria cartão no quadro especificado
7. API retorna ID do cartão criado
8. Sistema externo recebe resposta com sucesso

**Fluxo Alternativo (Distribuição em Rodízio)**:
- Em 4: Sistema externo não especifica responsável
- Em 6: API distribui cartão para próximo vendedor em rodízio
- Vendedor recebe notificação

**Fluxo Alternativo (Erro de Validação)**:
- Em 5: Se dados inválidos, API retorna erro 400
- Sistema externo pode corrigir e tentar novamente

**Pós-condições**:
- Cartão foi criado no CRM
- Cartão tem ID único
- Cartão foi atribuído a vendedor (manual ou rodízio)
- Histórico de criação foi registrado

**Prioridade**: CRÍTICA

---

### CU-010: Visualizar Dashboard de KPIs

**Ator Primário**: Gerente

**Pré-condições**:
- Usuário está autenticado
- Múltiplos cartões existem

**Fluxo Principal**:
1. Usuário acessa página de KPIs
2. Sistema calcula métricas:
   - Cartões criados hoje: 5
   - Cartões criados esta semana: 25
   - Cartões criados este mês: 100
   - Cartões concluídos no prazo: 95%
   - Cartões atrasados: 3
   - Tempo médio de conclusão: 5 dias
   - Tempo médio por fase: 1,5 dias
3. Sistema exibe gráficos:
   - Gráfico de barras: cartões por dia
   - Gráfico de pizza: distribuição por vendedor
   - Gráfico de linha: tendência de conclusão
4. Usuário pode filtrar por período
5. Usuário pode exportar relatório

**Fluxo Alternativo (Filtros)**:
- Em 4: Usuário seleciona período (ex: \"Últimos 30 dias\")
- Métricas são recalculadas

**Pós-condições**:
- KPIs são exibidos com dados atualizados
- Gráficos são interativos
- Relatório pode ser exportado

**Prioridade**: ALTA

---

### CU-011: Gerenciar Usuários

**Ator Primário**: Administrador

**Pré-condições**:
- Usuário está autenticado
- Usuário tem permissão para gerenciar usuários

**Fluxo Principal**:
1. Usuário acessa página de gerenciamento de usuários
2. Usuário vê lista de usuários
3. Usuário clica em \"Novo Usuário\"
4. Formulário abre
5. Usuário insere:
   - Nome
   - Email
   - Role (Vendedor, Gerente, Admin)
   - Status (Ativo, Inativo)
6. Usuário clica em \"Criar\"
7. Usuário é criado
8. Email de boas-vindas é enviado
9. Usuário pode fazer login

**Fluxo Alternativo (Editar Usuário)**:
1. Usuário clica em usuário na lista
2. Detalhes do usuário são exibidos
3. Usuário pode editar: nome, email, role, status
4. Usuário clica em \"Salvar\"
5. Alterações são salvas

**Fluxo Alternativo (Deletar Usuário)**:
1. Usuário clica em \"Deletar\" no usuário
2. Confirmação é exibida
3. Usuário é deletado
4. Cartões do usuário podem ser reatribuídos

**Pós-condições**:
- Usuário foi criado/editado/deletado
- Histórico foi registrado
- Notificações foram enviadas (se aplicável)

**Prioridade**: ALTA

---

### CU-012: Visualizar Dashboard de Gamificação

**Ator Primário**: Vendedor

**Pré-condições**:
- Usuário está autenticado
- Sistema de gamificação está ativo
- Vendedor realizou ações que geraram pontos

**Fluxo Principal**:
1. Vendedor acessa página de gamificação
2. Sistema calcula pontuação atual do vendedor
3. Dashboard exibe:
   - Total de pontos do vendedor
   - Posição no ranking (ex: "3º lugar")
   - Badges conquistadas
   - Gráfico de evolução de pontos
   - Próximas badges a conquistar
4. Vendedor vê comparação com média da equipe
5. Vendedor vê histórico de ações pontuadas

**Fluxo Alternativo (Filtrar Período)**:
- Em 3: Vendedor seleciona período (semanal, mensal, anual)
- Dashboard atualiza com dados do período

**Pós-condições**:
- Vendedor visualiza sua performance
- Dashboard carrega em < 1s
- Dados estão atualizados

**Prioridade**: ALTA

---

### CU-013: Visualizar Ranking de Vendedores

**Ator Primário**: Gerente

**Pré-condições**:
- Usuário está autenticado
- Sistema de gamificação está ativo
- Múltiplos vendedores existem

**Fluxo Principal**:
1. Gerente acessa página de rankings
2. Sistema exibe ranking por período:
   - Semanal
   - Mensal
   - Trimestral
   - Anual
3. Para cada período, mostra:
   - Top 3 vendedores com medalhas (🥇🥈🥉)
   - Ranking completo com: posição, nome, foto, total de pontos
4. Gerente pode clicar em vendedor para ver detalhes
5. Gerente pode exportar ranking

**Fluxo Alternativo (Visualizar Histórico)**:
- Em 2: Gerente seleciona "Rankings Anteriores"
- Sistema exibe rankings arquivados
- Gerente pode ver performance histórica

**Pós-condições**:
- Ranking atualiza em tempo real (cache de 5 min)
- Top 3 são destacados
- Histórico está disponível

**Prioridade**: ALTA

---

### CU-014: Configurar Sistema de Pontos

**Ator Primário**: Administrador

**Pré-condições**:
- Usuário está autenticado
- Usuário tem permissão de administrador

**Fluxo Principal**:
1. Admin acessa página de configuração de pontos
2. Sistema exibe lista de ações pontuáveis:
   - Criar lead: 10 pontos
   - Fazer contato: 15 pontos
   - Enviar proposta: 25 pontos
   - Fechar venda: 100 pontos
   - Transferir para especialista: 25 pontos
3. Admin clica em ação para editar
4. Admin define nova pontuação
5. Admin clica em "Salvar"
6. Sistema salva configuração
7. Mudanças afetam apenas ações futuras

**Fluxo Alternativo (Criar Badge Customizada)**:
1. Admin clica em "Criar Badge"
2. Admin insere: nome, descrição, ícone, critério
3. Badge é criada
4. Vendedores podem conquistar nova badge

**Pós-condições**:
- Configuração foi salva
- Histórico de mudanças foi registrado
- Ações futuras seguem nova pontuação

**Prioridade**: MÉDIA

---

### CU-015: Criar Automação entre Quadros

**Ator Primário**: Gerente

**Pré-condições**:
- Usuário está autenticado
- Usuário tem permissão para criar automações
- Múltiplos quadros existem

**Fluxo Principal**:
1. Gerente acessa página de automações
2. Gerente clica em "Nova Automação"
3. Gerente define trigger (gatilho):
   - "Quando cartão move para lista 'Venda Fechada' do quadro 'Vendas'"
4. Gerente define action (ação):
   - "Copiar cartão para lista 'Em Implementação' do quadro 'Pós-Venda'"
5. Gerente define mapeamento de campos:
   - Campo "Cliente" → Campo "Cliente"
   - Campo "Valor" → Campo "Valor do Contrato"
6. Gerente nomeia automação: "Vendas → Pós-Venda"
7. Gerente clica em "Salvar"
8. Automação é criada como "Inativa"
9. Gerente pode ativar quando pronto

**Fluxo Alternativo (Testar Automação)**:
- Em 7: Gerente clica em "Testar"
- Sistema executa em modo de teste
- Preview do resultado é exibido
- Gerente pode ajustar antes de ativar

**Fluxo Alternativo (Múltiplas Actions)**:
- Em 4: Gerente adiciona múltiplas ações em sequência
- Exemplo: copiar cartão + enviar notificação + atualizar campo

**Pós-condições**:
- Automação foi criada
- Automação está inativa até ser ativada
- Mapeamento de campos foi salvo

**Prioridade**: ALTA

---

### CU-016: Executar Automação Automaticamente

**Ator Primário**: Sistema

**Pré-condições**:
- Automação está ativa
- Trigger definido na automação ocorre

**Fluxo Principal**:
1. Vendedor move cartão para lista "Venda Fechada"
2. Sistema detecta movimento
3. Sistema verifica se há automações com trigger correspondente
4. Sistema encontra automação "Vendas → Pós-Venda"
5. Sistema executa automação em background:
   - Copia cartão para quadro "Pós-Venda"
   - Mapeia campos conforme configurado
   - Cria novo cartão
6. Sistema envia notificação para responsável no quadro destino
7. Sistema registra execução em histórico
8. Operação original não é bloqueada

**Fluxo Alternativo (Falha na Execução)**:
- Em 5: Se automação falhar, sistema tenta novamente (máx 3x)
- Se continuar falhando, erro é registrado
- Admin recebe notificação de falha
- Cartão original não é afetado

**Pós-condições**:
- Cartão foi copiado/movido/criado conforme automação
- Notificação foi enviada
- Execução foi registrada em log
- Performance não foi degradada

**Prioridade**: ALTA

---

### CU-017: Gerenciar Automações

**Ator Primário**: Gerente

**Pré-condições**:
- Usuário está autenticado
- Automações foram criadas

**Fluxo Principal**:
1. Gerente acessa página de automações
2. Sistema lista todas as automações com:
   - Nome
   - Status (Ativa/Inativa)
   - Trigger
   - Action
   - Última execução
   - Taxa de sucesso
3. Gerente pode:
   - Ativar/Desativar automação (toggle)
   - Editar automação
   - Duplicar automação
   - Deletar automação
4. Gerente pode visualizar histórico de execuções
5. Gerente pode filtrar por quadro ou status

**Fluxo Alternativo (Visualizar Histórico)**:
- Em 4: Gerente clica em automação
- Sistema exibe últimas 100 execuções
- Para cada execução: cartão origem, cartão destino, status, data/hora
- Se falha, exibe mensagem de erro

**Pós-condições**:
- Automações são gerenciadas
- Histórico está disponível para análise
- Taxa de sucesso é monitorada

**Prioridade**: MÉDIA

---

### CU-018: Transferir Cartão para Outro Vendedor

**Ator Primário**: Vendedor

**Pré-condições**:
- Usuário está autenticado
- Usuário possui cartões atribuídos
- Múltiplos vendedores existem

**Fluxo Principal**:
1. Vendedor abre cartão
2. Vendedor clica em "Transferir Cartão"
3. Modal abre com opções:
   - Novo responsável: dropdown com vendedores
   - Motivo: dropdown (Especialista, Rebalanceamento, Férias, Escalação, Outro)
   - Notas: campo de texto livre (opcional)
4. Vendedor seleciona novo responsável: "João Silva"
5. Vendedor seleciona motivo: "Especialista"
6. Vendedor adiciona nota: "João é especialista em vendas enterprise"
7. Vendedor clica em "Confirmar Transferência"
8. Sistema transfere cartão
9. Sistema registra transferência no histórico
10. Vendedor original ganha 25 pontos
11. Novo responsável ganha 25 pontos
12. Notificações são enviadas

**Fluxo Alternativo (Gerente Força Transferência)**:
- Em 1: Gerente pode transferir cartão de qualquer vendedor
- Mesmo fluxo se aplica
- Log registra que foi transferência administrativa

**Pós-condições**:
- Cartão foi transferido
- Histórico imutável foi registrado
- Pontos foram atribuídos
- Notificações foram enviadas
- Vendedor original mantém vínculo (para comissão futura)

**Prioridade**: ALTA

---

### CU-019: Visualizar Histórico de Transferências

**Ator Primário**: Vendedor

**Pré-condições**:
- Usuário está autenticado
- Cartão foi transferido pelo menos uma vez

**Fluxo Principal**:
1. Vendedor abre cartão
2. Vendedor clica em aba "Histórico de Transferências"
3. Sistema exibe timeline visual:
   - Vendedor Original: Maria (criou em 01/12/2025)
   - 5 dias com Maria
   - Transferido para João (05/12/2025) - Motivo: Especialista
   - 3 dias com João
   - Transferido para Pedro (08/12/2025) - Motivo: Escalação
   - Responsável Atual: Pedro (desde 08/12/2025)
4. Para cada transferência, mostra:
   - De quem → Para quem
   - Data/hora
   - Motivo
   - Quem fez a transferência
   - Notas
   - Tempo com cada vendedor
5. Timeline destaca vendedor original e atual

**Fluxo Alternativo (Rastrear Comissão)**:
- Em 3: Se cartão foi convertido em venda
- Sistema mostra distribuição de comissão:
  - Maria (original): 10%
  - João (intermediário): 5%
  - Pedro (fechou): 15%

**Pós-condições**:
- Histórico completo é exibido
- Timeline é visual e fácil de entender
- Comissões são transparentes

**Prioridade**: MÉDIA

---

### CU-020: Visualizar Relatório de Transferências

**Ator Primário**: Gerente

**Pré-condições**:
- Usuário está autenticado
- Múltiplas transferências ocorreram

**Fluxo Principal**:
1. Gerente acessa página de relatórios de transferências
2. Sistema calcula métricas:
   - Total de transferências no período: 45
   - Transferências por motivo:
     - Especialista: 20 (44%)
     - Rebalanceamento: 15 (33%)
     - Férias: 8 (18%)
     - Escalação: 2 (5%)
   - Taxa de sucesso: 85% (cartões transferidos que viraram venda)
   - Tempo médio antes de transferir: 3 dias
3. Sistema exibe gráfico de fluxo:
   - Mostra combinações mais comuns (Maria → João: 12 vezes)
   - Destaca duplas com melhor taxa de sucesso
4. Gerente pode filtrar por: período, vendedor, motivo
5. Gerente pode exportar relatório

**Fluxo Alternativo (Análise de Desempenho)**:
- Em 2: Gerente analisa qual vendedor identifica mais oportunidades
- Gerente analisa qual especialista tem maior taxa de conversão
- Insights para otimizar processo

**Pós-condições**:
- Relatório detalhado está disponível
- Insights de transferências ajudam na gestão
- Dados podem ser exportados

**Prioridade**: BAIXA

---

## 4. HISTÓRIAS DE USUÁRIO

### US-001: Como vendedor, quero visualizar meus cartões para gerenciar minhas oportunidades

**Descrição**: O vendedor precisa ver rapidamente todos os seus cartões em diferentes estágios de negociação.

**Critérios de Aceitação**:
- Vendedor acessa dashboard
- Dashboard mostra quadros disponíveis
- Vendedor clica em quadro
- Visualização Kanban mostra cartões do vendedor
- Cartões são agrupados por lista/status
- Vendedor pode filtrar por responsável (ele mesmo)
- Carregamento é rápido (< 2s)

**Prioridade**: CRÍTICA

**Pontos de História**: 5

---

### US-002: Como gerente, quero criar campos customizados para adaptar o CRM ao meu processo de vendas

**Descrição**: O gerente precisa customizar os campos dos cartões conforme o processo de vendas específico da empresa.

**Critérios de Aceitação**:
- Gerente acessa configuração de campos
- Gerente pode criar campo de tipo Texto
- Gerente pode criar campo de tipo Data
- Gerente pode criar campo de tipo Moeda
- Gerente pode definir campos como obrigatórios
- Gerente pode definir valores padrão
- Campos aparecem em novos cartões
- Cartões existentes recebem valores padrão

**Prioridade**: CRÍTICA

**Pontos de História**: 8

---

### US-003: Como vendedor, quero mover cartões entre listas para indicar progresso na negociação

**Descrição**: O vendedor precisa atualizar o status de uma oportunidade movendo o cartão para a próxima fase.

**Critérios de Aceitação**:
- Vendedor visualiza quadro em Kanban
- Vendedor arrasta cartão para outra lista
- Cartão é movido instantaneamente
- Status do cartão é atualizado
- Movimento é registrado em histórico
- Notificações podem ser enviadas (se configurado)

**Prioridade**: CRÍTICA

**Pontos de História**: 3

---

### US-004: Como administrador, quero importar dados do Pipedrive para migrar para o novo CRM

**Descrição**: O administrador precisa migrar todos os dados existentes do Pipedrive para o novo sistema.

**Critérios de Aceitação**:
- Admin acessa página de importação
- Admin seleciona arquivo CSV do Pipedrive
- Sistema exibe preview dos dados
- Admin mapeia colunas para campos
- Admin valida dados
- Admin importa dados
- Relatório de importação é gerado
- Histórico de importação é mantido

**Prioridade**: CRÍTICA

**Pontos de História**: 13

---

### US-005: Como sistema externo, quero enviar leads para o CRM via API para automatizar a entrada de dados

**Descrição**: O sistema de website/marketing precisa enviar leads automaticamente para o CRM.

**Critérios de Aceitação**:
- Sistema externo autentica com Client ID/Secret
- Sistema externo envia POST com dados do lead
- API cria cartão no CRM
- Cartão é atribuído a vendedor (manual ou rodízio)
- API retorna ID do cartão
- Histórico de criação é registrado

**Prioridade**: CRÍTICA

**Pontos de História**: 8

---

### US-006: Como vendedor, quero buscar cartões por nome do cliente para encontrar rapidamente uma oportunidade

**Descrição**: O vendedor precisa encontrar rapidamente um cartão específico entre muitos cartões.

**Critérios de Aceitação**:
- Vendedor digita termo de busca
- Sistema busca em tempo real
- Resultados aparecem em < 500ms
- Busca é case-insensitive
- Busca suporta múltiplas palavras
- Vendedor pode limpar busca

**Prioridade**: ALTA

**Pontos de História**: 5

---

### US-007: Como gerente, quero visualizar KPIs de vendas para acompanhar o desempenho da equipe

**Descrição**: O gerente precisa acompanhar métricas de vendas em tempo real.

**Critérios de Aceitação**:
- Gerente acessa dashboard de KPIs
- Dashboard mostra: cartões criados, concluídos, atrasados
- Dashboard mostra: tempo médio de conclusão
- Dashboard mostra: distribuição por vendedor
- Gráficos são interativos
- Gerente pode filtrar por período
- Dados são atualizados em tempo real

**Prioridade**: ALTA

**Pontos de História**: 8

---

### US-008: Como administrador, quero visualizar logs de auditoria para rastrear alterações no sistema

**Descrição**: O administrador precisa auditar todas as ações no sistema para conformidade e segurança.

**Critérios de Aceitação**:
- Admin acessa página de logs
- Admin vê todas as alterações com: usuário, ação, timestamp, dados
- Admin pode filtrar por usuário, ação, data
- Admin pode exportar logs
- Logs não podem ser deletados
- Retenção de logs: mínimo 1 ano

**Prioridade**: ALTA

**Pontos de História**: 5

---

### US-009: Como vendedor, quero visualizar histórico de um cartão para entender o progresso da negociação

**Descrição**: O vendedor precisa ver todas as alterações feitas em um cartão ao longo do tempo.

**Critérios de Aceitação**:
- Vendedor abre cartão
- Vendedor clica em aba \"Histórico\"
- Histórico mostra todas as alterações
- Cada alteração mostra: campo, valor anterior, valor novo, usuário, timestamp
- Histórico é em ordem cronológica (mais recente primeiro)
- Vendedor pode reverter para versão anterior (se permissão)

**Prioridade**: MÉDIA

**Pontos de História**: 5

---

### US-010: Como gerente, quero exportar relatório de vendas para compartilhar com stakeholders

**Descrição**: O gerente precisa gerar relatórios para apresentação e análise.

**Critérios de Aceitação**:
- Gerente acessa página de relatórios
- Gerente seleciona período
- Gerente seleciona filtros (vendedor, quadro, etc.)
- Gerente seleciona formato (PDF, Excel, CSV)
- Sistema gera relatório
- Relatório é baixado
- Relatório inclui: KPIs, gráficos, dados detalhados

**Prioridade**: ALTA

**Pontos de História**: 8

---

### US-011: Como vendedor, quero ver minha pontuação e ranking para me motivar a vender mais

**Descrição**: O vendedor precisa visualizar sua performance em forma de pontos e comparação com colegas para sentir-se motivado.

**Critérios de Aceitação**:
- Vendedor acessa dashboard de gamificação
- Dashboard mostra total de pontos
- Dashboard mostra posição no ranking
- Dashboard mostra badges conquistadas
- Gráfico de evolução ao longo do tempo
- Comparação com média da equipe
- Próximas badges a conquistar
- Dashboard carrega em < 1s

**Prioridade**: ALTA

**Pontos de História**: 8

---

### US-012: Como gerente, quero criar automações entre quadros para otimizar processos repetitivos

**Descrição**: O gerente precisa automatizar tarefas repetitivas como copiar cartão de vendas para pós-venda.

**Critérios de Aceitação**:
- Gerente acessa página de automações
- Gerente cria automação com trigger e action
- Gerente define mapeamento de campos
- Gerente pode testar automação antes de ativar
- Automação executa automaticamente quando trigger ocorre
- Execução é assíncrona (não bloqueia operação)
- Histórico de execuções é mantido
- Admin pode visualizar taxa de sucesso/falha

**Prioridade**: ALTA

**Pontos de História**: 13

---

### US-013: Como vendedor, quero transferir cartão para especialista para aumentar chances de conversão

**Descrição**: O vendedor precisa transferir oportunidades complexas para vendedores especializados.

**Critérios de Aceitação**:
- Vendedor abre cartão
- Vendedor clica em "Transferir"
- Vendedor seleciona novo responsável
- Vendedor seleciona motivo (Especialista, Rebalanceamento, etc)
- Vendedor pode adicionar notas
- Transferência é registrada no histórico (imutável)
- Vendedor original ganha 25 pontos
- Novo responsável ganha 25 pontos
- Ambos recebem notificações
- Se cartão virar venda, vendedor original recebe comissão parcial

**Prioridade**: ALTA

**Pontos de História**: 8

---

### US-014: Como gerente, quero visualizar ranking de vendedores para reconhecer os melhores performantes

**Descrição**: O gerente precisa visualizar quem está performando melhor para reconhecimento e incentivo.

**Critérios de Aceitação**:
- Gerente acessa página de rankings
- Rankings por período: semanal, mensal, trimestral, anual
- Top 3 vendedores destacados com medalhas
- Ranking completo mostra: posição, nome, foto, pontos
- Gerente pode ver rankings anteriores (histórico)
- Gerente pode exportar ranking
- Ranking atualiza em tempo real (cache de 5 min)

**Prioridade**: ALTA

**Pontos de História**: 5

---

### US-015: Como vendedor, quero visualizar histórico de transferências de um cartão para entender a jornada

**Descrição**: O vendedor precisa ver por quais colegas o cartão passou e por que foi transferido.

**Critérios de Aceitação**:
- Vendedor abre cartão
- Vendedor clica em "Histórico de Transferências"
- Timeline visual mostra toda a cadeia
- Para cada transferência: de quem, para quem, data, motivo, notas
- Mostra tempo que cartão ficou com cada vendedor
- Destaca vendedor original e atual
- Se cartão foi vendido, mostra distribuição de comissão

**Prioridade**: MÉDIA

**Pontos de História**: 5

---

---

**Versão**: 2.0
**Data**: Dezembro 2025
**Status**: Completo

