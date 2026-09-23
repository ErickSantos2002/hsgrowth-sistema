"""
Quem recebe o convite é quem o vendedor marcou.

Antes a lista era montada em silêncio (vendedor + os três e-mails do contato),
e a trava de ambiente removia os externos sem avisar ninguém — o vendedor
achava que tinha convidado o cliente.
"""
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.card_task import CardTask

CONVITE_OK = {
    "meeting_id": "m1",
    "join_url": "https://teams.microsoft.com/l/meetup-join/x",
    "event_id": "e1",
    "convidados_removidos": 0,
}


@pytest.fixture
def reuniao(db: Session, test_card, test_salesperson_user) -> CardTask:
    task = CardTask(
        card_id=test_card.id,
        title="Apresentação Phoebus - ACME",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_kind="apresentacao_phoebus",
        due_date=datetime(2026, 10, 1, 14, 0),
        duration_minutes=30,
        invited_emails=["cliente@acme.com", "socio@acme.com"],
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


class TestTeams:

    def test_convida_quem_foi_escolhido(self, client: TestClient, salesperson_headers, reuniao):
        criar = MagicMock(return_value=CONVITE_OK)

        with patch(
            "app.services.microsoft_graph_service.microsoft_graph_service.create_calendar_event",
            criar,
        ):
            r = client.post(
                f"/api/v1/card-tasks/{reuniao.id}/teams-meeting", headers=salesperson_headers
            )

        assert r.status_code in (200, 201)
        assert criar.call_args.kwargs["attendee_emails"] == [
            "cliente@acme.com", "socio@acme.com"
        ]

    def test_sem_lista_mantem_o_comportamento_antigo(
        self, client: TestClient, salesperson_headers, reuniao, db, test_card
    ):
        """Chamada pela API, ou reunião criada antes desta mudança."""
        from app.models.person import Person

        pessoa = Person(name="Maria", email="maria@acme.com")
        db.add(pessoa)
        db.commit()
        test_card.person_id = pessoa.id
        reuniao.invited_emails = None
        db.commit()
        criar = MagicMock(return_value=CONVITE_OK)

        with patch(
            "app.services.microsoft_graph_service.microsoft_graph_service.create_calendar_event",
            criar,
        ):
            client.post(
                f"/api/v1/card-tasks/{reuniao.id}/teams-meeting", headers=salesperson_headers
            )

        # o contato do negócio continua entrando sozinho
        assert criar.call_args.kwargs["attendee_emails"] == ["maria@acme.com"]


class TestAvisoDaTrava:

    def test_avisa_quando_a_trava_remove_convidados(
        self, client: TestClient, salesperson_headers, reuniao
    ):
        """
        Sem este aviso o vendedor acha que convidou o cliente e não convidou —
        foi o que o time relatou em 22/09.
        """
        criar = MagicMock(return_value={**CONVITE_OK, "convidados_removidos": 2})

        with patch(
            "app.services.microsoft_graph_service.microsoft_graph_service.create_calendar_event",
            criar,
        ):
            r = client.post(
                f"/api/v1/card-tasks/{reuniao.id}/teams-meeting", headers=salesperson_headers
            )

        assert r.json()["convidados_removidos"] == 2

    def test_sem_remocao_nao_avisa(self, client: TestClient, salesperson_headers, reuniao):
        criar = MagicMock(return_value=CONVITE_OK)

        with patch(
            "app.services.microsoft_graph_service.microsoft_graph_service.create_calendar_event",
            criar,
        ):
            r = client.post(
                f"/api/v1/card-tasks/{reuniao.id}/teams-meeting", headers=salesperson_headers
            )

        assert r.json()["convidados_removidos"] == 0


class TestQuantosForamRemovidos:

    def test_conta_os_externos_cortados(self, monkeypatch):
        """A trava existe para não disparar convite a cliente real em teste."""
        from app.services.microsoft_graph_service import microsoft_graph_service

        monkeypatch.setattr(settings, "DAILY_DEV_MODE", True)
        monkeypatch.setattr(settings, "DAILY_INTERNAL_EMAIL_DOMAIN", "healthsafetytech.com")

        restantes, removidos = microsoft_graph_service._filtrar_convidados(
            ["welton@healthsafetytech.com", "cliente@acme.com", "socio@acme.com"]
        )

        assert restantes == ["welton@healthsafetytech.com"]
        assert removidos == 2

    def test_sem_a_trava_ninguem_e_cortado(self, monkeypatch):
        from app.services.microsoft_graph_service import microsoft_graph_service

        monkeypatch.setattr(settings, "DAILY_DEV_MODE", False)

        restantes, removidos = microsoft_graph_service._filtrar_convidados(
            ["welton@healthsafetytech.com", "cliente@acme.com"]
        )

        assert len(restantes) == 2
        assert removidos == 0

    def test_lista_vazia_nao_quebra(self, monkeypatch):
        from app.services.microsoft_graph_service import microsoft_graph_service

        monkeypatch.setattr(settings, "DAILY_DEV_MODE", True)

        assert microsoft_graph_service._filtrar_convidados(None) == ([], 0)
