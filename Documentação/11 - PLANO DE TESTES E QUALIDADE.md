# 11 - PLANO DE TESTES E QUALIDADE

## 1. INTRODUÇÃO

Este documento descreve a estratégia de testes para o HSGrowth CRM, incluindo casos de teste para todos os módulos, critérios de aceitação e procedimentos de garantia de qualidade.

---

## 2. ESTRATÉGIA DE TESTES

### 2.1 Níveis de Teste

| Nível | Descrição | Responsável | Ferramentas |
|-------|-----------|-------------|-------------|
| **Unitários** | Testes de funções/métodos isolados | Desenvolvedor | Jest, Vitest |
| **Integração** | Testes de módulos integrados | Desenvolvedor | Jest, Supertest |
| **E2E** | Testes de fluxos completos | QA / Desenvolvedor | Playwright, Cypress |
| **Manuais** | Testes exploratórios | QA / Usuário | Checklist manual |

### 2.2 Cobertura de Código

**Metas de Cobertura**:
- **Mínimo aceitável**: 70%
- **Meta ideal**: 80-85%
- **Crítico (auth, automações, transferências)**: 90%+

**Medição**:
```bash
npm run test:coverage
```

### 2.3 Ambientes de Teste

| Ambiente | Propósito | Dados |
|----------|-----------|-------|
| **Local** | Desenvolvimento | Mock / Seed |
| **Staging** | Testes pré-produção | Cópia sanitizada de produção |
| **Produção** | Smoke tests | Dados reais |

---

## 3. TESTES UNITÁRIOS

### 3.1 Autenticação e Autorização

**Arquivo**: `tests/unit/auth.test.ts`

```typescript
describe('Authentication', () => {
  test('deve fazer hash da senha com bcrypt', async () => {
    const password = 'senha123';
    const hashed = await hashPassword(password);
    expect(hashed).not.toBe(password);
    expect(await comparePassword(password, hashed)).toBe(true);
  });

  test('deve rejeitar senha incorreta', async () => {
    const hashed = await hashPassword('senha123');
    expect(await comparePassword('senha456', hashed)).toBe(false);
  });

  test('deve gerar JWT válido', () => {
    const user = { id: 1, email: 'test@test.com', role: 'seller' };
    const token = generateToken(user);
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(1);
    expect(decoded.email).toBe('test@test.com');
  });

  test('deve rejeitar JWT expirado', () => {
    const expiredToken = generateToken({ id: 1 }, { expiresIn: '0s' });
    expect(() => verifyToken(expiredToken)).toThrow('Token expired');
  });
});

describe('Authorization', () => {
  test('vendedor pode editar apenas seus próprios cartões', () => {
    const user = { id: 1, role: 'seller' };
    const card = { id: 100, assigned_to: 1 };
    expect(canEditCard(user, card)).toBe(true);
  });

  test('vendedor não pode editar cartão de outro vendedor', () => {
    const user = { id: 1, role: 'seller' };
    const card = { id: 100, assigned_to: 2 };
    expect(canEditCard(user, card)).toBe(false);
  });

  test('gerente pode editar qualquer cartão da sua equipe', () => {
    const user = { id: 1, role: 'manager', team_id: 5 };
    const card = { id: 100, assigned_to: 2, team_id: 5 };
    expect(canEditCard(user, card)).toBe(true);
  });

  test('admin pode editar qualquer cartão', () => {
    const user = { id: 1, role: 'admin' };
    const card = { id: 100, assigned_to: 999 };
    expect(canEditCard(user, card)).toBe(true);
  });
});
```

### 3.2 Validações de Dados

**Arquivo**: `tests/unit/validations.test.ts`

```typescript
describe('Card Validations', () => {
  test('deve validar campos obrigatórios', () => {
    const invalidCard = { name: '' };
    const errors = validateCard(invalidCard);
    expect(errors).toContain('Nome é obrigatório');
  });

  test('deve validar formato de email', () => {
    const card = { email: 'invalid-email' };
    const errors = validateCard(card);
    expect(errors).toContain('Email inválido');
  });

  test('deve validar valor numérico', () => {
    const card = { value: -100 };
    const errors = validateCard(card);
    expect(errors).toContain('Valor deve ser positivo');
  });

  test('deve aceitar cartão válido', () => {
    const validCard = {
      name: 'Lead XYZ',
      email: 'lead@xyz.com',
      value: 5000
    };
    const errors = validateCard(validCard);
    expect(errors).toHaveLength(0);
  });
});
```

### 3.3 Cache Service

**Arquivo**: `tests/unit/cache.test.ts`

```typescript
describe('CacheService', () => {
  beforeEach(() => {
    CacheService.flushAll();
  });

  test('deve armazenar e recuperar valor', () => {
    CacheService.setSession(1, { token: 'abc123' });
    const session = CacheService.getSession(1);
    expect(session.token).toBe('abc123');
  });

  test('deve retornar undefined para chave inexistente', () => {
    const value = CacheService.getSession(999);
    expect(value).toBeUndefined();
  });

  test('deve expirar após TTL', async () => {
    CacheService.setDashboardKPIs(1, { total: 100 }); // TTL: 60s
    await sleep(61000);
    const kpis = CacheService.getDashboardKPIs(1);
    expect(kpis).toBeUndefined();
  });

  test('deve invalidar cache manualmente', () => {
    CacheService.setSession(1, { token: 'abc123' });
    CacheService.invalidateSession(1);
    const session = CacheService.getSession(1);
    expect(session).toBeUndefined();
  });
});
```

