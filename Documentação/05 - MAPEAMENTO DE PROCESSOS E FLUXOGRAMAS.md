# 05 - MAPEAMENTO DE PROCESSOS E FLUXOGRAMAS

## 1. INTRODUÇÃO

Este documento apresenta os principais processos do sistema HSGrowth CRM através de fluxogramas e descrições detalhadas. Os processos estão organizados por módulo funcional.

---

## 2. LEGENDA DE FLUXOGRAMAS

```
┌─────────────┐ = Início/Fim do processo
│   Processo  │
└─────────────┘

┌──────────────┐
│   Ação/      │ = Ação ou atividade
│   Atividade  │
└──────────────┘

◇─────────────◇ = Decisão/Condição

→ = Fluxo
```

---

## 3. PROCESSO DE AUTENTICAÇÃO

### 3.1 Fluxo de Login - Vendedor

```
INÍCIO
  ↓
[Usuário acessa página de login]
  ↓
[Insere e-mail/username e senha]
  ↓
[Clica em \"Entrar\"]
  ↓
◇ Credenciais válidas?
  ├─ NÃO → [Exibe erro] → [Usuário tenta novamente]
  │                           ↓
  │                      ◇ Tentativas > 3?
  │                        ├─ SIM → [Bloqueia conta por 15 min]
  │                        └─ NÃO → [Volta para login]
  │
  └─ SIM → [Gera JWT token]
           ↓
        [Armazena token no cliente]
           ↓
        [Redireciona para dashboard]
           ↓
        FIM
```

### 3.2 Fluxo de Autenticação - Sistema Externo

```
INÍCIO
  ↓
[Sistema externo prepara Client ID + Client Secret]
  ↓
[Envia POST para /auth/client-credentials]
  ↓
◇ Credenciais válidas?
  ├─ NÃO → [Retorna erro 401]
  │          ↓
  │       [Sistema externo registra erro]
  │          ↓
  │       FIM (FALHA)
  │
  └─ SIM → [Gera JWT token com escopo limitado]
           ↓
        [Retorna token com expiração 1h]
           ↓
        [Sistema externo armazena token]
           ↓
        FIM (SUCESSO)
```

---

## 4. PROCESSO DE CRIAÇÃO DE CARTÃO

### 4.1 Fluxo de Criação de Cartão - Interface

```
INÍCIO
  ↓
[Usuário acessa quadro]
  ↓
[Clica em \"Novo Cartão\" ou \"+ Adicionar\"]
  ↓
[Formulário abre com campos customizados]
  ↓
[Usuário preenche campos]
  ↓
◇ Todos os campos obrigatórios preenchidos?
  ├─ NÃO → [Exibe erro] → [Usuário corrige]
  │                           ↓
  │                      [Volta para preenchimento]
  │
  └─ SIM → [Valida tipos de dados]
           ↓
        ◇ Dados válidos?
          ├─ NÃO → [Exibe erro de validação]
          │          ↓
          │       [Usuário corrige]
          │          ↓
          │       [Volta para preenchimento]
          │
          └─ SIM → [Envia POST para API]
                   ↓
                [API cria cartão no banco]
                   ↓
                [API retorna ID do cartão]
                   ↓
                [Frontend exibe sucesso]
                   ↓
                [Cartão aparece na lista]
                   ↓
                FIM (SUCESSO)
```

### 4.2 Fluxo de Criação de Cartão - API

```
INÍCIO
  ↓
[API recebe POST /api/v1/cards]
  ↓
◇ Usuário autenticado?
  ├─ NÃO → [Retorna erro 401]
  │          ↓
  │       FIM (FALHA)
  │
  └─ SIM → ◇ Usuário tem permissão?
             ├─ NÃO → [Retorna erro 403]
             │          ↓
             │       FIM (FALHA)
             │
             └─ SIM → [Valida dados recebidos]
                      ↓
                   ◇ Dados válidos?
                     ├─ NÃO → [Retorna erro 400]
                     │          ↓
                     │       FIM (FALHA)
                     │
                     └─ SIM → [Inicia transação]
                              ↓
                           [Cria cartão no banco]
                              ↓
                           ◇ Responsável especificado?
                             ├─ SIM → [Atribui responsável]
                             │
                             └─ NÃO → ◇ Rodízio ativado?
                                        ├─ SIM → [Distribui em rodízio]
                                        │          ↓
                                        │       [Atribui próximo vendedor]
                                        │
                                        └─ NÃO → [Deixa sem responsável]
                              ↓
                           [Registra em auditoria]
                              ↓
                           [Confirma transação]
                              ↓
                           [Retorna ID do cartão]
                              ↓
                           FIM (SUCESSO)
```

