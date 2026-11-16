# Parcerias — Entrega 4: Alertas (proteção do CNPJ e convite sem ativação)

**Data:** 16/11/2026 · **Versão alvo:** 1.11.26 · **Roadmap:** Entrega 4 de `2026-10-29-parcerias-entrega-1-design.md`

## Objetivo

Avisar, pelo sino do CRM e por e-mail:

1. quem trabalha uma **oportunidade de parceiro** que está para perder a proteção do CNPJ
   (N dias sem atividade, N = `cnpj_rules_config.protection_days`) e quando ela perde;
2. a H&S e quem indicou, quando uma **empresa ou hunter convidado** não aceita os termos
   em 30 dias.

Os dois avisos podem ser ligados/desligados por usuário em Configurações → Notificações.
Nada do que já existe em Vendas e Serviço muda.

## Decisões (conversa de 16/11)

| Pergunta | Decisão |
|---|---|
| O que acontece no dia 30 sem ativação | **Só avisa.** A situação continua "Convidado"; a H&S decide reenviar ou bloquear. |
| Canal | **Sino + e-mail.** |
| Quando avisar a perda de proteção | **3 dias antes** e **no dia em que perdeu**. |
| Configurável | **Sim**, um interruptor por aviso (desliga sino e e-mail juntos). |
| Mecanismo | Tarefa diária no APScheduler (o mesmo dos avisos atuais), às 8h de Brasília, **todos os dias** (o prazo conta dias corridos). |

## 1. Oportunidade perto de perder a proteção

**Entram:** `partner_opportunities` não excluídas, `stage` fora de `ganho`/`perdido`,
`eligibility_status != "rejeitada"`. Se `protection_days == 0` (regra desligada), nada é
avisado.

**Data em que a proteção cai** (mesma regra de `semaforo.protegido`, olhando para a frente):

```
base = max(last_activity_at, created_at, due_date das atividades em aberto com data)
cai_em = base + N dias
```

Atividade em aberto = `partner_activities` com `category == "atividade"` e
`is_completed == False`; sem `due_date` não conta. Função pura `data_de_queda(prazos,
movimentos, dias) -> Optional[datetime]` em `semaforo.py`, ao lado de `protegido`, com a
garantia: `protegido(agora, ...) == (cai_em is not None and agora < cai_em)` — testada.

**Avisos** (tipo `parcerias_protecao`):

| Quando (rodada das 8h) | Título | Mensagem |
|---|---|---|
| `0 < cai_em − agora ≤ 3 dias` | Oportunidade perde a proteção em X dia(s) | "*{título}* ({empresa}) perde a proteção do CNPJ em dd/mm. Registre uma atividade para manter." |
| `agora − 2 dias < cai_em ≤ agora` | Oportunidade perdeu a proteção | "*{título}* ({empresa}) ficou sem atividade por N dias. O CNPJ ficou livre para outros parceiros e para Vendas." |

- A janela de 2 dias no "perdeu" evita disparar sobre oportunidades paradas há meses quando
  a função entrar no ar (e cobre um dia em que o agendador não rodou).
- `referencia = "parc_protecao:{op_id}:{cai_em:%Y%m%d}:{antes|perdeu}"`. Registrar
  atividade muda `cai_em` → ciclo novo, avisos novos. Reiniciar a API não repete.
- Link: `/parcerias/oportunidades/{op_id}`.

**Destinatários** (sem repetir a mesma pessoa):
- login do vendedor da oportunidade (`seller_member_id` → `partner_team_members.user_id`);
- logins `partner` (dono) e `hunter` com `users.partner_id == op.partner_id`, ativos;
- Responsável H&S do parceiro (`partners.hs_owner_id`).

## 2. Convite sem ativação em 30 dias

**Entram:** `partners` não excluídos com `stage == "convidado"` (empresa ou hunter; os
bloqueados já têm outra situação).

**Convidado desde** = menor `users.created_at` entre os logins com `partner_id == p.id`
(roles `partner` e `hunter`). Sem login → não entra.

**Avisos** (tipo `parcerias_convite`):

