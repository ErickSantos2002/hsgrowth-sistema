# Histórico de Desenvolvimento - HSGrowth CRM

**Versão:** 1.0.0
**Data de Lançamento:** 29/01/2026
**Status:** Em Produção

---

## 📋 Visão Geral

Este documento consolida o histórico de desenvolvimento do HSGrowth CRM, documentando os marcos importantes, problemas técnicos resolvidos, decisões arquiteturais e lições aprendidas durante o projeto.

---

## 🗓️ Linha do Tempo

### Dezembro 2025 - Planejamento e Documentação

#### 08/12/2025 - Início do Projeto
**Marco:** Análise e organização da documentação inicial

**Mudanças importantes:**
- Renomeação oficial: TurbohS CRM → **HSGrowth CRM**
- Decisão de substituir o Pipedrive completamente (não parcial)
- Identificação de novas features críticas

**Features planejadas adicionais:**
- **Gamificação avançada** (pontos, rankings, badges)
- **Transferência de cartões com rastreamento** (histórico imutável e comissão em cadeia)
- **Automações entre quadros** (sistema genérico, substituindo fluxo hard-coded de pós-venda)
- Sincronização bidirecional com Pipedrive
- WhatsApp com histórico completo

**Decisão arquitetural importante:**
- ❌ NÃO criar módulo de pós-venda fixo/hard-coded
- ✅ Criar sistema de automações genérico (mais flexível e profissional)

#### 11/12/2025 - Revisão Completa da Documentação
**Marco:** Atualização de todos os 10 documentos técnicos

**Atualizações realizadas:**
- Adicionados 45 novos requisitos funcionais
- 8 novas tabelas no modelo de banco de dados
- Documentação expandida para ~186 requisitos totais
- Cronograma ajustado: 8-9 semanas → 10-11 semanas

**Novos módulos adicionados:**
- Módulo 18: Gamificação (RF-180 a RF-189)
- Módulo 19: Automações (RF-190 a RF-199)
- Módulo 20: Transferência de Cartões (RF-200 a RF-209)

---

### Janeiro 2026 - Desenvolvimento Backend

#### 07/01/2026 - Correções de Infraestrutura

**Problema crítico resolvido:** Import incorreto do `get_db`
- **Causa:** `conftest.py` importava `get_db` de `app.db.session`, mas endpoints usavam de `app.api.deps`
- **Impacto:** 100% dos testes falhavam com 401 Unauthorized
- **Solução:** Corrigido import em `tests/conftest.py` linha 15
- **Resultado:** 20 testes passando instantaneamente 🎉

**Problema resolvido:** Event loop closed
- **Causa:** APScheduler interferia com o event loop async dos testes
- **Solução:**
  - Adicionada fixture `event_loop` para criar novo loop por teste
  - Desabilitado scheduler durante testes (`ENVIRONMENT=testing`)
  - Configurado `pytest.ini` com `asyncio_mode = auto`
- **Resultado:** Zero erros de event loop ✅

**Lição aprendida:** Sempre verificar se override de dependencies está sendo aplicado na função correta.

#### 08/01/2026 - 100% dos Testes Passando

**Marco:** Backend completo com todos os testes funcionando
- **Status inicial:** 62/78 testes (79.5%)
- **Status final:** 78/78 testes (100%) 🏆

**Correções principais:**

1. **Auth Module:** Ajustados status codes (403 → 401 para requisições sem token)

2. **Users Module:**
   - Adicionado eager loading com `joinedload(User.role)` nas fixtures
   - Corrigido lazy loading que causava `None` ao acessar `user.role.name`

3. **Cards Module:**
   - Field validators para converter Decimal → Float
   - Field validators para converter Integer → Boolean (0/1 → False/True)
   - Flag `is_done_stage=True` adicionada à lista "Ganho"

4. **Gamification Module:**
   - Adicionado campo `account_id` ao modelo `GamificationRanking`
   - Criada migration para adicionar campo e popular dados
   - Corrigidos nomes de campos inconsistentes

**Arquivos de migrations criados:**
- `2026_01_08_1316-add_account_id_to_gamification_rankings.py`

#### 09/01/2026 - Remoção de Multi-Tenancy (Backend)

**Marco:** Sistema convertido de multi-tenant para single-tenant

