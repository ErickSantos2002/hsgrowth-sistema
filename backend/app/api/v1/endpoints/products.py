"""
Endpoints da API para Products (Produtos).
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.services.product_service import ProductService
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    CardProductCreate,
    CardProductUpdate,
    CardProductResponse,
    CardProductSummary
)
from app.models.user import User
from app.api.deps import get_current_active_user

router = APIRouter()


# ========== PRODUCT CATALOG ==========

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Cria um novo produto no catálogo.

    **Exemplo:**
    ```json
    {
      "name": "Software de Gestão - Plano Mensal",
      "description": "Licença mensal do software completo",
      "sku": "SW-GEST-MENSAL",
      "unit_price": 499.00,
      "currency": "BRL",
      "category": "Software",
      "is_active": true
    }
    ```
    """
    service = ProductService(db)
    return service.create_product(product_data, current_user)


@router.get("", response_model=ProductListResponse)
def list_products(
    page: int = 1,
    page_size: int = 50,
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lista produtos do catálogo com filtros.

    **Filtros disponíveis:**
    - search: Busca por nome, descrição ou SKU
    - category: Filtrar por categoria
    - is_active: Filtrar por produtos ativos/inativos
    """
    service = ProductService(db)
    return service.list_products(
        page=page,
        page_size=page_size,
        search=search,
        category=category,
        is_active=is_active
    )


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Busca um produto por ID"""
    service = ProductService(db)
    return service.get_product(product_id)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Atualiza um produto do catálogo.

    Apenas campos fornecidos serão atualizados.
    """
    service = ProductService(db)
    return service.update_product(product_id, product_data, current_user)


@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Deleta um produto do catálogo (soft delete).

    O produto será marcado como inativo.
    """
    service = ProductService(db)
    return service.delete_product(product_id, current_user)


# ========== CARD PRODUCTS ==========

@router.post("/cards/{card_id}", response_model=CardProductResponse, status_code=status.HTTP_201_CREATED)
def add_product_to_card(
    card_id: int,
    card_product_data: CardProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Adiciona um produto a um card.

    **Exemplo:**
    ```json
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 499.00,
      "discount": 50.00,
      "notes": "Desconto especial para parceiro"
    }
    ```
    """
    service = ProductService(db)
    return service.add_product_to_card(card_id, card_product_data, current_user)


@router.get("/cards/{card_id}", response_model=CardProductSummary)
def get_card_products(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lista todos os produtos de um card com totais.

    Retorna a lista de produtos e um resumo com:
    - total_items: Quantidade de produtos
    - subtotal: Soma dos subtotais
    - total_discount: Soma dos descontos
    - total: Valor total
    """
    service = ProductService(db)
    return service.get_card_products(card_id)


@router.put("/cards/items/{card_product_id}", response_model=CardProductResponse)
def update_card_product(
    card_product_id: int,
    card_product_data: CardProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Atualiza um produto do card.

    Permite alterar quantidade, preço unitário, desconto e observações.
    """
    service = ProductService(db)
    return service.update_card_product(card_product_id, card_product_data, current_user)


@router.delete("/cards/items/{card_product_id}", status_code=status.HTTP_200_OK)
def remove_product_from_card(
    card_product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove um produto de um card"""
    service = ProductService(db)
    return service.remove_product_from_card(card_product_id, current_user)
