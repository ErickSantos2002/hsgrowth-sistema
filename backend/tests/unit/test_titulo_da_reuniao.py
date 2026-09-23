"""
O título da reunião é montado pelo servidor, não pela tela.

Se fosse montado no navegador, bastaria uma chamada pela API para o padrão
furar — e o padrão é justamente o que a consultora pediu.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.fixture
def cliente_com_razao_social(db: Session, test_card):
    from app.models.client import Client

    cliente = Client(name="Contato ACME", company_name="ACME TRANSPORTES LTDA")
    db.add(cliente)
    db.commit()
    test_card.client_id = cliente.id
    db.commit()
    return cliente


def _criar(client, headers, card_id, **campos):
    corpo = {
        "card_id": card_id,
        "title": "qualquer coisa",
        "task_type": "meeting",
        "due_date": "2026-10-01T14:00:00",
        "duration_minutes": 30,
    }
    corpo.update(campos)
    return client.post("/api/v1/card-tasks", json=corpo, headers=headers)


class TestCriacao:

    def test_titulo_sai_do_tipo_e_da_razao_social(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        r = _criar(
            client, salesperson_headers, test_card.id,
            meeting_kind="apresentacao_phoebus",
        )

        assert r.status_code == 201
        assert r.json()["title"] == "Apresentação Phoebus - ACME TRANSPORTES LTDA"

    def test_titulo_enviado_pela_tela_e_ignorado(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        """Quem manda no texto é o servidor."""
        r = _criar(
            client, salesperson_headers, test_card.id,
            meeting_kind="duvidas", title="reunião do jeito que eu quiser",
        )

        assert r.json()["title"] == "Dúvidas - ACME TRANSPORTES LTDA"

    def test_tipo_outra_mantem_o_titulo_digitado(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        r = _criar(
            client, salesperson_headers, test_card.id,
            meeting_kind="outra", title="Alinhamento com a equipe técnica",
        )

        assert r.json()["title"] == "Alinhamento com a equipe técnica"

    def test_sem_cliente_vinculado_usa_o_nome_do_negocio(
        self, client: TestClient, salesperson_headers, test_card
    ):
        r = _criar(client, salesperson_headers, test_card.id, meeting_kind="apresentacao")

        assert r.json()["title"] == f"Apresentação - {test_card.title}"

    def test_sem_tipo_continua_como_antes(
        self, client: TestClient, salesperson_headers, test_card
    ):
        """Integração e reunião criada por outro caminho não podem quebrar."""
        r = _criar(client, salesperson_headers, test_card.id, title="Reunião sem tipo")

        assert r.status_code == 201
        assert r.json()["title"] == "Reunião sem tipo"

    def test_tipo_inventado_e_recusado(
        self, client: TestClient, salesperson_headers, test_card
    ):
        r = _criar(client, salesperson_headers, test_card.id, meeting_kind="churrasco")

        assert r.status_code == 422

    def test_tipo_volta_na_resposta(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        r = _criar(client, salesperson_headers, test_card.id, meeting_kind="duvidas_phoebus")

        assert r.json()["meeting_kind"] == "duvidas_phoebus"


class TestEdicao:

    def test_trocar_o_tipo_remonta_o_titulo(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        criada = _criar(
            client, salesperson_headers, test_card.id, meeting_kind="duvidas"
        ).json()

        r = client.put(
            f"/api/v1/card-tasks/{criada['id']}",
            json={"meeting_kind": "apresentacao_phoebus"},
            headers=salesperson_headers,
        )

        assert r.status_code == 200
        assert r.json()["title"] == "Apresentação Phoebus - ACME TRANSPORTES LTDA"

    def test_mudar_para_outra_aceita_o_titulo_digitado(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        criada = _criar(
            client, salesperson_headers, test_card.id, meeting_kind="apresentacao"
        ).json()

        r = client.put(
            f"/api/v1/card-tasks/{criada['id']}",
            json={"meeting_kind": "outra", "title": "Conversa com o jurídico"},
            headers=salesperson_headers,
        )

        assert r.json()["title"] == "Conversa com o jurídico"

    def test_editar_so_o_horario_nao_mexe_no_titulo(
        self, client: TestClient, salesperson_headers, test_card, cliente_com_razao_social
    ):
        criada = _criar(
            client, salesperson_headers, test_card.id, meeting_kind="apresentacao"
        ).json()

        r = client.put(
            f"/api/v1/card-tasks/{criada['id']}",
            json={"due_date": "2026-10-02T15:00:00"},
            headers=salesperson_headers,
        )

        assert r.json()["title"] == "Apresentação - ACME TRANSPORTES LTDA"
