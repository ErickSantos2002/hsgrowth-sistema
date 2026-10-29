# Parcerias — Entrega 1: a seção, os perfis e os dois boards

Data: 29/10/2026
Base: `Documentação/Programa Indicação Parcerias v2 [Health and Safety].docx` (seções 2, 3 e Aba 2)

## Objetivo

Criar no CRM a seção **Parcerias** (Programa de Parceiros), separada de Vendas e de
Serviço, com dois boards:

1. **Aquisição de Parceiros** — um card por parceiro (ex.: Dmap), da prospecção até a ativação.
2. **Pipeline de Parceiros** — as oportunidades que o parceiro registra para a H&S.

E os perfis de quem é de fora (o parceiro) e do Financeiro, presos só nessa seção.

## Escopo das entregas

| Entrega | Conteúdo |
|---|---|
| **1 (esta)** | Seção, perfis `partner` e `finance`, tranca geral, board 1 com Equipe e ativação automática, board 2 com as travas do documento |
| 2 | Consulta de CNPJ (semáforo dentro do cadastro, página separada, histórico, limite diário, aviso ao vendedor H&S) |
| 3 | Login dos vendedores do parceiro |
| 4 | Alertas: aviso antes dos 10 dias sem atividade, prazo de 30 dias para ativação |
| 5 | Dashboard de Parcerias |
| 6 | Comissões (Financeiro) |
| 7 | Finder |

A Entrega 1 já grava o CNPJ (só dígitos, indexado) e a data da última atividade de cada
oportunidade, que a Entrega 2 vai usar no semáforo.

## Arquitetura

Módulo separado, no molde de Serviço: tabelas, serviços e rotas próprias, sem reaproveitar
`cards`, `clients` nem `persons`. O parceiro nunca enxerga dados de Vendas ou Serviço, e o
módulo pode mudar sem mexer no que já está em produção.

As etapas dos dois boards são **fixas no código** (constantes com código, nome e ordem),
não listas editáveis pela tela. As travas dependem da etapa; com listas editáveis, renomear
ou reordenar quebraria a regra (o problema que já temos nos boards 6/7 de Vendas).

Sem tempo real (SSE) nesta entrega: o kanban recarrega ao mover e ao voltar para a tela.

### Banco (uma migration, depois de `0a1b2c3d4e5f`)

**`partners`** — o parceiro, que é também o card do board 1.
- `name` (obrigatório) — nome do parceiro; é o "Parceiro indicador" das oportunidades.
- `cnpj` (dígitos, opcional), `main_contact_name`, `main_contact_phone`, `main_contact_email`.
- `partner_type`, `origin`, `segment`, `region` — texto livre até a H&S definir as opções.
- `hs_owner_id` → users (Responsável H&S).
- `qualification_status`: `aderente` | `parcialmente_aderente` | `nao_aderente` | nulo.
- `onboarding_date` (date).
- `activation_evidence`: `oportunidade_validada` | `proposta_enviada` | `primeira_venda` | nulo;
  `activated_at` (datetime); `activation_opportunity_id` → partner_opportunities (qual oportunidade ativou).
- `stage` (código da etapa), `position` (ordem na coluna).
- `loss_reason`, `loss_detail`, `lost_at`.
- `created_by_id`, timestamps, soft delete.

**`partner_team_members`** — a Equipe (vendedores do parceiro).
- `partner_id`, `name`, `email`, `phone`, `is_active`, timestamps.
- `user_id` → users, nulo por enquanto (fica pronto para a Entrega 3).

**`partner_opportunities`** — o card do board 2.
- `partner_id` (obrigatório), `seller_member_id` → partner_team_members (responsável, opcional).
- `title`, `deal_type`, `sector`, `relationship_type` — obrigatórios na criação.
- `context` (texto) — contexto da indicação e necessidade identificada; obrigatório (regra 9).
- Empresa: `cnpj` (14 dígitos, obrigatório, indexado), `company_name` (obrigatório),
  `company_segment`, `company_city`, `company_state`.
- Contato: `contact_name`, `contact_role`, `contact_phone`, `contact_email`.
- `eligibility_status`: `em_analise` (padrão) | `validada` | `rejeitada`;
  `eligibility_note`, `eligibility_by_id`, `eligibility_at`.
- `expected_close_date` (date), `modality`: `venda` | `locacao`.
- `loss_reason`, `loss_detail`.
- `stage`, `position`, `last_activity_at`, `won_at`, `lost_at`.
- `created_by_id`, timestamps, soft delete.
- Canal de aquisição: sempre "Parceiros" (não é coluna; a resposta da API devolve fixo).

**`partner_opportunity_products`** — `opportunity_id`, `product_id` → products (catálogo de
Vendas), `quantity`, `unit_price` (vem do catálogo, editável).

**`partner_activities`** — histórico e atividades dos dois boards.
- `partner_id` ou `opportunity_id` (um dos dois), `user_id`.
- `type`: `nota` | `ligacao` | `whatsapp` | `email` | `reuniao` | `tarefa` | `evento`.
  `evento` é gravado pelo sistema (criação, mudança de etapa, elegibilidade, ativação).
