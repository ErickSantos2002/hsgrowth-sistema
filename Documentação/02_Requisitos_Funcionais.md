# 02 - REQUISITOS FUNCIONAIS DETALHADOS

> **Atualização Junho/2026 (v1.7.35):** Este documento é o **registro original de requisitos** (Dez/2025) e foi preservado como referência histórica. O sistema está hoje **em produção (v1.7.35)** e evoluiu além do escopo abaixo. Módulos atualmente em produção não cobertos (ou apenas parcialmente cobertos) por estes RFs: **Módulo de Serviços** (2 boards — Funil + Cobrança — com dashboards próprias e role "Serviço"), **Ligações/VoIP** (integração API4COM) + **Avaliação de Ligações com IA**, **Integração Microsoft 365** (Outlook/Teams/e-mail/transcrições) e **Cadências de atividades**. Roles atuais em produção: **Administrador, Gerente, Vendedor, SDR, Visualizador e Serviço**.

## 1. INTRODUÇÃO

Este documento especifica todos os requisitos funcionais do sistema HSGrowth CRM. Os requisitos estão organizados por módulo/funcionalidade e seguem o padrão: cada requisito possui um identificador único (RF-XXX), descrição clara, critérios de aceitação e prioridade.

---

## 2. MÓDULO DE AUTENTICAÇÃO E AUTORIZAÇÃO

### RF-001: Autenticação de Vendedores com JWT

**Descrição**: O sistema deve permitir que vendedores internos façam login com e-mail/username e senha, recebendo um token JWT válido.

**Critérios de Aceitação**:
- Usuário insere e-mail/username e senha na página de login
- Sistema valida credenciais contra banco de dados
- Se válido, retorna JWT token com tempo de expiração (ex: 24h)
- Se inválido, exibe mensagem de erro
- Token deve conter: user_id, email, role, permissions
- Implementar refresh token para renovação sem novo login

**Prioridade**: CRÍTICA

**Relacionado a**: API, Frontend

---

### RF-002: Autenticação de Integrações Externas com Client Credentials

**Descrição**: O sistema deve permitir que sistemas externos (site, RDStation, etc.) façam autenticação usando Client ID e Client Secret.

**Critérios de Aceitação**:
- Sistema externo envia Client ID + Client Secret para endpoint `/auth/client-credentials`
- API valida credenciais
- Se válido, retorna JWT token com escopo limitado
- Token deve conter: client_id, scopes, permissions
- Token deve ter tempo de expiração (ex: 1h)
- Implementar rate limiting para prevenir abuso

**Prioridade**: CRÍTICA

**Relacionado a**: API

---

### RF-003: Logout e Revogação de Token

**Descrição**: O sistema deve permitir que usuários façam logout, revogando seu token JWT.

**Critérios de Aceitação**:
- Usuário clica em \"Sair\" no sistema
- Token é adicionado a uma blacklist
- Token revogado não pode mais ser usado
- Implementar limpeza periódica de tokens expirados

**Prioridade**: ALTA

**Relacionado a**: API, Frontend

---

### RF-004: Controle de Acesso Baseado em Roles (RBAC)

**Descrição**: O sistema deve implementar um sistema robusto de roles e permissões para controlar o que cada usuário pode fazer.

**Critérios de Aceitação**:
- Roles disponíveis: Admin, Gerente, Vendedor, Visualizador
- Cada role tem conjunto de permissões específicas
- Permissões controlam: criar, ler, editar, deletar, exportar, importar
- Vendedor só vê cartões atribuídos a ele (exceto Admin)
- Admin vê e pode gerenciar tudo
- Permissões podem ser customizadas por role
- Sistema verifica permissão antes de cada ação

**Prioridade**: CRÍTICA

**Relacionado a**: API, Frontend

---

### RF-005: Recuperação de Senha

**Descrição**: O sistema deve permitir que usuários recuperem acesso à conta caso esqueçam a senha.

**Critérios de Aceitação**:
- Usuário clica em \"Esqueci minha senha\"
- Insere e-mail registrado
- Sistema envia link de recuperação por e-mail
- Link é válido por 1 hora
- Usuário define nova senha
- Senha anterior é invalidada

**Prioridade**: MÉDIA

**Relacionado a**: API, Frontend

---

## 3. MÓDULO DE GESTÃO DE QUADROS

### RF-010: Criar Quadro

**Descrição**: Usuário com permissão deve poder criar um novo quadro (board).

**Critérios de Aceitação**:
- Usuário clica em \"Novo Quadro\"
- Insere nome, descrição e cor do quadro
- Seleciona tipo de quadro (Kanban, Lista, Calendário)
- Sistema cria quadro vazio
- Quadro aparece na lista de quadros do usuário
- Apenas Admin e Gerente podem criar quadros

**Prioridade**: CRÍTICA

**Relacionado a**: Frontend, API

---

### RF-011: Editar Quadro

**Descrição**: Usuário com permissão deve poder editar informações de um quadro existente.

**Critérios de Aceitação**:
- Usuário clica em \"Editar\" no quadro
- Pode alterar: nome, descrição, cor, tipo de visualização
- Alterações são salvas imediatamente
- Histórico de alterações é registrado

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-012: Deletar Quadro

**Descrição**: Usuário com permissão deve poder deletar um quadro.

**Critérios de Aceitação**:
- Usuário clica em \"Deletar\" no quadro
- Sistema exibe confirmação
- Se confirmado, quadro e todos seus cartões são deletados
- Ação é registrada em logs de auditoria
- Apenas Admin pode deletar quadros

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-013: Listar Quadros

**Descrição**: Usuário deve visualizar lista de quadros disponíveis na página principal.

**Critérios de Aceitação**:
- Página principal exibe todos os quadros que o usuário tem acesso
- Cada quadro mostra: nome, descrição, cor, quantidade de cartões
- Usuário pode ordenar por: nome, data de criação, quantidade de cartões
- Usuário pode buscar quadros por nome
- Admin vê todos os quadros; Vendedor vê apenas os que tem acesso

**Prioridade**: CRÍTICA

**Relacionado a**: Frontend, API

---

### RF-014: Compartilhar Quadro

**Descrição**: Admin/Gerente deve poder compartilhar um quadro com outros usuários.

**Critérios de Aceitação**:
- Usuário clica em \"Compartilhar\" no quadro
- Seleciona usuários para compartilhar
- Define permissão: visualizar, editar, gerenciar
- Usuários recebem acesso ao quadro
- Permissões podem ser revogadas a qualquer momento

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-015: Duplicar Quadro

**Descrição**: Usuário deve poder duplicar um quadro existente com todas suas configurações.

**Critérios de Aceitação**:
- Usuário clica em "Duplicar" no quadro
- Modal exibe opções de duplicação
- Checkbox "Incluir cartões" (desmarcada por padrão)
- Sistema cria novo quadro com mesmo nome + " (cópia)"
- Novo quadro herda: descrição, cor, tipo de visualização
- Listas do quadro original são copiadas
- Campos customizados são copiados
- Cartões SÃO copiados APENAS se checkbox "Incluir cartões" estiver marcada
- Se cartões forem copiados, cada cartão recebe novo ID único
- Usuário pode editar o nome antes de confirmar
- Apenas Admin e Gerente podem duplicar quadros

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

## 4. MÓDULO DE GESTÃO DE LISTAS

### RF-020: Criar Lista

**Descrição**: Usuário deve poder criar uma nova lista (coluna) dentro de um quadro.

