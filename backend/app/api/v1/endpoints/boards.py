"""
Endpoints de Boards e Lists.
Rotas para gerenciamento de quadros e listas.
"""
from typing import Any, Optional, List
from fastapi import APIRouter, Depends, Query, Path, Request
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
from app.models.audit_log import AuditLog
from app.models.board import Board

router = APIRouter()


# ========== EXEMPLOS DE RESPONSES PARA DOCUMENTAÇÃO SWAGGER ==========

# Exemplo reutilizável de um board completo para as respostas
_BOARD_EXAMPLE = {
    "id": 1,
    "name": "Funil de Vendas B2B",
    "description": "Gerenciamento de leads corporativos da HSGrowth",
    "color": "#3B82F6",
    "icon": "briefcase",
    "is_deleted": False,
    "created_at": "2026-01-10T09:30:00",
    "updated_at": "2026-01-15T14:22:00",
    "lists_count": 5,
    "cards_count": 87
}

# Exemplo reutilizável de uma lista completa para as respostas
_LIST_EXAMPLE = {
    "id": 1,
    "name": "Novos Leads",
    "color": "#3b82f6",
    "board_id": 1,
    "position": 0,
    "created_at": "2026-01-10T09:35:00",
    "updated_at": "2026-01-10T09:35:00",
    "cards_count": 23
}

# Respostas de erro reutilizáveis
_BOARD_NOT_FOUND_RESPONSE = {
    "description": "Board não encontrado",
    "content": {
        "application/json": {
            "example": {"detail": "Board com ID 999 não encontrado"}
        }
    }
}

_LIST_NOT_FOUND_RESPONSE = {
    "description": "Lista não encontrada",
    "content": {
        "application/json": {
            "example": {"detail": "Lista com ID 999 não encontrada"}
        }
    }
}

_VALIDATION_ERROR_RESPONSE = {
    "description": "Erro de validação nos dados enviados",
    "content": {
        "application/json": {
            "example": {
                "detail": [
                    {
                        "loc": ["body", "name"],
                        "msg": "Field required",
                        "type": "missing"
                    }
                ]
            }
        }
    }
}


# ========== ENDPOINTS DE BOARDS ==========

