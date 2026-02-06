"""
Schemas de Transferência.
Define estruturas de dados para transferências de cards entre usuários.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from enum import Enum


# ========== ENUMS ==========

class TransferReason(str, Enum):
    """Motivos de transferência."""
    REASSIGNMENT = "reassignment"  # Reatribuição
    WORKLOAD_BALANCE = "workload_balance"  # Balanceamento de carga
    EXPERTISE = "expertise"  # Expertise específica
    VACATION = "vacation"  # Férias
    OTHER = "other"  # Outro motivo


class TransferStatus(str, Enum):
    """Status de transferência."""
    COMPLETED = "completed"
    PENDING_APPROVAL = "pending_approval"
    REJECTED = "rejected"


class ApprovalStatus(str, Enum):
    """Status de aprovação."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


# ========== TRANSFER SCHEMAS ==========

class CardTransferBase(BaseModel):
    """Schema base para transferência de card."""
    card_id: int = Field(..., description="ID do card a ser transferido")
    to_user_id: int = Field(..., description="ID do usuário que receberá o card")
    reason: TransferReason = Field(..., description="Motivo da transferência (reassignment, workload_balance, expertise, vacation, other)")
    notes: Optional[str] = Field(None, description="Notas/observações adicionais sobre a transferência")

    model_config = ConfigDict(use_enum_values=True)


