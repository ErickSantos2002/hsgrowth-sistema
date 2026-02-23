file = r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\Reports.tsx"

with open(file, "r", encoding="utf-8") as f:
    content = f.read()

patterns = [
    # 1. "Acesso Restrito" h2
    (
        '"mb-2 text-2xl font-bold text-white"',
        '"mb-2 text-2xl font-bold text-slate-900 dark:text-white"'
    ),
    # 2. H1 do header
    (
        '"mb-2 flex items-center gap-3 text-3xl font-bold text-white"',
        '"mb-2 flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white"'
    ),
    # 3. Icone FileText no H1
    (
        '<FileText className="text-white" size={32} />',
        '<FileText className="text-slate-900 dark:text-white" size={32} />'
    ),
    # 4. Tabs - borda inferior
    (
        'border-b border-slate-700 sm:justify-start sm:gap-4',
        'border-b border-gray-200 sm:justify-start sm:gap-4 dark:border-slate-700'
    ),
    # 5. Tabs - estado inativo (3 ocorrencias - replace_all)
    (
        "'text-slate-400 hover:text-slate-300'",
        "'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'"
    ),
    # 6. Container de filtros xl (3 ocorrencias - replace_all)
    (
        '"rounded-xl border border-slate-700 bg-slate-800/50 p-6"',
        '"rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50"'
    ),
    # 7. H2 "Filtros" nas 3 abas (3 ocorrencias - replace_all)
    (
        '"mb-4 text-lg font-semibold text-white"',
        '"mb-4 text-lg font-semibold text-slate-900 dark:text-white"'
    ),
    # 8. Labels de filtro (replace_all - muitas ocorrencias)
    (
        '"mb-2 block text-sm font-medium text-slate-300"',
        '"mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"'
    ),
    # 9. Inputs de data (replace_all - 6 ocorrencias)
    (
        '"w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"',
        '"w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"'
    ),
    # 10. Containers de tabela com p-6 (MetricCard + tabelas de detalhamento - replace_all)
    (
        '"rounded-lg border border-slate-700 bg-slate-800/50 p-6 backdrop-blur"',
        '"rounded-lg border border-gray-200 bg-white p-6 backdrop-blur dark:border-slate-700 dark:bg-slate-800/50"'
    ),
    # 11. ChartCard container (p-4)
    (
        '"rounded-lg border border-slate-700 bg-slate-800/50 p-4 backdrop-blur"',
        '"rounded-lg border border-gray-200 bg-white p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-800/50"'
    ),
    # 12. H3 em "Detalhamento" e "Funil de Conversao" (replace_all - 3 ocorrencias)
    (
        '"text-lg font-semibold text-white"',
        '"text-lg font-semibold text-slate-900 dark:text-white"'
    ),
    # 13. ChartCard h4
    (
        '"mb-3 text-base font-semibold text-white"',
        '"mb-3 text-base font-semibold text-slate-900 dark:text-white"'
    ),
    # 14. MetricCard valor
    (
        '"text-2xl font-bold text-white"',
        '"text-2xl font-bold text-slate-900 dark:text-white"'
    ),
    # 15. Linha de cabecalho das tabelas (replace_all - 3 ocorrencias)
    (
        '"border-b border-slate-700"',
        '"border-b border-gray-200 dark:border-slate-700"'
    ),
    # 16. th com text-slate-300 (replace_all - muitas ocorrencias)
    (
        'text-sm font-medium text-slate-300',
        'text-sm font-medium text-slate-700 dark:text-slate-300'
    ),
    # 17. Linhas do corpo da tabela (replace_all - 3 ocorrencias)
    (
        '"border-b border-slate-700/50 hover:bg-slate-700/30"',
        '"border-b border-gray-100 hover:bg-gray-50 dark:border-slate-700/50 dark:hover:bg-slate-700/30"'
    ),
    # 18. td primeira coluna text-white (replace_all - 3 ocorrencias)
    (
        '"px-4 py-3 text-white"',
        '"px-4 py-3 text-slate-900 dark:text-white"'
    ),
    # 19. td outras colunas text-slate-300 (replace_all - muitas ocorrencias)
    (
        '"px-4 py-3 text-right text-slate-300"',
        '"px-4 py-3 text-right text-slate-600 dark:text-slate-300"'
    ),
    # 20. Empty state containers p-12 (replace_all - 3 ocorrencias)
    (
        '"rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center backdrop-blur"',
        '"rounded-lg border border-gray-200 bg-white p-12 text-center backdrop-blur dark:border-slate-700 dark:bg-slate-800/50"'
    ),
    # SelectMenu
    # 21. Trigger button
    (
        '"flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"',
        '"flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"'
    ),
    # 22. Dropdown container (versao com max-h-60)
    (
        '"absolute z-20 mt-2 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg"',
        '"absolute z-20 mt-2 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"'
    ),
    # 23. Opcoes do dropdown (single quotes por ser template literal)
    (
        "w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${",
        "w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${"
    ),
    # 24. Opcao selecionada
    (
        "'bg-slate-800/70'",
        "'bg-gray-100 dark:bg-slate-800/70'"
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
print(f"Reports.tsx: {count} padroes aplicados")
