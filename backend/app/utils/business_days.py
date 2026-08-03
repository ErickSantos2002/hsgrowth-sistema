"""Utilitários de dias úteis (sem contar sábado e domingo).

Usado na contagem de "card parado há X dias" nos boards de Vendas e Serviços:
fins de semana não entram na conta. Assim, um card parado desde sexta só
vira "Parado 3d+" na quarta seguinte (seg/ter/qua = 3 dias úteis), e não já
na segunda como acontecia quando a contagem era em dias corridos.
"""

from datetime import datetime, timedelta, timezone


def business_days_ago(days: int, reference: datetime | None = None) -> datetime:
    """Retorna o datetime de `days` DIAS ÚTEIS atrás de `reference`.

    Caminha para trás um dia de cada vez, decrementando o contador apenas
    quando cai em dia de semana (segunda a sexta). Preserva a hora de
    `reference`.

    Args:
        days: quantidade de dias úteis a subtrair (>= 0).
        reference: ponto de partida. Se None, usa "agora" em UTC (naive),
            no mesmo formato usado no restante do backend.

    Exemplo (avaliando numa segunda-feira):
        business_days_ago(3) -> quarta-feira anterior
        (sex = 1 dia útil atrás, qui = 2, qua = 3; sáb/dom são pulados).
    """
    if reference is None:
        reference = datetime.now(timezone.utc).replace(tzinfo=None)
    result = reference
    remaining = days
    while remaining > 0:
        result -= timedelta(days=1)
        if result.weekday() < 5:  # 0=segunda ... 4=sexta; 5=sáb, 6=dom
            remaining -= 1
    return result
