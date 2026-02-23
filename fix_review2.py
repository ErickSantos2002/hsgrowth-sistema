"""
Script de revisao final 2 - fixes adicionais descobertos
"""
import os

fixes = {
    r"D:\GitHub\hsgrowth-sistema\frontend\src\components\settings\AwardBadgeModal.tsx": [
        # Lista de usuarios para atribuir badge - hover dark-only
        (
            'flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-slate-800 ${',
            'flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 ${'
        ),
    ],
    r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\KanbanBoard.tsx": [
        # Botao de busca e filtros no header (replace_all - 2 ocorrencias)
        (
            'rounded-lg p-2 transition-colors hover:bg-slate-800/50 ${',
            'rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50 ${'
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

print(f"\nTotal: {total} padroes aplicados")
