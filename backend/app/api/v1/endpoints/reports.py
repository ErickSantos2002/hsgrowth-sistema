"""
Endpoints de Relatórios.
Rotas para dashboards, KPIs e relatórios de vendas/conversão/transferências.
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.report_service import ReportService
from app.schemas.report import (
    DashboardKPIsResponse,
    SalesReportRequest,
    SalesReportResponse,
    ConversionReportRequest,
    ConversionReportResponse,
    TransferReportRequest,
    TransferReportResponse,
    ExportReportRequest,
    ExportReportResponse
)
from app.models.user import User

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=DashboardKPIsResponse,
    summary="Dashboard com KPIs principais",
    responses={
        200: {
            "description": "KPIs do dashboard retornados com sucesso",
            "content": {
                "application/json": {
                    "example": {
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
                            {"name": "Maria Santos", "cards_won": 22, "total_value": 98000.00},
                            {"name": "Carlos Oliveira", "cards_won": 18, "total_value": 87500.00},
                            {"name": "Ana Ferreira", "cards_won": 14, "total_value": 72000.00},
                            {"name": "Pedro Costa", "cards_won": 10, "total_value": 67500.00}
                        ],
                        "cards_by_stage": [
                            {"stage_name": "Prospecção", "card_count": 120, "total_value": 180000.00},
                            {"stage_name": "Qualificação", "card_count": 85, "total_value": 210000.00},
                            {"stage_name": "Proposta", "card_count": 45, "total_value": 175000.00},
                            {"stage_name": "Negociação", "card_count": 22, "total_value": 115000.00}
                        ],
                        "sales_evolution": [
                            {"period": "2026-01-06", "won_count": 5, "won_value": 32000.00, "lost_count": 2},
                            {"period": "2026-01-13", "won_count": 7, "won_value": 48000.00, "lost_count": 3},
                            {"period": "2026-01-20", "won_count": 4, "won_value": 25000.00, "lost_count": 1}
                        ]
                    }
                }
            }
        }
    }
)
async def get_dashboard_kpis(
    period: Optional[str] = Query("month", description="Período principal: today, week, month, quarter, year, custom"),
    start_date: Optional[str] = Query(None, description="Data inicial (YYYY-MM-DD) — obrigatório quando period=custom"),
    end_date: Optional[str] = Query(None, description="Data final (YYYY-MM-DD) — obrigatório quando period=custom"),
    user_id: Optional[int] = Query(None, description="[Admin/Gerente] Filtrar por usuário específico"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Retorna os KPIs principais para o dashboard.

    **Métricas incluídas:**
    - Total de cards (total, hoje, semana, mês)
    - Cards ganhos/perdidos (hoje, semana, mês)
    - Cards vencidos (atrasados, vencendo hoje, vencendo esta semana)
    - Valores monetários (total, ganho este mês, pipeline)
    - Taxa de conversão do mês
    - Tempo médio para ganhar (dias)
    - Top 5 vendedores do mês

    **Filtro por usuário:**
    - Vendedores e SDRs veem apenas seus próprios dados automaticamente.
    - Admin e Gerentes veem todos os dados; podem passar `user_id` para filtrar por usuário específico.
    """
    service = ReportService(db)
    return service.get_dashboard_kpis(
        current_user=current_user,
        user_id=user_id,
        period_key=period or "month",
        custom_start=start_date,
        custom_end=end_date,
    )


