"""
Processamento da gravação e da transcrição da reunião por vídeo.

Roda em segundo plano, disparado pelo webhook do Daily. Por isso nenhuma
função aqui levanta exceção para fora: não há quem trate, e uma falha
silenciosa é melhor investigada pelo campo `recording_error` do que por um
erro perdido no log.

O download acontece em blocos: o arquivo passa pelo servidor em pedaços
pequenos e é montado no bucket, resultando em um vídeo único. Assim uma
gravação de uma hora (500 MB ou mais) é guardada sem que o servidor precise
segurá-la inteira na memória.

Depois de guardada, a cópia no Daily é apagada. Lá o arquivo fica para sempre
e cobra armazenamento — manter os dois sairia bem mais caro sem nenhum ganho.
"""
from datetime import datetime
from typing import List, Optional

import httpx

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.card_task import CardTask
from app.services.storage_service import montar_chave_gravacao, storage_service

TIMEOUT_DOWNLOAD = 600.0  # vídeo é grande e vem em blocos; vale esperar


def donos_da_reuniao(db, task: CardTask) -> List[int]:
    """
    Quem "é dono" da reunião, para efeito de aviso.

    Todos os vinculados ao negócio, sem repetir: o vendedor do card, o SDR do
    card e o responsável pela tarefa. Quando o SDR agenda e vincula o
    vendedor, os dois precisam saber que a gravação ficou pronta — nenhum
    depende do outro avisar.
    """
    from app.models.card import Card

    ids: List[int] = []

    card = db.query(Card).filter(Card.id == task.card_id).first()
    if card:
        for candidato in (card.assigned_to_id, card.sdr_id):
            if candidato and candidato not in ids:
                ids.append(candidato)

    if task.assigned_to_id and task.assigned_to_id not in ids:
        ids.append(task.assigned_to_id)

    return ids


def _ids_admins(db) -> List[int]:
    """Admins e gerentes, avisados quando algo falha."""
    from app.models.role import Role
    from app.models.user import User

    return [
        u.id
        for u in db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.name.in_(("admin", "manager")), User.is_active == True)  # noqa: E712
        .all()
    ]


def _notificar(db, user_ids: List[int], titulo: str, mensagem: str, task: CardTask, cor: str = "info") -> None:
    """Aviso no sino. Falha aqui não pode derrubar o processamento."""
    from app.repositories.notification_repository import NotificationRepository

    repo = NotificationRepository(db)
    for user_id in user_ids:
        try:
            repo.create({
                "user_id": user_id,
                "notification_type": "meeting_recording",
                "title": titulo,
                "message": mensagem,
                "icon": "video",
                "color": cor,
                "notification_metadata": {
                    "card_id": task.card_id,
                    "card_task_id": task.id,
                    "url": f"/cards/{task.card_id}",
                },
            })
        except Exception as e:
            print(f"[RECORDING] Aviso: falha ao notificar usuário {user_id}: {e}")


def _marcar_falha(db, task: CardTask, motivo: str) -> None:
    """Registra a falha na tarefa e avisa os donos e os admins."""
    task.recording_status = "failed"
    task.recording_error = motivo[:1000]
    db.commit()

    destinatarios = donos_da_reuniao(db, task) + [
        i for i in _ids_admins(db) if i not in donos_da_reuniao(db, task)
    ]
    _notificar(
        db,
        destinatarios,
        "Falha ao processar a gravação",
        f"A gravação da reunião \"{task.title}\" não pôde ser processada. {motivo[:200]}",
        task,
        cor="danger",
    )


def processar_gravacao(
    task_id: int,
    download_url: str,
    duration: Optional[int] = None,
    recording_id: Optional[str] = None,
) -> None:
    """
    Baixa a gravação do Daily e guarda no bucket.

    O arquivo viaja em blocos: nunca fica inteiro na memória, então tamanho
    deixa de ser limitação. Ao final, a cópia no Daily é apagada.

    Chamado em segundo plano pelo webhook.
    """
    db = SessionLocal()
    try:
        task = db.query(CardTask).filter(CardTask.id == task_id).first()
        if not task:
            print(f"[RECORDING] Tarefa {task_id} nao encontrada — ignorado.")
            return

        # Reenvio do webhook e normal; nao reprocessa o que ja esta pronto
        if task.recording_status == "ready" and task.recording_key:
            print(f"[RECORDING] Gravacao da tarefa {task_id} ja processada — ignorado.")
            return

        chave = montar_chave_gravacao(
            titulo=task.title,
            task_id=task.id,
            quando=task.due_date or datetime.utcnow(),
        )

        try:
            with httpx.stream(
                "GET", download_url, timeout=TIMEOUT_DOWNLOAD, follow_redirects=True
            ) as resposta:
                if resposta.status_code >= 400:
                    _marcar_falha(
                        db, task,
                        f"Daily devolveu {resposta.status_code} ao baixar a gravacao.",
                    )
                    return

                # O gerador entrega o arquivo em blocos; o storage monta no
                # bucket. Em nenhum momento o video inteiro fica na memoria.
                tamanho = storage_service.upload_em_partes(
                    resposta.iter_bytes(), chave, "video/mp4"
                )
        except Exception as e:
            _marcar_falha(db, task, f"Erro ao guardar a gravacao: {e}")
            return

        task.recording_status = "ready"
        task.recording_key = chave
        task.recording_size_bytes = tamanho
        task.recording_duration_seconds = duration
        task.recording_ready_at = datetime.utcnow()
        task.recording_error = None
        db.commit()

        print(f"[RECORDING] Gravacao da tarefa {task_id} guardada em {chave} ({tamanho} bytes)")

        # Com a copia no nosso bucket, a do Daily so geraria custo de
        # armazenamento. Falha aqui nao invalida a gravacao — no pior caso
        # sobra um arquivo la, que da para apagar depois.
        if recording_id:
            try:
                from app.services.daily_service import DailyService

                DailyService(db).apagar_gravacao(recording_id)
            except Exception as e:
                print(f"[RECORDING] Aviso: falha ao apagar a gravacao no Daily: {e}")

        _notificar(
            db,
            donos_da_reuniao(db, task),
            "Gravacao disponivel",
            f'A gravacao da reuniao "{task.title}" ja pode ser assistida.',
            task,
        )

    except Exception as e:
        # Rede de seguranca: rodando em background, nada pode escapar
        print(f"[RECORDING] Erro inesperado ao processar a tarefa {task_id}: {e}")
    finally:
        db.close()


def processar_transcricao(task_id: int, download_url: str) -> None:
    """
    Baixa a transcrição, salva e manda para a análise.

    Implementado na Task 8/9 — o parser precisa entender o formato do Daily
    antes de a análise fazer sentido.
    """
    print(f"[RECORDING] Transcrição da tarefa {task_id} — processamento na próxima etapa.")
