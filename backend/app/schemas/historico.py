"""Schemas do histórico de alterações de Clientes e Pessoas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class HistoricoMudanca(BaseModel):
    campo: str
    antes: Optional[str] = None
    depois: Optional[str] = None


class HistoricoItem(BaseModel):
    id: int
    quando: datetime
    usuario: Optional[str] = None
    acao: str  # "criado" ou "alterado"
    origem: Optional[str] = None  # ex.: "via Parceria"
    mudancas: List[HistoricoMudanca]