**Critérios de Aceitação**:
- Usuário clica em \"Nova Lista\" dentro do quadro
- Insere nome da lista
- Lista é criada como coluna vazia
- Lista aparece no final do quadro Kanban
- Usuário pode reordenar listas por drag-and-drop

**Prioridade**: CRÍTICA

**Relacionado a**: Frontend, API

---

### RF-021: Editar Lista

**Descrição**: Usuário deve poder editar informações de uma lista.

**Critérios de Aceitação**:
- Usuário clica em \"Editar\" na lista
- Pode alterar: nome, cor, descrição
- Alterações são salvas
- Histórico é registrado

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-022: Deletar Lista

**Descrição**: Usuário deve poder deletar uma lista.

**Critérios de Aceitação**:
- Usuário clica em \"Deletar\" na lista
- Sistema exibe confirmação
- Se confirmado, lista e todos seus cartões são deletados
- Ação é registrada em logs

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-023: Reordenar Listas

**Descrição**: Usuário deve poder reordenar listas dentro de um quadro.

**Critérios de Aceitação**:
- Usuário arrasta lista para nova posição
- Nova ordem é salva
- Ordem persiste ao recarregar página

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-024: Duplicar Lista

**Descrição**: Usuário deve poder duplicar uma lista dentro do mesmo quadro.

**Critérios de Aceitação**:
- Usuário clica em "Duplicar" na lista
- Modal exibe opções de duplicação
- Checkbox "Incluir cartões" (desmarcada por padrão)
- Sistema cria nova lista com mesmo nome + " (cópia)"
- Nova lista herda: cor, descrição
- Cartões SÃO copiados APENAS se checkbox "Incluir cartões" estiver marcada
- Se cartões forem copiados, cada cartão recebe novo ID único
- Valores dos campos customizados são copiados junto
- Nova lista aparece ao lado da lista original
- Usuário pode editar o nome antes de confirmar

**Prioridade**: BAIXA

**Relacionado a**: Frontend, API

---

## 5. MÓDULO DE GESTÃO DE CAMPOS CUSTOMIZADOS

### RF-030: Criar Campo Customizado

**Descrição**: Admin/Gerente deve poder criar campos customizados para um quadro.

**Critérios de Aceitação**:
- Usuário acessa \"Configurar Campos\" do quadro
- Clica em \"Novo Campo\"
- Seleciona tipo de campo: Texto, Email, Documento, Data, Data/Hora, Tempo, Data de Vencimento, Moeda, Número, Seleção, Checkbox, Vendedor/Responsável, Anexo, Etiqueta
- Insere: nome, descrição, se é obrigatório, valores padrão
- Campo é criado e aparece em novos cartões
- Cartões existentes recebem valor padrão ou vazio

**Prioridade**: CRÍTICA

**Relacionado a**: Frontend, API

---

### RF-031: Editar Campo Customizado

**Descrição**: Admin/Gerente deve poder editar campos customizados.

**Critérios de Aceitação**:
- Usuário acessa \"Configurar Campos\"
- Clica em \"Editar\" no campo
- Pode alterar: nome, descrição, obrigatoriedade, valores padrão
- Não pode alterar tipo de campo (para evitar inconsistências)
- Alterações afetam cartões existentes

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-032: Deletar Campo Customizado

**Descrição**: Admin/Gerente deve poder deletar campos customizados.

**Critérios de Aceitação**:
- Usuário clica em \"Deletar\" no campo
- Sistema exibe confirmação (dados serão perdidos)
- Se confirmado, campo é deletado de todos os cartões
- Ação é registrada em logs

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-033: Reordenar Campos

**Descrição**: Usuário deve poder reordenar campos nos cartões.

**Critérios de Aceitação**:
- Usuário arrasta campo para nova posição
- Nova ordem é salva
- Ordem persiste ao recarregar página

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

## 6. MÓDULO DE GESTÃO DE CARTÕES

### RF-040: Criar Cartão

**Descrição**: Usuário deve poder criar um novo cartão dentro de uma lista.

**Critérios de Aceitação**:
- Usuário clica em \"Novo Cartão\" ou \"+ Adicionar Cartão\"
- Formulário exibe todos os campos customizados do quadro
- Usuário preenche os campos
- Cartão é criado e aparece na lista
- Cartão recebe um ID único sequencial
- Criador é automaticamente registrado como proprietário
- Timestamp de criação é registrado

**Prioridade**: CRÍTICA

**Relacionado a**: Frontend, API

---

### RF-041: Editar Cartão

**Descrição**: Usuário deve poder editar informações de um cartão.

**Critérios de Aceitação**:
- Usuário clica no cartão para abrir detalhes
- Pode editar todos os campos customizados
- Alterações são salvas
- Timestamp de última edição é atualizado
- Histórico de alterações é registrado
- Apenas proprietário, Gerente ou Admin podem editar

**Prioridade**: CRÍTICA

**Relacionado a**: Frontend, API

---

### RF-042: Deletar Cartão

**Descrição**: Usuário deve poder deletar um cartão.

**Critérios de Aceitação**:
- Usuário clica em \"Deletar\" no cartão
- Sistema exibe confirmação
- Se confirmado, cartão é deletado
- Ação é registrada em logs de auditoria
- Apenas proprietário, Gerente ou Admin podem deletar

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-043: Mover Cartão entre Listas

**Descrição**: Usuário deve poder mover cartão para outra lista (Kanban).

**Critérios de Aceitação**:
- Usuário arrasta cartão para outra lista
- Cartão é movido
- Novo status é salvo
- Timestamp de movimento é registrado
- Histórico de movimentos é mantido

**Prioridade**: CRÍTICA

**Relacionado a**: Frontend, API

---

### RF-044: Reordenar Cartões

**Descrição**: Usuário deve poder reordenar cartões dentro de uma lista.

**Critérios de Aceitação**:
- Usuário arrasta cartão para nova posição
- Nova ordem é salva
- Ordem persiste ao recarregar página

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-045: Visualizar Detalhes do Cartão

**Descrição**: Usuário deve poder visualizar todos os detalhes de um cartão.

**Critérios de Aceitação**:
- Usuário clica no cartão
- Modal/página abre mostrando todos os campos
- Exibe: histórico de alterações, comentários, anexos, atividades
- Usuário pode editar campos diretamente
- Usuário pode adicionar comentários
- Usuário pode anexar arquivos

**Prioridade**: CRÍTICA

**Relacionado a**: Frontend, API

---

### RF-046: Duplicar Cartão

**Descrição**: Usuário deve poder duplicar um cartão existente.

**Critérios de Aceitação**:
- Usuário clica em \"Duplicar\" no cartão
- Novo cartão é criado com mesmos valores
- Novo cartão recebe ID único
- Novo cartão aparece na mesma lista
- Usuário pode editar antes de confirmar

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

## 7. MÓDULO DE BUSCA E FILTROS

### RF-050: Busca Textual em Cartões

**Descrição**: Usuário deve poder buscar cartões por texto.

**Critérios de Aceitação**:
- Campo de busca no topo do quadro
- Usuário digita termo de busca
- Sistema busca em todos os campos de texto do cartão
- Resultados são filtrados em tempo real
- Busca é case-insensitive
- Busca suporta múltiplas palavras (AND)

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-051: Filtros Avançados

**Descrição**: Usuário deve poder aplicar filtros avançados aos cartões.

