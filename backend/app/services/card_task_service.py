"""
Service para CardTask - Lógica de negócio para tarefas/atividades dos cards.
"""
from sqlalchemy.orm import Session
from typing import Optional, List
from fastapi import HTTPException, status

from app.repositories.card_task_repository import CardTaskRepository
from app.repositories.activity_repository import ActivityRepository
from app.repositories.notification_repository import NotificationRepository
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
        self.notification_repo = NotificationRepository(db)

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

    def _check_task_permission(self, task: CardTask, current_user: User) -> None:
        """
        Verifica se o usuário tem permissão para editar ou deletar a tarefa.
        Admin e manager sempre podem. Salesperson/SDR apenas se forem o responsável.
        """
        role_name = current_user.role.name if current_user.role else ""
        is_privileged = role_name in ("admin", "manager")
        is_assigned = task.assigned_to_id == current_user.id

        if not is_privileged and not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o responsável pela tarefa, gerentes e administradores podem modificá-la."
            )

    def _get_board_type_for_task(self, task: CardTask) -> Optional[str]:
        """
        Obtém o board_type do board ao qual o card da tarefa pertence.
        Navega pelo relacionamento: task → card → list → board.

        Args:
            task: Instância de CardTask

        Returns:
            board_type (ex: 'prospecting', 'acquisition') ou None
        """
        try:
            from app.models.card import Card
            from app.models.list import List
            from app.models.board import Board

            card = self.db.query(Card).filter(Card.id == task.card_id).first()
            if not card:
                return None
            list_obj = self.db.query(List).filter(List.id == card.list_id).first()
            if not list_obj:
                return None
            board = self.db.query(Board).filter(Board.id == list_obj.board_id).first()
            return board.board_type if board else None
        except Exception as e:
            print(f"[GAMIFICATION] Erro ao obter board_type para tarefa: {e}")
            return None

    def create_task(self, task_data: CardTaskCreate, current_user: User) -> CardTaskResponse:
        """Cria uma nova tarefa"""
        # TODO: Verificar se o card existe e se o usuário tem permissão

        # Se não foi especificado assigned_to_id, atribui ao usuário atual
        if task_data.assigned_to_id is None:
            task_data.assigned_to_id = current_user.id

        task = self.repository.create(task_data)

        # Salva quem criou a tarefa (necessário para comissão de gamificação)
        task.created_by_id = current_user.id
        self.db.commit()

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
                "task_description": task_data.description or "",
                "due_date": str(task_data.due_date) if task_data.due_date else None
            }
        )

        # Gamificação: pontua por reunião agendada no board Prospecção
        # Quem recebe os pontos é o criador da tarefa (current_user), não o responsável
        task_type_value = task_data.task_type if isinstance(task_data.task_type, str) else task_data.task_type.value
        if task_type_value == "meeting":
            try:
                board_type = self._get_board_type_for_task(task)
                if board_type == "prospecting":
                    from app.services.gamification_service import GamificationService
                    gamification_service = GamificationService(self.db)
                    gamification_service.award_points(
                        user_id=current_user.id,
                        action_type="meeting_created",
                        board_type="prospecting",
                        description=f"Reunião agendada: '{task.title}'",
                        related_entity_type="CardTask",
                        related_entity_id=task.id,
                    )
            except Exception as e:
                print(f"[GAMIFICATION] Erro ao pontuar meeting_created: {e}")

        # Notifica o responsável se for diferente de quem criou a tarefa
        if task.assigned_to_id and task.assigned_to_id != current_user.id:
            try:
                self.notification_repo.create({
                    "user_id": task.assigned_to_id,
                    "notification_type": "task_assigned",
                    "title": "Nova tarefa atribuída a você",
                    "message": f"{current_user.name} atribuiu a você: \"{task.title}\"",
                    "icon": "check-square",
                    "color": "info",
                    "notification_metadata": {
                        "task_id": task.id,
                        "card_id": task.card_id,
                        "assigned_by_id": current_user.id,
                        "assigned_by_name": current_user.name
                    }
                })
            except Exception as e:
                print(f"[NOTIFICATION] Erro ao notificar tarefa atribuída: {e}")

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

        # Verifica permissão: admin/manager sempre podem; salesperson/SDR apenas se forem o responsável
        self._check_task_permission(task, current_user)

        # Captura o responsável anterior para detectar reatribuição
        old_assigned_to_id = task.assigned_to_id

        updated_task = self.repository.update(task_id, task_data)

        # Registra no histórico
        self._log_activity(
            card_id=task.card_id,
            user_id=current_user.id,
            activity_type="task_edited",
            description=f"Tarefa editada: {updated_task.title}",
            metadata={
                "task_id": task.id,
                "task_title": updated_task.title,
                "task_description": updated_task.description or "",
            }
        )

        # Notifica o novo responsável se o assigned_to mudou e é diferente de quem editou
        new_assigned_to_id = task_data.assigned_to_id if task_data.assigned_to_id is not None else old_assigned_to_id
        if new_assigned_to_id and new_assigned_to_id != old_assigned_to_id and new_assigned_to_id != current_user.id:
            try:
                self.notification_repo.create({
                    "user_id": new_assigned_to_id,
                    "notification_type": "task_assigned",
                    "title": "Nova tarefa atribuída a você",
                    "message": f"{current_user.name} atribuiu a você: \"{updated_task.title}\"",
                    "icon": "check-square",
                    "color": "info",
                    "notification_metadata": {
                        "task_id": updated_task.id,
                        "card_id": updated_task.card_id,
                        "assigned_by_id": current_user.id,
                        "assigned_by_name": current_user.name
                    }
                })
            except Exception as e:
                print(f"[NOTIFICATION] Erro ao notificar reatribuição de tarefa: {e}")

        return self._build_response(updated_task)

    def toggle_complete(self, task_id: int, is_completed: bool, current_user: User, is_valid: bool = True, notes: str = None) -> CardTaskResponse:
        """Marca/desmarca tarefa como concluída. is_valid indica se foi válida ou apenas uma tentativa."""
        task = self.repository.get_by_id(task_id)

        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tarefa {task_id} não encontrada"
            )

        if is_completed:
            updated_task = self.repository.mark_as_completed(task_id, is_valid=is_valid, notes=notes)

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
                    "task_title": task.title,
                    # Inclui descrição e anotações para exibição no histórico
                    "task_description": task.description or "",
                    "task_notes": task.notes or "",
                }
            )

            # Gamificação: pontua apenas quando a conclusão é válida
            try:
                if not is_valid:
                    raise StopIteration  # pula gamificação silenciosamente
                board_type = self._get_board_type_for_task(task)
                if board_type:
                    from app.services.gamification_service import GamificationService
                    gamification_service = GamificationService(self.db)

                    task_type_value = task.task_type.value if hasattr(task.task_type, "value") else task.task_type

                    if task_type_value == "meeting" and board_type == "acquisition":
                        # Reunião concluída no board Aquisição — verifica comissão para SDR
                        created_by_id = task.created_by_id
                        if (
                            created_by_id
                            and created_by_id != current_user.id
                        ):
                            # Verifica se quem criou é SDR
                            sdr_user = self.db.query(User).filter(User.id == created_by_id).first()
                            if sdr_user and sdr_user.role and sdr_user.role.name == "sdr":
                                gamification_service.award_points_with_commission(
                                    primary_user_id=current_user.id,
                                    commission_user_id=created_by_id,
                                    action_type="meeting_completed",
                                    board_type="acquisition",
                                    commission_ratio="1/3",
                                    description=f"Reunião concluída: '{task.title}'",
                                    related_entity_type="CardTask",
                                    related_entity_id=task.id,
                                )
                            else:
                                gamification_service.award_points(
                                    user_id=current_user.id,
                                    action_type="meeting_completed",
                                    board_type="acquisition",
                                    description=f"Reunião concluída: '{task.title}'",
                                    related_entity_type="CardTask",
                                    related_entity_id=task.id,
                                )
                        else:
                            gamification_service.award_points(
                                user_id=current_user.id,
                                action_type="meeting_completed",
                                board_type="acquisition",
                                description=f"Reunião concluída: '{task.title}'",
                                related_entity_type="CardTask",
                                related_entity_id=task.id,
                            )

                    elif task_type_value == "call":
                        # Ligação concluída (pontua apenas em Prospecção)
                        gamification_service.award_points(
                            user_id=current_user.id,
                            action_type="call_completed",
                            board_type=board_type,
                            description=f"Ligação concluída: '{task.title}'",
                            related_entity_type="CardTask",
                            related_entity_id=task.id,
                        )

                    elif task_type_value == "follow_up":
                        # Follow-up concluído (pontua em qualquer board configurado)
                        gamification_service.award_points(
                            user_id=current_user.id,
                            action_type="followup_completed",
                            board_type=board_type,
                            description=f"Follow-up concluído: '{task.title}'",
                            related_entity_type="CardTask",
                            related_entity_id=task.id,
                        )

                    else:
                        # Tarefa genérica concluída
                        gamification_service.award_points(
                            user_id=current_user.id,
                            action_type="task_completed",
                            board_type=board_type,
                            description=f"Tarefa concluída: '{task.title}'",
                            related_entity_type="CardTask",
                            related_entity_id=task.id,
                        )
            except StopIteration:
                pass  # conclusão não válida — sem pontuação
            except Exception as e:
                print(f"[GAMIFICATION] Erro ao pontuar conclusão de tarefa: {e}")

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

        # Verifica permissão: admin/manager sempre podem; salesperson/SDR apenas se forem o responsável
        self._check_task_permission(task, current_user)

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
            "is_noshow": task.is_noshow if hasattr(task, 'is_noshow') and task.is_noshow else False,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "is_overdue": task.is_overdue,
            # Microsoft Teams
            "teams_meeting_id": task.teams_meeting_id if hasattr(task, 'teams_meeting_id') else None,
            "teams_join_url": task.teams_join_url if hasattr(task, 'teams_join_url') else None,
            "transcript_raw": task.transcript_raw if hasattr(task, 'transcript_raw') else None,
            "transcript_analysis": task.transcript_analysis if hasattr(task, 'transcript_analysis') else None,
        }

        # Adiciona nome do responsável se disponível
        if hasattr(task, 'assigned_to') and task.assigned_to:
            response_data["assigned_to_name"] = task.assigned_to.name

        # Adiciona título e nome do cliente do card (útil na visão global do calendário)
        if hasattr(task, 'card') and task.card:
            response_data["card_title"] = task.card.title
            if task.card.client:
                response_data["card_client_name"] = task.card.client.name

        return CardTaskResponse(**response_data)
