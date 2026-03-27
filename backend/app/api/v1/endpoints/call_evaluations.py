from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.call_evaluation import CallEvaluation
from app.models.card import Card
from app.schemas.call_evaluation import CallEvaluationCreate, CallEvaluationResponse

router = APIRouter()


@router.post("", response_model=CallEvaluationResponse, status_code=status.HTTP_201_CREATED)
def create_call_evaluation(
    payload: CallEvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Cria uma avaliação de ligação gerada pelo agente de IA (N8N).

    Chamado automaticamente pelo N8N após transcrição e avaliação da ligação.
    """
    card = db.query(Card).filter(Card.id == payload.card_id).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card {payload.card_id} não encontrado"
        )

    matrix = None
    if payload.matrix_evaluation:
        matrix = [block.model_dump() for block in payload.matrix_evaluation]

    evaluation = CallEvaluation(
        card_id=payload.card_id,
        call_log_id=payload.call_log_id,
        transcript=payload.transcript,
        summary=payload.summary,
        next_steps=payload.next_steps,
        general_evaluation=payload.general_evaluation,
        situation=payload.situation,
        matrix_evaluation=matrix,
        final_score=payload.final_score,
        classification=payload.classification,
    )

    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    return evaluation


@router.get("/card/{card_id}", response_model=List[CallEvaluationResponse])
def list_evaluations_by_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Lista todas as avaliações de ligação de um card, ordenadas da mais recente para a mais antiga.
    """
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card {card_id} não encontrado"
        )

    evaluations = (
        db.query(CallEvaluation)
        .filter(CallEvaluation.card_id == card_id)
        .order_by(CallEvaluation.created_at.desc())
        .all()
    )

    return evaluations


@router.get("/{evaluation_id}", response_model=CallEvaluationResponse)
def get_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna uma avaliação específica pelo ID.
    """
    evaluation = db.query(CallEvaluation).filter(CallEvaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada"
        )

    return evaluation
