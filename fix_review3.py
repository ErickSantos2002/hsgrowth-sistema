"""
Script de revisao final 3 - text-slate-300 residuais
"""
import os

fixes = {
    r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\Persons.tsx": [
        # Cargo da pessoa na tabela (flex div com icone)
        (
            '"flex items-center gap-2 text-slate-300"',
            '"flex items-center gap-2 text-slate-600 dark:text-slate-300"'
        ),
    ],
    r"D:\GitHub\hsgrowth-sistema\frontend\src\components\settings\AwardBadgeModal.tsx": [
        # Label de selecao de vendedores
        (
            '"text-sm font-medium text-slate-300"',
            '"text-sm font-medium text-slate-700 dark:text-slate-300"'
        ),
    ],
    r"D:\GitHub\hsgrowth-sistema\frontend\src\components\settings\BadgeModal.tsx": [
        # Label "Icones sugeridos"
        (
            '"mb-2 text-sm font-medium text-slate-300"',
            '"mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"'
        ),
        # Label "Regra de Concessao Automatica"
        (
            '"text-sm font-medium text-slate-300"',
            '"text-sm font-medium text-slate-700 dark:text-slate-300"'
        ),
    ],
}

total = 0
for filepath, patterns in fixes.items():
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    count = 0
    not_found = []
    for old, new in patterns:
        n = content.count(old)
        if n > 0:
            content = content.replace(old, new)
            count += n
        else:
            not_found.append(old[:60])

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    name = os.path.basename(filepath)
    if not_found:
        print(f"  {name} NAO ENCONTRADOS: {not_found}")
    print(f"  {name}: {count} padroes aplicados")
    total += count

print(f"\nTotal: {total}")
