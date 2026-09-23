"""
O texto do convite e o que acontece quando a reunião é editada.

O convite é o que o cliente lê: quem escreve a saudação é o vendedor, e os
blocos que não podem faltar — data, duração e link — continuam sendo montados
pelo sistema.

Editar a reunião precisa alcançar o evento no Outlook, que é onde o cliente
enxerga o compromisso. É o Outlook quem avisa os participantes.
"""
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.v1.endpoints.card_tasks import _montar_corpo_convite
from app.models.card_task import CardTask


class _Organizador:
    def __init__(self, name="Welton Kellyson", email_signature=None):
        self.name = name
        self.email_signature = email_signature


@pytest.fixture
def reuniao(db: Session, test_card, test_salesperson_user) -> CardTask:
    task = CardTask(
        card_id=test_card.id,
        title="Apresentação Phoebus - ACME",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        meeting_kind="apresentacao_phoebus",
        due_date=datetime(2026, 10, 1, 17, 0),
        duration_minutes=30,
        teams_event_id="evento-1",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


class TestTextoDoConvite:

    def test_usa_a_mensagem_escrita_pelo_vendedor(self, db, reuniao):
        reuniao.invite_message = "Oi Maria!\nComo combinamos na ligação."
        db.commit()

        corpo = _montar_corpo_convite(reuniao, _Organizador())

        assert "Oi Maria!" in corpo
        assert "Como combinamos na ligação." in corpo
        assert "Sua reunião com a <strong>Health" not in corpo

    def test_sem_mensagem_vale_o_texto_padrao(self, db, reuniao):
        corpo = _montar_corpo_convite(reuniao, _Organizador())

        assert "Olá!" in corpo
        assert "Sua reunião com a <strong>Health &amp; Safety Tech</strong>" in corpo

    def test_blocos_do_sistema_continuam(self, db, reuniao):
        """Data, duração e link não dependem do que o vendedor escreveu."""
        reuniao.invite_message = "Texto curto"
        db.commit()

        corpo = _montar_corpo_convite(reuniao, _Organizador(), public_link="https://crm/entrar/x")

        assert "Quando:" in corpo
        assert "Duração prevista:" in corpo
        assert "https://crm/entrar/x" in corpo

    def test_mensagem_do_vendedor_e_escapada(self, db, reuniao):
        """
        O texto vai para o e-mail do cliente com a credibilidade do domínio da
        empresa — marcação injetada aqui sairia assinada por nós.
        """
        reuniao.invite_message = '<a href="http://golpe">clique aqui</a>'
        db.commit()

        corpo = _montar_corpo_convite(reuniao, _Organizador())

        assert "<a href=\"http://golpe\">" not in corpo
        assert "&lt;a href=" in corpo

    def test_assinatura_do_vendedor_entra_no_rodape(self, db, reuniao):
        assinatura = '<p><strong>Welton</strong><br>Consultor</p>'

        corpo = _montar_corpo_convite(reuniao, _Organizador(email_signature=assinatura))

        assert assinatura in corpo
        assert "Health &amp; Safety Tech</p>" not in corpo.split("Até lá!")[-1]

    def test_sem_assinatura_mantem_o_rodape_de_sempre(self, db, reuniao):
        corpo = _montar_corpo_convite(reuniao, _Organizador(email_signature=None))

        assert "Welton Kellyson" in corpo
        assert "Health &amp; Safety Tech" in corpo


class TestReagendamento:

    def _editar(self, client, headers, task_id, **campos):
        return client.put(f"/api/v1/card-tasks/{task_id}", json=campos, headers=headers)

    def test_mudar_a_data_atualiza_o_evento(self, client: TestClient, salesperson_headers, reuniao):
        atualizar = MagicMock()

        with patch(
            "app.services.microsoft_graph_service.microsoft_graph_service.update_calendar_event",
            atualizar,
        ):
            self._editar(
                client, salesperson_headers, reuniao.id, due_date="2026-10-02T18:00:00"
            )

        assert atualizar.called
        assert atualizar.call_args.kwargs["event_id"] == "evento-1"

    def test_mudar_o_titulo_atualiza_o_evento(
        self, client: TestClient, salesperson_headers, reuniao
    ):
        """
        O título passou a vir do tipo da reunião e muda com mais frequência —
        sem isto o cliente ficaria vendo o assunto antigo.
        """
        atualizar = MagicMock()

        with patch(
            "app.services.microsoft_graph_service.microsoft_graph_service.update_calendar_event",
            atualizar,
        ):
            self._editar(client, salesperson_headers, reuniao.id, meeting_kind="duvidas")

        assert atualizar.called
        assert "Dúvidas" in atualizar.call_args.kwargs["title"]

    def test_editar_so_a_pauta_nao_mexe_no_calendario(
        self, client: TestClient, salesperson_headers, reuniao
    ):
        """Avisar o cliente de uma mudança que ele não veria seria ruído."""
        atualizar = MagicMock()

        with patch(
            "app.services.microsoft_graph_service.microsoft_graph_service.update_calendar_event",
            atualizar,
        ):
            self._editar(client, salesperson_headers, reuniao.id, description="nova pauta")

        atualizar.assert_not_called()

    def test_falha_avisa_em_vez_de_ficar_so_no_log(
        self, client: TestClient, salesperson_headers, reuniao
    ):
        """
        O evento pertence a quem criou a reunião: outra pessoa editando recebe
        recusa do Microsoft, e o cliente fica com os dados antigos.
        """
        with patch(
            "app.services.microsoft_graph_service.microsoft_graph_service.update_calendar_event",
            MagicMock(side_effect=ValueError("acesso negado")),
        ):
            r = self._editar(
                client, salesperson_headers, reuniao.id, due_date="2026-10-02T18:00:00"
            )

        assert r.status_code == 200
        assert r.json()["calendario_desatualizado"] is True

    def test_reuniao_sem_evento_no_calendario_nao_quebra(
        self, client: TestClient, salesperson_headers, reuniao, db
    ):
        reuniao.teams_event_id = None
        db.commit()
        atualizar = MagicMock()

        with patch(
            "app.services.microsoft_graph_service.microsoft_graph_service.update_calendar_event",
            atualizar,
        ):
            r = self._editar(
                client, salesperson_headers, reuniao.id, due_date="2026-10-02T18:00:00"
            )

        assert r.status_code == 200
        atualizar.assert_not_called()
