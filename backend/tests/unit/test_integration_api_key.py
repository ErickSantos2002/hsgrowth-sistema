"""Testes da chave de API estática dos integration clients."""
from app.core.security import generate_api_key, hash_api_key


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
