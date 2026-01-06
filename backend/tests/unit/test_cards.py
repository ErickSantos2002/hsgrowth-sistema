"""
Testes unitários para gestão de cards.
Testa CRUD de cards, movimentação, atribuição, campos customizados, etc.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.models.card import Card


class TestListCards:
    """Testes de listagem de cards"""

    def test_list_cards_success(self, client: TestClient, salesperson_headers, test_card):
        """Testa listagem de cards com sucesso"""
        response = client.get(
            "/api/v1/cards",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) >= 1

    def test_list_cards_filter_by_stage(self, client: TestClient, salesperson_headers, test_card):
        """Testa filtro por stage"""
        response = client.get(
            "/api/v1/cards?stage=lead",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        for card in data["items"]:
            assert card["stage"] == "lead"

    def test_list_cards_filter_by_assigned_to(self, client: TestClient, salesperson_headers, test_card, test_salesperson_user):
        """Testa filtro por responsável"""
        response = client.get(
            f"/api/v1/cards?assigned_to_id={test_salesperson_user.id}",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        for card in data["items"]:
            assert card["assigned_to_id"] == test_salesperson_user.id

    def test_list_cards_unauthorized(self, client: TestClient):
        """Testa listagem sem autenticação"""
        response = client.get("/api/v1/cards")

        assert response.status_code == 401


class TestGetCard:
    """Testes de busca de card por ID"""

    def test_get_card_success(self, client: TestClient, salesperson_headers, test_card):
        """Testa buscar card por ID com sucesso"""
        response = client.get(
            f"/api/v1/cards/{test_card.id}",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_card.id
        assert data["title"] == "Test Card"

    def test_get_card_not_found(self, client: TestClient, salesperson_headers):
        """Testa buscar card inexistente"""
        response = client.get(
            "/api/v1/cards/99999",
            headers=salesperson_headers
        )

        assert response.status_code == 404


class TestCreateCard:
    """Testes de criação de card"""

    def test_create_card_success(self, client: TestClient, salesperson_headers, test_lists, test_salesperson_user):
        """Testa criar card com sucesso"""
        response = client.post(
            "/api/v1/cards",
            headers=salesperson_headers,
            json={
                "title": "New Card",
                "description": "Card description",
                "list_id": test_lists[0].id,
                "assigned_to_id": test_salesperson_user.id,
                "value": 5000.00,
                "stage": "lead"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New Card"
        assert data["value"] == 5000.00
        assert data["stage"] == "lead"

    def test_create_card_minimal_data(self, client: TestClient, salesperson_headers, test_lists):
        """Testa criar card com dados mínimos"""
        response = client.post(
            "/api/v1/cards",
            headers=salesperson_headers,
            json={
                "title": "Minimal Card",
                "list_id": test_lists[0].id
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Minimal Card"

    def test_create_card_with_due_date(self, client: TestClient, salesperson_headers, test_lists):
        """Testa criar card com data de vencimento"""
        due_date = (date.today() + timedelta(days=7)).isoformat()

        response = client.post(
            "/api/v1/cards",
            headers=salesperson_headers,
            json={
                "title": "Card with Due Date",
                "list_id": test_lists[0].id,
                "due_date": due_date
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["due_date"] == due_date

    def test_create_card_invalid_list(self, client: TestClient, salesperson_headers):
        """Testa criar card em lista inexistente"""
        response = client.post(
            "/api/v1/cards",
            headers=salesperson_headers,
            json={
                "title": "Invalid List Card",
                "list_id": 99999
            }
        )

        assert response.status_code == 404


class TestUpdateCard:
    """Testes de atualização de card"""

    def test_update_card_success(self, client: TestClient, salesperson_headers, test_card):
        """Testa atualizar card com sucesso"""
        response = client.put(
            f"/api/v1/cards/{test_card.id}",
            headers=salesperson_headers,
            json={
                "title": "Updated Title",
                "value": 2000.00
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["value"] == 2000.00

    def test_update_card_stage(self, client: TestClient, salesperson_headers, test_card):
        """Testa atualizar stage do card"""
        response = client.put(
            f"/api/v1/cards/{test_card.id}",
            headers=salesperson_headers,
            json={
                "stage": "proposal"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["stage"] == "proposal"

    def test_update_card_not_found(self, client: TestClient, salesperson_headers):
        """Testa atualizar card inexistente"""
        response = client.put(
            "/api/v1/cards/99999",
            headers=salesperson_headers,
            json={"title": "Updated"}
        )

        assert response.status_code == 404


class TestMoveCard:
    """Testes de movimentação de card"""

    def test_move_card_success(self, client: TestClient, salesperson_headers, test_card, test_lists):
        """Testa mover card entre listas"""
        response = client.put(
            f"/api/v1/cards/{test_card.id}/move",
            headers=salesperson_headers,
            json={
                "list_id": test_lists[1].id,  # Move para segunda lista
                "position": 0
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["list_id"] == test_lists[1].id
        assert data["position"] == 0

    def test_move_card_to_won(self, client: TestClient, salesperson_headers, test_card, test_lists):
        """Testa mover card para estágio 'ganho'"""
        # Busca a lista "Ganho"
        won_list = next((l for l in test_lists if l.name == "Ganho"), None)

        response = client.put(
            f"/api/v1/cards/{test_card.id}/move",
            headers=salesperson_headers,
            json={
                "list_id": won_list.id,
                "position": 0
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["stage"] == "won"

    def test_move_card_invalid_list(self, client: TestClient, salesperson_headers, test_card):
        """Testa mover card para lista inexistente"""
        response = client.put(
            f"/api/v1/cards/{test_card.id}/move",
            headers=salesperson_headers,
            json={
                "list_id": 99999,
                "position": 0
            }
        )

        assert response.status_code == 404


class TestAssignCard:
    """Testes de atribuição de responsável"""

    def test_assign_card_success(self, client: TestClient, manager_headers, test_card, test_manager_user):
        """Testa atribuir responsável a um card"""
        response = client.put(
            f"/api/v1/cards/{test_card.id}/assign",
            headers=manager_headers,
            json={
                "assigned_to_id": test_manager_user.id
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["assigned_to_id"] == test_manager_user.id

    def test_assign_card_unassign(self, client: TestClient, manager_headers, test_card):
        """Testa remover responsável de um card"""
        response = client.put(
            f"/api/v1/cards/{test_card.id}/assign",
            headers=manager_headers,
            json={
                "assigned_to_id": None
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["assigned_to_id"] is None

    def test_assign_card_invalid_user(self, client: TestClient, manager_headers, test_card):
        """Testa atribuir usuário inexistente"""
        response = client.put(
            f"/api/v1/cards/{test_card.id}/assign",
            headers=manager_headers,
            json={
                "assigned_to_id": 99999
            }
        )

        assert response.status_code == 404


class TestDeleteCard:
    """Testes de deleção de card"""

    def test_delete_card_success(self, client: TestClient, manager_headers, db, test_lists):
        """Testa deletar card com sucesso"""
        # Cria card para deletar
        card_to_delete = Card(
            title="To Delete",
            list_id=test_lists[0].id,
            stage="lead",
            position=1
        )
        db.add(card_to_delete)
        db.commit()
        db.refresh(card_to_delete)

        response = client.delete(
            f"/api/v1/cards/{card_to_delete.id}",
            headers=manager_headers
        )

        assert response.status_code == 200

        # Verifica se foi deletado
        deleted_card = db.query(Card).filter(Card.id == card_to_delete.id).first()
        assert deleted_card is None

    def test_delete_card_not_found(self, client: TestClient, manager_headers):
        """Testa deletar card inexistente"""
        response = client.delete(
            "/api/v1/cards/99999",
            headers=manager_headers
        )

        assert response.status_code == 404

    def test_delete_card_unauthorized(self, client: TestClient, salesperson_headers, test_card):
        """Testa deletar card sem permissão (vendedor não pode deletar)"""
        response = client.delete(
            f"/api/v1/cards/{test_card.id}",
            headers=salesperson_headers
        )

        # Vendedores não podem deletar cards
        assert response.status_code == 403


class TestCustomFields:
    """Testes de campos customizados"""

    def test_add_custom_field_success(self, client: TestClient, salesperson_headers, test_card):
        """Testa adicionar campo customizado a um card"""
        response = client.post(
            f"/api/v1/cards/{test_card.id}/fields",
            headers=salesperson_headers,
            json={
                "field_name": "Origem",
                "field_value": "Indicação",
                "field_type": "text"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "custom_fields" in data

    def test_list_custom_fields(self, client: TestClient, salesperson_headers, test_card):
        """Testa listar campos customizados de um card"""
        # Primeiro adiciona um campo
        client.post(
            f"/api/v1/cards/{test_card.id}/fields",
            headers=salesperson_headers,
            json={
                "field_name": "Categoria",
                "field_value": "VIP",
                "field_type": "text"
            }
        )

        # Agora lista
        response = client.get(
            f"/api/v1/cards/{test_card.id}/fields",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
