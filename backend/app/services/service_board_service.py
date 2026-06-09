"""
Service para lógica de negócio de ServiceBoard, ServiceList e ServiceCard.
"""
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.service_board_repository import ServiceBoardRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.service_board import (
    ServiceBoardCreate, ServiceBoardUpdate, ServiceBoardResponse, ServiceBoardListResponse,
    ServiceListCreate, ServiceListUpdate, ServiceListResponse,
    ServiceCardCreate, ServiceCardUpdate, ServiceCardResponse, ServiceCardListResponse,
    ServiceCardProductCreate, ServiceCardProductUpdate,
    ServiceCardProductResponse, ServiceCardProductSummary,
)
from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.service_card import ServiceCard
from app.models.service_card_product import ServiceCardProduct
from app.models.user import User


class ServiceBoardService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ServiceBoardRepository(db)

    # ─── Board ────────────────────────────────────────────────────────────────

    def get_board(self, board_id: int) -> ServiceBoard:
        board = self.repo.find_board_by_id(board_id)
        if not board:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board de serviços não encontrado")
        return board

    def list_boards(
        self,
        page: int = 1,
        page_size: int = 50,
        is_deleted: Optional[bool] = None,
    ) -> ServiceBoardListResponse:
        skip = (page - 1) * page_size
        boards = self.repo.list_boards(skip=skip, limit=page_size, is_deleted=is_deleted)
        total = self.repo.count_boards(is_deleted=is_deleted)
        total_pages = max(1, (total + page_size - 1) // page_size)

        items = []
        for b in boards:
            lists_count = self.repo.count_lists_by_board(b.id)
            cards_count = self.repo.count_cards_by_board(b.id)
            items.append(ServiceBoardResponse(
                id=b.id,
                name=b.name,
                description=b.description,
                color=b.color,
                icon=b.icon,
                is_deleted=b.is_deleted,
                created_at=b.created_at,
                updated_at=b.updated_at,
                lists_count=lists_count,
                cards_count=cards_count,
            ))

        return ServiceBoardListResponse(
            boards=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    def create_board(self, data: ServiceBoardCreate, user: User) -> ServiceBoard:
        return self.repo.create_board(data)

    def update_board(self, board_id: int, data: ServiceBoardUpdate, user: User) -> ServiceBoard:
        board = self.get_board(board_id)
        return self.repo.update_board(board, data)

    def delete_board(self, board_id: int, user: User) -> None:
        board = self.get_board(board_id)
        self.repo.delete_board(board)

    def duplicate_board(self, board_id: int, new_name: str, copy_lists: bool, user: User) -> ServiceBoard:
        board = self.get_board(board_id)
        new_board = self.repo.duplicate_board(board, new_name)
        if copy_lists:
            for lst in self.repo.list_lists_by_board(board_id):
                self.repo.create_list(ServiceListCreate(
                    board_id=new_board.id,
                    name=lst.name,
                    color=lst.color,
                    position=lst.position,
                    is_done_stage=lst.is_done_stage,
                    is_lost_stage=lst.is_lost_stage,
                ))
        return new_board

    # ─── List ─────────────────────────────────────────────────────────────────

    def get_list(self, list_id: int) -> ServiceList:
        lst = self.repo.find_list_by_id(list_id)
        if not lst:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lista de serviços não encontrada")
        return lst

    def list_lists(self, board_id: int) -> List[ServiceListResponse]:
        self.get_board(board_id)
        lists = self.repo.list_lists_by_board(board_id)
        return [
            ServiceListResponse(
                id=l.id,
                board_id=l.board_id,
                name=l.name,
                color=l.color,
                position=l.position,
                is_done_stage=l.is_done_stage,
                is_lost_stage=l.is_lost_stage,
                created_at=l.created_at,
                updated_at=l.updated_at,
            )
            for l in lists
        ]

    def create_list(self, data: ServiceListCreate, user: User) -> ServiceList:
        self.get_board(data.board_id)
        return self.repo.create_list(data)

    def update_list(self, list_id: int, data: ServiceListUpdate, user: User) -> ServiceList:
        lst = self.get_list(list_id)
        return self.repo.update_list(lst, data)

    def delete_list(self, list_id: int, user: User) -> None:
        lst = self.get_list(list_id)
        self.repo.delete_list(lst)

    def move_list(self, list_id: int, new_position: int, user: User) -> ServiceList:
        self.get_list(list_id)
        return self.repo.move_list(list_id, new_position)

    # ─── Card ─────────────────────────────────────────────────────────────────

    def get_card(self, card_id: int) -> ServiceCard:
        card = self.repo.find_card_by_id(card_id)
        if not card:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card de serviços não encontrado")
        return card

    def list_cards(self, board_id: int, page: int = 1, page_size: int = 200) -> ServiceCardListResponse:
        self.get_board(board_id)
        skip = (page - 1) * page_size
        cards = self.repo.list_cards_by_board(board_id, skip=skip, limit=page_size)
        total = self.repo.count_cards_by_board(board_id)
        total_pages = max(1, (total + page_size - 1) // page_size)

        items = [
            ServiceCardResponse(
                id=c.id,
                list_id=c.list_id,
                title=c.title,
                description=c.description,
                assigned_to_id=c.assigned_to_id,
                due_date=c.due_date,
                contact_info=c.contact_info,
                payment_info=c.payment_info,
                client_id=c.client_id,
                person_id=c.person_id,
                client_name=c.client.name if c.client else None,
                person_name=c.person.name if c.person else None,
                position=float(c.position or 0),
                is_deleted=c.is_deleted,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in cards
        ]

        return ServiceCardListResponse(
            cards=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    def create_card(self, data: ServiceCardCreate, user: User) -> ServiceCard:
        self.get_list(data.list_id)
        return self.repo.create_card(data)

    def update_card(self, card_id: int, data: ServiceCardUpdate, user: User) -> ServiceCard:
        card = self.get_card(card_id)
        return self.repo.update_card(card, data)

    def delete_card(self, card_id: int, user: User) -> None:
        card = self.get_card(card_id)
        self.repo.delete_card(card)

    def move_card(self, card_id: int, new_list_id: int, new_position: Optional[float], user: User) -> ServiceCard:
        self.get_card(card_id)
        self.get_list(new_list_id)
        return self.repo.move_card(card_id, new_list_id, new_position)

    # ─── Card Products ────────────────────────────────────────────────────────

    def _build_card_product_response(self, item: ServiceCardProduct) -> ServiceCardProductResponse:
        return ServiceCardProductResponse(
            id=item.id,
            service_card_id=item.service_card_id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            notes=item.notes,
            subtotal=item.subtotal,
            total=item.total,
            created_at=item.created_at,
            updated_at=item.updated_at,
            product_name=item.product.name if item.product else None,
            product_sku=item.product.sku if item.product else None,
            product_category=item.product.category if item.product else None,
        )

    def get_card_products(self, card_id: int) -> ServiceCardProductSummary:
        self.get_card(card_id)
        items = self.repo.list_card_products(card_id)
        subtotal = sum(i.subtotal for i in items)
        total_discount = sum(float(i.discount) for i in items)
        total = sum(i.total for i in items)
        return ServiceCardProductSummary(
            items=[self._build_card_product_response(i) for i in items],
            total_items=len(items),
            subtotal=subtotal,
            total_discount=total_discount,
            total=total,
        )

    def add_card_product(
        self, card_id: int, data: ServiceCardProductCreate, user: User
    ) -> ServiceCardProductResponse:
        self.get_card(card_id)

        product = ProductRepository(self.db).get_product_by_id(data.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {data.product_id} não encontrado",
            )

        existing = self.repo.get_card_product_by_card_and_product(card_id, data.product_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O produto '{product.name}' já está adicionado neste card",
            )

        item = self.repo.add_card_product(card_id, data)
        return self._build_card_product_response(item)

    def update_card_product(
        self, item_id: int, data: ServiceCardProductUpdate, user: User
    ) -> ServiceCardProductResponse:
        item = self.repo.get_card_product_by_id(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto do card {item_id} não encontrado",
            )
        updated = self.repo.update_card_product(item_id, data)
        return self._build_card_product_response(updated)

    def remove_card_product(self, item_id: int, user: User) -> dict:
        item = self.repo.get_card_product_by_id(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto do card {item_id} não encontrado",
            )
        self.repo.remove_card_product(item_id)
        return {"message": "Produto removido do card com sucesso"}
