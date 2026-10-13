"""
Se a transcrição tem conversa suficiente para a régua.

As reuniões do CRM de 30/09 a 09/10 mostraram dois grupos sem meio-termo:
apresentações com mais de mil palavras e duas ou três vozes, e "reuniões"
com até 282 palavras de uma voz só. Só o primeiro grupo diz alguma coisa
sobre como o vendedor apresentou.
"""
from app.services.avaliacao_reuniao.conversa import (
    PALAVRAS_MINIMAS,
    motivo_para_nao_avaliar,
)
from tests.unit.conversas import APRESENTACAO, CONVERSA_CURTA, MONOLOGO


class TestQuandoDaParaAvaliar:

    def test_apresentacao_passa(self):
        assert motivo_para_nao_avaliar(APRESENTACAO) is None

    def test_transcricao_vazia_nao_passa(self):
        """Em 08/10 uma transcrição vazia foi avaliada e recebeu nota 0."""
        assert motivo_para_nao_avaliar("WEBVTT\n\n") is not None
        assert motivo_para_nao_avaliar("") is not None
        assert motivo_para_nao_avaliar(None) is not None

    def test_conversa_curta_nao_passa(self):
        motivo = motivo_para_nao_avaliar(CONVERSA_CURTA)

        assert motivo is not None
        assert str(PALAVRAS_MINIMAS) in motivo

    def test_uma_voz_so_nao_passa(self):
        """O vendedor falando sozinho: o cliente não entrou ou não foi ouvido."""
        motivo = motivo_para_nao_avaliar(MONOLOGO)

        assert motivo is not None
        assert "uma pessoa" in motivo

    def test_sem_nome_de_quem_falou_vale_so_o_tamanho(self):
        """
        No Teams o locatário pode não liberar quem falou. Sem nomes não dá
        para contar vozes — exigir duas barraria toda reunião desse jeito.
        """
        frase = "nosso processo hoje é todo manual e a auditoria cobra prazo "
        vtt = "WEBVTT\n\n" + "\n\n".join(
            f"00:00:{i % 60:02d}.000 --> 00:00:{i % 60:02d}.500\n{frase * 3}"
            for i in range(40)
        )

        assert motivo_para_nao_avaliar(vtt) is None

    def test_formato_do_teams_conta_as_vozes(self):
        frase = "a calibração dos equipamentos vence e ninguém percebe a tempo "
        vtt = "WEBVTT\n\n" + "\n\n".join(
            f"00:00:{i % 60:02d}.000 --> 00:00:{i % 60:02d}.500\n"
            f"<v {'Ana Souza' if i % 2 else 'Miguel Luiz'}>{frase * 3}</v>"
            for i in range(40)
        )

        assert motivo_para_nao_avaliar(vtt) is None
