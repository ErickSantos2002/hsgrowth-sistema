"""
Transportadoras — Lote 15 — 100 leads: todos para Claudia
  - Claudia                              (id=8)  — SDR

Fonte: Planilha_Transportadoras_Prospeccao_fixed.xlsx (padronizada de Planilha_Nova_030726).

Claudia é SDR -> atribuída na coluna `SDR_Responsavel *` (-> card.sdr_id).
(Miguel/Karolaine seriam Vendedores via `Vendedor_Responsavel`, mas não entram neste lote.)

Anti-duplicata: pula QUALQUER linha com Status_Importacao preenchido — tanto
'Importado' (já subida) quanto 'CNPJ_no_CRM' (CNPJ já cadastrado no CRM). As
pendentes já estão ordenadas com Website primeiro.

O que faz:
  - Lê Planilha_Transportadoras_Prospeccao_fixed.xlsx
  - Pega as próximas 100 linhas SEM Status_Importacao
  - Atribui as 100 linhas a Claudia (coluna SDR)
  - Preenche Canal_Aquisicao = "Outbound" / Detalhe = "Outbound - Lista fria"
  - Marca como "Importado" na coluna Status_Importacao
  - Salva transportadoras_lote15.xlsx para passar ao import_from_planilha.py
"""

import os
import openpyxl

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
FIXED_FILE  = os.path.join(SCRIPT_DIR, "Planilha_Transportadoras_Prospeccao_fixed.xlsx")
OUTPUT_LOTE = os.path.join(SCRIPT_DIR, "Planilha_Transportadoras_Prospeccao_lote15.xlsx")

HEADER_ROW       = 3
DATA_START       = 4
CARDS_PER_PESSOA = 100
CANAL            = "Outbound"
CANAL_DETALHE    = "Outbound - Lista fria"
STATUS_IMPORTADO = "Importado"

# (nome, quantidade) — a coluna (SDR ou Vendedor) é decidida por VENDEDORES abaixo
PESSOAS = [
    ("Claudia", 100),
]

# Miguel e Karolaine são VENDEDORES -> coluna Vendedor_Responsavel (assigned_to_id).
# Qualquer nome fora deste conjunto (ex.: Claudia) vai para SDR_Responsavel.
VENDEDORES = {"Miguel", "Karolaine"}


def find_col(ws, header_row, name):
    for col in range(1, ws.max_column + 1):
        val = ws.cell(row=header_row, column=col).value
        if val and str(val).strip() == name:
            return col
    return None


def main():
    print("=" * 60)
    print("TRANSPORTADORAS LOTE 15 — 100 cards (todos para Claudia — SDR)")
    print("=" * 60)

    wb = openpyxl.load_workbook(FIXED_FILE)
    ws = wb["Importação_CRM"]

    col_sdr     = find_col(ws, HEADER_ROW, "SDR_Responsavel *")
    col_vend    = find_col(ws, HEADER_ROW, "Vendedor_Responsavel")
    col_canal   = find_col(ws, HEADER_ROW, "Canal_Aquisicao")
    col_detalhe = find_col(ws, HEADER_ROW, "Canal_Aquisicao_Detalhe")
    col_status  = find_col(ws, HEADER_ROW, "Status_Importacao")
    col_site    = find_col(ws, HEADER_ROW, "Site")

    if not col_vend:
        raise RuntimeError("Coluna 'Vendedor_Responsavel' não encontrada — rode padronizar_transportadoras.py primeiro.")

    print(f"col SDR={col_sdr} | Vendedor={col_vend} | Canal={col_canal} | Status={col_status} | Site={col_site}")

    # Coleta próximas linhas livres (pula qualquer Status preenchido: Importado OU CNPJ_no_CRM)
    pending = []
    for r in range(DATA_START, ws.max_row + 1):
        if not ws.cell(r, 1).value:
            continue
        if ws.cell(r, col_status).value:
            continue
        pending.append(r)

    total_needed = sum(n for _, n in PESSOAS)
    print(f"Linhas pendentes (novas): {len(pending)} | Necessárias: {total_needed}")

    if len(pending) < total_needed:
        print(f"AVISO: apenas {len(pending)} linhas disponíveis — ajustando...")

    rows_to_process = pending[:total_needed]

    assignment = []
    for nome, n in PESSOAS:
        assignment.extend([nome] * n)
    assignment = assignment[:len(rows_to_process)]

    for r, nome in zip(rows_to_process, assignment):
        if nome in VENDEDORES:
            ws.cell(r, col_vend).value = nome
            ws.cell(r, col_sdr).value  = None
        else:
            ws.cell(r, col_sdr).value  = nome
            ws.cell(r, col_vend).value = None
        ws.cell(r, col_canal).value   = CANAL
        ws.cell(r, col_detalhe).value = CANAL_DETALHE
        ws.cell(r, col_status).value  = STATUS_IMPORTADO

    com_site = sum(1 for r in rows_to_process if ws.cell(r, col_site).value)
    print(f"Deste lote, com Website: {com_site}/{len(rows_to_process)}")

    wb.save(FIXED_FILE)
    print("_fixed.xlsx atualizado.")

    print("\nDistribuição:")
    for nome, _ in PESSOAS:
        campo = "Vendedor" if nome in VENDEDORES else "SDR"
        print(f"  {nome} ({campo}): {assignment.count(nome)} cards")

    # Gera lote15.xlsx
    wb_lote = openpyxl.Workbook()
    ws_lote = wb_lote.active
    ws_lote.title = "Importação_CRM"

    for r in range(1, DATA_START):
        for c in range(1, ws.max_column + 1):
            ws_lote.cell(r, c).value = ws.cell(r, c).value

    # Row 4 fica em branco intencionalmente — import_from_planilha.py pula a primeira linha de dados (row 4),
    # então os dados começam na row 5 para que todos os cards sejam importados sem perda.
    for dest_row, src_row in enumerate(rows_to_process, start=DATA_START + 1):
        for c in range(1, ws.max_column + 1):
            ws_lote.cell(dest_row, c).value = ws.cell(src_row, c).value

    wb_lote.save(OUTPUT_LOTE)

    print(f"\ntransportadoras_lote15.xlsx salvo com {len(rows_to_process)} linhas (dados a partir da row 5 — sem card faltante).")
    print("\nPróximo passo:")
    print("  python scripts/imports/import_from_planilha.py C:/Users/HS/Documents/GitHub/hsgrowth-sistema/backend/scripts/imports/Planilha_Transportadoras_Prospeccao_lote15.xlsx")
    print("=" * 60)


if __name__ == "__main__":
    main()
