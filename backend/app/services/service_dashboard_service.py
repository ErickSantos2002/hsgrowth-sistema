"""
Service de agregação da Dashboard de Serviços.
Agrega métricas across todos os boards de serviços (modelo colaborativo).
"""
from collections import Counter
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.service_board import ServiceBoard
from app.models.service_list import ServiceList
from app.models.service_card import ServiceCard
from app.models.service_card_product import ServiceCardProduct
from app.models.service_card_activity import ServiceCardActivity
from app.models.user import User
from app.schemas.service_dashboard import (
    ServiceDashboardResponse, NameCount, StageCount, CollaboratorStat,
)

TYPE_LABELS = {
    "call": "Ligação", "task": "Tarefa", "follow_up": "Follow-up",
    "email": "E-mail", "whatsapp": "WhatsApp", "meeting": "Reunião",
    "linkedin": "LinkedIn", "other": "Outro",
}


class ServiceDashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboard(self, start: datetime, end: datetime) -> ServiceDashboardResponse:
        db = self.db
        now = datetime.utcnow()
        threshold = now - timedelta(days=3)

        # ── Boards / listas ──────────────────────────────────────────────────
        board_ids = [b.id for b in db.query(ServiceBoard.id).filter(ServiceBoard.is_deleted == False).all()]  # noqa: E712
        lists = db.query(ServiceList).filter(ServiceList.board_id.in_(board_ids)).all() if board_ids else []
        list_ids = [l.id for l in lists]
        done_ids = {l.id for l in lists if l.is_done_stage or "ganho" in (l.name or "").lower()}
        lost_ids = {l.id for l in lists if l.is_lost_stage or "perdido" in (l.name or "").lower()}

        cards = (
            db.query(ServiceCard)
            .filter(ServiceCard.list_id.in_(list_ids), ServiceCard.is_deleted == False)  # noqa: E712
            .all()
            if list_ids else []
        )
        card_ids = [c.id for c in cards]
        active_cards = [c for c in cards if c.list_id not in done_ids and c.list_id not in lost_ids]

        # ── Valor por card (produtos) ────────────────────────────────────────
        value_by_card: dict = {}
        if card_ids:
            rows = (
                db.query(
                    ServiceCardProduct.service_card_id,
                    func.coalesce(func.sum(ServiceCardProduct.quantity * ServiceCardProduct.unit_price - ServiceCardProduct.discount), 0),
                )
                .filter(ServiceCardProduct.service_card_id.in_(card_ids))
                .group_by(ServiceCardProduct.service_card_id)
                .all()
            )
            value_by_card = {cid: float(v or 0) for cid, v in rows}

        pipeline_value = sum(value_by_card.get(c.id, 0.0) for c in active_cards)

        # ── Funil (snapshot por etapa) ───────────────────────────────────────
        by_list = Counter(c.list_id for c in cards)
        cards_by_stage = [
            StageCount(stage_name=l.name, count=by_list.get(l.id, 0))
            for l in sorted(lists, key=lambda x: x.position)
        ]

        # ── Eventos de ganho/perdido no período ──────────────────────────────
        def events(activity_type: str):
            if not card_ids:
                return []
            return (
                db.query(ServiceCardActivity.service_card_id, ServiceCardActivity.user_id)
                .filter(
                    ServiceCardActivity.service_card_id.in_(card_ids),
                    ServiceCardActivity.activity_type == activity_type,
                    ServiceCardActivity.created_at >= start,
                    ServiceCardActivity.created_at <= end,
                )
                .all()
            )

        # Eventos card_won/card_lost (usados para atribuição no ranking de colaboradores)
        won_events = events("card_won")
        lost_events = events("card_lost")

        # Ganhos/Perdidos no período: cards que estão em etapa final E foram
        # marcados dentro do período (pela data de atualização). Independe do
        # evento existir — funciona até para cards marcados antes do registro.
        won_cards = [c for c in cards if c.list_id in done_ids and c.updated_at and start <= c.updated_at <= end]
        lost_cards = [c for c in cards if c.list_id in lost_ids and c.updated_at and start <= c.updated_at <= end]
        won_count = len(won_cards)
        lost_count = len(lost_cards)
        won_value = sum(value_by_card.get(c.id, 0.0) for c in won_cards)
        avg_ticket = (won_value / won_count) if won_count else 0.0
        win_rate = (won_count / (won_count + lost_count) * 100) if (won_count + lost_count) else 0.0

        # ── Atrasados 3d+ ────────────────────────────────────────────────────
        # Cards ativos com ao menos uma atividade pendente vencida há 3+ dias
        # (due_date no passado, antes do threshold de 3 dias e não concluída).
        active_ids = {c.id for c in active_cards}
        overdue_3d_cards = (
            {cid for (cid,) in db.query(ServiceCardActivity.service_card_id)
             .filter(
                 ServiceCardActivity.service_card_id.in_(active_ids),
                 ServiceCardActivity.category == "atividade",
                 ServiceCardActivity.is_completed == False,  # noqa: E712
                 ServiceCardActivity.due_date.isnot(None),
                 ServiceCardActivity.due_date < threshold,
             ).distinct().all()}
            if active_ids else set()
        )
        stuck_count = len(overdue_3d_cards)

        # ── Atividades no período (category=atividade) ───────────────────────
        act_rows = (
            db.query(ServiceCardActivity.activity_type, ServiceCardActivity.user_id)
            .filter(
                ServiceCardActivity.service_card_id.in_(card_ids),
                ServiceCardActivity.category == "atividade",
                ServiceCardActivity.created_at >= start,
                ServiceCardActivity.created_at <= end,
            )
            .all()
            if card_ids else []
        )
        activities_count = len(act_rows)
        type_counter = Counter((t or "other") for t, _ in act_rows)
        activities_by_type = [
            NameCount(name=TYPE_LABELS.get(t, t), count=cnt)
            for t, cnt in type_counter.most_common()
        ]

        # ── Ranking de colaboradores ─────────────────────────────────────────
        collab_act = Counter(uid for _, uid in act_rows if uid)
        collab_won = Counter(uid for _, uid in won_events if uid)
        collab_lost = Counter(uid for _, uid in lost_events if uid)
        all_uids = set(collab_act) | set(collab_won) | set(collab_lost)
        names = (
            {u.id: u.name for u in db.query(User).filter(User.id.in_(list(all_uids))).all()}
            if all_uids else {}
        )
        collaborators = sorted(
            [
                CollaboratorStat(
                    user_id=uid,
                    name=names.get(uid, f"#{uid}"),
                    activities=collab_act.get(uid, 0),
                    won=collab_won.get(uid, 0),
                    lost=collab_lost.get(uid, 0),
                )
                for uid in all_uids
            ],
            key=lambda x: (x.activities, x.won),
            reverse=True,
        )

        # ── Motivos de perda (das anotações "Motivo da perda: X") ────────────
        reason_counter: Counter = Counter()
        if card_ids:
            notes = (
                db.query(ServiceCardActivity.description)
                .filter(
                    ServiceCardActivity.service_card_id.in_(card_ids),
                    ServiceCardActivity.category == "anotacao",
                    ServiceCardActivity.created_at >= start,
                    ServiceCardActivity.created_at <= end,
                    ServiceCardActivity.description.like("Motivo da perda:%"),
                )
                .all()
            )
            for (desc,) in notes:
                r = (desc or "").replace("Motivo da perda:", "").strip().split(".")[0].strip()
                if r:
                    reason_counter[r] += 1
        loss_reasons = [NameCount(name=r, count=c) for r, c in reason_counter.most_common()]

        return ServiceDashboardResponse(
            active_count=len(active_cards),
            pipeline_value=pipeline_value,
            stuck_count=stuck_count,
            won_count=won_count,
            lost_count=lost_count,
            won_value=won_value,
            activities_count=activities_count,
            avg_ticket=avg_ticket,
            win_rate=round(win_rate, 1),
            cards_by_stage=cards_by_stage,
            activities_by_type=activities_by_type,
            collaborators=collaborators,
            loss_reasons=loss_reasons,
        )
