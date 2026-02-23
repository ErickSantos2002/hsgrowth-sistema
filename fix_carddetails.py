file = r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\CardDetails.tsx"

with open(file, "r", encoding="utf-8") as f:
    content = f.read()

patterns = [
    # 1. Loading/not-found states - fundo
    (
        'flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
        'flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950'
    ),
    # 2. Loading/not-found text (2 ocorrencias - replace_all)
    (
        '<div className="text-xl text-white">',
        '<div className="text-xl text-slate-900 dark:text-white">'
    ),
    # 3. Main container
    (
        '"flex h-full flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"',
        '"flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"'
    ),
    # 4. Header bar
    (
        'border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-xl',
        'border-b border-gray-200 bg-white backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/95'
    ),
    # 5. Back button
    (
        '"rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-white"',
        '"rounded-lg p-2 text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"'
    ),
    # 6. Title input (modo edicao)
    (
        'bg-slate-800/50 px-2 py-1 text-2xl font-semibold text-white focus:outline-none',
        'bg-white px-2 py-1 text-2xl font-semibold text-slate-900 focus:outline-none dark:bg-slate-800/50 dark:text-white'
    ),
    # 7. Title h1 (modo display)
    (
        '"cursor-pointer text-center text-2xl font-semibold text-white transition-colors hover:text-blue-400 sm:text-left"',
        '"cursor-pointer text-center text-2xl font-semibold text-slate-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400 sm:text-left"'
    ),
    # 8. Botao dropdown de responsavel/SDR (2 ocorrencias - replace_all)
    (
        '"flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/80 px-3 py-2 transition-colors hover:bg-slate-700/80"',
        '"flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:bg-gray-100 dark:border-slate-700/50 dark:bg-slate-800/80 dark:hover:bg-slate-700/80"'
    ),
    # 9. Span com nome do responsavel/SDR (4 ocorrencias - replace_all)
    (
        '"text-sm font-medium text-white"',
        '"text-sm font-medium text-slate-900 dark:text-white"'
    ),
    # 10. Container dropdown de responsavel/SDR (2 ocorrencias - replace_all)
    (
        '"fixed left-4 right-4 top-40 z-[60] max-h-80 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:z-[999] sm:mt-2 sm:w-64"',
        '"fixed left-4 right-4 top-40 z-[60] max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:z-[999] sm:mt-2 sm:w-64 dark:border-slate-700 dark:bg-slate-800"'
    ),
    # 11. Opcao nao selecionada no dropdown (2 ocorrencias - replace_all)
    (
        '"text-slate-300 hover:bg-slate-700"',
        '"text-slate-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"'
    ),
    # 12. Div de visualizacao (sem dropdown) para responsavel/SDR (2 ocorrencias - replace_all)
    (
        '"flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/80 px-3 py-2"',
        '"flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-slate-700/50 dark:bg-slate-800/80"'
    ),
    # 13. Borda da coluna esquerda
    (
        'sm:border-r sm:border-slate-700/50',
        'sm:border-r sm:border-gray-200 dark:sm:border-slate-700/50'
    ),
    # 14. Borda das abas
    (
        '"mb-6 border-b border-slate-700/50"',
        '"mb-6 border-b border-gray-200 dark:border-slate-700/50"'
    ),
    # 15. Aba inativa (4 ocorrencias - replace_all)
    (
        '"border-transparent text-slate-400 hover:text-white"',
        '"border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"'
    ),
    # 16. Badge de contagem nas abas Anotacoes e Arquivos (2 ocorrencias - replace_all)
    (
        '"ml-1 rounded-full border border-slate-700 bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-slate-400"',
        '"ml-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-400"'
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
print(f"CardDetails.tsx: {count} padroes aplicados")
