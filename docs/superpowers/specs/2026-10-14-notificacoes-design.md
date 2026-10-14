# Notificações que chegam a quem precisa — design

**Data:** 14/10/2026
**Status:** aprovado em conversa, aguardando revisão do documento

## Por que

Diagnóstico feito em produção em 14/10/2026 (últimos 30 dias):

- **93% dos avisos são "Card atribuído a você"** (385 de 414), e o código não confere se quem atribuiu foi a própria pessoa. Dos casos rastreáveis, 81 eram a pessoa sendo avisada da própria ação e 4 vinham de outra pessoa.
- **O aviso mais valioso se perde.** Lead do site chega com o mesmo título genérico e é lido 0–22% das vezes. E é distribuído justamente para quem não lê o sino: Gislayne, Adriana e Eduardo têm 100% dos avisos não lidos (Eduardo acumula 506). O Eduardo nunca registrou tarefa em 64% dos leads do site dos últimos 60 dias.
- **Os lembretes nunca funcionaram.** Card vencido, tarefa vencendo, transferência, falha de automação e a limpeza semanal usam `send_notification_task.delay()` do Celery; produção não tem worker (o `Dockerfile.prod` só sobe o uvicorn).
- **Configurações > Notificações é decorativa.** Os botões ficam em estado local e "salvar" é um `console.log`. A tabela `user_notification_settings` existe, tem uma linha e nenhum emissor consulta.
- **Serviço/Cobrança e gestores não recebem nada.**
- **O sino mostra notificações falsas** (`getMockNotifications`) quando a API falha.
- 3.766 notificações desde janeiro, nunca apagadas.

## Decisões

| Tema | Decisão |
|---|---|
| Aviso da própria ação | Ninguém recebe, em nenhum tipo |
| Lead do site | Aviso próprio e destacado quando chega. Sem cobrança/escalonamento |
| Lembretes | Resumo da manhã (8h, seg a sex) **e** aviso 15 min antes — este só para **reuniões** |
| Serviço | Lembretes (resumo) **e** aviso de card novo por board, agrupado |
| Gestores | Nada por enquanto |
| Obrigatórios | "Novo lead do site" e "Card atribuído a mim" não podem ser desligados |
| Limpeza | Notificações **lidas** apagadas após **30 dias** |
| Lançamento | Notificações existentes marcadas como lidas (sino zerado) |
| Arquitetura | Um ponto central de envio + agendador que já roda na API (sem Celery) |

Por que só reuniões no aviso de 15 min: no último mês foram 65 ligações agendadas à mão por dia útil (~10 por vendedor) contra 2,4 reuniões no time todo. Ligações entram no resumo da manhã.

## Os avisos

| Tipo (id) | Quando dispara | Quem recebe | Desligável | Leva para |
|---|---|---|---|---|
| `lead_site` — Novo lead do site | Card criado por usuário de integração e distribuído para um vendedor | O vendedor | **Não** | O card |
| `card_atribuido` — Card atribuído a mim | Alguém (ou a distribuição automática) põe você como vendedor ou SDR | O vendedor/SDR | **Não** | O card |
| `tarefa_para_mim` — Tarefa criada para mim | Outra pessoa cria uma tarefa para você | Responsável pela tarefa | Sim | O card |
| `produto_no_card` — Produto no meu card | Outra pessoa adiciona ou remove produto | Vendedor do card | Sim | O card |
| `reuniao_pronta` — Gravação e análise prontas | Fim do processamento da reunião do CRM | Vendedor e SDR do negócio | Sim | O card |
| `resumo_manha` — Resumo da manhã | Seg a sex, 8h | Vendas: responsável pelas tarefas. Serviço: quem criou as atividades | Sim | Vendas: `/activities`. Serviço: `/servicos/calendario` |
| `reuniao_15min` — Reunião em 15 minutos | 15 min antes de reunião (`MEETING`) não concluída nem cancelada | Responsável pela reunião | Sim | O card |
| `card_novo_servico` — Card novo no board | Card novo em Serviços ou Cobrança (integração ou manual) | Quem acompanha o board, menos quem criou | Sim, por board | 1 card: o card. Vários: o board |

**Lead do site sai uma vez só.** Quando o card é do tipo lead do site, a distribuição gera `lead_site` em vez de `card_atribuido`.

**Resumo da manhã:** "Hoje: 4 ligações, 1 reunião, 3 e-mails · 12 atrasadas". Quem não tem nada para hoje nem atrasado não recebe. Quem trabalha nos dois mundos recebe um resumo só, com as duas contagens.

**Card novo no board, agrupado a cada 5 min:** um card → "Novo card em Serviços: TRANSPORTES SILVA — OS 1234"; vários → "101 cards novos em Cobrança". Em 01/10/2026 chegaram 101 cards de Cobrança de uma vez.

**Deixam de existir:** `card_overdue`, `task_due_soon`, `transfer_*`, `automation_failed`, `badge_earned`, `points_awarded`, `card_moved` e o aviso "Cliente demonstrou interesse" (tipo `info`, `cards.py`), que nunca disparou.

## Ponto central de envio

`notificar(db, destinatario_id, tipo, titulo, mensagem, link, metadata, autor_id)` é o único caminho para criar notificação. Decide nesta ordem:

1. `autor_id == destinatario_id` → não avisa.
2. Destinatário inativo → não avisa.
3. Tipo obrigatório → avisa.
4. Preferência do tipo desligada → não avisa.