| Quando | Título | Mensagem |
|---|---|---|
| dias desde o convite ≥ 23 e < 30 | Convite sem ativação | "*{nome}* foi convidado(a) em dd/mm e ainda não aceitou os termos. Faltam X dia(s) para completar 30." |
| dias desde o convite ≥ 30 e < 32 | Convite: 30 dias sem ativação | "*{nome}* completou 30 dias sem aceitar os termos. Reenvie o convite ou bloqueie." |

- Mesma lógica da janela: o aviso do dia 30 só sai até o dia 31, para não disparar sobre
  convites antigos quando a função entrar no ar.
- `referencia = "parc_convite:{partner_id}:{23|30}"`.
- Link: para a H&S `/parcerias/aquisicao/{partner_id}`; para quem indicou
  `/parcerias/indicacoes`.

**Destinatários:**
- Responsável H&S (`hs_owner_id`); se não houver, **todos os admins** ativos;
- quem indicou (`indicated_by_partner_id`): os logins `partner`/`hunter` desse parceiro.

## 3. Catálogo, preferências e e-mail

- `tipos.py` ganha dois tipos, **não obrigatórios**, com coluna:
  - `parcerias_protecao` — "Proteção do CNPJ da oportunidade" — coluna `parcerias_protecao`, ícone `shield-alert`, cor `warning`;
  - `parcerias_convite` — "Convite sem ativação" — coluna `parcerias_convite`, ícone `user-x`, cor `warning`.
- **Migration aditiva:** duas colunas `Boolean NOT NULL server_default true` em
  `user_notification_settings`. Pode ser aplicada antes do código; nenhuma linha existente
  muda de comportamento.
- Schema de preferências (`schemas/user_notification_setting.py`): os dois campos na
  resposta e opcionais no update.
- `notificar()` **não muda**: já respeita a coluna e a `referencia`.
- **E-mail:** só quando `notificar()` devolve a notificação criada (preferência ligada,
  login ativo, ainda não avisado). Usa `envio_email.enviar_email(email, assunto, html,
  texto)`, o mesmo do convite de acesso, com o link absoluto (`FRONTEND_URL` + link).
  Falha no e-mail é registrada no log e não desfaz o aviso do sino.
- Agendador: `job_alertas_parcerias` em `scheduler.py` via `_rodar_aviso`, `CronTrigger(hour=11, minute=0)` (8h de Brasília, UTC−3), todos os dias.
- Código novo em `app/services/notificacoes/parcerias.py`:
  `avisar_protecao(db, agora) -> int`, `avisar_convites(db, agora) -> int` e
  `avisar_parcerias(db, agora) -> int` (soma dos dois, chamado pelo job).

## 4. Tela (Configurações → Notificações)

- Seção nova **"Parcerias"** com os dois interruptores (mesmo `Linha`/`Interruptor`).
- Aparece para: `admin`, `manager`, `partner`, `partner_member`, `hunter` e `salesperson`
  (vendedor pode ser Responsável H&S). As demais seções não mudam.

## 5. Testes

Unitários (SQLite em memória, datas fixas, e-mail com mock):
- `data_de_queda`: sem nada → None; movimento mais recente vence; atividade futura empurra;
  coerência com `protegido` em vários `agora`.
- Proteção: falta 3 dias → avisa os 3 destinatários + Responsável; falta 4 → não; caiu hoje
  → "perdeu"; caiu há 10 dias → nada; rodar duas vezes → um aviso só; atividade nova → ciclo
  novo; ganha/perdida/rejeitada → nada; `protection_days = 0` → nada; preferência
  desligada → nem sino nem e-mail.
- Convite: dia 22 → nada; dia 23 → aviso; dia 30 → aviso de 30; dia 40 → nada; ativado →
  nada; sem Responsável → admins; indicador recebe.
- Preferências: GET devolve os dois campos ligados; PUT desliga um.
- Suíte inteira no fim (hoje 1505 passando).

## Fora do escopo

- Lembrete por e-mail para a própria empresa convidada (o link do convite expira; quem
  reenvia é a H&S).
- Avisos de proteção para cards de Vendas.
- Bloqueio ou expiração automática no dia 30.
