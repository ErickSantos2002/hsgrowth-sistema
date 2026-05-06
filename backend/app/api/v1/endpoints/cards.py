"""
Endpoints de Cards.
Rotas para gerenciamento de cartões e campos customizados.
"""
from typing import Any, Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Path, Request, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.repositories.notification_repository import NotificationRepository

from app.api.deps import get_db, get_current_active_user, require_not_viewer
from app.services.card_service import CardService
from app.schemas.card import (
    CardCloneResponse,
    CardCreate,
    CardUpdate,
    CardResponse,
    CardListResponse,
    CardMoveRequest,
    CardAssignRequest,
    CardExpandedResponse,
    CardMarkLostRequest,
    CardReopenRequest,
    CardReopenResponse,
    CardImportResponse,
)
from app.schemas.field import CardFieldValueCreate, CardFieldValueResponse
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.card import Card

router = APIRouter()


def card_to_response(
    card: Card,
    assigned_to_name: Optional[str] = None,
    assigned_to_avatar_url: Optional[str] = None,
    sdr_name: Optional[str] = None,
    sdr_avatar_url: Optional[str] = None,
    list_name: Optional[str] = None,
    board_id: Optional[int] = None,
    board_has_done_stage: Optional[bool] = None,
    client_name: Optional[str] = None,
    person_name: Optional[str] = None,
    person_email: Optional[str] = None,
    person_phone: Optional[str] = None,
    person_phone_whatsapp: Optional[str] = None,
    person_phone_commercial: Optional[str] = None,
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
        sdr_id=card.sdr_id,
        value=card.value,
        shipping_cost=card.shipping_cost,
        due_date=card.due_date,
        is_won=card.is_won == 1,  # Converte Integer para bool
        is_lost=card.is_lost,  # Já é property que retorna bool
        won_at=card.won_at,
        lost_at=card.lost_at,
        position=card.position,
        created_at=card.created_at,
        updated_at=card.updated_at,
        assigned_to_name=assigned_to_name,
        assigned_to_avatar_url=assigned_to_avatar_url,
        sdr_name=sdr_name,
        sdr_avatar_url=sdr_avatar_url,
        list_name=list_name,
        board_id=board_id,
        board_has_done_stage=board_has_done_stage,
        client_name=client_name,
        person_id=card.person_id,
        person_name=person_name,
        person_email=person_email,
        person_phone=person_phone,
        person_phone_whatsapp=person_phone_whatsapp,
        person_phone_commercial=person_phone_commercial,
        # Campos do blueprint da consultora
        prospection_entry_date=card.prospection_entry_date,
        acquisition_entry_date=card.acquisition_entry_date,
        expansion_entry_date=card.expansion_entry_date,
        deal_type=card.deal_type,
        acquisition_channel=card.acquisition_channel,
        acquisition_channel_detail=card.acquisition_channel_detail,
        utm_params=card.utm_params,
        loss_reason=card.loss_reason,
        has_implementation=card.has_implementation,
        has_personnel=card.has_personnel,
        automacao01=card.automacao01,
        # Campos de rastreamento de origem (integração n8n / RD Station)
        origin=card.origin,
        utm_campaign=card.utm_campaign,
        utm_source=card.utm_source,
        utm_term=card.utm_term,
        reopened_from_card_id=card.reopened_from_card_id,
    )


