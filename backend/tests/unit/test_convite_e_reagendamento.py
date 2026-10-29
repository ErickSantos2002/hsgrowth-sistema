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
from app.models.activity import Activity
from app.models.card_task import CardTask
from tests.unit.apoio_notificacoes import usuario


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
        assert "Sua reunião com a <strong>Health &amp; Safety</strong>" in corpo

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
        assert "Health &amp; Safety</p>" not in corpo.split("Até lá!")[-1]

    def test_sem_assinatura_mantem_o_rodape_de_sempre(self, db, reuniao):
        corpo = _montar_corpo_convite(reuniao, _Organizador(email_signature=None))

        assert "Welton Kellyson" in corpo
        assert "Health &amp; Safety" in corpo


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

    def test_outra_pessoa_editando_altera_pela_conta_de_quem_convidou(
        self, client: TestClient, manager_headers, reuniao, db, test_salesperson_user
    ):
        """O evento está no Outlook de quem enviou o convite: é por lá que se altera."""
        reuniao.invite_organizer_id = test_salesperson_user.id
        db.commit()
        atualizar = MagicMock()

        with patch(
            "app.services.microsoft_graph_service.microsoft_graph_service.update_calendar_event",
            atualizar,
        ):
            self._editar(client, manager_headers, reuniao.id, due_date="2026-10-02T18:00:00")

        assert atualizar.call_args.kwargs["user"].id == test_salesperson_user.id


CANCELAR_NO_OUTLOOK = "app.services.microsoft_graph_service.microsoft_graph_service.cancel_calendar_event"


