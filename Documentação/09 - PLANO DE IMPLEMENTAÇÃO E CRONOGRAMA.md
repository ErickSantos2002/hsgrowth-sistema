# 09 - PLANO DE IMPLEMENTAÇÃO E CRONOGRAMA

## 1. INTRODUÇÃO

Este documento descreve o plano de implementação do projeto HSGrowth CRM, incluindo fases, sprints, tarefas, dependências e cronograma detalhado.

---

## 2. METODOLOGIA

**Metodologia**: Agile/Scrum

**Duração**: 10-11 semanas (~2.5 meses)

**Sprint**: 1 semana (5 dias úteis)

**Total de Sprints**: 10-11

**Reuniões**:
- Daily Standup: 15 minutos (09:00)
- Sprint Planning: 1 hora (segunda-feira)
- Sprint Review: 1 hora (sexta-feira)
- Sprint Retrospective: 30 minutos (sexta-feira)

---

## 3. FASES DO PROJETO

### Fase 1: Planejamento e Setup (Semana 1)
### Fase 2: Desenvolvimento Core Backend (Semanas 2-4)
### Fase 3: Desenvolvimento Core Frontend (Semanas 2-4)
### Fase 4: Importação, Busca e Filtros (Semana 5)
### Fase 5: Relatórios, KPIs e Auditoria (Semana 6)
### Fase 6: Notificações e Visualizações (Semana 7)
### Fase 7: Recursos Avançados (Semana 8)
### Fase 8: Gamificação, Automações e Transferências (Semana 9)
### Fase 9: Processamento Assíncrono (Semana 10)
### Fase 10: Testes Finais e Deploy (Semana 11)

---

## 4. CRONOGRAMA DETALHADO

### SEMANA 1: Planejamento e Setup

**Objetivo**: Preparar ambiente de desenvolvimento e infraestrutura

| Dia | Tarefa | Responsável | Duração | Status |
|-----|--------|-------------|---------|--------|
| Seg | Setup de repositórios Git (hsgrowth-api, hsgrowth-sistema) | Dev | 2h | |
| Seg | Configurar Docker e Docker Compose | Dev | 2h | |
| Seg | Criar estrutura de diretórios backend | Dev | 1h | |
| Ter | Criar estrutura de diretórios frontend | Dev | 1h | |
| Ter | Setup de banco de dados PostgreSQL | Dev | 2h | |
| Ter | Configurar node-cache (cache em memória) | Dev | 1h | |
| Qua | Criar schema Prisma inicial | Dev | 2h | |
| Qua | Setup de CI/CD básico | Dev | 2h | |
| Qui | Criar projeto Vite + React + TypeScript | Dev | 1h | |
| Qui | Configurar TailwindCSS | Dev | 1h | |
| Sex | Validação de ambiente com stakeholders | Dev | 1h | |
| Sex | Sprint Review e planejamento próxima semana | Dev | 1.5h | |

**Entregáveis**:
- ✅ Repositórios configurados
- ✅ Ambiente Docker pronto
- ✅ Schema Prisma inicial
- ✅ Projeto React configurado

---

### SEMANA 2: Autenticação e Estrutura Base

**Objetivo**: Implementar autenticação JWT e estrutura base da API

#### Tarefas da Semana

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| **Backend - Autenticação** | | |
| Implementar AuthController (login, logout, refresh) | 8h | Schema Prisma |
| Implementar AuthService com JWT | 8h | AuthController |
| Implementar middleware de autenticação | 4h | AuthService |
| Implementar RBAC (Role-Based Access Control) | 8h | AuthService |
| Criar rotas base (auth, boards, cards) | 4h | RBAC |
| Implementar validação de entrada (Zod) | 4h | Rotas |
| Implementar error handling global | 4h | Rotas |
| Testes unitários de Auth | 4h | AuthService |
| **Frontend - Autenticação** | | |
| Criar estrutura de componentes | 4h | Projeto React |
| Implementar página de login | 6h | Componentes |
| Criar API client (Axios) | 4h | Projeto React |
| Implementar Zustand store de autenticação | 4h | API Client |
| Implementar interceptor de token | 4h | API Client |
| Criar layout base (Header, Sidebar) | 6h | Componentes |
| Testes unitários de Auth | 4h | Login Page |