class CardTransferCreate(CardTransferBase):
    """Cria uma transferência de card para outro usuário."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "card_id": 42,
                "to_user_id": 8,
                "reason": "expertise",
                "notes": "Cliente precisa de atendimento técnico especializado"
            }
        }
    )


class BatchTransferCreate(BaseModel):
    """Cria transferência em lote de múltiplos cards para um usuário."""
    card_ids: List[int] = Field(..., min_items=1, max_items=50, description="IDs dos cards a transferir (máximo 50)")
    to_user_id: int = Field(..., description="ID do usuário que receberá os cards")
    reason: TransferReason = Field(..., description="Motivo da transferência")
    notes: Optional[str] = Field(None, description="Notas adicionais")

    model_config = ConfigDict(
        use_enum_values=True,
        json_schema_extra={
            "example": {
                "card_ids": [42, 43, 44, 45],
                "to_user_id": 8,
                "reason": "vacation",
                "notes": "Transferência de carteira por férias do vendedor João - retorno 15/02"
            }
        }
    )


class CardTransferResponse(CardTransferBase):
    """Dados completos de uma transferência de card."""
    id: int = Field(..., description="ID da transferência")
    from_user_id: Optional[int] = Field(None, description="ID do usuário que transferiu")
    status: str = Field(..., description="Status: completed, pending_approval ou rejected")
    is_batch_transfer: bool = Field(..., description="Se faz parte de uma transferência em lote")
    batch_id: Optional[str] = Field(None, description="ID do lote (se transferência em lote)")
    created_at: datetime = Field(..., description="Data da transferência")
    updated_at: datetime = Field(..., description="Data da última atualização")

    # Campos relacionados
    card_title: Optional[str] = Field(None, description="Título do card transferido")
    from_user_name: Optional[str] = Field(None, description="Nome do usuário que transferiu")
    to_user_name: Optional[str] = Field(None, description="Nome do usuário que recebeu")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
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
                "card_title": "Projeto Alpha - Empresa XYZ",
                "from_user_name": "João Silva",
                "to_user_name": "Carlos Oliveira"
            }
        }
    )


class CardTransferListResponse(BaseModel):
    """Lista paginada de transferências."""
    transfers: List[CardTransferResponse] = Field(..., description="Lista de transferências")
    total: int = Field(..., description="Total de transferências encontradas")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Itens por página")
    total_pages: int = Field(..., description="Total de páginas")


class BatchTransferResponse(BaseModel):
    """Resultado de uma transferência em lote."""
    batch_id: str = Field(..., description="ID único do lote")
    total_cards: int = Field(..., description="Total de cards no lote")
    successful: int = Field(..., description="Quantidade transferida com sucesso")
    failed: int = Field(..., description="Quantidade que falhou")
    transfers: List[CardTransferResponse] = Field(..., description="Lista de transferências realizadas")
    errors: Optional[List[Dict]] = Field(None, description="Lista de erros (se houver)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "batch_id": "batch_abc123",
                "total_cards": 4,
                "successful": 3,
                "failed": 1,
                "transfers": [
                    {
                        "id": 1,
                        "card_id": 42,
                        "status": "completed",
                        "card_title": "Projeto Alpha"
                    }
                ],
                "errors": [
                    {"card_id": 45, "error": "Card não encontrado"}
                ]
            }
        }
    )


# ========== APPROVAL SCHEMAS ==========

class TransferApprovalBase(BaseModel):
    """Schema base para aprovação de transferência."""
    pass


class TransferApprovalDecision(BaseModel):
    """Decisão de aprovação ou rejeição de uma transferência pendente."""
    decision: str = Field(..., description="Decisão: 'approved' para aprovar ou 'rejected' para rejeitar")
    comments: Optional[str] = Field(None, description="Comentários do aprovador sobre a decisão")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "decision": "approved",
                "comments": "Transferência aprovada. Carlos tem a expertise necessária."
            }
        }
    )


class TransferApprovalResponse(TransferApprovalBase):
    """Dados de uma aprovação de transferência."""
    id: int = Field(..., description="ID da aprovação")
    transfer_id: int = Field(..., description="ID da transferência vinculada")
    approver_id: Optional[int] = Field(None, description="ID do aprovador")
    status: str = Field(..., description="Status: pending, approved, rejected ou expired")
    expires_at: datetime = Field(..., description="Data de expiração da aprovação (72h)")
    decided_at: Optional[datetime] = Field(None, description="Data da decisão")
    comments: Optional[str] = Field(None, description="Comentários do aprovador")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data da última atualização")

    # Campos relacionados
    transfer: Optional[CardTransferResponse] = Field(None, description="Dados da transferência vinculada")
    approver_name: Optional[str] = Field(None, description="Nome do aprovador")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "transfer_id": 5,
                "approver_id": 1,
                "status": "approved",
                "expires_at": "2026-01-18T10:00:00",
                "decided_at": "2026-01-16T14:30:00",
                "comments": "Transferência aprovada",
                "created_at": "2026-01-15T10:00:00",
                "updated_at": "2026-01-16T14:30:00",
                "approver_name": "Admin Master"
            }
        }
    )


class TransferApprovalListResponse(BaseModel):
    """Lista paginada de aprovações de transferência."""
    approvals: List[TransferApprovalResponse] = Field(..., description="Lista de aprovações")
    total: int = Field(..., description="Total encontrado")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Itens por página")
    total_pages: int = Field(..., description="Total de páginas")


# ========== STATISTICS SCHEMAS ==========

class TransferStatistics(BaseModel):
    """Estatísticas gerais de transferências."""
    total_transfers: int = Field(..., description="Total de transferências realizadas")
    pending_approvals: int = Field(..., description="Aprovações pendentes no momento")
    completed_today: int = Field(..., description="Transferências concluídas hoje")
    completed_this_week: int = Field(..., description="Transferências concluídas esta semana")
    completed_this_month: int = Field(..., description="Transferências concluídas este mês")
    by_reason: Dict[str, int] = Field(default_factory=dict, description="Distribuição por motivo (ex: {\"expertise\": 5, \"vacation\": 3})")
    top_receivers: List[Dict[str, Any]] = Field(default_factory=list, description="Usuários que mais receberam cards")
    top_senders: List[Dict[str, Any]] = Field(default_factory=list, description="Usuários que mais enviaram cards")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
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
                    {"user_id": 3, "user_name": "Maria Santos", "count": 18}
                ],
                "top_senders": [
                    {"user_id": 5, "user_name": "João Silva", "count": 30},
                    {"user_id": 2, "user_name": "Ana Costa", "count": 15}
                ]
            }
        }
    )


# ========== CONSTANTS ==========

# Limite de transferências em lote
MAX_BATCH_TRANSFER = 50

# Prazo de expiração de aprovação (em horas)
APPROVAL_EXPIRATION_HOURS = 72
