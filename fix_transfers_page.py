file = r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\Transfers.tsx"

with open(file, "r", encoding="utf-8") as f:
    content = f.read()

patterns = [
    # 1. Loading text
    (
        '<p className="mt-4 text-slate-400">Carregando transfer\u00eancias...</p>',
        '<p className="mt-4 text-slate-500 dark:text-slate-400">Carregando transfer\u00eancias...</p>'
    ),
    # 2. H1 title
    (
        'text-xl font-bold text-white sm:justify-start sm:text-3xl">',
        'text-xl font-bold text-slate-900 sm:justify-start sm:text-3xl dark:text-white">'
    ),
    # 3. ArrowRightLeft icon in header
    (
        '<ArrowRightLeft className="text-white" size={24} />',
        '<ArrowRightLeft className="text-slate-900 dark:text-white" size={24} />'
    ),
    # 4. Header description
    (
        '<p className="mt-1 text-slate-400">\n            Gerencie solicita\u00e7\u00f5es de transfer\u00eancia',
        '<p className="mt-1 text-slate-500 dark:text-slate-400">\n            Gerencie solicita\u00e7\u00f5es de transfer\u00eancia'
    ),
    # 5. Stats label text-slate-400 (5 ocorrencias - replace_all)
    (
        'className="text-xs text-slate-400">',
        'className="text-xs text-slate-500 dark:text-slate-400">'
    ),
    # 6. Stats values text-white (5 ocorrencias - replace_all)
    (
        '<div className="text-2xl font-bold text-white">',
        '<div className="text-2xl font-bold text-slate-900 dark:text-white">'
    ),
    # 7. Tabs border-b
    (
        '<div className="mb-6 flex gap-2 border-b border-slate-700">',
        '<div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-slate-700">'
    ),
    # 8. Tabs inactive state (4 ocorrencias - replace_all)
    (
        '"text-slate-400 hover:text-white"',
        '"text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"'
    ),
    # 9. Main content container
    (
        '<div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6">',
        '<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/30">'
    ),
    # 10. Tab h2 headings (4 ocorrencias - replace_all)
    (
        '<h2 className="mb-4 text-xl font-semibold text-white">',
        '<h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">'
    ),
    # 11. Tab p descriptions "mb-4 text-slate-400" (3 ocorrencias - replace_all)
    # - "Aguardando aprovacao do gerente"
    # - "Transferencias aguardando sua decisao"
    # - "Transferencias aprovadas ou rejeitadas"
    (
        '<p className="mb-4 text-slate-400">',
        '<p className="mb-4 text-slate-500 dark:text-slate-400">'
    ),
    # 12. Empty state text "py-8 text-center text-slate-400"
    (
        '"py-8 text-center text-slate-400"',
        '"py-8 text-center text-slate-500 dark:text-slate-400"'
    ),
    # 13. Empty state text "py-12 text-center text-slate-400"
    (
        '"py-12 text-center text-slate-400"',
        '"py-12 text-center text-slate-500 dark:text-slate-400"'
    ),
    # 14. Transfer card with hover
    (
        '"rounded-lg border border-slate-700 bg-slate-900/50 p-4 transition-colors hover:border-slate-600"',
        '"rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600"'
    ),
    # 15. Transfer card h3 text-white
    (
        '<h3 className="font-semibold text-white">',
        '<h3 className="font-semibold text-slate-900 dark:text-white">'
    ),
    # 16. Transfer card details div (in pending tab)
    (
        '"space-y-1 text-sm text-slate-400"',
        '"space-y-1 text-sm text-slate-500 dark:text-slate-400"'
    ),
    # 17. Transfer date text-xs text-slate-500
    (
        '"text-xs text-slate-500"',
        '"text-xs text-slate-400 dark:text-slate-500"'
    ),
    # 18. Approval card background (amarelo)
    (
        '"rounded-lg border-2 border-yellow-500/50 bg-yellow-900/20 p-4"',
        '"rounded-lg border-2 border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-900/20"'
    ),
    # 19. Approval card h4 text-white
    (
        '<h4 className="mb-2 font-semibold text-white">',
        '<h4 className="mb-2 font-semibold text-slate-900 dark:text-white">'
    ),
    # 20. Approval details text-slate-300
    (
        '"space-y-1 text-sm text-slate-300"',
        '"space-y-1 text-sm text-slate-600 dark:text-slate-300"'
    ),
    # 21. Approval expires text-xs text-slate-400 (ja coberto por padrao 5)
    # 22. Completed/All tab card (sem hover)
    (
        '"rounded-lg border border-slate-700 bg-slate-900/50 p-4"',
        '"rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"'
    ),
    # 23. Completed/All tab card h4 text-white
    (
        '<h4 className="font-semibold text-white">',
        '<h4 className="font-semibold text-slate-900 dark:text-white">'
    ),
    # 24. All tab empty state icon
    (
        '<CheckCircle size={48} className="mx-auto mb-3 text-slate-600" />',
        '<CheckCircle size={48} className="mx-auto mb-3 text-slate-400 dark:text-slate-600" />'
    ),
    # 25. All tab empty state text
    (
        '<p className="text-slate-400">Nenhuma transfer\u00eancia finalizada ainda</p>',
        '<p className="text-slate-500 dark:text-slate-400">Nenhuma transfer\u00eancia finalizada ainda</p>'
    ),
    # 26. All tab long description
    (
        '<p className="mb-4 text-slate-500 dark:text-slate-400">Todas as transfer\u00eancias aprovadas',
        '<p className="mb-4 text-slate-500 dark:text-slate-400">Todas as transfer\u00eancias aprovadas'
    ),
    # Paginacao
    # 27. Pagination border-t
    (
        'border-t border-slate-700/60 pt-4 text-center',
        'border-t border-gray-200 pt-4 text-center dark:border-slate-700/60'
    ),
    # 28. Pagination count text
    (
        '<div className="text-sm text-slate-400">',
        '<div className="text-sm text-slate-500 dark:text-slate-400">'
    ),
    # 29. Disabled buttons (4 ocorrencias - replace_all)
    (
        'border-slate-700 text-slate-600"',
        'border-gray-300 text-gray-400 dark:border-slate-700 dark:text-slate-600"'
    ),
    # 30. Mobile prev/next buttons active
    (
        '"border-slate-600 text-slate-200 hover:border-emerald-500 hover:text-white"',
        '"border-gray-300 text-slate-600 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:text-white"'
    ),
    # 31. Mobile current page indicator
    (
        '"flex min-w-[42px] items-center justify-center rounded-lg border border-slate-600 px-2 py-2 text-sm text-white"',
        '"flex min-w-[42px] items-center justify-center rounded-lg border border-gray-300 px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:text-white"'
    ),
    # 32. Desktop inactive buttons (Anterior, page numbers, Proxima)
    (
        '"border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-white"',
        '"border-gray-300 text-slate-600 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"'
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
print(f"Transfers.tsx: {count} padroes aplicados")
