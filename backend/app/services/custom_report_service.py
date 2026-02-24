"""
CustomReportService — Lógica de negócio para Relatórios Customizados.

Responsabilidades:
  1. CRUD: criar, listar, buscar, atualizar e deletar relatórios salvos.
  2. Catálogo de campos: retorna a definição dos campos disponíveis por fonte.
  3. Query Engine: executa queries SQLAlchemy com base na configuração de gráfico
     vinda do frontend (x_field, y_fields, period) e retorna dados para renderização.
"""
from typing import List, Optional, Tuple, Dict, Any
from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case

from app.models.custom_report import CustomReport
from app.models.card import Card
from app.models.client import Client
from app.models.person import Person
from app.models.activity import Activity
from app.models.user import User
from app.models.card_task import CardTask, TaskType
from app.schemas.custom_report import (
    QueryRequest,
    QueryResponse,
    SeriesDataSchema,
    CustomReportCreate,
    CustomReportResponse,
    FieldDefinitionSchema,
    FieldCatalogResponse,
)
from app.schemas.report import PeriodEnum

# Rótulos legíveis por fonte (espelha o frontend para nomes únicos de série)
_SOURCE_LABELS = {
    'cards': 'Negócios',
    'clients': 'Clientes',
    'persons': 'Pessoas',
    'activities': 'Atividades',
    'tasks': 'Tarefas',
}

# Rótulos em português para os tipos de tarefa do CardTask
_TASK_TYPE_LABELS = {
    'call': 'Ligação',
    'meeting': 'Reunião',
    'task': 'Tarefa',
    'follow_up': 'Acompanhamento',
    'deadline': 'Prazo',
    'email': 'E-mail',
    'lunch': 'Almoço',
    'other': 'Outro',
}

# Abreviações de meses em português para formatação de labels
_MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']


