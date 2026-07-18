"""
Repository para ServiceBoard, ServiceList e ServiceCard.
"""
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload

from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.service_card import ServiceCard
from app.models.service_card_product import ServiceCardProduct
from app.models.service_card_service import ServiceCardService
from app.models.service_card_activity import ServiceCardActivity
from app.schemas.service_board import (
    ServiceBoardCreate, ServiceBoardUpdate,
    ServiceListCreate, ServiceListUpdate,
    ServiceCardCreate, ServiceCardUpdate,
    ServiceCardProductCreate, ServiceCardProductUpdate,
)
from app.schemas.service import ServiceCardServiceCreate, ServiceCardServiceUpdate


class ServiceBoardRepository:
    def __init__(self, db: Session):
        self.db = db

    # ─── Board ────────────────────────────────────────────────────────────────

    def find_board_by_id(self, board_id: int) -> Optional[ServiceBoard]:
        return self.db.query(ServiceBoard).filter(ServiceBoard.id == board_id).first()

    def list_boards(
        self,
        skip: int = 0,
        limit: int = 100,
        is_deleted: Optional[bool] = None,
    ) -> List[ServiceBoard]:
        q = self.db.query(ServiceBoard)
        if is_deleted is not None:
            q = q.filter(ServiceBoard.is_deleted == is_deleted)
        return q.order_by(ServiceBoard.id).offset(skip).limit(limit).all()

    def count_boards(self, is_deleted: Optional[bool] = None) -> int:
        q = self.db.query(ServiceBoard)
        if is_deleted is not None:
            q = q.filter(ServiceBoard.is_deleted == is_deleted)
        return q.count()

    def create_board(self, data: ServiceBoardCreate) -> ServiceBoard:
        board = ServiceBoard(
            name=data.name,
            description=data.description,
            color=data.color or "#8B5CF6",
            icon=data.icon or "wrench",
        )
        self.db.add(board)
        self.db.commit()
        self.db.refresh(board)
        return board

    def update_board(self, board: ServiceBoard, data: ServiceBoardUpdate) -> ServiceBoard:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(board, field, value)
        self.db.commit()
        self.db.refresh(board)
        return board

    def delete_board(self, board: ServiceBoard) -> None:
        self.db.delete(board)
        self.db.commit()

    def duplicate_board(self, board: ServiceBoard, new_name: str) -> ServiceBoard:
        new_board = ServiceBoard(
            name=new_name,
            description=board.description,
            color=board.color,
            icon=board.icon,
        )
        self.db.add(new_board)
        self.db.commit()
        self.db.refresh(new_board)
        return new_board

    # ─── List ─────────────────────────────────────────────────────────────────

    def find_list_by_id(self, list_id: int) -> Optional[ServiceList]:
        return self.db.query(ServiceList).filter(ServiceList.id == list_id).first()

    def list_lists_by_board(self, board_id: int) -> List[ServiceList]:
        return (
            self.db.query(ServiceList)
            .filter(ServiceList.board_id == board_id)
            .order_by(ServiceList.position)
            .all()
        )

    def count_lists_by_board(self, board_id: int) -> int:
        return self.db.query(ServiceList).filter(ServiceList.board_id == board_id).count()

    def create_list(self, data: ServiceListCreate) -> ServiceList:
        max_pos_row = (
            self.db.query(ServiceList)
            .filter(ServiceList.board_id == data.board_id)
            .order_by(ServiceList.position.desc())
            .first()
        )
        next_position = (max_pos_row.position + 1) if max_pos_row else 0
        lst = ServiceList(
            board_id=data.board_id,
            name=data.name,
            color=data.color,
            position=data.position if data.position is not None else next_position,
            is_done_stage=data.is_done_stage or False,
            is_lost_stage=data.is_lost_stage or False,
            is_entry_stage=data.is_entry_stage or False,
        )
        self.db.add(lst)
        self.db.commit()
        self.db.refresh(lst)
        return lst

    def update_list(self, lst: ServiceList, data: ServiceListUpdate) -> ServiceList:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(lst, field, value)
        self.db.commit()
        self.db.refresh(lst)
        return lst

    def delete_list(self, lst: ServiceList) -> None:
        self.db.delete(lst)
        self.db.commit()

    def move_list(self, list_id: int, new_position: int) -> ServiceList:
        lst = self.find_list_by_id(list_id)
        if not lst:
            return None

        all_lists = (
            self.db.query(ServiceList)
            .filter(ServiceList.board_id == lst.board_id)
            .order_by(ServiceList.position)
            .all()
        )
        all_lists = [l for l in all_lists if l.id != list_id]
        new_position = max(0, min(new_position, len(all_lists)))
        all_lists.insert(new_position, lst)

        for idx, l in enumerate(all_lists):
            l.position = idx

        self.db.commit()
        self.db.refresh(lst)
        return lst

    # ─── Card ─────────────────────────────────────────────────────────────────

    def find_card_by_id(self, card_id: int) -> Optional[ServiceCard]:
        return self.db.query(ServiceCard).filter(ServiceCard.id == card_id).first()

    def list_cards_by_board(
        self,
        board_id: int,
        skip: int = 0,
        limit: int = 200,
        is_deleted: Optional[bool] = False,
    ) -> List[ServiceCard]:
        list_ids = [
            l.id for l in self.db.query(ServiceList.id)
            .filter(ServiceList.board_id == board_id)
            .all()
        ]
        if not list_ids:
            return []
        q = self.db.query(ServiceCard).filter(ServiceCard.list_id.in_(list_ids))
        if is_deleted is not None:
            q = q.filter(ServiceCard.is_deleted == is_deleted)
        return q.order_by(ServiceCard.position).offset(skip).limit(limit).all()

    def count_cards_by_board(self, board_id: int, is_deleted: Optional[bool] = False) -> int:
        list_ids = [
            l.id for l in self.db.query(ServiceList.id)
            .filter(ServiceList.board_id == board_id)
            .all()
        ]
        if not list_ids:
            return 0
        q = self.db.query(ServiceCard).filter(ServiceCard.list_id.in_(list_ids))
        if is_deleted is not None:
            q = q.filter(ServiceCard.is_deleted == is_deleted)
        return q.count()

    def list_cards_by_list(
        self,
        list_id: int,
        is_deleted: Optional[bool] = False,
    ) -> List[ServiceCard]:
        q = self.db.query(ServiceCard).filter(ServiceCard.list_id == list_id)
        if is_deleted is not None:
            q = q.filter(ServiceCard.is_deleted == is_deleted)
        return q.order_by(ServiceCard.position).all()

    def find_entry_list(self, board_id: int) -> Optional[ServiceList]:
        """Lista de entrada do board (para cards vindos de integração). None se não configurada."""
        return (
            self.db.query(ServiceList)
            .filter(
                ServiceList.board_id == board_id,
                ServiceList.is_entry_stage.is_(True),
            )
            .order_by(ServiceList.position)
            .first()
        )

    def next_position(self, list_id: int) -> float:
        """Posição do fim da coluna. Extraído de create_card para ser reusado
        pelo caminho de integração (ver IntegrationCardService)."""
        ultimo = (
            self.db.query(ServiceCard)
            .filter(ServiceCard.list_id == list_id)
            .order_by(ServiceCard.position.desc())
            .first()
        )
        return float((ultimo.position or 0) + 1) if ultimo else 0.0

    def create_card(self, data: ServiceCardCreate) -> ServiceCard:
        next_position = self.next_position(data.list_id)
        card = ServiceCard(
            list_id=data.list_id,
            title=data.title,
            description=data.description,
            assigned_to_id=data.assigned_to_id,
            due_date=data.due_date,
            contact_info=data.contact_info,
            payment_info=data.payment_info,
            business_info=data.business_info,
            client_id=data.client_id,
            person_id=data.person_id,
            position=next_position,
        )
        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)
        return card

    def update_card(self, card: ServiceCard, data: ServiceCardUpdate) -> ServiceCard:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(card, field, value)
        self.db.commit()
        self.db.refresh(card)
        return card

    def delete_card(self, card: ServiceCard) -> None:
        self.db.delete(card)
        self.db.commit()

    def move_card(self, card_id: int, new_list_id: int, new_position: Optional[float]) -> ServiceCard:
        card = self.find_card_by_id(card_id)
        if not card:
            return None

        card.list_id = new_list_id
        if new_position is not None:
            card.position = new_position
        else:
            max_pos_row = (
                self.db.query(ServiceCard)
                .filter(ServiceCard.list_id == new_list_id, ServiceCard.id != card_id)
                .order_by(ServiceCard.position.desc())
                .first()
            )
            card.position = float((max_pos_row.position or 0) + 1) if max_pos_row else 0.0

        self.db.commit()
        self.db.refresh(card)
        return card

    # ─── Card Products ────────────────────────────────────────────────────────

    def list_card_products(self, card_id: int) -> List[ServiceCardProduct]:
        return (
            self.db.query(ServiceCardProduct)
            .options(joinedload(ServiceCardProduct.product))
            .filter(ServiceCardProduct.service_card_id == card_id)
            .order_by(ServiceCardProduct.id)
            .all()
        )

    def get_card_product_by_id(self, item_id: int) -> Optional[ServiceCardProduct]:
        return (
            self.db.query(ServiceCardProduct)
            .options(joinedload(ServiceCardProduct.product))
            .filter(ServiceCardProduct.id == item_id)
            .first()
        )

    def get_card_product_by_card_and_product(
        self, card_id: int, product_id: int
    ) -> Optional[ServiceCardProduct]:
        return (
            self.db.query(ServiceCardProduct)
            .filter(
                ServiceCardProduct.service_card_id == card_id,
                ServiceCardProduct.product_id == product_id,
            )
            .first()
        )

    def add_card_product(self, card_id: int, data: ServiceCardProductCreate) -> ServiceCardProduct:
        item = ServiceCardProduct(service_card_id=card_id, **data.model_dump())
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self.get_card_product_by_id(item.id)

    def update_card_product(
        self, item_id: int, data: ServiceCardProductUpdate
    ) -> Optional[ServiceCardProduct]:
        item = self.get_card_product_by_id(item_id)
        if not item:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        self.db.commit()
        self.db.refresh(item)
        return item

    def remove_card_product(self, item_id: int) -> bool:
        item = self.get_card_product_by_id(item_id)
        if not item:
            return False
        self.db.delete(item)
        self.db.commit()
        return True

    # ─── Card Services (mirror de Card Products, sem aparelhos) ──────────────────
    def list_card_services(self, card_id: int) -> List[ServiceCardService]:
        return (
            self.db.query(ServiceCardService)
            .options(joinedload(ServiceCardService.service))
            .filter(ServiceCardService.service_card_id == card_id)
            .order_by(ServiceCardService.id)
            .all()
        )

    def get_card_service_by_id(self, item_id: int) -> Optional[ServiceCardService]:
        return (
            self.db.query(ServiceCardService)
            .options(joinedload(ServiceCardService.service))
            .filter(ServiceCardService.id == item_id)
            .first()
        )

    def get_card_service_by_card_and_service(
        self, card_id: int, service_id: int
    ) -> Optional[ServiceCardService]:
        return (
            self.db.query(ServiceCardService)
            .filter(
                ServiceCardService.service_card_id == card_id,
                ServiceCardService.service_id == service_id,
            )
            .first()
        )

    def add_card_service(self, card_id: int, data: "ServiceCardServiceCreate") -> ServiceCardService:
        item = ServiceCardService(service_card_id=card_id, **data.model_dump())
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self.get_card_service_by_id(item.id)

    def update_card_service(
        self, item_id: int, data: "ServiceCardServiceUpdate"
    ) -> Optional[ServiceCardService]:
        item = self.get_card_service_by_id(item_id)
        if not item:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        self.db.commit()
        self.db.refresh(item)
        return item

    def remove_card_service(self, item_id: int) -> bool:
        item = self.get_card_service_by_id(item_id)
        if not item:
            return False
        self.db.delete(item)
        self.db.commit()
        return True

    # ─── Card Activities (atividade/anotacao/arquivo/alteracao) ───────────────

    def list_card_activities(self, card_id: int) -> List[ServiceCardActivity]:
        return (
            self.db.query(ServiceCardActivity)
            .options(joinedload(ServiceCardActivity.user))
            .filter(ServiceCardActivity.service_card_id == card_id)
            .order_by(ServiceCardActivity.created_at.desc())
            .all()
        )

    def get_activity_by_id(self, activity_id: int) -> Optional[ServiceCardActivity]:
        return (
            self.db.query(ServiceCardActivity)
            .options(joinedload(ServiceCardActivity.user))
            .filter(ServiceCardActivity.id == activity_id)
            .first()
        )

    def create_activity(self, **kwargs) -> ServiceCardActivity:
        activity = ServiceCardActivity(**kwargs)
        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)
        return self.get_activity_by_id(activity.id)

    def update_activity(self, activity: ServiceCardActivity, data: dict) -> ServiceCardActivity:
        for field, value in data.items():
            setattr(activity, field, value)
        self.db.commit()
        self.db.refresh(activity)
        return activity

    def delete_activity(self, activity: ServiceCardActivity) -> None:
        self.db.delete(activity)
        self.db.commit()
