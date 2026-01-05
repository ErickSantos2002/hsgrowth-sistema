# 01 - VISÃO GERAL E ESCOPO DO PROJETO

## 1. IDENTIFICAÇÃO DO PROJETO

| Atributo | Descrição |
|----------|-----------|
| **Nome do Projeto** | HSGrowth CRM - Sistema de Gerenciamento de Relacionamento com Clientes |
| **Sigla** | HSGrowth |
| **Versão** | 1.0 |
| **Data de Criação** | Dezembro 2025 |
| **Status** | Pré-Desenvolvimento |
| **Gerente de Projeto** | [A Definir] |

---

## 2. OBJETIVO GERAL

Desenvolver um **Sistema CRM (Customer Relationship Management) proprietário** que permita à empresa gerenciar de forma centralizada e eficiente o relacionamento com clientes, oportunidades de vendas e dados de contatos. O sistema deve oferecer flexibilidade através de campos customizáveis, múltiplas visualizações de dados (Kanban, Lista, Calendário), integração com fontes externas de leads e geração de relatórios/KPIs para análise de desempenho.

---

## 3. OBJETIVOS ESPECÍFICOS

1. **Substituir Pipedrive Completamente**: Criar alternativa interna com funcionalidades específicas da empresa e migração total dos dados
2. **Importar Dados Existentes**: Facilitar migração de dados do Pipedrive e outras fontes
3. **Centralizar Informações**: Consolidar dados de clientes, pessoas, organizações, produtos e atividades em um único lugar
4. **Flexibilizar Campos**: Permitir customização completa de campos por quadro
5. **Visualizar Dados**: Oferecer múltiplas formas de visualização (Kanban, Lista, Calendário)
6. **Automatizar Distribuição**: Distribuir leads em rodízio entre vendedores via API
7. **Automatizar Processos**: Criar automações entre quadros com triggers e actions personalizados
8. **Gamificar Vendas**: Implementar sistema de pontos, rankings e badges para motivar vendedores
9. **Rastrear Transferências**: Permitir transferência de cartões entre vendedores com histórico completo
10. **Gerar Insights**: Produzir relatórios e KPIs para análise de vendas
11. **Integrar Sistemas**: Conectar com site próprio, RDStation, WhatsApp, ligações e outras fontes

---

## 4. ESCOPO DO PROJETO

### 4.1 O que está INCLUÍDO no escopo

**Funcionalidades Core:**
- Gestão de contas com sistema de roles e permissões granulares
- Criação e gerenciamento de quadros (boards) customizáveis
- Visualizações em Kanban, Lista e Calendário
- Sistema de campos customizáveis por quadro (15+ tipos de campos)
- Criação, edição, exclusão e movimentação de cartões
- Busca e filtros avançados em cartões
- Importação de dados via CSV/Excel do Pipedrive
- Integração via API para recebimento de leads
- Distribuição automática de cartões em rodízio entre vendedores
- Transferência de cartões entre vendedores com rastreamento completo
- Geração de relatórios e KPIs
- Dashboard administrativo para visualização de dados
- Exportação de dados em múltiplos formatos (CSV, Excel, JSON)
- Sistema robusto de auditoria e logs
- Autenticação JWT (Login/Senha para vendedores, Client ID/Secret para integrações)

**Automações:**
- Criação de automações entre quadros com triggers (gatilhos) e actions (ações)
- Triggers: cartão criado, movido, atualizado
- Actions: mover, copiar, criar cartão, enviar notificação
- Mapeamento de campos entre quadros diferentes
- Histórico de execuções de automações

**Gamificação:**
- Sistema de pontos por ações realizadas (configurável)
- Rankings periódicos (semanal, mensal, trimestral, anual)
- Badges e conquistas para vendedores
- Dashboard de gamificação individual
- Parabenizações automáticas ao avançar cartões
- Pontuação em cadeia para transferências de cartões

**Infraestrutura:**
- Banco de dados PostgreSQL
- API RESTful com documentação
- Frontend em React + TypeScript + TailwindCSS
- Containerização com Docker
- Deployment em VPS Hostinger com Easypanel

### 4.2 O que está FORA do escopo

- Integração com Pipedrive em tempo real (apenas importação manual inicial)
- Aplicativo mobile nativo (apenas web responsivo)
- Videoconferência integrada
- Sistema de CRM para múltiplas empresas (SaaS)
- Customização de interface por usuário
- Machine Learning ou IA para previsões
- Integração com outros CRMs do mercado
- Suporte multilíngue (apenas português)

### 4.3 Premissas

- A empresa utilizará o sistema apenas internamente
- Máximo de 10 usuários simultâneos no início, escalável para mais
- Volume atual no Pipedrive: ~3.200 cartões, ~3.000 pessoas, ~3.000 organizações (com expectativa de crescimento significativo)
- Dados existentes no Pipedrive serão exportados manualmente em CSV/Excel
- Infraestrutura de hospedagem já está disponível (Hostinger + Easypanel)
- Equipe de desenvolvimento conhece React, TypeScript, Python e PostgreSQL

### 4.4 Restrições

- Cronograma: 2 meses para desenvolvimento completo
- Orçamento: Desenvolvimento interno (sem custos adicionais de mão de obra e ferramentas já licenciadas)
- Identificadores: Usar IDs sequenciais (sem UUID)
- Autenticação: JWT com dois fluxos (vendedores e integrações)
- Hospedagem: Docker em VPS Hostinger
- Repositórios: Separados (`hsgrowth-api` e `hsgrowth-sistema`)

---

