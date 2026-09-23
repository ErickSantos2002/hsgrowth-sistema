"""
O que a tela de Nova Reunião precisa saber antes de o vendedor preencher.

A prévia do título tem de ser idêntica ao que o servidor vai gravar, e a lista
de endereços vem de três cadastros diferentes — por isso vem pronta daqui, em
vez de o navegador remontar a regra.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.fixture
def card_completo(db: Session, test_card, test_salesperson_user):
    """Negócio com cliente, contato e vendedor — o caso comum."""
    from app.models.client import Client
    from app.models.person import Person

    cliente = Client(
        name="Contato ACME",
        company_name="ACME TRANSPORTES LTDA",
        email="contato@acme.com",
    )
    pessoa = Person(
        name="Maria",
        email="maria@acme.com",
        email_commercial="comercial@acme.com",
    )
    db.add_all([cliente, pessoa])
    db.commit()

    test_card.client_id = cliente.id
    test_card.person_id = pessoa.id
    test_card.assigned_to_id = test_salesperson_user.id
    db.commit()
    return test_card


class TestTipos:

    def test_devolve_os_cinco_com_a_previa_do_titulo(
        self, client: TestClient, salesperson_headers, card_completo
    ):
        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        assert r.status_code == 200
        tipos = r.json()["tipos"]
        assert len(tipos) == 5

        apresentacao = next(t for t in tipos if t["id"] == "apresentacao_phoebus")
        assert apresentacao["titulo"] == "Apresentação Phoebus - ACME TRANSPORTES LTDA"
        assert apresentacao["avaliado"] is True

    def test_tipo_livre_nao_tem_previa(
        self, client: TestClient, salesperson_headers, card_completo
    ):
        """Em "Outra" o título é o que o vendedor escrever."""
        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        outra = next(t for t in r.json()["tipos"] if t["id"] == "outra")
        assert outra["titulo"] is None


class TestConvidados:

    def test_lista_os_enderecos_conhecidos(
        self, client: TestClient, salesperson_headers, card_completo, test_salesperson_user
    ):
        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        enderecos = {c["email"] for c in r.json()["convidados"]}
        assert enderecos == {
            test_salesperson_user.email,
            "maria@acme.com",
            "comercial@acme.com",
            "contato@acme.com",
        }

    def test_vendedor_e_contato_principal_vem_marcados(
        self, client: TestClient, salesperson_headers, card_completo, test_salesperson_user
    ):
        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        marcados = {c["email"] for c in r.json()["convidados"] if c["marcado"]}
        assert marcados == {test_salesperson_user.email, "maria@acme.com"}

    def test_cada_endereco_tem_rotulo(
        self, client: TestClient, salesperson_headers, card_completo
    ):
        """O vendedor precisa saber de quem é cada e-mail antes de marcar."""
        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        rotulos = {c["email"]: c["rotulo"] for c in r.json()["convidados"]}
        assert rotulos["maria@acme.com"] == "Contato (principal)"
        assert rotulos["comercial@acme.com"] == "Contato (comercial)"
        assert rotulos["contato@acme.com"] == "Empresa"

    def test_endereco_repetido_aparece_uma_vez(
        self, client: TestClient, salesperson_headers, card_completo, db
    ):
        from app.models.person import Person

        pessoa = db.query(Person).filter(Person.id == card_completo.person_id).first()
        pessoa.email_personal = pessoa.email
        db.commit()

        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={card_completo.id}",
            headers=salesperson_headers,
        )

        emails = [c["email"] for c in r.json()["convidados"]]
        assert len(emails) == len(set(emails))

    def test_negocio_sem_contato_lista_so_o_vendedor(
        self, client: TestClient, salesperson_headers, test_card, test_salesperson_user, db
    ):
        test_card.person_id = None
        test_card.client_id = None
        test_card.assigned_to_id = test_salesperson_user.id
        db.commit()

        r = client.get(
            f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={test_card.id}",
            headers=salesperson_headers,
        )

        assert [c["email"] for c in r.json()["convidados"]] == [test_salesperson_user.email]


class TestAcesso:

    def test_negocio_inexistente(self, client: TestClient, salesperson_headers):
        r = client.get(
            "/api/v1/card-tasks/sugestoes-de-reuniao?card_id=99999999",
            headers=salesperson_headers,
        )

        assert r.status_code == 404

    def test_exige_autenticacao(self, client: TestClient, test_card):
        r = client.get(f"/api/v1/card-tasks/sugestoes-de-reuniao?card_id={test_card.id}")

        assert r.status_code in (401, 403)
