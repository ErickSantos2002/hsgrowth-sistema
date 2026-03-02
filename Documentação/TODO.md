# TODO - HSGrowth CRM

**Última atualização**: 02/03/2026
**Responsável**: Erick (Cientista de Dados / Full Stack)

---

## ✅ Fases Concluídas e em Produção

### Fase: CardDetails - Página de Detalhes do Card ✅ CONCLUÍDA
- Todas as funcionalidades implementadas e em produção
- Ver detalhes no arquivo (seção "Concluído")

### Fase: Produtos - Gerenciamento de Catálogo ✅ CONCLUÍDA
- Página completa de gerenciamento implementada
- CRUD completo funcional

### Fase: Configurações - Gamificação ✅ CONCLUÍDA
- Aba Pontos implementada
- Sistema funcionando corretamente

### Fase: Sistema de SDR ✅ CONCLUÍDA
- Campo `sdr_id` implementado nos cards
- Rodízio automático de SDRs
- Interface completa no CardDetails
- Ver arquivo: `TODO - Implementação SDR.md` (marcado como concluído)

### Fase: Sistema de Automações ✅ CONCLUÍDA
- Editor visual implementado (AutomationEditor.tsx)
- Sistema de rodízio (vendedores e SDRs)
- Triggers e actions funcionais
- Ver arquivo: `TODO - Automações.md` (marcado como concluído)

### Fase: Integração API4COM ✅ CONCLUÍDA
- Configuração de credenciais implementada
- Gerenciamento de ramais funcionando
- Botão "Ligar" integrado ao sistema
- Ver arquivo: `TODO - Integração API4COM.md` (marcado como concluído)

### Fase: Sistema de Arquivos (Attachments/Upload) ✅ CONCLUÍDA
- Model `Attachment` com soft delete e propriedades calculadas (is_image, is_pdf, file_size_mb, etc.)
- Schema Pydantic v2 com validação de tipo MIME e tamanho (máx 10MB)
- Repository com 8 métodos (incluindo soft delete, filtro por tipo, tamanho total)
- Service com upload (salva em disco + banco), download, delete e listagem com estatísticas
- 4 endpoints REST documentados no OpenAPI
- Migrations: criação da tabela e adição do campo `attachment_type`
- Frontend: `attachmentService.ts` com upload, download, preview e validação local
- Frontend: `FilesSection.tsx` com drag & drop, preview, delete e contador
- Frontend: `FilePreviewModal.tsx` para imagens e PDFs
- Integrado no `CardDetails.tsx` como aba "Arquivos" com badge de contagem
- Auditoria e histórico de atividades registrados
- Obs: validação de permissões no download/delete deixada como melhoria futura

### Fase: Sistema de Anotações (Notes) ✅ CONCLUÍDA
- Model `CardNote` com cascade delete e timestamps automáticos
- Schema Pydantic v2 completo (Create, Update, Response)
- Repository com CRUD completo
- Service com controle de permissões (autor, admin, manager) e auditoria
- 5 endpoints REST documentados no OpenAPI (`/api/v1/card-notes`)
- Notas carregadas junto com o card no endpoint `expanded`
- Frontend: `cardNoteService.ts` com todas as chamadas tipadas
- Frontend: `NotesSection.tsx` com suporte a imagens coladas (Ctrl+V com compressão)
- Frontend: `NoteRenderer.tsx` com parser de HTML/WhatsApp e sanitização
- Integrado no `CardDetails.tsx` como aba "Anotações"
- Script de importação do Pipedrive funcional

---

## 📋 Pendências e Próximas Implementações

### Backend - Agendador (Scheduler/Calendar)
- [ ] Planejamento da arquitetura
- [ ] Integração com Google Calendar (opcional)
- [ ] Integração com Microsoft Teams/Outlook (opcional)
- [ ] Sistema de lembretes e notificações
- [ ] Conectar frontend `SchedulerSection` com backend

### Frontend - Melhorias e Ajustes
- [ ] Auto-save em campos editáveis (com debounce e feedback visual)
- [ ] Loading states em mais operações
- [ ] Tratamento de erros mais robusto (toasts/notifications em vez de alerts)
- [ ] Validação de formulários mais completa
- [ ] Responsividade mobile
- [ ] Testes unitários dos componentes

### Backend - Permissões e Segurança
- [ ] Implementar verificações de permissão em `CardTaskService`
  - [ ] Apenas responsável ou admin pode editar tarefa
  - [ ] Apenas responsável ou admin pode deletar tarefa
- [ ] Implementar verificações de permissão em `CardService`
  - [ ] Controle de acesso a cards por board/time
- [ ] Auditoria completa de ações sensíveis (revisar se já não está completo)

### Backend - Gamificação (Melhorias)
- [ ] Dar pontos ao completar tarefas (verificar se já implementado)
- [ ] Dar pontos ao fechar deals (verificar se já implementado)
- [ ] Sistema de conquistas relacionado a atividades

### Backend - Notificações (Melhorias)
- [ ] Notificar quando tarefa é atribuída
- [ ] Notificar quando tarefa está próxima do vencimento
- [ ] Notificar quando card é movido
- [ ] Notificar quando produto é adicionado/removido

