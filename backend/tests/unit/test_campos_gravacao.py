"""
Campos da gravação precisam chegar ao frontend.

O _build_response monta a resposta campo a campo: campo novo no banco que não
for adicionado lá não aparece na API. Foi exatamente o que aconteceu na Fase 1
(o botão de entrar na reunião não aparecia, com tudo correto no banco).
"""
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card_task import CardTask


@pytest.fixture
def task_com_gravacao(db: Session, test_card, test_salesperson_user) -> CardTask:
    task = CardTask(
        card_id=test_card.id,
        title="Reunião gravada",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_provider="daily",
        daily_room_name="hsg-teste",
        recording_status="ready",
        recording_key="2026/09/apresentacao-36197.mp4",
        recording_duration_seconds=2700,
        recording_size_bytes=524288000,
        recording_ready_at=datetime(2026, 9, 9, 12, 0),
        transcript_status="ready",
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    from app.models.meeting_recording import MeetingRecording

    for ordem, rec_id in enumerate(["rec-1", "rec-2"], start=1):
        db.add(MeetingRecording(
            card_task_id=task.id,
            daily_recording_id=rec_id,
            ordem=ordem,
            status="ready",
            r2_key=f"2026/09/apresentacao-36197-parte{ordem}.mp4",
            duration_seconds=1350,
            size_bytes=262144000,
            ready_at=datetime(2026, 9, 9, 12, 0),
        ))
    db.commit()
    db.refresh(task)
    return task


class TestCamposDaGravacaoNaAPI:

    def test_listagem_traz_os_campos(
        self, client: TestClient, salesperson_headers, task_com_gravacao, test_card
    ):
        response = client.get(
            f"/api/v1/card-tasks?card_id={test_card.id}&task_type=meeting",
            headers=salesperson_headers,
        )

        assert response.status_code == 200
        task = next(t for t in response.json()["tasks"] if t["id"] == task_com_gravacao.id)
        assert task["recording_status"] == "ready"
        assert task["recording_duration_seconds"] == 2700
        assert task["recording_size_bytes"] == 524288000
        assert task["transcript_status"] == "ready"
        assert task["recording_ready_at"] is not None

    def test_listagem_traz_os_trechos_gravados(
        self, client: TestClient, salesperson_headers, task_com_gravacao, test_card
    ):
        """
        Mesma armadilha da Fase 1: o dicionário da resposta é montado campo a
        campo, então um relacionamento novo não aparece sozinho.
        """
        response = client.get(
            f"/api/v1/card-tasks?card_id={test_card.id}&task_type=meeting",
            headers=salesperson_headers,
        )

        task = next(t for t in response.json()["tasks"] if t["id"] == task_com_gravacao.id)
        assert [g["ordem"] for g in task["gravacoes"]] == [1, 2]
        assert task["gravacoes"][0]["status"] == "ready"
        assert task["gravacoes"][0]["duracao_segundos"] == 1350

    def test_reuniao_sem_trechos_vem_com_lista_vazia(
        self, client: TestClient, salesperson_headers, db, test_card, test_salesperson_user
    ):
        """A tela precisa distinguir 'sem gravação' de 'campo ausente'."""
        task = CardTask(
            card_id=test_card.id,
            title="Reunião sem gravar (trechos)",
            task_type="meeting",
            assigned_to_id=test_salesperson_user.id,
        )
        db.add(task)
        db.commit()

        response = client.get(
            f"/api/v1/card-tasks?card_id={test_card.id}&task_type=meeting",
            headers=salesperson_headers,
        )

        encontrada = next(t for t in response.json()["tasks"] if t["id"] == task.id)
        assert encontrada["gravacoes"] == []

    def test_nao_expoe_o_caminho_do_arquivo(
        self, client: TestClient, salesperson_headers, task_com_gravacao, test_card
    ):
        """
        recording_key é endereço interno no bucket. O acesso é sempre por link
        temporário assinado, então o caminho não precisa sair daqui.
        """
        response = client.get(
            f"/api/v1/card-tasks?card_id={test_card.id}&task_type=meeting",
            headers=salesperson_headers,
        )

        assert "recording_key" not in response.text
        assert "2026/09/apresentacao-36197.mp4" not in response.text

    def test_reuniao_sem_gravacao_fica_com_campos_vazios(
        self, client: TestClient, salesperson_headers, db, test_card, test_salesperson_user
    ):
        """Gravar é decisão do vendedor: o padrão é não ter gravação."""
        task = CardTask(
            card_id=test_card.id,
            title="Reunião sem gravar",
            task_type="meeting",
            assigned_to_id=test_salesperson_user.id,
        )
        db.add(task)
        db.commit()

        response = client.get(
            f"/api/v1/card-tasks?card_id={test_card.id}&task_type=meeting",
            headers=salesperson_headers,
        )

        encontrada = next(t for t in response.json()["tasks"] if t["id"] == task.id)
        assert encontrada["recording_status"] is None
        assert encontrada["transcript_status"] is None