**Motivação:** Simplificação da arquitetura (sistema será usado por apenas uma empresa)

**Mudanças realizadas:**
- Removido campo `account_id` de 20 tabelas
- Banco recriado do zero (clean slate)
- 137 cards de teste populados
- Controle de acesso migrado para sistema de Roles (admin, manager, salesperson)

**Impacto positivo:**
- Código mais simples e limpo
- Melhor performance (menos JOINs)
- Manutenção mais fácil

#### 10/01/2026 - Remoção de Multi-Tenancy (Frontend)

**Marco:** Frontend atualizado para single-tenant
- Tempo investido: ~50 minutos
- **15 interfaces atualizadas** (removido `account_id`)
- **Interface `Account` deletada** completamente
- Services já estavam corretos (rotas sem `/accounts/:accountId/`)

**Resultado:** Backend e Frontend 100% compatíveis ✅

---

### Janeiro 2026 - Desenvolvimento Frontend

#### 12/01/2026 - Fase 1: Autenticação

**Marco:** Sistema de autenticação completo
- Página de Login com validação
- Integração com API `/api/v1/auth/login`
- Gerenciamento de tokens (access + refresh)
- Protected routes com PrivateRoute
- Context API para autenticação global
- Interceptor Axios para refresh token automático
- Design responsivo com Tailwind CSS

#### 13/01/2026 - Fase 2: Boards + Feature de Personalização Visual

**Marco:** Sistema de Boards completo com CRUD

**Feature principal: Personalização Visual** 🎨
- Seletor de cor (color picker + input hex)
- Seletor de ícone (10 opções: Grid, Target, TrendingUp, Users, Briefcase, FolderKanban, Lightbulb, Rocket, Star, Heart)
- BoardCard mostra ícone colorido e borda na cor escolhida
- Shadow colorido para destacar boards

**Correção técnica importante:**
- Criada migration `2026_01_13_1600-add_color_icon_to_boards.py`
- Adicionados campos `color` e `icon` no backend completo (modelo, schemas, repository, service, endpoints)
- Sincronização manual de arquivos para container Docker

**Bug corrigido:** Duplicação de board mantém nome original (não mais "Board {id} - Cópia")

#### 15/01/2026 - Fases 3, 4 e 5

**Marco:** 3 fases implementadas em uma sessão (~5.200 linhas de código)

**Fase 3 - Kanban Board (~90% completo):**
- Sistema completo de drag-and-drop com @dnd-kit
- Gestão de listas e cards
- Busca global funcional
- Painel de filtros (UI pronta)
- Layout horizontal com scroll suave
- **Total:** ~1.822 linhas

**Fase 4 - Card Details (100% completo):**
- **Decisão estratégica:** Modal → Página completa (`/cards/:cardId`)
  - **Motivo:** Cards são a parte mais importante de um CRM, URLs compartilháveis, melhor UX
- Layout 2 colunas com sticky header
- Edição inline (modo view/edit)
- **Total:** ~700 linhas

**Fase 5 - Clientes (~95% implementado, não testado):**
- Frontend completo (947 linhas)
- Backend completo (1.333 linhas)
- Máscaras brasileiras (CPF, CNPJ, telefone)
- 5 endpoints REST criados
- **Status:** Código pronto mas não validado (problemas com servidor background)

**Lições aprendidas:**
1. Página vs Modal: Página é superior para funcionalidade principal
2. Sempre verificar estrutura real no PostgreSQL antes de implementar
3. Backend cache: Matar processos antes de testar
4. Máscaras brasileiras: Detecta tamanho e aplica máscara automaticamente

#### 22/01/2026 - Fase 12: Sistema de Notificações

**Marco:** Sistema de notificações completo (~1.390 linhas)

**Frontend:**
- Badge no header com contador
- Dropdown com últimas 10 notificações não lidas
- Página completa com filtros e paginação
- Polling a cada 30 segundos
- Atualização automática ao detectar novas notificações
- 12 tipos de notificações com ícones

**Backend:**
- 4 endpoints adicionados
- Schemas com `serialization_alias` para compatibilidade
- Scripts de seed e teste

**Problemas resolvidos:**
- Campos incompatíveis (backend: `notification_type`, frontend: `type`)
- Solução: `serialization_alias` nos schemas Pydantic

