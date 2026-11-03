# Parcerias — produtos da oportunidade com desconto e frete (v1.11.9)

Data: 03/11/2026. Antes da Entrega 3.

## Objetivo

Na oportunidade do Pipeline de Parceiros, montar o valor do negócio como na seção
**Serviços** do card de Serviço: quantidade, preço e desconto por linha, desconto geral,
frete e valor do negócio. O parceiro só vende o **Phoebus**.

## Decisões

| Ponto | Decisão |
|---|---|
| Produtos que entram | Só os marcados como **"Liberado para parceiros"** no cadastro de Produtos |
| Marcação inicial | A migration marca o produto de nome exatamente "Phoebus" (sem diferenciar maiúsculas e espaços nas pontas) |
| Vale para quem | Todos os perfis neste board (parceiro, vendedor, admin, gerente) |
| Preço unitário | Vem do cadastro e pode ser alterado por quem edita |
| Desconto da linha | R$ ou %, como em Serviço; a tela converte o % e grava sempre em R$ |
| Desconto geral | R$ ou %, guardado com o tipo (`value` ou `percent`) |
| Limite de desconto | Nenhum, além de não passar do valor (linha ≤ subtotal da linha; % até 100) |
| Quem edita | Quem já edita a oportunidade (`PERFIS_QUE_EDITAM`); Financeiro só lê |

## Conta

```
subtotal da linha   = quantidade × preço unitário
total da linha      = subtotal da linha − desconto da linha
total dos produtos  = Σ total da linha
desconto geral      = valor  → global_discount
                      percent → total dos produtos × global_discount / 100
valor do negócio    = max(0, total dos produtos − desconto geral + frete)
```

O servidor calcula `total_value` com essa conta. O board (valor do card e total da coluna) e
o quadro "Valor do negócio" usam esse número.

## Banco (migration nova, depois de `3d4e5f6a7b8c`)

- `products.partner_enabled` Boolean, não nulo, padrão `false`. Marca o "Phoebus" no `upgrade`.
- `partner_opportunity_products.discount` Numeric(12,2), não nulo, padrão 0.
- `partner_opportunities.global_discount` Numeric(12,2), não nulo, padrão 0.
- `partner_opportunities.global_discount_type` String(10), não nulo, padrão `"value"`.
- `partner_opportunities.shipping` Numeric(12,2), não nulo, padrão 0.

As linhas que já existem ficam como estão (desconto 0), mesmo se o produto não for liberado.

## Backend

- **Catálogo** `GET /parcerias/produtos`: só produtos ativos, não excluídos e com
  `partner_enabled = true`.
- **Adicionar produto**: recusa (422) produto não liberado e produto que já está na
  oportunidade.
- **Editar linha** `PUT .../produtos/{item_id}`: aceita `quantity`, `unit_price`, `discount`.
  Recusa (422) desconto negativo ou maior que o subtotal da linha. Ao mudar quantidade ou
  preço, se o desconto ficar maior que o novo subtotal, recusa também.
- **Oportunidade** `PUT /oportunidades/{id}`: aceita `global_discount`,
  `global_discount_type` (`value` | `percent`) e `shipping`. Recusa negativo e % acima de 100.
- **Resposta da oportunidade**: ganha `global_discount`, `global_discount_type`, `shipping`;
  `total_value` passa a seguir a conta acima.
- **Resposta da linha**: ganha `discount` e `subtotal`; `total` já desconta.
- **Produtos (cadastro)**: `ProductCreate`, `ProductUpdate` e `ProductResponse` ganham
  `partner_enabled`.

## Frontend

- **Cadastro de Produtos** (`ProductModal`): caixa "Liberado para parceiros".
- **Detalhe da oportunidade**: a aba "Produtos" da direita sai. Entra a seção **Produtos**
  (fechada ao abrir) na coluna da esquerda, no mesmo visual de `ServiceServicesSection`:
  - linhas com nome/SKU, quantidade, preço, desconto (com o seletor R$/%) e total da linha;
    lápis para editar e lixeira para remover; edição só para `PERFIS_QUE_EDITAM`;
  - rodapé com subtotal, total dos produtos, desconto geral (seletor R$/%), frete e
    **Valor do negócio**; Salvar/Cancelar aparecem só quando muda algo;
  - "Adicionar produto" abre a escolha entre os produtos liberados que ainda não estão
    na oportunidade.
- O quadro "Valor do negócio" de Elegibilidade continua, com o texto
  "Produtos com descontos e frete".

## Testes

- Catálogo só traz produto liberado.
- Adicionar produto não liberado → 422; repetido → 422.
- Desconto da linha maior que o subtotal → 422.
- Desconto geral em % acima de 100 → 422; negativo → 422.
- `total_value` com desconto de linha, desconto geral em R$ e em % e frete; nunca negativo.
- Financeiro não edita (403).
- Produto: criar e editar com `partner_enabled`.

## Fora do escopo

Limite e aprovação de desconto; produtos no formulário de criação da oportunidade.
