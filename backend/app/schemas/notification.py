"""
Schemas Pydantic para Notificações.
Define os modelos de entrada/saída para notificações in-app.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class NotificationTypeEnum(str, Enum):
    """
    Tipos de notificações disponíveis.
    """
    CARD_ASSIGNED = "card_assigned"
    CARD_OVERDUE = "card_overdue"
    CARD_DUE_TODAY = "card_due_today"
    CARD_WON = "card_won"
    CARD_LOST = "card_lost"
    TRANSFER_RECEIVED = "transfer_received"
    TRANSFER_APPROVAL_PENDING = "transfer_approval_pending"
    TRANSFER_APPROVED = "transfer_approved"
    TRANSFER_REJECTED = "transfer_rejected"
    AUTOMATION_FAILED = "automation_failed"
    AUTOMATION_DISABLED = "automation_disabled"
    BADGE_EARNED = "badge_earned"
    RANKING_UPDATED = "ranking_updated"
    POINTS_AWARDED = "points_awarded"
    GENERAL = "general"


class NotificationIconEnum(str, Enum):
    """
    Ícones disponíveis para notificações.
    """
    BELL = "bell"
    TROPHY = "trophy"
    WARNING = "warning"
    INFO = "info"
    CHECK = "check"
    FIRE = "fire"
    STAR = "star"
    ALERT = "alert"


class NotificationColorEnum(str, Enum):
    """
    Cores disponíveis para notificações (estilo Bootstrap/Tailwind).
    """
    SUCCESS = "success"
    WARNING = "warning"
    DANGER = "danger"
    INFO = "info"
    PRIMARY = "primary"
    SECONDARY = "secondary"


# ================== Schemas Base ==================

class NotificationBase(BaseModel):
    """
    Schema base de notificação (campos comuns).
    """
    notification_type: NotificationTypeEnum = Field(..., description="Tipo da notificação")
    title: str = Field(..., min_length=1, max_length=255, description="Título da notificação")
    message: str = Field(..., min_length=1, description="Mensagem da notificação")
    icon: Optional[NotificationIconEnum] = Field(None, description="Ícone da notificação")
    color: Optional[NotificationColorEnum] = Field(None, description="Cor da notificação")
    notification_metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Metadados adicionais (card_id, board_id, url, etc)"
    )


class NotificationCreate(NotificationBase):
    """
    Schema para criação de notificação.
    """
    user_id: int = Field(..., description="ID do usuário destinatário")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "user_id": 2,
                    "notification_type": "card_assigned",
                    "title": "Novo card atribuído",
                    "message": "Você foi atribuído ao card 'Lead - Empresa XYZ'",
                    "icon": "bell",
                    "color": "info",
                    "notification_metadata": {
                        "card_id": 123,
                        "board_id": 5,
                        "url": "/boards/5/cards/123"
                    }
                }
            ]
        }
    }


class NotificationUpdate(BaseModel):
    """
    Schema para atualização de notificação (basicamente apenas marcar como lida).
    """
    is_read: Optional[bool] = Field(None, description="Marcar como lida/não lida")


class NotificationResponse(BaseModel):
    """
    Schema de resposta de notificação.
    """
    id: int = Field(..., description="ID da notificação")
    user_id: int = Field(..., description="ID do usuário destinatário")
    # Usa serialization_alias para mapear para nomes esperados pelo frontend
    notification_type: str = Field(..., serialization_alias="type", description="Tipo da notificação")
    title: str = Field(..., description="Título da notificação")
    message: str = Field(..., description="Mensagem da notificação")
    icon: Optional[str] = Field(None, description="Ícone da notificação")
    color: Optional[str] = Field(None, description="Cor da notificação")
    notification_metadata: Dict[str, Any] = Field(default_factory=dict, serialization_alias="metadata", description="Metadados")
    link: Optional[str] = Field(None, description="Link relacionado à notificação (extraído de metadata.url)")
    is_read: bool = Field(..., description="Se foi lida")
    read_at: Optional[datetime] = Field(None, description="Data/hora de leitura")
    created_at: datetime = Field(..., description="Data/hora de criação")
    updated_at: Optional[datetime] = Field(None, description="Data/hora de última atualização")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,  # Permite usar tanto o nome quanto o alias
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "user_id": 2,
                    "type": "card_assigned",
                    "title": "Novo card atribuído",
                    "message": "Você foi atribuído ao card 'Lead - Empresa XYZ'",
                    "icon": "bell",
                    "color": "info",
                    "metadata": {
                        "card_id": 123,
                        "board_id": 5,
                        "url": "/boards/5/cards/123"
                    },
                    "link": "/boards/5/cards/123",
                    "is_read": False,
                    "read_at": None,
                    "created_at": "2026-01-06T10:30:00",
                    "updated_at": None
                }
            ]
        }
    }


class NotificationListResponse(BaseModel):
    """
    Schema de resposta para lista de notificações (paginada).
    """
    # Usa serialization_alias para compatibilidade com frontend
    items: List[NotificationResponse] = Field(..., serialization_alias="notifications", description="Lista de notificações")
    total: int = Field(..., description="Total de notificações")
    unread_count: int = Field(..., description="Total de notificações não lidas")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Tamanho da página")
    total_pages: int = Field(..., description="Total de páginas")

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "examples": [
                {
                    "notifications": [
                        {
                            "id": 1,
                            "user_id": 2,
                            "type": "card_assigned",
                            "title": "Novo card atribuído",
                            "message": "Você foi atribuído ao card 'Lead - Empresa XYZ'",
                            "icon": "bell",
                            "color": "info",
                            "metadata": {"card_id": 123},
                            "is_read": False,
                            "read_at": None,
                            "created_at": "2026-01-06T10:30:00",
                            "updated_at": None
                        }
                    ],
                    "total": 25,
                    "unread_count": 5,
                    "page": 1,
                    "page_size": 20,
                    "total_pages": 2
                }
            ]
        }
    }


class NotificationStatsResponse(BaseModel):
    """
    Estatísticas de notificações do usuário.
    """
    total: int = Field(..., description="Total de notificações")
    unread_count: int = Field(..., description="Notificações não lidas")
    by_type: Dict[str, int] = Field(..., description="Contagem por tipo de notificação")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "total": 50,
                    "unread_count": 8,
                    "by_type": {
                        "card_assigned": 15,
                        "card_overdue": 5,
                        "badge_earned": 3,
                        "automation_failed": 2
                    }
                }
            ]
        }
    }


# ================== Schemas de Envio em Lote ==================

class BulkNotificationCreate(BaseModel):
    """
    Schema para criar notificação em lote para múltiplos usuários.
    """
    user_ids: List[int] = Field(..., min_length=1, description="Lista de IDs dos usuários")
    notification_type: NotificationTypeEnum = Field(..., description="Tipo da notificação")
    title: str = Field(..., min_length=1, max_length=255, description="Título")
    message: str = Field(..., min_length=1, description="Mensagem")
    icon: Optional[NotificationIconEnum] = Field(None, description="Ícone")
    color: Optional[NotificationColorEnum] = Field(None, description="Cor")
    notification_metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Metadados"
    )


class BulkNotificationResponse(BaseModel):
    """
    Resposta de criação em lote.
    """
    created_count: int = Field(..., description="Quantidade de notificações criadas")
    notification_ids: List[int] = Field(..., description="IDs das notificações criadas")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "created_count": 3,
                    "notification_ids": [1, 2, 3]
                }
            ]
        }
    }
