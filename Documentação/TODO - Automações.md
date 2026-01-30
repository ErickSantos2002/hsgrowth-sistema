# TODO - Sistema de Automações

## Status Atual

✅ **Concluído:**
- Modelo de dados (Automation, AutomationExecution)
- Campo `state` para persistir estado das automações (ex: último vendedor no round-robin)
- Schemas Pydantic completos (criação, atualização, resposta)
- Endpoint básico de CRUD de automações
- Action `assign_round_robin` implementada (distribui cards entre vendedores ativos)
- Página de listagem de automações conectada à API real
- Formulário básico para criar automação de rodízio de vendedores
- Método `getLists()` no boardService para buscar listas de um board

---

## 1. BACKEND - Sistema de Execução de Automações

### 1.1 Trigger System (Automações Trigger)
**Objetivo:** Fazer as automações dispararem automaticamente quando eventos ocorrem

- [ ] **Event Emitter/Publisher**
  - [ ] Criar sistema de eventos centralizado (pode usar padrão Observer ou biblioteca como `broadcaster`)
  - [ ] Definir pontos de emissão de eventos em:
    - `card_service.py`: emitir `card_created`, `card_updated`, `card_moved`, `card_assigned`
    - `card_service.py` (mark won/lost): emitir `card_won`, `card_lost`
  - [ ] Sistema deve passar contexto do evento (card_id, user_id, old_values, new_values, etc.)

- [ ] **Automation Trigger Listener**
  - [ ] Criar listener que escuta eventos do sistema
  - [ ] Ao receber evento, buscar automações ativas que correspondem:
    - `trigger_event` matches evento
    - `board_id` matches board do card
    - `trigger_conditions` são satisfeitas
  - [ ] Para cada automação encontrada, criar `AutomationExecution` e executar ações

- [ ] **Condition Evaluator**
  - [ ] Implementar avaliador de condições (`trigger_conditions`)
  - [ ] Suportar operadores: `equals`, `not_equals`, `contains`, `greater_than`, `less_than`
  - [ ] Condições especiais:
    - `field_changed`: verificar se campo específico mudou
    - `card_moved`: verificar `from_list_id` e `to_list_id`
    - `card_assigned`: verificar `assigned_to_id`

### 1.2 Scheduled System (Automações Agendadas)
**Objetivo:** Executar automações em horários específicos ou recorrentes

- [ ] **Scheduler Service**
  - [ ] Integrar biblioteca de agendamento (sugestão: APScheduler ou Celery Beat)
  - [ ] Ao criar/atualizar automação scheduled:
    - Se `schedule_type == "once"`: agendar para `scheduled_at`
    - Se `schedule_type == "recurrent"`: configurar recorrência baseada em `recurrence_pattern`
  - [ ] Atualizar campo `next_run_at` após cada execução

- [ ] **Recurrence Patterns**
  - [ ] Implementar lógica para cada padrão:
    - `daily`: executar todo dia no mesmo horário
    - `weekly`: executar em dia da semana específico
    - `monthly`: executar em dia do mês específico
    - `annual`: executar em data específica anualmente
  - [ ] Permitir configuração de horário de execução

### 1.3 Action Executors
**Objetivo:** Implementar todas as ações que automações podem executar

✅ `assign_round_robin` - Já implementado

- [ ] **move_card**
  - [ ] Mover card para `target_list_id` (do params)
  - [ ] Emitir evento `card_moved` após mover

- [ ] **assign_card**
  - [ ] Atribuir card para `user_id` (do params)
  - [ ] Validar que usuário existe e está ativo
  - [ ] Emitir evento `card_assigned` após atribuir

- [ ] **update_field**
  - [ ] Atualizar campo custom do card (`field_id` e `value` do params)
  - [ ] Emitir evento `field_changed` após atualizar

- [ ] **send_notification**
  - [ ] Enviar notificação para `user_id` com `message` (do params)
  - [ ] Integrar com sistema de notificações (criar se não existir)

- [ ] **award_points**
  - [ ] Dar pontos para `user_id` (params: `points`, `action_type`)
  - [ ] Integrar com sistema de gamificação (criar se não existir)

- [ ] **mark_won**
  - [ ] Marcar card como ganho
  - [ ] Emitir evento `card_won`

- [ ] **mark_lost**
  - [ ] Marcar card como perdido
  - [ ] Emitir evento `card_lost`

### 1.4 Execution Engine
**Objetivo:** Gerenciar execução das automações com controle de erros

- [ ] **Execution Manager**
  - [ ] Criar método `execute_automation(automation_id, card_id, triggered_by_id, execution_data)`
  - [ ] Criar registro em `automation_executions` com status `pending`
  - [ ] Executar ações sequencialmente
  - [ ] Registrar tempo de execução (`duration_ms`)
  - [ ] Capturar erros e salvar em `error_message` e `error_stack`
  - [ ] Atualizar `execution_count`, `last_run_at` da automação

- [ ] **Error Handling & Auto-disable**
  - [ ] Incrementar `failure_count` quando execução falha
  - [ ] Se `failure_count >= auto_disable_on_failures`: desativar automação (`is_active = False`)
  - [ ] Resetar `failure_count` quando execução tem sucesso

