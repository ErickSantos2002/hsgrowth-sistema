"""
Chamadas ao Graph com token de aplicativo (agendamento por integração).

O httpx e o MSAL são simulados — nenhuma chamada real à Microsoft.
"""
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.services.microsoft_graph_service import MicrosoftGraphService

INICIO = datetime(2026, 10, 29, 0, 0, tzinfo=timezone.utc)
FIM = datetime(2026, 10, 30, 0, 0, tzinfo=timezone.utc)


def _resposta(status_code: int, corpo: dict) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = corpo
    return resp


@pytest.fixture
def servico():
    s = MicrosoftGraphService()
    s._get_app_token = MagicMock(return_value="token-app")
    return s


@pytest.fixture
def http():
    with patch("app.services.microsoft_graph_service.httpx.Client") as cls:
        cliente = cls.return_value.__enter__.return_value
        yield cliente


class TestOcupado:

    def test_devolve_so_nao_livres_em_utc_sem_assunto(self, servico, http):
        http.post.return_value = _resposta(200, {"value": [{
            "scheduleId": "v@hs.com",
            "scheduleItems": [
                {"status": "busy", "subject": "Segredo", "location": "Sala",
                 "start": {"dateTime": "2026-10-29T13:00:00.0000000"},
                 "end": {"dateTime": "2026-10-29T14:00:00.0000000"}},
                {"status": "free",
                 "start": {"dateTime": "2026-10-29T15:00:00.0000000"},
                 "end": {"dateTime": "2026-10-29T16:00:00.0000000"}},
                {"status": "oof",
                 "start": {"dateTime": "2026-10-29T17:00:00.0000000"},
                 "end": {"dateTime": "2026-10-29T18:00:00.0000000"}},
            ],
        }]})

        ocupado = servico.get_ocupado_como_aplicativo("v@hs.com", INICIO, FIM)

        assert ocupado == [
            {"inicio": datetime(2026, 10, 29, 13, tzinfo=timezone.utc),
             "fim": datetime(2026, 10, 29, 14, tzinfo=timezone.utc), "status": "busy"},
            {"inicio": datetime(2026, 10, 29, 17, tzinfo=timezone.utc),
             "fim": datetime(2026, 10, 29, 18, tzinfo=timezone.utc), "status": "oof"},
        ]
        url = http.post.call_args.args[0]
        kwargs = http.post.call_args.kwargs
        assert url.endswith("/users/v@hs.com/calendar/getSchedule")
        assert kwargs["json"]["schedules"] == ["v@hs.com"]
        assert kwargs["headers"]["Authorization"] == "Bearer token-app"
        assert kwargs["headers"]["Prefer"] == 'outlook.timezone="UTC"'

    def test_entrada_em_outro_fuso_vai_em_utc(self, servico, http):
        from datetime import timedelta
        http.post.return_value = _resposta(200, {"value": []})
        brt = timezone(timedelta(hours=-3))

        servico.get_ocupado_como_aplicativo("v@hs.com", datetime(2026, 10, 29, 9, tzinfo=brt), FIM)

        assert http.post.call_args.kwargs["json"]["startTime"] == {
            "dateTime": "2026-10-29T12:00:00", "timeZone": "UTC"
        }

    def test_fora_do_escopo_levanta_com_mensagem_do_graph(self, servico, http):
        http.post.return_value = _resposta(403, {"error": {"message": "Access is denied."}})

        with pytest.raises(ValueError, match="Access is denied"):
            servico.get_ocupado_como_aplicativo("v@hs.com", INICIO, FIM)

    def test_erro_por_caixa_levanta(self, servico, http):
        http.post.return_value = _resposta(200, {"value": [{
            "scheduleId": "v@hs.com", "error": {"message": "mailbox not found"},
        }]})

        with pytest.raises(ValueError, match="mailbox not found"):
            servico.get_ocupado_como_aplicativo("v@hs.com", INICIO, FIM)


