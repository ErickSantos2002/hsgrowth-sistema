"""
CustomReportService — Lógica de negócio para Relatórios Customizados.

Responsabilidades:
  1. CRUD: criar, listar, buscar, atualizar e deletar relatórios salvos.
  2. Catálogo de campos: retorna a definição dos campos disponíveis por fonte.
  3. Query Engine: executa queries SQLAlchemy com base na configuração de gráfico
     vinda do frontend (x_field, y_fields, period) e retorna dados para renderização.
"""
from typing import List, Optional, Tuple, Dict, Any
from datetime import date, timedelta
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
from app.models.attachment import Attachment
from app.models.card_list_history import CardListHistory
from app.models.list import List as BoardList
from app.schemas.custom_report import (
    QueryRequest,
    QueryResponse,
    SeriesDataSchema,
    CustomReportCreate,
    CustomReportResponse,
    FieldDefinitionSchema,
    FieldCatalogResponse,
    DrillDownRequest,
    DrillDownCard,
    DrillDownResponse,
    CalculatedFieldSchema,
)
from app.core.formula_evaluator import FormulaEvaluator
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

# ID da lista "Prospecção" dentro do board "Prospecção" (board_id=6, list_id=23).
# Usado para calcular "Negócios Válidos" — cards que chegaram nessa etapa.
_PROSPECCAO_LIST_ID = 23


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
                # Datas
                field('created_at', 'Data de Criação', 'date', True, False),
                field('closed_at', 'Data de Fechamento', 'date', True, False),
                field('due_date', 'Data Limite', 'date', True, False),
                field('prospection_entry_date', 'Data Entrada Prospecção', 'date', True, False),
                field('acquisition_entry_date', 'Data Entrada Aquisição', 'date', True, False),
                field('expansion_entry_date', 'Data Entrada Expansão', 'date', True, False),
                # Valores monetários (agregáveis)
                field('value', 'Valor do Negócio', 'currency', False, True),
                field('shipping_cost', 'Custo de Frete', 'currency', False, True),
                # Dimensões categóricas (groupáveis)
                field('list_name', 'Etapa', 'category', True, False),
                field('is_won', 'Status', 'category', True, False),
                field('acquisition_channel', 'Canal de Aquisição', 'category', True, False),
                field('acquisition_channel_detail', 'Detalhe do Canal', 'category', True, False),
                field('deal_type', 'Tipo de Negócio', 'category', True, False),
                field('loss_reason', 'Motivo de Perda', 'category', True, False),
                field('has_implementation', 'Tem Implementação', 'category', True, False),
                field('has_personnel', 'Tem Pessoal', 'category', True, False),
                # Dimensões de usuário (groupáveis)
                field('assigned_to', 'Vendedor', 'user', True, False),
                field('sdr', 'SDR', 'user', True, False),
                # Métricas (agregáveis)
                field('count', 'Quantidade', 'number', False, True),
                field('won_count', 'Negócios Ganhos', 'number', False, True),
                field('proposal_count', 'Propostas Enviadas', 'number', False, True),
                field('valid_count', 'Negócios Válidos', 'number', False, True),
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
                field('call_count', 'Ligações', 'number', False, True),
                field('completed_call_count', 'Ligações Concluídas', 'number', False, True),
                field('noshow_count', 'NoShow (Reuniões)', 'number', False, True),
            ],
            card_history=[
                # Dimensão: agrupa por nome da etapa, ordenado pela posição no pipeline
                field('stage_name', 'Etapa do Pipeline', 'category', True, False),
                # Métrica: conta negócios distintos que entraram na etapa no período
                field('entry_count', 'Negócios que Entraram', 'number', False, True),
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
                # Exibe a data da segunda-feira da semana no formato DD/MM
                # weekday() retorna 0 para segunda, então subtraímos os dias necessários
                monday = dt_val - timedelta(days=dt_val.weekday())
                return f"{monday.day:02d}/{monday.month:02d}"
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
                'prospection_entry_date': Card.prospection_entry_date,
                'acquisition_entry_date': Card.acquisition_entry_date,
                'expansion_entry_date': Card.expansion_entry_date,
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
                'acquisition_channel_detail': Card.acquisition_channel_detail,
                'deal_type': Card.deal_type,
                'assigned_to': Card.assigned_to_id,  # FK — join feito separado
                'sdr': Card.sdr_id,
                'loss_reason': Card.loss_reason,
                'has_implementation': Card.has_implementation,
                'has_personnel': Card.has_personnel,
                # list_name requer JOIN com BoardList — tratado separadamente
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

        # --- Etapa do pipeline por histórico de entrada (card_history.stage_name) ---
        # Retorna as etapas que tiveram ao menos um card entrando no período,
        # ordenadas por board e posição para refletir a ordem real do pipeline.
        if source == 'card_history' and key == 'stage_name':
            rows = (
                self.db.query(
                    BoardList.name.label('group_val'),
                    BoardList.id.label('raw_key'),
                )
                .join(CardListHistory, CardListHistory.list_id == BoardList.id)
                .filter(
                    func.date(CardListHistory.entered_at) >= start,
                    func.date(CardListHistory.entered_at) <= end,
                )
                .group_by(BoardList.id, BoardList.name, BoardList.board_id, BoardList.position)
                .order_by(BoardList.board_id, BoardList.position)
                .all()
            )
            for row in rows:
                results.append((str(row.group_val or 'Sem etapa'), row.raw_key))
            return results

        # --- Etapa (list_name) — requer JOIN com BoardList ---
        if source == 'cards' and key == 'list_name':
            rows = (
                self.db.query(
                    BoardList.name.label('group_val'),
                    BoardList.id.label('raw_key'),
                )
                .join(Card, Card.list_id == BoardList.id)
                .filter(
                    Card.is_deleted == False,
                    func.date(Card.created_at) >= start,
                    func.date(Card.created_at) <= end,
                )
                .group_by(BoardList.id, BoardList.name, BoardList.position)
                .order_by(BoardList.position, BoardList.name)
                .all()
            )
            for row in rows:
                results.append((str(row.group_val or 'Sem etapa'), row.raw_key))
            return results

        # --- Campos de user (assigned_to, sdr, activities.user) ---
        if key in ('assigned_to', 'sdr'):
            # JOIN com User para obter o nome; filtra pelo período via created_at do card
            user_alias = User
            if key == 'assigned_to':
                fk_col = Card.assigned_to_id
            else:
                fk_col = Card.sdr_id

            rows = (
                self.db.query(user_alias.name.label('group_val'), user_alias.id.label('raw_key'))
                .join(Card, fk_col == user_alias.id)
                .filter(
                    Card.is_deleted == False,
                    func.date(Card.created_at) >= start,
                    func.date(Card.created_at) <= end,
                )
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
                .filter(
                    func.date(Activity.created_at) >= start,
                    func.date(Activity.created_at) <= end,
                )
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
                .filter(
                    func.date(CardTask.created_at) >= start,
                    func.date(CardTask.created_at) <= end,
                )
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

        # Filtra pelo período usando a data primária da fonte, para que o seletor
        # de período funcione mesmo quando o eixo X não é um campo de data
        primary_date = self._get_source_primary_date_col(source)
        source_filter = self._get_source_alive_filter(source)

        query = self.db.query(cat_col.label('group_val')).group_by(cat_col).order_by(cat_col)
        if source_filter is not None:
            query = query.filter(source_filter)
        if primary_date is not None:
            query = query.filter(
                func.date(primary_date) >= start,
                func.date(primary_date) <= end,
            )
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
            elif key in ('has_implementation', 'has_personnel'):
                # 1=Sim, 0=Não, None=Não Informado
                if raw is None:
                    label = 'Não Informado'
                elif int(raw) == 1:
                    label = 'Sim'
                else:
                    label = 'Não'
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
        # Activity, CardTask e card_history não têm soft delete
        return None

    def _get_source_primary_date_col(self, source: str):
        """
        Retorna a coluna de data primária de cada fonte.
        Usada para aplicar o filtro de período em campos categóricos (não-data),
        garantindo que o seletor de período sempre funcione independente do tipo do eixo X.
        """
        cols = {
            'cards': Card.created_at,
            'clients': Client.created_at,
            'persons': Person.created_at,
            'activities': Activity.created_at,
            'tasks': CardTask.created_at,
            # card_history: filtra por quando o card entrou na etapa
            'card_history': CardListHistory.entered_at,
        }
        return cols.get(source)

    def _get_split_values(
        self, source: str, key: str
    ) -> List[Tuple[str, Any]]:
        """
        Retorna (label, raw_value) para cada valor único do campo split_by.
        Limitado a 20 valores para evitar séries excessivas no gráfico.
        Campos de usuário retornam o nome; campos categóricos retornam o valor.
        """
        results: List[Tuple[str, Any]] = []

        # Etapa (list_name) em Negócios — requer JOIN com BoardList
        if source == 'cards' and key == 'list_name':
            rows = (
                self.db.query(BoardList.name.label('label'), BoardList.id.label('raw'))
                .join(Card, Card.list_id == BoardList.id)
                .filter(Card.is_deleted == False)
                .group_by(BoardList.id, BoardList.name, BoardList.position)
                .order_by(BoardList.position, BoardList.name)
                .limit(50)
                .all()
            )
            return [(str(row.label or 'Sem etapa'), row.raw) for row in rows]

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
            elif key in ('has_implementation', 'has_personnel'):
                if raw is None:
                    label = 'Não Informado'
                elif int(raw) == 1:
                    label = 'Sim'
                else:
                    label = 'Não'
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
            if key == 'list_name':
                return Card.list_id == raw_value
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

        # Contagem cumulativa: tratamento especial — delega para método dedicado
        # que sempre usa y_key='count' (ID primário da fonte) dentro do período selecionado
        if y_aggregation == 'cumulative_count':
            return self._get_cumulative_count(
                x_field_source, x_field_key, x_group_by,
                y_source, label_raw_pairs, start, end,
                extra_filters=extra_filters,
            )

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

    def _get_cumulative_count(
        self,
        x_field_source: str,
        x_field_key: str,
        x_group_by: Optional[str],
        y_source: str,
        label_raw_pairs: List[Tuple[str, Any]],
        start: date,
        end: date,
        extra_filters: Optional[List] = None,
    ) -> List[float]:
        """
        Calcula contagem cumulativa: conta registros da fonte Y por bucket X
        dentro do período selecionado e acumula progressivamente.

        Sempre usa y_key='count' (ID primário) para garantir contagem de registros,
        independente do campo Y que o usuário configurou (evita somar valores monetários).
        O resultado final é limitado ao período — ex: "Este Mês" acumula apenas março.
        """
        # Conta registros da fonte Y por bucket X, filtrado ao período
        raw_to_value: Dict[Any, float] = self._run_y_agg_query(
            x_field_source, x_field_key, x_group_by,
            y_source, 'count', 'count',  # sempre conta pelo ID primário da fonte
            start, end,
            extra_filters=extra_filters,
        )

        # Alinha na ordem dos labels (0 para buckets sem dados)
        values = []
        for _label, raw_key in label_raw_pairs:
            val = raw_to_value.get(raw_key, 0.0)
            values.append(float(val))

        # Acumula: cada ponto recebe a soma de todos os pontos anteriores + ele mesmo
        cumulative = 0.0
        for i, v in enumerate(values):
            cumulative += v
            values[i] = cumulative

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
            # Campos especiais que precisam de queries com JOINs próprios
            if y_source == 'cards' and y_key == 'proposal_count':
                return self._run_proposal_count_query(
                    x_source, x_key, x_group_by, start, end, extra_filters
                )
            if y_source == 'cards' and y_key == 'valid_count':
                return self._run_valid_count_query(
                    x_source, x_key, x_group_by, start, end, extra_filters
                )
            # Funil de conversão: conta negócios distintos que ENTRARAM em cada etapa
            if x_source == 'card_history' and y_key == 'entry_count':
                return self._run_stage_entry_query(start, end, extra_filters)

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

        # Etapa: agrupamos pelo FK list_id (os labels já foram resolvidos via JOIN)
        if x_source == 'cards' and x_key == 'list_name':
            return Card.list_id

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

        # Campo especial: call_count — COUNT(CASE WHEN task_type='call' THEN 1 END)
        if y_source == 'tasks' and y_key == 'call_count':
            expr = func.count(case((CardTask.task_type == TaskType.CALL, 1), else_=None))
            return expr, (x_source != 'tasks')

        # Campo especial: completed_call_count — COUNT(CASE WHEN task_type='call' AND is_completed THEN 1 END)
        if y_source == 'tasks' and y_key == 'completed_call_count':
            expr = func.count(
                case(
                    (
                        (CardTask.task_type == TaskType.CALL) & (CardTask.is_completed == True),  # noqa: E712
                        1,
                    ),
                    else_=None,
                )
            )
            return expr, (x_source != 'tasks')

        # Campo especial: noshow_count — COUNT(CASE WHEN task_type='meeting' AND is_noshow THEN 1 END)
        if y_source == 'tasks' and y_key == 'noshow_count':
            expr = func.count(
                case(
                    (
                        (CardTask.task_type == TaskType.MEETING) & (CardTask.is_noshow == True),  # noqa: E712
                        1,
                    ),
                    else_=None,
                )
            )
            return expr, (x_source != 'tasks')

        # Mapeamento de colunas Y por fonte
        y_col_map = {
            'cards': {
                'count': Card.id,
                'value': Card.value,
                'shipping_cost': Card.shipping_cost,
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

            # Filtro de data: usa o campo X quando for data; senão usa created_at (campo categórico)
            date_col = (
                self._get_x_date_col('cards', x_key) if x_group_by
                else self._get_source_primary_date_col('cards')
            )
            if date_col is not None:
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

            date_col = (
                Client.created_at if x_group_by
                else self._get_source_primary_date_col('clients')
            )
            if date_col is not None:
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

            date_col = (
                Person.created_at if x_group_by
                else self._get_source_primary_date_col('persons')
            )
            if date_col is not None:
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

            date_col = (
                Activity.created_at if x_group_by
                else self._get_source_primary_date_col('activities')
            )
            if date_col is not None:
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

            date_col = (
                self._get_x_date_col('tasks', x_key) if x_group_by
                else self._get_source_primary_date_col('tasks')
            )
            if date_col is not None:
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

    def _run_proposal_count_query(
        self,
        x_source: str, x_key: str, x_group_by: Optional[str],
        start: date, end: date,
        extra_filters: Optional[List] = None,
    ) -> Dict[Any, float]:
        """
        Conta cards distintos que possuem ao menos 1 proposta enviada
        (attachments com attachment_type='proposal'), agrupados pelo campo X.

        Usa COUNT(DISTINCT card.id) com JOIN em attachments para evitar
        duplicatas quando um card tem mais de uma proposta.
        """
        result: Dict[Any, float] = {}

        try:
            x_raw_expr = self._build_x_raw_expr(x_source, x_key, x_group_by)
            if x_raw_expr is None:
                return result

            extra = list(extra_filters or [])
            base_filter = [
                Card.is_deleted == False,
                Attachment.attachment_type == 'proposal',
                Attachment.is_deleted == False,
            ] + extra

            # Aplica filtro de data na coluna X quando for um campo de data
            if x_group_by:
                date_col = self._get_x_date_col(x_source, x_key)
                if date_col is not None:
                    base_filter += [
                        func.date(date_col) >= start,
                        func.date(date_col) <= end,
                    ]

            rows = (
                self.db.query(
                    x_raw_expr.label('x_key'),
                    func.count(func.distinct(Card.id)).label('y_val'),
                )
                .join(Attachment, Attachment.card_id == Card.id)
                .filter(*base_filter)
                .group_by(x_raw_expr)
                .all()
            )

            for row in rows:
                result[row.x_key] = float(row.y_val or 0)

        except Exception:
            pass

        return result

    def _run_valid_count_query(
        self,
        x_source: str, x_key: str, x_group_by: Optional[str],
        start: date, end: date,
        extra_filters: Optional[List] = None,
    ) -> Dict[Any, float]:
        """
        Conta cards distintos que chegaram à lista "Prospecção" (list_id=23)
        do board Prospecção, agrupados pelo campo X.

        Usa a tabela card_list_history que registra toda movimentação de cards
        entre listas. Um card é "válido" quando tem ao menos um registro nessa
        lista, independente de onde estiver agora.
        """
        result: Dict[Any, float] = {}

        try:
            x_raw_expr = self._build_x_raw_expr(x_source, x_key, x_group_by)
            if x_raw_expr is None:
                return result

            extra = list(extra_filters or [])
            base_filter = [
                Card.is_deleted == False,
                CardListHistory.list_id == _PROSPECCAO_LIST_ID,
            ] + extra

            # Aplica filtro de data na coluna X quando for um campo de data
            if x_group_by:
                date_col = self._get_x_date_col(x_source, x_key)
                if date_col is not None:
                    base_filter += [
                        func.date(date_col) >= start,
                        func.date(date_col) <= end,
                    ]

            rows = (
                self.db.query(
                    x_raw_expr.label('x_key'),
                    func.count(func.distinct(Card.id)).label('y_val'),
                )
                .join(CardListHistory, CardListHistory.card_id == Card.id)
                .filter(*base_filter)
                .group_by(x_raw_expr)
                .all()
            )

            for row in rows:
                result[row.x_key] = float(row.y_val or 0)

        except Exception:
            pass

        return result

    def _run_stage_entry_query(
        self,
        start: date,
        end: date,
        extra_filters: Optional[List] = None,
    ) -> Dict[Any, float]:
        """
        Conta negócios distintos que ENTRARAM em cada etapa do pipeline no período.

        Usa a tabela card_list_history com filtro por entered_at para refletir
        o volume de entrada em cada lista — base para gráficos de funil de conversão.

        O raw_key retornado é list_id, que bate com os labels gerados em
        _get_x_labels_and_order para card_history/stage_name.
        """
        result: Dict[Any, float] = {}

        try:
            extra = list(extra_filters or [])
            base_filter = [
                func.date(CardListHistory.entered_at) >= start,
                func.date(CardListHistory.entered_at) <= end,
            ] + extra

            rows = (
                self.db.query(
                    CardListHistory.list_id.label('x_key'),
                    func.count(func.distinct(CardListHistory.card_id)).label('y_val'),
                )
                .filter(*base_filter)
                .group_by(CardListHistory.list_id)
                .all()
            )

            for row in rows:
                result[row.x_key] = float(row.y_val or 0)

        except Exception:
            pass

        return result

    # ========================
    # CAMPOS CALCULADOS — DAX-like
    # ========================

    def _resolve_calculated_field(
        self,
        calc_field: CalculatedFieldSchema,
        label_raw_pairs: List[Tuple[str, Any]],
        metric_cache: Dict[str, List[float]],
        request: 'QueryRequest',
        start: date,
        end: date,
    ) -> List[float]:
        """
        Avalia um campo calculado para cada label do eixo X.

        Algoritmo:
          1. Extrai as dependências da fórmula ([field_key] → {field_key}).
          2. Para cada dependência ausente no cache, executa a query de métrica
             silenciosamente e armazena no cache.
          3. Para cada label, monta o contexto e avalia a fórmula.
          4. Divisão por zero → 0.0 (padrão do sistema).

        O cache usa a chave "source:field_key:aggregation" para evitar
        queries duplicadas quando dois campos calculados compartilham dependências.
        """
        evaluator = FormulaEvaluator()
        dependencies = evaluator.extract_dependencies(calc_field.formula)

        # Garante que todas as dependências estão no cache
        for dep_key in dependencies:
            # Chave de cache padrão: source:key:count (contagem é a agregação padrão para deps)
            cache_key = f"{calc_field.source}:{dep_key}:count"

            if cache_key not in metric_cache:
                # Busca a métrica silenciosamente usando count como agregação padrão
                # (usuário deve usar métricas já definidas; count é safe para qualquer campo)
                values = self._get_y_values_for_labels(
                    x_field_source=request.x_field.source,
                    x_field_key=request.x_field.key,
                    x_group_by=request.x_group_by,
                    y_source=calc_field.source,
                    y_key=dep_key,
                    y_aggregation='count',
                    label_raw_pairs=label_raw_pairs,
                    start=start,
                    end=end,
                )
                metric_cache[cache_key] = values

        # Avalia a fórmula para cada label usando os valores do cache
        results: List[float] = []
        for label_idx in range(len(label_raw_pairs)):
            # Monta contexto com os valores de cada dependência para este label
            field_values: Dict[str, float] = {}
            for dep_key in dependencies:
                cache_key = f"{calc_field.source}:{dep_key}:count"
                cached = metric_cache.get(cache_key, [])
                field_values[dep_key] = cached[label_idx] if label_idx < len(cached) else 0.0

            context = evaluator.build_value_context(field_values)
            result = evaluator.evaluate(calc_field.formula, context)

            # Divisão por zero (None) vira 0.0 — padrão do sistema
            results.append(float(result) if result is not None else 0.0)

        return results

    # ========================
    # QUERY ENGINE — PÚBLICO
    # ========================

    def execute_query(self, request: 'QueryRequest') -> QueryResponse:
        """
        Executa a query de um gráfico e retorna os dados para renderização.

        Fluxo:
          1. Calcula o intervalo de datas.
          2. Busca os grupos X (labels + raw keys).
          3. Para cada campo Y normal, calcula os valores agregados alinhados aos labels.
          4. Para cada campo Y calculado, avalia a fórmula usando o cache de métricas.
          5. Retorna QueryResponse no formato single-série ou multi-série.
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
        # (campos calculados não são suportados em modo split_by — usamos apenas y_fields normais)
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

        # Passo 2b: calcula valores para cada y_field normal (modo sem split_by)
        # Cache de métricas: chave "source:field_key:aggregation" → List[float]
        # Reutilizado pelo _resolve_calculated_field para evitar queries redundantes.
        metric_cache: Dict[str, List[float]] = {}

        y_normal_results: List[Tuple[str, List[float]]] = []  # (nome_série, valores)
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
            # Alimenta o cache para que campos calculados possam reutilizar
            cache_key = f"{yf.field.source}:{yf.field.key}:{yf.aggregation}"
            metric_cache[cache_key] = values

            source_label = _SOURCE_LABELS.get(yf.field.source, yf.field.source)
            y_normal_results.append((yf.field.label, source_label, values))

        # Passo 2c: resolve campos Y calculados (fórmulas DAX-like)
        y_calc_results: List[Tuple[str, List[float]]] = []  # (label_série, valores)
        if request.calculated_y_fields and request.calculated_fields:
            # Indexa os campos calculados disponíveis pelo id para acesso O(1)
            calc_field_map: Dict[str, CalculatedFieldSchema] = {
                cf.id: cf for cf in request.calculated_fields
            }

            for calc_yf in request.calculated_y_fields:
                calc_field = calc_field_map.get(calc_yf.calculated_field_id)
                if calc_field is None:
                    # Campo calculado não encontrado — retorna zeros
                    y_calc_results.append((calc_yf.label, [0.0] * len(labels)))
                    continue

                resolved = self._resolve_calculated_field(
                    calc_field=calc_field,
                    label_raw_pairs=label_raw_pairs,
                    metric_cache=metric_cache,
                    request=request,
                    start=start,
                    end=end,
                )
                y_calc_results.append((calc_yf.label, resolved))

        # Passo 3: monta a resposta combinando campos normais e calculados
        total_series_count = len(y_normal_results) + len(y_calc_results)

        if total_series_count == 0:
            return QueryResponse(labels=labels, values=[0.0] * len(labels), total=0.0)

        if total_series_count == 1:
            # Single-série — pode ser normal ou calculado
            if y_normal_results:
                values_flat = y_normal_results[0][2]
            else:
                values_flat = y_calc_results[0][1]
            total = sum(values_flat)
            return QueryResponse(labels=labels, values=values_flat, total=total)

        # Multi-série — detecta labels duplicados para nomes únicos entre os campos normais
        normal_labels = [r[0] for r in y_normal_results]
        has_duplicates = len(normal_labels) != len(set(normal_labels))

        series = []
        for field_label, source_label, values in y_normal_results:
            name = (
                f"{field_label} ({source_label})"
                if has_duplicates
                else field_label
            )
            series.append(SeriesDataSchema(name=name, values=values))

        for serie_label, values in y_calc_results:
            series.append(SeriesDataSchema(name=serie_label, values=values))

        return QueryResponse(labels=labels, series=series)

    # ========================
    # DRILL-DOWN — detalhamento de barra
    # ========================

    def _get_y_card_filter(self, y_source: Optional[str], y_key: Optional[str]):
        """
        Retorna o filtro adicional (ou lista de filtros) para a query de Cards
        baseado na métrica Y do gráfico.

        Cada métrica especial do sistema implica uma condição adicional que
        precisa ser replicada no drill-down para que os cards exibidos sejam
        exatamente os que contribuíram para o valor da barra.

        Retorna None quando a métrica não exige filtro extra (ex: count, value).
        """
        if not y_source or not y_key:
            return None

        if y_source == 'cards':
            if y_key == 'won_count':
                # Conta apenas cards ganhos
                return Card.is_won == 1

            if y_key == 'proposal_count':
                # Conta cards que têm ao menos 1 proposta enviada (attachment do tipo 'proposal')
                subq = (
                    self.db.query(Attachment.card_id)
                    .filter(
                        Attachment.attachment_type == 'proposal',
                        Attachment.is_deleted == False,
                    )
                )
                return Card.id.in_(subq)

            if y_key == 'valid_count':
                # Conta cards que passaram pela lista de Prospecção
                subq = (
                    self.db.query(CardListHistory.card_id)
                    .filter(CardListHistory.list_id == _PROSPECCAO_LIST_ID)
                )
                return Card.id.in_(subq)

        # count, value, shipping_cost, distinct_count e métricas de tasks/activities
        # não exigem filtro adicional na query de cards
        return None

    def _get_split_raw_value(self, split_by, split_label: str):
        """
        Busca o raw_value (id/valor interno) correspondente ao label do split_by clicado.
        Retorna None se não encontrar.
        """
        if not split_by or not split_label:
            return None
        split_values = self._get_split_values(split_by.source, split_by.key)
        for label, raw in split_values:
            if label == split_label:
                return raw
        return None

    def _build_card_id_subquery_from_tasks(
        self,
        x_key: str,
        x_group_by: Optional[str],
        x_raw_value: Any,
        start: date,
        end: date,
        split_source: Optional[str],
        split_key: Optional[str],
        split_raw_value: Any,
        y_key: Optional[str] = None,
    ):
        """
        Constrói uma subquery que retorna card_ids cujos CardTask satisfazem
        os filtros de eixo X e split_by.

        Usada quando x_field.source == 'tasks' para evitar cross join implícito.
        """
        date_col_map = {
            'created_at':   CardTask.created_at,
            'due_date':     CardTask.due_date,
            'completed_at': CardTask.completed_at,
        }
        x_date_col = date_col_map.get(x_key, CardTask.created_at)

        q = self.db.query(CardTask.card_id)

        if x_group_by:
            # Eixo X de data: filtra pelo bucket (ex: semana, mês)
            q = q.filter(func.date_trunc(x_group_by, x_date_col) == x_raw_value)
        else:
            # Eixo X categórico: filtra pelo valor + período via created_at
            cat_col = self._get_x_category_col('tasks', x_key)
            if cat_col is not None:
                q = q.filter(cat_col == x_raw_value)
            q = q.filter(
                func.date(CardTask.created_at) >= start,
                func.date(CardTask.created_at) <= end,
            )

        # Filtro do split_by (se também for de tasks)
        if split_source == 'tasks' and split_key and split_raw_value is not None:
            split_filter = self._build_split_filter('tasks', split_key, split_raw_value)
            if split_filter is not None:
                q = q.filter(split_filter)

        # Filtro da métrica Y: restringe o conjunto de tarefas conforme o tipo de métrica
        if y_key == 'meeting_count':
            q = q.filter(CardTask.task_type == TaskType.MEETING)
        elif y_key == 'call_count':
            q = q.filter(CardTask.task_type == TaskType.CALL)
        elif y_key == 'completed_call_count':
            q = q.filter(CardTask.task_type == TaskType.CALL, CardTask.is_completed == True)  # noqa: E712
        elif y_key == 'noshow_count':
            q = q.filter(CardTask.task_type == TaskType.MEETING, CardTask.is_noshow == True)  # noqa: E712

        return q

    def _build_card_id_subquery_from_activities(
        self,
        x_key: str,
        x_group_by: Optional[str],
        x_raw_value: Any,
        start: date,
        end: date,
        split_source: Optional[str],
        split_key: Optional[str],
        split_raw_value: Any,
    ):
        """
        Constrói uma subquery que retorna card_ids cujas Activity satisfazem
        os filtros de eixo X e split_by.

        Usada quando x_field.source == 'activities' para evitar cross join implícito.
        """
        q = self.db.query(Activity.card_id)

        if x_group_by:
            q = q.filter(func.date_trunc(x_group_by, Activity.created_at) == x_raw_value)
        else:
            cat_col = self._get_x_category_col('activities', x_key)
            if cat_col is not None:
                q = q.filter(cat_col == x_raw_value)
            q = q.filter(
                func.date(Activity.created_at) >= start,
                func.date(Activity.created_at) <= end,
            )

        # Filtro do split_by (se também for de activities)
        if split_source == 'activities' and split_key and split_raw_value is not None:
            split_filter = self._build_split_filter('activities', split_key, split_raw_value)
            if split_filter is not None:
                q = q.filter(split_filter)

        return q

    def execute_drill_down(self, request: DrillDownRequest) -> DrillDownResponse:
        """
        Retorna os cards que compõem uma barra/fatia específica do gráfico.

        Fluxo:
          1. Recalcula o intervalo de datas.
          2. Reutiliza _get_x_labels_and_order() para encontrar o raw_value do label clicado.
          3. Constrói os filtros para a query de Cards:
             - x_field.source == 'cards'    → filtros diretos na tabela cards
             - x_field.source == 'tasks'    → subquery CardTask → card_ids
             - x_field.source == 'activities' → subquery Activity → card_ids
          4. Aplica filtro do split_by se a fonte for 'cards'; caso contrário já
             foi incorporado na subquery (split_by da mesma fonte do x_field).
          5. Executa a query de cards com JOINs para obter nomes legíveis.
          6. Retorna lista de DrillDownCard limitada a 200 registros.
        """
        from app.models.board import Board

        start, end = self._get_date_range(request.period, request.start_date, request.end_date)
        x_source = request.x_field.source

        # Passo 1: encontra o raw_value correspondente ao label clicado no eixo X
        label_raw_pairs = self._get_x_labels_and_order(
            x_source, request.x_field.key, request.x_group_by, start, end,
        )
        x_raw_value = None
        for label, raw in label_raw_pairs:
            if label == request.x_label:
                x_raw_value = raw
                break

        if x_raw_value is None:
            return DrillDownResponse(cards=[], total=0)

        # Passo 2: resolve o raw_value do split_by (se houver)
        split_source = request.split_by.source if request.split_by else None
        split_key = request.split_by.key if request.split_by else None
        split_raw_value = self._get_split_raw_value(request.split_by, request.split_label)

        # Passo 3: constrói os filtros para a query principal de Cards
        card_filters = [Card.is_deleted == False]

        # Filtro da métrica Y: replica o filtro implícito da agregação do gráfico.
        # Exemplo: won_count só conta cards com is_won=1, então o drill-down deve
        # exibir apenas esses cards — caso contrário mostra cards que não contribuíram.
        y_card_filter = self._get_y_card_filter(request.y_source, request.y_key)
        if y_card_filter is not None:
            card_filters.append(y_card_filter)

        if x_source == 'cards':
            # --- Fonte cards: filtros diretos ---
            if request.x_group_by:
                date_col = self._get_x_date_col('cards', request.x_field.key)
                if date_col is not None:
                    card_filters.append(
                        func.date_trunc(request.x_group_by, date_col) == x_raw_value
                    )
            elif request.x_field.key == 'list_name':
                card_filters.append(Card.list_id == x_raw_value)
            elif request.x_field.key == 'assigned_to':
                card_filters.append(Card.assigned_to_id == x_raw_value)
            elif request.x_field.key == 'sdr':
                card_filters.append(Card.sdr_id == x_raw_value)
            else:
                col = self._get_x_category_col('cards', request.x_field.key)
                if col is not None:
                    card_filters.append(col == x_raw_value)

            # Para campos categóricos, aplica filtro de período via created_at
            if not request.x_group_by:
                card_filters += [
                    func.date(Card.created_at) >= start,
                    func.date(Card.created_at) <= end,
                ]

            # Filtro do split_by (somente quando a fonte também é cards)
            if split_source == 'cards' and split_key and split_raw_value is not None:
                split_filter = self._build_split_filter('cards', split_key, split_raw_value)
                if split_filter is not None:
                    card_filters.append(split_filter)

        elif x_source == 'tasks':
            # --- Fonte tasks: subquery card_ids evita cross join ---
            card_id_subq = self._build_card_id_subquery_from_tasks(
                request.x_field.key, request.x_group_by, x_raw_value,
                start, end, split_source, split_key, split_raw_value,
                y_key=request.y_key,
            )
            card_filters.append(Card.id.in_(card_id_subq))

            # Se o split_by for de cards, aplica filtro direto (ex: Vendedor do card)
            if split_source == 'cards' and split_key and split_raw_value is not None:
                split_filter = self._build_split_filter('cards', split_key, split_raw_value)
                if split_filter is not None:
                    card_filters.append(split_filter)

        elif x_source == 'activities':
            # --- Fonte activities: subquery card_ids evita cross join ---
            card_id_subq = self._build_card_id_subquery_from_activities(
                request.x_field.key, request.x_group_by, x_raw_value,
                start, end, split_source, split_key, split_raw_value,
            )
            card_filters.append(Card.id.in_(card_id_subq))

            if split_source == 'cards' and split_key and split_raw_value is not None:
                split_filter = self._build_split_filter('cards', split_key, split_raw_value)
                if split_filter is not None:
                    card_filters.append(split_filter)

        else:
            # Fontes não suportadas diretamente no drill-down (clients, persons)
            return DrillDownResponse(cards=[], total=0)

        # Passo 4: busca os cards com JOINs para nomes legíveis
        try:
            rows = (
                self.db.query(
                    Card.id,
                    Card.title,
                    Card.value,
                    Card.is_won,
                    Card.created_at,
                    BoardList.name.label('list_name'),
                    Board.name.label('board_name'),
                    User.name.label('assigned_to_name'),
                )
                .join(BoardList, Card.list_id == BoardList.id)
                .join(Board, BoardList.board_id == Board.id)
                .outerjoin(User, Card.assigned_to_id == User.id)
                .filter(*card_filters)
                .distinct()
                .order_by(Card.created_at.desc())
                .limit(200)
                .all()
            )
        except Exception:
            return DrillDownResponse(cards=[], total=0)

        _STATUS_MAP = {0: 'Aberto', 1: 'Ganho', -1: 'Perdido'}

        cards = [
            DrillDownCard(
                id=row.id,
                title=row.title,
                list_name=row.list_name or 'Sem etapa',
                board_name=row.board_name or 'Sem quadro',
                assigned_to_name=row.assigned_to_name,
                value=float(row.value) if row.value is not None else None,
                created_at=row.created_at,
                status=_STATUS_MAP.get(int(row.is_won or 0), 'Aberto'),
            )
            for row in rows
        ]

        return DrillDownResponse(cards=cards, total=len(cards))
