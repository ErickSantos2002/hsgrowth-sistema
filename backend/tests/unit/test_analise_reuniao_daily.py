"""
Botão "Analisar Reunião" nas reuniões do CRM.

A transcrição de uma reunião do CRM está no Daily, não no Microsoft Teams. O
botão ia ao Microsoft Graph em qualquer caso e falhava com "Graph API access
to transcripts is disabled for this tenant", mesmo com a transcrição pronta no
Daily (homologação de 15/09).
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card_task import CardTask

VTT = (
    "WEBVTT\n\n"
    "transcript:0\n"
    "00:00:01.000 --> 00:00:03.000\n"
    "<v>Cliente:</v>O contrato atual vence em outubro.\n"
)


@pytest.fixture
def reuniao_do_crm(db: Session, test_card, test_salesperson_user) -> CardTask:
    t = CardTask(
        card_id=test_card.id,
        title="Reunião no CRM",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_provider="daily",
        daily_room_name="hsg-999",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@pytest.fixture
def reuniao_do_teams(db: Session, test_card, test_salesperson_user) -> CardTask:
    t = CardTask(
        card_id=test_card.id,
        title="Reunião no Teams",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        teams_meeting_id="id-do-teams",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


class TestAnaliseDeReuniaoDoCRM:

    def test_busca_no_daily_e_analisa(
        self, client: TestClient, salesperson_headers, reuniao_do_crm, db, monkeypatch
    ):
        monkeypatch.setattr(
            "app.services.daily_service.DailyService.transcricao_da_sala",
            lambda self, sala: "t-1",
        )
        monkeypatch.setattr(
            "app.services.daily_service.DailyService.link_download_transcricao",
            lambda self, tid: "https://daily/t.vtt",
        )
        resposta = MagicMock(status_code=200, text=VTT)

        with patch("httpx.get", return_value=resposta), \
             patch("app.services.transcript_analysis_service.transcript_analysis_service.analyze",
                   return_value={"resumo": "Objeção de prazo"}):
            r = client.post(
                f"/api/v1/card-tasks/{reuniao_do_crm.id}/fetch-transcript",
                headers=salesperson_headers,
            )

        assert r.status_code == 200
        db.refresh(reuniao_do_crm)
        assert "outubro" in reuniao_do_crm.transcript_raw
        assert "Objeção de prazo" in reuniao_do_crm.transcript_analysis
        assert reuniao_do_crm.transcript_status == "ready"

    def test_nao_toca_no_microsoft_graph(
        self, client: TestClient, salesperson_headers, reuniao_do_crm, monkeypatch
    ):
        """O tenant pode ter o acesso a transcrições desabilitado — e não importa aqui."""
        def nao_deveria_chamar(*a, **kw):
            raise AssertionError("foi ao Microsoft Graph numa reunião do CRM")

        monkeypatch.setattr(
            "app.services.microsoft_graph_service.microsoft_graph_service.get_meeting_transcripts",
            nao_deveria_chamar,
        )
        monkeypatch.setattr(
            "app.services.daily_service.DailyService.transcricao_da_sala",
            lambda self, sala: "t-1",
        )
        monkeypatch.setattr(
            "app.services.daily_service.DailyService.link_download_transcricao",
            lambda self, tid: "https://daily/t.vtt",
        )

        with patch("httpx.get", return_value=MagicMock(status_code=200, text=VTT)), \
             patch("app.services.transcript_analysis_service.transcript_analysis_service.analyze",
                   return_value={"resumo": "ok"}):
            r = client.post(
                f"/api/v1/card-tasks/{reuniao_do_crm.id}/fetch-transcript",
                headers=salesperson_headers,
            )

        assert r.status_code == 200

    def test_sem_transcricao_ainda_avisa(
        self, client: TestClient, salesperson_headers, reuniao_do_crm, monkeypatch
    ):
        monkeypatch.setattr(
            "app.services.daily_service.DailyService.transcricao_da_sala",
            lambda self, sala: None,
        )

        r = client.post(
            f"/api/v1/card-tasks/{reuniao_do_crm.id}/fetch-transcript",
            headers=salesperson_headers,
        )

        assert r.status_code == 404
        assert "transcrição" in r.json()["detail"].lower()

    def test_transcricao_fica_salva_mesmo_se_a_analise_falhar(
        self, client: TestClient, salesperson_headers, reuniao_do_crm, db, monkeypatch
    ):
        """Modelo fora do ar não pode custar a transcrição — dá para reanalisar depois."""
        monkeypatch.setattr(
            "app.services.daily_service.DailyService.transcricao_da_sala",
            lambda self, sala: "t-1",
        )
        monkeypatch.setattr(
            "app.services.daily_service.DailyService.link_download_transcricao",
            lambda self, tid: "https://daily/t.vtt",
        )

        with patch("httpx.get", return_value=MagicMock(status_code=200, text=VTT)), \
             patch("app.services.transcript_analysis_service.transcript_analysis_service.analyze",
                   side_effect=ValueError("OpenAI indisponível")):
            r = client.post(
                f"/api/v1/card-tasks/{reuniao_do_crm.id}/fetch-transcript",
                headers=salesperson_headers,
            )

        assert r.status_code == 422
        db.refresh(reuniao_do_crm)
        assert reuniao_do_crm.transcript_raw
        assert not reuniao_do_crm.transcript_analysis


class TestReuniaoDoTeamsSegueIgual:

    def test_continua_indo_ao_graph(
        self, client: TestClient, salesperson_headers, reuniao_do_teams, monkeypatch
    ):
        """O fluxo do Teams não muda: quem decide é o provedor da reunião."""
        chamou = {}

        def fake_transcripts(user, db, meeting_id):
            chamou["meeting_id"] = meeting_id
            return []

        monkeypatch.setattr(
            "app.services.microsoft_graph_service.microsoft_graph_service.get_meeting_transcripts",
            fake_transcripts,
        )

        r = client.post(
            f"/api/v1/card-tasks/{reuniao_do_teams.id}/fetch-transcript",
            headers=salesperson_headers,
        )

        assert chamou["meeting_id"] == "id-do-teams"
        assert r.status_code == 404  # sem transcrição disponível no Teams
