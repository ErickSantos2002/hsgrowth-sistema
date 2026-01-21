"""
Transfer Service - Lógica de negócio de transferências.
Gerencia transferências de cards entre usuários com fluxo de aprovação.
"""
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.repositories.transfer_repository import TransferRepository
from app.repositories.card_repository import CardRepository
from app.repositories.list_repository import ListRepository
from app.repositories.board_repository import BoardRepository
from app.schemas.transfer import (
    CardTransferCreate,
    CardTransferResponse,
    CardTransferListResponse,
    BatchTransferCreate,
    BatchTransferResponse,
    TransferApprovalDecision,
    TransferApprovalResponse,
    TransferApprovalListResponse,
    TransferStatistics,
    APPROVAL_EXPIRATION_HOURS
)
from app.models.user import User
from app.models.card_transfer import CardTransfer
from app.models.transfer_approval import TransferApproval as TransferApprovalModel


class TransferService:
    """
    Service para lógica de negócio de transferências.
    """

    def __init__(self, db: Session, approval_required: bool = False):
        """
        Inicializa o service.

        Args:
            db: Sessão do banco
            approval_required: Se requer aprovação de gerente
        """
        self.db = db
        self.repository = TransferRepository(db)
        self.card_repository = CardRepository(db)
        self.list_repository = ListRepository(db)
        self.board_repository = BoardRepository(db)
        self.approval_required = approval_required

    def _get_approvers(self) -> List[User]:
        """
        Busca TODOS os gerentes e admins ativos que podem aprovar transferências.

        Returns:
            Lista de usuários aprovadores (gerentes + admins)
        """
        from app.models.role import Role

        approvers = []

        # Busca TODOS os gerentes ativos
        manager_role = self.db.query(Role).filter(Role.name == "manager").first()
        if manager_role:
            managers = self.db.query(User).filter(
                User.role_id == manager_role.id,
                User.is_active == True,
                User.is_deleted == False
            ).all()  # .all() ao invés de .first()
            approvers.extend(managers)

        # Busca TODOS os admins ativos
        admin_role = self.db.query(Role).filter(Role.name == "admin").first()
        if admin_role:
            admins = self.db.query(User).filter(
                User.role_id == admin_role.id,
                User.is_active == True,
                User.is_deleted == False
            ).all()  # .all() ao invés de .first()
            approvers.extend(admins)

        return approvers

    # ========== TRANSFERÊNCIAS ==========

    def create_transfer(
        self,
        transfer_data: CardTransferCreate,
        current_user: User
    ) -> CardTransferResponse:
        """
        Cria uma transferência de card.

        Args:
            transfer_data: Dados da transferência
            current_user: Usuário autenticado

        Returns:
            CardTransferResponse
        """
        # Valida card
        card = self.card_repository.find_by_id(transfer_data.card_id)
        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Card não encontrado"
            )

        # Verifica se o card pertence à conta do usuário
        list_obj = self.list_repository.find_by_id(card.list_id)
        if not list_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lista não encontrada"
            )

        board = self.board_repository.find_by_id(list_obj.board_id)
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board não encontrado"
            )

        # Valida usuário destino
        to_user = self.db.query(User).filter(User.id == transfer_data.to_user_id).first()
        if not to_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário destino não encontrado"
            )

        # Não pode transferir para si mesmo
        if transfer_data.to_user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível transferir para si mesmo"
            )

        # Define status baseado em aprovação
        transfer_status = "pending_approval" if self.approval_required else "completed"

        # Cria transferência
        transfer = self.repository.create(
            transfer_data,
            from_user_id=current_user.id,
            status=transfer_status
        )

        # Se requer aprovação, cria registros de aprovação para TODOS os gerentes/admins
        if self.approval_required:
            approvers = self._get_approvers()

            if approvers:
                expires_at = datetime.utcnow() + timedelta(hours=APPROVAL_EXPIRATION_HOURS)
                # Cria uma aprovação para cada gerente/admin
                for approver in approvers:
                    self.repository.create_approval(transfer.id, approver.id, expires_at)

        # Se não requer aprovação, executa transferência
        if not self.approval_required:
            self._execute_transfer(transfer)

        return self._to_response(transfer)

    def create_batch_transfer(
        self,
        batch_data: BatchTransferCreate,
        current_user: User
    ) -> BatchTransferResponse:
        """
        Cria transferência em lote.

        Args:
            batch_data: Dados da transferência em lote
            current_user: Usuário autenticado

        Returns:
            BatchTransferResponse
        """
        batch_id = str(uuid.uuid4())
        successful = 0
        failed = 0
        transfers = []
        errors = []

        # Busca TODOS os aprovadores uma vez só (se requer aprovação)
        approvers = []
        if self.approval_required:
            approvers = self._get_approvers()

        for card_id in batch_data.card_ids:
            try:
                transfer_data = CardTransferCreate(
                    card_id=card_id,
                    to_user_id=batch_data.to_user_id,
                    reason=batch_data.reason,
                    notes=batch_data.notes
                )

                # Valida card
                card = self.card_repository.find_by_id(card_id)
                if not card:
                    failed += 1
                    errors.append({"card_id": card_id, "error": "Card não encontrado"})
                    continue

                # Verifica acesso
                list_obj = self.list_repository.find_by_id(card.list_id)
                board = self.board_repository.find_by_id(list_obj.board_id) if list_obj else None

                if not board:
                    failed += 1
                    errors.append({"card_id": card_id, "error": "Board não encontrado"})
                    continue

                # Cria transferência
                transfer_status = "pending_approval" if self.approval_required else "completed"
                transfer = self.repository.create(
                    transfer_data,
                    from_user_id=current_user.id,
                    status=transfer_status,
                    is_batch=True,
                    batch_id=batch_id
                )

                # Se requer aprovação, cria aprovações para TODOS os gerentes/admins
                if self.approval_required and approvers:
                    expires_at = datetime.utcnow() + timedelta(hours=APPROVAL_EXPIRATION_HOURS)
                    for approver in approvers:
                        self.repository.create_approval(transfer.id, approver.id, expires_at)

                # Executa se não requer aprovação
                if not self.approval_required:
                    self._execute_transfer(transfer)

                transfers.append(self._to_response(transfer))
                successful += 1

            except Exception as e:
                failed += 1
                errors.append({"card_id": card_id, "error": str(e)})

        return BatchTransferResponse(
            batch_id=batch_id,
            total_cards=len(batch_data.card_ids),
            successful=successful,
            failed=failed,
            transfers=transfers,
            errors=errors if errors else None
        )

    def list_transfers(
        self,
        user_id: int,
        page: int = 1,
        page_size: int = 50,
        status: Optional[str] = None,
        is_sender: bool = True
    ) -> CardTransferListResponse:
        """
        Lista transferências de um usuário.

        Args:
            user_id: ID do usuário
            page: Número da página
            page_size: Tamanho da página
            status: Filtrar por status
            is_sender: True para enviadas, False para recebidas

        Returns:
            CardTransferListResponse
        """
        # Verifica se o usuário existe
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )

        skip = (page - 1) * page_size
        transfers = self.repository.list_by_user(
            user_id, skip, page_size, status, is_sender
        )
        total = self.repository.count_by_user(user_id, status, is_sender)
        total_pages = (total + page_size - 1) // page_size

        transfers_response = [self._to_response(t) for t in transfers]

        return CardTransferListResponse(
            transfers=transfers_response,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def list_all_transfers(
        self,
        page: int = 1,
        page_size: int = 50,
        status: Optional[str] = None
    ) -> CardTransferListResponse:
        """
        Lista TODAS as transferências do sistema (para admin/gerente).

        Args:
            page: Número da página
            page_size: Tamanho da página
            status: Filtrar por status

        Returns:
            CardTransferListResponse
        """
        skip = (page - 1) * page_size
        transfers = self.repository.list_all(skip, page_size, status)
        total = self.repository.count_all(status)
        total_pages = (total + page_size - 1) // page_size

        transfers_response = [self._to_response(t) for t in transfers]

        return CardTransferListResponse(
            transfers=transfers_response,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    # ========== APROVAÇÕES ==========

    def list_pending_approvals(
        self,
        approver_id: int,
        page: int = 1,
        page_size: int = 50
    ) -> TransferApprovalListResponse:
        """
        Lista aprovações pendentes de um aprovador.

        Args:
            approver_id: ID do aprovador
            page: Número da página
            page_size: Tamanho da página

        Returns:
            TransferApprovalListResponse
        """
        # Verifica se o aprovador existe
        user = self.db.query(User).filter(User.id == approver_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Aprovador não encontrado"
            )

        skip = (page - 1) * page_size
        approvals = self.repository.list_pending_approvals(approver_id, skip, page_size)
        total = self.repository.count_pending_approvals(approver_id)
        total_pages = (total + page_size - 1) // page_size

        approvals_response = [self._to_approval_response(a) for a in approvals]

        return TransferApprovalListResponse(
            approvals=approvals_response,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def decide_approval(
        self,
        approval_id: int,
        decision_data: TransferApprovalDecision,
        current_user: User
    ) -> TransferApprovalResponse:
        """
        Decide sobre uma aprovação.

        Args:
            approval_id: ID da aprovação
            decision_data: Decisão
            current_user: Usuário autenticado

        Returns:
            TransferApprovalResponse
        """
        approval = self.repository.find_approval_by_id(approval_id)
        if not approval:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Aprovação não encontrada"
            )

        # Verifica se é o aprovador
        if approval.approver_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o aprovador pode decidir"
            )

        # Verifica se ainda está pendente
        if approval.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Aprovação já {approval.status}"
            )

        # Verifica se expirou
        if datetime.utcnow() > approval.expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aprovação expirada"
            )

        # Atualiza aprovação
        approval = self.repository.update_approval_decision(
            approval,
            decision_data.decision,
            decision_data.comments
        )

        # Atualiza status da transferência
        transfer = self.repository.find_by_id(approval.transfer_id)
        if transfer:
            if decision_data.decision == "approved":
                transfer = self.repository.update_status(transfer, "completed")
                self._execute_transfer(transfer)
            else:
                self.repository.update_status(transfer, "rejected")

        return self._to_approval_response(approval)

    # ========== ESTATÍSTICAS ==========

    def get_statistics(self) -> TransferStatistics:
        """
        Obtém estatísticas de transferências do sistema.

        Returns:
            TransferStatistics
        """
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        total_transfers = self.repository.count_by_period(
            datetime(2000, 1, 1), now
        )

        # Conta aprovações pendentes (simplificado)
        pending_approvals = self.db.query(TransferApprovalModel).filter(
            TransferApprovalModel.status == "pending"
        ).count()

        completed_today = self.repository.count_by_period(
            today_start, now, status="completed"
        )

        completed_this_week = self.repository.count_by_period(
            week_start, now, status="completed"
        )

        completed_this_month = self.repository.count_by_period(
            month_start, now, status="completed"
        )

        by_reason = self.repository.count_by_reason()
        top_receivers = self.repository.get_top_receivers(limit=5)
        top_senders = self.repository.get_top_senders(limit=5)

        return TransferStatistics(
            total_transfers=total_transfers,
            pending_approvals=pending_approvals,
            completed_today=completed_today,
            completed_this_week=completed_this_week,
            completed_this_month=completed_this_month,
            by_reason=by_reason,
            top_receivers=top_receivers,
            top_senders=top_senders
        )

    # ========== MÉTODOS AUXILIARES ==========

    def _execute_transfer(self, transfer: CardTransfer) -> None:
        """
        Executa a transferência (atualiza assigned_to do card).

        Args:
            transfer: Transferência
        """
        card = self.card_repository.find_by_id(transfer.card_id)
        if card:
            self.card_repository.assign_to_user(card, transfer.to_user_id)

    def _to_response(self, transfer: CardTransfer) -> CardTransferResponse:
        """Converte CardTransfer para CardTransferResponse."""
        # Busca informações relacionadas
        card_title = None
        if transfer.card:
            card_title = transfer.card.title

        from_user_name = None
        if transfer.from_user:
            from_user_name = transfer.from_user.name

        to_user_name = None
        if transfer.to_user:
            to_user_name = transfer.to_user.name

        return CardTransferResponse(
            id=transfer.id,
            card_id=transfer.card_id,
            from_user_id=transfer.from_user_id,
            to_user_id=transfer.to_user_id,
            reason=transfer.reason,
            notes=transfer.notes,
            status=transfer.status,
            is_batch_transfer=transfer.is_batch_transfer,
            batch_id=transfer.batch_id,
            created_at=transfer.created_at,
            updated_at=transfer.updated_at,
            card_title=card_title,
            from_user_name=from_user_name,
            to_user_name=to_user_name
        )

    def _to_approval_response(self, approval: TransferApprovalModel) -> TransferApprovalResponse:
        """Converte TransferApproval para TransferApprovalResponse."""
        # Busca informações relacionadas
        transfer_response = None
        if approval.transfer:
            transfer_response = self._to_response(approval.transfer)

        approver_name = None
        if approval.approver:
            approver_name = approval.approver.name

        return TransferApprovalResponse(
            id=approval.id,
            transfer_id=approval.transfer_id,
            approver_id=approval.approver_id,
            status=approval.status,
            expires_at=approval.expires_at,
            decided_at=approval.decided_at,
            comments=approval.comments,
            created_at=approval.created_at,
            updated_at=approval.updated_at,
            transfer=transfer_response,
            approver_name=approver_name
        )
