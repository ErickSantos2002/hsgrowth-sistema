# Guia de Importação — Planilha Novos SDR

Arquivo de referência para importar os lotes de cards da planilha `Planilha_Importacao_CRM_Novos_SDR.xlsx`.

---

## Visão Geral

A planilha tem **2189 linhas** de empresas. O tamanho e a distribuição de cada lote é flexível — pode ser 200 de uma vez (50 por SDR) ou lotes menores para um SDR específico.
O controle de quais já foram importadas fica na coluna **`Status_Importacao`** (col 51) do arquivo `_fixed.xlsx` — linhas marcadas como `Importado` são puladas automaticamente na próxima execução.

**SDRs e seus IDs no sistema:**
| Nome na planilha | Nome completo no sistema | ID |
|---|---|---|
| Ãhwaryoné | Ãhwaryoné Barbosa Bandeira De Melo | 14 |
| Miguel | Miguel Luiz Pereira de Melo | 16 |
| Lucas | Lucas | 17 |
| Sérgio | Sérgio Viana | 15 | ⚠️ Existe outro usuário chamado "Sérgio" (id=12) que não é SDR. ✅ Resolvido via `SDR_NAME_MAP` a partir do Lote 5. |
| Claudia | Claudia | 8 |

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

### 3. Rodar o Script do lote desejado

Cada lote tem seu próprio script. Escolha o script conforme o lote:

**Lote 1 — 200 cards (50 por SDR: Ãhwaryoné, Miguel, Lucas, Sérgio):**
```bash
python scripts/imports/fix_novos_sdr_import.py
```
Gera: `Planilha_Importacao_CRM_Novos_SDR_lote1.xlsx`

**Lote 2 — 50 cards (Claudia):**
```bash
python scripts/imports/fix_novos_sdr_lote2.py
```
Gera: `Planilha_Importacao_CRM_Novos_SDR_lote2.xlsx`

**Para lotes futuros:** crie um novo script baseado no `fix_novos_sdr_lote2.py`, ajustando `SDR_NAME`, `CARDS_TO_IMPORT` e `OUTPUT_LOTE`.

Resultado esperado de qualquer script:
- Atualiza `_fixed.xlsx` marcando as linhas processadas como `Importado`
- Gera o arquivo do lote para importação

---

### 4. Rodar a importação no CRM

Use o caminho absoluto para evitar erro de arquivo não encontrado:

```bash
python scripts/imports/import_from_planilha.py d:/GitHub/hsgrowth-sistema/backend/scripts/imports/Planilha_Importacao_CRM_Novos_SDR_loteN.xlsx
```

Substitua `loteN` pelo número do lote (lote1, lote2, etc.).

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

> ✅ **A partir do Lote 4 este problema está resolvido.** Os scripts de geração de lote agora inserem os dados a partir da **row 5** (row 4 fica vazia), então o importer não perde nenhum card. O passo abaixo é histórico e só se aplica aos lotes 1, 2 e 3.

O script de importação sempre pula a primeira linha de dados (limitação conhecida do `import_from_planilha.py` — começa a processar a partir da linha 5). Nos lotes 1–3 os dados começavam na row 4, causando perda de 1 card.

**Para importar o card faltante manualmente**, verifique os dados da empresa na linha 4 do `loteN.xlsx` e rode o script abaixo adaptado:

```python
# PYTHONPATH=. python -c "..."
from app.db.session import SessionLocal
from app.models.card import Card
from app.models.client import Client
from app.models.person import Person
from sqlalchemy import func
import datetime

db = SessionLocal()

client = Client(
    name='RAZAO SOCIAL LTDA',
    company_name='RAZAO SOCIAL LTDA',
    document='XX.XXX.XXX/0001-XX',  # CNPJ
    state='UF',
    city='CIDADE',
    address='ENDEREÇO COMPLETO',
    cnae='CODIGO_CNAE',
    employee_count='FAIXA COLABORADORES',
    annual_revenue='FAIXA FATURAMENTO',
    phone='TELEFONE',
    email='EMAIL@EMPRESA.COM',
    source='importacao',
)
db.add(client)
db.flush()

person = Person(
    name='NOME CONTATO',
    organization_id=client.id,
    phone='TELEFONE CONTATO',
    phone_whatsapp='WHATSAPP',
    email='email@contato.com',
)
db.add(person)
db.flush()

max_pos = db.query(func.max(Card.position)).filter(Card.list_id == 22).scalar() or 0
card = Card(
    title='RAZAO SOCIAL LTDA',
    list_id=22,
    client_id=client.id,
    person_id=person.id,
    sdr_id=ID_SDR,  # ID do SDR responsável
    acquisition_channel='Outbound',
    acquisition_channel_detail='Outbound - Lista fria',
    position=max_pos + 1,
    created_at=datetime.datetime.now(datetime.UTC),
    updated_at=datetime.datetime.now(datetime.UTC),
)
db.add(card)
db.flush()
print(f'Card criado (id={card.id})')
db.commit()
db.close()
```

---

## Controle de Lotes

| Lote | Data | Cards | SDRs | IDs no banco | Status |
|---|---|---|---|---|---|
| Lote 1 | 06/04/2026 | 200 | Ãhwaryoné, Miguel, Lucas, Sérgio | 5058–5257 + 5370 | ✅ Importado |
| Lote 2 | 09/04/2026 | 50 | Claudia | 5376–5425 | ✅ Importado |
| Lote 3 | 13/04/2026 | 300 | Ãhwaryoné, Miguel, Lucas, Sérgio, Claudia, Karolaine | 5451–5749 + 5750 | ✅ Importado |
| Lote 4 | 22/04/2026 | 300 | Ãhwaryoné, Miguel, Lucas, Sérgio, Claudia, Karolaine | 5792–6091 | ✅ Importado |
| Lote 5 | 27/04/2026 | 180 | Ãhwaryoné, Miguel, Lucas, Sérgio, Claudia, Karolaine | 6344–6523 | ✅ Importado |
| ... | — | ... | ... | ... | ... |

**Obs. Lote 3:** 299 importados pelo script + 1 manual (EFITRANS TRANSPORTES LTDA, id=5750, Ãhwaryoné). Karolaine Martins (id=9) incluída pela primeira vez.

**Obs. Lote 5:** A partir deste lote, `import_from_planilha.py` preenche automaticamente: `deal_type="Nova Venda"` (Card), `relationship_type="Lead"` e `commercial_activity="Ativo"` (Client). SDRs não precisam mais preencher esses campos manualmente.

**Total importado:** 1030 leads | **Disponíveis na planilha:** 1159

---

## Problemas Conhecidos

| Problema | Causa | Solução |
|---|---|---|
| ~~"SDR Ãhwaryoné não encontrado"~~ | ~~Nome abreviado não batia com nome completo no banco~~ | ✅ **Resolvido a partir do Lote 5** — `SDR_NAME_MAP` em `import_from_planilha.py` mapeia diretamente nomes abreviados para IDs. |
| ~~"SDR Miguel não encontrado"~~ | Idem | ✅ Idem |
| ~~"SDR Karolaine não encontrado"~~ | Idem | ✅ Idem |
| ~~199 cards em vez de 200~~ | ~~Script pulava linha 4~~ | ✅ **Resolvido a partir do Lote 4** — scripts de geração iniciam dados na row 5. |
| Cards duplicados | Rodar o import duas vezes | Contatar time técnico para remover duplicatas |
| Novo SDR não encontrado | Nome completo no banco tem múltiplas palavras não presentes na planilha | Adicionar entrada em `SDR_NAME_MAP` no topo de `import_from_planilha.py` |
