"""
Lembrete de reunião por e-mail aos convidados: às 8h do dia (reuniões a partir
das 9h) e 1 hora antes, saindo da conta de quem enviou o convite.

O envio pelo Outlook é simulado — nada sai para a internet.
"""
import itertools
from datetime import datetime, timedelta

import pytest

from app.core.config import settings
from app.models.activity import Activity
from app.models.card_task import CardTask, TaskType
from app.models.person import Person
from app.services.microsoft_graph_service import microsoft_graph_service
from app.services.notificacoes.lembrete_reuniao import enviar_lembretes_de_reuniao

# Horários em UTC (Brasília = UTC−3)
DIA_8H05 = datetime(2026, 10, 27, 11, 5)     # 08:05 em Brasília
REUNIAO_14H = datetime(2026, 10, 27, 17, 0)  # 14:00 em Brasília


@pytest.fixture
def enviados(monkeypatch):
    """Troca o envio pelo Outlook por uma lista em memória."""
    chamadas = []

    def falso(user, db, to_addresses, subject, body, attachments=None):
        chamadas.append({"de": user.email, "para": list(to_addresses), "assunto": subject, "corpo": body})
        return {"success": True}

    monkeypatch.setattr(microsoft_graph_service, "send_email", falso)
    monkeypatch.setattr(settings, "DAILY_DEV_MODE", False)
    return chamadas


_tokens = itertools.count(123)


def _reuniao(db, card, organizador, quando=REUNIAO_14H, **kw):
    dados = dict(
        card_id=card.id, title="Apresentação Phoebus - ACME", task_type=TaskType.MEETING,
        assigned_to_id=organizador.id, created_by_id=organizador.id,
        invite_organizer_id=organizador.id, due_date=quando, duration_minutes=45,
        meeting_provider="daily", public_access_token=f"tok-{next(_tokens)}", teams_event_id="evt-1",
        invited_emails=["cliente@acme.com", "colega@healthsafetytech.com"],
        created_at=quando - timedelta(days=2),
    )
    dados.update(kw)
    t = CardTask(**dados)
    db.add(t)
    db.commit()
    return t


def _historico(db, card):
    return db.query(Activity).filter(
        Activity.card_id == card.id, Activity.activity_type == "meeting_reminder"
    ).all()


# ─── Lembrete do dia (8h) ─────────────────────────────────────────────────────

def test_lembrete_do_dia_as_8h_para_cada_convidado(db, test_card, test_salesperson_user, enviados):
    t = _reuniao(db, test_card, test_salesperson_user)

    assert enviar_lembretes_de_reuniao(db, DIA_8H05) == 1

    [envio] = enviados
    assert envio["de"] == test_salesperson_user.email
    assert envio["para"] == ["cliente@acme.com", "colega@healthsafetytech.com"]
    assert envio["assunto"] == "Lembrete: Apresentação Phoebus - ACME — hoje às 14:00"
    assert f"/entrar/{t.public_access_token}" in envio["corpo"]
    assert "27/10/2026 às 14:00" in envio["corpo"]


def test_reuniao_antes_das_9h_nao_tem_lembrete_do_dia(db, test_card, test_salesperson_user, enviados):
    _reuniao(db, test_card, test_salesperson_user, quando=datetime(2026, 10, 27, 11, 30))  # 08:30

    enviar_lembretes_de_reuniao(db, DIA_8H05)

    assert enviados == []


def test_fora_da_janela_das_8h_nao_envia(db, test_card, test_salesperson_user, enviados):
    _reuniao(db, test_card, test_salesperson_user)

    enviar_lembretes_de_reuniao(db, datetime(2026, 10, 27, 10, 50))  # 07:50
    enviar_lembretes_de_reuniao(db, datetime(2026, 10, 27, 11, 40))  # 08:40

    assert enviados == []


def test_reuniao_de_amanha_nao_recebe_o_lembrete_de_hoje(db, test_card, test_salesperson_user, enviados):
    _reuniao(db, test_card, test_salesperson_user, quando=REUNIAO_14H + timedelta(days=1))

    enviar_lembretes_de_reuniao(db, DIA_8H05)

    assert enviados == []


# ─── Lembrete de 1 hora ───────────────────────────────────────────────────────

def test_lembrete_de_1_hora(db, test_card, test_salesperson_user, enviados):
    _reuniao(db, test_card, test_salesperson_user)

    enviar_lembretes_de_reuniao(db, REUNIAO_14H - timedelta(minutes=60))

    [envio] = enviados
    assert envio["assunto"] == "Começa em 1 hora: Apresentação Phoebus - ACME — às 14:00"


def test_fora_da_janela_de_1_hora_nao_envia(db, test_card, test_salesperson_user, enviados):
    _reuniao(db, test_card, test_salesperson_user)

    enviar_lembretes_de_reuniao(db, REUNIAO_14H - timedelta(minutes=70))
    enviar_lembretes_de_reuniao(db, REUNIAO_14H - timedelta(minutes=50))

    assert enviados == []


def test_criada_em_cima_da_hora_nao_tem_lembrete_de_1_hora(db, test_card, test_salesperson_user, enviados):
    """Criada 58 min antes do início: o convite acabou de chegar."""
    agora = REUNIAO_14H - timedelta(minutes=57)
    _reuniao(db, test_card, test_salesperson_user, created_at=REUNIAO_14H - timedelta(minutes=58))

    enviar_lembretes_de_reuniao(db, agora)

    assert enviados == []


def test_criada_80_min_antes_recebe_o_lembrete_de_1_hora(db, test_card, test_salesperson_user, enviados):
    agora = REUNIAO_14H - timedelta(minutes=60)
    _reuniao(db, test_card, test_salesperson_user, created_at=REUNIAO_14H - timedelta(minutes=80))

    enviar_lembretes_de_reuniao(db, agora)

    assert len(enviados) == 1


