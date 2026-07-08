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
from app.models.service_card_service import ServiceCardService
from app.models.service_card_activity import ServiceCardActivity
from app.models.user import User
from app.services.service_board_service import SERVICE_FUNNEL_BOARD_IDS
from app.schemas.service_dashboard import (
    ServiceDashboardResponse, NameCount, StageCount, CollaboratorStat,
    DayPoint, RecalibrationStats,
)

MONTH_ABBR = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

TYPE_LABELS = {
    "call": "Ligação", "task": "Tarefa", "follow_up": "Follow-up",
    "email": "E-mail", "whatsapp": "WhatsApp", "meeting": "Reunião",
    "linkedin": "LinkedIn", "other": "Outro",
}


class ServiceDashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboard(self, start: datetime, end: datetime, boards=None) -> ServiceDashboardResponse:
        db = self.db
        now = datetime.utcnow()
        threshold = now - timedelta(days=3)

        # ── Boards / listas ──────────────────────────────────────────────────
        # Por padrão, considera só o funil oficial. `boards` permite filtrar outro
        # board com regra (ex: Cobrança = {2}). Boards livres ficam de fora.
        target = boards if boards is not None else SERVICE_FUNNEL_BOARD_IDS
        board_ids = [
            b.id for b in db.query(ServiceBoard.id)
            .filter(ServiceBoard.is_deleted == False, ServiceBoard.id.in_(target))  # noqa: E712
            .all()
        ]
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

        # ── Valor por card (serviços) ────────────────────────────────────────
        value_by_card: dict = {}
        if card_ids:
            rows = (
                db.query(
                    ServiceCardService.service_card_id,
                    func.coalesce(func.sum(ServiceCardService.quantity * ServiceCardService.unit_price - ServiceCardService.discount), 0),
                )
                .filter(ServiceCardService.service_card_id.in_(card_ids))
                .group_by(ServiceCardService.service_card_id)
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

        # ── Recalibrações (a partir dos aparelhos) ───────────────────────────
        today = datetime(now.year, now.month, now.day)
        active_ids_set = {c.id for c in active_cards}
        overdue_r = due_30 = due_50 = due_90 = total_devices = 0
        devices_per_card: dict = {}  # card_id -> nº de aparelhos (p/ ranking)
        if card_ids:
            prod_rows = (
                db.query(ServiceCardProduct.service_card_id, ServiceCardProduct.aparelhos)
                .filter(ServiceCardProduct.service_card_id.in_(card_ids))
                .all()
            )
            for cid, aparelhos in prod_rows:
                if not aparelhos:
                    continue
                for ap in aparelhos:
                    devices_per_card[cid] = devices_per_card.get(cid, 0) + 1
                    # Estatística de vencimento só p/ cards ativos (pipeline)
                    if cid not in active_ids_set:
                        continue
                    raw = (ap or {}).get("next_recalibration_date")
                    if not raw:
                        continue
                    try:
                        d = datetime.fromisoformat(str(raw)[:10])
                    except Exception:
                        continue
                    total_devices += 1
                    delta = (d - today).days
                    if delta < 0:
                        overdue_r += 1
                    else:
                        if delta <= 30:
                            due_30 += 1
                        if delta <= 50:
                            due_50 += 1
                        if delta <= 90:
                            due_90 += 1
        recalibrations = RecalibrationStats(
            overdue=overdue_r, due_30=due_30, due_50=due_50, due_90=due_90,
            total_devices=total_devices,
        )

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
        # Recalibrações concluídas = aparelhos dos negócios ganhos no período,
        # atribuídos a quem registrou o ganho.
        collab_recal: Counter = Counter()
        for cid, uid in won_events:
            if uid:
                collab_recal[uid] += devices_per_card.get(cid, 0)
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
                    recalibrations=collab_recal.get(uid, 0),
                )
                for uid in all_uids
            ],
            key=lambda x: (x.activities + x.recalibrations, x.won),
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

        # ── Composição dos negócios em aberto (business_info) ────────────────
        MOD_LABELS = {"venda": "Venda", "locacao": "Locação"}
        ST_LABELS = {"recalibracao": "Recalibração", "manutencao": "Manutenção", "ambos": "Ambos"}
        modality_counter: Counter = Counter()
        service_type_counter: Counter = Counter()
        for c in active_cards:
            bi = c.business_info or {}
            m = str(bi.get("modality") or "").strip()
            if m in MOD_LABELS:
                modality_counter[MOD_LABELS[m]] += 1
            st = str(bi.get("service_type") or "").strip()
            if st in ST_LABELS:
                service_type_counter[ST_LABELS[st]] += 1
        modality = [NameCount(name=k, count=v) for k, v in modality_counter.most_common()]
        service_type = [NameCount(name=k, count=v) for k, v in service_type_counter.most_common()]

        # ── Evolução temporal (últimos 6 meses, independe do filtro) ─────────
        months = []
        yy, mm = now.year, now.month
        for _ in range(6):
            months.append((yy, mm))
            mm -= 1
            if mm == 0:
                mm = 12
                yy -= 1
        months.reverse()
        won_by_month: Counter = Counter()
        lost_by_month: Counter = Counter()
        for c in cards:
            if c.updated_at:
                key = (c.updated_at.year, c.updated_at.month)
                if c.list_id in done_ids:
                    won_by_month[key] += 1
                elif c.list_id in lost_ids:
                    lost_by_month[key] += 1
        act_by_month: Counter = Counter()
        if card_ids:
            range_start = datetime(months[0][0], months[0][1], 1)
            act_dates = (
                db.query(ServiceCardActivity.created_at)
                .filter(
                    ServiceCardActivity.service_card_id.in_(card_ids),
                    ServiceCardActivity.category == "atividade",
                    ServiceCardActivity.created_at >= range_start,
                )
                .all()
            )
            for (dt,) in act_dates:
                if dt:
                    act_by_month[(dt.year, dt.month)] += 1
        evolution = [
            DayPoint(
                period=f"{MONTH_ABBR[m]}/{str(y)[2:]}",
                won=won_by_month.get((y, m), 0),
                lost=lost_by_month.get((y, m), 0),
                activities=act_by_month.get((y, m), 0),
            )
            for (y, m) in months
        ]

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
            evolution=evolution,
            recalibrations=recalibrations,
            modality=modality,
            service_type=service_type,
        )