**Critérios de Aceitação**:
- Botão \"Filtros\" abre painel de filtros
- Usuário pode filtrar por:
  - Responsável/Vendedor
  - Data de criação
  - Data de vencimento
  - Etiquetas
  - Status (lista)
  - Campos customizados
- Múltiplos filtros podem ser combinados (AND/OR)
- Filtros são salvos como \"Visualizações Salvas\"
- Usuário pode limpar todos os filtros

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-052: Salvar Filtros como Visualizações

**Descrição**: Usuário deve poder salvar combinações de filtros como visualizações.

**Critérios de Aceitação**:
- Usuário aplica filtros
- Clica em \"Salvar Visualização\"
- Insere nome para visualização
- Visualização é salva
- Usuário pode carregar visualização salva com um clique
- Usuário pode deletar visualizações salvas

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

## 8. MÓDULO DE VISUALIZAÇÕES

### RF-060: Visualização Kanban

**Descrição**: Sistema deve exibir quadro em visualização Kanban (colunas com cartões).

**Critérios de Aceitação**:
- Cada lista é exibida como coluna
- Cartões aparecem como cards dentro das colunas
- Usuário pode arrastar cartões entre colunas
- Cada coluna mostra quantidade de cartões
- Visualização é responsiva

**Prioridade**: CRÍTICA

**Relacionado a**: Frontend

---

### RF-061: Visualização em Lista

**Descrição**: Sistema deve permitir visualizar cartões em formato de tabela/lista.

**Critérios de Aceitação**:
- Cartões são exibidos como linhas em tabela
- Colunas da tabela correspondem aos campos customizados
- Usuário pode ordenar por qualquer coluna
- Usuário pode selecionar quais colunas exibir
- Usuário pode fazer ações em lote (selecionar múltiplos cartões)
- Paginação para melhor performance

**Prioridade**: ALTA

**Relacionado a**: Frontend

---

### RF-062: Visualização em Calendário

**Descrição**: Sistema deve permitir visualizar cartões em formato de calendário.

**Critérios de Aceitação**:
- Cartões são exibidos em calendário
- Cartões aparecem na data do campo \"Data de Vencimento\"
- Usuário pode navegar entre meses
- Usuário pode clicar em data para ver cartões daquele dia
- Cores indicam status/prioridade
- Visualização é responsiva

**Prioridade**: ALTA

**Relacionado a**: Frontend

---

## 9. MÓDULO DE IMPORTAÇÃO DE DADOS

### RF-070: Importar Dados do Pipedrive (CSV)

**Descrição**: Usuário deve poder importar dados do Pipedrive em formato CSV.

**Critérios de Aceitação**:
- Usuário acessa página de importação
- Seleciona arquivo CSV do Pipedrive
- Sistema exibe preview dos dados
- Usuário mapeia colunas CSV para campos do sistema
- Sistema valida dados (tipos, formatos, obrigatoriedade)
- Se válido, importa dados
- Se inválido, exibe erros e permite corrigir
- Relatório de importação é gerado (sucesso/falhas)
- Histórico de importação é mantido

**Prioridade**: CRÍTICA

**Relacionado a**: Frontend, API

---

### RF-071: Importar Dados via API

**Descrição**: Sistemas externos devem poder enviar dados para o CRM via API.

**Critérios de Aceitação**:
- Endpoint `/api/v1/cards/import` aceita POST com dados
- Autenticação via Client ID/Secret obrigatória
- Dados são validados
- Cartões são criados no quadro especificado
- Se sem vendedor atribuído e rodízio ativado, distribui automaticamente
- Resposta inclui IDs dos cartões criados
- Erros são retornados com detalhes

**Prioridade**: CRÍTICA

**Relacionado a**: API

---

### RF-072: Mapeamento de Campos na Importação

**Descrição**: Sistema deve permitir mapear campos de origem para campos de destino.

**Critérios de Aceitação**:
- Interface visual para mapear colunas
- Mapeamento automático por nome similar
- Usuário pode ajustar mapeamento manualmente
- Opção de salvar mapeamento para futuras importações
- Validação de tipos durante mapeamento

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

## 10. MÓDULO DE DISTRIBUIÇÃO AUTOMÁTICA (RODÍZIO)

### RF-080: Distribuição em Rodízio de Cartões

**Descrição**: Sistema deve distribuir cartões criados via API em rodízio entre vendedores.

**Critérios de Aceitação**:
- Admin pode ativar/desativar rodízio por quadro
- Cartões criados via API sem vendedor atribuído entram na fila
- Sistema distribui para próximo vendedor na sequência
- Sequência é baseada em: vendedor com menos cartões ativos atribuídos (estratégia de balanceamento de carga)
- Vendedor recebe notificação de novo cartão
- Histórico de distribuição é mantido
- Admin pode visualizar fila de distribuição

**Prioridade**: ALTA

**Relacionado a**: API, Frontend

---

## 11. MÓDULO DE RELATÓRIOS E KPIs

### RF-090: Dashboard de KPIs

**Descrição**: Sistema deve exibir dashboard com KPIs principais.

**Critérios de Aceitação**:
- Dashboard mostra:
  - Quantidade de novos cartões (hoje, semana, mês)
  - Cartões concluídos no prazo
  - Cartões atrasados
  - Tempo médio de conclusão
  - Tempo médio por fase/lista
  - Taxa de conversão por vendedor
  - Distribuição de cartões por responsável
- Gráficos são interativos
- Usuário pode filtrar por período
- Dados são atualizados em tempo real

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-091: Relatórios Customizáveis

**Descrição**: Usuário deve poder gerar relatórios customizados.

**Critérios de Aceitação**:
- Usuário seleciona: período, filtros, campos a incluir, formato
- Sistema gera relatório
- Relatório pode ser exportado em: PDF, Excel, CSV
- Relatório pode ser agendado para envio periódico
- Histórico de relatórios é mantido

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-092: Exportar Dados

**Descrição**: Usuário deve poder exportar dados em múltiplos formatos.

**Critérios de Aceitação**:
- Usuário seleciona cartões ou aplica filtros
- Clica em \"Exportar\"
- Seleciona formato: CSV, Excel, JSON
- Arquivo é gerado e baixado
- Exportação inclui todos os campos
- Histórico de exportação é mantido

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

## 12. MÓDULO DE GESTÃO DE BANCO DE DADOS

### RF-100: Visualizar Dados do Banco

**Descrição**: Admin deve poder visualizar dados brutos do banco sem acessar diretamente.

**Critérios de Aceitação**:
- Página administrativa com lista de tabelas
- Usuário seleciona tabela
- Dados são exibidos em formato tabular
- Usuário pode ordenar, filtrar, buscar
- Paginação para grandes volumes
- Apenas Admin tem acesso

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-101: Executar Consultas SQL (Somente SELECT)

**Descrição**: Admin deve poder executar consultas SQL customizadas de leitura (SELECT).

**Critérios de Aceitação**:
- Interface para escrever SQL
- APENAS comandos SELECT são permitidos (whitelist)
- Bloqueio rigoroso de: DELETE, DROP, UPDATE, INSERT, ALTER, TRUNCATE, CREATE
- Timeout de 30 segundos para prevenir consultas pesadas
- Resultados exibidos em tabela (limitado a 1000 linhas)
- Opção de exportar resultados
- Histórico de consultas é mantido
- Apenas Admin tem acesso

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

## 13. MÓDULO DE AUDITORIA E LOGS

### RF-110: Registrar Todas as Alterações

