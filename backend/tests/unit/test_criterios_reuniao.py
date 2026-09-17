"""
A régua da consultoria, versionada no código.

Ela é a base de toda nota: um peso errado aqui desloca silenciosamente o score
de todas as reuniões, e ninguém perceberia olhando a tela.
"""
from app.services.avaliacao_reuniao.criterios import (
    BLOCOS,
    COBERTURA_MINIMA,
    CRITERIOS,
    FAIXAS,
    VERSAO,
    criterio_por_id,
)


class TestARegua:

    def test_tem_os_26_criterios(self):
        assert len(CRITERIOS) == 26

    def test_pesos_somam_100(self):
        """A planilha da consultoria fecha em 100 — o score depende disso."""
        assert sum(c.peso for c in CRITERIOS) == 100

    def test_ids_nao_se_repetem(self):
        ids = [c.id for c in CRITERIOS]
        assert len(ids) == len(set(ids))

    def test_blocos_na_ordem_da_reuniao(self):
        assert BLOCOS == ("Abertura", "Diagnóstico", "Demonstração", "Fechamento")

    def test_todo_criterio_tem_bloco_conhecido(self):
        assert all(c.bloco in BLOCOS for c in CRITERIOS)

    def test_todo_criterio_tem_os_tres_niveis_de_rubrica(self):
        """Sem a rubrica escrita, a IA classifica pelo próprio critério."""
        for c in CRITERIOS:
            assert len(c.rubrica) == 3
            assert all(texto.strip() for texto in c.rubrica)

    def test_criterio_conhecido_confere_com_a_planilha(self):
        d8 = criterio_por_id("D8")
        assert d8.bloco == "Diagnóstico"
        assert d8.peso == 7
        assert "resum" in d8.rubrica[2].lower()

    def test_criterio_desconhecido_devolve_none(self):
        assert criterio_por_id("Z9") is None

    def test_versao_registrada(self):
        assert VERSAO == "2026-09"

    def test_cobertura_minima(self):
        assert COBERTURA_MINIMA == 0.70


class TestAsFaixas:

    def test_quatro_faixas_do_maior_para_o_menor(self):
        assert len(FAIXAS) == 4
        assert [f.minimo for f in FAIXAS] == [90, 75, 60, 0]

    def test_textos_da_consultoria(self):
        assert FAIXAS[0].veredito == "Call padrão ouro"
        assert FAIXAS[-1].veredito == "Call informativa — não avançou o negócio"
