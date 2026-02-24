"""
Endpoints de Relatórios Customizados.
Cobre catálogo de campos, query engine e CRUD de relatórios salvos.

Todos os endpoints requerem autenticação e role admin ou manager.
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.services.custom_report_service import CustomReportService
from app.schemas.custom_report import (
    QueryRequest,
    QueryResponse,
    CustomReportCreate,
    CustomReportResponse,
    FieldCatalogResponse,
)

router = APIRouter()


def _require_manager_or_admin(current_user: User) -> None:
    """
    Garante que o usuário tem role de admin ou manager.
    Lança 403 Forbidden caso contrário.
    """
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ("admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores e gerentes podem acessar os relatórios customizados",
        )


# ========================
# CATÁLOGO DE CAMPOS
# ========================

@router.get(
    "/fields",
    response_model=FieldCatalogResponse,
    summary="Catálogo de campos disponíveis",
    responses={
        200: {
            "description": "Catálogo retornado com sucesso",
        }
    },
)
async def get_report_fields(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retorna o catálogo de campos disponíveis por fonte de dados.

    **Fontes:** cards, clients, persons, activities.
    Cada campo inclui: key, label, field_type, groupable, aggregatable.
    """
    _require_manager_or_admin(current_user)
    service = CustomReportService(db)
    return service.get_field_catalog()


# ========================
# QUERY ENGINE
# ========================

@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Executa query de um gráfico",
    responses={
        200: {
            "description": "Dados do gráfico gerados com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "labels": ["Inbound", "Outbound", "Indicação"],
                        "values": [35.0, 28.0, 22.0],
                        "total": 85.0,
                    }
                }
            },
        }
    },
)
async def query_chart(
    request: QueryRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Executa a query de um gráfico customizado e retorna os dados para renderização.

    **Single-série** (1 campo Y): retorna `labels`, `values`, `total`.
    **Multi-série** (2–4 campos Y): retorna `labels`, `series[]`.

    O campo X define a dimensão de agrupamento (categorias ou datas).
    O campo Y define a métrica e a função de agregação (count, sum, avg, distinct_count).
    """
    _require_manager_or_admin(current_user)
    service = CustomReportService(db)
    return service.execute_query(request)


# ========================
# CRUD DE RELATÓRIOS
# ========================

@router.get(
    "/custom",
    response_model=List[CustomReportResponse],
    summary="Lista relatórios customizados",
    responses={
        200: {"description": "Lista retornada com sucesso"},
    },
)
async def list_custom_reports(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Lista todos os relatórios customizados da empresa, ordenados pelo mais recente.
    """
    _require_manager_or_admin(current_user)
    service = CustomReportService(db)
    return service.list_reports()


@router.post(
    "/custom",
    response_model=CustomReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cria um novo relatório customizado",
)
async def create_custom_report(
    data: CustomReportCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Cria um novo relatório customizado e persiste no banco.

    O campo `config` deve conter o objeto `CustomReportConfig` serializado do frontend.
    """
    _require_manager_or_admin(current_user)
    service = CustomReportService(db)
    return service.create_report(data, user_id=current_user.id)


@router.get(
    "/custom/{report_id}",
    response_model=CustomReportResponse,
    summary="Busca relatório por ID",
    responses={
        404: {"description": "Relatório não encontrado"},
    },
)
async def get_custom_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Busca um relatório customizado pelo ID."""
    _require_manager_or_admin(current_user)
    service = CustomReportService(db)
    return service.get_report(report_id)


@router.put(
    "/custom/{report_id}",
    response_model=CustomReportResponse,
    summary="Atualiza um relatório customizado",
    responses={
        404: {"description": "Relatório não encontrado"},
    },
)
async def update_custom_report(
    report_id: int,
    data: CustomReportCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Atualiza nome e configuração de um relatório customizado."""
    _require_manager_or_admin(current_user)
    service = CustomReportService(db)
    return service.update_report(report_id, data)


@router.delete(
    "/custom/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Exclui um relatório customizado",
    responses={
        204: {"description": "Relatório excluído com sucesso"},
        404: {"description": "Relatório não encontrado"},
    },
)
async def delete_custom_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    """Remove definitivamente um relatório customizado."""
    _require_manager_or_admin(current_user)
    service = CustomReportService(db)
    service.delete_report(report_id)
