file = r"D:\GitHub\hsgrowth-sistema\frontend\src\pages\Settings.tsx"

with open(file, "r", encoding="utf-8") as f:
    content = f.read()

patterns = [
    # ===== LAYOUT PRINCIPAL =====
    # 1. Container principal das tabs
    (
        '"overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur"',
        '"overflow-hidden rounded-xl border border-gray-200 bg-white backdrop-blur dark:border-slate-700 dark:bg-slate-800/50"'
    ),
    # 2. Borda das tabs
    (
        '"flex overflow-x-auto whitespace-nowrap border-b border-slate-700"',
        '"flex overflow-x-auto whitespace-nowrap border-b border-gray-200 dark:border-slate-700"'
    ),
    # 3. Tab inativa
    (
        '"text-slate-400 hover:bg-slate-700/50 hover:text-white"',
        '"text-slate-500 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-white"'
    ),
    # ===== HEADER =====
    # 4. H1 do header
    (
        '"mb-2 flex items-center gap-3 text-3xl font-bold text-white"',
        '"mb-2 flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white"'
    ),
    # 5. Icone SettingsIcon
    (
        '<SettingsIcon className="text-white" size={32} />',
        '<SettingsIcon className="text-slate-900 dark:text-white" size={32} />'
    ),
    # ===== HEADINGS DE SECAO =====
    # 6. H2 com mb-6
    (
        '"mb-6 text-xl font-semibold text-white"',
        '"mb-6 text-xl font-semibold text-slate-900 dark:text-white"'
    ),
    # 7. H2 com mb-2
    (
        '"mb-2 text-xl font-semibold text-white"',
        '"mb-2 text-xl font-semibold text-slate-900 dark:text-white"'
    ),
    # 8. H2 sem mb
    (
        '"text-xl font-semibold text-white"',
        '"text-xl font-semibold text-slate-900 dark:text-white"'
    ),
    # 9. H3 simples text-lg font-semibold (replace_all)
    (
        '"text-lg font-semibold text-white"',
        '"text-lg font-semibold text-slate-900 dark:text-white"'
    ),
    # 10. H3 com mb-4 e flex items-center
    (
        '"mb-4 flex items-center gap-2 text-lg font-semibold text-white"',
        '"mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"'
    ),
    # 11. H3 com mb-4 (pontos/ramais)
    (
        '"mb-4 text-lg font-semibold text-white"',
        '"mb-4 text-lg font-semibold text-slate-900 dark:text-white"'
    ),
    # 12. H3 de notificacoes (font-medium)
    (
        '"mb-4 text-lg font-medium text-white"',
        '"mb-4 text-lg font-medium text-slate-900 dark:text-white"'
    ),
    # ===== PERFIL =====
    # 13. Borda do avatar
    (
        '"h-24 w-24 overflow-hidden rounded-full border-2 border-slate-700"',
        '"h-24 w-24 overflow-hidden rounded-full border-2 border-gray-300 dark:border-slate-700"'
    ),
    # 14. Botao cancelar avatar
    (
        '"rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:opacity-50"',
        '"rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-slate-900 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"'
    ),
    # ===== LABELS E INPUTS =====
    # 15. Labels com mb-2 (replace_all - MUITAS ocorrencias)
    (
        '"mb-2 block text-sm font-medium text-slate-300"',
        '"mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"'
    ),
    # 16. Labels com mb-1 (api4com)
    (
        '"mb-1 block text-sm font-medium text-slate-300"',
        '"mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"'
    ),
    # 17. Inputs largos com placeholder (replace_all - MUITAS ocorrencias)
    (
        '"w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"',
        '"w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"'
    ),
    # 18. Inputs largos SEM placeholder (logs date inputs - replace_all)
    (
        '"w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"',
        '"w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"'
    ),
    # 19. Input desabilitado (role)
    (
        '"w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-500"',
        '"w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-slate-500 dark:border-slate-700 dark:bg-slate-800"'
    ),
    # 20. Inputs API4COM (px-3 py-2 bg-slate-800)
    (
        '"w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"',
        '"w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"'
    ),
    # 21. Input ramal API4COM (bg-slate-900)
    (
        '"w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"',
        '"w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"'
    ),
    # ===== NOTIFICACOES =====
    # 22. Linha de notificacao (replace_all - 7 ocorrencias)
    (
        '"flex cursor-pointer items-center justify-between rounded-lg bg-slate-700/50 p-4 transition-colors hover:bg-slate-700"',
        '"flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-4 transition-colors hover:bg-gray-200 dark:bg-slate-700/50 dark:hover:bg-slate-700"'
    ),
    # 23. Nome da notificacao (replace_all - 7+ ocorrencias)
    (
        '"font-medium text-white"',
        '"font-medium text-slate-900 dark:text-white"'
    ),
    # ===== SEGURANCA =====
    # 24. Card de login
    (
        '"rounded-lg border border-slate-600 bg-slate-700/50 p-4 transition-colors hover:bg-slate-700/70"',
        '"rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-700/50 dark:hover:bg-slate-700/70"'
    ),
    # 25. Nome do usuario no login
    (
        '"text-base font-semibold text-white"',
        '"text-base font-semibold text-slate-900 dark:text-white"'
    ),
    # 26. Badge de hora do login
    (
        '"flex items-center gap-1.5 rounded bg-slate-800 px-2 py-1 text-sm text-slate-300"',
        '"flex items-center gap-1.5 rounded bg-gray-100 px-2 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"'
    ),
    # ===== PAGINACAO (compartilhada por security e logs) =====
    # 27. Border-t das duas paginacoes (replace_all)
    (
        '"flex flex-col gap-4 border-t border-slate-700/60 px-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"',
        '"flex flex-col gap-4 border-t border-gray-200 px-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left dark:border-slate-700/60"'
    ),
    # 28. Botao paginacao desabilitado (replace_all - 4 nos dois sistemas)
    (
        '"border-slate-700 text-slate-600"',
        '"border-gray-300 text-gray-400 dark:border-slate-700 dark:text-slate-600"'
    ),
    # 29. Botao paginacao ativo mobile (replace_all)
    (
        '"border-slate-600 text-slate-200 hover:border-emerald-500 hover:text-white"',
        '"border-gray-300 text-slate-700 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:text-white"'
    ),
    # 30. Indicador de pagina atual (replace_all)
    (
        '"flex min-w-[42px] items-center justify-center rounded-lg border border-slate-600 px-2 py-2 text-sm text-white"',
        '"flex min-w-[42px] items-center justify-center rounded-lg border border-gray-300 px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:text-white"'
    ),
    # 31. Botoes desktop (anterior/proxima/paginas) ativos (replace_all)
    (
        '"border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-white"',
        '"border-gray-300 text-slate-600 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"'
    ),
    # ===== BADGES TAB =====
    # 32. Search badges
    (
        '"w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"',
        '"w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"'
    ),
    # 33. Stat cards de badge (replace_all - 4 ocorrencias)
    (
        '"rounded-lg border border-slate-700 bg-slate-900 p-4"',
        '"rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"'
    ),
    # 34. Stat value text-2xl
    (
        '"text-2xl font-bold text-white"',
        '"text-2xl font-bold text-slate-900 dark:text-white"'
    ),
    # 35. Card de badge (template literal bg-slate-900)
    (
        'border bg-slate-900 p-5 transition-all hover:border-emerald-500/50 ${',
        'border bg-white p-5 transition-all hover:border-emerald-500/50 dark:bg-slate-900 ${'
    ),
    # 36. Nome da badge
    (
        '"font-semibold text-white"',
        '"font-semibold text-slate-900 dark:text-white"'
    ),
    # 37. Container de criterios da badge
    (
        '"mb-4 rounded-lg border border-slate-700 bg-slate-800 p-3"',
        '"mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800"'
    ),
    # 38. Texto de criterios (standalone)
    (
        '"text-sm text-slate-300"',
        '"text-sm text-slate-600 dark:text-slate-300"'
    ),
    # 39. Botao de edicao da badge
    (
        '"flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700"',
        '"flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"'
    ),
    # 40. Lista informativa (ul space-y-1) - cobre badges, points, api4com
    (
        '"space-y-1 text-sm text-slate-300"',
        '"space-y-1 text-sm text-slate-600 dark:text-slate-300"'
    ),
    # ===== PONTOS TAB =====
    # 41. Container da tabela de pontos e logs
    (
        '"overflow-hidden rounded-lg border border-slate-700 bg-slate-900"',
        '"overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"'
    ),
    # 42. Thead com bg-slate-800 standalone (replace_all - points e api4com)
    (
        '"bg-slate-800"',
        '"bg-gray-50 dark:bg-slate-800"'
    ),
    # 43. Thead com border-b e bg-slate-800 (logs)
    (
        '"border-b border-slate-700 bg-slate-800"',
        '"border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800"'
    ),
    # 44. th com px-6 text-left (pontos)
    (
        '"px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300"',
        '"px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300"'
    ),
    # 45. th com px-6 text-center (pontos)
    (
        '"px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-300"',
        '"px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300"'
    ),
    # 46. th com px-4 text-left (api4com e logs)
    (
        '"px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300"',
        '"px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300"'
    ),
    # 47. th logs com text-slate-400
    (
        '"px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400"',
        '"px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400"'
    ),
    # 48. Hover das linhas da tabela (replace_all - pontos, api4com)
    (
        '"transition-colors hover:bg-slate-800/50"',
        '"transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"'
    ),
    # 49. Hover das linhas sem transition (logs)
    (
        '"hover:bg-slate-800/50"',
        '"hover:bg-gray-50 dark:hover:bg-slate-800/50"'
    ),
    # 50. Divide das tabelas (tbody)
    (
        '"divide-y divide-slate-700"',
        '"divide-y divide-gray-100 dark:divide-slate-700"'
    ),
    # 51. Code badge de acao
    (
        '"rounded bg-slate-800 px-2 py-1 text-sm text-cyan-400"',
        '"rounded bg-gray-100 px-2 py-1 text-sm text-cyan-600 dark:bg-slate-800 dark:text-cyan-400"'
    ),
    # 52. Input de pontos editavel
    (
        '"w-20 rounded border border-slate-700 bg-slate-800 px-3 py-1 text-center text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"',
        '"w-20 rounded border border-gray-300 bg-white px-3 py-1 text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"'
    ),
    # ===== API4COM TAB =====
    # 53. Cards grandes API4COM (replace_all - 2 ocorrencias)
    (
        '"rounded-lg border border-slate-700 bg-slate-900 p-6"',
        '"rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"'
    ),
    # 54. Borda-t dentro do config display
    (
        '"border-t border-slate-700 pt-3"',
        '"border-t border-gray-200 pt-3 dark:border-slate-700"'
    ),
    # 55. Container de formulario api4com (form)
    (
        '"mb-6 rounded-lg bg-slate-800 p-4"',
        '"mb-6 rounded-lg bg-gray-100 p-4 dark:bg-slate-800"'
    ),
    # 56. td com font-medium text-white (nome do vendedor)
    (
        '"px-4 py-3 text-sm font-medium text-white"',
        '"px-4 py-3 text-sm font-medium text-slate-900 dark:text-white"'
    ),
    # 57. td com font-mono text-white (ramal)
    (
        '"px-4 py-3 font-mono text-sm text-white"',
        '"px-4 py-3 font-mono text-sm text-slate-900 dark:text-white"'
    ),
    # ===== LOGS TAB =====
    # 58. Botao Limpar Filtros
    (
        '"rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"',
        '"rounded-lg bg-gray-200 px-4 py-2 text-slate-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"'
    ),
    # 59. td de logs text-slate-300 (whitespace-nowrap)
    (
        '"whitespace-nowrap px-4 py-3 text-sm text-slate-300"',
        '"whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-300"'
    ),
    # 60. td de logs text-slate-300 (normal)
    (
        '"px-4 py-3 text-sm text-slate-300"',
        '"px-4 py-3 text-sm text-slate-600 dark:text-slate-300"'
    ),
    # SelectMenu
    # 61. Trigger (template literal com condicional)
    (
        'border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${',
        'border border-gray-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${'
    ),
    # 62. Dropdown container (max-h-60)
    (
        '"absolute z-20 mt-2 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg"',
        '"absolute z-20 mt-2 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"'
    ),
    # 63. Opcoes do select (template literal)
    (
        '`w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${',
        '`w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${'
    ),
    # 64. Opcao selecionada
    (
        '"bg-slate-800/70"',
        '"bg-gray-100 dark:bg-slate-800/70"'
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
print(f"Settings.tsx: {count} padroes aplicados")
