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


# ========== EXEMPLOS DE RESPONSES PARA DOCUMENTAÇÃO SWAGGER ==========

# Exemplo reutilizável de uma automação completa (tipo trigger)
_AUTOMATION_TRIGGER_EXAMPLE = {
    "id": 1,
    "name": "Mover lead ao ganhar negócio",
    "description": "Quando um card é marcado como ganho, move automaticamente para a lista Clientes e premia o vendedor",
    "automation_type": "trigger",
    "is_active": True,
    "priority": 80,
    "board_id": 1,
    "trigger_event": "card_won",
    "trigger_conditions": None,
    "schedule_type": None,
    "scheduled_at": None,
    "recurrence_pattern": None,
    "next_run_at": None,
    "actions": [
        {"type": "move_card", "params": {"target_list_id": 5}},
        {"type": "award_points", "params": {"points": 25}}
    ],
    "state": {},
    "execution_count": 42,
    "last_run_at": "2026-01-28T16:45:00",
    "failure_count": 0,
    "auto_disable_on_failures": 5,
    "created_at": "2026-01-05T10:00:00",
    "updated_at": "2026-01-28T16:45:00"
}

# Exemplo de uma automação do tipo scheduled
_AUTOMATION_SCHEDULED_EXAMPLE = {
    "id": 2,
    "name": "Notificar leads sem contato há 7 dias",
    "description": "Todo dia útil às 9h, verifica leads parados e notifica o responsável",
    "automation_type": "scheduled",
    "is_active": True,
    "priority": 60,
    "board_id": 1,
    "trigger_event": None,
    "trigger_conditions": None,
    "schedule_type": "recurrent",
    "scheduled_at": None,
    "recurrence_pattern": "daily",
    "next_run_at": "2026-02-07T09:00:00",
    "actions": [
        {"type": "send_notification", "params": {"message": "Existem leads sem contato há mais de 7 dias no funil"}}
    ],
    "state": {},
    "execution_count": 18,
    "last_run_at": "2026-02-06T09:00:00",
    "failure_count": 1,
    "auto_disable_on_failures": 5,
    "created_at": "2026-01-15T14:00:00",
    "updated_at": "2026-02-06T09:00:00"
}

# Exemplo de execução de automação (sucesso)
_EXECUTION_SUCCESS_EXAMPLE = {
    "id": 101,
    "automation_id": 1,
    "card_id": 57,
    "triggered_by_id": 3,
    "status": "success",
    "started_at": "2026-01-28T16:45:00",
    "completed_at": "2026-01-28T16:45:01",
    "duration_ms": 234.8,
    "execution_data": {
        "action": "move_card",
        "from_list": "Negociação",
        "to_list": "Clientes",
        "card_title": "Empresa ABC Ltda - Consultoria Digital"
    },
    "error_message": None,
    "error_stack": None,
    "automation_name": "Mover lead ao ganhar negócio",
    "card_title": "Empresa ABC Ltda - Consultoria Digital"
}

# Respostas de erro reutilizáveis
_AUTOMATION_NOT_FOUND_RESPONSE = {
    "description": "Automação não encontrada",
    "content": {
        "application/json": {
            "example": {"detail": "Automação com ID 999 não encontrada"}
        }
    }
}

_VALIDATION_ERROR_RESPONSE = {
    "description": "Erro de validação nos dados enviados",
    "content": {
        "application/json": {
            "example": {
                "detail": [
                    {
                        "loc": ["body", "name"],
                        "msg": "Field required",
                        "type": "missing"
                    }
                ]
            }
        }
    }
}


# ========== CRUD DE AUTOMAÇÕES ==========

@router.get(
    "",
    response_model=AutomationListResponse,
    summary="Listar automações",
    responses={
        200: {
            "description": "Lista paginada de automações do board",
            "content": {
                "application/json": {
                    "example": {
                        "automations": [
                            _AUTOMATION_TRIGGER_EXAMPLE,
                            _AUTOMATION_SCHEDULED_EXAMPLE
                        ],
                        "total": 2,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 1
                    }
                }
            }
        }
    }
)
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


@router.get(
    "/{automation_id}",
    response_model=AutomationResponse,
    summary="Buscar automação",
    responses={
        200: {
            "description": "Automação encontrada com sucesso",
            "content": {
                "application/json": {
                    "example": _AUTOMATION_TRIGGER_EXAMPLE
                }
            }
        },
        404: _AUTOMATION_NOT_FOUND_RESPONSE
    }
)
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


@router.post(
    "",
    response_model=AutomationResponse,
    summary="Criar automação",
    status_code=201,
    responses={
        201: {
            "description": "Automação criada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 3,
                        "name": "Distribuir leads por rodízio",
                        "description": "Ao criar um novo card, atribui automaticamente ao próximo vendedor da equipe",
                        "automation_type": "trigger",
                        "is_active": True,
                        "priority": 90,
                        "board_id": 1,
                        "trigger_event": "card_created",
                        "trigger_conditions": None,
                        "schedule_type": None,
                        "scheduled_at": None,
                        "recurrence_pattern": None,
                        "next_run_at": None,
                        "actions": [
                            {
                                "type": "assign_round_robin",
                                "params": {"user_ids": [3, 5, 8]}
                            },
                            {
                                "type": "send_notification",
                                "params": {"message": "Novo lead atribuído a você!"}
                            }
                        ],
                        "state": {},
                        "execution_count": 0,
                        "last_run_at": None,
                        "failure_count": 0,
                        "auto_disable_on_failures": 5,
                        "created_at": "2026-02-06T10:00:00",
                        "updated_at": "2026-02-06T10:00:00"
                    }
                }
            }
        },
        422: _VALIDATION_ERROR_RESPONSE
    }
)
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


