"""
Endpoints de integração externa (autenticados por chave de API, não por JWT).

Ver docs/superpowers/specs/2026-07-18-integracao-gestorhs-design.md
"""
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_api_scope
from app.models.user import User
from app.schemas.integration import (
    IntegrationServiceCardCreate,
    IntegrationServiceCardResponse,
)
from app.services.integration_card_service import IntegrationCardService

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
