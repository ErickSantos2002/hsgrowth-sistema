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
from app.models.role import Role
from app.models.card_transfer import CardTransfer
from app.models.activity import Activity
from app.models.card_list_history import CardListHistory
from app.models.card_task import CardTask
from app.models.card_note import CardNote
from app.schemas.card_task import TaskType
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

    def _build_dashboard_user_filter(
        self,
        current_user: Optional[User] = None,
        user_id: Optional[int] = None
    ) -> list:
        """
        Retorna lista de filtros SQLAlchemy a aplicar em todas as queries do dashboard.

        - salesperson: sempre filtra por assigned_to_id do próprio usuário
        - sdr: sempre filtra por sdr_id do próprio usuário
        - admin/manager + user_id: filtra pelo usuário selecionado usando a coluna correta
        - admin/manager sem user_id: sem filtro (todos os dados)
        """
        if not current_user or not current_user.role:
            return []

        role_name = current_user.role.name

        if role_name == "salesperson":
            return [Card.assigned_to_id == current_user.id]

        if role_name == "sdr":
            return [Card.sdr_id == current_user.id]

        if role_name in ("admin", "manager") and user_id:
            target = self.db.query(User).filter(User.id == user_id).first()
            if target and target.role:
                if target.role.name == "salesperson":
                    return [Card.assigned_to_id == user_id]
                if target.role.name == "sdr":
                    return [Card.sdr_id == user_id]

        return []

    # Mapeamento dos valores de período do frontend para PeriodEnum
    _DASHBOARD_PERIOD_MAP = {
        "today":      PeriodEnum.TODAY,
        "yesterday":  PeriodEnum.YESTERDAY,
        "week":       PeriodEnum.THIS_WEEK,
        "month":      PeriodEnum.THIS_MONTH,
        "last_month": PeriodEnum.LAST_MONTH,
        "quarter":    PeriodEnum.THIS_QUARTER,
        "year":       PeriodEnum.THIS_YEAR,
    }

    def get_dashboard_kpis(
        self,
        current_user: Optional[User] = None,
        user_id: Optional[int] = None,
        period_key: str = "month",
        custom_start: Optional[str] = None,
        custom_end: Optional[str] = None,
        view: Optional[str] = None,
    ) -> DashboardKPIsResponse:
        """
        Retorna os KPIs principais para o dashboard.

        Args:
            current_user: Usuário logado (para filtro automático por role)
            user_id: ID de usuário específico a filtrar (apenas para admin/manager)
            period_key: Período principal ('today', 'week', 'month', 'quarter', 'year')

        Returns:
            DashboardKPIsResponse
        """
        today = date.today()
        start_of_week, _ = self._get_date_range(PeriodEnum.THIS_WEEK)
        start_of_month, _ = self._get_date_range(PeriodEnum.THIS_MONTH)

        if period_key == "custom" and custom_start and custom_end:
            try:
                start_of_period = date.fromisoformat(custom_start)
                end_of_period = date.fromisoformat(custom_end)
            except ValueError:
                start_of_period, end_of_period = self._get_date_range(PeriodEnum.THIS_MONTH)
        else:
            period_enum = self._DASHBOARD_PERIOD_MAP.get(period_key, PeriodEnum.THIS_MONTH)
            start_of_period, end_of_period = self._get_date_range(period_enum)

        # Filtro de usuário: salesperson/sdr veem só os próprios dados; admin/manager podem filtrar por user_id
        uf = self._build_dashboard_user_filter(current_user, user_id)

        # Filtro de visão: garante que a dashboard SDR só conta cards com SDR vinculado
        # e a dashboard Vendedor só conta cards com vendedor vinculado
        role_name = current_user.role.name if current_user and current_user.role else ""
        if not user_id and role_name in ("admin", "manager"):
            if view == "sdr":
                uf = uf + [Card.sdr_id.isnot(None)]
            elif view == "vendedor":
                uf = uf + [Card.assigned_to_id.isnot(None)]

        # Busca todos os boards do sistema
        boards = self.db.query(Board).all()
        board_ids = [b.id for b in boards]

        # Cards ativos criados no período selecionado
        total_cards = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == 0,
            func.date(Card.created_at) >= start_of_period,
            func.date(Card.created_at) <= end_of_period,
            *uf
        ).scalar() or 0

        # Novos cards
        new_cards_today = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            func.date(Card.created_at) == today,
            *uf
        ).scalar() or 0

        new_cards_this_week = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            func.date(Card.created_at) >= start_of_week,
            *uf
        ).scalar() or 0

        new_cards_this_month = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            func.date(Card.created_at) >= start_of_period,
            func.date(Card.created_at) <= end_of_period,
            *uf
        ).scalar() or 0

        # Cards ganhos
        won_cards_today = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == 1,
            func.date(Card.closed_at) == today,
            *uf
        ).scalar() or 0

        won_cards_this_week = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == 1,
            func.date(Card.closed_at) >= start_of_week,
            *uf
        ).scalar() or 0

        won_cards_this_month = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == 1,
            func.date(Card.closed_at) >= start_of_period,
            func.date(Card.closed_at) <= end_of_period,
            *uf
        ).scalar() or 0

        # Cards perdidos
        lost_cards_today = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == -1,
            func.date(Card.closed_at) == today,
            *uf
        ).scalar() or 0

        lost_cards_this_week = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == -1,
            func.date(Card.closed_at) >= start_of_week,
            *uf
        ).scalar() or 0

        lost_cards_this_month = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == -1,
            func.date(Card.closed_at) >= start_of_period,
            func.date(Card.closed_at) <= end_of_period,
            *uf
        ).scalar() or 0

        # Cards vencidos
        overdue_cards = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.due_date < datetime.now(),
            Card.is_won == 0,
            *uf
        ).scalar() or 0

        due_today = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            func.date(Card.due_date) == today,
            Card.is_won == 0,
            *uf
        ).scalar() or 0

        end_of_week = start_of_week + timedelta(days=6)
        due_this_week = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            func.date(Card.due_date) >= today,
            func.date(Card.due_date) <= end_of_week,
            Card.is_won == 0,
            *uf
        ).scalar() or 0

        # Leads sem nenhuma atividade registrada (sem contato)
        # Um lead "sem contato" é aquele que nunca teve task nem nota criada
        # (independente de estar concluída ou não)
        _cards_com_task = self.db.query(CardTask.card_id).distinct().subquery()
        _cards_com_nota = self.db.query(CardNote.card_id).distinct().subquery()
        leads_sem_contato = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == 0,
            ~Card.id.in_(self.db.query(_cards_com_task.c.card_id)),
            ~Card.id.in_(self.db.query(_cards_com_nota.c.card_id)),
            *uf
        ).scalar() or 0

        # Cards parados há mais de 3 dias (sem atividade, anotação ou mudança de etapa no período)
        # Apenas cards que já tiveram ao menos 1 task ou nota entram na contagem
        three_days_ago = datetime.now() - timedelta(days=3)
        _has_task = self.db.query(CardTask.card_id).distinct().subquery()
        _has_note = self.db.query(CardNote.card_id).distinct().subquery()
        _active_task_3d = self.db.query(CardTask.card_id).filter(
            or_(
                CardTask.created_at > three_days_ago,
                CardTask.completed_at > three_days_ago,
            )
        ).subquery()
        _active_note_3d = self.db.query(CardNote.card_id).filter(
            CardNote.created_at > three_days_ago,
        ).subquery()
        _active_stage_3d = self.db.query(CardListHistory.card_id).filter(
            CardListHistory.entered_at > three_days_ago,
        ).subquery()
        cards_parados = self.db.query(func.count(func.distinct(Card.id))).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == 0,
            # Exige que o card tenha ao menos 1 task ou nota (atividade deliberada)
            or_(
                Card.id.in_(self.db.query(_has_task.c.card_id)),
                Card.id.in_(self.db.query(_has_note.c.card_id)),
            ),
            ~Card.id.in_(self.db.query(_active_task_3d.c.card_id)),
            ~Card.id.in_(self.db.query(_active_note_3d.c.card_id)),
            ~Card.id.in_(self.db.query(_active_stage_3d.c.card_id)),
            *uf
        ).scalar() or 0

        # Negócios parados há mais de 7 dias (sem atividade, anotação ou mudança de etapa no período)
        # Apenas cards que já tiveram ao menos 1 task ou nota entram na contagem
        seven_days_ago = datetime.now() - timedelta(days=7)
        _active_task_7d = self.db.query(CardTask.card_id).filter(
            or_(
                CardTask.created_at > seven_days_ago,
                CardTask.completed_at > seven_days_ago,
            )
        ).subquery()
        _active_note_7d = self.db.query(CardNote.card_id).filter(
            CardNote.created_at > seven_days_ago,
        ).subquery()
        _active_stage_7d = self.db.query(CardListHistory.card_id).filter(
            CardListHistory.entered_at > seven_days_ago,
        ).subquery()
        negocios_parados_7d = self.db.query(func.count(func.distinct(Card.id))).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == 0,
            # Exige que o card tenha ao menos 1 task ou nota (atividade deliberada)
            or_(
                Card.id.in_(self.db.query(_has_task.c.card_id)),
                Card.id.in_(self.db.query(_has_note.c.card_id)),
            ),
            ~Card.id.in_(self.db.query(_active_task_7d.c.card_id)),
            ~Card.id.in_(self.db.query(_active_note_7d.c.card_id)),
            ~Card.id.in_(self.db.query(_active_stage_7d.c.card_id)),
            *uf
        ).scalar() or 0

        # Propostas em aberto — cards ativos atualmente na lista Diagnóstico e Proposta (id=30)
        LIST_DIAGNOSTICO_PROPOSTA_ID = 30
        propostas_em_aberto = self.db.query(func.count(Card.id)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            Card.list_id == LIST_DIAGNOSTICO_PROPOSTA_ID,
            Card.is_won == 0,
            *uf
        ).scalar() or 0

        # Valores monetários
        total_value = self.db.query(func.sum(Card.value)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(BoardList.board_id.in_(board_ids), *uf).scalar() or Decimal(0)

        won_value_this_month = self.db.query(func.sum(Card.value)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == 1,
            func.date(Card.closed_at) >= start_of_period,
            func.date(Card.closed_at) <= end_of_period,
            *uf
        ).scalar() or Decimal(0)

        pipeline_value = self.db.query(func.sum(Card.value)).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == 0,
            func.date(Card.created_at) >= start_of_period,
            func.date(Card.created_at) <= end_of_period,
            *uf
        ).scalar() or Decimal(0)

        # Taxa de conversão do mês
        conversion_rate_this_month = 0.0
        if new_cards_this_month > 0:
            conversion_rate_this_month = round(
                (won_cards_this_month / new_cards_this_month) * 100, 2
            )

        # Tempo médio para ganhar (em dias) — filtrado pelo período selecionado
        avg_time_result = self.db.query(
            func.avg(
                func.extract('epoch', Card.closed_at - Card.created_at) / 86400
            )
        ).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.is_won == 1,
            Card.closed_at.isnot(None),
            func.date(Card.closed_at) >= start_of_period,
            func.date(Card.closed_at) <= end_of_period,
            *uf
        ).scalar()

        avg_time_to_win_days = round(float(avg_time_result), 2) if avg_time_result else None

        # Propostas geradas — cards que entraram em "Diagnóstico e Proposta" (id=30, board Aquisição)
        LIST_DIAGNOSTICO_PROPOSTA_ID = 30
        propostas_geradas = self.db.query(
            func.count(func.distinct(CardListHistory.card_id))
        ).join(
            Card, Card.id == CardListHistory.card_id
        ).filter(
            CardListHistory.list_id == LIST_DIAGNOSTICO_PROPOSTA_ID,
            func.date(CardListHistory.entered_at) >= start_of_period,
            func.date(CardListHistory.entered_at) <= end_of_period,
            *uf
        ).scalar() or 0

        # Reuniões recebidas do SDR — cards que entraram em "Agendado" (id=26, board Prospecção)
        # com SDR vinculado; mesma base do ranking SDR para consistência entre dashboards
        LIST_AGENDADO_ID = 26

        # Exclui entradas ESPECÍFICAS na lista Agendado que terminaram em NoShow.
        # Lógica: uma entrada é descartada se houve uma CardTask com is_noshow=True
        # concluída APÓS entered_at — sem limite superior em exited_at, pois o vendedor
        # pode marcar NoShow depois que o card já saiu da lista 26 (board do vendedor).
        # O reagendamento é protegido: se o card voltou à lista 26 em T4 e o NoShow
        # foi em T3 < T4, então T3 >= entered_at(T4) é falso → nova entrada NÃO é excluída.
        _noshow_clh_ids = (
            self.db.query(CardListHistory.id)
            .join(
                CardTask,
                and_(
                    CardTask.card_id == CardListHistory.card_id,
                    CardTask.is_noshow == True,
                    CardTask.completed_at >= CardListHistory.entered_at,
                ),
            )
            .filter(CardListHistory.list_id == LIST_AGENDADO_ID)
        )

        meetings_received_from_sdr = self.db.query(
            func.count(func.distinct(CardListHistory.card_id))
        ).join(
            Card, Card.id == CardListHistory.card_id
        ).filter(
            CardListHistory.list_id == LIST_AGENDADO_ID,
            func.date(CardListHistory.entered_at) >= start_of_period,
            func.date(CardListHistory.entered_at) <= end_of_period,
            Card.sdr_id.isnot(None),
            *uf
        ).scalar() or 0

        # Reuniões Qualificadas — tarefas do tipo "meeting" concluídas com sucesso
        # (is_completed=True, is_noshow=False) em cards que têm SDR vinculado,
        # dentro do período. Representa reuniões que o SDR agendou e o vendedor
        # compareceu e marcou como concluída.
        qualified_meetings = self.db.query(
            func.count(func.distinct(CardTask.id))
        ).join(
            Card, Card.id == CardTask.card_id
        ).filter(
            CardTask.task_type == "meeting",
            CardTask.is_completed == True,
            CardTask.is_noshow == False,
            Card.sdr_id.isnot(None),
            func.date(CardTask.completed_at) >= start_of_period,
            func.date(CardTask.completed_at) <= end_of_period,
            *uf
        ).scalar() or 0

        # Top 5 vendedores do mês — sempre global (sem user filter) para que
        # vendedores/SDRs possam ver onde estão no ranking da equipe
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
            Card.is_won == 1,
            func.date(Card.closed_at) >= start_of_period,
            func.date(Card.closed_at) <= end_of_period
        ).group_by(
            User.id, User.name
        ).order_by(
            func.coalesce(func.sum(Card.value), 0).desc()
        ).limit(5).all()

        top_sellers_this_month = [
            {
                "name": name,
                "cards_won": cards_won,
                "total_value": float(total_value or 0)
            }
            for name, cards_won, total_value in top_sellers_query
        ]

        # Ranking de SDRs por reuniões agendadas no período
        # Conta cards distintos que entraram na lista "Agendado" (id=26) por SDR
        # Exclui entradas específicas do CardListHistory que terminaram em NoShow
        top_sdrs_query = self.db.query(
            User.name,
            func.count(func.distinct(CardListHistory.card_id)).label('meetings_scheduled')
        ).join(
            Card, Card.sdr_id == User.id
        ).join(
            CardListHistory, and_(
                CardListHistory.card_id == Card.id,
                CardListHistory.list_id == LIST_AGENDADO_ID,
            )
        ).filter(
            Card.sdr_id.isnot(None),
            func.date(CardListHistory.entered_at) >= start_of_period,
            func.date(CardListHistory.entered_at) <= end_of_period,
            ~CardListHistory.id.in_(_noshow_clh_ids),
            *uf
        ).group_by(
            User.id, User.name
        ).order_by(
            func.count(func.distinct(CardListHistory.card_id)).desc()
        ).limit(5).all()

        top_sdrs_by_meetings = [
            {
                "name": name,
                "meetings_scheduled": meetings_scheduled,
            }
            for name, meetings_scheduled in top_sdrs_query
        ]

        # Cards por estágio/lista — conta cards distintos que ENTRARAM em cada
        # lista dentro do período selecionado (via card_list_history).
        # Filtra pelo board relevante para cada view, garantindo a ordem correta do pipeline.
        BOARD_PROSPECCAO_ID = 6   # Board SDR
        BOARD_AQUISICAO_ID  = 7   # Board Vendedor
        if view == "sdr":
            stage_board_ids = [BOARD_PROSPECCAO_ID]
        elif view == "vendedor":
            stage_board_ids = [BOARD_AQUISICAO_ID]
        else:
            stage_board_ids = board_ids

        cards_by_stage_query = self.db.query(
            BoardList.id.label('list_id'),
            BoardList.name.label('stage_name'),
            func.count(func.distinct(CardListHistory.card_id)).label('card_count'),
            func.sum(Card.value).label('total_value')
        ).join(
            CardListHistory, CardListHistory.list_id == BoardList.id
        ).join(
            Card, Card.id == CardListHistory.card_id
        ).filter(
            BoardList.board_id.in_(stage_board_ids),
            func.date(CardListHistory.entered_at) >= start_of_period,
            func.date(CardListHistory.entered_at) <= end_of_period,
            *uf
        ).group_by(
            BoardList.id, BoardList.name, BoardList.position
        ).order_by(
            BoardList.position
        ).all()

        cards_by_stage = [
            {
                "list_id": list_id,
                "stage_name": stage_name,
                "card_count": card_count,
                "total_value": float(total_value or 0)
            }
            for list_id, stage_name, card_count, total_value in cards_by_stage_query
        ]

        # Para a view de vendedor, também busca os estágios do board de Prospecção
        cards_by_stage_prospeccao = []
        if view == "vendedor":
            prospeccao_query = self.db.query(
                BoardList.id.label('list_id'),
                BoardList.name.label('stage_name'),
                func.count(func.distinct(CardListHistory.card_id)).label('card_count'),
                func.sum(Card.value).label('total_value')
            ).join(
                CardListHistory, CardListHistory.list_id == BoardList.id
            ).join(
                Card, Card.id == CardListHistory.card_id
            ).filter(
                BoardList.board_id == BOARD_PROSPECCAO_ID,
                func.date(CardListHistory.entered_at) >= start_of_period,
                func.date(CardListHistory.entered_at) <= end_of_period,
                *uf
            ).group_by(
                BoardList.id, BoardList.name, BoardList.position
            ).order_by(
                BoardList.position
            ).all()

            cards_by_stage_prospeccao = [
                {
                    "list_id": list_id,
                    "stage_name": stage_name,
                    "card_count": card_count,
                    "total_value": float(total_value or 0)
                }
                for list_id, stage_name, card_count, total_value in prospeccao_query
            ]

        # Evolução de vendas (últimos 6 meses para gráfico de linha)
        sales_evolution = []
        for i in range(5, -1, -1):  # 6 meses atrás até hoje
            # Calcula o primeiro e último dia do mês
            target_date = today - timedelta(days=30 * i)
            month_start = target_date.replace(day=1)

            # Último dia do mês
            if month_start.month == 12:
                next_month = month_start.replace(year=month_start.year + 1, month=1, day=1)
            else:
                next_month = month_start.replace(month=month_start.month + 1, day=1)
            month_end = next_month - timedelta(days=1)

            # Novos leads no mês (cards criados)
            new_leads_count = self.db.query(func.count(Card.id)).join(
                BoardList, Card.list_id == BoardList.id
            ).filter(
                BoardList.board_id.in_(board_ids),
                func.date(Card.created_at) >= month_start,
                func.date(Card.created_at) <= month_end,
                *uf
            ).scalar() or 0

            # Reuniões agendadas no mês (cards que entraram na lista Agendado)
            # Exclui entradas específicas do CLH que terminaram em NoShow
            meetings_count = self.db.query(
                func.count(func.distinct(CardListHistory.card_id))
            ).join(
                Card, Card.id == CardListHistory.card_id
            ).filter(
                CardListHistory.list_id == LIST_AGENDADO_ID,
                func.date(CardListHistory.entered_at) >= month_start,
                func.date(CardListHistory.entered_at) <= month_end,
                ~CardListHistory.id.in_(_noshow_clh_ids),
                *uf
            ).scalar() or 0

            # Cards ganhos no mês
            won_count = self.db.query(func.count(Card.id)).join(
                BoardList, Card.list_id == BoardList.id
            ).filter(
                BoardList.board_id.in_(board_ids),
                Card.is_won == 1,
                func.date(Card.closed_at) >= month_start,
                func.date(Card.closed_at) <= month_end,
                *uf
            ).scalar() or 0

            won_value = self.db.query(func.sum(Card.value)).join(
                BoardList, Card.list_id == BoardList.id
            ).filter(
                BoardList.board_id.in_(board_ids),
                Card.is_won == 1,
                func.date(Card.closed_at) >= month_start,
                func.date(Card.closed_at) <= month_end,
                *uf
            ).scalar() or Decimal(0)

            # Cards perdidos no mês
            lost_count = self.db.query(func.count(Card.id)).join(
                BoardList, Card.list_id == BoardList.id
            ).filter(
                BoardList.board_id.in_(board_ids),
                Card.is_won == -1,
                func.date(Card.closed_at) >= month_start,
                func.date(Card.closed_at) <= month_end,
                *uf
            ).scalar() or 0

            sales_evolution.append({
                "period": month_start.strftime("%b/%y"),  # Ex: "Jan/26"
                "new_leads_count": new_leads_count,
                "meetings_count": meetings_count,
                "won_count": won_count,
                "won_value": float(won_value),
                "lost_count": lost_count
            })

        # Atividades concluídas por tipo no período (para gráfico SDR/Vendedor)
        # Filtra apenas tasks concluídas (is_completed=True) pela data de conclusão (completed_at)
        # Usa apenas assigned_to_id (quem executou a atividade).
        # Quando admin/manager visualiza "Todos os Vendedores" ou "Todos os SDRs" (sem user_id),
        # filtra pela role correspondente via subquery para não misturar atividades de roles diferentes.
        task_user_filter = []
        if current_user and current_user.role:
            _role = current_user.role.name
            if _role in ("sdr", "salesperson"):
                task_user_filter = [CardTask.assigned_to_id == current_user.id]
            elif _role in ("admin", "manager"):
                if user_id:
                    task_user_filter = [CardTask.assigned_to_id == user_id]
                elif view == "vendedor":
                    salesperson_subq = self.db.query(User.id).join(
                        Role, User.role_id == Role.id
                    ).filter(Role.name == "salesperson").subquery()
                    task_user_filter = [CardTask.assigned_to_id.in_(salesperson_subq)]
                elif view == "sdr":
                    sdr_subq = self.db.query(User.id).join(
                        Role, User.role_id == Role.id
                    ).filter(Role.name == "sdr").subquery()
                    task_user_filter = [CardTask.assigned_to_id.in_(sdr_subq)]

        task_counts_query = self.db.query(
            CardTask.task_type,
            func.count(CardTask.id).label("count")
        ).filter(
            CardTask.is_completed == True,
            CardTask.completed_at.isnot(None),
            func.date(CardTask.completed_at) >= start_of_period,
            func.date(CardTask.completed_at) <= end_of_period,
            *task_user_filter
        ).group_by(CardTask.task_type).all()

        activity_counts_by_type = [
            {
                "type": row.task_type.value if hasattr(row.task_type, "value") else str(row.task_type),
                "count": row.count
            }
            for row in task_counts_query
        ]

        # Reuniões realizadas pelo vendedor no período (concluídas com completed_at no período)
        meetings_scheduled_by_seller = self.db.query(
            func.count(CardTask.id)
        ).filter(
            CardTask.task_type == TaskType.MEETING,
            CardTask.is_completed == True,
            CardTask.completed_at.isnot(None),
            func.date(CardTask.completed_at) >= start_of_period,
            func.date(CardTask.completed_at) <= end_of_period,
            *task_user_filter
        ).scalar() or 0

        # Cards por canal de aquisição criados no período
        channel_rows = self.db.query(
            Card.acquisition_channel,
            func.count(Card.id).label("count")
        ).join(
            BoardList, Card.list_id == BoardList.id
        ).filter(
            BoardList.board_id.in_(board_ids),
            Card.acquisition_channel.isnot(None),
            Card.acquisition_channel != "",
            func.date(Card.created_at) >= start_of_period,
            func.date(Card.created_at) <= end_of_period,
            *uf
        ).group_by(Card.acquisition_channel).all()

        cards_by_channel = [
            {"channel": row.acquisition_channel, "count": row.count}
            for row in channel_rows
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
            propostas_geradas=propostas_geradas,
            meetings_received_from_sdr=meetings_received_from_sdr,
            qualified_meetings=qualified_meetings,
            overdue_cards=overdue_cards,
            due_today=due_today,
            due_this_week=due_this_week,
            leads_sem_contato=leads_sem_contato,
            cards_parados=cards_parados,
            negocios_parados_7d=negocios_parados_7d,
            propostas_em_aberto=propostas_em_aberto,
            total_value=total_value,
            won_value_this_month=won_value_this_month,
            pipeline_value=pipeline_value,
            conversion_rate_this_month=conversion_rate_this_month,
            avg_time_to_win_days=avg_time_to_win_days,
            top_sellers_this_month=top_sellers_this_month,
            top_sdrs_by_meetings=top_sdrs_by_meetings,
            cards_by_stage=cards_by_stage,
            cards_by_stage_prospeccao=cards_by_stage_prospeccao,
            sales_evolution=sales_evolution,
            activity_counts_by_type=activity_counts_by_type,
            cards_by_channel=cards_by_channel,
            meetings_scheduled_by_seller=meetings_scheduled_by_seller,
        )

    def get_sales_report(
        self,
        request: SalesReportRequest
    ) -> SalesReportResponse:
        """
        Gera relatório de vendas por período.

        Args:
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
        query_filter = []
        if request.board_id:
            query_filter.append(Board.id == request.board_id)

        boards = self.db.query(Board).filter(*query_filter).all() if query_filter else self.db.query(Board).all()
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
        request: ConversionReportRequest
    ) -> ConversionReportResponse:
        """
        Gera relatório de conversão (funil de vendas).

        Args:
            request: Parâmetros do relatório

        Returns:
            ConversionReportResponse
        """
        # Verifica se o board existe
        board = self.board_repository.find_by_id(request.board_id)
        if not board:
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
        request: TransferReportRequest
    ) -> TransferReportResponse:
        """
        Gera relatório de transferências.

        Args:
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
