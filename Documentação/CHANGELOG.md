# Changelog - HSGrowth CRM

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.3.0] - 2026-02-24

### 🎨 Novas Funcionalidades

#### Módulo de Relatórios Customizados — Frontend Fase 1 (Power BI-style)
- **Builder de dashboards** com layout 3 colunas: painel de campos | grid de gráficos | painel de configuração
- **Drag & drop** de campos para os eixos X e Y diretamente do painel de campos disponíveis
- **4 tipos de gráfico**: Barras, Linha, Pizza e Tabela — alternáveis em tempo real
- **Múltiplas séries no eixo Y** para bar/line: até 4 campos Y simultâneos, cada um com sua própria agregação e cor
- **Badge de agregação clicável** nos chips do eixo Y — cicla entre as opções disponíveis por tipo de campo (`count → distinct_count → sum → avg` para numéricos/moeda; `count → distinct_count` para demais)
- **Atualização em tempo real** — gráfico atualiza instantaneamente a cada mudança no formulário (sem botão confirmar); título com debounce de 400ms
- **Correspondência visual** entre chips de configuração e séries do gráfico via `SERIES_COLORS` compartilhado
- **Feedback de limite** no eixo Y: mensagem "Limite de 4 métricas atingido" para bar/line; zona de drop sempre visível para pie/table com hint "Arraste para substituir"
- **Troca de tipo com truncagem automática**: ao mudar de bar/line para pie/table com múltiplas séries, mantém apenas a primeira e descarta as extras
- **Persistência em localStorage** com CRUD completo de relatórios (criar, abrir, salvar, excluir)
- **Relatórios salvos**: grid de cards com busca por nome, contador de gráficos e data de atualização
- **Agrupamento temporal** no eixo X para campos de data: Dia / Semana / Mês / Ano
- **Catálogo de campos** por fonte de dados (Negócios, Clientes, Pessoas, Atividades) com 25 campos mapeados

### 🔧 Melhorias Técnicas

#### Arquitetura do módulo
- **`YFieldConfig`**: novo tipo central — campo Y com agregação própria, substituiu o antigo `y_field + aggregation` no `ChartConfig`
- **`SeriesData`**: tipo para séries múltiplas na `QueryResponse` (`series?: SeriesData[]`), mantendo `values` para compatibilidade com pie/table
- **`SERIES_COLORS`**: paleta centralizada em `reportTypes.ts`, importada por `ChartConfigPanel` (chips) e `ChartWidget` (Recharts) — fonte única de verdade para cores de séries
- **Nomes únicos de série**: quando múltiplos campos têm o mesmo label (ex: "Quantidade" de fontes diferentes), `generateMockData` adiciona a fonte automaticamente ("Quantidade (Negócios)", "Quantidade (Atividades)") para evitar colisão de keys no Recharts
- **Migração automática de localStorage**: ao carregar, converte relatórios com estrutura antiga (`y_field + aggregation`) para o novo formato (`y_fields[]`) sem intervenção do usuário

### 📝 Arquivos Modificados

#### Frontend
- `src/components/reports/reportTypes.ts` — tipos `YFieldConfig`, `SeriesData`, `SERIES_COLORS`; `ChartConfig` atualizado; `generateMockData` com nova assinatura
- `src/components/reports/ChartConfigPanel.tsx` — estado `yFields[]`, chips múltiplos com badge ciclável, zona de drop contextual, correspondência de cores
- `src/components/reports/ChartWidget.tsx` — suporte a `data.series` em bar/line, multi-`<Bar>`/`<Line>` com `<Legend>`, `SERIES_COLORS` importado de `reportTypes`
- `src/components/reports/ChartConfigModal.tsx` — adaptado para compilar com nova API (`y_fields[]`)
- `src/pages/Reports.tsx` — migração de localStorage, chamadas de `generateMockData` atualizadas

### 🔮 Próximos Passos (Fase 2)
- `GET /api/v1/reports/fields` → substituir `FIELD_CATALOG` hardcoded
- `POST /api/v1/reports/query` → substituir `generateMockData` por dados reais
- CRUD `/api/v1/reports/custom` → substituir `localStorage`

---

## [1.2.0] - 2026-02-23

### 🎨 Novas Funcionalidades

#### Modo Claro (Light Mode) - Sistema de Temas Completo
- **Toggle de tema** no header do MainLayout: alterna entre modo claro e escuro com persistência no `localStorage`
- **Estratégia Tailwind `darkMode: 'class'`**: classe `dark` no `<html>`, prefixo `dark:` em todos os componentes
- **ThemeContext**: contexto React global com hook `useTheme()` expondo `darkMode` e `toggleTheme`
- **~1.600 classes `dark:` adicionadas** em todos os componentes e páginas do frontend
- **Cores programáticas tema-aware**: função `getChartColors(darkMode: boolean)` em `constants/colors.ts` para Recharts, React Flow e outros componentes que não suportam prefixo `dark:` do Tailwind
- **Sem regressões**: modo escuro mantém aparência idêntica à versão anterior

#### Componente Pagination Responsivo Light/Dark
- **Mobile-first**: navegação simplificada (Anterior / Página X de Y / Próxima) em telas pequenas
- **Desktop**: navegação completa com contador de registros, botões numéricos e Anterior/Próxima
- **Suporte total a modo claro**: `border-gray-200 bg-white text-slate-900` com variantes `dark:*`

### 🔧 Melhorias Técnicas

#### Frontend
- `tailwind.config.js`: habilitado `darkMode: 'class'`
- `ThemeContext.tsx`: contexto com persistência no `localStorage`
- `constants/colors.ts`: adicionado `getChartColors(darkMode)` para cores HEX tema-aware
- `main.tsx`: aplicação da classe `dark` no `<html>` via ThemeContext na inicialização
- **Dashboard, Reports, AutomationEditor, KanbanList**: substituídos `COLORS.surface.*`, `COLORS.content.*`, `COLORS.border.*` por `chartColors.*` via `getChartColors(darkMode)`
- **~100 arquivos atualizados**: todas as páginas, layouts, componentes comuns, modais, kanban, settings, gamification, automations

### 📝 Arquivos Modificados

