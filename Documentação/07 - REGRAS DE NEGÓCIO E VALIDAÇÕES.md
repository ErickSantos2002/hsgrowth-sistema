# 07 - REGRAS DE NEGÓCIO E VALIDAÇÕES

## 1. INTRODUÇÃO

Este documento especifica as regras de negócio e validações que devem ser implementadas no sistema HSGrowth CRM. As regras garantem a consistência, integridade e conformidade do sistema com os requisitos de negócio.

---

## 2. REGRAS DE AUTENTICAÇÃO E AUTORIZAÇÃO

### RN-001: Autenticação de Vendedores

**Descrição**: Vendedores devem fazer login com e-mail/username e senha.

**Regras**:
- Email/username deve ser único por conta
- Senha deve ter mínimo 8 caracteres
- Senha deve conter: maiúscula, minúscula, número, caractere especial
- Senhas são armazenadas com hash bcrypt (salt rounds: 12)
- Tentativas de login falhadas: máximo 5 em 15 minutos
- Após 5 tentativas falhas, conta é bloqueada por 15 minutos
- JWT token expira em 24 horas
- Refresh token expira em 7 dias
- Logout revoga o token (adiciona à blacklist)

**Validações**:
- Email válido (RFC 5322)
- Username: 3-50 caracteres, apenas letras, números, underscore
- Senha: 8-128 caracteres

---

### RN-002: Autenticação de Sistemas Externos

**Descrição**: Sistemas externos autenticam com Client ID e Client Secret.

**Regras**:
- Client ID deve ser único por conta
- Client Secret é gerado aleatoriamente (256 bits)
- Client Secret é armazenado com hash bcrypt
- Token JWT expira em 1 hora
- Rate limiting: máximo 100 requisições por minuto por token
- Cada requisição é registrada em logs

**Validações**:
- Client ID: 32 caracteres alfanuméricos
- Client Secret: 64 caracteres alfanuméricos

---

### RN-003: Controle de Acesso Baseado em Roles

**Descrição**: Cada usuário tem um role que define suas permissões.

**Roles e Permissões** (6 roles reais — nome técnico no banco em inglês):

| Role (técnico) | Nome exibido | Permissões |
|------|------|------------|
| **admin** | Administrador | Tudo: criar, ler, editar, deletar, gerenciar usuários, gerenciar roles, acessar logs |
| **manager** | Gerente | Criar quadros, criar campos, gerenciar listas, ver todos os cartões, gerenciar usuários, ver relatórios |
| **salesperson** | Vendedor | Criar cartões, editar seus cartões, mover cartões, ver seus cartões, ver cartões compartilhados, comentar |
| **sdr** | SDR | Pré-qualificação de leads / prospecção; vê e trabalha seus cartões, cadências e atividades |
| **viewer** | Visualizador | Apenas leitura: ver cartões e relatórios; bloqueado em qualquer ação de escrita (403) |
| **service** | Serviço | Acesso ao módulo de Serviços (boards, dashboard e atividades de serviço); ver RN-003.1 |

**Regras**:
- Vendedor (salesperson) vê apenas seus cartões (assigned_to = user_id)
- Vendedor vê cartões compartilhados explicitamente
- Admin vê todos os cartões
- Gerente (manager) vê todos os cartões do seu quadro
- Visualizador (viewer) é bloqueado em endpoints de escrita pela dependency `require_not_viewer` (`backend/app/api/deps.py`)
- Permissões são verificadas em cada endpoint
- Acesso negado retorna erro 403

---

### RN-003.1: Restrição de Acesso ao Módulo de Serviço

**Descrição**: O módulo de Serviço (boards de serviço, dashboard de serviço e atividades de serviço) é restrito a um subconjunto de roles.

**Regras**:
- Têm acesso ao módulo de Serviço apenas: **admin**, **manager** e **service**
- **Vendedor (salesperson), SDR e Visualizador (viewer) são bloqueados** (erro 403)
- A restrição é aplicada no nível de roteamento via dependency `require_service_access()` (`backend/app/api/deps.py`), aplicada aos routers `service-boards`, `service-dashboard` e `service-activities` (`backend/app/api/v1/__init__.py`) — portanto vale também para leitura, não só escrita
- Apenas **admin** e **manager** podem criar/editar boards e listas de serviço (validação adicional em `service_boards.py`); a role **service** pode criar/mover cards e atividades, mas não criar boards/listas

---

### RN-004: Isolamento de Dados por Conta

**Descrição**: Dados de uma conta não podem ser acessados por outra conta.

**Regras**:
- Cada query filtra por account_id do usuário autenticado
- Usuário de conta A não pode acessar dados de conta B
- Validação ocorre em nível de API e banco de dados
- Tentativa de acesso não autorizado é registrada em logs

---

## 3. REGRAS DE GESTÃO DE QUADROS

### RN-010: Criação de Quadro

**Descrição**: Apenas Admin e Gerente podem criar quadros.

