"""Schemas Pydantic do Programa de Parceiros (boards Aquisição e Pipeline)."""
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.services.parcerias.cnpj import cnpj_valido, so_digitos

Qualificacao = Literal["aderente", "parcialmente_aderente", "nao_aderente"]
TipoAtividade = Literal["nota", "ligacao", "whatsapp", "email", "reuniao", "tarefa"]


def _cnpj_opcional(valor: Optional[str]) -> Optional[str]:
    if valor in (None, ""):
        return None
    if not cnpj_valido(valor):
        raise ValueError("CNPJ inválido")
    return so_digitos(valor)


# ─── Etapas ──────────────────────────────────────────────────────────────────

class EtapaOut(BaseModel):
    codigo: str
    nome: str


class EtapasResponse(BaseModel):
    aquisicao: List[EtapaOut]
    oportunidades: List[EtapaOut]


class MoverRequest(BaseModel):
    stage: str
    position: Optional[float] = None
    loss_reason: Optional[str] = Field(None, max_length=255)
    loss_detail: Optional[str] = None
    # Campos que a tela pede no modal da trava do board 2.
    expected_close_date: Optional[date] = None
    modality: Optional[Literal["venda", "locacao"]] = None


# ─── Board 1: parceiro ───────────────────────────────────────────────────────

class ParceiroCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    cnpj: Optional[str] = None
    main_contact_name: Optional[str] = Field(None, max_length=255)
    main_contact_phone: Optional[str] = Field(None, max_length=30)
    main_contact_email: Optional[str] = Field(None, max_length=255)
    partner_type: Optional[str] = Field(None, max_length=100)
    origin: Optional[str] = Field(None, max_length=100)
    segment: Optional[str] = Field(None, max_length=255)
    region: Optional[str] = Field(None, max_length=255)
    hs_owner_id: Optional[int] = None
    qualification_status: Optional[Qualificacao] = None
    onboarding_date: Optional[date] = None

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        return _cnpj_opcional(valor)


class ParceiroUpdate(ParceiroCreate):
    name: Optional[str] = Field(None, min_length=1, max_length=255)


class ParceiroResponse(BaseModel):
    id: int
    name: str
    cnpj: Optional[str] = None
    main_contact_name: Optional[str] = None
    main_contact_phone: Optional[str] = None
    main_contact_email: Optional[str] = None
    partner_type: Optional[str] = None
    origin: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    hs_owner_id: Optional[int] = None
    hs_owner_name: Optional[str] = None
    qualification_status: Optional[str] = None
    onboarding_date: Optional[date] = None
    activation_evidence: Optional[str] = None
    activated_at: Optional[datetime] = None
    activation_opportunity_id: Optional[int] = None
    stage: str
    position: float = 0
    loss_reason: Optional[str] = None
    loss_detail: Optional[str] = None
    lost_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    oportunidades_por_etapa: Dict[str, int] = {}

    model_config = {"from_attributes": True}


class MembroCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)


class MembroUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    is_active: Optional[bool] = None


class MembroResponse(BaseModel):
    id: int
    partner_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class AcessoCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def _validar_email(cls, valor: str) -> str:
        valor = valor.strip().lower()
        if "@" not in valor or "." not in valor.split("@")[-1]:
            raise ValueError("E-mail inválido")
        return valor


class AcessoUpdate(BaseModel):
    is_active: bool


class AcessoResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    last_login_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Board 2: oportunidade ───────────────────────────────────────────────────

class OportunidadeCreate(BaseModel):
    # Admin/gerente escolhem; para o parceiro é sempre o próprio canal.
    partner_id: Optional[int] = None
    seller_member_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=500)
    deal_type: str = Field(..., min_length=1, max_length=100)
    sector: str = Field(..., min_length=1, max_length=100)
    relationship_type: str = Field(..., min_length=1, max_length=100)
    context: str = Field(..., min_length=1)
    cnpj: str
    company_name: str = Field(..., min_length=1, max_length=255)
    company_segment: Optional[str] = Field(None, max_length=255)
    company_city: Optional[str] = Field(None, max_length=255)
    company_state: Optional[str] = Field(None, max_length=2)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_role: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=30)
    contact_email: Optional[str] = Field(None, max_length=255)

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        if not cnpj_valido(valor):
            raise ValueError("CNPJ inválido")
        return so_digitos(valor)


class OportunidadeUpdate(BaseModel):
    seller_member_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    deal_type: Optional[str] = Field(None, min_length=1, max_length=100)
    sector: Optional[str] = Field(None, min_length=1, max_length=100)
    relationship_type: Optional[str] = Field(None, min_length=1, max_length=100)
    context: Optional[str] = Field(None, min_length=1)
    cnpj: Optional[str] = None
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_segment: Optional[str] = Field(None, max_length=255)
    company_city: Optional[str] = Field(None, max_length=255)
    company_state: Optional[str] = Field(None, max_length=2)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_role: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=30)
    contact_email: Optional[str] = Field(None, max_length=255)
    expected_close_date: Optional[date] = None
    modality: Optional[Literal["venda", "locacao"]] = None

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj(cls, valor):
        return _cnpj_opcional(valor)


class ElegibilidadeRequest(BaseModel):
    status: Literal["em_analise", "validada", "rejeitada"]
    note: Optional[str] = None


class OportunidadeResponse(BaseModel):
    id: int
    partner_id: int
    partner_name: Optional[str] = None
    acquisition_channel: str = "Parceiros"
    seller_member_id: Optional[int] = None
    seller_name: Optional[str] = None
    title: str
    deal_type: str
    sector: str
    relationship_type: str
    context: str
    cnpj: str
    company_name: str
    company_segment: Optional[str] = None
    company_city: Optional[str] = None
    company_state: Optional[str] = None
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    eligibility_status: str
    eligibility_note: Optional[str] = None
    eligibility_by_name: Optional[str] = None
    eligibility_at: Optional[datetime] = None
    expected_close_date: Optional[date] = None
    modality: Optional[str] = None
    loss_reason: Optional[str] = None
    loss_detail: Optional[str] = None
    stage: str
    position: float = 0
    last_activity_at: Optional[datetime] = None
    won_at: Optional[datetime] = None
    lost_at: Optional[datetime] = None
    total_value: float = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProdutoItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(1, ge=1)
    unit_price: Optional[Decimal] = Field(None, ge=0)


class ProdutoItemUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=1)
    unit_price: Optional[Decimal] = Field(None, ge=0)


class ProdutoItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    total: float


class ProdutoCatalogo(BaseModel):
    id: int
    name: str
    sku: Optional[str] = None
    unit_price: float


# ─── Atividades ──────────────────────────────────────────────────────────────

class AtividadeCreate(BaseModel):
    type: TipoAtividade
    description: str = Field(..., min_length=1)
    due_at: Optional[datetime] = None


class ConcluirRequest(BaseModel):
    is_completed: bool


class AtividadeResponse(BaseModel):
    id: int
    partner_id: Optional[int] = None
    opportunity_id: Optional[int] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    type: str
    description: str
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
