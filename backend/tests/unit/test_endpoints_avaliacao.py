"""
Avaliar a reunião pela régua — por clique, nunca sozinho.

Cada avaliação custa dinheiro e mostra o desempenho de uma pessoa: as
conferências de vínculo (RN-037) importam tanto quanto o resultado.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.card_task import CardTask

AVALIACAO_DA_IA = {
    "itens": [
        {"criterio_id": "A1", "bloco": "Abertura", "peso": 50, "nota": 2,
         "evidencia": "Sou o Miguel", "porque": "apresentou-se com autoridade"},
        {"criterio_id": "D1", "bloco": "Diagnóstico", "peso": 50, "nota": 1,
         "evidencia": "Como é hoje?", "porque": "mapeou parcialmente"},
    ],
    "score": 75.0,
    "veredito": "Boa call, com gaps claros",
    "cobertura": 1.0,
    "medias_por_bloco": {"Abertura": 100, "Diagnóstico": 50},
    "desfecho": "Proposta pedida",
    "ponto_forte": "Mapeou o processo",
    "foco_desenvolvimento": "Conectar dor e risco",
    "proxima_acao": "Perguntar quem aprova",
    "modelo": "gpt-4o",
    "latencia_ms": 18000,
    "tokens_entrada": 12000,
    "tokens_saida": 2000,
}


@pytest.fixture(autouse=True)
def chave_presente(monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "chave-de-teste")


@pytest.fixture
def reuniao(db: Session, test_card, test_salesperson_user) -> CardTask:
    t = CardTask(
        card_id=test_card.id,
        title="Reunião com transcrição",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        transcript_raw="WEBVTT\n\n<v Cliente>Nosso processo hoje é manual</v>",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


class TestAvaliar:

    def test_grava_a_avaliacao_com_os_itens(
        self, client: TestClient, salesperson_headers, reuniao, db
    ):
        with patch("app.services.avaliacao_reuniao.servico.avaliar", return_value=AVALIACAO_DA_IA):
            r = client.post(
                f"/api/v1/card-tasks/{reuniao.id}/avaliacao", headers=salesperson_headers
            )

        assert r.status_code == 201
        corpo = r.json()
        assert corpo["score"] == 75.0
        assert corpo["veredito"] == "Boa call, com gaps claros"
        assert len(corpo["itens"]) == 2
        assert corpo["versao_criterios"] == "2026-09"

        db.refresh(reuniao)
        assert reuniao.evaluation.tokens_entrada == 12000

    def test_reavaliar_substitui_a_anterior(
        self, client: TestClient, salesperson_headers, reuniao, db
    ):
        from app.models.meeting_evaluation import MeetingEvaluation

        with patch("app.services.avaliacao_reuniao.servico.avaliar", return_value=AVALIACAO_DA_IA):
            client.post(f"/api/v1/card-tasks/{reuniao.id}/avaliacao", headers=salesperson_headers)
            client.post(f"/api/v1/card-tasks/{reuniao.id}/avaliacao", headers=salesperson_headers)

        assert db.query(MeetingEvaluation).filter_by(card_task_id=reuniao.id).count() == 1

    def test_sem_transcricao_e_recusada(
        self, client: TestClient, salesperson_headers, db, test_card
    ):
        t = CardTask(card_id=test_card.id, title="Sem transcrição", task_type="meeting")
        db.add(t)
        db.commit()

        r = client.post(f"/api/v1/card-tasks/{t.id}/avaliacao", headers=salesperson_headers)

        assert r.status_code == 422

    def test_reuniao_inexistente(self, client: TestClient, salesperson_headers):
        r = client.post("/api/v1/card-tasks/99999999/avaliacao", headers=salesperson_headers)

        assert r.status_code == 404

    def test_estranho_nao_avalia(self, client: TestClient, reuniao, db, test_roles):
        """A conversa com o cliente não é de qualquer um (RN-037)."""
        from app.core.security import create_access_token, hash_password
        from app.models.user import User

        outro = User(
            name="Sem Vinculo",
            email="sem.vinculo.avaliacao@test.com",
            password_hash=hash_password("x"),
            role_id=test_roles["salesperson"].id,
            is_active=True,
            is_deleted=False,
        )
        db.add(outro)
        db.commit()
        headers = {"Authorization": f"Bearer {create_access_token(data={'sub': str(outro.id)})}"}

        r = client.post(f"/api/v1/card-tasks/{reuniao.id}/avaliacao", headers=headers)

        assert r.status_code == 403

    def test_sem_chave_da_ia_avisa(
        self, client: TestClient, salesperson_headers, reuniao, monkeypatch
    ):
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "")

        r = client.post(f"/api/v1/card-tasks/{reuniao.id}/avaliacao", headers=salesperson_headers)

        assert r.status_code == 503

    def test_falha_da_ia_nao_grava_nada(
        self, client: TestClient, salesperson_headers, reuniao, db
    ):
        from app.models.meeting_evaluation import MeetingEvaluation

        with patch("app.services.avaliacao_reuniao.servico.avaliar",
                   side_effect=ValueError("fora do ar")):
            r = client.post(
                f"/api/v1/card-tasks/{reuniao.id}/avaliacao", headers=salesperson_headers
            )

        assert r.status_code == 502
        assert db.query(MeetingEvaluation).count() == 0

    def test_exige_autenticacao(self, client: TestClient, reuniao):
        r = client.post(f"/api/v1/card-tasks/{reuniao.id}/avaliacao")

        assert r.status_code in (401, 403)


class TestConsultar:

    def test_devolve_a_avaliacao(self, client: TestClient, salesperson_headers, reuniao):
        with patch("app.services.avaliacao_reuniao.servico.avaliar", return_value=AVALIACAO_DA_IA):
            client.post(f"/api/v1/card-tasks/{reuniao.id}/avaliacao", headers=salesperson_headers)

        r = client.get(f"/api/v1/card-tasks/{reuniao.id}/avaliacao", headers=salesperson_headers)

        assert r.status_code == 200
        assert r.json()["score"] == 75.0
        assert r.json()["avaliado_por"] is not None

    def test_reuniao_sem_avaliacao_devolve_vazio(
        self, client: TestClient, salesperson_headers, reuniao
    ):
        r = client.get(f"/api/v1/card-tasks/{reuniao.id}/avaliacao", headers=salesperson_headers)

        assert r.status_code == 200
        assert r.json() is None