**Descrição**: Sistema deve registrar todas as alterações em logs de auditoria.

**Critérios de Aceitação**:
- Cada alteração é registrada com: usuário, ação, timestamp, dados anteriores, dados novos
- Logs não podem ser deletados ou alterados
- Admin pode visualizar logs
- Logs podem ser filtrados por: usuário, ação, data, tabela
- Retenção de logs: mínimo 1 ano
- Logs são armazenados em tabela separada

**Prioridade**: CRÍTICA

**Relacionado a**: API

---

### RF-111: Visualizar Histórico de Alterações

**Descrição**: Usuário deve poder visualizar histórico de alterações de um cartão.

**Critérios de Aceitação**:
- Ao abrir detalhes do cartão, exibe aba \"Histórico\"
- Mostra todas as alterações em ordem cronológica
- Cada alteração mostra: campo alterado, valor anterior, valor novo, usuário, timestamp
- Usuário pode reverter para versão anterior (se permissão)

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

## 14. MÓDULO DE NOTIFICAÇÕES

### RF-120: Notificações de Cartões Atribuídos

**Descrição**: Vendedor deve receber notificação quando cartão é atribuído a ele.

**Critérios de Aceitação**:
- Quando cartão é atribuído, vendedor recebe notificação
- Notificação pode ser: in-app, email, push
- Notificação inclui: nome do cartão, responsável, data
- Vendedor pode marcar como lida
- Histórico de notificações é mantido

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-121: Notificações de Cartões Vencidos

**Descrição**: Sistema deve notificar sobre cartões com data de vencimento próxima.

**Critérios de Aceitação**:
- Diariamente, sistema verifica cartões vencidos
- Responsável recebe notificação se cartão vence em 1 dia
- Notificação é enviada novamente a cada dia até vencimento
- Após vencimento, notificação muda para \"Atrasado\"

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

## 15. MÓDULO DE INTEGRAÇÃO COM TERCEIROS

### RF-130: Webhook para Eventos

**Descrição**: Sistema deve permitir enviar webhooks para sistemas externos em eventos.

**Critérios de Aceitação**:
- Admin pode configurar webhooks
- Eventos disponíveis: card.created, card.updated, card.deleted, card.moved
- Sistema envia POST para URL configurada com dados do evento
- Retry automático se falhar
- Histórico de webhooks é mantido

**Prioridade**: MÉDIA

**Relacionado a**: API

---

### RF-131: Integração com RDStation

**Descrição**: Sistema deve integrar com RDStation para receber leads.

**Critérios de Aceitação**:
- Configuração de credenciais RDStation
- Sincronização de leads para cartões
- Mapeamento de campos RDStation para campos do CRM
- Sincronização pode ser manual ou automática
- Histórico de sincronizações é mantido

**Prioridade**: ALTA

**Relacionado a**: API

---

## 16. MÓDULO DE USUÁRIOS E PERMISSÕES

### RF-140: Gerenciar Usuários

**Descrição**: Admin deve poder gerenciar usuários do sistema.

**Critérios de Aceitação**:
- Admin pode criar, editar, deletar usuários
- Cada usuário tem: nome, email, role, status (ativo/inativo)
- Admin pode resetar senha de usuário
- Admin pode ativar/desativar usuário
- Histórico de usuários é mantido

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-141: Gerenciar Roles e Permissões

**Descrição**: Admin deve poder gerenciar roles e permissões.

**Critérios de Aceitação**:
- Admin pode criar roles customizadas
- Admin pode definir permissões para cada role
- Permissões disponíveis: create, read, update, delete, export, import, manage_users, manage_roles
- Admin pode atribuir role a usuário
- Mudanças de role afetam acesso imediatamente

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

## 17. MÓDULO DE GAMIFICAÇÃO

### RF-142: Sistema de Pontos por Ação

**Descrição**: Sistema deve atribuir pontos para ações realizadas pelos vendedores.

**Critérios de Aceitação**:
- Cada ação tem pontuação configurável (criar lead, fazer contato, enviar proposta, fechar venda)
- Pontos são registrados automaticamente quando ação é realizada
- **Pontos são mantidos perpetuamente** (histórico completo, NUNCA resetam)
- Total de pontos acumula ao longo do tempo (ex: vendedor com 2 anos tem 25.000 pontos totais)
- Histórico completo de pontos é mantido por vendedor (para análises futuras)
- Admin pode configurar quantos pontos cada ação vale
- Pontos podem ser positivos ou negativos (penalidades)
- Sistema calcula e exibe:
  - **Total de pontos** (desde o início, ex: "25.430 pontos totais")
  - **Pontos por período** (para rankings: semanal, mensal, trimestral, anual)
- Vendedor pode visualizar gráfico de evolução de pontos ao longo do tempo

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-143: Rankings de Vendedores

**Descrição**: Sistema deve gerar rankings baseados em pontos por período.

**Critérios de Aceitação**:
- **Rankings Periódicos** (resetam automaticamente):
  - **Semanal**: Reseta todo domingo à meia-noite (pontos da semana)
  - **Mensal**: Reseta dia 1º de cada mês (pontos do mês)
  - **Trimestral**: Reseta no início de cada trimestre (pontos do trimestre)
  - **Anual**: Reseta dia 1º de janeiro (pontos do ano)
- **Ranking = Competição Justa**: Todo período é uma nova luta pelo 1º lugar
- Top 3 vendedores destacados com medalhas (🥇🥈🥉)
- Ranking mostra: posição, nome, foto, pontos do período
- Vendedor vê sua posição atual em cada ranking (semanal, mensal, etc.)
- Ranking atualiza em tempo real (cache de 5 minutos)
- **Rankings Anteriores são Arquivados**:
  - Histórico completo de rankings passados é mantido
  - Vendedor pode consultar: "Quem foi 1º em Dezembro/2024?"
  - Admin pode exportar rankings históricos
- **Dashboard mostra simultaneamente**:
  - Total de pontos perpétuo (ex: "25.430 pontos desde Jan 2024")
  - Posição em cada ranking periódico (ex: "1º mensal com 2.500 pts")

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-144: Badges e Conquistas

**Descrição**: Sistema deve conceder badges para conquistas especiais.

**Critérios de Aceitação**:
- **Badges Padrão do Sistema** (pré-configuradas, não editáveis):
  - 🏆 Vendedor do Mês (1º lugar no ranking mensal)
  - 🥇 Top 3 Ranking (top 3 em qualquer período)
  - 💯 100 Vendas Fechadas
  - ⚡ Velocidade (fechar venda em < 3 dias)
  - 🔥 Sequência de 7 dias criando leads
  - 🤝 Trabalho em Equipe (10+ transferências bem-sucedidas)
- **Badges Customizadas pelo Admin**:
  - Admin pode criar novas badges personalizadas
  - Cada badge tem: nome (3-50 caracteres), descrição (máx 200 caracteres), ícone (emoji ou URL), tipo de critério
  - **Tipo de Critério**:
    - **Manual**: Admin atribui badge manualmente a vendedores específicos
    - **Automático**: Sistema concede automaticamente quando critério é atingido (ex: pontos > X, vendas > Y)
  - Admin pode ativar/desativar badges customizadas
  - Badges desabilitadas não aparecem para vendedores, mas histórico é mantido
- Vendedor recebe notificação ao conquistar badge
- Badges aparecem no perfil do vendedor e no dashboard de gamificação
- Histórico de badges conquistadas é mantido permanentemente
- Badge pode ser conquistada apenas uma vez por vendedor

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-144.1: Gerenciamento de Badges Customizadas (Admin)

