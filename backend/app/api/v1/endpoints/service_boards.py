"""
Endpoints de ServiceBoards (Boards de Serviços).
Completamente independentes dos boards de vendas.
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, require_not_viewer
from app.services.service_board_service import ServiceBoardService, deal_value_by_card
from app.schemas.service_board import (
    ServiceBoardCreate, ServiceBoardUpdate, ServiceBoardResponse,
    ServiceBoardListResponse, ServiceBoardDuplicateRequest,
    ServiceListCreate, ServiceListUpdate, ServiceListResponse, ServiceListMoveRequest,
    ServiceCardCreate, ServiceCardUpdate, ServiceCardResponse,
    ServiceCardListResponse, ServiceCardMoveRequest,
    ServiceCardProductCreate, ServiceCardProductUpdate,
    ServiceCardProductResponse, ServiceCardProductSummary,
    ServiceCardActivityCreate, ServiceCardActivityUpdate,
    ServiceCardActivityResponse, ServiceCardActivityComplete,
)
from app.schemas.service import (
    ServiceCardServiceCreate, ServiceCardServiceUpdate,
    ServiceCardServiceResponse, ServiceCardServiceSummary,
)
from app.models.user import User

router = APIRouter()


# ─── Boards ───────────────────────────────────────────────────────────────────

@router.get("", response_model=ServiceBoardListResponse)
async def list_service_boards(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    is_deleted: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.list_boards(page=page, page_size=page_size, is_deleted=is_deleted)


@router.get("/{board_id}", response_model=ServiceBoardResponse)
async def get_service_board(
    board_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    board = svc.get_board(board_id)
    lists_count = svc.repo.count_lists_by_board(board_id)
    cards_count = svc.repo.count_cards_by_board(board_id)
    return ServiceBoardResponse(
        id=board.id,
        name=board.name,
        description=board.description,
        color=board.color,
        icon=board.icon,
        is_deleted=board.is_deleted,
        created_at=board.created_at,
        updated_at=board.updated_at,
        lists_count=lists_count,
        cards_count=cards_count,
    )


@router.post("", response_model=ServiceBoardResponse, status_code=201)
async def create_service_board(
    data: ServiceBoardCreate,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    if current_user.role.name.lower() not in ["admin", "manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores e gerentes podem criar boards")
    svc = ServiceBoardService(db)
    board = svc.create_board(data, current_user)
    return ServiceBoardResponse(
        id=board.id,
        name=board.name,
        description=board.description,
        color=board.color,
        icon=board.icon,
        is_deleted=board.is_deleted,
        created_at=board.created_at,
        updated_at=board.updated_at,
    )


@router.put("/{board_id}", response_model=ServiceBoardResponse)
async def update_service_board(
    board_id: int = Path(...),
    data: ServiceBoardUpdate = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    board = svc.update_board(board_id, data, current_user)
    return ServiceBoardResponse(
        id=board.id,
        name=board.name,
        description=board.description,
        color=board.color,
        icon=board.icon,
        is_deleted=board.is_deleted,
        created_at=board.created_at,
        updated_at=board.updated_at,
    )


@router.delete("/{board_id}")
async def delete_service_board(
    board_id: int = Path(...),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    svc.delete_board(board_id, current_user)
    return {"message": "Board de serviços deletado com sucesso"}


@router.post("/{board_id}/duplicate", response_model=ServiceBoardResponse, status_code=201)
async def duplicate_service_board(
    board_id: int = Path(...),
    data: ServiceBoardDuplicateRequest = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    board = svc.duplicate_board(board_id, data.new_name, data.copy_lists, current_user)
    return ServiceBoardResponse(
        id=board.id,
        name=board.name,
        description=board.description,
        color=board.color,
        icon=board.icon,
        is_deleted=board.is_deleted,
        created_at=board.created_at,
        updated_at=board.updated_at,
    )


# ─── Lists ────────────────────────────────────────────────────────────────────

@router.get("/{board_id}/lists", response_model=List[ServiceListResponse])
async def list_service_lists(
    board_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.list_lists(board_id)


@router.post("/{board_id}/lists", response_model=ServiceListResponse, status_code=201)
async def create_service_list(
    board_id: int = Path(...),
    data: ServiceListCreate = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    if current_user.role.name.lower() not in ["admin", "manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores e gerentes podem criar listas")
    svc = ServiceBoardService(db)
    list_data = ServiceListCreate(
        board_id=board_id,
        name=data.name,
        color=data.color,
        position=data.position,
        is_done_stage=data.is_done_stage,
        is_lost_stage=data.is_lost_stage,
        is_entry_stage=data.is_entry_stage,
    )
    lst = svc.create_list(list_data, current_user)
    return ServiceListResponse(
        id=lst.id,
        board_id=lst.board_id,
        name=lst.name,
        color=lst.color,
        position=lst.position,
        is_done_stage=lst.is_done_stage,
        is_lost_stage=lst.is_lost_stage,
        is_entry_stage=lst.is_entry_stage,
        created_at=lst.created_at,
        updated_at=lst.updated_at,
    )


@router.put("/{board_id}/lists/{list_id}", response_model=ServiceListResponse)
async def update_service_list(
    board_id: int = Path(...),
    list_id: int = Path(...),
    data: ServiceListUpdate = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    lst = svc.update_list(list_id, data, current_user)
    return ServiceListResponse(
        id=lst.id,
        board_id=lst.board_id,
        name=lst.name,
        color=lst.color,
        position=lst.position,
        is_done_stage=lst.is_done_stage,
        is_lost_stage=lst.is_lost_stage,
        is_entry_stage=lst.is_entry_stage,
        created_at=lst.created_at,
        updated_at=lst.updated_at,
    )


@router.delete("/{board_id}/lists/{list_id}")
async def delete_service_list(
    board_id: int = Path(...),
    list_id: int = Path(...),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    svc.delete_list(list_id, current_user)
    return {"message": "Lista de serviços deletada com sucesso"}


@router.put("/{board_id}/lists/{list_id}/move", response_model=ServiceListResponse)
async def move_service_list(
    board_id: int = Path(...),
    list_id: int = Path(...),
    data: ServiceListMoveRequest = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    lst = svc.move_list(list_id, data.new_position, current_user)
    return ServiceListResponse(
        id=lst.id,
        board_id=lst.board_id,
        name=lst.name,
        color=lst.color,
        position=lst.position,
        is_done_stage=lst.is_done_stage,
        is_lost_stage=lst.is_lost_stage,
        is_entry_stage=lst.is_entry_stage,
        created_at=lst.created_at,
        updated_at=lst.updated_at,
    )


# ─── Cards ────────────────────────────────────────────────────────────────────

@router.get("/{board_id}/cards", response_model=ServiceCardListResponse)
async def list_service_cards(
    board_id: int = Path(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=500),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.list_cards(board_id, page=page, page_size=page_size)


def _card_value(db, card) -> float:
    """Valor do negócio = soma dos totais das propostas vinculadas ao card.
    Mesmo cálculo usado no card do kanban (deal_value_by_card)."""
    return deal_value_by_card(db, [card.id]).get(card.id, 0.0)


@router.post("/{board_id}/cards", response_model=ServiceCardResponse, status_code=201)
async def create_service_card(
    board_id: int = Path(...),
    data: ServiceCardCreate = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    card = svc.create_card(data, current_user)
    return ServiceCardResponse(
        id=card.id,
        list_id=card.list_id,
        title=card.title,
        description=card.description,
        assigned_to_id=card.assigned_to_id,
        due_date=card.due_date,
        contact_info=card.contact_info,
        payment_info=card.payment_info,
        business_info=card.business_info,
        value=_card_value(db, card),
        client_id=card.client_id,
        person_id=card.person_id,
        client_name=card.client.name if card.client else None,
        person_name=card.person.name if card.person else None,
        position=float(card.position or 0),
        is_deleted=card.is_deleted,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


@router.get("/{board_id}/cards/{card_id}", response_model=ServiceCardResponse)
async def get_service_card(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    card = svc.get_card(card_id)
    return ServiceCardResponse(
        id=card.id,
        list_id=card.list_id,
        title=card.title,
        description=card.description,
        assigned_to_id=card.assigned_to_id,
        due_date=card.due_date,
        contact_info=card.contact_info,
        payment_info=card.payment_info,
        business_info=card.business_info,
        value=_card_value(db, card),
        client_id=card.client_id,
        person_id=card.person_id,
        client_name=card.client.name if card.client else None,
        person_name=card.person.name if card.person else None,
        position=float(card.position or 0),
        is_deleted=card.is_deleted,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


@router.put("/{board_id}/cards/{card_id}", response_model=ServiceCardResponse)
async def update_service_card(
    board_id: int = Path(...),
    card_id: int = Path(...),
    data: ServiceCardUpdate = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    card = svc.update_card(card_id, data, current_user)
    return ServiceCardResponse(
        id=card.id,
        list_id=card.list_id,
        title=card.title,
        description=card.description,
        assigned_to_id=card.assigned_to_id,
        due_date=card.due_date,
        contact_info=card.contact_info,
        payment_info=card.payment_info,
        business_info=card.business_info,
        value=_card_value(db, card),
        client_id=card.client_id,
        person_id=card.person_id,
        client_name=card.client.name if card.client else None,
        person_name=card.person.name if card.person else None,
        position=float(card.position or 0),
        is_deleted=card.is_deleted,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


@router.delete("/{board_id}/cards/{card_id}")
async def delete_service_card(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    svc.delete_card(card_id, current_user)
    return {"message": "Card de serviços deletado com sucesso"}


@router.put("/{board_id}/cards/{card_id}/move", response_model=ServiceCardResponse)
async def move_service_card(
    board_id: int = Path(...),
    card_id: int = Path(...),
    data: ServiceCardMoveRequest = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    card = svc.move_card(card_id, data.list_id, data.position, current_user)
    return ServiceCardResponse(
        id=card.id,
        list_id=card.list_id,
        title=card.title,
        description=card.description,
        assigned_to_id=card.assigned_to_id,
        due_date=card.due_date,
        contact_info=card.contact_info,
        payment_info=card.payment_info,
        business_info=card.business_info,
        value=_card_value(db, card),
        client_id=card.client_id,
        person_id=card.person_id,
        client_name=card.client.name if card.client else None,
        person_name=card.person.name if card.person else None,
        position=float(card.position or 0),
        is_deleted=card.is_deleted,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


# ─── Card Products ──────────────────────────────────────────────────────────────

@router.get("/{board_id}/cards/{card_id}/products", response_model=ServiceCardProductSummary)
async def list_service_card_products(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.get_card_products(card_id)


@router.post("/{board_id}/cards/{card_id}/products", response_model=ServiceCardProductResponse)
async def add_service_card_product(
    board_id: int = Path(...),
    card_id: int = Path(...),
    data: ServiceCardProductCreate = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.add_card_product(card_id, data, current_user)


@router.put("/{board_id}/cards/{card_id}/products/{item_id}", response_model=ServiceCardProductResponse)
async def update_service_card_product(
    board_id: int = Path(...),
    card_id: int = Path(...),
    item_id: int = Path(...),
    data: ServiceCardProductUpdate = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.update_card_product(item_id, data, current_user)


@router.delete("/{board_id}/cards/{card_id}/products/{item_id}")
async def remove_service_card_product(
    board_id: int = Path(...),
    card_id: int = Path(...),
    item_id: int = Path(...),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.remove_card_product(item_id, current_user)


# ─── Card Services (mirror de Card Products, sem aparelhos) ───────────────────────

@router.get("/{board_id}/cards/{card_id}/services", response_model=ServiceCardServiceSummary)
async def list_service_card_services(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.get_card_services(card_id)


@router.post("/{board_id}/cards/{card_id}/services", response_model=ServiceCardServiceResponse)
async def add_service_card_service(
    board_id: int = Path(...),
    card_id: int = Path(...),
    data: ServiceCardServiceCreate = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.add_card_service(card_id, data, current_user)


@router.put("/{board_id}/cards/{card_id}/services/{item_id}", response_model=ServiceCardServiceResponse)
async def update_service_card_service(
    board_id: int = Path(...),
    card_id: int = Path(...),
    item_id: int = Path(...),
    data: ServiceCardServiceUpdate = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.update_card_service(item_id, data, current_user)


@router.delete("/{board_id}/cards/{card_id}/services/{item_id}")
async def remove_service_card_service(
    board_id: int = Path(...),
    card_id: int = Path(...),
    item_id: int = Path(...),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.remove_card_service(item_id, current_user)


# ─── Card Activities (Atividade / Anotação / Arquivo / Alteração) ────────────────

@router.get("/{board_id}/cards/{card_id}/activities", response_model=List[ServiceCardActivityResponse])
async def list_service_card_activities(
    board_id: int = Path(...),
    card_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.list_activities(board_id, card_id)


@router.post("/{board_id}/cards/{card_id}/activities", response_model=ServiceCardActivityResponse)
async def create_service_card_activity(
    board_id: int = Path(...),
    card_id: int = Path(...),
    data: ServiceCardActivityCreate = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.create_activity(board_id, card_id, data, current_user)


@router.put("/{board_id}/cards/{card_id}/activities/{activity_id}", response_model=ServiceCardActivityResponse)
async def update_service_card_activity(
    board_id: int = Path(...),
    card_id: int = Path(...),
    activity_id: int = Path(...),
    data: ServiceCardActivityUpdate = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.update_activity(board_id, card_id, activity_id, data, current_user)


@router.patch("/{board_id}/cards/{card_id}/activities/{activity_id}/complete", response_model=ServiceCardActivityResponse)
async def complete_service_card_activity(
    board_id: int = Path(...),
    card_id: int = Path(...),
    activity_id: int = Path(...),
    data: ServiceCardActivityComplete = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.complete_activity(board_id, card_id, activity_id, data.is_completed, current_user, data.is_valid)


@router.delete("/{board_id}/cards/{card_id}/activities/{activity_id}")
async def delete_service_card_activity(
    board_id: int = Path(...),
    card_id: int = Path(...),
    activity_id: int = Path(...),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return svc.delete_activity(board_id, card_id, activity_id, current_user)


@router.post("/{board_id}/cards/{card_id}/activities/files", response_model=ServiceCardActivityResponse)
async def upload_service_card_file(
    board_id: int = Path(...),
    card_id: int = Path(...),
    file: UploadFile = File(...),
    slot: Optional[str] = Query(None, description="Slot do documento no Resumo: proposta|os|oc"),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db),
) -> Any:
    svc = ServiceBoardService(db)
    return await svc.upload_file(board_id, card_id, file, current_user, slot=slot)


@router.get("/{board_id}/cards/{card_id}/activities/files/{activity_id}/download")
async def download_service_card_file(
    board_id: int = Path(...),
    card_id: int = Path(...),
    activity_id: int = Path(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    svc = ServiceBoardService(db)
    path, filename, mime = svc.get_file_for_download(board_id, card_id, activity_id)
    return FileResponse(path=str(path), filename=filename, media_type=mime)
