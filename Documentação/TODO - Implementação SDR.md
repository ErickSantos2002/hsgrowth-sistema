# TODO - Implementação do Role SDR

**Data de Criação**: 2026-02-04
**Versão Alvo**: 1.2.0
**Status**: Planejamento

---

## 📋 Resumo da Funcionalidade

Implementar o papel de SDR (Sales Development Representative) no sistema, com boards separados, atribuição dupla de responsáveis nos cards e integração com sistema de automações.

### Regras de Negócio Definidas:

1. **Card pode ter**:
   - Apenas vendedor (campo existente: `assigned_to`)
   - Apenas SDR (campo novo: `sdr_assigned_to`)
   - Ambos (vendedor + SDR)
   - Nenhum (campos null)

2. **Atribuição automática de vendedor**:
   - Quando SDR move card para lista específica
   - Usa sistema de automações existente
   - Atribui vendedor automaticamente baseado em regras

3. **Separação de Boards**:
   - SDR vê apenas boards de SDR
   - Vendedor vê apenas boards de vendedor
   - Admin/Manager veem todos

4. **Pontos/Gamificação**:
   - Deixar em stand by por enquanto
   - Será definido posteriormente

---

## 🎯 Fase 1: Backend - Estrutura Base

### 1.1. Model User - Adicionar Role SDR
- [ ] Atualizar enum de roles em `app/models/user.py`
  - Adicionar `"sdr"` nas opções de role
- [ ] Criar migration para permitir novo valor
- [ ] Atualizar validações de role em schemas
- [ ] Testar criação de usuário com role SDR

**Arquivos afetados**:
- `backend/app/models/user.py`
- `backend/app/schemas/user.py`
- Nova migration do Alembic

---

### 1.2. Model Card - Adicionar SDR Responsável
- [ ] Adicionar campo `sdr_assigned_to` (Integer, FK para users.id, nullable=True)
- [ ] Adicionar relationship `sdr_user` (similar ao `assigned_user`)
- [ ] Criar migration para adicionar coluna
- [ ] Atualizar índices (adicionar índice em `sdr_assigned_to`)

**Arquivos afetados**:
- `backend/app/models/card.py`
- Nova migration do Alembic

---

### 1.3. Model Board - Separação por Tipo
- [ ] **Opção A**: Adicionar campo `board_type` (enum: "sales", "sdr")
- [ ] **Opção B**: Usar lógica baseada no `owner_id` (verificar role do owner)
- [ ] Decidir qual abordagem usar
- [ ] Implementar campo/lógica escolhida
- [ ] Criar migration se necessário

**Arquivos afetados**:
- `backend/app/models/board.py`
- Possível nova migration

---

### 1.4. Schemas - Atualizar DTOs
- [ ] `CardCreate`: Adicionar `sdr_assigned_to` (opcional)
- [ ] `CardUpdate`: Adicionar `sdr_assigned_to` (opcional)
- [ ] `CardResponse`: Incluir dados do SDR (id, nome, email)
- [ ] `CardMinimal`: Incluir `sdr_assigned_to` básico
- [ ] Validação: SDR deve ter role "sdr"

**Arquivos afetados**:
- `backend/app/schemas/card.py`

---

### 1.5. Endpoints de Cards - Suportar SDR
- [ ] `POST /cards`: Aceitar `sdr_assigned_to`
- [ ] `PUT /cards/{id}`: Aceitar `sdr_assigned_to`
- [ ] `GET /cards`: Retornar dados do SDR
- [ ] `GET /cards/{id}`: Incluir relationship do SDR
- [ ] Validar que `sdr_assigned_to` é um usuário com role "sdr"
- [ ] Adicionar filtro `?sdr_id=` para listar cards por SDR

**Arquivos afetados**:
- `backend/app/api/v1/endpoints/cards.py`
- `backend/app/services/card_service.py` (se existir)

---

### 1.6. Endpoints de Boards - Filtrar por Tipo
- [ ] `GET /boards`: Filtrar boards baseado no role do usuário
  - SDR vê apenas boards de SDR
  - Vendedor vê apenas boards de vendedor
  - Admin/Manager veem todos
- [ ] Implementar lógica de filtragem no service
- [ ] Testar permissões

**Arquivos afetados**:
- `backend/app/api/v1/endpoints/boards.py`

---

### 1.7. Automações - Atribuição Automática de Vendedor
- [ ] Verificar sistema de automações existente
- [ ] Criar tipo de ação: "Atribuir Vendedor"
- [ ] Implementar lógica de atribuição (round-robin, específico, etc.)
- [ ] Configurar automação padrão para quando SDR move card
- [ ] Testar fluxo completo