@router.post(
    "/sales",
    response_model=SalesReportResponse,
    summary="Relatório de vendas",
    responses={
        200: {
            "description": "Relatório de vendas gerado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "period": "this_month",
                        "start_date": "2026-02-01",
                        "end_date": "2026-02-28",
                        "total_new_cards": 342,
                        "total_won_cards": 89,
                        "total_lost_cards": 34,
                        "total_won_value": 450000.00,
                        "overall_conversion_rate": 26.02,
                        "items": [
                            {
                                "label": "João Silva",
                                "new_cards": 78,
                                "won_cards": 25,
                                "lost_cards": 8,
                                "won_value": 125000.00,
                                "conversion_rate": 32.05
                            },
                            {
                                "label": "Maria Santos",
                                "new_cards": 65,
                                "won_cards": 22,
                                "lost_cards": 7,
                                "won_value": 98000.00,
                                "conversion_rate": 33.85
                            },
                            {
                                "label": "Carlos Oliveira",
                                "new_cards": 55,
                                "won_cards": 18,
                                "lost_cards": 6,
                                "won_value": 87500.00,
                                "conversion_rate": 32.73
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def get_sales_report(
    request: SalesReportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Gera relatório de vendas por período.

    **Parâmetros:**
    - **board_id** (opcional): Filtrar por board específico
    - **period**: Período do relatório (today, this_week, this_month, etc)
    - **start_date/end_date** (opcional): Datas customizadas (quando period=custom)
    - **user_id** (opcional): Filtrar por vendedor específico

    **Retorna:**
    - Total de cards criados, ganhos e perdidos
    - Valor total ganho
    - Taxa de conversão geral
    - Breakdown por vendedor com conversão individual
    """
    service = ReportService(db)
    return service.get_sales_report(request=request)


@router.post(
    "/conversion",
    response_model=ConversionReportResponse,
    summary="Relatório de conversão (funil)",
    responses={
        200: {
            "description": "Relatório de conversão gerado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "board_name": "Vendas B2B",
                        "period": "this_month",
                        "start_date": "2026-02-01",
                        "end_date": "2026-02-28",
                        "total_cards": 272,
                        "total_value": 680000.00,
                        "overall_conversion_rate": 26.02,
                        "stages": [
                            {
                                "list_name": "Prospecção",
                                "list_id": 1,
                                "cards_count": 120,
                                "total_value": 180000.00,
                                "conversion_rate": 70.83,
                                "avg_time_in_stage_days": 3.2
                            },
                            {
                                "list_name": "Qualificação",
                                "list_id": 2,
                                "cards_count": 85,
                                "total_value": 210000.00,
                                "conversion_rate": 52.94,
                                "avg_time_in_stage_days": 5.8
                            },
                            {
                                "list_name": "Proposta",
                                "list_id": 3,
                                "cards_count": 45,
                                "total_value": 175000.00,
                                "conversion_rate": 48.89,
                                "avg_time_in_stage_days": 7.1
                            },
                            {
                                "list_name": "Negociação",
                                "list_id": 4,
                                "cards_count": 22,
                                "total_value": 115000.00,
                                "conversion_rate": 72.73,
                                "avg_time_in_stage_days": 4.5
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def get_conversion_report(
    request: ConversionReportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Gera relatório de conversão (funil de vendas).

    **Parâmetros:**
    - **board_id**: ID do board
    - **period**: Período do relatório
    - **start_date/end_date** (opcional): Datas customizadas

    **Retorna:**
    - Análise de cada etapa do funil (lista)
    - Quantidade de cards por etapa
    - Valor total por etapa
    - Taxa de conversão entre etapas
    - Tempo médio em cada etapa (dias)
    """
    service = ReportService(db)
    return service.get_conversion_report(request=request)


@router.post(
    "/transfers",
    response_model=TransferReportResponse,
    summary="Relatório de transferências",
    responses={
        200: {
            "description": "Relatório de transferências gerado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "period": "this_month",
                        "start_date": "2026-02-01",
                        "end_date": "2026-02-28",
                        "total_transfers": 47,
                        "total_cards_won": 18,
                        "total_won_value": 135000.00,
                        "items": [
                            {
                                "from_user_name": "João Silva",
                                "to_user_name": "Maria Santos",
                                "transfers_count": 12,
                                "cards_won_count": 5,
                                "total_won_value": 42000.00,
                                "avg_days_to_win": 8.3
                            },
                            {
                                "from_user_name": "Carlos Oliveira",
                                "to_user_name": "Ana Ferreira",
                                "transfers_count": 8,
                                "cards_won_count": 4,
                                "total_won_value": 35000.00,
                                "avg_days_to_win": 6.7
                            },
                            {
                                "from_user_name": "Pedro Costa",
                                "to_user_name": "João Silva",
                                "transfers_count": 6,
                                "cards_won_count": 3,
                                "total_won_value": 28500.00,
                                "avg_days_to_win": 10.2
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def get_transfer_report(
    request: TransferReportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Gera relatório de transferências de cards.

    **Parâmetros:**
    - **period**: Período do relatório
    - **start_date/end_date** (opcional): Datas customizadas
    - **from_user_id** (opcional): Filtrar por remetente
    - **to_user_id** (opcional): Filtrar por destinatário

    **Retorna:**
    - Total de transferências
    - Cards ganhos após transferência
    - Valor total ganho
    - Breakdown por vendedor (remetente → destinatário)
    - Média de dias para ganhar após transferência
    """
    service = ReportService(db)
    return service.get_transfer_report(request=request)


@router.post(
    "/export",
    response_model=ExportReportResponse,
    summary="Exportar relatório",
    responses={
        200: {
            "description": "Relatório exportado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "file_url": "https://api.hsgrowth.com/exports/sales_report_2026_02.xlsx",
                        "file_name": "sales_report_2026_02.xlsx",
                        "format": "excel",
                        "expires_at": "2026-02-07T15:30:00"
                    }
                }
            }
        }
    }
)
async def export_report(
    request: ExportReportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Exporta um relatório em CSV, Excel ou JSON.

    **Parâmetros:**
    - **report_type**: Tipo do relatório (sales, conversion, transfers)
    - **format**: Formato de exportação (csv, excel, json)
    - **period**: Período
    - **start_date/end_date** (opcional): Datas customizadas
    - Outros filtros conforme o tipo de relatório

    **Retorna:**
    - URL do arquivo exportado (válida por 24h)
    - Nome do arquivo
    - Formato
    - Data de expiração do link

    **Nota:** Esta funcionalidade será implementada na Fase 16 (Scripts Utilitários).
    Por enquanto, retorna um placeholder.
    """
    from datetime import datetime, timedelta

    # TODO: Implementar geração de arquivo real na Fase 16
    # Por enquanto, retorna um mock
    return ExportReportResponse(
        file_url=f"https://api.hsgrowth.com/exports/{request.report_type}_report.{request.format}",
        file_name=f"{request.report_type}_report.{request.format}",
        format=request.format.value,
        expires_at=datetime.now() + timedelta(hours=24)
    )
