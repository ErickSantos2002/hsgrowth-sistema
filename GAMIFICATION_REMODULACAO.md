# Gamificação — Diagnóstico Completo e Contexto para Remodulação

> **Objetivo deste documento:** Fornecer contexto técnico e de negócio completo para o Opus planejar a remodulação do sistema de gamificação do HSGrowth CRM.
>
> **Data:** 17/03/2026 | **Versão atual do sistema:** v1.5.3

---

## 1. Visão Geral do Sistema Atual

O sistema de gamificação existe para engajar e motivar vendedores e SDRs através de pontos, rankings e badges. Ele está **parcialmente implementado** — a estrutura base existe, mas há lacunas críticas de negócio e bugs técnicos que tornam o sistema pouco útil na prática.

**O principal problema de negócio:** o sistema trata todos os usuários da mesma forma. Um SDR e um Vendedor concorrem no mesmo ranking, ganham pontos pelas mesmas ações, com os mesmos valores. Isso é incorreto porque os dois papéis têm objetivos completamente diferentes:

- **Vendedor:** fecha negócios, conduz reuniões, anexa propostas, dá ganho em cards
- **SDR:** prospecta leads, agenda reuniões, qualifica contatos, alimenta o pipeline

---

## 2. Arquitetura Atual — Banco de Dados

### Tabelas existentes

#### `gamification_points`
Registra cada evento de pontuação individualmente. Pontos são **perpétuos** (nunca resetam).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Integer PK | — |
| `user_id` | FK → users | Quem ganhou os pontos |
| `points` | Integer | Quantidade (pode ser negativo = penalidade) |
| `reason` | String(100) | Tipo da ação (ex: `card_won`, `card_moved`) |
| `description` | Text | Descrição livre |
| `related_entity_type` | String(50) | Tipo de entidade relacionada (Card, Badge, etc.) |
| `related_entity_id` | Integer | ID da entidade relacionada |
| `created_at` | DateTime | — |

#### `gamification_badges`
Define as badges disponíveis no sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Integer PK | — |
| `name` | String(255) | Nome do badge |
| `description` | Text | Descrição |
| `icon_url` | String(500) | URL ou emoji do ícone |
| `is_system_badge` | Boolean | Badge padrão do sistema |
| `criteria_type` | String(50) | `manual` ou `automatic` |
| `criteria` | JSON | Critérios para badge automática (ver detalhes abaixo) |
| `is_active` | Boolean | Se está ativo |

**Estrutura do campo `criteria` (JSON):**
```json
// Suportado (funciona):
{"field": "total_points", "operator": ">=", "value": 1000}

// No modelo, mas NÃO implementado na lógica:
{"field": "rank", "operator": "==", "value": 1, "period": "monthly"}
{"field": "cards_won", "operator": ">=", "value": 10}
```

#### `user_badges`
Relação muitos-para-muitos entre usuário e badge.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Integer PK | — |
| `user_id` | FK → users (CASCADE) | — |
| `badge_id` | FK → gamification_badges (CASCADE) | — |
| `awarded_by_id` | FK → users (SET NULL) | Admin que atribuiu (null = automático) |
| `awarded_at` | DateTime | Data da conquista |
| **Constraint:** | unique(user_id, badge_id) | Usuário só pode ter um badge uma vez |

#### `gamification_rankings`
Registra posições em rankings periódicos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Integer PK | — |
| `user_id` | FK → users (CASCADE) | — |
| `period_type` | String(20) | `weekly`, `monthly`, `quarterly`, `annual` |
| `period_start` | DateTime | — |
| `period_end` | DateTime | — |
| `rank` | Integer | Posição (1º, 2º, etc.) |
| `points` | Integer | Pontos acumulados no período |
| `cards_won` | Integer | Cards ganhos no período (campo existe mas não é usado no cálculo) |
| **Constraint:** | unique(user_id, period_type, period_start) | — |

> **Problema:** Não há separação por role nessa tabela. SDRs e Vendedores entram no mesmo ranking.