---

## 4. TESTES DE GAMIFICAÇÃO

### 4.1 Atribuição de Pontos

**Arquivo**: `tests/integration/gamification.test.ts`

```typescript
describe('Gamification - Pontos', () => {
  test('deve atribuir 10 pontos ao criar lead', async () => {
    const user = await createUser({ id: 1, name: 'João' });
    const card = await createCard({ name: 'Lead ABC', assigned_to: 1 });

    const points = await getPoints(1);
    expect(points).toContain({
      action_type: 'criar_lead',
      points: 10,
      card_id: card.id
    });
  });

  test('deve atribuir 100 pontos ao fechar venda', async () => {
    const user = await createUser({ id: 1 });
    const card = await createCard({ assigned_to: 1, value: 5000 });
    await moveCard(card.id, 'Venda Fechada');

    const points = await getPoints(1);
    const wonPoints = points.find(p => p.action_type === 'venda_ganha');
    expect(wonPoints.points).toBe(100);
  });

  test('deve atribuir 25 pontos ao transferir cartão', async () => {
    const user1 = await createUser({ id: 1 });
    const user2 = await createUser({ id: 2 });
    const card = await createCard({ assigned_to: 1 });

    await transferCard(card.id, { from: 1, to: 2, reason: 'especialista' });

    const points = await getPoints(1);
    expect(points).toContain({
      action_type: 'transferir_lead',
      points: 25
    });
  });

  test('pontos totais nunca devem resetar', async () => {
    const user = await createUser({ id: 1 });
    await addPoints(1, 100);

    // Simular reset de ranking semanal
    await resetWeeklyRanking();

    const totalPoints = await getTotalPoints(1);
    expect(totalPoints).toBe(100); // Pontos mantidos
  });
});
```

### 4.2 Rankings

**Arquivo**: `tests/integration/rankings.test.ts`

```typescript
describe('Gamification - Rankings', () => {
  test('deve calcular ranking corretamente', async () => {
    await addPoints(1, 100); // João
    await addPoints(2, 200); // Maria
    await addPoints(3, 150); // Pedro

    const ranking = await calculateWeeklyRanking();

    expect(ranking[0]).toMatchObject({ user_id: 2, points: 200, rank: 1 });
    expect(ranking[1]).toMatchObject({ user_id: 3, points: 150, rank: 2 });
    expect(ranking[2]).toMatchObject({ user_id: 1, points: 100, rank: 3 });
  });

  test('deve resetar ranking ao final do período', async () => {
    await addPoints(1, 100);
    await saveRanking('weekly', 2025, 50); // Semana 50

    await resetWeeklyRanking();

    const currentRanking = await getCurrentRanking('weekly');
    expect(currentRanking).toHaveLength(0); // Resetado

    const historicalRanking = await getRanking('weekly', 2025, 50);
    expect(historicalRanking).not.toHaveLength(0); // Histórico preservado
  });
});
```

### 4.3 Badges

**Arquivo**: `tests/integration/badges.test.ts`

```typescript
describe('Gamification - Badges', () => {
  test('deve conceder badge "Primeiro Lead" automaticamente', async () => {
    const user = await createUser({ id: 1 });
    await createCard({ assigned_to: 1 });

    await checkAutomaticBadges(1);

    const badges = await getUserBadges(1);
    expect(badges).toContainEqual(
      expect.objectContaining({ name: 'Primeiro Lead' })
    );
  });

  test('deve conceder badge "Vendedor do Mês" ao 1º lugar', async () => {
    await addPoints(1, 500); // 1º lugar
    await addPoints(2, 300);

    await resetMonthlyRanking();

    const badges = await getUserBadges(1);
    expect(badges).toContainEqual(
      expect.objectContaining({ name: 'Vendedor do Mês' })
    );
  });

  test('gerente pode atribuir badge manual', async () => {
    const manager = await createUser({ id: 1, role: 'manager' });
    const seller = await createUser({ id: 2, role: 'seller' });
    const badge = await createCustomBadge({ name: 'Destaque', criteria_type: 'manual' });

    await assignBadge(badge.id, seller.id, manager.id);

    const badges = await getUserBadges(seller.id);
    expect(badges).toContainEqual(
      expect.objectContaining({ name: 'Destaque', assigned_by: manager.id })
    );
  });
});
```

---

## 5. TESTES DE AUTOMAÇÕES

### 5.1 Execução de Automações

**Arquivo**: `tests/integration/automations.test.ts`