@router.get(
    "",
    response_model=BoardListResponse,
    summary="Listar boards",
    responses={
        200: {
            "description": "Lista paginada de boards retornada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "boards": [
                            {
                                "id": 1,
                                "name": "Funil de Vendas B2B",
                                "description": "Gerenciamento de leads corporativos",
                                "color": "#3B82F6",
                                "icon": "briefcase",
                                "is_deleted": False,
                                "created_at": "2026-01-10T09:30:00",
                                "updated_at": "2026-01-15T14:22:00",
                                "lists_count": 5,
                                "cards_count": 87
                            },
                            {
                                "id": 2,
                                "name": "Pós-Venda e Sucesso",
                                "description": "Acompanhamento de clientes ativos",
                                "color": "#10B981",
                                "icon": "heart-handshake",
                                "is_deleted": False,
                                "created_at": "2026-01-12T11:00:00",
                                "updated_at": "2026-01-20T16:45:00",
                                "lists_count": 4,
                                "cards_count": 34
                            }
                        ],
                        "total": 2,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 1
                    }
                }
            }
        }
    }
)
async def list_boards(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    is_deleted: Optional[bool] = Query(None, description="Filtrar por status arquivado"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista todos os boards do sistema.

    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 50, máx: 100)
    - **is_deleted**: Filtrar por boards arquivados (opcional)
    """
    service = BoardService(db)
    return service.list_boards(
        page=page,
        page_size=page_size,
        is_deleted=is_deleted
    )


@router.get(
    "/{board_id}",
    response_model=BoardResponse,
    summary="Buscar board",
    responses={
        200: {
            "description": "Board encontrado com sucesso",
            "content": {
                "application/json": {
                    "example": _BOARD_EXAMPLE
                }
            }
        },
        404: _BOARD_NOT_FOUND_RESPONSE
    }
)
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
        is_deleted=board.is_deleted,
        created_at=board.created_at,
        updated_at=board.updated_at,
        lists_count=lists_count,
        cards_count=cards_count
    )


@router.post(
    "",
    response_model=BoardResponse,
    summary="Criar board",
    status_code=201,
    responses={
        201: {
            "description": "Board criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 3,
                        "name": "Prospecção Outbound",
                        "description": "Board para controle de prospecção ativa via e-mail e LinkedIn",
                        "color": "#8B5CF6",
                        "icon": "send",
                        "is_deleted": False,
                        "created_at": "2026-02-01T08:00:00",
                        "updated_at": "2026-02-01T08:00:00",
                        "lists_count": None,
                        "cards_count": None
                    }
                }
            }
        },
        422: _VALIDATION_ERROR_RESPONSE
    }
)
async def create_board(
    request: Request,
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

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE",
        entity_type="Board",
        entity_id=board.id,
        description=f"Board criado: {board.name}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return BoardResponse(
        id=board.id,
        name=board.name,
        description=board.description,
        color=board.color,
        icon=board.icon,
        is_deleted=board.is_deleted,
        created_at=board.created_at,
        updated_at=board.updated_at
    )


@router.put(
    "/{board_id}",
    response_model=BoardResponse,
    summary="Atualizar board",
    responses={
        200: {
            "description": "Board atualizado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Funil de Vendas B2B - Q1 2026",
                        "description": "Gerenciamento de leads corporativos - Primeiro trimestre",
                        "color": "#6366F1",
                        "icon": "briefcase",
                        "is_deleted": False,
                        "created_at": "2026-01-10T09:30:00",
                        "updated_at": "2026-02-05T11:15:00",
                        "lists_count": None,
                        "cards_count": None
                    }
                }
            }
        },
        404: _BOARD_NOT_FOUND_RESPONSE,
        422: _VALIDATION_ERROR_RESPONSE
    }
)
async def update_board(
    request: Request,
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

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Constrói descrição com campos alterados
    changed_fields = []
    if board_data.name is not None:
        changed_fields.append("nome")
    if board_data.description is not None:
        changed_fields.append("descrição")
    if board_data.color is not None:
        changed_fields.append("cor")
    if board_data.icon is not None:
        changed_fields.append("ícone")

    fields_str = ", ".join(changed_fields) if changed_fields else "dados"

    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE",
        entity_type="Board",
        entity_id=board.id,
        description=f"Board atualizado: {board.name} - Campos: {fields_str}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return BoardResponse(
        id=board.id,
        name=board.name,
        description=board.description,
        color=board.color,
        icon=board.icon,
        is_deleted=board.is_deleted,
        created_at=board.created_at,
        updated_at=board.updated_at
    )


@router.delete(
    "/{board_id}",
    summary="Deletar board",
    responses={
        200: {
            "description": "Board deletado com sucesso",
            "content": {
                "application/json": {
                    "example": {"message": "Board deletado com sucesso"}
                }
            }
        },
        404: _BOARD_NOT_FOUND_RESPONSE
    }
)
async def delete_board(
    request: Request,
    board_id: int = Path(..., description="ID do board"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta um board permanentemente (e todas suas listas e cards).

    - **board_id**: ID do board
    """
    # Busca o board antes de deletar para registrar no log
    board = db.query(Board).filter(Board.id == board_id).first()
    board_name = board.name if board else f"ID {board_id}"

    service = BoardService(db)
    service.delete_board(board_id, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="DELETE",
        entity_type="Board",
        entity_id=board_id,
        description=f"Board deletado: {board_name}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Board deletado com sucesso"}


@router.post(
    "/{board_id}/duplicate",
    response_model=BoardResponse,
    summary="Duplicar board",
    status_code=201,
    responses={
        201: {
            "description": "Board duplicado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 4,
                        "name": "Funil de Vendas B2B - Cópia",
                        "description": "Gerenciamento de leads corporativos da HSGrowth",
                        "color": "#3B82F6",
                        "icon": "briefcase",
                        "is_deleted": False,
                        "created_at": "2026-02-06T10:00:00",
                        "updated_at": "2026-02-06T10:00:00",
                        "lists_count": None,
                        "cards_count": None
                    }
                }
            }
        },
        404: _BOARD_NOT_FOUND_RESPONSE
    }
)
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
        is_deleted=board.is_deleted,
        created_at=board.created_at,
        updated_at=board.updated_at
    )


# ========== ENDPOINTS DE LISTS ==========

