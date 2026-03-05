"""
Service para gerenciamento das configurações de notificação do usuário.
Implementa padrão get-or-create: retorna as configurações existentes ou cria
com valores padrão se o usuário ainda não tiver registrado suas preferências.
"""
from sqlalchemy.orm import Session

from app.models.user_notification_setting import UserNotificationSetting
from app.schemas.user_notification_setting import UserNotificationSettingUpdate


class UserNotificationService:
    """Gerencia as configurações de notificação por usuário."""

    def __init__(self, db: Session):
        self.db = db

    def get_or_create(self, user_id: int) -> UserNotificationSetting:
        """
        Retorna as configurações de notificação do usuário.
        Se ainda não existirem, cria com todos os campos em True (notificações ativas).

        Args:
            user_id: ID do usuário

        Returns:
            Configurações de notificação do usuário (existentes ou recém-criadas)
        """
        setting = (
            self.db.query(UserNotificationSetting)
            .filter(UserNotificationSetting.user_id == user_id)
            .first()
        )

        if setting is None:
            # Cria com valores padrão (tudo ativo)
            setting = UserNotificationSetting(user_id=user_id)
            self.db.add(setting)
            self.db.commit()
            self.db.refresh(setting)

        return setting

    def update(
        self,
        user_id: int,
        data: UserNotificationSettingUpdate,
    ) -> UserNotificationSetting:
        """
        Atualiza as configurações de notificação do usuário.
        Cria o registro se ainda não existir (get-or-create).

        Args:
            user_id: ID do usuário
            data: Campos a atualizar (apenas os enviados, os demais permanecem inalterados)

        Returns:
            Configurações atualizadas
        """
        setting = self.get_or_create(user_id)

        # Atualiza apenas os campos enviados (exclude_unset ignora os None por omissão)
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(setting, field, value)

        self.db.commit()
        self.db.refresh(setting)
        return setting
