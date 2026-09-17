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

    def test_token_nao_inicia_transcricao_sozinho(self, db: Session, task, test_salesperson_user):
        """
        Quem inicia a transcrição é a página da sala, em pt-BR. O início
        automático do Daily usa o modelo padrão, em inglês, e transcreveu uma
        conversa em português como ruído na homologação de 14/09.
        """
        task.daily_room_name = "hsg-1"
        db.commit()

        svc = DailyService(db)
        with patch("httpx.Client.post", return_value=_Resp(200, {"token": "t"})) as m:
            svc.create_host_token(task, test_salesperson_user)

        props = m.call_args.kwargs["json"]["properties"]
        assert "auto_start_transcription" not in props
        assert props["is_owner"] is True

    def test_sala_nega_gravacao_a_quem_nao_e_dono(self, db: Session, task):
        """
        Na homologação de 14/09 o convidado iniciou e parou a gravação: sem
        `permissions`, o padrão do Daily libera isso para qualquer um.
        """
        svc = DailyService(db)
        fake = _Resp(200, {"name": f"hsg-{task.id}", "url": "https://x.daily.co/h"})

        with patch("httpx.Client.post", return_value=fake) as m:
            svc.create_room(task)

        permissoes = m.call_args.kwargs["json"]["properties"]["permissions"]
        assert permissoes["canAdmin"] is False
        assert permissoes["hasPresence"] is True
        assert permissoes["canSend"] is True

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


class TestReagendamento:
    """
    Reagendar a reunião precisa estender a sala.

    A sala vale até o fim previsto mais a margem. Sem estender, o convite
    (que continua no calendário do cliente) aponta para uma sala expirada e
    ninguém entra no dia remarcado — o vendedor só descobre na hora.
    """

    def test_estende_o_prazo_da_sala(self, db: Session, task):
        from datetime import datetime, timedelta, timezone

        task.daily_room_name = "hsg-77"
        task.due_date = datetime.utcnow() + timedelta(days=3)
        db.commit()

        svc = DailyService(db)
        with patch("httpx.Client.post", return_value=_Resp(200, {"name": "hsg-77"})) as m:
            svc.atualizar_expiracao(task)

        url = m.call_args.args[0]
        exp = m.call_args.kwargs["json"]["properties"]["exp"]
        assert url.endswith("/rooms/hsg-77")
        # o novo prazo precisa cobrir a data remarcada
        assert exp > (task.due_date.replace(tzinfo=timezone.utc)).timestamp()

    def test_sala_ja_removida_e_recriada(self, db: Session, task):
        """Passado o prazo, o Daily apaga a sala. Recriar mantém o mesmo endereço."""
        task.daily_room_name = "hsg-77"
        db.commit()

        svc = DailyService(db)
        respostas = [
            _Resp(404, {"error": "not-found"}),
            _Resp(200, {"name": "hsg-77", "url": "https://x.daily.co/hsg-77"}),
        ]
        with patch("httpx.Client.post", side_effect=respostas) as m:
            svc.atualizar_expiracao(task)

        assert m.call_count == 2
        assert m.call_args.args[0].endswith("/rooms")  # criação
        assert task.daily_room_name == "hsg-77"

    def test_recriar_mantem_o_link_do_convidado(self, db: Session, task):
        """O convite já enviado ao cliente precisa continuar funcionando."""
        task.daily_room_name = "hsg-77"
        task.public_access_token = "token-que-o-cliente-ja-tem"
        db.commit()

        svc = DailyService(db)
        with patch("httpx.Client.post", side_effect=[
            _Resp(404, {"error": "not-found"}),
            _Resp(200, {"name": "hsg-77", "url": "https://x.daily.co/hsg-77"}),
        ]):
            svc.atualizar_expiracao(task)

        assert task.public_access_token == "token-que-o-cliente-ja-tem"

    def test_reuniao_sem_sala_nao_faz_nada(self, db: Session, task):
        """Reunião do Teams ou ainda sem sala: nada a estender."""
        task.daily_room_name = None
        db.commit()

        svc = DailyService(db)
        with patch("httpx.Client.post") as m:
            svc.atualizar_expiracao(task)

        m.assert_not_called()


class TestQuemPodeGravar:
    """
    Só o anfitrião grava.

    Dono de sala no Daily é administrador de tudo, inclusive da gravação. Como
    todo mundo do time entrava pelo CRM com token de dono, qualquer pessoa
    conseguia iniciar e parar a gravação — o convidado não, mas o colega sim
    (visto na homologação de 16/09).
    """

    def _payload_do_token(self, db, task, user, monkeypatch):
        enviados = {}

        def fake_post(caminho, payload):
            enviados["payload"] = payload
            return {"token": "tok"}

        svc = DailyService(db)
        monkeypatch.setattr(svc, "_post", fake_post)
        svc.create_host_token(task, user)
        return enviados["payload"]["properties"]

    def test_responsavel_pela_reuniao_e_dono(self, db: Session, task, test_salesperson_user):
        task.daily_room_name = "hsg-1"
        task.assigned_to_id = test_salesperson_user.id
        db.commit()

        props = self._payload_do_token(db, task, test_salesperson_user, pytest.MonkeyPatch())

        assert props["is_owner"] is True
        assert "permissions" not in props

    def test_colega_entra_sem_poder_gravar(self, db: Session, task, test_salesperson_user,
                                           test_manager_user):
        """Gerente ou SDR acompanham a reunião, mas a gravação é decisão do anfitrião."""
        task.daily_room_name = "hsg-1"
        task.assigned_to_id = test_salesperson_user.id
        db.commit()

        props = self._payload_do_token(db, task, test_manager_user, pytest.MonkeyPatch())

        assert props["is_owner"] is False
        assert "streaming" not in props["permissions"]["canAdmin"]

    def test_colega_ainda_libera_a_sala_de_espera(self, db: Session, task, test_salesperson_user,
                                                  test_manager_user):
        """Sem isso, o cliente ficaria esperando quando o anfitrião atrasa."""
        task.daily_room_name = "hsg-1"
        task.assigned_to_id = test_salesperson_user.id
        db.commit()

        props = self._payload_do_token(db, task, test_manager_user, pytest.MonkeyPatch())

        assert "participants" in props["permissions"]["canAdmin"]
        assert "transcription" in props["permissions"]["canAdmin"]

    def test_sem_responsavel_vale_o_vendedor_do_card(self, db: Session, task, test_card,
                                                     test_salesperson_user):
        task.daily_room_name = "hsg-1"
        task.assigned_to_id = None
        test_card.assigned_to_id = test_salesperson_user.id
        db.commit()

        props = self._payload_do_token(db, task, test_salesperson_user, pytest.MonkeyPatch())

        assert props["is_owner"] is True
