"""
Repository para CardTask - Gerenciamento de tarefas/atividades dos cards.
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import datetime

from app.models.card_task import CardTask
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
        Retorna (lista_de_tarefas, total_count)
        """
        query = self.db.query(CardTask)

        # Aplicar filtros
        if filters.card_id is not None:
            query = query.filter(CardTask.card_id == filters.card_id)

        if filters.assigned_to_id is not None:
            query = query.filter(CardTask.assigned_to_id == filters.assigned_to_id)

        if filters.task_type is not None:
            query = query.filter(CardTask.task_type == filters.task_type)

        if filters.priority is not None:
            query = query.filter(CardTask.priority == filters.priority)

        if filters.is_completed is not None:
            query = query.filter(CardTask.is_completed == filters.is_completed)

        if filters.due_date_start is not None:
            query = query.filter(CardTask.due_date >= filters.due_date_start)

        if filters.due_date_end is not None:
            query = query.filter(CardTask.due_date <= filters.due_date_end)

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

    def get_overdue_tasks(self, user_id: Optional[int] = None) -> List[CardTask]:
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

        return query.order_by(CardTask.due_date.asc()).all()

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

    def mark_as_completed(self, task_id: int) -> Optional[CardTask]:
        """Marca uma tarefa como concluída"""
        task = self.get_by_id(task_id)
        if not task:
            return None

        task.mark_as_completed()
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
