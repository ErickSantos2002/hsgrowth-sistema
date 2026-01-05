"""
Endpoints de Cards.
Rotas para gerenciamento de cartões e campos customizados.
"""
from typing import Any, Optional, List
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.card_service import CardService
from app.schemas.card import (
    CardCreate,
    CardUpdate,
    CardResponse,
    CardListResponse,
    CardMoveRequest,
    CardAssignRequest
)
from app.schemas.field import CardFieldValueCreate, CardFieldValueResponse
from app.models.user import User

router = APIRouter()


@router.get("", response_model=CardListResponse, summary="Listar cards")
async def list_cards(
    board_id: int = Query(..., description="ID do board"),
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    assigned_to_id: Optional[int] = Query(None, description="Filtrar por responsável"),
    is_won: Optional[bool] = Query(None, description="Filtrar por cards ganhos"),
    is_lost: Optional[bool] = Query(None, description="Filtrar por cards perdidos"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista cards de um board com paginação e filtros.

    - **board_id**: ID do board (obrigatório)
    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 100)
    - **assigned_to_id**: Filtrar por usuário responsável (opcional)
    - **is_won**: Filtrar por cards ganhos (opcional)
    - **is_lost**: Filtrar por cards perdidos (opcional)
    """
    service = CardService(db)
    return service.list_cards(
        board_id=board_id,
        account_id=current_user.account_id,
        page=page,
        page_size=page_size,
        assigned_to_id=assigned_to_id,
        is_won=is_won,
        is_lost=is_lost
    )


@router.get("/{card_id}", response_model=CardResponse, summary="Buscar card")
async def get_card(
    card_id: int = Path(..., description="ID do card"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca um card por ID.

    - **card_id**: ID do card
    """
    service = CardService(db)
    card = service.get_card_by_id(card_id, current_user.account_id)

    # Busca informações relacionadas
    assigned_to_name = None
    if card.assigned_to_id:
        from app.models.user import User
        assigned_user = db.query(User).filter(User.id == card.assigned_to_id).first()
        if assigned_user:
            assigned_to_name = assigned_user.name

    from app.repositories.list_repository import ListRepository
    list_repo = ListRepository(db)
    list_obj = list_repo.find_by_id(card.list_id)
    list_name = list_obj.name if list_obj else None
    board_id = list_obj.board_id if list_obj else None

    return CardResponse(
        id=card.id,
        title=card.title,
        description=card.description,
        list_id=card.list_id,
        assigned_to_id=card.assigned_to_id,
        value=card.value,
        due_date=card.due_date,
        contact_info=card.contact_info,
        is_won=card.is_won,
        is_lost=card.is_lost,
        won_at=card.won_at,
        lost_at=card.lost_at,
        position=card.position,
        created_at=card.created_at,
        updated_at=card.updated_at,
        assigned_to_name=assigned_to_name,
        list_name=list_name,
        board_id=board_id
    )


@router.post("", response_model=CardResponse, summary="Criar card", status_code=201)
async def create_card(
    card_data: CardCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria um novo card.

    - **title**: Título do card
    - **description**: Descrição (opcional)
    - **list_id**: ID da lista onde o card será criado
    - **assigned_to_id**: ID do usuário responsável (opcional)
    - **value**: Valor monetário (opcional)
    - **due_date**: Data de vencimento (opcional)
    - **contact_info**: Informações de contato em JSON (opcional)
    """
    service = CardService(db)
    card = service.create_card(card_data, current_user)

    return CardResponse(
        id=card.id,
        title=card.title,
        description=card.description,
        list_id=card.list_id,
        assigned_to_id=card.assigned_to_id,
        value=card.value,
        due_date=card.due_date,
        contact_info=card.contact_info,
        is_won=card.is_won,
        is_lost=card.is_lost,
        won_at=card.won_at,
        lost_at=card.lost_at,
        position=card.position,
        created_at=card.created_at,
        updated_at=card.updated_at
    )


@router.put("/{card_id}", response_model=CardResponse, summary="Atualizar card")
async def update_card(
    card_id: int = Path(..., description="ID do card"),
    card_data: CardUpdate = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza um card existente.

    - **card_id**: ID do card
    - Todos os campos são opcionais
    """
    service = CardService(db)
    card = service.update_card(card_id, card_data, current_user)

    return CardResponse(
        id=card.id,
        title=card.title,
        description=card.description,
        list_id=card.list_id,
        assigned_to_id=card.assigned_to_id,
        value=card.value,
        due_date=card.due_date,
        contact_info=card.contact_info,
        is_won=card.is_won,
        is_lost=card.is_lost,
        won_at=card.won_at,
        lost_at=card.lost_at,
        position=card.position,
        created_at=card.created_at,
        updated_at=card.updated_at
    )


@router.delete("/{card_id}", summary="Deletar card")
async def delete_card(
    card_id: int = Path(..., description="ID do card"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta um card permanentemente.

    - **card_id**: ID do card
    """
    service = CardService(db)
    service.delete_card(card_id, current_user)

    return {"message": "Card deletado com sucesso"}


@router.put("/{card_id}/move", response_model=CardResponse, summary="Mover card entre listas")
async def move_card(
    card_id: int = Path(..., description="ID do card"),
    move_data: CardMoveRequest = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Move um card para outra lista.

    - **card_id**: ID do card
    - **target_list_id**: ID da lista de destino
    - **position**: Posição na lista de destino (opcional)
    """
    service = CardService(db)
    card = service.move_card(
        card_id=card_id,
        target_list_id=move_data.target_list_id,
        position=move_data.position,
        current_user=current_user
    )

    return CardResponse(
        id=card.id,
        title=card.title,
        description=card.description,
        list_id=card.list_id,
        assigned_to_id=card.assigned_to_id,
        value=card.value,
        due_date=card.due_date,
        contact_info=card.contact_info,
        is_won=card.is_won,
        is_lost=card.is_lost,
        won_at=card.won_at,
        lost_at=card.lost_at,
        position=card.position,
        created_at=card.created_at,
        updated_at=card.updated_at
    )


@router.put("/{card_id}/assign", response_model=CardResponse, summary="Atribuir card a usuário")
async def assign_card(
    card_id: int = Path(..., description="ID do card"),
    assign_data: CardAssignRequest = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atribui um card a um usuário responsável.

    - **card_id**: ID do card
    - **assigned_to_id**: ID do usuário responsável
    """
    service = CardService(db)
    card = service.assign_card(
        card_id=card_id,
        user_id=assign_data.assigned_to_id,
        current_user=current_user
    )

    return CardResponse(
        id=card.id,
        title=card.title,
        description=card.description,
        list_id=card.list_id,
        assigned_to_id=card.assigned_to_id,
        value=card.value,
        due_date=card.due_date,
        contact_info=card.contact_info,
        is_won=card.is_won,
        is_lost=card.is_lost,
        won_at=card.won_at,
        lost_at=card.lost_at,
        position=card.position,
        created_at=card.created_at,
        updated_at=card.updated_at
    )


# ========== ENDPOINTS DE CAMPOS CUSTOMIZADOS ==========

@router.get("/{card_id}/fields", response_model=List[CardFieldValueResponse], summary="Listar campos customizados do card")
async def get_card_fields(
    card_id: int = Path(..., description="ID do card"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todos os valores de campos customizados de um card.

    - **card_id**: ID do card
    """
    service = CardService(db)
    return service.get_card_field_values(card_id, current_user)


@router.post("/{card_id}/fields", response_model=CardFieldValueResponse, summary="Adicionar/atualizar campo customizado", status_code=201)
async def add_or_update_field(
    card_id: int = Path(..., description="ID do card"),
    field_data: CardFieldValueCreate = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Adiciona ou atualiza o valor de um campo customizado em um card.

    - **card_id**: ID do card
    - **field_definition_id**: ID da definição do campo
    - **value**: Valor do campo
    """
    service = CardService(db)
    return service.add_or_update_field_value(card_id, field_data, current_user)
