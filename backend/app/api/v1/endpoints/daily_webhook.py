"""
Webhook do Daily — recebe os avisos de gravação e transcrição prontas,
entrada de participante e fim da reunião.

Dois cuidados moldam este arquivo:

1. **É rota pública.** A assinatura HMAC é conferida em toda chamada; sem
   isso qualquer um poderia forjar "gravação pronta" e fazer o backend baixar
   um arquivo de fora.

2. **O Daily desliga o webhook após 3 falhas seguidas** (circuit breaker).
   Um erro nosso aqui não derruba só uma chamada: para de chegar tudo, sem
   ninguém perceber. Por isso o endpoint responde 200 sempre que reconhece a
   chamada — sala desconhecida, evento novo ou corpo estranho não viram erro
   — e o trabalho pesado roda em segundo plano.
"""
import base64
import hashlib
import hmac
import re
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.card_task import CardTask

router = APIRouter()

# Marca do evento que já veio repassado de outro ambiente
CABECALHO_DE_REPASSE = "X-HSG-Repassado"


def _assinatura_confere(corpo_bruto: bytes, timestamp: Optional[str], assinatura: Optional[str]) -> bool:
    """
    Confere o HMAC-SHA256 sobre `timestamp + "." + corpo`, como o Daily assina.

    O segredo vem em base64 e precisa ser decodificado antes de assinar.
    """
    if not settings.DAILY_WEBHOOK_SECRET:
        # Sem segredo configurado não há como validar — e aceitar cegamente
        # seria pior do que recusar.
        return False

    if not timestamp or not assinatura:
        return False

    try:
        segredo = base64.b64decode(settings.DAILY_WEBHOOK_SECRET)
        mensagem = timestamp.encode() + b"." + corpo_bruto
        esperada = hmac.new(segredo, mensagem, hashlib.sha256).digest()
        recebida = base64.b64decode(assinatura)
    except Exception:
        return False

    # compare_digest evita vazar informação pelo tempo de comparação
    return hmac.compare_digest(esperada, recebida)


def _task_da_sala(db: Session, nome_sala: Optional[str]) -> Optional[CardTask]:
    """
    Encontra a reunião pelo nome da sala (`hsg-{task_id}`).

    O número no nome não basta: a tarefa encontrada precisa ser mesmo aquela
    sala. Em 16/09 uma sala criada na homologação avisou o webhook de produção,
    onde o mesmo número era uma tarefa de e-mail de um cliente real — e a
    gravação do teste foi anexada a ela. Conferir o nome corta qualquer sala
    que não seja deste ambiente.

    Devolve None em vez de levantar: sala desconhecida é situação normal
    (reunião apagada, sala de outro ambiente) e não pode virar falha no
    webhook — o Daily reenviaria o evento à toa.
    """
    if not nome_sala:
        return None

    nome_sala = nome_sala.strip()

    prefixo = re.escape(settings.DAILY_ROOM_PREFIX)
    correspondencia = re.fullmatch(rf"{prefixo}-(\d+)", nome_sala)
    if not correspondencia:
        return None

    task = db.query(CardTask).filter(CardTask.id == int(correspondencia.group(1))).first()
    if not task or task.daily_room_name != nome_sala:
        return None

    return task


def _sala_deste_ambiente(nome_sala: Optional[str]) -> bool:
    """Diz se a sala tem o prefixo deste ambiente (`hsg-` ou `hsg-homo-`)."""
    if not nome_sala:
        return False

    prefixo = re.escape(settings.DAILY_ROOM_PREFIX)
    return bool(re.fullmatch(rf"{prefixo}-\d+", nome_sala.strip()))


def encaminhar_em_background(
    corpo_bruto: bytes, timestamp: Optional[str], assinatura: Optional[str]
) -> None:
    """
    Repassa o evento ao outro ambiente, com corpo e assinatura intactos.

    O Daily aceita um webhook por conta, e ele é o de produção. Sem isto, a
    gravação de uma sala da homologação nunca chegaria ao homo — foi o que
    aconteceu em 16/09.

    Falha aqui é registrada e esquecida: homologação fora do ar não pode
    derrubar o webhook de produção, que o Daily desliga após 3 falhas.
    """
    import httpx

    url = settings.DAILY_WEBHOOK_FORWARD_URL

    try:
        with httpx.Client(timeout=10.0) as client:
            resposta = client.post(
                url,
                content=corpo_bruto,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Timestamp": timestamp or "",
                    "X-Webhook-Signature": assinatura or "",
                    # Evento repassado não se repassa de novo: com os dois
                    # ambientes configurados, um devolveria ao outro sem fim.
                    CABECALHO_DE_REPASSE: "1",
                },
            )
        print(f"[DAILY-WEBHOOK] Evento repassado para {url}: {resposta.status_code}")
    except Exception as e:
        print(f"[DAILY-WEBHOOK] Falha ao repassar evento para {url}: {e}")


