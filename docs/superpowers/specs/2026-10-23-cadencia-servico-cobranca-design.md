# Cadência no board Serviço - Cobrança — design

**Data:** 23/10/2026 · **Status:** aprovado em conversa

## Objetivo

Levar a cadência que os vendedores/SDR já usam para o board **Serviço - Cobrança** (board 2): uma sequência de toques (WhatsApp, ligação, e-mail) em que concluir um toque cria o próximo, em dia útil, até o cliente responder ou o card ser dado como perdido.

Público: base com calibração atrasada (lista "Oportunidade Existente", ~1.030 cards).

## O que já existe (Vendas)

- `CadenceTemplate` → `CadenceStep` (ordem, `day_offset`, tipo, título, descrição, prioridade, horário) → `CardCadence` (instância por card de Vendas: status, etapa atual).
- `CadenceService`: iniciar, pausar, retomar, cancelar; `on_task_completed` cria a próxima `CardTask`; `_add_business_days` pula sábado e domingo.
- Configurações > Cadências (`CadenceTemplateManager.tsx`) cadastra os modelos.
- O card de Serviço usa outro modelo (`ServiceCard` + `ServiceCardActivity`), por isso a cadência de Vendas não funciona lá.

## Decisões (validadas com o usuário)

| Tema | Decisão |
|---|---|
| Onde roda | Só no board 2 (Serviço - Cobrança) |
| Início | Botão "Iniciar cadência" no card (como em Vendas); nada em massa |
| Datas | A próxima atividade vem N dias úteis **depois da conclusão** da anterior, onde N = diferença entre os dias do modelo (D3→D6 = 3). Sem sábado/domingo; feriados não contam |
| Toque condicional | Ao concluir um toque cujo próximo é condicional, a tela pergunta "O cliente respondeu?". Sim → o condicional é pulado |
| Parada | Mover para Proposta, Operações ou Ganho encerra a cadência e remove da agenda a atividade pendente dela. Também há Pausar/Retomar/Cancelar |
| Perdido | Encerra a cadência e, se o card teve cadência, agenda "Ligação de reabertura" para daqui a 90 dias corridos (fim de semana → segunda). Reiniciar a cadência é manual |
| Modelo | Editável em Configurações > Cadências, na mesma tela de Vendas, marcado "Serviço - Cobrança" |
| Arquitetura | Reaproveita `CadenceTemplate`/`CadenceStep`; instância nova `ServiceCardCadence`; Vendas não muda |

## Modelo inicial (já vem cadastrado)

Ordem invertida a pedido do usuário: WhatsApp antes da ligação.

| Ordem | Dia | Tipo | Condicional | Título | Descrição |
|---|---|---|---|---|---|
| 1 | D1 | whatsapp | — | WhatsApp — calibração vencida | Aviso curto da calibração vencida + pedido de horário |
| 2 | D1 | call | só se não respondeu | Ligação — calibração atrasada | Gancho da calibração atrasada, abre diagnóstico |
| 3 | D3 | email | — | E-mail — risco em auditoria | Risco de aparelho irregular em auditoria + link para agendar |
| 4 | D6 | whatsapp | — | WhatsApp — diagnóstico | Pergunta de diagnóstico: o aparelho tem travado ou dado erro? |
| 5 | D8 | call | — | Ligação — 2ª tentativa | 2ª tentativa em outro horário |
| 6 | D10 | email | — | E-mail — plataforma | Plataforma que lembra a calibração + outras unidades |
| 7 | D13 | whatsapp | — | WhatsApp — última tentativa | Tentativa final, se possível com outro contato (segurança ou compras) |
| 8 | D15 | call | — | Ligação — encerramento | Encerramento: "fecho por aqui, me chama quando quiser calibrar" |

Reabertura após Perdido: 90 dias — "Ligação de reabertura": reabra com novo gancho (próxima calibração ou estado do aparelho).

Exemplo em dia, começando numa segunda: seg (1 e 2) · qua (3) · seg (4) · qua (5) · sex (6) · qua (7) · sex (8).

## Componentes

### Banco (uma migration)

- `cadence_templates.escopo` — `VARCHAR(30) NOT NULL DEFAULT 'vendas'` (`vendas` | `servico_cobranca`).
- `cadence_templates.reabertura_dias` — `INTEGER NULL` (só Serviço; vazio = não agenda).
- `cadence_steps.somente_sem_resposta` — `BOOLEAN NOT NULL DEFAULT false`.
- Tabela `service_card_cadences`: `id`, `service_card_id` (FK cascade), `template_id` (FK restrict), `started_by_id`, `status` (`active` | `paused` | `completed` | `cancelled` | `encerrada`), `current_step_order`, `started_at`, `paused_at`, `completed_at`, `motivo_encerramento` (texto curto: "Card movido para Proposta", "Card perdido").
- `service_card_activities.service_card_cadence_id` — FK nullable (`SET NULL`), indexada.
- Dados: o modelo de 8 toques acima, `escopo = servico_cobranca`, `reabertura_dias = 90`.

