"""
Análise da reunião pela IA.

Os 6 campos originais continuam, e entram 8 novos (seção 15.6 do design):
compromissos, produtos citados, concorrentes, orçamento, nota, decisor,
temperatura e o que o vendedor deixou passar.

A OpenAI é sempre simulada — nenhum teste gasta chamada real.
"""
import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.transcript_analysis_service import (
    ANALYSIS_PROMPT,
    CAMPOS_PADRAO,
    transcript_analysis_service,
)

TRANSCRICAO = (
    "WEBVTT\n\n"
    "00:00:01.000 --> 00:00:05.000\n"
    "<v Carlos>Precisamos de bafômetros para a frota toda.\n"
)


def _resposta(conteudo: dict):
    """Monta uma resposta da OpenAI no formato que o SDK devolve."""
    escolha = MagicMock()
    escolha.message.content = json.dumps(conteudo, ensure_ascii=False)
    resposta = MagicMock()
    resposta.choices = [escolha]
    return resposta


@pytest.fixture(autouse=True)
def chave_configurada(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "chave-de-teste")


class TestCamposNovos:

    def test_devolve_os_quatorze_campos(self):
        completo = {
            "resumo": "Cliente quer equipar a frota.",
            "sentimento": "positivo",
            "interesse_cliente": "alto",
            "objecoes": ["preço"],
            "proximos_passos": ["enviar proposta"],
            "pontos_de_atencao": ["prazo apertado"],
            "compromissos": [{"quem": "Vendedor", "o_que": "enviar proposta", "quando": "sexta"}],
            "produtos_citados": ["Bafômetro"],
            "concorrentes": ["Concorrente X"],
            "orcamento": "Faixa de R$ 20 a 30 mil",
            "nota": 8,
            "decisor": "Carlos, diretor de operações, estava presente",
            "temperatura": "quente",
            "oportunidades_perdidas": ["não perguntou o prazo de decisão"],
        }

        with patch("openai.OpenAI") as _, \
             patch.object(transcript_analysis_service, "_chamar_openai", return_value=completo):
            resultado = transcript_analysis_service.analyze(TRANSCRICAO)

        for campo in CAMPOS_PADRAO:
            assert campo in resultado

    def test_resposta_incompleta_ganha_valores_padrao(self):
        """
        A IA às vezes omite campos. O card não pode quebrar por isso — melhor
        um campo vazio do que uma tela de erro.
        """
        parcial = {"resumo": "Conversa rápida.", "sentimento": "neutro"}

        with patch.object(transcript_analysis_service, "_chamar_openai", return_value=parcial):
            resultado = transcript_analysis_service.analyze(TRANSCRICAO)

        assert resultado["resumo"] == "Conversa rápida."
        assert resultado["compromissos"] == []
        assert resultado["produtos_citados"] == []
        assert resultado["concorrentes"] == []
        assert resultado["oportunidades_perdidas"] == []
        assert resultado["nota"] is None
        assert resultado["orcamento"] == ""

    def test_json_invalido_vira_erro_claro(self):
        escolha = MagicMock()
        escolha.message.content = "isso não é json"
        resposta = MagicMock()
        resposta.choices = [escolha]

        cliente = MagicMock()
        cliente.chat.completions.create.return_value = resposta

        with patch("app.services.transcript_analysis_service.OpenAI", return_value=cliente):
            with pytest.raises(ValueError, match="JSON"):
                transcript_analysis_service.analyze(TRANSCRICAO)

    def test_sem_chave_configurada_avisa(self, monkeypatch):
        from app.core.config import settings
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "")

        with pytest.raises(ValueError, match="OPENAI_API_KEY"):
            transcript_analysis_service.analyze(TRANSCRICAO)

    def test_transcricao_vazia_avisa(self):
        with pytest.raises(ValueError, match="[Vv]azia"):
            transcript_analysis_service.analyze("WEBVTT\n\n")


class TestPrompt:
    """
    O prompt é o que define a qualidade da análise. Estes testes travam as
    instruções que não podem se perder numa edição futura.
    """

    def test_pede_todos_os_campos(self):
        for campo in CAMPOS_PADRAO:
            assert campo in ANALYSIS_PROMPT

    def test_proibe_inventar_informacao(self):
        """
        Alucinação em compromisso, orçamento ou concorrente vira decisão
        errada — é o risco mais caro desta funcionalidade.
        """
        texto = ANALYSIS_PROMPT.lower()
        assert "invent" in texto or "não afirme" in texto
        assert "transcrição" in texto

    def test_orienta_tom_construtivo_nas_oportunidades_perdidas(self):
        """
        Esse campo é visível para o próprio vendedor. Precisa apontar o que
        fazer diferente, não julgar a pessoa.
        """
        assert "oportunidades_perdidas" in ANALYSIS_PROMPT
        texto = ANALYSIS_PROMPT.lower()
        assert "constru" in texto or "melhorar" in texto or "julgar" in texto
