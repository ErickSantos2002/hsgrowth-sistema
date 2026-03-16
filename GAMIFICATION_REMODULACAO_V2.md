# Gamificação — Plano de Remodelação Completa

> **Objetivo deste documento:** Especificação técnica e de negócio completa para a remodelação do sistema de gamificação do HSGrowth CRM.
>
> **Data:** 17/03/2026 | **Versão:** 2.1 (decisões finalizadas)

---

## 1. Visão Geral da Remodelação

O sistema atual de gamificação será substituído por uma nova arquitetura baseada em pontuação por board, rankings independentes e um sistema de comissão de pontos entre papéis.

### 1.1 Princípios da Nova Arquitetura

- **Pontuação por Board:** os pontos são atribuídos com base no board onde a ação acontece, não no role do usuário. Um Vendedor trabalhando no board Prospecção ganha pontos pelas regras de prospecção.
- **Produtividade Real:** apenas ações que geram valor para a empresa geram pontos. Sem pontos por login, preenchimento de perfil ou ações operacionais.
- **Rankings Independentes:** dois rankings separados (Prospecção e Aquisição) funcionam como competições distintas.
- **Comissão de Pontos:** o SDR que prospectou recebe uma fração dos pontos quando o Vendedor conclui reuniões ou fecha negócios originados na prospecção.
- **Configurável pelo Admin:** todos os valores de pontuação são configuráveis via UI, por ação e por board.
- **Logs Detalhados:** todo evento de pontuação, incluindo splits de comissão, é registrado em log para auditoria.

### 1.2 Escopo

- **Boards cobertos:** Prospecção (`prospecting`) e Aquisição (`acquisition`)
- **Board Expansão:** fora do escopo desta versão — não pontua, ranking será construído no futuro
- **Quem participa dos rankings:** apenas roles `salesperson` e `sdr`
- **Admin e Manager:** ficam fora dos rankings completamente

### 1.3 O Que Muda

- Pontos históricos serão **limpos** — o sistema começa do zero (pontos atuais não eram mensurados corretamente)
- Rankings antigos serão removidos
- Badges existentes serão removidos e recriados para o novo sistema
- O campo `board_type` será adicionado ao model `Board` para identificação
- A tabela `gamification_action_points` ganha campo `board_type`
- A tabela `gamification_rankings` ganha campo `board_type`
- A tabela `gamification_points` ganha campo `board_type` e campos de comissão
- O dict `ACTION_POINTS` hardcoded será removido — o service passa a ler do banco
- Novo campo `created_by_id` na tabela `card_tasks` para suportar comissão de reuniões

---

## 2. Identificação de Board

### 2.1 Campo `board_type` no Model Board

O model `Board` ganha um novo campo para identificar o tipo de board:

```python
board_type = Column(String(20), nullable=True)
# Valores: 'prospecting', 'acquisition', None (outros boards não pontuam)
```

**Boards mapeados:**
| Board | ID atual | board_type |
|-------|----------|------------|
| Prospecção | 6 | `'prospecting'` |
| Aquisição | 7 | `'acquisition'` |
| Expansão | 8 | `None` (não pontua por ora) |

**Migration:** preencher os valores existentes via migration Alembic.

### 2.2 Detecção nas Ações

Toda vez que uma ação precisa atribuir pontos, o service verifica:

```python
board_type = card.list.board.board_type  # via relacionamento card → list → board
if not board_type:
    return  # board não configurado para pontuar — ignora silenciosamente
```

---

## 3. Sistema de Pontuação por Board

### 3.1 Board Prospecção (`prospecting`)

**Objetivo:** prospectar leads e agendar reuniões. A ação de maior valor é a reunião agendada.