#### 29/01/2026 - Lançamento em Produção 🚀

**Marco:** v1.0.0 oficialmente em produção!

**Melhorias finais de UX e permissões:**

**1. Filtro de Vendedor no Kanban:**
- Admin/Manager: Pode selecionar qualquer vendedor
- Salesperson: Filtro travado no próprio ID (não pode mudar)
- Regra de negócio: Vendedor só vê próprios cards

**2. Correção Completa dos Filtros:**
- Reescrita da função `filterCards()` para aplicar TODOS os filtros:
  - Busca por termo (título, descrição, contato)
  - Filtro por lista
  - Filtro por vendedor (assigned_to_id)
  - Filtro por faixa de valor (R$ 0-1k, 1k-5k, 5k-10k, 10k+)
  - Filtro por data de vencimento (atrasados, hoje, semana, mês)

**3. Movimentação de Listas:**
- Adicionadas setas ← → para reordenar listas
- Lógica condicional (primeira/última/meio)
- Bug corrigido: Enviava posição da lista vizinha (não índice do array)

**4. Parser Inteligente de Notas (HTML do WhatsApp):**
- Componente `NoteRenderer.tsx` criado
- Detecta automaticamente HTML vs texto simples
- Extrai mensagens, autores, horários e imagens
- Renderiza em formato de chat organizado
- Sanitiza HTML (previne XSS)
- Lazy loading de imagens com fallback

**5. MainLayout - Item "Boards" Ativo em Sub-rotas:**
- Mantém destaque em `/boards`, `/boards/:id` e `/cards/:id`

**6. Restrições para Vendedores:**
- **Settings:** Email desabilitado para vendedores, aba Segurança oculta
- **Reports e Automations:** Ocultos no menu + proteção na página
- **Estrutura de permissões:**
  - Camada 1: UX (menu oculto)
  - Camada 2: Segurança (página bloqueia acesso direto via URL)

**Padrões estabelecidos:**

```typescript
// Verificação de role
const isAdmin = user?.role === "admin";
const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

// Proteção de página
if (!isManagerOrAdmin) {
  return (
    <div className="p-6">
      <Shield size={64} className="mx-auto text-red-400" />
      <h2>Acesso Restrito</h2>
      <p>Apenas administradores e gerentes podem acessar esta página.</p>
    </div>
  );
}

// Campo desabilitado
disabled={user?.role === "salesperson"}

// Menu - ocultação condicional
if (item.managerOrAdminOnly && user?.role === "salesperson") {
  return null;
}
```

**Importação do Pipedrive:**
- **2.366 organizações**
- **4.043 pessoas**
- **4.512 deals**
- **1.583 leads**
- **11.915 notas**
- **10.601 atividades**
- **61 produtos**

---

## 🎯 Decisões Arquiteturais Importantes

### 1. Multi-tenant → Single-tenant
**Quando:** 09/01/2026
**Decisão:** Remover sistema multi-tenant completamente
**Motivo:** Sistema será usado por apenas uma empresa, multi-tenancy adicionava complexidade desnecessária
**Impacto:** Código mais simples, melhor performance, manutenção mais fácil

### 2. Automações Genéricas vs Pós-venda Hard-coded
**Quando:** 08/12/2025
**Decisão:** Criar sistema de automações genérico ao invés de módulo de pós-venda fixo
**Motivo:** Muito mais flexível e profissional
**Impacto:** Sistema pode ser adaptado para diversos fluxos de trabalho

### 3. Card Details: Página vs Modal
**Quando:** 15/01/2026
**Decisão:** Implementar como página completa ao invés de modal
**Motivo:** Cards são a parte mais importante de um CRM, páginas permitem URLs compartilháveis, melhor UX
**Impacto:** Melhor experiência do usuário, mais espaço para informações

### 4. Sistema de Permissões em Duas Camadas
**Quando:** 29/01/2026
**Decisão:** Implementar proteção tanto no menu (UX) quanto na página (segurança)
**Motivo:** UX limpa + segurança contra acesso direto via URL
**Impacto:** Sistema mais seguro e interface mais limpa

---

## 🐛 Problemas Críticos Resolvidos

