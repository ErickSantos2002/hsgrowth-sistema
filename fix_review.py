"""
Script de revisao final - Camada 5
Corrige padroes dark-only esquecidos em componentes modais
"""
import os

fixes = {
    # =========================================================
    # PersonModal.tsx - trigger do SelectMenu + h3 headings
    # =========================================================
    r"D:\GitHub\hsgrowth-sistema\frontend\src\components\persons\PersonModal.tsx": [
        # H3 headings (5 ocorrencias - replace_all)
        (
            '"mb-4 flex items-center gap-2 text-lg font-semibold text-white"',
            '"mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"'
        ),
        # Trigger do SelectMenu (border-slate-600 - unico neste arquivo)
        (
            'border border-slate-600 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${',
            'border border-gray-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white ${'
        ),
        # Opcoes do SelectMenu (replace_all)
        (
            'w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${',
            'w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${'
        ),
    ],

    # =========================================================
    # ProductModal.tsx - h3 headings + opcoes do SelectMenu
    # =========================================================
    r"D:\GitHub\hsgrowth-sistema\frontend\src\components\products\ProductModal.tsx": [
        # H3 headings (2 ocorrencias - replace_all)
        (
            '"mb-4 flex items-center gap-2 text-lg font-semibold text-white"',
            '"mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"'
        ),
        # Opcoes do SelectMenu
        (
            'w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${',
            'w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${'
        ),
    ],

    # =========================================================
    # BadgeModal.tsx - botoes de tipo de criterio + opcoes do SelectMenu
    # =========================================================
    r"D:\GitHub\hsgrowth-sistema\frontend\src\components\settings\BadgeModal.tsx": [
        # Botoes de criterio - estado inativo (2 ocorrencias - replace_all)
        (
            '"border-slate-700 bg-slate-900 hover:bg-slate-800"',
            '"border-gray-200 bg-white hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"'
        ),
        # Opcoes do SelectMenu
        (
            'w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${',
            'w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${'
        ),
    ],

    # =========================================================
    # UserModal.tsx - opcoes do SelectMenu
    # =========================================================
    r"D:\GitHub\hsgrowth-sistema\frontend\src\components\users\UserModal.tsx": [
        # Opcoes do SelectMenu
        (
            'w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${',
            'w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${'
        ),
    ],

    # =========================================================
    # TransferModal.tsx - ambos os SelectMenus
    # =========================================================
    r"D:\GitHub\hsgrowth-sistema\frontend\src\components\transfers\TransferModal.tsx": [
        # 1. Trigger do 1o SelectMenu (cards) - sem text-white, com template
        (
            'border border-slate-700 bg-slate-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${',
            'border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 ${'
        ),
        # 2. Opcoes do 1o SelectMenu (cards) - hover sem dark:
        (
            'transition-colors hover:bg-slate-800 ${',
            'transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 ${'
        ),
        # 3. Opcao selecionada do 1o SelectMenu
        (
            'card.id === value ? "bg-slate-800/70" : ""',
            'card.id === value ? "bg-gray-100 dark:bg-slate-800/70" : ""'
        ),
        # 4. Trigger do 2o SelectMenu (text-sm text-white)
        (
            'border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${',
            'border border-gray-300 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${'
        ),
        # 5. Dropdown do 2o SelectMenu
        (
            '"absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg"',
            '"absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"'
        ),
        # 6. Opcoes do 2o SelectMenu
        (
            'w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${',
            'w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${'
        ),
    ],
}

total_count = 0
for filepath, patterns in fixes.items():
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    file_count = 0
    not_found = []
    for old, new in patterns:
        occurrences = content.count(old)
        if occurrences > 0:
            content = content.replace(old, new)
            file_count += occurrences
        else:
            not_found.append(old[:60])

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    filename = os.path.basename(filepath)
    if not_found:
        print(f"  {filename} - NAO ENCONTRADOS:")
        for s in not_found:
            print(f"    - {repr(s)}")
    print(f"  {filename}: {file_count} padroes aplicados")
    total_count += file_count

print(f"\nTotal: {total_count} padroes aplicados")