---

## 5. PROCESSO DE IMPORTAÇÃO DE DADOS

### 5.1 Fluxo de Importação - Pipedrive CSV

```
INÍCIO
  ↓
[Admin acessa página de importação]
  ↓
[Seleciona arquivo CSV]
  ↓
◇ Arquivo é CSV válido?
  ├─ NÃO → [Exibe erro] → [Admin seleciona outro arquivo]
  │
  └─ SIM → [Sistema lê arquivo]
           ↓
        [Exibe preview dos dados]
           ↓
        [Admin mapeia colunas CSV para campos CRM]
           ↓
        ◇ Mapeamento completo?
          ├─ NÃO → [Admin completa mapeamento]
          │
          └─ SIM → [Admin clica em \"Validar\"]
                   ↓
                [Sistema valida cada linha]
                   ↓
                ◇ Todos os dados válidos?
                  ├─ NÃO → [Exibe erros]
                  │          ↓
                  │       [Admin pode corrigir arquivo]
                  │          ↓
                  │       [Tenta novamente]
                  │
                  └─ SIM → [Admin clica em \"Importar\"]
                           ↓
                        [Inicia transação]
                           ↓
                        [Para cada linha:]
                           ├─ [Cria cartão]
                           ├─ [Cria pessoa]
                           ├─ [Cria organização]
                           └─ [Relaciona dados]
                           ↓
                        [Confirma transação]
                           ↓
                        [Gera relatório de importação]
                           ↓
                        [Exibe sucesso]
                           ↓
                        FIM (SUCESSO)
```

### 5.2 Fluxo de Importação - API

```
INÍCIO
  ↓
[Sistema externo prepara dados]
  ↓
[Envia POST para /api/v1/cards/import]
  ↓
◇ Autenticado com Client ID/Secret?
  ├─ NÃO → [Retorna erro 401]
  │          ↓
  │       FIM (FALHA)
  │
  └─ SIM → [Valida payload JSON]
           ↓
        ◇ JSON válido?
          ├─ NÃO → [Retorna erro 400]
          │          ↓
          │       FIM (FALHA)
          │
          └─ SIM → [Para cada item no array:]
                   ├─ [Valida campos obrigatórios]
                   ├─ [Valida tipos de dados]
                   └─ ◇ Válido?
                       ├─ NÃO → [Adiciona a lista de erros]
                       │
                       └─ SIM → [Adiciona a fila de criação]
                   ↓
                ◇ Há erros?
                  ├─ SIM → [Retorna erro 422 com detalhes]
                  │          ↓
                  │       FIM (FALHA PARCIAL)
                  │
                  └─ NÃO → [Inicia transação]
                           ↓
                        [Cria todos os cartões]
                           ↓
                        ◇ Rodízio ativado?
                          ├─ SIM → [Distribui cartões sem responsável]
                          │
                          └─ NÃO → [Deixa sem responsável]
                           ↓
                        [Confirma transação]
                           ↓
                        [Retorna array com IDs criados]
                           ↓
                        FIM (SUCESSO)
```

---

## 6. PROCESSO DE BUSCA E FILTRO

### 6.1 Fluxo de Busca Textual

