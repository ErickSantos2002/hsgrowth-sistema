"""
Os tipos de reunião e o título que cada um monta.

O título é o que a consultora vai usar para saber o que avaliar, e o tipo é o
que o sistema usa. Os dois precisam sair daqui, do mesmo lugar.
"""
from app.services.reunioes.tipos import (
    TIPOS,
    TIPO_LIVRE,
    e_avaliado,
    montar_titulo,
    nome_da_empresa,
    tipo_por_id,
)


class _Cliente:
    def __init__(self, company_name=None, name=None):
        self.company_name = company_name
        self.name = name


class _Card:
    def __init__(self, title="", client=None):
        self.title = title
        self.client = client


class TestOsTipos:

    def test_sao_cinco(self):
        assert len(TIPOS) == 5

    def test_ids_esperados(self):
        assert [t.id for t in TIPOS] == [
            "apresentacao_phoebus",
            "duvidas_phoebus",
            "apresentacao",
            "duvidas",
            "outra",
        ]

    def test_so_apresentacao_phoebus_e_avaliada(self):
        """Decisão de 22/09: a régua é de apresentação, não de tira-dúvidas."""
        avaliados = [t.id for t in TIPOS if t.avaliado]

        assert avaliados == ["apresentacao_phoebus"]

    def test_tipo_desconhecido_nao_e_avaliado(self):
        assert e_avaliado("qualquer_coisa") is False

    def test_reuniao_sem_tipo_nao_e_avaliada(self):
        """Todas as reuniões que já existem estão assim."""
        assert e_avaliado(None) is False

    def test_tipo_por_id(self):
        assert tipo_por_id("duvidas").rotulo == "Dúvidas"
        assert tipo_por_id("inexistente") is None


class TestNomeDaEmpresa:

    def test_usa_a_razao_social_do_cliente(self):
        card = _Card(title="Negócio 123", client=_Cliente("RS TRANSPORTES E LOGISTICA LTDA"))

        assert nome_da_empresa(card) == "RS TRANSPORTES E LOGISTICA LTDA"

    def test_sem_razao_social_usa_o_nome_do_cadastro(self):
        """
        É onde o nome da empresa costuma estar de verdade.

        Em 23/09 um cliente com "Teste" no nome e razão social vazia fez a
        reunião nascer com o nome do negócio no título.
        """
        card = _Card(title="Negócio de teste", client=_Cliente(company_name="", name="Teste"))

        assert nome_da_empresa(card) == "Teste"

    def test_cliente_sem_nome_nenhum_usa_o_nome_do_negocio(self):
        """O card costuma se chamar como a empresa — é o que o vendedor digitou."""
        card = _Card(title="CONCRENORTE", client=_Cliente(company_name="", name=""))

        assert nome_da_empresa(card) == "CONCRENORTE"

    def test_razao_social_tem_prioridade_sobre_o_nome(self):
        card = _Card(client=_Cliente(company_name="CONCRENORTE LTDA", name="Concrenorte"))

        assert nome_da_empresa(card) == "CONCRENORTE LTDA"

    def test_sem_cliente_vinculado_usa_o_nome_do_negocio(self):
        card = _Card(title="PIRECAL", client=None)

        assert nome_da_empresa(card) == "PIRECAL"

    def test_sem_card_devolve_vazio(self):
        assert nome_da_empresa(None) == ""


class TestMontarTitulo:

    def test_junta_rotulo_e_empresa(self):
        card = _Card(client=_Cliente("RS TRANSPORTES"))

        assert montar_titulo("apresentacao_phoebus", card) == (
            "Apresentação Phoebus - RS TRANSPORTES"
        )

    def test_tipo_livre_nao_monta_titulo(self):
        """Em "Outra" vale o que o vendedor escreveu."""
        card = _Card(client=_Cliente("RS TRANSPORTES"))

        assert montar_titulo(TIPO_LIVRE, card) is None

    def test_tipo_desconhecido_nao_monta_titulo(self):
        assert montar_titulo("inventado", _Card(title="X")) is None

    def test_sem_empresa_fica_so_o_rotulo(self):
        assert montar_titulo("duvidas", _Card(title="")) == "Dúvidas"

    def test_titulo_cabe_na_coluna(self):
        """`card_tasks.title` é VARCHAR(255) — razão social gigante não pode quebrar."""
        card = _Card(client=_Cliente("EMPRESA " + "MUITO LONGA " * 40))

        assert len(montar_titulo("apresentacao", card)) <= 255
