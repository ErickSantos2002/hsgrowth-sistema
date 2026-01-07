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
from app.models.card import Card

router = APIRouter()


def card_to_response(
    card: Card,
    assigned_to_name: Optional[str] = None,
    list_name: Optional[str] = None,
    board_id: Optional[int] = None
) -> CardResponse:
    """
    Converte um Card do modelo para CardResponse do schema.
    Faz a conversão de is_won (Integer) para bool e usa as properties.
    """
    return CardResponse(
        id=card.id,
        title=card.title,
        description=card.description,
        list_id=card.list_id,
        assigned_to_id=card.assigned_to_id,
        value=card.value,
        due_date=card.due_date,
        contact_info=card.contact_info,
        is_won=card.is_won == 1,  # Converte Integer para bool
        is_lost=card.is_lost,  # Já é property que retorna bool
        won_at=card.won_at,  # Property que retorna datetime ou None
        lost_at=card.lost_at,  # Property que retorna datetime ou None
        position=card.position,
        created_at=card.created_at,
        updated_at=card.updated_at,
        assigned_to_name=assigned_to_name,
        list_name=list_name,
        board_id=board_id
    )


@router.get(
    "",
    response_model=CardListResponse,
    summary="Listar cards",
    description="""
    Lista todos os cards de um board específico com paginação e filtros avançados.

    **Parâmetros obrigatórios:**
    - `board_id`: ID do board que contém os cards

    **Filtros disponíveis:**
    - `page`: Número da página (padrão: 1)
    - `page_size`: Quantidade por página (padrão: 50, máximo: 100)
    - `assigned_to_id`: Filtrar por responsável (ID do usuário)
    - `is_won`: Filtrar apenas cards ganhos (true/false)
    - `is_lost`: Filtrar apenas cards perdidos (true/false)

    **Multi-tenancy:**
    - Retorna apenas cards da conta do usuário autenticado
    - Isolamento automático por `account_id`

    **Resposta:**
    - Lista de cards com dados completos (valor, responsável, lista, datas)
    - Metadados de paginação (total, páginas)
    - Cards deletados não são retornados

    **Use este endpoint para:**
    - Exibir pipeline de vendas (quadro Kanban)
    - Listar cards por vendedor
    - Filtrar cards ganhos/perdidos para relatórios
    """,
    responses={
        200: {
            "description": "Lista de cards retornada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "cards": [
                            {
                                "id": 1,
                                "title": "Proposta - Empresa XYZ",
                                "description": "Negociação de contrato anual",
                                "list_name": "Negociação",
                                "value": 50000.00,
                                "assigned_to_name": "João Silva",
                                "due_date": "2026-01-15",
                                "is_won": False,
                                "is_lost": False,
                                "created_at": "2026-01-01T10:00:00"
                            }
                        ],
                        "total": 42,
                        "page": 1,
                        "page_size": 50,
                        "total_pages": 1
                    }
                }
            }
        },
        401: {"description": "Não autenticado"},
        404: {"description": "Board não encontrado"}
    }
)
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
    Endpoint de listagem de cards.
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

    return card_to_response(card, assigned_to_name, list_name, board_id)


@router.post(
    "",
    response_model=CardResponse,
    summary="Criar card",
    description="""
    Cria um novo card (lead/oportunidade) no pipeline de vendas.

    **Campos obrigatórios:**
    - `title`: Título descritivo do card
    - `list_id`: ID da lista onde o card será criado

    **Campos opcionais:**
    - `description`: Descrição detalhada da oportunidade
    - `assigned_to_id`: ID do vendedor responsável
    - `value`: Valor monetário estimado (decimal)
    - `due_date`: Data de vencimento/follow-up (formato: YYYY-MM-DD)
    - `contact_info`: JSON com dados de contato (nome, email, telefone, etc)

    **Automações:**
    - Dispara trigger `card_created` para automações configuradas
    - Pode atribuir pontos de gamificação automaticamente
    - Pode enviar notificações para o responsável

    **Posicionamento:**
    - Card é adicionado ao final da lista automaticamente
    - Position é calculada com base nos cards existentes

    **Validações:**
    - Lista deve existir e pertencer à conta do usuário
    - Assigned_to_id deve ser usuário da mesma conta
    - Value deve ser número positivo ou zero

    **Gamificação:**
    - Criador pode ganhar pontos pela criação
    - Responsável pode ganhar pontos ao converter
    """,
    status_code=201,
    responses={
        201: {
            "description": "Card criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 42,
                        "title": "Proposta - Empresa ABC",
                        "description": "Contrato de consultoria anual",
                        "list_id": 3,
                        "list_name": "Qualificação",
                        "assigned_to_id": 5,
                        "assigned_to_name": "Ana Santos",
                        "value": 75000.00,
                        "due_date": "2026-01-20",
                        "contact_info": {
                            "name": "Carlos Silva",
                            "email": "carlos@abc.com",
                            "phone": "+55 11 98765-4321"
                        },
                        "is_won": False,
                        "is_lost": False,
                        "position": 10.0,
                        "created_at": "2026-01-06T16:00:00"
                    }
                }
            }
        },
        400: {"description": "Dados inválidos"},
        401: {"description": "Não autenticado"},
        404: {"description": "Lista não encontrada"}
    }
)
async def create_card(
    card_data: CardCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de criação de card.
    """
    service = CardService(db)
    card = service.create_card(card_data, current_user)

    return card_to_response(card)


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

    return card_to_response(card)


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

    return card_to_response(card)


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

    return card_to_response(card)


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
