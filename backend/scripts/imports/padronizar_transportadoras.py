"""
Padroniza a Planilha_Nova_030726.xlsx (prospecção de transportadoras/operadores
logísticos) para o layout aceito pelo import_from_planilha.py.

Entrada : Planilha_Nova_030726.xlsx  (aba CONSOLIDADO, cabeçalho na row 3, dados row 4+)
Saída   : Planilha_Transportadoras_Prospeccao_fixed.xlsx  (aba "Importação_CRM",
          3 linhas de cabeçalho copiadas do template padrão, dados a partir da row 4,
          coluna Status_Importacao vazia = pendente)

Regras de conversão:
  - Nº FUNC. (número) -> Faixa de Funcionários (texto). 0/vazio => em branco.
  - FATURAMENTO (R$)  -> Faixa de Faturamento (texto). 0/vazio => em branco.
  - Site "🔍 Buscar site"/vazio => em branco.
  - Nome_Contato1 fica em branco (planilha nova não tem contato dedicado — o SDR
    preenche depois; o telefone/e-mail da empresa vão para Fone1/Email1_Empresa).
  - SDR_Responsavel / Canal_Aquisicao / Status_Importacao ficam em branco
    (preenchidos pelos scripts de lote).
"""

import os
import openpyxl

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
SRC_FILE     = os.path.join(SCRIPT_DIR, "Planilha_Nova_030726.xlsx")
TEMPLATE_STD = os.path.join(SCRIPT_DIR, "Planilha_Importacao_CRM_Novos_SDR_fixed.xlsx")
OUT_FILE     = os.path.join(SCRIPT_DIR, "Planilha_Transportadoras_Prospeccao_fixed.xlsx")

SRC_SHEET    = "CONSOLIDADO"
SRC_HEADER   = 3
SRC_DATA     = 4
STD_SHEET    = "Importação_CRM"
STD_HEADER   = 3      # 3 linhas de cabeçalho no padrão
STD_COLS     = 51

# Índices (1-based) das colunas na planilha NOVA (aba CONSOLIDADO)
N_LOTE, N_CNPJ, N_RAZAO, N_FANTASIA, N_CIDADE, N_UF = 1, 2, 3, 4, 5, 6
N_PORTE, N_FUNC, N_FATUR, N_CNAE, N_TEL, N_EMAIL1, N_EMAIL2 = 7, 8, 9, 10, 11, 12, 13
N_WEBSITE = 14

# Índices (1-based) das colunas no PADRÃO (aba Importação_CRM)
P_CNPJ, P_RAZAO, P_FANTASIA, P_SITE, P_UF, P_CIDADE, P_ENDERECO = 1, 2, 3, 4, 5, 6, 7
P_CNAE, P_FX_FUNC, P_FX_FATUR = 8, 9, 10
P_FONE1, P_EMAIL1, P_EMAIL2 = 11, 14, 15
P_STATUS = 51


def faixa_funcionarios(val):
    try:
        n = int(float(val))
    except (TypeError, ValueError):
        return None
    if n <= 0:
        return None
    if n <= 50:
        return "Ate 50 colaboradores"
    if n <= 100:
        return "51-100 colaboradores"
    if n <= 300:
        return "101-300 colaboradores"
    if n <= 600:
        return "301-600 colaboradores"
    if n <= 1000:
        return "601-1.000 colaboradores"
    return "Acima de 1.000 colaboradores"


def faixa_faturamento(val):
    try:
        n = float(val)
    except (TypeError, ValueError):
        return None
    if n <= 0:
        return None
    if n <= 10_000_000:
        return "Ate R$ 10 milhoes"
    if n <= 30_000_000:
        return "R$ 10-30 milhoes"
    if n <= 100_000_000:
        return "R$ 30-100 milhoes"
    if n <= 300_000_000:
        return "R$ 100-300 milhoes"
    if n <= 1_000_000_000:
        return "R$ 300 milhoes - R$ 1 bilhao"
    return "Acima de R$ 1 bilhao"


def clean(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def clean_site(v):
    s = clean(v)
    if not s or "buscar" in s.lower():
        return None
    return s


def main():
    print("=" * 60)
    print("PADRONIZAÇÃO — Planilha_Nova_030726 -> layout CRM")
    print("=" * 60)

    # 1) Copia as 3 linhas de cabeçalho do template padrão
    wb_std = openpyxl.load_workbook(TEMPLATE_STD, read_only=True)
    ws_std = wb_std[STD_SHEET]
    header_rows = []
    for r in range(1, STD_HEADER + 1):
        header_rows.append([ws_std.cell(r, c).value for c in range(1, STD_COLS + 1)])
    wb_std.close()

    wb_out = openpyxl.Workbook()
    ws_out = wb_out.active
    ws_out.title = STD_SHEET
    for r, rowvals in enumerate(header_rows, start=1):
        for c, v in enumerate(rowvals, start=1):
            ws_out.cell(r, c).value = v

    # 2) Lê a planilha nova em streaming e escreve no padrão
    wb_src = openpyxl.load_workbook(SRC_FILE, read_only=True)
    ws_src = wb_src[SRC_SHEET]

    dest = STD_HEADER + 1  # começa na row 4
    total = 0
    com_func = 0
    com_fatur = 0
    for i, row in enumerate(ws_src.iter_rows(values_only=True), start=1):
        if i < SRC_DATA:
            continue
        cnpj = clean(row[N_CNPJ - 1])
        razao = clean(row[N_RAZAO - 1])
        if not cnpj and not razao:
            continue

        fx_func = faixa_funcionarios(row[N_FUNC - 1])
        fx_fatur = faixa_faturamento(row[N_FATUR - 1])
        if fx_func:
            com_func += 1
        if fx_fatur:
            com_fatur += 1

        ws_out.cell(dest, P_CNPJ).value     = cnpj
        ws_out.cell(dest, P_RAZAO).value    = razao
        ws_out.cell(dest, P_FANTASIA).value = clean(row[N_FANTASIA - 1])
        ws_out.cell(dest, P_SITE).value     = clean_site(row[N_WEBSITE - 1])
        ws_out.cell(dest, P_UF).value       = clean(row[N_UF - 1])
        ws_out.cell(dest, P_CIDADE).value   = clean(row[N_CIDADE - 1])
        ws_out.cell(dest, P_CNAE).value     = clean(row[N_CNAE - 1])
        ws_out.cell(dest, P_FX_FUNC).value  = fx_func
        ws_out.cell(dest, P_FX_FATUR).value = fx_fatur
        ws_out.cell(dest, P_FONE1).value    = clean(row[N_TEL - 1])
        ws_out.cell(dest, P_EMAIL1).value   = clean(row[N_EMAIL1 - 1])
        ws_out.cell(dest, P_EMAIL2).value   = clean(row[N_EMAIL2 - 1])
        # Nome_Contato1, SDR, Canal, Status: em branco
        dest += 1
        total += 1

    wb_src.close()
    wb_out.save(OUT_FILE)

    print(f"Linhas padronizadas : {total}")
    print(f"Com Faixa Funcionários preenchida : {com_func}")
    print(f"Com Faixa Faturamento preenchida  : {com_fatur}")
    print(f"Arquivo gerado: {os.path.basename(OUT_FILE)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
