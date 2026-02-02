# Sistema de Automações - Documentação Técnica

**Data:** 02/02/2026
**Versão:** 1.0.0
**Status:** ✅ Funcional em Produção

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades Implementadas](#funcionalidades-implementadas)
3. [Arquitetura](#arquitetura)
4. [Como Usar](#como-usar)
5. [Estrutura de Dados](#estrutura-de-dados)
6. [Arquivos Modificados](#arquivos-modificados)
7. [Próximos Passos](#próximos-passos)

---

## 🎯 Visão Geral

O sistema de automações permite criar fluxos automatizados que são disparados por eventos no CRM (criação de cards, movimentação, etc.) e executam ações automaticamente (atribuir vendedores, enviar notificações, etc.).

### Estado Atual

- ✅ **Frontend:** Construtor visual completo e funcional
- ✅ **Backend:** API completa com integração aos eventos de cards
- ✅ **Deploy:** Funcionando em produção no Easypanel
- ✅ **Rodízio:** Sistema de round-robin operacional

---

## ✅ Funcionalidades Implementadas

### Frontend

#### 1. Construtor Visual de Automações
- **Localização:** `/automations/:id/edit`
- **Componente Principal:** `AutomationEditor.tsx`
- Interface drag-and-drop para criar automações visualmente
- Suporte a múltiplos nodes (triggers e actions)
- Conexões visuais entre nodes
- Preview em tempo real da automação

#### 2. Conversão de Dados
- **Arquivo:** `utils/automationConverter.ts`
- Converte dados da API para formato React Flow (visualização)
- Converte nodes do canvas para formato da API (salvamento)
- Validação de estrutura antes de salvar

#### 3. Configuração de Nodes
- **Componente:** `NodeConfigPanel.tsx`
- Painel lateral para configurar cada node
- Carrega dados reais do backend (boards, listas, usuários)
- Validação de campos obrigatórios
- Preview de configuração

#### 4. Sidebar de Nodes
- **Componente:** `NodesSidebar.tsx`
- Lista de triggers e actions disponíveis
- Drag-and-drop para adicionar ao canvas
- Organizados por categoria

### Backend

#### 1. API de Automações
- **Endpoints:**
  - `GET /api/v1/automations` - Listar automações
  - `GET /api/v1/automations/:id` - Buscar por ID
  - `POST /api/v1/automations` - Criar automação
  - `PUT /api/v1/automations/:id` - Atualizar automação
  - `DELETE /api/v1/automations/:id` - Deletar automação
  - `POST /api/v1/automations/:id/trigger` - Disparar manualmente

#### 2. Integração com Card Service
- **Arquivo:** `app/services/card_service.py`
- Disparo automático ao criar card (`card_created`)
- Disparo automático ao mover card (`card_moved`)
- Disparo automático quando card é ganho (`card_won`)
- Disparo automático quando card é perdido (`card_lost`)

#### 3. Execução de Automações
- **Arquivo:** `app/services/automation_service.py`
- Método `process_trigger()` - Processa eventos e dispara automações
- Método `execute_automation()` - Executa uma automação específica
- Verificação de condições antes de executar
- Registro de execuções no banco

#### 4. Sistema de Rodízio (Round-Robin)
- Distribui cards automaticamente entre vendedores
- Mantém estado do último vendedor usado
- Suporte a lista customizada de vendedores
- Rodízio circular (volta ao primeiro após o último)

---

## 🏗️ Arquitetura

### Fluxo de Execução

```
1. Evento ocorre (ex: card criado)
   ↓
2. CardService dispara automações
   ↓
3. AutomationService busca automações ativas
   ↓
4. Verifica condições (trigger_conditions)
   ↓
5. Executa ações em sequência
   ↓
6. Registra execução no banco
   ↓
7. Atualiza estado da automação (se necessário)
```

### Triggers Disponíveis

| Trigger | Descrição | Quando Dispara |
|---------|-----------|----------------|
| `card_created` | Card criado | Ao criar um novo card |
| `card_moved` | Card movido | Ao mover card entre listas |
| `card_won` | Card ganho | Ao mover para lista "ganho" |
| `card_lost` | Card perdido | Ao mover para lista "perdido" |
| `scheduled` | Agendado | Em horário específico (cron) |

### Actions Disponíveis

| Action | Descrição | Configuração |
|--------|-----------|--------------|
| `assign_round_robin` | Rodízio de vendedores | `user_ids` (opcional) |
| `assign_card` | Atribuir vendedor fixo | `user_id` (obrigatório) |
| `move_card` | Mover card | `target_board_id`, `target_list_id` |
| `mark_won` | Marcar como ganho | Sem configuração |
| `mark_lost` | Marcar como perdido | Sem configuração |
| `send_notification` | Enviar notificação | `user_id`, `message` |

---

## 📖 Como Usar

### Criar uma Automação pelo Frontend

1. Acesse **Automações** no menu lateral
2. Clique em **"Construtor de automação"** (botão roxo)
3. Arraste um **Trigger** da sidebar para o canvas
4. Arraste **Actions** da sidebar para o canvas
5. **Conecte** o trigger às actions (arrastar entre os pontos)
6. Clique em cada node para **configurar**
7. Clique em **Salvar**

### Exemplo: Rodízio Automático de Vendedores

**Objetivo:** Distribuir automaticamente novos cards entre vendedores

1. **Trigger:** Card Criado
2. **Action:** Rodízio de Vendedores
   - Selecione os vendedores que participarão do rodízio
   - Ou deixe vazio para usar todos os vendedores ativos
3. Salve a automação

Pronto! A partir de agora, todo card criado será automaticamente atribuído ao próximo vendedor do rodízio.

### Exemplo: Notificar ao Ganhar Card

**Objetivo:** Enviar notificação quando um card é ganho

1. **Trigger:** Card Ganho
2. **Action 1:** Enviar Notificação
   - Destinatário: vendedor responsável
   - Mensagem: "Parabéns! Você ganhou o card {card_title}"
3. Salve a automação

---

## 💾 Estrutura de Dados

### Tabela: `automations`

```sql
CREATE TABLE automations (
    id SERIAL PRIMARY KEY,
    board_id INTEGER REFERENCES boards(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    automation_type VARCHAR(50) NOT NULL, -- 'trigger' ou 'scheduled'
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 50,

    -- Campos de trigger
    trigger_event VARCHAR(100), -- 'card_created', 'card_moved', etc.
    trigger_conditions JSONB, -- Condições específicas do trigger

    -- Campos de scheduled
    schedule_type VARCHAR(50),
    scheduled_at TIMESTAMP,
    recurrence_pattern VARCHAR(50),
    next_run_at TIMESTAMP,

    -- Actions e estado
    actions JSONB NOT NULL, -- Array de ações
    state JSONB DEFAULT '{}', -- Estado persistente (ex: último vendedor do rodízio)

    -- Métricas
    execution_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMP,
    failure_count INTEGER DEFAULT 0,
    auto_disable_on_failures INTEGER DEFAULT 5,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Exemplo de Dados

```json
{
  "id": 2,
  "board_id": 2,
  "name": "Rodízio RD - Atribuir vendedor",
  "automation_type": "trigger",
  "is_active": true,
  "trigger_event": "card_created",
  "trigger_conditions": null,
  "actions": [
    {
      "type": "assign_round_robin",
      "params": {
        "user_ids": ["3", "4", "2", "6", "5"]
      }
    }
  ],
  "state": {
    "round_robin_last_user_id": 3
  }
}
```

---

## 📁 Arquivos Modificados

### Backend

| Arquivo | Modificações |
|---------|--------------|
| `app/services/automation_service.py` | ✅ Correção do state com `flag_modified()` |
| `app/services/card_service.py` | ✅ Integração com `process_trigger()` |
| `app/schemas/automation.py` | ✅ Campos adicionados ao `AutomationUpdate` |
| `requirements.txt` | ✅ Versão do `psycopg2-binary` |
| `requirements-prod.txt` | ✅ Novo arquivo para produção |
| `Dockerfile.prod` | ✅ Dockerfile otimizado para Easypanel |

### Frontend

| Arquivo | Modificações |
|---------|--------------|
| `utils/automationConverter.ts` | ✅ Conversão API ↔ React Flow com BFS |
| `pages/AutomationEditor.tsx` | ✅ Construtor visual completo |
| `components/automations/NodeConfigPanel.tsx` | ✅ Carregamento de dados reais |
| `components/automations/NodesSidebar.tsx` | ✅ Actions do backend |
| `services/automationService.ts` | ✅ Endpoints corretos |
| `pages/Automations.tsx` | ✅ Botão construtor + modal de edição |

---

## 🔧 Detalhes Técnicos

### Correção do Round-Robin

**Problema Identificado:**
O campo `state` (JSONB) não estava sendo atualizado corretamente no PostgreSQL porque o SQLAlchemy não detectava mudanças em campos JSONB automaticamente.

**Solução Implementada:**
```python
from sqlalchemy.orm.attributes import flag_modified

# Atualiza o estado
automation.state["round_robin_last_user_id"] = next_user.id

# Marca o campo como modificado
flag_modified(automation, "state")
self.db.commit()
```

### Conversão de Nodes para API

**Algoritmo BFS (Busca em Largura):**
- Percorre o grafo de nodes a partir do trigger
- Adiciona actions na ordem em que aparecem no fluxo
- Garante que todas as actions conectadas sejam incluídas

```typescript
// Busca em largura (BFS) a partir do trigger
while (queue.length > 0) {
  const currentNodeId = queue.shift()!;
  const outgoingEdges = edges.filter((e) => e.source === currentNodeId);

  outgoingEdges.forEach((edge) => {
    if (!visited.has(edge.target)) {
      visited.add(edge.target);
      queue.push(edge.target);
      // Adiciona action ao array
    }
  });
}
```

---

## 🚀 Próximos Passos (Futuro)

### Funcionalidades Planejadas

- [ ] Mais tipos de triggers:
  - `card_assigned` - Quando card é atribuído
  - `card_updated` - Quando card é editado
  - `card_overdue` - Quando deadline passa
  - `card_commented` - Quando comentário é adicionado

- [ ] Mais tipos de actions:
  - `create_task` - Criar tarefa automaticamente
  - `send_email` - Enviar email customizado
  - `webhook` - Chamar URL externa
  - `update_field` - Atualizar campo customizado

- [ ] Templates de automações:
  - Biblioteca de automações prontas
  - Importar/exportar automações
  - Duplicar automações existentes

- [ ] Analytics e monitoramento:
  - Dashboard de execuções
  - Métricas de performance
  - Alertas de falhas
  - Logs detalhados

- [ ] Melhorias UX:
  - Validação em tempo real no construtor
  - Preview de execução (simulação)
  - Sugestões inteligentes de automações
  - Histórico de versões

### Testes Pendentes

- [ ] Testes unitários do backend
- [ ] Testes de integração
- [ ] Testes E2E do construtor visual
- [ ] Testes de performance (muitas automações)
- [ ] Testes de concorrência (rodízio)

---

## 📞 Suporte

Para dúvidas ou problemas com automações:
- Verificar logs do backend: `docker-compose logs api`
- Consultar execuções no banco: tabela `automation_executions`
- Estado do rodízio: campo `state` na tabela `automations`

---

**Última atualização:** 02/02/2026
**Responsável:** Erick - Cientista de Dados e Desenvolvedor Full Stack