**Arquivos afetados**:
- `backend/app/api/v1/endpoints/automations.py`
- `backend/app/models/automation.py` (verificar)
- `backend/app/workers/automation_executor.py` (verificar)

---

### 1.8. Logs de Auditoria - Registrar Ações de SDR
- [ ] Logs ao atribuir SDR a um card
- [ ] Logs ao remover SDR de um card
- [ ] Logs de ações específicas de SDR (quando definidas)

**Arquivos afetados**:
- `backend/app/api/v1/endpoints/cards.py`

---

## 🎨 Fase 2: Frontend - Interface

### 2.1. Types - Atualizar Interfaces
- [ ] Adicionar `sdr_assigned_to` em `Card` interface
- [ ] Adicionar dados do SDR (id, name, email, etc.)
- [ ] Atualizar `User` type com role "sdr"

**Arquivos afetados**:
- `frontend/src/types/index.ts`

---

### 2.2. Formulário de Card - Campo SDR
- [ ] Adicionar campo "SDR Responsável" no formulário de criação
- [ ] Adicionar campo "SDR Responsável" no formulário de edição
- [ ] Buscar lista de usuários com role "sdr"
- [ ] Select/Dropdown para escolher SDR
- [ ] Permitir campo vazio (null)
- [ ] Visual: Distinguir visualmente Vendedor vs SDR

**Arquivos afetados**:
- `frontend/src/components/cards/CardModal.tsx` (ou similar)
- `frontend/src/components/cards/CardForm.tsx` (verificar estrutura)

---

### 2.3. Visualização de Card - Mostrar SDR
- [ ] Exibir SDR responsável no card (se houver)
- [ ] Mostrar avatar/nome do SDR
- [ ] Diferenciar visualmente Vendedor e SDR
- [ ] Card detail: Seção com ambos responsáveis

**Arquivos afetados**:
- `frontend/src/components/cards/CardDetail.tsx`
- `frontend/src/pages/BoardView.tsx`
- CSS/Tailwind para badges diferenciadas

---

### 2.4. Boards - Filtrar por Tipo de Usuário
- [ ] Verificar role do usuário logado
- [ ] Se SDR: Mostrar apenas boards de SDR
- [ ] Se Vendedor: Mostrar apenas boards de vendedor
- [ ] Se Admin/Manager: Mostrar todos
- [ ] Ajustar chamada à API com filtros
- [ ] Testar permissões no frontend

**Arquivos afetados**:
- `frontend/src/pages/Boards.tsx`
- `frontend/src/services/boardService.ts`

---

### 2.5. Dashboard - Métricas para SDR
- [ ] Identificar métricas específicas de SDR
- [ ] Criar cards de métricas para SDR:
  - Cards atribuídos como SDR
  - Reuniões agendadas (quando implementado)
  - Taxa de conversão SDR → Vendedor
- [ ] Adaptar dashboard baseado no role