class TestEventoNaAgendaDoVendedor:

    def test_cria_na_agenda_do_organizador_com_fim_explicito(self, servico, http):
        http.post.return_value = _resposta(201, {"id": "evt-1"})

        with patch("app.services.microsoft_graph_service.settings.DAILY_DEV_MODE", False):
            resultado = servico.create_calendar_event_como_aplicativo(
                organizador_email="vendedor@hs.com",
                title="Apresentação",
                start_dt=datetime(2026, 10, 29, 13, 0),
                end_dt=datetime(2026, 10, 29, 13, 45),
                attendee_emails=["lead@gmail.com"],
                body_html="<p>link</p>",
            )

        assert resultado == {"event_id": "evt-1", "convidados_removidos": 0}
        url = http.post.call_args.args[0]
        payload = http.post.call_args.kwargs["json"]
        assert url.endswith("/users/vendedor@hs.com/events")
        assert payload["end"] == {"dateTime": "2026-10-29T13:45:00", "timeZone": "UTC"}
        assert payload["isOnlineMeeting"] is False
        assert payload["attendees"] == [
            {"emailAddress": {"address": "lead@gmail.com"}, "type": "required"}
        ]
        assert payload["body"]["content"] == "<p>link</p>"

    def test_trava_de_ambiente_vale_igual(self, servico, http):
        http.post.return_value = _resposta(201, {"id": "evt-2"})

        with patch("app.services.microsoft_graph_service.settings.DAILY_DEV_MODE", True), \
             patch("app.services.microsoft_graph_service.settings.DAILY_INTERNAL_EMAIL_DOMAIN", "hs.com"):
            resultado = servico.create_calendar_event_como_aplicativo(
                organizador_email="vendedor@hs.com", title="X",
                start_dt=INICIO, end_dt=FIM, attendee_emails=["lead@gmail.com"],
            )

        assert resultado["convidados_removidos"] == 1
        assert "attendees" not in http.post.call_args.kwargs["json"]

    def test_recusa_do_graph_levanta(self, servico, http):
        http.post.return_value = _resposta(403, {"error": {"message": "Access is denied."}})

        with pytest.raises(ValueError, match="Access is denied"):
            servico.create_calendar_event_como_aplicativo(
                organizador_email="vendedor@hs.com", title="X", start_dt=INICIO, end_dt=FIM,
            )


class TestTokenDoAplicativo:

    def test_reaproveita_ate_expirar(self):
        servico = MicrosoftGraphService()
        msal_app = MagicMock()
        msal_app.acquire_token_for_client.return_value = {"access_token": "t", "expires_in": 3600}

        with patch("app.services.microsoft_graph_service.settings.MS_CLIENT_ID", "id"), \
             patch("app.services.microsoft_graph_service.settings.MS_CLIENT_SECRET", "s"), \
             patch("app.services.microsoft_graph_service.settings.MS_TENANT_ID", "t"), \
             patch("app.services.microsoft_graph_service.microsoft_auth_service._get_msal_app",
                   return_value=msal_app):
            assert servico._get_app_token() == "t"
            assert servico._get_app_token() == "t"

        msal_app.acquire_token_for_client.assert_called_once_with(
            scopes=["https://graph.microsoft.com/.default"]
        )

    def test_recusa_da_microsoft_vira_value_error(self):
        servico = MicrosoftGraphService()
        msal_app = MagicMock()
        msal_app.acquire_token_for_client.return_value = {
            "error": "invalid_client", "error_description": "segredo expirado"
        }

        with patch("app.services.microsoft_graph_service.settings.MS_CLIENT_ID", "id"), \
             patch("app.services.microsoft_graph_service.settings.MS_CLIENT_SECRET", "s"), \
             patch("app.services.microsoft_graph_service.settings.MS_TENANT_ID", "t"), \
             patch("app.services.microsoft_graph_service.microsoft_auth_service._get_msal_app",
                   return_value=msal_app):
            with pytest.raises(ValueError, match="segredo expirado"):
                servico._get_app_token()