**Descrição**: Admin deve poder criar, editar e gerenciar badges customizadas.

**Critérios de Aceitação**:
- Admin acessa painel de "Gerenciar Badges"
- **Criar Badge Customizada**:
  - Nome (obrigatório, 3-50 caracteres, único)
  - Descrição (obrigatório, máximo 200 caracteres)
  - Ícone (emoji ou URL de imagem)
  - Tipo de critério: Manual ou Automático
  - Se Automático: definir regra (ex: "pontos >= 1000", "vendas_fechadas >= 50")
  - Status: Ativa/Inativa (padrão: Ativa)
- **Editar Badge Customizada**:
  - Admin pode editar nome, descrição, ícone e status
  - Não pode editar tipo de critério (para evitar inconsistências)
  - Alterações não afetam badges já conquistadas
- **Atribuir Badge Manualmente** (se tipo = Manual):
  - Admin seleciona vendedor(es)
  - Admin atribui badge
  - Sistema valida se vendedor já possui a badge (não pode duplicar)
  - Vendedor recebe notificação
- **Desativar Badge**:
  - Badge desabilitada não aparece para novos vendedores
  - Vendedores que já possuem a badge continuam vendo no histórico
- **Deletar Badge**:
  - Apenas Admin pode deletar badges customizadas
  - Confirmação obrigatória
  - Histórico de badges conquistadas é mantido (soft delete)
- Lista todas as badges (padrão + customizadas) com filtros (ativas/inativas, tipo)

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-145: Parabenizações Automáticas

**Descrição**: Sistema deve enviar parabenizações automáticas quando vendedor avança cartão.

**Critérios de Aceitação**:
- Notificação enviada quando cartão muda de fase
- Mensagem personalizada com barra de progresso
- Parabenização mostra quantos pontos ganhou
- Pode ser desabilitada por vendedor
- Histórico de parabenizações é mantido

**Prioridade**: BAIXA

**Relacionado a**: Frontend, API

---

### RF-146: Dashboard de Gamificação

**Descrição**: Vendedor deve ter dashboard mostrando sua gamificação.

**Critérios de Aceitação**:
- Dashboard mostra: total de pontos, posição no ranking, badges conquistadas
- Gráfico de evolução de pontos ao longo do tempo
- Comparação com média da equipe
- Próximas badges a conquistar
- Histórico de ações pontuadas

**Prioridade**: MÉDIA

**Relacionado a**: Frontend

---

### RF-147: Configurar Sistema de Pontos

**Descrição**: Admin deve poder configurar quantos pontos cada ação vale.

**Critérios de Aceitação**:
- Admin acessa painel de configuração de pontos
- Para cada ação, Admin define quantos pontos vale
- Mudanças afetam apenas ações futuras (não retroativas)
- Histórico de configurações é mantido
- Configuração pode ser exportada/importada

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-148: Reset Periódico de Rankings

**Descrição**: Sistema deve resetar rankings periodicamente via cron jobs automáticos.

**Critérios de Aceitação**:
- **IMPORTANTE**: Apenas os RANKINGS resetam. **Pontos totais NUNCA resetam** (mantidos perpetuamente)
- **Reset Automático de Rankings** (via cron jobs):
  - **Semanal**: Todo domingo à meia-noite (00:00)
  - **Mensal**: Todo dia 1º de cada mês à meia-noite (00:00)
  - **Trimestral**: Início de cada trimestre (01/01, 01/04, 01/07, 01/10)
  - **Anual**: Todo dia 1º de janeiro à meia-noite (00:00)
- **Antes de Resetar**:
  - Sistema calcula posições finais do período
  - Concede badges automáticas (ex: "Vendedor do Mês" para 1º lugar)
  - Arquiva ranking anterior na tabela `gamification_rankings`
  - Envia notificações aos vencedores (Top 3)
- **Após Reset**:
  - Contador de pontos do período volta a zero
  - Total de pontos perpétuo é mantido
  - Novo período começa do zero para todos
- **Histórico Completo Mantido**:
  - Rankings anteriores ficam salvos permanentemente
  - Vendedor pode consultar rankings históricos (ex: "Mensal Dez/2024")
  - Admin pode exportar rankings históricos para análises
- **Logs de Auditoria**:
  - Cada reset é registrado em logs
  - Inclui: período, data/hora, vencedores do Top 3

**Prioridade**: BAIXA

**Relacionado a**: API, Cron Jobs

---

### RF-149: Exportar Relatório de Gamificação

**Descrição**: Admin deve poder exportar relatórios de gamificação para uso externo (RH/Folha de Pagamento).

**Critérios de Aceitação**:
- Admin acessa "Relatórios de Gamificação"
- Seleciona período (data início e fim)
- Seleciona tipo de ranking (semanal, mensal, trimestral, anual)
- Opção de filtrar por vendedor específico ou todos
- **Formatos de exportação**: Excel (.xlsx), CSV
- **Dados exportados**:
  - Nome do vendedor
  - Email
  - Total de pontos no período
  - Posição no ranking
  - Número de vendas fechadas
  - Número de badges conquistadas
  - Lista de badges conquistadas (nomes)
  - Data da exportação
- Arquivo é gerado no servidor e enviado para download
- Histórico de exportações é registrado em logs de auditoria
- **Nota importante**: Sistema não calcula bônus ou comissões. Dados são exportados para que RH/Folha calcule externamente conforme política da empresa.

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

## 18. MÓDULO DE AUTOMAÇÕES

### RF-150: Criar Automação

**Descrição**: Gerente/Admin deve poder criar automações entre quadros.

**Critérios de Aceitação**:
- Automação tem: nome, trigger (gatilho), action (ação), prioridade
- Trigger disponíveis: cartão criado, cartão movido, cartão atualizado
- Actions disponíveis: mover cartão, copiar cartão, criar cartão, enviar notificação
- Automação pode ter mapeamento de campos (campo A → campo B)
- Automação pode ser ativada/desativada
- Admin pode testar automação antes de ativar
- **Sistema de Priorização**:
  - Campo `priority` (1-100): Define ordem de execução quando múltiplas automações são triggadas
  - Valor padrão: 50 (Média)
  - Prioridades sugeridas na interface:
    - **Alta (90-100)**: Notificações críticas, logs, auditoria
    - **Média (50-89)**: Movimentações de cartões, criações (padrão)
    - **Baixa (1-49)**: Integrações externas, ações secundárias
  - Ordem de execução: Maior prioridade primeiro
  - Desempate: Se mesma prioridade, ordem de criação (mais antiga primeiro)
  - Interface mostra: "Prioridade: 50 (Média)"
  - Admin pode editar prioridade após criar automação
- **Limite de Automações**:
  - Máximo de **50 automações ativas** por conta
  - Automações inativas (is_active = false) **não contam** no limite
  - Sistema valida limite antes de criar nova automação
  - Se limite atingido: exibir mensagem clara e sugerir desativar automações existentes
  - Interface mostra contador: "Automações ativas: 45 / 50"
  - Próximo ao limite (>= 45): Exibir aviso amarelo
  - Limite atingido (50): Botão "Criar Nova" desabilitado com tooltip explicativo

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-150.1: Automações Agendadas

**Descrição**: Sistema deve suportar automações agendadas (executam por tempo/data, não por evento).

