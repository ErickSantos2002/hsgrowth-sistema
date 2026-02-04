# Changelog - HSGrowth CRM

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.1.0] - 2026-02-04

### ✨ Novas Funcionalidades

#### Sistema de Logs de Auditoria
- **Backend**: Sistema completo de auditoria para rastreamento de todas as ações no sistema
- **33 tipos de logs** distribuídos em 9 módulos:
  - **Autenticação** (3): LOGIN, LOGOUT, FAILED_LOGIN
  - **Usuários** (6): CREATE, UPDATE, DELETE, PASSWORD_CHANGE, ACTIVATE, DEACTIVATE
  - **Cards/Leads** (5): CREATE, UPDATE, DELETE, STATUS_CHANGE, TRANSFER
  - **Boards** (3): CREATE, UPDATE, DELETE
  - **Tarefas** (4): CREATE, UPDATE, COMPLETE, DELETE
  - **Comentários** (4): CREATE, UPDATE, DELETE (cards e tarefas)
  - **Badges** (4): CREATE, UPDATE, DELETE, AWARD
  - **Pontos de Gamificação** (3): CREATE, UPDATE, TOGGLE
  - **API4COM/VOIP** (5): CONFIG_CREATE, CONFIG_UPDATE, CONFIG_TEST, EXTENSION_CREATE, EXTENSION_DELETE
- **Endpoint de consulta** (`/api/v1/audit-logs`):
  - Paginação completa
  - Filtros por: usuário, ação, tipo de entidade, período (data inicial/final)
  - Endpoints auxiliares para popular filtros (actions, entity-types)
- **Registro automático** de: usuário, IP, user-agent, timestamp, descrição da ação
- **Permissões**: Apenas Admin pode visualizar logs completos

#### Interface de Logs de Auditoria
- **Nova aba "Logs de Auditoria"** na página de Configurações
- Visível apenas para Admin e Manager
- **Funcionalidades**:
  - Visualização dos últimos 100 logs com paginação local (20 por página)
  - Filtros por ação, tipo de entidade e período
  - Tabela com informações detalhadas: data/hora, usuário, ação, entidade, descrição, IP
  - Design responsivo e consistente com o sistema

#### Histórico de Logins Melhorado
- Endpoint `/api/v1/auth/login-history` agora mostra **todos os logins** do sistema para Admin/Manager
- Corrigido para não filtrar apenas logins do usuário atual
- Aba "Segurança" agora exibe logins de todos os usuários

### 🐛 Correções

#### Sidebar
- Corrigido scroll horizontal ao minimizar sidebar
- Adicionado `overflow-hidden` nos containers
- Ajustado padding dinâmico baseado no estado (expandida/minimizada)
- Logo redimensiona automaticamente quando minimizada

#### Autenticação e Cache
- **Corrigido problema crítico de cache** entre usuários diferentes
- Ao fazer logout e login com outro usuário, o sistema agora:
  - Força reload completo da página
  - Limpa todo o estado do React
  - Reseta todos os componentes
  - Previne que usuário veja permissões/dados de outro usuário
- Implementado `window.location.href` ao invés de navegação SPA no login/logout

#### Timezone de Logins
- Adicionado sufixo 'Z' em timestamps UTC para interpretação correta no frontend
- Corrigido display de "Agora" permanente no histórico de logins

### 🔧 Melhorias Técnicas

#### Backend
- Model `AuditLog` com campos: user_id, action, entity_type, entity_id, description, ip_address, user_agent, created_at
- Captura automática de IP e User-Agent em todos os endpoints auditados
- Join otimizado com tabela User para exibir nome/email nos logs
- Ordenação por data (mais recentes primeiro)

#### Frontend
- Novo service `auditLogService` com métodos para buscar logs e opções de filtro
- Estados gerenciados para paginação local
- Componentes reutilizáveis mantendo padrão visual do sistema

### 📝 Documentação

- Atualizado CHANGELOG com todas as funcionalidades implementadas
- Código bem comentado em português (conforme padrão do projeto)
- Docstrings completas em todos os endpoints

---

## [1.0.0] - 2026-01-29

### 🚀 PRIMEIRA VERSÃO EM PRODUÇÃO

Esta é a primeira versão oficial do HSGrowth CRM em ambiente de produção!

### ✨ Funcionalidades Principais

#### Módulo de Boards (Kanban)
- Criação e gerenciamento de boards personalizados
- Sistema de listas (colunas) com reordenação via drag-and-drop
- Cards com informações completas de contato e negócio
- Movimentação de cards entre listas
- Filtros por responsável, status (ganho/perdido)
- Visualização otimizada com lazy loading