class CustomReportService:
    """Service para relatórios customizados."""

    def __init__(self, db: Session):
        self.db = db

    # ========================
    # UTILITÁRIO: intervalo de datas
    # ========================

    def _get_date_range(
        self,
        period: PeriodEnum,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Tuple[date, date]:
        """
        Calcula o intervalo de datas com base no período.
        Reutiliza a mesma lógica do ReportService para manter consistência.
        """
        from datetime import timedelta

        today = date.today()

        if period == PeriodEnum.CUSTOM:
            if not start_date or not end_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="start_date e end_date são obrigatórios para period=custom",
                )
            return (start_date, end_date)

        elif period == PeriodEnum.TODAY:
            return (today, today)

        elif period == PeriodEnum.YESTERDAY:
            yesterday = today - timedelta(days=1)
            return (yesterday, yesterday)

        elif period == PeriodEnum.THIS_WEEK:
            start = today - timedelta(days=today.weekday())
            return (start, today)

        elif period == PeriodEnum.LAST_WEEK:
            start = today - timedelta(days=today.weekday() + 7)
            end = start + timedelta(days=6)
            return (start, end)

        elif period == PeriodEnum.THIS_MONTH:
            start = today.replace(day=1)
            return (start, today)

        elif period == PeriodEnum.LAST_MONTH:
            first_day_this_month = today.replace(day=1)
            last_day_last_month = first_day_this_month - timedelta(days=1)
            first_day_last_month = last_day_last_month.replace(day=1)
            return (first_day_last_month, last_day_last_month)

        elif period == PeriodEnum.THIS_QUARTER:
            quarter = (today.month - 1) // 3
            start = today.replace(month=quarter * 3 + 1, day=1)
            return (start, today)

        elif period == PeriodEnum.LAST_QUARTER:
            quarter = (today.month - 1) // 3
            if quarter == 0:
                start = date(today.year - 1, 10, 1)
                end = date(today.year - 1, 12, 31)
            else:
                start = today.replace(month=(quarter - 1) * 3 + 1, day=1)
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
                detail=f"Período inválido: {period}",
            )

    # ========================
    # CRUD DE RELATÓRIOS
    # ========================

    def list_reports(self) -> List[CustomReportResponse]:
        """Lista todos os relatórios customizados da empresa."""
        reports = (
            self.db.query(CustomReport)
            .order_by(CustomReport.updated_at.desc())
            .all()
        )

        result = []
        for report in reports:
            # Monta a response manualmente para incluir o nome do criador
            result.append(CustomReportResponse(
                id=report.id,
                name=report.name,
                created_by_name=report.created_by.name if report.created_by else "Desconhecido",
                updated_at=report.updated_at,
                charts_count=report.charts_count,
                config=report.config,
            ))

        return result

    def get_report(self, report_id: int) -> CustomReportResponse:
        """Busca um relatório por ID. Lança 404 se não existir."""
        report = self.db.query(CustomReport).filter(CustomReport.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Relatório {report_id} não encontrado",
            )

        return CustomReportResponse(
            id=report.id,
            name=report.name,
            created_by_name=report.created_by.name if report.created_by else "Desconhecido",
            updated_at=report.updated_at,
            charts_count=report.charts_count,
            config=report.config,
        )

    def create_report(self, data: CustomReportCreate, user_id: int) -> CustomReportResponse:
        """Cria um novo relatório customizado."""
        # Calcula o número de gráficos a partir do config
        charts = data.config.get('charts', [])
        charts_count = len(charts) if isinstance(charts, list) else 0

        report = CustomReport(
            name=data.name.strip(),
            created_by_id=user_id,
            config=data.config,
            charts_count=charts_count,
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        return CustomReportResponse(
            id=report.id,
            name=report.name,
            created_by_name=report.created_by.name if report.created_by else "Desconhecido",
            updated_at=report.updated_at,
            charts_count=report.charts_count,
            config=report.config,
        )

    def update_report(self, report_id: int, data: CustomReportCreate) -> CustomReportResponse:
        """Atualiza nome e configuração de um relatório existente."""
        report = self.db.query(CustomReport).filter(CustomReport.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Relatório {report_id} não encontrado",
            )

        charts = data.config.get('charts', [])
        charts_count = len(charts) if isinstance(charts, list) else 0

        report.name = data.name.strip()
        report.config = data.config
        report.charts_count = charts_count

        self.db.commit()
        self.db.refresh(report)

        return CustomReportResponse(
            id=report.id,
            name=report.name,
            created_by_name=report.created_by.name if report.created_by else "Desconhecido",
            updated_at=report.updated_at,
            charts_count=report.charts_count,
            config=report.config,
        )

    def delete_report(self, report_id: int) -> None:
        """Remove um relatório definitivamente."""
        report = self.db.query(CustomReport).filter(CustomReport.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Relatório {report_id} não encontrado",
            )

        self.db.delete(report)
        self.db.commit()

    # ========================
    # CATÁLOGO DE CAMPOS
    # ========================

    def get_field_catalog(self) -> FieldCatalogResponse:
        """
        Retorna o catálogo de campos disponíveis por fonte de dados.
        Espelha o FIELD_CATALOG do frontend para manter sincronismo.
        Ponto de evolução futuro: tornar dinâmico com campos customizados.
        """
        def field(key: str, label: str, field_type: str,
                  groupable: bool, aggregatable: bool) -> FieldDefinitionSchema:
            return FieldDefinitionSchema(
                key=key, label=label, field_type=field_type,
                groupable=groupable, aggregatable=aggregatable,
            )

        return FieldCatalogResponse(
            cards=[
                field('created_at', 'Data de Criação', 'date', True, False),
                field('closed_at', 'Data de Fechamento', 'date', True, False),
                field('due_date', 'Data Limite', 'date', True, False),
                field('value', 'Valor do Negócio', 'currency', False, True),
                field('is_won', 'Status', 'category', True, False),
                field('acquisition_channel', 'Canal de Aquisição', 'category', True, False),
                field('deal_type', 'Tipo de Negócio', 'category', True, False),
                field('assigned_to', 'Vendedor', 'user', True, False),
                field('sdr', 'SDR', 'user', True, False),
                field('loss_reason', 'Motivo de Perda', 'category', True, False),
                field('count', 'Quantidade', 'number', False, True),
                field('won_count', 'Negócios Ganhos', 'number', False, True),
            ],
            clients=[
                field('created_at', 'Data de Cadastro', 'date', True, False),
                field('sector', 'Setor', 'category', True, False),
                field('state', 'Estado (UF)', 'category', True, False),
                field('employee_count', 'Faixa de Funcionários', 'category', True, False),
                field('annual_revenue', 'Faixa de Faturamento', 'category', True, False),
                field('count', 'Quantidade', 'number', False, True),
            ],
            persons=[
                field('created_at', 'Data de Cadastro', 'date', True, False),
                field('position', 'Cargo', 'category', True, False),
                field('area', 'Área/Departamento', 'category', True, False),
                field('count', 'Quantidade', 'number', False, True),
            ],
            activities=[
                field('created_at', 'Data da Atividade', 'date', True, False),
                field('activity_type', 'Tipo de Atividade', 'category', True, False),
                field('user', 'Responsável', 'user', True, False),
                field('count', 'Quantidade', 'number', False, True),
            ],
            tasks=[
                field('due_date', 'Data da Tarefa', 'date', True, False),
                field('created_at', 'Data de Criação', 'date', True, False),
                field('completed_at', 'Data de Conclusão', 'date', True, False),
                field('task_type', 'Tipo de Atividade', 'category', True, False),
                field('assigned_to', 'Responsável', 'user', True, False),
                field('is_completed', 'Status', 'category', True, False),
                field('count', 'Quantidade', 'number', False, True),
                field('meeting_count', 'Reuniões', 'number', False, True),
            ],
        )

    # ========================
    # QUERY ENGINE — PRIVADOS
    # ========================

    def _format_date_label(self, dt_val: Any, group_by: str) -> str:
        """Formata um valor de data (datetime ou date) para label legível."""
        if dt_val is None:
            return "Sem data"
        if hasattr(dt_val, 'month'):
            m = dt_val.month
            y = dt_val.year
            if group_by == 'month':
                return f"{_MONTH_SHORT[m - 1]}/{str(y)[2:]}"
            elif group_by == 'day':
                return f"{dt_val.day:02d}/{m:02d}"
            elif group_by == 'week':
                # Calcula o número da semana usando isocalendar()
                week_num = dt_val.isocalendar()[1]
                return f"Sem {week_num}"
            elif group_by == 'year':
                return str(y)
        return str(dt_val)

    def _get_x_date_col(self, source: str, key: str):
        """Retorna a coluna de data do modelo correspondente ao x_field."""
        if source == 'cards':
            cols = {
                'created_at': Card.created_at,
                'closed_at': Card.closed_at,
                'due_date': Card.due_date,
            }
            return cols.get(key, Card.created_at)
        elif source == 'clients':
            return Client.created_at
        elif source == 'persons':
            return Person.created_at
        elif source == 'activities':
            return Activity.created_at
        elif source == 'tasks':
            cols = {
                'due_date': CardTask.due_date,
                'created_at': CardTask.created_at,
                'completed_at': CardTask.completed_at,
            }
            return cols.get(key, CardTask.due_date)
        return None

    def _get_x_category_col(self, source: str, key: str):
        """Retorna a coluna categórica/user para o x_field (sem JOIN de user)."""
        if source == 'cards':
            cols = {
                'is_won': Card.is_won,
                'acquisition_channel': Card.acquisition_channel,
                'deal_type': Card.deal_type,
                'assigned_to': Card.assigned_to_id,  # FK — join feito separado
                'sdr': Card.sdr_id,
                'loss_reason': Card.loss_reason,
            }
            return cols.get(key)
        elif source == 'clients':
            cols = {
                'sector': Client.sector,
                'state': Client.state,
                'employee_count': Client.employee_count,
                'annual_revenue': Client.annual_revenue,
            }
            return cols.get(key)
        elif source == 'persons':
            cols = {
                'position': Person.position,
                'area': Person.area,
            }
            return cols.get(key)
        elif source == 'activities':
            cols = {
                'activity_type': Activity.activity_type,
                'user': Activity.user_id,
            }
            return cols.get(key)
        elif source == 'tasks':
            cols = {
                'task_type': CardTask.task_type,
                'is_completed': CardTask.is_completed,
            }
            return cols.get(key)
        return None

    def _is_won_label(self, val) -> str:
        """Converte o valor numérico de is_won para label legível."""
        mapping = {0: 'Aberto', 1: 'Ganho', -1: 'Perdido'}
        if val is None:
            return 'Não informado'
        return mapping.get(int(val), str(val))

    def _get_x_labels_and_order(
        self, source: str, key: str, x_group_by: Optional[str],
        start: date, end: date
    ) -> List[Tuple[str, Any]]:
        """
        Executa GROUP BY no campo X e retorna lista de (label, raw_key).
        raw_key é usado depois para alinhar os valores de Y.
        Filtra pelo intervalo de datas na coluna de criação da fonte.
        """
        results: List[Tuple[str, Any]] = []

        if key == 'count':
            # Caso especial: 'count' não é groupável — não deveria chegar aqui
            return []

        # --- Campos de data ---
        if x_group_by:
            date_col = self._get_x_date_col(source, key)
            if date_col is None:
                return []

            trunc_expr = func.date_trunc(x_group_by, date_col)
            base_filter = and_(
                func.date(date_col) >= start,
                func.date(date_col) <= end,
            )

            # Filtro de soft delete por fonte
            source_filter = self._get_source_alive_filter(source)

            query = (
                self.db.query(trunc_expr.label('group_val'))
                .filter(base_filter)
            )
            if source_filter is not None:
                query = query.filter(source_filter)
            query = query.group_by(trunc_expr).order_by(trunc_expr)

            rows = query.all()
            for row in rows:
                raw = row[0]
                label = self._format_date_label(raw, x_group_by)
                results.append((label, raw))

            return results

        # --- Campos de user (assigned_to, sdr, activities.user) ---
        if key in ('assigned_to', 'sdr'):
            # JOIN com User para obter o nome
            user_alias = User
            if key == 'assigned_to':
                fk_col = Card.assigned_to_id
            else:
                fk_col = Card.sdr_id

            rows = (
                self.db.query(user_alias.name.label('group_val'), user_alias.id.label('raw_key'))
                .join(Card, fk_col == user_alias.id)
                .filter(Card.is_deleted == False)
                .group_by(user_alias.id, user_alias.name)
                .order_by(user_alias.name)
                .all()
            )
            for row in rows:
                results.append((str(row.group_val or 'Sem usuário'), row.raw_key))
            return results

        if source == 'activities' and key == 'user':
            rows = (
                self.db.query(User.name.label('group_val'), User.id.label('raw_key'))
                .join(Activity, Activity.user_id == User.id)
                .group_by(User.id, User.name)
                .order_by(User.name)
                .all()
            )
            for row in rows:
                results.append((str(row.group_val or 'Sem usuário'), row.raw_key))
            return results

        if source == 'tasks' and key == 'assigned_to':
            rows = (
                self.db.query(User.name.label('group_val'), User.id.label('raw_key'))
                .join(CardTask, CardTask.assigned_to_id == User.id)
                .group_by(User.id, User.name)
                .order_by(User.name)
                .all()
            )
            for row in rows:
                results.append((str(row.group_val or 'Sem usuário'), row.raw_key))
            return results

        # --- Campos categóricos normais ---
        cat_col = self._get_x_category_col(source, key)
        if cat_col is None:
            return []

        source_filter = self._get_source_alive_filter(source)

        query = self.db.query(cat_col.label('group_val')).group_by(cat_col).order_by(cat_col)
        if source_filter is not None:
            query = query.filter(source_filter)
        query = query.limit(100)

        rows = query.all()
        for row in rows:
            raw = row[0]
            if key == 'is_won':
                label = self._is_won_label(raw)
            elif key == 'task_type':
                # TaskType é str+Enum — usar .value para obter "meeting", não "TaskType.MEETING"
                raw_str = raw.value if hasattr(raw, 'value') else str(raw)
                label = _TASK_TYPE_LABELS.get(raw_str, raw_str if raw is not None else 'Não informado')
            elif key == 'is_completed':
                label = 'Concluída' if raw else 'Pendente'
            else:
                label = str(raw) if raw is not None else 'Não informado'
            results.append((label, raw))

        return results

    def _get_source_alive_filter(self, source: str):
        """Retorna o filtro de 'não deletado' para a fonte. None se não aplicável."""
        if source in ('cards', 'clients'):
            model = Card if source == 'cards' else Client
            return model.is_deleted == False
        # Person não tem soft delete — filtra is_active
        if source == 'persons':
            return Person.is_active == True
        # Activity e CardTask não têm soft delete
        return None

    def _get_split_values(
        self, source: str, key: str
    ) -> List[Tuple[str, Any]]:
        """
        Retorna (label, raw_value) para cada valor único do campo split_by.
        Limitado a 20 valores para evitar séries excessivas no gráfico.
        Campos de usuário retornam o nome; campos categóricos retornam o valor.
        """
        results: List[Tuple[str, Any]] = []

        # Campos de usuário em Negócios (assigned_to / sdr)
        if source == 'cards' and key in ('assigned_to', 'sdr'):
            fk_col = Card.assigned_to_id if key == 'assigned_to' else Card.sdr_id
            rows = (
                self.db.query(User.name.label('label'), User.id.label('raw'))
                .join(Card, fk_col == User.id)
                .filter(Card.is_deleted == False)
                .group_by(User.id, User.name)
                .order_by(User.name)
                .limit(20)
                .all()
            )
            return [(str(row.label or 'Sem usuário'), row.raw) for row in rows]

        # Campo de usuário em Atividades
        if source == 'activities' and key == 'user':
            rows = (
                self.db.query(User.name.label('label'), User.id.label('raw'))
                .join(Activity, Activity.user_id == User.id)
                .group_by(User.id, User.name)
                .order_by(User.name)
                .limit(20)
                .all()
            )
            return [(str(row.label or 'Sem usuário'), row.raw) for row in rows]

        # Campo de usuário em Tarefas
        if source == 'tasks' and key == 'assigned_to':
            rows = (
                self.db.query(User.name.label('label'), User.id.label('raw'))
                .join(CardTask, CardTask.assigned_to_id == User.id)
                .group_by(User.id, User.name)
                .order_by(User.name)
                .limit(20)
                .all()
            )
            return [(str(row.label or 'Sem usuário'), row.raw) for row in rows]

        # Campos categóricos normais
        cat_col = self._get_x_category_col(source, key)
        if cat_col is None:
            return []

        source_filter = self._get_source_alive_filter(source)
        query = self.db.query(cat_col.label('val')).group_by(cat_col).order_by(cat_col)
        if source_filter is not None:
            query = query.filter(source_filter)
        query = query.limit(20)

        for row in query.all():
            raw = row[0]
            if key == 'is_won':
                label = self._is_won_label(raw)
            elif key == 'task_type':
                # TaskType é str+Enum — usar .value para obter "meeting", não "TaskType.MEETING"
                raw_str = raw.value if hasattr(raw, 'value') else str(raw)
                label = _TASK_TYPE_LABELS.get(raw_str, raw_str if raw is not None else 'Não informado')
            elif key == 'is_completed':
                label = 'Concluída' if raw else 'Pendente'
            else:
                label = str(raw) if raw is not None else 'Não informado'
            results.append((label, raw))

        return results

    def _build_split_filter(self, source: str, key: str, raw_value: Any):
        """
        Retorna a expressão SQLAlchemy para filtrar um valor específico do campo split_by.
        Usado para gerar cada série individualmente na execução da query com split.
        """
        if source == 'cards':
            if key == 'assigned_to':
                return Card.assigned_to_id == raw_value
            if key == 'sdr':
                return Card.sdr_id == raw_value
            col = self._get_x_category_col(source, key)
            return col == raw_value if col is not None else None

        if source == 'activities' and key == 'user':
            return Activity.user_id == raw_value

        if source == 'tasks':
            if key == 'assigned_to':
                return CardTask.assigned_to_id == raw_value
            col = self._get_x_category_col(source, key)
            return col == raw_value if col is not None else None

        col = self._get_x_category_col(source, key)
        return col == raw_value if col is not None else None

    def _get_y_values_for_labels(
        self,
        x_field_source: str,
        x_field_key: str,
        x_group_by: Optional[str],
        y_source: str,
        y_key: str,
        y_aggregation: str,
        label_raw_pairs: List[Tuple[str, Any]],
        start: date,
        end: date,
        extra_filters: Optional[List] = None,
    ) -> List[float]:
        """
        Para cada label (grupo X), calcula o valor agregado do campo Y.
        Retorna lista de floats alinhada com label_raw_pairs.
        extra_filters: filtros SQLAlchemy adicionais (usados pelo split_by).
        """
        if not label_raw_pairs:
            return []

        # Executa a query de agregação e monta um dict {raw_key: value}
        raw_to_value: Dict[Any, float] = self._run_y_agg_query(
            x_field_source, x_field_key, x_group_by,
            y_source, y_key, y_aggregation, start, end,
            extra_filters=extra_filters,
        )

        # Alinha os valores na ordem dos labels (0 para ausentes)
        values = []
        for label, raw_key in label_raw_pairs:
            val = raw_to_value.get(raw_key, 0.0)
            values.append(float(val))

        return values

    def _run_y_agg_query(
        self,
        x_source: str, x_key: str, x_group_by: Optional[str],
        y_source: str, y_key: str, y_agg: str,
        start: date, end: date,
        extra_filters: Optional[List] = None,
    ) -> Dict[Any, float]:
        """
        Executa a agregação Y agrupada por X e retorna {raw_x_key: y_value}.
        Cobre combinações de fontes com JOINs automáticos.
        """
        result: Dict[Any, float] = {}

        try:
            # Determina a expressão da chave X (para GROUP BY)
            x_raw_expr = self._build_x_raw_expr(x_source, x_key, x_group_by)
            if x_raw_expr is None:
                return result

            # Determina a expressão de agregação Y
            y_agg_expr, needs_join = self._build_y_agg_expr(
                x_source, y_source, y_key, y_agg
            )
            if y_agg_expr is None:
                return result

            # Constrói a query base
            rows = self._execute_agg_query(
                x_source, y_source, x_raw_expr, y_agg_expr,
                x_key, x_group_by, start, end, needs_join,
                extra_filters=extra_filters,
            )

            for raw_key, y_val in rows:
                # Garante que Decimal vira float (armadilha do PostgreSQL NUMERIC)
                if isinstance(y_val, Decimal):
                    y_val = float(y_val)
                result[raw_key] = float(y_val or 0)

        except Exception:
            # Em caso de erro na query, retorna dict vazio (valores zerados)
            pass

        return result

    def _build_x_raw_expr(self, x_source: str, x_key: str, x_group_by: Optional[str]):
        """
        Retorna a expressão SQLAlchemy para a chave X (usada no GROUP BY).
        Para datas retorna date_trunc; para user retorna o FK id; outros, a coluna.
        """
        if x_group_by:
            date_col = self._get_x_date_col(x_source, x_key)
            if date_col is None:
                return None
            return func.date_trunc(x_group_by, date_col)

        if x_source == 'cards' and x_key in ('assigned_to', 'sdr'):
            return Card.assigned_to_id if x_key == 'assigned_to' else Card.sdr_id

        if x_source == 'activities' and x_key == 'user':
            return Activity.user_id

        if x_source == 'tasks' and x_key == 'assigned_to':
            return CardTask.assigned_to_id

        col = self._get_x_category_col(x_source, x_key)
        return col

    def _build_y_agg_expr(self, x_source: str, y_source: str, y_key: str, y_agg: str):
        """
        Retorna (expressão de agregação, precisou_de_join: bool).
        None se a combinação não for suportada.

        Campos especiais com agregação condicional (CASE WHEN):
          - won_count: conta apenas cards com is_won = 1
          - meeting_count: conta apenas tarefas com task_type = 'meeting'
        """
        needs_join = (x_source != y_source)

        # Campo especial: won_count — COUNT(CASE WHEN is_won=1 THEN 1 END)
        if y_source == 'cards' and y_key == 'won_count':
            expr = func.count(case((Card.is_won == 1, 1), else_=None))
            return expr, needs_join

        # Campo especial: meeting_count — COUNT(CASE WHEN task_type='meeting' THEN 1 END)
        if y_source == 'tasks' and y_key == 'meeting_count':
            expr = func.count(case((CardTask.task_type == TaskType.MEETING, 1), else_=None))
            return expr, (x_source != 'tasks')

        # Mapeamento de colunas Y por fonte
        y_col_map = {
            'cards': {
                'count': Card.id,
                'value': Card.value,
            },
            'clients': {
                'count': Client.id,
            },
            'persons': {
                'count': Person.id,
            },
            'activities': {
                'count': Activity.id,
            },
            'tasks': {
                'count': CardTask.id,
            },
        }

        # Para cross-source, precisa de JOIN
        needs_join = (x_source != y_source)

        # Para 'count', sempre contamos o ID da fonte Y
        source_cols = y_col_map.get(y_source, {})
        y_col = source_cols.get(y_key) or source_cols.get('count')

        if y_col is None:
            return None, False

        if y_agg == 'count':
            expr = func.count(y_col)
        elif y_agg == 'distinct_count':
            expr = func.count(func.distinct(y_col))
        elif y_agg == 'sum':
            expr = func.sum(y_col)
        elif y_agg == 'avg':
            expr = func.avg(y_col)
        else:
            expr = func.count(y_col)

        return expr, needs_join

    def _execute_agg_query(
        self, x_source: str, y_source: str,
        x_raw_expr, y_agg_expr,
        x_key: str, x_group_by: Optional[str],
        start: date, end: date, needs_join: bool,
        extra_filters: Optional[List] = None,
    ) -> List[Tuple[Any, Any]]:
        """
        Executa a query de agregação e retorna lista de (raw_x_key, y_value).
        Aplica os JOINs necessários e filtros de data.
        extra_filters: filtros adicionais do split_by (ex: Card.assigned_to_id == user_id).
        """
        extra = list(extra_filters or [])

        # --- Fonte base: cards ---
        if x_source == 'cards':
            base_filter = [Card.is_deleted == False] + extra

            # Filtro de data — usa a coluna de data do x_field se for data
            if x_group_by:
                date_col = self._get_x_date_col('cards', x_key)
                base_filter += [
                    func.date(date_col) >= start,
                    func.date(date_col) <= end,
                ]

            if not needs_join:
                # Mesma fonte: agrega diretamente
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .filter(*base_filter)
                    .group_by(x_raw_expr)
                )
            elif y_source == 'activities':
                # cards → activities via card_id
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .join(Activity, Activity.card_id == Card.id)
                    .filter(*base_filter)
                    .group_by(x_raw_expr)
                )
            elif y_source == 'tasks':
                # cards → card_tasks via card_id
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .join(CardTask, CardTask.card_id == Card.id)
                    .filter(*base_filter)
                    .group_by(x_raw_expr)
                )
            elif y_source == 'clients':
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .join(Client, Card.client_id == Client.id)
                    .filter(*base_filter)
                    .group_by(x_raw_expr)
                )
            elif y_source == 'persons':
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .join(Person, Card.person_id == Person.id)
                    .filter(*base_filter)
                    .group_by(x_raw_expr)
                )
            else:
                return []

            # JOIN especial para user fields (assigned_to, sdr)
            if x_key in ('assigned_to', 'sdr') and not x_group_by:
                # x_raw_expr já é a FK id; JOIN com User para o GROUP BY (mas agrupamos por id)
                pass  # o GROUP BY por id é suficiente

            return [(row.x_key, row.y_val) for row in q.all()]

        # --- Fonte base: clients ---
        elif x_source == 'clients':
            base_filter = [Client.is_deleted == False] + extra

            if x_group_by:
                date_col = Client.created_at
                base_filter += [
                    func.date(date_col) >= start,
                    func.date(date_col) <= end,
                ]

            if not needs_join:
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .filter(*base_filter)
                    .group_by(x_raw_expr)
                )
            elif y_source == 'cards':
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .join(Card, Card.client_id == Client.id)
                    .filter(*base_filter, Card.is_deleted == False)
                    .group_by(x_raw_expr)
                )
            elif y_source == 'persons':
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .join(Person, Person.organization_id == Client.id)
                    .filter(*base_filter)
                    .group_by(x_raw_expr)
                )
            else:
                return []

            return [(row.x_key, row.y_val) for row in q.all()]

        # --- Fonte base: persons ---
        elif x_source == 'persons':
            base_filter = [Person.is_active == True] + extra

            if x_group_by:
                date_col = Person.created_at
                base_filter += [
                    func.date(date_col) >= start,
                    func.date(date_col) <= end,
                ]

            if not needs_join:
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .filter(*base_filter)
                    .group_by(x_raw_expr)
                )
            elif y_source == 'cards':
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .join(Card, Card.person_id == Person.id)
                    .filter(*base_filter, Card.is_deleted == False)
                    .group_by(x_raw_expr)
                )
            else:
                return []

            return [(row.x_key, row.y_val) for row in q.all()]

        # --- Fonte base: activities ---
        elif x_source == 'activities':
            base_filter = [] + extra

            if x_group_by:
                date_col = Activity.created_at
                base_filter += [
                    func.date(date_col) >= start,
                    func.date(date_col) <= end,
                ]

            if not needs_join:
                q = self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                if base_filter:
                    q = q.filter(*base_filter)
                q = q.group_by(x_raw_expr)
            elif y_source == 'cards':
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .join(Card, Activity.card_id == Card.id)
                    .filter(Card.is_deleted == False)
                )
                if base_filter:
                    q = q.filter(*base_filter)
                q = q.group_by(x_raw_expr)
            else:
                return []

            return [(row.x_key, row.y_val) for row in q.all()]

        # --- Fonte base: tasks (CardTask) ---
        elif x_source == 'tasks':
            base_filter = [] + extra

            if x_group_by:
                date_col = self._get_x_date_col('tasks', x_key)
                base_filter += [
                    func.date(date_col) >= start,
                    func.date(date_col) <= end,
                ]

            if not needs_join:
                # Mesma fonte: agrega diretamente
                q = self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                if base_filter:
                    q = q.filter(*base_filter)
                q = q.group_by(x_raw_expr)
            elif y_source == 'cards':
                # tasks → cards via card_id
                q = (
                    self.db.query(x_raw_expr.label('x_key'), y_agg_expr.label('y_val'))
                    .join(Card, CardTask.card_id == Card.id)
                    .filter(Card.is_deleted == False)
                )
                if base_filter:
                    q = q.filter(*base_filter)
                q = q.group_by(x_raw_expr)
            else:
                return []

            return [(row.x_key, row.y_val) for row in q.all()]

        # --- Suporte a y_source='tasks' quando x_source='cards' ---
        # (coberto pelo branch cards acima com JOIN CardTask)

        return []

    # ========================
    # QUERY ENGINE — PÚBLICO
    # ========================

    def execute_query(self, request: QueryRequest) -> QueryResponse:
        """
        Executa a query de um gráfico e retorna os dados para renderização.

        Fluxo:
          1. Calcula o intervalo de datas.
          2. Busca os grupos X (labels + raw keys).
          3. Para cada campo Y, calcula os valores agregados alinhados aos labels.
          4. Retorna QueryResponse no formato single-série ou multi-série.
        """
        start, end = self._get_date_range(request.period, request.start_date, request.end_date)

        # Passo 1: obtém labels e raw keys do eixo X
        label_raw_pairs = self._get_x_labels_and_order(
            request.x_field.source,
            request.x_field.key,
            request.x_group_by,
            start, end,
        )

        if not label_raw_pairs:
            return QueryResponse(labels=[], values=[], total=0.0)

        labels = [pair[0] for pair in label_raw_pairs]

        # Passo 2a: se split_by estiver definido, gera uma série por valor único da dimensão
        if request.split_by and request.y_fields:
            split_values = self._get_split_values(
                request.split_by.source, request.split_by.key
            )
            if split_values:
                # Usa apenas o primeiro y_field quando split_by está ativo
                yf = request.y_fields[0]
                series = []
                for split_label, split_raw in split_values:
                    split_filter = self._build_split_filter(
                        request.split_by.source, request.split_by.key, split_raw
                    )
                    extra = [split_filter] if split_filter is not None else []

                    values = self._get_y_values_for_labels(
                        x_field_source=request.x_field.source,
                        x_field_key=request.x_field.key,
                        x_group_by=request.x_group_by,
                        y_source=yf.field.source,
                        y_key=yf.field.key,
                        y_aggregation=yf.aggregation,
                        label_raw_pairs=label_raw_pairs,
                        start=start,
                        end=end,
                        extra_filters=extra,
                    )
                    series.append(SeriesDataSchema(name=split_label, values=values))

                return QueryResponse(labels=labels, series=series)

        # Passo 2b: calcula valores para cada y_field (modo normal, sem split_by)
        y_results: List[List[float]] = []
        for yf in request.y_fields:
            values = self._get_y_values_for_labels(
                x_field_source=request.x_field.source,
                x_field_key=request.x_field.key,
                x_group_by=request.x_group_by,
                y_source=yf.field.source,
                y_key=yf.field.key,
                y_aggregation=yf.aggregation,
                label_raw_pairs=label_raw_pairs,
                start=start,
                end=end,
            )
            y_results.append(values)

        # Passo 3: monta a resposta
        if len(request.y_fields) == 1:
            # Single-série
            values_flat = y_results[0] if y_results else [0.0] * len(labels)
            total = sum(values_flat)
            return QueryResponse(labels=labels, values=values_flat, total=total)

        else:
            # Multi-série — detecta labels duplicados para nomes únicos
            y_labels_list = [yf.field.label for yf in request.y_fields]
            has_duplicates = len(y_labels_list) != len(set(y_labels_list))

            series = []
            for i, yf in enumerate(request.y_fields):
                source_label = _SOURCE_LABELS.get(yf.field.source, yf.field.source)
                name = (
                    f"{yf.field.label} ({source_label})"
                    if has_duplicates
                    else yf.field.label
                )
                series.append(SeriesDataSchema(
                    name=name,
                    values=y_results[i] if i < len(y_results) else [0.0] * len(labels),
                ))

            return QueryResponse(labels=labels, series=series)
