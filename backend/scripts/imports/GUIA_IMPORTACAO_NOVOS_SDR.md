# Guia de Importação — Planilha Novos SDR

Arquivo de referência para importar os lotes de cards da planilha `Planilha_Importacao_CRM_Novos_SDR.xlsx`.

---

## Visão Geral

A planilha tem **2189 linhas** de empresas. O tamanho e a distribuição de cada lote é flexível — pode ser 200 de uma vez (50 por SDR) ou lotes menores para um SDR específico.
O controle de quais já foram importadas fica na coluna **`Status_Importacao`** (col 51) do arquivo `_fixed.xlsx` — linhas marcadas como `Importado` são puladas automaticamente na próxima execução.

**SDRs e seus IDs no sistema:**
| Nome na planilha | Nome completo no sistema | ID | Status |
|---|---|---|---|
| Miguel | Miguel Luiz Pereira de Melo | 16 | ✅ Ativo |
| Claudia | Claudia | 8 | ✅ Ativo |
| Karolaine | Karolaine Martins | 9 | ✅ Ativo |
| Ãhwaryoné | Ãhwaryoné Barbosa Bandeira De Melo | 14 | ❌ Inativo (desligado 12/05/2026) |
| Lucas | Lucas | 17 | ❌ Inativo (desligado 12/05/2026) |
| Sérgio | Sérgio Viana | 15 | ❌ Inativo (desligado anteriormente) |

> ⚠️ **Ao gerar novos lotes, usar apenas os SDRs ativos: Claudia (8), Karolaine (9) e Miguel (16).**

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

**Para lotes futuros:** crie um novo script baseado no `fix_novos_sdr_lote6.py`, ajustando `SDRS`, `CARDS_PER_SDR` e `OUTPUT_LOTE`. Usar apenas SDRs ativos: Claudia (8), Karolaine (9) e Miguel (16).

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
| Lote 6 | 11/05/2026 | 150 | Ãhwaryoné, Miguel, Lucas, Claudia, Karolaine | 6689–6838 | ✅ Importado |
| Lote 7 | 28/05/2026 | 150 | Claudia, Karolaine, Miguel | 7051–7200 | ✅ Importado |
| Lote 8 | 02/06/2026 | 150 | Claudia, Karolaine, Miguel | 7241–7390 | ✅ Importado |
| Lote 9 | 08/06/2026 | 100 | Karolaine, Miguel | 7449–7548 | ✅ Importado |
| Lote 10 | 15/06/2026 | 150 | Claudia, Karolaine, Miguel | 7651–7800 | ✅ Importado |
| Lote 11 | 19/06/2026 | 40 | Karolaine, Miguel | 7849–7888 | ✅ Importado |
| Lote 12 | 19/06/2026 | 60 | Karolaine, Miguel | 7891–7950 | ✅ Importado |
| Lote 13 | 19/06/2026 | 50 | Miguel | 7985–8034 | ✅ Importado |
| Lote 14 | 26/06/2026 | 50 | Karolaine | 8040–8089 | ✅ Importado |
| Lote 15 | 26/06/2026 | 100 | Karolaine, Miguel | 8097–8196 | ✅ Importado |
| Lote 16 | 01/07/2026 | 159 | Karolaine (80), Miguel (79) | 8263–8421 | ✅ Importado |
| ... | — | ... | ... | ... | ... |

**Fim da planilha "Novos SDR":** 2189/2189 (100%) importados no Lote 16. Novos lotes usam outra fonte (ver abaixo).

---

## Fonte 2 — Transportadoras / Operadores Logísticos (Prospecção SSMA)

Planilha original: `Planilha_Nova_030726.xlsx` (aba CONSOLIDADO, 4.056 empresas, todas ATIVA).
Padronizada para o layout CRM via `padronizar_transportadoras.py` → **`Planilha_Transportadoras_Prospeccao_fixed.xlsx`** (mesmo formato de 51 colunas; `Status_Importacao` controla o que já subiu).

**Diferenças desta fonte:**
- Sem contato dedicado → `Nome_Contato1` fica em branco (telefone/e-mail vão para Fone1/Email1_Empresa). Cards criados sem pessoa vinculada (SDR preenche depois).
- `Nº FUNC.` e `FATURAMENTO` vêm como número e são convertidos para as faixas-texto do CRM. Func. = 0 → faixa em branco.
- CNAE vem como descrição (sem código) → campo `cnae` fica null (esperado).