- `description`, `due_at`, `completed_at`.

**`users.partner_id`** → partners, nulo. Liga o login ao parceiro.

**Roles novas:** `partner` (Parceiro) e `finance` (Financeiro), `is_system_role = true`.

## Perfis e acesso

| Perfil | Board 1 (Aquisição) | Board 2 (Pipeline) | Resto do CRM |
|---|---|---|---|
| admin, manager | tudo, move qualquer card | tudo, move qualquer card | como hoje |
| finance | vê tudo, não move | vê tudo, valida/rejeita elegibilidade, não move | **trancado** |
| partner | só o próprio card; move, edita, cuida da Equipe | só as oportunidades do seu `partner_id`; cria, edita, move | **trancado** |
| salesperson, sdr, service, viewer | sem acesso | sem acesso | como hoje |

Regras finas:
- O parceiro não manda o próprio card para **Perdido** nem para **Ativado** (Perdido é só
  admin/gerente; Ativado é automático).
- O parceiro não tira oportunidade de **Ganho** ou **Perdido**; admin/gerente podem reabrir.
- Um parceiro nunca recebe dado de outro parceiro: toda consulta do board 2 filtra por
  `partner_id` no backend, nunca só na tela. Card de outro parceiro responde 404.

### Tranca geral (backend)

Para `partner` e `finance` o acesso é **negado por padrão**. A checagem fica em
`get_current_active_user` (usada por quase todas as rotas): se o perfil for trancado e o
caminho não estiver na lista liberada, responde 403. Lista liberada:

- `/api/v1/auth/*` (login, refresh, logout, me)
- `/api/v1/users/me`, `/api/v1/users/me/*` (perfil, troca de senha, notificações, avatar)
- `/api/v1/notifications*` (as notificações do próprio usuário)
- `/api/v1/parcerias/*`

Rotas novas no CRM ficam trancadas para esses perfis automaticamente, sem ninguém lembrar
de proteger. Um teste percorre todas as rotas registradas e confirma o 403 fora da lista.

As rotas de Parcerias usam `require_parcerias_access()` (admin, manager, finance, partner);
os demais perfis recebem 403.

### Tranca no frontend

- Menu: item **Parcerias** para admin, manager, finance e partner. Para `partner` e
  `finance`, o menu mostra só Parcerias e Configurações.
- `/` e qualquer outra rota levam `partner` e `finance` para `/parcerias`.
- Configurações: só as abas Perfil e Notificações.
- Busca geral e widget do Agent Growth não aparecem para esses perfis.

## Board 1 — Aquisição de Parceiros

Etapas (código → nome): `potencial` Potencial Parceiro · `qualificacao` Qualificação ·
`proposta` Proposta · `formalizacao` Formalização · `onboarding` Onboarding ·
`ativacao` Ativação · `ativado` Ativado · `perdido` Perdido.

**Cadastro (admin/gerente):** botão "Novo parceiro" — nome obrigatório, demais campos
opcionais. O card nasce em Potencial Parceiro.

**Acesso do parceiro (admin/gerente):** no card, "Criar acesso" pede nome, e-mail e senha
inicial e cria um usuário `partner` ligado ao parceiro. Pode haver mais de um login por
parceiro. "Desativar acesso" desliga o usuário (`is_active = false`). Logins `partner` não
são criados pela tela de Usuários.

**Travas para avançar** (valem para quem mover, inclusive admin; ao pular etapas, valem as
travas de todas as etapas deixadas para trás):

| Saindo de | Exige |
|---|---|
| Potencial Parceiro | contato principal (nome + telefone ou e-mail) e Responsável H&S |
| Qualificação | status de qualificação Aderente ou Parcialmente aderente |
| Onboarding | data de onboarding |
| Ativação → Ativado | não se move à mão: é automático |
| qualquer → Perdido | motivo da perda (admin/gerente) |

Pular etapas é permitido, mas as travas de cada etapa pulada valem. Voltar etapa é livre,
menos sair de Ativado ou de Perdido, que só admin/gerente fazem.

**Ativação automática.** O parceiro passa de Ativação para Ativado, e o sistema grava
evidência, data e oportunidade, na primeira vez que uma oportunidade dele:
- tem a elegibilidade **Validada** → `oportunidade_validada`;
- chega em **Proposta** → `proposta_enviada`;
- chega em **Ganho** → `primeira_venda`.

Se a evidência acontecer antes de o card chegar em Ativação (ex.: parceiro ainda em
Onboarding), ela fica registrada e o card vai direto para Ativado quando entrar em Ativação.
A ativação gera um `evento` no histórico do parceiro.

**Detalhe do card:** coluna da esquerda com os dados do parceiro, a seção **Equipe** e os
**Acessos**; à direita, atividades e histórico. Também mostra quantas oportunidades o
parceiro tem por etapa.

**Equipe:** o parceiro e admin/gerente cadastram, editam e desativam vendedores (nome,
e-mail, telefone). Vendedor desativado não aparece mais para ser escolhido como responsável,
mas continua nas oportunidades antigas.

## Board 2 — Pipeline de Parceiros