```
INÍCIO
  ↓
[Usuário visualiza quadro]
  ↓
[Usuário clica em campo de busca]
  ↓
[Usuário digita termo]
  ↓
[Sistema detecta mudança]
  ↓
[API recebe GET /api/v1/cards/search?q=termo]
  ↓
◇ Termo vazio?
  ├─ SIM → [Retorna todos os cartões]
  │
  └─ NÃO → [Busca em campos de texto]
           ↓
        [Busca case-insensitive]
           ↓
        [Suporta múltiplas palavras com AND]
           ↓
        [Retorna resultados]
           ↓
[Frontend exibe resultados em tempo real]
           ↓
◇ Usuário quer aplicar filtros adicionais?
  ├─ SIM → [Abre painel de filtros]
  │          ↓
  │       [Usuário seleciona filtros]
  │          ↓
  │       [Combina busca + filtros]
  │
  └─ NÃO → FIM
```

### 6.2 Fluxo de Filtros Avançados

```
INÍCIO
  ↓
[Usuário clica em \"Filtros\"]
  ↓
[Painel de filtros abre]
  ↓
[Usuário seleciona filtros:]
  ├─ Responsável
  ├─ Data de Criação
  ├─ Data de Vencimento
  ├─ Etiquetas
  ├─ Status (Lista)
  └─ Campos customizados
  ↓
[Usuário clica em \"Aplicar\"]
  ↓
[API recebe GET com múltiplos parâmetros]
  ↓
[API constrói query SQL com WHERE clauses]
  ↓
[API executa query]
  ↓
[API retorna cartões filtrados]
  ↓
[Frontend exibe resultados]
  ↓
◇ Usuário quer salvar filtros?
  ├─ SIM → [Clica em \"Salvar Visualização\"]
  │          ↓
  │       [Insere nome]
  │          ↓
  │       [Visualização é salva]
  │
  └─ NÃO → FIM
```

---

## 7. PROCESSO DE MOVIMENTAÇÃO DE CARTÃO

### 7.1 Fluxo de Mover Cartão (Kanban)

```
INÍCIO
  ↓
[Usuário visualiza quadro em Kanban]
  ↓
[Usuário arrasta cartão para outra lista]
  ↓
[Frontend detecta drag-and-drop]
  ↓
[Frontend envia PUT para /api/v1/cards/{id}]
  ↓
[Envia: lista_id, posição]
  ↓
◇ Usuário tem permissão?
  ├─ NÃO → [Retorna erro 403]
  │          ↓
  │       [Frontend desfaz movimento]
  │
  └─ SIM → [Inicia transação]
           ↓
        [Atualiza lista_id do cartão]
           ↓
        [Atualiza posição do cartão]
           ↓
        [Atualiza timestamp]
           ↓
        [Registra em auditoria]
           ↓
        [Confirma transação]
           ↓
        [Retorna sucesso]
           ↓
[Frontend atualiza UI]
           ↓
[Cartão aparece em nova lista]
           ↓
◇ Notificações ativadas?
  ├─ SIM → [Envia notificação para interessados]
  │
  └─ NÃO → [Sem notificação]
           ↓
        FIM
```

---

## 8. PROCESSO DE GERAÇÃO DE RELATÓRIOS

### 8.1 Fluxo de Geração de KPIs

```
INÍCIO
  ↓
[Usuário acessa página de KPIs]
  ↓
[Frontend envia GET para /api/v1/reports/kpis]
  ↓
[Envia: período, filtros]
  ↓
[API calcula métricas:]
  ├─ SELECT COUNT(*) FROM cards WHERE created_at >= data_inicio
  ├─ SELECT COUNT(*) FROM cards WHERE status = 'concluído' AND vencimento <= hoje
  ├─ SELECT COUNT(*) FROM cards WHERE vencimento < hoje AND status != 'concluído'
  ├─ SELECT AVG(DATEDIFF(concluído_em, criado_em)) FROM cards
  └─ SELECT AVG(DATEDIFF(saiu_lista, entrou_lista)) FROM card_movements
  ↓
[API monta resposta JSON]
  ↓
[Frontend recebe dados]
  ↓
[Frontend renderiza gráficos]
  ↓
[Gráficos aparecem no dashboard]
  ↓
◇ Usuário quer exportar?
  ├─ SIM → [Clica em \"Exportar\"]
  │          ↓
  │       [Seleciona formato: PDF, Excel, CSV]
  │          ↓
  │       [Arquivo é gerado]
  │          ↓
  │       [Arquivo é baixado]
  │
  └─ NÃO → FIM
```