#### Frontend
- `tailwind.config.js` - darkMode class habilitado
- `src/context/ThemeContext.tsx` - ThemeContext com localStorage
- `src/main.tsx` - inicialização do tema no html
- `src/layouts/MainLayout.tsx` - toggle de tema no header + versão 1.2.0
- `src/constants/colors.ts` - getChartColors adicionado
- `src/pages/Dashboard.tsx` - chartColors tema-aware
- `src/pages/Reports.tsx` - chartColors tema-aware
- `src/pages/AutomationEditor.tsx` - chartColors tema-aware
- `src/components/kanban/KanbanList.tsx` - chartColors tema-aware
- `src/components/common/Pagination.tsx` - light/dark mode + mobile-first responsivo
- `src/pages/Notifications.tsx` - usa componente Pagination ao invés de inline
- _~90 arquivos adicionais com classes `dark:` adicionadas_

---

## [1.1.10] - 2026-02-20

### ✨ Novas Funcionalidades

#### Reabertura de Negócio Perdido
- **Botão "Reabrir Negócio"** aparece no CardDetails quando o negócio está perdido, ao lado do badge vermelho
- **Modal de reabertura** com dois campos: título editável (pré-preenchido com o título original) e seleção do detalhamento do canal (Base - Resgate ou Base - Levantada de mão)
- **Clone completo do card original**: copia cliente, pessoa vinculada, informações de contato, responsável, SDR, valor, descrição, tipo de negócio, campos customizados, tarefas/atividades, anotações, arquivos e produtos
- Canal de aquisição do novo card é sempre definido como **Base** com o detalhamento escolhido pelo vendedor
- Novo card criado na lista de Prospecção (list_id=22, board_id=6)
- Card original permanece inalterado (continua como perdido)
- Histórico do card original registra entrada `card_reopened` com link para o novo card
- Após criação, redireciona automaticamente para o novo card
- Endpoint: `POST /api/v1/cards/{card_id}/reopen`

### 🔧 Melhorias

#### Valor do Negócio calculado por Produtos
- Campo **"Valor do negócio"** no Resumo do CardDetails agora é sempre somente leitura
- Valor calculado automaticamente com base nos produtos vinculados (`products_total`)
- Quando não há produtos: valor exibido em cinza com hint "Adicione produtos na seção Produtos para calcular o valor automaticamente"
- Quando há produtos: valor exibido em verde com texto "Calculado automaticamente com base nos produtos vinculados"

#### Atualização das opções de Canal de Aquisição - Detalhamento
- **Indicação**: substituídas opções antigas por `Ex-cliente` e `Networking pessoal`
- **Parcerias**: substituídas por `Consultorias`, `Integradores`, `Representantes` e `Outras empresas`
- **Eventos**: removido `Webinar`, `Workshop` virou `Workshop próprio`, adicionado `Palestra`
- **Base**: substituídas todas as opções por `Resgate`, `Levantada de mão`, `e-mail marketing` e `Disparo whats`

### 🐛 Correções

#### Erro ao salvar configuração API4COM
- **Problema**: endpoint `POST /api/v1/api4com/config` lançava `AttributeError: type object 'API4ComConfig' has no attribute 'is_deleted'` pois o modelo não possui esse campo
- **Solução**: removidos os filtros `is_deleted == False` incorretos dos endpoints de config e ramais (API4ComConfig e UserExtension não implementam soft delete)

#### Arquivos duplicados na reabertura de negócio
- **Problema**: ao reabrir um negócio, arquivos deletados (soft delete) eram copiados junto com os ativos, pois o filtro usava `is_deleted == False` — mas o soft delete de attachments é feito via `deleted_at`, não `is_deleted`
- **Solução**: filtro corrigido para `deleted_at.is_(None)`, alinhado com o `AttachmentRepository`

---

## [1.1.9] - 2026-02-19

### ✨ Novas Funcionalidades

#### Histórico de Arquivos no CardDetails
- **Aba "Arquivos"** no Histórico registra eventos de upload e exclusão de anexos
- **Upload de arquivo** (`file_attached`): nome e tamanho em MB registrados no histórico
- **Exclusão de arquivo** (`file_deleted`): nome e tamanho registrados com ícone vermelho
- Badge com contagem de eventos de arquivo na aba

#### Aba "Alterações" no Histórico do Card
- **Nova aba dedicada** para mudanças diretas no card, separando de atividades de tarefa
- Eventos rastreados:
  - **Etapa alterada** (`card_moved`): de qual lista para qual lista
  - **Card ganho** (`card_won`): qual lista marcada como fechado/ganho
  - **Card perdido** (`card_lost`): qual lista marcada como perdido
  - **Valor alterado** (`card_value_changed`): valor anterior e novo formatados em R$
  - **Título alterado** (`card_title_changed`): título anterior e novo
  - **Responsável alterado** (`card_assigned_changed`): nome anterior e novo
  - **Data limite alterada** (`card_due_date_changed`): data anterior e nova
  - **Pessoa vinculada** (`person_linked`): nome da pessoa
  - **Pessoa desvinculada** (`person_unlinked`): nome da pessoa
  - **Produto adicionado** (`product_added`): nome do produto
  - **Produto removido** (`product_removed`): nome do produto
- Badge com contagem de alterações na aba
- Aba "Atividades" filtrada para exibir apenas eventos de tarefas (`task_*`)

#### Planilha Padronizada de Importação para SDRs
- **Script Python** `backend/scripts/create_import_sheet.py` para gerar a planilha
- **47 colunas** em 8 seções coloridas: Empresa, Telefones/Emails, Contato Principal, Contato 2, Contato 3, Card/Negócio, Atividades (3 slots), Anotações
- **Dropdowns com bloqueio** (`errorStyle="stop"`) para todos os campos fixos:
  - Canal de Aquisição: Inbound, Outbound, Indicação, Parcerias, Eventos, Base
  - Canal de Aquisição - Detalhe: 22 opções (ex: "Outbound - Cold call")
  - Tipo de Negócio: Nova Venda, Cross Sell, Up Sell
  - Tipo de Atividade: 8 opções (Ligação, WhatsApp, Email, etc.)
  - Faixa de Funcionários: 6 faixas exatas do CRM
  - Faixa de Faturamento: 6 faixas exatas do CRM
  - Estado (UF): 27 estados brasileiros
- **Contato 2 e 3**: mantidos para coleta, salvos nas Anotações do card (CRM vincula apenas 1 pessoa por card)
- **Aba de Referência oculta** com todas as listas para os dropdowns
- Painéis congelados (linhas 1-4 e colunas A-B) para navegação facilitada

