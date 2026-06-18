"""
Repository para CardTask - Gerenciamento de tarefas/atividades dos cards.
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import datetime, timedelta

from app.models.card_task import CardTask
from app.models.card import Card
from app.schemas.card_task import CardTaskCreate, CardTaskUpdate, CardTaskFilters


class CardTaskRepository:
    """Repository para operações de CardTask"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, task_data: CardTaskCreate) -> CardTask:
        """Cria uma nova tarefa"""
        task = CardTask(**task_data.model_dump())
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_by_id(self, task_id: int) -> Optional[CardTask]:
        """Busca uma tarefa por ID"""
        return self.db.query(CardTask).filter(CardTask.id == task_id).first()

    def get_by_id_with_relations(self, task_id: int) -> Optional[CardTask]:
        """Busca uma tarefa por ID com relacionamentos carregados"""
        return (
            self.db.query(CardTask)
            .options(
                joinedload(CardTask.assigned_to),
                joinedload(CardTask.card)
            )
            .filter(CardTask.id == task_id)
            .first()
        )

    def list_by_filters(self, filters: CardTaskFilters) -> tuple[List[CardTask], int]:
        """
        Lista tarefas com filtros e paginação.
        Carrega os relacionamentos assigned_to, card e card.client em uma única query
        para evitar N+1 e popular campos como card_title e card_client_name.
        Retorna (lista_de_tarefas, total_count)
        """
        query = self.db.query(CardTask).options(
            joinedload(CardTask.assigned_to),
            joinedload(CardTask.card).joinedload(Card.client),
        )

        # Aplicar filtros
        if filters.card_id is not None:
            query = query.filter(CardTask.card_id == filters.card_id)

        if filters.assigned_to_id is not None:
            query = query.filter(CardTask.assigned_to_id == filters.assigned_to_id)

        if getattr(filters, "assignee_role", None):
            query = query.filter(CardTask.assigned_to_id.in_(self._user_ids_for_role(filters.assignee_role)))

        if filters.task_type is not None:
            query = query.filter(CardTask.task_type == filters.task_type)

        if filters.priority is not None:
            query = query.filter(CardTask.priority == filters.priority)

        if filters.is_completed is not None:
            query = query.filter(CardTask.is_completed == filters.is_completed)

        if filters.due_date_start is not None:
            # Remove timezone info para comparar com datetimes naive do banco
            dt_start = filters.due_date_start.replace(tzinfo=None) if filters.due_date_start.tzinfo else filters.due_date_start
            query = query.filter(CardTask.due_date >= dt_start)

        if filters.due_date_end is not None:
            dt_end = filters.due_date_end.replace(tzinfo=None) if filters.due_date_end.tzinfo else filters.due_date_end
            query = query.filter(CardTask.due_date <= dt_end)

        # Conta total
        total = query.count()

        # Ordenação padrão: por data de vencimento (mais próxima primeiro), depois por prioridade
        query = query.order_by(
            CardTask.is_completed.asc(),  # Não concluídas primeiro
            CardTask.due_date.asc().nullslast(),  # Por data
            CardTask.priority.desc()  # Por prioridade (urgent > high > normal)
        )

        # Paginação
        offset = (filters.page - 1) * filters.page_size
        tasks = query.offset(offset).limit(filters.page_size).all()

        return tasks, total

    def get_pending_by_card(self, card_id: int, limit: Optional[int] = None) -> List[CardTask]:
        """Busca tarefas pendentes de um card"""
        query = (
            self.db.query(CardTask)
            .filter(
                and_(
                    CardTask.card_id == card_id,
                    CardTask.is_completed == False
                )
            )
            .order_by(
                CardTask.due_date.asc().nullslast(),
                CardTask.priority.desc()
            )
        )

        if limit:
            query = query.limit(limit)

        return query.all()

    def _user_ids_for_role(self, role_name: str):
        """Subquery com os IDs de usuários cujo papel (role.name) é o informado."""
        from app.models.user import User
        from app.models.role import Role
        return (
            self.db.query(User.id)
            .join(Role, User.role_id == Role.id)
            .filter(Role.name == role_name)
        )

    def get_overdue_tasks(self, user_id: Optional[int] = None, assignee_role: Optional[str] = None) -> List[CardTask]:
        """Busca tarefas atrasadas"""
        now = datetime.utcnow()
        query = self.db.query(CardTask).filter(
            and_(
                CardTask.is_completed == False,
                CardTask.due_date < now
            )
        )

        if user_id:
            query = query.filter(CardTask.assigned_to_id == user_id)

        if assignee_role:
            query = query.filter(CardTask.assigned_to_id.in_(self._user_ids_for_role(assignee_role)))

        return query.order_by(CardTask.due_date.asc()).all()

    def get_tasks_due_soon(self, hours_ahead: int = 24) -> List[CardTask]:
        """
        Busca tarefas pendentes que vencerão dentro de N horas.
        Usada pelo job do scheduler para enviar notificações preventivas.

        Args:
            hours_ahead: Janela de tempo em horas para considerar "próximo do vencimento"

        Returns:
            Lista de tarefas com assigned_to_id definido e due_date dentro da janela
        """
        now = datetime.utcnow()
        limit = now + timedelta(hours=hours_ahead)

        return self.db.query(CardTask).filter(
            CardTask.is_completed == False,
            CardTask.due_date.isnot(None),
            CardTask.due_date >= now,
            CardTask.due_date <= limit,
            CardTask.assigned_to_id.isnot(None)
        ).all()

    def update(self, task_id: int, task_data: CardTaskUpdate) -> Optional[CardTask]:
        """Atualiza uma tarefa"""
        task = self.get_by_id(task_id)
        if not task:
            return None

        update_data = task_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)

        self.db.commit()
        self.db.refresh(task)
        return task

    def mark_as_completed(self, task_id: int, is_valid: bool = True, notes: str = None) -> Optional[CardTask]:
        """Marca uma tarefa como concluída. is_valid=True para válida, False para não válida."""
        task = self.get_by_id(task_id)
        if not task:
            return None

        task.mark_as_completed(is_valid=is_valid)
        if notes is not None:
            task.notes = notes
        self.db.commit()
        self.db.refresh(task)
        return task

    def mark_as_pending(self, task_id: int) -> Optional[CardTask]:
        """Marca uma tarefa como pendente"""
        task = self.get_by_id(task_id)
        if not task:
            return None

        task.mark_as_pending()
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, task_id: int) -> bool:
        """Deleta uma tarefa"""
        task = self.get_by_id(task_id)
        if not task:
            return False

        self.db.delete(task)
        self.db.commit()
        return True

    def count_by_card(self, card_id: int) -> dict:
        """Conta tarefas por status em um card"""
        total = self.db.query(CardTask).filter(CardTask.card_id == card_id).count()
        pending = self.db.query(CardTask).filter(
            and_(CardTask.card_id == card_id, CardTask.is_completed == False)
        ).count()
        completed = self.db.query(CardTask).filter(
            and_(CardTask.card_id == card_id, CardTask.is_completed == True)
        ).count()

        return {
            "total": total,
            "pending": pending,
            "completed": completed
        }
