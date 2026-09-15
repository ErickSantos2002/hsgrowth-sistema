"""
Armazenamento das gravações no Cloudflare R2.

O R2 é sempre simulado aqui — nenhum teste sobe ou apaga arquivo de verdade.
"""
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from app.core.config import settings
from app.services.storage_service import StorageService, montar_chave_gravacao


@pytest.fixture
def cliente_falso(monkeypatch):
    """Substitui o cliente do R2 por um dublê que registra as chamadas."""
    monkeypatch.setattr(settings, "R2_ACCOUNT_ID", "conta-teste")
    monkeypatch.setattr(settings, "R2_ACCESS_KEY_ID", "chave-teste")
    monkeypatch.setattr(settings, "R2_SECRET_ACCESS_KEY", "segredo-teste")
    monkeypatch.setattr(settings, "R2_BUCKET", "gravacoes-teste")

    cliente = MagicMock()
    cliente.generate_presigned_url.return_value = "https://r2.exemplo/arquivo?assinatura=xyz"
    return cliente


class TestNomeDoArquivo:
    """
    O arquivo carrega o título da reunião para ser localizável no bucket —
    a sala se chama hsg-{id}, que não diz nada sobre o assunto (seção 15.11).
    """

    def test_usa_data_titulo_e_id(self):
        chave = montar_chave_gravacao(
            titulo="Apresentação de Proposta",
            task_id=36197,
            quando=datetime(2026, 9, 10, 14, 30),
        )

        assert "2026-09-10" in chave
        assert "apresentacao-de-proposta" in chave
        assert "36197" in chave
        assert chave.endswith(".mp4")

    def test_remove_acento_e_caractere_estranho(self):
        chave = montar_chave_gravacao(
            titulo="Reunião: Proposta (R$ 10.000) — João & Cia",
            task_id=1,
            quando=datetime(2026, 9, 10),
        )

        # nada que atrapalhe um caminho de arquivo
        for proibido in (" ", ":", "(", ")", "$", "&", "—", "ã", "õ"):
            assert proibido not in chave

    def test_titulo_vazio_nao_quebra(self):
        chave = montar_chave_gravacao(titulo="", task_id=42, quando=datetime(2026, 9, 10))

        assert "42" in chave
        assert chave.endswith(".mp4")

    def test_titulo_gigante_e_encurtado(self):
        chave = montar_chave_gravacao(
            titulo="palavra " * 80, task_id=7, quando=datetime(2026, 9, 10)
        )

        assert len(chave) < 200

    def test_organiza_por_ano_e_mes(self):
        """Facilita achar e também aplicar a retenção depois."""
        chave = montar_chave_gravacao(titulo="Teste", task_id=1, quando=datetime(2026, 9, 10))

        assert chave.startswith("2026/09/")


class TestUpload:

    def test_envia_para_o_bucket_certo(self, cliente_falso):
        svc = StorageService()
        with patch.object(svc, "_cliente", return_value=cliente_falso):
            svc.upload(b"conteudo-do-video", "2026/09/reuniao-1.mp4", "video/mp4")

        chamada = cliente_falso.put_object.call_args.kwargs
        assert chamada["Bucket"] == "gravacoes-teste"
        assert chamada["Key"] == "2026/09/reuniao-1.mp4"
        assert chamada["ContentType"] == "video/mp4"

    def test_sem_credencial_avisa_claramente(self, monkeypatch):
        """Erro de configuração não pode passar silencioso."""
        monkeypatch.setattr(settings, "R2_ACCESS_KEY_ID", "")

        svc = StorageService()
        with pytest.raises(ValueError, match="R2"):
            svc.upload(b"x", "chave.mp4", "video/mp4")


class TestLinkTemporario:

    def test_gera_link_com_a_validade_pedida(self, cliente_falso):
        """Dentro do teto de 7 dias, vale o prazo pedido (ver TestTetoDoLink)."""
        svc = StorageService()
        with patch.object(svc, "_cliente", return_value=cliente_falso):
            url = svc.gerar_link_temporario("2026/09/reuniao-1.mp4", dias=3)

        assert url.startswith("https://")
        chamada = cliente_falso.generate_presigned_url.call_args
        assert chamada.kwargs["ExpiresIn"] == 3 * 24 * 3600

    def test_validade_padrao_vem_da_configuracao(self, cliente_falso, monkeypatch):
        monkeypatch.setattr(settings, "R2_LINK_EXPIRACAO_DIAS", 7)

        svc = StorageService()
        with patch.object(svc, "_cliente", return_value=cliente_falso):
            svc.gerar_link_temporario("2026/09/reuniao-1.mp4")

        assert cliente_falso.generate_presigned_url.call_args.kwargs["ExpiresIn"] == 7 * 24 * 3600


