"""
Gamification Service - Lógica de negócio de gamificação v2.
Pontuação por board_type, comissão entre usuários, rankings separados por board.
"""
from typing import Optional, List, Tuple
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.gamification_repository import GamificationRepository
from app.repositories.notification_repository import NotificationRepository
from app.schemas.gamification import (
    GamificationPointCreate,
    GamificationPointResponse,
    BadgeCreate,
    BadgeUpdate,
    BadgeResponse,
    UserBadgeResponse,
    RankingResponse,
    RankingListResponse,
    UserGamificationSummary,
    BoardPointsSummary,
    ActionPointsCreate,
    ActionPointsUpdate,
    ActionPointsResponse,
    ActionType
)
from app.models.user import User
from app.models.gamification_badge import GamificationBadge
from app.models.user_badge import UserBadge


# Roles que participam dos rankings
RANKING_ELIGIBLE_ROLES = {"salesperson", "sdr"}


class GamificationService:
    """
    Service para lógica de negócio de gamificação v2.

    Principais mudanças em relação à versão anterior:
    - Pontos lidos do banco de dados (não mais dict hardcoded)
    - Separação por board_type (prospecting / acquisition)
    - Sistema de comissão entre SDR e Vendedor
    - Rankings por board, calculados via scheduler (não por request)
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = GamificationRepository(db)
        self.notification_repository = NotificationRepository(db)

    # ========== MÉTODOS AUXILIARES ==========

    def _create_gamification_notification(
        self,
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        metadata: Optional[dict] = None
    ) -> None:
        """
        Cria uma notificação de gamificação para um usuário.
        Falhas são silenciosas — não interrompem o fluxo principal.
        """
        try:
            notification_data = {
                "user_id": user_id,
                "notification_type": notification_type,
                "title": title,
                "message": message,
                "icon": "trophy",
                "color": "success",
                "notification_metadata": metadata or {}
            }
            self.notification_repository.create(notification_data)
        except Exception as e:
            print(f"[GAMIFICATION] Erro ao criar notificação: {e}")

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
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)

        elif period_type == "monthly":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end = now.replace(month=12, day=31, hour=23, minute=59, second=59)
            else:
                next_month = now.replace(month=now.month + 1, day=1)
                end = next_month - timedelta(seconds=1)

        elif period_type == "quarterly":
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
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now.replace(month=12, day=31, hour=23, minute=59, second=59)

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de período inválido. Use: weekly, monthly, quarterly, annual"
            )

        return start, end

    # ========== PONTOS ==========

    def award_points(
        self,
        user_id: int,
        action_type: str,
        board_type: str,
        description: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None,
    ) -> Optional[GamificationPointResponse]:
        """
        Atribui pontos a um usuário por uma ação em um board.

        Consulta a tabela gamification_action_points no banco — nunca usa
        dict hardcoded. Se a ação não estiver configurada ou inativa, retorna None
        silenciosamente (não levanta exceção).

        Args:
            user_id: ID do usuário que receberá os pontos
            action_type: Tipo de ação (ex: card_won, meeting_completed)
            board_type: Board onde a ação aconteceu (prospecting/acquisition)
            description: Descrição legível da ação
            related_entity_type: Tipo da entidade relacionada (Card, Task, etc.)
            related_entity_id: ID da entidade relacionada

        Returns:
            GamificationPointResponse ou None se a ação não pontua
        """
        # Consulta pontos configurados no banco — P1 bug fix
        points = self.repository.get_points_for_action(board_type, action_type)

        if points == 0:
            # Ação não configurada ou inativa — ignora silenciosamente
            return None

        point_data = GamificationPointCreate(
            user_id=user_id,
            board_type=board_type,
            points=points,
            reason=action_type,
            description=description,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )
        point = self.repository.create_point(point_data)

        # Verifica badges automáticos após pontuar
        self._check_and_award_badges(user_id)

        return GamificationPointResponse(
            id=point.id,
            user_id=point.user_id,
            board_type=point.board_type,
            points=point.points,
            reason=point.reason,
            description=point.description,
            is_commission=point.is_commission,
            created_at=point.created_at
        )

    def award_points_with_commission(
        self,
        primary_user_id: int,
        commission_user_id: int,
        action_type: str,
        board_type: str,
        commission_ratio: str,
        description: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None,
    ) -> None:
        """
        Atribui pontos com split de comissão entre dois usuários.

        O usuário primário (ex: Vendedor) recebe a fração maior.
        O usuário de comissão (ex: SDR) recebe a fração menor no board Prospecção.
        São gerados dois registros separados em gamification_points.

        Args:
            primary_user_id: Usuário que realizou a ação (recebe fração maior)
            commission_user_id: Usuário que recebe comissão (recebe fração menor)
            action_type: Tipo de ação (card_won, meeting_completed)
            board_type: Board da ação primária (sempre acquisition)
            commission_ratio: Fração da comissão ('1/4', '1/3')
            description: Descrição da ação
            related_entity_type: Tipo da entidade
            related_entity_id: ID da entidade
        """
        # Calcula o total configurado no banco
        total_points = self.repository.get_points_for_action(board_type, action_type)
        if total_points == 0:
            return  # Ação não configurada — ignora

        # Calcula os splits conforme o ratio
        numerator, denominator = map(int, commission_ratio.split("/"))
        commission_points = round(total_points * numerator / denominator)
        primary_points = total_points - commission_points

        # Registro do usuário primário (pontuação reduzida pela comissão)
        primary_data = GamificationPointCreate(
            user_id=primary_user_id,
            board_type=board_type,
            points=primary_points,
            reason=action_type,
            description=description,
            is_commission=False,
            original_points=total_points,
            commission_ratio=f"{denominator - numerator}/{denominator}",
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )
        self.repository.create_point(primary_data)

        # Registro do SDR — comissão creditada no board Prospecção
        commission_data = GamificationPointCreate(
            user_id=commission_user_id,
            board_type="prospecting",  # Comissão do SDR vai para o board de prospecção
            points=commission_points,
            reason=action_type,
            description=f"Comissão ({commission_ratio}): {description}",
            is_commission=True,
            commission_source_user_id=primary_user_id,
            commission_ratio=commission_ratio,
            original_points=total_points,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )
        self.repository.create_point(commission_data)

        # Verifica badges para ambos os usuários
        self._check_and_award_badges(primary_user_id)
        self._check_and_award_badges(commission_user_id)

    def get_user_total_points(self, user_id: int, board_type: Optional[str] = None) -> int:
        """
        Obtém total de pontos de um usuário, opcionalmente por board.

        Args:
            user_id: ID do usuário
            board_type: Filtrar por board (opcional)

        Returns:
            Total de pontos
        """
        return self.repository.get_user_total_points(user_id, board_type=board_type)

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
        badge = self.repository.create_badge(badge_data)
        return self._badge_to_response(badge)

    def list_badges(self, page: int = 1, page_size: int = 50) -> List[BadgeResponse]:
        """
        Lista badges ativos do sistema (excluindo soft-deleted).

        Args:
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Lista de BadgeResponse
        """
        skip = (page - 1) * page_size
        badges = self.repository.list_all_badges(skip, page_size, include_deleted=False)
        return [self._badge_to_response(b) for b in badges]

    def get_badge_by_id(self, badge_id: int) -> BadgeResponse:
        """
        Busca um badge por ID.

        Args:
            badge_id: ID do badge

        Returns:
            BadgeResponse

        Raises:
            HTTPException: Se o badge não for encontrado
        """
        badge = self.repository.find_badge_by_id(badge_id)
        if not badge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Badge não encontrado"
            )
        return self._badge_to_response(badge)

    def update_badge(
        self,
        badge_id: int,
        badge_data: BadgeUpdate,
        current_user: User
    ) -> BadgeResponse:
        """
        Atualiza um badge existente (apenas admin).

        Args:
            badge_id: ID do badge
            badge_data: Dados para atualizar
            current_user: Usuário autenticado

        Returns:
            BadgeResponse
        """
        badge = self.repository.find_badge_by_id(badge_id)
        if not badge or badge.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Badge não encontrado"
            )

        updated_badge = self.repository.update_badge(badge, badge_data)
        return self._badge_to_response(updated_badge)

    def delete_badge(self, badge_id: int, current_user: User) -> dict:
        """
        Soft delete de um badge (apenas admin).
        Preserva histórico de user_badges dos usuários que já conquistaram.

        Args:
            badge_id: ID do badge
            current_user: Usuário autenticado

        Returns:
            Mensagem de sucesso
        """
        badge = self.repository.find_badge_by_id(badge_id)
        if not badge or badge.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Badge não encontrado"
            )

        self.repository.soft_delete_badge(badge)
        return {"message": "Badge deletado com sucesso"}

    def _badge_to_response(self, badge: GamificationBadge) -> BadgeResponse:
        """Converte modelo de badge para schema de resposta."""
        return BadgeResponse(
            id=badge.id,
            name=badge.name,
            description=badge.description,
            icon_url=badge.icon_url,
            criteria_type=badge.criteria_type,
            criteria=badge.criteria,
            is_active=badge.is_active,
            deleted_at=badge.deleted_at,
            created_at=badge.created_at
        )

    def award_badge_to_user(
        self,
        user_id: int,
        badge_id: int,
        current_user: User
    ) -> UserBadgeResponse:
        """
        Atribui um badge manualmente a um usuário (admin).

        Args:
            user_id: ID do usuário
            badge_id: ID do badge
            current_user: Usuário que está atribuindo

        Returns:
            UserBadgeResponse
        """
        badge = self.repository.find_badge_by_id(badge_id)
        if not badge or badge.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Badge não encontrado"
            )

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )

        if self.repository.user_has_badge(user_id, badge_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário já possui este badge"
            )

        user_badge = self.repository.award_badge(user_id, badge_id, current_user.id)

        self._create_gamification_notification(
            user_id=user_id,
            notification_type="badge_earned",
            title="Badge conquistado!",
            message=f"Parabéns! Você conquistou o badge '{badge.name}'",
            metadata={
                "badge_id": badge_id,
                "badge_name": badge.name,
                "badge_description": badge.description,
                "url": "/gamification"
            }
        )

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

    def _check_and_award_badges(self, user_id: int) -> None:
        """
        Verifica e atribui badges automáticos para um usuário.
        Avalia critérios: total_points, action_count, rank.

        Args:
            user_id: ID do usuário
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return

        # Busca apenas badges automáticos ativos e não deletados
        badges = self.repository.list_all_badges(skip=0, limit=1000, include_deleted=False)

        for badge in badges:
            if badge.criteria_type != "automatic" or not badge.criteria:
                continue

            if self.repository.user_has_badge(user_id, badge.id):
                continue

            # Avalia o critério JSON do badge
            if self._evaluate_badge_criteria(user_id, badge.criteria):
                self.repository.award_badge(user_id, badge.id, awarded_by_id=None)
                self._create_gamification_notification(
                    user_id=user_id,
                    notification_type="badge_earned",
                    title="Badge conquistado!",
                    message=f"Parabéns! Você conquistou o badge '{badge.name}'",
                    metadata={
                        "badge_id": badge.id,
                        "badge_name": badge.name,
                        "badge_description": badge.description,
                        "url": "/gamification"
                    }
                )

    def _evaluate_badge_criteria(self, user_id: int, criteria: dict) -> bool:
        """
        Avalia se um usuário atende os critérios de um badge automático.

        Critérios suportados:
          - total_points: pontos totais (com ou sem board_type)
          - action_count: contagem de ações realizadas
          - rank: posição em um ranking (verificado via tabela rankings)

        Args:
            user_id: ID do usuário
            criteria: Dicionário de critérios do badge

        Returns:
            True se o usuário atende os critérios, False caso contrário
        """
        field = criteria.get("field")
        operator = criteria.get("operator", ">=")
        value = criteria.get("value")
        board_type = criteria.get("board_type")  # Opcional

        if value is None:
            return False

        if field == "total_points":
            # Pontos totais do usuário (opcionalmente filtrado por board)
            actual = self.repository.get_user_total_points(user_id, board_type=board_type)

        elif field == "action_count":
            # Contagem de ações realizadas
            action_type = criteria.get("action_type")
            if not action_type:
                return False
            actual = self.repository.count_user_actions(user_id, action_type, board_type=board_type)

        elif field == "rank":
            # Posição no ranking — busca o ranking mais recente do período/board
            period = criteria.get("period", "monthly")
            if not board_type:
                return False
            period_start, period_end = self._get_period_dates(period)
            rank = self.repository.get_user_rank_in_period(
                user_id, board_type, period, period_start, period_end
            )
            if rank is None:
                return False  # Usuário não está no ranking
            actual = rank

        else:
            return False

        # Avalia o operador
        if operator == ">=":
            return actual >= value
        elif operator == "<=":
            return actual <= value
        elif operator == "==":
            return actual == value
        elif operator == ">":
            return actual > value
        elif operator == "<":
            return actual < value

        return False

    def get_user_badges(self, user_id: int) -> List[UserBadgeResponse]:
        """
        Lista badges de um usuário.

        Args:
            user_id: ID do usuário

        Returns:
            Lista de UserBadgeResponse
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
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

    def calculate_rankings_for_board(
        self,
        board_type: str,
        period_type: str
    ) -> RankingListResponse:
        """
        Calcula e persiste o ranking para um board e período específicos.
        Inclui apenas usuários com roles salesperson e sdr.

        Chamado pelo scheduler a cada hora — não é chamado por request de usuário.

        Args:
            board_type: Board do ranking (prospecting/acquisition)
            period_type: Tipo de período (weekly, monthly, quarterly, annual)

        Returns:
            RankingListResponse com rankings calculados
        """
        period_start, period_end = self._get_period_dates(period_type)

        # Remove rankings antigos do período para recalcular do zero
        self.repository.delete_rankings_by_board_period(board_type, period_type, period_start)

        # Busca usuários elegíveis (apenas salesperson e sdr) — filtra via join na tabela roles
        from app.models.role import Role
        eligible_users = self.db.query(User).join(Role, User.role_id == Role.id).filter(
            User.is_deleted == False,
            Role.name.in_(RANKING_ELIGIBLE_ROLES)
        ).all()

        # Calcula pontos de cada usuário no período e board
        user_points = []
        for user in eligible_users:
            points = self.repository.get_user_points_by_period(
                user.id, period_start, period_end, board_type=board_type
            )
            if points > 0:
                user_points.append((user.id, points, user.name, user.role.name if user.role else None))

        # Ordena por pontos (decrescente)
        user_points.sort(key=lambda x: x[1], reverse=True)

        # Persiste os rankings
        rankings = []
        for position, (user_id, points, user_name, user_role) in enumerate(user_points, start=1):
            ranking = self.repository.create_ranking(
                user_id=user_id,
                board_type=board_type,
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
                    board_type=ranking.board_type,
                    period_type=ranking.period_type,
                    period_start=ranking.period_start,
                    period_end=ranking.period_end,
                    total_points=ranking.points,
                    rank_position=ranking.rank,
                    user_name=user_name,
                    user_role=user_role
                )
            )

        return RankingListResponse(
            rankings=rankings,
            board_type=board_type,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end,
            last_calculated_at=datetime.utcnow()
        )

    def get_rankings(
        self,
        board_type: str,
        period_type: str,
        limit: int = 100
    ) -> RankingListResponse:
        """
        Retorna o ranking calculado mais recentemente para um board e período.
        Não recalcula em tempo real — lê o cache da tabela de rankings.

        Para forçar recálculo, use calculate_rankings_for_board().

        Args:
            board_type: Board do ranking (prospecting/acquisition)
            period_type: Tipo de período
            limit: Limite de resultados

        Returns:
            RankingListResponse com dados do último cálculo
        """
        period_start, period_end = self._get_period_dates(period_type)

        rankings_db = self.repository.list_rankings_by_board_period(
            board_type, period_type, period_start, limit=limit
        )

        rankings = []
        for r in rankings_db:
            user = self.db.query(User).filter(User.id == r.user_id).first()
            rankings.append(
                RankingResponse(
                    id=r.id,
                    user_id=r.user_id,
                    board_type=r.board_type,
                    period_type=r.period_type,
                    period_start=r.period_start,
                    period_end=r.period_end,
                    total_points=r.points,
                    rank_position=r.rank,
                    user_name=user.name if user else None,
                    user_role=user.role.name if user and user.role else None
                )
            )

        # Se não há rankings calculados, calcula agora e retorna
        if not rankings:
            return self.calculate_rankings_for_board(board_type, period_type)

        return RankingListResponse(
            rankings=rankings,
            board_type=board_type,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end,
            last_calculated_at=rankings_db[0].updated_at if rankings_db else None
        )

    # ========== RESUMO DO USUÁRIO ==========

    def get_user_summary(self, user_id: int) -> UserGamificationSummary:
        """
        Obtém resumo completo de gamificação do usuário separado por board.

        Args:
            user_id: ID do usuário

        Returns:
            UserGamificationSummary com dados de ambos os boards
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )

        badges = self.get_user_badges(user_id)

        total_points = self.repository.get_user_total_points(user_id)

        # Datas dos períodos
        week_start, week_end = self._get_period_dates("weekly")
        month_start, month_end = self._get_period_dates("monthly")
        quarter_start, quarter_end = self._get_period_dates("quarterly")
        annual_start, annual_end = self._get_period_dates("annual")

        def _board_summary(board_type: str) -> BoardPointsSummary:
            """Monta o resumo de pontos para um board específico."""
            return BoardPointsSummary(
                board_type=board_type,
                total_points=self.repository.get_user_total_points(user_id, board_type=board_type),
                week_points=self.repository.get_user_points_by_period(user_id, week_start, week_end, board_type=board_type),
                month_points=self.repository.get_user_points_by_period(user_id, month_start, month_end, board_type=board_type),
                weekly_rank=self.repository.get_user_rank_in_period(user_id, board_type, "weekly", week_start, week_end),
                monthly_rank=self.repository.get_user_rank_in_period(user_id, board_type, "monthly", month_start, month_end),
                quarterly_rank=self.repository.get_user_rank_in_period(user_id, board_type, "quarterly", quarter_start, quarter_end),
                annual_rank=self.repository.get_user_rank_in_period(user_id, board_type, "annual", annual_start, annual_end),
            )

        return UserGamificationSummary(
            user_id=user_id,
            user_name=user.name,
            user_role=user.role.name if user.role else None,
            total_points=total_points,
            badges=badges,
            prospecting=_board_summary("prospecting"),
            acquisition=_board_summary("acquisition"),
        )

    # ========== ACTION POINTS CONFIGURATION ==========

    def list_action_points(self, board_type: Optional[str] = None) -> List[ActionPointsResponse]:
        """
        Lista todas as configurações de pontos por ação.

        Args:
            board_type: Filtrar por board (opcional)

        Returns:
            Lista de ActionPointsResponse
        """
        actions = self.repository.list_all_action_points(board_type=board_type)
        return [
            ActionPointsResponse(
                id=action.id,
                board_type=action.board_type,
                action_type=action.action_type,
                points=action.points,
                is_active=action.is_active,
                description=action.description,
                created_at=action.created_at,
                updated_at=action.updated_at
            )
            for action in actions
        ]

    def create_action_points(
        self,
        action_data: ActionPointsCreate,
        current_user: User
    ) -> ActionPointsResponse:
        """
        Cria nova configuração de pontos para um par (board_type, action_type).

        Args:
            action_data: Dados da configuração
            current_user: Usuário autenticado

        Returns:
            ActionPointsResponse
        """
        # Verifica se já existe para este par (board_type, action_type)
        existing = self.repository.find_action_points(action_data.board_type, action_data.action_type)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Configuração para '{action_data.action_type}' no board '{action_data.board_type}' já existe"
            )

        action = self.repository.create_action_points(action_data)
        return ActionPointsResponse(
            id=action.id,
            board_type=action.board_type,
            action_type=action.action_type,
            points=action.points,
            is_active=action.is_active,
            description=action.description,
            created_at=action.created_at,
            updated_at=action.updated_at
        )

    def update_action_points(
        self,
        board_type: str,
        action_type: str,
        action_data: ActionPointsUpdate,
        current_user: User
    ) -> ActionPointsResponse:
        """
        Atualiza configuração de pontos para um par (board_type, action_type).

        Args:
            board_type: Board da ação
            action_type: Tipo de ação
            action_data: Dados para atualizar
            current_user: Usuário autenticado

        Returns:
            ActionPointsResponse
        """
        action = self.repository.find_action_points(board_type, action_type)
        if not action:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuração para '{action_type}' no board '{board_type}' não encontrada"
            )

        updated = self.repository.update_action_points(action, action_data)
        return ActionPointsResponse(
            id=updated.id,
            board_type=updated.board_type,
            action_type=updated.action_type,
            points=updated.points,
            is_active=updated.is_active,
            description=updated.description,
            created_at=updated.created_at,
            updated_at=updated.updated_at
        )
