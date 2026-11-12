# Parcerias — Hunter, indicação, comissões e Dashboard de Parcerias

**Data:** 11/11/2026 · **Ambiente:** só homo (como todo Parcerias) · **Migration:** sim
**Quem desenhou:** Erick, com as regras de negócio definidas pelo Nicholson · **Implementa:** Erick
**Substitui/absorve:** revisão da Entrega 3, Entrega 5 (Dashboard de Parcerias) e Entrega 6
(Comissões) do roadmap em `2026-10-29-parcerias-entrega-1-design.md`.
**Base:** tudo que está na `main` até a v1.11.17 (Entrega 3 — acessos e login).

## 1. Por que

O Programa de Parceiros precisa rodar **sem ninguém da H&S operando o board**: não há gerente
para isso e Erick/Welton não vão passar etapas. Quem traz parceiros novos são os **hunters**
(pessoas ou empresas de fora que procuram empresas parceiras) e as próprias empresas parceiras
(quando têm outras unidades). Cada um precisa ver no CRM **quanto vai ganhar**, e o Financeiro
precisa ver **quanto vai pagar a cada um** — pedido do Nicholson.

## 2. Os três acessos (e a H&S)

| Quem | O que é | Quem cadastra | Login |
|---|---|---|---|
| **Hunter** | Pessoa (CPF) ou empresa (CNPJ) de fora que procura empresas parceiras. Também pode vender sozinho. | **Só a H&S** | perfil novo `hunter` |
| **Empresa parceira** | Empresa que vende bafômetros da H&S junto com os produtos dela. | Hunter, H&S ou outra empresa parceira (unidade) | perfil `partner` (já existe — o "dono") |
| **Vendedor da empresa parceira** | Vendedor ou técnico da equipe da empresa. | **Só a empresa parceira** (Equipe → Dar acesso) | perfil `partner_member` (já existe) |
| **H&S** | Admin, gerente, Financeiro. | — | perfis atuais |

### 2.1 Regra única: "quem indicou"

Toda empresa parceira tem **no máximo um indicador**: um hunter, outra empresa parceira, ou
**ninguém** (cadastrada direto pela H&S). O indicador:
- **vê** a empresa indicada e todas as vendas dela (cliente, produto, valor);
- **ganha** sobre as vendas dela (seção 4).

**Só um nível.** Exemplo: o hunter João indica a Empresa A; a Empresa A cadastra a Unidade B.
Quando a Unidade B vende, **só a Empresa A** vê e ganha. O João não tem direito sobre a
Unidade B, porque o cadastro dela não veio dele.

O hunter é, na prática, o mesmo papel de "indicador" que uma empresa assume quando cadastra uma
unidade; a diferença é que o hunter é cadastrado só pela H&S e o foco dele é indicar.

### 2.2 O que cada um vê e faz

**Hunter**
- Vê: as empresas que **ele** indicou (cadastro, situação, vendas de cada uma) e as próprias
  vendas. Nunca empresas de outro hunter nem unidades indicadas pelas empresas dele.
- Faz: cadastra empresa parceira nova (seção 3); cria e trabalha as **próprias** oportunidades
  (venda própria — "ele é o próprio vendedor e a própria empresa"); usa a Consulta de CNPJ;
  vê o Dashboard (aba Parcerias) com a carteira dele e quanto vai ganhar.
- Não faz: não mexe nas oportunidades das empresas indicadas (só vê), não vê a Equipe delas,
  não cria login de equipe.

**Empresa parceira (dono, `partner`)**
- Vê: as próprias oportunidades (incluindo as da equipe), a Equipe, as **unidades que ela
  indicou** e as vendas delas, o Dashboard com quanto vai ganhar.
- Faz: tudo que faz hoje (oportunidades, Equipe, Dar acesso aos vendedores, trocar vendedor)
  + cadastrar empresa parceira nova (unidade), ficando como indicadora.
- Não vê: quem a indicou, nem o que o hunter dela ganha.

**Vendedor da empresa parceira (`partner_member`)**
- Igual à Entrega 3: só as próprias oportunidades e a Consulta de CNPJ.
- No Dashboard vê **o valor das vendas dele**, **sem comissão** (a H&S paga a empresa, que
  repassa do jeito dela; mostrar o % da empresa geraria ruído entre eles).

**H&S**
- Admin/gerente: tudo, cadastro de hunters, tela de percentuais, bloquear empresa/hunter.
- Financeiro: o que já valida hoje (elegibilidade, confirmar/negar ganho) + lista **"A pagar"**
  e marcar pagamento + lançar calibração (seção 4.4).
