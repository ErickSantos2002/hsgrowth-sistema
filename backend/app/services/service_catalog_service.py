"""Service do catálogo de Serviços. Espelha a parte de catálogo de product_service."""
from sqlalchemy.orm import Session
from typing import Optional
from fastapi import HTTPException, status
import math

from app.repositories.service_repository import ServiceRepository
from app.models.service import Service
from app.models.user import User
from app.schemas.service import (
    ServiceCreate, ServiceUpdate, ServiceResponse, ServiceListResponse,
)


class ServiceCatalogService:
    """Lógica de negócio do catálogo de Serviços."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = ServiceRepository(db)

    def create_service(self, data: ServiceCreate, current_user: User) -> ServiceResponse:
        if data.sku:
            existing = self.repository.get_service_by_sku(data.sku)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe um serviço com o SKU '{data.sku}'",
                )
        service = self.repository.create_service(data)
        return self._build_service_response(service)

    def get_service(self, service_id: int) -> ServiceResponse:
        service = self.repository.get_service_by_id(service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Serviço {service_id} não encontrado")
        return self._build_service_response(service)

    def list_services(
        self,
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None,
        category: Optional[str] = None,
        is_active: Optional[bool] = True,
    ) -> ServiceListResponse:
        services, total = self.repository.list_services(
            page=page, page_size=page_size, search=search, category=category, is_active=is_active,
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        return ServiceListResponse(
            services=[self._build_service_response(s) for s in services],
            total=total, page=page, page_size=page_size, total_pages=total_pages,
        )

    def update_service(self, service_id: int, data: ServiceUpdate, current_user: User) -> ServiceResponse:
        service = self.repository.get_service_by_id(service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Serviço {service_id} não encontrado")
        if data.sku and data.sku != service.sku:
            existing = self.repository.get_service_by_sku(data.sku)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe um serviço com o SKU '{data.sku}'",
                )
        updated = self.repository.update_service(service_id, data)
        return self._build_service_response(updated)

    def delete_service(self, service_id: int, current_user: User) -> dict:
        service = self.repository.get_service_by_id(service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Serviço {service_id} não encontrado")
        self.repository.delete_service(service_id)
        return {"message": "Serviço removido com sucesso"}

    def _build_service_response(self, service: Service) -> ServiceResponse:
        return ServiceResponse(
            id=service.id,
            name=service.name,
            description=service.description,
            sku=service.sku,
            unit_price=float(service.unit_price),
            category=service.category,
            is_active=service.is_active,
            created_at=service.created_at,
            updated_at=service.updated_at,
        )
