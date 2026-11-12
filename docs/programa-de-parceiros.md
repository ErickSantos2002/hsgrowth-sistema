# Programa de Parceiros — guia do módulo

Ponto de partida para quem vai mexer em **Parcerias**. Resume o que está construído, onde
fica no código, as regras que valem hoje e o que ainda está pendente. Os detalhes de cada
entrega estão nos specs e planos listados na seção 9. Para saber o que mudou em cada versão,
veja o `CHANGELOG.md` (v1.11.0 a v1.11.20, mais "Não lançado").

**Situação em 12/11/2026:** está tudo na `main`, mas **roda só no homo**. Produção ainda não
tem Parcerias. As migrations até `9d0e1f2a3b4c` já foram aplicadas no homo.

---

## 1. O que é

É a seção do CRM em que empresas de fora (parceiras) vendem bafômetros da H&S, e em que
**hunters** trazem empresas novas para o programa. Cada um vê quanto vai ganhar, e o
Financeiro vê quanto vai pagar. O programa foi desenhado para rodar **sem ninguém da H&S
operando o board**: a empresa se ativa sozinha ao aceitar os termos. O controle fica em cada
venda, porque o Financeiro valida a elegibilidade e confirma o ganho.

## 2. Perfis

| Perfil (`role`) | Quem é | Como nasce o login |
|---|---|---|
| `admin`, `manager` | Gestão da H&S. Vê e faz tudo em Parcerias. | Usuários |
| `finance` | Financeiro. Valida elegibilidade, confirma ganho, lança calibração e paga comissões. **Só lê** a configuração das comissões. | Usuários |
| `salesperson` | Vendedor H&S. Vê só os parceiros em que é o **Responsável H&S** (onboarding), sem PIX nem comissões. | Usuários |
| `partner` | **Dono da empresa parceira.** Cuida das oportunidades da empresa, da Equipe e das unidades que indicou. | Usuários → Novo Usuário → *Parceiro*, ou Acessos no card do parceiro, ou automático ao ser indicado |
| `partner_member` | **Vendedor da empresa parceira.** Vê só as próprias oportunidades. Vê as vendas no Dashboard, mas não a comissão. | Equipe do parceiro → Dar acesso (feito pelo dono ou pela gestão) |
| `hunter` | **Pessoa (CPF) ou empresa (CNPJ)** que indica empresas parceiras e também pode vender. | Usuários → Novo Usuário → *Hunter* (só admin) |

- **`sdr`, `service` e `viewer` não entram em Parcerias.**
- **Perfis trancados:** `partner`, `partner_member`, `hunter` e `finance` só enxergam Parcerias e
  Configurações. O backend nega o resto do CRM a eles, e o menu também esconde. A lista está em
  `PERFIS_TRANCADOS` (`frontend/src/constants/parcerias.ts`) e a tranca no backend fica em
  `app/api/deps.py`.
- **E-mail da H&S não pode ser login de parceiro.** O SSO da Microsoft casa a conta pelo e-mail,
  então a pessoa entraria na conta do parceiro.
- **`POST /users` recusa os perfis `partner`, `partner_member` e `hunter`**, porque esses logins
  precisam do `partner_id`. A modal de Usuários chama os endpoints de Parcerias para eles (seção 6).

### Hunter no banco
O hunter é uma linha em **`partners` com `kind = "hunter"`**, com CPF ou CNPJ e PIX, mais um
login `hunter` com `users.partner_id` apontando para essa linha. Empresa parceira é
`kind = "empresa"`. Por isso hunter e empresa usam as mesmas oportunidades, o mesmo bloqueio e
os mesmos termos.

## 3. Regras de negócio que valem hoje

### Indicação (um nível só)
- Toda empresa tem **no máximo um indicador** (`partners.indicated_by_partner_id`): um hunter,
  outra empresa (no caso de unidade) ou ninguém.
