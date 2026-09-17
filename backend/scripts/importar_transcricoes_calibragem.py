"""
Importa do Teams a transcrição das 7 reuniões avaliadas pela consultoria.

Essas reuniões foram conduzidas pela Sandra e avaliadas por gente; são o único
material que permite comparar a nota da nossa régua com a de quem avalia hoje.
O CRM já guarda o acesso Microsoft dela (o mesmo usado quando ela clica em
"Analisar Reunião"), então a importação não depende de ela estar disponível.

A transcrição pertence a quem organizou a reunião: usar a conta dela é o que
faz o Microsoft Graph responder. Nada além de `transcript_raw` é alterado.

Uso:
    # só confere o que existe, sem gravar
    docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
        python scripts/importar_transcricoes_calibragem.py

    # grava as transcrições nas tarefas
    docker exec -e PYTHONPATH=/app -w /app hsgrowth-api-local \
        python scripts/importar_transcricoes_calibragem.py --gravar
"""
import sys

from app.db.session import SessionLocal
from app.models.card_task import CardTask
from app.models.user import User
from app.services.microsoft_graph_service import microsoft_graph_service

# Call da planilha -> tarefa no CRM
TAREFAS = {
    "C01": 33810,  # Concrenorte, 25/08
    "C02": 33585,  # Unimodal, 24/08
    "C03": 33238,  # PIRECAL, 21/08
    "C04": 31362,  # Ludvig, 18/08
    "C05": 31472,  # Arauco Brasil, 13/08
    "C06": 24382,  # Leblon Transporte, 09/07
    "C07": 20011,  # Rota Transportes, 12/06
}

DONA_DAS_REUNIOES = 5  # Sandra Silva


def main(gravar: bool) -> None:
    db = SessionLocal()
    sandra = db.query(User).filter(User.id == DONA_DAS_REUNIOES).first()

    if not sandra or not sandra.ms_refresh_token:
        raise SystemExit("Conta Microsoft da Sandra não está conectada no CRM.")

    print(f"Usando a conta de {sandra.name}" + ("" if gravar else "  (sem gravar)"))
    print()

    for call_id, task_id in TAREFAS.items():
        task = db.query(CardTask).filter(CardTask.id == task_id).first()
        if not task:
            print(f"{call_id}: tarefa {task_id} não existe")
            continue

        if task.transcript_raw:
            print(f"{call_id}: tarefa {task_id} já tem transcrição "
                  f"({len(task.transcript_raw)} chars)")
            continue

        meeting_id = task.teams_meeting_id
        if not meeting_id:
            print(f"{call_id}: tarefa {task_id} sem reunião do Teams")
            continue

        # Marcador de resolução adiada: o id real é descoberto pelo link
        if meeting_id.startswith("join_url:") and task.teams_join_url:
            try:
                token = microsoft_graph_service._require_token(sandra, db)
                resolvido = microsoft_graph_service._resolve_meeting_id_by_join_url(
                    token, task.teams_join_url
                )
                if not resolvido.startswith("join_url:"):
                    meeting_id = resolvido
            except Exception as e:
                print(f"{call_id}: não deu para resolver o id da reunião: {e}")
                continue

        try:
            transcricoes = microsoft_graph_service.get_meeting_transcripts(
                user=sandra, db=db, meeting_id=meeting_id
            )
        except Exception as e:
            print(f"{call_id}: erro ao consultar o Teams: {str(e)[:150]}")
            continue

        if not transcricoes:
            print(f"{call_id}: o Teams não tem transcrição desta reunião "
                  f"(retenção ou gravação sem transcrição)")
            continue

        try:
            vtt = microsoft_graph_service.get_transcript_content(
                user=sandra, db=db, meeting_id=meeting_id,
                transcript_id=transcricoes[-1]["id"],
            )
        except Exception as e:
            print(f"{call_id}: erro ao baixar a transcrição: {str(e)[:150]}")
            continue

        if gravar:
            task.transcript_raw = vtt
            db.commit()
            print(f"{call_id}: tarefa {task_id} — {len(vtt)} chars GRAVADOS")
        else:
            print(f"{call_id}: tarefa {task_id} — {len(vtt)} chars disponíveis "
                  f"({len(transcricoes)} transcrição(ões) no Teams)")

    db.close()


if __name__ == "__main__":
    main("--gravar" in sys.argv)