Os tipos ficam numa lista única no código (id, rótulo, descrição, ícone, cor, obrigatório, coluna de preferência). A tela de Configurações é montada a partir dela — a tela não pode oferecer um aviso que não existe.

Passam a usar `notificar`: `card_service` (criação, atualização e `assign_card`), `automation_service` (distribuição), `card_task_service`, `product_service`, `recording_service`, e o novo aviso de Serviço. `NotificationRepository.create` deixa de ser chamado direto pelos serviços.

## Dados (uma migration)

**`user_notification_settings`** (tabela existente):
- ficam: `task_assigned` (= `tarefa_para_mim`), `card_product_changed` (= `produto_no_card`);
- entram: `reuniao_pronta`, `resumo_manha`, `reuniao_15min`, `popup_navegador` (todos `true` por padrão) e `quadros_servico` (JSON com ids de board);
- saem: `card_moved`, `achievement_unlocked`, `task_due_soon`;
- obrigatórios não têm coluna.

**`quadros_servico` padrão:** boards onde a pessoa registrou atividade nos últimos 60 dias; usuário de Serviço sem histórico acompanha os dois. Com os dados de hoje: André → Cobrança, Ellen → Serviços, Letícia → os dois. Calculado no `get_or_create`, sem nomes no código.

**`cards.created_by_id`** (nova, nullable, FK `users`): preenchida na criação. Cards antigos ficam nulos.

**`users.is_integracao`** (nova, boolean, padrão `false`): `true` para os usuários de integração, marcados pelo e-mail na migration: `integracao@healthsafetytech.com` (cria os leads do site) e `gestorhs.integracao@healthsafetytech.com` (cria os cards de Serviço). Pelo e-mail, e não pelo id, porque o homo é cópia de produção mas um ambiente novo não teria os mesmos ids.

**Lançamento:** a migration marca todas as notificações existentes como lidas (`is_read = true`, `read_at = agora`).

## Agendador

APScheduler que já roda na API (`app/workers/scheduler.py`, fuso `America/Sao_Paulo`), gravando direto no banco.

| Job | Quando | O que faz |
|---|---|---|
| `resumo_manha` | Seg a sex, 08:00 | Conta tarefas (`card_tasks`, por `assigned_to_id`) e atividades (`service_card_activities`, por `user_id`, `category='atividade'`) de hoje e atrasadas, não concluídas nem canceladas |
| `reuniao_15min` | A cada 1 min | Reuniões com início entre agora+10 e agora+16 min, ainda não avisadas |
| `cards_novos_servico` | A cada 5 min | Cards de Serviço criados e ainda não avisados, agrupados por board |
| `limpar_notificacoes` | Diário, 03:00 | Apaga as lidas com `read_at` há mais de 30 dias |

**Nunca duas vezes:** cada aviso guarda no `notification_metadata` a que se refere (`resumo_de` = data; `task_id`; `service_card_ids`). Antes de criar, o job confere se já existe aviso daquele tipo para aquela referência. Reiniciar a API ou rodar o job de novo não duplica.

**Saem do agendador** os jobs que dependem do Celery para avisar: `check_overdue_cards`, `check_overdue_tasks`, `check_pending_transfers`, `report_failed_automations` e `cleanup_notifications` (este substituído por `limpar_notificacoes`).

## Telas

**Sino (`NotificationDropdown`):**
- `lead_site` com cor e ícone próprios e o nome do contato no título;
- sem `getMockNotifications`: em erro, "Não foi possível carregar as notificações";
- pop-up do navegador só se `popup_navegador` estiver ligado; ao ligar, o navegador pede permissão.

**Configurações > Notificações**, por perfil:

| Bloco | Vendedor / SDR | Serviço | Admin / Gestor |
|---|---|---|---|
| Sempre ativos (cadeado): lead do site, card atribuído | ✓ | — | ✓ |
| Vendas: tarefa para mim, produto no card, reunião pronta | ✓ | — | ✓ |
| Lembretes: resumo da manhã, reunião em 15 min | ✓ | só o resumo | ✓ |
| Serviço: acompanhar Serviços / Cobrança | — | ✓ | ✓ |
| Canal: pop-up do navegador | ✓ | ✓ | ✓ |

Cada botão salva ao clicar, com confirmação curta. Some o bloco "Canais" de hoje (e-mail, push, in-app) e os tipos que não existem.

**API:** `GET/PUT /api/v1/users/me/notification-settings` com os campos novos. O `PUT` ignora/recusa campos de tipos obrigatórios.

## Testes

- `notificar`: própria ação, inativo, obrigatório com preferência desligada, preferência desligada.
- `resumo_manha`: contagem Vendas e Serviço, quem não tem nada não recebe, não repete no mesmo dia, respeita a preferência.
- `reuniao_15min`: janela, só `MEETING`, ignora concluída/cancelada, não repete.
- `cards_novos_servico`: 1 card e vários agrupados, só para quem acompanha o board, não avisa quem criou, não repete.
- `limpar_notificacoes`: só lidas com mais de 30 dias.
- Emissores: lead do site sai como `lead_site` e não como `card_atribuido`; atribuir a si mesmo não avisa; tarefa/produto seguem avisando outra pessoa.
- Preferências: padrão de `quadros_servico` pelo histórico; obrigatórios não desligáveis pela API.
- Frontend: TypeScript limpo; roteiro de teste no homo antes de produção.

## Fora do escopo

- Avisos para gestores.
- Cobrança/escalonamento de lead parado.
- E-mail como canal (o sistema não envia e-mail hoje).
- Tempo real por SSE no sino (continua o polling de 30 s).
