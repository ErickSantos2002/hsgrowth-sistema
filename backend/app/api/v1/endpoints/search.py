"""
Busca geral (Ctrl+K): cards de Vendas e de Serviço/Cobrança numa só chamada.

Os resultados de Serviço só vêm para quem acessa o módulo de Serviços
(admin, gerente e role 'service'). Ver GlobalSearchService.
"""
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.search import GlobalSearchResponse
from app.services.global_search_service import GlobalSearchService

router = APIRouter()


@router.get("/global", response_model=GlobalSearchResponse, summary="Busca geral de cards (Vendas + Serviço)")
async def global_search(
    q: str = Query(..., min_length=2, description="Título, cliente, CNPJ/CPF, contato ou nº de série/módulo"),
    limit: int = Query(8, ge=1, le=30, description="Máximo de resultados por módulo"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    return GlobalSearchService(db).search(q, current_user, limit)