| Ação | action_type | Pontos padrão | Lógica de disparo |
|------|-------------|---------------|-------------------|
| **Reunião agendada** | `meeting_created` | **20 pts** | Task tipo `meeting` criada em card do board Prospecção |
| Mover card entre etapas | `card_moved` | 3 pts | Card movido entre listas (exceto won/lost) |
| Card criado | `card_created` | 3 pts | Novo card criado neste board |
| Ligação realizada | `call_completed` | 2 pts | Task tipo `call` marcada como concluída |
| Follow-up realizado | `followup_completed` | 2 pts | Task tipo `follow_up` marcada como concluída |
| Tarefa genérica concluída | `task_completed` | 1 pt | Task de outro tipo marcada como concluída |

> **Card perdido no board Prospecção:** sem penalidade — vendedores e SDRs descartam muitos leads qualificados, aplicar -pts desmotivaria a prospecção.

### 3.2 Board Aquisição (`acquisition`)

**Objetivo:** conduzir reuniões, apresentar propostas e fechar negócios.

| Ação | action_type | Pontos padrão | Lógica de disparo |
|------|-------------|---------------|-------------------|
| **Card ganho (won)** | `card_won` | **100 pts** | Card movido para lista com `is_done_stage=True` |
| Card perdido (lost) | `card_lost` | **-10 pts** | Card movido para lista com `is_lost_stage=True` |
| Reunião realizada | `meeting_completed` | 15 pts | Task tipo `meeting` marcada como concluída |
| Proposta anexada | `proposal_attached` | 10 pts | 1º anexo com `attachment_type='proposal'` no card |
| Mover card entre etapas | `card_moved` | 5 pts | Card movido entre listas (exceto won/lost) |
| Follow-up realizado | `followup_completed` | 3 pts | Task tipo `follow_up` concluída |
| Tarefa genérica concluída | `task_completed` | 2 pts | Task de outro tipo concluída |

### 3.3 Regras Especiais de Pontuação

**`proposal_attached` — detecção via `attachment_type`:**
O sistema já possui o campo `attachment_type='proposal'` nos anexos, usado pelo `SummarySection` do card (upload dedicado de Proposta Comercial PDF). O ponto é concedido quando o **primeiro** anexo com `attachment_type='proposal'` é adicionado a um card do board Aquisição. Trocas de proposta no mesmo card não pontuam novamente.

Detecção no `attachment_service` ao fazer upload:
```python
if attachment_type == 'proposal':
    existing = db.query(Attachment).filter(
        Attachment.card_id == card_id,
        Attachment.attachment_type == 'proposal',
        Attachment.deleted_at.is_(None)
    ).count()
    if existing == 0:  # é o primeiro → pontua
        gamification_service.award_points(user_id, 'proposal_attached', board_type='acquisition')
```

**`card_lost` — detecção via `is_lost_stage`:**
O `move_card()` já usa `target_list.is_lost_stage` para detectar perda — mesmo padrão do `is_done_stage`. A penalidade de `-10 pts` só se aplica no board Aquisição.

**`meeting_created` vs `meeting_completed`:**
- Board Prospecção: pontua ao **criar** a task de reunião (o SDR agendou)
- Board Aquisição: pontua ao **concluir** a task de reunião (o Vendedor realizou)

---

## 4. Sistema de Comissão de Pontos

O sistema de comissão reconhece a contribuição do SDR quando um negócio que ele prospectou gera resultados no board de Aquisição.

### 4.1 Pré-requisito: Campo `created_by_id` nas Tasks

A tabela `card_tasks` ganha um novo campo:

```python
created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
```

- Preenchido automaticamente com o `current_user.id` ao criar a task
- Tasks existentes ficam com `created_by_id = null` → sem comissão retroativa
- O campo `assigned_to_id` continua funcionando normalmente (responsável pela execução)

### 4.2 Caso 1 — Reunião Concluída no board Aquisição

**Condição:** task tipo `meeting` concluída no board Aquisição, onde `task.created_by_id != task.assigned_to_id` (ou seja, quem criou não é quem concluiu) e `task.created_by_id` pertence a um usuário com role `sdr`.