**Critérios de Aceitação**:
- **Dois Tipos de Automação**:
  - **Por Gatilho (Trigger-based)**: Executa quando evento ocorre (comportamento atual)
  - **Por Agendamento (Scheduled)**: Executa em datas/horários específicos
- **Tipos de Agendamento**:
  - **Execução Única**: Roda uma vez em data/hora específica
    - Ex: "Enviar relatório em 15/01/2026 às 09:00"
    - Após executar: Automação é desativada automaticamente
  - **Execução Recorrente**: Roda periodicamente
    - **Diária**: Todos os dias às HH:mm (ex: 08:00)
    - **Semanal**: Toda segunda/terça/quarta/etc às HH:mm (ex: Segunda 09:00)
    - **Mensal**: Todo dia X do mês às HH:mm (ex: Dia 1º às 02:00)
    - **Anual**: Todo dia DD/MM às HH:mm (ex: 01/01 às 00:00)
    - Após executar: Sistema calcula próxima execução automaticamente
- **Diferenças de Automações por Gatilho**:
  - Não precisa de `trigger_event`, `trigger_board_id` ou `trigger_list_id`
  - Executam por tempo, não por evento
  - **Contam no limite de 50 automações** por conta (mesmo limite)
- **Interface de Criação**:
  - Radio button: "Tipo de Automação: [Por Gatilho] [Por Agendamento]"
  - Se "Por Agendamento":
    - Radio: "Frequência: [Única] [Recorrente]"
    - Se "Única": DateTimePicker (data + hora)
    - Se "Recorrente": Dropdowns (tipo + configuração + hora)
  - Preview: "Próxima execução: 15/01/2026 às 09:00"
- **Listagem**:
  - Coluna adicional: "Próxima Execução" (mostra data/hora ou "N/A" para trigger-based)
  - Badge visual: "🕐 Agendada" ou "⚡ Por Gatilho"
- **Histórico**:
  - Tabela `automation_executions` registra todas execuções (agendadas ou por gatilho)
  - Diferenciação: `triggered_by = 'schedule'` ou `triggered_by = 'event'`

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API, Cron Jobs

---

### RF-151: Definir Gatilhos (Triggers)

**Descrição**: Ao criar automação, deve ser possível definir o gatilho.

**Critérios de Aceitação**:
- Trigger: "Quando cartão move para lista X do quadro Y"
- Trigger: "Quando cartão é criado na lista X do quadro Y"
- Trigger: "Quando campo Z do cartão é atualizado"
- Trigger pode ter condições (ex: apenas se valor > R$ 1000)
- Múltiplos triggers podem ser combinados com AND/OR

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-152: Definir Ações (Actions)

**Descrição**: Ao criar automação, deve ser possível definir a ação.

**Critérios de Aceitação**:
- Action: "Mover cartão para lista W do quadro Z"
- Action: "Copiar cartão para lista W do quadro Z"
- Action: "Criar novo cartão na lista W do quadro Z"
- Action: "Enviar notificação para vendedor/gerente"
- Action: "Atualizar campo do cartão"
- Múltiplas actions podem ser executadas em sequência

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-153: Mapeamento de Campos

**Descrição**: Automação deve permitir mapear campos entre quadros diferentes.

**Critérios de Aceitação**:
- Interface de mapeamento: Campo Origem → Campo Destino
- Suporta campos customizados diferentes entre quadros
- Pode transformar dados (ex: texto → número)
- Campos não mapeados ficam vazios no destino
- Mapeamento é salvo junto com a automação

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-154: Executar Automação

**Descrição**: Sistema deve executar automações automaticamente quando trigger é ativado.

**Critérios de Aceitação**:
- Automação executa em background (assíncrono)
- Se automação falhar, erro é registrado mas não bloqueia operação original
- Vendedor recebe notificação se automação criou/moveu cartão para ele
- Execução é registrada em log
- Automação respeita permissões (não executa se usuário não tem acesso ao quadro destino)

**Prioridade**: ALTA

**Relacionado a**: API

---

### RF-155: Histórico de Execuções

**Descrição**: Sistema deve manter histórico de execuções de automações.

**Critérios de Aceitação**:
- Para cada execução, registra: automação, cartão origem, cartão destino, status, data/hora
- Status pode ser: sucesso, falha, pendente
- Se falha, registra mensagem de erro
- Admin pode visualizar histórico completo
- Vendedor vê apenas execuções que afetaram seus cartões

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-155.1: Notificações de Falhas de Automação

**Descrição**: Sistema deve notificar Admin e criador da automação quando uma automação falha.

**Critérios de Aceitação**:
- **Notificação In-App (Sempre)**:
  - Destinatários: Admin + Criador da automação
  - Exibida no sino de notificações
  - Contém: nome da automação, tipo de erro, cartão afetado, timestamp
  - Link direto para detalhes da execução
  - Botões: "Ver Detalhes", "Desativar Automação"
- **Notificação por Email (Apenas Crítico)**:
  - Usando SMTP Microsoft 365 (ti@healthsafetytech.com)
  - Enviado apenas quando:
    - Mesma automação falhou **3+ vezes em 1 hora** (erro persistente)
    - Automação foi **desativada automaticamente** (10+ falhas consecutivas)
    - Erro crítico: quadro/lista deletada, permissão negada
  - Email contém: resumo do erro, link para sistema, ação recomendada
  - Emails agrupados: Se 5+ automações falharem na mesma hora, enviar 1 email com resumo
- **Configuração de Emails**:
  - Admin pode ativar/desativar notificações por email em Configurações
  - Padrão: Ativado
  - Admin pode configurar threshold (ex: email após 5 falhas em vez de 3)
- **Dashboard de Monitoramento**:
  - Admin vê status de todas as automações
  - Indicadores visuais: ✅ OK, ⚠️ Falhas recentes, ❌ Desativada por erro
  - Lista de automações com falhas nas últimas 24h
  - Contador de falhas por automação
- **Vendedores comuns NÃO são notificados** (apenas Admin e criador)

**Prioridade**: ALTA

**Relacionado a**: Frontend, API, Email Service

---

### RF-156: Listar e Gerenciar Automações

**Descrição**: Admin/Gerente deve poder listar e gerenciar automações.

**Critérios de Aceitação**:
- Página lista todas as automações
- Para cada automação, mostra: nome, status (ativa/inativa), trigger, action, última execução
- Admin pode editar automação existente
- Admin pode deletar automação
- Admin pode duplicar automação

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-157: Ativar/Desativar Automação

**Descrição**: Admin deve poder ativar/desativar automações.

**Critérios de Aceitação**:
- Toggle simples para ativar/desativar
- Automação desativada não executa
- Automação pode ser reativada a qualquer momento
- Histórico de ativações/desativações é mantido

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-158: Testar Automação

**Descrição**: Admin deve poder testar automação antes de ativar.

**Critérios de Aceitação**:
- Botão "Testar Automação" executa em modo de teste
- Modo de teste não faz alterações reais
- Retorna preview do que aconteceria
- Mostra se mapeamento de campos está correto
- Identifica erros antes de ativar

**Prioridade**: BAIXA

**Relacionado a**: Frontend, API

---

## 19. MÓDULO DE TRANSFERÊNCIA DE CARTÕES

### RF-159: Transferir Cartão

**Descrição**: Vendedor deve poder transferir cartão para outro vendedor.

