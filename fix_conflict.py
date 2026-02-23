"""
Remove dark:text-slate-500 duplicado quando aparece junto com dark:text-slate-400
na mesma className — causa de cssConflict no Tailwind IntelliSense.

O script remove dark:text-slate-500 deixando apenas dark:text-slate-400,
que é o valor correto para texto secundário em dark mode (mais claro).
"""

import os
import re

src_dir = r"D:\GitHub\hsgrowth-sistema\frontend\src"

# Padrão 1: dark:text-slate-500 antes de dark:text-slate-400 (com possíveis classes entre eles)
# Padrão 2: dark:text-slate-400 antes de dark:text-slate-500

total_files = 0
total_fixes = 0

for root, dirs, files in os.walk(src_dir):
    for fname in files:
        if not fname.endswith(".tsx"):
            continue

        path = os.path.join(root, fname)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        original = content

        # Remove dark:text-slate-500 quando dark:text-slate-400 também está presente na mesma string className
        # Padrão: "...dark:text-slate-500 ...[alguma coisa]... dark:text-slate-400..."
        content = re.sub(r"dark:text-slate-500 ([a-z:0-9/-]+ )*dark:text-slate-400",
                         lambda m: m.group(0).replace("dark:text-slate-500 ", ""),
                         content)

        # Padrão: "...dark:text-slate-400 ...[alguma coisa]... dark:text-slate-500..."
        content = re.sub(r"dark:text-slate-400( [a-z:0-9/-]+)* dark:text-slate-500",
                         lambda m: m.group(0).replace(" dark:text-slate-500", ""),
                         content)

        # Caso direto sem nada entre eles (mais seguro, cobre o caso principal)
        content = content.replace("dark:text-slate-500 dark:text-slate-400", "dark:text-slate-400")
        content = content.replace("dark:text-slate-400 dark:text-slate-500", "dark:text-slate-400")

        if content != original:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            fixes = original.count("dark:text-slate-500 dark:text-slate-400") + original.count("dark:text-slate-400 dark:text-slate-500")
            total_files += 1
            total_fixes += fixes
            print(f"  Corrigido: {fname} ({fixes} ocorrência(s))")

print(f"\nTotal: {total_fixes} conflitos corrigidos em {total_files} arquivo(s)")