### 🐛 Correções

#### Decimal não serializável em JSON (card_value_changed)
- **Problema**: PostgreSQL retorna `Decimal` para campos NUMERIC, causando `TypeError: Object of type Decimal is not JSON serializable` ao tentar salvar no `activity_metadata`
- **Solução**: conversão explícita para `float()` antes de armazenar o valor no metadata da atividade

#### Sessão SQLAlchemy corrompida após exceção no histórico
- **Problema**: Quando o registro de atividade falhava com exceção, a sessão entrava em estado "needs rollback", fazendo o endpoint retornar 500 mesmo com o card já salvo com sucesso
- **Solução**: adicionado `self.db.rollback()` no bloco `except` para resetar o estado da sessão sem desfazer o commit anterior do card

### 🔧 Melhorias Técnicas
- `ActivityRepository.create()` adicionado nos endpoints de anexos (`attachments.py`) para registrar upload e exclusão no histórico visível ao usuário
- `ProductService` passou a registrar eventos de produto no `ActivityRepository` (antes só ia para `AuditLog`)
- `CardService.update_card()` captura snapshot dos campos antes do update para comparação e geração dos eventos de alteração
- `CardService.move_card()` registra evento de movimentação, ganho ou perda de card automaticamente

---

## [1.1.8] - 2026-02-12

### ✨ Novas Funcionalidades

#### Sistema de Avatares de Usuário
- **Upload de avatar pessoal** na página de Configurações
- **Exclusão de avatar** com confirmação
- **Componente reutilizável UserAvatar**:
  - Exibe foto do usuário ou fallback com iniciais do nome
  - Tamanhos configuráveis (xs, sm, md, lg, xl)
  - Indicador de status online opcional
  - Tratamento automático de erro de carregamento
  - Gradiente azul/cyan nas iniciais
- **Backend completo**:
  - Upload: POST `/api/v1/users/me/avatar`
  - Download: GET `/api/v1/users/{user_id}/avatar`
  - Exclusão: DELETE `/api/v1/users/me/avatar`
  - Validação de tipo (JPG, PNG, GIF, WEBP)
  - Limite de 5MB por arquivo
  - Armazenamento em `/app/uploads/avatars/`
  - Soft delete para recuperação
- **Integração visual**:
  - Avatar no header do MainLayout
  - Avatar na página de Usuários
  - Avatar no CardDetails (Responsável e SDR)
  - Avatar no KanbanCard (lado a lado: SDR à esquerda, Vendedor à direita)

#### Badge Inteligente de Atividades Pendentes
- **Novo badge visual** no canto superior direito de cada card do Kanban
- **Sistema de cores inteligente** baseado em prioridade:
  - 🔴 **Vermelho**: Atividades atrasadas (overdue)
  - 🟢 **Verde**: Atividades para hoje
  - 🟣 **Roxo**: Atividades futuras
  - ⚫ **Cinza**: Sem atividades (não clicável)
- **Ícone CheckSquare** sem número (design mais limpo)
- **Backend otimizado**:
  - Query única para todas as atividades pendentes de todos os cards
  - Cálculo inteligente de status em UTC timezone
  - Campos adicionados ao CardMinimalResponse: `pending_tasks_count`, `pending_tasks_status`

#### Modal de Atividades Pendentes
- **Modal com lazy loading**: Carrega atividades apenas ao clicar no badge
- **Tamanho fixo igual às listas do Kanban** (320px x tela cheia)
- **Visual consistente** com FocusSection do CardDetails:
  - Ícones por tipo de atividade (Phone, Users, CheckSquare, Clock, Mail, Coffee)
  - Badges coloridos por tipo
  - StatusBadge mostrando se é HOJE, VENCIDO ou data futura
  - Badges de prioridade (Normal, Alta, Urgente)
  - Nome do responsável
- **Navegação integrada**: Clicar em uma atividade abre o CardDetails
- **Scroll automático**: Quando tem muitas atividades

#### Tooltips nos Avatares
- **Hover mostra o nome do usuário** em todos os avatares
- **Implementado em**:
  - CardDetails: Responsável e SDR (admin/manager e vendedor views)
  - KanbanCard: Todos os avatares via componente UserAvatar
  - Dropdowns de seleção de usuários
- **Nativo HTML**: Usa atributo `title` para tooltip do navegador

### 🎨 Padronização de Cores

#### StatusBadge Atualizado
- **Verde**: Status "HOJE" (era amarelo)
- **Roxo**: Status "FUTURO" (era amarelo)
- **Vermelho**: Status "VENCIDO" (mantido)
- **Verde escuro**: Status "CONCLUÍDO" (mantido)

#### Badges de Prioridade Padronizados
- **Azul**: Prioridade "Normal" (era cinza)
- **Amarelo**: Prioridade "Alta" (mantido)
- **Vermelho**: Prioridade "Urgente" (mantido)

### 🔧 Melhorias Técnicas

#### Backend
- **Model**: `User.avatar_url` (String nullable)
- **Service**: `AvatarService` com upload, download, delete e validação
- **Repository**: `UserRepository.update()` para atualizar avatar_url
- **Endpoints**: 3 rotas RESTful documentadas
  - POST `/users/me/avatar` - Upload
  - GET `/users/{user_id}/avatar` - Download
  - DELETE `/users/me/avatar` - Exclusão
- **CardService**: Otimização de query para buscar atividades pendentes de múltiplos cards em uma única consulta SQL
- **Schemas**: Campos `sdr_name`, `sdr_avatar_url`, `pending_tasks_count`, `pending_tasks_status` adicionados

#### Frontend
- **Service**: `avatarService.ts` com helpers de validação e URL
- **Component**: `UserAvatar.tsx` reutilizável e totalmente configurável
- **Modal**: `CardActivitiesModal.tsx` com navegação e visual padronizado
- **Integration**: Avatar integrado em 5+ componentes diferentes
- **UX**: Estados de loading, validação client-side, confirmação de exclusão

### 🐛 Correções

#### Avatar Upload
- **Problema**: Avatar aparece salvo mas não mostra em lugar nenhum
- **Solução**:
  - Backend retornando URL relativa correta
  - Frontend usando avatarService.getAvatarUrl() para gerar URL completa
  - UserAvatar component com fallback para iniciais
- **Resultado**: Avatar visível em todos os lugares do sistema

