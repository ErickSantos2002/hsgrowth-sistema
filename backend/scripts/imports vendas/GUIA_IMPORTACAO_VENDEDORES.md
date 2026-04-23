# Guia de Importação — Planilha Vendedores

Arquivo de referência para importar os lotes de cards gerados a partir das planilhas de prospects de vendedores.

---

## Visão Geral

Os leads são distribuídos por vendedor — cada aba da planilha de origem corresponde a um vendedor. Os cards são criados na lista **Lead Novo** (list_id=22, board_id=6 — Prospecção) com o vendedor vinculado no campo `assigned_to_id`.

**Planilhas de origem e lotes gerados:**
| Arquivo de origem | Lote gerado | Empresas |
|---|---|---|
| `Prospects_Distribuicao_Vendedores.xlsx` | `Planilha_Importacao_Vendedores_Lote1.xlsx` | 35 |
| `Prospects_Distribuicao_Vendedores_02.xlsx` | `Planilha_Importacao_Vendedores_Lote2.xlsx` | 187 |

> ⚠️ **Diferença em relação à importação de SDR:** aqui o responsável é o **vendedor** (`assigned_to_id`), não o SDR (`sdr_id`). O campo `SDR_Responsavel` na planilha é reutilizado para carregar o nome do vendedor — o script de importação faz o mapeamento correto.

**Vendedores e seus IDs no sistema:**
| Nome na planilha | Nome completo no sistema | ID |
|---|---|---|
| Sandra | Sandra Silva | 5 |
| Adriana | Adriana Oliveira | 3 |
| Gislayne | Gislayne Nunes | 2 |
| Eduardo | Eduardo Luna | 4 |

---

## Passo a Passo

### 1. Abrir terminal na pasta do backend

```bash
cd backend
```

---

### 2. Rodar o Script 1 — Conversão das planilhas de origem

Converte todas as planilhas de prospects configuradas no script para o formato de importação do CRM, gerando um arquivo de lote por planilha.

> ⚠️ **Se as planilhas de origem não mudaram e os arquivos já foram gerados, pule esta etapa.**

```bash
python "scripts/imports vendas/criar_planilha_vendedores.py"
```

Resultado esperado:
- Gera `Planilha_Importacao_Vendedores_Lote1.xlsx` — 35 empresas (Sandra: 9, Adriana: 9, Gislayne: 9, Eduardo: 8)
- Gera `Planilha_Importacao_Vendedores_Lote2.xlsx` — 187 empresas (Sandra: 47, Adriana: 47, Gislayne: 47, Eduardo: 46)
- Telefones e e-mails mapeados para a pessoa de contato (Sócio 1), não para a empresa
- Sócios 2 e 3 mapeados como Contato2/Contato3 (vão para a descrição do card)

---

### 3. Rodar o script de importação

Rode uma vez por lote, na ordem desejada:

```bash
python "scripts/imports vendas/import_vendedores.py" "scripts/imports vendas/Planilha_Importacao_Vendedores_Lote1.xlsx"
```

```bash
python "scripts/imports vendas/import_vendedores.py" "scripts/imports vendas/Planilha_Importacao_Vendedores_Lote2.xlsx"
```

> ⚠️ **ATENÇÃO:** rode cada comando **uma única vez**. Rodar duas vezes cria cards duplicados.

Resultado esperado:
- Cards criados na lista Lead Novo (list_id=22) com `assigned_to_id` do vendedor
- Pessoa de contato (Sócio 1) criada e vinculada ao card
- Contatos 2 e 3 registrados na descrição do card
- 0 erros

---

### 4. Novos lotes futuros

Quando chegar uma nova planilha de prospects para vendedores:

1. Coloque o novo arquivo `.xlsx` na pasta `scripts/imports vendas/`
2. Adicione uma entrada na lista `LOTES` em `criar_planilha_vendedores.py`:
   ```python
   {
       "prospects": os.path.join(BASE_DIR, "Prospects_Distribuicao_Vendedores_03.xlsx"),
       "output":    os.path.join(BASE_DIR, "Planilha_Importacao_Vendedores_Lote3.xlsx"),
       "label":     "Lote 3",
   },
   ```
3. Verifique se os nomes das abas continuam iguais — se mudou, ajuste o `VENDEDOR_MAP`
4. Se houver um novo vendedor, adicione-o ao `VENDEDOR_MAP` e verifique o ID no banco
5. Rode os passos 2 e 3 normalmente

---

## Controle de Lotes

| Lote | Data | Cards | Vendedores | IDs criados (cards) | Status |
|---|---|---|---|---|---|
| Lote 1 | 23/04/2026 | 35 | Sandra, Adriana, Gislayne, Eduardo | cards 6100–6134 | ✅ Importado |
| Lote 2 | 23/04/2026 | 187 | Sandra, Adriana, Gislayne, Eduardo | cards 6135–6321 | ✅ Importado |
| ... | — | ... | ... | ... | ... |

---

## Estrutura da Planilha Gerada

| Campo CRM | Origem (Prospects xlsx) |
|---|---|
| CNPJ | CNPJ |
| Razão Social | Razão Social |
| Nome Fantasia | Nome Fantasia |
| Estado (UF) | UF |
| Cidade | Cidade |
| Endereço Completo | Logradouro + Nº + Complemento + Bairro + Cidade + UF + CEP |
| CNAE Principal | CNAE (código + descrição) |
| Faixa de Funcionários | Qtd. Funcionários → convertido para faixa |
| Faixa de Faturamento | Faturamento Presumido (R$) → convertido para faixa |
| Nome_Contato1 | Sócio 1 |
| Cargo_Contato1 | Cargo Sócio 1 |
| Tel_Principal_Contato1 | DDD 1 + Telefone 1 |
| Tel_WhatsApp_Contato1 | DDD 2 + Telefone 2 |
| Tel_Comercial_Contato1 | DDD 3 + Telefone 3 |
| Email_Contato1 | E-mail 1 |
| Nome_Contato2 | Sócio 2 |
| Cargo_Contato2 | Cargo Sócio 2 |
| Tel_Contato2 | DDD Sócio 2 + Tel. Sócio 2 |
| Email_Contato2 | E-mail 2 |
| Nome_Contato3 | Sócio 3 |
| Cargo_Contato3 | Cargo Sócio 3 |
| Tel_Contato3 | DDD Sócio 3 + Tel. Sócio 3 |
| Email_Contato3 | E-mail 3 |
| SDR_Responsavel | Nome do vendedor (aba da planilha) |
| Canal_Aquisicao | Outbound (fixo) |
| Canal_Aquisicao_Detalhe | Outbound - Lista fria (fixo) |

---

## Problemas Conhecidos

| Problema | Causa | Solução |
|---|---|---|
| Vendedor não encontrado | Nome na planilha não bate com `VENDEDOR_MAP` | Adicionar entrada no `VENDEDOR_MAP` de `criar_planilha_vendedores.py` e no `VENDOR_NAME_MAP` do script de importação |
| Cards duplicados | Rodar o import duas vezes | Contatar time técnico para remover duplicatas |
| Nova aba na planilha de origem | Novo vendedor não mapeado | Adicionar no `VENDEDOR_MAP` com o nome exato da aba e o ID correto do usuário |