```typescript
describe('Automations - Execução', () => {
  test('deve executar automação ao mover cartão', async () => {
    const automation = await createAutomation({
      trigger_type: 'card_moved',
      trigger_list_id: 5, // "Negociação"
      action_type: 'notify',
      action_config: { message: 'Cartão movido!' }
    });

    const card = await createCard({ list_id: 1 });
    await moveCard(card.id, 5); // Move para "Negociação"

    await waitForJobCompletion();

    const executions = await getAutomationExecutions(automation.id);
    expect(executions).toHaveLength(1);
    expect(executions[0].status).toBe('success');
  });

  test('deve respeitar prioridade de execução', async () => {
    const auto1 = await createAutomation({ priority: 50, trigger_list_id: 5 });
    const auto2 = await createAutomation({ priority: 100, trigger_list_id: 5 });
    const auto3 = await createAutomation({ priority: 80, trigger_list_id: 5 });

    const card = await createCard({ list_id: 1 });
    await moveCard(card.id, 5);

    await waitForJobCompletion();

    const executions = await getExecutionOrder();
    expect(executions[0].automation_id).toBe(auto2.id); // Priority 100
    expect(executions[1].automation_id).toBe(auto3.id); // Priority 80
    expect(executions[2].automation_id).toBe(auto1.id); // Priority 50
  });

  test('deve fazer retry em caso de falha', async () => {
    const automation = await createAutomation({
      action_type: 'webhook',
      action_config: { url: 'http://invalid-url' }
    });

    const card = await createCard();
    await triggerAutomation(automation.id, card.id);

    await waitForJobCompletion();

    const execution = await getLatestExecution(automation.id);
    expect(execution.retry_count).toBeGreaterThan(0);
    expect(execution.status).toBe('failed');
  });
});
```

### 5.2 Limite de Automações

**Arquivo**: `tests/integration/automation-limits.test.ts`

```typescript
describe('Automations - Limites', () => {
  test('deve permitir criar até 50 automações', async () => {
    for (let i = 0; i < 50; i++) {
      await createAutomation({ name: `Auto ${i}` });
    }

    const count = await countActiveAutomations();
    expect(count).toBe(50);
  });

  test('deve bloquear criação da 51ª automação', async () => {
    for (let i = 0; i < 50; i++) {
      await createAutomation({ name: `Auto ${i}` });
    }

    await expect(
      createAutomation({ name: 'Auto 51' })
    ).rejects.toThrow('Limite de 50 automações ativas atingido');
  });

  test('automações inativas não contam no limite', async () => {
    for (let i = 0; i < 50; i++) {
      await createAutomation({ name: `Auto ${i}` });
    }

    await deactivateAutomation(1);

    const newAuto = await createAutomation({ name: 'Auto Nova' });
    expect(newAuto).toBeDefined();
  });
});
```

### 5.3 Automações Agendadas

**Arquivo**: `tests/integration/scheduled-automations.test.ts`

```typescript
describe('Automations - Agendadas', () => {
  test('deve executar automação única na data/hora correta', async () => {
    const executeAt = new Date(Date.now() + 5000); // Daqui 5 segundos

    const automation = await createAutomation({
      automation_type: 'scheduled',
      schedule_type: 'once',
      schedule_config: { datetime: executeAt.toISOString() },
      action_type: 'notify'
    });

    await sleep(6000); // Aguarda execução
    await runScheduledAutomationsCron();

    const execution = await getLatestExecution(automation.id);
    expect(execution).toBeDefined();
    expect(execution.triggered_by).toBe('schedule');

    const updated = await getAutomation(automation.id);
    expect(updated.is_active).toBe(false); // Desativada após execução única
  });

  test('deve calcular próxima execução diária corretamente', async () => {
    const automation = await createAutomation({
      automation_type: 'scheduled',
      schedule_type: 'recurring',
      schedule_config: { frequency: 'daily', time: '09:00' }
    });

    const nextExec = calculateNextExecution(automation.schedule_config);
    const expected = new Date();
    expected.setHours(9, 0, 0, 0);
    if (expected <= new Date()) {
      expected.setDate(expected.getDate() + 1);
    }

    expect(nextExec.getHours()).toBe(9);
    expect(nextExec.getMinutes()).toBe(0);
  });

  test('deve recalcular próxima execução após executar recorrente', async () => {
    const automation = await createAutomation({
      automation_type: 'scheduled',
      schedule_type: 'recurring',
      schedule_config: { frequency: 'daily', time: '09:00' }
    });

    await executeScheduledAutomation(automation.id);

    const updated = await getAutomation(automation.id);
    expect(updated.last_executed_at).toBeDefined();
    expect(updated.next_execution_at).toBeAfter(updated.last_executed_at);
    expect(updated.is_active).toBe(true); // Continua ativa
  });
});
```

---

## 6. TESTES DE TRANSFERÊNCIAS

### 6.1 Transferência Individual

**Arquivo**: `tests/integration/transfers.test.ts`

