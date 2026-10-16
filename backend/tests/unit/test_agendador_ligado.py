"""
Quando a API liga o agendador.

O Docker local aponta para o banco de produção. Com o agendador ligado
também ali, cada job rodaria duas vezes no mesmo banco — o aviso de card
novo de Serviço sairia duplicado (15/10/2026). `SCHEDULER_ENABLED=false` no
`.env.local` desliga só o agendador; o tempo real continua.
"""
from app.core.config import settings
from app.main import agendador_ligado


def test_ligado_por_padrao(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "SCHEDULER_ENABLED", True)

    assert agendador_ligado() is True


def test_desligado_pela_configuracao(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "SCHEDULER_ENABLED", False)

    assert agendador_ligado() is False


def test_desligado_nos_testes(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "testing")
    monkeypatch.setattr(settings, "SCHEDULER_ENABLED", True)

    assert agendador_ligado() is False