#### Modal de Atividades
- **Problema**: Tamanho da modal diferente das listas do Kanban
- **Solução**: Largura fixa `w-80` (320px) igual às listas, altura `h-full` com scroll interno
- **Resultado**: Modal visualmente consistente com as colunas do board

### 📝 Arquivos Criados

#### Backend
- `app/services/avatar_service.py` - Serviço de gestão de avatares
- `app/api/v1/endpoints/avatars.py` - Endpoints de avatar (integrado em users.py)

#### Frontend
- `src/components/common/UserAvatar.tsx` - Componente reutilizável de avatar
- `src/components/kanban/CardActivitiesModal.tsx` - Modal de atividades pendentes
- `src/services/avatarService.ts` - API service para avatares

### 📝 Arquivos Modificados

#### Backend
- `app/models/user.py` - Adicionada coluna avatar_url
- `app/schemas/card.py` - Campos sdr_name, sdr_avatar_url, pending_tasks_count, pending_tasks_status
- `app/repositories/user_repository.py` - Método update() para avatar
- `app/services/card_service.py` - Query otimizada para atividades pendentes
- `app/api/v1/endpoints/users.py` - Rotas de avatar adicionadas

#### Frontend
- `src/pages/Settings.tsx` - Upload e exclusão de avatar
- `src/pages/CardDetails.tsx` - Tooltips nos avatares
- `src/layouts/MainLayout.tsx` - Avatar no header + versão 1.1.8
- `src/components/kanban/KanbanCard.tsx` - Badge de atividades + avatares com tooltip
- `src/components/cardDetails/StatusBadge.tsx` - Cores atualizadas
- `src/components/cardDetails/FocusSection.tsx` - Prioridade Normal azul
- `src/components/cardDetails/QuickActivityForm.tsx` - Prioridade Normal azul
- `src/components/common/UserAvatar.tsx` - Tooltips adicionados
- `src/components/common/index.ts` - Export de UserAvatar
- `src/pages/Users.tsx` - Integração com UserAvatar

---

## [1.1.7] - 2026-02-12

### ✨ Novas Funcionalidades

#### Sistema de Anexos de Arquivos
- **Upload de arquivos** vinculados a cards
- **Tipos suportados**: PDF, DOCX, XLSX, TXT, CSV, imagens (JPG, PNG, GIF, WEBP), ZIP, RAR, 7Z
- **Limite de tamanho**: 10MB por arquivo
- **Armazenamento**: Persistente em volume Docker (`/app/uploads`)
- **Funcionalidades completas**:
  - Upload via drag & drop ou clique
  - Upload múltiplo de arquivos
  - Download de arquivos
  - Preview inline de imagens e PDFs
  - Exclusão de arquivos
  - Contador de arquivos na aba
  - Ícones diferenciados por tipo de arquivo
  - Soft delete (recuperação possível)

#### Modal de Preview de Arquivos
- **Preview nativo no sistema** para imagens e PDFs
- **Botão "olho"** ao lado de cada arquivo compatível
- **Modal em tela cheia** usando BaseModal padrão do sistema
- **Funcionalidades**:
  - Visualização de imagens (PNG, JPG, GIF, WEBP)
  - Visualização de PDFs com scroll
  - Botão de download dentro da modal
  - Fechar com ESC ou botão X
  - Estados de loading e erro
  - Z-index elevado (3000) para evitar sobreposição

#### Logs de Auditoria para Anexos
- **Registro completo** de todas as operações com arquivos:
  - **CREATE** - Upload de arquivo (registra nome, tamanho, tipo, card)
  - **READ** - Download de arquivo (registra quem baixou qual arquivo)
  - **DELETE** - Exclusão de arquivo (registra informações antes de deletar)
- **Informações capturadas**: usuário, IP, user-agent, timestamp, detalhes da ação
- **Compliance**: Rastreabilidade completa de acesso a arquivos sensíveis

### 🔧 Melhorias Técnicas

#### Backend
- **Model**: `Attachment` com soft delete e propriedades calculadas
  - Campos: filename, original_filename, file_size, mime_type, storage_path
  - Propriedades: file_size_mb, file_extension, is_image, is_pdf, is_document
  - Relationships: card, uploaded_by
- **Migration**: Tabela attachments com coluna is_deleted (SoftDeleteMixin)
- **Repository**: CRUD completo + métodos de estatísticas
- **Service**: Validação, upload, download, delete com gerenciamento de arquivos físicos
- **Endpoints**: 4 rotas RESTful documentadas
  - POST `/cards/{card_id}/attachments` - Upload
  - GET `/cards/{card_id}/attachments` - Listar
  - GET `/attachments/{attachment_id}/download` - Download
  - DELETE `/attachments/{attachment_id}` - Deletar
- **Auditoria**: Integração com AuditLog em todos os endpoints

#### Frontend
- **Service**: `attachmentService.ts` com helpers de validação e formatação
- **Component**: `FilesSection.tsx` com drag & drop e gestão de estado
- **Modal**: `FilePreviewModal.tsx` usando BaseModal padrão
- **Integration**: Contador de arquivos no CardDetails
- **UX**: Loading states, validação client-side, mensagens de erro

### 🐛 Correções

#### Migration do Alembic
- **Problema**: Migration faltando coluna `is_deleted` do SoftDeleteMixin
- **Solução**: Adicionada coluna is_deleted (Boolean, default false) na migration
- **Resultado**: Model Attachment sincronizado com schema do banco

#### Logs de Auditoria
- **Problema**: Tentativa de acessar `service.attachment_repo` (atributo inexistente)
- **Solução**: Corrigido para usar `service.repository` (atributo correto)
- **Resultado**: Logs de auditoria funcionando para download e delete

#### Modal de Preview
- **Problema**: Modal sendo escondida por elementos do layout (z-index)
- **Solução**: Migrado para BaseModal padrão com ReactDOM.createPortal
- **Resultado**: Modal renderiza no body com z-index 3000, sempre visível

### 📝 Arquivos Criados

#### Backend
- `app/models/attachment.py` - Model SQLAlchemy
- `app/schemas/attachment.py` - Schemas Pydantic
- `app/repositories/attachment_repository.py` - Data access layer
- `app/services/attachment_service.py` - Business logic
- `app/api/v1/endpoints/attachments.py` - API endpoints
- `alembic/versions/2026_02_12_1430-add_attachments_table.py` - Migration

