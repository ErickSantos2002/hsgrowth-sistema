"""
Schemas da Dashboard de Serviços (agregados).
"""
from typing import List
from pydantic import BaseModel


class NameCount(BaseModel):
    name: str
    count: int


class StageCount(BaseModel):
    stage_name: str
    count: int


class CollaboratorStat(BaseModel):
    user_id: int
    name: str
    activities: int
    won: int
    lost: int


class ServiceDashboardResponse(BaseModel):
    # KPIs (snapshot atual)
    active_count: int              # negócios em aberto
    pipeline_value: float          # valor total em aberto
    stuck_count: int               # parados 3d+
    # KPIs (período)
    won_count: int
    lost_count: int
    won_value: float
    activities_count: int
    avg_ticket: float
    win_rate: float                # %
    # Funil
    cards_by_stage: List[StageCount]
    # Atividades por tipo (período)
    activities_by_type: List[NameCount]
    # Ranking de colaboradores (período)
    collaborators: List[CollaboratorStat]
    # Motivos de perda (período)
    loss_reasons: List[NameCount]
