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
        """O evento real traz o identificador da transcricao, nao o arquivo."""
        chamou = {}
        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.processar_transcricao_em_background",
            lambda **kw: chamou.update(kw),
        )

        response = enviar(client, {
            "type": "transcript.ready-to-download",
            "payload": {
                "room_name": task.daily_room_name,
                "transcriptId": "4849ed58-1f89",
                "mtgSessionId": "5644f650-c60e",
                "status": "t_finished",
            },
        })

        assert response.status_code == 200
        assert chamou == {
            "task_id": task.id,
            "transcript_id": "4849ed58-1f89",
            "mtg_session_id": "5644f650-c60e",
        }

    def test_transcricao_sem_identificador_usa_a_sessao(self, client: TestClient, task, monkeypatch):
        """Quando so vem a sessao, o servico procura a transcricao por ela."""
        chamou = {}
        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.processar_transcricao_em_background",
            lambda **kw: chamou.update(kw),
        )

        enviar(client, {
            "type": "transcript.ready-to-download",
            "payload": {"room_name": task.daily_room_name, "mtg_session_id": "sessao-1"},
        })

        assert chamou["transcript_id"] is None
        assert chamou["mtg_session_id"] == "sessao-1"


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


class TestSalaDeOutroAmbiente:
    """
    Aconteceu de verdade em 16/09: uma sala criada no ambiente de homologação
    avisou o webhook de produção, onde o mesmo número era uma tarefa de e-mail
    de um cliente real. A gravação do teste — 170 MB — foi anexada a ela.

    O webhook precisa do nome da sala batendo, não só do número.
    """

    def test_tarefa_que_nao_e_daquela_sala_e_ignorada(
        self, client: TestClient, db, test_card, monkeypatch
    ):
        tarefa_de_email = CardTask(
            card_id=test_card.id,
            title="FUP E-mail",
            task_type="EMAIL",
        )
        db.add(tarefa_de_email)
        db.commit()
        db.refresh(tarefa_de_email)

        chamou = []
        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.processar_gravacao_em_background",
            lambda **kw: chamou.append(kw),
        )

        response = enviar(client, {
            "type": "recording.ready-to-download",
            "payload": {
                "recording_id": "rec-do-outro-ambiente",
                # mesmo número, sala de outro ambiente
                "room_name": f"hsg-{tarefa_de_email.id}",
                "duration": 297,
            },
        })

        # 200 para o Daily não desligar o webhook, mas nada foi processado
        assert response.status_code == 200
        assert chamou == []

        db.refresh(tarefa_de_email)
        assert tarefa_de_email.recording_status is None

    def test_sala_com_outro_nome_nao_casa(self, client: TestClient, task, db, monkeypatch):
        """A tarefa é do Daily, mas a sala avisada é outra."""
        task.daily_room_name = "hsg-999999"
        db.commit()

        chamou = []
        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.processar_gravacao_em_background",
            lambda **kw: chamou.append(kw),
        )

        response = enviar(client, {
            "type": "recording.ready-to-download",
            "payload": {"recording_id": "rec-x", "room_name": f"hsg-{task.id}"},
        })

        assert response.status_code == 200
        assert chamou == []

    def test_sala_de_prefixo_diferente_e_ignorada(
        self, client: TestClient, task, db, monkeypatch
    ):
        """
        Produção não responde por sala da homologação.

        Os dois ambientes olham a mesma conta do Daily e recebem os mesmos
        eventos; o prefixo é o que diz de quem é cada sala.
        """
        monkeypatch.setattr(settings, "DAILY_ROOM_PREFIX", "hsg")

        chamou = []
        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.processar_gravacao_em_background",
            lambda **kw: chamou.append(kw),
        )

        response = enviar(client, {
            "type": "recording.ready-to-download",
            "payload": {"recording_id": "rec-y", "room_name": f"hsg-homo-{task.id}"},
        })

        assert response.status_code == 200
        assert chamou == []


class TestRepasseParaOutroAmbiente:
    """
    O Daily aceita um webhook por conta, e ele aponta para produção.

    Para o ambiente de homologação receber suas próprias gravações, produção
    repassa o que não é dela — com a assinatura original, que é o que o outro
    lado vai conferir.
    """

    @pytest.fixture(autouse=True)
    def repasse_ligado(self, monkeypatch):
        monkeypatch.setattr(settings, "DAILY_ROOM_PREFIX", "hsg")
        monkeypatch.setattr(
            settings, "DAILY_WEBHOOK_FORWARD_URL", "https://homo.exemplo/api/v1/daily/webhook"
        )

    def test_sala_do_outro_ambiente_e_repassada(self, client: TestClient, monkeypatch):
        repassado = {}

        def fake(corpo_bruto, timestamp, assinatura):
            repassado.update(corpo=corpo_bruto, ts=timestamp, sig=assinatura)

        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.encaminhar_em_background", fake
        )

        corpo = {
            "type": "recording.ready-to-download",
            "payload": {"recording_id": "rec-do-homo", "room_name": "hsg-homo-37045"},
        }
        response = enviar(client, corpo)

        assert response.status_code == 200
        assert response.json()["status"] == "repassado"
        # corpo e assinatura vão intactos: o outro lado valida com o mesmo segredo
        assert json.loads(repassado["corpo"]) == corpo
        assert repassado["sig"]

    def test_sala_apagada_deste_ambiente_nao_e_repassada(
        self, client: TestClient, monkeypatch
    ):
        """Sala nossa que não existe mais é assunto encerrado, não do outro lado."""
        repassou = []
        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.encaminhar_em_background",
            lambda *a: repassou.append(a),
        )

        response = enviar(client, {
            "type": "meeting.ended",
            "payload": {"room_name": "hsg-99999999"},
        })

        assert response.status_code == 200
        assert response.json()["status"] == "ignorado"
        assert repassou == []

    def test_sem_repasse_configurado_apenas_ignora(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(settings, "DAILY_WEBHOOK_FORWARD_URL", "")

        response = enviar(client, {
            "type": "meeting.ended",
            "payload": {"room_name": "hsg-homo-37045"},
        })

        assert response.json()["status"] == "ignorado"

    def test_outro_ambiente_fora_do_ar_nao_derruba_o_webhook(self, monkeypatch):
        """
        O Daily desliga o webhook após 3 falhas seguidas. Homologação caída
        não pode custar a gravação de produção.
        """
        from app.api.v1.endpoints.daily_webhook import encaminhar_em_background

        class ClienteQueFalha:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def post(self, *a, **kw):
                raise OSError("conexão recusada")

        monkeypatch.setattr("httpx.Client", lambda **kw: ClienteQueFalha())

        # não levanta
        encaminhar_em_background(b'{"type":"meeting.ended"}', "1757400000", "assinatura")

    def test_evento_ja_repassado_nao_volta(self, client: TestClient, monkeypatch):
        """Os dois ambientes com repasse ligado devolveriam o evento sem fim."""
        from app.api.v1.endpoints.daily_webhook import CABECALHO_DE_REPASSE

        repassou = []
        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.encaminhar_em_background",
            lambda *a: repassou.append(a),
        )

        corpo = {"type": "meeting.ended", "payload": {"room_name": "hsg-homo-37045"}}
        headers, bruto = assinar(corpo)
        response = client.post("/api/v1/daily/webhook", data=bruto, headers={
            **headers, "Content-Type": "application/json", CABECALHO_DE_REPASSE: "1",
        })

        assert response.status_code == 200
        assert repassou == []
