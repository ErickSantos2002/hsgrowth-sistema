from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field


class UncoveredBlock(BaseModel):
    name: str
    suggestion: str


class MatrixBlock(BaseModel):
    block: str
    grade: Optional[float] = None
    justification: str
    not_applicable: bool = False
    uncovered_blocks: List[UncoveredBlock] = []


class CallEvaluationCreate(BaseModel):
    card_id: int
    call_log_id: Optional[int] = None
    transcript: Optional[str] = None
    summary: str
    next_steps: Optional[str] = None
    general_evaluation: Optional[str] = None
    situation: Optional[str] = None
    matrix_evaluation: Optional[List[MatrixBlock]] = None
    final_score: Optional[float] = Field(None, ge=0, le=10)
    classification: Optional[str] = None


class CallEvaluationResponse(BaseModel):
    id: int
    card_id: int
    call_log_id: Optional[int] = None
    transcript: Optional[str] = None
    summary: str
    next_steps: Optional[str] = None
    general_evaluation: Optional[str] = None
    situation: Optional[str] = None
    matrix_evaluation: Optional[List[Any]] = None
    final_score: Optional[float] = None
    classification: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
