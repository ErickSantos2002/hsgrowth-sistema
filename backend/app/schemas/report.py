"""
Schemas Pydantic para Relatórios e KPIs.
Define os modelos de entrada/saída para relatórios e dashboards.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field
from enum import Enum


class PeriodEnum(str, Enum):
    """
    Tipos de período para relatórios.
    """
    TODAY = "today"
    YESTERDAY = "yesterday"
    THIS_WEEK = "this_week"
    LAST_WEEK = "last_week"
    THIS_MONTH = "this_month"
    LAST_MONTH = "last_month"
    THIS_QUARTER = "this_quarter"
    LAST_QUARTER = "last_quarter"
    THIS_YEAR = "this_year"
    LAST_YEAR = "last_year"
    CUSTOM = "custom"


class ExportFormatEnum(str, Enum):
    """
    Formatos de exportação disponíveis.
    """
    CSV = "csv"
    EXCEL = "excel"
    JSON = "json"


# ================== Dashboard KPIs ==================

class DashboardKPIsResponse(BaseModel):
    """
    Resposta do dashboard com KPIs principais.
    """
    # Cards
    total_cards: int = Field(..., description="Total de cards no sistema")
    new_cards_today: int = Field(..., description="Novos cards criados hoje")
    new_cards_this_week: int = Field(..., description="Novos cards esta semana")
    new_cards_this_month: int = Field(..., description="Novos cards este mês")

    # Cards ganhos/perdidos
    won_cards_today: int = Field(..., description="Cards ganhos hoje")
    won_cards_this_week: int = Field(..., description="Cards ganhos esta semana")
    won_cards_this_month: int = Field(..., description="Cards ganhos este mês")
    lost_cards_today: int = Field(..., description="Cards perdidos hoje")
    lost_cards_this_week: int = Field(..., description="Cards perdidos esta semana")
    lost_cards_this_month: int = Field(..., description="Cards perdidos este mês")

    # Cards vencidos
    overdue_cards: int = Field(..., description="Cards vencidos (atrasados)")
    due_today: int = Field(..., description="Cards vencendo hoje")
    due_this_week: int = Field(..., description="Cards vencendo esta semana")

    # Valores monetários
    total_value: Decimal = Field(..., description="Valor total de todos os cards")
    won_value_this_month: Decimal = Field(..., description="Valor ganho este mês")
    pipeline_value: Decimal = Field(..., description="Valor em pipeline (cards ativos)")

    # Taxas
    conversion_rate_this_month: float = Field(..., description="Taxa de conversão este mês (%)")

    # Tempo médio
    avg_time_to_win_days: Optional[float] = Field(None, description="Tempo médio para ganhar (dias)")

    # Por vendedor (top 5)
    top_sellers_this_month: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Top 5 vendedores do mês (nome, cards_won, total_value)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "total_cards": 3200,
                    "new_cards_today": 15,
                    "new_cards_this_week": 87,
                    "new_cards_this_month": 342,
                    "won_cards_today": 3,
                    "won_cards_this_week": 21,
                    "won_cards_this_month": 89,
                    "lost_cards_today": 1,
                    "lost_cards_this_week": 8,
                    "lost_cards_this_month": 34,
                    "overdue_cards": 23,
                    "due_today": 12,
                    "due_this_week": 45,
                    "total_value": 1250000.00,
                    "won_value_this_month": 450000.00,
                    "pipeline_value": 680000.00,
                    "conversion_rate_this_month": 26.02,
                    "avg_time_to_win_days": 18.5,
                    "top_sellers_this_month": [
                        {"name": "João Silva", "cards_won": 25, "total_value": 125000.00},
                        {"name": "Maria Santos", "cards_won": 22, "total_value": 98000.00}
                    ]
                }
            ]
        }
    }


# ================== Relatório de Vendas ==================

class SalesReportRequest(BaseModel):
    """
    Requisição para relatório de vendas.
    """
    board_id: Optional[int] = Field(None, description="Filtrar por board específico")
    period: PeriodEnum = Field(PeriodEnum.THIS_MONTH, description="Período do relatório")
    start_date: Optional[date] = Field(None, description="Data inicial (para period=custom)")
    end_date: Optional[date] = Field(None, description="Data final (para period=custom)")
    user_id: Optional[int] = Field(None, description="Filtrar por vendedor específico")


class SalesReportItem(BaseModel):
    """
    Item de relatório de vendas (por vendedor ou por dia).
    """
    label: str = Field(..., description="Rótulo (nome do vendedor ou data)")
    new_cards: int = Field(..., description="Cards criados")
    won_cards: int = Field(..., description="Cards ganhos")
    lost_cards: int = Field(..., description="Cards perdidos")
    won_value: Decimal = Field(..., description="Valor ganho")
    conversion_rate: float = Field(..., description="Taxa de conversão (%)")


class SalesReportResponse(BaseModel):
    """
    Resposta do relatório de vendas.
    """
    period: str = Field(..., description="Período do relatório")
    start_date: date = Field(..., description="Data inicial")
    end_date: date = Field(..., description="Data final")
    total_new_cards: int = Field(..., description="Total de cards criados")
    total_won_cards: int = Field(..., description="Total de cards ganhos")
    total_lost_cards: int = Field(..., description="Total de cards perdidos")
    total_won_value: Decimal = Field(..., description="Total de valor ganho")
    overall_conversion_rate: float = Field(..., description="Taxa de conversão geral (%)")
    items: List[SalesReportItem] = Field(..., description="Itens do relatório")


# ================== Relatório de Conversão ==================

class ConversionReportRequest(BaseModel):
    """
    Requisição para relatório de conversão (funil).
    """
    board_id: int = Field(..., description="ID do board")
    period: PeriodEnum = Field(PeriodEnum.THIS_MONTH, description="Período do relatório")
    start_date: Optional[date] = Field(None, description="Data inicial (para period=custom)")
    end_date: Optional[date] = Field(None, description="Data final (para period=custom)")


class ConversionFunnelStage(BaseModel):
    """
    Etapa do funil de conversão.
    """
    list_name: str = Field(..., description="Nome da lista (etapa)")
    list_id: int = Field(..., description="ID da lista")
    cards_count: int = Field(..., description="Quantidade de cards nesta etapa")
    total_value: Decimal = Field(..., description="Valor total dos cards")
    conversion_rate: float = Field(..., description="Taxa de conversão para próxima etapa (%)")
    avg_time_in_stage_days: Optional[float] = Field(None, description="Tempo médio nesta etapa (dias)")


class ConversionReportResponse(BaseModel):
    """
    Resposta do relatório de conversão.
    """
    board_name: str = Field(..., description="Nome do board")
    period: str = Field(..., description="Período")
    start_date: date = Field(..., description="Data inicial")
    end_date: date = Field(..., description="Data final")
    total_cards: int = Field(..., description="Total de cards no funil")
    total_value: Decimal = Field(..., description="Valor total")
    overall_conversion_rate: float = Field(..., description="Taxa de conversão geral (%)")
    stages: List[ConversionFunnelStage] = Field(..., description="Etapas do funil")


# ================== Relatório de Transferências ==================

class TransferReportRequest(BaseModel):
    """
    Requisição para relatório de transferências.
    """
    period: PeriodEnum = Field(PeriodEnum.THIS_MONTH, description="Período do relatório")
    start_date: Optional[date] = Field(None, description="Data inicial (para period=custom)")
    end_date: Optional[date] = Field(None, description="Data final (para period=custom)")
    from_user_id: Optional[int] = Field(None, description="Filtrar por remetente")
    to_user_id: Optional[int] = Field(None, description="Filtrar por destinatário")


class TransferReportItem(BaseModel):
    """
    Item de relatório de transferências.
    """
    from_user_name: str = Field(..., description="Nome do remetente")
    to_user_name: str = Field(..., description="Nome do destinatário")
    transfers_count: int = Field(..., description="Quantidade de transferências")
    cards_won_count: int = Field(..., description="Cards ganhos após transferência")
    total_won_value: Decimal = Field(..., description="Valor total ganho")
    avg_days_to_win: Optional[float] = Field(None, description="Média de dias para ganhar")


class TransferReportResponse(BaseModel):
    """
    Resposta do relatório de transferências.
    """
    period: str = Field(..., description="Período")
    start_date: date = Field(..., description="Data inicial")
    end_date: date = Field(..., description="Data final")
    total_transfers: int = Field(..., description="Total de transferências")
    total_cards_won: int = Field(..., description="Total de cards ganhos")
    total_won_value: Decimal = Field(..., description="Valor total ganho")
    items: List[TransferReportItem] = Field(..., description="Itens do relatório")


# ================== Exportação ==================

class ExportReportRequest(BaseModel):
    """
    Requisição para exportar relatório.
    """
    report_type: str = Field(..., description="Tipo de relatório (sales, conversion, transfers)")
    format: ExportFormatEnum = Field(ExportFormatEnum.EXCEL, description="Formato de exportação")
    board_id: Optional[int] = Field(None, description="ID do board (se aplicável)")
    period: PeriodEnum = Field(PeriodEnum.THIS_MONTH, description="Período")
    start_date: Optional[date] = Field(None, description="Data inicial (para period=custom)")
    end_date: Optional[date] = Field(None, description="Data final (para period=custom)")
    user_id: Optional[int] = Field(None, description="ID do usuário (se aplicável)")


class ExportReportResponse(BaseModel):
    """
    Resposta da exportação de relatório.
    """
    file_url: str = Field(..., description="URL do arquivo exportado")
    file_name: str = Field(..., description="Nome do arquivo")
    format: str = Field(..., description="Formato do arquivo")
    expires_at: datetime = Field(..., description="Data de expiração do link")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "file_url": "https://api.hsgrowth.com/exports/sales_report_2026_01.xlsx",
                    "file_name": "sales_report_2026_01.xlsx",
                    "format": "excel",
                    "expires_at": "2026-01-07T15:30:00"
                }
            ]
        }
    }
