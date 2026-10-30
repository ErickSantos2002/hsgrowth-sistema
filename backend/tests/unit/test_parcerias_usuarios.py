"""Tela de Usuários: Financeiro entra pelo cadastro normal; parceiro só pelo card dele."""
from tests.unit.apoio_parcerias import parceiro, role, usuario


def test_lista_os_perfis(client, db, admin_headers):
    role(db, "finance")
    role(db, "partner")

    resposta = client.get("/api/v1/users/roles", headers=admin_headers)

    assert resposta.status_code == 200
    assert {"admin", "finance", "partner"} <= {r["name"] for r in resposta.json()}


def test_vendedor_nao_lista_perfis(client, salesperson_headers):
    assert client.get("/api/v1/users/roles", headers=salesperson_headers).status_code == 403


def test_nao_cria_login_de_parceiro_pela_tela_de_usuarios(client, db, admin_headers):
    papel = role(db, "partner")
    dados = {"name": "Contato X", "email": "x@dmap.com", "password": "Senha@12345", "role_id": papel.id}

    resposta = client.post("/api/v1/users", json=dados, headers=admin_headers)

    assert resposta.status_code == 422
    assert "card do parceiro" in resposta.json()["detail"]


def test_nao_vira_parceiro_pela_edicao(client, db, admin_headers):
    alvo = usuario(db, "salesperson", "vend@hs.com")
    papel = role(db, "partner")

    resposta = client.put(f"/api/v1/users/{alvo.id}", json={"role_id": papel.id}, headers=admin_headers)

    assert resposta.status_code == 422


def test_cria_financeiro(client, db, admin_headers):
    papel = role(db, "finance")
    dados = {"name": "Fin", "email": "fin@hs.com", "password": "Senha@12345", "role_id": papel.id}

    assert client.post("/api/v1/users", json=dados, headers=admin_headers).status_code == 201


def test_edita_login_de_parceiro_sem_trocar_o_perfil(client, db, admin_headers):
    # A tela de Usuários sempre manda o role_id atual junto.
    p = parceiro(db)
    login = usuario(db, "partner", "contato@dmap.com", p)

    resposta = client.put(f"/api/v1/users/{login.id}", json={"name": "Contato Dmap", "role_id": login.role_id},
                          headers=admin_headers)

    assert resposta.status_code == 200
