"""
O estado de cada reunião na página de Reuniões.

Até 20/10/2026, "gravada" valia para vídeo OU transcrição. Como a transcrição
começa sozinha quando alguém entra na sala, reunião sem vídeo nenhum aparecia
como gravada: a U&m Mineração (cliente nunca entrou, transcrição vazia) e a
Monsanto (3 minutos, 12 palavras).
"""
from datetime import datetime, timedelta

from app.api.v1.endpoints.reunioes import _selo
from app.models.card_task import CardTask
from tests.unit.conversas import APRESENTACAO, MONOLOGO

INICIO = datetime(2026, 10, 9, 17, 55)


def _reuniao(**campos) -> CardTask:
    base = dict(
        title="Apresentação Phoebus",
        task_type="meeting",
        meeting_provider="daily",
        is_noshow=False,
        meeting_started_at=INICIO,
        meeting_ended_at=INICIO + timedelta(minutes=30),
        contact_joined_at=INICIO + timedelta(minutes=1),
        recording_status=None,
        transcript_raw=None,
    )
    base.update(campos)
    return CardTask(**base)


def test_no_show():
    assert _selo(_reuniao(is_noshow=True), None) == ("no-show", None)


def test_avaliada():
    assert _selo(_reuniao(transcript_raw=APRESENTACAO), object()) == ("avaliada", None)


def test_cliente_nao_entrou():
    selo, motivo = _selo(_reuniao(contact_joined_at=None, transcript_raw="WEBVTT\n\n"), None)

    assert selo == "cliente não entrou"
    assert "no-show" in motivo


def test_conversa_curta_traz_o_motivo_da_regua():
    selo, motivo = _selo(_reuniao(transcript_raw=MONOLOGO), None)

    assert selo == "conversa curta"
    assert "uma pessoa" in motivo


def test_gravada_e_so_com_video():
    assert _selo(_reuniao(recording_status="ready"), None) == ("gravada", None)


def test_conversa_de_verdade_sem_video_e_transcrita():
    """Ex.: tipo de reunião que a régua não avalia."""
    assert _selo(_reuniao(transcript_raw=APRESENTACAO), None) == ("transcrita", None)


def test_video_com_conversa_curta_mostra_a_conversa_curta():
    """O motivo explica por que não foi avaliada, mesmo havendo vídeo."""
    selo, _ = _selo(_reuniao(recording_status="ready", transcript_raw=MONOLOGO), None)

    assert selo == "conversa curta"


def test_sem_gravacao():
    assert _selo(_reuniao(), None) == ("sem gravação", None)


def test_reuniao_em_andamento_nao_vira_cliente_nao_entrou():
    assert _selo(_reuniao(contact_joined_at=None, meeting_ended_at=None), None)[0] == "sem gravação"


def test_reuniao_do_teams_nao_vira_cliente_nao_entrou():
    """No Teams o CRM não sabe quem entrou."""
    selo, _ = _selo(_reuniao(meeting_provider=None, contact_joined_at=None), None)

    assert selo == "sem gravação"
