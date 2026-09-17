"""
Uma avaliação por reunião, com os 26 itens pendurados nela.

Peso e bloco ficam copiados na linha do item de propósito: é o que permite
reabrir uma avaliação de meses atrás e conferir como aquele 62 foi calculado,
mesmo depois de a régua mudar.
"""
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.card_task import CardTask
from app.models.meeting_evaluation import MeetingEvaluation, MeetingEvaluationItem


@pytest.fixture
def reuniao(db: Session, test_card, test_salesperson_user) -> CardTask:
    t = CardTask(
        card_id=test_card.id,
        title="Reunião avaliada",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        transcript_raw="WEBVTT\n\nfala do cliente",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def test_guarda_a_avaliacao_com_os_itens(db: Session, reuniao, test_salesperson_user):
    avaliacao = MeetingEvaluation(
        card_task_id=reuniao.id,
        avaliado_por_id=test_salesperson_user.id,
        versao_criterios="2026-09",
        score=62.0,
        veredito="Call frágil — valor percebido parcial",
        cobertura=0.92,
        medias_por_bloco={"Abertura": 70, "Diagnóstico": 55},
        desfecho="Proposta ficou de ser enviada",
        ponto_forte="Processo atual bem mapeado",
        foco_desenvolvimento="Não conectou a dor ao risco",
        proxima_acao="Perguntar quem aprova",
    )
    avaliacao.itens.append(MeetingEvaluationItem(
        criterio_id="A1", bloco="Abertura", peso=3, nota=1,
        evidencia="Sou o Miguel, da Health and Safety",
        porque="apresentou-se, mas sem prova de autoridade",
    ))
    db.add(avaliacao)
    db.commit()
    db.refresh(avaliacao)

    assert avaliacao.itens[0].criterio_id == "A1"
    assert avaliacao.medias_por_bloco["Abertura"] == 70
    assert reuniao.evaluation.score == 62.0


def test_uma_avaliacao_por_reuniao(db: Session, reuniao):
    """Reavaliar substitui — duas avaliações da mesma reunião não fazem sentido."""
    db.add(MeetingEvaluation(card_task_id=reuniao.id, versao_criterios="2026-09"))
    db.commit()

    db.add(MeetingEvaluation(card_task_id=reuniao.id, versao_criterios="2026-09"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_apagar_a_avaliacao_leva_os_itens(db: Session, reuniao):
    avaliacao = MeetingEvaluation(card_task_id=reuniao.id, versao_criterios="2026-09")
    avaliacao.itens.append(
        MeetingEvaluationItem(criterio_id="A1", bloco="Abertura", peso=3, nota=2)
    )
    db.add(avaliacao)
    db.commit()

    db.delete(avaliacao)
    db.commit()

    assert db.query(MeetingEvaluationItem).count() == 0


def test_nota_nula_e_criterio_que_nao_se_aplica(db: Session, reuniao):
    """N/A não é zero: sai da conta em vez de punir."""
    avaliacao = MeetingEvaluation(card_task_id=reuniao.id, versao_criterios="2026-09")
    avaliacao.itens.append(
        MeetingEvaluationItem(criterio_id="M7", bloco="Demonstração", peso=1, nota=None)
    )
    db.add(avaliacao)
    db.commit()

    assert avaliacao.itens[0].nota is None
