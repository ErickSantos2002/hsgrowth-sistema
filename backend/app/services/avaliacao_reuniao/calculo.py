"""
Do conjunto de notas ao score, cobertura, veredito e médias por bloco.

Sem IA e sem banco: a mesma entrada dá sempre a mesma saída. É o que permite
um vendedor contestar uma nota e alguém refazer a conta à mão.

A conta é a da planilha da consultoria:

    pontos do critério = peso × nota ÷ 2
    score              = pontos ÷ soma dos pesos aplicáveis × 100
    cobertura          = pesos aplicáveis ÷ soma de todos os pesos
"""
from app.services.avaliacao_reuniao.criterios import (
    COBERTURA_MINIMA,
    FAIXAS,
    VEREDITO_PARCIAL,
)

NOTA_MAXIMA = 2


def _veredito(score: float) -> str:
    for faixa in FAIXAS:
        if score >= faixa.minimo:
            return faixa.veredito
    return FAIXAS[-1].veredito


def calcular(itens: list) -> dict:
    """
    Args:
        itens: dicts com `criterio_id`, `bloco`, `peso` e `nota` (0, 1, 2 ou None)

    Returns:
        `score` (None quando não comparável), `veredito`, `cobertura` e
        `medias_por_bloco`.
    """
    peso_total = sum(i["peso"] for i in itens) or 0
    aplicaveis = [i for i in itens if i["nota"] is not None]
    peso_aplicavel = sum(i["peso"] for i in aplicaveis)

    cobertura = round(peso_aplicavel / peso_total, 4) if peso_total else 0

    medias = {}
    for bloco in {i["bloco"] for i in aplicaveis}:
        do_bloco = [i for i in aplicaveis if i["bloco"] == bloco]
        peso_do_bloco = sum(i["peso"] for i in do_bloco)
        pontos = sum(i["peso"] * i["nota"] / NOTA_MAXIMA for i in do_bloco)
        medias[bloco] = round(pontos / peso_do_bloco * 100, 1) if peso_do_bloco else 0

    # Transcrição curta ou picotada deixa metade dos critérios sem evidência.
    # Pontuar isso viraria nota baixa por falta de conversa, não por falta de
    # técnica — e o vendedor perderia a confiança na ferramenta.
    if not peso_aplicavel or cobertura < COBERTURA_MINIMA:
        return {
            "score": None,
            "veredito": VEREDITO_PARCIAL,
            "cobertura": cobertura,
            "medias_por_bloco": medias,
        }

    pontos = sum(i["peso"] * i["nota"] / NOTA_MAXIMA for i in aplicaveis)
    score = round(pontos / peso_aplicavel * 100, 1)

    return {
        "score": score,
        "veredito": _veredito(score),
        "cobertura": cobertura,
        "medias_por_bloco": medias,
    }