---

## 9. PROCESSO DE AUDITORIA

### 9.1 Fluxo de Registro de Alterações

```
INÍCIO (Qualquer alteração no sistema)
  ↓
[Ação é executada (create, update, delete)]
  ↓
[Sistema cria registro de auditoria:]
  ├─ user_id
  ├─ ação (create/update/delete)
  ├─ tabela
  ├─ registro_id
  ├─ dados_anteriores
  ├─ dados_novos
  ├─ timestamp
  └─ ip_address
  ↓
[Registro é inserido em tabela de auditoria]
  ↓
[Transação é confirmada]
  ↓
[Ação é completada]
  ↓
FIM
```

### 9.2 Fluxo de Visualização de Logs

```
INÍCIO
  ↓
[Admin acessa página de logs]
  ↓
[Frontend envia GET para /api/v1/audit-logs]
  ↓
[Envia: filtros (usuário, ação, data, tabela)]
  ↓
[API constrói query com filtros]
  ↓
[API executa query]
  ↓
[API retorna logs com paginação]
  ↓
[Frontend exibe logs em tabela]
  ↓
◇ Admin quer ver detalhes?
  ├─ SIM → [Clica em log]
  │          ↓
  │       [Modal abre com detalhes]
  │          ↓
  │       [Mostra: dados anteriores, dados novos]
  │
  └─ NÃO → ◇ Admin quer exportar?
             ├─ SIM → [Clica em \"Exportar\"]
             │          ↓
             │       [Arquivo CSV é gerado]
             │          ↓
             │       [Arquivo é baixado]
             │
             └─ NÃO → FIM
```

---

## 10. PROCESSO DE DISTRIBUIÇÃO EM RODÍZIO

### 10.1 Fluxo de Distribuição Automática

```
INÍCIO (Cartão criado via API sem responsável)
  ↓
◇ Rodízio ativado para este quadro?
  ├─ NÃO → [Cartão fica sem responsável]
  │          ↓
  │       FIM
  │
  └─ SIM → [Sistema busca próximo vendedor]
           ↓
        [Busca último vendedor que recebeu cartão]
           ↓
        [Seleciona próximo vendedor na sequência]
           ↓
        ◇ Próximo vendedor tem muitos cartões?
          ├─ SIM → [Pula para próximo]
          │
          └─ NÃO → [Atribui cartão]
           ↓
        [Atualiza cartão com responsável]
           ↓
        [Registra em auditoria]
           ↓
        [Envia notificação para vendedor]
           ↓
        FIM
```

---

## 11. PROCESSO DE GAMIFICAÇÃO

### 11.1 Fluxo de Cálculo de Pontos

```
INÍCIO (Vendedor realiza ação)
  ↓
[Ação é executada no sistema]
  ↓
◇ Ação é pontuável?
  ├─ NÃO → [Ação é concluída sem pontos]
  │          ↓
  │       FIM
  │
  └─ SIM → [Sistema identifica tipo de ação:]
           ├─ Criar lead: 10 pontos
           ├─ Fazer contato: 15 pontos
           ├─ Enviar proposta: 25 pontos
           ├─ Fechar venda: 100 pontos
           └─ Transferir para especialista: 25 pontos
           ↓
        [Busca configuração de pontos]
        ↓
        [Calcula pontos a atribuir]
        ↓
        [Inicia transação]
        ↓
        [Insere registro na tabela pontuacao]
           ├─ vendedor_id
           ├─ acao
           ├─ pontos
           ├─ cartao_id (se aplicável)
           └─ timestamp
        ↓
        [Atualiza total de pontos do vendedor]
        ↓
        [Confirma transação]
        ↓
        ◇ Configurado para mostrar parabenização?
          ├─ SIM → [Envia notificação in-app]
          │          ↓
          │       [Mostra: "Parabéns! +X pontos"]
          │
          └─ NÃO → [Sem notificação]
        ↓
        ◇ Vendedor conquistou nova badge?
          ├─ SIM → [Aciona processo de conquista de badge]
          │
          └─ NÃO → FIM
```

