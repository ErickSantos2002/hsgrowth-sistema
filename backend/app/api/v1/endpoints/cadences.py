"""
Endpoints do sistema de Cadência por Lead Individual.

/cadences/templates  — CRUD de templates (admin/gerente)
/cadences/cards/{card_id}  — ações por card (start, pause, resume, cancel, status)
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_active_user, require_not_viewer, require_manager_or_admin
from app.services.cadence_service import CadenceService
from app.schemas.cadence import (
    CadenceTemplateCreate,
    CadenceTemplateUpdate,
    CadenceTemplateResponse,
    CadenceTemplateSummary,
    CardCadenceStart,
    CardCadenceResponse,
)

router = APIRouter()


# ─── Templates ───────────────────────────────────────────────────────────────

@router.get(
    "/templates",
    response_model=List[CadenceTemplateResponse],
    summary="Listar templates de cadência",
)
def list_templates(
    only_active: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lista todos os templates. SDRs e Vendedores recebem apenas os ativos."""
    is_manager = getattr(current_user.role, 'name', '') in ('admin', 'manager', 'gerente')
    active_only = only_active or not is_manager
    return CadenceService(db).list_templates(only_active=active_only)


@router.post(
    "/templates",
    response_model=CadenceTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar template de cadência (admin/gerente)",
    dependencies=[Depends(require_manager_or_admin)],
)
def create_template(
    data: CadenceTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return CadenceService(db).create_template(data, current_user)


@router.put(
    "/templates/{template_id}",
    response_model=CadenceTemplateResponse,
    summary="Atualizar template de cadência (admin/gerente)",
    dependencies=[Depends(require_manager_or_admin)],
)
def update_template(
    template_id: int,
    data: CadenceTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return CadenceService(db).update_template(template_id, data, current_user)


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir template de cadência (admin/gerente)",
    dependencies=[Depends(require_manager_or_admin)],
)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    CadenceService(db).delete_template(template_id, current_user)


# ─── Cadência por card ───────────────────────────────────────────────────────

@router.get(
    "/cards/{card_id}",
    response_model=CardCadenceResponse,
    summary="Status da cadência de um card",
)
def get_card_cadence(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retorna a cadência ativa/pausada de um card, ou 404 se não houver."""
    from fastapi import HTTPException
    result = CadenceService(db).get_cadence_for_card(card_id)
    if not result:
        raise HTTPException(status_code=404, detail="Nenhuma cadência ativa neste card.")
    return result


@router.post(
    "/cards/{card_id}/start",
    response_model=CardCadenceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Iniciar cadência em um card",
    dependencies=[Depends(require_not_viewer)],
)
def start_cadence(
    card_id: int,
    data: CardCadenceStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return CadenceService(db).start(card_id, data.template_id, current_user)


@router.post(
    "/cards/{card_id}/pause",
    response_model=CardCadenceResponse,
    summary="Pausar cadência de um card",
    dependencies=[Depends(require_not_viewer)],
)
def pause_cadence(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return CadenceService(db).pause(card_id, current_user)


@router.post(
    "/cards/{card_id}/resume",
    response_model=CardCadenceResponse,
    summary="Retomar cadência pausada de um card",
    dependencies=[Depends(require_not_viewer)],
)
def resume_cadence(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return CadenceService(db).resume(card_id, current_user)


@router.post(
    "/cards/{card_id}/cancel",
    response_model=CardCadenceResponse,
    summary="Cancelar cadência de um card",
    dependencies=[Depends(require_not_viewer)],
)
def cancel_cadence(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return CadenceService(db).cancel(card_id, current_user)
