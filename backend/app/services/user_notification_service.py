"""
Service para gerenciamento das configurações de notificação do usuário.
Implementa padrão get-or-create: retorna as configurações existentes ou cria
com valores padrão se o usuário ainda não tiver registrado suas preferências.
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.role import Role
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_list import ServiceList
from app.models.user import User
from app.models.user_notification_setting import UserNotificationSetting
from app.schemas.user_notification_setting import UserNotificationSettingUpdate

# Janela do histórico que define os boards acompanhados por padrão
DIAS_DE_HISTORICO = 60


def quadros_padrao(db: Session, user_id: int) -> list:
    """
    Boards de Serviço onde a pessoa registrou atividade ou anotação nos
    últimos 60 dias. Sem histórico: quem é de Serviço acompanha todos; os
    demais, nenhum.
    """
    desde = datetime.utcnow() - timedelta(days=DIAS_DE_HISTORICO)
    ids = {
        board_id
        for (board_id,) in (
            db.query(ServiceList.board_id)
            .join(ServiceCard, ServiceCard.list_id == ServiceList.id)
            .join(ServiceCardActivity, ServiceCardActivity.service_card_id == ServiceCard.id)
            .filter(
                ServiceCardActivity.user_id == user_id,
                ServiceCardActivity.category.in_(("atividade", "anotacao")),
                ServiceCardActivity.created_at >= desde,
            )
            .distinct()
        )
    }
    if ids:
        return sorted(ids)

    papel = (
        db.query(Role.name)
        .join(User, User.role_id == Role.id)
        .filter(User.id == user_id)
        .scalar()
    )
    if papel == "service":
        return sorted(
            b.id for b in db.query(ServiceBoard).filter(ServiceBoard.is_deleted == False)  # noqa: E712
        )
    return []


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

        if setting.quadros_servico is None:
            setting.quadros_servico = quadros_padrao(self.db, user_id)
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