### 11.2 Fluxo de Atualização de Rankings

```
INÍCIO (Cron job executa a cada 5 minutos)
  ↓
[Sistema verifica se é hora de atualizar rankings]
  ↓
◇ Cache de ranking expirou?
  ├─ NÃO → [Mantém ranking em cache]
  │          ↓
  │       FIM
  │
  └─ SIM → [Para cada período (semanal, mensal, trimestral, anual):]
           ↓
        [Calcula total de pontos por vendedor no período]
           ↓
        [SELECT vendedor_id, SUM(pontos)
         FROM pontuacao
         WHERE timestamp >= inicio_periodo
         GROUP BY vendedor_id
         ORDER BY SUM(pontos) DESC]
           ↓
        [Gera ranking ordenado]
           ↓
        [Identifica Top 3 (🥇🥈🥉)]
           ↓
        [Armazena ranking em cache (TTL: 5 min)]
           ↓
        ◇ Final do período (ex: fim de semana/mês)?
          ├─ SIM → [Arquiva ranking atual]
          │          ↓
          │       [Insere em tabela rankings_historico]
          │          ↓
          │       [Envia notificação aos Top 3]
          │          ↓
          │       [Reset de pontos se configurado]
          │
          └─ NÃO → [Mantém acumulado]
        ↓
        FIM
```

### 11.3 Fluxo de Conquista de Badge

```
INÍCIO (Vendedor realiza ação ou atinge meta)
  ↓
[Sistema verifica critérios de badges]
  ↓
[Para cada badge não conquistada pelo vendedor:]
  ↓
  ◇ Critério foi atingido?
    ├─ Vendedor do Mês: Top 1 no ranking mensal
    ├─ Maior Conversão: Taxa > 80%
    ├─ Especialista: 50+ vendas fechadas
    ├─ Upsell Master: 10+ upsells
    ├─ Identificador de Oportunidades: 10+ transferências bem-sucedidas
    ├─ Trabalho em Equipe: Recebeu 10+ cartões transferidos
    └─ Distribuidor: Transferiu para 5+ colegas diferentes
    ↓
  ◇ Critério atingido?
    ├─ NÃO → [Próxima badge]
    │
    └─ SIM → [Inicia transação]
             ↓
          [Insere registro na tabela vendedor_badges]
             ├─ vendedor_id
             ├─ badge_id
             ├─ conquistado_em
             └─ timestamp
             ↓
          [Confirma transação]
             ↓
          [Envia notificação de conquista]
             ↓
          [Modal in-app: "Parabéns! Você conquistou badge X"]
             ↓
          [Badge aparece no perfil do vendedor]
             ↓
          FIM (SUCESSO)
```

---

## 12. PROCESSO DE AUTOMAÇÕES

### 12.1 Fluxo de Criação de Automação

```
INÍCIO
  ↓
[Gerente acessa página de automações]
  ↓
[Clica em "Nova Automação"]
  ↓
[Formulário abre]
  ↓
[Gerente define TRIGGER (gatilho):]
  ├─ Tipo: "Quando cartão move para lista"
  ├─ Quadro origem: "Vendas"
  └─ Lista: "Venda Fechada"
  ↓
[Gerente define ACTION (ação):]
  ├─ Tipo: "Copiar cartão"
  ├─ Quadro destino: "Pós-Venda"
  └─ Lista destino: "Em Implementação"
  ↓
[Gerente define mapeamento de campos:]
  ├─ Campo "Cliente" → Campo "Cliente"
  ├─ Campo "Valor" → Campo "Valor do Contrato"
  └─ Campos não mapeados ficam vazios
  ↓
[Gerente nomeia automação: "Vendas → Pós-Venda"]
  ↓
◇ Gerente quer testar?
  ├─ SIM → [Clica em "Testar"]
  │          ↓
  │       [Sistema executa em modo de teste]
  │          ↓
  │       [Exibe preview do resultado]
  │          ↓
  │       ◇ Resultado correto?
  │         ├─ NÃO → [Gerente ajusta configuração]
  │         │          ↓
  │         │       [Volta para definição]
  │         │
  │         └─ SIM → [Continua]
  │
  └─ NÃO → [Continua]
  ↓
[Gerente clica em "Salvar"]
  ↓
[API valida configuração]
  ↓
◇ Configuração válida?
  ├─ NÃO → [Retorna erro]
  │          ↓
  │       [Gerente corrige]
  │
  └─ SIM → [Inicia transação]
           ↓
        [Insere na tabela automacoes]
           ├─ nome
           ├─ trigger (JSON)
           ├─ action (JSON)
           ├─ mapeamento_campos (JSON)
           ├─ ativa: false (criada desativada)
           └─ timestamp
           ↓
        [Confirma transação]
           ↓
        [Retorna ID da automação]
           ↓
        [Exibe sucesso: "Automação criada (inativa)"]
           ↓
        [Gerente pode ativar quando pronto]
           ↓
        FIM
```

