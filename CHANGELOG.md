# Changelog — HSGrowth CRM

Todas as mudanças notáveis neste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.8.0] — 15/04/2026

### Corrigido
- **NoShow:** o card agora é movido corretamente para a lista "Reagendamento" do board atual. Antes a movimentação falhava silenciosamente por depender de uma automação hardcoded (ID 12) que não existia, e a busca da lista não filtrava pelo board correto.

### Melhorado
- **NoShow:** após confirmar, a página recarrega automaticamente para refletir a nova posição do card no pipeline.

---

## [1.7.9] — 15/04/2026

### Adicionado
- **Horário por etapa na cadência:** ao configurar um template, cada etapa agora tem campo de horário (HH:MM). A task gerada automaticamente é agendada para o horário definido — permitindo separar atividades de manhã das de tarde.

---

## [1.7.8] — 15/04/2026

### Adicionado
- **Integração e-mail + cadência:** atividades do tipo E-mail criadas pela cadência aparecem no Foco com botão "Enviar E-mail". Ao clicar, o compositor abre diretamente (sem trocar de aba) e o envio conclui a tarefa automaticamente avançando a cadência.
- **Tipo E-mail no formulário de criação rápida:** agora é possível criar atividades de e-mail manualmente pelo formulário rápido no card.

### Melhorado
- **Compositor de e-mail:** modal abre instantaneamente — e-mails do contato são buscados em background com indicador de carregamento, sem travar a interface.

---

## [1.7.7] — 15/04/2026

### Corrigido
- **Indicador "Parado 3d+":** agora qualquer movimentação no histórico conta — mudança de etapa, tarefa criada/concluída ou anotação. Antes, apenas tarefas e notas eram consideradas, ignorando mudanças de etapa recentes.
- **Cards recém-adicionados ao board** nunca entram na contagem de parados, pois a entrada na etapa já conta como movimentação.

---

## [1.7.6] — 14/04/2026

### Adicionado
- **Novo tipo de atividade LinkedIn**: disponível ao criar atividades no card, com ícone e cor azul-céu em todo o sistema.
- **Conclusão Válida / Não Válida**: o botão "Concluir" foi substituído por dois botões — **Válido** (atividade realizada com sucesso) e **Não Válido** (tentativa sem resultado, ex: ligação não atendida). Ambos concluem a atividade e avançam a cadência normalmente. Gamificação pontua apenas para conclusões válidas. Badge diferenciado exibe "Concluída — Válida" ou "Concluída — Não Válida".

---

## [1.7.5] — 14/04/2026

### Corrigido
- **Seção Foco (card):** horário da atividade agora é exibido junto à data — ex: `14/04/2026 09:00` em vez de apenas `14 abr.`
- **Dashboard — Atividades no Período:** contagem corrigida para considerar apenas atividades **concluídas**, usando a data de conclusão (`completed_at`) em vez da data de criação. Anteriormente atividades pendentes e não concluídas entravam na contagem.

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
