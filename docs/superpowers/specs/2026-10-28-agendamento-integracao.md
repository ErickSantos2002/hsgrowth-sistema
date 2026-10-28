# Agendamento de reunião por integração (MarketingHS) — 28/10/2026

Pedido do MarketingHS: `~/github/MarketingHS/docs/pedido-hsgrowth-2026-10-28-agendamento.md`
(design do lado de lá em `docs/superpowers/specs/2026-10-28-agendamento-reuniao-design.md`
daquele repo).

## Contexto

A landing do MarketingHS deixa o lead marcar sozinho uma reunião na sala do Daily com um
vendedor livre. O MarketingHS escolhe o vendedor e cria, como o usuário `integracao2`
(id 28, `is_integracao`, papel manager): card → nota → tarefa de reunião → sala. Card,
nota e tarefa já funcionavam; faltavam ler a agenda, listar vendedores e criar a sala sem
conta Microsoft de quem chama.

## Autenticação

As três rotas usam o **JWT do `POST /auth/client-credentials`** — o mesmo token que o
MarketingHS já usa em cards/tarefas — e exigem `is_integracao` (`require_integracao()`
em `deps.py`; humano recebe 403). Não usam a chave de API (`require_api_scope`) do
GestorHS: o client do MarketingHS não tem chave nem escopos, e obrigar dois mecanismos
num mesmo fluxo não traria segurança a mais.

## Microsoft: token de aplicativo

`MicrosoftGraphService._get_app_token()` — MSAL `acquire_token_for_client` com
`https://graph.microsoft.com/.default`, mesmas `MS_CLIENT_ID/SECRET/TENANT_ID`,
reaproveitado em memória até 2 min antes de expirar.

O alcance vem do **RBAC para aplicativos do Exchange** (`Application Calendars.ReadWrite`
restrita ao grupo de vendedores). **Não** há `Calendars.ReadWrite` de aplicativo no Entra
ID — se houver, vale para o tenant inteiro. Caixa fora do grupo → 403 do Graph, que a
gente trata como erro daquele vendedor.

## Rotas

### `GET /api/v1/integration/vendedores`

`[{"id", "nome", "email", "ativo"}]` — papel `salesperson`, não excluídos, ativos **e**
inativos (o campo diz), sem usuários de integração, por nome.

### `GET /api/v1/integration/agenda?user_ids=19,3&inicio=<ISO c/ fuso>&fim=<ISO c/ fuso>`

```json
{"vendedores": [{"user_id": 19, "email": "...", "ocupado": [
   {"inicio": "2026-10-29T13:00:00Z", "fim": "2026-10-29T14:00:00Z", "status": "busy"}]}],
 "erros": [{"user_id": 3, "motivo": "<mensagem do Graph>"}]}
```

- 422: data sem fuso, `fim <= inicio`, período > 15 dias, `user_ids` inválido/vazio/> 30.
- Só itens não-`free`, status como o Graph devolve; sem assunto/local.
- **Uma chamada `getSchedule` por vendedor**, com ele mesmo no caminho
  (`/users/{email}/calendar/getSchedule`, `schedules=[email]`, `Prefer: outlook.timezone="UTC"`).
  Escolhido no lugar da chamada única do pedido: não depende da política de
  compartilhamento entre caixas e a falha de um não contamina os outros. São poucos
  vendedores.
- Usuário inexistente/inativo/sem e-mail, ou recusa do Graph → `erros`.
- Token do aplicativo indisponível → 503 na resposta inteira.

### `POST /api/v1/card-tasks/{id}/daily-room` por usuário `is_integracao`

- Sem `task.assigned_to` com e-mail → **422 antes de criar a sala**.
- Evento em `POST /users/{email-do-vendedor}/events` com token de aplicativo: organizador =
  vendedor; convidados = `task.invited_emails` (sem o próprio vendedor); `start` =
  `due_date`, `end` = `due_date + duration_minutes` (60 se vazio); corpo =
  `_montar_corpo_convite` assinado pelo **vendedor**; `teams_event_id` gravado.
- Trava `DAILY_DEV_MODE` vale igual (corta e-mail externo; `convidados_removidos` na resposta).
- Falha no Graph → desfaz a sala e **503** com a mensagem do Graph.
- Remarcar pela tela continua funcionando: o evento é do vendedor, e quem remarca é ele,
  com o token delegado dele. Remarcar/cancelar **pela integração** não foi feito (fora do pedido).
- Usuário humano: inalterado.
