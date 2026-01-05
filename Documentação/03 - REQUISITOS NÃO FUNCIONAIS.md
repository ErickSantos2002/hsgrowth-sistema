# 03 - REQUISITOS NÃO FUNCIONAIS

## 1. INTRODUÇÃO

Este documento especifica os requisitos não funcionais do sistema HSGrowth CRM. Os requisitos não funcionais definem qualidades, características e restrições do sistema que não estão diretamente relacionadas às funcionalidades, mas são críticas para o sucesso do projeto.

---

## 2. PERFORMANCE

### RNF-001: Tempo de Resposta da API

**Descrição**: A API deve responder em tempo aceitável para proporcionar boa experiência ao usuário.

**Especificação**:
- Endpoints de leitura: < 200ms (p95)
- Endpoints de escrita: < 500ms (p95)
- Endpoints de importação: < 2s por 100 registros
- Busca em 3.200 cartões: < 500ms
- Filtros com múltiplos critérios: < 1s

**Métrica**: Monitorar com APM (Application Performance Monitoring)

---

### RNF-002: Tempo de Carregamento da Interface

**Descrição**: A interface deve carregar rapidamente.

**Especificação**:
- Carregamento inicial da página: < 3s
- Carregamento de quadro com 500 cartões: < 2s
- Carregamento de quadro com 3.200 cartões: < 4s (performance mantida)
- Transição entre visualizações: < 1s
- Renderização de 100 cartões no Kanban: < 500ms
- Visualização Kanban mantém performance com até 3.200 cartões

**Métrica**: Usar Lighthouse, WebPageTest

---

### RNF-003: Escalabilidade Horizontal

**Descrição**: Sistema deve suportar crescimento de usuários e dados.

**Especificação**:
- API deve ser stateless para permitir múltiplas instâncias
- Suportar até 100 usuários simultâneos (fase inicial: 10)
- Suportar até 100.000 cartões sem degradação de performance (fase inicial: 3.200)
- Suportar até 50.000 pessoas (fase inicial: 3.000)
- Suportar até 50.000 organizações (fase inicial: 3.000)
- Suportar até 1.000 automações ativas
- Suportar até 100 vendedores no sistema de gamificação
- Suportar até 50.000 transferências no histórico
- Banco de dados deve ser escalável (PostgreSQL com replicação)

**Métrica**: Testes de carga com ferramentas como JMeter, k6

---

### RNF-004: Otimização de Queries

**Descrição**: Queries ao banco de dados devem ser otimizadas.

**Especificação**:
- Uso de índices apropriados
- Evitar N+1 queries
- Usar paginação para grandes resultados
- Cache de dados frequentemente acessados
- Lazy loading de relacionamentos

**Métrica**: Monitorar com ferramentas de profiling (pg_stat_statements)

---

### RNF-005: Performance de Automações

**Descrição**: Execução de automações deve ser rápida e não bloquear operações.

**Especificação**:
- Automações executam de forma assíncrona (não bloqueante)
- Processamento de trigger: < 100ms
- Execução de action: < 500ms
- Fila de automações para processamento em background
- Retry automático em caso de falha (máximo 3 tentativas)
- Timeout de 30s por automação
- Limite de 50 automações ativas por conta (trigger + scheduled)

**Métrica**: Monitorar tempo de execução, taxa de sucesso/falha

---

### RNF-006: Performance de Gamificação

**Descrição**: Cálculo de pontos e rankings deve ser eficiente.

**Especificação**:
- Cálculo de pontos: síncrono, < 50ms
- Recálculo de ranking: assíncrono, executado a cada 5 minutos
- Cache de rankings (5 minutos de TTL)
- Suportar até 100 vendedores sem degradação
- Histórico de pontos mantido por até 2 anos
- Dashboard de gamificação carrega em < 1s

**Métrica**: Monitorar tempo de cálculo, performance de queries de ranking

---

### RNF-007: Performance de Transferências

**Descrição**: Transferências e rastreamento devem ser rápidos.

**Especificação**:
- Transferência de cartão: < 200ms
- Consulta de histórico de transferências: < 300ms
- Cálculo de comissão em cadeia: < 100ms
- Suportar até 10.000 transferências no histórico sem degradação
- Relatórios de transferência: < 2s

**Métrica**: Monitorar tempo de transferência, performance de queries

---

## 3. SEGURANÇA

### RNF-010: Autenticação Robusta

**Descrição**: Sistema deve implementar autenticação segura.

**Especificação**:
- JWT com algoritmo HS256 ou RS256
- Tokens com expiração (24h para usuários, 1h para API)
- Refresh tokens com expiração maior (7 dias)
- Senhas com hash bcrypt (salt rounds: 12)
- Rate limiting em endpoints de login (5 tentativas por 15 minutos)
- Implementar CAPTCHA após 3 tentativas falhas

