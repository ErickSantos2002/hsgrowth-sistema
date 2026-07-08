"""Endpoints do catálogo de Serviços (módulo de Serviço)."""
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.service_catalog_service import ServiceCatalogService
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse, ServiceListResponse
from app.models.user import User
from app.api.deps import get_current_active_user

router = APIRouter()


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED, summary="Criar serviço")
def create_service(
    data: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return ServiceCatalogService(db).create_service(data, current_user)


@router.get("", response_model=ServiceListResponse, summary="Listar serviços")
def list_services(
    page: int = 1,
    page_size: int = 50,
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return ServiceCatalogService(db).list_services(
        page=page, page_size=page_size, search=search, category=category, is_active=is_active,
    )


@router.get("/{service_id}", response_model=ServiceResponse, summary="Buscar serviço")
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return ServiceCatalogService(db).get_service(service_id)


@router.put("/{service_id}", response_model=ServiceResponse, summary="Atualizar serviço")
def update_service(
    service_id: int,
    data: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return ServiceCatalogService(db).update_service(service_id, data, current_user)


@router.delete("/{service_id}", status_code=status.HTTP_200_OK, summary="Remover serviço")
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return ServiceCatalogService(db).delete_service(service_id, current_user)