| Condição | Quem concluiu (Vendedor) | SDR que criou |
|----------|--------------------------|---------------|
| SDR criou a reunião | **10 pts (2/3 de 15)** | **5 pts (1/3 de 15)** |
| Vendedor criou a reunião | **15 pts (total)** | 0 pts |
| `created_by_id` é null | **15 pts (total)** | 0 pts |

Pontos do SDR são creditados no **board Prospecção** (`board_type='prospecting'`).

### 4.3 Caso 2 — Card Ganho no board Aquisição

**Condição:** card marcado como ganho (won). Usa o campo `card.sdr_id` (já existe) para identificar o SDR vinculado.

| Condição | Vendedor (board Aquisição) | SDR (board Prospecção) |
|----------|---------------------------|----------------------|
| Card tem `sdr_id` | **75 pts (3/4 de 100)** | **25 pts (1/4 de 100)** |
| Card sem `sdr_id` | **100 pts (total)** | N/A |

> **Atenção:** para `card_won`, usa-se `card.sdr_id`. Para `meeting_completed`, usa-se `task.created_by_id`. São fontes diferentes para casos diferentes.

### 4.4 Registro de Comissão

Quando há split, são gerados **dois registros** em `gamification_points`:

```
Exemplo — card ganho com comissão:
  Registro 1: user_id=vendedor, board_type='acquisition', points=75, reason='card_won', is_commission=False
  Registro 2: user_id=sdr,      board_type='prospecting', points=25, reason='card_won', is_commission=True,
              commission_source_user_id=vendedor, commission_ratio='1/4', original_points=100
```

---

## 5. Sistema de Rankings

### 5.1 Dois Rankings Independentes

| Ranking | Participantes | Pontos Contabilizados | Períodos |
|---------|--------------|----------------------|----------|
| **Ranking Prospecção** | Usuários com pontos em `prospecting` | Apenas `board_type='prospecting'` | Semanal, Mensal, Trimestral, Anual |
| **Ranking Aquisição** | Usuários com pontos em `acquisition` | Apenas `board_type='acquisition'` | Semanal, Mensal, Trimestral, Anual |

- Apenas roles `salesperson` e `sdr` aparecem nos rankings
- O role é exibido ao lado do nome para contexto
- Um SDR pode aparecer no Ranking Aquisição se tiver recebido comissões de card_won

### 5.2 Cálculo e Atualização

- **Sem recálculo por request** — corrige o bug atual
- **Schedule fixo:** recalcular a cada 1 hora via APScheduler (já existe o scheduler no sistema)
- **Recalcular manual:** admin pode forçar via endpoint ou botão na UI
- A página de rankings exibe o último ranking calculado (cache)

### 5.3 Exibição no Frontend

- Seletor de board: **Ranking Prospecção** / **Ranking Aquisição**
- Seletor de período: semanal, mensal, trimestral, anual
- Top 3 com destaque visual (ouro, prata, bronze)
- Role do usuário visível (SDR / Vendedor) ao lado do nome
- Resumo do usuário logado mostra posição em cada ranking

---

## 6. Sistema de Badges

Badges existentes serão **removidos** e o sistema será reconstruído para a nova gamificação.

### 6.1 Tipos de Critérios Suportados

| Tipo | Exemplo de `criteria` JSON | Funciona |
|------|---------------------------|---------|
| Marco de pontos por board | `{"field": "total_points", "operator": ">=", "value": 500, "board_type": "prospecting"}` | ✅ |
| Marco de pontos global | `{"field": "total_points", "operator": ">=", "value": 1000}` | ✅ |
| Posição no ranking | `{"field": "rank", "operator": "<=", "value": 3, "period": "monthly", "board_type": "acquisition"}` | ✅ novo |
| Contagem de ações | `{"field": "action_count", "action_type": "card_won", "operator": ">=", "value": 10}` | ✅ novo |
| Badge manual | `criteria_type: "manual", criteria: null` | ✅ |

### 6.2 Soft Delete

