file = r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\KanbanBoard.tsx"

with open(file, "r", encoding="utf-8") as f:
    content = f.read()

patterns = [
    # 1. Loading text
    (
        '<p className="mt-4 text-slate-400">Carregando board...</p>',
        '<p className="mt-4 text-slate-500 dark:text-slate-400">Carregando board...</p>'
    ),
    # 2. Board not found text
    (
        '<p className="mb-4 text-lg text-slate-400">Board n\u00e3o encontrado</p>',
        '<p className="mb-4 text-lg text-slate-500 dark:text-slate-400">Board n\u00e3o encontrado</p>'
    ),
    # 3. Main background (board page)
    (
        '"flex h-full flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"',
        '"flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"'
    ),
    # 4. Header bar
    (
        'border-b border-slate-700/50 bg-slate-900/50 px-6 py-4 backdrop-blur-sm',
        'border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900/50'
    ),
    # 5. Back button hover
    (
        '"rounded-lg p-2 transition-colors hover:bg-slate-800/50"\n            title="Voltar para Boards"',
        '"rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"\n            title="Voltar para Boards"'
    ),
    # 6. Back arrow icon
    (
        '<ArrowLeft size={20} className="text-slate-400" />',
        '<ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />'
    ),
    # 7. Board name H1
    (
        '<h1 className="text-2xl font-bold text-white">',
        '<h1 className="text-2xl font-bold text-slate-900 dark:text-white">'
    ),
    # 8. Board description
    (
        '<p className="text-sm text-slate-400">{board.description}</p>',
        '<p className="text-sm text-slate-500 dark:text-slate-400">{board.description}</p>'
    ),
    # 9. Search bar container
    (
        '"animate-fadeIn flex w-full items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2 sm:w-auto"',
        '"animate-fadeIn flex w-full items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-slate-800/50 sm:w-auto"'
    ),
    # 10. Search icon inside bar
    (
        '<Search size={18} className="text-slate-400" />',
        '<Search size={18} className="text-slate-400 dark:text-slate-400" />'
    ),
    # 11. Search input
    (
        '"min-w-0 flex-1 bg-transparent text-white placeholder-slate-400 outline-none sm:w-64"',
        '"min-w-0 flex-1 bg-transparent text-slate-900 placeholder-slate-400 outline-none dark:text-white sm:w-64"'
    ),
    # 12. X clear button in search
    (
        '"text-slate-400 hover:text-white"',
        '"text-slate-400 hover:text-slate-900 dark:hover:text-white"'
    ),
    # 13. Filter button hover
    (
        '"rounded-lg p-2 transition-colors hover:bg-slate-800/50"\n              title="Filtrar cards"',
        '"rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"\n              title="Filtrar cards"'
    ),
    # 14. Board menu button hover
    (
        '"rounded-lg p-2 transition-colors hover:bg-slate-800/50"\n                title="Op\u00e7\u00f5es do board"',
        '"rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"\n                title="Op\u00e7\u00f5es do board"'
    ),
    # 15. MoreVertical icon
    (
        '<MoreVertical size={20} className="text-slate-400" />',
        '<MoreVertical size={20} className="text-slate-500 dark:text-slate-400" />'
    ),
    # 16. Dropdown menu container
    (
        '"absolute right-0 z-[110] mt-2 w-56 overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900 shadow-xl"',
        '"absolute right-0 z-[110] mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700/50 dark:bg-slate-900"'
    ),
    # 17. Dropdown menu items (4 ocorrencias - replace_all)
    (
        '"flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-slate-800"',
        '"flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"'
    ),
    # 18. Dropdown divider
    (
        '<div className="border-t border-slate-700/50"></div>',
        '<div className="border-t border-gray-200 dark:border-slate-700/50"></div>'
    ),
    # 19. Filters panel
    (
        'border-b border-slate-700/50 bg-slate-900/50 px-6 py-3 backdrop-blur-sm',
        'border-b border-gray-200 bg-white px-6 py-3 dark:border-slate-700/50 dark:bg-slate-900/50'
    ),
    # 20. Filtros label
    (
        '<span className="text-sm font-medium text-slate-300">Filtros:</span>',
        '<span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filtros:</span>'
    ),
    # 21. Fechar button in filters
    (
        '"px-3 py-1.5 text-sm text-slate-400 transition-colors hover:text-white sm:ml-auto"',
        '"px-3 py-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:ml-auto"'
    ),
    # 22. Empty lists container
    (
        '"w-80 flex-shrink-0 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 backdrop-blur-sm"',
        '"w-80 flex-shrink-0 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/30"'
    ),
    # 23. Empty state text container
    (
        '"py-8 text-center text-slate-400"',
        '"py-8 text-center text-slate-500 dark:text-slate-400"'
    ),
    # SelectMenu
    # 24. Trigger button
    (
        'border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500',
        'border border-gray-300 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
    ),
    # 25. Dropdown container
    (
        '"absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg"',
        '"absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"'
    ),
    # 26. Option text/hover
    (
        '`w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${',
        '`w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${'
    ),
    # 27. Selected option bg
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
print(f"KanbanBoard.tsx: {count} padroes aplicados")
