# Changelog — HSGrowth CRM

Todas as mudanças notáveis neste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.7.4] — 14/04/2026

### Adicionado
- **Sistema de Cadência Individual por Lead**: admin/gerente configura templates de cadência em Configurações → Cadências (etapas com tipo de atividade, título, descrição, prioridade e dias úteis de prazo). SDR/Vendedor inicia a cadência no card e as atividades são criadas automaticamente conforme cada etapa é concluída.
- Suporte a **pausar, retomar e cancelar** cadência: pausar suspende a criação automática; retomar cria a próxima atividade imediatamente (sem duplicatas); cancelar mantém as tarefas já criadas.
- Indicador visual de progresso da cadência no card: barra de progresso, etapa atual, badge de status (Ativa / Pausada / Concluída).
- Migração: tabelas `cadence_templates`, `cadence_steps`, `card_cadences` e coluna `card_cadence_id` em `card_tasks`.

### Melhorado
- Módulo "Cadências" (disparo de atividades em lote) renomeado para **"Disparo em Lote"** para diferenciar do novo sistema de cadência individual.

---

## [1.7.3] — 14/04/2026

### Adicionado
- Novo tipo de atividade **WhatsApp** disponível ao criar atividades — ícone e cor verde esmeralda em todo o sistema.

### Melhorado
- Calendário (aba Outlook): botão `+ Agendar` agora exibe `+ Agendar Reunião` em roxo e redireciona direto para a aba Reuniões, criando o evento no Teams automaticamente.

---

## [1.7.2] — 14/04/2026

### Corrigido
- Etiqueta "Parado 3d+" não aparece mais em cards sem histórico (recém criados ou importados). Agora só marca como parado cards que já tiveram pelo menos uma atividade ou anotação registrada.

---

## [1.7.1] — 13/04/2026

### Melhorado
- "Parado 3d+" e "Parado 7d+" recalculados: considera atividades registradas e anotações criadas no período, não mais o tempo na mesma etapa.
- Histórico do card: horário exibido ao lado da data em todos os eventos.
- Abas do card: scroll horizontal habilitado no desktop quando a janela é estreita.

### Corrigido
- Seletor de tipo de atividade exibia coluna vazia após remoção — grid ajustado para 4 colunas.

---

## [1.7.0] — 13/04/2026

### Adicionado
- Integração completa com Microsoft Teams: reunião criada no CRM gera evento no Outlook e link Teams automaticamente.
- Login com Microsoft 365 (SSO) via OAuth2.
- Seção de Calendário Outlook no card para visualizar eventos do usuário.

---

## [1.6.11] — versões anteriores

Versões anteriores não foram documentadas neste arquivo.
