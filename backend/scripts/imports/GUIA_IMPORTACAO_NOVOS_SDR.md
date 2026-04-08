# Guia de Importação — Planilha Novos SDR

Arquivo de referência para importar os lotes de 200 cards da planilha `Planilha_Importacao_CRM_Novos_SDR.xlsx`.

---

## Visão Geral

A planilha tem **2189 linhas** de empresas. Importamos **200 por vez** (50 para cada SDR).
O controle de quais já foram importadas fica na coluna **`Status_Importacao`** (col 51) do arquivo `_fixed.xlsx` — linhas marcadas como `Importado` são puladas automaticamente na próxima execução.

**SDRs e seus IDs no sistema:**
| Nome na planilha | Nome completo no sistema | ID |
|---|---|---|
| Ãhwaryoné | Ãhwaryoné Barbosa Bandeira De Melo | 14 |
| Miguel | Miguel Luiz Pereira de Melo | 16 |
| Lucas | Lucas | 17 |
| Sérgio | Sérgio Viana | 15 |

---

## Passo a Passo

### 1. Abrir terminal na pasta do backend

```bash
cd backend
```

---

### 2. Rodar o Script 1 — Normalização de dados (só na primeira vez ou se a planilha mudar)

O Script 1 corrige os valores de Faixa de Funcionários e Faixa de Faturamento para os padrões aceitos pelo CRM e gera o arquivo `_fixed.xlsx`.

> ⚠️ **Se o `_fixed.xlsx` já existir e a planilha original não mudou, pule esta etapa.**

```bash
python scripts/imports/fix_novos_sdr_data.py
```

Resultado esperado:
- Gera `Planilha_Importacao_CRM_Novos_SDR_fixed.xlsx`
- Faixa de Faturamento: 100% mapeada
- Faixa de Funcionários: apenas "Não Definido" fica null (esperado)

---

### 3. Rodar o Script 2 — Distribuição do próximo lote de 200

O Script 2 pega os próximos 200 registros **sem** `Status_Importacao = Importado`, distribui 50 por SDR, preenche o canal e gera o arquivo do lote.

```bash
python scripts/imports/fix_novos_sdr_import.py
```

Resultado esperado:
- Atualiza `_fixed.xlsx` marcando as 200 novas linhas como `Importado`
- Gera `Planilha_Importacao_CRM_Novos_SDR_lote1.xlsx`

> 💡 O nome do arquivo de saída é sempre `lote1.xlsx` — sobrescreve o anterior. Isso é intencional.

---

### 4. Rodar a importação no CRM

```bash
python scripts/imports/import_from_planilha.py Planilha_Importacao_CRM_Novos_SDR_lote1.xlsx
```

> ⚠️ **ATENÇÃO:** rode este comando **uma única vez**. Rodar duas vezes cria cards duplicados.

Resultado esperado:
- **199 cards importados** (o script pula a linha 4 por limitação técnica — veja seção abaixo)
- Avisos de SDR não encontrado para Ãhwaryoné e Miguel → **normal, será corrigido no passo 5**
- 0 erros

---

### 5. Corrigir os sdr_ids (Ãhwaryoné e Miguel)

Após cada importação, rodar o script de correção para vincular os SDRs que o sistema não encontra automaticamente.

> ⚠️ Ajuste os IDs de card no script conforme o relatório do passo anterior.
> O relatório mostra: `Iniciando importação a partir da posição X` e os IDs dos cards criados.

**Como identificar o range de IDs:**
- O primeiro card criado aparece na linha `[1] Linha 5: ... Card: criado (id=XXXX)`
- O último aparece no final do log

**Template do script de correção:**
```python
# Execute com: PYTHONPATH=. python -c "..."
from app.db.session import SessionLocal
from app.models.card import Card

db = SessionLocal()
# Ajuste os ranges conforme o log da importação:
# Ãhwaryoné = linhas 5 a 53 do lote → primeiros 49 cards
updated = db.query(Card).filter(Card.id >= PRIMEIRO_ID, Card.id <= PRIMEIRO_ID+48).update({'sdr_id': 14})
print(f'Ãhwaryoné: {updated}')
# Miguel = linhas 54 a 103 → próximos 50 cards
updated = db.query(Card).filter(Card.id >= PRIMEIRO_ID+49, Card.id <= PRIMEIRO_ID+98).update({'sdr_id': 16})
print(f'Miguel: {updated}')
db.commit()
db.close()
```

---

### 6. Importar o 1 card faltante (linha 4 do lote)

O script de importação sempre pula a primeira linha de dados (limitação conhecida). Para importar esse card manualmente, use o script abaixo substituindo os dados da empresa:

```bash
PYTHONPATH=. python -c "
# Verifique o conteúdo da linha 4 do lote1.xlsx e preencha abaixo
# Rodou na importação como: [1] Linha 5 (a linha 4 foi pulada)
print('Verificar linha 4 do lote1.xlsx e importar manualmente se necessário')
"
```

> 💡 **Dica:** abra o `lote1.xlsx` no Excel e veja qual empresa está na linha 4 (primeira linha de dados). Adicione ela manualmente no CRM se necessário, ou solicite ao time técnico.

---

## Controle de Lotes

| Lote | Data | Cards | SDRs | Status |
|---|---|---|---|---|
| Lote 1 | 06/04/2026 | 200 | Ãhwaryoné, Miguel, Lucas, Sérgio | ✅ Importado |
| Lote 2 | — | 200 | Ãhwaryoné, Miguel, Lucas, Sérgio | ⏳ Pendente |
| Lote 3 | — | 200 | Ãhwaryoné, Miguel, Lucas, Sérgio | ⏳ Pendente |
| ... | — | ... | ... | ... |

---

## Problemas Conhecidos

| Problema | Causa | Solução |
|---|---|---|
| "SDR Ãhwaryoné não encontrado" | Nome na planilha é abreviado | Normal — corrigir com script de fix de sdr_id (passo 5) |
| "SDR Miguel não encontrado" | Nome na planilha é abreviado | Normal — corrigir com script de fix de sdr_id (passo 5) |
| 199 cards em vez de 200 | Script pula linha 4 do arquivo | Importar o 1 card manualmente (passo 6) |
| Cards duplicados | Rodar o import duas vezes | Contatar time técnico para remover duplicatas |
