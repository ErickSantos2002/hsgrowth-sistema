"""
Schemas das preferências de notificação.

Os avisos obrigatórios (lead do site, card atribuído) não aparecem aqui: não
há como desligá-los. O `extra="forbid"` faz a API recusar quem tentar.
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class UserNotificationSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    task_assigned: bool = Field(description="Tarefa criada por outra pessoa para mim")
    card_product_changed: bool = Field(description="Produto adicionado/removido no meu card")
    reuniao_pronta: bool = Field(description="Gravação e análise da reunião prontas")
    resumo_manha: bool = Field(description="Resumo das 8h, seg a sex")
    reuniao_15min: bool = Field(description="Aviso 15 minutos antes de reunião")
    popup_navegador: bool = Field(description="Pop-up do navegador além do sino")
    quadros_servico: List[int] = Field(default_factory=list, description="Boards de Serviço acompanhados")
    created_at: datetime
    updated_at: datetime


class UserNotificationSettingUpdate(BaseModel):
    """Só os campos enviados mudam. Campo desconhecido (inclusive obrigatório) → 422."""

    model_config = ConfigDict(extra="forbid")

    task_assigned: Optional[bool] = None
    card_product_changed: Optional[bool] = None
    reuniao_pronta: Optional[bool] = None
    resumo_manha: Optional[bool] = None
    reuniao_15min: Optional[bool] = None
    popup_navegador: Optional[bool] = None
    quadros_servico: Optional[List[int]] = None