### Geral - Otimizações
- [ ] Paginação no histórico (scroll infinito)
- [ ] Cache de dados frequentemente acessados
- [ ] Otimização de queries N+1 (verificar se já não foi feito)
- [ ] Compressão de respostas API
- [ ] Rate limiting (verificar se já implementado)

---

## 🐛 Bugs Conhecidos

**Nenhum bug crítico reportado no momento!** 🎉

---

## 📝 Notas Técnicas

### Sistema de Timezone
- **Padrão adotado**: Banco de dados armazena tudo em UTC
- **Frontend**: Converte para UTC-3 (Brasil) ao exibir e ao enviar
- **Funções utilitárias**: `utils/timezone.ts` centraliza toda lógica de conversão

### Sistema de Histórico (Activity)
- **Modelo**: `Activity` registra todos os eventos importantes
- **Tipos de eventos implementados**:
  - `task_created`, `task_completed`, `task_edited`, `task_deleted`, `task_reopened`
  - `stage_moved`, `value_changed`, `product_added`, `product_removed`
  - `assigned_changed`, `organization_changed`, etc.
- **Metadados**: Cada evento pode ter JSON com informações adicionais
- **Integração**: Services registram eventos automaticamente nas operações

### Arquitetura de Componentes
- **Componentes reutilizáveis**: Localizados em `components/cardDetails/`
- **Exportação centralizada**: `components/cardDetails/index.ts`
- **Props tipadas**: Todos os componentes usam TypeScript com interfaces
- **Estado local**: Uso de `useState` para estado interno dos componentes
- **Comunicação com parent**: Callbacks via props (`onUpdate`, `onSave`, etc.)

---

## 🎯 Próximos Passos Sugeridos (Ordem de Prioridade)

1. **Melhorar tratamento de erros no frontend**
   - Substituir alerts por toasts/notifications
   - Sistema de notificações toast centralizado
   - Feedback visual consistente

4. **Implementar auto-save com debounce**
   - Campos editáveis salvam automaticamente
   - Debounce de 500-1000ms
   - Indicador visual de "salvando..."

5. **Sistema de Agendador/Calendário**
   - Planejamento da arquitetura
   - Integração com calendários externos (opcional)
   - Interface de calendário no frontend

6. **Testes unitários**
   - Componentes principais do frontend
   - Services e repositories do backend
   - Cobertura mínima de 70%

7. **Responsividade mobile**
   - Revisar todas as páginas
   - Testar em diferentes tamanhos de tela
   - Ajustes de UX para mobile

8. **Otimizações de performance**
   - Queries N+1 (verificar se já foram otimizadas)
   - Cache de dados
   - Lazy loading de componentes

---

## 📊 Resumo de Progresso

### Módulos Implementados (100%)
- ✅ **Autenticação e Autorização**
- ✅ **Boards (Kanban)**
- ✅ **Cards (Negócios)**
- ✅ **Clientes (Organizações)**
- ✅ **Pessoas (Contatos)**
- ✅ **Produtos**
- ✅ **Usuários e Roles**
- ✅ **CardDetails Completo**
- ✅ **Sistema de Atividades/Tarefas**
- ✅ **Sistema de Gamificação**
- ✅ **Sistema de Logs de Auditoria**
- ✅ **Sistema de SDR**
- ✅ **Sistema de Automações**
- ✅ **Integração API4COM (VOIP)**
- ✅ **Importação de Dados (Pipedrive)**
- ✅ **Busca Global (Ctrl+K)**
- ✅ **Página de Documentação da API (/api-docs)**
- ✅ **Sistema de Anotações (Notes)**
- ✅ **Sistema de Arquivos (Attachments/Upload)**

### Módulos Parcialmente Implementados
- 🔄 **Notificações** - Estrutura existe, melhorias pendentes
- 🔄 **Gamificação** - Funcional, melhorias opcionais pendentes

### Módulos Não Iniciados
- ❌ **Agendador/Calendário**

### Estatísticas do Projeto
- **Endpoints da API**: ~149
- **Schemas Pydantic**: ~146
- **Páginas React**: 20+
- **Componentes React**: 100+
- **Modelos do banco**: 25+
- **Migrations**: 40+
- **Linhas de código (Backend)**: ~15.000+
- **Linhas de código (Frontend)**: ~20.000+

---

## 🎉 Marcos Alcançados

- ✅ **v1.0.0** (29/01/2026) - Primeira versão em produção
- ✅ **v1.1.0** (04/02/2026) - Sistema de Logs de Auditoria
- ✅ **v1.1.1** (05/02/2026) - Filtros e importação de deals
- ✅ **v1.1.2** (06/02/2026) - Documentação customizada da API
- ✅ **v1.1.3** (09/02/2026) - Sistema de SDR e Rodízio
- ✅ **v1.1.4** (10/02/2026) - Melhorias de UX e permissões
- ✅ **v1.1.5** (10/02/2026) - Edição inline e simplificações

---

**Projeto em produção desde 29/01/2026**
**Status geral**: Sistema maduro e funcional com funcionalidades core completas
