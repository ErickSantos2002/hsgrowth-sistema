"""
Service para lógica de negócio de ServiceBoard, ServiceList e ServiceCard.
"""
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from fastapi import HTTPException, status, UploadFile

from sqlalchemy.orm import Session

from app.repositories.service_board_repository import ServiceBoardRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.service_board import (
    ServiceBoardCreate, ServiceBoardUpdate, ServiceBoardResponse, ServiceBoardListResponse,
    ServiceListCreate, ServiceListUpdate, ServiceListResponse,
    ServiceCardCreate, ServiceCardUpdate, ServiceCardResponse, ServiceCardListResponse,
    ServiceCardProductCreate, ServiceCardProductUpdate,
    ServiceCardProductResponse, ServiceCardProductSummary,
    ServiceCardActivityCreate, ServiceCardActivityUpdate, ServiceCardActivityResponse,
)
from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.service_card import ServiceCard
from app.models.service_card_product import ServiceCardProduct
from app.models.service_card_activity import ServiceCardActivity
from app.models.user import User


# Diretório base de uploads (mesmo volume usado pelos anexos de vendas)
UPLOAD_DIR = Path("/app/uploads")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


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

    def get_card_in_board(self, board_id: int, card_id: int) -> ServiceCard:
        """Busca o card garantindo que ele pertence ao board informado (anti-IDOR)."""
        card = self.get_card(card_id)
        if not card.list or card.list.board_id != board_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card não encontrado neste board")
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
        card = self.repo.create_card(data)
        self.log_event(card.id, user, "card_created", "Card criado")
        return card

    def update_card(self, card_id: int, data: ServiceCardUpdate, user: User) -> ServiceCard:
        card = self.get_card(card_id)
        old_title, old_client, old_person = card.title, card.client_id, card.person_id
        updated = self.repo.update_card(card, data)
        changed = data.model_dump(exclude_unset=True)
        if "title" in changed and old_title != updated.title:
            self.log_event(card_id, user, "card_title_changed", f"Título alterado para: {updated.title}")
        if "client_id" in changed and old_client != updated.client_id:
            if updated.client_id:
                self.log_event(card_id, user, "client_linked", "Cliente vinculado", {"client_id": updated.client_id})
            else:
                self.log_event(card_id, user, "client_unlinked", "Cliente desvinculado")
        if "person_id" in changed and old_person != updated.person_id:
            if updated.person_id:
                self.log_event(card_id, user, "person_linked", "Pessoa vinculada", {"person_id": updated.person_id})
            else:
                self.log_event(card_id, user, "person_unlinked", "Pessoa desvinculada")
        return updated

    def delete_card(self, card_id: int, user: User) -> None:
        card = self.get_card(card_id)
        self.repo.delete_card(card)

    def move_card(self, card_id: int, new_list_id: int, new_position: Optional[float], user: User) -> ServiceCard:
        card = self.get_card(card_id)
        old_list = self.repo.find_list_by_id(card.list_id)
        new_list = self.get_list(new_list_id)
        old_list_id = card.list_id
        moved = self.repo.move_card(card_id, new_list_id, new_position)
        if old_list_id != new_list_id:
            self.log_event(
                card_id, user, "stage_change",
                f"Etapa alterada: {old_list.name if old_list else '—'} → {new_list.name}",
                {"from_list_id": old_list_id, "to_list_id": new_list_id},
            )
        return moved

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
        self.log_event(card_id, user, "product_added", f"Produto adicionado: {product.name}",
                       {"product_id": product.id})
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
        product_name = item.product.name if item.product else "Produto"
        card_id = item.service_card_id
        self.repo.remove_card_product(item_id)
        self.log_event(card_id, user, "product_removed", f"Produto removido: {product_name}",
                       {"product_id": item.product_id})
        return {"message": "Produto removido do card com sucesso"}

    # ─── Card Activities (Atividade / Anotação / Arquivo / Alteração) ─────────

    def _build_activity_response(self, a: ServiceCardActivity) -> ServiceCardActivityResponse:
        return ServiceCardActivityResponse(
            id=a.id,
            service_card_id=a.service_card_id,
            user_id=a.user_id,
            user_name=a.user.name if a.user else None,
            category=a.category,
            activity_type=a.activity_type,
            title=a.title,
            description=a.description,
            activity_metadata=a.activity_metadata,
            priority=a.priority,
            due_date=a.due_date,
            is_completed=a.is_completed,
            completed_at=a.completed_at,
            file_name=a.file_name,
            file_size=a.file_size,
            mime_type=a.mime_type,
            created_at=a.created_at,
            updated_at=a.updated_at,
        )

    def log_event(self, card_id: int, user: Optional[User], activity_type: str,
                  description: str, metadata: Optional[dict] = None) -> None:
        """Registra um evento automático (categoria 'alteracao'). Nunca quebra o fluxo."""
        try:
            self.repo.create_activity(
                service_card_id=card_id,
                user_id=user.id if user else None,
                category="alteracao",
                activity_type=activity_type,
                description=description,
                activity_metadata=metadata,
            )
        except Exception as e:  # pragma: no cover
            print(f"[SERVICE-ACTIVITY] erro ao registrar evento: {e}")

    def _get_activity_scoped(self, board_id: int, card_id: int, activity_id: int) -> ServiceCardActivity:
        """Busca a atividade garantindo que pertence ao card e ao board (anti-IDOR)."""
        self.get_card_in_board(board_id, card_id)
        activity = self.repo.get_activity_by_id(activity_id)
        if not activity or activity.service_card_id != card_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atividade não encontrada")
        return activity

    def list_activities(self, board_id: int, card_id: int) -> List[ServiceCardActivityResponse]:
        self.get_card_in_board(board_id, card_id)
        items = self.repo.list_card_activities(card_id)
        return [self._build_activity_response(a) for a in items]

    def create_activity(self, board_id: int, card_id: int, data: ServiceCardActivityCreate, user: User) -> ServiceCardActivityResponse:
        self.get_card_in_board(board_id, card_id)
        if data.category not in ("atividade", "anotacao"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria inválida")
        activity = self.repo.create_activity(
            service_card_id=card_id,
            user_id=user.id,
            category=data.category,
            activity_type=data.activity_type or ("note" if data.category == "anotacao" else "task"),
            title=data.title,
            description=data.description,
            priority=data.priority,
            due_date=data.due_date,
            activity_metadata=data.activity_metadata,
        )
        return self._build_activity_response(activity)

    def update_activity(self, board_id: int, card_id: int, activity_id: int, data: ServiceCardActivityUpdate, user: User) -> ServiceCardActivityResponse:
        activity = self._get_activity_scoped(board_id, card_id, activity_id)
        updated = self.repo.update_activity(activity, data.model_dump(exclude_unset=True))
        return self._build_activity_response(updated)

    def complete_activity(self, board_id: int, card_id: int, activity_id: int, is_completed: bool, user: User) -> ServiceCardActivityResponse:
        activity = self._get_activity_scoped(board_id, card_id, activity_id)
        updated = self.repo.update_activity(activity, {
            "is_completed": is_completed,
            "completed_at": datetime.utcnow() if is_completed else None,
        })
        return self._build_activity_response(updated)

    def delete_activity(self, board_id: int, card_id: int, activity_id: int, user: User) -> dict:
        activity = self._get_activity_scoped(board_id, card_id, activity_id)
        # Remove o arquivo físico, se for um anexo
        if activity.category == "arquivo" and activity.file_path:
            try:
                fp = UPLOAD_DIR / activity.file_path
                if fp.exists():
                    fp.unlink()
            except Exception as e:  # pragma: no cover
                print(f"[SERVICE-ACTIVITY] erro ao remover arquivo: {e}")
        self.repo.delete_activity(activity)
        return {"message": "Removido com sucesso"}

    async def upload_file(self, board_id: int, card_id: int, file: UploadFile, user: User) -> ServiceCardActivityResponse:
        self.get_card_in_board(board_id, card_id)
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                                detail="Arquivo muito grande. Máximo: 10MB")
        original = file.filename or "arquivo"
        ext = Path(original).suffix
        unique = f"{uuid.uuid4().hex}{ext}"
        card_dir = UPLOAD_DIR / "service_cards" / str(card_id)
        card_dir.mkdir(parents=True, exist_ok=True)
        try:
            with open(card_dir / unique, "wb") as f:
                f.write(content)
        except Exception:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail="Erro ao salvar arquivo no disco")
        activity = self.repo.create_activity(
            service_card_id=card_id,
            user_id=user.id,
            category="arquivo",
            activity_type="file_attached",
            title=original,
            file_name=original,
            file_path=f"service_cards/{card_id}/{unique}",
            file_size=len(content),
            mime_type=file.content_type,
        )
        return self._build_activity_response(activity)

    def get_file_for_download(self, board_id: int, card_id: int, activity_id: int):
        activity = self._get_activity_scoped(board_id, card_id, activity_id)
        if activity.category != "arquivo" or not activity.file_path:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado")
        fp = UPLOAD_DIR / activity.file_path
        if not fp.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado no disco")
        return fp, activity.file_name or "arquivo", activity.mime_type or "application/octet-stream"
