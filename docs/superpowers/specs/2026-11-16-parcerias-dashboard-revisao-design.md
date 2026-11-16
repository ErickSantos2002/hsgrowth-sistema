# Dashboard de Parcerias no padrão dos outros dashboards — design

**Data:** 16/11/2026 · **Versão alvo:** 1.11.27 · **Migration:** nenhuma

## Problema

O Dashboard de Parcerias (`DashboardParcerias.tsx`) tem cara diferente dos dashboards de SDR,
Vendas e Serviços:
- uma linha de cards e um gráfico de barras mensal (com "Este mês", vira uma barra só);
- nenhuma visão do funil, da conversão ou do que precisa de atenção.

Os outros dashboards têm, nesta ordem:
1. seções com título pequeno em maiúsculas ("VISÃO GERAL · período");
2. dois gráficos lado a lado (evolução em linha e pipeline por etapa);
3. uma faixa de conversão;
4. "ATENÇÃO · RISCOS" em vermelho, com cards que abrem a lista.

## Decisões (aprovadas no chat de 16/11)

- A estrutura copia a dos outros dashboards. O conteúdo muda por perfil.
- **Quem vê o quê não muda**:
  - H&S (admin, gerente, Financeiro) vê tudo;
  - a empresa vê as dela;
  - o hunter vê as próprias, com a carteira à parte;
  - o vendedor da equipe vê só as dele, sem comissão.
- **Não há** visão do Responsável H&S.
- Conversão **sem histórico de etapas**, porque a mudança de etapa só fica gravada como texto
  em `PartnerActivity`.
- A abordagem é ampliar o `GET /parcerias/dashboard`, que já existe, em vez de criar um endpoint
  novo. Assim a regra de escopo continua num lugar só.

## Escopo de cada perfil (as oportunidades que entram nas seções novas)

| Perfil | Oportunidades |
|---|---|
| H&S | Parceiros não excluídos. Os filtros de hunter e empresa restringem como já fazem hoje nas vendas. |
| Empresa (`partner`) | `partner_id` = a própria empresa |
| Hunter | `partner_id` = o próprio hunter. As oportunidades da carteira **não** entram, porque o hunter não as enxerga. |
| Vendedor da equipe | `partner_id` = a empresa **e** `seller_member_id` = o membro do login |

Oportunidade excluída nunca entra.

## Seções

### 1. Visão geral · período

| Card | Regra |
|---|---|
| Oportunidades novas | `created_at` no período, em dias de São Paulo |
| Em negociação | Abertas **agora**: etapa diferente de ganho e perdido, e elegibilidade diferente de rejeitada. Mostra a quantidade e, embaixo, o valor (produtos − desconto, sem frete, a mesma base do "valor vendido"). |
| Vendas / Minhas vendas | Igual a hoje: ganho confirmado no período, sem locação |
| Vendas da carteira | Só o hunter; igual a hoje |
| Valor vendido | Igual a hoje |
| Ticket médio | Igual a hoje |
| Comissões pendentes e pagas | Igual a hoje. O vendedor da equipe não vê, e a API continua sem esses campos para ele. |

### 2. Gráficos lado a lado
- **Evolução das vendas** (linha): o valor vendido mês a mês nos **6 meses** que terminam no mês do
  fim do período (sem fim, o mês de hoje em São Paulo). Meses sem venda aparecem com zero.
  - Para o hunter, soma as vendas próprias e as da carteira, como o gráfico de hoje.
  - O campo `serie` da API é **substituído** por `evolucao`.
- **Pipeline por etapa** (barras): as oportunidades em negociação por etapa, nas 5 etapas abertas
  (Novo Lead, Oportunidade, Proposta, Negociação, Aguardando Pedido). Todas aparecem, mesmo com 0.
  O tooltip mostra o valor.

### 3. Conversão (no período)
- **Taxa de fechamento** = ganhos ÷ (ganhos + perdidos).
  - Ganho: `won_confirmed_at` no período, venda **ou locação**, porque locação também é
    negócio fechado.
  - Perdido: etapa perdido e `lost_at` no período.
- **Taxa de elegibilidade** = validadas ÷ (validadas + rejeitadas), pelo `eligibility_at` no período.
- **Tempo médio até o ganho**, em dias com 1 casa: da `created_at` até a `won_confirmed_at`, sobre os
  ganhos do período.
