import os

# === Automations.tsx ===
automations_file = r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\Automations.tsx"

with open(automations_file, "r", encoding="utf-8") as f:
    content_a = f.read()

patterns_a = [
    # 1. Acesso Restrito heading
    (
        'text-2xl font-bold text-white">Acesso Restrito</h2>',
        'text-2xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h2>'
    ),
    # 2. Apenas administradores text
    (
        '<p className="text-slate-400">\n            Apenas administradores e gerentes',
        '<p className="text-slate-500 dark:text-slate-400">\n            Apenas administradores e gerentes'
    ),
    # 3. Count text
    (
        '<div className="mb-4 text-sm text-slate-400">',
        '<div className="mb-4 text-sm text-slate-500 dark:text-slate-400">'
    ),
    # 4. Loading text
    (
        '<p className="mt-4 text-slate-400">Carregando automa\u00e7\u00f5es...</p>',
        '<p className="mt-4 text-slate-500 dark:text-slate-400">Carregando automa\u00e7\u00f5es...</p>'
    ),
    # 5. Empty state icon
    (
        '<Zap size={64} className="mx-auto mb-4 text-slate-600" />',
        '<Zap size={64} className="mx-auto mb-4 text-slate-400 dark:text-slate-600" />'
    ),
    # 6. Empty state heading
    (
        '<h3 className="mb-2 text-xl font-semibold text-white">',
        '<h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">'
    ),
    # 7. Empty state paragraph
    (
        'Nenhuma automa\u00e7\u00e3o encontrada\n            </h3>\n            <p className="text-slate-400">',
        'Nenhuma automa\u00e7\u00e3o encontrada\n            </h3>\n            <p className="text-slate-500 dark:text-slate-400">'
    ),
    # 8. Main container
    (
        '<div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 backdrop-blur-sm sm:p-6">',
        '<div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/30 sm:p-6">'
    ),
    # 9. Card container
    (
        'className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur transition-all hover:border-emerald-500/40"',
        'className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-emerald-500/40 dark:border-slate-700 dark:bg-slate-800/50"'
    ),
    # 10. Card title
    (
        '<h3 className="text-lg font-semibold text-white">',
        '<h3 className="text-lg font-semibold text-slate-900 dark:text-white">'
    ),
    # 11. Inactive badge
    (
        'bg-slate-600/50 px-2 py-1 text-xs font-medium text-slate-400">',
        'bg-gray-200 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-600/50 dark:text-slate-400">'
    ),
    # 12. Description
    (
        '<p className="line-clamp-2 text-sm text-slate-400">',
        '<p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">'
    ),
    # 13. Stats divider
    (
        'gap-4 border-y border-slate-700 py-3',
        'gap-4 border-y border-gray-200 py-3 dark:border-slate-700'
    ),
    # 14. Executions label (unico label sem cor propria)
    (
        'gap-1 text-xs text-slate-400">\n                      <BarChart3 size={14} />',
        'gap-1 text-xs text-slate-500 dark:text-slate-400">\n                      <BarChart3 size={14} />'
    ),
    # 15. Stat values - 3 ocorrencias iguais
    (
        '<p className="font-semibold text-white">',
        '<p className="font-semibold text-slate-900 dark:text-white">'
    ),
    # 16. Last execution text
    (
        '"mb-4 flex items-center gap-2 text-xs text-slate-400"',
        '"mb-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"'
    ),
    # 17. Pause button (estado ativo)
    (
        '"bg-slate-700 text-white hover:bg-slate-600"',
        '"bg-gray-200 text-slate-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"'
    ),
    # 18. SelectMenu trigger button
    (
        'border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500',
        'border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
    ),
    # 19. SelectMenu dropdown container
    (
        'max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg',
        'max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900'
    ),
    # 20. SelectMenu option text/hover
    (
        'className={`w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${',
        'className={`w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${'
    ),
    # 21. SelectMenu selected option background
    (
        'option.value === value ? "bg-slate-800/70" : ""',
        'option.value === value ? "bg-gray-100 dark:bg-slate-800/70" : ""'
    ),
]

