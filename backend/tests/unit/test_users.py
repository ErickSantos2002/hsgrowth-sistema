"""
Testes unitários para gestão de usuários.
Testa CRUD de usuários, paginação, filtros, etc.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User


class TestListUsers:
    """Testes de listagem de usuários"""

    def test_list_users_success(self, client: TestClient, admin_headers, test_admin_user, test_salesperson_user):
        """Testa listagem de usuários com sucesso"""
        response = client.get(
            "/api/v1/users",
            headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert len(data["users"]) >= 2  # Pelo menos admin e salesperson

    def test_list_users_pagination(self, client: TestClient, admin_headers, db, test_roles):
        """Testa paginação de usuários"""
        # Cria vários usuários
        from app.core.security import hash_password
        for i in range(15):
            user = User(
                name=f"User {i}",
                email=f"user{i}@test.com",
                password_hash=hash_password("pass123"),
                role_id=test_roles["salesperson"].id,
                is_active=True,
                is_deleted=False
            )
            db.add(user)
        db.commit()

        # Testa página 1
        response = client.get(
            "/api/v1/users?page=1&page_size=10",
            headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) == 10
        assert data["page"] == 1
        assert data["total"] >= 15

    def test_list_users_filter_by_role(self, client: TestClient, admin_headers, test_admin_user, test_salesperson_user):
        """Testa filtro por role"""
        response = client.get(
            "/api/v1/users?role=salesperson",
            headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        # Todos devem ser salesperson
        for user in data["users"]:
            assert user["role"] == "salesperson"

    def test_list_users_unauthorized(self, client: TestClient, salesperson_headers):
        """Testa listagem sem permissão (apenas managers e admins podem listar todos)"""
        response = client.get(
            "/api/v1/users",
            headers=salesperson_headers
        )

        # Vendedores não podem listar todos os usuários
        assert response.status_code == 403


class TestGetUser:
    """Testes de busca de usuário por ID"""

    def test_get_user_success(self, client: TestClient, manager_headers, test_salesperson_user):
        """Testa buscar usuário por ID com sucesso"""
        response = client.get(
            f"/api/v1/users/{test_salesperson_user.id}",
            headers=manager_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_salesperson_user.id
        assert data["email"] == "sales@test.com"

    def test_get_user_not_found(self, client: TestClient, admin_headers):
        """Testa buscar usuário inexistente"""
        response = client.get(
            "/api/v1/users/99999",
            headers=admin_headers
        )

        assert response.status_code == 404


class TestCreateUser:
    """Testes de criação de usuário"""

    def test_create_user_success(self, client: TestClient, admin_headers, test_roles):
        """Testa criação de usuário com sucesso"""
        response = client.post(
            "/api/v1/users",
            headers=admin_headers,
            json={
                "name": "New User",
                "email": "newuser@test.com",
                "password": "newpass123",
                "role_id": test_roles["salesperson"].id
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@test.com"
        assert data["name"] == "New User"
        assert "password" not in data  # Senha não deve ser retornada

    def test_create_user_duplicate_email(self, client: TestClient, admin_headers, test_roles, test_salesperson_user):
        """Testa criar usuário com email duplicado"""
        response = client.post(
            "/api/v1/users",
            headers=admin_headers,
            json={
                "name": "Duplicate",
                "email": "sales@test.com",  # Email já existe
                "password": "pass123",
                "role_id": test_roles["salesperson"].id
            }
        )

        # Aceita tanto 400 (erro do serviço) quanto 422 (erro de validação do Pydantic)
        assert response.status_code in [400, 422]

    def test_create_user_unauthorized(self, client: TestClient, salesperson_headers, test_roles):
        """Testa criar usuário sem permissão"""
        response = client.post(
            "/api/v1/users",
            headers=salesperson_headers,
            json={
                "name": "New User",
                "email": "new@test.com",
                "password": "pass123",
                "role_id": test_roles["salesperson"].id
            }
        )

        # Vendedores não podem criar usuários
        assert response.status_code == 403


class TestUpdateUser:
    """Testes de atualização de usuário"""

    def test_update_user_success(self, client: TestClient, admin_headers, test_salesperson_user):
        """Testa atualizar usuário com sucesso"""
        response = client.put(
            f"/api/v1/users/{test_salesperson_user.id}",
            headers=admin_headers,
            json={
                "name": "Updated Name",
                "phone": "+55 11 99999-9999"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["phone"] == "+55 11 99999-9999"

    def test_update_user_not_found(self, client: TestClient, admin_headers):
        """Testa atualizar usuário inexistente"""
        response = client.put(
            "/api/v1/users/99999",
            headers=admin_headers,
            json={"name": "Updated"}
        )

        assert response.status_code == 404

    def test_update_user_unauthorized(self, client: TestClient, salesperson_headers, test_manager_user):
        """Testa atualizar outro usuário sem permissão"""
        response = client.put(
            f"/api/v1/users/{test_manager_user.id}",
            headers=salesperson_headers,
            json={"name": "Hacked Name"}
        )

        # Vendedores não podem atualizar outros usuários
        assert response.status_code == 403


class TestDeleteUser:
    """Testes de deleção de usuário"""

    def test_delete_user_success(self, client: TestClient, admin_headers, db, test_roles):
        """Testa deletar usuário com sucesso"""
        # Cria usuário para deletar
        from app.core.security import hash_password
        user_to_delete = User(
            name="To Delete",
            email="delete@test.com",
            password_hash=hash_password("pass123"),
            role_id=test_roles["salesperson"].id,
            is_active=True,
            is_deleted=False
        )
        db.add(user_to_delete)
        db.commit()
        db.refresh(user_to_delete)

        response = client.delete(
            f"/api/v1/users/{user_to_delete.id}",
            headers=admin_headers
        )

        assert response.status_code == 200

        # Verifica se foi marcado como deletado (soft delete)
        db.refresh(user_to_delete)
        assert user_to_delete.is_deleted == True

    def test_delete_user_not_found(self, client: TestClient, admin_headers):
        """Testa deletar usuário inexistente"""
        response = client.delete(
            "/api/v1/users/99999",
            headers=admin_headers
        )

        assert response.status_code == 404

    def test_delete_user_unauthorized(self, client: TestClient, salesperson_headers, test_manager_user):
        """Testa deletar usuário sem permissão"""
        response = client.delete(
            f"/api/v1/users/{test_manager_user.id}",
            headers=salesperson_headers
        )

        assert response.status_code == 403


class TestChangePassword:
    """Testes de alteração de senha"""

    def test_change_password_success(self, client: TestClient, salesperson_headers, db, test_salesperson_user):
        """Testa alterar senha com sucesso"""
        response = client.post(
            "/api/v1/users/me/change-password",
            headers=salesperson_headers,
            json={
                "current_password": "sales123",
                "new_password": "newpassword456"
            }
        )

        assert response.status_code == 200

        # Verifica se consegue fazer login com a nova senha
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sales@test.com",
                "password": "newpassword456"
            }
        )
        assert login_response.status_code == 200

    def test_change_password_wrong_current(self, client: TestClient, salesperson_headers):
        """Testa alterar senha com senha atual incorreta"""
        response = client.post(
            "/api/v1/users/me/change-password",
            headers=salesperson_headers,
            json={
                "current_password": "senhaerrada",
                "new_password": "newpassword456"
            }
        )

        assert response.status_code == 400

    def test_change_password_unauthorized(self, client: TestClient):
        """Testa alterar senha sem autenticação"""
        response = client.post(
            "/api/v1/users/me/change-password",
            json={
                "current_password": "sales123",
                "new_password": "newpassword456"
            }
        )

        assert response.status_code == 401
