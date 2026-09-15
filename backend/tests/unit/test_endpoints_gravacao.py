"""
Endpoints da gravação: listar trechos, assistir, baixar e gerar link para o
cliente.

O bucket é privado — nada é acessível por URL direta. Todo acesso passa por
link temporário assinado, gerado só para quem tem vínculo com o negócio
(RN-037).

Uma reunião pode ter vários trechos gravados: o vendedor para a gravação e
recomeça. Cada trecho é um arquivo próprio.
"""
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card_task import CardTask
from app.models.meeting_recording import MeetingRecording


def _headers_de_estranho(db, test_roles):
    """Usuário autenticado, porém sem nenhum vínculo com o negócio."""
    from app.core.security import create_access_token, hash_password
    from app.models.user import User

    outro = User(
        name="Sem Vinculo",
        email=f"sem.vinculo.{datetime.utcnow().timestamp()}@test.com",
        password_hash=hash_password("x"),
        role_id=test_roles["salesperson"].id,
        is_active=True,
        is_deleted=False,
    )
    db.add(outro)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(outro.id)})}"}


@pytest.fixture
def task_com_duas_gravacoes(db: Session, test_card, test_salesperson_user) -> CardTask:
    t = CardTask(
        card_id=test_card.id,
        title="Reunião gravada",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_provider="daily",
        daily_room_name="hsg-1",
        recording_status="ready",
        recording_key="2026/09/reuniao-1.mp4",
        recording_ready_at=datetime.utcnow(),
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    for ordem, (rec_id, chave) in enumerate(
        [("rec-1", "2026/09/reuniao-1.mp4"), ("rec-2", "2026/09/reuniao-1-parte2.mp4")],
        start=1,
    ):
        db.add(
            MeetingRecording(
                card_task_id=t.id,
                daily_recording_id=rec_id,
                ordem=ordem,
                status="ready",
                r2_key=chave,
                duration_seconds=60 * ordem,
                size_bytes=1024 * ordem,
                ready_at=datetime.utcnow(),
            )
        )
    db.commit()
    db.refresh(t)
    return t


@pytest.fixture
def outra_task_com_gravacao(db: Session, test_card, test_salesperson_user) -> CardTask:
    """Reunião diferente — serve para conferir que um trecho não abre pela URL de outra."""
    t = CardTask(
        card_id=test_card.id,
        title="Outra reunião gravada",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_provider="daily",
        recording_status="ready",
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    db.add(
        MeetingRecording(
            card_task_id=t.id,
            daily_recording_id="rec-9",
            ordem=1,
            status="ready",
            r2_key="2026/09/outra-1.mp4",
            ready_at=datetime.utcnow(),
        )
    )
    db.commit()
    db.refresh(t)
    return t


class TestListagemDosTrechos:

    def test_lista_os_trechos_em_ordem(
        self, client: TestClient, salesperson_headers, task_com_duas_gravacoes
    ):
        response = client.get(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes",
            headers=salesperson_headers,
        )

        assert response.status_code == 200
        corpo = response.json()
        assert [g["ordem"] for g in corpo] == [1, 2]
        assert corpo[0]["duracao_segundos"] == 60

    def test_nao_expoe_o_caminho_do_arquivo(
        self, client: TestClient, salesperson_headers, task_com_duas_gravacoes
    ):
        """Caminho no bucket é detalhe interno; o acesso é sempre por link assinado."""
        response = client.get(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes",
            headers=salesperson_headers,
        )

        assert "r2_key" not in response.text
        assert "2026/09" not in response.text

    def test_estranho_nao_lista(
        self, client: TestClient, task_com_duas_gravacoes, db, test_roles
    ):
        response = client.get(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes",
            headers=_headers_de_estranho(db, test_roles),
        )

        assert response.status_code == 403


class TestAssistirEBaixar:

    def test_devolve_link_temporario(
        self, client: TestClient, salesperson_headers, task_com_duas_gravacoes
    ):
        gravacao = task_com_duas_gravacoes.recordings[0]

        with patch("app.services.storage_service.storage_service.gerar_link_temporario",
                   return_value="https://r2/assinado"):
            response = client.get(
                f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes/{gravacao.id}/link",
                headers=salesperson_headers,
            )

        assert response.status_code == 200
        assert response.json()["url"] == "https://r2/assinado"

    def test_estranho_nao_acessa(
        self, client: TestClient, task_com_duas_gravacoes, db, test_roles
    ):
        """Gravação de reunião é conversa com cliente — não é para qualquer um."""
        gravacao = task_com_duas_gravacoes.recordings[0]

        response = client.get(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes/{gravacao.id}/link",
            headers=_headers_de_estranho(db, test_roles),
        )

        assert response.status_code == 403

    def test_trecho_de_outra_reuniao_nao_abre(
        self, client: TestClient, salesperson_headers, task_com_duas_gravacoes,
        outra_task_com_gravacao
    ):
        """Trocar o número na URL não pode dar acesso à gravação de outra reunião."""
        alheia = outra_task_com_gravacao.recordings[0]

        response = client.get(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes/{alheia.id}/link",
            headers=salesperson_headers,
        )

        assert response.status_code == 404

    def test_trecho_expirado_avisa(
        self, client: TestClient, salesperson_headers, task_com_duas_gravacoes, db
    ):
        """Depois dos 12 meses o vídeo não existe mais — a mensagem precisa dizer isso."""
        gravacao = task_com_duas_gravacoes.recordings[0]
        gravacao.status = "expired"
        gravacao.r2_key = None
        db.commit()

        response = client.get(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes/{gravacao.id}/link",
            headers=salesperson_headers,
        )

        assert response.status_code == 410
        assert "expir" in response.json()["detail"].lower()


class TestLinkParaOCliente:

    def test_gera_link_de_30_dias_e_registra(
        self, client: TestClient, salesperson_headers, task_com_duas_gravacoes, db,
        test_salesperson_user
    ):
        gravacao = task_com_duas_gravacoes.recordings[1]

        with patch("app.services.storage_service.storage_service.gerar_link_temporario",
                   return_value="https://r2/para-cliente"):
            response = client.post(
                f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}"
                f"/gravacoes/{gravacao.id}/compartilhar",
                headers=salesperson_headers,
            )

        assert response.status_code == 200
        assert response.json()["url"] == "https://r2/para-cliente"

        # o registro é o que permite responder, um dia, como a gravação circulou
        from app.models.recording_share import RecordingShare
        registro = db.query(RecordingShare).filter(
            RecordingShare.card_task_id == task_com_duas_gravacoes.id
        ).first()
        assert registro is not None
        assert registro.created_by_id == test_salesperson_user.id
        assert registro.meeting_recording_id == gravacao.id
        assert registro.expires_at > datetime.utcnow() + timedelta(days=29)

    def test_estranho_nao_gera_link(
        self, client: TestClient, task_com_duas_gravacoes, db, test_roles
    ):
        gravacao = task_com_duas_gravacoes.recordings[0]

        response = client.post(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}"
            f"/gravacoes/{gravacao.id}/compartilhar",
            headers=_headers_de_estranho(db, test_roles),
        )

        assert response.status_code == 403

    def test_gerente_pode_gerar(
        self, client: TestClient, manager_headers, task_com_duas_gravacoes
    ):
        gravacao = task_com_duas_gravacoes.recordings[0]

        with patch("app.services.storage_service.storage_service.gerar_link_temporario",
                   return_value="https://r2/x"):
            response = client.post(
                f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}"
                f"/gravacoes/{gravacao.id}/compartilhar",
                headers=manager_headers,
            )

        assert response.status_code == 200