```typescript
describe('Transfers - Individual', () => {
  test('deve transferir cartão com sucesso', async () => {
    const user1 = await createUser({ id: 1 });
    const user2 = await createUser({ id: 2 });
    const card = await createCard({ assigned_to: 1 });

    await transferCard(card.id, {
      from_user_id: 1,
      to_user_id: 2,
      reason: 'especialista',
      notes: 'Lead complexo'
    });

    const updated = await getCard(card.id);
    expect(updated.assigned_to).toBe(2);

    const transfer = await getLatestTransfer(card.id);
    expect(transfer.from_user_id).toBe(1);
    expect(transfer.to_user_id).toBe(2);
    expect(transfer.reason).toBe('especialista');
  });

  test('não deve transferir para si mesmo', async () => {
    const card = await createCard({ assigned_to: 1 });

    await expect(
      transferCard(card.id, { from_user_id: 1, to_user_id: 1 })
    ).rejects.toThrow('Não pode transferir para si mesmo');
  });

  test('não deve transferir cartão finalizado', async () => {
    const card = await createCard({ assigned_to: 1, status: 'Venda Fechada' });

    await expect(
      transferCard(card.id, { from_user_id: 1, to_user_id: 2 })
    ).rejects.toThrow('Não pode transferir cartão finalizado');
  });
});
```

### 6.2 Limite de Transferências

**Arquivo**: `tests/integration/transfer-limits.test.ts`

```typescript
describe('Transfers - Limites', () => {
  test('deve permitir 10 transferências no mês (padrão)', async () => {
    const user1 = await createUser({ id: 1 });
    const user2 = await createUser({ id: 2 });

    for (let i = 0; i < 10; i++) {
      const card = await createCard({ assigned_to: 1 });
      await transferCard(card.id, { from_user_id: 1, to_user_id: 2 });
    }

    const count = await countTransfersThisMonth(1);
    expect(count).toBe(10);
  });

  test('deve bloquear 11ª transferência', async () => {
    const user1 = await createUser({ id: 1 });
    const user2 = await createUser({ id: 2 });

    for (let i = 0; i < 10; i++) {
      const card = await createCard({ assigned_to: 1 });
      await transferCard(card.id, { from_user_id: 1, to_user_id: 2 });
    }

    const card = await createCard({ assigned_to: 1 });
    await expect(
      transferCard(card.id, { from_user_id: 1, to_user_id: 2 })
    ).rejects.toThrow('Limite de 10 transferências mensais atingido');
  });

  test('gerente/admin não têm limite', async () => {
    const manager = await createUser({ id: 1, role: 'manager' });
    const seller = await createUser({ id: 2, role: 'seller' });

    for (let i = 0; i < 15; i++) {
      const card = await createCard({ assigned_to: 1 });
      await transferCard(card.id, { from_user_id: 1, to_user_id: 2 });
    }

    const count = await countTransfersThisMonth(1);
    expect(count).toBe(15); // Sem erro
  });

  test('contador deve resetar no início do mês', async () => {
    const user = await createUser({ id: 1 });

    // Transferências em novembro
    mockDate('2025-11-15');
    for (let i = 0; i < 10; i++) {
      const card = await createCard({ assigned_to: 1 });
      await transferCard(card.id, { from_user_id: 1, to_user_id: 2 });
    }

    // Dezembro - contador resetado
    mockDate('2025-12-01');
    const card = await createCard({ assigned_to: 1 });
    await transferCard(card.id, { from_user_id: 1, to_user_id: 2 }); // Deve funcionar

    const count = await countTransfersThisMonth(1);
    expect(count).toBe(1);
  });
});
```

### 6.3 Transferência em Lote

**Arquivo**: `tests/integration/bulk-transfers.test.ts`

```typescript
describe('Transfers - Em Lote', () => {
  test('deve transferir múltiplos cartões com sucesso', async () => {
    const cards = [];
    for (let i = 0; i < 15; i++) {
      cards.push(await createCard({ assigned_to: 1 }));
    }

    const result = await bulkTransfer({
      card_ids: cards.map(c => c.id),
      from_user_id: 1,
      to_user_id: 2,
      reason: 'rebalanceamento'
    });

    expect(result.total).toBe(15);
    expect(result.success).toBe(15);
    expect(result.failed).toBe(0);

    for (const card of cards) {
      const updated = await getCard(card.id);
      expect(updated.assigned_to).toBe(2);
    }
  });

  test('deve gerar batch_id único para o lote', async () => {
    const cards = [
      await createCard({ assigned_to: 1 }),
      await createCard({ assigned_to: 1 })
    ];

    await bulkTransfer({
      card_ids: cards.map(c => c.id),
      from_user_id: 1,
      to_user_id: 2
    });

    const transfers = await getTransfersByCards(cards.map(c => c.id));
    const batchId = transfers[0].batch_id;

    expect(batchId).toBeDefined();
    expect(transfers.every(t => t.batch_id === batchId)).toBe(true);
  });

  test('deve continuar processando após falha individual', async () => {
    const cards = [
      await createCard({ assigned_to: 1 }),
      await createCard({ assigned_to: 1, status: 'Venda Fechada' }), // Vai falhar
      await createCard({ assigned_to: 1 })
    ];

    const result = await bulkTransfer({
      card_ids: cards.map(c => c.id),
      from_user_id: 1,
      to_user_id: 2
    });

    expect(result.total).toBe(3);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.failures[0].card_id).toBe(cards[1].id);
  });

  test('deve bloquear lote se exceder limite', async () => {
    await setTransferLimit({ enabled: true, quantity: 10, period: 'monthly' });

    // Já fez 8 transferências
    for (let i = 0; i < 8; i++) {
      const card = await createCard({ assigned_to: 1 });
      await transferCard(card.id, { from_user_id: 1, to_user_id: 2 });
    }

    // Tenta transferir 5 em lote (8 + 5 = 13 > 10)
    const cards = [];
    for (let i = 0; i < 5; i++) {
      cards.push(await createCard({ assigned_to: 1 }));
    }

    await expect(
      bulkTransfer({ card_ids: cards.map(c => c.id), from_user_id: 1, to_user_id: 2 })
    ).rejects.toThrow('Limite de transferências insuficiente');
  });
});
```