#### `gamification_action_points`
Configuração de quantos pontos vale cada ação (editável pelo admin via UI).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Integer PK | — |
| `action_type` | String(100) unique | Tipo da ação |
| `points` | Integer | Quantidade de pontos |
| `is_active` | Boolean | Se está ativa |
| `description` | String(255) | Descrição amigável |

> **Problema crítico:** Não há campo `role` nessa tabela. A configuração de pontos é **global** — não tem como definir que `card_won` vale 20 pts para Vendedor e 5 pts para SDR.

---

## 3. Ações Configuradas vs. Ações Efetivamente Disparadas

### Ações configuradas no sistema (padrões inicializados):

| action_type | Pontos padrão | Descrição |
|-------------|---------------|-----------|
| `card_created` | 5 | Card criado |
| `card_won` | 20 | Card ganho |
| `card_moved` | 2 | Card movido |
| `card_lost` | -5 | Card perdido (penalidade) |
| `board_created` | 10 | Board criado |
| `user_invited` | 15 | Usuário convidado |
| `task_completed` | 10 | Tarefa completada |
| `first_login` | 10 | Primeiro login |
| `daily_login` | 3 | Login diário |

### Ações que são efetivamente disparadas no código:

| action_type | Onde é chamado | Condição |
|-------------|----------------|----------|
| `card_moved` | `card_service.py` → `move_card()` | Quando card é movido para lista que NÃO é done_stage |
| `card_won` | `card_service.py` → `move_card()` | Quando card é movido para lista com `is_done_stage == True` |

**As demais ações (`card_created`, `task_completed`, `daily_login`, `first_login`, etc.) estão configuradas mas NUNCA são disparadas no código.** Nenhum trecho do backend chama `gamification_service.award_points()` para essas ações.

---

## 4. Fluxo de Pontuação Atual

```
Usuário move card no Kanban
        ↓
card_service.move_card()
        ↓
target_list.is_done_stage == True?
    ├── SIM → award_points(user_id, "card_won", 20 pts)
    └── NÃO → award_points(user_id, "card_moved", 2 pts)
        ↓
GamificationService.award_points()
    1. Busca pontos em ACTION_POINTS dict (hardcoded no schema)
       ⚠️ NÃO consulta o banco (gamification_action_points) — bug!
    2. Cria registro em gamification_points
    3. Chama _check_and_award_point_badges()
        ↓
_check_and_award_point_badges()
    - Verifica apenas badges com field == "total_points"
    - Operador >= funciona, outros não
    - Notifica usuário se badge conquistado
```

### Bug crítico — `award_points` não lê do banco:

O dicionário `ACTION_POINTS` está **hardcoded** no arquivo `schemas/gamification.py`:

```python
ACTION_POINTS = {
    "card_created": 5,
    "card_won": 20,
    "card_moved": 2,
    ...
}
```

E o service usa esse dicionário:
```python
points = custom_points if custom_points is not None else ACTION_POINTS.get(reason, 0)
```

Isso significa que mesmo que o admin altere os pontos via UI (que escreve na tabela `gamification_action_points`), o valor hardcoded continua sendo usado. **Esse é o bug de "configuração de pontos" mencionado no TODO.**

---

## 5. Endpoints da API

**Prefix:** `/api/v1/gamification`