**Entregáveis**:
- ✅ Sistema de autenticação JWT funcional
- ✅ RBAC implementado
- ✅ Página de login funcional
- ✅ API client configurado

---

### SEMANA 3: Gestão de Quadros e Listas

**Objetivo**: Implementar CRUD de quadros e listas

#### Tarefas da Semana

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| **Backend - Quadros e Listas** | | |
| Implementar BoardController (CRUD) | 8h | Schema Prisma |
| Implementar BoardService | 8h | BoardController |
| Implementar ListController (CRUD) | 8h | Schema Prisma |
| Implementar ListService | 8h | ListController |
| Implementar reordenação de listas | 4h | ListService |
| Testes de Boards e Lists | 4h | Services |
| **Frontend - Quadros e Listas** | | |
| Criar página de Dashboard | 6h | Layout Base |
| Implementar listagem de quadros | 4h | Dashboard |
| Criar modal de novo quadro | 4h | Componentes |
| Implementar criação de quadro | 4h | Modal |
| Criar página de detalhe do quadro | 6h | Dashboard |
| Implementar CRUD de listas | 8h | Quadro Detail |
| Testes de Boards e Lists | 4h | Componentes |

**Entregáveis**:
- ✅ CRUD de quadros funcional
- ✅ CRUD de listas funcional
- ✅ Dashboard com listagem de quadros
- ✅ Página de detalhe do quadro

---

### SEMANA 4: Campos Customizados e Cartões

**Objetivo**: Implementar campos customizados e CRUD de cartões

#### Tarefas da Semana

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| **Backend - Campos e Cartões** | | |
| Implementar CustomFieldController | 8h | Schema Prisma |
| Implementar CustomFieldService | 8h | CustomFieldController |
| Implementar CardController (CRUD) | 8h | Schema Prisma |
| Implementar CardService | 8h | CardController |
| Implementar validação de campos customizados | 6h | CustomFieldService |
| Implementar movimentação de cartões | 6h | CardService |
| Testes de Campos e Cartões | 4h | Services |
| **Frontend - Campos e Cartões** | | |
| Criar página de configuração de campos | 6h | Quadro Detail |
| Implementar CRUD de campos | 8h | Config Page |
| Criar formulário dinâmico de cartão | 8h | Campos |
| Implementar visualização Kanban | 10h | Formulário |
| Implementar drag-and-drop de cartões | 8h | Kanban |
| Criar modal de detalhe do cartão | 6h | Cartão |
| Testes de Campos e Cartões | 4h | Componentes |

**Entregáveis**:
- ✅ Sistema de campos customizados funcional
- ✅ CRUD de cartões funcional
- ✅ Visualização Kanban com drag-and-drop
- ✅ Modal de detalhe do cartão

---

### SEMANA 5: Importação, Busca e Filtros

**Objetivo**: Implementar importação de dados, busca e filtros

#### Tarefas da Semana

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| **Backend - Importação e Busca** | | |
| Implementar ImportController | 8h | CardService |
| Implementar ImportService (CSV) | 10h | ImportController |
| Implementar API de importação | 8h | CardService |
| Implementar busca textual | 6h | CardService |
| Implementar filtros avançados | 8h | CardService |
| Implementar visualizações salvas | 6h | Filtros |
| Testes de Importação e Busca | 4h | Services |
| **Frontend - Importação e Busca** | | |
| Criar página de importação | 6h | Admin |
| Implementar upload de arquivo | 4h | Importação |
| Implementar mapeamento de campos | 6h | Upload |
| Criar componente de busca | 4h | Kanban |
| Implementar filtros avançados | 8h | Busca |
| Implementar visualizações salvas | 6h | Filtros |
| Testes de Importação e Busca | 4h | Componentes |

