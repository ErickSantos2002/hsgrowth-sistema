"""
Testes unitários para autenticação.
Testa login, registro, refresh token, recuperação de senha, etc.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.core.security import verify_password


class TestLogin:
    """Testes de login"""

    def test_login_success(self, client: TestClient, test_salesperson_user: User):
        """Testa login com credenciais válidas"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sales@test.com",
                "password": "sales123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == "sales@test.com"

    def test_login_invalid_email(self, client: TestClient):
        """Testa login com email inexistente"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "naoexiste@test.com",
                "password": "qualquersenha"
            }
        )

        assert response.status_code == 401
        assert "Email ou senha incorretos" in response.json()["detail"]

    def test_login_invalid_password(self, client: TestClient, test_salesperson_user: User):
        """Testa login com senha incorreta"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sales@test.com",
                "password": "senhaerrada"
            }
        )

        assert response.status_code == 401
        assert "Email ou senha incorretos" in response.json()["detail"]

    def test_login_inactive_user(self, client: TestClient, db: Session, test_salesperson_user: User):
        """Testa login com usuário inativo"""
        # Desativa o usuário
        test_salesperson_user.is_active = False
        db.commit()

        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sales@test.com",
                "password": "sales123"
            }
        )

        assert response.status_code == 403


class TestRegister:
    """Testes de registro de usuário"""

    def test_register_success(self, client: TestClient):
        """Testa registro de novo usuário com sucesso"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "name": "New User",
                "email": "newuser@test.com",
                "password": "newpass123",
                "role": "salesperson"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "newuser@test.com"
        assert data["user"]["name"] == "New User"

    def test_register_duplicate_email(self, client: TestClient, test_salesperson_user):
        """Testa registro com email já existente"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Another User",
                "email": "sales@test.com",  # Email já existe
                "password": "pass123",
                "role": "salesperson"
            }
        )

        assert response.status_code == 400
        assert "Email já cadastrado" in response.json()["detail"]

    def test_register_invalid_email(self, client: TestClient):
        """Testa registro com email inválido"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Invalid Email User",
                "email": "emailinvalido",  # Sem @
                "password": "pass123",
                "role": "salesperson"
            }
        )

        assert response.status_code == 422  # Validation error

    def test_register_weak_password(self, client: TestClient):
        """Testa registro com senha fraca"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "name": "Weak Pass User",
                "email": "weak@test.com",
                "password": "123",  # Muito curta
                "role": "salesperson"
            }
        )

        # Pode ser 422 (validation) ou 400 (business rule)
        assert response.status_code in [400, 422]


class TestRefreshToken:
    """Testes de refresh token"""

    def test_refresh_token_success(self, client: TestClient, test_salesperson_user):
        """Testa renovação de token com refresh token válido"""
        # Primeiro faz login para obter refresh token
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sales@test.com",
                "password": "sales123"
            }
        )
        refresh_token = login_response.json()["refresh_token"]

        # Agora renova o token
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_token_invalid(self, client: TestClient):
        """Testa renovação com refresh token inválido"""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "token_invalido_xyz"}
        )

        assert response.status_code == 401


class TestLogout:
    """Testes de logout"""

    def test_logout_success(self, client: TestClient, salesperson_headers):
        """Testa logout com token válido"""
        response = client.post(
            "/api/v1/auth/logout",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        assert "sucesso" in response.json()["message"].lower()

    def test_logout_without_token(self, client: TestClient):
        """Testa logout sem token de autenticação"""
        response = client.post("/api/v1/auth/logout")

        assert response.status_code == 401  # 401 Unauthorized (sem credenciais)


class TestForgotPassword:
    """Testes de recuperação de senha"""

    def test_forgot_password_success(self, client: TestClient, test_salesperson_user):
        """Testa solicitação de recuperação de senha"""
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "sales@test.com"}
        )

        assert response.status_code == 200
        assert "receberá" in response.json()["message"].lower()

    def test_forgot_password_nonexistent_email(self, client: TestClient):
        """Testa recuperação com email inexistente"""
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "naoexiste@test.com"}
        )

        # Por segurança, deve retornar sucesso mesmo se email não existir
        assert response.status_code == 200


class TestResetPassword:
    """Testes de reset de senha"""

    def test_reset_password_success(self, client: TestClient, db: Session, test_salesperson_user):
        """Testa reset de senha com token válido"""
        # Primeiro solicita recuperação
        client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "sales@test.com"}
        )

        # Busca o token gerado no banco
        db.refresh(test_salesperson_user)
        reset_token = test_salesperson_user.reset_token

        # Agora reseta a senha
        response = client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": reset_token,
                "new_password": "novasenha123"
            }
        )

        assert response.status_code == 200

        # Verifica se consegue fazer login com a nova senha
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sales@test.com",
                "password": "novasenha123"
            }
        )
        assert login_response.status_code == 200

    def test_reset_password_invalid_token(self, client: TestClient):
        """Testa reset de senha com token inválido"""
        response = client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": "token_invalido_xyz",
                "new_password": "novasenha123"
            }
        )

        assert response.status_code == 400

    def test_reset_password_expired_token(self, client: TestClient, db: Session, test_salesperson_user):
        """Testa reset de senha com token expirado"""
        from datetime import datetime, timedelta

        # Solicita recuperação
        client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "sales@test.com"}
        )

        # Busca o token e expira manualmente
        db.refresh(test_salesperson_user)
        test_salesperson_user.reset_token_expires_at = datetime.utcnow() - timedelta(hours=2)
        db.commit()

        reset_token = test_salesperson_user.reset_token

        # Tenta resetar com token expirado
        response = client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": reset_token,
                "new_password": "novasenha123"
            }
        )

        assert response.status_code == 400
        assert "expirado" in response.json()["detail"].lower()


class TestMe:
    """Testes do endpoint /me"""

    def test_get_me_success(self, client: TestClient, salesperson_headers, test_salesperson_user):
        """Testa buscar dados do usuário autenticado"""
        response = client.get(
            "/api/v1/users/me",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "sales@test.com"
        assert data["name"] == "Salesperson User"

    def test_get_me_without_token(self, client: TestClient):
        """Testa buscar /me sem autenticação"""
        response = client.get("/api/v1/users/me")

        assert response.status_code == 401  # 401 Unauthorized (sem credenciais)