### 12.2 Fluxo de Execução Automática

```
INÍCIO (Vendedor move cartão)
  ↓
[Cartão é movido para lista "Venda Fechada"]
  ↓
[Sistema detecta movimento]
  ↓
[Sistema busca automações ativas com trigger correspondente]
  ↓
◇ Encontrou automações?
  ├─ NÃO → [Sem ação]
  │          ↓
  │       FIM
  │
  └─ SIM → [Para cada automação encontrada:]
           ↓
        [Adiciona à fila de execução em background]
           ↓
        [Worker assíncrono processa fila:]
           ↓
        ◇ Automação válida?
          ├─ NÃO → [Registra erro]
          │          ↓
          │       [Próxima automação]
          │
          └─ SIM → [Executa ACTION:]
                   ↓
                ◇ Tipo de action?
                  ├─ "Copiar cartão" → [Copia cartão para quadro destino]
                  ├─ "Mover cartão" → [Move cartão para quadro destino]
                  ├─ "Criar cartão" → [Cria novo cartão]
                  └─ "Enviar notificação" → [Envia notificação]
                  ↓
               [Aplica mapeamento de campos]
                  ↓
               [Inicia transação]
                  ↓
               [Executa ação no banco]
                  ↓
               ◇ Sucesso?
                 ├─ NÃO → [Rollback]
                 │          ↓
                 │       [Registra falha]
                 │          ↓
                 │       [Aciona processo de retry]
                 │
                 └─ SIM → [Confirma transação]
                          ↓
                       [Registra execução na tabela automacao_execucoes]
                          ├─ automacao_id
                          ├─ cartao_origem_id
                          ├─ cartao_destino_id (se aplicável)
                          ├─ status: "sucesso"
                          └─ timestamp
                          ↓
                       ◇ Action criou/moveu cartão?
                         ├─ SIM → [Envia notificação ao responsável destino]
                         │
                         └─ NÃO → [Sem notificação]
                          ↓
                       FIM (SUCESSO)
```

### 12.3 Fluxo de Falha e Retry

```
INÍCIO (Automação falhou)
  ↓
[Sistema registra falha]
  ↓
[Insere na tabela automacao_execucoes]
  ├─ status: "falha"
  ├─ erro_mensagem
  └─ tentativa: 1
  ↓
◇ Tentativas < 3?
  ├─ NÃO → [Desiste]
  │          ↓
  │       [Marca automação como "falha permanente"]
  │          ↓
  │       [Envia notificação para Admin]
  │          ↓
  │       [Email: "Automação X falhou após 3 tentativas"]
  │          ↓
  │       FIM (FALHA PERMANENTE)
  │
  └─ SIM → [Aguarda backoff exponencial]
           ├─ Tentativa 1: aguarda 30 segundos
           ├─ Tentativa 2: aguarda 2 minutos
           └─ Tentativa 3: aguarda 5 minutos
           ↓
        [Adiciona novamente à fila]
           ↓
        [Incrementa contador de tentativas]
           ↓
        [Executa novamente]
           ↓
        ◇ Sucesso agora?
          ├─ SIM → [Registra sucesso]
          │          ↓
          │       [status: "sucesso_apos_retry"]
          │          ↓
          │       FIM (SUCESSO)
          │
          └─ NÃO → [Volta para início do retry]
```

