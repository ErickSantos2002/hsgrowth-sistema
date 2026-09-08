"""
Corpo do convite enviado ao cliente.

Os dois fluxos (reunião no CRM e Teams) usam o mesmo texto, para o cliente
receber sempre a mesma comunicação. A pauta escrita pelo vendedor precisa
aparecer — antes ficava só no CRM.
"""
from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from app.api.v1.endpoints.card_tasks import _montar_corpo_convite
from app.models.card_task import CardTask


@pytest.fixture
def task(db: Session, test_card, test_salesperson_user) -> CardTask:
    t = CardTask(
        card_id=test_card.id,
        title="Apresentação de proposta",
        description="Falar sobre o bafômetro\ne apresentar os planos",
        task_type="meeting",
        assigned_to_id=test_salesperson_user.id,
        # 14:30 UTC = 11:30 em Brasília
        due_date=datetime(2026, 9, 10, 14, 30),
        duration_minutes=45,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


class TestCorpoDoConvite:

    def test_traz_assunto_horario_e_duracao(self, task, test_salesperson_user):
        corpo = _montar_corpo_convite(task, test_salesperson_user)

        assert "Apresentação de proposta" in corpo
        assert "45 minutos" in corpo
        assert "10/09/2026" in corpo

    def test_converte_para_horario_de_brasilia(self, task, test_salesperson_user):
        """due_date é UTC; o cliente precisa ler no horário dele."""
        corpo = _montar_corpo_convite(task, test_salesperson_user)

        assert "11:30" in corpo       # 14:30 UTC - 3h
        assert "14:30" not in corpo
        assert "Brasília" in corpo

    def test_inclui_a_pauta_escrita_pelo_vendedor(self, task, test_salesperson_user):
        """A descrição do formulário precisa chegar ao cliente."""
        corpo = _montar_corpo_convite(task, test_salesperson_user)

        assert "Pauta" in corpo
        assert "bafômetro" in corpo
        assert "apresentar os planos" in corpo

    def test_sem_pauta_nao_mostra_a_secao(self, db, task, test_salesperson_user):
        task.description = None
        db.commit()

        corpo = _montar_corpo_convite(task, test_salesperson_user)
        assert "Pauta" not in corpo

    def test_assina_com_o_nome_do_organizador(self, task, test_salesperson_user):
        corpo = _montar_corpo_convite(task, test_salesperson_user)
        assert test_salesperson_user.name in corpo

    def test_com_link_explica_como_entrar(self, task, test_salesperson_user):
        """Reunião no CRM: o link precisa vir com instrução."""
        corpo = _montar_corpo_convite(task, test_salesperson_user, public_link="https://crm/entrar/abc")

        assert "https://crm/entrar/abc" in corpo
        assert "sem instalar" in corpo

    def test_sem_link_nao_inventa_secao_de_entrada(self, task, test_salesperson_user):
        """Fluxo Teams: quem acrescenta o bloco de entrada é o Outlook."""
        corpo = _montar_corpo_convite(task, test_salesperson_user)

        assert "Como entrar" not in corpo
        assert "http" not in corpo


class TestInjecaoDeHtml:
    """
    Título, pauta e nome são digitados por pessoas e entram num corpo HTML.
    Sem escapar, quem preenche poderia inserir marcação no convite — um link
    disfarçado, por exemplo, sairia com a credibilidade do domínio da empresa
    para a caixa de entrada do cliente.
    """

    def test_html_no_titulo_nao_vira_marcacao(self, db, task, test_salesperson_user):
        task.title = '<a href="http://site-falso">Clique aqui</a>'
        db.commit()

        corpo = _montar_corpo_convite(task, test_salesperson_user)

        assert "<a href=" not in corpo
        assert "site-falso" not in corpo.replace("&lt;", "<").replace("&#x27;", "'") or "&lt;a" in corpo
        assert "&lt;a href=" in corpo

    def test_html_na_pauta_nao_vira_marcacao(self, db, task, test_salesperson_user):
        task.description = "<script>alert(1)</script>"
        db.commit()

        corpo = _montar_corpo_convite(task, test_salesperson_user)

        assert "<script>" not in corpo
        assert "&lt;script&gt;" in corpo

    def test_quebra_de_linha_da_pauta_continua_funcionando(
        self, db, task, test_salesperson_user
    ):
        """Escapar não pode estragar a formatação legítima."""
        task.description = "Primeira linha\nSegunda linha"
        db.commit()

        corpo = _montar_corpo_convite(task, test_salesperson_user)

        assert "Primeira linha<br>Segunda linha" in corpo

    def test_html_no_nome_do_organizador_nao_vira_marcacao(
        self, db, task, test_salesperson_user
    ):
        test_salesperson_user.name = "<b>Fulano</b>"
        db.commit()

        corpo = _montar_corpo_convite(task, test_salesperson_user)

        assert "<b>Fulano</b>" not in corpo
        assert "&lt;b&gt;" in corpo

    def test_aspas_no_link_nao_escapam_do_atributo(self, task, test_salesperson_user):
        """Aspas no href poderiam fechar o atributo e injetar outro."""
        corpo = _montar_corpo_convite(
            task, test_salesperson_user, public_link='https://crm/entrar/a" onclick="roubar()'
        )

        assert 'onclick="roubar()"' not in corpo
        assert "&quot;" in corpo
