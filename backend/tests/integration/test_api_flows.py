"""
Testes de integração - Fluxos completos da API.
Fluxos ponta a ponta: cadastro (admin) -> login -> board -> card -> mover -> ganhar venda.

Atualizado em 01/10/2026 para o contrato atual da API (os testes eram de jan/2026):
- Criação devolve 201; card não tem mais `stage`; mover usa `target_list_id`.
- Cadastro (/auth/register) é restrito a admin (era público — falha de segurança).
- Ganho exige 'É venda ou locação' (modality); automação usa actions[].type/params;
  transferência usa reason do enum; relatório de conversão exige board_id.
"""
from fastapi.testclient import TestClient


class TestCompleteUserFlow:
    """Testa fluxo completo de usuário"""

    def test_full_user_registration_and_login_flow(self, client: TestClient, admin_headers):
        """
        1. Admin cadastra o usuário
        2. Usuário faz login
        3. Busca os próprios dados autenticado
        """
        register_response = client.post(
            "/api/v1/auth/register",
            headers=admin_headers,
            json={
                "name": "Integration Test User",
                "email": "integration@test.com",
                "password": "integration123",
            }
        )
        assert register_response.status_code == 201

        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "integration@test.com", "password": "integration123"}
        )
        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]

        me_response = client.get(
            "/api/v1/users/me",
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
        Lead -> Em Contato -> Proposta -> Ganho, e consulta da gamificação do vendedor.
        """
        create_response = client.post(
            "/api/v1/cards",
            headers=manager_headers,
            json={
                "title": "Cliente Potencial",
                "description": "Lead qualificado",
                "list_id": test_lists[0].id,  # "Leads"
                "assigned_to_id": test_salesperson_user.id,
                "value": 10000.00,
            }
        )
        assert create_response.status_code == 201
        card_id = create_response.json()["id"]

        for lista in (test_lists[1], test_lists[2]):  # "Em Contato", "Proposta"
            move_response = client.put(
                f"/api/v1/cards/{card_id}/move",
                headers=manager_headers,
                json={"target_list_id": lista.id, "position": 0}
            )
            assert move_response.status_code == 200
            assert move_response.json()["list_id"] == lista.id

        # 'É venda ou locação' é obrigatório para dar Ganho
        update_response = client.put(
            f"/api/v1/cards/{card_id}",
            headers=manager_headers,
            json={"modality": "venda"}
        )
        assert update_response.status_code == 200

        move_response = client.put(
            f"/api/v1/cards/{card_id}/move",
            headers=manager_headers,
            json={"target_list_id": test_lists[3].id, "position": 0}  # "Ganho"
        )
        assert move_response.status_code == 200
        assert move_response.json()["is_won"] is True

        gamification_response = client.get(
            f"/api/v1/gamification/users/{test_salesperson_user.id}",
            headers=manager_headers
        )
        assert gamification_response.status_code == 200


class TestBoardAndCardsFlow:
    """Testa fluxo de boards e cards"""

    def test_create_board_with_lists_and_cards(
        self,
        client: TestClient,
        manager_headers,
        test_salesperson_user
    ):
        """Cria board, listas e card, e move o card entre listas."""
        board_response = client.post(
            "/api/v1/boards",
            headers=manager_headers,
            json={"name": "Pipeline de Vendas 2024", "description": "Board para vendas"}
        )
        assert board_response.status_code == 201
        board_id = board_response.json()["id"]

        created_lists = []
        for i, list_name in enumerate(["Novos Leads", "Qualificados", "Negociação", "Fechados"]):
            list_response = client.post(
                f"/api/v1/boards/{board_id}/lists",
                headers=manager_headers,
                json={"name": list_name, "position": i, "board_id": board_id}
            )
            assert list_response.status_code in (200, 201)
            created_lists.append(list_response.json())
        assert len(created_lists) == 4

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
        assert card_response.status_code == 201
        card = card_response.json()

        move_response = client.put(
            f"/api/v1/cards/{card['id']}/move",
            headers=manager_headers,
            json={"target_list_id": created_lists[1]["id"], "position": 0}  # "Qualificados"
        )
        assert move_response.status_code == 200
        assert move_response.json()["list_id"] == created_lists[1]["id"]


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
        """Cria automação de gatilho 'card criado', cria um card e consulta as execuções."""
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
                        "type": "send_notification",
                        "params": {"user_id": test_salesperson_user.id, "message": "Novo lead criado!"}
                    }
                ]
            }
        )
        assert automation_response.status_code in (200, 201)
        automation = automation_response.json()

        card_response = client.post(
            "/api/v1/cards",
            headers=manager_headers,
            json={"title": "Lead que dispara automação", "list_id": test_lists[0].id}
        )
        assert card_response.status_code == 201

        executions_response = client.get(
            f"/api/v1/automations/{automation['id']}/executions",
            headers=manager_headers
        )
        assert executions_response.status_code == 200


class TestTransferFlow:
    """Testa fluxo de transferências"""

    def test_card_transfer_between_users(
        self,
        client: TestClient,
        manager_headers,
        test_card,
        test_salesperson_user,
        test_admin_user
    ):
        """Gerente transfere o card do vendedor para outro usuário e confere o novo responsável.

        (Transferir para si mesmo é bloqueado pela regra de negócio — o teste antigo
        fazia o gerente transferir para ele próprio.)
        """
        assert test_card.assigned_to_id == test_salesperson_user.id

        transfer_response = client.post(
            "/api/v1/transfers",
            headers=manager_headers,
            json={
                "card_id": test_card.id,
                "to_user_id": test_admin_user.id,
                "reason": "reassignment",
                "notes": "Melhor fit"
            }
        )
        assert transfer_response.status_code in (200, 201)

        card_response = client.get(f"/api/v1/cards/{test_card.id}", headers=manager_headers)
        assert card_response.json()["assigned_to_id"] == test_admin_user.id

    def test_transferir_para_si_mesmo_bloqueia(self, client: TestClient, manager_headers, test_card, test_manager_user):
        """Não é possível transferir um card para si mesmo."""
        response = client.post(
            "/api/v1/transfers",
            headers=manager_headers,
            json={"card_id": test_card.id, "to_user_id": test_manager_user.id, "reason": "reassignment"}
        )
        assert response.status_code == 400


class TestReportsFlow:
    """Testa fluxo de relatórios"""

    def test_generate_sales_report(self, client: TestClient, manager_headers, test_board, test_card):
        """KPIs do dashboard, relatório de vendas e de conversão."""
        dashboard_response = client.get(
            "/api/v1/reports/dashboard",
            headers=manager_headers,
            params={"period": "this_month"}
        )
        assert dashboard_response.status_code == 200
        dashboard = dashboard_response.json()
        assert "total_cards" in dashboard
        assert "won_cards_this_month" in dashboard

        # O relatório de vendas dava 500 (usava @property do model dentro da query)
        sales_report_response = client.post(
            "/api/v1/reports/sales",
            headers=manager_headers,
            json={"period": "this_month"}
        )
        assert sales_report_response.status_code == 200

        conversion_report_response = client.post(
            "/api/v1/reports/conversion",
            headers=manager_headers,
            json={"board_id": test_board.id, "period": "this_month"}
        )
        assert conversion_report_response.status_code == 200
