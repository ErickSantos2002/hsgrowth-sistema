"""Testes do helper de dias úteis usado na contagem de cards parados."""

from datetime import datetime

from app.utils.business_days import business_days_ago


# 2026-08-03 é uma SEGUNDA-feira; usamos datas fixas para não depender de "hoje".
SEGUNDA = datetime(2026, 8, 3, 10, 0)


def test_tres_dias_uteis_a_partir_de_segunda_pula_fim_de_semana():
    # Seg -> sex(1) -> qui(2) -> qua(3): 3 dias úteis atrás = quarta 29/07.
    assert business_days_ago(3, SEGUNDA) == datetime(2026, 7, 29, 10, 0)


def test_sete_dias_uteis_a_partir_de_segunda():
    # 7 dias úteis atrás de segunda 03/08 = quinta 23/07.
    assert business_days_ago(7, SEGUNDA) == datetime(2026, 7, 23, 10, 0)


def test_card_parado_desde_sexta_nao_conta_como_3d_na_segunda():
    # Cenário do usuário: card sem atividade desde sexta 31/07 10h.
    # Avaliado na segunda 03/08, o threshold de 3 dias úteis é quarta 29/07,
    # então a última atividade (sexta) é MAIS RECENTE que o threshold =>
    # NÃO deve ser marcado como "parado 3d+".
    ultima_atividade = datetime(2026, 7, 31, 10, 0)
    threshold_3d = business_days_ago(3, SEGUNDA)
    assert ultima_atividade > threshold_3d


def test_card_parado_desde_quarta_conta_como_3d_na_segunda():
    # Sem atividade desde a quarta anterior (29/07): é exatamente o limite;
    # a partir daí (qui/sex já passaram) deve contar como parado 3d+.
    ultima_atividade = datetime(2026, 7, 28, 10, 0)  # terça anterior
    threshold_3d = business_days_ago(3, SEGUNDA)
    assert ultima_atividade < threshold_3d


def test_zero_dias_retorna_a_propria_referencia():
    assert business_days_ago(0, SEGUNDA) == SEGUNDA


def test_um_dia_util_a_partir_de_segunda_e_sexta_anterior():
    # 1 dia útil atrás de segunda pula domingo/sábado e cai na sexta.
    assert business_days_ago(1, SEGUNDA) == datetime(2026, 7, 31, 10, 0)