**Métrica**: Testes de segurança, code review

---

### RNF-011: Autorização Granular

**Descrição**: Sistema deve implementar controle de acesso granular.

**Especificação**:
- RBAC (Role-Based Access Control) com roles: Admin, Gerente, Vendedor, Visualizador
- Permissões por ação: create, read, update, delete, export, import
- Isolamento de dados: vendedor vê apenas seus cartões
- Admin vê tudo
- Verificação de permissão em cada endpoint
- Logs de acesso negado

**Métrica**: Testes de autorização, penetration testing

---

### RNF-012: Criptografia de Dados

**Descrição**: Dados sensíveis devem ser criptografados.

**Especificação**:
- Dados em trânsito: HTTPS/TLS 1.2+
- Dados em repouso: criptografia de campos sensíveis (emails, documentos, etc.)
- Algoritmo: AES-256
- Chaves de criptografia armazenadas em variáveis de ambiente
- Backup de chaves em local seguro

**Métrica**: Auditorias de segurança

---

### RNF-013: Proteção contra Ataques Comuns

**Descrição**: Sistema deve estar protegido contra ataques comuns.

**Especificação**:
- SQL Injection: usar prepared statements, ORM
- XSS: sanitizar inputs, usar Content Security Policy
- CSRF: implementar CSRF tokens
- CORS: configurar whitelist de origens
- Rate limiting: prevenir brute force e DDoS
- Validação de entrada em todos os endpoints
- Sanitização de saída

**Métrica**: OWASP Top 10 compliance, security scanning

---

### RNF-014: Auditoria e Logs de Segurança

**Descrição**: Todas as ações devem ser registradas para auditoria.

**Especificação**:
- Log de todas as alterações (create, update, delete)
- Log de acessos (login, logout, acesso negado)
- Log de ações administrativas
- Logs não podem ser deletados ou alterados
- Retenção de logs: mínimo 1 ano
- Logs armazenados em tabela separada com integridade garantida
- Alertas para atividades suspeitas

**Métrica**: Auditoria de logs, compliance

---

### RNF-015: Conformidade com GDPR/LGPD

**Descrição**: Sistema deve estar em conformidade com regulamentações de privacidade.

**Especificação**:
- Direito ao esquecimento: deletar dados de usuário (incluindo histórico de transferências, pontuação, badges)
- Portabilidade de dados: exportar dados em formato padrão (JSON/CSV)
- Dados pessoais coletados: nome, email, telefone, documentos, histórico de ações, pontuação de gamificação, histórico de transferências
- Consentimento: registrar consentimento para coleta de dados
- Política de privacidade clara especificando uso de gamificação e rastreamento
- Notificação de brechas de segurança em até 72 horas
- Vendedor pode optar por não participar de gamificação pública (dados mantidos apenas para admin)
- Histórico de transferências é imutável para integridade do sistema, mas pode ser anonimizado

**Métrica**: Compliance audit, legal review

---

## 4. CONFIABILIDADE

### RNF-020: Disponibilidade

**Descrição**: Sistema deve estar disponível para uso.

**Especificação**:
- Uptime mínimo: 99% (8.76 horas de downtime por ano)
- Objetivo: 99.5% (4.38 horas por ano)
- Monitoramento 24/7
- Alertas automáticos para falhas
- Plano de contingência para falhas críticas
- Redundância de componentes críticos

**Métrica**: Monitorar com ferramentas como Datadog, New Relic

---

### RNF-021: Backup e Disaster Recovery

**Descrição**: Sistema deve ter backup regular e plano de recuperação.

**Especificação**:
- Backup diário do banco de dados
- Backup incremental a cada 6 horas
- Retenção de backups: mínimo 30 dias
- Backup armazenado em local geográfico diferente
- Teste de restauração: mensal
- RTO (Recovery Time Objective): < 1 hora
- RPO (Recovery Point Objective): < 1 hora
- Documentação de plano de disaster recovery

**Métrica**: Testes de backup, simulações de desastre

---

### RNF-022: Tratamento de Erros

**Descrição**: Sistema deve tratar erros graciosamente.

**Especificação**:
- Mensagens de erro claras para usuário
- Logs detalhados de erros para debug
- Retry automático para falhas transitórias
- Fallback para dados em cache se possível
- Notificação de erro para admin
- Página de erro customizada (não stack trace)

**Métrica**: Monitoramento de erros com Sentry, LogRocket

---

### RNF-023: Integridade de Dados

**Descrição**: Dados devem manter integridade em todas as operações.

**Especificação**:
- Transações ACID para operações críticas
- Constraints de integridade referencial
- Validação de dados em múltiplas camadas
- Detecção de corrupção de dados
- Testes de integridade regulares
- Versionamento de dados para rollback

**Métrica**: Testes de integridade, data validation tests

---

## 5. USABILIDADE

