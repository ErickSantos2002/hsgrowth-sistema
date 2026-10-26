# Lembrete de reunião por e-mail aos participantes — Design

**Data:** 26/10/2026
**Módulo:** Vendas (reuniões `CardTask` do tipo MEETING — Daily e Teams criados pelo CRM)

## Problema
O convite chega aos participantes quando a reunião é criada. Depois disso, o cliente só é lembrado
se o próprio calendário dele tiver lembrete — o CRM avisa apenas o organizador, no sininho, 15 min
antes. O time pediu um e-mail no dia e outro 1 hora antes, para reduzir faltas.

## Regras (decididas com o usuário)
| Tema | Decisão |
|---|---|
| Quais reuniões | Só de **Vendas** (`CardTask`), criadas pelo CRM: **Daily e Teams** |
| Quem recebe | **Todos** os convidados (clientes e colegas) |
| Lembrete do dia | **8h (Brasília)** do dia da reunião |
| Reunião antes das 9h | **Sem** lembrete do dia — só o de 1 hora |
| Lembrete de 1 hora | 1 hora antes do início |
| Remetente | Conta Outlook de quem organizou (a mesma do convite) |

## Comportamento
- **Elegível:** `task_type = MEETING`, não concluída, não cancelada, com `due_date`, com convite
  enviado (`teams_event_id` preenchido) e com convidados.
- **Convidados:** `invited_emails`; se vazio (reuniões antigas), o mesmo fallback do convite
  (vendedor do card + e-mails do contato). Remove o e-mail do próprio organizador. Aplica a trava
  `DAILY_DEV_MODE` (`_filtrar_convidados`), igual ao convite.
- **Lembrete do dia:** sai entre **8h00 e 8h30** de Brasília (folga para o agendador atrasar), para
  reuniões **desse dia** que começam **às 9h ou depois**. Reunião criada depois das 8h30 não recebe
  — o convite acabou de chegar.
- **Lembrete de 1 hora:** sai quando faltam **entre 55 e 65 minutos**. Não sai se a reunião foi
  criada a menos de 1 hora do início (convite recente).
- **Uma vez só e remarcação:** cada lembrete guarda o `due_date` para o qual foi enviado. Só envia
  se o guardado for diferente do `due_date` atual — remarcou, vale de novo.
- **Falha:** se o organizador não tem conta Microsoft válida ou o Graph recusa, não tenta de novo
  (marca como tratado) e registra no histórico do card que não foi enviado. Nunca derruba o agendador.
- **Histórico do card:** "Lembrete de reunião (hoje às 14:00) enviado para a@x.com, b@y.com" ou o
  motivo da falha.

## Conteúdo do e-mail
- **Assunto (dia):** `Lembrete: {título} — hoje às 14:00`
- **Assunto (1h):** `Começa em 1 hora: {título} — às 14:00`
- **Corpo:** saudação curta, assunto, quando (horário de Brasília), duração, **link para entrar**
  (Daily: `{FRONTEND_URL}/entrar/{public_access_token}`; Teams: `teams_join_url`), "se precisar
  remarcar, é só responder este e-mail" e a assinatura do organizador (igual ao convite). Tudo
  escapado (título/pauta vêm do usuário).

## Modelo de dados (1 migration)
Colunas novas em `card_tasks`:
| Coluna | Tipo | Uso |
|---|---|---|
| `invite_organizer_id` | int FK users (SET NULL), nulo | quem enviou o convite (remetente do lembrete) |
| `reminder_day_sent_for` | datetime, nulo | `due_date` para o qual o lembrete do dia saiu |
| `reminder_1h_sent_for` | datetime, nulo | `due_date` para o qual o lembrete de 1h saiu |

`invite_organizer_id` passa a ser gravado nos dois fluxos (Daily e Teams). Reuniões antigas: usa
`created_by_id`, depois `assigned_to_id`.

## Código
- `app/services/notificacoes/lembrete_reuniao.py`: seleção das reuniões, convidados, corpo, envio
  (via `microsoft_graph_service.send_email`) e registro no histórico.
- `app/workers/scheduler.py`: job a cada minuto (`_rodar_aviso`), como o de 15 minutos.
- `card_tasks.py`: gravar `invite_organizer_id` nos dois fluxos.

## Testes
Seleção (dia/1h/janelas/antes das 9h/criada em cima da hora), remarcação reenvia, não duplica,
cancelada/concluída não envia, fallback de convidados, remove o organizador, falha registra e não
repete, corpo com link certo (Daily e Teams) e escapado. Envio do Graph simulado (sem internet).

## Fora do escopo
Reuniões de Serviço; reuniões marcadas direto no Outlook/Teams; lembrete por WhatsApp/SMS.
