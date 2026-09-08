"""
Endpoints públicos do convidado (sem JWT) — a superfície mais exposta.

Regra de ouro: nunca devolver chave de API, token de anfitrião, URL da sala
antes da identificação, nem qualquer dado interno do CRM.
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card_task import CardTask

TOKEN_VALIDO = "token-publico-de-teste-1234567890abcdef"


@pytest.fixture
def task_com_sala(db: Session, test_card, test_salesperson_user) -> CardTask:
    task = CardTask(
        card_id=test_card.id,
        title="Reunião de apresentação",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        duration_minutes=60,
        meeting_provider="daily",
        daily_room_name="hsg-teste",
        daily_room_url="https://healthsafety.daily.co/hsg-teste",
        public_access_token=TOKEN_VALIDO,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


class TestInfoPublica:

    def test_devolve_dados_seguros(self, client: TestClient, task_com_sala):
        """Sem login, o convidado vê o básico para se situar."""
        response = client.get(f"/api/v1/public/meeting/{TOKEN_VALIDO}")

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Reunião de apresentação"
        assert "already_started" in data
        assert "already_ended" in data

    def test_nao_vaza_segredo(self, client: TestClient, task_com_sala):
        """A resposta pública não pode conter a sala nem nada interno."""
        response = client.get(f"/api/v1/public/meeting/{TOKEN_VALIDO}")
        corpo = response.text.lower()

        assert "daily.co" not in corpo          # URL da sala
        assert "hsg-teste" not in corpo         # nome da sala
        assert "api_key" not in corpo
        assert "card_id" not in corpo
        assert "assigned_to" not in corpo
        assert TOKEN_VALIDO not in corpo        # nem devolve o próprio token

    def test_token_invalido_da_404(self, client: TestClient, task_com_sala):
        """Token inexistente não revela nada."""
        response = client.get("/api/v1/public/meeting/token-que-nao-existe")
        assert response.status_code == 404

    def test_reuniao_teams_nao_e_acessivel_pelo_link_publico(
        self, client: TestClient, db: Session, test_card, test_salesperson_user
    ):
        """Só reunião do Daily tem link público — Teams não entra por aqui."""
        task = CardTask(
            card_id=test_card.id,
            title="Reunião Teams",
            task_type="meeting",
            assigned_to_id=test_salesperson_user.id,
            meeting_provider="teams",
            public_access_token="token-de-uma-reuniao-teams-123456",
        )
        db.add(task)
        db.commit()

        response = client.get("/api/v1/public/meeting/token-de-uma-reuniao-teams-123456")
        assert response.status_code == 404


class TestEntrada:

    def test_entrar_devolve_acesso_a_sala(self, client: TestClient, task_com_sala):
        """Com nome, empresa e e-mail, o convidado recebe o acesso."""
        with patch(
            "app.services.daily_service.DailyService.create_guest_token", return_value="tok-guest"
        ):
            response = client.post(
                f"/api/v1/public/meeting/{TOKEN_VALIDO}/join",
                json={"name": "Fulano", "company": "ACME", "email": "fulano@acme.com"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["token"] == "tok-guest"
        assert data["room_url"] == "https://healthsafety.daily.co/hsg-teste"

    def test_marca_horario_de_entrada(self, client: TestClient, task_com_sala, db):
        """A entrada do convidado fica registrada."""
        with patch("app.services.daily_service.DailyService.create_guest_token", return_value="t"):
            client.post(
                f"/api/v1/public/meeting/{TOKEN_VALIDO}/join",
                json={"name": "Fulano", "company": "ACME", "email": "fulano@acme.com"},
            )

        db.refresh(task_com_sala)
        assert task_com_sala.contact_joined_at is not None

    def test_nome_e_obrigatorio(self, client: TestClient, task_com_sala):
        """Sem nome não entra — é o que identifica quem está na gravação."""
        response = client.post(
            f"/api/v1/public/meeting/{TOKEN_VALIDO}/join",
            json={"name": "   ", "company": "ACME", "email": "f@acme.com"},
        )
        assert response.status_code == 422

    def test_empresa_e_email_sao_opcionais(self, client: TestClient, task_com_sala):
        """Não travar a entrada do cliente por causa de campo secundário."""
        with patch("app.services.daily_service.DailyService.create_guest_token", return_value="t"):
            response = client.post(
                f"/api/v1/public/meeting/{TOKEN_VALIDO}/join",
                json={"name": "Fulano"},
            )
        assert response.status_code == 200

    def test_token_invalido_nao_entra(self, client: TestClient):
        response = client.post(
            "/api/v1/public/meeting/nao-existe/join",
            json={"name": "Fulano", "company": "ACME", "email": "f@acme.com"},
        )
        assert response.status_code == 404

    def test_reuniao_encerrada_nao_aceita_entrada(
        self, client: TestClient, task_com_sala, db
    ):
        """Depois de encerrada, o link para de funcionar."""
        from datetime import datetime
        task_com_sala.meeting_ended_at = datetime.utcnow()
        db.commit()

        response = client.post(
            f"/api/v1/public/meeting/{TOKEN_VALIDO}/join",
            json={"name": "Fulano", "company": "ACME", "email": "f@acme.com"},
        )
        assert response.status_code == 410

    def test_nome_gigante_e_recusado(self, client: TestClient, task_com_sala):
        """Entrada pública não aceita payload abusivo."""
        response = client.post(
            f"/api/v1/public/meeting/{TOKEN_VALIDO}/join",
            json={"name": "A" * 5000, "company": "ACME", "email": "f@acme.com"},
        )
        assert response.status_code == 422