**Site / LinkedIn / SSMA (a partir de 09/07/2026, só nos lotes novos):** o `padronizar_transportadoras.py` extrai os hyperlinks reais da planilha e preenche. **Os três aparecem na seção "Cliente (Organização)" do detalhe do card:**

| Planilha | Coluna no `_fixed` | Campo no banco | Onde aparece no CRM |
|---|---|---|---|
| WEBSITE | `Site` (col 4) | `client.website` | Cliente (Organização) → **Website** |
| LinkedIn Empresa | `Linkedin_Empresa` (col 52, nova) | `client.linkedin_url` | Cliente (Organização) → **LinkedIn** |
| SSMA no LinkedIn | `Notes_Cliente` (col 53, nova) | `client.notes` | Cliente (Organização) → **Observações** |

- Placeholder "Buscar site" → Site em branco. Stubs `.../company/` sem nome → LinkedIn em branco.
- `import_from_planilha.py` foi atualizado para ler `Linkedin_Empresa` e `Notes_Cliente` (colunas opcionais — planilhas antigas sem elas continuam funcionando).
- `ClientSection.tsx` foi atualizado para renderizar **LinkedIn** e **Observações** (com URLs clicáveis) abaixo do Website.
- ⚠️ Esses campos só são gravados em **clientes novos**. Se o CNPJ já existir no CRM, o importer reaproveita o cliente e não sobrescreve.
- O script preserva o controle (`Status_Importacao`/SDR/Canal) por CNPJ, então pode ser re-rodado sem re-importar lotes já subidos. Os 500 já importados (Transp. Lote 1+2) **não** foram retroativamente preenchidos.

**Priorização por Website (a partir de 09/07/2026):** o `padronizar_transportadoras.py` ordena as linhas pendentes **com site primeiro** (bloco já importado fica no topo, depois pendentes com Website em ordem original, por último os sem Website). Como os geradores de lote pegam as pendentes na ordem do arquivo, os próximos lotes sobem automaticamente quem tem site até esgotar, depois os demais. Situação em 09/07/2026: **2.014 pendentes com site** (rows 504–2517) e **1.542 sem site** (rows 2518+).

**Gerar lote:** use `fix_transportadoras_lote1.py` como base (ajuste `SDRS`, `CARDS_PER_SDR` e `OUTPUT_LOTE`), aponta para o `_fixed` desta fonte. Import roda com o mesmo `import_from_planilha.py`.

| Lote | Data | Cards | SDRs | IDs no banco | Status |
|---|---|---|---|---|---|
| Transp. Lote 1 | 03/07/2026 | 300 | Claudia (100), Karolaine (100), Miguel (100) | 8452–8751 | ✅ Importado |
| Transp. Lote 2 | 09/07/2026 | 200 | Karolaine (100), Miguel (100) | 8804–9006 | ✅ Importado |
| Transp. Lote 3 | 10/07/2026 | 100 | Miguel | 9026–9125 | ✅ Importado |
| Transp. Lote 4 | 14/07/2026 | 100 | Karolaine (50), Claudia (50) | 9140–9240 | ✅ Importado |
| Transp. Lote 5 | 23/07/2026 | 100 | Miguel (50), Karolaine (50) | 9341–9440 | ✅ Importado |
| Transp. Lote 6 | 24/07/2026 | 100 | Claudia (50), Miguel (50) | 9449–9553 | ✅ Importado |
| Transp. Lote 7 | 29/07/2026 | 100 | Miguel | 9580–9679 | ✅ Importado |
| Transp. Lote 8 | 29/07/2026 | 200 | Claudia (100), Karolaine (100) | 9687–9886 | ✅ Importado |
| Transp. Lote 9 | 29/07/2026 | 200 | Miguel (100), Karolaine (100) | 10014–10213 | ✅ Importado |
| Transp. Lote 10 | 29/07/2026 | 100 | Claudia | 10251–10357 | ✅ Importado |
| Transp. Lote 11 | 18/08/2026 | 100 | Karolaine | 10387–10486 | ✅ Importado |
| ... | — | ... | ... | ... | ... |

