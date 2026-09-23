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


def _marcar_falha(db, task: CardTask, motivo: str, gravacao=None) -> None:
    """Registra a falha na tarefa (e no trecho, quando houver) e avisa os donos e os admins."""
    if gravacao is not None:
        gravacao.status = "failed"
        gravacao.error = motivo[:1000]

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
    recording_id: str,
    duration: Optional[int] = None,
) -> None:
    """
    Baixa a gravação do Daily e guarda no bucket.

    O arquivo viaja em blocos: nunca fica inteiro na memória, então tamanho
    deixa de ser limitação. Ao final, a cópia no Daily é apagada.

    Recebe o identificador, não o link: o aviso do Daily não traz link algum,
    e o link de download expira em minutos — pedi-lo aqui, na hora de baixar,
    é o único jeito que funciona.

    Chamado em segundo plano pelo webhook.
    """
    db = SessionLocal()
    try:
        task = db.query(CardTask).filter(CardTask.id == task_id).first()
        if not task:
            print(f"[RECORDING] Tarefa {task_id} nao encontrada — ignorado.")
            return

        from app.models.meeting_recording import MeetingRecording

        # Reenvio do webhook e normal; o mesmo trecho nao pode virar dois
        # arquivos no bucket.
        gravacao = (
            db.query(MeetingRecording)
            .filter(MeetingRecording.daily_recording_id == recording_id)
            .first()
        )
        if gravacao and gravacao.status == "ready" and gravacao.r2_key:
            print(f"[RECORDING] Trecho {recording_id} ja processado — ignorado.")
            return

        if not gravacao:
            ordem = (
                db.query(MeetingRecording)
                .filter(MeetingRecording.card_task_id == task.id)
                .count()
            ) + 1
            gravacao = MeetingRecording(
                card_task_id=task.id,
                daily_recording_id=recording_id,
                ordem=ordem,
                status="processing",
            )
            db.add(gravacao)
            db.commit()

        from app.services.daily_service import DailyService

        try:
            download_url = DailyService(db).link_download_gravacao(recording_id)
        except Exception as e:
            _marcar_falha(db, task, f"Nao foi possivel obter o link da gravacao: {e}", gravacao)
            return

        if not download_url:
            _marcar_falha(db, task, "Daily nao devolveu link para a gravacao.", gravacao)
            return

        chave = montar_chave_gravacao(
            titulo=task.title,
            task_id=task.id,
            quando=task.due_date or datetime.utcnow(),
            parte=gravacao.ordem,
        )

        try:
            with httpx.stream(
                "GET", download_url, timeout=TIMEOUT_DOWNLOAD, follow_redirects=True
            ) as resposta:
                if resposta.status_code >= 400:
                    _marcar_falha(
                        db, task,
                        f"Daily devolveu {resposta.status_code} ao baixar a gravacao.",
                        gravacao,
                    )
                    return

                # O gerador entrega o arquivo em blocos; o storage monta no
                # bucket. Em nenhum momento o video inteiro fica na memoria.
                tamanho = storage_service.upload_em_partes(
                    resposta.iter_bytes(), chave, "video/mp4"
                )
        except Exception as e:
            _marcar_falha(db, task, f"Erro ao guardar a gravacao: {e}", gravacao)
            return

        gravacao.status = "ready"
        gravacao.r2_key = chave
        gravacao.size_bytes = tamanho
        gravacao.duration_seconds = duration
        gravacao.ready_at = datetime.utcnow()
        gravacao.error = None
        db.commit()

        # A tarefa guarda o resumo — status e as somas dos trechos prontos. E o
        # que a lista de reunioes mostra sem precisar abrir cada gravacao.
        prontos = (
            db.query(MeetingRecording)
            .filter(
                MeetingRecording.card_task_id == task.id,
                MeetingRecording.status == "ready",
            )
            .order_by(MeetingRecording.ordem)
            .all()
        )
        task.recording_status = "ready"
        task.recording_key = prontos[0].r2_key if prontos else chave
        task.recording_size_bytes = sum(g.size_bytes or 0 for g in prontos)
        task.recording_duration_seconds = sum(g.duration_seconds or 0 for g in prontos)
        task.recording_ready_at = datetime.utcnow()
        task.recording_error = None
        db.commit()

        print(f"[RECORDING] Gravacao da tarefa {task_id} guardada em {chave} ({tamanho} bytes)")

        # Com a copia no nosso bucket, a do Daily so geraria custo de
        # armazenamento. Falha aqui nao invalida a gravacao — no pior caso
        # sobra um arquivo la, que da para apagar depois.
        try:
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


