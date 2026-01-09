"""
Endpoints de Relatórios.
Rotas para dashboards, KPIs e relatórios de vendas/conversão/transferências.
"""
from typing import Any
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


@router.get("/dashboard", response_model=DashboardKPIsResponse, summary="Dashboard com KPIs principais")
async def get_dashboard_kpis(
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
    """
    service = ReportService(db)
    return service.get_dashboard_kpis()


@router.post("/sales", response_model=SalesReportResponse, summary="Relatório de vendas")
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


@router.post("/conversion", response_model=ConversionReportResponse, summary="Relatório de conversão (funil)")
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


@router.post("/transfers", response_model=TransferReportResponse, summary="Relatório de transferências")
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


@router.post("/export", response_model=ExportReportResponse, summary="Exportar relatório")
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