Badges passam a usar soft delete (campo `deleted_at` DateTime nullable). Isso preserva o histórico de conquistas dos usuários mesmo após um badge ser "deletado" pelo admin.

---

## 7. Configuração pelo Admin

### 7.1 Tabela `gamification_action_points` (atualizada)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Integer PK | — |
| **`board_type`** | **String(20) — NOVO** | `'prospecting'` ou `'acquisition'` |
| `action_type` | String(100) | Tipo da ação (ex: `card_won`, `call_completed`) |
| `points` | Integer | Quantidade de pontos (negativo = penalidade) |
| `is_active` | Boolean | Se a ação está ativa |
| `description` | String(255) | Descrição amigável |

**Constraint unique alterada:** `(board_type, action_type)` — cada ação tem uma configuração por board.

**Bug corrigido:** o service passa a consultar esta tabela ao invés do dict `ACTION_POINTS` hardcoded.

---

## 8. Logs de Pontuação (tabela `gamification_points` atualizada)

| Campo | Tipo | Novo? | Descrição |
|-------|------|-------|-----------|
| `id` | Integer PK | — | — |
| `user_id` | FK → users | — | Quem recebeu os pontos |
| **`board_type`** | String(20) | **NOVO** | `'prospecting'` ou `'acquisition'` |
| `points` | Integer | — | Quantidade (negativo = penalidade) |
| `reason` | String(100) | — | Tipo da ação |
| `description` | Text | — | Descrição legível |
| **`is_commission`** | Boolean | **NOVO** | Se é ponto de comissão (split) |
| **`commission_source_user_id`** | FK → users | **NOVO** | Usuário que gerou a ação original |
| **`commission_ratio`** | String(10) | **NOVO** | Fração recebida (ex: `'1/3'`, `'1/4'`) |
| **`original_points`** | Integer | **NOVO** | Pontos totais antes do split |
| `related_entity_type` | String(50) | — | Tipo da entidade (Card, Task, etc.) |
| `related_entity_id` | Integer | — | ID da entidade |
| `created_at` | DateTime | — | — |

---

## 9. Todas as Alterações no Banco de Dados

### 9.1 Tabelas e campos novos/alterados

| Tabela | Tipo | Detalhes |
|--------|------|----------|
| `boards` | Novo campo | `board_type VARCHAR(20) NULL` |
| `card_tasks` | Novo campo | `created_by_id INT NULL FK→users SET NULL` |
| `gamification_points` | Novos campos | `board_type`, `is_commission`, `commission_source_user_id`, `commission_ratio`, `original_points` |
| `gamification_action_points` | Novo campo + constraint | `board_type` + unique(`board_type`, `action_type`) |
| `gamification_rankings` | Novo campo | `board_type` |
| `gamification_badges` | Novo campo | `deleted_at TIMESTAMP NULL` (soft delete) |

### 9.2 Dados a Limpar (migration)

| Tabela | Ação | Motivo |
|--------|------|--------|
| `gamification_points` | **DELETE ALL** | Pontos históricos medidos incorretamente |
| `gamification_rankings` | **DELETE ALL** | Rankings misturados e desatualizados |
| `gamification_badges` | **DELETE ALL** | Serão recriados para a nova gamificação |
| `user_badges` | **DELETE ALL** | Badges zeradas junto |

---

## 10. Onde Disparar Cada Ação no Código