- Todos veem a aba Parcerias completa, com filtros e rankings (seção 5).

## 3. Entrada de uma empresa parceira — automática

Ninguém da H&S aprova. O controle de risco fica **em cada venda**, onde já existe (Financeiro
valida elegibilidade e confirma o ganho).

1. **Cadastro** por hunter, H&S ou empresa parceira: razão social/nome, CNPJ, responsável
   (nome, e-mail, telefone), chave PIX. O CNPJ é validado (dígitos) e **recusado se já houver
   empresa parceira ativa ou em andamento com o mesmo CNPJ** (mensagem clara, sem revelar de
   quem é). O indicador é gravado automaticamente: quem cadastrou (hunter ou empresa); H&S =
   sem indicador, a menos que a H&S escolha um hunter no cadastro.
2. **Convite** automático ao responsável: cria o login `partner` em modo convite (reusa a
   Entrega 3 — `criacao_de_login`, e-mail pelo Resend, "Copiar link").
3. **Primeiro acesso:** o responsável cria a senha e vê a tela **"Termos do Programa de
   Parceiros"** com o texto vigente e o botão "Li e aceito". Sem aceitar, não entra no resto
   do CRM (mesma mecânica da troca obrigatória de senha: barrado no backend).
4. **Ativação:** o aceite grava **data/hora, quem aceitou (usuário), IP e versão do texto** e
   ativa a empresa na hora — pode cadastrar a equipe e vender. **O aceite substitui o contrato
   assinado** (confirmado pelo Nicholson).
5. **Aviso à H&S** de "parceiro novo" (notificação interna). A H&S pode **bloquear** a empresa
   a qualquer momento: bloqueada, os logins dela e da equipe ficam inativos e ela some das
   listas de quem indicou como "bloqueada".

O hunter segue o mesmo fluxo de convite + aceite (com o texto dos termos do hunter), mas o
cadastro é só pela H&S.

O board **Aquisição de Parceiros** deixa de ter etapas obrigatórias para ativar: vira
acompanhamento (a empresa aparece direto como "Ativado" após o aceite). As travas atuais das
etapas não podem impedir esse fluxo.

## 4. Comissões

### 4.1 Quando gera

Uma comissão é gerada **quando o Financeiro confirma o ganho** da oportunidade (o passo que já
existe). Se o ganho for **negado/desfeito antes do pagamento**, os lançamentos daquela
oportunidade são **cancelados**. Depois de pago, nada é desfeito automaticamente (o Financeiro
ajusta à mão — ver Fora do escopo).

**Só venda (Erick, 11/11):** não há locação para hunter nem empresa parceira neste momento.
A opção **locação some** para os perfis externos (`hunter`, `partner`, `partner_member`): a
modalidade fica fixada em **venda** na tela e o backend recusa (422) locação vinda deles.
Oportunidade de locação que exista (criada pela H&S) **não gera comissão**.

**Base de cálculo (Erick, 11/11):** produtos menos o desconto geral, **sem o frete** (frete é
custo de entrega, não venda).

**Troca de indicador (Erick, 11/11):** só vale dali pra frente. Lançamentos já gerados ficam com
quem era o indicador na época; vendas confirmadas depois da troca geram para o novo indicador. O
prazo de indicação continua contando da primeira venda confirmada da empresa.

### 4.2 Regras (valores editáveis pela H&S)

Percentuais e valores **iguais por tipo**, definidos pela H&S numa tela de configuração
(admin). Os valores reais vêm do Welton; até lá, a tela fica com zero.

| Parâmetro | Quem recebe | Regra |
|---|---|---|
| **Y% — venda própria** | A empresa parceira (venda dela ou da equipe) **ou** o hunter (venda dele) | Sobre toda venda confirmada. **Sem prazo**: enquanto vender, recebe. |
| **X% — indicação** | O indicador (hunter ou empresa) da empresa que vendeu | Sobre toda venda confirmada da empresa indicada, **durante o prazo de indicação**. |
| **Bônus de primeira venda (valor fixo, R$)** | O indicador | Uma vez por empresa indicada, na **primeira venda confirmada** dela. **Soma com o X%** dessa mesma venda. |
| **Prazo de indicação (meses)** | — | Conta **a partir da primeira venda confirmada** da empresa indicada. Padrão provisório **24 meses** (Nicholson: 2 ou 3 anos — confirmar). Venda confirmada depois do prazo não gera X%. |
| **Z% — calibração** | A empresa parceira que vendeu o bafômetro | Sobre cada uma das **2 primeiras calibrações** do aparelho vendido (seção 4.4). |