**Critérios de Aceitação**:
- Botão "Transferir Cartão" no detalhe do cartão
- Modal com seleção de novo responsável
- Campo de motivo da transferência (dropdown + campo livre)
- Motivos pré-definidos: Especialista, Rebalanceamento, Férias, Escalação, Outro
- Campo de notas (opcional)
- Confirmação antes de transferir

**Prioridade**: ALTA

**Relacionado a**: Frontend, API

---

### RF-160: Rastreamento de Transferências

**Descrição**: Sistema deve manter histórico completo de transferências de cada cartão.

**Critérios de Aceitação**:
- Cada transferência registra: de quem, para quem, data/hora, motivo, quem fez a transferência
- Histórico é imutável (não pode ser editado ou deletado)
- Cartão sempre sabe quem é o vendedor original
- Cartão sempre sabe quem é o responsável atual
- Histórico aparece na timeline do cartão

**Prioridade**: ALTA

**Relacionado a**: API

---

### RF-160: Visualização de Histórico de Transferências

**Descrição**: Vendedor deve poder visualizar histórico de transferências do cartão.

**Critérios de Aceitação**:
- Seção "Histórico de Transferências" no detalhe do cartão
- Timeline visual mostrando toda a cadeia
- Para cada transferência, mostra: vendedor anterior, vendedor novo, data, motivo, quem transferiu
- Indica quantos dias o cartão ficou com cada vendedor
- Destaca vendedor original e vendedor atual

**Prioridade**: MÉDIA

**Relacionado a**: Frontend

---

### RF-161: Pontos por Transferência

**Descrição**: Sistema deve atribuir pontos para identificação e fechamento em transferências.

**Critérios de Aceitação**:
- Vendedor original ganha 25 pontos ao transferir para especialista
- Vendedor original ganha 50 pontos bônus se cartão é convertido em venda (mesmo após transferência)
- Novo responsável ganha 25 pontos por assumir cartão transferido
- Novo responsável ganha pontos normais ao fechar venda
- Todos os envolvidos na cadeia recebem reconhecimento

**Prioridade**: MÉDIA

**Relacionado a**: API

---

### ~~RF-162: Comissão em Cadeia~~ (REMOVIDO DO ESCOPO)

**Decisão**: Sistema **NÃO calcula comissões ou bônus financeiros**.

**Motivo**:
- Cada empresa tem política de bonificação diferente
- Cálculos financeiros têm implicações legais, trabalhistas e fiscais
- Melhor deixar para sistemas especializados (RH/Folha de Pagamento)

**Solução Implementada**:
- Sistema fornece **gamificação simbólica** (pontos, rankings, badges)
- Admin pode exportar relatórios (Excel/CSV) com dados de gamificação
- RH/Folha usa esses dados para calcular bônus externamente conforme política da empresa

**Substituído por**: RF-138 (Exportar Dados de Gamificação)

---

### RF-163: Filtros por Transferência

**Descrição**: Sistema deve permitir filtrar cartões por histórico de transferência.

**Critérios de Aceitação**:
- Filtro "Vendedor Original" (quem criou/recebeu primeiro)
- Filtro "Responsável Atual" (quem está com o cartão agora)
- Filtro "Número de Transferências" (quantas vezes foi transferido)
- Filtro "Motivo da Transferência"
- Filtro "Transferido por" (quem fez a transferência)

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API

---

### RF-164: Relatórios de Transferência

**Descrição**: Gerente deve ter acesso a relatórios de transferências.

**Critérios de Aceitação**:
- Relatório mostra: total de transferências, por vendedor, por motivo
- Taxa de sucesso (quantos % dos cartões transferidos viraram venda)
- Tempo médio com cada vendedor antes de transferir
- Análise de cadeia (quais combinações de vendedores têm melhor resultado)
- Gráfico de fluxo mostrando transferências mais comuns

**Prioridade**: BAIXA

**Relacionado a**: Frontend, API

---

### RF-165: Notificações de Transferência

**Descrição**: Sistema deve enviar notificações quando cartão é transferido.

**Critérios de Aceitação**:
- Vendedor original recebe notificação: "Seu cartão X foi transferido para Y"
- Novo responsável recebe notificação: "Você recebeu novo cartão X de Y"
- Gerente recebe notificação (se configurado): "Transferência realizada: X → Y"
- Notificação inclui link para o cartão
- Notificação pode ser in-app, email ou ambos

**Prioridade**: MÉDIA

**Relacionado a**: API

---

### RF-166: Badges de Transferência

**Descrição**: Sistema deve conceder badges relacionadas a transferências.

**Critérios de Aceitação**:
- Badge "Identificador de Oportunidades": 10+ transferências bem-sucedidas
- Badge "Trabalho em Equipe": Recebeu 10+ cartões transferidos
- Badge "Especialista": Alta taxa de sucesso em cartões transferidos
- Badge "Distribuidor": Transferiu cartões para 5+ colegas diferentes
- Badges aparecem no perfil e ranking

**Prioridade**: BAIXA

**Relacionado a**: API

---

### RF-167: Restrições de Transferência

**Descrição**: Sistema deve aplicar restrições em transferências.

**Critérios de Aceitação**:
- Não pode transferir para si mesmo
- Não pode transferir cartão "Venda Fechada" (exceto para pós-venda via automação)
- Não pode transferir cartão "Perdido" ou "Cancelado"
- Apenas Admin/Gerente pode forçar transferência de cartão de outro vendedor
- Vendedor pode transferir apenas seus próprios cartões

**Prioridade**: ALTA

**Relacionado a**: API

---

### RF-167.1: Limite de Transferências por Período

**Descrição**: Sistema deve controlar limite de transferências por vendedor/período para evitar transferências excessivas.

**Critérios de Aceitação**:
- **Configuração Global** (por conta):
  - Admin configura limite em: Configurações → Transferências
  - Opções de período: Diário, Semanal, Mensal
  - Opções de quantidade: 5, 10, 20, 50, Ilimitado
  - **Padrão recomendado**: 10 transferências/mês
  - Interface simples: Toggle "Habilitar limite" + Dropdowns
- **O que conta no limite**:
  - ✅ Transferências **enviadas** pelo vendedor (ele transfere para outro)
  - ❌ Transferências **recebidas** (NÃO contam)
  - ❌ Transferências automáticas (via automações)
  - ❌ Transferências feitas por Gerente/Admin (isentos)
- **Visualização do Limite**:
  - Interface mostra contador: "Transferências este mês: 7 / 10"
  - Próximo ao limite (>= 80%): Badge amarelo de aviso
  - Ao atingir limite: Botão "Transferir" desabilitado
  - Tooltip explicativo: "Limite de transferências atingido (10/10 este mês). Aguarde próximo período ou contate seu gerente."
- **Exceção Manual**:
  - Gerente pode conceder **exceção temporária** para vendedor específico
  - Exceção permite +5 transferências extras no período atual
  - Exceção expira no fim do período
  - Log de auditoria registra concessão de exceção
- **Reset Automático**:
  - Contador reseta automaticamente no início do novo período
  - Diário: 00:00 de cada dia
  - Semanal: Segunda-feira 00:00
  - Mensal: Dia 1º de cada mês 00:00
- **Facilidade de Desabilitar**:
  - Toggle "Habilitar limite" = OFF → Sistema fica ilimitado
  - Mudança tem efeito imediato
  - Admin pode ajustar a qualquer momento sem impacto

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API, Cron Jobs

---

### RF-167.2: Aprovação de Transferências (Opcional)

