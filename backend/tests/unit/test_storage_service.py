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
        svc = StorageService()
        with patch.object(svc, "_cliente", return_value=cliente_falso):
            url = svc.gerar_link_temporario("2026/09/reuniao-1.mp4", dias=30)

        assert url.startswith("https://")
        chamada = cliente_falso.generate_presigned_url.call_args
        assert chamada.kwargs["ExpiresIn"] == 30 * 24 * 3600

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