### 6.4 Aprovação de Transferências

**Arquivo**: `tests/integration/transfer-approval.test.ts`

```typescript
describe('Transfers - Aprovação', () => {
  test('sem aprovação habilitada, transfere direto', async () => {
    await setTransferApproval({ enabled: false });

    const card = await createCard({ assigned_to: 1 });
    await transferCard(card.id, { from_user_id: 1, to_user_id: 2 });

    const updated = await getCard(card.id);
    expect(updated.assigned_to).toBe(2); // Transferido imediatamente
  });

  test('com aprovação habilitada, cria solicitação pendente', async () => {
    await setTransferApproval({ enabled: true });

    const card = await createCard({ assigned_to: 1 });
    await requestTransfer(card.id, { from_user_id: 1, to_user_id: 2 });

    const cardStillWith1 = await getCard(card.id);
    expect(cardStillWith1.assigned_to).toBe(1); // Não transferido ainda

    const request = await getLatestTransferRequest(card.id);
    expect(request.status).toBe('pending');
  });

  test('gerente pode aprovar solicitação', async () => {
    await setTransferApproval({ enabled: true });

    const manager = await createUser({ id: 10, role: 'manager' });
    const card = await createCard({ assigned_to: 1 });
    const request = await requestTransfer(card.id, { from_user_id: 1, to_user_id: 2 });

    await approveTransferRequest(request.id, manager.id);

    const updated = await getCard(card.id);
    expect(updated.assigned_to).toBe(2); // Transferido após aprovação

    const approvedRequest = await getTransferRequest(request.id);
    expect(approvedRequest.status).toBe('approved');
    expect(approvedRequest.reviewed_by).toBe(manager.id);
  });

  test('gerente pode rejeitar solicitação', async () => {
    await setTransferApproval({ enabled: true });

    const manager = await createUser({ id: 10, role: 'manager' });
    const card = await createCard({ assigned_to: 1 });
    const request = await requestTransfer(card.id, { from_user_id: 1, to_user_id: 2 });

    await rejectTransferRequest(request.id, manager.id, 'Lead ainda não qualificado');

    const cardStillWith1 = await getCard(card.id);
    expect(cardStillWith1.assigned_to).toBe(1); // Não transferido

    const rejectedRequest = await getTransferRequest(request.id);
    expect(rejectedRequest.status).toBe('rejected');
    expect(rejectedRequest.rejection_reason).toBe('Lead ainda não qualificado');
  });

  test('solicitação deve expirar após 72h', async () => {
    await setTransferApproval({ enabled: true });

    const card = await createCard({ assigned_to: 1 });
    const request = await requestTransfer(card.id, { from_user_id: 1, to_user_id: 2 });

    // Avançar 73 horas
    mockDate(new Date(Date.now() + 73 * 60 * 60 * 1000));
    await runExpireTransferRequestsCron();

    const expiredRequest = await getTransferRequest(request.id);
    expect(expiredRequest.status).toBe('expired');

    const cardStillWith1 = await getCard(card.id);
    expect(cardStillWith1.assigned_to).toBe(1);
  });
});
```

---

## 7. TESTES DE INTEGRAÇÃO

### 7.1 API Endpoints

**Arquivo**: `tests/integration/api.test.ts`

