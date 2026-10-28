"""
Agendamento de reunião por integração (MarketingHS): vendedores, livre/ocupado
e sala do Daily com o convite na agenda do vendedor.

O Graph é simulado em todos os testes — nenhuma chamada real.
"""
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session, joinedload

from app.core.security import create_access_token, hash_password
from app.models.card_task import CardTask
from app.models.user import User
from app.services.integration_agenda_service import IntegrationAgendaService

GRAPH = "app.services.microsoft_graph_service.microsoft_graph_service"


@pytest.fixture
def usuario_integracao(db: Session, test_roles) -> User:
    user = User(
        name="integracao2", email="integracao2@test.com", password_hash=hash_password("x"),
        role_id=test_roles["manager"].id, is_active=True, is_deleted=False, is_integracao=True,
    )
    db.add(user)
    db.commit()
    return db.query(User).options(joinedload(User.role)).filter(User.id == user.id).first()


@pytest.fixture
def integracao_headers(usuario_integracao) -> dict:
    token = create_access_token(data={"sub": str(usuario_integracao.id)})
    return {"Authorization": f"Bearer {token}"}


# ==================== SERVICE (sem TestClient) ====================


class TestServiceVendedores:

    def test_so_salesperson_com_flag_de_ativo(
        self, db, test_salesperson_user, test_manager_user, test_roles
    ):
        inativo = User(
            name="Ana Inativa", email="ana@test.com", password_hash="x",
            role_id=test_roles["salesperson"].id, is_active=False,
        )
        excluido = User(
            name="Bia Excluída", email="bia@test.com", password_hash="x",
            role_id=test_roles["salesperson"].id, is_active=True, is_deleted=True,
        )
        db.add_all([inativo, excluido])
        db.commit()

        vendedores = IntegrationAgendaService(db).listar_vendedores()

        assert vendedores == [
            {"id": inativo.id, "nome": "Ana Inativa", "email": "ana@test.com", "ativo": False},
            {"id": test_salesperson_user.id, "nome": "Salesperson User",
             "email": "sales@test.com", "ativo": True},
        ]


class TestServiceLivreOcupado:

    def test_um_vendedor_que_falha_nao_derruba_os_outros(
        self, db, test_salesperson_user, test_manager_user
    ):
        bloco = {"inicio": datetime(2026, 10, 29, 13, tzinfo=timezone.utc),
                 "fim": datetime(2026, 10, 29, 14, tzinfo=timezone.utc), "status": "busy"}

        def _ocupado(email, inicio, fim):
            if email == "manager@test.com":
                raise ValueError("Access is denied.")
            return [bloco]

        with patch(f"{GRAPH}._get_app_token"), \
             patch(f"{GRAPH}.get_ocupado_como_aplicativo", side_effect=_ocupado):
            resultado = IntegrationAgendaService(db).livre_ocupado(
                [test_salesperson_user.id, test_manager_user.id, 99999, test_salesperson_user.id],
                datetime(2026, 10, 29, tzinfo=timezone.utc),
                datetime(2026, 10, 30, tzinfo=timezone.utc),
            )

        assert resultado["vendedores"] == [
            {"user_id": test_salesperson_user.id, "email": "sales@test.com", "ocupado": [bloco]}
        ]
        assert resultado["erros"] == [
            {"user_id": test_manager_user.id, "motivo": "Access is denied."},
            {"user_id": 99999, "motivo": "usuário não encontrado ou inativo"},
        ]

    def test_sem_token_do_aplicativo_falha_inteiro(self, db, test_salesperson_user):
        with patch(f"{GRAPH}._get_app_token", side_effect=ValueError("sem credencial")):
            with pytest.raises(ValueError, match="sem credencial"):
                IntegrationAgendaService(db).livre_ocupado(
                    [test_salesperson_user.id],
                    datetime(2026, 10, 29, tzinfo=timezone.utc),
                    datetime(2026, 10, 30, tzinfo=timezone.utc),
                )


# ==================== ROTAS (TestClient — lentos) ====================


