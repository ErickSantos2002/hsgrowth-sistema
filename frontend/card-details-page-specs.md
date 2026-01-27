# Página de Detalhes do Card - Especificações

## 📋 Visão Geral

Página de detalhes completa de um card do CRM, inspirada no layout do Pipedrive, oferecendo uma interface familiar aos vendedores com todas as informações e ações necessárias para gerenciar negócios.

---

## 🎨 Layout Principal

### Estrutura Geral
- **Layout dividido em duas colunas:**
  - Coluna esquerda: 30% da largura (barra lateral de informações)
  - Coluna direita: 70% da largura (área de atividades e histórico)

---

## 📊 Header da Página

### Elementos do Header

#### Lado Esquerdo
- **Botão de Retorno**
  - Ícone: Seta para esquerda (←)
  - Ação: Retornar ao board/funil de origem
  - Comportamento: Navega para o board do qual o card faz parte

- **Título do Card**
  - Exibição: Nome/título do negócio
  - Editável: Clique inline para editar
  - Formatação: Fonte grande, peso semibold

#### Lado Direito
- **Avatar do Responsável**
  - Exibição: Foto/iniciais do responsável pelo card
  - Dropdown: Permite alterar o responsável
  - Tooltip: Nome completo ao passar o mouse

- **Botões de Ação**
  - **Botão "Ganho"**
    - Cor: Verde (#22c55e)
    - Ação: Marca o negócio como ganho e move para etapa final
    - Requer: Confirmação e preenchimento de campos obrigatórios
  
  - **Botão "Perdido"**
    - Cor: Vermelho (#ef4444)
    - Ação: Marca o negócio como perdido
    - Requer: Motivo da perda (dropdown ou campo de texto)

#### Breadcrumb (Logo abaixo do header principal)
- **Estrutura:** `Nome do Board > Nome da Lista/Etapa`
- Formatação: Texto menor, cor secundária
- **Clicável:** Abre modal/dropdown para movimentar rapidamente o card para outra lista/etapa
- **Funcionalidade:** Permite mover o card entre etapas do funil sem precisar arrastar no board
- **Comportamento ao clicar:**
  - Exibe dropdown com lista de boards disponíveis
  - Ao selecionar board, mostra as etapas/listas desse board
  - Botões "Cancelar" e "Salvar" para confirmar a movimentação
  - Visualização do progresso no funil (etapas já concluídas em verde)

---

## 📋 Coluna Esquerda (30%) - Informações do Card

Contém seções expansíveis/recolhíveis (Expand/Collapse) com scroll vertical quando necessário.

### 1. Resumo
**Status:** Expandido por padrão

**Conteúdo:**
- Valor do negócio (R$) - *Campo calculado automaticamente baseado nos produtos, somente leitura com ícone de lápis desabilitado quando há produtos vinculados*
- Probabilidade de fechamento (%)
- Data esperada de fechamento
- Organização/Empresa vinculada
- Pessoa de contato principal
- Tags/Etiquetas
- Data de criação
- Tempo no funil (idade do card)

**Ações rápidas:**
- ~~Editar valor~~ *Valor é editável apenas quando não há produtos cadastrados*
- Definir probabilidade
- Adicionar/editar data de fechamento
- Adicionar organização
- Adicionar etiquetas
- Adicionar sequência de vendas

**Observação importante:**
- Quando produtos são adicionados ao card, o valor total é calculado automaticamente
- O campo de valor fica desabilitado (somente leitura) quando há produtos
- Para editar o valor, é necessário remover todos os produtos primeiro

### 2. Detalhes / Preencher
**Status:** Recolhido por padrão

**Conteúdo:**
- Campos personalizados do board/funil
- Campos obrigatórios destacados
- Diferentes tipos de campo:
  - Texto simples
  - Texto longo
  - Número
  - Moeda
  - Data
  - Dropdown/Select
  - Múltipla escolha
  - Checkbox
  - URL

**Funcionalidades:**
- Validação em tempo real
- Indicadores de campos obrigatórios (*)
- Máscaras de entrada (telefone, CPF, CNPJ, CEP)
- Salvamento automático ou manual

### 3. Fonte
**Status:** Recolhido por padrão

**Conteúdo:**
- **Tipo de criação:**
  - Manual (ícone de usuário)
  - Automático via API (ícone de engrenagem/robô)
  
- **Se Manual:**
  - Nome do usuário que criou
  - Avatar do usuário
  - Data e hora de criação
  - Departamento/equipe do usuário

- **Se Automático:**
  - Nome da integração/API
  - Ícone da plataforma de origem
  - Data e hora de criação
  - Dados adicionais do webhook/integração
  - ID externo (se aplicável)

### 4. Cliente (Organização/Empresa)
**Status:** Expandido por padrão

**Conteúdo:**
- Nome da empresa
- CNPJ
- Endereço completo
- Telefone principal
- E-mail corporativo
- Website
- Segmento/Setor de atuação
- Número de funcionários
- Faturamento anual

**Ações:**
- Editar informações
- Visualizar histórico de negócios com esta empresa
- Adicionar nova organização
- Link para página completa da organização

### 5. Informação de Contato (Pessoa)
**Status:** Expandido por padrão

**Conteúdo:**
- Nome completo da pessoa
- Cargo/Posição
- E-mail(s)
  - Comercial
  - Pessoal
  - Alternativo
- Telefone(s)
  - Comercial
  - Celular/WhatsApp
  - Alternativo
- LinkedIn (link direto)
- Outras redes sociais

**Ações:**
- Editar informações
- Adicionar nova pessoa de contato
- Link para página completa da pessoa
- Botões de ação rápida:
  - Ligar (integração com telefonia)
  - WhatsApp
  - E-mail
  - LinkedIn

### 6. Visão Geral
**Status:** Recolhido por padrão

**Conteúdo:**
- **Métricas do negócio:**
  - Idade do card (dias desde criação)
  - Tempo na etapa atual
  - Tempo médio em cada etapa anterior
  - Taxa de progresso (%)
  - Número de interações totais

- **Atividades principais:**
  - Última atividade realizada
  - Próxima atividade agendada
  - Total de atividades (concluídas/pendentes)
  - Taxa de conclusão de atividades

- **Timeline resumida:**
  - Movimentações entre etapas
  - Marcos importantes
  - Alterações de valor
  - Alterações de data prevista

- **Indicadores de saúde:**
  - Status de atividades (atrasadas, no prazo)
  - Tempo sem contato
  - Alertas/avisos (ex: "Sem atividade há 7 dias")

**Componentes visuais:**
- Gráfico de barras: tempo em cada etapa
- Ícones de status com cores (verde/amarelo/vermelho)
- Mini calendário com próximas atividades

### 7. Produto
**Status:** Expandido por padrão (quando há produtos cadastrados)

**Conteúdo:**
- Lista de produtos vinculados ao card
- Cada produto exibe:
  - Nome do produto
  - SKU/Código do produto
  - Quantidade
  - Valor unitário (R$)
  - Desconto (% ou R$)
  - Valor total da linha (quantidade × valor unitário - desconto)
  - Botão de remover produto (ícone de lixeira)

**Ações:**
- **Botão "+ Adicionar produto"**
  - Abre modal/dropdown de busca de produtos
  - Busca por nome, SKU ou código
  - Ao selecionar produto:
    - Campo de quantidade
    - Campo de desconto (opcional)
    - Valor unitário é preenchido automaticamente do cadastro
    - Botão "Adicionar"

- **Botão "+ Adicionar parcelamento"** (desabilitado/cinza por padrão)
  - Disponível apenas quando há produtos cadastrados
  - Permite definir condições de pagamento
  - Opções:
    - À vista
    - Parcelado (número de parcelas)
    - Entrada + parcelas
    - Condições customizadas

**Cálculos automáticos:**
- Subtotal (soma de todos os produtos)
- Desconto total (se aplicável)
- **Valor total do card** (subtotal - descontos)
- O valor total é automaticamente sincronizado com o campo "Valor do negócio" na seção Resumo

**Regras:**
- Quando produtos são adicionados, o campo de valor na seção Resumo fica travado (somente leitura)
- Para editar o valor manualmente, todos os produtos devem ser removidos
- A adição de produtos registra no histórico
- Cada alteração de quantidade/desconto atualiza o valor total

**Estados visuais:**
- Lista vazia: Mostra apenas o botão "+ Adicionar produto"
- Com produtos: Tabela/lista organizada com totalizadores
- Carregando produtos: Skeleton/loading state

**Integração com cadastro de produtos:**
- Os produtos vêm do cadastro da empresa
- Campos do cadastro de produto:
  - Nome
  - Descrição
  - SKU/Código
  - Categoria
  - Valor padrão
  - Unidade de medida
  - Status (ativo/inativo)
  - Imagem (opcional)

---

## 📱 Coluna Direita (70%) - Atividades e Histórico

### Sistema de Abas (Tabs)

**Abas disponíveis (alinhadas horizontalmente no topo):**

1. **Atividade** (aba padrão selecionada)
   - Ícone: Calendário/Check
   - Badge: Número de atividades pendentes

2. **Anotações**
   - Ícone: Lápis/Nota
   - Badge: Número de anotações

3. **Agendador de reuniões**
   - Ícone: Calendário com pessoas
   - Funcionalidade: Agendar reuniões com cliente

4. **Arquivos**
   - Ícone: Clipe/Pasta
   - Badge: Número de arquivos anexados

---

### Área de Criação Rápida (abaixo das abas)

**Comportamento:** Muda conforme a aba selecionada

#### Aba "Atividade" selecionada:

**Componente de Adição Rápida:**
```
[ Clique aqui para adicionar uma atividade... ]
```

**Ao clicar, expande um formulário:**
- Campo de título da atividade
- Tipos de atividade (botões):
  - Ligação
  - Reunião
  - Tarefa
  - Prazo
  - E-mail
  - Almoço
  - Outro
- Seletor de data e hora
- Campo de duração
- Seletor de prioridade (Normal/Alta/Urgente)
- Campo de descrição/notas
- Opções adicionais:
  - Adicionar localização
  - Adicionar chamada de vídeo
  - Adicionar descrição
  - Marcar como feito
- Status (Livre/Ocupado)
- Participantes (adicionar pessoas)
- Vincular negócio/organização
- Botões: "Cancelar" | "Salvar"

#### Aba "Anotações" selecionada:

**Componente de Adição Rápida:**
```
[ Digite sua anotação aqui... ]
```

**Editor de texto com:**
- Formatação básica (negrito, itálico, lista)
- Menções (@usuário)
- Anexar arquivos à anotação
- Visibilidade (privada/pública)
- Botão "Adicionar anotação"

**Funcionalidades:**
- As anotações ficam visíveis no Pipedrive apenas para convidados do evento
- Salvar como rascunho
- Converter anotação em atividade

#### Aba "Arquivos" selecionada:

**Componente de Upload:**
- Área de drag & drop
- Botão "Selecionar arquivos"
- Limite de tamanho exibido
- Tipos de arquivo aceitos
- Preview após upload
- Adicionar descrição ao arquivo

---

### Seção "Foco" (Atividades Pendentes)

**Localização:** Logo abaixo da área de criação rápida

**Funcionalidades:**
- Toggle "Expandir todos os itens" (canto superior direito)
- Exibe apenas atividades NÃO concluídas
- Ordenação padrão: por data (mais próxima primeiro)

**Estrutura de cada atividade pendente:**

```
[ ] Tipo de Atividade
    VENCIDO/HOJE/AMANHÃ - Data - Usuário responsável - Pessoa de contato
    [Botão expandir "..." para ver detalhes]
```

**Ao expandir uma atividade:**
- Descrição completa
- Localização (se aplicável)
- Link de videochamada (se aplicável)
- Notas adicionais
- Botões de ação:
  - Marcar como concluído
  - Editar
  - Excluir
  - Reagendar

**Indicadores visuais:**
- Atividade atrasada: badge vermelho "VENCIDO"
- Atividade hoje: badge amarelo "HOJE"
- Atividade futura: data normal
- Ícones diferentes por tipo de atividade
- Prioridade alta: borda vermelha/ícone de alerta

**Estados interativos:**
- Hover: destaque suave
- Checkbox para marcar como concluído
- Menu de ações (três pontos) para editar/excluir

---

### Seção "Histórico"

**Localização:** Abaixo da seção "Foco"

**Sub-abas do Histórico (tabs secundárias):**

1. **Todos** (padrão)
   - Mostra todas as atividades, anotações e mudanças
   - Ordenação cronológica reversa (mais recente primeiro)

2. **Atividades (X)**
   - Número entre parênteses indica total
   - Apenas atividades realizadas/concluídas
   - Filtros: tipo de atividade, período, responsável

3. **Anotações (X)**
   - Apenas anotações criadas
   - Filtros: período, autor

4. **Arquivos**
   - Lista de todos os arquivos anexados
   - Visualização em grid ou lista
   - Informações: nome, tamanho, data de upload, uploader
   - Preview inline para imagens/PDFs

5. **Registro de alterações**
   - Log completo de todas as mudanças no card
   - Quem alterou, quando e o que foi alterado
   - Comparação antes/depois (para campos importantes)

**Estrutura dos itens no histórico:**

```
┌─────────────────────────────────────────────────────┐
│ [Ícone Tipo] Título da Atividade/Anotação           │
│ Status (se atividade) - Data - Hora - Usuário      │
│ Pessoa de contato (se aplicável)                    │
│                                                      │
│ Descrição/Conteúdo da anotação...                  │
│                                                      │
│ [Editar] [Excluir] [Mais opções]                   │
└─────────────────────────────────────────────────────┘
```

**Funcionalidades do histórico:**
- Scroll infinito (carrega mais ao rolar)
- Filtros avançados:
  - Período de data
  - Tipo de evento
  - Responsável/Autor
  - Status (concluído/pendente/atrasado)
- Busca por texto dentro do histórico
- Exportar histórico (PDF/CSV)
- Imprimir histórico

**Tipos de eventos registrados:**
- ✓ Atividade concluída
- ⏰ Atividade criada
- ✏️ Atividade editada
- 🗑️ Atividade excluída
- 📝 Anotação adicionada
- 📎 Arquivo anexado
- 💰 Valor alterado
- 🛒 Produto adicionado/removido
- 🔄 Movido para outra etapa
- 👤 Responsável alterado
- 🏢 Organização alterada
- 📅 Data de fechamento alterada
- 🏷️ Tags adicionadas/removidas

---

## 🎨 Design System e Componentes

### Padrão de Edição de Campos

**Todos os campos editáveis seguem o mesmo padrão:**
- Exibição padrão: Campo em modo leitura (texto normal)
- Ícone de lápis (✏️) à direita do campo
- **Ao clicar no lápis:**
  - Campo se transforma em input editável
  - Foco automático no campo
  - Botões de ação aparecem: "Cancelar" e "Salvar"
  - Ou: Salvamento automático ao perder o foco (blur)
- Hover no campo: destaque sutil indicando que é editável

**Exemplos de campos com ícone de lápis:**
- Título do card
- Valor do negócio (R$) - *somente leitura quando há produtos*
- Data de fechamento
- Probabilidade
- Todos os campos personalizados
- Informações da organização
- Informações de contato

### Paleta de Cores

**Cores principais:**
- Primária (ações positivas): #3b82f6 (azul)
- Sucesso (ganho): #22c55e (verde)
- Erro (perdido): #ef4444 (vermelho)
- Aviso (atrasado): #f59e0b (amarelo/laranja)
- Neutro: #6b7280 (cinza)

**Cores de fundo:**
- Background principal: #ffffff
- Background secundário: #f9fafb
- Background hover: #f3f4f6
- Borda padrão: #e5e7eb

### Tipografia

**Hierarquia:**
- H1 (Título do card): 24px, semibold
- H2 (Títulos de seção): 18px, semibold
- H3 (Sub-títulos): 16px, medium
- Body: 14px, regular
- Small: 12px, regular

### Espaçamentos

**Padding padrão:**
- Seções expandíveis: 16px
- Cards de atividade: 12px
- Campos de formulário: 8px

**Margin padrão:**
- Entre seções: 16px
- Entre elementos: 8px

### Componentes Reutilizáveis

#### Expand/Collapse Section
```
┌─ [▼] Título da Seção ──────────────────────────┐
│                                                  │
│  Conteúdo expandido...                          │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### Card de Atividade
```
┌──────────────────────────────────────────────────┐
│ [✓] [Ícone] Nome da Atividade           [...]   │
│     Status - Data - Responsável                  │
│                                                  │
│     Descrição quando expandido...                │
│     [Editar] [Excluir]                          │
└──────────────────────────────────────────────────┘
```

#### Badge de Status
```
[VENCIDO]  [HOJE]  [AMANHÃ]  [CONCLUÍDO]
```

#### Avatar
```
┌────┐
│ AB │  ou  [Foto]
└────┘
```

---

## 🔧 Funcionalidades Técnicas

### Validações
- Campos obrigatórios antes de marcar como "Ganho"
- Validação de e-mail e telefone
- Validação de datas (não permitir datas passadas para novas atividades)
- Validação de valor monetário (apenas números positivos)
- **Validação de produtos:**
  - Quantidade deve ser maior que zero
  - Não permitir valor unitário negativo
  - Desconto não pode ser maior que o valor do produto
  - Não permitir adicionar produtos duplicados (mesmo SKU)

### Permissões
- Editar card: apenas responsável e admin
- Visualizar: todos da equipe
- Marcar como ganho/perdido: apenas responsável e admin
- Adicionar anotações privadas: apenas criador da anotação

### Integrações
- API de telefonia (click-to-call)
- WhatsApp Business API
- Google Calendar / Outlook Calendar
- Sistema de produtos da empresa (cadastro interno)

### Performance
- Lazy loading do histórico (carrega mais ao scrollar)
- Cache local de dados do card
- Debounce em campos de busca e auto-save
- Otimização de imagens/arquivos

### Responsividade
- Mobile: layout em coluna única (stack vertical)
- Tablet: ajuste de proporções (40%/60%)
- Desktop: layout padrão (30%/70%)

---

## 📱 Comportamentos e Interações

### Auto-save
- Campos editados salvam automaticamente após 2 segundos de inatividade
- Indicador visual de "salvando..." e "salvo"

### Notificações em tempo real
- Atualização quando outro usuário edita o mesmo card
- Notificação de nova atividade atribuída
- Alerta de atividade próxima do vencimento

### Drag & Drop
- Arquivos podem ser arrastados para a área de upload
- Atividades podem ser reordenadas (opcional)

### Atalhos de Teclado
- `Ctrl/Cmd + S`: Salvar alterações
- `Ctrl/Cmd + K`: Buscar no histórico
- `Esc`: Fechar modal/cancelar edição
- `Ctrl/Cmd + Enter`: Salvar atividade/anotação

### Loading States
- Skeleton screens ao carregar
- Spinners para ações assíncronas
- Transições suaves entre estados

---

## 🎯 Considerações Finais

Este documento serve como guia completo para a implementação da página de detalhes do card. A estrutura foi pensada para:

1. **Familiaridade**: Vendedores já conhecem o layout do Pipedrive
2. **Eficiência**: Todas as informações importantes estão acessíveis rapidamente
3. **Organização**: Separação clara entre informações estáticas (esquerda) e dinâmicas (direita)
4. **Escalabilidade**: Fácil adicionar novas funcionalidades
5. **Flexibilidade**: Seções expand/collapse mantêm a interface limpa

A implementação deve priorizar a experiência do usuário, mantendo o sistema rápido e responsivo mesmo com muitos dados históricos.