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
from app.api.deps import get_current_active_user, require_not_viewer

router = APIRouter()


# ========== PRODUCT CATALOG ==========

@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar produto no catálogo",
    description="""
    Cria um novo produto no catálogo de produtos da empresa.

    **Campos obrigatórios:**
    - `name`: Nome do produto
    - `unit_price`: Preço unitário em BRL

    **Campos opcionais:**
    - `description`: Descrição detalhada do produto
    - `sku`: Código SKU único do produto
    - `currency`: Moeda (padrão: BRL)
    - `category`: Categoria do produto
    - `is_active`: Se o produto está ativo (padrão: true)

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        201: {
            "description": "Produto criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Software de Gestão - Plano Mensal",
                        "description": "Licença mensal do software completo",
                        "sku": "SW-GEST-MENSAL",
                        "unit_price": 499.00,
                        "currency": "BRL",
                        "category": "Software",
                        "is_active": True,
                        "created_at": "2026-01-15T10:00:00",
                        "updated_at": None
                    }
                }
            }
        },
        400: {
            "description": "SKU já cadastrado",
            "content": {
                "application/json": {
                    "example": {"detail": "SKU já cadastrado"}
                }
            }
        },
        422: {
            "description": "Dados inválidos",
            "content": {
                "application/json": {
                    "example": {"detail": "Erro de validação nos dados enviados"}
                }
            }
        }
    }
)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer())
):
    """
    Cria um novo produto no catálogo.
    """
    service = ProductService(db)
    return service.create_product(product_data, current_user)


@router.get(
    "",
    response_model=ProductListResponse,
    summary="Listar produtos do catálogo",
    description="""
    Lista produtos do catálogo com filtros e paginação.

    **Filtros disponíveis:**
    - `search`: Busca por nome, descrição ou SKU (busca parcial)
    - `category`: Filtrar por categoria exata
    - `is_active`: Filtrar por produtos ativos/inativos (padrão: true)

    **Paginação:**
    - `page`: Número da página (padrão: 1)
    - `page_size`: Itens por página (padrão: 50)

    **Retorna:**
    - Lista paginada de produtos
    - Metadados de paginação

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Lista de produtos",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": 1,
                                "name": "Software de Gestão - Plano Mensal",
                                "sku": "SW-GEST-MENSAL",
                                "unit_price": 499.00,
                                "currency": "BRL",
                                "category": "Software",
                                "is_active": True
                            },
                            {
                                "id": 2,
                                "name": "Consultoria Estratégica",
                                "sku": "CONS-ESTRAT",
                                "unit_price": 2500.00,
                                "currency": "BRL",
                                "category": "Serviços",
                                "is_active": True
                            }
                        ],
                        "total": 25,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 1
                    }
                }
            }
        }
    }
)
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


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Buscar produto por ID",
    description="""
    Busca um produto específico do catálogo pelo seu ID.

    **Parâmetros:**
    - `product_id`: ID do produto

    **Retorna:**
    - Dados completos do produto

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Produto encontrado",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Software de Gestão - Plano Mensal",
                        "description": "Licença mensal do software completo",
                        "sku": "SW-GEST-MENSAL",
                        "unit_price": 499.00,
                        "currency": "BRL",
                        "category": "Software",
                        "is_active": True,
                        "created_at": "2026-01-15T10:00:00"
                    }
                }
            }
        },
        404: {
            "description": "Produto não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Produto não encontrado"}
                }
            }
        }
    }
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Busca um produto por ID."""
    service = ProductService(db)
    return service.get_product(product_id)


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Atualizar produto do catálogo",
    description="""
    Atualiza um produto existente no catálogo. Apenas campos fornecidos serão atualizados.

    **Campos atualizáveis:**
    - `name`: Nome do produto
    - `description`: Descrição
    - `sku`: Código SKU
    - `unit_price`: Preço unitário
    - `currency`: Moeda
    - `category`: Categoria
    - `is_active`: Status ativo/inativo

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Produto atualizado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Software de Gestão - Plano Anual",
                        "description": "Licença anual do software completo com desconto",
                        "sku": "SW-GEST-ANUAL",
                        "unit_price": 4990.00,
                        "currency": "BRL",
                        "category": "Software",
                        "is_active": True,
                        "updated_at": "2026-01-16T09:00:00"
                    }
                }
            }
        },
        404: {
            "description": "Produto não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Produto não encontrado"}
                }
            }
        },
        422: {
            "description": "Dados inválidos",
            "content": {
                "application/json": {
                    "example": {"detail": "Erro de validação nos dados enviados"}
                }
            }
        }
    }
)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer())
):
    """
    Atualiza um produto do catálogo.

    Apenas campos fornecidos serão atualizados.
    """
    service = ProductService(db)
    return service.update_product(product_id, product_data, current_user)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    summary="Deletar produto do catálogo",
    description="""
    Realiza soft delete de um produto do catálogo (marca como inativo).

    **Parâmetros:**
    - `product_id`: ID do produto

    **Comportamento:**
    - O produto **não é removido** do banco de dados
    - É marcado como `is_active = false`
    - Produtos vinculados a cards existentes permanecem visíveis

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Produto desativado com sucesso",
            "content": {
                "application/json": {
                    "example": {"message": "Produto deletado com sucesso"}
                }
            }
        },
        404: {
            "description": "Produto não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Produto não encontrado"}
                }
            }
        }
    }
)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer())
):
    """
    Deleta um produto do catálogo (soft delete).

    O produto será marcado como inativo.
    """
    service = ProductService(db)
    return service.delete_product(product_id, current_user)


# ========== CARD PRODUCTS ==========

