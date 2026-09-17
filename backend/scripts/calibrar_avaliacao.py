"""
Compara a avaliação da IA com as notas humanas da consultoria.

As reuniões da planilha foram avaliadas por gente e estão no CRM como reuniões
do Teams. Rodar a régua nelas e comparar é o que autoriza liberar: uma IA que
dá 80 onde a consultoria deu 50 treina o vendedor na direção errada.

Antes de rodar, as transcrições precisam ter sido importadas
(`scripts/importar_transcricoes_calibragem.py --gravar`).

Uso:
    docker cp "Documentação/Avaliacao_Calls_HealthSafety_alinhada_a_matriz.xlsm" \
        hsgrowth-api-local:/tmp/avaliacao.xlsm
    docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
        python scripts/calibrar_avaliacao.py /tmp/avaliacao.xlsm

Custo: ~US$ 0,05 por reunião avaliada.
"""
import sys
import warnings

import openpyxl
from sqlalchemy import text

from app.db.session import SessionLocal
from app.services.avaliacao_reuniao import servico

warnings.filterwarnings("ignore")

# Call da planilha -> tarefa no CRM (conferido no banco em 17/09)
TAREFAS = {
    "C01": 33810,
    "C02": 33585,
    "C03": 33238,
    "C04": 31362,
    "C05": 31472,
    "C06": 24382,
    "C07": 20011,
}

TOLERANCIA = 10  # pontos de diferença que ainda consideramos aceitável


def notas_humanas(caminho_planilha: str) -> dict:
    """{call_id: {"cliente": str, "score": float|None, "itens": {criterio: nota}}}"""
    wb = openpyxl.load_workbook(caminho_planilha, data_only=True)

    humano = {}
    for linha in wb["Calls"].iter_rows(min_row=2, values_only=True):
        if not linha[0]:
            continue
        humano[str(linha[0])] = {
            "cliente": str(linha[1]),
            "score": float(linha[6]) if linha[6] is not None else None,
            "itens": {},
        }

    for linha in wb["Avaliacoes"].iter_rows(min_row=2, values_only=True):
        call_id = str(linha[0]) if linha[0] else None
        if call_id in humano and linha[5]:
            nota = linha[9]
            humano[call_id]["itens"][str(linha[5])] = (
                None if nota in (None, "N/A") else int(float(nota))
            )

    return humano


def main(caminho_planilha: str) -> None:
    humano = notas_humanas(caminho_planilha)
    db = SessionLocal()

    print(f"{'Call':5} {'Cliente':18} {'Humano':>8} {'IA':>8} {'Dif':>7}  Iguais  Blocos da IA")
    diferencas = []
    ordem_humana = []
    ordem_ia = []

    for call_id, dados in humano.items():
        task_id = TAREFAS.get(call_id)
        transcricao = (
            db.execute(
                text("SELECT transcript_raw FROM card_tasks WHERE id = :id"), {"id": task_id}
            ).scalar()
            if task_id
            else None
        )

        if not transcricao:
            print(f"{call_id:5} {dados['cliente'][:18]:18} "
                  f"-- sem transcricao na tarefa {task_id}")
            continue

        resultado = servico.avaliar(transcricao, "")

        iguais = sum(
            1 for i in resultado["itens"]
            if dados["itens"].get(i["criterio_id"]) == i["nota"]
        )
        blocos = " ".join(
            f"{b[:3]}={int(v)}" for b, v in sorted(resultado["medias_por_bloco"].items())
        )

        score_humano = dados["score"]
        score_ia = resultado["score"]

        if score_ia is None or score_humano is None:
            humano_txt = f"{score_humano:.1f}" if score_humano is not None else "parcial"
            ia_txt = f"{score_ia:.1f}" if score_ia is not None else "parcial"
            print(f"{call_id:5} {dados['cliente'][:18]:18} {humano_txt:>8} {ia_txt:>8} "
                  f"{'--':>7}  {iguais:>2}/26  {blocos}")
            continue

        diferenca = score_ia - score_humano
        diferencas.append(abs(diferenca))
        ordem_humana.append((call_id, score_humano))
        ordem_ia.append((call_id, score_ia))
        print(f"{call_id:5} {dados['cliente'][:18]:18} {score_humano:8.1f} {score_ia:8.1f} "
              f"{diferenca:+7.1f}  {iguais:>2}/26  {blocos}")

    db.close()

    if diferencas:
        media = sum(diferencas) / len(diferencas)
        print(f"\nDiferenca media: {media:.1f} pontos ({len(diferencas)} reunioes)")
        if media <= TOLERANCIA:
            print("Dentro da tolerancia: a regua pode ser liberada.")
        else:
            print("Acima da tolerancia: ajustar a rubrica no prompt e rodar de novo.")

        melhor_humano = max(ordem_humana, key=lambda x: x[1])[0]
        melhor_ia = max(ordem_ia, key=lambda x: x[1])[0]
        pior_humano = min(ordem_humana, key=lambda x: x[1])[0]
        pior_ia = min(ordem_ia, key=lambda x: x[1])[0]
        print(f"Melhor call: humano={melhor_humano} IA={melhor_ia} | "
              f"Pior call: humano={pior_humano} IA={pior_ia}")
        print("A ordem importa mais que o numero: se a IA concorda em qual foi a melhor "
              "e a pior, ela serve para treinar mesmo com alguns pontos de diferenca.")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "/tmp/avaliacao.xlsm")
