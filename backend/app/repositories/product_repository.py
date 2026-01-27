"""
Repository para Products - Gerenciamento de produtos e produtos em cards.
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import Optional, List, Tuple

from app.models.product import Product
from app.models.card_product import CardProduct
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    CardProductCreate,
    CardProductUpdate
)


class ProductRepository:
    """Repository para operações de Products"""

    def __init__(self, db: Session):
        self.db = db

    # ========== PRODUCT CATALOG ==========

    def create_product(self, product_data: ProductCreate) -> Product:
        """Cria um novo produto no catálogo"""
        product = Product(**product_data.model_dump())
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def get_product_by_id(self, product_id: int) -> Optional[Product]:
        """Busca um produto por ID"""
        return self.db.query(Product).filter(Product.id == product_id).first()

    def get_product_by_sku(self, sku: str) -> Optional[Product]:
        """Busca um produto por SKU"""
        return self.db.query(Product).filter(Product.sku == sku).first()

    def list_products(
        self,
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None,
        category: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[Product], int]:
        """
        Lista produtos com filtros e paginação.
        Retorna (lista_de_produtos, total_count)
        """
        query = self.db.query(Product)

        # Filtros
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.sku.ilike(search_term)
                )
            )

        if category:
            query = query.filter(Product.category == category)

        if is_active is not None:
            query = query.filter(Product.is_active == is_active)

        # Conta total
        total = query.count()

        # Ordenação e paginação
        query = query.order_by(Product.name.asc())
        offset = (page - 1) * page_size
        products = query.offset(offset).limit(page_size).all()

        return products, total

    def update_product(self, product_id: int, product_data: ProductUpdate) -> Optional[Product]:
        """Atualiza um produto"""
        product = self.get_product_by_id(product_id)
        if not product:
            return None

        update_data = product_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)

        self.db.commit()
        self.db.refresh(product)
        return product

    def delete_product(self, product_id: int) -> bool:
        """Deleta um produto (soft delete)"""
        product = self.get_product_by_id(product_id)
        if not product:
            return False

        product.is_active = False
        self.db.commit()
        return True

    # ========== CARD PRODUCTS ==========

    def add_product_to_card(
        self,
        card_id: int,
        card_product_data: CardProductCreate
    ) -> CardProduct:
        """Adiciona um produto a um card"""
        card_product = CardProduct(
            card_id=card_id,
            **card_product_data.model_dump()
        )
        self.db.add(card_product)
        self.db.commit()
        self.db.refresh(card_product)
        return card_product

    def get_card_product_by_id(self, card_product_id: int) -> Optional[CardProduct]:
        """Busca um produto do card por ID"""
        return (
            self.db.query(CardProduct)
            .options(joinedload(CardProduct.product))
            .filter(CardProduct.id == card_product_id)
            .first()
        )

    def get_card_product_by_card_and_product(
        self,
        card_id: int,
        product_id: int
    ) -> Optional[CardProduct]:
        """Busca um produto específico de um card"""
        return (
            self.db.query(CardProduct)
            .options(joinedload(CardProduct.product))
            .filter(
                and_(
                    CardProduct.card_id == card_id,
                    CardProduct.product_id == product_id
                )
            )
            .first()
        )

    def list_card_products(self, card_id: int) -> List[CardProduct]:
        """Lista todos os produtos de um card"""
        return (
            self.db.query(CardProduct)
            .options(joinedload(CardProduct.product))
            .filter(CardProduct.card_id == card_id)
            .all()
        )

    def update_card_product(
        self,
        card_product_id: int,
        card_product_data: CardProductUpdate
    ) -> Optional[CardProduct]:
        """Atualiza um produto do card"""
        card_product = self.get_card_product_by_id(card_product_id)
        if not card_product:
            return None

        update_data = card_product_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(card_product, field, value)

        self.db.commit()
        self.db.refresh(card_product)
        return card_product

    def remove_product_from_card(self, card_product_id: int) -> bool:
        """Remove um produto de um card"""
        card_product = self.get_card_product_by_id(card_product_id)
        if not card_product:
            return False

        self.db.delete(card_product)
        self.db.commit()
        return True

    def get_card_products_total(self, card_id: int) -> dict:
        """Calcula o total dos produtos de um card"""
        card_products = self.list_card_products(card_id)

        total_items = len(card_products)
        subtotal = sum(cp.subtotal for cp in card_products)
        total_discount = sum(float(cp.discount) for cp in card_products)
        total = sum(cp.total for cp in card_products)

        return {
            "total_items": total_items,
            "subtotal": subtotal,
            "total_discount": total_discount,
            "total": total
        }
