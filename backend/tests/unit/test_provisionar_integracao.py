"""O provisionamento tem que ser idempotente e nunca reemitir a chave em silêncio."""
import pytest
from pydantic import EmailStr, TypeAdapter

from app.core.security import hash_api_key
from app.models.integration_client import IntegrationClient
from app.models.role import Role
from app.models.user import User
from scripts.provisionar_integracao_gestorhs import EMAIL, provisionar, rotacionar


def test_email_da_conta_passa_na_validacao_de_email():
    """O email da conta de integração precisa ser um EmailStr válido.

    /api/v1/users/active serializa TODOS os usuários ativos como UserResponse, que
    valida `email` com EmailStr. Um único email inválido derruba a listagem inteira
    com 500 — foi o que aconteceu com "gestorhs@integracao.local" (domínio .local é
    reservado por RFC e rejeitado pelo validador), esvaziando todos os filtros que
    dependem dessa lista.
    """
    TypeAdapter(EmailStr).validate_python(EMAIL)


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
    assert db.query(User).filter_by(email="gestorhs.integracao@healthsafetytech.com").count() == 1


def test_a_chave_em_claro_nao_fica_no_banco(db):
    _, chave = provisionar(db)

    client = db.query(IntegrationClient).first()
    assert client.api_key_hash != chave
    assert len(client.api_key_hash) == 64


def test_rotacionar_emite_chave_nova_e_atualiza_o_hash(db):
    _, chave_antiga = provisionar(db)
    hash_antigo = db.query(IntegrationClient).first().api_key_hash

    client, chave_nova = rotacionar(db)

    assert chave_nova is not None and chave_nova.startswith("hsg_live_")
    assert chave_nova != chave_antiga
    assert client.api_key_hash != hash_antigo
    assert client.api_key_hash == hash_api_key(chave_nova)
    # a chave em claro nunca é persistida — só o hash muda no banco
    assert client.api_key_hash != chave_nova


def test_rotacionar_invalida_a_chave_antiga_e_valida_a_nova(db):
    _, chave_antiga = provisionar(db)

    client, chave_nova = rotacionar(db)

    assert client.api_key_hash != hash_api_key(chave_antiga)
    assert client.api_key_hash == hash_api_key(chave_nova)


def test_rotacionar_reativa_client_desativado(db):
    provisionar(db)
    client = db.query(IntegrationClient).first()
    client.is_active = False
    db.add(client)
    db.commit()

    client, _ = rotacionar(db)

    assert client.is_active is True


def test_rotacionar_sem_provisionamento_previo_leva_erro(db):
    with pytest.raises(RuntimeError):
        rotacionar(db)