#### Frontend
- `src/services/attachmentService.ts` - API service
- `src/components/cardDetails/FilesSection.tsx` - Upload/lista component
- `src/components/cardDetails/FilePreviewModal.tsx` - Preview modal

### 📝 Arquivos Modificados

#### Backend
- `app/models/__init__.py` - Import do Attachment
- `app/models/card.py` - Relationship com attachments
- `app/api/v1/__init__.py` - Router de attachments
- `app/api/v1/endpoints/attachments.py` - Logs de auditoria

#### Frontend
- `src/pages/CardDetails.tsx` - Contador de arquivos e integração
- `src/components/cardDetails/FilesSection.tsx` - Preview button e modal
- `src/layouts/MainLayout.tsx` - Versão atualizada para 1.1.7

---

## [1.1.6] - 2026-02-11

### 🎨 Adicionado

#### Sistema de Cores Centralizado
- Criado `constants/colors.ts` com palette de cores HEX centralizada
- Expandido `tailwind.config.js` com palette semântica completa
- Cores organizadas por: primary, surface, content, border, status, board
- Sistema de tematização preparado para modo claro/escuro

#### Componentes Comuns Reutilizáveis
- `LoadingSpinner` - Spinner padronizado com 3 tamanhos (sm, md, lg)
- `SearchInput` - Input de busca com ícone integrado
- `Pagination` - Componente de paginação responsivo (mobile e desktop)
- `PageHeader` - Cabeçalho padronizado para páginas com título, descrição, ícone e ações

#### Hooks Reutilizáveis
- `usePagination` - Gerencia paginação client-side com lógica completa
- `useCRUD` - Encapsula operações create, read, update, delete
- `useFilter` - Sistema de filtros flexível com helpers
- `filterHelpers` - Funções auxiliares para filtros comuns

#### Utilitários Centralizados
- `utils/formatters.ts` - Biblioteca de formatação e máscaras:
  - `maskPhone` - Máscara de telefone brasileiro
  - `maskCPF` - Máscara de CPF
  - `maskCNPJ` - Máscara de CNPJ
  - `maskDocument` - Auto-detecta CPF/CNPJ
  - `maskCEP` - Máscara de CEP
  - `maskCNAE` - Máscara de CNAE
  - `formatDate` - Formata data para pt-BR
  - `formatDateTime` - Formata data e hora para pt-BR
  - `formatCurrency` - Formata moeda brasileira
  - `unmask` - Remove formatação

- `utils/toast.ts` - Sistema de notificações padronizado
  - `showSuccess` - Toast de sucesso
  - `showError` - Toast de erro

### ♻️ Refatorado

#### Páginas Padronizadas (6 páginas)
- `pages/Users.tsx` - Migrada para hooks + layout components
- `pages/Persons.tsx` - Migrada para hooks + layout components + CRUD
- `pages/Clients.tsx` - Migrada para hooks + layout components + CRUD
- `pages/Products.tsx` - Migrada para hooks + layout components + CRUD
- `pages/Automations.tsx` - Migrada para hooks + layout components + filtros
- `pages/Notifications.tsx` - Verificada (mantida com server-side pagination)

#### Modais Padronizados
- `PersonModal.tsx` - Usando formatters centralizados
- `ClientModal.tsx` - Usando formatters centralizados
- `BoardModal.tsx` - Usando cores centralizadas + toast
- `UserModal.tsx` - Usando toast padronizado
- `TransferModal.tsx` - Usando toast padronizado
- `CardDetailModal.tsx` - Usando toast padronizado

#### Error Handling Unificado
- Migrados 20+ arquivos de `alert()` para `showSuccess/showError`
- Sistema de notificações consistente em todo o frontend
- Toast com estilo padronizado do sistema de cores

### 🗑️ Removido

#### Código Duplicado Eliminado (~3000 linhas)
- Funções de paginação duplicadas (eliminadas ~900 linhas)
- Lógica CRUD duplicada (eliminadas ~400 linhas)
- Lógica de filtros duplicada (eliminadas ~200 linhas)
- Headers de páginas duplicados (eliminadas ~150 linhas)
- Inputs de busca duplicados (eliminadas ~100 linhas)
- Componentes de paginação JSX duplicados (eliminadas ~550 linhas)
- Máscaras de formatação duplicadas (eliminadas ~77 linhas)
- Cores HEX hardcoded em múltiplos arquivos (eliminadas ~100 linhas)
- `alert()` e `console.error()` inconsistentes (eliminadas ~800 linhas)

### 🐛 Corrigido
- Corrigidas estruturas JSX com divs extras em 4 páginas
- Adicionados imports faltando de ícones (User) em Clients e Persons
- Corrigida indentação inconsistente em componentes de filtros

### 📊 Impacto Total
- **~3000 linhas de código duplicado eliminadas**
- **16 novos componentes e utilitários criados**
- **40+ arquivos refatorados e padronizados**
- **Desenvolvimento 6x mais rápido** para novas páginas CRUD
- **Sistema totalmente tematizável** em um único arquivo
- **Manutenção drasticamente simplificada**

### 📝 Arquivos Criados

#### Frontend
- `src/constants/colors.ts` - Sistema de cores centralizado
- `src/components/common/LoadingSpinner.tsx` - Spinner padronizado
- `src/components/common/SearchInput.tsx` - Input de busca
- `src/components/common/Pagination.tsx` - Paginação responsiva
- `src/components/common/PageHeader.tsx` - Header de página
- `src/hooks/usePagination.ts` - Hook de paginação
- `src/hooks/useCRUD.ts` - Hook CRUD
- `src/hooks/useFilter.ts` - Hook de filtros
- `src/utils/filterHelpers.ts` - Helpers de filtros
- `src/utils/formatters.ts` - Formatadores e máscaras
- `src/utils/toast.ts` - Sistema de toast

### 📝 Arquivos Modificados

#### Frontend
- `tailwind.config.js` - Palette semântica expandida
- `src/pages/Users.tsx` - Refatorado com hooks
- `src/pages/Persons.tsx` - Refatorado com hooks
- `src/pages/Clients.tsx` - Refatorado com hooks
- `src/pages/Products.tsx` - Refatorado com hooks
- `src/pages/Automations.tsx` - Refatorado com filtros
- `src/components/persons/PersonModal.tsx` - Formatters
- `src/components/clients/ClientModal.tsx` - Formatters
- `src/components/boards/BoardModal.tsx` - Cores + toast
- `src/components/users/UserModal.tsx` - Toast
- `src/components/transfers/TransferModal.tsx` - Toast
- `src/components/kanban/CardDetailModal.tsx` - Toast
- `src/layouts/MainLayout.tsx` - Versão atualizada para 1.1.6

