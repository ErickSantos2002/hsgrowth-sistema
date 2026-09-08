"""
Endpoints da API para CardTask (Tarefas/Atividades dos Cards).
"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, status, Request, HTTPException
from sqlalchemy.orm import Session
import json

# get_db vem de app.api.deps (mesma implementacao de app.db.session), porque e
# esse o objeto que a suite de testes substitui pelo banco de teste. Importar do
# outro modulo faria os testes rodarem contra o banco real.
from app.api.deps import get_db
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
from app.api.deps import get_current_active_user, require_not_viewer
from app.services.cadence_service import CadenceService

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
    - `due_date_start`: Filtrar tarefas com due_date >= este valor (datetime ISO UTC)
    - `due_date_end`: Filtrar tarefas com due_date <= este valor (datetime ISO UTC)

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
    card_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    assignee_role: Optional[str] = None,
    task_type: Optional[str] = None,
    priority: Optional[str] = None,
    is_completed: Optional[bool] = None,
    due_date_start: Optional[datetime] = None,
    due_date_end: Optional[datetime] = None,
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
    - due_date_start: Filtrar por due_date >= valor (datetime UTC)
    - due_date_end: Filtrar por due_date <= valor (datetime UTC)
    """
    filters = CardTaskFilters(
        card_id=card_id,
        assigned_to_id=assigned_to_id,
        assignee_role=assignee_role,
        task_type=task_type,
        priority=priority,
        is_completed=is_completed,
        due_date_start=due_date_start,
        due_date_end=due_date_end,
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
    assignee_role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Busca tarefas atrasadas.

    Se user_id não for especificado, retorna todas as tarefas atrasadas.
    assignee_role filtra pelo papel do responsável (ex: salesperson, sdr).
    """
    service = CardTaskService(db)
    return service.get_overdue_tasks(user_id, assignee_role)


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

    # Se due_date foi alterada e a tarefa tem evento no calendário, reagenda automaticamente
    if task_data.due_date is not None and task.teams_event_id:
        try:
            from app.services.microsoft_graph_service import microsoft_graph_service
            from datetime import timedelta
            duration = task.duration_minutes or 60
            end_dt = task.due_date + timedelta(minutes=duration)
            microsoft_graph_service.update_calendar_event(
                user=current_user,
                db=db,
                event_id=task.teams_event_id,
                start_dt=task.due_date,
                end_dt=end_dt,
            )
        except Exception as e:
            # Não bloqueia o update da tarefa se o calendário falhar
            print(f"[CardTask] Aviso: não foi possível reagendar evento no calendário: {e}")

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
    task = service.toggle_complete(task_id, data.is_completed, current_user, is_valid=data.is_valid if data.is_valid is not None else True, notes=data.notes)

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

    # Hook de cadência: re-carrega a task do banco para garantir que card_cadence_id está disponível
    if data.is_completed:
        try:
            fresh_task = db.query(CardTask).filter(CardTask.id == task_id).first()
            if fresh_task:
                CadenceService(db).on_task_completed(fresh_task, current_user)
        except Exception as e:
            print(f"[CADENCE] Erro ao avançar cadência após conclusão da task {task_id}: {e}")

    return task


@router.patch(
    "/{task_id}/noshow",
    response_model=CardTaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Marcar reunião como NoShow",
    description="""
    Marca uma reunião como NoShow: o contato não compareceu.

    **Comportamento:**
    - Seta `is_completed = true`, `completed_at = agora` e `is_noshow = true`
    - Só pode ser aplicado em tarefas do tipo `meeting`
    - Registra no audit log

    **Permissões:** Não disponível para role Viewer
    """,
    responses={
        200: {
            "description": "Reunião marcada como NoShow com sucesso",
            "content": {
                "application/json": {
                    "example": {"id": 1, "is_completed": True, "is_noshow": True}
                }
            }
        },
        400: {
            "description": "Tarefa não é do tipo meeting",
            "content": {
                "application/json": {
                    "example": {"detail": "Apenas reuniões podem ser marcadas como NoShow"}
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
def mark_noshow(
    request: Request,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_not_viewer),
):
    """
    Marca uma reunião como NoShow.
    Seta is_completed, completed_at e is_noshow=True de uma vez.
    """
    from fastapi import HTTPException
    from app.models.card_task import TaskType as ModelTaskType

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    # Somente reuniões podem receber NoShow
    if task.task_type != ModelTaskType.MEETING:
        raise HTTPException(
            status_code=400,
            detail="Apenas reuniões podem ser marcadas como NoShow"
        )

    task.mark_as_noshow()
    db.flush()

    # Move o card para a lista "Reagendamento" do mesmo board do card
    try:
        from app.models.card import Card
        from app.models.list import List as BoardList
        card = db.query(Card).filter(Card.id == task.card_id).first()
        if card:
            # Obtém o board_id via lista atual do card
            current_list = db.query(BoardList).filter(BoardList.id == card.list_id).first()
            board_id = current_list.board_id if current_list else None

            # Busca primeiro no board atual do card
            reagendar_list = None
            if board_id:
                reagendar_list = (
                    db.query(BoardList)
                    .filter(
                        BoardList.board_id == board_id,
                        BoardList.name.ilike("%reagend%"),
                    )
                    .first()
                )
            # Fallback: busca em qualquer board
            if not reagendar_list:
                reagendar_list = (
                    db.query(BoardList)
                    .filter(BoardList.name.ilike("%reagend%"))
                    .first()
                )
            if reagendar_list and reagendar_list.id != card.list_id:
                from app.services.card_service import CardService
                card_service = CardService(db)
                card_service.move_card(card.id, reagendar_list.id, None, current_user)
                print(f"[NOSHOW] Card {card.id} movido para lista '{reagendar_list.name}' (board {reagendar_list.board_id})")
            elif not reagendar_list:
                print(f"[NOSHOW] Lista 'Reagendamento' não encontrada no board {board_id}")
    except Exception as e:
        # Falha silenciosa — o NoShow já foi registrado, não cancela por erro de movimentação
        print(f"[NOSHOW] Erro ao mover card: {e}")

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    audit_log = AuditLog(
        user_id=current_user.id,
        action="NOSHOW",
        entity_type="Task",
        entity_id=task.id,
        description=f"Reunião marcada como NoShow: {task.title}",
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.add(audit_log)
    db.commit()
    db.refresh(task)

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


# ==================== MICROSOFT TEAMS ====================

@router.post(
    "/{task_id}/teams-meeting",
    response_model=CardTaskResponse,
    summary="Criar reunião no Microsoft Teams",
    description="""
    Cria uma reunião no Microsoft Teams para esta atividade e salva o link de acesso.

    **Requisitos:**
    - Atividade deve ser do tipo `meeting`
    - Usuário precisa ter autenticado via SSO Microsoft (ter tokens MS salvos)
    - Permissão `OnlineMeetings.ReadWrite` concedida no Azure

    **Comportamento:**
    - Usa `due_date` da atividade como horário de início
    - Duração baseada em `duration_minutes` (padrão: 60 min)
    - O link gerado fica salvo em `teams_join_url` e pode ser aberto diretamente no Teams
    """,
)
async def create_teams_meeting(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cria reunião no Teams para a atividade e salva o link de acesso."""
    from app.services.microsoft_graph_service import microsoft_graph_service

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")

    if task.task_type.value != "meeting":
        raise HTTPException(
            status_code=400,
            detail="Apenas atividades do tipo 'Reunião' podem ter reunião no Teams"
        )

    if not task.due_date:
        raise HTTPException(
            status_code=400,
            detail="Defina uma data/hora para a atividade antes de criar a reunião no Teams"
        )

    try:
        duration = task.duration_minutes or 60
        from datetime import timedelta
        from app.models.card import Card
        from app.models.person import Person

        end_dt = task.due_date + timedelta(minutes=duration)

        # Coleta e-mails dos convidados: vendedor responsável + contato do card
        attendee_emails = []
        card = db.query(Card).filter(Card.id == task.card_id).first()

        # Vendedor (assigned_to) — convidado principal, a reunião deve aparecer no calendário dele
        if card and card.assigned_to and card.assigned_to.email:
            seller_email = card.assigned_to.email.strip()
            # Não convida o próprio organizador (quem está criando a reunião)
            if seller_email and seller_email != current_user.email:
                attendee_emails.append(seller_email)

        # Contato do card (cliente/pessoa vinculada)
        if card and card.person_id:
            person = db.query(Person).filter(Person.id == card.person_id).first()
            if person:
                for email in [person.email, person.email_commercial, person.email_personal]:
                    if email and email.strip() and email not in attendee_emails:
                        attendee_emails.append(email.strip())

        result = microsoft_graph_service.create_calendar_event(
            user=current_user,
            db=db,
            title=task.title,
            start_dt=task.due_date,
            end_dt=end_dt,
            attendee_emails=attendee_emails or None,
            # Mesmo corpo da reunião no CRM, para o cliente receber sempre a
            # mesma comunicação. Sem public_link: o Outlook acrescenta o bloco
            # de entrada do Teams por conta própria.
            body_html=_montar_corpo_convite(task, current_user),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    task.teams_meeting_id = result["meeting_id"]
    task.teams_join_url = result["join_url"]
    task.teams_event_id = result.get("event_id", "")
    db.commit()
    db.refresh(task)

    service = CardTaskService(db)
    return service.get_task(task_id)


@router.post(
    "/{task_id}/cancel-teams",
    response_model=CardTaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancelar evento Teams da reunião",
)
def cancel_teams_meeting(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_not_viewer),
):
    """Remove o evento do calendário do Outlook e limpa os campos Teams da tarefa."""
    from app.services.microsoft_graph_service import microsoft_graph_service

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    if task.teams_event_id:
        try:
            microsoft_graph_service.delete_calendar_event(
                user=current_user,
                db=db,
                event_id=task.teams_event_id,
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    task.is_cancelled = True
    task.teams_meeting_id = None
    task.teams_join_url = None
    task.teams_event_id = None
    db.commit()
    db.refresh(task)

    service = CardTaskService(db)
    return service.get_task(task_id)


@router.post(
    "/{task_id}/fetch-transcript",
    response_model=CardTaskResponse,
    summary="Buscar transcrição da reunião e analisar com IA",
    description="""
    Busca a transcrição da reunião Teams associada a esta atividade,
    salva o conteúdo bruto e executa análise com IA (OpenAI GPT-4o).

    **Requisitos:**
    - Atividade deve ter `teams_meeting_id` (reunião criada pelo CRM)
    - A reunião precisa ter ocorrido e a transcrição estar disponível no Teams
    - Transcrição automática habilitada no Teams Admin Center

    **Comportamento:**
    - Busca a transcrição mais recente da reunião
    - Salva o VTT bruto em `transcript_raw`
    - Analisa com GPT-4o e salva JSON em `transcript_analysis`
    - O JSON contém: resumo, sentimento, interesse_cliente, objecoes, proximos_passos, pontos_de_atencao

    **Observação:** A transcrição fica disponível alguns minutos após o término da reunião.
    """,
)
async def fetch_transcript(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Busca transcrição do Teams e analisa com IA."""
    from app.services.microsoft_graph_service import microsoft_graph_service
    from app.services.transcript_analysis_service import transcript_analysis_service

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")

    if not task.teams_meeting_id:
        raise HTTPException(
            status_code=400,
            detail="Esta atividade não possui reunião Teams criada pelo CRM"
        )

    # Se o meeting_id é um marcador join_url: (resolução adiada), tenta resolver agora
    meeting_id = task.teams_meeting_id
    if meeting_id.startswith("join_url:") and task.teams_join_url:
        try:
            token = microsoft_graph_service._require_token(current_user, db)
            resolved = microsoft_graph_service._resolve_meeting_id_by_join_url(token, task.teams_join_url)
            if not resolved.startswith("join_url:"):
                task.teams_meeting_id = resolved
                db.commit()
                meeting_id = resolved
        except Exception:
            pass

    # Busca lista de transcrições disponíveis
    try:
        transcripts = microsoft_graph_service.get_meeting_transcripts(
            user=current_user,
            db=db,
            meeting_id=meeting_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not transcripts:
        raise HTTPException(
            status_code=404,
            detail=(
                "Nenhuma transcrição disponível ainda para esta reunião. "
                "Aguarde alguns minutos após o término da reunião e tente novamente."
            )
        )

    # Usa a transcrição mais recente
    latest = transcripts[-1]
    transcript_id = latest["id"]

    # Baixa o conteúdo VTT
    try:
        vtt_content = microsoft_graph_service.get_transcript_content(
            user=current_user,
            db=db,
            meeting_id=meeting_id,
            transcript_id=transcript_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    task.transcript_raw = vtt_content

    # Analisa com IA
    try:
        analysis = transcript_analysis_service.analyze(vtt_content)
        task.transcript_analysis = json.dumps(analysis, ensure_ascii=False)
    except ValueError as e:
        # Salva a transcrição bruta mesmo se a análise falhar
        db.commit()
        raise HTTPException(
            status_code=422,
            detail=f"Transcrição salva, mas análise IA falhou: {e}"
        )

    db.commit()
    db.refresh(task)

    service = CardTaskService(db)
    return service.get_task(task_id)



# ==================== REUNIÃO POR VÍDEO (DAILY) ====================


def _montar_corpo_convite(
    task: CardTask,
    organizador: User,
    public_link: str | None = None,
) -> str:
    """
    Monta o corpo do convite enviado ao cliente.

    Usado pelos dois fluxos (reunião no CRM e Teams) para o cliente receber
    sempre a mesma comunicação. A pauta escrita pelo vendedor entra aqui —
    antes ficava só no CRM, e quem recebia o convite não via.

    Args:
        public_link: link da sala no CRM. Quando ausente (fluxo Teams), o
            próprio Outlook insere o bloco de entrada da reunião.
    """
    from html import escape
    from zoneinfo import ZoneInfo

    # Título, pauta e nome vêm do usuário e são interpolados em HTML. Sem
    # escapar, quem preenche esses campos poderia injetar marcação no convite —
    # inclusive um link disfarçado, que sairia com a credibilidade do domínio
    # da empresa para a caixa de entrada do cliente.
    linhas = ["<p>Olá!</p>", "<p>Sua reunião com a <strong>Health &amp; Safety Tech</strong> está agendada.</p>"]

    detalhes = [f"<strong>Assunto:</strong> {escape(task.title or '')}"]

    if task.due_date:
        # due_date é gravado em UTC; o cliente lê em horário de Brasília
        quando = task.due_date
        if quando.tzinfo is None:
            quando = quando.replace(tzinfo=timezone.utc)
        quando_br = quando.astimezone(ZoneInfo("America/Sao_Paulo"))
        detalhes.append(
            f"<strong>Quando:</strong> {quando_br.strftime('%d/%m/%Y às %H:%M')} "
            f"(horário de Brasília)"
        )

    if task.duration_minutes:
        detalhes.append(f"<strong>Duração prevista:</strong> {task.duration_minutes} minutos")

    linhas.append("<p>" + "<br>".join(detalhes) + "</p>")

    if task.description and task.description.strip():
        # escapa ANTES de trocar as quebras, senão o próprio <br> seria escapado
        pauta = escape(task.description.strip()).replace("\n", "<br>")
        linhas.append(f"<p><strong>Pauta:</strong><br>{pauta}</p>")

    if public_link:
        link_seguro = escape(public_link, quote=True)
        linhas.append(
            "<p><strong>Como entrar:</strong><br>"
            f'<a href="{link_seguro}">{link_seguro}</a></p>'
            "<p>É só clicar no link no horário combinado — a reunião abre direto "
            "no navegador, sem instalar nem criar conta.</p>"
        )

    linhas.append("<p>Se precisar remarcar ou tiver qualquer dúvida, é só responder este convite.</p>")
    linhas.append(f"<p>Até lá!<br>{escape(organizador.name or '')}<br>Health &amp; Safety Tech</p>")

    return "".join(linhas)


def _verificar_acesso_reuniao(db: Session, task: CardTask, current_user: User) -> None:
    """
    Garante que o usuário tem vínculo com o negócio antes de mexer na reunião.

    Sem isso, qualquer usuário autenticado poderia pegar o token de anfitrião de
    uma reunião alheia e entrar na conversa de outro vendedor com o cliente dele,
    além de criar salas (disparando convite para contatos de terceiros) e
    cancelar reuniões dos outros.

    Regra (RN-037): admin e gerente acessam tudo; os demais precisam ser o
    responsável pela tarefa, o vendedor do card ou o SDR do card.

    Raises:
        HTTPException 403: sem vínculo com o negócio
    """
    from app.models.card import Card

    role_name = current_user.role.name if current_user.role else ""
    if role_name in ("admin", "manager"):
        return

    if task.assigned_to_id == current_user.id:
        return

    card = db.query(Card).filter(Card.id == task.card_id).first()
    if card and current_user.id in (card.assigned_to_id, card.sdr_id):
        return

    raise HTTPException(
        status_code=403,
        detail="Você não tem permissão para acessar esta reunião.",
    )


def _agendar_evento_daily_no_outlook(
    db: Session,
    task: CardTask,
    current_user: User,
    public_link: str,
) -> None:
    """
    Cria o evento no calendário do Outlook com o link da sala do Daily.

    É este evento que dispara o convite ao cliente e bloqueia o horário na
    agenda do vendedor — o SDR consulta esse mesmo free/busy antes de agendar.
    Sem ele, haveria agendamento em cima de reunião interna.

    Levanta ValueError quando o usuário não tem conta Microsoft conectada;
    quem chama decide o que fazer (a regra é bloquear a criação).
    """
    from app.services.microsoft_graph_service import microsoft_graph_service
    from app.models.card import Card

    attendee_emails: list[str] = []

    card = db.query(Card).filter(Card.id == task.card_id).first()
    if card and card.assigned_to and card.assigned_to.email:
        seller_email = card.assigned_to.email.strip()
        if seller_email and seller_email != current_user.email:
            attendee_emails.append(seller_email)

    if card and card.person:
        for email in (card.person.email, card.person.email_commercial, card.person.email_personal):
            if email and email.strip() and email.strip() not in attendee_emails:
                attendee_emails.append(email.strip())

    body_html = _montar_corpo_convite(task, current_user, public_link=public_link)

    microsoft_graph_service.create_calendar_event(
        user=current_user,
        db=db,
        title=task.title,
        start_dt=task.due_date or datetime.utcnow(),
        end_dt=None,
        attendee_emails=attendee_emails or None,
        body_html=body_html,
        is_online_meeting=False,
    )


@router.post(
    "/{task_id}/daily-room",
    summary="Criar sala de reunião por vídeo (Daily)",
    description="""
    Cria a sala no Daily para esta tarefa, gera o link público do convidado e
    agenda o evento no calendário do Outlook (que envia o convite).

    O link público permite que o cliente entre sem login e sem instalar nada.

    **Requer conta Microsoft conectada** — o convite sai pelo calendário do
    usuário que cria a reunião.
    """,
)
async def create_daily_room(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.core.config import settings
    from app.services.daily_service import DailyService

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    _verificar_acesso_reuniao(db, task, current_user)

    service = DailyService(db)

    try:
        room = service.create_room(task)
    except ValueError as e:
        # Daily fora do ar ou sem chave: sugere a alternativa que continua ali
        raise HTTPException(
            status_code=503,
            detail=(
                f"Não foi possível criar a reunião por vídeo. {e} "
                "Você pode criar a reunião pelo Teams enquanto isso."
            ),
        )

    public_link = f"{settings.FRONTEND_URL}/entrar/{task.public_access_token}"

    try:
        _agendar_evento_daily_no_outlook(db, task, current_user, public_link)
    except ValueError:
        # Sem conta Microsoft: a decisão é bloquear (o convite é parte do fluxo).
        # Desfaz a sala para não deixar reunião pela metade.
        service.delete_room(task)
        task.daily_room_name = None
        task.daily_room_url = None
        task.public_access_token = None
        task.meeting_provider = None
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=(
                "Conecte sua conta Microsoft antes de criar a reunião — "
                "o convite é enviado pelo seu calendário."
            ),
        )

    return {
        "room_url": task.daily_room_url,
        "public_link": public_link,
        "public_access_token": task.public_access_token,
    }


@router.post(
    "/{task_id}/daily-host-token",
    summary="Token de anfitrião para entrar na sala",
    description="Devolve o token que permite ao vendedor/SDR entrar como dono da sala.",
)
async def create_daily_host_token(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.services.daily_service import DailyService

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    _verificar_acesso_reuniao(db, task, current_user)

    if not task.daily_room_name:
        raise HTTPException(
            status_code=400,
            detail="Esta reunião ainda não tem sala criada.",
        )

    service = DailyService(db)
    try:
        token = service.create_host_token(task, current_user)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Marca o início na primeira entrada do anfitrião
    if not task.meeting_started_at:
        task.meeting_started_at = datetime.utcnow()
        db.commit()

    return {"token": token, "room_url": task.daily_room_url}


@router.delete(
    "/{task_id}/daily-room",
    summary="Cancelar a sala de reunião por vídeo",
    description="Apaga a sala no Daily e limpa os dados da reunião. A tarefa permanece.",
)
async def delete_daily_room(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.services.daily_service import DailyService

    task = db.query(CardTask).filter(CardTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    _verificar_acesso_reuniao(db, task, current_user)

    DailyService(db).delete_room(task)

    task.daily_room_name = None
    task.daily_room_url = None
    task.public_access_token = None
    task.meeting_provider = None
    db.commit()

    return {"message": "Sala cancelada"}
