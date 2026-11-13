# Parcerias — comissões com os valores reais (desconto travado e previsão das renovações)

**Data:** 13/11/2026 · **Versão:** 1.11.22 · **Ambiente:** só homologação
**Base:** apresentação comercial do Programa de Parceiros (slides "Como você ganha",
"Desconto compartilhado" e "Parcelas diferidas") e as decisões do usuário em 13/11/2026.
**Anterior:** `2026-11-11-parcerias-hunter-indicacao-comissoes-design.md` (comissões, Entrega 6).

## 1. Objetivo

Com os valores do programa definidos, o sistema precisa:

1. separar o percentual de venda própria da **empresa** (10%) do percentual do **hunter** (5%);
2. travar o preço e limitar o desconto da oportunidade de parceria a **0, 2, 4 ou 6%**, com
   a comissão de quem vende caindo **meio ponto por ponto de desconto**, calculada sobre o
   **preço cheio**;
3. mostrar ao parceiro, em Comissões e na hora de escolher o desconto, quanto ele ganha em
   cada faixa de desconto;
4. mostrar na seção Calibrações da oportunidade a **previsão das 2 renovações** de cada
   aparelho vendido (data e valor), antes mesmo de a calibração ser lançada.

## 2. Valores do programa (a preencher em Configurações → Comissões)

| Quem | Fonte | Regra | Exemplo (aparelho a R$ 24.500) |
|---|---|---|---|
| Hunter | Ativação | Fixo, na 1ª venda confirmada da empresa indicada | R$ 1.000 |
| Hunter | Rede | 1,5% de cada venda da empresa indicada, por 24 meses da 1ª venda | R$ 367,50 |
| Hunter | Venda própria | 5% − metade do desconto, sobre o preço cheio | R$ 1.225 sem desconto |
| Empresa | Venda própria | 10% − metade do desconto, sobre o preço cheio | R$ 2.450 sem desconto |
| Empresa | Renovação | 25% da anuidade efetivamente paga, nas 2 primeiras calibrações de cada aparelho | R$ 625 (anuidade R$ 2.500) |

- Na 1ª venda da empresa indicada, o hunter recebe ativação + rede (R$ 1.367,50).
- A **rede (1,5%) e a ativação não mudam com o desconto**: sempre sobre o preço cheio.
- A venda do hunter **não gera renovação** (regra atual mantida).
- Os 100% dos serviços (instalação, integração e manutenção) são faturados direto pelo
  parceiro ao cliente e **não passam pelo CRM**.

### Tabela de desconto (resultado esperado)

| Desconto | Cliente paga | Empresa | Hunter (venda própria) |
|---|---|---|---|
| Sem desconto | R$ 24.500 | R$ 2.450 (10%) | R$ 1.225 (5%) |
| 2% | R$ 24.010 | R$ 2.205 (9%) | R$ 980 (4%) |
| 4% | R$ 23.520 | R$ 1.960 (8%) | R$ 735 (3%) |
| 6% | R$ 23.030 | R$ 1.715 (7%) | R$ 490 (2%) |

## 3. Configuração

Tabela `partner_commission_config` ganha duas colunas (migration **aditiva**):

| Coluna | Tipo | Padrão | Uso |
|---|---|---|---|
| `hunter_own_sale_pct` | `Numeric(5,2)` not null | 0 | % de venda própria do hunter |
| `annual_fee_reference` | `Numeric(12,2)` not null | 0 | anuidade de referência, **só para a previsão** |

- `own_sale_pct` passa a valer **só para a empresa** (rótulo na tela: "Venda própria da empresa").
- Migration `0e1f2a3b4c5d` (down `9d0e1f2a3b4c`), arquivo
  `2026_11_13_1000-0e1f2a3b4c5d_parcerias_comissoes_hunter_anuidade.py`, com
  `server_default='0'` nas duas colunas. Aditiva: pode rodar antes do código.
- Schemas `ComissaoConfigUpdate`/`ComissaoConfigResponse` ganham os dois campos
  (`hunter_own_sale_pct` 0–100; `annual_fee_reference` ≥ 0).