| Método | Rota | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/me` | Resumo completo do usuário logado | Todos |
| GET | `/users/{user_id}` | Resumo de outro usuário | Todos |
| POST | `/points` | Atribuir pontos manualmente | Admin |
| GET | `/points/me` | Histórico de pontos (paginado) | Todos |
| GET | `/points/users/{user_id}` | Histórico de outro usuário | Admin/Manager |
| GET | `/points` | Histórico de toda equipe | Admin/Manager |
| GET | `/badges` | Listar badges | Todos |
| POST | `/badges` | Criar badge | Admin |
| GET | `/badges/{badge_id}` | Buscar badge | Todos |
| PUT | `/badges/{badge_id}` | Atualizar badge | Admin |
| DELETE | `/badges/{badge_id}` | Deletar badge | Admin |
| POST | `/badges/{badge_id}/award` | Atribuir badge a usuário | Admin |
| GET | `/badges/me` | Meus badges | Todos |
| GET | `/badges/users/{user_id}` | Badges de outro usuário | Todos |
| GET | `/rankings` | Listar rankings do período | Todos |
| POST | `/rankings/calculate` | Forçar recalcular rankings | Admin |
| GET | `/action-points` | Listar configurações | Todos |
| GET | `/action-points/{action_type}` | Buscar configuração | Todos |
| POST | `/action-points` | Criar configuração | Admin |
| PUT | `/action-points/{action_type}` | Atualizar configuração | Admin |
| POST | `/action-points/initialize` | Inicializar padrões | Admin |

---

## 6. Frontend — Páginas e Componentes

### `src/pages/Gamification.tsx` (1017 linhas)
Página principal. Abas:
- **Meu Perfil** — total de pontos, posições no ranking (semana/mês/trim/ano), badges conquistados
- **Rankings** — seletor de período (semanal/mensal/trimestral/anual), tabela com posições
- **Badges** — grid de badges conquistados com data e quem atribuiu
- **Histórico** — tabela paginada de pontos com filtros (período, razão)
- Admin/Manager podem alternar para ver dados de qualquer usuário

### `src/pages/BadgesAdmin.tsx` (451 linhas)
Painel de administração de badges:
- Listar todas as badges com tipo (manual/automático) e critérios
- Criar, editar, deletar badges
- Atribuir badge a qualquer usuário

### `src/components/settings/BadgeModal.tsx`
Modal de criação/edição de badge:
- Campos: nome, descrição, ícone (sugestões com emojis), tipo (manual/automático)
- Para automático: campo/operador/valor dos critérios

### `src/components/settings/AwardBadgeModal.tsx`
Modal para atribuir badge manualmente a um usuário.

### `src/services/gamificationService.ts`
Wrapper TypeScript para todos os endpoints de gamificação.

---

## 7. Problemas e Limitações Identificados

### P1 — Bug crítico: pontos configurados via UI não têm efeito
`award_points()` usa o dict `ACTION_POINTS` hardcoded no schema, ignorando completamente a tabela `gamification_action_points` no banco. O admin pode alterar os valores na UI mas eles não são usados.

### P2 — Nenhuma separação por role no sistema de pontos
A tabela `gamification_action_points` não tem campo `role`. Não é possível definir regras diferentes para Vendedor e SDR. Todo mundo ganha os mesmos pontos pelas mesmas ações.

### P3 — Rankings misturados
A tabela `gamification_rankings` não tem campo `role`. SDRs e Vendedores entram no mesmo ranking, o que é injusto pois têm objetivos diferentes.

### P4 — Maioria das ações nunca é disparada
Das 9 ações configuradas, apenas `card_moved` e `card_won` são chamadas no código. `task_completed`, `card_created`, `daily_login`, `first_login`, `user_invited`, `board_created` e `card_lost` nunca disparam pontos.

### P5 — Critérios de badges automáticas incompletos
Só funciona `field == "total_points"` com operador `>=`. Os campos `rank` e `cards_won` estão no modelo mas a lógica de avaliação não foi implementada.

### P6 — Sem soft delete em badges
`DELETE /badges/{id}` faz hard delete. Como `user_badges` tem cascade, deletar um badge apaga o histórico de conquistas de todos os usuários que o tinham.

### P7 — Rankings recalculados a cada requisição
`get_rankings()` chama `calculate_rankings()` que deleta e recria os registros toda vez que alguém abre a página. É ineficiente e pode causar race conditions com múltiplos usuários abrindo o ranking simultaneamente.

---

## 8. Contexto de Negócio para a Remodulação

### Os dois papéis principais

#### Vendedor (`salesperson`)
Objetivo: **fechar negócios e gerar receita**

Ações que devem gerar mais pontos para o Vendedor:
- Dar ganho em card (card_won) → alta pontuação
- Completar reunião (task do tipo `meeting` concluída)
- Anexar proposta (upload de arquivo ao card)
- Mover card entre etapas do pipeline de vendas
- Completar atividades em geral

#### SDR (`sdr`)
Objetivo: **prospectar e qualificar leads, agendar reuniões**

Ações que devem gerar mais pontos para o SDR:
- Agendar reunião (criar task do tipo `meeting`)
- Prospectar corretamente (criar card com empresa + pessoa + canal vinculados)
- Mover card nas etapas de prospecção
- Completar atividades de prospecção (ligações principalmente)
- Fazer ligações (task do tipo `call` concluída)

### Rankings separados necessários
1. **Ranking de Vendedores** — só aparece quem tem role `salesperson`
2. **Ranking de SDRs** — só aparece quem tem role `sdr`

Ambos com os mesmos períodos: semanal, mensal, trimestral, anual.

---

## 9. Estrutura de Arquivos

```
backend/
  app/
    models/
      gamification_point.py          ← tabela gamification_points
      gamification_badge.py          ← tabela gamification_badges
      gamification_ranking.py        ← tabela gamification_rankings
      gamification_action_points.py  ← tabela gamification_action_points
      user_badge.py                  ← tabela user_badges
    schemas/
      gamification.py                ← schemas Pydantic + dict ACTION_POINTS hardcoded
    services/
      gamification_service.py        ← lógica principal (~786 linhas)
    repositories/
      gamification_repository.py     ← queries SQL
    api/v1/endpoints/
      gamification.py                ← ~1352 linhas com todos os endpoints
    workers/
      badge_checker.py               ← worker periódico para checar badges automáticas