class TestCancelamento:
    """
    Cancelar cancela o evento no Outlook, que avisa os convidados. O evento
    mora no calendário de quem enviou o convite — pela conta de outra pessoa o
    Microsoft responde "not found in the store" (29/10).
    """

    def _cancelar(self, client, headers, task_id):
        return client.post(f"/api/v1/card-tasks/{task_id}/cancel-teams", headers=headers)

    def test_outra_pessoa_cancelando_cancela_pela_conta_de_quem_convidou(
        self, client: TestClient, manager_headers, reuniao, db, test_salesperson_user
    ):
        reuniao.invite_organizer_id = test_salesperson_user.id
        db.commit()
        cancelar = MagicMock(return_value=True)

        with patch(CANCELAR_NO_OUTLOOK, cancelar):
            r = self._cancelar(client, manager_headers, reuniao.id)

        assert r.status_code == 200, r.text
        assert cancelar.call_args.kwargs["user"].id == test_salesperson_user.id
        assert cancelar.call_args.kwargs["event_id"] == "evento-1"
        db.refresh(reuniao)
        assert reuniao.is_cancelled is True
        assert reuniao.teams_event_id is None

    def test_reuniao_antiga_sem_organizador_usa_o_responsavel(
        self, client: TestClient, manager_headers, reuniao, test_salesperson_user
    ):
        cancelar = MagicMock(return_value=True)

        with patch(CANCELAR_NO_OUTLOOK, cancelar):
            self._cancelar(client, manager_headers, reuniao.id)

        assert cancelar.call_args.kwargs["user"].id == test_salesperson_user.id

    def test_reuniao_marcada_pelo_site_nunca_usa_o_usuario_de_integracao(
        self, client: TestClient, manager_headers, reuniao, db, test_salesperson_user
    ):
        """A integração não tem Microsoft; o evento está na agenda do vendedor."""
        integracao = usuario(db, "integracao", "admin", is_integracao=True)
        reuniao.created_by_id = integracao.id
        db.commit()
        cancelar = MagicMock(return_value=True)

        with patch(CANCELAR_NO_OUTLOOK, cancelar):
            self._cancelar(client, manager_headers, reuniao.id)

        assert cancelar.call_args.kwargs["user"].id == test_salesperson_user.id

    def test_aviso_aos_convidados_diz_o_que_foi_cancelado(
        self, client: TestClient, manager_headers, reuniao, test_salesperson_user
    ):
        cancelar = MagicMock(return_value=True)

        with patch(CANCELAR_NO_OUTLOOK, cancelar):
            self._cancelar(client, manager_headers, reuniao.id)

        texto = cancelar.call_args.kwargs["comentario"]
        assert '"Apresentação Phoebus - ACME"' in texto
        assert "01/10/2026 às 14:00" in texto  # 17h UTC = 14h em Brasília
        assert "foi cancelada" in texto
        assert texto.endswith(f"{test_salesperson_user.name}\nHealth & Safety")

    def test_historico_registra_para_quem_foi_o_aviso(
        self, client: TestClient, manager_headers, reuniao, db, monkeypatch
    ):
        from app.core.config import settings

        monkeypatch.setattr(settings, "DAILY_DEV_MODE", False)
        reuniao.invited_emails = ["cliente@acme.com"]
        db.commit()

        with patch(CANCELAR_NO_OUTLOOK, MagicMock(return_value=True)):
            self._cancelar(client, manager_headers, reuniao.id)

        registro = db.query(Activity).filter(Activity.activity_type == "meeting_cancelled").one()
        assert "cancelada" in registro.description
        assert "cliente@acme.com" in registro.description

    def test_evento_ja_apagado_no_outlook_cancela_e_registra_sem_aviso(
        self, client: TestClient, manager_headers, reuniao, db
    ):
        with patch(CANCELAR_NO_OUTLOOK, MagicMock(return_value=False)):
            r = self._cancelar(client, manager_headers, reuniao.id)

        assert r.status_code == 200
        registro = db.query(Activity).filter(Activity.activity_type == "meeting_cancelled").one()
        assert "nenhum aviso foi enviado" in registro.description

    def test_sala_do_daily_e_apagada(self, client: TestClient, manager_headers, reuniao, db):
        reuniao.daily_room_name = "sala-1"
        reuniao.public_access_token = "tok-1"
        db.commit()
        apagar_sala = MagicMock()

        with patch(CANCELAR_NO_OUTLOOK, MagicMock(return_value=True)), \
                patch("app.services.daily_service.DailyService.delete_room", apagar_sala):
            self._cancelar(client, manager_headers, reuniao.id)

        assert apagar_sala.called
        db.refresh(reuniao)
        assert reuniao.daily_room_name is None and reuniao.public_access_token is None

    def test_quem_nao_tem_vinculo_com_o_negocio_nao_cancela(
        self, client: TestClient, sdr_headers, reuniao, db
    ):
        """Cancelando pela conta de quem convidou, sem esta trava qualquer
        usuário cancelaria o convite de qualquer reunião."""
        cancelar = MagicMock(return_value=True)

        with patch(CANCELAR_NO_OUTLOOK, cancelar):
            r = self._cancelar(client, sdr_headers, reuniao.id)

        assert r.status_code == 403
        cancelar.assert_not_called()
        db.refresh(reuniao)
        assert reuniao.is_cancelled is False

    def test_falha_do_outlook_nao_cancela(self, client: TestClient, manager_headers, reuniao, db):
        """Cancelar no CRM com o convite de pé deixaria o cliente esperando na reunião."""
        with patch(CANCELAR_NO_OUTLOOK, MagicMock(side_effect=ValueError("sem conexão Microsoft"))):
            r = self._cancelar(client, manager_headers, reuniao.id)

        assert r.status_code == 400
        db.refresh(reuniao)
        assert reuniao.is_cancelled is False
        assert reuniao.teams_event_id == "evento-1"


