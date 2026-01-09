"""
Endpoints de Automações.
Rotas para gerenciar automações trigger e scheduled.
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, Path, Body
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.automation_service import AutomationService
from app.schemas.automation import (
    AutomationCreate,
    AutomationUpdate,
    AutomationResponse,
    AutomationListResponse,
    AutomationExecutionResponse,
    AutomationExecutionListResponse,
    AutomationTriggerRequest
)
from app.models.user import User

router = APIRouter()


# ========== CRUD DE AUTOMAÇÕES ==========

@router.get("", response_model=AutomationListResponse, summary="Listar automações")
async def list_automations(
    board_id: int = Query(..., description="ID do board"),
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    automation_type: Optional[str] = Query(None, description="Filtrar por tipo (trigger, scheduled)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista automações de um board.

    - **board_id**: ID do board (obrigatório)
    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 100)
    - **is_active**: Filtrar por status ativo (opcional)
    - **automation_type**: Filtrar por tipo - trigger ou scheduled (opcional)
    """
    service = AutomationService(db)
    return service.list_automations(
        board_id=board_id,
        page=page,
        page_size=page_size,
        is_active=is_active,
        automation_type=automation_type
    )


@router.get("/{automation_id}", response_model=AutomationResponse, summary="Buscar automação")
async def get_automation(
    automation_id: int = Path(..., description="ID da automação"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca uma automação por ID.

    - **automation_id**: ID da automação
    """
    service = AutomationService(db)
    return service.get_automation(automation_id)


@router.post("", response_model=AutomationResponse, summary="Criar automação", status_code=201)
async def create_automation(
    automation_data: AutomationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria uma nova automação.

    **Automação Trigger:**
    - **automation_type**: "trigger"
    - **trigger_event**: Evento que dispara (card_created, card_moved, card_won, etc.)
    - **trigger_conditions**: Condições opcionais (JSON)
    - **actions**: Ações a executar (array de objetos)

    **Automação Scheduled:**
    - **automation_type**: "scheduled"
    - **schedule_type**: "once" (execução única) ou "recurrent" (recorrente)
    - **scheduled_at**: Data/hora de execução (para once)
    - **recurrence_pattern**: "daily", "weekly", "monthly", "annual" (para recurrent)
    - **actions**: Ações a executar (array de objetos)

    **Ações disponíveis:**
    - move_card: {"type": "move_card", "params": {"target_list_id": 3}}
    - assign_card: {"type": "assign_card", "params": {"user_id": 10}}
    - mark_won: {"type": "mark_won", "params": {}}
    - mark_lost: {"type": "mark_lost", "params": {}}
    - send_notification: {"type": "send_notification", "params": {"user_id": 10, "message": "..."}}
    - award_points: {"type": "award_points", "params": {"user_id": 10, "points": 10}}
    """
    service = AutomationService(db)
    return service.create_automation(automation_data, current_user)


@router.put("/{automation_id}", response_model=AutomationResponse, summary="Atualizar automação")
async def update_automation(
    automation_id: int = Path(..., description="ID da automação"),
    automation_data: AutomationUpdate = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza uma automação.

    - **automation_id**: ID da automação
    - Todos os campos são opcionais
    """
    service = AutomationService(db)
    return service.update_automation(automation_id, automation_data, current_user)


@router.delete("/{automation_id}", summary="Deletar automação")
async def delete_automation(
    automation_id: int = Path(..., description="ID da automação"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta uma automação.

    - **automation_id**: ID da automação
    """
    service = AutomationService(db)
    service.delete_automation(automation_id, current_user)
    return {"message": "Automação deletada com sucesso"}


# ========== EXECUÇÃO ==========

@router.post("/{automation_id}/trigger", response_model=AutomationExecutionResponse, summary="Executar automação manualmente", status_code=201)
async def trigger_automation(
    automation_id: int = Path(..., description="ID da automação"),
    trigger_data: AutomationTriggerRequest = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Executa uma automação manualmente.

    - **automation_id**: ID da automação
    - **card_id**: ID do card (opcional)
    - **execution_data**: Dados adicionais (opcional)

    Útil para testar automações ou executar sob demanda.
    """
    service = AutomationService(db)

    # Verifica acesso à automação
    automation = service.get_automation(automation_id)

    return service.execute_automation(
        automation_id=automation_id,
        card_id=trigger_data.card_id,
        triggered_by_id=current_user.id,
        execution_data=trigger_data.execution_data
    )


# ========== HISTÓRICO DE EXECUÇÕES ==========

@router.get("/{automation_id}/executions", response_model=AutomationExecutionListResponse, summary="Listar execuções")
async def list_executions(
    automation_id: int = Path(..., description="ID da automação"),
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    status: Optional[str] = Query(None, description="Filtrar por status (success, failed, pending)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista histórico de execuções de uma automação.

    - **automation_id**: ID da automação
    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 100)
    - **status**: Filtrar por status - success, failed, pending (opcional)
    """
    service = AutomationService(db)
    return service.list_executions(
        automation_id=automation_id,
        page=page,
        page_size=page_size,
        status=status
    )
