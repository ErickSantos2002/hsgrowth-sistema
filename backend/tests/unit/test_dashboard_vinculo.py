"""
RN-037 — Dashboard conta os cards por VÍNCULO (vendedor OU SDR) e, para
admin/gerente, pela VISÃO ativa (sdr/vendedor) em vez do cargo do alvo.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card import Card


@pytest.fixture
def card_sdr_dashboard(db: Session, test_lists, test_salesperson_user) -> Card:
    """Card em que o vendedor está vinculado apenas como SDR."""
    card = Card(
        title="Card SDR dashboard",
        list_id=test_lists[0].id,
        assigned_to_id=None,
        sdr_id=test_salesperson_user.id,
        value=1500.00,
        position=0,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


class TestDashboardPorVinculo:

    def test_dashboard_do_vendedor_conta_card_em_que_e_sdr(
        self, client: TestClient, salesperson_headers, card_sdr_dashboard
    ):
        """O dashboard da pessoa conta os cards em que ela é vendedor OU SDR."""
        response = client.get(
            "/api/v1/reports/dashboard?period=year",
            headers=salesperson_headers,
        )

        assert response.status_code == 200
        assert response.json()["total_cards"] >= 1

    def test_gerente_filtrando_visao_sdr_ve_historico(
        self, client: TestClient, manager_headers, card_sdr_dashboard, test_salesperson_user
    ):
        """
        Gerente com visão SDR + usuário selecionado enxerga o histórico de SDR
        mesmo que o cargo atual da pessoa seja vendedor.
        """
        response = client.get(
            f"/api/v1/reports/dashboard?period=year&user_id={test_salesperson_user.id}&view=sdr",
            headers=manager_headers,
        )

        assert response.status_code == 200
        assert response.json()["total_cards"] >= 1
