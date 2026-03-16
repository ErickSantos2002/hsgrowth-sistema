"""
Gamification Repository - Acesso a dados de gamificação.
Gerencia pontos, badges e rankings separados por board_type.
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.gamification_point import GamificationPoint
from app.models.gamification_badge import GamificationBadge
from app.models.user_badge import UserBadge
from app.models.gamification_ranking import GamificationRanking
from app.models.gamification_action_points import GamificationActionPoints
from app.schemas.gamification import (
    GamificationPointCreate,
    BadgeCreate,
    BadgeUpdate,
    ActionPointsCreate,
    ActionPointsUpdate
)


class GamificationRepository:
    """
    Repository para operações de gamificação.
    Todas as queries de pontos e rankings suportam filtro por board_type.
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

    def get_user_total_points(self, user_id: int, board_type: Optional[str] = None) -> int:
        """
        Calcula total de pontos de um usuário, opcionalmente filtrado por board.

        Args:
            user_id: ID do usuário
            board_type: Filtrar por board (prospecting/acquisition). None = todos.

        Returns:
            Total de pontos
        """
        query = self.db.query(func.sum(GamificationPoint.points)).filter(
            GamificationPoint.user_id == user_id
        )
        if board_type:
            query = query.filter(GamificationPoint.board_type == board_type)
        result = query.scalar()
        return result or 0

    def get_user_points_by_period(
        self,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        board_type: Optional[str] = None
    ) -> int:
        """
        Calcula pontos de um usuário em um período, opcionalmente filtrado por board.

        Args:
            user_id: ID do usuário
            start_date: Data inicial
            end_date: Data final
            board_type: Filtrar por board. None = todos.

        Returns:
            Total de pontos no período
        """
        filters = [
            GamificationPoint.user_id == user_id,
            GamificationPoint.created_at >= start_date,
            GamificationPoint.created_at <= end_date
        ]
        if board_type:
            filters.append(GamificationPoint.board_type == board_type)

        result = self.db.query(func.sum(GamificationPoint.points)).filter(
            and_(*filters)
        ).scalar()
        return result or 0

    def count_user_actions(
        self,
        user_id: int,
        action_type: str,
        board_type: Optional[str] = None
    ) -> int:
        """
        Conta quantas vezes um usuário realizou uma determinada ação.
        Usado para critérios de badge do tipo action_count.

        Args:
            user_id: ID do usuário
            action_type: Tipo de ação
            board_type: Filtrar por board (opcional)

        Returns:
            Quantidade de ocorrências da ação
        """
        filters = [
            GamificationPoint.user_id == user_id,
            GamificationPoint.reason == action_type,
            GamificationPoint.is_commission == False  # noqa: E712 — só ações primárias
        ]
        if board_type:
            filters.append(GamificationPoint.board_type == board_type)

        return self.db.query(func.count(GamificationPoint.id)).filter(
            and_(*filters)
        ).scalar() or 0

    def list_user_points(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        reason: Optional[str] = None,
        board_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[GamificationPoint]:
        """
        Lista pontos de um usuário com filtros opcionais.
        """
        query = self.db.query(GamificationPoint).filter(
            GamificationPoint.user_id == user_id
        )
        if reason:
            query = query.filter(GamificationPoint.reason == reason)
        if board_type:
            query = query.filter(GamificationPoint.board_type == board_type)
        if date_from:
            query = query.filter(GamificationPoint.created_at >= date_from)
        if date_to:
            query = query.filter(GamificationPoint.created_at <= date_to)
        return query.order_by(GamificationPoint.created_at.desc()).offset(skip).limit(limit).all()

    def count_user_points(
        self,
        user_id: int,
        reason: Optional[str] = None,
        board_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> int:
        """
        Conta o total de registros de pontos de um usuário.
        """
        query = self.db.query(func.count(GamificationPoint.id)).filter(
            GamificationPoint.user_id == user_id
        )
        if reason:
            query = query.filter(GamificationPoint.reason == reason)
        if board_type:
            query = query.filter(GamificationPoint.board_type == board_type)
        if date_from:
            query = query.filter(GamificationPoint.created_at >= date_from)
        if date_to:
            query = query.filter(GamificationPoint.created_at <= date_to)
        return query.scalar() or 0

    def list_all_points(
        self,
        skip: int = 0,
        limit: int = 100,
        reason: Optional[str] = None,
        user_id: Optional[int] = None,
        board_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[GamificationPoint]:
        """
        Lista pontos de todos os usuários com filtros opcionais.
        """
        query = self.db.query(GamificationPoint)
        if reason:
            query = query.filter(GamificationPoint.reason == reason)
        if user_id:
            query = query.filter(GamificationPoint.user_id == user_id)
        if board_type:
            query = query.filter(GamificationPoint.board_type == board_type)
        if date_from:
            query = query.filter(GamificationPoint.created_at >= date_from)
        if date_to:
            query = query.filter(GamificationPoint.created_at <= date_to)
        return query.order_by(GamificationPoint.created_at.desc()).offset(skip).limit(limit).all()

    def count_all_points(
        self,
        reason: Optional[str] = None,
        user_id: Optional[int] = None,
        board_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> int:
        """
        Conta o total de registros de pontos com filtros opcionais.
        """
        query = self.db.query(func.count(GamificationPoint.id))
        if reason:
            query = query.filter(GamificationPoint.reason == reason)
        if user_id:
            query = query.filter(GamificationPoint.user_id == user_id)
        if board_type:
            query = query.filter(GamificationPoint.board_type == board_type)
        if date_from:
            query = query.filter(GamificationPoint.created_at >= date_from)
        if date_to:
            query = query.filter(GamificationPoint.created_at <= date_to)
        return query.scalar() or 0

    # ========== BADGES ==========

    def create_badge(self, badge_data: BadgeCreate) -> GamificationBadge:
        """Cria um novo badge."""
        badge = GamificationBadge(**badge_data.model_dump())
        self.db.add(badge)
        self.db.commit()
        self.db.refresh(badge)
        return badge

    def find_badge_by_id(self, badge_id: int) -> Optional[GamificationBadge]:
        """
        Busca um badge por ID — inclui badges soft-deleted para
        manter referências em user_badges.
        """
        return self.db.query(GamificationBadge).filter(
            GamificationBadge.id == badge_id
        ).first()

    def list_all_badges(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        include_deleted: bool = False
    ) -> List[GamificationBadge]:
        """
        Lista badges do sistema.

        Args:
            skip: Paginação - offset
            limit: Paginação - limite
            is_active: Filtrar por status ativo (opcional)
            include_deleted: Se True, inclui badges com deleted_at preenchido
        """
        query = self.db.query(GamificationBadge)

        if not include_deleted:
            query = query.filter(GamificationBadge.deleted_at.is_(None))

        if is_active is not None:
            query = query.filter(GamificationBadge.is_active == is_active)

        return query.offset(skip).limit(limit).all()

    def count_all_badges(
        self,
        is_active: Optional[bool] = None,
        include_deleted: bool = False
    ) -> int:
        """Conta badges do sistema."""
        query = self.db.query(GamificationBadge)

        if not include_deleted:
            query = query.filter(GamificationBadge.deleted_at.is_(None))

        if is_active is not None:
            query = query.filter(GamificationBadge.is_active == is_active)

        return query.count()

    def update_badge(self, badge: GamificationBadge, badge_data: BadgeUpdate) -> GamificationBadge:
        """Atualiza um badge."""
        update_data = badge_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(badge, field, value)
        self.db.commit()
        self.db.refresh(badge)
        return badge

    def soft_delete_badge(self, badge: GamificationBadge) -> None:
        """
        Faz soft delete de um badge — preenche deleted_at com a data atual.
        Preserva o histórico de user_badges dos usuários que já conquistaram.
        """
        badge.deleted_at = datetime.utcnow()
        badge.is_active = False
        self.db.commit()

    # ========== USER BADGES ==========

    def award_badge(
        self,
        user_id: int,
        badge_id: int,
        awarded_by_id: Optional[int] = None
    ) -> UserBadge:
        """Atribui um badge a um usuário."""
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
        """Verifica se usuário já possui um badge."""
        return self.db.query(UserBadge).filter(
            and_(
                UserBadge.user_id == user_id,
                UserBadge.badge_id == badge_id
            )
        ).first() is not None

    def list_user_badges(self, user_id: int) -> List[UserBadge]:
        """Lista badges de um usuário."""
        return self.db.query(UserBadge).filter(
            UserBadge.user_id == user_id
        ).order_by(UserBadge.awarded_at.desc()).all()

    # ========== RANKINGS ==========

    def create_ranking(
        self,
        user_id: int,
        board_type: str,
        period_type: str,
        period_start: datetime,
        period_end: datetime,
        total_points: int,
        rank_position: int
    ) -> GamificationRanking:
        """
        Cria um registro de ranking para um usuário em um board e período.

        Args:
            user_id: ID do usuário
            board_type: Board do ranking (prospecting/acquisition)
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
            board_type=board_type,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end,
            points=total_points,
            rank=rank_position
        )
        self.db.add(ranking)
        self.db.commit()
        self.db.refresh(ranking)
        return ranking

    def find_ranking_by_user_period_board(
        self,
        user_id: int,
        board_type: str,
        period_type: str,
        period_start: datetime,
    ) -> Optional[GamificationRanking]:
        """
        Busca posição de um usuário em um ranking específico.

        Args:
            user_id: ID do usuário
            board_type: Board do ranking
            period_type: Tipo de período
            period_start: Início do período

        Returns:
            GamificationRanking ou None
        """
        return self.db.query(GamificationRanking).filter(
            and_(
                GamificationRanking.user_id == user_id,
                GamificationRanking.board_type == board_type,
                GamificationRanking.period_type == period_type,
                GamificationRanking.period_start == period_start
            )
        ).first()

    def list_rankings_by_board_period(
        self,
        board_type: str,
        period_type: str,
        period_start: datetime,
        limit: int = 100
    ) -> List[GamificationRanking]:
        """
        Lista rankings de um board e período, ordenados por posição.

        Args:
            board_type: Board do ranking
            period_type: Tipo de período
            period_start: Início do período
            limit: Limite de resultados

        Returns:
            Lista de GamificationRanking ordenada por rank
        """
        return self.db.query(GamificationRanking).filter(
            and_(
                GamificationRanking.board_type == board_type,
                GamificationRanking.period_type == period_type,
                GamificationRanking.period_start == period_start
            )
        ).order_by(GamificationRanking.rank.asc()).limit(limit).all()

    def get_user_rank_in_period(
        self,
        user_id: int,
        board_type: str,
        period_type: str,
        period_start: datetime,
        period_end: datetime
    ) -> Optional[int]:
        """
        Obtém a posição do usuário no ranking de um board e período.

        Returns:
            Posição no ranking ou None se o usuário não aparece no ranking
        """
        ranking = self.find_ranking_by_user_period_board(
            user_id, board_type, period_type, period_start
        )
        return ranking.rank if ranking else None

    def delete_rankings_by_board_period(
        self,
        board_type: str,
        period_type: str,
        period_start: datetime,
    ) -> None:
        """
        Deleta rankings de um board e período para recalcular.

        Args:
            board_type: Board do ranking
            period_type: Tipo de período
            period_start: Início do período
        """
        self.db.query(GamificationRanking).filter(
            and_(
                GamificationRanking.board_type == board_type,
                GamificationRanking.period_type == period_type,
                GamificationRanking.period_start == period_start
            )
        ).delete()
        self.db.commit()

    # ========== ACTION POINTS CONFIGURATION ==========

    def list_all_action_points(self, board_type: Optional[str] = None) -> List[GamificationActionPoints]:
        """
        Lista configurações de pontos por ação.

        Args:
            board_type: Filtrar por board (opcional). None = todos.
        """
        query = self.db.query(GamificationActionPoints)
        if board_type:
            query = query.filter(GamificationActionPoints.board_type == board_type)
        return query.order_by(
            GamificationActionPoints.board_type,
            GamificationActionPoints.action_type
        ).all()

    def find_action_points(self, board_type: str, action_type: str) -> Optional[GamificationActionPoints]:
        """
        Busca configuração de pontos para um par (board_type, action_type).

        Args:
            board_type: Board da ação
            action_type: Tipo de ação

        Returns:
            GamificationActionPoints ou None
        """
        return self.db.query(GamificationActionPoints).filter(
            and_(
                GamificationActionPoints.board_type == board_type,
                GamificationActionPoints.action_type == action_type
            )
        ).first()

    def get_points_for_action(self, board_type: str, action_type: str) -> int:
        """
        Retorna quantos pontos vale uma ação em um board específico.
        Consulta o banco de dados — nunca usa dict hardcoded.

        Args:
            board_type: Board da ação
            action_type: Tipo de ação

        Returns:
            Quantidade de pontos (0 se não encontrado, inativo, ou board sem config)
        """
        config = self.find_action_points(board_type, action_type)
        if config and config.is_active:
            return config.points
        return 0

    def create_action_points(self, action_data: ActionPointsCreate) -> GamificationActionPoints:
        """Cria nova configuração de pontos para um par (board_type, action_type)."""
        action_points = GamificationActionPoints(**action_data.model_dump())
        self.db.add(action_points)
        self.db.commit()
        self.db.refresh(action_points)
        return action_points

    def update_action_points(
        self,
        action_points: GamificationActionPoints,
        action_data: ActionPointsUpdate
    ) -> GamificationActionPoints:
        """Atualiza configuração de pontos."""
        update_data = action_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(action_points, field, value)
        self.db.commit()
        self.db.refresh(action_points)
        return action_points