**Regras**:
- Nome do quadro é obrigatório
- Nome deve ter 3-255 caracteres
- Nome deve ser único por conta
- Descrição é opcional (máximo 1000 caracteres)
- Cor deve ser válida (formato hex: #RRGGBB)
- Tipo padrão é Kanban
- Quadro é criado vazio (sem listas ou cartões)
- Criador é registrado como proprietário
- Timestamp de criação é registrado

**Validações**:
- Nome: 3-255 caracteres, sem caracteres especiais perigosos
- Cor: formato hex válido
- Tipo: kanban, list, ou calendar

---

### RN-011: Edição de Quadro

**Descrição**: Apenas Admin e Gerente podem editar quadros.

**Regras**:
- Pode editar: nome, descrição, cor, tipo de visualização
- Não pode editar: ID, data de criação
- Alteração é registrada em auditoria
- Timestamp de atualização é registrado

---

### RN-012: Exclusão de Quadro

**Descrição**: Apenas Admin pode deletar quadros.

**Regras**:
- Exclusão é permanente
- Todas as listas e cartões do quadro são deletados
- Arquivos anexados aos cartões são deletados
- Histórico de auditoria é mantido
- Confirmação é obrigatória

---

## 4. REGRAS DE GESTÃO DE CAMPOS CUSTOMIZADOS

### RN-020: Criação de Campo Customizado

**Descrição**: Apenas Admin e Gerente podem criar campos customizados.

**Regras**:
- Nome do campo é obrigatório (3-100 caracteres)
- Nome deve ser único por quadro
- Tipo de campo é obrigatório
- Campo obrigatório: padrão false
- Valor padrão é opcional
- Posição é auto-incrementada
- Cartões existentes recebem valor padrão ou null
- Alteração é registrada em auditoria

**Tipos de Campo Permitidos**:
- text: texto livre (máximo 1000 caracteres)
- email: email válido (RFC 5322)
- document: documento (CPF, CNPJ, etc.)
- date: data (YYYY-MM-DD)
- datetime: data e hora (ISO 8601)
- time: hora (HH:MM)
- due_date: data de vencimento com alertas
- currency: valor monetário (máximo 2 casas decimais)
- number: número (inteiro ou decimal)
- select: seleção de opções (pré-definidas)
- checkbox: booleano (true/false)
- user: referência a usuário (para atribuição)
- attachment: arquivo (máximo 50MB por arquivo)
- tag: etiqueta (múltiplas seleções)

---

### RN-021: Edição de Campo Customizado

**Descrição**: Apenas Admin e Gerente podem editar campos.

**Regras**:
- Pode editar: nome, descrição, obrigatoriedade, valor padrão
- Não pode editar: tipo de campo (para evitar inconsistências)
- Não pode editar: ID, data de criação
- Alteração é registrada em auditoria
- Cartões existentes não são alterados (apenas novos recebem novo padrão)

---

### RN-022: Exclusão de Campo Customizado

**Descrição**: Apenas Admin pode deletar campos.

**Regras**:
- Exclusão é permanente
- Valores do campo são deletados de todos os cartões
- Confirmação é obrigatória
- Alteração é registrada em auditoria

---

## 5. REGRAS DE GESTÃO DE CARTÕES

### RN-030: Criação de Cartão

**Descrição**: Vendedores podem criar cartões.

**Regras**:
- Título é obrigatório (3-255 caracteres)
- Descrição é opcional (máximo 5000 caracteres)
- Campos customizados obrigatórios devem ser preenchidos
- Valores de campos devem passar em validação de tipo
- Cartão é criado na lista especificada
- Criador é registrado
- Cartão recebe ID único sequencial
- Posição é auto-incrementada
- Timestamp de criação é registrado
- Responsável é opcional (pode ser deixado em branco)

**Validações**:
- Título: 3-255 caracteres
- Descrição: máximo 5000 caracteres
- Campos customizados: validação conforme tipo
- Lista: deve existir e estar no mesmo quadro

---

### RN-031: Edição de Cartão

**Descrição**: Vendedor pode editar seus cartões, Admin pode editar qualquer cartão.

**Regras**:
- Pode editar: título, descrição, campos customizados, responsável
- Não pode editar: ID, data de criação, criador
- Alteração é registrada em auditoria
- Timestamp de atualização é registrado
- Histórico de alterações é mantido
- Vendedor não pode editar cartão de outro vendedor (exceto Admin)

---

### RN-032: Exclusão de Cartão

**Descrição**: Vendedor pode deletar seus cartões, Admin pode deletar qualquer cartão.

**Regras**:
- Exclusão é permanente
- Arquivos anexados são deletados
- Comentários são deletados
- Histórico de movimentos é mantido (para auditoria)
- Confirmação é obrigatória
- Alteração é registrada em auditoria

---

### RN-033: Movimentação de Cartão

**Descrição**: Vendedor pode mover seus cartões entre listas.

**Regras**:
- Cartão pode ser movido para qualquer lista do mesmo quadro
- Cartão não pode ser movido para lista de outro quadro
- Posição é atualizada
- Movimento é registrado em tabela de movimentos
- Timestamp de movimento é registrado
- Histórico de movimentos é mantido
- Notificações podem ser enviadas (se configurado)

---

### RN-034: Atribuição de Cartão

**Descrição**: Gerente pode atribuir cartões a vendedores.

**Regras**:
- Cartão pode ser atribuído a um vendedor ativo
- Cartão pode ser deixado sem atribuição
- Atribuição é registrada em auditoria
- Notificação é enviada ao vendedor (se ativada)
- Vendedor pode reatribuir seu cartão a outro vendedor

---

### RN-035: Arquivamento de Cartão

**Descrição**: Cartões podem ser arquivados em vez de deletados.

**Regras**:
- Cartão arquivado não aparece em visualizações padrão
- Cartão arquivado pode ser restaurado
- Arquivamento é registrado em auditoria
- Filtro especial mostra cartões arquivados

---

### RN-036: SDR — Resgatar negócio perdido na Aquisição *(adicionado 03/08/2026)*

**Contexto**: o SDR trabalha na **Prospecção** (board 6); ao agendar a reunião e vincular o vendedor, o card vai para a **Aquisição** (board 7), onde o SDR fica **somente-leitura** (vê, mas não edita). Esta regra permite o SDR **resgatar** negócios **perdidos** da Aquisição de volta ao funil.

**Regras**:
- **Quem**: usuários com role **SDR**.
- **Onde**: cards em **Negócio Perdido** do board **Aquisição (7)**. Uma **exceção** à regra de somente-leitura do SDR nesse board — só essa ação é liberada; o resto do card segue read-only.
- **Ação ("Resgatar Negócio")**: reusa o reopen — clona o card para **Prospecção → Lead Novo** (`list_id=22`); o original **continua perdido**. No clone:
  - **Vendedor** (`assigned_to_id`) = o vendedor **original** (o `reopen_card` restaura, pois a criação por SDR normalmente zera esse campo);
  - **SDR** (`sdr_id`) = o **SDR que resgatou** (usuário atual).
- **Visibilidade**: o SDR enxerga, na Aquisição, os perdidos **onde já é o SDR** (`sdr_id` = ele) **e** também os perdidos **SEM SDR** (`sdr_id IS NULL`) — estes ficam disponíveis para qualquer SDR resgatar. **Não** vê perdidos de **outro** SDR nem cards ativos sem SDR. (Implementado no filtro do repositório: `(Card.sdr_id == uid) OR (Card.sdr_id IS NULL AND is_lost)`, só no board 7.)
- **Admin/Gerente**: mantêm o botão **"Reabrir Negócio"** (mesma clonagem), sem restrição de board — sem mudança.
- **Relacionado**: RN-033 (Movimentação de Cartão), RN-034 (Atribuição de Cartão).

---

## 6. REGRAS DE IMPORTAÇÃO DE DADOS

### RN-040: Importação do Pipedrive

**Descrição**: Admin pode importar dados do Pipedrive em formato CSV.

**Regras**:
- Arquivo deve ser CSV válido
- Mapeamento de colunas é obrigatório
- Validação de dados é realizada antes da importação
- Transação é usada (tudo ou nada)
- Relatório de importação é gerado
- Histórico de importação é registrado
- Duplicatas são detectadas e tratadas
- Importação pode ser cancelada antes de confirmar

**Validações**:
- Arquivo: máximo 100MB
- Formato: CSV com encoding UTF-8
- Colunas: devem ser mapeadas para campos válidos
- Dados: devem passar em validação de tipo

---

### RN-041: Importação via API

**Descrição**: Sistemas externos podem enviar dados via API.

**Regras**:
- Autenticação obrigatória (Client ID/Secret)
- Payload JSON deve ser válido
- Campos obrigatórios devem estar presentes
- Validação de dados é realizada
- Transação é usada (tudo ou nada)
- Resposta inclui IDs dos cartões criados
- Erros são retornados com detalhes
- Rate limiting é aplicado

**Validações**:
- JSON válido
- Campos obrigatórios presentes
- Tipos de dados corretos
- Valores dentro de limites

---

### RN-042: Distribuição em Rodízio

**Descrição**: Cartões criados via API sem responsável podem ser distribuídos em rodízio.

**Regras**:
- Rodízio é ativado por quadro
- Cartão sem responsável entra na fila
- Próximo vendedor na sequência recebe o cartão
- Sequência é baseada em balanceamento de carga: vendedor com menos cartões ativos atribuídos
- Vendedor inativo é pulado
- Notificação é enviada ao vendedor
- Distribuição é registrada em auditoria

---

## 7. REGRAS DE BUSCA E FILTRO

### RN-050: Busca Textual

**Descrição**: Usuários podem buscar cartões por texto.

**Regras**:
- Busca é case-insensitive
- Busca ocorre em: título, descrição, campos de texto customizados
- Busca suporta múltiplas palavras (AND)
- Busca deve ser rápida (< 500ms)
- Resultados são paginados
- Permissões são respeitadas (vendedor vê apenas seus)

---

### RN-051: Filtros Avançados

**Descrição**: Usuários podem aplicar filtros avançados.

**Regras**:
- Filtros podem ser combinados (AND/OR)
- Filtros disponíveis: responsável, data, etiqueta, status, campos customizados
- Filtros devem ser rápidos (< 1s)
- Resultados são paginados
- Filtros podem ser salvos como visualizações
- Permissões são respeitadas

---

## 8. REGRAS DE RELATÓRIOS E KPIs

### RN-060: Cálculo de KPIs

**Descrição**: Sistema calcula KPIs de vendas.

**Regras**:
- KPIs são calculados em tempo real
- Dados são agregados por período (dia, semana, mês)
- KPIs incluem: cartões criados, concluídos, atrasados, tempo médio
- KPIs podem ser filtrados por vendedor, quadro, período
- Cálculos são armazenados em cache (atualizado a cada 1 hora)
- Permissões são respeitadas (vendedor vê apenas seus)

---

### RN-061: Exportação de Relatórios

**Descrição**: Usuários podem exportar relatórios.

**Regras**:
- Formatos: PDF, Excel, CSV
- Relatório inclui: período, filtros aplicados, dados, gráficos
- Arquivo é gerado no servidor
- Arquivo é enviado ao cliente
- Histórico de exportação é registrado
- Permissões são respeitadas

---

## 9. REGRAS DE AUDITORIA E LOGS

### RN-070: Registro de Alterações

**Descrição**: Todas as alterações são registradas em logs de auditoria.

**Regras**:
- Cada alteração registra: usuário, ação, tabela, ID, dados anteriores, dados novos, timestamp, IP
- Logs não podem ser deletados ou alterados
- Logs são armazenados em tabela separada
- Retenção de logs: mínimo 1 ano
- Limpeza de logs expirados ocorre automaticamente
- Acesso a logs é restrito a Admin
- Tentativa de acesso não autorizado é registrada

---

### RN-071: Visualização de Histórico

**Descrição**: Usuários podem visualizar histórico de cartões.

**Regras**:
- Histórico mostra todas as alterações em ordem cronológica
- Cada alteração mostra: campo, valor anterior, valor novo, usuário, timestamp
- Usuário pode reverter para versão anterior (se permissão)
- Reversão é registrada como nova alteração

---

## 10. REGRAS DE NOTIFICAÇÕES

### RN-080: Notificações de Atribuição

**Descrição**: Vendedor recebe notificação quando cartão é atribuído.

**Regras**:
- Notificação é enviada quando cartão é atribuído
- Notificação pode ser: in-app, email, push
- Notificação inclui: título do cartão, responsável, data
- Notificação pode ser marcada como lida
- Histórico de notificações é mantido

---

### RN-081: Notificações de Vencimento

**Descrição**: Vendedor recebe notificação sobre cartões vencidos.

**Regras**:
- Verificação diária de cartões vencidos
- Notificação é enviada 1 dia antes do vencimento
- Notificação é reenviada a cada dia até vencimento
- Após vencimento, notificação muda para \"Atrasado\"
- Notificação inclui: título, data de vencimento, dias de atraso

---

## 11. REGRAS DE INTEGRIDADE DE DADOS

### RN-090: Validação de Tipos de Dados

**Descrição**: Todos os dados devem passar em validação de tipo.

**Regras**:
- Email: RFC 5322
- Data: YYYY-MM-DD
- Data/Hora: ISO 8601
- Número: inteiro ou decimal (máximo 2 casas decimais para moeda)
- Booleano: true/false
- URL: RFC 3986
- Telefone: formato brasileiro (+55 XX XXXXX-XXXX)
- CPF: 11 dígitos, válido (algoritmo de validação)
- CNPJ: 14 dígitos, válido (algoritmo de validação)

---

### RN-091: Constraints de Integridade Referencial

**Descrição**: Relacionamentos entre tabelas devem ser mantidos.

**Regras**:
- Cartão não pode referenciar lista que não existe
- Lista não pode referenciar quadro que não existe
- Quadro não pode referenciar conta que não existe
- Usuário não pode referenciar conta que não existe
- Deletar conta deleta todos os quadros, listas, cartões (CASCADE)
- Deletar quadro deleta todas as listas e cartões (CASCADE)
- Deletar lista deleta todos os cartões (CASCADE)

---

### RN-092: Limites de Dados

**Descrição**: Sistema tem limites para evitar abuso.

**Regras**:
- Máximo 1000 cartões por lista
- Máximo 100 listas por quadro
- Máximo 50 campos customizados por quadro
- Máximo 100 etiquetas por conta
- Máximo 50MB por arquivo anexado
- Máximo 100 anexos por cartão
- Máximo 1000 comentários por cartão
- Máximo 10.000 logs de auditoria por dia

---

## 12. REGRAS DE SEGURANÇA

### RN-100: Proteção contra SQL Injection

**Descrição**: Sistema deve estar protegido contra SQL Injection.

**Regras**:
- Usar prepared statements para todas as queries
- Usar ORM (Sequelize, Prisma, etc.)
- Validação de entrada em todos os endpoints
- Sanitização de saída

---

### RN-101: Proteção contra XSS

**Descrição**: Sistema deve estar protegido contra XSS.

**Regras**:
- Sanitizar inputs de usuário
- Usar Content Security Policy (CSP)
- Escapar saída em templates
- Validar e sanitizar URLs

---

### RN-102: Proteção contra CSRF

**Descrição**: Sistema deve estar protegido contra CSRF.

**Regras**:
- Implementar CSRF tokens
- Validar origem (CORS)
- Usar SameSite cookies

---

### RN-103: Rate Limiting

**Descrição**: Sistema deve ter rate limiting para prevenir abuso.

**Regras**:
- Login: máximo 5 tentativas por 15 minutos
- API: máximo 100 requisições por minuto por token
- Busca: máximo 10 requisições por segundo por usuário
- Importação: máximo 1 por hora por conta

---

## 13. REGRAS DE GAMIFICAÇÃO

### RN-110: Atribuição de Pontos

**Descrição**: Sistema deve atribuir pontos automaticamente para ações dos vendedores.

**Regras**:
- Pontos são atribuídos automaticamente quando ação é realizada
- Ações pontuadas (valores padrão configuráveis):
  - Criar lead: 10 pontos
  - Fazer contato: 15 pontos
  - Enviar proposta: 25 pontos
  - Fechar venda: 100 pontos
  - Transferir para especialista: 25 pontos
- Admin pode configurar quantos pontos cada ação vale
- Pontos podem ser positivos ou negativos
- **Pontos são mantidos perpetuamente** (NUNCA resetam)
- Histórico completo de pontos é mantido permanentemente para análises
- Total de pontos acumula ao longo do tempo (vendedor com 2 anos pode ter 25.000 pontos)
- Pontos não podem ser editados ou deletados manualmente (apenas Admin em casos excepcionais via logs de auditoria)
- Sistema calcula:
  - **Total de pontos** (perpétuo, desde sempre)
  - **Pontos por período** (para rankings: semanal, mensal, trimestral, anual)

**Validações**:
- Pontos devem ser inteiros (não decimais)
- Ação deve existir e ser válida
- User_id deve ser válido

---

### RN-111: Cálculo de Rankings

**Descrição**: Rankings são calculados automaticamente por período com base em pontos do período.

**Regras**:
- **Rankings Periódicos** (baseados apenas em pontos do período, não totais):
  - **Ranking semanal**: Soma de pontos de domingo a sábado
  - **Ranking mensal**: Soma de pontos do mês (dia 1 a último dia)
  - **Ranking trimestral**: Soma de pontos de 3 meses (Q1, Q2, Q3, Q4)
  - **Ranking anual**: Soma de pontos do ano (01/01 a 31/12)
- Ranking atualiza em tempo real quando pontos são adicionados (cache de 5 minutos)
- Empates são resolvidos por timestamp (quem fez primeiro fica à frente)
- Top 3 recebem destaque especial com medalhas (🥇🥈🥉)
- Rankings são calculados por tabela separada `gamification_rankings` (não por pontos totais)
- Sistema mantém:
  - **Ranking atual** (período corrente)
  - **Rankings históricos** (períodos anteriores arquivados)

**Validações**:
- Período deve ser válido (weekly, monthly, quarterly, annual)
- Year deve ser >= 2025
- Period_number deve ser válido:
  - Semanas: 1-52
  - Meses: 1-12
  - Trimestres: 1-4
  - Anual: 1

---

### RN-112: Conquista de Badges

**Descrição**: Badges são concedidas automaticamente quando critério é atingido ou manualmente pelo Admin.

**Regras**:
- **Badges Padrão do Sistema**:
  - Pré-configuradas e não editáveis
  - Critérios automáticos verificados pelo sistema
  - Exemplos: Vendedor do Mês, Top 3, 100 Vendas
- **Badges Customizadas**:
  - Criadas pelo Admin por conta
  - Podem ter critério manual ou automático
  - Admin pode ativar/desativar
- Sistema verifica critérios de badges automáticas periodicamente (a cada 5 minutos via cron job)
- Badge é concedida uma única vez por vendedor (constraint UNIQUE na tabela)
- Vendedor recebe notificação quando conquista badge
- Badges desabilitadas não aparecem para novos vendedores, mas histórico é mantido
- Badges conquistadas não podem ser removidas (apenas soft delete)

**Validações**:
- Badge deve existir e estar ativa
- Vendedor não pode ter a mesma badge mais de uma vez (validação no banco)
- Para badges automáticas: critério deve ser atendido
- Para badges manuais: apenas Admin pode atribuir
- Vendedor já possui a badge? Retornar erro "Badge já conquistada"

---

### RN-112.1: Criação e Gestão de Badges Customizadas

**Descrição**: Admin pode criar e gerenciar badges customizadas para sua conta.

**Regras de Criação**:
- Nome é obrigatório (3-50 caracteres)
- Nome deve ser único por conta (validação: account_id + name)
- Descrição é obrigatória (máximo 200 caracteres)
- Ícone é opcional (emoji ou URL)
- Tipo de critério é obrigatório: 'manual' ou 'automatic'
- Se automático: critério (campo criteria) é obrigatório (ex: "pontos >= 1000")
- Se manual: campo criteria pode ser nulo
- Status padrão: ativa (is_active = true)
- Campo is_custom = true (diferencia de badges padrão)
- created_by registra ID do admin que criou

**Regras de Edição**:
- Admin pode editar: nome, descrição, ícone, status (ativa/inativa)
- Admin NÃO pode editar: tipo de critério (para evitar inconsistências)
- Alterações não afetam badges já conquistadas por vendedores
- Timestamp updated_at é atualizado

**Regras de Exclusão**:
- Apenas Admin pode deletar badges customizadas
- Confirmação é obrigatória (frontend)
- Soft delete: is_active = false (histórico mantido)
- Histórico de badges conquistadas (user_badges) é mantido

**Regras de Atribuição Manual**:
- Apenas para badges com criteria_type = 'manual'
- Admin seleciona vendedor(es) e atribui badge
- Sistema valida se vendedor já possui (constraint UNIQUE impede duplicatas)
- Campo assigned_by registra ID do admin
- Vendedor recebe notificação

**Validações**:
- Nome: 3-50 caracteres, sem caracteres especiais perigosos
- Descrição: máximo 200 caracteres
- Ícone: emoji válido ou URL válida (se fornecido)
- Tipo de critério: 'manual' ou 'automatic' apenas
- Se automatic: criteria não pode ser vazio
- Badge a ser deletada deve ser customizada (is_custom = true)

---

### RN-113: Reset de Rankings

**Descrição**: Rankings devem resetar periodicamente conforme o período, mas pontos totais são mantidos perpetuamente.

**Regras Importantes**:
- **APENAS RANKINGS RESETAM** - Pontos totais NUNCA são apagados
- Total de pontos acumulado é mantido perpetuamente para histórico
- Apenas os contadores de pontos por período resetam

**Regras de Reset**:
- **Ranking semanal**: Reseta todo domingo à meia-noite (00:00)
- **Ranking mensal**: Reseta no dia 1º de cada mês à meia-noite (00:00)
- **Ranking trimestral**: Reseta no início de cada trimestre (01/01, 01/04, 01/07, 01/10 às 00:00)
- **Ranking anual**: Reseta no dia 1º de janeiro à meia-noite (00:00)

**Processo de Reset** (executado automaticamente via cron job):
1. **Antes do Reset**:
   - Sistema calcula posições finais do período
   - Concede badges automáticas aos vencedores (ex: "Vendedor do Mês" para 1º lugar)
   - Envia notificações aos Top 3
   - Arquiva ranking completo na tabela `gamification_rankings` com flag de período encerrado
2. **Durante o Reset**:
   - Cria novo registro de ranking para o novo período
   - Contador de pontos do período volta a zero para todos
   - **Pontos totais permanecem intactos**
3. **Após o Reset**:
   - Novo período começa com ranking zerado
   - Todos os vendedores partem do zero naquele período
   - Vendedores podem consultar ranking anterior nos históricos

**Histórico de Rankings**:
- Rankings anteriores são arquivados permanentemente (não deletados)
- Vendedores podem consultar: "Quem foi 1º em Dezembro/2024?"
- Admin pode exportar rankings históricos para análises
- Tabela `gamification_rankings` mantém todos os períodos passados

**Validações**:
- Reset deve ocorrer automaticamente via cron job (node-cron)
- Sistema verifica se período anterior foi arquivado antes de resetar
- Logs de auditoria registram cada reset com timestamp e vencedores

---

## 14. REGRAS DE AUTOMAÇÕES

### RN-119: Limite de Automações por Conta

**Descrição**: Cada conta tem limite máximo de automações ativas para prevenir abuso e garantir performance.

**Regras**:
- **Limite máximo**: 50 automações ativas por conta
- Automações **inativas** (is_active = false) **não contam** no limite
- Automações **deletadas** não contam no limite
- Limite é validado ao criar nova automação
- Se limite atingido, criação de nova automação é bloqueada

**Objetivo do Limite**:
- Prevenir loops infinitos e bugs
- Manter performance saudável do sistema
- Forçar organização lógica de automações (combinar similares)
- Permitir planejamento de capacidade do servidor

**Mensagens ao Usuário**:
- Interface mostra contador: "Automações ativas: 45 / 50"
- Ao criar: "Automação criada com sucesso. Você tem 46/50 automações ativas."
- Próximo ao limite (>= 45): "⚠️ Aviso: Você tem 48/50 automações ativas. Considere desativar automações desnecessárias."
- Limite atingido: "❌ Limite de 50 automações ativas atingido. Desative automações existentes para criar novas."

**Validações**:
- Sistema valida limite antes de inserir no banco de dados
- Query: `SELECT COUNT(*) FROM automations WHERE account_id = ? AND is_active = true`
- Se count >= 50: Retornar erro 400 "Limite de automações atingido"

---

### RN-120: Execução de Automação

**Descrição**: Automações executam automaticamente quando trigger é ativado.

**Regras**:
- Automação só executa se estiver ativa (is_active = true)
- Automação executa em background (não bloqueia operação original)
- Se automação falhar, operação original continua normalmente
- Falhas são registradas em logs com mensagem de erro
- Automação respeita permissões (se usuário não tem acesso ao quadro destino, não executa)
- Automação pode executar múltiplas ações em sequência

**Validações**:
- Trigger deve ser válido (card_moved, card_created, card_updated)
- Action deve ser válida (move_card, copy_card, create_card, notify)
- Quadros e listas de origem e destino devem existir
- Usuário que triggou a automação deve ter permissão no quadro destino

---

### RN-120.1: Ordem de Execução de Múltiplas Automações

**Descrição**: Quando múltiplas automações são triggadas simultaneamente, ordem de execução é determinada por prioridade e timestamp.

**Regras de Priorização**:
- **Campo priority**: Valor de 1 a 100 (maior = executa primeiro)
- **Valor padrão**: 50 (Média)
- **Ordem de execução**:
  1. Ordenar por `priority DESC` (maior prioridade primeiro)
  2. Desempate por `created_at ASC` (mais antiga primeiro)
- **Query de ordenação**:
  ```sql
  SELECT * FROM automations
  WHERE trigger_type = ? AND trigger_list_id = ? AND is_active = true
  ORDER BY priority DESC, created_at ASC
  ```

**Classificação de Prioridade**:
- **Alta (90-100)**: Notificações críticas, logs de auditoria, webhooks importantes
- **Média (50-89)**: Movimentações de cartões, criações, cópias (padrão)
- **Baixa (1-49)**: Integrações externas não críticas, ações secundárias

**Cenário Exemplo**:
```
Cartão movido para lista "Fechado" triggera 3 automações:
1. "Notificar Gerente" (priority: 100, criada 10:00) → Executa 1º
2. "Mover p/ Pós-venda" (priority: 80, criada 10:05) → Executa 2º
3. "Enviar Email" (priority: 80, criada 10:10) → Executa 3º
```

**Execução Assíncrona**:
- Automações executam sequencialmente (uma por vez) na ordem de prioridade
- Se automação falhar, próxima da fila continua executando
- Timeout de 30 segundos por automação
- Máximo de 10 automações em cadeia (prevenção de loops)

**Validações**:
- priority deve ser inteiro entre 1 e 100
- Se priority não informado, usar valor padrão 50
- Admin pode editar prioridade de automações existentes

---

### RN-120.2: Automações Agendadas

**Descrição**: Regras para criação, execução e gerenciamento de automações agendadas.

**Tipos de Automação**:
- **trigger** (Por Gatilho): Executa quando evento ocorre (comportamento padrão)
- **scheduled** (Agendada): Executa em datas/horários específicos

**Tipos de Agendamento**:
1. **Execução Única** (`schedule_type = 'once'`):
   - Roda uma única vez em data/hora específica
   - `schedule_config`: `{"datetime": "2026-01-15T09:00:00Z"}`
   - Após executar: `is_active` automaticamente vira `false`
   - `next_execution_at` vira `NULL`

2. **Execução Recorrente** (`schedule_type = 'recurring'`):
   - **Diária**: `{"frequency": "daily", "time": "08:00"}`
   - **Semanal**: `{"frequency": "weekly", "day_of_week": 1, "time": "09:00"}` (1=segunda, 7=domingo)
   - **Mensal**: `{"frequency": "monthly", "day_of_month": 1, "time": "02:00"}` (1-31)
   - **Anual**: `{"frequency": "annual", "month": 1, "day": 1, "time": "00:00"}` (mês: 1-12)
   - Após executar: Sistema **calcula próxima execução** automaticamente
   - `next_execution_at` atualizado para próxima data/hora
   - `last_executed_at` atualizado com timestamp da execução

**Regras de Validação**:
- `automation_type = 'scheduled'` → Campos `trigger_type`, `trigger_board_id`, `trigger_list_id` devem ser `NULL`
- `automation_type = 'trigger'` → Campos `schedule_type`, `schedule_config`, `next_execution_at` devem ser `NULL`
- `schedule_type = 'once'` → `schedule_config.datetime` obrigatório (data futura)
- `schedule_type = 'recurring'` → `schedule_config.frequency` obrigatório + campos específicos da frequência
- Todos os horários são salvos em **UTC** no banco
- Interface exibe horários no **timezone da conta** do usuário

**Cálculo de Próxima Execução** (Recorrentes):
- **Diária**: `next_execution_at = hoje às HH:mm` (se já passou, amanhã)
- **Semanal**: Próxima ocorrência do dia da semana escolhido
- **Mensal**:
  - Se `day_of_month > dias do mês`, usar último dia do mês (ex: 31 em fevereiro = 28/29)
  - Próximo mês se data já passou
- **Anual**: Próxima ocorrência de DD/MM (se já passou este ano, próximo ano)

**Limites**:
- Automações agendadas **contam no limite de 50** por conta (mesmo limite de trigger-based)
- Validação ao criar: `COUNT(*) WHERE account_id = ? AND is_active = true < 50`

**Execução** (Cron Job):
- Job roda **a cada 1 minuto**
- Query:
  ```sql
  SELECT * FROM automations
  WHERE automation_type = 'scheduled'
    AND is_active = true
    AND next_execution_at <= NOW()
  ORDER BY next_execution_at ASC
  ```
- Executar ação configurada (`action_type`)
- Registrar execução em `automation_executions` com `triggered_by = 'schedule'`
- Se `schedule_type = 'once'`: Desativar automação (`is_active = false`)
- Se `schedule_type = 'recurring'`: Calcular e salvar `next_execution_at`
- Atualizar `last_executed_at`

**Tratamento de Erros**:
- Se falha na execução: **não desativa automação agendada** (diferente de trigger-based)
- Registra falha em `automation_executions` com `status = 'failed'`
- Recalcula `next_execution_at` normalmente (não pula execução)
- Notificações de falha seguem mesmas regras de RN-124.1

**Interface**:
- Listagem mostra coluna "Próxima Execução" (datetime ou "N/A")
- Badge visual: 🕐 Agendada | ⚡ Por Gatilho
- Filtros: "Tipo: [Todas] [Por Gatilho] [Agendadas]"

---

### RN-121: Mapeamento de Campos

**Descrição**: Campos são mapeados entre quadros diferentes durante automação.

**Regras**:
- Apenas campos compatíveis podem ser mapeados (mesmo tipo ou conversível)
- Campos não mapeados ficam vazios no destino
- Transformações de tipo são permitidas (ex: texto → número se conversível)
- Mapeamento é salvo em JSON junto com a automação
- Se campo de origem não existir mais, automação falha com erro claro

**Validações**:
- Field_mapping deve ser JSON válido
- Campos mapeados devem existir nos quadros de origem e destino
- Tipos de dados devem ser compatíveis

---

### RN-122: Prevenção de Loop Infinito

**Descrição**: Sistema deve prevenir loops infinitos de automações.

**Regras**:
- Se automação A move cartão para lista que triggaria automação B que move de volta, detectar e bloquear
- Máximo de 10 automações em cadeia por cartão
- Se limite for atingido, automação para e registra aviso
- Admin recebe notificação de possível loop

**Validações**:
- Contador de execuções em cadeia por cartão
- Timeout de 30 segundos por automação

---

### RN-123: Condições de Trigger

**Descrição**: Triggers podem ter condições adicionais.

**Regras**:
- Condições são opcionais
- Condições podem ser: valor do campo > X, valor do campo = Y, cartão tem tag Z
- Múltiplas condições podem ser combinadas com AND/OR
- Se condição não for atendida, automação não executa

**Validações**:
- Condições devem ser JSON válido
- Operadores devem ser válidos (>, <, =, !=, contains)
- Valores devem ser compatíveis com tipo do campo

---

### RN-124: Retry de Automações Falhadas

**Descrição**: Automações que falharem devem tentar novamente automaticamente.

**Regras**:
- Automação falha pode ser retentada automaticamente (máximo 3 tentativas)
- Retry usa backoff exponencial:
  - Tentativa 1: aguarda 30 segundos
  - Tentativa 2: aguarda 2 minutos
  - Tentativa 3: aguarda 5 minutos
- Após 3 tentativas falhadas, automação é marcada como "falha permanente"
- Admin recebe notificação de falha permanente
- Contador de tentativas é registrado em automation_executions.retry_count
- Status pode ser: 'success', 'failed', 'pending', 'success_after_retry'

**Validações**:
- Retry_count deve ser <= 3
- Intervalo entre retries deve seguir backoff exponencial
- Falha permanente após 3 tentativas

---

### RN-124.1: Notificações de Falhas de Automação

**Descrição**: Sistema notifica Admin e criador da automação quando automação falha.

**Regras de Notificação In-App**:
- **Sempre** envia notificação in-app quando automação falha (após 3 tentativas de retry)
- **Destinatários**: Admin + Criador da automação (campo created_by)
- **Conteúdo da notificação**:
  - Tipo: "automation_failed"
  - Título: "Automação [nome] falhou"
  - Mensagem: Resumo do erro + cartão afetado
  - Link: URL para detalhes da execução
  - Ações: Botões "Ver Detalhes" e "Desativar Automação"
- Notificação fica no sino até ser marcada como lida
- Vendedores comuns **NÃO** recebem notificações de falhas (apenas Admin e criador)

**Regras de Notificação por Email** (Apenas Crítico):
- **Quando enviar email**:
  1. Mesma automação falhou **3+ vezes em 1 hora** (indica problema persistente)
  2. Automação foi **desativada automaticamente** (após 10 falhas consecutivas)
  3. Erro crítico detectado: Lista/quadro deletado (404), Permissão negada (403), Timeout (> 30s)
- **Configuração SMTP** (Microsoft 365):
  - Host: smtp.office365.com
  - Port: 587
  - TLS: true
  - From: ti@healthsafetytech.com
- **Destinatários**: Email do Admin + Email do criador
- **Assunto**: "🔴 Automação [nome] falhou [N] vezes" ou "🔴 Automação [nome] foi desativada"
- **Conteúdo do email**:
  - Nome da automação, descrição do erro, número de falhas
  - Última falha (timestamp), cartão afetado
  - Ação recomendada, link para sistema

**Agrupamento de Emails** (Anti-spam):
- Se 5+ automações falharem na mesma hora: Enviar 1 único email com resumo
- Emails agrupados enviados a cada hora (não imediatamente)

**Configuração de Emails** (Admin):
- Admin pode ativar/desativar em Configurações → Notificações (padrão: Ativado)
- Admin pode configurar threshold (email após X falhas, padrão: 3)
- Armazenado em `account_settings` (JSON)

**Desativação Automática**:
- Se automação falhar **10+ vezes consecutivas**: sistema desativa (is_active = false)
- Email crítico enviado imediatamente
- Log de auditoria registra desativação

**Validações**:
- Email deve ser válido no cadastro de usuários
- SMTP configurado corretamente em .env
- Fallback: Se envio falhar, registrar erro em logs mas não bloquear
- Retry de email: 2 tentativas com 1 minuto de intervalo

---

## 15. REGRAS DE TRANSFERÊNCIA DE CARTÕES

### RN-130: Permissões de Transferência

**Descrição**: Apenas usuários autorizados podem transferir cartões.

**Regras**:
- Vendedor pode transferir apenas seus próprios cartões
- Gerente pode transferir cartões de sua equipe
- Admin pode transferir qualquer cartão
- Não pode transferir para si mesmo
- Não pode transferir cartão finalizado (Venda Fechada, Perdido, Cancelado)
- Transferência para pós-venda via automação é permitida

**Validações**:
- User_id do vendedor deve ter permissão sobre o cartão
- To_user_id deve ser diferente de from_user_id
- To_user_id deve ser usuário ativo
- Status do cartão deve permitir transferência

---

### RN-131: Histórico de Transferências

**Descrição**: Histórico de transferências é imutável.

**Regras**:
- Cada transferência registra: de quem, para quem, data/hora, motivo, quem fez
- Histórico não pode ser editado
- Histórico não pode ser deletado
- Cartão sempre mantém referência ao vendedor original (original_owner_id)
- Cartão sempre mantém referência ao responsável atual (current_owner_id)
- Timeline mostra toda a cadeia de transferências

**Validações**:
- Transferência não pode ser modificada após criação
- Operações UPDATE e DELETE são bloqueadas na tabela card_transfers

---

### RN-132: Pontos por Transferência

**Descrição**: Pontos são distribuídos para todos os envolvidos na cadeia de transferência.

**Regras**:
- Vendedor original ganha 25 pontos ao transferir para especialista
- Vendedor original ganha 50 pontos bônus se cartão é convertido em venda (mesmo após transferência)
- Novo responsável ganha 25 pontos por assumir cartão transferido
- Novo responsável ganha pontos normais ao fechar venda
- Pontos são atribuídos automaticamente na transferência

**Validações**:
- Pontos devem ser atribuídos para ambos (original e novo)
- Bônus de conversão só é dado se venda for fechada

---

### RN-134: Notificações de Transferência

**Descrição**: Todos os envolvidos são notificados quando cartão é transferido.

**Regras**:
- Vendedor original recebe: "Seu cartão foi transferido para [nome]"
- Novo responsável recebe: "Você recebeu cartão de [nome]"
- Gerente recebe (se configurado): "Transferência realizada: [de] → [para]"
- Notificação inclui link direto para o cartão
- Notificação pode ser in-app, email ou ambos (configurável por usuário)

**Validações**:
- Notificação deve ser enviada de forma assíncrona
- Falha no envio de notificação não deve bloquear transferência

---

### RN-135: Motivos de Transferência

**Descrição**: Transferência deve ter motivo documentado.

**Regras**:
- Motivos pré-definidos: Especialista, Rebalanceamento, Férias, Escalação, Outro
- Campo de notas é opcional (texto livre até 500 caracteres)
- Motivo é registrado permanentemente no histórico
- Relatórios podem filtrar por motivo

**Validações**:
- Motivo deve ser um dos valores pré-definidos
- Notas devem ter máximo 500 caracteres

---

### RN-135.1: Limite de Transferências por Período

**Descrição**: Sistema controla quantas transferências cada vendedor pode fazer por período para evitar transferências excessivas.

**Configuração Global** (por conta):
- **transfer_limit_enabled**: `true` (padrão) ou `false` (ilimitado)
- **transfer_limit_period**: `'daily'`, `'weekly'`, `'monthly'` (padrão)
- **transfer_limit_quantity**: `5`, `10` (padrão), `20`, `50`, ou `NULL` (ilimitado)
- Admin pode ajustar em: Configurações → Transferências
- Mudança tem efeito imediato

**O que conta no limite**:
- ✅ Transferências **enviadas** pelo vendedor (`from_user_id = vendedor` e `counts_in_limit = true`)
- ❌ Transferências **recebidas** (`to_user_id = vendedor`) - NÃO contam
- ❌ Transferências automáticas via automações (`counts_in_limit = false`)
- ❌ Transferências feitas por **Gerente/Admin** (`counts_in_limit = false`)
  - Quando Gerente/Admin transfere cartão de outro vendedor, não conta no limite do vendedor
  - Lógica: `transferred_by_user_id != from_user_id` → `counts_in_limit = false`

**Cálculo do Limite**:
1. Buscar configuração da conta: `limit_enabled`, `limit_period`, `limit_quantity`
2. Se `limit_enabled = false` ou `limit_quantity = NULL` → Permitir
3. Se usuário é Gerente ou Admin → Permitir (isento)
4. Calcular data de início do período:
   - **Diário**: 00:00 de hoje
   - **Semanal**: Segunda-feira 00:00 desta semana
   - **Mensal**: Dia 1º 00:00 deste mês
5. Query:
   ```sql
   SELECT COUNT(*) FROM card_transfers
   WHERE from_user_id = ?
     AND counts_in_limit = true
     AND transferred_at >= ?
   ```
6. Se `count >= limit_quantity` → Bloquear com mensagem de erro

**Exceção Temporária**:
- Gerente pode conceder **exceção temporária** para vendedor específico
- Tabela auxiliar: `transfer_limit_exceptions`
  ```sql
  CREATE TABLE transfer_limit_exceptions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL REFERENCES users(id),
    additional_transfers INT DEFAULT 5, -- +5 transferências extras
    period_start DATE NOT NULL, -- Início do período
    period_end DATE NOT NULL, -- Fim do período
    granted_by BIGINT NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- Cálculo com exceção: `limit_quantity + additional_transfers`
- Exceção expira no fim do período (reset automático)
- Log de auditoria registra concessão

**Reset Automático**:
- Sistema **não precisa** fazer reset ativo
- Cálculo é sempre baseado em `transferred_at >= period_start`
- Contador "zera" automaticamente quando muda o período

**Mensagens de Erro**:
- **80-99% do limite**:
  - Badge amarelo: "Aviso: 9/10 transferências usadas este mês"
- **100% do limite**:
  - Botão "Transferir" desabilitado
  - Tooltip: "Limite de transferências atingido (10/10 este mês). Aguarde próximo período ou contate seu gerente."
  - API retorna 403 com:
    ```json
    {
      "error": "TRANSFER_LIMIT_EXCEEDED",
      "message": "Limite de 10 transferências mensais atingido (10/10). Aguarde até 01/01/2026 ou solicite exceção ao gerente.",
      "current_count": 10,
      "limit": 10,
      "period": "monthly",
      "reset_date": "2026-01-01T00:00:00Z"
    }
    ```

**Validações**:
- Verificar limite **antes** de criar registro em `card_transfers`
- Se bloqueado, **não criar** registro e retornar erro
- Gerente/Admin sempre passam pela validação (mas `counts_in_limit = false`)

---

### RN-135.2: Aprovação de Transferências (Opcional)

**Descrição**: Sistema pode exigir aprovação de gerente para transferências, se configurado (padrão: OFF).

**Configuração Global** (por conta):
- **transfer_approval_required**: `false` (padrão) ou `true`
- Padrão: **OFF** - Transferências são diretas, sem aprovação
- Admin pode habilitar a qualquer momento em: Configurações → Transferências
- Mudança tem efeito imediato para novas transferências

**Fluxo SEM Aprovação** (transfer_approval_required = false):
1. Vendedor clica "Transferir"
2. Sistema valida: limite, permissões, status do cartão
3. Sistema cria registro em `card_transfers` imediatamente
4. Cartão passa para novo responsável
5. Notificações são enviadas
6. **Fluxo direto, sem intermediários**

**Fluxo COM Aprovação** (transfer_approval_required = true):
1. Vendedor clica "Solicitar Transferência"
2. Sistema valida: limite, permissões, status do cartão
3. Sistema cria registro em `transfer_requests` com `status = 'pending'`
4. Sistema calcula `expires_at = NOW() + 72 horas`
5. **Cartão permanece** com vendedor original (não é transferido ainda)
6. Gerente recebe notificação (in-app + email opcional)
7. Aguarda ação do gerente

**Exceções** (NUNCA precisam aprovação, mesmo se habilitado):
- Usuário é **Gerente ou Admin**: Transferência direta (cria `card_transfers`)
- Transferência é **automática** (via automações): Transferência direta
- Lógica: Se `user.role IN ('manager', 'admin')` → Bypass aprovação

**Ações do Gerente**:

**1. Aprovar**:
- Sistema atualiza `transfer_requests`:
  - `status = 'approved'`
  - `reviewed_by = gerente.id`
  - `reviewed_at = NOW()`
- Sistema cria registro em `card_transfers`:
  - Todos dados da solicitação
  - `counts_in_limit = true` (conta no limite do vendedor)
- Sistema atualiza cartão: `assigned_to = to_user_id`
- Notificações enviadas: Vendedor original + Novo responsável
- Pontos de gamificação atribuídos (RN-132)

**2. Rejeitar**:
- Sistema atualiza `transfer_requests`:
  - `status = 'rejected'`
  - `reviewed_by = gerente.id`
  - `reviewed_at = NOW()`
  - `rejection_reason = motivo` (obrigatório)
- Cartão **permanece** com vendedor original
- Notificação enviada ao vendedor: "Solicitação rejeitada: [motivo]"
- **NÃO cria** registro em `card_transfers`

**Expiração Automática** (Cron Job):
- Job roda **a cada 1 hora**
- Query:
  ```sql
  UPDATE transfer_requests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at <= NOW()
  ```
- Solicitações expiradas (72h sem resposta) viram `status = 'expired'`
- Tratadas como rejeição (cartão permanece com vendedor original)
- Notificação enviada: "Solicitação de transferência expirou (sem resposta em 72h)"

**Validações**:
- **Ao criar solicitação**:
  - Cartão deve pertencer ao vendedor (`assigned_to = from_user_id`)
  - Cartão não pode estar em status final (Venda Fechada, Perdido, Cancelado)
  - Vendedor não pode ter solicitação pendente para o mesmo cartão
  - Limite de transferências deve ser respeitado (mesmo para solicitações)
- **Ao aprovar**:
  - Solicitação deve estar `status = 'pending'`
  - Solicitação não pode estar expirada (`expires_at > NOW()`)
  - Cartão ainda deve pertencer ao vendedor original
  - Usuário que aprova deve ser Gerente ou Admin
- **Ao rejeitar**:
  - Motivo da rejeição é **obrigatório** (min 10 caracteres)
  - Solicitação deve estar `status = 'pending'` ou `status = 'expired'`

**Mensagens de Erro**:
- **Solicitação pendente existente**:
  ```json
  {
    "error": "TRANSFER_REQUEST_PENDING",
    "message": "Já existe uma solicitação de transferência pendente para este cartão. Aguarde aprovação ou cancele a solicitação anterior.",
    "request_id": 123,
    "expires_at": "2025-12-18T10:00:00Z"
  }
  ```
- **Solicitação expirada ao tentar aprovar**:
  ```json
  {
    "error": "TRANSFER_REQUEST_EXPIRED",
    "message": "Solicitação expirou (72h sem resposta). Vendedor deve criar nova solicitação.",
    "expired_at": "2025-12-15T10:00:00Z"
  }
  ```

**Observações**:
- Funcionalidade é **opcional** e **desabilitada por padrão**
- Ideal para empresas que crescem e precisam de mais controle
- HSGrowth atualmente não usa (sem gerente), mas está pronto para futuro
- Histórico completo de solicitações é mantido (auditoria)

---

### RN-135.3: Transferência em Lote

**Descrição**: Sistema permite transferir múltiplos cartões de uma vez para mesmo destinatário.

**Limite de Cartões por Operação**:
- Mínimo: **2 cartões** (senão é transferência individual)
- Máximo: **50 cartões** por operação
- Se usuário tentar selecionar mais de 50: Bloquear seleção e exibir mensagem

**Validações Antes de Processar**:
1. **Propriedade dos cartões**:
   - Todos cartões devem pertencer ao usuário (`assigned_to = user_id`)
   - Exceção: Gerente/Admin podem transferir cartões de qualquer vendedor
2. **Status dos cartões**:
   - Todos cartões devem estar em status que permite transferência
   - Não permite: "Venda Fechada", "Perdido", "Cancelado"
   - Se algum cartão inválido: Remover da lista e avisar usuário
3. **Limite de transferências**:
   - Verificar quantas transferências o vendedor ainda pode fazer no período
   - Exemplo: Limite mensal = 10, já usou 8, pode transferir no máximo 2 em lote
   - Se limite insuficiente:
     ```json
     {
       "error": "TRANSFER_LIMIT_INSUFFICIENT",
       "message": "Limite de transferências insuficiente. Você pode transferir apenas 2 cartões (8/10 usados este mês).",
       "available": 2,
       "selected": 15,
       "current_count": 8,
       "limit": 10,
       "period": "monthly"
     }
     ```
   - Permitir usuário ajustar seleção (desmarcar cartões)
4. **Destinatário**:
   - Destinatário não pode ser o próprio usuário
   - Destinatário deve existir e estar ativo (`status = 'active'`)
5. **Solicitações pendentes** (se aprovação habilitada):
   - Verificar se algum cartão já tem solicitação pendente
   - Se sim: Remover da lista e avisar

**Processamento Assíncrono**:
1. **Gerar batch_id**: UUID único (ex: `550e8400-e29b-41d4-a716-446655440000`)
2. **Adicionar job à fila**:
   - Nome do job: `process-bulk-transfer`
   - Payload: `{ batch_id, card_ids, from_user_id, to_user_id, reason, notes }`
3. **Worker processa um por um**:
   - Para cada cartão na lista:
     - Se `transfer_approval_required = false`:
       - Criar registro em `card_transfers` com `batch_id`
       - Atualizar cartão: `assigned_to = to_user_id`
       - Atribuir pontos de gamificação
       - Enviar notificações
     - Se `transfer_approval_required = true`:
       - Criar registro em `transfer_requests` com `batch_id`
       - **NÃO transferir** (aguarda aprovação)
   - Se algum cartão falhar:
     - Registrar erro específico
     - **Continuar** processando os próximos (não parar)
4. **Ao final**: Gerar relatório com sucesso/falhas

**Integração com Limite de Transferências**:
- Cada cartão transferido **consome 1** do limite do vendedor
- Se transferir 15 cartões: Consome 15 do limite mensal
- Validação de limite é feita **antes** de iniciar processamento
- Gerente/Admin isentos: `counts_in_limit = false` para todos cartões do lote

**Integração com Aprovação** (se habilitada):
- Sistema cria **1 solicitação para cada cartão**
- Todas solicitações compartilham o mesmo `batch_id`
- Gerente pode:
  - **Aprovar todas** (botão "Aprovar Lote")
  - **Rejeitar todas** (botão "Rejeitar Lote")
  - **Aprovar/Rejeitar individualmente** (botão em cada item)
- Ao aprovar em lote:
  - Atualiza todas solicitações: `status = 'approved'`, `reviewed_by = gerente_id`
  - Cria registros em `card_transfers` (um por cartão)
  - Transfere todos cartões
- Ao rejeitar em lote:
  - Motivo da rejeição é aplicado a todas
  - Nenhum cartão é transferido

**Relatório de Resultado**:
```json
{
  "batch_id": "550e8400-e29b-41d4-a716-446655440000",
  "total": 15,
  "success": 13,
  "failed": 2,
  "successes": [
    { "card_id": 101, "card_name": "Lead XYZ Corp" },
    { "card_id": 102, "card_name": "Lead ABC Inc" }
    // ... mais 11
  ],
  "failures": [
    {
      "card_id": 103,
      "card_name": "Lead DEF Ltd",
      "error": "CARD_STATUS_INVALID",
      "message": "Cartão está em status 'Perdido' e não pode ser transferido"
    },
    {
      "card_id": 104,
      "card_name": "Lead GHI Co",
      "error": "CARD_NOT_FOUND",
      "message": "Cartão não encontrado (pode ter sido deletado)"
    }
  ],
  "processed_at": "2025-12-15T14:30:00Z"
}
```

**Feedback em Tempo Real**:
- Sistema atualiza progresso via WebSocket ou polling
- Cliente exibe: "Transferindo... 8/15 concluídos"
- Ao final: Exibe modal com relatório completo

**Gamificação**:
- Pontos são atribuídos **por cartão transferido**
- Exemplo: 15 cartões × 25 pontos = 375 pontos totais
- Pontos são registrados **individualmente** (15 registros em `gamification_points`)

**Logs e Auditoria**:
- Cada transferência gera registro individual em `card_transfers`
- Campo `batch_id` permite agrupar registros relacionados
- Log de auditoria registra:
  - "Transferência em lote iniciada: 15 cartões de [Vendedor] para [Destino] (Lote #550e8400...)"
  - "Transferência em lote concluída: 13 sucesso, 2 falhas (Lote #550e8400...)"
- Timeline do cartão mostra: "Transferido em lote (Lote #550e8400) de [Vendedor] para [Destino]"

**Query para Listar Transferências de um Lote**:
```sql
SELECT * FROM card_transfers
WHERE batch_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at ASC;
```

**Limitações**:
- Todos cartões vão para **mesmo destinatário**
- Mesmo **motivo** para todos os cartões
- Máximo **50 cartões** por operação
- Processamento é **imediato** (não permite agendar)
- Não permite desfazer lote completo (deve reverter individualmente)

---

## 16. REGRAS DO MÓDULO DE SERVIÇO

> O módulo de Serviço é **independente** dos boards de Vendas. A documentação detalhada
> (estrutura das etapas, matriz de regras de avanço campo a campo, dashboard, board de
> Cobrança) está em **[16 - FLUXO E REGRAS DO BOARD DE SERVIÇOS.md](16%20-%20FLUXO%20E%20REGRAS%20DO%20BOARD%20DE%20SERVIÇOS.md)** — esta seção resume e referencia.
> As regras valem **apenas para os boards com regra** (`SERVICE_RULE_BOARD_IDS = {1, 2}`).
> Boards de serviço duplicados são kanban livre, sem travas nem dashboard.

### RN-140: Acesso ao Módulo de Serviço

Ver **RN-003.1**. Apenas admin, gerente e role "serviço" acessam board/dashboard/atividades de serviço; vendedor, SDR e visualizador são bloqueados (403 via `require_service_access`).

---

### RN-141: Regras de Avanço de Etapa — Board 1 (funil oficial "Serviços")

**Descrição**: O board oficial (`SERVICE_FUNNEL_BOARD_IDS = {1}`) tem 7 etapas e trava de avanço (hard gate) validada no backend em `_validate_advance` (`backend/app/services/service_board_service.py`), aplicada em `move_card`.

**Etapas**: Liberados do Laboratório → Dados Preenchidos → Tentativa de Contato → Proposta → Aguardando Pedido → Negócio Ganho / Negócio Perdido.

**Travas por transição** (resumo — detalhe na doc 16, seção 6):

| Transição | O que exige para avançar |
|---|---|
| Liberados do Laboratório → Dados Preenchidos | **OS (Ordem de Serviço) anexada** |
| Dados Preenchidos → Tentativa de Contato | **≥1 produto** + **Cliente (Organização)** + **Pessoa (Contato)** vinculados + **Recalibração/Manutenção** (`service_type`) preenchido |
| Tentativa de Contato → Proposta | **≥1 atividade concluída nesta etapa** (qualquer tipo) |
| Proposta → Aguardando Pedido | **Forma de fechamento = "Pedido"** + **Proposta anexada** |
| Proposta → Negócio Ganho *(direto)* | **Forma de fechamento = "Faturamento direto"** + **Proposta anexada** |
| Aguardando Pedido → Negócio Ganho | só pelo botão Ganho + **OC (Ordem de Compra) anexada** |
| Qualquer etapa → Negócio Perdido | só pelo botão Perdido + **Motivo da perda** (modal) |

**Campo "Forma de fechamento"** (`closing_type`, no Resumo): define o caminho na etapa Proposta — *Faturamento direto* libera o Ganho na própria Proposta; *Pedido* obriga avançar para Aguardando Pedido (que depois exige a OC).

**Regras gerais**:
- Não pode pular etapas (uma de cada vez); voltar etapa é livre, sem trava.
- Novos cards entram só pela 1ª etapa (Liberados do Laboratório).
- Ganho/Perdido só pelos botões (o stepper não move para etapas terminais).

---

### RN-142: Regras de Avanço de Etapa — Board 2 (Cobrança "Serviços - Atrasados")

**Descrição**: Board independente (id 2, "Serviços - Atrasados", chamado de **Cobrança**), também com regra em `_validate_advance` (board-específica). Mesmo acesso do módulo de Serviço (admin, gerente, service).

**Etapas (6)**: Oportunidade Existente → Tentativa de Contato → Proposta → Operações → Negócio Ganho / Negócio Perdido.

**Travas por transição** (resumo — detalhe na doc 16, seção 8.2):

| Transição | O que exige para avançar |
|---|---|
| Oportunidade Existente → Tentativa de Contato | **≥1 produto** + **Cliente** + **Pessoa** vinculados |
| Tentativa de Contato → Proposta | **≥1 atividade concluída nesta etapa** + **Recalibração/Manutenção** (`service_type`) preenchido |
| Proposta → Operações | **Proposta anexada** + **Formulário enviado** (checkbox `form_answered`) |
| Operações → Negócio Ganho | botão Ganho em Operações · sem regra por enquanto (a definir) |
| → Negócio Perdido | só pelo botão Perdido + **Motivo da perda** |

---

### RN-143: Comportamento de Ganho / Perdido (Vendas e Serviço)

**Descrição**: Ao mover um card para Ganho ou Perdido, o sistema conclui automaticamente as atividades pendentes do card.

**Regras**:
- A conclusão automática vale para os boards com regra (funil oficial + Cobrança).
- **Exceção**: atividades de tipo **follow_up NÃO são concluídas automaticamente** — costumam ser agendadas para o futuro (ex.: marca-se Perdido para não acumular e o card reabre no dia), então permanecem pendentes.
- Implementado em `_complete_pending_activities` (`service_board_service.py`); o mesmo comportamento "exceto follow_up" vale para Vendas/SDR.

---

### RN-144: Etiqueta "Parado" (sem movimentação)

**Descrição**: Cards sem movimentação (atividade, nota ou mudança de etapa) por vários dias recebem uma etiqueta visual de estagnação.

**Regras**:
- **Parado 3d+**: card com atividade pendente vencida / sem atividade recente há **3 ou mais dias** (`is_stuck_3d`).
- **Parado 7d+**: há **7 ou mais dias** (`is_stuck_7d`) — exibido em vermelho mais escuro.
- Calculado a partir de `updated_at` e da última atividade do card, em `card_service.py` (Vendas) e `service_board_service.py` (Serviço).

---

### RN-145: Quantidade de Produto no Card de Serviço (automática)

**Descrição**: No card de Serviço, a quantidade de cada produto é automática, não editável.

**Regras**:
- O campo **Quantidade** do produto é **somente leitura** e igual ao **nº de aparelhos** adicionados (`quantity = aparelhos.length`), sincronizado ao "Salvar aparelhos".
- O usuário não edita a quantidade manualmente.
- Cada aparelho exige Nº de Série + Data de próxima recalibragem; o Modelo já vem pré-preenchido com o produto escolhido; Módulo de álcool é opcional.

---

**Versão**: v1.7.35 — Junho/2026
**Data**: 29 de Junho 2026
**Status**: Completo

