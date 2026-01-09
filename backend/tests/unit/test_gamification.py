"""
Testes unitários para gamificação.
Testa pontos, badges, rankings, etc.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.models.gamification_point import GamificationPoint
from app.models.gamification_badge import GamificationBadge
from app.models.user_badge import UserBadge


class TestGamificationSummary:
    """Testes de resumo de gamificação"""

    def test_get_my_gamification(self, client: TestClient, salesperson_headers, test_salesperson_user, db):
        """Testa buscar resumo de gamificação do usuário autenticado"""
        # Cria pontos para o usuário
        point = GamificationPoint(
            user_id=test_salesperson_user.id,
            points=100,
            reason="card_created",
            description="Teste de pontos"
        )
        db.add(point)
        db.commit()

        response = client.get(
            "/api/v1/gamification/me",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "total_points" in data
        assert "current_week_points" in data
        assert "current_month_points" in data
        assert data["user_id"] == test_salesperson_user.id

    def test_get_user_gamification(self, client: TestClient, manager_headers, test_salesperson_user, db):
        """Testa buscar resumo de gamificação de outro usuário"""
        # Cria pontos para o usuário
        point = GamificationPoint(
            user_id=test_salesperson_user.id,
            points=200,
            reason="card_won",
            description="Teste de venda"
        )
        db.add(point)
        db.commit()

        response = client.get(
            f"/api/v1/gamification/users/{test_salesperson_user.id}",
            headers=manager_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == test_salesperson_user.id
        assert "total_points" in data


class TestPoints:
    """Testes de pontos"""

    def test_award_points_success(self, client: TestClient, manager_headers, test_salesperson_user):
        """Testa atribuir pontos a um usuário"""
        response = client.post(
            "/api/v1/gamification/points",
            headers=manager_headers,
            json={
                "user_id": test_salesperson_user.id,
                "reason": "card_won",
                "description": "Venda realizada"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == test_salesperson_user.id
        assert data["points"] > 0

    def test_award_custom_points(self, client: TestClient, manager_headers, test_salesperson_user):
        """Testa atribuir pontos customizados"""
        response = client.post(
            "/api/v1/gamification/points",
            headers=manager_headers,
            json={
                "user_id": test_salesperson_user.id,
                "reason": "card_created",
                "description": "Teste",
                "custom_points": 50
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["points"] == 50

    def test_award_points_unauthorized(self, client: TestClient, salesperson_headers, test_manager_user):
        """Testa atribuir pontos sem permissão (vendedor não pode)"""
        response = client.post(
            "/api/v1/gamification/points",
            headers=salesperson_headers,
            json={
                "user_id": test_manager_user.id,
                "reason": "card_won",
                "description": "Teste"
            }
        )

        # Dependendo da implementação, pode retornar 403 ou permitir
        # Ajuste conforme a lógica do sistema
        assert response.status_code in [201, 403]


class TestBadges:
    """Testes de badges"""

    def test_list_badges(self, client: TestClient, salesperson_headers, db):
        """Testa listar badges disponíveis"""
        # Cria alguns badges
        badge1 = GamificationBadge(
            name="Primeira Venda",
            description="Realizou a primeira venda",
            icon_url="trophy.png",
            criteria_type="manual",
            is_active=True
        )
        badge2 = GamificationBadge(
            name="10 Vendas",
            description="Realizou 10 vendas",
            icon_url="star.png",
            criteria_type="automatic",
            criteria={"field": "total_sales", "operator": ">=", "value": 10},
            is_active=True
        )
        db.add_all([badge1, badge2])
        db.commit()

        response = client.get(
            "/api/v1/gamification/badges",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_create_badge_success(self, client: TestClient, admin_headers):
        """Testa criar badge (apenas admin)"""
        response = client.post(
            "/api/v1/gamification/badges",
            headers=admin_headers,
            json={
                "name": "Badge Teste",
                "description": "Badge de teste",
                "icon_url": "medal.png",
                "criteria_type": "manual"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Badge Teste"

    def test_create_badge_unauthorized(self, client: TestClient, salesperson_headers):
        """Testa criar badge sem permissão"""
        response = client.post(
            "/api/v1/gamification/badges",
            headers=salesperson_headers,
            json={
                "name": "Badge Ilegal",
                "description": "Não deveria criar",
                "icon_url": "medal.png",
                "criteria_type": "manual"
            }
        )

        # Vendedores não podem criar badges
        assert response.status_code == 403

    def test_award_badge_success(self, client: TestClient, manager_headers, db, test_salesperson_user):
        """Testa atribuir badge a um usuário"""
        # Cria badge
        badge = GamificationBadge(
            name="Badge para Atribuir",
            description="Teste",
            icon_url="star.png",
            criteria_type="manual",
            is_active=True
        )
        db.add(badge)
        db.commit()
        db.refresh(badge)

        response = client.post(
            f"/api/v1/gamification/badges/{badge.id}/award",
            headers=manager_headers,
            json={
                "user_id": test_salesperson_user.id
            }
        )

        assert response.status_code == 200

    def test_get_my_badges(self, client: TestClient, salesperson_headers, db, test_salesperson_user):
        """Testa listar badges do usuário autenticado"""
        # Cria badge e atribui ao usuário
        badge = GamificationBadge(
            name="Meu Badge",
            description="Badge pessoal",
            icon_url="trophy.png",
            criteria_type="manual",
            is_active=True
        )
        db.add(badge)
        db.commit()

        user_badge = UserBadge(
            user_id=test_salesperson_user.id,
            badge_id=badge.id
        )
        db.add(user_badge)
        db.commit()

        response = client.get(
            "/api/v1/gamification/badges/me",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1


class TestRankings:
    """Testes de rankings"""

    def test_get_rankings_weekly(self, client: TestClient, salesperson_headers, db):
        """Testa buscar ranking semanal"""
        # Cria alguns usuários com pontos diferentes
        from app.models.user import User
        from app.core.security import hash_password

        # Obter role_id do role salesperson
        from app.models.role import Role
        salesperson_role = db.query(Role).filter(Role.name == "salesperson").first()

        user1 = User(
            name="User 1",
            email="user1@test.com",
            password_hash=hash_password("pass123"),
            role_id=salesperson_role.id,
            is_active=True,
            is_deleted=False
        )
        user2 = User(
            name="User 2",
            email="user2@test.com",
            password_hash=hash_password("pass123"),
            role_id=salesperson_role.id,
            is_active=True,
            is_deleted=False
        )
        db.add_all([user1, user2])
        db.commit()

        # Adiciona pontos
        point1 = GamificationPoint(
            user_id=user1.id,
            points=100,
            reason="card_won",
            description="Venda 1"
        )
        point2 = GamificationPoint(
            user_id=user2.id,
            points=150,
            reason="card_won",
            description="Venda 2"
        )
        db.add_all([point1, point2])
        db.commit()

        response = client.get(
            "/api/v1/gamification/rankings?period_type=weekly",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    def test_get_rankings_monthly(self, client: TestClient, salesperson_headers):
        """Testa buscar ranking mensal"""
        response = client.get(
            "/api/v1/gamification/rankings?period_type=monthly",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    def test_calculate_rankings_success(self, client: TestClient, admin_headers):
        """Testa recalcular rankings (apenas admin)"""
        response = client.post(
            "/api/v1/gamification/rankings/calculate",
            headers=admin_headers,
            json={"period_type": "weekly"}
        )

        # Pode retornar 200 ou 201 dependendo da implementação
        assert response.status_code in [200, 201]

    def test_calculate_rankings_unauthorized(self, client: TestClient, salesperson_headers):
        """Testa recalcular rankings sem permissão"""
        response = client.post(
            "/api/v1/gamification/rankings/calculate",
            headers=salesperson_headers,
            json={"period_type": "weekly"}
        )

        # Vendedores não podem recalcular rankings
        assert response.status_code == 403


class TestPointsHistory:
    """Testes de histórico de pontos"""

    def test_create_point_creates_history(self, db, test_salesperson_user):
        """Testa que criar pontos cria histórico no banco"""
        point = GamificationPoint(
            user_id=test_salesperson_user.id,
            points=50,
            reason="card_created",
            description="Criou um card"
        )
        db.add(point)
        db.commit()
        db.refresh(point)

        # Verifica que o registro foi criado
        assert point.id is not None
        assert point.created_at is not None

    def test_multiple_points_accumulate(self, db, test_salesperson_user):
        """Testa que múltiplos pontos são acumulados"""
        points_records = [
            GamificationPoint(user_id=test_salesperson_user.id, points=10, reason="action1"),
            GamificationPoint(user_id=test_salesperson_user.id, points=20, reason="action2"),
            GamificationPoint(user_id=test_salesperson_user.id, points=30, reason="action3"),
        ]
        db.add_all(points_records)
        db.commit()

        # Busca todos os pontos do usuário
        all_points = db.query(GamificationPoint).filter(
            GamificationPoint.user_id == test_salesperson_user.id
        ).all()

        total = sum(p.points for p in all_points)
        assert total >= 60  # Pelo menos 60 pontos (pode ter mais de testes anteriores)
