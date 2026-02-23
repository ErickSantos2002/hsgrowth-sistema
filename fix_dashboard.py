file = r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\Dashboard.tsx"

with open(file, "r", encoding="utf-8") as f:
    content = f.read()

patterns = [
    # 1. Skeleton pequeno - h-8, h-10 (3 ocorrencias - replace_all)
    (
        'animate-pulse rounded bg-slate-700/50',
        'animate-pulse rounded bg-gray-200 dark:bg-slate-700/50'
    ),
    # 2. Container generico (stat cards, charts, top performers, skeletons grandes - replace_all)
    # Cobre as linhas: 224, 231, 436, 452, 468, 497, 571, 647
    (
        'border border-slate-700/50 bg-slate-800/50',
        'border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50'
    ),
    # 3. H1 do header
    (
        '"mb-2 flex items-center gap-3 text-3xl font-bold text-white"',
        '"mb-2 flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white"'
    ),
    # 4. Icone LayoutDashboard no titulo
    (
        '<LayoutDashboard className="text-white" size={32} />',
        '<LayoutDashboard className="text-slate-900 dark:text-white" size={32} />'
    ),
    # 5. Botao Refresh
    (
        '"flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/80 px-4 py-2 text-white transition-all hover:bg-slate-700/80"',
        '"flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-slate-900 transition-all hover:bg-gray-100 dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-white dark:hover:bg-slate-700/80"'
    ),
    # 6. Container dropdown de exportacao
    (
        '"invisible absolute right-0 z-10 mt-2 w-48 rounded-lg border border-slate-700 bg-slate-800 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100"',
        '"invisible absolute right-0 z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-800"'
    ),
    # 7. Botoes dentro do dropdown de exportacao (replace_all - 2 ocorrencias)
    (
        'text-left text-white transition-colors hover:bg-slate-700',
        'text-left text-slate-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-slate-700'
    ),
    # 8. H3 nos cards de stat e grafico (replace_all - 6 ocorrencias)
    (
        '"text-lg font-semibold text-white"',
        '"text-lg font-semibold text-slate-900 dark:text-white"'
    ),
    # 9. Linha do top performer
    (
        '"flex items-center justify-between rounded-lg border border-slate-600/30 bg-slate-700/30 p-4 transition-all hover:bg-slate-700/50"',
        '"flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:bg-gray-100 dark:border-slate-600/30 dark:bg-slate-700/30 dark:hover:bg-slate-700/50"'
    ),
    # 10. Nome do vendedor no top performers
    (
        '"font-medium text-white"',
        '"font-medium text-slate-900 dark:text-white"'
    ),
    # 11. SelectMenu - botao trigger
    (
        '"flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"',
        '"flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"'
    ),
    # 12. SelectMenu - dropdown container
    (
        '"absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg"',
        '"absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"'
    ),
    # 13. SelectMenu - opcoes (text-sm text-white hover)
    (
        '`w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${',
        '`w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${'
    ),
    # 14. SelectMenu - opcao selecionada
    (
        'option.value === value ? "bg-slate-800/70" : ""',
        'option.value === value ? "bg-gray-100 dark:bg-slate-800/70" : ""'
    ),
]

count = 0
not_found = []
for old, new in patterns:
    occurrences = content.count(old)
    if occurrences > 0:
        content = content.replace(old, new)
        count += occurrences
    else:
        not_found.append(old[:70])

with open(file, "w", encoding="utf-8") as f:
    f.write(content)

if not_found:
    print(f"NAO ENCONTRADOS ({len(not_found)}):")
    for s in not_found:
        print(f"  - {repr(s)}")
print(f"Dashboard.tsx: {count} padroes aplicados")