---

## [1.1.5] - 2026-02-10

### ✨ Novas Funcionalidades

#### Edição Inline de Cliente e Pessoa no CardDetails
- **Botões "Modificar cadastro"** substituem "Ver página completa"
- **Edição direta no CardDetails**: Não precisa mais navegar para outra página
- **Modal de edição inline**:
  - Clique em "Modificar cadastro do cliente/pessoa" abre modal com dados preenchidos
  - Edite os campos necessários
  - Ao salvar, dados são atualizados automaticamente no CardDetails
- **UX melhorada**: Experiência fluida sem sair da página do card
- Aplicado em ClientSection e ContactSection

### 🔧 Melhorias de Usabilidade

#### Simplificação de Campos de Contato
- **E-mails reduzidos de 4 para 3 campos**:
  - Email Principal (novo)
  - Email Comercial
  - Email Pessoal
  - ~~Email Alternativo~~ (removido do frontend)
- **Telefones reduzidos de 4 para 3 campos**:
  - Telefone Principal (novo)
  - WhatsApp
  - Telefone Comercial
  - ~~Telefone Alternativo~~ (removido do frontend)
- **Campos mantidos no banco de dados** para uso futuro
- Interface mais limpa e fácil de usar
- Aplicado em PersonModal, ContactSection e páginas de Pessoas

#### Padronização da Seção Cliente no CardDetails
- **Todos os campos sempre visíveis**: Não oculta mais campos vazios
- **"Não informado" em campos vazios**: Mesmo padrão da seção de pessoa
- **Seção de Contato reorganizada**:
  - Subdividida em "Telefone" e "Email"
  - Labels claros para cada subcampo
- **Consistência visual**: Cliente e Pessoa agora seguem o mesmo padrão
- Facilita identificar quais dados estão faltando

### 📝 Arquivos Modificados

#### Frontend
- `src/components/cardDetails/ClientSection.tsx` - Botão de edição inline e padronização de campos
- `src/components/cardDetails/ContactSection.tsx` - Botão de edição inline e remoção de campos alternativos
- `src/components/persons/PersonModal.tsx` - Remoção de campos alternativos do formulário
- `src/layouts/MainLayout.tsx` - Atualização de versão para 1.1.5

---

## [1.1.4] - 2026-02-10

### ✨ Novas Funcionalidades

#### Cadastro Rápido de Cliente/Pessoa no CardDetails
- **Novos botões "Cadastrar"** nas seções de Cliente e Pessoa do CardDetails
- Layout em grid 2 colunas: "Vincular" (azul) + "Cadastrar" (verde)
- **Fluxo otimizado**:
  - Clique em "Cadastrar" abre modal de criação
  - Após salvar, automaticamente vincula ao card
  - Não precisa sair da página de detalhes do card
- **Vínculo automático**: Sistema busca o registro recém-criado e vincula ao card
- Mensagem de erro amigável caso o vínculo automático falhe

#### Atualização Otimista na Seção Resumo
- **Feedback instantâneo**: Campos atualizam imediatamente na tela sem reload
- **UX aprimorada**: Não fecha mais a seção ao editar campos
- **Seção permanece aberta**: Usuário não perde contexto de onde estava
- **Reversão automática**: Se houver erro, reverte a mudança e mostra mensagem
- Aplicado em todos os campos editáveis da seção Resumo:
  - Valor do negócio
  - Probabilidade de fechamento
  - Data esperada de fechamento
  - SDR responsável
  - Tipo de negócio
  - Canal de aquisição e detalhamento
  - Motivo da perda
  - Tem implementação / Tem pessoas para manusear

#### Busca Sob Demanda para Vincular Cliente/Pessoa
- **Não carrega mais automaticamente** milhares de registros ao abrir o modal
- **Busca dinâmica no backend** com debounce de 500ms
- **Mensagens claras**: "Digite o nome, CPF ou CNPJ para buscar"
- **Performance melhorada**: Limita resultados a 100 registros por busca
- Aplicado tanto em ClientSection quanto ContactSection

### 🔒 Melhorias de Segurança e Permissões

#### Restrição de Criação de Boards
- **Backend**: Apenas Admin e Manager podem criar novos boards
- **Frontend**: Botão "Novo Board" visível apenas para Admin/Manager
- **Resposta 403**: Endpoint retorna erro claro se vendedor tentar criar via API
- EmptyState ajustado para mostrar mensagem apropriada

#### Restrição de Criação e Reordenação de Listas
- **Backend**: Apenas Admin e Manager podem criar listas
- **Frontend**: Botão "Nova Lista" visível apenas para Admin/Manager
- **Botões de reordenação**: Setas de mover lista (esquerda/direita) ocultas para vendedores
- Prop `canManageLists` passada para KanbanList component
- Documentação clara na API (resposta 403)

### 🔧 Melhorias de Usabilidade

#### Modal de Cliente
- **Campo renomeado**: "Nome" → "Empresa" para maior clareza
- **Ícone atualizado**: User → Building (ícone de prédio)
- **Hint atualizado**: "Razão social ou nome da empresa"
- **Placeholder atualizado**: "Ex: Empresa LTDA"
- Reduz confusão entre nome da empresa e nome da pessoa

#### CPF/CNPJ Obrigatório
- **Campo CPF/CNPJ agora é obrigatório** no cadastro de clientes
- **Validação de tamanho**: Verifica se tem 11 dígitos (CPF) ou 14 (CNPJ)
- **Mensagens de erro claras**:
  - "CPF/CNPJ é obrigatório"
  - "CPF/CNPJ inválido. CPF deve ter 11 dígitos e CNPJ 14 dígitos"
- Hint atualizado para "Documento de identificação (obrigatório)"

### 🐛 Correções

#### Atualização de Campos no CardDetails
- **Problema**: Ao editar campo na seção Resumo, página recarregava e fechava a seção
- **Solução**: Implementada atualização otimista com estado local
- **Resultado**: Experiência fluida sem perda de contexto

