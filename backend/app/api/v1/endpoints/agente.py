"""
O que o Guardi (HS.OS) alcança no HSGrowth com o login do dono — a tela
"Capacidade" do HS.OS. Spec no repo HS.OS:
docs/superpowers/specs/2026-11-13-capacidade-do-guardi-design.md.

Só para token de agente; login normal recebe 404 (a rota não existe para ele).
As rotas saem da mesma tabela que o get_current_user aplica (PAPEIS_AGENTE em
core/agente.py) — não há regra copiada aqui.
"""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import eh_agente, get_current_user
from app.core.agente import rotas_do_papel
from app.models.user import User

router = APIRouter()


@router.get("/capacidades", summary="Rotas do agente que este login alcança (só token de agente)")
async def capacidades(request: Request, current_user: User = Depends(get_current_user)) -> Any:
    if not eh_agente(request):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    role = current_user.role
    return {
        "papel": role.display_name if role else "",
        "rotas": rotas_do_papel(role.name if role else None),
    }
