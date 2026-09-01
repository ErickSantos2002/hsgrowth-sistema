"""
RN-037 — GET /users/sdrs devolve quem tem cargo SDR e também quem já é
SDR de algum card (ex-SDR que virou vendedor), para não sumir dos filtros.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card import Card


class TestListaDeSdrs:

    def test_inclui_quem_tem_cargo_sdr(self, client: TestClient, manager_headers, test_sdr_user):
        """Quem tem o cargo SDR aparece na lista."""
        response = client.get("/api/v1/users/sdrs", headers=manager_headers)

        assert response.status_code == 200
        ids = [u["id"] for u in response.json()]
        assert test_sdr_user.id in ids

    def test_inclui_vendedor_que_e_sdr_de_card(
        self, client: TestClient, manager_headers, db: Session, test_lists, test_salesperson_user
    ):
        """Vendedor que é SDR de algum card também aparece (ex-SDR)."""
        card = Card(
            title="Card com ex-SDR",
            list_id=test_lists[0].id,
            assigned_to_id=None,
            sdr_id=test_salesperson_user.id,
            position=0,
        )
        db.add(card)
        db.commit()

        response = client.get("/api/v1/users/sdrs", headers=manager_headers)

        assert response.status_code == 200
        ids = [u["id"] for u in response.json()]
        assert test_salesperson_user.id in ids

    def test_nao_inclui_vendedor_sem_vinculo_sdr(
        self, client: TestClient, manager_headers, test_salesperson_user
    ):
        """Vendedor que nunca foi SDR de card nenhum não aparece."""
        response = client.get("/api/v1/users/sdrs", headers=manager_headers)

        assert response.status_code == 200
        ids = [u["id"] for u in response.json()]
        assert test_salesperson_user.id not in ids