- O indicador **vê** a empresa indicada e as vendas dela, **só para leitura**. As atividades e os
  arquivos das oportunidades dela ficam só com ela. A empresa indicada **não vê** quem a indicou.
- **Só um nível:** se o hunter João indica a Empresa A e a Empresa A cadastra a Unidade B, só a
  Empresa A vê e ganha com a Unidade B. O João não.
- Quem indica cadastra a empresa já convidando. O convite sai na hora e **CNPJ repetido é
  recusado** (vale para qualquer situação que não seja Bloqueado), sem revelar de quem é.

### Entrada e ativação
1. Cadastro: por hunter, empresa parceira (unidade) ou H&S.
2. Convite por e-mail (Resend), com link de 7 dias. Também dá para criar com senha inicial, que
   exige troca no 1º login.
3. **Aceite dos termos** no 1º acesso. Ele grava data e hora, usuário, **IP** e versão, **ativa a
   empresa na hora** e avisa a gestão. O aceite **substitui o contrato assinado**. Só o dono
   (`partner`) e o hunter aceitam; a equipe não.
4. **Board de Aquisição:** 4 situações, sem arrastar cards: **Potencial** (sem convite),
   **Convidado**, **Ativado** (aceitou) e **Bloqueado**.
5. **Bloquear** (empresa ou hunter) desativa os logins do dono e da equipe. A comissão pendente
   continua sendo paga. Bloquear um hunter **não** afeta as empresas que ele indicou, mas ele
   **para de acumular** lançamentos novos enquanto estiver bloqueado.

### Oportunidades (Pipeline de Parceiros)
- **Só venda:** a locação some para os perfis externos, e o backend devolve 422 se eles mandarem.
- **Consulta de CNPJ (semáforo)** antes de registrar. 🔴 bloqueia; admin e gerente passam com
  justificativa. O parceiro tem **20 consultas por dia**. Do lado de Vendas, aparece uma faixa
  no card e o bloqueio de CNPJ que está com um parceiro.
- A empresa e o contato da oportunidade viram **o mesmo Cliente e a mesma Pessoa de Vendas**.
- **Elegibilidade:** a H&S valida em qualquer etapa.
- **Ganho:** o parceiro marca, e o ganho fica "a confirmar" até admin, gerente ou Financeiro
  confirmar. É na confirmação que as comissões nascem.

### Comissões
| Tipo | Quem recebe | Regra |
|---|---|---|
| **Venda própria (Y%)** | A empresa (venda dela ou da equipe) ou o hunter (venda dele) | Toda venda confirmada, sem prazo |
| **Indicação (X%)** | O indicador | Vendas da indicada durante o **prazo de indicação**, que conta da 1ª venda confirmada (padrão 24 meses) |
| **Bônus de 1ª venda (R$)** | O indicador | Uma vez por indicada, somado ao X% |
| **Calibração (Z%)** | A empresa que vendeu o aparelho | Lançada **à mão pelo Financeiro**, até 2 por número de série |

- **Base de cálculo:** produtos menos o desconto geral, **sem frete**. Locação não gera comissão.
- Cada lançamento guarda o percentual usado. **Mudar a configuração não recalcula o passado.**
- **Ganho desfeito antes do pagamento** cancela os lançamentos pendentes da oportunidade.
  **Lançamento pago nunca é desfeito.** A geração é idempotente (oportunidade + tipo +
  beneficiário).
- **Troca de indicador** só vale dali para frente.
- **1ª venda desfeita:** a âncora do prazo e o bônus passam para a venda confirmada mais antiga
  que restar.
- **Com os percentuais zerados, nenhum lançamento é gerado.** A configuração começou zerada.

### Dashboard de Parcerias
- **Hunter:** a carteira (empresas, vendas, "parada há X dias" a partir de 30 dias, prazo de
  indicação) e as comissões.
- **Empresa:** vendas por vendedor, unidades indicadas e comissões.
- **Vendedor do parceiro:** só as próprias vendas. A resposta da API **não tem** campos de comissão.
- **H&S:** filtros (período, hunter, empresa), rankings de empresas e de hunters, empresas
  paradas e totais de comissão.