#### Performance na Busca de Clientes/Pessoas
- **Problema**: Modal carregava 10.000 registros ao abrir, causando lentidão
- **Solução**: Busca apenas quando usuário digita, com limite de 100 resultados
- **Resultado**: Abertura instantânea do modal, busca rápida

### 📝 Arquivos Modificados

#### Backend
- `app/api/v1/endpoints/boards.py` - Permissões de criação de board e lista
- `app/repositories/person_repository.py` - Ajuste para permitir null values
- `app/services/automation_service.py` - Proteção contra sobrescrever vendedores/SDRs

#### Frontend
- `src/pages/Boards.tsx` - Restrição de criação de boards
- `src/pages/KanbanBoard.tsx` - Restrição de criação e reordenação de listas
- `src/components/kanban/KanbanList.tsx` - Prop canManageLists
- `src/pages/CardDetails.tsx` - Função handleOptimisticUpdate
- `src/components/cardDetails/SummarySection.tsx` - Uso de atualização otimista
- `src/components/cardDetails/ClientSection.tsx` - Botão cadastrar + busca sob demanda
- `src/components/cardDetails/ContactSection.tsx` - Botão cadastrar + busca sob demanda
- `src/components/clients/ClientModal.tsx` - CPF/CNPJ obrigatório + label "Empresa"
- `src/layouts/MainLayout.tsx` - Versão atualizada para 1.1.4

---

## [1.1.3] - 2026-02-09

### ✨ Novas Funcionalidades

#### Sistema de Rodízio de SDRs
- **Nova ação de automação**: `assign_sdr_round_robin` para distribuir cards automaticamente entre SDRs
- **Componente visual**: Node configurável no editor de automações com seleção de SDRs participantes
- **Backend**: Implementada função `_assign_sdr_round_robin` que gerencia rodízio equilibrado via estado da automação
- **Frontend**:
  - Avatar e dropdown de SDR no CardDetails para atribuição manual
  - Filtro por role "sdr" na configuração do rodízio
  - Cores cyan/blue para diferenciar SDR de vendedor
  - Ícone UserPlus com borda cyan no ActionNode

#### Busca Global de Cards
- **Novo componente**: GlobalSearch.tsx no MainLayout para buscar cards em todos os boards
- **Endpoint**: `/api/v1/cards/search/global` com busca por título
- **Funcionalidades**:
  - Debounce de 300ms para otimizar requisições
  - Atalho de teclado: Ctrl+K (Windows) / Cmd+K (Mac)
  - Dropdown com resultados mostrando: título, board/lista, responsável, valor
  - Limite configurável de resultados (padrão: 10)
  - Respeita permissões (vendedor vê apenas seus cards)

#### Sistema de Tipos de Atividade Simplificado
- **Removidos tipos**: email, lunch, deadline (desnecessários no fluxo atual)
- **Adicionado tipo**: follow_up (acompanhamento/retorno ao cliente)
- **Tipos finais** (5): call, meeting, task, follow_up, other
- Grid responsivo ajustado para nova quantidade de tipos

#### Melhorias na Seção Foco para Reuniões
- **Campos editáveis adicionados**:
  - Anotações (textarea) - para registrar pontos importantes da reunião
  - Link da gravação (input URL) - para vincular gravação do Google Meet/Zoom
- **Removido**: Campo "Local" (não utilizado no fluxo)
- **Botão NoShow**: Novo botão para reuniões não realizadas
  - Cor laranja para destaque visual
  - Dispara automação ID 12 (configurável)
  - Move card automaticamente para lista 25 (Reagendamento)
  - Marca atividade como concluída

### 🔧 Melhorias Técnicas

#### Backend
- **Automação**: Novo ActionType `ASSIGN_SDR_ROUND_ROBIN` no enum de ações
- **Estado persistente**: Rodízio de SDR mantém estado em `automation.state["round_robin_last_sdr_id"]`
- **Filtro de usuários**: Busca apenas usuários com `role = "sdr"` para rodízio de SDRs
- **Endpoint de busca**: Query otimizada com filtro por título usando ILIKE

#### Frontend
- **NodeConfigPanel**: Carrega todos os usuários ativos e aplica filtro específico por role na renderização
  - Rodízio de Vendedores: filtra `role === "salesperson"`
  - Rodízio de SDRs: filtra `role === "sdr"`
- **CardDetails**:
  - Estados gerenciados para dropdown e loading de SDR
  - Funções `handleChangeSdr` e `handleAutoAssignSdr` (comentado por enquanto)
  - Variável `sdrUsers` filtra apenas SDRs para dropdown
- **FocusSection**:
  - Import de `automationService` para disparar automações
  - Função `handleNoShow` dispara automação e marca atividade concluída
  - Campos `notes` e `video_link` adicionados ao formulário de edição

### 🐛 Correções

#### Filtro de Usuários em Automações
- **Problema**: NodeConfigPanel carregava apenas vendedores e gerentes, excluindo SDRs
- **Solução**: Removido filtro prematuro, agora carrega todos os usuários ativos e aplica filtro específico por tipo de rodízio
- **Impacto**: Rodízio de SDRs agora exibe corretamente a lista de SDRs disponíveis

### 📝 Arquivos Modificados

#### Backend
- `app/schemas/automation.py` - Adicionado ASSIGN_SDR_ROUND_ROBIN ao ActionType enum
- `app/services/automation_service.py` - Implementada função _assign_sdr_round_robin
- `app/schemas/card_task.py` - Ajustado enum TaskType (removidos 3 tipos, adicionado follow_up)
- `app/api/v1/endpoints/cards.py` - Novo endpoint /search/global

#### Frontend
- `src/components/automations/NodesSidebar.tsx` - Adicionado node "Rodízio de SDRs"
- `src/components/automations/NodeConfigPanel.tsx` - Configuração de SDR round robin + fix de filtros
- `src/components/automations/ActionNode.tsx` - Ícone e cor cyan para assign_sdr_round_robin
- `src/components/cardDetails/QuickActivityForm.tsx` - Tipos de atividade simplificados
- `src/components/cardDetails/FocusSection.tsx` - Campos editáveis e botão NoShow para reuniões
- `src/components/GlobalSearch.tsx` - Novo componente de busca global (criado)
- `src/layouts/MainLayout.tsx` - Integração do GlobalSearch no header
- `src/pages/CardDetails.tsx` - Avatar/dropdown de SDR + funções de atribuição
- `src/services/cardService.ts` - Método globalSearch adicionado
- `src/types/index.ts` - Tipos já existentes (sdr_id, sdr_name, sdr)

