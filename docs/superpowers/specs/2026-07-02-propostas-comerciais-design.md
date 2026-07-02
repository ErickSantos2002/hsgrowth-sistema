# Design — Módulo "Propostas Comerciais" (Serviço)

**Data:** 02/07/2026
**Status:** Aprovado no brainstorming — aguardando revisão do spec
**Escopo:** Exclusivo do módulo de **Serviço** do HSGrowth CRM (não há propostas em Vendas).

---

## 1. Objetivo

Criar um módulo de **Propostas Comerciais** dentro do HSGrowth, substituindo o uso de um sistema externo (ERP) para **visualizar, criar e editar** propostas. As propostas se vinculam a cards de Serviço e substituem o atual mecanismo de "anexar o documento de proposta no Resumo".

Referência de layout/lógica: o sistema externo usado hoje (formulário de Proposta Comercial + PDF com a marca H&S).

## 2. Decisões (brainstorming)

| # | Decisão |
|---|---------|
| 1 | **Construir do zero** no HSGrowth (não integrar com o ERP externo). |
| 2 | **PDF** fica para a **Fase 2** (gerado no backend, template fiel à marca H&S). |
| 3 | **Número da proposta:** sequência própria do HSGrowth (auto-incremento). |
| 4 | **Formulário:** réplica fiel de todos os campos do exemplo. |
| 5 | **Exclusivo de Serviço.** Acesso: **admin, gerente e role serviço** (`require_service_access`). Demais perfis não veem o módulo. |
| 6 | **Editor de texto rico:** adicionar **react-quill** (para o campo "Outros itens/serviços"). |
| 7 | **Versão:** mudança de Serviço → entra no **go-live v1.8.0** (sem bump/changelog agora). |

## 3. Faseamento

- **Fase 1 (v1):** entidade de propostas + página na sidebar (listar/criar/editar/ver) + seção no card de Serviço + criação a partir do card (auto-preenche) + vínculo card↔proposta + Marcador + troca da regra de avanço.
- **Fase 2:** geração do **PDF** (backend) fiel ao modelo H&S, anexado/baixável.

## 4. Modelo de dados (backend)

### Tabela `proposals`
- `id` (PK)
- `number` (int, único, sequência própria auto-incremento)
- `client_id` (FK → clients) — Cliente
- `person_id` (FK → persons, nullable) — "Aos cuidados de" / contato
- `service_card_id` (FK → service_cards, nullable) — card de Serviço vinculado
- `seller_name` (str, nullable) — Vendedor
- `date` (date) — Data da proposta
- `next_contact_date` (date, nullable) — Data do próximo contato
- `intro` (text, nullable) — Introdução
- `other_items` (text/HTML, nullable) — "Outros itens ou serviços" (texto rico react-quill)
- `discount` (numeric, default 0) — Desconto
- `shipping` (numeric, default 0) — Frete
- `freight_type` (str, nullable) — Forma de frete
- `shipping_method` (str, nullable) — Forma de envio (ex: Correios)
- `carrier_name` (str, nullable) — Transportador (nome)
- `payment_terms` (str, nullable) — Condição de pagamento / parcelas
- `validity_days` (int, nullable) — Validade da proposta (dias)
- `delivery_date` (date, nullable) — Data prevista de entrega
- `delivery_desc` (str, nullable) — Descrição do prazo de entrega
- `notes` (text, nullable) — Observações
- `signature` (str, nullable) — Assinatura
- `internal_status` (str, default "rascunho") — estado interno (rascunho/enviada); **não** confundir com o Marcador (derivado)
- Timestamps + soft-delete (padrão do projeto).

### Tabela `proposal_items`
- `id` (PK)
- `proposal_id` (FK → proposals, cascade)
- `product_id` (FK → products, nullable)
- `description` (str) — Item
- `sku` (str, nullable) — Código (SKU)
- `quantity` (numeric, default 1)
- `unit` (str, nullable) — UN (ex: Unid)
- `unit_price` (numeric)
- `total` (numeric) — quantity × unit_price (calculado)

### Totais (calculados, não persistidos)
- **Total dos itens** = Σ `proposal_items.total`
- **Total outros** = 0 no v1 (campo "outros" é texto; itens extras entram como texto). *(Se necessário no futuro, vira numérico.)*
- **Total da proposta** = Total dos itens + `shipping` − `discount`

## 5. Vínculo card ↔ proposta + Marcador (status)

- Uma proposta **pode** ter `service_card_id` (vinculada) ou não (avulsa).
- **Marcador** (derivado em tempo de leitura, não armazenado):
  - **Aprovada** → card vinculado está **Ganho** (`is_won`/etapa done).
  - **Não aprovada** → card vinculado está **Perdido** (etapa lost).
  - **Em aberto** → sem card vinculado **ou** card ainda em etapa ativa.