- **Valor vendido** é a mesma base da comissão, contando só ganho confirmado.

## 4. Onde fica cada tela (após 12/11/2026)

| Tela | Caminho | Quem |
|---|---|---|
| Boards (Aquisição e Pipeline) | `/parcerias`, `/parcerias/aquisicao`, `/parcerias/oportunidades` | gestão, Financeiro, Responsável H&S, externos (o vendedor do parceiro não vê Aquisição) |
| Consulta de CNPJ | `/parcerias/consulta-cnpj` | parceiro, vendedor, SDR, admin, gerente |
| Indicações | `/parcerias/indicacoes` | dono do parceiro e hunter |
| Comissões (consulta e pagamento) | `/parcerias/comissoes` | parceiro e hunter (as próprias); admin, gerente e Financeiro (A pagar, CSV, marcar pago, todos os lançamentos) |
| Dashboard de Parcerias | Dashboard → Parcerias (admin e gerente); `/parcerias/dashboard` (perfis trancados) | — |
| **Cadastro de hunter e de login de parceiro** | **Usuários → Novo Usuário**, perfis *Hunter* e *Parceiro* | admin |
| **Bloquear/desbloquear hunter** | **Usuários → Editar** o hunter | admin |
| Bloquear/desbloquear empresa | card do parceiro em Aquisição | gestão |
| **Termos (publicar versão)** | **Configurações → aba Termos** (`/settings?aba=termos`) | admin, gerente |
| **Percentuais das comissões** | **Configurações → aba Comissões** (`/settings?aba=comissoes`) | admin e gerente editam; Financeiro lê |

As rotas antigas `/parcerias/termos` e `/parcerias/comissoes/config` redirecionam para as abas.
A antiga página `/parcerias/hunters` **não existe mais**.

## 5. Mapa do código

### Backend
- **Endpoints:** `app/api/v1/endpoints/parcerias.py` (tudo em `/api/v1/parcerias`) e
  `consulta_cnpj.py`.
- **Regras:** `app/services/parcerias/`
  | Arquivo | O quê |
  |---|---|
  | `acesso.py` | Quem enxerga o quê (visibilidade por perfil, indicador, Responsável H&S). **Comece por aqui.** |
  | `parceiros.py` | Card do parceiro (board 1), Equipe e Acessos |
  | `hunters.py` | Cadastro, listagem e convite do hunter |
  | `indicacoes.py` | Hunter ou empresa indicando uma empresa nova |
  | `termos.py` / `ativacao.py` | Termos versionados, aceite e ativação |
  | `bloqueio.py` | Bloquear e desbloquear (a situação e os logins andam juntos) |
  | `oportunidades.py` | Board 2: oportunidade, elegibilidade, ganho, produtos |
  | `etapas.py` | Etapas fixas dos dois boards e as travas |
  | `comissoes.py` | Geração, cancelamento, A pagar, pagamento e calibração |
  | `dashboard.py` | Painel de Parcerias (só leitura) |
  | `semaforo.py` / `consultas.py` / `vendas.py` | Consulta de CNPJ, limite diário e o lado de Vendas |
  | `clientes.py` | Liga a oportunidade ao Cliente e à Pessoa do CRM |
  | `atividades.py` | Atividades e histórico no padrão do card de Serviço |
  | `respostas.py` | Monta as respostas da API (nomes, totais, campos escondidos por perfil) |
- **Login (comum ao CRM):** `app/services/criacao_de_login.py` (convite ou senha, usado por
  Usuários, Acessos e Equipe), `tokens_de_acesso.py` e `emails_de_acesso.py`.
- **Models:** `partner.py` (com `PartnerTeamMember`), `partner_opportunity.py`,
  `partner_activity.py`, `partner_commission.py`, `partner_terms.py`, `cnpj_consulta.py`.