**Entregáveis**:
- ✅ Importação de CSV funcional
- ✅ API de importação funcional
- ✅ Busca textual funcional
- ✅ Filtros avançados funcional
- ✅ Visualizações salvas funcional

---

### SEMANA 6: Relatórios, KPIs e Auditoria

**Objetivo**: Implementar relatórios, KPIs e sistema de auditoria

#### Tarefas da Semana

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| **Backend - Relatórios e Auditoria** | | |
| Implementar ReportController | 8h | CardService |
| Implementar ReportService (KPIs) | 10h | ReportController |
| Implementar cálculo de métricas | 10h | ReportService |
| Implementar AuditLogRepository | 6h | Schema Prisma |
| Implementar middleware de auditoria | 6h | AuditLogRepository |
| Implementar endpoints de logs | 6h | AuditLogRepository |
| Testes de Relatórios e Auditoria | 4h | Services |
| **Frontend - Relatórios e Auditoria** | | |
| Criar página de relatórios | 6h | Admin |
| Implementar dashboard de KPIs | 8h | Relatórios |
| Integrar gráficos (Recharts) | 8h | KPIs |
| Implementar filtros de período | 4h | KPIs |
| Criar página de logs de auditoria | 6h | Admin |
| Implementar visualização de logs | 6h | Logs |
| Testes de Relatórios e Auditoria | 4h | Componentes |

**Entregáveis**:
- ✅ Dashboard de KPIs funcional
- ✅ Gráficos de vendas funcional
- ✅ Sistema de auditoria funcional
- ✅ Página de logs funcional

---

### SEMANA 7: Notificações, Distribuição e Visualizações Alternativas

**Objetivo**: Implementar notificações, distribuição em rodízio e visualizações alternativas

#### Tarefas da Semana

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| **Backend - Notificações e Visualizações** | | |
| Implementar NotificationService | 8h | CardService |
| Implementar distribuição em rodízio | 8h | CardService |
| Implementar endpoints de notificações | 6h | NotificationService |
| Implementar visualização em Lista | 6h | CardService |
| Implementar visualização em Calendário | 8h | CardService |
| Testes de Notificações e Visualizações | 4h | Services |
| **Frontend - Notificações e Visualizações** | | |
| Implementar visualização em Lista | 8h | Kanban |
| Implementar visualização em Calendário | 10h | Kanban |
| Criar componente de notificações | 6h | Store |
| Implementar notificações in-app | 6h | Notificações |
| Implementar notificações por email | 4h | Notificações |
| Testes de Visualizações e Notificações | 4h | Componentes |

**Entregáveis**:
- ✅ Visualização em Lista funcional
- ✅ Visualização em Calendário funcional
- ✅ Sistema de notificações funcional
- ✅ Distribuição em rodízio funcional

---

### SEMANA 8: Recursos Administrativos Avançados

**Objetivo**: Implementar recursos administrativos e SQL direto

#### Tarefas da Semana

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| **Backend - Admin** | | |
| Implementar AdminController (usuários, permissões) | 8h | AuthService |
| Implementar SQL direto com segurança | 8h | Schema Prisma |
| Implementar validação SQL (whitelist SELECT) | 6h | SQL direto |
| Implementar timeout e limit de queries | 4h | SQL direto |
| Implementar painel de administração | 6h | AdminController |
| Testes de Admin e SQL | 4h | Services |
| **Frontend - Admin** | | |
| Criar página de administração de usuários | 6h | Admin |
| Implementar CRUD de usuários e permissões | 8h | Admin |
| Criar interface de SQL direto | 6h | Admin |
| Implementar editor SQL com validação | 6h | SQL Interface |
| Implementar visualização de resultados SQL | 4h | SQL Interface |
| Testes de Admin | 4h | Componentes |