def processar_transcricao(
    task_id: int,
    transcript_id: Optional[str] = None,
    mtg_session_id: Optional[str] = None,
) -> None:
    """
    Baixa a transcrição da reunião, salva e roda a análise da IA.

    A transcrição é texto, não vídeo: cabe na memória sem problema. Ela é
    guardada no banco (não no bucket) porque é o que sustenta a análise e as
    consultas futuras, e ocupa pouco.

    A análise é o passo que pode falhar sem invalidar o resto: se o modelo
    estiver fora do ar, a transcrição continua salva e dá para analisar
    depois.
    """
    db = SessionLocal()
    try:
        task = db.query(CardTask).filter(CardTask.id == task_id).first()
        if not task:
            print(f"[RECORDING] Tarefa {task_id} nao encontrada — transcricao ignorada.")
            return

        if task.transcript_status == "ready" and task.transcript_raw:
            print(f"[RECORDING] Transcricao da tarefa {task_id} ja processada — ignorado.")
            return

        from app.services.daily_service import DailyService

        service = DailyService(db)

        # O aviso pode vir sem o identificador da transcricao; com o da sessao
        # da reuniao da para encontra-la.
        if not transcript_id and mtg_session_id:
            try:
                transcript_id = service.transcricao_da_sessao(mtg_session_id)
            except Exception as e:
                print(f"[RECORDING] Falha ao procurar a transcricao da tarefa {task_id}: {e}")
                transcript_id = None

        if not transcript_id:
            task.transcript_status = "failed"
            db.commit()
            print(f"[RECORDING] Sem identificador de transcricao para a tarefa {task_id}.")
            return

        try:
            download_url = service.link_download_transcricao(transcript_id)
        except Exception as e:
            task.transcript_status = "failed"
            db.commit()
            print(f"[RECORDING] Falha ao obter o link da transcricao da tarefa {task_id}: {e}")
            return

        if not download_url:
            task.transcript_status = "failed"
            db.commit()
            print(f"[RECORDING] Daily nao devolveu link da transcricao da tarefa {task_id}.")
            return

        try:
            resposta = httpx.get(download_url, timeout=120.0, follow_redirects=True)
            if resposta.status_code >= 400:
                raise ValueError(f"Daily devolveu {resposta.status_code}")
            vtt = resposta.text
        except Exception as e:
            task.transcript_status = "failed"
            db.commit()
            print(f"[RECORDING] Falha ao baixar a transcricao da tarefa {task_id}: {e}")
            return

        task.transcript_raw = vtt
        task.transcript_status = "ready"
        db.commit()
        print(f"[RECORDING] Transcricao da tarefa {task_id} salva ({len(vtt)} caracteres)")

        # A analise so roda quando a reuniao foi gravada. Gravar e uma decisao
        # consciente do vendedor — e o sinal de que aquela conversa importa.
        # Reuniao interna, teste ou conversa de tres minutos nao viram analise
        # (e nao geram custo). Para os demais casos, o botao "Analisar Reuniao"
        # continua disponivel no card.
        houve_gravacao = task.recording_status in ("ready", "processing", "external_link")
        if not houve_gravacao:
            print(f"[RECORDING] Tarefa {task_id} sem gravacao — analise nao disparada.")
            return

        # Falhar aqui nao desfaz a transcricao — ela fica salva e da para
        # reanalisar depois pelo botao.
        analisada = False
        try:
            from app.services.transcript_analysis_service import transcript_analysis_service
            import json as _json

            analise = transcript_analysis_service.analyze(vtt)
            task.transcript_analysis = _json.dumps(analise, ensure_ascii=False)
            db.commit()
            analisada = True
            print(f"[RECORDING] Analise da tarefa {task_id} concluida")
        except Exception as e:
            print(f"[RECORDING] Transcricao salva, mas a analise falhou na tarefa {task_id}: {e}")

        from app.services.avaliacao_reuniao.automatica import avaliar_se_for_o_caso

        avaliada = avaliar_se_for_o_caso(db, task, vtt)

        # Um aviso so, quando tudo o que tinha de ficar pronto ficou: dois
        # avisos seguidos para a mesma reuniao viram ruido.
        if analisada or avaliada:
            partes = ["a transcricao", "a analise" if analisada else None,
                      "a avaliacao pelo roteiro" if avaliada else None]
            partes = [p for p in partes if p]
            lista = ", ".join(partes[:-1]) + " e " + partes[-1]
            _notificar(
                db,
                donos_da_reuniao(db, task),
                "Analise da reuniao pronta",
                f'{lista[0].upper()}{lista[1:]} da reuniao "{task.title}" ja estao no card.',
                task,
            )

    except Exception as e:
        print(f"[RECORDING] Erro inesperado na transcricao da tarefa {task_id}: {e}")
    finally:
        db.close()


