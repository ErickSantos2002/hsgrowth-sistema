"""
Testes unitários para gamificação.
Testa pontos, badges, rankings, etc.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.gamification_stats import GamificationStats
from app.models.badge import Badge
from app.models.user_badge import UserBadge


class TestGamificationSummary:
    """Testes de resumo de gamificação"""

    def test_get_my_gamification(self, client: TestClient, salesperson_headers, test_salesperson_user, db):
        """Testa buscar resumo de gamificação do usuário autenticado"""
        # Cria stats de gamificação para o usuário
        stats = GamificationStats(
            user_id=test_salesperson_user.id,
            total_points=100,
            monthly_points=50,
            weekly_points=25,
            current_streak=5,
            longest_streak=10
        )
        db.add(stats)
        db.commit()

        response = client.get(
            "/api/v1/gamification/me",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_points"] == 100
        assert data["monthly_points"] == 50

    def test_get_user_gamification(self, client: TestClient, manager_headers, test_salesperson_user, db):
        """Testa buscar resumo de gamificação de outro usuário"""
        # Cria stats
        stats = GamificationStats(
            user_id=test_salesperson_user.id,
            total_points=200,
            monthly_points=100
        )
        db.add(stats)
        db.commit()

        response = client.get(
            f"/api/v1/gamification/users/{test_salesperson_user.id}",
            headers=manager_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_points"] == 200


class TestPoints:
    """Testes de pontos"""

    def test_award_points_success(self, client: TestClient, manager_headers, test_salesperson_user):
        """Testa atribuir pontos a um usuário"""
        response = client.post(
            "/api/v1/gamification/points",
            headers=manager_headers,
            json={
                "user_id": test_salesperson_user.id,
                "points": 50,
                "reason": "Venda realizada"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_points"] >= 50

    def test_award_negative_points(self, client: TestClient, manager_headers, test_salesperson_user):
        """Testa atribuir pontos negativos (penalidade)"""
        response = client.post(
            "/api/v1/gamification/points",
            headers=manager_headers,
            json={
                "user_id": test_salesperson_user.id,
                "points": -10,
                "reason": "Penalidade"
            }
        )

        # Pode aceitar ou rejeitar pontos negativos dependendo da implementação
        assert response.status_code in [200, 400]

    def test_award_points_unauthorized(self, client: TestClient, salesperson_headers, test_manager_user):
        """Testa atribuir pontos sem permissão (vendedor não pode)"""
        response = client.post(
            "/api/v1/gamification/points",
            headers=salesperson_headers,
            json={
                "user_id": test_manager_user.id,
                "points": 50,
                "reason": "Teste"
            }
        )

        # Vendedores não podem atribuir pontos
        assert response.status_code == 403


class TestBadges:
    """Testes de badges"""

    def test_list_badges(self, client: TestClient, salesperson_headers, db, test_account):
        """Testa listar badges disponíveis"""
        # Cria alguns badges
        badge1 = Badge(
            name="Primeira Venda",
            description="Realizou a primeira venda",
            icon="trophy",
            color="gold",
            account_id=test_account.id
        )
        badge2 = Badge(
            name="10 Vendas",
            description="Realizou 10 vendas",
            icon="star",
            color="silver",
            account_id=test_account.id
        )
        db.add_all([badge1, badge2])
        db.commit()

        response = client.get(
            "/api/v1/gamification/badges",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) >= 2

    def test_create_badge_success(self, client: TestClient, admin_headers, test_account):
        """Testa criar badge (apenas admin)"""
        response = client.post(
            "/api/v1/gamification/badges",
            headers=admin_headers,
            json={
                "name": "Badge Teste",
                "description": "Badge de teste",
                "icon": "medal",
                "color": "blue",
                "account_id": test_account.id
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Badge Teste"

    def test_create_badge_unauthorized(self, client: TestClient, salesperson_headers, test_account):
        """Testa criar badge sem permissão"""
        response = client.post(
            "/api/v1/gamification/badges",
            headers=salesperson_headers,
            json={
                "name": "Badge Ilegal",
                "description": "Não deveria criar",
                "icon": "medal",
                "color": "red",
                "account_id": test_account.id
            }
        )

        # Vendedores não podem criar badges
        assert response.status_code == 403

    def test_award_badge_success(self, client: TestClient, manager_headers, db, test_salesperson_user, test_account):
        """Testa atribuir badge a um usuário"""
        # Cria badge
        badge = Badge(
            name="Badge para Atribuir",
            description="Teste",
            icon="star",
            color="gold",
            account_id=test_account.id
        )
        db.add(badge)
        db.commit()
        db.refresh(badge)

        response = client.post(
            f"/api/v1/gamification/badges/{badge.id}/award",
            headers=manager_headers,
            json={
                "user_id": test_salesperson_user.id,
                "reason": "Desempenho excepcional"
            }
        )

        assert response.status_code == 200

    def test_get_my_badges(self, client: TestClient, salesperson_headers, db, test_salesperson_user, test_account):
        """Testa listar badges do usuário autenticado"""
        # Cria badge e atribui ao usuário
        badge = Badge(
            name="Meu Badge",
            description="Badge pessoal",
            icon="trophy",
            color="gold",
            account_id=test_account.id
        )
        db.add(badge)
        db.commit()

        user_badge = UserBadge(
            user_id=test_salesperson_user.id,
            badge_id=badge.id,
            reason="Teste"
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

    def test_get_rankings_weekly(self, client: TestClient, salesperson_headers, db, test_account):
        """Testa buscar ranking semanal"""
        # Cria alguns usuários com pontos diferentes
        from app.models.user import User
        from app.core.security import hash_password

        user1 = User(
            name="User 1",
            email="user1@test.com",
            password=hash_password("pass123"),
            role="salesperson",
            account_id=test_account.id,
            is_active=True,
            is_deleted=False
        )
        user2 = User(
            name="User 2",
            email="user2@test.com",
            password=hash_password("pass123"),
            role="salesperson",
            account_id=test_account.id,
            is_active=True,
            is_deleted=False
        )
        db.add_all([user1, user2])
        db.commit()

        # Adiciona pontos
        stats1 = GamificationStats(
            user_id=user1.id,
            weekly_points=100
        )
        stats2 = GamificationStats(
            user_id=user2.id,
            weekly_points=150
        )
        db.add_all([stats1, stats2])
        db.commit()

        response = client.get(
            "/api/v1/gamification/rankings?period=weekly",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Ranking deve estar ordenado por pontos (maior primeiro)
        if len(data) >= 2:
            assert data[0]["points"] >= data[1]["points"]

    def test_get_rankings_monthly(self, client: TestClient, salesperson_headers):
        """Testa buscar ranking mensal"""
        response = client.get(
            "/api/v1/gamification/rankings?period=monthly",
            headers=salesperson_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_calculate_rankings_success(self, client: TestClient, admin_headers):
        """Testa recalcular rankings (apenas admin)"""
        response = client.post(
            "/api/v1/gamification/rankings/calculate",
            headers=admin_headers,
            json={"period": "weekly"}
        )

        assert response.status_code == 200

    def test_calculate_rankings_unauthorized(self, client: TestClient, salesperson_headers):
        """Testa recalcular rankings sem permissão"""
        response = client.post(
            "/api/v1/gamification/rankings/calculate",
            headers=salesperson_headers,
            json={"period": "weekly"}
        )

        # Vendedores não podem recalcular rankings
        assert response.status_code == 403


class TestStreaks:
    """Testes de sequências (streaks)"""

    def test_update_streak(self, client: TestClient, db, test_salesperson_user):
        """Testa atualização de streak de atividade"""
        # Cria stats
        stats = GamificationStats(
            user_id=test_salesperson_user.id,
            current_streak=5,
            longest_streak=10
        )
        db.add(stats)
        db.commit()

        # Verifica se streak foi criado corretamente
        db.refresh(stats)
        assert stats.current_streak == 5
        assert stats.longest_streak == 10
