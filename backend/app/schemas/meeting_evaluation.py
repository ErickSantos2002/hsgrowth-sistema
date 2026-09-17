"""Schemas da avaliação de reunião pela régua da consultoria."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class MeetingEvaluationItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    criterio_id: str
    bloco: str
    peso: float
    nota: Optional[int] = None
    evidencia: Optional[str] = None
    porque: Optional[str] = None


class MeetingEvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    card_task_id: int
    avaliado_em: datetime
    avaliado_por: Optional[str] = None
    versao_criterios: str

    # Nulo quando a cobertura ficou abaixo do mínimo — a reunião não recebe
    # nota comparável, mas os 26 itens continuam lá para leitura.
    score: Optional[float] = None
    veredito: Optional[str] = None
    cobertura: Optional[float] = None
    medias_por_bloco: Optional[dict] = None

    desfecho: Optional[str] = None
    ponto_forte: Optional[str] = None
    foco_desenvolvimento: Optional[str] = None
    proxima_acao: Optional[str] = None

    itens: List[MeetingEvaluationItemResponse] = []
