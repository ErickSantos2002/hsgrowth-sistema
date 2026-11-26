# Pedido de liberação de CNPJ em Vendas — design

**Data:** 19/11/2026 · **Versão alvo:** 1.11.32 · **Migration:** sim, aditiva (tabela nova)

## 1. Problema

A trava de CNPJ de Vendas (`backend/app/services/parcerias/vendas.py`, `conferir`) bloqueia o
vendedor ou SDR que cria um card, ou vincula uma empresa, cujo CNPJ está com um parceiro ou com
outro vendedor. Hoje:

- o vendedor recebe "Fale com o gerente." e **nada fica salvo**. O gerente nem sabe pelo sistema
  que alguém precisou daquele CNPJ;
- a única forma de liberar é o próprio admin ou gerente repetir a ação, com justificativa, e
  depois passar o card para o vendedor.

O usuário quer que o vendedor **peça a liberação pelo sistema** e que admin e gerente decidam numa
lista.

## 2. Decisões (confirmadas pelo usuário em 19/11/2026)

1. **O card só nasce quando a gestão libera** (opção A). Enquanto isso, existe só o pedido, com
   os dados que o vendedor preencheu. Recusado, nada entra no funil.
2. A lista fica numa aba **"Liberações"** na tela **Consulta de CNPJ**
   (`/parcerias/consulta-cnpj`).
3. Escopo desta entrega: **criar card** (board de Vendas) e **vincular empresa** (seção Empresa
   do card). Reabrir perdido, clonar e o modal de editar card continuam com "Fale com o gerente".
   *(Atualização 1.11.35, 26/11/2026: reabrir perdido e clonar também passaram a pedir liberação,
   tipos `reabrir_card` e `clonar_card`. Só o modal de editar card segue com "Fale com o gerente".)*
4. Pedem liberação: `salesperson` e `sdr`. Decidem: `admin` e `manager`.

## 3. Fluxo

1. O vendedor é barrado (409 `cnpj_bloqueado`, `pode_liberar: false`). A janela de bloqueio mostra
   a mensagem de hoje, um campo **"Por que você precisa deste CNPJ?"** (obrigatório, até 500
   caracteres) e o botão **"Pedir liberação"**.
2. O front envia o pedido. O backend confere que o CNPJ ainda está bloqueado para essa pessoa e
   grava o pedido como `pendente`. Se já existe pedido pendente do mesmo vendedor, para o mesmo
   tipo, a mesma empresa (e o mesmo card, no vincular), devolve o existente sem duplicar.
3. Todos os admins e gerentes ativos recebem o aviso `cnpj_liberacao_pedido` no sino, com link
   para `/parcerias/consulta-cnpj?aba=liberacoes`.
4. Na aba Liberações, a gestão:
   - **Libera**, com observação opcional. O backend refaz a ação **em nome do vendedor**: cria o
     card com os dados guardados, ou vincula a empresa ao card. A trava é dispensada só para
     esse pedido. O histórico do card recebe a atividade `parcerias_cnpj`:
     `CNPJ liberado por <gestor> a pedido de <vendedor>: <motivo>. <observação> (estava <com quem>)`.
   - **Recusa**, com motivo obrigatório.
5. O vendedor recebe o aviso `cnpj_liberacao_decisao`: liberado (link para o card) ou recusado
   (com o motivo).
6. O vendedor pode **cancelar** o próprio pedido enquanto estiver pendente.

## 4. Casos especiais

| Situação | Comportamento |
|---|---|
| Ao liberar, a ação falha (lista apagada, contato sem e-mail/telefone, card excluído, vendedor inativo) | A transação é desfeita. O gerente vê a mensagem do erro e o pedido continua `pendente`, para ele recusar explicando |
| O CNPJ ficou livre antes da decisão | Liberar funciona normalmente |
| Pedido para CNPJ que não está bloqueado | 422 "Este CNPJ está livre. Crie o card normalmente." |
| Admin ou gerente chamando "pedir" | 403: eles liberam direto com justificativa, como hoje |
| Decidir pedido que não está pendente | 409 "Este pedido já foi decidido." |

