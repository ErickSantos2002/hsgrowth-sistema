"""
Catálogo de EQUIPAMENTOS do módulo de Serviços (`service_products`).

Separado do catálogo de Vendas (`/products`) de propósito — ver
`app/models/service_product.py`. Aqui ficam os aparelhos do cliente que estão em
serviço; lá fica o que a empresa vende.

A maior parte das entradas nasce sozinha, criada pela integração com o GestorHS a
partir do modelo do aparelho. Este router existe para o seletor do card conseguir
listá-las, e para permitir cadastro manual do que não vier de lá.
"""
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_not_viewer
from app.models.service_product import ServiceProduct
from app.models.user import User
from app.schemas.service_product import (
    ServiceProductCreate,
    ServiceProductResponse,
    ServiceProductUpdate,
)

router = APIRouter()


@router.get("", response_model=List[ServiceProductResponse])
async def list_service_products(
    search: Optional[str] = Query(None, description="Busca por nome, SKU ou categoria"),
    is_active: Optional[bool] = Query(True),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
) -> Any:
    """Lista o catálogo de equipamentos de Serviços, ordenado por nome."""
    q = db.query(ServiceProduct).filter(ServiceProduct.is_deleted.is_(False))

    if is_active is not None:
        q = q.filter(ServiceProduct.is_active.is_(is_active))

    if search:
        termo = f"%{search.strip()}%"
        q = q.filter(or_(
            ServiceProduct.name.ilike(termo),
            ServiceProduct.sku.ilike(termo),
            ServiceProduct.category.ilike(termo),
        ))

    return q.order_by(ServiceProduct.name).limit(limit).all()


@router.post("", response_model=ServiceProductResponse, status_code=status.HTTP_201_CREATED)
async def create_service_product(
    data: ServiceProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer()),
) -> Any:
    """Cadastra um equipamento à mão (o que não vier da integração)."""
    item = ServiceProduct(**data.model_dump(exclude_unset=True))
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{product_id}", response_model=ServiceProductResponse)
async def update_service_product(
    product_id: int,
    data: ServiceProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer()),
) -> Any:
    item = (
        db.query(ServiceProduct)
        .filter(ServiceProduct.id == product_id, ServiceProduct.is_deleted.is_(False))
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipamento {product_id} não encontrado",
        )

    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(item, campo, valor)
    db.commit()
    db.refresh(item)
    return item
