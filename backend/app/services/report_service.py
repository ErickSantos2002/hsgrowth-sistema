"""
Report Service - Lógica de negócio para relatórios e KPIs.
Implementa cálculos e agregações para dashboards e relatórios.
"""
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case

from app.models.card import Card
from app.models.board import Board
from app.models.list import List as BoardList
from app.models.user import User
from app.models.card_transfer import CardTransfer
from app.models.activity import Activity
from app.repositories.board_repository import BoardRepository
from app.repositories.card_repository import CardRepository
from app.schemas.report import (
    DashboardKPIsResponse,
    SalesReportRequest,
    SalesReportResponse,
    SalesReportItem,
    ConversionReportRequest,
    ConversionReportResponse,
    ConversionFunnelStage,
    TransferReportRequest,
    TransferReportResponse,
    TransferReportItem,
    PeriodEnum
)


class ReportService:
    """
    Service para lógica de negócio relacionada a relatórios.
    """

    def __init__(self, db: Session):
        self.db = db
        self.board_repository = BoardRepository(db)
        self.card_repository = CardRepository(db)

    def _get_date_range(
        self,
        period: PeriodEnum,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Tuple[date, date]:
        """
        Calcula o intervalo de datas com base no período.

        Args:
            period: Período (today, this_week, this_month, etc)
            start_date: Data inicial (para period=custom)
            end_date: Data final (para period=custom)

        Returns:
            Tupla (start_date, end_date)
        """
        today = date.today()

        if period == PeriodEnum.CUSTOM:
            if not start_date or not end_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="start_date e end_date são obrigatórios para period=custom"
                )
            return (start_date, end_date)

        elif period == PeriodEnum.TODAY:
            return (today, today)

        elif period == PeriodEnum.YESTERDAY:
            yesterday = today - timedelta(days=1)
            return (yesterday, yesterday)

        elif period == PeriodEnum.THIS_WEEK:
            # Segunda-feira da semana atual
            start = today - timedelta(days=today.weekday())
            return (start, today)

        elif period == PeriodEnum.LAST_WEEK:
            # Segunda a domingo da semana passada
            start = today - timedelta(days=today.weekday() + 7)
            end = start + timedelta(days=6)
            return (start, end)

        elif period == PeriodEnum.THIS_MONTH:
            start = today.replace(day=1)
            return (start, today)

        elif period == PeriodEnum.LAST_MONTH:
            # Primeiro dia do mês passado
            first_day_this_month = today.replace(day=1)
            last_day_last_month = first_day_this_month - timedelta(days=1)
            first_day_last_month = last_day_last_month.replace(day=1)
            return (first_day_last_month, last_day_last_month)

        elif period == PeriodEnum.THIS_QUARTER:
            # Trimestre atual
            quarter = (today.month - 1) // 3
            start = today.replace(month=quarter * 3 + 1, day=1)
            return (start, today)

        elif period == PeriodEnum.LAST_QUARTER:
            # Trimestre passado
            quarter = (today.month - 1) // 3
            if quarter == 0:
                # Se estamos no Q1, pegar Q4 do ano passado
                start = date(today.year - 1, 10, 1)
                end = date(today.year - 1, 12, 31)
            else:
                start = today.replace(month=(quarter - 1) * 3 + 1, day=1)
                # Último dia do trimestre passado
                next_quarter_start = today.replace(month=quarter * 3 + 1, day=1)
                end = next_quarter_start - timedelta(days=1)
            return (start, end)

        elif period == PeriodEnum.THIS_YEAR:
            start = today.replace(month=1, day=1)
            return (start, today)

        elif period == PeriodEnum.LAST_YEAR:
            start = date(today.year - 1, 1, 1)
            end = date(today.year - 1, 12, 31)
            return (start, end)

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Período inválido: {period}"
            )

    def get_dashboard_kpis(self, account_id: int) -> DashboardKPIsResponse:
        """
        Retorna os KPIs principais para o dashboard.

        Args:
            account_id: ID da conta

        Returns:
            DashboardKPIsResponse
        """
        today = date.today()
        start_of_week, _ = self._get_date_range(PeriodEnum.THIS_WEEK)
        start_of_month, _ = self._get_date_range(PeriodEnum.THIS_MONTH)

        # Busca todos os boards da conta
        boards = self.db.query(Board).filter(Board.account_id == account_id).all()
        board_ids = [b.id for b in boards]

        # Total de cards
        total_cards = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(BoardList.board_id.in_(board_ids)).scalar() or 0

        # Novos cards
        new_cards_today = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            func.date(Card.created_at) == today
        ).scalar() or 0

        new_cards_this_week = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            func.date(Card.created_at) >= start_of_week
        ).scalar() or 0

        new_cards_this_month = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            func.date(Card.created_at) >= start_of_month
        ).scalar() or 0

        # Cards ganhos
        won_cards_today = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == True,
            func.date(Card.won_at) == today
        ).scalar() or 0

        won_cards_this_week = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == True,
            func.date(Card.won_at) >= start_of_week
        ).scalar() or 0

        won_cards_this_month = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == True,
            func.date(Card.won_at) >= start_of_month
        ).scalar() or 0

        # Cards perdidos
        lost_cards_today = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_lost == True,
            func.date(Card.lost_at) == today
        ).scalar() or 0

        lost_cards_this_week = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_lost == True,
            func.date(Card.lost_at) >= start_of_week
        ).scalar() or 0

        lost_cards_this_month = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_lost == True,
            func.date(Card.lost_at) >= start_of_month
        ).scalar() or 0

        # Cards vencidos
        overdue_cards = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.due_date < datetime.now(),
            Card.is_won == False,
            Card.is_lost == False
        ).scalar() or 0

        due_today = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            func.date(Card.due_date) == today,
            Card.is_won == False,
            Card.is_lost == False
        ).scalar() or 0

        end_of_week = start_of_week + timedelta(days=6)
        due_this_week = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            func.date(Card.due_date) >= today,
            func.date(Card.due_date) <= end_of_week,
            Card.is_won == False,
            Card.is_lost == False
        ).scalar() or 0

        # Valores monetários
        total_value = self.db.query(func.sum(Card.value)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(BoardList.board_id.in_(board_ids)).scalar() or Decimal(0)

        won_value_this_month = self.db.query(func.sum(Card.value)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == True,
            func.date(Card.won_at) >= start_of_month
        ).scalar() or Decimal(0)

        pipeline_value = self.db.query(func.sum(Card.value)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == False,
            Card.is_lost == False
        ).scalar() or Decimal(0)

        # Taxa de conversão do mês
        conversion_rate_this_month = 0.0
        if new_cards_this_month > 0:
            conversion_rate_this_month = round(
                (won_cards_this_month / new_cards_this_month) * 100, 2
            )

        # Tempo médio para ganhar (em dias)
        avg_time_result = self.db.query(
            func.avg(
                func.extract('epoch', Card.won_at - Card.created_at) / 86400
            )
        ).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == True,
            Card.won_at.isnot(None)
        ).scalar()

        avg_time_to_win_days = round(float(avg_time_result), 2) if avg_time_result else None

        # Top 5 vendedores do mês
        top_sellers_query = self.db.query(
            User.name,
            func.count(Card.id).label('cards_won'),
            func.sum(Card.value).label('total_value')
        ).join(
            Card, Card.assigned_to_id == User.id
        ).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == True,
            func.date(Card.won_at) >= start_of_month
        ).group_by(
            User.id, User.name
        ).order_by(
            func.count(Card.id).desc()
        ).limit(5).all()

        top_sellers_this_month = [
            {
                "name": name,
                "cards_won": cards_won,
                "total_value": float(total_value or 0)
            }
            for name, cards_won, total_value in top_sellers_query
        ]

        return DashboardKPIsResponse(
            total_cards=total_cards,
            new_cards_today=new_cards_today,
            new_cards_this_week=new_cards_this_week,
            new_cards_this_month=new_cards_this_month,
            won_cards_today=won_cards_today,
            won_cards_this_week=won_cards_this_week,
            won_cards_this_month=won_cards_this_month,
            lost_cards_today=lost_cards_today,
            lost_cards_this_week=lost_cards_this_week,
            lost_cards_this_month=lost_cards_this_month,
            overdue_cards=overdue_cards,
            due_today=due_today,
            due_this_week=due_this_week,
            total_value=total_value,
            won_value_this_month=won_value_this_month,
            pipeline_value=pipeline_value,
            conversion_rate_this_month=conversion_rate_this_month,
            avg_time_to_win_days=avg_time_to_win_days,
            top_sellers_this_month=top_sellers_this_month
        )

    def get_sales_report(
        self,
        account_id: int,
        request: SalesReportRequest
    ) -> SalesReportResponse:
        """
        Gera relatório de vendas por período.

        Args:
            account_id: ID da conta
            request: Parâmetros do relatório

        Returns:
            SalesReportResponse
        """
        start_date, end_date = self._get_date_range(
            request.period,
            request.start_date,
            request.end_date
        )

        # Filtra boards
        query_filter = [Board.account_id == account_id]
        if request.board_id:
            query_filter.append(Board.id == request.board_id)

        boards = self.db.query(Board).filter(*query_filter).all()
        board_ids = [b.id for b in boards]

        # Filtro adicional de usuário
        user_filter = []
        if request.user_id:
            user_filter.append(Card.assigned_to_id == request.user_id)

        # Agrupa por vendedor
        sales_data = self.db.query(
            User.name,
            func.count(
                case((func.date(Card.created_at) >= start_date, Card.id))
            ).label('new_cards'),
            func.count(
                case((and_(
                    Card.is_won == True,
                    func.date(Card.won_at) >= start_date,
                    func.date(Card.won_at) <= end_date
                ), Card.id))
            ).label('won_cards'),
            func.count(
                case((and_(
                    Card.is_lost == True,
                    func.date(Card.lost_at) >= start_date,
                    func.date(Card.lost_at) <= end_date
                ), Card.id))
            ).label('lost_cards'),
            func.sum(
                case((and_(
                    Card.is_won == True,
                    func.date(Card.won_at) >= start_date,
                    func.date(Card.won_at) <= end_date
                ), Card.value), else_=0)
            ).label('won_value')
        ).join(
            Card, Card.assigned_to_id == User.id
        ).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            *user_filter
        ).group_by(
            User.id, User.name
        ).all()

        items = []
        total_new_cards = 0
        total_won_cards = 0
        total_lost_cards = 0
        total_won_value = Decimal(0)

        for name, new_cards, won_cards, lost_cards, won_value in sales_data:
            conversion_rate = 0.0
            if new_cards > 0:
                conversion_rate = round((won_cards / new_cards) * 100, 2)

            items.append(SalesReportItem(
                label=name,
                new_cards=new_cards,
                won_cards=won_cards,
                lost_cards=lost_cards,
                won_value=won_value or Decimal(0),
                conversion_rate=conversion_rate
            ))

            total_new_cards += new_cards
            total_won_cards += won_cards
            total_lost_cards += lost_cards
            total_won_value += won_value or Decimal(0)

        overall_conversion_rate = 0.0
        if total_new_cards > 0:
            overall_conversion_rate = round(
                (total_won_cards / total_new_cards) * 100, 2
            )

        return SalesReportResponse(
            period=request.period.value,
            start_date=start_date,
            end_date=end_date,
            total_new_cards=total_new_cards,
            total_won_cards=total_won_cards,
            total_lost_cards=total_lost_cards,
            total_won_value=total_won_value,
            overall_conversion_rate=overall_conversion_rate,
            items=items
        )

    def get_conversion_report(
        self,
        account_id: int,
        request: ConversionReportRequest
    ) -> ConversionReportResponse:
        """
        Gera relatório de conversão (funil de vendas).

        Args:
            account_id: ID da conta
            request: Parâmetros do relatório

        Returns:
            ConversionReportResponse
        """
        # Verifica acesso ao board
        board = self.board_repository.find_by_id(request.board_id)
        if not board or board.account_id != account_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        start_date, end_date = self._get_date_range(
            request.period,
            request.start_date,
            request.end_date
        )

        # Busca listas do board
        lists = self.db.query(BoardList).filter(
            BoardList.board_id == request.board_id
        ).order_by(BoardList.position).all()

        stages = []
        total_cards = 0
        total_value = Decimal(0)

        for i, list_obj in enumerate(lists):
            # Conta cards nesta lista
            cards_in_stage = self.db.query(func.count(Card.id)).filter(
                Card.list_id == list_obj.id,
                func.date(Card.created_at) >= start_date,
                func.date(Card.created_at) <= end_date
            ).scalar() or 0

            # Valor total
            value_in_stage = self.db.query(func.sum(Card.value)).filter(
                Card.list_id == list_obj.id,
                func.date(Card.created_at) >= start_date,
                func.date(Card.created_at) <= end_date
            ).scalar() or Decimal(0)

            # Taxa de conversão para próxima etapa
            conversion_rate = 0.0
            if i < len(lists) - 1:
                next_list = lists[i + 1]
                cards_moved_to_next = self.db.query(func.count(Card.id)).filter(
                    Card.list_id == next_list.id,
                    func.date(Card.created_at) >= start_date,
                    func.date(Card.created_at) <= end_date
                ).scalar() or 0

                if cards_in_stage > 0:
                    conversion_rate = round(
                        (cards_moved_to_next / cards_in_stage) * 100, 2
                    )

            # Tempo médio nesta etapa (estimativa simples)
            avg_time_in_stage_days = None

            stages.append(ConversionFunnelStage(
                list_name=list_obj.name,
                list_id=list_obj.id,
                cards_count=cards_in_stage,
                total_value=value_in_stage,
                conversion_rate=conversion_rate,
                avg_time_in_stage_days=avg_time_in_stage_days
            ))

            total_cards += cards_in_stage
            total_value += value_in_stage

        # Taxa de conversão geral (primeiro estágio → último estágio)
        overall_conversion_rate = 0.0
        if len(stages) >= 2 and stages[0].cards_count > 0:
            overall_conversion_rate = round(
                (stages[-1].cards_count / stages[0].cards_count) * 100, 2
            )

        return ConversionReportResponse(
            board_name=board.name,
            period=request.period.value,
            start_date=start_date,
            end_date=end_date,
            total_cards=total_cards,
            total_value=total_value,
            overall_conversion_rate=overall_conversion_rate,
            stages=stages
        )

    def get_transfer_report(
        self,
        account_id: int,
        request: TransferReportRequest
    ) -> TransferReportResponse:
        """
        Gera relatório de transferências.

        Args:
            account_id: ID da conta
            request: Parâmetros do relatório

        Returns:
            TransferReportResponse
        """
        start_date, end_date = self._get_date_range(
            request.period,
            request.start_date,
            request.end_date
        )

        # Filtros adicionais
        filters = [
            func.date(CardTransfer.transferred_at) >= start_date,
            func.date(CardTransfer.transferred_at) <= end_date
        ]

        if request.from_user_id:
            filters.append(CardTransfer.from_user_id == request.from_user_id)

        if request.to_user_id:
            filters.append(CardTransfer.to_user_id == request.to_user_id)

        # Agrega dados
        transfer_data = self.db.query(
            User.name.label('from_user_name'),
            func.max(User.name).label('to_user_name'),  # Placeholder, ajustar depois
            func.count(CardTransfer.id).label('transfers_count'),
            func.count(
                case((Card.is_won == True, Card.id))
            ).label('cards_won_count'),
            func.sum(
                case((Card.is_won == True, Card.value), else_=0)
            ).label('total_won_value')
        ).join(
            CardTransfer, CardTransfer.from_user_id == User.id
        ).join(
            Card, CardTransfer.card_id == Card.id
        ).filter(*filters).group_by(
            User.id, User.name
        ).all()

        items = []
        total_transfers = 0
        total_cards_won = 0
        total_won_value = Decimal(0)

        for from_name, to_name, count, won_count, won_value in transfer_data:
            items.append(TransferReportItem(
                from_user_name=from_name,
                to_user_name="Vários",  # Simplificado
                transfers_count=count,
                cards_won_count=won_count,
                total_won_value=won_value or Decimal(0),
                avg_days_to_win=None
            ))

            total_transfers += count
            total_cards_won += won_count
            total_won_value += won_value or Decimal(0)

        return TransferReportResponse(
            period=request.period.value,
            start_date=start_date,
            end_date=end_date,
            total_transfers=total_transfers,
            total_cards_won=total_cards_won,
            total_won_value=total_won_value,
            items=items
        )
