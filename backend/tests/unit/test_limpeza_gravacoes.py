"""
Descarte automático das gravações antigas.

Sem isso o bucket cresce para sempre: ~50 GB por mês, que em alguns anos vira
uma conta desnecessária por vídeos que ninguém mais assiste.

A transcrição e a análise NÃO são apagadas — ocupam pouco e são o que tem
valor duradouro no histórico do negócio.
"""
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.card_task import CardTask
from app.services.recording_service import limpar_gravacoes_antigas


def _task(db, test_card, dias_atras: int, titulo="Reunião") -> CardTask:
    t = CardTask(
        card_id=test_card.id,
        title=titulo,
        task_type="meeting",
        meeting_provider="daily",
        recording_status="ready",
        recording_key=f"2025/01/{titulo.lower()}-{dias_atras}.mp4",
        recording_ready_at=datetime.utcnow() - timedelta(days=dias_atras),
        transcript_raw="WEBVTT\n\nconversa",
        transcript_analysis='{"resumo": "algo"}',
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@pytest.fixture(autouse=True)
def sessao_do_teste(db, monkeypatch):
    class _SessaoQueNaoFecha:
        def __init__(self, real):
            self._real = real

        def __getattr__(self, nome):
            return getattr(self._real, nome)

        def close(self):
            pass

    monkeypatch.setattr(
        "app.services.recording_service.SessionLocal", lambda: _SessaoQueNaoFecha(db)
    )


class TestDescarte:

    def test_apaga_gravacao_antiga(self, db, test_card, monkeypatch):
        monkeypatch.setattr(settings, "GRAVACAO_RETENCAO_MESES", 12)
        antiga = _task(db, test_card, dias_atras=400, titulo="Antiga")
        chave = antiga.recording_key  # guardada antes: a limpeza zera o campo

        apagar = MagicMock(return_value=True)
        with patch("app.services.storage_service.storage_service.apagar", apagar):
            limpar_gravacoes_antigas()

        apagar.assert_called_once_with(chave)
        db.refresh(antiga)
        assert antiga.recording_key is None
        assert antiga.recording_status == "expired"

    def test_nao_toca_gravacao_recente(self, db, test_card, monkeypatch):
        monkeypatch.setattr(settings, "GRAVACAO_RETENCAO_MESES", 12)
        recente = _task(db, test_card, dias_atras=30, titulo="Recente")
        chave_original = recente.recording_key

        apagar = MagicMock()
        with patch("app.services.storage_service.storage_service.apagar", apagar):
            limpar_gravacoes_antigas()

        apagar.assert_not_called()
        db.refresh(recente)
        assert recente.recording_key == chave_original
        assert recente.recording_status == "ready"

    def test_preserva_transcricao_e_analise(self, db, test_card, monkeypatch):
        """
        O vídeo vai embora, o conteúdo fica: transcrição e análise ocupam
        pouco e continuam servindo ao histórico do negócio.
        """
        monkeypatch.setattr(settings, "GRAVACAO_RETENCAO_MESES", 12)
        antiga = _task(db, test_card, dias_atras=400, titulo="Antiga")

        with patch("app.services.storage_service.storage_service.apagar", return_value=True):
            limpar_gravacoes_antigas()

        db.refresh(antiga)
        assert antiga.transcript_raw
        assert antiga.transcript_analysis

    def test_falha_em_um_arquivo_nao_para_os_demais(self, db, test_card, monkeypatch):
        monkeypatch.setattr(settings, "GRAVACAO_RETENCAO_MESES", 12)
        primeira = _task(db, test_card, dias_atras=400, titulo="Primeira")
        segunda = _task(db, test_card, dias_atras=500, titulo="Segunda")

        # a primeira falha; a segunda precisa ser processada mesmo assim
        with patch("app.services.storage_service.storage_service.apagar",
                   side_effect=[False, True]):
            limpar_gravacoes_antigas()

        db.refresh(primeira)
        db.refresh(segunda)
        # a que falhou mantém a referência, para tentar de novo depois
        assert primeira.recording_key is not None
        assert segunda.recording_key is None

    def test_ignora_reuniao_sem_gravacao(self, db, test_card, monkeypatch):
        """A maioria das tarefas não tem gravação nenhuma."""
        monkeypatch.setattr(settings, "GRAVACAO_RETENCAO_MESES", 12)
        t = CardTask(card_id=test_card.id, title="Sem gravação", task_type="meeting")
        db.add(t)
        db.commit()

        apagar = MagicMock()
        with patch("app.services.storage_service.storage_service.apagar", apagar):
            limpar_gravacoes_antigas()

        apagar.assert_not_called()

    def test_retencao_configuravel(self, db, test_card, monkeypatch):
        """Mudar o prazo muda o que é considerado antigo."""
        monkeypatch.setattr(settings, "GRAVACAO_RETENCAO_MESES", 1)
        t = _task(db, test_card, dias_atras=60, titulo="Dois meses")

        with patch("app.services.storage_service.storage_service.apagar", return_value=True):
            limpar_gravacoes_antigas()

        db.refresh(t)
        assert t.recording_key is None