Etapas: `novo_lead` Novo Lead · `oportunidade` Oportunidade · `proposta` Proposta ·
`negociacao` Negociação · `aguardando_pedido` Aguardando Pedido · `ganho` Ganho ·
`perdido` Perdido.

**Criação (parceiro ou admin/gerente):** título, tipo de negócio, setor, tipo de
relacionamento, CNPJ válido (dígitos verificadores), nome da empresa e contexto são
obrigatórios. Responsável (da Equipe), contato e produtos são opcionais. Admin/gerente
escolhem o parceiro; o parceiro cria sempre no próprio canal. O card nasce em Novo Lead com
elegibilidade **Em análise**.

As opções de tipo de negócio, setor e tipo de relacionamento são as mesmas de Vendas
(`frontend/src/constants/blueprintOptions.ts`).

**Elegibilidade (finance, admin, manager):** "Validar" ou "Rejeitar" enquanto o card está
em Novo Lead. Rejeitar exige justificativa, que o parceiro vê no card. Cada mudança gera
`evento` no histórico. Validar dispara a checagem de ativação do parceiro.

**Travas para avançar:**

| Para | Exige |
|---|---|
| sair de Novo Lead (exceto para Perdido) | elegibilidade Validada |
| Negociação, Aguardando Pedido ou Ganho | data esperada de fechamento |
| Ganho | venda ou locação |
| Perdido | motivo da perda (lista de motivos de Aquisição de Vendas) |

Entrar em Proposta e em Ganho dispara a checagem de ativação.

**Produtos:** do catálogo de Vendas (só ativos), com quantidade e valor unitário. O parceiro
escolhe por uma busca da própria rota de Parcerias (nome e SKU), sem acesso à tela de
Produtos. O valor da oportunidade é a soma dos produtos.

**Atividades:** nota, ligação, WhatsApp, e-mail, reunião e tarefa (com data e conclusão).
Criar ou concluir atividade e mudar de etapa atualizam `last_activity_at`.

**Kanban:** colunas pelas etapas, card com título, empresa, parceiro, responsável, valor e
o selo da elegibilidade. Admin/gerente/finance têm filtro por parceiro.

## Rotas (`/api/v1/parcerias`)

- `GET /etapas` — etapas dos dois boards.
- Board 1: `GET/POST /parceiros`, `GET/PUT /parceiros/{id}`, `PUT /parceiros/{id}/mover`,
  `GET/POST /parceiros/{id}/equipe`, `PUT /parceiros/{id}/equipe/{membro_id}`,
  `GET/POST /parceiros/{id}/acessos`, `PUT /parceiros/{id}/acessos/{user_id}`,
  `GET/POST /parceiros/{id}/atividades`.
- Board 2: `GET/POST /oportunidades`, `GET/PUT /oportunidades/{id}`,
  `PUT /oportunidades/{id}/mover`, `PUT /oportunidades/{id}/elegibilidade`,
  `GET/POST /oportunidades/{id}/produtos`, `PUT/DELETE /oportunidades/{id}/produtos/{item_id}`,
  `GET/POST /oportunidades/{id}/atividades`.
- Atividades: `PATCH /atividades/{id}/concluir`, `DELETE /atividades/{id}`.
- `GET /produtos?busca=` — catálogo resumido.

Erros de trava respondem 422 com a mensagem para a tela ("Preencha a data esperada de
fechamento antes de ir para Negociação.").

## Telas

- `/parcerias` — entrada com os dois boards (o parceiro cai direto no Pipeline).
- `/parcerias/aquisicao` e `/parcerias/aquisicao/:id`.
- `/parcerias/oportunidades` e `/parcerias/oportunidades/:id`.

Mesmo visual de Serviço (kanban com arrastar, detalhe em duas colunas). Ao mover para uma
etapa com trava, a tela abre um modal pedindo o campo que falta (data, venda/locação,
motivo) em vez de só mostrar o erro.

## Testes

- Tranca geral: `partner` e `finance` recebem 403 em todas as rotas fora da lista liberada
  e 200 nas liberadas; `salesperson` recebe 403 em `/parcerias`.
- Isolamento: parceiro A não lista, não abre, não edita e não move oportunidade do B (404).
- Travas de cada etapa dos dois boards, com a mensagem certa.
- Ativação: cada uma das três evidências; evidência antes de Ativação; não ativa duas vezes.
- Elegibilidade: só finance/admin/manager; rejeitar sem justificativa falha; só em Novo Lead.
- Equipe: parceiro só mexe na própria equipe.

## Fora desta entrega

Semáforo e consulta de CNPJ (Entrega 2), login dos vendedores, alertas de 10 e 30 dias,
dashboard, comissões, Finder, tempo real, anexos e propostas em PDF.

## Observações de deploy

- A migration cria as tabelas e as roles; rodar em produção antes do deploy, com
  confirmação.
- O plano da cadência de Serviço (`2026-10-23-cadencia-servico-cobranca.md`) aponta a
  migration para `f0a1b2c3d4e5`; quando for implementado, o `down_revision` precisa ir
  para a cabeça da época.
