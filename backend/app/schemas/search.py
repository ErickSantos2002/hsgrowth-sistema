"""Schemas da busca geral (Ctrl+K) — cards de Vendas e de Serviço/Cobrança."""
from typing import List, Optional

from pydantic import BaseModel


class SalesSearchResult(BaseModel):
    """Card de Vendas encontrado na busca geral."""
    id: int
    title: str
    board_id: Optional[int] = None
    list_name: Optional[str] = None        # "Board / Lista"
    assigned_to_name: Optional[str] = None
    client_name: Optional[str] = None
    value: Optional[float] = None
    is_won: bool = False
    is_lost: bool = False
    matched_on: Optional[str] = None       # por onde bateu: Título, Cliente, CNPJ/CPF, Contato


class ServiceSearchResult(BaseModel):
    """Card de Serviço/Cobrança encontrado na busca geral."""
    id: int
    title: str
    board_id: Optional[int] = None
    board_name: Optional[str] = None
    list_name: Optional[str] = None
    client_name: Optional[str] = None
    is_won: bool = False
    is_lost: bool = False
    matched_on: Optional[str] = None       # Título, Cliente, CNPJ/CPF, Contato, Nº de série/módulo


class GlobalSearchResponse(BaseModel):
    vendas: List[SalesSearchResult] = []
    servico: List[ServiceSearchResult] = []   # vazio para quem não acessa o módulo de Serviços