### 1. Import Incorreto do get_db (07/01/2026)
**Sintoma:** 100% dos testes falhavam com 401 Unauthorized
**Causa:** Override de dependency não funcionava (importando de lugar errado)
**Solução:** Corrigir import em `conftest.py` para usar `from app.api.deps import get_db`
**Lição:** Sempre verificar se override está sendo aplicado na função correta

### 2. Event Loop Closed (07/01/2026)
**Sintoma:** 97 testes com erro "RuntimeError: Event loop is closed"
**Causa:** APScheduler interferia com event loop async dos testes
**Solução:**
- Fixture `event_loop` para criar novo loop por teste
- Desabilitar scheduler durante testes (`ENVIRONMENT=testing`)
**Lição:** Schedulers e tarefas async precisam ser desabilitados durante testes

### 3. Lazy Loading de Relationships (08/01/2026)
**Sintoma:** `user.role.name` retornava `None`
**Causa:** Fixtures não carregavam relacionamento `role`
**Solução:** Adicionado `joinedload(User.role)` nas fixtures
**Lição:** Sempre usar eager loading em relacionamentos que serão acessados

### 4. Tipos Incompatíveis (Decimal e Integer) (08/01/2026)
**Sintoma:** Testes esperavam float mas recebiam string "5000.00"
**Causa:** PostgreSQL retorna Decimal, não float
**Solução:** Field validators no schema para converter tipos
**Lição:** Sempre converter tipos no schema para garantir consistência

### 5. Movimentação de Listas - Posição Incorreta (29/01/2026)
**Sintoma:** Lista pulava posições ao mover
**Causa:** Código enviava índice do array (0, 1, 2...) mas backend esperava valor do campo `position`
**Solução:** Enviar `targetList.position` ao invés de `currentIndex + 1`
**Lição:** Diferenciar índice de array vs valor do campo position

### 6. Round-Robin State Não Persistia (02/02/2026)
**Sintoma:** Rodízio de vendedores sempre começava do primeiro
**Causa:** SQLAlchemy não detecta mudanças em campos JSONB automaticamente
**Solução:** Usar `flag_modified(automation, "state")` após alterar JSONB
**Lição:** Campos JSONB precisam de `flag_modified()` para marcar como alterados

---

## 📊 Estatísticas Finais do Projeto

### Desenvolvimento

**Período de desenvolvimento:** 08/12/2025 - 29/01/2026 (~7 semanas)

**Código:**
- **Backend:** ~18.000 linhas de código Python
- **Frontend:** ~15.000+ linhas de código TypeScript/React
- **Total:** ~33.000+ linhas de código

**Arquivos:**
- **~90 arquivos de código** (backend + frontend)
- **23 migrations** do Alembic
- **14 documentos técnicos** completos

**Testes:**
- **78 testes unitários** no backend (100% passando)
- **Cobertura:** 100% dos módulos principais

**Commits:** ~200+ commits

### Banco de Dados

**Tabelas:** 20 tabelas principais
- Users, Roles, Accounts
- Boards, Lists, Cards
- Clients, People, Organizations
- Products, CardProducts
- FieldDefinitions, FieldValues
- Activities, Notes, Attachments
- Gamification (Points, Badges, Rankings)
- Automations, AutomationExecutions
- CardTransfers
- Notifications

**Dados importados do Pipedrive:**
- 2.366 organizações
- 4.043 pessoas
- 4.512 deals
- 1.583 leads
- 11.915 notas
- 10.601 atividades
- 61 produtos

### Stack Tecnológica

**Backend:**
- Python 3.11 + FastAPI
- PostgreSQL 15
- Redis 7 (cache)
- SQLAlchemy + Alembic
- Docker + Docker Compose
- Pytest

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- React Router v6
- Axios
- Context API
- React Beautiful DnD / @dnd-kit

