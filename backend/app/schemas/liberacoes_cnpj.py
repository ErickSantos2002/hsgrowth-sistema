"""Schemas dos pedidos de liberação de CNPJ em Vendas (1.11.32)."""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class LiberacaoCnpjCreate(BaseModel):
    kind: Literal["criar_card", "vincular_empresa"]
    client_id: int
    reason: str = Field(..., max_length=500)
    # criar_card: os dados do card que o vendedor tentou criar (CardCreate).
    payload: Optional[dict] = None
    # vincular_empresa: o card do vendedor.
    card_id: Optional[int] = None


class LiberacaoCnpjDecisao(BaseModel):
    # Liberar: observação opcional. Recusar: motivo obrigatório (conferido no service).
    nota: Optional[str] = Field(None, max_length=500)


class LiberacaoCnpjResponse(BaseModel):
    id: int
    kind: str
    status: str
    client_id: Optional[int]
    empresa: str
    cnpj: str
    card_id: Optional[int]
    titulo_do_card: Optional[str]
    reason: str
    blocked_with: str
    requested_by_id: int
    solicitante: Optional[str]
    decided_by_id: Optional[int]
    decisor: Optional[str]
    decided_at: Optional[datetime]
    decision_note: Optional[str]
    created_at: datetime


class LiberacaoCnpjContagem(BaseModel):
    total: int


class LiberacaoCnpjPagina(BaseModel):
    """Uma página da lista (1.11.33): o total para a paginação e os itens da página."""
    total: int
    itens: List[LiberacaoCnpjResponse]