- [ ] **Retry Logic** (opcional, mas recomendado)
  - [ ] Implementar retry com backoff exponencial para falhas temporárias
  - [ ] Configurar número máximo de retries

### 1.5 Endpoints Adicionais

- [ ] **POST /api/v1/automations/{id}/trigger**
  - [ ] Endpoint para disparar automação manualmente
  - [ ] Útil para testes e execuções sob demanda
  - [ ] Aceitar `card_id` e `execution_data` opcionais

- [ ] **GET /api/v1/automations/{id}/executions**
  - [ ] Listar execuções de uma automação específica
  - [ ] Suportar filtros: status, data, card_id
  - [ ] Paginação

- [ ] **GET /api/v1/executions**
  - [ ] Listar todas execuções (global)
  - [ ] Filtros: automation_id, status, board_id, user_id, período

---

## 2. FRONTEND - Página de Automações (Detalhes e Gerenciamento)

### 2.1 Detalhes da Automação
**Objetivo:** Mostrar informações completas de uma automação

- [ ] **Modal/Página de Detalhes**
  - [ ] Criar componente `AutomationDetails.tsx`
  - [ ] Mostrar todas informações:
    - Nome, descrição, tipo (trigger/scheduled)
    - Status (ativa/inativa)
    - Board, prioridade
    - Configurações de trigger (evento, condições)
    - Configurações de agendamento (tipo, próxima execução, padrão)
    - Lista de ações
    - Estatísticas: total execuções, última execução, taxa de falhas
  - [ ] Botões: Editar, Ativar/Desativar, Deletar, Disparar Manualmente

### 2.2 Histórico de Execuções
**Objetivo:** Visualizar execuções passadas de cada automação

- [ ] **Aba/Seção de Histórico**
  - [ ] Integrar no modal de detalhes
  - [ ] Listar execuções recentes (últimas 50-100)
  - [ ] Mostrar para cada execução:
    - Data/hora
    - Card relacionado (com link)
    - Status (sucesso/falha)
    - Duração
    - Mensagem de erro (se houver)
  - [ ] Filtros: status, período
  - [ ] Paginação

- [ ] **Modal de Detalhes da Execução**
  - [ ] Ao clicar em execução, mostrar detalhes completos:
    - Dados de execução (`execution_data`)
    - Stack trace completo (se erro)
    - Ações executadas
    - Tempo de cada ação

### 2.3 Edição de Automações

- [ ] **Formulário de Edição - Round Robin**
  - [ ] Usar `AutomationRoundRobinForm.tsx` existente
  - [ ] Preencher campos com dados da automação
  - [ ] Permitir alterar: nome, descrição, board, lista de destino, status

- [ ] **Formulários para Outros Tipos** (futuro)
  - [ ] `AutomationTriggerForm.tsx` - formulário genérico para triggers
  - [ ] `AutomationScheduledForm.tsx` - formulário para agendadas
  - [ ] Builder visual de ações (arrastar e soltar)

### 2.4 Dashboard de Automações

- [ ] **Visão Geral**
  - [ ] Card com estatísticas gerais:
    - Total de automações (ativas/inativas)
    - Execuções hoje/semana/mês
    - Taxa de sucesso global
    - Automações com falhas recorrentes
  - [ ] Gráfico de execuções ao longo do tempo
  - [ ] Lista de automações mais utilizadas

---

## 3. FRONTEND - Formulários e UX

### 3.1 Criação de Automações (Níveis de Complexidade)

✅ **Nível 1 - Rodízio Simples** (implementado)
- Formulário específico para round-robin

- [ ] **Nível 2 - Templates Pré-configurados**
  - [ ] Criar tela de seleção de template:
    - "Rodízio de Vendedores" (já existe)
    - "Notificar ao Mover Card"
    - "Auto-atribuir por Região"
    - "Marcar Perdido se Parado X dias"
  - [ ] Cada template abre formulário específico

- [ ] **Nível 3 - Builder Visual**
  - [ ] Interface de criação de automação do zero:
    - Seleção de trigger ou scheduled
    - Configuração de condições (AND/OR)
    - Builder de ações (arrastar e soltar)
    - Preview da automação
  - [ ] Validação em tempo real

### 3.2 Melhorias de UX

- [ ] **Toast/Notificações**
  - [ ] Feedback visual ao criar/editar/deletar
  - [ ] Notificar quando automação falha muito

- [ ] **Confirmações**
  - [ ] Modal de confirmação ao deletar automação
  - [ ] Aviso ao desativar automação com muitas execuções

- [ ] **Ajuda e Documentação**
  - [ ] Tooltips explicando cada campo
  - [ ] Link para documentação detalhada
  - [ ] Exemplos de uso para cada tipo de automação

---

## 4. TESTES E VALIDAÇÃO

### 4.1 Testes Backend

- [ ] **Testes Unitários**
  - [ ] `test_automation_service.py`: testar cada action executor
  - [ ] `test_condition_evaluator.py`: testar avaliação de condições
  - [ ] `test_round_robin.py`: testar distribuição round-robin

