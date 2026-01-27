"""
Repository para Activity - Operações de banco de dados para o histórico de atividades.
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.models.activity import Activity


class ActivityRepository:
    """Repository para operações de Activity"""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        card_id: int,
        user_id: int,
        activity_type: str,
        description: str,
        activity_metadata: dict = None
    ) -> Activity:
        """
        Cria um novo registro de atividade no histórico

        Args:
            card_id: ID do card relacionado
            user_id: ID do usuário que executou a ação
            activity_type: Tipo de atividade (ex: "task_completed", "task_created")
            description: Descrição legível da atividade
            activity_metadata: Dados adicionais em JSON

        Returns:
            Activity criada
        """
        activity = Activity(
            card_id=card_id,
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            activity_metadata=activity_metadata or {}
        )

        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)

        return activity

    def get_by_card(self, card_id: int, limit: int = 50) -> List[Activity]:
        """
        Busca atividades de um card específico, ordenadas por mais recente

        Args:
            card_id: ID do card
            limit: Número máximo de registros

        Returns:
            Lista de Activities
        """
        return (
            self.db.query(Activity)
            .filter(Activity.card_id == card_id)
            .order_by(Activity.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_by_card_and_type(
        self,
        card_id: int,
        activity_type: str,
        limit: int = 50
    ) -> List[Activity]:
        """
        Busca atividades de um card filtradas por tipo

        Args:
            card_id: ID do card
            activity_type: Tipo de atividade para filtrar
            limit: Número máximo de registros

        Returns:
            Lista de Activities filtradas
        """
        return (
            self.db.query(Activity)
            .filter(
                Activity.card_id == card_id,
                Activity.activity_type == activity_type
            )
            .order_by(Activity.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_recent_by_user(self, user_id: int, limit: int = 20) -> List[Activity]:
        """
        Busca atividades recentes de um usuário

        Args:
            user_id: ID do usuário
            limit: Número máximo de registros

        Returns:
            Lista de Activities do usuário
        """
        return (
            self.db.query(Activity)
            .filter(Activity.user_id == user_id)
            .order_by(Activity.created_at.desc())
            .limit(limit)
            .all()
        )

    def delete_by_card(self, card_id: int) -> int:
        """
        Deleta todas as atividades de um card (usado quando card é deletado)

        Args:
            card_id: ID do card

        Returns:
            Número de registros deletados
        """
        count = self.db.query(Activity).filter(Activity.card_id == card_id).delete()
        self.db.commit()
        return count