@router.get(
    "/{board_id}/lists",
    response_model=List[ListResponse],
    summary="Listar listas do board",
    responses={
        200: {
            "description": "Listas do board retornadas com sucesso, ordenadas por posição",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "name": "Novos Leads",
                            "color": "#3b82f6",
                            "board_id": 1,
                            "position": 0,
                            "created_at": "2026-01-10T09:35:00",
                            "updated_at": "2026-01-10T09:35:00",
                            "cards_count": 23
                        },
                        {
                            "id": 2,
                            "name": "Em Contato",
                            "color": "#f59e0b",
                            "board_id": 1,
                            "position": 1,
                            "created_at": "2026-01-10T09:36:00",
                            "updated_at": "2026-01-10T09:36:00",
                            "cards_count": 15
                        },
                        {
                            "id": 3,
                            "name": "Proposta Enviada",
                            "color": "#8b5cf6",
                            "board_id": 1,
                            "position": 2,
                            "created_at": "2026-01-10T09:37:00",
                            "updated_at": "2026-01-10T09:37:00",
                            "cards_count": 8
                        },
                        {
                            "id": 4,
                            "name": "Negociação",
                            "color": "#ef4444",
                            "board_id": 1,
                            "position": 3,
                            "created_at": "2026-01-10T09:38:00",
                            "updated_at": "2026-01-10T09:38:00",
                            "cards_count": 5
                        },
                        {
                            "id": 5,
                            "name": "Fechado/Ganho",
                            "color": "#10b981",
                            "board_id": 1,
                            "position": 4,
                            "created_at": "2026-01-10T09:39:00",
                            "updated_at": "2026-01-20T16:00:00",
                            "cards_count": 36
                        }
                    ]
                }
            }
        },
        404: _BOARD_NOT_FOUND_RESPONSE
    }
)
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


@router.post(
    "/{board_id}/lists",
    response_model=ListResponse,
    summary="Criar lista",
    status_code=201,
    responses={
        201: {
            "description": "Lista criada com sucesso no board",
            "content": {
                "application/json": {
                    "example": {
                        "id": 6,
                        "name": "Qualificação",
                        "color": "#06b6d4",
                        "board_id": 1,
                        "position": 5,
                        "created_at": "2026-02-06T10:30:00",
                        "updated_at": "2026-02-06T10:30:00",
                        "cards_count": None
                    }
                }
            }
        },
        422: _VALIDATION_ERROR_RESPONSE
    }
)
async def create_list(
    board_id: int = Path(..., description="ID do board"),
    list_data: ListCreate = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria uma nova lista em um board.

    **Permissão**: Apenas Admin e Manager podem criar listas.

    - **board_id**: ID do board
    - **name**: Nome da lista
    - **color**: Cor em hexadecimal (opcional)
    - **position**: Posição da lista (opcional, se não informado vai para o final)
    """
    # Verifica permissão: apenas Admin e Manager podem criar listas
    if current_user.role.name.lower() not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores e gerentes podem criar listas"
        )

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


@router.put(
    "/{board_id}/lists/{list_id}",
    response_model=ListResponse,
    summary="Atualizar lista",
    responses={
        200: {
            "description": "Lista atualizada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 2,
                        "name": "Em Contato (Follow-up)",
                        "color": "#f59e0b",
                        "board_id": 1,
                        "position": 1,
                        "created_at": "2026-01-10T09:36:00",
                        "updated_at": "2026-02-06T11:00:00",
                        "cards_count": None
                    }
                }
            }
        },
        404: _LIST_NOT_FOUND_RESPONSE,
        422: _VALIDATION_ERROR_RESPONSE
    }
)
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


@router.delete(
    "/{board_id}/lists/{list_id}",
    summary="Deletar lista",
    responses={
        200: {
            "description": "Lista deletada com sucesso",
            "content": {
                "application/json": {
                    "example": {"message": "Lista deletada com sucesso"}
                }
            }
        },
        404: _LIST_NOT_FOUND_RESPONSE
    }
)
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


@router.put(
    "/{board_id}/lists/{list_id}/move",
    response_model=ListResponse,
    summary="Mover/reordenar lista",
    responses={
        200: {
            "description": "Lista movida para a nova posição com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 3,
                        "name": "Proposta Enviada",
                        "color": "#8b5cf6",
                        "board_id": 1,
                        "position": 1,
                        "created_at": "2026-01-10T09:37:00",
                        "updated_at": "2026-02-06T11:30:00",
                        "cards_count": None
                    }
                }
            }
        },
        404: _LIST_NOT_FOUND_RESPONSE
    }
)
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
