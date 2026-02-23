file = r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\Settings.tsx"

with open(file, "r", encoding="utf-8") as f:
    content = f.read()

patterns = [
    # 1. Input email com template literal (linha 974)
    (
        'border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${',
        'border border-gray-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 ${'
    ),
    # 2. Badge tipo "logout" e "default" - text-slate-300 em bg translucido (replace_all)
    (
        '"bg-slate-500/20 text-slate-300"',
        '"bg-slate-500/20 text-slate-600 dark:text-slate-300"'
    ),
    # 3. Badge ativo/inativo - borda template literal (linha 1614)
    (
        '"border-slate-700" : "border-slate-800 opacity-60"',
        '"border-gray-200 dark:border-slate-700" : "border-gray-100 opacity-60 dark:border-slate-800"'
    ),
    # 4. Badge status color com text-slate-400 (replace_all - linhas 1637, 1845)
    (
        '"bg-slate-500/20 text-slate-400"',
        '"bg-slate-500/20 text-slate-600 dark:text-slate-400"'
    ),
    # 5. Subtitulo principal (linha 812)
    (
        '"text-slate-400"',
        '"text-slate-500 dark:text-slate-400"'
    ),
    # 6. Paragrafos/spans com text-sm text-slate-400 (replace_all - muitas ocorrencias)
    (
        '"text-sm text-slate-400"',
        '"text-sm text-slate-500 dark:text-slate-400"'
    ),
    # 7. mb-1 text-sm text-slate-400 (replace_all - badges e pontos)
    (
        '"mb-1 text-sm text-slate-400"',
        '"mb-1 text-sm text-slate-500 dark:text-slate-400"'
    ),
    # 8. mt-4 text-slate-400 (replace_all - loading states)
    (
        '"mt-4 text-slate-400"',
        '"mt-4 text-slate-500 dark:text-slate-400"'
    ),
    # 9. mb-2 text-lg font-medium text-slate-400 (empty states)
    (
        '"mb-2 text-lg font-medium text-slate-400"',
        '"mb-2 text-lg font-medium text-slate-500 dark:text-slate-400"'
    ),
    # 10. mb-4 text-sm text-slate-400 (linha 1230)
    (
        '"mb-4 text-sm text-slate-400"',
        '"mb-4 text-sm text-slate-500 dark:text-slate-400"'
    ),
    # 11. mt-1 text-sm text-slate-400 (linha 1289)
    (
        '"mt-1 text-sm text-slate-400"',
        '"mt-1 text-sm text-slate-500 dark:text-slate-400"'
    ),
    # 12. truncate text-sm text-slate-400 sm:... (linha 893 - nome usuario)
    (
        '"max-w-[180px] truncate text-sm text-slate-400 sm:max-w-none sm:text-base"',
        '"max-w-[180px] truncate text-sm text-slate-500 dark:text-slate-400 sm:max-w-none sm:text-base"'
    ),
    # 13. mb-4 line-clamp-2 text-sm text-slate-400 (descricao badge)
    (
        '"mb-4 line-clamp-2 text-sm text-slate-400"',
        '"mb-4 line-clamp-2 text-sm text-slate-500 dark:text-slate-400"'
    ),
    # 14. Search icon (linha 1534)
    (
        '"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"',
        '"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400"'
    ),
    # 15. py-8 text-center text-slate-400 (linhas 2117, 2119 - ramais)
    (
        '"py-8 text-center text-slate-400"',
        '"py-8 text-center text-slate-500 dark:text-slate-400"'
    ),
    # 16. p-8 text-center text-slate-400 (linhas 2300, 2304 - logs)
    (
        '"p-8 text-center text-slate-400"',
        '"p-8 text-center text-slate-500 dark:text-slate-400"'
    ),
    # 17. px-4 py-3 text-sm text-slate-400 (tabela ramais - linha 2150)
    (
        '"px-4 py-3 text-sm text-slate-400"',
        '"px-4 py-3 text-sm text-slate-500 dark:text-slate-400"'
    ),
    # 18. Badge inline sem usuario (linha 2160 - ramal sem usuario) - dentro de inline-flex
    (
        'inline-flex items-center rounded-full bg-slate-500/20 px-2.5 py-0.5 text-xs font-medium text-slate-400',
        'inline-flex items-center rounded-full bg-slate-500/20 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400'
    ),
    # 19. text-xs text-slate-400 (email do log - linha 2343)
    (
        '"text-xs text-slate-400"',
        '"text-xs text-slate-500 dark:text-slate-400"'
    ),
    # 20. whitespace-nowrap px-4 py-3 text-sm text-slate-400 (linha 2365 - logs)
    (
        '"whitespace-nowrap px-4 py-3 text-sm text-slate-400"',
        '"whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400"'
    ),
    # 21. SelectMenu placeholder (linha 2555 - ternario)
    (
        '"text-slate-400"}`}',
        '"text-slate-500 dark:text-slate-400"}`}'
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
print(f"Settings.tsx follow-up: {count} padroes aplicados")
