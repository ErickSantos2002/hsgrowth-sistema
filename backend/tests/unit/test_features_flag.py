"""
Trava por usuário do fluxo de reunião por vídeo (Daily).

Como não existe ambiente de homologação, a funcionalidade sobe para produção
visível apenas para quem homologa. Ver seção 15.8 do design.
"""
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings


class TestFeatureFlagDaily:

    def test_usuario_fora_da_lista_nao_ve(self, client: TestClient, salesperson_headers, monkeypatch):
        """Usuário fora da lista recebe daily_meeting=False."""
        monkeypatch.setattr(settings, "DAILY_ENABLED_USER_IDS", "99999")

        response = client.get("/api/v1/features", headers=salesperson_headers)

        assert response.status_code == 200
        assert response.json()["daily_meeting"] is False

    def test_usuario_da_lista_ve(
        self, client: TestClient, salesperson_headers, test_salesperson_user, monkeypatch
    ):
        """Usuário listado recebe daily_meeting=True."""
        monkeypatch.setattr(settings, "DAILY_ENABLED_USER_IDS", str(test_salesperson_user.id))

        response = client.get("/api/v1/features", headers=salesperson_headers)

        assert response.status_code == 200
        assert response.json()["daily_meeting"] is True

    def test_lista_com_varios_ids(
        self, client: TestClient, salesperson_headers, test_salesperson_user, monkeypatch
    ):
        """A lista aceita vários IDs separados por vírgula, com espaços."""
        monkeypatch.setattr(
            settings, "DAILY_ENABLED_USER_IDS", f"99999, {test_salesperson_user.id} , 88888"
        )

        response = client.get("/api/v1/features", headers=salesperson_headers)

        assert response.status_code == 200
        assert response.json()["daily_meeting"] is True

    def test_lista_vazia_libera_todos(self, client: TestClient, salesperson_headers, monkeypatch):
        """Lista vazia = funcionalidade liberada para todos (estado pós-homologação)."""
        monkeypatch.setattr(settings, "DAILY_ENABLED_USER_IDS", "")

        response = client.get("/api/v1/features", headers=salesperson_headers)

        assert response.status_code == 200
        assert response.json()["daily_meeting"] is True

    def test_exige_autenticacao(self, client: TestClient):
        """Sem token, não responde — a flag é por usuário."""
        response = client.get("/api/v1/features")

        assert response.status_code in (401, 403)