- Sem base (divisão por zero ou nenhum ganho), o valor é `null` e a tela mostra "—".
- As taxas vêm em percentual com 1 casa (66.7).

### 4. Atenção · riscos
Cada risco é `{total, itens}`. Os itens vão até 50, cada um com `id`, `titulo`, `empresa`,
`detalhe`, `quando` e `link`. O card mostra o total; ao clicar, abre a lista, e cada linha leva à
oportunidade ou ao parceiro.

Para todos os perfis:
- **Perdendo a proteção:** oportunidade em negociação, de parceiro não bloqueado, cuja data de
  queda (`data_de_queda`, a mesma conta dos alertas da 1.11.26) cai entre agora e daqui a
  3 dias de calendário de São Paulo. Ordem: a que cai primeiro. Com a regra de proteção em 0 dias,
  a lista fica vazia.
- **Atividades vencidas:** oportunidade em negociação com atividade (`category="atividade"`) não
  concluída cujo `due_date` já passou. Ordem: a atividade mais atrasada primeiro.

Só para a H&S:
- **Ganho a confirmar:** etapa ganho sem `won_confirmed_at`.
- **Elegibilidade em análise:** `eligibility_status="em_analise"` e etapa diferente de perdido.
- **Convites sem ativação:** parceiro em "convidado" há 23 dias ou mais, contados do primeiro login
  (mesma conta dos alertas). O link leva ao parceiro no board de Aquisição.

### 5. Blocos de cada perfil (não mudam)
- **H&S:**
  - rankings de empresas e de hunters;
  - empresas paradas;
  - comissões por tipo.
- **Hunter:**
  - a carteira;
  - as comissões por tipo.
- **Empresa:**
  - as vendas por vendedor;
  - as unidades indicadas;
  - as comissões por tipo.

## Arquitetura

### Backend
- O arquivo novo `app/services/parcerias/dashboard_secoes.py` faz as contas das seções novas
  (resumo, pipeline, conversão e riscos) sobre um `Escopo(partner_ids, seller_member_id)`.
- `app/services/parcerias/dashboard.py`:
  - cada `painel_*` monta o escopo do perfil e junta as seções;
  - `_serie` dá lugar a `_evolucao`, que cobre a janela de 6 meses.
- `app/services/notificacoes/parcerias.py` expõe, para os dois lados usarem a mesma conta:
  - `dia_local` e `convidado_desde`, que hoje são privados;
  - `prazos_em_aberto(db, ids)`, que hoje é uma consulta dentro de `avisar_protecao`.
- Schemas novos em `app/schemas/parcerias.py`:
  - `DashResumo`, `DashEtapa`, `DashConversao`, `DashRiscoItem`, `DashRisco`, `DashRiscos` e
    `DashRiscosHS`;
  - as 4 visões trocam `serie` por `evolucao` e ganham `resumo`, `pipeline`, `conversao` e
    `riscos`.

### Frontend
- `DashboardParcerias.tsx` passa a ter as seções na ordem acima, com o mesmo visual de
  `DashboardVendedor.tsx`:
  - títulos `h2` em `text-xs uppercase tracking-wider`;
  - cards de conversão centralizados, em `text-2xl font-bold text-emerald-500`;
  - riscos em vermelho, laranja e amarelo;
  - a lista de cada risco abre numa modal (`BaseModal`).
- Os tipos vão para `services/parceriasService.ts`.

## Testes
Ficam em `tests/unit/test_parcerias_dashboard_secoes.py`. São testes de serviço, sem a fixture
`client`, com `AGORA` fixo e chamando os `painel_*` direto. Cobrem:
- o resumo e o pipeline: as 5 etapas em ordem; rejeitada e fechadas ficam de fora; a contagem
  das novas no período;
- a conversão, incluindo a locação no fechamento, os itens fora do período e as bases vazias;
- a evolução: a janela de 6 meses e os meses zerados; sem fim do período, o mês de `AGORA`;
- a proteção (3 dias entra, 4 não, a já perdida não) e as atividades vencidas;
- os riscos só da H&S, e que os outros perfis não recebem essas chaves;
- o escopo de cada perfil e os filtros de hunter e empresa da H&S;
- o hunter: a evolução soma a carteira e o pipeline não.

Os testes atuais que olham `serie` passam a olhar `evolucao`.

## Fora do escopo
- Histórico de etapas e funil entre etapas.
- Visão do Responsável H&S.
- Meta e comparação com o período anterior.