- **Schemas:** `app/schemas/parcerias.py`.
- **Testes:** `tests/unit/test_parcerias_*.py` e `test_acessos_*.py`, cerca de 430 testes.
  Rodar com Redis local, senão cada teste com `client` leva cerca de 55 s:
  ```bash
  docker run -d --rm --name redis-testes-hsgrowth -p 127.0.0.1:6390:6379 redis:7-alpine
  cd backend && REDIS_HOST=127.0.0.1 REDIS_PORT=6390 venv/bin/python -m pytest tests/unit -k "parcerias or acessos" -q
  ```

### Frontend
- **Páginas:** `src/pages/parcerias/` (ParceriasHome, AquisicaoKanban, ParceiroDetalhe,
  OportunidadesKanban, OportunidadeDetalhe, ConsultaCnpj, Indicacoes, Comissoes) e
  `src/pages/AceiteTermos.tsx`.
- **Componentes:** `src/components/parcerias/` (modais, kanban, produtos, calibrações, contrato,
  `campos.ts` com máscaras e validações iguais às do backend),
  `src/components/acessos/` (convite ou senha, status do convite),
  `src/components/dashboard/DashboardParcerias.tsx`.
- **Configurações:** `src/components/settings/TermosConfig.tsx` e `ComissoesConfig.tsx`.
- **Cadastro de hunter e parceiro:** `src/components/users/UserModal.tsx`.
- **API:** `src/services/parceriasService.ts`. **Perfis:** `src/constants/parcerias.ts`.
- **Guards** das rotas em `src/router.tsx`; menu em `src/layouts/MainLayout.tsx`.

## 6. Como a modal de Usuários cria hunter e parceiro

A modal **não** usa `POST /users` para esses dois perfis:

- **Hunter** → `POST /parcerias/hunters` com `{name, email, cpf | cnpj, phone?, pix_key?, modo, password?}`.
  Esse endpoint cria a linha em `partners` (`kind = "hunter"`, situação Convidado) e o login,
  na mesma transação.
- **Parceiro** → `POST /parcerias/parceiros/{id}/acessos` com `{name, email, modo, password?}`.
  A empresa precisa já existir no board de Aquisição e não estar bloqueada. Se estiver em
  Potencial, passa para Convidado.

Na edição de um hunter, o bloqueio usa `POST /parcerias/parceiros/{partner_id}/bloquear` ou
`/desbloquear`.

## 7. Migrations de Parcerias (ordem)

| Revisão | O quê | Tipo |
|---|---|---|
| `1b2c3d4e5f6a` | Seção, parceiros, oportunidades, perfis `partner` e `finance` | aditiva |
| `2c3d4e5f6a7b` | Atividades no padrão de Serviço | **converte dados** |
| `3d4e5f6a7b8c` | Consulta de CNPJ | aditiva |
| `4e5f6a7b8c9d` | Produtos e desconto da oportunidade | aditiva |
| `5f6a7b8c9d0e` | Contrato e ganho confirmado | aditiva |
| `6a7b8c9d0e1f` | Oportunidade ligada a Cliente e Pessoa | aditiva |
| `7b8c9d0e1f2a` | Acessos: convite ou senha, `partner_member` | aditiva |
| `8c9d0e1f2a3b` | Hunter, indicação, termos, PIX e CPF | **reescreve `partners.stage`**: código primeiro, migration logo depois |
| `9d0e1f2a3b4c` | Comissões (configuração começa zerada, prazo de 24 meses) | aditiva |

**Para levar à produção:** seguir a ordem acima e ler a seção "Banco de dados" de cada versão
no CHANGELOG. As que convertem dados exigem subir o código antes da migration (veja
"Armadilhas conhecidas" no `CLAUDE.md`).

## 8. Pendências e decisões a validar

**Valores e textos (H&S):**
- Percentuais **X% (indicação), Y% (venda própria), Z% (calibração)** e o **bônus de 1ª venda**.
  Enquanto estiverem zerados, nada é gerado.
