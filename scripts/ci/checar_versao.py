"""Confere se a versão do sistema é a mesma nos 3 lugares.

1. CHANGELOG.md: o primeiro título `## [x.y.z]` (a seção "Não lançado" é ignorada);
2. frontend/src/components/common/ChangelogModal.tsx: o primeiro `version: "x.y.z"`;
3. frontend/src/layouts/MainLayout.tsx: o rodapé `HSGrowth CRM vx.y.z`.

Uso: python scripts/ci/checar_versao.py
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]

LUGARES = [
    ("CHANGELOG.md", r"^## \[(\d+\.\d+\.\d+)\]"),
    ("frontend/src/components/common/ChangelogModal.tsx", r'version:\s*"(\d+\.\d+\.\d+)"'),
    ("frontend/src/layouts/MainLayout.tsx", r"HSGrowth CRM v(\d+\.\d+\.\d+)"),
]


def main() -> int:
    achadas: dict[str, str] = {}
    for caminho, padrao in LUGARES:
        texto = (RAIZ / caminho).read_text(encoding="utf-8")
        m = re.search(padrao, texto, flags=re.MULTILINE)
        if not m:
            print(f"Não achei a versão em {caminho}.")
            return 1
        achadas[caminho] = m.group(1)

    if len(set(achadas.values())) != 1:
        print("A versão está diferente entre os 3 lugares:")
        for caminho, versao in achadas.items():
            print(f"  - {caminho}: {versao}")
        return 1
    print(f"OK: versão {next(iter(achadas.values()))} nos 3 lugares.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
