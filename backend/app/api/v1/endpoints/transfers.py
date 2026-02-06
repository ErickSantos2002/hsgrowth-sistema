"""
Endpoints de Transferências.
Rotas para transferências de cards entre usuários.
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException
from fastapi import status as http_status
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

@router.post(
    "",
    response_model=CardTransferResponse,
    summary="Criar transferência",
    status_code=201,
    responses={
        201: {
            "description": "Transferência criada com sucesso",
            "content": {"application/json": {"example": {
                "id": 1,
                "card_id": 42,
                "from_user_id": 5,
                "to_user_id": 8,
                "reason": "expertise",
                "notes": "Cliente precisa de atendimento técnico especializado",
                "status": "completed",
                "is_batch_transfer": False,
                "batch_id": None,
                "created_at": "2026-01-15T10:00:00",
                "updated_at": "2026-01-15T10:00:00",
                "card_title": "Consultoria TI - Empresa Brasileira Ltda",
                "from_user_name": "João Silva",
                "to_user_name": "Carlos Oliveira"
            }}}
        },
        404: {
            "description": "Card ou usuário destino não encontrado",
            "content": {"application/json": {"example": {
                "detail": "Card com ID 42 não encontrado"
            }}}
        },
        422: {
            "description": "Dados inválidos na requisição",
            "content": {"application/json": {"example": {
                "detail": [{"loc": ["body", "card_id"], "msg": "field required", "type": "value_error.missing"}]
            }}}
        }
    }
)
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


@router.post(
    "/batch",
    response_model=BatchTransferResponse,
    summary="Transferência em lote",
    status_code=201,
    responses={
        201: {
            "description": "Transferência em lote criada com sucesso",
            "content": {"application/json": {"example": {
                "batch_id": "batch_f47ac10b",
                "total_cards": 4,
                "successful": 3,
                "failed": 1,
                "transfers": [
                    {
                        "id": 10,
                        "card_id": 42,
                        "from_user_id": 5,
                        "to_user_id": 8,
                        "reason": "vacation",
                        "notes": "Transferência por férias do vendedor João - retorno 15/02",
                        "status": "completed",
                        "is_batch_transfer": True,
                        "batch_id": "batch_f47ac10b",
                        "created_at": "2026-01-15T10:00:00",
                        "updated_at": "2026-01-15T10:00:00",
                        "card_title": "Implantação ERP - Comércio Varejista SA",
                        "from_user_name": "João Silva",
                        "to_user_name": "Maria Santos"
                    }
                ],
                "errors": [
                    {"card_id": 45, "error": "Card não encontrado"}
                ]
            }}}
        },
        400: {
            "description": "Erro na requisição (limite excedido ou dados inválidos)",
            "content": {"application/json": {"example": {
                "detail": "Limite máximo de 50 cards por lote excedido"
            }}}
        },
        422: {
            "description": "Dados inválidos na requisição",
            "content": {"application/json": {"example": {
                "detail": [{"loc": ["body", "card_ids"], "msg": "field required", "type": "value_error.missing"}]
            }}}
        }
    }
)
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


@router.get(
    "/all",
    response_model=CardTransferListResponse,
    summary="Listar todas as transferências (Admin/Gerente)",
    responses={
        200: {
            "description": "Lista paginada de todas as transferências do sistema",
            "content": {"application/json": {"example": {
                "transfers": [
                    {
                        "id": 1,
                        "card_id": 42,
                        "from_user_id": 5,
                        "to_user_id": 8,
                        "reason": "expertise",
                        "notes": "Cliente precisa de atendimento técnico",
                        "status": "completed",
                        "is_batch_transfer": False,
                        "batch_id": None,
                        "created_at": "2026-01-15T10:00:00",
                        "updated_at": "2026-01-15T10:00:00",
                        "card_title": "Projeto Solar - Construtora Horizonte",
                        "from_user_name": "Ana Costa",
                        "to_user_name": "Carlos Oliveira"
                    }
                ],
                "total": 48,
                "page": 1,
                "page_size": 50,
                "total_pages": 1
            }}}
        },
        403: {
            "description": "Acesso negado - apenas admin/gerente",
            "content": {"application/json": {"example": {
                "detail": "Apenas administradores e gerentes podem listar todas as transferências"
            }}}
        }
    }
)
async def list_all_transfers(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista TODAS as transferências do sistema (apenas Admin/Gerente).

    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 100)
    - **status**: Filtrar por status - completed, pending_approval, rejected (opcional)

    Requer role: admin ou manager
    """
    # Verifica se é admin ou manager
    if current_user.role.name not in ["admin", "manager"]:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores e gerentes podem listar todas as transferências"
        )

    service = TransferService(db)
    return service.list_all_transfers(
        page=page,
        page_size=page_size,
        status=status
    )


@router.get(
    "/sent",
    response_model=CardTransferListResponse,
    summary="Listar transferências enviadas",
    responses={
        200: {
            "description": "Lista paginada de transferências enviadas pelo usuário autenticado",
            "content": {"application/json": {"example": {
                "transfers": [
                    {
                        "id": 5,
                        "card_id": 78,
                        "from_user_id": 5,
                        "to_user_id": 3,
                        "reason": "workload_balance",
                        "notes": "Balanceamento de carteira - muitos leads novos",
                        "status": "completed",
                        "is_batch_transfer": False,
                        "batch_id": None,
                        "created_at": "2026-01-14T09:30:00",
                        "updated_at": "2026-01-14T09:30:00",
                        "card_title": "Plano Empresarial - Clínica Saúde Mais",
                        "from_user_name": "João Silva",
                        "to_user_name": "Maria Santos"
                    }
                ],
                "total": 12,
                "page": 1,
                "page_size": 50,
                "total_pages": 1
            }}}
        }
    }
)
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