### RNF-030: Interface Intuitiva

**Descrição**: Interface deve ser fácil de usar.

**Especificação**:
- Design consistente em todas as páginas
- Navegação clara e lógica
- Feedback visual para ações do usuário
- Undo/Redo para ações reversíveis
- Tooltips para funcionalidades complexas
- Onboarding para novos usuários
- Documentação in-app

**Métrica**: Testes de usabilidade, user feedback

---

### RNF-031: Responsividade

**Descrição**: Interface deve funcionar em diferentes tamanhos de tela.

**Especificação**:
- Design responsivo para: desktop (1920px), tablet (768px), mobile (375px)
- Touch-friendly em dispositivos móveis
- Testes em navegadores: Chrome, Firefox, Safari, Edge
- Testes em dispositivos: iPhone, iPad, Android
- Performance em conexões lentas (3G)

**Métrica**: Testes em múltiplos dispositivos, Lighthouse

---

### RNF-032: Acessibilidade

**Descrição**: Interface deve ser acessível para todos os usuários.

**Especificação**:
- Conformidade WCAG 2.1 nível AA
- Suporte a leitores de tela (NVDA, JAWS)
- Navegação por teclado
- Contraste de cores adequado (WCAG AA)
- Alt text para imagens
- Labels para formulários
- Sem piscar > 3 vezes por segundo

**Métrica**: Testes de acessibilidade, Axe DevTools

---

### RNF-033: Localização e Idioma

**Descrição**: Interface deve suportar múltiplos idiomas.

**Especificação**:
- Suporte inicial: Português (Brasil)
- Estrutura preparada para adicionar idiomas
- Datas e números formatados conforme locale
- Mensagens de erro traduzidas

**Métrica**: Testes de localização

---

## 6. MANUTENIBILIDADE

### RNF-040: Código Limpo e Documentado

**Descrição**: Código deve ser fácil de manter e entender.

**Especificação**:
- Seguir padrões de código (ESLint, Prettier)
- Nomes significativos para variáveis, funções, classes
- Funções pequenas e com responsabilidade única
- Comentários para lógica complexa
- Documentação de APIs (Swagger/OpenAPI)
- README com instruções de setup
- Changelog mantido

**Métrica**: Code review, SonarQube

---

### RNF-041: Versionamento e Controle de Código

**Descrição**: Código deve ser versionado e controlado.