```typescript
describe('API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'senha123' });
    authToken = response.body.token;
  });

  test('GET /api/cards - deve listar cartões do usuário', async () => {
    const response = await request(app)
      .get('/api/cards')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('cards');
    expect(Array.isArray(response.body.cards)).toBe(true);
  });

  test('POST /api/cards - deve criar novo cartão', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Lead Teste',
        email: 'lead@teste.com',
        list_id: 1
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Lead Teste');
  });

  test('PUT /api/cards/:id - deve atualizar cartão', async () => {
    const card = await createCard({ name: 'Original' });

    const response = await request(app)
      .put(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Atualizado' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Atualizado');
  });

  test('DELETE /api/cards/:id - deve deletar cartão', async () => {
    const card = await createCard({ name: 'A Deletar' });

    const response = await request(app)
      .delete(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(204);

    const deleted = await getCard(card.id);
    expect(deleted).toBeNull();
  });

  test('deve retornar 401 sem autenticação', async () => {
    const response = await request(app)
      .get('/api/cards');

    expect(response.status).toBe(401);
  });

  test('deve retornar 403 sem permissão', async () => {
    const sellerToken = await loginAs({ role: 'seller' });
    const adminCard = await createCard({ assigned_to: 999 }); // Cartão de outro

    const response = await request(app)
      .put(`/api/cards/${adminCard.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Tentativa' });

    expect(response.status).toBe(403);
  });
});
```

### 7.2 Webhooks

**Arquivo**: `tests/integration/webhooks.test.ts`

```typescript
describe('Webhooks', () => {
  test('deve enviar webhook ao criar cartão', async () => {
    const mockServer = await createMockWebhookServer();

    await createWebhook({
      url: mockServer.url,
      events: ['card.created']
    });

    await createCard({ name: 'Lead XYZ' });

    await waitForWebhook();

    const receivedWebhook = mockServer.getLastRequest();
    expect(receivedWebhook.body.event).toBe('card.created');
    expect(receivedWebhook.body.data.name).toBe('Lead XYZ');
  });

  test('deve fazer retry em caso de falha', async () => {
    const mockServer = await createMockWebhookServer({ fail: true });

    await createWebhook({
      url: mockServer.url,
      events: ['card.created']
    });

    await createCard({ name: 'Lead XYZ' });

    await waitForRetries();

    expect(mockServer.getRequestCount()).toBeGreaterThan(1); // Teve retry
  });
});
```

---

## 8. TESTES E2E (END-TO-END)

### 8.1 Fluxo Completo de Venda

**Arquivo**: `tests/e2e/sales-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Fluxo Completo de Venda', () => {
  test('vendedor deve criar lead e fechar venda', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'vendedor@hsgrowth.com');
    await page.fill('[name="password"]', 'senha123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // Criar novo lead
    await page.click('button:has-text("Novo Lead")');
    await page.fill('[name="name"]', 'Empresa XYZ Ltda');
    await page.fill('[name="email"]', 'contato@xyz.com');
    await page.fill('[name="phone"]', '11999999999');
    await page.fill('[name="value"]', '50000');
    await page.click('button:has-text("Salvar")');

    // Verificar lead criado no kanban
    await page.goto('/boards/1');
    await expect(page.locator('text=Empresa XYZ Ltda')).toBeVisible();

    // Mover lead para "Negociação"
    await page.dragAndDrop(
      '.card:has-text("Empresa XYZ Ltda")',
      '.list:has-text("Negociação")'
    );
    await expect(page.locator('.list:has-text("Negociação") .card:has-text("Empresa XYZ Ltda")')).toBeVisible();

    // Adicionar nota
    await page.click('.card:has-text("Empresa XYZ Ltda")');
    await page.fill('[name="note"]', 'Cliente interessado em nosso produto Premium');
    await page.click('button:has-text("Adicionar Nota")');
    await expect(page.locator('text=Cliente interessado')).toBeVisible();

    // Fechar venda
    await page.dragAndDrop(
      '.card:has-text("Empresa XYZ Ltda")',
      '.list:has-text("Venda Fechada")'
    );

    // Verificar pontos ganhos
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Meu Perfil');
    await expect(page.locator('text=110 pontos')).toBeVisible(); // 10 (criar) + 100 (venda)

    // Verificar badge "Primeira Venda"
    await page.click('text=Badges');
    await expect(page.locator('text=Primeira Venda')).toBeVisible();
  });
});
```

### 8.2 Transferência de Cartão

**Arquivo**: `tests/e2e/transfer.spec.ts`

```typescript
test.describe('Transferência de Cartão', () => {
  test('vendedor deve transferir lead para especialista', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'vendedor@hsgrowth.com');
    await page.fill('[name="password"]', 'senha123');
    await page.click('button[type="submit"]');

    // Ir para kanban
    await page.goto('/boards/1');

    // Abrir card
    await page.click('.card:first-child');

    // Clicar em transferir
    await page.click('button:has-text("Transferir")');

    // Selecionar destinatário
    await page.selectOption('[name="to_user_id"]', { label: 'João Silva (Especialista)' });
    await page.selectOption('[name="reason"]', 'especialista');
    await page.fill('[name="notes"]', 'Lead técnico complexo');

    // Confirmar transferência
    await page.click('button:has-text("Confirmar Transferência")');

    // Verificar mensagem de sucesso
    await expect(page.locator('text=Cartão transferido com sucesso')).toBeVisible();

    // Verificar que cartão sumiu da lista
    await page.goto('/boards/1');
    await expect(page.locator('.card:has-text("Lead técnico")')).not.toBeVisible();
  });

  test('deve exibir erro ao atingir limite de transferências', async ({ page }) => {
    // Setup: usuário já fez 10 transferências este mês
    await seedTransfers({ user_id: 1, count: 10 });

    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'vendedor@hsgrowth.com');
    await page.fill('[name="password"]', 'senha123');
    await page.click('button[type="submit"]');

    // Tentar transferir 11º cartão
    await page.goto('/boards/1');
    await page.click('.card:first-child');
    await page.click('button:has-text("Transferir")');

    // Deve exibir mensagem de limite atingido
    await expect(page.locator('text=Limite de 10 transferências mensais atingido')).toBeVisible();
    await expect(page.locator('button:has-text("Confirmar Transferência")')).toBeDisabled();
  });
});
```

### 8.3 Criação de Automação

**Arquivo**: `tests/e2e/automation.spec.ts`

```typescript
test.describe('Automações', () => {
  test('admin deve criar automação de notificação', async ({ page }) => {
    // Login como admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@hsgrowth.com');
    await page.fill('[name="password"]', 'senha123');
    await page.click('button[type="submit"]');

    // Ir para automações
    await page.click('text=Automações');
    await page.click('button:has-text("Nova Automação")');

    // Configurar trigger
    await page.fill('[name="name"]', 'Notificar Gerente - Venda Fechada');
    await page.selectOption('[name="trigger_type"]', 'card_moved');
    await page.selectOption('[name="trigger_board_id"]', '1');
    await page.selectOption('[name="trigger_list_id"]', { label: 'Venda Fechada' });

    // Configurar ação
    await page.selectOption('[name="action_type"]', 'notify');
    await page.fill('[name="action_config.message"]', 'Nova venda fechada: {{card.name}}');
    await page.selectOption('[name="action_config.notify_user"]', { label: 'Gerente Comercial' });

    // Definir prioridade
    await page.fill('[name="priority"]', '90');

    // Salvar
    await page.click('button:has-text("Criar Automação")');

    // Verificar sucesso
    await expect(page.locator('text=Automação criada com sucesso')).toBeVisible();
    await expect(page.locator('text=Notificar Gerente - Venda Fechada')).toBeVisible();
  });

  test('deve criar automação agendada semanal', async ({ page }) => {
    await page.goto('/login');
    await loginAsAdmin(page);

    await page.goto('/automations');
    await page.click('button:has-text("Nova Automação")');

    // Selecionar tipo agendada
    await page.click('[name="automation_type"][value="scheduled"]');

    // Configurar agendamento
    await page.click('[name="schedule_type"][value="recurring"]');
    await page.selectOption('[name="schedule_config.frequency"]', 'weekly');
    await page.selectOption('[name="schedule_config.day_of_week"]', '1'); // Segunda
    await page.fill('[name="schedule_config.time"]', '09:00');

    // Configurar ação
    await page.fill('[name="name"]', 'Relatório Semanal');
    await page.selectOption('[name="action_type"]', 'notify');

    // Salvar
    await page.click('button:has-text("Criar Automação")');

    // Verificar próxima execução
    await expect(page.locator('text=Próxima execução:')).toBeVisible();
    await expect(page.locator('text=Segunda-feira às 09:00')).toBeVisible();
  });
});
```

### 8.4 Dashboard e Relatórios

**Arquivo**: `tests/e2e/dashboard.spec.ts`

```typescript
test.describe('Dashboard e Relatórios', () => {
  test('deve exibir KPIs corretamente', async ({ page }) => {
    // Seed: 10 leads, 5 vendas, 3 perdidos
    await seedCards({
      total: 10,
      won: 5,
      lost: 3,
      user_id: 1
    });

    await page.goto('/login');
    await loginAsSeller(page);

    // Verificar KPIs
    await expect(page.locator('[data-testid="kpi-total"]')).toHaveText('10');
    await expect(page.locator('[data-testid="kpi-won"]')).toHaveText('5');
    await expect(page.locator('[data-testid="kpi-lost"]')).toHaveText('3');
    await expect(page.locator('[data-testid="kpi-conversion"]')).toHaveText('50%');
  });

  test('deve exibir ranking de gamificação', async ({ page }) => {
    await seedPoints([
      { user_id: 1, points: 300 },
      { user_id: 2, points: 500 },
      { user_id: 3, points: 200 }
    ]);

    await page.goto('/login');
    await loginAsSeller(page);

    await page.click('text=Ranking');

    // Verificar ordem do ranking
    const rankings = await page.locator('.ranking-item').allTextContents();
    expect(rankings[0]).toContain('Maria Silva'); // 500 pts
    expect(rankings[1]).toContain('João Silva'); // 300 pts
    expect(rankings[2]).toContain('Pedro Costa'); // 200 pts
  });

  test('deve exportar relatório CSV', async ({ page }) => {
    await page.goto('/login');
    await loginAsAdmin(page);

    await page.goto('/reports');
    await page.selectOption('[name="report_type"]', 'sales');
    await page.click('button:has-text("Exportar CSV")');

    // Aguardar download
    const download = await page.waitForEvent('download');
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/vendas-\d{4}-\d{2}-\d{2}\.csv/);
  });
});
```

---

## 9. TESTES DE PERFORMANCE

### 9.1 Carga de Kanban

**Arquivo**: `tests/performance/kanban.test.ts`

```typescript
describe('Performance - Kanban', () => {
  test('deve carregar kanban com 3200 cartões em < 2s', async () => {
    // Seed: 3200 cartões em 10 listas
    await seedCards({ count: 3200, lists: 10 });

    const start = Date.now();
    const response = await request(app)
      .get('/api/boards/1/cards')
      .set('Authorization', `Bearer ${authToken}`);
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(2000); // < 2 segundos
  });

  test('paginação deve carregar 50 cartões em < 100ms', async () => {
    await seedCards({ count: 10000 });

    const start = Date.now();
    const response = await request(app)
      .get('/api/cards?page=1&limit=50')
      .set('Authorization', `Bearer ${authToken}`);
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(response.body.cards).toHaveLength(50);
    expect(duration).toBeLessThan(100); // < 100ms
  });
});
```

### 9.2 Cálculo de Rankings

**Arquivo**: `tests/performance/rankings.test.ts`

```typescript
describe('Performance - Rankings', () => {
  test('cálculo de ranking mensal deve completar em < 5s', async () => {
    // Seed: 100 usuários, 10.000 pontos registrados
    await seedUsers({ count: 100 });
    await seedPoints({ count: 10000 });

    const start = Date.now();
    await calculateMonthlyRanking();
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // < 5 segundos
  });
});
```

---

## 10. TESTES DE SEGURANÇA

### 10.1 SQL Injection

**Arquivo**: `tests/security/sql-injection.test.ts`

```typescript
describe('Security - SQL Injection', () => {
  test('não deve permitir SQL injection em busca', async () => {
    const maliciousQuery = "'; DROP TABLE users; --";

    const response = await request(app)
      .get(`/api/cards/search?q=${encodeURIComponent(maliciousQuery)}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);

    // Verificar que tabela users ainda existe
    const users = await prisma.users.findMany();
    expect(users).toBeDefined();
  });
});
```

### 10.2 XSS (Cross-Site Scripting)

**Arquivo**: `tests/security/xss.test.ts`

```typescript
describe('Security - XSS', () => {
  test('deve escapar HTML em nome do cartão', async () => {
    const maliciousName = '<script>alert("XSS")</script>';

    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: maliciousName });

    expect(response.status).toBe(201);

    const card = await getCard(response.body.id);
    expect(card.name).toBe(maliciousName); // Salvo como texto

    // Frontend deve escapar ao renderizar
    const htmlResponse = await request(app)
      .get(`/cards/${card.id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(htmlResponse.text).not.toContain('<script>');
    expect(htmlResponse.text).toContain('&lt;script&gt;');
  });
});
```

### 10.3 CSRF (Cross-Site Request Forgery)

**Arquivo**: `tests/security/csrf.test.ts`

```typescript
describe('Security - CSRF', () => {
  test('deve rejeitar requisições sem CSRF token', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${authToken}`)
      // Sem CSRF token
      .send({ name: 'Lead Teste' });

    // Se CSRF protection estiver habilitada
    if (process.env.CSRF_ENABLED === 'true') {
      expect(response.status).toBe(403);
    }
  });
});
```

---

## 11. CRITÉRIOS DE ACEITAÇÃO

### 11.1 Funcional

**Pré-requisitos para deploy em produção**:

- ✅ Todas funcionalidades core implementadas e testadas
- ✅ Cobertura de testes ≥ 80%
- ✅ Zero bugs críticos ou bloqueantes
- ✅ Máximo 3 bugs de média prioridade
- ✅ Performance dentro das metas (< 2s carregamento kanban)
- ✅ Todos testes E2E passando
- ✅ Documentação de API completa
- ✅ Logs de auditoria funcionando

### 11.2 Não-Funcional

**Segurança**:
- ✅ Senhas criptografadas (bcrypt)
- ✅ HTTPS/TLS obrigatório
- ✅ Proteção contra SQL Injection
- ✅ Proteção contra XSS
- ✅ Rate limiting configurado
- ✅ Headers de segurança (Helmet.js)

**Performance**:
- ✅ API response < 500ms (95 percentil)
- ✅ Carregamento kanban < 2s (3200 cartões)
- ✅ Queries ao banco < 100ms (média)

**Disponibilidade**:
- ✅ Uptime ≥ 99% (após 1 mês em produção)
- ✅ Backup automático diário
- ✅ Plano de disaster recovery documentado

---

## 12. AUTOMAÇÃO DE TESTES

### 12.1 CI/CD Pipeline

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

### 12.2 Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
npm run test:unit
npm run lint
```

### 12.3 Scripts NPM

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

---

## 13. AMBIENTES DE TESTE

### 13.1 Dados de Seed

**Arquivo**: `tests/seed/data.ts`

```typescript
export const seedData = {
  users: [
    { id: 1, name: 'João Silva', email: 'joao@hsgrowth.com', role: 'seller' },
    { id: 2, name: 'Maria Santos', email: 'maria@hsgrowth.com', role: 'seller' },
    { id: 10, name: 'Carlos Admin', email: 'admin@hsgrowth.com', role: 'admin' }
  ],
  boards: [
    { id: 1, name: 'Vendas', account_id: 1 }
  ],
  lists: [
    { id: 1, name: 'Qualificação', board_id: 1, position: 1 },
    { id: 2, name: 'Negociação', board_id: 1, position: 2 },
    { id: 3, name: 'Venda Fechada', board_id: 1, position: 3 }
  ]
};
```

### 13.2 Factories

**Arquivo**: `tests/factories/card.factory.ts`

```typescript
export class CardFactory {
  static create(overrides = {}) {
    return {
      name: faker.company.name(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      value: faker.number.int({ min: 1000, max: 100000 }),
      list_id: 1,
      assigned_to: 1,
      ...overrides
    };
  }

  static createMany(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
```

---

**Versão**: 1.0
**Data**: 15 de Dezembro 2025
**Status**: Completo