def limpar_gravacoes_antigas() -> int:
    """
    Apaga do bucket as gravações que passaram do prazo de retenção.

    Sem isso o bucket cresce indefinidamente — cerca de 50 GB por mês —, e em
    alguns anos vira uma conta desnecessária por vídeos que ninguém assiste.

    A transcrição e a análise **não** são apagadas: ocupam pouco e são o que
    tem valor duradouro no histórico do negócio. Some o vídeo, fica o conteúdo.

    Rodado diariamente pelo scheduler.

    Returns:
        Quantas gravações foram descartadas.
    """
    from datetime import timedelta

    from app.services.storage_service import storage_service

    db = SessionLocal()
    descartadas = 0

    try:
        limite = datetime.utcnow() - timedelta(days=settings.GRAVACAO_RETENCAO_MESES * 30)

        from app.models.meeting_recording import MeetingRecording

        # O descarte é por trecho: uma reunião gravada em partes tem um
        # arquivo por trecho, e cada um vence na sua data.
        antigas = (
            db.query(MeetingRecording)
            .filter(
                MeetingRecording.r2_key.isnot(None),
                MeetingRecording.ready_at.isnot(None),
                MeetingRecording.ready_at < limite,
            )
            .all()
        )

        if not antigas:
            return 0

        print(f"[RETENCAO] {len(antigas)} gravacao(oes) acima de "
              f"{settings.GRAVACAO_RETENCAO_MESES} meses para descartar.")

        for gravacao in antigas:
            # Um arquivo problemático não pode interromper a limpeza dos
            # demais; o que falhar fica para a próxima execução.
            if not storage_service.apagar(gravacao.r2_key):
                print(f"[RETENCAO] Falha ao apagar {gravacao.r2_key} — sera tentado de novo.")
                continue

            gravacao.r2_key = None
            gravacao.status = "expired"
            gravacao.size_bytes = None
            db.commit()
            descartadas += 1

            # A reunião só aparece como expirada quando nenhum trecho sobrou:
            # gravada em partes, uma pode vencer antes da outra.
            task = db.query(CardTask).filter(CardTask.id == gravacao.card_task_id).first()
            if not task:
                continue

            restantes = (
                db.query(MeetingRecording)
                .filter(
                    MeetingRecording.card_task_id == task.id,
                    MeetingRecording.status == "ready",
                )
                .order_by(MeetingRecording.ordem)
                .all()
            )
            if restantes:
                task.recording_key = restantes[0].r2_key
                task.recording_size_bytes = sum(g.size_bytes or 0 for g in restantes)
            else:
                task.recording_key = None
                task.recording_status = "expired"
                task.recording_size_bytes = None
            db.commit()

        print(f"[RETENCAO] {descartadas} gravacao(oes) descartada(s).")
        return descartadas

    except Exception as e:
        print(f"[RETENCAO] Erro na limpeza de gravacoes: {e}")
        return descartadas
    finally:
        db.close()
