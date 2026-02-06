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


@router.post(
    "",
    response_model=CardTaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar nova tarefa/atividade",
    description="""
    Cria uma nova tarefa ou atividade vinculada a um card.

    **Tipos de tarefa disponíveis:**
    - `call`: Ligação telefônica
    - `meeting`: Reunião presencial ou online
    - `task`: Tarefa genérica
    - `deadline`: Prazo ou data limite
    - `email`: Envio de email
    - `lunch`: Almoço/refeição de negócios
    - `other`: Outro tipo

    **Prioridades:**
    - `normal`: Prioridade normal (padrão)
    - `high`: Prioridade alta
    - `urgent`: Prioridade urgente

    **Comportamento:**
    - A tarefa é vinculada ao card e pode ser atribuída a um usuário específico
    - Registra automaticamente no audit log

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        201: {
            "description": "Tarefa criada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "card_id": 42,
                        "title": "Ligar para cliente sobre proposta",
                        "description": "Confirmar valores e condições da proposta enviada",
                        "task_type": "call",
                        "priority": "high",
                        "due_date": "2026-01-20T14:00:00",
                        "is_completed": False,
                        "completed_at": None,
                        "assigned_to_id": 5,
                        "assigned_to_name": "João Silva",
                        "created_by_id": 3,
                        "created_by_name": "Maria Santos",
                        "created_at": "2026-01-15T10:00:00",
                        "updated_at": None
                    }
                }
            }
        },
        404: {
            "description": "Card não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Card não encontrado"}
                }
            }
        },
        422: {
            "description": "Dados inválidos",
            "content": {
                "application/json": {
                    "example": {"detail": "Erro de validação nos dados enviados"}
                }
            }
        }
    }
)
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


@router.get(
    "",
    response_model=CardTaskListResponse,
    summary="Listar tarefas com filtros",
    description="""
    Lista tarefas/atividades com diversos filtros e paginação.

    **Filtros disponíveis:**
    - `card_id`: Filtrar por card específico
    - `assigned_to_id`: Filtrar por responsável (ID do usuário)
    - `task_type`: Filtrar por tipo (call, meeting, task, deadline, email, lunch, other)
    - `priority`: Filtrar por prioridade (normal, high, urgent)
    - `is_completed`: Filtrar por status de conclusão (true/false)

    **Paginação:**
    - `page`: Número da página (padrão: 1)
    - `page_size`: Itens por página (padrão: 50)

    **Retorna:**
    - Lista paginada de tarefas
    - Metadados de paginação (total, page, page_size, total_pages)

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Lista de tarefas",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": 1,
                                "card_id": 42,
                                "title": "Ligar para cliente",
                                "task_type": "call",
                                "priority": "high",
                                "due_date": "2026-01-20T14:00:00",
                                "is_completed": False,
                                "assigned_to_name": "João Silva"
                            }
                        ],
                        "total": 15,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 1
                    }
                }
            }
        }
    }
)
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


@router.get(
    "/overdue",
    response_model=List[CardTaskResponse],
    summary="Listar tarefas atrasadas",
    description="""
    Busca todas as tarefas que estão com a data de vencimento ultrapassada e ainda não foram concluídas.

    **Parâmetros:**
    - `user_id` (opcional): Filtrar por responsável específico. Se não informado, retorna todas as tarefas atrasadas.

    **Retorna:**
    - Lista de tarefas com due_date anterior ao momento atual e is_completed = false
    - Ordenadas por data de vencimento (mais atrasada primeiro)

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Lista de tarefas atrasadas",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 3,
                            "card_id": 15,
                            "title": "Enviar contrato para assinatura",
                            "task_type": "task",
                            "priority": "urgent",
                            "due_date": "2026-01-10T18:00:00",
                            "is_completed": False,
                            "assigned_to_name": "Maria Santos"
                        }
                    ]
                }
            }
        }
    }
)
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


@router.get(
    "/card/{card_id}/pending",
    response_model=List[CardTaskResponse],
    summary="Listar tarefas pendentes de um card",
    description="""
    Busca todas as tarefas pendentes (não concluídas) de um card específico.

    **Parâmetros:**
    - `card_id`: ID do card
    - `limit` (opcional): Quantidade máxima de tarefas a retornar

    **Retorna:**
    - Lista de tarefas pendentes ordenadas por data de vencimento (mais próxima primeiro) e prioridade

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Lista de tarefas pendentes do card",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 5,
                            "card_id": 42,
                            "title": "Reunião de apresentação",
                            "task_type": "meeting",
                            "priority": "high",
                            "due_date": "2026-01-22T10:00:00",
                            "is_completed": False,
                            "assigned_to_name": "João Silva"
                        }
                    ]
                }
            }
        },
        404: {
            "description": "Card não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Card não encontrado"}
                }
            }
        }
    }
)
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