**Especificação**:
- Git com repositórios separados (hsgrowth-api, hsgrowth-sistema)
- Branches: main (produção), develop (desenvolvimento), feature/* (features)
- Commits com mensagens descritivas
- Pull requests com code review obrigatório
- Tags para releases
- Histórico de commits completo

**Métrica**: Git log, commit analysis

---

### RNF-042: Testes Automatizados

**Descrição**: Sistema deve ter testes automatizados.

**Especificação**:
- Testes unitários: cobertura > 80%
- Testes de integração: endpoints críticos
- Testes de ponta a ponta (E2E): fluxos principais
- Testes de performance: endpoints críticos
- Testes de segurança: OWASP Top 10
- CI/CD pipeline com testes automáticos
- Testes executados antes de cada merge

**Métrica**: Coverage reports, test results

---

### RNF-043: Logging e Monitoramento

**Descrição**: Sistema deve ter logging e monitoramento adequados.

**Especificação**:
- Logs estruturados em JSON
- Níveis de log: DEBUG, INFO, WARN, ERROR, FATAL
- Logs centralizados (ELK Stack, Datadog, etc.)
- Métricas de negócio: cartões criados, importações, etc.
- Métricas técnicas: CPU, memória, disco, latência
- Alertas para anomalias
- Dashboard de monitoramento

**Métrica**: Log analysis, monitoring dashboards

---

### RNF-044: Documentação

**Descrição**: Sistema deve ser bem documentado.

**Especificação**:
- Documentação de arquitetura
- Documentação de API (Swagger/OpenAPI)
- Guia de instalação e setup
- Guia de deployment
- Manual de usuário
- Troubleshooting guide
- Documentação de banco de dados (ER diagram)
- Documentação de fluxos de negócio

**Métrica**: Documentation completeness

---

## 7. COMPATIBILIDADE

### RNF-050: Compatibilidade de Navegadores

**Descrição**: Sistema deve funcionar em navegadores modernos.

**Especificação**:
- Chrome (últimas 2 versões)
- Firefox (últimas 2 versões)
- Safari (últimas 2 versões)
- Edge (últimas 2 versões)
- Suporte a ES6+
- Polyfills para funcionalidades antigas se necessário

**Métrica**: Testes em múltiplos navegadores, BrowserStack

---

### RNF-051: Compatibilidade de Banco de Dados

**Descrição**: Sistema deve funcionar com PostgreSQL.

**Especificação**:
- PostgreSQL 12+
- Usar features padrão SQL
- Evitar features específicas de PostgreSQL se possível
- Migrations para atualizações de schema
- Suporte a replicação e failover

**Métrica**: Testes com diferentes versões do PostgreSQL

---

### RNF-052: Compatibilidade de Infraestrutura

**Descrição**: Sistema deve funcionar em Docker.

**Especificação**:
- Dockerfile para API e Frontend
- docker-compose.yml para desenvolvimento
- Suportar Docker em Linux
- Imagens otimizadas (multi-stage builds)
- Volumes para persistência de dados
- Variáveis de ambiente para configuração

**Métrica**: Testes de deployment com Docker

---

## 8. ESCALABILIDADE

### RNF-060: Escalabilidade de Dados

**Descrição**: Sistema deve escalar com crescimento de dados.

**Especificação**:
- Suportar até 100.000 cartões
- Suportar até 50.000 pessoas
- Suportar até 50.000 organizações
- Suportar até 1.000.000 de logs de auditoria
- Suportar até 50.000 transferências no histórico
- Suportar até 10.000 execuções de automações
- Suportar até 1.000.000 de registros de pontuação
- Particionamento de dados se necessário
- Arquivamento de dados antigos (rankings com mais de 2 anos)
- Limpeza de dados obsoletos (logs com mais de 1 ano em arquivo)

**Métrica**: Testes de carga com dados crescentes

---

### RNF-061: Escalabilidade de Usuários

**Descrição**: Sistema deve escalar com crescimento de usuários.

**Especificação**:
- Suportar até 100 usuários simultâneos
- Suportar até 1.000 usuários totais
- Balanceamento de carga entre instâncias da API
- Cache distribuído (Redis)
- Sessões distribuídas
- Filas de processamento assíncrono

**Métrica**: Testes de carga com múltiplos usuários

---

### RNF-062: Escalabilidade de Infraestrutura

**Descrição**: Infraestrutura deve escalar facilmente.

**Especificação**:
- Containers Docker para fácil deployment
- Orquestração com Docker Compose (desenvolvimento) ou Kubernetes (produção)
- Variáveis de ambiente para configuração
- Suporte a múltiplas instâncias da API
- Load balancer (nginx, HAProxy)
- Auto-scaling baseado em CPU/memória

**Métrica**: Testes de escalabilidade de infraestrutura

---

## 9. CONFORMIDADE E REGULAMENTAÇÕES

### RNF-070: Conformidade com Padrões de Código

**Descrição**: Código deve seguir padrões estabelecidos.

**Especificação**:
- Backend: Black (formatação Python), Flake8/Ruff (linting), mypy (type checking)
- Frontend: ESLint (JavaScript/TypeScript), Prettier (formatação)
- SonarQube para análise de qualidade (ambos)
- Code review obrigatório
- Testes antes de merge

**Métrica**: SonarQube reports, linting results

---

### RNF-071: Conformidade com Regulamentações

**Descrição**: Sistema deve estar em conformidade com regulamentações aplicáveis.

**Especificação**:
- LGPD (Lei Geral de Proteção de Dados)
- GDPR (se aplicável)
- Políticas de privacidade claras
- Consentimento para coleta de dados
- Direito ao esquecimento
- Portabilidade de dados

**Métrica**: Legal review, compliance audit

---

## 10. RESTRIÇÕES TÉCNICAS

### RNF-080: Identificadores de Dados

**Descrição**: Sistema deve usar IDs sequenciais, não UUIDs.

**Especificação**:
- Usar BIGINT auto-increment para IDs primários
- IDs sequenciais para melhor performance
- Índices em IDs para queries rápidas
- Evitar UUIDs para reduzir tamanho de índices

**Métrica**: Schema review, performance testing

---

### RNF-081: Stack Tecnológico

**Descrição**: Sistema deve usar stack definido.

**Especificação**:
- Frontend: React 18+, TypeScript, TailwindCSS, Vite
- Backend: Python 3.11+, FastAPI, PostgreSQL
- Autenticação: JWT
- Containerização: Docker
- Hospedagem: VPS Hostinger com Easypanel

**Métrica**: Technology stack compliance

---

### RNF-082: Cronograma

**Descrição**: Projeto deve ser entregue no prazo.

**Especificação**:
- Documentação e Planejamento: 1 semana
- Desenvolvimento Backend (incluindo Automações, Gamificação, Transferências): 3 semanas
- Desenvolvimento Frontend (incluindo Automações, Gamificação, Transferências): 3 semanas
- Testes e Integração: 1 semana
- Deploy e Treinamento: 1 semana
- Ajustes e Otimizações: 1-2 semanas
- **Total**: 8-9 semanas (2 meses)

**Métrica**: Project timeline tracking, sprint velocity

---

---

**Versão**: 1.0  
**Data**: Dezembro 2025  
**Status**: Completo

