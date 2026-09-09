"""
Endpoints da gravação: assistir, baixar e gerar link para o cliente.

O bucket é privado — nada é acessível por URL direta. Todo acesso passa por
link temporário assinado, gerado só para quem tem permissão (RN-037).
"""
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card_task import CardTask


@pytest.fixture
def task_com_gravacao(db: Session, test_card, test_salesperson_user) -> CardTask:
    t = CardTask(
        card_id=test_card.id,
        title="Reunião gravada",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_provider="daily",
        recording_status="ready",
        recording_key="2026/09/reuniao-1.mp4",
        recording_ready_at=datetime.utcnow(),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


class TestAssistirEBaixar:

    def test_devolve_link_temporario(self, client: TestClient, salesperson_headers, task_com_gravacao):
        with patch("app.services.storage_service.storage_service.gerar_link_temporario",
                   return_value="https://r2/assinado"):
            response = client.get(
                f"/api/v1/card-tasks/{task_com_gravacao.id}/gravacao",
                headers=salesperson_headers,
            )

        assert response.status_code == 200
        assert response.json()["url"] == "https://r2/assinado"

    def test_estranho_nao_acessa(self, client: TestClient, manager_headers, task_com_gravacao, db, test_roles):
        """Gravação de reunião é conversa com cliente — não é para qualquer um."""
        from app.core.security import create_access_token, hash_password
        from app.models.user import User

        outro = User(
            name="Sem Vinculo", email="sem.vinculo@test.com",
            password_hash=hash_password("x"), role_id=test_roles["salesperson"].id,
            is_active=True, is_deleted=False,
        )
        db.add(outro)
        db.commit()
        headers = {"Authorization": f"Bearer {create_access_token(data={'sub': str(outro.id)})}"}

        response = client.get(
            f"/api/v1/card-tasks/{task_com_gravacao.id}/gravacao", headers=headers
        )

        assert response.status_code == 403

    def test_sem_gravacao_devolve_404(self, client: TestClient, salesperson_headers, db, test_card):
        t = CardTask(card_id=test_card.id, title="Sem gravação", task_type="meeting")
        db.add(t)
        db.commit()

        response = client.get(f"/api/v1/card-tasks/{t.id}/gravacao", headers=salesperson_headers)
        assert response.status_code == 404

    def test_gravacao_expirada_avisa(self, client: TestClient, salesperson_headers, task_com_gravacao, db):
        """Depois dos 12 meses o vídeo não existe mais — a mensagem precisa dizer isso."""
        task_com_gravacao.recording_status = "expired"
        task_com_gravacao.recording_key = None
        db.commit()

        response = client.get(
            f"/api/v1/card-tasks/{task_com_gravacao.id}/gravacao", headers=salesperson_headers
        )

        assert response.status_code == 410
        assert "expir" in response.json()["detail"].lower()


class TestLinkParaOCliente:

    def test_gera_link_de_30_dias_e_registra(
        self, client: TestClient, salesperson_headers, task_com_gravacao, db, test_salesperson_user
    ):
        with patch("app.services.storage_service.storage_service.gerar_link_temporario",
                   return_value="https://r2/para-cliente"):
            response = client.post(
                f"/api/v1/card-tasks/{task_com_gravacao.id}/gravacao/compartilhar",
                headers=salesperson_headers,
            )

        assert response.status_code == 200
        assert response.json()["url"] == "https://r2/para-cliente"

        # o registro é o que permite responder, um dia, como a gravação circulou
        from app.models.recording_share import RecordingShare
        registro = db.query(RecordingShare).filter(
            RecordingShare.card_task_id == task_com_gravacao.id
        ).first()
        assert registro is not None
        assert registro.created_by_id == test_salesperson_user.id
        assert registro.expires_at > datetime.utcnow() + timedelta(days=29)

    def test_estranho_nao_gera_link(
        self, client: TestClient, task_com_gravacao, db, test_roles
    ):
        from app.core.security import create_access_token, hash_password
        from app.models.user import User

        outro = User(
            name="Sem Vinculo 2", email="sem.vinculo2@test.com",
            password_hash=hash_password("x"), role_id=test_roles["salesperson"].id,
            is_active=True, is_deleted=False,
        )
        db.add(outro)
        db.commit()
        headers = {"Authorization": f"Bearer {create_access_token(data={'sub': str(outro.id)})}"}

        response = client.post(
            f"/api/v1/card-tasks/{task_com_gravacao.id}/gravacao/compartilhar", headers=headers
        )

        assert response.status_code == 403

    def test_gerente_pode_gerar(self, client: TestClient, manager_headers, task_com_gravacao):
        with patch("app.services.storage_service.storage_service.gerar_link_temporario",
                   return_value="https://r2/x"):
            response = client.post(
                f"/api/v1/card-tasks/{task_com_gravacao.id}/gravacao/compartilhar",
                headers=manager_headers,
            )

        assert response.status_code == 200