---

## 13. PROCESSO DE TRANSFERÊNCIAS

### 13.1 Fluxo de Transferência de Cartão

```
INÍCIO
  ↓
[Vendedor abre cartão]
  ↓
[Vendedor clica em "Transferir Cartão"]
  ↓
[Modal abre com formulário]
  ↓
[Vendedor seleciona:]
  ├─ Novo responsável: "João Silva"
  ├─ Motivo: "Especialista"
  └─ Notas: "João é especialista em vendas enterprise"
  ↓
[Vendedor clica em "Confirmar Transferência"]
  ↓
◇ Validações:
  ├─ Novo responsável é diferente do atual?
  ├─ Cartão não está em status "Venda Fechada"?
  ├─ Cartão não está em status "Perdido/Cancelado"?
  └─ Vendedor tem permissão?
  ↓
◇ Todas validações OK?
  ├─ NÃO → [Exibe erro específico]
  │          ↓
  │       [Vendedor corrige ou cancela]
  │          ↓
  │       FIM (FALHA)
  │
  └─ SIM → [Inicia transação]
           ↓
        [Insere na tabela transferencias]
           ├─ cartao_id
           ├─ de_vendedor_id (vendedor atual)
           ├─ para_vendedor_id (João)
           ├─ motivo: "Especialista"
           ├─ notas
           ├─ transferido_por_id
           ├─ timestamp
           └─ ordem_na_cadeia
           ↓
        [Atualiza cartão: responsavel_id = João]
           ↓
        [Atualiza cartão: vendedor_original_id (se primeira transferência)]
           ↓
        [Registra em auditoria]
           ↓
        [Aciona processo de cálculo de pontos:]
           ├─ Vendedor original: +25 pontos
           └─ Novo responsável (João): +25 pontos
           ↓
        [Confirma transação]
           ↓
        [Envia notificações:]
           ├─ Vendedor original: "Seu cartão X foi transferido para João"
           ├─ João: "Você recebeu novo cartão X de [vendedor]"
           └─ Gerente (se configurado): "Transferência realizada"
           ↓
        [Exibe sucesso]
           ↓
        FIM (SUCESSO)
```

### 13.2 Fluxo de Cálculo de Comissão em Cadeia

```
INÍCIO (Cartão transferido é marcado como "Venda Fechada")
  ↓
[Sistema detecta cartão fechado]
  ↓
◇ Cartão tem histórico de transferências?
  ├─ NÃO → [Comissão normal para responsável atual]
  │          ↓
  │       FIM
  │
  └─ SIM → [Busca cadeia completa de transferências]
           ↓
        [SELECT * FROM transferencias
         WHERE cartao_id = X
         ORDER BY timestamp ASC]
           ↓
        [Identifica todos os vendedores envolvidos:]
           ├─ Vendedor Original (criou/recebeu primeiro)
           ├─ Vendedores Intermediários (receberam e transferiram)
           └─ Vendedor Final (fechou a venda)
           ↓
        [Busca configuração de comissão:]
           ├─ vendedor_original_percentual: 10%
           ├─ vendedores_intermediarios_percentual: 5%
           └─ vendedor_final_percentual: 15%
           ↓
        [Calcula valor da venda]
           ↓
        [Para cada vendedor na cadeia:]
           ├─ Se vendedor_original: comissao = valor * 10%
           ├─ Se intermediário: comissao = valor * 5%
           └─ Se vendedor_final: comissao = valor * 15%
           ↓
        [Inicia transação]
           ↓
        [Para cada vendedor, insere na tabela comissoes:]
           ├─ cartao_id
           ├─ vendedor_id
           ├─ tipo: "original"/"intermediario"/"final"
           ├─ percentual
           ├─ valor_comissao
           └─ timestamp
           ↓
        [Confirma transação]
           ↓
        [Envia notificações para todos os vendedores]
           ↓
        ["Você recebeu comissão de R$ X no cartão Y"]
           ↓
        ◇ Vendedor original ganhou 50 pontos bônus?
          ├─ SIM → [Adiciona pontos bônus]
          │
          └─ NÃO → FIM
```