Regras de convivência:
- Vale para indicador hunter **e** indicador empresa (unidade): mesmas regras.
- Venda do próprio hunter: só Y% (não há indicador sobre ele mesmo).
- Empresa sem indicador (cadastrada pela H&S): só Y%.
- Alterar os percentuais **não muda lançamentos já gerados**: cada lançamento guarda o
  percentual/valor usado no momento.
- Quem recebe é sempre a **empresa** ou o **hunter** — nunca o vendedor da equipe.

### 4.3 Lançamentos e "A pagar"

Cada comissão vira um **lançamento**: beneficiário (empresa ou hunter), oportunidade, tipo
(venda própria · indicação · bônus primeira venda · calibração), base, percentual/valor usado,
valor, data, situação (**pendente · paga · cancelada**), data e autor do pagamento.

- **Financeiro → A pagar:** lançamentos pendentes agrupados por beneficiário (nome, CPF/CNPJ,
  chave PIX, total), com filtro por período; marcar como pago um lançamento ou o total do
  beneficiário de uma vez (grava data e quem pagou). Exportar a lista (CSV/PDF, no padrão de
  exportação que o Dashboard já usa).
- **Hunter e empresa:** veem os próprios lançamentos (pendente/pago) e os totais.

### 4.4 Calibração — só a estrutura

Cada bafômetro vendido pode gerar até **2 lançamentos de calibração** para a empresa que o
vendeu. Nesta entrega **não há integração com o GestorHS**: fica a estrutura pronta e o
**Financeiro lança a calibração à mão** na oportunidade (data, valor da calibração, aparelho
quando houver identificação), e o sistema aplica o Z% e respeita o limite de 2 por aparelho
vendido. As regras finas (como identificar o aparelho, prazo entre venda e calibração,
integração) serão definidas pelo Welton depois — o desenho deve permitir trocar o lançamento
manual por um automático sem refazer o cálculo.

## 5. Dashboard — aba "Parcerias"

Nova aba na página **Dashboard** (`frontend/src/pages/Dashboard.tsx`), liberada para hunter,
`partner` e `partner_member` (hoje a tranca dos perfis externos bloqueia `/dashboard`: liberar
só essa aba e os endpoints dela).

| Quem | Vê |
|---|---|
| Hunter | Empresas da carteira (situação, total vendido, nº de vendas, última venda, "parada há X dias"); quando vence o prazo de indicação de cada uma; próprias vendas; comissões (pendente/paga, por tipo). |
| Empresa parceira | Próprias vendas e as da equipe (por vendedor); unidades indicadas e as vendas delas; comissões (pendente/paga, por tipo). |
| Vendedor do parceiro | Valor e quantidade das próprias vendas. Sem comissão. |
| H&S | Tudo, com **filtros** (período, hunter, empresa) e **rankings** de empresas e de hunters por valor vendido e por nº de vendas, para comparar quem faz mais; totais de comissão pendente/paga. |

"Parada há X dias" usa a data da última oportunidade ou venda da empresa (a Entrega 1 já grava
a última atividade de cada oportunidade).

## 6. Construção em 3 partes (nesta ordem)

1. **Estrutura:** perfil `hunter`, cadastro de hunter (H&S), indicador na empresa parceira,
   cadastro de empresa pelo hunter e pela empresa, termos + aceite + ativação automática,
   bloqueio, visibilidade de cada perfil (backend e telas).
2. **Comissões:** tela de percentuais, geração na confirmação do ganho, prazo de indicação,
   bônus, calibração manual, "A pagar" do Financeiro, comissões na visão de cada um.
3. **Dashboard:** aba Parcerias com as visões da seção 5.

Cada parte vai ao homo e é testada antes da próxima. Versão sobe a cada parte.

## 7. Fora do escopo

- Integração com o GestorHS para calibração (Welton define depois).
- Estorno automático de comissão já paga (venda cancelada/devolvida depois do pagamento):
  o Financeiro resolve à mão.
- Pagamento automático (PIX/transferência pelo sistema): o Financeiro paga fora e marca como pago.
- Nota fiscal/recibo do beneficiário, retenção de impostos.
- Mais de um nível de indicação.
- Finder (Entrega 7) e Alertas (Entrega 4) do roadmap original.
- Texto jurídico dos termos: o sistema guarda e versiona; o texto é fornecido pela H&S.

## 8. Decisões tomadas por mim (Claude) — conferir

