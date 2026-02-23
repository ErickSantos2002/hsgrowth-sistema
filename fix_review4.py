"""
Script de revisao final 4 - placeholders e icones com text-slate-400 sem dark:
"""
import os
import glob

# Diretorios a varrer
src = r"D:\GitHub\hsgrowth-sistema\frontend\src"

patterns = [
    # Placeholder do SelectMenu (replace_all em todos os arquivos)
    (
        '? "" : "text-slate-400"',
        '? "" : "text-slate-500 dark:text-slate-400"'
    ),
    # ChevronDown standalone como text-slate-400 (replace_all)
    (
        'className="text-slate-400"',
        'className="text-slate-500 dark:text-slate-400"'
    ),
    # Icone Search condicional no KanbanBoard (linha 727)
    (
        'searchTerm ? "text-blue-400" : "text-slate-400"',
        'searchTerm ? "text-blue-400" : "text-slate-500 dark:text-slate-400"'
    ),
    # Icone Filter condicional no KanbanBoard (linha 739)
    (
        'showFilters ? "text-blue-400" : "text-slate-400"',
        'showFilters ? "text-blue-400" : "text-slate-500 dark:text-slate-400"'
    ),
]

tsx_files = glob.glob(os.path.join(src, "**/*.tsx"), recursive=True)

total_files = 0
total_changes = 0
for filepath in tsx_files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    for old, new in patterns:
        content = content.replace(old, new)

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        total_files += 1
        # Conta aproximadamente quantas substituicoes foram feitas
        changes = sum(original.count(old) for old, new in patterns)
        total_changes += changes
        print(f"  {os.path.relpath(filepath, src)}: modificado")

print(f"\nTotal: {total_files} arquivos modificados")