**Deploy:**
- Docker/Easypanel
- Nginx (reverse proxy)
- SSL/HTTPS (Let's Encrypt)

---

## 💡 Lições Aprendidas

### Arquitetura

1. **Simplicidade é melhor:** Remover multi-tenancy tornou o código muito mais simples e fácil de manter
2. **Padrão Repository:** Facilita testes e separa lógica de acesso a dados
3. **Service Layer:** Centraliza regras de negócio e validações
4. **Eager Loading:** Crítico para performance, sempre usar `joinedload()` quando necessário
5. **Dependency Injection:** FastAPI tem excelente sistema de DI, usar corretamente é essencial

### Testes

1. **Fixtures reutilizáveis:** Economizam muito tempo
2. **Isolamento de testes:** Cada teste deve ser independente
3. **Testes devem usar IDs numéricos:** Não strings
4. **Validações no service:** Não no endpoint
5. **Override de dependencies:** Verificar se está sendo aplicado na função correta

### Banco de Dados

1. **Migrations versionadas:** Usar Alembic com cuidado
2. **Verificar estrutura real:** Sempre consultar PostgreSQL antes de implementar
3. **Índices desde o início:** Preparar para crescimento
4. **Soft delete:** Melhor que hard delete para auditoria
5. **JSONB precisa de flag_modified():** Para persistir mudanças

### Frontend

1. **TypeScript é essencial:** Previne muitos bugs
2. **Context API suficiente:** Para state management simples
3. **Máscaras brasileiras:** Sempre remover antes de enviar ao backend
4. **Página vs Modal:** Página é melhor para funcionalidade principal
5. **Polling pode ser eficiente:** 30 segundos é bom balanço

### Desenvolvimento

1. **Documentação é crucial:** Documentar decisões e problemas
2. **Commits frequentes:** Facilita rollback e debugging
3. **Testar localmente primeiro:** Nunca fazer push direto pra produção
4. **Migrations devem ser testadas:** Em banco de desenvolvimento primeiro
5. **Código em inglês, comentários em português:** Mantém consistência

---

## 🏆 Marcos e Conquistas

### Dezembro 2025
- ✅ Projeto iniciado e planejado
- ✅ 14 documentos técnicos completos
- ✅ ~186 requisitos funcionais documentados

### Janeiro 2026 - Backend
- ✅ Setup completo do projeto (Docker, PostgreSQL, Redis)
- ✅ 20 tabelas criadas com 23 migrations
- ✅ 78 testes unitários (100% passando)
- ✅ Sistema single-tenant implementado
- ✅ API completa com documentação Swagger

### Janeiro 2026 - Frontend
- ✅ 6 fases principais implementadas
- ✅ Sistema de autenticação completo
- ✅ Boards com personalização visual
- ✅ Kanban com drag-and-drop
- ✅ Card Details página completa
- ✅ Sistema de notificações com polling

### 29 de Janeiro 2026 - PRODUÇÃO 🚀
- ✅ v1.0.0 lançada oficialmente
- ✅ Sistema estável e funcional
- ✅ Dados do Pipedrive importados com sucesso
- ✅ Permissões por role implementadas
- ✅ UX polida e profissional

---

## 🔮 Futuro (Roadmap Executado)

Este documento captura o histórico até a v1.0.0. Para roadmap futuro, consulte:
- `TODO.md` - Planejamento geral
- `TODO - Automações.md` - Sistema de automações
- `TODO - Integração API4COM.md` - Integração VOIP
- `CHANGELOG.md` - Histórico de releases

---

## 📞 Referências

**Documentação técnica completa:**
- `01 - VISÃO GERAL E ESCOPO DO PROJETO.md`
- `02_Requisitos_Funcionais.md`
- `06_Modelo_Banco_de_Dados.md`
- `08 - ARQUITETURA TÉCNICA.md`
- `10 - ESPECIFICAÇÃO DE API.md`

**Guias práticos:**
- `README.md` - Visão geral e instalação
- `DESENVOLVIMENTO.md` - Workflow de desenvolvimento
- `GUIA-DESENVOLVIMENTO-LOCAL.md` - Como rodar localmente

**Implementações específicas:**
- `AUTOMAÇÕES - Implementação.md` - Sistema de automações
- `API4COM_Integração.md` - Integração VOIP

---

**Documento criado em:** 04/02/2026
**Versão:** 1.0
**Consolidado de:** 13 arquivos de resumos de sessões e status
**Próxima atualização:** Quando lançar v1.1.0

---

## 🙏 Agradecimentos

Projeto desenvolvido por **Erick** (Cientista de Dados e Desenvolvedor Full Stack) com assistência de **Claude Code (Sonnet 4.5)** da Anthropic.

Sistema desenvolvido para **HSGrowth** como alternativa proprietária ao Pipedrive.

---

**Copyright © 2026 HSGrowth. Todos os direitos reservados.**
