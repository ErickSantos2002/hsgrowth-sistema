"""Formato dos campos de Parcerias: telefone só com números, e-mail válido, UF e tamanhos."""
from tests.unit.apoio_parcerias import CNPJ_A, headers, parceiro, usuario

URL = "/api/v1/parcerias"

NOVA = {
    "title": "Etilômetros", "deal_type": "Nova Venda", "sector": "Indústrias de Transformação",
    "relationship_type": "Prospect", "context": "Frota de 40 caminhões", "cnpj": CNPJ_A,
    "company_name": "Empresa A",
}


def test_telefone_do_parceiro_guarda_so_numeros(client, admin_headers):
    resposta = client.post(f"{URL}/parceiros", json={"name": "Dmap", "main_contact_phone": "(11) 99999-0000"},
                           headers=admin_headers)

    assert resposta.status_code == 201
    assert resposta.json()["main_contact_phone"] == "11999990000"


def test_telefone_com_letras_e_recusado(client, admin_headers):
    resposta = client.post(f"{URL}/parceiros", json={"name": "Dmap", "main_contact_phone": "swfasdgf4894"},
                           headers=admin_headers)

    assert resposta.status_code == 422


def test_telefone_sem_ddd_e_recusado(client, admin_headers):
    resposta = client.post(f"{URL}/parceiros", json={"name": "Dmap", "main_contact_phone": "99990000"},
                           headers=admin_headers)

    assert resposta.status_code == 422


def test_email_invalido_do_parceiro_e_recusado(client, admin_headers):
    resposta = client.post(f"{URL}/parceiros", json={"name": "Dmap", "main_contact_email": "sfasfsagfsdag"},
                           headers=admin_headers)

    assert resposta.status_code == 422


def test_email_do_parceiro_vai_em_minusculas(client, admin_headers):
    resposta = client.post(f"{URL}/parceiros", json={"name": "Dmap", "main_contact_email": " Carlos@Dmap.com.br "},
                           headers=admin_headers)

    assert resposta.json()["main_contact_email"] == "carlos@dmap.com.br"


def test_campo_vazio_continua_aceito(client, admin_headers):
    resposta = client.post(f"{URL}/parceiros", json={"name": "Dmap", "main_contact_phone": "", "main_contact_email": ""},
                           headers=admin_headers)

    assert resposta.status_code == 201
    assert resposta.json()["main_contact_phone"] is None


def test_nome_longo_demais_e_recusado(client, admin_headers):
    assert client.post(f"{URL}/parceiros", json={"name": "x" * 256}, headers=admin_headers).status_code == 422


def test_vendedor_da_equipe_com_email_invalido_e_recusado(client, db, admin_headers):
    p = parceiro(db)

    resposta = client.post(f"{URL}/parceiros/{p.id}/equipe", json={"name": "Ana", "email": "ana"}, headers=admin_headers)

    assert resposta.status_code == 422


def test_oportunidade_valida_telefone_email_e_uf(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    for campo, valor in (("contact_phone", "abc"), ("contact_email", "x@"), ("company_state", "S1")):
        assert client.post(f"{URL}/oportunidades", json={**NOVA, campo: valor}, headers=h).status_code == 422


def test_oportunidade_guarda_uf_em_maiusculas(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    resposta = client.post(f"{URL}/oportunidades", json={**NOVA, "company_state": "sp", "contact_phone": "(11) 3333-4444"},
                           headers=h)

    assert resposta.status_code == 201
    assert resposta.json()["company_state"] == "SP"
    assert resposta.json()["contact_phone"] == "1133334444"


def test_contexto_longo_demais_e_recusado(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    assert client.post(f"{URL}/oportunidades", json={**NOVA, "context": "x" * 2001}, headers=h).status_code == 422