**Obs. Transp. Lote 2:** o range 8804–9006 inclui 1 card orgânico de Karolaine (Lista fria) criado por SDR na janela; o lote em si é 100/100 (200 linhas, 0 erros).

**Obs. Transp. Lote 3:** primeiro lote com Site/LinkedIn/SSMA e com priorização por Website — **100/100 com site**. Dos 100 cards: 66 clientes novos (todos com `website` + `linkedin_url` + `notes`) e 34 reaproveitados por CNPJ (não sobrescritos).

**Obs. Transp. Lote 4:** 100/100 com site. 79 clientes novos (com `website` + `linkedin_url` + `notes`) e 21 reaproveitados por CNPJ.

**Anti-duplicata (a partir de 23/07/2026):** o `padronizar_transportadoras.py` agora consulta os CNPJs já cadastrados no CRM e joga as linhas pendentes com CNPJ duplicado para o **final**, marcadas `Status_Importacao = "CNPJ_no_CRM"`. Os geradores de lote pulam **qualquer** linha com Status preenchido, então essas não sobem (ficam para revisão futura). O `import_from_planilha.py` também ganhou um guardrail: pula qualquer linha cujo CNPJ já exista no CRM (reportado como "Pulados (CNPJ no CRM)"). Na 1ª execução: **169 CNPJs** já existiam no CRM → separados; **3.187 pendentes novos**.

**Obs. Transp. Lote 5:** primeiro lote pós anti-duplicata. **100 clientes novos (100/100)** — nenhum reaproveitado, 0 pulados. website 100, notes 100, linkedin 98.

**Obs. Transp. Lote 6:** 100/100 com site, **100 clientes novos**, 0 pulados. O range 9449–9553 inclui 1 card orgânico de Claudia (Lista fria) criado por SDR na janela; o lote é 50/50.

**Obs. Transp. Lote 7:** 100/100 com site, 100 clientes novos, 0 pulados, sem card orgânico (100 exatos). website 100, notes 100, linkedin 91.

**Obs. Transp. Lote 8:** 200/200 com site, 200 clientes novos, 0 pulados. website 200, notes 200, linkedin 193.

**Obs. Transp. Lote 9:** 200/200 com site, 200 clientes novos, 0 pulados. Miguel 10014–10113, Karolaine 10114–10213 (os cards 9889–9904 de Claudia são orgânicos, fora do lote). website 200, notes 200, linkedin ~188.

**Obs. Transp. Lote 10:** 100/100 com site, 100 clientes novos, 0 pulados. Range 10251–10357 inclui 1 card orgânico de Claudia (o lote é 100 exatos). website 100, notes 100, linkedin 100.

**Obs. Transp. Lote 11:** 100/100 com site, 100 clientes novos, 0 pulados. Karolaine 10387–10486 (o card 10365 de Claudia é orgânico). website 100, notes 100, linkedin 98.

**Total Transportadoras importado:** 1600 | **Pendentes novos:** 2.287 de 4.056 | **Separados (CNPJ já no CRM):** 169.

---

**Obs. Lote 3:** 299 importados pelo script + 1 manual (EFITRANS TRANSPORTES LTDA, id=5750, Ãhwaryoné). Karolaine Martins (id=9) incluída pela primeira vez.

**Obs. Lote 5:** A partir deste lote, `import_from_planilha.py` preenche automaticamente: `deal_type="Nova Venda"` (Card), `relationship_type="Lead"` e `commercial_activity="Ativo"` (Client). SDRs não precisam mais preencher esses campos manualmente.

**Obs. Lote 6:** Último lote com Aury (id=14). A partir do Lote 7 usar apenas Claudia, Karolaine e Miguel.

**Obs. Desligamento Aury e Lucas (12/05/2026):** 169 cards movidos da Prospecção para Lead Novo (86 Aury + 83 Lucas) e 239 cards redistribuídos entre os SDRs ativos via round-robin (Claudia: 80, Karolaine: 80, Miguel: 79). 2.345 tarefas reatribuídas automaticamente.

**Obs. Lote 7:** Primeiro lote apenas com SDRs ativos (Claudia, Karolaine, Miguel). 50 cards cada, 0 erros, 132 clientes criados e 18 reutilizados.

**Total importado:** 2189 leads | **Disponíveis na planilha:** 0 (planilha 100% importada)

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
