"""
Serviço do Daily.co — criação de sala e tokens.

A API do Daily é sempre simulada aqui; nenhum teste faz chamada real
(evita custo e dependência de rede na suíte).
"""
import pytest
from unittest.mock import patch
from sqlalchemy.orm import Session

from app.models.card_task import CardTask
from app.services.daily_service import DailyService


class _Resp:
    """Resposta HTTP falsa no formato que o httpx devolve."""

    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = str(payload)

    def json(self):
        return self._payload


@pytest.fixture
def task(db: Session, test_card, test_salesperson_user) -> CardTask:
    t = CardTask(
        card_id=test_card.id,
        title="Reunião de teste",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        duration_minutes=60,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


class TestCriacaoDeSala:

    def test_cria_sala_e_guarda_na_task(self, db: Session, task):
        """A sala recebe nome derivado do id da task e os dados ficam gravados."""
        svc = DailyService(db)
        fake = _Resp(200, {"name": f"hsg-{task.id}", "url": f"https://x.daily.co/hsg-{task.id}"})

        with patch("httpx.Client.post", return_value=fake) as mock_post:
            result = svc.create_room(task)

        assert result["name"] == f"hsg-{task.id}"
        assert result["url"].startswith("https://")
        assert task.daily_room_name == f"hsg-{task.id}"
        assert task.meeting_provider == "daily"
        mock_post.assert_called_once()

    def test_gera_token_publico_opaco(self, db: Session, task):
        """O link do convidado usa token aleatório longo, não o id da task."""
        svc = DailyService(db)
        fake = _Resp(200, {"name": f"hsg-{task.id}", "url": "https://x.daily.co/h"})

        with patch("httpx.Client.post", return_value=fake):
            svc.create_room(task)

        assert task.public_access_token
        assert len(task.public_access_token) >= 32
        assert str(task.id) != task.public_access_token

    def test_sala_criada_com_sala_de_espera(self, db: Session, task):
        """A sala exige liberação do anfitrião (knocking) e expira sozinha."""
        svc = DailyService(db)
        fake = _Resp(200, {"name": f"hsg-{task.id}", "url": "https://x.daily.co/h"})

        with patch("httpx.Client.post", return_value=fake) as m:
            svc.create_room(task)

        props = m.call_args.kwargs["json"]["properties"]
        assert props["enable_knocking"] is True
        assert props["eject_at_room_exp"] is True
        assert props["exp"] > 0
        assert props["lang"] == "pt"

    def test_erro_do_daily_vira_excecao_clara(self, db: Session, task):
        """Falha na API do Daily não passa silenciosa."""
        svc = DailyService(db)

        with patch("httpx.Client.post", return_value=_Resp(500, {"error": "boom"})):
            with pytest.raises(ValueError, match="Daily"):
                svc.create_room(task)

    def test_sem_chave_configurada_avisa(self, db: Session, task, monkeypatch):
        """Sem DAILY_API_KEY, a mensagem diz o que está faltando."""
        from app.core.config import settings
        monkeypatch.setattr(settings, "DAILY_API_KEY", "")

        svc = DailyService(db)
        with pytest.raises(ValueError, match="DAILY_API_KEY"):
            svc.create_room(task)


class TestTokens:

    def test_token_de_host_e_dono_da_sala(self, db: Session, task, test_salesperson_user):
        """O anfitrião recebe token de dono — é quem libera quem está esperando."""
        task.daily_room_name = "hsg-1"
        db.commit()

        svc = DailyService(db)
        with patch("httpx.Client.post", return_value=_Resp(200, {"token": "tok-host"})) as m:
            token = svc.create_host_token(task, test_salesperson_user)

        assert token == "tok-host"
        props = m.call_args.kwargs["json"]["properties"]
        assert props["is_owner"] is True
        assert props["room_name"] == "hsg-1"

    def test_token_de_convidado_nunca_e_dono(self, db: Session, task):
        """O convidado não pode liberar ninguém nem encerrar a sala."""
        task.daily_room_name = "hsg-1"
        db.commit()

        svc = DailyService(db)
        with patch("httpx.Client.post", return_value=_Resp(200, {"token": "tok-guest"})) as m:
            token = svc.create_guest_token(task, "Cliente Teste")

        assert token == "tok-guest"
        props = m.call_args.kwargs["json"]["properties"]
        assert props["is_owner"] is False
        assert props["user_name"] == "Cliente Teste"

    def test_token_ausente_na_resposta_vira_erro(self, db: Session, task, test_salesperson_user):
        """Se o Daily não devolver token, falha explicitamente."""
        task.daily_room_name = "hsg-1"
        db.commit()

        svc = DailyService(db)
        with patch("httpx.Client.post", return_value=_Resp(200, {})):
            with pytest.raises(ValueError, match="token"):
                svc.create_host_token(task, test_salesperson_user)


class TestRegistroDoWebhook:
    """
    O webhook precisa existir na conta do Daily para os eventos chegarem.
    Registrar sem conferir os existentes acumula webhooks duplicados, e aí o
    mesmo evento chega várias vezes.
    """

    EVENTOS = [
        "recording.ready-to-download",
        "transcript.ready-to-download",
        "participant.joined",
        "meeting.ended",
    ]

    def test_cria_quando_nao_existe(self, db: Session):
        svc = DailyService(db)
        criado = _Resp(200, {"uuid": "wh-1", "hmac": "c2VncmVkbw=="})

        with patch("httpx.Client.get", return_value=_Resp(200, {"total_count": 0, "data": []})), \
             patch("httpx.Client.post", return_value=criado) as post:
            resultado = svc.garantir_webhook("https://crm.exemplo/api/v1/daily/webhook")

        assert resultado["uuid"] == "wh-1"
        assert resultado["hmac"] == "c2VncmVkbw=="
        enviado = post.call_args.kwargs["json"]
        assert sorted(enviado["eventTypes"]) == sorted(self.EVENTOS)

    def test_nao_duplica_quando_ja_existe_igual(self, db: Session):
        """Mesma URL e mesmos eventos: não cria outro."""
        existente = {
            "total_count": 1,
            "data": [{
                "uuid": "wh-existente",
                "url": "https://crm.exemplo/api/v1/daily/webhook",
                "eventTypes": self.EVENTOS,
                "state": "ACTIVE",
            }],
        }

        svc = DailyService(db)
        with patch("httpx.Client.get", return_value=_Resp(200, existente)), \
             patch("httpx.Client.post") as post:
            resultado = svc.garantir_webhook("https://crm.exemplo/api/v1/daily/webhook")

        assert resultado["uuid"] == "wh-existente"
        post.assert_not_called()

    def test_recria_quando_os_eventos_mudaram(self, db: Session):
        """Webhook antigo com lista diferente precisa ser substituído."""
        existente = {
            "total_count": 1,
            "data": [{
                "uuid": "wh-velho",
                "url": "https://crm.exemplo/api/v1/daily/webhook",
                "eventTypes": ["meeting.ended"],
                "state": "ACTIVE",
            }],
        }

        svc = DailyService(db)
        with patch("httpx.Client.get", return_value=_Resp(200, existente)), \
             patch("httpx.Client.delete") as delete, \
             patch("httpx.Client.post", return_value=_Resp(200, {"uuid": "wh-novo"})) as post:
            resultado = svc.garantir_webhook("https://crm.exemplo/api/v1/daily/webhook")

        assert resultado["uuid"] == "wh-novo"
        delete.assert_called_once()
        post.assert_called_once()

    def test_webhook_de_outra_url_e_ignorado(self, db: Session):
        """Não mexer em webhook de outro ambiente na mesma conta."""
        existente = {
            "total_count": 1,
            "data": [{
                "uuid": "wh-de-outro-ambiente",
                "url": "https://outro.exemplo/webhook",
                "eventTypes": self.EVENTOS,
                "state": "ACTIVE",
            }],
        }

        svc = DailyService(db)
        with patch("httpx.Client.get", return_value=_Resp(200, existente)), \
             patch("httpx.Client.delete") as delete, \
             patch("httpx.Client.post", return_value=_Resp(200, {"uuid": "wh-novo"})):
            svc.garantir_webhook("https://crm.exemplo/api/v1/daily/webhook")

        delete.assert_not_called()


class TestGravacaoNaSala:
    """
    A sala precisa permitir gravação e guardar a transcrição. Gravar continua
    sendo decisão do vendedor: o Daily mostra o botão para o dono da sala, e
    nada começa sozinho.
    """

    def test_sala_permite_gravacao_em_nuvem(self, db: Session, task):
        svc = DailyService(db)
        fake = _Resp(200, {"name": f"hsg-{task.id}", "url": "https://x.daily.co/h"})

        with patch("httpx.Client.post", return_value=fake) as m:
            svc.create_room(task)

        props = m.call_args.kwargs["json"]["properties"]
        assert props["enable_recording"] == "cloud"

    def test_sala_guarda_a_transcricao(self, db: Session, task):
        """Sem isso o VTT não é salvo e o webhook de transcrição nunca chega."""
        svc = DailyService(db)
        fake = _Resp(200, {"name": f"hsg-{task.id}", "url": "https://x.daily.co/h"})

        with patch("httpx.Client.post", return_value=fake) as m:
            svc.create_room(task)

        props = m.call_args.kwargs["json"]["properties"]
        assert props["enable_transcription_storage"] is True

    def test_transcricao_comeca_com_o_anfitriao(self, db: Session, task, test_salesperson_user):
        """
        A transcrição acompanha a reunião desde o início — é ela que alimenta
        a análise depois e a IA ao vivo (Fase 5). Só o dono pode iniciá-la.
        """
        task.daily_room_name = "hsg-1"
        db.commit()

        svc = DailyService(db)
        with patch("httpx.Client.post", return_value=_Resp(200, {"token": "t"})) as m:
            svc.create_host_token(task, test_salesperson_user)

        props = m.call_args.kwargs["json"]["properties"]
        assert props["auto_start_transcription"] is True

    def test_convidado_nao_inicia_transcricao(self, db: Session, task):
        task.daily_room_name = "hsg-1"
        db.commit()

        svc = DailyService(db)
        with patch("httpx.Client.post", return_value=_Resp(200, {"token": "t"})) as m:
            svc.create_guest_token(task, "Cliente")

        props = m.call_args.kwargs["json"]["properties"]
        assert not props.get("auto_start_transcription")


class TestConsultaDeGravacoes:
    """
    Caminho de recuperação: se o webhook não chegar, dá para perguntar ao
    Daily quais gravações a sala tem.
    """

    def test_lista_gravacoes_da_sala(self, db: Session, task):
        task.daily_room_name = "hsg-99"
        db.commit()

        resposta = _Resp(200, {"data": [
            {"id": "rec-1", "status": "finished", "duration": 1800},
        ]})

        svc = DailyService(db)
        with patch("httpx.Client.get", return_value=resposta):
            gravacoes = svc.listar_gravacoes(task)

        assert len(gravacoes) == 1
        assert gravacoes[0]["id"] == "rec-1"

    def test_link_de_download_da_gravacao(self, db: Session, task):
        svc = DailyService(db)
        resposta = _Resp(200, {"download_link": "https://daily/arquivo.mp4"})

        with patch("httpx.Client.get", return_value=resposta):
            url = svc.link_download_gravacao("rec-1")

        assert url == "https://daily/arquivo.mp4"


class TestConsultaDeTranscricao:
    """
    O aviso de transcrição pronta traz identificador, não arquivo — e às vezes
    nem o identificador da transcrição, só o da sessão da reunião.
    """

    def test_link_de_download_da_transcricao(self, db: Session, task):
        svc = DailyService(db)
        resposta = _Resp(200, {"transcriptId": "t-1", "link": "https://daily/arquivo.vtt"})

        with patch("httpx.Client.get", return_value=resposta):
            url = svc.link_download_transcricao("t-1")

        assert url == "https://daily/arquivo.vtt"

    def test_acha_transcricao_pela_sessao(self, db: Session, task):
        svc = DailyService(db)
        resposta = _Resp(200, {"total_count": 1, "data": [{"transcriptId": "t-9"}]})

        with patch("httpx.Client.get", return_value=resposta):
            assert svc.transcricao_da_sessao("sessao-abc") == "t-9"

    def test_sessao_sem_transcricao_devolve_none(self, db: Session, task):
        """Sem transcrição na sessão, quem chama decide o que fazer — não quebra."""
        svc = DailyService(db)
        resposta = _Resp(200, {"total_count": 0, "data": []})

        with patch("httpx.Client.get", return_value=resposta):
            assert svc.transcricao_da_sessao("sessao-abc") is None
