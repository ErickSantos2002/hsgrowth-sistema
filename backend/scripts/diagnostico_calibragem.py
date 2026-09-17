"""
Onde a IA discorda da consultoria, critério a critério.

A calibragem diz *quanto* a nota difere; este diz *onde*. Sem isso, ajustar o
prompt é chute: dá para piorar a nota achando que se está corrigindo.

Uso:
    docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
        python scripts/diagnostico_calibragem.py C01
"""
import sys
import warnings

import openpyxl
from sqlalchemy import text

from app.db.session import SessionLocal
from app.services.avaliacao_reuniao import servico

warnings.filterwarnings("ignore")

TAREFAS = {"C01": 33810, "C02": 33585, "C03": 33238, "C04": 31362}

PLANILHA = "/tmp/avaliacao.xlsm"


def main(call_id: str) -> None:
    wb = openpyxl.load_workbook(PLANILHA, data_only=True)

    humano = {}
    for linha in wb["Avaliacoes"].iter_rows(min_row=2, values_only=True):
        if str(linha[0]) == call_id and linha[5]:
            nota = linha[9]
            humano[str(linha[5])] = {
                "nota": None if nota in (None, "N/A") else int(float(nota)),
                "evidencia": str(linha[11] or "")[:70],
            }

    db = SessionLocal()
    transcricao = db.execute(
        text("SELECT transcript_raw FROM card_tasks WHERE id = :id"),
        {"id": TAREFAS[call_id]},
    ).scalar()
    db.close()

    resultado = servico.avaliar(transcricao, "")

    print(f"=== {call_id} — transcricao com {len(transcricao)} chars ===")
    print(f"score IA: {resultado['score']} | cobertura: {resultado['cobertura']}")
    print(f"tokens saida: {resultado['tokens_saida']} "
          f"(limite {servico.MAX_TOKENS} — se bater no limite, a resposta truncou)")
    print()

    distribuicao = {"humano": {}, "ia": {}}
    for item in resultado["itens"]:
        nota_ia = item["nota"]
        nota_humana = humano.get(item["criterio_id"], {}).get("nota")
        distribuicao["ia"][nota_ia] = distribuicao["ia"].get(nota_ia, 0) + 1
        distribuicao["humano"][nota_humana] = distribuicao["humano"].get(nota_humana, 0) + 1

    print("distribuicao de notas:")
    for quem in ("humano", "ia"):
        linha = " ".join(
            f"{'N/A' if k is None else k}={v}"
            for k, v in sorted(distribuicao[quem].items(), key=lambda x: (x[0] is None, x[0]))
        )
        print(f"  {quem:7} {linha}")
    print()

    print(f"{'Crit':5} {'peso':>5} {'hum':>4} {'ia':>4}  evidencia da IA")
    for item in resultado["itens"]:
        h = humano.get(item["criterio_id"], {})
        nota_humana = h.get("nota")
        if nota_humana == item["nota"]:
            continue  # só o que divergiu
        print(f"{item['criterio_id']:5} {item['peso']:5g} "
              f"{('N/A' if nota_humana is None else nota_humana):>4} "
              f"{('N/A' if item['nota'] is None else item['nota']):>4}  "
              f"{(item['evidencia'] or '(sem evidencia)')[:60]}")
        print(f"{'':16} humano: {h.get('evidencia', '')[:60]}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "C01")
