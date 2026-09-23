"""
Quando a avaliação pela régua roda sozinha.

Uma regra só para os dois fluxos: chegou transcrição + tipo avaliado. No CRM a
transcrição chega sozinha; no Teams, com o clique em "Analisar Reunião".
"""
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.models.card_task import CardTask
from app.services.avaliacao_reuniao.automatica import avaliar_se_for_o_caso

RESULTADO = {
    "itens": [
        {"criterio_id": "A1", "bloco": "Abertura", "peso": 100, "nota": 2,
         "evidencia": "Sou o Miguel", "porque": "apresentou-se"},
    ],
    "score": 100.0,
    "veredito": "Call padrão ouro",
    "cobertura": 1.0,
    "medias_por_bloco": {"Abertura": 100},
    "desfecho": "Proposta pedida",
    "ponto_forte": "Mapeou o processo",
    "foco_desenvolvimento": "Conectar dor e risco",
    "proxima_acao": "Perguntar quem aprova",
    "modelo": "gpt-4o",
    "latencia_ms": 1000,
    "tokens_entrada": 100,
    "tokens_saida": 10,
}


@pytest.fixture(autouse=True)
def chave_presente(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.OPENAI_API_KEY", "chave-de-teste")


def _reuniao(db, card, responsavel, tipo=None) -> CardTask:
    task = CardTask(
        card_id=card.id,
        title="Reunião",
        task_type="meeting",
        assigned_to_id=responsavel.id,
        meeting_kind=tipo,
        transcript_raw="WEBVTT\n\nconversa",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


class TestQuandoAvalia:

    def test_apresentacao_phoebus_e_avaliada(
        self, db: Session, test_card, test_salesperson_user
    ):
        task = _reuniao(db, test_card, test_salesperson_user, "apresentacao_phoebus")

        with patch("app.services.avaliacao_reuniao.servico.avaliar",
                   MagicMock(return_value=RESULTADO)):
            avaliou = avaliar_se_for_o_caso(db, task, task.transcript_raw)

        assert avaliou is True
        db.refresh(task)
        assert task.evaluation.score == 100.0
        assert task.evaluation.avaliado_por_id is None

    def test_duvidas_nao_e_avaliada(self, db: Session, test_card, test_salesperson_user):
        """A régua é de apresentação; tira-dúvidas receberia nota do que não fez."""
        task = _reuniao(db, test_card, test_salesperson_user, "duvidas_phoebus")
        avaliar = MagicMock(return_value=RESULTADO)

        with patch("app.services.avaliacao_reuniao.servico.avaliar", avaliar):
            avaliou = avaliar_se_for_o_caso(db, task, task.transcript_raw)

        assert avaliou is False
        avaliar.assert_not_called()

    def test_reuniao_sem_tipo_nao_e_avaliada(
        self, db: Session, test_card, test_salesperson_user
    ):
        """Todas as reuniões criadas antes desta mudança estão assim."""
        task = _reuniao(db, test_card, test_salesperson_user, None)
        avaliar = MagicMock(return_value=RESULTADO)

        with patch("app.services.avaliacao_reuniao.servico.avaliar", avaliar):
            assert avaliar_se_for_o_caso(db, task, task.transcript_raw) is False

        avaliar.assert_not_called()

    def test_sem_transcricao_nao_avalia(self, db: Session, test_card, test_salesperson_user):
        task = _reuniao(db, test_card, test_salesperson_user, "apresentacao_phoebus")
        avaliar = MagicMock(return_value=RESULTADO)

        with patch("app.services.avaliacao_reuniao.servico.avaliar", avaliar):
            assert avaliar_se_for_o_caso(db, task, "   ") is False

        avaliar.assert_not_called()

    def test_nao_passa_por_cima_de_avaliacao_existente(
        self, db: Session, test_card, test_salesperson_user
    ):
        from app.models.meeting_evaluation import MeetingEvaluation

        task = _reuniao(db, test_card, test_salesperson_user, "apresentacao_phoebus")
        db.add(MeetingEvaluation(
            card_task_id=task.id, versao_criterios="2026-09", score=40.0,
        ))
        db.commit()
        avaliar = MagicMock(return_value=RESULTADO)

        with patch("app.services.avaliacao_reuniao.servico.avaliar", avaliar):
            assert avaliar_se_for_o_caso(db, task, task.transcript_raw) is False

        avaliar.assert_not_called()

    def test_sem_chave_da_ia_nem_tenta(
        self, db: Session, test_card, test_salesperson_user, monkeypatch
    ):
        monkeypatch.setattr("app.core.config.settings.OPENAI_API_KEY", "")
        task = _reuniao(db, test_card, test_salesperson_user, "apresentacao_phoebus")
        avaliar = MagicMock(return_value=RESULTADO)

        with patch("app.services.avaliacao_reuniao.servico.avaliar", avaliar):
            assert avaliar_se_for_o_caso(db, task, task.transcript_raw) is False

        avaliar.assert_not_called()

    def test_falha_da_ia_nao_levanta(self, db: Session, test_card, test_salesperson_user):
        """Quem chama está no meio de um processamento que já deu certo."""
        task = _reuniao(db, test_card, test_salesperson_user, "apresentacao_phoebus")

        with patch("app.services.avaliacao_reuniao.servico.avaliar",
                   MagicMock(side_effect=ValueError("modelo fora do ar"))):
            assert avaliar_se_for_o_caso(db, task, task.transcript_raw) is False
