"""
Service para Cadência — CRUD e lógica de disparo de atividades.
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List
from fastapi import HTTPException, status

from app.models.cadencia import Cadencia, CadenciaItem
from app.models.card import Card
from app.models.card_task import CardTask, TaskType
from app.models.user import User
from app.schemas.cadencia import (
    CadenciaCreate,
    CadenciaUpdate,
    CadenciaResponse,
    TriggerResult,
    TriggerItemResult,
)

# Mapeamento de tipos amigáveis para TaskType enum
ACTIVITY_TYPE_MAP = {
    "ligacao": TaskType.CALL,
    "call": TaskType.CALL,
    "reuniao": TaskType.MEETING,
    "meeting": TaskType.MEETING,
    "tarefa": TaskType.TASK,
    "task": TaskType.TASK,
    "follow_up": TaskType.FOLLOW_UP,
    "followup": TaskType.FOLLOW_UP,
    "retorno": TaskType.FOLLOW_UP,
    "email": TaskType.EMAIL,
    "prazo": TaskType.DEADLINE,
    "deadline": TaskType.DEADLINE,
    "almoco": TaskType.LUNCH,
    "lunch": TaskType.LUNCH,
    "outro": TaskType.OTHER,
    "other": TaskType.OTHER,
    "visita": TaskType.MEETING,
}

ACTIVITY_TYPE_LABELS = {
    "ligacao": "Ligação",
    "call": "Ligação",
    "reuniao": "Reunião",
    "meeting": "Reunião",
    "tarefa": "Tarefa",
    "task": "Tarefa",
    "follow_up": "Follow-up",
    "followup": "Follow-up",
    "retorno": "Follow-up",
    "email": "E-mail",
    "prazo": "Prazo",
    "deadline": "Prazo",
    "almoco": "Almoço",
    "lunch": "Almoço",
    "outro": "Outro",
    "other": "Outro",
    "visita": "Visita",
}


def _resolve_task_type(activity_type: str) -> TaskType:
    normalized = activity_type.lower().strip()
    task_type = ACTIVITY_TYPE_MAP.get(normalized)
    if task_type is None:
        # Tenta encontrar valor direto no enum
        try:
            return TaskType(normalized)
        except ValueError:
            return TaskType.OTHER
    return task_type


def _label_for_type(activity_type: str) -> str:
    return ACTIVITY_TYPE_LABELS.get(activity_type.lower().strip(), activity_type)


class CadenciaService:
    def __init__(self, db: Session):
        self.db = db

    # ==================== CRUD ====================

    def list_my(self, current_user: User) -> List[CadenciaResponse]:
        """Retorna todas as cadências do usuário logado."""
        cadencias = (
            self.db.query(Cadencia)
            .filter(Cadencia.user_id == current_user.id)
            .order_by(Cadencia.created_at.desc())
            .all()
        )
        return [CadenciaResponse.model_validate(c) for c in cadencias]

    def create(self, data: CadenciaCreate, current_user: User) -> CadenciaResponse:
        """Cria uma nova cadência para o usuário logado."""
        cadencia = Cadencia(
            user_id=current_user.id,
            name=data.name,
            is_active=True,
        )
        self.db.add(cadencia)
        self.db.flush()  # Gera o ID sem commit

        for item_data in data.itens:
            item = CadenciaItem(
                cadencia_id=cadencia.id,
                activity_type=item_data.activity_type,
                quantity=item_data.quantity,
            )
            self.db.add(item)

        self.db.commit()
        self.db.refresh(cadencia)
        return CadenciaResponse.model_validate(cadencia)

    def update(self, cadencia_id: int, data: CadenciaUpdate, current_user: User) -> CadenciaResponse:
        """Atualiza uma cadência existente do usuário."""
        cadencia = self._get_own_or_404(cadencia_id, current_user)

        if data.name is not None:
            cadencia.name = data.name
        if data.is_active is not None:
            cadencia.is_active = data.is_active

        if data.itens is not None:
            # Substitui todos os itens
            for item in list(cadencia.itens):
                self.db.delete(item)
            self.db.flush()
            for item_data in data.itens:
                item = CadenciaItem(
                    cadencia_id=cadencia.id,
                    activity_type=item_data.activity_type,
                    quantity=item_data.quantity,
                )
                self.db.add(item)

        self.db.commit()
        self.db.refresh(cadencia)
        return CadenciaResponse.model_validate(cadencia)

    def delete(self, cadencia_id: int, current_user: User) -> None:
        """Remove uma cadência do usuário."""
        cadencia = self._get_own_or_404(cadencia_id, current_user)
        self.db.delete(cadencia)
        self.db.commit()

    # ==================== TRIGGER ====================

    def trigger(self, cadencia_id: int, current_user: User) -> TriggerResult:
        """
        Dispara a cadência: cria atividades pendentes nos cards mais antigos
        do usuário que ainda não têm atividade pendente daquele tipo.
        """
        cadencia = self._get_own_or_404(cadencia_id, current_user)

        if not cadencia.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta cadência está inativa."
            )

        # Cards ativos do usuário (onde é SDR ou Vendedor vinculado), ordenados por mais antigo
        user_cards_query = (
            self.db.query(Card)
            .filter(
                Card.deleted_at.is_(None),
                Card.is_won == 0,
                or_(
                    Card.assigned_to_id == current_user.id,
                    Card.sdr_id == current_user.id,
                )
            )
            .order_by(Card.created_at.asc())
        )
        user_cards = user_cards_query.all()

        item_results: List[TriggerItemResult] = []
        total_created = 0

        for item in cadencia.itens:
            task_type = _resolve_task_type(item.activity_type)
            label = _label_for_type(item.activity_type)
            created_count = 0
            cards_affected = 0

            for card in user_cards:
                if created_count >= item.quantity:
                    break

                # Verifica se o card já tem atividade pendente deste tipo
                has_pending = (
                    self.db.query(CardTask)
                    .filter(
                        CardTask.card_id == card.id,
                        CardTask.task_type == task_type,
                        CardTask.is_completed == False,
                    )
                    .first()
                )
                if has_pending:
                    continue

                # Cria a atividade
                new_task = CardTask(
                    card_id=card.id,
                    assigned_to_id=current_user.id,
                    created_by_id=current_user.id,
                    title=f"{label} — Cadência '{cadencia.name}'",
                    task_type=task_type,
                )
                self.db.add(new_task)
                created_count += 1
                cards_affected += 1

            self.db.flush()

            item_results.append(TriggerItemResult(
                activity_type=item.activity_type,
                requested=item.quantity,
                created=created_count,
                cards_affected=cards_affected,
            ))
            total_created += created_count

        self.db.commit()

        return TriggerResult(
            cadencia_id=cadencia.id,
            cadencia_name=cadencia.name,
            total_activities_created=total_created,
            itens=item_results,
        )

    # ==================== HELPERS ====================

    def _get_own_or_404(self, cadencia_id: int, current_user: User) -> Cadencia:
        cadencia = (
            self.db.query(Cadencia)
            .filter(Cadencia.id == cadencia_id)
            .first()
        )
        if not cadencia:
            raise HTTPException(status_code=404, detail="Cadência não encontrada.")
        role_name = current_user.role.name if current_user.role else ""
        if cadencia.user_id != current_user.id and role_name not in ("admin", "manager"):
            raise HTTPException(status_code=403, detail="Sem permissão para acessar esta cadência.")
        return cadencia