- Tela `ComissoesConfig.tsx`: dois campos novos ("Venda própria do hunter (%)" e
  "Anuidade de referência (R$)", com a dica "Só para a previsão das renovações; a comissão
  usa o valor que o cliente pagou").

## 4. Desconto travado na oportunidade

Vale para **toda** oportunidade de parceria (empresa ou hunter), seja quem for que edita,
inclusive admin e gerente.

**Constantes** (backend em `services/parcerias/comissoes.py`, front em `constants/parcerias.ts`):

```python
DESCONTOS_PERMITIDOS = (0, 2, 4, 6)       # % do desconto geral
REDUCAO_POR_PONTO = Decimal("0.5")        # cada ponto de desconto tira meio ponto da comissão
```

**Backend (`services/parcerias/oportunidades.py`):**
- `global_discount_type` passa a ser sempre `"percent"`. `global_discount` só aceita um valor
  de `DESCONTOS_PERMITIDOS`. Outro valor → 422 "Desconto permitido: 0%, 2%, 4% ou 6%."
  Desconto em R$ → 422.
- Produto adicionado entra **sempre com o preço do catálogo** (`products.unit_price`): o
  `unit_price` enviado é ignorado no `adicionar_produto`.
- `atualizar_produto` só muda a **quantidade**. `unit_price` diferente do atual ou `discount`
  maior que zero → 422 "Preço e desconto por item são travados no Programa de Parceiros."
- Frete continua livre.
- Dados antigos do homo (preço alterado ou desconto em R$) não são corrigidos pela migration:
  são de teste. Ao salvar de novo, as travas valem.

**Frontend (`components/parcerias/ProdutosDaOportunidade.tsx`):**
- Preço unitário só leitura, sem desconto por item.
- Desconto geral vira um seletor: "Sem desconto", "2%", "4%", "6%".
- Abaixo do seletor, para quem vende (empresa ou hunter): *"Com 4% de desconto, sua
  comissão é 8%: R$ 1.960 por aparelho."* Os números vêm de
  `GET /parcerias/comissoes/tabela-desconto` (§7). O `GET /comissoes/config` continua só
  para admin, gerente e Financeiro.
- O `partner_member` (vendedor da equipe) não recebe comissão: para ele, o texto mostra só o
  desconto, sem valores.

## 5. Cálculo na confirmação do ganho (`comissoes.gerar`)

- **Preço cheio** = Σ (quantidade × `unit_price`) dos produtos, sem desconto e sem frete.
  Com o preço travado, é o preço de catálogo.
- **Desconto** `d` = `global_discount` (%).
- **Venda própria:**
  - empresa: `taxa = own_sale_pct − d × 0,5`;
  - hunter: `taxa = hunter_own_sale_pct − d × 0,5`;
  - nunca abaixo de zero; `base_value` = preço cheio; `rate` = taxa efetiva (fica gravada
    no lançamento: 9,00, 8,00…).
- **Indicação (X%)** e **bônus de ativação:** `base_value` = preço cheio, sem redução.
- Locação continua sem comissão. Âncora, prazo e indicador seguem as regras de 11/11.
- Lançamentos já gerados **não são recalculados**. A regra vale para ganhos confirmados a
  partir da 1.11.22. O `_reancorar` (bônus ao desfazer a 1ª venda) usa a mesma base.
- `base_sem_frete` deixa de ser usada no cálculo da comissão; continua valendo para o
  "Valor vendido" do Dashboard (que é o que o cliente pagou).

## 6. Calibrações: previsão das renovações

**API** — `GET /parcerias/oportunidades/{id}/calibracoes` passa a devolver um objeto:

```json
{
  "aparelhos": [
    {
      "numero": 1,
      "serial_number": "ABC123",
      "renovacoes": [
        {"ordem": 1, "prevista_para": "2027-11-13", "valor_previsto": 625.00,
         "calibracao": { ...CalibracaoResponse... } },
        {"ordem": 2, "prevista_para": "2028-11-13", "valor_previsto": 625.00,
         "calibracao": null}
      ]
    },
    {"numero": 2, "serial_number": null, "renovacoes": [ ... ]}
  ],
  "sem_comissao": [ ...CalibracaoResponse... ]
}
```

- **Aparelhos** = soma das quantidades dos produtos da oportunidade. Sem ganho confirmado
  ou em locação → `aparelhos: []`.
- **Previsão** = data do ganho confirmado (fuso de São Paulo) + 12 meses (1ª) e + 24 meses (2ª).
  `valor_previsto` = `annual_fee_reference × calibration_pct / 100`; com qualquer um zerado,
  `null` (a tela mostra só a data).
- **Ligação calibração ↔ aparelho:** os números de série entram na ordem do 1º lançamento de
  cada um (aparelho 1 = 1ª série lançada). As calibrações com comissão ativa da série ocupam
  as renovações 1 e 2, na ordem dos ids. As que não geraram comissão (venda do hunter,
  Z% zerado, comissão cancelada) vão para `sem_comissao`.
- A resposta do `POST` (lançar) continua um `CalibracaoResponse` (já tem `recorrencia`,
  `commission_status`, `commission_paid_at`). A tela recarrega a lista depois de lançar.
- **Trava nova:** lançar uma série nova quando já há tantas séries quanto aparelhos vendidos
  → 422 "Esta oportunidade tem N aparelho(s); todos já têm número de série." A trava do
  limite de 2 por série continua.

**Tela (`CalibracoesDaOportunidade.tsx`):** um bloco por aparelho:

```
Aparelho 1 · ABC123                                  1 de 2 renovações
  1ª renovação · Calibrada em 10/11/2027 · R$ 2.500 · R$ 625 · Pendente
  2ª renovação · prevista p/ 13/11/2028 · R$ 625 (previsão)
Aparelho 2 · nº de série ao lançar                   0 de 2 renovações
  1ª renovação · prevista p/ 13/11/2027 · R$ 625 (previsão) · faltam 45 dias
  2ª renovação · prevista p/ 13/11/2028 · R$ 625 (previsão)
```

- Selo de prazo nas renovações **não lançadas**: "faltam X dias" (amarelo) quando faltam
  60 dias ou menos; "vencida há X dias" (vermelho) quando a data passou.
- Renovação lançada mostra a data da calibração, o valor pago pelo cliente, a comissão e a
  situação ("Pendente" / "Paga em dd/mm/aaaa"), como hoje.
- `sem_comissao`, se houver, aparece numa lista curta no fim ("Calibrações sem comissão").
- O texto de ajuda passa a dizer: "Cada aparelho rende comissão nas 2 primeiras renovações
  (12 e 24 meses após o ganho). A comissão entra como pendente em Comissões → A pagar e
  fica paga quando o Financeiro marcar o pagamento."
- O formulário de lançamento continua igual (série, data, valor).

## 7. Comissões: quadro "Desconto × sua remuneração"

Na aba de comissões do próprio usuário (empresa e hunter; não para `partner_member` nem para
a gestão), um bloco com a tabela do §2 montada a partir da configuração e do preço do
aparelho:

- **Preço de referência:** o do produto liberado para parceiro com maior preço (hoje só o
  Phoebus). Se não houver produto liberado, a tabela mostra só os percentuais.
- A empresa vê a coluna "Empresa"; o hunter, a coluna "Hunter". Lembrete embaixo: "As
  renovações (R$ 625) não mudam com o desconto" (só para a empresa).
- Com a configuração zerada, o bloco não aparece.

Endpoint novo, leve: `GET /parcerias/comissoes/tabela-desconto` →
`{preco_referencia, linhas: [{desconto, cliente_paga, taxa_empresa, valor_empresa, taxa_hunter, valor_hunter}], renovacao_prevista}`.
Fica no backend para a regra (0,5 ponto por ponto) morar num lugar só. Liberado para
qualquer usuário ativo que entra em Parcerias (os valores são os mesmos da apresentação
comercial, não são sigilosos); a tela é que escolhe a coluna. `valor_*` são por aparelho, no
preço de referência; `renovacao_prevista` = `annual_fee_reference × calibration_pct / 100`
ou `null`.

## 8. Testes (backend, SQLite)

- Venda da empresa com 0/2/4/6% → taxa 10/9/8/7 e valores 2.450/2.205/1.960/1.715.
- Venda do hunter com 4% → 3%, R$ 735.
- Empresa indicada vende com 6% → rede do hunter continua R$ 367,50; ativação R$ 1.000.
- Desconto 3% ou em R$ → 422; preço alterado ou desconto por item → 422; produto entra com o
  preço do catálogo mesmo enviando outro.
- Previsão: ganho em 13/11/2026 com 2 aparelhos → 4 renovações (13/11/2027, 13/11/2028),
  valor 625 com config 25% + 2.500; `null` com anuidade zerada.
- Calibração liga ao aparelho certo; 3ª série com 2 aparelhos → 422.
- Tabela de desconto devolve as 4 linhas esperadas.
- Os testes existentes de comissão que montam a base com desconto em R$ ou preço alterado
  precisam ser ajustados para a regra nova.

## 9. Fora desta entrega

- Os 100% dos serviços (faturados direto pelo parceiro).
- Lista geral de "renovações chegando" (todas as oportunidades) — fica para quando voltarmos
  ao Dashboard de Parcerias.
- Integração da calibração com o GestorHS (lançamento automático).
- Limpar o cadastro de produtos: hoje há dois "Phoebus" liberados para parceiro (R$ 24.500
  e R$ 24.625). Ajuste de dado, feito pela tela de Produtos na hora de configurar.

## 10. Entrega

- Versão **1.11.22**, só no homo. Migration aditiva `0e1f2a3b4c5d`.
- Depois do deploy: preencher a configuração (10 / 5 / 1,5 / R$ 1.000 / 24 / 25 / R$ 2.500)
  e fazer o teste de ponta a ponta.