### Backend

- `app/services/cadencia_servico_service.py` (novo) — `CadenciaServicoService`:
  - `iniciar(card_id, template_id, user)` — só board 2, só modelo `servico_cobranca` ativo, uma cadência ativa/pausada por card; cria o toque 1 para hoje (dia útil).
  - `pausar`, `retomar` (recria o toque atual se não houver pendente), `cancelar`.
  - `ao_concluir_atividade(atividade, respondeu: Optional[bool], user)` — se a atividade é da cadência ativa: avança; se o próximo toque é `somente_sem_resposta` e `respondeu is True`, pula; cria o próximo com data = `_add_business_days` a partir da conclusão com o intervalo do modelo; no fim marca `completed`.
  - `ao_mover_card(card, lista_destino, user)` — fora das etapas de contato: encerra (`encerrada`) e remove a atividade pendente da cadência; se destino é Perdido e o card teve cadência com `reabertura_dias`, cria a ligação de reabertura.
  - `cadencia_do_card(card_id)` — resposta para a tela (modelo, status, etapa X de N, toque atual, se o próximo é condicional).
- Etapas de contato do board 2: a lista de entrada (`is_entry_stage`) e "Tentativa de Contato" (por nome normalizado). Perdido por flag ou nome, como o resto do código.
- Datas: reaproveitar a regra de dia útil de `cadence_service` (extrair para utilitário compartilhado sem mudar o comportamento de Vendas). O intervalo é `dia do próximo toque − dia do toque que acabou de ser concluído` (0 = mesmo dia); quando um toque condicional é pulado, conta do concluído (D1 → D3 = 2). Horário do toque (`scheduled_time`) respeitado.
- Reabertura: `reabertura_dias` são dias **corridos** a partir do Perdido; caindo em sábado/domingo, vai para segunda.
- Responsável pela atividade: responsável do card; sem responsável, quem concluiu/iniciou.
- Ganchos em `service_board_service`: `complete_activity` (repassa `respondeu`) e a movimentação de card (depois das regras atuais de Ganho/Perdido; nunca quebra o movimento).
- Rotas (em `service_boards.py`): `GET/POST .../cards/{id}/cadencia` (consultar/iniciar), `POST .../cadencia/pausar|retomar|cancelar`; `complete` de atividade aceita `respondeu` opcional.
- Vendas: a listagem de modelos usada no card de Vendas passa a filtrar `escopo = vendas`; o resto de `cadence_service` não muda.

### Frontend

- Configurações > Cadências: campo "Vale para" (Vendas / Serviço - Cobrança); no toque, checkbox "Só se o cliente não respondeu o toque anterior"; no modelo de Serviço, "Ligação de reabertura após Perdido (dias)".
- Card de Serviço (só board 2): seção "Cadência" (iniciar escolhendo o modelo, toque X de N, pausar/retomar/cancelar), no padrão da seção de Vendas.
- Concluir atividade da cadência cujo próximo toque é condicional: modal "O cliente respondeu?" (Sim / Não).

## Erros e bordas

- Iniciar fora do board 2, com modelo de Vendas ou com cadência ativa → 400 com mensagem.
- Concluir/desconcluir: desmarcar a conclusão não volta a cadência; concluir de novo não cria toque duplicado (só avança se a atividade for a pendente da etapa atual).
- Excluir a atividade pendente da cadência: a cadência fica sem toque pendente; "Retomar"/"Pausar e retomar" recria.
- Mover entre etapas de contato (Oportunidade Existente ↔ Tentativa de Contato) não encerra.
- Qualquer erro nos ganchos é registrado e não impede concluir a atividade nem mover o card.

## Testes

- Datas: começo na segunda (sequência seg/seg/qua/seg/qua/sex/qua/sex); começo na sexta; conclusão atrasada empurra o próximo; nunca sábado/domingo.
- Condicional: respondeu → pula a ligação do D1; não respondeu → ligação no mesmo dia.
- Parada: mover para Proposta/Operações/Ganho encerra e remove a pendente; mover entre etapas de contato não encerra.
- Perdido: agenda reabertura em +90 dias corridos (fim de semana → segunda); card sem cadência não agenda.
- Escopo: não inicia no board 1 nem com modelo de Vendas; a lista de modelos de Vendas não mostra o de Serviço.
- Vendas: testes atuais de cadência continuam passando.

## Fora do escopo

- Feriados.
- Disparo automático de WhatsApp/e-mail (os toques são atividades para a pessoa executar).
- Iniciar cadência em lote.
- Cadência nos boards de Serviço que não o 2.