## 5. JUSTIFICATIVA DO PROJETO

### 5.1 Problemas Atuais

O uso do Pipedrive como CRM externo apresenta limitações:
- Custos recorrentes de licença por usuário
- Campos limitados ou inflexíveis para necessidades específicas
- Dificuldade em customizar fluxos de vendas
- Falta de integração direta com sistemas internos
- Impossibilidade de controlar dados sensíveis internamente
- Limitações em relatórios e KPIs customizados

### 5.2 Benefícios Esperados

- **Redução de Custos**: Eliminar licenças do Pipedrive
- **Flexibilidade**: Customização total de campos e fluxos
- **Controle**: Dados armazenados internamente
- **Integração**: Conexão direta com sistemas próprios
- **Escalabilidade**: Crescimento conforme necessidade
- **Propriedade Intelectual**: Sistema desenvolvido internamente
- **Produtividade**: Automações reduzem trabalho manual repetitivo
- **Motivação**: Gamificação aumenta engajamento dos vendedores
- **Transparência**: Rastreamento completo de transferências e responsabilidades

---

## 6. STAKEHOLDERS

| Stakeholder | Papel | Responsabilidades |
|-------------|-------|------------------|
| Gerente de Vendas | Patrocinador | Validar requisitos, aprovar releases |
| Vendedores | Usuários Finais | Utilizar o sistema diariamente |
| Administrador IT | Gestor de Infraestrutura | Deploy, manutenção, segurança |
| Gerente de Projeto | Coordenador | Planejamento, acompanhamento, comunicação |
| Equipe de Desenvolvimento | Executores | Desenvolvimento, testes, documentação |
| Empresas de Marketing Parceiras | Integradores API | Enviar leads automaticamente via API |

---

## 7. ENTREGAS ESPERADAS

### 7.1 Documentação (Pré-Desenvolvimento)

1. Visão Geral e Escopo do Projeto ✓
2. Requisitos Funcionais Detalhados
3. Requisitos Não Funcionais
4. Casos de Uso e Histórias de Usuário
5. Mapeamento de Processos e Fluxogramas
6. Modelo de Banco de Dados (ER/UML)
7. Regras de Negócio e Validações
8. Arquitetura Técnica
9. Plano de Implementação e Cronograma
10. Especificação de API

### 7.2 Desenvolvimento

- Código-fonte da API (`hsgrowth-api`)
- Código-fonte do Sistema (`hsgrowth-sistema`)
- Dockerfile e docker-compose.yml
- Documentação de API (Swagger/OpenAPI)
- Testes automatizados (unitários e integração)
- Manual de usuário
- Guia de instalação e deployment

### 7.3 Infraestrutura

- Imagens Docker prontas para produção
- Scripts de deployment
- Configuração de banco de dados
- Backup e disaster recovery

---

## 8. CRITÉRIOS DE SUCESSO

O projeto será considerado bem-sucedido quando:

1. ✅ Todos os requisitos funcionais forem implementados e testados
2. ✅ Sistema estiver em produção na VPS Hostinger
3. ✅ Dados do Pipedrive forem importados com sucesso
4. ✅ Todos os vendedores conseguirem acessar e usar o sistema
5. ✅ Relatórios e KPIs forem gerados corretamente
6. ✅ Integração com API externas funcionar conforme especificado
7. ✅ Sistema suportar 10+ usuários simultâneos sem degradação
8. ✅ Documentação completa e atualizada
9. ✅ Taxa de uptime acima de 99%

---

## 9. RISCOS IDENTIFICADOS

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|--------|-----------|
| Atraso no desenvolvimento | Média | Alto | Planejamento rigoroso, sprints curtas |
| Perda de dados na migração | Baixa | Crítico | Backups, testes de importação, validação |
| Performance com muitos cartões | Média | Médio | Otimização de queries, indexação, cache |
| Mudanças de requisitos | Alta | Médio | Documentação clara, validações frequentes |
| Indisponibilidade da VPS | Baixa | Alto | Monitoramento, alertas, plano de contingência |
| Complexidade das automações | Média | Médio | Testes extensivos, modo de teste antes de ativar |
| Resistência à gamificação | Baixa | Baixo | Sistema opcional, configurável por vendedor |

---

## 10. CRONOGRAMA DE ALTO NÍVEL

| Fase | Duração | Período |
|------|---------|---------|
| Documentação e Planejamento | 1 semana | Semana 1 |
| Desenvolvimento Backend | 3 semanas | Semanas 2-4 |
| Desenvolvimento Frontend | 3 semanas | Semanas 2-4 |
| Testes e Integração | 1 semana | Semana 5 |
| Deploy e Treinamento | 1 semana | Semana 6 |
| Ajustes e Otimizações | 1 semana | Semana 7-8 |
| **Total** | **8 semanas (2 meses)** | |

---

## 11. ORÇAMENTO (Referência)

| Item | Descrição | Custo Estimado |
|------|-----------|-----------------|
| Desenvolvimento | 8 semanas x 40h/semana | Interno |
| Infraestrutura | VPS Hostinger + Easypanel | ~R$ 50-100/mês |
| Ferramentas | Licenças de desenvolvimento | Existentes |
| **Total** | | **Interno** |

---

## 12. APROVAÇÕES

| Papel | Nome | Data | Assinatura |
|------|------|------|-----------|
| Gerente de Projeto | | | |
| Patrocinador | | | |
| Gerente de Desenvolvimento | | | |

---

**Versão**: 1.0  
**Data**: Dezembro 2025  
**Status**: Aguardando Aprovação