def processar_gravacao_em_background(
    task_id: int,
    recording_id: str,
    duration: Optional[int] = None,
) -> None:
    """Baixa a gravação, guarda no bucket e apaga a cópia do Daily."""
    from app.services.recording_service import processar_gravacao

    processar_gravacao(
        task_id=task_id,
        recording_id=recording_id,
        duration=duration,
    )


def processar_transcricao_em_background(
    task_id: int,
    transcript_id: Optional[str] = None,
    mtg_session_id: Optional[str] = None,
) -> None:
    """Baixa a transcrição, salva e manda para a análise."""
    from app.services.recording_service import processar_transcricao

    processar_transcricao(
        task_id=task_id,
        transcript_id=transcript_id,
        mtg_session_id=mtg_session_id,
    )


@router.post(
    "/webhook",
    summary="[Daily] Recebe eventos da reunião",
    description="""
    Chamado pelo Daily quando algo acontece na reunião: alguém entra, a
    reunião termina, a gravação ou a transcrição ficam prontas.

    Requer assinatura HMAC válida. Responde 200 para qualquer chamada
    autêntica, mesmo que o evento não seja tratado — o Daily desliga o
    webhook após três falhas seguidas.
    """,
)
async def receber_evento_daily(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_webhook_timestamp: Optional[str] = Header(None),
    x_webhook_signature: Optional[str] = Header(None),
) -> Any:
    corpo_bruto = await request.body()

    if not _assinatura_confere(corpo_bruto, x_webhook_timestamp, x_webhook_signature):
        raise HTTPException(status_code=401, detail="Assinatura inválida.")

    try:
        import json

        evento = json.loads(corpo_bruto)
    except Exception:
        # Corpo ilegível: registra e encerra bem, para não queimar o webhook
        print("[DAILY-WEBHOOK] Corpo não é JSON válido — ignorado.")
        return {"status": "ignorado"}

    tipo = evento.get("type", "")
    dados = evento.get("payload", {}) or {}

    # O nome da sala chega como "room" em uns eventos e "room_name" em outros
    nome_sala = dados.get("room_name") or dados.get("room")
    task = _task_da_sala(db, nome_sala)

    if not task:
        # Sala que não é deste ambiente: quem responde por ela é o outro lado
        ja_repassado = request.headers.get(CABECALHO_DE_REPASSE)
        if (
            settings.DAILY_WEBHOOK_FORWARD_URL
            and not ja_repassado
            and not _sala_deste_ambiente(nome_sala)
        ):
            background_tasks.add_task(
                encaminhar_em_background,
                corpo_bruto,
                x_webhook_timestamp,
                x_webhook_signature,
            )
            print(f"[DAILY-WEBHOOK] Evento '{tipo}' da sala {nome_sala} — repassado.")
            return {"status": "repassado"}

        print(f"[DAILY-WEBHOOK] Evento '{tipo}' de sala desconhecida ({nome_sala}) — ignorado.")
        return {"status": "ignorado"}

    if tipo == "participant.joined":
        # owner=True é o vendedor/SDR; os demais são o convidado
        if dados.get("owner"):
            if not task.meeting_started_at:
                task.meeting_started_at = datetime.utcnow()
                db.commit()
        elif not task.contact_joined_at:
            task.contact_joined_at = datetime.utcnow()
            db.commit()

    elif tipo == "meeting.ended":
        # Só o primeiro encerramento conta: reenvio é normal no circuit breaker
        if not task.meeting_ended_at:
            task.meeting_ended_at = datetime.utcnow()
            db.commit()

    elif tipo == "recording.ready-to-download":
        # O Daily não manda link de arquivo: manda o identificador, e o link
        # é pedido à API na hora do download (ele expira em minutos). Esperar
        # um `download_url` que nunca vem fazia o evento ser ignorado em
        # silêncio — a gravação existia no Daily e nunca chegava ao card.
        recording_id = dados.get("recording_id") or dados.get("id")
        if recording_id:
            task.recording_status = "processing"
            db.commit()
            background_tasks.add_task(
                processar_gravacao_em_background,
                task_id=task.id,
                recording_id=recording_id,
                duration=dados.get("duration"),
            )
        else:
            print("[DAILY-WEBHOOK] Gravacao pronta sem identificador — ignorado.")

    elif tipo == "transcript.ready-to-download":
        # Mesma história da gravação: vem identificador, não link. Quando nem o
        # identificador da transcrição vem, o da sessão permite encontrá-la.
        transcript_id = (
            dados.get("transcript_id") or dados.get("transcriptId") or dados.get("id")
        )
        sessao = dados.get("mtg_session_id") or dados.get("mtgSessionId")
        if transcript_id or sessao:
            task.transcript_status = "processing"
            db.commit()
            background_tasks.add_task(
                processar_transcricao_em_background,
                task_id=task.id,
                transcript_id=transcript_id,
                mtg_session_id=sessao,
            )
        else:
            print("[DAILY-WEBHOOK] Transcricao pronta sem identificador — ignorado.")

    else:
        print(f"[DAILY-WEBHOOK] Evento '{tipo}' não tratado — ignorado sem erro.")

    return {"status": "ok"}