### 13.3 Fluxo de Visualização de Histórico

```
INÍCIO
  ↓
[Vendedor abre cartão]
  ↓
[Clica em aba "Histórico de Transferências"]
  ↓
[Frontend envia GET /api/v1/cards/{id}/transferencias]
  ↓
[API busca todas as transferências do cartão]
  ↓
[SELECT * FROM transferencias
 WHERE cartao_id = X
 ORDER BY timestamp ASC]
  ↓
◇ Cartão foi transferido?
  ├─ NÃO → [Exibe: "Nenhuma transferência"]
  │          ↓
  │       FIM
  │
  └─ SIM → [API monta timeline:]
           ↓
        [Para cada transferência, calcula:]
           ├─ Tempo que ficou com cada vendedor
           ├─ Dados de quem transferiu
           └─ Dados de quem recebeu
           ↓
        [API retorna JSON com cadeia completa]
           ↓
        [Frontend renderiza timeline visual:]
           ├─ Linha do tempo vertical
           ├─ Avatar de cada vendedor
           ├─ Setas indicando transferências
           ├─ Badges de motivo
           └─ Duração com cada vendedor
           ↓
        [Destaca vendedor original (badge "Original")]
           ↓
        [Destaca responsável atual (badge "Atual")]
           ↓
        ◇ Cartão foi convertido em venda?
          ├─ SIM → [Busca comissões]
          │          ↓
          │       [Exibe distribuição de comissão:]
          │          ├─ Maria (original): 10% = R$ 500
          │          ├─ João (intermediário): 5% = R$ 250
          │          └─ Pedro (fechou): 15% = R$ 750
          │
          └─ NÃO → [Sem informação de comissão]
           ↓
        FIM
```

---

## 14. DIAGRAMA DE FLUXO GERAL DO SISTEMA

```
┌──────────────────────────────────────────────────────────┐
│                    SISTEMA HSGrowth CRM                  │
└──────────────────────────────────────────────────────────┘

┌─────────────────┐         ┌──────────────────┐
│   Vendedor      │         │   Gerente        │
│   (Login/Senha) │         │   (Login/Senha)  │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         └───────────────┬───────────┘
                         │
                    [JWT Token]
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌─────▼────┐   ┌────▼────┐
    │Dashboard│    │ Quadros  │   │Relatórios
    └────┬────┘    └─────┬────┘   └────┬────┘
         │               │             │
    ┌────▼────────────────▼─────────────▼────┐
    │         API REST (Node.js)             │
    │  ┌──────────────────────────────────┐  │
    │  │ Autenticação, Validação, Lógica │  │
    │  └──────────────────────────────────┘  │
    └────┬────────────────────────────────────┘
         │
    ┌────▼────────────────────────────┐
    │   PostgreSQL Database            │
    │ ┌──────────────────────────────┐ │
    │ │ Cartões, Listas, Quadros     │ │
    │ │ Usuários, Permissões         │ │
    │ │ Auditoria, Logs              │ │
    │ └──────────────────────────────┘ │
    └────────────────────────────────────┘

┌──────────────────────────────────────┐
│   Sistemas Externos (API)            │
│ (Website, RDStation, WhatsApp, etc.) │
│         (Client ID/Secret)           │
└──────────────┬───────────────────────┘
               │
         [Webhooks/API]
               │
         [Cartões/Leads]
               │
         ┌─────▼──────┐
         │ Fila de    │
         │ Distribuição
         │ (Rodízio)  │
         └─────┬──────┘
               │
         [Atribuição]
               │
         ┌─────▼──────────┐
         │ Notificações   │
         │ (Email/In-app) │
         └────────────────┘
```

---

**Versão**: 2.0
**Data**: Dezembro 2025
**Status**: Completo