@router.get(
    "",
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
    all: bool = Query(False, description="Retornar TODOS os cards sem paginação (Kanban)"),
    minimal: bool = Query(False, description="Retornar apenas campos essenciais (otimizado para Kanban)"),
    assigned_to_id: Optional[int] = Query(None, description="Filtrar por responsável"),
    person_id: Optional[int] = Query(None, description="Filtrar por pessoa (contato)"),
    is_won: Optional[bool] = Query(None, description="Filtrar por cards ganhos"),
    is_lost: Optional[bool] = Query(None, description="Filtrar por cards perdidos"),
    entered_at_from: Optional[datetime] = Query(None, description="Filtrar cards que entraram na lista atual a partir desta data"),
    entered_at_to: Optional[datetime] = Query(None, description="Filtrar cards que entraram na lista atual até esta data"),
    created_at_from: Optional[datetime] = Query(None, description="Filtrar cards criados a partir desta data"),
    created_at_to: Optional[datetime] = Query(None, description="Filtrar cards criados até esta data"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de listagem de cards.

    Parâmetros especiais para performance:
    - all=true: Retorna TODOS os cards sem limite (para Kanban)
    - minimal=true: Retorna apenas campos essenciais (reduz payload ~60%)
    - entered_at_from/to: Filtra por data de entrada na lista atual (via CardListHistory)
    - created_at_from/to: Filtra por data de criação do card
    """
    service = CardService(db)
    return service.list_cards(
        board_id=board_id,
        page=page,
        page_size=page_size,
        all=all,
        minimal=minimal,
        assigned_to_id=assigned_to_id,
        person_id=person_id,
        is_won=is_won,
        is_lost=is_lost,
        entered_at_from=entered_at_from,
        entered_at_to=entered_at_to,
        created_at_from=created_at_from,
        created_at_to=created_at_to,
        current_user=current_user,
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
    card = service.get_card_by_id(card_id, current_user)

    # Busca informações relacionadas
    assigned_to_name = None
    assigned_to_avatar_url = None
    if card.assigned_to_id:
        from app.models.user import User
        assigned_user = db.query(User).filter(User.id == card.assigned_to_id).first()
        if assigned_user:
            assigned_to_name = assigned_user.name
            assigned_to_avatar_url = assigned_user.avatar_url

    from app.repositories.list_repository import ListRepository
    from app.models.list import List as BoardList
    list_repo = ListRepository(db)
    list_obj = list_repo.find_by_id(card.list_id)
    list_name = list_obj.name if list_obj else None
    board_id = list_obj.board_id if list_obj else None

    # Verifica se o board possui lista de ganho — usado no frontend para exibir/ocultar botão "Ganho"
    board_has_done_stage = False
    if board_id:
        board_has_done_stage = db.query(BoardList).filter(
            BoardList.board_id == board_id,
            BoardList.is_done_stage == True,
        ).first() is not None

    # Busca nome do cliente vinculado
    client_name = None
    if card.client_id:
        from app.models.client import Client
        client = db.query(Client).filter(Client.id == card.client_id).first()
        if client:
            client_name = client.name

    # Busca dados da pessoa de contato vinculada
    person_name = None
    person_email = None
    person_phone = None
    person_phone_whatsapp = None
    person_phone_commercial = None
    if card.person_id:
        from app.models.person import Person
        person = db.query(Person).filter(Person.id == card.person_id).first()
        if person:
            person_name = person.name
            person_email = person.email or person.email_commercial or person.email_personal
            person_phone = person.phone
            person_phone_whatsapp = person.phone_whatsapp
            person_phone_commercial = person.phone_commercial

    return card_to_response(
        card,
        assigned_to_name,
        assigned_to_avatar_url,
        list_name=list_name,
        board_id=board_id,
        board_has_done_stage=board_has_done_stage,
        client_name=client_name,
        person_name=person_name,
        person_email=person_email,
        person_phone=person_phone,
        person_phone_whatsapp=person_phone_whatsapp,
        person_phone_commercial=person_phone_commercial,
    )


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

    **Automações:**
    - Dispara trigger `card_created` para automações configuradas
    - Pode atribuir pontos de gamificação automaticamente
    - Pode enviar notificações para o responsável

    **Posicionamento:**
    - Card é adicionado ao final da lista automaticamente
    - Position é calculada com base nos cards existentes

    **Validações:**
    - Lista deve existir no sistema
    - Assigned_to_id deve ser usuário válido
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
    request: Request,
    card_data: CardCreate,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Endpoint de criação de card.
    """
    service = CardService(db)
    card = service.create_card(card_data, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Constrói descrição rica mencionando responsável e lista (facilita auditoria)
    desc_parts = [f"Card criado: {card.title}"]
    if card.assigned_to and card.assigned_to.name:
        desc_parts.append(f"Responsável: {card.assigned_to.name}")
    if card.sdr and card.sdr.name:
        desc_parts.append(f"SDR: {card.sdr.name}")
    if card.list:
        desc_parts.append(f"Lista: {card.list.name}")
    if card.value:
        desc_parts.append(f"Valor: R$ {float(card.value):,.2f}")

    # Busca nomes do cliente e da pessoa para enriquecer o snapshot
    client_name = None
    if card.client_id:
        from app.models.client import Client
        client_obj = db.query(Client).filter(Client.id == card.client_id).first()
        client_name = client_obj.name if client_obj else None

    person_name = None
    if card.person_id:
        from app.models.person import Person
        person_obj = db.query(Person).filter(Person.id == card.person_id).first()
        person_name = person_obj.name if person_obj else None

    # Snapshot COMPLETO de todos os campos preenchíveis na criação.
    # Campos nulos indicam o que o usuário deixou em branco — facilita auditoria de qualidade.
    data_after = {
        "id": card.id,
        "title": card.title,
        "description": card.description,
        "list_id": card.list_id,
        "list_name": card.list.name if card.list else None,
        "assigned_to_id": card.assigned_to_id,
        "assigned_to_name": card.assigned_to.name if card.assigned_to else None,
        "sdr_id": card.sdr_id,
        "sdr_name": card.sdr.name if card.sdr else None,
        "client_id": card.client_id,
        "client_name": client_name,
        "person_id": card.person_id,
        "person_name": person_name,
        "value": float(card.value) if card.value is not None else None,
        "due_date": card.due_date.isoformat() if card.due_date else None,
        "deal_type": card.deal_type,
        "acquisition_channel": card.acquisition_channel,
        "acquisition_channel_detail": card.acquisition_channel_detail,
        "origin": card.origin,
        "has_implementation": card.has_implementation,
        "has_personnel": card.has_personnel,
        "prospection_entry_date": card.prospection_entry_date.isoformat() if card.prospection_entry_date else None,
        "acquisition_entry_date": card.acquisition_entry_date.isoformat() if card.acquisition_entry_date else None,
        "expansion_entry_date": card.expansion_entry_date.isoformat() if card.expansion_entry_date else None,
        "utm_campaign": card.utm_campaign,
        "utm_source": card.utm_source,
        "utm_term": card.utm_term,
    }

    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE",
        entity_type="Card",
        entity_id=card.id,
        description=" | ".join(desc_parts),
        data_after=data_after,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return card_to_response(card)


@router.put("/{card_id}", response_model=CardResponse, summary="Atualizar card")
async def update_card(
    request: Request,
    card_id: int = Path(..., description="ID do card"),
    card_data: CardUpdate = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atualiza um card existente.

    - **card_id**: ID do card
    - Todos os campos são opcionais
    """
    service = CardService(db)

    # Captura estado anterior ANTES de atualizar (extrai para dict para evitar referência à sessão)
    card_before_obj = db.query(Card).filter(Card.id == card_id).first()
    data_before = None
    if card_before_obj:
        data_before = {
            "title": card_before_obj.title,
            "description": card_before_obj.description,
            "list_id": card_before_obj.list_id,
            "assigned_to_id": card_before_obj.assigned_to_id,
            "sdr_id": card_before_obj.sdr_id,
            "value": float(card_before_obj.value) if card_before_obj.value is not None else None,
            "due_date": card_before_obj.due_date.isoformat() if card_before_obj.due_date else None,
            "client_id": card_before_obj.client_id,
            "person_id": card_before_obj.person_id,
        }

    card = service.update_card(card_id, card_data, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Constrói descrição com campos alterados
    changed_fields = []
    if card_data.title is not None:
        changed_fields.append("título")
    if card_data.description is not None:
        changed_fields.append("descrição")
    if card_data.value is not None:
        changed_fields.append("valor")
    if card_data.due_date is not None:
        changed_fields.append("data de vencimento")
    if card_data.assigned_to_id is not None:
        changed_fields.append("responsável")

    fields_str = ", ".join(changed_fields) if changed_fields else "dados"

    # Snapshot do estado após a atualização
    data_after = {
        "title": card.title,
        "description": card.description,
        "list_id": card.list_id,
        "assigned_to_id": card.assigned_to_id,
        "sdr_id": card.sdr_id,
        "value": float(card.value) if card.value is not None else None,
        "due_date": card.due_date.isoformat() if card.due_date else None,
        "client_id": card.client_id,
        "person_id": card.person_id,
    }

    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE",
        entity_type="Card",
        entity_id=card.id,
        description=f"Card atualizado: {card.title} - Campos: {fields_str}",
        data_before=data_before,
        data_after=data_after,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return card_to_response(card)


@router.delete("/{card_id}", summary="Deletar card")
async def delete_card(
    request: Request,
    card_id: int = Path(..., description="ID do card"),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta um card permanentemente.

    - **card_id**: ID do card
    """
    # Captura estado do card ANTES de deletar para registrar no log
    card = db.query(Card).filter(Card.id == card_id).first()
    card_title = card.title if card else f"ID {card_id}"

    # Snapshot completo do card antes da exclusão
    data_before = None
    if card:
        data_before = {
            "id": card.id,
            "title": card.title,
            "description": card.description,
            "list_id": card.list_id,
            "assigned_to_id": card.assigned_to_id,
            "sdr_id": card.sdr_id,
            "value": float(card.value) if card.value is not None else None,
            "due_date": card.due_date.isoformat() if card.due_date else None,
            "client_id": card.client_id,
            "person_id": card.person_id,
            "is_won": bool(card.is_won),
            "is_lost": card.is_lost,
        }

    service = CardService(db)
    service.delete_card(card_id, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="DELETE",
        entity_type="Card",
        entity_id=card_id,
        description=f"Card deletado: {card_title}",
        data_before=data_before,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Card deletado com sucesso"}


@router.put("/{card_id}/move", response_model=CardResponse, summary="Mover card entre listas")
async def move_card(
    request: Request,
    card_id: int = Path(..., description="ID do card"),
    move_data: CardMoveRequest = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Move um card para outra lista.

    - **card_id**: ID do card
    - **target_list_id**: ID da lista de destino
    - **position**: Posição na lista de destino (opcional)
    """
    from app.models.list import List as BoardList

    # Captura lista de origem ANTES de mover
    card_before_obj = db.query(Card).filter(Card.id == card_id).first()
    origin_list = db.query(BoardList).filter(BoardList.id == card_before_obj.list_id).first() if card_before_obj else None
    data_before = {
        "list_id": card_before_obj.list_id if card_before_obj else None,
        "list_name": origin_list.name if origin_list else None,
    }

    service = CardService(db)
    card = service.move_card(
        card_id=card_id,
        target_list_id=move_data.target_list_id,
        position=move_data.position,
        current_user=current_user
    )

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Busca o nome da lista de destino
    target_list = db.query(BoardList).filter(BoardList.id == move_data.target_list_id).first()
    list_name = target_list.name if target_list else f"Lista ID {move_data.target_list_id}"

    data_after = {
        "list_id": move_data.target_list_id,
        "list_name": list_name,
    }

    audit_log = AuditLog(
        user_id=current_user.id,
        action="STATUS_CHANGE",
        entity_type="Card",
        entity_id=card.id,
        description=f"Card movido: {card.title} → {list_name}",
        data_before=data_before,
        data_after=data_after,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return card_to_response(card)


@router.put("/{card_id}/assign", response_model=CardResponse, summary="Atribuir card a usuário")
async def assign_card(
    request: Request,
    card_id: int = Path(..., description="ID do card"),
    assign_data: CardAssignRequest = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Atribui um card a um usuário responsável.

    - **card_id**: ID do card
    - **assigned_to_id**: ID do usuário responsável
    """
    # Captura responsável anterior ANTES de reatribuir
    card_before_obj = db.query(Card).filter(Card.id == card_id).first()
    old_assigned_id = card_before_obj.assigned_to_id if card_before_obj else None
    old_assigned_user = db.query(User).filter(User.id == old_assigned_id).first() if old_assigned_id else None
    data_before = {
        "assigned_to_id": old_assigned_id,
        "assigned_to_name": old_assigned_user.name if old_assigned_user else None,
    }

    service = CardService(db)
    card = service.assign_card(
        card_id=card_id,
        user_id=assign_data.assigned_to_id,
        current_user=current_user
    )

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Busca o nome do novo responsável
    assigned_user = db.query(User).filter(User.id == assign_data.assigned_to_id).first()
    assigned_name = assigned_user.name if assigned_user else f"Usuário ID {assign_data.assigned_to_id}"

    data_after = {
        "assigned_to_id": assign_data.assigned_to_id,
        "assigned_to_name": assigned_name,
    }

    audit_log = AuditLog(
        user_id=current_user.id,
        action="TRANSFER",
        entity_type="Card",
        entity_id=card.id,
        description=f"Card transferido: {card.title} → {assigned_name}",
        data_before=data_before,
        data_after=data_after,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return card_to_response(card)


# ========== ENDPOINT DE REABERTURA ==========

@router.post(
    "/{card_id}/clone",
    response_model=CardCloneResponse,
    summary="Clonar card",
)
async def clone_card(
    request: Request,
    card_id: int = Path(..., description="ID do card a ser clonado"),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Clona um card na mesma lista. Copia dados do lado esquerdo (resumo, cliente,
    contato, produto, automações, datas de tracking de boards).
    Não copia atividades, anotações nem arquivos.
    Cria uma nota em ambos os cards registrando o clone.
    """
    service = CardService(db)
    new_card = service.clone_card(card_id, current_user)

    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    audit_log = AuditLog(
        user_id=current_user.id,
        action="CLONE",
        entity_type="Card",
        entity_id=card_id,
        description=f"Card #{card_id} clonado como card #{new_card.id} ({new_card.title})",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return CardCloneResponse(
        new_card_id=new_card.id,
        new_card_title=new_card.title,
        original_card_id=card_id,
        message="Card clonado com sucesso"
    )


@router.post(
    "/{card_id}/reopen",
    response_model=CardReopenResponse,
    summary="Reabrir negócio perdido",
    responses={
        200: {
            "description": "Negócio reaberto com sucesso - novo card criado",
            "content": {"application/json": {"example": {
                "new_card_id": 245,
                "new_card_title": "Retomada - Empresa XYZ",
                "original_card_id": 152,
                "message": "Negócio reaberto com sucesso"
            }}}
        },
        400: {
            "description": "Card não está perdido",
            "content": {"application/json": {"example": {
                "detail": "Apenas negócios perdidos podem ser reabertos"
            }}}
        },
        404: {
            "description": "Card não encontrado",
            "content": {"application/json": {"example": {
                "detail": "Card não encontrado"
            }}}
        }
    }
)
async def reopen_card(
    request: Request,
    card_id: int = Path(..., description="ID do card perdido a ser reaberto"),
    reopen_data: CardReopenRequest = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Reabre um negócio perdido criando um clone na lista de Prospecção (list_id=22).

    O card original **não é modificado** - continua como perdido.
    Um novo card é criado com:
    - Canal de Aquisição = "Base"
    - Canal de Aquisição Detalhamento = escolha do vendedor
    - Título editado pelo vendedor
    - Lista de destino = Prospecção (list_id=22, board_id=6)

    **Permissões:** Qualquer usuário autenticado
    """
    service = CardService(db)
    new_card = service.reopen_card(card_id, reopen_data, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="REOPEN",
        entity_type="Card",
        entity_id=card_id,
        description=f"Negócio reaberto: card #{card_id} gerou novo card #{new_card.id} ({reopen_data.title})",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    return CardReopenResponse(
        new_card_id=new_card.id,
        new_card_title=new_card.title,
        original_card_id=card_id,
        message="Negócio reaberto com sucesso"
    )


# ========== ENDPOINTS DE MARCAR GANHO / PERDIDO ==========

@router.post(
    "/{card_id}/win",
    response_model=CardResponse,
    summary="Marcar negócio como ganho",
    responses={
        200: {"description": "Negócio marcado como ganho e movido para a lista correspondente"},
        422: {"description": "Board não possui lista de ganho, ou card já em estado terminal",
              "content": {"application/json": {"example": {
                  "detail": "Este board não possui uma lista de 'Negócio Ganho'."
              }}}},
        403: {"description": "Permissão negada (viewer)"},
        404: {"description": "Card não encontrado"},
    }
)
async def mark_card_won(
    request: Request,
    card_id: int = Path(..., description="ID do card a ser marcado como ganho"),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Marca um negócio como ganho, movendo-o automaticamente para a lista
    **is_done_stage** do board atual (ex: 'Negócio Ganho' no board de Aquisição).

    O endpoint localiza a lista de ganho do board — não é necessário informar o list_id.
    Todo o fluxo de gamificação, histórico de etapas e automações é executado normalmente.

    **Restrições:**
    - Board de Prospecção não possui lista de ganho — somente Aquisição/Expansão permitem ganho.
    - Card já ganho ou já perdido retorna erro 422.
    """
    service = CardService(db)
    moved_card = service.mark_card_won(card_id, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE",
        entity_type="Card",
        entity_id=card_id,
        description=f"Negócio #{card_id} marcado como ganho",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    # Monta resposta com campos relacionados
    from app.models.list import List as BoardList
    from app.repositories.list_repository import ListRepository
    list_repo = ListRepository(db)
    list_obj = list_repo.find_by_id(moved_card.list_id)
    list_name = list_obj.name if list_obj else None
    board_id = list_obj.board_id if list_obj else None

    # Após ganho, o board certamente tem done_stage (foi para lá agora)
    board_has_done_stage = True

    assigned_to_name = None
    if moved_card.assigned_to_id:
        from app.models.user import User as UserModel
        assigned_user = db.query(UserModel).filter(UserModel.id == moved_card.assigned_to_id).first()
        if assigned_user:
            assigned_to_name = assigned_user.name

    return card_to_response(
        moved_card,
        assigned_to_name=assigned_to_name,
        list_name=list_name,
        board_id=board_id,
        board_has_done_stage=board_has_done_stage,
    )


@router.post(
    "/{card_id}/lose",
    response_model=CardResponse,
    summary="Marcar negócio como perdido",
    responses={
        200: {"description": "Negócio marcado como perdido e movido para a lista correspondente"},
        422: {"description": "Board não possui lista de perda, ou card já em estado terminal",
              "content": {"application/json": {"example": {
                  "detail": "Este negócio já está marcado como perdido."
              }}}},
        403: {"description": "Permissão negada (viewer)"},
        404: {"description": "Card não encontrado"},
    }
)
async def mark_card_lost(
    request: Request,
    card_id: int = Path(..., description="ID do card a ser marcado como perdido"),
    data: CardMarkLostRequest = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Marca um negócio como perdido, movendo-o automaticamente para a lista
    **is_lost_stage** do board atual (ex: 'Negócio Perdido') e salvando o motivo da perda.

    O endpoint localiza a lista de perda do board — não é necessário informar o list_id.
    Todo o fluxo de gamificação, histórico de etapas e automações é executado normalmente.

    **Restrições:**
    - Card já ganho ou já perdido retorna erro 422.
    """
    service = CardService(db)
    moved_card = service.mark_card_lost(card_id, data.loss_reason, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE",
        entity_type="Card",
        entity_id=card_id,
        description=f"Negócio #{card_id} marcado como perdido — motivo: {data.loss_reason}",
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()

    # Monta resposta com campos relacionados
    from app.models.list import List as BoardList
    from app.repositories.list_repository import ListRepository
    list_repo = ListRepository(db)
    list_obj = list_repo.find_by_id(moved_card.list_id)
    list_name = list_obj.name if list_obj else None
    board_id = list_obj.board_id if list_obj else None

    board_has_done_stage = False
    if board_id:
        board_has_done_stage = db.query(BoardList).filter(
            BoardList.board_id == board_id,
            BoardList.is_done_stage == True,
        ).first() is not None

    assigned_to_name = None
    if moved_card.assigned_to_id:
        from app.models.user import User as UserModel
        assigned_user = db.query(UserModel).filter(UserModel.id == moved_card.assigned_to_id).first()
        if assigned_user:
            assigned_to_name = assigned_user.name

    return card_to_response(
        moved_card,
        assigned_to_name=assigned_to_name,
        list_name=list_name,
        board_id=board_id,
        board_has_done_stage=board_has_done_stage,
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


@router.post("/{card_id}/fields", response_model=CardResponse, summary="Adicionar/atualizar campo customizado")
async def add_or_update_field(
    card_id: int = Path(..., description="ID do card"),
    field_data: CardFieldValueCreate = ...,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Adiciona ou atualiza o valor de um campo customizado em um card.

    - **card_id**: ID do card
    - **field_definition_id**: ID da definição do campo (ou field_name + field_type)
    - **value**: Valor do campo (ou field_value)
    """
    service = CardService(db)

    # Adiciona ou atualiza o campo customizado
    service.add_or_update_field_value(card_id, field_data, current_user)

    # Busca o card atualizado com os custom_fields
    card = service.get_card_by_id(card_id)
    custom_fields = service.get_card_field_values(card_id, current_user)

    # Busca informações relacionadas
    assigned_to_name = None
    if card.assigned_to_id:
        from app.models.user import User as UserModel
        assigned_user = db.query(UserModel).filter(UserModel.id == card.assigned_to_id).first()
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
        is_won=card.is_won,
        is_lost=card.is_lost,
        won_at=card.won_at,
        lost_at=card.lost_at,
        position=card.position,
        created_at=card.created_at,
        updated_at=card.updated_at,
        assigned_to_name=assigned_to_name,
        assigned_to_avatar_url=assigned_to_avatar_url,
        sdr_name=sdr_name,
        sdr_avatar_url=sdr_avatar_url,
        list_name=list_name,
        board_id=board_id,
        custom_fields=[cf.model_dump() for cf in custom_fields]
    )


@router.get("/{card_id}/expanded", response_model=CardExpandedResponse)
def get_card_expanded(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Busca um card com todos os relacionamentos carregados.

    Ideal para a página CardDetails que precisa de todos os dados:
    - Informações básicas do card
    - Cliente vinculado (se houver)
    - Usuário responsável
    - Valores dos campos customizados
    - Tarefas pendentes
    - Produtos associados
    - Atividades recentes

    **Endpoint otimizado** para carregar todos os dados de uma vez.
    """
    service = CardService(db)
    return service.get_card_expanded(card_id, current_user)


@router.post(
    "/{card_id}/person",
    summary="Vincular pessoa ao card",
    description="""
    Vincula uma pessoa (contato) a um card.

    **Parâmetros:**
    - `card_id`: ID do card
    - `person_id`: ID da pessoa (no corpo da requisição)

    **Comportamento:**
    - Vincula a pessoa ao card através do campo person_id
    - Registra a ação no histórico de atividades
    - Substitui a pessoa anterior se já houver uma vinculada

    **Erros:**
    - 404: Card ou pessoa não encontrados
    - 401: Não autenticado
    """
)
async def link_person_to_card(
    card_id: int,
    person_id: int = Query(..., description="ID da pessoa"),
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Vincula uma pessoa a um card.
    """
    service = CardService(db)
    card = service.link_person_to_card(card_id, person_id, current_user)

    return {"message": "Pessoa vinculada ao card com sucesso", "card_id": card.id, "person_id": card.person_id}


@router.delete(
    "/{card_id}/person",
    summary="Desvincular pessoa do card",
    description="""
    Desvincula a pessoa (contato) de um card.

    **Parâmetros:**
    - `card_id`: ID do card

    **Comportamento:**
    - Remove a vinculação da pessoa do card (person_id = NULL)
    - Registra a ação no histórico de atividades
    - A pessoa não é deletada, apenas desvinculada do card

    **Erros:**
    - 404: Card não encontrado
    - 401: Não autenticado
    """
)
async def unlink_person_from_card(
    card_id: int,
    current_user: User = Depends(require_not_viewer()),
    db: Session = Depends(get_db)
) -> Any:
    """
    Desvincula a pessoa de um card.
    """
    service = CardService(db)
    card = service.unlink_person_from_card(card_id, current_user)

    return {"message": "Pessoa desvinculada do card com sucesso", "card_id": card.id}


@router.get(
    "/search/global",
    response_model=List[CardResponse],
    summary="Busca global de cards",
    description="""
    Busca cards por título em todos os boards que o usuário tem acesso.

    **Parâmetros:**
    - `q`: Termo de busca (mínimo 2 caracteres)
    - `limit`: Limite de resultados (padrão: 10, máximo: 50)

    **Comportamento:**
    - Busca por título que contenha o termo (case-insensitive)
    - Retorna cards de todos os boards
    - Respeita permissões do usuário (vendedor vê apenas seus cards)
    - Ordenado por atualização mais recente

    **Exemplo de uso:**
    - `/api/v1/cards/search/global?q=proposta`
    - `/api/v1/cards/search/global?q=empresa&limit=20`
    """
)
async def global_search_cards(
    q: str = Query(..., min_length=2, description="Termo de busca"),
    limit: int = Query(10, ge=1, le=50, description="Limite de resultados"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca global de cards em todos os boards.
    """
    from app.models.list import List
    from app.models.board import Board
    from sqlalchemy import or_

    # Query base: busca cards que contenham o termo no título
    query = db.query(Card).filter(
        Card.is_deleted == False,
        Card.title.ilike(f"%{q}%")
    )

    # Todos os usuários podem buscar cards de qualquer vendedor — sem restrição por role

    # Busca os cards ordenados por atualização mais recente
    cards = query.order_by(Card.updated_at.desc()).limit(limit).all()

    # Converte para response com informações adicionais
    results = []
    for card in cards:
        # Busca nome da lista e board
        card_list = db.query(List).filter(List.id == card.list_id).first()
        list_name = card_list.name if card_list else None
        board_id = card_list.board_id if card_list else None
        board_name = None

        if board_id:
            board = db.query(Board).filter(Board.id == board_id).first()
            board_name = board.name if board else None

        # Busca nome e avatar do responsável
        assigned_to_name = None
        assigned_to_avatar_url = None
        if card.assigned_to_id:
            assigned_user = db.query(User).filter(User.id == card.assigned_to_id).first()
            if assigned_user:
                assigned_to_name = assigned_user.name
                assigned_to_avatar_url = assigned_user.avatar_url

        result = card_to_response(
            card=card,
            assigned_to_name=assigned_to_name,
            assigned_to_avatar_url=assigned_to_avatar_url,
            list_name=f"{board_name} / {list_name}" if board_name and list_name else list_name,
            board_id=board_id
        )
        results.append(result)

    return results


@router.post(
    "/{card_id}/automacao01/desativar",
    response_model=CardResponse,
    summary="Desativar automação de nutrição do card",
    description="""
    Desativa o campo `automacao01` de um card e notifica o SDR/Vendedor responsável.

    **Uso:** Chamado pelo sistema externo de nutrição quando o cliente responde ao e-mail
    demonstrando interesse em comprar, sinalizando que o SDR/Vendedor deve entrar em contato.

    **Comportamento:**
    - Define `automacao01 = false` no card
    - Envia webhook de desativação para o sistema externo
    - Envia notificação para o Vendedor e/ou SDR vinculado ao card
    - Se o card já está desativado, retorna o card sem fazer nada

    **Autenticação:** Requer token JWT (usar usuário de integração)
    """
)
async def desativar_automacao01(
    card_id: int = Path(..., description="ID do card"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    card = db.query(Card).filter(Card.id == card_id, Card.deleted_at.is_(None)).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card não encontrado")

    if not card.automacao01:
        # Já desligado — retorna sem alterar
        service = CardService(db)
        return service.get_card_by_id(card_id, current_user)

    # Desliga o campo
    card.automacao01 = False
    db.commit()
    db.refresh(card)

    # Envia webhook de desativação
    service = CardService(db)
    service._send_automacao01_webhook(card, "card.automacao01_desativado", current_user)

    # Notifica o SDR e/ou Vendedor do card
    notification_repo = NotificationRepository(db)
    recipients = []
    if card.assigned_to_id:
        recipients.append(card.assigned_to_id)
    if card.sdr_id and card.sdr_id not in recipients:
        recipients.append(card.sdr_id)

    for user_id in recipients:
        try:
            notification_repo.create({
                "user_id": user_id,
                "notification_type": "info",
                "title": "Cliente demonstrou interesse!",
                "message": f"A automação de nutrição do card '{card.title}' foi desligada — o cliente respondeu ao e-mail e pode estar pronto para contato.",
                "icon": "bell",
                "color": "success",
                "notification_metadata": {"card_id": card.id},
            })
        except Exception as e:
            print(f"[AUTOMACAO01] Erro ao notificar usuário {user_id}: {e}")

    return service.get_card_by_id(card_id, current_user)


# ==================== E-mail via Microsoft Graph ====================

from pydantic import BaseModel

class EmailAttachment(BaseModel):
    name: str
    content_type: str
    data_base64: str  # arquivo em base64


class SendEmailRequest(BaseModel):
    to: list[str]
    subject: str
    body: str
    attachments: list[EmailAttachment] = []
    task_id: Optional[int] = None  # Se informado, conclui essa task em vez de criar nova


@router.post("/{card_id}/send-email", summary="Enviar e-mail pelo card via Microsoft 365")
async def send_email_from_card(
    card_id: int,
    payload: SendEmailRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Envia um e-mail em nome do usuário logado via Microsoft Graph API.
    O e-mail aparece na caixa 'Enviados' do Outlook do usuário e é registrado
    como atividade concluída no card.
    Suporta anexos (base64) e appenda automaticamente a assinatura do usuário.

    Requer que o usuário tenha autenticado via SSO Microsoft (tem ms_access_token).
    """
    from app.models.card_task import CardTask, TaskType
    from app.services.microsoft_graph_service import microsoft_graph_service
    from datetime import datetime, timezone

    card = db.query(Card).filter(Card.id == card_id, Card.deleted_at.is_(None)).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card não encontrado")

    # Monta corpo completo com assinatura (HTML)
    signature = getattr(current_user, "email_signature", None)
    full_html_body = payload.body
    if signature and signature.strip():
        full_html_body = f"{payload.body}<br><br>{signature}"

    # Converte anexos para formato do Graph Service
    graph_attachments = [
        {"name": att.name, "content_type": att.content_type, "data_base64": att.data_base64}
        for att in payload.attachments
    ] if payload.attachments else None

    # Envia via Graph API
    try:
        result = microsoft_graph_service.send_email(
            user=current_user,
            db=db,
            to_addresses=payload.to,
            subject=payload.subject,
            body=full_html_body,
            attachments=graph_attachments,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not result["success"]:
        raise HTTPException(status_code=502, detail=f"Erro ao enviar e-mail: {result.get('error')}")

    # Registra atividade de e-mail no card
    full_body = payload.body.replace("<br>", "\n").strip() if payload.body else ""
    attachment_names = ", ".join(att.name for att in payload.attachments) if payload.attachments else None
    recipients = ", ".join(addr.strip() for addr in payload.to if addr.strip())

    if payload.task_id:
        # Conclui a task existente (criada pela cadência) em vez de criar uma nova
        existing_task = db.query(CardTask).filter(
            CardTask.id == payload.task_id,
            CardTask.card_id == card_id,
        ).first()
        if existing_task:
            existing_task.is_completed = True
            existing_task.is_valid = True
            existing_task.completed_at = datetime.now(timezone.utc)
            existing_task.notes = attachment_names
            existing_task.contact_name = recipients[:255] if recipients else existing_task.contact_name
            db.commit()
            # Avança a cadência
            try:
                from app.services.cadence_service import CadenceService
                db.refresh(existing_task)
                CadenceService(db).on_task_completed(existing_task, current_user)
            except Exception as e:
                print(f"[CADENCE] Erro ao avançar cadência após envio de e-mail: {e}")
    else:
        # Comportamento padrão: cria nova task já concluída
        task = CardTask(
            card_id=card_id,
            assigned_to_id=current_user.id,
            created_by_id=current_user.id,
            title=payload.subject,
            description=full_body,
            notes=attachment_names,
            contact_name=recipients[:255] if recipients else None,
            task_type=TaskType.EMAIL,
            is_completed=True,
            is_valid=True,
            completed_at=datetime.now(timezone.utc),
            due_date=datetime.now(timezone.utc),
        )
        db.add(task)
        db.commit()

    return {"success": True, "message": "E-mail enviado e atividade registrada no card."}


# ==================== IMPORTAÇÃO EM LOTE ====================

@router.get(
    "/import/template",
    summary="Baixar modelo de planilha para importação",
    description="Retorna um arquivo .xlsx com o modelo de planilha para importação em lote de cards.",
    responses={200: {"content": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {}}}},
)
def download_import_template(
    current_user: User = Depends(get_current_active_user),
):
    from fastapi.responses import Response
    from app.services.card_import_service import generate_template

    user_role = current_user.role.name if current_user.role else ""
    xlsx_bytes = generate_template(user_name=current_user.name or "", user_role=user_role)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=modelo_importacao_cards.xlsx"},
    )


@router.post(
    "/import",
    response_model=CardImportResponse,
    summary="Importar cards em lote via planilha",
    description="""
    Importa cards em lote a partir de um arquivo `.xlsx`.
    Todos os cards são criados na lista **Lead Novo** do board **Prospecção**.

    - Clientes são criados ou reutilizados (por CNPJ ou nome exato).
    - Contatos são criados ou reutilizados (por e-mail comercial).
    - Erros em uma linha não cancelam as demais.
    """,
)
async def import_cards(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.services.card_import_service import process_import

    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Apenas arquivos .xlsx ou .xls são aceitos.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo: 10 MB.")

    user_role = current_user.role.name if current_user.role else ""
    return process_import(db=db, file_bytes=content, current_user_id=current_user.id, current_user_role=user_role)
