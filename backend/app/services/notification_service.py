"""
Notification Service - Lógica de negócio para notificações.
Implementa criação, listagem e gerenciamento de notificações in-app.
"""
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    NotificationStatsResponse,
    BulkNotificationCreate,
    BulkNotificationResponse,
    NotificationTypeEnum,
    NotificationIconEnum,
    NotificationColorEnum
)
from app.models.notification import Notification


class NotificationService:
    """
    Service para lógica de negócio relacionada a notificações.
    """

    def __init__(self, db: Session):
        self.db = db
        self.notification_repository = NotificationRepository(db)

    def _verify_notification_access(self, notification: Notification, user_id: int) -> None:
        """
        Verifica se um usuário tem acesso a uma notificação.

        Args:
            notification: Notificação
            user_id: ID do usuário

        Raises:
            HTTPException: Se não tiver acesso
        """
        if notification.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a esta notificação"
            )

    def get_notification_by_id(
        self,
        notification_id: int,
        user_id: int
    ) -> Notification:
        """
        Busca uma notificação por ID com verificação de acesso.

        Args:
            notification_id: ID da notificação
            user_id: ID do usuário

        Returns:
            Notification

        Raises:
            HTTPException: Se não encontrado ou sem acesso
        """
        notification = self.notification_repository.find_by_id(notification_id)

        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notificação não encontrada"
            )

        # Verifica acesso
        self._verify_notification_access(notification, user_id)

        return notification

    def list_notifications(
        self,
        user_id: int,
        page: int = 1,
        page_size: int = 20,
        unread_only: bool = False
    ) -> NotificationListResponse:
        """
        Lista notificações de um usuário com paginação.

        Args:
            user_id: ID do usuário
            page: Número da página
            page_size: Tamanho da página
            unread_only: Se True, retorna apenas não lidas

        Returns:
            NotificationListResponse
        """
        notifications, total = self.notification_repository.list_by_user(
            user_id=user_id,
            page=page,
            page_size=page_size,
            unread_only=unread_only
        )

        # Conta não lidas
        unread_count = self.notification_repository.count_unread_by_user(user_id)

        # Total de páginas
        total_pages = (total + page_size - 1) // page_size

        # Converte para response
        items = [NotificationResponse.model_validate(n) for n in notifications]

        return NotificationListResponse(
            items=items,
            total=total,
            unread_count=unread_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def get_notification_stats(self, user_id: int) -> NotificationStatsResponse:
        """
        Retorna estatísticas de notificações do usuário.

        Args:
            user_id: ID do usuário

        Returns:
            NotificationStatsResponse
        """
        # Total
        _, total = self.notification_repository.list_by_user(
            user_id=user_id,
            page=1,
            page_size=1
        )

        # Não lidas
        unread_count = self.notification_repository.count_unread_by_user(user_id)

        # Por tipo
        by_type = self.notification_repository.count_by_type(user_id)

        return NotificationStatsResponse(
            total=total,
            unread_count=unread_count,
            by_type=by_type
        )

    def create_notification(
        self,
        data: NotificationCreate
    ) -> NotificationResponse:
        """
        Cria uma nova notificação.

        Args:
            data: Dados da notificação

        Returns:
            NotificationResponse
        """
        notification_dict = data.model_dump()
        notification = self.notification_repository.create(notification_dict)

        return NotificationResponse.model_validate(notification)

    def create_bulk_notifications(
        self,
        data: BulkNotificationCreate
    ) -> BulkNotificationResponse:
        """
        Cria notificações em lote para múltiplos usuários.

        Args:
            data: Dados da notificação em lote

        Returns:
            BulkNotificationResponse
        """
        notifications_data = []

        # Cria um dict para cada usuário
        for user_id in data.user_ids:
            notification_dict = {
                "user_id": user_id,
                "notification_type": data.notification_type.value,
                "title": data.title,
                "message": data.message,
                "icon": data.icon.value if data.icon else None,
                "color": data.color.value if data.color else None,
                "notification_metadata": data.notification_metadata or {}
            }
            notifications_data.append(notification_dict)

        # Cria em lote
        notifications = self.notification_repository.create_bulk(notifications_data)

        return BulkNotificationResponse(
            created_count=len(notifications),
            notification_ids=[n.id for n in notifications]
        )

    def mark_as_read(self, notification_id: int, user_id: int) -> NotificationResponse:
        """
        Marca uma notificação como lida.

        Args:
            notification_id: ID da notificação
            user_id: ID do usuário

        Returns:
            NotificationResponse

        Raises:
            HTTPException: Se não encontrado ou sem acesso
        """
        # Verifica acesso
        notification = self.get_notification_by_id(notification_id, user_id)

        # Marca como lida
        updated_notification = self.notification_repository.mark_as_read(notification_id)

        return NotificationResponse.model_validate(updated_notification)

    def mark_all_as_read(self, user_id: int) -> dict:
        """
        Marca todas as notificações de um usuário como lidas.

        Args:
            user_id: ID do usuário

        Returns:
            Dict com quantidade marcada
        """
        count = self.notification_repository.mark_all_as_read_by_user(user_id)

        return {
            "marked_count": count,
            "message": f"{count} notificações marcadas como lidas"
        }

    def delete_notification(self, notification_id: int, user_id: int) -> dict:
        """
        Deleta uma notificação.

        Args:
            notification_id: ID da notificação
            user_id: ID do usuário

        Returns:
            Dict com mensagem de sucesso

        Raises:
            HTTPException: Se não encontrado ou sem acesso
        """
        # Verifica acesso
        self.get_notification_by_id(notification_id, user_id)

        # Deleta
        deleted = self.notification_repository.delete(notification_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notificação não encontrada"
            )

        return {"message": "Notificação deletada com sucesso"}

    # ================== Helpers para criar notificações específicas ==================

    def notify_card_assigned(
        self,
        user_id: int,
        card_id: int,
        card_title: str,
        board_id: int
    ) -> NotificationResponse:
        """
        Cria notificação de card atribuído.

        Args:
            user_id: ID do usuário
            card_id: ID do card
            card_title: Título do card
            board_id: ID do board

        Returns:
            NotificationResponse
        """
        data = NotificationCreate(
            user_id=user_id,
            notification_type=NotificationTypeEnum.CARD_ASSIGNED,
            title="Novo card atribuído",
            message=f"Você foi atribuído ao card '{card_title}'",
            icon=NotificationIconEnum.BELL,
            color=NotificationColorEnum.INFO,
            notification_metadata={
                "card_id": card_id,
                "board_id": board_id,
                "url": f"/boards/{board_id}/cards/{card_id}"
            }
        )
        return self.create_notification(data)

    def notify_card_overdue(
        self,
        user_id: int,
        card_id: int,
        card_title: str,
        board_id: int
    ) -> NotificationResponse:
        """
        Cria notificação de card vencido.

        Args:
            user_id: ID do usuário
            card_id: ID do card
            card_title: Título do card
            board_id: ID do board

        Returns:
            NotificationResponse
        """
        data = NotificationCreate(
            user_id=user_id,
            notification_type=NotificationTypeEnum.CARD_OVERDUE,
            title="Card vencido",
            message=f"O card '{card_title}' está vencido!",
            icon=NotificationIconEnum.WARNING,
            color=NotificationColorEnum.DANGER,
            notification_metadata={
                "card_id": card_id,
                "board_id": board_id,
                "url": f"/boards/{board_id}/cards/{card_id}"
            }
        )
        return self.create_notification(data)

    def notify_transfer_received(
        self,
        user_id: int,
        card_id: int,
        card_title: str,
        from_user_name: str
    ) -> NotificationResponse:
        """
        Cria notificação de transferência recebida.

        Args:
            user_id: ID do usuário
            card_id: ID do card
            card_title: Título do card
            from_user_name: Nome do remetente

        Returns:
            NotificationResponse
        """
        data = NotificationCreate(
            user_id=user_id,
            notification_type=NotificationTypeEnum.TRANSFER_RECEIVED,
            title="Card transferido para você",
            message=f"{from_user_name} transferiu o card '{card_title}' para você",
            icon=NotificationIconEnum.INFO,
            color=NotificationColorEnum.PRIMARY,
            notification_metadata={
                "card_id": card_id,
                "from_user_name": from_user_name
            }
        )
        return self.create_notification(data)

    def notify_automation_failed(
        self,
        user_id: int,
        automation_id: int,
        automation_name: str,
        error_message: str
    ) -> NotificationResponse:
        """
        Cria notificação de automação falhou.

        Args:
            user_id: ID do usuário
            automation_id: ID da automação
            automation_name: Nome da automação
            error_message: Mensagem de erro

        Returns:
            NotificationResponse
        """
        data = NotificationCreate(
            user_id=user_id,
            notification_type=NotificationTypeEnum.AUTOMATION_FAILED,
            title="Automação falhou",
            message=f"A automação '{automation_name}' falhou: {error_message}",
            icon=NotificationIconEnum.ALERT,
            color=NotificationColorEnum.DANGER,
            notification_metadata={
                "automation_id": automation_id,
                "error_message": error_message
            }
        )
        return self.create_notification(data)

    def notify_badge_earned(
        self,
        user_id: int,
        badge_id: int,
        badge_name: str
    ) -> NotificationResponse:
        """
        Cria notificação de badge conquistado.

        Args:
            user_id: ID do usuário
            badge_id: ID do badge
            badge_name: Nome do badge

        Returns:
            NotificationResponse
        """
        data = NotificationCreate(
            user_id=user_id,
            notification_type=NotificationTypeEnum.BADGE_EARNED,
            title="Nova conquista!",
            message=f"Você conquistou o badge '{badge_name}'!",
            icon=NotificationIconEnum.TROPHY,
            color=NotificationColorEnum.SUCCESS,
            notification_metadata={
                "badge_id": badge_id
            }
        )
        return self.create_notification(data)
