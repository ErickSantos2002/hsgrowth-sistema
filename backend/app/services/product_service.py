"""
Service para Products - Lógica de negócio para produtos.
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import HTTPException, status
import math

from app.repositories.product_repository import ProductRepository
from app.repositories.card_repository import CardRepository
from app.models.product import Product
from app.models.card_product import CardProduct
from app.models.user import User
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


class ProductService:
    """Service para operações de Products"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = ProductRepository(db)

    # ========== PRODUCT CATALOG ==========

    def create_product(
        self,
        product_data: ProductCreate,
        current_user: User
    ) -> ProductResponse:
        """Cria um novo produto no catálogo"""
        # TODO: Verificar se o usuário tem permissão para criar produtos

        # Verifica se já existe um produto com o mesmo SKU
        if product_data.sku:
            existing = self.repository.get_product_by_sku(product_data.sku)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe um produto com o SKU '{product_data.sku}'"
                )

        product = self.repository.create_product(product_data)

        # TODO: Criar evento de auditoria

        return self._build_product_response(product)

    def get_product(self, product_id: int) -> ProductResponse:
        """Busca um produto por ID"""
        product = self.repository.get_product_by_id(product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {product_id} não encontrado"
            )

        return self._build_product_response(product)

    def list_products(
        self,
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None,
        category: Optional[str] = None,
        is_active: Optional[bool] = True
    ) -> ProductListResponse:
        """Lista produtos com filtros"""
        products, total = self.repository.list_products(
            page=page,
            page_size=page_size,
            search=search,
            category=category,
            is_active=is_active
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 0

        return ProductListResponse(
            products=[self._build_product_response(p) for p in products],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def update_product(
        self,
        product_id: int,
        product_data: ProductUpdate,
        current_user: User
    ) -> ProductResponse:
        """Atualiza um produto"""
        product = self.repository.get_product_by_id(product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {product_id} não encontrado"
            )

        # TODO: Verificar permissões

        # Se está mudando o SKU, verifica se já existe outro produto com esse SKU
        if product_data.sku and product_data.sku != product.sku:
            existing = self.repository.get_product_by_sku(product_data.sku)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe um produto com o SKU '{product_data.sku}'"
                )

        updated_product = self.repository.update_product(product_id, product_data)

        # TODO: Criar evento de auditoria

        return self._build_product_response(updated_product)

    def delete_product(
        self,
        product_id: int,
        current_user: User
    ) -> dict:
        """Deleta um produto (soft delete)"""
        product = self.repository.get_product_by_id(product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {product_id} não encontrado"
            )

        # TODO: Verificar permissões

        success = self.repository.delete_product(product_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao deletar produto"
            )

        # TODO: Criar evento de auditoria

        return {"message": "Produto deletado com sucesso"}

    # ========== CARD PRODUCTS ==========

    def add_product_to_card(
        self,
        card_id: int,
        card_product_data: CardProductCreate,
        current_user: User
    ) -> CardProductResponse:
        """Adiciona um produto a um card"""
        # TODO: Verificar se o card existe e se o usuário tem permissão

        # Verifica se o produto existe
        product = self.repository.get_product_by_id(card_product_data.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {card_product_data.product_id} não encontrado"
            )

        # Verifica se o produto já está no card
        existing = self.repository.get_card_product_by_card_and_product(
            card_id,
            card_product_data.product_id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O produto '{product.name}' já está adicionado neste card"
            )

        card_product = self.repository.add_product_to_card(card_id, card_product_data)

        # TODO: Criar evento de auditoria

        # Atualiza o valor total do card
        self._sync_card_value_with_products(card_id)

        return self._build_card_product_response(card_product)

    def get_card_products(self, card_id: int) -> CardProductSummary:
        """Lista produtos de um card com totais"""
        # TODO: Verificar se o usuário tem acesso ao card

        card_products = self.repository.list_card_products(card_id)
        totals = self.repository.get_card_products_total(card_id)

        return CardProductSummary(
            items=[self._build_card_product_response(cp) for cp in card_products],
            total_items=totals["total_items"],
            subtotal=totals["subtotal"],
            total_discount=totals["total_discount"],
            total=totals["total"]
        )

    def update_card_product(
        self,
        card_product_id: int,
        card_product_data: CardProductUpdate,
        current_user: User
    ) -> CardProductResponse:
        """Atualiza um produto do card"""
        card_product = self.repository.get_card_product_by_id(card_product_id)

        if not card_product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto do card {card_product_id} não encontrado"
            )

        # TODO: Verificar permissões

        updated_card_product = self.repository.update_card_product(
            card_product_id,
            card_product_data
        )

        # TODO: Criar evento de auditoria

        # Atualiza o valor total do card
        self._sync_card_value_with_products(card_product.card_id)

        return self._build_card_product_response(updated_card_product)

    def remove_product_from_card(
        self,
        card_product_id: int,
        current_user: User
    ) -> dict:
        """Remove um produto de um card"""
        card_product = self.repository.get_card_product_by_id(card_product_id)

        if not card_product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto do card {card_product_id} não encontrado"
            )

        # TODO: Verificar permissões

        # Guarda o card_id antes de remover
        card_id = card_product.card_id

        success = self.repository.remove_product_from_card(card_product_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao remover produto do card"
            )

        # TODO: Criar evento de auditoria

        # Atualiza o valor total do card
        self._sync_card_value_with_products(card_id)

        return {"message": "Produto removido do card com sucesso"}

    # ========== HELPER METHODS ==========

    def _sync_card_value_with_products(self, card_id: int) -> None:
        """
        Sincroniza o valor do card com o total de produtos.
        Atualiza automaticamente o campo 'value' do card.
        """
        # Calcula o total de produtos
        totals = self.repository.get_card_products_total(card_id)
        total_value = totals["total"]

        # Atualiza o valor do card
        card_repo = CardRepository(self.db)
        card = card_repo.find_by_id(card_id)
        if card:
            card.value = total_value
            self.db.commit()

    def _build_product_response(self, product: Product) -> ProductResponse:
        """Constrói o schema de resposta de produto"""
        return ProductResponse(
            id=product.id,
            name=product.name,
            description=product.description,
            sku=product.sku,
            unit_price=float(product.unit_price),
            currency=product.currency,
            category=product.category,
            is_active=product.is_active,
            created_at=product.created_at,
            updated_at=product.updated_at
        )

    def _build_card_product_response(self, card_product: CardProduct) -> CardProductResponse:
        """Constrói o schema de resposta de produto do card"""
        response_data = {
            "id": card_product.id,
            "card_id": card_product.card_id,
            "product_id": card_product.product_id,
            "quantity": card_product.quantity,
            "unit_price": float(card_product.unit_price),
            "discount": float(card_product.discount),
            "notes": card_product.notes,
            "subtotal": card_product.subtotal,
            "total": card_product.total,
            "created_at": card_product.created_at,
            "updated_at": card_product.updated_at
        }

        # Adiciona informações do produto se disponível
        if hasattr(card_product, 'product') and card_product.product:
            response_data["product_name"] = card_product.product.name
            response_data["product_sku"] = card_product.product.sku
            response_data["product_category"] = card_product.product.category

        return CardProductResponse(**response_data)
