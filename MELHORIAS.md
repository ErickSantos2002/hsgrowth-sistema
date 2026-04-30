# Plano de Melhorias — HSGrowth CRM

Arquivo de referência para melhorias identificadas no frontend.
Consultar antes de iniciar cada sprint de ajustes.

---

## Como usar

- Cada item tem um status: `[ ]` pendente · `[x]` concluído · `[-]` descartado
- Ao implementar um item, marcar como `[x]` e registrar a versão na linha

---

## Prioridade 1 — Rápido e alto impacto

- [ ] **Erros silenciosos** — vários `catch (error) { console.error() }` sem mostrar nada ao usuário. Sempre usar toast de erro. Afeta: `KanbanBoard.tsx`, `CardDetails.tsx`, `SummarySection.tsx` e outros.
- [ ] **IDs hardcoded** — `board_id === 7` (Aquisição) e `board_id === 6` (Prospecção) espalhados em múltiplos componentes. Criar `frontend/src/constants/boardConfig.ts` com as constantes centralizadas.
- [ ] **Loading no Kanban** — colunas aparecem vazias enquanto os cards carregam. Adicionar skeleton loader nas colunas enquanto `loading === true`.
- [ ] **EmptyState nas seções do card** — `ClientSection`, `ContactSection`, `ProductSection` aparecem em branco quando não há dado vinculado. Adicionar mensagem como "Nenhum cliente vinculado" com botão de ação.

---

## Prioridade 2 — UX / Experiência do usuário

- [ ] **Badge de filtros ativos no Kanban** — botão de filtro não mostra quantos filtros estão aplicados. Adicionar badge numérico no ícone.
- [ ] **EmptyState no Kanban sem cards** — quando não há cards na coluna ou no board, não há mensagem explicativa. Usuário novo não entende o que fazer.
- [ ] **EmptyState nas abas do card** — abas de Anotações, Arquivos, Ligações, Reuniões, E-mail vazias não têm feedback. Adicionar empty state em cada uma.
- [ ] **Loading states em modais** — garantir que inputs e botões fiquem `disabled` durante operações assíncronas (upload, save). Evita cliques duplos e múltiplas requisições.

---

## Prioridade 3 — Performance

- [ ] **`Settings.tsx` com 3.568 linhas** — todas as abas em um único arquivo. Separar cada aba em componente próprio e usar `React.lazy()` para carregamento sob demanda.
- [ ] **`React.memo` nas seções do CardDetails** — `SchedulerSection` (1.692 linhas), `FocusSection` (1.064 linhas), `SummarySection` (869 linhas) não têm `React.memo`. Qualquer mudança no card pai rerenderiza tudo.
- [ ] **Requisições paralelas no CardDetails** — ao abrir um card, 4+ `useEffect` disparam simultaneamente. Agrupar com `Promise.all()` em um único efeito.
- [ ] **Lógica de período duplicada** — `KanbanBoard`, `Dashboard` e `Reports` cada um tem seu `getPeriodDates()`. Extrair para `hooks/usePeriodFilter.ts`.

---

## Prioridade 4 — Código / Manutenção

- [ ] **Tipos `any` em campos críticos do Card** — `pending_tasks?: any[]`, `notes?: any[]`, `recent_activities?: any[]`, `products?: any[]` em `types/index.ts`. Criar interfaces específicas: `CardTask[]`, `CardNote[]`, `Activity[]`.
- [ ] **TODOs abandonados**
  - `Boards.tsx` — 6 toasts de feedback não implementados
  - `CardDetails.tsx` — ID de automação hardcoded
  - `Settings.tsx` — preferências de notificação não salvas no backend
- [ ] **`KanbanBoard.tsx` com 1.623 linhas** — extrair lógica de filtros, modais e toolbar em sub-componentes menores.
- [ ] **`CardDetails.tsx` com 1.367 linhas** — extrair lógica de cada aba em componente próprio, montar apenas quando a aba estiver ativa.

---

## Prioridade 5 — Funcionalidades novas

- [ ] **Bulk actions no Kanban** — selecionar múltiplos cards e executar ação em lote (mover lista, alterar vendedor, adicionar tag). Alto impacto para operações massivas.
- [ ] **Busca por ID de card** — digitar `#6101` no GlobalSearch e abrir o card diretamente.
- [ ] **Prioridade no card** — campo `priority: baixa | normal | alta | urgente` no card, visível no Kanban como badge ou cor de borda.
- [ ] **Desfazer ao mover card** — ao arrastar card para outra lista por engano, oferecer toast com botão "Desfazer" por 5 segundos.
- [ ] **Notificações em tempo real** — mudanças feitas por outro usuário só aparecem após refresh. Implementar WebSocket ou SSE para sync.
- [ ] **Campos personalizados por board** — hoje os campos são fixos. Permitir que admin crie campos customizados por board.

---

## Prioridade 6 — Acessibilidade

- [ ] **Aria-labels em botões iconográficos** — botões com apenas ícone (fechar, filtrar, editar) sem texto precisam de `aria-label`.
- [ ] **Foco de teclado visível** — componentes de filtro, dropdown e modais sem estilo `:focus` visível. Adicionar `focus:ring-2` globalmente.
- [ ] **ESC para fechar modais** — modais de upload e edição não respondem à tecla ESC. Adicionar listener `keydown` em todos os modais.

---

## Histórico de conclusões

<!-- Registrar aqui os itens concluídos com versão -->

---

*Última atualização: 30/04/2026*
