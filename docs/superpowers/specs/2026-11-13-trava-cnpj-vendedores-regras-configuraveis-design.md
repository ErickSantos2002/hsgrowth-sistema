# Trava de CNPJ entre vendedores e regras configuráveis — design

Data: 13/11/2026 · Versão: **1.11.25** · Migration aditiva

## Por quê

A Consulta de CNPJ (Entrega 2 de Parcerias) já mostra vermelho quando outro card de Vendas
está em negociação com o CNPJ, mas a criação de card de Vendas só bloqueia quando o CNPJ está
com um **parceiro**. Dois vendedores conseguem abrir card para a mesma empresa. A spec da
Entrega 2 deixou isso de fora ("conflito entre dois cards de Vendas é da H&S e fica como está
hoje"); agora o usuário quer a trava também entre vendedores, com a gestão liberando por
justificativa, e quer os prazos das regras configuráveis.

## Decisões do usuário (13/11)

- A trava entre vendedores usa **as mesmas 3 regras** do semáforo: em negociação, compra
  recente e perdida há pouco.
- **Card do próprio vendedor não bloqueia.**
- Leads automáticos (RD Station, site, integrações) **não bloqueiam**.
- Admin e gerente liberam **com justificativa**. Isso passa a valer também para a trava do
  parceiro, que hoje deixa a gestão passar sem escrever nada.
- As regras viram configuração, editada **só pelo admin**.

## 1. Regra da trava em Vendas

Vale nos 4 pontos em que a trava do parceiro já age (`card_service.py`):

| Ponto | Rota | Card de origem |
|---|---|---|
| Criar card | `POST /cards` | — |
| Vincular empresa ao card | `PUT /cards/{id}` com `client_id` novo | o próprio card não conta |
| Reabrir card perdido (SDR) | `POST /cards/{id}/reopen` | o card perdido não conta |
| Clonar card | `POST /cards/{id}/clone` | o card clonado não conta |

**Bloqueia** quando existe card de Vendas (tabela `cards`) com **exatamente o mesmo CNPJ**
(14 caracteres, sem máscara) do cliente do card, em uma destas situações (as mesmas da
Consulta, com os dias da configuração):

- **em negociação:** aberto (`is_won == 0`) com atividade em aberto vencida há no máximo N
  dias (ou futura), ou com movimento nos últimos N dias (N = dias de proteção);
- **compra recente:** ganho há menos de N dias;
- **perdida há pouco:** perdido há menos de N dias.

**Não bloqueia:**

- card cujo `assigned_to_id` ou `sdr_id` é o usuário que está criando (card próprio);
- usuário de integração (`is_integracao`: RD Station, site, agente de integração) e a
  importação de planilha (`card_import_service`), como já é com a trava do parceiro;
- outra unidade da mesma raiz (amarelo): continua só como informação na Consulta;
- cards de Serviço (outra tabela; não entram, como no semáforo);
- a configuração "Travar card de Vendas entre vendedores" desligada.

A trava do **parceiro** em Vendas continua como está (só oportunidade de parceiro em
negociação com o mesmo CNPJ); muda só a liberação pela gestão (seção 2).

**Ordem:** se o CNPJ está com parceiro e com outro vendedor, a mensagem fala do parceiro
primeiro (regra 3 da Entrega 2: vale o primeiro registro; o parceiro protege mais).

**Mensagem para quem é bloqueado** (vendedor, SDR):
"Este CNPJ está com Fulano no card "Título" (Board · Etapa): em negociação. Fale com o gerente."
Compra e perda dizem a data em que libera: "...: compra recente, libera em 10/12/2026."

## 2. Liberação pela gestão, com justificativa

- Os 4 pedidos ganham o campo opcional **`cnpj_justificativa`** (até 500 caracteres):
  `CardCreate`, `CardUpdate`, `CardReopenRequest` e um corpo novo e opcional no clone
  (`CardCloneRequest`, sem corpo continua aceito).
- Sem justificativa, a trava responde **409** com `detail` em objeto:
  `{"code": "cnpj_bloqueado", "message": "<mensagem da seção 1>", "pode_liberar": true|false}`.
  `pode_liberar` é true para admin e gerente.
- Admin ou gerente com justificativa preenchida (não vazia): o pedido segue e o card ganha uma
  atividade `parcerias_cnpj` "CNPJ liberado por <nome>: <justificativa> (com <Fulano / parceiro X>)".
- Vendedor ou SDR mandando justificativa: ignorada, continua 409 (só a gestão libera).

**Front:** um ajudante único `comLiberacaoDeCnpj(chamada)` em `frontend/src/components/cards/`:

1. faz a chamada;
2. se vier 409 com `code === "cnpj_bloqueado"`:
   - `pode_liberar` falso: mostra a mensagem num toast de erro e para;
   - `pode_liberar` verdadeiro: abre uma janela (BaseModal) com a mensagem e um campo
     "Justificativa" obrigatório; ao confirmar, repete a chamada com `cnpj_justificativa`.

Usado em: `KanbanBoard.tsx` (criar card), `ClientSection.tsx` (vincular empresa),
`CardDetails.tsx` (reabrir e clonar). O `AvisoParcerias` do card continua igual.

## 3. Configuração das regras

Tabela nova **`cnpj_rules_config`** (uma linha, como `partner_commission_config`):

| Coluna | Tipo | Padrão | Uso |
|---|---|---|---|
| `protection_days` | int ≥ 0 | 10 | dias de proteção da negociação |
| `recent_purchase_days` | int ≥ 0 | 30 | dias de compra recente |
| `recent_loss_days` | int ≥ 0 | 90 | dias de perda recente |
| `daily_query_limit` | int ≥ 1 | 20 | consultas por dia de parceiro e hunter, por login |
| `block_between_sellers` | bool | true | liga a trava da seção 1 |
| `updated_at`, `updated_by_id` | | | quem mudou e quando |

- **0 dias desliga a regra** (proteção 0: card aberto nunca bloqueia; compra 0: compra não
  bloqueia; perda 0: perda não bloqueia). Vale para a Consulta, para a trava do parceiro e para
  a trava entre vendedores.
- Teto: 365 dias; limite de consultas até 1000.
- A migration cria a tabela e a linha com os padrões (o comportamento não muda ao subir).
- Leitura num ponto só: `services/parcerias/regras_cnpj.py` → `regras(db)` devolve os valores
  (cria a linha se faltar). `semaforo.py` e `consultas.py` deixam de usar as constantes
  `DIAS_*` e `LIMITE_CONSULTAS_PARCEIRO` e recebem os valores de `regras(db)`.
- Rotas em `consulta_cnpj.py`:
  - `GET /consulta-cnpj/regras`: quem acessa a Consulta (para o "Como funciona").
  - `PUT /consulta-cnpj/regras`: **só admin** (403 para os outros).
- **Tela:** nova aba **"Consulta de CNPJ"** em Configurações, só para admin, no mesmo formato da
  aba de comissões: 4 números, 1 liga/desliga, Salvar, e "Alterado por X em dd/mm/aaaa".
- **"Como funciona"** (`RegrasSemaforo.tsx`) e a linha do porquê (`ResultadoSemaforo.tsx`)
  passam a mostrar os números da configuração, e explicam a trava entre vendedores.

## 4. Testes (SQLite, `tests/unit/`)

- Trava entre vendedores: bloqueia outro vendedor (negociação, compra, perda); deixa passar o
  dono (responsável ou SDR do card); deixa passar a integração; ignora o card de origem no
  vincular, reabrir e clonar; desligada na configuração, não bloqueia.
- Gestão: 409 com `pode_liberar` sem justificativa; com justificativa cria e registra a
  atividade; vendedor com justificativa continua 409. Vale também para a trava do parceiro
  (ajustar os testes que hoje esperam a gestão passando direto).
- Configuração: só admin altera; 0 dias desliga cada regra; o limite configurado vale na
  Consulta; `GET /regras` devolve os padrões depois da migration.

## Fora do escopo

- Bloquear por outra unidade (raiz) em Vendas.
- Trava em cards de Serviço.
- Notificar o dono do card quando a gestão libera.

## Ordem de subida

Migration aditiva (tabela nova com a linha padrão): pode rodar antes do código. O
comportamento novo (trava entre vendedores) entra **ligado** com o deploy do código.
