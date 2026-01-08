"""
Gamification Service - Lógica de negócio de gamificação.
Gerencia pontos, badges e rankings com regras de negócio.
"""
from typing import Optional, List, Tuple
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.repositories.gamification_repository import GamificationRepository
from app.schemas.gamification import (
    GamificationPointCreate,
    GamificationPointResponse,
    BadgeCreate,
    BadgeUpdate,
    BadgeResponse,
    UserBadgeCreate,
    UserBadgeResponse,
    RankingResponse,
    RankingListResponse,
    UserGamificationSummary,
    ActionType,
    ACTION_POINTS
)
from app.models.user import User
from app.models.gamification_badge import GamificationBadge
from app.models.user_badge import UserBadge


class GamificationService:
    """
    Service para lógica de negócio de gamificação.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = GamificationRepository(db)

    # ========== PONTOS ==========

    def award_points(
        self,
        user_id: int,
        reason: str,
        description: Optional[str] = None,
        custom_points: Optional[int] = None
    ) -> GamificationPointResponse:
        """
        Atribui pontos a um usuário por uma ação.

        Args:
            user_id: ID do usuário
            reason: Tipo de ação
            description: Descrição da ação
            custom_points: Pontos customizados (sobrescreve padrão)

        Returns:
            GamificationPointResponse
        """
        # Determina quantidade de pontos
        points = custom_points if custom_points is not None else ACTION_POINTS.get(reason, 0)

        if points == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de ação '{reason}' não configurado ou sem pontos"
            )

        # Cria registro de pontos
        point_data = GamificationPointCreate(
            user_id=user_id,
            points=points,
            reason=reason,
            description=description
        )
        point = self.repository.create_point(point_data)

        # Verifica se o usuário conquistou algum badge baseado em pontos
        self._check_and_award_point_badges(user_id)

        return GamificationPointResponse(
            id=point.id,
            user_id=point.user_id,
            points=point.points,
            reason=point.reason,
            description=point.description,
            created_at=point.created_at
        )

    def get_user_total_points(self, user_id: int) -> int:
        """
        Obtém total de pontos de um usuário.

        Args:
            user_id: ID do usuário

        Returns:
            Total de pontos
        """
        return self.repository.get_user_total_points(user_id)

    # ========== BADGES ==========

    def create_badge(self, badge_data: BadgeCreate, current_user: User) -> BadgeResponse:
        """
        Cria um novo badge (apenas admin).

        Args:
            badge_data: Dados do badge
            current_user: Usuário autenticado

        Returns:
            BadgeResponse
        """
        # Verifica se é do mesmo account
        if badge_data.account_id != current_user.account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode criar badges para outra conta"
            )

        badge = self.repository.create_badge(badge_data)

        return BadgeResponse(
            id=badge.id,
            account_id=badge.account_id,
            name=badge.name,
            description=badge.description,
            icon_url=badge.icon_url,
            criteria_type=badge.criteria_type,
            criteria=badge.criteria,
            created_at=badge.created_at
        )

    def list_badges(self, account_id: int, page: int = 1, page_size: int = 50) -> List[BadgeResponse]:
        """
        Lista badges de uma conta.

        Args:
            account_id: ID da conta
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Lista de BadgeResponse
        """
        skip = (page - 1) * page_size
        badges = self.repository.list_badges_by_account(account_id, skip, page_size)

        return [
            BadgeResponse(
                id=badge.id,
                account_id=badge.account_id,
                name=badge.name,
                description=badge.description,
                icon_url=badge.icon_url,
                criteria_type=badge.criteria_type,
                criteria=badge.criteria,
                created_at=badge.created_at
            )
            for badge in badges
        ]

    def award_badge_to_user(
        self,
        user_id: int,
        badge_id: int,
        current_user: User
    ) -> UserBadgeResponse:
        """
        Atribui um badge a um usuário.

        Args:
            user_id: ID do usuário
            badge_id: ID do badge
            current_user: Usuário que está atribuindo

        Returns:
            UserBadgeResponse
        """
        # Verifica se o badge existe
        badge = self.repository.find_badge_by_id(badge_id)
        if not badge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Badge não encontrado"
            )

        # Verifica se o badge pertence à mesma conta
        if badge.account_id != current_user.account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Badge pertence a outra conta"
            )

        # Verifica se o usuário existe e pertence à mesma conta
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )

        if user.account_id != current_user.account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário pertence a outra conta"
            )

        # Verifica se o usuário já tem o badge
        if self.repository.user_has_badge(user_id, badge_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário já possui este badge"
            )

        # Atribui o badge
        user_badge = self.repository.award_badge(user_id, badge_id, current_user.id)

        return UserBadgeResponse(
            id=user_badge.id,
            user_id=user_badge.user_id,
            badge_id=user_badge.badge_id,
            awarded_at=user_badge.awarded_at,
            awarded_by_id=user_badge.awarded_by_id,
            badge_name=badge.name,
            badge_description=badge.description,
            badge_icon=badge.icon_url
        )

    def _check_and_award_point_badges(self, user_id: int) -> None:
        """
        Verifica e atribui badges automaticamente baseados em pontos.

        Args:
            user_id: ID do usuário
        """
        # Obtém total de pontos do usuário
        total_points = self.repository.get_user_total_points(user_id)

        # Busca usuário para pegar account_id
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return

        # Busca badges automáticos da conta
        badges = self.repository.list_badges_by_account(user.account_id, skip=0, limit=1000)

        for badge in badges:
            # TODO: Implementar lógica de avaliação de critérios JSON
            # Por enquanto, apenas badges manuais são suportados
            if badge.criteria_type == "automatic" and badge.criteria:
                # Verifica se é um badge baseado em pontos
                if badge.criteria.get("field") == "total_points":
                    required_points = badge.criteria.get("value", 0)
                    operator = badge.criteria.get("operator", ">=")

                    if operator == ">=" and total_points >= required_points:
                        # Verifica se o usuário já tem o badge
                        if not self.repository.user_has_badge(user_id, badge.id):
                            # Atribui automaticamente
                            self.repository.award_badge(user_id, badge.id, awarded_by_id=None)

    def get_user_badges(self, user_id: int, account_id: int) -> List[UserBadgeResponse]:
        """
        Lista badges de um usuário.

        Args:
            user_id: ID do usuário
            account_id: ID da conta

        Returns:
            Lista de UserBadgeResponse
        """
        # Verifica se o usuário pertence à conta
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or user.account_id != account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )

        user_badges = self.repository.list_user_badges(user_id)

        result = []
        for ub in user_badges:
            badge = self.repository.find_badge_by_id(ub.badge_id)
            result.append(
                UserBadgeResponse(
                    id=ub.id,
                    user_id=ub.user_id,
                    badge_id=ub.badge_id,
                    awarded_at=ub.awarded_at,
                    awarded_by_id=ub.awarded_by_id,
                    badge_name=badge.name if badge else None,
                    badge_description=badge.description if badge else None,
                    badge_icon=badge.icon_url if badge else None
                )
            )

        return result

    # ========== RANKINGS ==========

    def _get_period_dates(self, period_type: str) -> Tuple[datetime, datetime]:
        """
        Calcula início e fim do período atual.

        Args:
            period_type: Tipo de período (weekly, monthly, quarterly, annual)

        Returns:
            Tupla (period_start, period_end)
        """
        now = datetime.utcnow()

        if period_type == "weekly":
            # Semana: segunda a domingo
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)

        elif period_type == "monthly":
            # Mês atual
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            # Último dia do mês
            if now.month == 12:
                end = now.replace(month=12, day=31, hour=23, minute=59, second=59)
            else:
                next_month = now.replace(month=now.month + 1, day=1)
                end = next_month - timedelta(seconds=1)

        elif period_type == "quarterly":
            # Trimestre atual (Q1: jan-mar, Q2: abr-jun, Q3: jul-set, Q4: out-dez)
            quarter = (now.month - 1) // 3
            start_month = quarter * 3 + 1
            start = now.replace(month=start_month, day=1, hour=0, minute=0, second=0, microsecond=0)

            end_month = start_month + 2
            if end_month == 12:
                end = now.replace(month=12, day=31, hour=23, minute=59, second=59)
            else:
                next_quarter = now.replace(month=end_month + 1, day=1)
                end = next_quarter - timedelta(seconds=1)

        elif period_type == "annual":
            # Ano atual
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now.replace(month=12, day=31, hour=23, minute=59, second=59)

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de período inválido"
            )

        return start, end

    def calculate_rankings(self, account_id: int, period_type: str) -> RankingListResponse:
        """
        Calcula rankings para um período.

        Args:
            account_id: ID da conta
            period_type: Tipo de período (weekly, monthly, quarterly, annual)

        Returns:
            RankingListResponse
        """
        period_start, period_end = self._get_period_dates(period_type)

        # Deleta rankings antigos deste período
        self.repository.delete_rankings_by_period(account_id, period_type, period_start, period_end)

        # Busca todos os usuários da conta
        users = self.db.query(User).filter(
            User.account_id == account_id,
            User.is_deleted == False
        ).all()

        # Calcula pontos de cada usuário no período
        user_points = []
        for user in users:
            points = self.repository.get_user_points_by_period(
                user.id, period_start, period_end
            )
            if points > 0:  # Só inclui usuários com pontos
                user_points.append((user.id, points, user.name))

        # Ordena por pontos (decrescente)
        user_points.sort(key=lambda x: x[1], reverse=True)

        # Cria rankings
        rankings = []
        for position, (user_id, points, user_name) in enumerate(user_points, start=1):
            ranking = self.repository.create_ranking(
                user_id=user_id,
                account_id=account_id,
                period_type=period_type,
                period_start=period_start,
                period_end=period_end,
                total_points=points,
                rank_position=position
            )

            rankings.append(
                RankingResponse(
                    id=ranking.id,
                    user_id=ranking.user_id,
                    account_id=ranking.account_id,
                    period_type=ranking.period_type,
                    period_start=ranking.period_start,
                    period_end=ranking.period_end,
                    total_points=ranking.points,
                    rank_position=ranking.rank,
                    user_name=user_name
                )
            )

        return RankingListResponse(
            rankings=rankings,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end
        )

    def get_rankings(self, account_id: int, period_type: str, limit: int = 100) -> RankingListResponse:
        """
        Obtém rankings de um período (calcula se não existir).

        Args:
            account_id: ID da conta
            period_type: Tipo de período
            limit: Limite de resultados

        Returns:
            RankingListResponse
        """
        period_start, period_end = self._get_period_dates(period_type)

        # Busca rankings existentes
        rankings = self.repository.list_rankings_by_period(
            account_id, period_type, period_start, period_end, limit
        )

        # Se não existir, calcula
        if not rankings:
            return self.calculate_rankings(account_id, period_type)

        # Converte para response
        rankings_response = []
        for ranking in rankings:
            user = self.db.query(User).filter(User.id == ranking.user_id).first()
            rankings_response.append(
                RankingResponse(
                    id=ranking.id,
                    user_id=ranking.user_id,
                    account_id=ranking.account_id,
                    period_type=ranking.period_type,
                    period_start=ranking.period_start,
                    period_end=ranking.period_end,
                    total_points=ranking.points,
                    rank_position=ranking.rank,
                    user_name=user.name if user else None
                )
            )

        return RankingListResponse(
            rankings=rankings_response,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end
        )

    # ========== RESUMO DO USUÁRIO ==========

    def get_user_summary(self, user_id: int, account_id: int) -> UserGamificationSummary:
        """
        Obtém resumo completo de gamificação do usuário.

        Args:
            user_id: ID do usuário
            account_id: ID da conta

        Returns:
            UserGamificationSummary
        """
        # Verifica acesso
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or user.account_id != account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )

        # Total de pontos
        total_points = self.repository.get_user_total_points(user_id)

        # Badges
        badges = self.get_user_badges(user_id, account_id)

        # Pontos da semana atual
        week_start, week_end = self._get_period_dates("weekly")
        current_week_points = self.repository.get_user_points_by_period(user_id, week_start, week_end)

        # Pontos do mês atual
        month_start, month_end = self._get_period_dates("monthly")
        current_month_points = self.repository.get_user_points_by_period(user_id, month_start, month_end)

        # Rankings
        weekly_rank = self.repository.get_user_rank_in_period(user_id, "weekly", week_start, week_end)
        monthly_rank = self.repository.get_user_rank_in_period(user_id, "monthly", month_start, month_end)

        quarter_start, quarter_end = self._get_period_dates("quarterly")
        quarterly_rank = self.repository.get_user_rank_in_period(user_id, "quarterly", quarter_start, quarter_end)

        annual_start, annual_end = self._get_period_dates("annual")
        annual_rank = self.repository.get_user_rank_in_period(user_id, "annual", annual_start, annual_end)

        return UserGamificationSummary(
            user_id=user_id,
            user_name=user.name,
            total_points=total_points,
            badges=badges,
            current_week_points=current_week_points,
            current_month_points=current_month_points,
            weekly_rank=weekly_rank,
            monthly_rank=monthly_rank,
            quarterly_rank=quarterly_rank,
            annual_rank=annual_rank
        )
