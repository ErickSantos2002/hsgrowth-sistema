"""
Leitura do arquivo de transcrição (VTT).

O Teams e o Daily geram formatos diferentes, e os dois precisam funcionar: o
CRM continua usando Teams e passa a usar o Daily.

O formato do Daily traz identificadores de trecho (`transcript:357`) e marca o
falante como `<v Nome:</v>texto`. Sem tratar isso, o texto entregue à IA fica
com números e marcação no meio das frases — e a análise sai ruim sem que
ninguém entenda por quê.
"""
from app.services.transcript_analysis_service import transcript_analysis_service


class TestFormatoTeams:
    """O que já funcionava precisa continuar funcionando."""

    def test_extrai_falante_e_fala(self):
        vtt = (
            "WEBVTT\n\n"
            "00:00:01.000 --> 00:00:04.000\n"
            "<v João Silva>Olá, tudo bem?\n\n"
            "00:00:05.000 --> 00:00:08.000\n"
            "<v Maria Souza>Tudo ótimo, obrigada.\n"
        )

        texto = transcript_analysis_service._parse_vtt(vtt)

        assert "João Silva: Olá, tudo bem?" in texto
        assert "Maria Souza: Tudo ótimo, obrigada." in texto

    def test_descarta_cabecalho_e_tempos(self):
        vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:04.000\n<v Ana>Bom dia\n"

        texto = transcript_analysis_service._parse_vtt(vtt)

        assert "WEBVTT" not in texto
        assert "-->" not in texto
        assert "00:00:01" not in texto


class TestFormatoDaily:
    """
    O formato do Daily quebra o parser antigo de duas formas: pelos
    identificadores de trecho e pela tag de voz fechada.
    """

    def test_extrai_falante_da_tag_fechada(self):
        vtt = (
            "WEBVTT\n\n"
            "transcript:357\n"
            "00:00:01.000 --> 00:00:04.000\n"
            "<v Maria:</v>Bom dia, tudo bem?\n"
        )

        texto = transcript_analysis_service._parse_vtt(vtt)

        assert "Maria: Bom dia, tudo bem?" in texto
        assert "</v>" not in texto
        assert "<v" not in texto

    def test_descarta_identificador_de_trecho(self):
        """`transcript:357` viraria uma linha de fala no parser antigo."""
        vtt = (
            "WEBVTT\n\n"
            "transcript:357\n"
            "00:00:01.000 --> 00:00:04.000\n"
            "<v Ana:</v>Primeira fala\n\n"
            "transcript:358\n"
            "00:00:05.000 --> 00:00:07.000\n"
            "<v Ana:</v>Segunda fala\n"
        )

        texto = transcript_analysis_service._parse_vtt(vtt)

        assert "transcript:357" not in texto
        assert "transcript:358" not in texto
        assert "357" not in texto

    def test_agrupa_falas_seguidas_da_mesma_pessoa(self):
        """
        O Daily quebra a fala em vários trechos curtos. Repetir o nome a cada
        linha polui a leitura e gasta contexto da IA à toa.
        """
        vtt = (
            "WEBVTT\n\n"
            "transcript:1\n"
            "00:00:01.000 --> 00:00:03.000\n"
            "<v Carlos:</v>Então sobre o preço\n\n"
            "transcript:2\n"
            "00:00:03.000 --> 00:00:05.000\n"
            "<v Carlos:</v>eu precisaria de um desconto\n\n"
            "transcript:3\n"
            "00:00:06.000 --> 00:00:08.000\n"
            "<v Vendedor:</v>Entendo, vamos ver\n"
        )

        texto = transcript_analysis_service._parse_vtt(vtt)
        linhas = [l for l in texto.split("\n") if l.strip()]

        assert len(linhas) == 2
        assert "Carlos: Então sobre o preço eu precisaria de um desconto" in texto
        assert "Vendedor: Entendo, vamos ver" in texto

    def test_conversa_completa_sai_limpa(self):
        """Nenhum resto de marcação deve sobrar no texto que vai para a IA."""
        vtt = (
            "WEBVTT\n\n"
            "NOTE Esta transcricao foi gerada automaticamente\n\n"
            "transcript:100\n"
            "00:01:10.500 --> 00:01:14.200\n"
            "<v Cliente Silva:</v>Qual o prazo de entrega?\n\n"
            "transcript:101\n"
            "00:01:15.000 --> 00:01:19.000\n"
            "<v Vendedor HS:</v>Em torno de trinta dias.\n"
        )

        texto = transcript_analysis_service._parse_vtt(vtt)

        for lixo in ("WEBVTT", "NOTE", "-->", "transcript:", "<v", "</v>", "00:01"):
            assert lixo not in texto

        assert "Cliente Silva: Qual o prazo de entrega?" in texto
        assert "Vendedor HS: Em torno de trinta dias." in texto


class TestCasosDeBorda:

    def test_transcricao_vazia_nao_quebra(self):
        assert transcript_analysis_service._parse_vtt("WEBVTT\n\n") == ""

    def test_linha_sem_falante_e_mantida(self):
        """Fala sem identificação ainda é conteúdo da conversa."""
        vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nUma fala sem identificação\n"

        assert "Uma fala sem identificação" in transcript_analysis_service._parse_vtt(vtt)

    def test_texto_longo_e_truncado(self):
        """Transcrição gigante não pode estourar o contexto do modelo."""
        falas = "".join(
            f"00:00:0{i%10}.000 --> 00:00:0{(i+1)%10}.000\n<v Ana>Fala numero {i} " + "x" * 200 + "\n\n"
            for i in range(200)
        )

        texto = transcript_analysis_service._parse_vtt("WEBVTT\n\n" + falas)

        assert len(texto) <= 12100
        assert "truncada" in texto


class TestFormatoRealDoDaily:
    """
    O arquivo que o Daily entregou na homologação de 14/09 vem como
    `<v>Nome:</v>texto` — sem espaço depois do `<v`. O reconhecimento só
    cobria a variante com espaço, então o nome de quem falou se perdia e a
    conversa inteira virava uma linha só, que a IA analisaria como monólogo.
    """

    def test_reconhece_v_fechado_sem_espaco(self):
        vtt = """WEBVTT

transcript:0
00:00:45.588 --> 00:00:47.888
<v>Welton Kellyson:</v>Bom dia, tudo certo?

transcript:1
00:01:28.330 --> 00:01:31.720
<v>Erick:</v>Tudo, e com voce?
"""

        esperado = """Welton Kellyson: Bom dia, tudo certo?
Erick: Tudo, e com voce?"""

        assert transcript_analysis_service._parse_vtt(vtt) == esperado

    def test_junta_falas_seguidas_do_mesmo_interlocutor(self):
        """O Daily quebra a fala em trechos curtos; repetir o nome polui a leitura."""
        vtt = """WEBVTT

transcript:0
00:00:01.000 --> 00:00:02.000
<v>Erick:</v>Entao

transcript:1
00:00:02.500 --> 00:00:04.000
<v>Erick:</v>o contrato vence em outubro.
"""

        assert transcript_analysis_service._parse_vtt(vtt) == (
            "Erick: Entao o contrato vence em outubro."
        )