- [ ] **Testes de Integração**
  - [ ] Criar automação, emitir evento, verificar execução
  - [ ] Testar auto-disable por falhas
  - [ ] Testar agendamentos

### 4.2 Testes Frontend

- [ ] **Testes de Componentes**
  - [ ] `AutomationRoundRobinForm.test.tsx`
  - [ ] `AutomationDetails.test.tsx`

- [ ] **Testes E2E**
  - [ ] Criar automação pelo frontend e verificar no backend
  - [ ] Editar e deletar automação

### 4.3 Testes Manuais

- [ ] **Cenários de Teste**
  - [ ] Criar automação de round-robin e mover card para lista
  - [ ] Verificar distribuição equilibrada entre vendedores
  - [ ] Testar com 1, 2, 5, 10 vendedores
  - [ ] Desativar vendedor e verificar que é pulado
  - [ ] Criar automação scheduled e verificar execução

---

## 5. MELHORIAS FUTURAS (Pós-MVP)

### 5.1 Funcionalidades Avançadas

- [ ] **Automações em Cadeia**
  - [ ] Permitir que uma automação dispare outra
  - [ ] Evitar loops infinitos

- [ ] **Condições Compostas**
  - [ ] Suportar AND/OR em conditions
  - [ ] Expressões complexas

- [ ] **Variáveis e Templates**
  - [ ] Usar variáveis nas ações: `{card.title}`, `{user.name}`
  - [ ] Templates de mensagens

- [ ] **Webhooks**
  - [ ] Action para chamar webhook externo
  - [ ] Passar dados do card no payload

### 5.2 Analytics e Insights

- [ ] **Relatórios de Automação**
  - [ ] Tempo economizado por automações
  - [ ] Cards processados automaticamente
  - [ ] ROI de cada automação

- [ ] **Recomendações de Automação**
  - [ ] IA sugere automações baseado em padrões de uso
  - [ ] "Notamos que você sempre atribui cards da lista X para usuário Y"

### 5.3 Performance e Escala

- [ ] **Queue System**
  - [ ] Usar fila (Redis/RabbitMQ) para execuções assíncronas
  - [ ] Workers dedicados para processar automações

- [ ] **Caching**
  - [ ] Cache de automações ativas por board
  - [ ] Invalidar cache ao criar/atualizar automação

- [ ] **Monitoring**
  - [ ] Logs estruturados de execuções
  - [ ] Alertas para automações com alta taxa de falha
  - [ ] Dashboard de saúde do sistema

---

## 6. PRIORIZAÇÃO SUGERIDA

### Sprint 1 - MVP Funcional (1-2 semanas)
1. ✅ Modelo de dados e schemas
2. ✅ Action `assign_round_robin`
3. ✅ Formulário básico round-robin
4. [ ] Trigger system básico (emitir `card_moved` e executar automação)
5. [ ] Implementar actions: `move_card`, `assign_card`
6. [ ] Testes básicos de round-robin

### Sprint 2 - Execução Robusta (1 semana)
1. [ ] Execution engine completo com error handling
2. [ ] Auto-disable por falhas
3. [ ] Endpoint de execuções
4. [ ] Histórico de execuções no frontend

### Sprint 3 - Scheduled + Mais Actions (1 semana)
1. [ ] Scheduler service (APScheduler)
2. [ ] Implementar actions restantes
3. [ ] Formulário para scheduled automations
4. [ ] Templates pré-configurados

### Sprint 4 - UX e Analytics (1 semana)
1. [ ] Dashboard de automações
2. [ ] Detalhes completos de automação
3. [ ] Melhorias de UX (tooltips, ajuda, validações)
4. [ ] Testes E2E

---

## Notas Técnicas

### Dependências Necessárias
- **Backend:**
  - `apscheduler` - para scheduled automations
  - `celery` (opcional) - para execução assíncrona em produção

- **Frontend:**
  - Nenhuma nova dependência necessária (tudo pode ser feito com stack atual)

### Considerações de Segurança
- [ ] Validar permissões: usuário pode criar automação apenas em boards que tem acesso
- [ ] Limitar número de automações por board (evitar abuso)
- [ ] Rate limiting em endpoint de trigger manual
- [ ] Sanitizar inputs em conditions e actions

### Configurações Recomendadas
```python
# settings.py
AUTOMATIONS_MAX_PER_BOARD = 50
AUTOMATIONS_MAX_ACTIONS_PER_AUTOMATION = 10
AUTOMATIONS_EXECUTION_TIMEOUT_SECONDS = 30
AUTOMATIONS_MAX_RETRIES = 3
```

---

## Recursos e Referências

- Documentação FastAPI: https://fastapi.tiangolo.com/
- APScheduler: https://apscheduler.readthedocs.io/
- Padrão Observer: https://refactoring.guru/design-patterns/observer
- Event-Driven Architecture: https://martinfowler.com/articles/201701-event-driven.html

---

**Última atualização:** 2026-01-30
**Status:** Em desenvolvimento - MVP Nível 1 concluído
