"""
Schemas de Transferência.
Define estruturas de dados para transferências de cards entre usuários.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
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
    """Schema base para transferência."""
    card_id: int = Field(..., description="ID do card")
    to_user_id: int = Field(..., description="ID do usuário destino")
    reason: TransferReason = Field(..., description="Motivo da transferência")
    notes: Optional[str] = Field(None, description="Notas adicionais")

    class Config:
        use_enum_values = True


class CardTransferCreate(CardTransferBase):
    """Schema para criar transferência."""
    pass


class BatchTransferCreate(BaseModel):
    """Schema para criar transferência em lote."""
    card_ids: List[int] = Field(..., min_items=1, max_items=50, description="IDs dos cards (máx: 50)")
    to_user_id: int = Field(..., description="ID do usuário destino")
    reason: TransferReason = Field(..., description="Motivo da transferência")
    notes: Optional[str] = Field(None, description="Notas adicionais")

    class Config:
        use_enum_values = True


class CardTransferResponse(CardTransferBase):
    """Schema de resposta para transferência."""
    id: int
    from_user_id: Optional[int] = None
    status: str
    is_batch_transfer: bool
    batch_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Campos relacionados
    card_title: Optional[str] = None
    from_user_name: Optional[str] = None
    to_user_name: Optional[str] = None

    class Config:
        from_attributes = True


class CardTransferListResponse(BaseModel):
    """Schema de resposta para lista de transferências."""
    transfers: List[CardTransferResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BatchTransferResponse(BaseModel):
    """Schema de resposta para transferência em lote."""
    batch_id: str
    total_cards: int
    successful: int
    failed: int
    transfers: List[CardTransferResponse]
    errors: Optional[List[Dict]] = None


# ========== APPROVAL SCHEMAS ==========

class TransferApprovalBase(BaseModel):
    """Schema base para aprovação."""
    pass


class TransferApprovalDecision(BaseModel):
    """Schema para decisão de aprovação."""
    decision: str = Field(..., description="Decisão: approved ou rejected")
    comments: Optional[str] = Field(None, description="Comentários do aprovador")


class TransferApprovalResponse(TransferApprovalBase):
    """Schema de resposta para aprovação."""
    id: int
    transfer_id: int
    approver_id: Optional[int] = None
    status: str
    expires_at: datetime
    decided_at: Optional[datetime] = None
    comments: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Campos relacionados
    transfer: Optional[CardTransferResponse] = None
    approver_name: Optional[str] = None

    class Config:
        from_attributes = True


class TransferApprovalListResponse(BaseModel):
    """Schema de resposta para lista de aprovações."""
    approvals: List[TransferApprovalResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ========== STATISTICS SCHEMAS ==========

class TransferStatistics(BaseModel):
    """Schema para estatísticas de transferências."""
    total_transfers: int = Field(..., description="Total de transferências")
    pending_approvals: int = Field(..., description="Aprovações pendentes")
    completed_today: int = Field(..., description="Transferências concluídas hoje")
    completed_this_week: int = Field(..., description="Transferências concluídas esta semana")
    completed_this_month: int = Field(..., description="Transferências concluídas este mês")
    by_reason: Dict[str, int] = Field(default_factory=dict, description="Transferências por motivo")
    top_receivers: List[Dict[str, Any]] = Field(default_factory=list, description="Usuários que mais receberam")
    top_senders: List[Dict[str, Any]] = Field(default_factory=list, description="Usuários que mais enviaram")


# ========== CONSTANTS ==========

# Limite de transferências em lote
MAX_BATCH_TRANSFER = 50

# Prazo de expiração de aprovação (em horas)
APPROVAL_EXPIRATION_HOURS = 72