@router.put(
    "/{automation_id}",
    response_model=AutomationResponse,
    summary="Atualizar automação",
    responses={
        200: {
            "description": "Automação atualizada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Mover lead ao ganhar negócio (v2)",
                        "description": "Versão atualizada: agora também envia notificação ao gestor",
                        "automation_type": "trigger",
                        "is_active": True,
                        "priority": 95,
                        "board_id": 1,
                        "trigger_event": "card_won",
                        "trigger_conditions": None,
                        "schedule_type": None,
                        "scheduled_at": None,
                        "recurrence_pattern": None,
                        "next_run_at": None,
                        "actions": [
                            {"type": "move_card", "params": {"target_list_id": 5}},
                            {"type": "award_points", "params": {"points": 30}},
                            {"type": "send_notification", "params": {"user_id": 1, "message": "Novo negócio fechado!"}}
                        ],
                        "state": {},
                        "execution_count": 42,
                        "last_run_at": "2026-01-28T16:45:00",
                        "failure_count": 0,
                        "auto_disable_on_failures": 5,
                        "created_at": "2026-01-05T10:00:00",
                        "updated_at": "2026-02-06T11:30:00"
                    }
                }
            }
        },
        404: _AUTOMATION_NOT_FOUND_RESPONSE,
        422: _VALIDATION_ERROR_RESPONSE
    }
)
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


@router.delete(
    "/{automation_id}",
    summary="Deletar automação",
    responses={
        200: {
            "description": "Automação deletada com sucesso",
            "content": {
                "application/json": {
                    "example": {"message": "Automação deletada com sucesso"}
                }
            }
        },
        404: _AUTOMATION_NOT_FOUND_RESPONSE
    }
)
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

@router.post(
    "/{automation_id}/trigger",
    response_model=AutomationExecutionResponse,
    summary="Executar automação manualmente",
    status_code=201,
    responses={
        201: {
            "description": "Automação executada manualmente com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 150,
                        "automation_id": 1,
                        "card_id": 73,
                        "triggered_by_id": 3,
                        "status": "success",
                        "started_at": "2026-02-06T14:00:00",
                        "completed_at": "2026-02-06T14:00:01",
                        "duration_ms": 189.3,
                        "execution_data": {
                            "manual_trigger": True,
                            "reason": "Teste de validação da automação",
                            "action": "move_card",
                            "from_list": "Novos Leads",
                            "to_list": "Clientes"
                        },
                        "error_message": None,
                        "error_stack": None,
                        "automation_name": "Mover lead ao ganhar negócio",
                        "card_title": "Farmácia São João - Plano Premium"
                    }
                }
            }
        },
        404: _AUTOMATION_NOT_FOUND_RESPONSE
    }
)
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

@router.get(
    "/{automation_id}/executions",
    response_model=AutomationExecutionListResponse,
    summary="Listar execuções",
    responses={
        200: {
            "description": "Histórico de execuções da automação",
            "content": {
                "application/json": {
                    "example": {
                        "executions": [
                            {
                                "id": 101,
                                "automation_id": 1,
                                "card_id": 57,
                                "triggered_by_id": None,
                                "status": "success",
                                "started_at": "2026-01-28T16:45:00",
                                "completed_at": "2026-01-28T16:45:01",
                                "duration_ms": 234.8,
                                "execution_data": {
                                    "action": "move_card",
                                    "from_list": "Negociação",
                                    "to_list": "Clientes",
                                    "card_title": "Empresa ABC Ltda - Consultoria Digital"
                                },
                                "error_message": None,
                                "error_stack": None,
                                "automation_name": "Mover lead ao ganhar negócio",
                                "card_title": "Empresa ABC Ltda - Consultoria Digital"
                            },
                            {
                                "id": 98,
                                "automation_id": 1,
                                "card_id": 51,
                                "triggered_by_id": None,
                                "status": "failed",
                                "started_at": "2026-01-25T10:12:00",
                                "completed_at": "2026-01-25T10:12:02",
                                "duration_ms": 2015.6,
                                "execution_data": {
                                    "action": "move_card",
                                    "card_title": "Padaria Mineira - Site Institucional"
                                },
                                "error_message": "Lista de destino (ID 5) não encontrada ou foi removida",
                                "error_stack": None,
                                "automation_name": "Mover lead ao ganhar negócio",
                                "card_title": "Padaria Mineira - Site Institucional"
                            }
                        ],
                        "total": 2,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 1
                    }
                }
            }
        },
        404: _AUTOMATION_NOT_FOUND_RESPONSE
    }
)
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
