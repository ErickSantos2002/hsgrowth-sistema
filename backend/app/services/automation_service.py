"""
Automation Service - Lógica de negócio de automações.
Gerencia criação, execução e validação de automações.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import traceback

from app.repositories.automation_repository import AutomationRepository
from app.repositories.board_repository import BoardRepository
from app.repositories.card_repository import CardRepository
from app.repositories.list_repository import ListRepository
from app.schemas.automation import (
    AutomationCreate,
    AutomationUpdate,
    AutomationResponse,
    AutomationListResponse,
    AutomationExecutionCreate,
    AutomationExecutionResponse,
    AutomationExecutionListResponse,
    ExecutionStatus
)
from app.models.user import User
from app.models.automation import Automation
from app.models.card import Card


class AutomationService:
    """
    Service para lógica de negócio de automações.
    """

    MAX_AUTOMATIONS_PER_ACCOUNT = 50

    def __init__(self, db: Session):
        self.db = db
        self.repository = AutomationRepository(db)
        self.board_repository = BoardRepository(db)
        self.card_repository = CardRepository(db)
        self.list_repository = ListRepository(db)

    # ========== CRUD DE AUTOMAÇÕES ==========

    def create_automation(
        self,
        automation_data: AutomationCreate,
        current_user: User
    ) -> AutomationResponse:
        """
        Cria uma nova automação.

        Args:
            automation_data: Dados da automação
            current_user: Usuário autenticado

        Returns:
            AutomationResponse
        """
        # Verifica se o board existe
        board = self.board_repository.find_by_id(automation_data.board_id)
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        # Valida configuração baseada no tipo
        self._validate_automation_config(automation_data)

        # Cria a automação
        automation = self.repository.create(automation_data)

        # Calcula próxima execução se for scheduled
        if automation.automation_type == "scheduled":
            next_run = self._calculate_next_run(automation)
            if next_run:
                self.repository.update_next_run(automation, next_run)

        return self._to_response(automation)

    def get_automation(self, automation_id: int) -> AutomationResponse:
        """
        Busca uma automação por ID.

        Args:
            automation_id: ID da automação

        Returns:
            AutomationResponse
        """
        automation = self.repository.find_by_id(automation_id)

        if not automation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Automação não encontrada"
            )

        return self._to_response(automation)

    def list_automations(
        self,
        board_id: int,
        page: int = 1,
        page_size: int = 50,
        is_active: Optional[bool] = None,
        automation_type: Optional[str] = None
    ) -> AutomationListResponse:
        """
        Lista automações de um board.

        Args:
            board_id: ID do board
            page: Número da página
            page_size: Tamanho da página
            is_active: Filtrar por status ativo
            automation_type: Filtrar por tipo

        Returns:
            AutomationListResponse
        """
        # Verifica se o board existe
        board = self.board_repository.find_by_id(board_id)
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        skip = (page - 1) * page_size
        automations = self.repository.list_by_board(
            board_id, skip, page_size, is_active, automation_type
        )
        total = self.repository.count_by_board(board_id, is_active, automation_type)
        total_pages = (total + page_size - 1) // page_size

        automations_response = [self._to_response(a) for a in automations]

        return AutomationListResponse(
            automations=automations_response,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def update_automation(
        self,
        automation_id: int,
        automation_data: AutomationUpdate,
        current_user: User
    ) -> AutomationResponse:
        """
        Atualiza uma automação.

        Args:
            automation_id: ID da automação
            automation_data: Dados de atualização
            current_user: Usuário autenticado

        Returns:
            AutomationResponse
        """
        automation = self.repository.find_by_id(automation_id)

        if not automation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Automação não encontrada"
            )

        # Atualiza
        updated_automation = self.repository.update(automation, automation_data)

        # Recalcula próxima execução se mudou configuração de scheduled
        if updated_automation.automation_type == "scheduled":
            if automation_data.scheduled_at or automation_data.recurrence_pattern:
                next_run = self._calculate_next_run(updated_automation)
                if next_run:
                    self.repository.update_next_run(updated_automation, next_run)

        return self._to_response(updated_automation)

    def delete_automation(self, automation_id: int, current_user: User) -> None:
        """
        Deleta uma automação.

        Args:
            automation_id: ID da automação
            current_user: Usuário autenticado
        """
        automation = self.repository.find_by_id(automation_id)

        if not automation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Automação não encontrada"
            )

        self.repository.delete(automation)

    # ========== EXECUÇÃO DE AUTOMAÇÕES ==========

    def execute_automation(
        self,
        automation_id: int,
        card_id: Optional[int] = None,
        triggered_by_id: Optional[int] = None,
        execution_data: Optional[Dict[str, Any]] = None
    ) -> AutomationExecutionResponse:
        """
        Executa uma automação.

        Args:
            automation_id: ID da automação
            card_id: ID do card (se aplicável)
            triggered_by_id: ID do usuário que disparou
            execution_data: Dados adicionais da execução

        Returns:
            AutomationExecutionResponse
        """
        automation = self.repository.find_by_id(automation_id)
        if not automation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Automação não encontrada"
            )

        # Cria registro de execução
        execution_create = AutomationExecutionCreate(
            automation_id=automation_id,
            card_id=card_id,
            triggered_by_id=triggered_by_id,
            status=ExecutionStatus.PENDING,
            execution_data=execution_data or {}
        )
        execution = self.repository.create_execution(execution_create)

        try:
            # Executa ações
            card = self.card_repository.find_by_id(card_id) if card_id else None
            self._execute_actions(automation, card, execution)

            # Marca como sucesso
            execution = self.repository.update_execution_status(execution, ExecutionStatus.SUCCESS)
            self.repository.increment_execution_count(automation)

            # Calcula próxima execução se for scheduled recurrent
            if automation.automation_type == "scheduled" and automation.schedule_type == "recurrent":
                next_run = self._calculate_next_run(automation)
                if next_run:
                    self.repository.update_next_run(automation, next_run)

        except Exception as e:
            # Marca como falha
            error_message = str(e)
            error_stack = traceback.format_exc()
            execution = self.repository.update_execution_status(
                execution,
                ExecutionStatus.FAILED,
                error_message,
                error_stack
            )
            self.repository.increment_failure_count(automation)

        return self._to_execution_response(execution)

    def process_trigger(
        self,
        board_id: int,
        trigger_event: str,
        card: Optional[Card],
        user: User,
        trigger_data: Optional[Dict[str, Any]] = None
    ) -> List[AutomationExecutionResponse]:
        """
        Processa triggers de automação.

        Args:
            board_id: ID do board
            trigger_event: Tipo de evento
            card: Card que disparou (opcional para triggers sem card como client_created)
            user: Usuário que disparou
            trigger_data: Dados do trigger

        Returns:
            Lista de execuções
        """
        # Busca automações ativas para este trigger
        automations = self.repository.find_by_trigger_event(board_id, trigger_event)

        executions = []
        for automation in automations:
            # Verifica condições
            if self._check_trigger_conditions(automation, card, trigger_data):
                # Executa
                execution = self.execute_automation(
                    automation.id,
                    card.id if card else None,
                    user.id,
                    trigger_data
                )
                executions.append(execution)

        return executions

    # ========== EXECUÇÕES ==========

    def list_executions(
        self,
        automation_id: int,
        page: int = 1,
        page_size: int = 50,
        status: Optional[str] = None
    ) -> AutomationExecutionListResponse:
        """
        Lista execuções de uma automação.

        Args:
            automation_id: ID da automação
            page: Número da página
            page_size: Tamanho da página
            status: Filtrar por status

        Returns:
            AutomationExecutionListResponse
        """
        # Verifica se a automação existe
        automation = self.repository.find_by_id(automation_id)
        if not automation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Automação não encontrada"
            )

        skip = (page - 1) * page_size
        executions = self.repository.list_executions_by_automation(
            automation_id, skip, page_size, status
        )
        total = self.repository.count_executions_by_automation(automation_id, status)
        total_pages = (total + page_size - 1) // page_size

        executions_response = [self._to_execution_response(e) for e in executions]

        return AutomationExecutionListResponse(
            executions=executions_response,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    # ========== MÉTODOS AUXILIARES ==========

    def _validate_automation_config(self, automation_data: AutomationCreate) -> None:
        """Valida configuração de automação."""
        if automation_data.automation_type == "trigger":
            if not automation_data.trigger_event:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="trigger_event é obrigatório para automações trigger"
                )
        elif automation_data.automation_type == "scheduled":
            if not automation_data.schedule_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="schedule_type é obrigatório para automações scheduled"
                )
            if automation_data.schedule_type == "once" and not automation_data.scheduled_at:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="scheduled_at é obrigatório para schedule_type=once"
                )
            if automation_data.schedule_type == "recurrent" and not automation_data.recurrence_pattern:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="recurrence_pattern é obrigatório para schedule_type=recurrent"
                )

    def _calculate_next_run(self, automation: Automation) -> Optional[datetime]:
        """Calcula próxima execução para automação scheduled."""
        if automation.schedule_type == "once":
            return automation.scheduled_at

        elif automation.schedule_type == "recurrent":
            now = datetime.utcnow()

            if automation.recurrence_pattern == "daily":
                return now + timedelta(days=1)
            elif automation.recurrence_pattern == "weekly":
                return now + timedelta(weeks=1)
            elif automation.recurrence_pattern == "monthly":
                return now + timedelta(days=30)  # Aproximado
            elif automation.recurrence_pattern == "annual":
                return now + timedelta(days=365)  # Aproximado

        return None

    def _check_trigger_conditions(
        self,
        automation: Automation,
        card: Card,
        trigger_data: Optional[Dict[str, Any]]
    ) -> bool:
        """
        Verifica se as condições do trigger foram atendidas.

        Args:
            automation: Automação
            card: Card
            trigger_data: Dados do trigger

        Returns:
            True se condições atendidas
        """
        if not automation.trigger_conditions:
            return True  # Sem condições, sempre executa

        conditions = automation.trigger_conditions

        # Verifica condição de from_list_id/to_list_id (para card_moved)
        if "from_list_id" in conditions and trigger_data:
            from_list_id_condition = conditions["from_list_id"]
            # Converte para int se for string
            if isinstance(from_list_id_condition, str):
                from_list_id_condition = int(from_list_id_condition)
            if trigger_data.get("from_list_id") != from_list_id_condition:
                return False

        if "to_list_id" in conditions:
            to_list_id_condition = conditions["to_list_id"]
            # Converte para int se for string
            if isinstance(to_list_id_condition, str):
                to_list_id_condition = int(to_list_id_condition)
            if card.list_id != to_list_id_condition:
                return False

        # Verifica condição de assigned_to_id
        if "assigned_to_id" in conditions:
            assigned_to_id_condition = conditions["assigned_to_id"]
            # Converte para int se for string
            if isinstance(assigned_to_id_condition, str):
                assigned_to_id_condition = int(assigned_to_id_condition)
            if card.assigned_to_id != assigned_to_id_condition:
                return False

        # Verifica condição de board_id
        if "board_id" in conditions:
            board_id_condition = conditions["board_id"]
            # Converte para int se for string
            if isinstance(board_id_condition, str):
                board_id_condition = int(board_id_condition)
            # Busca o board_id através da lista do card
            from app.models.list import List as BoardList
            card_list = self.db.query(BoardList).filter(BoardList.id == card.list_id).first()
            if card_list and card_list.board_id != board_id_condition:
                return False

        # Adicionar mais condições conforme necessário

        return True

    def _execute_actions(
        self,
        automation: Automation,
        card: Optional[Card],
        execution: Any
    ) -> None:
        """
        Executa ações da automação.

        Args:
            automation: Automação
            card: Card (se aplicável)
            execution: Registro de execução
        """
        for action in automation.actions:
            action_type = action.get("type")
            params = action.get("params", {})

            if action_type == "move_card" and card:
                target_list_id = params.get("target_list_id")
                if target_list_id:
                    self.card_repository.move_to_list(card, target_list_id)

            elif action_type == "assign_card" and card:
                user_id = params.get("user_id")
                if user_id:
                    self.card_repository.assign_to_user(card, user_id)

            elif action_type == "mark_won" and card:
                card.is_won = True
                card.won_at = datetime.utcnow()
                card.is_lost = False
                card.lost_at = None
                self.db.commit()

            elif action_type == "mark_lost" and card:
                card.is_lost = True
                card.lost_at = datetime.utcnow()
                card.is_won = False
                card.won_at = None
                self.db.commit()

            elif action_type == "assign_round_robin" and card:
                # Rodízio de vendedores
                self._assign_round_robin(automation, card)

            elif action_type == "assign_sdr_round_robin" and card:
                # Rodízio de SDRs
                self._assign_sdr_round_robin(automation, card)

            elif action_type == "update_client_field" and card:
                # Atualiza campo do cliente vinculado ao card
                self._update_client_field(card, params)

            # Outras ações podem ser implementadas conforme necessário

    def _assign_round_robin(self, automation: Automation, card: Card) -> None:
        """
        Atribui o card ao próximo vendedor em sistema de rodízio.

        Args:
            automation: Automação que contém o estado do rodízio
            card: Card a ser atribuído
        """
        # REGRA: Não atribui vendedor se o card já tem um vendedor
        if card.assigned_to_id:
            return

        from app.models.user import User
        from app.models.role import Role

        # Verifica se há user_ids específicos nos params da ação
        action_params = {}
        for action in automation.actions:
            if action.get("type") == "assign_round_robin":
                action_params = action.get("params", {})
                break

        user_ids = action_params.get("user_ids", [])

        if user_ids:
            # Usa apenas os vendedores especificados
            # Converte strings para int se necessário
            user_ids_int = [int(uid) if isinstance(uid, str) else uid for uid in user_ids]

            salespeople = self.db.query(User).filter(
                User.id.in_(user_ids_int),
                User.is_active == True,
                User.is_deleted == False
            ).order_by(User.id).all()
        else:
            # Busca todos os vendedores ativos (comportamento padrão)
            salesperson_role = self.db.query(Role).filter(
                Role.name.ilike("salesperson")
            ).first()

            if not salesperson_role:
                return  # Sem role de vendedor configurado

            salespeople = self.db.query(User).filter(
                User.role_id == salesperson_role.id,
                User.is_active == True,
                User.is_deleted == False
            ).order_by(User.id).all()

        if not salespeople:
            return  # Sem vendedores disponíveis

        # Pega o estado do rodízio
        state = automation.state or {}
        last_user_id = state.get("round_robin_last_user_id")

        # Encontra o próximo vendedor
        next_user = None
        if last_user_id:
            # Encontra o índice do último vendedor usado
            last_index = -1
            for i, user in enumerate(salespeople):
                if user.id == last_user_id:
                    last_index = i
                    break

            # Pega o próximo (circular)
            if last_index >= 0:
                next_index = (last_index + 1) % len(salespeople)
                next_user = salespeople[next_index]

        # Se não encontrou ou é a primeira vez, usa o primeiro da lista
        if not next_user:
            next_user = salespeople[0]

        # Atribui o card ao vendedor
        card.assigned_to_id = next_user.id
        self.db.commit()

        # Atualiza o estado da automação
        from sqlalchemy.orm.attributes import flag_modified

        if automation.state is None:
            automation.state = {}

        automation.state["round_robin_last_user_id"] = next_user.id

        # Marca o campo como modificado para o SQLAlchemy detectar a mudança
        flag_modified(automation, "state")
        self.db.commit()

    def _assign_sdr_round_robin(self, automation: Automation, card: Card) -> None:
        """
        Atribui o card ao próximo SDR em sistema de rodízio.

        Args:
            automation: Automação que contém o estado do rodízio
            card: Card a ser atribuído
        """
        # REGRA: Não atribui SDR se o card já tem um SDR
        if card.sdr_id:
            return

        from app.models.user import User
        from app.models.role import Role

        # Verifica se há user_ids específicos nos params da ação
        action_params = {}
        for action in automation.actions:
            if action.get("type") == "assign_sdr_round_robin":
                action_params = action.get("params", {})
                break

        user_ids = action_params.get("user_ids", [])

        if user_ids:
            # Usa apenas os SDRs especificados
            # Converte strings para int se necessário
            user_ids_int = [int(uid) if isinstance(uid, str) else uid for uid in user_ids]

            sdrs = self.db.query(User).filter(
                User.id.in_(user_ids_int),
                User.is_active == True,
                User.is_deleted == False
            ).order_by(User.id).all()
        else:
            # Busca todos os SDRs ativos (comportamento padrão)
            sdr_role = self.db.query(Role).filter(
                Role.name.ilike("sdr")
            ).first()

            if not sdr_role:
                return  # Sem role de SDR configurado

            sdrs = self.db.query(User).filter(
                User.role_id == sdr_role.id,
                User.is_active == True,
                User.is_deleted == False
            ).order_by(User.id).all()

        if not sdrs:
            return  # Sem SDRs disponíveis

        # Pega o estado do rodízio (usa chave diferente para SDRs)
        state = automation.state or {}
        last_sdr_id = state.get("round_robin_last_sdr_id")

        # Encontra o próximo SDR
        next_sdr = None
        if last_sdr_id:
            # Encontra o índice do último SDR usado
            last_index = -1
            for i, user in enumerate(sdrs):
                if user.id == last_sdr_id:
                    last_index = i
                    break

            # Pega o próximo (circular)
            if last_index >= 0:
                next_index = (last_index + 1) % len(sdrs)
                next_sdr = sdrs[next_index]

        # Se não encontrou ou é a primeira vez, usa o primeiro da lista
        if not next_sdr:
            next_sdr = sdrs[0]

        # Atribui o card ao SDR
        card.sdr_id = next_sdr.id
        self.db.commit()

        # Atualiza o estado da automação
        from sqlalchemy.orm.attributes import flag_modified

        if automation.state is None:
            automation.state = {}

        automation.state["round_robin_last_sdr_id"] = next_sdr.id

        # Marca o campo como modificado para o SQLAlchemy detectar a mudança
        flag_modified(automation, "state")
        self.db.commit()

    def _update_client_field(self, card: Card, params: dict) -> None:
        """
        Atualiza um campo do cliente vinculado ao card.

        Args:
            card: Card que possui o cliente vinculado
            params: Parâmetros da action com 'field_name' e 'value'
        """
        # Verifica se o card tem cliente vinculado
        if not card.client_id:
            print(f"[AUTOMATION] Card {card.id} não possui cliente vinculado, ignorando update_client_field")
            return

        # Busca o cliente
        from app.models.client import Client
        client = self.db.query(Client).filter(Client.id == card.client_id).first()

        if not client:
            print(f"[AUTOMATION] Cliente {card.client_id} não encontrado para card {card.id}")
            return

        # Pega o nome do campo e o valor
        field_name = params.get("field_name")
        value = params.get("value")

        if not field_name:
            print(f"[AUTOMATION] field_name não especificado na action update_client_field")
            return

        # Verifica se o campo existe no modelo Client
        if not hasattr(client, field_name):
            print(f"[AUTOMATION] Campo '{field_name}' não existe no modelo Client")
            return

        # Atualiza o campo
        old_value = getattr(client, field_name)
        setattr(client, field_name, value)
        self.db.commit()

        print(f"[AUTOMATION] Cliente {client.id} campo '{field_name}' atualizado de '{old_value}' para '{value}'")

    def _to_response(self, automation: Automation) -> AutomationResponse:
        """Converte Automation para AutomationResponse."""
        return AutomationResponse(
            id=automation.id,
            board_id=automation.board_id,
            name=automation.name,
            description=automation.description,
            automation_type=automation.automation_type,
            is_active=automation.is_active,
            priority=automation.priority,
            trigger_event=automation.trigger_event,
            trigger_conditions=automation.trigger_conditions,
            schedule_type=automation.schedule_type,
            scheduled_at=automation.scheduled_at,
            recurrence_pattern=automation.recurrence_pattern,
            next_run_at=automation.next_run_at,
            actions=automation.actions,
            state=automation.state or {},
            execution_count=automation.execution_count,
            last_run_at=automation.last_run_at,
            failure_count=automation.failure_count,
            auto_disable_on_failures=automation.auto_disable_on_failures,
            created_at=automation.created_at,
            updated_at=automation.updated_at
        )

    def _to_execution_response(self, execution: Any) -> AutomationExecutionResponse:
        """Converte AutomationExecution para AutomationExecutionResponse."""
        # Busca informações relacionadas
        automation_name = None
        if execution.automation:
            automation_name = execution.automation.name

        card_title = None
        if execution.card:
            card_title = execution.card.title

        return AutomationExecutionResponse(
            id=execution.id,
            automation_id=execution.automation_id,
            card_id=execution.card_id,
            triggered_by_id=execution.triggered_by_id,
            status=execution.status,
            started_at=execution.started_at,
            completed_at=execution.completed_at,
            duration_ms=execution.duration_ms,
            execution_data=execution.execution_data,
            error_message=execution.error_message,
            error_stack=execution.error_stack,
            automation_name=automation_name,
            card_title=card_title
        )
