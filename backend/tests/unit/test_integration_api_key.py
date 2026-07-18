"""Testes da chave de API estática dos integration clients."""
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_db, require_api_scope
from app.core.security import generate_api_key, hash_api_key, hash_password
from app.models.integration_client import IntegrationClient
from app.models.role import Role
from app.models.user import User


def test_chave_tem_prefixo_reconhecivel():
    assert generate_api_key().startswith("hsg_live_")


def test_chaves_geradas_sao_distintas():
    assert generate_api_key() != generate_api_key()


def test_hash_e_deterministico_e_nao_contem_a_chave():
    chave = generate_api_key()
    h = hash_api_key(chave)

    assert h == hash_api_key(chave)
    assert len(h) == 64            # sha256 hex
    assert chave not in h


def _novo_client(db, *, client_id: str, api_key_hash) -> IntegrationClient:
    client = IntegrationClient(
        name="Client de teste",
        client_id=client_id,
        client_secret_hash="secret-hash-irrelevante",
        api_key_hash=api_key_hash,
    )
    db.add(client)
    return client


def test_api_key_hash_duplicado_e_rejeitado(db):
    """api_key_hash é identidade de credencial: duas linhas não podem
    compartilhar o mesmo hash (índice único)."""
    hash_repetido = hash_api_key(generate_api_key())

    _novo_client(db, client_id="client-1", api_key_hash=hash_repetido)
    db.commit()

    _novo_client(db, client_id="client-2", api_key_hash=hash_repetido)
    with pytest.raises(IntegrityError):
        db.commit()


def test_multiplos_clients_legados_sem_api_key_hash_convivem(db):
    """Clients legados (criados antes da chave de API existir) ficam com
    api_key_hash = NULL. A constraint unique não deve barrar múltiplos NULLs."""
    _novo_client(db, client_id="legado-1", api_key_hash=None)
    _novo_client(db, client_id="legado-2", api_key_hash=None)
    _novo_client(db, client_id="legado-3", api_key_hash=None)

    db.commit()  # não deve levantar IntegrityError

    total = db.query(IntegrationClient).count()
    assert total == 3


@pytest.fixture
def usuario_integracao(db):
    role = Role(name="service", display_name="Serviço", permissions=[])
    db.add(role)
    db.commit()
    user = User(
        role_id=role.id, email="gestorhs@integracao.local", name="GestorHS (Integração)",
        password_hash=hash_password("nao-usado"), is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def chave_valida(db, usuario_integracao):
    chave = generate_api_key()
    db.add(IntegrationClient(
        name="GestorHS", client_id="hsg_teste", client_secret_hash="x",
        api_key_hash=hash_api_key(chave), scopes=["service_cards:create"],
        impersonate_user_id=usuario_integracao.id, is_active=True,
    ))
    db.commit()
    return chave


@pytest.fixture
def app_protegido(db):
    """App mínimo com uma rota protegida pelo escopo, para exercitar a dependency."""
    app = FastAPI()

    @app.get("/protegido")
    def protegido(user: User = Depends(require_api_scope("service_cards:create"))):
        return {"user_id": user.id}

    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app, raise_server_exceptions=False)


def test_sem_chave_retorna_401(app_protegido):
    assert app_protegido.get("/protegido").status_code == 401


def test_chave_invalida_retorna_401(app_protegido):
    r = app_protegido.get("/protegido", headers={"X-API-Key": "hsg_live_naoexiste"})
    assert r.status_code == 401


def test_chave_valida_retorna_o_usuario_impersonado(app_protegido, chave_valida, usuario_integracao):
    r = app_protegido.get("/protegido", headers={"X-API-Key": chave_valida})
    assert r.status_code == 200
    assert r.json()["user_id"] == usuario_integracao.id


def test_chave_sem_o_escopo_retorna_403(app_protegido, db, usuario_integracao):
    chave = generate_api_key()
    db.add(IntegrationClient(
        name="Outra", client_id="hsg_outra", client_secret_hash="x",
        api_key_hash=hash_api_key(chave), scopes=["outro:escopo"],
        impersonate_user_id=usuario_integracao.id, is_active=True,
    ))
    db.commit()

    r = app_protegido.get("/protegido", headers={"X-API-Key": chave})
    assert r.status_code == 403


def test_client_inativo_retorna_401(app_protegido, db, usuario_integracao):
    chave = generate_api_key()
    db.add(IntegrationClient(
        name="Desativada", client_id="hsg_off", client_secret_hash="x",
        api_key_hash=hash_api_key(chave), scopes=["service_cards:create"],
        impersonate_user_id=usuario_integracao.id, is_active=False,
    ))
    db.commit()

    r = app_protegido.get("/protegido", headers={"X-API-Key": chave})
    assert r.status_code == 401


def test_uso_da_chave_registra_last_used_at(app_protegido, db, chave_valida):
    app_protegido.get("/protegido", headers={"X-API-Key": chave_valida})

    client = db.query(IntegrationClient).filter_by(client_id="hsg_teste").first()
    assert client.last_used_at is not None
