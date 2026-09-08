"""
Reunião do Daily cria evento no Outlook com o link da sala no corpo.

É esse evento que faz o convite chegar ao cliente e o horário bloquear a
agenda do vendedor — o SDR consulta esse mesmo free/busy antes de agendar,
então sem ele haveria agendamento em cima de reunião interna.

Cobre também a proteção de desenvolvimento (DAILY_DEV_MODE), que impede
convite de teste chegar a e-mail de cliente real.
"""
from datetime import datetime
from unittest.mock import patch

import pytest

from app.core.config import settings
from app.services.microsoft_graph_service import microsoft_graph_service


class _Resp:
    """Resposta do Graph. Devolve joinUrl para o caminho Teams funcionar."""

    status_code = 201
    text = "{}"

    @staticmethod
    def json():
        return {
            "id": "evt-1",
            "onlineMeeting": {"joinUrl": "https://teams.microsoft.com/l/meetup-join/abc"},
        }


@pytest.fixture
def captura_payload(monkeypatch, test_salesperson_user):
    """Intercepta o POST ao Graph e devolve o payload enviado."""
    monkeypatch.setattr(microsoft_graph_service, "_require_token", lambda *a, **k: "tok-fake")
    monkeypatch.setattr(
        microsoft_graph_service, "_resolve_meeting_id_by_join_url", lambda *a, **k: "meet-id"
    )
    capturado = {}

    def fake_post(self, url, **kwargs):
        capturado.clear()
        capturado.update(kwargs.get("json", {}))
        return _Resp()

    return capturado, fake_post


class TestConviteComLinkDaily:

    def test_link_do_daily_vai_no_corpo(self, db, test_salesperson_user, captura_payload):
        """O corpo do evento carrega o link que o cliente vai clicar."""
        capturado, fake_post = captura_payload

        with patch("httpx.Client.post", fake_post):
            microsoft_graph_service.create_calendar_event(
                user=test_salesperson_user,
                db=db,
                title="Reunião de teste",
                start_dt=datetime.utcnow(),
                attendee_emails=["interno@healthsafetytech.com"],
                body_html='<p><a href="https://crm/entrar/abc123">https://crm/entrar/abc123</a></p>',
                is_online_meeting=False,
            )

        corpo = str(capturado.get("body", {}))
        assert "entrar/abc123" in corpo

    def test_nao_pede_sala_do_teams_quando_e_daily(
        self, db, test_salesperson_user, captura_payload
    ):
        """Reunião do Daily não deve gerar link do Teams junto."""
        capturado, fake_post = captura_payload

        with patch("httpx.Client.post", fake_post):
            microsoft_graph_service.create_calendar_event(
                user=test_salesperson_user,
                db=db,
                title="Reunião Daily",
                start_dt=datetime.utcnow(),
                body_html="<p>link</p>",
                is_online_meeting=False,
            )

        assert capturado.get("isOnlineMeeting") is False
        assert "onlineMeetingProvider" not in capturado

    def test_fluxo_teams_continua_pedindo_sala(
        self, db, test_salesperson_user, captura_payload
    ):
        """O caminho do Teams não muda: continua criando reunião online."""
        capturado, fake_post = captura_payload

        with patch("httpx.Client.post", fake_post):
            microsoft_graph_service.create_calendar_event(
                user=test_salesperson_user,
                db=db,
                title="Reunião Teams",
                start_dt=datetime.utcnow(),
            )

        assert capturado.get("isOnlineMeeting") is True
        assert capturado.get("onlineMeetingProvider") == "teamsForBusiness"


class TestProtecaoDeEmailExterno:

    def test_dev_mode_bloqueia_email_externo(
        self, db, test_salesperson_user, captura_payload, monkeypatch
    ):
        """Em desenvolvimento, convite não sai para e-mail de cliente real."""
        monkeypatch.setattr(settings, "DAILY_DEV_MODE", True)
        capturado, fake_post = captura_payload

        with patch("httpx.Client.post", fake_post):
            microsoft_graph_service.create_calendar_event(
                user=test_salesperson_user,
                db=db,
                title="Reunião",
                start_dt=datetime.utcnow(),
                attendee_emails=[
                    "interno@healthsafetytech.com",
                    "cliente@empresa-externa.com",
                ],
            )

        enviados = [a["emailAddress"]["address"] for a in capturado.get("attendees", [])]
        assert "interno@healthsafetytech.com" in enviados
        assert "cliente@empresa-externa.com" not in enviados

    def test_fora_do_dev_mode_todos_recebem(
        self, db, test_salesperson_user, captura_payload, monkeypatch
    ):
        """Depois de homologado, o convite vai para o cliente normalmente."""
        monkeypatch.setattr(settings, "DAILY_DEV_MODE", False)
        capturado, fake_post = captura_payload

        with patch("httpx.Client.post", fake_post):
            microsoft_graph_service.create_calendar_event(
                user=test_salesperson_user,
                db=db,
                title="Reunião",
                start_dt=datetime.utcnow(),
                attendee_emails=[
                    "interno@healthsafetytech.com",
                    "cliente@empresa-externa.com",
                ],
            )

        enviados = [a["emailAddress"]["address"] for a in capturado.get("attendees", [])]
        assert "cliente@empresa-externa.com" in enviados

    def test_dev_mode_sem_nenhum_interno_nao_envia_para_ninguem(
        self, db, test_salesperson_user, captura_payload, monkeypatch
    ):
        """Se todos os convidados forem externos, o evento vai sem convidados."""
        monkeypatch.setattr(settings, "DAILY_DEV_MODE", True)
        capturado, fake_post = captura_payload

        with patch("httpx.Client.post", fake_post):
            microsoft_graph_service.create_calendar_event(
                user=test_salesperson_user,
                db=db,
                title="Reunião",
                start_dt=datetime.utcnow(),
                attendee_emails=["cliente@empresa-externa.com"],
            )

        assert not capturado.get("attendees")
