import math
from typing import List, Optional
from datetime import date, time, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, require_manager_or_admin
from app.models.user import User
from app.models.call_evaluation import CallEvaluation
from app.models.card import Card
from app.schemas.call_evaluation import CallEvaluationCreate, CallEvaluationResponse, CallEvaluationListResponse

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
        ramal=payload.ramal,
        vendedor_name=payload.vendedor_name,
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


@router.get("/vendedores", response_model=list[str])
def list_vendedores(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin()),
):
    """
    Retorna lista de nomes distintos de vendedores que possuem avaliações registradas.
    Usado para popular o filtro de vendedor na página de Ligações.
    """
    rows = (
        db.query(CallEvaluation.vendedor_name)
        .filter(CallEvaluation.vendedor_name.isnot(None))
        .distinct()
        .order_by(CallEvaluation.vendedor_name)
        .all()
    )
    return [row[0] for row in rows]


@router.get("", response_model=CallEvaluationListResponse)
def list_call_evaluations(
    page: int = 1,
    page_size: int = 10,
    classification: Optional[str] = None,
    vendedor_name: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Lista avaliações de ligação com filtros e paginação.
    Manager/admin veem todas. Outros roles veem apenas as próprias ligações.
    """
    is_manager_or_admin = current_user.role and current_user.role.name in ("manager", "admin")

    filters = []
    # Usuários não-gestores só veem suas próprias ligações
    if not is_manager_or_admin:
        filters.append(CallEvaluation.vendedor_name.ilike(current_user.name))
    elif vendedor_name:
        filters.append(CallEvaluation.vendedor_name == vendedor_name)

    if classification:
        filters.append(CallEvaluation.classification == classification)
    if date_from:
        filters.append(CallEvaluation.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        filters.append(CallEvaluation.created_at <= datetime.combine(date_to, time.max))

    base_query = db.query(CallEvaluation).filter(*filters)
    total = base_query.count()

    avg_result = db.query(func.avg(CallEvaluation.final_score)).filter(*filters).scalar()
    average_score = round(float(avg_result), 2) if avg_result is not None else None

    class_counts = (
        db.query(CallEvaluation.classification, func.count(CallEvaluation.id))
        .filter(*filters)
        .group_by(CallEvaluation.classification)
        .all()
    )
    by_classification = {row[0] or "sem_classificacao": row[1] for row in class_counts}

    # Calcula média por bloco iterando os JSONs de matrix_evaluation
    # (campo JSON — não agregável via SQL)
    block_sums: dict[str, list[float]] = {}
    all_matrices = (
        db.query(CallEvaluation.matrix_evaluation)
        .filter(*filters)
        .filter(CallEvaluation.matrix_evaluation.isnot(None))
        .all()
    )
    for (matrix,) in all_matrices:
        if not isinstance(matrix, list):
            continue
        for block in matrix:
            name = block.get("block") if isinstance(block, dict) else None
            grade = block.get("grade") if isinstance(block, dict) else None
            not_applicable = block.get("not_applicable", False) if isinstance(block, dict) else False
            if name and grade is not None and not not_applicable:
                block_sums.setdefault(name, []).append(float(grade))
    average_by_block = {
        name: round(sum(grades) / len(grades), 2)
        for name, grades in block_sums.items()
        if grades
    }

    total_pages = max(1, math.ceil(total / page_size))
    items = (
        base_query
        .order_by(CallEvaluation.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return CallEvaluationListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        average_score=average_score,
        by_classification=by_classification,
        average_by_block=average_by_block,
    )


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