frontend/
  src/
    services/
      gamificationService.ts         ← wrapper TypeScript da API
    pages/
      Gamification.tsx               ← página principal (~1017 linhas)
      BadgesAdmin.tsx                ← admin de badges (~451 linhas)
    components/settings/
      BadgeModal.tsx                 ← modal criar/editar badge
      AwardBadgeModal.tsx            ← modal atribuir badge a usuário
```

---

## 10. O que NÃO deve ser perdido na remodulação

- Histórico de pontos já existente na tabela `gamification_points` (dados reais)
- Badges já criados na tabela `gamification_badges`
- Conquistas já atribuídas na tabela `user_badges`
- A UI já construída deve ser aproveitada e evoluída, não reescrita do zero
- Os endpoints existentes devem ser mantidos com compatibilidade ou versionados

---

## 11. Perguntas em Aberto para o Plano

As respostas abaixo definem o escopo da remodulação:

1. **Pontos separados ou multiplicadores por role?**
   - Opção A: Tabela de pontos por ação com campo `role` (ex: `card_won` vale 20 para Vendedor e 5 para SDR)
   - Opção B: Multiplicador por role (ex: Vendedor tem multiplicador 1.5x em `card_won`)

2. **Rankings: tabela única com filtro por role ou tabelas separadas?**
   - A tabela `gamification_rankings` pode ganhar um campo `role` para separar

3. **Pontos históricos: migrar ou manter como estão?**
   - Pontos já ganhos não têm `role` associado (só `user_id`) — precisaria de migration para retroativamente classificar ou simplesmente ignorar histórico antigo

4. **Quais ações específicas do Vendedor devem gerar pontos?**
   - `card_won` (já funciona)
   - `meeting_completed` — tarefa tipo `meeting` marcada como concluída (não existe ainda)
   - `proposal_attached` — upload de arquivo ao card (não existe ainda)
   - `card_moved` (já funciona)
   - `task_completed` (não disparado ainda)

5. **Quais ações específicas do SDR devem gerar pontos?**
   - `meeting_scheduled` — criar tarefa tipo `meeting` (não existe ainda)
   - `card_created` (não disparado ainda)
   - `card_moved` (já funciona)
   - `call_completed` — tarefa tipo `call` marcada como concluída (não existe ainda)
   - `task_completed` (não disparado ainda)

6. **Admin e Manager participam dos rankings?**
   - Provavelmente não, apenas SDR e Vendedor