count_a = 0
not_found_a = []
for old, new in patterns_a:
    occurrences = content_a.count(old)
    if occurrences > 0:
        content_a = content_a.replace(old, new)
        count_a += occurrences
    else:
        not_found_a.append(old[:70])

with open(automations_file, "w", encoding="utf-8") as f:
    f.write(content_a)

if not_found_a:
    print(f"Automations.tsx - NAO ENCONTRADOS ({len(not_found_a)}):")
    for s in not_found_a:
        print(f"  - {repr(s)}")
print(f"Automations.tsx: {count_a} padroes aplicados")


# === AutomationEditor.tsx ===
editor_file = r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\AutomationEditor.tsx"

with open(editor_file, "r", encoding="utf-8") as f:
    content_e = f.read()

patterns_e = [
    # 1. Loading container bg
    (
        '<div className="flex h-screen items-center justify-center bg-slate-900">',
        '<div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">'
    ),
    # 2. Loading text
    (
        '<p className="mt-4 text-slate-400">Carregando automa\u00e7\u00e3o...</p>',
        '<p className="mt-4 text-slate-500 dark:text-slate-400">Carregando automa\u00e7\u00e3o...</p>'
    ),
    # 3. Main container bg
    (
        '<div className="flex h-screen flex-col bg-slate-900">',
        '<div className="flex h-screen flex-col bg-gray-50 dark:bg-slate-900">'
    ),
    # 4. Header bar
    (
        '<div className="border-b border-slate-700 bg-slate-800 px-6 py-4">',
        '<div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">'
    ),
    # 5. Back button hover
    (
        'className="rounded-lg p-2 transition-colors hover:bg-slate-700"',
        'className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"'
    ),
    # 6. Arrow icon color
    (
        '<ArrowLeft size={20} className="text-slate-400" />',
        '<ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />'
    ),
    # 7. Title input (modo edicao)
    (
        'min-w-0 flex-1 rounded border-b-2 border-blue-500 bg-slate-800/50 px-2 py-1 text-xl font-semibold text-white focus:outline-none"',
        'min-w-0 flex-1 rounded border-b-2 border-blue-500 bg-white px-2 py-1 text-xl font-semibold text-slate-900 focus:outline-none dark:bg-slate-800/50 dark:text-white"'
    ),
    # 8. Title h1 (modo display)
    (
        'min-w-0 flex-1 cursor-pointer truncate text-xl font-semibold text-white transition-colors hover:text-blue-400"',
        'min-w-0 flex-1 cursor-pointer truncate text-xl font-semibold text-slate-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400"'
    ),
    # 9. Limpar Tudo button
    (
        'className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-white transition-colors hover:bg-slate-600 sm:px-4"',
        'className="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-slate-700 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 sm:px-4"'
    ),
    # 10. ReactFlow canvas bg
    (
        'className="bg-slate-900"',
        'className="bg-gray-50 dark:bg-slate-900"'
    ),
    # 11. Controls styling
    (
        '<Controls className="!border-slate-700 !bg-slate-800" showInteractive={false} />',
        '<Controls className="!border-gray-200 !bg-white dark:!border-slate-700 dark:!bg-slate-800" showInteractive={false} />'
    ),
    # 12. MiniMap styling
    (
        '<MiniMap\n              className="!border-slate-700 !bg-slate-800"',
        '<MiniMap\n              className="!border-gray-200 !bg-white dark:!border-slate-700 dark:!bg-slate-800"'
    ),
]

count_e = 0
not_found_e = []
for old, new in patterns_e:
    occurrences = content_e.count(old)
    if occurrences > 0:
        content_e = content_e.replace(old, new)
        count_e += occurrences
    else:
        not_found_e.append(old[:70])

with open(editor_file, "w", encoding="utf-8") as f:
    f.write(content_e)

if not_found_e:
    print(f"AutomationEditor.tsx - NAO ENCONTRADOS ({len(not_found_e)}):")
    for s in not_found_e:
        print(f"  - {repr(s)}")
print(f"AutomationEditor.tsx: {count_e} padroes aplicados")
print(f"Total: {count_a + count_e} padroes em 2 arquivos")