class TestSincronizacaoManual:
    """
    Caminho de recuperação: se o aviso do Daily se perder, o vendedor busca a
    gravação sozinho, sem depender de alguém mexer no banco.
    """

    def test_processa_apenas_o_que_falta(
        self, client: TestClient, salesperson_headers, task_com_duas_gravacoes, monkeypatch
    ):
        monkeypatch.setattr(
            "app.services.daily_service.DailyService.listar_gravacoes",
            lambda self, task: [
                {"id": "rec-1", "duration": 60},   # já está no CRM
                {"id": "rec-3", "duration": 200},  # falta
            ],
        )
        chamadas = []
        monkeypatch.setattr(
            "app.api.v1.endpoints.daily_webhook.processar_gravacao_em_background",
            lambda **kw: chamadas.append(kw),
        )

        response = client.post(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes/sincronizar",
            headers=salesperson_headers,
        )

        assert response.status_code == 200
        assert response.json()["encontradas"] == 1
        assert chamadas == [
            {"task_id": task_com_duas_gravacoes.id, "recording_id": "rec-3", "duration": 200}
        ]

    def test_nada_novo_nao_muda_status(
        self, client: TestClient, salesperson_headers, task_com_duas_gravacoes, db, monkeypatch
    ):
        monkeypatch.setattr(
            "app.services.daily_service.DailyService.listar_gravacoes",
            lambda self, task: [{"id": "rec-1"}, {"id": "rec-2"}],
        )

        response = client.post(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes/sincronizar",
            headers=salesperson_headers,
        )

        assert response.json()["encontradas"] == 0
        db.refresh(task_com_duas_gravacoes)
        assert task_com_duas_gravacoes.recording_status == "ready"

    def test_estranho_nao_sincroniza(
        self, client: TestClient, task_com_duas_gravacoes, db, test_roles
    ):
        response = client.post(
            f"/api/v1/card-tasks/{task_com_duas_gravacoes.id}/gravacoes/sincronizar",
            headers=_headers_de_estranho(db, test_roles),
        )

        assert response.status_code == 403

    def test_reuniao_do_teams_nao_sincroniza(
        self, client: TestClient, salesperson_headers, db, test_card, test_salesperson_user
    ):
        t = CardTask(
            card_id=test_card.id,
            title="Reunião pelo Teams",
            task_type="meeting",
            assigned_to_id=test_salesperson_user.id,
        )
        db.add(t)
        db.commit()

        response = client.post(
            f"/api/v1/card-tasks/{t.id}/gravacoes/sincronizar", headers=salesperson_headers
        )

        assert response.status_code == 400