@router.get(
    "/received",
    response_model=CardTransferListResponse,
    summary="Listar transferências recebidas",
    responses={
        200: {
            "description": "Lista paginada de transferências recebidas pelo usuário autenticado",
            "content": {"application/json": {"example": {
                "transfers": [
                    {
                        "id": 7,
                        "card_id": 91,
                        "from_user_id": 3,
                        "to_user_id": 5,
                        "reason": "reassignment",
                        "notes": "Reatribuição por proximidade geográfica com o cliente",
                        "status": "completed",
                        "is_batch_transfer": False,
                        "batch_id": None,
                        "created_at": "2026-01-13T14:20:00",
                        "updated_at": "2026-01-13T14:20:00",
                        "card_title": "Licenciamento Software - Padaria Pão Quente",
                        "from_user_name": "Maria Santos",
                        "to_user_name": "João Silva"
                    }
                ],
                "total": 8,
                "page": 1,
                "page_size": 50,
                "total_pages": 1
            }}}
        }
    }
)
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

@router.get(
    "/approvals/pending",
    response_model=TransferApprovalListResponse,
    summary="Listar aprovações pendentes",
    responses={
        200: {
            "description": "Lista paginada de aprovações pendentes do gerente/admin",
            "content": {"application/json": {"example": {
                "approvals": [
                    {
                        "id": 3,
                        "transfer_id": 12,
                        "approver_id": 1,
                        "status": "pending",
                        "expires_at": "2026-01-18T10:00:00",
                        "decided_at": None,
                        "comments": None,
                        "created_at": "2026-01-15T10:00:00",
                        "updated_at": "2026-01-15T10:00:00",
                        "transfer": {
                            "id": 12,
                            "card_id": 55,
                            "from_user_id": 5,
                            "to_user_id": 8,
                            "reason": "expertise",
                            "notes": "Cliente pediu atendimento especializado em BI",
                            "status": "pending_approval",
                            "is_batch_transfer": False,
                            "batch_id": None,
                            "created_at": "2026-01-15T10:00:00",
                            "updated_at": "2026-01-15T10:00:00",
                            "card_title": "Dashboards BI - Distribuidora Nacional",
                            "from_user_name": "João Silva",
                            "to_user_name": "Carlos Oliveira"
                        },
                        "approver_name": "Admin Master"
                    }
                ],
                "total": 3,
                "page": 1,
                "page_size": 50,
                "total_pages": 1
            }}}
        }
    }
)
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


@router.post(
    "/approvals/{approval_id}/decide",
    response_model=TransferApprovalResponse,
    summary="Decidir aprovação",
    responses={
        200: {
            "description": "Decisão registrada com sucesso",
            "content": {"application/json": {"example": {
                "id": 3,
                "transfer_id": 12,
                "approver_id": 1,
                "status": "approved",
                "expires_at": "2026-01-18T10:00:00",
                "decided_at": "2026-01-16T14:30:00",
                "comments": "Transferência aprovada. Carlos tem expertise em BI.",
                "created_at": "2026-01-15T10:00:00",
                "updated_at": "2026-01-16T14:30:00",
                "transfer": {
                    "id": 12,
                    "card_id": 55,
                    "from_user_id": 5,
                    "to_user_id": 8,
                    "reason": "expertise",
                    "notes": "Cliente pediu atendimento especializado em BI",
                    "status": "completed",
                    "is_batch_transfer": False,
                    "batch_id": None,
                    "created_at": "2026-01-15T10:00:00",
                    "updated_at": "2026-01-16T14:30:00",
                    "card_title": "Dashboards BI - Distribuidora Nacional",
                    "from_user_name": "João Silva",
                    "to_user_name": "Carlos Oliveira"
                },
                "approver_name": "Admin Master"
            }}}
        },
        404: {
            "description": "Aprovação não encontrada",
            "content": {"application/json": {"example": {
                "detail": "Aprovação com ID 99 não encontrada"
            }}}
        },
        422: {
            "description": "Decisão inválida",
            "content": {"application/json": {"example": {
                "detail": [{"loc": ["body", "decision"], "msg": "field required", "type": "value_error.missing"}]
            }}}
        }
    }
)
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

@router.get(
    "/statistics",
    response_model=TransferStatistics,
    summary="Estatísticas de transferências",
    responses={
        200: {
            "description": "Estatísticas gerais de transferências do sistema",
            "content": {"application/json": {"example": {
                "total_transfers": 150,
                "pending_approvals": 3,
                "completed_today": 5,
                "completed_this_week": 22,
                "completed_this_month": 45,
                "by_reason": {
                    "reassignment": 50,
                    "workload_balance": 40,
                    "expertise": 30,
                    "vacation": 20,
                    "other": 10
                },
                "top_receivers": [
                    {"user_id": 8, "user_name": "Carlos Oliveira", "count": 25},
                    {"user_id": 3, "user_name": "Maria Santos", "count": 18},
                    {"user_id": 11, "user_name": "Fernanda Lima", "count": 12}
                ],
                "top_senders": [
                    {"user_id": 5, "user_name": "João Silva", "count": 30},
                    {"user_id": 2, "user_name": "Ana Costa", "count": 15},
                    {"user_id": 9, "user_name": "Roberto Almeida", "count": 10}
                ]
            }}}
        }
    }
)
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