@router.get(
    "/card/{card_id}/counts",
    summary="Contadores de tarefas de um card",
    description="""
    Retorna os contadores de tarefas de um card específico.

    **Parâmetros:**
    - `card_id`: ID do card

    **Retorna:**
    - `total`: Total de tarefas do card
    - `pending`: Quantidade de tarefas pendentes
    - `completed`: Quantidade de tarefas concluídas

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Contadores de tarefas",
            "content": {
                "application/json": {
                    "example": {
                        "total": 8,
                        "pending": 3,
                        "completed": 5
                    }
                }
            }
        },
        404: {
            "description": "Card não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Card não encontrado"}
                }
            }
        }
    }
)
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


@router.get(
    "/{task_id}",
    response_model=CardTaskResponse,
    summary="Buscar tarefa por ID",
    description="""
    Busca uma tarefa específica pelo seu ID.

    **Parâmetros:**
    - `task_id`: ID da tarefa

    **Retorna:**
    - Dados completos da tarefa, incluindo nomes do responsável e criador

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Tarefa encontrada",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "card_id": 42,
                        "title": "Ligar para cliente sobre proposta",
                        "description": "Confirmar valores e condições",
                        "task_type": "call",
                        "priority": "high",
                        "due_date": "2026-01-20T14:00:00",
                        "is_completed": False,
                        "completed_at": None,
                        "assigned_to_id": 5,
                        "assigned_to_name": "João Silva",
                        "created_by_id": 3,
                        "created_by_name": "Maria Santos",
                        "created_at": "2026-01-15T10:00:00",
                        "updated_at": None
                    }
                }
            }
        },
        404: {
            "description": "Tarefa não encontrada",
            "content": {
                "application/json": {
                    "example": {"detail": "Tarefa não encontrada"}
                }
            }
        }
    }
)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Busca uma tarefa por ID."""
    service = CardTaskService(db)
    return service.get_task(task_id)


@router.put(
    "/{task_id}",
    response_model=CardTaskResponse,
    summary="Atualizar tarefa",
    description="""
    Atualiza uma tarefa existente. Apenas campos fornecidos serão atualizados (PATCH semântico).

    **Campos atualizáveis:**
    - `title`: Título da tarefa
    - `description`: Descrição detalhada
    - `task_type`: Tipo da tarefa (call, meeting, task, etc.)
    - `priority`: Prioridade (normal, high, urgent)
    - `due_date`: Data de vencimento
    - `assigned_to_id`: ID do responsável

    **Comportamento:**
    - Registra os campos alterados no audit log
    - Atualiza o campo `updated_at` automaticamente

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Tarefa atualizada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "card_id": 42,
                        "title": "Ligar para cliente - urgente",
                        "task_type": "call",
                        "priority": "urgent",
                        "due_date": "2026-01-18T10:00:00",
                        "is_completed": False,
                        "assigned_to_name": "João Silva",
                        "updated_at": "2026-01-16T08:30:00"
                    }
                }
            }
        },
        404: {
            "description": "Tarefa não encontrada",
            "content": {
                "application/json": {
                    "example": {"detail": "Tarefa não encontrada"}
                }
            }
        },
        422: {
            "description": "Dados inválidos",
            "content": {
                "application/json": {
                    "example": {"detail": "Erro de validação nos dados enviados"}
                }
            }
        }
    }
)
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


@router.patch(
    "/{task_id}/complete",
    response_model=CardTaskResponse,
    summary="Marcar/desmarcar tarefa como concluída",
    description="""
    Alterna o status de conclusão de uma tarefa.

    **Parâmetros:**
    - `task_id`: ID da tarefa
    - `is_completed`: `true` para marcar como concluída, `false` para reabrir

    **Comportamento:**
    - Ao marcar como concluída: registra a data/hora em `completed_at`
    - Ao reabrir: limpa o campo `completed_at`
    - Registra a ação no audit log

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Status da tarefa atualizado",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "card_id": 42,
                        "title": "Ligar para cliente sobre proposta",
                        "task_type": "call",
                        "priority": "high",
                        "is_completed": True,
                        "completed_at": "2026-01-18T15:30:00",
                        "assigned_to_name": "João Silva"
                    }
                }
            }
        },
        404: {
            "description": "Tarefa não encontrada",
            "content": {
                "application/json": {
                    "example": {"detail": "Tarefa não encontrada"}
                }
            }
        }
    }
)
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


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_200_OK,
    summary="Deletar tarefa",
    description="""
    Deleta permanentemente uma tarefa/atividade.

    **Parâmetros:**
    - `task_id`: ID da tarefa a ser deletada

    **Comportamento:**
    - Remove a tarefa permanentemente do banco de dados
    - Registra a deleção no audit log

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Tarefa deletada com sucesso",
            "content": {
                "application/json": {
                    "example": {"message": "Tarefa deletada com sucesso"}
                }
            }
        },
        404: {
            "description": "Tarefa não encontrada",
            "content": {
                "application/json": {
                    "example": {"detail": "Tarefa não encontrada"}
                }
            }
        }
    }
)
def delete_task(
    request: Request,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Deleta uma tarefa."""
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