**Entregáveis**:
- ✅ Painel de administração funcional
- ✅ Gestão de usuários e permissões
- ✅ SQL direto com validação de segurança
- ✅ Interface de execução de queries

---

### SEMANA 9: Gamificação, Automações e Transferências

**Objetivo**: Implementar módulos de gamificação, automações e transferências

#### Tarefas da Semana

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| **Backend - Gamificação** | | |
| Implementar GamificationService (pontos, rankings) | 8h | Schema Prisma |
| Implementar cálculo de pontos por ações | 6h | GamificationService |
| Implementar sistema de rankings (diário, semanal, mensal) | 6h | GamificationService |
| Implementar sistema de badges | 4h | GamificationService |
| Implementar endpoints de gamificação | 4h | GamificationService |
| **Backend - Automações** | | |
| Implementar AutomationService (criar, executar) | 8h | Schema Prisma |
| Implementar trigger de automações (movimento de cartão) | 6h | AutomationService |
| Implementar ações de automações (copiar, mover, criar) | 6h | AutomationService |
| Implementar mapeamento de campos | 6h | AutomationService |
| Implementar endpoints de automações | 4h | AutomationService |
| **Backend - Transferências** | | |
| Implementar TransferService | 8h | Schema Prisma |
| Implementar transferência de cartões entre vendedores | 6h | TransferService |
| Implementar histórico imutável de transferências | 4h | TransferService |
| Implementar relatórios de transferências | 4h | TransferService |
| Implementar endpoints de transferências | 4h | TransferService |
| **Frontend - Gamificação** | | |
| Criar GamificationDashboard (pontos, ranking) | 8h | API Gamification |
| Implementar RankingList com filtros | 6h | Dashboard |
| Implementar BadgesList | 4h | Dashboard |
| Implementar PointsHistory | 4h | Dashboard |
| **Frontend - Automações** | | |
| Criar AutomationBuilder (interface visual) | 10h | API Automations |
| Implementar TriggerSelector | 4h | Builder |
| Implementar ActionSelector | 4h | Builder |
| Implementar FieldMapping (origem → destino) | 6h | Builder |
| Criar AutomationList (gerenciar automações) | 6h | API Automations |
| **Frontend - Transferências** | | |
| Criar TransferModal (transferir cartão) | 6h | API Transfers |
| Implementar seleção de vendedor destino | 4h | Modal |
| Criar TransferHistory (histórico) | 6h | API Transfers |
| Criar TransferTimeline (linha do tempo) | 4h | History |

**Entregáveis**:
- ✅ Sistema de gamificação completo (pontos, rankings, badges)
- ✅ Sistema de automações funcional (criar, executar, gerenciar)
- ✅ Sistema de transferências com histórico imutável
- ✅ Dashboards e interfaces para todos os módulos

---

### SEMANA 10: Processamento Assíncrono

**Objetivo**: Implementar infraestrutura de processamento assíncrono (job queue e cron jobs)

#### Tarefas da Semana

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| **Backend - Job Queue e Workers** | | |
| Configurar pg-boss (job queue com PostgreSQL) | 4h | PostgreSQL |
| Implementar automationWorker.ts | 6h | AutomationService |
| Implementar jobs de automação (execute, retry) | 6h | Worker |
| Implementar retry strategy (exponential backoff) | 4h | Jobs |
| Implementar tratamento de falhas permanentes | 4h | Jobs |
| **Backend - Cron Jobs** | | |
| Configurar node-cron | 2h | - |
| Implementar cronJobs.ts | 4h | - |
| Implementar atualização de rankings (5 min) | 2h | GamificationService |
| Implementar reset de rankings (semanal, mensal) | 3h | GamificationService |
| Implementar notificações de cartões vencidos (diário) | 3h | NotificationService |
| Implementar limpeza de logs (diário) | 2h | AuditService |
| Implementar backup de banco (diário) | 3h | Database |
| Implementar monitoramento de cron jobs | 3h | Logging |

