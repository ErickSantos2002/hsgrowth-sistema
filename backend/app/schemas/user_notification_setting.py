"""
Schemas Pydantic para configurações de notificação do usuário.
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class UserNotificationSettingResponse(BaseModel):
    """Schema de resposta com as configurações de notificação do usuário."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="ID do registro")
    user_id: int = Field(description="ID do usuário")
    task_assigned: bool = Field(description="Notificar quando uma tarefa for atribuída ao usuário")
    task_due_soon: bool = Field(description="Notificar quando uma tarefa estiver com prazo próximo")
    card_moved: bool = Field(description="Notificar quando um card for movido de lista")
    card_product_changed: bool = Field(description="Notificar quando o produto de um card for alterado")
    achievement_unlocked: bool = Field(description="Notificar quando uma conquista for desbloqueada")
    created_at: datetime = Field(description="Data de criação do registro")
    updated_at: datetime = Field(description="Data da última atualização")


class UserNotificationSettingUpdate(BaseModel):
    """
    Schema de atualização das configurações de notificação.
    Todos os campos são opcionais — atualiza apenas o que for enviado (PATCH semântico via PUT).
    """

    task_assigned: Optional[bool] = Field(None, description="Notificar quando uma tarefa for atribuída ao usuário")
    task_due_soon: Optional[bool] = Field(None, description="Notificar quando uma tarefa estiver com prazo próximo")
    card_moved: Optional[bool] = Field(None, description="Notificar quando um card for movido de lista")
    card_product_changed: Optional[bool] = Field(None, description="Notificar quando o produto de um card for alterado")
    achievement_unlocked: Optional[bool] = Field(None, description="Notificar quando uma conquista for desbloqueada")
