# Login, "Parados" clicável e estados das reuniões — design

**Data:** 20/10/2026 · **Status:** aprovado em conversa

Três ajustes pequenos, independentes, numa versão só.

## 1. Mensagem do login

**Hoje:** senha errada mostra "Request failed with status code 401" (`Login.tsx` usa `error.message` do axios). E o interceptor de `api.ts` trata qualquer 401 como sessão vencida: se sobrou `refresh_token` no navegador, tenta renovar e, falhando, redireciona para `/login` — senha errada vira sessão "renovada" ou um recarregamento estranho. Em 16/10 o login só funcionou depois de Ctrl+R.

**Passa a ser:**
- `Login.tsx` mostra `error.response.data.detail` ("Email ou senha incorretos"); sem resposta do servidor, "Não foi possível conectar ao servidor".
- O interceptor não tenta renovar sessão quando o 401 vem de `/auth/login` (ou de `/auth/refresh`): ali 401 é credencial errada, não sessão vencida.

## 2. "Parados" clicável na dashboard

**Hoje:** "Parados +3 dias" (dashboard SDR, `cards_parados`) e "Negócios Parados (7d)" (dashboard Vendedor, `negocios_parados_7d`) são só números. A conta não tira os cards com atividade agendada para hoje ou futura — o board tira desde a v1.10.5 —, então o número da dashboard pode ser maior que o do filtro "Parado 3d+" do board. Em 16/10 foi preciso consultar o banco para achar o card 10945 da Claudia, que estava em Aquisição e não em Prospecção.

**Passa a ser:**
- A regra de "parado" fica numa função só (`report_service`): card aberto (`is_won == 0`), com pelo menos uma tarefa ou anotação, sem tarefa criada/concluída, anotação ou mudança de etapa na janela (3 ou 7 dias úteis) e **sem tarefa não concluída vencendo de hoje em diante** (dia em UTC, igual ao board). O número e a lista usam essa função, com os mesmos filtros de pessoa e visão da dashboard.
- Rota nova `GET /api/v1/reports/dashboard/parados?janela=3|7&user_id=&view=`: até 200 cards, do parado há mais tempo para o mais recente, com card, título, board, lista, vendedor, SDR, última movimentação e dias parado (corridos).
- Clicar no número abre uma janela com a lista; cada linha abre o card.

## 3. Estados da página de Reuniões

**Hoje:** "gravada" aparece quando há vídeo **ou** transcrição sem avaliação. Como a transcrição começa sozinha quando alguém entra na sala, toda reunião do CRM aberta tem transcrição, mesmo vazia — a U&m Mineração (cliente nunca entrou, 0 palavras) e a Monsanto (3 min, 12 palavras) apareciam como "gravada" sem ter vídeo.

**Passa a ser** (em ordem de prioridade):

| Estado | Quando |
|---|---|
| `no-show` | marcada como no-show |
| `avaliada` | tem avaliação (a tela mostra nota e veredito) |
| `cliente não entrou` | reunião do CRM encerrada sem o cliente entrar (`contact_joined_at` vazio) |
| `conversa curta` | tem transcrição que não passa no mínimo da régua (`motivo_para_nao_avaliar`) |
| `gravada` | tem vídeo (`recording_status == "ready"`) |
| `transcrita` | tem transcrição que passa no mínimo, mas não foi avaliada (tipo fora da régua, Teams sem clique) |
| `sem gravação` | nem vídeo nem transcrição |

A API devolve junto um `motivo` (texto curto) para `cliente não entrou` ("Marque como no-show no card") e `conversa curta` (o motivo da régua); a tela mostra ao passar o mouse.

## Fora do escopo

- Mudar a régua de avaliação (500 palavras e duas vozes continuam).
- Marcar no-show automaticamente.
- Mudar os filtros de estado da página de Reuniões.
