file = r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\Gamification.tsx"

with open(file, "r", encoding="utf-8") as f:
    content = f.read()

patterns = [
    # 1. H1 titulo
    (
        '"flex items-center gap-3 text-3xl font-bold text-white"',
        '"flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white"'
    ),
    # 2. Icone Trophy no H1
    (
        '<Trophy className="text-white" size={32} />',
        '<Trophy className="text-slate-900 dark:text-white" size={32} />'
    ),
    # 3. Subtitulo do header
    (
        '"mt-1 text-slate-400"',
        '"mt-1 text-slate-500 dark:text-slate-400"'
    ),
    # 4. Container do seletor de usuario
    (
        '"mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4"',
        '"mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50"'
    ),
    # 5. Label do seletor
    (
        '"mb-2 block text-sm font-medium text-slate-300"',
        '"mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"'
    ),
    # 6. Botao trigger do SelectMenu (com md:w-auto - unico neste arquivo)
    (
        '"flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 md:w-auto"',
        '"flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white md:w-auto"'
    ),
    # 7. ChevronDown template literal (seletor de usuario)
    (
        'text-slate-400 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}',
        'text-slate-500 transition-transform dark:text-slate-400 ${isUserMenuOpen ? "rotate-180" : ""}'
    ),
    # 8. Dropdown container
    (
        '"absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg"',
        '"absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"'
    ),
    # 9. Opcoes do dropdown (template literal - replace_all: team + usuarios)
    (
        'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${',
        'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${'
    ),
    # 10. Opcao selecionada no dropdown (replace_all - team e usuarios)
    (
        '"bg-slate-800/70"',
        '"bg-gray-100 dark:bg-slate-800/70"'
    ),
    # 11. Tabs - borda inferior
    (
        '"mb-6 flex gap-2 border-b border-slate-700"',
        '"mb-6 flex gap-2 border-b border-gray-200 dark:border-slate-700"'
    ),
    # 12. Tab inativo (replace_all - 3 ocorrencias)
    (
        '"border-transparent text-slate-400 hover:text-white"',
        '"border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"'
    ),
    # 13. Cards de estatistica (replace_all - 8 ocorrencias: 4 equipe + 4 perfil)
    (
        '"rounded-xl border border-slate-700 bg-slate-800/50 p-6"',
        '"rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50"'
    ),
    # 14. Labels dos cards de stat (replace_all - muitas ocorrencias)
    (
        '"text-sm text-slate-400"',
        '"text-sm text-slate-500 dark:text-slate-400"'
    ),
    # 15. Valores numericos grandes nos cards (replace_all)
    (
        '"text-3xl font-bold text-white"',
        '"text-3xl font-bold text-slate-900 dark:text-white"'
    ),
    # 16. Top performer (texto truncado)
    (
        '"truncate text-lg font-bold text-white"',
        '"truncate text-lg font-bold text-slate-900 dark:text-white"'
    ),
    # 17. H3 nos containers de ranking e badges recentes (replace_all - 2 ocorrencias)
    (
        '"mb-4 text-lg font-semibold text-white"',
        '"mb-4 text-lg font-semibold text-slate-900 dark:text-white"'
    ),
    # 18. Label de periodo no ranking (replace_all - 4 periodos)
    (
        '"mb-1 text-sm text-slate-400"',
        '"mb-1 text-sm text-slate-500 dark:text-slate-400"'
    ),
    # 19. Valor de posicao no ranking do perfil
    (
        '"text-2xl font-bold text-white"',
        '"text-2xl font-bold text-slate-900 dark:text-white"'
    ),
    # 20. Item de badge recente (rounded-lg)
    (
        '"flex items-center gap-3 rounded-lg bg-slate-700/30 p-3"',
        '"flex items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-slate-700/30"'
    ),
    # 21. Nome do badge recente
    (
        '"font-medium text-white"',
        '"font-medium text-slate-900 dark:text-white"'
    ),
    # 22. Data do badge recente
    (
        '"text-xs text-slate-400"',
        '"text-xs text-slate-500 dark:text-slate-400"'
    ),
    # 23. Botoes de periodo - inativo
    (
        '"bg-slate-800 text-slate-300 hover:bg-slate-700"',
        '"bg-gray-100 text-slate-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"'
    ),
    # 24. Container vazio de rankings
    (
        '"rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center"',
        '"rounded-xl border border-gray-200 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-800/50"'
    ),
    # 25. Container da tabela de rankings
    (
        '"overflow-hidden rounded-xl border border-slate-700 bg-slate-800/30"',
        '"overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800/30"'
    ),
    # 26. Thead row da tabela
    (
        '"border-b border-slate-700 bg-slate-800/50"',
        '"border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50"'
    ),
    # 27. th com text-slate-300 (substitui o text-slate-300 antes do sm: - replace_all)
    (
        'text-slate-300 sm:px-6 sm:py-3 sm:text-xs',
        'text-slate-600 dark:text-slate-300 sm:px-6 sm:py-3 sm:text-xs'
    ),
    # 28. Divisor das linhas da tabela
    (
        '"divide-y divide-slate-700/50"',
        '"divide-y divide-gray-100 dark:divide-slate-700/50"'
    ),
    # 29. Hover das linhas (usado em ternario - replace_all)
    (
        '"hover:bg-slate-700/30"',
        '"hover:bg-gray-50 dark:hover:bg-slate-700/30"'
    ),
    # 30. Numero de posicao sem medalha
    (
        '"w-8 text-center text-lg font-bold text-slate-400 sm:w-10 sm:text-2xl"',
        '"w-8 text-center text-lg font-bold text-slate-600 dark:text-slate-400 sm:w-10 sm:text-2xl"'
    ),
    # 31. Nome do usuario no ranking
    (
        '"flex items-center gap-2 text-sm font-medium text-white sm:text-base"',
        '"flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white sm:text-base"'
    ),
    # 32. Pontos do ranking
    (
        '"text-lg font-bold text-white sm:text-xl"',
        '"text-lg font-bold text-slate-900 dark:text-white sm:text-xl"'
    ),
    # 33. "pts" ao lado dos pontos
    (
        '"ml-1 text-slate-400"',
        '"ml-1 text-slate-500 dark:text-slate-400"'
    ),
    # 34. Badge nao conquistado - container
    (
        '"border-slate-700 bg-slate-800/30 opacity-60"',
        '"border-gray-200 bg-gray-50 opacity-60 dark:border-slate-700 dark:bg-slate-800/30"'
    ),
    # 35. Badge nao conquistado - icone bg (no ternario)
    (
        'isEarned ? "bg-yellow-500/20" : "bg-slate-700/30"',
        'isEarned ? "bg-yellow-500/20" : "bg-gray-200 dark:bg-slate-700/30"'
    ),
    # 36. Badge nome - cor condicional (earned = text-white em light mode e escuro)
    (
        'isEarned ? "text-white" : "text-slate-500"',
        'isEarned ? "text-slate-900 dark:text-white" : "text-slate-500"'
    ),
    # 37. Badge descricao - cor condicional (earned = text-slate-300 demais claro em light)
    (
        'isEarned ? "text-slate-300" : "text-slate-600"',
        'isEarned ? "text-slate-600 dark:text-slate-300" : "text-slate-600"'
    ),
    # 38. Medalha 2o lugar - cor do icone (text-slate-300 invisivel em light mode)
    (
        'color: "text-slate-300"',
        'color: "text-slate-500 dark:text-slate-300"'
    ),
    # 39. Texto standalone text-slate-400 (replace_all - loading, empty states, badges count)
    (
        '"text-slate-400"',
        '"text-slate-500 dark:text-slate-400"'
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
print(f"Gamification.tsx: {count} padroes aplicados")
