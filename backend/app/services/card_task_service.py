"""
Service para CardTask - Lógica de negócio para tarefas/atividades dos cards.
"""
from sqlalchemy.orm import Session
from typing import Optional, List
from fastapi import HTTPException, status

from app.repositories.card_task_repository import CardTaskRepository
from app.repositories.activity_repository import ActivityRepository
from app.models.card_task import CardTask
from app.models.user import User
from app.schemas.card_task import (
    CardTaskCreate,
    CardTaskUpdate,
    CardTaskResponse,
    CardTaskListResponse,
    CardTaskFilters
)
import math


class CardTaskService:
    """Service para operações de CardTask"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = CardTaskRepository(db)
        self.activity_repository = ActivityRepository(db)

    def _log_activity(
        self,
        card_id: int,
        user_id: int,
        activity_type: str,
        description: str,
        metadata: dict = None
    ):
        """
        Registra uma atividade no histórico do card

        Args:
            card_id: ID do card
            user_id: ID do usuário que executou a ação
            activity_type: Tipo da atividade
            description: Descrição legível
            metadata: Dados adicionais em JSON
        """
        self.activity_repository.create(
            card_id=card_id,
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            activity_metadata=metadata or {}
        )

    def create_task(self, task_data: CardTaskCreate, current_user: User) -> CardTaskResponse:
        """Cria uma nova tarefa"""
        # TODO: Verificar se o card existe e se o usuário tem permissão

        # Se não foi especificado assigned_to_id, atribui ao usuário atual
        if task_data.assigned_to_id is None:
            task_data.assigned_to_id = current_user.id

        task = self.repository.create(task_data)

        # Registra no histórico
        task_type_names = {
            "call": "Ligação",
            "meeting": "Reunião",
            "task": "Tarefa",
            "deadline": "Prazo",
            "email": "E-mail",
            "lunch": "Almoço",
            "other": "Outro"
        }
        task_type_label = task_type_names.get(task_data.task_type, "Atividade")

        self._log_activity(
            card_id=task_data.card_id,
            user_id=current_user.id,
            activity_type="task_created",
            description=f"{task_type_label} criada: {task_data.title}",
            metadata={
                "task_id": task.id,
                "task_type": task_data.task_type,
                "task_title": task_data.title,
                "due_date": str(task_data.due_date) if task_data.due_date else None
            }
        )

        # TODO: Enviar notificação se assigned_to_id != current_user.id

        return self._build_response(task)

    def get_task(self, task_id: int) -> CardTaskResponse:
        """Busca uma tarefa por ID"""
        task = self.repository.get_by_id_with_relations(task_id)

        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tarefa {task_id} não encontrada"
            )

        return self._build_response(task)

    def list_tasks(self, filters: CardTaskFilters) -> CardTaskListResponse:
        """Lista tarefas com filtros"""
        tasks, total = self.repository.list_by_filters(filters)

        total_pages = math.ceil(total / filters.page_size) if total > 0 else 0

        return CardTaskListResponse(
            tasks=[self._build_response(t) for t in tasks],
            total=total,
            page=filters.page,
            page_size=filters.page_size,
            total_pages=total_pages
        )

    def get_pending_tasks_by_card(self, card_id: int, limit: Optional[int] = None) -> List[CardTaskResponse]:
        """Busca tarefas pendentes de um card"""
        tasks = self.repository.get_pending_by_card(card_id, limit)
        return [self._build_response(t) for t in tasks]

    def get_overdue_tasks(self, user_id: Optional[int] = None) -> List[CardTaskResponse]:
        """Busca tarefas atrasadas"""
        tasks = self.repository.get_overdue_tasks(user_id)
        return [self._build_response(t) for t in tasks]

    def update_task(self, task_id: int, task_data: CardTaskUpdate, current_user: User) -> CardTaskResponse:
        """Atualiza uma tarefa"""
        task = self.repository.get_by_id(task_id)

        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tarefa {task_id} não encontrada"
            )

        # TODO: Verificar permissões (apenas o responsável ou admin pode editar)

        updated_task = self.repository.update(task_id, task_data)

        # Registra no histórico
        self._log_activity(
            card_id=task.card_id,
            user_id=current_user.id,
            activity_type="task_edited",
            description=f"Tarefa editada: {task.title}",
            metadata={"task_id": task.id, "task_title": task.title}
        )

        return self._build_response(updated_task)

    def toggle_complete(self, task_id: int, is_completed: bool, current_user: User) -> CardTaskResponse:
        """Marca/desmarca tarefa como concluída"""
        task = self.repository.get_by_id(task_id)

        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tarefa {task_id} não encontrada"
            )

        if is_completed:
            updated_task = self.repository.mark_as_completed(task_id)

            # Registra no histórico
            task_type_names = {
                "call": "Ligação",
                "meeting": "Reunião",
                "task": "Tarefa",
                "deadline": "Prazo",
                "email": "E-mail",
                "lunch": "Almoço",
                "other": "Outro"
            }
            task_type_label = task_type_names.get(task.task_type.value, "Atividade")

            self._log_activity(
                card_id=task.card_id,
                user_id=current_user.id,
                activity_type="task_completed",
                description=f"{task_type_label} concluída: {task.title}",
                metadata={
                    "task_id": task.id,
                    "task_type": task.task_type.value,
                    "task_title": task.title
                }
            )

            # TODO: Dar pontos de gamificação
        else:
            updated_task = self.repository.mark_as_pending(task_id)

            # Registra no histórico a reabertura
            self._log_activity(
                card_id=task.card_id,
                user_id=current_user.id,
                activity_type="task_reopened",
                description=f"Tarefa reaberta: {task.title}",
                metadata={"task_id": task.id, "task_title": task.title}
            )

        return self._build_response(updated_task)

    def delete_task(self, task_id: int, current_user: User) -> dict:
        """Deleta uma tarefa"""
        task = self.repository.get_by_id(task_id)

        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tarefa {task_id} não encontrada"
            )

        # TODO: Verificar permissões

        # Salva informações antes de deletar para o histórico
        card_id = task.card_id
        task_title = task.title

        success = self.repository.delete(task_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao deletar tarefa"
            )

        # Registra no histórico
        self._log_activity(
            card_id=card_id,
            user_id=current_user.id,
            activity_type="task_deleted",
            description=f"Tarefa deletada: {task_title}",
            metadata={"task_id": task_id, "task_title": task_title}
        )

        return {"message": "Tarefa deletada com sucesso"}

    def get_task_counts(self, card_id: int) -> dict:
        """Retorna contadores de tarefas de um card"""
        return self.repository.count_by_card(card_id)

    def _build_response(self, task: CardTask) -> CardTaskResponse:
        """Constrói o schema de resposta a partir do modelo"""
        response_data = {
            "id": task.id,
            "card_id": task.card_id,
            "assigned_to_id": task.assigned_to_id,
            "title": task.title,
            "description": task.description,
            "task_type": task.task_type.value if hasattr(task.task_type, 'value') else task.task_type,
            "priority": task.priority.value if hasattr(task.priority, 'value') else task.priority,
            "due_date": task.due_date,
            "duration_minutes": task.duration_minutes,
            "location": task.location,
            "video_link": task.video_link,
            "notes": task.notes,
            "contact_name": task.contact_name,
            "status": task.status.value if hasattr(task.status, 'value') else task.status,
            "is_completed": task.is_completed,
            "completed_at": task.completed_at,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "is_overdue": task.is_overdue
        }

        # Adiciona nome do responsável se disponível
        if hasattr(task, 'assigned_to') and task.assigned_to:
            response_data["assigned_to_name"] = task.assigned_to.name

        return CardTaskResponse(**response_data)
