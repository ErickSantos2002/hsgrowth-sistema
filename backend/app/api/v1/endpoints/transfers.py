"""
Endpoints de Transferências.
Rotas para transferências de cards entre usuários.
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.transfer_service import TransferService
from app.schemas.transfer import (
    CardTransferCreate,
    CardTransferResponse,
    CardTransferListResponse,
    BatchTransferCreate,
    BatchTransferResponse,
    TransferApprovalDecision,
    TransferApprovalResponse,
    TransferApprovalListResponse,
    TransferStatistics
)
from app.models.user import User
from app.core.config import settings

router = APIRouter()


# Verifica se aprovação é necessária (pode vir de settings)
APPROVAL_REQUIRED = getattr(settings, 'TRANSFER_APPROVAL_REQUIRED', False)


# ========== TRANSFERÊNCIAS ==========

@router.post("", response_model=CardTransferResponse, summary="Criar transferência", status_code=201)
async def create_transfer(
    transfer_data: CardTransferCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria uma transferência de card.

    - **card_id**: ID do card a transferir
    - **to_user_id**: ID do usuário destino
    - **reason**: Motivo da transferência
    - **notes**: Notas adicionais (opcional)

    **Motivos disponíveis:**
    - reassignment: Reatribuição
    - workload_balance: Balanceamento de carga
    - expertise: Expertise específica
    - vacation: Férias
    - other: Outro motivo

    Se `TRANSFER_APPROVAL_REQUIRED` estiver ativo, a transferência ficará pendente até aprovação.
    """
    service = TransferService(db, approval_required=APPROVAL_REQUIRED)
    return service.create_transfer(transfer_data, current_user)


@router.post("/batch", response_model=BatchTransferResponse, summary="Transferência em lote", status_code=201)
async def create_batch_transfer(
    batch_data: BatchTransferCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria transferência em lote (até 50 cards).

    - **card_ids**: IDs dos cards (mín: 1, máx: 50)
    - **to_user_id**: ID do usuário destino
    - **reason**: Motivo da transferência
    - **notes**: Notas adicionais (opcional)

    Retorna:
    - **batch_id**: ID do lote
    - **total_cards**: Total de cards
    - **successful**: Transferências bem-sucedidas
    - **failed**: Transferências que falharam
    - **transfers**: Lista de transferências criadas
    - **errors**: Lista de erros (se houver)
    """
    service = TransferService(db, approval_required=APPROVAL_REQUIRED)
    return service.create_batch_transfer(batch_data, current_user)


@router.get("/sent", response_model=CardTransferListResponse, summary="Listar transferências enviadas")
async def list_sent_transfers(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista transferências enviadas pelo usuário autenticado.

    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 100)
    - **status**: Filtrar por status - completed, pending_approval, rejected (opcional)
    """
    service = TransferService(db)
    return service.list_transfers(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        status=status,
        is_sender=True
    )


@router.get("/received", response_model=CardTransferListResponse, summary="Listar transferências recebidas")
async def list_received_transfers(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista transferências recebidas pelo usuário autenticado.

    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 100)
    - **status**: Filtrar por status - completed, pending_approval, rejected (opcional)
    """
    service = TransferService(db)
    return service.list_transfers(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        status=status,
        is_sender=False
    )


# ========== APROVAÇÕES ==========

@router.get("/approvals/pending", response_model=TransferApprovalListResponse, summary="Listar aprovações pendentes")
async def list_pending_approvals(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista aprovações pendentes do usuário autenticado (gerente).

    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 100)

    Apenas gerentes/admins têm aprovações pendentes.
    """
    service = TransferService(db)
    return service.list_pending_approvals(
        approver_id=current_user.id,
        page=page,
        page_size=page_size
    )


@router.post("/approvals/{approval_id}/decide", response_model=TransferApprovalResponse, summary="Decidir aprovação")
async def decide_approval(
    approval_id: int = Path(..., description="ID da aprovação"),
    decision_data: TransferApprovalDecision = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Decide sobre uma aprovação de transferência.

    - **approval_id**: ID da aprovação
    - **decision**: "approved" ou "rejected"
    - **comments**: Comentários do aprovador (opcional)

    Apenas o aprovador designado pode decidir.
    A aprovação expira após 72 horas se não decidida.
    """
    service = TransferService(db)
    return service.decide_approval(approval_id, decision_data, current_user)


# ========== ESTATÍSTICAS ==========

@router.get("/statistics", response_model=TransferStatistics, summary="Estatísticas de transferências")
async def get_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Obtém estatísticas de transferências do sistema.

    Retorna:
    - **total_transfers**: Total de transferências
    - **pending_approvals**: Aprovações pendentes
    - **completed_today**: Transferências concluídas hoje
    - **completed_this_week**: Transferências concluídas esta semana
    - **completed_this_month**: Transferências concluídas este mês
    - **by_reason**: Transferências por motivo
    - **top_receivers**: Usuários que mais receberam transferências
    - **top_senders**: Usuários que mais enviaram transferências
    """
    service = TransferService(db)
    return service.get_statistics()