**Entregáveis**:
- ✅ Bull/BullMQ job queue configurado
- ✅ Workers para automações
- ✅ 10 cron jobs configurados e monitorados

---

## 5. EQUIPE E RESPONSABILIDADES

| Papel | Responsável | Horas/Semana | Responsabilidades |
|------|-------------|--------------|-------------------|
| **Desenvolvedor Full-Stack** | Desenvolvedor Interno | 40h | Arquitetura, backend, frontend, DevOps, testes |

**Total**: 40 horas/semana (1 pessoa)

**Observações**:
- Desenvolvedor interno acumula todas as funções (Backend, Frontend, DevOps, QA)
- Possível apoio pontual de stakeholders para testes de usabilidade e validação
- Cronograma ajustado para refletir capacidade de 1 desenvolvedor

---

### SEMANA 11: Testes Finais, Deploy e Treinamento

**Objetivo**: Testes completos, deploy em produção e treinamento de usuários

#### Tarefas da Semana

| Tarefa | Duração | Dependência |
|--------|---------|-------------|
| **Testes** | | |
| Testes de integração (API + DB) | 8h | Todas as features |
| Testes de ponta a ponta (E2E) | 8h | Frontend completo |
| Testes de performance (carga com 3.200 cartões) | 6h | Kanban |
| Testes de segurança (JWT, RBAC, SQL injection) | 6h | Auth + Admin |
| Testes de usabilidade com stakeholders | 4h | UI completa |
| Correção de bugs críticos encontrados | 12h | Testes |
| **Deploy** | | |
| Preparar ambiente de produção (Hostinger VPS) | 4h | VPS access |
| Configurar Easypanel | 2h | Ambiente |
| Build de imagens Docker (api + frontend) | 2h | Dockerfiles |
| Deploy da API no Easypanel | 2h | Docker images |
| Deploy do Frontend no Easypanel | 2h | Docker images |
| Configurar SSL/TLS (Let's Encrypt) | 2h | Domínio |
| Configurar backups automáticos (PostgreSQL) | 2h | Database |
| Configurar monitoramento e alertas | 3h | Produção |
| Testes em produção (smoke tests) | 4h | Deploy completo |
| **Migração de Dados** | | |
| Exportar dados do Pipedrive (CSV) | 2h | Pipedrive access |
| Validar e limpar dados exportados | 3h | CSV |
| Importar dados via interface de importação | 4h | Import feature |
| Validar integridade dos dados importados | 3h | Dados importados |
| **Treinamento e Documentação** | | |
| Preparar documentação de usuário (vendedor) | 4h | Sistema completo |
| Preparar documentação de administrador | 4h | Admin features |
| Gravar vídeos tutoriais (opcional) | 4h | Documentação |
| Sessão de treinamento com vendedores | 4h | Documentação |
| Sessão de treinamento com gerentes | 2h | Documentação |
| Sessão de treinamento com administrador | 2h | Documentação |
| Preparar FAQ e troubleshooting guide | 2h | Dúvidas comuns |

**Entregáveis**:
- ✅ Todos os testes passando (integração, E2E, performance, segurança)
- ✅ Sistema em produção (Hostinger VPS via Easypanel)
- ✅ SSL/TLS configurado
- ✅ Backups automáticos configurados
- ✅ Dados do Pipedrive migrados e validados
- ✅ Documentação completa (usuário + admin)
- ✅ Todos os stakeholders treinados
- ✅ Sistema em uso e monitorado

---

## 6. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|------|--------------|--------|----------|
| Atraso no desenvolvimento | Alta | Alto | Priorização de features core, MVP approach |
| Perda de dados na migração | Baixa | Crítico | Backups, testes de importação, validação em staging |
| Performance com muitos cartões (3.200+) | Média | Médio | Otimização de queries, indexação, cache node-cache, lazy loading |
| Mudanças de requisitos | Alta | Médio | Documentação clara, validações semanais com stakeholders |
| Indisponibilidade da VPS | Baixa | Alto | Monitoramento 24/7, alertas, backups automáticos |
| Bugs em produção | Média | Médio | Testes E2E, testes de integração, code review |
| Falta de conhecimento técnico (1 dev) | Média | Alto | Documentação detalhada, comunidades online, POCs antes de implementar |
| Falhas em automações críticas | Média | Médio | Retry automático, job queue com backoff, logs detalhados |
| Sobrecarga do worker de jobs | Baixa | Médio | Monitoramento de fila, múltiplos workers se necessário |
| Complexidade de gamificação/automações | Alta | Médio | Implementação incremental, testes com usuários reais |

---

## 7. CRITÉRIOS DE SUCESSO POR SPRINT

### Sprint 1 (Semana 1)
- ✅ Repositórios configurados e funcionando
- ✅ Ambiente Docker pronto
- ✅ Schema Prisma inicial criado
- ✅ Projeto React configurado

### Sprint 2 (Semana 2)
- ✅ Autenticação JWT funcional
- ✅ RBAC implementado
- ✅ Página de login funcional
- ✅ Cobertura de testes > 80%

### Sprint 3 (Semana 3)
- ✅ CRUD de quadros e listas funcional
- ✅ Dashboard com listagem de quadros
- ✅ Página de detalhe do quadro
- ✅ Sem bugs críticos

### Sprint 4 (Semana 4)
- ✅ Campos customizados funcional
- ✅ CRUD de cartões funcional
- ✅ Kanban com drag-and-drop
- ✅ Modal de detalhe do cartão

### Sprint 5 (Semana 5)
- ✅ Importação de CSV funcional
- ✅ API de importação funcional
- ✅ Busca e filtros funcionais
- ✅ Visualizações salvas funcionais

### Sprint 6 (Semana 6)
- ✅ Dashboard de KPIs funcional
- ✅ Gráficos de vendas funcional
- ✅ Sistema de auditoria funcional
- ✅ Página de logs funcional

### Sprint 7 (Semana 7)
- ✅ Visualização em Lista funcional
- ✅ Visualização em Calendário funcional
- ✅ Notificações funcionais
- ✅ Distribuição em rodízio funcional

### Sprint 8 (Semana 8)
- ✅ Painel de administração funcional
- ✅ Gestão de usuários e permissões completa
- ✅ SQL direto com validação de segurança
- ✅ Interface de execução de queries funcional

### Sprint 9 (Semana 9)
- ✅ Sistema de gamificação completo (pontos, rankings, badges)
- ✅ Sistema de automações funcional (criar, executar, gerenciar)
- ✅ Sistema de transferências com histórico imutável
- ✅ Dashboards para todos os 3 módulos

### Sprint 10 (Semana 10)
- ✅ Bull/BullMQ job queue configurado e testado
- ✅ Workers para automações funcionando
- ✅ 10 cron jobs configurados e monitorados

### Sprint 11 (Semana 11)
- ✅ Todos os testes passando (integração, E2E, performance, segurança)
- ✅ Deploy em produção bem-sucedido (Hostinger VPS)
- ✅ Dados do Pipedrive migrados e validados
- ✅ Documentação completa
- ✅ Todos os stakeholders treinados
- ✅ Sistema em uso e monitorado

---

## 8. DEPENDÊNCIAS EXTERNAS

- ✅ Acesso à VPS Hostinger
- ✅ Acesso ao Easypanel
- ✅ Dados do Pipedrive (CSV)
- ✅ Credenciais de email (SendGrid/SMTP)
- ✅ Credenciais de S3 (ou MinIO)

---

## 9. COMUNICAÇÃO

**Stakeholders**:
- Gerente de Vendas (semanal)
- Administrador IT (diário)
- Equipe de Desenvolvimento (diário)

**Canais**:
- Email: Comunicação formal
- Slack: Comunicação rápida
- Reuniões: Planejamento e review

---

---

**Versão**: 3.0
**Data**: 11 de Dezembro 2025
**Status**: Completo

