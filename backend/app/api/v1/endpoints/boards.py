"""
Endpoints de Boards e Lists.
Rotas para gerenciamento de quadros e listas.
"""
from typing import Any, Optional, List
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.board_service import BoardService
from app.services.list_service import ListService
from app.schemas.board import (
    BoardCreate,
    BoardUpdate,
    BoardResponse,
    BoardListResponse,
    BoardDuplicateRequest
)
from app.schemas.list import (
    ListCreate,
    ListUpdate,
    ListResponse,
    ListMoveRequest
)
from app.models.user import User

router = APIRouter()


# ========== ENDPOINTS DE BOARDS ==========

@router.get("", response_model=BoardListResponse, summary="Listar boards")
async def list_boards(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    is_archived: Optional[bool] = Query(None, description="Filtrar por status arquivado"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todos os boards do sistema.

    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 100)
    - **is_archived**: Filtrar por boards arquivados (opcional)
    """
    service = BoardService(db)
    return service.list_boards(
        page=page,
        page_size=page_size,
        is_archived=is_archived
    )


@router.get("/{board_id}", response_model=BoardResponse, summary="Buscar board")
async def get_board(
    board_id: int = Path(..., description="ID do board"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca um board por ID.

    - **board_id**: ID do board
    """
    service = BoardService(db)
    board = service.get_board_by_id(board_id)

    # Conta listas e cards
    list_service = ListService(db)
    lists = list_service.list_by_board(board_id)
    lists_count = len(lists)
    cards_count = 0  # TODO: Contar cards quando módulo estiver pronto

    return BoardResponse(
        id=board.id,
        name=board.name,
        description=board.description,
        color=board.color,
        icon=board.icon,
        is_archived=board.is_archived,
        created_at=board.created_at,
        updated_at=board.updated_at,
        lists_count=lists_count,
        cards_count=cards_count
    )


@router.post("", response_model=BoardResponse, summary="Criar board", status_code=201)
async def create_board(
    board_data: BoardCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria um novo board.

    - **name**: Nome do board
    - **description**: Descrição (opcional)
    - **color**: Cor em hexadecimal (opcional)
    - **icon**: Ícone (opcional)
    """
    service = BoardService(db)
    board = service.create_board(board_data, current_user)

    return BoardResponse(
        id=board.id,
        name=board.name,
        description=board.description,
        color=board.color,
        icon=board.icon,
        is_archived=board.is_archived,
        created_at=board.created_at,
        updated_at=board.updated_at
    )


@router.put("/{board_id}", response_model=BoardResponse, summary="Atualizar board")
async def update_board(
    board_id: int = Path(..., description="ID do board"),
    board_data: BoardUpdate = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza um board existente.

    - **board_id**: ID do board
    - Todos os campos são opcionais
    """
    service = BoardService(db)
    board = service.update_board(board_id, board_data, current_user)

    return BoardResponse(
        id=board.id,
        name=board.name,
        description=board.description,
        color=board.color,
        icon=board.icon,
        is_archived=board.is_archived,
        created_at=board.created_at,
        updated_at=board.updated_at
    )


@router.delete("/{board_id}", summary="Deletar board")
async def delete_board(
    board_id: int = Path(..., description="ID do board"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta um board permanentemente (e todas suas listas e cards).

    - **board_id**: ID do board
    """
    service = BoardService(db)
    service.delete_board(board_id, current_user)

    return {"message": "Board deletado com sucesso"}


@router.post("/{board_id}/duplicate", response_model=BoardResponse, summary="Duplicar board", status_code=201)
async def duplicate_board(
    board_id: int = Path(..., description="ID do board"),
    duplicate_data: BoardDuplicateRequest = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Duplica um board.

    - **board_id**: ID do board a duplicar
    - **new_name**: Nome do novo board
    - **copy_lists**: Se deve copiar as listas (padrão: true)
    - **copy_cards**: Se deve copiar os cards (padrão: false)
    """
    service = BoardService(db)
    board = service.duplicate_board(
        board_id=board_id,
        new_name=duplicate_data.new_name,
        copy_lists=duplicate_data.copy_lists,
        copy_cards=duplicate_data.copy_cards,
        current_user=current_user
    )

    return BoardResponse(
        id=board.id,
        name=board.name,
        description=board.description,
        color=board.color,
        icon=board.icon,
        is_archived=board.is_archived,
        created_at=board.created_at,
        updated_at=board.updated_at
    )


# ========== ENDPOINTS DE LISTS ==========

@router.get("/{board_id}/lists", response_model=List[ListResponse], summary="Listar listas do board")
async def list_board_lists(
    board_id: int = Path(..., description="ID do board"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todas as listas de um board, ordenadas por posição.

    - **board_id**: ID do board
    """
    service = ListService(db)
    return service.list_by_board(board_id)


@router.post("/{board_id}/lists", response_model=ListResponse, summary="Criar lista", status_code=201)
async def create_list(
    board_id: int = Path(..., description="ID do board"),
    list_data: ListCreate = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria uma nova lista em um board.

    - **board_id**: ID do board
    - **name**: Nome da lista
    - **color**: Cor em hexadecimal (opcional)
    - **position**: Posição da lista (opcional, se não informado vai para o final)
    """
    service = ListService(db)
    new_list = service.create_list(list_data, current_user)

    return ListResponse(
        id=new_list.id,
        name=new_list.name,
        color=new_list.color,
        board_id=new_list.board_id,
        position=new_list.position,
        created_at=new_list.created_at,
        updated_at=new_list.updated_at
    )


@router.put("/{board_id}/lists/{list_id}", response_model=ListResponse, summary="Atualizar lista")
async def update_list(
    board_id: int = Path(..., description="ID do board"),
    list_id: int = Path(..., description="ID da lista"),
    list_data: ListUpdate = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza uma lista existente.

    - **board_id**: ID do board
    - **list_id**: ID da lista
    - Todos os campos são opcionais
    """
    service = ListService(db)
    updated_list = service.update_list(list_id, list_data, current_user)

    return ListResponse(
        id=updated_list.id,
        name=updated_list.name,
        color=updated_list.color,
        board_id=updated_list.board_id,
        position=updated_list.position,
        created_at=updated_list.created_at,
        updated_at=updated_list.updated_at
    )


@router.delete("/{board_id}/lists/{list_id}", summary="Deletar lista")
async def delete_list(
    board_id: int = Path(..., description="ID do board"),
    list_id: int = Path(..., description="ID da lista"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta uma lista permanentemente (e todos seus cards).

    - **board_id**: ID do board
    - **list_id**: ID da lista
    """
    service = ListService(db)
    service.delete_list(list_id, current_user)

    return {"message": "Lista deletada com sucesso"}


@router.put("/{board_id}/lists/{list_id}/move", response_model=ListResponse, summary="Mover/reordenar lista")
async def move_list(
    board_id: int = Path(..., description="ID do board"),
    list_id: int = Path(..., description="ID da lista"),
    move_data: ListMoveRequest = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Move/reordena uma lista para uma nova posição no board.

    - **board_id**: ID do board
    - **list_id**: ID da lista
    - **new_position**: Nova posição (começa em 0)
    """
    service = ListService(db)
    moved_list = service.move_list(list_id, move_data.new_position, current_user)

    return ListResponse(
        id=moved_list.id,
        name=moved_list.name,
        color=moved_list.color,
        board_id=moved_list.board_id,
        position=moved_list.position,
        created_at=moved_list.created_at,
        updated_at=moved_list.updated_at
    )
