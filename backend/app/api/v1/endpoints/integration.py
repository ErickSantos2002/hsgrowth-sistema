"""
Endpoints de integração externa.

Duas formas de autenticação convivem aqui:
- chave de API (`X-API-Key` + escopo) — cards de serviço do GestorHS
  (docs/superpowers/specs/2026-07-18-integracao-gestorhs-design.md);
- JWT do client-credentials de um usuário `is_integracao` — agendamento de
  reunião do MarketingHS, que já usa esse token nas rotas de cards e tarefas
  (docs/superpowers/specs/2026-10-28-agendamento-integracao.md).
"""
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_api_scope, require_integracao
from app.models.user import User
from app.schemas.integration import (
    IntegrationAgendaResponse,
    IntegrationServiceCardCreate,
    IntegrationServiceCardResponse,
    IntegrationVendedor,
)
from app.services.integration_agenda_service import IntegrationAgendaService
from app.services.integration_card_service import IntegrationCardService

PERIODO_MAXIMO_AGENDA = timedelta(days=15)
MAXIMO_DE_VENDEDORES_NA_AGENDA = 30

router = APIRouter()


@router.post(
    "/service-cards",
    response_model=IntegrationServiceCardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cria um card de serviço a partir de um sistema externo",
)
async def create_service_card(
    data: IntegrationServiceCardCreate,
    response: Response,
    user: User = Depends(require_api_scope("service_cards:create")),
    db: Session = Depends(get_db),
):
    """
    Create-or-return idempotente por (source, external_id).

    - `201` — card criado agora.
    - `200` — já existia; **nada foi alterado** (o card pertence ao vendedor).
    """
    card, created = IntegrationCardService(db).create_or_return(data, user)

    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK

    return IntegrationServiceCardResponse(
        id=card.id,
        list_id=card.list_id,
        title=card.title,
        external_source=card.external_source,
        external_id=card.external_id,
        client_id=card.client_id,
        person_id=card.person_id,
        created=created,
    )


@router.get(
    "/vendedores",
    response_model=List[IntegrationVendedor],
    summary="Lista os vendedores (papel salesperson)",
)
async def listar_vendedores(
    user: User = Depends(require_integracao()),
    db: Session = Depends(get_db),
):
    """Ativos e inativos — o campo `ativo` diz qual. Ordenados por nome."""
    return IntegrationAgendaService(db).listar_vendedores()


@router.get(
    "/agenda",
    response_model=IntegrationAgendaResponse,
    summary="Livre/ocupado dos vendedores",
)
async def agenda_dos_vendedores(
    user_ids: str = Query(..., description="Ids separados por vírgula, ex.: 19,3,9"),
    inicio: datetime = Query(..., description="ISO 8601 com fuso, ex.: 2026-10-29T00:00:00Z"),
    fim: datetime = Query(..., description="ISO 8601 com fuso; no máximo 15 dias após o início"),
    user: User = Depends(require_integracao()),
    db: Session = Depends(get_db),
):
    """
    Devolve só os blocos **não-livres** (busy, tentative, oof, workingElsewhere),
    sem assunto nem local, em UTC. Vendedor que não pôde ser lido vai em `erros`.
    """
    try:
        ids = [int(p) for p in user_ids.split(",") if p.strip()]
    except ValueError:
        raise HTTPException(status_code=422, detail="user_ids deve ser uma lista de inteiros separados por vírgula.")
    if not ids:
        raise HTTPException(status_code=422, detail="Informe ao menos um user_id.")
    if len(ids) > MAXIMO_DE_VENDEDORES_NA_AGENDA:
        raise HTTPException(
            status_code=422,
            detail=f"No máximo {MAXIMO_DE_VENDEDORES_NA_AGENDA} vendedores por chamada.",
        )

    # Sem fuso a data é ambígua (UTC? Brasília?) — a regra é UTC explícito.
    if inicio.tzinfo is None or fim.tzinfo is None:
        raise HTTPException(status_code=422, detail="inicio e fim precisam de fuso explícito (ex.: sufixo Z).")
    if fim <= inicio:
        raise HTTPException(status_code=422, detail="fim deve ser depois de inicio.")
    if fim - inicio > PERIODO_MAXIMO_AGENDA:
        raise HTTPException(status_code=422, detail="Período máximo de 15 dias por chamada.")

    try:
        return IntegrationAgendaService(db).livre_ocupado(ids, inicio, fim)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=f"Agenda indisponível. {e}")