Confirmadas pelo Erick em 11/11/2026 ("tudo certo"):

- **Board de Aquisição:** a H&S ainda pode cadastrar uma empresa só para prospecção (sem
  convite) e convidar depois. As situações viram **Potencial** (sem convite) · **Convidado** ·
  **Ativado** (aceitou os termos) · **Bloqueado**. Hunter e empresa sempre cadastram já
  convidando. "Em andamento" para a checagem de CNPJ repetido = qualquer situação que não seja
  Bloqueado. As travas de etapa (`etapas.py`) e a evidência de ativação (`ativacao.py`) deixam
  de decidir a ativação; parceiros já existentes no homo são migrados para a situação
  equivalente (homo só tem teste).
- **Quem da H&S vê comissões, PIX/CPF e o Dashboard completo:** admin, gerente e Financeiro.
  O `salesperson` (Responsável H&S) continua só com os parceiros dele, sem PIX nem comissões.
  `sdr`, `service` e `viewer` não veem a aba Parcerias.
- **Venda própria do hunter:** o hunter é uma linha em `partners` com um tipo `hunter` (CPF ou
  CNPJ), dono das próprias oportunidades. Elas passam pelo mesmo Pipeline de Parceiros,
  elegibilidade, proteção de CNPJ e confirmação de ganho do Financeiro. Hunter aparece no
  ranking de hunters, não no de empresas.
- **Calibração manual:** o Financeiro informa o **número de série** do aparelho; o limite de 2
  calibrações é por número de série vendido. Só gera Z% para a empresa parceira (não para a
  venda própria do hunter).
- **Primeira venda desfeita:** se desfeita antes do pagamento, a próxima venda confirmada vira
  a "primeira" (recebe o bônus e inicia o prazo). Se o bônus já foi pago, a data de início do
  prazo fica fixa. Confirmar o mesmo ganho de novo **não** gera lançamentos duplicados
  (geração idempotente por oportunidade + tipo + beneficiário).
- **Termos:** só o dono da empresa (`partner`) e o hunter aceitam; a equipe não. Parceiros já
  existentes aceitam no próximo login. Versão nova publicada pela H&S (tela simples de admin
  com o texto) exige novo aceite antes de continuar.
- **Bloqueio e dinheiro (Erick, 11/11):** comissão **pendente continua sendo paga**. Bloquear
  um hunter **não** afeta as empresas que ele indicou (continuam funcionando). Decisão minha:
  hunter bloqueado **para de acumular** lançamentos novos (X% e bônus) enquanto estiver
  bloqueado; ao desbloquear, volta a acumular sobre as vendas confirmadas dali em diante.
  Empresa bloqueada: logins inativos, oportunidades abertas ficam paradas; ganho já confirmado
  antes do bloqueio é pago normalmente.

Demais decisões:

- Perfil novo `hunter`, separado de `partner`, trancado como os externos.
- Vendedor da equipe vê o valor das próprias vendas, **sem comissão**.
- CPF/CNPJ e **chave PIX** no cadastro do hunter e da empresa, para o Financeiro pagar.
- Bloqueio pela H&S desativa os logins da empresa e da equipe.
- Comissão cancelada se o ganho for negado antes do pagamento.
- Lançamentos guardam o percentual usado (mudar a configuração não recalcula o passado).
- Prazo de indicação padrão de 24 meses até confirmarem 2 ou 3 anos.

## 9. Pendências com a H&S (não bloqueiam a construção)

- Valores de X%, Y%, Z% e do bônus (Welton).
- Prazo de indicação: 2 ou 3 anos (Nicholson).
- Texto dos termos do hunter e da empresa parceira.
- Regras da calibração e integração com o GestorHS (Welton).

## 10. Ajustes depois da entrega (12/11/2026, testes do Erick no homo)

- **A página Parcerias → Hunters saiu.** O hunter é cadastrado em **Usuários → Novo Usuário**
  (perfil Hunter: CPF ou CNPJ, PIX, convite **ou senha inicial**). O bloqueio fica na edição do
  usuário. Só o admin acessa Usuários, então **o gerente não cadastra mais hunter**.
- **O login de parceiro** também pode ser criado em Usuários (perfil Parceiro), escolhendo uma
  empresa do board de Aquisição. Continua possível criar pelo card.
- **Termos e a configuração das comissões** viraram abas de **Configurações**. A página
  Comissões continua em Parcerias para consulta e pagamento.
- O guia geral do módulo está em `docs/programa-de-parceiros.md`.