**Descrição**: Sistema pode exigir aprovação de gerente para transferências, se configurado (padrão: OFF).

**Critérios de Aceitação**:
- **Configuração Global** (por conta):
  - Admin configura em: Configurações → Transferências
  - Toggle simples: "Exigir aprovação de gerente para transferências"
  - **Padrão: OFF** (transferências diretas, sem aprovação)
  - Mudança tem efeito imediato para novas transferências
- **Quando Aprovação é Necessária** (se habilitado):
  - Vendedor clica "Transferir" → Sistema cria **solicitação pendente**
  - Cartão **permanece** com vendedor original até aprovação
  - Gerente recebe notificação (in-app + email opcional)
  - Solicitação fica em painel: "Aprovações Pendentes"
- **Exceções** (NUNCA precisam aprovação, mesmo se habilitado):
  - Gerente transferindo próprios cartões ou de sua equipe
  - Admin transferindo qualquer cartão
  - Transferências automáticas (via automações)
- **Ações do Gerente**:
  - **Aprovar**: Transferência é efetivada imediatamente
    - Cartão passa para novo responsável
    - Registro criado em `card_transfers` com status `approved`
    - Ambos vendedores são notificados
  - **Rejeitar**: Solicitação é cancelada
    - Cartão permanece com vendedor original
    - Registro em `transfer_requests` marcado como `rejected`
    - Vendedor recebe notificação com motivo da rejeição (obrigatório)
- **Estados da Solicitação**:
  - `pending`: Aguardando aprovação do gerente
  - `approved`: Aprovada e transferência efetivada
  - `rejected`: Rejeitada pelo gerente
  - `expired`: Expirou sem resposta (72h = auto-rejeita)
- **Expiração Automática**:
  - Solicitações pendentes por **72 horas** expiram automaticamente
  - Status vira `expired` (tratado como rejeição)
  - Vendedor é notificado: "Solicitação de transferência expirou"
  - Cron job verifica a cada hora solicitações antigas
- **Interface**:
  - **Vendedor**:
    - Se aprovação OFF: Botão "Transferir" executa imediatamente
    - Se aprovação ON: Botão "Solicitar Transferência"
    - Pode ver status: "Solicitação pendente" / "Aprovada" / "Rejeitada"
  - **Gerente**:
    - Painel "Aprovações Pendentes" (badge com contador)
    - Lista de solicitações com: Vendedor, Cartão, Destinatário, Motivo, Data
    - Botões: "Aprovar" / "Rejeitar"
    - Campo obrigatório ao rejeitar: Motivo da rejeição
- **Histórico**:
  - Todas solicitações ficam registradas (pendentes, aprovadas, rejeitadas)
  - Timeline do cartão mostra: "Transferência solicitada → Aprovada por [Gerente]"

**Prioridade**: BAIXA (funcionalidade futura, padrão desabilitado)

**Relacionado a**: Frontend, API, Notificações, Cron Jobs

---

### RF-167.3: Transferência em Lote

**Descrição**: Sistema deve permitir transferir múltiplos cartões de uma vez para mesmo destinatário.

**Critérios de Aceitação**:
- **Seleção Múltipla**:
  - Checkbox em cada cartão (lista/kanban)
  - Botão "Selecionar Todos" / "Desselecionar Todos" (apenas cartões visíveis/filtrados)
  - Contador visual: "15 cartões selecionados"
  - Limite: Máximo **50 cartões por operação**
  - Se tentar selecionar mais: Mensagem de aviso e bloqueia seleção adicional
- **Interface de Transferência em Lote**:
  - Botão "Transferir Selecionados" (aparece quando 2+ cartões selecionados)
  - Badge no botão: Número de cartões selecionados
  - Modal abre com:
    - Lista dos cartões selecionados (nome, valor, status)
    - Dropdown: Selecionar destinatário
    - Dropdown: Motivo da transferência (único para todos)
    - Campo opcional: Notas (aplicadas a todos)
    - Preview: "Transferir 15 cartões para João Silva"
  - Botão "Confirmar Transferência"
- **Validações Antes de Processar**:
  - Todos cartões devem pertencer ao usuário atual (exceto Gerente/Admin)
  - Todos cartões devem estar em status que permite transferência
  - Respeitar **limite de transferências** do vendedor:
    - Se limite mensal = 10 e já usou 8, pode transferir no máximo 2 em lote
    - Erro antes de processar: "Limite excedido. Você pode transferir apenas 2 cartões (8/10 usados)"
  - Destinatário não pode ser o próprio usuário
  - Destinatário deve existir e estar ativo
- **Processamento Assíncrono**:
  - Sistema adiciona job à fila (Bull queue)
  - Modal fecha e mostra notificação: "Transferência em lote iniciada (15 cartões)"
  - Worker processa cartões **um por um** em background
  - Cada cartão gera registro individual em `card_transfers`
  - Campo `batch_id` identifica que fazem parte da mesma operação
- **Feedback em Tempo Real**:
  - Notificação persistente no topo da tela: "Transferindo... 8/15 concluídos"
  - Atualiza em tempo real via WebSocket/polling
  - Se algum cartão falhar: Continua processando os outros
  - Ao final: Relatório detalhado
- **Relatório de Resultado**:
  - Modal exibe ao final:
    - ✅ **Sucesso**: 13 cartões transferidos
    - ❌ **Falhas**: 2 cartões (com motivo de cada falha)
    - Lista de cartões com falha e erro específico
  - Opções: "Baixar Relatório CSV" / "Fechar"
- **Integração com Aprovação**:
  - Se **aprovação estiver habilitada**:
    - Sistema cria **1 solicitação para cada cartão** (N registros em `transfer_requests`)
    - Todas solicitações compartilham mesmo `batch_id`
    - Gerente pode aprovar/rejeitar individualmente ou em lote
    - Painel de aprovações mostra: "Lote de 15 cartões de Maria Silva"
- **Integração com Limite**:
  - Transferências em lote **contam no limite** do vendedor
  - Se transferir 15 cartões, consome 15 do limite mensal
  - Validação é feita **antes** de iniciar processamento
  - Se no meio do processamento atingir limite: Para e reporta no relatório
- **Casos de Uso**:
  - **Rebalanceamento**: Gerente transfere 20 leads de vendedor sobrecarregado para novato
  - **Férias**: Vendedor transfere todos seus leads ativos (30) para colega
  - **Especialização**: Admin transfere todos leads "Enterprise" (15) para especialista
  - **Mudança de território**: Gerente redistribui leads por região
- **Limitações**:
  - Todos cartões vão para **mesmo destinatário** (não permite destinos diferentes)
  - Mesmo **motivo** para todos (simplifica UX)
  - Máximo **50 cartões por operação**
  - Não permite agendar transferência (processamento imediato)
- **Gamificação**:
  - Pontos são atribuídos **por cartão transferido** (não por lote)
  - Se transferir 15 cartões: Ganha 15 × 25 pontos = 375 pontos
- **Logs e Auditoria**:
  - Cada transferência individual é registrada
  - Log de auditoria registra operação em lote:
    - "Transferência em lote: 15 cartões de [Vendedor] para [Destino]"
    - `batch_id` permite agrupar registros relacionados
  - Histórico do cartão mostra: "Transferido em lote (Lote #123)"

**Prioridade**: MÉDIA

**Relacionado a**: Frontend, API, Background Jobs, WebSocket

---

---

**Versão**: 2.0
**Data**: Dezembro 2025
**Status**: Completo

