"""Repository do catálogo de Serviços. Espelha a parte de catálogo de product_repository."""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List, Tuple

from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceUpdate


class ServiceRepository:
    """Operações de catálogo de Serviços."""

    def __init__(self, db: Session):
        self.db = db

    def create_service(self, data: ServiceCreate) -> Service:
        service = Service(**data.model_dump())
        self.db.add(service)
        self.db.commit()
        self.db.refresh(service)
        return service

    def get_service_by_id(self, service_id: int) -> Optional[Service]:
        return (
            self.db.query(Service)
            .filter(Service.id == service_id, Service.is_deleted == False)  # noqa: E712
            .first()
        )

    def get_service_by_sku(self, sku: str) -> Optional[Service]:
        return (
            self.db.query(Service)
            .filter(Service.sku == sku, Service.is_deleted == False)  # noqa: E712
            .first()
        )

    def list_services(
        self,
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[Service], int]:
        query = self.db.query(Service).filter(Service.is_deleted == False)  # noqa: E712

        if search:
            like = f"%{search}%"
            query = query.filter(or_(
                Service.name.ilike(like),
                Service.description.ilike(like),
                Service.sku.ilike(like),
            ))
        if category:
            query = query.filter(Service.category == category)
        if is_active is not None:
            query = query.filter(Service.is_active == is_active)

        total = query.count()
        query = query.order_by(Service.name.asc())
        offset = (page - 1) * page_size
        services = query.offset(offset).limit(page_size).all()
        return services, total

    def update_service(self, service_id: int, data: ServiceUpdate) -> Optional[Service]:
        service = self.get_service_by_id(service_id)
        if not service:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(service, field, value)
        self.db.commit()
        self.db.refresh(service)
        return service

    def delete_service(self, service_id: int) -> bool:
        """Soft delete: marca como deletado e inativo."""
        service = self.get_service_by_id(service_id)
        if not service:
            return False
        service.is_deleted = True
        service.is_active = False
        self.db.commit()
        return True