**Arquivos afetados**:
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/services/reportService.ts`

---

### 2.6. Filtros - Adicionar Filtro por SDR
- [ ] Adicionar filtro "SDR Responsável" nas listagens de cards
- [ ] Dropdown com lista de SDRs
- [ ] Aplicar filtro na API
- [ ] Limpar filtros

**Arquivos afetados**:
- `frontend/src/pages/BoardView.tsx`
- Componentes de filtro

---

### 2.7. Configurações de Usuário - Role SDR
- [ ] Adicionar "SDR" nas opções ao criar/editar usuário
- [ ] Validação no frontend
- [ ] Apenas Admin pode criar SDR

**Arquivos afetados**:
- `frontend/src/pages/Users.tsx`
- `frontend/src/components/users/UserForm.tsx` (verificar)

---

## 🧪 Fase 3: Testes e Validações

### 3.1. Testes Backend
- [ ] Criar usuário com role SDR
- [ ] Criar card com SDR atribuído
- [ ] Criar card com vendedor e SDR
- [ ] Mover card entre listas (trigger automação)
- [ ] Verificar logs de auditoria
- [ ] Testar permissões de boards (SDR só vê boards de SDR)
- [ ] Testar filtros por SDR

---

### 3.2. Testes Frontend
- [ ] Login como SDR
- [ ] Verificar que vê apenas boards de SDR
- [ ] Criar/editar card como SDR
- [ ] Atribuir SDR a um card
- [ ] Verificar dashboard de SDR
- [ ] Testar filtros
- [ ] Responsividade mobile

---

### 3.3. Testes de Integração
- [ ] Fluxo completo: SDR cria lead → move para lista → automação atribui vendedor
- [ ] Vendedor recebe card atribuído
- [ ] Logs registrados corretamente
- [ ] Notificações (se aplicável)

---

## 📝 Fase 4: Documentação

### 4.1. Atualizar Documentação Técnica
- [ ] Atualizar modelo de dados (ERD)
- [ ] Documentar novo campo `sdr_assigned_to`
- [ ] Atualizar especificação de API
- [ ] Documentar fluxo de automação SDR → Vendedor

**Arquivos a atualizar**:
- `Documentação/06_Modelo_Banco_de_Dados.md`
- `Documentação/10 - ESPECIFICAÇÃO DE API.md`

---

### 4.2. Atualizar CHANGELOG
- [ ] Adicionar seção v1.2.0 com todas as mudanças
- [ ] Documentar breaking changes (se houver)
- [ ] Listar novas funcionalidades

**Arquivo**:
- `Documentação/CHANGELOG.md`

---

### 4.3. Guia de Uso (Opcional)
- [ ] Criar guia de como usar o role SDR
- [ ] Explicar fluxo de trabalho SDR → Vendedor
- [ ] Capturas de tela (opcional)

---

## 🚀 Fase 5: Deploy

### 5.1. Preparação
- [ ] Revisar todas as migrations
- [ ] Backup do banco de dados de produção
- [ ] Testar migrations em ambiente local
- [ ] Build do frontend sem erros

---

### 5.2. Deploy Backend
- [ ] Rodar migrations em produção
- [ ] Reiniciar containers
- [ ] Verificar logs
- [ ] Testar endpoints

---

### 5.3. Deploy Frontend
- [ ] Build de produção
- [ ] Deploy no Easypanel
- [ ] Verificar se carregou corretamente
- [ ] Testar funcionalidades

---

### 5.4. Validação Pós-Deploy
- [ ] Criar usuário SDR de teste
- [ ] Criar board de SDR
- [ ] Testar fluxo completo
- [ ] Verificar logs de auditoria
- [ ] Validar permissões

---

## ⚠️ Considerações e Decisões Pendentes

### Decisões a Tomar Antes de Implementar:

1. **Board Type**:
   - [ ] Usar campo `board_type` ou inferir pelo owner?
   - Recomendação: Campo explícito para mais clareza

2. **Atribuição Automática de Vendedor**:
   - [ ] Critério de escolha: round-robin, manual, baseado em regras?
   - [ ] Qual lista específica trigger a automação?

3. **Permissões de SDR**:
   - [ ] SDR pode editar cards que não são dele?
   - [ ] SDR pode deletar cards?
   - [ ] SDR pode criar boards?

4. **Notificações**:
   - [ ] Notificar vendedor quando SDR atribui card a ele?
   - [ ] Notificar SDR quando status muda?

### Riscos e Desafios:

- **Migration em Produção**: Adicionar coluna `sdr_assigned_to` em tabela grande (cards)
- **Breaking Changes**: Se alterar estrutura de boards
- **Performance**: Joins adicionais nas queries de cards
- **UX**: Não confundir usuários com dois responsáveis

---

## 📊 Estimativa de Esforço

| Fase | Estimativa | Complexidade |
|------|-----------|--------------|
| Fase 1 - Backend | ~6-8 horas | Média-Alta |
| Fase 2 - Frontend | ~8-10 horas | Média-Alta |
| Fase 3 - Testes | ~3-4 horas | Média |
| Fase 4 - Documentação | ~2 horas | Baixa |
| Fase 5 - Deploy | ~2 horas | Média |
| **TOTAL** | **~21-26 horas** | **Alta** |

---

## 📌 Notas Importantes

- Esta é uma mudança grande que afeta core do sistema
- Requer testes extensivos antes de produção
- Criar branch separada para desenvolvimento
- Fazer commits granulares para facilitar rollback se necessário
- Comunicar mudanças para usuários antes do deploy

---

## ✅ Checklist Pré-Implementação

Antes de começar a implementação, garantir que:

- [ ] Todas as regras de negócio estão claras
- [ ] Decisões pendentes foram resolvidas
- [ ] Backup do banco de dados foi feito
- [ ] Branch de desenvolvimento foi criada
- [ ] Equipe está ciente das mudanças

---

**Próximos Passos**:
1. Revisar este TODO com a equipe
2. Resolver decisões pendentes
3. Criar branch `feature/sdr-implementation`
4. Começar pela Fase 1.1 (Model User)
