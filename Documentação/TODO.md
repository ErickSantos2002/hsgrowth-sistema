# 📋 TODO - HSGrowth CRM

**Prazo**: até 18/12/2025 (quinta-feira)
**Data de criação**: 11/12/2025

---

## ⚠️ ALTA PRIORIDADE - Decisões Pendentes

### 1. Gamificação (5 questões)
- [x] Definir se badges são personalizáveis por admin
  → **Decisão**: SIM - Badges padrão do sistema + badges customizadas pelo admin
- [x] Definir prêmios e recompensas (apenas simbólico ou real?)
  → **Decisão**: Apenas simbólico + exportação Excel/CSV para RH calcular bônus manualmente
- [x] Definir integração com outros sistemas (RH, folha de pagamento?)
  → **Decisão**: Apenas exportação manual (Excel/CSV), sem integração automática
- [x] Definir se há reset anual de pontos
  → **Decisão**: Pontos NUNCA resetam (perpétuos). Apenas rankings resetam periodicamente
- [x] Definir critérios para novas badges
  → **Decisão**: Critérios manuais (admin atribui) e automáticos (sistema atribui por regra)

### 2. Automações (4 questões)
- [x] Definir limite máximo de automações por conta
  → **Decisão**: 50 automações ativas por conta (trigger + scheduled)
- [x] Definir priorização quando múltiplas automações ativam
  → **Decisão**: Campo priority (1-100), desempate por created_at. Ordem: priority DESC, created_at ASC
- [x] Definir notificações de falhas (imediato, diário, semanal?)
  → **Decisão**: In-app sempre + Email apenas crítico (3+ falhas/1h, auto-disable, erros 404/403). Microsoft 365 SMTP
- [x] Definir se há automações agendadas (não apenas trigger)
  → **Decisão**: SIM - Execução única (once) + recorrente (daily/weekly/monthly/annual). Cron job a cada 1 min

### 3. Transferências (3 questões)
- [x] Definir limite de transferências por vendedor/período
  → **Decisão**: 10/mês (padrão), configurável (5/10/20/50/ilimitado), períodos (diário/semanal/mensal). Exceções temporárias pelo gerente. Fácil desabilitar
- [x] Definir se transferências requerem aprovação de gerente
  → **Decisão**: Opcional (padrão OFF). Toggle simples habilita fluxo de aprovação com solicitações pendentes, expiração 72h, painel gerente
- [x] Definir transferência em lote (múltiplos cartões de uma vez)
  → **Decisão**: SIM - Até 50 cartões/operação, mesmo destinatário, processamento assíncrono, relatório sucesso/falhas, integra com limite e aprovação

### 4. Performance e Escalabilidade (3 questões)
- [x] Definir estratégia de particionamento (por data, por conta?)
  → **Decisão**: NÃO particionar inicialmente. Índices suficientes para 2-3 anos. Preparar arquitetura para particionar no futuro se necessário (cards>10M, activities>50M)
- [x] Definir índices adicionais necessários
  → **Decisão**: 5 índices extras estratégicos (cartões vencidos, busca/autocomplete, timeline, login, rankings). Monitorar uso com EXPLAIN ANALYZE
- [x] Definir se usará cache distribuído (Redis Cluster?)
  → **Decisão**: Cache em memória local (node-cache) - SEM Redis. Zero custo adicional. Cache: sessions, permissions, board structure, KPIs, rankings. Migrar para Redis no futuro se necessário

### 5. Segurança e Compliance (2 questões)
- [x] Definir campos que precisam criptografia
  → **Decisão**: Apenas senhas (hash bcrypt, 12 rounds). Outros campos NÃO criptografados. Foco em outras medidas (SSL/TLS, firewall, backups criptografados, logs auditoria)
- [x] Definir política de retenção de logs (90 dias, 1 ano, 2 anos?)
  → **Decisão**: Auditoria 1 ano, Aplicação 90 dias, Acesso HTTP 30 dias. Rotação diária, compressão mensal, deleção automática. Custo ~$5-10/mês

---

## 📚 Documentação Complementar a Criar

