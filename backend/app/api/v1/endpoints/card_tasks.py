"""
Endpoints da API para CardTask (Tarefas/Atividades dos Cards).
"""
from fastapi import APIRouter, Depends, status, Request
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
from app.models.audit_log import AuditLog
from app.models.card_task import CardTask
from app.api.deps import get_current_active_user

router = APIRouter()


@router.post("", response_model=CardTaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    request: Request,
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
    task = service.create_task(task_data, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE",
        entity_type="Task",
        entity_id=task.id,
        description=f"Tarefa criada: {task.title} ({task.task_type})",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return task


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
    request: Request,
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
    task = service.update_task(task_id, task_data, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Constrói descrição com campos alterados
    changed_fields = []
    if task_data.title is not None:
        changed_fields.append("título")
    if task_data.description is not None:
        changed_fields.append("descrição")
    if task_data.task_type is not None:
        changed_fields.append("tipo")
    if task_data.priority is not None:
        changed_fields.append("prioridade")
    if task_data.due_date is not None:
        changed_fields.append("data de vencimento")
    if task_data.assigned_to_id is not None:
        changed_fields.append("responsável")

    fields_str = ", ".join(changed_fields) if changed_fields else "dados"

    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE",
        entity_type="Task",
        entity_id=task.id,
        description=f"Tarefa atualizada: {task.title} - Campos: {fields_str}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return task


@router.patch("/{task_id}/complete", response_model=CardTaskResponse)
def toggle_complete(
    request: Request,
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
    task = service.toggle_complete(task_id, data.is_completed, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    action_desc = "concluída" if data.is_completed else "reaberta"

    audit_log = AuditLog(
        user_id=current_user.id,
        action="COMPLETE" if data.is_completed else "UPDATE",
        entity_type="Task",
        entity_id=task.id,
        description=f"Tarefa {action_desc}: {task.title}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return task


@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(
    request: Request,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Deleta uma tarefa"""
    # Busca a task antes de deletar para registrar no log
    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    task_title = task.title if task else f"ID {task_id}"

    service = CardTaskService(db)
    result = service.delete_task(task_id, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="DELETE",
        entity_type="Task",
        entity_id=task_id,
        description=f"Tarefa deletada: {task_title}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return result