---

## [1.1.2] - 2026-02-06

### Adicionado

#### Página de Documentação Customizada da API (`/api-docs`)
- **Nova página de vitrine profissional** da API, estilo Stripe/Twilio API docs
- Página HTML auto-contida servida pelo FastAPI em `/api-docs`
- Carrega dinamicamente o `/openapi.json` e renderiza tudo via JavaScript
- **Identidade visual** replicando o frontend (dark theme, gradients slate-950, Tailwind CSS)
- **CDNs utilizados**: Tailwind CSS 3.4, Lucide Icons, Marked.js, Google Fonts (Inter, JetBrains Mono)

#### Funcionalidades da Página
- **Header fixo**: Logo com gradient cyan-blue, nome, versão da API, links para Swagger/ReDoc/OpenAPI JSON
- **Sidebar fixa (w-72)**: Busca com debounce (200ms), atalho Ctrl+K, índice das 21 categorias com contagem de endpoints, scroll spy com IntersectionObserver
- **Hero section**: Descrição da API em Markdown renderizado, cards de estatísticas (endpoints/schemas/categorias), base URL com botão copiar
- **21 categorias** com ícones Lucide mapeados individualmente
- **Cards de endpoint colapsáveis** com:
  - Badge colorido por método HTTP (GET=emerald, POST=blue, PUT=amber, DELETE=red, PATCH=orange)
  - Path em monospace, summary e description (Markdown)
  - Tabela de parâmetros (nome, tipo, in, obrigatório, descrição)
  - Request body com JSON example, syntax highlighting e botão copiar
  - Responses por status code (colapsáveis com botão copiar)
  - Campos do schema em `<details>` expansível
- **Responsivo**: Sidebar esconde em mobile com overlay e botão menu hamburger
- **Skeleton loader** enquanto carrega o OpenAPI JSON
- **Tratamento de erro** caso a API não responda

### Melhorias Técnicas

#### Backend
- **Diretório `app/static/`** criado para servir arquivos estáticos (CSS, JS, imagens)
- **`StaticFiles` montado** via `app.mount("/static", ...)` após include_router
- **Rota `/api-docs`** com `include_in_schema=False` (não aparece no Swagger)
- **Logo** copiada do frontend para `app/static/logo.png`
- **Zero mudanças no Docker** necessárias (volume mount já cobre `app/static/`)

#### Documentação da API - 3 Formas de Acesso
- `/docs` -- Swagger UI (interativo com "Try it out")
- `/redoc` -- ReDoc (referência limpa e navegável)
- `/api-docs` -- Página customizada (vitrine profissional) **[NOVO]**

### Arquivos Criados
- `backend/app/static/api-docs.html` -- Página HTML completa (~600 linhas)
- `backend/app/static/logo.png` -- Logo copiada do frontend

### Arquivos Modificados
- `backend/app/main.py` -- Imports (os, FileResponse, StaticFiles), mount de estáticos e rota /api-docs

---

## [1.1.1] - 2026-02-05

### ✨ Novas Funcionalidades

#### Filtro de Status no Board
- **Novo filtro de status** no painel de filtros do Kanban
- Opções disponíveis:
  - **Apenas Abertos** (padrão) - Mostra apenas cards em aberto (não ganhos nem perdidos)
  - **Todos** - Exibe todos os cards incluindo ganhos e perdidos
  - **Apenas Ganhos** - Filtra somente negócios ganhos
  - **Apenas Perdidos** - Filtra somente negócios perdidos
- **Melhoria de performance**: Por padrão, carrega apenas cards abertos, evitando carregar milhares de cards ganhos/perdidos desnecessariamente
- Integrado ao sistema de filtros existente (lista, vendedor, valor, data)

### 📊 Importação de Dados

#### Importação de Deals do Pipedrive
- **4.202 deals importados** do funil "Novas Vendas" do Pipedrive
- **Distribuição inteligente** por status:
  - 1.410 negócios ganhos → Lista 32 (Negócio Ganho)
  - 2.536 negócios perdidos → Lista 33 (Negócio Perdido)
  - 123 leads novos → Lista 22 (Lead Novo - Board Prospecção)
  - 133 em diagnóstico → Lista 30 (Diagnóstico e Proposta - Board Aquisição)
- **3.578 pessoas criadas** automaticamente durante importação
- Preservação de dados: valores, datas, motivos de perda, canais de aquisição
- Mapeamento de proprietários para usuários do sistema
- Sistema de verificação de duplicados por título e data de criação
- Pipedrive Deal ID armazenado em `contact_info` para referência

#### Scripts de Importação
- `clean_deals_csv.py` - Limpeza e filtragem do CSV exportado do Pipedrive
- `import_deals_to_cards.py` - Importação de deals para o sistema como cards
- Commits parciais a cada 100 deals para segurança
- Estatísticas detalhadas ao final do processo

### 🐛 Correções

#### Tipos TypeScript
- Corrigido tipo `Card.is_won` de `boolean` para refletir corretamente o comportamento da API
- Adicionado `Card.is_lost` que estava faltando no tipo
- Sincronização entre schema Pydantic do backend e interfaces TypeScript do frontend

#### Filtros do Board
- Ajustada lógica de filtro para trabalhar corretamente com booleans retornados pela API
- Correção na detecção de cards abertos: `!is_won && !is_lost`

### 🔧 Melhorias Técnicas

#### Backend
- Validador do schema `CardResponse` converte corretamente Integer (0/1/-1) para Boolean
- `is_won: 0` → `is_won: false, is_lost: false` (aberto)
- `is_won: 1` → `is_won: true, is_lost: false` (ganho)
- `is_won: -1` → `is_won: false, is_lost: true` (perdido)

#### Frontend
- Estado `statusFilter` com valor padrão "open" para melhor experiência
- Filtro integrado à função `filterCards()` existente
- UI responsiva com SelectMenu component

### 📝 Documentação

- Atualizado `HISTORICO-DESENVOLVIMENTO.md` com seção completa sobre Blueprint da Consultora
- Removido `BLUEPRINT-AJUSTES.md` (conteúdo incorporado ao histórico)
- Arquivo `deals_novas_vendas_clean.csv` gerado com 4.204 deals limpos e filtrados

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