### Documento 11 - Plano de Testes e Qualidade ✅
- [x] Casos de teste para módulos core
- [x] Casos de teste para Gamificação
- [x] Casos de teste para Automações
- [x] Casos de teste para Transferências
- [x] Testes de integração
- [x] Testes E2E
- [x] Critérios de aceitação

### Documento 12 - Guia de Desenvolvimento ✅
- [x] Setup de ambiente local (Node, PostgreSQL, Redis)
- [x] Como rodar o projeto
- [x] Padrões de código (naming conventions)
- [x] Estrutura de commits
- [x] Como rodar testes
- [x] Troubleshooting comum
- [x] Code review checklist

### Documento 13 - Dicionário de Dados ✅
- [x] Descrição detalhada de cada tabela
- [x] Descrição detalhada de cada campo
- [x] Regras de validação por campo
- [x] Relacionamentos explicados
- [x] Índices e justificativa
- [x] Queries de exemplo

### Documento 14 - Scripts de Migração ✅
- [x] Como exportar dados do Pipedrive
- [x] Mapeamento de campos Pipedrive → HSGrowth
- [x] Script de transformação de dados
- [x] Script de validação de dados
- [x] Rollback plan
- [x] Checklist de migração

---

## ✅ Validações Técnicas

### Validar Modelo de Dados
- [ ] Query: Listar todos os cartões de um quadro com campos customizados
- [ ] Query: Ranking de vendedores por período
- [ ] Query: Histórico completo de transferências de um cartão
- [ ] Query: KPIs do dashboard
- [ ] Query: Automações executadas com falhas
- [ ] Query: Cartões vencidos por vendedor
- [ ] Query: Performance de carregamento de Kanban (3.200 cartões)
- [ ] Query: Auditoria de ações por usuário

### POCs (Proof of Concept)
- [ ] POC: Bull/BullMQ job queue
- [ ] POC: Cron jobs com node-cron
- [ ] POC: Execução de automações assíncronas

---

## 📅 Cronograma Sugerido

### 11-15/12 (Qui-Dom)
- ✅ Resolver 17 questões pendentes (Gamificação, Automações, Transferências, Performance, Segurança) - CONCLUÍDO
- ✅ Criar Documento 11 - Plano de Testes - CONCLUÍDO

### 14-15/12 (Sáb-Dom)
- ✅ Criar Documento 12 - Guia de Desenvolvimento - CONCLUÍDO
- ✅ Criar Documento 13 - Dicionário de Dados - CONCLUÍDO

### 16-17/12 (Seg-Ter)
- [ ] Validar modelo de dados com queries - OPCIONAL
- ✅ Criar Documento 14 - Scripts de Migração - CONCLUÍDO
- [ ] POCs críticos - OPCIONAL

### 18/12 (Qua)
- ✅ Revisão final de toda documentação
- ✅ Garantir 100% de consistência
- ✅ Preparar para início da implementação

---

## 🎯 Resultado Esperado

Ao final (18/12):
- ✅ 10 documentos principais completos (sem comissões)
- ✅ 4 documentos complementares
- ✅ 17 decisões resolvidas (Gamificação, Automações, Transferências, Performance, Segurança)
- ✅ Modelo de dados validado
- ✅ POCs testados
- ✅ Pronto para começar desenvolvimento (Semana 1)

---

**Status atual**: ✅ 17 questões concluídas (100%) + ✅ 4 documentos complementares concluídos (100%) + ✅ Revisão completa finalizada
**Última atualização**: 15/12/2025 - 19:15
**Mudança importante**:
- ✅ Todas as 17 questões pendentes foram resolvidas e documentadas
- ✅ Documento 11 - Plano de Testes e Qualidade (13 seções, cobertura completa)
- ✅ Documento 12 - Guia de Desenvolvimento (8 seções, setup completo)
- ✅ Documento 13 - Dicionário de Dados (10 seções, todas as tabelas documentadas)
- ✅ Documento 14 - Scripts de Migração (10 seções, migração Pipedrive completa)
- ✅ Revisão 1-14: Todas as inconsistências corrigidas (Redis→node-cache, pg-boss, comissões removidas)
- 🎯 Sistema 100% documentado, consistente e pronto para iniciar implementação!
