"""Board 1 — Aquisição de Parceiros: cadastro, travas, Equipe e Acessos."""
from app.models.user import User

from tests.unit.apoio_parcerias import headers, parceiro, parceiro_pronto, role, usuario

URL = "/api/v1/parcerias"


def test_vendedor_nao_entra_em_parcerias(client, salesperson_headers):
    assert client.get(f"{URL}/etapas", headers=salesperson_headers).status_code == 403


def test_etapas_dos_dois_boards(client, admin_headers):
    resposta = client.get(f"{URL}/etapas", headers=admin_headers)

    assert resposta.status_code == 200
    assert resposta.json()["aquisicao"][0] == {"codigo": "potencial", "nome": "Potencial Parceiro"}
    assert resposta.json()["oportunidades"][-1]["codigo"] == "perdido"


def test_admin_cadastra_parceiro(client, admin_headers):
    resposta = client.post(f"{URL}/parceiros", json={"name": "Dmap"}, headers=admin_headers)

    assert resposta.status_code == 201
    assert resposta.json()["stage"] == "potencial"


def test_parceiro_nao_cadastra_parceiro(client, db):
    h = headers(usuario(db, "partner", "a@dmap.com", parceiro(db)))

    assert client.post(f"{URL}/parceiros", json={"name": "Outro"}, headers=h).status_code == 403


def test_parceiro_so_ve_o_proprio_card(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    h = headers(usuario(db, "partner", "a@dmap.com", a))

    lista = client.get(f"{URL}/parceiros", headers=h).json()

    assert [p["name"] for p in lista] == ["Dmap"]
    assert client.get(f"{URL}/parceiros/{b.id}", headers=h).status_code == 404


def test_trava_ao_sair_de_potencial(client, db, admin_headers, test_admin_user):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    barrado = client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "qualificacao"}, headers=h)
    assert barrado.status_code == 422
    assert "contato principal" in barrado.json()["detail"]

    client.put(f"{URL}/parceiros/{p.id}", json={
        "main_contact_name": "Carlos", "main_contact_phone": "11999990000",
        "hs_owner_id": test_admin_user.id,
    }, headers=admin_headers)
    assert client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "qualificacao"}, headers=h).status_code == 200


def test_parceiro_nao_troca_o_responsavel_hs(client, db, test_admin_user):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))

    resposta = client.put(f"{URL}/parceiros/{p.id}", json={"hs_owner_id": test_admin_user.id, "region": "SP"}, headers=h)

    assert resposta.status_code == 200
    assert resposta.json()["hs_owner_id"] is None
    assert resposta.json()["region"] == "SP"


def test_financeiro_nao_move(client, db):
    p = parceiro_pronto(db, stage="potencial")
    h = headers(usuario(db, "finance", "fin@hs.com"))

    assert client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "qualificacao"}, headers=h).status_code == 403


def test_perdido_com_motivo(client, db, admin_headers):
    p = parceiro(db)

    sem_motivo = client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "perdido"}, headers=admin_headers)
    assert sem_motivo.status_code == 422

    resposta = client.put(f"{URL}/parceiros/{p.id}/mover",
                          json={"stage": "perdido", "loss_reason": "Sem interesse"}, headers=admin_headers)
    assert resposta.status_code == 200
    assert resposta.json()["lost_at"] is not None


def test_entrar_em_ativacao_com_evidencia_ja_ativa(client, db, admin_headers):
    p = parceiro_pronto(db, stage="onboarding")
    p.activation_evidence = "oportunidade_validada"
    db.commit()

    resposta = client.put(f"{URL}/parceiros/{p.id}/mover", json={"stage": "ativacao"}, headers=admin_headers)

    assert resposta.json()["stage"] == "ativado"


def test_equipe_do_proprio_parceiro(client, db):
    a, b = parceiro(db, "Dmap"), parceiro(db, "Outro")
    h = headers(usuario(db, "partner", "a@dmap.com", a))

    criado = client.post(f"{URL}/parceiros/{a.id}/equipe", json={"name": "Ana"}, headers=h)
    assert criado.status_code == 201
    assert client.post(f"{URL}/parceiros/{b.id}/equipe", json={"name": "Intrusa"}, headers=h).status_code == 404

    desativado = client.put(f"{URL}/parceiros/{a.id}/equipe/{criado.json()['id']}",
                            json={"is_active": False}, headers=h)
    assert desativado.json()["is_active"] is False


def test_admin_cria_e_desativa_acesso(client, db, admin_headers):
    role(db, "partner")  # em produção vem da migration
    p = parceiro(db)
    dados = {"name": "Contato Dmap", "email": "Contato@Dmap.com", "password": "Senha@12345"}

    criado = client.post(f"{URL}/parceiros/{p.id}/acessos", json=dados, headers=admin_headers)
    assert criado.status_code == 201
    login = db.query(User).filter(User.email == "contato@dmap.com").one()
    assert login.partner_id == p.id
    assert login.role.name == "partner"

    assert client.post(f"{URL}/parceiros/{p.id}/acessos", json=dados, headers=admin_headers).status_code == 400

    desativado = client.put(f"{URL}/parceiros/{p.id}/acessos/{login.id}",
                            json={"is_active": False}, headers=admin_headers)
    assert desativado.json()["is_active"] is False


def test_parceiro_nao_cria_acesso(client, db):
    p = parceiro(db)
    h = headers(usuario(db, "partner", "a@dmap.com", p))
    dados = {"name": "X", "email": "x@dmap.com", "password": "Senha@12345"}

    assert client.post(f"{URL}/parceiros/{p.id}/acessos", json=dados, headers=h).status_code == 403
