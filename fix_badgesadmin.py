import re

file = r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\BadgesAdmin.tsx"

with open(file, "r", encoding="utf-8") as f:
    content = f.read()

patterns = [
    # 1. Loading text
    (
        '<p className="mt-4 text-slate-400">Carregando badges...</p>',
        '<p className="mt-4 text-slate-500 dark:text-slate-400">Carregando badges...</p>'
    ),
    # 2. H1 title
    (
        'text-3xl font-bold text-white">\n          <Award className="text-yellow-400" size={32} />',
        'text-3xl font-bold text-slate-900 dark:text-white">\n          <Award className="text-yellow-400" size={32} />'
    ),
    # 3. Header description
    (
        '<p className="mt-1 text-slate-400">Criar, editar e atribuir badges do sistema</p>',
        '<p className="mt-1 text-slate-500 dark:text-slate-400">Criar, editar e atribuir badges do sistema</p>'
    ),
    # 4. Search icon color
    (
        '<Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-slate-400"',
        '<Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-slate-400 dark:text-slate-400"'
    ),
    # 5. Search input
    (
        'border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500',
        'border border-gray-300 bg-white py-2 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
    ),
    # 6. Atualizar button
    (
        '"flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white transition-colors hover:bg-slate-700"',
        '"flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"'
    ),
    # 7. Badge card
    (
        '"rounded-xl border border-slate-700 bg-slate-800/50 p-6 transition-colors hover:bg-slate-800/70"',
        '"rounded-xl border border-gray-200 bg-white p-6 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800/70"'
    ),
    # 8. Badge name
    (
        '<h3 className="font-semibold text-white">{badge.name}</h3>',
        '<h3 className="font-semibold text-slate-900 dark:text-white">{badge.name}</h3>'
    ),
    # 9. Badge description
    (
        '<p className="mb-4 text-sm text-slate-300">{badge.description}</p>',
        '<p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{badge.description}</p>'
    ),
    # 10. Criteria text
    (
        'rounded bg-slate-900/50 p-2 text-xs text-slate-400',
        'rounded bg-gray-100 p-2 text-xs text-slate-500 dark:bg-slate-900/50 dark:text-slate-400'
    ),
    # 11. Empty state container
    (
        '"rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center"',
        '"rounded-xl border border-gray-200 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-800/50"'
    ),
    # 12. Empty state icon
    (
        '<Award className="mx-auto mb-4 text-slate-600" size={48} />',
        '<Award className="mx-auto mb-4 text-slate-400 dark:text-slate-600" size={48} />'
    ),
    # 13. Empty state text
    (
        '<p className="text-slate-400">Nenhum badge encontrado</p>',
        '<p className="text-slate-500 dark:text-slate-400">Nenhum badge encontrado</p>'
    ),
    # 14. Modal Create/Edit container
    (
        'max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-800',
        'max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
    ),
    # 15. Modal title (ambos modais)
    (
        '<h2 className="mb-4 text-2xl font-bold text-white">',
        '<h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">'
    ),
    # 16. text-slate-300 para labels e texto corporal (global)
    (
        'text-slate-300',
        'text-slate-700 dark:text-slate-300'
    ),
    # 17. Main modal inputs/textarea/select (border-slate-700 bg-slate-900 ... text-white)
    (
        '"w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"',
        '"w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"'
    ),
    # 18. Criteria container
    (
        '"space-y-3 rounded-lg bg-slate-900/50 p-4"',
        '"space-y-3 rounded-lg bg-gray-100 p-4 dark:bg-slate-900/50"'
    ),
    # 19. Small selects in criteria
    (
        '"w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"',
        '"w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"'
    ),
    # 20. Cancel button in main modal (with flex-1 and icons)
    (
        '"flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white transition-colors hover:bg-slate-600"',
        '"flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-slate-700 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"'
    ),
    # 21. Award modal container
    (
        '"w-full max-w-md rounded-xl border border-slate-700 bg-slate-800"',
        '"w-full max-w-md rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800"'
    ),
    # 22. Award modal select (mesma classe do input normal, coberta por padrao 17)
    # 23. Cancel button in award modal (simples, sem icone)
    (
        '"flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white transition-colors hover:bg-slate-600"',
        '"flex-1 rounded-lg bg-gray-200 px-4 py-2 text-slate-700 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"'
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
print(f"BadgesAdmin.tsx: {count} padroes aplicados")