#### Módulo de Cards (Negócios)
- Informações de contato estruturadas (nome, email, telefone, LinkedIn)
- Informações de pagamento e condições comerciais
- Vinculação com clientes/organizações
- Sistema de responsáveis (assigned_to)
- Campos customizados via JSON
- Histórico de atividades
- Sistema de notas
- Gerenciamento de produtos vinculados
- Controle de valor e data de vencimento

#### Módulo de Clientes
- Cadastro completo de organizações
- Informações fiscais (CNPJ, inscrição estadual)
- Múltiplos contatos de comunicação
- Endereço completo
- Vinculação com negócios

#### Módulo de Produtos
- Catálogo de produtos/serviços
- Controle de preço e SKU
- Vinculação com cards/negócios

#### Sistema de Usuários
- Autenticação JWT
- Controle de permissões por perfil (admin, vendedor, visualizador)
- Gestão de equipes
- Dashboard personalizado por usuário

#### Importação de Dados
- Importação completa do Pipedrive via CSV
- Suporte para:
  - 2.366 organizações
  - 4.043 pessoas
  - 4.512 deals (negócios)
  - 1.583 leads
  - 11.915 notas
  - 10.601 atividades
  - 61 produtos

### 🔧 Melhorias Técnicas

#### Performance
- Eager loading para eliminar problema N+1 em queries
- Paginação otimizada em todas as listagens
- Modo "minimal" para listagens de cards (payload 60% menor)
- Índices otimizados no banco de dados
- Cache de sessões

#### Banco de Dados
- PostgreSQL 15 com todas as tabelas principais
- Sistema de migrations com Alembic
- Constraints e validações a nível de banco
- Backup automatizado

#### Infraestrutura
- Deploy via Docker/Easypanel
- PostgreSQL como banco principal
- Redis para cache (opcional)
- Nginx como reverse proxy
- SSL/HTTPS configurado

#### API
- FastAPI com documentação automática (Swagger)
- Validação de dados com Pydantic
- Tratamento de erros padronizado
- CORS configurado
- Rate limiting

#### Frontend
- React 18 com TypeScript
- Tailwind CSS para estilização
- React Router para navegação
- Axios para chamadas HTTP
- Context API para gerenciamento de estado
- React Beautiful DnD para drag-and-drop

### 🐛 Correções

- Corrigido validador de telefone para aceitar múltiplos números separados por vírgula
- Corrigido timeout ao carregar boards com muitos cards (3.789+)
- Corrigido problema de migrations do Alembic
- Corrigido encoding no script de inicialização (start.sh)
- Corrigido problema de duplicação de registros na importação

### 📝 Documentação

- Documentação técnica completa na pasta `Documentação/`
- README com instruções de instalação
- Guia de desenvolvimento local
- Especificação de API
- Dicionário de dados

### ⚠️ Breaking Changes

Nenhum (primeira versão).

### 🔒 Segurança

- Autenticação JWT com tokens seguros
- Senhas com hash bcrypt
- Validação de inputs em todos os endpoints
- Proteção contra SQL Injection
- CORS configurado corretamente

---

## 📌 Notas Importantes

### A partir desta versão (v1.0.0):

1. **Ambiente de Produção Ativo**: Todas as mudanças devem ser testadas localmente antes do deploy
2. **Migrations**: Sempre criar migrations do Alembic para mudanças no banco
3. **Backward Compatibility**: Evitar breaking changes sempre que possível
4. **Versionamento**: Seguir Semantic Versioning (MAJOR.MINOR.PATCH)
5. **Changelog**: Documentar todas as mudanças neste arquivo

### Próximos Passos (v1.1.0)

- [ ] Módulo de relatórios e dashboards
- [ ] Automações de funil
- [ ] Integração com WhatsApp
- [ ] Envio de emails diretamente do CRM
- [ ] Sistema de gamificação completo
- [ ] Módulo de leads com funil próprio
- [ ] Sincronização bidirecional com Pipedrive

---

## Formato de Versionamento

- **MAJOR** (X.0.0): Mudanças incompatíveis com versões anteriores
- **MINOR** (0.X.0): Novas funcionalidades compatíveis com versões anteriores
- **PATCH** (0.0.X): Correções de bugs compatíveis com versões anteriores

## Tags Git

Cada versão deve ter uma tag correspondente no Git:
```bash
git tag -a v1.0.0 -m "Versão 1.0.0 - Primeira versão em produção"
git push origin v1.0.0
```
