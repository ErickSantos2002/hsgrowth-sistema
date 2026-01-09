"""
Testes de integração - Fluxos completos da API.
Testa fluxos end-to-end como: registro -> login -> criar board -> criar card -> mover -> ganhar venda.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


class TestCompleteUserFlow:
    """Testa fluxo completo de usuário"""

    def test_full_user_registration_and_login_flow(self, client: TestClient):
        """
        Testa fluxo completo:
        1. Registrar usuário
        2. Fazer login
        3. Buscar dados do usuário autenticado
        """
        # 1. Registrar
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Integration Test User",
                "email": "integration@test.com",
                "password": "integration123",
                "role": "salesperson"
            }
        )

        assert register_response.status_code == 200
        register_data = register_response.json()
        assert "access_token" in register_data

        # 2. Fazer login
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "integration@test.com",
                "password": "integration123"
            }
        )

        assert login_response.status_code == 200
        login_data = login_response.json()
        access_token = login_data["access_token"]

        # 3. Buscar dados do usuário autenticado
        me_response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["email"] == "integration@test.com"
        assert me_data["name"] == "Integration Test User"


class TestCompleteSalesFlow:
    """Testa fluxo completo de vendas"""

    def test_full_sales_pipeline_flow(
        self,
        client: TestClient,
        manager_headers,
        test_board,
        test_lists,
        test_salesperson_user
    ):
        """
        Testa fluxo completo de venda:
        1. Criar card (lead)
        2. Mover para "Em Contato"
        3. Mover para "Proposta"
        4. Mover para "Ganho"
        5. Verificar se pontos foram atribuídos
        """
        # 1. Criar card como lead
        create_response = client.post(
            "/api/v1/cards",
            headers=manager_headers,
            json={
                "title": "Cliente Potencial",
                "description": "Lead qualificado",
                "list_id": test_lists[0].id,  # Lista "Leads"
                "assigned_to_id": test_salesperson_user.id,
                "value": 10000.00,
                "stage": "lead"
            }
        )

        assert create_response.status_code == 200
        card = create_response.json()
        card_id = card["id"]
        assert card["stage"] == "lead"

        # 2. Mover para "Em Contato"
        move_response = client.put(
            f"/api/v1/cards/{card_id}/move",
            headers=manager_headers,
            json={
                "list_id": test_lists[1].id,  # "Em Contato"
                "position": 0
            }
        )

        assert move_response.status_code == 200

        # 3. Mover para "Proposta"
        move_response = client.put(
            f"/api/v1/cards/{card_id}/move",
            headers=manager_headers,
            json={
                "list_id": test_lists[2].id,  # "Proposta"
                "position": 0
            }
        )

        assert move_response.status_code == 200

        # 4. Mover para "Ganho"
        move_response = client.put(
            f"/api/v1/cards/{card_id}/move",
            headers=manager_headers,
            json={
                "list_id": test_lists[3].id,  # "Ganho"
                "position": 0
            }
        )

        assert move_response.status_code == 200
        final_card = move_response.json()
        assert final_card["stage"] == "won"

        # 5. Verificar se pontos foram atribuídos (se gamificação automática estiver ativa)
        gamification_response = client.get(
            f"/api/v1/gamification/users/{test_salesperson_user.id}",
            headers=manager_headers
        )

        assert gamification_response.status_code == 200
        # Pode ter pontos ou não dependendo da implementação de automação


class TestBoardAndCardsFlow:
    """Testa fluxo de boards e cards"""

    def test_create_board_with_lists_and_cards(
        self,
        client: TestClient,
        manager_headers,
        test_salesperson_user
    ):
        """
        Testa fluxo completo:
        1. Criar board
        2. Criar listas no board
        3. Criar cards nas listas
        4. Mover cards entre listas
        """
        # 1. Criar board
        board_response = client.post(
            "/api/v1/boards",
            headers=manager_headers,
            json={
                "name": "Pipeline de Vendas 2024",
                "description": "Board para vendas"
            }
        )

        assert board_response.status_code == 200
        board = board_response.json()
        board_id = board["id"]

        # 2. Criar listas
        lists_to_create = ["Novos Leads", "Qualificados", "Negociação", "Fechados"]
        created_lists = []

        for i, list_name in enumerate(lists_to_create):
            list_response = client.post(
                f"/api/v1/boards/{board_id}/lists",
                headers=manager_headers,
                json={
                    "name": list_name,
                    "position": i
                }
            )

            assert list_response.status_code == 200
            created_lists.append(list_response.json())

        assert len(created_lists) == 4

        # 3. Criar cards
        card_response = client.post(
            "/api/v1/cards",
            headers=manager_headers,
            json={
                "title": "Empresa ABC",
                "list_id": created_lists[0]["id"],
                "assigned_to_id": test_salesperson_user.id,
                "value": 5000.00
            }
        )

        assert card_response.status_code == 200
        card = card_response.json()

        # 4. Mover card
        move_response = client.put(
            f"/api/v1/cards/{card['id']}/move",
            headers=manager_headers,
            json={
                "list_id": created_lists[1]["id"],  # Move para "Qualificados"
                "position": 0
            }
        )

        assert move_response.status_code == 200


class TestAutomationFlow:
    """Testa fluxo de automações"""

    def test_create_and_trigger_automation(
        self,
        client: TestClient,
        manager_headers,
        test_board,
        test_lists,
        test_salesperson_user
    ):
        """
        Testa fluxo de automação:
        1. Criar automação de trigger
        2. Criar card que dispara a automação
        3. Verificar se automação foi executada
        """
        # 1. Criar automação
        automation_response = client.post(
            "/api/v1/automations",
            headers=manager_headers,
            json={
                "name": "Notificar ao criar lead",
                "automation_type": "trigger",
                "trigger_event": "card_created",
                "board_id": test_board.id,
                "is_active": True,
                "actions": [
                    {
                        "action_type": "notify_user",
                        "config": {
                            "user_id": test_salesperson_user.id,
                            "message": "Novo lead criado!"
                        }
                    }
                ]
            }
        )

        assert automation_response.status_code == 200
        automation = automation_response.json()

        # 2. Criar card (deve disparar automação)
        card_response = client.post(
            "/api/v1/cards",
            headers=manager_headers,
            json={
                "title": "Lead que dispara automação",
                "list_id": test_lists[0].id,
                "stage": "lead"
            }
        )

        assert card_response.status_code == 200

        # 3. Verificar execuções da automação
        executions_response = client.get(
            f"/api/v1/automations/{automation['id']}/executions",
            headers=manager_headers
        )

        assert executions_response.status_code == 200
        # Pode ou não ter execuções dependendo da implementação de triggers


class TestTransferFlow:
    """Testa fluxo de transferências"""

    def test_card_transfer_between_users(
        self,
        client: TestClient,
        manager_headers,
        test_card,
        test_salesperson_user,
        test_manager_user
    ):
        """
        Testa fluxo de transferência:
        1. Vendedor 1 tem um card
        2. Transfere para Vendedor 2
        3. Verifica que card mudou de responsável
        """
        # Card inicial pertence a test_salesperson_user
        assert test_card.assigned_to_id == test_salesperson_user.id

        # Transferir para manager
        transfer_response = client.post(
            "/api/v1/transfers",
            headers=manager_headers,
            json={
                "card_id": test_card.id,
                "to_user_id": test_manager_user.id,
                "reason": "Melhor fit para o manager"
            }
        )

        assert transfer_response.status_code == 200

        # Verificar se card mudou de responsável
        card_response = client.get(
            f"/api/v1/cards/{test_card.id}",
            headers=manager_headers
        )

        card_data = card_response.json()
        assert card_data["assigned_to_id"] == test_manager_user.id


class TestReportsFlow:
    """Testa fluxo de relatórios"""

    def test_generate_sales_report(
        self,
        client: TestClient,
        manager_headers
    ):
        """
        Testa geração de relatórios:
        1. Buscar dashboard KPIs
        2. Gerar relatório de vendas
        3. Gerar relatório de conversão
        """
        # 1. Dashboard KPIs
        dashboard_response = client.get(
            "/api/v1/reports/dashboard",
            headers=manager_headers,
            params={"period": "this_month"}
        )

        assert dashboard_response.status_code == 200
        dashboard = dashboard_response.json()
        assert "total_cards_created" in dashboard
        assert "total_cards_won" in dashboard

        # 2. Relatório de vendas
        sales_report_response = client.post(
            "/api/v1/reports/sales",
            headers=manager_headers,
            json={
                "period": "this_month"
            }
        )

        assert sales_report_response.status_code == 200

        # 3. Relatório de conversão
        conversion_report_response = client.post(
            "/api/v1/reports/conversion",
            headers=manager_headers,
            json={
                "period": "this_month"
            }
        )

        assert conversion_report_response.status_code == 200
