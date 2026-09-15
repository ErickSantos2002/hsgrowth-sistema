"""
Webhook do Daily — avisa quando a gravação e a transcrição ficam prontas.

Dois cuidados que moldam este endpoint:

1. É rota pública. Sem validar a assinatura, qualquer um poderia forjar
   "gravação pronta" e fazer o backend baixar um arquivo de fora.
2. O Daily usa circuit breaker: após 3 falhas seguidas ele **para de enviar
   eventos**. Então o endpoint responde 200 sempre que reconhece a chamada, e
   o trabalho pesado vai para segundo plano.
"""
import base64
import hashlib
import hmac
import json
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.card_task import CardTask

SEGREDO = base64.b64encode(b"segredo-de-teste-do-webhook").decode()


def assinar(corpo: dict, timestamp: str = "1757400000") -> dict:
    """Monta os headers como o Daily faria."""
    corpo_bruto = json.dumps(corpo, separators=(",", ":"))
    mensagem = f"{timestamp}.{corpo_bruto}".encode()
    assinatura = hmac.new(base64.b64decode(SEGREDO), mensagem, hashlib.sha256).digest()
    return {
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Signature": base64.b64encode(assinatura).decode(),
    }, corpo_bruto


@pytest.fixture(autouse=True)
def segredo_configurado(monkeypatch):
    monkeypatch.setattr(settings, "DAILY_WEBHOOK_SECRET", SEGREDO)


@pytest.fixture
def task(db: Session, test_card, test_salesperson_user) -> CardTask:
    t = CardTask(
        card_id=test_card.id,
        title="Reunião gravada",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_provider="daily",
        daily_room_name="hsg-777",
        daily_room_url="https://healthsafety.daily.co/hsg-777",
        public_access_token="tok-publico-de-teste-1234567890ab",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    # o nome da sala precisa bater com o id real da tarefa
    t.daily_room_name = f"hsg-{t.id}"
    db.commit()
    db.refresh(t)
    return t


def enviar(client: TestClient, corpo: dict):
    headers, bruto = assinar(corpo)
    return client.post("/api/v1/daily/webhook", data=bruto, headers={
        **headers, "Content-Type": "application/json"
    })


class TestValidacaoDeOrigem:

    def test_sem_assinatura_e_recusado(self, client: TestClient, task):
        """Sem isso, dá para forjar 'gravação pronta' e nos fazer baixar arquivo de fora."""
        response = client.post(
            "/api/v1/daily/webhook",
            json={"type": "meeting.ended", "payload": {"room": task.daily_room_name}},
        )
        assert response.status_code == 401

    def test_assinatura_errada_e_recusada(self, client: TestClient, task):
        corpo = {"type": "meeting.ended", "payload": {"room": task.daily_room_name}}
        bruto = json.dumps(corpo, separators=(",", ":"))
        response = client.post(
            "/api/v1/daily/webhook",
            data=bruto,
            headers={
                "X-Webhook-Timestamp": "1757400000",
                "X-Webhook-Signature": base64.b64encode(b"assinatura-falsa").decode(),
                "Content-Type": "application/json",
            },
        )
        assert response.status_code == 401

    def test_assinatura_valida_e_aceita(self, client: TestClient, task):
        response = enviar(client, {
            "type": "meeting.ended",
            "payload": {"room": task.daily_room_name},
        })
        assert response.status_code == 200


class TestEventos:

    def test_meeting_ended_marca_o_fim(self, client: TestClient, task, db):
        enviar(client, {"type": "meeting.ended", "payload": {"room": task.daily_room_name}})

        db.refresh(task)
        assert task.meeting_ended_at is not None

    def test_participant_joined_do_anfitriao_marca_inicio(self, client: TestClient, task, db):
        enviar(client, {
            "type": "participant.joined",
            "payload": {"room": task.daily_room_name, "owner": True, "user_name": "Vendedor"},
        })

        db.refresh(task)
        assert task.meeting_started_at is not None

    def test_participant_joined_do_convidado_marca_entrada(self, client: TestClient, task, db):
        enviar(client, {
            "type": "participant.joined",
            "payload": {"room": task.daily_room_name, "owner": False, "user_name": "Cliente"},
        })

        db.refresh(task)
        assert task.contact_joined_at is not None

    def test_recording_pronta_dispara_processamento(self, client: TestClient, task, db, monkeypatch):
        """
        O evento real do Daily não traz link de arquivo, só o identificador —
        confirmado na homologação de 14/09, quando três gravações existiam no
        Daily e nenhuma chegou ao card.
        """
        chamou = {}

        def fake(task_id, recording_id, duration=None, **kwargs):
            chamou.update(task_id=task_id, recording_id=recording_id, duration=duration)

        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.processar_gravacao_em_background", fake
        )

        response = enviar(client, {
            "type": "recording.ready-to-download",
            "payload": {
                "recording_id": "rec-123",
                "room_name": task.daily_room_name,
                "duration": 173,
                "s3_key": "healthsafety/hsg-1/1789386947497",
                "status": "finished",
            },
        })

        assert response.status_code == 200
        assert chamou == {"task_id": task.id, "recording_id": "rec-123", "duration": 173}

        db.refresh(task)
        assert task.recording_status == "processing"

    def test_recording_sem_identificador_nao_quebra(self, client: TestClient, task, monkeypatch):
        """Evento estranho não pode virar erro: o Daily desliga o webhook após 3 falhas."""
        chamou = []
        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.processar_gravacao_em_background",
            lambda **kw: chamou.append(kw),
        )

        response = enviar(client, {
            "type": "recording.ready-to-download",
            "payload": {"room_name": task.daily_room_name, "duration": 10},
        })

        assert response.status_code == 200
        assert chamou == []

    def test_transcricao_pronta_dispara_processamento(self, client: TestClient, task, monkeypatch):
        chamou = {}
        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.processar_transcricao_em_background",
            lambda task_id, download_url, **kw: chamou.update(task_id=task_id, url=download_url),
        )

        response = enviar(client, {
            "type": "transcript.ready-to-download",
            "payload": {
                "room_name": task.daily_room_name,
                "download_url": "https://daily/transcricao.vtt",
            },
        })

        assert response.status_code == 200
        assert chamou["task_id"] == task.id


class TestResiliencia:
    """
    O Daily desliga o webhook após 3 falhas seguidas. Nada aqui pode devolver
    erro por situação prevista — senão as gravações param de ser processadas
    sem ninguém perceber.
    """

    def test_sala_desconhecida_responde_200(self, client: TestClient, task):
        response = enviar(client, {
            "type": "meeting.ended",
            "payload": {"room": "hsg-sala-que-nao-existe"},
        })
        assert response.status_code == 200

    def test_evento_desconhecido_responde_200(self, client: TestClient, task):
        response = enviar(client, {
            "type": "evento.que.ainda.nao.existe",
            "payload": {"room": task.daily_room_name},
        })
        assert response.status_code == 200

    def test_corpo_sem_sala_responde_200(self, client: TestClient, task):
        response = enviar(client, {"type": "meeting.ended", "payload": {}})
        assert response.status_code == 200

    def test_evento_repetido_nao_muda_o_primeiro_horario(self, client: TestClient, task, db):
        """Reenvio é normal no circuit breaker; não pode reescrever o histórico."""
        enviar(client, {"type": "meeting.ended", "payload": {"room": task.daily_room_name}})
        db.refresh(task)
        primeiro = task.meeting_ended_at

        enviar(client, {"type": "meeting.ended", "payload": {"room": task.daily_room_name}})
        db.refresh(task)

        assert task.meeting_ended_at == primeiro
