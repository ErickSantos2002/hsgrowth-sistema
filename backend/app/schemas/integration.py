"""
Schemas do contrato de integração externa (fase 1: criação de cards de serviço).

Ver docs/superpowers/specs/2026-07-18-integracao-gestorhs-design.md
"""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class IntegrationCardClient(BaseModel):
    """Cliente da entidade de origem. `external_id` é o `clientes.id` do GestorHS."""
    external_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    document: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=2)


class IntegrationCardContact(BaseModel):
    """Pessoa de contato. O telefone vem já escolhido pelo sistema de origem."""
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)


class IntegrationCardDevice(BaseModel):
    """Aparelho. Mesmo formato do campo `aparelhos` de ServiceCardProduct."""
    serial_number: Optional[str] = None
    model: Optional[str] = None
    alcohol_module: Optional[str] = None
    next_recalibration_date: Optional[str] = None


class IntegrationServiceCardCreate(BaseModel):
    # gestorhs.os        → board de Serviços, origem = Ordem de Serviço
    # gestorhs.calibracao → board de Cobrança, origem = EquipamentoCliente
    source: Literal["gestorhs.os", "gestorhs.calibracao"]
    external_id: str = Field(..., min_length=1, max_length=100)
    board_id: int
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    client: IntegrationCardClient
    contact: Optional[IntegrationCardContact] = None
    devices: Optional[List[IntegrationCardDevice]] = None
    business_info: Optional[dict] = None


class IntegrationServiceCardResponse(BaseModel):
    id: int
    list_id: int
    title: str
    external_source: Optional[str] = None
    external_id: Optional[str] = None
    client_id: Optional[int] = None
    person_id: Optional[int] = None
    created: bool = Field(..., description="True se o card foi criado agora; False se já existia.")

    model_config = {"from_attributes": True}
