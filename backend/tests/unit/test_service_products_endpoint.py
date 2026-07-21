"""Endpoint do catálogo de equipamentos de Serviços (/api/v1/service-products)."""
import pytest

from app.core.security import hash_password
from app.models.role import Role
from app.models.service_product import ServiceProduct
from app.models.user import User

URL = "/api/v1/service-products"


@pytest.fixture
def service_headers(db):
    """Token de um usuário com role 'service' (require_service_access)."""
    from app.core.security import create_access_token

    role = Role(name="service", display_name="Serviço", permissions=[])
    db.add(role)
    db.commit()
    user = User(
        role_id=role.id, email="svc@teste.local", name="Serviço",
        password_hash=hash_password("x"), is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(user.id)})}"}


@pytest.fixture
def catalogo(db):
    db.add(ServiceProduct(name="HS PASS - IBLOW", category="Equipamento GestorHS",
                          external_source="gestorhs", external_ref="hs pass - iblow"))
    db.add(ServiceProduct(name="Equipamento manual", category="Outros"))
    db.add(ServiceProduct(name="Desativado", is_active=False,
                          external_source="gestorhs", external_ref="desativado"))
    db.commit()


def test_lista_o_catalogo(client, service_headers, catalogo):
    r = client.get(URL, headers=service_headers)
    assert r.status_code == 200
    nomes = {p["name"] for p in r.json()}
    assert "HS PASS - IBLOW" in nomes and "Equipamento manual" in nomes


def test_resposta_traz_a_origem(client, service_headers, catalogo):
    r = client.get(URL, headers=service_headers)
    por_nome = {p["name"]: p for p in r.json()}
    # É o que distingue GestorHS de Manual na tela.
    assert por_nome["HS PASS - IBLOW"]["external_source"] == "gestorhs"
    assert por_nome["Equipamento manual"]["external_source"] is None


def test_is_active_true_esconde_desativados(client, service_headers, catalogo):
    r = client.get(URL, params={"is_active": True}, headers=service_headers)
    nomes = {p["name"] for p in r.json()}
    assert "Desativado" not in nomes
    assert "HS PASS - IBLOW" in nomes


def test_busca_por_nome(client, service_headers, catalogo):
    r = client.get(URL, params={"search": "iblow"}, headers=service_headers)
    nomes = {p["name"] for p in r.json()}
    assert nomes == {"HS PASS - IBLOW"}


def test_exige_acesso_ao_modulo_de_servicos(client, admin_headers, salesperson_headers):
    """require_service_access: vendedor é barrado, admin passa."""
    assert client.get(URL, headers=salesperson_headers).status_code == 403
    assert client.get(URL, headers=admin_headers).status_code == 200
