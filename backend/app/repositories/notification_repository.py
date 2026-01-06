"""
Notification Repository - Camada de acesso a dados para notificações.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.notification import Notification


class NotificationRepository:
    """
    Repository para operações de banco de dados relacionadas a notificações.
    """

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, notification_id: int) -> Optional[Notification]:
        """
        Busca uma notificação por ID.

        Args:
            notification_id: ID da notificação

        Returns:
            Notification ou None se não encontrado
        """
        return self.db.query(Notification).filter(
            Notification.id == notification_id
        ).first()

    def list_by_user(
        self,
        user_id: int,
        page: int = 1,
        page_size: int = 20,
        unread_only: bool = False
    ) -> tuple[List[Notification], int]:
        """
        Lista notificações de um usuário com paginação.

        Args:
            user_id: ID do usuário
            page: Número da página
            page_size: Tamanho da página
            unread_only: Se True, retorna apenas não lidas

        Returns:
            Tupla (lista de notificações, total)
        """
        query = self.db.query(Notification).filter(
            Notification.user_id == user_id
        )

        if unread_only:
            query = query.filter(Notification.is_read == False)

        # Total de registros
        total = query.count()

        # Busca paginada (ordenado por created_at DESC - mais recentes primeiro)
        notifications = query.order_by(
            Notification.created_at.desc()
        ).offset(
            (page - 1) * page_size
        ).limit(page_size).all()

        return notifications, total

    def count_unread_by_user(self, user_id: int) -> int:
        """
        Conta notificações não lidas de um usuário.

        Args:
            user_id: ID do usuário

        Returns:
            Quantidade de notificações não lidas
        """
        return self.db.query(func.count(Notification.id)).filter(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        ).scalar() or 0

    def count_by_type(self, user_id: int) -> dict:
        """
        Conta notificações por tipo para um usuário.

        Args:
            user_id: ID do usuário

        Returns:
            Dicionário {tipo: quantidade}
        """
        results = self.db.query(
            Notification.notification_type,
            func.count(Notification.id).label('count')
        ).filter(
            Notification.user_id == user_id
        ).group_by(
            Notification.notification_type
        ).all()

        return {notification_type: count for notification_type, count in results}

    def create(self, data: dict) -> Notification:
        """
        Cria uma nova notificação.

        Args:
            data: Dados da notificação

        Returns:
            Notification criada
        """
        notification = Notification(**data)
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def create_bulk(self, notifications_data: List[dict]) -> List[Notification]:
        """
        Cria múltiplas notificações em lote.

        Args:
            notifications_data: Lista de dados de notificações

        Returns:
            Lista de notificações criadas
        """
        notifications = [Notification(**data) for data in notifications_data]
        self.db.add_all(notifications)
        self.db.commit()

        # Refresh todas
        for notification in notifications:
            self.db.refresh(notification)

        return notifications

    def mark_as_read(self, notification_id: int) -> Optional[Notification]:
        """
        Marca uma notificação como lida.

        Args:
            notification_id: ID da notificação

        Returns:
            Notification atualizada ou None
        """
        notification = self.find_by_id(notification_id)
        if notification and not notification.is_read:
            from datetime import datetime
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def mark_all_as_read_by_user(self, user_id: int) -> int:
        """
        Marca todas as notificações de um usuário como lidas.

        Args:
            user_id: ID do usuário

        Returns:
            Quantidade de notificações marcadas como lidas
        """
        from datetime import datetime
        count = self.db.query(Notification).filter(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        ).update({
            "is_read": True,
            "read_at": datetime.utcnow()
        }, synchronize_session=False)

        self.db.commit()
        return count

    def delete(self, notification_id: int) -> bool:
        """
        Deleta uma notificação.

        Args:
            notification_id: ID da notificação

        Returns:
            True se deletado, False se não encontrado
        """
        notification = self.find_by_id(notification_id)
        if notification:
            self.db.delete(notification)
            self.db.commit()
            return True
        return False

    def delete_old_notifications(self, days: int = 90) -> int:
        """
        Deleta notificações antigas (mais de X dias).
        Útil para limpeza periódica.

        Args:
            days: Quantidade de dias (padrão: 90)

        Returns:
            Quantidade de notificações deletadas
        """
        from datetime import datetime, timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        count = self.db.query(Notification).filter(
            Notification.created_at < cutoff_date
        ).delete(synchronize_session=False)

        self.db.commit()
        return count
