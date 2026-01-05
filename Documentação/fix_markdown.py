#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para corrigir arquivos markdown com quebras de linha literais (\n)
"""

import os
import re
from pathlib import Path

def fix_markdown_file(filepath):
    """Corrige um arquivo markdown substituindo \n literal por quebras reais"""
    try:
        # Ler arquivo
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Substituir \n literal por quebras de linha reais
        # Precisa fazer isso de forma cuidadosa para não quebrar código
        fixed_content = content.replace('\\n', '\n')

        # Criar novo nome de arquivo (remover _n_n do nome se existir)
        original_name = filepath.name
        new_name = original_name

        # Extrair o nome correto do início do arquivo problemático
        if '_n_n' in original_name:
            # Pegar apenas a parte antes do _n_n
            match = re.match(r'^(\d+\s*-\s*[^_]+)', original_name)
            if match:
                clean_name = match.group(1).strip()
                new_name = f"{clean_name}.md"
            else:
                # Para arquivos como "PROPOSTA EXECUTIVA_..."
                match = re.match(r'^([A-Z\s]+)', original_name)
                if match:
                    clean_name = match.group(1).strip()
                    new_name = f"{clean_name}.md"

        # Criar caminho do novo arquivo
        new_filepath = filepath.parent / new_name

        # Escrever arquivo corrigido
        with open(new_filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(fixed_content)

        print(f"[OK] Corrigido: {original_name}")
        if new_name != original_name:
            print(f"   Renomeado para: {new_name}")
            # Remover arquivo antigo se foi renomeado
            if filepath != new_filepath:
                try:
                    os.remove(filepath)
                    print(f"   Removido arquivo antigo: {original_name}")
                except Exception as e:
                    print(f"   [AVISO] Nao foi possivel remover arquivo antigo: {e}")

        return True
    except Exception as e:
        print(f"[ERRO] Erro ao processar {filepath.name}: {e}")
        return False

def main():
    # Diretório atual
    current_dir = Path(__file__).parent

    print("Corrigindo arquivos markdown...\n")

    # Encontrar todos os arquivos .md
    md_files = list(current_dir.glob("*.md"))

    fixed_count = 0
    for md_file in md_files:
        if fix_markdown_file(md_file):
            fixed_count += 1

    print(f"\n[OK] Concluido! {fixed_count} arquivos processados.")

if __name__ == "__main__":
    main()