@router.post(
    "/cards/{card_id}",
    response_model=CardProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar produto a um card",
    description="""
    Adiciona um produto do catálogo a um card (oportunidade/negociação).

    **Parâmetros:**
    - `card_id`: ID do card
    - `product_id`: ID do produto no catálogo
    - `quantity`: Quantidade (padrão: 1)
    - `unit_price`: Preço unitário (pode diferir do catálogo para negociações especiais)
    - `discount`: Valor do desconto em BRL (padrão: 0)
    - `notes`: Observações sobre o produto neste card

    **Comportamento:**
    - O subtotal é calculado automaticamente: `quantity * unit_price`
    - O total é: `subtotal - discount`

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        201: {
            "description": "Produto adicionado ao card com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "card_id": 42,
                        "product_id": 1,
                        "product_name": "Software de Gestão - Plano Mensal",
                        "quantity": 2,
                        "unit_price": 499.00,
                        "discount": 50.00,
                        "subtotal": 998.00,
                        "total": 948.00,
                        "notes": "Desconto especial para parceiro",
                        "created_at": "2026-01-15T14:30:00"
                    }
                }
            }
        },
        404: {
            "description": "Card ou produto não encontrado",
            "content": {
                "application/json": {
                    "examples": {
                        "card": {"value": {"detail": "Card não encontrado"}},
                        "product": {"value": {"detail": "Produto não encontrado"}}
                    }
                }
            }
        },
        422: {
            "description": "Dados inválidos",
            "content": {
                "application/json": {
                    "example": {"detail": "Erro de validação nos dados enviados"}
                }
            }
        }
    }
)
def add_product_to_card(
    card_id: int,
    card_product_data: CardProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer())
):
    """
    Adiciona um produto a um card.
    """
    service = ProductService(db)
    return service.add_product_to_card(card_id, card_product_data, current_user)


@router.get(
    "/cards/{card_id}",
    response_model=CardProductSummary,
    summary="Listar produtos de um card com totais",
    description="""
    Lista todos os produtos vinculados a um card com resumo financeiro.

    **Parâmetros:**
    - `card_id`: ID do card

    **Retorna:**
    - `items`: Lista de produtos do card
    - `total_items`: Quantidade total de itens
    - `subtotal`: Soma dos subtotais (quantidade x preço unitário)
    - `total_discount`: Soma de todos os descontos
    - `total`: Valor total final (subtotal - descontos)

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Produtos do card com resumo",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": 1,
                                "product_name": "Software de Gestão - Plano Mensal",
                                "quantity": 2,
                                "unit_price": 499.00,
                                "discount": 50.00,
                                "subtotal": 998.00,
                                "total": 948.00
                            },
                            {
                                "id": 2,
                                "product_name": "Consultoria Estratégica",
                                "quantity": 1,
                                "unit_price": 2500.00,
                                "discount": 0,
                                "subtotal": 2500.00,
                                "total": 2500.00
                            }
                        ],
                        "total_items": 2,
                        "subtotal": 3498.00,
                        "total_discount": 50.00,
                        "total": 3448.00
                    }
                }
            }
        },
        404: {
            "description": "Card não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Card não encontrado"}
                }
            }
        }
    }
)
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


@router.put(
    "/cards/items/{card_product_id}",
    response_model=CardProductResponse,
    summary="Atualizar produto do card",
    description="""
    Atualiza os dados de um produto vinculado a um card.

    **Parâmetros:**
    - `card_product_id`: ID do item (produto no card)

    **Campos atualizáveis:**
    - `quantity`: Quantidade
    - `unit_price`: Preço unitário
    - `discount`: Valor do desconto
    - `notes`: Observações

    **Comportamento:**
    - Subtotal e total são recalculados automaticamente

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Produto do card atualizado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "card_id": 42,
                        "product_name": "Software de Gestão - Plano Mensal",
                        "quantity": 5,
                        "unit_price": 450.00,
                        "discount": 250.00,
                        "subtotal": 2250.00,
                        "total": 2000.00,
                        "notes": "Desconto de volume - 5 licenças"
                    }
                }
            }
        },
        404: {
            "description": "Item não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Produto do card não encontrado"}
                }
            }
        },
        422: {
            "description": "Dados inválidos",
            "content": {
                "application/json": {
                    "example": {"detail": "Erro de validação nos dados enviados"}
                }
            }
        }
    }
)
def update_card_product(
    card_product_id: int,
    card_product_data: CardProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer())
):
    """
    Atualiza um produto do card.

    Permite alterar quantidade, preço unitário, desconto e observações.
    """
    service = ProductService(db)
    return service.update_card_product(card_product_id, card_product_data, current_user)


@router.delete(
    "/cards/items/{card_product_id}",
    status_code=status.HTTP_200_OK,
    summary="Remover produto de um card",
    description="""
    Remove um produto de um card (oportunidade/negociação).

    **Parâmetros:**
    - `card_product_id`: ID do item (produto no card)

    **Comportamento:**
    - Remove permanentemente o vínculo do produto com o card
    - O produto permanece no catálogo
    - Os totais do card são recalculados automaticamente

    **Permissões:** Qualquer usuário autenticado
    """,
    responses={
        200: {
            "description": "Produto removido do card com sucesso",
            "content": {
                "application/json": {
                    "example": {"message": "Produto removido do card com sucesso"}
                }
            }
        },
        404: {
            "description": "Item não encontrado",
            "content": {
                "application/json": {
                    "example": {"detail": "Produto do card não encontrado"}
                }
            }
        }
    }
)
def remove_product_from_card(
    card_product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer())
):
    """Remove um produto de um card."""
    service = ProductService(db)
    return service.remove_product_from_card(card_product_id, current_user)
