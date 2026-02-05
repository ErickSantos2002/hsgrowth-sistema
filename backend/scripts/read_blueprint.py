#!/usr/bin/env python3
"""
Script para ler e analisar o blueprint da consultora.
"""
import pandas as pd
import sys
from pathlib import Path

# Caminho da planilha
blueprint_path = Path(__file__).parent.parent / "blueprint" / "Blueprint da Receita_ HS.xlsx"

try:
    # Le todas as abas
    excel_file = pd.ExcelFile(blueprint_path)

    print("=" * 80)
    print("ABAS DISPONÍVEIS NA PLANILHA")
    print("=" * 80)
    for i, sheet_name in enumerate(excel_file.sheet_names, 1):
        print(f"{i}. {sheet_name}")

    # Le a aba 4 (Propriedades)
    # Tenta primeiro pelo nome
    propriedades_sheet = None
    for sheet_name in excel_file.sheet_names:
        if "propriedade" in sheet_name.lower() or "campo" in sheet_name.lower():
            propriedades_sheet = sheet_name
            break

    # Se não encontrou pelo nome, usa o índice 3 (4ª aba)
    if not propriedades_sheet:
        propriedades_sheet = excel_file.sheet_names[3] if len(excel_file.sheet_names) > 3 else excel_file.sheet_names[0]

    print(f"\n{'=' * 80}")
    print(f"CONTEÚDO DA ABA: {propriedades_sheet}")
    print("=" * 80)

    # Le a aba
    df = pd.read_excel(blueprint_path, sheet_name=propriedades_sheet)

    print(f"\nColunas encontradas: {list(df.columns)}")
    print(f"Total de linhas: {len(df)}")

    print(f"\n{'=' * 80}")
    print("DADOS COMPLETOS:")
    print("=" * 80)

    # Configura pandas para mostrar todas as colunas
    pd.set_option('display.max_columns', None)
    pd.set_option('display.max_rows', None)
    pd.set_option('display.width', None)
    pd.set_option('display.max_colwidth', None)

    print(df.to_string(index=False))

except FileNotFoundError:
    print(f"❌ Erro: Arquivo não encontrado em {blueprint_path}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Erro ao ler planilha: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
