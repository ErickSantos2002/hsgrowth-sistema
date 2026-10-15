"""
O dia em Brasília.

O Brasil não tem horário de verão desde 2019: UTC−3 fixo, sem depender de
base de fusos no servidor. As tarefas de Vendas são gravadas em UTC (o front
converte); as atividades de Serviço, no horário de Brasília, sem fuso.
"""
from dataclasses import dataclass
from datetime import date, datetime, timedelta

BRASILIA = timedelta(hours=-3)


@dataclass(frozen=True)
class Dia:
    data: date
    inicio_utc: datetime
    fim_utc: datetime
    inicio_local: datetime
    fim_local: datetime


def dia_em_brasilia(agora_utc: datetime) -> Dia:
    """Limites do dia de Brasília que contém `agora_utc` (UTC sem fuso)."""
    local = agora_utc + BRASILIA
    inicio_local = datetime(local.year, local.month, local.day)
    fim_local = inicio_local + timedelta(days=1)
    return Dia(
        data=inicio_local.date(),
        inicio_utc=inicio_local - BRASILIA,
        fim_utc=fim_local - BRASILIA,
        inicio_local=inicio_local,
        fim_local=fim_local,
    )


def hora_em_brasilia(quando_utc: datetime) -> str:
    return (quando_utc + BRASILIA).strftime("%H:%M")
