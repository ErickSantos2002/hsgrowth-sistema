# Lembrete de reunião por e-mail — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** E-mail de lembrete aos convidados das reuniões de Vendas (Daily e Teams): às 8h do dia
(reuniões a partir das 9h) e 1 hora antes, saindo da conta Outlook de quem organizou.

**Architecture:** Módulo `notificacoes/lembrete_reuniao.py` com uma função
`enviar_lembretes_de_reuniao(db, agora_utc)` chamada a cada minuto pelo agendador (mesmo padrão
de `avisar_reunioes_proximas`). Controle de "já enviado" por colunas em `card_tasks` que guardam o
`due_date` para o qual cada lembrete saiu (remarcou → envia de novo).

**Spec:** `docs/superpowers/specs/2026-10-26-lembrete-reuniao-email-design.md`

**Comandos:** testes `docker exec -w /app hsgrowth-api-local python -m pytest -q -p no:warnings <alvo>`;
typecheck `cd frontend && npx tsc --noEmit`. **Commits só com autorização do usuário.**

---

### Task 1: Migration + modelo
- `backend/alembic/versions/2026_10_26_1000-0a1b2c3d4e5f_lembrete_reuniao.py`
  (`down_revision='f0a1b2c3d4e5'`): `add_column` em `card_tasks` —
  `invite_organizer_id` (Integer, FK users SET NULL, nulo), `reminder_day_sent_for` (DateTime),
  `reminder_1h_sent_for` (DateTime); downgrade remove.
- `backend/app/models/card_task.py`: as três colunas.
- Verificar: `alembic heads` = `0a1b2c3d4e5f`.

### Task 2: Gravar o organizador nos dois fluxos
- `card_tasks.py`: no fluxo Teams (após `task.teams_event_id = ...`) e no Daily
  (`_agendar_evento_daily_no_outlook`, após gravar `teams_event_id`):
  `task.invite_organizer_id = current_user.id`.

### Task 3: Módulo do lembrete (TDD)
`backend/tests/unit/test_lembrete_reuniao.py` primeiro (Graph simulado com monkeypatch em
`microsoft_graph_service.send_email`), cobrindo:
1. 8h05 de Brasília, reunião às 14h hoje → 1 e-mail por convidado, assunto do dia, link do Daily.
2. Reunião às 8h30 → sem lembrete do dia.
3. 7h50 ou 8h40 → fora da janela, nada.
4. Faltando 60 min → lembrete de 1h; faltando 70 ou 50 → nada.
5. Criada há 20 min para daqui a 60 → sem lembrete de 1h.
6. Rodando a cada minuto → um envio só.
7. Remarcada depois do envio → envia de novo.
8. Cancelada / concluída / sem convite (`teams_event_id` vazio) → nada.
9. Sem `invited_emails` → usa vendedor do card + e-mails do contato; nunca envia ao organizador.
10. Teams → link `teams_join_url`; título com HTML vem escapado.
11. Graph levanta `ValueError` → não repete, histórico registra a falha.
12. Histórico do card registra o envio com os destinatários.

Implementação em `backend/app/services/notificacoes/lembrete_reuniao.py`:
- `_organizador(db, task)`, `_convidados(db, task, organizador)`, `_link(task)`,
  `montar_corpo_lembrete(task, organizador, tipo)`, `_enviar(db, task, tipo)`,
  `enviar_lembretes_de_reuniao(db, agora_utc) -> int`.

### Task 4: Agendador
- `workers/scheduler.py`: `job_lembrete_reuniao_email()` → `_rodar_aviso("lembrete de reunião por e-mail", ...)`,
  `IntervalTrigger(minutes=1)`.

### Task 5: Changelog v1.10.20 + verificação
- CHANGELOG.md, ChangelogModal.tsx, rodapé MainLayout (v1.10.20). Nota de deploy: 1 migration.
- Suíte completa verde; `npx tsc --noEmit` = 0. Perguntar "posso commitar?".
