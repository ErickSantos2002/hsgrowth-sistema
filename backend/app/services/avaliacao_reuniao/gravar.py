"""
Grava uma avaliação da reunião no banco.

Um lugar só para os dois caminhos que avaliam: o clique em "Avaliar pelo
roteiro" e a avaliação automática ao fim da reunião do CRM. Com duas cópias,
uma delas acabaria esquecendo de apagar a anterior — e a reunião ficaria com
duas avaliações, sem ninguém saber qual vale.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.card_task import CardTask
from app.models.meeting_evaluation import MeetingEvaluation, MeetingEvaluationItem
from app.services.avaliacao_reuniao.criterios import VERSAO


def gravar_avaliacao(
    db: Session,
    task: CardTask,
    resultado: dict,
    avaliado_por_id: Optional[int] = None,
) -> MeetingEvaluation:
    """
    Substitui a avaliação anterior da reunião, se houver, pela nova.

    Args:
        resultado: o que `servico.avaliar` devolve.
        avaliado_por_id: quem pediu; `None` quando a avaliação foi automática.
    """
    anterior = (
        db.query(MeetingEvaluation)
        .filter(MeetingEvaluation.card_task_id == task.id)
        .first()
    )
    if anterior:
        db.delete(anterior)
        db.flush()

    avaliacao = MeetingEvaluation(
        card_task_id=task.id,
        avaliado_por_id=avaliado_por_id,
        versao_criterios=VERSAO,
        score=resultado["score"],
        veredito=resultado["veredito"],
        cobertura=resultado["cobertura"],
        medias_por_bloco=resultado["medias_por_bloco"],
        desfecho=resultado.get("desfecho"),
        ponto_forte=resultado.get("ponto_forte"),
        foco_desenvolvimento=resultado.get("foco_desenvolvimento"),
        proxima_acao=resultado.get("proxima_acao"),
        modelo=resultado.get("modelo"),
        tokens_entrada=resultado.get("tokens_entrada"),
        tokens_saida=resultado.get("tokens_saida"),
        latencia_ms=resultado.get("latencia_ms"),
    )
    for item in resultado["itens"]:
        avaliacao.itens.append(MeetingEvaluationItem(
            criterio_id=item["criterio_id"],
            bloco=item["bloco"],
            peso=item["peso"],
            nota=item["nota"],
            evidencia=item.get("evidencia"),
            porque=item.get("porque"),
        ))

    db.add(avaliacao)
    db.commit()
    db.refresh(avaliacao)
    return avaliacao