## 5. Modelo de dados

Tabela nova **`cnpj_release_requests`** (model `CnpjReleaseRequest`):

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | int PK | |
| `kind` | str(20) | `criar_card` \| `vincular_empresa` |
| `status` | str(20), índice | `pendente` \| `liberado` \| `recusado` \| `cancelado` |
| `client_id` | FK clients, SET NULL | empresa pedida |
| `cnpj` | str(14), índice | CNPJ no momento do pedido |
| `card_id` | FK cards, SET NULL | vincular: card alvo. Criar: o card criado ao liberar |
| `payload` | JSON | criar: os dados do `CardCreate`. Vincular: `{}` |
| `reason` | str(500) | motivo do vendedor |
| `blocked_with` | str(500) | "com quem" o CNPJ estava no pedido |
| `requested_by_id` | FK users, índice | |
| `decided_by_id` | FK users, SET NULL | |
| `decided_at` | datetime | |
| `decision_note` | str(500) | observação de quem liberou, ou motivo da recusa |
| `created_at` | datetime, índice | |

## 6. Backend

- **`app/services/parcerias/vendas.py`**: `conferir(..., liberacao: Optional[str] = None)`. Com
  `liberacao` preenchida, devolve esse texto sem checar a trava. Separar `com_quem_bloqueia(db,
  user, client_id, ignorar_card_id)` (o texto, ou None) para o pedido reaproveitar.
- **`CardService.create_card` / `update_card`**: recebem `liberacao_cnpj: Optional[str]` e passam
  para `conferir`.
- **`app/services/parcerias/liberacoes.py`** (novo): `pedir`, `listar`, `contar_pendentes`,
  `liberar`, `recusar`, `cancelar`.
- **`app/api/v1/endpoints/liberacoes_cnpj.py`** (novo), prefixo
  `/api/v1/parcerias/liberacoes-cnpj`, com acesso para admin, manager, salesperson e sdr:
  - `POST /` pede (vendedor/SDR);
  - `GET /?status=` lista (gestão: todos; vendedor: os dele);
  - `GET /pendentes/contagem` (gestão);
  - `POST /{id}/liberar`, `POST /{id}/recusar` (gestão);
  - `POST /{id}/cancelar` (quem pediu).
- **Avisos** em `notificacoes/tipos.py`: `cnpj_liberacao_pedido` e `cnpj_liberacao_decisao`,
  obrigatórios. Enviados por `notificar()`.

## 7. Front

- **`useLiberacaoCnpj`**: `comLiberacao(pedido, pedirLiberacao?)`. Quando o bloqueio não deixa
  liberar e quem chama passou `pedirLiberacao`, a janela vira "Pedir liberação" com o campo de
  motivo. Sem `pedirLiberacao` (reabrir, clonar, editar), continua o "Fale com o gerente".
- **KanbanBoard** (criar card) e **ClientSection** (vincular) passam `pedirLiberacao`.
- **ConsultaCnpj**: abas **Consulta** e **Liberações**, com a aba escolhida pela URL
  (`?aba=liberacoes`). Componente novo `LiberacoesCnpj.tsx`.
- **MainLayout**: número de pendentes ao lado de "Consulta de CNPJ" para admin e gerente.

## 8. Testes

Serviço com a fixture `db` (rápida):

- pedir: grava pendente, avisa a gestão, não duplica, recusa CNPJ livre, recusa admin;
- liberar criar: cria o card em nome do vendedor, registra `parcerias_cnpj`, marca liberado, avisa;
- liberar vincular: vincula a empresa ao card e registra;
- liberar com falha: pedido continua pendente;
- recusar: exige motivo, avisa o vendedor;
- cancelar: só quem pediu e só pendente;
- `conferir` com `liberacao`: passa sem checar.

Um teste de endpoint com `client` para as permissões.
