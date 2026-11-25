"""Confere se as migrations do Alembic formam uma fila única (uma cabeça só).

Duas branches que criam migration a partir da mesma anterior deixam o Alembic com
duas "cabeças", e o `alembic upgrade head` falha no deploy. Este script pega isso
no PR, antes do merge.

Lê os arquivos com `ast` (sem importar nada do app nem precisar de banco).
Uso: python scripts/ci/checar_alembic.py
"""
import ast
import sys
from pathlib import Path

PASTA = Path(__file__).resolve().parents[2] / "backend" / "alembic" / "versions"


def _valor(arvore: ast.Module, nome: str):
    """Valor literal de `nome = ...` ou `nome: Tipo = ...` no topo do arquivo."""
    for no in arvore.body:
        if isinstance(no, ast.Assign) and any(isinstance(t, ast.Name) and t.id == nome for t in no.targets):
            return ast.literal_eval(no.value)
        if isinstance(no, ast.AnnAssign) and isinstance(no.target, ast.Name) and no.target.id == nome:
            return ast.literal_eval(no.value) if no.value is not None else None
    raise KeyError(nome)


def main() -> int:
    revisoes: dict[str, str] = {}   # revision -> arquivo
    anteriores: dict[str, list[str]] = {}  # revision -> down_revisions
    erros: list[str] = []

    for arquivo in sorted(PASTA.glob("*.py")):
        arvore = ast.parse(arquivo.read_text(encoding="utf-8"), filename=str(arquivo))
        try:
            rev = _valor(arvore, "revision")
            down = _valor(arvore, "down_revision")
        except KeyError as falta:
            erros.append(f"{arquivo.name}: sem `{falta.args[0]}`")
            continue
        if rev in revisoes:
            erros.append(f"revision '{rev}' repetida em {revisoes[rev]} e {arquivo.name}")
        revisoes[rev] = arquivo.name
        anteriores[rev] = [] if down is None else ([down] if isinstance(down, str) else list(down))

    citadas = set()
    for rev, downs in anteriores.items():
        for d in downs:
            if d not in revisoes:
                erros.append(f"{revisoes[rev]}: down_revision '{d}' não existe")
            citadas.add(d)

    cabecas = sorted(set(revisoes) - citadas)
    if len(cabecas) != 1:
        lista = ", ".join(f"{c} ({revisoes[c]})" for c in cabecas)
        erros.append(
            f"o Alembic tem {len(cabecas)} cabeças: {lista}. Ajuste o down_revision da "
            "migration mais nova para apontar para a outra."
        )

    if erros:
        print("Migrations com problema:")
        for e in erros:
            print(f"  - {e}")
        return 1
    print(f"OK: {len(revisoes)} migrations, uma cabeça só ({cabecas[0]}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
