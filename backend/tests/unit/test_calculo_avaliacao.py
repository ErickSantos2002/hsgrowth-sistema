"""
O cálculo do score, sem IA no meio.

A conta é a da planilha da consultoria:
    pontos = peso × nota ÷ 2
    score  = pontos ÷ pesos aplicáveis × 100

Ter isso separado é o que permite um vendedor contestar uma nota e alguém
refazer a conta à mão.
"""
from app.services.avaliacao_reuniao.calculo import calcular


def item(criterio_id, bloco, peso, nota):
    return {"criterio_id": criterio_id, "bloco": bloco, "peso": peso, "nota": nota}


class TestScore:

    def test_tudo_dois_da_cem(self):
        itens = [item("A1", "Abertura", 50, 2), item("D1", "Diagnóstico", 50, 2)]

        r = calcular(itens)

        assert r["score"] == 100
        assert r["veredito"] == "Call padrão ouro"

    def test_tudo_zero_da_zero(self):
        itens = [item("A1", "Abertura", 50, 0), item("D1", "Diagnóstico", 50, 0)]

        r = calcular(itens)

        assert r["score"] == 0
        assert r["veredito"] == "Call informativa — não avançou o negócio"

    def test_nota_um_vale_metade_do_peso(self):
        itens = [item("A1", "Abertura", 40, 2), item("D1", "Diagnóstico", 60, 1)]

        r = calcular(itens)

        # (40×2÷2) + (60×1÷2) = 40 + 30 = 70 de 100
        assert r["score"] == 70
        # 70 ainda é frágil: "boa call" começa em 75
        assert r["veredito"] == "Call frágil — valor percebido parcial"


class TestCriterioQueNaoSeAplica:

    def test_na_sai_da_conta_em_vez_de_punir(self):
        """Nota nula não é zero: o peso dela some do denominador."""
        itens = [item("A1", "Abertura", 80, 2), item("M7", "Demonstração", 20, None)]

        r = calcular(itens)

        assert r["score"] == 100
        assert r["cobertura"] == 0.8

    def test_cobertura_baixa_nao_gera_score(self):
        """Reunião curta puxa a nota por falta de conversa, não de técnica."""
        itens = [item("A1", "Abertura", 60, None), item("D1", "Diagnóstico", 40, 2)]

        r = calcular(itens)

        assert r["score"] is None
        assert r["veredito"] == "Call parcial — não comparar"
        assert r["cobertura"] == 0.4

    def test_nenhum_criterio_aplicavel_nao_divide_por_zero(self):
        itens = [item("A1", "Abertura", 100, None)]

        r = calcular(itens)

        assert r["score"] is None
        assert r["cobertura"] == 0


class TestFaixas:

    def test_nota_um_em_tudo_ainda_e_informativa(self):
        """Metade da régua dá 50 — abaixo dos 60 que abrem a faixa seguinte."""
        r = calcular([item("A1", "Abertura", 100, 1)])

        assert r["score"] == 50
        assert r["veredito"] == "Call informativa — não avançou o negócio"

    def test_sessenta_exato_ja_e_fragil(self):
        itens = [item("A1", "Abertura", 60, 2), item("D1", "Diagnóstico", 40, 0)]

        r = calcular(itens)

        assert r["score"] == 60
        assert r["veredito"] == "Call frágil — valor percebido parcial"

    def test_score_arredondado_para_uma_casa(self):
        itens = [item("A1", "Abertura", 30, 2), item("D1", "Diagnóstico", 40, 1)]

        # (30 + 20) ÷ 70 × 100 = 71,428... → 71.4
        assert calcular(itens)["score"] == 71.4


class TestMediasPorBloco:

    def test_media_de_cada_bloco_na_mesma_escala_do_score(self):
        itens = [
            item("A1", "Abertura", 10, 2),
            item("A2", "Abertura", 10, 0),
            item("D1", "Diagnóstico", 80, 1),
        ]

        r = calcular(itens)

        assert r["medias_por_bloco"]["Abertura"] == 50
        assert r["medias_por_bloco"]["Diagnóstico"] == 50

    def test_bloco_inteiro_sem_nota_fica_de_fora(self):
        itens = [item("A1", "Abertura", 50, 2), item("F1", "Fechamento", 50, None)]

        r = calcular(itens)

        assert "Fechamento" not in r["medias_por_bloco"]