- Um card pode ter **várias** propostas; a regra de avanço exige **≥1** vinculada.

## 6. Página "Propostas" (sidebar)

- Novo item na sidebar (ícone `FileText`), posicionado **logo após "Produtos"**, visível só p/ admin/gerente/serviço.
- Visual e padrões idênticos a Clientes/Produtos: hooks `useCRUD`/`useFilter`/`usePagination`, `SearchInput`, `Pagination`, `SelectMenu`.
- **Colunas:** Número · Data · Cliente · CNPJ (`client.document`) · Valor (total da proposta) · Marcador · Card Vinculado.
- **Card Vinculado:** mostra o ID do card; clicável → navega para `/servicos/{boardId}/cards/{cardId}`.
- **Ações:** Ver, Editar, "Nova proposta". Excluir apenas admin/gerente (viewer não aplicável aqui, pois viewer não acessa o módulo).
- **Busca:** por cliente ou número. **Filtro:** por Marcador (Todas / Aprovada / Não aprovada / Em aberto).
- Rota: `/propostas` (listagem) + `/propostas/:id` (ver/editar) — com guard de acesso a Serviço.

## 7. Formulário de proposta (criar/editar)

Réplica fiel do exemplo, agrupado em seções:
- **Cliente** (busca) + **Aos cuidados de** (person/e-mail) + checkbox "endereço de entrega diferente" *(informativo no v1)*.
- **Introdução** (texto).
- **Nº Proposta** (auto, read-only) · **Vendedor** · **Data** · **Data do Próximo Contato**.
- **Itens de produto ou serviço** (tabela editável: Item, SKU, Qtde, UN, Preço un, Preço total, ação).
- **Outros itens ou serviços** (react-quill).
- **Totais:** Total outros, Desconto, Frete, Total dos itens, Total proposta.
- **Transportador:** Forma de envio, Forma de frete, Nome.
- **Condições comerciais:** Condição de pagamento / parcelas.
- **Condições gerais:** Validade (dias), Data prevista de entrega, Descrição do prazo.
- **Observações** + **Assinatura**.

## 8. Criação a partir do card de Serviço

- Nova **seção "Propostas"** no card de Serviço, **abaixo da seção Produtos** (mesma coluna), listando as propostas daquele card + botão "Nova proposta".
- Ao criar pelo card, o form nasce **pré-preenchido**: `service_card_id` do card, Cliente (`card.client_id`), Pessoa (`card.person_id`) e **itens = produtos do card** (`service_card_products` → description/sku/quantity/unit_price). Tudo editável antes de salvar.
- **Sai do Resumo:** remover o campo/anexo "Proposta" (`doc_slot='proposta'`) da `ServiceSummarySection`.

## 9. Mudança na regra de avanço (Serviço)

Onde hoje a trava exige **"Proposta anexada no Resumo"** (`has_slot("proposta")`), passa a exigir **≥1 proposta vinculada ao card** (`proposals` com `service_card_id = card.id`):
- **Board 1 (funil):** Proposta → Aguardando Pedido (caminho Pedido) e Proposta → Ganho (Faturamento direto).
- **Board 2 (Cobrança):** Proposta → Operações.

Atualizar a documentação `16 - FLUXO E REGRAS DO BOARD DE SERVIÇOS.md` (matrizes e seções de regras) trocando "Proposta anexada" por "Proposta vinculada (aba Propostas)".

## 10. Permissões / acesso

- Backend: endpoints sob `require_service_access` (admin/gerente/serviço).
- Frontend: item da sidebar e rota protegidos pelo mesmo guard usado no módulo de Serviço.

## 11. Fase 2 — PDF (fora do v1)

- Geração no backend a partir de template HTML fiel ao modelo H&S (cabeçalho da empresa, dados do cliente/endereço, itens, "outros itens" já em HTML do react-quill, totais, condições, assinatura).
- Ação de **baixar/visualizar PDF** na proposta; opcionalmente anexar ao card.
- Lib a definir na fase 2 (ex.: WeasyPrint).

## 12. Fora de escopo (v1)

- Geração de PDF (fase 2).
- Integração/importação com o ERP externo.
- Propostas em Vendas.
- "Total outros" numérico e endereço de entrega separado (informativo apenas).

## 13. Pontos de atenção

- Adicionar dependência **react-quill** no frontend.
- Sequência do `number` (garantir unicidade sob concorrência — usar sequência/consulta ao máximo atual).
- Marcador é derivado do estado do card vinculado — recalculado na listagem/detalhe.
