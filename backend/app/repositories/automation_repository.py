"""
Automation Repository - Acesso a dados de automações.
Gerencia automações e suas execuções.
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.automation import Automation
from app.models.automation_execution import AutomationExecution
from app.schemas.automation import AutomationCreate, AutomationUpdate, AutomationExecutionCreate


class AutomationRepository:
    """
    Repository para operações de automações.
    """

    def __init__(self, db: Session):
        self.db = db

    # ========== AUTOMATIONS ==========

    def create(self, automation_data: AutomationCreate) -> Automation:
        """
        Cria uma nova automação.

        Args:
            automation_data: Dados da automação

        Returns:
            Automation criada
        """
        # Converte actions para dict se for lista de objetos
        actions_dict = [action.model_dump() if hasattr(action, 'model_dump') else action
                       for action in automation_data.actions]

        automation = Automation(
            board_id=automation_data.board_id,
            name=automation_data.name,
            description=automation_data.description,
            automation_type=automation_data.automation_type,
            is_active=automation_data.is_active,
            priority=automation_data.priority,
            trigger_event=automation_data.trigger_event,
            trigger_conditions=automation_data.trigger_conditions,
            schedule_type=automation_data.schedule_type,
            scheduled_at=automation_data.scheduled_at,
            recurrence_pattern=automation_data.recurrence_pattern,
            actions=actions_dict,
            auto_disable_on_failures=automation_data.auto_disable_on_failures
        )

        self.db.add(automation)
        self.db.commit()
        self.db.refresh(automation)
        return automation

    def find_by_id(self, automation_id: int) -> Optional[Automation]:
        """
        Busca uma automação por ID.

        Args:
            automation_id: ID da automação

        Returns:
            Automation ou None
        """
        return self.db.query(Automation).filter(Automation.id == automation_id).first()

    def list_by_board(
        self,
        board_id: int,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        automation_type: Optional[str] = None
    ) -> List[Automation]:
        """
        Lista automações de um board.

        Args:
            board_id: ID do board
            skip: Paginação - offset
            limit: Paginação - limite
            is_active: Filtrar por status ativo
            automation_type: Filtrar por tipo

        Returns:
            Lista de Automation
        """
        query = self.db.query(Automation).filter(Automation.board_id == board_id)

        if is_active is not None:
            query = query.filter(Automation.is_active == is_active)

        if automation_type:
            query = query.filter(Automation.automation_type == automation_type)

        return query.order_by(Automation.priority.desc(), Automation.created_at.desc()).offset(skip).limit(limit).all()

    def count_by_board(
        self,
        board_id: int,
        is_active: Optional[bool] = None,
        automation_type: Optional[str] = None
    ) -> int:
        """
        Conta automações de um board.

        Args:
            board_id: ID do board
            is_active: Filtrar por status ativo
            automation_type: Filtrar por tipo

        Returns:
            Total de automações
        """
        query = self.db.query(Automation).filter(Automation.board_id == board_id)

        if is_active is not None:
            query = query.filter(Automation.is_active == is_active)

        if automation_type:
            query = query.filter(Automation.automation_type == automation_type)

        return query.count()

    def update(self, automation: Automation, automation_data: AutomationUpdate) -> Automation:
        """
        Atualiza uma automação.

        Args:
            automation: Automação a atualizar
            automation_data: Dados de atualização

        Returns:
            Automation atualizada
        """
        update_data = automation_data.model_dump(exclude_unset=True)

        # Converte actions para dict se estiver presente
        if 'actions' in update_data and update_data['actions']:
            update_data['actions'] = [
                action.model_dump() if hasattr(action, 'model_dump') else action
                for action in update_data['actions']
            ]

        for field, value in update_data.items():
            setattr(automation, field, value)

        self.db.commit()
        self.db.refresh(automation)
        return automation

    def delete(self, automation: Automation) -> None:
        """
        Deleta uma automação.

        Args:
            automation: Automação a deletar
        """
        self.db.delete(automation)
        self.db.commit()

    def increment_execution_count(self, automation: Automation) -> None:
        """
        Incrementa contador de execuções.

        Args:
            automation: Automação
        """
        automation.execution_count += 1
        automation.last_run_at = datetime.utcnow()
        self.db.commit()

    def increment_failure_count(self, automation: Automation) -> None:
        """
        Incrementa contador de falhas e desabilita se atingir limite.

        Args:
            automation: Automação
        """
        automation.failure_count += 1

        # Auto-desabilita se atingir limite
        if automation.failure_count >= automation.auto_disable_on_failures:
            automation.is_active = False

        self.db.commit()

    def update_next_run(self, automation: Automation, next_run_at: datetime) -> None:
        """
        Atualiza próxima execução agendada.

        Args:
            automation: Automação
            next_run_at: Data/hora da próxima execução
        """
        automation.next_run_at = next_run_at
        self.db.commit()

    def find_scheduled_to_run(self, current_time: datetime) -> List[Automation]:
        """
        Busca automações agendadas prontas para executar.

        Args:
            current_time: Data/hora atual

        Returns:
            Lista de automações
        """
        return self.db.query(Automation).filter(
            and_(
                Automation.automation_type == "scheduled",
                Automation.is_active == True,
                Automation.next_run_at <= current_time
            )
        ).all()

    def find_by_trigger_event(
        self,
        board_id: int,
        trigger_event: str
    ) -> List[Automation]:
        """
        Busca automações ativas por evento de trigger.

        Args:
            board_id: ID do board
            trigger_event: Tipo de evento

        Returns:
            Lista de automações ordenadas por prioridade
        """
        return self.db.query(Automation).filter(
            and_(
                Automation.board_id == board_id,
                Automation.automation_type == "trigger",
                Automation.trigger_event == trigger_event,
                Automation.is_active == True
            )
        ).order_by(Automation.priority.desc()).all()

    # ========== EXECUTIONS ==========

    def create_execution(self, execution_data: AutomationExecutionCreate) -> AutomationExecution:
        """
        Cria um registro de execução.

        Args:
            execution_data: Dados da execução

        Returns:
            AutomationExecution criada
        """
        execution = AutomationExecution(**execution_data.model_dump())
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)
        return execution

    def find_execution_by_id(self, execution_id: int) -> Optional[AutomationExecution]:
        """
        Busca uma execução por ID.

        Args:
            execution_id: ID da execução

        Returns:
            AutomationExecution ou None
        """
        return self.db.query(AutomationExecution).filter(
            AutomationExecution.id == execution_id
        ).first()

    def update_execution_status(
        self,
        execution: AutomationExecution,
        status: str,
        error_message: Optional[str] = None,
        error_stack: Optional[str] = None
    ) -> AutomationExecution:
        """
        Atualiza status de uma execução.

        Args:
            execution: Execução
            status: Novo status
            error_message: Mensagem de erro (opcional)
            error_stack: Stack trace do erro (opcional)

        Returns:
            AutomationExecution atualizada
        """
        execution.status = status
        execution.completed_at = datetime.utcnow()

        # Calcula duração em milissegundos
        if execution.started_at:
            duration = (execution.completed_at - execution.started_at).total_seconds() * 1000
            execution.duration_ms = duration

        if error_message:
            execution.error_message = error_message
        if error_stack:
            execution.error_stack = error_stack

        self.db.commit()
        self.db.refresh(execution)
        return execution

    def list_executions_by_automation(
        self,
        automation_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[AutomationExecution]:
        """
        Lista execuções de uma automação.

        Args:
            automation_id: ID da automação
            skip: Paginação - offset
            limit: Paginação - limite
            status: Filtrar por status

        Returns:
            Lista de AutomationExecution
        """
        query = self.db.query(AutomationExecution).filter(
            AutomationExecution.automation_id == automation_id
        )

        if status:
            query = query.filter(AutomationExecution.status == status)

        return query.order_by(AutomationExecution.started_at.desc()).offset(skip).limit(limit).all()

    def count_executions_by_automation(
        self,
        automation_id: int,
        status: Optional[str] = None
    ) -> int:
        """
        Conta execuções de uma automação.

        Args:
            automation_id: ID da automação
            status: Filtrar por status

        Returns:
            Total de execuções
        """
        query = self.db.query(AutomationExecution).filter(
            AutomationExecution.automation_id == automation_id
        )

        if status:
            query = query.filter(AutomationExecution.status == status)

        return query.count()