class TestRotasDeIntegracao:

    def test_vendedores_e_agenda_exigem_usuario_de_integracao(self, client, salesperson_headers):
        r1 = client.get("/api/v1/integration/vendedores", headers=salesperson_headers)
        r2 = client.get(
            "/api/v1/integration/agenda",
            params={"user_ids": "1", "inicio": "2026-10-29T00:00:00Z", "fim": "2026-10-30T00:00:00Z"},
            headers=salesperson_headers,
        )
        assert r1.status_code == 403
        assert r2.status_code == 403

    def test_agenda_valida_e_responde_em_utc(
        self, client, integracao_headers, test_salesperson_user
    ):
        url = "/api/v1/integration/agenda"
        uid = str(test_salesperson_user.id)

        sem_fuso = client.get(url, headers=integracao_headers, params={
            "user_ids": uid, "inicio": "2026-10-29T00:00:00", "fim": "2026-10-30T00:00:00"})
        longo = client.get(url, headers=integracao_headers, params={
            "user_ids": uid, "inicio": "2026-10-01T00:00:00Z", "fim": "2026-10-17T00:00:00Z"})
        ids_ruins = client.get(url, headers=integracao_headers, params={
            "user_ids": "a,b", "inicio": "2026-10-29T00:00:00Z", "fim": "2026-10-30T00:00:00Z"})
        assert (sem_fuso.status_code, longo.status_code, ids_ruins.status_code) == (422, 422, 422)

        bloco = {"inicio": datetime(2026, 10, 29, 13, tzinfo=timezone.utc),
                 "fim": datetime(2026, 10, 29, 14, tzinfo=timezone.utc), "status": "tentative"}
        with patch(f"{GRAPH}._get_app_token"), \
             patch(f"{GRAPH}.get_ocupado_como_aplicativo", return_value=[bloco]):
            ok = client.get(url, headers=integracao_headers, params={
                "user_ids": uid, "inicio": "2026-10-29T00:00:00Z", "fim": "2026-10-30T00:00:00Z"})

        assert ok.status_code == 200
        assert ok.json() == {
            "vendedores": [{
                "user_id": test_salesperson_user.id, "email": "sales@test.com",
                "ocupado": [{"inicio": "2026-10-29T13:00:00Z", "fim": "2026-10-29T14:00:00Z",
                             "status": "tentative"}],
            }],
            "erros": [],
        }


@pytest.fixture
def tarefa_do_lead(db: Session, test_card, test_salesperson_user) -> CardTask:
    task = CardTask(
        card_id=test_card.id, title="Apresentação Phoebus", task_type="meeting",
        assigned_to_id=test_salesperson_user.id, duration_minutes=45,
        due_date=datetime(2026, 10, 29, 13, 0), invited_emails=["lead@gmail.com"],
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def _grava_sala(db):
    def _grava(task):
        task.daily_room_name = f"hsg-{task.id}"
        task.daily_room_url = "https://healthsafety.daily.co/hsg-1"
        task.meeting_provider = "daily"
        task.public_access_token = "token-opaco-de-teste-1234567890abcd"
        db.commit()
        return {"name": task.daily_room_name, "url": task.daily_room_url}
    return _grava


class TestSalaPorIntegracao:

    def test_convite_nasce_na_agenda_do_vendedor(
        self, client, integracao_headers, tarefa_do_lead, db
    ):
        with patch("app.services.daily_service.DailyService.create_room",
                   side_effect=_grava_sala(db)), \
             patch(f"{GRAPH}.create_calendar_event_como_aplicativo",
                   return_value={"event_id": "evt-9", "convidados_removidos": 0}) as criar, \
             patch(f"{GRAPH}.create_calendar_event") as delegado:
            response = client.post(
                f"/api/v1/card-tasks/{tarefa_do_lead.id}/daily-room", headers=integracao_headers
            )

        assert response.status_code == 200
        delegado.assert_not_called()
        kwargs = criar.call_args.kwargs
        assert kwargs["organizador_email"] == "sales@test.com"
        assert kwargs["start_dt"] == datetime(2026, 10, 29, 13, 0)
        assert kwargs["end_dt"] == datetime(2026, 10, 29, 13, 45)
        assert kwargs["attendee_emails"] == ["lead@gmail.com"]
        assert response.json()["public_link"] in kwargs["body_html"]
        # Assinado pelo vendedor, não pelo usuário de integração
        assert "Salesperson User" in kwargs["body_html"]
        assert "integracao2" not in kwargs["body_html"]

        db.refresh(tarefa_do_lead)
        assert tarefa_do_lead.teams_event_id == "evt-9"

    def test_recusa_da_microsoft_desfaz_a_sala_e_responde_503(
        self, client, integracao_headers, tarefa_do_lead, db
    ):
        with patch("app.services.daily_service.DailyService.create_room",
                   side_effect=_grava_sala(db)), \
             patch("app.services.daily_service.DailyService.delete_room") as apagar, \
             patch(f"{GRAPH}.create_calendar_event_como_aplicativo",
                   side_effect=ValueError("Access is denied.")):
            response = client.post(
                f"/api/v1/card-tasks/{tarefa_do_lead.id}/daily-room", headers=integracao_headers
            )

        assert response.status_code == 503
        assert "Access is denied" in response.json()["detail"]
        apagar.assert_called_once()
        db.refresh(tarefa_do_lead)
        assert tarefa_do_lead.daily_room_name is None
        assert tarefa_do_lead.public_access_token is None

    def test_sem_responsavel_responde_422_sem_criar_sala(
        self, client, integracao_headers, tarefa_do_lead, db
    ):
        tarefa_do_lead.assigned_to_id = None
        db.commit()

        with patch("app.services.daily_service.DailyService.create_room") as criar_sala:
            response = client.post(
                f"/api/v1/card-tasks/{tarefa_do_lead.id}/daily-room", headers=integracao_headers
            )

        assert response.status_code == 422
        assert "assigned_to_id" in response.json()["detail"]
        criar_sala.assert_not_called()
