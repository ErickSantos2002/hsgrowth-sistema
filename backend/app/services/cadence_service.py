"""
Service do sistema de Cadência por Lead Individual.

Responsável por:
- CRUD de templates (admin/gerente)
- Iniciar, pausar, retomar e cancelar cadência em um card
- Criar a próxima task automaticamente quando a atual é concluída
- Calcular datas úteis (pula sábado e domingo)
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.models.cadence import CadenceTemplate, CadenceStep, CardCadence
from app.models.card_task import CardTask, TaskType, TaskPriority
from app.models.user import User
from app.schemas.cadence import (
    CadenceTemplateCreate,
    CadenceTemplateUpdate,
    CardCadenceResponse,
    CadenceStepResponse,
)


# ─── Utilitários ─────────────────────────────────────────────────────────────

def _add_business_days(start: datetime, days: int) -> datetime:
    """
    Adiciona N dias úteis (Seg–Sex) a partir de start.
    day_offset=1 significa o próprio dia de início (ou próximo dia útil).
    """
    current = start.replace(hour=9, minute=0, second=0, microsecond=0)
    # Se cair em fim de semana, avança para segunda
    while current.weekday() >= 5:
        current += timedelta(days=1)

    remaining = days - 1  # dia 1 = o próprio dia
    while remaining > 0:
        current += timedelta(days=1)
        if current.weekday() < 5:
            remaining -= 1

    return current


def _map_priority(priority_str: str) -> TaskPriority:
    mapping = {
        "high": TaskPriority.HIGH,
        "urgent": TaskPriority.URGENT,
    }
    return mapping.get(priority_str, TaskPriority.NORMAL)


def _map_task_type(activity_type: str) -> TaskType:
    mapping = {
        "call": TaskType.CALL,
        "ligacao": TaskType.CALL,
        "email": TaskType.EMAIL,
        "meeting": TaskType.MEETING,
        "reuniao": TaskType.MEETING,
        "whatsapp": TaskType.WHATSAPP,
        "task": TaskType.TASK,
        "tarefa": TaskType.TASK,
        "follow_up": TaskType.FOLLOW_UP,
        "deadline": TaskType.DEADLINE,
        "lunch": TaskType.LUNCH,
    }
    return mapping.get(activity_type.lower(), TaskType.OTHER)


def _build_response(cadence: CardCadence, db: Session) -> CardCadenceResponse:
    """Monta o CardCadenceResponse a partir de um CardCadence ORM."""
    steps = sorted(cadence.template.steps, key=lambda s: s.order)
    total = len(steps)

    current_step = next((s for s in steps if s.order == cadence.current_step_order), None)
    prev_order = cadence.current_step_order - 1
    previous_step = next((s for s in steps if s.order == prev_order), None)

    return CardCadenceResponse(
        id=cadence.id,
        card_id=cadence.card_id,
        template_id=cadence.template_id,
        template_name=cadence.template.name,
        started_by_id=cadence.started_by_id,
        status=cadence.status,
        current_step_order=cadence.current_step_order,
        total_steps=total,
        started_at=cadence.started_at,
        paused_at=cadence.paused_at,
        completed_at=cadence.completed_at,
        current_step=CadenceStepResponse.model_validate(current_step) if current_step else None,
        previous_step=CadenceStepResponse.model_validate(previous_step) if previous_step else None,
    )


# ─── Service ─────────────────────────────────────────────────────────────────

class CadenceService:

    def __init__(self, db: Session):
        self.db = db

    # ── Templates ────────────────────────────────────────────────────────────

    def list_templates(self, only_active: bool = False):
        q = self.db.query(CadenceTemplate)
        if only_active:
            q = q.filter(CadenceTemplate.is_active == True)
        return q.order_by(CadenceTemplate.name).all()

    def get_template(self, template_id: int) -> CadenceTemplate:
        t = self.db.query(CadenceTemplate).filter(CadenceTemplate.id == template_id).first()
        if not t:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Template de cadência não encontrado")
        return t

    def create_template(self, data: CadenceTemplateCreate, current_user: User) -> CadenceTemplate:
        template = CadenceTemplate(
            name=data.name,
            description=data.description,
            is_active=data.is_active,
            created_by_id=current_user.id,
        )
        self.db.add(template)
        self.db.flush()

        for step_data in sorted(data.steps, key=lambda s: s.order):
            step = CadenceStep(
                template_id=template.id,
                order=step_data.order,
                day_offset=step_data.day_offset,
                activity_type=step_data.activity_type,
                title=step_data.title,
                description=step_data.description,
                priority=step_data.priority,
            )
            self.db.add(step)

        self.db.commit()
        self.db.refresh(template)
        return template

    def update_template(self, template_id: int, data: CadenceTemplateUpdate, current_user: User) -> CadenceTemplate:
        template = self.get_template(template_id)

        if data.name is not None:
            template.name = data.name
        if data.description is not None:
            template.description = data.description
        if data.is_active is not None:
            template.is_active = data.is_active

        if data.steps is not None:
            # Substitui todas as etapas
            for step in list(template.steps):
                self.db.delete(step)
            self.db.flush()
            for step_data in sorted(data.steps, key=lambda s: s.order):
                step = CadenceStep(
                    template_id=template.id,
                    order=step_data.order,
                    day_offset=step_data.day_offset,
                    activity_type=step_data.activity_type,
                    title=step_data.title,
                    description=step_data.description,
                    priority=step_data.priority,
                )
                self.db.add(step)

        self.db.commit()
        self.db.refresh(template)
        return template

    def delete_template(self, template_id: int, current_user: User):
        template = self.get_template(template_id)
        # Verificar se há cadências ativas usando este template
        active = self.db.query(CardCadence).filter(
            CardCadence.template_id == template_id,
            CardCadence.status.in_(["active", "paused"]),
        ).count()
        if active > 0:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível excluir: {active} cadência(s) ativa(s) usando este template."
            )
        self.db.delete(template)
        self.db.commit()

    # ── Cadência no card ──────────────────────────────────────────────────────

    def get_active_cadence(self, card_id: int) -> Optional[CardCadence]:
        """Retorna a cadência ativa ou pausada de um card (se houver)."""
        return self.db.query(CardCadence).filter(
            CardCadence.card_id == card_id,
            CardCadence.status.in_(["active", "paused"]),
        ).first()

    def get_cadence_for_card(self, card_id: int) -> Optional[CardCadenceResponse]:
        """Retorna o estado atual da cadência do card (ativa, pausada ou concluída recentemente)."""
        # Prioriza ativa/pausada; se não houver, retorna a mais recente (incluindo completed)
        cadence = self.db.query(CardCadence).filter(
            CardCadence.card_id == card_id,
            CardCadence.status.in_(["active", "paused", "completed"]),
        ).order_by(CardCadence.id.desc()).first()
        if not cadence:
            return None
        return _build_response(cadence, self.db)

    def start(self, card_id: int, template_id: int, current_user: User) -> CardCadenceResponse:
        """Inicia uma cadência em um card. Só pode ter uma ativa por vez."""
        from fastapi import HTTPException

        # Verificar se já há cadência ativa/pausada
        existing = self.get_active_cadence(card_id)
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Este card já possui uma cadência ativa. Cancele ou conclua antes de iniciar outra."
            )

        template = self.get_template(template_id)
        if not template.is_active:
            raise HTTPException(status_code=400, detail="Este template de cadência está desativado.")

        steps = sorted(template.steps, key=lambda s: s.order)
        if not steps:
            raise HTTPException(status_code=400, detail="Este template não possui etapas configuradas.")

        # Criar instância da cadência
        cadence = CardCadence(
            card_id=card_id,
            template_id=template_id,
            started_by_id=current_user.id,
            status=CardCadence.STATUS_ACTIVE,
            current_step_order=1,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(cadence)
        self.db.flush()

        # Criar a primeira task
        self._create_task_for_step(cadence, steps[0], current_user)

        self.db.commit()
        self.db.refresh(cadence)
        return _build_response(cadence, self.db)

    def pause(self, card_id: int, current_user: User) -> CardCadenceResponse:
        """Pausa a cadência ativa. A task atual continua existindo."""
        cadence = self._get_active_or_404(card_id)
        if cadence.status != CardCadence.STATUS_ACTIVE:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="A cadência não está ativa.")

        cadence.status = CardCadence.STATUS_PAUSED
        cadence.paused_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(cadence)
        return _build_response(cadence, self.db)

    def resume(self, card_id: int, current_user: User) -> CardCadenceResponse:
        """Retoma uma cadência pausada. Cria a próxima task imediatamente."""
        cadence = self._get_active_or_404(card_id)
        if cadence.status != CardCadence.STATUS_PAUSED:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="A cadência não está pausada.")

        cadence.status = CardCadence.STATUS_ACTIVE
        cadence.paused_at = None
        self.db.flush()

        # Criar próxima task apenas se não houver uma pendente para esta etapa
        steps = sorted(cadence.template.steps, key=lambda s: s.order)
        next_step = next((s for s in steps if s.order == cadence.current_step_order), None)
        if next_step and not self._has_pending_task_for_step(cadence):
            self._create_task_for_step(cadence, next_step, current_user)

        self.db.commit()
        self.db.refresh(cadence)
        return _build_response(cadence, self.db)

    def cancel(self, card_id: int, current_user: User) -> CardCadenceResponse:
        """Cancela a cadência. Tasks já criadas permanecem."""
        cadence = self._get_active_or_404(card_id)
        cadence.status = CardCadence.STATUS_CANCELLED
        self.db.commit()
        self.db.refresh(cadence)
        return _build_response(cadence, self.db)

    def on_task_completed(self, task: CardTask, current_user: User):
        """
        Chamado sempre que uma task é concluída.
        Se a task pertence a uma cadência ativa, cria a próxima etapa.
        """
        if not task.card_cadence_id:
            return  # Task não pertence a nenhuma cadência

        cadence = self.db.query(CardCadence).filter(
            CardCadence.id == task.card_cadence_id
        ).first()

        if not cadence:
            return  # Cadência não encontrada

        steps = sorted(cadence.template.steps, key=lambda s: s.order)
        total = len(steps)

        # Avançar para a próxima etapa
        next_order = cadence.current_step_order + 1

        if next_order > total:
            # Última etapa concluída — marcar cadência como completa
            cadence.status = CardCadence.STATUS_COMPLETED
            cadence.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            print(f"[CADENCE] Cadência {cadence.id} concluída no card {cadence.card_id}")
            return

        # Sempre avança o step (independente de estar pausada ou ativa)
        cadence.current_step_order = next_order
        self.db.flush()

        # Só cria a próxima task se a cadência estiver ativa
        if cadence.status == CardCadence.STATUS_ACTIVE:
            next_step = next((s for s in steps if s.order == next_order), None)
            if next_step:
                self._create_task_for_step(cadence, next_step, current_user)
            self.db.commit()
            print(f"[CADENCE] Cadência {cadence.id} avançou para etapa {next_order} no card {cadence.card_id}")
        else:
            self.db.commit()
            print(f"[CADENCE] Cadência {cadence.id} pausada — etapa avançou para {next_order} sem criar task")

    # ── Interno ───────────────────────────────────────────────────────────────

    def _has_pending_task_for_step(self, cadence: CardCadence) -> bool:
        """Verifica se já existe uma task pendente (não concluída) para a etapa atual da cadência."""
        return self.db.query(CardTask).filter(
            CardTask.card_cadence_id == cadence.id,
            CardTask.is_completed == False,
        ).first() is not None

    def _get_active_or_404(self, card_id: int) -> CardCadence:
        cadence = self.get_active_cadence(card_id)
        if not cadence:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Nenhuma cadência ativa neste card.")
        return cadence

    def _create_task_for_step(self, cadence: CardCadence, step: CadenceStep, current_user: User):
        """Cria a CardTask correspondente à etapa da cadência."""
        due_date = _add_business_days(datetime.now(timezone.utc), step.day_offset)

        task = CardTask(
            card_id=cadence.card_id,
            assigned_to_id=current_user.id,
            created_by_id=current_user.id,
            card_cadence_id=cadence.id,
            task_type=_map_task_type(step.activity_type),
            title=step.title,
            description=step.description or "",
            priority=_map_priority(step.priority),
            due_date=due_date,
            is_completed=False,
        )
        self.db.add(task)
        self.db.flush()
        print(f"[CADENCE] Task criada: '{step.title}' (etapa {step.order}) para card {cadence.card_id}, due={due_date.date()}")
        return task
