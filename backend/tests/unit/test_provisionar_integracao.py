"""O provisionamento tem que ser idempotente e nunca reemitir a chave em silêncio."""
import pytest

from app.models.integration_client import IntegrationClient
from app.models.role import Role
from app.models.user import User
from scripts.provisionar_integracao_gestorhs import provisionar


@pytest.fixture(autouse=True)
def role_service(db):
    """O script exige a role 'service' pré-existente (falha alto se não houver)."""
    role = Role(name="service", display_name="Serviço", permissions=[])
    db.add(role)
    db.commit()
    return role


def test_primeira_execucao_cria_usuario_client_e_devolve_a_chave(db):
    client, chave = provisionar(db)

    assert chave is not None and chave.startswith("hsg_live_")
    assert client.scopes == ["service_cards:create"]
    user = db.query(User).filter_by(id=client.impersonate_user_id).first()
    assert user.name == "GestorHS (Integração)"
    assert user.role.name == "service"


def test_segunda_execucao_nao_duplica_nem_reemite(db):
    provisionar(db)
    client, chave = provisionar(db)

    assert chave is None
    assert db.query(IntegrationClient).count() == 1
    assert db.query(User).filter_by(email="gestorhs@integracao.local").count() == 1


def test_a_chave_em_claro_nao_fica_no_banco(db):
    _, chave = provisionar(db)

    client = db.query(IntegrationClient).first()
    assert client.api_key_hash != chave
    assert len(client.api_key_hash) == 64
