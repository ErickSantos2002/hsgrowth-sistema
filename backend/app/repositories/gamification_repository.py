"""
Gamification Repository - Acesso a dados de gamificação.
Gerencia pontos, badges e rankings.
"""
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.models.gamification_point import GamificationPoint
from app.models.gamification_badge import GamificationBadge
from app.models.user_badge import UserBadge
from app.models.gamification_ranking import GamificationRanking
from app.schemas.gamification import (
    GamificationPointCreate,
    BadgeCreate,
    BadgeUpdate,
    UserBadgeCreate
)


class GamificationRepository:
    """
    Repository para operações de gamificação.
    """

    def __init__(self, db: Session):
        self.db = db

    # ========== PONTOS ==========

    def create_point(self, point_data: GamificationPointCreate) -> GamificationPoint:
        """
        Cria um novo registro de pontos.

        Args:
            point_data: Dados do ponto

        Returns:
            GamificationPoint criado
        """
        point = GamificationPoint(**point_data.model_dump())
        self.db.add(point)
        self.db.commit()
        self.db.refresh(point)
        return point

    def get_user_total_points(self, user_id: int) -> int:
        """
        Calcula total de pontos de um usuário.

        Args:
            user_id: ID do usuário

        Returns:
            Total de pontos
        """
        result = self.db.query(func.sum(GamificationPoint.points)).filter(
            GamificationPoint.user_id == user_id
        ).scalar()
        return result or 0

    def get_user_points_by_period(
        self,
        user_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> int:
        """
        Calcula pontos de um usuário em um período.

        Args:
            user_id: ID do usuário
            start_date: Data inicial
            end_date: Data final

        Returns:
            Total de pontos no período
        """
        result = self.db.query(func.sum(GamificationPoint.points)).filter(
            and_(
                GamificationPoint.user_id == user_id,
                GamificationPoint.created_at >= start_date,
                GamificationPoint.created_at <= end_date
            )
        ).scalar()
        return result or 0

    def list_user_points(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[GamificationPoint]:
        """
        Lista pontos de um usuário.

        Args:
            user_id: ID do usuário
            skip: Paginação - offset
            limit: Paginação - limite

        Returns:
            Lista de GamificationPoint
        """
        return self.db.query(GamificationPoint).filter(
            GamificationPoint.user_id == user_id
        ).order_by(GamificationPoint.created_at.desc()).offset(skip).limit(limit).all()

    # ========== BADGES ==========

    def create_badge(self, badge_data: BadgeCreate) -> GamificationBadge:
        """
        Cria um novo badge.

        Args:
            badge_data: Dados do badge

        Returns:
            GamificationBadge criado
        """
        badge = GamificationBadge(**badge_data.model_dump())
        self.db.add(badge)
        self.db.commit()
        self.db.refresh(badge)
        return badge

    def find_badge_by_id(self, badge_id: int) -> Optional[GamificationBadge]:
        """
        Busca um badge por ID.

        Args:
            badge_id: ID do badge

        Returns:
            GamificationBadge ou None
        """
        return self.db.query(GamificationBadge).filter(
            GamificationBadge.id == badge_id
        ).first()

    def list_badges_by_account(
        self,
        account_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[GamificationBadge]:
        """
        Lista badges de uma conta.

        Args:
            account_id: ID da conta
            skip: Paginação - offset
            limit: Paginação - limite

        Returns:
            Lista de GamificationBadge
        """
        return self.db.query(GamificationBadge).filter(
            GamificationBadge.account_id == account_id
        ).offset(skip).limit(limit).all()

    def count_badges_by_account(self, account_id: int) -> int:
        """
        Conta badges de uma conta.

        Args:
            account_id: ID da conta

        Returns:
            Total de badges
        """
        return self.db.query(GamificationBadge).filter(
            GamificationBadge.account_id == account_id
        ).count()

    def update_badge(self, badge: GamificationBadge, badge_data: BadgeUpdate) -> GamificationBadge:
        """
        Atualiza um badge.

        Args:
            badge: Badge a atualizar
            badge_data: Dados de atualização

        Returns:
            Badge atualizado
        """
        update_data = badge_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(badge, field, value)
        self.db.commit()
        self.db.refresh(badge)
        return badge

    def delete_badge(self, badge: GamificationBadge) -> None:
        """
        Deleta um badge.

        Args:
            badge: Badge a deletar
        """
        self.db.delete(badge)
        self.db.commit()

    # ========== USER BADGES ==========

    def award_badge(
        self,
        user_id: int,
        badge_id: int,
        awarded_by_id: Optional[int] = None
    ) -> UserBadge:
        """
        Atribui um badge a um usuário.

        Args:
            user_id: ID do usuário
            badge_id: ID do badge
            awarded_by_id: ID do usuário que atribuiu (opcional)

        Returns:
            UserBadge criado
        """
        user_badge = UserBadge(
            user_id=user_id,
            badge_id=badge_id,
            awarded_by_id=awarded_by_id,
            awarded_at=datetime.utcnow()
        )
        self.db.add(user_badge)
        self.db.commit()
        self.db.refresh(user_badge)
        return user_badge

    def user_has_badge(self, user_id: int, badge_id: int) -> bool:
        """
        Verifica se usuário já possui um badge.

        Args:
            user_id: ID do usuário
            badge_id: ID do badge

        Returns:
            True se já possui, False caso contrário
        """
        return self.db.query(UserBadge).filter(
            and_(
                UserBadge.user_id == user_id,
                UserBadge.badge_id == badge_id
            )
        ).first() is not None

    def list_user_badges(self, user_id: int) -> List[UserBadge]:
        """
        Lista badges de um usuário.

        Args:
            user_id: ID do usuário

        Returns:
            Lista de UserBadge
        """
        return self.db.query(UserBadge).filter(
            UserBadge.user_id == user_id
        ).order_by(UserBadge.awarded_at.desc()).all()

    # ========== RANKINGS ==========

    def create_ranking(
        self,
        user_id: int,
        account_id: int,
        period_type: str,
        period_start: datetime,
        period_end: datetime,
        total_points: int,
        rank_position: int
    ) -> GamificationRanking:
        """
        Cria um registro de ranking.

        Args:
            user_id: ID do usuário
            account_id: ID da conta
            period_type: Tipo de período (weekly, monthly, quarterly, annual)
            period_start: Início do período
            period_end: Fim do período
            total_points: Total de pontos no período
            rank_position: Posição no ranking

        Returns:
            GamificationRanking criado
        """
        ranking = GamificationRanking(
            user_id=user_id,
            account_id=account_id,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end,
            total_points=total_points,
            rank_position=rank_position
        )
        self.db.add(ranking)
        self.db.commit()
        self.db.refresh(ranking)
        return ranking

    def find_ranking_by_user_and_period(
        self,
        user_id: int,
        period_type: str,
        period_start: datetime,
        period_end: datetime
    ) -> Optional[GamificationRanking]:
        """
        Busca ranking de um usuário em um período específico.

        Args:
            user_id: ID do usuário
            period_type: Tipo de período
            period_start: Início do período
            period_end: Fim do período

        Returns:
            GamificationRanking ou None
        """
        return self.db.query(GamificationRanking).filter(
            and_(
                GamificationRanking.user_id == user_id,
                GamificationRanking.period_type == period_type,
                GamificationRanking.period_start == period_start,
                GamificationRanking.period_end == period_end
            )
        ).first()

    def list_rankings_by_period(
        self,
        account_id: int,
        period_type: str,
        period_start: datetime,
        period_end: datetime,
        limit: int = 100
    ) -> List[GamificationRanking]:
        """
        Lista rankings de uma conta em um período.

        Args:
            account_id: ID da conta
            period_type: Tipo de período
            period_start: Início do período
            period_end: Fim do período
            limit: Limite de resultados

        Returns:
            Lista de GamificationRanking ordenada por rank_position
        """
        return self.db.query(GamificationRanking).filter(
            and_(
                GamificationRanking.account_id == account_id,
                GamificationRanking.period_type == period_type,
                GamificationRanking.period_start == period_start,
                GamificationRanking.period_end == period_end
            )
        ).order_by(GamificationRanking.rank_position.asc()).limit(limit).all()

    def get_user_rank_in_period(
        self,
        user_id: int,
        period_type: str,
        period_start: datetime,
        period_end: datetime
    ) -> Optional[int]:
        """
        Obtém a posição do usuário no ranking de um período.

        Args:
            user_id: ID do usuário
            period_type: Tipo de período
            period_start: Início do período
            period_end: Fim do período

        Returns:
            Posição no ranking ou None
        """
        ranking = self.find_ranking_by_user_and_period(
            user_id, period_type, period_start, period_end
        )
        return ranking.rank_position if ranking else None

    def delete_rankings_by_period(
        self,
        account_id: int,
        period_type: str,
        period_start: datetime,
        period_end: datetime
    ) -> None:
        """
        Deleta rankings de um período (usado para recalcular).

        Args:
            account_id: ID da conta
            period_type: Tipo de período
            period_start: Início do período
            period_end: Fim do período
        """
        self.db.query(GamificationRanking).filter(
            and_(
                GamificationRanking.account_id == account_id,
                GamificationRanking.period_type == period_type,
                GamificationRanking.period_start == period_start,
                GamificationRanking.period_end == period_end
            )
        ).delete()
        self.db.commit()
