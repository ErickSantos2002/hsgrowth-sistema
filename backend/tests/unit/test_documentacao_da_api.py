"""
A documentação da API (/docs, /redoc, /openapi.json) só existe fora de
produção.

Ela lista os 227 endpoints do CRM com parâmetros e formatos. Não vaza dado —
tudo continua exigindo login —, mas entrega de graça o mapa do sistema a quem
quiser sondar. Em 16/09 estava aberta na internet.

A regra falha para o lado seguro: ambiente que não se identifique como
desenvolvimento ou teste é tratado como produção, inclusive um servidor que
perdeu a variável de ambiente.
"""
import pytest

from app.core.config import settings
from app.main import documentacao_liberada


class TestQuandoADocumentacaoExiste:

    def test_desenvolvimento_libera(self, monkeypatch):
        monkeypatch.setattr(settings, "ENVIRONMENT", "development")
        assert documentacao_liberada() is True

    def test_testes_liberam(self, monkeypatch):
        """A suíte roda como 'testing' e usa o app inteiro."""
        monkeypatch.setattr(settings, "ENVIRONMENT", "testing")
        assert documentacao_liberada() is True

    def test_producao_fecha(self, monkeypatch):
        monkeypatch.setattr(settings, "ENVIRONMENT", "production")
        assert documentacao_liberada() is False

    @pytest.mark.parametrize("ambiente", ["", "prod", "staging", "qualquer-coisa"])
    def test_ambiente_desconhecido_e_tratado_como_producao(self, monkeypatch, ambiente):
        """Variável ausente ou com valor inesperado não pode abrir a documentação."""
        monkeypatch.setattr(settings, "ENVIRONMENT", ambiente)
        assert documentacao_liberada() is False


class TestPadraoDaConfiguracao:

    def test_padrao_e_producao(self):
        """
        Sem a variável no servidor, o sistema assume produção.

        Na limpeza da VPS em 11/09 as variáveis se perderam; com o padrão
        antigo ("development"), a documentação teria ficado aberta sozinha.
        """
        from app.core.config import Settings

        assert Settings.model_fields["ENVIRONMENT"].default == "production"
