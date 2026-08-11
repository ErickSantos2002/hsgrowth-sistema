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
    recalibrations: int = 0  # recalibrações concluídas (aparelhos em negócios ganhos)


class DayPoint(BaseModel):
    """Ponto da evolução temporal (rótulo + métricas do período)."""
    period: str   # rótulo do bucket (ex: "Jun/26" ou "12/06")
    won: int
    lost: int
    activities: int


class RecalibrationStats(BaseModel):
    """Agregado de recalibrações a partir das datas dos aparelhos."""
    overdue: int       # já vencidas (data passada)
    due_30: int        # vencem em até 30 dias
    due_50: int        # vencem em até 50 dias
    due_90: int        # vencem em até 90 dias
    total_devices: int # total de aparelhos com data de recalibração


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
    # Funil — snapshot (o que está em cada etapa hoje)
    cards_by_stage: List[StageCount]
    # Funil — fluxo (quantos cards ENTRARAM em cada etapa no período)
    cards_by_stage_flow: List[StageCount] = []
    # Atividades por tipo (período)
    activities_by_type: List[NameCount]
    # Ranking de colaboradores (período)
    collaborators: List[CollaboratorStat]
    # Motivos de perda (período)
    loss_reasons: List[NameCount]
    # Evolução temporal (últimos meses) — para o gráfico de linha
    evolution: List[DayPoint] = []
    # Recalibrações (snapshot atual, a partir dos aparelhos)
    recalibrations: RecalibrationStats = RecalibrationStats(
        overdue=0, due_30=0, due_50=0, due_90=0, total_devices=0
    )
    # Composição dos negócios em aberto
    modality: List[NameCount] = []       # Venda × Locação
    service_type: List[NameCount] = []   # Recalibração × Manutenção × Ambos
    # Ganhos por tipo de serviço (alternador Perda/Ganho no gráfico)
    won_by_service_type: List[NameCount] = []