class TestExcluir:
    """Excluir só no CRM deixava o convite na agenda do cliente e a sala aberta."""

    def _excluir(self, client, headers, task_id):
        return client.delete(f"/api/v1/card-tasks/{task_id}", headers=headers)

    def test_excluir_reuniao_cancela_o_convite_e_avisa(
        self, client: TestClient, manager_headers, reuniao, db, test_salesperson_user
    ):
        cancelar = MagicMock(return_value=True)
        task_id = reuniao.id

        with patch(CANCELAR_NO_OUTLOOK, cancelar):
            r = self._excluir(client, manager_headers, task_id)

        assert r.status_code in (200, 204), r.text
        assert cancelar.call_args.kwargs["user"].id == test_salesperson_user.id
        db.expire_all()
        assert db.get(CardTask, task_id) is None
        registro = db.query(Activity).filter(Activity.activity_type == "meeting_cancelled").one()
        assert "excluída" in registro.description

    def test_falha_do_outlook_nao_exclui(self, client: TestClient, manager_headers, reuniao, db):
        task_id = reuniao.id

        with patch(CANCELAR_NO_OUTLOOK, MagicMock(side_effect=ValueError("recusado"))):
            r = self._excluir(client, manager_headers, task_id)

        assert r.status_code == 400
        db.expire_all()
        assert db.get(CardTask, task_id) is not None

    def test_quem_nao_pode_excluir_nao_mexe_no_outlook(
        self, client: TestClient, sdr_headers, reuniao
    ):
        cancelar = MagicMock(return_value=True)

        with patch(CANCELAR_NO_OUTLOOK, cancelar):
            r = self._excluir(client, sdr_headers, reuniao.id)

        assert r.status_code == 403
        cancelar.assert_not_called()

    def test_reuniao_sem_convite_exclui_sem_chamar_o_outlook(
        self, client: TestClient, manager_headers, reuniao, db
    ):
        reuniao.teams_event_id = None
        db.commit()
        cancelar = MagicMock()

        with patch(CANCELAR_NO_OUTLOOK, cancelar):
            r = self._excluir(client, manager_headers, reuniao.id)

        assert r.status_code in (200, 204)
        cancelar.assert_not_called()


class TestCancelarNoOutlook:

    def _chamar(self, status_code, corpo=None, token="token"):
        from app.services.microsoft_graph_service import microsoft_graph_service

        resp = MagicMock(status_code=status_code)
        resp.json.return_value = corpo or {}
        http = MagicMock()
        http.__enter__.return_value.post.return_value = resp
        vendedor = MagicMock(email="vendedor@hs.com")

        with patch.object(microsoft_graph_service, "_get_valid_token", return_value=token), \
                patch.object(microsoft_graph_service, "_get_app_token", return_value="token-app"), \
                patch("app.services.microsoft_graph_service.httpx.Client", return_value=http):
            resultado = microsoft_graph_service.cancel_calendar_event(
                user=vendedor, db=MagicMock(), event_id="x", comentario="Cancelada."
            )
        return resultado, http.__enter__.return_value.post.call_args

    def test_cancela_com_a_mensagem_pela_conta_do_organizador(self):
        resultado, chamada = self._chamar(202)

        assert resultado is True
        assert chamada.args[0].endswith("/me/events/x/cancel")
        assert chamada.kwargs["json"] == {"comment": "Cancelada."}

    def test_sem_conta_microsoft_cancela_como_aplicativo_na_caixa_dele(self):
        """Vendedor que nunca entrou com Microsoft: a reunião que o site marcou
        na agenda dele continua cancelável."""
        resultado, chamada = self._chamar(202, token=None)

        assert resultado is True
        assert chamada.args[0].endswith("/users/vendedor@hs.com/events/x/cancel")
        assert chamada.kwargs["headers"]["Authorization"] == "Bearer token-app"

    def test_evento_que_ja_nao_existe_conta_como_cancelado_sem_aviso(self):
        """Alguém já apagou pelo Outlook: o evento já está fora da agenda."""
        resultado, _ = self._chamar(
            404, {"error": {"code": "ErrorItemNotFound",
                            "message": "The specified object was not found in the store."}}
        )
        assert resultado is False

    def test_outro_erro_continua_avisando(self):
        with pytest.raises(ValueError, match="Acesso negado"):
            self._chamar(403, {"error": {"message": "Acesso negado"}})