# ─── Uma vez só, remarcação e reuniões que não recebem ────────────────────────

def test_rodando_a_cada_minuto_envia_uma_vez(db, test_card, test_salesperson_user, enviados):
    _reuniao(db, test_card, test_salesperson_user)

    for minuto in range(25):
        enviar_lembretes_de_reuniao(db, DIA_8H05 + timedelta(minutes=minuto))
    for minuto in range(-5, 6):
        enviar_lembretes_de_reuniao(db, REUNIAO_14H - timedelta(minutes=60 + minuto))

    assert [e["assunto"].split(":")[0] for e in enviados] == ["Lembrete", "Começa em 1 hora"]


def test_remarcada_envia_de_novo(db, test_card, test_salesperson_user, enviados):
    t = _reuniao(db, test_card, test_salesperson_user)
    enviar_lembretes_de_reuniao(db, DIA_8H05)

    t.due_date = REUNIAO_14H + timedelta(days=1)  # remarcou para amanhã
    db.commit()
    enviar_lembretes_de_reuniao(db, DIA_8H05 + timedelta(days=1))

    assert len(enviados) == 2


def test_cancelada_concluida_ou_sem_convite_nao_envia(db, test_card, test_salesperson_user, enviados):
    _reuniao(db, test_card, test_salesperson_user, is_cancelled=True)
    _reuniao(db, test_card, test_salesperson_user, is_completed=True)
    _reuniao(db, test_card, test_salesperson_user, teams_event_id=None)
    _reuniao(db, test_card, test_salesperson_user, task_type=TaskType.CALL)

    assert enviar_lembretes_de_reuniao(db, DIA_8H05) == 0
    assert enviados == []


# ─── Convidados, link e remetente ─────────────────────────────────────────────

def test_sem_lista_usa_vendedor_e_contato_e_nunca_o_organizador(
    db, test_card, test_salesperson_user, test_manager_user, enviados
):
    pessoa = Person(name="Fulano", email="fulano@acme.com", email_commercial="compras@acme.com")
    db.add(pessoa); db.commit()
    test_card.person_id = pessoa.id
    test_card.assigned_to_id = test_salesperson_user.id
    db.commit()
    # Gerente organizou; o vendedor do card entra como convidado
    _reuniao(db, test_card, test_manager_user, invited_emails=None)

    enviar_lembretes_de_reuniao(db, DIA_8H05)

    [envio] = enviados
    assert envio["de"] == test_manager_user.email
    assert envio["para"] == [test_salesperson_user.email, "fulano@acme.com", "compras@acme.com"]


def test_organizador_fora_da_lista_de_convidados(db, test_card, test_salesperson_user, enviados):
    _reuniao(db, test_card, test_salesperson_user,
             invited_emails=["cliente@acme.com", test_salesperson_user.email.upper()])

    enviar_lembretes_de_reuniao(db, DIA_8H05)

    assert enviados[0]["para"] == ["cliente@acme.com"]


def test_reuniao_antiga_sem_organizador_usa_quem_criou(db, test_card, test_salesperson_user, enviados):
    _reuniao(db, test_card, test_salesperson_user, invite_organizer_id=None)

    enviar_lembretes_de_reuniao(db, DIA_8H05)

    assert enviados[0]["de"] == test_salesperson_user.email


def test_teams_usa_o_link_do_teams_e_escapa_o_titulo(db, test_card, test_salesperson_user, enviados):
    _reuniao(db, test_card, test_salesperson_user, meeting_provider=None, public_access_token=None,
             teams_join_url="https://teams.microsoft.com/l/meetup-join/abc",
             title='Reunião <script>x</script>')

    enviar_lembretes_de_reuniao(db, DIA_8H05)

    corpo = enviados[0]["corpo"]
    assert "https://teams.microsoft.com/l/meetup-join/abc" in corpo
    assert "<script>" not in corpo and "&lt;script&gt;" in corpo


def test_trava_de_homologacao_tira_os_externos(db, test_card, test_salesperson_user, enviados, monkeypatch):
    monkeypatch.setattr(settings, "DAILY_DEV_MODE", True)
    monkeypatch.setattr(settings, "DAILY_INTERNAL_EMAIL_DOMAIN", "healthsafetytech.com")
    _reuniao(db, test_card, test_salesperson_user)

    enviar_lembretes_de_reuniao(db, DIA_8H05)

    assert enviados[0]["para"] == ["colega@healthsafetytech.com"]


# ─── Histórico e falhas ───────────────────────────────────────────────────────

def test_historico_registra_o_envio(db, test_card, test_salesperson_user, enviados):
    _reuniao(db, test_card, test_salesperson_user)

    enviar_lembretes_de_reuniao(db, DIA_8H05)

    [registro] = _historico(db, test_card)
    assert "hoje às 14:00" in registro.description
    assert "cliente@acme.com" in registro.description


def test_falha_no_outlook_registra_e_nao_repete(db, test_card, test_salesperson_user, monkeypatch):
    monkeypatch.setattr(settings, "DAILY_DEV_MODE", False)
    tentativas = []

    def quebra(*a, **k):
        tentativas.append(1)
        raise ValueError("Conta Microsoft não conectada")

    monkeypatch.setattr(microsoft_graph_service, "send_email", quebra)
    _reuniao(db, test_card, test_salesperson_user)

    for minuto in range(5):
        enviar_lembretes_de_reuniao(db, DIA_8H05 + timedelta(minutes=minuto))

    assert len(tentativas) == 1
    [registro] = _historico(db, test_card)
    assert "não enviado" in registro.description
    assert "Conta Microsoft não conectada" in registro.description
