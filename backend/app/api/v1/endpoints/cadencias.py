"""
Endpoints da API para Cadência de Atividades.
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.cadencia_service import CadenciaService
from app.schemas.cadencia import (
    CadenciaCreate,
    CadenciaUpdate,
    CadenciaResponse,
    TriggerResult,
)
from app.models.user import User
from app.api.deps import get_current_active_user, require_not_viewer

router = APIRouter()


@router.get(
    "/my",
    response_model=List[CadenciaResponse],
    summary="Listar minhas cadências",
)
def list_my_cadencias(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retorna todas as cadências do usuário logado."""
    return CadenciaService(db).list_my(current_user)


@router.post(
    "",
    response_model=CadenciaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar cadência",
    dependencies=[Depends(require_not_viewer)],
)
def create_cadencia(
    data: CadenciaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cria uma nova cadência para o usuário logado."""
    return CadenciaService(db).create(data, current_user)


@router.put(
    "/{cadencia_id}",
    response_model=CadenciaResponse,
    summary="Atualizar cadência",
    dependencies=[Depends(require_not_viewer)],
)
def update_cadencia(
    cadencia_id: int,
    data: CadenciaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Atualiza nome, status ou itens de uma cadência."""
    return CadenciaService(db).update(cadencia_id, data, current_user)


@router.delete(
    "/{cadencia_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover cadência",
    dependencies=[Depends(require_not_viewer)],
)
def delete_cadencia(
    cadencia_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Remove uma cadência do usuário."""
    CadenciaService(db).delete(cadencia_id, current_user)


@router.post(
    "/{cadencia_id}/trigger",
    response_model=TriggerResult,
    summary="Disparar cadência",
    dependencies=[Depends(require_not_viewer)],
)
def trigger_cadencia(
    cadencia_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Dispara a cadência: cria atividades pendentes nos cards mais antigos
    do usuário que ainda não têm atividade pendente daquele tipo.
    """
    return CadenciaService(db).trigger(cadencia_id, current_user)