- **Prazo de indicação:** 2 ou 3 anos (hoje está em 24 meses).
- **Texto dos termos** da empresa e do hunter. Precisam ser publicados *antes* de convidar:
  sem termos publicados, ninguém fica barrado, mas também ninguém sai de Convidado.
- **Calibração:** regras finas (identificação do aparelho, prazo) e a integração com o GestorHS.
  Hoje o lançamento é manual, por número de série.

**Decisões técnicas tomadas durante a construção (conferir):**
- Só o admin cadastra hunter e login de parceiro (pela tela Usuários). O gerente perdeu isso
  quando a página Hunters saiu.
- Hunter pode ser criado por convite **ou** com senha inicial.
- O e-mail de um vendedor do parceiro que já tem login não muda pela Equipe.
- 1ª venda desfeita: a âncora vai para a venda confirmada mais antiga que restar.
- Os valores da oportunidade ficam travados depois do ganho confirmado.
- "Parada" = 30 dias sem venda, sem oportunidade nova e sem atividade nas oportunidades.
- Hunter bloqueado para de acumular X% e bônus. As empresas dele seguem normais.

**Infra, antes da produção:**
- O IP do aceite dos termos e do login usa o **último** valor de `X-Forwarded-For`
  (`app/api/deps.py`). Isso só está certo se houver **um proxy só** (o Traefik do Easypanel).
  Se entrar CDN ou Cloudflare na frente, o IP gravado vira o do proxy. Confirmar.

**Deixado para depois:**
- O hunter editar o próprio PIX.
- Exportar PDF e ver o detalhe por lançamento nas Comissões.
- Paginação nas listas de Parcerias.
- Ordenar os rankings por quantidade.
- Agregação em SQL no dashboard (hoje soma em Python).
- Estorno de comissão já paga, pagamento automático, nota fiscal ou retenção.
- Mais de um nível de indicação.
- Entregas 4 (Alertas) e 7 (Finder) do roadmap original.
- O seletor padrão (`components/common/SelectMenu.tsx`) abre a lista dentro do container e, em
  modal, estica o corpo. O da modal de Usuários já abre por portal; dá para levar a mesma
  solução para o comum.

## 9. Documentos (em ordem)

| Data | Spec | Plano | Situação |
|---|---|---|---|
| 29/10 | `specs/2026-10-29-parcerias-entrega-1-design.md` | `plans/2026-10-29-parcerias-entrega-1.md` | Base. O roadmap de entregas está aqui. As travas de etapa para ativar foram **substituídas** pelo aceite dos termos (spec de 11/11). |
| 03/11 | `specs/2026-11-03-parcerias-entrega-2-consulta-cnpj-design.md` | `plans/2026-11-03-parcerias-entrega-2-consulta-cnpj.md` | Vigente |
| 03/11 | `specs/2026-11-03-parcerias-produtos-oportunidade-design.md` | `plans/2026-11-03-parcerias-produtos-oportunidade.md` | Vigente |
| 04/11 | `specs/2026-11-04-parcerias-contrato-ganho-elegibilidade-design.md` | — | O contrato assinado deixou de ser exigido para ativar (o aceite substitui). A confirmação do ganho segue valendo. |
| 05/11 | `specs/2026-11-05-parcerias-cliente-pessoa-historico-design.md` | — | Vigente |
| 05/11 | `specs/2026-11-05-parcerias-entrega-3-acessos-login-design.md` | `plans/2026-11-05-parcerias-entrega-3-acessos-login.md` | Vigente. As respostas de convite são planas (veja a nota no §9 do spec). |
| 11/11 | `specs/2026-11-11-parcerias-hunter-indicacao-comissoes-design.md` | `plans/2026-11-11-parcerias-hunter-parte-1-estrutura.md`, `...-parte-2-comissoes.md`, `plans/2026-11-12-parcerias-hunter-parte-3-dashboard.md` | Vigente. Os ajustes de 12/11 estão no §10 do spec. |

Todos os caminhos são relativos a `docs/superpowers/`.