| Ação | Arquivo | Método | Condição |
|------|---------|--------|----------|
| `card_created` | `card_service.py` | `create_card()` | Após criar o card, verifica `board.board_type` |
| `card_moved` | `card_service.py` | `move_card()` | Lista destino não é done nem lost stage |
| `card_won` | `card_service.py` | `move_card()` | `target_list.is_done_stage == True` |
| `card_lost` | `card_service.py` | `move_card()` | `target_list.is_lost_stage == True` e `board_type == 'acquisition'` |
| `meeting_created` | `card_task_service.py` | `create_task()` | Tipo `meeting`, board_type `prospecting` |
| `meeting_completed` | `card_task_service.py` | `complete_task()` | Tipo `meeting`, board_type `acquisition` |
| `call_completed` | `card_task_service.py` | `complete_task()` | Tipo `call`, board_type `prospecting` |
| `followup_completed` | `card_task_service.py` | `complete_task()` | Tipo `follow_up`, qualquer board que pontue |
| `task_completed` | `card_task_service.py` | `complete_task()` | Tipos genéricos, qualquer board que pontue |
| `proposal_attached` | `attachment_service.py` | `upload_file()` | `attachment_type='proposal'`, board `acquisition`, primeiro do card |

---

## 11. Fluxo Completo de Pontuação (novo)

```
1. Usuário realiza uma ação (mover card, concluir task, anexar proposta, etc.)
2. Service correspondente identifica o board_type do card
3. Se board_type é None → ignora, sem pontos
4. Consulta gamification_action_points WHERE board_type=X AND action_type=Y AND is_active=True
5. Se ação não configurada ou inativa → ignora
6. Verifica se há comissão aplicável:
   - meeting_completed: verifica task.created_by_id (role sdr e diferente de quem concluiu)
   - card_won: verifica card.sdr_id
7. Se há comissão → calcula split e cria DOIS registros em gamification_points
8. Se não há comissão → cria UM registro normal
9. Verifica badges automáticos para o(s) usuário(s) afetado(s)
10. Rankings são atualizados no próximo ciclo do scheduler (não em tempo real)
```

---

## 12. Resumo das Correções de Bugs

| Bug | Problema | Solução |
|-----|----------|---------|
| P1 | Pontos hardcoded ignoram configuração do admin | Remover `ACTION_POINTS` dict, ler do banco |
| P2 | Sem separação por contexto nos pontos | Campo `board_type` em `gamification_action_points` |
| P3 | Rankings misturados SDR/Vendedor | Campo `board_type` em `gamification_rankings` + filtro por role |
| P4 | Maioria das ações nunca dispara pontos | Implementar chamadas em todos os services |
| P5 | Critérios de badges incompletos | Implementar `rank`, `action_count` + `board_type` |
| P6 | Hard delete em badges apaga histórico | Soft delete com campo `deleted_at` |
| P7 | Rankings recalculados a cada request | Schedule fixo (1h) + a página lê do cache |

---

## 13. Estrutura de Arquivos (referência de implementação)

```
backend/
  app/
    models/
      board.py                       ← adicionar board_type
      card_task.py                   ← adicionar created_by_id
      gamification_point.py          ← adicionar board_type + campos de comissão
      gamification_badge.py          ← adicionar deleted_at (soft delete)
      gamification_ranking.py        ← adicionar board_type
      gamification_action_points.py  ← adicionar board_type, alterar constraint unique
    schemas/
      gamification.py                ← REMOVER dict ACTION_POINTS, atualizar todos os schemas
    services/
      gamification_service.py        ← reescrever award_points() com board_type + comissão
      card_service.py                ← adicionar disparos em create_card() e move_card()
      card_task_service.py           ← adicionar disparos em create_task() e complete_task()
      attachment_service.py          ← adicionar disparo em upload (proposal_attached)
    repositories/
      gamification_repository.py     ← queries filtradas por board_type
    api/v1/endpoints/
      gamification.py                ← endpoints com board_type nos filtros
    workers/
      badge_checker.py               ← critérios expandidos com board_type, rank, action_count

  alembic/versions/
    NOVA MIGRATION                   ← todos os campos acima + limpeza de dados

frontend/
  src/
    services/
      gamificationService.ts         ← parâmetro board_type nos requests
    pages/
      Gamification.tsx               ← seletor de board, dois rankings separados
      BadgesAdmin.tsx                ← board_type nos critérios de badges
    components/settings/
      BadgeModal.tsx                 ← campo board_type nos critérios automáticos
```
