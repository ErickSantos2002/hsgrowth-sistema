"""
Endpoints da API para CardTask (Tarefas/Atividades dos Cards).
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.services.card_task_service import CardTaskService
from app.schemas.card_task import (
    CardTaskCreate,
    CardTaskUpdate,
    CardTaskResponse,
    CardTaskListResponse,
    CardTaskFilters,
    CardTaskMarkComplete
)
from app.models.user import User
from app.api.deps import get_current_active_user

router = APIRouter()


@router.post("", response_model=CardTaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_data: CardTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Cria uma nova tarefa/atividade.

    **Tipos de tarefa disponíveis:**
    - call: Ligação
    - meeting: Reunião
    - task: Tarefa
    - deadline: Prazo
    - email: E-mail
    - lunch: Almoço
    - other: Outro
    """
    service = CardTaskService(db)
    return service.create_task(task_data, current_user)


@router.get("", response_model=CardTaskListResponse)
def list_tasks(
    card_id: int = None,
    assigned_to_id: int = None,
    task_type: str = None,
    priority: str = None,
    is_completed: bool = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lista tarefas com filtros.

    **Filtros disponíveis:**
    - card_id: Filtrar por card específico
    - assigned_to_id: Filtrar por responsável
    - task_type: Filtrar por tipo (call, meeting, task, etc)
    - priority: Filtrar por prioridade (normal, high, urgent)
    - is_completed: Filtrar por status (true/false)
    """
    filters = CardTaskFilters(
        card_id=card_id,
        assigned_to_id=assigned_to_id,
        task_type=task_type,
        priority=priority,
        is_completed=is_completed,
        page=page,
        page_size=page_size
    )

    service = CardTaskService(db)
    return service.list_tasks(filters)


@router.get("/overdue", response_model=List[CardTaskResponse])
def get_overdue_tasks(
    user_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Busca tarefas atrasadas.

    Se user_id não for especificado, retorna todas as tarefas atrasadas.
    """
    service = CardTaskService(db)
    return service.get_overdue_tasks(user_id)


@router.get("/card/{card_id}/pending", response_model=List[CardTaskResponse])
def get_pending_tasks_by_card(
    card_id: int,
    limit: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Busca tarefas pendentes de um card específico.

    Ordenadas por data de vencimento (mais próxima primeiro) e prioridade.
    """
    service = CardTaskService(db)
    return service.get_pending_tasks_by_card(card_id, limit)


@router.get("/card/{card_id}/counts")
def get_task_counts(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retorna contadores de tarefas de um card.

    Retorna: total, pending, completed
    """
    service = CardTaskService(db)
    return service.get_task_counts(card_id)


@router.get("/{task_id}", response_model=CardTaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Busca uma tarefa por ID"""
    service = CardTaskService(db)
    return service.get_task(task_id)


@router.put("/{task_id}", response_model=CardTaskResponse)
def update_task(
    task_id: int,
    task_data: CardTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Atualiza uma tarefa.

    Apenas campos fornecidos serão atualizados.
    """
    service = CardTaskService(db)
    return service.update_task(task_id, task_data, current_user)


@router.patch("/{task_id}/complete", response_model=CardTaskResponse)
def toggle_complete(
    task_id: int,
    data: CardTaskMarkComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Marca/desmarca uma tarefa como concluída.

    Ao marcar como concluída, registra a data de conclusão.
    """
    service = CardTaskService(db)
    return service.toggle_complete(task_id, data.is_completed, current_user)


@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Deleta uma tarefa"""
    service = CardTaskService(db)
    return service.delete_task(task_id, current_user)
