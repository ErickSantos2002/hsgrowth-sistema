"""
Endpoints de Notificações.
Rotas para gerenciamento de notificações in-app.
"""
from typing import Any
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.notification_service import NotificationService
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    NotificationStatsResponse,
    BulkNotificationCreate,
    BulkNotificationResponse
)
from app.models.user import User

router = APIRouter()


@router.get("", response_model=NotificationListResponse, summary="Listar notificações")
async def list_notifications(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Tamanho da página"),
    unread_only: bool = Query(False, description="Retornar apenas não lidas"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Lista notificações do usuário autenticado com paginação.

    - **page**: Número da página (padrão: 1)
    - **page_size**: Tamanho da página (padrão: 20, máx: 100)
    - **unread_only**: Se True, retorna apenas notificações não lidas (padrão: False)

    **Retorna:**
    - Lista de notificações (mais recentes primeiro)
    - Total de notificações
    - Quantidade de não lidas
    - Informações de paginação
    """
    service = NotificationService(db)
    return service.list_notifications(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        unread_only=unread_only
    )


@router.get("/unread-count", summary="Contador de notificações não lidas")
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Retorna apenas o contador de notificações não lidas.

    **Retorna:**
    - `unread_count`: Quantidade de notificações não lidas

    **Nota:** Endpoint otimizado para polling frequente (usado no badge do header).
    """
    service = NotificationService(db)
    from app.repositories.notification_repository import NotificationRepository

    repo = NotificationRepository(db)
    unread_count = repo.count_unread_by_user(current_user.id)

    return {"unread_count": unread_count}


@router.get("/stats", response_model=NotificationStatsResponse, summary="Estatísticas de notificações")
async def get_notification_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Retorna estatísticas de notificações do usuário.

    **Retorna:**
    - Total de notificações
    - Quantidade de não lidas
    - Contagem por tipo de notificação
    """
    service = NotificationService(db)
    return service.get_notification_stats(user_id=current_user.id)


@router.get("/{notification_id}", response_model=NotificationResponse, summary="Buscar notificação")
async def get_notification(
    notification_id: int = Path(..., description="ID da notificação"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Busca uma notificação por ID.

    - **notification_id**: ID da notificação

    **Nota:** Apenas o dono da notificação pode acessá-la.
    """
    service = NotificationService(db)
    notification = service.get_notification_by_id(
        notification_id=notification_id,
        user_id=current_user.id
    )
    return NotificationResponse.model_validate(notification)


@router.post("", response_model=NotificationResponse, summary="Criar notificação")
async def create_notification(
    data: NotificationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria uma nova notificação.

    **Nota:** Normalmente notificações são criadas automaticamente pelo sistema.
    Este endpoint é útil para notificações manuais ou testes.

    **Requer:** Permissão de criar notificações (geralmente Admin ou sistema interno)
    """
    service = NotificationService(db)
    return service.create_notification(data)


@router.post("/bulk", response_model=BulkNotificationResponse, summary="Criar notificações em lote")
async def create_bulk_notifications(
    data: BulkNotificationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cria notificações em lote para múltiplos usuários.

    **Útil para:**
    - Enviar anúncios para toda equipe
    - Notificar múltiplos vendedores sobre algo
    - Comunicações em massa

    **Requer:** Permissão de Admin
    """
    service = NotificationService(db)
    return service.create_bulk_notifications(data)


@router.put("/{notification_id}/read", response_model=NotificationResponse, summary="Marcar como lida")
async def mark_notification_as_read(
    notification_id: int = Path(..., description="ID da notificação"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Marca uma notificação como lida.

    - **notification_id**: ID da notificação

    **Efeitos:**
    - Define `is_read = True`
    - Define `read_at` com timestamp atual
    """
    service = NotificationService(db)
    return service.mark_as_read(
        notification_id=notification_id,
        user_id=current_user.id
    )


@router.put("/read-all", summary="Marcar todas como lidas")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Marca todas as notificações do usuário como lidas.

    **Útil para:** Limpar todas as notificações de uma vez.

    **Retorna:**
    - Quantidade de notificações marcadas como lidas
    """
    service = NotificationService(db)
    return service.mark_all_as_read(user_id=current_user.id)


@router.post("/mark-as-read", summary="Marcar notificações como lidas (array)")
async def mark_notifications_as_read_batch(
    request_body: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Marca múltiplas notificações como lidas.

    **Body:**
    - `notification_ids`: Array de IDs das notificações

    **Retorna:**
    - Mensagem de sucesso

    **Nota:** Endpoint compatível com frontend que envia array de IDs.
    """
    notification_ids = request_body.get("notification_ids", [])

    service = NotificationService(db)
    marked_count = 0

    for notification_id in notification_ids:
        try:
            service.mark_as_read(notification_id=notification_id, user_id=current_user.id)
            marked_count += 1
        except Exception:
            # Ignora erros individuais (notificação não encontrada, sem permissão, etc)
            pass

    return {"message": f"{marked_count} notificação(ões) marcada(s) como lida(s)"}


@router.post("/mark-all-as-read", summary="Marcar todas como lidas (POST)")
async def mark_all_notifications_as_read_post(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Marca todas as notificações do usuário como lidas (via POST).

    **Retorna:**
    - Quantidade de notificações marcadas como lidas

    **Nota:** Endpoint compatível com frontend que usa POST.
    """
    service = NotificationService(db)
    return service.mark_all_as_read(user_id=current_user.id)


@router.delete("/delete-read", summary="Deletar todas notificações lidas")
async def delete_all_read_notifications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta todas as notificações lidas do usuário.

    **Útil para:** Limpar notificações já visualizadas.

    **Retorna:**
    - Mensagem de sucesso
    """
    from app.repositories.notification_repository import NotificationRepository

    repo = NotificationRepository(db)
    # Busca todas as notificações lidas do usuário
    notifications = db.query(repo.model).filter(
        repo.model.user_id == current_user.id,
        repo.model.is_read == True
    ).all()

    count = len(notifications)

    # Deleta todas
    for notification in notifications:
        db.delete(notification)

    db.commit()

    return {"message": f"{count} notificação(ões) deletada(s)"}


@router.delete("/{notification_id}", summary="Deletar notificação")
async def delete_notification(
    notification_id: int = Path(..., description="ID da notificação"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deleta uma notificação.

    - **notification_id**: ID da notificação

    **Nota:** Apenas o dono da notificação pode deletá-la.
    """
    service = NotificationService(db)
    return service.delete_notification(
        notification_id=notification_id,
        user_id=current_user.id
    )


# ================== Endpoints de helpers (criar notificações específicas) ==================
# Estes endpoints são úteis para testar o sistema de notificações manualmente

@router.post("/helpers/card-assigned", response_model=NotificationResponse, summary="[Helper] Notificar card atribuído")
async def helper_notify_card_assigned(
    user_id: int = Query(..., description="ID do usuário destinatário"),
    card_id: int = Query(..., description="ID do card"),
    card_title: str = Query(..., description="Título do card"),
    board_id: int = Query(..., description="ID do board"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    **[Helper]** Cria notificação de card atribuído.

    Útil para testes e desenvolvimento.
    """
    service = NotificationService(db)
    return service.notify_card_assigned(
        user_id=user_id,
        card_id=card_id,
        card_title=card_title,
        board_id=board_id
    )


@router.post("/helpers/card-overdue", response_model=NotificationResponse, summary="[Helper] Notificar card vencido")
async def helper_notify_card_overdue(
    user_id: int = Query(..., description="ID do usuário destinatário"),
    card_id: int = Query(..., description="ID do card"),
    card_title: str = Query(..., description="Título do card"),
    board_id: int = Query(..., description="ID do board"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    **[Helper]** Cria notificação de card vencido.

    Útil para testes e desenvolvimento.
    """
    service = NotificationService(db)
    return service.notify_card_overdue(
        user_id=user_id,
        card_id=card_id,
        card_title=card_title,
        board_id=board_id
    )


@router.post("/helpers/badge-earned", response_model=NotificationResponse, summary="[Helper] Notificar badge conquistado")
async def helper_notify_badge_earned(
    user_id: int = Query(..., description="ID do usuário destinatário"),
    badge_id: int = Query(..., description="ID do badge"),
    badge_name: str = Query(..., description="Nome do badge"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    **[Helper]** Cria notificação de badge conquistado.

    Útil para testes e desenvolvimento.
    """
    service = NotificationService(db)
    return service.notify_badge_earned(
        user_id=user_id,
        badge_id=badge_id,
        badge_name=badge_name
    )
