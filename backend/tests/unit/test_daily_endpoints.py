"""
Endpoints autenticados da reunião por vídeo (Daily).

A API do Daily é simulada em todos os testes — nenhuma chamada real.
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card_task import CardTask


@pytest.fixture
def task_reuniao(db: Session, test_card, test_salesperson_user) -> CardTask:
    task = CardTask(
        card_id=test_card.id,
        title="Reunião com cliente",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        duration_minutes=60,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@pytest.fixture
def task_com_sala(db: Session, task_reuniao) -> CardTask:
    task_reuniao.daily_room_name = "hsg-teste"
    task_reuniao.daily_room_url = "https://healthsafety.daily.co/hsg-teste"
    task_reuniao.meeting_provider = "daily"
    task_reuniao.public_access_token = "token-publico-de-teste-1234567890abcd"
    db.commit()
    db.refresh(task_reuniao)
    return task_reuniao


class TestCriarSala:

    def test_cria_sala_e_devolve_link_do_cliente(
        self, client: TestClient, salesperson_headers, task_reuniao, db
    ):
        """Criar a sala devolve a URL da sala e o link público do convidado."""

        def _grava_como_o_servico_faria(task):
            """O create_room real grava na tarefa; o mock precisa fazer o mesmo."""
            task.daily_room_name = f"hsg-{task.id}"
            task.daily_room_url = "https://healthsafety.daily.co/hsg-1"
            task.meeting_provider = "daily"
            task.public_access_token = "token-opaco-de-teste-1234567890abcd"
            db.commit()
            return {"name": task.daily_room_name, "url": task.daily_room_url}

        with patch(
            "app.services.daily_service.DailyService.create_room",
            side_effect=_grava_como_o_servico_faria,
        ), patch("app.api.v1.endpoints.card_tasks._agendar_evento_daily_no_outlook"):
            response = client.post(
                f"/api/v1/card-tasks/{task_reuniao.id}/daily-room",
                headers=salesperson_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["room_url"] == "https://healthsafety.daily.co/hsg-1"
        assert "/entrar/" in data["public_link"]
        assert data["public_access_token"] in data["public_link"]

    def test_sem_conta_microsoft_bloqueia_e_desfaz(
        self, client: TestClient, salesperson_headers, task_reuniao, db
    ):
        """
        Sem Microsoft conectado a criação é bloqueada — e a sala já criada é
        desfeita, para não deixar reunião pela metade.
        """

        def _grava(task):
            task.daily_room_name = f"hsg-{task.id}"
            task.daily_room_url = "https://x/h"
            task.meeting_provider = "daily"
            task.public_access_token = "tok-abc-1234567890abcdefghij"
            db.commit()
            return {"name": task.daily_room_name, "url": task.daily_room_url}

        with patch(
            "app.services.daily_service.DailyService.create_room", side_effect=_grava
        ), patch("app.services.daily_service.DailyService.delete_room"), patch(
            "app.api.v1.endpoints.card_tasks._agendar_evento_daily_no_outlook",
            side_effect=ValueError("sem token MS"),
        ):
            response = client.post(
                f"/api/v1/card-tasks/{task_reuniao.id}/daily-room",
                headers=salesperson_headers,
            )

        assert response.status_code == 400
        assert "microsoft" in response.json()["detail"].lower()

        db.refresh(task_reuniao)
        assert task_reuniao.daily_room_name is None
        assert task_reuniao.public_access_token is None

    def test_daily_indisponivel_sugere_teams(
        self, client: TestClient, salesperson_headers, task_reuniao
    ):
        """Se o Daily falhar, a mensagem sugere criar pelo Teams."""
        with patch(
            "app.services.daily_service.DailyService.create_room",
            side_effect=ValueError("Daily retornou erro 500"),
        ):
            response = client.post(
                f"/api/v1/card-tasks/{task_reuniao.id}/daily-room",
                headers=salesperson_headers,
            )

        assert response.status_code == 503
        assert "teams" in response.json()["detail"].lower()

    def test_tarefa_inexistente(self, client: TestClient, salesperson_headers):
        response = client.post("/api/v1/card-tasks/99999999/daily-room", headers=salesperson_headers)
        assert response.status_code == 404

    def test_exige_autenticacao(self, client: TestClient, task_reuniao):
        response = client.post(f"/api/v1/card-tasks/{task_reuniao.id}/daily-room")
        assert response.status_code in (401, 403)


class TestTokenDeAnfitriao:

    def test_devolve_token_e_marca_inicio(
        self, client: TestClient, salesperson_headers, task_com_sala, db
    ):
        """O vendedor recebe token de anfitrião e o início da reunião fica registrado."""
        with patch(
            "app.services.daily_service.DailyService.create_host_token", return_value="tok-host"
        ):
            response = client.post(
                f"/api/v1/card-tasks/{task_com_sala.id}/daily-host-token",
                headers=salesperson_headers,
            )

        assert response.status_code == 200
        assert response.json()["token"] == "tok-host"
        assert response.json()["room_url"] == task_com_sala.daily_room_url

        db.refresh(task_com_sala)
        assert task_com_sala.meeting_started_at is not None

    def test_sem_sala_criada_da_erro_claro(
        self, client: TestClient, salesperson_headers, task_reuniao
    ):
        """Pedir token de tarefa sem sala devolve 400, não 500."""
        response = client.post(
            f"/api/v1/card-tasks/{task_reuniao.id}/daily-host-token",
            headers=salesperson_headers,
        )
        assert response.status_code == 400

    def test_exige_autenticacao(self, client: TestClient, task_com_sala):
        response = client.post(f"/api/v1/card-tasks/{task_com_sala.id}/daily-host-token")
        assert response.status_code in (401, 403)


class TestCancelarSala:

    def test_limpa_os_dados_da_reuniao(
        self, client: TestClient, salesperson_headers, task_com_sala, db
    ):
        """Cancelar apaga a sala e limpa os campos, sem apagar a tarefa."""
        with patch("app.services.daily_service.DailyService.delete_room"):
            response = client.delete(
                f"/api/v1/card-tasks/{task_com_sala.id}/daily-room",
                headers=salesperson_headers,
            )

        assert response.status_code == 200

        db.refresh(task_com_sala)
        assert task_com_sala.daily_room_name is None
        assert task_com_sala.daily_room_url is None
        assert task_com_sala.public_access_token is None
        assert task_com_sala.meeting_provider is None
        # a tarefa em si continua existindo
        assert db.query(CardTask).filter(CardTask.id == task_com_sala.id).first() is not None


@pytest.fixture
def outro_vendedor(db: Session, test_roles):
    """Vendedor sem nenhum vínculo com o card do teste."""
    from app.models.user import User
    from app.core.security import hash_password
    from sqlalchemy.orm import joinedload

    u = User(
        name="Vendedor Sem Vinculo",
        email="outro.vendedor@test.com",
        password_hash=hash_password("x123"),
        role_id=test_roles["salesperson"].id,
        is_active=True,
        is_deleted=False,
    )
    db.add(u)
    db.commit()
    return db.query(User).options(joinedload(User.role)).filter(User.id == u.id).first()


@pytest.fixture
def headers_outro_vendedor(outro_vendedor) -> dict:
    from app.core.security import create_access_token
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(outro_vendedor.id)})}"}


class TestPermissaoDeAcesso:
    """
    Quem não tem vínculo com o negócio não pode criar, entrar nem cancelar a
    reunião. Sem isso, qualquer usuário logado entraria na call de outro
    vendedor com o cliente dele (IDOR).
    """

    def test_estranho_nao_pega_token_de_anfitriao(
        self, client: TestClient, headers_outro_vendedor, task_com_sala
    ):
        """O caso mais grave: entrar na reunião de outro vendedor com o cliente."""
        with patch("app.services.daily_service.DailyService.create_host_token", return_value="tok"):
            response = client.post(
                f"/api/v1/card-tasks/{task_com_sala.id}/daily-host-token",
                headers=headers_outro_vendedor,
            )

        assert response.status_code == 403

    def test_estranho_nao_cria_sala(
        self, client: TestClient, headers_outro_vendedor, task_reuniao
    ):
        """Criar sala em card alheio dispararia convite para contatos de terceiros."""
        response = client.post(
            f"/api/v1/card-tasks/{task_reuniao.id}/daily-room",
            headers=headers_outro_vendedor,
        )

        assert response.status_code == 403

    def test_estranho_nao_cancela_sala(
        self, client: TestClient, headers_outro_vendedor, task_com_sala, db
    ):
        with patch("app.services.daily_service.DailyService.delete_room"):
            response = client.delete(
                f"/api/v1/card-tasks/{task_com_sala.id}/daily-room",
                headers=headers_outro_vendedor,
            )

        assert response.status_code == 403
        db.refresh(task_com_sala)
        assert task_com_sala.daily_room_name == "hsg-teste"

    def test_gerente_tem_acesso(self, client: TestClient, manager_headers, task_com_sala):
        """Gerente e admin acessam qualquer reunião (RN-037)."""
        with patch("app.services.daily_service.DailyService.create_host_token", return_value="tok"):
            response = client.post(
                f"/api/v1/card-tasks/{task_com_sala.id}/daily-host-token",
                headers=manager_headers,
            )

        assert response.status_code == 200

    def test_sdr_do_card_tem_acesso(
        self, client: TestClient, sdr_headers, task_com_sala, db, test_sdr_user, test_card
    ):
        """O SDR vinculado ao negócio entra na reunião (RN-037)."""
        test_card.sdr_id = test_sdr_user.id
        db.commit()

        with patch("app.services.daily_service.DailyService.create_host_token", return_value="tok"):
            response = client.post(
                f"/api/v1/card-tasks/{task_com_sala.id}/daily-host-token",
                headers=sdr_headers,
            )

        assert response.status_code == 200


class TestCamposNaResposta:
    """
    A resposta da API precisa carregar os campos da reunião por vídeo — sem
    eles o frontend não sabe que a reunião é do CRM e não mostra o botão de
    entrar. O _build_response monta o schema campo a campo, então campo novo
    tem que ser adicionado lá explicitamente.
    """

    def test_lista_devolve_os_campos_da_reuniao(
        self, client: TestClient, salesperson_headers, task_com_sala, test_card
    ):
        response = client.get(
            f"/api/v1/card-tasks?card_id={test_card.id}&task_type=meeting",
            headers=salesperson_headers,
        )

        assert response.status_code == 200
        task = next(t for t in response.json()["tasks"] if t["id"] == task_com_sala.id)
        assert task["meeting_provider"] == "daily"
        assert task["public_access_token"] == task_com_sala.public_access_token
        assert task["daily_room_url"] == task_com_sala.daily_room_url

    def test_reuniao_teams_nao_ganha_campos_de_daily(
        self, client: TestClient, salesperson_headers, task_reuniao, test_card
    ):
        """Reunião comum continua com os campos vazios."""
        response = client.get(
            f"/api/v1/card-tasks?card_id={test_card.id}&task_type=meeting",
            headers=salesperson_headers,
        )

        task = next(t for t in response.json()["tasks"] if t["id"] == task_reuniao.id)
        assert task["meeting_provider"] is None
        assert task["public_access_token"] is None
