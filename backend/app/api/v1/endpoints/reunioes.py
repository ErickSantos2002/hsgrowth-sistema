"""
A página de Reuniões — lista e indicadores numa resposta só.

Lista **todas** as reuniões, não só as avaliadas: o que interessa ao gestor é
justamente o que ninguém gravou nem avaliou. Reunião cancelada fica de fora,
porque reunião que não aconteceu não entra na conta de avaliação.

Visibilidade (RN-037): admin e gerente veem tudo; os demais veem os negócios
em que são vendedor ou SDR — por id, não por nome. A página de Ligações compara
nomes em texto, o que erra com homônimo e nome composto.
"""
import math
from datetime import date, datetime, time
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_active_user, get_db
from app.models.card import Card
from app.models.card_task import CardTask
from app.models.meeting_evaluation import MeetingEvaluation
from app.models.user import User

router = APIRouter()

# Critério "próximo passo com compromisso" — o ponto mais fraco do time hoje
CRITERIO_PROXIMO_PASSO = "F6"

TAMANHO_PADRAO = 20


def _quando(task: CardTask):
    """A data em que a reunião aconteceu, ou a que estava marcada."""
    return task.meeting_ended_at or task.due_date


def _selo(task: CardTask, avaliacao: Optional[MeetingEvaluation]) -> str:
    if task.is_noshow:
        return "no-show"
    if avaliacao:
        return "avaliada"
    if task.recording_status == "ready" or task.transcript_raw:
        return "gravada"
    return "sem gravação"


@router.get(
    "",
    summary="Reuniões e indicadores",
    description="""
    Lista as reuniões do período com os indicadores do topo da página.

    Os indicadores valem para o período inteiro, não só para a página atual.
    """,
)
def listar_reunioes(
    page: int = 1,
    page_size: int = TAMANHO_PADRAO,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    vendedor_id: Optional[int] = None,
    veredito: Optional[str] = None,
    estado: Optional[str] = Query(
        None, pattern="^(todas|sem_gravacao|avaliadas|nao_avaliadas)$"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    role = current_user.role.name if current_user.role else ""
    e_gestor = role in ("admin", "manager")

    consulta = (
        db.query(CardTask)
        .join(Card, Card.id == CardTask.card_id)
        .outerjoin(MeetingEvaluation, MeetingEvaluation.card_task_id == CardTask.id)
        .options(
            joinedload(CardTask.card).joinedload(Card.assigned_to),
            joinedload(CardTask.evaluation).joinedload(MeetingEvaluation.itens),
        )
        .filter(CardTask.task_type == "meeting")
        .filter(CardTask.is_cancelled.is_(False))
    )

    if not e_gestor:
        consulta = consulta.filter(
            or_(
                Card.assigned_to_id == current_user.id,
                Card.sdr_id == current_user.id,
            )
        )

    if date_from:
        consulta = consulta.filter(CardTask.due_date >= datetime.combine(date_from, time.min))
    if date_to:
        consulta = consulta.filter(CardTask.due_date <= datetime.combine(date_to, time.max))

    # Quem tem reunião no período — levantado ANTES do filtro por vendedor,
    # senão escolher uma pessoa apagaria as outras do seletor e o gestor
    # ficaria preso naquele nome.
    vendedores = []
    if e_gestor:
        vistos = {}
        for t in consulta.all():
            if t.card and t.card.assigned_to:
                vistos[t.card.assigned_to.id] = t.card.assigned_to.name
        vendedores = [
            {"id": i, "nome": nome} for i, nome in sorted(vistos.items(), key=lambda x: x[1])
        ]

    if e_gestor and vendedor_id:
        consulta = consulta.filter(Card.assigned_to_id == vendedor_id)
    if veredito:
        consulta = consulta.filter(MeetingEvaluation.veredito == veredito)

    if estado == "avaliadas":
        consulta = consulta.filter(MeetingEvaluation.id.isnot(None))
    elif estado == "nao_avaliadas":
        consulta = consulta.filter(MeetingEvaluation.id.is_(None))
    elif estado == "sem_gravacao":
        consulta = consulta.filter(CardTask.transcript_raw.is_(None))

    todas = consulta.all()
    total = len(todas)

    avaliadas = [t for t in todas if t.evaluation]
    comparaveis = [t for t in avaliadas if t.evaluation.score is not None]

    score_medio = (
        round(sum(t.evaluation.score for t in comparaveis) / len(comparaveis), 1)
        if comparaveis
        else None
    )

    por_veredito = {}
    for t in avaliadas:
        chave = t.evaluation.veredito or "sem veredito"
        por_veredito[chave] = por_veredito.get(chave, 0) + 1

    somas_por_bloco = {}
    for t in avaliadas:
        for bloco, media in (t.evaluation.medias_por_bloco or {}).items():
            somas_por_bloco.setdefault(bloco, []).append(media)
    media_por_bloco = {
        bloco: round(sum(v) / len(v), 1) for bloco, v in somas_por_bloco.items() if v
    }

    com_proximo_passo = sum(
        1
        for t in avaliadas
        if any(
            i.criterio_id == CRITERIO_PROXIMO_PASSO and (i.nota or 0) >= 1
            for i in t.evaluation.itens
        )
    )

    por_vendedor = []
    if e_gestor:
        agrupado = {}
        for t in todas:
            nome = t.card.assigned_to.name if t.card and t.card.assigned_to else "sem vendedor"
            linha = agrupado.setdefault(
                nome, {"vendedor": nome, "reunioes": 0, "scores": [], "blocos": {}}
            )
            linha["reunioes"] += 1
            if t.evaluation and t.evaluation.score is not None:
                linha["scores"].append(t.evaluation.score)
                for bloco, media in (t.evaluation.medias_por_bloco or {}).items():
                    linha["blocos"].setdefault(bloco, []).append(media)

        for linha in agrupado.values():
            por_vendedor.append({
                "vendedor": linha["vendedor"],
                "reunioes": linha["reunioes"],
                "score_medio": (
                    round(sum(linha["scores"]) / len(linha["scores"]), 1)
                    if linha["scores"]
                    else None
                ),
                "media_por_bloco": {
                    bloco: round(sum(v) / len(v), 1) for bloco, v in linha["blocos"].items()
                },
            })
        por_vendedor.sort(key=lambda linha: linha["score_medio"] or -1, reverse=True)

    ordenadas = sorted(todas, key=lambda t: _quando(t) or datetime.min, reverse=True)
    pagina = ordenadas[(page - 1) * page_size : page * page_size]

    items = [
        {
            "task_id": t.id,
            "card_id": t.card_id,
            "titulo": t.title,
            "cliente": t.card.title if t.card else None,
            "vendedor": t.card.assigned_to.name if t.card and t.card.assigned_to else None,
            "quando": _quando(t),
            "duracao_minutos": (
                int((t.meeting_ended_at - t.meeting_started_at).total_seconds() / 60)
                if t.meeting_started_at and t.meeting_ended_at
                else None
            ),
            "selo": _selo(t, t.evaluation),
            "score": t.evaluation.score if t.evaluation else None,
            "veredito": t.evaluation.veredito if t.evaluation else None,
        }
        for t in pagina
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)),
        "score_medio": score_medio,
        "por_veredito": por_veredito,
        "media_por_bloco": media_por_bloco,
        "percentual_avaliadas": round(len(avaliadas) / total * 100, 1) if total else 0.0,
        "percentual_proximo_passo": (
            round(com_proximo_passo / len(avaliadas) * 100, 1) if avaliadas else 0.0
        ),
        "por_vendedor": por_vendedor,
        "vendedores": vendedores,
    }
