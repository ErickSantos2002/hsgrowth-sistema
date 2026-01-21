"""
Transfer Repository - Acesso a dados de transferências.
Gerencia transferências de cards e aprovações.
"""
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.card_transfer import CardTransfer
from app.models.transfer_approval import TransferApproval
from app.schemas.transfer import CardTransferCreate


class TransferRepository:
    """
    Repository para operações de transferências.
    """

    def __init__(self, db: Session):
        self.db = db

    # ========== TRANSFERS ==========

    def create(
        self,
        transfer_data: CardTransferCreate,
        from_user_id: int,
        status: str = "completed",
        is_batch: bool = False,
        batch_id: Optional[str] = None
    ) -> CardTransfer:
        """
        Cria uma transferência.

        Args:
            transfer_data: Dados da transferência
            from_user_id: ID do usuário de origem
            status: Status da transferência
            is_batch: Se faz parte de lote
            batch_id: ID do lote

        Returns:
            CardTransfer criada
        """
        transfer = CardTransfer(
            card_id=transfer_data.card_id,
            from_user_id=from_user_id,
            to_user_id=transfer_data.to_user_id,
            reason=transfer_data.reason,
            notes=transfer_data.notes,
            status=status,
            is_batch_transfer=is_batch,
            batch_id=batch_id
        )

        self.db.add(transfer)
        self.db.commit()
        self.db.refresh(transfer)
        return transfer

    def find_by_id(self, transfer_id: int) -> Optional[CardTransfer]:
        """
        Busca uma transferência por ID.

        Args:
            transfer_id: ID da transferência

        Returns:
            CardTransfer ou None
        """
        return self.db.query(CardTransfer).filter(CardTransfer.id == transfer_id).first()

    def list_by_user(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        is_sender: bool = True
    ) -> List[CardTransfer]:
        """
        Lista transferências de um usuário.

        Args:
            user_id: ID do usuário
            skip: Paginação - offset
            limit: Paginação - limite
            status: Filtrar por status
            is_sender: True para enviadas, False para recebidas

        Returns:
            Lista de CardTransfer
        """
        query = self.db.query(CardTransfer)

        if is_sender:
            query = query.filter(CardTransfer.from_user_id == user_id)
        else:
            query = query.filter(CardTransfer.to_user_id == user_id)

        if status:
            query = query.filter(CardTransfer.status == status)

        return query.order_by(CardTransfer.created_at.desc()).offset(skip).limit(limit).all()

    def count_by_user(
        self,
        user_id: int,
        status: Optional[str] = None,
        is_sender: bool = True
    ) -> int:
        """
        Conta transferências de um usuário.

        Args:
            user_id: ID do usuário
            status: Filtrar por status
            is_sender: True para enviadas, False para recebidas

        Returns:
            Total de transferências
        """
        query = self.db.query(CardTransfer)

        if is_sender:
            query = query.filter(CardTransfer.from_user_id == user_id)
        else:
            query = query.filter(CardTransfer.to_user_id == user_id)

        if status:
            query = query.filter(CardTransfer.status == status)

        return query.count()

    def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[CardTransfer]:
        """
        Lista TODAS as transferências do sistema (para admin/gerente).

        Args:
            skip: Paginação - offset
            limit: Paginação - limite
            status: Filtrar por status

        Returns:
            Lista de CardTransfer
        """
        query = self.db.query(CardTransfer)

        if status:
            query = query.filter(CardTransfer.status == status)

        return query.order_by(CardTransfer.created_at.desc()).offset(skip).limit(limit).all()

    def count_all(
        self,
        status: Optional[str] = None
    ) -> int:
        """
        Conta TODAS as transferências do sistema (para admin/gerente).

        Args:
            status: Filtrar por status

        Returns:
            Total de transferências
        """
        query = self.db.query(CardTransfer)

        if status:
            query = query.filter(CardTransfer.status == status)

        return query.count()

    def list_by_card(self, card_id: int) -> List[CardTransfer]:
        """
        Lista transferências de um card.

        Args:
            card_id: ID do card

        Returns:
            Lista de CardTransfer
        """
        return self.db.query(CardTransfer).filter(
            CardTransfer.card_id == card_id
        ).order_by(CardTransfer.created_at.desc()).all()

    def update_status(self, transfer: CardTransfer, status: str) -> CardTransfer:
        """
        Atualiza status de uma transferência.

        Args:
            transfer: Transferência
            status: Novo status

        Returns:
            CardTransfer atualizada
        """
        transfer.status = status
        self.db.commit()
        self.db.refresh(transfer)
        return transfer

    def count_by_period(
        self,
        start_date: datetime,
        end_date: datetime,
        status: Optional[str] = None
    ) -> int:
        """
        Conta transferências em um período.

        Args:
            start_date: Data inicial
            end_date: Data final
            status: Filtrar por status

        Returns:
            Total de transferências
        """
        query = self.db.query(CardTransfer).filter(
            and_(
                CardTransfer.created_at >= start_date,
                CardTransfer.created_at <= end_date
            )
        )

        if status:
            query = query.filter(CardTransfer.status == status)

        return query.count()

    def count_by_reason(self) -> dict:
        """
        Conta transferências por motivo.

        Returns:
            Dicionário com contagem por motivo
        """
        results = self.db.query(
            CardTransfer.reason,
            func.count(CardTransfer.id).label('count')
        ).group_by(CardTransfer.reason).all()

        return {reason: count for reason, count in results}

    def get_top_receivers(self, limit: int = 10) -> List[dict]:
        """
        Lista usuários que mais receberam transferências.

        Args:
            limit: Limite de resultados

        Returns:
            Lista de dicionários com user_id e count
        """
        from app.models.user import User

        results = self.db.query(
            CardTransfer.to_user_id,
            User.name,
            func.count(CardTransfer.id).label('count')
        ).join(User, CardTransfer.to_user_id == User.id).group_by(
            CardTransfer.to_user_id, User.name
        ).order_by(
            func.count(CardTransfer.id).desc()
        ).limit(limit).all()

        return [
            {"user_id": user_id, "user_name": name, "count": count}
            for user_id, name, count in results
        ]

    def get_top_senders(self, limit: int = 10) -> List[dict]:
        """
        Lista usuários que mais enviaram transferências.

        Args:
            limit: Limite de resultados

        Returns:
            Lista de dicionários com user_id e count
        """
        from app.models.user import User

        results = self.db.query(
            CardTransfer.from_user_id,
            User.name,
            func.count(CardTransfer.id).label('count')
        ).join(User, CardTransfer.from_user_id == User.id).group_by(
            CardTransfer.from_user_id, User.name
        ).order_by(
            func.count(CardTransfer.id).desc()
        ).limit(limit).all()

        return [
            {"user_id": user_id, "user_name": name, "count": count}
            for user_id, name, count in results
        ]

    # ========== APPROVALS ==========

    def create_approval(
        self,
        transfer_id: int,
        approver_id: Optional[int],
        expires_at: datetime
    ) -> TransferApproval:
        """
        Cria uma aprovação de transferência.

        Args:
            transfer_id: ID da transferência
            approver_id: ID do aprovador (None = qualquer gerente/admin pode aprovar)
            expires_at: Data de expiração

        Returns:
            TransferApproval criada
        """
        approval = TransferApproval(
            transfer_id=transfer_id,
            approver_id=approver_id,  # Pode ser None
            status="pending",
            expires_at=expires_at
        )

        self.db.add(approval)
        self.db.commit()
        self.db.refresh(approval)
        return approval

    def find_approval_by_id(self, approval_id: int) -> Optional[TransferApproval]:
        """
        Busca uma aprovação por ID.

        Args:
            approval_id: ID da aprovação

        Returns:
            TransferApproval ou None
        """
        return self.db.query(TransferApproval).filter(
            TransferApproval.id == approval_id
        ).first()

    def find_approval_by_transfer(self, transfer_id: int) -> Optional[TransferApproval]:
        """
        Busca aprovação de uma transferência.

        Args:
            transfer_id: ID da transferência

        Returns:
            TransferApproval ou None
        """
        return self.db.query(TransferApproval).filter(
            TransferApproval.transfer_id == transfer_id
        ).first()

    def list_pending_approvals(
        self,
        approver_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[TransferApproval]:
        """
        Lista aprovações pendentes.
        Se approver_id for None, lista TODAS as aprovações pendentes (para gerentes/admins).
        Se approver_id for especificado, lista apenas as aprovações daquele aprovador.

        Args:
            approver_id: ID do aprovador (None = todas as pendentes com approver_id NULL)
            skip: Paginação - offset
            limit: Paginação - limite

        Returns:
            Lista de TransferApproval
        """
        query = self.db.query(TransferApproval).filter(
            TransferApproval.status == "pending"
        )

        # Se approver_id for None, busca aprovações que qualquer gerente/admin pode aprovar
        if approver_id is None:
            query = query.filter(TransferApproval.approver_id.is_(None))
        else:
            query = query.filter(TransferApproval.approver_id == approver_id)

        return query.order_by(TransferApproval.created_at.asc()).offset(skip).limit(limit).all()

    def count_pending_approvals(self, approver_id: Optional[int] = None) -> int:
        """
        Conta aprovações pendentes.
        Se approver_id for None, conta TODAS as aprovações pendentes (para gerentes/admins).

        Args:
            approver_id: ID do aprovador (None = todas as pendentes com approver_id NULL)

        Returns:
            Total de aprovações pendentes
        """
        query = self.db.query(TransferApproval).filter(
            TransferApproval.status == "pending"
        )

        # Se approver_id for None, conta aprovações que qualquer gerente/admin pode aprovar
        if approver_id is None:
            query = query.filter(TransferApproval.approver_id.is_(None))
        else:
            query = query.filter(TransferApproval.approver_id == approver_id)

        return query.count()

    def update_approval_decision(
        self,
        approval: TransferApproval,
        decision: str,
        approver_id: int,
        comments: Optional[str] = None
    ) -> TransferApproval:
        """
        Atualiza decisão de aprovação.

        Args:
            approval: Aprovação
            decision: Decisão (approved ou rejected)
            approver_id: ID de quem está aprovando/rejeitando
            comments: Comentários

        Returns:
            TransferApproval atualizada
        """
        approval.status = decision
        approval.approver_id = approver_id  # Preenche quem aprovou/rejeitou
        approval.decided_at = datetime.utcnow()
        if comments:
            approval.comments = comments

        self.db.commit()
        self.db.refresh(approval)
        return approval

    def expire_old_approvals(self) -> int:
        """
        Expira aprovações antigas que passaram do prazo.

        Returns:
            Quantidade de aprovações expiradas
        """
        now = datetime.utcnow()

        expired = self.db.query(TransferApproval).filter(
            and_(
                TransferApproval.status == "pending",
                TransferApproval.expires_at <= now
            )
        ).all()

        for approval in expired:
            approval.status = "expired"
            approval.decided_at = now

        self.db.commit()

        return len(expired)
