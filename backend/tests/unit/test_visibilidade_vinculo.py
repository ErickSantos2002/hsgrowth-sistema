"""
RN-037 — Visibilidade e edição de cards por VÍNCULO (vendedor OU SDR),
não por cargo. Garante que trocar o cargo de uma pessoa (SDR → Vendedor)
não faz a carteira dela sumir.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.card import Card


@pytest.fixture
def card_sdr_sem_vendedor(db: Session, test_lists, test_salesperson_user) -> Card:
    """Card em que o vendedor está vinculado apenas como SDR (assigned_to_id vazio)."""
    card = Card(
        title="Card com SDR sem vendedor",
        list_id=test_lists[0].id,
        assigned_to_id=None,
        sdr_id=test_salesperson_user.id,
        value=500.00,
        position=0,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


class TestVisibilidadePorVinculo:
    """Listagem de cards para quem tem cargo de vendedor."""

    def test_vendedor_ve_card_em_que_e_sdr(
        self, client: TestClient, salesperson_headers, card_sdr_sem_vendedor, test_board
    ):
        """Vendedor enxerga card em que está vinculado como SDR (RN-037)."""
        response = client.get(
            f"/api/v1/cards?board_id={test_board.id}&all=true",
            headers=salesperson_headers,
        )

        assert response.status_code == 200
        ids = [c["id"] for c in response.json()["cards"]]
        assert card_sdr_sem_vendedor.id in ids

    def test_vendedor_nao_ve_card_de_terceiro(
        self, client: TestClient, salesperson_headers, db: Session, test_lists, test_manager_user, test_board
    ):
        """Vendedor não enxerga card sem vínculo nenhum com ele."""
        alheio = Card(
            title="Card de terceiro",
            list_id=test_lists[0].id,
            assigned_to_id=test_manager_user.id,
            sdr_id=None,
            position=1,
        )
        db.add(alheio)
        db.commit()
        db.refresh(alheio)

        response = client.get(
            f"/api/v1/cards?board_id={test_board.id}&all=true",
            headers=salesperson_headers,
        )

        assert response.status_code == 200
        ids = [c["id"] for c in response.json()["cards"]]
        assert alheio.id not in ids

    def test_sdr_ve_card_em_que_e_vendedor(
        self, client: TestClient, sdr_headers, db: Session, test_lists, test_sdr_user, test_board
    ):
        """A regra vale nos dois sentidos: SDR enxerga card em que é o vendedor."""
        card = Card(
            title="Card com SDR como vendedor",
            list_id=test_lists[0].id,
            assigned_to_id=test_sdr_user.id,
            sdr_id=None,
            position=2,
        )
        db.add(card)
        db.commit()
        db.refresh(card)

        response = client.get(
            f"/api/v1/cards?board_id={test_board.id}&all=true",
            headers=sdr_headers,
        )

        assert response.status_code == 200
        ids = [c["id"] for c in response.json()["cards"]]
        assert card.id in ids


class TestEdicaoPorVinculo:
    """Permissão de escrita para quem tem cargo de vendedor."""

    def test_vendedor_edita_card_em_que_e_sdr(
        self, client: TestClient, salesperson_headers, card_sdr_sem_vendedor
    ):
        """Vendedor consegue editar card em que está vinculado como SDR (RN-037)."""
        response = client.put(
            f"/api/v1/cards/{card_sdr_sem_vendedor.id}",
            headers=salesperson_headers,
            json={"title": "Titulo editado pelo vendedor"},
        )

        assert response.status_code == 200
        assert response.json()["title"] == "Titulo editado pelo vendedor"

    def test_vendedor_nao_edita_card_de_terceiro(
        self, client: TestClient, salesperson_headers, db: Session, test_lists, test_manager_user
    ):
        """Vendedor continua bloqueado em card sem vínculo nenhum com ele."""
        alheio = Card(
            title="Card de terceiro",
            list_id=test_lists[0].id,
            assigned_to_id=test_manager_user.id,
            sdr_id=None,
            position=3,
        )
        db.add(alheio)
        db.commit()
        db.refresh(alheio)

        response = client.put(
            f"/api/v1/cards/{alheio.id}",
            headers=salesperson_headers,
            json={"title": "Nao deveria passar"},
        )

        assert response.status_code == 403
