# Mover aparelhos entre cards do mesmo CNPJ — Design

**Data:** 25/09/2026
**Módulo:** Serviços (board Serviço = 1 e board Cobrança = 2)

## Problema
Um mesmo cliente (CNPJ) costuma ter aparelhos em cards diferentes do mesmo board — ex.: 5 aparelhos
em um card "atrasados" e 5 em um card "a vencer". Quando o cliente pede para fazer tudo junto (ex.: os
5 a vencer + 3 dos atrasados), hoje o usuário precisa **remover à mão** os 3 aparelhos de um card e
**recadastrar à mão** no outro. É lento e sujeito a erro de digitação (série, modelo, data).

## Solução
No card aberto (destino), uma seção lista os **outros cards em aberto do mesmo CNPJ e do mesmo board**.
Cada um expande mostrando seus produtos e aparelhos; o usuário seleciona aparelhos (ou a linha inteira)
e **puxa** para o card atual. O movimento é registrado no histórico dos dois cards.

## Regras (decididas com o usuário)
| Tema | Decisão |
|---|---|
| Escopo | Boards de Serviço (1) e Cobrança (2), **só entre cards do mesmo board** |
| Vínculo | Mesmo CNPJ = mesmo `client_id` |
| Cards elegíveis | Só **em aberto** (não Ganho/Perdido — por flag ou nome da lista) |
| Direção | **Só puxar** para o card atual (o card aberto é sempre o destino) |
| Granularidade | **Aparelho individual** (seleção) **ou linha inteira** ("mover todos") |
| Serviços / valor | **Não mexe** — move só aparelhos; serviços/valor o usuário ajusta se precisar |
| Permissão | Quem pode editar card (`require_not_viewer`) |

## Modelo de dados (sem migration)
Aparelhos vivem em `ServiceCardProduct.aparelhos` (JSON), agrupados por modelo (`product_id`), com
`quantity`. Há `UniqueConstraint(service_card_id, product_id)`.

Movimento de uma linha (modelo X) da origem para o destino:
- **Individual:** remove os aparelhos selecionados (por **índice** na lista) da origem; `quantity`
  da origem cai no nº movido (mín. 0).
- **Linha inteira:** move todos os aparelhos e toda a `quantity`.
- **Destino:** se já tem o modelo X → **mescla** (append nos aparelhos + soma quantity); senão
  **cria** a linha copiando `unit_price` da origem e `discount = 0`.
- **Origem zerada** (quantity 0 e sem aparelhos) → a linha é **removida**.
- Tudo numa transação.

Identificação do aparelho: **índice** na lista `aparelhos` da linha de origem (o nº de série pode estar
vazio). O backend valida o intervalo; índice inválido → 400 "recarregue".

## Card de origem esvaziado → "Unificado em outro card"
Se, depois do movimento, o card de origem ficar **sem nenhuma linha de produto**, ele é fechado
automaticamente (decidido com o usuário), na mesma chamada:
- Vai para a lista **Negócio Perdido** do board (criada se não existir), no topo.
- Grava a anotação **"Motivo da perda: Unificado em outro card"** (mesmo padrão dos demais motivos,
  então aparece no filtro "Motivo de perda" do kanban).
- Conclui as atividades pendentes (igual a um Perdido normal).
- Histórico: evento **`card_unified`** — *"Card unificado no card #N — Título (ficou sem aparelhos)"*.
  **Não** grava `card_lost`.
- O front **avisa antes** de mover quando a seleção vai esvaziar o card de origem
  ("O card X vai ficar sem aparelhos e será fechado como Perdido — Unificado em outro card").
- A resposta do `pull-devices` traz `origin_closed: true|false`.

**Métricas (decidido: não conta como perda).** Na dashboard de Serviço, cards cujo **último** motivo de
perda é "Unificado em outro card" ficam **fora** de: Perdidos no período, Taxa de ganho, gráfico de
Motivos de perda e Evolução. Ranking de colaboradores e visão filtrada por usuário já não contam, pois
usam o evento `card_lost` (e aqui o evento é `card_unified`). Se o card for reaberto e perdido de
verdade depois, o motivo novo passa a ser o último e ele volta a contar normalmente.

O motivo **não** aparece no modal de perda manual — é só de sistema (fica disponível no filtro).

## API
- `GET /service-boards/{board_id}/cards/{card_id}/related-devices` → `List[RelatedDevicesCard]`
  (`id`, `title`, `list_name`, `products: List[ServiceCardProductResponse]`). Card sem cliente → `[]`.
- `POST /service-boards/{board_id}/cards/{card_id}/pull-devices` (card_id = destino)
  body `{ "from_card_id": int, "items": [{ "product_id": int, "all": bool, "indices": [int] }] }`.
  Validações (400): mesmo card; CNPJ diferente/sem cliente; algum card fechado; nenhum item;
  `product_id` repetido no pedido; seleção vazia; índice inválido. 404: card fora do board ou
  produto ausente na origem.

## Histórico
`log_event` (categoria `alteracao`) nos dois cards:
- Origem — `devices_moved_out`: *"Aparelho(s) movido(s) para o card #N — Título: Modelo (2 aparelho(s): S1, S2) · por Fulano"*
- Destino — `devices_moved_in`: *"Aparelho(s) recebido(s) do card #N — Título: … · por Fulano"*

## Frontend
- Nova seção `ServiceRelatedCardsSection` na coluna esquerda do card (abaixo de Serviços),
  título **"Outros cards do mesmo CNPJ"**. Some se o card não tem cliente.
- Lista os cards (título, etapa, nº de aparelhos, link "abrir card"). Cada um expande: por linha de
  produto, checkbox por aparelho (série · modelo · próx. recalibração) e botão **"Mover todos"**.
- Botão **"Mover selecionados para este card"** → `pull-devices` → recarrega a seção, a seção de
  Produtos do card atual (via `refreshKey`) e o histórico.
- Ícone no histórico para `devices_moved_in/out`. Viewer não vê os controles de mover.

## Fora de escopo
- Empurrar aparelhos do card atual para outro.
- Mover entre boards diferentes (Serviço ↔ Cobrança).
- Ajustar serviços/valor automaticamente.