class TestApagar:

    def test_remove_do_bucket(self, cliente_falso):
        svc = StorageService()
        with patch.object(svc, "_cliente", return_value=cliente_falso):
            svc.apagar("2026/09/reuniao-1.mp4")

        chamada = cliente_falso.delete_object.call_args.kwargs
        assert chamada["Bucket"] == "gravacoes-teste"
        assert chamada["Key"] == "2026/09/reuniao-1.mp4"

    def test_falha_ao_apagar_nao_interrompe(self, cliente_falso):
        """
        Usado pela rotina de descarte: um arquivo problemático não pode
        impedir a limpeza dos demais.
        """
        cliente_falso.delete_object.side_effect = Exception("indisponível")

        svc = StorageService()
        with patch.object(svc, "_cliente", return_value=cliente_falso):
            assert svc.apagar("2026/09/reuniao-1.mp4") is False


class TestEnvioEmPartes:
    """
    Gravação de 1h passa de 500 MB. Segurar isso na memória derruba o serviço
    inteiro, então o arquivo viaja em blocos e é montado no bucket.

    O resultado é um arquivo único — "partes" existem só durante o transporte.
    """

    def test_monta_um_arquivo_unico_no_final(self, cliente_falso):
        cliente_falso.create_multipart_upload.return_value = {"UploadId": "up-1"}
        cliente_falso.upload_part.side_effect = [
            {"ETag": '"parte1"'}, {"ETag": '"parte2"'}, {"ETag": '"parte3"'},
        ]

        def blocos():
            yield b"a" * 10
            yield b"b" * 10
            yield b"c" * 10

        svc = StorageService()
        with patch.object(svc, "_cliente", return_value=cliente_falso), \
             patch("app.services.storage_service.TAMANHO_BLOCO", 10):
            svc.upload_em_partes(blocos(), "2026/09/reuniao-1.mp4", "video/mp4")

        # o "junta tudo" é o que transforma as partes em um arquivo só
        cliente_falso.complete_multipart_upload.assert_called_once()
        partes = cliente_falso.complete_multipart_upload.call_args.kwargs["MultipartUpload"]["Parts"]
        assert [p["PartNumber"] for p in partes] == [1, 2, 3]

    def test_falha_no_meio_nao_deixa_arquivo_pela_metade(self, cliente_falso):
        """Melhor nenhum arquivo do que um vídeo truncado que ninguém consegue ver."""
        cliente_falso.create_multipart_upload.return_value = {"UploadId": "up-1"}
        cliente_falso.upload_part.side_effect = Exception("conexão caiu")

        def blocos():
            yield b"a" * 10

        svc = StorageService()
        with patch.object(svc, "_cliente", return_value=cliente_falso), \
             patch("app.services.storage_service.TAMANHO_BLOCO", 10):
            with pytest.raises(Exception):
                svc.upload_em_partes(blocos(), "2026/09/reuniao-1.mp4", "video/mp4")

        cliente_falso.abort_multipart_upload.assert_called_once()
        cliente_falso.complete_multipart_upload.assert_not_called()

    def test_arquivo_pequeno_vai_de_uma_vez(self, cliente_falso):
        """Não vale abrir envio em partes para um arquivo minúsculo."""
        def blocos():
            yield b"conteudo pequeno"

        svc = StorageService()
        with patch.object(svc, "_cliente", return_value=cliente_falso):
            svc.upload_em_partes(blocos(), "2026/09/reuniao-1.mp4", "video/mp4")

        cliente_falso.put_object.assert_called_once()
        cliente_falso.create_multipart_upload.assert_not_called()

    def test_devolve_o_tamanho_total_enviado(self, cliente_falso):
        def blocos():
            yield b"x" * 100

        svc = StorageService()
        with patch.object(svc, "_cliente", return_value=cliente_falso):
            resultado = svc.upload_em_partes(blocos(), "chave.mp4", "video/mp4")

        assert resultado == 100


class TestTetoDoLink:
    """
    O S3/R2 recusa assinatura acima de 7 dias. Pedir 30 devolvia
    InvalidArgument e o cliente recebia um link que nunca abria — descoberto na
    homologação de 15/09, com o link já enviado.
    """

    def test_corta_no_maximo_permitido(self, monkeypatch):
        from unittest.mock import MagicMock

        from app.services.storage_service import storage_service

        cliente = MagicMock()
        monkeypatch.setattr(
            "app.services.storage_service.StorageService._cliente",
            lambda self: cliente,
        )

        storage_service.gerar_link_temporario("2026/09/reuniao.mp4", dias=30)

        assert cliente.generate_presigned_url.call_args.kwargs["ExpiresIn"] == 7 * 24 * 3600

    def test_prazo_menor_e_respeitado(self, monkeypatch):
        from unittest.mock import MagicMock

        from app.services.storage_service import storage_service

        cliente = MagicMock()
        monkeypatch.setattr(
            "app.services.storage_service.StorageService._cliente",
            lambda self: cliente,
        )

        storage_service.gerar_link_temporario("2026/09/reuniao.mp4", dias=1)

        assert cliente.generate_presigned_url.call_args.kwargs["ExpiresIn"] == 24 * 3600
