"""Testes da chave de API estática dos integration clients."""
import pytest
from sqlalchemy.exc import IntegrityError

from app.core.security import generate_api_key, hash_api_key
from app.models.integration_client import IntegrationClient


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
